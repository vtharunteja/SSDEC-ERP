# Training Manual

## Project
EIPD ERP User Training Manual

## Purpose
This training manual is for end users who will operate the ERP in daily plant activity. It covers login, navigation, module usage, approvals, and common daily workflows.

## Audience
- Plant Admin
- Plant Manager
- Production Supervisor
- Store Keeper
- QC Inspector
- Dispatch User
- Finance User
- Viewer

## System Access
Open the application from:
[index.html](C:\Users\keert\Desktop\quote for pin insulators\SSDEC-ERP-main\SSDEC-ERP-main\index.html)

## 1. Login
Steps:
1. Open the ERP page.
2. Enter your registered email.
3. Enter your password.
4. Click `SIGN IN`.

Screenshot placeholder:
`[Insert Screenshot: Login Screen]`

If password is forgotten:
1. Click `Forgot password?`
2. Enter your email
3. Follow the reset email instructions

## 2. Dashboard
The Dashboard gives a quick view of:
- active work orders
- inventory alerts
- recent QC results
- recent dispatches
- top-level KPIs

Use the Dashboard to review current plant status before starting daily work.

Screenshot placeholder:
`[Insert Screenshot: Dashboard Overview]`

## 3. Navigation
The left navigation menu provides access to all modules based on the user role.

Typical modules:
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

Screenshot placeholder:
`[Insert Screenshot: Sidebar Navigation]`

## 4. Product Master
Use Product Master to create and maintain the list of finished products.

Steps:
1. Open `Product Master`
2. Enter product details such as name, code, description, unit, price, category, HSN, GST
3. Save the product

Best practice:
- Use consistent product codes
- Avoid duplicate product names

Screenshot placeholder:
`[Insert Screenshot: Product Master Entry Form]`

## 5. Inventory
Use Inventory to manage raw materials and stock levels.

Steps:
1. Open `Inventory`
2. Enter material name, code, unit, stock, reorder level, minimum stock, unit cost, supplier
3. Save the material
4. Monitor low-stock rows and alerts

Screenshot placeholder:
`[Insert Screenshot: Inventory Screen]`

## 6. Work Orders
Use Work Orders to create production plans.

Steps:
1. Open `Work Orders`
2. Select product
3. Enter planned quantity
4. Enter start date and target date
5. Select priority and shift
6. Add remarks if needed
7. Save the work order

Screenshot placeholder:
`[Insert Screenshot: Work Order Creation]`

## 7. Machines
Use Machines to track equipment condition and key parameters.

Steps:
1. Open `Machines`
2. Enter machine name, equipment ID, model, status, OEE, key parameter, and notes
3. Save equipment details

Screenshot placeholder:
`[Insert Screenshot: Machines Module]`

## 8. Quality Control
Use Quality Control to record inspection results.

Steps:
1. Open `Quality Control`
2. Select work order and product
3. Enter sample size
4. Enter passed quantity
5. Select test type
6. Enter inspector name
7. Add observations if required
8. Submit QC entry

Important:
- Passed quantity cannot be more than sample size
- Review result status before issuing certificates

Screenshot placeholder:
`[Insert Screenshot: QC Entry Form]`

## 9. Finished Goods
Use Finished Goods to record completed and approved production stock.

Steps:
1. Open `Finished Goods`
2. Select product
3. Enter quantity
4. Choose unit
5. Enter unit cost
6. Enter storage location
7. Link work order and QC reference if available
8. Save entry

Screenshot placeholder:
`[Insert Screenshot: Finished Goods Register]`

## 10. Purchase Orders
Use Purchase Orders to manage material procurement.

Steps:
1. Open `Purchase Orders`
2. Select material
3. Enter supplier
4. Enter quantity and price
5. Enter date and address if required
6. Save the purchase order
7. Request approval when needed

Screenshot placeholder:
`[Insert Screenshot: Purchase Order Module]`

## 11. Sales Orders
Use Sales Orders to record customer orders.

Steps:
1. Open `Sales Orders`
2. Enter customer details
3. Select product
4. Enter quantity and price
5. Save the sales order

