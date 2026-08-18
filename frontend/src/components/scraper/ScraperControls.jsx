import React, { useState, useEffect, useRef } from 'react';
import { Search, Globe, Calendar, Star, ShieldCheck, Zap, Loader2, MapPin, Sliders, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useLead } from '../../context/LeadContext';
import { ScraperService } from '../../services/api';

const ScraperControls = () => {
  const { executeScrape, scraping } = useLead();

  const [keyword, setKeyword] = useState('Roofing');
  const [area, setArea] = useState('Miami, FL');
  const [maxResults, setMaxResults] = useState(10);
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const [showAdvancedMeta, setShowAdvancedMeta] = useState(false);

  const [noWebsiteOnly, setNoWebsiteOnly] = useState(false);
  const [recentlyRegistered, setRecentlyRegistered] = useState(false);
  const [maxRating, setMaxRating] = useState(5.0);
  const [strictSearch, setStrictSearch] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const popularNiches = ['Roofing', 'Dentists', 'Remodeling', 'Plumbing', 'Solar', 'HVAC', 'Legal', 'Pool Builder'];
  const popularAreas = ['Miami, FL', 'Austin, TX', 'London, UK', 'Dubai, UAE', 'Chicago, IL', 'Toronto, Canada', 'Sydney, Australia'];
  const countPresets = [10, 25, 50, 100];

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch worldwide area suggestions on input change
  const handleAreaChange = (val) => {
    setArea(val);
    setSelectedIndex(-1);

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
        } else {
          setSuggestions([]);
          setShowDropdown(false);
        }
      } catch (err) {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 200);
  };

  const handleSelectSuggestion = (suggestedArea) => {
    setArea(suggestedArea);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowDropdown(false);
    executeScrape({
      keyword,
      area,
      maxResults: parseInt(maxResults, 10) || 10,
      datasetName: datasetName.trim() || undefined,
      datasetDescription: datasetDescription.trim() || undefined,
      noWebsiteOnly,
      recentlyRegistered,
      maxRating,
      strictSearch
    });
  };

  return (
    <div className="bg-[#0A0A0A] border border-[#262626] p-6 mb-8 relative overflow-hidden">
      {/* Decorative top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-white/40 to-transparent" />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#1E1E1E]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 inline-block" />
            <h2 className="text-base font-bold text-white font-mono tracking-wide uppercase">
              GMB Scraping &amp; Dataset Generator
            </h2>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Extract up to 100 live Google Places profiles per search and generate an isolated, manageable Dataset.
          </p>
        </div>

        {/* Info Tags */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <span className="px-2 py-0.5 border border-blue-600/70 bg-blue-950/30 text-blue-300 font-semibold flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-blue-400" />
            Max 100 Profiles / Search
          </span>

          <span className={`px-2 py-0.5 border ${
            strictSearch 
              ? 'border-blue-500/80 bg-blue-950/40 text-blue-400 font-semibold' 
              : 'border-zinc-700 bg-[#121212] text-zinc-300'
          }`}>
            {strictSearch ? 'STRICT (100% MATCH)' : 'RELAXED (ADAPTIVE)'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        
        {/* Main Inputs: Keyword & Worldwide Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Target Niche / Keyword */}
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Target Niche / Keyword <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                disabled={scraping}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. Dentists, Roofing, Construction, Remodeling..."
                className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#2B2B2B] focus:border-white focus:outline-none text-white text-sm font-mono placeholder-zinc-600 transition-colors disabled:opacity-50"
              />
            </div>
            {/* Quick Niche Pills */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[10px] text-zinc-500 font-mono">Niche:</span>
              {popularNiches.map(n => (
                <button
                  type="button"
                  key={n}
                  disabled={scraping}
                  onClick={() => setKeyword(n)}
                  className={`text-[11px] font-mono px-2 py-0.5 border transition-all cursor-pointer disabled:opacity-40 ${
                    keyword.toLowerCase() === n.toLowerCase() 
                      ? 'border-white bg-white text-black font-semibold' 
                      : 'border-[#222222] bg-[#0E0E0E] text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Area / Worldwide Geographic Location Destination */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase flex items-center justify-between">
              <span>Area / Worldwide Location <span className="text-rose-400">*</span></span>
              {loadingSuggestions && (
                <span className="text-[10px] text-blue-400 flex items-center gap-1">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Searching Google...
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                disabled={scraping}
                value={area}
                onChange={(e) => handleAreaChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                placeholder="Type any city, state, or country worldwide (e.g. Miami, London, Dubai)..."
                className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#2B2B2B] focus:border-white focus:outline-none text-white text-sm font-mono placeholder-zinc-600 transition-colors disabled:opacity-50"
              />
              <MapPin className="w-4 h-4 text-zinc-500 absolute right-3 top-3 pointer-events-none" />

              {/* Worldwide Google Autocomplete Dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#0D0D0D] border border-zinc-700 shadow-2xl z-50 divide-y divide-[#1F1F1F] max-h-60 overflow-y-auto">
                  {suggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSuggestion(item)}
                      className={`p-2.5 text-xs font-mono cursor-pointer flex items-center gap-2.5 transition-colors ${
                        selectedIndex === idx 
                          ? 'bg-blue-600 text-white' 
                          : 'text-zinc-300 hover:bg-[#1A1A1A] hover:text-white'
                      }`}
                    >
                      <MapPin className={`w-3.5 h-3.5 shrink-0 ${selectedIndex === idx ? 'text-white' : 'text-blue-400'}`} />
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Area Pills */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[10px] text-zinc-500 font-mono">Popular:</span>
              {popularAreas.map(a => (
                <button
                  type="button"
                  key={a}
                  disabled={scraping}
                  onClick={() => {
                    setArea(a);
                    setShowDropdown(false);
                  }}
                  className={`text-[11px] font-mono px-2 py-0.5 border transition-all cursor-pointer disabled:opacity-40 ${
                    area.toLowerCase() === a.toLowerCase() 
                      ? 'border-white bg-white text-black font-semibold' 
                      : 'border-[#222222] bg-[#0E0E0E] text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* ─── EXTRACTION COUNT SELECTOR (1 to 100 Max) ────────────────────────── */}
        <div className="p-4 bg-[#070707] border border-[#222222] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                Target Search Results / Profile Count
              </span>
              <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                Maximum 100 profiles per search. If an area has fewer listings (e.g. 20-30), the search returns the maximum available.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="100"
                value={maxResults}
                disabled={scraping}
                onChange={(e) => setMaxResults(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                className="w-16 px-2 py-1 bg-black border border-[#333] text-white text-xs font-mono text-center font-bold"
              />
              <span className="text-xs font-mono text-zinc-400">Profiles</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={maxResults}
              disabled={scraping}
              onChange={(e) => setMaxResults(parseInt(e.target.value, 10))}
              className="flex-1 accent-blue-500 bg-zinc-800 cursor-pointer h-1.5 disabled:opacity-40"
            />
            
            {/* Quick Count Chips */}
            <div className="flex items-center gap-1.5 shrink-0">
              {countPresets.map(count => (
                <button
                  type="button"
                  key={count}
                  disabled={scraping}
                  onClick={() => setMaxResults(count)}
                  className={`text-[11px] font-mono px-2.5 py-1 border transition-all cursor-pointer ${
                    maxResults === count 
                      ? 'border-blue-500 bg-blue-950/60 text-blue-300 font-bold' 
                      : 'border-[#222] bg-[#0E0E0E] text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Optional Custom Dataset Name & Description Toggle */}
        <div className="border border-[#1E1E1E] bg-[#050505]">
          <button
            type="button"
            onClick={() => setShowAdvancedMeta(!showAdvancedMeta)}
            className="w-full px-4 py-2.5 text-xs font-mono text-zinc-400 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-zinc-500" />
              <span>Custom Dataset Name &amp; Campaign Description (Optional)</span>
            </span>
            {showAdvancedMeta ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvancedMeta && (
            <div className="p-4 border-t border-[#1C1C1C] space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Dataset Name</label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder={`Auto-generates as "${keyword} in ${area.split(',')[0]}..." if left blank`}
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white text-xs font-mono placeholder-zinc-600 focus:border-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Dataset Campaign Notes / Description</label>
                <textarea
                  rows="2"
                  value={datasetDescription}
                  onChange={(e) => setDatasetDescription(e.target.value)}
                  placeholder="e.g. Target campaign for commercial roofing contractors with no existing website..."
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white text-xs font-mono placeholder-zinc-600 focus:border-white focus:outline-none resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Multi-Parameter Advanced Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4 border-t border-[#1C1C1C]">
          
          {/* Toggle: No Website Only */}
          <div 
            onClick={() => !scraping && setNoWebsiteOnly(!noWebsiteOnly)}
            className={`p-3 border transition-all cursor-pointer flex items-center justify-between ${
              noWebsiteOnly ? 'border-amber-500/80 bg-amber-950/20' : 'border-[#222222] bg-[#070707] hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Globe className={`w-4 h-4 ${noWebsiteOnly ? 'text-amber-400' : 'text-zinc-500'}`} />
              <div>
                <div className="text-xs font-semibold text-white font-mono">No Website Only</div>
                <div className="text-[10px] text-zinc-500 font-mono">Lacks URL listing</div>
              </div>
            </div>
            <div className={`w-4 h-4 border flex items-center justify-center ${noWebsiteOnly ? 'border-amber-400 bg-amber-400' : 'border-zinc-700 bg-black'}`}>
              {noWebsiteOnly && <span className="w-1.5 h-1.5 bg-black" />}
            </div>
          </div>

          {/* Toggle: Recently Registered (<90 Days) */}
          <div 
            onClick={() => !scraping && setRecentlyRegistered(!recentlyRegistered)}
            className={`p-3 border transition-all cursor-pointer flex items-center justify-between ${
              recentlyRegistered ? 'border-emerald-500/80 bg-emerald-950/20' : 'border-[#222222] bg-[#070707] hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar className={`w-4 h-4 ${recentlyRegistered ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <div>
                <div className="text-xs font-semibold text-white font-mono">Recent (&lt;90 Days)</div>
                <div className="text-[10px] text-zinc-500 font-mono">Newer listings</div>
              </div>
            </div>
            <div className={`w-4 h-4 border flex items-center justify-center ${recentlyRegistered ? 'border-emerald-400 bg-emerald-400' : 'border-zinc-700 bg-black'}`}>
              {recentlyRegistered && <span className="w-1.5 h-1.5 bg-black" />}
            </div>
          </div>

          {/* Slider: Max Rating Upper Bound */}
          <div className="p-3 border border-[#222222] bg-[#070707] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                Max Rating:
              </span>
              <span className="font-bold text-white font-mono bg-[#141414] px-1.5 border border-[#333]">
                {maxRating >= 5 ? 'Any (5.0)' : `≤ ${maxRating} ⭐`}
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.1"
              disabled={scraping}
              value={maxRating}
              onChange={(e) => setMaxRating(parseFloat(e.target.value))}
              className="w-full accent-amber-400 bg-zinc-800 cursor-pointer h-1.5 disabled:opacity-40"
            />
          </div>

          {/* Toggle: Strict Search */}
          <div 
            onClick={() => !scraping && setStrictSearch(!strictSearch)}
            className={`p-3 border transition-all cursor-pointer flex items-center justify-between ${
              strictSearch ? 'border-blue-500/80 bg-blue-950/20' : 'border-[#222222] bg-[#070707] hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className={`w-4 h-4 ${strictSearch ? 'text-blue-400' : 'text-zinc-500'}`} />
              <div>
                <div className="text-xs font-semibold text-white font-mono">Strict 100% Filter</div>
                <div className="text-[10px] text-zinc-500 font-mono">No relaxed fallback</div>
              </div>
            </div>
            <div className={`w-4 h-4 border flex items-center justify-center ${strictSearch ? 'border-blue-400 bg-blue-400' : 'border-zinc-700 bg-black'}`}>
              {strictSearch && <span className="w-1.5 h-1.5 bg-black" />}
            </div>
          </div>

        </div>

        {/* ─── LIVE EXTRACTION SCANNING LOADER BANNER ────────────────────────── */}
        {scraping && (
          <div className="p-4 bg-[#080B14] border border-blue-600/60 animate-pulse transition-all space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span>Extracting Live Google Business Profiles ({maxResults} Target)...</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                Target: {keyword} in {area}
              </span>
            </div>

            <div className="h-1.5 w-full bg-[#141414] overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-400 to-blue-600 animate-[pulse_1s_infinite] w-full" />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span>📡 Connecting to Google Places API (New) endpoint...</span>
              <span className="text-emerald-400 font-semibold">Max {maxResults} Profiles</span>
            </div>
          </div>
        )}

        {/* Action Button & Terminal Exclusion Note */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs font-mono text-zinc-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Generates isolated Dataset. Terminal statuses automatically deduplicated.</span>
          </div>

          <button
            type="submit"
            disabled={scraping}
            className="w-full sm:w-auto px-8 py-3 bg-white text-black font-mono font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer border border-white shadow-lg"
          >
            {scraping ? (
              <>
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span>Extracting {maxResults} Leads...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 text-black" />
                <span>Generate Dataset ({maxResults} Profiles)</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default ScraperControls;
