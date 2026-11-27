import { ArrowRight, Clock, MapPin, Snowflake, Wifi, Zap } from 'lucide-react';
import type { TripSummary } from '../types/bus';
import { formatINR, formatTime, tripDuration, dayOffset } from '../lib/format';
import { Stars } from './ui';
import { useI18n } from '../lib/i18n';
import { Link } from '../lib/router';

function amenityIcon(name: string) {
  const key = name.toLowerCase();
  if (key.includes('ac')) return <Snowflake className="size-3.5" />;
  if (key.includes('wifi')) return <Wifi className="size-3.5" />;
  if (key.includes('charging')) return <Zap className="size-3.5" />;
  return null;
}

export default function BusCard({ trip, passengers }: { trip: TripSummary; passengers: number }) {
  const { t } = useI18n();
  const soldOut = trip.availableSeats < passengers;
  const offset = dayOffset(trip.departAt, trip.arriveAt);

  return (
    <article className="card overflow-hidden transition hover:border-brand-200 hover:shadow-lg hover:shadow-brand-900/5">
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.4fr_1.5fr_1fr] lg:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700">
              {trip.operator.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-ink-900">{trip.bus.name}</h3>
              <p className="truncate text-xs text-ink-500">{trip.operator.name}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="chip">{trip.bus.busType}</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-700">
              <Stars rating={trip.bus.rating} /> {trip.bus.rating.toFixed(1)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {trip.bus.amenities?.slice(0, 4).map((a) => (
              <span key={a} className="inline-flex items-center gap-1 rounded-md bg-mist-50 px-1.5 py-0.5 text-[11px] text-ink-500">
                {amenityIcon(a)} {a}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-center">
            <p className="text-lg font-bold tabular-nums text-ink-900">{formatTime(trip.departAt)}</p>
            <p className="text-[11px] font-medium text-ink-500">{trip.route.origin}</p>
          </div>
          <div className="flex-1">
            <p className="mb-1 text-center text-[11px] font-semibold text-ink-500">{tripDuration(trip.departAt, trip.arriveAt)}</p>
            <div className="relative h-px w-full bg-mist-200">
              <span className="absolute left-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-brand-500" />
              <span className="absolute right-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-brand-500" />
              <ArrowRight className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 bg-white text-brand-500" />
            </div>
            <p className="mt-1 text-center text-[11px] text-ink-300">{trip.route.distanceKm} km</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold tabular-nums text-ink-900">
              {formatTime(trip.arriveAt)}
              {offset > 0 ? <span className="ml-0.5 text-[10px] font-semibold text-brand-600">+{offset}d</span> : null}
            </p>
            <p className="text-[11px] font-medium text-ink-500">{trip.route.destination}</p>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-mist-100 pt-3 lg:flex-col lg:items-end lg:border-0 lg:pt-0">
          <div className="text-left lg:text-right">
            <p className="text-xl font-bold text-ink-900">{formatINR(trip.fare)}</p>
            <p className="text-[11px] text-ink-500">per seat</p>
            <p className={`mt-1 text-[11px] font-bold ${soldOut ? 'text-rose-600' : trip.availableSeats <= 6 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {soldOut ? t('search.soldOut') : `${trip.availableSeats} ${t('search.seatsLeft')}`}
            </p>
          </div>
          <Link
            to={soldOut ? '/search' : `/buses/${trip.id}/seats?pax=${passengers}`}
            className={`btn ${soldOut ? 'btn-ghost pointer-events-none opacity-60' : 'btn-primary'} w-full lg:w-auto`}
            aria-disabled={soldOut}
          >
            {t('search.selectSeats')}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-mist-100 bg-mist-50/60 px-4 py-2 text-[11px] text-ink-500 sm:px-5">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3 text-brand-500" />
          {t('booking.boarding')}: {trip.boardingPoints?.[0]?.name || trip.route.origin}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3 text-emerald-500" />
          {t('booking.dropping')}: {trip.droppingPoints?.[0]?.name || trip.route.destination}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          {trip.departAt ? new Date(trip.departAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
        </span>
      </div>
    </article>
  );
}
