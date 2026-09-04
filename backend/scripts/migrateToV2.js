const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Sale = require('../models/Sale');
const Project = require('../models/Project');
const Expense = require('../models/Expense');

async function runMigration() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://adminmegatrix_db_user:sRZuTNxqgakUPPH3@cluster0.5tchcnc.mongodb.net/leadhunter';
  console.log('[Migration] Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✔ Connected to MongoDB.');

  // 1. Migrate Users
  console.log('\n--- 1. Migrating Users ---');
  const users = await User.find();
  for (const u of users) {
    let modified = false;
    const isSuper = u.role === 'superadmin' || u.email === 'sales@megatrixai.com';

    if (!u.roles || u.roles.length === 0) {
      u.roles = isSuper ? ['super_admin'] : ['sales_agent'];
      modified = true;
    }

    if (!u.commissionRates || u.commissionRates.leadGenPercent === undefined) {
      u.commissionRates = {
        leadGenPercent: isSuper ? 0 : 5,
        closerPercent: isSuper ? 0 : 10,
        developerPercent: isSuper ? 0 : 15
      };
      modified = true;
    }

    if (modified) {
      await u.save();
      console.log(`Updated user: ${u.name} (${u.email}) -> roles: [${u.roles.join(', ')}]`);
    } else {
      console.log(`User already up to date: ${u.name} (${u.email})`);
    }
  }

  const superAdmin = await User.findOne({ email: 'sales@megatrixai.com' });

  // 2. Migrate existing 'Lead / Sale' leads into Sale and Project models
  console.log('\n--- 2. Migrating Deals/Sales ---');
  const soldLeads = await Lead.find({ callStatus: { $in: ['Lead / Sale', 'sale'] } });
  console.log(`Found ${soldLeads.length} closed deals to check/migrate.`);

  for (const lead of soldLeads) {
    const existingSale = await Sale.findOne({ leadId: lead._id });
    if (!existingSale) {
      const dealVal = lead.dealValue || 50000;
      const advance = Math.round(dealVal * 0.5);

      const sale = await Sale.create({
        leadId: lead._id,
        customer: {
          businessName: lead.businessName,
          phoneNumber: lead.phoneNumber || '',
          email: lead.email || '',
          address: lead.address || '',
          area: lead.area || 'Lahore',
          category: lead.category || 'General'
        },
        leadGeneratedBy: lead.extractedBy || (superAdmin ? superAdmin._id : null),
        leadGeneratedByName: lead.extractedByName || 'Sales Desk',
        closedBy: superAdmin ? superAdmin._id : null,
        closedByName: superAdmin ? superAdmin.name : 'Super Admin',
        assignedDevelopers: [],
        assignedDeveloperNames: [],
        products: (lead.interestedProducts && lead.interestedProducts.length > 0)
          ? lead.interestedProducts.map(p => ({
              productId: p.productId || null,
              name: p.name,
              category: p.category || '',
              basePrice: p.basePrice || dealVal,
              discountPercent: p.discountPercent || 0,
              finalPrice: p.finalPrice || p.basePrice || dealVal,
              currency: p.currency || 'PKR'
            }))
          : [{
              name: 'Website & Digital Growth Package',
              category: 'Web Development',
              basePrice: dealVal,
              discountPercent: 0,
              finalPrice: dealVal,
              currency: 'PKR'
            }],
        totalAmount: dealVal,
        advanceAmount: advance,
        remainingAmount: dealVal - advance,
        status: 'advance_paid',
        source: 'migrated',
        notes: 'Migrated from historical closed deals.',
        closedAt: lead.updatedAt || lead.createdAt
      });

      // Auto create active project for the migrated sale
      await Project.create({
        saleId: sale._id,
        assignedDevelopers: [],
        assignedDeveloperNames: [],
        status: 'active',
        deliveryNotes: [{
          note: 'Initial project automatically instantiated upon sale advance payment migration.',
          author: 'System',
          timestamp: new Date()
        }]
      });

      console.log(`✔ Created Sale and Project for lead: "${lead.businessName}" (PKR ${dealVal.toLocaleString()})`);
    } else {
      console.log(`Sale already exists for lead: "${lead.businessName}"`);
    }
  }

  // 3. Migrate Expenses (add reason & recurrence)
  console.log('\n--- 3. Migrating Expenses ---');
  const expenses = await Expense.find();
  console.log(`Found ${expenses.length} expenses.`);
  for (const exp of expenses) {
    let expModified = false;
    if (!exp.reason) {
      exp.reason = exp.description || exp.category || 'Operational Expense';
      expModified = true;
    }
    if (!exp.recurrence) {
      exp.recurrence = 'one_time';
      expModified = true;
    }
    if (expModified) {
      await exp.save();
    }
  }
  console.log('✔ Expenses migrated.');

  console.log('\n========================================');
  console.log('🎉 Migration V2 Completed Successfully!');
  console.log('========================================\n');

  await mongoose.disconnect();
}

runMigration().catch(err => {
  console.error('Migration failed with error:', err);
  process.exit(1);
});
