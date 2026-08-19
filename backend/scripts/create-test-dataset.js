const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Dataset = require('../models/Dataset');
const Lead = require('../models/Lead');
const connectDB = require('../config/db');

async function createTestDataset() {
  try {
    await connectDB();
    console.log('Connected to MongoDB. Creating test dataset...');

    // 1. Create Dataset
    const dataset = await Dataset.create({
      name: 'MegaTrix Live Email Test Batch (4 Accounts)',
      description: 'Live test dataset for Brevo SMTP email proposal verification',
      keyword: 'Local Businesses',
      area: 'United States',
      totalLeads: 4,
      uncontactedCount: 4,
      contactedCount: 0,
      unreachableCount: 0,
      pipelineCount: 0,
      closedCount: 0,
      searchHistory: [{
        keyword: 'Test Suite',
        area: 'USA',
        resultsCount: 4,
        executedAt: new Date()
      }]
    });

    // 2. Prepare 4 test businesses with the requested emails
    const testBusinesses = [
      {
        placeId: `test_place_${Date.now()}_1`,
        businessName: 'Apex Elite Roofing & Solar',
        category: 'Roofing Specialist',
        area: 'Miami, FL',
        email: 'ranasuffyan9@gmail.com',
        phoneNumber: '+1 (305) 555-0142',
        rating: 4.9,
        reviewCount: 128,
        website: 'https://apexroofingmiami.com',
        address: '100 Brickell Ave, Miami, FL 33131',
        callStatus: 'Uncontacted',
        datasetId: dataset._id,
        datasetIds: [dataset._id]
      },
      {
        placeId: `test_place_${Date.now()}_2`,
        businessName: 'Precision Dental & Orthodontics',
        category: 'Dental Practice',
        area: 'Austin, TX',
        email: 'l1f23bscs1329@ucp.edu.pk',
        phoneNumber: '+1 (512) 555-0189',
        rating: 4.8,
        reviewCount: 240,
        website: 'https://precisiondentalaustin.com',
        address: '500 Congress Ave, Austin, TX 78701',
        callStatus: 'Uncontacted',
        datasetId: dataset._id,
        datasetIds: [dataset._id]
      },
      {
        placeId: `test_place_${Date.now()}_3`,
        businessName: 'MegaTrix Digital AI Hub',
        category: 'Software & AI Agency',
        area: 'Chicago, IL',
        email: 'admin.megatrix@gmail.com',
        phoneNumber: '+1 (312) 555-0199',
        rating: 5.0,
        reviewCount: 350,
        website: 'https://megatrixai.com',
        address: '233 S Wacker Dr, Chicago, IL 60606',
        callStatus: 'Uncontacted',
        datasetId: dataset._id,
        datasetIds: [dataset._id]
      },
      {
        placeId: `test_place_${Date.now()}_4`,
        businessName: 'Nexus Commercial Remodeling',
        category: 'General Contractor',
        area: 'Dallas, TX',
        email: 'myportalonline170@gmail.com',
        phoneNumber: '+1 (214) 555-0177',
        rating: 4.7,
        reviewCount: 89,
        website: 'https://nexusremodeling.com',
        address: '1717 Main St, Dallas, TX 75201',
        callStatus: 'Uncontacted',
        datasetId: dataset._id,
        datasetIds: [dataset._id]
      }
    ];

    // 3. Insert leads into MongoDB
    for (const b of testBusinesses) {
      await Lead.create(b);
    }

    console.log(`\n✔ [SUCCESS] Test Dataset Created!`);
    console.log(`- Dataset ID: ${dataset._id}`);
    console.log(`- Dataset Name: "${dataset.name}"`);
    console.log(`- 4 Test Accounts with Emails:`);
    testBusinesses.forEach((b, i) => {
      console.log(`   ${i + 1}. [${b.businessName}] -> ${b.email} (${b.area})`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating test dataset:', err);
    process.exit(1);
  }
}

createTestDataset();
