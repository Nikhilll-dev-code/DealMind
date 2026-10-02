import React, { useState } from 'react';
import { 
  Settings, 
  Database, 
  ShieldCheck, 
  Zap, 
  RotateCcw, 
  Building2, 
  User, 
  KeyRound, 
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  Cpu,
  Lock,
  ExternalLink,
  Sliders,
  Sparkles
} from 'lucide-react';
import { resetDemo } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRouter } from '../context/RouteContext';
import Card, { CardHeader, CardBody } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';

export default function SettingsView({ health, onResetDemoGlobal }) {
  const { user, tenantId, hasRole } = useAuth();
  const toast = useToast();
  const { navigate } = useRouter();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const canResetDb = hasRole(['ADMIN']);

  const handleResetExecute = async () => {
    setShowResetModal(false);
    if (!canResetDb) {
      toast.error('Permission Denied', 'Only ADMIN users can reset the database.');
      return;
    }
    setResetting(true);
    try {
      await resetDemo();
      toast.success('Database Reset Completed', 'Restored 12 initial negotiation episodes into SQLite.');
      if (onResetDemoGlobal) onResetDemoGlobal();
    } catch (err) {
      toast.error('Reset Failed', err.message);
    } finally {
      setResetting(false);
    }
  };

  const isManagerOrAdmin = hasRole(['ADMIN', 'MANAGER']);

  const tabs = [
    { id: 'profile', label: 'User Profile', icon: User },
    { id: 'organization', label: 'Organization & Tenant', icon: Building2 },
    { id: 'system', label: 'System Status', icon: Server },
    ...(isManagerOrAdmin ? [{ id: 'infrastructure', label: 'Infrastructure Telemetry', icon: Cpu }] : []),
    { id: 'demo', label: 'Demo Lifecycle', icon: RotateCcw }
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Settings & Account Management</h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Tenant context, account permissions, system observability, and database lifecycle controls.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-brand-600 dark:border-brand-400 text-brand-600 dark:text-brand-400 bg-brand-50/30 dark:bg-brand-950/20'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 1. Profile Tab */}
      {activeTab === 'profile' && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-brand-500/20">
              {user?.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{user?.display_name || 'Guest User'}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  {user?.role || 'SALESPERSON'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{user?.email || 'unauthenticated'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Account Role</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{user?.role || 'SALESPERSON'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Approval Authorization</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {hasRole(['ADMIN', 'MANAGER']) ? 'Authorized Approver' : 'Requires Approval (>15%)'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Session Token Status</span>
              <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active JWT (8h TTL)
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* 2. Organization & Tenant Tab */}
      {activeTab === 'organization' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Tenant Isolation Context</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
              Multi-Tenant Architecture
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Active Tenant Identifier:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{tenantId}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Data Partitioning Strategy:</span>
                <span className="text-slate-800 dark:text-slate-200">Scoped Column Partition (SQLite & Hindsight Bank)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Tenant Token Budget Limit:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">25,000 Tokens</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60 text-xs text-indigo-700 dark:text-indigo-300">
              Every negotiation episode, customer memory, and approval record is isolated strictly by the verified tenant claim derived from the server-side JWT token.
            </div>
          </div>
        </Card>
      )}

      {/* 3. System Status Tab */}
      {activeTab === 'system' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">System Subsystems Overview</h3>
            </div>
            {isManagerOrAdmin && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/infrastructure')}
                icon={ExternalLink}
              >
                Full Observability
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">API Server</div>
                <div className="text-[10px] text-slate-500">Express / Node.js</div>
              </div>
              <Badge variant="success">Healthy</Badge>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Database</div>
                <div className="text-[10px] text-slate-500">SQLite WAL Mode</div>
              </div>
              <Badge variant="success">WAL Active</Badge>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Groq AI Router</div>
                <div className="text-[10px] text-slate-500">{health?.groq?.activeModel || 'gpt-oss-120b'}</div>
              </div>
              <Badge variant="success">Active</Badge>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Hindsight Memory</div>
                <div className="text-[10px] text-slate-500">Bank: {health?.hindsight?.bankId || 'dealmind'}</div>
              </div>
              <Badge variant="success">Connected</Badge>
            </div>
          </div>
        </Card>
      )}

      {/* 4. Infrastructure Telemetry Tab */}
      {activeTab === 'infrastructure' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-brand-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Real-Time Infrastructure Snapshot</h3>
            </div>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => navigate('/infrastructure')}
            >
              Open SRE Dashboard
            </Button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-slate-500">Redis Coordination Mode:</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                {health?.redis?.mode === 'redis_distributed' ? 'Distributed Cluster' : 'In-Memory Local Fallback'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-slate-500">Configured Groq Fallback Chain:</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                120B Flagship → 27B Fast → 20B Emergency
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-slate-500">Transactional Outbox Guarantees:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                Zero Data Loss Dual-Write Outbox
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* 5. Demo Lifecycle Tab */}
      {activeTab === 'demo' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <RotateCcw className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Demo Lifecycle & Seed Database Management</h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Reset all recorded outcomes and restore the initial 12 seed negotiation episodes (Acme Corp: 5 WON, 3 LOST) for testing and demonstration workflows.
          </p>

          <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
            <strong>Note:</strong> Resetting the database clears all ad-hoc negotiations, resets pending approvals, and restores the benchmark seed state.
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              onClick={() => setShowResetModal(true)}
              loading={resetting}
              icon={RotateCcw}
              disabled={!canResetDb}
              className="border-amber-300 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              Reset Database to Initial 12 Seed Episodes
            </Button>
            {!canResetDb && (
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Database reset requires ADMIN privileges.
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Confirmation Modal for Reset Database */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Confirm Database Reset"
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleResetExecute} loading={resetting} icon={RotateCcw}>
              Confirm & Reset Database
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <p className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> This action cannot be undone.
          </p>
          <p>
            All non-seed negotiations, pending approvals, and timeline events will be reset to the canonical 12 seed episodes.
          </p>
        </div>
      </Modal>
    </div>
  );
}
