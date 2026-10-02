import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 focus:ring-indigo-500 active:bg-indigo-700',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700 focus:ring-slate-500',
    outline: 'bg-transparent border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-slate-400',
    ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 focus:ring-slate-400',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 focus:ring-rose-500 active:bg-rose-700',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 focus:ring-emerald-500 active:bg-emerald-700'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-xs gap-2',
    lg: 'px-5 py-2.5 text-sm gap-2.5'
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
