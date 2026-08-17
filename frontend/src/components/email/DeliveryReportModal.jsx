import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useLead } from '../../context/LeadContext';
import { EmailService } from '../../services/api';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Download, 
  Clock, 
  Mail, 
  RefreshCw,
  Activity
} from 'lucide-react';

const DeliveryReportModal = () => {
  const { 
    isDeliveryReportOpen, 
    setIsDeliveryReportOpen, 
    activeDeliveryReport, 
    setActiveDeliveryReport,
    fetchLeads 
  } = useLead();

  const [polling, setPolling] = useState(false);

  // Poll for live campaign status updates
  useEffect(() => {
    let interval = null;
    if (isDeliveryReportOpen) {
      interval = setInterval(async () => {
        try {
          const res = await EmailService.getActiveReport();
          if (res.data.success && res.data.data) {
            setActiveDeliveryReport(res.data.data);
            if (res.data.data.completed) {
              clearInterval(interval);
              fetchLeads();
            }
          }
        } catch (err) {
          console.error('Error polling delivery report:', err);
        }
      }, 800);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDeliveryReportOpen, setActiveDeliveryReport, fetchLeads]);

  if (!activeDeliveryReport) return null;

  const { 
    totalQueued = 0, 
    successfullySent = 0, 
    droppedBounced = 0, 
    spamFiltered = 0, 
    invalidEmailAddresses = 0, 
    safetyCappedBlocked = 0,
    logs = [],
    completed = false
  } = activeDeliveryReport;

  const processedCount = successfullySent + droppedBounced + spamFiltered + invalidEmailAddresses + safetyCappedBlocked;
  const progressPercent = totalQueued > 0 ? Math.min(100, Math.round((processedCount / totalQueued) * 100)) : 100;

  const handleExportReport = () => {
    const csvRows = [
      ['Index', 'Business Name', 'Email', 'Status', 'Details / Reason', 'Timestamp'],
      ...logs.map(l => [
        l.index,
        `"${(l.businessName || '').replace(/"/g, '""')}"`,
        `"${l.email || ''}"`,
        l.status,
        `"${(l.reason || l.subject || '').replace(/"/g, '""')}"`,
        l.timestamp ? new Date(l.timestamp).toISOString() : ''
      ])
    ];

    const csvContent = csvRows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `megatrix_campaign_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      isOpen={isDeliveryReportOpen}
      onClose={() => setIsDeliveryReportOpen(false)}
      title="Live Email Proposal Execution Report"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        
        {/* Progress Bar & Status Header */}
        <div className="p-4 bg-[#050505] border border-[#222222] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${completed ? 'text-emerald-400' : 'text-blue-400 animate-pulse'}`} />
              <span className="text-white font-bold uppercase">
                {completed ? 'Campaign Completed' : 'Queue Processing In Real-Time...'}
              </span>
            </div>
            <span className="text-zinc-400 font-bold">{progressPercent}% ({processedCount}/{totalQueued})</span>
          </div>

          {/* Track */}
          <div className="w-full h-2.5 bg-[#141414] border border-[#2B2B2B] overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                completed ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-blue-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Real-time 5-Metric Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          
          {/* Total Queued */}
          <div className="p-3 bg-[#0A0A0A] border border-[#262626] flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Total Queued</span>
            <span className="text-lg font-bold text-white font-mono mt-1">{totalQueued}</span>
          </div>

          {/* Successfully Sent */}
          <div className="p-3 bg-emerald-950/20 border border-emerald-800/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-emerald-400 uppercase">Sent</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-lg font-bold text-emerald-300 font-mono mt-1">{successfullySent}</span>
          </div>

          {/* Dropped / Bounced */}
          <div className="p-3 bg-rose-950/20 border border-rose-800/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-rose-400 uppercase">Bounced</span>
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <span className="text-lg font-bold text-rose-300 font-mono mt-1">{droppedBounced}</span>
          </div>

          {/* Spam Filtered */}
          <div className="p-3 bg-amber-950/20 border border-amber-800/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-amber-400 uppercase">Spam Block</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-lg font-bold text-amber-300 font-mono mt-1">{spamFiltered}</span>
          </div>

          {/* Invalid Email */}
          <div className="p-3 bg-zinc-900 border border-zinc-700 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Invalid Mail</span>
            <span className="text-lg font-bold text-zinc-300 font-mono mt-1">{invalidEmailAddresses}</span>
          </div>

          {/* Safety Capped */}
          <div className="p-3 bg-blue-950/20 border border-blue-800/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-blue-400 uppercase">Safety Cap</span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span className="text-lg font-bold text-blue-300 font-mono mt-1">{safetyCappedBlocked}</span>
          </div>

        </div>

        {/* Live Execution Activity Stream */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              Live Activity Stream ({logs.length} events)
            </h4>
            {completed && (
              <button
                type="button"
                onClick={handleExportReport}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-300 hover:text-white border border-[#2B2B2B] text-xs font-mono cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV Report</span>
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-[#1A1A1A] border border-[#222222] bg-[#000000] font-mono text-xs">
            {logs.length === 0 ? (
              <div className="p-4 text-center text-zinc-600">Waiting for first queue event...</div>
            ) : (
              logs.slice().reverse().map((log, i) => {
                const badgeStyles = {
                  sent: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50',
                  bounced: 'bg-rose-950/40 text-rose-400 border-rose-800/50',
                  spam: 'bg-amber-950/40 text-amber-400 border-amber-800/50',
                  invalid: 'bg-zinc-800 text-zinc-400 border-zinc-700',
                  blocked: 'bg-blue-950/40 text-blue-300 border-blue-800/60 font-semibold'
                };

                return (
                  <div key={i} className="p-3 flex items-start justify-between gap-3 hover:bg-[#080808]">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-600 font-bold">#{log.index}</span>
                        <span className="text-white font-semibold truncate">{log.businessName}</span>
                        <span className="text-zinc-500 text-[11px]">({log.email || 'NO_EMAIL'})</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 truncate max-w-xl">
                        {log.reason || log.subject}
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 border text-[10px] uppercase font-bold shrink-0 ${badgeStyles[log.status] || badgeStyles.sent}`}>
                      {log.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Close Button */}
        <div className="flex items-center justify-end pt-4 border-t border-[#222222]">
          <button
            type="button"
            onClick={() => setIsDeliveryReportOpen(false)}
            className="px-6 py-2 bg-white text-black hover:bg-zinc-200 border border-white font-mono text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            {completed ? 'Close Report' : 'Dismiss to Background'}
          </button>
        </div>

      </div>
    </Modal>
  );
};

export default DeliveryReportModal;
