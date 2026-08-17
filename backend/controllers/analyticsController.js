const Lead = require('../models/Lead');
const ScrapeJob = require('../models/ScrapeJob');

exports.getAnalytics = async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();
    const uncontactedCount = await Lead.countDocuments({ callStatus: 'Uncontacted' });
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
          totalLeads,
          totalContacted,
          uncontactedCount,
          conversionRate: `${conversionRate}%`,
          interestRate: `${interestRate}%`,
          totalEmailed,
          safetyCappedLeads
        },
        statusDistribution: {
          Uncontacted: uncontactedCount,
          IVR: ivrCount,
          Receptionist: receptionistCount,
          'Do Not Call': dncCount,
          'Shows Interest': showsInterestCount,
          'Follow Up': followUpCount,
          'Lead / Sale': convertedCount
        },
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
