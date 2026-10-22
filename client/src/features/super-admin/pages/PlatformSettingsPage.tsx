import React from 'react';
import { ShieldCheck, Server } from 'lucide-react';

export const PlatformSettingsPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Platform Configuration</h1>
        <p className="text-sm text-slate-400 mt-1">
          Super Admin global settings governing multi-factory boundaries, authentication policies, and backup safeguards.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-4">
          <div className="flex items-center space-x-3 text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
            <h2 className="text-lg font-bold text-white">Security & Multi-Tenancy</h2>
          </div>
          <p className="text-xs text-slate-400">
            Strict isolation guarantees that each Factory Admin and Factory User can only query, modify, or export documents belonging to their assigned facility.
          </p>
          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-slate-300">Inactive Factory Blocking</span>
              <span className="font-semibold text-emerald-400">ACTIVE (403 Forbidden)</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-slate-300">Session Cookie Security</span>
              <span className="font-semibold text-emerald-400">HttpOnly + SameSite</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-slate-300">Cross-Factory Reassignment</span>
              <span className="font-semibold text-purple-400">Super Admin Only</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-4">
          <div className="flex items-center space-x-3 text-emerald-400">
            <Server className="w-6 h-6" />
            <h2 className="text-lg font-bold text-white">Database & Migration Safeguards</h2>
          </div>
          <p className="text-xs text-slate-400">
            Dedicated multi-factory migration script with zero-destruction dry-run mode and preservation of historical Shree Brahmanikrupa Textile production records.
          </p>
          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-slate-300">Migration Tool</span>
              <span className="font-mono text-indigo-300">migrate-multi-factory.ts</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-slate-300">Historical IDs Preserved</span>
              <span className="font-semibold text-emerald-400">YES (100% Retained)</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-slate-300">Production Formulas</span>
              <span className="font-semibold text-emerald-400">Unchanged (10080 min/week)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
