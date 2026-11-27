import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { and, asc, desc, eq, gte, ilike, inArray, lte, ne, or, sql } from 'drizzle-orm';
import { db, isValidPostgresUrl } from './src/db/index.ts';
import {
  banners,
  boardingPoints,
  bookingPassengers,
  bookings,
  busOperators,
  busSeats,
  buses,
  coupons,
  droppingPoints,
  notifications,
  payments,
  profiles,
  reviews,
  routes,
  siteSettings,
  trips,
} from './src/db/schema.ts';
import { DEFAULT_SETTINGS, ensureDatabaseSeeded, generateSeats } from './src/db/seed.ts';
import {
  attachUser,
  clearSessionCookie,
  hashPassword,
  isValidEmail,
  isValidPhone,
  requireAdmin,
  requireAuth,
  setSessionCookie,
  signSession,
  verifyPassword,
  type AuthedRequest,
} from './src/server/auth.ts';
import { buildTicketPdf } from './src/server/pdf.ts';
import { queueNotification } from './src/server/notify.ts';
import {
  createRazorpayOrder,
  getRazorpayConfig,
  isRazorpayConfigured,
  refundRazorpayPayment,
  verifyRazorpaySignature,
  verifyRazorpayWebhook,
} from './src/server/razorpay.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const HOLD_MINUTES = 10;
const PAYMENT_HOLD_MINUTES = 20;
const MAX_SEATS = 6;

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function money(n: number): number {
  return Math.max(0, Math.round(n));
}

const IST_OFFSET_MS = 330 * 60 * 1000;

/** Day boundaries for a journey date, expressed in India Standard Time. */
function dayBounds(dateStr?: string) {
  const match = dateStr?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const year = match ? Number(match[1]) : nowIst.getUTCFullYear();
  const month = match ? Number(match[2]) : nowIst.getUTCMonth() + 1;
  const day = match ? Number(match[3]) : nowIst.getUTCDate();
  const startMs = Date.UTC(year, month - 1, day) - IST_OFFSET_MS;
  return { start: new Date(startMs), end: new Date(startMs + 86400000) };
}

function makeBookingCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) code += alphabet[crypto.randomInt(alphabet.length)];
  return `UY${code}`;
}

async function releaseExpiredHolds(tripId?: number) {
  const base = and(eq(busSeats.status, 'held'), lte(busSeats.heldUntil, new Date()));
  await db
    .update(busSeats)
    .set({ status: 'available', heldUntil: null, holdToken: null, bookingId: null })
    .where(tripId ? and(base, eq(busSeats.tripId, tripId)) : base);
}

async function settingsMap(): Promise<Record<string, string>> {
  const rows = await db.select().from(siteSettings);
  const map: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const row of rows) map[row.key] = row.value;
  return map;
}

async function loadTrip(tripId: number) {
  const [row] = await db
    .select({ trip: trips, bus: buses, operator: busOperators, route: routes })
    .from(trips)
    .innerJoin(buses, eq(trips.busId, buses.id))
    .innerJoin(busOperators, eq(buses.operatorId, busOperators.id))
    .innerJoin(routes, eq(trips.routeId, routes.id))
    .where(eq(trips.id, tripId))
    .limit(1);
  return row || null;
}

async function seatsForTrip(tripId: number) {
  await releaseExpiredHolds(tripId);
  return db.select().from(busSeats).where(eq(busSeats.tripId, tripId)).orderBy(asc(busSeats.id));
}

async function pointsForTrip(tripId: number) {
  const [boarding, dropping] = await Promise.all([
    db.select().from(boardingPoints).where(eq(boardingPoints.tripId, tripId)).orderBy(asc(boardingPoints.sortOrder)),
    db.select().from(droppingPoints).where(eq(droppingPoints.tripId, tripId)).orderBy(asc(droppingPoints.sortOrder)),
  ]);
  return { boarding, dropping };
}

async function tripDto(tripId: number) {
  const row = await loadTrip(tripId);
  if (!row) return null;
  const seats = await seatsForTrip(tripId);
  const { boarding, dropping } = await pointsForTrip(tripId);
  return {
    id: row.trip.id,
    departAt: row.trip.departAt,
    arriveAt: row.trip.arriveAt,
    fare: row.trip.fare,
    status: row.trip.status,
    bus: row.bus,
    operator: { id: row.operator.id, name: row.operator.name, rating: row.operator.rating, contactPhone: row.operator.contactPhone },
    route: row.route,
    seats,
    availableSeats: seats.filter((s) => s.status === 'available').length,
    totalSeats: seats.length,
    boardingPoints: boarding,
    droppingPoints: dropping,
  };
}

function couponDiscount(coupon: typeof coupons.$inferSelect, amount: number): { ok: boolean; discount: number; message: string } {
  const now = new Date();
  if (!coupon.active) return { ok: false, discount: 0, message: 'This coupon is no longer active.' };
  if (coupon.validFrom && coupon.validFrom > now) return { ok: false, discount: 0, message: 'This coupon is not active yet.' };
  if (coupon.validUntil && coupon.validUntil < now) return { ok: false, discount: 0, message: 'This coupon has expired.' };
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, discount: 0, message: 'This coupon has reached its usage limit.' };
  }
  if (amount < coupon.minAmount) {
    return { ok: false, discount: 0, message: `This coupon needs a minimum fare of ₹${coupon.minAmount}.` };
  }
  let discount = coupon.discountType === 'percent' ? Math.round((amount * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, amount);
  return { ok: true, discount, message: `${coupon.code} applied` };
}

function refundFor(departAt: Date, paid: number): { refund: number; note: string } {
  const hours = (new Date(departAt).getTime() - Date.now()) / 3600000;
  if (hours >= 24) return { refund: money(paid * 0.9), note: 'Cancelled 24h+ before departure — 90% refund' };
  if (hours >= 12) return { refund: money(paid * 0.5), note: 'Cancelled 12–24h before departure — 50% refund' };
  return { refund: 0, note: 'Cancelled under 12h before departure — no refund as per policy' };
}

/* ------------------------------------------------------------------ */
/* body parsing (webhook needs the raw body for signature checks)       */
/* ------------------------------------------------------------------ */

app.post(
  '/api/payments/webhook',
  express.raw({ type: '*/*', limit: '1mb' }),
  async (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body || {});
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    if (!verifyRazorpayWebhook(raw, signature)) {
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }
    try {
      const event = JSON.parse(raw);
      const entity = event?.payload?.payment?.entity;
      if (event?.event === 'payment.captured' && entity?.order_id) {
        const [booking] = await db
          .select()
          .from(bookings)
          .where(eq(bookings.code, entity?.notes?.booking_code || ''))
          .limit(1);
        if (booking && booking.status === 'pending') {
          await confirmBooking(booking.id, entity.order_id, entity.id, entity.method);
        }
      }
      return res.json({ received: true });
    } catch (error) {
      console.error('Webhook processing failed:', error);
      return res.status(500).json({ error: 'Webhook processing failed.' });
    }
  }
);

app.use(express.json({ limit: '4mb' }));
app.use(attachUser);

/* ------------------------------------------------------------------ */
/* public configuration                                                */
/* ------------------------------------------------------------------ */

app.get('/api/health', async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ ok: true, database: 'connected', databaseUrlConfigured: isValidPostgresUrl(process.env.DATABASE_URL) });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ ok: false, database: 'error' });
  }
});

