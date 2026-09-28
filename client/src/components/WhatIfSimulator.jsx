import React, { useState, useMemo } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { simulateWhatIf } from '../services/api';

export default function WhatIfSimulator({ currentDeal }) {
  const baseDealValue = Math.max(1, Number(currentDeal?.dealValue) || 100000);
  const baseRequestedDiscount = Number(currentDeal?.requestedDiscountPercent) || 20;

  const [discountPercent, setDiscountPercent] = useState(
    Math.max(1, Math.round(baseRequestedDiscount * 0.4))
  );
  const [contractYears, setContractYears] = useState(Number(currentDeal?.contractYears) || 1);
  const [includeSupport, setIncludeSupport] = useState(true);
  const [competitorPressure, setCompetitorPressure] = useState(Boolean(currentDeal?.competitorPressure));
  const [evidenceCtx, setEvidenceCtx] = useState(null);
  const [loading, setLoading] = useState(false);

  // Live deterministic calc
  const economics = useMemo(() => {
    const requested = Math.round((baseDealValue * baseRequestedDiscount) / 100);
    const proposed = Math.round((baseDealValue * discountPercent) / 100);
    const net = baseDealValue - proposed;
    const saved = requested - proposed;
    const supportCost = includeSupport ? Math.round(baseDealValue * 0.02) : 0;
    return {
      requestedConcession: requested,
      proposedConcession: proposed,
      saved,
      netRevenue: net,
      effectiveNet: net - supportCost,
      totalContractValue: net * contractYears,
      supportCost
    };
  }, [baseDealValue, baseRequestedDiscount, discountPercent, contractYears, includeSupport]);

  const handleFetchEvidence = async () => {
    setLoading(true);
    try {
      const res = await simulateWhatIf(currentDeal?.dealId || 'DEAL-003', {
        dealValue: baseDealValue,
        discountPercent,
        contractYears,
        includeSupport,
        competitorPressure,
        requestedDiscountPercent: baseRequestedDiscount,
        customer: currentDeal?.customer || 'Acme Corp',
        segment: currentDeal?.segment || 'enterprise'
      });
      setEvidenceCtx(res.evidenceContext || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (!currentDeal) {
    return (
      <div className="p-12 text-center text-slate-400">
        <SlidersHorizontal className="w-10 h-10 mx-auto text-slate-600 mb-3" />
        <p className="text-sm">Run an analysis first to use the What-If Simulator.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <SlidersHorizontal className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-white">What-If Simulator</h2>
        </div>
        <p className="text-slate-400 text-sm">Adjust scenario parameters to recalculate concession economics instantly for <strong className="text-white">{currentDeal.customer}</strong> (${baseDealValue.toLocaleString()} deal).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="bg-[#182030] border border-[#243048] rounded-2xl p-6 space-y-6">
          <h3 className="font-bold text-white text-sm border-b border-[#243048] pb-3">Scenario Controls</h3>

          {/* Discount Slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs font-semibold text-slate-300">Proposed Discount</span>
              <span className="font-mono font-bold text-blue-400 text-sm">{discountPercent}%</span>
            </div>
            <input type="range" min="0" max="50" value={discountPercent}
              onChange={e => setDiscountPercent(Number(e.target.value))}
              className="w-full accent-blue-500 h-2 bg-[#0f1622] rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0% — No discount</span>
              <span>10% — Optimal</span>
              <span>50% — Severe</span>
            </div>
          </div>

          {/* Contract Years */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs font-semibold text-slate-300">Contract Term</span>
              <span className="font-mono font-bold text-purple-400 text-sm">{contractYears} {contractYears === 1 ? 'year' : 'years'}</span>
            </div>
            <input type="range" min="1" max="5" value={contractYears}
              onChange={e => setContractYears(Number(e.target.value))}
              className="w-full accent-purple-500 h-2 bg-[#0f1622] rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Toggles */}
          {[
            { label: 'Include Premium Support Package', sub: 'Adds ~2% of deal as support cost', val: includeSupport, set: setIncludeSupport },
            { label: 'Competitor Pressure Present', sub: 'Active competitor bidding on this deal', val: competitorPressure, set: setCompetitorPressure },
          ].map(({ label, sub, val, set }) => (
            <div key={label} className="flex items-center justify-between p-3.5 rounded-xl bg-[#0f1622] border border-[#243048]">
              <div>
                <div className="text-xs font-bold text-white">{label}</div>
                <div className="text-[11px] text-slate-500">{sub}</div>
              </div>
              <button onClick={() => set(p => !p)}
                className={`w-10 h-5.5 rounded-full border transition relative ${val ? 'bg-blue-600 border-blue-500' : 'bg-slate-700 border-slate-600'}`}
                style={{ height: '22px', width: '42px' }}
              >
                <span className={`absolute top-0.5 transition-all rounded-full w-4 h-4 bg-white shadow ${val ? 'left-5.5' : 'left-0.5'}`}
                  style={{ left: val ? '22px' : '2px' }} />
              </button>
            </div>
          ))}

          <button onClick={handleFetchEvidence} disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition">
            {loading ? 'Fetching Evidence...' : 'Refresh Historical Context'}
          </button>
        </div>

        {/* Live Results */}
        <div className="space-y-4">
          <div className="bg-[#182030] border border-[#243048] rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-[#243048] pb-3">
              <h3 className="font-bold text-white text-sm">Live Economics</h3>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Deterministic</span>
            </div>
            {[
              { label: `Requested ${baseRequestedDiscount}% concession`, val: `-$${economics.requestedConcession.toLocaleString()}`, cls: 'text-rose-400' },
              { label: `Simulated ${discountPercent}% concession`, val: `-$${economics.proposedConcession.toLocaleString()}`, cls: 'text-blue-400' },
              ...(includeSupport ? [{ label: 'Support package cost', val: `-$${economics.supportCost.toLocaleString()}`, cls: 'text-amber-400' }] : []),
            ].map(({ label, val, cls }) => (
              <div key={label} className="flex items-center justify-between text-xs p-3 rounded-lg bg-[#0f1622]">
                <span className="text-slate-400">{label}</span>
                <span className={`font-mono font-bold ${cls}`}>{val}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-xs p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div>
                <span className="font-bold text-emerald-300 block">Potential revenue retained</span>
                <span className="text-[10px] text-emerald-500">less in discount vs requested {baseRequestedDiscount}%</span>
              </div>
              <span className="font-mono text-xl font-extrabold text-emerald-400">+${economics.saved.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <span className="text-purple-300 font-bold">{contractYears}yr Total Contract Value</span>
              <span className="font-mono font-bold text-purple-300">${economics.totalContractValue.toLocaleString()}</span>
            </div>
          </div>

          {/* Evidence Context */}
          {evidenceCtx && (
            <div className="bg-[#182030] border border-[#243048] rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Recalled Evidence Context</h4>
              {evidenceCtx.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No comparable historical context found.</p>
              ) : evidenceCtx.map(m => (
                <div key={m.dealId} className="p-3 rounded-xl bg-[#0f1622] border border-[#243048] text-xs">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-200">[{m.dealId}] {m.customer}</span>
                    <span className={m.outcome === 'WON' ? 'text-emerald-400' : 'text-rose-400'}>{m.outcome}</span>
                  </div>
                  <p className="text-slate-400 mt-1">{m.strategy}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
