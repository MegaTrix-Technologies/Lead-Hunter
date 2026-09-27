import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut } from 'lucide-react';

const MIN_WIDTH = 1024;

const DeviceGate = ({ children }) => {
  const { user, isAuthenticated, isSuperAdmin, logout } = useAuth();
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= MIN_WIDTH);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= MIN_WIDTH);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Desktop always has access
  if (isDesktop) return children;

  // If not logged in yet, allow viewing login page so user can authenticate
  if (!isAuthenticated) return children;

  // If logged in and granted mobile access (or super admin), allow CRM access
  const hasMobilePermission = Boolean(
    isSuperAdmin ||
    user?.allowMobileAccess ||
    user?.role === 'superadmin' ||
    (user?.roles && Array.isArray(user.roles) && user.roles.includes('super_admin'))
  );

  if (hasMobilePermission) {
    return children;
  }

  // Otherwise, display the restricted desktop-only gate with sign out option
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 sm:px-8 text-center select-none font-sans">
      {/* Ambient subtle glow */}
      <div className="absolute w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className="relative mb-6">
        <img
          src="/megatrix-icon.svg"
          alt="MegaTrix Technologies"
          className="w-24 sm:w-28 drop-shadow-2xl mx-auto"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>

      {/* Heading */}
      <h1
        className="text-xl sm:text-2xl font-bold text-white tracking-wide mb-2"
        style={{ fontFamily: "'Orbitron', sans-serif" }}
      >
        Desktop Access Only
      </h1>

      {/* Message */}
      <p className="text-xs sm:text-sm text-zinc-400 max-w-xs sm:max-w-sm leading-relaxed mb-4">
        This workspace requires a laptop or desktop screen.
        Please switch to a device with a screen width of 1024px or larger.
      </p>

      {/* User info badge */}
      <div className="mb-6 px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-400 max-w-xs rounded">
        <div className="text-zinc-300 font-semibold truncate">
          Signed in as: <span className="text-white">{user?.name || user?.email}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={logout}
          className="px-4 py-2 bg-[#141414] hover:bg-rose-950/40 border border-zinc-700 hover:border-rose-600 text-xs font-mono text-zinc-300 hover:text-rose-300 flex items-center gap-2 cursor-pointer transition-all rounded"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Footer */}
      <div className="text-[10px] text-zinc-700 font-mono tracking-wider">
        MegaTrix Technologies &copy; 2026
      </div>
    </div>
  );
};

export default DeviceGate;