app.get('/api/config', async (_req, res) => {
  const settings = await settingsMap();
  res.json({
    settings,
    razorpayKeyId: getRazorpayConfig()?.keyId || '',
    paymentsConfigured: isRazorpayConfigured(),
    mapsEmbedEnabled: true,
  });
});

app.get('/api/settings', async (_req, res) => {
  res.json(await settingsMap());
});

app.get('/api/cities', async (_req, res) => {
  const rows = await db.select({ origin: routes.origin, destination: routes.destination }).from(routes);
  const cities = new Set<string>();
  rows.forEach((r) => {
    cities.add(r.origin);
    cities.add(r.destination);
  });
  res.json([...cities].sort());
});

app.get('/api/popular-routes', async (_req, res) => {
  const rows = await db
    .select({ route: routes, minFare: sql<number>`min(${trips.fare})::int` })
    .from(routes)
    .innerJoin(trips, eq(trips.routeId, routes.id))
    .where(and(eq(routes.active, true), gte(trips.departAt, new Date())))
    .groupBy(routes.id)
    .orderBy(asc(routes.id))
    .limit(8);
  res.json(rows);
});

app.get('/api/banners', async (_req, res) => {
  const rows = await db.select().from(banners).where(eq(banners.active, true)).orderBy(asc(banners.sortOrder));
  res.json(rows);
});

/* ------------------------------------------------------------------ */
/* auth                                                                */
/* ------------------------------------------------------------------ */

function sessionPayload(row: typeof profiles.$inferSelect) {
  return {
    user: { id: row.id, email: row.email, name: row.name, phone: row.phone, role: row.role },
  };
}

app.post('/api/auth/register', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const phone = String(req.body?.phone || '').replace(/[^\d]/g, '');
  const password = String(req.body?.password || '');

  if (name.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (!isValidPhone(phone)) return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const existing = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.email, email)).limit(1);
  if (existing.length > 0) return res.status(409).json({ error: 'An account with this email already exists.' });

  const [row] = await db
    .insert(profiles)
    .values({ email, name, phone, role: 'customer', passwordHash: hashPassword(password) })
    .returning();

  setSessionCookie(res, signSession({ uid: row.id, email: row.email, name: row.name, role: 'customer' }));
  await queueNotification({
    userId: row.id,
    channel: 'email',
    recipient: row.email,
    subject: 'Welcome to Utkal Yatra',
    body: `Hi ${row.name},\n\nYour Utkal Yatra account is ready. You can now book bus tickets across Odisha and download e-tickets instantly.\n\nHappy journeys!`,
  });
  return res.status(201).json(sessionPayload(row));
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const [row] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
  if (!row || !row.active || !verifyPassword(password, row.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  setSessionCookie(res, signSession({ uid: row.id, email: row.email, name: row.name, role: row.role === 'admin' ? 'admin' : 'customer' }));
  return res.json(sessionPayload(row));
});

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not signed in.' });
  return res.json({ user: req.user });
});

