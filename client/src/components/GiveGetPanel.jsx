import React, { useState, useEffect } from 'react';
import { 
  ArrowRightLeft, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Sparkles,
  ArrowRight,
  Database,
  Info
} from 'lucide-react';
import Card from './common/Card';
import Button from './common/Button';
import { getGiveGetRecommendations } from '../services/api';

export default function GiveGetPanel({ 
  currentDeal, 
  giveGetOptions: initialOptions = null,
  onAdoptConcession = null,
  onNavigateTab = null 
}) {
  const [giveGet, setGiveGet] = useState(initialOptions);
  const [loading, setLoading] = useState(!initialOptions);
  const [selectedOptionId, setSelectedOptionId] = useState('give_get_multi_year');
  const [customDiscount, setCustomDiscount] = useState(
    currentDeal?.requestedDiscountPercent || currentDeal?.requested_discount_percent || 20
  );

  const dealId = currentDeal?.dealId || currentDeal?.deal_id;

  const loadGiveGet = async (discountVal) => {
    if (!dealId) return;
    setLoading(true);
    try {
      const res = await getGiveGetRecommendations(dealId, discountVal);
      setGiveGet(res);
    } catch (err) {
      console.error('Failed to load give-get options:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialOptions && dealId) {
      loadGiveGet(customDiscount);
    } else if (initialOptions) {
      setGiveGet(initialOptions);
    }
  }, [dealId, initialOptions]);

  const options = giveGet?.recommendations || [];
  const selectedOpt = options.find(o => o.id === selectedOptionId) || options[0];

  const categoryLabels = {
    'TERM_COMMITMENT': { label: 'Contract Term', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
    'PAYMENT_TERMS': { label: 'Cash Flow / Prepayment', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    'MARKETING_RIGHTS': { label: 'Advocacy & Co-Marketing', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
    'VOLUME_EXPANSION': { label: 'Volume Expansion', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    'SCOPE_ADJUSTMENT': { label: 'SLA Scope Trade-off', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Give-Get Negotiation Intelligence</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Never concede on price without demanding reciprocal value. Grounded trade-off packages for <strong className="text-slate-900 dark:text-white">{currentDeal?.customer}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Request</span>
            <span className="font-mono text-sm font-bold text-rose-500">
              {currentDeal?.requestedDiscountPercent || 20}% discount
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
          <p className="text-xs">Computing reciprocal give-get matrices...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Trade-off Package Selector */}
          <div className="lg:col-span-5 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Reciprocal Trade-off Packages ({options.length})
            </span>

            {options.map((opt) => {
              const isSelected = opt.id === selectedOptionId;
              const cat = categoryLabels[opt.category] || { label: opt.category, color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };

              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedOptionId(opt.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-150 space-y-2.5 ${
                    isSelected 
                      ? 'bg-indigo-600/10 dark:bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500' 
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${cat.color}`}>
                      {cat.label}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      opt.evidence?.isBacked 
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {opt.evidence?.isBacked ? `✓ ${opt.evidence.winCount}W Precedent` : 'Structural Rule'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {opt.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {opt.get.requirement}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                    <span className="text-slate-500">Give: <strong className="text-indigo-600 dark:text-indigo-400">{opt.give.concessionPercent}%</strong></span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{opt.financialImpact.formattedSavings} retained</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Deep-Dive Package Inspector */}
          {selectedOpt && (
            <div className="lg:col-span-7 space-y-4">
              <Card className="p-6 space-y-5 border-indigo-500/30 shadow-lg">
                {/* Header */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-indigo-600 dark:text-indigo-400">
                      Reciprocal Agreement Blueprint
                    </span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {selectedOpt.title}
                    </h3>
                  </div>
                  {selectedOpt.approvalRequired && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      <ShieldAlert className="w-3.5 h-3.5" /> Approval Required (&gt;{selectedOpt.approvalThreshold}%)
                    </span>
                  )}
                </div>

                {/* THE GIVE & THE GET COMPARISON */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* WE GIVE */}
                  <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-wider">
                        1. WE GIVE (Concession)
                      </span>
                      <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-300">
                        {selectedOpt.give.concessionPercent}% Off
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {selectedOpt.give.description}
                    </p>
                    <div className="text-[11px] font-mono text-slate-500">
                      Concession Value: -${selectedOpt.give.concessionAmount.toLocaleString()}
                    </div>
                  </div>

                  {/* WE GET */}
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                        2. WE GET (Requirement)
                      </span>
                      <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                        Mandatory
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-bold">
                      {selectedOpt.get.requirement}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {selectedOpt.get.description}
                    </p>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Financial Implications & Economics
                  </span>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400">Net Annual Revenue</div>
                      <div className="font-mono text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {selectedOpt.financialImpact.formattedAnnual}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400">Total Contract Value</div>
                      <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {selectedOpt.financialImpact.formattedTCV}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400">Revenue Preserved</div>
                      <div className="font-mono text-xs font-bold text-emerald-500 mt-0.5">
                        {selectedOpt.financialImpact.formattedSavings}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Narrative Explanation & Evidence Grounding */}
                <div className="space-y-2 text-xs">
                  <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedOpt.explanation}
                  </div>

                  {/* Evidence Grounding Box */}
                  <div className={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${
                    selectedOpt.evidence.isBacked 
                      ? 'bg-purple-950/20 border-purple-500/30 text-purple-200'
                      : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400'
                  }`}>
                    <Database className="w-4 h-4 shrink-0 mt-0.5 text-purple-400" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-[11px] text-slate-900 dark:text-slate-100">
                        {selectedOpt.evidence.isBacked ? 'Hindsight Precedent Grounding' : 'Structural Business Rule'}
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {selectedOpt.evidence.evidenceSummary}
                      </p>
                      {selectedOpt.evidence.sourceIds?.length > 0 && (
                        <div className="text-[10px] font-mono text-purple-300 pt-0.5">
                          Referenced deals: {selectedOpt.evidence.sourceIds.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 italic">
                    {selectedOpt.risksAndConditions}
                  </span>

                  <div className="flex items-center gap-2">
                    {onAdoptConcession && (
                      <Button
                        variant="primary"
                        icon={ArrowRight}
                        onClick={() => onAdoptConcession(selectedOpt)}
                      >
                        Adopt as Counteroffer
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
