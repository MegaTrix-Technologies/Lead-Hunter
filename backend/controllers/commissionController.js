const Sale = require('../models/Sale');
const User = require('../models/User');

/**
 * Calculate detailed earnings for a user across all completed sales
 */
const calculateUserEarnings = async (user) => {
  if (!user) return { totalEarnings: 0, dealsCount: 0, itemized: [] };

  const rates = user.commissionRates || { leadGenPercent: 0, closerPercent: 0, developerPercent: 0 };

  // Commission is credited ONLY on full payment AND project delivery (as per requirement)
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

  let totalEarnings = 0;
  const itemized = [];

  for (const s of completedSales) {
    let dealEarnings = 0;
    const rolesEarned = [];

    // 1. Lead Gen commission
    if (s.leadGeneratedBy && s.leadGeneratedBy.toString() === user._id.toString()) {
      const pct = rates.leadGenPercent || 0;
      const amt = Math.round((s.totalAmount * pct) / 100);
      if (amt > 0) {
        dealEarnings += amt;
        rolesEarned.push({ role: 'Lead Generator', percent: pct, amount: amt });
      }
    }

    // 2. Closer commission
    if (s.closedBy && s.closedBy.toString() === user._id.toString()) {
      const pct = rates.closerPercent || 0;
      const amt = Math.round((s.totalAmount * pct) / 100);
      if (amt > 0) {
        dealEarnings += amt;
        rolesEarned.push({ role: 'Sales Closer', percent: pct, amount: amt });
      }
    }

    // 3. Developer commission
    if (s.assignedDevelopers && s.assignedDevelopers.some(d => d.toString() === user._id.toString())) {
      const pct = rates.developerPercent || 0;
      const amt = Math.round((s.totalAmount * pct) / 100);
      if (amt > 0) {
        dealEarnings += amt;
        rolesEarned.push({ role: 'Developer', percent: pct, amount: amt });
      }
    }

    totalEarnings += dealEarnings;

    itemized.push({
      saleId: s._id,
      clientName: s.customer?.businessName || 'Client',
      totalSaleAmount: s.totalAmount,
      closedAt: s.closedAt,
      rolesEarned,
      dealEarnings
    });
  }

  return {
    totalEarnings,
    dealsCount: completedSales.length,
    itemized
  };
};

/**
 * GET /api/commissions/my-earnings
 * Returns authenticated user's commission breakdown and total earnings
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
 * Super Admin view of all users' earnings
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
          totalEarnings: e.totalEarnings,
          dealsCount: e.dealsCount
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
