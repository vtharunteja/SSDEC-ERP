create table if not exists quotations (
  id uuid default gen_random_uuid() primary key,
  quoteno text unique,
  buyer text,
  party text,
  quote_kind text,
  product text,
  qty numeric default 0,
  price numeric default 0,
  items_json text,
  enquiry_ref text,
  date date,
  valid_until date,
  submission_date date,
  submission_mode text,
  submission_notes text,
  followup_date date,
  followup_owner text,
  followup_notes text,
  notes text,
  status text default 'Draft',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists quotations
  add column if not exists quote_kind text,
  add column if not exists items_json text;

alter table quotations enable row level security;

drop policy if exists "auth_all" on quotations;
create policy "auth_all" on quotations for all using (auth.role() = 'authenticated');
