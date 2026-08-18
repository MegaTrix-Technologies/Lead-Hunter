import React, { useState, useEffect } from 'react';
import { useLead } from '../../context/LeadContext';
import { LeadService } from '../../services/api';
import RatingStars from '../common/RatingStars';
import { PhoneCall, Mail, Phone, Globe, ChevronRight, UserCheck } from 'lucide-react';

const KanbanPipeline = () => {
  const { updateCallStatus, setCallingQueue, setActiveQueueIndex, setActiveView, setIsCampaignModalOpen, setSelectedLeadIds } = useLead();
  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const columns = [
    { id: 'Uncontacted', title: 'Uncontacted', color: 'border-zinc-700 bg-zinc-900/30' },
    { id: 'Receptionist', title: 'Receptionist / Gatekeeper', color: 'border-amber-800/60 bg-amber-950/20' },
    { id: 'IVR', title: 'IVR Switchboard', color: 'border-purple-800/60 bg-purple-950/20' },
    { id: 'Follow Up', title: 'Follow-Up Scheduled', color: 'border-yellow-700/60 bg-yellow-950/20' },
    { id: 'Shows Interest', title: 'Shows Interest', color: 'border-blue-800/60 bg-blue-950/20' },
    { id: 'Lead / Sale', title: 'Deal Won / Sale', color: 'border-emerald-600/80 bg-emerald-950/30 border-glow-green' },
    { id: 'Do Not Call', title: 'Do Not Call (DNC)', color: 'border-rose-900/60 bg-rose-950/20' }
  ];

  const fetchKanbanLeads = async () => {
    setLoading(true);
    try {
      const res = await LeadService.getLeads({ limit: 200 });
      if (res.data.success) {
        setAllLeads(res.data.data);
      }
    } catch (err) {
      console.error('Error loading kanban leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKanbanLeads();
  }, []);

  const handleStageChange = async (leadId, newStatus) => {
    await updateCallStatus(leadId, newStatus, `Stage shifted to ${newStatus}`);
    setAllLeads(prev => prev.map(l => l._id === leadId ? { ...l, callStatus: newStatus } : l));
  };

  const handleDial = (lead) => {
    setCallingQueue([lead]);
    setActiveQueueIndex(0);
    setActiveView('workstation');
  };

  return (
    <div className="space-y-6">
      
      {/* Pipeline Header */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 inline-block" />
            Outbound Calling Pipeline &amp; Conversion Board
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Real-time stage tracking across qualification stages, gatekeepers, callbacks, and closed deals.
          </p>
        </div>

        <button
          onClick={fetchKanbanLeads}
          className="px-4 py-2 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-300 hover:text-white border border-[#2B2B2B] text-xs font-mono"
        >
          Refresh Board
        </button>
      </div>

      {/* Kanban Horizontal Scrollable Board */}
      <div className="flex gap-4 overflow-x-auto pb-6 min-h-[720px]">
        {columns.map(col => {
          const colLeads = allLeads.filter(l => l.callStatus === col.id);

          return (
            <div
              key={col.id}
              className="w-80 shrink-0 bg-[#080808] border border-[#222222] flex flex-col h-[720px]"
            >
              {/* Column Header */}
              <div className={`p-3 border-b border-[#222222] ${col.color} flex items-center justify-between`}>
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider truncate">
                  {col.title}
                </h3>
                <span className="px-2 py-0.5 bg-black/70 text-white border border-white/20 text-[10px] font-mono font-bold">
                  {colLeads.length}
                </span>
              </div>

              {/* Cards Stream */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {colLeads.map(lead => (
                  <div
                    key={lead._id}
                    className="p-3.5 bg-[#0D0D0D] border border-[#222222] hover:border-zinc-500 transition-all space-y-2.5 group"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-white font-mono truncate group-hover:text-blue-400">
                        {lead.businessName}
                      </h4>
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mt-0.5">
                        <span>{lead.category}</span>
                        <RatingStars rating={lead.rating} reviewCount={lead.reviewCount} />
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-zinc-400 truncate flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-zinc-600" />
                      <span>{lead.phoneNumber || 'No phone'}</span>
                    </div>

                    {lead.followUpDate && col.id === 'Follow Up' && (
                      <div className="text-[10px] font-mono text-yellow-300 bg-yellow-950/30 p-1 border border-yellow-800/40 truncate">
                        Callback: {new Date(lead.followUpDate).toLocaleString()}
                      </div>
                    )}

                    {/* Quick Move & Action Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#1C1C1C] text-xs">
                      <button
                        onClick={() => handleDial(lead)}
                        className="px-2 py-1 bg-[#141414] hover:bg-white hover:text-black text-zinc-400 border border-[#262626] text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open</span>
                      </button>

                      {/* Quick Shift Dropdown */}
                      <select
                        value={lead.callStatus}
                        onChange={(e) => handleStageChange(lead._id, e.target.value)}
                        className="text-[10px] font-mono bg-black border border-zinc-700 text-zinc-300 p-1 focus:outline-none cursor-pointer"
                      >
                        {columns.map(c => (
                          <option key={c.id} value={c.id}>Move: {c.title.split(' ')[0]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

                {colLeads.length === 0 && (
                  <div className="p-8 text-center text-zinc-700 font-mono text-xs">
                    Empty Stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default KanbanPipeline;
