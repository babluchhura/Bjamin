import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Lock, ShieldCheck, UserRound } from 'lucide-react';
import TripSummary from '../components/TripSummary';
import { EmptyState, Field, PageLoader } from '../components/ui';
import { api } from '../lib/api';
import { formatINR } from '../lib/format';
import { Link, useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { patchCheckout, readCheckout } from '../lib/checkout';
import type { TripDetail } from '../types/bus';

export default function PassengerDetailsPage() {
  const { navigate } = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const checkout = readCheckout();

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [passengers, setPassengers] = useState(
    checkout?.passengers?.length
      ? checkout.passengers
      : (checkout?.seats || []).map((seatNo) => ({ name: '', age: '', gender: '', seatNo }))
  );
  const [contact, setContact] = useState({
    name: checkout?.contact?.name || user?.name || '',
    email: checkout?.contact?.email || user?.email || '',
    phone: checkout?.contact?.phone || user?.phone || '',
  });
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    if (!checkout) return;
    api
      .trip(checkout.tripId)
      .then(setTrip)
      .catch(() => setTrip(null))
      .finally(() => setLoading(false));
  }, [checkout?.tripId]);

  useEffect(() => {
    if (!user) return;
    setContact((current) => ({
      name: current.name || user.name,
      email: current.email || user.email,
      phone: current.phone || user.phone || '',
    }));
  }, [user]);

  const minutesLeft = useMemo(() => {
    if (!checkout?.heldUntil) return 0;
    return Math.max(0, Math.round((new Date(checkout.heldUntil).getTime() - Date.now()) / 60000));
  }, [checkout?.heldUntil]);

  if (!checkout) {
    return (
      <div className="page-shell py-16">
        <EmptyState
          icon={<Lock className="size-5" />}
          title="Your seat selection has expired"
          body="Pick a bus and seats again — it only takes a moment."
          action={<Link to="/search" className="btn btn-primary">{t('nav.search')}</Link>}
        />
      </div>
    );
  }

  if (authLoading) return <PageLoader />;

  if (!user) {
    return (
      <div className="page-shell py-16">
        <div className="mx-auto max-w-lg">
          <EmptyState
            icon={<UserRound className="size-5" />}
            title="Sign in to complete this booking"
            body="Your seats are held for a few minutes. Sign in or create an account to keep your ticket, download it later and manage cancellations."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to={`/login?next=${encodeURIComponent('/booking/passengers')}`} className="btn btn-primary">{t('auth.signIn')}</Link>
                <Link to={`/register?next=${encodeURIComponent('/booking/passengers')}`} className="btn btn-ghost">{t('auth.createAccount')}</Link>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  const updatePassenger = (index: number, patch: Partial<{ name: string; age: string; gender: string }>) => {
    setPassengers((current) => current.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    for (const [index, p] of passengers.entries()) {
      if (p.name.trim().length < 2) return toast.push(`Passenger ${index + 1}: enter the full name.`, 'error');
      const age = Number(p.age);
      if (!age || age < 1 || age > 110) return toast.push(`Passenger ${index + 1}: enter a valid age.`, 'error');
      if (!p.gender) return toast.push(`Passenger ${index + 1}: select a gender.`, 'error');
    }
    if (contact.name.trim().length < 2) return toast.push('Enter the contact name.', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) return toast.push('Enter a valid email address.', 'error');
    if (contact.phone.replace(/\D/g, '').length < 10) return toast.push('Enter a valid 10-digit mobile number.', 'error');
    if (!agree) return toast.push('Please accept the terms and cancellation policy.', 'error');

    patchCheckout({ passengers, contact });
    navigate('/booking/payment');
  };

  return (
    <div className="page-shell py-8">
      <Link to={`/buses/${checkout.tripId}/seats`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-700">
        <ArrowLeft className="size-4" /> {t('common.back')}
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
        <form onSubmit={submit}>
          <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">{t('booking.passengerTitle')}</h1>
          <p className="mt-1 text-sm text-ink-500">{t('booking.passengerSubtitle')}</p>

          {minutesLeft <= 2 ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Your seat hold expires in about {minutesLeft} minute{minutesLeft === 1 ? '' : 's'}. Complete the booking soon.
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {passengers.map((passenger, index) => (
              <div key={passenger.seatNo} className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-ink-900">
                    Passenger {index + 1}
                    <span className="ml-2 rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-700">Seat {passenger.seatNo}</span>
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1.6fr_0.7fr_1fr]">
                  <Field label={t('common.name')}>
                    <input
                      value={passenger.name}
                      onChange={(e) => updatePassenger(index, { name: e.target.value })}
                      className="field"
                      placeholder="Full name as on ID"
                      autoComplete="name"
                    />
                  </Field>
                  <Field label={t('common.age')}>
                    <input
                      value={passenger.age}
                      onChange={(e) => updatePassenger(index, { age: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                      className="field"
                      inputMode="numeric"
                      placeholder="Age"
                    />
                  </Field>
                  <Field label={t('common.gender')}>
                    <select value={passenger.gender} onChange={(e) => updatePassenger(index, { gender: e.target.value })} className="field">
                      <option value="">Select</option>
                      <option value="male">{t('common.male')}</option>
                      <option value="female">{t('common.female')}</option>
                      <option value="other">{t('common.other')}</option>
                    </select>
                  </Field>
                </div>
              </div>
            ))}
          </div>

          <div className="card mt-4 p-4">
            <h2 className="text-sm font-bold text-ink-900">{t('booking.leadContact')}</h2>
            <p className="mt-1 text-xs text-ink-500">Tickets and updates go to this email and mobile number.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label={t('common.name')}>
                <input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className="field" />
              </Field>
              <Field label={t('common.email')}>
                <input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className="field" />
              </Field>
              <Field label={t('common.phone')}>
                <input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value.replace(/[^\d]/g, '').slice(0, 10) })} className="field" inputMode="numeric" />
              </Field>
            </div>
          </div>

          <label className="mt-4 flex items-start gap-2 text-xs text-ink-500">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-3.5 accent-brand-600" />
            <span>
              {t('booking.agree')}{' '}
              <Link to="/terms" className="link">Terms</Link> · <Link to="/refund" className="link">Refund policy</Link>
            </span>
          </label>

          <button type="submit" className="btn btn-primary mt-4 w-full sm:w-auto">
            {t('booking.continuePayment')} <ArrowRight className="size-4" />
          </button>
        </form>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          {loading ? (
            <div className="skeleton h-64 w-full" />
          ) : trip ? (
            <TripSummary trip={trip} />
          ) : null}

          <div className="card mt-3 p-4 text-sm">
            <h2 className="text-sm font-bold text-ink-900">{t('booking.summary')}</h2>
            <div className="mt-3 space-y-2 text-ink-500">
              <div className="flex justify-between"><span>{t('common.seats')}</span><span className="font-semibold text-ink-900">{checkout.seats.join(', ')}</span></div>
              <div className="flex justify-between"><span>{t('booking.boarding')}</span><span className="max-w-[55%] text-right font-semibold text-ink-900">{checkout.boardingPoint}</span></div>
              <div className="flex justify-between"><span>{t('booking.dropping')}</span><span className="max-w-[55%] text-right font-semibold text-ink-900">{checkout.droppingPoint}</span></div>
              <div className="flex justify-between border-t border-mist-100 pt-2 text-base"><span className="font-semibold">{t('common.total')}</span><span className="font-bold text-brand-700">{formatINR(checkout.fareTotal)}</span></div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-300">
              <ShieldCheck className="size-3.5" /> Secure checkout · instant confirmation
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
