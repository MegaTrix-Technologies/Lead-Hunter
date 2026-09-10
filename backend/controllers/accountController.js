const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const Inflow = require('../models/Inflow');
const Project = require('../models/Project');
const User = require('../models/User');
const accountReportService = require('../services/accountReportService');

/**
 * Utility: Compute date range boundaries from preset or custom query params
 */
const resolveDateRange = (preset, customStart, customEnd) => {
  const now = new Date();
  let start = new Date();
  let end = new Date(now);
  let label = 'Custom Period';

  switch (preset) {
    case 'this_month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      label = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      break;
    }
    case 'last_month': {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      label = start.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      break;
    }
    case 'this_quarter': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
      label = `Q${currentQuarter + 1} ${now.getFullYear()}`;
      break;
    }
    case 'this_year': {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      label = `Year ${now.getFullYear()}`;
      break;
    }
    case 'all_time': {
      start = new Date('2020-01-01T00:00:00.000Z');
      label = 'All Time';
      break;
    }
    case 'custom':
    default: {
      if (customStart) {
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      }
      if (customEnd) {
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
      } else {
        end = new Date(now);
      }
      label = `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`;
      break;
    }
  }

  return { start, end, label };
};

/**
 * GET /api/accounts/summary
 * Consolidated financial P&L summary, trend timeline, and category distributions
 */
