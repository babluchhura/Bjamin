import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, CreditCard, Download, MapPin, Ticket, UserRound, XCircle } from 'lucide-react';
import { EmptyState, Modal, PageLoader, StatusBadge } from '../components/ui';
import { api } from '../lib/api';
import { formatDate, formatDateTime, formatINR, formatTime } from '../lib/format';
import { Link } from '../lib/router';
import { useI18n } from '../lib/i18n';
import { useToast } from '../lib/toast';
import type { BookingDetail } from '../types/bus';

export default function BookingDetailPage({ code }: { code: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setDetail(await api.booking(code));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking not found.');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <PageLoader />;
  if (error || !detail) {
    return (
      <div className="page-shell py-16">
        <EmptyState icon={<Ticket className="size-5" />} title="Booking not available" body={error} action={<Link to="/bookings" className="btn btn-primary">{t('bookings.title')}</Link>} />
      </div>
    );
  }

  const { booking, trip, passengers, payments } = detail;

  const cancel = async () => {
    setBusy(true);
    try {
      const result = await api.cancelBooking(booking.code, reason);
      toast.push(`${result.refundNote} Refund: ${formatINR(result.refundAmount)}`, 'success');
      setCancelOpen(false);
      await load();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Could not cancel this booking.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell py-8">
      <Link to="/bookings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-700">
        <ArrowLeft className="size-4" /> {t('bookings.title')}
      </Link>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">{booking.code}</span>
                  <StatusBadge status={booking.status} />
                  <StatusBadge status={booking.paymentStatus} />
                </div>
                <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900">
                  {trip ? `${trip.route.origin} → ${trip.route.destination}` : 'Trip details'}
                </h1>
                <p className="text-sm text-ink-500">
                  {trip?.bus.name} · {trip?.bus.busType} · {trip?.operator.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-ink-900">{formatINR(booking.totalAmount)}</p>
                {booking.refundAmount > 0 ? <p className="text-xs font-semibold text-emerald-700">Refunded {formatINR(booking.refundAmount)}</p> : null}
              </div>
            </div>

            <div className="mt-4 grid gap-3 rounded-xl bg-mist-50 p-4 sm:grid-cols-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Journey date</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold"><CalendarDays className="size-3.5 text-brand-600" /> {trip ? formatDate(trip.trip.departAt, 'long') : ''}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Timing</p>
                <p className="mt-0.5 text-sm font-semibold">{trip ? `${formatTime(trip.trip.departAt)} → ${formatTime(trip.trip.arriveAt)}` : ''}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">{t('booking.boarding')}</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold"><MapPin className="size-3.5 text-brand-600" /> {booking.boardingPoint}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">{t('booking.dropping')}</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold"><MapPin className="size-3.5 text-emerald-600" /> {booking.droppingPoint}</p>
              </div>
            </div>
          </div>

          <div className="card mt-4 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-mist-100 px-4 py-3">
              <UserRound className="size-4 text-brand-600" />
              <h2 className="text-sm font-bold">{t('common.passengers')}</h2>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-mist-50 text-[11px] uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-4 py-2 font-bold">Name</th>
                  <th className="px-4 py-2 font-bold">Age</th>
                  <th className="px-4 py-2 font-bold">Gender</th>
                  <th className="px-4 py-2 font-bold">Seat</th>
                  <th className="px-4 py-2 text-right font-bold">Fare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-100">
                {passengers.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 font-medium">{p.name}</td>
                    <td className="px-4 py-2 text-ink-500">{p.age}</td>
                    <td className="px-4 py-2 capitalize text-ink-500">{p.gender}</td>
                    <td className="px-4 py-2"><span className="chip">{p.seatNo}</span></td>
                    <td className="px-4 py-2 text-right font-semibold">{formatINR(p.fare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card mt-4 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-mist-100 px-4 py-3">
              <CreditCard className="size-4 text-brand-600" />
              <h2 className="text-sm font-bold">{t('account.payments')}</h2>
            </div>
            {payments.length === 0 ? (
              <p className="px-4 py-4 text-sm text-ink-500">No payment recorded yet.</p>
            ) : (
              <ul className="divide-y divide-mist-100">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <div>
                      <p className="font-semibold">{formatINR(p.amount)} <span className="ml-1 text-[11px] font-normal text-ink-500">{p.paymentId || '—'}</span></p>
                      <p className="text-[11px] text-ink-500">{formatDateTime(p.createdAt)} {p.message ? `· ${p.message}` : ''}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-4">
            <h2 className="text-sm font-bold">{t('seats.fareSummary')}</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-ink-500"><span>Seats</span><span className="font-semibold text-ink-900">{booking.seats}</span></div>
              <div className="flex justify-between text-ink-500"><span>{t('common.fare')}</span><span className="font-semibold text-ink-900">{formatINR(booking.fareTotal)}</span></div>
              {booking.discount > 0 ? (
                <div className="flex justify-between text-emerald-700"><span>{t('common.discount')}{booking.couponCode ? ` (${booking.couponCode})` : ''}</span><span className="font-semibold">−{formatINR(booking.discount)}</span></div>
              ) : null}
              <div className="flex justify-between border-t border-mist-100 pt-2 text-base"><span className="font-semibold">{t('common.total')}</span><span className="font-bold text-brand-700">{formatINR(booking.totalAmount)}</span></div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {booking.status === 'confirmed' ? (
                <a href={`/api/bookings/${booking.code}/ticket.pdf`} download className="btn btn-primary">
                  <Download className="size-4" /> {t('confirmation.download')}
                </a>
              ) : null}
              {booking.status !== 'cancelled' ? (
                <button type="button" onClick={() => setCancelOpen(true)} className="btn btn-danger">
                  <XCircle className="size-4" /> {t('bookings.cancelBooking')}
                </button>
              ) : null}
              <Link to="/search" className="btn btn-ghost">{t('common.bookNow')}</Link>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-300">
              Booked {formatDateTime(booking.createdAt)} · {booking.contactPhone} · {booking.contactEmail}
            </p>
          </div>
        </aside>
      </div>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title={`Cancel ${booking.code}`}>
        <p className="text-sm text-ink-500">{t('bookings.cancelNote')}</p>
        <label className="mt-4 block">
          <span className="label">Reason (optional)</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="field" />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setCancelOpen(false)} className="btn btn-ghost">{t('common.back')}</button>
          <button type="button" onClick={cancel} disabled={busy} className="btn btn-danger">{busy ? t('common.loading') : 'Confirm cancellation'}</button>
        </div>
      </Modal>
    </div>
  );
}
