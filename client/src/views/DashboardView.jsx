import React from 'react';
import { 
  TrendingUp, 
  Briefcase, 
  Award, 
  Database, 
  PlusCircle, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert,
  ArrowUpRight,
  BrainCircuit,
  Sparkles
} from 'lucide-react';
import { useRouter } from '../context/RouteContext';
import { useAuth } from '../context/AuthContext';
import Card, { CardHeader, CardBody } from '../components/common/Card';
import Button from '../components/common/Button';
import { OutcomeBadge } from '../components/common/Badge';

export default function DashboardView({ 
  negotiations = [], 
  memories = [], 
  pendingApprovals = [], 
  timeline = [],
  onAnalyzeDeal 
}) {
  const { navigate } = useRouter();
  const { user, hasRole } = useAuth();

  const completedDeals = negotiations.filter(n => n.outcome === 'WON' || n.outcome === 'LOST');
  const wonDeals = negotiations.filter(n => n.outcome === 'WON');
  const totalPipeline = negotiations.reduce((acc, n) => acc + (Number(n.initialOffer || n.initial_offer || 100000)), 0);
  const winRate = completedDeals.length > 0 ? Math.round((wonDeals.length / completedDeals.length) * 100) : 67;

  // Calculate estimated total concession savings
  const totalSavings = negotiations.reduce((acc, n) => {
    const dVal = Number(n.initialOffer || n.initial_offer || 100000);
    const reqDisc = Number(n.requestedDiscountPercent || n.requested_discount_percent || 20);
    const propDisc = Number(n.concessionPercent || n.concession_percent || 8);
    const saved = Math.max(0, Math.round(dVal * ((reqDisc - propDisc) / 100)));
    return acc + saved;
  }, 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Hero Welcome Banner — seamless in light and dark mode */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-dm-border dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-card dark:shadow-none">
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dm-tint dark:bg-indigo-950/50 border border-dm-blue/20 dark:border-indigo-800/40 text-dm-deep dark:text-indigo-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-dm-blue dark:text-indigo-400" />
            <span>AI Negotiation Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-dm-ink dark:text-white tracking-tight">
            Sales Workspace
          </h1>
          <p className="text-dm-muted dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
            Ground every customer discount counteroffer in verified organizational memory, deterministic concession economics, and calibrated confidence models.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Button
              variant="primary"
              icon={PlusCircle}
              onClick={() => navigate('/negotiations/new')}
            >
              + New Negotiation
            </Button>
          </div>
        </div>
      </div>

      {/* Pending Approvals Alert Banner (Admins — Two-Role spec §3, §58) */}
      {hasRole(['ADMIN']) && pendingApprovals.length > 0 && (
        <div 
          onClick={() => navigate('/approvals')}
          className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center justify-between cursor-pointer hover:bg-amber-50/80 dark:hover:bg-amber-950/40 transition"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-700 dark:text-amber-300">
                {pendingApprovals.length} Discount Escalation{pendingApprovals.length > 1 ? 's' : ''} Awaiting Review
              </div>
              <p className="text-[11px] text-amber-600/90 dark:text-amber-300/80">
                Sales reps requested concessions exceeding the 15% standard threshold policy.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300">
            Review Queue →
          </Button>
        </div>
      )}

      {/* 4 Executive Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Active Pipeline',
            value: negotiations.length,
            sub: `$${(totalPipeline / 1000).toFixed(0)}k total volume`,
            icon: Briefcase,
            color: 'text-dm-blue dark:text-indigo-400'
          },
          {
            label: 'Win Rate',
            value: `${winRate}%`,
            sub: `${wonDeals.length} won / ${completedDeals.length - wonDeals.length} lost`,
            icon: Award,
            color: 'text-emerald-500 dark:text-emerald-400'
          },
          {
            label: 'Concession Saved',
            value: `$${(totalSavings / 1000).toFixed(0)}k`,
            sub: 'preserved vs requests',
            icon: TrendingUp,
            color: 'text-blue-500 dark:text-blue-400'
          },
          {
            label: 'Memory Bank',
            value: memories.length || negotiations.length,
            sub: 'historical episodes',
            icon: Database,
            color: 'text-purple-500 dark:text-purple-400'
          }
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {label}
              </span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{value}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{sub}</div>
          </Card>
        ))}
      </div>

      {/* Grid: Recent Negotiations + Recent Learning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Negotiations Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              action={
                <Button variant="ghost" size="sm" onClick={() => navigate('/negotiations')}>
                  View All ({negotiations.length}) →
                </Button>
              }
            >
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">Recent Negotiations</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Click any deal to launch the intelligence workspace.</p>
            </CardHeader>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {negotiations.slice(0, 6).map((deal) => {
                const dv = Number(deal.initialOffer || deal.initial_offer || 100000);
                const dealId = deal.deal_id || deal.dealId;
                return (
                  <div
                    key={dealId}
                    onClick={() => onAnalyzeDeal(deal)}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="font-mono text-xs font-bold text-dm-blue dark:text-indigo-400 w-16 shrink-0 truncate">
                        {dealId}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-dm-blue dark:group-hover:text-indigo-400 transition truncate">
                          {deal.customer}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {deal.segment} · {deal.strategy || 'Standard'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        ${dv.toLocaleString()}
                      </span>
                      <OutcomeBadge outcome={deal.outcome} />
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-dm-blue dark:group-hover:text-indigo-400 transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Recent Learning Timeline */}
        <div>
          <Card>
            <CardHeader
              action={
                <Button variant="ghost" size="sm" onClick={() => navigate('/learning')}>
                  Timeline →
                </Button>
              }
            >
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">Hindsight Learning</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Live memory evolution events.</p>
            </CardHeader>

            <CardBody className="space-y-3.5 p-4">
              {timeline.slice(0, 4).map((evt) => (
                <div key={evt.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{evt.customer}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                      {evt.event_type}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Win Rate: {evt.before_wins}W/{evt.before_losses}L → <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{evt.after_wins}W/{evt.after_losses}L</strong>
                  </div>
                </div>
              ))}
              {timeline.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-4">No learning events recorded yet.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
