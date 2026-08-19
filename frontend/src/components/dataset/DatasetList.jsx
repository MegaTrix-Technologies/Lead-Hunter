import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Search, 
  Database, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  X,
  SlidersHorizontal
} from 'lucide-react';
import { useLead } from '../../context/LeadContext';
import DatasetCard from './DatasetCard';
import AppendSearchModal from './AppendSearchModal';

const ITEMS_PER_PAGE = 9;

const DatasetList = ({ onViewLeads }) => {
  const { datasets, loadingDatasets, fetchDatasets, setAppendModalDataset } = useLead();
  const [searchFilter, setSearchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever the search filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter]);

  // Strong search filtering across Name, Keyword, Location/Area, and Description
  // Sorted strictly by most recent first (createdAt descending)
  const filteredDatasets = datasets
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .filter(d => {
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase().trim();
      const nameMatch = d.name && d.name.toLowerCase().includes(q);
      const keywordMatch = d.keyword && d.keyword.toLowerCase().includes(q);
      const areaMatch = d.area && d.area.toLowerCase().includes(q);
      const descMatch = d.description && d.description.toLowerCase().includes(q);
      return nameMatch || keywordMatch || areaMatch || descMatch;
    });

  // Calculate pagination bounds
  const totalDatasets = filteredDatasets.length;
  const totalPages = Math.ceil(totalDatasets / ITEMS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const displayedDatasets = filteredDatasets.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Generate pagination page numbers
  const getPageNumbers = () => {
    const pages = [];
    const maxButtons = 5;
    let start = Math.max(1, safeCurrentPage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const handlePageChange = (page) => {
    const targetPage = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(targetPage);
    // Smoothly scroll to the datasets section
    const el = document.getElementById('dataset-cards-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div id="dataset-cards-section" className="space-y-6 font-mono">
      
      {/* ─── DATASETS HUB HEADER & SEARCH BAR ───────────────────────────── */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        
        {/* Left Count & Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-none shrink-0" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Extracted Datasets &amp; Campaigns ({datasets.length} Total)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => fetchDatasets()}
            title="Refresh Datasets"
            className="p-1.5 text-zinc-400 hover:text-white bg-[#111111] hover:bg-[#1A1A1A] border border-[#222222] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDatasets ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>

        {/* Right Search Input with Location, Keyword, or Name support */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="w-full lg:w-96 relative">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by Name, Location, Keyword..."
              className="w-full pl-8 pr-8 py-2 bg-[#000000] border border-[#2B2B2B] focus:border-blue-500 focus:outline-none text-white text-xs font-mono placeholder-zinc-500 transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5 pointer-events-none" />
            
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white cursor-pointer"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ─── ACTIVE FILTER / PAGINATION SUMMARY BANNER ──────────────────── */}
      {totalDatasets > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-400 px-1">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-white">{startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, totalDatasets)}</strong> of <strong className="text-white">{totalDatasets}</strong> Datasets
            </span>
            {searchFilter && (
              <span className="text-[11px] px-2 py-0.5 bg-blue-950/60 text-blue-300 border border-blue-800/80">
                Filtered: "{searchFilter}"
              </span>
            )}
          </div>
          <div className="text-zinc-500 text-[11px]">
            Page {safeCurrentPage} of {totalPages} (9 datasets per page)
          </div>
        </div>
      )}

      {/* ─── DATASETS 3X3 GRID (MAX 9 PER PAGE) ─────────────────────────── */}
      {loadingDatasets && datasets.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-6 bg-[#0A0A0A] border border-[#222] animate-pulse space-y-4">
              <div className="h-4 bg-zinc-800 w-3/4" />
              <div className="h-3 bg-zinc-900 w-1/2" />
              <div className="grid grid-cols-4 gap-2 pt-2">
                <div className="h-10 bg-zinc-900" />
                <div className="h-10 bg-zinc-900" />
                <div className="h-10 bg-zinc-900" />
                <div className="h-10 bg-zinc-900" />
              </div>
            </div>
          ))}
        </div>
      ) : displayedDatasets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedDatasets.map(dataset => (
            <DatasetCard
              key={dataset._id}
              dataset={dataset}
              onOpenAppendModal={(ds) => setAppendModalDataset(ds)}
              onViewLeads={onViewLeads}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[#0A0A0A] border border-[#262626] p-12 text-center space-y-3">
          <Database className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white uppercase">
            {searchFilter ? 'No Matching Datasets Found' : 'No Datasets Generated Yet'}
          </h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            {searchFilter 
              ? `No datasets matched "${searchFilter}". Try searching by a different name, keyword, or city location.` 
              : 'Enter a target niche and worldwide area above to generate your first isolated GMB Dataset.'}
          </p>
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter('')}
              className="mt-2 px-3 py-1.5 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-300 hover:text-white border border-[#2B2B2B] text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              Clear Search Filter
            </button>
          )}
        </div>
      )}

      {/* ─── BOTTOM PAGINATION CONTROLS (9 ENTRIES PER PAGE) ─────────────── */}
      {totalPages > 1 && (
        <div className="p-4 bg-[#0A0A0A] border border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="text-xs text-zinc-400 font-mono">
            Page <strong className="text-white">{safeCurrentPage}</strong> of <strong className="text-white">{totalPages}</strong> ({totalDatasets} Total Datasets)
          </div>

          <div className="flex items-center gap-1.5">
            
            {/* First Page Button */}
            <button
              type="button"
              onClick={() => handlePageChange(1)}
              disabled={safeCurrentPage === 1}
              title="First Page"
              className="p-2 bg-[#000000] border border-[#262626] text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            {/* Previous Page Button */}
            <button
              type="button"
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              className="px-3 py-1.5 bg-[#000000] border border-[#262626] text-xs text-zinc-300 hover:text-white hover:border-zinc-500 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            {/* Numbered Page Buttons */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map(pageNum => {
                const isSelected = pageNum === safeCurrentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => handlePageChange(pageNum)}
                    className={`min-w-8 h-8 px-2 text-xs font-mono font-bold flex items-center justify-center cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                        : 'bg-[#000000] border-[#262626] text-zinc-400 hover:text-white hover:border-zinc-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next Page Button */}
            <button
              type="button"
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage === totalPages}
              className="px-3 py-1.5 bg-[#000000] border border-[#262626] text-xs text-zinc-300 hover:text-white hover:border-zinc-500 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all flex items-center gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last Page Button */}
            <button
              type="button"
              onClick={() => handlePageChange(totalPages)}
              disabled={safeCurrentPage === totalPages}
              title="Last Page"
              className="p-2 bg-[#000000] border border-[#262626] text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>

          </div>

        </div>
      )}

    </div>
  );
};

export default DatasetList;
