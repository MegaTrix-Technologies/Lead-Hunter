import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, MapPin, Zap, AlertCircle, PlusCircle } from 'lucide-react';
import { useLead } from '../../context/LeadContext';
import { ScraperService } from '../../services/api';

const AppendSearchModal = ({ dataset, isOpen, onClose }) => {
  const { appendLeadsToDataset, scraping } = useLead();

  const [keyword, setKeyword] = useState('');
  const [area, setArea] = useState('');
  const [maxResults, setMaxResults] = useState(10);
  const [noWebsiteOnly, setNoWebsiteOnly] = useState(false);
  const [recentlyRegistered, setRecentlyRegistered] = useState(false);
  const [maxRating, setMaxRating] = useState(5.0);
  const [strictSearch, setStrictSearch] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (dataset) {
      setKeyword(dataset.keyword || '');
      setArea(dataset.area || '');
    }
  }, [dataset]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAreaChange = (val) => {
    setArea(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await ScraperService.autocompleteArea(val.trim());
        if (res.data.suggestions && res.data.suggestions.length > 0) {
          setSuggestions(res.data.suggestions);
          setShowDropdown(true);
        }
      } catch (err) {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dataset) return;

    await appendLeadsToDataset(dataset._id, {
      keyword,
      area,
      maxResults: parseInt(maxResults, 10) || 10,
      noWebsiteOnly,
      recentlyRegistered,
      maxRating,
      strictSearch
    });

    onClose();
  };

  if (!isOpen || !dataset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0A0A0A] border border-zinc-700 w-full max-w-xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-[#222] bg-[#0E0E0E] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Search &amp; Append to Dataset
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dataset Target Banner */}
        <div className="px-5 py-3 bg-[#050505] border-b border-[#1A1A1A] flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-zinc-500">Target Dataset:</span>{' '}
            <span className="text-white font-bold">{dataset.name}</span>
          </div>
          <span className="text-emerald-400 font-semibold">{dataset.totalLeads} Current Leads</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase">Keyword / Niche</label>
              <input
                type="text"
                required
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. Roofing, Dentists..."
                className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white text-xs font-mono focus:border-white focus:outline-none"
              />
            </div>

            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase flex items-center justify-between">
                <span>Worldwide Area</span>
                {loadingSuggestions && <span className="text-[10px] text-blue-400">Searching...</span>}
              </label>
              <input
                type="text"
                required
                value={area}
                onChange={(e) => handleAreaChange(e.target.value)}
                placeholder="e.g. Miami, FL, London, UK..."
                className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white text-xs font-mono focus:border-white focus:outline-none"
              />

              {showDropdown && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#0D0D0D] border border-zinc-700 shadow-2xl z-50 divide-y divide-[#1F1F1F] max-h-48 overflow-y-auto">
                  {suggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setArea(item);
                        setShowDropdown(false);
                      }}
                      className="p-2 text-xs font-mono text-zinc-300 hover:bg-[#1A1A1A] hover:text-white cursor-pointer flex items-center gap-2"
                    >
                      <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Profile Count Selector (1-100) */}
          <div className="p-3 bg-[#050505] border border-[#222] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">Add More Profiles (Max 100 per search):</span>
              <span className="font-bold text-white bg-[#141414] px-2 py-0.5 border border-[#333]">
                {maxResults} Profiles
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="100"
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value, 10))}
                className="flex-1 accent-blue-500 bg-zinc-800 cursor-pointer h-1.5"
              />
              <div className="flex items-center gap-1">
                {[10, 25, 50, 100].map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setMaxResults(c)}
                    className={`text-[10px] font-mono px-2 py-0.5 border cursor-pointer ${
                      maxResults === c ? 'border-blue-500 bg-blue-950 text-blue-300' : 'border-[#222] text-zinc-400'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Deduplication Reminder */}
          <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Existing profiles in this dataset and terminal statuses are automatically deduplicated.</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1A1A1A]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-400 hover:text-white border border-[#2B2B2B] text-xs font-mono cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={scraping}
              className="px-6 py-2 bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-md"
            >
              {scraping ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Extracting &amp; Appending...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Search &amp; Append Leads</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AppendSearchModal;
