import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Mail, 
  Globe, 
  Clock, 
  RefreshCw, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  Lock, 
  Settings, 
  Layers, 
  Key,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Trash2,
  Edit3,
  Save,
  X,
  Shield,
  User
} from 'lucide-react';
import { AnalyticsService, UserService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const SettingsView = () => {
  const { isSuperAdmin, user: currentUser, changePassword } = useAuth();
  const { addToast } = useToast();

  // Active Tab: Super Admin defaults to 'users', Agent defaults to 'password'
  const [activeTab, setActiveTab] = useState(isSuperAdmin ? 'users' : 'password');
  
  // Quota & Limits State
  const [quotas, setQuotas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [brevoMsLeft, setBrevoMsLeft] = useState(0);
  const [googleMsLeft, setGoogleMsLeft] = useState(0);

  // User Management State (Super Admin)
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    dailyGmbLimit: 150
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // Edit Limit Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editLimitValue, setEditLimitValue] = useState(150);
  const [updatingLimit, setUpdatingLimit] = useState(false);

  // Change Password Form State (Both Roles)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Ensure correct active tab when role changes
  useEffect(() => {
    if (!isSuperAdmin && activeTab !== 'password') {
      setActiveTab('password');
    }
  }, [isSuperAdmin, activeTab]);

  // Fetch Team Users (Super Admin Only)
  const fetchUsers = async () => {
    if (!isSuperAdmin) return;
    setLoadingUsers(true);
    try {
      const res = await UserService.getUsers();
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      addToast({
        title: 'Error Fetching Team',
        message: err.response?.data?.message || err.message,
        type: 'error'
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch API Quotas
  const fetchQuotas = async (silent = false) => {
    if (!isSuperAdmin) return;
    if (!silent) setLoading(true);
    try {
      const res = await AnalyticsService.getQuotas();
      if (res.data.success) {
        setQuotas(res.data.data);
        setBrevoMsLeft(res.data.data.brevo.msUntilReset);
        setGoogleMsLeft(res.data.data.googlePlaces.msUntilReset);
        if (!silent) {
          addToast({
            title: 'Quotas Synced',
            message: 'Retrieved live API limits, usage metrics, and reset timers.',
            type: 'success',
            duration: 3000
          });
        }
      }
    } catch (err) {
      console.error('[SettingsView] fetchQuotas error:', err);
      if (!silent) {
        addToast({
          title: 'Error Syncing Quotas',
          message: err.response?.data?.message || err.message,
          type: 'error'
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchQuotas(true);
      fetchUsers();
    }
  }, [isSuperAdmin]);

  // Countdown timer clock
  useEffect(() => {
    const timer = setInterval(() => {
      setBrevoMsLeft(prev => Math.max(0, prev - 1000));
      setGoogleMsLeft(prev => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTimeRemaining = (ms) => {
    if (!ms || ms <= 0) return '00h 00m 00s';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours < 10 ? `0${hours}` : hours}h ${minutes < 10 ? `0${minutes}` : minutes}m ${seconds < 10 ? `0${seconds}` : seconds}s`;
    }
    return `${hours < 10 ? `0${hours}` : hours}h ${minutes < 10 ? `0${minutes}` : minutes}m ${seconds < 10 ? `0${seconds}` : seconds}s`;
  };

  // Handle Create Agent
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email || !newUserForm.password) {
      addToast({ title: 'Validation Error', message: 'Name, email, and password are required.', type: 'error' });
      return;
    }
    setCreatingUser(true);
    try {
      const res = await UserService.createUser({
        name: newUserForm.name.trim(),
        email: newUserForm.email.trim().toLowerCase(),
        password: newUserForm.password,
        role: 'agent',
        dailyGmbLimit: parseInt(newUserForm.dailyGmbLimit, 10) || 150
      });
      if (res.data.success) {
        addToast({
          title: 'Agent Created',
          message: `Created agent profile for ${res.data.data.name} with ${res.data.data.dailyGmbLimit} daily GMB limit.`,
          type: 'success',
          duration: 4000
        });
        setIsAddUserModalOpen(false);
        setNewUserForm({ name: '', email: '', password: '', dailyGmbLimit: 150 });
        fetchUsers();
        fetchQuotas(true);
      }
    } catch (err) {
      addToast({
        title: 'Error Creating Agent',
        message: err.response?.data?.message || err.message,
        type: 'error'
      });
    } finally {
      setCreatingUser(false);
    }
  };

  // Handle Block / Unblock Agent
  const handleToggleUserStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'blocked' : 'active';
    try {
      const res = await UserService.updateUser(user._id, { status: nextStatus });
      if (res.data.success) {
        addToast({
          title: `Agent ${nextStatus === 'active' ? 'Unblocked' : 'Blocked'}`,
          message: `${user.name} is now ${nextStatus}.`,
          type: nextStatus === 'active' ? 'success' : 'warning',
          duration: 3000
        });
        fetchUsers();
      }
    } catch (err) {
      addToast({
        title: 'Status Update Failed',
        message: err.response?.data?.message || err.message,
        type: 'error'
      });
    }
  };

  // Handle Update Daily Limit
  const handleSaveLimit = async () => {
    if (!editingUser) return;
    setUpdatingLimit(true);
    try {
      const res = await UserService.updateUser(editingUser._id, {
        dailyGmbLimit: parseInt(editLimitValue, 10) || 150
      });
      if (res.data.success) {
        addToast({
          title: 'Limit Updated',
          message: `Updated daily GMB limit for ${editingUser.name} to ${editLimitValue} profiles/day.`,
          type: 'success',
          duration: 3000
        });
        setEditingUser(null);
        fetchUsers();
        fetchQuotas(true);
      }
    } catch (err) {
      addToast({
        title: 'Error Updating Limit',
        message: err.response?.data?.message || err.message,
        type: 'error'
      });
    } finally {
      setUpdatingLimit(false);
    }
  };

  // Handle Delete Agent
  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to permanently remove agent "${user.name}" (${user.email})?`)) {
      return;
    }
    try {
      const res = await UserService.deleteUser(user._id);
      if (res.data.success) {
        addToast({
          title: 'Agent Removed',
          message: `Agent profile "${user.name}" was permanently removed.`,
          type: 'info',
          duration: 3000
        });
        fetchUsers();
        fetchQuotas(true);
      }
    } catch (err) {
      addToast({
        title: 'Error Deleting Agent',
        message: err.response?.data?.message || err.message,
        type: 'error'
      });
    }
  };

  // Handle Change Password Form Submit
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      addToast({ title: 'Validation Error', message: 'Current password is required.', type: 'error' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      addToast({ title: 'Weak Password', message: 'New password must be at least 6 characters.', type: 'error' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast({ title: 'Validation Error', message: 'New password and confirm password do not match.', type: 'error' });
      return;
    }

    setChangingPassword(true);
    const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
    setChangingPassword(false);
    if (result.success) {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
  };

  // Tabs array depending on role
  const allTabs = [
    { id: 'users', label: 'User Management', icon: Users, superAdminOnly: true },
    { id: 'limits', label: 'Limits & API Credits', icon: Zap, superAdminOnly: true },
    { id: 'password', label: 'Change Password', icon: Lock },
    { id: 'brevo', label: 'Brevo SMTP Configuration', icon: Mail, superAdminOnly: true },
    { id: 'places', label: 'Google Places API Setup', icon: Globe, superAdminOnly: true }
  ];

  const tabs = allTabs.filter(tab => !tab.superAdminOnly || isSuperAdmin);

  return (
    <div className="space-y-6 font-mono max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-200">
      
      {/* ─── SETTINGS HEADER BANNER ────────────────────────────────────────── */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-white/40 to-transparent" />
        
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-none inline-block" />
            <h1 className="text-base font-bold text-white uppercase tracking-wider">
              {isSuperAdmin ? 'MegaTrix System Settings & Administration' : 'Portal Account Settings'}
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {isSuperAdmin 
              ? 'Manage agent profiles, enforce daily GMB extraction quotas, inspect API free tiers, and configure integrations.'
              : 'Manage your agent account security and portal authentication credentials.'}
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => { fetchQuotas(false); fetchUsers(); }}
              disabled={loading || loadingUsers}
              className="px-4 py-2 bg-[#121212] hover:bg-[#1A1A1A] text-zinc-300 hover:text-white border border-[#2B2B2B] text-xs font-semibold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loading || loadingUsers ? 'animate-spin' : ''}`} />
              <span>Sync System Status</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── MAIN SETTINGS CONTAINER (TABS + CONTENT) ───────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Sidebar Navigation Tabs */}
        <div className="w-full lg:w-72 shrink-0 bg-[#080808] border border-[#222222] divide-y divide-[#1A1A1A]">
          <div className="p-3 bg-[#0C0C0C] text-[10px] text-zinc-500 uppercase tracking-widest font-bold flex items-center justify-between">
            <span>Settings Menu</span>
            <span className={`text-[9px] px-1 py-0.2 rounded uppercase ${
              isSuperAdmin ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-blue-950 text-blue-300 border border-blue-800'
            }`}>
              {isSuperAdmin ? 'Super Admin' : 'Agent'}
            </span>
          </div>
          <nav className="p-2 space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isCurrent = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3.5 py-3 text-xs flex items-center justify-between cursor-pointer transition-all border ${
                    isCurrent 
                      ? 'bg-[#121218] border-blue-500/80 text-white font-bold' 
                      : 'border-transparent text-zinc-400 hover:bg-[#0E0E0E] hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-blue-400' : 'text-zinc-500'}`} />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {isCurrent && (
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-none" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 w-full space-y-6">

          {/* ─── TAB: USER MANAGEMENT (SUPER ADMIN ONLY) ──────────────────────── */}
          {activeTab === 'users' && isSuperAdmin && (
            <div className="space-y-6">
              
              {/* Top Banner & Add Button */}
              <div className="p-5 bg-[#080808] border border-[#222222] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Agent Profile &amp; Role Management
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Create agent logins, set custom daily GMB extraction limits, and block/unblock access.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Agent Profile</span>
                </button>
              </div>

              {/* Users Table */}
              <div className="bg-[#080808] border border-[#222222] overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b border-[#222222] bg-[#0C0C0C] text-zinc-400 uppercase tracking-wider text-[11px]">
                      <th className="p-3.5">Agent / User</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Daily GMB Limit</th>
                      <th className="p-3.5">Today's Usage</th>
                      <th className="p-3.5">Total Extracted</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A1A]">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-zinc-500">
                          Loading agent profiles...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-zinc-500">
                          No users registered yet.
                        </td>
                      </tr>
                    ) : (
                      users.map(u => {
                        const isSelf = u._id === currentUser?._id;
                        const isSuper = u.role === 'superadmin';

                        return (
                          <tr key={u._id} className="hover:bg-[#121216] transition-colors">
                            {/* User Name & Email */}
                            <td className="p-3.5">
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isSelf && (
                                  <span className="text-[9px] px-1 bg-zinc-800 text-zinc-300 font-normal">YOU</span>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-500 mt-0.5">{u.email}</div>
                            </td>

                            {/* Role */}
                            <td className="p-3.5 whitespace-nowrap">
                              <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${
                                isSuper 
                                  ? 'bg-purple-950/60 text-purple-300 border border-purple-800' 
                                  : 'bg-blue-950/60 text-blue-300 border border-blue-800'
                              }`}>
                                {isSuper ? 'SUPER ADMIN' : 'AGENT'}
                              </span>
                            </td>

                            {/* Daily GMB Limit */}
                            <td className="p-3.5 whitespace-nowrap">
                              {isSuper ? (
                                <span className="text-zinc-500 italic">Unlimited</span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white">{u.dailyGmbLimit || 150}</span>
                                  <span className="text-zinc-500 text-[10px]">profiles/day</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingUser(u);
                                      setEditLimitValue(u.dailyGmbLimit || 150);
                                    }}
                                    title="Edit Daily Limit"
                                    className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <Edit3 className="w-3 h-3 text-blue-400" />
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Today's Usage */}
                            <td className="p-3.5 whitespace-nowrap">
                              <span className={`font-bold ${u.usedToday > 0 ? 'text-blue-400' : 'text-zinc-500'}`}>
                                {u.usedToday || 0}
                              </span>
                              {!isSuper && (
                                <span className="text-zinc-500 text-[10px]"> / {u.dailyGmbLimit || 150}</span>
                              )}
                            </td>

                            {/* Total Extracted */}
                            <td className="p-3.5 whitespace-nowrap font-bold text-zinc-300">
                              {u.totalExtracted || 0} leads
                            </td>

                            {/* Status */}
                            <td className="p-3.5 whitespace-nowrap">
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                                u.status === 'active' 
                                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' 
                                  : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                              }`}>
                                {u.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="p-3.5 text-right whitespace-nowrap">
                              {!isSuper && (
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Block / Unblock Toggle */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleUserStatus(u)}
                                    title={u.status === 'active' ? 'Block Agent Access' : 'Unblock Agent Access'}
                                    className={`p-1.5 border text-xs cursor-pointer transition-colors ${
                                      u.status === 'active'
                                        ? 'bg-[#141414] hover:bg-rose-950/50 text-zinc-400 hover:text-rose-300 border-[#2B2B2B] hover:border-rose-700'
                                        : 'bg-[#141414] hover:bg-emerald-950/50 text-emerald-400 border-[#2B2B2B] hover:border-emerald-700'
                                    }`}
                                  >
                                    {u.status === 'active' ? (
                                      <UserX className="w-3.5 h-3.5" />
                                    ) : (
                                      <UserCheck className="w-3.5 h-3.5" />
                                    )}
                                  </button>

                                  {/* Delete Agent */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u)}
                                    title="Delete Agent Permanently"
                                    className="p-1.5 bg-[#141414] hover:bg-rose-950/50 text-zinc-400 hover:text-rose-300 border border-[#2B2B2B] hover:border-rose-700 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* ─── TAB: CHANGE PASSWORD (BOTH ROLES) ─────────────────────────────── */}
          {activeTab === 'password' && (
            <div className="bg-[#080808] border border-[#222222] p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1A1A1A]">
                <Lock className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Change Portal Password
                </h3>
              </div>

              <p className="text-xs text-zinc-400">
                Update your login password for {currentUser?.email}. Your new password must be at least 6 characters long.
              </p>

              <form onSubmit={handleChangePasswordSubmit} className="space-y-4 max-w-md pt-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 bg-black border border-[#262626] focus:border-blue-500 text-white text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password (min 6 characters)"
                    className="w-full px-3 py-2 bg-black border border-[#262626] focus:border-blue-500 text-white text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Re-enter new password"
                    className="w-full px-3 py-2 bg-black border border-[#262626] focus:border-blue-500 text-white text-xs font-mono focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{changingPassword ? 'Updating...' : 'Update Password'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─── TAB: LIMITS & CREDITS + TEAM USAGE BREAKDOWN (SUPER ADMIN ONLY) ── */}
          {activeTab === 'limits' && isSuperAdmin && (
            <div className="space-y-6">
              
              {/* Top Banner Notice */}
              <div className="p-4 bg-[#05070F] border border-blue-600/60 flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-950/80 border border-blue-500/50 flex items-center justify-center shrink-0 text-blue-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="text-white font-bold uppercase tracking-wider flex items-center gap-2">
                    <span>Live Quota &amp; Credit Tracking</span>
                    <span className="px-2 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                      100% Real-Time
                    </span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed">
                    Usage counts are tracked in real-time across all agents. Below is the full team breakdown and live reset countdown timers.
                  </p>
                </div>
              </div>

              {/* 2 Primary Quota Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* ─── CARD 1: BREVO DAILY EMAIL TIER ───────────────────────────── */}
                <div className="bg-[#080808] border border-[#222222] p-5 space-y-4 hover:border-zinc-700 transition-all flex flex-col justify-between">
                  <div className="space-y-4">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-[#111111] border border-[#2B2B2B] flex items-center justify-center text-blue-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                            Brevo SMTP (Free Tier)
                          </h3>
                          <span className="text-[10px] text-zinc-500">Daily Rolling Allowance</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-[10px] font-bold">
                        ACTIVE
                      </span>
                    </div>

                    {/* Big Numbers */}
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <div className="text-3xl font-bold text-white font-mono">
                          {quotas ? quotas.brevo.remainingToday : 300}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Emails Remaining Today
                        </div>
                      </div>
                      <div className="text-right text-xs text-zinc-500 font-mono">
                        <div>Limit: <span className="text-white font-bold">300</span> / day</div>
                        <div>Sent: <span className="text-blue-400 font-bold">{quotas ? quotas.brevo.sentToday : 0}</span></div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span>Daily Capacity Used</span>
                        <span className="font-bold text-white">
                          {quotas ? quotas.brevo.usagePercentage : 0}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#121212] overflow-hidden border border-[#222]">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500"
                          style={{ width: `${quotas ? Math.max(3, quotas.brevo.usagePercentage) : 3}%` }}
                        />
                      </div>
                    </div>

                    {/* Metadata Specs */}
                    <div className="p-3 bg-[#040404] border border-[#1A1A1A] space-y-1.5 text-[11px] text-zinc-400">
                      <div className="flex items-center justify-between">
                        <span>SMTP Relay Host:</span>
                        <span className="text-zinc-200 font-bold">{quotas?.brevo.smtpHost || 'smtp-relay.brevo.com:587'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Sender Address:</span>
                        <span className="text-zinc-200 font-bold">{quotas?.brevo.fromEmail || 'sales@megatrixai.com'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Safety Deduplication:</span>
                        <span className="text-emerald-400 font-bold">Strict 1-Email Idempotency</span>
                      </div>
                    </div>

                  </div>

                  {/* Countdown Timer Footer */}
                  <div className="p-3 bg-[#0C0C0C] border border-[#1E1E1E] flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Clock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                      <span>Resets In:</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 tracking-wider">
                      {formatTimeRemaining(brevoMsLeft)}
                    </span>
                  </div>

                </div>

                {/* ─── CARD 2: GOOGLE PLACES MONTHLY CREDIT TIER ─────────────────── */}
                <div className="bg-[#080808] border border-[#222222] p-5 space-y-4 hover:border-zinc-700 transition-all flex flex-col justify-between">
                  <div className="space-y-4">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-[#111111] border border-[#2B2B2B] flex items-center justify-center text-blue-400">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                            Google Places API (New)
                          </h3>
                          <span className="text-[10px] text-zinc-500">$200.00 Monthly Free Tier Credit</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-[10px] font-bold">
                        ACTIVE
                      </span>
                    </div>

                    {/* Big Numbers */}
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <div className="text-3xl font-bold text-white font-mono">
                          ${quotas ? quotas.googlePlaces.remainingCredit.toFixed(2) : '200.00'}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Free Tier Credit Remaining
                        </div>
                      </div>
                      <div className="text-right text-xs text-zinc-500 font-mono">
                        <div>Allowance: <span className="text-white font-bold">$200.00</span> / mo</div>
                        <div>Estimated Spend: <span className="text-blue-400 font-bold">${quotas ? quotas.googlePlaces.estimatedSpend.toFixed(2) : '0.00'}</span></div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span>Monthly Credit Consumed</span>
                        <span className="font-bold text-white">
                          {quotas ? quotas.googlePlaces.usagePercentage : 0}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#121212] overflow-hidden border border-[#222]">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500"
                          style={{ width: `${quotas ? Math.max(3, quotas.googlePlaces.usagePercentage) : 3}%` }}
                        />
                      </div>
                    </div>

                    {/* Metadata Specs */}
                    <div className="p-3 bg-[#040404] border border-[#1A1A1A] space-y-1.5 text-[11px] text-zinc-400">
                      <div className="flex items-center justify-between">
                        <span>API Model Endpoint:</span>
                        <span className="text-zinc-200 font-bold">Places API (New) TextSearch</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Monthly Requests Used:</span>
                        <span className="text-zinc-200 font-bold">{quotas?.googlePlaces.totalRequestsThisMonth || 0} calls</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Est. Remaining Searches:</span>
                        <span className="text-emerald-400 font-bold">~{quotas?.googlePlaces.remainingRequests.toLocaleString() || '6,200'} requests</span>
                      </div>
                    </div>

                  </div>

                  {/* Countdown Timer Footer */}
                  <div className="p-3 bg-[#0C0C0C] border border-[#1E1E1E] flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Clock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                      <span>Credit Resets In:</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 tracking-wider">
                      {formatTimeRemaining(googleMsLeft)}
                    </span>
                  </div>

                </div>

              </div>

              {/* ─── TEAM USAGE BREAKDOWN TABLE (REQUIREMENT 9) ────────────────── */}
              {quotas?.teamUsage && quotas.teamUsage.length > 0 && (
                <div className="bg-[#080808] border border-[#222222] p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A]">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Per-User GMB API Extraction Breakdown
                      </h3>
                    </div>
                    <span className="text-[10px] text-zinc-500">Live Today Metrics</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-mono text-xs">
                      <thead>
                        <tr className="border-b border-[#222222] bg-[#0C0C0C] text-zinc-400 uppercase tracking-wider text-[10px]">
                          <th className="p-3">User</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">Daily Limit</th>
                          <th className="p-3">Extracted Today</th>
                          <th className="p-3">Remaining Today</th>
                          <th className="p-3">All-Time Extracted</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1A1A1A]">
                        {quotas.teamUsage.map(u => (
                          <tr key={u.userId} className="hover:bg-[#121216] transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-white">{u.name}</div>
                              <div className="text-[10px] text-zinc-500">{u.email}</div>
                            </td>
                            <td className="p-3 uppercase text-[10px]">
                              <span className={`px-1.5 py-0.5 rounded ${
                                u.role === 'superadmin' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-blue-950 text-blue-300 border border-blue-800'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-white">
                              {u.role === 'superadmin' ? 'Unlimited' : `${u.dailyLimit}/day`}
                            </td>
                            <td className="p-3 font-bold text-blue-400">
                              {u.usedToday}
                            </td>
                            <td className="p-3 font-bold text-emerald-400">
                              {u.role === 'superadmin' ? '∞' : u.remainingToday}
                            </td>
                            <td className="p-3 text-zinc-300">
                              {u.totalExtracted} leads
                            </td>
                            <td className="p-3 uppercase text-[10px]">
                              <span className={`px-1.5 py-0.5 rounded ${
                                u.status === 'active' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                              }`}>
                                {u.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ─── TAB: BREVO SMTP CONFIG (SUPER ADMIN ONLY) ─────────────────────── */}
          {activeTab === 'brevo' && isSuperAdmin && (
            <div className="bg-[#080808] border border-[#222222] p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1A1A1A]">
                <Mail className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Brevo SMTP Relay Settings
                </h3>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 bg-[#050505] border border-[#1E1E1E] space-y-2.5 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">SMTP Host:</span>
                    <span className="text-white font-bold">smtp-relay.brevo.com</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Port:</span>
                    <span className="text-white font-bold">587 (STARTTLS)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">From Name:</span>
                    <span className="text-white font-bold">MegaTrix Technologies</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">From &amp; Reply-To Email:</span>
                    <span className="text-blue-400 font-bold">sales@megatrixai.com</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Status:</span>
                    <span className="text-emerald-400 font-bold">Connected &amp; Verified</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: GOOGLE PLACES CONFIG (SUPER ADMIN ONLY) ──────────────────── */}
          {activeTab === 'places' && isSuperAdmin && (
            <div className="bg-[#080808] border border-[#222222] p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1A1A1A]">
                <Globe className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Google Places API (New) Configuration
                </h3>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 bg-[#050505] border border-[#1E1E1E] space-y-2.5 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">API Service:</span>
                    <span className="text-white font-bold">Google Places API (New)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Endpoint:</span>
                    <span className="text-white font-bold">https://places.googleapis.com/v1/places:searchText</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Monthly Free Credit:</span>
                    <span className="text-emerald-400 font-bold">$200.00 USD / month</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Status:</span>
                    <span className="text-emerald-400 font-bold">Configured &amp; Active</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ─── MODAL 1: CREATE AGENT PROFILE MODAL ─────────────────────────────── */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0A0A0A] border border-[#2B2B2B] w-full max-w-md p-6 space-y-5 shadow-2xl relative font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E1E1E]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Create New Agent Profile
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-bold uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-[#262626] focus:border-blue-500 text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-bold uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. alex@megatrixai.com"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-[#262626] focus:border-blue-500 text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-bold uppercase mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter initial agent password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-[#262626] focus:border-blue-500 text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-bold uppercase mb-1">
                  Daily GMB Extraction Limit (Profiles / Day)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  required
                  value={newUserForm.dailyGmbLimit}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, dailyGmbLimit: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-[#262626] focus:border-blue-500 text-white font-mono focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Agent will be limited to extracting this many profiles every 24 hours.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E1E1E]">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 bg-[#121212] hover:bg-[#1A1A1A] text-zinc-300 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{creatingUser ? 'Creating...' : 'Create Agent'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: EDIT DAILY GMB LIMIT MODAL ─────────────────────────────── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0A0A0A] border border-[#2B2B2B] w-full max-w-sm p-6 space-y-4 shadow-2xl relative font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E1E1E]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-white uppercase tracking-wider">
                  Edit Daily Limit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="text-zinc-400 font-bold">{editingUser.name}</div>
              <div className="text-zinc-500 text-[10px]">{editingUser.email}</div>
            </div>

            <div>
              <label className="block text-zinc-400 font-bold uppercase mb-1">
                New Daily GMB Limit (Profiles / Day)
              </label>
              <input
                type="number"
                min="1"
                max="5000"
                value={editLimitValue}
                onChange={(e) => setEditLimitValue(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-black border border-[#262626] focus:border-blue-500 text-white font-mono focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1E1E1E]">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-3.5 py-1.5 bg-[#121212] hover:bg-[#1A1A1A] text-zinc-300 font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLimit}
                disabled={updatingLimit}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{updatingLimit ? 'Saving...' : 'Save Limit'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsView;
