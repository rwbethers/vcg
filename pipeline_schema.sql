-- Add stage to clients table
alter table clients add column if not exists stage text default 'client';
update clients set stage = 'client' where stage is null;

-- Underwriting / prospect task checklists
create table if not exists underwriting_tasks (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade not null,
  label text not null,
  category text default 'General',
  sort_order integer default 0,
  completed boolean default false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

alter table underwriting_tasks disable row level security;
grant all on underwriting_tasks to anon, authenticated;
