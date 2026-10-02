import React from 'react';
import { 
  Scale, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  HelpCircle, 
  Building2, 
  Layers,
  ShieldAlert,
  Info
} from 'lucide-react';
import Card from './common/Card';

export default function EvidenceConflictMatrix({ 
  evidenceConflictMatrix: matrixData, 
  currentDeal,
  confidence 
}) {
  if (!matrixData) {
    return (
      <Card className="p-8 text-center text-slate-400 space-y-2">
        <Scale className="w-8 h-8 mx-auto text-slate-600" />
        <p className="text-xs">No evidence matrix data available.</p>
      </Card>
    );
  }

  const {
    customer,
    segment,
    alignmentCategory,
    hasConflict,
    conflictExplanation,
    metrics,
    supportingPrecedents = [],
    contradictingPrecedents = [],
    mixedPrecedents = [],
    customerSpecificEvidence = [],
    segmentLevelEvidence = [],
    confidenceCap
  } = matrixData;

  const alignmentBadges = {
    'STRONG_ALIGNMENT': { label: 'Strong Evidence Alignment', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    'MODERATE_CONFLICT': { label: 'Moderate Conflict Detected', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    'HIGH_CONFLICT': { label: 'High Conflict Pattern', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
    'MIXED_EVIDENCE': { label: 'Mixed Precedent Cluster', color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' },
    'ZERO_EVIDENCE': { label: 'Zero Evidence Baseline', color: 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700' },
    'INSUFFICIENT_EVIDENCE': { label: 'Insufficient Evidence', color: 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700' }
  };

  const badge = alignmentBadges[alignmentCategory] || alignmentBadges['MIXED_EVIDENCE'];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-5 h-5 text-indigo-500" />
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Evidence Conflict & Agreement Matrix
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Systematic reconciliation of supporting vs. contradicting precedents for <strong className="text-slate-900 dark:text-white">{customer}</strong>.
          </p>
        </div>

        <div>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-mono font-bold border ${badge.color}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Conflict Guardrail Banner if Conflict Detected */}
      {hasConflict && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <span>Guardrail Enforced: Statistical Confidence Capped at MEDIUM</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed">
              {conflictExplanation}
            </p>
          </div>
        </div>
      )}

      {/* 4-Quadrant Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 space-y-1">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Supporting</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {metrics.supportingCount}
          </div>
          <p className="text-[10px] text-slate-500">Won deals matching value-add</p>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-500/30 space-y-1">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Contradicting</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
            {metrics.contradictingCount}
          </div>
          <p className="text-[10px] text-slate-500">Lost deals on direct discount</p>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-500/30 space-y-1">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Customer-Specific</span>
            <Building2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
            {metrics.customerSpecificCount}
          </div>
          <p className="text-[10px] text-slate-500">Direct account history</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Segment Benchmark</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {metrics.segmentLevelCount}
          </div>
          <p className="text-[10px] text-slate-500">{segment} peer deals</p>
        </div>
      </div>

      {/* MATRIX PRECEDENT COMPARISON GRIDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supporting Precedents Column */}
        <Card className="p-5 space-y-3 border-emerald-500/30">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Supporting Precedents ({supportingPrecedents.length})
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
              High Win Correlation
            </span>
          </div>

          {supportingPrecedents.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-400 italic">
              No supporting precedents found.
            </div>
          ) : (
            <div className="space-y-2.5">
              {supportingPrecedents.map((p) => (
                <div key={p.dealId} className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{p.dealId} ({p.customer})</span>
                    <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.2 rounded">
                      WON · {p.concessionPercent}% Off
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {p.strategy}
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 italic">
                    {p.alignmentReason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Contradicting & Failure Precedents Column */}
        <Card className="p-5 space-y-3 border-rose-500/30">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Contradicting / Risk Precedents ({contradictingPrecedents.length})
              </h3>
            </div>
            <span className="text-[10px] font-mono text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">
              Concession Risk
            </span>
          </div>

          {contradictingPrecedents.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-400 italic">
              No contradicting precedents found.
            </div>
          ) : (
            <div className="space-y-2.5">
              {contradictingPrecedents.map((p) => (
                <div key={p.dealId} className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-rose-500">{p.dealId} ({p.customer})</span>
                    <span className="font-mono text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/15 px-2 py-0.2 rounded">
                      LOST · {p.concessionPercent}% Off
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {p.strategy}
                  </div>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300/80 italic">
                    {p.alignmentReason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
