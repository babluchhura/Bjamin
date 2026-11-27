-- ---------------------------------------------------------------------------
-- Utkal Yatra — complete PostgreSQL schema
-- This file is the canonical database definition. Apply it to a fresh
-- PostgreSQL database (local, Docker or Supabase) before starting the API.
-- For Supabase-hosted databases also apply supabase/rls_policies.sql.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id            serial PRIMARY KEY,
  email         text NOT NULL,
  password_hash text NOT NULL,
  name          text NOT NULL,
  phone         text,
  role          text NOT NULL DEFAULT 'customer',
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_key ON profiles (email);

CREATE TABLE IF NOT EXISTS bus_operators (
  id            serial PRIMARY KEY,
  name          text NOT NULL,
  contact_email text,
  contact_phone text,
  logo_url      text,
  rating        double precision NOT NULL DEFAULT 4.2,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS buses (
  id          serial PRIMARY KEY,
  operator_id integer NOT NULL REFERENCES bus_operators(id) ON DELETE CASCADE,
  name        text NOT NULL,
  reg_no      text NOT NULL,
  bus_type    text NOT NULL,
  layout      text NOT NULL DEFAULT 'seater-2-2',
  total_seats integer NOT NULL DEFAULT 40,
  amenities   jsonb NOT NULL DEFAULT '[]'::jsonb,
  rating      double precision NOT NULL DEFAULT 4.2,
  image_url   text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS buses_operator_idx ON buses (operator_id);

CREATE TABLE IF NOT EXISTS routes (
  id            serial PRIMARY KEY,
  origin        text NOT NULL,
  destination   text NOT NULL,
  distance_km   integer NOT NULL DEFAULT 0,
  duration_min  integer NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS routes_origin_destination_idx ON routes (origin, destination);

CREATE TABLE IF NOT EXISTS trips (
  id         serial PRIMARY KEY,
  bus_id     integer NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  route_id   integer NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  depart_at  timestamptz NOT NULL,
  arrive_at  timestamptz NOT NULL,
  fare       integer NOT NULL,
  status     text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trips_depart_idx ON trips (depart_at);
CREATE UNIQUE INDEX IF NOT EXISTS trips_bus_depart_key ON trips (bus_id, depart_at);

CREATE TABLE IF NOT EXISTS bus_seats (
  id          serial PRIMARY KEY,
  trip_id     integer NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  seat_no     text NOT NULL,
  deck        text NOT NULL DEFAULT 'lower',
  seat_type   text NOT NULL DEFAULT 'seater',
  is_ladies   boolean NOT NULL DEFAULT false,
  status      text NOT NULL DEFAULT 'available',
  held_until  timestamptz,
  hold_token  text,
  booking_id  integer
);
CREATE UNIQUE INDEX IF NOT EXISTS bus_seats_trip_seat_key ON bus_seats (trip_id, seat_no);
CREATE INDEX IF NOT EXISTS bus_seats_trip_status_idx ON bus_seats (trip_id, status);

CREATE TABLE IF NOT EXISTS boarding_points (
  id         serial PRIMARY KEY,
  trip_id    integer NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name       text NOT NULL,
  city       text NOT NULL,
  time       text NOT NULL,
  landmark   text,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS boarding_points_trip_idx ON boarding_points (trip_id);

CREATE TABLE IF NOT EXISTS dropping_points (
  id         serial PRIMARY KEY,
  trip_id    integer NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name       text NOT NULL,
  city       text NOT NULL,
  time       text NOT NULL,
  landmark   text,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS dropping_points_trip_idx ON dropping_points (trip_id);

CREATE TABLE IF NOT EXISTS bookings (
  id               serial PRIMARY KEY,
  code             text NOT NULL,
  user_id          integer REFERENCES profiles(id) ON DELETE SET NULL,
  trip_id          integer NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
  status           text NOT NULL DEFAULT 'pending',
  contact_name     text NOT NULL,
  contact_email    text NOT NULL,
  contact_phone    text NOT NULL,
  boarding_point   text NOT NULL,
  dropping_point   text NOT NULL,
  seats            text NOT NULL,
  passenger_count  integer NOT NULL,
  fare_total       integer NOT NULL,
  discount         integer NOT NULL DEFAULT 0,
  total_amount     integer NOT NULL,
  coupon_code      text,
  payment_status   text NOT NULL DEFAULT 'pending',
  refund_amount    integer NOT NULL DEFAULT 0,
  cancel_reason    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  cancelled_at     timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS bookings_code_key ON bookings (code);
CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings (user_id);
CREATE INDEX IF NOT EXISTS bookings_created_idx ON bookings (created_at);

CREATE TABLE IF NOT EXISTS booking_passengers (
  id         serial PRIMARY KEY,
  booking_id integer NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  name       text NOT NULL,
  age        integer NOT NULL,
  gender     text NOT NULL,
  seat_no    text NOT NULL,
  fare       integer NOT NULL
);
CREATE INDEX IF NOT EXISTS booking_passengers_booking_idx ON booking_passengers (booking_id);

CREATE TABLE IF NOT EXISTS payments (
  id         serial PRIMARY KEY,
  booking_id integer NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id    integer REFERENCES profiles(id) ON DELETE SET NULL,
  provider   text NOT NULL DEFAULT 'razorpay',
  order_id   text,
  payment_id text,
  amount     integer NOT NULL,
  currency   text NOT NULL DEFAULT 'INR',
  status     text NOT NULL DEFAULT 'created',
  method     text,
  message    text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_booking_idx ON payments (booking_id);

CREATE TABLE IF NOT EXISTS coupons (
  id            serial PRIMARY KEY,
  code          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  discount_type text NOT NULL DEFAULT 'percent',
  value         integer NOT NULL,
  min_amount    integer NOT NULL DEFAULT 0,
  max_discount  integer NOT NULL DEFAULT 0,
  valid_from    timestamptz,
  valid_until   timestamptz,
  usage_limit   integer NOT NULL DEFAULT 0,
  used_count    integer NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_key ON coupons (code);

CREATE TABLE IF NOT EXISTS reviews (
  id          serial PRIMARY KEY,
  user_id     integer REFERENCES profiles(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  route_label text,
  rating      integer NOT NULL,
  comment     text NOT NULL,
  status      text NOT NULL DEFAULT 'pending',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         serial PRIMARY KEY,
  user_id    integer REFERENCES profiles(id) ON DELETE SET NULL,
  booking_id integer REFERENCES bookings(id) ON DELETE SET NULL,
  channel    text NOT NULL,
  recipient  text NOT NULL,
  subject    text NOT NULL DEFAULT '',
  body       text NOT NULL,
  status     text NOT NULL DEFAULT 'queued',
  error      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS banners (
  id         serial PRIMARY KEY,
  title      text NOT NULL,
  subtitle   text NOT NULL DEFAULT '',
  image_url  text,
  cta_text   text NOT NULL DEFAULT 'Book now',
  cta_link   text NOT NULL DEFAULT '/search',
  active     boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
