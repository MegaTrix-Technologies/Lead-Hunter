const Sale = require('../models/Sale');
const Project = require('../models/Project');
const Lead = require('../models/Lead');
const Expense = require('../models/Expense');
const { calculateUserEarnings } = require('./commissionController');

/**
 * GET /api/dashboard
 * Return role-tailored dashboard metrics with drilldown records
 */
exports.getDashboardData = async (req, res) => {
  try {
    const user = req.user;
    const isSuperAdmin = user.roles ? user.roles.includes('super_admin') : user.role === 'superadmin';
    const userRoles = user.roles && user.roles.length > 0 ? user.roles : (isSuperAdmin ? ['super_admin'] : ['sales_agent']);

    const cards = [];

    // ─── SUPER ADMIN DASHBOARD ───────────────────────────────────────────────
    if (isSuperAdmin) {
      const [sales, expenses, activeProjects, pendingSales] = await Promise.all([
        Sale.find().sort({ closedAt: -1 }).lean(),
        Expense.find().sort({ date: -1 }).lean(),
        Project.find({ status: 'active' }).populate('saleId', 'customer totalAmount advanceAmount remainingAmount status').lean(),
        Sale.find({ status: { $ne: 'payment_completed' } }).sort({ remainingAmount: -1 }).lean()
      ]);

      const totalBookedAmt = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const totalCollectedCash = sales.reduce((sum, s) => sum + (s.advanceAmount || 0), 0);
      const totalExpenseAmt = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const realizedProfit = totalCollectedCash - totalExpenseAmt;
      const totalRemainingAmt = pendingSales.reduce((sum, s) => sum + (s.remainingAmount || 0), 0);

      cards.push({
        id: 'total_sales',
        label: 'Realized Sales Inflow',
        value: `PKR ${totalCollectedCash.toLocaleString()}`,
        numericValue: totalCollectedCash,
        subtext: `Cash in Bank • Booked: PKR ${totalBookedAmt.toLocaleString()}`,
        color: 'emerald',
        drillDown: sales.map(s => ({
          id: s._id,
          title: s.customer?.businessName || 'Deal',
          subtitle: `${s.customer?.area || ''} • Closed by ${s.closedByName}`,
          amount: `Collected: PKR ${(s.advanceAmount || 0).toLocaleString()} / Total: PKR ${s.totalAmount.toLocaleString()}`,
          date: s.closedAt,
          status: s.status
        }))
      });

      cards.push({
        id: 'total_profit',
        label: 'Realized Net Cash Profit',
        value: `PKR ${realizedProfit.toLocaleString()}`,
        numericValue: realizedProfit,
        subtext: `Cash Inflow − Expenses (Margin: ${totalCollectedCash > 0 ? ((realizedProfit / totalCollectedCash) * 100).toFixed(1) : 0}%)`,
        color: realizedProfit >= 0 ? 'emerald' : 'rose',
        drillDown: [
          { id: 'rev', title: 'Realized Cash Inflow', subtitle: `${sales.length} transactions`, amount: `PKR ${totalCollectedCash.toLocaleString()}`, status: 'Inflow' },
          { id: 'exp', title: 'Total Operating Outflow', subtitle: `${expenses.length} entries`, amount: `PKR ${totalExpenseAmt.toLocaleString()}`, status: 'Outflow' }
        ]
      });

      cards.push({
        id: 'total_expenses',
        label: 'Total Operational Expenses',
        value: `PKR ${totalExpenseAmt.toLocaleString()}`,
        numericValue: totalExpenseAmt,
        subtext: `${expenses.length} Logged Entries`,
        color: 'rose',
        drillDown: expenses.map(e => ({
          id: e._id,
          title: e.reason || e.description,
          subtitle: `${e.category} • Recurrence: ${e.recurrence || 'one_time'}`,
          amount: `PKR ${e.amount.toLocaleString()}`,
          date: e.date,
          status: e.paymentMethod || 'Paid'
        }))
      });

      cards.push({
        id: 'active_projects',
        label: 'Total Active Projects',
        value: activeProjects.length,
        numericValue: activeProjects.length,
        subtext: 'In Production / Delivery Phase',
        color: 'blue',
        drillDown: activeProjects.map(p => ({
          id: p._id,
          title: p.saleId?.customer?.businessName || 'Project',
          subtitle: `Assigned Devs: ${(p.assignedDeveloperNames || []).join(', ') || 'Unassigned'}`,
          amount: `PKR ${(p.saleId?.totalAmount || 0).toLocaleString()}`,
          date: p.createdAt,
          status: p.status
        }))
      });

      cards.push({
        id: 'payment_remaining',
        label: 'Payment Remaining to Collect',
        value: `PKR ${totalRemainingAmt.toLocaleString()}`,
        numericValue: totalRemainingAmt,
        subtext: `${pendingSales.length} Deals Pending Full Cash`,
        color: 'amber',
        drillDown: pendingSales.map(s => ({
          id: s._id,
          title: s.customer?.businessName || 'Deal',
          subtitle: `Closed by ${s.closedByName} • Advance: PKR ${(s.advanceAmount || 0).toLocaleString()}`,
          amount: `Remaining: PKR ${s.remainingAmount.toLocaleString()}`,
          date: s.closedAt,
          status: s.status
        }))
      });

      return res.json({
        success: true,
        data: {
          roles: userRoles,
          cards
        }
      });
    }

    // ─── NON-SUPER ADMIN (SALES AGENT, CLOSER, DEVELOPER, OR MULTI-ROLE) ─────
    const earningsData = await calculateUserEarnings(user);

    // Combined direct + referral drilldown items
    const combinedEarningsDrill = [
      ...earningsData.itemized.map(item => ({
        id: item.saleId,
        title: item.clientName,
        subtitle: (item.rolesEarned || []).map(r => `${r.role} (${r.percent}%)`).join(' + '),
        amount: `Earned: PKR ${item.dealEarnings.toLocaleString()}`,
        date: item.closedAt,
        status: 'Direct Commission'
      })),
      ...earningsData.itemizedReferrals.map(item => ({
        id: item.saleId,
        title: `${item.clientName} (Referral: ${item.referredAgentName})`,
        subtitle: `Agent: ${item.referredAgentName} • Rate: ${item.referralPercent}% of PKR ${item.totalSaleAmount.toLocaleString()}`,
        amount: `Earned: PKR ${item.earnedAmount.toLocaleString()}`,
        date: item.closedAt,
        status: 'Referral Commission'
      }))
    ];

    // Card 1: My Total Earnings (Direct Commissions + Referral Earnings)
    cards.push({
      id: 'my_earnings',
      label: 'My Total Earnings',
      value: `PKR ${earningsData.totalEarnings.toLocaleString()}`,
      numericValue: earningsData.totalEarnings,
      subtext: `Direct: PKR ${earningsData.directEarnings.toLocaleString()} • Referral: PKR ${earningsData.referralEarnings.toLocaleString()}`,
      color: 'emerald',
      drillDown: combinedEarningsDrill
    });

    // Card 2: Total Referrals (Count of employees joined via reference)
    cards.push({
      id: 'total_referrals',
      label: 'Total Referrals',
      value: earningsData.referralsCount,
      numericValue: earningsData.referralsCount,
      subtext: `${earningsData.referralsCount} Team Members Joined via Reference`,
      color: 'purple',
      drillDown: (earningsData.referredUsers || []).map(u => ({
        id: u.id,
        title: u.name,
        subtitle: `${u.email} • Rate: ${u.referralPercent}% • Joined: ${new Date(u.joinedAt).toLocaleDateString()}`,
        amount: `Total Commission Generated: PKR ${u.totalCommissionGenerated.toLocaleString()}`,
        date: u.joinedAt,
        status: `${u.dealsClosedCount} Deals Closed`
      }))
    });

    // Card 3: Referrals Amount (Commission from referred agents' sales)
    cards.push({
      id: 'referrals_amount',
      label: 'Referrals Amount',
      value: `PKR ${earningsData.referralEarnings.toLocaleString()}`,
      numericValue: earningsData.referralEarnings,
      subtext: `Earned from ${earningsData.itemizedReferrals.length} Referred Sales`,
      color: 'blue',
      drillDown: (earningsData.itemizedReferrals || []).map(item => ({
        id: item.saleId,
        title: item.clientName,
        subtitle: `Referred Agent: ${item.referredAgentName} • Deal: PKR ${item.totalSaleAmount.toLocaleString()} @ ${item.referralPercent}%`,
        amount: `Earned: PKR ${item.earnedAmount.toLocaleString()}`,
        date: item.closedAt,
        status: 'Referral Commission'
      }))
    });

    // ─── SALES AGENT METRICS ────────────────────────────────────────────────
    if (userRoles.includes('sales_agent')) {
      const existingSaleLeadIds = await Sale.distinct('leadId', { leadId: { $ne: null } });

      const [agentSales, agentFollowUps, agentProcessing] = await Promise.all([
        Sale.find({ leadGeneratedBy: user._id }).sort({ closedAt: -1 }).lean(),
        Lead.find({
          $or: [{ extractedBy: user._id }, { generatedBy: user._id }],
          callStatus: 'Follow Up'
        }).sort({ followUpDate: 1 }).lean(),
        Lead.find({
          $or: [{ generatedBy: user._id }, { extractedBy: user._id }],
          callStatus: { $in: ['Lead', 'Lead / Sale'] },
          _id: { $nin: existingSaleLeadIds }
        }).sort({ updatedAt: -1 }).lean()
      ]);

      cards.push({
        id: 'agent_sales',
        label: 'My Generated Sales',
        value: agentSales.length,
        numericValue: agentSales.length,
        subtext: `Total Deal Value: PKR ${agentSales.reduce((s, d) => s + (d.totalAmount || 0), 0).toLocaleString()}`,
        color: 'blue',
        drillDown: agentSales.map(s => ({
          id: s._id,
          title: s.customer?.businessName || 'Deal',
          subtitle: `Closed by ${s.closedByName}`,
          amount: `PKR ${s.totalAmount.toLocaleString()}`,
          date: s.closedAt,
          status: s.status
        }))
      });

      cards.push({
        id: 'agent_followups',
        label: 'My Sales Follow-Ups',
        value: agentFollowUps.length,
        numericValue: agentFollowUps.length,
        subtext: 'Scheduled Cold-Calling Callbacks',
        color: 'amber',
        drillDown: agentFollowUps.map(l => ({
          id: l._id,
          title: l.businessName,
          subtitle: `${l.area} • Phone: ${l.phoneNumber || 'N/A'}`,
          amount: l.followUpDate ? `Callback: ${new Date(l.followUpDate).toLocaleDateString()}` : 'Scheduled',
          date: l.updatedAt,
          status: 'Agent Follow Up'
        }))
      });

      cards.push({
        id: 'agent_processing',
        label: 'Qualified Leads in Processing',
        value: agentProcessing.length,
        numericValue: agentProcessing.length,
        subtext: 'Disposed as Lead (Awaiting Closer)',
        color: 'purple',
        drillDown: agentProcessing.slice(0, 50).map(l => ({
          id: l._id,
          title: l.businessName,
          subtitle: `${l.category} • ${l.area}`,
          amount: l.phoneNumber || 'No phone',
          date: l.updatedAt,
          status: 'Qualified Lead'
        }))
      });
    }

    // ─── SALES CLOSER METRICS ───────────────────────────────────────────────
    if (userRoles.includes('sales_closer')) {
      const closerFollowUpQuery = { callStatus: 'Closer Follow Up' };
      if (!isSuperAdmin) {
        closerFollowUpQuery.closerId = user._id;
      }

      const [closerSales, closerFollowUps, pendingPayments] = await Promise.all([
        Sale.find({ closedBy: user._id }).sort({ closedAt: -1 }).lean(),
        Lead.find(closerFollowUpQuery).sort({ closerFollowUpDate: 1, followUpDate: 1 }).lean(),
        Sale.find({ closedBy: user._id, status: { $ne: 'payment_completed' } }).populate('leadId', 'businessName').lean()
      ]);

      cards.push({
        id: 'closer_sales',
        label: 'Total Deals Closed (Closer)',
        value: closerSales.length,
        numericValue: closerSales.length,
        subtext: `Total Volume: PKR ${closerSales.reduce((s, d) => s + (d.totalAmount || 0), 0).toLocaleString()}`,
        color: 'blue',
        drillDown: closerSales.map(s => ({
          id: s._id,
          title: s.customer?.businessName || 'Deal',
          subtitle: `Lead Gen: ${s.leadGeneratedByName}`,
          amount: `PKR ${s.totalAmount.toLocaleString()}`,
          date: s.closedAt,
          status: s.status
        }))
      });

      cards.push({
        id: 'closer_followups',
        label: 'My Closer Follow-Ups',
        value: closerFollowUps.length,
        numericValue: closerFollowUps.length,
        subtext: 'Closing Callbacks in Queue',
        color: 'amber',
        drillDown: closerFollowUps.map(l => ({
          id: l._id,
          title: l.businessName,
          subtitle: `${l.area} • Phone: ${l.phoneNumber || 'N/A'}`,
          amount: (l.closerFollowUpDate || l.followUpDate) ? `Callback: ${new Date(l.closerFollowUpDate || l.followUpDate).toLocaleDateString()}` : 'Scheduled',
          date: l.updatedAt,
          status: 'Closer Follow Up'
        }))
      });

      cards.push({
        id: 'closer_pending_payments',
        label: 'Payments Pending Collection',
        value: pendingPayments.length,
        numericValue: pendingPayments.length,
        subtext: `PKR ${pendingPayments.reduce((s, d) => s + (d.remainingAmount || 0), 0).toLocaleString()} Remaining`,
        color: 'rose',
        drillDown: pendingPayments.map(s => ({
          id: s._id,
          title: s.customer?.businessName || 'Deal',
          subtitle: `Advance: PKR ${s.advanceAmount.toLocaleString()} • Dev: ${(s.assignedDeveloperNames || []).join(', ') || 'None'}`,
          amount: `Due: PKR ${s.remainingAmount.toLocaleString()}`,
          date: s.closedAt,
          status: s.status
        }))
      });
    }

    // ─── DEVELOPER METRICS ──────────────────────────────────────────────────
    if (userRoles.includes('developer')) {
      const [devActive, devCompleted] = await Promise.all([
        Project.find({ assignedDevelopers: user._id, status: 'active' }).populate('saleId', 'customer totalAmount').lean(),
        Project.find({ assignedDevelopers: user._id, status: 'completed' }).populate('saleId', 'customer totalAmount').lean()
      ]);

      cards.push({
        id: 'dev_active_projects',
        label: 'Active Assigned Projects',
        value: devActive.length,
        numericValue: devActive.length,
        subtext: 'Currently in Production',
        color: 'blue',
        drillDown: devActive.map(p => ({
          id: p._id,
          title: p.saleId?.customer?.businessName || 'Project',
          subtitle: `Client: ${p.saleId?.customer?.category || 'General'}`,
          amount: `Deal: PKR ${(p.saleId?.totalAmount || 0).toLocaleString()}`,
          date: p.createdAt,
          status: 'In Development'
        }))
      });

      cards.push({
        id: 'dev_completed_projects',
        label: 'Completed Projects',
        value: devCompleted.length,
        numericValue: devCompleted.length,
        subtext: 'Delivered Projects',
        color: 'emerald',
        drillDown: devCompleted.map(p => ({
          id: p._id,
          title: p.saleId?.customer?.businessName || 'Project',
          subtitle: `Delivered on ${p.completedAt ? new Date(p.completedAt).toLocaleDateString() : 'N/A'}`,
          amount: `Deal: PKR ${(p.saleId?.totalAmount || 0).toLocaleString()}`,
          date: p.completedAt || p.updatedAt,
          status: 'Delivered'
        }))
      });
    }

    res.json({
      success: true,
      data: {
        roles: userRoles,
        cards
      }
    });
  } catch (error) {
    console.error('[Dashboard Controller] getDashboardData error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
