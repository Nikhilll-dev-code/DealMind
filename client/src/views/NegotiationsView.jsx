import React, { useState, useMemo } from 'react';
import { Briefcase, Search, PlusCircle, ChevronRight, ArrowUpDown } from 'lucide-react';
import { useRouter } from '../context/RouteContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { OutcomeBadge } from '../components/common/Badge';

export default function NegotiationsView({ negotiations = [], onAnalyzeDeal }) {
  const { navigate } = useRouter();
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('ALL');
  const [segmentFilter, setSegmentFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('date');

  const filteredDeals = useMemo(() => {
    return negotiations
      .filter(deal => {
        const matchesSearch = !search || 
          deal.customer?.toLowerCase().includes(search.toLowerCase()) ||
          (deal.deal_id || deal.dealId)?.toLowerCase().includes(search.toLowerCase()) ||
          deal.strategy?.toLowerCase().includes(search.toLowerCase());
        const matchesOutcome = outcomeFilter === 'ALL' || deal.outcome === outcomeFilter;
        const matchesSegment = segmentFilter === 'ALL' || deal.segment?.toLowerCase() === segmentFilter.toLowerCase();
        return matchesSearch && matchesOutcome && matchesSegment;
      })
      .sort((a, b) => {
        if (sortBy === 'value') {
          const valA = Number(a.initialOffer || a.initial_offer || 0);
          const valB = Number(b.initialOffer || b.initial_offer || 0);
          return valB - valA;
        }
        if (sortBy === 'customer') {
          return (a.customer || '').localeCompare(b.customer || '');
        }
        return new Date(b.date || 0) - new Date(a.date || 0);
      });
  }, [negotiations, search, outcomeFilter, segmentFilter, sortBy]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-500" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Negotiations Pipeline</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {negotiations.length} total negotiation records stored in tenant memory bank.
          </p>
        </div>

        <Button
          variant="primary"
          icon={PlusCircle}
          onClick={() => navigate('/negotiations/new')}
        >
          + New Negotiation
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-80">
            <Input
              placeholder="Search customer, deal ID, strategy..."
              icon={Search}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Outcome Filter */}
            <select
              value={outcomeFilter}
              onChange={e => setOutcomeFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Outcomes</option>
              <option value="WON">WON</option>
              <option value="LOST">LOST</option>
              <option value="PENDING">PENDING</option>
            </select>

            {/* Segment Filter */}
            <select
              value={segmentFilter}
              onChange={e => setSegmentFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Segments</option>
              <option value="enterprise">Enterprise</option>
              <option value="mid-market">Mid-Market</option>
              <option value="smb">SMB</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="date">Sort: Date (Recent)</option>
              <option value="value">Sort: Deal Value</option>
              <option value="customer">Sort: Customer</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Negotiations Table */}
      <Card className="overflow-hidden">
        {filteredDeals.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs italic">
            No negotiations matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/50 dark:bg-slate-950/40">
                  <th className="px-5 py-3 text-left">Deal ID</th>
                  <th className="px-5 py-3 text-left">Customer</th>
                  <th className="px-5 py-3 text-left">Segment</th>
                  <th className="px-5 py-3 text-left">Deal Value</th>
                  <th className="px-5 py-3 text-left">Discount</th>
                  <th className="px-5 py-3 text-left">Strategy</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Outcome</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDeals.map((deal) => {
                  const dealId = deal.deal_id || deal.dealId;
                  const dv = Number(deal.initialOffer || deal.initial_offer || 100000);
                  const disc = Number(deal.requestedDiscountPercent || deal.requested_discount_percent || deal.concessionPercent || 20);

                  return (
                    <tr
                      key={dealId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {dealId}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {deal.customer}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 capitalize">
                        {deal.segment}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                        ${dv.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-rose-500">
                        {disc}%
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 max-w-44 truncate">
                        {deal.strategy || 'Standard'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 font-mono">
                        {deal.date}
                      </td>
                      <td className="px-5 py-3.5">
                        <OutcomeBadge outcome={deal.outcome} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAnalyzeDeal(deal)}
                          className="group-hover:bg-indigo-600 group-hover:text-white transition"
                        >
                          Analyze <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
