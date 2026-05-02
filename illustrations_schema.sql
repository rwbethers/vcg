create table illustrations (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) null,
  prospect_name text not null,
  carrier text not null,
  product_name text not null,
  advisor_name text not null,
  issue_age integer not null,
  face_amount bigint not null,
  annual_prem bigint not null,
  prem_years integer not null default 7,
  illustrated_rate decimal not null default 7.0,
  notes text,
  created_at timestamp with time zone default now()
);

alter table illustrations disable row level security;
grant all on illustrations to anon, authenticated;
