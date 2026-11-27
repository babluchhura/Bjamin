import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { AdminHeader, IconButton, TableShell } from './parts';
import { Field, Modal, PageLoader } from '../../components/ui';
import { api, type AdminCoupon } from '../../lib/api';
import { formatINR } from '../../lib/format';
import { useToast } from '../../lib/toast';

const empty = {
  code: '',
  description: '',
  discountType: 'percent',
  value: 10,
  minAmount: 0,
  maxDiscount: 0,
  usageLimit: 0,
  active: true,
};

export default function AdminCouponsPage() {
  const toast = useToast();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<typeof empty & { id?: number }>(empty);

  const load = async () => {
    setLoading(true);
    try {
      setCoupons(await api.admin.coupons());
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not load coupons.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (form.id) await api.admin.updateCoupon(form.id, form);
      else await api.admin.createCoupon(form);
      toast.push('Coupon saved.', 'success');
      setOpen(false);
      setForm(empty);
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not save coupon.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (coupon: AdminCoupon) => {
    if (!confirm(`Delete coupon ${coupon.code}?`)) return;
    try {
      await api.admin.deleteCoupon(coupon.id);
      toast.push('Coupon deleted.', 'success');
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not delete coupon.', 'error');
    }
  };

  if (loading) return <PageLoader label="Loading coupons…" />;

  return (
    <div>
      <AdminHeader
        title="Coupons"
        subtitle="Discounts are validated on the server against the fare before payment."
        action={<button type="button" onClick={() => { setForm(empty); setOpen(true); }} className="btn btn-primary"><Plus className="size-4" /> New coupon</button>}
      />

      <TableShell head={['Code', 'Description', 'Discount', 'Minimum fare', 'Used', 'Status', 'Actions']}>
        {coupons.map((coupon) => (
          <tr key={coupon.id}>
            <td className="px-4 py-2.5 font-mono text-sm font-bold text-brand-700">{coupon.code}</td>
            <td className="px-4 py-2.5 text-ink-500">{coupon.description || '—'}</td>
            <td className="px-4 py-2.5 font-semibold">
              {coupon.discountType === 'percent' ? `${coupon.value}%` : formatINR(coupon.value)}
              {coupon.maxDiscount > 0 ? <span className="ml-1 text-[11px] font-normal text-ink-300">max {formatINR(coupon.maxDiscount)}</span> : null}
            </td>
            <td className="px-4 py-2.5 text-ink-500">{coupon.minAmount ? formatINR(coupon.minAmount) : '—'}</td>
            <td className="px-4 py-2.5 text-ink-500">{coupon.usedCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}</td>
            <td className="px-4 py-2.5">
              <span className={`text-xs font-bold ${coupon.active ? 'text-emerald-600' : 'text-slate-400'}`}>{coupon.active ? 'Active' : 'Inactive'}</span>
            </td>
            <td className="px-4 py-2.5">
              <div className="flex gap-1.5">
                <IconButton label="Edit coupon" onClick={() => { setForm(coupon); setOpen(true); }}>
                  <Pencil className="size-3.5" />
                </IconButton>
                <IconButton label="Delete coupon" tone="danger" onClick={() => remove(coupon)}>
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
            </td>
          </tr>
        ))}
        {coupons.length === 0 ? (
          <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-ink-500">No coupons yet.</td></tr>
        ) : null}
      </TableShell>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? 'Edit coupon' : 'New coupon'}>
        <form onSubmit={save} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Code">
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="field font-mono" required />
            </Field>
            <Field label="Type">
              <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="field">
                <option value="percent">Percentage</option>
                <option value="flat">Flat amount</option>
              </select>
            </Field>
            <Field label={form.discountType === 'percent' ? 'Percent off' : 'Amount off (₹)'}>
              <input type="number" min="1" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="field" />
            </Field>
            <Field label="Maximum discount (₹)" hint="0 = no cap">
              <input type="number" min="0" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: Number(e.target.value) })} className="field" />
            </Field>
            <Field label="Minimum fare (₹)">
              <input type="number" min="0" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: Number(e.target.value) })} className="field" />
            </Field>
            <Field label="Usage limit" hint="0 = unlimited">
              <input type="number" min="0" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })} className="field" />
            </Field>
          </div>
          <Field label="Description">
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="field" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="size-4 accent-brand-600" />
            Active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save coupon'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
