import { useEffect, useState } from 'react';
import { ArrowRight, BusFront, HelpCircle, MapPin, Phone } from 'lucide-react';
import SearchBox from '../components/SearchBox';
import { SectionHeading } from '../components/ui';
import { Link } from '../lib/router';
import { api } from '../lib/api';
import { formatINR, todayInput } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { useSite } from '../lib/site';

type PopularRoute = { route: { id: number; origin: string; destination: string; distanceKm: number }; minFare: number };

export default function SearchPage() {
  const { t } = useI18n();
  const { settings } = useSite();
  const [routes, setRoutes] = useState<PopularRoute[]>([]);

  useEffect(() => {
    api.popularRoutes().then(setRoutes).catch(() => setRoutes([]));
  }, []);

  return (
    <div className="page-shell py-10">
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip mx-auto">
          <BusFront className="size-3.5 text-brand-600" /> {settings.brandName}
        </span>
        <h1 className="mt-4 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">{t('search.title')}</h1>
        <p className="mt-2 text-sm text-ink-500">{t('search.subtitle')}</p>
      </div>

      <div className="mx-auto mt-7 max-w-5xl">
        <SearchBox variant="page" initialDate={todayInput()} />
      </div>

      <section className="mt-14">
        <SectionHeading eyebrow="All routes" title={t('home.popularRoutes')} />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {routes.map((item) => (
            <Link
              key={item.route.id}
              to={`/buses?from=${encodeURIComponent(item.route.origin)}&to=${encodeURIComponent(item.route.destination)}&date=${todayInput()}&pax=1`}
              className="card flex items-center justify-between p-4 transition hover:border-brand-300 hover:shadow-md"
            >
              <div>
                <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                  <MapPin className="size-3.5 text-brand-500" /> {item.route.origin}
                  <ArrowRight className="size-3.5 text-ink-300" /> {item.route.destination}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-500">
                  {item.route.distanceKm} km · from <span className="font-bold text-ink-900">{formatINR(item.minFare)}</span>
                </p>
              </div>
              <ArrowRight className="size-4 text-brand-500" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        {[
          { icon: <HelpCircle className="size-5" />, title: 'Need help choosing?', body: 'Read the FAQ for boarding rules, luggage and cancellation questions.', to: '/faq', cta: 'Read FAQ' },
          { icon: <Phone className="size-5" />, title: t('home.support'), body: `Call ${settings.supportPhone} between 7 AM and 11 PM, every day.`, to: '/contact', cta: t('nav.contact') },
          { icon: <BusFront className="size-5" />, title: 'Travel operator?', body: 'List your buses, schedules and seat layouts from the admin panel.', to: '/about', cta: t('nav.about') },
        ].map((card) => (
          <div key={card.title} className="card p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600">{card.icon}</span>
            <h3 className="mt-3 text-sm font-bold">{card.title}</h3>
            <p className="mt-1 text-sm text-ink-500">{card.body}</p>
            <Link to={card.to} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-700">
              {card.cta} <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}
