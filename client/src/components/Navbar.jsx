import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Briefcase, 
  Database, 
  History, 
  Settings,
  Sparkles,
  BrainCircuit
} from 'lucide-react';

export default function Navbar({ activeTab, onSelectTab, negotiationsCount = 0 }) {
  const mainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-negotiation', label: '+ New Negotiation', icon: PlusCircle, highlight: true },
    { id: 'deals-list', label: 'My Deals', icon: Briefcase, count: negotiationsCount },
  ];

  const insightNav = [
    { id: 'memory-explorer', label: 'Memory', icon: Database },
    { id: 'learning-timeline', label: 'Learning', icon: History },
  ];

  return (
    <aside className="w-64 bg-[#111722] border-r border-[#20293a] flex flex-col justify-between shrink-0 select-none h-screen">
      <div>
        {/* Brand Header */}
        <div 
          onClick={() => onSelectTab('dashboard')}
          className="p-5 border-b border-[#20293a] flex items-center gap-3 cursor-pointer hover:bg-[#161f2e] transition"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-tight">DealMind</h1>
            <p className="text-[11px] text-slate-400 font-medium">Negotiation Intelligence</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-6">
          {/* Main workspace section */}
          <div className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : item.highlight
                      ? 'text-blue-400 hover:bg-blue-500/10 hover:text-blue-300'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#182030]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-[#20293a] mx-2" />

          {/* Insights section */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Insights
            </div>
            {insightNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#182030]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-[#20293a] mx-2" />

          {/* 60-Second Demo Item */}
          <div className="space-y-1">
            <button
              onClick={() => onSelectTab('demo')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'demo'
                  ? 'bg-gradient-to-r from-amber-500/20 to-indigo-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>60-Second Demo</span>
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-[#20293a] mx-2" />

          {/* Settings */}
          <div className="space-y-1">
            <button
              onClick={() => onSelectTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#182030]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Footer Branding */}
      <div className="p-4 border-t border-[#20293a] text-[11px] text-slate-500 flex items-center justify-between">
        <span>Powered by Hindsight</span>
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
      </div>
    </aside>
  );
}
