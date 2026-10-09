import React, { useEffect, useState } from 'react';
import { FlaskConical, ShieldCheck, Scale, Zap, Loader2, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { getNegotiations, simulateWhatIf } from '../../services/api';
import { formatCurrency } from '../../lib/format';

const TIERS = [
  { 
    key: 'conservative', 
    label: 'Conservative / Support-First', 
    factor: 0.4, 
    years: 1, 
    support: true, 
    tone: 'conservative',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'Low Risk',
    icon: ShieldCheck 
  },
  { 
    key: 'balanced', 
    label: 'Balanced / Multi-Year', 
    factor: 0.5, 
    years: 2, 
    support: true, 
    tone: 'balanced',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeText: 'Medium Risk',
    icon: Scale 
  },
  { 
    key: 'aggressive', 
    label: 'Aggressive / Price Cut', 
    factor: 0.9, 
    years: 1, 
    support: false, 
    tone: 'aggressive',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeText: 'High Risk',
    icon: Zap 
  }
];

export default function AdminStrategiesView() {
  const [deals, setDeals] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    getNegotiations()
      .then(d => {
        const list = Array.isArray(d) ? d : [];
        setDeals(list);
        if (list.length > 0) setSelectedId(list[0].deal_id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const deal = deals.find(d => d.deal_id === selectedId);

  useEffect(() => {
    if (!deal) return;
    let cancelled = false;
    setRunning(true);
    const requested = Number(deal.requested_discount_percent) || 20;
    Promise.all(TIERS.map(t => {
      const discount = Math.max(1, Math.round(requested * t.factor));
      return simulateWhatIf(deal.deal_id, {
        customer: deal.customer,
        segment: deal.segment,
        dealValue: Number(deal.initial_offer) || 100000,
        requestedDiscountPercent: requested,
        discountPercent: discount,
        contractYears: t.years,
        includeSupport: t.support
      }).then(res => [t.key, { ...res, discount }]).catch(() => [t.key, null]);
    })).then(pairs => {
      if (cancelled) return;
      const map = {};
      pairs.forEach(([k, v]) => { map[k] = v; });
      setResults(map);
      setRunning(false);
    });
    return () => { cancelled = true; };
  }, [selectedId, deals.length]);

  const tierColors = {
    conservative: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-200/60',
      text: 'text-emerald-700',
      textMuted: 'text-emerald-600',
      header: 'bg-emerald-500/10',
      accent: 'text-emerald-600',
      ring: 'ring-emerald-500/20',
      selected: 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/80'
    },
    balanced: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      badge: 'bg-indigo-500/10 text-indigo-700 border-indigo-200/60',
      text: 'text-blue-700',
      textMuted: 'text-blue-600',
      header: 'bg-blue-500/10',
      accent: 'text-blue-600',
      ring: 'ring-blue-500/20',
      selected: 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/80'
    },
    aggressive: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      badge: 'bg-rose-500/10 text-rose-700 border-rose-200/60',
      text: 'text-rose-700',
      textMuted: 'text-rose-600',
      header: 'bg-rose-500/10',
      accent: 'text-rose-600',
      ring: 'ring-rose-500/20',
      selected: 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-50/80'
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                  <FlaskConical className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-slate-900">Strategy Lab</h1>
                  <p className="text-xs text-slate-500">Compare negotiation strategies side-by-side</p>
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-400 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Deterministic economics engine
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <div className="h-48 rounded-xl bg-slate-50 animate-pulse" />
          </div>
        ) : deals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center">
              <FlaskConical className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">No negotiations available</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Import a dataset or start a negotiation first to compare strategy packages.
            </p>
          </div>
        ) : (
          <>
            {/* Deal Selector */}
            <div className="mb-6 bg-white rounded-2xl border border-slate-200 p-5">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Select negotiation to analyze
              </label>
              <div className="relative">
                <select
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pr-10 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                >
                  {deals.map(d => (
                    <option key={d.deal_id} value={d.deal_id}>
                      {d.customer} · {d.deal_id} · ${Number(d.initial_offer || 100000).toLocaleString()}
                    </option>
                  ))}
                </select>
                <ArrowRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              {deal && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="font-medium text-slate-700">Segment:</span> {deal.segment || 'N/A'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="font-medium text-slate-700">Requested:</span> {Number(deal.requested_discount_percent || 20)}% discount
                  </span>
                </div>
              )}
            </div>

            {/* Running State */}
            {running ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <div className="flex items-center gap-3 text-sm text-slate-500 mb-6">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span>Evaluating strategy packages with deterministic economics…</span>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {TIERS.map((t, i) => (
                    <div key={t.key} className="bg-slate-50 rounded-xl border border-slate-200 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="h-20 rounded-xl bg-slate-200/50" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Strategy Cards Grid */
              <div className="grid md:grid-cols-3 gap-5">
                {TIERS.map(t => {
                  const r = results[t.key];
                  const econ = r?.economics;
                  const colors = tierColors[t.tone];
                  const Icon = t.icon;

                  return (
                    <div
                      key={t.key}
                      className={`group relative bg-white rounded-2xl border-2 ${t.tone === 'conservative' ? 'border-emerald-200' : t.tone === 'balanced' ? 'border-blue-200' : 'border-rose-200'} shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden`}
                    >
                      {/* Header gradient bar */}
                      <div className={`h-1.5 ${t.tone === 'conservative' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : t.tone === 'balanced' ? 'bg-gradient-to-r from-blue-400 to-indigo-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`} />

                      <div className="p-5 space-y-5">
                        {/* Tier header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-9 h-9 rounded-lg ${colors.header} flex items-center justify-center`}>
                              <Icon className={`w-4 h-4 ${colors.accent}`} />
                            </div>
                            <span className={`text-xs font-bold ${colors.text}`}>
                              {t.label.split(' / ')[0]}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.badgeColor}`}>
                            {t.badgeText}
                          </span>
                        </div>

                        {/* Tier name & description */}
                        <h3 className="text-sm font-black text-slate-900 leading-tight">{t.label}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {t.label.includes('Multi') ? '2-year commitment locks in pricing' : t.support ? 'Premium support bundle protects margin' : 'Direct price reduction for speed'}
                        </p>

                        {/* Economics metrics */}
                        <div className="space-y-3 pt-2">
                          {[
                            { label: 'Discount', value: r ? `${r.discount}%` : '—', sub: t.factor === 0.4 ? '40% of request' : t.factor === 0.5 ? '50% of request' : '90% of request' },
                            { label: 'Net Revenue', value: econ ? formatCurrency(econ.netRevenueProposed) : '—', sub: 'After concession', highlight: true },
                            { label: 'Concession', value: econ ? formatCurrency(econ.proposedConcession) : '—', sub: 'Amount given up' },
                            { label: 'Retained', value: econ ? formatCurrency(econ.concessionSavings) : '—', sub: 'vs. requested', highlight: true },
                          ].map(([label, value, sub, highlight]) => (
                            <div key={label} className={`flex items-center justify-between p-3 rounded-xl ${highlight ? 'bg-slate-50 border border-slate-100' : 'bg-transparent'}`}>
                              <div>
                                <div className="text-xs font-semibold text-slate-600">{label}</div>
                                <div className="text-[10px] text-slate-400">{sub}</div>
                              </div>
                              <div className={`text-sm font-bold font-mono ${highlight ? 'text-slate-900' : colors.textMuted}`}>
                                {value}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Confidence / outcome indicator */}
                        {r?.reflection && (
                          <div className={`p-3.5 rounded-xl ${colors.bg} ${colors.border} border text-xs text-slate-700 leading-relaxed`}>
                            <div className="flex items-start gap-2">
                              <svg className={`w-4 h-4 ${colors.accent} shrink-0 mt-0.5`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {t.tone === 'conservative' ? (
                                  <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
                                ) : t.tone === 'balanced' ? (
                                  <><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-6"/></>
                                ) : (
                                  <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>
                                )}
                              </svg>
                              <span>{r.reflection}</span>
                            </div>
                          </div>
                        )}

                        {/* Strategy recommendation badge */}
                        {r && (
                          <div className={`text-center text-xs font-bold ${colors.text} ${colors.border} border rounded-lg py-1.5`}>
                            Recommended: {econ && econ.outcome === 'LIKELY_WIN' ? 'High Win Probability' : econ && econ.outcome === 'HIGH_MARGIN_RISK' ? 'Margin at Risk' : 'Moderate Outcome'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Comparison Summary */}
            {Object.keys(results).length === 3 && (
              <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Strategy Comparison Summary</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2.5 pr-4 font-bold text-slate-500">Metric</th>
                        {TIERS.map(t => (
                          <th key={t.key} className="text-center py-2.5 px-2 font-bold text-slate-500">{t.label.split(' / ')[0]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Discount %', getValue: (r, t) => `${r?.discount || '—'}%` },
                        { label: 'Net Revenue', getValue: (r) => formatCurrency(r?.economics?.netRevenueProposed), highlight: true },
                        { label: 'Concession', getValue: (r) => formatCurrency(r?.economics?.proposedConcession) },
                        { label: 'Retained', getValue: (r) => formatCurrency(r?.economics?.concessionSavings), highlight: true },
                        { label: 'Contract Term', getValue: (r, t) => `${t.years} year${t.years > 1 ? 's' : ''}` },
                        { label: 'Support', getValue: (r, t) => t.support ? 'Included' : 'Not included' },
                      ].map((row, i) => (
                        <tr key={row.label} className={i % 2 === 0 ? 'bg-slate-50/50' : ''}>
                          <td className="py-2.5 pr-4 font-medium text-slate-600">{row.label}</td>
                          {TIERS.map(t => {
                            const r = results[t.key];
                            const isHighlight = row.highlight;
                            return (
                              <td key={t.key} className={`text-center py-2.5 px-2 font-mono font-bold ${isHighlight ? 'text-slate-900' : 'text-slate-600'}`}>
                                {row.getValue(r, t)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
