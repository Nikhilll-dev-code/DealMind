import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Cpu, 
  Database, 
  RefreshCw, 
  Zap, 
  Layers, 
  ShieldCheck, 
  Clock, 
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HardDrive,
  Activity,
  Radio,
  Search,
  ChevronRight,
  Info,
  Lock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { getHealth, getHindsightOutbox, syncHindsightOutbox, fetchSessionCheckpoint, retryOutboxEvent, getHindsightTelemetry } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Card, { CardHeader, CardBody, CardFooter } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';

export default function InfrastructureView() {
  const { user, tenantId, hasRole } = useAuth();
  const toast = useToast();
  
  const [health, setHealth] = useState(null);
  const [outbox, setOutbox] = useState([]);
  const [hindsightTelemetry, setHindsightTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [retryingEventId, setRetryingEventId] = useState(null);
  const [lastCheckTime, setLastCheckTime] = useState(null);
  
  // Confirmation Modal state for Outbox Drain
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Checkpoint Inspector state
  const [checkpointSessionId, setCheckpointSessionId] = useState('');
  const [inspectingCheckpoint, setInspectingCheckpoint] = useState(false);
  const [inspectedCheckpoint, setInspectedCheckpoint] = useState(null);
  const [checkpointError, setCheckpointError] = useState(null);

  // Role permissions
  const canPerformOps = hasRole(['ADMIN', 'MANAGER']);

  const loadData = async () => {
    setLoading(true);
    try {
      const [h, ob, tel] = await Promise.all([
        getHealth().catch(err => ({ status: 'error', error: err.message })),
        getHindsightOutbox(tenantId).catch(() => []),
        getHindsightTelemetry().catch(() => null)
      ]);
      setHealth(h);
      setOutbox(Array.isArray(ob) ? ob : []);
      setHindsightTelemetry(tel);
      setLastCheckTime(new Date());
    } catch (err) {
      console.error('Failed to fetch infrastructure telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Live poll every 10s
    return () => clearInterval(interval);
  }, [tenantId]);

  const executeManualSync = async () => {
    setShowSyncModal(false);
    if (!canPerformOps) {
      toast.error('Permission Denied', 'Only ADMIN or MANAGER users can manually drain the outbox queue.');
      return;
    }
    setSyncing(true);
    try {
      const res = await syncHindsightOutbox(tenantId, { retryFailed: true });
      toast.success(
        'Outbox Drain Completed',
        `Processed ${res.processed || 0} events (${res.succeeded || res.synced || 0} succeeded, ${res.failed || 0} failed).`
      );
      await loadData();
    } catch (err) {
      toast.error('Outbox Sync Failed', err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleRetrySingleEvent = async (eventId) => {
    if (!canPerformOps) {
      toast.error('Permission Denied', 'Only ADMIN or MANAGER users can retry outbox events.');
      return;
    }
    setRetryingEventId(eventId);
    try {
      const res = await retryOutboxEvent(eventId, tenantId);
      if (res.success) {
        toast.success('Event Recovered', `Outbox event #${eventId} successfully retained to Hindsight.`);
      } else {
        toast.error('Retry Failed', res.error || 'Failed to retain memory');
      }
      await loadData();
    } catch (err) {
      toast.error('Retry Error', err.message);
    } finally {
      setRetryingEventId(null);
    }
  };

  const handleLookupCheckpoint = async (e) => {
    if (e) e.preventDefault();
    if (!checkpointSessionId.trim()) return;
    setInspectingCheckpoint(true);
    setCheckpointError(null);
    setInspectedCheckpoint(null);
    try {
      const cp = await fetchSessionCheckpoint(checkpointSessionId.trim());
      setInspectedCheckpoint(cp);
    } catch (err) {
      setCheckpointError(err.message || 'Checkpoint not found for this session ID');
    } finally {
      setInspectingCheckpoint(false);
    }
  };

  // Telemetry status helper
  const getServiceStatus = (service) => {
    if (!health || health.status === 'error') return { label: 'Unknown', variant: 'neutral', icon: AlertTriangle };
    
    switch (service) {
      case 'api':
        return health.status === 'ok' 
          ? { label: 'Healthy', variant: 'success', icon: CheckCircle2 }
          : { label: 'Degraded', variant: 'warning', icon: AlertTriangle };
      case 'database':
        return health.database?.connected 
          ? { label: 'Healthy (WAL)', variant: 'success', icon: CheckCircle2 }
          : { label: 'Disconnected', variant: 'danger', icon: XCircle };
      case 'redis':
        if (health.redis?.mode === 'redis_distributed') {
          return { label: 'Distributed', variant: 'success', icon: CheckCircle2 };
        }
        return { label: 'Local Fallback', variant: 'warning', icon: Radio };
      case 'hindsight':
        return health.hindsight?.available 
          ? { label: 'Cloud Connected', variant: 'success', icon: CheckCircle2 }
          : { label: 'SQLite Fallback', variant: 'warning', icon: Database };
      case 'groq':
        return health.groq?.available 
          ? { label: 'Router Active', variant: 'success', icon: Zap }
          : { label: 'Offline', variant: 'danger', icon: XCircle };
      default:
        return { label: 'Unknown', variant: 'neutral', icon: AlertTriangle };
    }
  };

  const groqCooldowns = health?.groq?.cooldowns || {};
  const tokenMetrics = health?.tokenMetrics || {};
  const configuredModels = health?.groq?.configuredModels || [
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-20b'
  ];

  // Token calculations
  const globalLimit = tokenMetrics.globalLimit || 100000;
  const globalActual = tokenMetrics.globalActual || 0;
  const globalUsagePct = Math.min(100, Math.round((globalActual / globalLimit) * 100));

  const tenantLimit = tokenMetrics.tenantLimit || 25000;
  const tenantUsage = tokenMetrics.tenantUsage || {};
  const tenantActual = tenantUsage.actual || 0;
  const tenantReserved = tenantUsage.reserved || 0;
  const tenantTotal = tenantActual + tenantReserved;
  const tenantUsagePct = Math.min(100, Math.round((tenantTotal / tenantLimit) * 100));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Server className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Enterprise Infrastructure & Reliability</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time telemetry, Groq failover cooldowns, concurrency modes, token consumption, and transactional outbox.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {lastCheckTime && (
            <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
              Checked: {lastCheckTime.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={loadData} loading={loading} icon={RotateCcw}>
            Refresh
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => setShowSyncModal(true)} 
            loading={syncing} 
            icon={RefreshCw}
            disabled={!canPerformOps}
          >
            Drain Outbox Queue
          </Button>
        </div>
      </div>

      {/* Operational Diagnostic Banners */}
      {health?.redis?.mode === 'in_memory_fallback' && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 flex items-start gap-3 text-xs">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-900 dark:text-amber-200">
              Redis Distributed Coordination: In-Memory Fallback Active
            </div>
            <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
              `REDIS_URL` is unconfigured. The system is operating seamlessly with a single-instance in-memory concurrency semaphore and local token rate-limiting. Multi-worker clusters require Redis connection string.
            </p>
          </div>
        </div>
      )}

      {/* 5 Core Services Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Backend API */}
        {(() => {
          const st = getServiceStatus('api');
          return (
            <Card className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Node API Core</span>
                <Server className="w-4 h-4 text-brand-500" />
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${st.variant === 'success' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {st.label}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Port 5000 (Express)</div>
            </Card>
          );
        })()}

        {/* SQLite Database */}
        {(() => {
          const st = getServiceStatus('database');
          return (
            <Card className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SQLite Storage</span>
                <HardDrive className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {st.label}
              </div>
              <div className="text-[10px] text-slate-500 font-mono truncate" title="./data/dealmind.sqlite">
                dealmind.sqlite (WAL)
              </div>
            </Card>
          );
        })()}

        {/* Redis Mode */}
        {(() => {
          const st = getServiceStatus('redis');
          return (
            <Card className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Redis Concurrency</span>
                <Cpu className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${st.variant === 'success' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {st.label}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {health?.redis?.mode === 'redis_distributed' ? 'Distributed Lock' : 'In-Memory Semaphore'}
              </div>
            </Card>
          );
        })()}

        {/* Hindsight Memory */}
        {(() => {
          const st = getServiceStatus('hindsight');
          return (
            <Card className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hindsight Memory</span>
                <Database className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${st.variant === 'success' ? 'bg-purple-500' : 'bg-amber-500'}`} />
                {st.label}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Bank: {health?.hindsight?.bankId || 'dealmind'}
              </div>
            </Card>
          );
        })()}

        {/* Groq Router */}
        {(() => {
          const st = getServiceStatus('groq');
          return (
            <Card className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Groq Multi-Model</span>
                <Zap className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {st.label}
              </div>
              <div className="text-[10px] text-slate-500 font-mono truncate" title={health?.groq?.activeModel}>
                {health?.groq?.activeModel ? health.groq.activeModel.split('/')[1] : 'gpt-oss-120b'}
              </div>
            </Card>
          );
        })()}
      </div>

      {/* Groq Model Failover Chain & Token Budget Consumption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Groq Model Failover Matrix */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Groq Tiered Model Failover Chain</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
              {configuredModels.length} Configured Models
            </span>
          </div>

          <div className="space-y-3">
            {configuredModels.map((modelId, idx) => {
              const cd = groqCooldowns[modelId] || { status: 'available' };
              const isCooling = cd.status === 'cooling_down';
              const isActive = health?.groq?.activeModel === modelId;

              const modelLabels = {
                'openai/gpt-oss-120b': { tier: 'Primary Tier', spec: '120B Flagship • 8k TPM / 200k TPD' },
                'qwen/qwen3.8-27b': { tier: 'Failover Tier 1', spec: '27B High-Throughput • 7k ITPM / 8k TPM' },
                'openai/gpt-oss-20b': { tier: 'Failover Tier 2', spec: '20B Emergency Fallback • 8k TPM' }
              };
              const meta = modelLabels[modelId] || { tier: `Tier ${idx + 1}`, spec: 'Configured Model' };

              return (
                <div 
                  key={modelId} 
                  className={`p-3.5 rounded-xl border transition ${
                    isActive
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{modelId}</span>
                        {isActive && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500 text-white uppercase">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {meta.tier} — {meta.spec}
                      </div>
                    </div>

                    <div>
                      {isCooling ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Cooldown ({cd.remainingSeconds || '...'}s)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          ✓ Ready
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>If all Groq models encounter 429 rate-limits, deterministic mathematical fallback activates immediately.</span>
          </div>
        </Card>

        {/* Token Budget Consumption */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Token Budget Telemetry</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              Mode: {tokenMetrics.mode || 'in_memory_fallback'}
            </span>
          </div>

          <div className="space-y-4">
            {/* Global System Budget */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <span>Global System Limit</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {globalActual.toLocaleString()} / {globalLimit.toLocaleString()} Tokens ({globalUsagePct}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all rounded-full ${
                    globalUsagePct > 85 ? 'bg-rose-500' : globalUsagePct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.max(2, globalUsagePct)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>Remaining: {(globalLimit - globalActual).toLocaleString()} Tokens</span>
                <span>Max: {globalLimit.toLocaleString()}</span>
              </div>
            </div>

            {/* Tenant Budget */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <span>Tenant Consumption ({tenantId})</span>
                <span className="font-mono text-brand-600 dark:text-brand-400">
                  {tenantTotal.toLocaleString()} / {tenantLimit.toLocaleString()} Tokens ({tenantUsagePct}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all rounded-full ${
                    tenantUsagePct > 85 ? 'bg-rose-500' : tenantUsagePct > 60 ? 'bg-amber-500' : 'bg-brand-500'
                  }`}
                  style={{ width: `${Math.max(2, tenantUsagePct)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>Actual: {tenantActual.toLocaleString()} • Reserved: {tenantReserved.toLocaleString()}</span>
                <span>Remaining: {Math.max(0, tenantLimit - tenantTotal).toLocaleString()}</span>
              </div>
            </div>

            {/* Operational note */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              Token reservations guarantee fair quota allocation across multi-tenant negotiations without starvation.
            </div>
          </div>
        </Card>
      </div>

      {/* Hindsight Operational Telemetry */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Hindsight Operational Telemetry</h3>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
            hindsightTelemetry?.mode === 'live'
              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}>
            Mode: {hindsightTelemetry?.mode ?? 'unavailable'}
          </span>
        </div>

        {!hindsightTelemetry ? (
          <div className="p-4 text-center text-xs text-slate-400 italic">
            Hindsight telemetry endpoint unavailable. Ensure the server is running.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Operation Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Retain', key: 'retain', color: 'text-purple-600 dark:text-purple-400' },
                { label: 'Recall', key: 'recall', color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Reflect', key: 'reflect', color: 'text-indigo-600 dark:text-indigo-400' },
                { label: 'Cache Hits', key: 'cacheHits', color: 'text-emerald-600 dark:text-emerald-400' },
              ].map(({ label, key, color }) => {
                const op = hindsightTelemetry.operations?.[key] ?? hindsightTelemetry[key] ?? {};
                const success = typeof op === 'object' ? (op.success ?? 0) : op;
                const failed  = typeof op === 'object' ? (op.failed  ?? 0) : 0;
                return (
                  <div key={key} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
                    <div className={`text-xl font-bold font-mono ${color}`}>{success}</div>
                    {failed > 0 && (
                      <div className="text-[10px] text-rose-500 font-mono">{failed} failed</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Last Operation */}
            {hindsightTelemetry.lastOperation && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 text-[11px]">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Last Operation:</span>
                <span className="font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300 font-bold">
                  {hindsightTelemetry.lastOperation.type}
                </span>
                <span className={`font-mono font-bold ${hindsightTelemetry.lastOperation.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                  {hindsightTelemetry.lastOperation.status}
                </span>
                {hindsightTelemetry.lastOperation.durationMs != null && (
                  <span className="text-slate-500 font-mono">{hindsightTelemetry.lastOperation.durationMs}ms</span>
                )}
                {hindsightTelemetry.lastOperation.error && (
                  <span className="text-rose-500 truncate max-w-xs" title={hindsightTelemetry.lastOperation.error}>
                    {hindsightTelemetry.lastOperation.error}
                  </span>
                )}
              </div>
            )}

            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Counters are in-memory and reset on server restart. They reflect operations since the last boot.</span>
            </div>
          </div>
        )}
      </Card>

      {/* Agent Checkpoint Inspector */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Agent Checkpoint Recovery Inspector</h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
            SQLite agent_checkpoints Table
          </span>
        </div>

        <form onSubmit={handleLookupCheckpoint} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            placeholder="Enter Session ID (e.g. SES-1790872257505-123)"
            value={checkpointSessionId}
            onChange={(e) => setCheckpointSessionId(e.target.value)}
            className="flex-1 px-3.5 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <Button 
            type="submit" 
            variant="secondary" 
            size="sm" 
            loading={inspectingCheckpoint} 
            icon={Search}
          >
            Inspect Checkpoint
          </Button>
        </form>

        {checkpointError && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
            {checkpointError}
          </div>
        )}

        {inspectedCheckpoint && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2.5">
              <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                Session: {inspectedCheckpoint.sessionId}
              </div>
              <Badge variant={inspectedCheckpoint.status === 'COMPLETED' ? 'success' : 'warning'}>
                {inspectedCheckpoint.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Customer</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{inspectedCheckpoint.customer}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Model Used</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 truncate">{inspectedCheckpoint.modelUsed || 'System Default'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Completed Tools</span>
                <span className="font-mono text-indigo-500">{inspectedCheckpoint.completedTools?.length || 0} executed</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Updated At</span>
                <span className="font-mono text-slate-500 text-[11px]">{new Date(inspectedCheckpoint.updatedAt).toLocaleTimeString()}</span>
              </div>
            </div>

            {canPerformOps && inspectedCheckpoint.completedOperations?.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Idempotent Operation Hashes:</span>
                <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                  {inspectedCheckpoint.completedOperations.map((op, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {op}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Transactional Hindsight Outbox Queue Table */}
      <Card className="overflow-hidden">
        <CardHeader
          action={
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-mono">
                {outbox.filter(o => o.status === 'PENDING').length} Pending • {outbox.filter(o => o.status === 'COMPLETED').length} Completed • {outbox.length} Total
              </span>
              {canPerformOps && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowSyncModal(true)}
                  loading={syncing}
                  icon={RefreshCw}
                >
                  Drain Queue
                </Button>
              )}
            </div>
          }
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Transactional Hindsight Outbox Queue</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Durable retry queue ensuring zero memory loss between SQLite outcome commits and Hindsight Cloud retention.
          </p>
        </CardHeader>

        {outbox.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs italic">
            Outbox queue is empty. All negotiation memory events have been synchronized.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/50 dark:bg-slate-950/40">
                  <th className="px-5 py-3 text-left">Event ID</th>
                  <th className="px-5 py-3 text-left">Deal ID</th>
                  <th className="px-5 py-3 text-left">Action</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Attempts</th>
                  <th className="px-5 py-3 text-left">Last Error</th>
                  <th className="px-5 py-3 text-left">Created At</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {outbox.slice(0, 20).map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-5 py-3 font-mono font-bold text-brand-600 dark:text-brand-400">
                      #{evt.id}
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-800 dark:text-slate-200">
                      {evt.deal_id}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-300 font-mono text-[10px] font-bold">
                        {evt.action || 'RETAIN'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        evt.status === 'COMPLETED'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : evt.status === 'FAILED'
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}>
                        {evt.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-500">
                      {evt.attempts} / {evt.max_attempts || 5}
                    </td>
                    <td className="px-5 py-3 text-slate-500 max-w-[200px] truncate text-[11px]" title={evt.last_error || 'None'}>
                      {evt.last_error || '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(evt.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {evt.status !== 'COMPLETED' && canPerformOps && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="py-1 px-2.5 text-[10px]"
                          loading={retryingEventId === evt.id}
                          onClick={() => handleRetrySingleEvent(evt.id)}
                        >
                          Retry
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Confirmation Modal for Manual Outbox Drain */}
      <Modal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        title="Confirm Outbox Queue Drain"
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowSyncModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={executeManualSync} loading={syncing} icon={RefreshCw}>
              Confirm & Drain Queue
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <p>
            You are about to manually trigger a synchronization cycle for all pending memory events in the transactional outbox queue for tenant <strong className="text-slate-900 dark:text-white font-mono">{tenantId}</strong>.
          </p>
          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
            Pending outbox events will be pushed to Hindsight Cloud. If Hindsight is temporarily unreachable, events will remain in the durable SQLite outbox with incremented retry counts.
          </div>
        </div>
      </Modal>
    </div>
  );
}
