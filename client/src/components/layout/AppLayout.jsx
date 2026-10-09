import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileDrawer from './MobileDrawer';

export default function AppLayout({
  children,
  currentDeal,
  activeDealId = null,
  activeTool = null,
  pendingApprovalsCount = 0,
  onOpenTool = null
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-dm-bg dark:bg-slate-950 text-dm-ink dark:text-slate-100 overflow-hidden font-sans antialiased selection:bg-dm-blue selection:text-white transition-colors duration-150">
      {/* Collapsible Sidebar on Desktop */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(p => !p)}
        pendingApprovalsCount={pendingApprovalsCount}
        activeDeal={currentDeal}
        activeDealId={activeDealId}
        activeTool={activeTool}
        onOpenTool={onOpenTool}
      />

      {/* Off-canvas Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        activeDeal={currentDeal}
        activeDealId={activeDealId}
        activeTool={activeTool}
        onOpenTool={onOpenTool}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Header
          onOpenMobileMenu={() => setMobileOpen(true)}
          currentDeal={currentDeal}
        />

        <main className="flex-1 overflow-y-auto min-w-0 bg-dm-bg dark:bg-slate-950 transition-colors duration-150">
          {children}
        </main>
      </div>
    </div>
  );
}
