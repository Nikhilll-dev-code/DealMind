import React, { useState } from 'react';
import { 
  PlusCircle, 
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
import ThemeToggle from '../common/ThemeToggle';

export default function Header({ onOpenMobileMenu, currentDeal }) {
  const { pathname, navigate } = useRouter();
  const { theme, toggleTheme, isDark } = useTheme();
  const { user, login, logout, role, tenantId } = useAuth();
  const toast = useToast();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getBreadcrumbs = () => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0 || parts[0] === 'dashboard') {
      return [{ label: 'Workspace', path: '/dashboard' }, { label: 'Overview' }];
    }
    if (parts[0] === 'negotiations') {
      if (parts[1] === 'new') {
        return [{ label: 'Deals', path: '/negotiations' }, { label: 'New Deal Intake' }];
      }
      return [{ label: 'Workspace', path: '/dashboard' }, { label: 'Deals' }];
    }
    if (parts[0] === 'deals') {
      return [
        { label: 'Deals', path: '/negotiations' },
        { label: currentDeal?.customer ? `${currentDeal.customer}` : parts[1] || 'Deal Intelligence' }
      ];
    }
    if (parts[0] === 'queue') return [{ label: 'Workspace', path: '/dashboard' }, { label: 'Negotiation Queue' }];
    if (parts[0] === 'approvals') return [{ label: 'Governance', path: '/approvals' }, { label: 'Approvals Queue' }];
    if (parts[0] === 'memory') return [{ label: 'Learning', path: '/memory' }, { label: 'Organizational Memory' }];
    if (parts[0] === 'learning') return [{ label: 'Learning', path: '/learning' }, { label: 'Negotiation Replay' }];
    if (parts[0] === 'analytics') return [{ label: 'Insights', path: '/analytics' }, { label: 'Analytics' }];
    if (parts[0] === 'opportunities') return [{ label: 'Insights', path: '/opportunities' }, { label: 'Opportunities' }];
    if (parts[0] === 'agent-activity') return [{ label: 'Intelligence', path: '/agent-activity' }, { label: 'Agent Trace' }];
    if (parts[0] === 'infrastructure') return [{ label: 'Administration', path: '/infrastructure' }, { label: 'Infrastructure Health' }];
    if (parts[0] === 'profile' || parts[0] === 'settings') return [{ label: 'Account', path: '/profile' }, { label: 'Profile' }];

    return [{ label: 'DealMind', path: '/dashboard' }, { label: parts[0] }];
  };

  const breadcrumbs = getBreadcrumbs();

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
    toast.info('Logged Out', 'Your session has ended.');
    navigate('/login');
  };

  const handleSwitchAccount = async (targetEmail) => {
    setShowUserMenu(false);
    try {
      await login(targetEmail, 'Password123!');
      toast.success('Account Switched', `Logged in as ${targetEmail}.`);
      if (targetEmail.includes('admin')) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error('Switch Failed', err.message);
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 px-4 sm:px-6 flex items-center justify-between shrink-0 z-50 relative backdrop-blur-md">
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
                    className="hover:text-dm-blue dark:hover:text-indigo-400 truncate transition"
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
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-dm-blue hover:bg-dm-blue text-white text-xs font-semibold transition shadow-md shadow-dm-blue/20"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ New Deal</span>
          </button>
        )}

        {/* Theme Toggle - sleek switch */}
        <ThemeToggle
          isDark={isDark}
          onToggle={toggleTheme}
          className="p-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700"
        />

        {/* User Menu / Auth Controls */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(p => !p)}
              className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200/80 dark:border-slate-700 shadow-sm"
            >
              <div className="w-7 h-7 rounded-full bg-dm-blue text-white flex items-center justify-center text-xs font-bold shadow-sm">
                {user.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <div className="font-bold text-slate-900 dark:text-white leading-tight">{user.display_name || user.email}</div>
                <div className="text-[10px] text-dm-blue dark:text-indigo-400 font-mono font-semibold">
                  {user.role === 'ADMIN' ? 'Administrator' : 'Sales Representative'}
                </div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-[90]"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-[100] animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{user.display_name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-dm-blue/15 text-dm-deep dark:text-indigo-300 font-bold border border-dm-blue/30">
                        {user.role === 'ADMIN' ? 'ADMINISTRATOR' : 'SALES REP'}
                      </span>
                    </div>
                  </div>

                  {/* Switch Account Quick Option */}
                  <div className="p-1 border-b border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400">
                      Switch Role / Account:
                    </div>
                    {user.email !== 'admin@dealmind.local' && (
                      <button
                        onClick={() => handleSwitchAccount('admin@dealmind.local')}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <span>Switch to Administrator</span>
                        <span className="text-[10px] font-mono text-slate-400">Admin</span>
                      </button>
                    )}
                    {user.email !== 'sales@dealmind.local' && (
                      <button
                        onClick={() => handleSwitchAccount('sales@dealmind.local')}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <span>Switch to Sales Rep</span>
                        <span className="text-[10px] font-mono text-slate-400">Sales</span>
                      </button>
                    )}
                  </div>

                  <div className="p-1 space-y-0.5">
                    <button
                      onClick={() => { setShowUserMenu(false); navigate('/profile'); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Profile & Settings</span>
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
            className="px-3 py-1.5 rounded-xl bg-dm-blue hover:bg-dm-blue text-white text-xs font-bold shadow-sm transition"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
