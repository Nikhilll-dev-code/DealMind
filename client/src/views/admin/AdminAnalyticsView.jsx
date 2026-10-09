import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Repeat, 
  DollarSign, 
  ShieldCheck, 
  Zap, 
  Building2, 
  Scale, 
  Layers, 
  Clock, 
  Filter, 
  ArrowUpRight, 
  PieChart, 
  Award, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Brain
} from 'lucide-react';
import { getNegotiations, getLearningTimeline } from '../../services/api';
import Card, { CardHeader, CardBody } from '../../components/common/Card';
import Button from '../../components/common/Button';
import { formatCurrency } from '../../lib/format';

export default function AdminAnalyticsView() {
  const [deals, setDeals] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState('ALL');
  const [selectedIndustry, setSelectedIndustry] = useState('ALL');

  useEffect(() => {
    Promise.all([
      getNegotiations().catch(() => []),
      getLearningTimeline().catch(() => [])
    ])
      .then(([d, t]) => {
        setDeals(Array.isArray(d) ? d : []);
        setTimeline(Array.isArray(t) ? t : []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filtered dataset
  const filteredDeals = useMemo(() => {
    return deals.filter(d => {
      const matchSeg = selectedSegment === 'ALL' || (d.segment || '').toLowerCase() === selectedSegment.toLowerCase();
      const matchInd = selectedIndustry === 'ALL' || (d.industry || '').toLowerCase() === selectedIndustry.toLowerCase();
      return matchSeg && matchInd;
    });
  }, [deals, selectedSegment, selectedIndustry]);

  // Comprehensive analytics calculations
  const metrics = useMemo(() => {
    const list = filteredDeals;
    const won = list.filter(d => d.outcome === 'WON');
    const lost = list.filter(d => d.outcome === 'LOST');
    const pending = list.filter(d => d.outcome === 'PENDING');
    const closed = won.length + lost.length;
    const winRate = closed > 0 ? Math.round((won.length / closed) * 100) : 0;

    // Total Financials
    const totalPipelineValue = list.reduce((acc, d) => acc + (Number(d.initial_offer) || 0), 0);
    const wonRevenue = won.reduce((acc, d) => {
      const init = Number(d.initial_offer) || 0;
      const conc = Number(d.concession_percent) || 0;
      return acc + (init * (1 - conc / 100));
    }, 0);

    // Concession Savings (Difference between customer asked discount and final negotiated concession)
    const totalMarginPreserved = won.reduce((acc, d) => {
      const init = Number(d.initial_offer) || 0;
      const reqDisc = Number(d.requested_discount_percent) || 20;
      const actConc = Number(d.concession_percent) || 10;
      const savingsPct = Math.max(0, reqDisc - actConc);
      return acc + (init * (savingsPct / 100));
    }, 0);

    const avgRequestedDiscount = closed > 0 
      ? Math.round(list.filter(d => d.outcome !== 'PENDING').reduce((acc, d) => acc + (Number(d.requested_discount_percent) || 20), 0) / closed) 
      : 20;

    const avgActualConcession = closed > 0 
      ? Math.round(list.filter(d => d.outcome !== 'PENDING').reduce((acc, d) => acc + (Number(d.concession_percent) || 0), 0) / closed) 
      : 0;

    // 1. Concession vs Win Rate Elasticity (0-10%, 11-15%, 16%+)
    const lowDiscDeals = list.filter(d => d.outcome !== 'PENDING' && (Number(d.concession_percent) || 0) <= 10);
    const medDiscDeals = list.filter(d => d.outcome !== 'PENDING' && (Number(d.concession_percent) || 0) > 10 && (Number(d.concession_percent) || 0) <= 15);
    const highDiscDeals = list.filter(d => d.outcome !== 'PENDING' && (Number(d.concession_percent) || 0) > 15);

    const elasticity = [
      {
        tier: 'Conservative (0–10%)',
        description: 'Value-Add Packages & Support Bundles',
        total: lowDiscDeals.length,
        won: lowDiscDeals.filter(d => d.outcome === 'WON').length,
        winRate: lowDiscDeals.length > 0 ? Math.round((lowDiscDeals.filter(d => d.outcome === 'WON').length / lowDiscDeals.length) * 100) : 0,
        tone: 'emerald',
        badge: 'Optimal Margin'
      },
      {
        tier: 'Moderate (11–15%)',
        description: 'Multi-Year & Prepayment Trade-offs',
        total: medDiscDeals.length,
        won: medDiscDeals.filter(d => d.outcome === 'WON').length,
        winRate: medDiscDeals.length > 0 ? Math.round((medDiscDeals.filter(d => d.outcome === 'WON').length / medDiscDeals.length) * 100) : 0,
        tone: 'blue',
        badge: 'Balanced'
      },
      {
        tier: 'Aggressive (16%+)',
        description: 'Deep Direct Price Concessions',
        total: highDiscDeals.length,
        won: highDiscDeals.filter(d => d.outcome === 'WON').length,
        winRate: highDiscDeals.length > 0 ? Math.round((highDiscDeals.filter(d => d.outcome === 'WON').length / highDiscDeals.length) * 100) : 0,
        tone: 'rose',
        badge: 'High Loss Risk'
      }
    ];

    // 2. Competitor Pressure Defense Analytics
    const compDeals = list.filter(d => d.outcome !== 'PENDING' && Boolean(d.competitor_pressure));
    const nonCompDeals = list.filter(d => d.outcome !== 'PENDING' && !Boolean(d.competitor_pressure));

    const compWon = compDeals.filter(d => d.outcome === 'WON').length;
    const nonCompWon = nonCompDeals.filter(d => d.outcome === 'WON').length;

    const compStats = {
      underPressure: {
        total: compDeals.length,
        won: compWon,
        winRate: compDeals.length > 0 ? Math.round((compWon / compDeals.length) * 100) : 0,
        supportBundledWins: compDeals.filter(d => d.outcome === 'WON' && (d.strategy || '').toLowerCase().includes('support')).length
      },
      normal: {
        total: nonCompDeals.length,
        won: nonCompWon,
        winRate: nonCompDeals.length > 0 ? Math.round((nonCompWon / nonCompDeals.length) * 100) : 0
      }
    };

    // 3. Contract Term (Years) Breakdown
    const terms = [1, 2, 3];
    const termStats = terms.map(yr => {
      const dealsInYr = list.filter(d => d.outcome === 'WON' && (Number(d.contract_years) || 1) === yr);
      const tcv = dealsInYr.reduce((acc, d) => {
        const ann = (Number(d.initial_offer) || 0) * (1 - (Number(d.concession_percent) || 0) / 100);
        return acc + (ann * yr);
      }, 0);
      return {
        years: yr,
        count: dealsInYr.length,
        tcv,
        avgDiscount: dealsInYr.length > 0 ? Math.round(dealsInYr.reduce((a, d) => a + (Number(d.concession_percent) || 0), 0) / dealsInYr.length) : 0
      };
    });

    // 4. Accounts breakdown
    const accounts = {};
    list.forEach(d => {
      const cust = d.customer || 'Unknown';
      accounts[cust] = accounts[cust] || {
        customer: cust,
        segment: d.segment || 'enterprise',
        industry: d.industry || 'tech',
        totalDeals: 0,
        wonDeals: 0,
        lostDeals: 0,
        pendingDeals: 0,
        totalValue: 0,
        avgConcession: 0,
        concessions: []
      };
      accounts[cust].totalDeals++;
      accounts[cust].totalValue += Number(d.initial_offer) || 0;
      if (d.outcome === 'WON') accounts[cust].wonDeals++;
      else if (d.outcome === 'LOST') accounts[cust].lostDeals++;
      else accounts[cust].pendingDeals++;
      if (d.outcome !== 'PENDING') accounts[cust].concessions.push(Number(d.concession_percent) || 0);
    });

    const accountList = Object.values(accounts).map(acc => {
      const closedCount = acc.wonDeals + acc.lostDeals;
      return {
        ...acc,
        winRate: closedCount > 0 ? Math.round((acc.wonDeals / closedCount) * 100) : 0,
        avgConcession: acc.concessions.length > 0 ? Math.round(acc.concessions.reduce((a, b) => a + b, 0) / acc.concessions.length) : 0
      };
    }).sort((a, b) => b.totalValue - a.totalValue);

    // 5. Objection Matrix
    const objections = {};
    list.forEach(d => {
      const obj = d.objection || 'Price Objection';
      objections[obj] = objections[obj] || { objection: obj, count: 0, won: 0, topStrategy: d.strategy || 'Support bundle' };
      objections[obj].count++;
      if (d.outcome === 'WON') {
        objections[obj].won++;
        objections[obj].topStrategy = d.strategy || d.chosen_strategy || objections[obj].topStrategy;
      }
    });

    const objectionList = Object.values(objections).sort((a, b) => b.count - a.count);

    return {
      won: won.length,
      lost: lost.length,
      pending: pending.length,
      closed,
      winRate,
      totalPipelineValue,
      wonRevenue,
      totalMarginPreserved,
      avgRequestedDiscount,
      avgActualConcession,
      elasticity,
      compStats,
      termStats,
      accountList,
      objectionList
    };
  }, [filteredDeals]);

  const industries = useMemo(() => {
    const set = new Set();
    deals.forEach(d => { if (d.industry) set.add(d.industry); });
    return Array.from(set);
  }, [deals]);

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8 space-y-8 animate-in fade-in duration-150">
      {/* Top Header & Context Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-6 h-6 text-dm-blue" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Commercial Intelligence & Negotiation Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Realized margins, discount elasticity, competitor defense impact, and customer relationship health.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold">Segment:</span>
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="dark:bg-slate-900">All Segments</option>
              <option value="enterprise" className="dark:bg-slate-900">Enterprise</option>
              <option value="mid-market" className="dark:bg-slate-900">Mid-Market</option>
              <option value="smb" className="dark:bg-slate-900">SMB</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-bold">Industry:</span>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="dark:bg-slate-900">All Industries</option>
              {industries.map(ind => (
                <option key={ind} value={ind} className="dark:bg-slate-900">{ind}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-dm-blue" />
          <p className="text-xs">Aggregating negotiation economics and learning metrics...</p>
        </div>
      ) : (
        <>
          {/* 1. Executive Metric Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Win Rate */}
            <Card className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Win Rate</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {metrics.winRate}%
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span className="text-emerald-500 font-bold">{metrics.won} Won</span> · <span className="text-rose-500 font-bold">{metrics.lost} Lost</span> · {metrics.pending} In-Flight
              </div>
            </Card>

            {/* Won Revenue */}
            <Card className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Won Revenue</span>
                <DollarSign className="w-4 h-4 text-dm-blue" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {formatCurrency(metrics.wonRevenue)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Total Pipeline: <strong className="text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(metrics.totalPipelineValue)}</strong>
              </div>
            </Card>

            {/* Margin Concession Preserved */}
            <Card className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Margin Preserved</span>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-500 font-mono">
                +{formatCurrency(metrics.totalMarginPreserved)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Retained vs requested buyer discounts
              </div>
            </Card>

            {/* Concession Discipline */}
            <Card className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Avg Concession</span>
                <Percent className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {metrics.avgActualConcession}%
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Buyer ask: <span className="text-rose-400 font-bold">{metrics.avgRequestedDiscount}%</span> (<span className="text-emerald-500 font-bold">-{metrics.avgRequestedDiscount - metrics.avgActualConcession}% drop</span>)
              </div>
            </Card>

            {/* Learning Evolution */}
            <Card className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Hindsight Memories</span>
                <Brain className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {timeline.length}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Calibrated learning milestones
              </div>
            </Card>
          </div>

          {/* 2. Main Analytics Grid: Discount Elasticity & Competitor Defense */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Concession vs Win Rate Elasticity Curve */}
            <div className="lg:col-span-7">
              <Card className="p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Scale className="w-4 h-4 text-dm-blue" />
                        Discount Elasticity vs Win-Rate Correlation
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Proves that granting unbundled deep price cuts fails to increase deal close rates.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 my-6">
                    {metrics.elasticity.map(tier => (
                      <div 
                        key={tier.tier}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{tier.tier}</span>
                            <span className="text-slate-400 text-[11px] block">{tier.description}</span>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                              tier.tone === 'emerald' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' :
                              tier.tone === 'blue' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' :
                              'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            }`}>
                              {tier.badge}
                            </span>
                            <div className="text-sm font-black font-mono text-slate-900 dark:text-white mt-1">
                              {tier.winRate}% Win Rate ({tier.won}/{tier.total})
                            </div>
                          </div>
                        </div>

                        {/* Progress bar visual */}
                        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${
                              tier.tone === 'emerald' ? 'bg-emerald-500' :
                              tier.tone === 'blue' ? 'bg-dm-blue' :
                              'bg-rose-500'
                            }`}
                            style={{ width: `${tier.winRate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-dm-blue/10 border border-dm-blue/20 text-xs text-dm-deep dark:text-indigo-300">
                  <strong>Key Finding:</strong> Deals closed with concessions under 10% paired with dedicated support packages achieved a <strong>{metrics.elasticity[0]?.winRate}% win rate</strong>, while concessions over 15% suffered a <strong>{100 - (metrics.elasticity[2]?.winRate || 0)}% loss rate</strong>.
                </div>
              </Card>
            </div>

            {/* Right 5 cols: Competitor Defense & Term Multipliers */}
            <div className="lg:col-span-5 space-y-6">
              {/* Competitor Pressure Defense */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Competitor Defense Impact
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block mb-1">
                      Under Competitor Pressure
                    </span>
                    <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                      {metrics.compStats.underPressure.winRate}%
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {metrics.compStats.underPressure.won} of {metrics.compStats.underPressure.total} deals closed
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      No Competitor Threat
                    </span>
                    <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                      {metrics.compStats.normal.winRate}%
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {metrics.compStats.normal.won} of {metrics.compStats.normal.total} deals closed
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                  Under competitor pressure, <strong>{metrics.compStats.underPressure.supportBundledWins} of {metrics.compStats.underPressure.won} winning deals</strong> succeeded by bundling premium support instead of matching competitor price drops.
                </div>
              </Card>

              {/* Multi-Year Term Multipliers */}
              <Card className="p-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-500" />
                  Multi-Year Contract Velocity & TCV
                </h3>

                <div className="space-y-2.5">
                  {metrics.termStats.map(term => (
                    <div key={term.years} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-purple-500/15 text-purple-500 flex items-center justify-center font-bold text-[11px]">
                          {term.years}y
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">{term.years}-Year Commitments</span>
                          <span className="text-[10px] text-slate-400 block">{term.count} closed contracts</span>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(term.tcv)}</span>
                        <span className="text-[10px] text-slate-400 block">Avg disc: {term.avgDiscount}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* 3. Objection Resolution Heatmap */}
          <Card className="p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Award className="w-4 h-4 text-dm-blue" />
              Objection Resolution & Winning Counter-Strategies
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Which customer objections occur most frequently and the specific strategy packages that successfully resolved them.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.objectionList.map(obj => {
                const winRate = obj.count > 0 ? Math.round((obj.won / obj.count) * 100) : 0;
                return (
                  <div key={obj.objection} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block line-clamp-1">
                        "{obj.objection}"
                      </span>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                        <span>{obj.count} occurrences</span>
                        <span className={`font-bold font-mono ${winRate >= 60 ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {winRate}% Win Rate
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Top Resolution:</span>
                      <span className="font-semibold text-dm-deep dark:text-indigo-300 line-clamp-2">{obj.topStrategy}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 4. Customer Account Health Matrix Table */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-500" />
                  Customer Account Portfolio Matrix
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Account-level win rates, concession patterns, and lifetime contract value generated.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Customer Account</th>
                    <th className="py-3 px-4">Segment / Industry</th>
                    <th className="py-3 px-4">Total Deals</th>
                    <th className="py-3 px-4">Record (W / L / P)</th>
                    <th className="py-3 px-4">Win Rate</th>
                    <th className="py-3 px-4">Avg Concession</th>
                    <th className="py-3 px-4 text-right">Total Pipeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {metrics.accountList.map(acc => (
                    <tr key={acc.customer} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {acc.customer}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold border border-slate-200 dark:border-slate-700">
                          {acc.segment} · {acc.industry}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {acc.totalDeals}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="text-emerald-500 font-bold">{acc.wonDeals}W</span> - <span className="text-rose-500 font-bold">{acc.lostDeals}L</span> {acc.pendingDeals > 0 && <span className="text-amber-500 font-bold">- {acc.pendingDeals}P</span>}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className={acc.winRate >= 60 ? 'text-emerald-500' : 'text-amber-500'}>
                          {acc.winRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {acc.avgConcession}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(acc.totalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
