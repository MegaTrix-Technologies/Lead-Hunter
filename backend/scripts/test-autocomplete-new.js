const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.Key;

async function testNewAutocomplete() {
  try {
    const resNew = await axios.post(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        input: 'London',
        includedPrimaryTypes: ['locality']
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey
        }
      }
    );

    console.log('✔ Places API (New) Autocomplete:');
    if (resNew.data.suggestions) {
      resNew.data.suggestions.slice(0, 5).forEach(s => {
        console.log(' - Suggestion:', s.placePrediction?.text?.text);
      });
    }
  } catch (err) {
    console.log('Error:', err.response?.data || err.message);
  }
}

testNewAutocomplete();
