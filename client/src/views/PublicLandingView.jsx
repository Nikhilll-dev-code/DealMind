import React, { useState, useEffect } from 'react';
import {
  BrainCircuit, ArrowRight, ShieldCheck, Database, Sparkles, LineChart,
  GitCompareArrows, FileCheck2, Lock, CheckCircle2, Menu, X, Zap, Layers,
  History, Scale, MessageSquareQuote
} from 'lucide-react';
import { useRouter } from '../context/RouteContext';
import { useScrollReveal } from '../hooks/useScrollReveal';

function BrandMark({ onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 group">
      <span className="w-9 h-9 rounded-xl bg-dm-blue flex items-center justify-center shadow-lg shadow-dm-blue/25 group-hover:shadow-dm-blue/40 transition-shadow">
        <BrainCircuit className="w-5 h-5 text-white" />
      </span>
      <span className="text-left leading-tight">
        <span className="block font-extrabold text-[15px] tracking-tight text-dm-ink">DealMind</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-dm-muted">Negotiation Intelligence</span>
      </span>
    </button>
  );
}

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`dm-scroll-reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const LOOP_STEPS = [
  { icon: History, label: 'Past Deals', detail: 'Historical negotiations retained' },
  { icon: Database, label: 'Hindsight Memory', detail: 'Organizational long-term recall' },
  { icon: FileCheck2, label: 'Evidence', detail: 'Comparable precedents retrieved' },
  { icon: BrainCircuit, label: 'AI Recommendation', detail: 'Grounded counteroffer' },
  { icon: CheckCircle2, label: 'Agreement', detail: 'Terms both sides accept' },
  { icon: Sparkles, label: 'New Memory', detail: 'Outcome becomes experience' }
];

function AnimatedLoopPreview() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const t = setInterval(() => setActive(a => (a + 1) % LOOP_STEPS.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative">
      <div className="absolute -inset-6 bg-dm-tint/60 rounded-[28px] blur-2xl -z-10" />
      <div className="bg-dm-surface border border-dm-border rounded-2xl shadow-card overflow-hidden">
        {/* window chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-dm-border bg-dm-subtle/60">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 text-[11px] font-medium text-dm-muted">Live negotiation · Acme Corp</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { k: 'Requested', v: '20%', tone: 'text-rose-500' },
              { k: 'Recommended', v: '10%', tone: 'text-dm-blue' },
              { k: 'Retained', v: '$12K', tone: 'text-emerald-600' }
            ].map((m) => (
              <div key={m.k} className="rounded-xl border border-dm-border bg-dm-bg/70 p-3">
                <div className="text-[10px] uppercase tracking-wider text-dm-muted font-semibold">{m.k}</div>
                <div className={`text-lg font-extrabold ${m.tone}`}>{m.v}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {LOOP_STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === active;
              return (
                <div
                  key={s.label}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-500 ${
                    isActive ? 'border-dm-blue/40 bg-dm-tint shadow-sm translate-x-1' : 'border-dm-border bg-white'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-dm-blue text-white' : 'bg-dm-subtle text-dm-muted'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-dm-ink">{s.label}</div>
                    <div className="text-[10px] text-dm-muted truncate">{s.detail}</div>
                  </div>
                  {isActive && <span className="w-2 h-2 rounded-full bg-dm-radium ring-4 ring-dm-soft animate-pulse" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicLandingView() {
  const { navigate } = useRouter();
  const [mobileNav, setMobileNav] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (id) => {
    setMobileNav(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const navLinks = [
    { label: 'Product', id: 'product' },
    { label: 'How It Works', id: 'how' },
    { label: 'About', id: 'about' }
  ];

  return (
    <div className="min-h-screen bg-dm-bg text-dm-ink font-sans antialiased">
      {/* Top navigation */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/85 backdrop-blur-md border-b border-dm-border' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <BrandMark onClick={() => navigate('/')} />

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => go(l.id)} className="text-sm font-medium text-dm-muted hover:text-dm-ink transition-colors">
                {l.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-semibold text-dm-ink hover:text-dm-blue transition-colors">
              Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-4 py-2 text-sm font-semibold text-white bg-dm-blue rounded-xl hover:bg-dm-deep transition-all shadow-md shadow-dm-blue/20 hover:shadow-dm-blue/30"
            >
              Sign Up
            </button>
          </div>

          <button className="md:hidden p-2 text-dm-ink" onClick={() => setMobileNav(v => !v)} aria-label="Toggle navigation">
            {mobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileNav && (
          <div className="md:hidden bg-white border-b border-dm-border px-5 py-4 space-y-1 animate-fade-in">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => go(l.id)} className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-dm-muted hover:bg-dm-subtle">
                {l.label}
              </button>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={() => navigate('/login')} className="flex-1 px-4 py-2.5 text-sm font-semibold border border-dm-border rounded-xl">Login</button>
              <button onClick={() => navigate('/signup')} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-dm-blue rounded-xl">Sign Up</button>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 dm-grid-bg opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] -z-10" />
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-20 grid lg:grid-cols-2 gap-14 items-center">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-dm-tint border border-dm-blue/20 text-dm-deep text-[11px] font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5 text-dm-blue" /> Evidence-first negotiation
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black leading-[1.05] tracking-tight">
              Negotiation intelligence, <span className="dm-text-gradient">reimagined.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-dm-muted leading-relaxed max-w-xl">
              DealMind turns your organization's past negotiations into your next best move —
              a live sales-rep cockpit pairing Hindsight long-term memory with deterministic
              economics and AI reasoning, so every counteroffer is grounded in evidence, not guesswork.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/signup')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-dm-blue rounded-xl hover:bg-dm-deep transition-all shadow-lg shadow-dm-blue/25 hover:shadow-dm-blue/40 hover:-translate-y-0.5"
              >
                Open the workspace <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => go('how')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-dm-ink border border-dm-border bg-white rounded-xl hover:border-dm-blue/40 hover:bg-dm-tint/40 transition-all"
              >
                See how it works
              </button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-dm-muted">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-dm-blue" /> Company guardrails enforced</span>
              <span className="inline-flex items-center gap-1.5"><Lock className="w-4 h-4 text-dm-blue" /> Tenant-isolated memory</span>
            </div>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
            <AnimatedLoopPreview />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-dm-border bg-white/60">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-dm-muted">
          {[
            { icon: Database, text: 'Hindsight organizational memory' },
            { icon: Scale, text: 'Deterministic economics' },
            { icon: ShieldCheck, text: 'RBAC & governance' },
            { icon: GitCompareArrows, text: 'Multi-model AI fallback' }
          ].map(t => (
            <span key={t.text} className="inline-flex items-center gap-2 text-xs font-semibold">
              <t.icon className="w-4 h-4 text-dm-blue" /> {t.text}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-dm-blue mb-3">How DealMind works</div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">A closed loop that learns from every deal</h2>
            <p className="mt-4 text-dm-muted">Past deals become memory. Memory becomes evidence. Evidence becomes your next recommendation — and the outcome feeds back in.</p>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {LOOP_STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.label} delay={i * 70}>
                <div className="group h-full rounded-2xl border border-dm-border bg-white p-5 hover:border-dm-blue/40 hover:shadow-lift transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-xl bg-dm-tint text-dm-blue flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="text-2xl font-black text-dm-border group-hover:text-dm-blue/30 transition-colors">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-bold text-dm-ink">{s.label}</h3>
                  <p className="mt-1.5 text-sm text-dm-muted leading-relaxed">{s.detail}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* AI + Memory */}
      <section id="product" className="bg-white border-y border-dm-border">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 grid lg:grid-cols-2 gap-14 items-center">
          <Reveal>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-dm-blue mb-3">AI + Memory</div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Reasoning that remembers your organization</h2>
            <p className="mt-5 text-dm-muted leading-relaxed">
              A token-budgeted multi-model router reasons over your request, while Hindsight recall
              surfaces the customer-specific deals that actually happened. Customer and segment
              evidence are separated, and conflicts are surfaced — not hidden.
            </p>
            <ul className="mt-7 space-y-3.5">
              {[
                'Customer-specific precedent takes priority; segment evidence is fallback',
                'Evidence tiers: NONE → PRELIMINARY → EMERGING → ESTABLISHED',
                'Conflict detection caps confidence when history disagrees'
              ].map(t => (
                <li key={t} className="flex items-start gap-3 text-sm text-dm-ink">
                  <CheckCircle2 className="w-5 h-5 text-dm-blue shrink-0 mt-0.5" /> {t}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <div className="rounded-2xl border border-dm-border bg-dm-bg p-5 space-y-3">
              {[
                { customer: 'Acme Corp', outcome: 'WON', detail: '8% + support package', tier: 'ESTABLISHED' },
                { customer: 'Globex Inc', outcome: 'WON', detail: '10% + 2-year term', tier: 'EMERGING' },
                { customer: 'Orion Systems', outcome: 'LOST', detail: '22% direct price cut', tier: 'PRELIMINARY' }
              ].map((e, i) => (
                <div key={e.customer} className="flex items-center justify-between rounded-xl bg-white border border-dm-border px-4 py-3 animate-slide-in-right" style={{ animationDelay: `${i * 90}ms` }}>
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${e.outcome === 'WON' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <div>
                      <div className="text-sm font-bold text-dm-ink">{e.customer}</div>
                      <div className="text-xs text-dm-muted">{e.detail}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-dm-tint text-dm-deep">{e.tier}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Evidence-backed negotiation */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20 grid lg:grid-cols-2 gap-14 items-center">
        <Reveal className="order-2 lg:order-1">
          <div className="rounded-2xl border border-dm-border bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquareQuote className="w-5 h-5 text-dm-blue" />
              <span className="text-sm font-bold text-dm-ink">Counteroffer, grounded in precedent</span>
            </div>
            <div className="rounded-xl bg-dm-tint/60 border border-dm-blue/15 p-4 text-sm text-dm-deep leading-relaxed">
              "We can't grant a 20% direct reduction. Based on your deployment, we can offer a
              10% concession with our Premium Support Package — the same structure that closed
              8 of your comparable enterprise deals."
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-dm-muted">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              Cited from 3 retained precedents · traceable to stored records
            </div>
          </div>
        </Reveal>
        <Reveal delay={120} className="order-1 lg:order-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-dm-blue mb-3">Evidence-backed negotiation</div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Every claim traceable to a real record</h2>
          <p className="mt-5 text-dm-muted leading-relaxed">
            DealMind never invents history. Each recommendation cites the negotiation episodes it
            drew from, shows confidence strength, and exposes contradictory evidence instead of
            papering over it.
          </p>
        </Reveal>
      </section>

      {/* Dataset intelligence + What-if */}
      <section className="bg-white border-y border-dm-border">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 grid sm:grid-cols-2 gap-6">
          <Reveal>
            <div className="h-full rounded-2xl border border-dm-border bg-dm-bg p-6">
              <Layers className="w-6 h-6 text-dm-blue mb-4" />
              <h3 className="text-xl font-black">Dataset intelligence</h3>
              <p className="mt-2.5 text-sm text-dm-muted leading-relaxed">
                Admins upload CSV or JSON negotiation history. Every row is validated, previewed,
                and reported — valid, invalid, duplicate, and missing — before a single record is
                imported or retained in memory.
              </p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="h-full rounded-2xl border border-dm-border bg-dm-bg p-6">
              <LineChart className="w-6 h-6 text-dm-blue mb-4" />
              <h3 className="text-xl font-black">What-if & strategy lab</h3>
              <p className="mt-2.5 text-sm text-dm-muted leading-relaxed">
                Model discount, term, and support independently. Compare conservative, balanced,
                and aggressive packages with a full deterministic economics breakdown.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Governance / trust */}
      <section id="about" className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
        <Reveal>
          <div className="rounded-3xl bg-dm-deep text-white px-6 sm:px-12 py-14 relative overflow-hidden">
            <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-dm-blue/40 blur-3xl" />
            <div className="relative max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-[11px] font-bold uppercase tracking-wider mb-5">
                <ShieldCheck className="w-3.5 h-3.5" /> Enterprise governance
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Guardrails the AI cannot override</h2>
              <p className="mt-4 text-white/70 leading-relaxed">
                Company limits live in code, not in the model. Requests beyond configured ceilings
                are refused and escalated. Roles are enforced server-side, tenants are isolated,
                and customer data never crosses boundaries.
              </p>
              <div className="mt-8 grid sm:grid-cols-3 gap-4">
                {[
                  { icon: Lock, t: 'Server-side RBAC' },
                  { icon: ShieldCheck, t: 'Anti-self-approval' },
                  { icon: Database, t: 'Tenant isolation' }
                ].map(x => (
                  <div key={x.t} className="flex items-center gap-2.5 text-sm font-semibold">
                    <x.icon className="w-4 h-4 text-dm-radium" /> {x.t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 pb-20 text-center">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Turn past negotiations into your next best move</h2>
          <p className="mt-4 text-dm-muted">Start a negotiation and watch evidence, guardrails, and economics converge into a grounded counteroffer.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate('/signup')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-dm-blue rounded-xl hover:bg-dm-deep transition-all shadow-lg shadow-dm-blue/25 hover:-translate-y-0.5"
            >
              Create a sales workspace <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-dm-ink border border-dm-border bg-white rounded-xl hover:border-dm-blue/40"
            >
              Sign in
            </button>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-dm-border bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandMark onClick={() => navigate('/')} />
          <p className="text-xs text-dm-muted">© {new Date().getFullYear()} DealMind · Evidence-first B2B negotiation intelligence</p>
          <div className="flex items-center gap-5 text-xs font-medium text-dm-muted">
            <button onClick={() => go('product')} className="hover:text-dm-ink">Product</button>
            <button onClick={() => go('how')} className="hover:text-dm-ink">How It Works</button>
            <button onClick={() => navigate('/login')} className="hover:text-dm-ink">Login</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
