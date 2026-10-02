import React, { useState } from 'react';
import { MessageSquareReply, Send, Copy, Check, CheckCircle2, XCircle, Brain, AlertCircle } from 'lucide-react';
import { submitCounteroffer } from '../services/api';

export default function CounterofferAdvisor({ currentDeal, onRecordOutcome, onNavigateTab }) {
  const initialOffer = Number(currentDeal?.initialOffer || currentDeal?.initial_offer || currentDeal?.dealValue || 100000);
  const customer = currentDeal?.customer || 'Customer';

  const [counterInput, setCounterInput] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [script, setScript] = useState('');
  const [error, setError] = useState(null);

  if (!currentDeal) {
    return (
      <div className="p-12 text-center text-slate-400">
        <MessageSquareReply className="w-10 h-10 mx-auto text-slate-500 mb-3" />
        <p className="text-sm font-semibold">Run an analysis first to use the Counteroffer Advisor.</p>
        <button 
          onClick={() => onNavigateTab('deal-workspace')} 
          className="mt-3 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-sm"
        >
          New Negotiation
        </button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = Number(counterInput);
    if (!counterInput || isNaN(val) || val <= 0) { 
      setError('Enter a valid positive counteroffer amount.'); 
      return; 
    }
    if (val > initialOffer) { 
      setError(`Customer counteroffer ($${val.toLocaleString()}) cannot exceed your initial offer ($${initialOffer.toLocaleString()}).`); 
      return; 
    }
    setError(null);
    setLoading(true);
    try {
      const dealId = currentDeal.dealId || currentDeal.deal_id || 'DEAL-003';
      const res = await submitCounteroffer(dealId, val, '');
      setResponse(res);
      setScript(res.suggestedResponse || res.analysis?.recommendation?.counterofferSuggestion || '');
    } catch (err) {
      setError('Analysis failed: ' + err.message);
    } finally { 
      setLoading(false); 
    }
  };

  const handleCopy = () => {
    if (!script) return;
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const effectiveDiscount = counterInput
    ? Math.max(0, Math.round(((initialOffer - Number(counterInput)) / initialOffer) * 100))
    : 0;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MessageSquareReply className="w-5 h-5 text-brand-500" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Counteroffer Advisor</h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-xs">
          Enter the customer's pushback counteroffer for <strong className="text-slate-900 dark:text-white">{customer}</strong> to generate an evidence-grounded response.
        </p>
      </div>

      {/* Negotiation Timeline Card */}
      <div className="bg-slate-50 dark:bg-[#182030] border border-slate-200 dark:border-[#243048] rounded-2xl p-6 space-y-5">
        {/* Step 1: Initial Offer */}
        <div className="flex items-start gap-4">
          <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-xs shrink-0">1</div>
          <div className="flex-1 pt-0.5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Your Initial Deal Value</div>
            <div className="text-base font-bold text-slate-900 dark:text-white font-mono">${initialOffer.toLocaleString()}</div>
            <div className="text-[11px] text-slate-400">{currentDeal.objection || 'Price objection raised by buyer'}</div>
          </div>
        </div>

        <div className="border-l border-slate-200 dark:border-[#243048] ml-3.5 pl-8 -mt-2 -mb-2 h-4" />

        {/* Step 2: Customer Counteroffer Input */}
        <div className="flex items-start gap-4">
          <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-xs shrink-0">2</div>
          <div className="flex-1 pt-0.5">
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">Customer Counteroffer Received</div>
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number" 
                  value={counterInput} 
                  onChange={e => setCounterInput(e.target.value)}
                  placeholder={`e.g. ${Math.round(initialOffer * 0.85).toLocaleString()}`} 
                  min={0}
                  className="w-full bg-white dark:bg-[#0f1622] border border-slate-200 dark:border-[#243048] rounded-xl pl-7 pr-4 py-2.5 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-brand-500 text-sm"
                />
              </div>
              {counterInput && (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-mono whitespace-nowrap">{effectiveDiscount}% off</span>
              )}
              <button 
                type="submit" 
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shrink-0 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Analyzing Precedents...' : 'Evaluate Counteroffer'}</span>
              </button>
            </form>
            {error && (
              <p className="text-rose-600 dark:text-rose-400 text-[11px] mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </div>
        </div>

        {/* Step 3: DealMind Response */}
        {response && (
          <>
            <div className="border-l border-slate-200 dark:border-[#243048] ml-3.5 pl-8 -mt-2 -mb-2 h-4" />
            <div className="flex items-start gap-4">
              <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                <Brain className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 bg-white dark:bg-[#0f1622] border border-purple-200 dark:border-purple-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" />
                    <span>Memory-Grounded Counter Strategy</span>
                  </div>
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 transition"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Editable Script */}
                <textarea 
                  rows={4} 
                  value={script} 
                  onChange={e => setScript(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#243048] rounded-xl p-3.5 text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none focus:border-purple-500 resize-none"
                />

                {/* Mini Economics Context */}
                {response.analysis?.economics && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#182030] border border-slate-200 dark:border-[#243048]">
                      <div className="text-slate-500">Effective discount implied</div>
                      <div className="font-mono font-bold text-amber-600 dark:text-amber-400">{effectiveDiscount}%</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#182030] border border-slate-200 dark:border-[#243048]">
                      <div className="text-slate-500">Revenue retained vs request</div>
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+${response.analysis.economics.concessionSavings?.toLocaleString() || '0'}</div>
                    </div>
                  </div>
                )}

                {/* Quick Outcome Action */}
                {onRecordOutcome && (
                  <div className="flex items-center gap-3 pt-1 border-t border-slate-200 dark:border-[#243048]">
                    <span className="text-[11px] text-slate-500">Record final outcome:</span>
                    <button 
                      onClick={() => onRecordOutcome('WON', script)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark as WON
                    </button>
                    <button 
                      onClick={() => onRecordOutcome('LOST', script)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Mark as LOST
                    </button>
                    {onNavigateTab && (
                      <button 
                        onClick={() => onNavigateTab('outcome')}
                        className="ml-auto text-[11px] text-brand-600 hover:underline"
                      >
                        Full outcome form →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
