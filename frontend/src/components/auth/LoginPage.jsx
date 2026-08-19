import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, Eye, EyeOff, ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';

const LoginPage = () => {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
    <div className="min-h-screen w-full bg-[#000000] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-mono selection:bg-blue-600 selection:text-white">
      
      {/* Background Ambient Glow & Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0F0F0F_1px,transparent_1px),linear-gradient(to_bottom,#0F0F0F_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-[#080808] border border-[#262626] relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
        
        {/* Top Accent Strip */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-emerald-400 to-blue-600" />

        {/* Card Header & Brand */}
        <div className="p-8 pb-6 text-center space-y-3 border-b border-[#1A1A1A]">
          
          <div className="flex items-center justify-center gap-3">
            <img 
              src="/megatrix-icon.svg" 
              alt="MegaTrix" 
              className="h-9 w-auto object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="text-left">
              <span className="font-mono font-bold text-lg tracking-widest text-white uppercase block leading-none">
                MegaTrix
              </span>
              <span className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase mt-1 block">
                LeadEngine &amp; CRM
              </span>
            </div>
          </div>

          <div className="pt-2">
            <h1 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
              Sales Desk Secure Access
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Sign in to manage outbound leads, campaigns &amp; pipeline.
            </p>
          </div>

        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5" autoComplete="off">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in duration-200">
              <span className="font-bold shrink-0">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-semibold uppercase flex items-center justify-between">
              <span>Work Email</span>
              <span className="text-[10px] text-zinc-600">User ID</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                autoComplete="off"
                className="w-full pl-9 pr-3 py-2.5 bg-[#030303] border border-[#2B2B2B] focus:border-blue-500 focus:outline-none text-white text-xs font-mono transition-colors"
              />
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-semibold uppercase flex items-center justify-between">
              <span>Password</span>
              <span className="text-[10px] text-zinc-600">Protected</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="new-password"
                className="w-full pl-9 pr-10 py-2.5 bg-[#030303] border border-[#2B2B2B] focus:border-blue-500 focus:outline-none text-white text-xs font-mono transition-colors"
              />
              <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authenticating Session...</span>
              </>
            ) : (
              <>
                <span>Sign In to Platform</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </form>

        {/* Footer Security Badge */}
        <div className="px-8 py-3.5 bg-[#040404] border-t border-[#1A1A1A] flex items-center justify-between text-[10px] text-zinc-600 font-mono">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-zinc-400">Enterprise Encrypted</span>
          </div>
          <span>MegaTrix OS v1.0</span>
        </div>

      </div>

      {/* Legal / Copyright Footer */}
      <div className="mt-8 text-center text-xs text-zinc-600 font-mono">
        MegaTrix LeadEngine &amp; CRM &copy; 2026. All rights reserved.
      </div>

    </div>
  );
};

export default LoginPage;
