import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, message, type = 'info', duration = 4000 }) => {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setToasts(prev => [...prev, { id, title, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none px-4">
        <AnimatePresence>
          {toasts.map(toast => {
            const icons = {
              success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
              warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
              error: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
              info: <Info className="w-5 h-5 text-blue-400 shrink-0" />
            };

            const borders = {
              success: 'border-emerald-500/40 bg-[#0A0A0A]',
              warning: 'border-amber-500/40 bg-[#0A0A0A]',
              error: 'border-rose-500/40 bg-[#0A0A0A]',
              info: 'border-blue-500/40 bg-[#0A0A0A]'
            };

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.9 }}
                className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-none border shadow-2xl ${borders[toast.type] || borders.info}`}
              >
                <div className="flex items-start gap-3">
                  {icons[toast.type] || icons.info}
                  <div>
                    {toast.title && <h4 className="text-sm font-semibold text-white font-mono tracking-wide">{toast.title}</h4>}
                    {toast.message && <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{toast.message}</p>}
                  </div>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
