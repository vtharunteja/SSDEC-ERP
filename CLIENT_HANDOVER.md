# Client Handover Document

## Cover Page
**Project Name:** EIPD ERP Web Application

**Document Type:** Client Handover and Delivery Note

**Prepared For:** Client / Management Team

**Prepared By:** Project Delivery Team

**Document Status:** Final Handover Copy

**Date:** 20 March 2026

**Deployment Package Location:**
[SSDEC-ERP-main](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main)

---

## Project
EIPD ERP Web Application

## Delivery Overview
This document serves as the formal handover note for the delivered ERP web application. The application is designed to support plant operations including production, inventory, quality control, finished goods, purchase, sales, dispatch, invoicing, approvals, and user management.

The delivered system is a static frontend application connected to Supabase for authentication and database operations.

## Delivered Files
Project root:
[SSDEC-ERP-main](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main)

Key files:
- [index.html](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main\index.html)
- [js/config.js](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main\js\config.js)
- [js/app.js](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main\js\app.js)
- [css/base.css](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main\css\base.css)
- [css/layout.css](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main\css\layout.css)
- [css/components.css](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main\css\components.css)
- [css/modules.css](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main\css\modules.css)
- [sql/schema.sql](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main\sql\schema.sql)

## Platform Summary
The application is built as:
- Frontend: HTML, CSS, JavaScript
- Backend: Supabase
- Authentication: Supabase Auth
- Database: PostgreSQL via Supabase
- Hosting: Any static hosting platform

## Main Modules Delivered
- Dashboard
- Work Orders
- Machines
- Quality Control
- Finished Goods
- Inventory
- Purchase Orders
- Sales Orders
- Dispatch
- Invoices
- Vendors
- Product Master
- Audit Log
- User Management

## Approval Badge Update Included
The current delivered version includes the updated approval badge UI.

Displayed states:
- Pending: shows requester name, requested date/time, and waiting on Admin / Manager
- Approved: shows requester name, request date, and approved by name
- Rejected: shows requester name, request date, and rejection reason

Files updated for this change:
- [js/app.js](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main\js\app.js)
- [css/components.css](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main\css\components.css)

## Deployment Instructions
1. Upload the full project folder to your hosting environment.
2. Create or access the Supabase project.
3. Run the SQL in [sql/schema.sql](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main\sql\schema.sql).
4. Add approval timestamp columns if not already present:

```sql
alter table approvals add column if not exists requested_at timestamptz;
alter table approvals add column if not exists approved_at timestamptz;
```

5. Update [js/config.js](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main\js\config.js) with:
   - Supabase Project URL
   - Supabase anon public key
6. Open the application through [index.html](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main\index.html).

## Client Responsibilities After Handover
- Maintain Supabase access credentials securely
- Manage user accounts and roles
- Take regular database backups
- Test any future change before pushing live
- Ensure only authorized persons are given Admin or Manager access

## Recommended Go-Live Checklist
- Supabase URL configured correctly
- Supabase anon key configured correctly
- Database schema loaded successfully
- Approval timestamp columns added
- Login working
- One user profile created successfully
- Work order creation tested
- Purchase order creation tested
- Approval request tested
- Approval approve and reject tested
- QC entry tested
- Finished goods entry tested

## Known Technical Note
The updated approval UI writes to the following approval table fields:
- `requested_at`
- `approved_at`

These columns should exist in the `approvals` table for the latest approval badge behavior to work correctly.

## Recommended Backup Procedure
Before any future update:
1. Backup the full application folder
2. Export Supabase database backup
3. Keep a copy of:
   - [js/app.js](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main\js\app.js)
   - [css/components.css](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main\css\components.css)
   - [sql/schema.sql](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main\sql\schema.sql)

## Support Scope
This handover includes:
- source files
- database schema file
- current UI updates
- usage SOP
- client handover and training documentation

This handover does not automatically include:
- future feature development
- infrastructure management
- database redesign
- third-party service billing or account management

## Handover Status
Status: Delivered

Recommended next step:
Client should perform one final live sign-in and approval-flow check immediately after deployment.

## Signoff Section

### Delivery Signoff

**Delivered By**

Name: ______________________________

Designation: _______________________

Signature: _________________________

Date: ______________________________

### Client Acceptance Signoff

**Accepted By**

Name: ______________________________

Company: ___________________________

Designation: _______________________

Signature: _________________________

Date: ______________________________

### Remarks

Comments / observations at handover:

____________________________________________________________

____________________________________________________________

____________________________________________________________
