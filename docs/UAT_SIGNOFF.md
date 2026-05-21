# User Acceptance Testing Signoff

## Project
- System: `SSDEC ERP`
- Environment: `Production / GitHub Pages + Supabase`
- Date: `2026-04-03`

## Scope Covered
- Authentication and session restore
- Role-based module visibility
- Production flow
- Procurement flow
- Commercial flow
- Finance flow
- Control tower modules
- Backup and reporting exports

## Roles Tested
- `Plant Admin`
- `Plant Manager`
- `Production Supervisor`
- `Store Keeper`
- `QC Inspector`
- `Dispatch Officer`
- `Viewer`

## Core Flows Verified
- Buyer -> Sales Order -> Dispatch -> Invoice
- Inventory -> Purchase Order -> Inward Bill -> GRN
- Work Order -> Approval -> QC -> Finished Goods
- Quotation -> Submission -> Follow-up -> Print
- PO -> Tracker -> GRN -> Print
- Invoice / Dispatch print outputs

## UAT Result Matrix
| Area | Status | Remarks |
|---|---|---|
| Login and session | PASS | Manager credential must be confirmed separately if changed after test |
| Role visibility | PASS | Unauthorized modules hidden by role |
| Dashboard interaction | PASS | KPI cards and dashboard drilldowns clickable |
| Approval flow | PASS | Approval flow popup working after handler fix |
| Procurement | PASS | PO, Inward Bill, GRN, tracker validated |
| Sales and invoicing | PASS | Sales, quotation, invoice, dispatch flows validated |
| Reporting exports | PASS | CSV exports added for key registers |
| GST export-ready data | PASS | GSTR-1 style outward CSV and GST summary JSON available |

## Remaining Recommendations
- Confirm `manager@ssdec.com` credentials in live Auth if login was recently changed.
- Run one final business-owner walkthrough on production data.
- Archive one baseline backup before future schema changes.

## Signoff
- Tested By:
- Reviewed By:
- Business Owner:
- Go-Live Approved: `Yes / No`
- Remarks:

