import React, { useState, useEffect } from 'react';
import { SaleService, ProductService, UserService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ManualSaleModal from './ManualSaleModal';
import { 
  DollarSign, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Package, 
  MapPin, 
  Phone, 
  AlertCircle,
  X,
  CreditCard,
  RefreshCw,
  Award
} from 'lucide-react';

const formatPKR = (num) => `PKR ${(Number(num) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const getSaleStatusBadge = (s) => {
  const isDelivered = s.isProjectDelivered || s.status === 'payment_completed';
  const isFullyPaid = s.remainingAmount === 0;

  // Fully Completed ONLY when BOTH project delivered AND full amount collected!
  if (isDelivered && isFullyPaid) {
    return {
      label: 'Completed',
      sublabel: 'Delivered & Fully Paid',
      color: 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold'
    };
  }

  // Project is delivered, but remaining cash is not yet collected:
  if (isDelivered && !isFullyPaid) {
    return {
      label: 'In Progress',
      sublabel: 'Delivered • Payment Pending',
      color: 'bg-amber-950/60 border-amber-500 text-amber-300 font-bold'
    };
  }

  // Full amount was collected upfront, but project is still being worked on:
  if (!isDelivered && isFullyPaid) {
    return {
      label: 'In Progress',
      sublabel: 'Paid • Delivery Pending',
      color: 'bg-purple-950/60 border-purple-500 text-purple-300'
    };
  }

  // Standard In Progress: in development with advance paid:
  return {
    label: 'In Progress',
    sublabel: 'Active Delivery',
    color: 'bg-blue-950/60 border-blue-500 text-blue-300'
  };
};

const SalesListView = () => {
  const { user, isSuperAdmin } = useAuth();
  const { addToast } = useToast();

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });

  // Manual Sale Modal state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Collect Payment Modal
  const [paymentSale, setPaymentSale] = useState(null);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [collecting, setCollecting] = useState(false);

  const fetchSales = async (page = 1) => {
    setLoading(true);
    try {
      const res = await SaleService.getSales({
        page,
        limit: 12,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: search.trim() || undefined
      });
      if (res.data?.success) {
        setSales(res.data.data || []);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [prodRes, userRes] = await Promise.all([
        ProductService.getProducts(),
        UserService.getUsers()
      ]);
      if (prodRes.data?.success) setAllProducts(prodRes.data.data || []);
      if (userRes.data?.success) setAllUsers(userRes.data.data || []);
    } catch (err) {
      console.error('Error loading dropdown dependencies:', err);
    }
  };

  useEffect(() => {
    fetchSales(1);
  }, [statusFilter]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadDependencies();
    }
  }, [isSuperAdmin]);



  const handleConfirmFinalPayment = async () => {
    if (!paymentSale) return;
    setCollecting(true);
    try {
      const res = await SaleService.collectFinalPayment(paymentSale._id, { paymentNotes });
      if (res.data?.success) {
        addToast({
          title: 'Final Payment Collected! 💰',
          message: 'Sale marked fully paid. All role commissions unlocked!',
          type: 'success',
          duration: 5000
        });
        setPaymentSale(null);
        setPaymentNotes('');
        fetchSales(pagination.page);
      }
    } catch (err) {
      console.error('Error collecting payment:', err);
      addToast({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setCollecting(false);
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
              <span>Sales Pipeline Ledger &amp; Collections</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-zinc-900 text-zinc-300 border border-zinc-700">
                Audit Trail
              </span>
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Full lifecycle deal tracking: Advance Paid → Project Active → Delivery Complete → Final Payment Collection.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isSuperAdmin && (
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="px-3.5 py-2 bg-white text-black hover:bg-zinc-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Manual Sale</span>
            </button>
          )}

          <button
            onClick={() => fetchSales(pagination.page)}
            className="p-2 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-400 hover:text-white border border-[#2B2B2B] text-xs cursor-pointer transition-colors"
            title="Refresh sales ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── STATUS FILTER & SEARCH BAR ──────────────────────────────────────── */}
      <div className="bg-[#080808] border border-[#222222] p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'ALL', label: 'All Deals' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'project_completed', label: 'Delivered (Cash Due)' },
            { id: 'payment_completed', label: 'Completed' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 border text-xs transition-colors cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-blue-600 border-blue-500 text-white font-bold'
                  : 'bg-[#0E0E0E] border-[#262626] text-zinc-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchSales(1)}
            placeholder="Search by client or closer..."
            className="w-full pl-8 pr-3 py-1.5 bg-black border border-[#2B2B2B] text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* ─── SALES TABLE ────────────────────────────────────────────────────── */}
      <div className="bg-[#0A0A0A] border border-[#222222] overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-zinc-500 text-xs">
            Loading sales ledger...
          </div>
        ) : sales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#050505] border-b border-[#1E1E1E] text-zinc-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Client / Business</th>
                  <th className="py-3 px-4 font-semibold">Lead Gen</th>
                  <th className="py-3 px-4 font-semibold">Closed By</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Advance Paid</th>
                  <th className="py-3 px-4 font-semibold text-right">Remaining Due</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Deal Value</th>
                  <th className="py-3 px-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {sales.map(s => {
                  const badge = getSaleStatusBadge(s);
                  const canCollect = s.remainingAmount > 0 && (isSuperAdmin || user?.roles?.includes('sales_closer'));

                  return (
                    <tr key={s._id} className="hover:bg-[#121212] transition-colors">
                      <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                        {new Date(s.closedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div>{s.customer?.businessName}</div>
                        <div className="text-[10px] text-zinc-500 font-normal mt-0.5">
                          {s.customer?.area} • {s.customer?.category}
                        </div>
                        {Array.isArray(s.products) && s.products.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 font-normal">
                            {s.products.map((p, idx) => (
                              <span
                                key={idx}
                                className={`text-[9px] px-1.5 py-0.2 border ${
                                  p.billingType === 'monthly'
                                    ? 'bg-cyan-950/60 border-cyan-800 text-cyan-300 font-mono'
                                    : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                                }`}
                              >
                                {p.name}{p.billingType === 'monthly' ? ` (${p.billingDurationMonths || 1}mo)` : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300">
                        {s.leadGeneratedByName || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300">
                        {s.closedByName || 'Super Admin'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-0.5">
                          <span className={`px-2 py-0.5 border text-[10px] uppercase font-bold whitespace-nowrap ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono">
                            {badge.sublabel}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-blue-400">
                        {formatPKR(s.advanceAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-amber-300">
                        {formatPKR(s.remainingAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400 text-sm whitespace-nowrap">
                        {formatPKR(s.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {canCollect ? (
                          <button
                            onClick={() => { setPaymentSale(s); setPaymentNotes(''); }}
                            className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 text-[10px] font-bold uppercase cursor-pointer transition-colors"
                          >
                            Collect Remaining
                          </button>
                        ) : (
                          <span className="text-[10px] text-zinc-600">✓ Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-zinc-500 text-xs">
            No sales recorded in this period or filter.
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-3 bg-[#050505] border-t border-[#1E1E1E] flex items-center justify-between text-xs">
            <span className="text-zinc-500 text-[11px]">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} sales)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchSales(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-2.5 py-1 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-300 disabled:opacity-30 border border-[#2B2B2B] cursor-pointer"
              >
                Prev
              </button>
              <button
                onClick={() => fetchSales(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-2.5 py-1 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-300 disabled:opacity-30 border border-[#2B2B2B] cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── COLLECT REMAINING PAYMENT MODAL ─────────────────────────────────── */}
      {paymentSale && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#090909] border border-[#2B2B2B] w-full max-w-xl lg:max-w-2xl shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-[#202020] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Collect Final Remaining Payment</span>
              </h3>
              <button onClick={() => setPaymentSale(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#050C07] border border-emerald-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Client:</span>
                <strong className="text-white">{paymentSale.customer?.businessName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Deal Value:</span>
                <span className="text-white font-mono">{formatPKR(paymentSale.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Advance Already Paid:</span>
                <span className="text-blue-400 font-mono">{formatPKR(paymentSale.advanceAmount)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-emerald-900/60 font-bold">
                <span className="text-emerald-300">Remaining Due to Collect:</span>
                <span className="text-emerald-300 text-sm font-mono">{formatPKR(paymentSale.remainingAmount)}</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400">
              Confirming this action records the remaining cash collection, marks the deal as <strong className="text-white">Fully Paid &amp; Closed</strong>, and unlocks role commission earnings.
            </p>

            <textarea
              rows="2"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Payment method / transaction reference (optional)..."
              className="w-full p-2.5 bg-black border border-[#2B2B2B] text-white text-xs focus:outline-none focus:border-emerald-500 resize-none"
            />

            <div className="pt-2 border-t border-[#202020] flex items-center justify-between">
              <button
                onClick={() => setPaymentSale(null)}
                className="px-4 py-1.5 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-400 border border-[#2A2A2A] text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFinalPayment}
                disabled={collecting}
                className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase cursor-pointer shadow"
              >
                {collecting ? 'Finalizing...' : `Collect ${formatPKR(paymentSale.remainingAmount)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATE MANUAL SALE MODAL (SUPER ADMIN) ─────────────────────────── */}
      <ManualSaleModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={() => fetchSales(1)}
      />

    </div>
  );
};

export default SalesListView;
