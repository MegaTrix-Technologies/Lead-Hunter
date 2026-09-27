import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, Eye, EyeOff, ShieldCheck, ArrowRight, KeyRound, Info, X, Lock } from 'lucide-react';
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
    <div className="min-h-screen w-full bg-black text-white flex flex-col lg:flex-row selection:bg-blue-500/30 selection:text-white font-sans relative overflow-x-hidden">

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  LEFT PANEL — Desktop Branding & Particle Network (60%)     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="relative hidden lg:flex lg:w-[55%] xl:w-[60%] h-screen bg-black items-center justify-center overflow-hidden shrink-0 sticky top-0">

        {/* Particle Network Background */}
        <ParticleNetwork className="absolute inset-0 w-full h-full" />

        {/* Ambient Subtle Glows */}
        <div className="absolute w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none -top-24 -left-24" />
        <div className="absolute w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none -bottom-24 -right-24" />

        {/* Brand Content Overlay */}
        <div className="relative z-10 flex flex-col items-center pointer-events-none px-8 text-center select-none">

          {/* MT. Pixel Logo */}
          <div className="mb-8">
            <img
              src="/megatrix-icon.svg"
              alt="MegaTrix Technologies"
              className="w-56 lg:w-64 xl:w-72 max-w-[80%] max-h-[38vh] object-contain drop-shadow-2xl"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          {/* Brand Info */}
          <div className="text-center space-y-2.5">
            <p className="text-xs sm:text-sm tracking-[0.3em] uppercase text-white/50 font-medium">
              Matrix Core System
            </p>
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent mx-auto" />
            <p className="text-xs text-white/40 tracking-wide">
              Unified Workspace Platform
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  MOBILE/TABLET BACKGROUND PARTICLES (Screens < lg)         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="lg:hidden absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <ParticleNetwork className="absolute inset-0 w-full h-full opacity-40" />
        <div className="absolute w-[350px] h-[350px] bg-blue-600/15 rounded-full blur-[90px] pointer-events-none top-0 left-1/2 -translate-x-1/2" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black pointer-events-none" />
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  FORM PANEL (Responsive across Mobile, Tablet, Desktop)    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="relative z-10 w-full lg:w-[45%] xl:w-[40%] min-h-screen lg:h-screen bg-transparent lg:bg-[#0A0A0A] flex flex-col justify-center px-4 sm:px-8 lg:px-12 xl:px-16 py-6 sm:py-10 lg:overflow-y-auto lg:border-l lg:border-zinc-800/60">
        
        <div className="max-w-md w-full mx-auto space-y-4 sm:space-y-6">

          {/* Top Brand Header — Stacked MT. -> MegaTrix -> Technologies on Mobile */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left space-y-2 sm:space-y-3 select-none">
            
            {/* Prominent Stacked MT. Logo on Mobile */}
            <div className="lg:hidden flex flex-col items-center justify-center mb-1">
              <img
                src="/megatrix-icon.svg"
                alt="MegaTrix"
                className="w-32 sm:w-40 h-auto max-h-24 sm:max-h-28 object-contain drop-shadow-[0_0_30px_rgba(59,130,246,0.45)] mb-2.5"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>

            {/* Stacked Brand Title on Mobile */}
            <div style={{ fontFamily: "'Orbitron', sans-serif" }} className="w-full">
              {/* Mobile View: Vertically Stacked Brand */}
              <div className="lg:hidden flex flex-col items-center leading-tight">
                <span className="text-2xl sm:text-3xl font-black tracking-widest text-white uppercase bg-gradient-to-r from-white via-neutral-100 to-neutral-200 bg-clip-text text-transparent">
                  MEGATRIX
                </span>
                <span className="text-lg sm:text-xl font-bold tracking-widest text-blue-500 uppercase mt-0.5">
                  TECHNOLOGIES
                </span>
              </div>

              {/* Desktop View: Inline Brand */}
              <h2 className="hidden lg:flex text-[28px] font-black tracking-wide text-white items-center flex-wrap gap-x-2">
                <span className="bg-gradient-to-r from-white via-neutral-100 to-neutral-200 bg-clip-text text-transparent">
                  MEGATRIX
                </span>
                <span className="text-blue-500">
                  TECHNOLOGIES
                </span>
              </h2>
            </div>

            {/* Workspace Access Subheader */}
            <div className="pt-1">
              <h1 className="text-sm sm:text-base font-bold text-zinc-200 tracking-wide uppercase font-mono">
                Workspace Access
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed max-w-sm">
                Sign in to access your CRM — leads, pipeline, closures &amp; development.
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-[#0C0C0C]/90 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none border border-zinc-800/80 lg:border-none p-5 sm:p-7 lg:p-0 rounded-xl lg:rounded-none shadow-2xl lg:shadow-none">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" autoComplete="off">

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-start gap-2 animate-in fade-in duration-200">
                  <span className="font-bold shrink-0">⚠️</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Enter Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-[#141414] border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="new-password"
                    className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-[#141414] border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Reset Password Prompt */}
                <div className="flex justify-end pt-0.5">
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
                  <div className="p-3 bg-[#141414] border border-blue-500/30 rounded-lg text-xs flex items-start justify-between gap-2.5 mt-2 animate-in fade-in duration-150">
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
                className="w-full py-3 sm:py-3.5 px-4 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-white/5 mt-2 active:scale-[0.99]"
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
          </div>

          {/* Footer */}
          <div className="space-y-2 pt-2 border-t border-zinc-800/60 font-mono text-center sm:text-left">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 flex-wrap gap-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-zinc-400">Enterprise Encrypted</span>
              </div>
              <span>MegaTrix OS v1.0</span>
            </div>
            <p className="text-[10px] text-zinc-600 text-center">
              MegaTrix Technologies &copy; 2026. All rights reserved.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};

export default LoginPage;
