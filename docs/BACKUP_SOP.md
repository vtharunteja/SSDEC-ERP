# Backup and Restore SOP

## Purpose
This SOP defines how to protect ERP data, application code, and recovery readiness for the SSDEC ERP system.

## Backup Layers
1. Code backup
   - Source code is backed up in GitHub.
   - Repository: [https://github.com/vtharunteja/SSDEC-ERP](https://github.com/vtharunteja/SSDEC-ERP)
2. Database backup
   - Primary business data backup must be taken from Supabase exports/backups.
3. Operational export backup
   - JSON and CSV exports from the ERP Backup & Restore module provide office-side retention and audit copies.

## Critical Tables
- `profiles`
- `products`
- `inventory`
- `machines`
- `vendors`
- `buyers`
- `company_details`
- `work_orders`
- `qc_records`
- `purchase_orders`
- `quotations`
- `sales_orders`
- `dispatches`
- `invoices`
- `inward_bills`
- `finished_goods`
- `approvals`
- `audit_logs`
- `qc_certificates`
- `ops_manuals`
- `planning_records`
- `cost_records`
- `task_records`
- `maintenance_logs`
- `workforce_records`

## Backup Frequency
1. Daily
   - Export critical transactional data from Supabase or the ERP Backup module.
2. Weekly
   - Export full JSON backup and CSV archive.
3. Before any release or SQL patch
   - Take full Supabase export.
   - Export ERP JSON backup.
   - Confirm latest GitHub commit is available.

## Daily Backup Procedure
1. Login as `admin` or `manager`.
2. Open `Backup & Restore` in the ERP.
3. Export:
   - `Full JSON Backup`
   - `All CSV Files`
4. Save exports in a dated folder:
   - `ERP-Backup-YYYY-MM-DD`
5. Verify downloaded files open correctly.

## Pre-Change Backup Procedure
1. Export full JSON from the ERP.
2. Export Supabase tables or database backup.
3. Confirm the GitHub repository is up to date.
4. Only then apply SQL changes or deployment updates.

## Restore Principle
- Production restore must be performed from Supabase database restore/export files.
- ERP browser exports should be treated as:
  - audit retention
  - office archive
  - controlled re-import support
- Do not overwrite production data from the browser without validation.

## Validation After Backup
1. Confirm backup files were created.
2. Confirm file sizes are non-zero.
3. Open one JSON and one CSV file to validate readability.
4. Confirm GitHub repo is reachable.

## Responsibility
- Plant Admin: final owner of backup execution and recovery readiness
- Plant Manager: operational verification and weekly backup review
- IT / Deployment owner: Supabase restore and release checkpoint

## Minimum Recovery Checklist
1. GitHub code available
2. Supabase project credentials available
3. Latest SQL schema/patch files available
4. Latest JSON/CSV archive available
5. Buyer, company, product, inventory, invoice, quotation, and work order data verified
