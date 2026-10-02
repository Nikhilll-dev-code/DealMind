import React, { useState } from 'react';
import { FlaskConical, AlertCircle, ArrowRight, CheckCircle2, Sparkles, Database, ShieldCheck, Layers, FileCheck2 } from 'lucide-react';

function StrategyCard({ stratKey, strat, badge, isSelected, onSelect }) {
  const badgeColors = {
    'RECOMMENDED': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'BALANCED': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'HIGH RISK': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };

  return (
    <div 
      onClick={() => onSelect(stratKey, strat)}
      className={`flex flex-col bg-[#161f2e] border rounded-3xl p-6 space-y-4 cursor-pointer transition-all ${
        isSelected 
          ? 'border-indigo-500 ring-2 ring-indigo-500 bg-indigo-950/30 shadow-xl' 
          : 'border-[#20293a] hover:border-slate-700'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeColors[badge] || badgeColors['BALANCED']}`}>
          {badge}
        </span>
        {isSelected && (
          <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded">
            ✓ Active Package
          </span>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-extrabold text-white">{strat.name}</h3>
        <p className="text-xs text-blue-400 font-semibold">{strat.package}</p>
      </div>

      {/* Economics */}
      <div className="p-3.5 rounded-2xl bg-[#101622] border border-[#20293a] space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Proposed concession:</span>
          <span className="font-mono font-bold text-white">{strat.discountPercent}% (${strat.concessionValue?.toLocaleString()})</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Revenue retained vs request:</span>
          <span className="font-mono font-bold text-emerald-400">+${strat.concessionSavings?.toLocaleString()}</span>
        </div>
      </div>

      {/* Tradeoffs */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trade-offs</p>
        <p className="text-xs text-slate-300 leading-relaxed">{strat.tradeoffs}</p>
      </div>

      {/* Evidence */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Historical Evidence</p>
        <p className="text-xs text-slate-300 leading-relaxed">{strat.evidenceSupport}</p>
      </div>

      {/* Risk */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <span>{strat.risk}</span>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(stratKey, strat);
        }}
        className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition mt-auto ${
          isSelected
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
            : 'bg-[#20293a] hover:bg-[#28354b] text-slate-200'
        }`}
      >
        <span>{isSelected ? `✓ Selected: ${strat.name.split('/')[0].trim()}` : `Select ${strat.name.split('/')[0].trim()}`}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function StrategyLab({ 
  strategyOptions, 
  currentDeal, 
  reflection,
  onSelectStrategy, 
  onNavigateTab 
}) {
  const [selectedKey, setSelectedKey] = useState('conservative');

  if (!strategyOptions) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-4">
        <FlaskConical className="w-10 h-10 text-slate-600 mx-auto" />
        <p className="text-sm">Run an analysis first to see strategy options.</p>
        <button onClick={() => onNavigateTab && onNavigateTab('overview')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">
          Deal Overview
        </button>
      </div>
    );
  }

  const strategies = [
    { key: 'conservative', badge: 'RECOMMENDED' },
    { key: 'balanced', badge: 'BALANCED' },
    { key: 'aggressive', badge: 'HIGH RISK' },
  ];

  const handleSelect = (key, strat) => {
    setSelectedKey(key);
    if (onSelectStrategy) {
      onSelectStrategy(key, strat);
    }
  };

  const activeStrat = strategyOptions[selectedKey] || strategyOptions['conservative'];

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-extrabold text-white">Strategy Lab</h2>
        </div>
        <p className="text-slate-400 text-sm">
          Three evidence-grounded strategy packages for <strong className="text-white">{currentDeal?.customer || 'this negotiation'}</strong> (${Number(currentDeal?.dealValue || 0).toLocaleString()} deal, {currentDeal?.requestedDiscountPercent || 0}% requested discount).
        </p>
      </div>

      {/* 2. Hindsight Strategic Reflection Banner */}
      {reflection && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/20 to-slate-900 border border-purple-500/30 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Hindsight Strategic Reflection</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-400 border border-purple-500/30">Hindsight reflect()</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {reflection}
          </p>
        </div>
      )}

      {/* 3. Three Strategy Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {strategies.map(({ key, badge }) => {
          const strat = strategyOptions[key];
          if (!strat) return null;
          return (
            <StrategyCard
              key={key}
              stratKey={key}
              strat={strat}
              badge={badge}
              isSelected={selectedKey === key}
              onSelect={handleSelect}
            />
          );
        })}
      </div>

      {/* 4. Next Recommended Action Bar */}
      {activeStrat && (
        <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300">
              Active Selection: <strong className="text-white font-bold">{activeStrat.name}</strong> ({activeStrat.discountPercent}% concession · +${activeStrat.concessionSavings?.toLocaleString()} retained)
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigateTab && onNavigateTab('what-if')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
            >
              <span>Test in What-If Simulator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
