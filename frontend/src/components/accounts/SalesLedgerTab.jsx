import React, { useState, useEffect } from 'react';
import { AccountService } from '../../services/api';
import { Search, Filter, ChevronLeft, ChevronRight, Briefcase, Tag, MapPin, User, CheckCircle2, Plus } from 'lucide-react';

const formatPKR = (num) => `PKR ${(Number(num) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const SalesLedgerTab = ({ periodParams, onAddSale }) => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchSales = async (page = 1) => {
    setLoading(true);
    try {
      const res = await AccountService.getSales({
        ...periodParams,
        page,
        limit: 12,
        search: search.trim() || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined
      });
      if (res.data.success) {
        setSales(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Error loading sales ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales(1);
  }, [periodParams, categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSales(1);
  };

  // Collect unique categories
  const categories = Array.from(new Set(sales.map(s => s.category).filter(Boolean)));

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
            placeholder="Search by client name, commercial area, or agent..."
            className="w-full pl-9 pr-3 py-2 bg-[#050505] border border-[#2B2B2B] focus:border-blue-500 focus:outline-none text-xs text-white font-mono transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
        </form>

        {/* Category Dropdown Filter & Add Sale Action */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-[#050505] border border-[#2B2B2B] text-xs text-zinc-300 font-mono focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="all">All Industries / Niches</option>
              {categories.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {onAddSale && (
            <button
              type="button"
              onClick={onAddSale}
              className="px-3 py-2 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Add a manual sale"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Sale</span>
            </button>
          )}
        </div>

      </div>

      {/* Sales Table */}
      <div className="bg-[#0A0A0A] border border-[#222222] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 font-mono text-xs">
            Loading sales ledger records...
          </div>
        ) : sales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#050505] border-b border-[#1E1E1E] text-zinc-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Client / Business</th>
                  <th className="py-3 px-4 font-semibold">Industry</th>
                  <th className="py-3 px-4 font-semibold">Area</th>
                  <th className="py-3 px-4 font-semibold">Products Sold</th>
                  <th className="py-3 px-4 font-semibold text-right">Contract Value</th>
                  <th className="py-3 px-4 font-semibold text-right text-emerald-400">Cash Inflow</th>
                  <th className="py-3 px-4 font-semibold text-right text-amber-400">Pending Balance</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {sales.map((item) => {
                  const contractVal = item.dealValue || 0;
                  const cashCollected = item.advanceAmount !== undefined ? item.advanceAmount : contractVal;
                  const balance = item.remainingAmount !== undefined ? item.remainingAmount : (contractVal - cashCollected);
                  const isFullyPaid = balance <= 0;

                  return (
                    <tr key={item.id} className="hover:bg-[#121212] transition-colors">
                      <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                        {item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate max-w-xs">{item.businessName}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-normal mt-0.5">
                          Closed by {item.extractedByName || 'Sales Desk'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300">
                        <span className="px-2 py-0.5 bg-[#141414] border border-[#222222] text-[11px] text-zinc-300">
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400">
                        <div className="flex items-center gap-1 truncate max-w-[130px]">
                          <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                          <span>{item.area || 'Lahore'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300">
                        {item.interestedProducts && item.interestedProducts.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {item.interestedProducts.map((p, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-blue-950/40 border border-blue-800/60 text-blue-300 text-[10px]">
                                {p.name} ({formatPKR(p.finalPrice || p.basePrice)})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-[11px]">Direct Deal</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-white whitespace-nowrap">
                        {formatPKR(contractVal)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400 whitespace-nowrap">
                        {formatPKR(cashCollected)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-amber-400 whitespace-nowrap">
                        {formatPKR(balance)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isFullyPaid ? (
                          <span className="px-2 py-0.5 bg-emerald-950/50 border border-emerald-800/80 text-emerald-400 text-[10px] uppercase font-bold">
                            Fully Paid
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-950/50 border border-amber-800/80 text-amber-400 text-[10px] uppercase font-bold">
                            Partial Advance
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-zinc-500 font-mono text-xs space-y-1">
            <p>No sales records match the selected period or filters.</p>
            <p className="text-[11px] text-zinc-600">Deals are automatically logged when marked "Lead / Sale" in the Outbound Workstation.</p>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-3 bg-[#050505] border-t border-[#1E1E1E] flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total deals)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchSales(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-2.5 py-1 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-300 disabled:opacity-30 border border-[#2B2B2B] cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => fetchSales(pagination.page + 1)}
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

export default SalesLedgerTab;
