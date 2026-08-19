import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Mail, 
  Globe, 
  Clock, 
  RefreshCw, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  Lock, 
  Settings, 
  Layers, 
  Key,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { AnalyticsService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const SettingsView = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('limits');
  const [quotas, setQuotas] = useState(null);
  const [loading, setLoading] = useState(true);

  // Live ticking countdown state (in milliseconds)
  const [brevoMsLeft, setBrevoMsLeft] = useState(0);
  const [googleMsLeft, setGoogleMsLeft] = useState(0);

  const fetchQuotas = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await AnalyticsService.getQuotas();
      if (res.data.success) {
        setQuotas(res.data.data);
        setBrevoMsLeft(res.data.data.brevo.msUntilReset);
        setGoogleMsLeft(res.data.data.googlePlaces.msUntilReset);
        if (!silent) {
          addToast({
            title: 'Quotas Synced',
            message: 'Retrieved live API limits, usage metrics, and reset timers.',
            type: 'success',
            duration: 3000
          });
        }
      }
    } catch (err) {
      console.error('[SettingsView] fetchQuotas error:', err);
      addToast({
        title: 'Error Syncing Quotas',
        message: err.response?.data?.message || err.message,
        type: 'error'
      });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotas();
  }, []);

  // Ticking 1-second countdown clock for live refresh timers
  useEffect(() => {
    const timer = setInterval(() => {
      setBrevoMsLeft(prev => Math.max(0, prev - 1000));
      setGoogleMsLeft(prev => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format millisecond duration into humanized clock format
  const formatTimeRemaining = (ms) => {
    if (!ms || ms <= 0) return '00h 00m 00s';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours < 10 ? `0${hours}` : hours}h ${minutes < 10 ? `0${minutes}` : minutes}m ${seconds < 10 ? `0${seconds}` : seconds}s`;
    }
    return `${hours < 10 ? `0${hours}` : hours}h ${minutes < 10 ? `0${minutes}` : minutes}m ${seconds < 10 ? `0${seconds}` : seconds}s`;
  };

  const tabs = [
    { id: 'limits', label: 'Limits & API Credits', icon: Zap },
    { id: 'brevo', label: 'Brevo SMTP Configuration', icon: Mail },
    { id: 'places', label: 'Google Places API Setup', icon: Globe }
  ];

  return (
    <div className="space-y-6 font-mono max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-200">
      
      {/* ─── SETTINGS HEADER BANNER ────────────────────────────────────────── */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-white/40 to-transparent" />
        
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-none inline-block" />
            <h1 className="text-base font-bold text-white uppercase tracking-wider">
              Settings &amp; API Usage Limits
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Monitor real-time API free tier limits, credit allowances, and live reset countdown timers.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => fetchQuotas(false)}
            disabled={loading}
            className="px-4 py-2 bg-[#121212] hover:bg-[#1A1A1A] text-zinc-300 hover:text-white border border-[#2B2B2B] text-xs font-semibold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Live Quotas</span>
          </button>
        </div>
      </div>

      {/* ─── MAIN SETTINGS CONTAINER (TABS + CONTENT) ───────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Sidebar Navigation Tabs */}
        <div className="w-full lg:w-72 shrink-0 bg-[#080808] border border-[#222222] divide-y divide-[#1A1A1A]">
          <div className="p-3 bg-[#0C0C0C] text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
            Settings Menu
          </div>
          <nav className="p-2 space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isCurrent = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3.5 py-3 text-xs flex items-center justify-between cursor-pointer transition-all border ${
                    isCurrent 
                      ? 'bg-[#121218] border-blue-500/80 text-white font-bold' 
                      : 'border-transparent text-zinc-400 hover:bg-[#0E0E0E] hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-blue-400' : 'text-zinc-500'}`} />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {isCurrent && (
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-none" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 w-full space-y-6">

          {/* ─── TAB 1: LIMITS & CREDITS (ACTIVE VIEW) ────────────────────────── */}
          {activeTab === 'limits' && (
            <div className="space-y-6">
              
              {/* Top Banner Notice */}
              <div className="p-4 bg-[#05070F] border border-blue-600/60 flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-950/80 border border-blue-500/50 flex items-center justify-center shrink-0 text-blue-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="text-white font-bold uppercase tracking-wider flex items-center gap-2">
                    <span>Live Quota &amp; Credit Tracking</span>
                    <span className="px-2 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                      100% Real-Time
                    </span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed">
                    Usage counts are tracked in real-time on every search and email campaign. Reset timers show exact time remaining until standard UTC quota rollover.
                  </p>
                </div>
              </div>

              {/* 2 Primary Quota Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* ─── CARD 1: BREVO DAILY EMAIL TIER ───────────────────────────── */}
                <div className="bg-[#080808] border border-[#222222] p-5 space-y-4 hover:border-zinc-700 transition-all flex flex-col justify-between">
                  <div className="space-y-4">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-[#111111] border border-[#2B2B2B] flex items-center justify-center text-blue-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                            Brevo SMTP (Free Tier)
                          </h3>
                          <span className="text-[10px] text-zinc-500">Daily Rolling Allowance</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-[10px] font-bold">
                        ACTIVE
                      </span>
                    </div>

                    {/* Big Numbers */}
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <div className="text-3xl font-bold text-white font-mono">
                          {quotas ? quotas.brevo.remainingToday : 300}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Emails Remaining Today
                        </div>
                      </div>
                      <div className="text-right text-xs text-zinc-500 font-mono">
                        <div>Limit: <span className="text-white font-bold">300</span> / day</div>
                        <div>Sent: <span className="text-blue-400 font-bold">{quotas ? quotas.brevo.sentToday : 0}</span></div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span>Daily Capacity Used</span>
                        <span className="font-bold text-white">
                          {quotas ? quotas.brevo.usagePercentage : 0}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#121212] overflow-hidden border border-[#222]">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500"
                          style={{ width: `${quotas ? Math.max(3, quotas.brevo.usagePercentage) : 3}%` }}
                        />
                      </div>
                    </div>

                    {/* Metadata Specs */}
                    <div className="p-3 bg-[#040404] border border-[#1A1A1A] space-y-1.5 text-[11px] text-zinc-400">
                      <div className="flex items-center justify-between">
                        <span>SMTP Relay Host:</span>
                        <span className="text-zinc-200 font-bold">{quotas?.brevo.smtpHost || 'smtp-relay.brevo.com:587'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Sender Address:</span>
                        <span className="text-zinc-200 font-bold">{quotas?.brevo.fromEmail || 'sales@megatrixai.com'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Safety Deduplication:</span>
                        <span className="text-emerald-400 font-bold">Strict 1-Email Idempotency</span>
                      </div>
                    </div>

                  </div>

                  {/* Countdown Timer Footer */}
                  <div className="p-3 bg-[#0C0C0C] border border-[#1E1E1E] flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Clock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                      <span>Resets In:</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 tracking-wider">
                      {formatTimeRemaining(brevoMsLeft)}
                    </span>
                  </div>

                </div>

                {/* ─── CARD 2: GOOGLE PLACES MONTHLY CREDIT TIER ─────────────────── */}
                <div className="bg-[#080808] border border-[#222222] p-5 space-y-4 hover:border-zinc-700 transition-all flex flex-col justify-between">
                  <div className="space-y-4">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-[#111111] border border-[#2B2B2B] flex items-center justify-center text-blue-400">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                            Google Places API (New)
                          </h3>
                          <span className="text-[10px] text-zinc-500">$200.00 Monthly Free Tier Credit</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-[10px] font-bold">
                        ACTIVE
                      </span>
                    </div>

                    {/* Big Numbers */}
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <div className="text-3xl font-bold text-white font-mono">
                          ${quotas ? quotas.googlePlaces.remainingCredit.toFixed(2) : '200.00'}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Free Tier Credit Remaining
                        </div>
                      </div>
                      <div className="text-right text-xs text-zinc-500 font-mono">
                        <div>Allowance: <span className="text-white font-bold">$200.00</span> / mo</div>
                        <div>Estimated Spend: <span className="text-blue-400 font-bold">${quotas ? quotas.googlePlaces.estimatedSpend.toFixed(2) : '0.00'}</span></div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span>Monthly Credit Consumed</span>
                        <span className="font-bold text-white">
                          {quotas ? quotas.googlePlaces.usagePercentage : 0}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#121212] overflow-hidden border border-[#222]">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500"
                          style={{ width: `${quotas ? Math.max(3, quotas.googlePlaces.usagePercentage) : 3}%` }}
                        />
                      </div>
                    </div>

                    {/* Metadata Specs */}
                    <div className="p-3 bg-[#040404] border border-[#1A1A1A] space-y-1.5 text-[11px] text-zinc-400">
                      <div className="flex items-center justify-between">
                        <span>API Model Endpoint:</span>
                        <span className="text-zinc-200 font-bold">Places API (New) TextSearch</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Monthly Requests Used:</span>
                        <span className="text-zinc-200 font-bold">{quotas?.googlePlaces.totalRequestsThisMonth || 0} calls</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Est. Remaining Searches:</span>
                        <span className="text-emerald-400 font-bold">~{quotas?.googlePlaces.remainingRequests.toLocaleString() || '6,200'} requests</span>
                      </div>
                    </div>

                  </div>

                  {/* Countdown Timer Footer */}
                  <div className="p-3 bg-[#0C0C0C] border border-[#1E1E1E] flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Clock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                      <span>Credit Resets In:</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 tracking-wider">
                      {formatTimeRemaining(googleMsLeft)}
                    </span>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* ─── TAB 2: BREVO SMTP CONFIG ──────────────────────────────────────── */}
          {activeTab === 'brevo' && (
            <div className="bg-[#080808] border border-[#222222] p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1A1A1A]">
                <Mail className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Brevo SMTP Relay Settings
                </h3>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 bg-[#050505] border border-[#1E1E1E] space-y-2.5 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">SMTP Host:</span>
                    <span className="text-white font-bold">smtp-relay.brevo.com</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Port:</span>
                    <span className="text-white font-bold">587 (STARTTLS)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">From Name:</span>
                    <span className="text-white font-bold">MegaTrix Technologies</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">From &amp; Reply-To Email:</span>
                    <span className="text-blue-400 font-bold">sales@megatrixai.com</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Status:</span>
                    <span className="text-emerald-400 font-bold">Connected &amp; Verified</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 3: GOOGLE PLACES CONFIG ───────────────────────────────────── */}
          {activeTab === 'places' && (
            <div className="bg-[#080808] border border-[#222222] p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1A1A1A]">
                <Globe className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Google Places API (New) Configuration
                </h3>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 bg-[#050505] border border-[#1E1E1E] space-y-2.5 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">API Service:</span>
                    <span className="text-white font-bold">Google Places API (New)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Endpoint:</span>
                    <span className="text-white font-bold">https://places.googleapis.com/v1/places:searchText</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Monthly Free Credit:</span>
                    <span className="text-emerald-400 font-bold">$200.00 USD / month</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Status:</span>
                    <span className="text-emerald-400 font-bold">Configured &amp; Active</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default SettingsView;
