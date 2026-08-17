import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const ClipboardButton = ({ text, label, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy ${label || text} to clipboard`}
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono rounded-none border border-[#262626] bg-[#0A0A0A] hover:bg-[#1A1A1A] hover:border-white/40 text-zinc-300 hover:text-white transition-all cursor-pointer ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400 text-[11px] font-medium">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3 text-zinc-400" />
          {label && <span className="text-[11px] truncate max-w-[150px]">{label}</span>}
        </>
      )}
    </button>
  );
};

export default ClipboardButton;
