import React, { useEffect, useState, useMemo } from 'react';
import { Briefcase, Search, PlusCircle, ArrowRight } from 'lucide-react';
import { useRouter } from '../../context/RouteContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getCustomerNegotiations } from '../../services/api';
import { hasPermission, PERMISSIONS } from '../../lib/permissions';
import { formatCurrency, formatPercent, formatDate } from '../../lib/format';

export default function CustomerNegotiationsView() {
  const { navigate } = useRouter();
  const { role } = useAuth();
  const toast = useToast();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const canAccess = role === 'CUSTOMER' || hasPermission(role, PERMISSIONS.DEALS_VIEW);

  useEffect(() => {
    getCustomerNegotiations()
      .then(d => setDeals(Array.isArray(d) ? d : []))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!canAccess) {
      toast.error('Access denied', 'This page is only available to customer accounts.');
      navigate('/customer', { replace: true });
    }
  }, [canAccess, navigate]);

  const filtered = deals.filter(d =>
    !query || (d.strategy || '').toLowerCase().includes(query.toLowerCase()) || (d.deal_id || '').toLowerCase().includes(query.toLowerCase())
  );

  if (!canAccess) return null;

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-dm-ink">My negotiations</h1>
          <p className="mt-1.5 text-sm text-dm-muted">Every negotiation you've started with DealMind.</p>
        </div>
        <button
          onClick={() => navigate('/customer/negotiations/new')}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-dm-blue rounded-xl hover:bg-dm-deep transition-all shadow-md shadow-dm-blue/25 self-start"
        >
          <PlusCircle className="w-4 h-4" /> New negotiation
        </button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dm-muted" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search negotiations…"
          className="w-full bg-white border border-dm-border rounded-xl py-2.5 pl-9 pr-3 text-xs text-dm-ink focus:outline-none focus:border-dm-blue focus:ring-2 focus:ring-dm-blue/15"
        />
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-16 rounded-2xl dm-shimmer animate-shimmer" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-dm-border rounded-2xl p-10 text-center">
          <Briefcase className="w-6 h-6 text-dm-muted mx-auto mb-3" />
          <h3 className="text-sm font-bold text-dm-ink">No negotiations found</h3>
          <p className="mt-1 text-xs text-dm-muted">Start a negotiation to see it here.</p>
        </div>
      ) : (
        <div className="bg-white border border-dm-border rounded-2xl shadow-card overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-dm-border bg-dm-subtle/50">
                {['Negotiation', 'Value', 'Requested', 'Current', 'Term', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-dm-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr
                  key={d.deal_id}
                  onClick={() => canAccess && navigate(`/customer/negotiations/${encodeURIComponent(d.deal_id)}`)}
                  className="border-b border-dm-border last:border-0 hover:bg-dm-subtle/40 cursor-pointer transition"
                >
                  <td className="px-4 py-3">
                    <div className="text-xs font-bold text-dm-ink truncate max-w-[220px]">{d.strategy || 'Negotiation'}</div>
                    <div className="text-[10px] text-dm-muted font-mono">{d.deal_id}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-dm-ink">{formatCurrency(d.initial_offer)}</td>
                  <td className="px-4 py-3 text-xs text-rose-500">{d.requested_discount_percent}%</td>
                  <td className="px-4 py-3 text-xs font-semibold text-dm-blue">{formatPercent(d.concession_percent)}</td>
                  <td className="px-4 py-3 text-xs text-dm-muted">{d.contract_years} yr</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                      d.status === 'AGREEMENT' ? 'bg-dm-soft text-emerald-800'
                        : d.status === 'ESCALATED' ? 'bg-amber-50 text-amber-700'
                        : 'bg-dm-tint text-dm-deep'
                    }`}>{d.status}</span>
                  </td>
                  <td className="px-4 py-3 text-dm-muted"><ArrowRight className="w-4 h-4" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
