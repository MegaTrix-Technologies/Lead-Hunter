const Sale = require('../models/Sale');
const User = require('../models/User');

/**
 * Calculate detailed earnings for a user across all completed sales and referral commissions
 */
const calculateUserEarnings = async (user) => {
  if (!user) {
    return {
      totalEarnings: 0,
      directEarnings: 0,
      referralEarnings: 0,
      dealsCount: 0,
      referralsCount: 0,
      referredUsers: [],
      itemized: [],
      itemizedReferrals: []
    };
  }

  const rates = user.commissionRates || { leadGenPercent: 0, closerPercent: 0, developerPercent: 0 };

  // 1. Direct Sales Commission (credited on full payment AND project delivery)
  const completedSales = await Sale.find({
    status: 'payment_completed',
    remainingAmount: 0,
    isProjectDelivered: true,
    $or: [
      { leadGeneratedBy: user._id },
      { closedBy: user._id },
      { assignedDevelopers: user._id }
    ]
  }).sort({ closedAt: -1 }).lean();

  let directEarnings = 0;
  const itemized = [];

  for (const s of completedSales) {
    let dealEarnings = 0;
    const rolesEarned = [];

    // Lead Gen commission
    if (s.leadGeneratedBy && s.leadGeneratedBy.toString() === user._id.toString()) {
      const pct = rates.leadGenPercent || 0;
      const amt = Math.round((s.totalAmount * pct) / 100);
      if (amt > 0) {
        dealEarnings += amt;
        rolesEarned.push({ role: 'Lead Generator', percent: pct, amount: amt });
      }
    }

    // Closer commission
    if (s.closedBy && s.closedBy.toString() === user._id.toString()) {
      const pct = rates.closerPercent || 0;
      const amt = Math.round((s.totalAmount * pct) / 100);
      if (amt > 0) {
        dealEarnings += amt;
        rolesEarned.push({ role: 'Sales Closer', percent: pct, amount: amt });
      }
    }

    // Developer commission
    if (s.assignedDevelopers && s.assignedDevelopers.some(d => d.toString() === user._id.toString())) {
      const pct = rates.developerPercent || 0;
      const amt = Math.round((s.totalAmount * pct) / 100);
      if (amt > 0) {
        dealEarnings += amt;
        rolesEarned.push({ role: 'Developer', percent: pct, amount: amt });
      }
    }

    directEarnings += dealEarnings;

    itemized.push({
      saleId: s._id,
      clientName: s.customer?.businessName || 'Client',
      totalSaleAmount: s.totalAmount,
      closedAt: s.closedAt,
      rolesEarned,
      dealEarnings
    });
  }

  // 2. Referral Commission: Find all agents referred by this user
  const referredUsers = await User.find({ referredBy: user._id }).lean();
  let referralEarnings = 0;
  const itemizedReferrals = [];
  const referredUsersSummary = [];

  for (const refUser of referredUsers) {
    const refPercent = refUser.referralPercent || 0;

    // Find all completed sales where this referred user was Lead Generator or Closer
    // (excluding sales where the referrer themselves already earned direct closer/leadgen commission to avoid double-charging unless intended)
    const refSales = await Sale.find({
      status: 'payment_completed',
      remainingAmount: 0,
      isProjectDelivered: true,
      $or: [
        { leadGeneratedBy: refUser._id },
        { closedBy: refUser._id }
      ]
    }).sort({ closedAt: -1 }).lean();

    let userGeneratedEarnings = 0;

    for (const rs of refSales) {
      if (refPercent > 0) {
        const commissionAmount = Math.round((rs.totalAmount * refPercent) / 100);
        if (commissionAmount > 0) {
          referralEarnings += commissionAmount;
          userGeneratedEarnings += commissionAmount;

          itemizedReferrals.push({
            saleId: rs._id,
            clientName: rs.customer?.businessName || 'Client',
            referredAgentId: refUser._id,
            referredAgentName: refUser.name,
            totalSaleAmount: rs.totalAmount,
            referralPercent: refPercent,
            earnedAmount: commissionAmount,
            closedAt: rs.closedAt
          });
        }
      }
    }

    referredUsersSummary.push({
      id: refUser._id,
      name: refUser.name,
      email: refUser.email,
      roles: refUser.roles,
      referralPercent: refPercent,
      dealsClosedCount: refSales.length,
      totalCommissionGenerated: userGeneratedEarnings,
      joinedAt: refUser.createdAt
    });
  }

  const totalEarnings = directEarnings + referralEarnings;

  return {
    totalEarnings,
    directEarnings,
    referralEarnings,
    dealsCount: completedSales.length,
    referralsCount: referredUsers.length,
    referredUsers: referredUsersSummary,
    itemized,
    itemizedReferrals
  };
};

/**
 * GET /api/commissions/my-earnings
 * Returns authenticated user's commission breakdown, referral earnings, and total earnings
 */
exports.getMyEarnings = async (req, res) => {
  try {
    const user = req.user;
    const earnings = await calculateUserEarnings(user);

    res.json({
      success: true,
      data: {
        userId: user._id,
        name: user.name,
        commissionRates: user.commissionRates || { leadGenPercent: 0, closerPercent: 0, developerPercent: 0 },
        ...earnings
      }
    });
  } catch (error) {
    console.error('[Commission Controller] getMyEarnings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/commissions/all
 * Super Admin view of all users' earnings (direct + referral)
 */
exports.getAllUserEarnings = async (req, res) => {
  try {
    const users = await User.find({ status: 'active' }).sort({ name: 1 });

    const summary = await Promise.all(
      users.map(async (u) => {
        const e = await calculateUserEarnings(u);
        return {
          userId: u._id,
          name: u.name,
          email: u.email,
          roles: u.roles,
          commissionRates: u.commissionRates,
          directEarnings: e.directEarnings,
          referralEarnings: e.referralEarnings,
          totalEarnings: e.totalEarnings,
          dealsCount: e.dealsCount,
          referralsCount: e.referralsCount
        };
      })
    );

    const grandTotalEarnings = summary.reduce((sum, s) => sum + s.totalEarnings, 0);

    res.json({
      success: true,
      data: {
        grandTotalEarnings,
        users: summary
      }
    });
  } catch (error) {
    console.error('[Commission Controller] getAllUserEarnings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports.calculateUserEarnings = calculateUserEarnings;
