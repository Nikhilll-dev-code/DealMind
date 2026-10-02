import React, { useState, useEffect } from 'react';
import { History, Brain, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { getLearningTimeline } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Card, { CardHeader, CardBody } from '../components/common/Card';
import Button from '../components/common/Button';

export default function LearningTimelineView() {
  const { tenantId } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    getLearningTimeline(tenantId)
      .then(res => setEvents(Array.isArray(res) ? res : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-500" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Hindsight Learning Timeline</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Every recorded negotiation outcome retains experience into Hindsight long-term memory, continuously refining win rates and confidence tiers.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadData} loading={loading}>
          Refresh Timeline
        </Button>
      </div>

      {events.length === 0 ? (
        <Card className="p-16 text-center space-y-3">
          <Sparkles className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Learning Events Recorded</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Analyze a negotiation, record a deal outcome (WON/LOST), and see the live learning update appear here!
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((evt) => (
            <Card key={evt.id} className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{evt.deal_id}</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{evt.customer}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {evt.event_type}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">{evt.timestamp}</span>
              </div>

              {/* Before vs After Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before State */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    BEFORE Outcome Retained
                  </span>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    Wins / Losses: {evt.before_wins} W / {evt.before_losses} L
                  </div>
                  <div className="text-xs font-mono font-bold text-amber-500">
                    Confidence: {evt.before_confidence}
                  </div>
                </div>

                {/* After State */}
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    AFTER Outcome Retained in Hindsight
                  </span>
                  <div className="text-xs text-slate-900 dark:text-slate-100 font-medium">
                    Wins / Losses: {evt.after_wins} W / {evt.after_losses} L
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Updated Confidence: {evt.after_confidence}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-purple-600 dark:text-purple-300">
                {evt.memory_retained}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
