const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testPdfExport() {
  console.log('Testing PDF Export endpoint...');
  try {
    // 1. Get first dataset ID
    const dsRes = await axios.get('http://localhost:5000/api/datasets');
    if (!dsRes.data.data || dsRes.data.data.length === 0) {
      console.log('No datasets found to test PDF export.');
      return;
    }

    const targetDataset = dsRes.data.data[0];
    console.log(`Exporting PDF for Dataset: "${targetDataset.name}" (ID: ${targetDataset._id})...`);

    const pdfRes = await axios.get(`http://localhost:5000/api/datasets/${targetDataset._id}/export-pdf`, {
      responseType: 'arraybuffer'
    });

    console.log(`✔ Received PDF response: ${pdfRes.data.length} bytes`);
    console.log(`✔ Content-Type: ${pdfRes.headers['content-type']}`);
    console.log(`✔ Content-Disposition: ${pdfRes.headers['content-disposition']}`);

    // Save test artifact
    const outputPath = path.join(__dirname, 'test_output_dossier.pdf');
    fs.writeFileSync(outputPath, pdfRes.data);
    console.log(`✔ Saved test PDF locally to: ${outputPath}`);
    console.log('✅ PDF EXPORT VERIFIED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ PDF Export test failed:', err.response?.data ? err.response.data.toString() : err.message);
  }
}

testPdfExport();
