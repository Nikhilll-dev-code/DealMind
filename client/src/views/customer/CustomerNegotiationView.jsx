import React, { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, CheckCircle2, Handshake, Sparkles, FileCheck2, ShieldCheck,
  ChevronDown, ChevronUp, Send, BrainCircuit, Database, TrendingDown, Lock, AlertCircle
} from 'lucide-react';
import { useRouter } from '../../context/RouteContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getCustomerNegotiation, customerCounteroffer, acceptAgreement, getCustomerGuardrails
} from '../../services/api';
import { hasPermission, PERMISSIONS } from '../../lib/permissions';
import { formatCurrency, formatPercent } from '../../lib/format';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import IntelligenceTrace from '../../components/customer/IntelligenceTrace';

function StatusBadge({ status }) {
  const map = {
    ACTIVE: 'bg-dm-tint text-dm-deep border-dm-blue/20',
    AGREEMENT: 'bg-dm-soft text-emerald-800 border-emerald-200',
    ESCALATED: 'bg-amber-50 text-amber-700 border-amber-200',
    IMPORTED: 'bg-dm-subtle text-dm-muted border-dm-border'
  };
  const labels = { ACTIVE: 'In negotiation', AGREEMENT: 'Agreement reached', ESCALATED: 'Escalated', IMPORTED: 'Imported' };
  return (
    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${map[status] || map.ACTIVE}`}>
      {labels[status] || status}
    </span>
  );
}

function EvidenceCard({ mem, index }) {
  const [open, setOpen] = useState(false);
  const won = mem.outcome === 'WON';
  return (
    <div className="rounded-xl border border-dm-border bg-white overflow-hidden animate-fade-up" style={{ animationDelay: `${index * 70}ms` }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-dm-subtle/50 transition">
        <span className={`w-2 h-2 rounded-full shrink-0 ${won ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-dm-ink truncate">{mem.customer || 'Comparable deal'}</div>
          <div className="text-[11px] text-dm-muted truncate">
            {formatPercent(mem.concessionPercent || 0)} concession · {mem.outcome}
          </div>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-dm-subtle text-dm-muted shrink-0">#{mem.dealId}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-dm-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-dm-muted" />}
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 text-[11px] text-dm-muted leading-relaxed border-t border-dm-border pt-3">
          <div><span className="font-semibold text-dm-ink">Strategy:</span> {mem.strategy || '—'}</div>
          <div className="mt-1"><span className="font-semibold text-dm-ink">Outcome reason:</span> {mem.outcomeReason || '—'}</div>
          <div className="mt-1"><span className="font-semibold text-dm-ink">Source:</span> {mem.source || 'memory'}</div>
        </div>
      )}
    </div>
  );
}export default function CustomerNegotiationView({ dealId }) {
  const { navigate } = useRouter();
  const { role } = useAuth();
  const toast = useToast();
  const canAccess = role === 'CUSTOMER' || hasPermission(role, PERMISSIONS.DEALS_ANALYZE);
  const [deal, setDeal] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [guardrails, setGuardrails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [traceRunning, setTraceRunning] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [agreement, setAgreement] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!canAccess) {
      toast.error('Access denied', 'This workspace is only available to customer accounts.');
      setDenied(true);
    }
  }, [canAccess]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getCustomerNegotiation(dealId);
      setDeal(d);
      setCounterAmount(String(Math.round(Number(d.counter_offer) || Number(d.initial_offer) * 0.95)));
      if (d.status === 'AGREEMENT' || d.outcome === 'WON') setAgreement(true);

      // Recover the analysis handed off from the new-negotiation screen
      try {
        const cached = sessionStorage.getItem(`dm_analysis_${dealId}`);
        if (cached) setAnalysis(JSON.parse(cached));
      } catch (e) {}
    } catch (err) {
      setError(err.status === 404 ? 'This negotiation was not found.' : err.message);
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    load();
    getCustomerGuardrails().then(setGuardrails).catch(() => {});
  }, [load]);

  const submitCounteroffer = async (e) => {
    e.preventDefault();
    if (!counterAmount || Number(counterAmount) <= 0) return;
    setSubmitting(true);
    setTraceRunning(true);
    try {
      const res = await customerCounteroffer(dealId, Number(counterAmount), notes);
      if (res.escalated) {
        toast.warning('Escalated', res.message);
        setDeal(d => ({ ...d, status: 'ESCALATED' }));
        return;
      }
      setDeal(res.deal);
      if (res.counterResult?.analysis) {
        setAnalysis(res.counterResult.analysis);
        try { sessionStorage.setItem(`dm_analysis_${dealId}`, JSON.stringify(res.counterResult.analysis)); } catch (e) {}
      }
      setNotes('');
      toast.success('Counteroffer analyzed', 'DealMind updated its recommendation.');
    } catch (err) {
      toast.error('Counteroffer failed', err.message);
    } finally {
      setSubmitting(false);
      setTimeout(() => setTraceRunning(false), 900);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await acceptAgreement(dealId, { notes });
      setDeal(res.deal);
      setAgreement(true);
      toast.success('Agreement reached', 'This negotiation has been retained as new memory.');
    } catch (err) {
      toast.error('Could not accept', err.message);
    } finally {
      setAccepting(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="max-w-lg mx-auto px-5 py-20 text-center">
        <AlertCircle className="w-8 h-8 text-dm-blue mx-auto mb-3" />
        <h3 className="text-base font-bold text-dm-ink">This workspace is customer-only</h3>
        <p className="mt-1 text-sm text-dm-muted">Contact your company administrator if you need access.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/customer')}>Back to overview</Button>
      </div>
    );
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 space-y-4">
      <div className="h-8 w-48 rounded-lg dm-shimmer animate-shimmer" />
      <div className="h-40 rounded-2xl dm-shimmer animate-shimmer" />
    </div>;
  }

  if (error || !deal) {
    return (
      <div className="max-w-lg mx-auto px-5 py-20 text-center">
        <p className="text-sm text-dm-muted">{error || 'Negotiation not found.'}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/customer/negotiations')}>
          <ArrowLeft className="w-4 h-4" /> Back to negotiations
        </Button>
      </div>
    );
  }

  const reco = analysis?.recommendation;
  const evidence = analysis?.evidence?.memories || [];
  const confidence = analysis?.confidence;
  const economics = analysis?.economics;
  const currentDiscount = Number(deal.concession_percent) || 0;

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      <button onClick={() => navigate('/customer/negotiations')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-dm-muted hover:text-dm-ink mb-5">
        <ArrowLeft className="w-3.5 h-3.5" /> My negotiations
      </button>

      {/* Header */}
      <div className="bg-white border border-dm-border rounded-2xl shadow-card p-5 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black tracking-tight text-dm-ink">{deal.strategy || 'Negotiation'}</h1>
              <StatusBadge status={deal.status} />
            </div>
            <p className="mt-1 text-xs text-dm-muted font-mono">{deal.deal_id}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            {[
              ['Deal value', formatCurrency(deal.initial_offer)],
              ['You requested', `${deal.requested_discount_percent}%`],
              ['Current', formatPercent(currentDiscount)]
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[10px] uppercase tracking-wider text-dm-muted font-semibold">{k}</div>
                <div className="text-sm font-black text-dm-ink">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: proposal + evidence */}
        <div className="lg:col-span-2 space-y-6">
          {/* DealMind proposal */}
          <section className="bg-white border border-dm-border rounded-2xl shadow-card p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-xl bg-dm-blue text-white flex items-center justify-center">
                <BrainCircuit className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-dm-ink">DealMind's proposal</h2>
                <p className="text-[11px] text-dm-muted">Evidence-grounded recommendation</p>
              </div>
            </div>

            {reco ? (
              <div className="animate-fade-up">
                <div className="text-base font-black text-dm-ink leading-snug">{reco.headline}</div>
                <p className="mt-3 text-sm text-dm-muted leading-relaxed whitespace-pre-line">{reco.primaryText}</p>

                {reco.keyTakeaways?.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {reco.keyTakeaways.map((t, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-dm-ink">
                        <CheckCircle2 className="w-4 h-4 text-dm-blue shrink-0 mt-0.5" /> {t}
                      </li>
                    ))}
                  </ul>
                )}

                {reco.counterofferSuggestion && (
                  <div className="mt-5 rounded-xl bg-dm-tint/60 border border-dm-blue/15 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-dm-deep mb-1.5">Suggested response</div>
                    <p className="text-sm text-dm-deep leading-relaxed">{reco.counterofferSuggestion}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-dm-muted">
                No recommendation loaded for this session. Submit a counteroffer to generate fresh analysis.
              </div>
            )}

            {economics && (
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  ['Requested concession', formatCurrency(economics.requestedConcession), 'text-rose-500'],
                  ['Proposed concession', formatCurrency(economics.proposedConcession), 'text-dm-blue'],
                  ['Net retained', formatCurrency(economics.concessionSavings), 'text-emerald-600']
                ].map(([k, v, tone]) => (
                  <div key={k} className="rounded-xl border border-dm-border bg-dm-bg/70 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-dm-muted font-semibold">{k}</div>
                    <div className={`text-sm font-black ${tone}`}>{v}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Evidence */}
          <section className="bg-white border border-dm-border rounded-2xl shadow-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-dm-blue" />
                <h2 className="text-sm font-bold text-dm-ink">Evidence behind this recommendation</h2>
              </div>
              {confidence && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-dm-subtle text-dm-muted">
                  {confidence.evidenceTier?.tier || 'NONE'} · {confidence.winRate}% win
                </span>
              )}
            </div>

            {confidence?.conflictDetected && (
              <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{confidence.conflictReason}</span>
              </div>
            )}

            {evidence.length === 0 ? (
              <p className="text-xs text-dm-muted">
                No directly comparable historical deals were found. The recommendation relies on calibrated industry benchmarks.
              </p>
            ) : (
              <div className="space-y-2.5">
                {evidence.slice(0, 4).map((m, i) => <EvidenceCard key={m.dealId || i} mem={m} index={i} />)}
                {evidence.length > 4 && (
                  <p className="text-[11px] text-dm-muted pt-1">+{evidence.length - 4} more comparable deals retained in memory</p>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Right: trace, guardrails, actions */}
        <div className="space-y-6">
          <section className="bg-white border border-dm-border rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-2 mb-3.5">
              <Sparkles className="w-4 h-4 text-dm-blue" />
              <h2 className="text-sm font-bold text-dm-ink">DealMind Intelligence</h2>
            </div>
            <IntelligenceTrace running={traceRunning} completed={!traceRunning && !!analysis} compact />
          </section>

          {guardrails && (
            <section className="bg-dm-tint/50 border border-dm-blue/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-dm-deep" />
                <h2 className="text-sm font-bold text-dm-deep">Company guardrails</h2>
              </div>
              <dl className="space-y-2 text-xs">
                {[
                  ['Maximum discount', `${guardrails.max_discount_percent}%`],
                  ['Approval threshold', `${guardrails.manager_approval_threshold}%`],
                  ['Allowed term', `${guardrails.min_contract_years}–${guardrails.max_contract_years} years`]
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <dt className="text-dm-muted">{k}</dt>
                    <dd className="font-bold text-dm-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Negotiation actions */}
          {!agreement && deal.status !== 'ESCALATED' && (
            <section className="bg-white border border-dm-border rounded-2xl shadow-card p-5">
              <h2 className="text-sm font-bold text-dm-ink mb-3">Your move</h2>
              <form onSubmit={submitCounteroffer} className="space-y-3">
                <Input
                  label="Your counteroffer ($)"
                  type="number"
                  icon={TrendingDown}
                  value={counterAmount}
                  onChange={e => setCounterAmount(e.target.value)}
                  min="1"
                  max={deal.initial_offer}
                />
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add context or clarification (optional)"
                  className="w-full bg-white border border-dm-border rounded-xl py-2.5 px-3 text-xs text-dm-ink focus:outline-none focus:border-dm-blue focus:ring-2 focus:ring-dm-blue/15 resize-none"
                />
                <Button type="submit" loading={submitting} variant="outline" className="w-full">
                  <Send className="w-3.5 h-3.5" /> Send counteroffer
                </Button>
              </form>

              <div className="mt-3 pt-3 border-t border-dm-border">
                <Button onClick={handleAccept} loading={accepting} className="w-full" size="lg">
                  <Handshake className="w-4 h-4" /> Accept current terms
                </Button>
                <p className="mt-2 text-[11px] text-dm-muted text-center">
                  Accepting at {formatCurrency(deal.counter_offer)} ({formatPercent(currentDiscount)} concession)
                </p>
              </div>
            </section>
          )}

          {deal.status === 'ESCALATED' && (
            <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-amber-800">Escalated for review</h2>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">{deal.outcome_reason}</p>
            </section>
          )}
        </div>
      </div>

      {/* Agreement overlay */}
      {agreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-dm-ink/40 backdrop-blur-md animate-fade-in" />
          <div className="relative bg-white rounded-3xl border border-dm-border shadow-2xl max-w-lg w-full p-8 text-center animate-scale-in">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <span className="absolute inset-0 rounded-full bg-dm-radium/40 animate-pulse-ring" />
              <span className="relative w-16 h-16 rounded-full bg-dm-radium/90 flex items-center justify-center">
                <Handshake className="w-7 h-7 text-dm-deep" />
              </span>
            </div>
            <h2 className="text-2xl font-black text-dm-ink">Agreement reached</h2>
            <p className="mt-2 text-sm text-dm-muted">Both sides accepted the terms for {deal.deal_id}.</p>

            <div className="mt-6 grid grid-cols-3 gap-3 text-left">
              {[
                ['Final price', formatCurrency(deal.counter_offer)],
                ['Concession', formatPercent(deal.concession_percent)],
                ['Term', `${deal.contract_years} yr`]
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-dm-border bg-dm-bg p-3">
                  <div className="text-[10px] uppercase tracking-wider text-dm-muted font-semibold">{k}</div>
                  <div className="text-sm font-black text-dm-ink">{v}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-center gap-2.5 p-3.5 rounded-xl bg-dm-soft border border-emerald-200">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-semibold text-emerald-800">DealMind learned from this negotiation</span>
            </div>

            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAgreement(false)}>View workspace</Button>
              <Button className="flex-1" onClick={() => navigate('/customer/agreements')}>See agreements</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
