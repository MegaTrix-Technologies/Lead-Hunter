import React from 'react';
import { useLead } from '../../context/LeadContext';
import { 
  Compass, 
  PhoneCall, 
  Mail, 
  Database, 
  Kanban, 
  BarChart3, 
  Radio, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

const Navbar = () => {
  const { 
    activeView, 
    setActiveView, 
    statusCounts, 
    pagination, 
    fetchLeads, 
    loadingLeads,
    callingQueue 
  } = useLead();

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
    { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: null }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#262626] bg-[#000000]/95 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        
        {/* Brand & Identity */}
        <div className="flex items-center gap-6">
          <div 
            onClick={() => setActiveView('scraper')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative flex items-center justify-center w-9 h-9 bg-[#111111] border border-[#333333] group-hover:border-white transition-all">
              <img 
                src="/megatrix-icon.svg" 
                alt="MegaTrix Icon" 
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <span className="font-mono text-sm font-bold text-white tracking-tighter">MT</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm tracking-wider text-white uppercase">MegaTrix</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#171717] text-zinc-400 border border-[#333333]">LEADENGINE</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono tracking-tight">Outbound B2B Extraction & CRM</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 text-xs font-mono tracking-wide transition-all border ${
                    isActive 
                      ? 'bg-[#121212] text-white border-zinc-700 shadow-sm' 
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

        {/* Right Status & Actions */}
        <div className="flex items-center gap-3">
          {/* Active Status Pill */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-[#0A0A0A] border border-[#262626] text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-400">Database:</span>
            <span className="text-white font-medium">Atlas Live</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchLeads()}
            disabled={loadingLeads}
            title="Refresh Leads & Stats"
            className="p-2 border border-[#262626] bg-[#0A0A0A] hover:bg-[#171717] hover:border-zinc-500 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loadingLeads ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation */}
      <div className="md:hidden flex items-center overflow-x-auto px-4 py-2 border-t border-[#262626] bg-[#080808] gap-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono whitespace-nowrap border ${
                isActive 
                  ? 'bg-[#181818] text-white border-zinc-700' 
                  : 'text-zinc-400 border-transparent hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};

export default Navbar;