Screenshot placeholder:
`[Insert Screenshot: Sales Order Screen]`

## 12. Dispatch
Use Dispatch to manage delivery challans and transportation details.

Steps:
1. Open `Dispatch`
2. Select or link sales order reference
3. Enter vehicle, transporter, LR details, quantity, and date
4. Save dispatch record

Screenshot placeholder:
`[Insert Screenshot: Dispatch Module]`

## 13. Invoices
Use Invoices to create and track billing records.

Steps:
1. Open `Invoices`
2. Enter customer/party name
3. Link sales order if applicable
4. Enter amount, GST, due date, payment terms
5. Save invoice

Screenshot placeholder:
`[Insert Screenshot: Invoice Entry Screen]`

## 14. Vendors
Use Vendors to maintain supplier master data.

Steps:
1. Open `Vendors`
2. Enter name, code, category, contact details, GST, payment terms, rating, materials supplied
3. Save the vendor

Screenshot placeholder:
`[Insert Screenshot: Vendors Screen]`

## 15. Approval Workflow
Certain records require approval before operational processing.

### Requesting Approval
Steps:
1. Open the relevant Work Order or Purchase Order
2. Click `Request Approval`
3. The approval badge will appear on that record

### Approving or Rejecting
Only Admin or Manager can approve or reject.

Steps:
1. Login as Admin or Manager
2. Open the relevant module
3. Find the pending record
4. Click `Approve` or `Reject`
5. If rejecting, enter the reason when prompted

Screenshot placeholder:
`[Insert Screenshot: Approval Badge Pending]`

### Approval Badge Meaning
- Pending: waiting for Admin / Manager
- Approved: approved by named user
- Rejected: rejected with reason

Examples users may see:
- Pending | Ravi Kumar | 20 Mar, 2:14 PM | Admin / Manager
- Approved | Ravi Kumar | 19 Mar | By Suresh
- Rejected | Priya | 18 Mar | Budget exceeded

Screenshot placeholder:
`[Insert Screenshot: Approved and Rejected Badge Examples]`

## 16. Audit Log
Use Audit Log to review who performed important system actions.

Typical uses:
- trace changes
- check user activity
- verify approvals and updates

Screenshot placeholder:
`[Insert Screenshot: Audit Log]`

## 17. User Management
Admin users can create and update users.

Steps:
1. Open `User Management`
2. Click add user
3. Enter full name, email, role, department, phone, employee ID
4. Save the user

Use caution:
- Give Admin and Manager roles only to authorized personnel

Screenshot placeholder:
`[Insert Screenshot: User Management]`

## 18. Daily Best Practices
- Review dashboard first at the start of the day
- Keep inventory updated after every stock movement
- Raise work orders with correct dates and quantities
- Record QC results immediately after inspection
- Use approval workflow consistently
- Keep vendor and product masters clean and updated
- Review pending approvals daily

## 19. Common Errors and Fixes
### Login issue
- Check internet connection
- Verify email and password
- Contact Admin if account is inactive

### Data not saving
- Refresh the page
- Check required fields
- Confirm Supabase connection is active

### Approval issue
- Confirm Admin or Manager role for approver
- Confirm approval table fields exist in database

### Layout issue
- Refresh browser cache
- Use the latest uploaded files

## 20. End-of-Day Checklist
- All work orders updated
- All material receipts entered
- QC entries completed
- Finished goods updated
- Pending approvals reviewed
- Dispatch records completed
- Invoices checked where applicable

## 21. Trainer Notes
Recommended training sequence:
1. Login and dashboard
2. Product master and inventory
3. Work orders and machines
4. QC and finished goods
5. Purchase and approvals
6. Sales, dispatch, invoices
7. User management and audit log

Recommended training method:
- live walkthrough
- one practice entry in each module
- one approval request and approval demonstration
- one rejection demonstration with reason

## 22. Document Use
This manual may be:
- shared with staff
- printed for training sessions
- converted into Word or PDF
- expanded with real screenshots later

