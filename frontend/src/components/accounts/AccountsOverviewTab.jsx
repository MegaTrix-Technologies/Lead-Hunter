import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  Percent, 
  Briefcase,
  PieChart,
  BarChart2,
  Calendar,
  Clock,
  CheckCircle2,
  HelpCircle,
  Eye,
  EyeOff,
  Layers,
  Sparkles
} from 'lucide-react';

const formatPKR = (num) => `PKR ${(Number(num) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/**
 * Utility: Generate smooth SVG cubic Bezier curve path string from array of coordinate points
 */
const buildSmoothPath = (points, isArea = false, baseZeroY = 0) => {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    if (isArea) {
      return `M ${p.x - 25} ${baseZeroY} L ${p.x - 25} ${p.y} L ${p.x + 25} ${p.y} L ${p.x + 25} ${baseZeroY} Z`;
    }
    return `M ${p.x - 25} ${p.y} L ${p.x + 25} ${p.y}`;
  }

  // Generate cubic bezier control points
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const controlPointX1 = current.x + (next.x - current.x) * 0.45;
    const controlPointY1 = current.y;
    const controlPointX2 = current.x + (next.x - current.x) * 0.55;
    const controlPointY2 = next.y;
    d += ` C ${controlPointX1} ${controlPointY1}, ${controlPointX2} ${controlPointY2}, ${next.x} ${next.y}`;
  }

  if (isArea) {
    const first = points[0];
    const last = points[points.length - 1];
    d += ` L ${last.x} ${baseZeroY} L ${first.x} ${baseZeroY} Z`;
  }

  return d;
};

const AccountsOverviewTab = ({ summary, trend = [] }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [accountingBasis, setAccountingBasis] = useState('cash'); // 'cash' (Realized Inflow) or 'accrual' (Contract Bookings)

  // Series visibility toggles
  const [showSales, setShowSales] = useState(true);
  const [showExpenses, setShowExpenses] = useState(true);
  const [showProfit, setShowProfit] = useState(true);

  if (!summary) return null;

  // Defensive extraction of metrics supporting both dual-basis and legacy response formats
  const totalSales = Number(summary.totalSales) || 0;
  const salesCount = Number(summary.salesCount) || 0;
  const totalExpenses = Number(summary.totalExpenses) || 0;
  const expenseCount = Number(summary.expenseCount) || 0;
  const avgExpense = Number(summary.avgExpense) || 0;
  const netProfit = Number(summary.netProfit) || 0;
  const profitMargin = Number(summary.profitMargin) || 0;

  // Cash Basis (Realized Inflow)
  const realizedSales = summary.realizedSales !== undefined && summary.realizedSales !== null
    ? Number(summary.realizedSales)
    : totalSales;

  const totalOtherIncome = Number(summary.totalOtherIncome) || 0;
  const totalInvestment = Number(summary.totalInvestment) || 0;
  const totalCashInflow = Number(summary.totalCashInflow) || (realizedSales + totalOtherIncome + totalInvestment);
  const netCashFlow = Number(summary.netCashFlow) || (totalCashInflow - totalExpenses);

  const realizedNetProfit = summary.realizedNetProfit !== undefined && summary.realizedNetProfit !== null
    ? Number(summary.realizedNetProfit)
    : netProfit;

  const realizedProfitMargin = summary.realizedProfitMargin !== undefined && summary.realizedProfitMargin !== null
    ? Number(summary.realizedProfitMargin)
    : profitMargin;

  const avgCashCollected = summary.avgCashCollected !== undefined && summary.avgCashCollected !== null
    ? Number(summary.avgCashCollected)
    : (salesCount > 0 ? Math.round(realizedSales / salesCount) : 0);

  // Accrual Basis (Contract Bookings)
  const bookedSales = summary.bookedSales !== undefined && summary.bookedSales !== null
    ? Number(summary.bookedSales)
    : totalSales;

  const projectedNetProfit = summary.projectedNetProfit !== undefined && summary.projectedNetProfit !== null
    ? Number(summary.projectedNetProfit)
    : netProfit;

  const projectedProfitMargin = summary.projectedProfitMargin !== undefined && summary.projectedProfitMargin !== null
    ? Number(summary.projectedProfitMargin)
    : profitMargin;

  const pendingReceivables = summary.pendingReceivables !== undefined && summary.pendingReceivables !== null
    ? Number(summary.pendingReceivables)
    : Math.max(0, bookedSales - realizedSales);

  const avgDealSize = summary.avgDealSize !== undefined && summary.avgDealSize !== null
    ? Number(summary.avgDealSize)
    : (salesCount > 0 ? Math.round(bookedSales / salesCount) : 0);

  const salesByCategory = summary.salesByCategory || [];
  const expensesByCategory = summary.expensesByCategory || [];
  const inflowsByCategory = summary.inflowsByCategory || [];

  // Active metrics according to accounting mode
  const activeSales = accountingBasis === 'cash' ? (realizedSales + totalOtherIncome) : (bookedSales + totalOtherIncome);
  const activeNetProfit = accountingBasis === 'cash' ? realizedNetProfit : projectedNetProfit;
  const activeProfitMargin = accountingBasis === 'cash' ? realizedProfitMargin : projectedProfitMargin;

  const isProfitable = activeNetProfit >= 0;

  // Helper for trend data depending on basis
  const getTrendSalesVal = (t) => {
    if (!t) return 0;
    if (accountingBasis === 'cash') {
      const s = t.realizedSales !== undefined ? Number(t.realizedSales) : (Number(t.sales) || 0);
      const other = Number(t.otherIncome) || 0;
      return s + other;
    }
    const b = t.bookedSales !== undefined ? Number(t.bookedSales) : (Number(t.sales) || 0);
    const other = Number(t.otherIncome) || 0;
    return b + other;
  };

  const getTrendProfitVal = (t) => {
    if (!t) return 0;
    return getTrendSalesVal(t) - (Number(t.expenses) || 0);
  };

  // ─── SVG REALTIME GRAPH COMPUTATION ─────────────────────────────────────────
  const chartHeight = 240;
  const chartWidth = 720;
  const paddingLeft = 55;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 40;

  // Calculate range (including potential negative profit values)
  const chartMetrics = useMemo(() => {
    if (!trend || trend.length === 0) {
      return { minVal: 0, maxVal: 10000, zeroY: chartHeight - paddingBottom };
    }

    let min = 0;
    let max = 10000;

    trend.forEach(t => {
      const s = getTrendSalesVal(t);
      const e = Number(t.expenses) || 0;
      const p = getTrendProfitVal(t);
      if (s > max) max = s;
      if (e > max) max = e;
      if (p > max) max = p;
      if (p < min) min = p;
    });

    // Add 15% visual headroom
    const range = max - min;
    const paddedMax = max + range * 0.12;
    const paddedMin = min < 0 ? min - Math.abs(range) * 0.08 : 0;

    const usableHeight = chartHeight - paddingTop - paddingBottom;
    const totalSpan = paddedMax - paddedMin || 1;

    const getYCoord = (val) => {
      const ratio = (val - paddedMin) / totalSpan;
      return chartHeight - paddingBottom - ratio * usableHeight;
    };

    const getXCoord = (idx, total) => {
      const usableWidth = chartWidth - paddingLeft - paddingRight;
      if (total <= 1) return paddingLeft + usableWidth / 2;
      return paddingLeft + (idx / (total - 1)) * usableWidth;
    };

    const zeroY = getYCoord(0);

    return {
      minVal: paddedMin,
      maxVal: paddedMax,
      zeroY,
      getYCoord,
      getXCoord
    };
  }, [trend, accountingBasis]);

  const { zeroY, getYCoord, getXCoord } = chartMetrics;

  // Prepare coordinate arrays
  const salesPoints = trend.map((t, i) => ({
    x: getXCoord(i, trend.length),
    y: getYCoord(getTrendSalesVal(t)),
    raw: getTrendSalesVal(t),
    period: t.period
  }));

  const expensePoints = trend.map((t, i) => ({
    x: getXCoord(i, trend.length),
    y: getYCoord(Number(t.expenses) || 0),
    raw: Number(t.expenses) || 0,
    period: t.period
  }));

  const profitPoints = trend.map((t, i) => ({
    x: getXCoord(i, trend.length),
    y: getYCoord(getTrendProfitVal(t)),
    raw: getTrendProfitVal(t),
    period: t.period
  }));

  const salesLinePath = buildSmoothPath(salesPoints, false);
  const salesAreaPath = buildSmoothPath(salesPoints, true, zeroY);

  const expenseLinePath = buildSmoothPath(expensePoints, false);
  const expenseAreaPath = buildSmoothPath(expensePoints, true, zeroY);

  const profitLinePath = buildSmoothPath(profitPoints, false);
  const profitAreaPath = buildSmoothPath(profitPoints, true, zeroY);

  return (
    <div className="space-y-6 font-mono">
      
      {/* ─── 0. ACCOUNTING BASIS STANDARD TOGGLE ───────────────────────────── */}
      <div className="bg-[#0A0A0A] border border-[#222222] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Accounting Standard:</span>
            <span className={`text-[11px] px-2 py-0.5 border font-semibold uppercase ${
              accountingBasis === 'cash' 
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-blue-950/60 border-blue-800 text-blue-300'
            }`}>
              {accountingBasis === 'cash' ? 'Cash Basis (Realized Inflow Focus)' : 'Accrual Basis (Contract Bookings)'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            {accountingBasis === 'cash'
              ? 'Realized Cash Inflow: Revenue & profit recognize ONLY money actually received in the bank (advance, milestone partial payments, and other income). Uncollected balance is tracked in Accounts Receivable.'
              : 'Accrual / Contract Bookings: Revenue & profit recognize the total signed contract face value upon deal closing, regardless of pending cash collection.'}
          </p>
        </div>

        {/* Toggle Buttons */}
        <div className="flex items-center bg-[#050505] p-1 border border-[#2B2B2B] shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setAccountingBasis('cash')}
            className={`px-3.5 py-1.5 text-xs font-bold uppercase transition-all cursor-pointer ${
              accountingBasis === 'cash'
                ? 'bg-emerald-600 text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Cash Basis (Realized Inflow)
          </button>
          <button
            type="button"
            onClick={() => setAccountingBasis('accrual')}
            className={`px-3.5 py-1.5 text-xs font-bold uppercase transition-all cursor-pointer ${
              accountingBasis === 'accrual'
                ? 'bg-blue-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Accrual (Contract Bookings)
          </button>
        </div>
      </div>

      {/* ─── 1. EXECUTIVE P&L METRIC CARDS ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Sales Revenue (Cash Inflow vs Booked) */}
        <div className="p-4 bg-[#0A0A0A] border border-[#222222] relative overflow-hidden group hover:border-emerald-700/60 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500" />
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="uppercase tracking-wider font-semibold">
              {accountingBasis === 'cash' ? 'Realized Cash Inflow' : 'Gross Booked Sales'}
            </span>
            <div className="p-1.5 bg-emerald-950/40 border border-emerald-800 text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-white mt-2">
            {formatPKR(activeSales)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2.5 pt-2 border-t border-[#1A1A1A]">
            <span>{salesCount} Closed Deals</span>
            <span className="text-emerald-400 font-semibold">
              {accountingBasis === 'cash'
                ? `Booked: ${formatPKR(bookedSales)}`
                : `Realized: ${formatPKR(realizedSales)}`}
            </span>
          </div>
        </div>

        {/* Card 2: Total Operational Expenses */}
        <div className="p-4 bg-[#0A0A0A] border border-[#222222] relative overflow-hidden group hover:border-rose-700/60 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-rose-500" />
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="uppercase tracking-wider font-semibold">Total Expenses</span>
            <div className="p-1.5 bg-rose-950/40 border border-rose-800 text-rose-400">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-white mt-2">
            {formatPKR(totalExpenses)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2.5 pt-2 border-t border-[#1A1A1A]">
            <span>{expenseCount} Expense Entries</span>
            <span className="text-rose-400 font-semibold">Avg: {formatPKR(avgExpense)}</span>
          </div>
        </div>

        {/* Card 3: Net Operating Profit */}
        <div className={`p-4 bg-[#0A0A0A] border relative overflow-hidden transition-colors ${
          isProfitable ? 'border-emerald-900/50 hover:border-emerald-600' : 'border-rose-900/50 hover:border-rose-600'
        }`}>
          <div className={`absolute top-0 left-0 right-0 h-0.5 ${isProfitable ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="uppercase tracking-wider font-semibold">
              {accountingBasis === 'cash' ? 'Realized Net Cash Profit' : 'Projected Net Profit'}
            </span>
            <div className={`p-1.5 border ${
              isProfitable ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' : 'bg-rose-950/40 border-rose-800 text-rose-400'
            }`}>
              {isProfitable ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            </div>
          </div>
          <div className={`text-xl font-bold mt-2 ${isProfitable ? 'text-emerald-300' : 'text-rose-300'}`}>
            {formatPKR(activeNetProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2.5 pt-2 border-t border-[#1A1A1A]">
            <span>
              {accountingBasis === 'cash' ? 'Inflows − Expenses' : 'Booked − Expenses'}
            </span>
            <span className={`font-bold ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isProfitable ? `Surplus (${activeProfitMargin}%)` : `Deficit (${activeProfitMargin}%)`}
            </span>
          </div>
        </div>

        {/* Card 4: Accounts Receivable / Margin Rate */}
        <div className="p-4 bg-[#0A0A0A] border border-[#222222] relative overflow-hidden group hover:border-amber-700/60 transition-colors">
          <div className={`absolute top-0 left-0 right-0 h-0.5 ${accountingBasis === 'cash' ? 'bg-amber-500' : 'bg-blue-500'}`} />
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="uppercase tracking-wider font-semibold">
              {accountingBasis === 'cash' ? 'Accounts Receivable' : 'Profit Margin Rate'}
            </span>
            <div className={`p-1.5 border ${
              accountingBasis === 'cash'
                ? 'bg-amber-950/40 border-amber-800 text-amber-400'
                : 'bg-blue-950/40 border-blue-800 text-blue-400'
            }`}>
              {accountingBasis === 'cash' ? <Clock className="w-3.5 h-3.5" /> : <Percent className="w-3.5 h-3.5" />}
            </div>
          </div>
          <div className="text-xl font-bold text-white mt-2">
            {accountingBasis === 'cash' ? formatPKR(pendingReceivables) : `${activeProfitMargin}%`}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2.5 pt-2 border-t border-[#1A1A1A]">
            {accountingBasis === 'cash' ? (
              <>
                <span>Pending Collections</span>
                <span className="text-amber-400 font-semibold">Margin: {activeProfitMargin}%</span>
              </>
            ) : (
              <>
                <span>Contract Margin</span>
                <span className="text-zinc-300 font-semibold">Pending: {formatPKR(pendingReceivables)}</span>
              </>
            )}
          </div>
        </div>

      </div>

      {/* ─── 1.5 CASH FLOW & RECEIVABLES HEALTH METER ──────────────────────── */}
      <div className="bg-[#0A0A0A] border border-[#222222] p-4 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold uppercase tracking-wider">Cash Collection &amp; Receivables Health</span>
            <span className="text-[11px] text-zinc-500">
              (Total Booked Pipeline: {formatPKR(bookedSales)})
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              Cash In Bank: {formatPKR(realizedSales)} ({bookedSales > 0 ? ((realizedSales / bookedSales) * 100).toFixed(1) : 100}%)
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Pending Receivables: {formatPKR(pendingReceivables)} ({bookedSales > 0 ? ((pendingReceivables / bookedSales) * 100).toFixed(1) : 0}%)
            </span>
          </div>
        </div>

        {/* Visual Split Bar */}
        <div className="w-full h-3 bg-[#141414] border border-[#222222] overflow-hidden flex">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500" 
            style={{ width: `${bookedSales > 0 ? Math.min(100, Math.max(0, (realizedSales / bookedSales) * 100)) : 100}%` }}
            title={`Cash Realized: ${formatPKR(realizedSales)}`}
          />
          <div 
            className="h-full bg-amber-500/80 transition-all duration-500" 
            style={{ width: `${bookedSales > 0 ? Math.min(100, Math.max(0, (pendingReceivables / bookedSales) * 100)) : 0}%` }}
            title={`Pending Receivables: ${formatPKR(pendingReceivables)}`}
          />
        </div>
      </div>

      {/* ─── 2. REALTIME MULTI-METRIC FINANCIAL TRAJECTORY GRAPH ───────────── */}
      <div className="bg-[#0A0A0A] border border-[#222222] p-5 space-y-4">
        
        {/* Graph Header & Interactive Series Toggles */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 inline-block shadow-[0_0_8px_#10B981]" />
              Realtime Financial Trajectory: Inflows, Expenses &amp; Net Profit
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Multi-curve area telemetry tracking operational cash flow &amp; bottom-line profitability ({accountingBasis === 'cash' ? 'Cash Basis' : 'Accrual Basis'}).
            </p>
          </div>

          {/* Interactive Legend Toggles */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Sales / Inflow Series Toggle */}
            <button
              type="button"
              onClick={() => setShowSales(!showSales)}
              className={`px-2.5 py-1 border flex items-center gap-1.5 transition-all cursor-pointer ${
                showSales 
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' 
                  : 'bg-[#111] border-[#222] text-zinc-500 opacity-60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
              <span>{accountingBasis === 'cash' ? 'Cash Inflows' : 'Booked Sales'}</span>
              {showSales ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3 text-zinc-600" />}
            </button>

            {/* Expenses Series Toggle */}
            <button
              type="button"
              onClick={() => setShowExpenses(!showExpenses)}
              className={`px-2.5 py-1 border flex items-center gap-1.5 transition-all cursor-pointer ${
                showExpenses 
                  ? 'bg-rose-950/60 border-rose-700 text-rose-300' 
                  : 'bg-[#111] border-[#222] text-zinc-500 opacity-60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span>Operating Expenses</span>
              {showExpenses ? <Eye className="w-3 h-3 text-rose-400" /> : <EyeOff className="w-3 h-3 text-zinc-600" />}
            </button>

            {/* Net Profit Series Toggle */}
            <button
              type="button"
              onClick={() => setShowProfit(!showProfit)}
              className={`px-2.5 py-1 border flex items-center gap-1.5 transition-all cursor-pointer ${
                showProfit 
                  ? 'bg-cyan-950/60 border-cyan-700 text-cyan-300' 
                  : 'bg-[#111] border-[#222] text-zinc-500 opacity-60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
              <span>Net Profit (Bottom Line)</span>
              {showProfit ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3 text-zinc-600" />}
            </button>
          </div>
        </div>

        {/* High Quality Realtime SVG Chart */}
        {trend && trend.length > 0 ? (
          <div className="relative overflow-x-auto select-none">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-64 overflow-visible"
              style={{ minWidth: '550px' }}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <defs>
                {/* Sales Area Gradient */}
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>

                {/* Expenses Area Gradient */}
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
                </linearGradient>

                {/* Net Profit Area Gradient */}
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                </linearGradient>

                {/* Glow Filters */}
                <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#10B981" floodOpacity="0.6" />
                </filter>
                <filter id="glowRose" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#F43F5E" floodOpacity="0.6" />
                </filter>
                <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#06B6D4" floodOpacity="0.6" />
                </filter>
              </defs>

              {/* Horizontal Gridlines & Y-Axis Scale */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const val = chartMetrics.minVal + ratio * (chartMetrics.maxVal - chartMetrics.minVal);
                const y = getYCoord(val);
                const valLabel = Math.round(val);
                return (
                  <g key={idx}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={chartWidth - paddingRight}
                      y2={y}
                      stroke="#1A1A1A"
                      strokeDasharray="2,3"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      fill="#71717A"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {Math.abs(valLabel) >= 1000 ? `${Math.round(valLabel / 1000)}k` : valLabel}
                    </text>
                  </g>
                );
              })}

              {/* Zero-Baseline Indicator (if minVal < 0) */}
              {chartMetrics.minVal < 0 && (
                <g>
                  <line
                    x1={paddingLeft}
                    y1={zeroY}
                    x2={chartWidth - paddingRight}
                    y2={zeroY}
                    stroke="#4B5563"
                    strokeWidth="1.2"
                  />
                  <text
                    x={chartWidth - paddingRight + 4}
                    y={zeroY + 3}
                    fill="#9CA3AF"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    0
                  </text>
                </g>
              )}

              {/* Area Fills under curves */}
              {showSales && salesAreaPath && (
                <path d={salesAreaPath} fill="url(#salesGradient)" />
              )}
              {showExpenses && expenseAreaPath && (
                <path d={expenseAreaPath} fill="url(#expenseGradient)" />
              )}
              {showProfit && profitAreaPath && (
                <path d={profitAreaPath} fill="url(#profitGradient)" />
              )}

              {/* 1. Cash Inflow / Sales Curve */}
              {showSales && salesLinePath && (
                <path
                  d={salesLinePath}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glowGreen)"
                />
              )}

              {/* 2. Operational Expenses Curve */}
              {showExpenses && expenseLinePath && (
                <path
                  d={expenseLinePath}
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glowRose)"
                />
              )}

              {/* 3. Net Operating Profit Curve */}
              {showProfit && profitLinePath && (
                <path
                  d={profitLinePath}
                  fill="none"
                  stroke="#06B6D4"
                  strokeWidth="2.5"
                  strokeDasharray="4,2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glowCyan)"
                />
              )}

              {/* Vertical Crosshair Guide on Hover */}
              {hoveredPoint !== null && (
                <line
                  x1={getXCoord(hoveredPoint, trend.length)}
                  y1={paddingTop}
                  x2={getXCoord(hoveredPoint, trend.length)}
                  y2={chartHeight - paddingBottom}
                  stroke="#3B82F6"
                  strokeWidth="1.2"
                  strokeDasharray="3,3"
                />
              )}

              {/* Data Points Interactive Markers */}
              {trend.map((point, idx) => {
                const x = getXCoord(idx, trend.length);
                const salesVal = getTrendSalesVal(point);
                const expVal = Number(point.expenses) || 0;
                const profitVal = getTrendProfitVal(point);

                const ySales = getYCoord(salesVal);
                const yExp = getYCoord(expVal);
                const yProfit = getYCoord(profitVal);
                const isHovered = hoveredPoint === idx;

                return (
                  <g key={idx} onMouseEnter={() => setHoveredPoint(idx)}>
                    {/* X-axis Label */}
                    <text
                      x={x}
                      y={chartHeight - 16}
                      textAnchor="middle"
                      fill={isHovered ? '#FFFFFF' : '#71717A'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight={isHovered ? 'bold' : 'normal'}
                    >
                      {point.period.length > 5 ? point.period.slice(5) : point.period}
                    </text>

                    {/* Invisible Wide Hit Area for Smooth Hover */}
                    <rect
                      x={x - 18}
                      y={paddingTop}
                      width={36}
                      height={chartHeight - paddingTop - paddingBottom}
                      fill="transparent"
                      className="cursor-pointer"
                    />

                    {/* Sales Point Marker */}
                    {showSales && (
                      <circle
                        cx={x}
                        cy={ySales}
                        r={isHovered ? 5.5 : 3.5}
                        fill="#10B981"
                        stroke="#000000"
                        strokeWidth="1.5"
                        className="transition-all"
                      />
                    )}

                    {/* Expense Point Marker */}
                    {showExpenses && (
                      <circle
                        cx={x}
                        cy={yExp}
                        r={isHovered ? 5.5 : 3.5}
                        fill="#F43F5E"
                        stroke="#000000"
                        strokeWidth="1.5"
                        className="transition-all"
                      />
                    )}

                    {/* Profit Point Marker */}
                    {showProfit && (
                      <circle
                        cx={x}
                        cy={yProfit}
                        r={isHovered ? 5.5 : 3.5}
                        fill="#06B6D4"
                        stroke="#000000"
                        strokeWidth="1.5"
                        className="transition-all"
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Rich Hover Crosshair Glassmorphism Tooltip */}
            {hoveredPoint !== null && trend[hoveredPoint] && (
              <div 
                className="absolute top-2 right-4 bg-[#0A0A0A]/95 border border-[#333333] p-3.5 shadow-2xl pointer-events-none text-xs space-y-1.5 z-20 backdrop-blur-md min-w-[210px] animate-in fade-in duration-100"
              >
                <div className="font-bold text-white border-b border-[#222222] pb-1.5 flex items-center justify-between">
                  <span>{trend[hoveredPoint].period}</span>
                  <span className="text-[10px] text-zinc-400 uppercase">Period Telemetry</span>
                </div>

                {showSales && (
                  <div className="flex items-center justify-between text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>{accountingBasis === 'cash' ? 'Cash Inflow' : 'Booked Sales'}:</span>
                    </span>
                    <span className="font-bold font-mono">
                      {formatPKR(getTrendSalesVal(trend[hoveredPoint]))}
                    </span>
                  </div>
                )}

                {showExpenses && (
                  <div className="flex items-center justify-between text-rose-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span>Expenses:</span>
                    </span>
                    <span className="font-bold font-mono">
                      {formatPKR(trend[hoveredPoint].expenses || 0)}
                    </span>
                  </div>
                )}

                {showProfit && (
                  <div className="flex items-center justify-between text-cyan-400 pt-1 border-t border-[#222222]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>Net Profit:</span>
                    </span>
                    <span className="font-bold font-mono">
                      {formatPKR(getTrendProfitVal(trend[hoveredPoint]))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-zinc-500 text-xs">
            No sales or expense transactions recorded in this selected period to plot trend.
          </div>
        )}
      </div>

      {/* ─── 3. CATEGORY DISTRIBUTION BREAKDOWN ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sales & Inflows by Category */}
        <div className="bg-[#0A0A0A] border border-[#222222] p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 inline-block" />
              {accountingBasis === 'cash' ? 'Cash Inflow by Client Niche' : 'Booked Value by Client Niche'}
            </h3>
            <span className="text-[11px] text-zinc-400">
              {salesByCategory.length} Industries
            </span>
          </div>

          {salesByCategory.length > 0 ? (
            <div className="space-y-3">
              {salesByCategory.map((cat, idx) => {
                const catVal = accountingBasis === 'cash' ? (cat.amount || 0) : (cat.bookedAmount || cat.amount || 0);
                const denom = accountingBasis === 'cash' ? activeSales : bookedSales;
                const share = denom > 0 ? ((catVal / denom) * 100).toFixed(1) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-200 font-medium truncate max-w-xs">{cat.category}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-emerald-400 font-bold">{formatPKR(catVal)}</span>
                        <span className="text-zinc-400 w-12 text-right">{share}%</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-[#141414] overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${share}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-500 text-xs">
              No sales records available for this period.
            </div>
          )}
        </div>

        {/* Expenses by Category */}
        <div className="bg-[#0A0A0A] border border-[#222222] p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-rose-500 inline-block" />
              Operational Outflow by Category
            </h3>
            <span className="text-[11px] text-zinc-400">
              {expensesByCategory.length} Categories
            </span>
          </div>

          {expensesByCategory.length > 0 ? (
            <div className="space-y-3">
              {expensesByCategory.map((cat, idx) => {
                const share = totalExpenses > 0 ? ((cat.amount / totalExpenses) * 100).toFixed(1) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-200 font-medium truncate max-w-xs">{cat.category}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-rose-400 font-bold">{formatPKR(cat.amount)}</span>
                        <span className="text-zinc-400 w-12 text-right">{share}%</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-[#141414] overflow-hidden">
                      <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${share}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-500 text-xs">
              No expenses recorded in this period.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default AccountsOverviewTab;
