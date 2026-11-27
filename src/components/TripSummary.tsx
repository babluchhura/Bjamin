import { ArrowRight, BusFront, CalendarDays, Clock, MapPin, Ticket } from 'lucide-react';
import type { TripDetail } from '../types/bus';
import { formatDate, formatINR, formatTime, tripDuration } from '../lib/format';

export default function TripSummary({ trip }: { trip: TripDetail }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-600">
            <BusFront className="size-3.5" /> {trip.bus.busType}
          </p>
          <h3 className="mt-1 truncate text-base font-semibold text-ink-900">{trip.bus.name}</h3>
          <p className="text-xs text-ink-500">{trip.operator.name}</p>
        </div>
        <p className="shrink-0 rounded-lg bg-brand-50 px-2.5 py-1 text-sm font-bold text-brand-700">
          {formatINR(trip.fare)}
        </p>
      </div>

      <div className="mt-4 rounded-xl bg-mist-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-base font-bold tabular-nums">{formatTime(trip.departAt)}</p>
            <p className="text-[11px] font-medium text-ink-500">{trip.route.origin}</p>
          </div>
          <div className="flex flex-1 flex-col items-center">
            <span className="text-[10px] font-semibold text-ink-500">{tripDuration(trip.departAt, trip.arriveAt)}</span>
            <span className="my-1 h-px w-full bg-mist-200" />
            <ArrowRight className="size-3 text-brand-500" />
          </div>
          <div className="text-right">
            <p className="text-base font-bold tabular-nums">{formatTime(trip.arriveAt)}</p>
            <p className="text-[11px] font-medium text-ink-500">{trip.route.destination}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold text-ink-500">
          <CalendarDays className="size-3" /> {formatDate(trip.departAt, 'long')}
        </div>
      </div>

      <dl className="mt-3 space-y-2 text-xs">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-brand-500" />
          <div>
            <dt className="font-semibold text-ink-700">Boarding</dt>
            <dd className="text-ink-500">{trip.boardingPoints?.[0]?.name || trip.route.origin}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
          <div>
            <dt className="font-semibold text-ink-700">Dropping</dt>
            <dd className="text-ink-500">{trip.droppingPoints?.[0]?.name || trip.route.destination}</dd>
          </div>
        </div>
        <div className="flex items-center gap-2 text-ink-500">
          <Clock className="size-3.5 text-ink-300" /> {trip.route.distanceKm} km · {tripDuration(trip.departAt, trip.arriveAt)}
        </div>
        <div className="flex items-center gap-2 text-ink-500">
          <Ticket className="size-3.5 text-ink-300" /> {trip.availableSeats} of {trip.totalSeats} seats available
        </div>
      </dl>
    </div>
  );
}
