import React from 'react';
import { 
  PlusCircle, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  Briefcase,
  Award,
  Database,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight
} from 'lucide-react';

export default function OverviewDashboard({ 
  negotiations = [], 
  memories = [], 
  onAnalyzeDeal, 
  onNewNegotiation, 
  onStartDemo 
}) {
  const completedDeals = negotiations.filter(n => n.outcome === 'WON' || n.outcome === 'LOST');
  const wonDeals = negotiations.filter(n => n.outcome === 'WON');
  const totalPipeline = negotiations.reduce((acc, n) => acc + (Number(n.initialOffer || n.initial_offer || 100000)), 0);
  const winRate = completedDeals.length > 0 ? Math.round((wonDeals.length / completedDeals.length) * 100) : 67;

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="bg-[#161f2e] border border-[#20293a] rounded-3xl p-8 shadow-xl">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Negotiation Intelligence</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            DealMind
          </h1>
          <p className="text-slate-300 text-base leading-relaxed">
            Use your organization's negotiation experience to make better decisions on your next deal.
          </p>

          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={onNewNegotiation}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-sm transition shadow-lg shadow-blue-600/25"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ New Negotiation</span>
            </button>
            <button
              onClick={onStartDemo}
              className="flex items-center gap-2 px-6 py-3 bg-[#20293a] hover:bg-[#28354b] text-amber-300 font-semibold rounded-2xl text-sm transition border border-amber-500/20"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>▶ 60-Second Demo</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Deals', value: negotiations.length, sub: 'in current pipeline', icon: Briefcase, color: 'text-blue-400' },
          { label: 'Pipeline Value', value: `$${(totalPipeline / 1000).toFixed(0)}k`, sub: 'total deal value', icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Win Rate', value: `${winRate}%`, sub: `${wonDeals.length} won / ${completedDeals.length - wonDeals.length} lost`, icon: Award, color: 'text-amber-400' },
          { label: 'Historical Deals', value: memories.length || negotiations.length, sub: 'in Hindsight memory', icon: Database, color: 'text-purple-400' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-[#161f2e] border border-[#20293a] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-[11px] text-slate-400 mt-1">{sub}</div>
          </div>
        ))}
      </div>

      {/* Recent Deals Table */}
      <div className="bg-[#161f2e] border border-[#20293a] rounded-3xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-[#20293a] flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-base">Recent Deals</h2>
            <p className="text-xs text-slate-400">Click any deal to open its full negotiation workspace.</p>
          </div>
          <button 
            onClick={onNewNegotiation}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300"
          >
            + Add Deal
          </button>
        </div>

        <div className="divide-y divide-[#20293a]">
          {negotiations.slice(0, 8).map((deal) => {
            const dv = Number(deal.initialOffer || deal.initial_offer || 100000);
            const outcome = deal.outcome;
            const dealId = deal.deal_id || deal.dealId;
            return (
              <div 
                key={dealId} 
                onClick={() => onAnalyzeDeal(deal)}
                className="px-6 py-4 flex items-center justify-between hover:bg-[#1c273a] transition cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-slate-400 w-20 shrink-0">{dealId}</span>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-blue-400 transition">
                      {deal.customer}
                    </div>
                    <div className="text-xs text-slate-400">
                      {deal.segment} · {deal.strategy || 'Negotiation'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <span className="text-sm font-mono font-bold text-slate-200">${dv.toLocaleString()}</span>
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    outcome === 'WON'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : outcome === 'LOST'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {outcome === 'WON' ? <CheckCircle2 className="w-3 h-3" /> : outcome === 'LOST' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {outcome || 'ACTIVE'}
                  </span>
                  <button
                    className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-blue-600 text-slate-400 group-hover:text-white transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
