import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, Lock, Clock, CheckCircle2 } from 'lucide-react';
import { useLead } from '../../context/LeadContext';

const AppendSearchModal = ({ dataset, isOpen, onClose }) => {
  const { appendLeadsToDataset, scraping } = useLead();

  const [maxResults, setMaxResults] = useState(10);
  const [noWebsiteOnly, setNoWebsiteOnly] = useState(false);
  const [recentlyRegistered, setRecentlyRegistered] = useState(false);
  const [maxRating, setMaxRating] = useState(5.0);
  const [strictSearch, setStrictSearch] = useState(false);

  // Dynamic hover guidance state
  const [hoverText, setHoverText] = useState('');

  // Real-time progress tracker state
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setMaxResults(10);
      setHoverText('');
      setProgress(0);
      setProgressStage('');
      setElapsedTime(0);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval = null;
    let timer = null;

    if (scraping) {
      setProgress(10);
      setProgressStage('Connecting to Google Places API (New)...');
      setElapsedTime(0);

      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

      interval = setInterval(() => {
        setProgress(prev => {
          if (prev < 30) {
            setProgressStage(`Querying Google Places for new profiles...`);
            return prev + 5;
          } else if (prev < 60) {
            setProgressStage(`Resolving place metadata and phone numbers...`);
            return prev + 4;
          } else if (prev < 85) {
            setProgressStage(`Deduplicating existing leads in dataset...`);
            return prev + 3;
          } else if (prev < 96) {
            setProgressStage(`Validating criteria & appending to dataset...`);
            return prev + 1;
          }
          return prev;
        });
      }, 250);
    } else {
      if (progress > 0) {
        setProgress(100);
        setProgressStage('Appended successfully!');
      }
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timer) clearInterval(timer);
    };
  }, [scraping]);

  if (!isOpen || !dataset) return null;

  const targetKeyword = dataset.keyword || (dataset.searchHistory && dataset.searchHistory[0]?.keyword) || 'General Niche';
  const targetArea = dataset.area || (dataset.searchHistory && dataset.searchHistory[0]?.area) || 'Worldwide';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dataset) return;

    await appendLeadsToDataset(dataset._id, {
      keyword: targetKeyword,
      area: targetArea,
      maxResults: parseInt(maxResults, 10) || 10,
      noWebsiteOnly,
      recentlyRegistered,
      maxRating,
      strictSearch
    });

    onClose();
  };

  const getRatingHoverText = (rating) => {
    if (rating >= 5.0) return 'Businesses across all rating tiers (0.0 to 5.0 stars).';
    return `Businesses with customer rating between 0.0 and ${rating.toFixed(1)} stars.`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#080808] border border-[#2B2B2B] w-full max-w-3xl shadow-2xl relative overflow-hidden font-mono">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-[#222] bg-[#0C0C0C] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-none inline-block" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                GMB Search &amp; Dataset Expansion
              </h3>
              <div className="text-xs font-bold text-zinc-300 mt-1 truncate max-w-lg">
                {dataset.name}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1.5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          
          {/* Row 1: Locked Keyword & Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Niche / Keyword (Read-only) */}
            <div
              onMouseEnter={() => setHoverText('Locked campaign keyword — all appended businesses will strictly match this niche.')}
              onMouseLeave={() => setHoverText('')}
            >
              <label className="block text-[11px] text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>
                  Niche / Keyword <span className="text-rose-500 font-bold">*</span>
                </span>
                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-zinc-500" /> Locked to Dataset
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={targetKeyword}
                  className="w-full px-3.5 py-2.5 bg-[#030303] border border-[#222222] text-white text-xs font-mono cursor-not-allowed select-none font-bold"
                />
                <Lock className="w-3.5 h-3.5 text-zinc-600 absolute right-3 top-3" />
              </div>
            </div>

            {/* Area / Worldwide Location (Read-only) */}
            <div
              onMouseEnter={() => setHoverText('Locked location — searches will strictly focus on this geographic territory.')}
              onMouseLeave={() => setHoverText('')}
            >
              <label className="block text-[11px] text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>
                  Area / Worldwide Location <span className="text-rose-500 font-bold">*</span>
                </span>
                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-zinc-500" /> Locked to Dataset
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={targetArea}
                  className="w-full px-3.5 py-2.5 bg-[#030303] border border-[#222222] text-white text-xs font-mono cursor-not-allowed select-none font-bold"
                />
                <Lock className="w-3.5 h-3.5 text-zinc-600 absolute right-3 top-3" />
              </div>
            </div>

          </div>

          {/* Row 2: Search Results / Profile Count Selector (1 to 100) */}
          <div className="p-4 bg-[#040404] border border-[#1E1E1E] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  Search Results / Profile Count
                </span>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Maximum 100 profiles per search. Returns the maximum available listings for this area.
                </p>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 bg-black border border-zinc-700 text-xs font-bold text-white">
                  {maxResults} <span className="text-[10px] text-zinc-400 font-normal">Profiles</span>
                </span>
              </div>
            </div>

            {/* Range Slider + Quick Select Chips */}
            <div className="flex items-center gap-4 pt-1">
              <input
                type="range"
                min="1"
                max="100"
                value={maxResults}
                onMouseEnter={() => setHoverText(`Extract up to ${maxResults} live business profiles into this dataset.`)}
                onMouseLeave={() => setHoverText('')}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setMaxResults(val);
                  setHoverText(`Extract up to ${val} live business profiles into this dataset.`);
                }}
                className="flex-1 accent-blue-500 bg-zinc-800 cursor-pointer h-2 rounded-none"
              />
              <div className="flex items-center gap-1">
                {[10, 25, 50, 100].map(c => (
                  <button
                    type="button"
                    key={c}
                    onMouseEnter={() => setHoverText(`Extract a batch of up to ${c} verified business profiles.`)}
                    onMouseLeave={() => setHoverText('')}
                    onClick={() => {
                      setMaxResults(c);
                      setHoverText(`Extract a batch of up to ${c} verified business profiles.`);
                    }}
                    className={`text-xs px-2.5 py-1 border transition-all cursor-pointer ${
                      maxResults === c 
                        ? 'border-blue-500 bg-blue-950 text-blue-300 font-bold' 
                        : 'border-[#262626] bg-[#0A0A0A] text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: 4 Parameter Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            
            {/* Filter 1: No Website Only */}
            <div 
              onMouseEnter={() => setHoverText('Businesses that have no website listed (prime web design prospects).')}
              onMouseLeave={() => setHoverText('')}
              onClick={() => setNoWebsiteOnly(!noWebsiteOnly)}
              className={`p-3 border cursor-pointer transition-all flex items-center justify-between ${
                noWebsiteOnly 
                  ? 'border-blue-500 bg-blue-950/30' 
                  : 'border-[#1E1E1E] bg-[#040404] hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-white">No Website Only</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Lacks URL listing</div>
              </div>
              <input
                type="checkbox"
                checked={noWebsiteOnly}
                onChange={() => {}}
                className="accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Filter 2: Recent (<90 Days) */}
            <div 
              onMouseEnter={() => setHoverText('Businesses recently established or newly registered on Google Maps.')}
              onMouseLeave={() => setHoverText('')}
              onClick={() => setRecentlyRegistered(!recentlyRegistered)}
              className={`p-3 border cursor-pointer transition-all flex items-center justify-between ${
                recentlyRegistered 
                  ? 'border-blue-500 bg-blue-950/30' 
                  : 'border-[#1E1E1E] bg-[#040404] hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-white">Recent (&lt;90 Days)</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Newer listings</div>
              </div>
              <input
                type="checkbox"
                checked={recentlyRegistered}
                onChange={() => {}}
                className="accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Filter 3: Max Rating Slider */}
            <div 
              onMouseEnter={() => setHoverText(getRatingHoverText(maxRating))}
              onMouseLeave={() => setHoverText('')}
              className="p-3 border border-[#1E1E1E] bg-[#040404] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">⭐ Max Rating:</span>
                <span className="text-white font-bold">
                  {maxRating >= 5.0 ? 'Any (5.0)' : maxRating.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.1"
                value={maxRating}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setMaxRating(val);
                  setHoverText(getRatingHoverText(val));
                }}
                className="w-full accent-yellow-400 bg-zinc-800 cursor-pointer h-1.5 mt-2"
              />
            </div>

            {/* Filter 4: Strict 100% Filter */}
            <div 
              onMouseEnter={() => setHoverText('Strict keyword matching — returns only businesses matching this exact niche without related-category broadening.')}
              onMouseLeave={() => setHoverText('')}
              onClick={() => setStrictSearch(!strictSearch)}
              className={`p-3 border cursor-pointer transition-all flex items-center justify-between ${
                strictSearch 
                  ? 'border-blue-500 bg-blue-950/30' 
                  : 'border-[#1E1E1E] bg-[#040404] hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-white">Strict 100% Filter</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">No relaxed fallback</div>
              </div>
              <input
                type="checkbox"
                checked={strictSearch}
                onChange={() => {}}
                className="accent-blue-500 cursor-pointer"
              />
            </div>

          </div>

          {/* Dynamic Full-Width Red Guidance Box */}
          <div className="p-3 bg-[#040404] border border-[#1E1E1E] min-h-[44px] flex items-center">
            <div className="flex items-start gap-2 text-xs text-rose-400 leading-relaxed">
              {hoverText ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1 inline-block animate-pulse" />
                  <span className="break-words font-medium">{hoverText}</span>
                </>
              ) : (
                <span className="text-zinc-600 text-[11px]">
                  Hover over any filter or parameter above to view its criteria description.
                </span>
              )}
            </div>
          </div>

          {/* ─── LIVE REAL-TIME PROGRESS TRACKER ────────────────────────── */}
          {(scraping || progress > 0) && (
            <div className="p-3.5 bg-[#05070F] border border-blue-600/80 transition-all space-y-2.5 font-mono">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {progress === 100 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  )}
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {progress === 100 ? 'Appended Successfully' : `Extracting & Appending ${maxResults} Leads`}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span>00:{elapsedTime < 10 ? `0${elapsedTime}` : elapsedTime}s</span>
                  </span>
                  <span className="px-2 py-0.5 bg-blue-950/80 text-blue-300 border border-blue-700/60 text-xs font-bold">
                    {progress}%
                  </span>
                </div>
              </div>

              <div className="h-2 w-full bg-[#121212] overflow-hidden border border-[#222]">
                <div 
                  className={`h-full transition-all duration-300 ${
                    progress === 100 
                      ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]' 
                      : 'bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="text-[11px] text-blue-300 truncate">
                {progressStage}
              </div>
            </div>
          )}

          {/* Equal-Sized Bottom Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1C1C1C]">
            <button
              type="button"
              onClick={onClose}
              disabled={scraping}
              className="w-full sm:w-48 py-2.5 bg-[#121212] hover:bg-[#1A1A1A] text-zinc-300 hover:text-white border border-[#2B2B2B] text-xs font-bold uppercase tracking-wider text-center cursor-pointer transition-colors disabled:opacity-40"
            >
              CANCEL
            </button>

            <button
              type="submit"
              disabled={scraping}
              className="w-full sm:w-48 py-2.5 bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shadow-lg transition-all text-center"
            >
              {scraping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>EXTRACTING ({progress}%)...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>EXTRACT &amp; APPEND</span>
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
