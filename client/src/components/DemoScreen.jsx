import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  CheckCircle2, 
  Brain, 
  Database, 
  DollarSign, 
  SlidersHorizontal,
  History,
  AlertCircle
} from 'lucide-react';

import { analyzeNegotiation, recordOutcome, resetDemo, getLearningTimeline } from '../services/api';

const ACME_DEMO_DATA = {
  customer: 'Acme Corp',
  segment: 'enterprise',
  industry: 'technology',
  dealValue: 100000,
  objection: 'Price is too high compared to alternatives',
  initialOffer: 100000,
  counterOffer: 80000,
  requestedDiscountPercent: 20,
  competitorPressure: true,
  contractYears: 1
};

export default function DemoScreen({ onFinishDemo, onRefreshGlobalData }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [outcomeResult, setOutcomeResult] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [error, setError] = useState(null);

  // Load initial analysis on step 1 -> step 2
  const runDemoAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeNegotiation(ACME_DEMO_DATA);
      setAnalysisResult(res);
      setCurrentStep(2);
    } catch (err) {
      setError('Analysis failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordDemoOutcome = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await recordOutcome('DEAL-003', {
        outcome: 'WON',
        chosenStrategy: '8% discount + premium support',
        outcomeReason: 'Customer accepted 8% discount after demonstrating value with premium support package.',
        finalPrice: 92000
      });
      setOutcomeResult(res);
      const tl = await getLearningTimeline();
      setTimelineEvents(tl);
      if (onRefreshGlobalData) onRefreshGlobalData();
      setCurrentStep(6);
    } catch (err) {
      setError('Recording outcome failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestartDemo = async () => {
    setLoading(true);
    try {
      await resetDemo();
      setAnalysisResult(null);
      setOutcomeResult(null);
      setCurrentStep(1);
      setError(null);
      if (onRefreshGlobalData) onRefreshGlobalData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const stepsList = [
    { num: 1, title: 'Negotiation Intake' },
    { num: 2, title: 'Hindsight Memory' },
    { num: 3, title: 'Recommendation' },
    { num: 4, title: 'Strategy Comparison' },
    { num: 5, title: 'Outcome Capture' },
    { num: 6, title: 'Learning & Retain' },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Demo Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#20293a] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Walkthrough</span>
          </div>
          <h1 className="text-2xl font-black text-white">60-Second DealMind Demo</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            See how organizational memory changes a negotiation recommendation.
          </p>
        </div>

        <button
          onClick={handleRestartDemo}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition border border-slate-700"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Restart Demo</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="grid grid-cols-6 gap-2">
        {stepsList.map(s => (
          <div key={s.num} className="space-y-1.5">
            <div className={`h-1.5 rounded-full transition-all ${
              s.num <= currentStep ? 'bg-blue-500 shadow-sm shadow-blue-500/50' : 'bg-[#1c2637]'
            }`} />
            <span className={`text-[10px] font-bold block truncate ${
              s.num === currentStep ? 'text-blue-400' : s.num < currentStep ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {s.num}. {s.title}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Negotiation Intake */}
      {currentStep === 1 && (
        <div className="bg-[#161f2e] border border-[#20293a] rounded-3xl p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center text-xs">1</span>
            <span>Scenario: Acme Corp Demands a 20% Discount</span>
          </div>

          <p className="text-slate-300 text-sm leading-relaxed">
            Acme Corp is an enterprise client negotiating a <strong className="text-white font-mono">$100,000</strong> deal. They have an active competitor quote and are requesting an immediate <strong className="text-rose-400 font-mono">20% discount ($20,000)</strong>.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-[#101622] border border-[#20293a]">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Customer</div>
              <div className="text-sm font-bold text-white mt-0.5">Acme Corp</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Deal Value</div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">$100,000</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Requested Concession</div>
              <div className="text-sm font-bold text-rose-400 font-mono mt-0.5">20% ($20,000)</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Competitor Pressure</div>
              <div className="text-sm font-bold text-amber-400 mt-0.5">Yes (Active)</div>
            </div>
          </div>

          <button
            onClick={runDemoAnalysis}
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-bold text-sm transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
          >
            {loading ? 'Recalling Hindsight Memory...' : 'Analyze with Hindsight Memory →'}
          </button>
        </div>
      )}

      {/* STEP 2: Hindsight Memory Recall */}
      {currentStep === 2 && analysisResult && (
        <div className="bg-[#161f2e] border border-[#20293a] rounded-3xl p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-purple-600/20 flex items-center justify-center text-xs">2</span>
              <span>Hindsight Memory Recall: 8 Historical Episodes Found</span>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              MEDIUM CONFIDENCE (62.5% Win Rate)
            </span>
          </div>

          <p className="text-slate-300 text-sm leading-relaxed">
            Hindsight searched past enterprise negotiations for Acme Corp and recalled <strong>8 episodes: 5 WON and 3 LOST (62.5% win rate)</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
            {analysisResult.evidence.memories.map((m) => (
              <div key={m.dealId || m.deal_id} className="p-3.5 rounded-xl bg-[#101622] border border-[#20293a] text-xs space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="text-white font-mono">{m.dealId || m.deal_id} · {m.strategy}</span>
                  <span className={m.outcome === 'WON' ? 'text-emerald-400' : 'text-rose-400'}>{m.outcome}</span>
                </div>
                <p className="text-slate-400 italic text-[11px]">"{m.outcomeReason || m.outcome_reason}"</p>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold"
            >
              ← Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20"
            >
              View Recommendation →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Recommendation */}
      {currentStep === 3 && analysisResult && (
        <div className="bg-[#161f2e] border border-[#20293a] rounded-3xl p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center text-xs">3</span>
            <span>DealMind Recommendation & Economics</span>
          </div>

          <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/20">
            <p className="font-bold text-blue-300 text-sm">{analysisResult.recommendation.headline}</p>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-emerald-300">Concession Difference</div>
              <div className="text-sm text-emerald-400 mt-0.5">
                $12,000 less in discount concession compared with a 20% discount request.
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">+$12,000</div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button onClick={() => setCurrentStep(2)} className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold">
              ← Back
            </button>
            <button onClick={() => setCurrentStep(4)} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20">
              Compare Strategy Packages →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Strategy Comparison */}
      {currentStep === 4 && analysisResult && (
        <div className="bg-[#161f2e] border border-[#20293a] rounded-3xl p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center text-xs">4</span>
            <span>Strategy Lab: 3 Evidence-Backed Packages</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(analysisResult.strategyOptions || {}).map(([key, strat]) => (
              <div key={key} className={`p-5 rounded-2xl bg-[#101622] border space-y-3 ${
                key === 'conservative' ? 'border-emerald-500/40' : 'border-[#20293a]'
              }`}>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  key === 'conservative' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  {key === 'conservative' ? 'RECOMMENDED' : key.toUpperCase()}
                </span>
                <h4 className="font-bold text-white text-sm">{strat.name}</h4>
                <div className="text-xs text-slate-300 font-mono font-bold">{strat.discountPercent}% Discount</div>
                <p className="text-[11px] text-slate-400">{strat.tradeoffs}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button onClick={() => setCurrentStep(3)} className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold">
              ← Back
            </button>
            <button onClick={() => setCurrentStep(5)} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20">
              Record Outcome →
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Outcome Capture */}
      {currentStep === 5 && (
        <div className="bg-[#161f2e] border border-[#20293a] rounded-3xl p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <span className="w-6 h-6 rounded-full bg-emerald-600/20 flex items-center justify-center text-xs">5</span>
            <span>Record WON Outcome for DEAL-003</span>
          </div>

          <p className="text-slate-300 text-sm leading-relaxed">
            Acme Corp agreed to the <strong className="text-emerald-400">8% discount + premium support package</strong> at <strong className="text-white font-mono">$92,000</strong>. Recording this outcome will retain the negotiation episode in Hindsight memory.
          </p>

          <div className="p-5 rounded-2xl bg-[#101622] border border-[#20293a] space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-slate-400">Deal:</span><span className="font-bold text-white">DEAL-003 (Acme Corp)</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Final Agreed Price:</span><span className="font-bold text-white font-mono">$92,000</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Outcome:</span><span className="font-bold text-emerald-400">WON</span></div>
          </div>

          <button
            onClick={handleRecordDemoOutcome}
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-bold text-sm transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
          >
            {loading ? 'Retaining in Hindsight Memory...' : '✓ Record WON Outcome & Retain Memory'}
          </button>
        </div>
      )}

      {/* STEP 6: Learning & Memory Retain */}
      {currentStep === 6 && (
        <div className="bg-[#161f2e] border border-[#20293a] rounded-3xl p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Hindsight Retain & Learning Complete!</span>
          </div>

          <p className="text-slate-300 text-sm leading-relaxed">
            The negotiation was retained into Hindsight long-term memory. Acme historical statistics have been updated from <strong className="text-slate-300">5W / 3L (62.5%)</strong> to <strong className="text-emerald-400">6W / 3L (66.7%)</strong>.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#101622] border border-[#20293a] space-y-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Before Retain</div>
              <div className="text-sm font-bold text-white">5 Wins / 3 Losses</div>
              <div className="text-xs text-amber-400 font-mono">62.5% Win Rate (MEDIUM)</div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
              <div className="text-[10px] font-bold text-emerald-400 uppercase">After Retain</div>
              <div className="text-sm font-bold text-white">6 Wins / 3 Losses</div>
              <div className="text-xs text-emerald-400 font-mono font-bold">66.7% Win Rate (MEDIUM)</div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleRestartDemo}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold text-xs transition border border-slate-700"
            >
              Restart Demo
            </button>
            <button
              onClick={onFinishDemo}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs transition shadow-md shadow-blue-600/20"
            >
              Go to Workspace →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
