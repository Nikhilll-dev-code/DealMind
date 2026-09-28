import React, { useState } from 'react';
import { CheckCircle2, XCircle, DollarSign, FileText, Sparkles, X } from 'lucide-react';
import { recordOutcome as apiRecordOutcome } from '../services/api';

export default function OutcomeRecorder({ currentDeal, onOutcomeRecorded, onCancel }) {
  const [outcome, setOutcome] = useState('WON');
  const [finalPrice, setFinalPrice] = useState(
    Number(currentDeal?.counterOffer || currentDeal?.dealValue || 92000)
  );
  const [chosenStrategy, setChosenStrategy] = useState(
    currentDeal?.chosenStrategy || '8% discount + premium support'
  );
  const [outcomeReason, setOutcomeReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!currentDeal) {
    return (
      <div className="p-8 text-center text-slate-400 space-y-3">
        <FileText className="w-8 h-8 mx-auto text-slate-600" />
        <p className="text-sm">Run a negotiation analysis first before recording an outcome.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!outcomeReason.trim()) { 
      setError('Please provide a brief outcome reason.'); 
      return; 
    }
    setError(null);
    setLoading(true);
    try {
      const dealId = currentDeal.dealId || currentDeal.deal_id || 'DEAL-003';
      const res = await apiRecordOutcome(dealId, {
        outcome,
        chosenStrategy,
        outcomeReason: outcomeReason.trim(),
        finalPrice: Number(finalPrice)
      });
      setResult(res);
      if (onOutcomeRecorded) onOutcomeRecorded(res);
    } catch (err) {
      setError('Failed to record outcome: ' + err.message);
    } finally { 
      setLoading(false); 
    }
  };

  if (result) {
    const before = result.beforeStats;
    const after = result.afterStats;
    return (
      <div className="space-y-4 text-center">
        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Outcome Recorded</h3>
          <p className="text-xs text-emerald-400 font-medium">Deal experience retained in Hindsight long-term memory</p>
        </div>

        {/* Before / After Learning Stats */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="p-3.5 rounded-xl bg-[#101622] border border-[#20293a] space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Before Retain</div>
            <div className="text-xs text-white font-semibold">{before?.sampleWins}W / {before?.sampleLosses}L</div>
            <div className="text-[11px] text-slate-400">{before?.winRate}% win rate</div>
            <div className="text-[11px] font-bold text-amber-400">{before?.finalConfidence} confidence</div>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">After Retain</div>
            <div className="text-xs text-white font-semibold">{after?.sampleWins}W / {after?.sampleLosses}L</div>
            <div className="text-[11px] text-slate-400">{after?.winRate}% win rate</div>
            <div className="text-[11px] font-bold text-emerald-400">{after?.finalConfidence} confidence</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-mono text-purple-300 truncate">
          {result.retainResult?.content || `Retained [${currentDeal.dealId || 'DEAL'}] ${currentDeal.customer}: ${outcome}`}
        </div>

        <div className="flex items-center gap-1.5 justify-center text-xs text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>This negotiation will now directly inform future deal analyses.</span>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20 mt-2"
          >
            Done
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
      <div>
        <h2 className="text-lg font-extrabold text-white">Record Negotiation Outcome</h2>
        <p className="text-slate-400 text-xs mt-0.5">
          Recording the outcome retains this deal in Hindsight to continuously improve future recommendations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Deal Summary Bar */}
        <div className="p-3 rounded-xl bg-[#101622] border border-[#20293a] flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Customer</span>
            <span className="font-bold text-white">{currentDeal.customer}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Deal Value</span>
            <span className="font-mono font-bold text-slate-200">${Number(currentDeal.dealValue || 0).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Requested</span>
            <span className="font-mono font-bold text-rose-400">{currentDeal.requestedDiscountPercent || 0}%</span>
          </div>
        </div>

        {/* WON / LOST Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">Outcome Status</label>
          <div className="grid grid-cols-2 gap-3">
            {['WON', 'LOST'].map(opt => (
              <button
                type="button"
                key={opt}
                onClick={() => setOutcome(opt)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs border transition ${
                  outcome === opt
                    ? opt === 'WON'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                      : 'bg-rose-700 text-white border-rose-600 shadow-md shadow-rose-700/20'
                    : 'bg-[#101622] text-slate-400 border-[#20293a] hover:border-slate-600'
                }`}
              >
                {opt === 'WON' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>{opt === 'WON' ? 'Deal WON' : 'Deal LOST'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Final Price & Strategy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Final Agreed Price ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">$</span>
              <input
                type="number"
                value={finalPrice}
                onChange={e => setFinalPrice(e.target.value)}
                min={0}
                className="w-full bg-[#101622] border border-[#243048] rounded-xl pl-7 pr-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Strategy Used</label>
            <input
              type="text"
              value={chosenStrategy}
              onChange={e => setChosenStrategy(e.target.value)}
              placeholder="e.g. 8% discount + premium support"
              className="w-full bg-[#101622] border border-[#243048] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Outcome Reason */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">
            Outcome Reason <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={3}
            value={outcomeReason}
            onChange={e => setOutcomeReason(e.target.value)}
            placeholder="Explain why the deal was won or lost (e.g., customer accepted 8% discount after adding premium technical onboarding)."
            className="w-full bg-[#101622] border border-[#243048] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
          />
        </div>

        {error && <p className="text-rose-400 text-xs font-medium">{error}</p>}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Retaining in Hindsight...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Outcome & Retain Memory</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
