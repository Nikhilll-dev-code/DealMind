import React, { useState, useEffect } from 'react';
import { Search, Filter, Database, CheckCircle2, XCircle, Tag, Building2 } from 'lucide-react';
import { fetchMemoryExplorer } from '../services/api';

export default function EvidenceExplorer() {
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchMemoryExplorer(search, customerFilter, outcomeFilter);
      setMemories(data.memories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, customerFilter, outcomeFilter]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <Search className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white tracking-tight">Evidence Explorer</h2>
        </div>
        <p className="text-slate-400 text-sm mt-1">
          Traceable view of all historical deal memories stored in Hindsight organizational memory.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#182030] border border-[#243048] rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search objections, strategies, or reasons..."
            className="w-full bg-[#121824] border border-[#243048] rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Customer Filter */}
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="bg-[#121824] border border-[#243048] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="">All Customers</option>
            <option value="Acme Corp">Acme Corp</option>
            <option value="Globex Inc">Globex Inc</option>
            <option value="NovaTech">NovaTech</option>
            <option value="BrightWorks">BrightWorks</option>
            <option value="Orion Systems">Orion Systems</option>
          </select>

          {/* Outcome Filter */}
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="bg-[#121824] border border-[#243048] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="">All Outcomes</option>
            <option value="WON">WON</option>
            <option value="LOST">LOST</option>
          </select>
        </div>
      </div>

      {/* Evidence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {memories.map((mem) => (
          <div key={mem.id || mem.deal_id} className="bg-[#182030] border border-[#243048] rounded-2xl p-5 space-y-4 hover:border-blue-500/40 transition">
            <div className="flex items-center justify-between border-b border-[#243048] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-400">{mem.deal_id}</span>
                <span className="text-xs font-semibold text-slate-300">{mem.customer}</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold ${
                mem.outcome === 'WON'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {mem.outcome}
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-slate-200 font-bold">{mem.strategy}</div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Concession: {mem.concession_percent}%</span>
                <span>Term: {mem.contract_years} yr</span>
                <span>Offer: ${mem.initial_offer?.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#121824] border border-[#243048] text-xs text-slate-400 italic leading-relaxed">
              "{mem.outcome_reason}"
            </div>

            <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400 font-mono">
              <Tag className="w-3 h-3 text-purple-400" />
              <span>{mem.segment}</span>
              <span>•</span>
              <span>{mem.industry}</span>
              <span>•</span>
              <span>{mem.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
