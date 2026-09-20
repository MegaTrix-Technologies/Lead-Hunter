import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, Eye, EyeOff, ShieldCheck, ArrowRight, KeyRound, Info, X } from 'lucide-react';
import ParticleNetwork from './ParticleNetwork';

// ────────────────────────────────────────────────────────────
//  LoginPage Component
// ────────────────────────────────────────────────────────────
const LoginPage = () => {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showResetNotice, setShowResetNotice] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    const result = await login(email, password);
    if (!result.success) {
      setErrorMessage(result.message || 'Authentication failed. Check your email or password.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col lg:flex-row selection:bg-blue-500/30 selection:text-white overflow-hidden">

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  LEFT PANEL — Branding (60%)                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="relative w-full lg:w-[60%] h-[40vh] lg:h-screen bg-black flex items-center justify-center overflow-hidden">

        {/* Particle Network Background */}
        <ParticleNetwork className="absolute inset-0" />

        {/* Brand Content Overlay */}
        <div className="relative z-10 flex flex-col items-center pointer-events-none">

          {/* MT. Pixel Logo */}
          <div className="mb-8">
            <img
              src="/megatrix-icon.svg"
              alt="MegaTrix Technologies"
              className="w-64 lg:w-80 drop-shadow-2xl"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          {/* Brand Info */}
          <div className="text-center space-y-2">
            <p className="text-sm tracking-[0.3em] uppercase text-white/40 font-medium">
              Matrix Core System
            </p>
            <div className="w-20 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto" />
            <p className="text-xs text-white/25">
              Unified Workspace Platform
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  RIGHT PANEL — Login Form (40%)                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[40%] min-h-[60vh] lg:min-h-screen bg-[#0A0A0A] flex flex-col justify-center px-8 sm:px-12 lg:px-14 xl:px-16 py-12 relative overflow-y-auto border-l border-zinc-800/60">
        <div className="max-w-md w-full mx-auto space-y-7">

          {/* Mobile Brand Header (shown only on < lg) */}
          <div className="lg:hidden flex flex-col items-center mb-2 pb-6 border-b border-zinc-800">
            <div className="flex items-center gap-3 mb-3">
              <img
                src="/megatrix-icon.svg"
                alt="MegaTrix"
                className="h-10 w-auto object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div>
                <span className="font-bold text-lg tracking-widest text-white uppercase block leading-tight">
                  MEGATRIX
                </span>
                <span className="text-[9px] text-zinc-500 tracking-wider uppercase block">
                  TECHNOLOGIES
                </span>
              </div>
            </div>
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>

          {/* Brand Header */}
          <div className="space-y-3">
            <div className="tracking-wide select-none" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              <h2 className="text-[28px] sm:text-[32px] font-black tracking-wide text-white flex items-center flex-wrap gap-x-2.5">
                <span className="bg-gradient-to-r from-white via-neutral-100 to-neutral-200 bg-clip-text text-transparent">
                  MegaTrix
                </span>
                <span className="text-blue-500">
                  Technologies
                </span>
              </h2>
            </div>

            <div>
              <h1 className="text-lg font-extrabold text-white tracking-tight">
                Workspace Access
              </h1>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Sign in to access your workspace — leads, pipeline, closures &amp; development.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-start gap-2">
                <span className="font-bold shrink-0">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Enter Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#141414] border border-zinc-800 focus:border-blue-500 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#141414] border border-zinc-800 focus:border-blue-500 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Reset Password Prompt */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowResetNotice(!showResetNotice)}
                  className="text-[11px] text-zinc-500 hover:text-white transition-colors cursor-pointer hover:underline"
                >
                  Forgot / Reset Password?
                </button>
              </div>

              {/* Inline Password Reset Notice */}
              {showResetNotice && (
                <div className="p-3 bg-[#141414] border border-blue-500/30 rounded-lg text-xs flex items-start justify-between gap-2.5 mt-2">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-300 leading-relaxed">
                      Please contact your platform administrator to reset your password.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowResetNotice(false)}
                    className="text-zinc-500 hover:text-white transition-colors p-0.5 shrink-0 cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-white hover:bg-white/90 text-black font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-white/5 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Access Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Footer */}
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between text-[10px] text-zinc-600">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-zinc-400">Enterprise Encrypted</span>
              </div>
              <span>MegaTrix OS v1.0</span>
            </div>
            <p className="text-[10px] text-zinc-600/50 text-center">
              MegaTrix Technologies &copy; 2026. All rights reserved.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};

export default LoginPage;
