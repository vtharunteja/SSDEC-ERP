# Supabase Backup and Export Checklist

## Use This For
- pre-release backup
- weekly database export
- incident recovery preparation
- schema change safety checkpoint

## Step 1: Confirm Project
1. Open your Supabase project dashboard.
2. Confirm you are in the correct production project.

## Step 2: Export High-Risk Business Tables
Export these first:
- `work_orders`
- `purchase_orders`
- `quotations`
- `sales_orders`
- `dispatches`
- `invoices`
- `inward_bills`
- `finished_goods`
- `approvals`
- `audit_logs`

## Step 3: Export Master Tables
- `profiles`
- `products`
- `inventory`
- `vendors`
- `buyers`
- `company_details`
- `machines`

## Step 4: Export Control Tables
- `ops_manuals`
- `planning_records`
- `cost_records`
- `task_records`
- `maintenance_logs`
- `workforce_records`
- `qc_records`
- `qc_certificates`

## Step 5: Save Exports
Recommended folder naming:
- `Supabase-Backup-YYYY-MM-DD`

Recommended file naming:
- `table-name-YYYY-MM-DD.csv`

## Step 6: Release Safety Check
Before any SQL patch:
1. GitHub latest commit confirmed
2. Supabase table exports completed
3. ERP JSON backup completed
4. At least one exported file opened successfully

## Step 7: Recovery Rule
- Restore production data from Supabase backup/export workflow.
- Use ERP browser exports only as secondary controlled support.

## Optional SQL Verification Queries

### Row count check
```sql
select 'profiles' as table_name, count(*) from profiles
union all
select 'products', count(*) from products
union all
select 'inventory', count(*) from inventory
union all
select 'work_orders', count(*) from work_orders
union all
select 'purchase_orders', count(*) from purchase_orders
union all
select 'quotations', count(*) from quotations
union all
select 'sales_orders', count(*) from sales_orders
union all
select 'dispatches', count(*) from dispatches
union all
select 'invoices', count(*) from invoices
union all
select 'inward_bills', count(*) from inward_bills;
```

### Latest activity check
```sql
select now() as backup_checked_at;
```

## Minimum Signoff
- [ ] Supabase exports completed
- [ ] ERP JSON backup completed
- [ ] ERP CSV exports completed
- [ ] GitHub commit confirmed
- [ ] Ready for release / patch / recovery
