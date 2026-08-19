import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useLead } from '../../context/LeadContext';
import { EmailService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Send, Mail, Sliders, PlusCircle, HelpCircle, X, ShieldCheck, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

const EmailCampaignModal = () => {
  const { 
    isCampaignModalOpen, 
    setIsCampaignModalOpen, 
    selectedLeadIds, 
    campaignDatasetLeads,
    setActiveDeliveryReport, 
    setIsDeliveryReportOpen,
    setActiveView
  } = useLead();

  const { addToast } = useToast();

  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [sendDelayMs, setSendDelayMs] = useState(300);
  const [launching, setLaunching] = useState(false);
  const [hoverText, setHoverText] = useState('');
  const [showDelayReason, setShowDelayReason] = useState(false);

  useEffect(() => {
    if (isCampaignModalOpen) {
      setHoverText('');
      setShowDelayReason(false);
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

  // Determine eligible, unsent, and already contacted leads strictly from the active dataset leads
  const eligibleLeads = campaignDatasetLeads || [];
  const noEmailsInDataset = eligibleLeads.length === 0;

  const unsentLeads = eligibleLeads.filter(l => !l.emailSentCount || l.emailSentCount === 0);
  const alreadySentLeads = eligibleLeads.filter(l => l.emailSentCount && l.emailSentCount > 0);

  const allAlreadySent = !noEmailsInDataset && unsentLeads.length === 0 && alreadySentLeads.length > 0;
  const someAlreadySent = !noEmailsInDataset && unsentLeads.length > 0 && alreadySentLeads.length > 0;
  const noneAlreadySent = !noEmailsInDataset && alreadySentLeads.length === 0 && unsentLeads.length > 0;

  const handleTemplateChange = (id) => {
    setSelectedTemplateId(id);
    const tpl = templates.find(t => t._id === id);
    if (tpl) {
      setCustomSubject(tpl.subject);
    }
  };

  const handleLaunch = async (e) => {
    e.preventDefault();
    if (noEmailsInDataset) {
      addToast({ 
        title: 'No Registered Emails', 
        message: 'None of the businesses in this dataset have a registered email address.', 
        type: 'warning' 
      });
      return;
    }

    if (unsentLeads.length === 0) {
      addToast({ 
        title: 'No New Recipients', 
        message: 'All businesses in this dataset have already received proposals previously.', 
        type: 'warning' 
      });
      return;
    }

    // Only dispatch to the applicable/unsent leads!
    const targetLeadIds = unsentLeads.map(l => l._id);

    setLaunching(true);
    try {
      const res = await EmailService.launchCampaign({
        leadIds: targetLeadIds,
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
          message: `Campaign initiated for ${targetLeadIds.length} verified email recipients.`,
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
      <form onSubmit={handleLaunch} className="space-y-5 font-mono">
        
        {/* Scenario 0: NO EMAILS IN THIS DATASET */}
        {noEmailsInDataset && (
          <div 
            onMouseEnter={() => setHoverText('None of the businesses in this dataset have a registered email address. Proposals cannot be sent.')}
            onMouseLeave={() => setHoverText('')}
            className="p-4 bg-zinc-950 border border-zinc-800 flex items-start gap-3.5"
          >
            <AlertCircle className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <span>No Registered Emails in Dataset</span>
                <span className="px-2 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-700 text-[10px]">
                  0 Available
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                None of the businesses in this dataset currently have a registered email address listed. Extract email-enabled profiles or add email contacts to dispatch proposals.
              </p>
            </div>
          </div>
        )}

        {/* Scenario 1: ALL EMAILS SENT PREVIOUSLY (ALL == NA) */}
        {allAlreadySent && (
          <div 
            onMouseEnter={() => setHoverText('All businesses in this dataset have already received proposals. No duplicates will be sent.')}
            onMouseLeave={() => setHoverText('')}
            className="p-4 bg-zinc-950 border border-rose-900/60 flex items-start gap-3.5"
          >
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                <span>All Proposals Already Delivered</span>
                <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 text-[10px]">
                  {alreadySentLeads.length} / {alreadySentLeads.length} Contacted
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                All <strong className="text-white">{alreadySentLeads.length} businesses</strong> in this dataset have already received proposal emails in a previous run. To protect your domain reputation and avoid duplicate outreach, dispatch is locked.
              </p>
            </div>
          </div>
        )}

        {/* Scenario 2: SOME EMAILS SENT PREVIOUSLY (SOME == NA) */}
        {someAlreadySent && (
          <div 
            onMouseEnter={() => setHoverText(`Will dispatch only to the ${unsentLeads.length} new businesses. The ${alreadySentLeads.length} previously contacted businesses will be safely skipped.`)}
            onMouseLeave={() => setHoverText('')}
            className="p-4 bg-[#080808] border border-blue-900/60 flex items-start gap-3.5"
          >
            <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                  Partial Batch Qualification
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {unsentLeads.length} Applicable
                  </span>
                  <span className="px-2 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-700">
                    {alreadySentLeads.length} Skipped (Sent)
                  </span>
                </div>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                <strong className="text-zinc-200">{alreadySentLeads.length} business(es)</strong> already received proposals previously and will not be re-emailed. Proposals will only be sent to the <strong className="text-white">{unsentLeads.length} new applicable business(es)</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Scenario 3: NO EMAILS SENT (ALL FRESH) */}
        {noneAlreadySent && (
          <div 
            onMouseEnter={() => setHoverText(`All ${unsentLeads.length} businesses in this dataset are fresh and ready for proposal delivery.`)}
            onMouseLeave={() => setHoverText('')}
            className="p-4 bg-[#050505] border border-[#222222] flex items-center justify-between cursor-pointer hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-950/40 border border-blue-800/60 flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white uppercase">
                  Target Dataset Email Recipients
                </div>
                <div className="text-xs text-zinc-400">
                  <span className="text-white font-semibold">{unsentLeads.length} businesses</span> ready for proposal delivery
                </div>
              </div>
            </div>

            <span className="text-xs px-2.5 py-1 bg-blue-950/40 text-blue-300 border border-blue-800/60 font-bold">
              {unsentLeads.length} Recipients
            </span>
          </div>
        )}

        {/* Template Selector with Create New Link */}
        <div
          onMouseEnter={() => setHoverText('Choose an existing proposal template or create a new template.')}
          onMouseLeave={() => setHoverText('')}
        >
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-zinc-300 uppercase">
              Select Proposal Template
            </label>
            <button
              type="button"
              onMouseEnter={() => setHoverText('Opens the Visual Proposal Builder to create a new custom HTML proposal.')}
              onMouseLeave={() => setHoverText('')}
              onClick={() => {
                setIsCampaignModalOpen(false);
                if (setActiveView) setActiveView('email');
              }}
              className="text-xs text-blue-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create New Template</span>
            </button>
          </div>
          <select
            value={selectedTemplateId}
            onChange={(e) => {
              if (e.target.value === '__new__') {
                setIsCampaignModalOpen(false);
                if (setActiveView) setActiveView('email');
              } else {
                handleTemplateChange(e.target.value);
              }
            }}
            disabled={noEmailsInDataset || allAlreadySent}
            className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#2B2B2B] text-white text-xs focus:outline-none focus:border-white cursor-pointer font-bold disabled:opacity-40"
          >
            {templates.map(t => (
              <option key={t._id} value={t._id}>
                {t.name} ({t.category})
              </option>
            ))}
            <option value="__new__">+ Create New Proposal Template...</option>
          </select>
        </div>

        {/* Customized Subject Line */}
        <div
          onMouseEnter={() => setHoverText('Personalized subject line — supports dynamic merge tags like {{businessName}} and {{area}}.')}
          onMouseLeave={() => setHoverText('')}
        >
          <label className="block text-xs font-bold text-zinc-300 uppercase mb-2">
            Subject Line (Supports Merge Tags)
          </label>
          <input
            type="text"
            value={customSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            disabled={noEmailsInDataset || allAlreadySent}
            placeholder="Subject line with {{businessName}}..."
            className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#2B2B2B] text-white text-xs focus:outline-none focus:border-white disabled:opacity-40"
          />
        </div>

        {/* Rate Limiter Slider with Info Help Popover */}
        <div 
          onMouseEnter={() => setHoverText(`Controls dispatch delay (${sendDelayMs === 0 ? '0 ms' : sendDelayMs + 'ms'}) between outgoing emails to optimize delivery reputation.`)}
          onMouseLeave={() => setHoverText('')}
          className="p-3.5 bg-[#000000] border border-[#222222] space-y-2.5"
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Sliders className="w-3.5 h-3.5 text-zinc-500" />
              <span>Rate-Limiter Dispatch Delay:</span>
              <button
                type="button"
                onClick={() => setShowDelayReason(!showDelayReason)}
                title="Why is there a delay between emails?"
                className="p-0.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="font-bold text-white bg-[#141414] px-2 py-0.5 border border-[#333]">
              {sendDelayMs === 0 ? '0 ms (Instant)' : `${sendDelayMs} ms per email`}
            </span>
          </div>

          {/* Interactive Humanized Explanation Box */}
          {showDelayReason && (
            <div className="p-3 bg-[#080808] border border-blue-600/60 text-xs space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-white font-bold">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <ShieldCheck className="w-3.5 h-3.5" /> Why use email pacing?
                </span>
                <button
                  type="button"
                  onClick={() => setShowDelayReason(false)}
                  className="text-zinc-500 hover:text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                A brief pause between outgoing messages prevents receiving servers (like Gmail and Outlook) from flagging your domain as automated spam, ensuring your proposals land directly in the client's <strong className="text-white">Primary Inbox</strong> rather than the Spam folder.
              </p>
            </div>
          )}

          <input
            type="range"
            min="0"
            max="1500"
            step="50"
            disabled={noEmailsInDataset || allAlreadySent}
            value={sendDelayMs}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setSendDelayMs(val);
              setHoverText(`Controls dispatch delay (${val === 0 ? '0 ms' : val + 'ms'}) between outgoing emails to optimize delivery reputation.`);
            }}
            className="w-full accent-blue-500 bg-zinc-800 cursor-pointer h-1.5 disabled:opacity-40"
          />
        </div>

        {/* Dynamic Red Guidance Box */}
        <div className="p-3 bg-[#040404] border border-[#1E1E1E] min-h-[44px] flex items-center">
          <div className="flex items-start gap-2 text-xs text-rose-400 leading-relaxed">
            {hoverText ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1 inline-block animate-pulse" />
                <span className="break-words font-medium">{hoverText}</span>
              </>
            ) : (
              <span className="text-zinc-600 text-[11px]">
                {noEmailsInDataset 
                  ? 'No businesses in this dataset have registered email addresses.'
                  : allAlreadySent 
                    ? 'All businesses in this dataset have already received proposals. Dispatch locked.'
                    : 'Hover over any campaign parameter above to view its configuration details.'}
              </span>
            )}
          </div>
        </div>

        {/* Equal-Sized Bottom Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1C1C1C]">
          <button
            type="button"
            onClick={() => setIsCampaignModalOpen(false)}
            className="w-full sm:w-48 py-2.5 bg-[#121212] hover:bg-[#1A1A1A] text-zinc-300 hover:text-white border border-[#2B2B2B] text-xs font-bold uppercase tracking-wider text-center cursor-pointer transition-colors"
          >
            CANCEL
          </button>

          {noEmailsInDataset ? (
            <button
              type="button"
              disabled={true}
              title="No businesses in this dataset have registered emails."
              className="w-full sm:w-64 py-2.5 bg-zinc-900 text-zinc-500 border border-zinc-800 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-not-allowed text-center"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>NO REGISTERED EMAILS</span>
            </button>
          ) : allAlreadySent ? (
            <button
              type="button"
              disabled={true}
              title="All businesses in this dataset have already received proposals previously."
              className="w-full sm:w-64 py-2.5 bg-zinc-900 text-zinc-500 border border-zinc-800 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-not-allowed text-center"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>PROPOSALS ALREADY SENT</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={launching || unsentLeads.length === 0}
              className="w-full sm:w-64 py-2.5 bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shadow-lg transition-all text-center"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {launching 
                  ? 'LAUNCHING...' 
                  : someAlreadySent 
                    ? `LAUNCH CAMPAIGN (${unsentLeads.length} NEW)` 
                    : 'LAUNCH CAMPAIGN'}
              </span>
            </button>
          )}
        </div>

      </form>
    </Modal>
  );
};

export default EmailCampaignModal;
