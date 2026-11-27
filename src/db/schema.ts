import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/* ------------------------------------------------------------------ */
/* Accounts                                                           */
/* ------------------------------------------------------------------ */

export const profiles = pgTable(
  'profiles',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    phone: text('phone'),
    role: text('role').notNull().default('customer'), // customer | admin
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('profiles_email_key').on(t.email)]
);

/* ------------------------------------------------------------------ */
/* Fleet                                                              */
/* ------------------------------------------------------------------ */

export const busOperators = pgTable('bus_operators', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  logoUrl: text('logo_url'),
  rating: doublePrecision('rating').notNull().default(4.2),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const buses = pgTable('buses', {
  id: serial('id').primaryKey(),
  operatorId: integer('operator_id')
    .notNull()
    .references(() => busOperators.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  regNo: text('reg_no').notNull(),
  busType: text('bus_type').notNull(), // AC Sleeper, AC Seater, Non-AC Sleeper, Non-AC Seater
  layout: text('layout').notNull().default('seater-2-2'), // seater-2-2 | seater-2-1 | sleeper-2-1
  totalSeats: integer('total_seats').notNull().default(40),
  amenities: jsonb('amenities').$type<string[]>().notNull().default([]),
  rating: doublePrecision('rating').notNull().default(4.2),
  imageUrl: text('image_url'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const routes = pgTable(
  'routes',
  {
    id: serial('id').primaryKey(),
    origin: text('origin').notNull(),
    destination: text('destination').notNull(),
    distanceKm: integer('distance_km').notNull().default(0),
    durationMin: integer('duration_min').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('routes_origin_destination_idx').on(t.origin, t.destination)]
);

export const trips = pgTable(
  'trips',
  {
    id: serial('id').primaryKey(),
    busId: integer('bus_id')
      .notNull()
      .references(() => buses.id, { onDelete: 'cascade' }),
    routeId: integer('route_id')
      .notNull()
      .references(() => routes.id, { onDelete: 'cascade' }),
    departAt: timestamp('depart_at').notNull(),
    arriveAt: timestamp('arrive_at').notNull(),
    fare: integer('fare').notNull(),
    status: text('status').notNull().default('scheduled'), // scheduled | cancelled
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('trips_depart_idx').on(t.departAt),
    uniqueIndex('trips_bus_depart_key').on(t.busId, t.departAt),
  ]
);

export const busSeats = pgTable(
  'bus_seats',
  {
    id: serial('id').primaryKey(),
    tripId: integer('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    seatNo: text('seat_no').notNull(),
    deck: text('deck').notNull().default('lower'), // lower | upper
    seatType: text('seat_type').notNull().default('seater'), // seater | sleeper
    isLadies: boolean('is_ladies').notNull().default(false),
    status: text('status').notNull().default('available'), // available | held | booked
    heldUntil: timestamp('held_until'),
    holdToken: text('hold_token'),
    bookingId: integer('booking_id'),
  },
  (t) => [
    uniqueIndex('bus_seats_trip_seat_key').on(t.tripId, t.seatNo),
    index('bus_seats_trip_status_idx').on(t.tripId, t.status),
  ]
);

export const boardingPoints = pgTable('boarding_points', {
  id: serial('id').primaryKey(),
  tripId: integer('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  city: text('city').notNull(),
  time: text('time').notNull(), // HH:MM
  landmark: text('landmark'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const droppingPoints = pgTable('dropping_points', {
  id: serial('id').primaryKey(),
  tripId: integer('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  city: text('city').notNull(),
  time: text('time').notNull(),
  landmark: text('landmark'),
  sortOrder: integer('sort_order').notNull().default(0),
});

/* ------------------------------------------------------------------ */
/* Bookings                                                           */
/* ------------------------------------------------------------------ */

export const bookings = pgTable(
  'bookings',
  {
    id: serial('id').primaryKey(),
    code: text('code').notNull(),
    userId: integer('user_id').references(() => profiles.id, { onDelete: 'set null' }),
    tripId: integer('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'restrict' }),
    status: text('status').notNull().default('pending'), // pending | confirmed | cancelled
    contactName: text('contact_name').notNull(),
    contactEmail: text('contact_email').notNull(),
    contactPhone: text('contact_phone').notNull(),
    boardingPoint: text('boarding_point').notNull(),
    droppingPoint: text('dropping_point').notNull(),
    seats: text('seats').notNull(),
    passengerCount: integer('passenger_count').notNull(),
    fareTotal: integer('fare_total').notNull(),
    discount: integer('discount').notNull().default(0),
    totalAmount: integer('total_amount').notNull(),
    couponCode: text('coupon_code'),
    paymentStatus: text('payment_status').notNull().default('pending'), // pending | paid | failed | refunded
    refundAmount: integer('refund_amount').notNull().default(0),
    cancelReason: text('cancel_reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    cancelledAt: timestamp('cancelled_at'),
  },
  (t) => [
    uniqueIndex('bookings_code_key').on(t.code),
    index('bookings_user_idx').on(t.userId),
    index('bookings_created_idx').on(t.createdAt),
  ]
);

export const bookingPassengers = pgTable('booking_passengers', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id')
    .notNull()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  age: integer('age').notNull(),
  gender: text('gender').notNull(),
  seatNo: text('seat_no').notNull(),
  fare: integer('fare').notNull(),
});

export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    bookingId: integer('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    userId: integer('user_id').references(() => profiles.id, { onDelete: 'set null' }),
    provider: text('provider').notNull().default('razorpay'),
    orderId: text('order_id'),
    paymentId: text('payment_id'),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('INR'),
    status: text('status').notNull().default('created'), // created | paid | failed | refunded
    method: text('method'),
    message: text('message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('payments_booking_idx').on(t.bookingId)]
);

/* ------------------------------------------------------------------ */
/* Marketing & content                                                */
/* ------------------------------------------------------------------ */

export const coupons = pgTable(
  'coupons',
  {
    id: serial('id').primaryKey(),
    code: text('code').notNull(),
    description: text('description').notNull().default(''),
    discountType: text('discount_type').notNull().default('percent'), // percent | flat
    value: integer('value').notNull(),
    minAmount: integer('min_amount').notNull().default(0),
    maxDiscount: integer('max_discount').notNull().default(0),
    validFrom: timestamp('valid_from'),
    validUntil: timestamp('valid_until'),
    usageLimit: integer('usage_limit').notNull().default(0),
    usedCount: integer('used_count').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('coupons_code_key').on(t.code)]
);

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => profiles.id, { onDelete: 'set null' }),
  authorName: text('author_name').notNull(),
  routeLabel: text('route_label'),
  rating: integer('rating').notNull(),
  comment: text('comment').notNull(),
  status: text('status').notNull().default('pending'), // pending | approved | rejected
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => profiles.id, { onDelete: 'set null' }),
  bookingId: integer('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
  channel: text('channel').notNull(), // email | sms
  recipient: text('recipient').notNull(),
  subject: text('subject').notNull().default(''),
  body: text('body').notNull(),
  status: text('status').notNull().default('queued'), // queued | sent | failed | logged
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const banners = pgTable('banners', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull().default(''),
  imageUrl: text('image_url'),
  ctaText: text('cta_text').notNull().default('Book now'),
  ctaLink: text('cta_link').notNull().default('/search'),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
