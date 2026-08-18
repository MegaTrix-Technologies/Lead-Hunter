const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../config/db');
const Lead = require('../models/Lead');

async function cleanMockLeads() {
  await connectDB();
  console.log('Cleaning up mock seed leads from MongoDB...');

  // Delete all leads with mock prefix placeId (e.g. gmb_miami_..., gmb_austin_..., gmb_[hash])
  const result = await Lead.deleteMany({
    $or: [
      { placeId: { $regex: '^gmb_' } }
    ]
  });

  console.log(`✔ Removed ${result.deletedCount} mock/simulated leads.`);
  const remainingCount = await Lead.countDocuments();
  console.log(`✔ Remaining Real Leads in Database: ${remainingCount}`);

  process.exit(0);
}

cleanMockLeads();
