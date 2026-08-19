import React from 'react';
import { useLead } from '../../context/LeadContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Compass, 
  PhoneCall, 
  Mail, 
  Database, 
  Kanban, 
  BarChart3, 
  RefreshCw, 
  Settings, 
  Zap,
  LogOut,
  ChevronDown
} from 'lucide-react';

const Navbar = () => {
  const { 
    activeView, 
    setActiveView, 
    pagination, 
    fetchLeads, 
    loadingLeads,
    callingQueue 
  } = useLead();

  const { user, logout } = useAuth();

  const navItems = [
    { id: 'scraper', label: 'GMB Extractor', icon: Compass, badge: null },
    { 
      id: 'workstation', 
      label: 'Cold Calling CRM', 
      icon: PhoneCall, 
      badge: callingQueue.length > 0 ? callingQueue.length : null,
      badgeColor: 'bg-blue-600'
    },
    { id: 'email', label: 'Email Proposals', icon: Mail, badge: null },
    { 
      id: 'crm', 
      label: 'Leads Database', 
      icon: Database, 
      badge: pagination.totalLeads > 0 ? pagination.totalLeads : null,
      badgeColor: 'bg-zinc-800'
    },
    { id: 'kanban', label: 'Sales Pipeline', icon: Kanban, badge: null },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: null },
    { id: 'settings', label: 'Settings', icon: Settings, badge: null }
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#000000] border-b border-[#1E1E1E]">
      
      {/* ─── TIER 1: Top Primary Header (Logo, User Avatar & Global Actions) ─── */}
      <div className="border-b border-[#1A1A1A] bg-[#000000]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          
          {/* Brand Logo - Standalone Without Any Box or Borders */}
          <div 
            onClick={() => setActiveView('scraper')}
            className="flex items-center gap-3 cursor-pointer select-none group py-1"
          >
            <img 
              src="/megatrix-icon.svg" 
              alt="MegaTrix" 
              className="h-7 w-auto object-contain transition-opacity group-hover:opacity-90"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="flex flex-col leading-none">
              <span className="font-mono font-bold text-sm tracking-widest text-white uppercase group-hover:text-zinc-200 transition-colors">
                MegaTrix
              </span>
              <span className="text-[9px] font-mono text-zinc-500 tracking-wider uppercase mt-0.5">
                LeadEngine &amp; CRM
              </span>
            </div>
          </div>

          {/* Right Area: Limits & Credits Button, User Avatar Profile, Sync & Sign Out Buttons */}
          <div className="flex items-center gap-2.5">
            
            {/* Quick Limits & Credits Action Button */}
            <button
              onClick={() => setActiveView('settings')}
              title="View API Free Tier Limits & Credit Refresh Timers"
              className={`px-3 py-1.5 border text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'settings' 
                  ? 'border-blue-500 bg-blue-950/40 text-blue-300 font-bold shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                  : 'border-[#222222] bg-[#0A0A0A] text-zinc-300 hover:text-white hover:border-zinc-500'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Limits &amp; Credits</span>
            </button>

            {/* Multi-User Tracking Avatar Badge */}
            <div 
              onClick={() => setActiveView('settings')}
              className="flex items-center gap-2.5 px-3 py-1.5 bg-[#0A0A0A] border border-[#222222] hover:border-zinc-700 transition-colors cursor-pointer select-none"
            >
              <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/50 text-blue-400 text-xs font-bold font-mono">
                M
                <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-500 rounded-full ring-1 ring-black" />
              </div>
              <div className="flex flex-col leading-none hidden md:flex">
                <span className="text-xs font-mono font-semibold text-white">
                  {user?.name || 'Sales Desk'}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 mt-0.5">
                  {user?.email || 'sales@megatrixai.com'}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-zinc-500 ml-1 hidden md:inline" />
            </div>

            {/* Global Refresh Button */}
            <button
              onClick={() => fetchLeads()}
              disabled={loadingLeads}
              title="Sync & Refresh Database"
              className="p-2 border border-[#222222] bg-[#0A0A0A] hover:bg-[#141414] hover:border-zinc-500 text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLeads ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            {/* Sign Out Button */}
            <button
              onClick={logout}
              title="Sign Out from MegaTrix"
              className="px-2.5 py-2 border border-[#222222] bg-[#0A0A0A] hover:bg-rose-950/40 hover:border-rose-700 text-zinc-400 hover:text-rose-300 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>

          </div>

        </div>
      </div>

      {/* ─── TIER 2: Secondary Process Navigation Sub-Header ─────────────────── */}
      <div className="bg-[#050505] border-b border-[#1C1C1C]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 text-xs font-mono tracking-wide transition-all whitespace-nowrap cursor-pointer border ${
                    isActive 
                      ? 'bg-[#121212] text-white border-zinc-700 font-semibold' 
                      : 'text-zinc-400 border-transparent hover:text-white hover:bg-[#0A0A0A] hover:border-zinc-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                  {item.badge !== null && (
                    <span className={`text-[10px] px-1.5 py-0.2 font-mono font-semibold text-white ${item.badgeColor || 'bg-zinc-800'}`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

    </header>
  );
};

export default Navbar;
