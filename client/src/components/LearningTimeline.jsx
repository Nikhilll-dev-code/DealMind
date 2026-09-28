import React, { useState, useEffect } from 'react';
import { History, ArrowRight, Brain, CheckCircle2, Database, Sparkles } from 'lucide-react';
import { fetchLearningTimeline } from '../services/api';

export default function LearningTimeline() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchLearningTimeline().then(setEvents).catch(console.error);
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <History className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white tracking-tight">Hindsight Learning Timeline</h2>
        </div>
        <p className="text-slate-400 text-sm mt-1">
          Every closed negotiation outcome is retained into Hindsight long-term memory, continuously updating statistics and recommendations.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="bg-[#182030] border border-[#243048] rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <Sparkles className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="font-bold text-white text-base">No Learning Events Recorded Yet</h3>
          <p className="text-xs max-w-md mx-auto">
            Go to Counteroffer Advisor or Deal Workspace, record a deal outcome (WON/LOST), and see the live learning update appear here!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {events.map((evt) => (
            <div key={evt.id} className="bg-[#182030] border border-[#243048] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#243048] pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-400">{evt.deal_id}</span>
                  <span className="font-bold text-white text-sm">{evt.customer}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {evt.event_type}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">{evt.timestamp}</span>
              </div>

              {/* Before vs After Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before State */}
                <div className="p-4 rounded-xl bg-[#121824] border border-[#243048] space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">BEFORE Outcome Retained</span>
                  <div className="text-xs text-slate-300 font-medium">Acme Wins / Losses: {evt.before_wins} W / {evt.before_losses} L</div>
                  <div className="text-xs font-mono font-bold text-amber-400">Confidence: {evt.before_confidence}</div>
                </div>

                {/* After State */}
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">AFTER Outcome Retained in Hindsight</span>
                  <div className="text-xs text-slate-200 font-medium">Acme Wins / Losses: {evt.after_wins} W / {evt.after_losses} L</div>
                  <div className="text-xs font-mono font-bold text-emerald-400">Updated Confidence: {evt.after_confidence}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#121824] border border-[#243048] text-xs font-mono text-purple-300">
                {evt.memory_retained}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
