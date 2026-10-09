import React, { useState } from 'react';
import { BrainCircuit, ChevronLeft, ChevronRight, Menu, X, LogOut, Bell, User, ShieldCheck } from 'lucide-react';
import { useRouter } from '../../context/RouteContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import ThemeToggle from '../common/ThemeToggle';

/**
 * Shared application shell for both the Customer app and Admin console.
 * `accent` switches the brand tile between blue (intelligence) and radium (learning).
 */
export default function AppShell({
  children,
  sections = [],
  homePath = '/',
  brandLabel = 'DealMind',
  brandSub = 'Intelligence',
  accent = 'blue',
  topbarTitle = null,
  topbarRight = null
}) {
  const { pathname, navigate } = useRouter();
  const { user, login, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const toast = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const accentClass = accent === 'radium' ? 'bg-dm-deep' : 'bg-dm-blue';

  const isActive = (item) => {
    if (item.exact) return pathname === item.path;
    return pathname === item.path || (item.path !== homePath && pathname.startsWith(item.path));
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
    toast.success('Signed out', 'Your session has ended.');
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

  const NavButton = ({ item, onNavigate }) => {
    const Icon = item.icon;
    const active = isActive(item);
    return (
      <button
        onClick={() => { onNavigate(); navigate(item.path); }}
        title={collapsed ? item.label : undefined}
        className={`w-full flex items-center ${
          collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'
        } rounded-xl text-[13px] font-semibold transition-all duration-200 ${
          active
            ? 'bg-dm-blue text-white shadow-md shadow-dm-blue/25'
            : item.highlight
            ? 'text-dm-blue hover:bg-dm-tint'
            : 'text-dm-muted hover:text-dm-ink hover:bg-dm-subtle'
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : item.highlight ? 'text-dm-blue' : 'text-dm-muted'}`} />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </span>
        {!collapsed && item.badge ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-amber-100 text-amber-700 border border-amber-200">
            {item.badge}
          </span>
        ) : null}
      </button>
    );
  };

  const SidebarInner = ({ onNavigate = () => {} }) => (
    <div className="flex flex-col h-full">
      <div className="h-16 px-4 border-b border-dm-border flex items-center justify-between shrink-0">
        <button onClick={() => { onNavigate(); navigate(homePath); }} className="flex items-center gap-2.5 overflow-hidden">
          <span className={`w-8 h-8 rounded-xl ${accentClass} flex items-center justify-center shadow-md shadow-dm-blue/20 shrink-0`}>
            <BrainCircuit className="w-4 h-4 text-white" />
          </span>
          {!collapsed && (
            <span className="text-left leading-tight min-w-0">
              <span className="block font-extrabold text-sm text-dm-ink tracking-tight truncate">{brandLabel}</span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-dm-muted truncate">{brandSub}</span>
            </span>
          )}
        </button>
        <button
          onClick={() => setCollapsed(p => !p)}
          className="hidden md:block p-1 rounded-lg text-dm-muted hover:text-dm-ink hover:bg-dm-subtle transition"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="p-3 space-y-5 flex-1 overflow-y-auto">
        {sections.map((section) => {
          const items = (section.items || []).filter(Boolean);
          if (items.length === 0) return null;
          return (
            <div key={section.label} className="space-y-1">
              {!collapsed && (
                <div className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-dm-muted/70 mb-1">
                  {section.label}
                </div>
              )}
              {items.map(item => <NavButton key={item.path} item={item} onNavigate={onNavigate} />)}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-dm-border">
        {user && (
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} mb-2`}>
            <span className="w-8 h-8 rounded-full bg-dm-tint border border-dm-blue/20 flex items-center justify-center text-xs font-bold text-dm-deep shrink-0">
              {user.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-dm-ink truncate">{user.display_name || user.email}</div>
                <div className="text-[10px] font-mono text-dm-blue uppercase font-semibold truncate">{user.role}</div>
              </div>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-2.5 px-3'} py-2 rounded-xl text-[13px] font-semibold text-dm-muted hover:text-rose-600 hover:bg-rose-50 transition`}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-dm-bg text-dm-ink overflow-hidden font-sans antialiased">
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col shrink-0 bg-white border-r border-dm-border transition-all duration-200 z-30 ${collapsed ? 'w-[68px]' : 'w-64'}`}>
        <SidebarInner />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-dm-ink/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white border-r border-dm-border shadow-2xl animate-slide-in-right">
            <SidebarInner onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <header className="h-16 shrink-0 bg-white/80 backdrop-blur-md border-b border-dm-border flex items-center justify-between px-4 sm:px-6 gap-4 z-50 relative">
          <div className="flex items-center gap-3 min-w-0">
            <button className="md:hidden p-2 -ml-1 text-dm-ink" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold text-dm-ink truncate">{topbarTitle || brandLabel}</h1>
              <p className="text-[11px] text-dm-muted truncate hidden sm:block">{user?.display_name ? `Signed in as ${user.display_name}` : 'DealMind workspace'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {topbarRight}
            <ThemeToggle
              isDark={isDark}
              onToggle={toggleTheme}
              className="p-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700"
            />
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(p => !p)}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200/80 dark:border-slate-700 shadow-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-dm-deep text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    {user.display_name?.charAt(0) || user.email?.charAt(0) || 'A'}
                  </div>
                  <div className="hidden sm:block text-left text-xs">
                    <div className="font-bold text-slate-900 dark:text-white leading-tight">{user.display_name || user.email}</div>
                    <div className="text-[10px] text-dm-blue dark:text-indigo-400 font-mono font-semibold">
                      {user.role === 'ADMIN' ? 'Administrator' : 'Sales Representative'}
                    </div>
                  </div>
                </button>

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

        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
