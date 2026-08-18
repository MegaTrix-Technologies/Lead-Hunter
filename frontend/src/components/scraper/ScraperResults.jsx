import React from 'react';
import { useLead } from '../../context/LeadContext';
import LeadCard from './LeadCard';
import Pagination from '../common/Pagination';
import { Send, PhoneCall, CheckSquare, Square, Filter, Database, AlertCircle, Layers } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const ScraperResults = () => {
  const { 
    leads, 
    loadingLeads, 
    pagination, 
    fetchLeads, 
    lastScrapeStats, 
    selectedLeadIds, 
    setSelectedLeadIds,
    setIsCampaignModalOpen,
    setActiveView,
    setCallingQueue,
    setActiveQueueIndex
  } = useLead();

  const { addToast } = useToast();

  const handleSelectAllOnPage = () => {
    if (selectedLeadIds.length === leads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map(l => l._id));
    }
  };

  const handleToggleSelect = (leadId) => {
    if (selectedLeadIds.includes(leadId)) {
      setSelectedLeadIds(prev => prev.filter(id => id !== leadId));
    } else {
      setSelectedLeadIds(prev => [...prev, leadId]);
    }
  };

  const handleBulkSendProposals = () => {
    if (selectedLeadIds.length === 0) {
      // Auto-select all current page leads
      setSelectedLeadIds(leads.map(l => l._id));
    }
    setIsCampaignModalOpen(true);
  };

  const handleLaunchColdCalling = () => {
    let queueToLoad = [];

    if (selectedLeadIds.length > 0) {
      // Load ONLY the explicitly selected profiles
      queueToLoad = leads.filter(l => selectedLeadIds.includes(l._id));
    } else {
      // If none selected, load current page batch
      queueToLoad = leads;
    }
    
    if (queueToLoad.length === 0) {
      addToast({
        title: 'No Profiles Available',
        message: 'Please extract leads or select profiles to launch the Cold Calling CRM.',
        type: 'info'
      });
      return;
    }

    setCallingQueue(queueToLoad);
    setActiveQueueIndex(0);
    setActiveView('workstation');

    addToast({
      title: 'Workstation Active',
      message: `Loaded ${queueToLoad.length} selected profile(s) into Cold Calling CRM.`,
      type: 'success'
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Dataset Overview Stats Banner */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Left Counters */}
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-none shrink-0" />
            <div className="text-xs font-mono">
              <span className="text-zinc-400">Total Leads in DB:</span>{' '}
              <span className="text-white font-bold text-sm">{pagination.totalLeads}</span>
            </div>
          </div>

          {lastScrapeStats && (
            <>
              <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />
              <div className="text-xs font-mono">
                <span className="text-zinc-400">Latest Batch Extracted:</span>{' '}
                <span className="text-emerald-400 font-bold">{lastScrapeStats.totalQualified} Qualified</span>{' '}
                <span className="text-zinc-500">/ {lastScrapeStats.totalExtracted} Raw</span>
              </div>
              <div className="text-xs font-mono text-zinc-500">
                ({lastScrapeStats.totalExcluded} Terminal/Duplicates Filtered)
              </div>
            </>
          )}
        </div>

        {/* Action Triggers Bar */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          
          {/* Select All on Page */}
          <button
            type="button"
            onClick={handleSelectAllOnPage}
            className="px-3 py-2 text-xs font-mono text-zinc-300 bg-[#121212] border border-[#262626] hover:text-white hover:border-zinc-500 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {selectedLeadIds.length === leads.length && leads.length > 0 ? (
              <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-zinc-500" />
            )}
            <span>Select All ({selectedLeadIds.length})</span>
          </button>

          {/* Trigger 1: Send Proposal (Bulk Email) */}
          <button
            type="button"
            onClick={handleBulkSendProposals}
            disabled={leads.length === 0}
            className="px-4 py-2 text-xs font-mono font-semibold text-white bg-blue-600 hover:bg-blue-500 border border-blue-500 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Proposal (Bulk Email)</span>
          </button>

          {/* Trigger 2: Launch Cold Calling Engine */}
          <button
            type="button"
            onClick={handleLaunchColdCalling}
            disabled={leads.length === 0}
            className="px-4 py-2 text-xs font-mono font-semibold text-black bg-white hover:bg-zinc-200 border border-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-md"
          >
            <Layers className="w-3.5 h-3.5 text-black" />
            <span>
              {selectedLeadIds.length > 0 
                ? `Launch Calling CRM (${selectedLeadIds.length} Selected)` 
                : 'Launch Calling CRM (All on Page)'}
            </span>
          </button>

        </div>
      </div>

      {/* Grid of Leads (Strictly 10 profiles per page) */}
      {loadingLeads ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-5 bg-[#0A0A0A] border border-[#222222] animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="w-3/4 h-4 bg-zinc-800" />
                  <div className="w-1/2 h-3 bg-zinc-800" />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <div className="w-full h-8 bg-zinc-900" />
                <div className="w-full h-8 bg-zinc-900" />
              </div>
            </div>
          ))}
        </div>
      ) : leads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leads.map(lead => (
            <LeadCard
              key={lead._id}
              lead={lead}
              isSelected={selectedLeadIds.includes(lead._id)}
              onToggleSelect={handleToggleSelect}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[#0A0A0A] border border-[#262626] p-12 text-center space-y-3">
          <Database className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white font-mono uppercase">
            No Qualified Leads In Current Dataset
          </h3>
          <p className="text-xs text-zinc-400 font-mono max-w-md mx-auto leading-relaxed">
            Execute a new GMB search above to extract live business profiles from Google Maps.
          </p>
        </div>
      )}

      {/* Server-Side Pagination (Strictly 10 profiles per page) */}
      {leads.length > 0 && (
        <Pagination
          pagination={pagination}
          onPageChange={(page) => fetchLeads(page)}
        />
      )}

    </div>
  );
};

export default ScraperResults;
