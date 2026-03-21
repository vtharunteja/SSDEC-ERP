-- Security hardening patch
-- Goal:
-- 1. Only Plant Admin and Plant Manager can delete business records
-- 2. Authenticated users can still read/insert/update business records
-- 3. Profile updates are limited to self or admin/manager

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid() limit 1),
    'viewer'
  );
$$;

grant execute on function public.current_app_role() to authenticated;

-- Ensure RLS is enabled
alter table profiles enable row level security;
alter table products enable row level security;
alter table machines enable row level security;
alter table inventory enable row level security;
alter table work_orders enable row level security;
alter table qc_records enable row level security;
alter table purchase_orders enable row level security;
alter table vendors enable row level security;
alter table sales_orders enable row level security;
alter table dispatches enable row level security;
alter table invoices enable row level security;
alter table approvals enable row level security;
alter table finished_goods enable row level security;
alter table audit_logs enable row level security;
alter table qc_certificates enable row level security;

-- Drop old permissive policies
drop policy if exists auth_all on profiles;
drop policy if exists auth_all on products;
drop policy if exists auth_all on machines;
drop policy if exists auth_all on inventory;
drop policy if exists auth_all on work_orders;
drop policy if exists auth_all on qc_records;
drop policy if exists auth_all on purchase_orders;
drop policy if exists auth_all on vendors;
drop policy if exists auth_all on sales_orders;
drop policy if exists auth_all on dispatches;
drop policy if exists auth_all on invoices;
drop policy if exists auth_all on approvals;
drop policy if exists auth_all on finished_goods;
drop policy if exists auth_all on audit_logs;
drop policy if exists auth_all on qc_certificates;

-- Also drop prior patch policies if re-running
drop policy if exists profiles_select_all_auth on profiles;
drop policy if exists profiles_update_self_or_manager on profiles;
drop policy if exists products_select_auth on products;
drop policy if exists products_insert_auth on products;
drop policy if exists products_update_auth on products;
drop policy if exists products_delete_admin_manager on products;
drop policy if exists machines_select_auth on machines;
drop policy if exists machines_insert_auth on machines;
drop policy if exists machines_update_auth on machines;
drop policy if exists machines_delete_admin_manager on machines;
drop policy if exists inventory_select_auth on inventory;
drop policy if exists inventory_insert_auth on inventory;
drop policy if exists inventory_update_auth on inventory;
drop policy if exists inventory_delete_admin_manager on inventory;
drop policy if exists work_orders_select_auth on work_orders;
drop policy if exists work_orders_insert_auth on work_orders;
drop policy if exists work_orders_update_auth on work_orders;
drop policy if exists work_orders_delete_admin_manager on work_orders;
drop policy if exists qc_records_select_auth on qc_records;
drop policy if exists qc_records_insert_auth on qc_records;
drop policy if exists qc_records_update_auth on qc_records;
drop policy if exists qc_records_delete_admin_manager on qc_records;
drop policy if exists purchase_orders_select_auth on purchase_orders;
drop policy if exists purchase_orders_insert_auth on purchase_orders;
drop policy if exists purchase_orders_update_auth on purchase_orders;
drop policy if exists purchase_orders_delete_admin_manager on purchase_orders;
drop policy if exists vendors_select_auth on vendors;
drop policy if exists vendors_insert_auth on vendors;
drop policy if exists vendors_update_auth on vendors;
drop policy if exists vendors_delete_admin_manager on vendors;
drop policy if exists sales_orders_select_auth on sales_orders;
drop policy if exists sales_orders_insert_auth on sales_orders;
drop policy if exists sales_orders_update_auth on sales_orders;
drop policy if exists sales_orders_delete_admin_manager on sales_orders;
drop policy if exists dispatches_select_auth on dispatches;
drop policy if exists dispatches_insert_auth on dispatches;
drop policy if exists dispatches_update_auth on dispatches;
drop policy if exists dispatches_delete_admin_manager on dispatches;
drop policy if exists invoices_select_auth on invoices;
drop policy if exists invoices_insert_auth on invoices;
drop policy if exists invoices_update_auth on invoices;
drop policy if exists invoices_delete_admin_manager on invoices;
drop policy if exists approvals_select_auth on approvals;
drop policy if exists approvals_insert_auth on approvals;
drop policy if exists approvals_update_auth on approvals;
drop policy if exists approvals_delete_admin_manager on approvals;
drop policy if exists finished_goods_select_auth on finished_goods;
drop policy if exists finished_goods_insert_auth on finished_goods;
drop policy if exists finished_goods_update_auth on finished_goods;
drop policy if exists finished_goods_delete_admin_manager on finished_goods;
drop policy if exists audit_logs_select_auth on audit_logs;
drop policy if exists audit_logs_insert_auth on audit_logs;
drop policy if exists audit_logs_update_auth on audit_logs;
drop policy if exists audit_logs_delete_admin_manager on audit_logs;
drop policy if exists qc_certificates_select_auth on qc_certificates;
drop policy if exists qc_certificates_insert_auth on qc_certificates;
drop policy if exists qc_certificates_update_auth on qc_certificates;
drop policy if exists qc_certificates_delete_admin_manager on qc_certificates;

