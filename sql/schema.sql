-- ═══════════════════════════════════════════════════════
-- EIPD ERP — Supabase Database Schema
-- Run this entire file in Supabase SQL Editor
-- Dashboard → SQL Editor → New query → Paste → Run
-- ═══════════════════════════════════════════════════════

-- ── PROFILES (extends Supabase auth.users) ──────────────
create table if not exists profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  name        text,
  email       text,
  role        text default 'viewer',
  dept        text,
  phone       text,
  empid       text,
  active      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── PRODUCTS ────────────────────────────────────────────
create table if not exists products (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  code        text,
  description text,
  unit        text default 'pcs',
  price       numeric default 0,
  category    text,
  hsn         text,
  gst         numeric default 18,
  active      boolean default true,
  notes       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── MACHINES ────────────────────────────────────────────
create table if not exists machines (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  eqid        text,
  model       text,
  status      text default 'Idle',
  oee         numeric default 0,
  param       text,
  notes       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── INVENTORY ───────────────────────────────────────────
create table if not exists inventory (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  code        text,
  unit        text default 'kg',
  stock       numeric default 0,
  reorder     numeric default 0,
  min         numeric default 0,
  cost        numeric default 0,
  supplier    text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── WORK ORDERS ─────────────────────────────────────────
create table if not exists work_orders (
  id          uuid default gen_random_uuid() primary key,
  wono        text unique,
  product     text,
  order_type  text default 'In-house',
  vendor      text,
  service_details text,
  qty         numeric default 0,
  produced    numeric default 0,
  start_date  date,
  end_date    date,
  priority    text default 'Normal',
  shift       text,
  status      text default 'Queued',
  remarks     text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── QC RECORDS ──────────────────────────────────────────
create table if not exists qc_records (
  id          uuid default gen_random_uuid() primary key,
  batchid     text,
  wo          text,
  product     text,
  sample      numeric default 0,
  pass        numeric default 0,
  test        text,
  inspector   text,
  notes       text,
  date        date default current_date,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── PURCHASE ORDERS ─────────────────────────────────────
create table if not exists purchase_orders (
  id          uuid default gen_random_uuid() primary key,
  pono        text unique,
  material    text,
  supplier    text,
  qty         numeric default 0,
  price       numeric default 0,
  addr        text,
  notes       text,
  date        date,
  status      text default 'Raised',
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── VENDORS ─────────────────────────────────────────────
create table if not exists vendors (
  id          uuid default gen_random_uuid() primary key,
  entity_type text default 'Vendor',
  name        text not null,
  code        text,
  category    text,
  contact     text,
  phone       text,
  email       text,
  gst         text,
  terms       text,
  rating      numeric default 3,
  status      text default 'Active',
  address     text,
  materials   text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── SALES ORDERS ────────────────────────────────────────
create table if not exists sales_orders (
  id          uuid default gen_random_uuid() primary key,
  sono        text unique,
  buyer       text,
  customer    text,
  product     text,
  qty         numeric default 0,
  price       numeric default 0,
  date        date,
  deadline    date,
  wo          text,
  ref         text,
  gst         text,
  shipping_addr text,
  addr        text,
  status      text default 'Pending',
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── DISPATCHES ──────────────────────────────────────────
create table if not exists dispatches (
  id          uuid default gen_random_uuid() primary key,
  dcno        text unique,
  soref       text,
  customer    text,
  product     text,
  qty         numeric default 0,
  date        date,
  vehicle     text,
  transporter text,
  lr          text,
  notes       text,
  status      text default 'In Transit',
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── INVOICES ────────────────────────────────────────────
create table if not exists invoices (
  id          uuid default gen_random_uuid() primary key,
  invno       text unique,
  company     text,
  buyer       text,
  party       text,
  customer_gst text,
  bill_to_same boolean default true,
  billing_addr text,
  shipping_addr text,
  soref       text,
  items_json  text,
  amt         numeric default 0,
  gst         numeric default 18,
  total       numeric default 0,
  date        date,
  due         date,
  terms       text,
  ref         text,
  status      text default 'Unpaid',
  notes       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- -- INWARD BILLS -----------------------------------------
create table if not exists inward_bills (
  id          uuid default gen_random_uuid() primary key,
  bill_no     text unique,
  vendor      text,
  po_ref      text,
  vendor_gst  text,
  amt         numeric default 0,
  gst         numeric default 18,
  total       numeric default 0,
  date        date,
  due         date,
  status      text default 'Pending',
  notes       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ═══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Only logged-in users can access data
-- ═══════════════════════════════════════════════════════
alter table profiles       enable row level security;
alter table products       enable row level security;
alter table machines       enable row level security;
alter table inventory      enable row level security;
alter table work_orders    enable row level security;
alter table qc_records     enable row level security;
alter table purchase_orders enable row level security;
alter table vendors        enable row level security;
alter table sales_orders   enable row level security;
alter table dispatches     enable row level security;
alter table invoices       enable row level security;
alter table inward_bills   enable row level security;

-- Policies — allow all operations for authenticated users
create policy "auth_all" on profiles        for all using (auth.role() = 'authenticated');
create policy "auth_all" on products        for all using (auth.role() = 'authenticated');
create policy "auth_all" on machines        for all using (auth.role() = 'authenticated');
create policy "auth_all" on inventory       for all using (auth.role() = 'authenticated');
create policy "auth_all" on work_orders     for all using (auth.role() = 'authenticated');
create policy "auth_all" on qc_records      for all using (auth.role() = 'authenticated');
create policy "auth_all" on purchase_orders for all using (auth.role() = 'authenticated');
create policy "auth_all" on vendors         for all using (auth.role() = 'authenticated');
create policy "auth_all" on sales_orders    for all using (auth.role() = 'authenticated');
create policy "auth_all" on dispatches      for all using (auth.role() = 'authenticated');
create policy "auth_all" on invoices        for all using (auth.role() = 'authenticated');
create policy "auth_all" on inward_bills    for all using (auth.role() = 'authenticated');

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, name, role)
  values (new.id, new.email, new.email, 'admin');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ═══════════════════════════════════════════════════════
-- SEED DATA — Sample data for EIPD plant
-- ═══════════════════════════════════════════════════════
insert into products (name,code,description,unit,price,category,hsn,gst,active) values
  ('PPI-11kV','PROD-001','11kV Polymer Pin Insulator','pcs',1500,'Pin Insulator','8546',18,true),
  ('PPI-22kV','PROD-002','22kV Polymer Pin Insulator','pcs',1800,'Pin Insulator','8546',18,true),
  ('PPI-33kV','PROD-003','33kV Polymer Pin Insulator','pcs',2500,'Pin Insulator','8546',18,true)
on conflict do nothing;

insert into machines (name,eqid,model,status,oee,param) values
  ('FRP Pultrusion Line',     'EQ-001','Mittwoch MT-FRP-PL01','Running',    87,'Speed: 1.2 m/min'),
  ('Compression Mould Press 1','EQ-002','Mittwoch MT-CM-250T', 'Running',    82,'Pressure: 180 bar'),
  ('Compression Mould Press 2','EQ-003','Mittwoch MT-CM-250T', 'Maintenance',41,'Mould wear'),
  ('HTV Rubber Kneader',      'EQ-004','Mittwoch MT-KN-75L',  'Running',    91,'75 kg/22 min'),
  ('Crimping Machine',        'EQ-005','Mittwoch MT-CR-100',  'Idle',       68,'Last: WO-042'),
  ('Flash Trimming Unit',     'EQ-006','Mittwoch MT-FT-02',   'Running',    79,'120 pcs/hr')
on conflict do nothing;

insert into inventory (name,code,unit,stock,reorder,min,cost,supplier) values
  ('HTV Silicone Rubber',       'RM-001','kg', 720,300,150,350,'Wacker Chemie India'),
  ('ATH Filler',                'RM-002','kg', 180,200,100,85, 'Aditya Birla Chemicals'),
  ('FRP Core Rods 16mm',        'RM-003','pcs',550,300,100,180,'Mittwoch Technologies'),
  ('Metal End Fittings PPI-11', 'RM-005','sets',830,400,200,125,'Local Metal Forge'),
  ('Crimping Bands',            'RM-008','pcs',240,250,100,45, 'Local Fabricator')
on conflict do nothing;

insert into work_orders (wono,product,qty,produced,start_date,end_date,priority,shift,status,remarks) values
  ('WO-041','PPI-33kV',500, 210,'2026-03-10','2026-03-20','High',  'Shift A','Delayed',   'APTRANSCO order'),
  ('WO-042','PPI-11kV',1200,936,'2026-03-08','2026-03-18','Urgent','Shift B','On Track',  'TSSPDCL order'),
  ('WO-043','PPI-22kV',800, 488,'2026-03-12','2026-03-22','Normal','Shift A','In Progress','MSEDCL order')
on conflict do nothing;

insert into vendors (name,code,category,contact,phone,email,gst,terms,rating,status,materials) values
  ('Wacker Chemie India',  'VND-001','Raw Material','Rajesh Kumar','+91 22 6600 0000','rajesh@wacker.com',  '27AABCW1234X1ZY','Net 30',  5,'Active','HTV Silicone Rubber'),
  ('Mittwoch Technologies','VND-003','Machinery',   'Suresh Nair', '+91 80 4100 0000','suresh@mittwoch.in', '29AABCM9012Z1ZV','Advance', 5,'Active','FRP Rods, Machines'),
  ('Local Metal Forge',    'VND-004','Raw Material','Mahesh Reddy','+91 40 2300 0000','mahesh@forge.in',    '36AABCL3456A1ZW','On Delivery',3,'Active','Metal Fittings')
on conflict do nothing;
