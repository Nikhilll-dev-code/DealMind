import React, { useState } from 'react';
import { 
  Brain, 
  ShieldCheck, 
  DollarSign, 
  Database, 
  CheckCircle2,
  AlertTriangle, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  FlaskConical,
  SlidersHorizontal,
  MessageSquareReply,
  FileCheck2,
  Building2,
  Search,
  Sparkles,
  PlusCircle,
  X
} from 'lucide-react';

import StrategyLab from './StrategyLab';
import WhatIfSimulator from './WhatIfSimulator';
import CounterofferAdvisor from './CounterofferAdvisor';
import CustomerProfile from './CustomerProfile';
import OutcomeRecorder from './OutcomeRecorder';

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
    <div className="p-4 rounded-2xl bg-[#101622] border border-[#20293a] space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-blue-400">{mem.dealId || mem.deal_id}</span>
          <span className="text-xs font-bold text-slate-200">{mem.customer}</span>
          {mem.segment && (
            <span className="text-[10px] text-slate-500 font-mono">{mem.segment}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold ${
            mem.outcome === 'WON' 
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
          }`}>
            {mem.outcome}
          </span>
          <button onClick={() => setExpanded(p => !p)} className="text-slate-500 hover:text-slate-300">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="text-xs text-slate-300 font-medium">{mem.strategy} ({mem.concessionPercent || mem.concession_percent || 0}% off)</div>

      {expanded && (
        <div className="pt-2 space-y-1.5 border-t border-[#20293a]">
          <p className="text-[11px] text-slate-400 italic leading-relaxed">"{mem.outcomeReason || mem.outcome_reason}"</p>
          <div className="flex gap-3 text-[10px] text-slate-500 font-mono flex-wrap">
            {mem.date && <span>Date: {mem.date}</span>}
            {mem.contractYears && <span>Term: {mem.contractYears}yr</span>}
            {mem.initialOffer && <span>Offer: ${mem.initialOffer?.toLocaleString()}</span>}
            <span className="italic">{mem.source || 'Hindsight Memory'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DealWorkspace({ 
  currentDeal, 
  analysis, 
  onNewNegotiation,
  onRecordOutcomeQuick,
  onOutcomeRecorded,
  onRefreshData
}) {
  const [workspaceTab, setWorkspaceTab] = useState('overview');
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);

  if (!analysis || !currentDeal) {
    return (
      <div className="p-16 text-center text-slate-400 space-y-4 max-w-md mx-auto">
        <Brain className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-lg font-bold text-white">No Active Deal Opened</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Start a new negotiation or select a recent deal from the dashboard to open the workspace.
        </p>
        <button
          onClick={onNewNegotiation}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/20"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ New Negotiation</span>
        </button>
      </div>
    );
  }

  const { deal, recommendation, confidence, economics, evidence, conflicts } = analysis;
  const memories = evidence?.memories || [];
  const noEvidence = memories.length === 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Brain },
    { id: 'strategies', label: 'Strategies', icon: FlaskConical },
    { id: 'what-if', label: 'What-if', icon: SlidersHorizontal },
    { id: 'counteroffer', label: 'Counteroffer', icon: MessageSquareReply },
    { id: 'evidence', label: 'Evidence', icon: Database, badge: memories.length },
    { id: 'customer', label: 'Customer', icon: Building2 },
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Context Header */}
      <div className="bg-[#161f2e] border border-[#20293a] rounded-3xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-white">{deal.customer}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
                {deal.segment} · {deal.industry}
              </span>
              <ConfidenceBadge confidence={confidence.finalConfidence} />
            </div>
            <div className="flex items-center gap-5 text-xs text-slate-400 mt-2 flex-wrap">
              <span>Deal Value: <strong className="text-white font-mono">${Number(deal.dealValue).toLocaleString()}</strong></span>
              <span>Requested Discount: <strong className="text-rose-400 font-mono">{deal.requestedDiscountPercent}%</strong></span>
              <span>Competitor: <strong className={deal.competitorPressure ? 'text-amber-400' : 'text-emerald-400'}>{deal.competitorPressure ? 'Yes' : 'No'}</strong></span>
              <span>Contract: <strong className="text-blue-400 font-mono">{deal.contractYears} Year</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOutcomeModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Record Outcome</span>
            </button>
          </div>
        </div>

        {/* Inner Tabs Bar */}
        <div className="flex items-center gap-2 border-t border-[#20293a] mt-5 pt-4 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = workspaceTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setWorkspaceTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#20293a]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT: Overview */}
      {workspaceTab === 'overview' && (
        <div className="space-y-6">
          {/* Conflict Alert if present */}
          {conflicts?.detected && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-300 text-sm">Customer vs Segment Conflict Detected</div>
                <p className="text-xs text-amber-200/70 mt-0.5 leading-relaxed">{conflicts.reason}</p>
              </div>
            </div>
          )}

          {/* DEALMIND RECOMMENDATION */}
          <div className="bg-[#161f2e] border border-[#20293a] rounded-3xl p-7 space-y-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-[#20293a]">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-400" />
                <h2 className="font-bold text-white text-base">DealMind Recommendation</h2>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Based on {confidence.sampleWins}W / {confidence.sampleLosses}L historical evidence
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/20">
              <p className="font-bold text-blue-300 text-sm leading-relaxed">{recommendation.headline}</p>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed space-y-3">
              {recommendation.primaryText.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            {recommendation.keyTakeaways?.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {recommendation.keyTakeaways.map((takeaway, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#101622] border border-[#20293a]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-300 leading-relaxed">{takeaway}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ECONOMICS & CONFIDENCE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Economics */}
            <div className="bg-[#161f2e] border border-[#20293a] rounded-3xl p-6 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-[#20293a] pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-white text-sm">Economics & Concession Analysis</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Deterministic</span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs p-3.5 rounded-xl bg-[#101622] border border-[#20293a]">
                  <span className="text-slate-400">Requested {deal.requestedDiscountPercent}% discount</span>
                  <span className="font-mono font-bold text-rose-400">-${economics.requestedConcession.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs p-3.5 rounded-xl bg-[#101622] border border-[#20293a]">
                  <span className="text-slate-400">Recommended {economics.proposedDiscountPercent}% discount</span>
                  <span className="font-mono font-bold text-blue-400">-${economics.proposedConcession.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                  <div>
                    <span className="font-bold text-emerald-300 block text-xs">Concession Difference</span>
                    <span className="text-[11px] text-emerald-400">
                      ${economics.concessionSavings.toLocaleString()} less in discount concession compared with a {deal.requestedDiscountPercent}% discount
                    </span>
                  </div>
                  <span className="font-mono text-xl font-black text-emerald-400">+${economics.concessionSavings.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Confidence */}
            <div className="bg-[#161f2e] border border-[#20293a] rounded-3xl p-6 space-y-4 shadow-lg">
              <div className="flex items-center gap-2 border-b border-[#20293a] pb-3">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-white text-sm">Confidence & Evidence Scope</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#101622] border border-[#20293a]">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Scope</div>
                  <div className="text-sm font-bold text-white capitalize">{confidence.primaryScope}-level</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#101622] border border-[#20293a]">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Sample Size</div>
                  <div className="text-sm font-bold text-white">{confidence.sampleSize} Deals</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#101622] border border-[#20293a]">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Wins / Losses</div>
                  <div className="text-sm font-bold text-white">{confidence.sampleWins}W / {confidence.sampleLosses}L</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#101622] border border-[#20293a]">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Win Rate</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono">{confidence.winRate}%</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed">
                Rules: &lt;3 deals → LOW · ≥70% win rate → HIGH · 40–69% → MEDIUM · &lt;40% → LOW
              </div>
            </div>
          </div>

          {/* HINDSIGHT EVIDENCE */}
          <div className="bg-[#161f2e] border border-[#20293a] rounded-3xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#20293a] pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-white text-sm">Hindsight Memory</h3>
              </div>
              <span className="text-xs text-purple-300 font-medium">
                {noEvidence ? '0 relevant negotiations' : `${memories.length} relevant past negotiations found`}
              </span>
            </div>

            {noEvidence ? (
              <div className="p-4 rounded-2xl bg-[#101622] border border-[#20293a] text-xs text-slate-400 italic">
                No comparable historical memory found for this customer or segment. Confidence is LOW. Record the outcome upon completion to build memory!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {memories.map((mem) => (
                  <EvidenceCard key={mem.dealId || mem.deal_id} mem={mem} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Strategies */}
      {workspaceTab === 'strategies' && (
        <StrategyLab 
          strategyOptions={analysis.strategyOptions}
          currentDeal={currentDeal}
          onSelectStrategy={(key, strat) => {
            setWorkspaceTab('what-if');
          }}
          onNavigateTab={setWorkspaceTab}
        />
      )}

      {/* TAB CONTENT: What-if */}
      {workspaceTab === 'what-if' && (
        <WhatIfSimulator currentDeal={currentDeal} />
      )}

      {/* TAB CONTENT: Counteroffer */}
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

      {/* TAB CONTENT: Evidence */}
      {workspaceTab === 'evidence' && (
        <div className="bg-[#161f2e] border border-[#20293a] rounded-3xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#20293a] pb-3">
            <div>
              <h3 className="font-bold text-white text-base">Hindsight Evidence Bank</h3>
              <p className="text-xs text-slate-400">All recalled negotiation episodes matching {currentDeal.customer} and {currentDeal.segment}.</p>
            </div>
            <span className="text-xs font-mono text-purple-400">{memories.length} Memories Recalled</span>
          </div>

          <div className="space-y-3">
            {memories.map(mem => (
              <EvidenceCard key={mem.dealId || mem.deal_id} mem={mem} />
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Customer */}
      {workspaceTab === 'customer' && (
        <CustomerProfile customerId={currentDeal.customerId || 'acme-corp'} />
      )}

      {/* Outcome Recording Modal - Centered, Responsive, Scrollable */}
      {showOutcomeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#161f2e] border border-[#243048] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowOutcomeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            <OutcomeRecorder 
              currentDeal={currentDeal}
              onCancel={() => setShowOutcomeModal(false)}
              onOutcomeRecorded={(res) => {
                setShowOutcomeModal(false);
                if (onOutcomeRecorded) onOutcomeRecorded(res);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
