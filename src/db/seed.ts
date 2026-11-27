import { and, eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  banners,
  boardingPoints,
  busOperators,
  busSeats,
  buses,
  coupons,
  droppingPoints,
  profiles,
  reviews,
  routes,
  siteSettings,
  trips,
} from './schema.ts';
import { hashPassword } from '../server/auth.ts';

export const DEFAULT_SETTINGS: Record<string, string> = {
  brandName: 'Utkal Yatra',
  tagline: "Odisha's trusted online bus ticket booking platform",
  supportPhone: '+91 90909 09090',
  supportEmail: 'support@utkalyatra.in',
  whatsappNumber: process.env.WHATSAPP_NUMBER || '919090909090',
  officeAddress: 'Saheed Nagar, Bhubaneswar, Odisha 751007',
  currencySymbol: '₹',
  refundPolicy: 'Free cancellation up to 24 hours before departure (90% refund). 12-24 hours: 50% refund. Under 12 hours: no refund.',
};

type Seat = {
  seatNo: string;
  deck: 'lower' | 'upper';
  seatType: 'seater' | 'sleeper';
  isLadies: boolean;
};

/** Deterministic seat map for a bus layout. */
export function generateSeats(layout: string, totalSeats: number): Seat[] {
  const seats: Seat[] = [];
  const isSleeper = layout.startsWith('sleeper');
  const perDeck = isSleeper ? Math.ceil(totalSeats / 2) : totalSeats;
  const decks: Array<'lower' | 'upper'> = isSleeper ? ['lower', 'upper'] : ['lower'];
  let n = 0;
  for (const deck of decks) {
    const prefix = isSleeper ? (deck === 'lower' ? 'L' : 'U') : '';
    for (let i = 1; i <= perDeck && n < totalSeats; i += 1, n += 1) {
      seats.push({
        seatNo: `${prefix}${i}`,
        deck,
        seatType: isSleeper ? 'sleeper' : 'seater',
        // deterministic "ladies" seats so the seat map shows the feature
        isLadies: i % 7 === 3 || i % 11 === 5,
      });
    }
  }
  return seats;
}

const OPERATORS = [
  { name: 'Odisha Express Travels', rating: 4.5, contactEmail: 'ops@odishaexpress.in', contactPhone: '+91 90000 11111' },
  { name: 'Kalinga Roadlines', rating: 4.3, contactEmail: 'book@kalingaroadlines.in', contactPhone: '+91 90000 22222' },
  { name: 'Utkal Deluxe Coaches', rating: 4.6, contactEmail: 'care@utkaldeluxe.in', contactPhone: '+91 90000 33333' },
  { name: 'Konark Travels', rating: 4.1, contactEmail: 'hello@konarktravels.in', contactPhone: '+91 90000 44444' },
  { name: 'Jagannath Sleeper Lines', rating: 4.4, contactEmail: 'support@jagannathsleeper.in', contactPhone: '+91 90000 55555' },
];

