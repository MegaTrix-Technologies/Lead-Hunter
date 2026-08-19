const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Dataset = require('../models/Dataset');
const ScrapeJob = require('../models/ScrapeJob');

exports.getAnalytics = async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();
    const totalDatasets = await Dataset.countDocuments();
    const uncontactedCount = await Lead.countDocuments({ callStatus: 'Uncontacted' });
    const unreachableCount = await Lead.countDocuments({ callStatus: 'Unreachable' });
    const ivrCount = await Lead.countDocuments({ callStatus: 'IVR' });
    const receptionistCount = await Lead.countDocuments({ callStatus: 'Receptionist' });
    const dncCount = await Lead.countDocuments({ callStatus: 'Do Not Call' });
    const showsInterestCount = await Lead.countDocuments({ callStatus: 'Shows Interest' });
    const followUpCount = await Lead.countDocuments({ callStatus: 'Follow Up' });
    const convertedCount = await Lead.countDocuments({ callStatus: 'Lead / Sale' });

    const totalContacted = totalLeads - uncontactedCount;
    const conversionRate = totalContacted > 0 ? ((convertedCount / totalContacted) * 100).toFixed(1) : 0;
    const interestRate = totalContacted > 0 ? (((showsInterestCount + followUpCount + convertedCount) / totalContacted) * 100).toFixed(1) : 0;

    // Email stats
    const totalEmailed = await Lead.countDocuments({ emailSentCount: { $gt: 0 } });
    const safetyCappedLeads = await Lead.countDocuments({ emailSentCount: { $gte: 3 } });

    // Dataset Performance Comparison
    const datasets = await Dataset.find().sort({ createdAt: -1 }).lean();
    const datasetPerformance = await Promise.all(datasets.map(async (ds) => {
      const leads = await Lead.find({ datasetId: ds._id }).lean();
      const dsTotal = leads.length;
      const dsUncontacted = leads.filter(l => l.callStatus === 'Uncontacted').length;
      const dsUnreachable = leads.filter(l => l.callStatus === 'Unreachable').length;
      const dsInterested = leads.filter(l => l.callStatus === 'Shows Interest').length;
      const dsFollowUp = leads.filter(l => l.callStatus === 'Follow Up').length;
      const dsConverted = leads.filter(l => l.callStatus === 'Lead / Sale').length;
      const dsContacted = dsTotal - dsUncontacted;

      const dsConversionRate = dsContacted > 0 ? ((dsConverted / dsContacted) * 100).toFixed(1) : '0.0';
      const dsInterestRate = dsContacted > 0 ? (((dsInterested + dsFollowUp + dsConverted) / dsContacted) * 100).toFixed(1) : '0.0';

      return {
        id: ds._id,
        name: ds.name,
        description: ds.description || '',
        keyword: ds.keyword,
        area: ds.area,
        totalLeads: dsTotal,
        uncontacted: dsUncontacted,
        unreachable: dsUnreachable,
        contacted: dsContacted,
        showsInterest: dsInterested,
        followUp: dsFollowUp,
        converted: dsConverted,
        conversionRate: `${dsConversionRate}%`,
        interestRate: `${dsInterestRate}%`,
        createdAt: ds.createdAt
      };
    }));

    // Category breakdown
    const categoryStats = await Lead.aggregate([
      { $group: { _id: '$category', total: { $sum: 1 }, converted: { $sum: { $cond: [{ $eq: ['$callStatus', 'Lead / Sale'] }, 1, 0] } } } },
      { $sort: { total: -1 } },
      { $limit: 8 }
    ]);

    // Area breakdown
    const areaStats = await Lead.aggregate([
      { $group: { _id: '$area', total: { $sum: 1 }, interested: { $sum: { $cond: [{ $in: ['$callStatus', ['Shows Interest', 'Follow Up', 'Lead / Sale']] }, 1, 0] } } } },
      { $sort: { total: -1 } },
      { $limit: 8 }
    ]);

    // Rating breakdown
    const ratingBuckets = await Lead.aggregate([
      {
        $bucket: {
          groupBy: '$rating',
          boundaries: [0, 2.0, 3.0, 4.0, 5.1],
          default: 'Other',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        kpis: {
          totalDatasets,
          totalLeads,
          totalContacted,
          uncontactedCount,
          unreachableCount,
          conversionRate: `${conversionRate}%`,
          interestRate: `${interestRate}%`,
          totalEmailed,
          safetyCappedLeads
        },
        statusDistribution: {
          Uncontacted: uncontactedCount,
          Unreachable: unreachableCount,
          IVR: ivrCount,
          Receptionist: receptionistCount,
          'Do Not Call': dncCount,
          'Shows Interest': showsInterestCount,
          'Follow Up': followUpCount,
          'Lead / Sale': convertedCount
        },
        datasetPerformance,
        categoryStats,
        areaStats,
        ratingBuckets
      }
    });
  } catch (error) {
    console.error('[Analytics Controller] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Live Limits & Credits Tracker for Brevo & Google Places API
 * 100% Serverless on-demand calculation with real usage counts and countdown timers
 */
exports.getApiLimitsAndCredits = async (req, res) => {
  try {
    const now = new Date();
    
    // 1. Brevo Daily Quota Calculation (300 emails/day, resets at 00:00 UTC Midnight)
    const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const nextMidnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
    const msUntilBrevoReset = Math.max(0, nextMidnightUTC.getTime() - now.getTime());

    let emailsSentToday = 0;
    try {
      if (mongoose.connection.readyState === 1) {
        const sentTodayAggregation = await Lead.aggregate([
          { $unwind: '$emailHistory' },
          { $match: { 'emailHistory.sentAt': { $gte: startOfTodayUTC } } },
          { $count: 'totalSentToday' }
        ]);
        emailsSentToday = sentTodayAggregation[0]?.totalSentToday || 0;
      }
    } catch (dbErr) {
      console.warn('[Analytics Quota] Lead aggregation error:', dbErr.message);
    }

    const brevoDailyLimit = 300;
    const brevoRemainingToday = Math.max(0, brevoDailyLimit - emailsSentToday);

    // 2. Google Places API Monthly Quota Calculation ($200 USD free tier credit / month)
    const startOfMonthUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const startOfNextMonthUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    const msUntilGoogleReset = Math.max(0, startOfNextMonthUTC.getTime() - now.getTime());

    let totalPlacesApiRequestsThisMonth = 0;
    try {
      if (mongoose.connection.readyState === 1) {
        const scrapeJobsThisMonth = await ScrapeJob.find({
          createdAt: { $gte: startOfMonthUTC }
        }).lean();

        scrapeJobsThisMonth.forEach(job => {
          const requestedMax = job.filtersApplied?.maxResults || 10;
          const apiCalls = Math.min(5, Math.ceil(requestedMax / 20)) || 1;
          totalPlacesApiRequestsThisMonth += apiCalls;
        });
      }
    } catch (dbErr) {
      console.warn('[Analytics Quota] ScrapeJob find error:', dbErr.message);
    }

    const googleMonthlyCreditLimit = 200.00; // $200.00 USD
    const estimatedCostPerCall = 0.032; // $0.032 / text search
    const estimatedMonthlySpend = parseFloat((totalPlacesApiRequestsThisMonth * estimatedCostPerCall).toFixed(2));
    const remainingCredit = Math.max(0, parseFloat((googleMonthlyCreditLimit - estimatedMonthlySpend).toFixed(2)));
    const estimatedRequestsLimit = Math.floor(googleMonthlyCreditLimit / estimatedCostPerCall); // ~6,250
    const remainingRequests = Math.max(0, estimatedRequestsLimit - totalPlacesApiRequestsThisMonth);

    res.json({
      success: true,
      data: {
        serverTimestamp: now.toISOString(),
        brevo: {
          serviceName: 'Brevo SMTP Free Tier',
          dailyLimit: brevoDailyLimit,
          sentToday: emailsSentToday,
          remainingToday: brevoRemainingToday,
          usagePercentage: Math.min(100, Math.round((emailsSentToday / brevoDailyLimit) * 100)),
          resetTimestamp: nextMidnightUTC.toISOString(),
          msUntilReset: msUntilBrevoReset,
          smtpHost: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
          smtpPort: process.env.SMTP_PORT || 587,
          fromEmail: process.env.FROM_EMAIL || 'sales@megatrixai.com',
          status: 'Connected & Active'
        },
        googlePlaces: {
          serviceName: 'Google Places API (New)',
          monthlyCreditAllowance: googleMonthlyCreditLimit,
          estimatedSpend: estimatedMonthlySpend,
          remainingCredit,
          totalRequestsThisMonth: totalPlacesApiRequestsThisMonth,
          estimatedMonthlyRequestsLimit: estimatedRequestsLimit,
          remainingRequests,
          usagePercentage: Math.min(100, Math.round((estimatedMonthlySpend / googleMonthlyCreditLimit) * 100)),
          resetTimestamp: startOfNextMonthUTC.toISOString(),
          msUntilReset: msUntilGoogleReset,
          apiKeyConfigured: Boolean(process.env.GOOGLE_PLACES_API_KEY),
          status: 'Active (Places API v1)'
        },
        system: {
          mode: '100% Serverless (Vercel Ready)',
          database: 'MongoDB Atlas Cloud Cluster',
          pricingTier: 'Zero-Cost Free Tier Compliant'
        }
      }
    });
  } catch (error) {
    console.error('[Analytics Controller] getApiLimitsAndCredits error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
