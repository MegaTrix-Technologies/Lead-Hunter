import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  KeyRound, 
  Lock, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  LogOut, 
  Check, 
  AlertCircle,
  UserCheck
} from 'lucide-react';
import ParticleNetwork from './ParticleNetwork';

const ForcePasswordChangeModal = () => {
  const { user, changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Password strength calculation
  const strengthInfo = useMemo(() => {
    if (!newPassword) return { score: 0, label: '', color: 'bg-zinc-700', text: 'text-zinc-500' };
    
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 10) score += 1;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-rose-500', text: 'text-rose-400' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-400' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-blue-500', text: 'text-blue-400' };
      case 4:
        return { score: 4, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-400' };
      default:
        return { score: 0, label: '', color: 'bg-zinc-700', text: 'text-zinc-500' };
    }
  }, [newPassword]);

  // Validation rules status
  const rules = useMemo(() => {
    return {
      minLen: newPassword.length >= 6,
      different: newPassword.length > 0 && currentPassword.length > 0 && newPassword !== currentPassword,
      matches: newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword
    };
  }, [currentPassword, newPassword, confirmPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Please enter your temporary initial password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Your new password must be at least 6 characters long.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Your new password must be different from your current temporary password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (!res.success) {
        setError(res.message || 'Failed to update password. Please check your current password.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while updating your password.');
    } finally {
      setSubmitting(false);
    }
  };

  // Get primary role title for display
  const userRoleLabel = useMemo(() => {
    if (!user) return 'Authorized User';
    if (user.roles?.includes('super_admin') || user.role === 'superadmin') return 'Super Administrator';
    if (user.roles?.includes('sales_closer')) return 'Sales Closer';
    if (user.roles?.includes('developer')) return 'Developer';
    if (user.roles?.includes('sales_agent')) return 'Sales Specialist';
    return 'Team Member';
  }, [user]);

  return (
    <div className="min-h-screen lg:h-screen w-full bg-black text-white flex flex-col lg:flex-row selection:bg-blue-500/30 selection:text-white overflow-y-auto lg:overflow-hidden font-sans">
      
      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  LEFT PANEL — Desktop Branding & Particle Network (60%)     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="relative hidden lg:flex lg:w-[55%] xl:w-[60%] h-full bg-black items-center justify-center overflow-hidden shrink-0">
        
        {/* Interactive Particle Network */}
        <ParticleNetwork className="absolute inset-0 w-full h-full" />

        {/* Ambient Subtle Glows */}
        <div className="absolute w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none -top-24 -left-24" />
        <div className="absolute w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none -bottom-24 -right-24" />

        {/* Brand Content Overlay */}
        <div className="relative z-10 flex flex-col items-center pointer-events-none px-8 text-center select-none">
          <div className="mb-8">
            <img
              src="/megatrix-icon.svg"
              alt="MegaTrix Technologies"
              className="w-56 lg:w-64 xl:w-72 max-w-[80%] max-h-[38vh] object-contain drop-shadow-2xl"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          <div className="text-center space-y-2.5">
            <p className="text-xs sm:text-sm tracking-[0.3em] uppercase text-white/40 font-medium">
              Matrix Core System
            </p>
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent mx-auto" />
            <p className="text-xs text-white/30 tracking-wide">
              Enterprise Workspace Security &bull; Zero Trust Protocol
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  MOBILE/TABLET HEADER — Shown only on screens < lg          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="lg:hidden relative w-full h-36 sm:h-44 bg-black flex flex-col items-center justify-center overflow-hidden border-b border-zinc-800/80 shrink-0">
        <ParticleNetwork className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-[#0A0A0A] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center pointer-events-none px-4 text-center">
          <img
            src="/megatrix-icon.svg"
            alt="MegaTrix"
            className="h-12 sm:h-14 w-auto object-contain drop-shadow-xl mb-2"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="flex items-center gap-1.5" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            <span className="font-black text-sm tracking-wider text-white uppercase">
              MegaTrix
            </span>
            <span className="font-bold text-sm tracking-wider text-blue-500 uppercase">
              Technologies
            </span>
          </div>
          <span className="text-[9px] text-zinc-400 tracking-wider uppercase block mt-0.5">
            Matrix Core System &bull; Security Setup
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  RIGHT PANEL — Password Setup Form (40%)                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex-1 lg:h-full bg-[#0A0A0A] flex flex-col justify-between px-6 sm:px-10 lg:px-10 xl:px-14 py-6 sm:py-8 lg:overflow-y-auto border-l border-zinc-800/60">
        <div className="max-w-md w-full mx-auto my-auto space-y-5 py-2">

          {/* Header & Security Badge */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[11px] font-medium tracking-wide">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Security Onboarding</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">Step 1 of 1</span>
            </div>

            <div className="hidden lg:block tracking-wide select-none" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              <h2 className="text-2xl xl:text-[26px] font-black tracking-wide text-white flex items-center flex-wrap gap-x-2">
                <span className="bg-gradient-to-r from-white via-neutral-100 to-neutral-200 bg-clip-text text-transparent">
                  MegaTrix
                </span>
                <span className="text-blue-500">
                  Technologies
                </span>
              </h2>
            </div>

            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Set Your Personal Password
              </h1>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Welcome to MegaTrix, <span className="text-white font-semibold">{user?.name || 'Agent'}</span>. For account security, please replace your temporary password with a secure personal password.
              </p>
            </div>

            {/* Authenticated Account Pill */}
            {user?.email && (
              <div className="p-2.5 bg-[#121212] border border-zinc-800/80 rounded-lg flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-zinc-200 font-medium truncate text-[12px]">{user?.name || 'Authorized Account'}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                  </div>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
                  {userRoleLabel}
                </span>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            
            {/* Error Banner */}
            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-lg text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Current Temporary Password */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Current Temporary Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Temporary password provided by Admin"
                  required
                  autoComplete="off"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#141414] border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer p-0.5"
                  title={showCurrent ? 'Hide password' : 'Show password'}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Personal Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  New Personal Password
                </label>
                {strengthInfo.label && (
                  <span className={`text-[10px] font-semibold ${strengthInfo.text}`}>
                    {strengthInfo.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create your new secure password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#141414] border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer p-0.5"
                  title={showNew ? 'Hide password' : 'Show password'}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        step <= strengthInfo.score ? strengthInfo.color : 'bg-zinc-800'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Confirm New Password
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#141414] border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer p-0.5"
                  title={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Criteria Checklist */}
            <div className="p-3 bg-[#121212]/80 border border-zinc-800/80 rounded-lg space-y-1.5 text-[11px]">
              <div className={`flex items-center gap-2 transition-colors ${rules.minLen ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {rules.minLen ? <Check className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-zinc-700 flex items-center justify-center text-[9px] shrink-0">&bull;</span>}
                <span>At least 6 characters</span>
              </div>
              <div className={`flex items-center gap-2 transition-colors ${rules.different ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {rules.different ? <Check className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-zinc-700 flex items-center justify-center text-[9px] shrink-0">&bull;</span>}
                <span>Different from temporary password</span>
              </div>
              <div className={`flex items-center gap-2 transition-colors ${rules.matches ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {rules.matches ? <Check className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-zinc-700 flex items-center justify-center text-[9px] shrink-0">&bull;</span>}
                <span>Passwords match</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-lg bg-white hover:bg-white/90 text-black font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-white/5 active:scale-[0.99]"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Updating Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Save Password &amp; Enter Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={logout}
                className="w-full py-2.5 px-4 rounded-lg border border-zinc-800/80 hover:border-zinc-700 bg-transparent hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cancel &amp; Sign Out</span>
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="space-y-3 pt-3 border-t border-zinc-800/80">
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-zinc-400">Enterprise Encrypted (bcrypt 256-bit)</span>
              </div>
              <span>MegaTrix OS v1.0</span>
            </div>
            <p className="text-[10px] text-zinc-600/60 text-center">
              MegaTrix Technologies &copy; 2026. All rights reserved.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};

export default ForcePasswordChangeModal;
