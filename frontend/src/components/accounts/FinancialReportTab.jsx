import React, { useState, useEffect } from 'react';
import { AccountService } from '../../services/api';
import { FileText, Printer, Download, RefreshCw, CheckCircle2, DollarSign, Receipt, TrendingUp } from 'lucide-react';

const formatPKR = (num) => `PKR ${(Number(num) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const FinancialReportTab = ({ periodParams, onExportExcel, onExportPdf, exportingExcel, exportingPdf }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await AccountService.getReport(periodParams);
      if (res.data.success) {
        setReportData(res.data.data);
      }
    } catch (err) {
      console.error('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [periodParams]);

  if (loading) {
    return (
      <div className="p-16 text-center text-zinc-500 font-mono text-xs">
        Compiling structured financial statement...
      </div>
    );
  }

  if (!reportData) return null;

  const { meta, kpis, breakdowns, itemized } = reportData;
  const isProfitable = kpis.netProfit >= 0;

  return (
    <div className="space-y-6">
      
      {/* Report Action Bar */}
      <div className="bg-[#0A0A0A] border border-[#222222] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            Structured Financial Statement — {meta.periodLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-300 hover:text-white border border-[#2B2B2B] text-xs font-mono flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            onClick={fetchReport}
            className="px-3 py-1.5 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-300 hover:text-white border border-[#2B2B2B] text-xs font-mono flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-generate</span>
          </button>
        </div>
      </div>

      {/* Main Report Document Container */}
      <div className="bg-[#080808] border border-[#262626] p-6 sm:p-8 space-y-8 font-mono max-w-5xl mx-auto shadow-2xl">
        
        {/* Document Header Banner */}
        <div className="border-b border-[#222222] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="/megatrix-icon.svg" 
              alt="MegaTrix" 
              className="h-9 w-auto object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div>
              <div className="font-bold text-base text-white tracking-widest uppercase">
                MegaTrix Technologies
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                Financial Management &amp; P&L Accounts Division
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right text-[11px] text-zinc-400 space-y-0.5">
            <div><span className="text-zinc-600">Reporting Period:</span> <strong className="text-zinc-200">{meta.periodLabel}</strong></div>
            <div><span className="text-zinc-600">Generated:</span> {new Date(meta.generatedAt).toLocaleString()}</div>
            <div><span className="text-zinc-600">Currency:</span> {meta.currency}</div>
          </div>
        </div>

        {/* Executive Summary P&L Box */}
        <div className="bg-[#030303] border border-[#1E1E1E] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              1. Executive P&amp;L Summary (Cash Basis &amp; Contract Pipeline)
            </h4>
            <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-950/40 border border-emerald-800 uppercase">
              Cash Realized Inflow Focus
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="p-3 bg-[#080808] border border-[#1E1E1E]">
              <div className="text-[10px] text-zinc-500 uppercase">Realized Sales Inflow</div>
              <div className="text-base font-bold text-emerald-400 mt-1">
                {formatPKR(kpis.realizedSales !== undefined ? kpis.realizedSales : kpis.totalSales)}
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">
                Booked: {formatPKR(kpis.bookedSales || kpis.totalSales)}
              </div>
            </div>

            <div className="p-3 bg-[#080808] border border-[#1E1E1E]">
              <div className="text-[10px] text-zinc-500 uppercase">Total Operating Expenses</div>
              <div className="text-base font-bold text-rose-400 mt-1">{formatPKR(kpis.totalExpenses)}</div>
              <div className="text-[10px] text-zinc-400 mt-1">{kpis.expenseCount} Records</div>
            </div>

            <div className="p-3 bg-[#080808] border border-[#1E1E1E]">
              <div className="text-[10px] text-zinc-500 uppercase">Realized Net Cash Profit</div>
              <div className={`text-base font-bold mt-1 ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatPKR(kpis.realizedNetProfit !== undefined ? kpis.realizedNetProfit : kpis.netProfit)}
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">
                Projected: {formatPKR(kpis.projectedNetProfit !== undefined ? kpis.projectedNetProfit : kpis.netProfit)}
              </div>
            </div>

            <div className="p-3 bg-[#080808] border border-[#1E1E1E]">
              <div className="text-[10px] text-zinc-500 uppercase">Accounts Receivable</div>
              <div className="text-base font-bold text-amber-400 mt-1">
                {formatPKR(kpis.pendingReceivables || 0)}
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">Margin: {kpis.profitMargin}%</div>
            </div>
          </div>
        </div>

        {/* Operating Expenses Breakdown Table */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
            <span>2. Operational Expenses by Category</span>
            <span className="text-[11px] text-rose-400 font-normal">Total: {formatPKR(kpis.totalExpenses)}</span>
          </h4>

          <div className="border border-[#1E1E1E] overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#050505] text-zinc-400 border-b border-[#1E1E1E]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Expense Category</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Entries</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Amount (PKR)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {(breakdowns.expensesByCategory || []).map((cat, idx) => (
                  <tr key={idx} className="hover:bg-[#121212]">
                    <td className="py-2.5 px-4 text-white">{cat.category}</td>
                    <td className="py-2.5 px-4 text-center text-zinc-400">{cat.count}</td>
                    <td className="py-2.5 px-4 text-right text-rose-400 font-bold">{formatPKR(cat.amount)}</td>
                    <td className="py-2.5 px-4 text-right text-zinc-400">
                      {kpis.totalExpenses > 0 ? ((cat.amount / kpis.totalExpenses) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sales by Category Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
            <span>3. Sales Inflow by Client Niche</span>
            <span className="text-[11px] text-emerald-400 font-normal">Total: {formatPKR(kpis.totalSales)}</span>
          </h4>

          <div className="border border-[#1E1E1E] overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#050505] text-zinc-400 border-b border-[#1E1E1E]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Industry / Niche</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Closed Deals</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Sales Amount (PKR)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {(breakdowns.salesByCategory || []).map((cat, idx) => (
                  <tr key={idx} className="hover:bg-[#121212]">
                    <td className="py-2.5 px-4 text-white">{cat.category}</td>
                    <td className="py-2.5 px-4 text-center text-zinc-400">{cat.count}</td>
                    <td className="py-2.5 px-4 text-right text-emerald-400 font-bold">{formatPKR(cat.amount)}</td>
                    <td className="py-2.5 px-4 text-right text-zinc-400">
                      {kpis.totalSales > 0 ? ((cat.amount / kpis.totalSales) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Document Footer Verification */}
        <div className="pt-6 border-t border-[#1E1E1E] flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-600 font-mono gap-2">
          <div>Verified by MegaTrix Central Autonomous Financial Engine</div>
          <div>Strictly Confidential • For Super Admin Review Only</div>
        </div>

      </div>

    </div>
  );
};

export default FinancialReportTab;
