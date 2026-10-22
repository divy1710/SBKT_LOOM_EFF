import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  Factory,
  Layers,
  BarChart3,
  Cpu,
  Workflow,
  Server,
  RefreshCw,
  LogIn,
  ArrowRight,
} from 'lucide-react';
import apiClient from '@/lib/axios';
import { timeAgo } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────
interface HealthData {
  application: string;
  status: string;
  environment: string;
}

interface DbData {
  database: string;
  state: string;
  ready: boolean;
}

interface ApiResult<T> {
  success: boolean;
  message: string;
  data?: T;
  timestamp?: string;
}

type Status = 'idle' | 'loading' | 'ok' | 'error';

// ─── Feature cards data ────────────────────────────────────────────────────────
const UPCOMING_FEATURES = [
  {
    icon: Cpu,
    title: 'Machine Management',
    desc: 'Track waterjet loom machines, statuses, and maintenance schedules.',
    color: 'from-blue-500 to-cyan-400',
  },
  {
    icon: BarChart3,
    title: 'Production Analytics',
    desc: 'Real-time efficiency metrics, OEE calculations, and shift reports.',
    color: 'from-indigo-500 to-purple-400',
  },
  {
    icon: Layers,
    title: 'Fabric & Yarn',
    desc: 'Manage beam inventory, yarn lots, and fabric quality inspection.',
    color: 'from-teal-500 to-emerald-400',
  },
  {
    icon: Workflow,
    title: 'Production Sheets',
    desc: 'Daily production recording, target vs. actual, and worker logs.',
    color: 'from-amber-500 to-orange-400',
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────
function StatusBadge({
  status,
  label,
}: {
  status: Status;
  label: string;
}) {
  const map: Record<Status, { icon: React.ReactNode; text: string; cls: string }> = {
    idle: {
      icon: <Activity size={14} className="shrink-0" />,
      text: 'Not checked',
      cls: 'text-slate-400 bg-slate-800/60 border-slate-700',
    },
    loading: {
      icon: <Loader2 size={14} className="shrink-0 animate-spin" />,
      text: 'Checking…',
      cls: 'text-blue-300 bg-blue-900/30 border-blue-700/50',
    },
    ok: {
      icon: <CheckCircle2 size={14} className="shrink-0" />,
      text: 'Online',
      cls: 'text-emerald-300 bg-emerald-900/30 border-emerald-700/50',
    },
    error: {
      icon: <XCircle size={14} className="shrink-0" />,
      text: 'Offline',
      cls: 'text-rose-300 bg-rose-900/30 border-rose-700/50',
    },
  };

  const { icon, text, cls } = map[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}
    >
      {icon}
      {label}: {text}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WelcomePage() {
  const { isAuthenticated } = useAuth();
  const [apiStatus, setApiStatus] = useState<Status>('idle');
  const [dbStatus, setDbStatus] = useState<Status>('idle');
  const [apiTimestamp, setApiTimestamp] = useState<string | null>(null);
  const [apiEnv, setApiEnv] = useState<string | null>(null);
  const [dbState, setDbState] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const checkHealth = async () => {
    setApiStatus('loading');
    setDbStatus('loading');
    setLastChecked(new Date().toISOString());

    // ── API health ─────────────────────────────────────────────────────────
    try {
      const res = await apiClient.get<ApiResult<HealthData>>('/health');
      const d = res.data;
      if (d.success) {
        setApiStatus('ok');
        setApiTimestamp(d.timestamp ?? null);
        setApiEnv(d.data?.environment ?? null);
      } else {
        setApiStatus('error');
      }
    } catch {
      setApiStatus('error');
    }

    // ── DB health ──────────────────────────────────────────────────────────
    try {
      const res = await apiClient.get<ApiResult<DbData>>('/health/db');
      const d = res.data;
      if (d.success && d.data?.ready) {
        setDbStatus('ok');
        setDbState(d.data.state);
      } else {
        setDbStatus('error');
        setDbState(d.data?.state ?? null);
      }
    } catch {
      setDbStatus('error');
    }
  };

  // Auto-check on mount
  useEffect(() => {
    void checkHealth();
  }, []);

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden">
      {/* ── Ambient background blobs ────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface-950)' }}
      >
        {/* Blue glow top-left */}
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20 animate-float"
          style={{
            background:
              'radial-gradient(circle, rgba(37,99,235,0.6) 0%, transparent 70%)',
            animationDelay: '0s',
          }}
        />
        {/* Teal glow bottom-right */}
        <div
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-15 animate-float"
          style={{
            background:
              'radial-gradient(circle, rgba(6,182,212,0.6) 0%, transparent 70%)',
            animationDelay: '2s',
          }}
        />
        {/* Indigo glow center */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-10 animate-float"
          style={{
            background:
              'radial-gradient(ellipse, rgba(99,102,241,0.5) 0%, transparent 70%)',
            animationDelay: '1s',
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(148,163,184,1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(148,163,184,1) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20"
            style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #06b6d4 100%)',
            }}
          >
            <Factory size={22} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-100 tracking-tight text-base sm:text-lg">
              SBKT Textile Manager
            </span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-900/40 text-blue-300 border border-blue-700/50">
              Loom System
            </span>
          </div>
        </div>

        <div>
          {isAuthenticated ? (
            <Link
              to="/home"
              id="btn-nav-dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-blue-500/20"
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
              }}
            >
              <span>Dashboard</span>
              <ArrowRight size={16} />
            </Link>
          ) : (
            <Link
              to="/login"
              id="btn-nav-login"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25"
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
              }}
            >
              <LogIn size={16} />
              <span>Login</span>
            </Link>
          )}
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-8">

        {/* Hero section */}
        <div className="text-center max-w-4xl mx-auto mb-16 animate-fade-in">
          {/* Logo / Icon */}
          <div className="flex justify-center mb-8">
            <div
              className="relative w-24 h-24 rounded-2xl flex items-center justify-center animate-pulse-glow"
              style={{
                background: 'linear-gradient(135deg, #1d4ed8 0%, #06b6d4 100%)',
                boxShadow: '0 0 40px rgba(37,99,235,0.4)',
              }}
            >
              <Factory size={48} className="text-white" />
              <div
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-slate-950"
                style={{ boxShadow: '0 0 8px rgba(52,211,153,0.6)' }}
              />
            </div>
          </div>

          {/* Badge */}
          <div className="flex justify-center mb-6 animate-fade-in animation-delay-100">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
              style={{
                background: 'rgba(37,99,235,0.15)',
                border: '1px solid rgba(59,130,246,0.3)',
                color: '#93c5fd',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-blue-400"
                style={{ boxShadow: '0 0 6px rgba(96,165,250,0.8)' }}
              />
              Phase 1 — Foundation
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight animate-fade-in animation-delay-200"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="text-shimmer">SBKT Loom</span>
            <br />
            <span className="text-slate-100">Production & Efficiency</span>
            <br />
            <span className="text-slate-300">Management System</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed animate-fade-in animation-delay-300">
            A professional platform for managing waterjet loom production,
            machine efficiency, fabric quality, yarn inventory, and factory
            analytics — built for precision manufacturing.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8 animate-fade-in animation-delay-400">
            {isAuthenticated ? (
              <Link
                to="/home"
                id="btn-hero-dashboard"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm text-white shadow-xl shadow-blue-500/30 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
                }}
              >
                <span>Go to Dashboard</span>
                <ArrowRight size={18} />
              </Link>
            ) : (
              <Link
                to="/login"
                id="btn-hero-login"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm text-white shadow-xl shadow-blue-500/30 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
                }}
              >
                <LogIn size={18} />
                <span>Login to System</span>
              </Link>
            )}
          </div>
        </div>

        {/* System Health Panel */}
        <div
          className="w-full max-w-2xl mb-12 rounded-2xl p-6 glass animate-slide-up animation-delay-400"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(37,99,235,0.2)' }}
              >
                <Server size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">System Status</p>
                {lastChecked && (
                  <p className="text-xs text-slate-500">
                    Last checked {timeAgo(lastChecked)}
                  </p>
                )}
              </div>
            </div>
            <button
              id="btn-refresh-health"
              onClick={() => void checkHealth()}
              disabled={apiStatus === 'loading' || dbStatus === 'loading'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255,255,255,0.1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255,255,255,0.06)';
              }}
            >
              <RefreshCw
                size={12}
                className={
                  apiStatus === 'loading' || dbStatus === 'loading'
                    ? 'animate-spin'
                    : ''
                }
              />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* API Health Card */}
            <div
              className="p-4 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className="text-blue-400" />
                <span className="text-sm font-medium text-slate-300">
                  REST API
                </span>
              </div>
              <StatusBadge status={apiStatus} label="API" />
              {apiTimestamp && (
                <p className="mt-2 text-xs text-slate-500">
                  Server time: {new Date(apiTimestamp).toLocaleTimeString()}
                </p>
              )}
              {apiEnv && (
                <p className="text-xs text-slate-600 capitalize">
                  env: {apiEnv}
                </p>
              )}
            </div>

            {/* DB Health Card */}
            <div
              className="p-4 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Database size={16} className="text-teal-400" />
                <span className="text-sm font-medium text-slate-300">
                  MongoDB
                </span>
              </div>
              <StatusBadge status={dbStatus} label="Database" />
              {dbState && (
                <p className="mt-2 text-xs text-slate-500 capitalize">
                  State: {dbState}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Features Grid */}
        <div className="w-full max-w-4xl mb-16">
          <p className="text-center text-xs font-semibold tracking-widest uppercase text-slate-500 mb-6 animate-fade-in animation-delay-500">
            Upcoming Modules
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {UPCOMING_FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-5 rounded-2xl glass hover-lift group cursor-default animate-slide-up"
                  style={{ animationDelay: `${500 + i * 100}ms` }}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br ${feature.color} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon size={20} className="text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stack Badge */}
        <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-600 animate-fade-in-slow">
          {[
            'React 19',
            'TypeScript',
            'Vite',
            'Node.js',
            'Express',
            'MongoDB',
            'Tailwind CSS v4',
          ].map((tech) => (
            <span
              key={tech}
              className="px-2.5 py-1 rounded-md"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {tech}
            </span>
          ))}
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer
        className="relative z-10 py-6 text-center text-xs text-slate-600 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}
      >
        <p>
          SBKT Loom Production & Efficiency Management System &mdash; Phase 1
          Foundation &mdash; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