const BUSES = [
  { operator: 'Utkal Deluxe Coaches', name: 'Utkal Volvo B11R Multi-Axle', regNo: 'OD-02-AX-4421', busType: 'AC Seater', layout: 'seater-2-2', totalSeats: 40, rating: 4.7, amenities: ['AC', 'Charging Point', 'Water Bottle', 'Reading Light', 'CCTV'] },
  { operator: 'Utkal Deluxe Coaches', name: 'Utkal Sleeper Lounge', regNo: 'OD-02-AY-8890', busType: 'AC Sleeper', layout: 'sleeper-2-1', totalSeats: 30, rating: 4.6, amenities: ['AC', 'Blanket', 'Charging Point', 'Curtains', 'CCTV'] },
  { operator: 'Odisha Express Travels', name: 'Odisha Express Scania', regNo: 'OD-05-BC-1102', busType: 'AC Sleeper', layout: 'sleeper-2-1', totalSeats: 34, rating: 4.5, amenities: ['AC', 'Blanket', 'Charging Point', 'WiFi', 'CCTV'] },
  { operator: 'Odisha Express Travels', name: 'Odisha Express Semi-Sleeper', regNo: 'OD-05-BC-2245', busType: 'Non-AC Seater', layout: 'seater-2-2', totalSeats: 44, rating: 4.2, amenities: ['Charging Point', 'Reading Light'] },
  { operator: 'Kalinga Roadlines', name: 'Kalinga Deluxe Cruiser', regNo: 'OD-14-CD-7781', busType: 'AC Seater', layout: 'seater-2-2', totalSeats: 40, rating: 4.3, amenities: ['AC', 'Charging Point', 'Water Bottle'] },
  { operator: 'Kalinga Roadlines', name: 'Kalinga Night Rider', regNo: 'OD-14-CD-3320', busType: 'Non-AC Sleeper', layout: 'sleeper-2-1', totalSeats: 32, rating: 4.0, amenities: ['Blanket', 'Charging Point', 'Curtains'] },
  { operator: 'Konark Travels', name: 'Konark Coastal Express', regNo: 'OD-33-DE-9011', busType: 'AC Seater', layout: 'seater-2-1', totalSeats: 36, rating: 4.2, amenities: ['AC', 'Charging Point', 'WiFi'] },
  { operator: 'Jagannath Sleeper Lines', name: 'Jagannath Royal Sleeper', regNo: 'OD-02-EF-5567', busType: 'AC Sleeper', layout: 'sleeper-2-1', totalSeats: 30, rating: 4.4, amenities: ['AC', 'Blanket', 'Charging Point', 'Snacks'] },
  { operator: 'Jagannath Sleeper Lines', name: 'Jagannath Janata Seater', regNo: 'OD-02-EF-6612', busType: 'Non-AC Seater', layout: 'seater-2-2', totalSeats: 44, rating: 4.0, amenities: ['Charging Point'] },
];

const ROUTES = [
  { origin: 'Bhubaneswar', destination: 'Puri', distanceKm: 62, durationMin: 90 },
  { origin: 'Bhubaneswar', destination: 'Cuttack', distanceKm: 28, durationMin: 60 },
  { origin: 'Bhubaneswar', destination: 'Berhampur', distanceKm: 168, durationMin: 240 },
  { origin: 'Bhubaneswar', destination: 'Sambalpur', distanceKm: 330, durationMin: 420 },
  { origin: 'Bhubaneswar', destination: 'Rourkela', distanceKm: 400, durationMin: 510 },
  { origin: 'Bhubaneswar', destination: 'Balasore', distanceKm: 196, durationMin: 270 },
  { origin: 'Bhubaneswar', destination: 'Bolangir', distanceKm: 330, durationMin: 450 },
  { origin: 'Cuttack', destination: 'Puri', distanceKm: 84, durationMin: 120 },
  { origin: 'Sambalpur', destination: 'Rourkela', distanceKm: 130, durationMin: 180 },
  { origin: 'Bhubaneswar', destination: 'Jeypore', distanceKm: 540, durationMin: 660 },
];

// [from, to, busName, departHHMM, fare]
const SCHEDULES: Array<[string, string, string, string, number]> = [
  ['Bhubaneswar', 'Puri', 'Utkal Volvo B11R Multi-Axle', '06:30', 349],
  ['Bhubaneswar', 'Puri', 'Konark Coastal Express', '09:15', 299],
  ['Bhubaneswar', 'Puri', 'Odisha Express Semi-Sleeper', '14:00', 249],
  ['Bhubaneswar', 'Cuttack', 'Kalinga Deluxe Cruiser', '07:00', 149],
  ['Bhubaneswar', 'Cuttack', 'Jagannath Janata Seater', '17:30', 129],
  ['Bhubaneswar', 'Berhampur', 'Odisha Express Scania', '21:00', 899],
  ['Bhubaneswar', 'Berhampur', 'Kalinga Night Rider', '22:30', 699],
  ['Bhubaneswar', 'Sambalpur', 'Utkal Sleeper Lounge', '20:45', 1099],
  ['Bhubaneswar', 'Sambalpur', 'Jagannath Royal Sleeper', '21:30', 1049],
  ['Bhubaneswar', 'Rourkela', 'Odisha Express Scania', '20:00', 1299],
  ['Bhubaneswar', 'Balasore', 'Konark Coastal Express', '08:00', 599],
  ['Bhubaneswar', 'Bolangir', 'Jagannath Royal Sleeper', '19:30', 1149],
  ['Cuttack', 'Puri', 'Kalinga Deluxe Cruiser', '10:30', 329],
  ['Sambalpur', 'Rourkela', 'Odisha Express Semi-Sleeper', '11:00', 399],
  ['Bhubaneswar', 'Jeypore', 'Odisha Express Scania', '18:30', 1499],
];

