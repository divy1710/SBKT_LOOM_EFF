import React from 'react';
import { ShieldCheck } from 'lucide-react';

const roleMatrix = [
  {
    role: 'SUPER_ADMIN',
    label: 'Super Admin',
    desc: 'Platform-wide administrator with unrestricted factory creation, administrative provisioning, cross-factory analytics, and audit inspection.',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    permissions: [
      'factory.create',
      'factory.read',
      'factory.update',
      'factory.deactivate',
      'factory.admin.manage',
      'user.create',
      'user.read',
      'user.update',
      'user.deactivate',
      'analytics.read',
      'analytics.cross_factory',
      'audit.read',
      'settings.read',
      'settings.update',
      'backup.create',
      'backup.restore',
      'backup.export',
    ],
  },
  {
    role: 'FACTORY_ADMIN',
    label: 'Factory Admin',
    desc: 'Local facility administrator managing machines, shift production, operators, and localized factory settings within their designated facility.',
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    permissions: [
      'user.create (Local)',
      'user.read (Local)',
      'user.update (Local)',
      'user.deactivate (Local)',
      'yarn.create',
      'yarn.read',
      'yarn.update',
      'yarn.delete',
      'fabric.create',
      'fabric.read',
      'fabric.update',
      'fabric.delete',
      'beam.create',
      'beam.read',
      'beam.update',
      'beam.delete',
      'machine.create',
      'machine.read',
      'machine.update',
      'machine.delete',
      'production.create',
      'production.read',
      'production.update',
      'production.reopen',
      'analytics.read (Local)',
      'settings.read (Local)',
      'settings.update (Local)',
      'backup.create (Local)',
      'backup.restore (Local)',
      'backup.export (Local)',
      'audit.read (Local)',
    ],
  },
  {
    role: 'MANAGER',
    label: 'Production Manager',
    desc: 'Supervisor authorized to manage loom setup, beam allocations, yarn and fabric masters, and oversee daily shift entries.',
    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    permissions: [
      'yarn.*',
      'fabric.*',
      'beam.*',
      'machine.*',
      'production.create',
      'production.read',
      'production.update',
      'analytics.read',
      'settings.read',
    ],
  },
  {
    role: 'OPERATOR',
    label: 'Machine Operator',
    desc: 'Daily floor operator entering shift picks, meters, beam cut-marks, and logging machine statuses.',
    badge: 'bg-slate-800 text-slate-300 border-slate-700',
    permissions: [
      'yarn.read',
      'fabric.read',
      'beam.read',
      'machine.read',
      'production.create',
      'production.read',
      'production.update (Open sheets)',
    ],
  },
  {
    role: 'VIEWER',
    label: 'Auditor / Viewer',
    desc: 'Read-only access to verify operational reports without modification capabilities.',
    badge: 'bg-slate-800 text-slate-400 border-slate-700',
    permissions: [
      'yarn.read',
      'fabric.read',
      'beam.read',
      'machine.read',
      'production.read',
      'analytics.read',
    ],
  },
];

export const RolesPermissionsPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Roles & Permissions Matrix</h1>
        <p className="text-sm text-slate-400 mt-1">
          Server-enforced role-based access control matrix with factory boundary isolation.
        </p>
      </div>

      <div className="space-y-6">
        {roleMatrix.map((item) => (
          <div
            key={item.role}
            className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60 shadow-xl"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
                <div>
                  <h2 className="text-lg font-bold text-white">{item.label}</h2>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-semibold border ${item.badge} self-start sm:self-auto`}
              >
                {item.role}
              </span>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Granted Capabilities:
              </p>
              <div className="flex flex-wrap gap-2">
                {item.permissions.map((perm, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-indigo-300"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
