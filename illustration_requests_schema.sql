-- ============================================================
-- Run this in Supabase SQL Editor
-- Illustration Request Automation
-- ============================================================

-- Add policy tracking columns to existing illustrations table
alter table illustrations
  add column if not exists policy_number text,
  add column if not exists carrier_service_email text;

-- Tracks every outbound illustration request sent to a carrier
create table if not exists illustration_requests (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade not null,
  illustration_id uuid references illustrations(id) on delete set null,

  quarter text not null,              -- e.g. "Q2 2026"
  carrier text not null,
  carrier_email text not null,
  policy_number text,
  policy_owner text not null,
  requested_by text not null,         -- advisor email

  email_subject text,
  email_body text,

  -- 'draft' | 'sent' | 'received' | 'uploaded'
  status text not null default 'sent',

  pdf_path text,                      -- Supabase storage path once uploaded
  sent_at timestamptz,
  received_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

alter table illustration_requests disable row level security;
grant all on illustration_requests to anon, authenticated;
