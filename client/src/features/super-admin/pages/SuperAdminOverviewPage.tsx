import React, { useEffect, useState } from 'react';
import { superAdminService } from '../services/super-admin.service';
import type { CrossFactoryAnalyticsSummary } from '../services/super-admin.service';
import {
  Building2,
  Cpu,
  Users,
  Zap,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const SuperAdminOverviewPage: React.FC = () => {
  const [data, setData] = useState<CrossFactoryAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [analyticsRes] = await Promise.all([
          superAdminService.getCrossFactoryAnalytics(),
        ]);
        setData(analyticsRes);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load platform overview');
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
      <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl">
        <p className="font-medium">Error loading platform metrics: {error}</p>
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

  const statCards = [
    {
      title: 'Active Factories',
      value: totals.totalActiveFactories,
      icon: Building2,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Total Loom Machines',
      value: totals.totalPlatformMachines,
      icon: Cpu,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      title: 'Active Platform Users',
      value: totals.totalPlatformUsers,
      icon: Users,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    },
    {
      title: 'Overall Efficiency',
      value: `${totals.overallPlatformEfficiency}%`,
      icon: Zap,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Super Admin Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">
          High-level multi-factory overview and operational summary across Shree Brahmanikrupa Textile platform.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-2xl border ${stat.color} bg-slate-950/40 backdrop-blur flex items-center justify-between`}
            >
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.title}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80">
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Factory Breakdown Grid */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Factory Operational Status</h2>
            <p className="text-xs text-slate-400">Aggregated production and loom performance per facility</p>
          </div>
          <Link
            to="/super-admin/factories"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
          >
            Manage All Factories →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs text-slate-400 uppercase border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Factory</th>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Active Machines</th>
                <th className="py-3.5 px-4">Active Users</th>
                <th className="py-3.5 px-4">Total Production</th>
                <th className="py-3.5 px-4">Avg Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.factories && data.factories.length > 0 ? (
                data.factories.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-white flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>{f.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-indigo-400">{f.code}</td>
                    <td className="py-3.5 px-4">{f.machineCount}</td>
                    <td className="py-3.5 px-4">{f.userCount}</td>
                    <td className="py-3.5 px-4 font-mono">{f.totalMeters.toLocaleString()} m</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          f.averageEfficiency >= 85
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : f.averageEfficiency >= 70
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {f.averageEfficiency}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No active factories found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          to="/super-admin/factories"
          className="p-5 rounded-2xl border border-slate-800 bg-slate-950/40 hover:border-indigo-500/50 transition-all flex flex-col justify-between"
        >
          <div>
            <Building2 className="w-6 h-6 text-indigo-400 mb-2" />
            <h3 className="font-semibold text-white">Create New Factory</h3>
            <p className="text-xs text-slate-400 mt-1">
              Add a new factory unit, designate location details, and establish factory boundaries.
            </p>
          </div>
          <span className="text-xs text-indigo-400 font-medium mt-4">Open Factory Management →</span>
        </Link>

        <Link
          to="/super-admin/admins"
          className="p-5 rounded-2xl border border-slate-800 bg-slate-950/40 hover:border-indigo-500/50 transition-all flex flex-col justify-between"
        >
          <div>
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-2" />
            <h3 className="font-semibold text-white">Assign Factory Admins</h3>
            <p className="text-xs text-slate-400 mt-1">
              Provision administrators and delegate local management of operators and settings.
            </p>
          </div>
          <span className="text-xs text-emerald-400 font-medium mt-4">Manage Administrators →</span>
        </Link>

        <Link
          to="/super-admin/audit-logs"
          className="p-5 rounded-2xl border border-slate-800 bg-slate-950/40 hover:border-indigo-500/50 transition-all flex flex-col justify-between"
        >
          <div>
            <Clock className="w-6 h-6 text-amber-400 mb-2" />
            <h3 className="font-semibold text-white">View Audit Trail</h3>
            <p className="text-xs text-slate-400 mt-1">
              Review immutable records of administrative actions, user creation, and status modifications.
            </p>
          </div>
          <span className="text-xs text-amber-400 font-medium mt-4">Inspect Audit Logs →</span>
        </Link>
      </div>
    </div>
  );
};
