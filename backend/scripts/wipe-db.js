const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../config/db');
const Lead = require('../models/Lead');
const ScrapeJob = require('../models/ScrapeJob');

async function wipeDatabase() {
  await connectDB();
  console.log('[MegaTrix Cleaner] Wiping all lead records and scrape history from MongoDB...');

  try {
    const deletedLeads = await Lead.deleteMany({});
    const deletedJobs = await ScrapeJob.deleteMany({});

    console.log(`✔ Successfully deleted ${deletedLeads.deletedCount} leads.`);
    console.log(`✔ Successfully deleted ${deletedJobs.deletedCount} scrape job logs.`);
    
    const count = await Lead.countDocuments();
    console.log(`✔ Total Leads remaining in DB: ${count} (Clean Slate)`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error wiping database:', error);
    process.exit(1);
  }
}

wipeDatabase();
