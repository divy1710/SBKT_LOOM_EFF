import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Factory,
  User,
  Shield,
  ChevronRight,
  Cpu,
  BarChart3,
  Layers,
  Workflow,
  Loader2,
  Disc,
  Settings,
  Building2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROLE_LABELS, UserRole } from '@/features/auth/types/auth.types';
import { useState } from 'react';

const UPCOMING_MODULES: Array<{ icon: any; title: string; desc: string; color: string }> = [];

const ACTIVE_MODULES = [
  {
    path: '/yarn',
    title: 'Yarn Master',
    desc: 'Manage yarn specifications, denier count, warp & weft assignments, rates, and active status.',
    gradient: 'from-blue-900/30 via-slate-900/40 to-cyan-900/20',
    hoverGradient: 'hover:from-blue-900/40',
    border: 'border-blue-500/30 hover:border-blue-500/60',
    iconBg: 'from-blue-500 to-cyan-400',
    icon: Layers,
    shadow: 'shadow-blue-500/20',
    textColor: 'text-blue-400 hover:text-blue-300',
    linkColor: 'text-blue-400',
  },
  {
    path: '/fabrics',
    title: 'Fabric Master',
    desc: 'Define fabric codes, warp/weft yarn assignments, PPI, panno, and wastage parameters.',
    gradient: 'from-teal-900/30 via-slate-900/40 to-cyan-900/20',
    hoverGradient: 'hover:from-teal-900/40',
    border: 'border-teal-500/30 hover:border-teal-500/60',
    iconBg: 'from-teal-500 to-emerald-400',
    icon: Layers,
    shadow: 'shadow-teal-500/20',
    textColor: 'text-teal-400 hover:text-teal-300',
    linkColor: 'text-teal-400',
  },
  {
    path: '/beams',
    title: 'Beam Master',
    desc: 'Track beam godown inventory, fabric assignments, meters, loom loading, and low-meter alerts.',
    gradient: 'from-amber-900/30 via-slate-900/40 to-teal-900/20',
    hoverGradient: 'hover:from-amber-900/40',
    border: 'border-amber-500/30 hover:border-amber-500/60',
    iconBg: 'from-amber-500 to-teal-400',
    icon: Disc,
    shadow: 'shadow-amber-500/20',
    textColor: 'text-amber-400 hover:text-amber-300',
    linkColor: 'text-amber-400',
  },
  {
    path: '/machines',
    title: 'Machine Management',
    desc: 'Configure loom operating RPM, PPI, status, fabric quality, batch editing, and beam loading.',
    gradient: 'from-cyan-900/30 via-slate-900/40 to-blue-900/20',
    hoverGradient: 'hover:from-cyan-900/40',
    border: 'border-cyan-500/30 hover:border-cyan-500/60',
    iconBg: 'from-cyan-500 to-blue-500',
    icon: Cpu,
    shadow: 'shadow-cyan-500/20',
    textColor: 'text-cyan-400 hover:text-cyan-300',
    linkColor: 'text-cyan-400',
  },
  {
    path: '/production-sheets',
    title: 'Production Sheets',
    desc: 'Daily shift recording, Day/Night shift, automatic theoretical calculations, and PDF/Excel export.',
    gradient: 'from-amber-900/30 via-slate-900/40 to-orange-900/20',
    hoverGradient: 'hover:from-amber-900/40',
    border: 'border-amber-500/30 hover:border-amber-500/60',
    iconBg: 'from-amber-500 to-orange-500',
    icon: Workflow,
    shadow: 'shadow-amber-500/20',
    textColor: 'text-amber-400 hover:text-amber-300',
    linkColor: 'text-amber-400',
  },
  {
    path: '/analytics/production',
    title: 'Production Analytics & Efficiency',
    desc: 'Volume trends, machine yield analysis, fabric distribution, performance rankings, and OEE.',
    gradient: 'from-indigo-900/30 via-slate-900/40 to-purple-900/20',
    hoverGradient: 'hover:from-indigo-900/40',
    border: 'border-indigo-500/30 hover:border-indigo-500/60',
    iconBg: 'from-indigo-500 to-purple-500',
    icon: BarChart3,
    shadow: 'shadow-indigo-500/20',
    textColor: 'text-indigo-400 hover:text-indigo-300',
    linkColor: 'text-indigo-400',
  },
  {
    path: '/settings',
    title: 'Settings & System Configuration',
    desc: 'Factory profile, shift durations, appearance themes, Gujarati/Hindi language, and account security.',
    gradient: 'from-slate-900/40 via-blue-900/20 to-slate-900/40',
    hoverGradient: 'hover:from-slate-800/50',
    border: 'border-slate-700/50 hover:border-blue-500/60',
    iconBg: 'from-slate-700 to-blue-600',
    icon: Settings,
    shadow: 'shadow-blue-500/20',
    textColor: 'text-blue-400 hover:text-blue-300',
    linkColor: 'text-blue-400',
  },
];

