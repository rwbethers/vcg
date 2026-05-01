-- ============================================================
-- PRIVATE MARKETS — Run this in Supabase SQL Editor
-- ============================================================

drop table if exists deal_interest cascade;
drop table if exists deals cascade;

create table deals (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  asset_class text not null,
  description text,
  target_return text,
  minimum_investment numeric,
  term text,
  status text default 'Accepting Interest',
  location text,
  sponsor text,
  highlights text[],
  image_url text,
  created_at timestamp with time zone default now()
);

create table deal_interest (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references deals(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  client_email text,
  client_name text,
  deal_title text,
  asset_class text,
  created_at timestamp with time zone default now(),
  unique(deal_id, client_id)
);

alter table deals disable row level security;
alter table deal_interest disable row level security;
grant select, insert, update, delete on deals to anon, authenticated;
grant select, insert, update, delete on deal_interest to anon, authenticated;

-- ============================================================
-- SEED DEALS WITH IMAGES
-- ============================================================

insert into deals (title, asset_class, description, target_return, minimum_investment, term, status, location, sponsor, highlights, image_url) values

(
  'Sunbelt Multifamily Fund III',
  'Real Estate',
  'Value-add multifamily acquisitions across high-growth markets in Texas, Arizona, and Florida. Fund targets underperforming Class B properties with strong rent growth potential.',
  '14–18% IRR',
  50000,
  '5 years',
  'Accepting Interest',
  'Austin, TX · Phoenix, AZ · Tampa, FL',
  'Vision Capital Group',
  array['Quarterly cash distributions','Value-add repositioning strategy','Tax-advantaged via depreciation','Target 1.8–2.2x equity multiple'],
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80'
),

(
  'Medical Office Portfolio',
  'Real Estate',
  'Acquisition of Class A medical office buildings anchored by regional hospital systems. Long-term NNN leases provide stable, predictable income with minimal landlord obligations.',
  '9–11% IRR',
  100000,
  '7 years',
  'Accepting Interest',
  'Salt Lake City, UT',
  'Vision Capital Group',
  array['NNN leases — tenants pay all expenses','Hospital-anchored tenants','Monthly distributions','Low volatility income strategy'],
  'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&q=80'
),

(
  'Industrial Logistics Center',
  'Real Estate',
  'Ground-up development of a 280,000 sq ft last-mile logistics facility in a high-demand infill market. Pre-leased to a national e-commerce operator before construction.',
  '16–20% IRR',
  75000,
  '3–4 years',
  'Coming Soon',
  'Las Vegas, NV',
  'Vision Capital Group',
  array['Pre-leased to national tenant','Infill location — limited competing supply','Development upside','Target 2.0–2.5x equity multiple'],
  'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&q=80'
),

(
  'Lower Middle Market Buyout Fund',
  'Private Equity',
  'Acquisitions of profitable, cash-flowing businesses with $3–15M EBITDA in fragmented industries. Focus on business services, healthcare services, and specialty manufacturing.',
  '20–25% IRR',
  250000,
  '7–10 years',
  'Accepting Interest',
  'United States',
  'Vision Capital Group',
  array['Control buyouts of proven businesses','Operational value creation post-acquisition','Diversified across 8–12 companies','Annual K-1 tax reporting'],
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80'
),

(
  'Healthcare Services Roll-Up',
  'Private Equity',
  'Platform acquisition strategy targeting outpatient physical therapy and specialty care clinics. Consolidating a highly fragmented sector with strong demographic tailwinds.',
  '22–28% IRR',
  100000,
  '5–7 years',
  'Accepting Interest',
  'Southwest United States',
  'Vision Capital Group',
  array['Defensive sector — recession resistant','Aging population demographic tailwind','Management retained post-acquisition','Exit via strategic sale or IPO'],
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80'
),

(
  'Senior Secured Lending Fund',
  'Private Credit',
  'Direct lending to established middle-market companies. First-lien senior secured loans with floating rate coupons — investors benefit as rates rise.',
  '10–13% net yield',
  50000,
  '3 years',
  'Accepting Interest',
  'United States',
  'Vision Capital Group',
  array['Floating rate — benefits from rising rates','First-lien senior secured position','Quarterly interest distributions','Short duration — lower risk profile'],
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80'
),

(
  'Real Estate Bridge Lending',
  'Private Credit',
  'Short-term bridge loans to experienced real estate sponsors. Collateralized by first-lien deeds of trust at 65% LTV or lower — significant equity cushion protects investors.',
  '11–14% net yield',
  25000,
  '12–24 months',
  'Accepting Interest',
  'Western United States',
  'Vision Capital Group',
  array['65% LTV or lower — significant equity cushion','Monthly interest payments','Short duration — quick capital return','Collateralized by real property'],
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80'
),

(
  'Concentrated Value Portfolio',
  'Equities',
  'Separately managed account holding 12–18 high-conviction value positions. Full transparency — you see every holding. Managed by VCG''s equity research team with quarterly advisor reviews.',
  '15–20% annually',
  250000,
  'Liquid',
  'Accepting Interest',
  'United States',
  'Vision Capital Group',
  array['Concentrated high-conviction portfolio','Quarterly strategy review with your advisor','Tax-loss harvesting included','Full transparency — see every holding'],
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80'
),

(
  'Dividend Growth Portfolio',
  'Equities',
  'Separately managed account focused on companies with consistent dividend growth. Designed for clients seeking rising income with inflation protection and lower volatility.',
  '8–12% total return',
  100000,
  'Liquid',
  'Coming Soon',
  'United States',
  'Vision Capital Group',
  array['Quarterly dividend income paid to account','Companies with 10+ years dividend growth','Lower volatility than broad market','ESG screening available on request'],
  'https://images.unsplash.com/photo-1642790551116-18a150d975f6?w=800&q=80'
);
