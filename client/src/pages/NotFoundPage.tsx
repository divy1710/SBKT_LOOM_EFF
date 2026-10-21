import { Link } from 'react-router-dom';
import { SearchX, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-4 text-center"
      style={{ backgroundColor: 'var(--color-surface-950)' }}
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}
      >
        <SearchX size={40} className="text-indigo-400" />
      </div>
      <p className="text-6xl font-bold text-slate-700 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        404
      </p>
      <h1 className="text-2xl font-bold text-slate-100 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
        Page Not Found
      </h1>
      <p className="text-slate-400 max-w-sm mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        id="btn-404-home"
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
