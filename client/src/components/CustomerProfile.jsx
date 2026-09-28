import React, { useState, useEffect } from 'react';
import { Building2, Award, ShieldCheck, AlertCircle, CheckCircle2, History } from 'lucide-react';
import { fetchCustomerHistory } from '../services/api';

export default function CustomerProfile({ customerId = 'acme-corp' }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchCustomerHistory(customerId).then(setProfile).catch(console.error);
  }, [customerId]);

  if (!profile) return null;

  const { customerName, deals, stats } = profile;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Customer Header */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-slate-900 border border-blue-500/20 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{customerName} Profile</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {profile.customerId} • Enterprise Technology Segment</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-xs border border-amber-500/30">
            {stats.finalConfidence} CONFIDENCE
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold font-mono text-xs border border-emerald-500/30">
            {stats.sampleWins} W / {stats.sampleLosses} L ({stats.winRate}%)
          </span>
        </div>
      </div>

      {/* Grid: Successful Approaches & Risk Patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Successful Approaches */}
        <div className="bg-[#182030] border border-[#243048] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#243048] pb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Successful Negotiation Approaches</h3>
          </div>
          <ul className="text-xs text-slate-300 space-y-3 leading-relaxed">
            <li className="p-3 rounded-xl bg-[#121824] border border-[#243048]">
              <strong className="text-emerald-400 block mb-1">Pair Concessions with Support Packages</strong>
              Offering 8-10% discount paired with Premium Technical Support closed 100% of negotiations (DEAL-003, DEAL-005, DEAL-007).
            </li>
            <li className="p-3 rounded-xl bg-[#121824] border border-[#243048]">
              <strong className="text-emerald-400 block mb-1">2-Year Contract Commitment</strong>
              Multi-year terms resolved price resistance when onboarding support was bundled (DEAL-005, DEAL-008).
            </li>
          </ul>
        </div>

        {/* Risk Patterns */}
        <div className="bg-[#182030] border border-[#243048] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#243048] pb-3">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-white text-sm">Historical Failure / Risk Patterns</h3>
          </div>
          <ul className="text-xs text-slate-300 space-y-3 leading-relaxed">
            <li className="p-3 rounded-xl bg-[#121824] border border-[#243048]">
              <strong className="text-rose-400 block mb-1">Large Direct Price Discounts (&gt;15%)</strong>
              Granting direct discounts of 16-20% without support resulted in 100% deal losses (DEAL-001, DEAL-002, DEAL-004).
            </li>
            <li className="p-3 rounded-xl bg-[#121824] border border-[#243048]">
              <strong className="text-rose-400 block mb-1">Pure Price-Focused Negotiations</strong>
              Acme continues to demand lower pricing if value add (support) is not explicitly positioned.
            </li>
          </ul>
        </div>
      </div>

      {/* Customer Historical Deal Timeline */}
      <div className="bg-[#182030] border border-[#243048] rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          Acme Historical Episode History ({deals.length} Deals)
        </h3>

        <div className="divide-y divide-[#243048]">
          {deals.map(d => (
            <div key={d.deal_id} className="py-3 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-400">{d.deal_id}</span>
                  <span className="font-bold text-slate-200">{d.strategy}</span>
                </div>
                <div className="text-slate-400 italic font-mono text-[11px]">"{d.outcome_reason}"</div>
              </div>
              <div className="text-right">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  d.outcome === 'WON' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {d.outcome}
                </span>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">{d.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
