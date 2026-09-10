import React, { useState, useEffect } from 'react';
import { AccountService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  DollarSign, 
  Briefcase, 
  TrendingUp, 
  Building2, 
  Calendar, 
  CreditCard, 
  Hash, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Sparkles
} from 'lucide-react';

const formatPKR = (num) => `PKR ${(Number(num) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const AddMoneyModal = ({ isOpen, onClose, onSuccess, initialSaleId = null }) => {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('project_payment'); // 'project_payment' | 'investment' | 'other_income'
  const [loadingPending, setLoadingPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingSales, setPendingSales] = useState([]);
  const [saleSearch, setSaleSearch] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    saleId: '',
    sourceName: '',
    category: 'Project Milestone Payment',
    amount: '',
    currency: 'PKR',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    referenceId: '',
    description: ''
  });

  // Selected Sale Object
  const selectedSale = pendingSales.find(s => s.id === formData.saleId) || null;

  useEffect(() => {
    if (isOpen) {
      fetchPendingSales();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialSaleId && pendingSales.length > 0) {
      const match = pendingSales.find(s => s.id === initialSaleId);
      if (match) {
        setActiveTab('project_payment');
        setFormData(prev => ({
          ...prev,
          saleId: match.id,
          sourceName: match.businessName,
          amount: match.remainingAmount
        }));
      }
    }
  }, [initialSaleId, pendingSales]);

  const fetchPendingSales = async () => {
    setLoadingPending(true);
    try {
      const res = await AccountService.getPendingSales();
      if (res.data?.success) {
        setPendingSales(res.data.data || []);
        if (initialSaleId) {
          const match = res.data.data.find(s => s.id === initialSaleId);
          if (match) {
            setFormData(prev => ({
              ...prev,
              saleId: match.id,
              sourceName: match.businessName,
              amount: match.remainingAmount
            }));
          }
        }
      }
    } catch (err) {
      console.error('[AddMoneyModal] Failed to fetch pending sales:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'project_payment') {
      setFormData(prev => ({
        ...prev,
        category: 'Project Milestone Payment',
        sourceName: selectedSale ? selectedSale.businessName : ''
      }));
    } else if (tab === 'investment') {
      setFormData(prev => ({
        ...prev,
        category: 'Direct Capital Investment',
        saleId: '',
        sourceName: ''
      }));
    } else if (tab === 'other_income') {
      setFormData(prev => ({
        ...prev,
        category: 'Consultancy Services',
        saleId: '',
        sourceName: ''
      }));
    }
  };

  const handleSaleSelect = (sale) => {
    setFormData(prev => ({
      ...prev,
      saleId: sale.id,
      sourceName: sale.businessName,
      amount: sale.remainingAmount
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanAmount = parseFloat(formData.amount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      addToast({ title: 'Validation Error', message: 'Please enter a valid positive amount.', type: 'error' });
      return;
    }

    if (activeTab === 'project_payment') {
      if (!formData.saleId) {
        addToast({ title: 'Validation Error', message: 'Please select an existing project or order with pending balance.', type: 'error' });
        return;
      }
      if (selectedSale && cleanAmount > selectedSale.remainingAmount) {
        addToast({
          title: 'Amount Exceeds Payable',
          message: `Amount (${formatPKR(cleanAmount)}) cannot exceed remaining payable (${formatPKR(selectedSale.remainingAmount)}).`,
          type: 'error'
        });
        return;
      }
    } else {
      if (!formData.sourceName.trim()) {
        addToast({
          title: 'Validation Error',
          message: activeTab === 'investment' ? 'Please specify the Investor / Partner name.' : 'Please specify the Income Source / Client name.',
          type: 'error'
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        type: activeTab,
        saleId: activeTab === 'project_payment' ? formData.saleId : null,
        sourceName: activeTab === 'project_payment' ? (selectedSale?.businessName || formData.sourceName) : formData.sourceName.trim(),
        category: formData.category,
        amount: cleanAmount,
        currency: formData.currency,
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        referenceId: formData.referenceId.trim(),
        description: formData.description.trim()
      };

      const res = await AccountService.createInflow(payload);
      if (res.data?.success) {
        addToast({
          title: 'Money Logged Successfully',
          message: res.data.message || 'Inflow transaction saved and accounts ledger updated.',
          type: 'success'
        });
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('[AddMoneyModal] Submission error:', err);
      addToast({
        title: 'Error Logging Inflow',
        message: err.response?.data?.message || err.message || 'Failed to record money inflow.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredSales = pendingSales.filter(s => {
    if (!saleSearch) return true;
    const q = saleSearch.toLowerCase();
    return s.businessName.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.area.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-150 font-mono">
      <div className="bg-[#090909] border border-[#2B2B2B] w-full max-w-2xl lg:max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#202020] p-5 bg-[#0C0C0C]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-950/60 border border-emerald-800 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Add Money / Log Inflow
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Record partial project collections, capital investments, or other income streams.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-zinc-500 hover:text-white p-1 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inflow Type Tabs */}
        <div className="grid grid-cols-3 border-b border-[#202020] bg-[#070707] text-xs">
          <button
            type="button"
            onClick={() => handleTabChange('project_payment')}
            className={`py-3 px-4 flex items-center justify-center gap-2 font-bold uppercase transition-all cursor-pointer ${
              activeTab === 'project_payment'
                ? 'bg-emerald-950/40 text-emerald-300 border-b-2 border-emerald-500'
                : 'text-zinc-400 hover:text-white hover:bg-[#111]'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Project Payment</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('investment')}
            className={`py-3 px-4 flex items-center justify-center gap-2 font-bold uppercase transition-all cursor-pointer ${
              activeTab === 'investment'
                ? 'bg-blue-950/40 text-blue-300 border-b-2 border-blue-500'
                : 'text-zinc-400 hover:text-white hover:bg-[#111]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Investment Capital</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('other_income')}
            className={`py-3 px-4 flex items-center justify-center gap-2 font-bold uppercase transition-all cursor-pointer ${
              activeTab === 'other_income'
                ? 'bg-purple-950/40 text-purple-300 border-b-2 border-purple-500'
                : 'text-zinc-400 hover:text-white hover:bg-[#111]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Other Income</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* ─── TAB 1: PROJECT MILESTONE / PARTIAL PAYMENT ───────────────── */}
          {activeTab === 'project_payment' && (
            <div className="space-y-4">
              <div className="bg-[#0F1713] border border-emerald-900/50 p-3 text-[11px] text-emerald-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Auto-Receivable Decrement:</strong> Recording a milestone payment will instantly decrement the order's remaining payable balance, log advance cash in the bank, and update Project status upon full payoff.
                </div>
              </div>

              {/* Select Existing Sale with Outstanding Balance */}
              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1.5 font-bold">
                  Select Project / Sale with Pending Balance * ({pendingSales.length} Active Orders)
                </label>
                
                {loadingPending ? (
                  <div className="p-4 text-center text-zinc-500 bg-black border border-[#2B2B2B]">
                    Loading active orders with pending balances...
                  </div>
                ) : pendingSales.length === 0 ? (
                  <div className="p-4 text-center text-zinc-400 bg-black border border-[#2B2B2B] text-xs">
                    All current sales have 0 remaining payable balance. You can log new sales or record capital/other income.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Search filter for orders */}
                    <div className="relative">
                      <input
                        type="text"
                        value={saleSearch}
                        onChange={(e) => setSaleSearch(e.target.value)}
                        placeholder="Search by client name, area, or industry..."
                        className="w-full pl-8 pr-3 py-1.5 bg-black border border-[#2B2B2B] text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
                    </div>

                    {/* Scrollable List of Pending Sales */}
                    <div className="max-h-40 overflow-y-auto border border-[#2B2B2B] divide-y divide-[#1A1A1A] bg-black">
                      {filteredSales.map((s) => {
                        const isSelected = formData.saleId === s.id;
                        return (
                          <div
                            key={s.id}
                            onClick={() => handleSaleSelect(s)}
                            className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-emerald-950/60 border-l-4 border-emerald-500 text-white'
                                : 'hover:bg-[#121212] text-zinc-300'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold flex items-center gap-2">
                                <span>{s.businessName}</span>
                                <span className="text-[10px] px-1.5 py-0.2 bg-[#1A1A1A] text-zinc-400 font-normal">
                                  {s.area || 'Lahore'}
                                </span>
                              </div>
                              <div className="text-[10px] text-zinc-500">
                                Total: {formatPKR(s.totalAmount)} | Paid: {formatPKR(s.advanceAmount)}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-amber-400 font-bold text-xs">
                                Due: {formatPKR(s.remainingAmount)}
                              </div>
                              {isSelected && (
                                <span className="text-[9px] text-emerald-400 uppercase font-bold">
                                  ✓ Selected
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Order Summary Card */}
              {selectedSale && (
                <div className="p-3 bg-[#0A0A0A] border border-[#222222] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-zinc-400 uppercase">Selected Order</div>
                    <div className="text-white font-bold">{selectedSale.businessName}</div>
                    <div className="text-[10px] text-zinc-500">
                      Contract: {formatPKR(selectedSale.totalAmount)} | Already Received: {formatPKR(selectedSale.advanceAmount)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, amount: selectedSale.remainingAmount }))}
                      className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                    >
                      Pay Full Remaining ({formatPKR(selectedSale.remainingAmount)})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 2: INVESTMENT CAPITAL ───────────────────────────────── */}
          {activeTab === 'investment' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 uppercase text-[10px] mb-1 font-bold">
                    Investor / Founder / Capital Provider *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sourceName}
                    onChange={(e) => setFormData({ ...formData, sourceName: e.target.value })}
                    placeholder="e.g. Angel Investor, Seed Capital, Founder Loan"
                    className="w-full px-2.5 py-1.5 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 uppercase text-[10px] mb-1 font-bold">
                    Capital Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-black border border-[#2B2B2B] text-white focus:outline-none"
                  >
                    <option value="Direct Capital Investment">Direct Capital Investment</option>
                    <option value="Equity / Angel Fund">Equity / Angel Fund</option>
                    <option value="Founder Loan / Capital Injection">Founder Loan / Capital Injection</option>
                    <option value="Miscellaneous Income">Miscellaneous Capital</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 3: OTHER INCOME ─────────────────────────────────────── */}
          {activeTab === 'other_income' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 uppercase text-[10px] mb-1 font-bold">
                    Income Source / Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sourceName}
                    onChange={(e) => setFormData({ ...formData, sourceName: e.target.value })}
                    placeholder="e.g. Consulting Client, Partner RevShare, Custom API License"
                    className="w-full px-2.5 py-1.5 bg-black border border-[#2B2B2B] text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 uppercase text-[10px] mb-1 font-bold">
                    Income Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-black border border-[#2B2B2B] text-white focus:outline-none"
                  >
                    <option value="Consultancy Services">Consultancy Services</option>
                    <option value="Affiliate & Partner Commission">Affiliate &amp; Partner Commission</option>
                    <option value="Custom Development Fee">Custom Development Fee</option>
                    <option value="Miscellaneous Income">Miscellaneous Income</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ─── COMMON PAYMENT METRIC FIELDS ────────────────────────────── */}
          <div className="pt-2 border-t border-[#1C1C1C] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1 font-bold">
                  Amount to Receive (PKR) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={activeTab === 'project_payment' && selectedSale ? selectedSale.remainingAmount : undefined}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g. 50000"
                  className="w-full px-2.5 py-1.5 bg-black border border-[#2B2B2B] text-white text-sm font-bold focus:outline-none focus:border-emerald-500 font-mono"
                />
                {activeTab === 'project_payment' && selectedSale && (
                  <div className="text-[10px] text-zinc-500 mt-1 flex justify-between">
                    <span>Max payable: {formatPKR(selectedSale.remainingAmount)}</span>
                    <span className="text-emerald-400">
                      Balance after: {formatPKR(Math.max(0, selectedSale.remainingAmount - (parseFloat(formData.amount) || 0)))}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1 font-bold">
                  Payment Method
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-black border border-[#2B2B2B] text-white focus:outline-none"
                >
                  <option value="Bank Transfer">Bank Transfer / IBFT</option>
                  <option value="Cash">Cash Receipt</option>
                  <option value="Online Gateway">Online Gateway (Stripe/PayFast)</option>
                  <option value="Company Card">Company Card</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Direct Deposit">Direct Deposit</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1 font-bold">
                  Transaction Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-black border border-[#2B2B2B] text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] mb-1 font-bold">
                  Reference / Transaction ID / Slip #
                </label>
                <input
                  type="text"
                  value={formData.referenceId}
                  onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
                  placeholder="e.g. IBFT-984210, CHQ-5542"
                  className="w-full px-2.5 py-1.5 bg-black border border-[#2B2B2B] text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 uppercase text-[10px] mb-1 font-bold">
                Notes / Audit Description (Optional)
              </label>
              <textarea
                rows="2"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional details regarding this inflow..."
                className="w-full px-2.5 py-1.5 bg-black border border-[#2B2B2B] text-white focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-[#202020] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-400 border border-[#2A2A2A] text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || (activeTab === 'project_payment' && !formData.saleId)}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black text-xs font-bold uppercase cursor-pointer transition-all shadow-lg flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Record {activeTab === 'project_payment' ? 'Project Payment' : activeTab === 'investment' ? 'Investment' : 'Income'}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default AddMoneyModal;
