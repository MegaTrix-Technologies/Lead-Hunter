const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../config/db');
const gmbScraperService = require('../services/gmbScraperService');

async function testLiveScraper() {
  console.log('--- Testing Live Google Places API Extraction ---');
  await connectDB();

  try {
    const result = await gmbScraperService.scrapeLeads({
      keyword: 'Plumbing',
      area: 'Austin, TX',
      noWebsiteOnly: false,
      recentlyRegistered: false,
      maxRating: 5.0,
      strictSearch: false
    });

    console.log('\n✔ Live Extraction Completed!');
    console.log(`Stats: Extracted: ${result.stats.totalExtracted}, Qualified: ${result.stats.totalQualified}, Excluded: ${result.stats.totalExcluded}`);
    console.log(`Returned Leads Count: ${result.leads.length}`);

    if (result.leads.length > 0) {
      console.log('\nSample Live Google Leads Extracted:');
      result.leads.slice(0, 5).forEach((l, idx) => {
        console.log(`  ${idx + 1}. [${l.businessName}]`);
        console.log(`     Phone: ${l.phoneNumber || 'N/A'}`);
        console.log(`     Website: ${l.website || 'No Website'}`);
        console.log(`     Rating: ⭐ ${l.rating} (${l.reviewCount} reviews)`);
        console.log(`     Address: ${l.address}`);
        console.log(`     Place ID: ${l.placeId}`);
        console.log('--------------------------------------------------');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Live Extraction Error:', error.message);
    process.exit(1);
  }
}

testLiveScraper();
