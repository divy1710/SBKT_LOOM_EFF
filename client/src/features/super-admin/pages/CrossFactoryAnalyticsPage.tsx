import React, { useEffect, useState } from 'react';
import { superAdminService } from '../services/super-admin.service';
import type { CrossFactoryAnalyticsSummary } from '../services/super-admin.service';
import {
  BarChart3,
  Zap,
  Cpu,
  TrendingUp,
} from 'lucide-react';

export const CrossFactoryAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<CrossFactoryAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await superAdminService.getCrossFactoryAnalytics();
        setData(res);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch cross-factory analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-sm">
        {error}
      </div>
    );
  }

  const totals = data?.totals || {
    totalActiveFactories: 0,
    totalPlatformMachines: 0,
    totalPlatformUsers: 0,
    overallPlatformEfficiency: 0,
    totalPlatformMeters: 0,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Cross-Factory Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">
          Comparative intelligence, aggregate production meters, and efficiency metrics across all manufacturing facilities.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl border border-indigo-500/20 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Total Output</span>
            <BarChart3 className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {totals.totalPlatformMeters.toLocaleString()} <span className="text-sm font-normal text-slate-400">m</span>
          </p>
          <p className="text-xs text-indigo-400 mt-1">Combined woven fabric</p>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-500/20 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Overall Efficiency</span>
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{totals.overallPlatformEfficiency}%</p>
          <p className="text-xs text-emerald-400 mt-1">Across completed shifts</p>
        </div>

        <div className="p-5 rounded-2xl border border-sky-500/20 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Active Looms</span>
            <Cpu className="w-5 h-5 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{totals.totalPlatformMachines}</p>
          <p className="text-xs text-sky-400 mt-1">Waterjet machines online</p>
        </div>

        <div className="p-5 rounded-2xl border border-amber-500/20 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Active Units</span>
            <TrendingUp className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{totals.totalActiveFactories}</p>
          <p className="text-xs text-amber-400 mt-1">Operating manufacturing sites</p>
        </div>
      </div>

      {/* Comparative Table */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Comparative Production Performance</h2>
        <p className="text-xs text-slate-400 mb-6">
          Real database aggregations scoping machines, completed shift sheets, and efficiency scores per factory.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs text-slate-400 uppercase border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Factory</th>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Loom Count</th>
                <th className="py-3.5 px-4">Personnel</th>
                <th className="py-3.5 px-4">Production Output</th>
                <th className="py-3.5 px-4">Shift Sheets</th>
                <th className="py-3.5 px-4">Average Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.factories && data.factories.length > 0 ? (
                data.factories.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-4 font-semibold text-white">{f.name}</td>
                    <td className="py-4 px-4 font-mono text-xs text-indigo-400 font-bold">{f.code}</td>
                    <td className="py-4 px-4 font-medium">{f.machineCount}</td>
                    <td className="py-4 px-4 font-medium">{f.userCount}</td>
                    <td className="py-4 px-4 font-mono font-medium">{f.totalMeters.toLocaleString()} m</td>
                    <td className="py-4 px-4">{f.completedSheetsCount} sheets</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              f.averageEfficiency >= 85
                                ? 'bg-emerald-400'
                                : f.averageEfficiency >= 70
                                ? 'bg-amber-400'
                                : 'bg-rose-400'
                            }`}
                            style={{ width: `${Math.min(100, f.averageEfficiency)}%` }}
                          ></div>
                        </div>
                        <span className="font-semibold text-xs text-white">{f.averageEfficiency}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No factory performance data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
