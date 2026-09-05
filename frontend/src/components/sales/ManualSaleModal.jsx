import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SaleService, ProductService, UserService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  DollarSign, 
  Plus, 
  Package, 
  User, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  X, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck,
  Code
} from 'lucide-react';

const formatPKR = (num) => `PKR ${(Number(num) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const ManualSaleModal = ({ isOpen, onClose, onSuccess }) => {
  const { user, isSuperAdmin } = useAuth();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    businessName: '',
    phoneNumber: '',
    email: '',
    address: '',
    area: 'Gulberg, Lahore',
    category: 'Web Development',
    leadGeneratedBy: '',
    closedBy: '',
    assignedDevelopers: [],
    advanceAmount: '',
    notes: ''
  });

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({
        businessName: '',
        phoneNumber: '',
        email: '',
        address: '',
        area: 'Gulberg, Lahore',
        category: 'Web Development',
        leadGeneratedBy: '',
        closedBy: user?._id || '',
        assignedDevelopers: [],
        advanceAmount: '',
        notes: ''
      });
      setSelectedProducts([]);

      const loadMeta = async () => {
        setLoadingData(true);
        try {
          const [prodRes, userRes] = await Promise.all([
            ProductService.getProducts({ activeOnly: true }),
            UserService.getUsers()
          ]);
          if (prodRes.data?.success) {
            setAllProducts(prodRes.data.data || []);
          }
          if (userRes.data?.success) {
            setAllUsers(userRes.data.data || []);
          }
        } catch (err) {
          console.error('[ManualSaleModal] Error loading catalog/users:', err);
        } finally {
          setLoadingData(false);
        }
      };
      loadMeta();
    }
  }, [isOpen, user]);

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

  const handleProductToggle = (prod) => {
    const exists = selectedProducts.some(p => p.productId === prod._id);
    if (exists) {
      setSelectedProducts(prev => prev.filter(p => p.productId !== prod._id));
    } else {
      setSelectedProducts(prev => [
        ...prev,
        {
          productId: prod._id,
          name: prod.name,
          category: prod.category,
          basePrice: prod.basePrice,
          discountPercent: 0,
          finalPrice: prod.basePrice,
          currency: prod.currency || 'PKR'
        }
      ]);
    }
  };

  const handleDeveloperToggle = (devId) => {
    setForm(prev => {
      const exists = prev.assignedDevelopers.includes(devId);
      return {
        ...prev,
        assignedDevelopers: exists 
          ? prev.assignedDevelopers.filter(id => id !== devId)
          : [...prev.assignedDevelopers, devId]
      };
    });
  };

  const totalAmount = selectedProducts.reduce((sum, p) => sum + (Number(p.finalPrice) || 0), 0);
  const advanceNumber = Math.max(0, parseFloat(form.advanceAmount) || 0);
  const remainingBalance = Math.max(0, totalAmount - advanceNumber);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.businessName.trim()) {
      addToast({ title: 'Validation Error', message: 'Business name is required.', type: 'error' });
      return;
    }
    if (selectedProducts.length === 0) {
      addToast({ title: 'Validation Error', message: 'Please select at least one product offering.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer: {
          businessName: form.businessName.trim(),
          phoneNumber: form.phoneNumber.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          area: form.area.trim(),
          category: form.category.trim()
        },
        leadGeneratedBy: form.leadGeneratedBy || null,
        closedBy: form.closedBy || user?._id,
        assignedDevelopers: form.assignedDevelopers,
        products: selectedProducts,
        totalAmount,
        advanceAmount: advanceNumber,
        notes: form.notes.trim()
      };

      const res = await SaleService.createManualSale(payload);
      if (res.data?.success) {
        addToast({
          title: 'Direct Sale Logged',
          message: `Sale successfully created for "${form.businessName}". Financials updated.`,
          type: 'success'
        });

        if (onSuccess) {
          onSuccess(res.data.data);
        }
        onClose();
      }
    } catch (err) {
      console.error('[ManualSaleModal] Error creating manual sale:', err);
      addToast({
        title: 'Error Creating Sale',
        message: err.response?.data?.message || err.message || 'Failed to record direct sale.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter developers
  const developers = allUsers.filter(u => {
    const r = u.roles || (u.role ? [u.role] : []);
    return r.includes('developer');
  });

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-sm font-mono overflow-y-auto">
      <div className="bg-[#090909] border border-[#2B2B2B] w-full max-w-4xl lg:max-w-5xl shadow-2xl relative my-8 overflow-hidden text-xs">
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 bg-[#0E0E0E] border-b border-[#202020] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-950/60 border border-emerald-600/60 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Create Direct / Off-Pipeline Sale</span>
                <span className="text-[10px] px-2 py-0.5 bg-purple-950/80 text-purple-300 border border-purple-800">
                  SUPER ADMIN
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Log a commercial sale, auto-generate project delivery tracking, and immediately record sales inflow in P&amp;L.
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
          
          {/* Section 1: Customer Information */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#1C1C1C]">
              <Building2 className="w-3.5 h-3.5" />
              <span>1. Customer &amp; Business Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">
                  Business Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="e.g. Lahore Tech Solutions"
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  placeholder="0300-1234567"
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contact@client.com"
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">Area / City</label>
                <input
                  type="text"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder="Gulberg, Lahore"
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Web Development"
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">Street Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Office Suite, Commercial Market"
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Role Attributions */}
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#1C1C1C]">
              <User className="w-3.5 h-3.5" />
              <span>2. Role Attributions &amp; Delivery Assignment</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">Lead Generated By (Agent)</label>
                <select
                  value={form.leadGeneratedBy}
                  onChange={(e) => setForm({ ...form, leadGeneratedBy: e.target.value })}
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">(Direct Inbound / Organic Sale)</option>
                  {allUsers.map(u => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({Array.isArray(u.roles) ? u.roles.join(', ') : u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">Closed By (Closer)</label>
                <select
                  value={form.closedBy}
                  onChange={(e) => setForm({ ...form, closedBy: e.target.value })}
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">Myself ({user?.name || 'Super Admin'})</option>
                  {allUsers.map(u => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({Array.isArray(u.roles) ? u.roles.join(', ') : u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Developer Assignments */}
            <div className="pt-2">
              <label className="block text-zinc-400 uppercase text-[10px] mb-1.5 flex items-center gap-1.5">
                <Code className="w-3 h-3 text-purple-400" />
                <span>Assign Developers to Project Delivery</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {developers.length > 0 ? (
                  developers.map(dev => {
                    const isAssigned = form.assignedDevelopers.includes(dev._id);
                    return (
                      <button
                        type="button"
                        key={dev._id}
                        onClick={() => handleDeveloperToggle(dev._id)}
                        className={`px-3 py-1.5 border text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                          isAssigned
                            ? 'bg-purple-950/60 border-purple-500 text-purple-200 font-bold'
                            : 'bg-black border-[#262626] text-zinc-400 hover:text-white hover:border-zinc-600'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isAssigned ? 'bg-purple-400' : 'bg-zinc-600'}`} />
                        <span>{dev.name}</span>
                      </button>
                    );
                  })
                ) : (
                  <span className="text-[11px] text-zinc-500">No developer accounts provisioned.</span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Product Offerings */}
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-[#1C1C1C]">
              <div className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                <span>3. Attach Product Offerings <span className="text-rose-400">*</span></span>
              </div>
              <span className="text-zinc-500 font-normal">{selectedProducts.length} selected</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {allProducts.map(prod => {
                const isSelected = selectedProducts.some(p => p.productId === prod._id);
                return (
                  <div
                    key={prod._id}
                    onClick={() => handleProductToggle(prod)}
                    className={`p-2.5 border flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/40 text-white'
                        : 'border-[#222222] bg-black text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-bold truncate text-white">{prod.name}</div>
                      <span className="text-[10px] text-zinc-500">{prod.category} &bull; {formatPKR(prod.basePrice)}</span>
                    </div>
                    <div className={`w-4 h-4 border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-emerald-500 bg-emerald-600 text-black' : 'border-zinc-700'
                    }`}>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Financial Settlement */}
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#1C1C1C]">
              <DollarSign className="w-3.5 h-3.5" />
              <span>4. Financial Settlement &amp; Advance Cash</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-black border border-[#222222]">
                <div className="text-[10px] text-zinc-500 uppercase">Total Contract Value</div>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                  {formatPKR(totalAmount)}
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1">
                  Advance Amount Collected (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalAmount || undefined}
                  value={form.advanceAmount}
                  onChange={(e) => setForm({ ...form, advanceAmount: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-emerald-500 font-mono text-sm"
                />
              </div>

              <div className="p-3 bg-black border border-[#222222]">
                <div className="text-[10px] text-zinc-500 uppercase">Remaining Pending Amount</div>
                <div className={`text-lg font-bold font-mono mt-0.5 ${remainingBalance > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {formatPKR(remainingBalance)}
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Delivery Directives & Notes */}
          <div className="space-y-2 pt-2">
            <label className="block text-zinc-400 uppercase text-[10px]">
              Delivery Notes &amp; Project Directives
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Record special instructions, deliverables, target completion deadlines..."
              className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
            />
          </div>

          {/* Footer Actions */}
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
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Logging Sale...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Direct Sale</span>
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

export default ManualSaleModal;