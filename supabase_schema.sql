-- ============================================================
-- VCG Client Portal — Full Schema
-- Run this in Supabase SQL Editor
-- ============================================================

drop table if exists action_items cascade;
drop table if exists policies cascade;
drop table if exists clients cascade;

-- ============================================================
-- CLIENTS
-- ============================================================
create table clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text unique not null,
  type text default 'Individual',       -- Individual, Trust, LLC
  advisor text,
  member_since text,
  status text default 'Active',
  address text,
  state text,
  created_at timestamp with time zone default now()
);

-- ============================================================
-- POLICIES
-- ============================================================
create table policies (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,

  -- Identification
  policy_number text,
  carrier text not null,
  product_name text,
  product_type text not null,           -- Whole Life, Term, IUL, FIUL, VUL, Annuity, Premium Finance

  -- People
  insured_name text,                    -- may differ from client
  owner_name text,                      -- may be Trust, LLC, individual
  owner_type text default 'Individual', -- Individual, Trust, LLC, Plan

  -- Issue info
  issue_date date,
  issue_age int,
  issue_state text,
  rate_class text,

  -- Status
  status text default 'Active',         -- Active, Lapsed, Surrendered, Under Review
  status_date date,

  -- Coverage
  face_amount numeric default 0,        -- base face amount
  death_benefit numeric default 0,      -- current total death benefit (includes PUAs, riders)

  -- Values
  cash_value numeric default 0,         -- accumulation / cash value
  loan_balance numeric default 0,
  net_cash_value numeric default 0,     -- cash_value - loan_balance
  available_loan_value numeric default 0,

  -- Premiums
  annual_premium numeric default 0,
  premium_mode text,
  pay_up_date date,

  -- Whole Life specific
  dividend_option text,
  dividend_value numeric default 0,
  mec_status boolean default false,

  -- Premium Finance specific
  finance_amount numeric default 0,
  lender text,
  interest_rate numeric default 0,
  collateral_value numeric default 0,
  renewal_date date,

  -- IUL / FIUL specific
  accumulation_value numeric default 0,
  cash_surrender_value numeric default 0,

  -- Riders (array of strings)
  riders text[],

  -- Performance
  irr numeric,

  -- Data freshness
  last_statement_date date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================================
-- ACTION ITEMS
-- ============================================================
create table action_items (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  label text not null,
  due_date date,
  completed boolean default false,
  priority text default 'normal',       -- normal, high, urgent
  created_at timestamp with time zone default now()
);

-- ============================================================
-- DISABLE RLS (seeding via SQL Editor as postgres superuser)
-- Re-enable with proper policies after auth is wired up
-- ============================================================
alter table clients disable row level security;
alter table policies disable row level security;
alter table action_items disable row level security;

grant select, insert, update, delete on clients to anon, authenticated;
grant select, insert, update, delete on policies to anon, authenticated;
grant select, insert, update, delete on action_items to anon, authenticated;

-- ============================================================
-- SEED DATA — All 9 real VCG clients (A-names zip)
-- Values sourced from carrier documents (2012–2015)
-- Admin should update with current carrier statements
-- ============================================================

insert into clients (name, email, type, advisor, member_since, status, state) values
  ('Jeffrey Adams',        'jeffreyadams@vcgclient.com',     'Individual', 'Stephen Mongie', '2005', 'Active', 'UT'),
  ('Elisabeth Andelin',    'eandelin@vcgclient.com',         'Individual', 'Stephen Mongie', '2012', 'Active', 'CA'),
  ('J. Brandt Anderson',   'brandtanderson@vcgclient.com',   'Individual', 'Stephen Mongie', '2005', 'Active', 'UT'),
  ('Dallin Anderson',      'dallinanderson@vcgclient.com',   'Individual', 'Samuel Noel',    '2009', 'Active', 'UT'),
  ('Elizabeth Anderson',   'elizanderson@vcgclient.com',     'Individual', 'Samuel Noel',    '2009', 'Active', 'UT'),
  ('Gary Applegate',       'gapplegate@vcgclient.com',       'Individual', 'Zach McGlothin', '2018', 'Active', 'UT'),
  ('Shane Atkinson',       'satkinson@vcgclient.com',        'Individual', 'Zach McGlothin', '2008', 'Active', 'UT'),
  ('Teresa Auvaa',         'tauvaa@vcgclient.com',           'Individual', 'Stephen Mongie', '2012', 'Active', 'UT'),
  ('Tui Auvaa',            'tuiauvaa@vcgclient.com',         'Individual', 'Stephen Mongie', '2012', 'Active', 'UT');

-- ============================================================
-- JEFFREY ADAMS — 2 Penn Mutual policies
-- ============================================================
insert into policies (
  client_id, policy_number, carrier, product_name, product_type,
  insured_name, owner_name, owner_type,
  issue_date, issue_age, issue_state, rate_class,
  status, face_amount, death_benefit, cash_value, loan_balance,
  net_cash_value, available_loan_value,
  annual_premium, premium_mode, pay_up_date,
  dividend_option, mec_status,
  riders, last_statement_date
) values (
  (select id from clients where email = 'jeffreyadams@vcgclient.com'),
  '8168145', 'Penn Mutual', 'LifeWise Whole Life', 'Whole Life',
  'Jeffrey T. Adams', 'Jeffrey T. Adams', 'Individual',
  '2005-09-01', 33, 'UT', 'Preferred Non-Tobacco',
  'Active', 1250000, 1265225, 136016, 0,
  136016, 128099,
  14400, 'Monthly', '2072-09-01',
  'Paid-Up Additions', false,
  array['Disability Waiver of Premium'], '2015-12-08'
),
(
  (select id from clients where email = 'jeffreyadams@vcgclient.com'),
  '8172661', 'Penn Mutual', 'Traditional Renewable Term', 'Term',
  'Jeffrey T. Adams', 'Jeffrey T. Adams', 'Individual',
  '2005-09-15', 33, 'UT', 'Preferred Non-Tobacco',
  'Active', 1350000, 1350000, 0, 0,
  0, 0,
  600, 'Monthly', null,
  null, false,
  null, '2014-09-15'
);

-- ============================================================
-- ELISABETH ANDELIN — Penn Mutual WL (active) + Allianz FIUL (surrendered)
-- ============================================================
insert into policies (
  client_id, policy_number, carrier, product_name, product_type,
  insured_name, owner_name, owner_type,
  issue_date, issue_age, issue_state, rate_class,
  status, status_date,
  face_amount, death_benefit, cash_value, loan_balance,
  net_cash_value,
  annual_premium, premium_mode, pay_up_date,
  dividend_option, dividend_value, mec_status,
  riders, last_statement_date
) values (
  (select id from clients where email = 'eandelin@vcgclient.com'),
  '8307286', 'Penn Mutual', 'Flexible Choice Whole Life', 'Whole Life',
  'Elisabeth M. Andelin', 'Malia Andelin Rev Trust DTD 10-24-13', 'Trust',
  '2012-09-03', 31, 'UT', 'Preferred Non-Tobacco',
  'Active', null,
  6687552, 7384336, 197954, 0,
  197954,
  69751, 'Annual', '2065-09-03',
  'Paid-Up Additions', 9926, false,
  array['Overloan Protection Agreement','Enhanced Permanent Paid-Up Additions Agreement','Accelerated Death Benefit Agreement'],
  '2015-09-03'
),
(
  (select id from clients where email = 'eandelin@vcgclient.com'),
  '60063489', 'Allianz', 'Life Pro+® Fixed Index UL', 'FIUL',
  'Elisabeth M. Andelin', 'Poinsettia Avenue Properties, LLC', 'LLC',
  '2013-06-11', 31, 'UT', 'Preferred Plus Nontobacco',
  'Surrendered', '2023-03-13',
  13859890, 0, 0, 0,
  0,
  297166, 'Annual', null,
  null, 0, false,
  array['Inflation Protection Rider','Loan Protection Rider','Premium Deposit Fund Rider'],
  '2023-03-13'
);

-- ============================================================
-- J. BRANDT ANDERSON — BLIC term (lapsed) + Penn VUL
-- ============================================================
insert into policies (
  client_id, policy_number, carrier, product_name, product_type,
  insured_name, owner_name, owner_type,
  issue_date, issue_age, issue_state, rate_class,
  status, status_date,
  face_amount, death_benefit, cash_value, loan_balance, net_cash_value,
  annual_premium, premium_mode,
  riders, last_statement_date
) values (
  (select id from clients where email = 'brandtanderson@vcgclient.com'),
  '2203477', 'BLIC / Banner Life', 'Beneficial Term 30', 'Term',
  'J. Brandt Andersen', 'USight Employee Welfare Benefit Plan and Trust', 'Plan',
  '2008-05-07', 30, 'UT', 'Elite',
  'Lapsed', '2010-10-07',
  0, 0, 0, 0, 0,
  16675, 'Annual',
  null, '2010-10-07'
),
(
  (select id from clients where email = 'brandtanderson@vcgclient.com'),
  '8573484', 'Penn Mutual', 'Variable Universal Life', 'VUL',
  'J. Brandt Andersen', 'J. Brandt Andersen', 'Individual',
  '2005-01-01', 27, 'UT', 'Preferred Non-Tobacco',
  'Active', null,
  0, 0, 0, 0, 0,
  0, 'Quarterly',
  null, '2008-05-30'
);

-- ============================================================
-- DALLIN ANDERSON — Pacific Life (lapsed)
-- ============================================================
insert into policies (
  client_id, policy_number, carrier, product_name, product_type,
  insured_name, owner_name, owner_type,
  issue_date, issue_state,
  status, status_date,
  face_amount, death_benefit, cash_value, loan_balance, net_cash_value,
  annual_premium,
  last_statement_date
) values (
  (select id from clients where email = 'dallinanderson@vcgclient.com'),
  'VF52976110', 'Pacific Life', 'Pacific Life IUL', 'IUL',
  'Dallin M. Anderson', 'Dallin M. Anderson', 'Individual',
  '2016-07-07', 'UT',
  'Lapsed', '2017-03-06',
  0, 0, 0, 0, 0,
  0,
  '2017-03-06'
);

-- ============================================================
-- TERESA AUVAA — Penn Mutual Term
-- ============================================================
insert into policies (
  client_id, policy_number, carrier, product_name, product_type,
  insured_name, owner_name, owner_type,
  issue_date, issue_age, issue_state,
  status,
  face_amount, death_benefit, cash_value, loan_balance, net_cash_value,
  annual_premium, premium_mode,
  last_statement_date
) values (
  (select id from clients where email = 'tauvaa@vcgclient.com'),
  '8292479', 'Penn Mutual', 'Traditional Renewable Term', 'Term',
  'Teresa Auvaa', 'Teresa Auvaa', 'Individual',
  '2012-06-19', 38, 'UT',
  'Active',
  1000000, 1000000, 0, 0, 0,
  397, 'Monthly',
  '2014-06-19'
);

-- ============================================================
-- TUI AUVAA — Penn Mutual Flexible Choice Whole Life (large)
-- ============================================================
insert into policies (
  client_id, policy_number, carrier, product_name, product_type,
  insured_name, owner_name, owner_type,
  issue_date, issue_age, issue_state,
  status,
  face_amount, death_benefit, cash_value, loan_balance,
  net_cash_value,
  annual_premium, premium_mode, pay_up_date,
  dividend_option, dividend_value, mec_status,
  riders, last_statement_date
) values (
  (select id from clients where email = 'tuiauvaa@vcgclient.com'),
  '8292468', 'Penn Mutual', 'Flexible Choice Whole Life', 'Whole Life',
  'Tui W. Auvaa', 'Tui W. Auvaa', 'Individual',
  '2012-06-19', 35, 'UT',
  'Active',
  3041798, 3039132, 2991, 2666,
  325,
  15871, 'Quarterly', '2105-06-19',
  'Paid-Up Additions', 70, false,
  array['Overloan Protection Agreement','Flexible Protection Agreement','Accelerated Benefit - Chronic Illness','Accelerated Death Benefit Agreement'],
  '2014-06-19'
);

-- ============================================================
-- ACTION ITEMS — sample upcoming tasks per client
-- ============================================================
insert into action_items (client_id, label, due_date, priority) values
  ((select id from clients where email = 'jeffreyadams@vcgclient.com'),
   'Annual policy review — Penn 8168145', '2026-09-01', 'normal'),
  ((select id from clients where email = 'jeffreyadams@vcgclient.com'),
   'Request inforce illustration from Penn Mutual', '2026-06-01', 'high'),
  ((select id from clients where email = 'eandelin@vcgclient.com'),
   'Annual policy review — Penn 8307286', '2026-09-03', 'normal'),
  ((select id from clients where email = 'eandelin@vcgclient.com'),
   'Request updated inforce illustration', '2026-05-15', 'high'),
  ((select id from clients where email = 'tuiauvaa@vcgclient.com'),
   'Annual policy review — Penn 8292468', '2026-06-19', 'normal'),
  ((select id from clients where email = 'tuiauvaa@vcgclient.com'),
   'Review loan balance on Penn 8292468', '2026-05-01', 'high'),
  ((select id from clients where email = 'tauvaa@vcgclient.com'),
   'Term policy review — conversion options', '2026-06-19', 'normal');
