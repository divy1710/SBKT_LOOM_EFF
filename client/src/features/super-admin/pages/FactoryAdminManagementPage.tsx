import React, { useEffect, useState } from 'react';
import { superAdminService } from '../services/super-admin.service';
import type {
  FactoryAdminItem,
  FactoryListItem,
  CreateAdminInput,
} from '../services/super-admin.service';
import {
  UserPlus,
  RefreshCw,
  X,
  Building2,
} from 'lucide-react';

export const FactoryAdminManagementPage: React.FC = () => {
  const [admins, setAdmins] = useState<FactoryAdminItem[]>([]);
  const [factories, setFactories] = useState<FactoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reassignAdmin, setReassignAdmin] = useState<FactoryAdminItem | null>(null);
  const [targetFactoryId, setTargetFactoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreateAdminInput>({
    name: '',
    email: '',
    password: '',
    factoryId: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [adminList, factoryRes] = await Promise.all([
        superAdminService.getFactoryAdmins(),
        superAdminService.getFactories({ limit: 100 }),
      ]);
      setAdmins(adminList || []);
      setFactories(factoryRes.factories || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch administrators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFormError(null);
      await superAdminService.createFactoryAdmin(createForm);
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', password: '', factoryId: '' });
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create administrator');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignAdmin || !targetFactoryId) return;
    try {
      setSubmitting(true);
      setFormError(null);
      await superAdminService.reassignFactoryAdmin(reassignAdmin.id, targetFactoryId);
      setReassignAdmin(null);
      setTargetFactoryId('');
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to reassign administrator');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Factory Admin Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Provision, assign, and manage administrators responsible for individual manufacturing facilities.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-5 h-5" />
          <span>Provision Factory Admin</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs text-slate-400 uppercase border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Administrator</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Assigned Factory</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Last Login</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading administrators...
                  </td>
                </tr>
              ) : admins.length > 0 ? (
                admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-4 font-medium text-white flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-xs">
                        {admin.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{admin.name}</p>
                        <p className="text-xs text-slate-400">Factory Administrator</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-slate-300">{admin.email}</td>
                    <td className="py-4 px-4">
                      {admin.assignedFactory ? (
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-indigo-400" />
                          <span className="font-medium text-white">{admin.assignedFactory.name}</span>
                          <span className="font-mono text-xs text-indigo-400">({admin.assignedFactory.code})</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          admin.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {admin.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-400">
                      {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => {
                          setReassignAdmin(admin);
                          setTargetFactoryId(admin.assignedFactory?.id || '');
                        }}
                        className="inline-flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-500/30 hover:border-indigo-500/60 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reassign Factory</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No factory administrators found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-white">Provision Factory Admin</h2>
            <p className="text-xs text-slate-400 mt-1">
              Create an administrative account bound to a specific textile facility.
            </p>

            {formError && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Full Name *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Rajeshbhai Patel"
                  className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Email Address *</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="admin@katargam.sbkt.com"
                  className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Initial Password * (min 12 chars)</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="SecurePass123!@#"
                  className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Factory Assignment *</label>
                <select
                  required
                  value={createForm.factoryId}
                  onChange={(e) => setCreateForm({ ...createForm, factoryId: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select a factory...</option>
                  {factories.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Provision Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {reassignAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setReassignAdmin(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-white">Reassign Administrator</h2>
            <p className="text-xs text-slate-400 mt-1">
              Transfer management jurisdiction for <span className="text-white font-semibold">{reassignAdmin.name}</span>.
            </p>

            {formError && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleReassignSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Current Factory</label>
                <p className="mt-1 text-sm font-medium text-slate-200">
                  {reassignAdmin.assignedFactory?.name || 'Unassigned'}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Target Factory *</label>
                <select
                  required
                  value={targetFactoryId}
                  onChange={(e) => setTargetFactoryId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select target factory...</option>
                  {factories.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setReassignAdmin(null)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {submitting ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
