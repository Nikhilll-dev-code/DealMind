import React from 'react';

export default function Input({
  label,
  helperText,
  error,
  icon: Icon,
  prefix,
  suffix,
  className = '',
  id,
  type = 'text',
  ...props
}) {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative rounded-xl shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        {prefix && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          type={type}
          className={`w-full bg-slate-50 dark:bg-slate-950/60 border ${
            error
              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
              : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-indigo-500'
          } rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 transition ${
            Icon ? 'pl-9' : prefix ? 'pl-8' : ''
          } ${suffix ? 'pr-8' : ''} ${className}`}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <p className="text-[11px] font-medium text-rose-500">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
}

export function Select({
  label,
  helperText,
  error,
  options = [],
  className = '',
  id,
  ...props
}) {
  const selectId = id || `select-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full bg-slate-50 dark:bg-slate-950/60 border ${
          error
            ? 'border-rose-500 focus:border-rose-500'
            : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500'
        } rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition capitalize ${className}`}
        {...props}
      >
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const lbl = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={val} value={val} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              {lbl}
            </option>
          );
        })}
      </select>
      {error && <p className="text-[11px] font-medium text-rose-500">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-slate-500 dark:text-slate-400">{helperText}</p>}
    </div>
  );
}
