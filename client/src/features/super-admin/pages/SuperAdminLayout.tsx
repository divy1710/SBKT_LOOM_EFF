import React from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  Building2,
  Users,
  Shield,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Home,
} from 'lucide-react';

const navItems = [
  { name: 'Overview', to: '/super-admin', icon: Home, end: true },
  { name: 'Factory Management', to: '/super-admin/factories', icon: Building2 },
  { name: 'Factory Admins', to: '/super-admin/admins', icon: Shield },
  { name: 'User Management', to: '/super-admin/users', icon: Users },
  { name: 'Roles & Permissions', to: '/super-admin/roles', icon: Shield },
  { name: 'Cross-Factory Analytics', to: '/super-admin/analytics', icon: BarChart3 },
  { name: 'Audit Logs', to: '/super-admin/audit-logs', icon: FileText },
  { name: 'Platform Settings', to: '/super-admin/settings', icon: Settings },
];

export const SuperAdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
              ⚡
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-white">SBKT Platform</h1>
              <p className="text-xs text-indigo-400 font-medium">Super Admin Portal</p>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Super Admin'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-md hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-3">
            <Link
              to="/home"
              className="block text-center text-xs text-indigo-400 hover:text-indigo-300 py-1.5 rounded border border-indigo-500/30 hover:border-indigo-500/60 transition-colors"
            >
              ← Back to Factory Operations
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-900 p-6 md:p-8 overflow-y-auto max-h-screen">
        <Outlet />
      </main>
    </div>
  );
};
