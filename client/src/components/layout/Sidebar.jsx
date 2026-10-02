import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  PlusCircle, 
  ShieldCheck, 
  Database, 
  History, 
  Activity, 
  Server, 
  Settings, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  BrainCircuit,
  Building2,
  Users
} from 'lucide-react';
import { useRouter } from '../../context/RouteContext';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ collapsed, onToggleCollapse, pendingApprovalsCount = 0 }) {
  const { pathname, navigate } = useRouter();
  const { user, hasRole, tenantId } = useAuth();

  const navSections = [
    {
      label: 'WORKSPACE',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/negotiations', label: 'Negotiations', icon: Briefcase },
        { path: '/negotiations/new', label: '+ New Deal', icon: PlusCircle, highlight: true },
        { 
          path: '/approvals', 
          label: 'Approvals', 
          icon: ShieldCheck, 
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
          roleRequired: ['ADMIN', 'MANAGER']
        }
      ]
    },
    {
      label: 'INTELLIGENCE',
      items: [
        { path: '/memory', label: 'Hindsight Memory', icon: Database },
        { path: '/learning', label: 'Learning Timeline', icon: History },
        { path: '/agent-activity', label: 'Agent Activity', icon: Activity }
      ]
    },
    {
      label: 'ADMINISTRATION',
      items: [
        { path: '/infrastructure', label: 'Infrastructure', icon: Server, roleRequired: ['ADMIN', 'MANAGER'] },
        { path: '/settings', label: 'Settings', icon: Settings }
      ]
    }
  ];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between shrink-0 select-none h-screen bg-slate-900 border-r border-slate-800 transition-all duration-250 z-30 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 cursor-pointer overflow-hidden"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="font-extrabold text-sm text-white tracking-tight leading-tight">DealMind</h1>
                <p className="text-[10px] text-slate-400 font-medium truncate">Intelligence 3.0</p>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Tenant Indicator */}
        {!collapsed && (
          <div className="px-3.5 pt-3">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-[11px] font-mono text-slate-300 truncate font-semibold">
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
            const filteredItems = section.items.filter(
              (item) => !item.roleRequired || hasRole(item.roleRequired)
            );
            if (filteredItems.length === 0) return null;

            return (
              <div key={section.label} className="space-y-1">
                {!collapsed && (
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {section.label}
                  </div>
                )}
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));

                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center ${
                        collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'
                      } rounded-xl text-xs font-semibold transition group ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : item.highlight
                          ? 'text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!collapsed && item.badge !== null && item.badge !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* 60-Second Demo Link */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              onClick={() => navigate('/demo')}
              title={collapsed ? '60-Second Demo' : undefined}
              className={`w-full flex items-center ${
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-3 py-2'
              } rounded-xl text-xs font-bold transition ${
                pathname === '/demo'
                  ? 'bg-gradient-to-r from-amber-500/20 to-indigo-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/10'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              {!collapsed && <span>60-Sec Demo</span>}
            </button>
          </div>
        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        {user ? (
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
              {user.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-200 truncate">{user.display_name || user.email}</div>
                <div className="text-[10px] font-mono text-indigo-400 uppercase font-semibold">{user.role}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 text-center font-mono">
            {!collapsed && 'Guest Mode'}
          </div>
        )}
      </div>
    </aside>
  );
}
