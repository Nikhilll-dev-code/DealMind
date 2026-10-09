import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouteContext';
import { useToast } from '../../context/ToastContext';
import { hasPermission, PERMISSIONS } from '../../lib/permissions';
import { Handshake, Download, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { getCustomerAgreements } from '../../services/api';
import { formatCurrency, formatPercent, formatDate } from '../../lib/format';
import Button from '../../components/common/Button';

function agreementSummary(a) {
  return [
    'DealMind — Negotiation Agreement Summary',
    '=========================================',
    `Deal ID:        ${a.deal_id}`,
    `Product:        ${a.strategy || '—'}`,
    `Final price:    ${formatCurrency(a.counter_offer)}`,
    `List value:     ${formatCurrency(a.initial_offer)}`,
    `Concession:     ${formatPercent(a.concession_percent)}`,
    `Contract term:  ${a.contract_years} year(s)`,
    `Status:         ${a.status}`,
    `Outcome:        ${a.outcome}`,
    `Recorded:       ${formatDate(a.created_at)}`,
    '',
    'This agreement was recorded and retained as organizational memory by DealMind.'
  ].join('\n');
}

export default function CustomerAgreementsView() {
  const { role } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();
  const canAccess = role === 'CUSTOMER' || hasPermission(role, PERMISSIONS.DEALS_RECORD_OUTCOME);
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canAccess) {
      toast.error('Access denied', 'Agreements are available to customer accounts only.');
      navigate('/customer', { replace: true });
    }
  }, [canAccess, navigate]);

  useEffect(() => {
    if (!canAccess) return;
    getCustomerAgreements()
      .then(d => setAgreements(Array.isArray(d) ? d : []))
      .catch(() => setAgreements([]))
      .finally(() => setLoading(false));
  }, [canAccess]);

  const download = (a) => {
    const blob = new Blob([agreementSummary(a)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${a.deal_id}-agreement.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!canAccess) {
    return (
      <div className="max-w-lg mx-auto px-5 py-20 text-center">
        <AlertCircle className="w-8 h-8 text-dm-blue mx-auto mb-3" />
        <h3 className="text-base font-bold text-dm-ink">Customer-only page</h3>
        <p className="mt-1 text-sm text-dm-muted">Agreements are available to customer accounts only.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/customer')}>Back to overview</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3 max-w-5xl mx-auto px-5 sm:px-8 py-8">
        {[0, 1].map(i => <div key={i} className="h-28 rounded-2xl dm-shimmer animate-shimmer" />)}
      </div>
    );
  }

  if (agreements.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        <div className="mb-7">
          <h1 className="text-2xl font-black tracking-tight text-dm-ink">Agreements</h1>
          <p className="mt-1.5 text-sm text-dm-muted">Negotiations where both sides reached acceptable terms.</p>
        </div>
        <div className="bg-white border border-dashed border-dm-border rounded-2xl p-10 text-center">
          <Handshake className="w-6 h-6 text-dm-muted mx-auto mb-3" />
          <h3 className="text-sm font-bold text-dm-ink">No agreements yet</h3>
          <p className="mt-1 text-xs text-dm-muted max-w-xs mx-auto">
            When you accept terms in a negotiation, the agreement will appear here with its final terms.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-7">
        <h1 className="text-2xl font-black tracking-tight text-dm-ink">Agreements</h1>
        <p className="mt-1.5 text-sm text-dm-muted">Negotiations where both sides reached acceptable terms.</p>
      </div>

      <div className="space-y-4">
        {agreements.map(a => (
          <div key={a.deal_id} className="bg-white border border-dm-border rounded-2xl shadow-card p-5 animate-fade-up">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-dm-soft text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-dm-ink">{a.strategy || 'Agreement'}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-dm-soft text-emerald-800">Agreement reached</span>
                  </div>
                  <p className="text-[11px] text-dm-muted font-mono mt-0.5">{a.deal_id} · {formatDate(a.created_at)}</p>
                </div>
              </div>
              <button
                onClick={() => download(a)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-dm-ink border border-dm-border rounded-xl hover:border-dm-blue/40 hover:bg-dm-tint/40 transition shrink-0"
              >
                <Download className="w-3.5 h-3.5" /> Summary
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['Final price', formatCurrency(a.counter_offer)],
                ['Concession', formatPercent(a.concession_percent)],
                ['Term', `${a.contract_years} yr`],
                ['Outcome', a.outcome]
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-dm-border bg-dm-bg/60 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-dm-muted font-semibold">{k}</div>
                  <div className="text-sm font-black text-dm-ink">{v}</div>
                </div>
              ))}
            </div>

            {a.outcome_reason && (
              <p className="mt-3 text-xs text-dm-muted flex items-start gap-2">
                <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {a.outcome_reason}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
