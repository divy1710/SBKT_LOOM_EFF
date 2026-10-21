import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Factory, Loader2, Lock, Mail, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { LoginFormData } from '@/features/auth/types/auth.types';

// ─── Validation schema ────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/home';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  // Redirect already-authenticated users away from login
  if (!authLoading && isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    setAuthError(null);
    try {
      await login(data);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid email or password';
      setAuthError(msg);
    }
  };

  return (
    <div
      className="min-h-dvh flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface-950)' }}
    >
      {/* Ambient background */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-15 animate-float"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.6) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full opacity-10 animate-float"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)', animationDelay: '2s' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse-glow"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #06b6d4 100%)', boxShadow: '0 0 32px rgba(37,99,235,0.4)' }}
            >
              <Factory size={32} className="text-white" />
            </div>
          </div>
          <h1
            className="text-2xl font-bold text-slate-100 mb-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Sign in to SBKT
          </h1>
          <p className="text-sm text-slate-400">
            Loom Production &amp; Efficiency Management System
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8">
          {/* Auth error banner */}
          {authError && (
            <div
              id="login-error-banner"
              className="flex items-start gap-3 mb-6 p-3 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <AlertCircle size={16} className="text-rose-400 mt-0.5 shrink-0" />
              <p className="text-sm text-rose-300">{authError}</p>
            </div>
          )}

          <form id="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Email */}
            <div className="mb-4">
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                  {...register('email')}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: errors.email ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  }}
                />
              </div>
              {errors.email && (
                <p id="login-email-error" className="mt-1.5 text-xs text-rose-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="mb-6">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                  {...register('password')}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: errors.password ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  }}
                />
                <button
                  id="btn-toggle-password"
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p id="login-password-error" className="mt-1.5 text-xs text-rose-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: isSubmitting
                  ? 'rgba(37,99,235,0.6)'
                  : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                boxShadow: isSubmitting ? 'none' : '0 4px 16px rgba(37,99,235,0.35)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center mt-6 text-xs text-slate-600">
          Account access is managed by your factory administrator.{' '}
          <Link to="/" className="text-blue-500 hover:text-blue-400 transition-colors">
            Return to home
          </Link>
        </p>
      </div>
    </div>
  );
}
