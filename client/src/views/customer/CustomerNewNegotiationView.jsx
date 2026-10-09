import React, { useState, useEffect } from 'react';
import { Package, DollarSign, Percent, CalendarClock, MessageSquare, Swords, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { useRouter } from '../../context/RouteContext';
import { useToast } from '../../context/ToastContext';
import { startCustomerNegotiation, getCustomerGuardrails } from '../../services/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import IntelligenceTrace from '../../components/customer/IntelligenceTrace';

export default function CustomerNewNegotiationView() {
  const { navigate } = useRouter();
  const toast = useToast();

  const [form, setForm] = useState({
    product: 'Enterprise Platform',
    dealValue: 100000,
    requestedDiscountPercent: 15,
    contractYears: 2,
    segment: 'enterprise',
    industry: 'technology',
    objection: 'Pricing is higher than competing alternatives',
    competitorPressure: true,
    requirements: ''
  });
  const [guardrails, setGuardrails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [escalation, setEscalation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCustomerGuardrails().then(setGuardrails).catch(() => {});
  }, []);

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const discountAboveCeiling = guardrails && Number(form.requestedDiscountPercent) > guardrails.max_discount_percent;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setEscalation(null);
    setLoading(true);
    try {
      const res = await startCustomerNegotiation({
        product: form.product,
        dealValue: Number(form.dealValue),
        requestedDiscountPercent: Number(form.requestedDiscountPercent),
        contractYears: Number(form.contractYears),
        segment: form.segment,
        industry: form.industry,
        objection: form.objection || form.requirements,
        competitorPressure: Boolean(form.competitorPressure)
      });

      if (res.escalated) {
        setEscalation(res);
        toast.info?.('Escalated', res.message) || toast.success('Escalated', res.message);
        return;
      }

      toast.success('Negotiation ready', `DealMind prepared a grounded recommendation.`);
      navigate(`/customer/negotiations/${encodeURIComponent(res.deal.deal_id)}`);
    } catch (err) {
      setError(err.message || 'Could not start the negotiation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-7">
        <h1 className="text-2xl font-black tracking-tight text-dm-ink">Start a new negotiation</h1>
        <p className="mt-1.5 text-sm text-dm-muted">
          Tell DealMind what you're buying. It will retrieve comparable history, check company guardrails,
          and prepare an evidence-grounded counteroffer.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <form onSubmit={submit} className="lg:col-span-3 bg-white border border-dm-border rounded-2xl shadow-card p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          <Input
            label="Product or service *"
            type="text"
            icon={Package}
            value={form.product}
            onChange={e => update('product', e.target.value)}
            placeholder="Enterprise Platform"
            required
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Deal value ($) *"
              type="number"
              icon={DollarSign}
              value={form.dealValue}
              onChange={e => update('dealValue', e.target.value)}
              min="1"
              required
            />
            <Input
              label="Requested discount (%) *"
              type="number"
              icon={Percent}
              value={form.requestedDiscountPercent}
              onChange={e => update('requestedDiscountPercent', e.target.value)}
              min="0"
              max="100"
              required
            />
          </div>

          {discountAboveCeiling && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Your request of {form.requestedDiscountPercent}% is above the company maximum of {guardrails.max_discount_percent}%.
                It may be escalated rather than offered directly.
              </span>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Contract duration (years) *"
              type="number"
              icon={CalendarClock}
              value={form.contractYears}
              onChange={e => update('contractYears', e.target.value)}
              min="1"
              max="10"
              required
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-dm-ink">Segment</label>
              <select
                value={form.segment}
                onChange={e => update('segment', e.target.value)}
                className="w-full bg-white border border-dm-border rounded-xl py-2.5 px-3 text-xs text-dm-ink focus:outline-none focus:border-dm-blue focus:ring-2 focus:ring-dm-blue/15"
              >
                <option value="enterprise">Enterprise</option>
                <option value="mid-market">Mid-market</option>
                <option value="smb">SMB</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-dm-ink">Primary objection</label>
            <div className="relative">
              <MessageSquare className="absolute left-3.5 top-2.5 w-4 h-4 text-dm-muted" />
              <textarea
                value={form.objection}
                onChange={e => update('objection', e.target.value)}
                rows={2}
                className="w-full bg-white border border-dm-border rounded-xl py-2.5 pl-9 pr-3 text-xs text-dm-ink focus:outline-none focus:border-dm-blue focus:ring-2 focus:ring-dm-blue/15 resize-none"
                placeholder="Price is higher than competing alternatives"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-dm-ink">Additional requirements (optional)</label>
            <textarea
              value={form.requirements}
              onChange={e => update('requirements', e.target.value)}
              rows={2}
              className="w-full bg-white border border-dm-border rounded-xl py-2.5 px-3 text-xs text-dm-ink focus:outline-none focus:border-dm-blue focus:ring-2 focus:ring-dm-blue/15 resize-none"
              placeholder="Onboarding, dedicated support, security review..."
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.competitorPressure}
              onChange={e => update('competitorPressure', e.target.checked)}
              className="w-4 h-4 rounded border-dm-border text-dm-blue focus:ring-dm-blue"
            />
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-dm-ink">
              <Swords className="w-3.5 h-3.5 text-dm-muted" /> Competing alternatives or pressure
            </span>
          </label>

          <div className="pt-1">
            <Button type="submit" loading={loading} size="lg" className="w-full">
              {loading ? 'Preparing recommendation…' : 'Start negotiation'}
            </Button>
          </div>
        </form>

        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-dm-border rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-2 mb-3.5">
              <Sparkles className="w-4 h-4 text-dm-blue" />
              <h2 className="text-sm font-bold text-dm-ink">DealMind Intelligence</h2>
            </div>
            <IntelligenceTrace running={loading} compact />
            <p className="mt-3.5 text-[11px] text-dm-muted leading-relaxed">
              A safe, high-level view of what DealMind is doing. Internal reasoning and configuration stay private.
            </p>
          </div>

          {guardrails && (
            <div className="bg-dm-tint/50 border border-dm-blue/20 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-dm-deep mb-3">Company guardrails</h2>
              <dl className="space-y-2 text-xs">
                {[
                  ['Maximum discount', `${guardrails.max_discount_percent}%`],
                  ['Approval threshold', `${guardrails.manager_approval_threshold}%`],
                  ['Allowed term', `${guardrails.min_contract_years}–${guardrails.max_contract_years} years`]
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <dt className="text-dm-muted">{k}</dt>
                    <dd className="font-bold text-dm-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {escalation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-dm-ink/30 backdrop-blur-sm" onClick={() => setEscalation(null)} />
          <div className="relative bg-white rounded-2xl border border-dm-border shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-black text-dm-ink">Escalated for review</h3>
            <p className="mt-2 text-sm text-dm-muted leading-relaxed">{escalation.message}</p>
            {escalation.guardrails?.violations?.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {escalation.guardrails.violations.map((v, i) => (
                  <li key={i} className="text-xs text-amber-700 flex gap-2"><span>•</span>{v}</li>
                ))}
              </ul>
            )}
            <div className="mt-6 flex gap-2">
              <Button onClick={() => setEscalation(null)} variant="outline" className="flex-1">Adjust request</Button>
              <Button onClick={() => navigate('/customer/negotiations')} className="flex-1">View negotiations</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
