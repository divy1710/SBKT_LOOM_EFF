import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Cpu,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  LogOut,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Home,
  User as UserIcon,
  Play,
  Square,
  Wrench,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { UserRole, ROLE_LABELS } from '@/features/auth/types/auth.types';
import type {
  Machine,
  CreateMachineInput,
  UpdateMachineInput,
  UpdateMachineStatusInput,
  BatchUpdateMachineInput,
  MachineQueryParams,
  MachinePagination,
  MachineLoadBeamInput,
  MachineUnloadBeamInput,
} from '../types/machine.types';
import { MachineStatus } from '../types/machine.types';
import { MachineService, type FabricOption } from '../services/machine.service';
import { MachineTable } from '../components/MachineTable';
import { MachineFormDialog } from '../components/MachineFormDialog';
import { MachineStatusDialog } from '../components/MachineStatusDialog';
import { MachineBatchEditDialog } from '../components/MachineBatchEditDialog';
import { MachineLoadBeamDialog } from '../components/MachineLoadBeamDialog';
import { MachineUnloadBeamDialog } from '../components/MachineUnloadBeamDialog';
import axios from 'axios';

export const MachineListPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Logout failed.');
    }
  };

  // ── Permissions ─────────────────────────────────────────────────────────────
  const canManage = Boolean(
    user &&
      (user.role === UserRole.SUPER_ADMIN ||
        user.role === UserRole.FACTORY_ADMIN ||
        user.role === UserRole.MANAGER),
  );
  const canOperate = Boolean(
    user &&
      (user.role === UserRole.SUPER_ADMIN ||
        user.role === UserRole.FACTORY_ADMIN ||
        user.role === UserRole.MANAGER ||
        user.role === UserRole.OPERATOR),
  );

  // ── Data & Fetch State ──────────────────────────────────────────────────────
  const [machines, setMachines] = useState<Machine[]>([]);
  const [pagination, setPagination] = useState<MachinePagination>({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filters & Search ────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MachineStatus | ''>('');
  const [fabricFilter, setFabricFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('true');

  // Dropdown fabrics
  const [fabrics, setFabrics] = useState<FabricOption[]>([]);

  // ── Selection State for Batch Edit ──────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ── Modal Dialog States ─────────────────────────────────────────────────────
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusMachine, setStatusMachine] = useState<Machine | null>(null);

  const [batchDialogOpen, setBatchDialogOpen] = useState(false);

  const [loadBeamDialogOpen, setLoadBeamDialogOpen] = useState(false);
  const [loadBeamMachine, setLoadBeamMachine] = useState<Machine | null>(null);

  const [unloadBeamDialogOpen, setUnloadBeamDialogOpen] = useState(false);
  const [unloadBeamMachine, setUnloadBeamMachine] = useState<Machine | null>(null);

  // ── Load Fabric Options ─────────────────────────────────────────────────────
  useEffect(() => {
    MachineService.getActiveFabrics()
      .then((f) => setFabrics(f))
      .catch(() => {});
  }, []);

  // ── Fetch Machines ──────────────────────────────────────────────────────────
  const fetchMachines = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params: MachineQueryParams = {
          page,
          limit: pagination.limit,
          search: activeSearch || undefined,
          status: statusFilter || undefined,
          fabricId: fabricFilter || undefined,
          isActive: activeFilter === 'all' ? 'all' : activeFilter === 'true',
          sortBy: 'machineNumber',
          sortOrder: 'asc',
        };

        const result = await MachineService.getMachines(params);
        setMachines(result.machines);
        setPagination(result.pagination);
        // Clear selection if machines changed
        setSelectedIds([]);
      } catch (err: unknown) {
        let msg = 'Failed to load machines.';
        if (axios.isAxiosError(err)) {
          msg = err.response?.data?.message || err.message;
        } else if (err instanceof Error) {
          msg = err.message;
        }
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, activeSearch, statusFilter, fabricFilter, activeFilter],
  );

  useEffect(() => {
    void fetchMachines(1);
  }, [fetchMachines]);

  // ── Search handler ──────────────────────────────────────────────────────────
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setActiveSearch('');
  };

  // ── Selection handlers ──────────────────────────────────────────────────────
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === machines.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(machines.map((m) => m.id));
    }
  };

  // ── Form Actions ────────────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingMachine(null);
    setFormDialogOpen(true);
  };

  const handleOpenEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setFormDialogOpen(true);
  };

  const handleFormSubmit = async (data: CreateMachineInput | UpdateMachineInput) => {
    if (editingMachine) {
      await MachineService.updateMachine(editingMachine.id, data as UpdateMachineInput);
      toast.success(`Machine ${editingMachine.machineNumber} updated successfully.`);
    } else {
      await MachineService.createMachine(data as CreateMachineInput);
      toast.success('Machine created successfully.');
    }
    void fetchMachines(pagination.page);
  };

  // ── Status Action ───────────────────────────────────────────────────────────
  const handleOpenStatus = (machine: Machine) => {
    setStatusMachine(machine);
    setStatusDialogOpen(true);
  };

  const handleStatusSubmit = async (machineId: string, data: UpdateMachineStatusInput) => {
    await MachineService.updateMachineStatus(machineId, data);
    toast.success('Machine status updated successfully.');
    void fetchMachines(pagination.page);
  };

  // ── Active Toggle Action ────────────────────────────────────────────────────
  const handleToggleActive = async (machine: Machine) => {
    try {
      const updated = await MachineService.toggleMachineActive(machine.id);
      const actionLabel = updated.isActive ? 'activated' : 'deactivated';
      toast.success(`Machine ${machine.machineNumber} ${actionLabel}.`);
      void fetchMachines(pagination.page);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update machine state';
      toast.error(msg);
    }
  };

  // ── Batch Edit ──────────────────────────────────────────────────────────────
  const handleOpenBatch = () => {
    if (selectedIds.length === 0) return;
    setBatchDialogOpen(true);
  };

  const handleBatchSubmit = async (data: BatchUpdateMachineInput) => {
    return MachineService.batchUpdateMachines(data);
  };

  // ── Load & Unload Beam ──────────────────────────────────────────────────────
  const handleOpenLoadBeam = (machine: Machine) => {
    setLoadBeamMachine(machine);
    setLoadBeamDialogOpen(true);
  };

  const handleLoadBeamSubmit = async (machineId: string, data: MachineLoadBeamInput) => {
    await MachineService.loadBeam(machineId, data);
    void fetchMachines(pagination.page);
  };

  const handleOpenUnloadBeam = (machine: Machine) => {
    setUnloadBeamMachine(machine);
    setUnloadBeamDialogOpen(true);
  };

  const handleUnloadBeamSubmit = async (machineId: string, data: MachineUnloadBeamInput) => {
    await MachineService.unloadBeam(machineId, data);
    void fetchMachines(pagination.page);
  };

  // Stats calculation
  const runningCount = machines.filter((m) => m.status === MachineStatus.RUNNING).length;
  const stoppedCount = machines.filter((m) => m.status === MachineStatus.STOPPED).length;
  const maintenanceCount = machines.filter((m) => m.status === MachineStatus.MAINTENANCE).length;
  const selectedMachines = machines.filter((m) => selectedIds.includes(m.id));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Left: Brand + Breadcrumbs */}
          <div className="flex items-center gap-3">
            <Link
              to="/home"
              className="flex items-center gap-2 text-slate-400 hover:text-slate-100 transition text-sm font-medium"
            >
              <Home size={15} />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <span className="text-slate-700">/</span>
            <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm">
              <div className="p-1 rounded-lg bg-teal-500/10">
                <Cpu size={15} />
              </div>
              Machine Management
            </div>
          </div>

          {/* Right: User Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-semibold">
                {user?.name?.charAt(0).toUpperCase() || <UserIcon size={13} />}
              </div>
              <span className="hidden sm:inline font-medium text-slate-200">{user?.name}</span>
              <span className="hidden lg:inline text-[11px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-medium">
                {user ? ROLE_LABELS[user.role] : ''}
              </span>
            </div>
            <button
              onClick={() => void handleLogout()}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Title Bar & Top Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
              <span>Machine Management</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage loom configurations, status, and beam assignments.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {canManage && (
              <>
                <button
                  onClick={handleOpenBatch}
                  disabled={selectedIds.length === 0}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
                    selectedIds.length > 0
                      ? 'bg-slate-800 hover:bg-slate-700 text-teal-300 border-teal-500/30'
                      : 'bg-slate-900/40 text-slate-500 border-slate-800 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <SlidersHorizontal size={14} />
                  <span>Batch Edit</span>
                  {selectedIds.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-400 text-[10px]">
                      {selectedIds.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleOpenAdd}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 transition shadow-lg shadow-teal-500/20"
                >
                  <Plus size={15} />
                  <span>Add Machine</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Total Machines</span>
            <span className="text-xl font-bold font-mono text-slate-100 mt-0.5 block">
              {pagination.totalItems}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 block font-medium">Running</span>
              <Play size={13} className="text-emerald-400" />
            </div>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
              {runningCount}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 block font-medium">Stopped</span>
              <Square size={13} className="text-rose-400" />
            </div>
            <span className="text-xl font-bold font-mono text-rose-400 mt-0.5 block">
              {stoppedCount}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 block font-medium">Maintenance</span>
              <Wrench size={13} className="text-amber-400" />
            </div>
            <span className="text-xl font-bold font-mono text-amber-400 mt-0.5 block">
              {maintenanceCount}
            </span>
          </div>
        </div>

        {/* ── Toolbar: Search & Filters ─────────────────────────────────────── */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by machine number or name..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-800/70 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X size={13} />
              </button>
            )}
          </form>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as MachineStatus | '')}
              className="px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:border-teal-500 transition cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value={MachineStatus.RUNNING}>Running</option>
              <option value={MachineStatus.STOPPED}>Stopped</option>
              <option value={MachineStatus.MAINTENANCE}>Maintenance</option>
            </select>

            {/* Fabric Filter */}
            <select
              value={fabricFilter}
              onChange={(e) => setFabricFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:border-teal-500 transition cursor-pointer max-w-[160px] truncate"
            >
              <option value="">All Fabrics</option>
              {fabrics.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code} - {f.name}
                </option>
              ))}
            </select>

            {/* Active Status Filter */}
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as 'all' | 'true' | 'false')}
              className="px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:border-teal-500 transition cursor-pointer"
            >
              <option value="true">Active Records</option>
              <option value="false">Inactive Records</option>
              <option value="all">All Records</option>
            </select>

            {/* Refresh */}
            <button
              onClick={() => void fetchMachines(pagination.page)}
              title="Refresh machine list"
              className="p-2 rounded-xl bg-slate-800/70 border border-slate-700/80 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── Table Content ─────────────────────────────────────────────────── */}
        {loading && machines.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 size={32} className="animate-spin text-teal-400" />
            <p className="text-xs">Loading machine records...</p>
          </div>
        ) : error && machines.length === 0 ? (
          <div className="py-16 px-4 text-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-2">
            <AlertCircle size={32} className="mx-auto text-rose-400" />
            <p className="font-semibold text-sm">Failed to load machines</p>
            <p className="text-xs text-rose-400/80">{error}</p>
            <button
              onClick={() => void fetchMachines(pagination.page)}
              className="mt-3 px-4 py-1.5 rounded-lg text-xs bg-slate-900 text-slate-200 border border-slate-700 hover:bg-slate-800"
            >
              Retry
            </button>
          </div>
        ) : machines.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
              <Cpu size={24} />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">No machine records found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {activeSearch || statusFilter || fabricFilter
                ? 'No machines matched your current search filters.'
                : 'Get started by creating your factory looms and waterjet machines.'}
            </p>
            {canManage && !activeSearch && !statusFilter && !fabricFilter && (
              <button
                onClick={handleOpenAdd}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 transition"
              >
                <Plus size={14} /> Add First Machine
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <MachineTable
              machines={machines}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              onView={(m) => navigate(`/machines/${m.id}`)}
              onEdit={handleOpenEdit}
              onChangeStatus={handleOpenStatus}
              onToggleActive={handleToggleActive}
              onLoadBeam={handleOpenLoadBeam}
              onUnloadBeam={handleOpenUnloadBeam}
              canManage={canManage}
              canOperate={canOperate}
            />

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 px-1">
                <span>
                  Showing {machines.length} of {pagination.totalItems} machines
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void fetchMachines(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="font-mono px-2">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => void fetchMachines(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Dialog Modals ──────────────────────────────────────────────────── */}
      {formDialogOpen && (
        <MachineFormDialog
          isOpen={formDialogOpen}
          onClose={() => setFormDialogOpen(false)}
          onSubmit={handleFormSubmit}
          initialData={editingMachine}
        />
      )}

      {statusDialogOpen && (
        <MachineStatusDialog
          isOpen={statusDialogOpen}
          onClose={() => setStatusDialogOpen(false)}
          machine={statusMachine}
          onSubmit={handleStatusSubmit}
        />
      )}

      {batchDialogOpen && (
        <MachineBatchEditDialog
          isOpen={batchDialogOpen}
          onClose={() => setBatchDialogOpen(false)}
          selectedMachines={selectedMachines}
          onSubmit={handleBatchSubmit}
          onSuccess={() => void fetchMachines(pagination.page)}
        />
      )}

      {loadBeamDialogOpen && (
        <MachineLoadBeamDialog
          isOpen={loadBeamDialogOpen}
          onClose={() => setLoadBeamDialogOpen(false)}
          machine={loadBeamMachine}
          onSubmit={handleLoadBeamSubmit}
        />
      )}

      {unloadBeamDialogOpen && (
        <MachineUnloadBeamDialog
          isOpen={unloadBeamDialogOpen}
          onClose={() => setUnloadBeamDialogOpen(false)}
          machine={unloadBeamMachine}
          onSubmit={handleUnloadBeamSubmit}
        />
      )}
    </div>
  );
};
