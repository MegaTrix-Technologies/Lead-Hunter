const axios = require('axios');

async function testDatasetPipeline() {
  console.log('=== Testing MegaTrix Datasets System ===\n');

  try {
    // 1. Scrape and generate a new dataset with 10 results
    console.log('1. Generating new Dataset: "Roofing in Austin, TX" (10 max)...');
    const scrapeRes = await axios.post('http://localhost:5000/api/scraper/scrape', {
      keyword: 'Roofing',
      area: 'Austin, TX',
      maxResults: 10,
      datasetName: 'Austin Roofing Contractors Q3',
      datasetDescription: 'Targeting commercial roofers in Travis County',
      maxRating: 5.0,
      strictSearch: false
    });

    const dataset = scrapeRes.data.data.dataset;
    const leads = scrapeRes.data.data.leads;
    console.log(`✔ Created Dataset: "${dataset.name}" (ID: ${dataset._id})`);
    console.log(`✔ Qualified Leads in Dataset: ${leads.length}\n`);

    // 2. Rename and update description
    console.log('2. Updating Dataset Name and Description...');
    const updateRes = await axios.patch(`http://localhost:5000/api/datasets/${dataset._id}`, {
      name: 'Austin Roofing Pros (High Priority)',
      description: 'Updated high-priority campaign targeting Austin metro'
    });
    console.log(`✔ Updated Dataset Name: "${updateRes.data.data.name}"`);
    console.log(`✔ Updated Description: "${updateRes.data.data.description}"\n`);

    // 3. Mark first lead as 'Unreachable' (Retryable)
    if (leads.length > 0) {
      console.log(`3. Setting lead "${leads[0].businessName}" to status: "Unreachable"...`);
      const statusRes = await axios.patch(`http://localhost:5000/api/leads/${leads[0]._id}/call-status`, {
        callStatus: 'Unreachable',
        note: 'Number was ringing but not answered. Need to retry tomorrow.'
      });
      console.log(`✔ Status updated to: ${statusRes.data.data.callStatus} (Notes count: ${statusRes.data.data.callNotes.length})\n`);
    }

    // 4. Fetch Dataset Queue
    console.log('4. Fetching Dataset Calling Queue...');
    const queueRes = await axios.get(`http://localhost:5000/api/datasets/${dataset._id}/queue`);
    console.log(`✔ Dataset Queue Count: ${queueRes.data.totalQueue} leads\n`);

    // 5. Test Analytics Cross-Dataset Benchmarking
    console.log('5. Testing Cross-Dataset Analytics...');
    const analyticsRes = await axios.get('http://localhost:5000/api/analytics');
    const { kpis, datasetPerformance } = analyticsRes.data.data;
    console.log(`✔ Total Datasets in Analytics: ${kpis.totalDatasets}`);
    console.log(`✔ Total Unreachable in Analytics: ${kpis.unreachableCount}`);
    console.log(`✔ Datasets Benchmarked: ${datasetPerformance.length}`);
    if (datasetPerformance.length > 0) {
      console.log(` - Top Dataset: "${datasetPerformance[0].name}" | Total: ${datasetPerformance[0].totalLeads} | Unreachable: ${datasetPerformance[0].unreachable}`);
    }

    console.log('\n✅ ALL DATASET FEATURES VERIFIED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
  }
}

testDatasetPipeline();
