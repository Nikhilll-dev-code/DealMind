import React, { useState, useEffect } from 'react';
import { 
  GitMerge, 
  Brain, 
  ShieldCheck, 
  UserCheck, 
  FileCheck2, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import Card from './common/Card';
import Button from './common/Button';
import { getDealDrift } from '../services/api';

export default function DecisionDriftView({ currentDeal }) {
  const [driftData, setDriftData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const dealId = currentDeal?.dealId || currentDeal?.deal_id;

  useEffect(() => {
    if (!dealId) return;
    setLoading(true);
    getDealDrift(dealId)
      .then(data => {
        setDriftData(data);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to load decision drift:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [dealId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
        <p className="text-xs">Computing decision lifecycle drift telemetry...</p>
      </div>
    );
  }

  if (error || !driftData) {
    return (
      <Card className="p-8 text-center text-slate-400 space-y-3">
        <GitMerge className="w-10 h-10 mx-auto text-slate-500" />
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Decision Drift Not Yet Available</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Decision drift compares the 4-stage lifecycle (AI Recommendation → Manager Review → Rep Concession → Final Outcome). Once an outcome or approval is recorded, full attribution variance will appear here.
        </p>
      </Card>
    );
  }

  const { stages, driftAnalysis } = driftData;
  const { step1_aiRecommendation, step2_managerGovernance, step3_salespersonExecution, step4_recordedOutcome } = stages;

  const isWon = step4_recordedOutcome.outcome === 'WON';

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <GitMerge className="w-5 h-5 text-indigo-500" />
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Decision Drift & Outcome Attribution
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Trace concession drift across AI recommendation, manager governance, sales rep execution, and final customer outcome.
        </p>
      </div>

      {/* DRIFT TELEMETRY SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">AI Proposed Baseline</div>
          <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
            {driftAnalysis.aiProposedDiscount}%
          </div>
          <p className="text-[11px] text-slate-500">Initial agent recommendation</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Actual Executed Concession</div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {driftAnalysis.actualConcessionPercent}%
          </div>
          <p className="text-[11px] text-slate-500">Final discount granted by rep</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Concession Drift</div>
          <div className={`text-2xl font-black font-mono ${
            driftAnalysis.totalConcessionDrift === 0 
              ? 'text-emerald-500' 
              : driftAnalysis.totalConcessionDrift > 0 
                ? 'text-rose-500' 
                : 'text-indigo-400'
          }`}>
            {driftAnalysis.totalConcessionDrift > 0 ? `+${driftAnalysis.totalConcessionDrift}%` : `${driftAnalysis.totalConcessionDrift}%`}
          </div>
          <p className="text-[11px] text-slate-500">
            {driftAnalysis.totalConcessionDrift === 0 ? 'Exact AI adherence' : 'Variance from AI baseline'}
          </p>
        </div>
      </div>

      {/* 4-STAGE LIFECYCLE TIMELINE */}
      <Card className="p-6 space-y-6">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800">
          Negotiation Lifecycle Decision Sequence
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {/* Stage 1: AI Recommendation */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-mono text-xs font-bold flex items-center justify-center">
                1
              </span>
              <Brain className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">AI Recommendation</div>
              <div className="font-mono text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {step1_aiRecommendation.proposedDiscountPercent}% Concession
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {step1_aiRecommendation.proposedStrategy}
            </p>
          </div>

          {/* Stage 2: Manager Governance */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-mono text-xs font-bold flex items-center justify-center">
                2
              </span>
              <ShieldCheck className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400">Manager Governance</div>
              <div className="font-mono text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {step2_managerGovernance.status}
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {step2_managerGovernance.decisionNotes || 'Standard threshold (no escalation required).'}
            </p>
            {step2_managerGovernance.managerName !== 'N/A' && (
              <div className="text-[10px] font-mono text-slate-400">
                Reviewer: {step2_managerGovernance.managerName}
              </div>
            )}
          </div>

          {/* Stage 3: Salesperson Execution */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-mono text-xs font-bold flex items-center justify-center">
                3
              </span>
              <UserCheck className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Sales Rep Execution</div>
              <div className="font-mono text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {step3_salespersonExecution.actualConcessionPercent}% Concession
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {step3_salespersonExecution.chosenStrategy}
            </p>
          </div>

          {/* Stage 4: Recorded Outcome */}
          <div className={`p-4 rounded-2xl border space-y-2 ${
            isWon 
              ? 'bg-emerald-500/10 border-emerald-500/30' 
              : 'bg-rose-500/10 border-rose-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`w-6 h-6 rounded-full text-white font-mono text-xs font-bold flex items-center justify-center ${
                isWon ? 'bg-emerald-600' : 'bg-rose-600'
              }`}>
                4
              </span>
              <FileCheck2 className={`w-4 h-4 ${isWon ? 'text-emerald-500' : 'text-rose-500'}`} />
            </div>
            <div>
              <div className={`text-[10px] font-bold uppercase ${isWon ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                Final Outcome
              </div>
              <div className={`font-mono text-base font-black mt-0.5 ${isWon ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {step4_recordedOutcome.outcome}
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 italic leading-relaxed">
              &ldquo;{step4_recordedOutcome.outcomeReason}&rdquo;
            </p>
          </div>
        </div>

        {/* Narrative & Attribution Disclaimer */}
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="text-xs font-bold text-slate-900 dark:text-white">
            Attribution Summary
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {driftAnalysis.driftSummary}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono pt-1">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{driftAnalysis.attributionDisclaimer}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
