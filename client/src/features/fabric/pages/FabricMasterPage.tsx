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
  Disc,
  Cpu,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { UserRole, ROLE_LABELS } from '@/features/auth/types/auth.types';
import type {
  Fabric,
  CreateFabricInput,
  UpdateFabricInput,
  FabricQueryParams,
  FabricPagination,
} from '../types/fabric.types';
import { FabricService } from '../services/fabric.service';
import { FabricTable } from '../components/FabricTable';
import { FabricFormDialog } from '../components/FabricFormDialog';
import { FabricDetailDialog } from '../components/FabricDetailDialog';
import { FabricStatusDialog } from '../components/FabricStatusDialog';
import axios from 'axios';

export const FabricMasterPage: React.FC = () => {
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
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [pagination, setPagination] = useState<FabricPagination>({
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
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // ── Modal State ─────────────────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [fabricToEdit, setFabricToEdit] = useState<Fabric | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const [selectedFabricForDetail, setSelectedFabricForDetail] = useState<Fabric | null>(null);
  const [fabricForStatusChange, setFabricForStatusChange] = useState<Fabric | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // ── Data Fetching ───────────────────────────────────────────────────────────
  const fetchFabrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: FabricQueryParams = {
        page: currentPage,
        limit: 10,
        search: activeSearch || undefined,
        isActive: isRestrictedToActive
          ? true
          : statusFilter === 'ACTIVE'
          ? true
          : statusFilter === 'INACTIVE'
          ? false
          : undefined,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      };

      const result = await FabricService.getFabrics(params);
      setFabrics(result.items);
      setPagination(result.pagination);
    } catch (err: unknown) {
      let msg = 'Failed to load fabric records.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        msg = err.response.data.message as string;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [currentPage, activeSearch, statusFilter, isRestrictedToActive]);

  useEffect(() => {
    void fetchFabrics();
  }, [fetchFabrics]);

  // ── Filter Handlers ─────────────────────────────────────────────────────────
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setActiveSearch('');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(activeSearch || statusFilter !== 'ALL');

  // ── Create / Edit ───────────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setFabricToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (fabric: Fabric) => {
    setFabricToEdit(fabric);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: CreateFabricInput | UpdateFabricInput) => {
    setIsSubmittingForm(true);
    try {
      if (fabricToEdit) {
        await FabricService.updateFabric(fabricToEdit.id, data as UpdateFabricInput);
        toast.success(`Fabric "${(data as UpdateFabricInput).name ?? fabricToEdit.name}" updated successfully.`);
      } else {
        await FabricService.createFabric(data as CreateFabricInput);
        toast.success(`Fabric "${(data as CreateFabricInput).name}" added successfully.`);
      }
      setIsFormOpen(false);
      setFabricToEdit(null);
      void fetchFabrics();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          toast.error(
            (err.response.data as { message?: string }).message ??
              'A fabric with the same name or code already exists in this factory.',
          );
        } else if ((err.response?.data as { message?: string })?.message) {
          toast.error((err.response!.data as { message: string }).message);
        } else {
          toast.error('Failed to save fabric. Please check your inputs.');
        }
      } else {
        toast.error('An unexpected error occurred.');
      }
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // ── Status Toggle ───────────────────────────────────────────────────────────
  const handleConfirmStatusToggle = async () => {
    if (!fabricForStatusChange) return;
    setIsUpdatingStatus(true);
    try {
      const nextStatus = !fabricForStatusChange.isActive;
      await FabricService.updateFabricStatus(fabricForStatusChange.id, nextStatus);
      toast.success(
        nextStatus
          ? `Fabric "${fabricForStatusChange.name}" activated.`
          : `Fabric "${fabricForStatusChange.name}" deactivated.`,
      );
      setFabricForStatusChange(null);
      void fetchFabrics();
    } catch (err: unknown) {
      let msg = 'Failed to update fabric status.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        msg = (err.response.data as { message: string }).message;
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

  const roleLabel = user ? (ROLE_LABELS[user.role] ?? user.role) : '';

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
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20"
              style={{ background: 'linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)' }}
            >
              <Factory size={18} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-100 font-display">SBKT</span>
              <span className="text-[10px] text-slate-500 block leading-tight">Loom Production</span>
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
            <Link
              to="/yarn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition"
            >
              <Layers size={14} /> Yarn Master
            </Link>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20">
              <Layers size={14} /> Fabric Master
            </span>
            <Link
              to="/beams"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition"
            >
              <Disc size={14} /> Beam Master
            </Link>
            <Link
              to="/machines"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition"
            >
              <Cpu size={14} /> Machines
            </Link>
          </nav>
        </div>

        {/* User Badge & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <UserIcon size={13} className="text-teal-400" />
            <span className="text-slate-300 font-medium">{user?.name}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
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
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
                <Layers size={20} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight font-display">
                Fabric Master
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Manage fabric specifications including yarn assignments, PPI, width, and wastage.
            </p>
          </div>

          {canManage && (
            <button
              onClick={handleOpenAdd}
              id="btn-add-fabric"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 transition shadow-lg shadow-teal-500/25 active:scale-[0.98]"
            >
              <Plus size={16} /> Add Fabric
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
                placeholder="Search fabric name or code..."
                className="w-full pl-10 pr-24 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-700 text-slate-200 hover:bg-teal-600 transition"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-2">
              {/* Status Filter */}
              {!isRestrictedToActive && (
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition font-medium"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              )}

              {/* Refresh */}
              <button
                onClick={() => void fetchFabrics()}
                title="Refresh list"
                disabled={loading}
                className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition disabled:opacity-50"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>

              {/* Clear Filters */}
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
            <Loader2 size={32} className="animate-spin text-teal-500" />
            <p className="text-sm font-medium">Loading fabric specifications...</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-center max-w-lg mx-auto">
            <AlertCircle size={36} className="text-rose-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-200 mb-1">Failed to load fabrics</h3>
            <p className="text-sm text-slate-400 mb-4">{error}</p>
            <button
              onClick={() => void fetchFabrics()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 transition"
            >
              Try Again
            </button>
          </div>
        ) : fabrics.length === 0 ? (
          <div className="py-16 px-4 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto mb-3 text-slate-500">
              <Layers size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-200 mb-1">
              {hasActiveFilters ? 'No matching fabrics found' : 'No fabric specifications configured'}
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-5">
              {hasActiveFilters
                ? 'Try adjusting your search keywords or clear filters to see all available fabrics.'
                : 'Create your first fabric specification to begin managing loom production parameters.'}
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-500 transition shadow-lg shadow-teal-500/20"
                >
                  + Add First Fabric
                </button>
              )
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <FabricTable
              fabrics={fabrics}
              startIndex={(pagination.page - 1) * pagination.limit + 1}
              canManage={canManage}
              onView={(fabric) => setSelectedFabricForDetail(fabric)}
              onEdit={(fabric) => handleOpenEdit(fabric)}
              onToggleStatus={(fabric) => setFabricForStatusChange(fabric)}
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
                of <strong className="text-slate-200">{pagination.totalItems}</strong> fabrics
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

      {/* ── Modals ── */}
      <FabricFormDialog
        isOpen={isFormOpen}
        fabricToEdit={fabricToEdit}
        isSubmitting={isSubmittingForm}
        onClose={() => {
          setIsFormOpen(false);
          setFabricToEdit(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <FabricDetailDialog
        fabric={selectedFabricForDetail}
        isOpen={Boolean(selectedFabricForDetail)}
        onClose={() => setSelectedFabricForDetail(null)}
      />

      <FabricStatusDialog
        fabric={fabricForStatusChange}
        isOpen={Boolean(fabricForStatusChange)}
        isUpdating={isUpdatingStatus}
        onClose={() => setFabricForStatusChange(null)}
        onConfirm={handleConfirmStatusToggle}
      />
    </div>
  );
};

export default FabricMasterPage;
