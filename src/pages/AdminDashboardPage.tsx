import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  Plus,
  ShieldAlert,
  Trash2,
  Upload,
} from 'lucide-react';
import { SmartImage } from '../components/SmartImage';
import { useEstate } from '../context/EstateContext';
import {
  api,
  decimalsToHectares,
  formatCurrency,
  formatHectares,
  hectaresToDecimals,
} from '../lib/api';
import type {
  AdminStats,
  InquiryItem,
  InquiryStatus,
  PlotItem,
  PlotStatus,
  ReviewItem,
  SiteSettingsMap,
  SiteVisitItem,
  VisitStatus,
} from '../types/estate';

type AdminTab =
  | 'overview'
  | 'plots'
  | 'inquiries'
  | 'visits'
  | 'reviews'
  | 'content'
  | 'guide';

const EMPTY_PLOT_FORM = {
  plotCode: '',
  name: '',
  location: 'Bolangir, Odisha',
  areaDecimals: '8.0',
  areaHectares: Number(decimalsToHectares(8.0).toFixed(4)).toString(),
  dimensions: '',
  price: '2000000',
  pricePerDecimal: '',
  roadAccess: '40 ft Paved Concrete Avenue',
  description: '',
  status: 'Available' as PlotStatus,
  featured: false,
  latitude: '20.7085',
  longitude: '83.4920',
  googleMapsUrl: '',
  images: [] as string[],
  highlightsText: 'Clear freehold Gharabari Patta\nPaved concrete road access\n3-phase power & water ready',
};

