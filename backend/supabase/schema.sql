-- GeoRock AI — Supabase schema. Run once in: Supabase Dashboard > SQL Editor.
-- RLS is ENABLED and NO public policies are created, so the public (anon) key
-- cannot read or write anything. Only the backend's service-role key can.

create table if not exists public.predictions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  model_used text not null,
  probability double precision not null,
  risk_level text not null,
  status_text text,
  rainfall_mm double precision,
  pore_water_pressure_kpa double precision,
  rock_displacement_mm double precision,
  displacement_rate_mm_day double precision,
  crack_width_mm double precision,
  crack_growth_rate_mm_day double precision,
  vibration_ppv_mm_s double precision,
  slope_angle_deg double precision,
  rock_mass_rating_rmr double precision,
  temperature_c double precision,
  humidity_pct double precision,
  primary_factors jsonb not null default '[]'::jsonb
);

create table if not exists public.alerts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  severity text not null,
  probability double precision not null default 0,
  message text not null,
  advisory text not null default '',
  acknowledged boolean not null default false
);

create table if not exists public.field_observations (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  operator_id text not null,
  mission_ref text,
  sector text not null,
  observed_crack_width_mm double precision,
  observed_rainfall_mm_h double precision,
  lat double precision not null,
  lon double precision not null,
  severity text not null check (severity in ('none','minor','moderate','severe','critical')),
  notes text,
  relay_to_control boolean not null default false,
  ip_hash text            -- salted SHA-256, never the raw IP address
);

create index if not exists predictions_created_idx on public.predictions (created_at desc);
create index if not exists alerts_created_idx on public.alerts (created_at desc);
create index if not exists observations_created_idx on public.field_observations (created_at desc);

alter table public.predictions enable row level security;
alter table public.alerts enable row level security;
alter table public.field_observations enable row level security;
-- (intentionally no "create policy" statements)