export default function AuthenticatedHomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success('You have been signed out.');
      navigate('/login', { replace: true });
    } catch {
      toast.error('Logout failed — please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  if (!user) return null;

  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: 'var(--color-surface-950)' }}>
      {/* ── Top Nav ── */}
      <header
        className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between"
        style={{
          background: 'rgba(6,13,31,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #06b6d4 100%)' }}
            >
              <Factory size={18} className="text-white" />
            </div>
            <div>
              <p
                className="text-xs font-bold text-slate-100"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {user.factoryName || 'SBKT'}
              </p>
              <p className="text-[10px] text-slate-500 leading-none">Loom Management System</p>
            </div>
          </div>

          <nav className="hidden sm:flex items-center gap-1 border-l border-slate-800 pl-4 ml-1">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20">
              <Layers size={14} /> Home
            </span>
            <button
              onClick={() => navigate('/yarn')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition"
            >
              <Layers size={14} /> Yarn Master
            </button>
            <button
              onClick={() => navigate('/fabrics')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition"
            >
              <Layers size={14} /> Fabric Master
            </button>
            <button
              onClick={() => navigate('/beams')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition"
            >
              <Disc size={14} /> Beam Master
            </button>
            <button
              id="nav-settings"
              onClick={() => navigate('/settings')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition"
            >
              <Settings size={14} /> Settings
            </button>
            {user.role === UserRole.SUPER_ADMIN && (
              <button
                onClick={() => navigate('/super-admin')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 transition ml-2"
              >
                <Sparkles size={14} /> Super Admin Panel
              </button>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {user.role === UserRole.SUPER_ADMIN && (
            <button
              onClick={() => navigate('/super-admin')}
              className="sm:hidden flex items-center justify-center w-9 h-9 rounded-xl text-indigo-300 hover:text-white bg-indigo-950/60 border border-indigo-500/40 transition"
              title="Super Admin Panel"
            >
              <Sparkles size={16} />
            </button>
          )}
          <button
            onClick={() => navigate('/settings')}
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-xl text-slate-300 hover:text-white bg-slate-800/60 border border-slate-700/60 transition"
            title="Settings"
          >
            <Settings size={16} />
          </button>
          <button
            id="btn-logout"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-300 transition-all duration-200 disabled:opacity-50"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-10 max-w-5xl mx-auto w-full">
        {/* Welcome card */}
        <div
          className="rounded-2xl p-6 sm:p-8 mb-8 animate-fade-in"
          style={{
            background:
              'linear-gradient(135deg, rgba(29,78,216,0.18) 0%, rgba(6,182,212,0.08) 100%)',
            border: '1px solid rgba(59,130,246,0.2)',
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(37,99,235,0.2)' }}
            >
              <User size={24} className="text-blue-400" />
            </div>
            <div>
              <h1
                className="text-2xl font-bold text-slate-100 mb-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Welcome, {user.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: 'rgba(37,99,235,0.2)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    color: '#93c5fd',
                  }}
                >
                  <Shield size={11} />
                  {roleLabel}
                </span>
                <span className="text-xs text-slate-500">{user.email}</span>
              </div>
              <p className="text-sm text-slate-400">
                You are signed in to the SBKT Loom Production &amp; Efficiency Management System.
                Phase 11 — Super Admin Panel &amp; Multi-Factory Management — is active.
              </p>
            </div>
          </div>
        </div>

        {/* Super Admin Card for SUPER_ADMIN role */}
        {user.role === UserRole.SUPER_ADMIN && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-purple-950/50 to-slate-950/80 border border-indigo-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/40 shrink-0">
                <Building2 size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Super Admin Control Center</h2>
                <p className="text-xs text-indigo-300 mt-0.5">
                  Manage factories, provision factory admins, inspect audit logs, and monitor cross-factory analytics.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/super-admin')}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto shrink-0"
            >
              <span>Open Super Admin Portal</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Active Modules */}
        <p className="text-xs font-semibold tracking-widest uppercase text-slate-500 mb-4">
          Active Modules
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {ACTIVE_MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.title}
                onClick={() => navigate(m.path)}
                className={`p-6 rounded-2xl border ${m.border} bg-gradient-to-r ${m.gradient} ${m.hoverGradient} cursor-pointer transition-all duration-300 shadow-xl group flex flex-col justify-between gap-4`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${m.iconBg} shadow-lg ${m.shadow} group-hover:scale-105 transition-transform shrink-0`}
                  >
                    <Icon size={24} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={`text-base font-bold text-slate-100 transition-colors ${m.textColor}`}
                      >
                        {m.title}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Live
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{m.desc}</p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1.5 text-xs font-semibold ${m.linkColor} group-hover:translate-x-1 transition-transform self-end`}
                >
                  <span>Open Module</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Upcoming modules */}
        <p className="text-xs font-semibold tracking-widest uppercase text-slate-500 mb-4">
          Upcoming Modules
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {UPCOMING_MODULES.map((m, i) => {
            const Icon = m.icon;
            return (
              <div
                key={m.title}
                className="p-5 rounded-2xl glass hover-lift group cursor-default animate-slide-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br ${m.color} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon size={20} className="text-white" />
                </div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1">{m.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{m.desc}</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-slate-600">
                  <span>Phase 6+</span>
                  <ChevronRight size={10} />
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <footer
        className="py-5 text-center text-xs text-slate-700 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}
      >
        SBKT Loom Production &amp; Efficiency Management System &mdash; Phase 5 Active
      </footer>
    </div>
  );
}
