-- ============================================================
-- DOCUMENTS — Run this in Supabase SQL Editor
-- ============================================================

drop table if exists documents cascade;

create table documents (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  category text default 'Other',
  uploaded_by text not null, -- 'advisor' or 'client'
  uploaded_by_name text,
  created_at timestamp with time zone default now()
);

alter table documents disable row level security;
grant select, insert, update, delete on documents to anon, authenticated;

-- ============================================================
-- STORAGE BUCKET — also run this
-- ============================================================

insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', false)
on conflict (id) do nothing;

create policy "Full access to client-documents"
  on storage.objects for all
  using (bucket_id = 'client-documents')
  with check (bucket_id = 'client-documents');
