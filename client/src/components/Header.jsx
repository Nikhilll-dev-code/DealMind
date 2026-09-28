import React from 'react';
import { PlusCircle, Sparkles, Settings } from 'lucide-react';

export default function Header({ activeTab, currentDeal, onNewNegotiation, onStartDemo, onOpenSettings }) {
  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'new-negotiation':
        return 'New Negotiation';
      case 'deal-workspace':
        return currentDeal?.customer ? `${currentDeal.customer} — Deal Workspace` : 'Deal Workspace';
      case 'deals-list':
        return 'My Deals';
      case 'memory-explorer':
        return 'Organizational Memory';
      case 'learning-timeline':
        return 'Learning Timeline';
      case 'demo':
        return '60-Second Demo';
      case 'settings':
        return 'Settings & System Status';
      default:
        return 'Negotiation Intelligence';
    }
  };

  return (
    <header className="h-14 border-b border-[#20293a] bg-[#111722] px-6 flex items-center justify-between shrink-0">
      {/* Page Title & Context */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-white">{getPageTitle()}</span>
        {activeTab === 'deal-workspace' && currentDeal && (
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            ${Number(currentDeal.dealValue || currentDeal.initialOffer || 0).toLocaleString()} · {currentDeal.requestedDiscountPercent || 20}% Requested
          </span>
        )}
      </div>

      {/* Right Quick Actions */}
      <div className="flex items-center gap-3">
        {activeTab !== 'new-negotiation' && (
          <button
            onClick={onNewNegotiation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-sm shadow-blue-600/20"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Negotiation</span>
          </button>
        )}
        {activeTab !== 'demo' && (
          <button
            onClick={onStartDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold transition border border-amber-500/20"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>60-Sec Demo</span>
          </button>
        )}
      </div>
    </header>
  );
}
