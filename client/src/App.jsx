import React, { useEffect, useState, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { RouteProvider, useRouter } from './context/RouteContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import AppShell from './components/layout/AppShell';
import AppLayout from './components/layout/AppLayout';

// Public
import PublicLandingView from './views/PublicLandingView';
import LoginView from './views/LoginView';
import SignupView from './views/SignupView';

// ── Sales Representative workspace (primary product) ────────────────
import DashboardView from './views/DashboardView';
import NegotiationsView from './views/NegotiationsView';
import NewNegotiationView from './views/NewNegotiationView';
import DealWorkspaceView from './views/DealWorkspaceView';
import ApprovalsView from './views/ApprovalsView';
import MemoryExplorerView from './views/MemoryExplorerView';
import SalesMemoryView from './views/SalesMemoryView';
import LearningTimelineView from './views/LearningTimelineView';
import AgentActivityView from './views/AgentActivityView';
import InfrastructureView from './views/InfrastructureView';
import SettingsView from './views/SettingsView';
// ── Admin console ───────────────────────────────────────────────────
import AdminOverviewView from './views/admin/AdminOverviewView';
import AdminNegotiationsView from './views/admin/AdminNegotiationsView';
import AdminDatasetView from './views/admin/AdminDatasetView';
import AdminStrategiesView from './views/admin/AdminStrategiesView';
import AdminAnalyticsView from './views/admin/AdminAnalyticsView';
import AdminGuardrailsView from './views/admin/AdminGuardrailsView';
import AdminUsersView from './views/admin/AdminUsersView';
import AdminAuditView from './views/admin/AdminAuditView';

// ── Legacy customer app (secondary, retained for compatibility) ─────
import CustomerOverviewView from './views/customer/CustomerOverviewView';
import CustomerNewNegotiationView from './views/customer/CustomerNewNegotiationView';
import CustomerNegotiationsView from './views/customer/CustomerNegotiationsView';
import CustomerNegotiationView from './views/customer/CustomerNegotiationView';
import CustomerAgreementsView from './views/customer/CustomerAgreementsView';
import CustomerProfileView from './views/customer/CustomerProfileView';

import {
  LayoutDashboard, Briefcase, FileStack, Database, FlaskConical,
  SlidersHorizontal, BarChart3, ShieldCheck, Users, ScrollText, Settings,
  Handshake, UserCircle, Activity, Server, GitCommit, ArrowRightLeft,
  MessageSquareReply, Scale, Building2, Layers, Cpu, Radio, Gauge
} from 'lucide-react';
import { PERMISSIONS, hasPermission } from './lib/permissions';
import {
  getHealth, getNegotiations, getMemories, getApprovals,
  analyzeNegotiation, createNegotiation, recordOutcome, getLearningTimeline
} from './services/api';

function Splash() {
  return (
    <div className="min-h-screen bg-dm-bg flex items-center justify-center">
      <div className="w-10 h-10 border-[3px] border-dm-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Sales Representative workspace ──────────────────────────────────
function SalesApp() {
  const { pathname, searchParams, navigate } = useRouter();
  const { tenantId } = useAuth();
  const toast = useToast();

  const [health, setHealth] = useState(null);
  const [negotiations, setNegotiations] = useState([]);
  const [memories, setMemories] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [timeline, setTimeline] = useState([]);

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

  useEffect(() => { refreshGlobalData(); }, [refreshGlobalData]);

  const handleRunAnalysis = useCallback(async (dealData) => {
    const targetId = dealData.dealId || dealData.deal_id || `DEAL-${Date.now()}`;
    const payloadWithId = { ...dealData, dealId: targetId };

    // Eagerly set current deal and navigate immediately so UI responds in 0ms!
    setCurrentDeal(payloadWithId);
    navigate(`/deals/${encodeURIComponent(targetId)}`);
    setAnalysisLoading(true);

    try {
      // Persist deal in background without blocking
      createNegotiation(payloadWithId).catch(() => {});

      const result = await analyzeNegotiation(payloadWithId);
      setAnalysis(result);

      const dealObj = result.deal || payloadWithId;
      const outcome = dealData.outcome || dealObj.outcome || 'PENDING';
      const updatedDeal = { ...dealObj, ...payloadWithId, outcome, dealId: targetId };
      setCurrentDeal(updatedDeal);

      refreshGlobalData().catch(() => {});
      toast.success('Analysis complete', `Generated a grounded recommendation for ${dealData.customer}.`);
      return result;
    } catch (err) {
      toast.error('Analysis failed', err.message);
      console.error(err);
    } finally {
      setAnalysisLoading(false);
    }
  }, [navigate, refreshGlobalData, toast]);

  const handleSelectDealForAnalysis = useCallback((deal) => {
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
      dealId: deal.deal_id || deal.dealId,
      outcome: deal.outcome || null
    };
    handleRunAnalysis(formatted);
  }, [handleRunAnalysis]);

  const handleRecordOutcomeQuick = useCallback(async (outcomeType, notes) => {
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
      toast.success('Outcome retained', 'Deal experience retained in Hindsight long-term memory.');
      navigate('/learning');
    } catch (err) {
      toast.error('Failed to record outcome', err.message);
      console.error(err);
    }
  }, [currentDeal, navigate, refreshGlobalData, toast]);

  // Deep-link recovery: if the user refreshes on /deals/:id, reload the deal.
  useEffect(() => {
    if (!pathname.startsWith('/deals/')) return;
    const id = decodeURIComponent(pathname.slice('/deals/'.length).split('?')[0]);
    if (currentDeal && (currentDeal.dealId === id || currentDeal.deal_id === id || String(currentDeal.id) === id)) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await getNegotiations(tenantId);
        const deal = (Array.isArray(list) ? list : []).find(d => (d.deal_id || d.dealId) === id || String(d.id) === id);
        if (deal && !cancelled) handleSelectDealForAnalysis(deal);
      } catch (e) { /* noop */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, currentDeal?.dealId, currentDeal?.deal_id, tenantId]);

  // Contextual intelligence: open a tool for the active deal, or pick one first.
  const openTool = useCallback((tab) => {
    const id = currentDeal?.dealId || currentDeal?.deal_id;
    if (id) {
      navigate(`/deals/${encodeURIComponent(id)}?tab=${tab}`);
    } else {
      toast.info('Select a deal', 'Open a negotiation to use contextual intelligence tools.');
      navigate('/negotiations');
    }
  }, [currentDeal, navigate, toast]);

  const activeDealId = currentDeal?.dealId || currentDeal?.deal_id || null;
  const activeTool = pathname.startsWith('/deals/') ? (searchParams.get('tab') || 'overview') : null;

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
      return <NegotiationsView negotiations={negotiations} onAnalyzeDeal={handleSelectDealForAnalysis} />;
    }
    if (pathname === '/negotiations/new') {
      return <NewNegotiationView onRunAnalysis={handleRunAnalysis} loading={analysisLoading} />;
    }
    if (pathname.startsWith('/deals/')) {
      return (
        <DealWorkspaceView
          currentDeal={currentDeal}
          analysis={analysis}
          initialTab={searchParams.get('tab') || undefined}
          onRecordOutcomeQuick={handleRecordOutcomeQuick}
          onOutcomeRecorded={refreshGlobalData}
          onRefreshData={refreshGlobalData}
        />
      );
    }
    if (pathname === '/approvals') {
      return <ApprovalsView onRefreshGlobal={refreshGlobalData} />;
    }
    if (pathname === '/memory') {
      // Sales Rep Organizational Memory: business learning cards (spec §12, §37).
      // The technical dual-store explorer remains an Admin-only view (/admin/memory).
      return <SalesMemoryView />;
    }
    if (pathname === '/learning') {
      return <LearningTimelineView />;
    }
    if (pathname === '/analytics') {
      return <AdminAnalyticsView />;
    }
    if (pathname === '/queue' || pathname === '/opportunities') {
      return <NegotiationsView negotiations={negotiations.filter(d => d.outcome === 'PENDING')} onAnalyzeDeal={handleSelectDealForAnalysis} />;
    }
    if (pathname === '/agent-activity') {
      return <AgentActivityView agentTrace={analysis?.agentTrace || []} currentDeal={currentDeal} />;
    }
    if (pathname === '/profile' || pathname === '/settings') {
      return <SettingsView health={health} onResetDemoGlobal={refreshGlobalData} />;
    }
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
      activeDealId={activeDealId}
      activeTool={activeTool}
      pendingApprovalsCount={approvals.length}
      onOpenTool={openTool}
    >
      {renderRouteView()}
    </AppLayout>
  );
}

