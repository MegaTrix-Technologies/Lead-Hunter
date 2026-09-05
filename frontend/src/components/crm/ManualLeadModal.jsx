import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LeadService, DatasetService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  Building2, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  Tag, 
  Star, 
  MessageSquare, 
  Calendar, 
  Database, 
  X, 
  Plus, 
  Loader2,
  CheckCircle2
} from 'lucide-react';

const COMMON_NICHES = [
  'Real Estate',
  'Solar Energy',
  'Software & IT',
  'Digital Marketing',
  'Law Firm',
  'Dental & Healthcare',
  'Roofing & Construction',
  'E-Commerce'
];

const ManualLeadModal = ({ isOpen, onClose, onSuccess, initialDatasetId = null, defaultStatus = 'Uncontacted' }) => {
  const { user, isCloser } = useAuth();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    businessName: '',
    category: '',
    area: '',
    address: '',
    phoneNumber: '',
    email: '',
    website: '',
    rating: '',
    reviewCount: '',
    callStatus: defaultStatus,
    followUpDate: '',
    closerFollowUpDate: '',
    datasetId: initialDatasetId || '',
    notes: ''
  });

  const [datasets, setDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      setForm(prev => ({
        ...prev,
        callStatus: defaultStatus,
        datasetId: initialDatasetId || prev.datasetId || '',
        followUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        closerFollowUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }));

      // Fetch user datasets for selection
      const loadDatasets = async () => {
        setLoadingDatasets(true);
        try {
          const res = await DatasetService.getDatasets();
          if (res.data?.success) {
            setDatasets(res.data.data || []);
          }
        } catch (err) {
          console.error('[ManualLeadModal] Error fetching datasets:', err);
        } finally {
          setLoadingDatasets(false);
        }
      };
      loadDatasets();
    }
  }, [isOpen, initialDatasetId, defaultStatus]);

  // Body scroll lock & Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.businessName.trim()) {
      addToast({ title: 'Validation Error', message: 'Business name is required.', type: 'error' });
      return;
    }
    if (!form.category.trim()) {
      addToast({ title: 'Validation Error', message: 'Industry category is required.', type: 'error' });
      return;
    }
    if (!form.area.trim()) {
      addToast({ title: 'Validation Error', message: 'Commercial area / city is required.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        businessName: form.businessName.trim(),
        category: form.category.trim(),
        area: form.area.trim(),
        address: form.address.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        rating: form.rating ? parseFloat(form.rating) : 0,
        reviewCount: form.reviewCount ? parseInt(form.reviewCount, 10) : 0,
        callStatus: form.callStatus,
        followUpDate: form.callStatus === 'Follow Up' ? form.followUpDate : undefined,
        closerFollowUpDate: form.callStatus === 'Closer Follow Up' ? form.closerFollowUpDate : undefined,
        datasetId: form.datasetId || undefined,
        notes: form.notes.trim()
      };

      const res = await LeadService.createLead(payload);
      if (res.data?.success) {
        addToast({
          title: 'Lead Added',
          message: `Successfully created business profile for "${form.businessName}".`,
          type: 'success'
        });

        if (onSuccess) {
          onSuccess(res.data.data);
        }
        onClose();
      }
    } catch (err) {
      console.error('[ManualLeadModal] Create lead error:', err);
      addToast({
        title: 'Error Creating Lead',
        message: err.response?.data?.message || err.message || 'Failed to add lead.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-sm font-mono overflow-y-auto">
      <div className="bg-[#090909] border border-[#2B2B2B] w-full max-w-3xl lg:max-w-4xl shadow-2xl relative my-8 overflow-hidden text-xs">
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 bg-[#0E0E0E] border-b border-[#202020] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-950/60 border border-blue-600/60 text-blue-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Add Business Lead Manually</span>
                <span className="text-[10px] px-2 py-0.5 bg-blue-900/40 text-blue-300 border border-blue-700/60">
                  {isCloser ? 'CLOSER DESK' : 'SALES AGENT'}
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Log a direct outbound prospect or referral with full business parameters and pipeline routing.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white bg-[#141414] hover:bg-[#1E1E1E] border border-[#262626] cursor-pointer transition-colors"
            title="Close [Esc]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Section 1: Business Essentials */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#1C1C1C]">
              <Building2 className="w-3.5 h-3.5" />
              <span>1. Business Essentials</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">
                  Business Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="e.g. Apex Solar Systems Ltd."
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">
                  Industry / Niche <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Solar Energy, Real Estate, Law"
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Quick Niche Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-zinc-500 uppercase">Suggestions:</span>
              {COMMON_NICHES.map(niche => (
                <button
                  type="button"
                  key={niche}
                  onClick={() => setForm({ ...form, category: niche })}
                  className={`px-2 py-0.5 text-[10px] border transition-colors cursor-pointer ${
                    form.category === niche
                      ? 'bg-blue-950 border-blue-500 text-blue-300'
                      : 'bg-[#101010] border-[#222222] text-zinc-400 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  {niche}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">
                  Area / City / Region <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder="e.g. Gulberg, Lahore or DHA Karachi"
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">
                  Full Street Address (Optional)
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. Suite 402, Main Boulevard"
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Web Presence */}
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#1C1C1C]">
              <Phone className="w-3.5 h-3.5" />
              <span>2. Contact &amp; Online Footprint</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={form.phoneNumber}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                    placeholder="0300-1234567"
                    className="w-full pl-8 pr-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="info@company.com"
                    className="w-full pl-8 pr-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">Website URL</label>
                <div className="relative">
                  <Globe className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://company.com"
                    className="w-full pl-8 pr-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Reputation & Initial Pipeline State */}
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#1C1C1C]">
              <Tag className="w-3.5 h-3.5" />
              <span>3. Pipeline Status &amp; Dataset Association</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">
                  Initial Call Status
                </label>
                <select
                  value={form.callStatus}
                  onChange={(e) => setForm({ ...form, callStatus: e.target.value })}
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="Uncontacted">Uncontacted (Queue for Outbound Calling)</option>
                  <option value="Shows Interest">Shows Interest (Warm Prospect)</option>
                  <option value="Follow Up">Follow Up (Sales Agent Scheduled)</option>
                  <option value="Lead">Lead (Closer Queue Deal Desk)</option>
                  <option value="Closer Follow Up">Closer Follow Up (Scheduled Closer Action)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">
                  Assign to Dataset
                </label>
                <select
                  value={form.datasetId}
                  onChange={(e) => setForm({ ...form, datasetId: e.target.value })}
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">(Standalone Lead • Direct Outbound)</option>
                  {datasets.map(ds => (
                    <option key={ds._id} value={ds._id}>
                      {ds.name} ({ds.totalLeads || 0} leads)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Conditional Follow-up date pickers */}
            {form.callStatus === 'Follow Up' && (
              <div className="p-3 bg-amber-950/20 border border-amber-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-amber-300">
                  <Calendar className="w-4 h-4" />
                  <span className="font-bold">Sales Agent Follow-Up Date:</span>
                </div>
                <input
                  type="date"
                  required
                  value={form.followUpDate}
                  onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                  className="px-3 py-1.5 bg-black border border-amber-600/60 text-white focus:outline-none"
                />
              </div>
            )}

            {form.callStatus === 'Closer Follow Up' && (
              <div className="p-3 bg-blue-950/20 border border-blue-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-blue-300">
                  <Calendar className="w-4 h-4" />
                  <span className="font-bold">Closer Follow-Up Date:</span>
                </div>
                <input
                  type="date"
                  required
                  value={form.closerFollowUpDate}
                  onChange={(e) => setForm({ ...form, closerFollowUpDate: e.target.value })}
                  className="px-3 py-1.5 bg-black border border-blue-600/60 text-white focus:outline-none"
                />
              </div>
            )}

            {/* Ratings & Reviews */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">Google Rating (0.0 - 5.0)</label>
                <div className="relative">
                  <Star className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: e.target.value })}
                    placeholder="e.g. 4.8"
                    className="w-full pl-8 pr-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">Review Count</label>
                <input
                  type="number"
                  min="0"
                  value={form.reviewCount}
                  onChange={(e) => setForm({ ...form, reviewCount: e.target.value })}
                  placeholder="e.g. 35"
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Operational Notes */}
          <div className="space-y-2 pt-2">
            <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#1C1C1C]">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>4. Operational Intelligence &amp; Initial Notes</span>
            </div>

            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Record any discussion notes, key decision makers, specific customer requirements, or referral sources..."
              className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-[#202020] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#121212] hover:bg-[#1A1A1A] text-zinc-400 hover:text-white border border-[#262626] cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Lead...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Lead to Database</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>,
    document.body
  );
};

export default ManualLeadModal;