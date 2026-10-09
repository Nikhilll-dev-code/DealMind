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
  ChevronLeft,
  ChevronRight,
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

/**
 * Sales Representative navigation (Two-Role spec §7).
 * Full support for both Light & Dark themes with clean high contrast.
 */
export default function Sidebar({
  collapsed,
  onToggleCollapse,
  pendingApprovalsCount = 0,
  activeDeal = null,
  activeDealId = null,
  activeTool = null,
  onOpenTool = null
}) {
  const { pathname, navigate } = useRouter();
  const { user, hasRole, tenantId } = useAuth();

  const openTool = (tool) => {
    if (onOpenTool) onOpenTool(tool);
    else navigate('/negotiations');
  };

  const navSections = [
    {
      label: 'WORKSPACE',
      items: [
        { path: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
        { path: '/negotiations', label: 'Deals', icon: Briefcase },
        { path: '/negotiations/new', label: 'New Deal', icon: PlusCircle, highlight: true },
        { path: '/queue', label: 'Negotiation Queue', icon: ListChecks },
        {
          path: '/approvals',
          label: 'Approvals',
          icon: ShieldCheck,
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
          roleRequired: ['ADMIN']
        }
      ]
    },
    {
      label: 'INTELLIGENCE',
      hint: activeDeal ? activeDeal.customer : 'Open a deal to activate',
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

  const isPathActive = (item) => {
    if (item.exact) return pathname === item.path;
    if (['/dashboard', '/profile', '/settings'].includes(item.path)) return pathname === item.path;
    return pathname === item.path || pathname.startsWith(`${item.path}/`);
  };

  const isToolActive = (item) => pathname.startsWith('/deals') && activeTool === item.tool;

  const NavButton = ({ item }) => {
    const Icon = item.icon;
    const active = item.tool ? isToolActive(item) : isPathActive(item);
    const disabled = Boolean(item.tool) && !activeDealId;

    return (
      <button
        onClick={() => (item.tool ? openTool(item.tool) : navigate(item.path))}
        title={collapsed ? item.label : undefined}
        className={`w-full flex items-center ${
          collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'
        } rounded-xl text-xs font-semibold transition group ${
          active
            ? 'bg-dm-blue text-white shadow-md shadow-dm-blue/20'
            : disabled
            ? 'text-dm-muted/50 dark:text-slate-600 hover:bg-dm-subtle/60 dark:hover:bg-slate-800/40'
            : item.highlight
            ? 'text-dm-blue dark:text-indigo-400 hover:bg-dm-tint dark:hover:bg-indigo-950/40'
            : 'text-dm-muted dark:text-slate-400 hover:text-dm-ink dark:hover:text-white hover:bg-dm-subtle dark:hover:bg-slate-800'
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : item.highlight ? 'text-dm-blue dark:text-indigo-400' : disabled ? 'text-dm-muted/50 dark:text-slate-600' : 'text-dm-muted dark:text-slate-400 group-hover:text-dm-ink dark:group-hover:text-white'}`} />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </span>

        {!collapsed && item.badge !== null && item.badge !== undefined && (
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`hidden md:flex flex-col justify-between shrink-0 select-none h-screen bg-white dark:bg-slate-900 border-r border-dm-border dark:border-slate-800 transition-all duration-200 z-30 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-dm-border dark:border-slate-800 flex items-center justify-between shrink-0">
          <div
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 cursor-pointer overflow-hidden"
          >
            <div className="w-8 h-8 rounded-xl bg-dm-blue flex items-center justify-center shadow-md shadow-dm-blue/20 shrink-0">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="font-extrabold text-sm text-dm-ink dark:text-white tracking-tight leading-tight">DealMind</h1>
                <p className="text-[10px] text-dm-muted dark:text-slate-400 font-medium truncate">Sales Workspace</p>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg text-dm-muted dark:text-slate-400 hover:text-dm-ink dark:hover:text-white hover:bg-dm-subtle dark:hover:bg-slate-800 transition"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Active deal context banner (spec §72) */}
        {!collapsed && activeDeal && (
          <div className="px-3 pt-3">
            <div className="px-3 py-2 rounded-xl bg-dm-tint dark:bg-indigo-950/40 border border-dm-blue/20 dark:border-indigo-800/40">
              <div className="text-[9px] font-bold uppercase tracking-wider text-dm-deep/70 dark:text-indigo-300/80">Current deal</div>
              <div className="text-xs font-bold text-dm-ink dark:text-white truncate">{activeDeal.customer}</div>
            </div>
          </div>
        )}

        {/* Tenant Indicator */}
        {!collapsed && (
          <div className="px-3.5 pt-3">
            <div className="px-3 py-1.5 rounded-xl bg-dm-subtle dark:bg-slate-800/60 border border-dm-border dark:border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <Building2 className="w-3.5 h-3.5 text-dm-blue dark:text-indigo-400 shrink-0" />
                <span className="text-[11px] font-mono text-dm-muted dark:text-slate-400 truncate font-semibold">
                  {tenantId}
                </span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="p-3 space-y-5 flex-1">
          {navSections.map((section) => {
            const items = section.items.filter(
              (item) => !item.roleRequired || hasRole(item.roleRequired)
            );
            if (items.length === 0) return null;

            return (
              <div key={section.label} className="space-y-1">
                {!collapsed && (
                  <div className="px-3 flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-dm-muted/70 dark:text-slate-500">{section.label}</span>
                    {section.hint && (
                      <span className="text-[9px] font-medium text-dm-blue/80 dark:text-indigo-400/80 truncate max-w-[110px]">{section.hint}</span>
                    )}
                  </div>
                )}
                {items.map((item) => (
                  <NavButton key={item.tool || item.path} item={item} />
                ))}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
