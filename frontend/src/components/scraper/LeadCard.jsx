import React from 'react';
import { Globe, Phone, Mail, MapPin, ExternalLink, Calendar, Send, PhoneCall } from 'lucide-react';
import RatingStars from '../common/RatingStars';
import StatusBadge from '../common/StatusBadge';
import ClipboardButton from '../common/ClipboardButton';
import { useLead } from '../../context/LeadContext';

const LeadCard = ({ lead, isSelected, onToggleSelect }) => {
  const { setActiveView, setCallingQueue, setActiveQueueIndex, setIsCampaignModalOpen, setSelectedLeadIds } = useLead();

  const handleLaunchDialer = (e) => {
    e.stopPropagation();
    setCallingQueue([lead]);
    setActiveQueueIndex(0);
    setActiveView('workstation');
  };

  const handleSendProposal = (e) => {
    e.stopPropagation();
    setSelectedLeadIds([lead._id]);
    setIsCampaignModalOpen(true);
  };

  const isRecentlyRegistered = () => {
    if (!lead.registeredDate) return false;
    const ninetyDaysAgo = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000));
    return new Date(lead.registeredDate) >= ninetyDaysAgo;
  };

  return (
    <div className={`relative flex flex-col justify-between p-5 bg-[#0A0A0A] border transition-all duration-200 hover:border-zinc-500 group ${
      isSelected ? 'border-blue-500 bg-[#0E0E12] border-glow' : 'border-[#262626]'
    }`}>
      
      {/* Top Meta Bar */}
      <div>
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#1E1E1E]">
          <div className="flex items-center gap-3">
            {/* Selection Checkbox */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect && onToggleSelect(lead._id)}
              className="w-4 h-4 accent-blue-500 bg-black border-[#333333] cursor-pointer"
            />
            
            {/* Avatar / Thumbnail */}
            <div className="relative w-10 h-10 bg-[#161616] border border-[#2B2B2B] shrink-0 flex items-center justify-center overflow-hidden">
              {lead.avatarUrl ? (
                <img 
                  src={lead.avatarUrl} 
                  alt={lead.businessName} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&auto=format&fit=crop&q=60';
                  }}
                />
              ) : (
                <span className="font-mono text-xs font-bold text-zinc-400">
                  {lead.businessName.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {/* Business Title & Niche */}
            <div>
              <h4 className="text-sm font-semibold text-white font-mono tracking-tight group-hover:text-blue-400 transition-colors line-clamp-1">
                {lead.businessName}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-mono text-zinc-400">
                  {lead.category}
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-[11px] font-mono text-zinc-500 truncate max-w-[140px]">
                  {lead.area}
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <StatusBadge status={lead.callStatus} size="sm" />
        </div>

        {/* Core Metrics & Contacts Grid */}
        <div className="py-3.5 space-y-2.5">
          {/* Social Proof (Star Rating) & Website Pill */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <RatingStars rating={lead.rating} reviewCount={lead.reviewCount} />

            {/* Digital Footprint Badge */}
            {lead.website ? (
              <a
                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono text-blue-400 bg-blue-950/30 border border-blue-800/50 hover:bg-blue-900/40 hover:text-white transition-colors"
              >
                <Globe className="w-3 h-3" />
                <span>Website</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </a>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono text-amber-400/90 bg-amber-950/20 border border-amber-800/40">
                <Globe className="w-3 h-3 text-amber-500" />
                <span>No Website</span>
              </span>
            )}
          </div>

          {/* Phone Number */}
          <div className="flex items-center justify-between gap-2 text-xs font-mono bg-[#050505] p-2 border border-[#1A1A1A]">
            <div className="flex items-center gap-2 text-zinc-300 truncate">
              <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="truncate">{lead.phoneNumber || 'No phone listed'}</span>
            </div>
            {lead.phoneNumber && (
              <ClipboardButton text={lead.phoneNumber} label="" />
            )}
          </div>

          {/* Email Address */}
          <div className="flex items-center justify-between gap-2 text-xs font-mono bg-[#050505] p-2 border border-[#1A1A1A]">
            <div className="flex items-center gap-2 text-zinc-300 truncate">
              <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="truncate">{lead.email || 'No direct email'}</span>
            </div>
            {lead.email && (
              <ClipboardButton text={lead.email} label="" />
            )}
          </div>

          {/* Address Line */}
          {lead.address && (
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono truncate pt-0.5">
              <MapPin className="w-3 h-3 text-zinc-600 shrink-0" />
              <span className="truncate">{lead.address}</span>
            </div>
          )}

          {/* Recently Registered Pill */}
          {isRecentlyRegistered() && (
            <div className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/30 px-2 py-0.5 border border-emerald-800/40">
              <Calendar className="w-3 h-3" />
              <span>Registered &lt; 90 Days</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="flex items-center gap-2 pt-3 border-t border-[#1E1E1E] mt-1">
        <button
          type="button"
          onClick={handleLaunchDialer}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono font-medium text-white bg-[#141414] border border-[#2B2B2B] hover:bg-white hover:text-black hover:border-white transition-all cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open in CRM</span>
        </button>

        <button
          type="button"
          onClick={handleSendProposal}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono font-medium text-blue-400 bg-blue-950/20 border border-blue-800/50 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Email</span>
        </button>
      </div>

    </div>
  );
};

export default LeadCard;
