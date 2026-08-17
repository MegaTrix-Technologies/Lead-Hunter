import React, { useState, useEffect } from 'react';
import { EmailService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Mail, Plus, Trash2, Check, Eye, Code, Sparkles, Tag, Save } from 'lucide-react';

const EmailTemplateEditor = () => {
  const { addToast } = useToast();
  
  const [templates, setTemplates] = useState([]);
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [category, setCategory] = useState('General');
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'code' | 'preview'
  const [saving, setSaving] = useState(false);

  const mergeTags = [
    { tag: '{{businessName}}', desc: 'Company / Business Name' },
    { tag: '{{phone}}', desc: 'Direct Phone Number' },
    { tag: '{{rating}}', desc: '⭐ Rating & Review Count' },
    { tag: '{{area}}', desc: 'City / Geographic Area' },
    { tag: '{{category}}', desc: 'Niche / Industry' },
    { tag: '{{website}}', desc: 'Website Link / Status' }
  ];

  // Dummy lead for preview interpolation
  const sampleLead = {
    businessName: 'Apex Roofing & Restoration',
    phoneNumber: '+1 (305) 555-0142',
    rating: '⭐ 3.2 (48 reviews)',
    area: 'Miami, FL',
    category: 'Roofing Specialist',
    website: 'https://www.apexroofingmiami.com'
  };

  const renderPreview = (content) => {
    if (!content) return '';
    return content
      .replace(/{{\s*businessName\s*}}/gi, sampleLead.businessName)
      .replace(/{{\s*phone\s*}}/gi, sampleLead.phoneNumber)
      .replace(/{{\s*rating\s*}}/gi, sampleLead.rating)
      .replace(/{{\s*area\s*}}/gi, sampleLead.area)
      .replace(/{{\s*category\s*}}/gi, sampleLead.category)
      .replace(/{{\s*website\s*}}/gi, sampleLead.website);
  };

  const fetchTemplates = async () => {
    try {
      const res = await EmailService.getTemplates();
      if (res.data.success) {
        setTemplates(res.data.data);
        if (res.data.data.length > 0 && !activeTemplateId) {
          loadTemplate(res.data.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const loadTemplate = (tpl) => {
    setActiveTemplateId(tpl._id);
    setName(tpl.name || '');
    setSubject(tpl.subject || '');
    setBodyHtml(tpl.bodyHtml || '');
    setCategory(tpl.category || 'General');
  };

  const handleNewTemplate = () => {
    setActiveTemplateId(null);
    setName('New Growth Proposal Template');
    setSubject('Exclusive Growth Strategy for {{businessName}} in {{area}}');
    setBodyHtml(`<div style="font-family: Arial, sans-serif; background-color: #0d0d0d; color: #f4f4f5; padding: 24px; border-radius: 8px; border: 1px solid #27272a;">
  <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">MegaTrix Digital Growth Audit</h2>
  <p>Hi team at <strong>{{businessName}}</strong>,</p>
  <p>We recently analyzed local search rankings for <strong>{{category}}</strong> in <strong>{{area}}</strong> and noticed an immediate opportunity.</p>
  <div style="background-color: #18181b; padding: 16px; border-left: 3px solid #3b82f6; margin: 16px 0;">
    <p style="margin: 0; color: #a1a1aa; font-size: 14px;"><strong>Target Profile:</strong> {{businessName}}</p>
    <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 14px;"><strong>Reputation Score:</strong> {{rating}}</p>
    <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 14px;"><strong>Digital Footprint:</strong> {{website}}</p>
  </div>
  <p>Would you have 5 minutes this week for a brief walkthrough?</p>
  <p style="margin-top: 24px;">Best regards,<br/><strong>MegaTrix Growth Team</strong></p>
</div>`);
    setCategory('Custom');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !subject || !bodyHtml) {
      addToast({ title: 'Validation Error', message: 'Name, subject and body HTML are required.', type: 'warning' });
      return;
    }

    setSaving(true);
    try {
      if (activeTemplateId) {
        const res = await EmailService.updateTemplate(activeTemplateId, { name, subject, bodyHtml, category });
        if (res.data.success) {
          addToast({ title: 'Template Saved', message: `Updated "${name}" successfully.`, type: 'success' });
          fetchTemplates();
        }
      } else {
        const res = await EmailService.createTemplate({ name, subject, bodyHtml, category });
        if (res.data.success) {
          setActiveTemplateId(res.data.data._id);
          addToast({ title: 'Template Created', message: `Created "${name}" successfully.`, type: 'success' });
          fetchTemplates();
        }
      }
    } catch (error) {
      addToast({ title: 'Save Failed', message: error.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this proposal template?')) return;
    try {
      await EmailService.deleteTemplate(id);
      addToast({ title: 'Template Deleted', message: 'Template was removed.', type: 'info' });
      fetchTemplates();
      if (activeTemplateId === id) {
        handleNewTemplate();
      }
    } catch (error) {
      addToast({ title: 'Delete Failed', message: error.message, type: 'error' });
    }
  };

  const insertTag = (tag) => {
    setBodyHtml(prev => prev + ` ${tag}`);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      
      {/* ─── LEFT: Saved Templates List ────────────────────────────────────── */}
      <div className="w-full lg:w-[320px] shrink-0 bg-[#0A0A0A] border border-[#262626] flex flex-col h-[780px]">
        <div className="p-4 border-b border-[#222222] bg-[#0E0E0E] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              Templates ({templates.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={handleNewTemplate}
            className="p-1.5 bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer"
            title="Create New Template"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#1A1A1A]">
          {templates.map(tpl => {
            const isCurrent = activeTemplateId === tpl._id;
            return (
              <div
                key={tpl._id}
                onClick={() => loadTemplate(tpl)}
                className={`p-3.5 cursor-pointer transition-all flex items-start justify-between gap-2 ${
                  isCurrent ? 'bg-[#15151A] border-l-4 border-l-blue-500' : 'hover:bg-[#0E0E0E]'
                }`}
              >
                <div className="min-w-0">
                  <h4 className={`text-xs font-mono font-semibold truncate ${isCurrent ? 'text-white' : 'text-zinc-300'}`}>
                    {tpl.name}
                  </h4>
                  <p className="text-[11px] font-mono text-zinc-500 truncate mt-0.5">
                    {tpl.subject}
                  </p>
                  <span className="inline-block text-[9px] font-mono px-1.5 py-0.2 bg-[#121212] text-zinc-400 border border-[#262626] mt-1.5">
                    {tpl.category}
                  </span>
                </div>

                {!tpl.isDefault && (
                  <button
                    onClick={(e) => handleDelete(tpl._id, e)}
                    className="text-zinc-600 hover:text-rose-400 p-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── RIGHT: Visual HTML/CSS Template Builder ───────────────────────── */}
      <div className="flex-1 w-full bg-[#0A0A0A] border border-[#262626] flex flex-col h-[780px]">
        
        {/* Editor Top Bar */}
        <div className="p-4 border-b border-[#222222] bg-[#0E0E0E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-blue-500 inline-block" />
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              {activeTemplateId ? 'Edit Proposal Template' : 'Create New Proposal Template'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center border border-[#2B2B2B] bg-[#000000] p-0.5 font-mono text-xs">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 ${viewMode === 'split' ? 'bg-[#222] text-white' : 'text-zinc-500 hover:text-white'}`}
              >
                Split
              </button>
              <button
                type="button"
                onClick={() => setViewMode('code')}
                className={`px-2.5 py-1 ${viewMode === 'code' ? 'bg-[#222] text-white' : 'text-zinc-500 hover:text-white'}`}
              >
                HTML
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-2.5 py-1 ${viewMode === 'preview' ? 'bg-[#222] text-white' : 'text-zinc-500 hover:text-white'}`}
              >
                Preview
              </button>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-white text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Template'}</span>
            </button>
          </div>
        </div>

        {/* Inputs: Template Name & Subject Line */}
        <div className="p-4 border-b border-[#1E1E1E] bg-[#070707] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Website Audit Pitch"
                className="w-full px-3 py-1.5 bg-[#000000] border border-[#2B2B2B] text-xs font-mono text-white focus:outline-none focus:border-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Web Design"
                className="w-full px-3 py-1.5 bg-[#000000] border border-[#2B2B2B] text-xs font-mono text-white focus:outline-none focus:border-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">
              Email Subject Line (Supports Merge Tags)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Quick question regarding {{businessName}} website & rankings in {{area}}"
              className="w-full px-3 py-1.5 bg-[#000000] border border-[#2B2B2B] text-xs font-mono text-white focus:outline-none focus:border-white font-semibold"
            />
          </div>

          {/* Merge Tags Inserter Toolbar */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
              <Tag className="w-3 h-3 text-blue-400" /> Insert Merge Tags:
            </span>
            {mergeTags.map(mt => (
              <button
                key={mt.tag}
                type="button"
                onClick={() => insertTag(mt.tag)}
                title={mt.desc}
                className="text-[10px] font-mono px-2 py-0.5 bg-[#121212] border border-[#262626] text-blue-400 hover:text-white hover:border-blue-500 transition-colors cursor-pointer"
              >
                + {mt.tag}
              </button>
            ))}
          </div>
        </div>

        {/* Editor Body: Split / Code / Preview */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#1E1E1E] overflow-hidden">
          
          {/* HTML Code Editor */}
          {(viewMode === 'split' || viewMode === 'code') && (
            <div className={`flex flex-col h-full ${viewMode === 'code' ? 'lg:col-span-2' : ''}`}>
              <div className="px-4 py-2 bg-[#0C0C0C] border-b border-[#1C1C1C] text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                <span>HTML / CSS Source Code</span>
                <span className="text-zinc-600">{bodyHtml.length} characters</span>
              </div>
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                placeholder="Write responsive HTML email structure..."
                className="flex-1 w-full p-4 bg-[#000000] text-xs font-mono text-zinc-300 placeholder-zinc-700 focus:outline-none resize-none selection:bg-blue-600 selection:text-white"
              />
            </div>
          )}

          {/* Live Preview Pane */}
          {(viewMode === 'split' || viewMode === 'preview') && (
            <div className={`flex flex-col h-full bg-[#050505] ${viewMode === 'preview' ? 'lg:col-span-2' : ''}`}>
              <div className="px-4 py-2 bg-[#0C0C0C] border-b border-[#1C1C1C] text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                <span>Rendered Email Client Preview</span>
                <span className="text-emerald-400 font-medium">Interpolated with Sample Lead</span>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="mb-4 pb-3 border-b border-[#222222] font-mono text-xs">
                  <div className="text-zinc-500">Subject: <span className="text-white font-semibold">{renderPreview(subject)}</span></div>
                  <div className="text-zinc-600 text-[11px] mt-0.5">To: <span className="text-zinc-400">contact@apexroofingmiami.com</span></div>
                </div>
                <div 
                  className="bg-transparent"
                  dangerouslySetInnerHTML={{ __html: renderPreview(bodyHtml) }}
                />
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default EmailTemplateEditor;
