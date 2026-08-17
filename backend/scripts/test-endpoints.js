const axios = require('axios');

async function testAll() {
  const baseURL = 'http://localhost:5000/api';
  console.log('--- Testing MegaTrix LeadEngine Backend Endpoints ---');

  try {
    // 1. Health Check
    const health = await axios.get(`${baseURL}/health`);
    console.log('✔ Health Check:', health.data);

    // 2. Get Leads (Pagination 10 per page default)
    const leads = await axios.get(`${baseURL}/leads?limit=10`);
    console.log(`✔ Get Leads: Found ${leads.data.pagination.totalLeads} total leads, returned ${leads.data.data.length} on page ${leads.data.pagination.currentPage}`);
    console.log('✔ Status Counts:', leads.data.statusCounts);

    // 3. Calling Queue
    const queue = await axios.get(`${baseURL}/leads/queue`);
    console.log(`✔ Calling Queue: Loaded ${queue.data.totalQueue} active leads into outbound queue.`);

    // 4. Scraper Engine (Strict Multi-Parameter Filter)
    const scrapeRes = await axios.post(`${baseURL}/scraper/scrape`, {
      keyword: 'Roofing',
      area: 'Miami, FL',
      noWebsiteOnly: false,
      recentlyRegistered: false,
      maxRating: 3.5,
      strictSearch: true
    });
    console.log('✔ Scraper Engine Result:', scrapeRes.data.message);
    console.log('   Stats:', scrapeRes.data.data.stats);

    // 5. Email Templates
    const templates = await axios.get(`${baseURL}/email/templates`);
    console.log(`✔ Email Templates: Loaded ${templates.data.data.length} proposal templates.`);

    // 6. Test Email Proposal Queue (Rate-Limited Dispatch with Safety Cap)
    const sampleLeadId = leads.data.data[0]._id;
    const campaignRes = await axios.post(`${baseURL}/email/campaign`, {
      leadIds: [sampleLeadId],
      customSubject: 'Personalized Growth Proposal for {{businessName}}',
      sendDelayMs: 100
    });
    console.log('✔ Email Campaign Launch:', campaignRes.data.message);
    console.log('   Job Report Initial:', campaignRes.data.data.jobId);

    // Wait 500ms and check delivery report
    await new Promise(r => setTimeout(r, 600));
    const activeReport = await axios.get(`${baseURL}/email/campaign/active`);
    console.log('✔ Active Delivery Report:', {
      totalQueued: activeReport.data.data.totalQueued,
      successfullySent: activeReport.data.data.successfullySent,
      safetyCappedBlocked: activeReport.data.data.safetyCappedBlocked,
      completed: activeReport.data.data.completed
    });

    // 7. Update Call Status on Workstation
    const statusUpdate = await axios.patch(`${baseURL}/leads/${sampleLeadId}/call-status`, {
      callStatus: 'Shows Interest',
      note: 'Verified owner interested in Q3 inbound proposal.',
      followUpDate: new Date(Date.now() + 86400000)
    });
    console.log('✔ Call Status Update:', statusUpdate.data.message);

    // 8. Analytics
    const analytics = await axios.get(`${baseURL}/analytics`);
    console.log('✔ Analytics KPIs:', analytics.data.data.kpis);

    console.log('\n🌟 ALL 8 BACKEND ENDPOINTS VERIFIED & OPERATING FLAWLESSLY 🌟\n');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAll();
