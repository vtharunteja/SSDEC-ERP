alter table if exists work_orders
  add column if not exists order_type text default 'In-house',
  add column if not exists vendor text,
  add column if not exists service_details text;

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
