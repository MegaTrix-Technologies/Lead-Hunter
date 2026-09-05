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

      const totalSalesAmt = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const totalExpenseAmt = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalProfit = totalSalesAmt - totalExpenseAmt;
      const totalRemainingAmt = pendingSales.reduce((sum, s) => sum + (s.remainingAmount || 0), 0);

      cards.push({
        id: 'total_sales',
        label: 'Total Sales Revenue',
        value: `PKR ${totalSalesAmt.toLocaleString()}`,
        numericValue: totalSalesAmt,
        subtext: `${sales.length} Closed Deals`,
        color: 'emerald',
        drillDown: sales.map(s => ({
          id: s._id,
          title: s.customer?.businessName || 'Deal',
          subtitle: `${s.customer?.area || ''} • Closed by ${s.closedByName}`,
          amount: `PKR ${s.totalAmount.toLocaleString()}`,
          date: s.closedAt,
          status: s.status
        }))
      });

      cards.push({
        id: 'total_profit',
        label: 'Net Operating Profit',
        value: `PKR ${totalProfit.toLocaleString()}`,
        numericValue: totalProfit,
        subtext: `Sales − Expenses (Margin: ${totalSalesAmt > 0 ? ((totalProfit / totalSalesAmt) * 100).toFixed(1) : 0}%)`,
        color: totalProfit >= 0 ? 'emerald' : 'rose',
        drillDown: [
          { id: 'rev', title: 'Total Sales Revenue', subtitle: `${sales.length} transactions`, amount: `PKR ${totalSalesAmt.toLocaleString()}`, status: 'Inflow' },
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

    // Shared Total Earnings card (Only show once even if multi-role)
    cards.push({
      id: 'my_earnings',
      label: 'My Total Earnings',
      value: `PKR ${earningsData.totalEarnings.toLocaleString()}`,
      numericValue: earningsData.totalEarnings,
      subtext: `${earningsData.dealsCount} Commissionable Closed Deals`,
      color: 'emerald',
      drillDown: earningsData.itemized.map(item => ({
        id: item.saleId,
        title: item.clientName,
        subtitle: (item.rolesEarned || []).map(r => `${r.role} (${r.percent}%)`).join(' + '),
        amount: `Earned: PKR ${item.dealEarnings.toLocaleString()}`,
        date: item.closedAt,
        status: 'Commission Credited'
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
        label: 'Active Follow Ups',
        value: agentFollowUps.length,
        numericValue: agentFollowUps.length,
        subtext: 'Scheduled Prospect Callbacks',
        color: 'amber',
        drillDown: agentFollowUps.map(l => ({
          id: l._id,
          title: l.businessName,
          subtitle: `${l.area} • Phone: ${l.phoneNumber || 'N/A'}`,
          amount: l.followUpDate ? `Callback: ${new Date(l.followUpDate).toLocaleDateString()}` : 'Scheduled',
          date: l.updatedAt,
          status: 'Follow Up'
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
      const [closerSales, closerFollowUps, pendingPayments] = await Promise.all([
        Sale.find({ closedBy: user._id }).sort({ closedAt: -1 }).lean(),
        Lead.find({ callStatus: 'Follow Up' }).sort({ followUpDate: 1 }).lean(),
        Sale.find({ closedBy: user._id, status: { $ne: 'payment_completed' } }).populate('leadId', 'businessName').lean()
      ]);

      if (!userRoles.includes('sales_agent')) {
        cards.push({
          id: 'closer_sales',
          label: 'Total Deals Closed',
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
          label: 'Active Follow Ups',
          value: closerFollowUps.length,
          numericValue: closerFollowUps.length,
          subtext: 'Callbacks in Queue',
          color: 'amber',
          drillDown: closerFollowUps.map(l => ({
            id: l._id,
            title: l.businessName,
            subtitle: `${l.area} • Phone: ${l.phoneNumber || 'N/A'}`,
            amount: l.followUpDate ? `Callback: ${new Date(l.followUpDate).toLocaleDateString()}` : 'Scheduled',
            date: l.updatedAt,
            status: 'Follow Up'
          }))
        });
      }

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
