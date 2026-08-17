import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { currentPage, totalPages, totalLeads, limit } = pagination;
  const startCount = (currentPage - 1) * limit + 1;
  const endCount = Math.min(currentPage * limit, totalLeads);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 border-t border-[#262626] bg-[#0A0A0A] text-sm">
      <div className="text-zinc-400 font-mono text-xs">
        Showing <span className="text-white font-semibold">{startCount}</span> to <span className="text-white font-semibold">{endCount}</span> of <span className="text-white font-semibold">{totalLeads}</span> profiles <span className="text-zinc-600">({limit} per page)</span>
      </div>

      <div className="flex items-center gap-1.5 font-mono">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 border border-[#262626] bg-[#000000] text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2.5 py-1.5 flex items-center gap-1 border border-[#262626] bg-[#000000] text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30 disabled:pointer-events-none transition-colors text-xs"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>

        <div className="px-3 py-1.5 border border-[#333333] bg-[#121212] text-xs font-semibold text-white">
          Page {currentPage} / {totalPages}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1.5 flex items-center gap-1 border border-[#262626] bg-[#000000] text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30 disabled:pointer-events-none transition-colors text-xs"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1.5 border border-[#262626] bg-[#000000] text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Last Page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
