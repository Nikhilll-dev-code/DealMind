import React, { useState } from 'react';
import { 
  Building2, 
  Sparkles,
  BrainCircuit, 
  Info,
  DollarSign,
  Percent
} from 'lucide-react';

const DEMO_ACME_DEAL = {
  customer: 'Acme Corp',
  segment: 'enterprise',
  industry: 'technology',
  dealValue: 100000,
  objection: 'Price is too high compared to alternatives',
  initialOffer: 100000,
  counterOffer: 80000,
  requestedDiscountPercent: 20,
  competitorPressure: 'yes',
  contractYears: 1
};

const SEGMENTS = ['enterprise', 'mid-market', 'smb', 'startup', 'government'];
const INDUSTRIES = ['technology', 'software', 'automotive', 'finance', 'healthcare', 'manufacturing', 'retail', 'education', 'media', 'other'];

export default function NewNegotiation({ onRunAnalysis, loading }) {
  const [formData, setFormData] = useState({
    customer: '',
    industry: 'technology',
    segment: 'enterprise',
    dealValue: '',
    initialOffer: '',
    counterOffer: '',
    requestedDiscountPercent: '',
    objection: '',
    competitorPressure: 'unknown',
    contractYears: 1
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleLoadDemo = () => {
    setFormData({
      ...DEMO_ACME_DEAL
    });
    setErrors({});
  };

  const validate = () => {
    const errs = {};
    if (!formData.customer.trim()) errs.customer = 'Customer name is required';
    if (!formData.dealValue || Number(formData.dealValue) <= 0) errs.dealValue = 'Enter a valid deal value';
    if (formData.requestedDiscountPercent !== '' && (Number(formData.requestedDiscountPercent) < 0 || Number(formData.requestedDiscountPercent) > 100)) {
      errs.requestedDiscountPercent = 'Discount must be between 0% and 100%';
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const val = Number(formData.dealValue);
    const reqDiscount = formData.requestedDiscountPercent !== '' 
      ? Number(formData.requestedDiscountPercent) 
      : 20;

    const compPressure = formData.competitorPressure === 'yes' ? true 
      : formData.competitorPressure === 'no' ? false : false;

    onRunAnalysis({
      customer: formData.customer.trim(),
      industry: formData.industry,
      segment: formData.segment,
      dealValue: val,
      initialOffer: formData.initialOffer ? Number(formData.initialOffer) : val,
      counterOffer: formData.counterOffer ? Number(formData.counterOffer) : Math.round(val * (1 - reqDiscount / 100)),
      requestedDiscountPercent: reqDiscount,
      objection: formData.objection.trim() || 'Price objection',
      competitorPressure: compPressure,
      contractYears: Number(formData.contractYears) || 1
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Title & Subtitle */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">New Negotiation</h1>
          <p className="text-slate-400 text-sm mt-1">
            Enter the details of your current deal. DealMind will compare it with your organization's past negotiation experience.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLoadDemo}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Load Demo Scenario</span>
        </button>
      </div>

      {/* Main Intake Form */}
      <form onSubmit={handleSubmit} className="bg-[#161f2e] border border-[#20293a] rounded-3xl p-8 space-y-6 shadow-xl">
        {/* Customer / Industry / Segment */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Customer Name *</label>
            <input
              type="text"
              name="customer"
              value={formData.customer}
              onChange={handleChange}
              placeholder="e.g. Tesla, Acme Corp"
              className="w-full bg-[#101622] border border-[#243048] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
            />
            {errors.customer && <p className="text-rose-400 text-[11px] font-medium">{errors.customer}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Industry</label>
            <select
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              className="w-full bg-[#101622] border border-[#243048] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition capitalize"
            >
              {INDUSTRIES.map(ind => (
                <option key={ind} value={ind}>{ind.charAt(0).toUpperCase() + ind.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Segment</label>
            <select
              name="segment"
              value={formData.segment}
              onChange={handleChange}
              className="w-full bg-[#101622] border border-[#243048] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition capitalize"
            >
              {SEGMENTS.map(seg => (
                <option key={seg} value={seg}>{seg.charAt(0).toUpperCase() + seg.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Financials: Deal Value, Initial Offer, Counter Offer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Deal Value ($) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
              <input
                type="number"
                name="dealValue"
                value={formData.dealValue}
                onChange={handleChange}
                placeholder="500000"
                min="1"
                className="w-full bg-[#101622] border border-[#243048] rounded-xl pl-8 pr-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            {errors.dealValue && <p className="text-rose-400 text-[11px] font-medium">{errors.dealValue}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Initial Offer ($)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
              <input
                type="number"
                name="initialOffer"
                value={formData.initialOffer}
                onChange={handleChange}
                placeholder="500000"
                min="0"
                className="w-full bg-[#101622] border border-[#243048] rounded-xl pl-8 pr-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Customer Counteroffer ($)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
              <input
                type="number"
                name="counterOffer"
                value={formData.counterOffer}
                onChange={handleChange}
                placeholder="425000"
                min="0"
                className="w-full bg-[#101622] border border-[#243048] rounded-xl pl-8 pr-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Discount & Objection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Requested Discount (%)</label>
            <div className="relative">
              <input
                type="number"
                name="requestedDiscountPercent"
                value={formData.requestedDiscountPercent}
                onChange={handleChange}
                placeholder="15"
                min="0"
                max="100"
                className="w-full bg-[#101622] border border-[#243048] rounded-xl px-4 py-2.5 pr-8 text-sm text-white font-mono focus:outline-none focus:border-blue-500 transition"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">%</span>
            </div>
            {errors.requestedDiscountPercent && <p className="text-rose-400 text-[11px] font-medium">{errors.requestedDiscountPercent}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Customer Objection</label>
            <input
              type="text"
              name="objection"
              value={formData.objection}
              onChange={handleChange}
              placeholder="e.g. Budget constraints, alternative vendor is cheaper"
              className="w-full bg-[#101622] border border-[#243048] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Competitor Pressure & Contract Length */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Competitor Pressure</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'yes', label: '⚡ Yes' },
                { val: 'no', label: '✓ No' },
                { val: 'unknown', label: '? Unknown' }
              ].map(opt => (
                <button
                  type="button"
                  key={opt.val}
                  onClick={() => setFormData(prev => ({ ...prev, competitorPressure: opt.val }))}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                    formData.competitorPressure === opt.val
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                      : 'bg-[#101622] text-slate-400 border-[#243048] hover:border-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Contract Length</label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map(yr => (
                <button
                  type="button"
                  key={yr}
                  onClick={() => setFormData(prev => ({ ...prev, contractYears: yr }))}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                    Number(formData.contractYears) === yr
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                      : 'bg-[#101622] text-slate-400 border-[#243048] hover:border-slate-600'
                  }`}
                >
                  {yr} {yr === 1 ? 'Year' : 'Years'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-bold text-sm transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Comparing with Organizational Memory & Analyzing...</span>
              </>
            ) : (
              <>
                <BrainCircuit className="w-5 h-5" />
                <span>ANALYZE NEGOTIATION →</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
