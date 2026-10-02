import React from 'react';
import { 
  Activity, 
  Cpu, 
  Clock, 
  Database, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../components/common/Card';
import Badge from '../components/common/Badge';

export default function AgentActivityView({ agentTrace = [], currentDeal }) {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-500" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Agent Execution & Tool Activity Trace</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Transparent, chronological log of multi-turn tool invocations, execution timings, and data provenance.
          </p>
        </div>

        {currentDeal && (
          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Active: {currentDeal.customer}
          </span>
        )}
      </div>

      {/* Trace Items List */}
      <Card className="p-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Sequence of Autonomous & Deterministic Steps
          </div>
          <Badge variant="primary" size="sm">
            {agentTrace.length} Steps Executed
          </Badge>
        </div>

        {agentTrace.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs italic">
            No agent trace recorded yet. Run a negotiation analysis from the New Deal screen to observe live agent steps.
          </div>
        ) : (
          <div className="space-y-3.5">
            {agentTrace.map((step) => (
              <div
                key={step.step}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-mono font-bold">
                      {step.step}
                    </span>
                    <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-300">
                      {step.tool}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      step.caller === 'llm_autonomous'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {step.caller === 'llm_autonomous' ? 'LLM Selected' : 'System Fallback'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      step.source.includes('hindsight')
                        ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {step.source}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{step.durationMs}ms</span>
                    <span className="text-emerald-500 font-bold">✓ {step.status}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-300 font-medium pl-8">
                  {step.reason}
                </div>

                <div className="pl-8 pt-1">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 leading-relaxed">
                    {step.outputSummary}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
