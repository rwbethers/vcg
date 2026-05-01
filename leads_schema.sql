-- ============================================================
-- LEADS / PIPELINE — Run this in Supabase SQL Editor
-- ============================================================

drop table if exists leads cascade;

create table leads (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text,
  phone text,
  source text default 'Referral',
  stage text default 'Prospect',
  assigned_to text,
  potential_premium numeric default 0,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table leads disable row level security;
grant select, insert, update, delete on leads to anon, authenticated;

-- Seed some example leads
insert into leads (name, email, phone, source, stage, assigned_to, potential_premium, notes) values
('Michael Torres', 'mtorres@email.com', '(801) 555-0192', 'Referral', 'Meeting Set', 'Stephen Mongie', 15000, 'Referred by Jeffrey Adams. Interested in whole life + premium finance.'),
('Rachel Kim', 'rkim@email.com', '(702) 555-0341', 'Website', 'Contacted', 'Samuel Noel', 8400, 'Inquired about IUL for retirement income planning.'),
('David Okafor', 'dokafor@email.com', '(435) 555-0287', 'Referral', 'Proposal Sent', 'Stephen Mongie', 24000, 'Business owner. Looking at key-man coverage + personal whole life.'),
('Sarah Mitchell', 'smitchell@email.com', '(480) 555-0514', 'Event', 'Prospect', 'Zach McGlothin', 6000, 'Met at estate planning seminar. Follow up scheduled.'),
('James Whitfield', 'jwhitfield@email.com', '(801) 555-0763', 'Referral', 'Closed Won', 'Stephen Mongie', 18000, 'Closed whole life policy. Penn Mutual. Annual premium $18K.'),
('Linda Chao', 'lchao@email.com', '(602) 555-0198', 'Cold Outreach', 'Contacted', 'Samuel Noel', 5200, 'Spoke briefly. Interested but needs more education on IUL.'),
('Brandon Reeves', 'breeves@email.com', '(385) 555-0447', 'Referral', 'Meeting Set', 'Zach McGlothin', 9600, 'Young professional. Term conversion candidate.');
