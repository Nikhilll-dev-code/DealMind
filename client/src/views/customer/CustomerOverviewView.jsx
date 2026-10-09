import React, { useEffect, useState } from 'react';
import { PlusCircle, Handshake, Activity, TrendingUp, ArrowRight, FileText } from 'lucide-react';
import { useRouter } from '../../context/RouteContext';
import { getCustomerOverview } from '../../services/api';
import { useScrollReveal, useCountUp } from '../../hooks/useScrollReveal';
import { formatCurrency } from '../../lib/format';

function MetricCard({ icon: Icon, label, value, suffix = '', tone = 'blue', delay = 0 }) {
  const [ref, visible] = useScrollReveal();
  const count = useCountUp(Number(value) || 0, visible);
  const toneMap = {
    blue: 'bg-dm-tint text-dm-blue',
    radium: 'bg-dm-soft text-emerald-700',
    amber: 'bg-amber-50 text-amber-600'
  };
  return (
    <div ref={ref} className={`bg-white border border-dm-border rounded-2xl shadow-card p-5 dm-scroll-reveal ${visible ? 'is-visible' : ''}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className={`w-9 h-9 rounded-xl ${toneMap[tone]} flex items-center justify-center mb-3`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl font-black text-dm-ink">{count}{suffix}</div>
      <div className="text-xs text-dm-muted mt-0.5">{label}</div>
    </div>
  );
}

export default function CustomerOverviewView() {
  const { navigate } = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomerOverview()
      .then(setData)
      .catch(() => setData({ activeNegotiations: [], agreements: [], metrics: {} }))
      .finally(() => setLoading(false));
  }, []);

  const active = data?.activeNegotiations || [];
  const agreements = data?.agreements || [];
  const metrics = data?.metrics || {};

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-dm-ink">Your negotiation workspace</h1>
          <p className="mt-1.5 text-sm text-dm-muted">Track active negotiations and the agreements you've reached.</p>
        </div>
        <button
          onClick={() => navigate('/customer/negotiations/new')}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-dm-blue rounded-xl hover:bg-dm-deep transition-all shadow-md shadow-dm-blue/25 hover:-translate-y-0.5 self-start"
        >
          <PlusCircle className="w-4 h-4" /> Start New Negotiation
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <MetricCard icon={Activity} label="Active negotiations" value={metrics.activeCount || 0} tone="blue" />
        <MetricCard icon={Handshake} label="Agreements reached" value={metrics.agreementsCount || 0} tone="radium" delay={80} />
        <MetricCard icon={TrendingUp} label="Win rate" value={metrics.winRate || 0} suffix="%" tone="amber" delay={160} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-bold text-dm-ink mb-3">Active negotiations</h2>
          {loading ? (
            <div className="space-y-3">{[0, 1].map(i => <div key={i} className="h-20 rounded-2xl dm-shimmer animate-shimmer" />)}</div>
          ) : active.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No active negotiations"
              body="Start a negotiation and DealMind will prepare an evidence-grounded counteroffer."
              cta="Start New Negotiation"
              onCta={() => navigate('/customer/negotiations/new')}
            />
          ) : (
            <div className="space-y-3">
              {active.map(d => (
                <button
                  key={d.deal_id}
                  onClick={() => navigate(`/customer/negotiations/${encodeURIComponent(d.deal_id)}`)}
                  className="w-full text-left bg-white border border-dm-border rounded-2xl p-4 hover:border-dm-blue/40 hover:shadow-lift transition-all group"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-dm-ink truncate">{d.strategy || 'Negotiation'}</div>
                      <div className="text-xs text-dm-muted mt-0.5">{formatCurrency(d.initial_offer)} · {d.contract_years}yr</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${d.status === 'ESCALATED' ? 'bg-amber-50 text-amber-700' : 'bg-dm-tint text-dm-deep'}`}>
                      {d.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-dm-blue font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Continue <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-bold text-dm-ink mb-3">Recent agreements</h2>
          {agreements.length === 0 ? (
            <EmptyState icon={Handshake} title="No agreements yet" body="When you and DealMind reach acceptable terms, the agreement appears here." />
          ) : (
            <div className="space-y-3">
              {agreements.slice(0, 5).map(a => (
                <div key={a.deal_id} className="bg-white border border-dm-border rounded-2xl p-4 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-dm-soft text-emerald-700 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-dm-ink truncate">{a.strategy || 'Agreement'}</div>
                    <div className="text-xs text-dm-muted">{formatCurrency(a.counter_offer)} · {a.outcome_reason?.slice(0, 60)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body, cta, onCta }) {
  return (
    <div className="bg-white border border-dashed border-dm-border rounded-2xl p-8 text-center">
      <div className="w-11 h-11 rounded-2xl bg-dm-subtle text-dm-muted flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-bold text-dm-ink">{title}</h3>
      <p className="mt-1 text-xs text-dm-muted max-w-xs mx-auto">{body}</p>
      {cta && (
        <button onClick={onCta} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-dm-blue hover:text-dm-deep">
          {cta} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
