import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Factory,
  Palette,
  Languages,
  Sliders,
  Shield,
  Save,
  Loader2,
  Check,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  Cpu,
  CheckCircle2,
  Info,
  DatabaseBackup,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { UserRole, ROLE_LABELS } from '@/features/auth/types/auth.types';
import { useTheme, type Theme } from '@/context/ThemeContext';
import { useLanguage, type Language } from '@/context/LanguageContext';
import {
  settingsService,
  type FactoryProfile,
  type ProductionPreferences,
} from '../services/settings.service';
import { BackupRestoreSection } from '../components/BackupRestoreSection';

type SettingsTab = 'factory' | 'appearance' | 'language' | 'production' | 'account' | 'backup';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<SettingsTab>('factory');

  // Permission checks
  const isAdmin =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.FACTORY_ADMIN;

  // ─── 1. Factory Profile State ────────────────────────────────────────────────
  const [factoryLoading, setFactoryLoading] = useState(true);
  const [factorySaving, setFactorySaving] = useState(false);
  const [factoryProfile, setFactoryProfile] = useState<FactoryProfile>({
    id: '',
    name: 'Shree Brahmanikrupa Textile',
    code: 'SBKT-01',
    address: '',
    phone: '',
    email: '',
    logo: null,
    timezone: 'Asia/Kolkata',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── 2. Production Preferences State ─────────────────────────────────────────
  const [prodLoading, setProdLoading] = useState(true);
  const [prodSaving, setProdSaving] = useState(false);
  const [prodPrefs, setProdPrefs] = useState<ProductionPreferences>({
    dayShiftDurationHours: 11,
    nightShiftDurationHours: 13,
    dayShiftStartTime: '08:00',
    nightShiftStartTime: '19:00',
    defaultEfficiencyMode: 'AUTO',
    lowBeamMeterAlertThreshold: 200,
  });

  // ─── 3. Account Settings State ───────────────────────────────────────────────
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // ─── Load initial data ───────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [fact, prod] = await Promise.allSettled([
          settingsService.getFactoryProfile(),
          settingsService.getProductionPreferences(),
        ]);

        if (isMounted) {
          if (fact.status === 'fulfilled') {
            setFactoryProfile(fact.value);
            setLogoPreview(fact.value.logo || null);
          }
          if (prod.status === 'fulfilled') {
            setProdPrefs(fact.status === 'fulfilled' ? prod.value : prodPrefs);
          }
        }
      } catch {
        // Handled silently
      } finally {
        if (isMounted) {
          setFactoryLoading(false);
          setProdLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync profile inputs when user loads
  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfileEmail(user.email);
    }
  }, [user]);

  // ─── Factory Profile Handlers ────────────────────────────────────────────────
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Invalid image type. Please select PNG, JPEG, or WebP.');
      return;
    }

    if (file.size > 1024 * 1024) {
      toast.error('Image exceeds 1MB limit. Please upload a smaller file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
      setFactoryProfile((prev) => ({ ...prev, logo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setFactoryProfile((prev) => ({ ...prev, logo: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveFactory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Only administrators can update factory settings.');
      return;
    }

    if (!factoryProfile.name.trim()) {
      toast.error('Factory name is required.');
      return;
    }

    setFactorySaving(true);
    try {
      const updated = await settingsService.updateFactoryProfile({
        name: factoryProfile.name.trim(),
        address: factoryProfile.address?.trim(),
        phone: factoryProfile.phone?.trim(),
        email: factoryProfile.email?.trim(),
        logo: factoryProfile.logo,
      });
      setFactoryProfile(updated);
      toast.success(t('factory.saveSuccess'));
      await refreshUser(); // Update single source of truth across headers & exports
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save factory profile.';
      toast.error(msg);
    } finally {
      setFactorySaving(false);
    }
  };

  // ─── Production Preferences Handlers ─────────────────────────────────────────
  const handleSaveProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Only administrators can modify production preferences.');
      return;
    }

    const totalHours = prodPrefs.dayShiftDurationHours + prodPrefs.nightShiftDurationHours;
    if (totalHours > 24) {
      toast.error('Total shift hours cannot exceed 24 hours per day.');
      return;
    }

    setProdSaving(true);
    try {
      const updated = await settingsService.updateProductionPreferences(prodPrefs);
      setProdPrefs(updated);
      toast.success(t('production.saveSuccess'));
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save production preferences.';
      toast.error(msg);
    } finally {
      setProdSaving(false);
    }
  };

  // ─── Theme & Language Handlers ───────────────────────────────────────────────
  const handleThemeChange = async (newTheme: Theme) => {
    setTheme(newTheme);
    try {
      await settingsService.updatePreferences({ theme: newTheme });
    } catch {
      // Preference saved locally
    }
  };

  const handleLanguageChange = async (newLang: Language) => {
    setLanguage(newLang);
    try {
      await settingsService.updatePreferences({ language: newLang });
    } catch {
      // Preference saved locally
    }
  };

  // ─── Account Profile Handlers ────────────────────────────────────────────────
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }

    setProfileSaving(true);
    try {
      await settingsService.updateProfile({
        name: profileName.trim(),
        email: profileEmail.trim(),
      });
      toast.success(t('account.profileSuccess'));
      await refreshUser();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update profile.';
      toast.error(msg);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await settingsService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      toast.success(t('account.passwordSuccess'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to change password.';
      toast.error(msg);
    } finally {
      setPasswordSaving(false);
    }
  };


  return (
    <div className="min-h-dvh flex flex-col transition-colors duration-200" style={{ backgroundColor: 'var(--color-surface-950)' }}>
      {/* ── Top Header ── */}
      <header
        className="sticky top-0 z-50 px-4 sm:px-6 py-4 flex items-center justify-between transition-colors duration-200"
        style={{
          background: 'rgba(6,13,31,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 transition border border-slate-700/50"
          >
            <ArrowLeft size={14} />
            <span>{t('common.back')}</span>
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)' }}
            >
              <Factory size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 leading-tight">
                {factoryProfile.name || 'Shree Brahmanikrupa Textile'}
              </h1>
              <p className="text-[11px] text-slate-400 leading-none">{t('settings.title')}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-700/40">
            <Shield size={13} className="text-blue-400" />
            <span>{user?.role ? ROLE_LABELS[user.role] : 'User'}</span>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-100 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            {t('settings.title')}
          </h2>
          <p className="text-sm text-slate-400">{t('settings.subtitle')}</p>
        </div>

        {/* ── Tabs Navigation ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-8 border-b border-slate-800 scrollbar-none">
          <button
            id="tab-factory"
            onClick={() => setActiveTab('factory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
              activeTab === 'factory'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Factory size={16} />
            <span>{t('settings.tabFactory')}</span>
          </button>

          <button
            id="tab-appearance"
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
              activeTab === 'appearance'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Palette size={16} />
            <span>{t('settings.tabAppearance')}</span>
          </button>

          <button
            id="tab-language"
            onClick={() => setActiveTab('language')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
              activeTab === 'language'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Languages size={16} />
            <span>{t('settings.tabLanguage')}</span>
          </button>

          <button
            id="tab-production"
            onClick={() => setActiveTab('production')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
              activeTab === 'production'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sliders size={16} />
            <span>{t('settings.tabProduction')}</span>
          </button>

          <button
            id="tab-account"
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
              activeTab === 'account'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Shield size={16} />
            <span>{t('settings.tabAccount')}</span>
          </button>

          {isAdmin && (
            <button
              id="tab-backup"
              onClick={() => setActiveTab('backup')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                activeTab === 'backup'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <DatabaseBackup size={16} />
              <span>{t('backup.tab') || 'Backup & Restore'}</span>
            </button>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: FACTORY PROFILE                                                */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'factory' && (
          <div className="glass rounded-2xl p-6 sm:p-8 animate-fade-in border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-100">{t('factory.title')}</h3>
                <p className="text-xs text-slate-400 mt-1">{t('factory.description')}</p>
              </div>
              {!isAdmin && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  <Info size={14} />
                  <span>Read-only mode (Admin privileges required to edit)</span>
                </div>
              )}
            </div>

            {factoryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-blue-500" />
              </div>
            ) : (
              <form onSubmit={handleSaveFactory} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Factory Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      {t('factory.factoryName')} *
                    </label>
                    <input
                      id="input-factory-name"
                      type="text"
                      disabled={!isAdmin}
                      value={factoryProfile.name}
                      onChange={(e) => setFactoryProfile({ ...factoryProfile, name: e.target.value })}
                      placeholder="e.g. Shree Brahmanikrupa Textile"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-100 placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none transition disabled:opacity-60"
                      required
                    />
                  </div>

                  {/* Factory Code */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      {t('factory.factoryCode')}
                    </label>
                    <input
                      type="text"
                      disabled
                      value={factoryProfile.code}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-sm cursor-not-allowed font-mono"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">{t('factory.factoryCodeNote')}</p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      {t('factory.phone')}
                    </label>
                    <input
                      id="input-factory-phone"
                      type="text"
                      disabled={!isAdmin}
                      value={factoryProfile.phone || ''}
                      onChange={(e) => setFactoryProfile({ ...factoryProfile, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-100 placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none transition disabled:opacity-60"
                    />
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      {t('factory.address')}
                    </label>
                    <textarea
                      id="input-factory-address"
                      rows={2}
                      disabled={!isAdmin}
                      value={factoryProfile.address || ''}
                      onChange={(e) => setFactoryProfile({ ...factoryProfile, address: e.target.value })}
                      placeholder="e.g. Plot No. 12, GIDC Industrial Estate, Sachin, Surat, Gujarat"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-100 placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none transition disabled:opacity-60"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      {t('factory.email')}
                    </label>
                    <input
                      id="input-factory-email"
                      type="email"
                      disabled={!isAdmin}
                      value={factoryProfile.email || ''}
                      onChange={(e) => setFactoryProfile({ ...factoryProfile, email: e.target.value })}
                      placeholder="contact@sbkt-textiles.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-100 placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none transition disabled:opacity-60"
                    />
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Factory Timezone
                    </label>
                    <input
                      type="text"
                      disabled
                      value={factoryProfile.timezone || 'Asia/Kolkata'}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-sm cursor-not-allowed font-mono"
                    />
                  </div>
                </div>

                {/* ── Logo Upload Section ── */}
                <div className="pt-6 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    {t('factory.logo')}
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden bg-slate-900/60 shrink-0">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Factory Logo Preview"
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <Factory size={32} className="text-slate-600" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400 leading-relaxed max-w-lg">
                        {t('factory.logoHint')}
                      </p>
                      {isAdmin && (
                        <div className="flex items-center gap-3 pt-1">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleLogoFileChange}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition"
                          >
                            <Upload size={14} />
                            <span>{logoPreview ? t('factory.replaceLogo') : t('factory.uploadLogo')}</span>
                          </button>
                          {logoPreview && (
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition"
                            >
                              <Trash2 size={14} />
                              <span>{t('factory.removeLogo')}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                {isAdmin && (
                  <div className="flex justify-end pt-4">
                    <button
                      id="btn-save-factory"
                      type="submit"
                      disabled={factorySaving}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition shadow-lg shadow-blue-500/25 disabled:opacity-50 cursor-pointer"
                    >
                      {factorySaving ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>{t('common.saving')}</span>
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          <span>{t('common.save')}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: APPEARANCE (THEME)                                             */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'appearance' && (
          <div className="glass rounded-2xl p-6 sm:p-8 animate-fade-in border border-slate-800 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-100">{t('appearance.title')}</h3>
              <p className="text-xs text-slate-400 mt-1">{t('appearance.description')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Dark Theme */}
              <div
                id="theme-dark-card"
                onClick={() => void handleThemeChange('dark')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  theme === 'dark'
                    ? 'border-blue-500 bg-blue-950/20 shadow-lg shadow-blue-500/10'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                    <Palette size={20} className="text-blue-400" />
                  </div>
                  {theme === 'dark' && <CheckCircle2 size={18} className="text-blue-400" />}
                </div>
                <h4 className="text-sm font-bold text-slate-100 mb-1">{t('appearance.dark')}</h4>
                <p className="text-xs text-slate-400">{t('appearance.darkDesc')}</p>
              </div>

              {/* Light Theme */}
              <div
                id="theme-light-card"
                onClick={() => void handleThemeChange('light')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  theme === 'light'
                    ? 'border-blue-500 bg-blue-950/20 shadow-lg shadow-blue-500/10'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center">
                    <Palette size={20} className="text-slate-800" />
                  </div>
                  {theme === 'light' && <CheckCircle2 size={18} className="text-blue-400" />}
                </div>
                <h4 className="text-sm font-bold text-slate-100 mb-1">{t('appearance.light')}</h4>
                <p className="text-xs text-slate-400">{t('appearance.lightDesc')}</p>
              </div>

              {/* System Theme */}
              <div
                id="theme-system-card"
                onClick={() => void handleThemeChange('system')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  theme === 'system'
                    ? 'border-blue-500 bg-blue-950/20 shadow-lg shadow-blue-500/10'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
                    <Sliders size={20} className="text-cyan-400" />
                  </div>
                  {theme === 'system' && <CheckCircle2 size={18} className="text-blue-400" />}
                </div>
                <h4 className="text-sm font-bold text-slate-100 mb-1">{t('appearance.system')}</h4>
                <p className="text-xs text-slate-400">{t('appearance.systemDesc')}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-3">
              <Info size={16} className="shrink-0 mt-0.5" />
              <span>
                Theme preferences are saved automatically for your active account and device. No logout or reload required.
              </span>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: LANGUAGE                                                       */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'language' && (
          <div className="glass rounded-2xl p-6 sm:p-8 animate-fade-in border border-slate-800 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-100">{t('language.title')}</h3>
              <p className="text-xs text-slate-400 mt-1">{t('language.description')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* English */}
              <div
                id="lang-en-card"
                onClick={() => void handleLanguageChange('en')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  language === 'en'
                    ? 'border-blue-500 bg-blue-950/20 shadow-lg shadow-blue-500/10'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold font-mono text-blue-400">EN</span>
                  {language === 'en' && <CheckCircle2 size={18} className="text-blue-400" />}
                </div>
                <h4 className="text-sm font-bold text-slate-100 mb-1">{t('language.en')}</h4>
                <p className="text-xs text-slate-400">{t('language.enDesc')}</p>
              </div>

              {/* Gujarati */}
              <div
                id="lang-gu-card"
                onClick={() => void handleLanguageChange('gu')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  language === 'gu'
                    ? 'border-teal-500 bg-teal-950/20 shadow-lg shadow-teal-500/10'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold font-mono text-teal-400">ગુ</span>
                  {language === 'gu' && <CheckCircle2 size={18} className="text-teal-400" />}
                </div>
                <h4 className="text-sm font-bold text-slate-100 mb-1">{t('language.gu')}</h4>
                <p className="text-xs text-slate-400">{t('language.guDesc')}</p>
              </div>

              {/* Hindi */}
              <div
                id="lang-hi-card"
                onClick={() => void handleLanguageChange('hi')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  language === 'hi'
                    ? 'border-amber-500 bg-amber-950/20 shadow-lg shadow-amber-500/10'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold font-mono text-amber-400">हि</span>
                  {language === 'hi' && <CheckCircle2 size={18} className="text-amber-400" />}
                </div>
                <h4 className="text-sm font-bold text-slate-100 mb-1">{t('language.hi')}</h4>
                <p className="text-xs text-slate-400">{t('language.hiDesc')}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300 flex items-start gap-3">
              <Check size={16} className="shrink-0 mt-0.5" />
              <span>
                Language changes update the entire UI dynamically across all modules. Historical production and fabric records remain untranslated to protect data integrity.
              </span>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: PRODUCTION PREFERENCES                                         */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'production' && (
          <div className="glass rounded-2xl p-6 sm:p-8 animate-fade-in border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-100">{t('production.title')}</h3>
                <p className="text-xs text-slate-400 mt-1">{t('production.description')}</p>
              </div>
              {!isAdmin && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  <Info size={14} />
                  <span>Read-only mode (Admin privileges required)</span>
                </div>
              )}
            </div>

            {prodLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-blue-500" />
              </div>
            ) : (
              <form onSubmit={handleSaveProduction} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Day shift duration */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      {t('production.dayShiftDuration')} *
                    </label>
                    <input
                      id="input-day-shift-hours"
                      type="number"
                      min={1}
                      max={24}
                      disabled={!isAdmin}
                      value={prodPrefs.dayShiftDurationHours}
                      onChange={(e) =>
                        setProdPrefs({
                          ...prodPrefs,
                          dayShiftDurationHours: Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-100 text-sm focus:border-blue-500 focus:outline-none transition disabled:opacity-60"
                      required
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Default: 11 hours (08:00 AM – 07:00 PM)</p>
                  </div>

                  {/* Night shift duration */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      {t('production.nightShiftDuration')} *
                    </label>
                    <input
                      id="input-night-shift-hours"
                      type="number"
                      min={1}
                      max={24}
                      disabled={!isAdmin}
                      value={prodPrefs.nightShiftDurationHours}
                      onChange={(e) =>
                        setProdPrefs({
                          ...prodPrefs,
                          nightShiftDurationHours: Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-100 text-sm focus:border-blue-500 focus:outline-none transition disabled:opacity-60"
                      required
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Default: 13 hours (07:00 PM – 08:00 AM next day)</p>
                  </div>

                  {/* Day shift start time */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      {t('production.dayShiftTime')} (HH:mm)
                    </label>
                    <input
                      id="input-day-shift-start"
                      type="time"
                      disabled={!isAdmin}
                      value={prodPrefs.dayShiftStartTime}
                      onChange={(e) =>
                        setProdPrefs({
                          ...prodPrefs,
                          dayShiftStartTime: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-100 text-sm focus:border-blue-500 focus:outline-none transition disabled:opacity-60"
                    />
                  </div>

                  {/* Night shift start time */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      {t('production.nightShiftTime')} (HH:mm)
                    </label>
                    <input
                      id="input-night-shift-start"
                      type="time"
                      disabled={!isAdmin}
                      value={prodPrefs.nightShiftStartTime}
                      onChange={(e) =>
                        setProdPrefs({
                          ...prodPrefs,
                          nightShiftStartTime: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-100 text-sm focus:border-blue-500 focus:outline-none transition disabled:opacity-60"
                    />
                  </div>

                  {/* Default Efficiency Mode */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      {t('production.defaultEfficiencyMode')}
                    </label>
                    <select
                      id="select-efficiency-mode"
                      disabled={!isAdmin}
                      value={prodPrefs.defaultEfficiencyMode}
                      onChange={(e) =>
                        setProdPrefs({
                          ...prodPrefs,
                          defaultEfficiencyMode: e.target.value as 'AUTO' | 'CUSTOM',
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-100 text-sm focus:border-blue-500 focus:outline-none transition disabled:opacity-60"
                    >
                      <option value="AUTO">{t('production.autoEfficiency')}</option>
                      <option value="CUSTOM">{t('production.customEfficiency')}</option>
                    </select>
                  </div>

                  {/* Low Beam Alert Threshold */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      {t('production.lowBeamAlert')}
                    </label>
                    <input
                      id="input-low-beam-threshold"
                      type="number"
                      min={0}
                      max={10000}
                      disabled={!isAdmin}
                      value={prodPrefs.lowBeamMeterAlertThreshold}
                      onChange={(e) =>
                        setProdPrefs({
                          ...prodPrefs,
                          lowBeamMeterAlertThreshold: Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-100 text-sm focus:border-blue-500 focus:outline-none transition disabled:opacity-60"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Default: 200 meters remaining</p>
                  </div>
                </div>

                {/* ── Business Formula Card ── */}
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                    <Cpu size={14} />
                    <span>{t('production.formulaTitle')}</span>
                  </div>
                  <div className="font-mono text-xs text-slate-300 space-y-1 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <p>{t('production.formulaTheo')}</p>
                    <p>{t('production.formulaEff')}</p>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Changing preferences does not alter or recalculate historical production records. Snapshots are preserved permanently.
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex justify-end pt-2">
                    <button
                      id="btn-save-production"
                      type="submit"
                      disabled={prodSaving}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition shadow-lg shadow-blue-500/25 disabled:opacity-50 cursor-pointer"
                    >
                      {prodSaving ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>{t('common.saving')}</span>
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          <span>{t('common.save')}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 5: ACCOUNT SETTINGS                                               */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'account' && (
          <div className="space-y-6 animate-fade-in">
            {/* Profile Information */}
            <div className="glass rounded-2xl p-6 sm:p-8 border border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 mb-1">{t('account.title')}</h3>
              <p className="text-xs text-slate-400 mb-6">{t('account.description')}</p>

              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    {t('account.name')}
                  </label>
                  <input
                    id="input-account-name"
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-100 text-sm focus:border-blue-500 focus:outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    {t('account.email')}
                  </label>
                  <input
                    id="input-account-email"
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-100 text-sm focus:border-blue-500 focus:outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    {t('account.role')}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.role ? ROLE_LABELS[user.role] : ''}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-sm cursor-not-allowed font-medium"
                  />
                </div>

                <div className="pt-2">
                  <button
                    id="btn-update-profile"
                    type="submit"
                    disabled={profileSaving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition shadow-lg shadow-blue-500/25 disabled:opacity-50 cursor-pointer"
                  >
                    {profileSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>{t('common.saving')}</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>{t('account.updateProfile')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password */}
            <div className="glass rounded-2xl p-6 sm:p-8 border border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 mb-1">{t('account.changePasswordTitle')}</h3>
              <p className="text-xs text-slate-400 mb-6">{t('account.passwordReqs')}</p>

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
                {/* Current password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    {t('account.currentPassword')}
                  </label>
                  <div className="relative">
                    <input
                      id="input-current-password"
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-100 text-sm focus:border-blue-500 focus:outline-none transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                    >
                      {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    {t('account.newPassword')}
                  </label>
                  <div className="relative">
                    <input
                      id="input-new-password"
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-100 text-sm focus:border-blue-500 focus:outline-none transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    {t('account.confirmPassword')}
                  </label>
                  <input
                    id="input-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-100 text-sm focus:border-blue-500 focus:outline-none transition"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    id="btn-change-password"
                    type="submit"
                    disabled={passwordSaving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition shadow-lg shadow-blue-500/25 disabled:opacity-50 cursor-pointer"
                  >
                    {passwordSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>{t('common.saving')}</span>
                      </>
                    ) : (
                      <>
                        <Shield size={16} />
                        <span>{t('account.changePasswordTitle')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 6: BACKUP & RESTORE                                              */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'backup' && isAdmin && <BackupRestoreSection />}

      </main>

      {/* ── Footer ── */}
      <footer
        className="py-5 text-center text-xs text-slate-600 border-t mt-auto"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}
      >
        {factoryProfile.name || 'Shree Brahmanikrupa Textile'} &mdash; {t('settings.title')} (Phase 9 Active)
      </footer>
    </div>
  );
}
