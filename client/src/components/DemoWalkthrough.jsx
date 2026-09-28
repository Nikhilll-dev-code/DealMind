import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  CheckCircle2, 
  X,
  Play,
  Brain,
  ShieldCheck,
  DollarSign,
  Database,
  History
} from 'lucide-react';

const DEMO_STEPS = [
  {
    step: 1,
    title: 'New Negotiation Intake',
    targetTab: 'deal-workspace',
    description: 'Acme Corp is asking for a 20% discount on a $100K enterprise deal with competitor pressure.',
    actionLabel: 'Recall Memory & Analyze Deal →',
    isAutoTrigger: true
  },
  {
    step: 2,
    title: 'Hindsight Memory Recall',
    targetTab: 'analysis',
    description: 'DealMind recalls 8 historical Acme Corp episodes (5 WON / 3 LOST = 62.5% win rate → MEDIUM confidence).',
    actionLabel: 'View Strategy Options →'
  },
  {
    step: 3,
    title: 'Strategy Lab Comparison',
    targetTab: 'strategy-lab',
    description: 'Compares 3 evidence-backed packages: Conservative (8% + support), Balanced (10%), Aggressive (18%).',
    actionLabel: 'Test in What-If Simulator →'
  },
  {
    step: 4,
    title: 'What-If Simulation',
    targetTab: 'what-if',
    description: 'Simulates $100K deal: 8% concession ($8,000) vs 20% requested ($20,000) = $12,000 potential revenue retained.',
    actionLabel: 'Open Counteroffer Advisor →'
  },
  {
    step: 5,
    title: 'Live Counteroffer & Outcome',
    targetTab: 'counteroffer',
    description: 'Generate script: "Offer 8% concession with premium support." Customer accepts at $92,000!',
    actionLabel: 'Record WON Outcome →'
  },
  {
    step: 6,
    title: 'Hindsight Retain & Learning Timeline',
    targetTab: 'learning-timeline',
    description: 'Deal experience retained in Hindsight memory. Win rate updates from 62.5% (5W/3L) → 66.7% (6W/3L).',
    actionLabel: 'Complete Demo ✓'
  }
];

export default function DemoWalkthrough({ 
  currentStep, 
  onNextStep, 
  onPrevStep, 
  onExitDemo,
  onResetDemo,
  isRunning
}) {
  const current = DEMO_STEPS[currentStep] || DEMO_STEPS[0];
  const progress = Math.round(((currentStep + 1) / DEMO_STEPS.length) * 100);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <div className="bg-[#121824]/95 backdrop-blur-md border border-indigo-500/40 rounded-2xl p-4 shadow-2xl shadow-black/60 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Sparkles className="w-3 h-3 text-amber-400" />
              60-SECOND DEMO
            </span>
            <span className="text-xs font-bold text-white">Step {current.step} of {DEMO_STEPS.length}: {current.title}</span>
          </div>
          <button 
            onClick={onExitDemo}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed">{current.description}</p>

        {/* Progress bar */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-semibold text-slate-300 transition"
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
            <button
              onClick={onResetDemo}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
              title="Reset seed data"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          <button
            onClick={onNextStep}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30"
          >
            <span>{current.actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
