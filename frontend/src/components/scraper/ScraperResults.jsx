import React from 'react';
import { useLead } from '../../context/LeadContext';
import LeadCard from './LeadCard';
import Pagination from '../common/Pagination';
import { Send, PhoneCall, CheckSquare, Square, Eye, Database, Layers } from 'lucide-react';
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
    setActiveQueueIndex,
    activeDatasetId,
    loadDatasetQueue
  } = useLead();

  const { addToast } = useToast();

  const handleSelectAllOnPage = () => {
    if (selectedLeadIds.length === leads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map(l => l._id));
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
    if (selectedLeadIds.length > 0) {
      const queueToLoad = leads.filter(l => selectedLeadIds.includes(l._id));
      setCallingQueue(queueToLoad);
      setActiveQueueIndex(0);
      setActiveView('workstation');
      addToast({
        title: 'Workstation Active',
        message: `Loaded ${queueToLoad.length} selected profile(s) into Cold Calling CRM.`,
        type: 'success'
      });
    } else if (activeDatasetId) {
      loadDatasetQueue(activeDatasetId);
    } else {
      if (leads.length === 0) {
        addToast({
          title: 'No Profiles Available',
          message: 'Please extract leads or select profiles to launch the Cold Calling CRM.',
          type: 'info'
        });
        return;
      }
      setCallingQueue(leads);
      setActiveQueueIndex(0);
      setActiveView('workstation');
    }
  };

  return (
    <div id="extracted-leads-section" className="space-y-6">
      
      {/* Latest Scrape Success & View Profiles Banner */}
      {lastScrapeStats && (
        <div className="p-4 bg-[#080C14] border border-blue-600/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-950 border border-blue-500/80 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Dataset Generated Successfully
                </span>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                  {lastScrapeStats.totalQualified} Profiles Extracted
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {lastScrapeStats.totalExcluded > 0 && `${lastScrapeStats.totalExcluded} terminal/duplicate listings filtered. `}
                All qualified profiles are saved in your dataset.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('leads-grid-container');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Extracted Profiles</span>
            </button>
            <button
              type="button"
              onClick={handleLaunchColdCalling}
              className="px-3.5 py-2 bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Launch Calling</span>
            </button>
          </div>
        </div>
      )}

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
      <div id="leads-grid-container">
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
          <div className="p-12 text-center bg-[#0A0A0A] border border-[#222222] font-mono">
            <div className="text-zinc-400 text-sm">No profiles found matching your active filters.</div>
            <div className="text-zinc-600 text-xs mt-1">Extract leads above or clear filters to view existing profiles.</div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        hasNextPage={pagination.hasNextPage}
        hasPrevPage={pagination.hasPrevPage}
        totalLeads={pagination.totalLeads}
        onPageChange={(p) => fetchLeads(p)}
      />

    </div>
  );
};

export default ScraperResults;
