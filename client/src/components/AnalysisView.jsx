import React, { useState } from 'react';
import { 
  Brain, ShieldCheck, DollarSign, Database, CheckCircle2,
  AlertTriangle, ArrowRight, ChevronDown, ChevronUp, Tag, RotateCcw
} from 'lucide-react';

function ConfidenceBadge({ confidence }) {
  const colors = {
    HIGH: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    MEDIUM: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    LOW: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colors[confidence] || colors.LOW}`}>
      {confidence} CONFIDENCE
    </span>
  );
}

function EvidenceCard({ mem }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="p-4 rounded-xl bg-[#0f1622] border border-[#243048] space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-blue-400">{mem.dealId}</span>
          <span className="text-xs font-semibold text-slate-200">{mem.customer}</span>
          {mem.customer.toLowerCase() !== (mem.segment || '').toLowerCase() && (
            <span className="text-[10px] text-slate-500 font-mono">{mem.segment}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            mem.outcome === 'WON' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
          }`}>{mem.outcome}</span>
          <button onClick={() => setExpanded(p => !p)} className="text-slate-500 hover:text-slate-300">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <div className="text-xs text-slate-300 font-medium">{mem.strategy} ({mem.concessionPercent}% off)</div>
      {expanded && (
        <div className="pt-2 space-y-1 border-t border-[#243048]">
          <p className="text-[11px] text-slate-400 italic leading-relaxed">"{mem.outcomeReason}"</p>
          <div className="flex gap-3 text-[10px] text-slate-500 font-mono flex-wrap">
            {mem.date && <span>{mem.date}</span>}
            {mem.contractYears && <span>{mem.contractYears}yr contract</span>}
            {mem.competitorPressure !== undefined && <span>Competitor: {mem.competitorPressure ? 'Yes' : 'No'}</span>}
            <span className="italic">{mem.source}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalysisView({ analysis, onNavigateTab, onRecordOutcome }) {
  if (!analysis) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-4">
        <Brain className="w-10 h-10 text-slate-600 mx-auto" />
        <p className="text-sm">No analysis yet. Go to <strong>New Negotiation</strong> to analyze a deal.</p>
      </div>
    );
  }

  const { deal, recommendation, confidence, economics, evidence, conflicts, reasoningMode } = analysis;
  const noEvidence = !evidence.memories || evidence.memories.length === 0;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Deal Context + Confidence Header */}
      <div className="bg-[#182030] border border-[#243048] rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-white">{deal.customer}</span>
              <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-[11px] font-mono">{deal.segment} · {deal.industry}</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 font-mono">{reasoningMode}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
              <span>Deal Value: <strong className="text-white font-mono">${Number(deal.dealValue).toLocaleString()}</strong></span>
              <span>Requested Discount: <strong className="text-rose-400 font-mono">{deal.requestedDiscountPercent}%</strong></span>
              <span>Competitor: <strong className={deal.competitorPressure ? 'text-amber-400' : 'text-emerald-400'}>{deal.competitorPressure ? 'Yes' : 'No'}</strong></span>
              <span>Contract: <strong className="text-blue-400">{deal.contractYears} yr</strong></span>
            </div>
            {deal.objection && (
              <p className="text-[12px] text-slate-400 italic">"{deal.objection}"</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <ConfidenceBadge confidence={confidence.finalConfidence} />
            <span className="text-[11px] text-slate-500">
              {confidence.sampleWins}W / {confidence.sampleLosses}L · {confidence.winRate}% win rate · {confidence.primaryScope} scope
            </span>
          </div>
        </div>
      </div>

      {/* Conflict Alert */}
      {conflicts?.detected && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-300 text-sm">Customer vs Segment Conflict</div>
            <p className="text-xs text-amber-200/70 mt-0.5 leading-relaxed">{conflicts.reason}</p>
          </div>
        </div>
      )}

      {/* No evidence warning */}
      {noEvidence && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-start gap-3">
          <Database className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-slate-300 text-sm">No Comparable Historical Memory Found</div>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">No historical deals found for this customer or segment. Confidence is LOW and recommendation is based on general negotiation guidelines. Completing this negotiation and recording the outcome will build memory for future analyses.</p>
          </div>
        </div>
      )}

      {/* RECOMMENDATION */}
      <div className="bg-[#182030] border border-[#243048] rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 pb-4 border-b border-[#243048]">
          <Brain className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-white">Recommendation</h3>
        </div>

        <div className="p-4 rounded-xl bg-blue-600/10 border border-blue-500/20">
          <p className="font-bold text-blue-300 text-sm">{recommendation.headline}</p>
        </div>

        <div className="text-sm text-slate-300 leading-relaxed space-y-3">
          {recommendation.primaryText.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
        </div>

        {recommendation.keyTakeaways?.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {recommendation.keyTakeaways.map((t, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-[#0f1622] border border-[#243048]">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-300 leading-relaxed">{t}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ECONOMICS + CONFIDENCE side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Economics */}
        <div className="bg-[#182030] border border-[#243048] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#243048] pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Concession Economics</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500 px-2 py-0.5 bg-slate-800 rounded">Deterministic</span>
          </div>
          <div className="space-y-2.5">
            {[
              { label: `Requested ${deal.requestedDiscountPercent}% concession`, val: `-$${economics.requestedConcession.toLocaleString()}`, cls: 'text-rose-400' },
              { label: `Recommended ${economics.proposedDiscountPercent}% concession`, val: `-$${economics.proposedConcession.toLocaleString()}`, cls: 'text-blue-400' },
            ].map(({ label, val, cls }) => (
              <div key={label} className="flex items-center justify-between text-xs p-3 rounded-lg bg-[#0f1622]">
                <span className="text-slate-400">{label}</span>
                <span className={`font-mono font-bold ${cls}`}>{val}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-xs p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div>
                <span className="font-bold text-emerald-300 block">Potential revenue retained</span>
                <span className="text-[10px] text-emerald-500">less in discount vs requested {deal.requestedDiscountPercent}%</span>
              </div>
              <span className="font-mono text-lg font-extrabold text-emerald-400">+${economics.concessionSavings.toLocaleString()}</span>
            </div>
            {economics.contractYears > 1 && (
              <div className="flex items-center justify-between text-xs p-3 rounded-lg bg-[#0f1622]">
                <span className="text-slate-400">Total {economics.contractYears}yr contract value</span>
                <span className="font-mono font-bold text-purple-400">${economics.formatted.totalContractValue}</span>
              </div>
            )}
          </div>
        </div>

        {/* Confidence Detail */}
        <div className="bg-[#182030] border border-[#243048] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#243048] pb-3">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-white text-sm">Confidence Engine</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Scope', val: confidence.primaryScope === 'customer' ? 'Customer-specific' : 'Segment-level' },
              { label: 'Sample Size', val: `${confidence.sampleSize} deals` },
              { label: 'Wins / Losses', val: `${confidence.sampleWins}W · ${confidence.sampleLosses}L` },
              { label: 'Win Rate', val: `${confidence.winRate}%` },
            ].map(({ label, val }) => (
              <div key={label} className="p-3 rounded-xl bg-[#0f1622] border border-[#243048]">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</div>
                <div className="text-sm font-bold text-white">{val}</div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 leading-relaxed">
            Rules: sample &lt;3 → LOW · ≥70% win rate → HIGH · 40–69% → MEDIUM · &lt;40% → LOW
          </div>
        </div>
      </div>

      {/* EVIDENCE */}
      <div className="bg-[#182030] border border-[#243048] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#243048] pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-white text-sm">Hindsight Evidence</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-mono">{evidence.totalRecalled} recalled · {evidence.source}</span>
          </div>
        </div>
        {noEvidence ? (
          <p className="text-xs text-slate-500 italic">No comparable historical memory found.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {evidence.memories.map(mem => <EvidenceCard key={mem.dealId} mem={mem} />)}
          </div>
        )}
      </div>

      {/* Action CTA Row */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => onNavigateTab('strategy-lab')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/20">
          <span>Compare Strategies</span><ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onNavigateTab('what-if')}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#243048] hover:bg-[#2d3d5c] text-slate-200 rounded-xl text-xs font-bold transition">
          <span>What-if Simulator</span>
        </button>
        <button onClick={() => onNavigateTab('counteroffer')}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#243048] hover:bg-[#2d3d5c] text-slate-200 rounded-xl text-xs font-bold transition">
          <span>Counteroffer Advisor</span>
        </button>
        <button onClick={() => onNavigateTab('outcome')}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition ml-auto">
          <span>Record Outcome →</span>
        </button>
      </div>
    </div>
  );
}
