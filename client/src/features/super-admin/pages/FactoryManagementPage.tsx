import React, { useEffect, useState } from 'react';
import { superAdminService } from '../services/super-admin.service';
import type {
  FactoryListItem,
  FactoryDetailData,
  CreateFactoryInput,
  UpdateFactoryInput,
} from '../services/super-admin.service';
import {
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Edit3,
  Eye,
  X,
} from 'lucide-react';

export const FactoryManagementPage: React.FC = () => {
  const [factories, setFactories] = useState<FactoryListItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<FactoryListItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<FactoryDetailData | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<CreateFactoryInput>({
    name: '',
    code: '',
    address: '',
    city: '',
    state: 'Gujarat',
    country: 'India',
    phone: '',
    email: '',
  });
  const [editForm, setEditForm] = useState<UpdateFactoryInput>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchFactories = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await superAdminService.getFactories({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setFactories(res.factories || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch factories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFactories();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFactories();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFormError(null);
      await superAdminService.createFactory(createForm);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        code: '',
        address: '',
        city: '',
        state: 'Gujarat',
        country: 'India',
        phone: '',
        email: '',
      });
      fetchFactories();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create factory');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    try {
      setSubmitting(true);
      setFormError(null);
      await superAdminService.updateFactory(showEditModal.id, editForm);
      setShowEditModal(null);
      fetchFactories();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to update factory');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (factory: FactoryListItem) => {
    const nextStatus = factory.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const confirmMsg =
      nextStatus === 'INACTIVE'
        ? `Are you sure you want to deactivate ${factory.name}? Deactivating a factory blocks users from accessing operational endpoints while preserving historical records.`
        : `Reactivate factory ${factory.name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await superAdminService.toggleFactoryStatus(factory.id, nextStatus);
      fetchFactories();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to change factory status');
    }
  };

  const handleViewDetails = async (id: string) => {
    try {
      const data = await superAdminService.getFactoryById(id);
      setShowDetailModal(data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load factory details');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Factory Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure, inspect, update, and manage operational boundaries for all textile factories.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Create Factory</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </form>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <label className="text-xs text-slate-400 font-medium">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs text-slate-400 uppercase border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Factory Details</th>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Machines</th>
                <th className="py-3.5 px-4">Users</th>
                <th className="py-3.5 px-4">Assigned Admin</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Loading factories...
                  </td>
                </tr>
              ) : factories.length > 0 ? (
                factories.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-4 font-medium text-white">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-xs">
                          {f.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{f.name}</p>
                          <p className="text-xs text-slate-400">{f.email || 'No email specified'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-indigo-400 font-semibold">{f.code}</td>
                    <td className="py-4 px-4 text-xs text-slate-300">
                      {f.city ? `${f.city}, ${f.state}` : f.address || '—'}
                    </td>
                    <td className="py-4 px-4 font-medium">{f.machineCount}</td>
                    <td className="py-4 px-4 font-medium">{f.userCount}</td>
                    <td className="py-4 px-4 text-xs">
                      {f.assignedAdmin ? (
                        <div>
                          <p className="font-medium text-slate-200">{f.assignedAdmin.name}</p>
                          <p className="text-[11px] text-slate-400">{f.assignedAdmin.email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          f.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            f.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        ></span>
                        <span>{f.status}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleViewDetails(f.id)}
                        title="View Detailed Statistics"
                        className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setShowEditModal(f);
                          setEditForm({
                            name: f.name,
                            address: f.address,
                            city: f.city,
                            state: f.state,
                            country: f.country,
                            phone: f.phone,
                            email: f.email,
                            timezone: f.timezone,
                          });
                        }}
                        title="Edit Factory Information"
                        className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(f)}
                        title={f.status === 'ACTIVE' ? 'Deactivate Factory' : 'Activate Factory'}
                        className={`p-1.5 rounded-lg hover:bg-slate-800 transition-colors ${
                          f.status === 'ACTIVE'
                            ? 'text-slate-400 hover:text-rose-400'
                            : 'text-slate-400 hover:text-emerald-400'
                        }`}
                      >
                        {f.status === 'ACTIVE' ? (
                          <XCircle className="w-5 h-5" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No factories match the search criteria.
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
            <h2 className="text-xl font-bold text-white">Create New Factory</h2>
            <p className="text-xs text-slate-400 mt-1">
              Add a new manufacturing facility to Shree Brahmanikrupa platform.
            </p>

            {formError && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300">Factory Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g. SBKT Katargam Unit"
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300">Factory Code *</label>
                  <input
                    type="text"
                    required
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SBKT02"
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Address</label>
                <input
                  type="text"
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  placeholder="Street / GIDC Industrial Estate"
                  className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300">City</label>
                  <input
                    type="text"
                    value={createForm.city}
                    onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                    placeholder="Surat"
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300">State</label>
                  <input
                    type="text"
                    value={createForm.state}
                    onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                    placeholder="Gujarat"
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300">Contact Phone</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+91-9876543210"
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300">Contact Email</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="factory@sbkt.com"
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
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
                  {submitting ? 'Creating...' : 'Create Factory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setShowEditModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-white">Edit Factory Information</h2>
            <p className="text-xs text-slate-400 mt-1">
              Stable code: <span className="font-mono text-indigo-400">{showEditModal.code}</span> (immutable)
            </p>

            {formError && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Factory Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Address</label>
                <input
                  type="text"
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300">City</label>
                  <input
                    type="text"
                    value={editForm.city || ''}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer / Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
            <button
              onClick={() => setShowDetailModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white">
                {showDetailModal.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{showDetailModal.name}</h2>
                <p className="text-xs font-mono text-indigo-400">Code: {showDetailModal.code}</p>
              </div>
            </div>

            {/* Counts Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-6">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <p className="text-[11px] text-slate-400">Users</p>
                <p className="text-lg font-bold text-white mt-0.5">{showDetailModal.counts.users}</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <p className="text-[11px] text-slate-400">Machines</p>
                <p className="text-lg font-bold text-white mt-0.5">{showDetailModal.counts.machines}</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <p className="text-[11px] text-slate-400">Yarns</p>
                <p className="text-lg font-bold text-white mt-0.5">{showDetailModal.counts.yarns}</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <p className="text-[11px] text-slate-400">Fabrics</p>
                <p className="text-lg font-bold text-white mt-0.5">{showDetailModal.counts.fabrics}</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <p className="text-[11px] text-slate-400">Beams</p>
                <p className="text-lg font-bold text-white mt-0.5">{showDetailModal.counts.beams}</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <p className="text-[11px] text-slate-400">Sheets</p>
                <p className="text-lg font-bold text-white mt-0.5">{showDetailModal.counts.productionSheets}</p>
              </div>
            </div>

            {/* Administrators */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-white mb-2">Factory Administrators</h3>
              {showDetailModal.admins.length > 0 ? (
                <div className="space-y-2">
                  {showDetailModal.admins.map((admin) => (
                    <div
                      key={admin.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{admin.name}</p>
                        <p className="text-xs text-slate-400">{admin.email}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded">
                        Active Administrator
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No administrators currently assigned.</p>
              )}
            </div>

            {/* Recent Activity */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-white mb-2">Recent Administrative Activity</h3>
              {showDetailModal.recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {showDetailModal.recentActivity.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-indigo-400">{log.action}</span>
                        <span className="text-slate-400 ml-2">by {log.actorName}</span>
                      </div>
                      <span className="text-slate-500 font-mono text-[10px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No activity logged yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
