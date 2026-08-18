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
  Layers
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
    loadDatasetQueue
  } = useLead();

  const [queueSearch, setQueueSearch] = useState('');
  const [currentNote, setCurrentNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);

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

  // Hotkey navigation (ArrowLeft: Prev, ArrowRight: Next)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if typing in textarea or input
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

      if (advance && activeQueueIndex < callingQueue.length - 1) {
        setActiveQueueIndex(prev => prev + 1);
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

  /**
   * Quick Date & Time Presets for Follow-Up
   */
  const setFollowUpPreset = (preset) => {
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

    // Format to YYYY-MM-DDTHH:mm local timezone
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
    l.category.toLowerCase().includes(queueSearch.toLowerCase()) ||
    l.area.toLowerCase().includes(queueSearch.toLowerCase())
  );

  if (callingQueue.length === 0 && !loadingQueue) {
    return (
      <div className="bg-[#0A0A0A] border border-[#262626] p-10 sm:p-14 text-center space-y-6 max-w-3xl mx-auto my-8">
        <div className="w-16 h-16 rounded-full bg-[#121216] border border-[#262626] flex items-center justify-center mx-auto text-blue-400">
          <Layers className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white font-mono uppercase tracking-wide">
            Calling Workstation Queue Not Initialized
          </h3>
          <p className="text-xs text-zinc-400 font-mono max-w-lg mx-auto leading-relaxed">
            No specific batch of leads has been dispatched to the calling queue yet. Extract a targeted batch from the GMB Extractor or initialize the queue from your current database.
          </p>
        </div>

        {/* Database Overview Card */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-[#050505] border border-[#1E1E1E] text-left max-w-md mx-auto">
          <div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Total in DB</div>
            <div className="text-sm font-bold font-mono text-white mt-0.5">{pagination.totalLeads}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Uncontacted</div>
            <div className="text-sm font-bold font-mono text-blue-400 mt-0.5">{statusCounts.Uncontacted || 0}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase">In Pipeline</div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
              {(statusCounts['Shows Interest'] || 0) + (statusCounts['Follow Up'] || 0) + (statusCounts['Lead / Sale'] || 0)}
            </div>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
          <button
            type="button"
            onClick={() => setActiveView('scraper')}
            className="px-6 py-2.5 bg-[#141414] hover:bg-[#1E1E1E] text-white border border-[#333333] hover:border-white font-mono text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
          >
            ← Go to GMB Extractor
          </button>

          <button
            type="button"
            onClick={() => fetchCallingQueue()}
            disabled={pagination.totalLeads === 0}
            className="px-6 py-2.5 bg-white text-black hover:bg-zinc-200 border border-white font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 shadow-lg"
          >
            Initialize Queue ({statusCounts.Uncontacted || pagination.totalLeads} Leads)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      
      {/* ─── LEFT SIDEBAR: Calling Queue List ─────────────────────────────────── */}
      <div className="w-full lg:w-[360px] shrink-0 bg-[#0A0A0A] border border-[#262626] flex flex-col h-[840px]">
        
        {/* Queue Header, Dataset Switcher & Search */}
        <div className="p-4 border-b border-[#222222] bg-[#0E0E0E] space-y-3">
          
          {/* Dataset Switcher */}
          {datasets.length > 0 && (
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">
                Active Dataset / Campaign
              </label>
              <select
                value={activeDatasetId || ''}
                onChange={(e) => e.target.value && loadDatasetQueue(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-black border border-[#2B2B2B] text-white text-xs font-mono focus:border-white focus:outline-none truncate"
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
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                Outbound Queue ({callingQueue.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
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
              className="w-full pl-8 pr-3 py-1.5 bg-[#000000] border border-[#262626] text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white"
            />
          </div>
        </div>

        {/* Scrollable Queue List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1A1A1A]">
          {filteredQueue.map((lead, idx) => {
            const isCurrent = activeLead && activeLead._id === lead._id;

            return (
              <div
                key={lead._id}
                onClick={() => {
                  const originalIndex = callingQueue.findIndex(l => l._id === lead._id);
                  if (originalIndex !== -1) setActiveQueueIndex(originalIndex);
                }}
                className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 ${
                  isCurrent 
                    ? 'bg-[#141418] border-l-4 border-l-blue-500 border-glow' 
                    : 'hover:bg-[#0F0F0F] bg-transparent'
                }`}
              >
                {/* Index */}
                <div className="text-[11px] font-mono text-zinc-600 w-5 text-right shrink-0 pt-0.5">
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h4 className={`text-xs font-semibold font-mono truncate ${isCurrent ? 'text-white' : 'text-zinc-300'}`}>
                      {lead.businessName}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <span className="truncate">{lead.category}</span>
                    <RatingStars rating={lead.rating} reviewCount={lead.reviewCount} />
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#1C1C1C]">
                    <span className="text-[10px] text-zinc-600 font-mono truncate max-w-[130px]">{lead.area}</span>
                    <StatusBadge status={lead.callStatus} size="sm" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Queue Bottom Info */}
        <div className="p-3 border-t border-[#222222] bg-[#070707] text-[11px] font-mono text-zinc-500 flex items-center justify-between">
          <span>Hotkeys: ← [P] Prev | [N] Next →</span>
        </div>
      </div>

      {/* ─── CENTER/RIGHT: Main Outbound Workstation Card ───────────────────── */}
      {activeLead ? (
        <div className="flex-1 w-full bg-[#0A0A0A] border border-[#262626] flex flex-col h-[840px] overflow-y-auto">
          
          {/* Main Top Header: Business Profile Hero */}
          <div className="p-6 border-b border-[#222222] bg-gradient-to-b from-[#101010] to-[#0A0A0A]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* Left Profile Info */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-[#161616] border border-[#333333] shrink-0 flex items-center justify-center overflow-hidden">
                  {activeLead.avatarUrl ? (
                    <img 
                      src={activeLead.avatarUrl} 
                      alt={activeLead.businessName} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&auto=format&fit=crop&q=60';
                      }}
                    />
                  ) : (
                    <span className="font-mono text-lg font-bold text-zinc-400">
                      {activeLead.businessName.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-bold text-white font-mono tracking-tight">
                      {activeLead.businessName}
                    </h2>
                    <StatusBadge status={activeLead.callStatus} size="md" />
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs font-mono text-zinc-400">
                    <span className="px-2 py-0.5 bg-[#141414] border border-[#262626] text-white">
                      {activeLead.category}
                    </span>
                    <RatingStars rating={activeLead.rating} reviewCount={activeLead.reviewCount} size="lg" />
                    <span>•</span>
                    <span className="flex items-center gap-1 text-zinc-400">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      {activeLead.address || activeLead.area}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Send Proposal & Quick Copy */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSendSingleProposal}
                  className="px-4 py-2 bg-[#141414] hover:bg-[#1F1F1F] text-blue-400 font-mono text-xs font-medium border border-[#2B2B2B] hover:border-blue-500 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send Proposal</span>
                </button>
              </div>

            </div>

            {/* Direct Contacts Contact Bar (Clean 1-Click Clipboard Copies) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-[#1C1C1C]">
              
              {/* Phone Card */}
              <div className="p-3 bg-[#000000] border border-[#262626] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-[#141414] border border-[#2B2B2B] flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 font-mono uppercase">Phone Number</div>
                    <div className="text-xs font-mono font-bold text-white">
                      {activeLead.phoneNumber || 'No phone listed'}
                    </div>
                  </div>
                </div>
                {activeLead.phoneNumber && (
                  <ClipboardButton text={activeLead.phoneNumber} label="Copy" />
                )}
              </div>

              {/* Email Card */}
              <div className="p-3 bg-[#000000] border border-[#262626] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-[#141414] border border-[#2B2B2B] flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-zinc-500 font-mono uppercase">Direct Email</div>
                    <div className="text-xs font-mono font-bold text-white truncate max-w-[130px]">
                      {activeLead.email || 'No direct email'}
                    </div>
                  </div>
                </div>
                {activeLead.email && (
                  <ClipboardButton text={activeLead.email} label="Copy" />
                )}
              </div>

              {/* Website Card */}
              <div className="p-3 bg-[#000000] border border-[#262626] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-[#141414] border border-[#2B2B2B] flex items-center justify-center">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-zinc-500 font-mono uppercase">Website</div>
                    {activeLead.website ? (
                      <a 
                        href={activeLead.website.startsWith('http') ? activeLead.website : `https://${activeLead.website}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs font-mono font-bold text-blue-400 hover:underline truncate block max-w-[130px]"
                      >
                        {activeLead.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    ) : (
                      <span className="text-xs font-mono text-amber-400/90 font-medium">No Website</span>
                    )}
                  </div>
                </div>
                {activeLead.website && (
                  <a 
                    href={activeLead.website.startsWith('http') ? activeLead.website : `https://${activeLead.website}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-1.5 border border-[#262626] bg-[#0A0A0A] hover:bg-[#1A1A1A] text-zinc-400 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

            </div>
          </div>

          {/* Interactive Workstation Form Area */}
          <div className="p-6 space-y-6 flex-1">
            
            {/* 1. Call Status Selector Grid (NO auto-advance on click) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 inline-block" />
                  Select Lead Status
                </label>
                <span className="text-[11px] font-mono text-zinc-500">
                  Selected status stays active until you save
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {callStatusOptions.map(opt => {
                  const isSelected = selectedStatus === opt.id;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedStatus(opt.id)}
                      className={`p-3.5 border text-left transition-all relative flex flex-col justify-between h-20 cursor-pointer ${
                        isSelected 
                          ? `${opt.color} ring-2 ring-white shadow-lg` 
                          : 'border-[#262626] bg-[#000000] hover:border-zinc-500 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold">{opt.label}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-current shrink-0" />}
                      </div>
                      <p className="text-[10px] font-mono text-zinc-400 leading-tight">
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* ─── 2. Enhanced Follow-Up Date & Time Scheduler ───────────────── */}
              {selectedStatus === 'Follow Up' && (
                <div className="mt-4 p-4 bg-[#0D0D12] border border-yellow-800/60 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-yellow-300 uppercase">
                      <Calendar className="w-4 h-4 text-yellow-400" />
                      <span>Follow-Up Scheduler</span>
                    </div>

                    {followUpDate && (
                      <button
                        type="button"
                        onClick={() => setFollowUpDate('')}
                        className="text-[11px] font-mono text-zinc-500 hover:text-rose-400 flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-zinc-400">Quick Presets:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setFollowUpPreset('2hours')}
                        className="px-2.5 py-1 text-xs font-mono bg-[#141414] border border-zinc-700 hover:border-yellow-400 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      >
                        +2 Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => setFollowUpPreset('tomorrow_9am')}
                        className="px-2.5 py-1 text-xs font-mono bg-[#141414] border border-zinc-700 hover:border-yellow-400 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      >
                        Tomorrow 9:00 AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setFollowUpPreset('tomorrow_2pm')}
                        className="px-2.5 py-1 text-xs font-mono bg-[#141414] border border-zinc-700 hover:border-yellow-400 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      >
                        Tomorrow 2:00 PM
                      </button>
                      <button
                        type="button"
                        onClick={() => setFollowUpPreset('in_2days')}
                        className="px-2.5 py-1 text-xs font-mono bg-[#141414] border border-zinc-700 hover:border-yellow-400 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      >
                        In 2 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setFollowUpPreset('next_monday')}
                        className="px-2.5 py-1 text-xs font-mono bg-[#141414] border border-zinc-700 hover:border-yellow-400 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      >
                        Next Monday 10:00 AM
                      </button>
                    </div>
                  </div>

                  {/* Manual Date & Time Picker */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-yellow-950/60">
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
                        Select Exact Date &amp; Time
                      </label>
                      <input
                        type="datetime-local"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#000000] border border-yellow-700/60 text-xs font-mono text-white focus:outline-none focus:border-yellow-400"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      {followUpDate ? (
                        <div className="p-2 bg-yellow-950/40 border border-yellow-800/60 text-xs font-mono text-yellow-300 flex items-center gap-2">
                          <CalendarCheck className="w-4 h-4 text-yellow-400 shrink-0" />
                          <span className="truncate">
                            Scheduled: <strong>{formatScheduledDate(followUpDate)}</strong>
                          </span>
                        </div>
                      ) : (
                        <div className="p-2 bg-[#050505] border border-zinc-800 text-xs font-mono text-zinc-500">
                          Select a date/time above
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Call Notes & Quick Tags */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                  Conversation Log &amp; Workstation Notes
                </label>
              </div>

              {/* Quick Tags Toolbar */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono text-zinc-500">Quick Insert:</span>
                {quickNoteTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleQuickTag(tag)}
                    className="text-[10px] font-mono px-2 py-0.5 bg-[#121212] border border-[#262626] text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              {/* Notes Textarea */}
              <textarea
                rows={3}
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                placeholder="Enter call notes, objections, owner contact details, or next action steps..."
                className="w-full p-3 bg-[#000000] border border-[#262626] text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {/* 4. Historical Interaction Timeline */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                <History className="w-3.5 h-3.5 text-zinc-500" />
                <span>Interaction Timeline ({activeLead.callNotes?.length || 0} Notes, {activeLead.emailHistory?.length || 0} Emails)</span>
              </div>

              <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
                {/* Notes History */}
                {activeLead.callNotes && activeLead.callNotes.length > 0 ? (
                  activeLead.callNotes.slice().reverse().map((item, idx) => (
                    <div key={idx} className="p-3 bg-[#0E0E0E] border border-[#1E1E1E] text-xs font-mono space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span className="text-blue-400 font-semibold">{item.author || 'Sales Desk'}</span>
                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-zinc-300 text-xs leading-relaxed">{item.note}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-[#070707] border border-[#1A1A1A] text-xs font-mono text-zinc-600 text-center">
                    No previous logs recorded for this lead yet.
                  </div>
                )}

                {/* Email History */}
                {activeLead.emailHistory && activeLead.emailHistory.map((eh, i) => (
                  <div key={`eh_${i}`} className="p-2.5 bg-[#0B0F19] border border-blue-900/40 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-blue-400 font-semibold flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Email Dispatched ({eh.status})
                      </span>
                      <span className="text-zinc-500">{new Date(eh.sentAt).toLocaleString()}</span>
                    </div>
                    <div className="text-[11px] text-zinc-300 truncate">
                      Subject: {eh.subject || eh.templateName}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ─── EXPLICIT SAVE & NAVIGATION ACTION FOOTER ─────────────────────── */}
          <div className="p-4 border-t border-[#222222] bg-[#070707] flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Left: Previous Profile Button */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={activeQueueIndex === 0}
              className="w-full sm:w-auto px-4 py-2.5 bg-[#121212] border border-[#2B2B2B] hover:bg-[#1C1C1C] hover:border-zinc-500 text-zinc-300 hover:text-white font-mono text-xs flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Profile [P]</span>
            </button>

            {/* Center: Profile Index & Status Indicator */}
            <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
              <span>Profile <strong className="text-white">{activeQueueIndex + 1}</strong> of <strong className="text-white">{callingQueue.length}</strong></span>
              <span>•</span>
              <span className="text-zinc-500">Status: <strong className="text-blue-400">{selectedStatus}</strong></span>
            </div>

            {/* Right: Save Changes and Save & Next Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleSaveCurrent(false)}
                disabled={saving}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-[#171717] hover:bg-[#222222] text-white border border-zinc-700 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Save className="w-3.5 h-3.5 text-blue-400" />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveCurrent(true)}
                disabled={saving}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-white text-black hover:bg-zinc-200 border border-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg"
              >
                <span>{activeQueueIndex === callingQueue.length - 1 ? 'Save Record' : 'Save & Next [N]'}</span>
                <ChevronRight className="w-4 h-4 text-black" />
              </button>
            </div>

          </div>

        </div>
      ) : (
        <div className="flex-1 bg-[#0A0A0A] border border-[#262626] p-12 text-center text-zinc-500 font-mono text-sm">
          Select a profile from the left queue to begin.
        </div>
      )}

    </div>
  );
};

export default CallingWorkstation;
