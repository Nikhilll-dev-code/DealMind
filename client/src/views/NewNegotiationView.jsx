import React, { useState } from 'react';
import { 
  PlusCircle, 
  Sparkles, 
  BrainCircuit, 
  Building2, 
  DollarSign, 
  AlertCircle 
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../components/common/Card';
import Button from '../components/common/Button';
import Input, { Select } from '../components/common/Input';

const DEMO_SCENARIO = {
  customer: 'Acme Corp',
  segment: 'enterprise',
  industry: 'technology',
  dealValue: 100000,
  objection: 'Price is too high compared to alternatives',
  initialOffer: 100000,
  counterOffer: 80000,
  requestedDiscountPercent: 20,
  competitorPressure: true,
  contractYears: 1
};

const INDUSTRIES = [
  'technology', 'software', 'automotive', 'finance', 
  'healthcare', 'manufacturing', 'retail', 'education', 'media', 'other'
];

const SEGMENTS = ['enterprise', 'mid-market', 'smb', 'startup', 'government'];

export default function NewNegotiationView({ onRunAnalysis, loading }) {
  const [formData, setFormData] = useState({
    customer: '',
    industry: 'technology',
    segment: 'enterprise',
    dealValue: '',
    initialOffer: '',
    counterOffer: '',
    requestedDiscountPercent: '',
    objection: '',
    competitorPressure: true,
    contractYears: 1
  });

  const [errors, setErrors] = useState({});

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleLoadDemo = () => {
    setFormData(DEMO_SCENARIO);
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
    const reqDiscount = formData.requestedDiscountPercent !== '' ? Number(formData.requestedDiscountPercent) : 20;

    onRunAnalysis({
      customer: formData.customer.trim(),
      industry: formData.industry,
      segment: formData.segment,
      dealValue: val,
      initialOffer: formData.initialOffer ? Number(formData.initialOffer) : val,
      counterOffer: formData.counterOffer ? Number(formData.counterOffer) : Math.round(val * (1 - reqDiscount / 100)),
      requestedDiscountPercent: reqDiscount,
      objection: formData.objection.trim() || 'Price resistance',
      competitorPressure: Boolean(formData.competitorPressure),
      contractYears: Number(formData.contractYears) || 1
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">New Negotiation Intake</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Submit negotiation parameters to ground recommendations in historical organizational memory.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={Sparkles}
          onClick={handleLoadDemo}
          className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
        >
          Load Demo Scenario
        </Button>
      </div>

      {/* Intake Form Card */}
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Customer Name *"
                placeholder="e.g. Acme Corp, Tesla"
                value={formData.customer}
                onChange={e => handleChange('customer', e.target.value)}
                error={errors.customer}
                required
              />

              <Select
                label="Industry"
                options={INDUSTRIES}
                value={formData.industry}
                onChange={e => handleChange('industry', e.target.value)}
              />

              <Select
                label="Segment"
                options={SEGMENTS}
                value={formData.segment}
                onChange={e => handleChange('segment', e.target.value)}
              />
            </div>

            {/* Financial Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Deal Value ($) *"
                type="number"
                prefix="$"
                placeholder="100000"
                value={formData.dealValue}
                onChange={e => handleChange('dealValue', e.target.value)}
                error={errors.dealValue}
                required
              />

              <Input
                label="Initial List Offer ($)"
                type="number"
                prefix="$"
                placeholder="100000"
                value={formData.initialOffer}
                onChange={e => handleChange('initialOffer', e.target.value)}
              />

              <Input
                label="Customer Counteroffer ($)"
                type="number"
                prefix="$"
                placeholder="80000"
                value={formData.counterOffer}
                onChange={e => handleChange('counterOffer', e.target.value)}
              />
            </div>

            {/* Discount & Objection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Requested Discount (%)"
                type="number"
                suffix="%"
                placeholder="20"
                value={formData.requestedDiscountPercent}
                onChange={e => handleChange('requestedDiscountPercent', e.target.value)}
                error={errors.requestedDiscountPercent}
              />

              <Input
                label="Customer Objection"
                placeholder="e.g. Budget constraint, competitor quote is cheaper"
                value={formData.objection}
                onChange={e => handleChange('objection', e.target.value)}
              />
            </div>

            {/* Competitor Pressure & Contract Years */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Competitor Pressure Present
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: true, label: '⚡ Active Competitor' },
                    { val: false, label: '✓ No Competitor' }
                  ].map(opt => (
                    <button
                      type="button"
                      key={String(opt.val)}
                      onClick={() => handleChange('competitorPressure', opt.val)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                        formData.competitorPressure === opt.val
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Contract Term (Years)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(yr => (
                    <button
                      type="button"
                      key={yr}
                      onClick={() => handleChange('contractYears', yr)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                        formData.contractYears === yr
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                      }`}
                    >
                      {yr} {yr === 1 ? 'Year' : 'Years'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit CTA */}
            <div className="pt-2">
              <Button
                type="submit"
                loading={loading}
                variant="primary"
                size="lg"
                icon={BrainCircuit}
                className="w-full py-3"
              >
                {loading ? 'Recalling Memory & Analyzing Deal...' : 'ANALYZE NEGOTIATION WITH AI AGENT →'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
