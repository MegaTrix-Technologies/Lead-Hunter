import React, { useState, useEffect } from 'react';
import { AccountService } from '../../services/api';
import { Search, Filter, ChevronLeft, ChevronRight, Receipt, CreditCard, Tag, FileText, Trash2 } from 'lucide-react';

const formatPKR = (num) => `PKR ${(Number(num) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const categoryColors = {
  'Software & Infrastructure': 'text-blue-400 bg-blue-950/40 border-blue-800/60',
  'Marketing & Lead Gen': 'text-purple-400 bg-purple-950/40 border-purple-800/60',
  'Office & Utilities': 'text-amber-400 bg-amber-950/40 border-amber-800/60',
  'Telephony & Dialing': 'text-cyan-400 bg-cyan-950/40 border-cyan-800/60',
  'Sales Commission': 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60',
  'Legal & Compliance': 'text-rose-400 bg-rose-950/40 border-rose-800/60',
  'Miscellaneous': 'text-zinc-400 bg-zinc-900 border-zinc-700'
};

const recurrenceLabels = {
  one_time: 'One-Time',
  monthly: 'Monthly',
  yearly: 'Yearly'
};

const ExpensesLedgerTab = ({ periodParams, refreshSummary }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchExpenses = async (page = 1) => {
    setLoading(true);
    try {
      const res = await AccountService.getExpenses({
        ...periodParams,
        page,
        limit: 12,
        search: search.trim() || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined
      });
      if (res.data.success) {
        setExpenses(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Error loading expenses ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this expense?')) return;
    try {
      const res = await AccountService.deleteExpense(id);
      if (res.data?.success) {
        fetchExpenses(pagination.page);
        if (refreshSummary) refreshSummary();
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  useEffect(() => {
    fetchExpenses(1);
  }, [periodParams, categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchExpenses(1);
  };

  const categories = [
    'Software & Infrastructure',
    'Marketing & Lead Gen',
    'Office & Utilities',
    'Telephony & Dialing',
    'Sales Commission',
    'Legal & Compliance',
    'Miscellaneous'
  ];

  return (
    <div className="space-y-4">
      
      {/* Search & Filter Toolbar */}
      <div className="bg-[#0A0A0A] border border-[#222222] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by description, reference ID, or vendor..."
            className="w-full pl-9 pr-3 py-2 bg-[#050505] border border-[#2B2B2B] focus:border-rose-500 focus:outline-none text-xs text-white font-mono transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
        </form>

        {/* Category Dropdown Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-[#050505] border border-[#2B2B2B] text-xs text-zinc-300 font-mono focus:border-rose-500 focus:outline-none cursor-pointer"
          >
            <option value="all">All Expense Categories</option>
            {categories.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Expenses Table */}
      <div className="bg-[#0A0A0A] border border-[#222222] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 font-mono text-xs">
            Loading expenses ledger records...
          </div>
        ) : expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#050505] border-b border-[#1E1E1E] text-zinc-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Reason / Vendor</th>
                  <th className="py-3 px-4 font-semibold">Recurrence</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {expenses.map((item) => (
                  <tr key={item._id} className="hover:bg-[#121212] transition-colors">
                    <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                      {item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                      {item.reason || item.description}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-300 text-[10px] uppercase font-bold">
                        {recurrenceLabels[item.recurrence] || 'One-Time'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 border text-[11px] font-medium ${categoryColors[item.category] || 'text-zinc-300 bg-zinc-900 border-zinc-700'}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">
                      <span className="truncate max-w-xs block">{item.description}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-400 text-sm whitespace-nowrap">
                      {formatPKR(item.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteExpense(item._id)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900 transition-colors cursor-pointer"
                        title="Delete expense"
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
          <div className="p-12 text-center text-zinc-500 font-mono text-xs space-y-1">
            <p>No operational expense records match the selected period or filters.</p>
            <p className="text-[11px] text-zinc-600">Company operating expenses are aggregated from the organization accounts system.</p>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-3 bg-[#050505] border-t border-[#1E1E1E] flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total expenses)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchExpenses(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-2.5 py-1 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-300 disabled:opacity-30 border border-[#2B2B2B] cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => fetchExpenses(pagination.page + 1)}
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

export default ExpensesLedgerTab;
