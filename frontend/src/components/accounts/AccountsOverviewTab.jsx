import React, { useState } from 'react';
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
  HelpCircle
} from 'lucide-react';

const formatPKR = (num) => `PKR ${(Number(num) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const AccountsOverviewTab = ({ summary, trend = [] }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [accountingBasis, setAccountingBasis] = useState('cash'); // 'cash' (Realized Inflow) or 'accrual' (Contract Bookings)

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

  // Active metrics according to accounting mode
  const activeSales = accountingBasis === 'cash' ? realizedSales : bookedSales;
  const activeNetProfit = accountingBasis === 'cash' ? realizedNetProfit : projectedNetProfit;
  const activeProfitMargin = accountingBasis === 'cash' ? realizedProfitMargin : projectedProfitMargin;

  const isProfitable = activeNetProfit >= 0;

  // Helper for trend data depending on basis
  const getTrendSalesVal = (t) => {
    if (accountingBasis === 'cash') {
      return t.realizedSales !== undefined && t.realizedSales !== null ? Number(t.realizedSales) : (Number(t.sales) || 0);
    }
    return t.bookedSales !== undefined && t.bookedSales !== null ? Number(t.bookedSales) : (Number(t.sales) || 0);
  };

  const getTrendProfitVal = (t) => {
    return getTrendSalesVal(t) - (t.expenses || 0);
  };

  // Compute SVG chart coordinates
  const chartHeight = 220;
  const chartWidth = 700;
  const padding = 40;

  const maxVal = Math.max(
    ...trend.map(t => Math.max(getTrendSalesVal(t), t.expenses || 0, Math.abs(getTrendProfitVal(t)))),
    10000
  );

  const getX = (idx, total) => {
    if (total <= 1) return padding + (chartWidth - padding * 2) / 2;
    return padding + (idx / (total - 1)) * (chartWidth - padding * 2);
  };

  const getY = (val) => {
    const usableHeight = chartHeight - padding * 2;
    const ratio = Math.min(Math.max(val / maxVal, 0), 1);
    return chartHeight - padding - ratio * usableHeight;
  };

  const salesPath = trend.length > 1
    ? trend.map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, trend.length)} ${getY(getTrendSalesVal(t))}`).join(' ')
    : '';

  const expensesPath = trend.length > 1
    ? trend.map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, trend.length)} ${getY(t.expenses)}`).join(' ')
    : '';

  return (
    <div className="space-y-6">
      
      {/* ─── 0. ACCOUNTING BASIS STANDARD TOGGLE ───────────────────────────── */}
      <div className="bg-[#0A0A0A] border border-[#222222] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Accounting Standard:</span>
            <span className={`text-[11px] font-mono px-2 py-0.5 border font-semibold uppercase ${
              accountingBasis === 'cash' 
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-blue-950/60 border-blue-800 text-blue-300'
            }`}>
              {accountingBasis === 'cash' ? 'Cash Basis (Active Default)' : 'Accrual Basis (Contract Bookings)'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-mono mt-1">
            {accountingBasis === 'cash'
              ? 'Realized Cash Inflow: Revenue & profit recognize ONLY money actually received in the bank (advance/collected). Uncollected balance is tracked in Accounts Receivable.'
              : 'Accrual / Contract Bookings: Revenue & profit recognize the total signed contract face value upon deal closing, regardless of pending cash collection.'}
          </p>
        </div>

        {/* Toggle Buttons */}
        <div className="flex items-center bg-[#050505] p-1 border border-[#2B2B2B] shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setAccountingBasis('cash')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
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
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
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
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="uppercase tracking-wider font-semibold">
              {accountingBasis === 'cash' ? 'Realized Cash Inflow' : 'Gross Booked Sales'}
            </span>
            <div className="p-1.5 bg-emerald-950/40 border border-emerald-800 text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-white mt-2">
            {formatPKR(activeSales)}
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mt-2.5 pt-2 border-t border-[#1A1A1A]">
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
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="uppercase tracking-wider font-semibold">Total Expenses</span>
            <div className="p-1.5 bg-rose-950/40 border border-rose-800 text-rose-400">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-white mt-2">
            {formatPKR(totalExpenses)}
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mt-2.5 pt-2 border-t border-[#1A1A1A]">
            <span>{expenseCount} Expense Entries</span>
            <span className="text-rose-400 font-semibold">Avg: {formatPKR(avgExpense)}</span>
          </div>
        </div>

        {/* Card 3: Net Operating Profit */}
        <div className={`p-4 bg-[#0A0A0A] border relative overflow-hidden transition-colors ${
          isProfitable ? 'border-emerald-900/50 hover:border-emerald-600' : 'border-rose-900/50 hover:border-rose-600'
        }`}>
          <div className={`absolute top-0 left-0 right-0 h-0.5 ${isProfitable ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="uppercase tracking-wider font-semibold">
              {accountingBasis === 'cash' ? 'Realized Net Cash Profit' : 'Projected Net Profit'}
            </span>
            <div className={`p-1.5 border ${
              isProfitable ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' : 'bg-rose-950/40 border-rose-800 text-rose-400'
            }`}>
              {isProfitable ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            </div>
          </div>
          <div className={`text-xl font-bold font-mono mt-2 ${isProfitable ? 'text-emerald-300' : 'text-rose-300'}`}>
            {formatPKR(activeNetProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mt-2.5 pt-2 border-t border-[#1A1A1A]">
            <span>
              {accountingBasis === 'cash' ? 'Inflow − Expenses' : 'Booked − Expenses'}
            </span>
            <span className={`font-bold ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isProfitable ? 'Net Surplus' : 'Operating Deficit'}
            </span>
          </div>
        </div>

        {/* Card 4: Accounts Receivable / Margin Rate */}
        <div className="p-4 bg-[#0A0A0A] border border-[#222222] relative overflow-hidden group hover:border-amber-700/60 transition-colors">
          <div className={`absolute top-0 left-0 right-0 h-0.5 ${accountingBasis === 'cash' ? 'bg-amber-500' : 'bg-blue-500'}`} />
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
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
          <div className="text-xl font-bold font-mono text-white mt-2">
            {accountingBasis === 'cash' ? formatPKR(pendingReceivables) : `${activeProfitMargin}%`}
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mt-2.5 pt-2 border-t border-[#1A1A1A]">
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
      <div className="bg-[#0A0A0A] border border-[#222222] p-4 font-mono space-y-2.5">
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

      {/* ─── 2. FINANCIAL TREND TIMELINE CHART ────────────────────────────── */}
      <div className="bg-[#0A0A0A] border border-[#222222] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 inline-block" />
              {accountingBasis === 'cash' ? 'Realized Cash Inflow' : 'Booked Sales'} vs. Operating Expenses Trend
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              Period-over-period financial trajectory ({accountingBasis === 'cash' ? 'Cash Basis' : 'Accrual Basis'}).
            </p>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
              <span className="text-zinc-300">
                {accountingBasis === 'cash' ? 'Cash Inflow (PKR)' : 'Booked Sales (PKR)'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-400 inline-block" />
              <span className="text-zinc-300">Expenses (PKR)</span>
            </div>
          </div>
        </div>

        {/* SVG Chart */}
        {trend && trend.length > 0 ? (
          <div className="relative overflow-x-auto">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-56 select-none"
              style={{ minWidth: '450px' }}
            >
              {/* Horizontal Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = chartHeight - padding - ratio * (chartHeight - padding * 2);
                const valLabel = Math.round(maxVal * ratio);
                return (
                  <g key={idx}>
                    <line
                      x1={padding}
                      y1={y}
                      x2={chartWidth - padding}
                      y2={y}
                      stroke="#1E1E1E"
                      strokeDasharray="2,3"
                    />
                    <text
                      x={padding - 6}
                      y={y + 3}
                      textAnchor="end"
                      fill="#71717A"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {valLabel >= 1000 ? `${Math.round(valLabel / 1000)}k` : valLabel}
                    </text>
                  </g>
                );
              })}

              {/* Sales Line */}
              {salesPath && (
                <path
                  d={salesPath}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Expenses Line */}
              {expensesPath && (
                <path
                  d={expensesPath}
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points */}
              {trend.map((point, idx) => {
                const x = getX(idx, trend.length);
                const salesVal = getTrendSalesVal(point);
                const ySales = getY(salesVal);
                const yExp = getY(point.expenses || 0);
                const isHovered = hoveredPoint === idx;

                return (
                  <g key={idx}>
                    {/* X-axis Label */}
                    <text
                      x={x}
                      y={chartHeight - 14}
                      textAnchor="middle"
                      fill="#71717A"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {point.period.length > 5 ? point.period.slice(5) : point.period}
                    </text>

                    {/* Sales Marker */}
                    <circle
                      cx={x}
                      cy={ySales}
                      r={isHovered ? 5 : 3.5}
                      fill="#10B981"
                      stroke="#000000"
                      strokeWidth="1.5"
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredPoint(idx)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />

                    {/* Expense Marker */}
                    <circle
                      cx={x}
                      cy={yExp}
                      r={isHovered ? 5 : 3.5}
                      fill="#F43F5E"
                      stroke="#000000"
                      strokeWidth="1.5"
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredPoint(idx)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Popup */}
            {hoveredPoint !== null && trend[hoveredPoint] && (
              <div 
                className="absolute top-2 right-4 bg-[#0F0F0F] border border-[#333333] p-3 shadow-xl pointer-events-none text-xs font-mono space-y-1 z-10"
              >
                <div className="font-bold text-white border-b border-[#222222] pb-1">
                  {trend[hoveredPoint].period}
                </div>
                <div className="text-emerald-400">
                  {accountingBasis === 'cash' ? 'Cash Inflow' : 'Booked Sales'}: {formatPKR(getTrendSalesVal(trend[hoveredPoint]))}
                </div>
                <div className="text-rose-400">
                  Expenses: {formatPKR(trend[hoveredPoint].expenses || 0)}
                </div>
                <div className="text-blue-400 font-bold pt-1 border-t border-[#222222]">
                  Net Profit: {formatPKR(getTrendProfitVal(trend[hoveredPoint]))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-zinc-500 font-mono text-xs">
            No sales or expense transactions recorded in this selected period to plot trend.
          </div>
        )}
      </div>

      {/* ─── 3. CATEGORY DISTRIBUTION BREAKDOWN ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sales by Industry / Client Category */}
        <div className="bg-[#0A0A0A] border border-[#222222] p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 inline-block" />
              {accountingBasis === 'cash' ? 'Cash Inflow by Client Niche' : 'Booked Value by Client Niche'}
            </h3>
            <span className="text-[11px] font-mono text-zinc-400">
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
                    <div className="flex items-center justify-between text-xs font-mono">
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
            <div className="p-8 text-center text-zinc-500 font-mono text-xs">
              No sales records available for this period.
            </div>
          )}
        </div>

        {/* Expenses by Category */}
        <div className="bg-[#0A0A0A] border border-[#222222] p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-rose-500 inline-block" />
              Operational Outflow by Category
            </h3>
            <span className="text-[11px] font-mono text-zinc-400">
              {expensesByCategory.length} Categories
            </span>
          </div>

          {expensesByCategory.length > 0 ? (
            <div className="space-y-3">
              {expensesByCategory.map((cat, idx) => {
                const share = totalExpenses > 0 ? ((cat.amount / totalExpenses) * 100).toFixed(1) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
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
            <div className="p-8 text-center text-zinc-500 font-mono text-xs">
              No expenses recorded in this period.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default AccountsOverviewTab;
