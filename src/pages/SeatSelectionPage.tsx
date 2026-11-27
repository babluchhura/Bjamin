import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Lock, Timer, Ticket } from 'lucide-react';
import SeatMap from '../components/SeatMap';
import TripSummary from '../components/TripSummary';
import { PageLoader, EmptyState } from '../components/ui';
import { api } from '../lib/api';
import { formatINR } from '../lib/format';
import { Link, useQuery, useRouter } from '../lib/router';
import { useI18n } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { writeCheckout } from '../lib/checkout';
import type { TripDetail } from '../types/bus';

export default function SeatSelectionPage({ tripId }: { tripId: string }) {
  const { navigate } = useRouter();
  const query = useQuery();
  const { t } = useI18n();
  const toast = useToast();
  const pax = Math.max(1, Number(query.get('pax') || 1));

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [boarding, setBoarding] = useState('');
  const [dropping, setDropping] = useState('');
  const [holding, setHolding] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const detail = await api.trip(tripId);
        setTrip(detail);
        setBoarding((current) => current || detail.boardingPoints?.[0]?.name || detail.route.origin);
        setDropping((current) => current || detail.droppingPoints?.[0]?.name || detail.route.destination);
        setSelected((current) => current.filter((seatNo) => detail.seats.some((s) => s.seatNo === seatNo && s.status === 'available')));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load this departure.');
      } finally {
        setLoading(false);
      }
    },
    [tripId]
  );

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 20000);
    return () => window.clearInterval(timer);
  }, [load]);

  const total = useMemo(() => (trip ? trip.fare * selected.length : 0), [trip, selected]);

  const toggle = (seatNo: string) => {
    setSelected((current) => {
      if (current.includes(seatNo)) return current.filter((s) => s !== seatNo);
      if (current.length >= 6) {
        toast.push(t('seats.maxSeats'), 'info');
        return current;
      }
      return [...current, seatNo];
    });
  };

  const proceed = async () => {
    if (!trip) return;
    if (selected.length === 0) {
      toast.push(t('seats.selectAtLeast'), 'info');
      return;
    }
    setHolding(true);
    try {
      const hold = await api.holdSeats(trip.id, selected);
      writeCheckout({
        tripId: trip.id,
        seats: selected,
        holdToken: hold.holdToken,
        heldUntil: hold.heldUntil,
        farePerSeat: hold.farePerSeat,
        fareTotal: hold.fareTotal,
        boardingPoint: boarding,
        droppingPoint: dropping,
        passengers: selected.map((seatNo) => ({ name: '', age: '', gender: '', seatNo })),
        contact: { name: '', email: '', phone: '' },
      });
      navigate('/booking/passengers');
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Could not hold those seats.', 'error');
      void load(true);
    } finally {
      setHolding(false);
    }
  };

  if (loading) return <PageLoader label={t('common.loading')} />;
  if (error || !trip) {
    return (
      <div className="page-shell py-16">
        <EmptyState
          icon={<Ticket className="size-5" />}
          title="Departure not available"
          body={error || 'This bus departure could not be found.'}
          action={<Link to="/search" className="btn btn-primary">{t('nav.search')}</Link>}
        />
      </div>
    );
  }

  return (
    <div className="page-shell py-8">
      <Link to={`/buses?from=${encodeURIComponent(trip.route.origin)}&to=${encodeURIComponent(trip.route.destination)}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-700">
        <ArrowLeft className="size-4" /> {t('common.back')}
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="mb-5">
            <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">{t('seats.title')}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
              <Timer className="size-3.5 text-brand-600" /> {t('seats.subtitle')}
            </p>
          </div>

          <SeatMap seats={trip.seats} layout={trip.bus.layout} selected={selected} onToggle={toggle} />

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">{t('booking.boarding')}</span>
              <select value={boarding} onChange={(e) => setBoarding(e.target.value)} className="field">
                {trip.boardingPoints.map((p) => (
                  <option key={p.id} value={p.name}>{p.name} · {p.time}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">{t('booking.dropping')}</span>
              <select value={dropping} onChange={(e) => setDropping(e.target.value)} className="field">
                {trip.droppingPoints.map((p) => (
                  <option key={p.id} value={p.name}>{p.name} · {p.time}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <TripSummary trip={trip} />

          <div className="card mt-3 p-4">
            <h2 className="text-sm font-bold text-ink-900">{t('seats.fareSummary')}</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between text-ink-500">
                <span>{t('common.seats')}</span>
                <span className="font-semibold text-ink-900">{selected.length ? selected.join(', ') : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-ink-500">
                <span>{t('seats.baseFare')} × {selected.length || 0}</span>
                <span className="font-semibold text-ink-900">{formatINR(total)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-mist-100 pt-2 text-base">
                <span className="font-semibold">{t('common.total')}</span>
                <span className="font-bold text-brand-700">{formatINR(total)}</span>
              </div>
            </div>
            <button type="button" onClick={proceed} disabled={holding || selected.length === 0} className="btn btn-primary mt-4 w-full">
              {holding ? t('common.loading') : t('seats.continue')} <ArrowRight className="size-4" />
            </button>
            <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-ink-300">
              <Lock className="size-3" /> {t('seats.holdNote')}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
