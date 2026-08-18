const axios = require('axios');

async function test10Leads() {
  try {
    console.log('--- Testing Live 10-Lead Extraction Endpoint ---');
    const res = await axios.post('http://localhost:5000/api/scraper/scrape', {
      keyword: 'Dentists',
      area: 'Austin, TX',
      noWebsiteOnly: false,
      recentlyRegistered: false,
      maxRating: 5.0,
      strictSearch: false
    });

    console.log('✔ Server Response:', res.data.message);
    console.log('Stats:', res.data.data.stats);
    console.log(`Extracted Leads count: ${res.data.data.leads.length}`);
    if (res.data.data.leads.length > 0) {
      res.data.data.leads.forEach((l, idx) => {
        console.log(` ${idx + 1}. [${l.businessName}] | Phone: ${l.phoneNumber || 'N/A'} | ⭐ ${l.rating} (${l.reviewCount}) | ${l.address}`);
      });
    }
  } catch (err) {
    console.error('❌ Scraper error:', err.response?.data || err.message);
  }
}

test10Leads();
