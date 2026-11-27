import { ArrowRight, BusFront, MapPin, ShieldCheck, Ticket, Users } from 'lucide-react';
import { Link } from '../lib/router';
import { useSite } from '../lib/site';
import { useI18n } from '../lib/i18n';

export default function AboutPage() {
  const { settings } = useSite();
  const { t } = useI18n();

  return (
    <div>
      <section className="bg-gradient-to-br from-ink-900 via-brand-900 to-brand-700 py-14 text-white">
        <div className="page-shell max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-200">About {settings.brandName}</p>
          <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Bus travel across Odisha, without the guesswork</h1>
          <p className="mt-4 text-sm leading-relaxed text-brand-100/90">
            We started {settings.brandName} in Bhubaneswar with a simple goal: make intercity bus travel in Odisha as
            predictable as booking a train ticket. Every departure on this platform is operated by a verified bus
            operator, and every seat you see is a real seat on that bus.
          </p>
        </div>
      </section>

      <section className="page-shell -mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { icon: <BusFront className="size-5" />, value: '10+', label: 'Odisha routes live' },
          { icon: <Users className="size-5" />, value: '5', label: 'Verified operators' },
          { icon: <Ticket className="size-5" />, value: '100%', label: 'Instant e-tickets' },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center gap-3 p-4">
            <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600">{stat.icon}</span>
            <div>
              <p className="font-display text-xl font-bold text-ink-900">{stat.value}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="page-shell mt-12 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-semibold">How we work</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-ink-600">
            <p>
              Operators publish their schedules, fares and seat layouts in our admin panel. When you search a route we
              show only departures that actually have seats available for your group size, with boarding and dropping
              points taken from the operator's own route sheet.
            </p>
            <p>
              Selecting a seat reserves it for ten minutes while you enter passenger details. Payment is processed by
              Razorpay and verified on our server using the payment signature — a booking is only marked confirmed
              after that verification succeeds.
            </p>
            <p>
              Cancellations follow a published policy: 90% refund when you cancel at least 24 hours before departure,
              50% between 12 and 24 hours, and no refund under 12 hours. Refunds are initiated to the original payment
              method.
            </p>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold"><ShieldCheck className="size-4 text-emerald-600" /> What you can count on</h2>
          <ul className="mt-3 space-y-3 text-sm text-ink-600">
            {[
              'Real seat maps generated from each bus layout — lower and upper berths included.',
              'Ladies seats marked clearly on every bus that offers them.',
              'Server-side validation of fares, coupons and seat availability before a booking is created.',
              'Email and SMS confirmation with a downloadable PDF e-ticket.',
              'Support on WhatsApp and phone from 7 AM to 11 PM, every day.',
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="page-shell mt-12">
        <div className="card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold"><MapPin className="size-4 text-brand-600" /> Visit our office</h2>
            <p className="mt-1 text-sm text-ink-500">{settings.officeAddress}</p>
            <p className="text-sm text-ink-500">{settings.supportPhone} · {settings.supportEmail}</p>
          </div>
          <div className="flex gap-2">
            <Link to="/contact" className="btn btn-ghost">{t('nav.contact')}</Link>
            <Link to="/search" className="btn btn-primary">{t('common.bookNow')} <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