app.patch('/api/auth/profile', requireAuth, async (req: AuthedRequest, res) => {
  const name = String(req.body?.name || '').trim();
  const phone = String(req.body?.phone || '').replace(/[^\d]/g, '');
  if (name.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
  if (phone && !isValidPhone(phone)) return res.status(400).json({ error: 'Please enter a valid mobile number.' });
  const [row] = await db
    .update(profiles)
    .set({ name, phone: phone || null, updatedAt: new Date() })
    .where(eq(profiles.id, req.user!.id))
    .returning();
  res.json(sessionPayload(row));
});

app.post('/api/auth/password', requireAuth, async (req: AuthedRequest, res) => {
  const current = String(req.body?.currentPassword || '');
  const next = String(req.body?.newPassword || '');
  if (next.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  const [row] = await db.select().from(profiles).where(eq(profiles.id, req.user!.id)).limit(1);
  if (!row || !verifyPassword(current, row.passwordHash)) {
    return res.status(400).json({ error: 'Your current password is incorrect.' });
  }
  await db.update(profiles).set({ passwordHash: hashPassword(next), updatedAt: new Date() }).where(eq(profiles.id, row.id));
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* search & trips                                                      */
/* ------------------------------------------------------------------ */

app.get('/api/trips', async (req, res) => {
  await ensureDatabaseSeeded();
  const from = String(req.query.from || '').trim();
  const to = String(req.query.to || '').trim();
  const dateStr = String(req.query.date || '').trim();
  const { start, end } = dayBounds(dateStr);

  const filters = [eq(trips.status, 'scheduled'), gte(trips.departAt, start), lte(trips.departAt, end)];
  if (from) filters.push(ilike(routes.origin, from));
  if (to) filters.push(ilike(routes.destination, to));

  const rows = await db
    .select({ trip: trips, bus: buses, operator: busOperators, route: routes })
    .from(trips)
    .innerJoin(buses, eq(trips.busId, buses.id))
    .innerJoin(busOperators, eq(buses.operatorId, busOperators.id))
    .innerJoin(routes, eq(trips.routeId, routes.id))
    .where(and(...filters))
    .orderBy(asc(trips.departAt));

  await releaseExpiredHolds();
  const ids = rows.map((r) => r.trip.id);
  const counts = ids.length
    ? await db
        .select({ tripId: busSeats.tripId, available: sql<number>`count(*)::int`, total: sql<number>`count(*)::int` })
        .from(busSeats)
        .where(and(inArray(busSeats.tripId, ids), eq(busSeats.status, 'available')))
        .groupBy(busSeats.tripId)
    : [];
  const totals = ids.length
    ? await db
        .select({ tripId: busSeats.tripId, total: sql<number>`count(*)::int` })
        .from(busSeats)
        .where(inArray(busSeats.tripId, ids))
        .groupBy(busSeats.tripId)
    : [];
  const availMap = new Map(counts.map((c) => [c.tripId, c.available]));
  const totalMap = new Map(totals.map((c) => [c.tripId, c.total]));

  const pointRows = ids.length
    ? await db.select().from(boardingPoints).where(inArray(boardingPoints.tripId, ids)).orderBy(asc(boardingPoints.sortOrder))
    : [];
  const dropRows = ids.length
    ? await db.select().from(droppingPoints).where(inArray(droppingPoints.tripId, ids)).orderBy(asc(droppingPoints.sortOrder))
    : [];

  res.json(
    rows.map((r) => ({
      id: r.trip.id,
      departAt: r.trip.departAt,
      arriveAt: r.trip.arriveAt,
      fare: r.trip.fare,
      status: r.trip.status,
      bus: r.bus,
      operator: { id: r.operator.id, name: r.operator.name, rating: r.operator.rating },
      route: r.route,
      availableSeats: availMap.get(r.trip.id) || 0,
      totalSeats: totalMap.get(r.trip.id) || r.bus.totalSeats,
      boardingPoints: pointRows.filter((p) => p.tripId === r.trip.id),
      droppingPoints: dropRows.filter((p) => p.tripId === r.trip.id),
    }))
  );
});

app.get('/api/trips/:id', async (req, res) => {
  const dto = await tripDto(Number(req.params.id));
  if (!dto) return res.status(404).json({ error: 'This bus departure could not be found.' });
  return res.json(dto);
});

app.post('/api/trips/:id/hold', async (req, res) => {
  const tripId = Number(req.params.id);
  const seatNos: string[] = Array.isArray(req.body?.seats)
    ? req.body.seats.filter((s: unknown) => typeof s === 'string').map((s: string) => s.trim())
    : [];
  if (seatNos.length === 0) return res.status(400).json({ error: 'Select at least one seat.' });
  if (seatNos.length > MAX_SEATS) return res.status(400).json({ error: `You can book up to ${MAX_SEATS} seats at a time.` });

  const trip = await loadTrip(tripId);
  if (!trip) return res.status(404).json({ error: 'This bus departure could not be found.' });
  if (trip.trip.status !== 'scheduled') return res.status(409).json({ error: 'This departure is not open for booking.' });

  await releaseExpiredHolds(tripId);
  const rows = await db
    .select()
    .from(busSeats)
    .where(and(eq(busSeats.tripId, tripId), inArray(busSeats.seatNo, seatNos)));

  if (rows.length !== seatNos.length) return res.status(400).json({ error: 'One or more selected seats do not exist on this bus.' });
  const taken = rows.filter((s) => s.status !== 'available');
  if (taken.length > 0) {
    return res.status(409).json({ error: `Seat(s) ${taken.map((s) => s.seatNo).join(', ')} were just booked. Please pick another seat.` });
  }

  const holdToken = crypto.randomBytes(18).toString('hex');
  const heldUntil = new Date(Date.now() + HOLD_MINUTES * 60000);
  await db
    .update(busSeats)
    .set({ status: 'held', holdToken, heldUntil, bookingId: null })
    .where(and(eq(busSeats.tripId, tripId), inArray(busSeats.seatNo, seatNos)));

  res.json({
    holdToken,
    heldUntil,
    holdMinutes: HOLD_MINUTES,
    seats: seatNos,
    farePerSeat: trip.trip.fare,
    fareTotal: trip.trip.fare * seatNos.length,
  });
});

/* ------------------------------------------------------------------ */
/* coupons & reviews                                                   */
/* ------------------------------------------------------------------ */

app.post('/api/coupons/validate', async (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  const amount = Number(req.body?.amount || 0);
  if (!code) return res.status(400).json({ error: 'Enter a coupon code.' });
  const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  if (!coupon) return res.status(404).json({ error: 'This coupon code is not valid.' });
  const result = couponDiscount(coupon, amount);
  if (!result.ok) return res.status(400).json({ error: result.message });
  return res.json({ code: coupon.code, description: coupon.description, discount: result.discount });
});

app.post('/api/contact', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const phone = String(req.body?.phone || '').replace(/\D/g, '').slice(-10);
  const subject = String(req.body?.subject || 'Website enquiry').trim().slice(0, 120);
  const message = String(req.body?.message || '').trim().slice(0, 4000);
  if (name.length < 2) return res.status(400).json({ error: 'Please enter your name.' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (message.length < 10) return res.status(400).json({ error: 'Please add a little more detail to your message.' });
  const settings = await settingsMap();
  await queueNotification({
    channel: 'email',
    recipient: settings.supportEmail || 'support@utkalyatra.in',
    subject: `Contact form · ${subject}`,
    body: `From: ${name} <${email}>${phone ? ` · +91 ${phone}` : ''}\nSubject: ${subject}\n\n${message}`,
  });
  res.json({ ok: true });
});

app.get('/api/reviews', async (_req, res) => {
  const rows = await db
    .select()
    .from(reviews)
    .where(eq(reviews.status, 'approved'))
    .orderBy(desc(reviews.createdAt))
    .limit(12);
  res.json(rows);
});

app.post('/api/reviews', requireAuth, async (req: AuthedRequest, res) => {
  const rating = Number(req.body?.rating || 0);
  const comment = String(req.body?.comment || '').trim();
  const routeLabel = String(req.body?.routeLabel || '').trim() || null;
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Please choose a rating between 1 and 5.' });
  if (comment.length < 10) return res.status(400).json({ error: 'Please write at least 10 characters.' });
  const [row] = await db
    .insert(reviews)
    .values({ userId: req.user!.id, authorName: req.user!.name, rating, comment, routeLabel, status: 'pending' })
    .returning();
  res.status(201).json({ review: row, message: 'Thanks! Your review will appear once approved.' });
});

/* ------------------------------------------------------------------ */
/* bookings                                                            */
/* ------------------------------------------------------------------ */

async function confirmBooking(bookingId: number, orderId: string | null, paymentId: string | null, method?: string) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking || booking.status === 'confirmed') return booking;
  const [trip] = await db.select().from(trips).where(eq(trips.id, booking.tripId)).limit(1);

  await db
    .update(bookings)
    .set({ status: 'confirmed', paymentStatus: 'paid' })
    .where(eq(bookings.id, bookingId));

  await db
    .update(busSeats)
    .set({ status: 'booked', heldUntil: null, holdToken: null, bookingId })
    .where(and(eq(busSeats.tripId, booking.tripId), inArray(busSeats.seatNo, booking.seats.split(','))));

  const [existingPayment] = await db.select().from(payments).where(eq(payments.bookingId, bookingId)).limit(1);
  if (existingPayment) {
    await db
      .update(payments)
      .set({ status: 'paid', paymentId: paymentId || existingPayment.paymentId, orderId: orderId || existingPayment.orderId, method: method || existingPayment.method })
      .where(eq(payments.id, existingPayment.id));
  } else {
    await db.insert(payments).values({
      bookingId,
      userId: booking.userId,
      provider: method === 'offline' ? 'offline' : 'razorpay',
      orderId,
      paymentId,
      amount: booking.totalAmount,
      status: 'paid',
      method: method || null,
      message: method === 'offline' ? 'Offline payment recorded by administrator' : null,
    });
  }

  if (booking.couponCode) {
    await db
      .update(coupons)
      .set({ usedCount: sql`${coupons.usedCount} + 1` })
      .where(eq(coupons.code, booking.couponCode));
  }

  const [route] = trip ? await db.select().from(routes).where(eq(routes.id, trip.routeId)).limit(1) : [null];
  const summary = `Booking ${booking.code}: ${route?.origin ?? ''} to ${route?.destination ?? ''} on ${trip ? new Date(trip.departAt).toLocaleString('en-IN') : ''}. Seats: ${booking.seats}. Amount paid: ₹${booking.totalAmount}.`;

  await queueNotification({
    userId: booking.userId,
    bookingId: booking.id,
    channel: 'email',
    recipient: booking.contactEmail,
    subject: `Your Utkal Yatra ticket — ${booking.code}`,
    body: `Hi ${booking.contactName},\n\nYour booking is confirmed.\n${summary}\n\nBoard at: ${booking.boardingPoint}\nDrop at: ${booking.droppingPoint}\n\nDownload your e-ticket from the My Bookings page.\n\nHave a safe journey!`,
  });
  await queueNotification({
    userId: booking.userId,
    bookingId: booking.id,
    channel: 'sms',
    recipient: `+91${booking.contactPhone.replace(/\D/g, '').slice(-10)}`,
    body: `Utkal Yatra: booking ${booking.code} confirmed. ${booking.seats.split(',').length} seat(s), ₹${booking.totalAmount}. Happy journey!`,
  });

  return booking;
}

app.post('/api/bookings', async (req: AuthedRequest, res) => {
  const tripId = Number(req.body?.tripId);
  const holdToken = String(req.body?.holdToken || '').trim();
  const seats: string[] = Array.isArray(req.body?.seats) ? req.body.seats.map((s: string) => String(s).trim()) : [];
  const passengers = Array.isArray(req.body?.passengers) ? req.body.passengers : [];
  const contact = req.body?.contact || {};
  const boardingPoint = String(req.body?.boardingPoint || '').trim();
  const droppingPoint = String(req.body?.droppingPoint || '').trim();
  const couponCode = String(req.body?.couponCode || '').trim().toUpperCase();

  if (!tripId || seats.length === 0) return res.status(400).json({ error: 'Your seat selection has expired. Please pick seats again.' });
  if (!holdToken) return res.status(400).json({ error: 'Seat hold expired. Please select your seats again.' });
  if (passengers.length !== seats.length) return res.status(400).json({ error: 'Please add details for every passenger.' });

  const contactName = String(contact.name || '').trim();
  const contactEmail = String(contact.email || '').trim().toLowerCase();
  const contactPhone = String(contact.phone || '').replace(/\D/g, '').slice(-10);
  if (contactName.length < 2) return res.status(400).json({ error: 'Please enter the lead passenger name.' });
  if (!isValidEmail(contactEmail)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (contactPhone.length !== 10) return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
  if (!boardingPoint || !droppingPoint) return res.status(400).json({ error: 'Please choose boarding and dropping points.' });

  const cleaned = passengers.map((p: Record<string, unknown>, index: number) => {
    const name = String(p?.name || '').trim();
    const age = Number(p?.age);
    const gender = String(p?.gender || '').trim().toLowerCase();
    if (name.length < 2) throw new Error(`Passenger ${index + 1}: please enter a name.`);
    if (!Number.isFinite(age) || age < 1 || age > 110) throw new Error(`Passenger ${index + 1}: please enter a valid age.`);
    if (!['male', 'female', 'other'].includes(gender)) throw new Error(`Passenger ${index + 1}: please select a gender.`);
    return { name, age: Math.round(age), gender, seatNo: seats[index] };
  });

  const trip = await loadTrip(tripId);
  if (!trip) return res.status(404).json({ error: 'This bus departure could not be found.' });
  if (trip.trip.status !== 'scheduled') return res.status(409).json({ error: 'This departure is no longer available.' });
  if (new Date(trip.trip.departAt).getTime() < Date.now()) {
    return res.status(409).json({ error: 'This bus has already departed.' });
  }

  await releaseExpiredHolds(tripId);
  const seatRows = await db
    .select()
    .from(busSeats)
    .where(and(eq(busSeats.tripId, tripId), inArray(busSeats.seatNo, seats)));

  if (seatRows.length !== seats.length) return res.status(400).json({ error: 'One or more seats are invalid for this bus.' });
  const notHeld = seatRows.filter((s) => !(s.status === 'held' && s.holdToken === holdToken));
  if (notHeld.length > 0) {
    return res.status(409).json({ error: 'Your seat hold expired. Please select seats again.' });
  }

  const fareTotal = trip.trip.fare * seats.length;
  let discount = 0;
  let appliedCoupon: string | null = null;
  if (couponCode) {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.code, couponCode)).limit(1);
    if (coupon) {
      const result = couponDiscount(coupon, fareTotal);
      if (result.ok) {
        discount = result.discount;
        appliedCoupon = coupon.code;
      }
    }
  }
  const totalAmount = money(fareTotal - discount);

  let code = makeBookingCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const clash = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.code, code)).limit(1);
    if (clash.length === 0) break;
    code = makeBookingCode();
  }

  const [booking] = await db
    .insert(bookings)
    .values({
      code,
      userId: req.user?.id ?? null,
      tripId,
      status: 'pending',
      contactName,
      contactEmail,
      contactPhone,
      boardingPoint,
      droppingPoint,
      seats: seats.join(','),
      passengerCount: seats.length,
      fareTotal,
      discount,
      totalAmount,
      couponCode: appliedCoupon,
      paymentStatus: 'pending',
    })
    .returning();

  await db.insert(bookingPassengers).values(
    cleaned.map((p: { name: string; age: number; gender: string; seatNo: string }) => ({
      bookingId: booking.id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      seatNo: p.seatNo,
      fare: trip.trip.fare,
    }))
  );

  await db
    .update(busSeats)
    .set({ status: 'held', bookingId: booking.id, heldUntil: new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60000) })
    .where(and(eq(busSeats.tripId, tripId), inArray(busSeats.seatNo, seats)));

  if (!isRazorpayConfigured()) {
    return res.status(201).json({
      booking,
      payment: null,
      paymentsConfigured: false,
      message: 'Your seats are held for 20 minutes. Online payment is not configured yet — add Razorpay keys to confirm this booking.',
    });
  }

  try {
    const order = await createRazorpayOrder({
      amount: totalAmount,
      receipt: booking.code,
      notes: { booking_code: booking.code, trip_id: String(tripId) },
    });
    await db.insert(payments).values({
      bookingId: booking.id,
      userId: req.user?.id ?? null,
      provider: 'razorpay',
      orderId: order.id,
      amount: totalAmount,
      currency: 'INR',
      status: 'created',
    });
    return res.status(201).json({
      booking,
      paymentsConfigured: true,
      payment: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: getRazorpayConfig()!.keyId,
      },
    });
  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    return res.status(502).json({
      error: 'We could not start the payment. Please try again in a moment.',
      booking,
    });
  }
});

