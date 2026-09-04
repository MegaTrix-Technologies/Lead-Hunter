import React, { useState, useEffect } from 'react';
import { DashboardService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLead } from '../../context/LeadContext';
import { 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  Briefcase, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Search, 
  X, 
  CheckCircle2, 
  RefreshCw, 
  ArrowUpRight, 
  Layers,
  Award,
  ChevronRight
} from 'lucide-react';

const colorStyles = {
  emerald: {
    border: 'border-emerald-600/70 hover:border-emerald-500',
    topBar: 'bg-emerald-500',
    badge: 'bg-emerald-950/40 border-emerald-800 text-emerald-300',
    text: 'text-emerald-300',
    iconBg: 'bg-emerald-950/40 text-emerald-400'
  },
  rose: {
    border: 'border-rose-600/70 hover:border-rose-500',
    topBar: 'bg-rose-500',
    badge: 'bg-rose-950/40 border-rose-800 text-rose-300',
    text: 'text-rose-300',
    iconBg: 'bg-rose-950/40 text-rose-400'
  },
  blue: {
    border: 'border-blue-600/70 hover:border-blue-500',
    topBar: 'bg-blue-500',
    badge: 'bg-blue-950/40 border-blue-800 text-blue-300',
    text: 'text-blue-300',
    iconBg: 'bg-blue-950/40 text-blue-400'
  },
  amber: {
    border: 'border-amber-600/70 hover:border-amber-500',
    topBar: 'bg-amber-500',
    badge: 'bg-amber-950/40 border-amber-800 text-amber-300',
    text: 'text-amber-300',
    iconBg: 'bg-amber-950/40 text-amber-400'
  },
  purple: {
    border: 'border-purple-600/70 hover:border-purple-500',
    topBar: 'bg-purple-500',
    badge: 'bg-purple-950/40 border-purple-800 text-purple-300',
    text: 'text-purple-300',
    iconBg: 'bg-purple-950/40 text-purple-400'
  }
};

