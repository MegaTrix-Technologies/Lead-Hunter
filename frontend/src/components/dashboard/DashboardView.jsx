import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  ArrowLeft,
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedCard(null);
      }
    };
    if (selectedCard) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [selectedCard]);

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

      {/* ─── FULL-WINDOW INTERACTIVE DRILLDOWN WORKSTATION (Portal) ─────────── */}
      {selectedCard && createPortal(
        <div className="fixed inset-0 z-[9999] bg-[#000000] flex flex-col w-screen h-screen overflow-hidden font-mono">
          
          {/* Compact Header Bar */}
          <div className="px-4 sm:px-6 py-3 bg-[#0A0A0A] border-b border-[#202020] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedCard(null)}
                className="px-3 py-1.5 bg-[#121212] hover:bg-[#1C1C1C] text-zinc-300 hover:text-white border border-[#2B2B2B] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                title="Back to Dashboard [Esc]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Back</span>
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 shrink-0 ${colorStyles[selectedCard.color]?.topBar || 'bg-blue-500'}`} />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider truncate">
                  {selectedCard.label}
                </h2>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-[#161616] text-zinc-300 border border-[#2A2A2A] shrink-0">
                  {drillItems.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3 py-1.5 bg-[#101010] border border-[#242424] text-xs text-zinc-400 items-center gap-1.5 hidden sm:flex">
                <span>Total:</span>
                <strong className="text-white text-sm">{selectedCard.value}</strong>
              </div>
              <button
                onClick={() => setSelectedCard(null)}
                className="p-1.5 text-zinc-500 hover:text-white bg-[#141414] hover:bg-[#1E1E1E] border border-[#2A2A2A] cursor-pointer transition-colors"
                title="Close [Esc]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-4 sm:px-6 py-2 border-b border-[#1A1A1A] bg-[#050505] flex items-center justify-between gap-3 shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2" />
              <input
                type="text"
                value={drillSearch}
                onChange={(e) => setDrillSearch(e.target.value)}
                placeholder="Search records..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#000000] border border-[#262626] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
            <span className="text-[11px] text-zinc-500 shrink-0">
              <strong className="text-zinc-300">{filteredDrill.length}</strong> / {drillItems.length}
            </span>
          </div>

          {/* Records Stream */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 space-y-1.5 bg-[#000000]">
            <div className="max-w-[1600px] mx-auto space-y-1.5">
              {filteredDrill.length > 0 ? (
                filteredDrill.map((rec, i) => (
                  <div 
                    key={i} 
                    className="px-4 py-3 bg-[#080808] hover:bg-[#0E0E0E] border border-[#1E1E1E] hover:border-[#333333] transition-all flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                        <span>{rec.title}</span>
                        {rec.status && (
                          <span className="px-1.5 py-0.5 bg-[#141414] border border-[#2A2A2A] text-[10px] text-zinc-300 uppercase font-bold tracking-wider shrink-0">
                            {rec.status}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 truncate mt-0.5">
                        {rec.subtitle}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end">
                      <div className="text-sm font-bold font-mono text-emerald-400">
                        {rec.amount}
                      </div>
                      {rec.date && (
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {new Date(rec.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-zinc-500 text-xs bg-[#080808] border border-[#1E1E1E]">
                  No records match the filter criteria.
                </div>
              )}
            </div>
          </div>

          {/* Slim Footer */}
          <div className="px-4 sm:px-6 py-2 bg-[#0A0A0A] border-t border-[#202020] flex items-center justify-between text-xs shrink-0">
            <span className="text-zinc-600 text-[10px]">
              MegaTrix Technologies &bull; Audit Engine
            </span>
            <button
              onClick={() => setSelectedCard(null)}
              className="px-4 py-1 bg-white text-black hover:bg-zinc-200 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
            >
              Close [Esc]
            </button>
          </div>

        </div>,
        document.body
      )}

    </div>
  );
};

export default DashboardView;
