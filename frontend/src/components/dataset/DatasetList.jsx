import React, { useState } from 'react';
import { Layers, Search, Database, Plus, RefreshCw } from 'lucide-react';
import { useLead } from '../../context/LeadContext';
import DatasetCard from './DatasetCard';
import AppendSearchModal from './AppendSearchModal';

const DatasetList = ({ onViewLeads }) => {
  const { datasets, loadingDatasets, fetchDatasets, appendModalDataset, setAppendModalDataset } = useLead();
  const [searchFilter, setSearchFilter] = useState('');

  const filteredDatasets = datasets.filter(d => 
    d.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(searchFilter.toLowerCase())) ||
    d.keyword.toLowerCase().includes(searchFilter.toLowerCase()) ||
    d.area.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Datasets Hub Header */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Left Count & Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-none shrink-0" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              My Datasets &amp; Search Campaigns ({datasets.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => fetchDatasets()}
            title="Refresh Datasets"
            className="p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDatasets ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search within datasets */}
        <div className="w-full md:w-72 relative">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search datasets..."
            className="w-full px-3 py-1.5 bg-[#000000] border border-[#2B2B2B] focus:border-white focus:outline-none text-white text-xs font-mono placeholder-zinc-600"
          />
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>

      </div>

      {/* Datasets Grid */}
      {loadingDatasets && datasets.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
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
      ) : filteredDatasets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDatasets.map(dataset => (
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
          <h3 className="text-base font-bold text-white font-mono uppercase">
            {searchFilter ? 'No Matching Datasets Found' : 'No Datasets Generated Yet'}
          </h3>
          <p className="text-xs text-zinc-400 font-mono max-w-md mx-auto leading-relaxed">
            {searchFilter 
              ? 'Try changing your search query.' 
              : 'Enter a target niche and worldwide area above to generate your first isolated GMB Dataset.'}
          </p>
        </div>
      )}

      {/* Append Modal */}
      <AppendSearchModal
        dataset={appendModalDataset}
        isOpen={Boolean(appendModalDataset)}
        onClose={() => setAppendModalDataset(null)}
      />

    </div>
  );
};

export default DatasetList;
