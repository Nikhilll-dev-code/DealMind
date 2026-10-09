import React from 'react';
import {
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  ShieldCheck,
  Database,
  History,
  Activity,
  Settings,
  X,
  BrainCircuit,
  Building2,
  UserCircle,
  BarChart3,
  GitCommit,
  ArrowRightLeft,
  SlidersHorizontal,
  FlaskConical,
  MessageSquareReply,
  Scale,
  ListChecks,
  Sparkles
} from 'lucide-react';
import { useRouter } from '../../context/RouteContext';
import { useAuth } from '../../context/AuthContext';

export default function MobileDrawer({
  isOpen,
  onClose,
  activeDeal = null,
  activeDealId = null,
  activeTool = null,
  onOpenTool = null
}) {
  const { pathname, navigate } = useRouter();
  const { user, hasRole, tenantId } = useAuth();

  if (!isOpen) return null;

  const handleNav = (path) => {
    navigate(path);
    onClose();
  };

  const handleTool = (tool) => {
    onClose();
    if (onOpenTool) onOpenTool(tool);
    else navigate('/negotiations');
  };

  const sections = [
    {
      label: 'WORKSPACE',
      items: [
        { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
        { path: '/negotiations', label: 'Deals', icon: Briefcase },
        { path: '/negotiations/new', label: 'New Deal', icon: PlusCircle, highlight: true },
        { path: '/queue', label: 'Negotiation Queue', icon: ListChecks },
        { path: '/approvals', label: 'Approvals', icon: ShieldCheck, roleRequired: ['ADMIN'] }
      ]
    },
    {
      label: 'INTELLIGENCE',
      items: [
        { tool: 'overview', label: 'Deal Intelligence', icon: BrainCircuit },
        { tool: 'give-get', label: 'Give-Get Intelligence', icon: ArrowRightLeft },
        { tool: 'what-if', label: 'What-If Simulator', icon: SlidersHorizontal },
        { tool: 'strategies', label: 'Strategy Lab', icon: FlaskConical },
        { tool: 'counteroffer', label: 'Counteroffer Advisor', icon: MessageSquareReply },
        { tool: 'evidence', label: 'Evidence Bank', icon: Database },
        { tool: 'conflict-matrix', label: 'Conflict Matrix', icon: Scale },
        { tool: 'customer', label: 'Customer Profiles', icon: Building2 },
        { tool: 'trace', label: 'Agent Trace', icon: Activity }
      ]
    },
    {
      label: 'LEARNING',
      items: [
        { tool: 'lineage', label: 'Negotiation Patterns', icon: GitCommit },
        { path: '/memory', label: 'Organizational Memory', icon: Database },
        { path: '/learning', label: 'Negotiation Replay', icon: History }
      ]
    },
    {
      label: 'INSIGHTS',
      items: [
        { path: '/opportunities', label: 'Opportunities', icon: Sparkles }
      ]
    },
    {
      label: 'ACCOUNT',
      items: [
        { path: '/profile', label: 'Profile', icon: UserCircle }
      ]
    }
  ];

  const isActive = (item) => {
    if (item.tool) return pathname.startsWith('/deals') && activeTool === item.tool;
    return pathname === item.path;
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Body */}
      <div className="relative w-72 max-w-[80vw] bg-white dark:bg-slate-900 border-r border-dm-border dark:border-slate-800 h-full flex flex-col justify-between p-4 z-10 shadow-2xl animate-in slide-in-from-left duration-200">
        <div className="space-y-4 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-dm-border dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-dm-blue flex items-center justify-center text-white shadow-md">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-dm-ink dark:text-white">DealMind · Sales</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-dm-muted dark:text-slate-400 hover:text-dm-ink dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tenant Tag */}
          <div className="p-2.5 rounded-xl bg-dm-subtle dark:bg-slate-800/60 border border-dm-border dark:border-slate-700/80 text-xs text-dm-muted dark:text-slate-400 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-dm-blue dark:text-indigo-400 shrink-0" />
            <span className="font-mono truncate">{tenantId}</span>
          </div>

          {activeDeal && (
            <div className="p-2.5 rounded-xl bg-dm-tint dark:bg-indigo-950/40 border border-dm-blue/20 dark:border-indigo-800/40">
              <div className="text-[9px] font-bold uppercase tracking-wider text-dm-deep/70 dark:text-indigo-300/80">Current deal</div>
              <div className="text-xs font-bold text-dm-ink dark:text-white truncate">{activeDeal.customer}</div>
            </div>
          )}

          {/* Nav List */}
          <nav className="space-y-4">
            {sections.map((section) => {
              const items = section.items.filter((item) => !item.roleRequired || hasRole(item.roleRequired));
              if (items.length === 0) return null;
              return (
                <div key={section.label} className="space-y-1">
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-dm-muted/70 dark:text-slate-500 mb-1">{section.label}</div>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item);
                    const disabled = Boolean(item.tool) && !activeDealId;
                    return (
                      <button
                        key={item.tool || item.path}
                        onClick={() => (item.tool ? handleTool(item.tool) : handleNav(item.path))}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                          active
                            ? 'bg-dm-blue text-white shadow-md shadow-dm-blue/20'
                            : item.highlight
                            ? 'text-dm-blue dark:text-indigo-400 hover:bg-dm-tint dark:hover:bg-indigo-950/40'
                            : disabled
                            ? 'text-dm-muted/50 dark:text-slate-600 hover:bg-dm-subtle/60 dark:hover:bg-slate-800/40'
                            : 'text-dm-muted dark:text-slate-400 hover:bg-dm-subtle dark:hover:bg-slate-800 hover:text-dm-ink dark:hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
