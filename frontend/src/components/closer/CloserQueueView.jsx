import React, { useState, useEffect } from 'react';
import { SaleService, ProductService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../common/StatusBadge';
import ClipboardButton from '../common/ClipboardButton';
import RatingStars from '../common/RatingStars';
import ManualLeadModal from '../crm/ManualLeadModal';
import { 
  UserCheck, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Package, 
  DollarSign, 
  Plus, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  X, 
  Percent, 
  ShieldCheck, 
  AlertCircle,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Globe,
  Check,
  XCircle,
  CalendarCheck,
  History,
  MessageSquare,
  FileText,
  ExternalLink,
  ArrowLeft,
  Tag
} from 'lucide-react';

const formatPKR = (num) => `PKR ${(Number(num) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const toLocalISOString = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDateTimeDisplay = (isoStr) => {
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

const CloserQueueView = () => {
  const { user, isSuperAdmin, isCloser, isSalesAgent } = useAuth();
  const canAddManualLead = isCloser || isSalesAgent;
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('pool'); // 'pool' | 'my_followups' | 'all_followups'
  const [tabCounts, setTabCounts] = useState({ pool: 0, myFollowUps: 0, allFollowUps: 0 });
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isManualLeadModalOpen, setIsManualLeadModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [catalogProducts, setCatalogProducts] = useState([]);
  
  // Action Modal / Workstation State
  const [activeLead, setActiveLead] = useState(null);
  const [outcome, setOutcome] = useState('Completed'); // 'Completed' | 'Follow Up' | 'Denied'
  const [denialReason, setDenialReason] = useState('Budget / Price Too High');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSelectAdvancePreset = (pct) => {
    if (pct === 100) {
      setAdvanceAmount(totalDealValue);
    } else {
      setAdvanceAmount(Math.round((totalDealValue * pct) / 100));
    }
  };

  const applyFollowUpPreset = (type) => {
    const now = new Date();
    let target = new Date();
    if (type === '2h') {
      target = new Date(now.getTime() + 2 * 3600000);
    } else if (type === 'tomorrow_10am') {
      target.setDate(target.getDate() + 1);
      target.setHours(10, 0, 0, 0);
    } else if (type === 'tomorrow_3pm') {
      target.setDate(target.getDate() + 1);
      target.setHours(15, 0, 0, 0);
    } else if (type === 'in_2_days') {
      target.setDate(target.getDate() + 2);
      target.setHours(11, 0, 0, 0);
    } else if (type === 'next_monday') {
      const day = target.getDay();
      const diff = day === 0 ? 1 : 8 - day;
      target.setDate(target.getDate() + diff);
      target.setHours(10, 0, 0, 0);
    }
    setFollowUpDate(toLocalISOString(target));
  };

  const fetchQueue = async (tabToUse = activeTab) => {
    setLoading(true);
    try {
      const res = await SaleService.getCloserQueue({ 
        search: search.trim() || undefined,
        tab: tabToUse
      });
      if (res.data?.success) {
        setQueue(res.data.data || []);
        if (res.data.counts) {
          setTabCounts(res.data.counts);
        }
      }
    } catch (err) {
      console.error('Error fetching closer queue:', err);
      addToast({ title: 'Error', message: 'Failed to load closer queue.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await ProductService.getProducts();
      if (res.data?.success) {
        setCatalogProducts(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching catalog products:', err);
    }
  };

  useEffect(() => {
    fetchQueue(activeTab);
  }, [activeTab]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenActionModal = (lead) => {
    setActiveLead(lead);
    setOutcome('Completed');
    setNotes('');
    setDenialReason('Budget / Price Too High');
    setFollowUpDate(
      lead.closerFollowUpDate 
        ? toLocalISOString(new Date(lead.closerFollowUpDate)) 
        : (lead.followUpDate ? toLocalISOString(new Date(lead.followUpDate)) : '')
    );
    setValidationError('');
    setPaymentMethod('Bank Transfer');
    setPaymentReference('');

    // Pre-populate products if the sales agent selected any
    if (lead.interestedProducts && lead.interestedProducts.length > 0) {
      setSelectedProducts(lead.interestedProducts.map(p => ({
        productId: p.productId || p._id,
        name: p.name,
        category: p.category,
        basePrice: p.basePrice,
        discountPercent: p.discountPercent || 0,
        finalPrice: p.finalPrice || p.basePrice,
        currency: p.currency || 'PKR'
      })));
      const sum = lead.interestedProducts.reduce((acc, p) => acc + (p.finalPrice || p.basePrice || 0), 0);
      setAdvanceAmount(Math.round(sum * 0.5)); // Default 50% advance suggestion
    } else {
      setSelectedProducts([]);
      setAdvanceAmount('');
    }
  };

  const currentLeadIndex = activeLead ? queue.findIndex(l => l._id === activeLead._id) : -1;

  const handleNextLead = () => {
    if (currentLeadIndex >= 0 && currentLeadIndex < queue.length - 1) {
      handleOpenActionModal(queue[currentLeadIndex + 1]);
    }
  };

  const handlePrevLead = () => {
    if (currentLeadIndex > 0) {
      handleOpenActionModal(queue[currentLeadIndex - 1]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!activeLead) return;
      if (e.key === 'Escape') {
        setActiveLead(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLead]);

  // Toggle product selection
  const handleToggleProduct = (product) => {
    setValidationError('');
    const exists = selectedProducts.find(p => (p.productId || p._id) === product._id);
    if (exists) {
      const remaining = selectedProducts.filter(p => (p.productId || p._id) !== product._id);
      setSelectedProducts(remaining);
      const sum = remaining.reduce((acc, p) => acc + p.finalPrice, 0);
      setAdvanceAmount(remaining.length > 0 ? Math.round(sum * 0.5) : '');
    } else {
      const updated = [
        ...selectedProducts,
        {
          productId: product._id,
          name: product.name,
          category: product.category,
          basePrice: product.basePrice,
          discountPercent: 0,
          finalPrice: product.basePrice,
          currency: product.currency || 'PKR'
        }
      ];
      setSelectedProducts(updated);
      const sum = updated.reduce((acc, p) => acc + p.finalPrice, 0);
      setAdvanceAmount(Math.round(sum * 0.5));
    }
  };

  // Adjust discount on a product
  const handleDiscountChange = (prodId, discountVal, basePrice) => {
    const cleanDisc = Math.min(100, Math.max(0, parseFloat(discountVal) || 0));
    const finalPrice = Math.round(basePrice * (1 - cleanDisc / 100));

    const updated = selectedProducts.map(p => {
      if ((p.productId || p._id) === prodId) {
        return { ...p, discountPercent: cleanDisc, finalPrice };
      }
      return p;
    });

    setSelectedProducts(updated);
    const sum = updated.reduce((acc, p) => acc + p.finalPrice, 0);
    setAdvanceAmount(Math.round(sum * 0.5));
  };

  const totalDealValue = selectedProducts.reduce((sum, p) => sum + (p.finalPrice || 0), 0);
  const remainingValue = Math.max(0, totalDealValue - (parseFloat(advanceAmount) || 0));

  const handleSubmitAction = async (e) => {
    e.preventDefault();
    if (!activeLead) return;

    if (outcome === 'Completed') {
      if (selectedProducts.length === 0) {
        setValidationError('Product selection is mandatory when closing a deal.');
        return;
      }
      if (!advanceAmount && advanceAmount !== 0) {
        setValidationError('Please specify the advance payment amount collected.');
        return;
      }
    }

    if (outcome === 'Follow Up' && !followUpDate) {
      setValidationError('Please select a follow-up callback date & time.');
      return;
    }

    setSubmitting(true);
    setValidationError('');

    try {
      const payload = {
        outcome,
        products: selectedProducts,
        advanceAmount: parseFloat(advanceAmount) || 0,
        paymentMethod,
        paymentReference: paymentReference.trim(),
        notes: outcome === 'Denied' 
          ? `[Denial Reason: ${denialReason}] ${notes.trim()}`
          : notes.trim(),
        followUpDate: outcome === 'Follow Up' ? followUpDate : undefined
      };

      const res = await SaleService.closeLead(activeLead._id, payload);
      if (res.data?.success) {
        addToast({
          title: outcome === 'Completed' 
            ? 'Deal Successfully Closed!' 
            : (outcome === 'Follow Up' ? 'Closer Follow-Up Scheduled' : 'Lead Marked Denied'),
          message: res.data.message,
          type: 'success',
          duration: 4000
        });
        setActiveLead(null);
        fetchQueue(activeTab);
      }
    } catch (err) {
      console.error('Error closing lead:', err);
      setValidationError(err.response?.data?.message || err.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-mono">
      
      {/* ─── BANNER HEADER ──────────────────────────────────────────────────── */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 inline-block" />
            <h1 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Sales Closer Queue &amp; Deal Conversion</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-blue-950 text-blue-300 border border-blue-800">
                First-Come First-Serve
              </span>
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Act on qualified inbound/agent leads: configure products, finalize negotiated pricing, schedule closer follow-ups, log sales advances &amp; instantiate projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canAddManualLead && (
            <button
              type="button"
              onClick={() => setIsManualLeadModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black border border-emerald-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              title="Add a new business lead manually"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Lead</span>
            </button>
          )}

          <button
            onClick={() => fetchQueue(activeTab)}
            className="p-2 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-400 hover:text-white border border-[#2B2B2B] text-xs cursor-pointer transition-colors"
            title="Refresh closer queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── QUEUE TABS & FILTER TOOLBAR ─────────────────────────────────────── */}
      <div className="bg-[#080808] border border-[#222222] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* Queue Switcher Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('pool')}
            className={`px-3 py-1.5 border text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'pool'
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600'
                : 'bg-[#101010] text-zinc-400 border-[#262626] hover:text-white hover:border-zinc-600'
            }`}
          >
            <span>New Leads Pool</span>
            <span className="px-1.5 py-0.2 bg-black text-[10px] font-mono rounded">
              {tabCounts.pool}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_followups')}
            className={`px-3 py-1.5 border text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'my_followups'
                ? 'bg-amber-950/60 text-amber-300 border-amber-600'
                : 'bg-[#101010] text-zinc-400 border-[#262626] hover:text-white hover:border-zinc-600'
            }`}
          >
            <span>My Closer Follow-Ups</span>
            <span className="px-1.5 py-0.2 bg-black text-[10px] font-mono rounded">
              {tabCounts.myFollowUps}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all_followups')}
            className={`px-3 py-1.5 border text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'all_followups'
                ? 'bg-blue-950/60 text-blue-300 border-blue-600'
                : 'bg-[#101010] text-zinc-400 border-[#262626] hover:text-white hover:border-zinc-600'
            }`}
          >
            <span>All Closer Follow-Ups</span>
            <span className="px-1.5 py-0.2 bg-black text-[10px] font-mono rounded">
              {tabCounts.allFollowUps}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchQueue(activeTab)}
            placeholder="Search leads..."
            className="w-full pl-8 pr-3 py-1 bg-black border border-[#2B2B2B] text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* ─── LEADS CARDS / TABLE STREAM ─────────────────────────────────────── */}
      {loading ? (
        <div className="p-16 text-center text-zinc-500 text-xs">
          Loading closer opportunity queue...
        </div>
      ) : queue.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {queue.map(lead => (
            <div
              key={lead._id}
              className="p-4 bg-[#0A0A0A] border border-[#222222] hover:border-zinc-500 transition-all flex flex-col justify-between gap-3 group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate flex-1">
                    {lead.businessName}
                  </h3>
                  <StatusBadge status={lead.callStatus} size="sm" />
                </div>

                <div className="text-xs text-zinc-400 mt-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] truncate">
                    <MapPin className="w-3 h-3 text-zinc-600 shrink-0" />
                    <span>{lead.area} • {lead.category}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] truncate">
                    <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-white font-bold">{lead.phoneNumber || 'No phone'}</span>
                  </div>
                  {lead.email && (
                    <div className="flex items-center gap-1.5 text-[11px] truncate text-zinc-500">
                      <Mail className="w-3 h-3 text-purple-400 shrink-0" />
                      <span>{lead.email}</span>
                    </div>
                  )}
                </div>

                {/* Follow-up schedule badge */}
                {(lead.closerFollowUpDate || (lead.callStatus === 'Closer Follow Up' && lead.followUpDate)) && (
                  <div className="mt-2 p-1.5 bg-amber-950/40 border border-amber-800/60 text-[10px] text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Closer Callback: {formatDateTimeDisplay(lead.closerFollowUpDate || lead.followUpDate)}</span>
                  </div>
                )}
                {lead.callStatus === 'Follow Up' && lead.followUpDate && (
                  <div className="mt-2 p-1.5 bg-yellow-950/40 border border-yellow-800/60 text-[10px] text-yellow-300 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-yellow-400 shrink-0" />
                    <span>Agent Callback: {formatDateTimeDisplay(lead.followUpDate)}</span>
                  </div>
                )}

                {/* Agent Attribution & Deal value */}
                <div className="text-[10px] text-zinc-500 mt-2 pt-2 border-t border-[#181818] flex items-center justify-between">
                  <span>Qualified: <strong className="text-zinc-300">{lead.generatedByName || lead.extractedByName || 'Sales Desk'}</strong></span>
                  {lead.dealValue > 0 && (
                    <span className="text-emerald-400 font-bold font-mono">
                      PKR {lead.dealValue.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Agent Notes snippet */}
                {lead.callNotes && lead.callNotes.length > 0 && (
                  <div className="mt-2 p-2 bg-black border border-[#1C1C1C] text-[10px] text-zinc-400 line-clamp-2 font-mono">
                    💬 {lead.callNotes[lead.callNotes.length - 1].note}
                  </div>
                )}
              </div>

              {/* Action Trigger Button */}
              <button
                type="button"
                onClick={() => handleOpenActionModal(lead)}
                className="w-full py-2.5 bg-[#121E17] hover:bg-[#1A2E23] text-emerald-300 border border-emerald-800 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors shadow"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Act On Lead / Close Deal</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-16 text-center text-zinc-500 text-xs bg-[#080808] border border-[#222222]">
          No pending leads in this queue tab right now.
        </div>
      )}

      {/* ─── FULL-WINDOW CRM WORKSTATION MODAL ─────────────────────────────── */}
      {activeLead && (
        <div className="fixed inset-0 z-[9999] bg-[#060606] flex flex-col w-screen h-screen overflow-hidden animate-in fade-in duration-150">
          
          {/* 1. TOP BAR / WORKSTATION HEADER */}
          <div className="px-6 py-4 bg-[#0A0A0A] border-b border-[#202020] flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setActiveLead(null)}
                className="px-3 py-1.5 bg-[#121212] hover:bg-[#1C1C1C] text-zinc-300 hover:text-white border border-[#2B2B2B] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Queue</span>
              </button>

              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-bold text-white tracking-wide">
                    {activeLead.businessName}
                  </h2>
                  <StatusBadge status={activeLead.callStatus} size="md" />
                  <span className="text-xs px-2 py-0.5 bg-[#141414] border border-[#2B2B2B] text-zinc-300">
                    {activeLead.category || 'General'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-zinc-400">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    {activeLead.address || activeLead.area || 'Lahore'}
                  </span>
                  <RatingStars rating={activeLead.rating} reviewCount={activeLead.reviewCount} />
                  <span className="text-zinc-500">•</span>
                  <span>
                    Qualified by: <strong className="text-zinc-200">{activeLead.generatedByName || activeLead.extractedByName || 'Sales Agent'}</strong>
                  </span>
                  {activeLead.closerName && (
                    <>
                      <span className="text-zinc-500">•</span>
                      <span className="text-amber-300">
                        Closer: <strong>{activeLead.closerName}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Queue Stepper / Navigation Controls */}
            <div className="flex items-center gap-2 self-end lg:self-center">
              {currentLeadIndex >= 0 && (
                <div className="flex items-center gap-1.5 mr-2">
                  <button
                    type="button"
                    onClick={handlePrevLead}
                    disabled={currentLeadIndex === 0}
                    className="px-2.5 py-1.5 bg-[#121212] hover:bg-[#1A1A1A] text-zinc-300 border border-[#2B2B2B] text-xs font-bold disabled:opacity-30 cursor-pointer flex items-center gap-1"
                    title="Previous lead [P]"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <span className="text-xs text-zinc-400 font-mono px-1">
                    #{currentLeadIndex + 1} / {queue.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextLead}
                    disabled={currentLeadIndex === queue.length - 1}
                    className="px-2.5 py-1.5 bg-[#121212] hover:bg-[#1A1A1A] text-zinc-300 border border-[#2B2B2B] text-xs font-bold disabled:opacity-30 cursor-pointer flex items-center gap-1"
                    title="Next lead [N]"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setActiveLead(null)}
                className="p-1.5 bg-[#121212] hover:bg-[#1F1F1F] text-zinc-400 hover:text-white border border-[#2B2B2B] cursor-pointer"
                title="Close Workstation (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. QUICK DETAILS BAR (Like CRM) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#1A1A1A] border-b border-[#1E1E1E] bg-[#050505] shrink-0 text-xs">
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-950/40 border border-emerald-800/60 text-emerald-400">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-mono">Direct Phone</div>
                  <a
                    href={`tel:${activeLead.phoneNumber}`}
                    className="text-xs font-bold text-white hover:text-emerald-400 hover:underline font-mono"
                  >
                    {activeLead.phoneNumber || 'No phone registered'}
                  </a>
                </div>
              </div>
              {activeLead.phoneNumber && <ClipboardButton text={activeLead.phoneNumber} />}
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-950/40 border border-blue-800/60 text-blue-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-mono">Website</div>
                  {activeLead.website ? (
                    <a
                      href={activeLead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-blue-400 hover:underline truncate max-w-[140px] block"
                    >
                      {activeLead.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-500 font-mono">None registered</span>
                  )}
                </div>
              </div>
              {activeLead.website && <ClipboardButton text={activeLead.website} />}
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-950/40 border border-purple-800/60 text-purple-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-mono">Email Address</div>
                  {activeLead.email ? (
                    <a
                      href={`mailto:${activeLead.email}`}
                      className="text-xs font-bold text-white hover:text-purple-400 hover:underline truncate max-w-[140px] block"
                    >
                      {activeLead.email}
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-500 font-mono">None registered</span>
                  )}
                </div>
              </div>
              {activeLead.email && <ClipboardButton text={activeLead.email} />}
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-950/40 border border-amber-800/60 text-amber-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-mono">
                    {activeLead.callStatus === 'Closer Follow Up' ? 'Closer Follow-Up' : 'Callback Schedule'}
                  </div>
                  <div className="text-xs font-bold text-amber-300 font-mono">
                    {formatDateTimeDisplay(activeLead.closerFollowUpDate || activeLead.followUpDate) || 'None Scheduled'}
                  </div>
                </div>
              </div>
              {activeLead.dealValue > 0 && (
                <span className="text-[11px] font-mono font-bold text-emerald-400">
                  PKR {activeLead.dealValue.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* 3. WORKSPACE BODY: 2-COLUMN CRM WORKSTATION */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#080808]">
            
            {/* LEFT COLUMN (col-span-5): Lead Dossier, Agent Handoff, Call Timeline */}
            <div className="lg:col-span-5 space-y-5">
              
              {/* Sales Agent Qualification Brief & Initial Products */}
              <div className="p-4 bg-[#0A0A0A] border border-[#222222] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-400" />
                    <span>Sales Agent Qualification Handoff</span>
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 bg-[#141414] text-zinc-400 border border-[#262626]">
                    Agent: {activeLead.generatedByName || activeLead.extractedByName || 'Sales Agent'}
                  </span>
                </div>

                {activeLead.additionalInfo && (
                  <div className="p-3 bg-black border border-[#1A1A1A] text-xs text-zinc-300 space-y-1">
                    <div className="text-[10px] text-zinc-500 uppercase font-mono font-bold">Qualification Notes:</div>
                    <p className="whitespace-pre-line leading-relaxed">{activeLead.additionalInfo}</p>
                  </div>
                )}

                {activeLead.interestedProducts && activeLead.interestedProducts.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-zinc-400 uppercase font-mono font-bold">
                      Products Proposed by Agent:
                    </div>
                    <div className="space-y-1">
                      {activeLead.interestedProducts.map((p, i) => (
                        <div key={i} className="p-2 bg-[#050505] border border-[#1E1E1E] flex items-center justify-between text-xs">
                          <div>
                            <span className="text-white font-bold">{p.name}</span>
                            {p.category && <span className="text-zinc-500 text-[10px] ml-2">({p.category})</span>}
                          </div>
                          <span className="font-mono font-bold text-emerald-400">
                            {formatPKR(p.finalPrice || p.basePrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500 italic">
                    No initial products locked by sales agent. Closer can select offerings from the catalog.
                  </p>
                )}
              </div>

              {/* Call Notes & Historical Interaction Timeline */}
              <div className="p-4 bg-[#0A0A0A] border border-[#222222] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-400" />
                    <span>Call Notes &amp; Interaction Timeline</span>
                  </h4>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {activeLead.callNotes ? activeLead.callNotes.length : 0} Entries
                  </span>
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {activeLead.callNotes && activeLead.callNotes.length > 0 ? (
                    activeLead.callNotes.slice().reverse().map((n, idx) => (
                      <div key={idx} className="p-3 bg-black border border-[#1C1C1C] space-y-1 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-zinc-500">
                          <span className="text-zinc-300 font-bold">
                            {n.author || 'Desk Agent'}
                          </span>
                          <span className="font-mono">
                            {formatDateTimeDisplay(n.timestamp)}
                          </span>
                        </div>
                        <p className="text-zinc-300 whitespace-pre-line leading-relaxed">
                          {n.note}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-zinc-600 text-xs italic">
                      No previous notes recorded for this lead.
                    </div>
                  )}
                </div>
              </div>

              {/* Business Profile Metadata */}
              <div className="p-4 bg-[#0A0A0A] border border-[#222222] space-y-2 text-xs">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1A1A1A] pb-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Location &amp; Registry Details</span>
                </h4>
                <div className="space-y-1 text-zinc-400">
                  <div><strong>Address:</strong> {activeLead.address || 'Not listed'}</div>
                  <div><strong>Area / City:</strong> {activeLead.area || 'Lahore'}</div>
                  <div><strong>Category:</strong> {activeLead.category || 'General'}</div>
                  {activeLead.rating && (
                    <div><strong>Google Rating:</strong> ⭐ {activeLead.rating} ({activeLead.reviewCount || 0} reviews)</div>
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN (col-span-7): 3 Action Buttons & Closer Console */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* THE 3 ACTION BUTTONS (Deal closed, Denied, Follow up) */}
              <div className="p-5 bg-[#0A0A0A] border border-[#262626] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <span>Select Closer Action:</span>
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    Replaces cold calling dispositions with closing workflows
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* 1. Deal Closed Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setOutcome('Completed');
                      setValidationError('');
                    }}
                    className={`p-3.5 border text-xs font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      outcome === 'Completed'
                        ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-950/50'
                        : 'border-[#222222] bg-[#0E0E0E] text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <CheckCircle2 className={`w-5 h-5 ${outcome === 'Completed' ? 'text-emerald-400' : 'text-zinc-500'}`} />
                    <span>Deal Closed</span>
                    <span className="text-[9px] text-zinc-500 font-normal">Won Deal &amp; Advance</span>
                  </button>

                  {/* 2. Follow Up Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setOutcome('Follow Up');
                      setValidationError('');
                      if (!followUpDate) applyFollowUpPreset('tomorrow_10am');
                    }}
                    className={`p-3.5 border text-xs font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      outcome === 'Follow Up'
                        ? 'border-amber-500 bg-amber-950/60 text-amber-300 ring-2 ring-amber-500/50 shadow-lg shadow-amber-950/50'
                        : 'border-[#222222] bg-[#0E0E0E] text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <Clock className={`w-5 h-5 ${outcome === 'Follow Up' ? 'text-amber-400' : 'text-zinc-500'}`} />
                    <span>Follow Up</span>
                    <span className="text-[9px] text-zinc-500 font-normal">Closer Callback</span>
                  </button>

                  {/* 3. Denied Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setOutcome('Denied');
                      setValidationError('');
                    }}
                    className={`p-3.5 border text-xs font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      outcome === 'Denied'
                        ? 'border-rose-500 bg-rose-950/60 text-rose-300 ring-2 ring-rose-500/50 shadow-lg shadow-rose-950/50'
                        : 'border-[#222222] bg-[#0E0E0E] text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <XCircle className={`w-5 h-5 ${outcome === 'Denied' ? 'text-rose-400' : 'text-zinc-500'}`} />
                    <span>Denied</span>
                    <span className="text-[9px] text-zinc-500 font-normal">Lost / Opt-Out</span>
                  </button>
                </div>
              </div>

              {/* ACTION CONSOLE: DEAL CLOSED (Won Deal) */}
              {outcome === 'Completed' && (
                <div className="p-5 bg-[#050B07] border-2 border-emerald-800/80 space-y-5">
                  <div className="flex items-center justify-between border-b border-emerald-900/60 pb-3">
                    <span className="text-xs font-bold text-emerald-300 uppercase flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-400" />
                      Select Products &amp; Negotiated Closing Rates:
                    </span>
                    <span className="text-xs text-emerald-400 font-mono font-bold">
                      {selectedProducts.length} Product(s) Selected
                    </span>
                  </div>

                  {/* Product Catalog Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {catalogProducts.map(prod => {
                      const isSelected = selectedProducts.some(p => (p.productId || p._id) === prod._id);
                      const selectedItem = selectedProducts.find(p => (p.productId || p._id) === prod._id);
                      const currentDiscount = selectedItem ? selectedItem.discountPercent : 0;
                      const currentFinalPrice = selectedItem ? selectedItem.finalPrice : prod.basePrice;
                      const maxDisc = prod.maxDiscountPercent || 0;

                      return (
                        <div
                          key={prod._id}
                          className={`p-3 border transition-all ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-950/50 ring-1 ring-emerald-500/40'
                              : 'border-[#222222] bg-black/70 hover:border-zinc-700'
                          }`}
                        >
                          <div
                            onClick={() => handleToggleProduct(prod)}
                            className="flex items-start justify-between gap-2 cursor-pointer select-none"
                          >
                            <div className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="mt-0.5 w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                              />
                              <div>
                                <div className="text-xs font-bold text-white">{prod.name}</div>
                                <span className="text-[10px] text-zinc-500">{prod.category}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-bold font-mono text-white">
                                {formatPKR(prod.basePrice)}
                              </div>
                              {maxDisc > 0 && (
                                <span className="text-[9px] text-purple-400 font-mono block">Max {maxDisc}% off</span>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <div className="mt-2.5 pt-2 border-t border-emerald-900/50 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-zinc-400">Discount: {currentDiscount}%</span>
                                <span className="text-emerald-400 font-bold font-mono">
                                  Closing: {formatPKR(currentFinalPrice)}
                                </span>
                              </div>
                              {maxDisc > 0 && (
                                <input
                                  type="range"
                                  min="0"
                                  max={maxDisc}
                                  step="1"
                                  value={currentDiscount}
                                  onChange={(e) => handleDiscountChange(prod._id, e.target.value, prod.basePrice)}
                                  className="w-full accent-purple-500 bg-zinc-800 h-1 cursor-pointer"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Financial Deal Console */}
                  {selectedProducts.length > 0 && (
                    <div className="p-4 bg-black border-2 border-emerald-600/80 space-y-4 shadow-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-950">
                        <div>
                          <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider block">Total Agreed Deal Value:</span>
                          <span className="text-2xl font-bold text-white font-mono">{formatPKR(totalDealValue)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700">
                            {selectedProducts.length} Offering(s) Configured
                          </span>
                        </div>
                      </div>

                      {/* Advance Amount Selection Presets */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-emerald-300 font-bold uppercase flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                            Advance Payment Collected by Closer:
                          </label>
                          <span className="text-xs text-emerald-400 font-mono font-bold">
                            {totalDealValue > 0 ? Math.round(((parseFloat(advanceAmount) || 0) / totalDealValue) * 100) : 0}% of Total
                          </span>
                        </div>

                        {/* Quick Preset Buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                          {[
                            { pct: 100, label: '100% Full Cash' },
                            { pct: 75, label: '75% Advance' },
                            { pct: 50, label: '50% (Standard)' },
                            { pct: 30, label: '30% Advance' },
                            { pct: 25, label: '25% Advance' }
                          ].map(preset => {
                            const isCurrent = totalDealValue > 0 && Math.round((parseFloat(advanceAmount) || 0)) === Math.round((totalDealValue * preset.pct) / 100);
                            return (
                              <button
                                key={preset.pct}
                                type="button"
                                onClick={() => handleSelectAdvancePreset(preset.pct)}
                                className={`px-2.5 py-2 text-xs font-mono font-bold uppercase border transition-all cursor-pointer ${
                                  isCurrent
                                    ? 'bg-emerald-500 text-black border-emerald-300 shadow-md ring-1 ring-emerald-300'
                                    : 'bg-[#101010] text-zinc-300 border-[#2A2A2A] hover:border-emerald-700 hover:text-white'
                                }`}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Percentage Slider */}
                        <div className="pt-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={totalDealValue > 0 ? Math.round(((parseFloat(advanceAmount) || 0) / totalDealValue) * 100) : 0}
                            onChange={(e) => {
                              const pct = parseInt(e.target.value) || 0;
                              setAdvanceAmount(Math.round((totalDealValue * pct) / 100));
                            }}
                            className="w-full accent-emerald-500 bg-zinc-800 h-2 cursor-pointer"
                          />
                        </div>

                        {/* Exact Amount Input Field */}
                        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-2.5 text-zinc-500 text-xs font-mono font-bold">PKR</span>
                            <input
                              type="number"
                              min="0"
                              max={totalDealValue}
                              value={advanceAmount}
                              onChange={(e) => setAdvanceAmount(e.target.value)}
                              placeholder="0"
                              className="w-full pl-12 pr-4 py-2 bg-[#0A0A0A] border border-emerald-600 text-white font-bold font-mono text-sm focus:outline-none focus:border-emerald-400"
                              required
                            />
                          </div>
                          <span className="text-[11px] text-zinc-400 italic">
                            Select preset above or type custom advance PKR
                          </span>
                        </div>
                      </div>

                      {/* Dual Breakdown Summary Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="p-3 bg-[#061208] border border-emerald-800/80 space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 uppercase font-bold">
                            <span>Advance Paid Now:</span>
                            <span className="text-emerald-400">Immediate</span>
                          </div>
                          <div className="text-lg font-bold font-mono text-emerald-300">
                            {formatPKR(advanceAmount)}
                          </div>
                          <div className="text-[10px] text-zinc-500">Credited to accounts ledger upon closing</div>
                        </div>

                        <div className={`p-3 border space-y-1 ${
                          remainingValue > 0 
                            ? 'bg-[#140E04] border-amber-800/80' 
                            : 'bg-[#0E0614] border-purple-800/80'
                        }`}>
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 uppercase font-bold">
                            <span>Remaining Balance:</span>
                            <span className={remainingValue > 0 ? 'text-amber-400' : 'text-purple-400 font-bold'}>
                              {remainingValue > 0 ? 'Due on Delivery' : 'Zero Balance'}
                            </span>
                          </div>
                          <div className={`text-lg font-bold font-mono ${remainingValue > 0 ? 'text-amber-300' : 'text-purple-300'}`}>
                            {formatPKR(remainingValue)}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {remainingValue > 0 ? 'Collected by closer after project is delivered' : 'Full payment collected upfront'}
                          </div>
                        </div>
                      </div>

                      {/* Payment Method & Transaction Reference */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
                        <div>
                          <label className="block text-[11px] text-zinc-400 uppercase font-bold mb-1">
                            Payment Method:
                          </label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-[#0A0A0A] border border-zinc-700 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                          >
                            <option value="Bank Transfer">Bank Transfer (Meezan / HBL / Alfalah)</option>
                            <option value="JazzCash">JazzCash</option>
                            <option value="EasyPaisa">EasyPaisa</option>
                            <option value="Cash">Direct Cash Collection</option>
                            <option value="Online / Card">Online / Debit / Credit Card</option>
                            <option value="Cheque">Cross Cheque</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-zinc-400 uppercase font-bold mb-1">
                            Transaction / Receipt Reference:
                          </label>
                          <input
                            type="text"
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            placeholder="e.g. TR-89342 or Cash receipt #12"
                            className="w-full px-2.5 py-1.5 bg-[#0A0A0A] border border-zinc-700 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ACTION CONSOLE: FOLLOW UP (Closer Callback) */}
              {outcome === 'Follow Up' && (
                <div className="p-5 bg-[#0E0C06] border-2 border-amber-800/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-amber-900/60 pb-3">
                    <span className="text-xs font-bold text-amber-300 uppercase flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      Schedule Closer Callback &amp; Negotiation:
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">
                      Assigned exclusively to your closer queue
                    </span>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-zinc-300 uppercase">
                      Callback Scheduled Date &amp; Time:
                    </label>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <input
                        type="datetime-local"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="px-3 py-2 bg-black border border-amber-700 text-amber-200 text-xs font-mono focus:outline-none w-full sm:w-auto"
                        required
                      />
                      <span className="text-xs text-amber-400 font-mono font-bold">
                        {followUpDate ? formatDateTimeDisplay(followUpDate) : 'Select date below'}
                      </span>
                    </div>

                    {/* Quick Presets */}
                    <div className="pt-2">
                      <div className="text-[10px] text-zinc-500 uppercase font-mono mb-1.5">
                        Quick Callback Presets:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                        {[
                          { id: '2h', label: '+2 Hours' },
                          { id: 'tomorrow_10am', label: 'Tmrw 10 AM' },
                          { id: 'tomorrow_3pm', label: 'Tmrw 3 PM' },
                          { id: 'in_2_days', label: 'In 2 Days' },
                          { id: 'next_monday', label: 'Next Mon' }
                        ].map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => applyFollowUpPreset(p.id)}
                            className="px-2 py-1.5 bg-[#141414] hover:bg-amber-950 text-amber-300 hover:text-amber-200 border border-amber-800/60 text-xs font-mono font-bold cursor-pointer transition-colors"
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Optional Proposed Products during Follow-up */}
                  <div className="pt-2 border-t border-amber-950">
                    <div className="text-[11px] text-zinc-400 mb-2">
                      Proposed Offerings Under Negotiation ({selectedProducts.length} Selected):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {catalogProducts.map(prod => {
                        const isSelected = selectedProducts.some(p => (p.productId || p._id) === prod._id);
                        return (
                          <div
                            key={prod._id}
                            onClick={() => handleToggleProduct(prod)}
                            className={`p-2 border text-xs cursor-pointer flex items-center justify-between ${
                              isSelected 
                                ? 'border-amber-500 bg-amber-950/40 text-amber-200' 
                                : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'
                            }`}
                          >
                            <span className="truncate">{prod.name}</span>
                            <span className="font-mono font-bold text-[10px] shrink-0 ml-2">{formatPKR(prod.basePrice)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION CONSOLE: DENIED (Lost / Opt-Out) */}
              {outcome === 'Denied' && (
                <div className="p-5 bg-[#120606] border-2 border-rose-800/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-rose-900/60 pb-3">
                    <span className="text-xs font-bold text-rose-300 uppercase flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-rose-400" />
                      Record Deal Loss / Denial Reason:
                    </span>
                    <span className="text-[10px] text-rose-400 font-mono">
                      Lead will be closed and removed from active pool
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-300 uppercase">
                      Primary Reason for Denial:
                    </label>
                    <select
                      value={denialReason}
                      onChange={(e) => setDenialReason(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-rose-800 text-rose-200 text-xs font-mono focus:outline-none"
                    >
                      <option value="Budget / Price Too High">Budget / Price Too High</option>
                      <option value="Competitor Chosen">Competitor Chosen / Already Has Vendor</option>
                      <option value="Timing / Not Ready Now">Timing / Not Ready Right Now</option>
                      <option value="No Requirement / Not Interested">No Requirement / Not Interested</option>
                      <option value="Invalid / Fake Contact">Invalid / Fake Contact</option>
                      <option value="Client Unresponsive / Ghosted">Client Unresponsive / Ghosted</option>
                      <option value="Other">Other Reason (Specify in Notes)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* CLOSER NOTES & DEAL LOG */}
              <div className="p-4 bg-[#0A0A0A] border border-[#222222] space-y-2">
                <label className="block text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                  <span>Closer Deal Notes &amp; Interaction Log:</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Appended to lead audit history</span>
                </label>
                <textarea
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    outcome === 'Completed'
                      ? 'Enter agreed scope, deliverables, client expectations, special terms...'
                      : (outcome === 'Follow Up' ? 'Enter callback topics, specific objections to resolve, negotiated rates...' : 'Enter feedback or reason details...')
                  }
                  className="w-full p-3 bg-black border border-[#2B2B2B] text-white text-xs placeholder-zinc-700 focus:outline-none focus:border-blue-500 resize-none font-mono"
                />
              </div>

            </div>

          </div>

          {/* 4. STICKY ACTION CONFIRMATION FOOTER */}
          <div className="px-6 py-4 bg-[#0A0A0A] border-t border-[#202020] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveLead(null)}
                className="px-4 py-2 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-400 hover:text-white border border-[#2B2B2B] text-xs font-bold uppercase cursor-pointer transition-colors"
              >
                Cancel [Esc]
              </button>

              {validationError && (
                <div className="text-red-400 text-xs flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSubmitAction}
                disabled={submitting}
                className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-40 shadow-lg transition-all ${
                  outcome === 'Completed'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black border border-emerald-300'
                    : (outcome === 'Follow Up'
                      ? 'bg-amber-500 hover:bg-amber-400 text-black border border-amber-300'
                      : 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400')
                }`}
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : outcome === 'Completed' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : outcome === 'Follow Up' ? (
                  <CalendarCheck className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}

                <span>
                  {outcome === 'Completed'
                    ? (advanceAmount ? `Confirm & Won Deal (${formatPKR(advanceAmount)} Advance)` : 'Confirm & Won Deal')
                    : (outcome === 'Follow Up'
                      ? 'Confirm Closer Follow-Up Callback'
                      : 'Confirm Mark Denied')}
                </span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ─── MANUAL LEAD CREATION MODAL ────────────────────────────────────── */}
      <ManualLeadModal
        isOpen={isManualLeadModalOpen}
        onClose={() => setIsManualLeadModalOpen(false)}
        onSuccess={() => fetchQueue(activeTab)}
        defaultStatus="Lead"
      />

    </div>
  );
};

export default CloserQueueView;
