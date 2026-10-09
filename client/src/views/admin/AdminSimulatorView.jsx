import React, { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { getNegotiations } from '../../services/api';
import WhatIfSimulator from '../../components/WhatIfSimulator';

export default function AdminSimulatorView() {
  const [deals, setDeals] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNegotiations()
      .then(d => {
        const list = Array.isArray(d) ? d : [];
        setDeals(list);
        if (list.length > 0) setSelectedId(list[0].deal_id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const deal = deals.find(d => d.deal_id === selectedId);

  const currentDeal = deal ? {
    dealId: deal.deal_id,
    customer: deal.customer,
    segment: deal.segment,
    dealValue: Number(deal.initial_offer) || 100000,
    initialOffer: Number(deal.initial_offer) || 100000,
    requestedDiscountPercent: Number(deal.requested_discount_percent) || 20,
    contractYears: Number(deal.contract_years) || 1
  } : null;

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-7">
        <h1 className="text-2xl font-black tracking-tight text-dm-ink flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-dm-blue" /> What-If Simulator
        </h1>
        <p className="mt-1.5 text-sm text-dm-muted">Model discount, term, and support independently against a real negotiation.</p>
      </div>

      {loading ? (
        <div className="h-40 rounded-2xl dm-shimmer animate-shimmer" />
      ) : deals.length === 0 ? (
        <div className="bg-white border border-dashed border-dm-border rounded-2xl p-10 text-center text-xs text-dm-muted">
          No negotiations available to simulate.
        </div>
      ) : (
        <>
          <div className="mb-5 max-w-md">
            <label className="block text-xs font-bold text-dm-ink mb-1.5">Select negotiation</label>
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
              className="w-full bg-white border border-dm-border rounded-xl py-2.5 px-3 text-xs text-dm-ink focus:outline-none focus:border-dm-blue">
              {deals.map(d => <option key={d.deal_id} value={d.deal_id}>{d.customer} · {d.deal_id} · ${Number(d.initial_offer).toLocaleString()}</option>)}
            </select>
          </div>

          {currentDeal && <WhatIfSimulator currentDeal={currentDeal} />}
        </>
      )}
    </div>
  );
}
