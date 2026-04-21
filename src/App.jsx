-- ============================================================
-- DANSONN FIT — BEREND TRACKER  |  Supabase Schema
-- Plak dit in: Supabase > SQL Editor > New query > Run
-- ============================================================

-- Workouts tabel
create table if not exists workouts (
  id          bigint primary key,
  date        text not null,
  type        text,
  exercises   jsonb default '[]',
  notes       text,
  created_at  timestamptz default now()
);

-- Checkins tabel (één rij per dag, upsert op datum)
create table if not exists checkins (
  date           text primary key,
  gewicht        numeric,
  calorieen      numeric,
  eiwitten       numeric,
  koolhydraten   numeric,
  vetten         numeric,
  water          numeric,
  stappen        numeric,
  opmerkingen    text,
  updated_at     timestamptz default now()
);

-- RLS uitschakelen (privé app, geen auth nodig)
alter table workouts  disable row level security;
alter table checkins  disable row level security;