// ── Admin console ───────────────────────────────────────────────────
function AdminApp() {
  const { pathname, navigate } = useRouter();
  const { role, hasRole } = useAuth();

  const can = (perm) => hasRole(['ADMIN']) || hasPermission(role, perm);

  const sections = [
    {
      label: 'CONTROL',
      items: [
        { path: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
        { path: '/admin/negotiations', label: 'Negotiations', icon: Briefcase },
        { path: '/admin/approvals', label: 'Approvals', icon: ShieldCheck, show: hasRole(['ADMIN']) },
        { path: '/admin/users', label: 'Users', icon: Users, show: can(PERMISSIONS.USERS_MANAGE) }
      ]
    },
    {
      label: 'INTELLIGENCE',
      items: [
        { path: '/admin/memory', label: 'Organizational Memory', icon: Database, show: can(PERMISSIONS.MEMORY_VIEW) },
        { path: '/admin/hindsight', label: 'Hindsight Activity', icon: Radio, show: can(PERMISSIONS.INFRASTRUCTURE_VIEW) },
        { path: '/admin/analytics', label: 'Analytics', icon: BarChart3, show: can(PERMISSIONS.ANALYTICS_VIEW) }
      ]
    },
    {
      label: 'DATA',
      items: [
        { path: '/admin/dataset', label: 'Dataset Upload', icon: FileStack, show: can(PERMISSIONS.DATASET_VIEW) }
      ]
    },
    {
      label: 'GOVERNANCE',
      items: [
        { path: '/admin/guardrails', label: 'Guardrails', icon: ShieldCheck, show: can(PERMISSIONS.GUARDRAILS_VIEW) },
        { path: '/admin/audit', label: 'Audit', icon: ScrollText, show: can(PERMISSIONS.AUDIT_VIEW) }
      ]
    },
    {
      label: 'RELIABILITY',
      items: [
        { path: '/admin/agent-activity', label: 'Agent Activity', icon: Activity },
        { path: '/admin/infrastructure', label: 'Infrastructure Health', icon: Server }
      ]
    },
    {
      label: 'SETTINGS',
      items: [
        { path: '/admin/settings', label: 'Organization Settings', icon: Settings }
      ]
    }
  ].map(section => ({
    ...section,
    items: section.items.filter(item => item.show === undefined || item.show)
  }));

  const valid = pathname === '/admin' || pathname.startsWith('/admin/');
  useEffect(() => {
    if (!valid) navigate('/admin', { replace: true });
  }, [valid, navigate]);

  const render = () => {
    if (pathname === '/admin') return <AdminOverviewView />;
    if (pathname === '/admin/negotiations') return <AdminNegotiationsView />;
    if (pathname === '/admin/approvals') return <ApprovalsView onRefreshGlobal={() => {}} />;
    if (pathname === '/admin/users') return <AdminUsersView />;
    if (pathname === '/admin/memory') return <MemoryExplorerView />;
    if (pathname === '/admin/hindsight') return <InfrastructureView />;
    if (pathname === '/admin/analytics') return <AdminAnalyticsView />;
    if (pathname === '/admin/dataset' || pathname === '/admin/data-quality') return <AdminDatasetView />;
    if (pathname === '/admin/guardrails') return <AdminGuardrailsView />;
    if (pathname === '/admin/audit') return <AdminAuditView />;
    if (pathname === '/admin/agent-activity') return <AgentActivityView />;
    if (pathname === '/admin/infrastructure' || pathname === '/admin/outbox' || pathname === '/admin/telemetry') return <InfrastructureView />;
    if (pathname === '/admin/settings' || pathname === '/admin/settings/system') return <SettingsView health={null} onResetDemoGlobal={() => {}} />;
    return <AdminOverviewView />;
  };

  return (
    <AppShell
      sections={sections}
      homePath="/admin"
      brandLabel="DealMind"
      brandSub="Admin Console"
      topbarTitle="Company Intelligence Console"
    >
      {render()}
    </AppShell>
  );
}

// ── Legacy customer app (secondary) ─────────────────────────────────
function CustomerApp() {
  const { pathname, navigate } = useRouter();

  const sections = [
    {
      label: 'NEGOTIATE',
      items: [
        { path: '/customer', label: 'Overview', icon: LayoutDashboard, exact: true },
        { path: '/customer/negotiations/new', label: 'New Negotiation', icon: FileStack, highlight: true },
        { path: '/customer/negotiations', label: 'My Negotiations', icon: Briefcase }
      ]
    },
    {
      label: 'RESULTS',
      items: [
        { path: '/customer/agreements', label: 'Agreements', icon: Handshake },
        { path: '/customer/profile', label: 'Profile', icon: UserCircle }
      ]
    }
  ];

  const valid = pathname === '/customer' || pathname.startsWith('/customer/');

  useEffect(() => {
    if (!valid) navigate('/customer', { replace: true });
  }, [valid, navigate]);

  const match = pathname.match(/^\/customer\/negotiations\/([^/]+)$/);

  const render = () => {
    if (pathname === '/customer') return <CustomerOverviewView />;
    if (pathname === '/customer/negotiations/new') return <CustomerNewNegotiationView />;
    if (pathname === '/customer/negotiations') return <CustomerNegotiationsView />;
    if (match) return <CustomerNegotiationView dealId={decodeURIComponent(match[1])} />;
    if (pathname === '/customer/agreements') return <CustomerAgreementsView />;
    if (pathname === '/customer/profile') return <CustomerProfileView />;
    return <CustomerOverviewView />;
  };

  return (
    <AppShell
      sections={sections}
      homePath="/customer"
      brandLabel="DealMind"
      brandSub="Customer Portal"
      topbarTitle="Customer Portal"
    >
      {render()}
    </AppShell>
  );
}

// ── Root router ─────────────────────────────────────────────────────
function MainRouter() {
  const { pathname } = useRouter();
  const { isAuthenticated, loading, roleFamily } = useAuth();

  // Public marketing + auth routes
  if (pathname === '/login') return <LoginView />;
  if (pathname === '/signup') return <SignupView />;

  if (loading) return <Splash />;

  if (!isAuthenticated) {
    // Public visitors always land on the introduction site
    return <PublicLandingView />;
  }

  if (roleFamily === 'ADMIN') return <AdminApp />;
  if (roleFamily === 'CUSTOMER') return <CustomerApp />;
  return <SalesApp />;
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('DealMind UI Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dm-bg flex items-center justify-center p-6">
          <div className="bg-white border border-rose-200 rounded-3xl p-8 max-w-lg shadow-card text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">!</div>
            <h2 className="text-xl font-black text-dm-ink">Something went wrong</h2>
            <p className="text-xs text-dm-muted leading-relaxed">
              {this.state.error?.message || 'An unexpected UI error occurred.'}
            </p>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="px-5 py-2.5 rounded-xl bg-dm-blue text-white text-xs font-bold hover:bg-dm-deep transition"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <RouteProvider>
            <AuthProvider>
              <MainRouter />
            </AuthProvider>
          </RouteProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
