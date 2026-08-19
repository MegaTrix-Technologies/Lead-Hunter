import React, { useState, useEffect } from 'react';
import { useLead } from '../../context/LeadContext';
import RatingStars from '../common/RatingStars';
import StatusBadge from '../common/StatusBadge';
import ClipboardButton from '../common/ClipboardButton';
import { 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  History, 
  Search,
  ExternalLink,
  Save,
  Check,
  CalendarCheck,
  XCircle,
  Layers,
  PlusCircle,
  BarChart3,
  X,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const CallingWorkstation = () => {
  const { 
    callingQueue, 
    activeQueueIndex, 
    setActiveQueueIndex, 
    updateCallStatus, 
    addCallNote,
    fetchCallingQueue,
    loadingQueue,
    setIsCampaignModalOpen,
    setSelectedLeadIds,
    datasets,
    activeDatasetId,
    activeDataset,
    loadDatasetQueue,
    pagination,
    statusCounts,
    setActiveView,
    setAppendModalDataset
  } = useLead();

  const [queueSearch, setQueueSearch] = useState('');
  const [currentNote, setCurrentNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedSwitchDatasetId, setSelectedSwitchDatasetId] = useState('');
  
  // Left queue pagination (10 entries per page)
  const [queuePage, setQueuePage] = useState(1);
  const QUEUE_PAGE_SIZE = 10;

  // Status definitions with descriptive labels
  const callStatusOptions = [
    { 
      id: 'Unreachable', 
      label: 'Unreachable', 
      desc: 'No Answer / Line Busy / Retry Later (Non-Terminal)', 
      color: 'border-orange-600/80 bg-orange-950/30 text-orange-300 hover:bg-orange-900/40' 
    },
    { 
      id: 'IVR', 
      label: 'IVR', 
      desc: 'Helpline / Automated Switchboard', 
      color: 'border-purple-600/80 bg-purple-950/30 text-purple-300 hover:bg-purple-900/40' 
    },
    { 
      id: 'Receptionist', 
      label: 'Receptionist', 
      desc: 'Gatekeeper / No Purchasing Intent', 
      color: 'border-amber-600/80 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40' 
    },
    { 
      id: 'Do Not Call', 
      label: 'Do Not Call', 
      desc: 'Explicit Opt-Out / DNC List', 
      color: 'border-rose-600/80 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40' 
    },
    { 
      id: 'Shows Interest', 
      label: 'Shows Interest', 
      desc: 'Engaged, Requested More Details', 
      color: 'border-blue-600/80 bg-blue-950/30 text-blue-300 hover:bg-blue-900/40' 
    },
    { 
      id: 'Follow Up', 
      label: 'Follow Up', 
      desc: 'Callback Requested / Schedule Date', 
      color: 'border-yellow-600/80 bg-yellow-950/30 text-yellow-300 hover:bg-yellow-900/40' 
    },
    { 
      id: 'Lead / Sale', 
      label: 'Lead / Sale', 
      desc: 'Converted / Active Deal Won', 
      color: 'border-emerald-500/80 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 font-bold border-glow-green' 
    }
  ];

  const quickNoteTags = [
    'Left Voicemail',
    'Spoke to Owner',
    'Gatekeeper Refused Transfer',
    'Requested Email Proposal',
    'Callback Scheduled',
    'Disconnected / Bad Number',
    'High-Value Deal Opportunity'
  ];

  // Active lead
  const activeLead = callingQueue[activeQueueIndex] || null;

  // Sync selected status when active lead changes
  useEffect(() => {
    if (activeLead) {
      setSelectedStatus(activeLead.callStatus || 'Uncontacted');
      setFollowUpDate(activeLead.followUpDate ? new Date(activeLead.followUpDate).toISOString().slice(0, 16) : '');
      setCurrentNote('');
    }
  }, [activeLead]);

  // Set default switch dataset if available
  useEffect(() => {
    if (datasets && datasets.length > 0) {
      const other = datasets.find(d => d._id !== activeDatasetId);
      if (other) setSelectedSwitchDatasetId(other._id);
      else setSelectedSwitchDatasetId(datasets[0]._id);
    }
  }, [datasets, activeDatasetId]);

  // Hotkey navigation (ArrowLeft: Prev, ArrowRight: Next)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowLeft' || e.key === 'p') {
        handlePrev();
      } else if (e.key === 'ArrowRight' || e.key === 'n') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeQueueIndex, callingQueue.length, selectedStatus, currentNote, followUpDate]);

  /**
   * Save changes to current lead without automatically jumping
   */
  const handleSaveCurrent = async (advance = false) => {
    if (!activeLead) return;
    setSaving(true);

    try {
      const noteToSave = currentNote.trim();
      await updateCallStatus(
        activeLead._id, 
        selectedStatus, 
        noteToSave, 
        selectedStatus === 'Follow Up' ? followUpDate : null
      );

      setCurrentNote('');

      if (advance) {
        if (activeQueueIndex < callingQueue.length - 1) {
          setActiveQueueIndex(prev => prev + 1);
        } else {
          setShowCompletionModal(true);
        }
      }
    } catch (err) {
      console.error('Error saving call status:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePrev = () => {
    if (activeQueueIndex > 0) {
      setActiveQueueIndex(activeQueueIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeQueueIndex < callingQueue.length - 1) {
      setActiveQueueIndex(activeQueueIndex + 1);
    } else {
      setShowCompletionModal(true);
    }
  };

  const handleQuickTag = (tag) => {
    setCurrentNote(prev => prev ? `${prev} | ${tag}` : tag);
  };

  const handleSendSingleProposal = () => {
    if (!activeLead) return;
    setSelectedLeadIds([activeLead._id]);
    setIsCampaignModalOpen(true);
  };

  // Follow-up presets
  const handleSetFollowUpPreset = (preset) => {
    const now = new Date();
    let target = new Date();

    switch (preset) {
      case '2hours':
        target = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        break;
      case 'tomorrow_9am':
        target.setDate(now.getDate() + 1);
        target.setHours(9, 0, 0, 0);
        break;
      case 'tomorrow_2pm':
        target.setDate(now.getDate() + 1);
        target.setHours(14, 0, 0, 0);
        break;
      case 'in_2days':
        target.setDate(now.getDate() + 2);
        target.setHours(10, 0, 0, 0);
        break;
      case 'next_monday':
        const day = now.getDay();
        const diff = (day === 0 ? 1 : 8 - day);
        target.setDate(now.getDate() + diff);
        target.setHours(10, 0, 0, 0);
        break;
    }

    const tzOffset = target.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(target - tzOffset)).toISOString().slice(0, 16);
    setFollowUpDate(localISOTime);
  };

  const formatScheduledDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return isoStr;
    }
  };

  // Filter queue by search
  const filteredQueue = callingQueue.filter(l => 
    l.businessName.toLowerCase().includes(queueSearch.toLowerCase()) ||
    (l.category && l.category.toLowerCase().includes(queueSearch.toLowerCase())) ||
    (l.area && l.area.toLowerCase().includes(queueSearch.toLowerCase()))
  );

  // Queue Pagination (10 entries per page)
  const totalQueuePages = Math.ceil(filteredQueue.length / QUEUE_PAGE_SIZE) || 1;
  const paginatedQueue = filteredQueue.slice((queuePage - 1) * QUEUE_PAGE_SIZE, queuePage * QUEUE_PAGE_SIZE);

  // Automatically sync queuePage whenever activeQueueIndex changes
  useEffect(() => {
    const targetPage = Math.floor(activeQueueIndex / QUEUE_PAGE_SIZE) + 1;
    if (targetPage !== queuePage && targetPage <= totalQueuePages) {
      setQueuePage(targetPage);
    }
  }, [activeQueueIndex, totalQueuePages]);

  // Safe fallback values
  const totalDbLeads = pagination?.totalLeads || 0;
  const uncontactedCount = statusCounts?.Uncontacted || 0;
  const pipelineCount = (statusCounts?.['Shows Interest'] || 0) + (statusCounts?.['Follow Up'] || 0) + (statusCounts?.['Lead / Sale'] || 0);

  // ─── EMPTY QUEUE SCREEN ──────────────────────────────────────────────────
  if (callingQueue.length === 0 && !loadingQueue) {
    return (
      <div className="bg-[#080808] border border-[#222222] p-8 sm:p-12 text-center space-y-6 max-w-3xl mx-auto my-6 font-mono">
        <div className="w-14 h-14 bg-[#111111] border border-[#2B2B2B] flex items-center justify-center mx-auto text-blue-400">
          <Layers className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            Cold Calling CRM Queue Not Loaded
          </h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            Select an active campaign dataset below or extract a new batch of leads from the GMB Extractor.
          </p>
        </div>

        {/* Dataset Quick Select */}
        {datasets && datasets.length > 0 ? (
          <div className="p-4 bg-[#030303] border border-[#1C1C1C] max-w-lg mx-auto space-y-3 text-left">
            <label className="block text-[10px] text-zinc-500 uppercase">
              Available Campaign Datasets ({datasets.length}):
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {datasets.map(ds => (
                <div 
                  key={ds._id}
                  onClick={() => loadDatasetQueue(ds._id)}
                  className="p-3 bg-[#080808] border border-[#1E1E1E] hover:border-blue-500 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                      {ds.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5 truncate">
                      {ds.keyword} • {ds.area}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-[#121212] border border-[#2B2B2B] text-[10px] text-zinc-300 shrink-0 font-bold">
                    {ds.totalLeads} Leads
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 p-4 bg-[#030303] border border-[#1C1C1C] text-left max-w-md mx-auto">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Total in DB</div>
              <div className="text-sm font-bold text-white mt-0.5">{totalDbLeads}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Uncontacted</div>
              <div className="text-sm font-bold text-blue-400 mt-0.5">{uncontactedCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">In Pipeline</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">{pipelineCount}</div>
            </div>
          </div>
        )}

        {/* Action Triggers */}
        <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
          <button
            type="button"
            onClick={() => setActiveView && setActiveView('scraper')}
            className="px-6 py-2.5 bg-white text-black hover:bg-zinc-200 border border-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg"
          >
            ← Open GMB Extractor
          </button>

          {totalDbLeads > 0 && (
            <button
              type="button"
              onClick={() => fetchCallingQueue && fetchCallingQueue()}
              className="px-6 py-2.5 bg-[#121212] hover:bg-[#1A1A1A] text-zinc-300 hover:text-white border border-[#2B2B2B] text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
            >
              Load All Uncontacted ({uncontactedCount})
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start relative font-mono">
      
      {/* ─── LEFT SIDEBAR: Calling Queue List ─────────────────────────────────── */}
      <div className="w-full lg:w-[360px] shrink-0 bg-[#080808] border border-[#222222] flex flex-col h-[840px]">
        
        {/* Queue Header, Dataset Switcher & Search */}
        <div className="p-4 border-b border-[#1E1E1E] bg-[#0C0C0C] space-y-3">
          
          {/* Dataset Switcher */}
          {datasets && datasets.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase mb-1">
                <span>Active Dataset Queue</span>
                <button
                  type="button"
                  onClick={() => setAppendModalDataset && setAppendModalDataset(activeDataset || datasets[0])}
                  className="text-blue-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3 h-3" /> Add Entries
                </button>
              </div>
              <select
                value={activeDatasetId || ''}
                onChange={(e) => e.target.value && loadDatasetQueue(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-black border border-[#2B2B2B] text-white text-xs focus:border-white focus:outline-none truncate font-bold"
              >
                {datasets.map(ds => (
                  <option key={ds._id} value={ds._id}>
                    {ds.name} ({ds.totalLeads} leads)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-none" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Outbound Queue ({callingQueue.length})
              </h3>
            </div>
            <span className="text-[11px] text-zinc-400">
              #{activeQueueIndex + 1} of {callingQueue.length}
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
              placeholder="Search queue leads..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#000000] border border-[#222222] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white"
            />
          </div>
        </div>

        {/* Scrollable Queue List (10 Entries Per Page) */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#141414]">
          {paginatedQueue.map((lead, idx) => {
            const isCurrent = activeLead && activeLead._id === lead._id;
            const globalIndex = (queuePage - 1) * QUEUE_PAGE_SIZE + idx;

            return (
              <div
                key={lead._id}
                onClick={() => {
                  const originalIndex = callingQueue.findIndex(l => l._id === lead._id);
                  if (originalIndex !== -1) setActiveQueueIndex(originalIndex);
                }}
                className={`p-3.5 cursor-pointer transition-colors ${
                  isCurrent 
                    ? 'bg-[#101018] border-l-2 border-blue-500' 
                    : 'hover:bg-[#0C0C0C]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-bold text-white truncate flex-1 flex items-center gap-1.5">
                    <span className="text-[10px] text-zinc-500 font-normal">#{globalIndex + 1}</span>
                    <span className="truncate">{lead.businessName}</span>
                  </div>
                  <StatusBadge status={lead.callStatus} size="sm" />
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-500">
                  <span>{lead.phoneNumber || 'No Phone'}</span>
                  <span>{lead.rating ? `⭐ ${lead.rating}` : 'Unrated'}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Queue Bottom Navigation & Page Controls */}
        <div className="p-3 border-t border-[#1E1E1E] bg-[#0C0C0C] space-y-2.5">
          
          {/* Queue Page Switcher (10 entries per page) */}
          {totalQueuePages > 1 && (
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#1A1A1A]">
              <button
                type="button"
                onClick={() => setQueuePage(p => Math.max(1, p - 1))}
                disabled={queuePage === 1}
                className="px-2 py-1 bg-[#121212] hover:bg-[#1A1A1A] text-zinc-300 border border-[#2B2B2B] text-[10px] uppercase font-bold cursor-pointer disabled:opacity-30 flex items-center gap-0.5"
              >
                <ChevronLeft className="w-3 h-3" /> Prev
              </button>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-zinc-400">
                  Page <strong className="text-white">{queuePage}</strong> of <strong>{totalQueuePages}</strong>
                </span>
                <span className="text-zinc-600 text-[10px]">
                  ({filteredQueue.length} Total)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setQueuePage(p => Math.min(totalQueuePages, p + 1))}
                disabled={queuePage === totalQueuePages}
                className="px-2 py-1 bg-[#121212] hover:bg-[#1A1A1A] text-zinc-300 border border-[#2B2B2B] text-[10px] uppercase font-bold cursor-pointer disabled:opacity-30 flex items-center gap-0.5"
              >
                Next <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Lead Dialer Step Navigator */}
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handlePrev}
              disabled={activeQueueIndex === 0}
              className="px-3 py-1.5 bg-[#121212] hover:bg-[#1A1A1A] text-zinc-300 border border-[#2B2B2B] flex items-center gap-1 cursor-pointer disabled:opacity-30 font-bold"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev [P]
            </button>
            <span className="text-zinc-400 text-[11px] font-bold">
              #{activeQueueIndex + 1} / {callingQueue.length}
            </span>
            <button
              type="button"
              onClick={handleNext}
              className="px-3 py-1.5 bg-[#121212] hover:bg-[#1A1A1A] text-zinc-300 border border-[#2B2B2B] flex items-center gap-1 cursor-pointer font-bold"
            >
              Next [N] <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* ─── RIGHT MAIN PANEL: Active Lead Outbound Profile ───────────────────── */}
      {activeLead ? (
        <div className="flex-1 bg-[#080808] border border-[#222222] flex flex-col min-h-[840px] w-full">
          
          {/* Top Profile Header */}
          <div className="p-6 border-b border-[#1E1E1E] bg-[#0A0A0A]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">
                    {activeLead.businessName}
                  </h2>
                  <StatusBadge status={activeLead.callStatus} size="md" />
                </div>
                <div className="flex items-center gap-4 flex-wrap text-xs text-zinc-400 mt-2">
                  <span className="px-2 py-0.5 bg-[#121212] border border-[#222222] text-zinc-300">
                    {activeLead.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    {activeLead.address || activeLead.area}
                  </span>
                  <span className="flex items-center gap-1">
                    <RatingStars rating={activeLead.rating} />
                    <span className="text-zinc-500">({activeLead.reviewCount || 0} reviews)</span>
                  </span>
                </div>
              </div>

              {/* Direct Outreach Trigger */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendSingleProposal}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                >
                  <Send className="w-3.5 h-3.5" /> Send Proposal
                </button>
              </div>
            </div>
          </div>

          {/* Quick Details Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#181818] border-b border-[#1E1E1E] bg-[#040404]">
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Direct Phone</div>
                  <div className="text-xs font-bold text-white">
                    {activeLead.phoneNumber || 'No phone registered'}
                  </div>
                </div>
              </div>
              {activeLead.phoneNumber && <ClipboardButton text={activeLead.phoneNumber} />}
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Website</div>
                  <div className="text-xs font-bold text-white truncate max-w-[150px]">
                    {activeLead.website ? (
                      <a href={activeLead.website} target="_blank" rel="noreferrer" className="hover:underline text-blue-400">
                        {activeLead.website.replace(/^https?:\/\//, '')}
                      </a>
                    ) : 'None'}
                  </div>
                </div>
              </div>
              {activeLead.website && <ClipboardButton text={activeLead.website} />}
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Email Address</div>
                  <div className="text-xs font-bold text-white truncate max-w-[150px]">
                    {activeLead.email || 'None registered'}
                  </div>
                </div>
              </div>
              {activeLead.email && <ClipboardButton text={activeLead.email} />}
            </div>
          </div>

          {/* Outbound Call Status Selection Grid */}
          <div className="p-6 space-y-6 flex-1">
            
            <div>
              <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>Select Call Outcome Status:</span>
                <span className="text-zinc-500 text-[11px] font-normal">Choose status and click Save or Save &amp; Next</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {callStatusOptions.map(opt => {
                  const isSelected = selectedStatus === opt.id;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedStatus(opt.id)}
                      className={`p-3 border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? `${opt.color} ring-1 ring-white/20 shadow-lg` 
                          : 'border-[#1C1C1C] bg-[#050505] hover:border-zinc-700 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <p className="text-[10px] mt-1 text-zinc-500 line-clamp-2">
                        {opt.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Follow-Up Scheduler (Shown when Follow Up status is selected) */}
            {selectedStatus === 'Follow Up' && (
              <div className="p-4 bg-[#0D0B05] border border-yellow-800/60 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-yellow-300 uppercase flex items-center gap-1.5">
                    <CalendarCheck className="w-4 h-4 text-yellow-400" />
                    Schedule Callback Time:
                  </span>
                  {followUpDate && (
                    <span className="text-[11px] text-yellow-400 font-bold">
                      {formatScheduledDate(followUpDate)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { label: '+2 Hours', val: '2hours' },
                    { label: 'Tomorrow 9:00 AM', val: 'tomorrow_9am' },
                    { label: 'Tomorrow 2:00 PM', val: 'tomorrow_2pm' },
                    { label: 'In 2 Days', val: 'in_2days' },
                    { label: 'Next Monday 10:00 AM', val: 'next_monday' }
                  ].map(preset => (
                    <button
                      type="button"
                      key={preset.val}
                      onClick={() => handleSetFollowUpPreset(preset.val)}
                      className="px-2.5 py-1 bg-[#1A1408] border border-yellow-700/50 hover:border-yellow-400 text-yellow-200 text-[11px] cursor-pointer transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <input
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full sm:w-auto px-3 py-1.5 bg-black border border-yellow-700/60 text-yellow-200 text-xs focus:outline-none"
                />
              </div>
            )}

            {/* Call Notes & Quick Tags */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Agent Notes &amp; Disposition Log:</span>
                <span className="text-zinc-500 text-[11px] font-normal">Optional interaction notes</span>
              </label>

              {/* Quick Tags */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-zinc-500">Quick Tags:</span>
                {quickNoteTags.map(tag => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => handleQuickTag(tag)}
                    className="text-[10px] px-2 py-0.5 bg-[#121212] border border-[#222222] hover:border-zinc-600 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              <textarea
                rows="3"
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                placeholder="Log call conversation details, customer objections, or follow-up instructions..."
                className="w-full p-3 bg-black border border-[#2B2B2B] text-white text-xs placeholder-zinc-700 focus:outline-none focus:border-white resize-none"
              />
            </div>

            {/* Historical Notes Timeline */}
            {activeLead.callNotes && activeLead.callNotes.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#181818]">
                <span className="text-[11px] text-zinc-500 uppercase flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" /> Historical Interaction Log ({activeLead.callNotes.length})
                </span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {activeLead.callNotes.slice().reverse().map((n, i) => (
                    <div key={i} className="p-2 bg-[#050505] border border-[#1C1C1C] text-xs flex items-start justify-between">
                      <span className="text-zinc-300">{n.note}</span>
                      <span className="text-[10px] text-zinc-500 shrink-0 ml-2">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Bottom Save & Progression Action Bar */}
          <div className="p-4 border-t border-[#1E1E1E] bg-[#0A0A0A] flex items-center justify-between gap-4">
            <div className="text-xs text-zinc-500 hidden sm:block">
              Press <kbd className="px-1.5 py-0.5 bg-[#181818] text-zinc-300 border border-[#2B2B2B]">N</kbd> or <kbd className="px-1.5 py-0.5 bg-[#181818] text-zinc-300 border border-[#2B2B2B]">→</kbd> to advance
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleSaveCurrent(false)}
                disabled={saving}
                className="px-5 py-2.5 bg-[#121212] hover:bg-[#1A1A1A] text-white border border-[#2B2B2B] hover:border-zinc-500 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-40"
              >
                Save Disposition
              </button>

              <button
                type="button"
                onClick={() => handleSaveCurrent(true)}
                disabled={saving}
                className="px-6 py-2.5 bg-white hover:bg-zinc-200 text-black border border-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg transition-all disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save &amp; Next Profile [N]</span>
              </button>
            </div>
          </div>

        </div>
      ) : (
        <div className="flex-1 p-12 text-center text-zinc-500 text-xs">
          Select a lead from the queue.
        </div>
      )}

      {/* ─── DATASET PROGRESSION / COMPLETION HUB (EXECUTIVE CLEAN UX) ───────── */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 font-mono">
          <div className="bg-[#080808] border border-[#2B2B2B] w-full max-w-2xl p-6 sm:p-7 shadow-2xl space-y-6 relative">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#1E1E1E] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 inline-block" />
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">
                    Outreach Batch Completed
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    All profiles in <span className="text-white font-bold">"{activeDataset?.name || 'Current Dataset'}"</span> have been dispositioned.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCompletionModal(false)}
                className="text-zinc-500 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3 Executive Action Pathways */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* Option 1: Append Leads to Current Dataset */}
              <div className="p-4 bg-[#040404] border border-[#1E1E1E] hover:border-blue-500 transition-all flex flex-col justify-between space-y-3 group">
                <div>
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <PlusCircle className="w-4 h-4" />
                    <span className="text-xs font-bold text-white uppercase">Add Entries</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Extract 10–100 new Google profiles for <strong className="text-zinc-200">{activeDataset?.keyword}</strong> in <strong className="text-zinc-200">{activeDataset?.area}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCompletionModal(false);
                    if (setAppendModalDataset) {
                      setAppendModalDataset(activeDataset || (datasets && datasets[0]));
                    }
                  }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-md"
                >
                  <span>Add Entries (GMB)</span>
                </button>
              </div>

              {/* Option 2: Switch to Another Dataset */}
              <div className="p-4 bg-[#040404] border border-[#1E1E1E] hover:border-zinc-500 transition-all flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <Layers className="w-4 h-4" />
                    <span className="text-xs font-bold text-white uppercase">Switch Dataset</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    View all campaign dataset cards and choose another batch to call.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCompletionModal(false);
                    if (setActiveView) {
                      setActiveView('scraper');
                      setTimeout(() => {
                        const el = document.getElementById('dataset-cards-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                        else window.scrollTo({ top: 380, behavior: 'smooth' });
                      }, 100);
                    }
                  }}
                  className="w-full py-2 bg-[#121212] hover:bg-[#1A1A1A] text-zinc-200 border border-[#2B2B2B] hover:border-zinc-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-md"
                >
                  <span>Switch Dataset</span>
                </button>
              </div>

              {/* Option 3: Create New Dataset via GMB */}
              <div className="p-4 bg-[#040404] border border-[#1E1E1E] hover:border-emerald-500 transition-all flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 mb-2">
                    <Search className="w-4 h-4" />
                    <span className="text-xs font-bold text-white uppercase">New Dataset</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Launch the GMB Extractor to search a new niche or city from scratch.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCompletionModal(false);
                    if (setActiveView) {
                      setActiveView('scraper');
                      setTimeout(() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }, 50);
                    }
                  }}
                  className="w-full py-2 bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-md"
                >
                  <span>Create Dataset</span>
                </button>
              </div>

            </div>

            {/* Bottom Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#181818] text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowCompletionModal(false);
                  if (setActiveView) setActiveView('analytics');
                }}
                className="text-zinc-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5 text-zinc-500" />
                <span>View Performance Analytics</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCompletionModal(false)}
                className="px-4 py-1.5 bg-[#121212] hover:bg-[#1A1A1A] text-zinc-400 hover:text-white border border-[#222] cursor-pointer"
              >
                Review Current Profiles
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default CallingWorkstation;