const DashboardView = () => {
  const { user, isSuperAdmin } = useAuth();
  const { setActiveView } = useLead();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [drillSearch, setDrillSearch] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await DashboardService.getDashboard();
      if (res.data?.success) {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const cards = dashboardData?.cards || [];
  const userRoles = dashboardData?.roles || [];

  // Filter drilldown items by search
  const drillItems = selectedCard?.drillDown || [];
  const filteredDrill = drillItems.filter(item => {
    const title = (item.title || '').toLowerCase();
    const sub = (item.subtitle || '').toLowerCase();
    const s = drillSearch.toLowerCase();
    return title.includes(s) || sub.includes(s);
  });

  return (
    <div className="space-y-6 font-mono">
      
      {/* ─── DASHBOARD HEADER BANNER ────────────────────────────────────────── */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 inline-block" />
            <h1 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Operational Performance Dashboard</span>
              <div className="flex items-center gap-1">
                {userRoles.map((r, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-zinc-900 text-zinc-300 border border-zinc-700">
                    {r.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Role-tailored telemetry, live commission figures &amp; interactive drill-down audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            className="p-2 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-400 hover:text-white border border-[#2B2B2B] text-xs cursor-pointer transition-colors"
            title="Refresh dashboard stats"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── METRIC KPI CARDS (CLICKABLE FOR DRILLDOWN) ──────────────────────── */}
      {loading ? (
        <div className="p-16 text-center text-zinc-500 text-xs">
          Aggregating telemetry &amp; calculating role earnings...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map(card => {
            const theme = colorStyles[card.color] || colorStyles.blue;

            return (
              <div
                key={card.id}
                onClick={() => {
                  setSelectedCard(card);
                  setDrillSearch('');
                }}
                className={`p-4 bg-[#0A0A0A] border relative overflow-hidden transition-all cursor-pointer group select-none shadow-sm ${theme.border}`}
              >
                {/* Top Colored Edge */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${theme.topBar}`} />
                
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="uppercase tracking-wider font-semibold truncate pr-2">{card.label}</span>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500 group-hover:text-white transition-colors shrink-0">
                    <span>Inspect</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </div>
                </div>

                <div className={`text-2xl font-bold mt-2.5 truncate ${theme.text}`}>
                  {card.value}
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-3 pt-2.5 border-t border-[#181818]">
                  <span className="truncate">{card.subtext}</span>
                  <span className="text-[10px] text-zinc-500 shrink-0 group-hover:underline">
                    {card.drillDown?.length || 0} Records
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── QUICK WORKFLOW NAVIGATION LINKS ───────────────────────────────── */}
      <div className="bg-[#080808] border border-[#222222] p-4 flex items-center justify-between flex-wrap gap-3 text-xs">
        <span className="text-zinc-500 text-[11px] uppercase">Direct Operation Fastpaths:</span>
        <div className="flex items-center gap-2 flex-wrap">
          {isSuperAdmin && (
            <button
              onClick={() => setActiveView('accounts')}
              className="px-3 py-1.5 bg-[#121212] hover:bg-[#1A1A1A] border border-[#2A2A2A] text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              Accounts Manager &amp; P&amp;L →
            </button>
          )}
          {(isSuperAdmin || userRoles.includes('sales_closer')) && (
            <button
              onClick={() => setActiveView('closer')}
              className="px-3 py-1.5 bg-[#121212] hover:bg-[#1A1A1A] border border-[#2A2A2A] text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              Closer Queue →
            </button>
          )}
          {(isSuperAdmin || userRoles.includes('developer')) && (
            <button
              onClick={() => setActiveView('projects')}
              className="px-3 py-1.5 bg-[#121212] hover:bg-[#1A1A1A] border border-[#2A2A2A] text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              Projects &amp; Delivery →
            </button>
          )}
          <button
            onClick={() => setActiveView('workstation')}
            className="px-3 py-1.5 bg-[#121212] hover:bg-[#1A1A1A] border border-[#2A2A2A] text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            Cold Calling CRM →
          </button>
        </div>
      </div>

      {/* ─── INTERACTIVE DRILLDOWN MODAL ────────────────────────────────────── */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#090909] border border-[#2B2B2B] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-4 bg-[#0E0E0E] border-b border-[#202020] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 ${colorStyles[selectedCard.color]?.topBar || 'bg-blue-500'}`} />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {selectedCard.label} — Drill-Down Records
                  </h3>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Showing all underlying transactions &amp; details ({drillItems.length} total entries)
                </p>
              </div>

              <button
                onClick={() => setSelectedCard(null)}
                className="p-1 text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search filter in modal */}
            <div className="p-3 border-b border-[#181818] bg-black">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={drillSearch}
                  onChange={(e) => setDrillSearch(e.target.value)}
                  placeholder="Filter records by client, description, or detail..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#0A0A0A] border border-[#222222] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white"
                />
              </div>
            </div>

            {/* Scrollable Records List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#151515] p-2">
              {filteredDrill.length > 0 ? (
                filteredDrill.map((rec, i) => (
                  <div key={i} className="p-3 hover:bg-[#111111] transition-colors flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-2">
                        <span>{rec.title}</span>
                        {rec.status && (
                          <span className="px-1.5 py-0.2 bg-[#1A1A1A] border border-[#2A2A2A] text-[9px] text-zinc-400 uppercase">
                            {rec.status}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                        {rec.subtitle}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-emerald-400">
                        {rec.amount}
                      </div>
                      {rec.date && (
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {new Date(rec.date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-zinc-500 text-xs">
                  No records match the filter criteria.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#0E0E0E] border-t border-[#202020] flex items-center justify-between text-xs">
              <span className="text-zinc-500 text-[11px]">
                Active Metric Total: <strong className="text-white">{selectedCard.value}</strong>
              </span>
              <button
                onClick={() => setSelectedCard(null)}
                className="px-4 py-1.5 bg-white text-black hover:bg-zinc-200 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Close Audit View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardView;
