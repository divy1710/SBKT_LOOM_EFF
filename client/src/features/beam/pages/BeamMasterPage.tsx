import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Disc,
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
  AlertTriangle,
  Cpu,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { UserRole, ROLE_LABELS } from '@/features/auth/types/auth.types';
import type {
  Beam,
  CreateBeamInput,
  UpdateBeamInput,
  BeamQueryParams,
  BeamPagination,
} from '../types/beam.types';
import { BeamStatus } from '../types/beam.types';
import { BeamService } from '../services/beam.service';
import { BeamTable } from '../components/BeamTable';
import { BeamFormDialog } from '../components/BeamFormDialog';
import { BeamDetailDialog } from '../components/BeamDetailDialog';
import { BeamStatusDialog } from '../components/BeamStatusDialog';
import { BeamLoadDialog } from '../components/BeamLoadDialog';
import axios from 'axios';

export const BeamMasterPage: React.FC = () => {
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

  // ── State ───────────────────────────────────────────────────────────────────
  const [beams, setBeams] = useState<Beam[]>([]);
  const [pagination, setPagination] = useState<BeamPagination>({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [lowMetersOnly, setLowMetersOnly] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>('true');
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [beamToEdit, setBeamToEdit] = useState<Beam | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [detailBeam, setDetailBeam] = useState<Beam | null>(null);
  const [statusBeam, setStatusBeam] = useState<Beam | null>(null);

  const [loadDialogState, setLoadDialogState] = useState<{
    isOpen: boolean;
    beam: Beam | null;
    mode: 'load' | 'unload';
  }>({
    isOpen: false,
    beam: null,
    mode: 'load',
  });

  // ── Fetch Beams ─────────────────────────────────────────────────────────────
  const fetchBeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: BeamQueryParams = {
        page: currentPage,
        limit: 10,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      };
      if (activeSearch.trim()) params.search = activeSearch.trim();
      if (statusFilter) params.status = statusFilter as BeamStatus;
      if (lowMetersOnly) params.lowMeters = true;
      if (activeFilter !== 'all') params.isActive = activeFilter === 'true';

      const result = await BeamService.getBeams(params);
      setBeams(result.items);
      setPagination(result.pagination);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to load beams');
      } else {
        setError('An unexpected error occurred while fetching beams');
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, activeSearch, statusFilter, lowMetersOnly, activeFilter]);

  useEffect(() => {
    fetchBeams();
  }, [fetchBeams]);

  // Handle Search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setActiveSearch('');
    setCurrentPage(1);
  };

  // ── Form Submissions (Create / Edit) ─────────────────────────────────────────
  const handleFormSubmit = async (data: CreateBeamInput | UpdateBeamInput) => {
    setIsSubmitting(true);
    try {
      if (beamToEdit) {
        await BeamService.updateBeam(beamToEdit.id, data as UpdateBeamInput);
        toast.success(`Beam ${beamToEdit.beamNumber} updated successfully`);
      } else {
        await BeamService.createBeam(data as CreateBeamInput);
        toast.success('New beam registered into Godown successfully');
      }
      setIsFormOpen(false);
      setBeamToEdit(null);
      fetchBeams();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || 'Operation failed');
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Soft Toggle Active Status ───────────────────────────────────────────────
  const handleToggleStatusConfirm = async () => {
    if (!statusBeam) return;
    setIsSubmitting(true);
    try {
      const updated = await BeamService.toggleBeamActive(statusBeam.id, !statusBeam.isActive);
      toast.success(
        `Beam ${updated.beamNumber} ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
      );
      setStatusBeam(null);
      fetchBeams();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || 'Failed to update beam status');
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Load & Unload Handlers ──────────────────────────────────────────────────
  const handleLoadSubmit = async (machineNumber?: string, notes?: string) => {
    if (!loadDialogState.beam) return;
    setIsSubmitting(true);
    try {
      await BeamService.loadBeam(loadDialogState.beam.id, { machineNumber, notes });
      toast.success(`Beam ${loadDialogState.beam.beamNumber} loaded onto machine successfully`);
      setLoadDialogState({ isOpen: false, beam: null, mode: 'load' });
      fetchBeams();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || 'Failed to load beam');
      } else {
        toast.error('Failed to load beam');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnloadSubmit = async (
    outcomeStatus: BeamStatus.IN_GODOWN | BeamStatus.FINISHED | BeamStatus.SHORTAGE,
    endingMeters?: number,
    notes?: string,
  ) => {
    if (!loadDialogState.beam) return;
    setIsSubmitting(true);
    try {
      await BeamService.unloadBeam(loadDialogState.beam.id, {
        outcomeStatus,
        endingMeters,
        notes,
      });
      toast.success(`Beam ${loadDialogState.beam.beamNumber} unloaded successfully`);
      setLoadDialogState({ isOpen: false, beam: null, mode: 'unload' });
      fetchBeams();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || 'Failed to unload beam');
      } else {
        toast.error('Failed to unload beam');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick stats
  const inGodownCount = beams.filter((b) => b.status === BeamStatus.IN_GODOWN).length;
  const loadedCount = beams.filter((b) => b.status === BeamStatus.LOADED).length;
  const lowMetersCount = beams.filter((b) => b.isLowMeters).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Left: Brand + Breadcrumb */}
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
                <Disc size={15} />
              </div>
              Beam Master
            </div>
            <Link
              to="/machines"
              className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition font-medium border-l border-slate-800 pl-3 ml-1"
            >
              <Cpu size={14} />
              <span>Machines</span>
            </Link>
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
        {/* Title Bar & Quick Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
              <span>Beam Master</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage beam inventory, fabric specifications, and loading status
            </p>
          </div>

          {/* Add Beam Button */}
          {canManage && (
            <button
              onClick={() => {
                setBeamToEdit(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm shadow-lg shadow-teal-500/20 transition cursor-pointer self-start sm:self-auto"
            >
              <Plus size={16} />
              Add Beam
            </button>
          )}
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              Total Beams
            </div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-1">
              {pagination.totalItems}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-[11px] text-blue-400 font-semibold uppercase tracking-wider">
              In Godown
            </div>
            <div className="text-xl font-bold font-mono text-blue-300 mt-1">
              {inGodownCount}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">
              Loaded on Loom
            </div>
            <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
              {loadedCount}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={11} /> Low Meters
            </div>
            <div className="text-xl font-bold font-mono text-amber-300 mt-1">
              {lowMetersCount}
            </div>
          </div>
        </div>

        {/* ── Filters & Search Controls ─────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by beam number or pipe..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
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

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">All Statuses</option>
              <option value={BeamStatus.IN_GODOWN}>In Godown</option>
              <option value={BeamStatus.LOADED}>Loaded</option>
              <option value={BeamStatus.FINISHED}>Finished</option>
              <option value={BeamStatus.SHORTAGE}>Shortage</option>
            </select>

            {/* Low Meters Checkbox */}
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 cursor-pointer hover:bg-slate-800 transition">
              <input
                type="checkbox"
                checked={lowMetersOnly}
                onChange={(e) => {
                  setLowMetersOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="rounded border-slate-700 text-teal-600 focus:ring-teal-500"
              />
              <span className="flex items-center gap-1">
                <AlertTriangle size={12} className="text-amber-400" />
                Low Meters Only
              </span>
            </label>

            {/* Active Status Filter */}
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="true">Active Only</option>
              <option value="false">Archived Only</option>
              <option value="all">All Beams</option>
            </select>

            {/* Refresh */}
            <button
              onClick={() => fetchBeams()}
              title="Refresh"
              className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-400 hover:text-slate-200 transition"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── Content Table Area ────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={32} className="animate-spin text-teal-400 mb-3" />
            <p className="text-xs">Loading beam inventory…</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-between p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchBeams()}
              className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-medium transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : beams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-slate-800/80 bg-slate-900/30 p-8">
            <div className="p-3.5 rounded-2xl bg-teal-500/10 text-teal-400 mb-3">
              <Disc size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-200">No beams found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {activeSearch || statusFilter || lowMetersOnly
                ? 'No beams match the selected filters. Try clearing your search parameters.'
                : 'No beam specifications registered yet. Add a new beam into Godown inventory.'}
            </p>
            {canManage && !activeSearch && !statusFilter && (
              <button
                onClick={() => {
                  setBeamToEdit(null);
                  setIsFormOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-lg shadow-teal-500/20 transition cursor-pointer"
              >
                <Plus size={14} />
                Register First Beam
              </button>
            )}
          </div>
        ) : (
          <>
            <BeamTable
              beams={beams}
              startIndex={(pagination.page - 1) * pagination.limit + 1}
              canManage={canManage}
              canOperate={canOperate}
              onView={(b) => setDetailBeam(b)}
              onEdit={(b) => {
                setBeamToEdit(b);
                setIsFormOpen(true);
              }}
              onToggleStatus={(b) => setStatusBeam(b)}
              onLoad={(b) =>
                setLoadDialogState({
                  isOpen: true,
                  beam: b,
                  mode: 'load',
                })
              }
              onUnload={(b) =>
                setLoadDialogState({
                  isOpen: true,
                  beam: b,
                  mode: 'unload',
                })
              }
            />

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
                <span>
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.totalItems)} of{' '}
                  {pagination.totalItems} beams
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 transition"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="font-mono text-slate-200 px-2 font-medium">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 transition"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
      <BeamFormDialog
        isOpen={isFormOpen}
        beamToEdit={beamToEdit}
        isSubmitting={isSubmitting}
        onClose={() => {
          setIsFormOpen(false);
          setBeamToEdit(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <BeamDetailDialog
        beam={detailBeam}
        isOpen={Boolean(detailBeam)}
        onClose={() => setDetailBeam(null)}
        onEdit={(b) => {
          setDetailBeam(null);
          setBeamToEdit(b);
          setIsFormOpen(true);
        }}
        canManage={canManage}
      />

      <BeamStatusDialog
        beam={statusBeam}
        isOpen={Boolean(statusBeam)}
        isSubmitting={isSubmitting}
        onClose={() => setStatusBeam(null)}
        onConfirm={handleToggleStatusConfirm}
      />

      <BeamLoadDialog
        beam={loadDialogState.beam}
        mode={loadDialogState.mode}
        isOpen={loadDialogState.isOpen}
        isSubmitting={isSubmitting}
        onClose={() =>
          setLoadDialogState({
            isOpen: false,
            beam: null,
            mode: 'load',
          })
        }
        onLoadSubmit={handleLoadSubmit}
        onUnloadSubmit={handleUnloadSubmit}
      />
    </div>
  );
};
