const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.Key;

async function testAutocomplete() {
  console.log('Testing Google Places Autocomplete with input "Miam"...');
  
  // Test 1: Places API (New) Autocomplete
  try {
    const resNew = await axios.post(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        input: 'Miam',
        includedPrimaryTypes: ['(regions)', 'locality', 'administrative_area_level_3']
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey
        }
      }
    );

    console.log('✔ Places API (New) Autocomplete Success!');
    if (resNew.data.suggestions) {
      resNew.data.suggestions.forEach(s => {
        console.log(' - Suggestion:', s.placePrediction?.text?.text);
      });
    }
    return;
  } catch (err) {
    console.log('Places API (New) Autocomplete error:', err.response?.data || err.message);
  }

  // Test 2: Standard Places Autocomplete
  try {
    const resClassic = await axios.get(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=Miam&types=(cities)&key=${apiKey}`
    );
    console.log('Classic Autocomplete Status:', resClassic.data.status);
    if (resClassic.data.predictions) {
      resClassic.data.predictions.slice(0, 5).forEach(p => {
        console.log(' - Classic Prediction:', p.description);
      });
    }
  } catch (err) {
    console.log('Classic Autocomplete error:', err.response?.data || err.message);
  }
}

testAutocomplete();