exports.getAccountsSummary = async (req, res) => {
  try {
    const { preset = 'this_month', startDate, endDate } = req.query;
    const { start, end, label } = resolveDateRange(preset, startDate, endDate);

    // 1. Aggregate Sales from Sale model (Dual Basis: Cash Realized vs. Booked Contract)
    const salesAgg = await Sale.aggregate([
      {
        $match: {
          closedAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          bookedSales: { $sum: '$totalAmount' },
          realizedSales: { $sum: '$advanceAmount' },
          pendingReceivables: { $sum: '$remainingAmount' },
          count: { $sum: 1 },
          avgDealSize: { $avg: '$totalAmount' },
          avgCashCollected: { $avg: '$advanceAmount' }
        }
      }
    ]);

    const bookedSales = salesAgg[0]?.bookedSales || 0;
    const realizedSales = salesAgg[0]?.realizedSales || 0;
    const pendingReceivables = salesAgg[0]?.pendingReceivables || 0;
    const salesCount = salesAgg[0]?.count || 0;
    const avgDealSize = Math.round(salesAgg[0]?.avgDealSize || 0);
    const avgCashCollected = Math.round(salesAgg[0]?.avgCashCollected || 0);

    // 2. Aggregate Non-Sale Direct Inflows (Investments, Other Incomes, etc.)
    const inflowsAgg = await Inflow.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    let totalInvestment = 0;
    let totalOtherIncome = 0;
    let totalMilestoneInflow = 0;
    let totalInflowCount = 0;

    inflowsAgg.forEach(item => {
      totalInflowCount += item.count;
      if (item._id === 'investment') totalInvestment += item.totalAmount;
      else if (item._id === 'other_income') totalOtherIncome += item.totalAmount;
      else if (item._id === 'project_payment') totalMilestoneInflow += item.totalAmount;
    });

    // Sales by Customer Category (Cash Inflow & Booked Values)
    const salesByCategory = await Sale.aggregate([
      {
        $match: {
          closedAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $ifNull: ['$customer.category', 'General'] },
          amount: { $sum: '$advanceAmount' },
          bookedAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { amount: -1 } },
      {
        $project: {
          category: '$_id',
          amount: 1,
          bookedAmount: 1,
          count: 1,
          _id: 0
        }
      }
    ]);

    // Inflows by Category
    const inflowsByCategory = await Inflow.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { amount: -1 } },
      {
        $project: {
          category: '$_id',
          amount: 1,
          count: 1,
          _id: 0
        }
      }
    ]);

    // 3. Aggregate Expenses from Expense model
    const expensesAgg = await Expense.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' },
          count: { $sum: 1 },
          avgExpense: { $avg: '$amount' }
        }
      }
    ]);

    const totalExpenses = expensesAgg[0]?.totalExpenses || 0;
    const expenseCount = expensesAgg[0]?.count || 0;
    const avgExpense = Math.round(expensesAgg[0]?.avgExpense || 0);

    // Expenses by Category
    const expensesByCategory = await Expense.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $ifNull: ['$category', 'Miscellaneous'] },
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { amount: -1 } },
      {
        $project: {
          category: '$_id',
          amount: 1,
          count: 1,
          _id: 0
        }
      }
    ]);

    // 4. Compute Net Profit & Margin (Dual Basis)
    // Cash Operating Basis: Realized Sales Inflow + Other Operating Income - Expenses
    const effectiveOperatingInflow = realizedSales + totalOtherIncome;
    const realizedNetProfit = effectiveOperatingInflow - totalExpenses;
    const realizedProfitMargin = effectiveOperatingInflow > 0 ? parseFloat(((realizedNetProfit / effectiveOperatingInflow) * 100).toFixed(1)) : 0;

    // Total Net Cash Flow (including capital injections)
    const totalCashInflow = realizedSales + totalInvestment + totalOtherIncome;
    const netCashFlow = totalCashInflow - totalExpenses;

    // Accrual Basis (Contract Bookings + Other Income)
    const effectiveBookedRevenue = bookedSales + totalOtherIncome;
    const projectedNetProfit = effectiveBookedRevenue - totalExpenses;
    const projectedProfitMargin = effectiveBookedRevenue > 0 ? parseFloat(((projectedNetProfit / effectiveBookedRevenue) * 100).toFixed(1)) : 0;

    // 5. Generate Trend Timeline with Realtime High-Resolution Granularity
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const groupByFormat = diffDays <= 45 ? '%Y-%m-%d' : '%Y-%m';

    const salesTimeline = await Sale.aggregate([
      {
        $match: {
          closedAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: '$closedAt' } },
          sales: { $sum: '$advanceAmount' },
          realizedSales: { $sum: '$advanceAmount' },
          bookedSales: { $sum: '$totalAmount' }
        }
      }
    ]);

    const inflowsTimeline = await Inflow.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: '$date' } },
          investment: {
            $sum: { $cond: [{ $eq: ['$type', 'investment'] }, '$amount', 0] }
          },
          otherIncome: {
            $sum: { $cond: [{ $eq: ['$type', 'other_income'] }, '$amount', 0] }
          },
          projectPayments: {
            $sum: { $cond: [{ $eq: ['$type', 'project_payment'] }, '$amount', 0] }
          },
          totalInflow: { $sum: '$amount' }
        }
      }
    ]);

    const expensesTimeline = await Expense.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: '$date' } },
          expenses: { $sum: '$amount' }
        }
      }
    ]);

    // Combine Timeline Points
    const timelineMap = {};

    salesTimeline.forEach(item => {
      timelineMap[item._id] = {
        period: item._id,
        sales: item.sales,
        realizedSales: item.realizedSales,
        bookedSales: item.bookedSales,
        investments: 0,
        otherIncome: 0,
        totalInflow: item.sales,
        expenses: 0,
        netProfit: item.sales
      };
    });

    inflowsTimeline.forEach(item => {
      if (!timelineMap[item._id]) {
        timelineMap[item._id] = {
          period: item._id,
          sales: item.otherIncome,
          realizedSales: item.otherIncome,
          bookedSales: item.otherIncome,
          investments: item.investment,
          otherIncome: item.otherIncome,
          totalInflow: item.totalInflow,
          expenses: 0,
          netProfit: item.otherIncome
        };
      } else {
        timelineMap[item._id].investments += item.investment;
        timelineMap[item._id].otherIncome += item.otherIncome;
        timelineMap[item._id].sales += item.otherIncome;
        timelineMap[item._id].realizedSales += item.otherIncome;
        timelineMap[item._id].bookedSales += item.otherIncome;
        timelineMap[item._id].totalInflow += item.investment + item.otherIncome;
        timelineMap[item._id].netProfit = (timelineMap[item._id].sales) - timelineMap[item._id].expenses;
      }
    });

    expensesTimeline.forEach(item => {
      if (!timelineMap[item._id]) {
        timelineMap[item._id] = {
          period: item._id,
          sales: 0,
          realizedSales: 0,
          bookedSales: 0,
          investments: 0,
          otherIncome: 0,
          totalInflow: 0,
          expenses: item.expenses,
          netProfit: -item.expenses
        };
      } else {
        timelineMap[item._id].expenses = item.expenses;
        timelineMap[item._id].netProfit = (timelineMap[item._id].sales) - item.expenses;
      }
    });

    const trend = Object.values(timelineMap).sort((a, b) => a.period.localeCompare(b.period));

    res.json({
      success: true,
      data: {
        period: {
          preset,
          label,
          startDate: start.toISOString(),
          endDate: end.toISOString()
        },
        summary: {
          // Cash Basis (Realized Inflow)
          realizedSales,
          totalOtherIncome,
          totalInvestment,
          totalMilestoneInflow,
          totalCashInflow,
          netCashFlow,
          realizedNetProfit,
          realizedProfitMargin,
          avgCashCollected,

          // Accrual / Booked Pipeline Basis
          bookedSales,
          projectedNetProfit,
          projectedProfitMargin,
          pendingReceivables,
          avgDealSize,

          // Backward-compatible aliases (defaults to Cash Basis)
          totalSales: realizedSales + totalOtherIncome,
          netProfit: realizedNetProfit,
          profitMargin: realizedProfitMargin,

          salesCount,
          inflowCount: totalInflowCount,
          totalExpenses,
          expenseCount,
          avgExpense,
          salesByCategory,
          inflowsByCategory,
          expensesByCategory
        },
        trend
      }
    });
  } catch (error) {
    console.error('[AccountController] getAccountsSummary error:', error);
    res.status(500).json({ success: false, message: 'Failed to aggregate accounts financial summary.' });
  }
};

/**
 * GET /api/accounts/pending-sales
 * Returns active projects and sales with outstanding pending balances (remainingAmount > 0)
 */
exports.getPendingSales = async (req, res) => {
  try {
    const pendingSales = await Sale.find({ remainingAmount: { $gt: 0 } })
      .sort({ closedAt: -1 })
      .select('customer totalAmount advanceAmount remainingAmount status closedByName closedAt')
      .lean();

    const formatted = pendingSales.map(s => ({
      id: s._id,
      businessName: s.customer?.businessName || 'Client Project',
      phoneNumber: s.customer?.phoneNumber || '',
      category: s.customer?.category || 'General',
      area: s.customer?.area || 'Lahore',
      totalAmount: s.totalAmount || 0,
      advanceAmount: s.advanceAmount || 0,
      remainingAmount: s.remainingAmount || 0,
      status: s.status,
      closedByName: s.closedByName || 'Super Admin',
      closedAt: s.closedAt
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    console.error('[AccountController] getPendingSales error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending receivable orders.' });
  }
};

/**
 * POST /api/accounts/inflows
 * Record an Inflow: Project Milestone/Partial Payment, Investment Capital, or Other Income
 */
exports.createInflow = async (req, res) => {
  try {
    const {
      type,
      sourceName,
      category,
      amount,
      currency = 'PKR',
      date,
      paymentMethod = 'Bank Transfer',
      referenceId,
      description,
      saleId
    } = req.body;

    if (!type || !['project_payment', 'investment', 'other_income'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid inflow type. Must be project_payment, investment, or other_income.'
      });
    }

    const cleanAmount = parseFloat(amount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
    }

    let resolvedSourceName = sourceName ? sourceName.trim() : '';
    let resolvedCategory = category || 'Miscellaneous Income';
    let targetSale = null;

    if (type === 'project_payment') {
      if (!saleId) {
        return res.status(400).json({
          success: false,
          message: 'Target project / sale ID is required for recording partial milestone payments.'
        });
      }

      targetSale = await Sale.findById(saleId);
      if (!targetSale) {
        return res.status(404).json({ success: false, message: 'Selected sale or project order not found.' });
      }

      if (cleanAmount > targetSale.remainingAmount) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (PKR ${cleanAmount.toLocaleString()}) exceeds remaining order balance (PKR ${targetSale.remainingAmount.toLocaleString()}).`
        });
      }

      resolvedSourceName = targetSale.customer?.businessName || 'Client Project';
      resolvedCategory = 'Project Milestone Payment';

      // Decrement sale remaining balance & update advance/realized cash
      targetSale.advanceAmount = (targetSale.advanceAmount || 0) + cleanAmount;
      targetSale.remainingAmount = Math.max(0, targetSale.totalAmount - targetSale.advanceAmount);

      const isFullyPaid = targetSale.remainingAmount === 0;
      if (isFullyPaid) {
        targetSale.paymentCompletedAt = new Date();
        // Check if project is delivered
        if (targetSale.isProjectDelivered) {
          targetSale.status = 'payment_completed';
        }
      }

      // Append note to Sale
      const paymentLogMsg = `[Inflow Payment: PKR ${cleanAmount.toLocaleString()} via ${paymentMethod}${referenceId ? ` - Ref: ${referenceId.trim()}` : ''} on ${new Date().toLocaleDateString()}]`;
      targetSale.notes = targetSale.notes ? `${targetSale.notes}\n${paymentLogMsg}` : paymentLogMsg;

      await targetSale.save();

      // Append delivery note to linked Project if present
      if (targetSale.projectId) {
        const linkedProject = await Project.findById(targetSale.projectId);
        if (linkedProject) {
          linkedProject.deliveryNotes.push({
            note: `Milestone payment received: PKR ${cleanAmount.toLocaleString()} (${paymentMethod}). Remaining balance: PKR ${targetSale.remainingAmount.toLocaleString()}${isFullyPaid ? ' — (Order Fully Paid!)' : ''}`,
            author: req.user.name,
            authorId: req.user._id,
            timestamp: new Date()
          });
          await linkedProject.save();
        }
      }
    } else if (type === 'investment') {
      if (!resolvedSourceName) resolvedSourceName = 'Investor Capital';
      resolvedCategory = category || 'Direct Capital Investment';
    } else if (type === 'other_income') {
      if (!resolvedSourceName) resolvedSourceName = 'Income Source';
      resolvedCategory = category || 'Consultancy Services';
    }

    const inflow = await Inflow.create({
      type,
      sourceName: resolvedSourceName,
      category: resolvedCategory,
      amount: cleanAmount,
      currency,
      date: date ? new Date(date) : new Date(),
      paymentMethod,
      referenceId: referenceId ? referenceId.trim() : '',
      description: description ? description.trim() : '',
      saleId: type === 'project_payment' ? targetSale?._id : null,
      createdBy: req.user._id,
      createdByName: req.user.name
    });

    res.status(201).json({
      success: true,
      message: type === 'project_payment'
        ? `Partial payment of PKR ${cleanAmount.toLocaleString()} recorded. Remaining balance for "${resolvedSourceName}" updated to PKR ${targetSale.remainingAmount.toLocaleString()}.`
        : `Inflow of PKR ${cleanAmount.toLocaleString()} (${resolvedCategory}) successfully logged.`,
      data: inflow
    });
  } catch (error) {
    console.error('[AccountController] createInflow error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/accounts/inflows
 * Paginated list of all recorded Inflows (milestone payments, capital investments, other income)
 */
exports.getInflowsLedger = async (req, res) => {
  try {
    const { preset = 'this_month', startDate, endDate, type, search, page = 1, limit = 15 } = req.query;
    const { start, end } = resolveDateRange(preset, startDate, endDate);

    const filter = {
      date: { $gte: start, $lte: end }
    };

    if (type && type !== 'all') {
      filter.type = type;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { sourceName: regex },
        { category: regex },
        { referenceId: regex },
        { description: regex }
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const [totalInflows, inflows] = await Promise.all([
      Inflow.countDocuments(filter),
      Inflow.find(filter)
        .sort({ date: -1 })
        .populate('saleId', 'customer totalAmount remainingAmount status')
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    res.json({
      success: true,
      data: inflows,
      pagination: {
        total: totalInflows,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalInflows / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('[AccountController] getInflowsLedger error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve inflows ledger.' });
  }
};

/**
 * DELETE /api/accounts/inflows/:id
 * Remove an Inflow and revert associated sale remaining balance if project payment
 */
exports.deleteInflow = async (req, res) => {
  try {
    const { id } = req.params;
    const inflow = await Inflow.findById(id);
    if (!inflow) {
      return res.status(404).json({ success: false, message: 'Inflow record not found.' });
    }

    // Revert target sale balance if this was a project payment
    if (inflow.type === 'project_payment' && inflow.saleId) {
      const sale = await Sale.findById(inflow.saleId);
      if (sale) {
        sale.advanceAmount = Math.max(0, (sale.advanceAmount || 0) - inflow.amount);
        sale.remainingAmount = Math.max(0, sale.totalAmount - sale.advanceAmount);
        if (sale.remainingAmount > 0 && sale.status === 'payment_completed') {
          sale.status = sale.advanceAmount > 0 ? 'advance_paid' : 'project_active';
          sale.paymentCompletedAt = null;
        }
        await sale.save();
      }
    }

    await Inflow.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Inflow transaction removed and associated order balance reverted.'
    });
  } catch (error) {
    console.error('[AccountController] deleteInflow error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/accounts/sales
 * Paginated sales records for the selected period from Sale model
 */
exports.getSalesLedger = async (req, res) => {
  try {
    const { preset = 'this_month', startDate, endDate, category, search, page = 1, limit = 15 } = req.query;
    const { start, end } = resolveDateRange(preset, startDate, endDate);

    const filter = {
      closedAt: { $gte: start, $lte: end }
    };

    if (category && category !== 'all') {
      filter['customer.category'] = category;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { 'customer.businessName': regex },
        { 'customer.area': regex },
        { closedByName: regex },
        { leadGeneratedByName: regex }
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const [totalSales, sales] = await Promise.all([
      Sale.countDocuments(filter),
      Sale.find(filter)
        .sort({ closedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    const formattedSales = sales.map(s => ({
      id: s._id,
      date: s.closedAt,
      businessName: s.customer?.businessName || 'Client',
      category: s.customer?.category || 'General',
      area: s.customer?.area || 'Lahore',
      dealValue: s.totalAmount || 0,
      advanceAmount: s.advanceAmount || 0,
      remainingAmount: s.remainingAmount || 0,
      status: s.status,
      interestedProducts: s.products || [],
      extractedByName: s.leadGeneratedByName || 'Sales Agent',
      closedByName: s.closedByName || 'Super Admin',
      assignedDeveloperNames: s.assignedDeveloperNames || [],
      phoneNumber: s.customer?.phoneNumber || '',
      email: s.customer?.email || ''
    }));

    res.json({
      success: true,
      data: formattedSales,
      pagination: {
        total: totalSales,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalSales / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('[AccountController] getSalesLedger error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve sales ledger.' });
  }
};

/**
 * GET /api/accounts/expenses
 * Paginated expense records for the selected period
 */
exports.getExpensesLedger = async (req, res) => {
  try {
    const { preset = 'this_month', startDate, endDate, category, search, page = 1, limit = 15 } = req.query;
    const { start, end } = resolveDateRange(preset, startDate, endDate);

    const filter = {
      date: { $gte: start, $lte: end }
    };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { reason: regex },
        { description: regex },
        { referenceId: regex },
        { category: regex }
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const [totalExpenses, expenses] = await Promise.all([
      Expense.countDocuments(filter),
      Expense.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    res.json({
      success: true,
      data: expenses,
      pagination: {
        total: totalExpenses,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalExpenses / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('[AccountController] getExpensesLedger error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve expenses ledger.' });
  }
};

/**
 * POST /api/accounts/expenses
 * Super Admin adds an expense record
 */
exports.createExpense = async (req, res) => {
  try {
    const { reason, recurrence, description, amount, date, category, paymentMethod, referenceId } = req.body;

    if (!reason || !amount) {
      return res.status(400).json({ success: false, message: 'Reason and amount are required.' });
    }

    const cleanAmount = parseFloat(amount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
    }

    const expense = await Expense.create({
      reason: reason.trim(),
      recurrence: recurrence || 'one_time',
      description: description ? description.trim() : reason.trim(),
      amount: cleanAmount,
      date: date ? new Date(date) : new Date(),
      category: category || 'Miscellaneous',
      paymentMethod: paymentMethod || 'Bank Transfer',
      referenceId: referenceId ? referenceId.trim() : '',
      createdBy: req.user._id,
      createdByName: req.user.name
    });

    res.status(201).json({
      success: true,
      message: 'Expense record successfully created.',
      data: expense
    });
  } catch (error) {
    console.error('[AccountController] createExpense error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/accounts/expenses/:id
 * Super Admin updates an expense
 */
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, recurrence, description, amount, date, category, paymentMethod, referenceId } = req.body;

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found.' });
    }

    if (reason) expense.reason = reason.trim();
    if (recurrence) expense.recurrence = recurrence;
    if (description !== undefined) expense.description = description.trim();
    if (amount !== undefined) expense.amount = parseFloat(amount);
    if (date) expense.date = new Date(date);
    if (category) expense.category = category;
    if (paymentMethod) expense.paymentMethod = paymentMethod;
    if (referenceId !== undefined) expense.referenceId = referenceId.trim();

    await expense.save();

    res.json({
      success: true,
      message: 'Expense record updated.',
      data: expense
    });
  } catch (error) {
    console.error('[AccountController] updateExpense error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/accounts/expenses/:id
 * Super Admin removes an expense record
 */
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found.' });
    }

    res.json({
      success: true,
      message: 'Expense record deleted.'
    });
  } catch (error) {
    console.error('[AccountController] deleteExpense error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/accounts/report
 * Structured executive financial report
 */
exports.getAccountsReport = async (req, res) => {
  try {
    const { preset = 'this_month', startDate, endDate } = req.query;
    const { start, end, label } = resolveDateRange(preset, startDate, endDate);

    const [salesAgg, inflowsAgg, expensesAgg, salesByCategory, expensesByCategory, recentSales, topExpenses] = await Promise.all([
      Sale.aggregate([
        { $match: { closedAt: { $gte: start, $lte: end } } },
        { 
          $group: { 
            _id: null, 
            bookedSales: { $sum: '$totalAmount' },
            realizedSales: { $sum: '$advanceAmount' },
            pendingReceivables: { $sum: '$remainingAmount' },
            count: { $sum: 1 } 
          } 
        }
      ]),
      Inflow.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: null, totalExpenses: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Sale.aggregate([
        { $match: { closedAt: { $gte: start, $lte: end } } },
        { 
          $group: { 
            _id: { $ifNull: ['$customer.category', 'General'] }, 
            amount: { $sum: '$advanceAmount' },
            bookedAmount: { $sum: '$totalAmount' },
            count: { $sum: 1 } 
          } 
        },
        { $sort: { amount: -1 } }
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: '$category', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { amount: -1 } }
      ]),
      Sale.find({ closedAt: { $gte: start, $lte: end } })
        .sort({ closedAt: -1 })
        .limit(20)
        .lean(),
      Expense.find({ date: { $gte: start, $lte: end } })
        .sort({ amount: -1 })
        .limit(20)
        .lean()
    ]);

    const bookedSales = salesAgg[0]?.bookedSales || 0;
    const realizedSales = salesAgg[0]?.realizedSales || 0;
    const pendingReceivables = salesAgg[0]?.pendingReceivables || 0;
    const totalExpenses = expensesAgg[0]?.totalExpenses || 0;
    const salesCount = salesAgg[0]?.count || 0;
    const expenseCount = expensesAgg[0]?.count || 0;

    let otherIncome = 0;
    let investments = 0;
    inflowsAgg.forEach(i => {
      if (i._id === 'other_income') otherIncome += i.totalAmount;
      if (i._id === 'investment') investments += i.totalAmount;
    });

    const realizedNetProfit = (realizedSales + otherIncome) - totalExpenses;
    const realizedProfitMargin = (realizedSales + otherIncome) > 0 ? parseFloat(((realizedNetProfit / (realizedSales + otherIncome)) * 100).toFixed(1)) : 0;
    const projectedNetProfit = (bookedSales + otherIncome) - totalExpenses;
    const projectedProfitMargin = (bookedSales + otherIncome) > 0 ? parseFloat(((projectedNetProfit / (bookedSales + otherIncome)) * 100).toFixed(1)) : 0;

    res.json({
      success: true,
      data: {
        meta: {
          periodLabel: label,
          generatedAt: new Date().toISOString(),
          currency: 'PKR',
          author: 'MegaTrix Financial Management'
        },
        kpis: {
          realizedSales,
          otherIncome,
          investments,
          bookedSales,
          pendingReceivables,
          realizedNetProfit,
          realizedProfitMargin,
          projectedNetProfit,
          projectedProfitMargin,
          totalSales: realizedSales + otherIncome,
          totalExpenses,
          netProfit: realizedNetProfit,
          profitMargin: realizedProfitMargin,
          salesCount,
          expenseCount
        },
        breakdowns: {
          salesByCategory: salesByCategory.map(s => ({ category: s._id, amount: s.amount, bookedAmount: s.bookedAmount, count: s.count })),
          expensesByCategory: expensesByCategory.map(e => ({ category: e._id, amount: e.amount, count: e.count }))
        },
        itemized: {
          recentSales: recentSales.map(s => ({
            businessName: s.customer?.businessName,
            category: s.customer?.category,
            area: s.customer?.area,
            dealValue: s.totalAmount,
            advanceAmount: s.advanceAmount,
            remainingAmount: s.remainingAmount,
            status: s.status,
            interestedProducts: s.products,
            extractedByName: s.leadGeneratedByName,
            closedByName: s.closedByName,
            updatedAt: s.closedAt
          })),
          topExpenses
        }
      }
    });
  } catch (error) {
    console.error('[AccountController] getAccountsReport error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate financial report.' });
  }
};

/**
 * GET /api/accounts/export-excel
 * Stream formatted multi-tab .xlsx workbook
 */
exports.exportAccountsExcel = async (req, res) => {
  try {
    const { preset = 'this_month', startDate, endDate } = req.query;
    const { start, end, label } = resolveDateRange(preset, startDate, endDate);

    const [sales, expenses, salesAgg, expensesAgg, expByCat] = await Promise.all([
      Sale.find({ closedAt: { $gte: start, $lte: end } }).sort({ closedAt: -1 }).lean(),
      Expense.find({ date: { $gte: start, $lte: end } }).sort({ date: -1 }).lean(),
      Sale.aggregate([
        { $match: { closedAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: '$category', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { amount: -1 } }
      ])
    ]);

    const totalSales = salesAgg[0]?.total || 0;
    const totalExpenses = expensesAgg[0]?.total || 0;
    const netProfit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0.0';

    const formattedSales = sales.map(s => ({
      date: s.closedAt,
      businessName: s.customer?.businessName || 'Client',
      category: s.customer?.category || 'General',
      area: s.customer?.area || 'Lahore',
      extractedByName: s.leadGeneratedByName || 'Sales Agent',
      closedByName: s.closedByName || 'Super Admin',
      interestedProducts: s.products || [],
      dealValue: s.totalAmount || 0,
      advanceAmount: s.advanceAmount || 0,
      remainingAmount: s.remainingAmount || 0
    }));

    await accountReportService.generateExcelWorkbook({
      periodLabel: label,
      summary: {
        totalSales,
        salesCount: sales.length,
        totalExpenses,
        expenseCount: expenses.length,
        netProfit,
        profitMargin,
        expensesByCategory: expByCat.map(c => ({ category: c._id, amount: c.amount, count: c.count }))
      },
      sales: formattedSales,
      expenses
    }, res);
  } catch (error) {
    console.error('[AccountController] exportAccountsExcel error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to export Excel report.' });
    }
  }
};

/**
 * GET /api/accounts/export-pdf
 * Stream executive PDF financial report
 */
exports.exportAccountsPdf = async (req, res) => {
  try {
    const { preset = 'this_month', startDate, endDate } = req.query;
    const { start, end, label } = resolveDateRange(preset, startDate, endDate);

    const [sales, expenses, salesAgg, expensesAgg, expByCat] = await Promise.all([
      Sale.find({ closedAt: { $gte: start, $lte: end } }).sort({ closedAt: -1 }).lean(),
      Expense.find({ date: { $gte: start, $lte: end } }).sort({ date: -1 }).lean(),
      Sale.aggregate([
        { $match: { closedAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: '$category', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { amount: -1 } }
      ])
    ]);

    const totalSales = salesAgg[0]?.total || 0;
    const totalExpenses = expensesAgg[0]?.total || 0;
    const netProfit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0.0';

    const formattedSales = sales.map(s => ({
      date: s.closedAt,
      businessName: s.customer?.businessName || 'Client',
      category: s.customer?.category || 'General',
      area: s.customer?.area || 'Lahore',
      extractedByName: s.leadGeneratedByName || 'Sales Agent',
      dealValue: s.totalAmount || 0,
      advanceAmount: s.advanceAmount || 0,
      remainingAmount: s.remainingAmount || 0
    }));

    await accountReportService.generatePdfReport({
      periodLabel: label,
      summary: {
        totalSales,
        salesCount: sales.length,
        totalExpenses,
        expenseCount: expenses.length,
        netProfit,
        profitMargin,
        expensesByCategory: expByCat.map(c => ({ category: c._id, amount: c.amount, count: c.count }))
      },
      sales: formattedSales,
      expenses
    }, res);
  } catch (error) {
    console.error('[AccountController] exportAccountsPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to export PDF dossier.' });
    }
  }
};
