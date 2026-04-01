create table if not exists ops_manuals (
  id uuid default gen_random_uuid() primary key,
  doc_type text,
  doc_no text,
  title text not null,
  department text,
  owner text,
  review_frequency text,
  effective_date date,
  review_date date,
  status text default 'Active',
  version text,
  content text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists planning_records (
  id uuid default gen_random_uuid() primary key,
  plan_type text,
  title text not null,
  start_date date,
  end_date date,
  shift text,
  equipment text,
  target_output numeric default 0,
  actual_output numeric default 0,
  downtime_hours numeric default 0,
  capacity_pct numeric default 0,
  owner text,
  status text default 'Planned',
  deviation_notes text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists cost_records (
  id uuid default gen_random_uuid() primary key,
  cost_type text,
  project text not null,
  equipment text,
  category text,
  vendor text,
  amount numeric default 0,
  year integer,
  month text,
  benefit_estimate numeric default 0,
  status text default 'Planned',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists task_records (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  task_type text,
  owner text,
  assigned_to text,
  accountable text,
  consulted text,
  informed text,
  priority text default 'Medium',
  start_date date,
  due_date date,
  board text default 'To Do',
  status text default 'Open',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists maintenance_logs (
  id uuid default gen_random_uuid() primary key,
  report_id text,
  asset_name text not null,
  serial_no text,
  vendor text,
  maintenance_type text,
  technician text,
  schedule_date date,
  follow_up_date date,
  work_order_ref text,
  condition_status text default 'Good',
  status text default 'Open',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists workforce_records (
  id uuid default gen_random_uuid() primary key,
  employee_name text not null,
  employee_code text,
  role text,
  skill_area text,
  training_name text,
  competency_level text,
  last_training_date date,
  next_training_date date,
  trainer text,
  certification_status text default 'Pending',
  status text default 'Active',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table ops_manuals enable row level security;
alter table planning_records enable row level security;
alter table cost_records enable row level security;
alter table task_records enable row level security;
alter table maintenance_logs enable row level security;
alter table workforce_records enable row level security;

drop policy if exists "auth_all" on ops_manuals;
drop policy if exists "auth_all" on planning_records;
drop policy if exists "auth_all" on cost_records;
drop policy if exists "auth_all" on task_records;
drop policy if exists "auth_all" on maintenance_logs;
drop policy if exists "auth_all" on workforce_records;

create policy "auth_all" on ops_manuals for all using (auth.role() = 'authenticated');
create policy "auth_all" on planning_records for all using (auth.role() = 'authenticated');
create policy "auth_all" on cost_records for all using (auth.role() = 'authenticated');
create policy "auth_all" on task_records for all using (auth.role() = 'authenticated');
create policy "auth_all" on maintenance_logs for all using (auth.role() = 'authenticated');
create policy "auth_all" on workforce_records for all using (auth.role() = 'authenticated');