const BOARDING: Record<string, Array<[string, string]>> = {
  Bhubaneswar: [
    ['Baramunda Bus Stand', 'Baramunda, Bhubaneswar'],
    ['Master Canteen Square', 'Master Canteen, Bhubaneswar'],
    ['Jaydev Vihar (Nandankanan Road)', 'Jaydev Vihar, Bhubaneswar'],
  ],
  Cuttack: [
    ['Cuttack Bus Stand (Badambadi)', 'Badambadi, Cuttack'],
    ['Link Road Petrol Pump', 'Link Road, Cuttack'],
  ],
  Sambalpur: [['Sambalpur Bus Stand', 'Ainthapali, Sambalpur']],
};

const DROPPING: Record<string, Array<[string, string]>> = {
  Puri: [
    ['Puri Bus Stand', 'Municipal Market, Puri'],
    ['Sea Beach Parking', 'New Marine Drive, Puri'],
  ],
  Cuttack: [['Cuttack Bus Stand (Badambadi)', 'Badambadi, Cuttack']],
  Berhampur: [['Berhampur Bus Stand', 'Giri Market, Berhampur']],
  Sambalpur: [['Sambalpur Bus Stand', 'Ainthapali, Sambalpur']],
  Rourkela: [['Rourkela Bus Stand', 'Panposh Road, Rourkela']],
  Balasore: [['Balasore Bus Stand', 'Sahadevkhunta, Balasore']],
  Bolangir: [['Bolangir Bus Stand', 'Station Road, Bolangir']],
  Jeypore: [['Jeypore Bus Stand', 'Main Road, Jeypore']],
};

const COUPONS = [
  { code: 'FIRST100', description: '₹100 off on your first booking above ₹500', discountType: 'flat', value: 100, minAmount: 500, maxDiscount: 100 },
  { code: 'ODISA10', description: '10% off up to ₹150 on all Odisha routes', discountType: 'percent', value: 10, minAmount: 400, maxDiscount: 150 },
  { code: 'SLEEPER15', description: '15% off up to ₹250 on sleeper buses', discountType: 'percent', value: 15, minAmount: 800, maxDiscount: 250 },
];

const REVIEWS = [
  { authorName: 'Subrata Mohapatra', routeLabel: 'Bhubaneswar → Puri', rating: 5, comment: 'Clean Volvo, on-time departure from Baramunda and the seat map was exactly as shown. Booking took under two minutes.' },
  { authorName: 'Pragyan Das', routeLabel: 'Bhubaneswar → Sambalpur', rating: 4, comment: 'Comfortable sleeper berth and polite staff. Boarding point info with live map was very helpful at night.' },
  { authorName: 'Sasmita Behera', routeLabel: 'Cuttack → Puri', rating: 5, comment: 'Ladies seats were clearly marked, and the e-ticket PDF came to my email instantly.' },
  { authorName: 'Rakesh Patnaik', routeLabel: 'Bhubaneswar → Rourkela', rating: 4, comment: 'Good value for money. Cancellation refund reached my UPI in three days as promised.' },
];

const IST_OFFSET_MS = 330 * 60 * 1000;

/** UTC instant of midnight in India, `offsetDays` from today. */
function istDayStartUtc(offsetDays = 0): number {
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  return Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate() + offsetDays) - IST_OFFSET_MS;
}

/** A departure time (HH:MM, India time) on the given IST day. */
function atIstTime(dayStartMs: number, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(dayStartMs + (h * 60 + m) * 60000);
}

