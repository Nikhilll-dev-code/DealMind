import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Header from './components/Header';
import OverviewDashboard from './components/OverviewDashboard';
import NewNegotiation from './components/NewNegotiation';
import DealWorkspace from './components/DealWorkspace';
import DealsList from './components/DealsList';
import MemoryExplorer from './components/MemoryExplorer';
import LearningTimeline from './components/LearningTimeline';
import DemoScreen from './components/DemoScreen';
import SettingsView from './components/SettingsView';

import { 
  getHealth, 
  getNegotiations, 
  getMemories, 
  analyzeNegotiation, 
  recordOutcome, 
  resetDemo,
  getLearningTimeline 
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [health, setHealth] = useState(null);
  const [negotiations, setNegotiations] = useState([]);
  const [memories, setMemories] = useState([]);
  const [timeline, setTimeline] = useState([]);
  
  // Current active deal state
  const [currentDeal, setCurrentDeal] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initial load
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
      const [h, negs, mems, tl] = await Promise.all([
        getHealth().catch(() => ({ status: 'error' })),
        getNegotiations().catch(() => []),
        getMemories().catch(() => []),
        getLearningTimeline().catch(() => [])
      ]);
      setHealth(h);
      setNegotiations(Array.isArray(negs) ? negs : []);
      setMemories(Array.isArray(mems) ? mems : []);
      setTimeline(Array.isArray(tl) ? tl : []);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const handleRunAnalysis = async (dealData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeNegotiation(dealData);
      setAnalysis(result);
      setCurrentDeal(result.deal || dealData);
      setActiveTab('deal-workspace');
      return result;
    } catch (err) {
      setError(err.message || 'Analysis failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDealForAnalysis = (deal) => {
    const formatted = {
      customer: deal.customer,
      segment: deal.segment || 'enterprise',
      industry: deal.industry || 'technology',
      dealValue: Number(deal.initialOffer || deal.initial_offer || 100000),
      objection: deal.objection || 'Price is too high',
      initialOffer: Number(deal.initialOffer || deal.initial_offer || 100000),
      counterOffer: Number(deal.counterOffer || deal.counter_offer || 80000),
      requestedDiscountPercent: Number(deal.requestedDiscountPercent || deal.requested_discount_percent || 20),
      competitorPressure: deal.competitorPressure ?? deal.competitor_pressure ?? true,
      contractYears: Number(deal.contractYears || deal.contract_years || 1),
      dealId: deal.deal_id || deal.dealId
    };
    handleRunAnalysis(formatted);
  };

  const handleRecordOutcomeQuick = async (outcomeType, notes) => {
    if (!currentDeal) return;
    try {
      const dealId = currentDeal.dealId || currentDeal.deal_id || 'DEAL-003';
      await recordOutcome(dealId, {
        outcome: outcomeType,
        chosenStrategy: currentDeal.chosenStrategy || '8% discount + premium support',
        outcomeReason: notes || `Negotiation completed with ${outcomeType} outcome.`,
        finalPrice: Number(currentDeal.counterOffer || currentDeal.dealValue || 92000)
      });
      await refreshData();
      setActiveTab('learning-timeline');
    } catch (err) {
      console.error('Failed to record outcome:', err);
    }
  };

  const handleResetDemoData = async () => {
    try {
      await resetDemo();
      await refreshData();
      setAnalysis(null);
      setCurrentDeal(null);
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0d121c] text-slate-100 overflow-hidden font-sans">
      {/* Simplified Left Navigation Bar */}
      <Navbar 
        activeTab={activeTab} 
        onSelectTab={setActiveTab} 
        negotiationsCount={negotiations.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Header 
          activeTab={activeTab}
          currentDeal={currentDeal}
          onNewNegotiation={() => setActiveTab('new-negotiation')}
          onStartDemo={() => setActiveTab('demo')}
          onOpenSettings={() => setActiveTab('settings')}
        />

        <main className="flex-1 overflow-y-auto min-w-0 bg-[#0d121c]">
          {activeTab === 'dashboard' && (
            <OverviewDashboard 
              negotiations={negotiations}
              memories={memories}
              onAnalyzeDeal={handleSelectDealForAnalysis}
              onNewNegotiation={() => setActiveTab('new-negotiation')}
              onStartDemo={() => setActiveTab('demo')}
            />
          )}

          {activeTab === 'new-negotiation' && (
            <NewNegotiation 
              onRunAnalysis={handleRunAnalysis}
              loading={loading}
            />
          )}

          {activeTab === 'deal-workspace' && (
            <DealWorkspace 
              currentDeal={currentDeal}
              analysis={analysis}
              onNewNegotiation={() => setActiveTab('new-negotiation')}
              onRecordOutcomeQuick={handleRecordOutcomeQuick}
              onOutcomeRecorded={refreshData}
              onRefreshData={refreshData}
            />
          )}

          {activeTab === 'deals-list' && (
            <DealsList 
              onAnalyzeDeal={handleSelectDealForAnalysis}
            />
          )}

          {activeTab === 'memory-explorer' && (
            <MemoryExplorer />
          )}

          {activeTab === 'learning-timeline' && (
            <LearningTimeline 
              timeline={timeline}
              onRefresh={refreshData}
            />
          )}

          {activeTab === 'demo' && (
            <DemoScreen 
              onFinishDemo={() => setActiveTab('dashboard')}
              onRefreshGlobalData={refreshData}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView 
              health={health}
              onResetDemo={handleResetDemoData}
            />
          )}
        </main>
      </div>
    </div>
  );
}
