import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BusFront, CalendarDays, Download, MapPin, Ticket, XCircle } from 'lucide-react';
import { EmptyState, Modal, PageLoader, StatusBadge } from '../components/ui';
import { api } from '../lib/api';
import { formatDate, formatINR, formatTime, relativeLabel } from '../lib/format';
import { Link } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useToast } from '../lib/toast';
import type { MyBooking } from '../types/bus';

type Tab = 'upcoming' | 'completed' | 'cancelled';

export default function MyBookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [cancelTarget, setCancelTarget] = useState<MyBooking | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBookings(await api.myBookings());
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not load your bookings.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) void load();
    else setLoading(false);
  }, [user, load]);

  if (authLoading) return <PageLoader />;

  if (!user) {
    return (
      <div className="page-shell py-16">
        <EmptyState
          icon={<Ticket className="size-5" />}
          title="Sign in to see your bookings"
          body="All your tickets, upcoming journeys and refunds live in one place."
          action={<Link to={`/login?next=${encodeURIComponent('/bookings')}`} className="btn btn-primary">{t('auth.signIn')}</Link>}
        />
      </div>
    );
  }

  const now = Date.now();
  const groups: Record<Tab, MyBooking[]> = {
    upcoming: bookings.filter((b) => b.status !== 'cancelled' && new Date(b.trip.departAt).getTime() >= now - 3600000),
    completed: bookings.filter((b) => b.status !== 'cancelled' && new Date(b.trip.departAt).getTime() < now - 3600000),
    cancelled: bookings.filter((b) => b.status === 'cancelled'),
  };

  const cancel = async () => {
    if (!cancelTarget) return;
    setBusy(true);
    try {
      const result = await api.cancelBooking(cancelTarget.code, reason);
      toast.push(`${result.refundNote} Refund: ${formatINR(result.refundAmount)}`, 'success');
      setCancelTarget(null);
      setReason('');
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not cancel this booking.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: 'upcoming', label: t('bookings.upcoming'), count: groups.upcoming.length },
    { key: 'completed', label: t('bookings.completed'), count: groups.completed.length },
    { key: 'cancelled', label: t('bookings.cancelled'), count: groups.cancelled.length },
  ];

  const list = groups[tab];

  return (
    <div className="page-shell py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">{t('bookings.title')}</h1>
          <p className="mt-1 text-sm text-ink-500">Tickets, refunds and travel history for {user.email}</p>
        </div>
        <Link to="/search" className="btn btn-primary">{t('common.bookNow')} <ArrowRight className="size-4" /></Link>
      </div>

      <div className="mt-6 flex gap-1 rounded-xl border border-mist-200 bg-mist-50 p-1">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tab === item.key ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            {item.label} <span className="ml-1 text-[11px] text-ink-300">{item.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-5">
        {loading ? (
          <PageLoader label={t('common.loading')} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<BusFront className="size-5" />}
            title={t('bookings.empty')}
            body="Search your route to find your next journey."
            action={<Link to="/search" className="btn btn-primary">{t('common.searchBuses')}</Link>}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((booking) => (
              <article key={booking.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">{booking.code}</span>
                      <StatusBadge status={booking.status} />
                      {booking.status !== 'cancelled' ? <StatusBadge status={booking.paymentStatus} /> : null}
                    </div>
                    <h2 className="mt-2 flex items-center gap-1.5 text-base font-bold text-ink-900">
                      <MapPin className="size-4 text-brand-600" /> {booking.route.origin} → {booking.route.destination}
                    </h2>
                    <p className="text-xs text-ink-500">{booking.bus.name} · {booking.bus.busType} · {booking.operator.name}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-500">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="size-3" /> {formatDate(booking.trip.departAt, 'long')}</span>
                      <span className="inline-flex items-center gap-1"><BusFront className="size-3" /> {formatTime(booking.trip.departAt)} → {formatTime(booking.trip.arriveAt)}</span>
                      <span className="inline-flex items-center gap-1"><Ticket className="size-3" /> {booking.seats}</span>
                      <span className="font-semibold text-brand-700">{relativeLabel(booking.trip.departAt)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-ink-900">{formatINR(booking.totalAmount)}</p>
                    {booking.refundAmount > 0 ? <p className="text-[11px] font-semibold text-emerald-700">Refund {formatINR(booking.refundAmount)}</p> : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-mist-100 pt-3">
                  <Link to={`/bookings/${booking.code}`} className="btn btn-ghost px-3 py-1.5 text-xs">View details</Link>
                  {booking.status === 'confirmed' ? (
                    <a href={`/api/bookings/${booking.code}/ticket.pdf`} download className="btn btn-ghost px-3 py-1.5 text-xs">
                      <Download className="size-3.5" /> {t('common.download')}
                    </a>
                  ) : null}
                  {booking.status !== 'cancelled' ? (
                    <button type="button" onClick={() => setCancelTarget(booking)} className="btn btn-danger px-3 py-1.5 text-xs">
                      <XCircle className="size-3.5" /> {t('bookings.cancelBooking')}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Modal open={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} title={`Cancel ${cancelTarget?.code || ''}`}>
        <p className="text-sm text-ink-500">
          {t('bookings.cancelNote')} 90% refund if you cancel at least 24 hours before departure, 50% between 12–24 hours, and no refund under 12 hours.
        </p>
        <label className="mt-4 block">
          <span className="label">Reason (optional)</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="field" placeholder="Tell us why you are cancelling" />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setCancelTarget(null)} className="btn btn-ghost">{t('common.back')}</button>
          <button type="button" onClick={cancel} disabled={busy} className="btn btn-danger">
            {busy ? t('common.loading') : 'Confirm cancellation'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
