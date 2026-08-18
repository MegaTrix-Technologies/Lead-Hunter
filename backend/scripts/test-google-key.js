const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.Key || 'AIzaSyD2uMUYCcHkK2-W-iR5H6plBIKFPSJnSps';

async function testGooglePlacesKey() {
  console.log('Testing Google Places API Key:', apiKey.substring(0, 10) + '...');

  // Test 1: Places API (New)
  try {
    console.log('\n--- Testing Places API (New) endpoint ---');
    const resNew = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      {
        textQuery: 'Roofing in Miami, FL',
        pageSize: 5
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.primaryType'
        }
      }
    );

    console.log('✔ Places API (New) Success!');
    console.log(`Found ${resNew.data.places?.length || 0} places:`);
    if (resNew.data.places) {
      resNew.data.places.forEach((p, idx) => {
        console.log(` ${idx + 1}. ${p.displayName?.text} | Rating: ${p.rating} (${p.userRatingCount}) | Phone: ${p.nationalPhoneNumber || 'N/A'} | Web: ${p.websiteUri || 'No Website'}`);
      });
    }
    return 'NEW_API';
  } catch (error) {
    console.log('❌ Places API (New) error:', error.response?.data || error.message);
  }

  // Test 2: Places API (Classic Text Search)
  try {
    console.log('\n--- Testing Places API (Classic) endpoint ---');
    const resClassic = await axios.get(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=Roofing+in+Miami+FL&key=${apiKey}`
    );

    console.log('Classic Status:', resClassic.data.status);
    if (resClassic.data.status === 'OK') {
      console.log(`✔ Found ${resClassic.data.results.length} places with Classic API.`);
      return 'CLASSIC_API';
    } else {
      console.log('Classic API Error Msg:', resClassic.data.error_message);
    }
  } catch (error) {
    console.log('❌ Classic API error:', error.response?.data || error.message);
  }
}

testGooglePlacesKey();
