import { useEffect, useState } from 'react';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { AdminHeader, IconButton, TableShell } from './parts';
import { Field, Modal, PageLoader } from '../../components/ui';
import { api, type AdminBanner } from '../../lib/api';
import { useSite } from '../../lib/site';
import { useToast } from '../../lib/toast';

const SETTING_FIELDS: Array<{ key: string; label: string; hint?: string; multiline?: boolean }> = [
  { key: 'brandName', label: 'Brand name' },
  { key: 'tagline', label: 'Tagline' },
  { key: 'supportPhone', label: 'Support phone' },
  { key: 'supportEmail', label: 'Support email' },
  { key: 'whatsappNumber', label: 'WhatsApp number', hint: 'Digits with country code, no +' },
  { key: 'officeAddress', label: 'Office address', multiline: true },
  { key: 'refundPolicy', label: 'Refund policy summary', multiline: true },
];

const emptyBanner = { title: '', subtitle: '', ctaText: 'Book now', ctaLink: '/search', active: true, sortOrder: 0 };

export default function AdminContentPage() {
  const toast = useToast();
  const { reload } = useSite();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [bannerForm, setBannerForm] = useState<typeof emptyBanner & { id?: number }>(emptyBanner);

  const load = async () => {
    setLoading(true);
    try {
      const [settingMap, bannerList] = await Promise.all([api.admin.settings(), api.admin.banners()]);
      setSettings(settingMap);
      setBanners(bannerList);
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not load content.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const payload: Record<string, string> = {};
      for (const field of SETTING_FIELDS) payload[field.key] = settings[field.key] || '';
      await api.admin.saveSettings(payload);
      await reload();
      toast.push('Website content updated.', 'success');
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not save content.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveBanner = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (bannerForm.id) await api.admin.updateBanner(bannerForm.id, bannerForm);
      else await api.admin.createBanner(bannerForm);
      toast.push('Banner saved.', 'success');
      setBannerOpen(false);
      setBannerForm(emptyBanner);
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not save banner.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeBanner = async (banner: AdminBanner) => {
    if (!confirm(`Delete banner "${banner.title}"?`)) return;
    try {
      await api.admin.deleteBanner(banner.id);
      toast.push('Banner deleted.', 'success');
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not delete banner.', 'error');
    }
  };

  if (loading) return <PageLoader label="Loading content…" />;

  return (
    <div>
      <AdminHeader title="Website content" subtitle="Brand, support details and homepage offers — no code needed." />

      <form onSubmit={saveSettings} className="card p-5">
        <h2 className="text-sm font-bold text-ink-900">Brand & support details</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {SETTING_FIELDS.map((field) => (
            <Field key={field.key} label={field.label} hint={field.hint}>
              {field.multiline ? (
                <textarea
                  rows={3}
                  value={settings[field.key] || ''}
                  onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                  className="field"
                />
              ) : (
                <input
                  value={settings[field.key] || ''}
                  onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                  className="field"
                />
              )}
            </Field>
          ))}
        </div>
        <button type="submit" disabled={busy} className="btn btn-primary mt-4">
          <Save className="size-4" /> {busy ? 'Saving…' : 'Save content'}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink-900">Homepage offers</h2>
        <button type="button" onClick={() => { setBannerForm(emptyBanner); setBannerOpen(true); }} className="btn btn-ghost">
          <Plus className="size-4" /> Add banner
        </button>
      </div>
      <div className="mt-3">
        <TableShell head={['Title', 'Subtitle', 'CTA', 'Order', 'Status', 'Actions']}>
          {banners.map((banner) => (
            <tr key={banner.id}>
              <td className="px-4 py-2.5 font-semibold">{banner.title}</td>
              <td className="max-w-sm px-4 py-2.5 text-ink-500">{banner.subtitle}</td>
              <td className="px-4 py-2.5 text-[11px] text-ink-500">{banner.ctaText} → {banner.ctaLink}</td>
              <td className="px-4 py-2.5">{banner.sortOrder}</td>
              <td className="px-4 py-2.5">
                <span className={`text-xs font-bold ${banner.active ? 'text-emerald-600' : 'text-slate-400'}`}>{banner.active ? 'Active' : 'Inactive'}</span>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex gap-1.5">
                  <IconButton label="Edit banner" onClick={() => { setBannerForm(banner); setBannerOpen(true); }}>
                    <Pencil className="size-3.5" />
                  </IconButton>
                  <IconButton label="Delete banner" tone="danger" onClick={() => removeBanner(banner)}>
                    <Trash2 className="size-3.5" />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
          {banners.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-ink-500">No banners yet.</td></tr>
          ) : null}
        </TableShell>
      </div>

      <Modal open={bannerOpen} onClose={() => setBannerOpen(false)} title={bannerForm.id ? 'Edit banner' : 'Add banner'}>
        <form onSubmit={saveBanner} className="space-y-3">
          <Field label="Title">
            <input value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} className="field" required />
          </Field>
          <Field label="Subtitle">
            <textarea rows={2} value={bannerForm.subtitle} onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })} className="field" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Button label">
              <input value={bannerForm.ctaText} onChange={(e) => setBannerForm({ ...bannerForm, ctaText: e.target.value })} className="field" />
            </Field>
            <Field label="Button link">
              <input value={bannerForm.ctaLink} onChange={(e) => setBannerForm({ ...bannerForm, ctaLink: e.target.value })} className="field" />
            </Field>
            <Field label="Sort order">
              <input type="number" value={bannerForm.sortOrder} onChange={(e) => setBannerForm({ ...bannerForm, sortOrder: Number(e.target.value) })} className="field" />
            </Field>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" checked={bannerForm.active} onChange={(e) => setBannerForm({ ...bannerForm, active: e.target.checked })} className="size-4 accent-brand-600" />
              Active
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setBannerOpen(false)} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save banner'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
