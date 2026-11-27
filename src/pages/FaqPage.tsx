import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { Link } from '../lib/router';
import { useSite } from '../lib/site';

const GROUPS: Array<{ title: string; items: Array<{ q: string; a: string }> }> = [
  {
    title: 'Booking',
    items: [
      {
        q: 'How do I book a bus ticket?',
        a: 'Search your route and date, pick a departure, choose your seats on the live seat map, add passenger details and pay. Your e-ticket is issued as soon as payment is verified.',
      },
      {
        q: 'How many seats can I book at once?',
        a: 'Up to six seats per transaction. For group bookings larger than six seats, please contact support on WhatsApp.',
      },
      {
        q: 'How long are my selected seats held?',
        a: 'Seats are held for ten minutes while you complete passenger details, and the hold is extended for twenty minutes once the booking is created so you can finish the payment.',
      },
      {
        q: 'Do I need an account to book?',
        a: 'Yes. Signing in keeps your ticket, lets you download the PDF any time and makes cancellation and refunds straightforward.',
      },
    ],
  },
  {
    title: 'Payments, coupons and refunds',
    items: [
      {
        q: 'Which payment methods are supported?',
        a: 'UPI, debit cards, credit cards and net banking through Razorpay. Card details are entered on Razorpay’s secure checkout and never touch our servers.',
      },
      {
        q: 'When is my booking confirmed?',
        a: 'Only after the payment signature returned by Razorpay is verified on our server. If verification fails, the booking stays pending and the seats are released.',
      },
      {
        q: 'What is the cancellation policy?',
        a: 'Cancel at least 24 hours before departure for a 90% refund, between 12 and 24 hours for 50%, and under 12 hours there is no refund. Refunds go back to the original payment method.',
      },
      {
        q: 'How do coupons work?',
        a: 'Enter the coupon on the payment page before paying. The discount is validated against the fare on our server, so the amount you pay is always the server-calculated amount.',
      },
    ],
  },
  {
    title: 'On the day of travel',
    items: [
      {
        q: 'What should I carry?',
        a: 'A printed or digital copy of your e-ticket and a valid photo ID for every passenger. Reach your boarding point at least 15 minutes early.',
      },
      {
        q: 'Can I change my boarding point?',
        a: 'You can board at any boarding point listed on the ticket for that departure. If you need a different point, contact the operator through support before departure.',
      },
      {
        q: 'What about luggage?',
        a: 'Two pieces of luggage per passenger are generally allowed in the luggage hold, subject to the operator’s policy. Valuables should stay with you.',
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        q: 'How do I download my ticket again?',
        a: 'Open My bookings, choose the confirmed journey and select Download. The PDF is generated fresh from the booking record each time.',
      },
      {
        q: 'I forgot my password. What now?',
        a: 'Contact support with your registered email and we will verify your identity before resetting access. You can also change your password from My account once signed in.',
      },
    ],
  },
];

export default function FaqPage() {
  const { settings } = useSite();
  const [open, setOpen] = useState<string | null>('How do I book a bus ticket?');

  return (
    <div className="page-shell py-10">
      <div className="max-w-2xl">
        <span className="chip"><HelpCircle className="size-3.5 text-brand-600" /> Support</span>
        <h1 className="mt-3 font-display text-3xl font-semibold text-ink-900">Frequently asked questions</h1>
        <p className="mt-2 text-sm text-ink-500">
          Everything about booking, payments, refunds and travel day. Still stuck? Call {settings.supportPhone} or use WhatsApp.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{group.title}</h2>
              <div className="card divide-y divide-mist-100 overflow-hidden">
                {group.items.map((item) => {
                  const expanded = open === item.q;
                  return (
                    <div key={item.q}>
                      <button
                        type="button"
                        onClick={() => setOpen(expanded ? null : item.q)}
                        aria-expanded={expanded}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-ink-900 hover:bg-mist-50"
                      >
                        {item.q}
                        <ChevronDown className={`size-4 shrink-0 text-ink-300 transition ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                      {expanded ? <p className="px-4 pb-4 text-sm leading-relaxed text-ink-500">{item.a}</p> : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <h2 className="text-sm font-bold">Need a human?</h2>
            <p className="mt-1 text-sm text-ink-500">Our Bhubaneswar support desk is open 7 AM – 11 PM, every day.</p>
            <div className="mt-3 flex flex-col gap-2">
              <a href={`tel:${settings.supportPhone?.replace(/\s/g, '')}`} className="btn btn-ghost">{settings.supportPhone}</a>
              <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noreferrer" className="btn btn-primary">Chat on WhatsApp</a>
              <Link to="/contact" className="btn btn-ghost">Contact form</Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
