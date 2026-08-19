import React, { useState, useRef, useEffect } from 'react';
import { Layers, PhoneCall, PlusCircle, Mail, Download, Trash2, Edit2, Check, X, MapPin, Calendar, FileText, FileSpreadsheet, Loader2, ChevronDown } from 'lucide-react';
import { useLead } from '../../context/LeadContext';
import { DatasetService, LeadService } from '../../services/api';

const DatasetCard = ({ dataset, onOpenAppendModal }) => {
  const { loadDatasetQueue, updateDataset, deleteDataset, setIsCampaignModalOpen, setSelectedLeadIds, setCampaignDatasetLeads } = useLead();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(dataset.name);
  const [description, setDescription] = useState(dataset.description || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(false);

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveMeta = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateDataset(dataset._id, { name: name.trim(), description: description.trim() });
      setIsEditing(false);
    } catch (err) {
      // error handled in context
    } finally {
      setSaving(false);
    }
  };

  const handleBulkEmail = async () => {
    setLoadingEmails(true);
    try {
      // Strictly fetch leads belonging to THIS dataset
      const res = await LeadService.getLeads({ datasetId: dataset._id, limit: 2000 });
      const datasetLeads = res.data.data || [];
      
      // Filter leads with non-empty, valid email
      const validEmailLeads = datasetLeads.filter(l => l.email && typeof l.email === 'string' && l.email.trim().length > 3 && l.email.includes('@'));
      
      setSelectedLeadIds(validEmailLeads.map(l => l._id));
      setCampaignDatasetLeads(validEmailLeads);
      setIsCampaignModalOpen(true);
    } catch (err) {
      console.error('Error preparing dataset leads for bulk email:', err);
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const res = await DatasetService.exportDataset(dataset._id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_leads.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setShowExportMenu(false);
    } catch (err) {
      console.error('Export CSV error:', err);
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const res = await DatasetService.exportDatasetPdf(dataset._id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_dossier.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setShowExportMenu(false);
    } catch (err) {
      console.error('Export PDF error:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete dataset "${dataset.name}" and all its leads?`)) {
      setDeleting(true);
      await deleteDataset(dataset._id);
    }
  };

  const totalLeads = dataset.totalLeads || 0;
  const uncontacted = dataset.uncontactedCount || 0;
  const unreachable = dataset.unreachableCount || 0;
  const contacted = dataset.contactedCount || (totalLeads - uncontacted);
  const pipeline = dataset.pipelineCount || 0;

  const contactedPct = totalLeads > 0 ? Math.round((contacted / totalLeads) * 100) : 0;

  return (
    <div className="bg-[#0A0A0A] border border-[#262626] hover:border-zinc-500 transition-all p-5 flex flex-col justify-between space-y-4 relative group font-mono">
      
      {/* Top Header & Inline Editing */}
      <div>
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#1E1E1E]">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dataset Name"
                  className="w-full px-2.5 py-1.5 bg-black border border-blue-500 text-white text-xs font-bold focus:outline-none"
                  autoFocus
                />
                <textarea
                  rows="2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Campaign notes / description..."
                  className="w-full px-2.5 py-1.5 bg-black border border-zinc-700 text-zinc-300 text-xs focus:outline-none resize-none"
                />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveMeta}
                    disabled={saving}
                    className="px-3 py-1 bg-white text-black text-[11px] font-bold flex items-center gap-1 hover:bg-zinc-200 cursor-pointer"
                  >
                    <Check className="w-3 h-3" /> Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setName(dataset.name);
                      setDescription(dataset.description || '');
                      setIsEditing(false);
                    }}
                    className="px-3 py-1 bg-[#141414] text-zinc-400 text-[11px] flex items-center gap-1 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-none shrink-0" />
                  <h3 
                    onClick={() => setIsEditing(true)}
                    title="Click to rename"
                    className="text-sm font-bold text-white truncate hover:text-blue-400 cursor-pointer transition-colors"
                  >
                    {dataset.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white transition-opacity p-0.5"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>

                {dataset.description && (
                  <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {dataset.description}
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            title="Delete dataset"
            className="text-zinc-600 hover:text-rose-400 p-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Niche & Location Tags */}
        <div className="flex items-center gap-2 flex-wrap text-[11px] mt-3 text-zinc-400">
          <span className="px-2 py-0.5 bg-[#141414] border border-[#282828] text-zinc-300">
            {dataset.keyword}
          </span>
          <span className="px-2 py-0.5 bg-[#141414] border border-[#282828] text-zinc-400 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-zinc-500" />
            {dataset.area}
          </span>
          <span className="text-[10px] text-zinc-500 ml-auto flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            {new Date(dataset.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Lead Counts Breakdown */}
        <div className="grid grid-cols-4 gap-2 pt-3 text-center">
          <div className="p-2 bg-[#050505] border border-[#1C1C1C]">
            <div className="text-[10px] text-zinc-500 uppercase">Total</div>
            <div className="text-sm font-bold text-white mt-0.5">{totalLeads}</div>
          </div>
          <div className="p-2 bg-[#050505] border border-[#1C1C1C]">
            <div className="text-[10px] text-zinc-500 uppercase">Uncalled</div>
            <div className="text-sm font-bold text-blue-400 mt-0.5">{uncontacted}</div>
          </div>
          <div className="p-2 bg-[#050505] border border-[#1C1C1C]">
            <div className="text-[10px] text-zinc-500 uppercase">Unreachable</div>
            <div className="text-sm font-bold text-orange-400 mt-0.5">{unreachable}</div>
          </div>
          <div className="p-2 bg-[#050505] border border-[#1C1C1C]">
            <div className="text-[10px] text-zinc-500 uppercase">Pipeline</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">{pipeline}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
            <span>Outreach Progress</span>
            <span>{contactedPct}% Called</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-900 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300"
              style={{ width: `${contactedPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2-Row x 2-Col Equal-Sized Action Buttons Grid */}
      <div className="pt-3 border-t border-[#1C1C1C] grid grid-cols-2 gap-2.5">
        
        {/* Row 1, Col 1: Launch CRM */}
        <button
          type="button"
          onClick={() => loadDatasetQueue(dataset._id)}
          disabled={totalLeads === 0}
          title="Open Cold Calling Workstation with this dataset"
          className="w-full py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 transition-all shadow-md text-center"
        >
          <PhoneCall className="w-4 h-4 shrink-0" />
          <span>Launch CRM</span>
        </button>

        {/* Row 1, Col 2: Bulk Email Engine */}
        <button
          type="button"
          onClick={handleBulkEmail}
          disabled={totalLeads === 0 || loadingEmails}
          title="Select all dataset emails and open Proposal Campaign engine"
          className="w-full py-2.5 bg-[#141414] hover:bg-[#1E1E1E] text-purple-300 hover:text-white border border-[#2B2B2B] hover:border-purple-500 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 transition-all text-center"
        >
          {loadingEmails ? (
            <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
          ) : (
            <Mail className="w-4 h-4 text-purple-400 shrink-0" />
          )}
          <span>Bulk Email</span>
        </button>

        {/* Row 2, Col 1: Add Entries */}
        <button
          type="button"
          onClick={() => onOpenAppendModal && onOpenAppendModal(dataset)}
          title="Search more profiles to append to this dataset"
          className="w-full py-2.5 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-200 hover:text-white border border-[#2B2B2B] hover:border-blue-500 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all text-center"
        >
          <PlusCircle className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Add Entries</span>
        </button>

        {/* Row 2, Col 2: Export Dropdown */}
        <div className="relative w-full" ref={exportRef}>
          <button
            type="button"
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={totalLeads === 0 || exportingCsv || exportingPdf}
            title="Export Dataset as CSV or High-Graphic PDF"
            className="w-full py-2.5 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-200 hover:text-white border border-[#2B2B2B] hover:border-zinc-500 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-30 text-center"
          >
            {exportingCsv || exportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
            ) : (
              <Download className="w-4 h-4 shrink-0" />
            )}
            <span>Export</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 bottom-full mb-1 w-56 bg-[#0D0D0D] border border-zinc-700 shadow-2xl z-50 divide-y divide-[#1F1F1F] font-mono text-xs animate-in fade-in zoom-in-95 duration-100">
              
              {/* Option 1: CSV */}
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={exportingCsv}
                className="w-full px-3.5 py-2.5 text-left text-zinc-200 hover:bg-[#1A1A1A] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold">Export CSV Spreadsheet</div>
                  <div className="text-[10px] text-zinc-500">Raw tabular dataset (.csv)</div>
                </div>
              </button>

              {/* Option 2: High-Graphic PDF */}
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exportingPdf}
                className="w-full px-3.5 py-2.5 text-left text-zinc-200 hover:bg-[#1A1A1A] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <div className="font-bold">Export Graphic PDF Dossier</div>
                  <div className="text-[10px] text-zinc-500">Executive report &amp; profiles (.pdf)</div>
                </div>
              </button>

            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default DatasetCard;
