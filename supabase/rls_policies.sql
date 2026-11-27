-- ---------------------------------------------------------------------------
-- Utkal Yatra — Row Level Security policies for Supabase-hosted databases.
-- Apply AFTER supabase/schema.sql, in the Supabase SQL editor.
--
-- The Express API connects with the database owner role and is not affected
-- by these policies; they protect the tables when they are reached through
-- Supabase's PostgREST API with a user JWT (anon or authenticated).
-- ---------------------------------------------------------------------------

-- Helper: is the current JWT an administrator?
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (select p.role = 'admin' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Enable RLS everywhere.
alter table public.profiles            enable row level security;
alter table public.bus_operators       enable row level security;
alter table public.buses               enable row level security;
alter table public.routes              enable row level security;
alter table public.trips               enable row level security;
alter table public.bus_seats           enable row level security;
alter table public.boarding_points     enable row level security;
alter table public.dropping_points     enable row level security;
alter table public.bookings            enable row level security;
alter table public.booking_passengers  enable row level security;
alter table public.payments            enable row level security;
alter table public.coupons             enable row level security;
alter table public.reviews             enable row level security;
alter table public.notifications       enable row level security;
alter table public.banners             enable row level security;
alter table public.site_settings       enable row level security;

-- profiles: a customer reads and updates only their own row; admins read all.
create policy "profiles self read" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles self update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles admin write" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- Public catalogue: readable by everyone, writable by admins only.
create policy "operators public read" on public.bus_operators
  for select using (true);
create policy "operators admin write" on public.bus_operators
  for all using (public.is_admin()) with check (public.is_admin());

create policy "buses public read" on public.buses
  for select using (true);
create policy "buses admin write" on public.buses
  for all using (public.is_admin()) with check (public.is_admin());

create policy "routes public read" on public.routes
  for select using (true);
create policy "routes admin write" on public.routes
  for all using (public.is_admin()) with check (public.is_admin());

create policy "trips public read" on public.trips
  for select using (true);
create policy "trips admin write" on public.trips
  for all using (public.is_admin()) with check (public.is_admin());

create policy "boarding points public read" on public.boarding_points
  for select using (true);
create policy "boarding points admin write" on public.boarding_points
  for all using (public.is_admin()) with check (public.is_admin());

create policy "dropping points public read" on public.dropping_points
  for select using (true);
create policy "dropping points admin write" on public.dropping_points
  for all using (public.is_admin()) with check (public.is_admin());

-- Seat maps are publicly readable (live availability) but only the API/admin
-- may change seat state.
create policy "seats public read" on public.bus_seats
  for select using (true);
create policy "seats admin write" on public.bus_seats
  for all using (public.is_admin()) with check (public.is_admin());

-- bookings: customers see only their own bookings; admins see everything.
create policy "bookings owner read" on public.bookings
  for select using (user_id = auth.uid() or public.is_admin());
create policy "bookings owner insert" on public.bookings
  for insert with check (user_id = auth.uid());
create policy "bookings admin write" on public.bookings
  for all using (public.is_admin()) with check (public.is_admin());

create policy "passengers owner read" on public.booking_passengers
  for select using (
    exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid())
    or public.is_admin()
  );
create policy "passengers owner insert" on public.booking_passengers
  for insert with check (
    exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid())
    or public.is_admin()
  );
create policy "passengers admin write" on public.booking_passengers
  for all using (public.is_admin()) with check (public.is_admin());

-- payments are written by the server only; customers may read their own.
create policy "payments owner read" on public.payments
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid())
    or public.is_admin()
  );
create policy "payments admin write" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

-- coupons: active coupons are public so the payment page can validate them.
create policy "coupons public read" on public.coupons
  for select using (active = true or public.is_admin());
create policy "coupons admin write" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

-- reviews: approved reviews are public; authors may submit their own.
create policy "reviews public read" on public.reviews
  for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "reviews owner insert" on public.reviews
  for insert with check (user_id = auth.uid());
create policy "reviews admin write" on public.reviews
  for all using (public.is_admin()) with check (public.is_admin());

-- notifications and banners/settings are admin-only (banners read publicly).
create policy "notifications owner read" on public.notifications
  for select using (user_id = auth.uid() or public.is_admin());
create policy "notifications admin write" on public.notifications
  for all using (public.is_admin()) with check (public.is_admin());

create policy "banners public read" on public.banners
  for select using (active = true or public.is_admin());
create policy "banners admin write" on public.banners
  for all using (public.is_admin()) with check (public.is_admin());

create policy "settings public read" on public.site_settings
  for select using (true);
create policy "settings admin write" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());
