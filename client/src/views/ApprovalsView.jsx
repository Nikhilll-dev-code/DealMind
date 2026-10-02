import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Clock, 
  AlertTriangle, 
  FileText,
  Building2,
  DollarSign
} from 'lucide-react';
import { getApprovals, submitApprovalDecision } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Card, { CardHeader, CardBody } from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import { ApprovalStatusBadge } from '../components/common/Badge';

export default function ApprovalsView({ onRefreshGlobal }) {
  const { user, hasRole, tenantId } = useAuth();
  const toast = useToast();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [decisionMode, setDecisionMode] = useState('APPROVED'); // 'APPROVED' | 'REJECTED' | 'MODIFIED'
  const [modifiedDiscount, setModifiedDiscount] = useState(12);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const data = await getApprovals(tenantId);
      setApprovals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, [tenantId]);

  const handleOpenReview = (appr) => {
    setSelectedApproval(appr);
    setDecisionMode('APPROVED');
    setModifiedDiscount(Math.max(1, Math.round(appr.requested_discount * 0.7)));
    setDecisionNotes('');
  };

  const handleProcessDecision = async () => {
    if (!selectedApproval) return;
    setSubmitting(true);
    try {
      const payload = {
        status: decisionMode,
        managerName: user?.display_name || user?.email || 'Commercial Lead',
        decisionNotes: decisionNotes.trim() || `Decision recorded as ${decisionMode} by Deal Desk Manager.`,
        modifiedDiscount: decisionMode === 'MODIFIED' ? Number(modifiedDiscount) : undefined
      };

      await submitApprovalDecision(selectedApproval.approval_id, payload);
      toast.success(
        'Approval Decision Recorded',
        `Request ${selectedApproval.approval_id} for ${selectedApproval.customer} set to ${decisionMode}.`
      );
      setSelectedApproval(null);
      await loadApprovals();
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err) {
      toast.error('Decision Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isManagerOrAdmin = hasRole(['ADMIN', 'MANAGER']);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Discount Approvals Center</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manager escalation queue for commercial concessions exceeding standard authorization thresholds ({'>'}15%).
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadApprovals} loading={loading}>
          Refresh Queue
        </Button>
      </div>

      {/* Role Alert for Sales Reps */}
      {!isManagerOrAdmin && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200/90">
            <strong className="block text-amber-300 font-bold mb-0.5">View-Only Role Notice</strong>
            You are currently signed in with a Sales Representative role. You can monitor the status of pending deal desk requests, but decision authorization requires Deal Desk Manager or Administrator credentials.
          </div>
        </div>
      )}

      {/* Approvals Table Card */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Loading approvals queue...</div>
        ) : approvals.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Pending Escalations</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All discount requests are currently within standard policy thresholds or have already been decided.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/50 dark:bg-slate-950/40">
                  <th className="px-5 py-3 text-left">Approval ID</th>
                  <th className="px-5 py-3 text-left">Deal & Customer</th>
                  <th className="px-5 py-3 text-left">Requested</th>
                  <th className="px-5 py-3 text-left">Threshold</th>
                  <th className="px-5 py-3 text-left">Requester</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Expires</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {approvals.map((appr) => (
                  <tr key={appr.approval_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-amber-500">
                      {appr.approval_id}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">{appr.customer}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{appr.deal_id}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-rose-500">
                      {appr.requested_discount}%
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">
                      {appr.threshold_discount}%
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {appr.requested_by || 'Sales Rep'}
                    </td>
                    <td className="px-5 py-3.5">
                      <ApprovalStatusBadge status={appr.status} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                      {appr.expires_at ? new Date(appr.expires_at).toLocaleDateString() : '24h'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant={isManagerOrAdmin ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => handleOpenReview(appr)}
                        disabled={!isManagerOrAdmin}
                      >
                        {isManagerOrAdmin ? 'Review & Decide' : 'Inspect'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Review Dialog Modal */}
      {selectedApproval && (
        <Modal
          isOpen={Boolean(selectedApproval)}
          onClose={() => setSelectedApproval(null)}
          title={`Review Discount Exception: ${selectedApproval.customer}`}
          subtitle={`Deal ID: ${selectedApproval.deal_id} · Approval ID: ${selectedApproval.approval_id}`}
        >
          <div className="space-y-5 text-xs">
            {/* Context Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Concession:</span>
                <span className="font-mono font-bold text-rose-500">{selectedApproval.requested_discount}% Discount</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Standard Policy Ceiling:</span>
                <span className="font-mono font-bold text-slate-400">{selectedApproval.threshold_discount}% Max</span>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-500 font-semibold block">Strategy Proposed:</span>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed font-sans text-xs max-h-48 overflow-y-auto">
                  {formatStrategyText(selectedApproval.proposed_strategy)}
                </div>
              </div>
            </div>

            {/* Decision Mode / Form (Managers & Admins only) */}
            {isManagerOrAdmin ? (
              <>
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">Manager Action</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { mode: 'APPROVED', label: '✓ Full Approval', variant: 'success' },
                      { mode: 'MODIFIED', label: '✎ Modified Discount', variant: 'primary' },
                      { mode: 'REJECTED', label: '✕ Reject Concession', variant: 'danger' }
                    ].map(item => (
                      <button
                        type="button"
                        key={item.mode}
                        onClick={() => setDecisionMode(item.mode)}
                        className={`py-2.5 px-3 rounded-xl font-bold border transition ${
                          decisionMode === item.mode
                            ? item.mode === 'APPROVED'
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                              : item.mode === 'MODIFIED'
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                              : 'bg-rose-600 text-white border-rose-500 shadow-md'
                            : 'bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modified Discount Input */}
                {decisionMode === 'MODIFIED' && (
                  <Input
                    label="Authorized Concession (%) *"
                    type="number"
                    suffix="%"
                    min="0"
                    max="50"
                    value={modifiedDiscount}
                    onChange={e => setModifiedDiscount(e.target.value)}
                    helperText={`Adjust concession ceiling (e.g. counter with ${modifiedDiscount}% instead of requested ${selectedApproval.requested_discount}%).`}
                  />
                )}

                {/* Decision Notes */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">Decision Notes & Rationale *</label>
                  <textarea
                    rows={3}
                    value={decisionNotes}
                    onChange={e => setDecisionNotes(e.target.value)}
                    placeholder="State the commercial justification or deal desk conditions for this decision (mandatory)."
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Submit Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setSelectedApproval(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant={decisionMode === 'REJECTED' ? 'danger' : decisionMode === 'APPROVED' ? 'success' : 'primary'}
                    loading={submitting}
                    disabled={!decisionNotes.trim()}
                    onClick={handleProcessDecision}
                  >
                    Submit {decisionMode} Decision
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  <strong>Read-Only Access:</strong> You are viewing this approval queue in salesperson mode. Commercial discount decisions require Deal Desk Manager or Admin role.
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setSelectedApproval(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function formatStrategyText(raw) {
  if (!raw || typeof raw !== 'string') return 'Standard commercial strategy recommended.';

  // 1. Try extracting JSON from markdown code block
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (parsed.primaryRecommendation) return parsed.primaryRecommendation;
      if (parsed.headline) return `${parsed.headline}: ${parsed.primaryRecommendation || ''}`;
    } catch (e) {}
  }

  // 2. Try parsing top-level JSON object
  if (raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw.trim());
      if (parsed.primaryRecommendation) return parsed.primaryRecommendation;
      if (parsed.headline) return parsed.headline;
    } catch (e) {}
  }

  // 3. Clean chain-of-thought, thoughts, markdown artifacts, code blocks
  return raw
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^I have all the data needed[\s\S]*?(?:##|\n\n)/i, '')
    .replace(/```json[\s\S]*$/, '')
    .replace(/```[\s\S]*$/, '')
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*/g, '')
    .trim();
}
