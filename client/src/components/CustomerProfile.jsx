import React, { useState, useEffect } from 'react';
import { Building2, Award, ShieldCheck, AlertCircle, CheckCircle2, History, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { fetchCustomerHistory } from '../services/api';

export default function CustomerProfile({ customerId = 'acme-corp' }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchCustomerHistory(customerId)
      .then(data => {
        setProfile(data);
      })
      .catch(err => {
        console.error('Failed to fetch customer history:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <Building2 className="w-8 h-8 mx-auto mb-2 animate-pulse text-indigo-500" />
        <p className="text-xs font-semibold">Loading customer negotiation history...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-400">
          <strong>Error loading profile:</strong> {error || 'Customer profile not found.'}
        </div>
      </div>
    );
  }

  const { customerName, deals = [], stats = {}, patterns = [] } = profile;
  const sampleWins = stats.sampleWins ?? stats.customerStats?.wins ?? 0;
  const sampleLosses = stats.sampleLosses ?? stats.customerStats?.losses ?? 0;
  const winRate = stats.winRate ?? stats.customerStats?.winRate ?? 0;
  const confidence = stats.finalConfidence || stats.confidence || 'NONE';

  const behaviorPatterns = patterns.filter(p => p.type === 'customer_behavior' || p.type === 'strategy_effectiveness');
  const riskPatterns = patterns.filter(p => p.type === 'competitor_insight' || p.type === 'segment_benchmark' || (p.confidence === 'LOW'));

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Customer Header */}
      <div className="bg-gradient-to-r from-brand-900/40 via-indigo-900/20 to-slate-900 border border-brand-500/20 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-600/20 border border-brand-500/40 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-brand-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{customerName} Profile</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {profile.customerId} • {profile.segment?.toUpperCase() || 'ENTERPRISE'} Segment</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-xl font-bold text-xs border ${
            confidence === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
            confidence === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
            'bg-slate-700/40 text-slate-400 border-slate-600/30'
          }`}>
            {confidence} CONFIDENCE
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold font-mono text-xs border border-emerald-500/30">
            {sampleWins} W / {sampleLosses} L ({winRate}%)
          </span>
        </div>
      </div>

      {/* Grid: Successful Approaches & Risk Patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Discovered Patterns */}
        <div className="bg-slate-50 dark:bg-[#182030] border border-slate-200 dark:border-[#243048] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#243048] pb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Discovered Behavioral Patterns</h3>
          </div>
          {behaviorPatterns.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic p-3">
              {deals.length === 0 ? 'No historical deal precedents recorded yet to extract behavioral patterns.' : 'Standard concession patterns apply.'}
            </p>
          ) : (
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-3 leading-relaxed">
              {behaviorPatterns.map((pat, idx) => (
                <li key={idx} className="p-3 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-[#243048]">
                  <strong className="text-emerald-600 dark:text-emerald-400 block mb-1">{pat.title}</strong>
                  <p>{pat.description}</p>
                  {pat.stat && <div className="mt-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">{pat.stat}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Risk & Segment Insights */}
        <div className="bg-slate-50 dark:bg-[#182030] border border-slate-200 dark:border-[#243048] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#243048] pb-3">
            <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Risk Factors & Segment Baselines</h3>
          </div>
          {riskPatterns.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic p-3">
              No historical risk factors or adverse patterns flagged for this account.
            </p>
          ) : (
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-3 leading-relaxed">
              {riskPatterns.map((pat, idx) => (
                <li key={idx} className="p-3 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-[#243048]">
                  <strong className="text-amber-600 dark:text-amber-400 block mb-1">{pat.title}</strong>
                  <p>{pat.description}</p>
                  {pat.stat && <div className="mt-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">{pat.stat}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Customer Historical Deal Timeline */}
      <div className="bg-slate-50 dark:bg-[#182030] border border-slate-200 dark:border-[#243048] rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
          <History className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          {customerName} Negotiation Episode History ({deals.length} {deals.length === 1 ? 'Deal' : 'Deals'})
        </h3>

        {deals.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            No historical negotiation episodes on file for {customerName}.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-[#243048]">
            {deals.map(d => (
              <div key={d.deal_id} className="py-3 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{d.deal_id}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{d.strategy}</span>
                  </div>
                  {d.outcome_reason && (
                    <div className="text-slate-500 dark:text-slate-400 italic font-mono text-[11px]">"{d.outcome_reason}"</div>
                  )}
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    d.outcome === 'WON' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}>
                    {d.outcome}
                  </span>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{d.date}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