app.post('/api/payments/verify', async (req: AuthedRequest, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  const orderId = String(req.body?.razorpay_order_id || '');
  const paymentId = String(req.body?.razorpay_payment_id || '');
  const signature = String(req.body?.razorpay_signature || '');

  const [booking] = await db.select().from(bookings).where(eq(bookings.code, code)).limit(1);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  if (booking.status === 'confirmed') return res.json({ booking });

  if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
    await db.insert(payments).values({
      bookingId: booking.id,
      userId: booking.userId,
      provider: 'razorpay',
      orderId,
      paymentId,
      amount: booking.totalAmount,
      status: 'failed',
      message: 'Signature verification failed',
    });
    return res.status(400).json({ error: 'Payment could not be verified. You have not been charged for this attempt.' });
  }

  const [row] = await db.select().from(payments).where(and(eq(payments.bookingId, booking.id), eq(payments.orderId, orderId))).limit(1);
  if (!row) {
    await db.insert(payments).values({
      bookingId: booking.id,
      userId: booking.userId,
      provider: 'razorpay',
      orderId,
      paymentId,
      amount: booking.totalAmount,
      status: 'paid',
    });
  }
  await confirmBooking(booking.id, orderId, paymentId);
  const [updated] = await db.select().from(bookings).where(eq(bookings.id, booking.id)).limit(1);
  return res.json({ booking: updated });
});

app.post('/api/payments/failed', async (req: AuthedRequest, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  const [booking] = await db.select().from(bookings).where(eq(bookings.code, code)).limit(1);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  if (booking.status === 'confirmed') return res.json({ ok: true });
  await db.insert(payments).values({
    bookingId: booking.id,
    userId: booking.userId,
    provider: 'razorpay',
    orderId: String(req.body?.razorpay_order_id || '') || null,
    amount: booking.totalAmount,
    status: 'failed',
    message: String(req.body?.reason || 'Payment failed or was cancelled').slice(0, 200),
  });
  await db.update(bookings).set({ paymentStatus: 'failed' }).where(eq(bookings.id, booking.id));
  return res.json({ ok: true });
});

async function bookingDetail(code: string) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.code, code.toUpperCase())).limit(1);
  if (!booking) return null;
  const trip = await loadTrip(booking.tripId);
  const [passengers, paymentRows] = await Promise.all([
    db.select().from(bookingPassengers).where(eq(bookingPassengers.bookingId, booking.id)),
    db.select().from(payments).where(eq(payments.bookingId, booking.id)).orderBy(desc(payments.createdAt)),
  ]);
  return { booking, trip, passengers, payments: paymentRows };
}

