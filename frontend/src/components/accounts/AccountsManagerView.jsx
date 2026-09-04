import React, { useState, useEffect } from 'react';
import { AccountService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AccountsOverviewTab from './AccountsOverviewTab';
import SalesLedgerTab from './SalesLedgerTab';
import ExpensesLedgerTab from './ExpensesLedgerTab';
import FinancialReportTab from './FinancialReportTab';
import { 
  Landmark, 
  BarChart3, 
  DollarSign, 
  Receipt, 
  FileText, 
  Download, 
  RefreshCw, 
  Calendar, 
  FileSpreadsheet, 
  Lock,
  ArrowDownToLine
} from 'lucide-react';

const AccountsManagerView = () => {
  const { isSuperAdmin } = useAuth();
  const { addToast } = useToast();

  const [preset, setPreset] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [appliedCustomStart, setAppliedCustomStart] = useState('');
  const [appliedCustomEnd, setAppliedCustomEnd] = useState('');

  const [activeTab, setActiveTab] = useState('overview');
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const presets = [
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'this_quarter', label: 'This Quarter' },
    { id: 'this_year', label: 'This Year' },
    { id: 'all_time', label: 'All Time' },
    { id: 'custom', label: 'Custom' }
  ];

  const periodParams = {
    preset,
    startDate: preset === 'custom' ? appliedCustomStart : undefined,
    endDate: preset === 'custom' ? appliedCustomEnd : undefined
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await AccountService.getSummary(periodParams);
      if (res.data.success) {
        setSummaryData(res.data.data);
      }
    } catch (err) {
      console.error('[AccountsManagerView] Error fetching summary:', err);
      addToast({
        title: 'Error loading financials',
        message: err.response?.data?.message || 'Failed to aggregate accounts data.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [preset, appliedCustomStart, appliedCustomEnd]);

  const handleApplyCustomDates = (e) => {
    e.preventDefault();
    if (!customStart || !customEnd) {
      addToast({
        title: 'Invalid Date Range',
        message: 'Please select both start and end dates.',
        type: 'error'
      });
      return;
    }
    setAppliedCustomStart(customStart);
    setAppliedCustomEnd(customEnd);
    setPreset('custom');
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const res = await AccountService.exportExcel(periodParams);
      const blob = new Blob([res.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MegaTrix_Accounts_${summaryData?.period?.label || 'Report'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast({
        title: 'Excel Export Ready',
        message: 'Multi-tab financial workbook downloaded successfully.',
        type: 'success'
      });
    } catch (err) {
      console.error('[Export Excel] Error:', err);
      addToast({
        title: 'Export Failed',
        message: 'Could not generate Excel spreadsheet.',
        type: 'error'
      });
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const res = await AccountService.exportPdf(periodParams);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MegaTrix_Financial_Dossier_${summaryData?.period?.label || 'Report'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast({
        title: 'PDF Dossier Ready',
        message: 'Executive financial statement downloaded successfully.',
        type: 'success'
      });
    } catch (err) {
      console.error('[Export PDF] Error:', err);
      addToast({
        title: 'Export Failed',
        message: 'Could not generate PDF dossier.',
        type: 'error'
      });
    } finally {
      setExportingPdf(false);
    }
  };

  // Enforce access control guard for non-superadmin in UI
  if (!isSuperAdmin) {
    return (
      <div className="p-12 text-center text-zinc-500 font-mono text-xs space-y-3">
        <Lock className="w-8 h-8 text-rose-500 mx-auto" />
        <div className="text-white font-bold uppercase tracking-wider">Access Restricted</div>
        <p className="text-zinc-500">The Accounts Manager module requires Super Administrator privileges.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* ─── MASTER HEADER BANNER ────────────────────────────────────────── */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Module Title & Role Badge */}
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 inline-block" />
            <h1 className="text-base font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span>Accounts Manager &amp; Financial P&amp;L</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-purple-950 text-purple-300 border border-purple-800">
                Super Admin Restricted
              </span>
            </h1>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Consolidated organizational financial telemetry: Sales Inflow, Operating Outflow &amp; Net Profit Margin.
          </p>
        </div>

        {/* Global Export & Refresh Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Excel Export Button */}
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="px-3.5 py-2 bg-[#121E17] hover:bg-[#1A2E23] text-emerald-300 border border-emerald-800/80 text-xs font-mono font-bold uppercase flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            title="Download formatted multi-tab Excel spreadsheet with totals"
          >
            {exportingExcel ? (
              <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Export Excel (.xlsx)</span>
          </button>

          {/* PDF Export Button */}
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="px-3.5 py-2 bg-[#161D2E] hover:bg-[#1E2B47] text-blue-300 border border-blue-800/80 text-xs font-mono font-bold uppercase flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            title="Download executive PDF dossier"
          >
            {exportingPdf ? (
              <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowDownToLine className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span>Export PDF</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchSummary}
            className="p-2 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-400 hover:text-white border border-[#2B2B2B] text-xs font-mono cursor-pointer transition-colors"
            title="Refresh financial data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

        </div>

      </div>

      {/* ─── DATE RANGE PRESETS & FILTER BAR ─────────────────────────────── */}
      <div className="bg-[#080808] border border-[#222222] p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs font-mono">
        
        {/* Preset Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-zinc-500 mr-1" />
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={`px-3 py-1.5 border text-xs transition-colors cursor-pointer ${
                preset === p.id 
                  ? 'bg-blue-600 border-blue-500 text-white font-bold' 
                  : 'bg-[#0E0E0E] border-[#262626] text-zinc-400 hover:text-white hover:border-zinc-500'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Range Inputs */}
        {preset === 'custom' && (
          <form onSubmit={handleApplyCustomDates} className="flex items-center gap-2 pt-2 sm:pt-0">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2 py-1 bg-[#030303] border border-[#2B2B2B] text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
              required
            />
            <span className="text-zinc-600">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2 py-1 bg-[#030303] border border-[#2B2B2B] text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
            >
              Apply
            </button>
          </form>
        )}

        {/* Active Period Label Display */}
        {summaryData?.period?.label && (
          <div className="text-[11px] text-zinc-400 text-right shrink-0">
            Period: <strong className="text-white">{summaryData.period.label}</strong>
          </div>
        )}

      </div>

      {/* ─── SUB-TAB NAVIGATION ──────────────────────────────────────────── */}
      <div className="flex border-b border-[#1E1E1E] overflow-x-auto text-xs font-mono">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 border-b-2 font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'border-blue-500 text-white bg-blue-950/20'
              : 'border-transparent text-zinc-400 hover:text-white hover:bg-[#0A0A0A]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
          <span>Overview &amp; P&amp;L</span>
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2.5 border-b-2 font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'sales'
              ? 'border-emerald-500 text-white bg-emerald-950/20'
              : 'border-transparent text-zinc-400 hover:text-white hover:bg-[#0A0A0A]'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sales Ledger</span>
          {summaryData?.summary?.salesCount > 0 && (
            <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
              {summaryData.summary.salesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2.5 border-b-2 font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'expenses'
              ? 'border-rose-500 text-white bg-rose-950/20'
              : 'border-transparent text-zinc-400 hover:text-white hover:bg-[#0A0A0A]'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 text-rose-400" />
          <span>Expenses Ledger</span>
          {summaryData?.summary?.expenseCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-950 text-rose-300 border border-rose-800 text-[10px]">
              {summaryData.summary.expenseCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className={`px-4 py-2.5 border-b-2 font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'report'
              ? 'border-purple-500 text-white bg-purple-950/20'
              : 'border-transparent text-zinc-400 hover:text-white hover:bg-[#0A0A0A]'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-purple-400" />
          <span>Financial Statement</span>
        </button>
      </div>

      {/* ─── TAB CONTENT RENDERING ───────────────────────────────────────── */}
      {loading ? (
        <div className="p-16 text-center text-zinc-500 font-mono text-xs">
          Loading accounts data and aggregating financial statements...
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <AccountsOverviewTab 
              summary={summaryData?.summary} 
              trend={summaryData?.trend} 
            />
          )}

          {activeTab === 'sales' && (
            <SalesLedgerTab 
              periodParams={periodParams} 
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesLedgerTab 
              periodParams={periodParams} 
            />
          )}

          {activeTab === 'report' && (
            <FinancialReportTab 
              periodParams={periodParams}
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              exportingExcel={exportingExcel}
              exportingPdf={exportingPdf}
            />
          )}
        </>
      )}

    </div>
  );
};

export default AccountsManagerView;
