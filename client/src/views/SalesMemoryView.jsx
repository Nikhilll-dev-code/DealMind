import React, { useEffect, useMemo, useState } from 'react';
import { Database, Sparkles, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Lightbulb } from 'lucide-react';
import { getMemoryExplorer, getLearningTimeline } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouteContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

function confidenceTier(wins, losses) {
  const sample = wins + losses;
  if (sample === 0) return { label: 'NONE', tone: 'bg-dm-subtle text-dm-muted border-dm-border' };
  if (sample === 1) return { label: 'PRELIMINARY', tone: 'bg-amber-50 text-amber-600 border-amber-200' };
  if (sample <= 4) return { label: 'EMERGING', tone: 'bg-dm-tint text-dm-deep border-dm-blue/30' };
  return { label: 'ESTABLISHED', tone: 'bg-dm-soft text-emerald-700 border-dm-radium/40' };
}

/**
 * Organizational Memory for the Sales Representative (Two-Role spec §12, §37).
 * Business learning, not infrastructure internals: strongest negotiation patterns,
 * recent learnings, customer/segment learnings and conflicting evidence — all
 * derived from real stored records via the existing APIs.
 */
export default function SalesMemoryView() {
  const { tenantId } = useAuth();
  const { navigate } = useRouter();
  const [deals, setDeals] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMemoryExplorer('', '', '').catch(() => ({ structuredDeals: [] })),
      getLearningTimeline(tenantId).catch(() => [])
    ])
      .then(([mem, tl]) => {
        setDeals(Array.isArray(mem?.structuredDeals) ? mem.structuredDeals : []);
        setTimeline(Array.isArray(tl) ? tl : []);
      })
      .finally(() => setLoading(false));
  }, [tenantId]);

  const { patterns, learnings } = useMemo(() => {
    const closed = deals.filter(d => d.outcome === 'WON' || d.outcome === 'LOST');
    const pending = deals.filter(d => d.outcome === 'PENDING');

    // Strongest patterns: aggregated strategy performance across real records
    const byStrategy = {};
    for (const d of closed) {
      const key = d.strategy || 'Unspecified';
      byStrategy[key] = byStrategy[key] || { won: 0, lost: 0, total: 0, concessions: [], terms: [] };
      byStrategy[key].total++;
      byStrategy[key][d.outcome === 'WON' ? 'won' : 'lost']++;
      byStrategy[key].concessions.push(Number(d.concession_percent) || 0);
      byStrategy[key].terms.push(Number(d.contract_years) || 1);
    }
    const strategyPatterns = Object.entries(byStrategy)
      .map(([strategy, s]) => {
        const avg = arr => Math.round(arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length));
        const wins = s.won, losses = s.lost;
        const tier = confidenceTier(wins, losses);
        return {
          id: strategy,
          headline: `${strategy}`,
          detail: `${avg(s.concessions)}% average concession · ${avg(s.terms)}-year average term across ${s.total} closed deal${s.total === 1 ? '' : 's'}.`,
          supporting: wins,
          conflicting: losses,
          tier: tier.label,
          tierTone: tier.tone
        };
      })
      .sort((a, b) => (b.supporting - b.conflicting) - (a.supporting - a.conflicting))
      .slice(0, 4);

    // Customer-level learnings: outcome mix per customer
    const byCustomer = {};
    for (const d of closed) {
      byCustomer[d.customer] = byCustomer[d.customer] || { won: 0, lost: 0, concessions: [] };
      byCustomer[d.customer][d.outcome === 'WON' ? 'won' : 'lost']++;
      byCustomer[d.customer].concessions.push(Number(d.concession_percent) || 0);
    }
    const customerLearnings = Object.entries(byCustomer)
      .map(([customer, s]) => {
        const min = Math.min(...s.concessions), max = Math.max(...s.concessions);
        const tier = confidenceTier(s.won, s.lost);
        return {
          customer,
          wins: s.won,
          losses: s.lost,
          range: min === max ? `${min}%` : `${min}–${max}%`,
          tier: tier.label,
          tierTone: tier.tone,
          conflict: s.won > 0 && s.lost > 0
        };
      })
      .sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))
      .slice(0, 5);

    return { patterns: strategyPatterns, learnings: customerLearnings };
  }, [deals]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-dm-tint text-dm-blue flex items-center justify-center">
              <Database className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-dm-ink">Organizational Memory</h1>
          </div>
          <p className="text-xs text-dm-muted mt-1.5">
            Here's what DealMind has learned from your organization's negotiations.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-dm-soft border border-dm-radium/40 text-emerald-700 text-[11px] font-bold self-start">
          <Sparkles className="w-3.5 h-3.5" /> Learning from {deals.length} stored negotiations
        </span>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map(i => <div key={i} className="h-28 rounded-2xl dm-shimmer animate-shimmer" />)}
        </div>
      ) : deals.length === 0 ? (
        <Card className="p-16 text-center space-y-3">
          <Database className="w-10 h-10 text-dm-muted mx-auto" />
          <h3 className="text-sm font-bold text-dm-ink">No organizational memory yet</h3>
          <p className="text-xs text-dm-muted max-w-md mx-auto">
            Complete a negotiation and record the outcome — DealMind will retain what worked into memory automatically.
          </p>
          <Button variant="primary" onClick={() => navigate('/negotiations/new')}>+ New Negotiation</Button>
        </Card>
      ) : (
        <>
          {/* Strongest negotiation patterns (real aggregates) */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-dm-ink flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-dm-blue" /> Strongest negotiation patterns
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {patterns.map(p => (
                <Card key={p.id} className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-bold text-sm text-dm-ink leading-snug">{p.headline}</div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${p.tierTone}`}>{p.tier}</span>
                  </div>
                  <p className="text-xs text-dm-muted leading-relaxed">{p.detail}</p>
                  <div className="flex items-center gap-4 text-[11px] font-semibold pt-1">
                    <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> {p.supporting} supporting</span>
                    <span className="inline-flex items-center gap-1 text-rose-500"><XCircle className="w-3.5 h-3.5" /> {p.conflicting} conflicting</span>
                  </div>
                </Card>
              ))}
              {patterns.length === 0 && (
                <Card className="p-6 text-xs text-dm-muted italic">No closed negotiations yet — patterns appear after outcomes are recorded.</Card>
              )}
            </div>
          </section>

          {/* Customer learnings incl. conflicting evidence (spec §12) */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-dm-ink flex items-center gap-2">
              <Database className="w-4 h-4 text-dm-blue" /> Customer & segment learnings
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {learnings.map(l => (
                <Card key={l.customer} className="p-5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-dm-ink">{l.customer}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${l.tierTone}`}>{l.tier}</span>
                  </div>
                  <div className="text-xs text-dm-muted">
                    {l.wins} won · {l.losses} lost · historical concession range <strong className="text-dm-ink">{l.range}</strong>
                  </div>
                  {l.conflict && (
                    <div className="flex items-start gap-2 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>Mixed record — wins and losses both observed for this customer. Evidence is conflicting.</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>

          {/* Recent learning events (real retention events) */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-dm-ink flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-dm-blue" /> Recent learnings
            </h2>
            {timeline.length === 0 ? (
              <Card className="p-6 text-xs text-dm-muted italic">No learning events recorded yet. Record an outcome to capture the first lesson.</Card>
            ) : (
              <Card className="divide-y divide-dm-border">
                {timeline.slice(0, 5).map(evt => (
                  <div key={evt.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-dm-ink">{evt.customer} · {evt.event_type}</div>
                      <div className="text-[11px] text-dm-muted font-mono truncate">{evt.memory_retained}</div>
                    </div>
                    <div className="text-right shrink-0 text-[11px]">
                      <div className="text-dm-muted">{evt.before_confidence} → <strong className="text-emerald-600">{evt.after_confidence}</strong></div>
                      <div className="text-dm-muted font-mono">{evt.timestamp?.slice(0, 10)}</div>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </section>

          {/* Open deals reminder (pending, awaiting learning) */}
          {deals.some(d => d.outcome === 'PENDING') && (
            <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dm-tint/40 border-dm-blue/20">
              <div className="text-xs text-dm-ink">
                <strong>{deals.filter(d => d.outcome === 'PENDING').length} active deals</strong> are still in negotiation — their outcomes will become organizational memory once recorded.
              </div>
              <Button variant="secondary" size="sm" onClick={() => navigate('/negotiations')}>
                Open deals <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
