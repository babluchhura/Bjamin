import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BusFront, CalendarDays, ChevronLeft, ChevronRight, Filter, MapPin, SlidersHorizontal } from 'lucide-react';
import BusCard from '../components/BusCard';
import { EmptyState, SkeletonRows } from '../components/ui';
import { api } from '../lib/api';
import { formatDate, toInputDate, todayInput } from '../lib/format';
import { Link, useQuery, useRouter } from '../lib/router';
import { useI18n } from '../lib/i18n';
import type { TripSummary } from '../types/bus';

const WINDOWS = [
  { key: 'early', label: 'Before 6 AM', test: (h: number) => h < 6 },
  { key: 'morning', label: '6 AM – 12 PM', test: (h: number) => h >= 6 && h < 12 },
  { key: 'afternoon', label: '12 PM – 6 PM', test: (h: number) => h >= 12 && h < 18 },
  { key: 'night', label: 'After 6 PM', test: (h: number) => h >= 18 },
];

export default function BusListPage() {
  const query = useQuery();
  const { navigate } = useRouter();
  const { t } = useI18n();

  const from = query.get('from') || '';
  const to = query.get('to') || '';
  const date = query.get('date') || todayInput();
  const pax = Math.max(1, Number(query.get('pax') || 1));

  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [windows, setWindows] = useState<string[]>([]);
  const [operators, setOperators] = useState<string[]>([]);
  const [sort, setSort] = useState('departure');
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await api.searchTrips({ from, to, date });
      setTrips(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load buses.');
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, date]);

  useEffect(() => {
    void load();
  }, [load]);

  const availableTypes = useMemo(() => [...new Set(trips.map((tr) => tr.bus.busType))].sort(), [trips]);
  const availableOperators = useMemo(() => [...new Set(trips.map((tr) => tr.operator.name))].sort(), [trips]);

  const filtered = useMemo(() => {
    let list = trips.filter((trip) => trip.availableSeats >= pax);
    if (types.length) list = list.filter((trip) => types.includes(trip.bus.busType));
    if (operators.length) list = list.filter((trip) => operators.includes(trip.operator.name));
    if (windows.length) {
      list = list.filter((trip) => {
        const hour = new Date(trip.departAt).getHours();
        return windows.some((key) => WINDOWS.find((w) => w.key === key)?.test(hour));
      });
    }
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.fare - b.fare);
    else if (sort === 'price-desc') list = [...list].sort((a, b) => b.fare - a.fare);
    else if (sort === 'rating') list = [...list].sort((a, b) => b.bus.rating - a.bus.rating);
    else list = [...list].sort((a, b) => new Date(a.departAt).getTime() - new Date(b.departAt).getTime());
    return list;
  }, [trips, types, operators, windows, sort, pax]);

  const shiftDate = (days: number) => {
    const next = new Date(`${date}T00:00:00`);
    next.setDate(next.getDate() + days);
    const qs = new URLSearchParams({ from, to, date: toInputDate(next), pax: String(pax) });
    navigate(`/buses?${qs.toString()}`);
  };

  const toggle = (list: string[], value: string, setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const clearFilters = () => {
    setTypes([]);
    setOperators([]);
    setWindows([]);
    setSort('departure');
  };

  const filtersActive = types.length + operators.length + windows.length > 0;

  return (
    <div className="page-shell py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/search" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-700">
          <ArrowLeft className="size-4" /> {t('common.back')}
        </Link>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shiftDate(-1)} className="btn btn-ghost px-2.5 py-2" aria-label="Previous day">
            <ChevronLeft className="size-4" />
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-mist-200 bg-white px-3 py-2 text-sm font-semibold">
            <CalendarDays className="size-4 text-brand-600" /> {formatDate(date, 'long')}
          </span>
          <button type="button" onClick={() => shiftDate(1)} className="btn btn-ghost px-2.5 py-2" aria-label="Next day">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-1">
        <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
          <MapPin className="size-5 text-brand-600" />
          {from || 'All cities'} <ArrowRight className="size-4 text-ink-300" /> {to || 'All cities'}
        </h1>
        <p className="text-sm text-ink-500">
          {loading ? t('common.loading') : `${filtered.length} ${t('search.found')}`} · {pax} {t('common.passengers')}
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="btn btn-ghost mb-3 w-full lg:hidden"
          >
            <Filter className="size-4" /> {t('common.filters')} {filtersActive ? `(${types.length + operators.length + windows.length})` : ''}
          </button>
          <div className={`card p-4 ${showFilters ? '' : 'hidden lg:block'}`}>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                <SlidersHorizontal className="size-4" /> {t('common.filters')}
              </h2>
              <button type="button" onClick={clearFilters} className="text-[11px] font-bold text-brand-700">
                {t('common.reset')}
              </button>
            </div>

            <div className="mt-4">
              <p className="label">{t('search.busType')}</p>
              <div className="flex flex-col gap-1.5">
                {availableTypes.map((type) => (
                  <label key={type} className="flex items-center gap-2 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      checked={types.includes(type)}
                      onChange={() => toggle(types, type, setTypes)}
                      className="size-3.5 accent-brand-600"
                    />
                    {type}
                  </label>
                ))}
                {availableTypes.length === 0 ? <p className="text-xs text-ink-300">—</p> : null}
              </div>
            </div>

            <div className="mt-4">
              <p className="label">{t('search.departure')}</p>
              <div className="flex flex-col gap-1.5">
                {WINDOWS.map((w) => (
                  <label key={w.key} className="flex items-center gap-2 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      checked={windows.includes(w.key)}
                      onChange={() => toggle(windows, w.key, setWindows)}
                      className="size-3.5 accent-brand-600"
                    />
                    {w.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="label">Operators</p>
              <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto pr-1">
                {availableOperators.map((operator) => (
                  <label key={operator} className="flex items-center gap-2 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      checked={operators.includes(operator)}
                      onChange={() => toggle(operators, operator, setOperators)}
                      className="size-3.5 accent-brand-600"
                    />
                    {operator}
                  </label>
                ))}
                {availableOperators.length === 0 ? <p className="text-xs text-ink-300">—</p> : null}
              </div>
            </div>
          </div>
        </aside>

        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-ink-500">{loading ? '' : `${filtered.length} ${t('search.found')}`}</p>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="field w-auto py-2 text-xs font-semibold" aria-label={t('search.sortBy')}>
              <option value="departure">{t('search.departureEarly')}</option>
              <option value="price-asc">{t('search.priceLow')}</option>
              <option value="price-desc">{t('search.priceHigh')}</option>
              <option value="rating">{t('search.ratingHigh')}</option>
            </select>
          </div>

          {loading ? (
            <SkeletonRows rows={4} />
          ) : error ? (
            <EmptyState icon={<BusFront className="size-5" />} title="Could not load buses" body={error} action={<button type="button" onClick={load} className="btn btn-primary">Try again</button>} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<BusFront className="size-5" />}
              title={t('search.noBuses')}
              body={t('search.noBusesBody')}
              action={
                <button type="button" onClick={() => shiftDate(1)} className="btn btn-primary">
                  Try {formatDate(new Date(new Date(`${date}T00:00:00`).getTime() + 86400000), 'short')} <ArrowRight className="size-4" />
                </button>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((trip) => (
                <BusCard key={trip.id} trip={trip} passengers={pax} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
