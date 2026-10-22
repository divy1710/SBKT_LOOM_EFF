import React, { useEffect, useState } from 'react';
import axiosInstance from '@/lib/axios';
import { superAdminService } from '../services/super-admin.service';
import type { FactoryListItem } from '../services/super-admin.service';
import { UserRole } from '@/features/auth/types/auth.types';
import {
  Search,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  factoryId?: string;
  isActive: boolean;
  createdAt: string;
}

export const SuperAdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [factories, setFactories] = useState<FactoryListItem[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [factoryFilter, setFactoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersRes, factoryRes] = await Promise.all([
        axiosInstance.get('/users', {
          params: {
            search: search.trim() || undefined,
            role: roleFilter || undefined,
            factoryId: factoryFilter || undefined,
            limit: 50,
          },
        }),
        superAdminService.getFactories({ limit: 100 }),
      ]);
      setUsers(usersRes.data.data.users || []);
      setFactories(factoryRes.factories || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, factoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleToggleStatus = async (user: PlatformUser) => {
    const nextStatus = !user.isActive;
    const confirmMsg = nextStatus
      ? `Activate user ${user.name}?`
      : `Deactivate user ${user.name}? They will immediately lose access to all APIs.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await axiosInstance.patch(`/users/${user.id}/status`, { isActive: nextStatus });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const getFactoryName = (fid?: string) => {
    if (!fid) return 'Platform-wide';
    const found = factories.find((f) => f.id === fid);
    return found ? `${found.name} (${found.code})` : fid;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Platform User Directory</h1>
        <p className="text-sm text-slate-400 mt-1">
          Super Admin cross-factory view of all registered operators, managers, and administrators.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Roles</option>
            <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
            <option value={UserRole.FACTORY_ADMIN}>Factory Admin</option>
            <option value={UserRole.MANAGER}>Manager</option>
            <option value={UserRole.OPERATOR}>Operator</option>
            <option value={UserRole.VIEWER}>Viewer</option>
          </select>

          <select
            value={factoryFilter}
            onChange={(e) => setFactoryFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Factories</option>
            {factories.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs text-slate-400 uppercase border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Factory Scope</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading users...
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-4 font-medium text-white flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-white">{u.name}</span>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-slate-300">{u.email}</td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.role === UserRole.SUPER_ADMIN
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : u.role === UserRole.FACTORY_ADMIN
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs font-medium text-slate-300">
                      {getFactoryName(u.factoryId)}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          u.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {u.role !== UserRole.SUPER_ADMIN && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          title={u.isActive ? 'Deactivate User' : 'Activate User'}
                          className={`p-1.5 rounded-lg hover:bg-slate-800 transition-colors ${
                            u.isActive
                              ? 'text-slate-400 hover:text-rose-400'
                              : 'text-slate-400 hover:text-emerald-400'
                          }`}
                        >
                          {u.isActive ? (
                            <XCircle className="w-5 h-5" />
                          ) : (
                            <CheckCircle className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No users found matching query.
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
