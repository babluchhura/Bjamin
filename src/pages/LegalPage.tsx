import { Link } from '../lib/router';
import { useSite } from '../lib/site';

type Mode = 'privacy' | 'terms' | 'refund';

const CONTENT: Record<Mode, { title: string; updated: string; sections: Array<{ heading: string; body: string[] }> }> = {
  privacy: {
    title: 'Privacy policy',
    updated: 'Last updated 1 November 2026',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'When you create an account we store your name, email address and mobile number. When you book, we store passenger names, ages, genders, seat numbers, boarding and dropping points, and the fare paid.',
          'Payment card details are entered directly into Razorpay’s checkout. We never receive or store card numbers, CVV codes or UPI PINs. We store only the Razorpay order and payment identifiers needed to reconcile a booking and process refunds.',
        ],
      },
      {
        heading: 'How we use your data',
        body: [
          'Your data is used to issue tickets, send booking confirmations by email and SMS, respond to support requests, process cancellations and refunds, and keep legally required accounting records.',
          'We do not sell personal data. Operators receive only the passenger and boarding information required to operate your journey.',
        ],
      },
      {
        heading: 'Cookies and sessions',
        body: [
          'We use a single, signed, HTTP-only session cookie to keep you signed in. It contains no personal data beyond a session identifier and expires after seven days. We do not use advertising or cross-site tracking cookies.',
        ],
      },
      {
        heading: 'Your rights',
        body: [
          'You can update your name and mobile number from My account, and you can request a copy or deletion of your data by writing to support. Booking records are retained for the period required by tax and transport regulations.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms and conditions',
    updated: 'Last updated 1 November 2026',
    sections: [
      {
        heading: 'Our role',
        body: [
          'We are a booking platform. Bus services are operated by independent bus operators. Your contract of carriage is with the operator; we facilitate booking, payment collection and refunds on their behalf.',
        ],
      },
      {
        heading: 'Bookings and tickets',
        body: [
          'A booking is confirmed only after payment is verified on our server. A pending booking does not guarantee a seat once the hold period expires.',
          'Passengers must carry a valid photo ID matching the name on the ticket. Operators may deny boarding without valid identification.',
        ],
      },
      {
        heading: 'Fares and coupons',
        body: [
          'Fares are set by operators and displayed inclusive of applicable taxes. Coupon discounts are validated server-side; misuse may lead to cancellation of the booking without refund.',
        ],
      },
      {
        heading: 'Operator changes',
        body: [
          'Operators may change the vehicle, boarding point or schedule for operational reasons. Where a journey is cancelled by the operator, you are entitled to a full refund of the fare paid.',
        ],
      },
      {
        heading: 'Liability',
        body: [
          'We are not liable for delays, loss of luggage or injury arising from the operation of the bus. Claims relating to the journey should be raised with the operator; we will assist with documentation.',
        ],
      },
    ],
  },
  refund: {
    title: 'Cancellation and refund policy',
    updated: 'Last updated 1 November 2026',
    sections: [
      {
        heading: 'Cancellation window and refund percentage',
        body: [
          'More than 24 hours before scheduled departure: 90% of the fare paid is refunded.',
          'Between 24 and 12 hours before scheduled departure: 50% of the fare paid is refunded.',
          'Less than 12 hours before scheduled departure, or after departure: no refund.',
        ],
      },
      {
        heading: 'How to cancel',
        body: [
          'Open My bookings, select the journey and choose Cancel booking. The exact refund amount is calculated from the departure time and shown in the confirmation message before the cancellation is finalised.',
        ],
      },
      {
        heading: 'Processing time',
        body: [
          'Refunds are initiated to the original payment method immediately after cancellation. Banks and UPI providers typically credit the amount within 5–7 working days. A refund reference is recorded against your booking.',
        ],
      },
      {
        heading: 'Operator cancellations',
        body: [
          'If an operator cancels a departure, you receive a 100% refund regardless of the cancellation window. Our support team will contact you with the option to rebook an alternative departure where available.',
        ],
      },
      {
        heading: 'Coupons and partial refunds',
        body: [
          'Refunds are calculated on the net amount actually paid after coupon discounts. Coupon codes are not re-issued after a cancellation.',
        ],
      },
    ],
  },
};

export default function LegalPage({ mode }: { mode: Mode }) {
  const { settings } = useSite();
  const content = CONTENT[mode];

  return (
    <div className="page-shell py-10">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-600">Legal</p>
          <nav className="mt-3 flex flex-col gap-1 text-sm">
            {[
              { to: '/privacy', label: 'Privacy policy' },
              { to: '/terms', label: 'Terms & conditions' },
              { to: '/refund', label: 'Cancellation & refunds' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-lg px-3 py-2 font-semibold ${item.label === content.title ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-mist-100'}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <article className="max-w-3xl">
          <h1 className="font-display text-3xl font-semibold text-ink-900">{content.title}</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-300">{content.updated}</p>
          <p className="mt-4 text-sm text-ink-500">
            This document applies to bookings made on {settings.brandName} for bus journeys within Odisha, India.
          </p>

          <div className="mt-6 space-y-6">
            {content.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-base font-bold text-ink-900">{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="mt-2 text-sm leading-relaxed text-ink-600">{paragraph}</p>
                ))}
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-mist-200 bg-mist-50 p-4 text-sm text-ink-600">
            Questions about this document? Write to <a href={`mailto:${settings.supportEmail}`} className="link">{settings.supportEmail}</a> or call {settings.supportPhone}.
          </div>
        </article>
      </div>
    </div>
  );
}
