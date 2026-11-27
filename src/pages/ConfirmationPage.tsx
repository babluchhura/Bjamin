import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarCheck, CheckCircle2, Clock, Download, MapPin, Ticket, XCircle } from 'lucide-react';
import { EmptyState, PageLoader, StatusBadge } from '../components/ui';
import { api } from '../lib/api';
import { formatDate, formatDateTime, formatINR, formatTime } from '../lib/format';
import { Link } from '../lib/router';
import { useI18n } from '../lib/i18n';
import type { BookingDetail } from '../types/bus';

export default function ConfirmationPage({ code }: { code: string }) {
  const { t } = useI18n();
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .booking(code)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : 'Booking not found.'))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) return <PageLoader />;
  if (error || !detail) {
    return (
      <div className="page-shell py-16">
        <EmptyState icon={<Ticket className="size-5" />} title="Booking not found" body={error} action={<Link to="/bookings" className="btn btn-primary">{t('bookings.title')}</Link>} />
      </div>
    );
  }

  const { booking, trip, passengers } = detail;
  const confirmed = booking.status === 'confirmed';
  const cancelled = booking.status === 'cancelled';

  return (
    <div className="page-shell py-10">
      <div className="mx-auto max-w-3xl">
        <div
          className={`rounded-2xl border p-6 text-center ${
            confirmed ? 'border-emerald-200 bg-emerald-50' : cancelled ? 'border-slate-200 bg-slate-50' : 'border-amber-200 bg-amber-50'
          }`}
        >
          <span
            className={`mx-auto grid size-14 place-items-center rounded-full text-white ${
              confirmed ? 'bg-emerald-600' : cancelled ? 'bg-slate-400' : 'bg-amber-500'
            }`}
          >
            {confirmed ? <CheckCircle2 className="size-7" /> : cancelled ? <XCircle className="size-7" /> : <AlertTriangle className="size-7" />}
          </span>
          <h1 className="mt-3 font-display text-2xl font-semibold text-ink-900">
            {confirmed ? t('confirmation.title') : cancelled ? 'Booking cancelled' : 'Seats reserved — payment pending'}
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            {confirmed
              ? t('confirmation.subtitle')
              : cancelled
                ? 'This booking was cancelled and the seats have been released.'
                : 'Your seats are held for 20 minutes. The booking is confirmed once payment is verified.'}
          </p>
          <div className="mt-4 inline-flex flex-col items-center rounded-xl bg-white px-5 py-3 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink-500">{t('confirmation.bookingId')}</span>
            <span className="font-display text-xl font-bold tracking-wide text-ink-900">{booking.code}</span>
            <span className="mt-1"><StatusBadge status={booking.status} /></span>
          </div>
        </div>

        <div className="card mt-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600">{trip?.bus.busType}</p>
              <h2 className="mt-1 text-lg font-semibold">{trip ? `${trip.route.origin} → ${trip.route.destination}` : ''}</h2>
              <p className="text-sm text-ink-500">{trip?.bus.name} · {trip?.operator.name}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-brand-700">{formatINR(booking.totalAmount)}</p>
              <p className="text-[11px] text-ink-500">{booking.passengerCount} {t('common.passengers')}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 rounded-xl bg-mist-50 p-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Departure</p>
              <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold"><Clock className="size-3.5 text-brand-600" /> {trip ? formatTime(trip.trip.departAt) : ''}</p>
              <p className="text-[11px] text-ink-500">{trip ? formatDate(trip.trip.departAt, 'long') : ''}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">{t('booking.boarding')}</p>
              <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold"><MapPin className="size-3.5 text-brand-600" /> {booking.boardingPoint}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">{t('common.seats')}</p>
              <p className="mt-0.5 text-sm font-semibold">{booking.seats}</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">{t('common.passengers')}</p>
            <ul className="mt-1 divide-y divide-mist-100 text-sm">
              {passengers.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-1.5">
                  <span className="font-medium">{p.name} <span className="text-ink-500">· {p.age}y · {p.gender}</span></span>
                  <span className="chip">Seat {p.seatNo}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {confirmed ? (
              <a href={`/api/bookings/${booking.code}/ticket.pdf`} className="btn btn-primary" download>
                <Download className="size-4" /> {t('confirmation.download')}
              </a>
            ) : null}
            <Link to="/bookings" className="btn btn-ghost">
              <CalendarCheck className="size-4" /> {t('confirmation.viewBookings')}
            </Link>
            {!confirmed ? (
              <Link to={`/bookings/${booking.code}`} className="btn btn-ghost">
                View booking status
              </Link>
            ) : null}
          </div>

          {confirmed ? (
            <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">{t('confirmation.whatNext')}</p>
          ) : null}
        </div>

        <p className="mt-4 text-center text-[11px] text-ink-300">
          Booked on {formatDateTime(booking.createdAt)} · Support: support@utkalyatra.in
        </p>
      </div>
    </div>
  );
}
