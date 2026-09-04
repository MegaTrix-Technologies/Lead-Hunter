import React, { useState, useEffect } from 'react';
import { ProjectService, UserService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  Briefcase, 
  UserPlus, 
  CheckCircle2, 
  MessageSquare, 
  Clock, 
  Calendar, 
  Search, 
  X, 
  User, 
  Package, 
  Phone, 
  Mail, 
  MapPin, 
  Plus,
  RefreshCw,
  Tag
} from 'lucide-react';

const formatPKR = (num) => `PKR ${(Number(num) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const ProjectsView = () => {
  const { user, isSuperAdmin } = useAuth();
  const { addToast } = useToast();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed' | 'ALL'
  const [search, setSearch] = useState('');

  // Assign Developers Modal
  const [assignProject, setAssignProject] = useState(null);
  const [developersList, setDevelopersList] = useState([]);
  const [selectedDevIds, setSelectedDevIds] = useState([]);
  const [assigning, setAssigning] = useState(false);

  // Add Delivery Note Modal
  const [noteProject, setNoteProject] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Complete Project Confirmation
  const [completingProject, setCompletingProject] = useState(null);
  const [completionNote, setCompletionNote] = useState('');
  const [submittingComplete, setSubmittingComplete] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await ProjectService.getProjects({
        status: activeTab !== 'ALL' ? activeTab : undefined,
        search: search.trim() || undefined
      });
      if (res.data?.success) {
        setProjects(res.data.data || []);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      addToast({ title: 'Error', message: 'Failed to load projects list.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchDevelopers = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await UserService.getUsers();
      if (res.data?.success) {
        const devs = (res.data.data || []).filter(u => 
          (u.roles && u.roles.includes('developer')) || u.role === 'superadmin'
        );
        setDevelopersList(devs);
      }
    } catch (err) {
      console.error('Error fetching developers list:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [activeTab]);

  useEffect(() => {
    fetchDevelopers();
  }, [isSuperAdmin]);

  const handleOpenAssignModal = (project) => {
    setAssignProject(project);
    setSelectedDevIds((project.assignedDevelopers || []).map(d => d._id || d));
  };

  const handleToggleDevSelection = (devId) => {
    if (selectedDevIds.includes(devId)) {
      setSelectedDevIds(prev => prev.filter(id => id !== devId));
    } else {
      setSelectedDevIds(prev => [...prev, devId]);
    }
  };

  const handleSaveAssignment = async () => {
    if (!assignProject) return;
    setAssigning(true);
    try {
      const res = await ProjectService.assignDevelopers(assignProject._id, { developerIds: selectedDevIds });
      if (res.data?.success) {
        addToast({ title: 'Developers Assigned', message: res.data.message, type: 'success' });
        setAssignProject(null);
        fetchProjects();
      }
    } catch (err) {
      console.error('Error assigning developers:', err);
      addToast({ title: 'Assignment Failed', message: err.message, type: 'error' });
    } finally {
      setAssigning(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteProject || !noteText.trim()) return;
    setSavingNote(true);
    try {
      const res = await ProjectService.addDeliveryNote(noteProject._id, { note: noteText.trim() });
      if (res.data?.success) {
        addToast({ title: 'Note Logged', message: 'Delivery note recorded successfully.', type: 'success' });
        setNoteProject(null);
        setNoteText('');
        fetchProjects();
      }
    } catch (err) {
      console.error('Error adding delivery note:', err);
      addToast({ title: 'Error', message: 'Failed to record note.', type: 'error' });
    } finally {
      setSavingNote(false);
    }
  };

  const handleConfirmComplete = async () => {
    if (!completingProject) return;
    setSubmittingComplete(true);
    try {
      const res = await ProjectService.completeProject(completingProject._id, { deliveryNote: completionNote.trim() });
      if (res.data?.success) {
        addToast({
          title: 'Project Delivered & Completed!',
          message: 'Sale status updated. Closer can now collect final payment.',
          type: 'success',
          duration: 5000
        });
        setCompletingProject(null);
        setCompletionNote('');
        fetchProjects();
      }
    } catch (err) {
      console.error('Error completing project:', err);
      addToast({ title: 'Error', message: 'Failed to mark project complete.', type: 'error' });
    } finally {
      setSubmittingComplete(false);
    }
  };

  return (
    <div className="space-y-6 font-mono">
      
      {/* ─── BANNER HEADER ──────────────────────────────────────────────────── */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 inline-block" />
            <h1 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Projects &amp; Production Delivery</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-blue-950 text-blue-300 border border-blue-800">
                {isSuperAdmin ? 'Super Admin Supervision' : 'Developer Workspace'}
              </span>
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Auto-created upon deal closure: developer allocation, technical delivery notes &amp; final completion sign-off.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchProjects}
            className="p-2 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-400 hover:text-white border border-[#2B2B2B] text-xs cursor-pointer transition-colors"
            title="Refresh projects list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── STATUS TABS & SEARCH BAR ────────────────────────────────────────── */}
      <div className="bg-[#080808] border border-[#222222] p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'active', label: 'Active Projects' },
            { id: 'completed', label: 'Completed Projects' },
            { id: 'ALL', label: 'All Records' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 border text-xs transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-blue-600 border-blue-500 text-white font-bold'
                  : 'bg-[#0E0E0E] border-[#262626] text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchProjects()}
            placeholder="Search by client or developer..."
            className="w-full pl-8 pr-3 py-1.5 bg-black border border-[#2B2B2B] text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* ─── PROJECTS CARDS STREAM ───────────────────────────────────────────── */}
      {loading ? (
        <div className="p-16 text-center text-zinc-500 text-xs">
          Loading production projects...
        </div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(proj => {
            const sale = proj.saleId;
            const customer = sale?.customer;
            const isCompleted = proj.status === 'completed';

            return (
              <div
                key={proj._id}
                className={`p-5 bg-[#0A0A0A] border flex flex-col justify-between gap-4 transition-all ${
                  isCompleted ? 'border-zinc-800' : 'border-[#262626] hover:border-blue-700/60'
                }`}
              >
                <div>
                  {/* Top Row: Client & Status */}
                  <div className="flex items-start justify-between gap-2 border-b border-[#1A1A1A] pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{customer?.businessName || 'Client Project'}</span>
                        <span className={`text-[10px] px-2 py-0.5 uppercase font-bold border ${
                          isCompleted
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
                            : 'bg-blue-950/40 text-blue-300 border-blue-800'
                        }`}>
                          {proj.status}
                        </span>
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                        <span>{customer?.area || 'Lahore'}</span>
                        <span>•</span>
                        <span>{customer?.category || 'General'}</span>
                        {customer?.phoneNumber && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400">{customer.phoneNumber}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-white font-mono">
                        {formatPKR(sale?.totalAmount || 0)}
                      </div>
                      <span className="text-[10px] text-zinc-500">
                        Advance: {formatPKR(sale?.advanceAmount || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Assigned Developers Row */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-zinc-500 text-[11px] uppercase">Assigned Developers:</span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {proj.assignedDeveloperNames && proj.assignedDeveloperNames.length > 0 ? (
                        proj.assignedDeveloperNames.map((name, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-950/30 border border-blue-800/60 text-blue-300 text-[10px]">
                            👨‍💻 {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-amber-400 text-[10px] italic">No developer assigned yet</span>
                      )}

                      {/* Super Admin Assign Button */}
                      {isSuperAdmin && !isCompleted && (
                        <button
                          onClick={() => handleOpenAssignModal(proj)}
                          className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] cursor-pointer ml-1"
                        >
                          + Assign
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Deliverables / Products Details */}
                  {sale?.products && sale.products.length > 0 && (
                    <div className="mt-3 p-2.5 bg-black border border-[#1C1C1C] space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase block">Deliverables / Products:</span>
                      <div className="flex flex-wrap gap-1">
                        {sale.products.map((p, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 bg-[#121212] border border-[#2B2B2B] text-zinc-300 text-[10px]">
                            {p.name} ({formatPKR(p.finalPrice)})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delivery Notes Log */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase">
                      <span>Delivery Progress &amp; Audit Log ({proj.deliveryNotes?.length || 0}):</span>
                      <button
                        onClick={() => { setNoteProject(proj); setNoteText(''); }}
                        className="text-blue-400 hover:underline cursor-pointer"
                      >
                        + Add Note
                      </button>
                    </div>

                    {proj.deliveryNotes && proj.deliveryNotes.length > 0 ? (
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {proj.deliveryNotes.slice().reverse().map((n, i) => (
                          <div key={i} className="p-2 bg-[#050505] border border-[#181818] text-[11px] text-zinc-300 flex items-start justify-between gap-2">
                            <span>{n.note}</span>
                            <span className="text-[9px] text-zinc-500 shrink-0">
                              {n.author} • {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-zinc-600 italic">No notes logged yet.</div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                {!isCompleted && (
                  <div className="pt-3 border-t border-[#1A1A1A] flex items-center justify-between gap-2">
                    <button
                      onClick={() => { setNoteProject(proj); setNoteText(''); }}
                      className="px-3 py-1.5 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-300 border border-[#2B2B2B] text-xs cursor-pointer"
                    >
                      Add Note
                    </button>

                    <button
                      onClick={() => { setCompletingProject(proj); setCompletionNote(''); }}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Completed &amp; Delivered</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-16 text-center text-zinc-500 text-xs bg-[#080808] border border-[#222222]">
          No projects found in this view.
        </div>
      )}

      {/* ─── ASSIGN DEVELOPERS MODAL (SUPER ADMIN) ───────────────────────────── */}
      {assignProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#090909] border border-[#2B2B2B] w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#202020] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <span>Assign Developers to Project</span>
              </h3>
              <button onClick={() => setAssignProject(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-zinc-400">
              Project: <strong className="text-white">{assignProject.saleId?.customer?.businessName}</strong>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {developersList.map(dev => {
                const isSelected = selectedDevIds.includes(dev._id);
                return (
                  <div
                    key={dev._id}
                    onClick={() => handleToggleDevSelection(dev._id)}
                    className={`p-3 border flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-950/40 text-white'
                        : 'border-[#222222] bg-black text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{dev.name}</div>
                      <div className="text-[10px] text-zinc-500">{dev.email}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 accent-blue-500"
                    />
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[#202020] flex items-center justify-between">
              <button
                onClick={() => setAssignProject(null)}
                className="px-4 py-1.5 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-400 border border-[#2A2A2A] text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAssignment}
                disabled={assigning}
                className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase cursor-pointer"
              >
                {assigning ? 'Saving...' : 'Save Allocation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD NOTE MODAL ─────────────────────────────────────────────────── */}
      {noteProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-150">
          <form onSubmit={handleAddNote} className="bg-[#090909] border border-[#2B2B2B] w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#202020] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span>Add Technical Delivery Note</span>
              </h3>
              <button type="button" onClick={() => setNoteProject(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-zinc-400">
              Project: <strong className="text-white">{noteProject.saleId?.customer?.businessName}</strong>
            </div>

            <textarea
              rows="4"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Detail work status, repository links, staging URLs, or QA test updates..."
              className="w-full p-3 bg-black border border-[#2B2B2B] text-white text-xs focus:outline-none focus:border-blue-500 resize-none"
              required
            />

            <div className="pt-2 border-t border-[#202020] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setNoteProject(null)}
                className="px-4 py-1.5 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-400 border border-[#2A2A2A] text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingNote}
                className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase cursor-pointer"
              >
                {savingNote ? 'Logging...' : 'Save Note'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── COMPLETE PROJECT CONFIRMATION MODAL ─────────────────────────────── */}
      {completingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#090909] border border-[#2B2B2B] w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#202020] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Mark Project Completed</span>
              </h3>
              <button onClick={() => setCompletingProject(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to mark <strong className="text-white">{completingProject.saleId?.customer?.businessName}</strong> as completed? This notifies the closer to collect the remaining payment.
            </p>

            <textarea
              rows="3"
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="Add final handoff remarks or production access details (optional)..."
              className="w-full p-3 bg-black border border-[#2B2B2B] text-white text-xs focus:outline-none focus:border-emerald-500 resize-none"
            />

            <div className="pt-2 border-t border-[#202020] flex items-center justify-between">
              <button
                onClick={() => setCompletingProject(null)}
                className="px-4 py-1.5 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-400 border border-[#2A2A2A] text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmComplete}
                disabled={submittingComplete}
                className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase cursor-pointer"
              >
                {submittingComplete ? 'Completing...' : 'Sign Off & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProjectsView;
