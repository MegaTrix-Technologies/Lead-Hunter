import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  Package,
  Landmark,
  LayoutDashboard,
  UserCheck,
  Briefcase,
  DollarSign,
  Menu,
  X
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

  const { user, logout, isSuperAdmin, isSalesAgent, isCloser, isDeveloper } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route/view change or resize
  const handleNavClick = (viewId) => {
    setActiveView(viewId);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null, visible: true },
    { 
      id: 'closer', 
      label: 'Closer Queue', 
      icon: UserCheck, 
      badge: null,
      visible: isCloser 
    },
    { 
      id: 'sales', 
      label: 'Sales Ledger', 
      icon: DollarSign, 
      badge: null,
      visible: isCloser || isSuperAdmin
    },
    { 
      id: 'projects', 
      label: 'Projects & Delivery', 
      icon: Briefcase, 
      badge: null,
      visible: isDeveloper || isSuperAdmin 
    },
    { 
      id: 'accounts', 
      label: 'Accounts Manager', 
      icon: Landmark, 
      badge: null, 
      visible: isSuperAdmin 
    },
    { 
      id: 'workstation', 
      label: 'Cold Calling CRM', 
      icon: PhoneCall, 
      badge: callingQueue.length > 0 ? callingQueue.length : null,
      badgeColor: 'bg-blue-600',
      visible: isSalesAgent || isSuperAdmin
    },
    { 
      id: 'scraper', 
      label: 'GMB Extractor', 
      icon: Compass, 
      badge: null,
      visible: isSalesAgent || isSuperAdmin
    },
    { 
      id: 'crm', 
      label: 'Leads Database', 
      icon: Database, 
      badge: pagination.totalLeads > 0 ? pagination.totalLeads : null,
      badgeColor: 'bg-zinc-800',
      visible: isSalesAgent || isSuperAdmin
    },
    { 
      id: 'kanban', 
      label: 'Sales Pipeline', 
      icon: Kanban, 
      badge: null,
      visible: isSalesAgent || isCloser || isSuperAdmin
    },
    { id: 'products', label: 'Product Catalog', icon: Package, badge: null, visible: true },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: null, visible: true },
    { id: 'settings', label: 'Settings', icon: Settings, badge: null, visible: true }
  ];

  const navItems = allNavItems.filter(item => item.visible !== false);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#000000] border-b border-[#1E1E1E]">
      
      {/* ─── TIER 1: Top Primary Header (Logo, User Avatar & Global Actions) ─── */}
      <div className="border-b border-[#1A1A1A] bg-[#000000]">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 flex items-center justify-between h-[64px] sm:h-[78px]">
          
          {/* Brand Logo - Standalone Without Any Box or Borders */}
          <div 
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer select-none py-1.5"
          >
            <img 
              src="/megatrix-icon.svg" 
              alt="MegaTrix Technologies" 
              className="h-8 sm:h-11 w-auto object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="flex flex-col justify-center whitespace-nowrap" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              <span className="font-bold text-xs sm:text-sm tracking-wider uppercase">
                <span className="text-white">MEGATRIX</span>{' '}
                <span className="text-blue-500">TECHNOLOGIES</span>
              </span>
              <span className="text-[8px] sm:text-[10px] text-zinc-500 tracking-wider uppercase mt-0.5 hidden xs:block" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                Customer Relationship Manager
              </span>
            </div>
          </div>

          {/* Right Area: Limits & Credits Button, User Avatar Profile, Sync & Sign Out Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            
            {/* Quick Limits & Credits Action Button (Super Admin Only) */}
            {isSuperAdmin && (
              <button
                onClick={() => handleNavClick('settings')}
                title="View API Free Tier Limits & Credit Refresh Timers"
                className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 border text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'settings' 
                    ? 'border-blue-500 bg-blue-950/40 text-blue-300 font-bold shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                    : 'border-[#222222] bg-[#0A0A0A] text-zinc-300 hover:text-white hover:border-zinc-500'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden md:inline">Limits &amp; Credits</span>
              </button>
            )}

            {/* Multi-User Tracking Avatar Badge */}
            <div 
              onClick={() => handleNavClick('settings')}
              className="flex items-center gap-2 sm:gap-2.5 px-2 sm:px-3.5 py-1.5 sm:py-2 bg-[#0A0A0A] border border-[#222222] hover:border-zinc-700 transition-colors cursor-pointer select-none"
            >
              <div className={`relative flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full border text-[11px] sm:text-xs font-bold font-mono ${
                isSuperAdmin 
                  ? 'bg-purple-950/50 border-purple-500/50 text-purple-300' 
                  : 'bg-blue-600/20 border-blue-500/50 text-blue-400'
              }`}>
                {(user?.name || 'S').charAt(0).toUpperCase()}
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full ring-1 ring-black" />
              </div>
              <div className="flex flex-col leading-none hidden md:flex">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-semibold text-white">
                    {user?.name || 'Sales Desk'}
                  </span>
                  <span className={`text-[9px] px-1 py-0.2 uppercase font-bold tracking-wider rounded ${
                    isSuperAdmin ? 'bg-purple-900/50 text-purple-300 border border-purple-800' : 'bg-blue-900/40 text-blue-300 border border-blue-800'
                  }`}>
                    {isSuperAdmin ? 'SUPER ADMIN' : 'AGENT'}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-zinc-500 mt-0.5">
                  {user?.email || 'sales@megatrixai.com'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 ml-1 hidden md:inline" />
            </div>

            {/* Global Refresh Button */}
            <button
              onClick={() => fetchLeads()}
              disabled={loadingLeads}
              title="Sync & Refresh Database"
              className="p-2 sm:p-2.5 border border-[#222222] bg-[#0A0A0A] hover:bg-[#141414] hover:border-zinc-500 text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLeads ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            {/* Sign Out Button (Desktop) */}
            <button
              onClick={logout}
              title="Sign Out from MegaTrix"
              className="hidden sm:flex px-3 py-2 border border-[#222222] bg-[#0A0A0A] hover:bg-rose-950/40 hover:border-rose-700 text-zinc-400 hover:text-rose-300 transition-all cursor-pointer items-center gap-1.5 text-xs font-mono"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sign Out</span>
            </button>

            {/* Mobile Hamburger Drawer Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 sm:hidden border border-[#222222] bg-[#0A0A0A] text-zinc-300 hover:text-white hover:border-zinc-500 cursor-pointer"
              title="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4 text-rose-400" /> : <Menu className="w-4 h-4 text-blue-400" />}
            </button>

          </div>

        </div>
      </div>

      {/* ─── TIER 2: Secondary Process Navigation Sub-Header (Scrollable Bar) ─── */}
      <div className="bg-[#050505] border-b border-[#1C1C1C]">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6">
          <nav className="flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none touch-pan-x">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-xs font-mono tracking-wide transition-all whitespace-nowrap cursor-pointer border ${
                    isActive 
                      ? 'bg-[#121212] text-white border-zinc-700 font-semibold shadow-sm' 
                      : 'text-zinc-400 border-transparent hover:text-white hover:bg-[#0A0A0A] hover:border-zinc-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                  {item.badge !== null && (
                    <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 font-mono font-semibold text-white ${item.badgeColor || 'bg-zinc-800'}`}>
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

      {/* ─── MOBILE SLIDE-OVER NAVIGATION DRAWER ────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[9999] sm:hidden bg-black/95 backdrop-blur-md flex flex-col font-mono animate-in fade-in duration-150">
          
          {/* Drawer Top Bar */}
          <div className="p-4 border-b border-[#222222] bg-[#0A0A0A] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/megatrix-icon.svg" alt="MegaTrix" className="h-7 w-auto" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                MegaTrix Workspace
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-white border border-[#2B2B2B] bg-[#121212]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User Status Card */}
          <div className="p-4 bg-[#080808] border-b border-[#1A1A1A] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs ${
                isSuperAdmin 
                  ? 'bg-purple-950 border-purple-500 text-purple-300' 
                  : 'bg-blue-950 border-blue-500 text-blue-300'
              }`}>
                {(user?.name || 'S').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-bold text-white">{user?.name || 'Desk User'}</div>
                <div className="text-[10px] text-zinc-500">{user?.email || 'sales@megatrixai.com'}</div>
              </div>
            </div>
            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
              isSuperAdmin ? 'bg-purple-900/60 text-purple-300 border border-purple-800' : 'bg-blue-900/60 text-blue-300 border border-blue-800'
            }`}>
              {isSuperAdmin ? 'SUPER ADMIN' : 'AGENT'}
            </span>
          </div>

          {/* Navigation Links Grid */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="text-[10px] text-zinc-500 uppercase px-2 py-1">CRM Modules &amp; Tools</div>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full p-3 flex items-center justify-between text-xs transition-colors border ${
                    isActive
                      ? 'bg-[#14141E] text-white border-blue-600 font-bold'
                      : 'bg-[#0A0A0A] text-zinc-300 border-[#1C1C1C] hover:bg-[#121212]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-zinc-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span className={`text-[10px] px-2 py-0.5 font-bold ${item.badgeColor || 'bg-zinc-800'} text-white`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Drawer Bottom Actions */}
          <div className="p-4 border-t border-[#222222] bg-[#0A0A0A] space-y-2">
            <button
              onClick={logout}
              className="w-full py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 text-xs font-bold uppercase flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sign Out from Workspace</span>
            </button>
            <div className="text-center text-[10px] text-zinc-600 pt-1">
              MegaTrix Technologies &copy; 2026
            </div>
          </div>

        </div>
      )}

    </header>
  );
};

export default Navbar;
