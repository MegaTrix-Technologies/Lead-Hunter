import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useLead } from '../../context/LeadContext';
import { EmailService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Send, AlertTriangle, ShieldCheck, Mail, Sliders, CheckCircle2 } from 'lucide-react';

const EmailCampaignModal = () => {
  const { 
    isCampaignModalOpen, 
    setIsCampaignModalOpen, 
    selectedLeadIds, 
    leads, 
    setActiveDeliveryReport, 
    setIsDeliveryReportOpen 
  } = useLead();

  const { addToast } = useToast();

  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [sendDelayMs, setSendDelayMs] = useState(300);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (isCampaignModalOpen) {
      EmailService.getTemplates()
        .then(res => {
          if (res.data.success && res.data.data.length > 0) {
            setTemplates(res.data.data);
            setSelectedTemplateId(res.data.data[0]._id);
            setCustomSubject(res.data.data[0].subject);
          }
        })
        .catch(err => console.error(err));
    }
  }, [isCampaignModalOpen]);

  const handleTemplateChange = (id) => {
    setSelectedTemplateId(id);
    const tpl = templates.find(t => t._id === id);
    if (tpl) {
      setCustomSubject(tpl.subject);
    }
  };

  const handleLaunch = async (e) => {
    e.preventDefault();
    if (selectedLeadIds.length === 0) {
      addToast({ title: 'No Leads Selected', message: 'Please select at least one lead.', type: 'warning' });
      return;
    }

    setLaunching(true);
    try {
      const res = await EmailService.launchCampaign({
        leadIds: selectedLeadIds,
        templateId: selectedTemplateId,
        customSubject,
        sendDelayMs
      });

      if (res.data.success) {
        setIsCampaignModalOpen(false);
        setActiveDeliveryReport(res.data.data);
        setIsDeliveryReportOpen(true);
        addToast({
          title: 'Proposal Queue Active',
          message: `Campaign initiated for ${selectedLeadIds.length} profiles.`,
          type: 'success'
        });
      }
    } catch (error) {
      addToast({
        title: 'Launch Failed',
        message: error.response?.data?.message || error.message,
        type: 'error'
      });
    } finally {
      setLaunching(false);
    }
  };

  return (
    <Modal
      isOpen={isCampaignModalOpen}
      onClose={() => setIsCampaignModalOpen(false)}
      title="Launch Bulk Email Proposal Campaign"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleLaunch} className="space-y-6">
        
        {/* Campaign Target Overview */}
        <div className="p-4 bg-[#050505] border border-[#222222] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-950/40 border border-blue-800/60 flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-white font-mono uppercase">
                Target Dataset Size
              </div>
              <div className="text-xs text-zinc-400 font-mono">
                <span className="text-white font-semibold">{selectedLeadIds.length} leads</span> queued for personalized proposal delivery
              </div>
            </div>
          </div>

          <span className="text-xs font-mono px-2.5 py-1 bg-blue-950/40 text-blue-300 border border-blue-800/60 font-semibold">
            {selectedLeadIds.length} Recipients
          </span>
        </div>

        {/* Safety Cap & Duplicate Rule Alert */}
        <div className="p-4 bg-amber-950/20 border border-amber-800/50 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs font-mono space-y-1">
            <div className="font-bold text-amber-300 uppercase">
              MegaTrix Safety Cap Guard Active
            </div>
            <p className="text-zinc-300 leading-relaxed text-[11px]">
              Any profile with <span className="text-amber-400 font-bold">emailSentCount &gt;= 3</span> will be automatically blocked and skipped by the queue worker to protect sender reputation and prevent spam fatigue.
            </p>
          </div>
        </div>

        {/* Template Selector */}
        <div>
          <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">
            Select Proposal Template
          </label>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#2B2B2B] text-white font-mono text-xs focus:outline-none focus:border-white cursor-pointer"
          >
            {templates.map(t => (
              <option key={t._id} value={t._id}>
                {t.name} ({t.category})
              </option>
            ))}
          </select>
        </div>

        {/* Customized Subject Line */}
        <div>
          <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">
            Subject Line (Supports Merge Tags)
          </label>
          <input
            type="text"
            value={customSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            placeholder="Subject line with {{businessName}}..."
            className="w-full px-3.5 py-2 bg-[#000000] border border-[#2B2B2B] text-white font-mono text-xs focus:outline-none focus:border-white"
          />
        </div>

        {/* Rate Limiter Slider */}
        <div className="p-3.5 bg-[#000000] border border-[#222222] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-zinc-500" />
              Rate-Limiter Dispatch Delay:
            </span>
            <span className="font-bold text-white bg-[#141414] px-2 py-0.5 border border-[#333]">
              {sendDelayMs} ms per email
            </span>
          </div>
          <input
            type="range"
            min="100"
            max="1500"
            step="50"
            value={sendDelayMs}
            onChange={(e) => setSendDelayMs(parseInt(e.target.value, 10))}
            className="w-full accent-blue-500 bg-zinc-800 cursor-pointer h-1.5"
          />
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#222222]">
          <button
            type="button"
            onClick={() => setIsCampaignModalOpen(false)}
            className="px-4 py-2 border border-[#2B2B2B] bg-[#101010] text-zinc-300 hover:text-white font-mono text-xs cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={launching || selectedLeadIds.length === 0}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40"
          >
            {launching ? (
              <span>Initializing Worker Queue...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Start Batch Dispatch</span>
              </>
            )}
          </button>
        </div>

      </form>
    </Modal>
  );
};

export default EmailCampaignModal;
