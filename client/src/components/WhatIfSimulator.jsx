import React, { useState, useMemo, useEffect } from 'react';
import {
  SlidersHorizontal,
  Sparkles,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Scale,
  RotateCcw
} from 'lucide-react';
import Card from './common/Card';
import Button from './common/Button';
import { simulateWhatIf } from '../services/api';

export default function WhatIfSimulator({ currentDeal, onAdoptScenario = null }) {
  const baseDealValue = Math.max(1, Number(currentDeal?.dealValue || currentDeal?.deal_value || currentDeal?.initialOffer || 100000));
  const baseRequestedDiscount = Number(currentDeal?.requestedDiscountPercent || currentDeal?.requested_discount_percent || 20);
  const approvalThreshold = 15;

  // Deterministic economics helper (mirrors server economics so comparisons stay reproducible)
  function economicsFor(sc) {
    const requested = Math.round((baseDealValue * baseRequestedDiscount) / 100);
    const proposed = Math.round((baseDealValue * sc.discountPercent) / 100);
    const netAnnual = baseDealValue - proposed;
    const saved = requested - proposed;
    const supportCost = sc.includeSupport ? Math.round(baseDealValue * 0.02) : 0;
    const tcv = netAnnual * sc.contractYears;
    const requiresApproval = sc.discountPercent > approvalThreshold;

    let outcome = 'MODERATE_WIN_PROBABILITY';
    if (sc.discountPercent <= 10 && sc.includeSupport) {
      outcome = 'LIKELY_WIN';
    } else if (sc.discountPercent > 15) {
      outcome = 'HIGH_MARGIN_RISK';
    }

    return {
      requestedConcession: requested,
      proposedConcession: proposed,
      concessionSavings: saved,
      netAnnualRevenue: netAnnual,
      effectiveNetValue: netAnnual - supportCost,
      totalContractValue: tcv,
      supportCost,
      requiresApproval,
      outcome
    };
  }

  // Multi-scenario state
  const [scenarios, setScenarios] = useState([
    {
      id: 'sc_conservative',
      name: 'Scenario A: Support First',
      discountPercent: Math.max(1, Math.round(baseRequestedDiscount * 0.4)),
      contractYears: 1,
      includeSupport: true,
      giveGetNotes: 'Bundle premium onboarding to protect pricing'
    },
    {
      id: 'sc_multi_year',
      name: 'Scenario B: Multi-Year Lock',
      discountPercent: Math.max(2, Math.round(baseRequestedDiscount * 0.5)),
      contractYears: 2,
      includeSupport: true,
      giveGetNotes: '2-Year contract commitment in exchange for 10% discount'
    },
    {
      id: 'sc_aggressive',
      name: 'Scenario C: Price Driven',
      discountPercent: Math.max(3, Math.round(baseRequestedDiscount * 0.8)),
      contractYears: 1,
      includeSupport: false,
      giveGetNotes: 'Direct price concession without support overhead'
    }
  ]);

  const [activeScenarioId, setActiveScenarioId] = useState('sc_conservative');
  const [simulationCache, setSimulationCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);

  // Deterministic preview for all scenarios (instant, no server call)
  const scenariosWithEconomics = useMemo(() =>
    scenarios.map(sc => ({
      ...sc,
      economics: economicsFor(sc)
    })),
  [scenarios]);

  const activeScenario = scenariosWithEconomics.find(s => s.id === activeScenarioId) || scenariosWithEconomics[0];

  const handleUpdateActiveScenario = (updates) => {
    setScenarios(prev => prev.map(s => s.id === activeScenarioId ? { ...s, ...updates } : s));
  };

  const handleAddScenario = () => {
    if (scenarios.length >= 4) return;
    const newId = `sc_custom_${Date.now()}`;
    const newSc = {
      id: newId,
      name: `Scenario ${String.fromCharCode(65 + scenarios.length)}: Custom`,
      discountPercent: 12,
      contractYears: 1,
      includeSupport: true,
      giveGetNotes: 'Custom concession trade-off'
    };
    setScenarios(prev => [...prev, newSc]);
    setActiveScenarioId(newId);
  };

  const handleDeleteScenario = (id) => {
    if (scenarios.length <= 1) return;
    setScenarios(prev => prev.filter(s => s.id !== id));
    if (activeScenarioId === id) {
      setActiveScenarioId(scenarios[0].id);
    }
  };

  const handleSimulateDeep = async () => {
    setLoading(true);
    setError(null);
    try {
      const dealId = currentDeal?.dealId || currentDeal?.deal_id || 'DEAL-003';
      const res = await simulateWhatIf(dealId, {
        dealValue: baseDealValue,
        discountPercent: activeScenario.discountPercent,
        contractYears: activeScenario.contractYears,
        includeSupport: activeScenario.includeSupport,
        requestedDiscountPercent: baseRequestedDiscount,
        customer: currentDeal?.customer || 'Customer',
        segment: currentDeal?.segment || 'enterprise'
      });
      setSimulationCache(prev => ({ ...prev, [activeScenario.id]: res }));
    } catch (e) {
      console.error('Simulation error:', e);
      setError(e.message || 'Failed to simulate scenario');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateBatch = async () => {
    setBatchLoading(true);
    setError(null);
    try {
      const dealId = currentDeal?.dealId || currentDeal?.deal_id || 'DEAL-003';
      const res = await simulateWhatIf(dealId, {
        dealValue: baseDealValue,
        discountPercent: baseRequestedDiscount,
        contractYears: 1,
        includeSupport: true,
        requestedDiscountPercent: baseRequestedDiscount,
        customer: currentDeal?.customer || 'Customer',
        segment: currentDeal?.segment || 'enterprise',
        scenarios: scenarios.map(sc => ({
          discountPercent: sc.discountPercent,
          contractYears: sc.contractYears,
          includeSupport: sc.includeSupport
        }))
      });
      if (res.scenarioBatch) {
        setSimulationCache(prev => {
          const next = { ...prev };
          res.scenarioBatch.forEach((r, idx) => {
            const sc = scenarios[idx];
            if (sc) next[sc.id] = r;
          });
          return next;
        });
      }
    } catch (e) {
      console.error('Batch simulation error:', e);
      setError(e.message || 'Failed to simulate scenarios');
    } finally {
      setBatchLoading(false);
    }
  };

  const activeSimulation = simulationCache[activeScenario.id];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SlidersHorizontal className="w-5 h-5 text-dm-blue" />
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Multi-Scenario Negotiation Comparator
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Model and compare multiple concession packages side-by-side for <strong className="text-slate-900 dark:text-white">{currentDeal?.customer}</strong> (${baseDealValue.toLocaleString()} deal, {baseRequestedDiscount}% requested).
          </p>
        </div>

        {scenarios.length < 4 && (
          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={handleAddScenario}
          >
            Add Scenario ({scenarios.length}/4)
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-400">
          <strong>Simulation note:</strong> {error}
        </div>
      )}

      {/* SIDE-BY-SIDE COMPARATOR CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenariosWithEconomics.map((sc) => {
          const isSelected = sc.id === activeScenarioId;
          const econ = sc.economics;

          return (
            <div
              key={sc.id}
              onClick={() => setActiveScenarioId(sc.id)}
              className={`p-5 rounded-3xl border transition-all cursor-pointer space-y-4 flex flex-col justify-between ${
                isSelected
                  ? 'bg-dm-blue/10 dark:bg-indigo-950/40 border-dm-blue shadow-xl ring-2 ring-dm-blue'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  {sc.name}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  econ.outcome === 'LIKELY_WIN' 
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : econ.outcome === 'HIGH_MARGIN_RISK'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                }`}>
                  {econ.outcome}
                </span>
              </div>

              {/* Financial Metrics */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Proposed Concession:</span>
                  <span className="font-mono font-bold text-dm-blue dark:text-indigo-400">
                    {sc.discountPercent}% (-${econ.proposedConcession.toLocaleString()})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Contract Term:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {sc.contractYears} {sc.contractYears === 1 ? 'Year' : 'Years'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bundle Package:</span>
                  <span className={`font-mono font-bold text-xs ${sc.includeSupport ? 'text-dm-blue dark:text-indigo-400' : 'text-slate-500'}`}>
                    {sc.includeSupport ? `Support (+${econ.supportCost > 0 ? '$' + econ.supportCost.toLocaleString() : '2%'})` : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Contract Value:</span>
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                    ${econ.totalContractValue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Revenue Retained:</span>
                  <span className="font-mono font-bold text-emerald-500">
                    +${econ.concessionSavings.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Badges and Governance Flags */}
              <div className="space-y-1.5 text-[11px]">
                {econ.requiresApproval ? (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                    <ShieldAlert className="w-3.5 h-3.5" /> Approval Required (&gt;{approvalThreshold}%)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Within Rep Authority
                  </span>
                )}
                <div className="text-slate-500 dark:text-slate-400 italic line-clamp-1">
                  {sc.giveGetNotes}
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-[10px] font-mono">
                  evidence: {simulationCache[sc.id] ? (simulationCache[sc.id].evidence?.length ? 'recalled' : 'none') : 'preview'}
                  · source: {simulationCache[sc.id] ? (simulationCache[sc.id].evidence?.[0]?.source || simulationCache[sc.id].evidence?.source || 'api/simulation') : 'deterministic'}
                </div>
              </div>

              {/* Action */}
              <div className="pt-2">
                {onAdoptScenario ? (
                  <Button
                    variant={isSelected ? 'primary' : 'outline'}
                    size="sm"
                    className="w-full text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdoptScenario(sc);
                    }}
                  >
                    Adopt Package
                  </Button>
                ) : (
                  <span className="text-[10px] text-dm-blue font-bold uppercase tracking-wider block text-center">
                    {isSelected ? '✓ Active Editor' : 'Click to Edit'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ACTIVE SCENARIO EDITOR & DEEP SIMULATION PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        {/* Editor Controls */}
        <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Edit: {activeScenario.name}
              </h3>
              <p className="text-[11px] text-slate-500">Fine-tune commercial parameters</p>
            </div>
            {scenarios.length > 1 && (
              <button
                onClick={() => handleDeleteScenario(activeScenario.id)}
                className="text-slate-400 hover:text-rose-500 transition p-1"
                title="Delete scenario"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Discount Slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Proposed Concession</span>
              <span className="font-mono font-black text-dm-blue dark:text-indigo-400 text-sm">
                {activeScenario.discountPercent}%
              </span>
            </div>
            <input 
              type="range" min="0" max="40" value={activeScenario.discountPercent}
              onChange={e => handleUpdateActiveScenario({ discountPercent: Number(e.target.value) })}
              className="w-full accent-dm-blue h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0% (No discount)</span>
              <span>15% (Threshold)</span>
              <span>40% (Max)</span>
            </div>
          </div>

          {/* Contract Years */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Contract Term</span>
              <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-sm">
                {activeScenario.contractYears} {activeScenario.contractYears === 1 ? 'Year' : 'Years'}
              </span>
            </div>
            <input 
              type="range" min="1" max="4" value={activeScenario.contractYears}
              onChange={e => handleUpdateActiveScenario({ contractYears: Number(e.target.value) })}
              className="w-full accent-purple-600 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Support Package Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Bundle Premium Support</div>
              <div className="text-[11px] text-slate-500">Includes dedicated technical manager (~2% COGS)</div>
            </div>
            <button 
              type="button"
              onClick={() => handleUpdateActiveScenario({ includeSupport: !activeScenario.includeSupport })}
              className={`w-10 h-5 rounded-full transition relative ${
                activeScenario.includeSupport ? 'bg-dm-blue' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span 
                className={`absolute top-0.5 rounded-full w-4 h-4 bg-white shadow transition-all ${
                  activeScenario.includeSupport ? 'left-5.5' : 'left-0.5'
                }`}
                style={{ left: activeScenario.includeSupport ? '22px' : '2px' }}
              />
            </button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="primary"
              icon={Sparkles}
              className="flex-1 text-xs"
              disabled={loading || batchLoading}
              onClick={handleSimulateDeep}
            >
              {loading ? 'Recalling Precedents...' : 'Simulate Active'}
            </Button>
            <Button
              variant="outline"
              icon={RotateCcw}
              className="flex-1 text-xs"
              disabled={batchLoading || scenarios.length < 2}
              onClick={handleSimulateBatch}
            >
              {batchLoading ? 'Comparing...' : 'Compare All Scenarios'}
            </Button>
          </div>
        </div>

        {/* Reflection & Precedents */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-6 space-y-4 border-dm-blue/30">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-dm-blue" />
                <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  Precedent Reflection ({activeScenario.name})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                {activeScenario.economics.outcome}
              </span>
            </div>

            {/* Reflection Text */}
            <div className="p-4 rounded-2xl bg-dm-tint dark:bg-indigo-950/30 border border-dm-blue dark:border-indigo-800/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
              {(() => {
                const sim = activeSimulation;
                if (sim?.reflection) return sim.reflection;
                const sc = activeScenario;
                if (sc.discountPercent <= 10 && sc.includeSupport) {
                  return `Organizational Reflection: Scenario with ${sc.discountPercent}% concession paired with support aligns with historical win patterns, retaining maximum margin.`;
                }
                if (sc.discountPercent > 15) {
                  return `Organizational Reflection: Concessions exceeding 15% historically trigger high loss rates and margin erosion without improving close velocity.`;
                }
                return `Organizational Reflection: Moderate concession (${sc.discountPercent}%) requires non-price reciprocal value (such as multi-year term or upfront payment) to protect deal economics.`;
              })()}
            </div>

            {/* Recalled Precedents */}
            {activeSimulation?.evidence && activeSimulation.evidence.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Comparable Precedent Memories ({activeSimulation.evidence.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeSimulation.evidence.slice(0, 4).map((m, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-dm-blue">{m.dealId || m.deal_id}</span>
                        <span className={`text-[10px] font-bold ${m.outcome === 'WON' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {m.outcome}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1">{m.strategy}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Batch comparison panel */}
            {batchLoading && (
              <div className="p-4 rounded-2xl bg-dm-tint/60 border border-dm-blue/20 text-xs text-dm-muted">
                Comparing all scenarios against the current deal and recalling precedent evidence for each.
              </div>
            )}
            {Object.keys(simulationCache).length > 1 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Scenario Comparison (cached)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {scenariosWithEconomics.map(sc => {
                    const cached = simulationCache[sc.id];
                    const econ = sc.economics;
                    return (
                      <div key={sc.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                        <div className="font-bold text-slate-900 dark:text-white truncate">{sc.name}</div>
                        <div className="mt-1 space-y-1">
                          <div className="flex justify-between"><span className="text-slate-500">Outcome:</span><span className="font-mono font-bold">{econ.outcome}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Retained:</span><span className="font-mono font-bold text-emerald-600">+${econ.concessionSavings.toLocaleString()}</span></div>
                          {cached?.reflection && <div className="mt-1 italic text-slate-500 line-clamp-2">{cached.reflection}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
