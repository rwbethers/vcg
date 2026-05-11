-- ============================================================
-- Run this in Supabase SQL Editor
-- ============================================================

-- Illustrations table (plan benchmarks)
create table if not exists illustrations (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  prospect_name text not null,
  carrier text not null,
  product_name text not null,
  advisor_name text not null,
  issue_age integer not null,
  face_amount bigint not null,
  annual_prem bigint not null,
  prem_years integer not null default 7,
  illustrated_rate decimal not null default 7.0,
  start_date date,
  notes text,
  created_at timestamp with time zone default now()
);

alter table illustrations disable row level security;
grant all on illustrations to anon, authenticated;

-- Policy reviews table (logged check-ins against illustration benchmarks)
create table if not exists policy_reviews (
  id uuid default gen_random_uuid() primary key,
  illustration_id uuid references illustrations(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade not null,
  review_type text not null default 'weekly',   -- 'weekly' | 'monthly' | 'quarterly'
  reviewed_by text not null,
  actual_cash_value numeric,
  actual_death_benefit numeric,
  on_track boolean default true,
  notes text,
  action_items text,
  index_notes text,
  premium_finance_notes text,
  reviewed_at timestamp with time zone default now()
);

alter table policy_reviews disable row level security;
grant all on policy_reviews to anon, authenticated;

-- Quarterly decks table (carrier illustration uploads → client-facing reports)
create table if not exists quarterly_decks (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade not null,
  quarter text not null,                    -- e.g. "Q1 2026"
  quarter_end_date date not null,

  -- Illustration baseline (what was originally projected)
  face_amount bigint,
  annual_prem bigint,
  prem_years integer default 7,
  illustrated_rate decimal default 7.0,
  issue_age integer,
  policy_start_date date,

  -- Actual numbers from carrier illustration
  actual_cash_value numeric,
  actual_death_benefit numeric,
  actual_premiums_paid numeric,

  -- Index performance this quarter
  index_used text,
  index_return_pct decimal,
  cap_rate_pct decimal,
  floor_rate_pct decimal,

  -- Advisor-authored content
  market_commentary text,
  policy_notes text,
  action_items text,           -- newline-separated list

  -- Attached carrier PDF (path in client-documents storage bucket)
  pdf_path text,

  -- Publishing
  status text default 'draft',  -- 'draft' | 'published'
  published_at timestamp with time zone,
  created_by text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table quarterly_decks disable row level security;
grant all on quarterly_decks to anon, authenticated;

-- If the tables already exist, add missing columns without breaking anything:
alter table illustrations add column if not exists start_date date;

alter table policy_reviews
  add column if not exists action_items text,
  add column if not exists index_notes text,
  add column if not exists premium_finance_notes text;
