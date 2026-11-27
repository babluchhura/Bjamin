-- ============================================================================
-- Bolangir Jamin — Complete Supabase SQL Schema, RLS Policies & Storage
-- Run this entire script inside your Supabase Dashboard -> SQL Editor.
-- ============================================================================

-- 1. Enable UUID extension
create extension if not exists "pgcrypto";

-- 2. Profiles / Admin Roles Table (linked to Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

-- Automatically create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper function to check if current user is an admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 3. Plots Table
create table if not exists public.plots (
  id bigint generated always as identity primary key,
  plot_code text not null unique,
  name text not null,
  location text not null,
  total_area text not null,
  area_decimals double precision not null check (area_decimals > 0),
  dimensions text not null,
  price integer not null check (price >= 0),
  price_per_decimal integer not null check (price_per_decimal >= 0),
  road_access text not null,
  description text not null,
  status text not null default 'Available' check (status in ('Available', 'Reserved', 'Sold')),
  featured boolean not null default false,
  latitude double precision not null,
  longitude double precision not null,
  google_maps_url text not null,
  images jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Customer Inquiries Table
create table if not exists public.inquiries (
  id bigint generated always as identity primary key,
  plot_id bigint references public.plots(id) on delete set null,
  plot_name text,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  message text not null,
  status text not null default 'New' check (status in ('New', 'Contacted', 'Closed')),
  created_at timestamptz not null default now()
);

-- 5. Site Visit Bookings Table
create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  plot_id bigint references public.plots(id) on delete set null,
  plot_name text,
  visitor_name text not null,
  visitor_email text not null,
  visitor_phone text not null,
  preferred_date text not null,
  preferred_time text not null,
  guests_count integer not null default 1 check (guests_count between 1 and 20),
  notes text,
  status text not null default 'Pending' check (status in ('Pending', 'Confirmed', 'Completed', 'Cancelled')),
  created_at timestamptz not null default now()
);

-- 6. Customer Reviews Table
create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  customer_name text not null,
  customer_role text not null,
  rating integer not null default 5 check (rating between 1 and 5),
  comment text not null,
  plot_purchased text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

-- 7. Website Content / Site Settings Table
create table if not exists public.site_settings (
  id bigint generated always as identity primary key,
  key text not null unique,
  value text not null,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Enable Row Level Security (RLS) on ALL tables
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.plots enable row level security;
alter table public.inquiries enable row level security;
alter table public.site_visits enable row level security;
alter table public.reviews enable row level security;
alter table public.site_settings enable row level security;

-- Profiles RLS
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Only admins can update roles"
  on public.profiles for update
  using (public.is_admin());

-- Plots RLS (Public read, Admin write)
create policy "Anyone can view plots"
  on public.plots for select
  using (true);

create policy "Only admins can insert plots"
  on public.plots for insert
  with check (public.is_admin());

create policy "Only admins can update plots"
  on public.plots for update
  using (public.is_admin());

create policy "Only admins can delete plots"
  on public.plots for delete
  using (public.is_admin());

-- Inquiries RLS (Public insert, Admin read/update/delete)
create policy "Anyone can submit an inquiry"
  on public.inquiries for insert
  with check (true);

create policy "Only admins can view inquiries"
  on public.inquiries for select
  using (public.is_admin());

create policy "Only admins can update inquiries"
  on public.inquiries for update
  using (public.is_admin());

create policy "Only admins can delete inquiries"
  on public.inquiries for delete
  using (public.is_admin());

-- Site Visits RLS (Public insert, Admin read/update/delete)
create policy "Anyone can book a site visit"
  on public.site_visits for insert
  with check (true);

create policy "Only admins can view site visits"
  on public.site_visits for select
  using (public.is_admin());

create policy "Only admins can update site visits"
  on public.site_visits for update
  using (public.is_admin());

create policy "Only admins can delete site visits"
  on public.site_visits for delete
  using (public.is_admin());

-- Reviews RLS (Public reads published reviews & can submit; Admin moderates)
create policy "Anyone can view published reviews"
  on public.reviews for select
  using (is_published = true or public.is_admin());

create policy "Anyone can submit a review"
  on public.reviews for insert
  with check (true);

create policy "Only admins can update reviews"
  on public.reviews for update
  using (public.is_admin());

create policy "Only admins can delete reviews"
  on public.reviews for delete
  using (public.is_admin());

-- Site Settings RLS (Public read, Admin write)
create policy "Anyone can read site settings"
  on public.site_settings for select
  using (true);

create policy "Only admins can manage site settings"
  on public.site_settings for all
  using (public.is_admin());

-- ============================================================================
-- Supabase Storage Bucket & Policies for Plot Images
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('plot-images', 'plot-images', true)
on conflict (id) do nothing;

create policy "Public read access for plot images"
  on storage.objects for select
  using (bucket_id = 'plot-images');

create policy "Only admins can upload plot images"
  on storage.objects for insert
  with check (bucket_id = 'plot-images' and public.is_admin());

create policy "Only admins can delete plot images"
  on storage.objects for delete
  using (bucket_id = 'plot-images' and public.is_admin());

-- 8. Uploaded Media Table (matches app /api/media endpoint)
create table if not exists public.media_uploads (
  id bigint generated always as identity primary key,
  filename text not null,
  mime_type text not null,
  data_base64 text not null,
  created_at timestamptz not null default now()
);

alter table public.media_uploads enable row level security;

create policy "Anyone can view uploaded media"
  on public.media_uploads for select
  using (true);

create policy "Only admins can upload media"
  on public.media_uploads for insert
  with check (public.is_admin());

create policy "Only admins can delete media"
  on public.media_uploads for delete
  using (public.is_admin());

-- ============================================================================
-- Admin Setup for Live Deployment:
-- 1. In Supabase Dashboard -> Authentication -> Users -> "Add user", create
--    your admin account using your Email and Password.
-- 2. Run the query below (replacing with your admin email) to grant admin role:
--    update public.profiles set role = 'admin' where email = 'your@email.com';
-- 3. In your backend hosting environment (.env), set:
--    DATABASE_URL="<your Supabase Postgres URI>"
--    SUPABASE_URL="https://<your-project>.supabase.co"
--    SUPABASE_ANON_KEY="<your-supabase-anon-key>"
--    ADMIN_EMAIL="your@email.com"
-- ============================================================================
