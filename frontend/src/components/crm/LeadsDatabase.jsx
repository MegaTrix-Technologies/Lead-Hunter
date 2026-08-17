import React, { useState } from 'react';
import { useLead } from '../../context/LeadContext';
import { LeadService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../common/StatusBadge';
import RatingStars from '../common/RatingStars';
import ClipboardButton from '../common/ClipboardButton';
import Pagination from '../common/Pagination';
import Modal from '../common/Modal';
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Plus, 
  Globe, 
  Phone, 
  Mail, 
  PhoneCall, 
  Send,
  MoreVertical,
  CheckSquare,
  Square,
  ExternalLink
} from 'lucide-react';

const LeadsDatabase = () => {
  const { 
    leads, 
    loadingLeads, 
    pagination, 
    fetchLeads, 
    filters, 
    setFilters,
    selectedLeadIds,
    setSelectedLeadIds,
    setCallingQueue,
    setActiveQueueIndex,
    setActiveView,
    setIsCampaignModalOpen
  } = useLead();

  const { addToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    businessName: '',
    category: 'Roofing',
    area: 'Miami, FL',
    phoneNumber: '',
    email: '',
    website: '',
    address: '',
    rating: 4.0,
    reviewCount: 20
  });

  const statuses = ['ALL', 'Uncontacted', 'IVR', 'Receptionist', 'Do Not Call', 'Shows Interest', 'Follow Up', 'Lead / Sale'];

  const handleFilterStatus = (status) => {
    const newFilters = { ...filters, status };
    setFilters(newFilters);
    fetchLeads(1, newFilters);
  };

  const handleSearchChange = (e) => {
    const search = e.target.value;
    const newFilters = { ...filters, search };
    setFilters(newFilters);
    fetchLeads(1, newFilters);
  };

  const handleSortChange = (sortBy) => {
    const newFilters = { ...filters, sortBy };
    setFilters(newFilters);
    fetchLeads(1, newFilters);
  };

  const handleToggleSelect = (id) => {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(prev => prev.filter(item => item !== id));
    } else {
      setSelectedLeadIds(prev => [...prev, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedLeadIds.length === leads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map(l => l._id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedLeadIds.length} selected leads?`)) return;

    try {
      const res = await LeadService.bulkDelete(selectedLeadIds);
      if (res.data.success) {
        addToast({ title: 'Leads Deleted', message: res.data.message, type: 'success' });
        setSelectedLeadIds([]);
        fetchLeads(1);
      }
    } catch (error) {
      addToast({ title: 'Delete Failed', message: error.message, type: 'error' });
    }
  };

  const handleExport = (format = 'csv') => {
    window.open(`/api/leads/export?format=${format}&status=${filters.status}`, '_blank');
    addToast({ title: 'Export Generated', message: `Downloading ${format.toUpperCase()} leads file...`, type: 'info' });
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      const res = await LeadService.createLead(newLeadForm);
      if (res.data.success) {
        addToast({ title: 'Lead Added', message: `Created "${newLeadForm.businessName}"`, type: 'success' });
        setIsAddModalOpen(false);
        setNewLeadForm({
          businessName: '',
          category: 'Roofing',
          area: 'Miami, FL',
          phoneNumber: '',
          email: '',
          website: '',
          address: '',
          rating: 4.0,
          reviewCount: 20
        });
        fetchLeads(1);
      }
    } catch (error) {
      addToast({ title: 'Error Creating Lead', message: error.message, type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls & Action Bar */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-5 space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 inline-block" />
              Global Leads Database &amp; Master Directory
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Full CRUD management, multi-parameter filtering, bulk exports, and direct outreach actions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 bg-white text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Lead</span>
            </button>

            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="px-3.5 py-2 bg-[#141414] hover:bg-[#1C1C1C] text-zinc-300 hover:text-white border border-[#2B2B2B] font-mono text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {selectedLeadIds.length > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 font-mono text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedLeadIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar: Status Tabs, Search, Sort */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pt-4 border-t border-[#1C1C1C]">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1">
            {statuses.map(s => {
              const isCurrent = filters.status === s;
              return (
                <button
                  key={s}
                  onClick={() => handleFilterStatus(s)}
                  className={`px-2.5 py-1 text-xs font-mono whitespace-nowrap border transition-all cursor-pointer ${
                    isCurrent 
                      ? 'border-white bg-white text-black font-bold' 
                      : 'border-[#222222] bg-[#000000] text-zinc-400 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={filters.search || ''}
                onChange={handleSearchChange}
                placeholder="Search business, phone, email..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#000000] border border-[#2B2B2B] text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white"
              />
            </div>

            <select
              value={filters.sortBy || 'updated_desc'}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-3 py-1.5 bg-[#000000] border border-[#2B2B2B] text-xs font-mono text-zinc-300 focus:outline-none focus:border-white cursor-pointer"
            >
              <option value="updated_desc">Sort: Recently Updated</option>
              <option value="rating_desc">Sort: Highest Rating</option>
              <option value="rating_asc">Sort: Lowest Rating</option>
              <option value="reviews_desc">Sort: Most Reviews</option>
              <option value="name_asc">Sort: Name (A-Z)</option>
            </select>
          </div>

        </div>

      </div>

      {/* Leads Table */}
      <div className="bg-[#0A0A0A] border border-[#262626] overflow-x-auto">
        <table className="w-full text-left border-collapse font-mono text-xs">
          
          {/* Table Header */}
          <thead>
            <tr className="border-b border-[#222222] bg-[#0E0E0E] text-zinc-400 uppercase tracking-wider text-[11px]">
              <th className="p-3.5 w-10 text-center">
                <input
                  type="checkbox"
                  checked={selectedLeadIds.length === leads.length && leads.length > 0}
                  onChange={handleSelectAll}
                  className="cursor-pointer accent-blue-500"
                />
              </th>
              <th className="p-3.5">Business Name &amp; Area</th>
              <th className="p-3.5">Social Proof</th>
              <th className="p-3.5">Contact Details</th>
              <th className="p-3.5">Digital Footprint</th>
              <th className="p-3.5">Call Status</th>
              <th className="p-3.5">Emails Sent</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#1A1A1A]">
            {loadingLeads ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-zinc-500">
                  Loading leads database...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-zinc-500">
                  No records matching the filter criteria.
                </td>
              </tr>
            ) : (
              leads.map(lead => {
                const isSelected = selectedLeadIds.includes(lead._id);

                return (
                  <tr 
                    key={lead._id}
                    className={`hover:bg-[#121216] transition-colors ${
                      isSelected ? 'bg-[#0E0E14]' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(lead._id)}
                        className="cursor-pointer accent-blue-500"
                      />
                    </td>

                    {/* Business Name & Area */}
                    <td className="p-3.5 max-w-[220px]">
                      <div className="font-semibold text-white truncate">{lead.businessName}</div>
                      <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                        {lead.category} • {lead.area}
                      </div>
                    </td>

                    {/* Social Proof */}
                    <td className="p-3.5 whitespace-nowrap">
                      <RatingStars rating={lead.rating} reviewCount={lead.reviewCount} />
                    </td>

                    {/* Contact Details */}
                    <td className="p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        <span className="truncate max-w-[120px]">{lead.phoneNumber || 'N/A'}</span>
                        {lead.phoneNumber && <ClipboardButton text={lead.phoneNumber} />}
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                        <Mail className="w-3 h-3 text-zinc-500" />
                        <span className="truncate max-w-[120px]">{lead.email || 'N/A'}</span>
                        {lead.email && <ClipboardButton text={lead.email} />}
                      </div>
                    </td>

                    {/* Digital Footprint */}
                    <td className="p-3.5 whitespace-nowrap">
                      {lead.website ? (
                        <a
                          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                        >
                          <Globe className="w-3 h-3" />
                          <span className="truncate max-w-[120px]">{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>
                      ) : (
                        <span className="text-amber-400/90 text-[10px] px-1.5 py-0.5 bg-amber-950/20 border border-amber-800/40">
                          No Website
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-3.5 whitespace-nowrap">
                      <StatusBadge status={lead.callStatus} size="sm" />
                    </td>

                    {/* Email Sent Count */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 border text-[11px] ${
                        lead.emailSentCount >= 3 
                          ? 'border-rose-800/60 bg-rose-950/40 text-rose-300 font-bold' 
                          : lead.emailSentCount > 0 
                            ? 'border-blue-800/60 bg-blue-950/40 text-blue-300' 
                            : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                      }`}>
                        {lead.emailSentCount} / 3 {lead.emailSentCount >= 3 ? '(Maxed)' : ''}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCallingQueue([lead]);
                            setActiveQueueIndex(0);
                            setActiveView('workstation');
                          }}
                          title="Dial in Workstation"
                          className="p-1.5 bg-[#141414] hover:bg-white hover:text-black text-zinc-400 border border-[#2B2B2B] transition-colors cursor-pointer"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLeadIds([lead._id]);
                            setIsCampaignModalOpen(true);
                          }}
                          title="Send Email Proposal"
                          className="p-1.5 bg-[#141414] hover:bg-blue-600 hover:text-white text-blue-400 border border-[#2B2B2B] transition-colors cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <Pagination
          pagination={pagination}
          onPageChange={(page) => fetchLeads(page)}
        />
      </div>

      {/* Manual Add Lead Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New B2B Lead Record"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                Business Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={newLeadForm.businessName}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, businessName: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-zinc-700 text-xs font-mono text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                Category / Niche <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={newLeadForm.category}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, category: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-zinc-700 text-xs font-mono text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                Area / City <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={newLeadForm.area}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, area: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-zinc-700 text-xs font-mono text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={newLeadForm.phoneNumber}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, phoneNumber: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-zinc-700 text-xs font-mono text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={newLeadForm.email}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-zinc-700 text-xs font-mono text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                Website URL
              </label>
              <input
                type="text"
                value={newLeadForm.website}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, website: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-black border border-zinc-700 text-xs font-mono text-white focus:outline-none focus:border-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
              Physical Street Address
            </label>
            <input
              type="text"
              value={newLeadForm.address}
              onChange={(e) => setNewLeadForm({ ...newLeadForm, address: e.target.value })}
              className="w-full px-3 py-2 bg-black border border-zinc-700 text-xs font-mono text-white focus:outline-none focus:border-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-zinc-700 text-xs font-mono text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-white text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-zinc-200"
            >
              Save Record
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default LeadsDatabase;
