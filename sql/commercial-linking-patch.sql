alter table if exists work_orders
  add column if not exists order_type text default 'In-house',
  add column if not exists vendor text,
  add column if not exists service_details text,
  add column if not exists output_required text;

alter table if exists vendors
  add column if not exists entity_type text default 'Vendor',
  add column if not exists address text;

alter table if exists sales_orders
  add column if not exists buyer text,
  add column if not exists gst text,
  add column if not exists shipping_addr text;

alter table if exists invoices
  add column if not exists company text,
  add column if not exists buyer text,
  add column if not exists customer_gst text,
  add column if not exists bill_to_same boolean default true,
  add column if not exists billing_addr text,
  add column if not exists shipping_addr text,
  add column if not exists items_json text;

create table if not exists inward_bills (
  id uuid default gen_random_uuid() primary key,
  bill_no text unique,
  vendor text,
  po_ref text,
  vendor_gst text,
  amt numeric default 0,
  gst numeric default 18,
  total numeric default 0,
  date date,
  due date,
  status text default 'Pending',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table inward_bills enable row level security;

drop policy if exists "auth_all" on inward_bills;
create policy "auth_all" on inward_bills for all using (auth.role() = 'authenticated');

create table if not exists buyers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  code text,
  contact text,
  phone text,
  email text,
  gst text,
  terms text,
  address text,
  status text default 'Active',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists company_details (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  short_name text,
  gst text,
  pan text,
  msme text,
  contact text,
  phone text,
  email text,
  state_code text,
  esi_no text,
  epfo_no text,
  cin_no text,
  iec_code text,
  bank_name text,
  account_name text,
  account_number text,
  ifsc_code text,
  branch_name text,
  upi_id text,
  other_registrations text,
  address text,
  status text default 'Active',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists company_details
  add column if not exists pan text,
  add column if not exists msme text,
  add column if not exists esi_no text,
  add column if not exists epfo_no text,
  add column if not exists cin_no text,
  add column if not exists iec_code text,
  add column if not exists bank_name text,
  add column if not exists account_name text,
  add column if not exists account_number text,
  add column if not exists ifsc_code text,
  add column if not exists branch_name text,
  add column if not exists upi_id text,
  add column if not exists other_registrations text;

alter table buyers enable row level security;
alter table company_details enable row level security;

drop policy if exists "auth_all" on buyers;
drop policy if exists "auth_all" on company_details;
create policy "auth_all" on buyers for all using (auth.role() = 'authenticated');
create policy "auth_all" on company_details for all using (auth.role() = 'authenticated');
