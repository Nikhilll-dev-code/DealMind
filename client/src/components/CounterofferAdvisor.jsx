import React, { useState } from 'react';
import { MessageSquareReply, Send, Copy, Check, CheckCircle2, XCircle, Brain } from 'lucide-react';
import { submitCounteroffer } from '../services/api';

export default function CounterofferAdvisor({ currentDeal, onRecordOutcome, onNavigateTab }) {
  const initialOffer = Number(currentDeal?.initialOffer || currentDeal?.dealValue || 100000);
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
        <MessageSquareReply className="w-10 h-10 mx-auto text-slate-600 mb-3" />
        <p className="text-sm">Run an analysis first to use the Counteroffer Advisor.</p>
        <button onClick={() => onNavigateTab('deal-workspace')} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">New Negotiation</button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = Number(counterInput);
    if (!counterInput || val <= 0) { setError('Enter a valid counteroffer amount.'); return; }
    if (val > initialOffer) { setError('Customer counteroffer cannot exceed your initial offer.'); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await submitCounteroffer(currentDeal.dealId || currentDeal.deal_id || 'DEAL-003', val, '');
      setResponse(res);
      setScript(res.suggestedResponse || res.analysis?.recommendation?.counterofferSuggestion || '');
    } catch (err) {
      setError('Analysis failed: ' + err.message);
    } finally { setLoading(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const effectiveDiscount = counterInput
    ? Math.max(0, Math.round(((initialOffer - Number(counterInput)) / initialOffer) * 100))
    : 0;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MessageSquareReply className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Counteroffer Advisor</h2>
        </div>
        <p className="text-slate-400 text-sm">Enter the customer's latest counteroffer for <strong className="text-white">{customer}</strong> to generate a memory-grounded response.</p>
      </div>

      {/* Negotiation Timeline */}
      <div className="bg-[#182030] border border-[#243048] rounded-2xl p-6 space-y-5">
        {/* Step 1: Initial Offer */}
        <div className="flex items-start gap-4">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">1</div>
          <div className="flex-1 pt-0.5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Your Initial Offer</div>
            <div className="text-base font-bold text-white">${initialOffer.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500">{currentDeal.objection || 'Price objection raised'}</div>
          </div>
        </div>

        <div className="border-l border-[#243048] ml-3.5 pl-8 -mt-2 -mb-2 h-4" />

        {/* Step 2: Customer Counteroffer Input */}
        <div className="flex items-start gap-4">
          <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-xs shrink-0">2</div>
          <div className="flex-1 pt-0.5">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Customer Counteroffer</div>
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number" value={counterInput} onChange={e => setCounterInput(e.target.value)}
                  placeholder={`e.g. ${Math.round(initialOffer * 0.85).toLocaleString()}`} min={0}
                  className="w-full bg-[#0f1622] border border-[#243048] rounded-xl pl-7 pr-4 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
              {counterInput && (
                <span className="text-xs text-amber-400 font-mono whitespace-nowrap">{effectiveDiscount}% off</span>
              )}
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shrink-0">
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Analyzing...' : 'Analyze'}</span>
              </button>
            </form>
            {error && <p className="text-rose-400 text-[11px] mt-1.5">{error}</p>}
          </div>
        </div>

        {/* Step 3: DealMind Response */}
        {response && (
          <>
            <div className="border-l border-[#243048] ml-3.5 pl-8 -mt-2 -mb-2 h-4" />
            <div className="flex items-start gap-4">
              <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                <Brain className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 bg-[#0f1622] border border-purple-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-purple-300 uppercase tracking-wider">DealMind Suggested Response</div>
                  <button onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition">
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Editable Script */}
                <textarea rows={4} value={script} onChange={e => setScript(e.target.value)}
                  className="w-full bg-[#121824] border border-[#243048] rounded-xl p-3.5 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-purple-500 resize-none"
                />

                {/* Mini Economics Context */}
                {response.analysis?.economics && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-[#182030] border border-[#243048]">
                      <div className="text-slate-500">Effective discount implied</div>
                      <div className="font-mono font-bold text-amber-400">{response.effectiveDiscountPercent}%</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#182030] border border-[#243048]">
                      <div className="text-slate-500">Revenue retained vs request</div>
                      <div className="font-mono font-bold text-emerald-400">+${response.analysis.economics.concessionSavings.toLocaleString()}</div>
                    </div>
                  </div>
                )}

                {/* Outcome Buttons */}
                <div className="flex items-center gap-3 pt-1 border-t border-[#243048]">
                  <span className="text-[11px] text-slate-400">Record outcome:</span>
                  <button onClick={() => onRecordOutcome('WON', script)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition">
                    <CheckCircle2 className="w-3.5 h-3.5" /> WON
                  </button>
                  <button onClick={() => onRecordOutcome('LOST', script)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition">
                    <XCircle className="w-3.5 h-3.5" /> LOST
                  </button>
                  <button onClick={() => onNavigateTab('outcome')}
                    className="ml-auto text-[11px] text-blue-400 hover:text-blue-300 underline">Full outcome form →</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
