import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  ShieldCheck, 
  DollarSign, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  FlaskConical, 
  SlidersHorizontal, 
  MessageSquareReply, 
  FileCheck2, 
  Building2, 
  Sparkles, 
  Activity, 
  Clock, 
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Radio,
  ArrowRightLeft,
  GitCommit,
  Scale
} from 'lucide-react';
import { useRouter } from '../context/RouteContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { connectAgentStream } from '../services/sseClient';
import Card, { CardHeader, CardBody } from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { ConfidenceBadge } from '../components/common/Badge';
import StrategyLab from '../components/StrategyLab';
import WhatIfSimulator from '../components/WhatIfSimulator';
import CounterofferAdvisor from '../components/CounterofferAdvisor';
import CustomerProfile from '../components/CustomerProfile';
import OutcomeRecorder from '../components/OutcomeRecorder';
import GiveGetPanel from '../components/GiveGetPanel';
import PrecedentLineage from '../components/PrecedentLineage';
import EvidenceConflictMatrix from '../components/EvidenceConflictMatrix';

function EvidenceCard({ mem }) {
  const [expanded, setExpanded] = useState(false);
  const isApi = mem.source === 'hindsight_api';
  const isObservation = mem.memoryType === 'observation';

  return (
    <div className={`p-4 rounded-2xl border space-y-2 transition ${
      isObservation 
        ? 'bg-purple-950/20 border-purple-500/30' 
        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{mem.dealId || mem.deal_id}</span>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{mem.customer}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
            isObservation 
              ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30' 
              : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
          }`}>
            {isObservation ? 'Observation' : 'Confirmed Fact'}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
            isApi ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
          }`}>
            {isApi ? 'Hindsight Cloud' : 'SQLite Local'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {mem.relevanceScore && (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              Score: {mem.relevanceScore}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
            mem.outcome === 'WON' 
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
          }`}>
            {mem.outcome}
          </span>
          <button onClick={() => setExpanded(p => !p)} className="text-slate-400 hover:text-slate-200">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
        {mem.strategy} ({mem.concessionPercent || mem.concession_percent || 0}% off)
      </div>

      {expanded && (
        <div className="pt-2 space-y-1.5 border-t border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-slate-600 dark:text-slate-400 italic leading-relaxed">
            "{mem.outcomeReason || mem.outcome_reason}"
          </p>
          <div className="flex gap-3 text-[10px] text-slate-400 font-mono flex-wrap">
            {mem.date && <span>Date: {mem.date}</span>}
            {mem.contractYears && <span>Term: {mem.contractYears}yr</span>}
            {mem.initialOffer && <span>Offer: ${Number(mem.initialOffer).toLocaleString()}</span>}
            <span className="italic">{mem.source || 'Hindsight Memory'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DealWorkspaceView({ 
  currentDeal, 
  analysis, 
  onRecordOutcomeQuick, 
  onOutcomeRecorded, 
  onRefreshData 
}) {
  const { navigate } = useRouter();
  const toast = useToast();
  const [workspaceTab, setWorkspaceTab] = useState('overview');
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [liveStreamEvents, setLiveStreamEvents] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Active SSE live stream listener if active sessionId is present
  useEffect(() => {
    if (!analysis?.sessionId) return;
    setIsStreaming(true);
    const client = connectAgentStream(analysis.sessionId, {
      onEvent: (evt) => {
        setLiveStreamEvents(prev => [...prev, evt]);
      },
      onComplete: () => {
        setIsStreaming(false);
      }
    });

    return () => client.close();
  }, [analysis?.sessionId]);

  if (!analysis || !currentDeal) {
    return (
      <div className="p-16 text-center text-slate-400 space-y-4 max-w-md mx-auto">
        <Brain className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Active Negotiation Selected</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Start a new negotiation intake or choose an existing deal from the pipeline to launch the intelligence workspace.
        </p>
        <Button variant="primary" onClick={() => navigate('/negotiations/new')}>
          + New Negotiation
        </Button>
      </div>
    );
  }

  const { 
    deal, 
    recommendation, 
    confidence, 
    economics, 
    evidence, 
    conflicts, 
    evidenceConflictMatrix,
    giveGetOptions,
    reflection, 
    agentTrace = [], 
    reasoningMode, 
    approval 
  } = analysis;

  const memories = evidence?.memories || [];
  const noEvidence = memories.length === 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Brain },
    { id: 'give-get', label: 'Give-Get Intelligence', icon: ArrowRightLeft, badge: giveGetOptions?.recommendations?.length || 5 },
    { id: 'lineage', label: 'Precedent Lineage', icon: GitCommit, badge: memories.length },
    { id: 'conflict-matrix', label: 'Conflict Matrix', icon: Scale, badge: evidenceConflictMatrix?.hasConflict ? '!' : undefined },
    { id: 'what-if', label: 'What-If Comparator', icon: SlidersHorizontal },
    { id: 'strategies', label: 'Strategy Lab', icon: FlaskConical },
    { id: 'counteroffer', label: 'Counteroffer', icon: MessageSquareReply },
    { id: 'evidence', label: 'Evidence Bank', icon: Database, badge: memories.length },
    { id: 'customer', label: 'Customer Profile', icon: Building2 },
    { id: 'trace', label: 'Agent Trace', icon: Activity, badge: agentTrace.length }
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Sticky Context Header */}
      <Card className="p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {deal.customer}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono border border-slate-200 dark:border-slate-700 font-bold">
                {deal.segment} · {deal.industry}
              </span>
              <ConfidenceBadge confidence={confidence.finalConfidence} tierLabel={confidence.evidenceTier?.label} />
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[11px] font-mono border border-indigo-500/30">
                {reasoningMode}
              </span>
            </div>

            <div className="flex items-center gap-5 text-xs text-slate-500 dark:text-slate-400 mt-2 flex-wrap">
              <span>Deal Value: <strong className="text-slate-900 dark:text-white font-mono">${Number(deal.dealValue).toLocaleString()}</strong></span>
              <span>Requested Concession: <strong className="text-rose-500 font-mono">{deal.requestedDiscountPercent}%</strong></span>
              <span>Competitor: <strong className={deal.competitorPressure ? 'text-amber-500' : 'text-emerald-500'}>{deal.competitorPressure ? 'Yes' : 'No'}</strong></span>
              <span>Contract: <strong className="text-indigo-500 font-mono">{deal.contractYears} Year</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="success"
              icon={FileCheck2}
              onClick={() => setShowOutcomeModal(true)}
            >
              Record Outcome
            </Button>
          </div>
        </div>

        {/* Manager Approval Required Warning */}
        {approval?.required && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-amber-600 dark:text-amber-300 flex items-center gap-2">
                  <span>Manager Approval Escalation Required</span>
                  <span className="px-2 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-200 text-[10px] font-mono font-bold">
                    Discount &gt; {approval.threshold}%
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-200/80 mt-0.5 leading-relaxed">{approval.reason}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/approvals')} className="shrink-0 border-amber-500/40 text-amber-500">
              Go to Approvals Center →
            </Button>
          </div>
        )}

        {/* Workspace Tab Bar */}
        <div className="flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-800 mt-5 pt-4 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = workspaceTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setWorkspaceTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    tab.badge === '!' 
                      ? 'bg-amber-500 text-white' 
                      : isActive 
                        ? 'bg-indigo-700 text-white' 
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* SUB-TAB: Overview */}
      {workspaceTab === 'overview' && (
        <div className="space-y-6">
          {/* Conflict Alert */}
          {(conflicts?.detected || evidenceConflictMatrix?.hasConflict) && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-600 dark:text-amber-300 text-xs">Customer vs Segment Precedent Conflict Detected</div>
                <p className="text-xs text-amber-700 dark:text-amber-200/80 mt-0.5 leading-relaxed">
                  {conflicts?.reason || evidenceConflictMatrix?.conflictExplanation}
                </p>
              </div>
            </div>
          )}

          {/* AI RECOMMENDATION */}
          <Card className="p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-500" />
                <h2 className="font-bold text-slate-900 dark:text-white text-base">DealMind Grounded Recommendation</h2>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Evidence: {confidence.sampleWins}W / {confidence.sampleLosses}L ({confidence.evidenceTier?.label || 'Calibrated'})
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50">
              <p className="font-bold text-indigo-900 dark:text-indigo-300 text-sm leading-relaxed">{recommendation.headline}</p>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-3">
              {recommendation.primaryText.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            {recommendation.keyTakeaways?.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {recommendation.keyTakeaways.map((takeaway, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{takeaway}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Hindsight Strategic Reflection */}
          {reflection && (
            <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/20 to-slate-900 border border-purple-500/30 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Hindsight Strategic Reflection</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">Hindsight reflect()</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {reflection}
              </p>
            </div>
          )}

          {/* Economics & Confidence Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Economics */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Concession Economics</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Deterministic</span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Requested {deal.requestedDiscountPercent}% discount</span>
                  <span className="font-mono font-bold text-rose-500">-${economics.requestedConcession.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Recommended {economics.proposedDiscountPercent}% discount</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">-${economics.proposedConcession.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 block text-xs">Concession Difference</span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      ${economics.concessionSavings.toLocaleString()} less concession vs requested {deal.requestedDiscountPercent}%
                    </span>
                  </div>
                  <span className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">+${economics.concessionSavings.toLocaleString()}</span>
                </div>
              </div>
            </Card>

            {/* Confidence Calibration */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Confidence & Evidence Tier</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Evidence Tier</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{confidence.evidenceTier?.label || 'Standard'}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Sample Size</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{confidence.sampleSize} Deals</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Wins / Losses</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{confidence.sampleWins}W / {confidence.sampleLosses}L</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Win Rate</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">{confidence.winRate}%</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 leading-relaxed">
                Rules: 1 deal → Preliminary (LOW) · 2–4 deals → Emerging · 5+ deals → Established
              </div>
            </Card>
          </div>

          {/* Recalled Memories Summary */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Hindsight Memory Evidence</h3>
              </div>
              <span className="text-xs text-purple-600 dark:text-purple-300 font-medium">
                {noEvidence ? '0 historical deals found' : `${memories.length} relevant past experiences`}
              </span>
            </div>

            {noEvidence ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 italic">
                No comparable historical memory found for this customer or segment. Confidence is LOW. Record the outcome to build memory!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {memories.map((mem) => (
                  <EvidenceCard key={mem.dealId || mem.deal_id} mem={mem} />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* SUB-TAB: Feature A Give-Get Intelligence */}
      {workspaceTab === 'give-get' && (
        <GiveGetPanel 
          currentDeal={currentDeal}
          giveGetOptions={giveGetOptions}
          onAdoptConcession={(selectedOpt) => {
            setWorkspaceTab('what-if');
            toast.success('Give-Get Adopted', `Loaded ${selectedOpt.title} into What-If Simulator.`);
          }}
          onNavigateTab={setWorkspaceTab}
        />
      )}

      {/* SUB-TAB: Feature B Precedent Lineage */}
      {workspaceTab === 'lineage' && (
        <PrecedentLineage 
          currentDeal={currentDeal}
          analysis={analysis}
          onRecordOutcome={() => setShowOutcomeModal(true)}
        />
      )}

      {/* SUB-TAB: Feature C Evidence Conflict Matrix */}
      {workspaceTab === 'conflict-matrix' && (
        <EvidenceConflictMatrix 
          evidenceConflictMatrix={evidenceConflictMatrix}
          currentDeal={currentDeal}
          confidence={confidence}
        />
      )}

      {/* SUB-TAB: Feature D What-If Comparator */}
      {workspaceTab === 'what-if' && (
        <WhatIfSimulator 
          currentDeal={currentDeal}
          onAdoptScenario={(sc) => {
            setWorkspaceTab('counteroffer');
            toast.success('Scenario Adopted', `Prepared counteroffer from ${sc.name}.`);
          }}
        />
      )}

      {/* SUB-TAB: Strategy Lab */}
      {workspaceTab === 'strategies' && (
        <StrategyLab 
          strategyOptions={analysis.strategyOptions}
          currentDeal={currentDeal}
          reflection={reflection}
          onSelectStrategy={(key, strat) => {
            setWorkspaceTab('what-if');
          }}
          onNavigateTab={setWorkspaceTab}
        />
      )}

      {/* SUB-TAB: Counteroffer Advisor */}
      {workspaceTab === 'counteroffer' && (
        <CounterofferAdvisor 
          currentDeal={currentDeal}
          onRecordOutcome={onRecordOutcomeQuick}
          onNavigateTab={(tab) => {
            if (tab === 'outcome') {
              setShowOutcomeModal(true);
            } else {
              setWorkspaceTab(tab);
            }
          }}
        />
      )}

      {/* SUB-TAB: Evidence Bank */}
      {workspaceTab === 'evidence' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Hindsight Evidence Bank</h3>
              <p className="text-xs text-slate-500">Confirmed historical deals vs synthesized observations.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memories.map((mem) => (
              <EvidenceCard key={mem.dealId || mem.deal_id} mem={mem} />
            ))}
          </div>
        </Card>
      )}

      {/* SUB-TAB: Customer Profile */}
      {workspaceTab === 'customer' && (
        <CustomerProfile 
          customerId={deal.customerId}
          customerName={deal.customer}
          segment={deal.segment}
        />
      )}

      {/* SUB-TAB: Agent Trace */}
      {workspaceTab === 'trace' && (
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Agent Activity & Tool Execution Trace</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Verifiable trace of tool invocations, duration timings, and callers.</p>
              </div>
            </div>
            {isStreaming && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 animate-pulse">
                <Radio className="w-3 h-3 text-indigo-400" /> SSE Live
              </span>
            )}
          </div>

          <div className="space-y-3">
            {agentTrace.map((step) => (
              <div key={step.step} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-mono font-bold">
                      {step.step}
                    </span>
                    <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-300">{step.tool}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      step.caller === 'llm_autonomous' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
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
                    <Clock className="w-3 h-3" />
                    <span>{step.durationMs}ms</span>
                    <span className="text-emerald-500 font-bold">✓ {step.status}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-300 font-medium pl-8">
                  {step.reason}
                </div>

                <div className="pl-8 pt-1">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                    {step.outputSummary}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Outcome Recorder Modal */}
      {showOutcomeModal && (
        <Modal
          isOpen={showOutcomeModal}
          onClose={() => setShowOutcomeModal(false)}
          title="Record Negotiation Outcome"
          subtitle={`Deal: ${deal.customer} (${deal.dealId || deal.deal_id || 'DEAL-NEW'})`}
        >
          <OutcomeRecorder
            currentDeal={currentDeal}
            onOutcomeRecorded={(updated) => {
              toast.success('Outcome Retained', `Experience stored in Hindsight memory for ${deal.customer}.`);
              if (onOutcomeRecorded) onOutcomeRecorded(updated);
              if (onRefreshData) onRefreshData();
            }}
            onCancel={() => setShowOutcomeModal(false)}
          />
        </Modal>
      )}
    </div>
  );
}
