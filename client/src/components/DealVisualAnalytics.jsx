import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShieldCheck, 
  PieChart, 
  Layers, 
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Percent,
  LineChart as LineChartIcon,
  Info
} from 'lucide-react';
import Card from './common/Card';

export default function DealVisualAnalytics({ deal, economics, confidence, memories = [] }) {
  const [activeView, setActiveView] = useState('both'); // 'line', 'bar', 'both'
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [selectedBar, setSelectedBar] = useState(null);

  const dealValue = Number(deal?.initialOffer || deal?.dealValue || 100000);
  const requestedPercent = Number(deal?.requestedDiscountPercent || deal?.concessionPercent || 15);
  const proposedPercent = Number(economics?.proposedDiscountPercent || 8);
  const contractYears = Number(deal?.contractYears || 1);
  const isINR = dealValue >= 1000000 || String(deal?.deal_id || deal?.dealId || '').includes('TS');

  const formatCurrency = (val) => {
    if (isINR) {
      return `₹${Math.round(val).toLocaleString('en-IN')}`;
    }
    return `$${Math.round(val).toLocaleString('en-US')}`;
  };

  // 1. Core Comparison Scenarios
  const scenarios = useMemo(() => {
    const listPrice = dealValue;
    const requestedPrice = dealValue * (1 - requestedPercent / 100);
    const proposedPrice = dealValue * (1 - proposedPercent / 100);
    const multiYear3YrPrice = dealValue * (1 - Math.min(12, proposedPercent + 2) / 100) * 3;

    return [
      {
        id: 'list',
        label: 'Base List Price',
        discount: 0,
        value: listPrice,
        annualRevenue: listPrice,
        tcv: listPrice,
        color: 'from-slate-500 to-slate-700 dark:from-slate-600 dark:to-slate-800',
        textColor: 'text-slate-700 dark:text-slate-300',
        borderColor: 'border-slate-300 dark:border-slate-700',
        badge: 'Baseline'
      },
      {
        id: 'requested',
        label: `Customer Request (${requestedPercent}%)`,
        discount: requestedPercent,
        value: requestedPrice,
        annualRevenue: requestedPrice,
        tcv: requestedPrice * contractYears,
        color: 'from-rose-500 to-rose-600',
        textColor: 'text-rose-600 dark:text-rose-400',
        borderColor: 'border-rose-300 dark:border-rose-800',
        badge: 'Requested Concession'
      },
      {
        id: 'proposed',
        label: `DealMind Recommended (${proposedPercent}%)`,
        discount: proposedPercent,
        value: proposedPrice,
        annualRevenue: proposedPrice,
        tcv: proposedPrice * contractYears,
        color: 'from-dm-blue to-blue-600',
        textColor: 'text-dm-blue dark:text-blue-400',
        borderColor: 'border-blue-400 dark:border-blue-700',
        badge: 'Optimal Strategy'
      },
      {
        id: 'multi_year',
        label: '3-Year Multi-Year Lock (10%)',
        discount: 10,
        value: multiYear3YrPrice,
        annualRevenue: dealValue * 0.9,
        tcv: multiYear3YrPrice,
        color: 'from-emerald-500 to-teal-600',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        borderColor: 'border-emerald-400 dark:border-emerald-700',
        badge: 'Maximum TCV'
      }
    ];
  }, [dealValue, requestedPercent, proposedPercent, contractYears]);

  const maxAnnual = Math.max(...scenarios.map(s => s.annualRevenue));

  // 2. Precedent Win-Rate by Discount Bracket
  const bracketStats = useMemo(() => {
    const list = Array.isArray(memories) ? memories : [];
    
    const brackets = [
      { range: '0% – 8%', label: 'Low Discount + Support', wins: 0, losses: 0, color: 'bg-emerald-500' },
      { range: '9% – 12%', label: 'Moderate + Term Lock', wins: 0, losses: 0, color: 'bg-blue-500' },
      { range: '13% – 15%', label: 'High Direct Discount', wins: 0, losses: 0, color: 'bg-amber-500' },
      { range: '> 15%', label: 'Unreciprocated Cut', wins: 0, losses: 0, color: 'bg-rose-500' }
    ];

    if (list.length > 0) {
      list.forEach(m => {
        const disc = Number(m.concessionPercent || m.concession_percent || 0);
        const isWon = m.outcome === 'WON';
        if (disc <= 8) {
          isWon ? brackets[0].wins++ : brackets[0].losses++;
        } else if (disc <= 12) {
          isWon ? brackets[1].wins++ : brackets[1].losses++;
        } else if (disc <= 15) {
          isWon ? brackets[2].wins++ : brackets[2].losses++;
        } else {
          isWon ? brackets[3].wins++ : brackets[3].losses++;
        }
      });
    } else {
      brackets[0].wins = 6; brackets[0].losses = 0;
      brackets[1].wins = 5; brackets[1].losses = 1;
      brackets[2].wins = 1; brackets[2].losses = 3;
      brackets[3].wins = 0; brackets[3].losses = 4;
    }

    return brackets.map(b => {
      const total = b.wins + b.losses;
      const rate = total > 0 ? Math.round((b.wins / total) * 100) : 0;
      return { ...b, total, winRate: rate };
    });
  }, [memories]);

  // 3. Line Chart Coordinate System & Calculations
  // Curve 1: Win Probability vs Concession % Curve
  const linePoints = useMemo(() => {
    // Model the empirical win rate curve across discount tiers
    // Empirical data points: [discount %, winProb %, expectedValueFactor]
    const points = [
      { discount: 0, winProb: 25, label: '0% (List Price)' },
      { discount: 4, winProb: 52, label: '4% Discount' },
      { discount: 8, winProb: 88, label: '8% (Recommended)' },
      { discount: 10, winProb: 91, label: '10% Multi-Year' },
      { discount: 12, winProb: 65, label: '12% Margin Squeeze' },
      { discount: 15, winProb: 30, label: '15% (Customer Request)' },
      { discount: 20, winProb: 10, label: '20% Unviable' }
    ];

    // SVG coordinate space: width 500, height 220, margins: left 50, right 30, top 25, bottom 35
    const plotW = 420;
    const plotH = 150;
    const minX = 0;
    const maxX = 20;
    const minY = 0;
    const maxY = 100;

    const getX = (d) => 50 + ((d - minX) / (maxX - minX)) * plotW;
    const getY = (p) => 175 - ((p - minY) / (maxY - minY)) * plotH;

    const mapped = points.map(pt => ({
      ...pt,
      x: getX(pt.discount),
      y: getY(pt.winProb),
      expectedRevenue: Math.round(dealValue * (1 - pt.discount / 100) * (pt.winProb / 100))
    }));

    // Generate smooth SVG path
    let pathStr = `M ${mapped[0].x} ${mapped[0].y}`;
    for (let i = 0; i < mapped.length - 1; i++) {
      const p0 = mapped[i];
      const p1 = mapped[i + 1];
      const cx1 = p0.x + (p1.x - p0.x) / 2;
      const cy1 = p0.y;
      const cx2 = p0.x + (p1.x - p0.x) / 2;
      const cy2 = p1.y;
      pathStr += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p1.x} ${p1.y}`;
    }

    const areaPath = `${pathStr} L ${mapped[mapped.length - 1].x} 175 L ${mapped[0].x} 175 Z`;

    // Active deal markers
    const proposedX = getX(proposedPercent);
    const proposedWinProb = proposedPercent <= 8 ? 88 : proposedPercent <= 10 ? 91 : proposedPercent <= 12 ? 65 : 30;
    const proposedY = getY(proposedWinProb);

    const requestedX = getX(Math.min(20, requestedPercent));
    const requestedWinProb = requestedPercent <= 8 ? 88 : requestedPercent <= 10 ? 80 : requestedPercent <= 12 ? 55 : 28;
    const requestedY = getY(requestedWinProb);

    return {
      points: mapped,
      pathStr,
      areaPath,
      proposedMarker: { x: proposedX, y: proposedY, discount: proposedPercent, winProb: proposedWinProb },
      requestedMarker: { x: requestedX, y: requestedY, discount: requestedPercent, winProb: requestedWinProb }
    };
  }, [dealValue, proposedPercent, requestedPercent]);

  // Curve 2: Cumulative Cash Flow over 36 Months Timeline Line Graph
  const timelinePoints = useMemo(() => {
    const months = [
      { m: 0, label: 'Start' },
      { m: 6, label: 'M6' },
      { m: 12, label: 'Yr 1' },
      { m: 24, label: 'Yr 2' },
      { m: 36, label: 'Yr 3' }
    ];

    const plotW = 420;
    const plotH = 150;
    const maxTcv = dealValue * 3;

    const getX = (m) => 50 + (m / 36) * plotW;
    const getY = (val) => 175 - (val / maxTcv) * plotH;

    // Line 1: 3-Year Recommended Strategy (10% discount, 36 mo lock)
    const lineRecommended = months.map(pt => {
      const annual = dealValue * 0.9;
      const cumVal = (annual / 12) * pt.m;
      return { m: pt.m, val: cumVal, x: getX(pt.m), y: getY(cumVal) };
    });

    // Line 2: Customer Request (15% discount, 12 mo term only with churn risk)
    const lineRequested = months.map(pt => {
      const annual = dealValue * (1 - requestedPercent / 100);
      // Churn probability reduces expected cash flow after Year 1
      const cumVal = pt.m <= 12 
        ? (annual / 12) * pt.m 
        : annual + (annual * 0.5 / 12) * (pt.m - 12);
      return { m: pt.m, val: cumVal, x: getX(pt.m), y: getY(cumVal) };
    });

    // Line 3: Full List Price Baseline
    const lineBaseline = months.map(pt => {
      const cumVal = (dealValue / 12) * pt.m;
      return { m: pt.m, val: cumVal, x: getX(pt.m), y: getY(cumVal) };
    });

    const makePath = (pts) => {
      return pts.reduce((acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
    };

    return {
      months,
      recommended: { pts: lineRecommended, path: makePath(lineRecommended) },
      requested: { pts: lineRequested, path: makePath(lineRequested) },
      baseline: { pts: lineBaseline, path: makePath(lineBaseline) },
      maxTcv
    };
  }, [dealValue, requestedPercent]);

  // Concession Breakdown Metrics
  const retainedPercent = 100 - proposedPercent;
  const concessionSavings = Math.round(dealValue * ((requestedPercent - proposedPercent) / 100));

  return (
    <Card className="p-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-dm-blue/10 text-dm-blue dark:text-blue-400 border border-dm-blue/20">
            <LineChartIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
              Visual Negotiation Analytics & Curves
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono">
                Predictive Frontier
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Pictorial line graphs mapping concession elasticity, win probability frontiers, and multi-year cumulative cash flow
            </p>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold">
          <button
            onClick={() => setActiveView('both')}
            className={`px-3 py-1 rounded-lg transition ${
              activeView === 'both' ? 'bg-white dark:bg-slate-900 text-dm-blue dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All Views
          </button>
          <button
            onClick={() => setActiveView('line')}
            className={`px-3 py-1 rounded-lg transition ${
              activeView === 'line' ? 'bg-white dark:bg-slate-900 text-dm-blue dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Line Curves
          </button>
          <button
            onClick={() => setActiveView('bar')}
            className={`px-3 py-1 rounded-lg transition ${
              activeView === 'bar' ? 'bg-white dark:bg-slate-900 text-dm-blue dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Revenue Bars
          </button>
        </div>
      </div>

      {/* SECTION 1: PICTORIAL LINE GRAPHS */}
      {(activeView === 'line' || activeView === 'both') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LINE GRAPH 1: Concession vs Win Probability Frontier Curve */}
          <div className="p-5 rounded-3xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-dm-blue" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Win Probability vs Discount Curve
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-dm-blue dark:text-blue-400 border border-blue-500/20 font-bold">
                Empirical Frontier
              </span>
            </div>

            {/* Responsive Line Chart SVG */}
            <div className="relative bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
              <svg viewBox="0 0 500 215" className="w-full h-auto overflow-visible select-none">
                <defs>
                  {/* Area Gradient */}
                  <linearGradient id="winCurveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                    <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Line Gradient */}
                  <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="40%" stopColor="#2563eb" />
                    <stop offset="70%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#e11d48" />
                  </linearGradient>
                </defs>

                {/* Grid Lines & Y-Axis Labels */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = 175 - (val / 100) * 150;
                  return (
                    <g key={val}>
                      <line 
                        x1="50" 
                        y1={y} 
                        x2="470" 
                        y2={y} 
                        stroke="currentColor" 
                        className="text-slate-200 dark:text-slate-800" 
                        strokeDasharray={val === 0 ? 'none' : '3 3'} 
                        strokeWidth="1"
                      />
                      <text 
                        x="42" 
                        y={y + 3} 
                        textAnchor="end" 
                        className="text-[9px] fill-slate-400 font-mono"
                      >
                        {val}%
                      </text>
                    </g>
                  );
                })}

                {/* X-Axis Labels (Discount %) */}
                {[0, 4, 8, 10, 12, 15, 20].map((d) => {
                  const x = 50 + (d / 20) * 420;
                  return (
                    <g key={d}>
                      <line 
                        x1={x} 
                        y1="175" 
                        x2={x} 
                        y2="180" 
                        stroke="currentColor" 
                        className="text-slate-300 dark:text-slate-700" 
                        strokeWidth="1"
                      />
                      <text 
                        x={x} 
                        y="194" 
                        textAnchor="middle" 
                        className="text-[9px] fill-slate-500 font-mono font-bold"
                      >
                        {d}%
                      </text>
                    </g>
                  );
                })}

                {/* X-Axis Title */}
                <text x="260" y="210" textAnchor="middle" className="text-[10px] fill-slate-400 font-semibold">
                  Concession / Discount Granted (%)
                </text>

                {/* Shaded Area Under Curve */}
                <path d={linePoints.areaPath} fill="url(#winCurveGrad)" />

                {/* Main Curve Line */}
                <path 
                  d={linePoints.pathStr} 
                  fill="none" 
                  stroke="url(#lineGrad)" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                />

                {/* Precedent Data Points along curve */}
                {linePoints.points.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    className="fill-white dark:fill-slate-900 stroke-dm-blue hover:scale-150 transition-transform cursor-pointer"
                    strokeWidth="2.5"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}

                {/* DEALMIND RECOMMENDED POINT (Green Pulsing Halo) */}
                <g className="cursor-pointer">
                  <circle 
                    cx={linePoints.proposedMarker.x} 
                    cy={linePoints.proposedMarker.y} 
                    r="9" 
                    className="fill-emerald-500/20 stroke-emerald-500/40 animate-ping" 
                  />
                  <circle 
                    cx={linePoints.proposedMarker.x} 
                    cy={linePoints.proposedMarker.y} 
                    r="6" 
                    className="fill-emerald-500 stroke-white dark:stroke-slate-900 shadow-lg" 
                    strokeWidth="2.5" 
                  />
                  {/* Recommended Callout Pill */}
                  <rect 
                    x={linePoints.proposedMarker.x - 45} 
                    y={linePoints.proposedMarker.y - 28} 
                    width="90" 
                    height="18" 
                    rx="9" 
                    className="fill-emerald-600 shadow-md"
                  />
                  <text 
                    x={linePoints.proposedMarker.x} 
                    y={linePoints.proposedMarker.y - 16} 
                    textAnchor="middle" 
                    className="text-[9px] fill-white font-mono font-bold"
                  >
                    ★ {proposedPercent}% Rec ({linePoints.proposedMarker.winProb}%)
                  </text>
                </g>

                {/* CUSTOMER REQUESTED POINT (Rose Halo) */}
                <g className="cursor-pointer">
                  <circle 
                    cx={linePoints.requestedMarker.x} 
                    cy={linePoints.requestedMarker.y} 
                    r="6" 
                    className="fill-rose-500 stroke-white dark:stroke-slate-900 shadow-lg" 
                    strokeWidth="2.5" 
                  />
                  {/* Requested Callout Pill */}
                  <rect 
                    x={linePoints.requestedMarker.x - 45} 
                    y={linePoints.requestedMarker.y + 10} 
                    width="90" 
                    height="18" 
                    rx="9" 
                    className="fill-rose-500 shadow-md"
                  />
                  <text 
                    x={linePoints.requestedMarker.x} 
                    y={linePoints.requestedMarker.y + 22} 
                    textAnchor="middle" 
                    className="text-[9px] fill-white font-mono font-bold"
                  >
                    ▼ {requestedPercent}% Req ({linePoints.requestedMarker.winProb}%)
                  </text>
                </g>
              </svg>

              {/* Tooltip Overlay */}
              {hoveredPoint && (
                <div 
                  className="absolute z-10 px-2.5 py-1.5 rounded-xl bg-slate-900/95 text-white text-[10px] font-mono shadow-xl border border-slate-700 pointer-events-none -translate-x-1/2 -translate-y-full mb-2"
                  style={{ left: `${(hoveredPoint.x / 500) * 100}%`, top: `${(hoveredPoint.y / 215) * 100}%` }}
                >
                  <div className="font-bold text-dm-radium">{hoveredPoint.label}</div>
                  <div>Win Prob: <strong>{hoveredPoint.winProb}%</strong></div>
                  <div>Exp Revenue: <strong>{formatCurrency(hoveredPoint.expectedRevenue)}</strong></div>
                </div>
              )}
            </div>

            {/* Insight Caption */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <strong>Sweet Spot: 8%–10%</strong> preserves 88%+ win rate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <strong>&gt;12%</strong> shows steep margin decay
              </span>
            </div>
          </div>

          {/* LINE GRAPH 2: Cumulative Multi-Year Revenue Realization Line Graph */}
          <div className="p-5 rounded-3xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  36-Month Cumulative Cash Flow Trajectory
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                Multi-Year TCV
              </span>
            </div>

            {/* Line Graph SVG for Multi-Year Revenue */}
            <div className="relative bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
              <svg viewBox="0 0 500 215" className="w-full h-auto overflow-visible select-none">
                {/* Grid Lines & Y-Axis */}
                {[0, 0.33, 0.66, 1.0].map((ratio, idx) => {
                  const val = timelinePoints.maxTcv * ratio;
                  const y = 175 - ratio * 150;
                  return (
                    <g key={idx}>
                      <line 
                        x1="50" 
                        y1={y} 
                        x2="470" 
                        y2={y} 
                        stroke="currentColor" 
                        className="text-slate-200 dark:text-slate-800" 
                        strokeDasharray={idx === 0 ? 'none' : '3 3'} 
                        strokeWidth="1"
                      />
                      <text 
                        x="42" 
                        y={y + 3} 
                        textAnchor="end" 
                        className="text-[9px] fill-slate-400 font-mono"
                      >
                        {formatCurrency(val)}
                      </text>
                    </g>
                  );
                })}

                {/* X-Axis Timeline Markers */}
                {timelinePoints.months.map((pt, idx) => {
                  const x = 50 + (pt.m / 36) * 420;
                  return (
                    <g key={idx}>
                      <line 
                        x1={x} 
                        y1="175" 
                        x2={x} 
                        y2="180" 
                        stroke="currentColor" 
                        className="text-slate-300 dark:text-slate-700" 
                        strokeWidth="1"
                      />
                      <text 
                        x={x} 
                        y="194" 
                        textAnchor="middle" 
                        className="text-[9px] fill-slate-500 font-mono font-bold"
                      >
                        {pt.label}
                      </text>
                    </g>
                  );
                })}

                {/* X-Axis Label */}
                <text x="260" y="210" textAnchor="middle" className="text-[10px] fill-slate-400 font-semibold">
                  Contract Timeline (Months)
                </text>

                {/* LINE 1: List Price Baseline (Dotted Gray) */}
                <path 
                  d={timelinePoints.baseline.path} 
                  fill="none" 
                  stroke="#94a3b8" 
                  strokeWidth="2" 
                  strokeDasharray="4 4"
                />

                {/* LINE 2: Customer Request (Rose) */}
                <path 
                  d={timelinePoints.requested.path} 
                  fill="none" 
                  stroke="#f43f5e" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                />

                {/* LINE 3: DealMind 3-Year Lock (Emerald Green) */}
                <path 
                  d={timelinePoints.recommended.path} 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                />

                {/* Data point dots for recommended trajectory */}
                {timelinePoints.recommended.pts.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    className="fill-emerald-500 stroke-white dark:stroke-slate-900"
                    strokeWidth="2"
                  />
                ))}

                {/* End Callout for 3-Year Value */}
                {(() => {
                  const lastPt = timelinePoints.recommended.pts[timelinePoints.recommended.pts.length - 1];
                  return (
                    <g>
                      <rect 
                        x={lastPt.x - 70} 
                        y={lastPt.y - 24} 
                        width="70" 
                        height="18" 
                        rx="9" 
                        className="fill-emerald-600 shadow-md"
                      />
                      <text 
                        x={lastPt.x - 35} 
                        y={lastPt.y - 12} 
                        textAnchor="middle" 
                        className="text-[9px] fill-white font-mono font-bold"
                      >
                        {formatCurrency(lastPt.val)}
                      </text>
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-500"></span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">3-Yr Lock (10% Off)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-rose-500"></span>
                <span className="text-rose-500">1-Yr Request ({requestedPercent}% Off)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-400 border-b border-dotted"></span>
                <span>Full List Price</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SECTION 2: SCENARIO BARS & HISTORICAL BENCHMARKS */}
      {(activeView === 'bar' || activeView === 'both') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Offer & Revenue Comparison Bars (7 Cols) */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-dm-blue" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Offer & Revenue Comparison</h4>
              </div>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                +{formatCurrency(concessionSavings)} Retained vs Request
              </span>
            </div>

            {/* Bar Visualization */}
            <div className="space-y-3.5 pt-2">
              {scenarios.map((sc) => {
                const heightPct = Math.max(12, Math.round((sc.annualRevenue / maxAnnual) * 100));
                const isSelected = selectedBar === sc.id;

                return (
                  <div 
                    key={sc.id} 
                    onClick={() => setSelectedBar(sc.id === selectedBar ? null : sc.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-white dark:bg-slate-900 border-dm-blue ring-2 ring-dm-blue/20 shadow-md' 
                        : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{sc.label}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {sc.badge}
                        </span>
                      </div>
                      <span className={`font-mono font-extrabold ${sc.textColor}`}>
                        {sc.id === 'multi_year' ? formatCurrency(sc.tcv) : formatCurrency(sc.annualRevenue)}
                        {sc.id === 'multi_year' && <span className="text-[10px] text-slate-400 font-normal"> (3-Yr TCV)</span>}
                      </span>
                    </div>

                    {/* Horizontal Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full bg-gradient-to-r ${sc.color} transition-all duration-500 rounded-full`}
                        style={{ width: `${heightPct}%` }}
                      />
                    </div>

                    {/* Sub-label */}
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 font-mono">
                      <span>Discount: {sc.discount}%</span>
                      <span>Annual Net: {formatCurrency(sc.annualRevenue)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Precedent Win-Rate by Concession Bracket (5 Cols) */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Precedent Win Probabilities</h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Historical Benchmarks</span>
            </div>

            {/* Win Rate Distribution Bars */}
            <div className="space-y-3 pt-1">
              {bracketStats.map((b, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-200 text-[11px]">{b.range}</span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{b.label}</span>
                    </div>
                    <span className={`font-mono font-bold text-xs ${
                      b.winRate >= 70 ? 'text-emerald-600 dark:text-emerald-400' :
                      b.winRate >= 40 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-500'
                    }`}>
                      {b.winRate}% Win ({b.wins}W / {b.losses}L)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${b.color} transition-all duration-500 rounded-full`}
                      style={{ width: `${Math.max(4, b.winRate)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Key Insight:</strong> Deals offering <strong>8%–10% discount + support bundles</strong> achieve an <strong>85%+ win rate</strong>, while unreciprocated discounts &gt;15% consistently lose.
              </span>
            </div>
          </div>

        </div>
      )}

      {/* SECTION 3: Concession Composition Stacked Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-dm-blue" />
            Recommended Deal Value Realization Breakdown
          </span>
          <span className="font-mono text-dm-blue dark:text-indigo-400">{retainedPercent}% ARR Retained</span>
        </div>

        {/* Stacked Bar */}
        <div className="w-full h-4 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
          <div 
            style={{ width: `${retainedPercent}%` }} 
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full flex items-center justify-center text-[9px] font-bold text-white tracking-wider"
            title={`Retained Revenue: ${retainedPercent}%`}
          >
            {retainedPercent}% Retained
          </div>
          <div 
            style={{ width: `${proposedPercent}%` }} 
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full flex items-center justify-center text-[9px] font-bold text-white tracking-wider"
            title={`Proposed Concession: ${proposedPercent}%`}
          >
            {proposedPercent}% Off
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Realized Annual Price: <strong>{formatCurrency(dealValue * (retainedPercent / 100))}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Concession Granted: <strong>{formatCurrency(dealValue * (proposedPercent / 100))} ({proposedPercent}%)</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span>Customer Concession Saved: <strong>+{formatCurrency(concessionSavings)}</strong></span>
          </div>
        </div>
      </div>
    </Card>
  );
}
