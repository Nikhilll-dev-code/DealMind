import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { RouteProvider, useRouter } from './context/RouteContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import AppLayout from './components/layout/AppLayout';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import NegotiationsView from './views/NegotiationsView';
import NewNegotiationView from './views/NewNegotiationView';
import DealWorkspaceView from './views/DealWorkspaceView';
import ApprovalsView from './views/ApprovalsView';
import MemoryExplorerView from './views/MemoryExplorerView';
import LearningTimelineView from './views/LearningTimelineView';
import AgentActivityView from './views/AgentActivityView';
import InfrastructureView from './views/InfrastructureView';
import SettingsView from './views/SettingsView';
import DemoView from './views/DemoView';

import { 
  getHealth, 
  getNegotiations, 
  getMemories, 
  getApprovals,
  analyzeNegotiation, 
  recordOutcome, 
  getLearningTimeline 
} from './services/api';

function MainRouter() {
  const { pathname, navigate } = useRouter();
  const { user, isAuthenticated, loading: authLoading, tenantId } = useAuth();
  const toast = useToast();

  const [health, setHealth] = useState(null);
  const [negotiations, setNegotiations] = useState([]);
  const [memories, setMemories] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [timeline, setTimeline] = useState([]);

  // Active Deal & Analysis state
  const [currentDeal, setCurrentDeal] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const refreshGlobalData = useCallback(async () => {
    try {
      const [h, negs, mems, apps, tl] = await Promise.all([
        getHealth().catch(() => ({ status: 'error' })),
        getNegotiations(tenantId).catch(() => []),
        getMemories('', '', '').catch(() => ({ memories: [] })),
        getApprovals(tenantId).catch(() => []),
        getLearningTimeline(tenantId).catch(() => [])
      ]);
      setHealth(h);
      setNegotiations(Array.isArray(negs) ? negs : []);
      setMemories(mems?.memories || (Array.isArray(mems) ? mems : []));
      setApprovals(Array.isArray(apps) ? apps : []);
      setTimeline(Array.isArray(tl) ? tl : []);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  }, [tenantId]);

  useEffect(() => {
    refreshGlobalData();
  }, [refreshGlobalData]);

  const handleRunAnalysis = async (dealData) => {
    setAnalysisLoading(true);
    try {
      const result = await analyzeNegotiation(dealData);
      setAnalysis(result);
      setCurrentDeal(result.deal || dealData);
      const targetId = result.deal?.dealId || result.deal?.deal_id || 'DEAL-NEW';
      navigate(`/deals/${encodeURIComponent(targetId)}`);
      toast.success('Analysis Complete', `Generated strategy recommendation for ${dealData.customer}.`);
      return result;
    } catch (err) {
      toast.error('Analysis Failed', err.message);
      console.error(err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleSelectDealForAnalysis = (deal) => {
    const formatted = {
      customer: deal.customer,
      segment: deal.segment || 'enterprise',
      industry: deal.industry || 'technology',
      dealValue: Number(deal.initialOffer || deal.initial_offer || 100000),
      objection: deal.objection || 'Price resistance',
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
      await refreshGlobalData();
      toast.success('Outcome Retained', `Deal experience retained in Hindsight long-term memory.`);
      navigate('/learning');
    } catch (err) {
      toast.error('Failed to Record Outcome', err.message);
      console.error(err);
    }
  };

  // If at login route, render standalone login view
  if (pathname === '/login') {
    return <LoginView />;
  }

  // Determine active view from pathname
  const renderRouteView = () => {
    if (pathname === '/dashboard' || pathname === '/') {
      return (
        <DashboardView
          negotiations={negotiations}
          memories={memories}
          pendingApprovals={approvals}
          timeline={timeline}
          onAnalyzeDeal={handleSelectDealForAnalysis}
        />
      );
    }

    if (pathname === '/negotiations') {
      return (
        <NegotiationsView
          negotiations={negotiations}
          onAnalyzeDeal={handleSelectDealForAnalysis}
        />
      );
    }

    if (pathname === '/negotiations/new') {
      return (
        <NewNegotiationView
          onRunAnalysis={handleRunAnalysis}
          loading={analysisLoading}
        />
      );
    }

    if (pathname.startsWith('/deals/')) {
      return (
        <DealWorkspaceView
          currentDeal={currentDeal}
          analysis={analysis}
          onRecordOutcomeQuick={handleRecordOutcomeQuick}
          onOutcomeRecorded={refreshGlobalData}
          onRefreshData={refreshGlobalData}
        />
      );
    }

    if (pathname === '/approvals') {
      return (
        <ApprovalsView
          onRefreshGlobal={refreshGlobalData}
        />
      );
    }

    if (pathname === '/memory') {
      return <MemoryExplorerView />;
    }

    if (pathname === '/learning') {
      return <LearningTimelineView />;
    }

    if (pathname === '/agent-activity') {
      return (
        <AgentActivityView
          agentTrace={analysis?.agentTrace || []}
          currentDeal={currentDeal}
        />
      );
    }

    if (pathname === '/infrastructure') {
      const canAccessInfra = user && (user.role === 'ADMIN' || user.role === 'MANAGER');
      if (!canAccessInfra) {
        return (
          <div className="p-12 text-center text-slate-400 space-y-3 max-w-md mx-auto mt-12">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto text-xl font-bold">
              🔒
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Access Restricted</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Infrastructure telemetry and outbox operations are restricted to Manager and Administrator roles.
            </p>
          </div>
        );
      }
      return <InfrastructureView />;
    }

    if (pathname === '/settings') {
      return (
        <SettingsView
          health={health}
          onResetDemoGlobal={refreshGlobalData}
        />
      );
    }

    if (pathname === '/demo') {
      return (
        <DemoView
          onRefreshGlobalData={refreshGlobalData}
        />
      );
    }

    // Default fallback
    return (
      <DashboardView
        negotiations={negotiations}
        memories={memories}
        pendingApprovals={approvals}
        timeline={timeline}
        onAnalyzeDeal={handleSelectDealForAnalysis}
      />
    );
  };

  return (
    <AppLayout
      currentDeal={currentDeal}
      pendingApprovalsCount={approvals.length}
    >
      {renderRouteView()}
    </AppLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <RouteProvider>
          <AuthProvider>
            <MainRouter />
          </AuthProvider>
        </RouteProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
