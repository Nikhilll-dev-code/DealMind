import React, { useEffect, useState } from 'react';
import { Search, ShieldCheck, Calculator, Sparkles, Check } from 'lucide-react';

/**
 * Customer-safe high-level activity trace (spec §5).
 * Never exposes prompts, chain-of-thought, keys, or internal reasoning.
 */
export const SAFE_TRACE_STEPS = [
  { key: 'evidence', label: 'Retrieving comparable deals', detail: 'Searching retained negotiation memory', icon: Search },
  { key: 'guardrails', label: 'Checking company guardrails', detail: 'Verifying approved negotiation limits', icon: ShieldCheck },
  { key: 'economics', label: 'Evaluating economics', detail: 'Computing concession and net value', icon: Calculator },
  { key: 'recommendation', label: 'Preparing recommendation', detail: 'Assembling an evidence-grounded response', icon: Sparkles }
];

export default function IntelligenceTrace({ running = false, completed = false, compact = false }) {
  const [active, setActive] = useState(completed ? SAFE_TRACE_STEPS.length : 0);

  useEffect(() => {
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setActive(SAFE_TRACE_STEPS.length);
      return;
    }
    if (!running) {
      if (completed) setActive(SAFE_TRACE_STEPS.length);
      return;
    }
    setActive(0);
    const t = setInterval(() => {
      setActive(prev => (prev < SAFE_TRACE_STEPS.length ? prev + 1 : prev));
    }, 620);
    return () => clearInterval(t);
  }, [running, completed]);

  return (
    <div className={`space-y-2 ${compact ? '' : 'p-1'}`}>
      {SAFE_TRACE_STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = i < active || (completed && active >= SAFE_TRACE_STEPS.length);
        const isActive = running && i === active;
        return (
          <div
            key={s.key}
            className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-500 ${
              done
                ? 'border-emerald-200 bg-emerald-50/60'
                : isActive
                ? 'border-dm-blue/40 bg-dm-tint shadow-sm'
                : 'border-dm-border bg-white opacity-70'
            }`}
          >
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 relative ${
              done ? 'bg-emerald-500 text-white' : isActive ? 'bg-dm-blue text-white' : 'bg-dm-subtle text-dm-muted'
            }`}>
              {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              {isActive && <span className="absolute inset-0 rounded-lg bg-dm-blue animate-pulse-ring" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className={`text-xs font-bold ${done ? 'text-emerald-800' : 'text-dm-ink'}`}>{s.label}</div>
              {!compact && <div className="text-[10px] text-dm-muted truncate">{s.detail}</div>}
            </div>
            {isActive && (
              <span className="flex gap-0.5">
                {[0, 1, 2].map(d => (
                  <span key={d} className="w-1 h-1 rounded-full bg-dm-blue animate-bounce" style={{ animationDelay: `${d * 120}ms` }} />
                ))}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
