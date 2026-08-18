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
  RefreshCw,
  Layers,
  PhoneOff
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
        Loading cross-dataset performance metrics...
      </div>
    );
  }

  if (!data) return null;

  const { kpis, statusDistribution, datasetPerformance = [], categoryStats, areaStats } = data;

  const statusColors = {
    'Uncontacted': 'bg-zinc-700',
    'Unreachable': 'bg-orange-500',
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
      <div className="bg-[#0A0A0A] border border-[#262626] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 inline-block" />
            Cross-Dataset Outreach &amp; Conversion Analytics
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Aggregated conversion funnels across {kpis.totalDatasets || 0} active datasets with campaign benchmarking.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="px-3.5 py-1.5 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-300 hover:text-white border border-[#2B2B2B] text-xs font-mono flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Total Datasets */}
        <div className="p-4 bg-[#0A0A0A] border border-[#262626]">
          <div className="flex items-center justify-between text-zinc-500 text-[10px] font-mono uppercase">
            <span>Datasets</span>
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-2">{kpis.totalDatasets || 0}</div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">Active campaigns</div>
        </div>

        {/* Total Leads */}
        <div className="p-4 bg-[#0A0A0A] border border-[#262626]">
          <div className="flex items-center justify-between text-zinc-500 text-[10px] font-mono uppercase">
            <span>Total Leads</span>
            <Users className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-2">{kpis.totalLeads}</div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">Verified businesses</div>
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

        {/* Unreachable (Retryable) */}
        <div className="p-4 bg-[#0A0A0A] border border-[#262626]">
          <div className="flex items-center justify-between text-orange-400 text-[10px] font-mono uppercase">
            <span>Unreachable</span>
            <PhoneOff className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-300 font-mono mt-2">{kpis.unreachableCount || 0}</div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">Retryable / No Answer</div>
        </div>

        {/* Conversion Rate */}
        <div className="p-4 bg-emerald-950/20 border border-emerald-800/50">
          <div className="flex items-center justify-between text-emerald-400 text-[10px] font-mono uppercase">
            <span>Win Rate</span>
            <Award className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 font-mono mt-2">{kpis.conversionRate}</div>
          <div className="text-[10px] text-emerald-500 font-mono mt-1">Lead/Sale closed</div>
        </div>

        {/* Proposals Emailed */}
        <div className="p-4 bg-[#0A0A0A] border border-[#262626]">
          <div className="flex items-center justify-between text-zinc-500 text-[10px] font-mono uppercase">
            <span>Proposals</span>
            <Mail className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300 font-mono mt-2">{kpis.totalEmailed}</div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">Emails dispatched</div>
        </div>

      </div>

      {/* ─── DATASET PERFORMANCE COMPARISON TABLE ───────────────────────────── */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              Dataset Performance Comparison
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">{datasetPerformance.length} Datasets Benchmarked</span>
        </div>

        {datasetPerformance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-zinc-500 uppercase text-[10px]">
                  <th className="pb-2.5">Dataset Name</th>
                  <th className="pb-2.5">Niche &amp; Area</th>
                  <th className="pb-2.5 text-center">Total Leads</th>
                  <th className="pb-2.5 text-center">Uncalled</th>
                  <th className="pb-2.5 text-center">Unreachable</th>
                  <th className="pb-2.5 text-center">Interested / Follow-up</th>
                  <th className="pb-2.5 text-center">Closed Deals</th>
                  <th className="pb-2.5 text-right">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {datasetPerformance.map(ds => (
                  <tr key={ds.id} className="hover:bg-[#121212] transition-colors">
                    <td className="py-3 font-semibold text-white">
                      <div>{ds.name}</div>
                      {ds.description && <div className="text-[10px] text-zinc-500 truncate max-w-xs">{ds.description}</div>}
                    </td>
                    <td className="py-3 text-zinc-400">
                      <span className="px-1.5 py-0.5 bg-[#141414] border border-[#222] text-[10px] text-zinc-300">
                        {ds.keyword}
                      </span>
                      <span className="text-[10px] text-zinc-500 ml-1">in {ds.area.split(',')[0]}</span>
                    </td>
                    <td className="py-3 text-center text-white font-bold">{ds.totalLeads}</td>
                    <td className="py-3 text-center text-blue-400">{ds.uncontacted}</td>
                    <td className="py-3 text-center text-orange-400">{ds.unreachable}</td>
                    <td className="py-3 text-center text-yellow-300">{ds.showsInterest + ds.followUp}</td>
                    <td className="py-3 text-center text-emerald-400 font-bold">{ds.converted}</td>
                    <td className="py-3 text-right text-emerald-300 font-bold">{ds.conversionRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-zinc-500 font-mono text-xs">
            No datasets available yet. Extract GMB profiles to generate datasets.
          </div>
        )}
      </div>

      {/* Outbound Calling Pipeline Status Distribution */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-6 space-y-4">
        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
          Global Call Status Pipeline Distribution
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
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-2">
          {Object.entries(statusDistribution).map(([status, count]) => (
            <div key={status} className="p-2.5 bg-[#050505] border border-[#1E1E1E]">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                <span className={`w-2 h-2 shrink-0 ${statusColors[status] || 'bg-zinc-600'}`} />
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
