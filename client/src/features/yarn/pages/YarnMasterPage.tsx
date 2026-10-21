import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Layers,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Factory,
  LogOut,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Home,
  User as UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { UserRole, ROLE_LABELS } from '@/features/auth/types/auth.types';
import type {
  Yarn,
  YarnType,
  CreateYarnInput,
  UpdateYarnInput,
  YarnQueryParams,
  YarnPagination,
} from '../types/yarn.types';
import { YarnService } from '../services/yarn.service';
import { YarnTable } from '../components/YarnTable';
import { YarnFormDialog } from '../components/YarnFormDialog';
import { YarnDetailDialog } from '../components/YarnDetailDialog';
import { YarnStatusDialog } from '../components/YarnStatusDialog';
import axios from 'axios';

export const YarnMasterPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ── Permissions ─────────────────────────────────────────────────────────────
  const canManage = Boolean(
    user && (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.FACTORY_ADMIN),
  );
  const isRestrictedToActive = Boolean(
    user && (user.role === UserRole.OPERATOR || user.role === UserRole.VIEWER),
  );

  // ── Data & Fetch State ──────────────────────────────────────────────────────
  const [yarns, setYarns] = useState<Yarn[]>([]);
  const [pagination, setPagination] = useState<YarnPagination>({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [yarnTypeFilter, setYarnTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // ── Modals State ────────────────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [yarnToEdit, setYarnToEdit] = useState<Yarn | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const [selectedYarnForDetail, setSelectedYarnForDetail] = useState<Yarn | null>(null);
  const [yarnForStatusChange, setYarnForStatusChange] = useState<Yarn | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // ── Data Fetching ───────────────────────────────────────────────────────────
  const fetchYarns = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: YarnQueryParams = {
        page: currentPage,
        limit: 10,
        search: activeSearch || undefined,
        yarnType: yarnTypeFilter !== 'ALL' ? (yarnTypeFilter as YarnType) : undefined,
        isActive:
          isRestrictedToActive
            ? true
            : statusFilter === 'ACTIVE'
            ? true
            : statusFilter === 'INACTIVE'
            ? false
            : undefined,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      };

      const result = await YarnService.getYarns(params);
      setYarns(result.items);
      setPagination(result.pagination);
    } catch (err: unknown) {
      let msg = 'Failed to load yarn records.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        msg = err.response.data.message;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [currentPage, activeSearch, yarnTypeFilter, statusFilter, isRestrictedToActive]);

  useEffect(() => {
    void fetchYarns();
  }, [fetchYarns]);

  // ── Filter Handlers ─────────────────────────────────────────────────────────
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setActiveSearch('');
    setYarnTypeFilter('ALL');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    activeSearch || yarnTypeFilter !== 'ALL' || statusFilter !== 'ALL',
  );

  // ── Create / Edit Handlers ──────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setYarnToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (yarn: Yarn) => {
    setYarnToEdit(yarn);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: CreateYarnInput | UpdateYarnInput) => {
    setIsSubmittingForm(true);
    try {
      if (yarnToEdit) {
        await YarnService.updateYarn(yarnToEdit.id, data);
        toast.success(`Yarn "${data.name ?? yarnToEdit.name}" updated successfully.`);
      } else {
        await YarnService.createYarn(data as CreateYarnInput);
        toast.success(`Yarn "${data.name}" added successfully.`);
      }
      setIsFormOpen(false);
      setYarnToEdit(null);
      void fetchYarns();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          toast.error(
            'A yarn with the same name, denier, and type already exists in this factory.',
          );
        } else if (err.response?.data?.message) {
          toast.error(err.response.data.message);
        } else {
          toast.error('Failed to save yarn. Please check your inputs.');
        }
      } else {
        toast.error('An unexpected error occurred.');
      }
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // ── Status Toggle Handler ───────────────────────────────────────────────────
  const handleConfirmStatusToggle = async () => {
    if (!yarnForStatusChange) return;
    setIsUpdatingStatus(true);
    try {
      const nextStatus = !yarnForStatusChange.isActive;
      await YarnService.updateYarnStatus(yarnForStatusChange.id, nextStatus);
      toast.success(
        nextStatus
          ? `Yarn "${yarnForStatusChange.name}" activated.`
          : `Yarn "${yarnForStatusChange.name}" deactivated.`,
      );
      setYarnForStatusChange(null);
      void fetchYarns();
    } catch (err: unknown) {
      let msg = 'Failed to update yarn status.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        msg = err.response.data.message;
      }
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Logout failed.');
    }
  };

  const roleLabel = user ? ROLE_LABELS[user.role] ?? user.role : '';

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ backgroundColor: 'var(--color-surface-950, #060d1f)' }}
    >
      {/* ── Top Navigation Bar ── */}
      <header
        className="sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex items-center justify-between"
        style={{
          background: 'rgba(6,13,31,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-4">
          <Link to="/home" className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #06b6d4 100%)' }}
            >
              <Factory size={18} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-100 font-display">SBKT</span>
              <span className="text-[10px] text-slate-500 block leading-tight">
                Loom Production
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden sm:flex items-center gap-1 border-l border-slate-800 pl-4 ml-1">
            <Link
              to="/home"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition"
            >
              <Home size={14} /> Home
            </Link>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20">
              <Layers size={14} /> Yarn Master
            </span>
          </nav>
        </div>

        {/* User Badge & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <UserIcon size={13} className="text-blue-400" />
            <span className="text-slate-300 font-medium">{user?.name}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {roleLabel}
            </span>
          </div>

          <button
            onClick={() => void handleLogout()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition border border-slate-800"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* ── Main Body ── */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full">
        {/* Page Heading & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Layers size={20} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight font-display">
                Yarn Master
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Manage yarn specifications used in fabric production.
            </p>
          </div>

          {canManage && (
            <button
              onClick={handleOpenAdd}
              id="btn-add-yarn"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-500/25 active:scale-[0.98]"
            >
              <Plus size={16} /> Add Yarn
            </button>
          )}
        </div>

        {/* ── Filter / Search Bar ── */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-lg mb-6 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search yarn name or denier..."
                className="w-full pl-10 pr-24 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-700 text-slate-200 hover:bg-blue-600 transition"
              >
                Search
              </button>
            </form>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <select
                value={yarnTypeFilter}
                onChange={(e) => {
                  setYarnTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition font-medium"
              >
                <option value="ALL">All Types</option>
                <option value="WARP">WARP</option>
                <option value="WEFT">WEFT</option>
                <option value="BOTH">BOTH</option>
              </select>

              {/* Status Filter (Hidden if restricted to active only) */}
              {!isRestrictedToActive && (
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition font-medium"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              )}

              {/* Refresh Button */}
              <button
                onClick={() => void fetchYarns()}
                title="Refresh list"
                disabled={loading}
                className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition disabled:opacity-50"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  title="Clear all filters"
                  className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <X size={13} /> Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Content States ── */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 size={32} className="animate-spin text-blue-500" />
            <p className="text-sm font-medium">Loading yarn specifications...</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-center max-w-lg mx-auto">
            <AlertCircle size={36} className="text-rose-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-200 mb-1">Failed to load yarns</h3>
            <p className="text-sm text-slate-400 mb-4">{error}</p>
            <button
              onClick={() => void fetchYarns()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 transition"
            >
              Try Again
            </button>
          </div>
        ) : yarns.length === 0 ? (
          <div className="py-16 px-4 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto mb-3 text-slate-500">
              <Layers size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-200 mb-1">
              {hasActiveFilters ? 'No matching yarns found' : 'No yarn specifications configured'}
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-5">
              {hasActiveFilters
                ? 'Try adjusting your search keywords or clear filters to see all available yarns.'
                : 'Create your first yarn specification to begin managing fabric warp and weft parameters.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Clear Filters
              </button>
            ) : (
              canManage && (
                <button
                  onClick={handleOpenAdd}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition shadow-lg shadow-blue-500/20"
                >
                  + Add First Yarn
                </button>
              )
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <YarnTable
              yarns={yarns}
              startIndex={(pagination.page - 1) * pagination.limit + 1}
              canManage={canManage}
              onView={(yarn) => setSelectedYarnForDetail(yarn)}
              onEdit={(yarn) => handleOpenEdit(yarn)}
              onToggleStatus={(yarn) => setYarnForStatusChange(yarn)}
            />

            {/* ── Pagination ── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 text-xs text-slate-400">
              <div>
                Showing{' '}
                <strong className="text-slate-200">
                  {(pagination.page - 1) * pagination.limit + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-200">
                  {Math.min(pagination.page * pagination.limit, pagination.totalItems)}
                </strong>{' '}
                of <strong className="text-slate-200">{pagination.totalItems}</strong> yarns
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 transition"
                >
                  <ChevronLeft size={14} /> Previous
                </button>

                <span className="px-2 font-medium text-slate-300">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 transition"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Modals & Dialogs ── */}
      <YarnFormDialog
        isOpen={isFormOpen}
        yarnToEdit={yarnToEdit}
        isSubmitting={isSubmittingForm}
        onClose={() => {
          setIsFormOpen(false);
          setYarnToEdit(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <YarnDetailDialog
        yarn={selectedYarnForDetail}
        isOpen={Boolean(selectedYarnForDetail)}
        onClose={() => setSelectedYarnForDetail(null)}
      />

      <YarnStatusDialog
        yarn={yarnForStatusChange}
        isOpen={Boolean(yarnForStatusChange)}
        isUpdating={isUpdatingStatus}
        onClose={() => setYarnForStatusChange(null)}
        onConfirm={handleConfirmStatusToggle}
      />
    </div>
  );
};
export default YarnMasterPage;
