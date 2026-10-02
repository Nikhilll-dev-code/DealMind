import React from 'react';

export default function Card({ children, className = '', hover = false, onClick, ...props }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm dark:shadow-none transition-all duration-200 ${
        hover ? 'hover:border-indigo-500/40 dark:hover:border-indigo-500/40 hover:shadow-md cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', action }) {
  return (
    <div className={`px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4 ${className}`}>
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 rounded-b-2xl flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}
