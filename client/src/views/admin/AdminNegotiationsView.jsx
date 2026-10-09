import React, { useEffect, useState, useMemo } from 'react';
import { Search, Briefcase, ArrowUpDown } from 'lucide-react';
import { getNegotiations } from '../../services/api';
import { formatCurrency, formatPercent, formatDate } from '../../lib/format';

export default function AdminNegotiationsView() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [outcome, setOutcome] = useState('ALL');
  const [sort, setSort] = useState('date');

  useEffect(() => {
    getNegotiations()
      .then(d => setDeals(Array.isArray(d) ? d : []))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return deals
      .filter(d => {
        const s = search.toLowerCase();
        const matchSearch = !s || d.customer?.toLowerCase().includes(s) || (d.deal_id || '').toLowerCase().includes(s) || d.strategy?.toLowerCase().includes(s);
        const matchOutcome = outcome === 'ALL' || d.outcome === outcome;
        return matchSearch && matchOutcome;
      })
      .sort((a, b) => {
        if (sort === 'value') return (Number(b.initial_offer) || 0) - (Number(a.initial_offer) || 0);
        return new Date(b.date || 0) - new Date(a.date || 0);
      });
  }, [deals, search, outcome, sort]);

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-7">
        <h1 className="text-2xl font-black tracking-tight text-dm-ink">Negotiations</h1>
        <p className="mt-1.5 text-sm text-dm-muted">Company-wide negotiation monitoring and governance.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dm-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, deal, strategy…"
            className="w-full bg-white border border-dm-border rounded-xl py-2.5 pl-9 pr-3 text-xs text-dm-ink focus:outline-none focus:border-dm-blue focus:ring-2 focus:ring-dm-blue/15" />
        </div>
        <select value={outcome} onChange={e => setOutcome(e.target.value)} className="text-xs border border-dm-border rounded-xl px-3 py-2.5 bg-white text-dm-ink">
          {['ALL', 'WON', 'LOST', 'PENDING'].map(o => <option key={o} value={o}>{o === 'ALL' ? 'All outcomes' : o}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className="text-xs border border-dm-border rounded-xl px-3 py-2.5 bg-white text-dm-ink">
          <option value="date">Newest first</option>
          <option value="value">Highest value</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-14 rounded-2xl dm-shimmer animate-shimmer" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-dm-border rounded-2xl p-10 text-center">
          <Briefcase className="w-6 h-6 text-dm-muted mx-auto mb-3" />
          <h3 className="text-sm font-bold text-dm-ink">No negotiations match</h3>
        </div>
      ) : (
        <div className="bg-white border border-dm-border rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dm-border bg-dm-subtle/50">
                  {['Customer', 'Deal ID', 'Value', 'Requested', 'Concession', 'Term', 'Outcome', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-dm-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.deal_id} className="border-b border-dm-border last:border-0 hover:bg-dm-subtle/40 transition">
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-dm-ink">{d.customer}</div>
                      <div className="text-[10px] text-dm-muted">{d.segment}</div>
                    </td>
                    <td className="px-4 py-3 text-[10px] font-mono text-dm-muted">{d.deal_id}</td>
                    <td className="px-4 py-3 text-xs text-dm-ink">{formatCurrency(d.initial_offer)}</td>
                    <td className="px-4 py-3 text-xs text-rose-500">{d.requested_discount_percent}%</td>
                    <td className="px-4 py-3 text-xs font-semibold text-dm-blue">{formatPercent(d.concession_percent)}</td>
                    <td className="px-4 py-3 text-xs text-dm-muted">{d.contract_years}y</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold ${d.outcome === 'WON' ? 'text-emerald-600' : d.outcome === 'LOST' ? 'text-rose-500' : 'text-dm-muted'}`}>{d.outcome}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${d.status === 'AGREEMENT' ? 'bg-dm-soft text-emerald-800' : d.status === 'ESCALATED' ? 'bg-amber-50 text-amber-700' : 'bg-dm-subtle text-dm-muted'}`}>{d.status || 'ACTIVE'}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-dm-muted whitespace-nowrap">{formatDate(d.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
