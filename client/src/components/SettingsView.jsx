import React from 'react';
import { Settings, Database, ShieldCheck, Zap, RotateCcw } from 'lucide-react';

export default function SettingsView({ health, onResetDemo }) {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white tracking-tight">Settings & System Status</h2>
        </div>
        <p className="text-slate-400 text-sm mt-1">
          Verify memory bank connections, LLM parameters, and database state.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Hindsight Status */}
        <div className="bg-[#182030] border border-[#243048] rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
            <Database className="w-5 h-5" />
            <span>Hindsight Memory</span>
          </div>
          <div className="text-xs text-slate-300">
            Status: <span className="font-bold text-emerald-400">{health?.hindsight?.status || 'Active'}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">Bank: dealmind</div>
          <div className="text-[11px] text-slate-400 font-mono truncate">URL: https://api.hindsight.vectorize.io</div>
        </div>

        {/* Groq Status */}
        <div className="bg-[#182030] border border-[#243048] rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            <Zap className="w-5 h-5" />
            <span>Groq LLM Reasoner</span>
          </div>
          <div className="text-xs text-slate-300">
            Status: <span className="font-bold text-blue-400">{health?.groq?.status || 'Active'}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">Model: llama-3.3-70b-versatile</div>
        </div>

        {/* SQLite Database Status */}
        <div className="bg-[#182030] border border-[#243048] rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <ShieldCheck className="w-5 h-5" />
            <span>SQLite Database</span>
          </div>
          <div className="text-xs text-slate-300">
            Status: <span className="font-bold text-emerald-400">Connected</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono truncate">Path: server/data/dealmind.sqlite</div>
        </div>
      </div>

      {/* Reset Seed Database Action */}
      <div className="bg-[#182030] border border-[#243048] rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-white text-base">Database Management</h3>
        <p className="text-xs text-slate-400">
          Reset all negotiation outcomes and restore the initial 12 seed negotiation episodes (Acme: 5 WON, 3 LOST).
        </p>
        <button
          onClick={onResetDemo}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition flex items-center gap-2 border border-slate-700"
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
          <span>Reset Database to Seed State</span>
        </button>
      </div>
    </div>
  );
}
