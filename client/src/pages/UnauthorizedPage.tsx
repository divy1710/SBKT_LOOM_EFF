import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-4 text-center"
      style={{ backgroundColor: 'var(--color-surface-950)' }}
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
      >
        <ShieldX size={40} className="text-rose-400" />
      </div>
      <h1 className="text-3xl font-bold text-slate-100 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
        Access Denied
      </h1>
      <p className="text-slate-400 max-w-sm mb-8">
        You don't have permission to view this page. Contact your factory administrator if you believe this is an error.
      </p>
      <Link
        id="btn-back-home"
        to="/home"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200"
        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' }}
      >
        <ArrowLeft size={16} />
        Back to Home
      </Link>
    </div>
  );
}
