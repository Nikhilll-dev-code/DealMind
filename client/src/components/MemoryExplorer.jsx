import React, { useState, useEffect } from 'react';
import { Database, Search, ShieldCheck, CheckCircle2, XCircle, Code2 } from 'lucide-react';
import { fetchMemoryExplorer } from '../services/api';

export default function MemoryExplorer() {
  const [memories, setMemories] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(null);
  const [selectedMemory, setSelectedMemory] = useState(null);

  useEffect(() => {
    fetchMemoryExplorer(search).then(res => {
      setMemories(res.memories || []);
      setStatus(res.status);
    }).catch(console.error);
  }, [search]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#243048] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white tracking-tight">Hindsight Memory Explorer</h2>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Inspect raw retained memories, metadata structures, and memory bank status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-400 font-mono text-xs font-bold border border-purple-500/30">
            Bank: dealmind
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs font-bold">
            {memories.length} Memories Stored
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter memories by keyword..."
          className="w-full bg-[#182030] border border-[#243048] rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Memory List & Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List (1 col) */}
        <div className="lg:col-span-2 space-y-3">
          {memories.map((m) => (
            <div
              key={m.deal_id}
              onClick={() => setSelectedMemory(m)}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                selectedMemory?.deal_id === m.deal_id
                  ? 'bg-purple-900/20 border-purple-500/50'
                  : 'bg-[#182030] border-[#243048] hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-purple-400">{m.deal_id}</span>
                  <span className="text-xs font-bold text-white">{m.customer}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  m.outcome === 'WON' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {m.outcome}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-2">{m.strategy}</p>
              <p className="text-[11px] text-slate-400 italic mt-1">"{m.outcome_reason}"</p>
            </div>
          ))}
        </div>

        {/* JSON Memory Inspector (1 col) */}
        <div className="bg-[#182030] border border-[#243048] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#243048] pb-3">
            <Code2 className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-white text-sm">Memory Record Inspector</h3>
          </div>

          {selectedMemory ? (
            <pre className="p-4 rounded-xl bg-[#121824] border border-[#243048] text-[11px] font-mono text-purple-300 overflow-x-auto">
              {JSON.stringify(selectedMemory, null, 2)}
            </pre>
          ) : (
            <p className="text-xs text-slate-400 italic">Select a memory from the list to inspect its metadata.</p>
          )}
        </div>
      </div>
    </div>
  );
}
