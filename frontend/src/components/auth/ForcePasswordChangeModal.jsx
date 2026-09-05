import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, Eye, EyeOff, ArrowRight, LogOut } from 'lucide-react';

const ForcePasswordChangeModal = () => {
  const { user, changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Please enter your temporary/assigned initial password.');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md font-mono select-none">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0F0F0F_1px,transparent_1px),linear-gradient(to_bottom,#0F0F0F_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-md bg-[#090909] border border-amber-600/60 shadow-[0_0_60px_rgba(217,119,6,0.25)] overflow-hidden">
        
        {/* Top Accent Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-[#1E1E1E] text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-amber-950/60 border border-amber-500/50 flex items-center justify-center mx-auto text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Security Action Required
            </h2>
            <p className="text-xs text-amber-300/90 font-semibold mt-0.5">
              First-Time Login: Set Your Personal Password
            </p>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed pt-1">
            Welcome to MegaTrix, <span className="text-white font-bold">{user?.name}</span>! For account security, you must replace your temporary initial password before continuing.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4" autoComplete="off">
          
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in duration-150">
              <span className="font-bold shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Current Password Field */}
          <div className="space-y-1">
            <label className="block text-[11px] text-zinc-400 uppercase font-bold">
              Current Temporary Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Initial password provided by Admin"
                required
                className="w-full px-3 py-2 bg-black border border-zinc-700 text-white text-xs font-mono focus:border-amber-500 focus:outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-white cursor-pointer"
              >
                {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* New Password Field */}
          <div className="space-y-1">
            <label className="block text-[11px] text-zinc-400 uppercase font-bold">
              New Personal Password (Min. 6 characters)
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create your new secure password"
                required
                minLength={6}
                className="w-full px-3 py-2 bg-black border border-zinc-700 text-white text-xs font-mono focus:border-amber-500 focus:outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-white cursor-pointer"
              >
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-1">
            <label className="block text-[11px] text-zinc-400 uppercase font-bold">
              Confirm New Password
            </label>
            <input
              type={showNew ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              required
              minLength={6}
              className="w-full px-3 py-2 bg-black border border-zinc-700 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 space-y-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Saving New Password...</span>
                </>
              ) : (
                <>
                  <span>Save Password &amp; Enter Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={logout}
              className="w-full py-2 bg-transparent hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 text-xs font-mono transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cancel &amp; Sign Out</span>
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="px-6 py-2.5 bg-[#050505] border-t border-[#1E1E1E] text-[10px] text-zinc-600 text-center">
          MegaTrix Security Policy &bull; Passwords are encrypted with bcrypt
        </div>
      </div>
    </div>
  );
};

export default ForcePasswordChangeModal;
