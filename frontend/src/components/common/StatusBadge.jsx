import React from 'react';

const StatusBadge = ({ status = 'Uncontacted', className = '', size = 'md' }) => {
  const styles = {
    'Uncontacted': 'bg-zinc-900/80 text-zinc-400 border-zinc-800',
    'IVR': 'bg-purple-950/40 text-purple-400 border-purple-800/60',
    'Receptionist': 'bg-amber-950/40 text-amber-400 border-amber-800/60',
    'Do Not Call': 'bg-rose-950/40 text-rose-400 border-rose-800/60',
    'Shows Interest': 'bg-blue-950/40 text-blue-400 border-blue-800/60',
    'Follow Up': 'bg-yellow-950/40 text-yellow-300 border-yellow-800/60',
    'Lead / Sale': 'bg-emerald-950/50 text-emerald-300 border-emerald-500/80 font-bold border-glow-green'
  };

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  const currentStyle = styles[status] || styles['Uncontacted'];
  const currentSize = sizeClasses[size] || sizeClasses.md;

  return (
    <span className={`inline-flex items-center gap-1.5 uppercase font-mono tracking-wider border rounded-none ${currentStyle} ${currentSize} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 shrink-0" />
      {status}
    </span>
  );
};

export default StatusBadge;
