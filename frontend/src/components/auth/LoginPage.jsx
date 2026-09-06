import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, Eye, EyeOff, ShieldCheck, ArrowRight, KeyRound, Info, X } from 'lucide-react';

// ────────────────────────────────────────────────────────────
//  WebGL Atmosphere Shader — Deep Blue Ambient with Interactive Green Hover
// ────────────────────────────────────────────────────────────
const VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;
  void main() {
    v_texCoord = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 v_texCoord;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_hover;

  void main() {
    vec2 uv = v_texCoord;

    // Ambient deep blue glow centered behind the logo (around center-top)
    vec2 center = vec2(0.5, 0.58);
    float distCenter = length(uv - center);

    // Pure deep blue radial aura
    float blueFalloff = 1.0 - smoothstep(0.0, 0.65, distCenter);
    vec3 blueAmbient = vec3(0.09, 0.35, 0.92) * (blueFalloff * blueFalloff * 0.55);

    // Subtle technological cyber grid
    vec2 gridUv = fract(uv * vec2(28.0, 18.0));
    float gridLine = step(0.975, gridUv.x) + step(0.975, gridUv.y);
    vec3 gridColor = vec3(0.03, 0.07, 0.14) * gridLine;

    // Interactive Green Hover Effect
    // 1) Cursor spotlight that follows the mouse
    vec2 mouseCoord = u_mouse / u_resolution;
    float mouseDist = length(uv - mouseCoord);
    float mouseSpot = (1.0 - smoothstep(0.0, 0.35, mouseDist)) * u_hover;

    // 2) Radiant center bloom that expands when hovering
    float centerGreenBloom = (1.0 - smoothstep(0.0, 0.52, distCenter)) * u_hover;

    // 3) Grid highlights responding to cursor in green
    float gridGreenHighlight = gridLine * mouseSpot * 0.5;

    // Emerald Green Energy (#10B981)
    vec3 emeraldColor = vec3(0.06, 0.85, 0.52);
    vec3 greenField = emeraldColor * (centerGreenBloom * 0.38 + mouseSpot * 0.35 + gridGreenHighlight);

    // CRT scan lines (ultra subtle, 1.5% contrast)
    float scanline = sin(uv.y * 600.0) * 0.015;

    vec3 finalColor = blueAmbient + gridColor + greenField - scanline;
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function useShader(canvasRef, containerRef) {
  const mouseRef = useRef({ x: 0, y: 0 });
  const hoverRef = useRef(0);
  const targetHoverRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    function syncSize() {
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    const observer = new ResizeObserver(syncSize);
    observer.observe(canvas);
    syncSize();

    // Mouse & Hover Listeners
    const handlePointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = rect.height - (e.clientY - rect.top); // WebGL inverted Y
      targetHoverRef.current = 1.0;
    };

    const handlePointerEnter = () => {
      targetHoverRef.current = 1.0;
    };

    const handlePointerLeave = () => {
      targetHoverRef.current = 0.0;
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerenter', handlePointerEnter);
    container.addEventListener('pointerleave', handlePointerLeave);

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    function createShader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, createShader(gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(prog, createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');
    const uHover = gl.getUniformLocation(prog, 'u_hover');

    let animId;
    function render(t) {
      syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);

      // Smooth lerp hover factor
      hoverRef.current += (targetHoverRef.current - hoverRef.current) * 0.08;

      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);
      if (uHover) gl.uniform1f(uHover, hoverRef.current);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animId = requestAnimationFrame(render);
    }
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerenter', handlePointerEnter);
      container.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [canvasRef, containerRef]);
}

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
  const shaderCanvasRef = useRef(null);
  const leftPanelRef = useRef(null);

  useShader(shaderCanvasRef, leftPanelRef);

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
    <div className="min-h-screen w-full bg-black text-white flex flex-col lg:flex-row font-mono selection:bg-emerald-500/40 selection:text-white overflow-hidden">

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  LEFT PANEL — Branding Art (hidden on mobile / tablet)    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div 
        ref={leftPanelRef}
        className="hidden lg:flex w-1/2 h-screen relative flex-col items-center justify-center bg-black overflow-hidden select-none cursor-pointer group"
      >

        {/* WebGL Shader Background */}
        <canvas
          ref={shaderCanvasRef}
          className="absolute inset-0 w-full h-full z-0 opacity-90 transition-opacity duration-700 pointer-events-none"
          style={{ display: 'block' }}
        />

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col items-center px-8 transition-transform duration-500 ease-out group-hover:scale-[1.02]">

          {/* MT. Pixel Logo (using existing SVG) */}
          <div className="mb-8 relative transition-transform duration-500 ease-out group-hover:scale-105">
            {/* Ambient glow behind logo - Blue in default, transitions to vivid Emerald on hover */}
            <div className="absolute inset-0 -m-10 bg-blue-600/25 group-hover:bg-emerald-500/35 rounded-full blur-3xl transition-all duration-700 ease-out pointer-events-none" />
            
            {/* Subtle energetic aura ring on hover */}
            <div className="absolute inset-0 -m-6 border border-transparent group-hover:border-emerald-500/30 rounded-full transition-all duration-700 ease-out scale-90 group-hover:scale-125 opacity-0 group-hover:opacity-100 pointer-events-none" />

            <img
              src="/megatrix-icon.svg"
              alt="MegaTrix Technologies"
              className="h-28 w-auto object-contain relative z-10 drop-shadow-[0_0_25px_rgba(59,130,246,0.35)] group-hover:drop-shadow-[0_0_40px_rgba(16,185,129,0.85)] transition-all duration-500 ease-out"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          {/* Gradient Separator Line — transforms from Blue to Emerald & widens on hover */}
          <div className="h-px w-40 group-hover:w-60 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600 group-hover:from-emerald-500 group-hover:via-emerald-300 group-hover:to-emerald-500 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.8)] transition-all duration-500 ease-out mb-8" />

          {/* Brand Text — lights up with emerald glow on hover */}
          <h1 className="text-4xl xl:text-5xl font-bold tracking-[0.2em] uppercase text-white group-hover:text-emerald-50 group-hover:drop-shadow-[0_0_25px_rgba(16,185,129,0.5)] text-center mb-2 leading-tight transition-all duration-500">
            MEGATRIX
          </h1>
          <p className="text-[11px] tracking-[0.35em] group-hover:tracking-[0.45em] uppercase text-zinc-500 group-hover:text-emerald-400 font-mono transition-all duration-500">
            TECHNOLOGIES
          </p>

          {/* Tagline / System Status Badge */}
          <div className="mt-10 flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-zinc-800/80 group-hover:border-emerald-500/40 text-zinc-500 group-hover:text-emerald-300 text-[10px] tracking-widest uppercase transition-all duration-500">
            <span className="w-1.5 h-1.5 bg-blue-500 group-hover:bg-emerald-400 group-hover:shadow-[0_0_8px_#10B981] rounded-full transition-all duration-500" />
            <span className="font-semibold transition-colors duration-500">
              Matrix Core System
            </span>
          </div>
        </div>
      </div>

      {/* Vertical Separator (desktop only) */}
      <div className="hidden lg:block w-px h-screen bg-gradient-to-b from-transparent via-emerald-500/40 to-transparent" />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  RIGHT PANEL — Login Form                                 */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-1/2 h-screen bg-[#080808] flex flex-col justify-center px-6 sm:px-10 lg:px-16 xl:px-20 py-12 relative overflow-y-auto">
        <div className="max-w-md w-full mx-auto">

          {/* Mobile Brand Header (shown only on < lg) */}
          <div className="lg:hidden flex flex-col items-center mb-8 pb-6 border-b border-zinc-800">
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
            <div className="h-px w-24 bg-gradient-to-r from-blue-500 to-emerald-500" />
          </div>

          {/* Login Header */}
          <div className="mb-8 pb-5 border-b border-[#1A1A1A]">
            <h2 className="text-sm sm:text-base font-bold text-zinc-200 uppercase tracking-[0.15em] mb-2">
              Sales Desk Secure Access
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Sign in to manage outbound leads, campaigns &amp; pipeline.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in duration-200">
                <span className="font-bold shrink-0">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-semibold uppercase flex items-center justify-between tracking-wider">
                <span>Work Email</span>
                <span className="text-[10px] text-zinc-600 font-normal">User ID</span>
              </label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoComplete="off"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#030303] border border-[#2B2B2B] focus:border-blue-500 focus:outline-none text-white text-xs font-mono transition-all focus:shadow-[0_0_10px_rgba(59,130,246,0.15)]"
                />
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-semibold uppercase flex items-center justify-between tracking-wider">
                <span>Password</span>
                <span className="text-[10px] text-zinc-600 font-normal">Protected</span>
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="new-password"
                  className="w-full pl-9 pr-10 py-2.5 bg-[#030303] border border-[#2B2B2B] focus:border-blue-500 focus:outline-none text-white text-xs font-mono transition-all focus:shadow-[0_0_10px_rgba(59,130,246,0.15)]"
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

              {/* Reset Password Link */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowResetNotice(true)}
                  className="text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer hover:underline"
                >
                  Forgot / Reset Password?
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:opacity-50 mt-2"
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
          <div className="mt-8 pt-4 border-t border-[#1A1A1A] flex items-center justify-between text-[10px] text-zinc-600 font-mono">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-zinc-400">Enterprise Encrypted</span>
            </div>
            <span>MegaTrix OS v1.0</span>
          </div>

          {/* Copyright */}
          <div className="mt-6 text-center lg:text-left text-xs text-zinc-600 font-mono">
            MegaTrix Technologies — CRM &copy; 2026. All rights reserved.
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  Password Reset Notice Modal                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showResetNotice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-[#0D0D0D] border border-blue-500/50 shadow-[0_0_50px_rgba(37,99,235,0.2)] p-6 sm:p-7 space-y-4 font-mono">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-950/80 border border-blue-500/50 flex items-center justify-center text-blue-400">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Password Reset Notice
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    MegaTrix Enterprise Access Policy
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetNotice(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Body */}
            <div className="p-4 bg-[#050505] border border-[#222222] space-y-3 text-xs leading-relaxed text-zinc-300">
              <p className="font-semibold text-white">
                If you want to change or reset your password, please contact the administrator.
              </p>
              <p className="text-zinc-400 text-[11px]">
                For platform security, user password resets and credential assignments are centrally managed by system administrators.
              </p>
              <div className="pt-2 border-t border-[#1C1C1C] flex flex-col gap-1 text-[11px]">
                <span className="text-zinc-500 uppercase tracking-wide">Administrator Contact:</span>
                <span className="text-blue-400 font-bold select-all">sales@megatrixai.com</span>
              </div>
            </div>

            {/* Action */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowResetNotice(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Understood &bull; Back to Sign In
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LoginPage;