app.get('/api/bookings/mine', requireAuth, async (req: AuthedRequest, res) => {
  const rows = await db
    .select({ booking: bookings, trip: trips, route: routes, bus: buses, operator: busOperators })
    .from(bookings)
    .innerJoin(trips, eq(bookings.tripId, trips.id))
    .innerJoin(routes, eq(trips.routeId, routes.id))
    .innerJoin(buses, eq(trips.busId, buses.id))
    .innerJoin(busOperators, eq(buses.operatorId, busOperators.id))
    .where(eq(bookings.userId, req.user!.id))
    .orderBy(desc(trips.departAt));

  const ids = rows.map((r) => r.booking.id);
  const passengerRows = ids.length
    ? await db.select().from(bookingPassengers).where(inArray(bookingPassengers.bookingId, ids))
    : [];

  res.json(
    rows.map((r) => ({
      ...r.booking,
      trip: { id: r.trip.id, departAt: r.trip.departAt, arriveAt: r.trip.arriveAt, fare: r.trip.fare },
      route: r.route,
      bus: { id: r.bus.id, name: r.bus.name, busType: r.bus.busType },
      operator: { id: r.operator.id, name: r.operator.name },
      passengers: passengerRows.filter((p) => p.bookingId === r.booking.id),
    }))
  );
});

app.get('/api/bookings/:code', async (req: AuthedRequest, res) => {
  const detail = await bookingDetail(req.params.code);
  if (!detail) return res.status(404).json({ error: 'Booking not found.' });
  const isOwner = req.user && detail.booking.userId === req.user.id;
  const isAdmin = req.user?.role === 'admin';
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'You do not have access to this booking.' });
  return res.json(detail);
});

