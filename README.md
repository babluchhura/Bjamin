# Utkal Yatra — Online Bus Ticket Booking (Odisha)

A complete bus booking platform for Odisha: live seat maps, server-verified payments,
PDF e-tickets, customer dashboard and a full admin console.

**Stack:** React 19 + TypeScript + Tailwind CSS 4 (Vite) · Express API (same process, Vite
middleware in dev) · PostgreSQL via Drizzle ORM · Razorpay (server-verified) · Resend
(email) + Twilio (SMS).

---

## 1. What is included

### Customer website
| Page | Route |
| --- | --- |
| Home (hero, live search, offers, routes, reviews) | `/` |
| Search buses | `/search` |
| Bus listing with filters + sort | `/buses?from=&to=&date=&pax=` |
| Seat selection (live map, ladies seats, upper/lower deck) | `/buses/:id/seats` |
| Passenger details | `/booking/passengers` |
| Payment (Razorpay) | `/booking/payment` |
| Booking confirmation | `/booking/confirmation/:code` |
| My bookings (upcoming / completed / cancelled) | `/bookings` |
| Booking detail, cancel, e-ticket | `/bookings/:code` |
| Login / registration | `/login`, `/register` |
| My account (profile, password, payment history) | `/account` |
| About, Contact (map + form), FAQ | `/about`, `/contact`, `/faq` |
| Privacy, Terms, Cancellation & refunds | `/privacy`, `/terms`, `/refund` |

Also: three languages (English / हिन्दी / ଓଡ଼ିଆ), WhatsApp support button, INR formatting,
responsive layout, loading skeletons, toast notifications, SEO metadata + JSON-LD.

### Admin console (`/admin`)
Dashboard (bookings, revenue, today, pending, cancelled, customers, buses, routes) ·
Bookings & payments (search, filter, offline payment confirmation, cancellation with
policy refund, payment audit) · Operators & buses (CRUD, seat layout, amenities) ·
Routes & schedules (route CRUD, publish dated departures with generated seat maps, fare
edits, boarding/dropping point editor) · Customers (spend, access toggle) · Coupons ·
Reviews (moderation) · Website content (brand, support details, homepage offers) ·
Reports (daily revenue, top routes, CSV export).

### Booking rules implemented server-side
* Seats are held for **10 minutes** when selected and **20 minutes** once a booking exists.
* A booking is `pending` until payment is verified — never "confirmed" by the client.
* Razorpay signature (`order_id|payment_id` HMAC-SHA256 with the key secret) is verified
  in the API before seats become `booked` and the e-ticket is issued.
* Coupons are validated and the payable amount recalculated on the server.
* Duplicate booking codes are prevented by a unique index; seats by a unique
  `(trip_id, seat_no)` index plus hold-token checks.
* Cancellation refunds: **90%** ≥24h, **50%** between 12–24h, **0%** under 12h (100% if the
  operator cancels). Refunds are attempted through Razorpay when it is configured.

---

## 2. Local development

```bash
# 1. database (any PostgreSQL 14+; this is a throwaway local instance)
docker run -d --name uy-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=utkalyatra -p 5432:5432 postgres:16

# 2. schema
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/utkalyatra"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/schema.sql
# (or: npm run db:push)

# 3. dependencies + env
npm install --legacy-peer-deps
cp .env.example .env      # then edit the values

# 4. run (Express + Vite dev server on http://localhost:3000)
TZ=Asia/Kolkata npm run dev
```

On first boot the API seeds operators, buses, routes, 21 days of dated departures with
seat maps, coupons, reviews, homepage offers, site settings and the administrator account.

**Seeded admin:** `admin@utkalyatra.in` / `Admin@12345`
(override with `ADMIN_EMAIL` / `ADMIN_PASSWORD`; change the password after the first
sign-in from **My account → Change password**).

Seeded coupons: `FIRST100` (₹100 off ≥₹500), `ODISA10` (10% off, max ₹150), `SLEEPER15`
(15% off sleeper fares ≥₹800).

`TZ=Asia/Kolkata` keeps seeded departure days aligned with Indian calendar dates; the UI
also renders every time explicitly in IST regardless of the viewer's device timezone.

---

## 3. Environment variables

See `.env.example`. Summary:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (local, Docker or Supabase pooler) |
| `SESSION_SECRET` | HMAC key for session cookies (min 16 chars) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed administrator account |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Server-side Razorpay credentials |
| `RAZORPAY_WEBHOOK_SECRET` | Verifies `POST /api/payments/webhook` |
| `RESEND_API_KEY` / `EMAIL_FROM` | Booking confirmation emails |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | Booking confirmation SMS |
| `WHATSAPP_NUMBER` | Support button number (digits, country code) |
| `PORT` | API/dev-server port (default 3000) |

