-- ============================================================
-- GOALS — Run this in Supabase SQL Editor
-- ============================================================

drop table if exists goals cascade;

create table goals (
  id uuid default gen_random_uuid() primary key,
  metric text not null unique,
  target numeric not null,
  period text default '2026',
  updated_at timestamp with time zone default now()
);

alter table goals disable row level security;
grant select, insert, update, delete on goals to anon, authenticated;

insert into goals (metric, target, period) values
('Annual Premium Revenue',  150000, '2026'),
('New Clients',              12,     '2026'),
('Closed Deals (Pipeline)',  8,      '2026'),
('Deal Interest Requests',   25,     '2026'),
('Pipeline Value',           200000, '2026');
