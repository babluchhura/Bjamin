import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, CalendarDays, MapPin, Search, Users } from 'lucide-react';
import { api } from '../lib/api';
import { todayInput, tomorrowInput } from '../lib/format';
import { useRouter } from '../lib/router';
import { useI18n } from '../lib/i18n';

export type SearchParams = { from: string; to: string; date: string; passengers: number };

export default function SearchBox({
  initialFrom = '',
  initialTo = '',
  initialDate = '',
  initialPassengers = 1,
  variant = 'hero',
}: {
  initialFrom?: string;
  initialTo?: string;
  initialDate?: string;
  initialPassengers?: number;
  variant?: 'hero' | 'page';
}) {
  const { navigate } = useRouter();
  const { t } = useI18n();
  const [cities, setCities] = useState<string[]>([]);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [date, setDate] = useState(initialDate || todayInput());
  const [passengers, setPassengers] = useState(initialPassengers);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .cities()
      .then((list) => {
        setCities(list);
        const defaultFrom = list.includes('Bhubaneswar') ? 'Bhubaneswar' : list[0] || 'Bhubaneswar';
        const defaultTo = list.includes('Puri') && defaultFrom !== 'Puri' ? 'Puri' : list.find((c) => c !== defaultFrom) || '';
        setFrom((current) => current || defaultFrom);
        setTo((current) => current || defaultTo);
      })
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    setFrom(initialFrom || from);
    setTo(initialTo || to);
    setDate(initialDate || date);
    setPassengers(initialPassengers || 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFrom, initialTo, initialDate, initialPassengers]);

  const cityOptions = useMemo(() => {
    const extra = [from, to].filter((c) => c && !cities.includes(c));
    return [...cities, ...extra].filter(Boolean);
  }, [cities, from, to]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!from || !to) {
      setError('Please choose both cities.');
      return;
    }
    if (from === to) {
      setError('Origin and destination must be different.');
      return;
    }
    setError('');
    const qs = new URLSearchParams({ from, to, date, pax: String(passengers) });
    navigate(`/buses?${qs.toString()}`);
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const isHero = variant === 'hero';

  return (
    <form
      onSubmit={submit}
      className={`w-full rounded-2xl border border-white/60 bg-white p-3 shadow-xl sm:p-4 ${
        isHero ? 'shadow-brand-900/20' : 'shadow-slate-900/5'
      }`}
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto_auto] lg:items-end">
        <div className="relative">
          <span className="label flex items-center gap-1"><MapPin className="size-3" /> {t('common.from')}</span>
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="field h-11" aria-label={t('common.from')}>
            {cityOptions.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <span className="label flex items-center gap-1"><MapPin className="size-3" /> {t('common.to')}</span>
          <select value={to} onChange={(e) => setTo(e.target.value)} className="field h-11" aria-label={t('common.to')}>
            {cityOptions.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={swap}
            aria-label="Swap cities"
            className="absolute -top-0.5 right-0 hidden size-8 place-items-center rounded-full border border-mist-200 bg-white text-brand-600 shadow-sm transition hover:border-brand-300 lg:-right-4 lg:grid"
          >
            <ArrowLeftRight className="size-3.5" />
          </button>
        </div>

        <div>
          <span className="label flex items-center gap-1"><CalendarDays className="size-3" /> {t('common.date')}</span>
          <input
            type="date"
            value={date}
            min={todayInput()}
            onChange={(e) => setDate(e.target.value)}
            className="field h-11"
            aria-label={t('common.date')}
          />
        </div>

        <div>
          <span className="label flex items-center gap-1"><Users className="size-3" /> {t('common.passengers')}</span>
          <select
            value={passengers}
            onChange={(e) => setPassengers(Number(e.target.value))}
            className="field h-11 lg:w-24"
            aria-label={t('common.passengers')}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn btn-primary h-11 px-5">
          <Search className="size-4" />
          {t('common.searchBuses')}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setDate(todayInput())}
          className={`chip ${date === todayInput() ? 'border-brand-300 bg-brand-50 text-brand-700' : ''}`}
        >
          {t('home.today')}
        </button>
        <button
          type="button"
          onClick={() => setDate(tomorrowInput())}
          className={`chip ${date === tomorrowInput() ? 'border-brand-300 bg-brand-50 text-brand-700' : ''}`}
        >
          {t('home.tomorrow')}
        </button>
        {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
      </div>
    </form>
  );
}
