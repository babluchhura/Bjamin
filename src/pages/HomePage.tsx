import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BusFront,
  Clock,
  CreditCard,
  MapPin,
  Percent,
  Quote,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
} from 'lucide-react';
import SearchBox from '../components/SearchBox';
import { SectionHeading, Stars } from '../components/ui';
import { Link } from '../lib/router';
import { api } from '../lib/api';
import { formatINR, todayInput } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { useSite } from '../lib/site';

type PopularRoute = { route: { id: number; origin: string; destination: string; distanceKm: number }; minFare: number };
type Banner = { id: number; title: string; subtitle: string; ctaText: string; ctaLink: string };
type Review = { id: number; authorName: string; routeLabel: string | null; rating: number; comment: string };

export default function HomePage() {
  const { t } = useI18n();
  const { settings } = useSite();
  const [routes, setRoutes] = useState<PopularRoute[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    api.popularRoutes().then(setRoutes).catch(() => setRoutes([]));
    api.banners().then(setBanners).catch(() => setBanners([]));
    api.reviews().then(setReviews).catch(() => setReviews([]));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ink-900 via-brand-900 to-brand-700 text-white">
        <div className="pointer-events-none absolute -left-24 top-10 size-72 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 size-80 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="page-shell relative pt-12 pb-8 lg:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-100">
                <Sparkles className="size-3.5" /> Odisha · INR · English / हिन्दी / ଓଡ଼ିଆ
              </span>
              <h1 className="mt-5 font-display text-3xl leading-[1.12] font-semibold sm:text-4xl lg:text-[2.9rem]">
                {t('home.heroTitle')}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-brand-100/90 sm:text-base">
                {t('home.heroSubtitle')}
              </p>
              <div className="mt-6 flex flex-wrap gap-5 text-xs font-semibold text-brand-100/80">
                <span className="inline-flex items-center gap-1.5"><BadgeCheck className="size-4 text-brand-300" /> Verified operators</span>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-brand-300" /> Server-verified payments</span>
                <span className="inline-flex items-center gap-1.5"><Ticket className="size-4 text-brand-300" /> Instant e-tickets</span>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="animate-float-soft rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <div className="rounded-2xl bg-white p-4 text-ink-900 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">Next departure</p>
                      <p className="mt-1 text-sm font-bold">Bhubaneswar → Puri</p>
                    </div>
                    <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">On time</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold tabular-nums">06:30</p>
                      <p className="text-[11px] text-ink-500">Baramunda</p>
                    </div>
                    <div className="mx-3 flex-1 border-t border-dashed border-mist-200" />
                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums">08:00</p>
                      <p className="text-[11px] text-ink-500">Puri</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-6 gap-1.5">
                    {['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6'].map((s, i) => (
                      <span
                        key={s}
                        className={`grid h-7 place-items-center rounded border text-[9px] font-bold ${
                          i === 3 || i === 8
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : i === 5 || i === 10
                              ? 'border-slate-200 bg-slate-100 text-slate-400'
                              : 'border-slate-200 text-ink-500'
                        }`}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-mist-100 pt-3">
                    <p className="text-sm font-bold">{formatINR(349)}</p>
                    <span className="rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-bold text-white">Select seats</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <SearchBox variant="hero" initialDate={todayInput()} />
          </div>
        </div>
      </section>

      {/* Banners / offers */}
      {banners.length > 0 ? (
        <section className="page-shell mt-10">
          <div className="grid gap-4 md:grid-cols-2">
            {banners.slice(0, 2).map((banner) => (
              <div
                key={banner.id}
                className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-sky-50 p-5"
              >
                <Percent className="absolute -right-3 -top-3 size-20 text-brand-100" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-brand-600">Offer</p>
                <h3 className="mt-1.5 text-lg font-semibold text-ink-900">{banner.title}</h3>
                <p className="mt-1 max-w-sm text-sm text-ink-500">{banner.subtitle}</p>
                <Link to={banner.ctaLink} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand-700">
                  {banner.ctaText} <ArrowRight className="size-4" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Popular routes */}
      <section className="page-shell mt-14">
        <SectionHeading
          eyebrow="Routes"
          title={t('home.popularRoutes')}
          body="Every departure below is live — pick a route to see today's buses, seats and fares."
          action={
            <Link to="/search" className="btn btn-ghost">
              {t('home.viewAllRoutes')} <ArrowRight className="size-4" />
            </Link>
          }
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {routes.slice(0, 8).map((item) => (
            <Link
              key={item.route.id}
              to={`/buses?from=${encodeURIComponent(item.route.origin)}&to=${encodeURIComponent(item.route.destination)}&date=${todayInput()}&pax=1`}
              className="card group p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-900/5"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <BusFront className="size-4" />
                </span>
                <span className="text-[11px] font-semibold text-ink-300">{item.route.distanceKm} km</span>
              </div>
              <p className="mt-3 text-sm font-bold text-ink-900">
                {item.route.origin} <span className="text-brand-500">→</span> {item.route.destination}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-ink-500">from <span className="font-bold text-ink-900">{formatINR(item.minFare)}</span></span>
                <ArrowRight className="size-4 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="page-shell mt-16">
        <SectionHeading eyebrow="Why Utkal Yatra" title={t('home.whyTitle')} align="center" />
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {[
            { icon: <Ticket className="size-5" />, title: t('home.why1'), body: t('home.why1Body') },
            { icon: <CreditCard className="size-5" />, title: t('home.why2'), body: t('home.why2Body') },
            { icon: <ShieldCheck className="size-5" />, title: t('home.why3'), body: t('home.why3Body') },
          ].map((item) => (
            <div key={item.title} className="card p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600">{item.icon}</span>
              <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-16 bg-mist-50 py-14">
        <div className="page-shell">
          <SectionHeading eyebrow="Simple" title={t('home.howTitle')} align="center" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { n: '01', icon: <MapPin className="size-5" />, title: t('home.step1'), body: t('home.step1Body') },
              { n: '02', icon: <BusFront className="size-5" />, title: t('home.step2'), body: t('home.step2Body') },
              { n: '03', icon: <TrendingUp className="size-5" />, title: t('home.step3'), body: t('home.step3Body') },
            ].map((step) => (
              <div key={step.n} className="relative rounded-2xl border border-mist-200 bg-white p-5">
                <span className="absolute right-4 top-4 font-display text-2xl font-semibold text-brand-100">{step.n}</span>
                <span className="grid size-11 place-items-center rounded-xl bg-ink-900 text-white">{step.icon}</span>
                <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-ink-500">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      {reviews.length > 0 ? (
        <section className="page-shell mt-16">
          <SectionHeading eyebrow="Travellers" title={t('home.reviewsTitle')} />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {reviews.slice(0, 3).map((review) => (
              <figure key={review.id} className="card flex h-full flex-col p-5">
                <Quote className="size-5 text-brand-200" />
                <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-ink-700">{review.comment}</blockquote>
                <figcaption className="mt-4 border-t border-mist-100 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{review.authorName}</p>
                    <Stars rating={review.rating} />
                  </div>
                  {review.routeLabel ? <p className="text-[11px] text-ink-500">{review.routeLabel}</p> : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="page-shell mt-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 px-6 py-10 text-white sm:px-10">
          <div className="pointer-events-none absolute -right-10 -top-10 size-56 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t('home.ctaTitle')}</h2>
              <p className="mt-2 max-w-xl text-sm text-brand-50/90">{t('home.ctaBody')}</p>
            </div>
            <Link to="/search" className="btn bg-white text-brand-700 hover:bg-brand-50">
              {t('common.searchBuses')} <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="relative mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-semibold text-brand-50/80">
            <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" /> Live seat availability</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5" /> Secure checkout</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" /> {settings.officeAddress}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
