import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-xl',
  showClose = true
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity animate-in fade-in"
      />

      {/* Dialog Window */}
      <div
        className={`relative w-full ${maxWidth} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150`}
      >
        {(title || showClose) && (
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              {title && <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl ${className}`} />
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="p-12 text-center flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-1">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h4>
      {description && <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-center space-y-2 max-w-md mx-auto">
      <div className="text-xs font-bold text-rose-700 dark:text-rose-300">Operation Error</div>
      <p className="text-xs text-rose-600 dark:text-rose-400/90 leading-relaxed">{error || 'An unexpected error occurred.'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
