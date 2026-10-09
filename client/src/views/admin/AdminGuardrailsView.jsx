import React, { useEffect, useState } from 'react';
import { ShieldCheck, Save, Percent, CalendarClock, AlertTriangle, Lock } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getGuardrails, updateGuardrails } from '../../services/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function AdminGuardrailsView() {
  const toast = useToast();
  const [g, setG] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGuardrails().then(setG).catch(err => toast.error('Failed to load guardrails', err.message)).finally(() => setLoading(false));
  }, []);

  const update = (key, value) => setG(prev => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await updateGuardrails({
        max_discount_percent: Number(g.max_discount_percent),
        manager_approval_threshold: Number(g.manager_approval_threshold),
        min_contract_years: Number(g.min_contract_years),
        max_contract_years: Number(g.max_contract_years),
        require_support_bundle_above: Number(g.require_support_bundle_above),
        escalation_message: g.escalation_message
      });
      setG(res.guardrails);
      toast.success('Guardrails saved', 'Company limits are now enforced server-side.');
    } catch (err) {
      toast.error('Save failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !g) {
    return <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8"><div className="h-64 rounded-2xl dm-shimmer animate-shimmer" /></div>;
  }

  const approvalAboveCeiling = Number(g.manager_approval_threshold) > Number(g.max_discount_percent);
  const termInvalid = Number(g.min_contract_years) > Number(g.max_contract_years);

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-7">
        <h1 className="text-2xl font-black tracking-tight text-dm-ink">Guardrails</h1>
        <p className="mt-1.5 text-sm text-dm-muted">
          Company negotiation limits. These are enforced in code — the AI cannot offer beyond them.
        </p>
      </div>

      <div className="bg-white border border-dm-border rounded-2xl shadow-card p-6 space-y-5">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-dm-tint/50 border border-dm-blue/20">
          <Lock className="w-4 h-4 text-dm-deep shrink-0 mt-0.5" />
          <p className="text-xs text-dm-deep leading-relaxed">
            Requests above the maximum discount are refused and escalated. Approval thresholds and support
            requirements are applied deterministically before any recommendation is produced.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Maximum discount (%)"
            type="number"
            icon={Percent}
            value={g.max_discount_percent}
            onChange={e => update('max_discount_percent', e.target.value)}
            min="0" max="100"
          />
          <Input
            label="Approval threshold (%)"
            type="number"
            icon={ShieldCheck}
            value={g.manager_approval_threshold}
            onChange={e => update('manager_approval_threshold', e.target.value)}
            min="0" max="100"
          />
        </div>

        {approvalAboveCeiling && (
          <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Approval threshold is above the maximum discount — approvals will rarely trigger.
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Minimum contract term (years)"
            type="number"
            icon={CalendarClock}
            value={g.min_contract_years}
            onChange={e => update('min_contract_years', e.target.value)}
            min="1" max="20"
          />
          <Input
            label="Maximum contract term (years)"
            type="number"
            icon={CalendarClock}
            value={g.max_contract_years}
            onChange={e => update('max_contract_years', e.target.value)}
            min="1" max="20"
          />
        </div>

        {termInvalid && (
          <div className="flex items-center gap-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Minimum term cannot exceed maximum term.
          </div>
        )}

        <Input
          label="Support bundle required above (%)"
          type="number"
          icon={ShieldCheck}
          value={g.require_support_bundle_above}
          onChange={e => update('require_support_bundle_above', e.target.value)}
          min="0" max="100"
          helperText="Above this discount, a value-add bundle should accompany the concession."
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-dm-ink">Escalation message</label>
          <textarea
            value={g.escalation_message}
            onChange={e => update('escalation_message', e.target.value)}
            rows={3}
            className="w-full bg-white border border-dm-border rounded-xl py-2.5 px-3 text-xs text-dm-ink focus:outline-none focus:border-dm-blue focus:ring-2 focus:ring-dm-blue/15 resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-dm-border">
          <span className="text-[11px] text-dm-muted">
            {g.updated_at ? `Last updated ${new Date(g.updated_at).toLocaleString()}${g.updated_by ? ` by ${g.updated_by}` : ''}` : 'Using default limits'}
          </span>
          <Button onClick={save} loading={saving} disabled={termInvalid}>
            <Save className="w-3.5 h-3.5" /> Save guardrails
          </Button>
        </div>
      </div>
    </div>
  );
}
