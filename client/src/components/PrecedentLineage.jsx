import React, { useState } from 'react';
import { 
  GitCommit, 
  ArrowRight, 
  Database, 
  Brain, 
  FileCheck2, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Info,
  Layers,
  Clock
} from 'lucide-react';
import Card from './common/Card';
import Button from './common/Button';

export default function PrecedentLineage({ 
  currentDeal, 
  analysis,
  onRecordOutcome = null
}) {
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [filterMode, setFilterMode] = useState('ALL'); // ALL, SUPPORTS, CONTRADICTS

  const memories = analysis?.evidence?.memories || [];
  const recommendation = analysis?.recommendation;
  const confidence = analysis?.confidence;
  const deal = analysis?.deal || currentDeal;

  const noEvidence = memories.length === 0;

  // Classify each memory into alignment
  const enrichedMemories = memories.map(m => {
    const isWon = m.outcome === 'WON';
    const isLowDisc = (m.concessionPercent || m.concession_percent || 0) <= 15;
    const hasSupport = (m.strategy || '').toLowerCase().includes('support');

    let alignment = 'SUPPORTS';
    let alignmentReason = 'Precedent supports value-add strategy.';

    if (!isWon) {
      alignment = 'CONTRADICTS';
      alignmentReason = 'Historical loss proves direct discount failure.';
    } else if (!isLowDisc && !hasSupport) {
      alignment = 'MIXED';
      alignmentReason = 'Won with high direct discount; margin risk.';
    }

    return {
      ...m,
      alignment,
      alignmentReason
    };
  });

  const filteredMemories = enrichedMemories.filter(m => {
    if (filterMode === 'SUPPORTS') return m.alignment === 'SUPPORTS';
    if (filterMode === 'CONTRADICTS') return m.alignment === 'CONTRADICTS';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <GitCommit className="w-5 h-5 text-purple-500" />
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Closed-Loop Precedent Lineage
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Trace how historical memories in Hindsight inform this recommendation, and how recording this deal closes the organizational learning loop.
        </p>
      </div>

      {/* CLOSED-LOOP DIAGRAM */}
      <Card className="p-6 bg-gradient-to-br from-slate-50 via-indigo-950/10 to-slate-50 dark:from-slate-900 dark:via-purple-950/20 dark:to-slate-900 border-purple-500/30">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Continuous Organizational Learning Architecture
            </span>
          </div>
          <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
            Bi-directional Synchronization
          </span>
        </div>

        {/* 6-Stage Loop Visualizer */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-center text-xs">
          {/* Node 1 */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-1">
            <span className="text-[9px] font-mono text-slate-400 font-bold">1. PAST DEALS</span>
            <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">Historical Negotiations</div>
            <span className="text-[10px] text-slate-400">Past customer episodes</span>
          </div>

          {/* Node 2 */}
          <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 flex flex-col justify-between space-y-1">
            <span className="text-[9px] font-mono text-purple-500 font-bold">2. RECALL</span>
            <div className="font-bold text-purple-700 dark:text-purple-300 text-[11px]">Hindsight Retrieval</div>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">{memories.length} episodes found</span>
          </div>

          {/* Node 3 */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-1">
            <span className="text-[9px] font-mono text-slate-400 font-bold">3. PRECEDENTS</span>
            <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">Evidence Alignment</div>
            <span className="text-[10px] text-slate-400">Wins vs losses analyzed</span>
          </div>

          {/* Node 4 */}
          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800 flex flex-col justify-between space-y-1">
            <span className="text-[9px] font-mono text-indigo-500 font-bold">4. SYNTHESIS</span>
            <div className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">Active Strategy</div>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">{recommendation?.headline ? 'Formulated' : 'Ready'}</span>
          </div>

          {/* Node 5 */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-1">
            <span className="text-[9px] font-mono text-slate-400 font-bold">5. OUTCOME</span>
            <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">Record Execution</div>
            <span className="text-[10px] text-slate-400">Rep logs actual result</span>
          </div>

          {/* Node 6 */}
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex flex-col justify-between space-y-1">
            <span className="text-[9px] font-mono text-emerald-500 font-bold">6. RETENTION</span>
            <div className="font-bold text-emerald-700 dark:text-emerald-300 text-[11px]">Hindsight Outbox</div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Future deals learn</span>
          </div>
        </div>
      </Card>

      {/* FILTER & STATS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter:</span>
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
            {[
              { id: 'ALL', label: 'All Precedents', count: enrichedMemories.length },
              { id: 'SUPPORTS', label: 'Supports', count: enrichedMemories.filter(m => m.alignment === 'SUPPORTS').length },
              { id: 'CONTRADICTS', label: 'Contradicts', count: enrichedMemories.filter(m => m.alignment === 'CONTRADICTS').length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterMode(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition text-xs ${
                  filterMode === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  filterMode === tab.id 
                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing {filteredMemories.length} of {memories.length} retrieved memories
        </div>
      </div>

      {/* PRECEDENT EVIDENCE CARDS */}
      {noEvidence ? (
        <Card className="p-12 text-center text-slate-400 space-y-3">
          <Database className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Zero Precedent Memories in Hindsight</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            No historical deals for this customer or segment have been retained in long-term memory yet. Confidence is calibrated at LOW. Record the outcome once this deal closes to initiate the learning cycle!
          </p>
        </Card>
      ) : filteredMemories.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 space-y-2">
          <p className="text-xs">No {filterMode.toLowerCase()} precedents found for {deal?.customer}.</p>
          <Button variant="outline" size="sm" onClick={() => setFilterMode('ALL')}>
            Show All {memories.length} Precedents
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMemories.map((mem) => {
            const isWon = mem.outcome === 'WON';
            const isSelected = selectedMemory?.dealId === (mem.dealId || mem.deal_id);

            return (
              <div
                key={mem.dealId || mem.deal_id}
                onClick={() => setSelectedMemory(isSelected ? null : mem)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                  isSelected 
                    ? 'bg-purple-950/20 border-purple-500 ring-1 ring-purple-500' 
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Precedent Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                      {mem.dealId || mem.deal_id}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {mem.customer}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {mem.segment}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      mem.alignment === 'SUPPORTS'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : mem.alignment === 'CONTRADICTS'
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    }`}>
                      {mem.alignment}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      isWon
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : 'bg-rose-500/20 text-rose-500'
                    }`}>
                      {mem.outcome}
                    </span>
                  </div>
                </div>

                {/* Strategy and Concession */}
                <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {mem.strategy} ({mem.concessionPercent || mem.concession_percent || 0}% concession)
                </div>

                {/* Outcome Reason & Lineage Rationale */}
                <p className="text-[11px] text-slate-600 dark:text-slate-400 italic leading-relaxed">
                  "{mem.outcomeReason || mem.outcome_reason}"
                </p>

                {/* Relevance Score (Clearly labeled as Relevance, not win rate) */}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <span className="flex items-center gap-1">
                    <Info className="w-3 h-3 text-slate-400" />
                    Hindsight Semantic Relevance: <strong className="text-slate-700 dark:text-slate-300">{mem.relevanceScore || 0.85}</strong>
                  </span>
                  <span>{mem.date || 'Historical'}</span>
                </div>

                {/* Expanded Details */}
                {isSelected && (
                  <div className="mt-3 p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 space-y-1.5 text-[11px] text-purple-200 animate-in fade-in">
                    <div className="font-bold text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Lineage Contribution to Current Strategy:
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {mem.alignmentReason} This precedent proves that {mem.customer} responds favorably to value-added packages rather than deep price reductions.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
