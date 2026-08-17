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
  PhoneCall, 
  PhoneOff, 
  Clock, 
  UserCheck, 
  AlertCircle, 
  MessageSquare, 
  History, 
  Search,
  ExternalLink,
  Plus
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
    setSelectedLeadIds
  } = useLead();

  const [queueSearch, setQueueSearch] = useState('');
  const [currentNote, setCurrentNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isCallingActive, setIsCallingActive] = useState(false);
  const [callTimer, setCallTimer] = useState(0);

  // Status definitions with descriptive labels
  const callStatusOptions = [
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
      desc: 'Callback Requested / Set Date', 
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
    'Requested Email Deck',
    'Callback Tomorrow 2PM',
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
      setIsCallingActive(false);
      setCallTimer(0);
    }
  }, [activeLead]);

  // Call timer simulation
  useEffect(() => {
    let interval = null;
    if (isCallingActive) {
      interval = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isCallingActive]);

  // Hotkey navigation
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
  }, [activeQueueIndex, callingQueue.length]);

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

  const handleApplyStatusAndAdvance = async (statusId) => {
    if (!activeLead) return;
    setSelectedStatus(statusId);

    const noteToSave = currentNote.trim();
    await updateCallStatus(activeLead._id, statusId, noteToSave, statusId === 'Follow Up' ? followUpDate : null);

    setCurrentNote('');
    // Auto-advance to next lead if available
    if (activeQueueIndex < callingQueue.length - 1) {
      setActiveQueueIndex(prev => prev + 1);
    }
  };

  const handleSaveNoteOnly = async () => {
    if (!activeLead || !currentNote.trim()) return;
    await addCallNote(activeLead._id, currentNote.trim());
    setCurrentNote('');
  };

  const handleQuickTag = (tag) => {
    setCurrentNote(prev => prev ? `${prev} | ${tag}` : tag);
  };

  const handleSendSingleProposal = () => {
    if (!activeLead) return;
    setSelectedLeadIds([activeLead._id]);
    setIsCampaignModalOpen(true);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter queue by search
  const filteredQueue = callingQueue.filter(l => 
    l.businessName.toLowerCase().includes(queueSearch.toLowerCase()) ||
    l.category.toLowerCase().includes(queueSearch.toLowerCase()) ||
    l.area.toLowerCase().includes(queueSearch.toLowerCase())
  );

  if (callingQueue.length === 0 && !loadingQueue) {
    return (
      <div className="bg-[#0A0A0A] border border-[#262626] p-12 text-center space-y-4">
        <PhoneCall className="w-12 h-12 text-zinc-600 mx-auto" />
        <h3 className="text-lg font-bold text-white font-mono uppercase">Calling Queue Empty</h3>
        <p className="text-xs text-zinc-400 font-mono max-w-md mx-auto leading-relaxed">
          There are currently no leads in the active dialing queue. Extract leads from the GMB Extractor tab or load leads from the Leads Database.
        </p>
        <button
          onClick={() => fetchCallingQueue()}
          className="px-6 py-2.5 bg-white text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors"
        >
          Load All Uncontacted Leads
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      
      {/* ─── LEFT SIDEBAR: Calling Queue List ─────────────────────────────────── */}
      <div className="w-full lg:w-[380px] shrink-0 bg-[#0A0A0A] border border-[#262626] flex flex-col h-[820px]">
        
        {/* Queue Header & Search */}
        <div className="p-4 border-b border-[#222222] bg-[#0E0E0E] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-none" />
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                Outbound Queue ({callingQueue.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
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
                {/* Index & Avatar */}
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

      {/* ─── CENTER/RIGHT: Main High-Visibility Dialing Workstation ────────── */}
      {activeLead ? (
        <div className="flex-1 w-full bg-[#0A0A0A] border border-[#262626] flex flex-col h-[820px] overflow-y-auto">
          
          {/* Main Top Header: Business Profile Hero */}
          <div className="p-6 border-b border-[#222222] bg-gradient-to-b from-[#101010] to-[#0A0A0A]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* Left Profile Info */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-[#161616] border border-[#333333] shrink-0 flex items-center justify-center overflow-hidden">
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

              {/* Live Dialing Action Center */}
              <div className="flex items-center gap-3">
                {isCallingActive ? (
                  <button
                    type="button"
                    onClick={() => setIsCallingActive(false)}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold uppercase flex items-center gap-2 border border-rose-400 animate-pulse cursor-pointer"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>Hang Up ({formatTimer(callTimer)})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCallingActive(true)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase flex items-center gap-2 border border-emerald-400 cursor-pointer shadow-lg"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Start Call</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSendSingleProposal}
                  className="px-4 py-2.5 bg-[#141414] hover:bg-[#1F1F1F] text-blue-400 font-mono text-xs font-medium border border-[#2B2B2B] hover:border-blue-500 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send Proposal</span>
                </button>
              </div>

            </div>

            {/* Direct Contacts Contact Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-[#1C1C1C]">
              
              {/* Phone Card */}
              <div className="p-3 bg-[#000000] border border-[#262626] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-[#141414] border border-[#2B2B2B] flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 font-mono uppercase">Direct Phone</div>
                    <a href={`tel:${activeLead.phoneNumber}`} className="text-xs font-mono font-bold text-white hover:text-blue-400">
                      {activeLead.phoneNumber || 'N/A'}
                    </a>
                  </div>
                </div>
                {activeLead.phoneNumber && (
                  <ClipboardButton text={activeLead.phoneNumber} label="" />
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
                    <div className="text-xs font-mono font-bold text-white truncate max-w-[140px]">
                      {activeLead.email || 'N/A'}
                    </div>
                  </div>
                </div>
                {activeLead.email && (
                  <ClipboardButton text={activeLead.email} label="" />
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
                    className="p-1 border border-[#262626] bg-[#0A0A0A] hover:bg-[#1A1A1A] text-zinc-400 hover:text-white"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

            </div>
          </div>

          {/* Interactive Section: Status Grid + Note Logger */}
          <div className="p-6 space-y-6 flex-1">
            
            {/* 1. Call Status Selector Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 inline-block" />
                  Select Call Status (Instant Save &amp; Advance)
                </label>
                <span className="text-[11px] font-mono text-zinc-500">
                  Clicking a status updates MongoDB &amp; moves to next profile
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {callStatusOptions.map(opt => {
                  const isSelected = selectedStatus === opt.id;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleApplyStatusAndAdvance(opt.id)}
                      className={`p-3.5 border text-left transition-all relative flex flex-col justify-between h-20 cursor-pointer ${
                        isSelected 
                          ? `${opt.color} ring-1 ring-white` 
                          : 'border-[#262626] bg-[#000000] hover:border-zinc-500 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold">{opt.label}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-current" />}
                      </div>
                      <p className="text-[10px] font-mono text-zinc-400 leading-tight">
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Follow-up Date/Time Selector if Follow Up is active */}
              {selectedStatus === 'Follow Up' && (
                <div className="mt-3 p-3 bg-[#111115] border border-yellow-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-yellow-300">
                    <Calendar className="w-4 h-4" />
                    <span>Set Scheduled Follow-Up Date &amp; Time:</span>
                  </div>
                  <input
                    type="datetime-local"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="px-3 py-1.5 bg-[#000000] border border-zinc-700 text-xs font-mono text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
              )}
            </div>

            {/* 2. Call Notes & Quick Tags */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                  Call Log &amp; Workstation Notes
                </label>
                <button
                  type="button"
                  onClick={handleSaveNoteOnly}
                  disabled={!currentNote.trim()}
                  className="px-3 py-1 bg-white text-black font-mono text-[11px] font-bold uppercase tracking-wider hover:bg-zinc-200 disabled:opacity-40 cursor-pointer"
                >
                  Save Note
                </button>
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
                placeholder="Enter detailed call conversation summary, owner intent, objection notes, or next steps..."
                className="w-full p-3 bg-[#000000] border border-[#262626] text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {/* 3. Historical Interaction Timeline */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                <History className="w-3.5 h-3.5 text-zinc-500" />
                <span>Interaction Timeline ({activeLead.callNotes?.length || 0} Notes, {activeLead.emailHistory?.length || 0} Emails)</span>
              </div>

              <div className="space-y-2 max-h-44 overflow-y-auto pr-2">
                {/* Notes History */}
                {activeLead.callNotes && activeLead.callNotes.length > 0 ? (
                  activeLead.callNotes.slice().reverse().map((item, idx) => (
                    <div key={idx} className="p-3 bg-[#0E0E0E] border border-[#1E1E1E] text-xs font-mono space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span className="text-blue-400 font-semibold">{item.author || 'Agent'}</span>
                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-zinc-300 text-xs leading-relaxed">{item.note}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-[#070707] border border-[#1A1A1A] text-xs font-mono text-zinc-600 text-center">
                    No previous call logs recorded for this lead yet.
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

          {/* Bottom Workstation Queue Navigation Footer */}
          <div className="p-4 border-t border-[#222222] bg-[#070707] flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrev}
              disabled={activeQueueIndex === 0}
              className="px-4 py-2 bg-[#121212] border border-[#2B2B2B] hover:bg-[#1C1C1C] hover:border-zinc-500 text-zinc-300 hover:text-white font-mono text-xs flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Profile [P]</span>
            </button>

            <div className="text-xs font-mono text-zinc-500">
              Profile <span className="text-white font-bold">{activeQueueIndex + 1}</span> of <span className="text-white font-bold">{callingQueue.length}</span>
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={activeQueueIndex === callingQueue.length - 1}
              className="px-4 py-2 bg-white text-black hover:bg-zinc-200 border border-white font-mono text-xs font-bold flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <span>Next Profile [N]</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      ) : (
        <div className="flex-1 bg-[#0A0A0A] border border-[#262626] p-12 text-center text-zinc-500 font-mono text-sm">
          Select a profile from the left queue to begin dialing.
        </div>
      )}

    </div>
  );
};

export default CallingWorkstation;
