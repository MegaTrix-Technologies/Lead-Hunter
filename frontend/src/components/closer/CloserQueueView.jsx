import React, { useState, useEffect } from 'react';
import { SaleService, ProductService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  UserCheck, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Package, 
  DollarSign, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  X, 
  Percent, 
  ShieldCheck, 
  AlertCircle,
  Briefcase,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

const formatPKR = (num) => `PKR ${(Number(num) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const CloserQueueView = () => {
  const { user, isSuperAdmin } = useAuth();
  const { addToast } = useToast();

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catalogProducts, setCatalogProducts] = useState([]);
  
  // Action Modal State
  const [activeLead, setActiveLead] = useState(null);
  const [outcome, setOutcome] = useState('Completed'); // 'Completed' | 'Follow Up' | 'Denied'
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

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await SaleService.getCloserQueue({ search: search.trim() || undefined });
      if (res.data?.success) {
        setQueue(res.data.data || []);
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
    fetchQueue();
    fetchProducts();
  }, []);

  const handleOpenActionModal = (lead) => {
    setActiveLead(lead);
    setOutcome('Completed');
    setNotes('');
    setFollowUpDate('');
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

    setSubmitting(true);
    setValidationError('');

    try {
      const payload = {
        outcome,
        products: selectedProducts,
        advanceAmount: parseFloat(advanceAmount) || 0,
        paymentMethod,
        paymentReference: paymentReference.trim(),
        notes: notes.trim(),
        followUpDate: outcome === 'Follow Up' ? followUpDate : undefined
      };

      const res = await SaleService.closeLead(activeLead._id, payload);
      if (res.data?.success) {
        addToast({
          title: outcome === 'Completed' ? 'Deal Successfully Closed!' : 'Lead Updated',
          message: res.data.message,
          type: 'success',
          duration: 4000
        });
        setActiveLead(null);
        fetchQueue();
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
            Act on qualified inbound/agent leads: configure products, finalize negotiated pricing, log sales advances &amp; instantiate projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchQueue}
            className="p-2 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-400 hover:text-white border border-[#2B2B2B] text-xs cursor-pointer transition-colors"
            title="Refresh closer queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── SEARCH & FILTER TOOLBAR ────────────────────────────────────────── */}
      <div className="bg-[#080808] border border-[#222222] p-3.5 flex items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchQueue()}
            placeholder="Search leads by business name, phone, or area..."
            className="w-full pl-8 pr-3 py-1.5 bg-black border border-[#2B2B2B] text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="text-zinc-400 text-xs shrink-0">
          Available Queue: <strong className="text-white">{queue.length} Leads</strong>
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
                  <span className="px-2 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-700 text-[10px] uppercase font-bold shrink-0">
                    {lead.callStatus}
                  </span>
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

                {/* Agent Attribution */}
                <div className="text-[10px] text-zinc-500 mt-2 pt-2 border-t border-[#181818] flex items-center justify-between">
                  <span>Generated By: <strong className="text-zinc-300">{lead.generatedByName || lead.extractedByName || 'Sales Desk'}</strong></span>
                  {lead.dealValue > 0 && (
                    <span className="text-emerald-400 font-bold">
                      Est. PKR {lead.dealValue.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Agent Notes */}
                {lead.callNotes && lead.callNotes.length > 0 && (
                  <div className="mt-2 p-2 bg-black border border-[#1C1C1C] text-[10px] text-zinc-400 line-clamp-2">
                    💬 {lead.callNotes[lead.callNotes.length - 1].note}
                  </div>
                )}
              </div>

              {/* Action Trigger Button */}
              <button
                onClick={() => handleOpenActionModal(lead)}
                className="w-full py-2 bg-[#121E17] hover:bg-[#1A2E23] text-emerald-300 border border-emerald-800 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Act On Lead / Close Deal</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-16 text-center text-zinc-500 text-xs bg-[#080808] border border-[#222222]">
          No pending leads waiting for closer action in the pool right now.
        </div>
      )}

      {/* ─── CLOSER ACTION & PRODUCT CONFIGURATION MODAL ─────────────────────── */}
      {activeLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#090909] border border-[#2B2B2B] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 bg-[#0E0E0E] border-b border-[#202020] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Act on Lead — {activeLead.businessName}
                  </h3>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Lead Gen: {activeLead.generatedByName || activeLead.extractedByName || 'Agent'} • {activeLead.area} • Phone: {activeLead.phoneNumber}
                </p>
              </div>

              <button
                onClick={() => setActiveLead(null)}
                className="p-1 text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitAction} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              
              {/* Validation Alert */}
              {validationError && (
                <div className="p-3 bg-red-950/40 border border-red-700 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* 1. Outcome Selector Tabs */}
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">
                  Select Closing Outcome:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Completed', label: 'Mark Completed (Won Deal)', color: 'border-emerald-600 bg-emerald-950/40 text-emerald-300' },
                    { id: 'Follow Up', label: 'Schedule Follow Up', color: 'border-yellow-600 bg-yellow-950/40 text-yellow-300' },
                    { id: 'Denied', label: 'Mark Denied / Opt-Out', color: 'border-rose-600 bg-rose-950/40 text-rose-300' }
                  ].map(opt => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setOutcome(opt.id)}
                      className={`p-2.5 border text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
                        outcome === opt.id
                          ? `${opt.color} ring-1 ring-white/20`
                          : 'border-[#222222] bg-[#0A0A0A] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. When outcome === 'Completed': Mandatory Product Selection & Pricing */}
              {outcome === 'Completed' && (
                <div className="p-4 bg-[#050B07] border border-emerald-800/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-900/60 pb-2">
                    <span className="text-xs font-bold text-emerald-300 uppercase flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-emerald-400" />
                      Mandatory Offering Selection &amp; Agreed Pricing:
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      {selectedProducts.length} Selected
                    </span>
                  </div>

                  {/* Products Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
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
                              ? 'border-emerald-500 bg-emerald-950/40 ring-1 ring-emerald-500/40'
                              : 'border-[#222222] bg-black/60 hover:border-zinc-700'
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
                                <span className="text-[9px] text-zinc-500">{prod.category}</span>
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

                  {/* Deal Financial & Advance Payment Settlement Console */}
                  {selectedProducts.length > 0 && (
                    <div className="p-4 bg-black border-2 border-emerald-600/80 space-y-4 shadow-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-950">
                        <div>
                          <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider block">Agreed Total Deal Value:</span>
                          <span className="text-xl font-bold text-white font-mono">{formatPKR(totalDealValue)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700">
                            {selectedProducts.length} Offering(s) Configured
                          </span>
                        </div>
                      </div>

                      {/* Advance Amount Selection Presets */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-emerald-300 font-bold uppercase flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                            Select Advance Amount Paid by Client:
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
                            Transaction / Receipt Reference (Optional):
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

              {/* 3. When outcome === 'Follow Up' */}
              {outcome === 'Follow Up' && (
                <div className="p-4 bg-[#0E0C06] border border-yellow-800/80 space-y-3">
                  <label className="block text-xs font-bold text-yellow-300 uppercase">
                    Callback Scheduled Date &amp; Time:
                  </label>
                  <input
                    type="datetime-local"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="px-3 py-2 bg-black border border-yellow-700 text-yellow-200 text-xs focus:outline-none w-full sm:w-auto"
                    required
                  />
                </div>
              )}

              {/* 4. Notes & Interaction Details */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-white uppercase tracking-wider">
                  Closer Notes &amp; Deal Log:
                </label>
                <textarea
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter deal terms, customer commitments, delivery specifications, or reason for denial..."
                  className="w-full p-3 bg-black border border-[#2B2B2B] text-white text-xs placeholder-zinc-700 focus:outline-none focus:border-white resize-none"
                />
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-[#1E1E1E] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveLead(null)}
                  className="px-4 py-2 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-400 border border-[#2A2A2A] text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-white hover:bg-zinc-200 text-black border border-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  {submitting ? (
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm Closer Action</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default CloserQueueView;
