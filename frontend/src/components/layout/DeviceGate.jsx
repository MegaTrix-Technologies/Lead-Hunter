import React, { useState, useEffect } from 'react';

const MIN_WIDTH = 1024;

const DeviceGate = ({ children }) => {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= MIN_WIDTH);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= MIN_WIDTH);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isDesktop) return children;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-8 text-center">

      {/* Logo */}
      <img
        src="/megatrix-icon.svg"
        alt="MegaTrix Technologies"
        className="w-28 mb-8 drop-shadow-2xl"
        onError={(e) => { e.target.style.display = 'none'; }}
      />

      {/* Heading */}
      <h1
        className="text-xl font-bold text-white tracking-wide mb-2"
        style={{ fontFamily: "'Orbitron', sans-serif" }}
      >
        Desktop Access Only
      </h1>

      {/* Message */}
      <p className="text-sm text-zinc-500 max-w-xs leading-relaxed mb-8">
        This workspace requires a laptop or desktop screen.
        Please switch to a device with a screen width of 1024px or larger.
      </p>

      {/* Footer */}
      <div className="text-[10px] text-zinc-700" style={{ fontFamily: "'Orbitron', sans-serif" }}>
        MegaTrix Technologies &copy; 2026
      </div>
    </div>
  );
};

export default DeviceGate;