-- Profiles
create policy profiles_select_all_auth on profiles
for select
using (auth.role() = 'authenticated');

create policy profiles_update_self_or_manager on profiles
for update
using (
  auth.uid() = id
  or public.current_app_role() in ('admin', 'manager')
)
with check (
  auth.uid() = id
  or public.current_app_role() in ('admin', 'manager')
);

-- Generic business-table policies
create policy products_select_auth on products for select using (auth.role() = 'authenticated');
create policy products_insert_auth on products for insert with check (auth.role() = 'authenticated');
create policy products_update_auth on products for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy products_delete_admin_manager on products for delete using (public.current_app_role() in ('admin', 'manager'));

create policy machines_select_auth on machines for select using (auth.role() = 'authenticated');
create policy machines_insert_auth on machines for insert with check (auth.role() = 'authenticated');
create policy machines_update_auth on machines for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy machines_delete_admin_manager on machines for delete using (public.current_app_role() in ('admin', 'manager'));

create policy inventory_select_auth on inventory for select using (auth.role() = 'authenticated');
create policy inventory_insert_auth on inventory for insert with check (auth.role() = 'authenticated');
create policy inventory_update_auth on inventory for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy inventory_delete_admin_manager on inventory for delete using (public.current_app_role() in ('admin', 'manager'));

create policy work_orders_select_auth on work_orders for select using (auth.role() = 'authenticated');
create policy work_orders_insert_auth on work_orders for insert with check (auth.role() = 'authenticated');
create policy work_orders_update_auth on work_orders for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy work_orders_delete_admin_manager on work_orders for delete using (public.current_app_role() in ('admin', 'manager'));

create policy qc_records_select_auth on qc_records for select using (auth.role() = 'authenticated');
create policy qc_records_insert_auth on qc_records for insert with check (auth.role() = 'authenticated');
create policy qc_records_update_auth on qc_records for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy qc_records_delete_admin_manager on qc_records for delete using (public.current_app_role() in ('admin', 'manager'));

create policy purchase_orders_select_auth on purchase_orders for select using (auth.role() = 'authenticated');
create policy purchase_orders_insert_auth on purchase_orders for insert with check (auth.role() = 'authenticated');
create policy purchase_orders_update_auth on purchase_orders for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy purchase_orders_delete_admin_manager on purchase_orders for delete using (public.current_app_role() in ('admin', 'manager'));

create policy vendors_select_auth on vendors for select using (auth.role() = 'authenticated');
create policy vendors_insert_auth on vendors for insert with check (auth.role() = 'authenticated');
create policy vendors_update_auth on vendors for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy vendors_delete_admin_manager on vendors for delete using (public.current_app_role() in ('admin', 'manager'));

create policy sales_orders_select_auth on sales_orders for select using (auth.role() = 'authenticated');
create policy sales_orders_insert_auth on sales_orders for insert with check (auth.role() = 'authenticated');
create policy sales_orders_update_auth on sales_orders for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy sales_orders_delete_admin_manager on sales_orders for delete using (public.current_app_role() in ('admin', 'manager'));

create policy dispatches_select_auth on dispatches for select using (auth.role() = 'authenticated');
create policy dispatches_insert_auth on dispatches for insert with check (auth.role() = 'authenticated');
create policy dispatches_update_auth on dispatches for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy dispatches_delete_admin_manager on dispatches for delete using (public.current_app_role() in ('admin', 'manager'));

create policy invoices_select_auth on invoices for select using (auth.role() = 'authenticated');
create policy invoices_insert_auth on invoices for insert with check (auth.role() = 'authenticated');
create policy invoices_update_auth on invoices for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy invoices_delete_admin_manager on invoices for delete using (public.current_app_role() in ('admin', 'manager'));

create policy approvals_select_auth on approvals for select using (auth.role() = 'authenticated');
create policy approvals_insert_auth on approvals for insert with check (auth.role() = 'authenticated');
create policy approvals_update_auth on approvals for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy approvals_delete_admin_manager on approvals for delete using (public.current_app_role() in ('admin', 'manager'));

create policy finished_goods_select_auth on finished_goods for select using (auth.role() = 'authenticated');
create policy finished_goods_insert_auth on finished_goods for insert with check (auth.role() = 'authenticated');
create policy finished_goods_update_auth on finished_goods for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy finished_goods_delete_admin_manager on finished_goods for delete using (public.current_app_role() in ('admin', 'manager'));

create policy audit_logs_select_auth on audit_logs for select using (auth.role() = 'authenticated');
create policy audit_logs_insert_auth on audit_logs for insert with check (auth.role() = 'authenticated');
create policy audit_logs_update_auth on audit_logs for update using (public.current_app_role() in ('admin', 'manager')) with check (public.current_app_role() in ('admin', 'manager'));
create policy audit_logs_delete_admin_manager on audit_logs for delete using (public.current_app_role() in ('admin', 'manager'));

create policy qc_certificates_select_auth on qc_certificates for select using (auth.role() = 'authenticated');
create policy qc_certificates_insert_auth on qc_certificates for insert with check (auth.role() = 'authenticated');
create policy qc_certificates_update_auth on qc_certificates for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy qc_certificates_delete_admin_manager on qc_certificates for delete using (public.current_app_role() in ('admin', 'manager'));

