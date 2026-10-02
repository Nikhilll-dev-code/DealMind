import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  HardDrive, 
  Cloud, 
  Sparkles, 
  Code2, 
  Tag, 
  CheckCircle2, 
  XCircle,
  Clock
} from 'lucide-react';
import { getMemoryExplorer } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

export default function MemoryExplorerView() {
  const { tenantId } = useAuth();
  const [activeTab, setActiveTab] = useState('sqlite'); // 'sqlite' | 'cloud'
  const [structuredDeals, setStructuredDeals] = useState([]);
  const [cloudMemories, setCloudMemories] = useState([]);
  const [cloudStatus, setCloudStatus] = useState({});
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMemoryExplorer(search).then(res => {
      setStructuredDeals(res.structuredDeals || []);
      setCloudMemories(res.cloudMemories || []);
      setCloudStatus(res.cloudStatus || {});
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [search, tenantId]);

  const filteredDeals = structuredDeals.filter(d =>
    !search ||
    d.customer?.toLowerCase().includes(search.toLowerCase()) ||
    d.deal_id?.toLowerCase().includes(search.toLowerCase()) ||
    d.strategy?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCloud = cloudMemories.filter(m =>
    !search ||
    m.text?.toLowerCase().includes(search.toLowerCase()) ||
    m.customer?.toLowerCase().includes(search.toLowerCase()) ||
    m.documentId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Organizational Memory Explorer</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dual-view inspection: Structured SQLite transactions vs Vectorize Hindsight Cloud persistent memory bank.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
            cloudStatus?.available 
              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
          }`}>
            <Cloud className="w-3.5 h-3.5" />
            <span>Hindsight Bank: {cloudStatus?.bankId || 'dealmind'}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold">
            <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
            <span>SQLite: {structuredDeals.length} Deals</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Dual View Selector */}
        <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
          <button
            onClick={() => { setActiveTab('sqlite'); setSelectedItem(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'sqlite'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Structured Deals (SQLite)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">{filteredDeals.length}</span>
          </button>
          <button
            onClick={() => { setActiveTab('cloud'); setSelectedItem(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'cloud'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Memory Bank (Hindsight Cloud)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">{filteredCloud.length}</span>
          </button>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search deals, entities, text..."
            icon={Search}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Main Grid: Data List + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Content List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <Card className="p-12 text-center text-slate-500 text-xs">
              Loading knowledge bank...
            </Card>
          ) : activeTab === 'sqlite' ? (
            filteredDeals.length === 0 ? (
              <Card className="p-12 text-center text-slate-500 text-xs italic">
                No matching structured deals in SQLite.
              </Card>
            ) : (
              filteredDeals.map((deal) => (
                <div
                  key={deal.deal_id || deal.id}
                  onClick={() => setSelectedItem(deal)}
                  className={`p-4 rounded-2xl border transition cursor-pointer ${
                    selectedItem?.deal_id === deal.deal_id
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 shadow-md'
                      : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{deal.deal_id}</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{deal.customer}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                        {deal.segment} · {deal.industry}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      deal.outcome === 'WON' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}>
                      {deal.outcome}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-4 flex-wrap">
                    <span>Discount: <strong className="text-amber-500 font-mono">{deal.concession_percent}%</strong></span>
                    <span>Offer: <strong className="text-slate-900 dark:text-white font-mono">${Number(deal.counter_offer || deal.initial_offer).toLocaleString()}</strong></span>
                    <span>Strategy: <span className="font-medium text-slate-700 dark:text-slate-300">{deal.strategy}</span></span>
                  </div>

                  <p className="text-[11px] text-slate-500 italic mt-1.5 line-clamp-2">"{deal.outcome_reason}"</p>
                </div>
              ))
            )
          ) : (
            filteredCloud.length === 0 ? (
              <Card className="p-12 text-center text-slate-500 text-xs space-y-2">
                <Cloud className="w-8 h-8 text-slate-400 mx-auto" />
                <p>No memories returned from Hindsight Cloud.</p>
                {cloudStatus?.error && <p className="text-rose-400">{cloudStatus.error}</p>}
              </Card>
            ) : (
              filteredCloud.map((mem) => (
                <div
                  key={mem.id}
                  onClick={() => setSelectedItem(mem)}
                  className={`p-4 rounded-2xl border transition cursor-pointer ${
                    selectedItem?.id === mem.id
                      ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 shadow-md'
                      : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px] font-bold font-mono">
                        {mem.type}
                      </span>
                      <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">{mem.documentId}</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{mem.customer}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-mono font-bold border border-purple-500/30">
                      Reranker: {mem.score}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 line-clamp-3 leading-relaxed">{mem.text}</p>

                  {mem.entities?.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[10px] text-slate-400">Entities:</span>
                      {mem.entities.slice(0, 4).map((ent, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-mono">
                          {typeof ent === 'string' ? ent : ent.canonical_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )
          )}
        </div>

        {/* Right 1 Col: Raw JSON Inspector */}
        <div className="sticky top-6 h-fit">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Code2 className="w-4 h-4 text-purple-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                {activeTab === 'sqlite' ? 'SQLite Record Inspector' : 'Hindsight Cloud Memory Inspector'}
              </h3>
            </div>

            {selectedItem ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Selected: <strong className="text-slate-900 dark:text-white">{selectedItem.deal_id || selectedItem.documentId}</strong></span>
                  <span className="text-[10px] font-mono text-purple-500">{activeTab === 'sqlite' ? 'Durable Relational Store' : 'Semantic Knowledge Graph'}</span>
                </div>
                <pre className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-purple-600 dark:text-purple-300 overflow-x-auto max-h-[460px]">
                  {JSON.stringify(selectedItem, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                Click any deal or memory record to inspect its underlying JSON metadata and entity graph properties.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
