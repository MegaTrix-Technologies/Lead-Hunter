const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../config/db');

const Lead = require('../models/Lead');
const Dataset = require('../models/Dataset');
const Expense = require('../models/Expense');
const Sale = require('../models/Sale');
const Project = require('../models/Project');
const ScrapeJob = require('../models/ScrapeJob');
const User = require('../models/User');
const Product = require('../models/Product');

async function cleanProductionSlate() {
  try {
    await connectDB();
    console.log('================================================================');
    console.log('🧹 MEGATRIX PRODUCTION SLATE CLEANER');
    console.log('================================================================\n');

    console.log('Connecting to database:', mongoose.connection.name);

    // 1. Delete Leads
    const leadsDel = await Lead.deleteMany({});
    console.log(`✓ Deleted ${leadsDel.deletedCount} leads.`);

    // 2. Delete Datasets
    const datasetsDel = await Dataset.deleteMany({});
    console.log(`✓ Deleted ${datasetsDel.deletedCount} datasets.`);

    // 3. Delete Expenses (Mock Accounts Manager Expenses)
    const expensesDel = await Expense.deleteMany({});
    console.log(`✓ Deleted ${expensesDel.deletedCount} operational expenses.`);

    // 4. Delete Sales (Mock Sales)
    const salesDel = await Sale.deleteMany({});
    console.log(`✓ Deleted ${salesDel.deletedCount} sales records.`);

    // 5. Delete Projects
    const projectsDel = await Project.deleteMany({});
    console.log(`✓ Deleted ${projectsDel.deletedCount} project records.`);

    // 6. Delete Scrape Jobs
    const scrapeDel = await ScrapeJob.deleteMany({});
    console.log(`✓ Deleted ${scrapeDel.deletedCount} scrape job history logs.`);

    // 7. Check if there are any other collections like transactions
    const rawCollections = await mongoose.connection.db.listCollections().toArray();
    for (const col of rawCollections) {
      if (['transactions', 'commissionlogs', 'notifications'].includes(col.name.toLowerCase())) {
        const res = await mongoose.connection.db.collection(col.name).deleteMany({});
        console.log(`✓ Deleted ${res.deletedCount} documents from raw collection: ${col.name}`);
      }
    }

    // 8. Verify Preserved Collections
    const remainingUsers = await User.countDocuments();
    const remainingProducts = await Product.countDocuments();
    const remainingLeads = await Lead.countDocuments();
    const remainingDatasets = await Dataset.countDocuments();
    const remainingExpenses = await Expense.countDocuments();
    const remainingSales = await Sale.countDocuments();
    const remainingProjects = await Project.countDocuments();

    console.log('\n----------------------------------------------------------------');
    console.log('📊 FINAL DATABASE STATE (PRODUCTION CLEAN SLATE):');
    console.log('----------------------------------------------------------------');
    console.log(`  - Users: ${remainingUsers} (PRESERVED)`);
    console.log(`  - Products: ${remainingProducts} (PRESERVED)`);
    console.log(`  - Leads: ${remainingLeads} (CLEARED)`);
    console.log(`  - Datasets: ${remainingDatasets} (CLEARED)`);
    console.log(`  - Expenses: ${remainingExpenses} (CLEARED)`);
    console.log(`  - Sales: ${remainingSales} (CLEARED)`);
    console.log(`  - Projects: ${remainingProjects} (CLEARED)`);
    console.log('================================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanProductionSlate();