const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Expense = require('../models/Expense');
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

    // 1. Aggregate Sales from Leads with callStatus === 'Lead / Sale'
    const salesAgg = await Lead.aggregate([
      {
        $match: {
          callStatus: 'Lead / Sale',
          updatedAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: { $ifNull: ['$dealValue', 0] } },
          count: { $sum: 1 },
          avgDealSize: { $avg: { $ifNull: ['$dealValue', 0] } }
        }
      }
    ]);

    const totalSales = salesAgg[0]?.totalSales || 0;
    const salesCount = salesAgg[0]?.count || 0;
    const avgDealSize = Math.round(salesAgg[0]?.avgDealSize || 0);

    // Sales by Category
    const salesByCategory = await Lead.aggregate([
      {
        $match: {
          callStatus: 'Lead / Sale',
          updatedAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$category',
          amount: { $sum: { $ifNull: ['$dealValue', 0] } },
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

    // 2. Aggregate Expenses from Expense model
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

    // 3. Compute Net Profit & Margin
    const netProfit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? parseFloat(((netProfit / totalSales) * 100).toFixed(1)) : 0;

    // 4. Generate Trend Timeline (Group by Day if range <= 45 days, otherwise Month)
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const groupByFormat = diffDays <= 45 ? '%Y-%m-%d' : '%Y-%m';

    const salesTimeline = await Lead.aggregate([
      {
        $match: {
          callStatus: 'Lead / Sale',
          updatedAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: '$updatedAt' } },
          sales: { $sum: { $ifNull: ['$dealValue', 0] } }
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
      timelineMap[item._id] = { period: item._id, sales: item.sales, expenses: 0, netProfit: item.sales };
    });
    expensesTimeline.forEach(item => {
      if (!timelineMap[item._id]) {
        timelineMap[item._id] = { period: item._id, sales: 0, expenses: item.expenses, netProfit: -item.expenses };
      } else {
        timelineMap[item._id].expenses = item.expenses;
        timelineMap[item._id].netProfit = timelineMap[item._id].sales - item.expenses;
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
          totalSales,
          salesCount,
          avgDealSize,
          totalExpenses,
          expenseCount,
          avgExpense,
          netProfit,
          profitMargin,
          salesByCategory,
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
 * GET /api/accounts/sales
 * Paginated sales records for the selected period
 */
exports.getSalesLedger = async (req, res) => {
  try {
    const { preset = 'this_month', startDate, endDate, category, search, page = 1, limit = 15 } = req.query;
    const { start, end } = resolveDateRange(preset, startDate, endDate);

    const filter = {
      callStatus: 'Lead / Sale',
      updatedAt: { $gte: start, $lte: end }
    };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { area: { $regex: search, $options: 'i' } },
        { extractedByName: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const [totalSales, sales] = await Promise.all([
      Lead.countDocuments(filter),
      Lead.find(filter)
        .select('businessName category area dealValue interestedProducts extractedByName updatedAt phoneNumber email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    const formattedSales = sales.map(s => ({
      id: s._id,
      date: s.updatedAt,
      businessName: s.businessName,
      category: s.category,
      area: s.area,
      dealValue: s.dealValue || 0,
      interestedProducts: s.interestedProducts || [],
      extractedByName: s.extractedByName || 'Sales Desk',
      phoneNumber: s.phoneNumber || '',
      email: s.email || ''
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
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { referenceId: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
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
 * GET /api/accounts/report
 * Structured on-screen printable executive financial report
 */
exports.getAccountsReport = async (req, res) => {
  try {
    const { preset = 'this_month', startDate, endDate } = req.query;
    const { start, end, label } = resolveDateRange(preset, startDate, endDate);

    // Fetch summary
    const [salesAgg, expensesAgg, salesByCategory, expensesByCategory, recentSales, topExpenses] = await Promise.all([
      Lead.aggregate([
        { $match: { callStatus: 'Lead / Sale', updatedAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, totalSales: { $sum: { $ifNull: ['$dealValue', 0] } }, count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: null, totalExpenses: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: { callStatus: 'Lead / Sale', updatedAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$category', amount: { $sum: { $ifNull: ['$dealValue', 0] } }, count: { $sum: 1 } } },
        { $sort: { amount: -1 } }
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: '$category', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { amount: -1 } }
      ]),
      Lead.find({ callStatus: 'Lead / Sale', updatedAt: { $gte: start, $lte: end } })
        .select('businessName category area dealValue interestedProducts extractedByName updatedAt')
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean(),
      Expense.find({ date: { $gte: start, $lte: end } })
        .sort({ amount: -1 })
        .limit(20)
        .lean()
    ]);

    const totalSales = salesAgg[0]?.totalSales || 0;
    const totalExpenses = expensesAgg[0]?.totalExpenses || 0;
    const salesCount = salesAgg[0]?.count || 0;
    const expenseCount = expensesAgg[0]?.count || 0;
    const netProfit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? parseFloat(((netProfit / totalSales) * 100).toFixed(1)) : 0;

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
          totalSales,
          totalExpenses,
          netProfit,
          profitMargin,
          salesCount,
          expenseCount
        },
        breakdowns: {
          salesByCategory: salesByCategory.map(s => ({ category: s._id, amount: s.amount, count: s.count })),
          expensesByCategory: expensesByCategory.map(e => ({ category: e._id, amount: e.amount, count: e.count }))
        },
        itemized: {
          recentSales,
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

    // Fetch full dataset for the period
    const [sales, expenses, salesAgg, expensesAgg, expByCat] = await Promise.all([
      Lead.find({ callStatus: 'Lead / Sale', updatedAt: { $gte: start, $lte: end } })
        .select('businessName category area dealValue interestedProducts extractedByName updatedAt')
        .sort({ updatedAt: -1 })
        .lean(),
      Expense.find({ date: { $gte: start, $lte: end } })
        .sort({ date: -1 })
        .lean(),
      Lead.aggregate([
        { $match: { callStatus: 'Lead / Sale', updatedAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$dealValue', 0] } } } }
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
      date: s.updatedAt,
      businessName: s.businessName,
      category: s.category,
      area: s.area,
      extractedByName: s.extractedByName,
      interestedProducts: s.interestedProducts || [],
      dealValue: s.dealValue || 0
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
      Lead.find({ callStatus: 'Lead / Sale', updatedAt: { $gte: start, $lte: end } })
        .select('businessName category area dealValue interestedProducts extractedByName updatedAt')
        .sort({ updatedAt: -1 })
        .lean(),
      Expense.find({ date: { $gte: start, $lte: end } })
        .sort({ date: -1 })
        .lean(),
      Lead.aggregate([
        { $match: { callStatus: 'Lead / Sale', updatedAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$dealValue', 0] } } } }
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
      date: s.updatedAt,
      businessName: s.businessName,
      category: s.category,
      area: s.area,
      extractedByName: s.extractedByName,
      dealValue: s.dealValue || 0
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
