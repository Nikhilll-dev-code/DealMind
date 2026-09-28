import React, { useEffect, useState } from 'react';
import { List, CheckCircle2, XCircle, Clock, ChevronRight, ArrowUpDown } from 'lucide-react';
import { getNegotiations } from '../services/api';

function OutcomeBadge({ outcome }) {
  if (outcome === 'WON') return <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400"><CheckCircle2 className="w-3 h-3" />WON</span>;
  if (outcome === 'LOST') return <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400"><XCircle className="w-3 h-3" />LOST</span>;
  return <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-400"><Clock className="w-3 h-3" />PENDING</span>;
}

export default function DealsList({ onAnalyzeDeal }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date');
  const [filterOutcome, setFilterOutcome] = useState('all');

  useEffect(() => {
    getNegotiations().then(data => {
      setDeals(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const sorted = [...deals]
    .filter(d => filterOutcome === 'all' || d.outcome === filterOutcome)
    .sort((a, b) => {
      if (sortBy === 'value') return (b.initialOffer || b.initial_offer || 0) - (a.initialOffer || a.initial_offer || 0);
      if (sortBy === 'customer') return (a.customer || '').localeCompare(b.customer || '');
      return new Date(b.date || 0) - new Date(a.date || 0);
    });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <List className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">All Deals</h2>
          </div>
          <p className="text-slate-400 text-sm">{deals.length} negotiations in memory bank</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)}
            className="bg-[#182030] border border-[#243048] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none">
            <option value="all">All Outcomes</option>
            <option value="WON">WON</option>
            <option value="LOST">LOST</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="bg-[#182030] border border-[#243048] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none">
            <option value="date">Sort: Date</option>
            <option value="value">Sort: Deal Value</option>
            <option value="customer">Sort: Customer</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading deals...</div>
      ) : (
        <div className="bg-[#182030] border border-[#243048] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#243048]">
                {['Deal ID', 'Customer', 'Segment', 'Deal Value', 'Discount %', 'Strategy', 'Date', 'Outcome', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#243048]">
              {sorted.map(deal => {
                const dv = deal.initialOffer || deal.initial_offer || 0;
                const disc = deal.requestedDiscountPercent || deal.requested_discount_percent || deal.concessionPercent || 0;
                return (
                  <tr key={deal.deal_id || deal.dealId} className="hover:bg-[#1f2a3f] transition group">
                    <td className="px-4 py-3 font-mono text-xs text-blue-400 font-bold">{deal.deal_id || deal.dealId}</td>
                    <td className="px-4 py-3 font-semibold text-white">{deal.customer}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{deal.segment}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-200">${dv.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-xs text-rose-400">{disc}%</td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-40 truncate">{deal.strategy}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{deal.date}</td>
                    <td className="px-4 py-3"><OutcomeBadge outcome={deal.outcome} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => onAnalyzeDeal(deal)}
                        className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold">
                        Analyze <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