**Never expose `RAZORPAY_KEY_SECRET` to the browser.** The client only receives the public
key id with the order; verification happens in `POST /api/payments/verify`.

---

## 4. Payments

1. `POST /api/bookings` validates the hold, fare and coupon, creates the booking as
   `pending`, and creates a Razorpay order for the server-calculated amount.
2. The browser opens Razorpay Checkout (UPI / cards / net banking).
3. `POST /api/payments/verify` recomputes the HMAC signature. Only a valid signature
   marks the payment `paid`, the booking `confirmed` and the seats `booked`.
4. `POST /api/payments/webhook` accepts Razorpay webhooks (raw-body signature check) so a
   captured payment confirms the booking even if the browser closes.
5. Failed or abandoned payments are recorded in `payments` and the seats are released when
   the hold expires.

**Without Razorpay keys** the app does not fake success: the payment page states that online
payment is not configured, the booking is created as `pending` with seats held, and an
administrator can confirm an offline (counter/UPI) payment from **Admin → Bookings →
✓ Record payment and confirm**. That is the only path that confirms a booking without a
verified gateway payment.

---

## 5. Notifications

Every confirmation/cancellation/contact message is stored in `notifications` (visible to
admins) and dispatched when a provider is configured:

* Email → Resend (`RESEND_API_KEY`, `EMAIL_FROM`)
* SMS → Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`)

Without a provider the row is stored with status `logged` — nothing is reported as sent.

---

## 6. Database

`supabase/schema.sql` is the canonical schema (16 tables, foreign keys, indexes):

`profiles · bus_operators · buses · routes · trips · bus_seats · boarding_points ·
dropping_points · bookings · booking_passengers · payments · coupons · reviews ·
notifications · banners · site_settings`

### Hosting on Supabase
1. Create a Supabase project, then run `supabase/schema.sql` in the SQL editor.
2. Run `supabase/rls_policies.sql` to enable Row Level Security: customers can read/update
   only their own profile and bookings, seat maps and the catalogue are publicly readable,
   and every write path is admin-only (`public.is_admin()`).
3. Point `DATABASE_URL` at the Supabase connection pooler string.

The Express API connects as the database owner, so it is not subject to those policies;
they protect the tables if they are also reached through Supabase's PostgREST API.

---

## 7. Production deployment

```bash
npm ci --legacy-peer-deps
npm run build                     # builds the SPA into dist/
NODE_ENV=production TZ=Asia/Kolkata npm start   # Express serves dist/ + the API
```

* Put the app behind HTTPS (reverse proxy / platform router); session cookies are
  HTTP-only and same-site.
* Set a long random `SESSION_SECRET`, a strong `ADMIN_PASSWORD`, and the Razorpay/webhook
  secrets as platform secrets — never in git.
* Add the Razorpay webhook URL `https://<your-domain>/api/payments/webhook` with the
  `payment.captured` event.
* Health check: `GET /api/health` (verifies the database connection).
* Apply `supabase/schema.sql` to the production database before the first boot; the seed
  only fills empty tables.

---

## 8. API surface (summary)

Public: `GET /api/health`, `/api/config`, `/api/settings`, `/api/cities`,
`/api/popular-routes`, `/api/banners`, `/api/reviews`, `/api/trips`,
`/api/trips/:id`, `POST /api/trips/:id/hold`, `POST /api/coupons/validate`,
`POST /api/contact`, `POST /api/payments/webhook`.

Auth: `POST /api/auth/register|login|logout`, `GET /api/auth/me`,
`PATCH /api/auth/profile`, `POST /api/auth/password`.

Booking: `POST /api/bookings`, `POST /api/payments/verify|failed`,
`GET /api/bookings/mine`, `GET /api/bookings/:code`,
`GET /api/bookings/:code/ticket.pdf`, `POST /api/bookings/:code/cancel`.

Admin (`requireAdmin`): `/api/admin/stats`, `operators`, `buses`, `routes`, `trips`
(+ `/trips/:id/points`), `bookings` (+ `/:code/confirm`), `customers`, `payments`,
`coupons`, `reviews`, `banners`, `notifications`, `settings`, `reports`.

---

## 9. Known limitations

* Bus GPS tracking is **not** implemented — it needs a provider feed; the ticket shows
  boarding/dropping details and a map of the boarding area instead.
* Image uploads (Supabase Storage) are not wired up; homepage offers are text-based.
* Online payments, email and SMS stay inactive until the corresponding keys are provided;
  until then the app reports that state instead of simulating success.
