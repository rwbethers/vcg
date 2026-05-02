-- ============================================================
-- ANNOUNCEMENTS — Run this in Supabase SQL Editor
-- ============================================================

drop table if exists announcements cascade;

create table announcements (
  id uuid default gen_random_uuid() primary key,
  message text not null,
  type text default 'info', -- 'info', 'warning', 'success'
  active boolean default true,
  created_at timestamp with time zone default now()
);

alter table announcements disable row level security;
grant select, insert, update, delete on announcements to anon, authenticated;