function readFileAsBase64(file: File): Promise<{
  filename: string;
  mimeType: string;
  dataBase64: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve({
        filename: file.name,
        mimeType: file.type || 'image/jpeg',
        dataBase64: result,
      });
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export const AdminDashboardPage: React.FC = () => {
  const {
    authUser,
    authToken,
    userRole,
    authConfig,
    authLoading,
    authError,
    loginAdmin,
    signOut,
    plots,
    settings,
    refreshData,
  } = useEstate();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [visits, setVisits] = useState<SiteVisitItem[]>([]);
  const [adminReviews, setAdminReviews] = useState<ReviewItem[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Admin Login form state (Username/Email + Password only — no public sign-up)
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Change DB Admin Credentials form state
  const [curPassword, setCurPassword] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingCredentials, setSavingCredentials] = useState(false);

  // Plot Editor state
  const [editingPlotId, setEditingPlotId] = useState<number | null>(null);
  const [showPlotForm, setShowPlotForm] = useState(false);
  const [plotForm, setPlotForm] = useState(EMPTY_PLOT_FORM);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [savingPlot, setSavingPlot] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<SiteSettingsMap>(settings);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  const showNotice = (type: 'ok' | 'err', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const loadAdminData = useCallback(async () => {
    if (!authToken || userRole !== 'admin') return;
    setLoadingAdmin(true);
    try {
      const [st, inq, vis, rev] = await Promise.all([
        api.getAdminStats(authToken),
        api.getAdminInquiries(authToken),
        api.getAdminVisits(authToken),
        api.getAdminReviews(authToken),
      ]);
      setStats(st);
      setInquiries(inq);
      setVisits(vis);
      setAdminReviews(rev);
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Unable to load admin records.');
    } finally {
      setLoadingAdmin(false);
    }
  }, [authToken, userRole]);

  useEffect(() => {
    if (authToken && userRole === 'admin') {
      void loadAdminData();
    }
  }, [authToken, userRole, loadAdminData]);

  const openNewPlot = () => {
    setEditingPlotId(null);
    setPlotForm(EMPTY_PLOT_FORM);
    setShowPlotForm(true);
  };

  const openEditPlot = (plot: PlotItem) => {
    setEditingPlotId(plot.id);
    setPlotForm({
      plotCode: plot.plotCode,
      name: plot.name,
      location: plot.location,
      areaDecimals: String(plot.areaDecimals),
      areaHectares: Number(decimalsToHectares(plot.areaDecimals).toFixed(4)).toString(),
      dimensions: plot.dimensions,
      price: String(plot.price),
      pricePerDecimal: String(plot.pricePerDecimal),
      roadAccess: plot.roadAccess,
      description: plot.description,
      status: plot.status,
      featured: plot.featured,
      latitude: String(plot.latitude),
      longitude: String(plot.longitude),
      googleMapsUrl: plot.googleMapsUrl,
      images: plot.images || [],
      highlightsText: (plot.highlights || []).join('\n'),
    });
    setShowPlotForm(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!authToken || !e.target.files?.length) return;
    setUploadingPhotos(true);
    try {
      const selected = Array.from(e.target.files).slice(0, 6);
      const payloads = await Promise.all(selected.map(readFileAsBase64));
      const { urls } = await api.uploadImages(authToken, payloads);
      setPlotForm((prev) => ({
        ...prev,
        images: [...prev.images, ...urls],
      }));
      showNotice('ok', `${urls.length} property photo(s) uploaded.`);
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Photo upload failed.');
    } finally {
      setUploadingPhotos(false);
      e.target.value = '';
    }
  };

  const handleSavePlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    setSavingPlot(true);
    try {
      const areaNum = Number(plotForm.areaDecimals);
      const priceNum = Number(plotForm.price);
      const ppdNum = plotForm.pricePerDecimal
        ? Number(plotForm.pricePerDecimal)
        : areaNum > 0
        ? Math.round(priceNum / areaNum)
        : 0;

      const totalAreaStr = `${areaNum} Decimals · ${formatHectares(areaNum)} (${Math.round(
        areaNum * 435.6
      ).toLocaleString('en-IN')} sq ft)`;

      const payload: Partial<PlotItem> = {
        plotCode: plotForm.plotCode.trim(),
        name: plotForm.name.trim(),
        location: plotForm.location.trim(),
        totalArea: totalAreaStr,
        areaDecimals: areaNum,
        dimensions: plotForm.dimensions.trim(),
        price: priceNum,
        pricePerDecimal: ppdNum,
        roadAccess: plotForm.roadAccess.trim(),
        description: plotForm.description.trim(),
        status: plotForm.status,
        featured: plotForm.featured,
        latitude: Number(plotForm.latitude),
        longitude: Number(plotForm.longitude),
        googleMapsUrl:
          plotForm.googleMapsUrl.trim() ||
          `https://www.google.com/maps/search/?api=1&query=${plotForm.latitude},${plotForm.longitude}`,
        images: plotForm.images,
        highlights: plotForm.highlightsText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      };

      if (editingPlotId) {
        await api.updatePlot(authToken, editingPlotId, payload);
        showNotice('ok', 'Plot details updated.');
      } else {
        await api.createPlot(authToken, payload);
        showNotice('ok', 'New plot published.');
      }

      setShowPlotForm(false);
      await Promise.all([refreshData(), loadAdminData()]);
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Unable to save plot.');
    } finally {
      setSavingPlot(false);
    }
  };

  const handleQuickStatus = async (plot: PlotItem, status: PlotStatus) => {
    if (!authToken) return;
    try {
      await api.updatePlot(authToken, plot.id, { status });
      await Promise.all([refreshData(), loadAdminData()]);
      showNotice('ok', `${plot.plotCode} marked as ${status}.`);
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Unable to update plot status.');
    }
  };

  const handleDeletePlot = async (plot: PlotItem) => {
    if (!authToken) return;
    try {
      await api.deletePlot(authToken, plot.id);
      await Promise.all([refreshData(), loadAdminData()]);
      showNotice('ok', `Deleted plot ${plot.plotCode}.`);
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Unable to delete plot.');
    }
  };

  const handleInquiryStatus = async (id: number, status: InquiryStatus) => {
    if (!authToken) return;
    try {
      await api.updateInquiryStatus(authToken, id, status);
      await loadAdminData();
      showNotice('ok', 'Inquiry status updated.');
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const handleDeleteInquiry = async (id: number) => {
    if (!authToken) return;
    try {
      await api.deleteInquiry(authToken, id);
      await loadAdminData();
      showNotice('ok', 'Inquiry removed.');
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const handleVisitStatus = async (id: number, status: VisitStatus) => {
    if (!authToken) return;
    try {
      await api.updateVisitStatus(authToken, id, status);
      await loadAdminData();
      showNotice('ok', 'Site visit booking updated.');
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const handleDeleteVisit = async (id: number) => {
    if (!authToken) return;
    try {
      await api.deleteVisit(authToken, id);
      await loadAdminData();
      showNotice('ok', 'Booking removed.');
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const handleToggleReview = async (rev: ReviewItem) => {
    if (!authToken) return;
    try {
      await api.updateReviewPublished(authToken, rev.id, !rev.isPublished);
      await Promise.all([refreshData(), loadAdminData()]);
      showNotice('ok', rev.isPublished ? 'Review hidden.' : 'Review published.');
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Unable to update review.');
    }
  };

  const handleDeleteReview = async (id: number) => {
    if (!authToken) return;
    try {
      await api.deleteReview(authToken, id);
      await Promise.all([refreshData(), loadAdminData()]);
      showNotice('ok', 'Review deleted.');
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Unable to delete review.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    setSavingSettings(true);
    try {
      await api.updateSettings(authToken, settingsForm);
      await refreshData();
      showNotice('ok', 'Website content and WhatsApp settings saved.');
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginUsername.trim() || !loginPassword) {
      setLoginError('Please enter your admin username/email and password.');
      return;
    }
    try {
      await loginAdmin(loginUsername.trim(), loginPassword);
      setLoginPassword('');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Invalid username or password.');
    }
  };

  const handleChangeCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    if (newAdminPassword.length < 8) {
      showNotice('err', 'New password must be at least 8 characters long.');
      return;
    }
    if (newAdminPassword !== confirmNewPassword) {
      showNotice('err', 'New passwords do not match.');
      return;
    }
    setSavingCredentials(true);
    try {
      const res = await api.adminChangePassword(authToken, {
        currentPassword: curPassword,
        newUsername: newAdminUsername.trim() || undefined,
        newPassword: newAdminPassword,
      });
      setCurPassword('');
      setNewAdminPassword('');
      setConfirmNewPassword('');
      showNotice('ok', `Admin credentials updated for "${res.username}".`);
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Unable to update password.');
    } finally {
      setSavingCredentials(false);
    }
  };

  // Loading authentication status
  if (authLoading && !authConfig) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <p className="text-sm text-[#4B635A]">Checking administrator security status...</p>
      </div>
    );
  }

  // Strict Admin Login Gate (Username/Email + Password only — never shows Sign Up)
  if (!authUser || !authToken) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <form
          onSubmit={handleLoginSubmit}
          className="bg-white border border-[#E2E8E5] rounded-lg p-8 space-y-5"
        >
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-md bg-[#0B281F] text-[#D1AA48] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <p className="text-xs font-mono text-[#9E7822]">
              {authConfig?.supabaseConfigured
                ? 'Supabase Authentication Active'
                : 'Protected Admin Access'}
            </p>
            <h1 className="font-display text-3xl font-semibold text-[#0B281F]">
              Administrator Login
            </h1>
            <p className="text-xs text-[#4B635A] leading-relaxed">
              Enter your Admin Username (or Email) and Password to unlock the Estate Admin Panel.
            </p>
          </div>

          {authConfig && !authConfig.credentialsReady && (
            <div className="px-4 py-3 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              Server credentials are not configured yet. Set{' '}
              <code className="font-mono font-semibold">ADMIN_USERNAME</code> &amp;{' '}
              <code className="font-mono font-semibold">ADMIN_PASSWORD</code> (or{' '}
              <code className="font-mono font-semibold">SUPABASE_URL</code> &amp;{' '}
              <code className="font-mono font-semibold">SUPABASE_ANON_KEY</code>) in your
              Secrets / <code className="font-mono">.env</code> to sign in.
            </div>
          )}

          {(loginError || authError) && (
            <div className="px-4 py-3 rounded bg-red-50 border border-red-200 text-xs text-red-800 text-left">
              {loginError || authError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                {authConfig?.supabaseConfigured
                  ? 'Admin Email or Username *'
                  : 'Username or Email *'}
              </label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder={
                  authConfig?.supabaseConfigured
                    ? 'admin@yourdomain.com or admin'
                    : 'Enter admin username'
                }
                autoComplete="username"
                className="w-full px-3 py-2.5 text-sm border border-[#D4DDD8] rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="w-full pl-3 pr-10 py-2.5 text-sm border border-[#D4DDD8] rounded-md"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5B7269] hover:text-[#0B281F]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="w-full py-3 px-5 text-sm font-semibold text-white bg-[#0B281F] rounded-md hover:bg-[#12382B] transition-colors disabled:opacity-60"
          >
            {authLoading ? 'Verifying Credentials...' : 'Sign In to Admin Panel'}
          </button>
        </form>
      </div>
    );
  }

  // Authenticated non-admin guard
  if (userRole !== 'admin') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20">
        <div className="bg-white border border-[#E2E8E5] rounded-lg p-8 text-center space-y-4">
          <ShieldAlert className="w-10 h-10 text-red-700 mx-auto" />
          <h1 className="font-display text-3xl font-semibold text-[#0B281F]">
            Administrator Access Required
          </h1>
          <p className="text-sm text-[#4B635A]">
            Signed in as <span className="font-medium text-[#10241D]">{authUser.email}</span>,
            which does not have administrator permissions.
          </p>
          <button
            type="button"
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#0B281F] border border-[#D4DDD8] rounded-md hover:bg-[#F7F9F8]"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E8E5]">
        <div>
          <p className="text-xs font-mono text-[#9E7822]">Management Console</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B281F]">
            Estate Admin Dashboard
          </h1>
          <p className="text-xs text-[#5B7269] mt-1">
            Signed in as <span className="font-medium text-[#0B281F]">{authUser.username}</span> (
            {authUser.email}) · Auth: {authUser.provider}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={openNewPlot}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#0B281F] rounded-md hover:bg-[#12382B] whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add New Plot
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-[#3D524A] border border-[#D4DDD8] rounded-md hover:bg-[#F7F9F8] whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className={`px-4 py-3 rounded-md border text-sm flex items-center gap-2 ${
            toast.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-[#0B281F]'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#F7F9F8] border border-[#E2E8E5] rounded-lg overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'plots', label: `Plots (${plots.length})` },
          { id: 'inquiries', label: `Inquiries (${inquiries.length})` },
          { id: 'visits', label: `Site Visits (${visits.length})` },
          { id: 'reviews', label: `Reviews (${adminReviews.length})` },
          { id: 'content', label: 'Website & WhatsApp' },
          { id: 'guide', label: 'Setup & SQL Guide' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as AdminTab)}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'bg-[#0B281F] text-white'
                : 'text-[#3D524A] hover:text-[#0B281F]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add / Edit Plot Modal Panel */}
      {showPlotForm && (
        <form
          onSubmit={handleSavePlot}
          className="bg-[#F7F9F8] border border-[#D4DDD8] rounded-lg p-6 space-y-5"
        >
          <div className="flex items-center justify-between gap-4 border-b border-[#E2E8E5] pb-3">
            <h2 className="font-display text-2xl font-semibold text-[#0B281F]">
              {editingPlotId ? `Edit Plot ${plotForm.plotCode}` : 'Add New Residential Plot'}
            </h2>
            <button
              type="button"
              onClick={() => setShowPlotForm(false)}
              className="text-xs font-medium text-[#4B635A] hover:text-[#0B281F]"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">Plot ID *</label>
              <input
                type="text"
                required
                value={plotForm.plotCode}
                onChange={(e) => setPlotForm({ ...plotForm, plotCode: e.target.value })}
                placeholder="EC-107"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">Plot Name *</label>
              <input
                type="text"
                required
                value={plotForm.name}
                onChange={(e) => setPlotForm({ ...plotForm, name: e.target.value })}
                placeholder="Pine Crest Corner Lot"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">Location *</label>
              <input
                type="text"
                required
                value={plotForm.location}
                onChange={(e) => setPlotForm({ ...plotForm, location: e.target.value })}
                placeholder="North Horizon Valley"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Area (Decimals) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                required
                value={plotForm.areaDecimals}
                onChange={(e) => {
                  const raw = e.target.value;
                  const num = Number(raw);
                  const nextHa =
                    raw && !Number.isNaN(num) && num >= 0
                      ? Number(decimalsToHectares(num).toFixed(4)).toString()
                      : '';
                  setPlotForm({ ...plotForm, areaDecimals: raw, areaHectares: nextHa });
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Area (Hectares — Auto-Synced)
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={plotForm.areaHectares}
                onChange={(e) => {
                  const raw = e.target.value;
                  const num = Number(raw);
                  const nextDec =
                    raw && !Number.isNaN(num) && num >= 0
                      ? Number(hectaresToDecimals(num).toFixed(2)).toString()
                      : '';
                  setPlotForm({ ...plotForm, areaHectares: raw, areaDecimals: nextDec });
                }}
                placeholder="e.g. 0.50 or 1.00"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Dimensions *
              </label>
              <input
                type="text"
                required
                value={plotForm.dimensions}
                onChange={(e) => setPlotForm({ ...plotForm, dimensions: e.target.value })}
                placeholder="80 ft × 100 ft"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Total Price ({settings.currencySymbol}) *
              </label>
              <input
                type="number"
                required
                value={plotForm.price}
                onChange={(e) => setPlotForm({ ...plotForm, price: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Price Per Decimal (Auto if blank)
              </label>
              <input
                type="number"
                value={plotForm.pricePerDecimal}
                onChange={(e) => setPlotForm({ ...plotForm, pricePerDecimal: e.target.value })}
                placeholder="Auto-calculated"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Road Access *
              </label>
              <input
                type="text"
                required
                value={plotForm.roadAccess}
                onChange={(e) => setPlotForm({ ...plotForm, roadAccess: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">Status</label>
              <select
                value={plotForm.status}
                onChange={(e) =>
                  setPlotForm({ ...plotForm, status: e.target.value as PlotStatus })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md"
              >
                <option value="Available">Available</option>
                <option value="Reserved">Reserved</option>
                <option value="Sold">Sold</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Latitude *
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={plotForm.latitude}
                onChange={(e) => setPlotForm({ ...plotForm, latitude: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Longitude *
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={plotForm.longitude}
                onChange={(e) => setPlotForm({ ...plotForm, longitude: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md font-mono"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="inline-flex items-center gap-2 text-sm text-[#10241D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={plotForm.featured}
                  onChange={(e) => setPlotForm({ ...plotForm, featured: e.target.checked })}
                  className="rounded border-[#D4DDD8]"
                />
                Feature on Home Page
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Property Description *
              </label>
              <textarea
                rows={4}
                required
                value={plotForm.description}
                onChange={(e) => setPlotForm({ ...plotForm, description: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Key Highlights (One per line)
              </label>
              <textarea
                rows={4}
                value={plotForm.highlightsText}
                onChange={(e) => setPlotForm({ ...plotForm, highlightsText: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md"
              />
            </div>
          </div>

          {/* Multi-photo upload */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="block text-xs font-medium text-[#3D524A]">
                Property Photos ({plotForm.images.length})
              </label>
              <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#0B281F] bg-white border border-[#D4DDD8] rounded-md cursor-pointer hover:bg-[#F7F9F8]">
                <Upload className="w-3.5 h-3.5" />
                {uploadingPhotos ? 'Uploading...' : 'Upload Multiple Photos'}
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {plotForm.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {plotForm.images.map((url, idx) => (
                  <div
                    key={`${url}-${idx}`}
                    className="relative aspect-[4/3] rounded overflow-hidden border border-[#E2E8E5] bg-white"
                  >
                    <SmartImage src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        setPlotForm((prev) => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== idx),
                        }))
                      }
                      className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-semibold bg-black/75 text-white rounded"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowPlotForm(false)}
              className="px-4 py-2 text-xs font-medium text-[#3D524A] border border-[#D4DDD8] rounded-md bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingPlot}
              className="px-6 py-2 text-xs font-semibold text-white bg-[#0B281F] rounded-md hover:bg-[#12382B] disabled:opacity-60"
            >
              {savingPlot ? 'Saving...' : editingPlotId ? 'Save Changes' : 'Create Plot'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E2E8E5] rounded-lg p-5">
              <div className="text-xs text-[#5B7269]">Total Plots</div>
              <div className="text-3xl font-semibold text-[#0B281F] tabular-nums mt-1">
                {stats?.totalPlots ?? plots.length}
              </div>
              <div className="text-xs text-[#4B635A] mt-2 tabular-nums">
                {stats?.availablePlots ?? 0} Available · {stats?.reservedPlots ?? 0} Reserved ·{' '}
                {stats?.soldPlots ?? 0} Sold
              </div>
            </div>

            <div className="bg-white border border-[#E2E8E5] rounded-lg p-5">
              <div className="text-xs text-[#5B7269]">Available Inventory Value</div>
              <div className="text-3xl font-semibold text-[#0B281F] tabular-nums mt-1">
                {formatCurrency(stats?.availableInventoryValue ?? 0, settings.currencySymbol)}
              </div>
              <div className="text-xs text-[#4B635A] mt-2">Active unsold parcels</div>
            </div>

            <div className="bg-white border border-[#E2E8E5] rounded-lg p-5">
              <div className="text-xs text-[#5B7269]">Customer Inquiries</div>
              <div className="text-3xl font-semibold text-[#0B281F] tabular-nums mt-1">
                {stats?.totalInquiries ?? inquiries.length}
              </div>
              <div className="text-xs text-[#9E7822] font-medium mt-2 tabular-nums">
                {stats?.newInquiries ?? 0} awaiting follow-up
              </div>
            </div>

            <div className="bg-white border border-[#E2E8E5] rounded-lg p-5">
              <div className="text-xs text-[#5B7269]">Site Visit Bookings</div>
              <div className="text-3xl font-semibold text-[#0B281F] tabular-nums mt-1">
                {stats?.totalVisits ?? visits.length}
              </div>
              <div className="text-xs text-[#9E7822] font-medium mt-2 tabular-nums">
                {stats?.pendingVisits ?? 0} pending confirmation
              </div>
            </div>
          </div>

          {loadingAdmin && (
            <p className="text-xs text-[#5B7269]">Refreshing latest metrics...</p>
          )}
        </div>
      )}

      {/* TAB 2: Plots Manager */}
      {activeTab === 'plots' && (
        <div className="bg-white border border-[#E2E8E5] rounded-lg overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8E5] bg-[#F7F9F8] text-xs font-semibold text-[#3D524A]">
                <th className="py-3 px-4">Plot ID</th>
                <th className="py-3 px-4">Name &amp; Location</th>
                <th className="py-3 px-4 text-right">Size</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4">Availability</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E5] text-sm">
              {plots.map((plot) => (
                <tr key={plot.id} className="hover:bg-[#F7F9F8]/60">
                  <td className="py-3 px-4 font-mono text-xs font-medium text-[#0B281F]">
                    {plot.plotCode}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-[#0B281F]">{plot.name}</div>
                    <div className="text-xs text-[#5B7269]">{plot.location}</div>
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-xs">
                    <div className="font-medium text-[#0B281F]">{plot.areaDecimals} Dec</div>
                    <div className="text-[11px] text-[#5B7269]">
                      {formatHectares(plot.areaDecimals)}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-medium">
                    {formatCurrency(plot.price, settings.currencySymbol)}
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={plot.status}
                      onChange={(e) =>
                        void handleQuickStatus(plot, e.target.value as PlotStatus)
                      }
                      className="px-2.5 py-1 text-xs border border-[#D4DDD8] rounded bg-white text-[#10241D]"
                    >
                      <option value="Available">Available</option>
                      <option value="Reserved">Reserved</option>
                      <option value="Sold">Sold</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                    <button
                      type="button"
                      onClick={() => openEditPlot(plot)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#0B281F] border border-[#D4DDD8] rounded hover:bg-[#F7F9F8]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeletePlot(plot)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 border border-red-200 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: Customer Inquiries */}
      {activeTab === 'inquiries' && (
        <div className="bg-white border border-[#E2E8E5] rounded-lg overflow-x-auto">
          {inquiries.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#5B7269]">
              No customer inquiries submitted yet.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8E5] bg-[#F7F9F8] text-xs font-semibold text-[#3D524A]">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Plot Interest</th>
                  <th className="py-3 px-4">Message</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E5] text-sm">
                {inquiries.map((inq) => (
                  <tr key={inq.id}>
                    <td className="py-3 px-4 align-top">
                      <div className="font-medium text-[#0B281F]">{inq.customerName}</div>
                      <div className="text-xs text-[#5B7269]">{inq.customerPhone}</div>
                      <div className="text-xs text-[#5B7269]">{inq.customerEmail}</div>
                    </td>
                    <td className="py-3 px-4 align-top text-xs text-[#3D524A]">
                      {inq.plotName || 'General Inquiry'}
                    </td>
                    <td className="py-3 px-4 align-top text-xs text-[#273E36] max-w-sm">
                      {inq.message}
                    </td>
                    <td className="py-3 px-4 align-top">
                      <select
                        value={inq.status}
                        onChange={(e) =>
                          void handleInquiryStatus(inq.id, e.target.value as InquiryStatus)
                        }
                        className="px-2 py-1 text-xs border border-[#D4DDD8] rounded bg-white"
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 align-top text-right">
                      <button
                        type="button"
                        onClick={() => void handleDeleteInquiry(inq.id)}
                        className="text-xs text-red-700 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 4: Site Visits */}
      {activeTab === 'visits' && (
        <div className="bg-white border border-[#E2E8E5] rounded-lg overflow-x-auto">
          {visits.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#5B7269]">
              No site visits booked yet.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8E5] bg-[#F7F9F8] text-xs font-semibold text-[#3D524A]">
                  <th className="py-3 px-4">Visitor</th>
                  <th className="py-3 px-4">Parcel</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E5] text-sm">
                {visits.map((vis) => (
                  <tr key={vis.id}>
                    <td className="py-3 px-4 align-top">
                      <div className="font-medium text-[#0B281F]">{vis.visitorName}</div>
                      <div className="text-xs text-[#5B7269]">{vis.visitorPhone}</div>
                      <div className="text-xs text-[#5B7269]">{vis.visitorEmail}</div>
                    </td>
                    <td className="py-3 px-4 align-top text-xs text-[#3D524A]">
                      <div>{vis.plotName || 'General Tour'}</div>
                      {vis.notes && (
                        <div className="text-[#5B7269] mt-1">Note: {vis.notes}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 align-top text-xs tabular-nums">
                      <div className="font-medium text-[#0B281F]">{vis.preferredDate}</div>
                      <div className="text-[#5B7269]">{vis.preferredTime}</div>
                      <div className="text-[#5B7269]">{vis.guestsCount} guest(s)</div>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <select
                        value={vis.status}
                        onChange={(e) =>
                          void handleVisitStatus(vis.id, e.target.value as VisitStatus)
                        }
                        className="px-2 py-1 text-xs border border-[#D4DDD8] rounded bg-white"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 align-top text-right">
                      <button
                        type="button"
                        onClick={() => void handleDeleteVisit(vis.id)}
                        className="text-xs text-red-700 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 5: Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {adminReviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border border-[#E2E8E5] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="text-xs font-mono text-[#5B7269]">
                  {rev.rating}/5 · {rev.isPublished ? 'Published' : 'Hidden'} ·{' '}
                  {rev.plotPurchased || 'General'}
                </div>
                <div className="font-semibold text-sm text-[#0B281F] mt-1">
                  {rev.customerName} — {rev.customerRole}
                </div>
                <p className="text-sm text-[#3D524A] mt-1">{rev.comment}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void handleToggleReview(rev)}
                  className="px-3 py-1.5 text-xs font-medium border border-[#D4DDD8] rounded hover:bg-[#F7F9F8]"
                >
                  {rev.isPublished ? 'Hide' : 'Publish'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteReview(rev.id)}
                  className="px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 rounded hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 6: Website Content & WhatsApp */}
      {activeTab === 'content' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-white border border-[#E2E8E5] rounded-lg p-6 space-y-5"
        >
          <h2 className="font-display text-2xl font-semibold text-[#0B281F]">
            Website Content, Contact &amp; WhatsApp Settings
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={settingsForm.companyName}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, companyName: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#D4DDD8] rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                WhatsApp Number (Country code + digits, no +)
              </label>
              <input
                type="text"
                value={settingsForm.whatsappNumber}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#D4DDD8] rounded-md font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Hero Headline
              </label>
              <input
                type="text"
                value={settingsForm.heroHeadline}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, heroHeadline: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#D4DDD8] rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={settingsForm.currencySymbol}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, currencySymbol: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#D4DDD8] rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={settingsForm.contactEmail}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, contactEmail: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#D4DDD8] rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={settingsForm.contactPhone}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, contactPhone: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#D4DDD8] rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#3D524A] mb-1">
              Hero Subheadline
            </label>
            <textarea
              rows={2}
              value={settingsForm.heroSubheadline}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, heroSubheadline: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-[#D4DDD8] rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#3D524A] mb-1">
              About Us Story
            </label>
            <textarea
              rows={3}
              value={settingsForm.aboutBody}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, aboutBody: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-[#D4DDD8] rounded-md"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Office Address
              </label>
              <input
                type="text"
                value={settingsForm.officeAddress}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, officeAddress: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#D4DDD8] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Instagram URL
              </label>
              <input
                type="url"
                value={settingsForm.socialInstagram}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, socialInstagram: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#D4DDD8] rounded-md"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0B281F] rounded-md hover:bg-[#12382B] disabled:opacity-60"
          >
            {savingSettings ? 'Saving Settings...' : 'Save Website Content'}
          </button>
        </form>
      )}

      {/* TAB 7: Beginner-Friendly Setup, Credentials & Supabase Live Guide */}
      {activeTab === 'guide' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E8E5] rounded-lg p-6 space-y-6 text-sm text-[#273E36]">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#0B281F]">
                Live Deployment, Supabase &amp; Security Guide
              </h2>
              <p className="text-xs text-[#5B7269] mt-1">
                Everything configured for seamless live hosting with Supabase PostgreSQL and
                Supabase Auth.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-md bg-[#F7F9F8] border border-[#E2E8E5]">
                <div className="text-xs text-[#5B7269]">Active Admin Auth</div>
                <div className="text-sm font-semibold text-[#0B281F] mt-1">
                  {authConfig?.supabaseConfigured
                    ? 'Supabase Email & Password'
                    : authConfig?.envCredentialsConfigured
                    ? 'Environment Secret Override'
                    : 'Database Scrypt Credentials'}
                </div>
              </div>
              <div className="p-4 rounded-md bg-[#F7F9F8] border border-[#E2E8E5]">
                <div className="text-xs text-[#5B7269]">Database Connection</div>
                <div className="text-sm font-semibold text-[#0B281F] mt-1">
                  {authConfig?.databaseUrlConfigured
                    ? 'DATABASE_URL (Supabase / Live Postgres)'
                    : 'Cloud SQL Managed Postgres'}
                </div>
              </div>
              <div className="p-4 rounded-md bg-[#F7F9F8] border border-[#E2E8E5]">
                <div className="text-xs text-[#5B7269]">Production Server Entry</div>
                <div className="text-sm font-mono font-semibold text-[#0B281F] mt-1">
                  npm run build &amp;&amp; npm start
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-[#0B281F]">
                1. Connecting Your Live Supabase Project
              </h3>
              <ol className="list-decimal pl-5 space-y-1.5 text-xs sm:text-sm leading-relaxed">
                <li>
                  Open your Supabase Dashboard &rarr; <strong>SQL Editor</strong> &rarr; run the
                  contents of{' '}
                  <code className="font-mono text-xs bg-[#F7F9F8] px-1.5 py-0.5 rounded">
                    /supabase/schema_and_rls.sql
                  </code>
                  .
                </li>
                <li>
                  Go to <strong>Authentication &rarr; Users</strong>, create your Admin user with
                  Email &amp; Password, then promote it in SQL:{' '}
                  <code className="font-mono text-xs bg-[#F7F9F8] px-1.5 py-0.5 rounded">
                    update public.profiles set role = &apos;admin&apos; where email =
                    &apos;your@email.com&apos;;
                  </code>
                </li>
                <li>
                  Add <code className="font-mono text-xs bg-[#F7F9F8] px-1 rounded">DATABASE_URL</code>,{' '}
                  <code className="font-mono text-xs bg-[#F7F9F8] px-1 rounded">SUPABASE_URL</code>,{' '}
                  <code className="font-mono text-xs bg-[#F7F9F8] px-1 rounded">
                    SUPABASE_ANON_KEY
                  </code>
                  , and{' '}
                  <code className="font-mono text-xs bg-[#F7F9F8] px-1 rounded">ADMIN_EMAIL</code> in
                  your live server environment variables (see{' '}
                  <code className="font-mono text-xs bg-[#F7F9F8] px-1 rounded">.env.example</code>
                  ).
                </li>
              </ol>
            </div>
          </div>

          {authUser.provider === 'database' && (
            <form
              onSubmit={handleChangeCredentials}
              className="bg-white border border-[#E2E8E5] rounded-lg p-6 space-y-4 max-w-xl"
            >
              <h3 className="font-display text-2xl font-semibold text-[#0B281F]">
                Update Admin Username &amp; Password
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#3D524A] mb-1">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={curPassword}
                    onChange={(e) => setCurPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#D4DDD8] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3D524A] mb-1">
                    New Username (Optional)
                  </label>
                  <input
                    type="text"
                    value={newAdminUsername}
                    onChange={(e) => setNewAdminUsername(e.target.value)}
                    placeholder={authUser.username}
                    className="w-full px-3 py-2 text-sm border border-[#D4DDD8] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3D524A] mb-1">
                    New Password (min 8 chars) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#D4DDD8] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3D524A] mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#D4DDD8] rounded-md"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={savingCredentials}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#0B281F] rounded-md hover:bg-[#12382B] disabled:opacity-60"
              >
                {savingCredentials ? 'Updating...' : 'Update Credentials'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
