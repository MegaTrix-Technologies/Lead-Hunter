const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Dataset = require('../models/Dataset');
const ScrapeJob = require('../models/ScrapeJob');
const User = require('../models/User');

exports.getAnalytics = async (req, res) => {
  try {
    const user = req.user;
    const isAgent = user && user.role === 'agent';
    const leadFilter = isAgent ? { extractedBy: user._id } : {};

    const totalLeads = await Lead.countDocuments(leadFilter);
    const uncontactedCount = await Lead.countDocuments({ ...leadFilter, callStatus: 'Uncontacted' });
    const unreachableCount = await Lead.countDocuments({ ...leadFilter, callStatus: 'Unreachable' });
    const ivrCount = await Lead.countDocuments({ ...leadFilter, callStatus: 'IVR' });
    const receptionistCount = await Lead.countDocuments({ ...leadFilter, callStatus: 'Receptionist' });
    const dncCount = await Lead.countDocuments({ ...leadFilter, callStatus: 'Do Not Call' });
    const showsInterestCount = await Lead.countDocuments({ ...leadFilter, callStatus: 'Shows Interest' });
    const followUpCount = await Lead.countDocuments({ ...leadFilter, callStatus: 'Follow Up' });
    const convertedCount = await Lead.countDocuments({ ...leadFilter, callStatus: 'Lead / Sale' });

    const totalContacted = totalLeads - uncontactedCount;
    const conversionRate = totalContacted > 0 ? ((convertedCount / totalContacted) * 100).toFixed(1) : 0;
    const interestRate = totalContacted > 0 ? (((showsInterestCount + followUpCount + convertedCount) / totalContacted) * 100).toFixed(1) : 0;

    // Email stats
    const totalEmailed = await Lead.countDocuments({ ...leadFilter, emailSentCount: { $gt: 0 } });
    const safetyCappedLeads = await Lead.countDocuments({ ...leadFilter, emailSentCount: { $gte: 3 } });

    // Dataset Performance Comparison
    const datasetQuery = isAgent ? { createdBy: user._id } : {};
    let datasets = await Dataset.find(datasetQuery).sort({ createdAt: -1 }).lean();
    if (isAgent && datasets.length === 0) {
      // Fallback to all datasets if agent hasn't created one
      datasets = await Dataset.find().sort({ createdAt: -1 }).limit(10).lean();
    }

    const totalDatasets = isAgent ? datasets.length : await Dataset.countDocuments();

    const datasetPerformance = await Promise.all(datasets.map(async (ds) => {
      const leadMatch = { datasetId: ds._id };
      if (isAgent) leadMatch.extractedBy = user._id;

      const leads = await Lead.find(leadMatch).lean();
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
    const categoryPipeline = [];
    if (isAgent) categoryPipeline.push({ $match: { extractedBy: user._id } });
    categoryPipeline.push(
      { $group: { _id: '$category', total: { $sum: 1 }, converted: { $sum: { $cond: [{ $eq: ['$callStatus', 'Lead / Sale'] }, 1, 0] } } } },
      { $sort: { total: -1 } },
      { $limit: 8 }
    );
    const categoryStats = await Lead.aggregate(categoryPipeline);

    // Area breakdown
    const areaPipeline = [];
    if (isAgent) areaPipeline.push({ $match: { extractedBy: user._id } });
    areaPipeline.push(
      { $group: { _id: '$area', total: { $sum: 1 }, interested: { $sum: { $cond: [{ $in: ['$callStatus', ['Shows Interest', 'Follow Up', 'Lead / Sale']] }, 1, 0] } } } },
      { $sort: { total: -1 } },
      { $limit: 8 }
    );
    const areaStats = await Lead.aggregate(areaPipeline);

    // Rating breakdown
    const ratingPipeline = [];
    if (isAgent) ratingPipeline.push({ $match: { extractedBy: user._id } });
    ratingPipeline.push({
      $bucket: {
        groupBy: '$rating',
        boundaries: [0, 2.0, 3.0, 4.0, 5.1],
        default: 'Other',
        output: { count: { $sum: 1 } }
      }
    });
    const ratingBuckets = await Lead.aggregate(ratingPipeline);

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
 * Live Limits & Credits Tracker for Brevo & Google Places API + Team Usage Breakdown
 */
exports.getApiLimitsAndCredits = async (req, res) => {
  try {
    const user = req.user;
    const isSuperAdmin = !user || user.role === 'superadmin';

    // If agent accesses this endpoint, return 403 Forbidden
    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access restricted: Super Administrator privileges required to view API limits and credits.'
      });
    }

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

    // 3. User-by-User Team GMB Usage Breakdown
    const users = await User.find().sort({ role: 1, name: 1 }).lean();
    const teamUsage = await Promise.all(
      users.map(async (u) => {
        const isUserSuperAdmin = u.role === 'superadmin';
        const usedToday = await Lead.countDocuments({
          extractedBy: u._id,
          createdAt: { $gte: startOfTodayUTC }
        });
        const totalExtracted = await Lead.countDocuments({ extractedBy: u._id });
        const limit = u.dailyGmbLimit || 150;
        const remainingToday = isUserSuperAdmin ? 999999 : Math.max(0, limit - usedToday);
        const usagePercentage = isUserSuperAdmin
          ? 0
          : Math.min(100, Math.round((usedToday / (limit || 1)) * 100));

        return {
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          dailyLimit: limit,
          usedToday,
          remainingToday,
          totalExtracted,
          usagePercentage
        };
      })
    );

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
        teamUsage,
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
