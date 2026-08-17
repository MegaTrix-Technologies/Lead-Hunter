import React, { useState, useEffect } from 'react';
import { AnalyticsService } from '../../services/api';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  PhoneCall, 
  Mail, 
  ShieldCheck, 
  Target, 
  Award,
  RefreshCw
} from 'lucide-react';

const AnalyticsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await AnalyticsService.getAnalytics();
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-zinc-500 font-mono text-xs">
        Loading performance metrics...
      </div>
    );
  }

  if (!data) return null;

  const { kpis, statusDistribution, categoryStats, areaStats } = data;

  const statusColors = {
    'Uncontacted': 'bg-zinc-700',
    'IVR': 'bg-purple-500',
    'Receptionist': 'bg-amber-500',
    'Do Not Call': 'bg-rose-500',
    'Shows Interest': 'bg-blue-500',
    'Follow Up': 'bg-yellow-400',
    'Lead / Sale': 'bg-emerald-400'
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 inline-block" />
            Executive Outreach &amp; Conversion Analytics
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Real-time pipeline yield, conversion funnels, email delivery rates, and niche performance.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="px-3.5 py-1.5 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-300 hover:text-white border border-[#2B2B2B] text-xs font-mono flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Total Database Leads */}
        <div className="p-4 bg-[#0A0A0A] border border-[#262626]">
          <div className="flex items-center justify-between text-zinc-500 text-[10px] font-mono uppercase">
            <span>Total Leads</span>
            <Users className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-2">{kpis.totalLeads}</div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">Extracted &amp; verified</div>
        </div>

        {/* Total Contacted */}
        <div className="p-4 bg-[#0A0A0A] border border-[#262626]">
          <div className="flex items-center justify-between text-zinc-500 text-[10px] font-mono uppercase">
            <span>Contacted</span>
            <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400 font-mono mt-2">{kpis.totalContacted}</div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">Dialed in queue</div>
        </div>

        {/* Conversion Rate */}
        <div className="p-4 bg-emerald-950/20 border border-emerald-800/50">
          <div className="flex items-center justify-between text-emerald-400 text-[10px] font-mono uppercase">
            <span>Closed Deals</span>
            <Award className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 font-mono mt-2">{kpis.conversionRate}</div>
          <div className="text-[10px] text-emerald-500 font-mono mt-1">Lead/Sale closed</div>
        </div>

        {/* Engagement Rate */}
        <div className="p-4 bg-blue-950/20 border border-blue-800/50">
          <div className="flex items-center justify-between text-blue-400 text-[10px] font-mono uppercase">
            <span>Engage Rate</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-300 font-mono mt-2">{kpis.interestRate}</div>
          <div className="text-[10px] text-blue-500 font-mono mt-1">Interest + Follow-up</div>
        </div>

        {/* Total Emailed */}
        <div className="p-4 bg-[#0A0A0A] border border-[#262626]">
          <div className="flex items-center justify-between text-zinc-500 text-[10px] font-mono uppercase">
            <span>Proposals</span>
            <Mail className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300 font-mono mt-2">{kpis.totalEmailed}</div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">Proposals dispatched</div>
        </div>

        {/* Safety Capped */}
        <div className="p-4 bg-[#0A0A0A] border border-[#262626]">
          <div className="flex items-center justify-between text-zinc-500 text-[10px] font-mono uppercase">
            <span>Safety Capped</span>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 font-mono mt-2">{kpis.safetyCappedLeads}</div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">&ge;3 proposals (Blocked)</div>
        </div>

      </div>

      {/* Outbound Calling Pipeline Status Distribution */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-6 space-y-4">
        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
          Call Status Pipeline Distribution
        </h3>

        {/* Visual Multi-Segment Bar */}
        <div className="w-full h-4 bg-black border border-[#2B2B2B] flex overflow-hidden">
          {Object.entries(statusDistribution).map(([status, count]) => {
            if (count === 0) return null;
            const pct = kpis.totalLeads > 0 ? (count / kpis.totalLeads) * 100 : 0;
            return (
              <div
                key={status}
                className={`${statusColors[status] || 'bg-zinc-600'} transition-all`}
                style={{ width: `${pct}%` }}
                title={`${status}: ${count} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        {/* Status Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
          {Object.entries(statusDistribution).map(([status, count]) => (
            <div key={status} className="p-2.5 bg-[#050505] border border-[#1E1E1E]">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                <span className={`w-2 h-2 ${statusColors[status] || 'bg-zinc-600'}`} />
                <span className="truncate">{status}</span>
              </div>
              <div className="text-sm font-bold text-white font-mono mt-1">{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown & Geo Distribution Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Performing Categories */}
        <div className="bg-[#0A0A0A] border border-[#262626] p-5 space-y-4">
          <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
            Niche Performance Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-zinc-500 uppercase text-[10px]">
                  <th className="pb-2">Niche Category</th>
                  <th className="pb-2">Total Leads</th>
                  <th className="pb-2 text-right">Closed Deals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {categoryStats.map(cat => (
                  <tr key={cat._id} className="hover:bg-[#121212]">
                    <td className="py-2.5 text-white font-semibold">{cat._id}</td>
                    <td className="py-2.5 text-zinc-400">{cat.total}</td>
                    <td className="py-2.5 text-right text-emerald-400 font-bold">{cat.converted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Geographic Area Breakdown */}
        <div className="bg-[#0A0A0A] border border-[#262626] p-5 space-y-4">
          <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
            Geographic Market Distribution
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-zinc-500 uppercase text-[10px]">
                  <th className="pb-2">Location Area</th>
                  <th className="pb-2">Leads</th>
                  <th className="pb-2 text-right">Engaged Pipeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {areaStats.map(area => (
                  <tr key={area._id} className="hover:bg-[#121212]">
                    <td className="py-2.5 text-white font-semibold">{area._id}</td>
                    <td className="py-2.5 text-zinc-400">{area.total}</td>
                    <td className="py-2.5 text-right text-blue-400 font-bold">{area.interested}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};

export default AnalyticsDashboard;
