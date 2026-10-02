import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  PlusCircle, 
  Sparkles, 
  Menu, 
  LogOut, 
  User, 
  Building2, 
  ChevronRight,
  ShieldCheck,
  Bell
} from 'lucide-react';
import { useRouter } from '../../context/RouteContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Header({ onOpenMobileMenu, currentDeal }) {
  const { pathname, navigate } = useRouter();
  const { theme, toggleTheme, isDark } = useTheme();
  const { user, logout, role, tenantId } = useAuth();
  const toast = useToast();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getBreadcrumbs = () => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0 || parts[0] === 'dashboard') {
      return [{ label: 'DealDesk', path: '/dashboard' }, { label: 'Dashboard' }];
    }
    if (parts[0] === 'negotiations') {
      if (parts[1] === 'new') {
        return [{ label: 'Negotiations', path: '/negotiations' }, { label: 'New Deal Intake' }];
      }
      return [{ label: 'DealDesk', path: '/dashboard' }, { label: 'Negotiations' }];
    }
    if (parts[0] === 'deals') {
      return [
        { label: 'Negotiations', path: '/negotiations' },
        { label: currentDeal?.customer ? `${currentDeal.customer}` : parts[1] || 'Workspace' }
      ];
    }
    if (parts[0] === 'approvals') return [{ label: 'Governance', path: '/approvals' }, { label: 'Approvals Queue' }];
    if (parts[0] === 'memory') return [{ label: 'Intelligence', path: '/memory' }, { label: 'Hindsight Memory Bank' }];
    if (parts[0] === 'learning') return [{ label: 'Intelligence', path: '/learning' }, { label: 'Learning Timeline' }];
    if (parts[0] === 'agent-activity') return [{ label: 'Intelligence', path: '/agent-activity' }, { label: 'Live Agent Trace' }];
    if (parts[0] === 'infrastructure') return [{ label: 'Administration', path: '/infrastructure' }, { label: 'Infrastructure Health' }];
    if (parts[0] === 'settings') return [{ label: 'Administration', path: '/settings' }, { label: 'Settings' }];
    if (parts[0] === 'demo') return [{ label: 'Intelligence', path: '/dashboard' }, { label: '60-Second Demo' }];
    return [{ label: 'DealMind', path: '/dashboard' }, { label: parts[0] }];
  };

  const breadcrumbs = getBreadcrumbs();

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
    toast.info('Logged Out', 'Your session has ended.');
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
      {/* Left: Mobile Hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb Path */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium overflow-hidden">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.label}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                {isLast ? (
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                    {crumb.label}
                  </span>
                ) : (
                  <button
                    onClick={() => crumb.path && navigate(crumb.path)}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 truncate transition"
                  >
                    {crumb.label}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Right: Quick Actions, Theme Switcher & User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {pathname !== '/negotiations/new' && (
          <button
            onClick={() => navigate('/negotiations/new')}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md shadow-indigo-600/20"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ New Deal</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          title={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
          aria-label="Toggle visual theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>

        {/* User Menu / Auth Placeholder */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(p => !p)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                {user.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
              <div className="hidden lg:block text-left text-xs">
                <div className="font-bold text-slate-900 dark:text-white leading-tight">{user.display_name || user.email}</div>
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold">{user.role}</div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{user.display_name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                        {user.role}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 truncate">
                        {user.tenant_id}
                      </span>
                    </div>
                  </div>

                  <div className="p-1 space-y-0.5">
                    <button
                      onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Account Settings</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
