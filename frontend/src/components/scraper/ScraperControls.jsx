import React, { useState } from 'react';
import { Search, Sliders, Globe, Calendar, Star, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import { useLead } from '../../context/LeadContext';

const ScraperControls = () => {
  const { executeScrape, scraping } = useLead();

  const [keyword, setKeyword] = useState('Roofing');
  const [area, setArea] = useState('Miami, FL');
  const [noWebsiteOnly, setNoWebsiteOnly] = useState(false);
  const [recentlyRegistered, setRecentlyRegistered] = useState(false);
  const [maxRating, setMaxRating] = useState(3.5);
  const [strictSearch, setStrictSearch] = useState(true);

  const popularNiches = ['Roofing', 'Dentists', 'Remodeling', 'Plumbing', 'Solar', 'HVAC', 'Legal', 'Pool Builder'];
  const popularAreas = ['Miami, FL', 'Austin, TX', 'Chicago, IL', 'Houston, TX', 'Denver, CO', 'Phoenix, AZ', 'Seattle, WA', 'Atlanta, GA'];

  const handleSubmit = (e) => {
    e.preventDefault();
    executeScrape({
      keyword,
      area,
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#1E1E1E]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 inline-block" />
            <h2 className="text-base font-bold text-white font-mono tracking-wide uppercase">
              GMB Scraping & Extraction Engine
            </h2>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Target local B2B Google Business profiles with multi-parameter criteria & terminal deduplication.
          </p>
        </div>

        {/* Live Filter Mode Indicator */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-zinc-500">Search Mode:</span>
          <span className={`px-2 py-0.5 border ${
            strictSearch 
              ? 'border-blue-500/80 bg-blue-950/40 text-blue-400 font-semibold' 
              : 'border-amber-500/60 bg-amber-950/30 text-amber-300'
          }`}>
            {strictSearch ? 'STRICT (100% MATCH)' : 'RELAXED (ADAPTIVE)'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        
        {/* Main Inputs: Keyword & Area */}
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
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. Dentists, Roofing, Construction, Remodeling..."
                className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#2B2B2B] focus:border-white focus:outline-none text-white text-sm font-mono placeholder-zinc-600 transition-colors"
              />
            </div>
            {/* Quick Niche Pills */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[10px] text-zinc-500 font-mono">Niche:</span>
              {popularNiches.map(n => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setKeyword(n)}
                  className={`text-[11px] font-mono px-2 py-0.5 border transition-all cursor-pointer ${
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

          {/* Area / Geographic Destination */}
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Area / Location Destination <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Miami, FL or Austin, TX or London, UK..."
                className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#2B2B2B] focus:border-white focus:outline-none text-white text-sm font-mono placeholder-zinc-600 transition-colors"
              />
            </div>
            {/* Quick Area Pills */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[10px] text-zinc-500 font-mono">City:</span>
              {popularAreas.slice(0, 5).map(a => (
                <button
                  type="button"
                  key={a}
                  onClick={() => setArea(a)}
                  className={`text-[11px] font-mono px-2 py-0.5 border transition-all cursor-pointer ${
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

        {/* Multi-Parameter Advanced Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4 border-t border-[#1C1C1C]">
          
          {/* Toggle: No Website Only */}
          <div 
            onClick={() => setNoWebsiteOnly(!noWebsiteOnly)}
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
            onClick={() => setRecentlyRegistered(!recentlyRegistered)}
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

          {/* Slider/Dropdown: Max Rating Upper Bound */}
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
              value={maxRating}
              onChange={(e) => setMaxRating(parseFloat(e.target.value))}
              className="w-full accent-amber-400 bg-zinc-800 cursor-pointer h-1.5"
            />
          </div>

          {/* Toggle: Strict Search */}
          <div 
            onClick={() => setStrictSearch(!strictSearch)}
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

        {/* Action Button & Extraction Scanner */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs font-mono text-zinc-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Terminal statuses (IVR, Receptionist, DNC, Interest, Follow-up, Sold) automatically excluded.</span>
          </div>

          <button
            type="submit"
            disabled={scraping}
            className="w-full sm:w-auto px-8 py-3 bg-white text-black font-mono font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer border border-white"
          >
            {scraping ? (
              <>
                <Zap className="w-4 h-4 text-blue-600 animate-spin" />
                <span>Extracting GMB Profiles...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 text-black" />
                <span>Execute GMB Extraction</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default ScraperControls;
