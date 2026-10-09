import React, { useEffect, useState } from 'react';
import { ScrollText, Database, ShieldCheck, Handshake, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getLearningTimeline, getApprovals, getDatasetImports } from '../../services/api';
import { formatDateTime } from '../../lib/format';

export default function AdminAuditView() {
  const { hasRole } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const canSeeApprovals = hasRole(['ADMIN']);
    Promise.all([
      getLearningTimeline().catch(() => []),
      canSeeApprovals ? getApprovals().catch(() => []) : Promise.resolve([]),
      getDatasetImports().catch(() => [])
    ]).then(([timeline, approvals, imports]) => {
      const merged = [
        ...timeline.map(t => ({
          id: `tl-${t.deal_id}-${t.timestamp}`,
          type: 'LEARNING',
          icon: Sparkles,
          title: `${t.event_type} · ${t.customer}`,
          detail: `Confidence ${t.before_confidence} → ${t.after_confidence} · ${t.memory_retained}`,
          timestamp: t.timestamp,
          tone: 'text-dm-blue bg-dm-tint'
        })),
        ...approvals.map(a => ({
          id: `ap-${a.approval_id}`,
          type: 'APPROVAL',
          icon: ShieldCheck,
          title: `${a.status} · ${a.customer}`,
          detail: `${a.requested_discount}% requested${a.manager_name ? ` · decided by ${a.manager_name}` : ''}`,
          timestamp: a.updated_at || a.created_at,
          tone: a.status === 'APPROVED' ? 'text-emerald-700 bg-dm-soft' : a.status === 'REJECTED' ? 'text-rose-600 bg-rose-50' : 'text-amber-700 bg-amber-50'
        })),
        ...imports.map(i => ({
          id: `im-${i.import_id}`,
          type: 'IMPORT',
          icon: Database,
          title: `${i.status} · ${i.filename}`,
          detail: `${i.imported_rows}/${i.total_rows} rows imported · ${i.invalid_rows} invalid`,
          timestamp: i.created_at,
          tone: 'text-dm-deep bg-dm-tint'
        }))
      ].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      setEvents(merged);
    }).finally(() => setLoading(false));
  }, [hasRole]);

  const filtered = events.filter(e => filter === 'ALL' || e.type === filter);

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-7">
        <h1 className="text-2xl font-black tracking-tight text-dm-ink">Audit</h1>
        <p className="mt-1.5 text-sm text-dm-muted">Decisions, imports, learning, and governance events.</p>
      </div>

      <div className="flex gap-2 mb-5">
        {['ALL', 'LEARNING', 'APPROVAL', 'IMPORT'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${filter === f ? 'bg-dm-blue text-white' : 'bg-white border border-dm-border text-dm-muted hover:text-dm-ink'}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-14 rounded-2xl dm-shimmer animate-shimmer" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-dm-border rounded-2xl p-10 text-center">
          <ScrollText className="w-6 h-6 text-dm-muted mx-auto mb-3" />
          <h3 className="text-sm font-bold text-dm-ink">No audit events</h3>
          <p className="mt-1 text-xs text-dm-muted">Governance activity will appear here.</p>
        </div>
      ) : (
        <div className="bg-white border border-dm-border rounded-2xl shadow-card divide-y divide-dm-border">
          {filtered.map(ev => (
            <div key={ev.id} className="flex items-start gap-3.5 px-5 py-4">
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${ev.tone}`}>
                <ev.icon className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-dm-ink">{ev.title}</div>
                <div className="text-[11px] text-dm-muted mt-0.5">{ev.detail}</div>
              </div>
              <span className="text-[10px] text-dm-muted shrink-0 whitespace-nowrap">{formatDateTime(ev.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
