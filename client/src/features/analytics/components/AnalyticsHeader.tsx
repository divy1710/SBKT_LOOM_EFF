import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Cpu,
  Layers,
  TrendingUp,
  Percent,
  Home,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROLE_LABELS, UserRole } from '@/features/auth/types/auth.types';

const TABS = [
  {
    path: '/analytics/production',
    label: 'Production Analysis',
    icon: TrendingUp,
    description: 'Volume, trends & smart insights',
  },
  {
    path: '/analytics/machines',
    label: 'Machine Analytics',
    icon: Cpu,
    description: 'Single-loom metrics & shift records',
  },
  {
    path: '/analytics/fabric-quality',
    label: 'Fabric Quality',
    icon: Layers,
    description: 'Distribution & share of production',
  },
  {
    path: '/analytics/performance',
    label: 'Machine Performance',
    icon: BarChart3,
    description: 'Top/bottom rankings & output threshold',
  },
  {
    path: '/analytics/efficiency',
    label: 'Efficiency Analytics',
    icon: Percent,
    description: 'OEE, shift rates & machine rankings',
  },
];

export const AnalyticsHeader: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30">
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/home"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Return to Home"
          >
            <Home className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                SBKT Production Analytics
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Phase 8
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Intelligence, Capacity & Efficiency Engine</p>
            </div>
          </div>
        </div>

        {/* User profile & Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end text-xs">
            <span className="font-semibold text-slate-200">{user?.name}</span>
            <span className="text-[10px] text-slate-400">
              {user?.role ? ROLE_LABELS[user.role as UserRole] : 'User'}
            </span>
          </div>
          <button
            onClick={() => void logout()}
            className="p-2 rounded-lg bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Analytics Sub-Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/60 overflow-x-auto scrollbar-none">
        <nav className="flex space-x-1 py-2" aria-label="Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname.startsWith(tab.path);

            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
