const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../config/db');
const Expense = require('../models/Expense');
const Lead = require('../models/Lead');
const Product = require('../models/Product');
const User = require('../models/User');

const seedAccountsData = async () => {
  try {
    await connectDB();
    console.log('[Seed Accounts] Connected to MongoDB.');

    // Find Super Admin and Agent
    const superAdmin = await User.findOne({ role: 'superadmin' });
    const agent = await User.findOne({ role: 'agent' });
    const products = await Product.find().lean();

    // 1. Check existing expenses
    const existingExpensesCount = await Expense.countDocuments();
    if (existingExpensesCount === 0) {
      console.log('[Seed Accounts] Seeding baseline operational expenses...');

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const sampleExpenses = [
        // Current Month Expenses
        {
          date: new Date(currentYear, currentMonth, 2),
          category: 'Software & Infrastructure',
          amount: 28500,
          currency: 'PKR',
          description: 'Google Cloud & Places API Platform Data Ingestion Usage',
          paymentMethod: 'Company Card',
          referenceId: 'GCP-INV-20260902',
          createdByName: superAdmin ? superAdmin.name : 'Super Admin'
        },
        {
          date: new Date(currentYear, currentMonth, 3),
          category: 'Marketing & Lead Gen',
          amount: 18000,
          currency: 'PKR',
          description: 'Brevo Enterprise SMTP Relay & Email Deliverability Pack',
          paymentMethod: 'Online Gateway',
          referenceId: 'BREVO-SUB-98124',
          createdByName: superAdmin ? superAdmin.name : 'Super Admin'
        },
        {
          date: new Date(currentYear, currentMonth, 4),
          category: 'Telephony & Dialing',
          amount: 14500,
          currency: 'PKR',
          description: 'Lahore Local SIP Trunk & Automated Outbound Workstation Minutes',
          paymentMethod: 'Bank Transfer',
          referenceId: 'SIP-TRK-77192',
          createdByName: superAdmin ? superAdmin.name : 'Super Admin'
        },
        {
          date: new Date(currentYear, currentMonth, 5),
          category: 'Software & Infrastructure',
          amount: 12000,
          currency: 'PKR',
          description: 'Vercel Pro Serverless Edge Hosting & Domain SSL Renewal',
          paymentMethod: 'Company Card',
          referenceId: 'VCL-PRO-84912',
          createdByName: superAdmin ? superAdmin.name : 'Super Admin'
        },
        {
          date: new Date(currentYear, currentMonth, 6),
          category: 'Office & Utilities',
          amount: 22000,
          currency: 'PKR',
          description: 'High-Speed Commercial Dedicated Fiber Internet & Static IP (Gulberg)',
          paymentMethod: 'Bank Transfer',
          referenceId: 'PTCL-FBR-55319',
          createdByName: superAdmin ? superAdmin.name : 'Super Admin'
        },
        {
          date: new Date(currentYear, currentMonth, 7),
          category: 'Sales Commission',
          amount: 25000,
          currency: 'PKR',
          description: 'Performance Sales Commission Paid to Hashir Farooq (Aug Target Closed)',
          paymentMethod: 'Bank Transfer',
          referenceId: 'COMM-HF-202608',
          createdByName: superAdmin ? superAdmin.name : 'Super Admin'
        },

        // Last Month Expenses
        {
          date: new Date(currentYear, currentMonth - 1, 5),
          category: 'Software & Infrastructure',
          amount: 26000,
          currency: 'PKR',
          description: 'Google Places API & Geocoding Batch Extractions',
          paymentMethod: 'Company Card',
          referenceId: 'GCP-INV-20260805',
          createdByName: superAdmin ? superAdmin.name : 'Super Admin'
        },
        {
          date: new Date(currentYear, currentMonth - 1, 10),
          category: 'Telephony & Dialing',
          amount: 16000,
          currency: 'PKR',
          description: 'Outbound Dialing Trunk Top-up (5000 mins capacity)',
          paymentMethod: 'Online Gateway',
          referenceId: 'SIP-TRK-66401',
          createdByName: superAdmin ? superAdmin.name : 'Super Admin'
        },
        {
          date: new Date(currentYear, currentMonth - 1, 15),
          category: 'Marketing & Lead Gen',
          amount: 20000,
          currency: 'PKR',
          description: 'Targeted Domestic LinkedIn & Social Outreach Campaign',
          paymentMethod: 'Company Card',
          referenceId: 'MKT-LNK-44102',
          createdByName: superAdmin ? superAdmin.name : 'Super Admin'
        },
        {
          date: new Date(currentYear, currentMonth - 1, 20),
          category: 'Legal & Compliance',
          amount: 15000,
          currency: 'PKR',
          description: 'Quarterly Corporate Tax & Regulatory Data Compliance Review',
          paymentMethod: 'Bank Transfer',
          referenceId: 'TAX-Q3-2026',
          createdByName: superAdmin ? superAdmin.name : 'Super Admin'
        },
        {
          date: new Date(currentYear, currentMonth - 1, 28),
          category: 'Office & Utilities',
          amount: 21500,
          currency: 'PKR',
          description: 'Office Workspace Electricity & Shared Facilities Bill',
          paymentMethod: 'Bank Transfer',
          referenceId: 'LESCO-COMM-89102',
          createdByName: superAdmin ? superAdmin.name : 'Super Admin'
        },

        // Two Months Ago
        {
          date: new Date(currentYear, currentMonth - 2, 8),
          category: 'Software & Infrastructure',
          amount: 30000,
          currency: 'PKR',
          description: 'MongoDB Atlas Dedicated M10 Cluster Annual Reserve Installment',
          paymentMethod: 'Company Card',
          referenceId: 'MDB-SUB-11928',
          createdByName: superAdmin ? superAdmin.name : 'Super Admin'
        },
        {
          date: new Date(currentYear, currentMonth - 2, 14),
          category: 'Marketing & Lead Gen',
          amount: 24000,
          currency: 'PKR',
          description: 'B2B Cold Outreach Campaign Setup & Domain Warmup Services',
          paymentMethod: 'Bank Transfer',
          referenceId: 'WRM-SRV-90123',
          createdByName: superAdmin ? superAdmin.name : 'Super Admin'
        }
      ];

      await Expense.insertMany(sampleExpenses);
      console.log(`[Seed Accounts] Inserted ${sampleExpenses.length} operational expense records.`);
    } else {
      console.log(`[Seed Accounts] Found ${existingExpensesCount} existing expense records.`);
    }

    // 2. Check if closed deals exist in Lead collection
    const closedDealsCount = await Lead.countDocuments({ callStatus: 'Lead / Sale' });
    if (closedDealsCount === 0) {
      console.log('[Seed Accounts] Converting a sample subset of leads to "Lead / Sale" deals...');

      const candidateLeads = await Lead.find({}).limit(8);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const sampleDeals = [
        {
          dealValue: 65000,
          date: new Date(currentYear, currentMonth, 3),
          agentName: agent ? agent.name : 'Hashir Farooq',
          products: products.slice(0, 2).map(p => ({
            productId: p._id,
            name: p.name,
            category: p.category,
            basePrice: p.basePrice,
            discountPercent: 10,
            finalPrice: Math.round(p.basePrice * 0.9),
            currency: 'PKR'
          }))
        },
        {
          dealValue: 85000,
          date: new Date(currentYear, currentMonth, 4),
          agentName: 'Sales Desk',
          products: products.slice(1, 3).map(p => ({
            productId: p._id,
            name: p.name,
            category: p.category,
            basePrice: p.basePrice,
            discountPercent: 15,
            finalPrice: Math.round(p.basePrice * 0.85),
            currency: 'PKR'
          }))
        },
        {
          dealValue: 45000,
          date: new Date(currentYear, currentMonth, 5),
          agentName: agent ? agent.name : 'Hashir Farooq',
          products: products.slice(0, 1).map(p => ({
            productId: p._id,
            name: p.name,
            category: p.category,
            basePrice: p.basePrice,
            discountPercent: 0,
            finalPrice: p.basePrice,
            currency: 'PKR'
          }))
        },
        {
          dealValue: 120000,
          date: new Date(currentYear, currentMonth, 7),
          agentName: 'Sales Desk',
          products: products.slice(2, 5).map(p => ({
            productId: p._id,
            name: p.name,
            category: p.category,
            basePrice: p.basePrice,
            discountPercent: 10,
            finalPrice: Math.round(p.basePrice * 0.9),
            currency: 'PKR'
          }))
        },
        {
          dealValue: 55000,
          date: new Date(currentYear, currentMonth - 1, 12),
          agentName: agent ? agent.name : 'Hashir Farooq',
          products: products.slice(0, 1).map(p => ({
            productId: p._id,
            name: p.name,
            category: p.category,
            basePrice: p.basePrice,
            discountPercent: 5,
            finalPrice: Math.round(p.basePrice * 0.95),
            currency: 'PKR'
          }))
        },
        {
          dealValue: 95000,
          date: new Date(currentYear, currentMonth - 1, 22),
          agentName: 'Sales Desk',
          products: products.slice(1, 3).map(p => ({
            productId: p._id,
            name: p.name,
            category: p.category,
            basePrice: p.basePrice,
            discountPercent: 10,
            finalPrice: Math.round(p.basePrice * 0.9),
            currency: 'PKR'
          }))
        },
        {
          dealValue: 70000,
          date: new Date(currentYear, currentMonth - 2, 18),
          agentName: agent ? agent.name : 'Hashir Farooq',
          products: products.slice(0, 2).map(p => ({
            productId: p._id,
            name: p.name,
            category: p.category,
            basePrice: p.basePrice,
            discountPercent: 10,
            finalPrice: Math.round(p.basePrice * 0.9),
            currency: 'PKR'
          }))
        }
      ];

      for (let i = 0; i < Math.min(candidateLeads.length, sampleDeals.length); i++) {
        const lead = candidateLeads[i];
        const deal = sampleDeals[i];

        await Lead.findByIdAndUpdate(lead._id, {
          callStatus: 'Lead / Sale',
          dealValue: deal.dealValue,
          interestedProducts: deal.products,
          extractedByName: deal.agentName,
          lastCalledAt: deal.date,
          updatedAt: deal.date
        });
        console.log(` - Closed deal: ${lead.businessName} (PKR ${deal.dealValue}) on ${deal.date.toISOString().split('T')[0]}`);
      }
    } else {
      console.log(`[Seed Accounts] Found ${closedDealsCount} existing closed deals in Lead collection.`);
    }

    console.log('[Seed Accounts] Completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Accounts] Error:', err);
    process.exit(1);
  }
};

seedAccountsData();
