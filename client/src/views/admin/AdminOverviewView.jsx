import React, { useEffect, useState } from 'react';
import { Briefcase, Trophy, ShieldCheck, Database, TrendingUp, Activity, ArrowRight, Server } from 'lucide-react';
import { useRouter } from '../../context/RouteContext';
import { useAuth } from '../../context/AuthContext';
import { getHealth, getNegotiations, getApprovals, getLearningTimeline, getMemoryExplorer } from '../../services/api';
import { useScrollReveal, useCountUp } from '../../hooks/useScrollReveal';
import { formatCurrency, formatDateTime } from '../../lib/format';

function Metric({ icon: Icon, label, value, suffix, tone = 'blue', delay = 0 }) {
  const [ref, visible] = useScrollReveal();
  const count = useCountUp(Number(value) || 0, visible);
  const tones = { blue: 'bg-dm-tint text-dm-blue', radium: 'bg-dm-soft text-emerald-700', amber: 'bg-amber-50 text-amber-600', slate: 'bg-dm-subtle text-dm-muted' };
  return (
    <div ref={ref} className={`bg-white border border-dm-border rounded-2xl shadow-card p-5 dm-scroll-reveal ${visible ? 'is-visible' : ''}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className={`w-9 h-9 rounded-xl ${tones[tone]} flex items-center justify-center mb-3`}><Icon className="w-4 h-4" /></div>
      <div className="text-2xl font-black text-dm-ink">{count}{suffix || ''}</div>
      <div className="text-xs text-dm-muted mt-0.5">{label}</div>
    </div>
  );
}

export default function AdminOverviewView() {
  const { navigate } = useRouter();
  const { hasRole } = useAuth();
  const [data, setData] = useState({ deals: [], approvals: [], timeline: [], memories: [], health: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getNegotiations().catch(() => []),
      hasRole(['ADMIN']) ? getApprovals().catch(() => []) : Promise.resolve([]),
      getLearningTimeline().catch(() => []),
      getMemoryExplorer('', '', '').catch(() => ({ memories: [] })),
      getHealth().catch(() => null)
    ]).then(([deals, approvals, timeline, mems, health]) => {
      setData({
        deals: Array.isArray(deals) ? deals : [],
        approvals: Array.isArray(approvals) ? approvals : [],
        timeline: Array.isArray(timeline) ? timeline : [],
        memories: mems?.memories || [],
        health
      });
    }).finally(() => setLoading(false));
  }, [hasRole]);

  const deals = data.deals;
  const won = deals.filter(d => d.outcome === 'WON').length;
  const closed = deals.filter(d => d.outcome === 'WON' || d.outcome === 'LOST').length;
  const winRate = closed > 0 ? Math.round((won / closed) * 100) : 0;
  const totalValue = deals.reduce((a, d) => a + (Number(d.initial_offer) || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-7">
        <h1 className="text-2xl font-black tracking-tight text-dm-ink">Admin overview</h1>
        <p className="mt-1.5 text-sm text-dm-muted">Company-wide negotiation intelligence and learning activity.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Metric icon={Briefcase} label="Negotiations" value={deals.length} tone="blue" />
        <Metric icon={Trophy} label="Win rate" value={winRate} suffix="%" tone="radium" delay={80} />
        <Metric icon={ShieldCheck} label="Pending approvals" value={data.approvals.length} tone="amber" delay={160} />
        <Metric icon={Database} label="Memories retained" value={data.memories.length} tone="slate" delay={240} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white border border-dm-border rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-dm-ink flex items-center gap-2"><Activity className="w-4 h-4 text-dm-blue" /> Recent negotiations</h2>
            <button onClick={() => navigate('/admin/negotiations')} className="text-xs font-bold text-dm-blue hover:text-dm-deep inline-flex items-center gap-1">View all <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
          {loading ? (
            <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-12 rounded-xl dm-shimmer animate-shimmer" />)}</div>
          ) : deals.length === 0 ? (
            <p className="text-xs text-dm-muted">No negotiations recorded for this company yet.</p>
          ) : (
            <div className="divide-y divide-dm-border">
              {deals.slice(0, 6).map(d => (
                <div key={d.deal_id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-dm-ink truncate">{d.customer} · {d.segment}</div>
                    <div className="text-[10px] text-dm-muted font-mono">{d.deal_id}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-semibold text-dm-ink">{formatCurrency(d.initial_offer)}</div>
                    <div className={`text-[10px] font-bold ${d.outcome === 'WON' ? 'text-emerald-600' : d.outcome === 'LOST' ? 'text-rose-500' : 'text-dm-muted'}`}>{d.outcome}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="bg-white border border-dm-border rounded-2xl shadow-card p-5">
            <h2 className="text-sm font-bold text-dm-ink mb-3 flex items-center gap-2"><Server className="w-4 h-4 text-dm-blue" /> System health</h2>
            <dl className="space-y-2 text-xs">
              {[
                ['Database', data.health?.database?.connected ? 'Connected' : '—'],
                ['Hindsight memory', data.health?.hindsight?.status || '—'],
                ['Groq AI router', data.health?.groq?.status || '—'],
                ['Redis', data.health?.redis?.mode || data.health?.redis?.status || '—']
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <dt className="text-dm-muted">{k}</dt>
                  <dd className="font-semibold text-dm-ink capitalize">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 pt-3 border-t border-dm-border flex items-center justify-between text-xs">
              <span className="text-dm-muted">Pipeline value</span>
              <span className="font-black text-dm-ink">{formatCurrency(totalValue)}</span>
            </div>
          </div>

          <div className="bg-white border border-dm-border rounded-2xl shadow-card p-5">
            <h2 className="text-sm font-bold text-dm-ink mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-dm-blue" /> Learning activity</h2>
            {data.timeline.length === 0 ? (
              <p className="text-xs text-dm-muted">No learning events recorded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {data.timeline.slice(0, 4).map(ev => (
                  <div key={`${ev.deal_id}-${ev.timestamp}`} className="text-[11px]">
                    <div className="font-semibold text-dm-ink">{ev.event_type} · {ev.customer}</div>
                    <div className="text-dm-muted">{ev.before_confidence} → {ev.after_confidence} · {formatDateTime(ev.timestamp)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