async function seedStatic() {
  const [{ count: opCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(busOperators);
  if (opCount === 0) {
    await db.insert(busOperators).values(OPERATORS);
  }

  const [{ count: busCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(buses);
  if (busCount === 0) {
    const operators = await db.select().from(busOperators);
    const byName = new Map(operators.map((o) => [o.name, o.id]));
    await db.insert(buses).values(
      BUSES.map((b) => ({
        operatorId: byName.get(b.operator)!,
        name: b.name,
        regNo: b.regNo,
        busType: b.busType,
        layout: b.layout,
        totalSeats: b.totalSeats,
        amenities: b.amenities,
        rating: b.rating,
      }))
    );
  }

  const [{ count: routeCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(routes);
  if (routeCount === 0) {
    await db.insert(routes).values(ROUTES);
  }

  const [{ count: couponCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(coupons);
  if (couponCount === 0) {
    await db.insert(coupons).values(COUPONS);
  }

  const [{ count: reviewCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(reviews);
  if (reviewCount === 0) {
    await db.insert(reviews).values(REVIEWS.map((r) => ({ ...r, status: 'approved' })));
  }

  const [{ count: bannerCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(banners);
  if (bannerCount === 0) {
    await db.insert(banners).values([
      { title: 'Monsoon fares are live', subtitle: 'Flat 10% off on all sleeper buses across Odisha with code ODISA10.', ctaText: 'Find buses', ctaLink: '/search', sortOrder: 1 },
      { title: 'Night journeys, made easy', subtitle: 'Live seat maps, instant e-tickets and free cancellation up to 24 hours.', ctaText: 'Explore routes', ctaLink: '/search', sortOrder: 2 },
    ]);
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.insert(siteSettings).values({ key, value }).onConflictDoNothing();
  }

  const [{ count: adminCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(profiles)
    .where(eq(profiles.role, 'admin'));
  if (adminCount === 0) {
    const email = (process.env.ADMIN_EMAIL || 'admin@utkalyatra.in').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
    await db.insert(profiles).values({
      email,
      name: 'Platform Administrator',
      phone: process.env.ADMIN_PHONE || '+91 90909 09090',
      role: 'admin',
      passwordHash: hashPassword(password),
    });
  }
}

/** Creates dated departures (and their seat maps) for the next `days` days. */
export async function ensureTripsForRange(days = 21): Promise<void> {
  const allBuses = await db.select().from(buses);
  const allRoutes = await db.select().from(routes);
  const busByName = new Map(allBuses.map((b) => [b.name, b]));
  const routeByKey = new Map(allRoutes.map((r) => [`${r.origin}|${r.destination}`, r]));
  for (let day = 0; day < days; day += 1) {
    const dayStartMs = istDayStartUtc(day);
    for (const [from, to, busName, hhmm, fare] of SCHEDULES) {
      const bus = busByName.get(busName);
      const route = routeByKey.get(`${from}|${to}`);
      if (!bus || !route) continue;

      const departAt = atIstTime(dayStartMs, hhmm);
      if (departAt.getTime() < Date.now() - 3600_000) continue;

      const arriveAt = new Date(departAt.getTime() + route.durationMin * 60000);
      const existing = await db
        .select({ id: trips.id })
        .from(trips)
        .where(and(eq(trips.busId, bus.id), eq(trips.departAt, departAt)))
        .limit(1);
      if (existing.length > 0) continue;

      const [trip] = await db
        .insert(trips)
        .values({ busId: bus.id, routeId: route.id, departAt, arriveAt, fare })
        .returning();

      await db.insert(busSeats).values(
        generateSeats(bus.layout, bus.totalSeats).map((s) => ({ tripId: trip.id, ...s }))
      );

      const boarding = BOARDING[from] || [[`${from} Bus Stand`, from]];
      await db.insert(boardingPoints).values(
        boarding.map(([name, landmark], i) => ({
          tripId: trip.id,
          name,
          city: from,
          time: hhmm,
          landmark,
          sortOrder: i,
        }))
      );

      const dropping = DROPPING[to] || [[`${to} Bus Stand`, to]];
      await db.insert(droppingPoints).values(
        dropping.map(([name, landmark], i) => ({
          tripId: trip.id,
          name,
          city: to,
          time: `${String(arriveAt.getHours()).padStart(2, '0')}:${String(arriveAt.getMinutes()).padStart(2, '0')}`,
          landmark,
          sortOrder: i,
        }))
      );
    }
  }
}

export async function ensureDatabaseSeeded(): Promise<void> {
  await seedStatic();
  await ensureTripsForRange();
}
