import React, { useState, useEffect, useRef } from 'react';
import { Search, Globe, Calendar, Star, ShieldCheck, Zap, Loader2, MapPin, Sliders, FileText, ChevronDown, ChevronUp, Clock, CheckCircle2 } from 'lucide-react';
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

  // Parameters hover guidance state
  const [hoverParamText, setHoverParamText] = useState('');

  // Real-time progress tracker state
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

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

  // Dynamic progress animation while scraping
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
            setProgressStage(`Querying Places API for "${keyword}" in "${area}"...`);
            return prev + 5;
          } else if (prev < 60) {
            setProgressStage(`Resolving place IDs, phone numbers, and website links...`);
            return prev + 4;
          } else if (prev < 85) {
            setProgressStage(`Deduplicating existing records & checking terminal call status...`);
            return prev + 3;
          } else if (prev < 96) {
            setProgressStage(`Validating criteria & indexing profiles into Dataset...`);
            return prev + 1;
          }
          return prev;
        });
      }, 250);
    } else {
      if (progress > 0) {
        setProgress(100);
        setProgressStage('Extraction complete! Profiles saved to dataset.');
        const timeout = setTimeout(() => {
          setProgress(0);
          setProgressStage('');
        }, 3000);
        return () => clearTimeout(timeout);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timer) clearInterval(timer);
    };
  }, [scraping, keyword, area]);

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
              Target Niche / Keyword <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                disabled={scraping}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. Roofing, Dentists, Plumbing..."
                className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#2B2B2B] text-white text-xs font-mono focus:border-white focus:outline-none disabled:opacity-50"
              />
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-3" />
            </div>

            {/* Quick Niche Chips */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-zinc-500 font-mono">Quick:</span>
              {popularNiches.map(niche => (
                <button
                  type="button"
                  key={niche}
                  disabled={scraping}
                  onClick={() => setKeyword(niche)}
                  className={`text-[10px] font-mono px-2 py-0.5 border transition-colors cursor-pointer ${
                    keyword.toLowerCase() === niche.toLowerCase()
                      ? 'border-blue-500 bg-blue-950 text-blue-300 font-bold'
                      : 'border-[#222222] bg-[#0C0C0C] text-zinc-400 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  {niche}
                </button>
              ))}
            </div>
          </div>

          {/* Area / Worldwide Location (With Autocomplete Dropdown) */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Area / Worldwide Location <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                disabled={scraping}
                value={area}
                onChange={(e) => handleAreaChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                onKeyDown={handleKeyDown}
                placeholder="Type any city, state, or country worldwide..."
                className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#2B2B2B] text-white text-xs font-mono focus:border-white focus:outline-none disabled:opacity-50"
              />
              {loadingSuggestions ? (
                <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin absolute right-3 top-3" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-3" />
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-[#080808] border border-zinc-700 shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-[#1A1A1A]">
                {suggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSuggestion(item)}
                    className={`p-2.5 text-xs font-mono cursor-pointer flex items-center gap-2 transition-colors ${
                      selectedIndex === idx
                        ? 'bg-blue-950 text-blue-200 font-bold'
                        : 'text-zinc-300 hover:bg-[#121212] hover:text-white'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Area Chips */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-zinc-500 font-mono">Popular:</span>
              {popularAreas.map(popArea => (
                <button
                  type="button"
                  key={popArea}
                  disabled={scraping}
                  onClick={() => setArea(popArea)}
                  className={`text-[10px] font-mono px-2 py-0.5 border transition-colors cursor-pointer ${
                    area.toLowerCase() === popArea.toLowerCase()
                      ? 'border-blue-500 bg-blue-950 text-blue-300 font-bold'
                      : 'border-[#222222] bg-[#0C0C0C] text-zinc-400 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  {popArea}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Target Profile Count Slider (1 to 100) */}
        <div 
          onMouseEnter={() => setHoverParamText('Target Profile Count: Sets how many Google Places profiles to extract in this batch (1 to 100 profiles with multi-page token resolution).')}
          onMouseLeave={() => setHoverParamText('')}
          className="p-4 bg-[#050505] border border-[#1E1E1E] space-y-3 hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                Target Search Results / Profile Count
              </span>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                Select between 1 and 100 profiles to extract in this batch.
              </p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-black border border-zinc-700 text-xs font-mono font-bold text-white">
                {maxResults} <span className="text-[10px] text-zinc-400 font-normal">Profiles</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-1">
            <input
              type="range"
              min="1"
              max="100"
              disabled={scraping}
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value, 10))}
              className="flex-1 accent-blue-500 bg-zinc-800 cursor-pointer h-2 disabled:opacity-40"
            />
            <div className="flex items-center gap-1">
              {countPresets.map(c => (
                <button
                  type="button"
                  key={c}
                  disabled={scraping}
                  onClick={() => setMaxResults(c)}
                  className={`text-xs font-mono px-2.5 py-1 border transition-all cursor-pointer ${
                    maxResults === c
                      ? 'border-blue-500 bg-blue-950 text-blue-300 font-bold'
                      : 'border-[#262626] bg-[#0C0C0C] text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Optional Dataset Name & Notes Accordion */}
        <div className="border border-[#1A1A1A] bg-[#050505]">
          <button
            type="button"
            onClick={() => setShowAdvancedMeta(!showAdvancedMeta)}
            className="w-full p-3 flex items-center justify-between text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-zinc-500" />
              <span>Dataset Customization (Name &amp; Campaign Notes)</span>
            </span>
            {showAdvancedMeta ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
          </button>

          {showAdvancedMeta && (
            <div className="p-4 border-t border-[#1A1A1A] space-y-3 font-mono">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Custom Dataset Name (Optional - Auto-generated if left blank)
                </label>
                <input
                  type="text"
                  disabled={scraping}
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder={`e.g. ${keyword} in ${area.split(',')[0]} Outreach Batch`}
                  className="w-full px-3 py-2 bg-black border border-[#262626] text-white text-xs focus:border-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Campaign Description / Outreach Goals (Optional)
                </label>
                <textarea
                  rows="2"
                  disabled={scraping}
                  value={datasetDescription}
                  onChange={(e) => setDatasetDescription(e.target.value)}
                  placeholder="Notes on client pitch, offer details, or target sub-niche..."
                  className="w-full px-3 py-2 bg-black border border-[#262626] text-white text-xs focus:border-white focus:outline-none resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* 4 Extraction Filter Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          
          {/* Filter 1: No Website Only */}
          <div 
            onMouseEnter={() => setHoverParamText('No Website Only: Filters out businesses that have an active website URL, isolating high-converting prospects lacking a web presence.')}
            onMouseLeave={() => setHoverParamText('')}
            onClick={() => !scraping && setNoWebsiteOnly(!noWebsiteOnly)}
            className={`p-3 border transition-all cursor-pointer flex items-center justify-between ${
              noWebsiteOnly ? 'border-blue-500/80 bg-blue-950/20' : 'border-[#222222] bg-[#070707] hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Globe className={`w-4 h-4 ${noWebsiteOnly ? 'text-blue-400' : 'text-zinc-500'}`} />
              <div>
                <div className="text-xs font-semibold text-white font-mono">No Website Only</div>
                <div className="text-[10px] text-zinc-500 font-mono">Lacks URL listing</div>
              </div>
            </div>
            <div className={`w-4 h-4 border flex items-center justify-center ${noWebsiteOnly ? 'border-blue-400 bg-blue-400' : 'border-zinc-700 bg-black'}`}>
              {noWebsiteOnly && <span className="w-1.5 h-1.5 bg-black" />}
            </div>
          </div>

          {/* Filter 2: Recent (<90 Days) */}
          <div 
            onMouseEnter={() => setHoverParamText('Recently Registered (<90 Days): Isolates newly opened establishments and fresh Google listings that are actively setting up operations.')}
            onMouseLeave={() => setHoverParamText('')}
            onClick={() => !scraping && setRecentlyRegistered(!recentlyRegistered)}
            className={`p-3 border transition-all cursor-pointer flex items-center justify-between ${
              recentlyRegistered ? 'border-blue-500/80 bg-blue-950/20' : 'border-[#222222] bg-[#070707] hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar className={`w-4 h-4 ${recentlyRegistered ? 'text-blue-400' : 'text-zinc-500'}`} />
              <div>
                <div className="text-xs font-semibold text-white font-mono">Recent (&lt;90 Days)</div>
                <div className="text-[10px] text-zinc-500 font-mono">Newer listings</div>
              </div>
            </div>
            <div className={`w-4 h-4 border flex items-center justify-center ${recentlyRegistered ? 'border-blue-400 bg-blue-400' : 'border-zinc-700 bg-black'}`}>
              {recentlyRegistered && <span className="w-1.5 h-1.5 bg-black" />}
            </div>
          </div>

          {/* Filter 3: Max Rating Slider */}
          <div 
            onMouseEnter={() => setHoverParamText('Max Rating Threshold: Targets businesses with star ratings at or below your chosen threshold (e.g. ≤4.2 stars) for reputation management & review recovery pitches.')}
            onMouseLeave={() => setHoverParamText('')}
            className="p-3 border border-[#222222] bg-[#070707] space-y-1.5 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400" /> Max Rating:
              </span>
              <span className="text-white font-bold">
                {maxRating >= 5.0 ? 'Any (5.0)' : maxRating.toFixed(1)}
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

          {/* Filter 4: Strict 100% Filter */}
          <div 
            onMouseEnter={() => setHoverParamText('Strict 100% Filter: Enforces exact keyword matching in business name or primary category without broadening to adjacent niches.')}
            onMouseLeave={() => setHoverParamText('')}
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

        {/* Dynamic Full-Width Parameters Hover Help Bar */}
        <div className="p-3 bg-[#040404] border border-[#1E1E1E] min-h-[44px] flex items-center font-mono">
          <div className="flex items-start gap-2 text-xs text-rose-400 leading-relaxed">
            {hoverParamText ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1 inline-block animate-pulse" />
                <span className="break-words font-medium">{hoverParamText}</span>
              </>
            ) : (
              <span className="text-zinc-600 text-[11px]">
                Hover over any filter or parameter above to view its criteria description.
              </span>
            )}
          </div>
        </div>

        {/* ─── LIVE REAL-TIME EXTRACTION PROGRESS TRACKER ────────────────────────── */}
        {(scraping || progress > 0) && (
          <div className="p-4 bg-[#05070F] border border-blue-600/80 transition-all space-y-3 font-mono animate-in fade-in duration-150">
            
            {/* Header: Status, Percentage, Timer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {progress === 100 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                )}
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {progress === 100 ? 'Extraction Complete' : `Extracting ${maxResults} Target Profiles`}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span>00:{elapsedTime < 10 ? `0${elapsedTime}` : elapsedTime}s</span>
                </span>
                <span className="px-2 py-0.5 bg-blue-950/80 text-blue-300 border border-blue-700/60 text-xs font-bold">
                  {progress}%
                </span>
              </div>
            </div>

            {/* Glowing Multi-Color Progress Bar */}
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

            {/* Stage Text & Location */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-blue-300 font-medium truncate flex-1 pr-2">
                {progressStage}
              </span>
              <span className="text-zinc-500 shrink-0">
                {keyword} • {area}
              </span>
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
                <span>Extracting {maxResults} Leads ({progress}%)...</span>
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
