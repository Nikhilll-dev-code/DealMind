import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileDrawer from './MobileDrawer';

export default function AppLayout({ children, currentDeal, pendingApprovalsCount = 0 }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Collapsible Sidebar on Desktop */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(p => !p)}
        pendingApprovalsCount={pendingApprovalsCount}
      />

      {/* Off-canvas Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Header
          onOpenMobileMenu={() => setMobileOpen(true)}
          currentDeal={currentDeal}
        />

        <main className="flex-1 overflow-y-auto min-w-0 bg-slate-50 dark:bg-[#0b0f19]">
          {children}
        </main>
      </div>
    </div>
  );
}
