import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback(({ title, message, type = 'info', duration = 4000 }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newToast = { id, title, message, type };
    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (title, message) => addToast({ title, message, type: 'success' }),
    error: (title, message) => addToast({ title, message, type: 'error' }),
    warning: (title, message) => addToast({ title, message, type: 'warning' }),
    info: (title, message) => addToast({ title, message, type: 'info' })
  };

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast }}>
      {children}
      {/* Fixed Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(t => {
          const typeStyles = {
            success: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100 dark:bg-emerald-950/90 dark:border-emerald-500/40 dark:text-emerald-100',
            error: 'bg-rose-950/90 border-rose-500/40 text-rose-100 dark:bg-rose-950/90 dark:border-rose-500/40 dark:text-rose-100',
            warning: 'bg-amber-950/90 border-amber-500/40 text-amber-100 dark:bg-amber-950/90 dark:border-amber-500/40 dark:text-amber-100',
            info: 'bg-slate-900/95 border-indigo-500/40 text-slate-100 dark:bg-slate-900/95 dark:border-indigo-500/40 dark:text-slate-100'
          };
          const Icon = {
            success: CheckCircle2,
            error: AlertCircle,
            warning: AlertTriangle,
            info: Info
          }[t.type] || Info;

          const iconColor = {
            success: 'text-emerald-400',
            error: 'text-rose-400',
            warning: 'text-amber-400',
            info: 'text-indigo-400'
          }[t.type];

          return (
            <div
              key={t.id}
              className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-md shadow-2xl flex items-start gap-3 transition-all transform duration-200 animate-in slide-in-from-bottom-3 ${typeStyles[t.type]}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                {t.title && <div className="text-xs font-bold tracking-tight">{t.title}</div>}
                {t.message && <div className="text-[11px] opacity-90 mt-0.5 leading-relaxed">{t.message}</div>}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="opacity-70 hover:opacity-100 p-1 rounded-lg transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}