app.get('/api/bookings/:code/ticket.pdf', async (req: AuthedRequest, res) => {
  const detail = await bookingDetail(req.params.code);
  if (!detail) return res.status(404).json({ error: 'Booking not found.' });
  const isOwner = req.user && detail.booking.userId === req.user.id;
  const isAdmin = req.user?.role === 'admin';
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'You do not have access to this ticket.' });
  if (detail.booking.status !== 'confirmed') {
    return res.status(409).json({ error: 'The e-ticket is available once payment is confirmed.' });
  }

  const { booking, trip, passengers } = detail;
  const depart = trip ? new Date(trip.trip.departAt) : null;
  const arrive = trip ? new Date(trip.trip.arriveAt) : null;
  const fmt = (d: Date | null) =>
    d ? d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '';

  const pdf = buildTicketPdf(
    [
      { label: 'Booking ID', value: booking.code },
      { label: 'Status', value: booking.status.toUpperCase() },
      { label: 'Route', value: trip ? `${trip.route.origin} to ${trip.route.destination}` : '' },
      { label: 'Bus', value: trip ? `${trip.bus.name} (${trip.bus.busType})` : '' },
      { label: 'Operator', value: trip?.operator.name || '' },
      { label: 'Departure', value: fmt(depart) },
      { label: 'Arrival', value: fmt(arrive) },
      { label: 'Boarding point', value: booking.boardingPoint },
      { label: 'Dropping point', value: booking.droppingPoint },
      { label: 'Seats', value: booking.seats },
      { label: 'Passengers', value: passengers.map((p) => `${p.name} (${p.age}${p.gender[0].toUpperCase()}) - ${p.seatNo}`).join(', ') },
      { label: 'Contact', value: `${booking.contactPhone} | ${booking.contactEmail}` },
      { label: 'Fare', value: `INR ${booking.fareTotal}` },
      { label: 'Discount', value: `INR ${booking.discount}` },
      { label: 'Total paid', value: `INR ${booking.totalAmount}` },
    ],
    'E-Ticket',
    'This is a computer generated ticket. Cancellation policy applies as per website terms.'
  );

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="utkalyatra-ticket-${booking.code}.pdf"`);
  return res.send(pdf);
});

app.post('/api/bookings/:code/cancel', requireAuth, async (req: AuthedRequest, res) => {
  const detail = await bookingDetail(req.params.code);
  if (!detail) return res.status(404).json({ error: 'Booking not found.' });
  const { booking, trip } = detail;
  const isOwner = booking.userId === req.user!.id;
  if (!isOwner && req.user!.role !== 'admin') return res.status(403).json({ error: 'You cannot cancel this booking.' });
  if (booking.status === 'cancelled') return res.status(409).json({ error: 'This booking is already cancelled.' });
  if (!trip) return res.status(409).json({ error: 'This departure is no longer available.' });

  const policy = refundFor(trip.trip.departAt, booking.totalAmount);
  const refundAmount = booking.paymentStatus === 'paid' ? policy.refund : 0;
  const reason = String(req.body?.reason || '').trim() || 'Cancelled by customer';

  await db
    .update(bookings)
    .set({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelReason: reason,
      refundAmount,
      paymentStatus: booking.paymentStatus === 'paid' ? 'refunded' : 'failed',
    })
    .where(eq(bookings.id, booking.id));

  await db
    .update(busSeats)
    .set({ status: 'available', heldUntil: null, holdToken: null, bookingId: null })
    .where(and(eq(busSeats.tripId, booking.tripId), inArray(busSeats.seatNo, booking.seats.split(','))));

  const [paid] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.bookingId, booking.id), eq(payments.status, 'paid')))
    .limit(1);

  let refundNote = policy.note;
  if (paid && refundAmount > 0) {
    if (isRazorpayConfigured() && paid.paymentId) {
      try {
        await refundRazorpayPayment(paid.paymentId, refundAmount);
        refundNote += ' — refund initiated to the original payment method.';
      } catch (error) {
        console.error('Razorpay refund failed:', error);
        refundNote += ' — refund will be processed manually by support.';
      }
    }
    await db.update(payments).set({ status: 'refunded' }).where(eq(payments.id, paid.id));
    await db.insert(payments).values({
      bookingId: booking.id,
      userId: booking.userId,
      provider: 'razorpay',
      orderId: paid.orderId,
      paymentId: paid.paymentId,
      amount: refundAmount,
      status: 'refunded',
      message: refundNote,
    });
  }

  await queueNotification({
    userId: booking.userId,
    bookingId: booking.id,
    channel: 'email',
    recipient: booking.contactEmail,
    subject: `Booking ${booking.code} cancelled`,
    body: `Hi ${booking.contactName},\n\nYour booking ${booking.code} has been cancelled.\n${refundNote}\nRefund amount: ₹${refundAmount}.\n\nIf you need help, contact support@utkalyatra.in.`,
  });

  const [updated] = await db.select().from(bookings).where(eq(bookings.id, booking.id)).limit(1);
  return res.json({ booking: updated, refundAmount, refundNote });
});

/* ------------------------------------------------------------------ */
/* admin                                                               */
/* ------------------------------------------------------------------ */

app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
  const [bookingAgg] = await db
    .select({
      total: sql<number>`count(*)::int`,
      confirmed: sql<number>`count(*) filter (where ${bookings.status} = 'confirmed')::int`,
      pending: sql<number>`count(*) filter (where ${bookings.status} = 'pending')::int`,
      cancelled: sql<number>`count(*) filter (where ${bookings.status} = 'cancelled')::int`,
      revenue: sql<number>`coalesce(sum(${bookings.totalAmount}) filter (where ${bookings.paymentStatus} = 'paid'), 0)::int`,
      refunded: sql<number>`coalesce(sum(${bookings.refundAmount}), 0)::int`,
    })
    .from(bookings);

  const [{ customers }] = await db
    .select({ customers: sql<number>`count(*)::int` })
    .from(profiles)
    .where(eq(profiles.role, 'customer'));
  const [{ busCount }] = await db.select({ busCount: sql<number>`count(*)::int` }).from(buses);
  const [{ routeCount }] = await db.select({ routeCount: sql<number>`count(*)::int` }).from(routes);
  const [{ today }] = await db
    .select({ today: sql<number>`count(*)::int` })
    .from(bookings)
    .where(gte(bookings.createdAt, dayBounds().start));

  const recent = await db
    .select({ booking: bookings, route: routes })
    .from(bookings)
    .innerJoin(trips, eq(bookings.tripId, trips.id))
    .innerJoin(routes, eq(trips.routeId, routes.id))
    .orderBy(desc(bookings.createdAt))
    .limit(8);

  res.json({
    totalBookings: bookingAgg.total,
    confirmedBookings: bookingAgg.confirmed,
    pendingBookings: bookingAgg.pending,
    cancelledBookings: bookingAgg.cancelled,
    revenue: bookingAgg.revenue,
    refunded: bookingAgg.refunded,
    todayBookings: today,
    totalCustomers: customers,
    totalBuses: busCount,
    totalRoutes: routeCount,
    recentBookings: recent.map((r) => ({ ...r.booking, routeLabel: `${r.route.origin} → ${r.route.destination}` })),
  });
});

app.get('/api/admin/operators', requireAdmin, async (_req, res) => {
  const rows = await db.select().from(busOperators).orderBy(asc(busOperators.name));
  res.json(rows);
});

app.post('/api/admin/operators', requireAdmin, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (name.length < 2) return res.status(400).json({ error: 'Operator name is required.' });
  const [row] = await db
    .insert(busOperators)
    .values({
      name,
      contactEmail: String(req.body?.contactEmail || '').trim() || null,
      contactPhone: String(req.body?.contactPhone || '').trim() || null,
      rating: Number(req.body?.rating) || 4.2,
      active: req.body?.active !== false,
    })
    .returning();
  res.status(201).json(row);
});

app.put('/api/admin/operators/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db
    .update(busOperators)
    .set({
      name: String(req.body?.name || '').trim(),
      contactEmail: String(req.body?.contactEmail || '').trim() || null,
      contactPhone: String(req.body?.contactPhone || '').trim() || null,
      rating: Number(req.body?.rating) || 4.2,
      active: req.body?.active !== false,
    })
    .where(eq(busOperators.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: 'Operator not found.' });
  res.json(row);
});

app.delete('/api/admin/operators/:id', requireAdmin, async (req, res) => {
  await db.delete(busOperators).where(eq(busOperators.id, Number(req.params.id)));
  res.json({ ok: true });
});

app.get('/api/admin/buses', requireAdmin, async (_req, res) => {
  const rows = await db
    .select({ bus: buses, operator: busOperators })
    .from(buses)
    .innerJoin(busOperators, eq(buses.operatorId, busOperators.id))
    .orderBy(asc(buses.name));
  res.json(rows.map((r) => ({ ...r.bus, operatorName: r.operator.name })));
});

app.post('/api/admin/buses', requireAdmin, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const operatorId = Number(req.body?.operatorId);
  const regNo = String(req.body?.regNo || '').trim();
  const busType = String(req.body?.busType || 'AC Seater');
  const layout = String(req.body?.layout || 'seater-2-2');
  const totalSeats = Math.min(60, Math.max(6, Number(req.body?.totalSeats) || 40));
  if (!name || !regNo) return res.status(400).json({ error: 'Bus name and registration number are required.' });
  if (!operatorId) return res.status(400).json({ error: 'Choose a bus operator.' });
  const [row] = await db
    .insert(buses)
    .values({
      operatorId,
      name,
      regNo,
      busType,
      layout,
      totalSeats,
      amenities: Array.isArray(req.body?.amenities) ? req.body.amenities : [],
      rating: Number(req.body?.rating) || 4.2,
      active: req.body?.active !== false,
    })
    .returning();
  res.status(201).json(row);
});

app.put('/api/admin/buses/:id', requireAdmin, async (req, res) => {
  const [row] = await db
    .update(buses)
    .set({
      operatorId: Number(req.body?.operatorId),
      name: String(req.body?.name || '').trim(),
      regNo: String(req.body?.regNo || '').trim(),
      busType: String(req.body?.busType || 'AC Seater'),
      layout: String(req.body?.layout || 'seater-2-2'),
      totalSeats: Math.min(60, Math.max(6, Number(req.body?.totalSeats) || 40)),
      amenities: Array.isArray(req.body?.amenities) ? req.body.amenities : [],
      rating: Number(req.body?.rating) || 4.2,
      active: req.body?.active !== false,
    })
    .where(eq(buses.id, Number(req.params.id)))
    .returning();
  if (!row) return res.status(404).json({ error: 'Bus not found.' });
  res.json(row);
});

app.delete('/api/admin/buses/:id', requireAdmin, async (req, res) => {
  await db.delete(buses).where(eq(buses.id, Number(req.params.id)));
  res.json({ ok: true });
});

app.get('/api/admin/routes', requireAdmin, async (_req, res) => {
  res.json(await db.select().from(routes).orderBy(asc(routes.origin)));
});

app.post('/api/admin/routes', requireAdmin, async (req, res) => {
  const origin = String(req.body?.origin || '').trim();
  const destination = String(req.body?.destination || '').trim();
  if (!origin || !destination) return res.status(400).json({ error: 'Origin and destination are required.' });
  const [row] = await db
    .insert(routes)
    .values({
      origin,
      destination,
      distanceKm: Number(req.body?.distanceKm) || 0,
      durationMin: Number(req.body?.durationMin) || 0,
      active: req.body?.active !== false,
    })
    .returning();
  res.status(201).json(row);
});

app.put('/api/admin/routes/:id', requireAdmin, async (req, res) => {
  const [row] = await db
    .update(routes)
    .set({
      origin: String(req.body?.origin || '').trim(),
      destination: String(req.body?.destination || '').trim(),
      distanceKm: Number(req.body?.distanceKm) || 0,
      durationMin: Number(req.body?.durationMin) || 0,
      active: req.body?.active !== false,
    })
    .where(eq(routes.id, Number(req.params.id)))
    .returning();
  if (!row) return res.status(404).json({ error: 'Route not found.' });
  res.json(row);
});

app.delete('/api/admin/routes/:id', requireAdmin, async (req, res) => {
  await db.delete(routes).where(eq(routes.id, Number(req.params.id)));
  res.json({ ok: true });
});

app.get('/api/admin/trips', requireAdmin, async (_req, res) => {
  const rows = await db
    .select({ trip: trips, bus: buses, operator: busOperators, route: routes })
    .from(trips)
    .innerJoin(buses, eq(trips.busId, buses.id))
    .innerJoin(busOperators, eq(buses.operatorId, busOperators.id))
    .innerJoin(routes, eq(trips.routeId, routes.id))
    .where(gte(trips.departAt, new Date(Date.now() - 86400000)))
    .orderBy(asc(trips.departAt))
    .limit(200);
  res.json(
    rows.map((r) => ({
      ...r.trip,
      busName: r.bus.name,
      busType: r.bus.busType,
      operatorName: r.operator.name,
      origin: r.route.origin,
      destination: r.route.destination,
    }))
  );
});

app.post('/api/admin/trips', requireAdmin, async (req, res) => {
  const busId = Number(req.body?.busId);
  const routeId = Number(req.body?.routeId);
  const departAt = new Date(String(req.body?.departAt || ''));
  const fare = Math.max(1, Number(req.body?.fare) || 0);
  const boarding = Array.isArray(req.body?.boardingPoints) ? req.body.boardingPoints : [];
  const dropping = Array.isArray(req.body?.droppingPoints) ? req.body.droppingPoints : [];
  if (!busId || !routeId || Number.isNaN(departAt.getTime()) || !fare) {
    return res.status(400).json({ error: 'Bus, route, departure time and fare are required.' });
  }
  const [bus] = await db.select().from(buses).where(eq(buses.id, busId)).limit(1);
  const [route] = await db.select().from(routes).where(eq(routes.id, routeId)).limit(1);
  if (!bus || !route) return res.status(400).json({ error: 'Bus or route not found.' });

  const arriveAt = new Date(departAt.getTime() + Math.max(route.durationMin, 30) * 60000);
  const clash = await db.select({ id: trips.id }).from(trips).where(and(eq(trips.busId, busId), eq(trips.departAt, departAt))).limit(1);
  if (clash.length > 0) return res.status(409).json({ error: 'This bus already has a departure at that time.' });

  const [trip] = await db.insert(trips).values({ busId, routeId, departAt, arriveAt, fare }).returning();
  await db.insert(busSeats).values(generateSeats(bus.layout, bus.totalSeats).map((s) => ({ tripId: trip.id, ...s })));
  await db.insert(boardingPoints).values(
    (boarding.length ? boarding : [{ name: `${route.origin} Bus Stand`, city: route.origin, time: '00:00' }]).map(
      (p: { name?: string; city?: string; time?: string; landmark?: string }, i: number) => ({
        tripId: trip.id,
        name: String(p.name || `${route.origin} Bus Stand`),
        city: String(p.city || route.origin),
        time: String(p.time || departAt.toTimeString().slice(0, 5)),
        landmark: p.landmark ? String(p.landmark) : null,
        sortOrder: i,
      })
    )
  );
  await db.insert(droppingPoints).values(
    (dropping.length ? dropping : [{ name: `${route.destination} Bus Stand`, city: route.destination, time: '00:00' }]).map(
      (p: { name?: string; city?: string; time?: string; landmark?: string }, i: number) => ({
        tripId: trip.id,
        name: String(p.name || `${route.destination} Bus Stand`),
        city: String(p.city || route.destination),
        time: String(p.time || arriveAt.toTimeString().slice(0, 5)),
        landmark: p.landmark ? String(p.landmark) : null,
        sortOrder: i,
      })
    )
  );
  res.status(201).json(trip);
});

app.get('/api/admin/trips/:id/points', requireAdmin, async (req, res) => {
  const points = await pointsForTrip(Number(req.params.id));
  res.json(points);
});

app.put('/api/admin/trips/:id/points', requireAdmin, async (req, res) => {
  const tripId = Number(req.params.id);
  const trip = await loadTrip(tripId);
  if (!trip) return res.status(404).json({ error: 'Departure not found.' });

  const clean = (list: unknown) =>
    (Array.isArray(list) ? list : []).slice(0, 10).map((raw) => {
      const p = raw as Record<string, unknown>;
      return {
        tripId,
        name: String(p.name || '').trim().slice(0, 120),
        city: String(p.city || '').trim().slice(0, 80),
        time: String(p.time || '00:00').trim().slice(0, 5),
        landmark: p.landmark ? String(p.landmark).trim().slice(0, 160) : null,
      };
    }).filter((p) => p.name && p.city);

  const boarding = clean(req.body?.boarding);
  const dropping = clean(req.body?.dropping);
  if (boarding.length === 0 || dropping.length === 0) {
    return res.status(400).json({ error: 'Add at least one boarding point and one dropping point.' });
  }

  await db.delete(boardingPoints).where(eq(boardingPoints.tripId, tripId));
  await db.delete(droppingPoints).where(eq(droppingPoints.tripId, tripId));
  await db.insert(boardingPoints).values(boarding.map((p, i) => ({ ...p, sortOrder: i })));
  await db.insert(droppingPoints).values(dropping.map((p, i) => ({ ...p, sortOrder: i })));

  res.json(await pointsForTrip(tripId));
});

app.put('/api/admin/trips/:id', requireAdmin, async (req, res) => {
  const [row] = await db
    .update(trips)
    .set({ fare: Math.max(1, Number(req.body?.fare) || 0), status: String(req.body?.status || 'scheduled') })
    .where(eq(trips.id, Number(req.params.id)))
    .returning();
  if (!row) return res.status(404).json({ error: 'Departure not found.' });
  res.json(row);
});

app.delete('/api/admin/trips/:id', requireAdmin, async (req, res) => {
  await db.delete(trips).where(eq(trips.id, Number(req.params.id)));
  res.json({ ok: true });
});

app.get('/api/admin/bookings', requireAdmin, async (req, res) => {
  const status = String(req.query.status || '').trim();
  const q = String(req.query.q || '').trim();
  const filters = [];
  if (status && status !== 'all') filters.push(eq(bookings.status, status));
  if (q) {
    filters.push(
      or(
        ilike(bookings.code, `%${q}%`),
        ilike(bookings.contactName, `%${q}%`),
        ilike(bookings.contactEmail, `%${q}%`),
        ilike(bookings.contactPhone, `%${q}%`)
      )
    );
  }
  const rows = await db
    .select({ booking: bookings, route: routes, trip: trips, bus: buses })
    .from(bookings)
    .innerJoin(trips, eq(bookings.tripId, trips.id))
    .innerJoin(routes, eq(trips.routeId, routes.id))
    .innerJoin(buses, eq(trips.busId, buses.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(bookings.createdAt))
    .limit(200);
  res.json(
    rows.map((r) => ({
      ...r.booking,
      routeLabel: `${r.route.origin} → ${r.route.destination}`,
      busName: r.bus.name,
      departAt: r.trip.departAt,
    }))
  );
});

/**
 * Records an offline payment (counter/UPI collected by the operator) and issues
 * the ticket. Used when online payment is not available for a booking.
 */
app.post('/api/admin/bookings/:code/confirm', requireAdmin, async (req, res) => {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.code, String(req.params.code).toUpperCase()))
    .limit(1);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  if (booking.status === 'cancelled') return res.status(409).json({ error: 'A cancelled booking cannot be confirmed.' });
  if (booking.status === 'confirmed') return res.json({ booking });

  const method = String(req.body?.method || 'offline').slice(0, 40);
  const confirmed = await confirmBooking(booking.id, null, null, method);
  const [updated] = await db.select().from(bookings).where(eq(bookings.id, booking.id)).limit(1);
  res.json({ booking: updated || confirmed });
});

app.get('/api/admin/customers', requireAdmin, async (_req, res) => {
  const rows = await db.select().from(profiles).orderBy(desc(profiles.createdAt));
  const agg = await db
    .select({
      userId: bookings.userId,
      trips: sql<number>`count(*)::int`,
      spend: sql<number>`coalesce(sum(${bookings.totalAmount}) filter (where ${bookings.paymentStatus} = 'paid'), 0)::int`,
    })
    .from(bookings)
    .groupBy(bookings.userId);
  const map = new Map(agg.map((a) => [a.userId, a]));
  res.json(
    rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt,
      bookings: map.get(u.id)?.trips || 0,
      spend: map.get(u.id)?.spend || 0,
    }))
  );
});

app.patch('/api/admin/customers/:id', requireAdmin, async (req, res) => {
  const [row] = await db
    .update(profiles)
    .set({ active: Boolean(req.body?.active) })
    .where(eq(profiles.id, Number(req.params.id)))
    .returning();
  if (!row) return res.status(404).json({ error: 'Customer not found.' });
  res.json({ ok: true, active: row.active });
});

app.get('/api/admin/payments', requireAdmin, async (_req, res) => {
  const rows = await db
    .select({ payment: payments, booking: bookings })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .orderBy(desc(payments.createdAt))
    .limit(200);
  res.json(
    rows.map((r) => ({
      ...r.payment,
      bookingCode: r.booking.code,
      contactName: r.booking.contactName,
      bookingStatus: r.booking.status,
    }))
  );
});

app.get('/api/admin/coupons', requireAdmin, async (_req, res) => {
  res.json(await db.select().from(coupons).orderBy(desc(coupons.createdAt)));
});

app.post('/api/admin/coupons', requireAdmin, async (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  const value = Number(req.body?.value) || 0;
  if (!code || value <= 0) return res.status(400).json({ error: 'Coupon code and discount value are required.' });
  const [row] = await db
    .insert(coupons)
    .values({
      code,
      description: String(req.body?.description || '').trim(),
      discountType: req.body?.discountType === 'flat' ? 'flat' : 'percent',
      value,
      minAmount: Number(req.body?.minAmount) || 0,
      maxDiscount: Number(req.body?.maxDiscount) || 0,
      usageLimit: Number(req.body?.usageLimit) || 0,
      validUntil: req.body?.validUntil ? new Date(String(req.body.validUntil)) : null,
      active: req.body?.active !== false,
    })
    .returning();
  res.status(201).json(row);
});

app.put('/api/admin/coupons/:id', requireAdmin, async (req, res) => {
  const [row] = await db
    .update(coupons)
    .set({
      code: String(req.body?.code || '').trim().toUpperCase(),
      description: String(req.body?.description || '').trim(),
      discountType: req.body?.discountType === 'flat' ? 'flat' : 'percent',
      value: Number(req.body?.value) || 0,
      minAmount: Number(req.body?.minAmount) || 0,
      maxDiscount: Number(req.body?.maxDiscount) || 0,
      usageLimit: Number(req.body?.usageLimit) || 0,
      active: req.body?.active !== false,
    })
    .where(eq(coupons.id, Number(req.params.id)))
    .returning();
  if (!row) return res.status(404).json({ error: 'Coupon not found.' });
  res.json(row);
});

app.delete('/api/admin/coupons/:id', requireAdmin, async (req, res) => {
  await db.delete(coupons).where(eq(coupons.id, Number(req.params.id)));
  res.json({ ok: true });
});

app.get('/api/admin/reviews', requireAdmin, async (_req, res) => {
  res.json(await db.select().from(reviews).orderBy(desc(reviews.createdAt)).limit(100));
});

app.patch('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
  const status = String(req.body?.status || 'pending');
  const [row] = await db
    .update(reviews)
    .set({ status: ['approved', 'rejected', 'pending'].includes(status) ? status : 'pending' })
    .where(eq(reviews.id, Number(req.params.id)))
    .returning();
  if (!row) return res.status(404).json({ error: 'Review not found.' });
  res.json(row);
});

app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
  await db.delete(reviews).where(eq(reviews.id, Number(req.params.id)));
  res.json({ ok: true });
});

app.get('/api/admin/banners', requireAdmin, async (_req, res) => {
  res.json(await db.select().from(banners).orderBy(asc(banners.sortOrder)));
});

app.post('/api/admin/banners', requireAdmin, async (req, res) => {
  const title = String(req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Banner title is required.' });
  const [row] = await db
    .insert(banners)
    .values({
      title,
      subtitle: String(req.body?.subtitle || '').trim(),
      ctaText: String(req.body?.ctaText || 'Book now').trim(),
      ctaLink: String(req.body?.ctaLink || '/search').trim(),
      active: req.body?.active !== false,
      sortOrder: Number(req.body?.sortOrder) || 0,
    })
    .returning();
  res.status(201).json(row);
});

app.put('/api/admin/banners/:id', requireAdmin, async (req, res) => {
  const [row] = await db
    .update(banners)
    .set({
      title: String(req.body?.title || '').trim(),
      subtitle: String(req.body?.subtitle || '').trim(),
      ctaText: String(req.body?.ctaText || 'Book now').trim(),
      ctaLink: String(req.body?.ctaLink || '/search').trim(),
      active: req.body?.active !== false,
      sortOrder: Number(req.body?.sortOrder) || 0,
    })
    .where(eq(banners.id, Number(req.params.id)))
    .returning();
  if (!row) return res.status(404).json({ error: 'Banner not found.' });
  res.json(row);
});

app.delete('/api/admin/banners/:id', requireAdmin, async (req, res) => {
  await db.delete(banners).where(eq(banners.id, Number(req.params.id)));
  res.json({ ok: true });
});

app.get('/api/admin/notifications', requireAdmin, async (_req, res) => {
  res.json(await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(100));
});

const SETTING_KEYS = new Set(Object.keys(DEFAULT_SETTINGS));

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  const updates = (req.body || {}) as Record<string, unknown>;
  for (const [key, value] of Object.entries(updates)) {
    if (!SETTING_KEYS.has(key) || typeof value !== 'string') continue;
    await db
      .insert(siteSettings)
      .values({ key, value: value.trim(), updatedAt: new Date() })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value: value.trim(), updatedAt: new Date() } });
  }
  res.json(await settingsMap());
});

app.get('/api/admin/reports', requireAdmin, async (req, res) => {
  const days = Math.min(180, Math.max(7, Number(req.query.days) || 30));
  const since = new Date(Date.now() - days * 86400000);
  const istDay = sql`date_trunc('day', ${bookings.createdAt} + interval '330 minutes')`;
  const daily = await db
    .select({
      day: sql<string>`to_char(${istDay}, 'YYYY-MM-DD')`,
      bookings: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${bookings.totalAmount}) filter (where ${bookings.paymentStatus} = 'paid'), 0)::int`,
    })
    .from(bookings)
    .where(gte(bookings.createdAt, since))
    .groupBy(istDay)
    .orderBy(istDay);

  const topRoutes = await db
    .select({
      routeLabel: sql<string>`${routes.origin} || ' → ' || ${routes.destination}`,
      bookings: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${bookings.totalAmount}) filter (where ${bookings.paymentStatus} = 'paid'), 0)::int`,
    })
    .from(bookings)
    .innerJoin(trips, eq(bookings.tripId, trips.id))
    .innerJoin(routes, eq(trips.routeId, routes.id))
    .where(gte(bookings.createdAt, since))
    .groupBy(routes.origin, routes.destination)
    .orderBy(desc(sql`count(*)`))
    .limit(8);

  res.json({ days, daily, topRoutes });
});

/* ------------------------------------------------------------------ */
/* static / dev server                                                 */
/* ------------------------------------------------------------------ */

app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

async function startServer() {
  try {
    await ensureDatabaseSeeded();
  } catch (error) {
    console.error('Database seeding skipped (will retry on first request):', error);
  }

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Utkal Yatra server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
