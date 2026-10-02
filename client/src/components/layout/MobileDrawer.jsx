import React from 'react';
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
  X, 
  BrainCircuit, 
  Building2 
} from 'lucide-react';
import { useRouter } from '../../context/RouteContext';
import { useAuth } from '../../context/AuthContext';

export default function MobileDrawer({ isOpen, onClose }) {
  const { pathname, navigate } = useRouter();
  const { user, hasRole, tenantId } = useAuth();

  if (!isOpen) return null;

  const handleNav = (path) => {
    navigate(path);
    onClose();
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/negotiations', label: 'Negotiations', icon: Briefcase },
    { path: '/negotiations/new', label: '+ New Negotiation', icon: PlusCircle, highlight: true },
    { path: '/approvals', label: 'Approvals', icon: ShieldCheck, roleRequired: ['ADMIN', 'MANAGER'] },
    { path: '/memory', label: 'Hindsight Memory', icon: Database },
    { path: '/learning', label: 'Learning Timeline', icon: History },
    { path: '/agent-activity', label: 'Agent Activity', icon: Activity },
    { path: '/infrastructure', label: 'Infrastructure', icon: Server, roleRequired: ['ADMIN', 'MANAGER'] },
    { path: '/settings', label: 'Settings', icon: Settings },
    { path: '/demo', label: '60-Second Demo', icon: Sparkles, demo: true }
  ];

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Body */}
      <div className="relative w-72 max-w-[80vw] bg-slate-900 border-r border-slate-800 h-full flex flex-col justify-between p-4 z-10 shadow-2xl animate-in slide-in-from-left duration-200">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-white">DealMind 3.0</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tenant Tag */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-mono truncate">{tenantId}</span>
          </div>

          {/* Nav List */}
          <nav className="space-y-1 overflow-y-auto max-h-[60vh] pr-1">
            {navItems.map((item) => {
              if (item.roleRequired && !hasRole(item.roleRequired)) return null;
              const Icon = item.icon;
              const isActive = pathname === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md'
                      : item.demo
                      ? 'text-amber-400 hover:bg-amber-500/10'
                      : item.highlight
                      ? 'text-indigo-400 hover:bg-indigo-500/10'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
          <div className="font-bold text-white truncate">{user?.display_name || 'Guest'}</div>
          <div className="text-[10px] text-indigo-400 font-mono">{user?.role || 'UNAUTHENTICATED'}</div>
        </div>
      </div>
    </div>
  );
}
