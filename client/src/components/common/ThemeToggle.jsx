import React from 'react';

/**
 * A sleek animated toggle switch for theme switching.
 * Light-first design: the toggle itself carries the theme identity
 * without relying on a heavy icon background.
 */
export default function ThemeToggle({ isDark, onToggle, className = '' }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
        isDark
          ? 'bg-indigo-500/80 hover:bg-indigo-400'
          : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600'
      } ${className}`}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {/* Track glow */}
      <span
        className={`absolute inset-0 rounded-full transition-opacity duration-300 ${
          isDark ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          boxShadow: isDark
            ? '0 0 0 0px rgba(99,102,241,0)'
            : '0 0 8px rgba(148,163,184,0.4)'
        }}
      />

      {/* Knob */}
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ease-out ${
          isDark ? 'translate-x-5' : 'translate-x-0.5'
        }`}
        style={{
          boxShadow: isDark
            ? '0 2px 8px rgba(0,0,0,0.3)'
            : '0 2px 6px rgba(0,0,0,0.12)'
        }}
      >
        {/* Sun/Moon indicator inside knob */}
        <span
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isDark ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ fontSize: '9px' }}
        >
          {isDark ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-amber-400">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : null}
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isDark ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ fontSize: '9px' }}
        >
          {!isDark ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-indigo-500">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : null}
        </span>
      </span>

      {/* Subtle tick marks for dark mode */}
      {isDark && (
        <span
          className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-indigo-400/30 transition-opacity duration-300"
          style={{ opacity: 0.6 }}
        />
      )}
    </button>
  );
}
