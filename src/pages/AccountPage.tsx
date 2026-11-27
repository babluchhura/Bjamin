import { useEffect, useState } from 'react';
import { CreditCard, KeyRound, Save, UserRound } from 'lucide-react';
import { EmptyState, Field, PageLoader, StatusBadge } from '../components/ui';
import { api } from '../lib/api';
import { formatDate, formatINR } from '../lib/format';
import { Link } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useToast } from '../lib/toast';
import type { MyBooking } from '../types/bus';

export default function AccountPage() {
  const { user, loading, setUser } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile({ name: user.name, phone: user.phone || '' });
    api.myBookings().then(setBookings).catch(() => setBookings([]));
  }, [user]);

  if (loading) return <PageLoader />;
  if (!user) {
    return (
      <div className="page-shell py-16">
        <EmptyState
          icon={<UserRound className="size-5" />}
          title="Sign in to manage your account"
          action={<Link to={`/login?next=${encodeURIComponent('/account')}`} className="btn btn-primary">{t('auth.signIn')}</Link>}
        />
      </div>
    );
  }

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { user: updated } = await api.updateProfile(profile);
      setUser(updated);
      toast.push('Profile updated.', 'success');
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not update profile.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      toast.push('Password changed.', 'success');
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not change password.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const payments = bookings.filter((b) => b.paymentStatus !== 'pending');

  return (
    <div className="page-shell py-10">
      <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">{t('account.title')}</h1>
      <p className="mt-1 text-sm text-ink-500">Signed in as {user.email}{user.role === 'admin' ? ' · Administrator' : ''}</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <form onSubmit={saveProfile} className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold"><UserRound className="size-4 text-brand-600" /> {t('account.profile')}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label={t('common.name')}>
              <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="field" />
            </Field>
            <Field label={t('common.phone')}>
              <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className="field" inputMode="numeric" />
            </Field>
          </div>
          <Field label={t('common.email')}>
            <input value={user.email} readOnly className="field bg-mist-50 text-ink-500" />
          </Field>
          <button type="submit" disabled={busy} className="btn btn-primary mt-4">
            <Save className="size-4" /> {t('account.update')}
          </button>
        </form>

        <form onSubmit={changePassword} className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold"><KeyRound className="size-4 text-brand-600" /> {t('account.changePassword')}</h2>
          <div className="mt-4 space-y-3">
            <Field label={t('account.currentPassword')}>
              <input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} className="field" autoComplete="current-password" />
            </Field>
            <Field label={t('account.newPassword')} hint="At least 8 characters.">
              <input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} className="field" autoComplete="new-password" />
            </Field>
          </div>
          <button type="submit" disabled={busy} className="btn btn-ghost mt-4">Update password</button>
        </form>
      </div>

      <div className="card mt-5 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-mist-100 px-4 py-3">
          <CreditCard className="size-4 text-brand-600" />
          <h2 className="text-sm font-bold">{t('account.payments')}</h2>
        </div>
        {payments.length === 0 ? (
          <p className="px-4 py-5 text-sm text-ink-500">No payments yet. <Link to="/search" className="link">Book your first trip</Link>.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-mist-50 text-[11px] uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-4 py-2 font-bold">Booking</th>
                  <th className="px-4 py-2 font-bold">Route</th>
                  <th className="px-4 py-2 font-bold">Date</th>
                  <th className="px-4 py-2 text-right font-bold">Amount</th>
                  <th className="px-4 py-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-100">
                {payments.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-2"><Link to={`/bookings/${b.code}`} className="font-semibold text-brand-700">{b.code}</Link></td>
                    <td className="px-4 py-2 text-ink-500">{b.route.origin} → {b.route.destination}</td>
                    <td className="px-4 py-2 text-ink-500">{formatDate(b.trip.departAt)}</td>
                    <td className="px-4 py-2 text-right font-semibold">{formatINR(b.totalAmount)}</td>
                    <td className="px-4 py-2"><StatusBadge status={b.paymentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
