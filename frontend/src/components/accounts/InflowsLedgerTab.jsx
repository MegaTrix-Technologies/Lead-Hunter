import React, { useState, useEffect } from 'react';
import { AccountService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  DollarSign, 
  Plus, 
  Trash2, 
  Briefcase, 
  Building2, 
  TrendingUp,
  Tag,
  CreditCard,
  CheckCircle2
} from 'lucide-react';

const formatPKR = (num) => `PKR ${(Number(num) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const InflowsLedgerTab = ({ periodParams, onAddMoney, refreshSummary }) => {
  const { addToast } = useToast();
  const [inflows, setInflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);

  const fetchInflows = async (page = 1) => {
    setLoading(true);
    try {
      const res = await AccountService.getInflows({
        ...periodParams,
        page,
        limit: 12,
        search: search.trim() || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined
      });
      if (res.data?.success) {
        setInflows(res.data.data || []);
        setPagination(res.data.pagination || { total: 0, page: 1, limit: 12, totalPages: 1 });
      }
    } catch (err) {
      console.error('[InflowsLedgerTab] Error fetching inflows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInflows(1);
  }, [periodParams, typeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInflows(1);
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm(`Are you sure you want to delete this inflow record? ${type === 'project_payment' ? 'The remaining balance on the linked project order will be restored.' : ''}`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await AccountService.deleteInflow(id);
      if (res.data?.success) {
        addToast({
          title: 'Inflow Removed',
          message: res.data.message || 'Transaction deleted successfully.',
          type: 'success'
        });
        fetchInflows(pagination.page);
        if (refreshSummary) refreshSummary();
      }
    } catch (err) {
      console.error('Error deleting inflow:', err);
      addToast({
        title: 'Delete Failed',
        message: err.response?.data?.message || err.message,
        type: 'error'
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'project_payment':
        return (
          <span className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-[10px] font-bold uppercase flex items-center gap-1">
            <Briefcase className="w-3 h-3" />
            <span>Project Payment</span>
          </span>
        );
      case 'investment':
        return (
          <span className="px-2 py-0.5 bg-blue-950/60 border border-blue-800 text-blue-400 text-[10px] font-bold uppercase flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            <span>Investment Capital</span>
          </span>
        );
      case 'other_income':
      default:
        return (
          <span className="px-2 py-0.5 bg-purple-950/60 border border-purple-800 text-purple-400 text-[10px] font-bold uppercase flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Other Income</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-mono">
      
      {/* Search & Filter Toolbar */}
      <div className="bg-[#0A0A0A] border border-[#222222] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by source, client, category, or reference #..."
            className="w-full pl-9 pr-3 py-2 bg-[#050505] border border-[#2B2B2B] focus:border-emerald-500 focus:outline-none text-xs text-white transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
        </form>

        {/* Type Dropdown Filter & Action Button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-[#050505] border border-[#2B2B2B] text-xs text-zinc-300 focus:border-emerald-500 focus:outline-none cursor-pointer"
            >
              <option value="all">All Inflow Streams</option>
              <option value="project_payment">Project Milestone Payments</option>
              <option value="investment">Investment Capital</option>
              <option value="other_income">Other Incomes</option>
            </select>
          </div>

          {onAddMoney && (
            <button
              type="button"
              onClick={onAddMoney}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Add Money / Log Inflow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Money</span>
            </button>
          )}
        </div>

      </div>

      {/* Inflows Table */}
      <div className="bg-[#0A0A0A] border border-[#222222] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            Loading cash inflow transactions...
          </div>
        ) : inflows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#050505] border-b border-[#1E1E1E] text-zinc-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Source / Client</th>
                  <th className="py-3 px-4 font-semibold">Inflow Stream</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Payment Details</th>
                  <th className="py-3 px-4 font-semibold text-right text-emerald-400">Amount Received</th>
                  <th className="py-3 px-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {inflows.map((item) => (
                  <tr key={item._id} className="hover:bg-[#121212] transition-colors">
                    <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                      {item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate max-w-xs">{item.sourceName}</span>
                      </div>
                      {item.description && (
                        <div className="text-[10px] text-zinc-500 truncate max-w-xs mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getTypeBadge(item.type)}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300">
                      <span className="px-2 py-0.5 bg-[#141414] border border-[#222222] text-[11px] text-zinc-300">
                        {item.category || 'General Income'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 text-[11px]">
                      <div>{item.paymentMethod || 'Bank Transfer'}</div>
                      {item.referenceId && (
                        <div className="text-zinc-600 font-mono text-[10px]">
                          Ref: {item.referenceId}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400 whitespace-nowrap">
                      {formatPKR(item.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDelete(item._id, item.type)}
                        disabled={deletingId === item._id}
                        className="p-1.5 hover:bg-rose-950/60 text-zinc-500 hover:text-rose-400 border border-transparent hover:border-rose-800 transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete inflow record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-zinc-500 text-xs space-y-1">
            <p>No money inflows recorded for this period.</p>
            <p className="text-[11px] text-zinc-600">Click "Add Money" to log partial milestone payments, investments, or other incomes.</p>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-3 bg-[#050505] border-t border-[#1E1E1E] flex items-center justify-between text-xs">
            <span className="text-zinc-500">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total transactions)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchInflows(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-2.5 py-1 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-300 disabled:opacity-30 border border-[#2B2B2B] cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => fetchInflows(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-2.5 py-1 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-300 disabled:opacity-30 border border-[#2B2B2B] cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default InflowsLedgerTab;
