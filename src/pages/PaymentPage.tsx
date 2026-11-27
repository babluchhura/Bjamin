import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, BadgePercent, CreditCard, Lock, ShieldCheck, Smartphone, Wallet } from 'lucide-react';
import TripSummary from '../components/TripSummary';
import { EmptyState, Field, PageLoader } from '../components/ui';
import { api } from '../lib/api';
import { formatINR } from '../lib/format';
import { Link, useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { useSite } from '../lib/site';
import { clearCheckout, patchCheckout, readCheckout } from '../lib/checkout';
import type { TripDetail } from '../types/bus';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

async function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) return true;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentPage() {
  const { navigate } = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const { settings, paymentsConfigured } = useSite();
  const toast = useToast();
  const checkout = readCheckout();

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [coupon, setCoupon] = useState(checkout?.couponCode || '');
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(
    checkout?.couponCode && checkout?.discount ? { code: checkout.couponCode, discount: checkout.discount } : null
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!checkout) return;
    api
      .trip(checkout.tripId)
      .then(setTrip)
      .catch(() => setTrip(null))
      .finally(() => setLoading(false));
  }, [checkout?.tripId]);

  if (!checkout) {
    return (
      <div className="page-shell py-16">
        <EmptyState
          icon={<Lock className="size-5" />}
          title="Your seat selection has expired"
          body="Please pick your seats again to continue."
          action={<Link to="/search" className="btn btn-primary">{t('nav.search')}</Link>}
        />
      </div>
    );
  }

  if (authLoading) return <PageLoader />;
  if (!user) {
    return (
      <div className="page-shell py-16">
        <EmptyState
          icon={<Lock className="size-5" />}
          title="Sign in to pay"
          body="Your seats are held. Sign in to complete the payment."
          action={<Link to={`/login?next=${encodeURIComponent('/booking/payment')}`} className="btn btn-primary">{t('auth.signIn')}</Link>}
        />
      </div>
    );
  }

  const discount = applied?.discount || 0;
  const payable = Math.max(0, checkout.fareTotal - discount);

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    try {
      const result = await api.validateCoupon(coupon.trim(), checkout.fareTotal);
      setApplied({ code: result.code, discount: result.discount });
      patchCheckout({ couponCode: result.code, discount: result.discount });
      toast.push(`${result.code}: ${formatINR(result.discount)} off`, 'success');
    } catch (error) {
      setApplied(null);
      patchCheckout({ couponCode: undefined, discount: 0 });
      toast.push(error instanceof Error ? error.message : 'Coupon could not be applied.', 'error');
    }
  };

  const createBooking = async () => {
    const result = await api.createBooking({
      tripId: checkout.tripId,
      holdToken: checkout.holdToken,
      seats: checkout.seats,
      passengers: checkout.passengers.map((p) => ({ ...p, age: Number(p.age) })),
      contact: checkout.contact,
      boardingPoint: checkout.boardingPoint,
      droppingPoint: checkout.droppingPoint,
      couponCode: applied?.code || undefined,
    });
    return result;
  };

  const pay = async () => {
    setBusy(true);
    try {
      const result = await createBooking();

      if (!result.paymentsConfigured || !result.payment) {
        clearCheckout();
        toast.push('Seats reserved. Payment is pending confirmation.', 'info');
        navigate(`/booking/confirmation/${result.booking.code}`);
        return;
      }

      const ready = await loadRazorpayScript();
      if (!ready) {
        await api.reportPaymentFailure({ code: result.booking.code, razorpay_order_id: result.payment.orderId, reason: 'Checkout script failed to load' });
        toast.push('Could not open the payment window. Please check your connection and try again.', 'error');
        setBusy(false);
        return;
      }

      const razorpay = new window.Razorpay!({
        key: result.payment.keyId,
        amount: result.payment.amount,
        currency: result.payment.currency,
        name: settings.brandName,
        description: `Booking ${result.booking.code} · ${checkout.seats.join(', ')}`,
        order_id: result.payment.orderId,
        prefill: {
          name: checkout.contact.name,
          email: checkout.contact.email,
          contact: checkout.contact.phone,
        },
        notes: { booking_code: result.booking.code },
        theme: { color: '#2563eb' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await api.verifyPayment({
              code: result.booking.code,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            clearCheckout();
            navigate(`/booking/confirmation/${result.booking.code}`);
          } catch (error) {
            toast.push(error instanceof Error ? error.message : 'Payment verification failed.', 'error');
            navigate(`/bookings/${result.booking.code}`);
          }
        },
        modal: {
          ondismiss: async () => {
            await api.reportPaymentFailure({
              code: result.booking.code,
              razorpay_order_id: result.payment?.orderId,
              reason: 'Payment window closed by customer',
            });
            toast.push('Payment was not completed. Your seats stay held for a short while.', 'error');
            setBusy(false);
          },
        },
      });
      razorpay.open();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not start the booking.', 'error');
      setBusy(false);
    }
  };

  return (
    <div className="page-shell py-8">
      <Link to="/booking/passengers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-700">
        <ArrowLeft className="size-4" /> {t('common.back')}
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">{t('payment.title')}</h1>
          <p className="mt-1 text-sm text-ink-500">{t('payment.subtitle')}</p>

          {!paymentsConfigured ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
                <AlertTriangle className="size-4" /> {t('payment.notConfigured')}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">{t('payment.notConfiguredBody')}</p>
            </div>
          ) : null}

          <div className="card mt-4 p-4">
            <h2 className="text-sm font-bold text-ink-900">Payment methods</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                { icon: <Smartphone className="size-4" />, label: 'UPI' },
                { icon: <CreditCard className="size-4" />, label: 'Cards' },
                { icon: <Wallet className="size-4" />, label: 'Net banking' },
              ].map((method) => (
                <div key={method.label} className="flex items-center gap-2 rounded-xl border border-mist-200 bg-mist-50 px-3 py-2.5 text-sm font-semibold text-ink-700">
                  <span className="text-brand-600">{method.icon}</span> {method.label}
                </div>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-500">
              <ShieldCheck className="size-3.5 text-emerald-600" /> {t('payment.secure')}
            </p>
          </div>

          <div className="card mt-4 p-4">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
              <BadgePercent className="size-4 text-brand-600" /> {t('payment.coupon')}
            </h2>
            <div className="mt-2 flex gap-2">
              <input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                placeholder="e.g. ODISA10"
                className="field"
              />
              <button type="button" onClick={applyCoupon} className="btn btn-ghost shrink-0">{t('common.apply')}</button>
            </div>
            {applied ? (
              <p className="mt-2 text-xs font-semibold text-emerald-700">
                {t('payment.couponApplied')}: {applied.code} (−{formatINR(applied.discount)})
                <button
                  type="button"
                  onClick={() => {
                    setApplied(null);
                    setCoupon('');
                    patchCheckout({ couponCode: undefined, discount: 0 });
                  }}
                  className="ml-2 text-ink-500 underline"
                >
                  {t('common.remove')}
                </button>
              </p>
            ) : null}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          {loading ? <div className="skeleton h-64 w-full" /> : trip ? <TripSummary trip={trip} /> : null}

          <div className="card mt-3 p-4">
            <h2 className="text-sm font-bold text-ink-900">{t('booking.summary')}</h2>
            <div className="mt-3 space-y-2 text-sm text-ink-500">
              <div className="flex justify-between"><span>{t('common.seats')}</span><span className="font-semibold text-ink-900">{checkout.seats.join(', ')}</span></div>
              <div className="flex justify-between"><span>{t('seats.baseFare')}</span><span className="font-semibold text-ink-900">{formatINR(checkout.fareTotal)}</span></div>
              {discount > 0 ? (
                <div className="flex justify-between text-emerald-700"><span>{t('common.discount')}</span><span className="font-semibold">−{formatINR(discount)}</span></div>
              ) : null}
              <div className="flex justify-between border-t border-mist-100 pt-2 text-base">
                <span className="font-semibold">{t('payment.amountPayable')}</span>
                <span className="font-bold text-brand-700">{formatINR(payable)}</span>
              </div>
            </div>
            <button type="button" onClick={pay} disabled={busy} className="btn btn-primary mt-4 w-full">
              {busy ? t('common.loading') : paymentsConfigured ? `${t('payment.payNow')} · ${formatINR(payable)}` : 'Reserve seats'}
            </button>
            <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-ink-300">
              <Lock className="size-3" /> {paymentsConfigured ? t('payment.secure') : 'No card details are collected on this site.'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
