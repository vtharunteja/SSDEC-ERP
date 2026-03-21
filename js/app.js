// ---
// app.js - EIPD ERP Main Logic
// Supabase Auth + Realtime + All 13 Modules
// ---

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- SUPABASE CLIENT ---
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
let CU   = null;   // current user profile
let SUBS = [];     // realtime subscriptions

// --- DATA CACHE ---
const DB = {
  profiles:[], products:[], machines:[], inventory:[],
  work_orders:[], qc_records:[], purchase_orders:[],
  vendors:[], buyers:[], company_details:[], sales_orders:[], dispatches:[], invoices:[], inward_bills:[],
  audit_logs:[], approvals:[], finished_goods:[], qc_certificates:[]
};

// --- TABLE MAP (camelCase id - snake_case table) ---
const TBL = {
  production:'work_orders', quality:'qc_records',
  inventory:'inventory', purchase:'purchase_orders',
  sales:'sales_orders', dispatch:'dispatches',
  invoices:'invoices', ibill:'inward_bills', vendors:'vendors', buyers:'buyers', company:'company_details',
  machines:'machines', products:'products',
  users:'profiles'
};

// --- ROLES ---
const ROLES = {
  admin:      {label:'Plant Admin',      color:'var(--rd)',bg:'rgba(239,68,68,.15)'},
  manager:    {label:'Plant Manager',    color:'var(--ac)',bg:'rgba(249,115,22,.15)'},
  production: {label:'Production Supvr', color:'var(--bl)',bg:'rgba(59,130,246,.15)'},
  storekeeper:{label:'Store Keeper',     color:'var(--gn)',bg:'rgba(34,197,94,.15)'},
  qc:         {label:'QC Inspector',     color:'var(--pu)',bg:'rgba(168,85,247,.15)'},
  dispatch:   {label:'Dispatch Officer', color:'var(--cy)',bg:'rgba(6,182,212,.15)'},
  viewer:     {label:'Read-Only',        color:'var(--mu)',bg:'rgba(74,85,104,.12)'}
};
const NAV_ACCESS = {
  admin:      ['dashboard','production','machines','quality','fg','inventory','purchase','sales','dispatch','invoices','ibill','vendors','buyers','company','products','reports','audit','users'],
  manager:    ['dashboard','production','machines','quality','fg','inventory','purchase','sales','dispatch','invoices','ibill','vendors','buyers','company','products','reports'],
  production: ['dashboard','production','machines','quality','fg'],
  storekeeper:['dashboard','inventory','fg','purchase','vendors'],
  qc:         ['dashboard','quality'],
  dispatch:   ['dashboard','sales','dispatch','invoices','ibill','buyers','company','fg'],
  viewer:     ['dashboard','reports']
};
const CAN_EDIT = {
  admin:      ['production','machines','quality','inventory','fg','purchase','sales','dispatch','invoices','ibill','vendors','buyers','company','products','users','audit'],
  manager:    ['production','machines','quality','inventory','fg','purchase','sales','dispatch','invoices','ibill','vendors','buyers','company','products'],
  production: ['production','machines','quality','fg'],
  storekeeper:['inventory','fg','purchase','vendors'],
  qc:         ['quality'],
  dispatch:   ['dispatch','invoices','ibill','buyers','company','fg'],
  viewer:     []
};
const STATUSES = {
  work_orders:    ['Pending Approval','Queued','In Progress','On Track','Delayed','Completed'],
  finished_goods: ['Available','Reserved','Dispatched'],
  purchase_orders:['Pending Approval','Raised','In Transit','Delivered','Cancelled'],
  sales_orders:   ['Pending','In Production','Ready','Dispatched','Delivered'],
  dispatches:     ['In Transit','Delivered'],
  machines:       ['Running','Idle','Maintenance'],
  invoices:       ['Unpaid','Partially Paid','Paid','Overdue','Cancelled'],
  inward_bills:   ['Pending','Booked','Paid','Overdue','Cancelled']
};
const NAVDEF = [
  {s:'Overview'},
  {id:'dashboard',   ic:'&#9783;',  lb:'Dashboard'},
  {s:'Production'},
  {id:'production',  ic:'&#9881;',  lb:'Work Orders',    bwo:1},
  {id:'machines',    ic:'&#9874;',  lb:'Machines'},
  {id:'quality',     ic:'&#10003;', lb:'Quality Control'},
  {s:'Materials'},
  {id:'inventory',   ic:'&#9723;',  lb:'Inventory',      binv:1},
  {id:'purchase',    ic:'&#9782;',  lb:'Purchase Orders'},
  {s:'Commercial'},
  {id:'sales',       ic:'&#9741;',  lb:'Sales Orders'},
  {id:'dispatch',    ic:'&#9194;',  lb:'Dispatch'},
  {s:'Finance'},
  {id:'invoices',    ic:'&#9636;',  lb:'Invoices',       binv2:1},
  {id:'ibill',       ic:'&#9789;',  lb:'Inward Bills'},
  {id:'vendors',     ic:'&#9962;',  lb:'Vendors'},
  {id:'buyers',      ic:'&#9733;',  lb:'Buyer Master'},
  {id:'company',     ic:'&#9872;',  lb:'Our Company'},
  {s:'Finished Goods'},
  {id:'fg',          ic:'&#9632;',  lb:'Finished Goods',    bfg:1},
  {s:'Master Data'},
  {id:'products',    ic:'&#9965;',  lb:'Product Master'},
  {s:'Reports'},
  {id:'reports',     ic:'&#9650;',  lb:'Analytics'},
  {s:'Admin'},
  {id:'audit',       ic:'&#9873;',  lb:'Audit Log'},
  {id:'users',       ic:'&#9786;',  lb:'User Management'}
];

// ---
// HELPERS
// ---
const V   = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
const SV  = (id,v) => { const e = document.getElementById(id); if(e) e.value = v != null ? String(v) : ''; };
const ini = n => (n||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
const canEdit = m => (CAN_EDIT[CU?.role||'viewer']||[]).includes(m);
const canDelete = () => ['admin','manager'].includes(CU?.role||'');
const fmtD = d => { if(!d) return '--'; try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); } catch(e) { return d; } };
const fmtM = n => 'Rs ' + (parseFloat(n)||0).toLocaleString('en-IN',{maximumFractionDigits:0});
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jParse = (v, fb) => { try { return v ? JSON.parse(v) : fb; } catch(e) { return fb; } };
const fmtApprD = d => {
  if (!d) return '--';
  try {
    const dt = new Date(d);
    const now = new Date();
    const sameYear = dt.getFullYear() === now.getFullYear();
    const opts = sameYear
      ? { day:'2-digit', month:'short' }
      : { day:'2-digit', month:'short', year:'numeric' };
    const datePart = dt.toLocaleDateString('en-IN', opts);
    const hasTime = dt.getHours() !== 0 || dt.getMinutes() !== 0 || String(d).includes('T');
    if (!hasTime) return datePart;
    const timePart = dt.toLocaleTimeString('en-IN', { hour:'numeric', minute:'2-digit' });
    return `${datePart}, ${timePart}`;
  } catch(e) { return d; }
};
const QC_TESTS = [
  'Visual Inspection',
  'Dimensional Check',
  'Creepage Verification',
  'HV Puncture Test',
  'Thermal Cycling',
  'Mechanical Load Test'
];
const WO_SERVICE_OPTIONS = [
  'Mechanical Services',
  'Machining',
  'Tool Room Support',
  'Mould Maintenance',
  'Galvanizing',
  'CNC / Fabrication',
  'Testing Services',
  'Packing Services',
  'Other Services'
];
function qcTestId(name){ return name.toLowerCase().replace(/[^a-z0-9]+/g,'-'); }
function renderQCTestList(selected=[], remarksMap={}) {
  const wrap = document.getElementById('qc-test-list');
  if (!wrap) return;
  wrap.innerHTML = QC_TESTS.map(name => {
    const id = qcTestId(name);
    const checked = selected.length ? selected.includes(name) : true;
    const remarks = remarksMap[name] || '';
    return `<div class="test-item">
      <div class="test-row">
        <input type="checkbox" id="qc-test-${id}" data-qc-test="${esc(name)}" ${checked?'checked':''}/>
        <label class="test-name" for="qc-test-${id}">${name}</label>
      </div>
      <textarea id="qc-remark-${id}" class="test-remarks" placeholder="Remarks for ${name}...">${esc(remarks)}</textarea>
    </div>`;
  }).join('');
}
function getSelectedQCTests() {
  const items = [...document.querySelectorAll('[data-qc-test]')];
  return items
    .filter(el => el.checked)
    .map(el => {
      const name = el.getAttribute('data-qc-test');
      const remarks = document.getElementById(`qc-remark-${qcTestId(name)}`)?.value.trim() || '';
      return { name, remarks };
    });
}
function parseQCTests(q) {
  if (q.notes && String(q.notes).trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(q.notes);
      if (Array.isArray(parsed.tests)) return parsed;
    } catch(e) {}
  }
  return {
    tests: q.test ? String(q.test).split(',').map(s => ({ name:s.trim(), remarks:'' })).filter(x=>x.name) : QC_TESTS.map(name => ({ name, remarks:'' })),
    general_notes: q.notes || ''
  };
}
function formatQCCertificateObservations(q) {
  const parsed = parseQCTests(q);
  const items = (parsed.tests || [])
    .map(t => `<div style="margin-bottom:6px"><strong>${esc(t.name)}</strong>${t.remarks ? `: ${esc(t.remarks)}` : ''}</div>`)
    .join('');
  const general = parsed.general_notes ? `<div style="margin-top:8px"><strong>General Notes</strong>: ${esc(parsed.general_notes)}</div>` : '';
  return items || general ? `${items}${general}` : '';
}

function pill(s) {
  const m = {
    'On Track':'pg','Completed':'pg','Delivered':'pg','Running':'pg','Passed':'pg','OK':'pg','Active':'pg','Paid':'pg',
    'In Progress':'pb','In Transit':'pb','Raised':'pb','In Production':'pb',
    'Delayed':'po','Idle':'po','Conditional':'po','Pending':'po','Ready':'po','Unpaid':'po',
    'Queued':'pp','Partially Paid':'pp',
    'Maintenance':'pr','Reorder Now':'pr','Failed':'pr','Cancelled':'pr','Overdue':'pr','Blacklisted':'pr',
    'Inactive':'pgr','Low':'po'
  };
  return `<span class="pill ${m[s]||'pgr'}">${s}</span>`;
}

const ron = () => '<div class="al ali" style="margin-bottom:14px"><span class="al-i">i</span>Read-only access for your role. Contact Plant Admin for edit permissions.</div>';

function showLoader(t='Loading...') {
  const el = document.getElementById('loader');
  if (el) { el.style.cssText = 'display:flex!important'; }
  const msg = document.getElementById('loader-msg');
  if (msg) msg.textContent = t;
}
function hideLoader() {
  const el = document.getElementById('loader');
  if (el) el.style.cssText = 'display:none!important';
}

window.openMo  = id => document.getElementById(id).classList.add('open');
window.closeMo = id => document.getElementById(id).classList.remove('open');

function toast(msg, t='s') {
  const icons = {s:'QC', e:'', i:'i', w:'!'};
  const el = document.createElement('div');
  el.className = `toast ${t}`;
  el.innerHTML = `<span class="toast-ic">${icons[t]||'QC'}</span><span>${msg}</span>`;
  document.getElementById('toast-wrap').appendChild(el);
  setTimeout(() => el.remove(), 3800);
}
window.showToast = toast;

function setSyncB(s) {
  const b = document.getElementById('hsync');
  if (!b) return;
  b.className = 'hsync ' + s;
  b.textContent = s==='saving' ? 'Saving...' : s==='err' ? 'Offline' : 'Synced';
}

function fillProdDDs() {
  const prodOpts = DB.products
    .filter(p => p.active === true)
    .map(p => `<option value="${p.name}">${p.name}</option>`)
    .join('');
  const woOpts = prodOpts + WO_SERVICE_OPTIONS.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
  ['qc-prod','so-prod'].forEach(id => {
    const e = document.getElementById(id);
    if (!e) return;
    const cur = e.value;
    e.innerHTML = prodOpts || '<option>No products  add in Product Master</option>';
    if (cur) e.value = cur;
  });
  const woEl = document.getElementById('wo-prod');
  if (woEl) {
    const cur = woEl.value;
    woEl.innerHTML = '<option value="">-- Select product / service --</option>' + woOpts;
    if (cur) woEl.value = cur;
  }
  document.querySelectorAll('[data-inv2-line-product]').forEach(sel => {
    const cur = sel.value;
    sel.innerHTML = '<option value="">-- Select product --</option>' + prodOpts;
    if (cur) sel.value = cur;
  });
  fillPartyDDs();
}

function entityType(v) {
  return v?.entity_type || (v?.category === 'Buyer' ? 'Buyer' : 'Vendor');
}
function getEntities(type) {
  return DB.vendors.filter(v => (entityType(v) === type) && (v.status || 'Active') !== 'Blacklisted');
}
function getBuyerByName(name) {
  return DB.buyers.find(v => v.name === name) || getEntities('Buyer').find(v => v.name === name) || null;
}
function getCompanyByName(name) {
  return DB.company_details.find(v => v.name === name) || getEntities('Our Company').find(v => v.name === name) || null;
}
function getVendorByName(name) {
  return DB.vendors.find(v => v.name === name) || null;
}
function getProductByName(name) {
  return DB.products.find(p => p.name === name) || null;
}
function soAddress(s) {
  return s?.shipping_addr || s?.addr || '';
}
function setOptions(id, items, valueKey='name', labelFn=null, placeholder='-- Select --') {
  const el = document.getElementById(id);
  if (!el) return;
  const cur = el.value;
  const html = [`<option value="">${placeholder}</option>`].concat(items.map(item => {
    const value = item[valueKey] ?? '';
    const label = labelFn ? labelFn(item) : value;
    return `<option value="${esc(value)}">${esc(label)}</option>`;
  }));
  el.innerHTML = html.join('');
  if (cur) el.value = cur;
}
function fillPartyDDs() {
  setOptions('wo-vendor', DB.vendors.filter(v => entityType(v) === 'Vendor' && (!v.category || v.category === 'Services' || v.category === 'Logistics' || v.category === 'Machinery' || v.category === 'Consumables' || v.category === 'Raw Material')), 'name', v => `${v.name}${v.category ? ' - ' + v.category : ''}`, '-- Select service vendor --');
  setOptions('so-buyer', DB.buyers.filter(v => (v.status || 'Active') === 'Active'), 'name', v => `${v.name}${v.gst ? ' - ' + v.gst : ''}`, '-- Select buyer --');
  setOptions('inv2-buyer', DB.buyers.filter(v => (v.status || 'Active') === 'Active'), 'name', v => `${v.name}${v.gst ? ' - ' + v.gst : ''}`, '-- Select buyer --');
  setOptions('inv2-company', DB.company_details.filter(v => (v.status || 'Active') === 'Active'), 'name', v => v.name, '-- Select company --');
  setOptions('ib-vendor', DB.vendors.filter(v => entityType(v) === 'Vendor'), 'name', v => `${v.name}${v.gst ? ' - ' + v.gst : ''}`, '-- Select vendor --');
  const soEl = document.getElementById('so-wo');
  if (soEl) {
    const cur = soEl.value;
    soEl.innerHTML = '<option value="">-- None --</option>' + DB.work_orders.map(w => `<option value="${esc(w.wono)}">${esc(w.wono)} - ${esc(w.product || w.service_details || '')}</option>`).join('');
    if (cur) soEl.value = cur;
  }
  const dcEl = document.getElementById('dc-so');
  if (dcEl) {
    const cur = dcEl.value;
    dcEl.innerHTML = DB.sales_orders.filter(s => s.status !== 'Delivered').map(s => `<option value="${esc(s.sono)}">${esc(s.sono)} - ${esc(s.customer)}</option>`).join('');
    if (cur) dcEl.value = cur;
  }
  const invSoEl = document.getElementById('inv2-so');
  if (invSoEl) {
    const cur = invSoEl.value;
    invSoEl.innerHTML = '<option value="">-- None --</option>' + DB.sales_orders.map(s => `<option value="${esc(s.sono)}">${esc(s.sono)} - ${esc(s.customer)}</option>`).join('');
    if (cur) invSoEl.value = cur;
  }
  const ibPoEl = document.getElementById('ib-po');
  if (ibPoEl) {
    const cur = ibPoEl.value;
    ibPoEl.innerHTML = '<option value="">-- None --</option>' + DB.purchase_orders.map(p => `<option value="${esc(p.pono)}">${esc(p.pono)} - ${esc(p.supplier || '')}</option>`).join('');
    if (cur) ibPoEl.value = cur;
  }
  toggleWOServiceFields();
  syncInvoiceShipping();
}

function toggleWOServiceFields() {
  const isExternal = V('wo-type') === 'External Service';
  const vendor = document.getElementById('wo-vendor');
  const wrap = document.getElementById('wo-service-wrap');
  if (vendor) vendor.disabled = !isExternal;
  if (wrap) wrap.style.display = isExternal ? 'block' : 'none';
}

function autofillSalesBuyer() {
  const buyer = getBuyerByName(V('so-buyer'));
  if (!buyer) return;
  if (!V('so-cust')) SV('so-cust', buyer.name);
  SV('so-gst', buyer.gst || '');
  if (!V('so-addr')) SV('so-addr', buyer.address || '');
}

function invoiceDefaultCompany() {
  return getCompanyByName(V('inv2-company')) || DB.company_details.find(v => (v.status || 'Active') === 'Active') || getEntities('Our Company')[0] || null;
}

function syncInvoiceShipping() {
  const same = document.getElementById('inv2-same');
  const bill = document.getElementById('inv2-billaddr');
  const ship = document.getElementById('inv2-shipaddr');
  if (!same || !ship || !bill) return;
  if (same.checked) {
    ship.value = bill.value;
    ship.setAttribute('readonly', 'readonly');
    ship.classList.add('is-locked');
  } else {
    ship.removeAttribute('readonly');
    ship.classList.remove('is-locked');
  }
}

function autofillInvoiceBuyer() {
  const buyer = getBuyerByName(V('inv2-buyer'));
  if (!buyer) return;
  SV('inv2-party', buyer.name);
  SV('inv2-cgst', buyer.gst || '');
  SV('inv2-billaddr', buyer.address || '');
  syncInvoiceShipping();
}

function autofillInvoiceCompany() {
  const company = invoiceDefaultCompany();
  const notes = V('inv2-notes');
  if (company && !notes.includes('Company GST:')) {
    const extra = [notes, `Company GST: ${company.gst || '--'}`].filter(Boolean).join('\n');
    SV('inv2-notes', extra.trim());
  }
}

function getInvoiceItems(inv) {
  if (inv?.items_json) {
    const parsed = jParse(inv.items_json, []);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  }
  if (parseFloat(inv?.amt || 0) > 0) {
    return [{
      product: inv.product || '',
      description: inv.product || 'Invoice amount',
      qty: 1,
      price: parseFloat(inv.amt || 0),
      gst: parseFloat(inv.gst || 0)
    }];
  }
  return [{
    product:'',
    description:'',
    qty:1,
    price:0,
    gst:18
  }];
}

function invoiceLineMarkup(item={}, idx=0) {
  const lineTotal = (parseFloat(item.qty || 0) * parseFloat(item.price || 0));
  return `<div class="line-item" data-inv2-line="${idx}">
    <div class="line-grid">
      <div class="line-col">
        <label>Product</label>
        <select data-inv2-line-product onchange="autofillInvoiceLine(${idx})"></select>
      </div>
      <div class="line-col">
        <label>Description</label>
        <input type="text" id="inv2-desc-${idx}" value="${esc(item.description || '')}" placeholder="Product description / HSN note"/>
      </div>
      <div class="line-col">
        <label>Qty</label>
        <input type="number" id="inv2-qty-${idx}" min="0" value="${esc(item.qty ?? 1)}" oninput="updateInvoiceTotals()"/>
      </div>
      <div class="line-col">
        <label>Rate (Rs)</label>
        <input type="number" id="inv2-price-${idx}" min="0" value="${esc(item.price ?? 0)}" oninput="updateInvoiceTotals()"/>
      </div>
      <div class="line-col">
        <label>GST %</label>
        <select id="inv2-gst-${idx}" onchange="updateInvoiceTotals()">
          <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
        </select>
      </div>
      <div class="line-col">
        <label>Line Total</label>
        <div class="line-total" id="inv2-ltot-${idx}">${fmtM(lineTotal)}</div>
      </div>
      <div class="line-col">
        <button type="button" class="btn bD sm" onclick="removeInvoiceLine(${idx})">Remove</button>
      </div>
    </div>
  </div>`;
}

function renderInvoiceLines(items=null) {
  const wrap = document.getElementById('inv2-lines');
  if (!wrap) return;
  const data = items && items.length ? items : getInvoiceItems({});
  wrap.innerHTML = data.map((item, idx) => invoiceLineMarkup(item, idx)).join('');
  fillProdDDs();
  data.forEach((item, idx) => {
    const prodSel = document.querySelector(`[data-inv2-line="${idx}"] [data-inv2-line-product]`);
    if (prodSel) prodSel.value = item.product || '';
    const gstSel = document.getElementById(`inv2-gst-${idx}`);
    if (gstSel) gstSel.value = String(item.gst ?? 18);
  });
  updateInvoiceTotals();
}

function collectInvoiceLines() {
  return [...document.querySelectorAll('[data-inv2-line]')].map((row, idx) => {
    const product = row.querySelector('[data-inv2-line-product]')?.value || '';
    const description = V(`inv2-desc-${idx}`);
    const qty = parseFloat(V(`inv2-qty-${idx}`) || '0');
    const price = parseFloat(V(`inv2-price-${idx}`) || '0');
    const gst = parseFloat(V(`inv2-gst-${idx}`) || '0');
    return { product, description, qty, price, gst, line_total: qty * price };
  }).filter(item => item.product || item.description || item.qty || item.price);
}

window.addInvoiceLine = () => {
  const items = collectInvoiceLines();
  items.push({ product:'', description:'', qty:1, price:0, gst:18 });
  renderInvoiceLines(items);
};
window.removeInvoiceLine = idx => {
  const items = collectInvoiceLines().filter((_, i) => i !== idx);
  renderInvoiceLines(items.length ? items : null);
};
window.autofillInvoiceLine = idx => {
  const row = document.querySelector(`[data-inv2-line="${idx}"]`);
  if (!row) return;
  const product = getProductByName(row.querySelector('[data-inv2-line-product]')?.value || '');
  if (!product) { updateInvoiceTotals(); return; }
  const desc = document.getElementById(`inv2-desc-${idx}`);
  const price = document.getElementById(`inv2-price-${idx}`);
  const gst = document.getElementById(`inv2-gst-${idx}`);
  if (desc && !desc.value) desc.value = product.description || product.name;
  if (price && (!price.value || parseFloat(price.value) === 0)) price.value = product.price || 0;
  if (gst) gst.value = String(product.gst ?? 18);
  updateInvoiceTotals();
};
window.updateInvoiceTotals = () => {
  const items = collectInvoiceLines();
  let base = 0, tax = 0;
  items.forEach((item, idx) => {
    const lineBase = parseFloat(item.qty || 0) * parseFloat(item.price || 0);
    const lineTax = lineBase * (parseFloat(item.gst || 0) / 100);
    base += lineBase;
    tax += lineTax;
    const el = document.getElementById(`inv2-ltot-${idx}`);
    if (el) el.textContent = fmtM(lineBase);
  });
  const total = base + tax;
  const box = document.getElementById('inv2-totals');
  if (box) box.innerHTML = `<div>Base Amount<br><strong>${fmtM(base)}</strong></div><div>Total GST<br><strong>${fmtM(tax)}</strong></div><div>Grand Total<br><strong>${fmtM(total)}</strong></div>`;
  return { base, tax, total, items };
};

window.autofillInvoiceSO = () => {
  const so = DB.sales_orders.find(s => s.sono === V('inv2-so'));
  if (!so) return;
  if (so.buyer) SV('inv2-buyer', so.buyer);
  if (so.customer) SV('inv2-party', so.customer);
  if (so.gst) SV('inv2-cgst', so.gst);
  if (so.addr) {
    if (!V('inv2-billaddr')) SV('inv2-billaddr', soAddress(so));
    if (!document.getElementById('inv2-same')?.checked) SV('inv2-shipaddr', soAddress(so));
  }
  syncInvoiceShipping();
  renderInvoiceLines([{
    product: so.product || '',
    description: so.product || '',
    qty: parseFloat(so.qty || 0),
    price: parseFloat(so.price || 0),
    gst: parseFloat(getProductByName(so.product)?.gst ?? 18)
  }]);
};
window.toggleWOServiceFields = toggleWOServiceFields;
window.autofillSalesBuyer = autofillSalesBuyer;
window.syncInvoiceShipping = syncInvoiceShipping;
window.autofillInvoiceBuyer = autofillInvoiceBuyer;
window.autofillInvoiceCompany = autofillInvoiceCompany;

// ---
// AUTH
// ---
window.doLogin = async () => {
  const email = V('lemail'), pass = V('lpass');
  const btn  = document.getElementById('lbtn');
  const err  = document.getElementById('lerr');
  const inf  = document.getElementById('linfo');
  err.style.display = 'none';
  inf.style.display = 'block';
  inf.textContent   = 'Signing in...';
  btn.disabled      = true;
  btn.textContent   = 'Signing in...';
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) {
    inf.style.display = 'none';
    btn.disabled      = false;
    btn.textContent   = 'SIGN IN';
    const msgs = {
      'Invalid login credentials': 'Invalid email or password.',
      'Email not confirmed':       'Please confirm your email first.'
    };
    err.textContent   = msgs[error.message] || error.message;
    err.style.display = 'block';
  }
};
document.getElementById('lpass').addEventListener('keydown', e => { if (e.key === 'Enter') window.doLogin(); });

window.showForgot = async () => {
  const email = V('lemail');
  if (!email) { toast('Enter your email address first', 'e'); return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
  if (error) toast('Error: ' + error.message, 'e');
  else toast('Password reset email sent to ' + email);
};

window.doLogout = async () => {
  try{if(typeof logAudit==='function')await logAudit('LOGOUT','auth',CU?.id||'',CU?.email||'');}catch(e){}
  SUBS.forEach(s => { try { s.unsubscribe(); } catch(e) {} });
  SUBS = [];
  await sb.auth.signOut();
};

// Auth state listener
let isInitialized = false;
let activeSessionKey = null;
let erpBooted = false;

async function initSession(session) {
  const sessionKey = session?.access_token || session?.user?.id || '';
  if (!session?.user) {
    isInitialized = false;
    activeSessionKey = null;
    CU = null;
    if (typeof stopIdleDetection === 'function') stopIdleDetection();
    document.getElementById('erp').style.display = 'none';
    document.getElementById('login').classList.add('show');
    hideLoader();
    const b = document.getElementById('lbtn');
    if (b) { b.disabled = false; b.textContent = 'SIGN IN'; }
    return;
  }
  if (isInitialized && activeSessionKey === sessionKey) return;

  isInitialized = true;
  activeSessionKey = sessionKey;
  showLoader('Loading your profile...');

  const fallbackProfile = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.email,
    role: 'viewer',
    dept: 'Management',
    active: true
  };

  try {
    const profilePromise = sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ timedOut:true }), 15000));
    const result = await Promise.race([profilePromise, timeoutPromise]);

    if (result?.timedOut) {
      CU = fallbackProfile;
      toast('Profile load is slow. Continuing with saved session...', 'i');
    } else if (result?.data) {
      CU = result.data;
    } else {
      await sb.from('profiles').upsert(fallbackProfile);
      CU = fallbackProfile;
    }
  } catch (err) {
    CU = fallbackProfile;
    toast('Profile check failed. Continuing with saved session...', 'w');
  }

  document.getElementById('login').classList.remove('show');
  document.getElementById('erp').style.display = 'flex';
  hideLoader();
  if (erpBooted) return;
  erpBooted = true;
  initERP();
}

sb.auth.onAuthStateChange(async (event, session) => {
  const shouldInit = event === 'INITIAL_SESSION' || event === 'SIGNED_IN';
  const isSignOut  = event === 'SIGNED_OUT';

  if (isSignOut) {
    isInitialized = false;
    activeSessionKey = null;
    erpBooted = false;
    CU = null;
    if (typeof stopIdleDetection === 'function') stopIdleDetection();
    document.getElementById('loader').style.display  = 'none';
    document.getElementById('erp').style.display     = 'none';
    document.getElementById('login').classList.add('show');
    const b = document.getElementById('lbtn');
    if (b) { b.disabled = false; b.textContent = 'SIGN IN'; }
    return;
  }

  if (!shouldInit) return;
  await initSession(session);
});

window.addEventListener('load', async () => {
  try {
    const { data } = await sb.auth.getSession();
    if (data?.session?.user) await initSession(data.session);
  } catch(e) {}
});// ---
// LOAD ALL DATA + REALTIME
// ---
async function loadAllData() {
  showLoader('Loading ERP data...');
  const tables = Object.keys(DB);
  await Promise.all(tables.map(async tbl => {
    const { data } = await sb.from(tbl).select('*').order('created_at', { ascending: false });
    DB[tbl] = data || [];
  }));
  hideLoader();
  fillProdDDs();
  renderDash();
  buildSB();

  // Realtime subscriptions for all tables
  tables.forEach(tbl => {
    const sub = sb.channel(tbl)
      .on('postgres_changes', { event: '*', schema: 'public', table: tbl }, async () => {
        const { data } = await sb.from(tbl).select('*').order('created_at', { ascending: false });
        DB[tbl] = data || [];
        fillProdDDs();
        buildSB();
        const cur = document.querySelector('.tc.on');
        if (cur) renderMod(cur.id.replace('tab-',''));
        renderDash();
      })
      .subscribe();
    SUBS.push(sub);
  });
}

// ---
// SUPABASE CRUD
// ---
async function dbInsert(tbl, data) {
  setSyncB('saving');
  data.created_by = CU?.id;
  const { error } = await sb.from(tbl).insert(data);
  if (error) { setSyncB('err'); toast('Save error: ' + error.message, 'e'); return false; }
  await refreshTable(tbl);
  setSyncB('idle');
  return true;
}
async function dbUpdate(tbl, id, data) {
  setSyncB('saving');
  data.updated_at = new Date().toISOString();
  const { error } = await sb.from(tbl).update(data).eq('id', id);
  if (error) { setSyncB('err'); toast('Update error: ' + error.message, 'e'); return false; }
  await refreshTable(tbl);
  setSyncB('idle');
  return true;
}
async function dbDelete(tbl, id) {
  setSyncB('saving');
  const { error } = await sb.from(tbl).delete().eq('id', id);
  if (error) { setSyncB('err'); toast('Delete error: ' + error.message, 'e'); return false; }
  await refreshTable(tbl);
  setSyncB('idle');
  return true;
}
async function refreshTable(tbl) {
  if (!Object.prototype.hasOwnProperty.call(DB, tbl)) return;
  const { data, error } = await sb.from(tbl).select('*').order('created_at', { ascending: false });
  if (error) return;
  DB[tbl] = data || [];
  fillProdDDs();
  buildSB();
  const cur = document.querySelector('.tc.on');
  if (cur) renderMod(cur.id.replace('tab-',''));
  renderDash();
}

// ---
// ERP INIT
// ---
function initERP() {
  const r = ROLES[CU.role] || ROLES.viewer;
  const av = document.getElementById('hav');
  av.textContent = ini(CU.name || CU.email || '?');
  av.style.background = r.bg; av.style.color = r.color;
  document.getElementById('hnm').textContent = (CU.name || CU.email || '').split(' ')[0];
  const rb = document.getElementById('hrb');
  rb.textContent = r.label; rb.style.background = r.bg; rb.style.color = r.color;
  rb.style.border = '1px solid ' + r.color + '25';
  document.getElementById('huser').onclick = openProf;

  window.addEventListener('online',  () => { document.getElementById('offline-bar').style.display='none'; setSyncB('idle'); });
  window.addEventListener('offline', () => { document.getElementById('offline-bar').style.display='block'; setSyncB('err'); });

  setInterval(tick, 1000); tick();
  buildSB();
  loadAllData();
  goTab('dashboard');
  setTimeout(()=>logAudit('LOGIN','auth',CU?.id||'',CU?.email||''),2000);
}

function tick() {
  const e = document.getElementById('hclock');
  if (e) e.textContent = new Date().toLocaleString('en-IN', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', second:'2-digit'});
}

// ---
// SIDEBAR
// ---
function buildSB() {
  const allowed = NAV_ACCESS[CU?.role||'viewer'] || [];
  const sb = document.getElementById('sb');
  sb.innerHTML = '';
  NAVDEF.forEach(n => {
    if (n.s) { const d = document.createElement('div'); d.className='ns'; d.textContent=n.s; sb.appendChild(d); return; }
    const ok = allowed.includes(n.id);
    const d  = document.createElement('div');
    d.className = 'ni' + (ok ? '' : ' locked');
    d.id = 'nav-' + n.id;
    let badge = '';
    if (n.bwo)   { const c=DB.work_orders.filter(w=>w.status!=='Completed').length; if(c) badge=`<span class="nbg">${c}</span>`; }
    if (n.binv)  { const c=DB.inventory.filter(i=>parseFloat(i.stock)<=parseFloat(i.reorder)).length; if(c) badge=`<span class="nbg r">${c}</span>`; }
    if (n.binv2) { const c=DB.invoices.filter(i=>i.status==='Unpaid'||i.status==='Overdue').length; if(c) badge=`<span class="nbg r">${c}</span>`; }
    if (n.bfg)   { const c=DB.approvals.filter(a=>a.status==='Pending').length; if(c) badge=`<span class="nbg r">${c}</span>`; }
    d.innerHTML = `<span class="ni-ic">${n.ic}</span><span class="ni-lb">${n.lb}</span>${badge}${ok?'':`<span style="margin-left:auto;opacity:.25;font-size:12px">X</span>`}`;
    if (ok) d.onclick = () => goTab(n.id);
    sb.appendChild(d);
  });
}

window.goTab = id => {
  document.querySelectorAll('.tc').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
  const tab = document.getElementById('tab-' + id); if (tab) tab.classList.add('on');
  const nav = document.getElementById('nav-' + id); if (nav) nav.classList.add('on');
  const L = {dashboard:'Dashboard',production:'Work Orders',machines:'Machines',quality:'Quality Control',inventory:'Inventory',fg:'Finished Goods',purchase:'Purchase Orders',sales:'Sales Orders',dispatch:'Dispatch',invoices:'Invoices',ibill:'Inward Bills',vendors:'Vendors',buyers:'Buyer Master',company:'Our Company',products:'Product Master',reports:'Analytics',audit:'Audit Log',users:'User Management'};
  document.getElementById('hmod').textContent = '// ' + (L[id] || id);
  renderMod(id);
};

function renderMod(id) {
  const fns = {
    dashboard:renderDash, production:renderWO, machines:renderMach, quality:renderQC,
    inventory:renderInv,  purchase:renderPO,   sales:renderSO,      dispatch:renderDC,
    invoices:renderInv2,  ibill:renderIB,      vendors:renderVnd,   buyers:renderBuyers, company:renderCompany, products:renderProducts,
    reports:renderRep,    users:renderUsers,   fg:renderFG,
    audit:renderAudit
  };
  if (fns[id]) fns[id]();
}

window.refreshAll = () => { renderDash(); toast('Dashboard refreshed', 'i'); };

// --- MOBILE ---

async function logAudit(action, module, recordId, recordRef, oldVal, newVal) {
  try {
    await sb.from('audit_logs').insert({
      user_id: CU?.id, user_email: CU?.email, user_name: CU?.name||CU?.email,
      action, module, record_id: recordId, record_ref: recordRef,
      old_value: oldVal?JSON.stringify(oldVal):null,
      new_value: newVal?JSON.stringify(newVal):null,
    });
  } catch(e) {}
}

function renderAudit() {
  const tbl = document.getElementById('audit-tbl'); if(!tbl) return;
  const srch = (document.getElementById('audit-srch')?.value||'').toLowerCase();
  const flt  = document.getElementById('audit-flt')?.value||'';
  const logs = DB.audit_logs
    .filter(l=>(!flt||l.action===flt)&&(!srch||(l.user_name+l.module+l.record_ref+l.action).toLowerCase().includes(srch)))
    .slice(0,100);
  tbl.innerHTML = logs.map(l=>{
    const ac={CREATE:'pg',UPDATE:'pb',DELETE:'pr',LOGIN:'pgr',LOGOUT:'pgr',APPROVE:'pg',REJECT:'pr',REQUEST_APPROVAL:'po'}[l.action]||'pgr';
    const dt=l.created_at?new Date(l.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'--';
    return `<tr><td class="mn" style="color:var(--mu);font-size:11px">${dt}</td><td style="font-weight:600">${l.user_name||l.user_email||'--'}</td><td><span class="pill ${ac}">${l.action}</span></td><td class="mn" style="color:var(--ac)">${l.module||'--'}</td><td class="mn">${l.record_ref||'--'}</td><td style="font-size:11px;color:var(--mu);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.new_value||''}</td></tr>`;
  }).join('')||'<tr><td colspan="6"><div class="empty"><div class="empty-tt">No audit logs yet</div><div class="empty-st">Actions appear here as ERP is used</div></div></td></tr>';
}

function renderFG() {
  const ed = canEdit('fg');
  const del = canDelete();
  const roEl = document.getElementById('fg-ro'); if(roEl) roEl.innerHTML = ed?'':ron();
  const fcEl = document.getElementById('fg-fc'); if(fcEl) fcEl.style.display = ed?'block':'none';
  const ps = document.getElementById('fg-prod');
  if(ps) ps.innerHTML = DB.products.filter(p=>p.active===true).map(p=>`<option>${p.name}</option>`).join('');
  const ws = document.getElementById('fg-wo');
  if(ws) ws.innerHTML = '<option value="">-- None --</option>'+DB.work_orders.map(w=>`<option value="${w.wono}">${w.wono} - ${w.product}</option>`).join('');
  const total=DB.finished_goods.reduce((a,g)=>a+parseFloat(g.qty||0),0);
  const avail=DB.finished_goods.filter(g=>g.status==='Available').reduce((a,g)=>a+parseFloat(g.qty||0),0);
  const val  =DB.finished_goods.reduce((a,g)=>a+(parseFloat(g.qty||0)*parseFloat(g.cost||0)),0);
  const se=document.getElementById('fg-stat-total');if(se)se.textContent=total.toLocaleString()+' pcs';
  const ae=document.getElementById('fg-stat-avail');if(ae)ae.textContent=avail.toLocaleString()+' pcs';
  const ve=document.getElementById('fg-stat-val');  if(ve)ve.textContent='Rs '+val.toLocaleString('en-IN',{maximumFractionDigits:0});
  const srch=(document.getElementById('fg-srch')?.value||'').toLowerCase();
  const flt =document.getElementById('fg-flt')?.value||'';
  const tbl =document.getElementById('fg-tbl');if(!tbl)return;
  tbl.innerHTML=DB.finished_goods
    .filter(g=>(!flt||g.status===flt)&&(!srch||(g.product+g.batch+(g.wo_ref||'')).toLowerCase().includes(srch)))
    .map(g=>{
      const acts=ed?`<button class="btn bO sm" onclick="editFG('${g.id}')">Edit</button><button class="btn bG sm" onclick="openUpd('finished_goods','${g.id}','fg')">Status</button>${del?`<button class="btn bD sm" onclick="delRec('finished_goods','${g.id}')">Del</button>`:''}`:'';
      return `<tr><td style="font-weight:600">${g.product}</td><td class="mn" style="color:var(--ac)">${g.batch||'--'}</td><td class="mn">${g.qty} ${g.unit}</td><td class="mn">${fmtM(parseFloat(g.qty||0)*parseFloat(g.cost||0))}</td><td>${g.location||'Main Warehouse'}</td><td class="mn">${g.wo_ref||'--'}</td><td class="mn">${g.qc_batch||'--'}</td><td>${pill(g.status)}</td><td><div style="display:flex;gap:4px">${acts}</div></td></tr>`;
    }).join('')||'<tr><td colspan="9"><div class="empty"><div class="empty-tt">No Finished Goods</div></div></td></tr>';
}

window.toggleSB = () => {
  document.getElementById('sb').classList.toggle('open');
  document.getElementById('sb-overlay').classList.toggle('open');
};
window.closeSB = () => {
  document.getElementById('sb').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('open');
};
document.addEventListener('click', e => { if (e.target.closest('.ni') && window.innerWidth <= 768) setTimeout(closeSB, 150); });
window.addEventListener('resize', () => { if (window.innerWidth > 768) closeSB(); });

// ---
// DASHBOARD
// ---
function renderDash() {
  const aw  = DB.work_orders.filter(w => w.status !== 'Completed').length;
  const li  = DB.inventory.filter(i => parseFloat(i.stock) <= parseFloat(i.reorder)).length;
  const qcT = DB.qc_records.reduce((a,q) => a + parseFloat(q.sample||0), 0);
  const qcP = DB.qc_records.reduce((a,q) => a + parseFloat(q.pass||0), 0);
  const tp  = DB.work_orders.reduce((a,w) => a + parseFloat(w.produced||0), 0);
  const kEl = document.getElementById('d-kpi'); if (!kEl) return;
  kEl.innerHTML =
    `<div class="kc g"><div class="kc-stripe"></div><div class="kl">Total Produced</div><div class="kv" style="color:var(--gn)">${tp.toLocaleString()}</div><div class="ks">pcs across active WOs</div></div>` +
    `<div class="kc o"><div class="kc-stripe"></div><div class="kl">Active Work Orders</div><div class="kv" style="color:var(--ac)">${aw}</div><div class="ks">${DB.work_orders.filter(w=>w.status==='Delayed').length} delayed</div></div>` +
    `<div class="kc b"><div class="kc-stripe"></div><div class="kl">Low Stock Items</div><div class="kv" style="color:var(--bl)">${li}</div><div class="ks">below reorder level</div></div>` +
    `<div class="kc p"><div class="kc-stripe"></div><div class="kl">QC Pass Rate</div><div class="kv" style="color:var(--pu)">${qcT>0?((qcP/qcT)*100).toFixed(1)+'%':'--'}</div><div class="ks">IEC 61952 / IS 14772</div></div>`;
  let alerts = '';
  DB.inventory.filter(i=>parseFloat(i.stock)<=parseFloat(i.min)).forEach(i => alerts+=`<div class="al ald"><span class="al-i">!!</span><strong>CRITICAL:</strong> ${i.name}  only ${i.stock} ${i.unit} remaining. Raise PO now.</div>`);
  DB.inventory.filter(i=>parseFloat(i.stock)>parseFloat(i.min)&&parseFloat(i.stock)<=parseFloat(i.reorder)).forEach(i => alerts+=`<div class="al alw"><span class="al-i">!</span><strong>Low stock:</strong> ${i.name} at ${i.stock}/${i.reorder} ${i.unit}.</div>`);
  DB.work_orders.filter(w=>w.status==='Delayed').forEach(w => alerts+=`<div class="al ali"><span class="al-i">SO</span>Work Order <strong>${w.wono}</strong> (${w.product}) is delayed.</div>`);
  const aEl = document.getElementById('d-alerts'); if(aEl) aEl.innerHTML = alerts;
  const woEl = document.getElementById('d-wo');
  if(woEl) woEl.innerHTML = DB.work_orders.filter(w=>w.status!=='Completed').slice(0,4).map(w => {
    const pct = Math.round((parseFloat(w.produced||0)/Math.max(parseFloat(w.qty||1),1))*100);
    const col = pct>70?'var(--gn)':pct>40?'var(--ac)':'var(--rd)';
    return `<tr><td class="mn" style="color:var(--ac);font-weight:600">${w.wono}</td><td>${w.product}</td><td><div style="display:flex;align-items:center;gap:8px"><div class="pbar" style="width:80px"><div class="pfill" style="width:${pct}%;background:${col}"></div></div><span class="mn" style="font-size:10px;color:var(--t2)">${pct}%</span></div></td><td>${pill(w.status)}</td></tr>`;
  }).join('') || '<tr><td colspan="4"><div class="empty" style="padding:20px"><div class="empty-tt">No active work orders</div></div></td></tr>';
  const invEl = document.getElementById('d-inv');
  if(invEl) invEl.innerHTML = DB.inventory.slice(0,6).map(i => {
    const pct = Math.min(100,Math.round((parseFloat(i.stock)/Math.max(parseFloat(i.reorder)*1.5,1))*100));
    const col = parseFloat(i.stock)<=parseFloat(i.min)?'var(--rd)':parseFloat(i.stock)<=parseFloat(i.reorder)?'var(--ac)':'var(--gn)';
    return `<div class="ir"><span style="flex:1;font-size:12px">${i.name}</span><div class="pbar" style="width:80px;flex-shrink:0"><div class="pfill" style="width:${pct}%;background:${col}"></div></div><span class="mn" style="font-size:11px;color:${col};flex:0 0 60px;text-align:right">${i.stock} ${i.unit}</span></div>`;
  }).join('') || '<div class="empty" style="padding:20px"><div class="empty-tt">No inventory</div></div>';
  const qcEl = document.getElementById('d-qc');
  if(qcEl) qcEl.innerHTML = DB.qc_records.slice(0,4).map(q => {
    const pct = parseFloat(q.sample)>0?((parseFloat(q.pass||0)/parseFloat(q.sample))*100).toFixed(0):'0';
    return `<tr><td class="mn" style="color:var(--ac)">${q.batchid||q.id.slice(-8)}</td><td>${q.product}</td><td class="mn">${pct}%</td><td>${pill(pct>=95?'Passed':pct>=80?'Conditional':'Failed')}</td></tr>`;
  }).join('') || '<tr><td colspan="4"><div class="empty" style="padding:20px"><div class="empty-tt">No QC records</div></div></td></tr>';
  const dcEl = document.getElementById('d-dc');
  if(dcEl) dcEl.innerHTML = DB.dispatches.slice(0,4).map(d => `<tr><td class="mn" style="color:var(--ac)">${d.dcno||d.id.slice(-8)}</td><td>${d.customer}</td><td>${d.qty} pcs</td><td>${pill(d.status)}</td></tr>`).join('') || '<tr><td colspan="4"><div class="empty" style="padding:20px"><div class="empty-tt">No dispatches</div></div></td></tr>';
}

// ---
// WORK ORDERS
// ---
function renderWO() {
  const ed = canEdit('production');
  const del = canDelete();
  const roEl = document.getElementById('wo-ro'); if(roEl) roEl.innerHTML = ed ? '' : ron();
  const fcEl = document.getElementById('wo-fc'); if(fcEl) fcEl.style.display = ed ? 'block' : 'none';
  fillProdDDs();
  const srch = (V('wo-srch')||'').toLowerCase(), flt = V('wo-flt');
  const tbl  = document.getElementById('wo-tbl'); if(!tbl) return;
  tbl.innerHTML = DB.work_orders
    .filter(w => (!flt||w.status===flt) && (!srch||(w.wono+(w.product||'')+(w.vendor||'')+(w.service_details||'')+w.status).toLowerCase().includes(srch)))
    .map(w => {
      const apprBadge = approvalBadge(w.id,'work_orders',w.wono,ed);
      const acts = ed ? `<button class="btn bO sm" onclick="editWO('${w.id}')">Edit</button><button class="btn bG sm" onclick="openUpd('work_orders','${w.id}','wo')">Update</button>${del?`<button class="btn bD sm" onclick="delRec('work_orders','${w.id}')">Del</button>`:''}` : '';
      return `<tr><td class="mn" style="color:var(--ac);font-weight:600">${w.wono}</td><td>${esc(w.product || w.service_details || '--')}${w.output_required ? `<div class="muted-help">Output: ${esc(w.output_required)}</div>` : ''}</td><td>${pill(w.order_type || 'In-house')}</td><td>${esc(w.vendor || '--')}</td><td class="mn">${w.qty}</td><td>${fmtD(w.start_date)}</td><td>${fmtD(w.end_date)}</td><td>${pill(w.status)}</td><td><div style="display:flex;gap:4px;flex-wrap:wrap">${apprBadge}${acts}</div></td></tr>`;
    }).join('') || '<tr><td colspan="9"><div class="empty"><div class="empty-ic">WO</div><div class="empty-tt">No Work Orders</div><div class="empty-st">Create one above</div></div></td></tr>';
}
window.saveWO = async () => {
  const eid = V('wo-eid'), qty = parseInt(V('wo-qty')), start = V('wo-start'), end = V('wo-end');
  if (!qty||!start||!end) { toast('Fill Qty, Start and Target dates','e'); return; }
  const data = {
    product:V('wo-prod'),
    qty,
    produced:0,
    start_date:start,
    end_date:end,
    priority:V('wo-pri'),
    shift:V('wo-shift'),
    status:'Queued',
    remarks:V('wo-rem'),
    order_type:V('wo-type') || 'In-house',
    vendor:V('wo-vendor'),
    service_details:V('wo-service'),
    output_required:V('wo-output')
  };
  if (eid) {
    delete data.produced;
    const old = DB.work_orders.find(x=>x.id===eid);
    if (await dbUpdate('work_orders', eid, data)) {
      await logAudit('UPDATE','work_orders',eid,old?.wono||eid,old,data);
      toast('Work order updated');
    }
  } else {
    const mx = DB.work_orders.reduce((m,w) => Math.max(m, parseInt((w.wono||'WO-0').split('-')[1])||0), 43);
    data.wono = 'WO-' + String(mx+1).padStart(3,'0');
    data.status = 'Pending Approval';
    if (await dbInsert('work_orders', data)) {
      await logAudit('CREATE','work_orders','new',data.wono,null,data);
      toast(data.wono + ' created  pending approval');
    }
  }
  clrForm('wo');
};
window.editWO = id => {
  const w = DB.work_orders.find(x=>x.id===id); if(!w) return;
  SV('wo-eid',id); SV('wo-prod',w.product); SV('wo-qty',w.qty);
  SV('wo-start',w.start_date); SV('wo-end',w.end_date); SV('wo-pri',w.priority);
  SV('wo-shift',w.shift); SV('wo-rem',w.remarks); SV('wo-type',w.order_type || 'In-house'); SV('wo-vendor',w.vendor); SV('wo-service',w.service_details); SV('wo-output',w.output_required);
  toggleWOServiceFields();
  document.getElementById('wo-ft').textContent = 'Edit ' + w.wono;
  document.getElementById('wo-sb').textContent = 'Update Work Order';
  document.getElementById('wo-fc').scrollIntoView({behavior:'smooth'});
};

// ---
// MACHINES
// ---
function renderMach() {
  const ed = canEdit('machines');
  const del = canDelete();
  const roEl = document.getElementById('mach-ro'); if(roEl) roEl.innerHTML = ed ? '' : ron();
  const fcEl = document.getElementById('mach-fc'); if(fcEl) fcEl.style.display = ed ? 'block' : 'none';
  const pc = {Running:'g',Idle:'o',Maintenance:'r'};
  const mc = {Running:'run',Idle:'idle',Maintenance:'maint'};
  const gEl = document.getElementById('mach-grid'); if(!gEl) return;
  gEl.innerHTML = DB.machines.map(m => {
    const oee = parseFloat(m.oee||0);
    const col = oee>=80?'var(--gn)':oee>=60?'var(--ac)':'var(--rd)';
    const acts = ed ? `<div class="mca"><button class="btn bO sm" style="flex:1" onclick="editMach('${m.id}')">Edit</button><button class="btn bG sm" onclick="openUpd('machines','${m.id}','mach')">Status</button>${del?`<button class="btn bD sm" onclick="delRec('machines','${m.id}')">Del</button>`:''}</div>` : '';
    return `<div class="mc ${mc[m.status]||''}"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div class="mcn">${m.name}</div><div class="mci">${m.eqid}  ${m.model}</div></div><span class="pill ${pc[m.status]||'pgr'}"><span class="pulse ${pc[m.status]||''}"></span>${m.status}</span></div>${m.param?`<div class="mcr"><span>Parameter</span><span class="mn">${m.param}</span></div>`:''}<div class="mcr"><span>OEE</span><span class="mn" style="color:${col};font-weight:600">${m.oee}%</span></div>${m.notes?`<div style="font-size:11px;color:var(--rd);margin-top:8px">${m.notes}</div>`:''}<div class="pbar" style="margin-top:10px"><div class="pfill" style="width:${m.oee}%;background:${col}"></div></div>${acts}</div>`;
  }).join('') || '<div style="padding:40px;text-align:center;color:var(--mu);grid-column:1/-1"><div class="empty-ic">MH</div><div class="empty-tt">No machines added</div></div>';
}
window.saveMach = async () => {
  const eid = V('mach-eid'), name = V('mach-name'), eqid = V('mach-eqid');
  if (!name||!eqid) { toast('Name and Equipment ID required','e'); return; }
  const data = { name, eqid, model:V('mach-model'), status:V('mach-stat'), oee:parseInt(V('mach-oee'))||0, param:V('mach-param'), notes:V('mach-notes') };
  if (eid) { if(await dbUpdate('machines',eid,data)) toast('Equipment updated'); }
  else     { if(await dbInsert('machines',data)) toast('Machine added'); }
  clrForm('mach');
};
window.editMach = id => {
  const m = DB.machines.find(x=>x.id===id); if(!m) return;
  SV('mach-eid',id); SV('mach-name',m.name); SV('mach-eqid',m.eqid); SV('mach-model',m.model);
  SV('mach-stat',m.status); SV('mach-oee',m.oee); SV('mach-param',m.param); SV('mach-notes',m.notes);
  document.getElementById('mach-ft').textContent = 'Edit  ' + m.name;
  document.getElementById('mach-fc').scrollIntoView({behavior:'smooth'});
};

// ---
// QUALITY CONTROL
// ---
function renderQC() {
  const ed = canEdit('quality');
  const del = canDelete();
  const roEl = document.getElementById('qc-ro'); if(roEl) roEl.innerHTML = ed ? '' : ron();
  const fcEl = document.getElementById('qc-fc'); if(fcEl) fcEl.style.display = ed ? 'block' : 'none';
  renderQCTestList();
  fillProdDDs();
  const sel = document.getElementById('qc-wo');
  if(sel) sel.innerHTML = DB.work_orders.map(w => `<option value="${w.wono}">${w.wono}  ${w.product}</option>`).join('');
  const qcT = DB.qc_records.reduce((a,q) => a+parseFloat(q.sample||0), 0);
  const qcP = DB.qc_records.reduce((a,q) => a+parseFloat(q.pass||0), 0);
  const rEl  = document.getElementById('qc-rate'); if(rEl) rEl.textContent = qcT>0?((qcP/qcT)*100).toFixed(1)+'%':'--';
  const rjEl = document.getElementById('qc-rej');  if(rjEl) rjEl.textContent = qcT-qcP;
  const cEl  = document.getElementById('qc-cnt');  if(cEl) cEl.textContent = DB.qc_records.length;
  const srch = (V('qc-srch')||'').toLowerCase();
  const tbl  = document.getElementById('qc-tbl'); if(!tbl) return;
  tbl.innerHTML = DB.qc_records
    .filter(q => !srch || (q.batchid+q.product+(q.wo||'')).toLowerCase().includes(srch))
    .map(q => {
      const fail = parseFloat(q.sample||0) - parseFloat(q.pass||0);
      const pct  = parseFloat(q.sample)>0 ? ((parseFloat(q.pass||0)/parseFloat(q.sample))*100).toFixed(0) : '0';
      const res  = pct>=95?'Passed':pct>=80?'Conditional':'Failed';
      const canCert = parseFloat(pct)>=80;
      const certBtn = canCert ? `<button class="btn bG sm" onclick="generateCert('${q.id}')">Cert</button>` : '';
      const acts = ed ? `<button class="btn bO sm" onclick="editQC('${q.id}')">Edit</button>${certBtn}${del?`<button class="btn bD sm" onclick="delRec('qc_records','${q.id}')">Del</button>`:''}` : certBtn;
      return `<tr><td class="mn" style="color:var(--ac)">${q.batchid||q.id.slice(-8)}</td><td>${q.product}</td><td class="mn">${q.wo||'--'}</td><td>${q.sample}</td><td style="color:var(--gn)">${q.pass}</td><td style="color:var(--rd)">${fail}</td><td class="mn">${pct}%</td><td>${esc(q.test||'--')}</td><td>${q.inspector||'--'}</td><td>${pill(res)}</td><td><div style="display:flex;gap:4px">${acts}</div></td></tr>`;
    }).join('') || '<tr><td colspan="11"><div class="empty"><div class="empty-ic">QC</div><div class="empty-tt">No QC Records</div></div></td></tr>';
}
window.saveQC = async () => {
  const eid = V('qc-eid'), sample = parseFloat(V('qc-sample')), pass = parseFloat(V('qc-pass'));
  if (!sample||isNaN(pass)) { toast('Sample size and pieces passed required','e'); return; }
  if (pass > sample) { toast('Pass count cannot exceed sample size','e'); return; }
  const tests = getSelectedQCTests();
  if (!tests.length) { toast('Select at least one QC test','e'); return; }
  const today = new Date().toISOString().slice(0,10);
  const generalNotes = V('qc-notes');
  const data = {
    wo:V('qc-wo'),
    product:V('qc-prod'),
    sample,
    pass,
    test:tests.map(t=>t.name).join(', '),
    inspector:V('qc-insp')||CU.name,
    notes:JSON.stringify({ tests, general_notes: generalNotes }),
    date:today
  };
  if (eid) { if(await dbUpdate('qc_records',eid,data)) toast('QC record updated'); }
  else { data.batchid = 'QC-'+today.replace(/-/g,'').slice(2)+'-'+String(DB.qc_records.length+1).padStart(2,'0'); if(await dbInsert('qc_records',data)) toast(data.batchid+' submitted'); }
  clrForm('qc');
};
window.editQC = id => {
  const q = DB.qc_records.find(x=>x.id===id); if(!q) return;
  const parsed = parseQCTests(q);
  const selected = parsed.tests.map(t => t.name);
  const remarksMap = Object.fromEntries(parsed.tests.map(t => [t.name, t.remarks || '']));
  SV('qc-eid',id); SV('qc-wo',q.wo); SV('qc-prod',q.product); SV('qc-sample',q.sample);
  SV('qc-pass',q.pass); SV('qc-insp',q.inspector); SV('qc-notes',parsed.general_notes || '');
  renderQCTestList(selected, remarksMap);
  document.getElementById('qc-ft').textContent = 'Edit  ' + (q.batchid||q.id);
  document.getElementById('qc-fc').scrollIntoView({behavior:'smooth'});
};

// ---
// INVENTORY
// ---
function renderInv() {
  const ed = canEdit('inventory');
  const del = canDelete();
  const roEl = document.getElementById('inv-ro'); if(roEl) roEl.innerHTML = ed ? '' : ron();
  const fcEl = document.getElementById('inv-fc'); if(fcEl) fcEl.style.display = ed ? 'block' : 'none';
  let alerts = '';
  DB.inventory.filter(i=>parseFloat(i.stock)<=parseFloat(i.min)).forEach(i => alerts+=`<div class="al ald"><span class="al-i">!!</span><strong>CRITICAL:</strong> ${i.name}  ${i.stock} ${i.unit} left</div>`);
  DB.inventory.filter(i=>parseFloat(i.stock)>parseFloat(i.min)&&parseFloat(i.stock)<=parseFloat(i.reorder)).forEach(i => alerts+=`<div class="al alw"><span class="al-i">!</span><strong>Low:</strong> ${i.name} below reorder level</div>`);
  const aEl = document.getElementById('inv-alerts'); if(aEl) aEl.innerHTML = alerts;
  const psel = document.getElementById('po-mat');
  if(psel) psel.innerHTML = DB.inventory.map(i=>`<option value="${i.name}">${i.name}</option>`).join('');
  const srch = (V('inv-srch')||'').toLowerCase();
  const tbl  = document.getElementById('inv-tbl'); if(!tbl) return;
  tbl.innerHTML = DB.inventory
    .filter(i => !srch || (i.name+i.code).toLowerCase().includes(srch))
    .map(i => {
      const st  = parseFloat(i.stock)<=parseFloat(i.min)?'Reorder Now':parseFloat(i.stock)<=parseFloat(i.reorder)?'Low':'OK';
      const col = parseFloat(i.stock)<=parseFloat(i.min)?'var(--rd)':parseFloat(i.stock)<=parseFloat(i.reorder)?'var(--ac)':'inherit';
      const acts = ed ? `<button class="btn bO sm" onclick="editInv('${i.id}')">Edit</button>${del?`<button class="btn bD sm" onclick="delRec('inventory','${i.id}')">Del</button>`:''}` : '';
      return `<tr><td style="font-weight:500">${i.name}</td><td class="mn">${i.code}</td><td>${i.unit}</td><td class="mn" style="color:${col}">${i.stock}</td><td class="mn">${i.reorder}</td><td class="mn">${i.min}</td><td class="mn">${fmtM(i.cost)}</td><td class="mn">${fmtM(parseFloat(i.stock||0)*parseFloat(i.cost||0))}</td><td>${pill(st)}</td><td><div style="display:flex;gap:4px">${acts}</div></td></tr>`;
    }).join('') || '<tr><td colspan="10"><div class="empty"><div class="empty-ic">IV</div><div class="empty-tt">No Inventory</div></div></td></tr>';
}
window.saveInv = async () => {
  const eid = V('inv-eid'), name = V('inv-name'), code = V('inv-code');
  if (!name||!code) { toast('Name and Code required','e'); return; }
  const data = { name, code, unit:V('inv-unit'), stock:parseFloat(V('inv-stock'))||0, reorder:parseFloat(V('inv-reorder'))||0, min:parseFloat(V('inv-min'))||0, cost:parseFloat(V('inv-cost'))||0, supplier:V('inv-sup') };
  if (eid) { if(await dbUpdate('inventory',eid,data)) toast('Material updated'); }
  else     { if(await dbInsert('inventory',data)) toast('Material added'); }
  clrForm('inv');
};
window.editInv = id => {
  const i = DB.inventory.find(x=>x.id===id); if(!i) return;
  SV('inv-eid',id); SV('inv-name',i.name); SV('inv-code',i.code); SV('inv-unit',i.unit);
  SV('inv-stock',i.stock); SV('inv-reorder',i.reorder); SV('inv-min',i.min); SV('inv-cost',i.cost); SV('inv-sup',i.supplier);
  document.getElementById('inv-ft').textContent = 'Edit  ' + i.code;
  document.getElementById('inv-fc').scrollIntoView({behavior:'smooth'});
};

// ---
// PURCHASE ORDERS
// ---
function renderPO() {
  const ed = canEdit('purchase');
  const del = canDelete();
  const roEl = document.getElementById('po-ro'); if(roEl) roEl.innerHTML = ed ? '' : ron();
  const fcEl = document.getElementById('po-fc'); if(fcEl) fcEl.style.display = ed ? 'block' : 'none';
  const flt  = V('po-flt');
  const tbl  = document.getElementById('po-tbl'); if(!tbl) return;
  tbl.innerHTML = DB.purchase_orders
    .filter(p => !flt || p.status===flt)
    .map(p => {
      const apprBadge2 = approvalBadge(p.id,'purchase_orders',p.pono||p.id,ed);
      const acts = ed ? `<button class="btn bO sm" onclick="editPO('${p.id}')">Edit</button><button class="btn bG sm" onclick="openUpd('purchase_orders','${p.id}','po')">Status</button>${del?`<button class="btn bD sm" onclick="delRec('purchase_orders','${p.id}')">Del</button>`:''}` : '';
      return `<tr><td class="mn" style="color:var(--ac);font-weight:600">${p.pono||p.id.slice(-8)}</td><td>${p.material}</td><td>${p.supplier}</td><td class="mn">${p.qty}</td><td class="mn">${fmtM(parseFloat(p.qty||0)*parseFloat(p.price||0))}</td><td>${fmtD(p.date)}</td><td>${pill(p.status)}</td><td><div style="display:flex;gap:4px;flex-wrap:wrap">${apprBadge2}${acts}</div></td></tr>`;
    }).join('') || '<tr><td colspan="8"><div class="empty"><div class="empty-ic">PO</div><div class="empty-tt">No Purchase Orders</div></div></td></tr>';
}
window.savePO = async () => {
  const eid = V('po-eid'), mat = V('po-mat'), qty = parseFloat(V('po-qty')), price = parseFloat(V('po-price'));
  if (!mat||!qty||!price) { toast('Material, Qty and Price required','e'); return; }
  const data = { material:mat, supplier:V('po-sup'), qty, price, date:V('po-date'), addr:V('po-addr'), notes:V('po-notes') };
  if (eid) {
    const old=DB.purchase_orders.find(x=>x.id===eid);
    if(await dbUpdate('purchase_orders',eid,data)){await logAudit('UPDATE','purchase_orders',eid,old?.pono||eid,old,data);toast('PO updated');}
  } else {
    const mx = DB.purchase_orders.reduce((m,p) => Math.max(m,parseInt((p.pono||'PO-0').split('-')[1])||0), 17);
    data.pono = 'PO-' + String(mx+1).padStart(3,'0'); data.status = 'Pending Approval';
    if(await dbInsert('purchase_orders',data)){await logAudit('CREATE','purchase_orders','new',data.pono,null,data);toast(data.pono+' raised  pending approval');}
  }
  clrForm('po');
};
window.editPO = id => {
  const p = DB.purchase_orders.find(x=>x.id===id); if(!p) return;
  SV('po-eid',id); SV('po-mat',p.material); SV('po-sup',p.supplier); SV('po-qty',p.qty);
  SV('po-price',p.price); SV('po-date',p.date); SV('po-addr',p.addr); SV('po-notes',p.notes);
  document.getElementById('po-ft').textContent = 'Edit '+(p.pono||'PO');
  document.getElementById('po-fc').scrollIntoView({behavior:'smooth'});
};

// ---
// SALES ORDERS
// ---
function renderSO() {
  const ed = canEdit('sales');
  const del = canDelete();
  const roEl = document.getElementById('so-ro'); if(roEl) roEl.innerHTML = ed ? '' : ron();
  const fcEl = document.getElementById('so-fc'); if(fcEl) fcEl.style.display = ed ? 'block' : 'none';
  fillProdDDs();
  const srch = (V('so-srch')||'').toLowerCase(), flt = V('so-flt');
  const tbl  = document.getElementById('so-tbl'); if(!tbl) return;
  tbl.innerHTML = DB.sales_orders
    .filter(s => (!flt||s.status===flt) && (!srch||(s.sono+s.customer+s.product+(s.buyer||'')).toLowerCase().includes(srch)))
    .map(s => {
      const acts = ed ? `<button class="btn bO sm" onclick="editSO('${s.id}')">Edit</button><button class="btn bG sm" onclick="openUpd('sales_orders','${s.id}','so')">Status</button>${del?`<button class="btn bD sm" onclick="delRec('sales_orders','${s.id}')">Del</button>`:''}` : '';
      return `<tr><td class="mn" style="color:var(--ac);font-weight:600">${s.sono||s.id.slice(-8)}</td><td>${esc(s.customer)}</td><td>${esc(s.product)}</td><td class="mn">${s.qty}</td><td class="mn">${fmtM(parseFloat(s.qty||0)*parseFloat(s.price||0))}</td><td>${fmtD(s.deadline)}</td><td class="mn" style="color:var(--mu)">${esc(s.wo||'--')}</td><td>${pill(s.status)}</td><td><div style="display:flex;gap:4px">${acts}</div></td></tr>`;
    }).join('') || '<tr><td colspan="9"><div class="empty"><div class="empty-ic">SO</div><div class="empty-tt">No Sales Orders</div></div></td></tr>';
}
window.saveSO = async () => {
  const eid = V('so-eid'), cust = V('so-cust'), qty = parseFloat(V('so-qty')), price = parseFloat(V('so-price'));
  if (!cust||!qty||!price) { toast('Customer, Qty and Price required','e'); return; }
  const data = { customer:cust, buyer:V('so-buyer'), product:V('so-prod'), qty, price, date:V('so-date'), deadline:V('so-dl'), wo:V('so-wo'), ref:V('so-ref'), addr:V('so-addr'), shipping_addr:V('so-addr'), gst:V('so-gst') };
  if (eid) { if(await dbUpdate('sales_orders',eid,data)) toast('SO updated'); }
  else {
    const mx = DB.sales_orders.reduce((m,s) => Math.max(m,parseInt((s.sono||'SO-0').split('-')[1])||0), 204);
    data.sono = 'SO-' + String(mx+1).padStart(3,'0'); data.status = 'Pending';
    if(await dbInsert('sales_orders',data)) toast(data.sono+' created');
  }
  clrForm('so');
};
window.editSO = id => {
  const s = DB.sales_orders.find(x=>x.id===id); if(!s) return;
  SV('so-eid',id); SV('so-buyer',s.buyer); SV('so-cust',s.customer); SV('so-prod',s.product); SV('so-qty',s.qty);
  SV('so-price',s.price); SV('so-date',s.date); SV('so-dl',s.deadline); SV('so-wo',s.wo); SV('so-ref',s.ref); SV('so-addr',soAddress(s)); SV('so-gst',s.gst);
  document.getElementById('so-ft').textContent = 'Edit '+(s.sono||'SO');
  document.getElementById('so-fc').scrollIntoView({behavior:'smooth'});
};

// ---
// DISPATCH
// ---
function renderDC() {
  const ed = canEdit('dispatch');
  const del = canDelete();
  const roEl = document.getElementById('dc-ro'); if(roEl) roEl.innerHTML = ed ? '' : ron();
  const fcEl = document.getElementById('dc-fc'); if(fcEl) fcEl.style.display = ed ? 'block' : 'none';
  const flt  = V('dc-flt');
  const tbl  = document.getElementById('dc-tbl'); if(!tbl) return;
  tbl.innerHTML = DB.dispatches
    .filter(d => !flt || d.status===flt)
    .map(d => {
      const acts = ed ? `<button class="btn bO sm" onclick="editDC('${d.id}')">Edit</button><button class="btn bG sm" onclick="openUpd('dispatches','${d.id}','dc')">Status</button>${del?`<button class="btn bD sm" onclick="delRec('dispatches','${d.id}')">Del</button>`:''}` : '';
      return `<tr><td class="mn" style="color:var(--ac);font-weight:600">${d.dcno||d.id.slice(-8)}</td><td class="mn">${d.soref||'--'}</td><td>${d.customer}</td><td>${d.product}</td><td class="mn">${d.qty}</td><td class="mn">${d.vehicle||'--'}</td><td>${fmtD(d.date)}</td><td class="mn">${d.lr||'--'}</td><td>${pill(d.status)}</td><td><div style="display:flex;gap:4px">${acts}</div></td></tr>`;
    }).join('') || '<tr><td colspan="10"><div class="empty"><div class="empty-ic">DC</div><div class="empty-tt">No Dispatches</div></div></td></tr>';
}
window.saveDC = async () => {
  const eid = V('dc-eid'), soref = V('dc-so'), qty = parseFloat(V('dc-qty'));
  if (!soref||!qty) { toast('Sales Order and Qty required','e'); return; }
  const so = DB.sales_orders.find(s=>s.sono===soref);
  const data = { soref, customer:so?.customer||'', product:so?.product||'', qty, date:V('dc-date'), vehicle:V('dc-veh'), transporter:V('dc-trans'), lr:V('dc-lr'), notes:V('dc-notes') };
  if (eid) { if(await dbUpdate('dispatches',eid,data)) toast('Challan updated'); }
  else {
    data.dcno = 'DC-'+new Date().toISOString().slice(2,10).replace(/-/g,'')+'-'+String(DB.dispatches.length+1).padStart(2,'0');
    data.status = 'In Transit';
    if(await dbInsert('dispatches',data)) { if(so) await dbUpdate('sales_orders',so.id,{status:'Dispatched'}); toast(data.dcno+' generated'); }
  }
  clrForm('dc');
};
window.editDC = id => {
  const d = DB.dispatches.find(x=>x.id===id); if(!d) return;
  SV('dc-eid',id); SV('dc-so',d.soref); SV('dc-qty',d.qty); SV('dc-date',d.date);
  SV('dc-veh',d.vehicle); SV('dc-trans',d.transporter); SV('dc-lr',d.lr); SV('dc-notes',d.notes);
  document.getElementById('dc-ft').textContent = 'Edit '+(d.dcno||'Challan');
  document.getElementById('dc-fc').scrollIntoView({behavior:'smooth'});
};

// ---
// INVOICES
// ---
function renderInv2() {
  const ed = canEdit('invoices');
  const del = canDelete();
  const roEl = document.getElementById('inv2-ro'); if(roEl) roEl.innerHTML = ed ? '' : ron();
  const fcEl = document.getElementById('inv2-fc'); if(fcEl) fcEl.style.display = ed ? 'block' : 'none';
  if (document.getElementById('inv2-lines') && !document.querySelector('[data-inv2-line]')) renderInvoiceLines();
  let alerts = '';
  DB.invoices.filter(i=>i.status==='Overdue').forEach(i=>alerts+=`<div class="al ald"><span class="al-i">!!</span>Overdue: <strong>${i.invno||'Invoice'}</strong>  ${i.party}  ${fmtM(i.total)}</div>`);
  const a2El = document.getElementById('inv2-alerts'); if(a2El) a2El.innerHTML = alerts;
  const tot  = DB.invoices.reduce((a,i)=>a+parseFloat(i.total||0),0);
  const unpd = DB.invoices.filter(i=>i.status==='Unpaid'||i.status==='Overdue').reduce((a,i)=>a+parseFloat(i.total||0),0);
  const paid = DB.invoices.filter(i=>i.status==='Paid').reduce((a,i)=>a+parseFloat(i.total||0),0);
  const tEl = document.getElementById('inv2-tot'); if(tEl) tEl.textContent = fmtM(tot);
  const uEl = document.getElementById('inv2-upd'); if(uEl) uEl.textContent = fmtM(unpd);
  const pEl = document.getElementById('inv2-pad'); if(pEl) pEl.textContent = fmtM(paid);
  const srch = (V('inv2-srch')||'').toLowerCase(), flt = V('inv2-flt');
  const tbl  = document.getElementById('inv2-tbl'); if(!tbl) return;
  tbl.innerHTML = DB.invoices
    .filter(i => (!flt||i.status===flt) && (!srch||(i.invno+(i.party||'')).toLowerCase().includes(srch)))
    .map(i => {
      const acts  = `<button class="btn bG sm" onclick="printInv2('${i.id}')">Print</button>` + (ed ? `<button class="btn bO sm" onclick="editInv2('${i.id}')">Edit</button><button class="btn bG sm" onclick="openUpd('invoices','${i.id}','inv2')">Status</button>${del?`<button class="btn bD sm" onclick="delRec('invoices','${i.id}')">Del</button>`:''}` : '');
      return `<tr><td class="mn" style="color:var(--ac);font-weight:600">${i.invno||i.id.slice(-8)}</td><td>${fmtD(i.date)}</td><td>${esc(i.party||'')}</td><td class="mn" style="color:var(--mu)">${esc(i.soref||'--')}</td><td class="mn">${fmtM(i.amt)}</td><td class="mn">${i.gst||0}%</td><td class="mn" style="font-weight:700">${fmtM(i.total)}</td><td>${fmtD(i.due)}</td><td>${pill(i.status)}</td><td><div style="display:flex;gap:4px;flex-wrap:wrap">${acts}</div></td></tr>`;
    }).join('') || '<tr><td colspan="10"><div class="empty"><div class="empty-ic">IN</div><div class="empty-tt">No Invoices</div></div></td></tr>';
}
window.saveInv2 = async () => {
  const eid = V('inv2-eid'), party = V('inv2-party');
  const calc = updateInvoiceTotals();
  if (!party || !calc.items.length) { toast('Buyer / party and at least one line item are required','e'); return; }
  const effectiveGST = calc.base > 0 ? parseFloat(((calc.tax / calc.base) * 100).toFixed(2)) : 0;
  const data = {
    party,
    buyer:V('inv2-buyer'),
    company:V('inv2-company'),
    customer_gst:V('inv2-cgst'),
    bill_to_same:document.getElementById('inv2-same')?.checked || false,
    billing_addr:V('inv2-billaddr'),
    shipping_addr:V('inv2-shipaddr'),
    soref:V('inv2-so'),
    amt:calc.base,
    gst:effectiveGST,
    total:calc.total,
    items_json:JSON.stringify(calc.items),
    date:V('inv2-date'),
    due:V('inv2-due'),
    terms:V('inv2-terms'),
    ref:V('inv2-ref'),
    status:V('inv2-status'),
    notes:V('inv2-notes')
  };
  if (eid) { if(await dbUpdate('invoices',eid,data)) toast('Invoice updated'); }
  else {
    data.invno = 'INV-'+new Date().getFullYear()+'-'+String(DB.invoices.length+1).padStart(3,'0');
    if(await dbInsert('invoices',data)) toast(data.invno+' created');
  }
  clrForm('inv2');
};
window.editInv2 = id => {
  const i = DB.invoices.find(x=>x.id===id); if(!i) return;
  SV('inv2-eid',id); SV('inv2-no',i.invno); SV('inv2-company',i.company); SV('inv2-buyer',i.buyer); SV('inv2-party',i.party); SV('inv2-cgst',i.customer_gst); SV('inv2-so',i.soref);
  SV('inv2-date',i.date); SV('inv2-due',i.due); SV('inv2-terms',i.terms); SV('inv2-ref',i.ref); SV('inv2-status',i.status); SV('inv2-notes',i.notes);
  SV('inv2-billaddr',i.billing_addr || ''); SV('inv2-shipaddr',i.shipping_addr || '');
  const same = document.getElementById('inv2-same'); if (same) same.checked = !!i.bill_to_same;
  renderInvoiceLines(getInvoiceItems(i));
  syncInvoiceShipping();
  document.getElementById('inv2-ft').textContent = 'Edit '+(i.invno||'Invoice');
  document.getElementById('inv2-fc').scrollIntoView({behavior:'smooth'});
};
window.printInv2 = id => {
  const inv = DB.invoices.find(x => x.id === id); if (!inv) return;
  const company = getCompanyByName(inv.company) || invoiceDefaultCompany() || {};
  const buyer = getBuyerByName(inv.buyer) || getVendorByName(inv.party) || {};
  const items = getInvoiceItems(inv);
  const rows = items.map((item, idx) => {
    const base = parseFloat(item.qty || 0) * parseFloat(item.price || 0);
    const tax = base * (parseFloat(item.gst || 0) / 100);
    return `<tr>
      <td>${idx + 1}</td>
      <td>${esc(item.product || '--')}</td>
      <td>${esc(item.description || item.product || '--')}</td>
      <td>${parseFloat(item.qty || 0)}</td>
      <td>${fmtM(item.price || 0)}</td>
      <td>${item.gst || 0}%</td>
      <td>${fmtM(base + tax)}</td>
    </tr>`;
  }).join('');
  const base = parseFloat(inv.amt || 0);
  const total = parseFloat(inv.total || 0);
  const gstValue = total - base;
  const html = `<!DOCTYPE html><html><head><title>Invoice ${esc(inv.invno || '')}</title>
  <style>
  *{box-sizing:border-box} body{font-family:Arial,sans-serif;padding:28px;color:#111;font-size:12px}
  .head{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #f97316;padding-bottom:16px;margin-bottom:16px}
  .brand{font-size:22px;font-weight:700;color:#f97316}.sub{font-size:11px;color:#666;margin-top:4px;line-height:1.5}
  .title{font-size:20px;font-weight:700;text-transform:uppercase}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}
  .box{border:1px solid #e5e7eb;border-radius:8px;padding:12px}.box h4{margin:0 0 8px 0;font-size:12px;text-transform:uppercase;color:#666;letter-spacing:1px}
  table{width:100%;border-collapse:collapse;margin-top:14px} th{background:#f97316;color:#fff;padding:9px;font-size:11px;text-align:left}
  td{border-bottom:1px solid #e5e7eb;padding:9px;vertical-align:top}.totals{margin-top:18px;margin-left:auto;width:320px}
  .totals td{border:none;padding:6px 0}.totals .grand td{font-size:15px;font-weight:700;border-top:1px solid #111;padding-top:10px}
  .note{margin-top:20px;border-top:1px dashed #d1d5db;padding-top:12px;color:#555;line-height:1.6}
  @media print{body{padding:16px}}
  </style></head><body>
  <div class="head">
    <div>
      <div class="brand">${esc(company.name || 'EIPD ERP')}</div>
      <div class="sub">${esc(company.address || 'Company address not set')}<br>GST: ${esc(company.gst || '--')}<br>${esc(company.contact || '')} ${company.phone ? ' | ' + esc(company.phone) : ''}</div>
    </div>
    <div style="text-align:right">
      <div class="title">Tax Invoice</div>
      <div style="margin-top:8px">Invoice No: <strong>${esc(inv.invno || '--')}</strong></div>
      <div>Date: <strong>${esc(fmtD(inv.date))}</strong></div>
      <div>Due: <strong>${esc(fmtD(inv.due))}</strong></div>
      <div>Status: <strong>${esc(inv.status || 'Unpaid')}</strong></div>
    </div>
  </div>
  <div class="grid">
    <div class="box"><h4>Bill To</h4><div><strong>${esc(inv.party || buyer.name || '--')}</strong></div><div>GST: ${esc(inv.customer_gst || buyer.gst || '--')}</div><div style="white-space:pre-line">${esc(inv.billing_addr || buyer.address || '--')}</div></div>
    <div class="box"><h4>Ship To</h4><div style="white-space:pre-line">${esc(inv.shipping_addr || inv.billing_addr || buyer.address || '--')}</div><div style="margin-top:8px">Sales Order: ${esc(inv.soref || '--')}</div><div>Payment Terms: ${esc(inv.terms || '--')}</div></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Product</th><th>Description</th><th>Qty</th><th>Rate</th><th>GST</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="totals">
    <tr><td>Base Amount</td><td style="text-align:right">${fmtM(base)}</td></tr>
    <tr><td>GST</td><td style="text-align:right">${fmtM(gstValue)}</td></tr>
    <tr class="grand"><td>Grand Total</td><td style="text-align:right">${fmtM(total)}</td></tr>
  </table>
  <div class="note">Reference: ${esc(inv.ref || '--')}<br>${esc(inv.notes || '')}</div>
  </body></html>`;
  const win = window.open('', '_blank', 'width=980,height=780');
  if (!win) return toast('Allow pop-ups and try again', 'e');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
};

// ---
// INWARD BILLS
// ---
function renderIB() {
  const ed = canEdit('ibill');
  const del = canDelete();
  const roEl = document.getElementById('ib-ro'); if(roEl) roEl.innerHTML = ed ? '' : ron();
  const fcEl = document.getElementById('ib-fc'); if(fcEl) fcEl.style.display = ed ? 'block' : 'none';
  const srch = (V('ib-srch') || '').toLowerCase();
  const tbl = document.getElementById('ib-tbl'); if(!tbl) return;
  tbl.innerHTML = DB.inward_bills
    .filter(b => !srch || ((b.bill_no || '') + (b.vendor || '') + (b.po_ref || '')).toLowerCase().includes(srch))
    .map(b => {
      const acts = ed ? `<button class="btn bO sm" onclick="editIB('${b.id}')">Edit</button><button class="btn bG sm" onclick="openUpd('inward_bills','${b.id}','ib')">Status</button>${del ? `<button class="btn bD sm" onclick="delRec('inward_bills','${b.id}')">Del</button>` : ''}` : '';
      return `<tr><td class="mn" style="color:var(--ac);font-weight:600">${esc(b.bill_no || b.id.slice(-8))}</td><td>${fmtD(b.date)}</td><td>${esc(b.vendor || '--')}</td><td class="mn">${esc(b.po_ref || '--')}</td><td class="mn">${fmtM(b.amt)}</td><td class="mn" style="font-weight:700">${fmtM(b.total)}</td><td>${fmtD(b.due)}</td><td>${pill(b.status || 'Pending')}</td><td><div style="display:flex;gap:4px">${acts}</div></td></tr>`;
    }).join('') || '<tr><td colspan="9"><div class="empty"><div class="empty-ic">IB</div><div class="empty-tt">No Inward Bills</div></div></td></tr>';
}

window.updateInwardBillTotal = () => {
  const amt = parseFloat(V('ib-amt') || '0');
  const gst = parseFloat(V('ib-gstpct') || '0');
  SV('ib-total', (amt + amt * gst / 100).toFixed(2));
};
window.autofillInwardBillVendor = () => {
  const vendor = getVendorByName(V('ib-vendor'));
  if (!vendor) return;
  SV('ib-gst', vendor.gst || '');
};
window.autofillInwardBillPO = () => {
  const po = DB.purchase_orders.find(p => p.pono === V('ib-po'));
  if (!po) return;
  if (po.supplier) SV('ib-vendor', po.supplier);
  const vendor = getVendorByName(po.supplier);
  if (vendor) SV('ib-gst', vendor.gst || '');
  SV('ib-amt', po.qty && po.price ? parseFloat(po.qty) * parseFloat(po.price) : V('ib-amt'));
  updateInwardBillTotal();
};
window.saveIB = async () => {
  const eid = V('ib-eid');
  if (!V('ib-vendor') || !V('ib-date') || !parseFloat(V('ib-amt') || '0')) { toast('Vendor, date and amount are required','e'); return; }
  const data = {
    bill_no: V('ib-no'),
    date: V('ib-date'),
    vendor: V('ib-vendor'),
    po_ref: V('ib-po'),
    vendor_gst: V('ib-gst'),
    amt: parseFloat(V('ib-amt') || '0'),
    gst: parseFloat(V('ib-gstpct') || '0'),
    total: parseFloat(V('ib-total') || '0'),
    due: V('ib-due'),
    status: V('ib-status') || 'Pending',
    notes: V('ib-notes')
  };
  if (eid) {
    if (await dbUpdate('inward_bills', eid, data)) toast('Inward bill updated');
  } else {
    if (!data.bill_no) data.bill_no = 'BILL-' + new Date().getFullYear() + '-' + String(DB.inward_bills.length + 1).padStart(3,'0');
    if (await dbInsert('inward_bills', data)) toast(data.bill_no + ' saved');
  }
  clrForm('ib');
};
window.editIB = id => {
  const b = DB.inward_bills.find(x => x.id === id); if (!b) return;
  SV('ib-eid', id); SV('ib-no', b.bill_no); SV('ib-date', b.date); SV('ib-vendor', b.vendor); SV('ib-po', b.po_ref);
  SV('ib-gst', b.vendor_gst); SV('ib-amt', b.amt); SV('ib-gstpct', b.gst); SV('ib-total', b.total); SV('ib-due', b.due); SV('ib-status', b.status); SV('ib-notes', b.notes);
  document.getElementById('ib-ft').textContent = 'Edit ' + (b.bill_no || 'Inward Bill');
  document.getElementById('ib-fc').scrollIntoView({behavior:'smooth'});
};

// ---
// BUYERS
// ---
function renderBuyers() {
  const ed = canEdit('buyers');
  const del = canDelete();
  const roEl = document.getElementById('buy-ro'); if(roEl) roEl.innerHTML = ed ? '' : ron();
  const fcEl = document.getElementById('buy-fc'); if(fcEl) fcEl.style.display = ed ? 'block' : 'none';
  const srch = (V('buy-srch') || '').toLowerCase();
  const tbl = document.getElementById('buy-tbl'); if (!tbl) return;
  tbl.innerHTML = DB.buyers
    .filter(b => !srch || ((b.name || '') + (b.code || '') + (b.gst || '')).toLowerCase().includes(srch))
    .map(b => {
      const acts = ed ? `<button class="btn bO sm" onclick="editBuyer('${b.id}')">Edit</button>${del ? `<button class="btn bD sm" onclick="delRec('buyers','${b.id}')">Del</button>` : ''}` : '';
      return `<tr><td style="font-weight:600">${esc(b.name)}</td><td class="mn">${esc(b.code || '--')}</td><td>${esc(b.contact || '--')}</td><td class="mn">${esc(b.phone || '--')}</td><td class="mn">${esc(b.gst || '--')}</td><td>${esc(b.address || '--')}</td><td>${pill(b.status || 'Active')}</td><td><div style="display:flex;gap:4px">${acts}</div></td></tr>`;
    }).join('') || '<tr><td colspan="8"><div class="empty"><div class="empty-ic">BY</div><div class="empty-tt">No Buyers</div></div></td></tr>';
}
window.saveBuyer = async () => {
  const eid = V('buy-eid'), name = V('buy-name');
  if (!name) { toast('Buyer name required','e'); return; }
  const mx = DB.buyers.reduce((m, b) => Math.max(m, parseInt((b.code || 'BUY-0').split('-')[1]) || 0), 0);
  const data = { name, code:V('buy-code') || ('BUY-' + String(mx + 1).padStart(3,'0')), contact:V('buy-contact'), phone:V('buy-phone'), email:V('buy-email'), gst:V('buy-gst'), terms:V('buy-terms'), address:V('buy-address'), status:V('buy-status'), notes:V('buy-notes') };
  if (eid) { if (await dbUpdate('buyers', eid, data)) toast('Buyer updated'); }
  else { if (await dbInsert('buyers', data)) toast(name + ' added'); }
  clrForm('buy');
};
window.editBuyer = id => {
  const b = DB.buyers.find(x => x.id === id); if (!b) return;
  SV('buy-eid', id); SV('buy-name', b.name); SV('buy-code', b.code); SV('buy-contact', b.contact); SV('buy-phone', b.phone); SV('buy-email', b.email); SV('buy-gst', b.gst); SV('buy-terms', b.terms); SV('buy-address', b.address); SV('buy-status', b.status); SV('buy-notes', b.notes);
  document.getElementById('buy-ft').textContent = 'Edit ' + b.name;
  document.getElementById('buy-fc').scrollIntoView({behavior:'smooth'});
};

// ---
// COMPANY
// ---
function renderCompany() {
  const ed = canEdit('company');
  const del = canDelete();
  const roEl = document.getElementById('cmp-ro'); if(roEl) roEl.innerHTML = ed ? '' : ron();
  const fcEl = document.getElementById('cmp-fc'); if(fcEl) fcEl.style.display = ed ? 'block' : 'none';
  const srch = (V('cmp-srch') || '').toLowerCase();
  const tbl = document.getElementById('cmp-tbl'); if (!tbl) return;
  tbl.innerHTML = DB.company_details
    .filter(c => !srch || ((c.name || '') + (c.short_name || '') + (c.gst || '')).toLowerCase().includes(srch))
    .map(c => {
      const acts = ed ? `<button class="btn bO sm" onclick="editCompany('${c.id}')">Edit</button>${del ? `<button class="btn bD sm" onclick="delRec('company_details','${c.id}')">Del</button>` : ''}` : '';
      return `<tr><td style="font-weight:600">${esc(c.name)}</td><td>${esc(c.short_name || '--')}</td><td class="mn">${esc(c.gst || '--')}</td><td>${esc(c.contact || '--')}</td><td class="mn">${esc(c.phone || '--')}</td><td>${esc(c.address || '--')}</td><td>${pill(c.status || 'Active')}</td><td><div style="display:flex;gap:4px">${acts}</div></td></tr>`;
    }).join('') || '<tr><td colspan="8"><div class="empty"><div class="empty-ic">CO</div><div class="empty-tt">No Company Details</div></div></td></tr>';
}
window.saveCompany = async () => {
  const eid = V('cmp-eid'), name = V('cmp-name');
  if (!name) { toast('Company name required','e'); return; }
  const data = { name, short_name:V('cmp-short'), gst:V('cmp-gst'), contact:V('cmp-contact'), phone:V('cmp-phone'), email:V('cmp-email'), state_code:V('cmp-state'), address:V('cmp-address'), status:V('cmp-status'), notes:V('cmp-notes') };
  if (eid) { if (await dbUpdate('company_details', eid, data)) toast('Company details updated'); }
  else { if (await dbInsert('company_details', data)) toast(name + ' added'); }
  clrForm('cmp');
};
window.editCompany = id => {
  const c = DB.company_details.find(x => x.id === id); if (!c) return;
  SV('cmp-eid', id); SV('cmp-name', c.name); SV('cmp-short', c.short_name); SV('cmp-gst', c.gst); SV('cmp-contact', c.contact); SV('cmp-phone', c.phone); SV('cmp-email', c.email); SV('cmp-state', c.state_code); SV('cmp-address', c.address); SV('cmp-status', c.status); SV('cmp-notes', c.notes);
  document.getElementById('cmp-ft').textContent = 'Edit ' + c.name;
  document.getElementById('cmp-fc').scrollIntoView({behavior:'smooth'});
};

// ---
// VENDORS
// ---
function renderVnd() {
  const ed = canEdit('vendors');
  const del = canDelete();
  const roEl = document.getElementById('vnd-ro'); if(roEl) roEl.innerHTML = ed ? '' : ron();
  const fcEl = document.getElementById('vnd-fc'); if(fcEl) fcEl.style.display = ed ? 'block' : 'none';
  const srch = (V('vnd-srch')||'').toLowerCase();
  const tbl  = document.getElementById('vnd-tbl'); if(!tbl) return;
  tbl.innerHTML = DB.vendors
    .filter(v => !srch || (v.name+v.code+(v.address||'')).toLowerCase().includes(srch))
    .map(v => {
      const acts  = ed ? `<button class="btn bO sm" onclick="editVnd('${v.id}')">Edit</button>${del?`<button class="btn bD sm" onclick="delRec('vendors','${v.id}')">Del</button>`:''}` : '';
      return `<tr><td style="font-weight:600">${esc(v.name)}</td><td><span class="pill pb">${esc(v.category || '--')}</span></td><td>${esc(v.contact||'--')}</td><td class="mn">${esc(v.phone||'--')}</td><td class="mn" style="font-size:11px">${esc(v.gst||'--')}</td><td>${esc(v.address||'--')}</td><td>${pill(v.status)}</td><td><div style="display:flex;gap:4px">${acts}</div></td></tr>`;
    }).join('') || '<tr><td colspan="8"><div class="empty"><div class="empty-ic">VN</div><div class="empty-tt">No Vendors</div></div></td></tr>';
}
window.saveVnd = async () => {
  const eid = V('vnd-eid'), name = V('vnd-name');
  if (!name) { toast('Vendor name required','e'); return; }
  const mx   = DB.vendors.reduce((m,v) => Math.max(m,parseInt((v.code||'VND-0').split('-')[1])||0), 0);
  const data = { entity_type:'Vendor', name, code:V('vnd-code')||('VND-'+String(mx+1).padStart(3,'0')), category:V('vnd-cat'), contact:V('vnd-contact'), phone:V('vnd-phone'), email:V('vnd-email'), gst:V('vnd-gst'), terms:V('vnd-terms'), rating:parseInt(V('vnd-rating'))||3, status:V('vnd-status'), address:V('vnd-address'), materials:V('vnd-materials') };
  if (eid) { if(await dbUpdate('vendors',eid,data)) toast('Vendor updated'); }
  else     { if(await dbInsert('vendors',data)) toast(name+' added'); }
  clrForm('vnd');
};
window.editVnd = id => {
  const v = DB.vendors.find(x=>x.id===id); if(!v) return;
  SV('vnd-eid',id); SV('vnd-name',v.name); SV('vnd-code',v.code); SV('vnd-cat',v.category);
  SV('vnd-contact',v.contact); SV('vnd-phone',v.phone); SV('vnd-email',v.email);
  SV('vnd-gst',v.gst); SV('vnd-terms',v.terms); SV('vnd-rating',v.rating); SV('vnd-status',v.status); SV('vnd-address',v.address); SV('vnd-materials',v.materials);
  document.getElementById('vnd-ft').textContent = 'Edit  ' + v.name;
  document.getElementById('vnd-fc').scrollIntoView({behavior:'smooth'});
};

// ---
// PRODUCT MASTER
// ---
function renderProducts() {
  const ed = canEdit('products');
  const del = canDelete();
  const roEl = document.getElementById('prod-ro'); if(roEl) roEl.innerHTML = ed ? '' : ron();
  const fcEl = document.getElementById('prod-fc'); if(fcEl) fcEl.style.display = ed ? 'block' : 'none';
  const srch = (V('prod-srch')||'').toLowerCase(), sflt = V('prod-sflt');
  const tbl  = document.getElementById('prod-tbl'); if(!tbl) return;
  tbl.innerHTML = DB.products
    .filter(p => (!sflt||String(p.active)===sflt) && (!srch||(p.name+p.code+(p.description||'')).toLowerCase().includes(srch)))
    .map(p => {
      const acts = ed ? `<button class="btn bO sm" onclick="editProd('${p.id}')">Edit</button>${del?`<button class="btn bD sm" onclick="delRec('products','${p.id}')">Del</button>`:''}` : '';
      return `<tr><td style="font-weight:600">${p.name}</td><td class="mn" style="color:var(--ac)">${p.code}</td><td><span class="pill pb">${p.category||'--'}</span></td><td>${p.unit}</td><td class="mn">${fmtM(p.price||0)}</td><td class="mn">${p.hsn||'--'}</td><td class="mn">${p.gst||0}%</td><td>${pill(p.active?'Active':'Inactive')}</td><td><div style="display:flex;gap:4px">${acts}</div></td></tr>`;
    }).join('') || '<tr><td colspan="9"><div class="empty"><div class="empty-ic">PM</div><div class="empty-tt">No Products</div><div class="empty-st">Add products to enable dropdowns</div></div></td></tr>';
}
window.saveProd = async () => {
  const eid = V('prod-eid'), name = V('prod-name');
  if (!name) { toast('Product name required','e'); return; }
  const mx   = DB.products.reduce((m,p) => Math.max(m,parseInt((p.code||'PROD-0').split('-')[1])||0), 0);
  const data = { name, code:V('prod-code')||('PROD-'+String(mx+1).padStart(3,'0')), description:V('prod-desc'), unit:V('prod-unit'), price:parseFloat(V('prod-price'))||0, category:V('prod-cat'), hsn:V('prod-hsn'), gst:parseFloat(V('prod-gst'))||18, active:V('prod-active')==='true', notes:V('prod-notes') };
  if (eid) { if(await dbUpdate('products',eid,data)) toast('Product updated'); }
  else     { if(await dbInsert('products',data)) toast(name+' added to catalogue'); }
  clrForm('prod'); fillProdDDs();
};
window.editProd = id => {
  const p = DB.products.find(x=>x.id===id); if(!p) return;
  SV('prod-eid',id); SV('prod-name',p.name); SV('prod-code',p.code); SV('prod-desc',p.description);
  SV('prod-unit',p.unit); SV('prod-price',p.price); SV('prod-cat',p.category);
  SV('prod-hsn',p.hsn); SV('prod-gst',p.gst); SV('prod-active',String(p.active)); SV('prod-notes',p.notes);
  document.getElementById('prod-ft').textContent = 'Edit  ' + p.name;
  document.getElementById('prod-sb').textContent = 'Update Product';
  document.getElementById('prod-fc').scrollIntoView({behavior:'smooth'});
};

// ---
// ANALYTICS
// ---
function renderRep() {
  const totP = DB.work_orders.reduce((a,w)=>a+parseFloat(w.produced||0),0);
  const totR = DB.sales_orders.reduce((a,s)=>a+(parseFloat(s.qty||0)*parseFloat(s.price||0)),0);
  const invV = DB.inventory.reduce((a,i)=>a+(parseFloat(i.stock||0)*parseFloat(i.cost||0)),0);
  const qcT  = DB.qc_records.reduce((a,q)=>a+parseFloat(q.sample||0),0);
  const qcP  = DB.qc_records.reduce((a,q)=>a+parseFloat(q.pass||0),0);
  const kEl  = document.getElementById('rep-kpi'); if(!kEl) return;
  kEl.innerHTML =
    `<div class="kc g"><div class="kc-stripe"></div><div class="kl">Total Produced</div><div class="kv" style="color:var(--gn)">${totP.toLocaleString()}</div></div>` +
    `<div class="kc b"><div class="kc-stripe"></div><div class="kl">Total Revenue</div><div class="kv" style="color:var(--bl)">${fmtM(totR)}</div></div>` +
    `<div class="kc o"><div class="kc-stripe"></div><div class="kl">Inventory Value</div><div class="kv" style="color:var(--ac)">${fmtM(invV)}</div></div>` +
    `<div class="kc p"><div class="kc-stripe"></div><div class="kl">QC Pass Rate</div><div class="kv" style="color:var(--pu)">${qcT>0?((qcP/qcT)*100).toFixed(1)+'%':'--'}</div></div>`;
  const variants = DB.products.filter(p=>p.active===true).map(p=>p.name);
  if (!variants.length) variants.push('PPI-11kV','PPI-22kV','PPI-33kV');
  const vt   = variants.map(v => DB.work_orders.filter(w=>w.product===v).reduce((a,w)=>a+parseFloat(w.produced||0),0));
  const maxV = Math.max(...vt, 1);
  const vcols = ['var(--bl)','var(--ac)','var(--pu)','var(--gn)','var(--cy)'];
  const rpEl = document.getElementById('rep-prod');
  if(rpEl) rpEl.innerHTML = variants.map((v,i) => `<div class="abr"><div class="abh"><span>${v}</span><span class="abv">${vt[i].toLocaleString()} pcs</span></div><div class="pbar"><div class="pfill" style="width:${Math.round((vt[i]/maxV)*100)}%;background:${vcols[i%vcols.length]}"></div></div></div>`).join('');
  const top5 = [...DB.inventory].sort((a,b)=>(parseFloat(b.stock)*parseFloat(b.cost))-(parseFloat(a.stock)*parseFloat(a.cost))).slice(0,5);
  const maxI = top5[0] ? parseFloat(top5[0].stock)*parseFloat(top5[0].cost) : 1;
  const riEl = document.getElementById('rep-inv');
  if(riEl) riEl.innerHTML = top5.map(i => `<div class="abr"><div class="abh"><span style="font-size:11px">${i.name}</span><span class="abv">${i.stock} ${i.unit}</span></div><div class="pbar"><div class="pfill" style="width:${Math.round(((parseFloat(i.stock)*parseFloat(i.cost))/maxI)*100)}%;background:var(--gn)"></div></div></div>`).join('');
  const woG  = {};
  DB.work_orders.forEach(w => { if(!woG[w.status]) woG[w.status]={c:0,q:0}; woG[w.status].c++; woG[w.status].q+=parseFloat(w.qty||0); });
  const rwEl = document.getElementById('rep-wo');
  if(rwEl) rwEl.innerHTML = Object.entries(woG).map(([s,v]) => `<tr><td>${pill(s)}</td><td class="mn">${v.c}</td><td class="mn">${v.q.toLocaleString()}</td></tr>`).join('');
  const custG = {};
  DB.sales_orders.forEach(s => { if(!custG[s.customer]) custG[s.customer]={c:0,v:0}; custG[s.customer].c++; custG[s.customer].v+=parseFloat(s.qty||0)*parseFloat(s.price||0); });
  const rsEl = document.getElementById('rep-so');
  if(rsEl) rsEl.innerHTML = Object.entries(custG).map(([c,v]) => `<tr><td>${c}</td><td class="mn">${v.c}</td><td class="mn">${fmtM(v.v)}</td></tr>`).join('');
}

// ---
// USER MANAGEMENT
// ---
function renderUsers() {
  const rg = document.getElementById('roles-grid');
  if(rg) rg.innerHTML = Object.entries(ROLES).map(([k,r]) => {
    const access = NAV_ACCESS[k] || [];
    return `<div class="rolec ${k}"><div class="rn">${r.label}</div><div class="rd2">${access.length} modules accessible</div><div>${access.slice(0,3).map(m=>`<span class="at a">${m}</span>`).join('')}${access.length>3?`<span class="at a">+${access.length-3}</span>`:''}</div></div>`;
  }).join('');
  const ucEl = document.getElementById('ucnt'); if(ucEl) ucEl.textContent = DB.profiles.filter(u=>u.active!==false).length + ' users';
  const ul   = document.getElementById('ulist'); if(!ul) return;
  ul.innerHTML = DB.profiles.map(u => {
    const r      = ROLES[u.role]||ROLES.viewer;
    const isMe   = u.id === CU?.id;
    const canAct = CU?.role === 'admin' || isMe;
    const editBtn = canAct ? `<button class="btn bO sm" onclick="openEditUser('${u.id}')" style="flex-shrink:0;margin-left:8px">Edit</button>` : '';
    return `<div class="ur"><div class="uavb" style="background:${r.bg};color:${r.color}">${ini(u.name||u.email||'?')}</div><div class="uinf"><div class="unl">${u.name||u.email}${isMe?' <span style="color:var(--mu);font-size:10px">(you)</span>':''}</div><div class="uel">${u.email||''}${u.dept?' - '+u.dept:''}</div></div><span class="pill ${u.active!==false?'pg':'pgr'}">${u.active!==false?'Active':'Inactive'}</span><span class="pill" style="background:${r.bg};color:${r.color};border:1px solid ${r.color}20">${r.label}</span>${editBtn}</div>`;
  }).join('') || '<div class="empty"><div class="empty-tt">No users found</div></div>';
}

window.openEditUser = async (id) => {
  const u = DB.profiles.find(x => x.id === id);
  if (!u) return;
  // Pre-fill the edit modal
  document.getElementById('eu-id').value    = u.id;
  document.getElementById('eu-name').value  = u.name  || '';
  document.getElementById('eu-email').value = u.email || '';
  document.getElementById('eu-role').value  = u.role  || 'viewer';
  document.getElementById('eu-dept').value  = u.dept  || '';
  document.getElementById('eu-phone').value = u.phone || '';
  document.getElementById('eu-empid').value = u.empid || '';
  document.getElementById('eu-active').value = String(u.active !== false);
  const msg = document.getElementById('eu-msg');
  if (msg) msg.style.display = 'none';
  openMo('mo-edit-user');
};

window.saveEditUser = async () => {
  const id     = document.getElementById('eu-id').value;
  const name   = document.getElementById('eu-name').value.trim();
  const role   = document.getElementById('eu-role').value;
  const dept   = document.getElementById('eu-dept').value.trim();
  const phone  = document.getElementById('eu-phone').value.trim();
  const empid  = document.getElementById('eu-empid').value.trim();
  const active = document.getElementById('eu-active').value === 'true';
  const msg    = document.getElementById('eu-msg');
  if (!name) { msg.style.display='block'; msg.className='al ald'; msg.textContent='Name is required'; return; }
  const ok = await dbUpdate('profiles', id, { name, role, dept, phone, empid, active });
  if (ok) {
    msg.style.display = 'block';
    msg.className     = 'al als';
    msg.textContent   = 'User updated successfully!';
    setTimeout(() => { closeMo('mo-edit-user'); renderUsers(); }, 1000);
    // Update header if editing self
    if (id === CU?.id) {
      CU.name = name; CU.role = role; CU.dept = dept;
      const r = ROLES[role] || ROLES.viewer;
      const av = document.getElementById('hav');
      if (av) { av.textContent = ini(name); av.style.background = r.bg; av.style.color = r.color; }
      document.getElementById('hnm').textContent = name.split(' ')[0];
    }
  }
};

window.addUser = async () => {
  if (!CU || CU.role !== 'admin') { toast('Only Plant Admin can create users','e'); return; }
  const name  = document.getElementById('au-name').value.trim();
  const email = document.getElementById('au-email').value.trim();
  const pass  = document.getElementById('au-pass').value.trim();
  const role  = document.getElementById('au-role').value;
  const dept  = document.getElementById('au-dept').value.trim();
  const phone = document.getElementById('au-phone').value.trim();
  const empid = document.getElementById('au-empid').value.trim();
  const errEl = document.getElementById('au-err');
  errEl.style.display = 'none';
  if (!name||!email||!pass) { errEl.textContent='Name, Email and Password required.'; errEl.style.display='block'; return; }
  if (pass.length < 6) { errEl.textContent='Password must be at least 6 characters.'; errEl.style.display='block'; return; }
  showLoader('Creating user...');
  try {
    const tmp = createClient(SUPABASE_URL, SUPABASE_ANON);
    const { data, error } = await tmp.auth.signUp({ email, password: pass });
    if (error) { hideLoader(); errEl.textContent=error.message; errEl.style.display='block'; return; }
    if (data.user) {
      await sb.from('profiles').upsert({
        id:data.user.id, name, email, role, dept, phone, empid, active:true
      });
    }
    hideLoader(); closeMo('mo-add');
    toast(name+' created! They can now log in.');
    ['au-name','au-email','au-pass','au-dept','au-phone','au-empid'].forEach(id=>{
      const e=document.getElementById(id); if(e) e.value='';
    });
  } catch(e) {
    hideLoader();
    errEl.textContent = 'Error: ' + e.message;
    errEl.style.display = 'block';
  }
};
// ---
// PROFILE MODAL
// ---
function openProf() {
  if (!CU) return;
  const r  = ROLES[CU.role]||ROLES.viewer;
  const ph = document.getElementById('prof-header');
  if(ph) ph.innerHTML = `<div class="prof-av" style="background:${r.bg};color:${r.color}">${ini(CU.name||CU.email||'?')}</div><div><div class="prof-name">${CU.name||CU.email}</div><div class="prof-role" style="color:${r.color}">${r.label}</div></div>`;
  SV('mp-n',CU.name); SV('mp-e',CU.email); SV('mp-d',CU.dept); SV('mp-ph',CU.phone);
  SV('mp-np',''); SV('mp-conf','');
  const msg = document.getElementById('mp-msg'); if(msg) msg.style.display='none';
  openMo('mo-prof');
}
window.saveProf = async () => {
  const np = V('mp-np'), conf = V('mp-conf');
  const msg = document.getElementById('mp-msg');
  if (np) {
    if (np.length<6) { msg.style.display='block'; msg.className='al ald'; msg.textContent='Password min 6 characters'; return; }
    if (np!==conf)   { msg.style.display='block'; msg.className='al ald'; msg.textContent='Passwords do not match'; return; }
    const { error } = await sb.auth.updateUser({ password: np });
    if (error) { msg.style.display='block'; msg.className='al ald'; msg.textContent='Password error: '+error.message; return; }
  }
  const updates = { name:V('mp-n'), dept:V('mp-d'), phone:V('mp-ph') };
  await dbUpdate('profiles', CU.id, updates);
  Object.assign(CU, updates);
  const av = document.getElementById('hav'); if(av) av.textContent = ini(CU.name);
  document.getElementById('hnm').textContent = (CU.name||'').split(' ')[0];
  msg.style.display='block'; msg.className='al als'; msg.textContent='Profile saved!';
  setTimeout(() => closeMo('mo-prof'), 1200);
};

// ---
// STATUS UPDATE MODAL
// ---
window.openUpd = (tbl, id, type) => {
  const rec = DB[tbl]?.find(x=>x.id===id); if(!rec) return;
  document.getElementById('upd-col').value = tbl;
  document.getElementById('upd-id').value  = id;
  const sel = document.getElementById('upd-stat');
  sel.innerHTML = (STATUSES[tbl]||[]).map(s=>`<option${rec.status===s?' selected':''}>${s}</option>`).join('');
  const pw = document.getElementById('upd-prod-wrap');
  if (type==='wo') { pw.style.display='block'; document.getElementById('upd-prod').value=rec.produced||0; } else pw.style.display='none';
  document.getElementById('mo-upd-t').textContent = 'Update  '+(rec.wono||rec.pono||rec.sono||rec.dcno||rec.invno||rec.bill_no||rec.name||'Record');
  document.getElementById('upd-info').textContent = 'Current status: ' + rec.status;
  document.getElementById('upd-note').value = '';
  openMo('mo-upd');
};
window.saveUpd = async () => {
  const tbl = V('upd-col'), id = V('upd-id');
  const rec = DB[tbl]?.find(x=>x.id===id); if(!rec) return;
  const newStatus = V('upd-stat');
  const updates   = { status: newStatus };
  if (tbl==='work_orders') { const p = document.getElementById('upd-prod').value; if(p) updates.produced = parseFloat(p); }
  if (tbl==='purchase_orders' && newStatus==='Delivered') {
    const inv = DB.inventory.find(i=>i.name===rec.material);
    if (inv) { await dbUpdate('inventory', inv.id, {stock: parseFloat(inv.stock||0)+parseFloat(rec.qty||0)}); toast('Stock updated for '+inv.name); }
  }
  if (tbl==='dispatches' && newStatus==='Delivered') {
    const so = DB.sales_orders.find(s=>s.sono===rec.soref);
    if (so) await dbUpdate('sales_orders', so.id, {status:'Delivered'});
  }
  if (await dbUpdate(tbl, id, updates)) { closeMo('mo-upd'); toast('Status updated'); }
};

// ---
// GENERIC DELETE
// ---
window.delRec = async (tbl, id) => {
  if (!canDelete()) { toast('Only Plant Admin or Plant Manager can delete records','e'); return; }
  const names = { work_orders:'work order', qc_records:'QC record', inventory:'material', purchase_orders:'purchase order', sales_orders:'sales order', dispatches:'dispatch', machines:'machine', invoices:'invoice', inward_bills:'inward bill', vendors:'vendor', buyers:'buyer', company_details:'company record', products:'product' };
  if (!confirm('Delete this '+(names[tbl]||'record')+'? This cannot be undone.')) return;
  if (await dbDelete(tbl, id)) toast('Record deleted');
};

// ---
// CLEAR FORMS
// ---

window.requestApproval = async (module, recordId, recordRef) => {
  if (!CU) return;
  const exists = DB.approvals.find(a=>a.record_id===recordId&&a.status==='Pending');
  if (exists) { toast('Approval already requested for '+recordRef,'i'); return; }
  const ok = await dbInsert('approvals',{
    module, record_id:recordId, record_ref:recordRef,
    status:'Pending', requested_by:CU.id, requested_name:CU.name||CU.email,
    requested_at:new Date().toISOString()
  });
  if(ok) { await logAudit('REQUEST_APPROVAL',module,recordId,recordRef); toast('Approval requested for '+recordRef); renderWO(); renderPO(); }
};

window.processApproval = async (approvalId, decision) => {
  const appr = DB.approvals.find(a=>a.id===approvalId); if(!appr) return;
  if(CU?.role!=='admin'&&CU?.role!=='manager'){toast('Only Admin or Manager can approve','e');return;}
  const reason = decision==='Rejected'?prompt('Reason for rejection:'):null;
  await dbUpdate('approvals',approvalId,{status:decision,approved_by:CU.id,approved_name:CU.name||CU.email,approved_at:new Date().toISOString(),reason:reason||''});
  if(decision==='Approved'){
    if(appr.module==='work_orders')     await dbUpdate('work_orders',    appr.record_id,{status:'Queued'});
    if(appr.module==='purchase_orders') await dbUpdate('purchase_orders',appr.record_id,{status:'Raised'});
  }
  await logAudit(decision==='Approved'?'APPROVE':'REJECT',appr.module,appr.record_id,appr.record_ref,null,{decision,reason});
  toast(appr.record_ref+' '+decision.toLowerCase());
  renderWO(); renderPO();
};

function getApprovalStatus(recordId){ return DB.approvals.find(a=>a.record_id===recordId); }

function approvalSteps(appr, ref) {
  if (!appr) {
    return [
      { cls:'done',    ic:'1', title:'Request Initiated', sub:`${ref} is ready to be sent for approval.` },
      { cls:'current', ic:'2', title:'Awaiting Admin / Manager', sub:'Approval request will be routed to Plant Admin or Plant Manager.' },
      { cls:'wait',    ic:'3', title:'Final Decision', sub:'Record will be marked approved or rejected with reason.' }
    ];
  }
  if (appr.status === 'Pending') {
    return [
      { cls:'done',    ic:'1', title:'Request Raised', sub:`Requested by ${appr.requested_name||'User'} on ${fmtApprD(appr.requested_at || appr.created_at)}.` },
      { cls:'current', ic:'2', title:'Awaiting Admin / Manager', sub:'Current stage: waiting for approval action.' },
      { cls:'wait',    ic:'3', title:'Final Decision', sub:'Decision and remarks will appear here once completed.' }
    ];
  }
  if (appr.status === 'Approved') {
    return [
      { cls:'done', ic:'1', title:'Request Raised', sub:`Requested by ${appr.requested_name||'User'} on ${fmtApprD(appr.requested_at || appr.created_at)}.` },
      { cls:'done', ic:'2', title:'Reviewed', sub:`Reviewed by ${appr.approved_name||'Admin / Manager'}.` },
      { cls:'done', ic:'3', title:'Approved', sub:`Completed on ${fmtApprD(appr.approved_at || appr.updated_at || appr.created_at)}.` }
    ];
  }
  return [
    { cls:'done',    ic:'1', title:'Request Raised', sub:`Requested by ${appr.requested_name||'User'} on ${fmtApprD(appr.requested_at || appr.created_at)}.` },
    { cls:'done',    ic:'2', title:'Reviewed', sub:`Reviewed by ${appr.approved_name||'Admin / Manager'}.` },
    { cls:'current', ic:'3', title:'Rejected', sub:appr.reason || 'Rejected without reason.' }
  ];
}

function renderApprovalFlow(module, recordId, recordRef, appr=null, preview=false) {
  SV('appr-module', module);
  SV('appr-record-id', recordId);
  SV('appr-record-ref', recordRef);
  const title = appr ? 'Approval Progress' : 'Request Approval';
  document.getElementById('mo-appr-t').textContent = title;
  document.getElementById('appr-info').textContent = `${recordRef} | Module: ${module.replace(/_/g,' ')} | From start to end the approval flow is shown below.`;
  document.getElementById('appr-hierarchy').innerHTML = `<strong>Step 1:</strong> User raises request<br><strong>Step 2:</strong> Plant Manager or Plant Admin reviews<br><strong>Step 3:</strong> Final decision is recorded with status and reason`;
  document.getElementById('appr-steps').innerHTML = approvalSteps(appr, recordRef).map(step => `
    <div class="ap-step ${step.cls}">
      <div class="ap-step-dot">${step.ic}</div>
      <div>
        <div class="ap-step-b">${step.title}</div>
        <div class="ap-step-s">${step.sub}</div>
      </div>
    </div>
  `).join('');
  document.getElementById('appr-note').value = appr?.notes || '';
  document.getElementById('appr-note').disabled = !preview;
  document.getElementById('appr-actions').innerHTML = preview
    ? `<button class="btn bO" onclick="closeMo('mo-appr')">Close</button><button class="btn bP" onclick="saveApprovalRequest()">Confirm Request</button>`
    : `<button class="btn bO" onclick="closeMo('mo-appr')">Close</button>`;
  openMo('mo-appr');
}

window.requestApprovalPreview = (module, recordId, recordRef) => {
  renderApprovalFlow(module, recordId, recordRef, null, true);
};

window.viewApprovalFlow = (recordId, module, recordRef) => {
  const appr = getApprovalStatus(recordId);
  renderApprovalFlow(module, recordId, recordRef, appr, false);
};

window.saveApprovalRequest = async () => {
  const module = V('appr-module'), recordId = V('appr-record-id'), recordRef = V('appr-record-ref');
  if (!CU) return;
  const exists = DB.approvals.find(a=>a.record_id===recordId&&a.status==='Pending');
  if (exists) { toast('Approval already requested for '+recordRef,'i'); closeMo('mo-appr'); return; }
  const ok = await dbInsert('approvals',{
    module, record_id:recordId, record_ref:recordRef,
    status:'Pending', requested_by:CU.id, requested_name:CU.name||CU.email,
    requested_at:new Date().toISOString(), notes:V('appr-note')
  });
  if(ok) {
    await logAudit('REQUEST_APPROVAL',module,recordId,recordRef);
    closeMo('mo-appr');
    toast('Approval requested for '+recordRef);
    renderWO(); renderPO();
  }
};

function approvalBadge(recordId,module,ref,canRequest=true){
  const appr=getApprovalStatus(recordId);
  if(!appr){
    if(!canRequest) return '';
    return `<button class="btn bO sm" onclick="requestApprovalPreview('${module}','${recordId}','${ref}')">Request Approval</button>`;
  }
  const status = appr.status || 'Pending';
  const reqBy = esc(appr.requested_name || appr.requester_name || appr.created_by_name || 'Unknown');
  const reqAt = fmtApprD(appr.requested_at || appr.created_at);
  const who   = esc(appr.approved_name || appr.approver_name || appr.reason || '');
  const canApprove=CU?.role==='admin'||CU?.role==='manager';
  const actions = status==='Pending' && canApprove
    ? `<div class="apb-a"><button class="btn bG sm" onclick="processApproval('${appr.id}','Approved')">Approve</button><button class="btn bD sm" onclick="processApproval('${appr.id}','Rejected')">Reject</button></div>`
    : '';
  if(status==='Pending'){
    return `<div class="apb pending">
      <div class="apb-h"><span class="apb-s">Pending</span><button class="btn bO sm" onclick="viewApprovalFlow('${recordId}','${module}','${ref}')">Flow</button></div>
      <div class="apb-p"><b>${reqBy}</b></div>
      <div class="apb-p">${reqAt}</div>
      <div class="apb-w">&#x23F3; Admin / Manager</div>
      ${actions}
    </div>`;
  }
  if(status==='Approved'){
    return `<div class="apb approved">
      <div class="apb-h"><span class="apb-s">Approved</span><button class="btn bO sm" onclick="viewApprovalFlow('${recordId}','${module}','${ref}')">Flow</button></div>
      <div class="apb-p"><b>${reqBy}</b></div>
      <div class="apb-p">${reqAt}</div>
      <div class="apb-w">&#10003; By ${who || 'Manager'}</div>
    </div>`;
  }
  return `<div class="apb rejected">
    <div class="apb-h"><span class="apb-s">Rejected</span><button class="btn bO sm" onclick="viewApprovalFlow('${recordId}','${module}','${ref}')">Flow</button></div>
    <div class="apb-p"><b>${reqBy}</b></div>
    <div class="apb-p">${reqAt}</div>
    <div class="apb-w">&#10007; ${who || 'Rejected'}</div>
  </div>`;
}

window.saveFG = async () => {
  const eid = document.getElementById('fg-eid')?.value||'';
  const prod = document.getElementById('fg-prod')?.value||'';
  const qty  = parseFloat(document.getElementById('fg-qty')?.value||0);
  if(!prod||!qty){toast('Product and Quantity required','e');return;}
  const mx = DB.finished_goods.reduce((m,g)=>Math.max(m,parseInt((g.batch||'FG-0').split('-')[1])||0),0);
  const data = {
    product:prod, batch:'FG-'+String(mx+1).padStart(3,'0'),
    qty, unit:document.getElementById('fg-unit')?.value||'pcs',
    cost:parseFloat(document.getElementById('fg-cost')?.value||0),
    location:document.getElementById('fg-loc')?.value||'Main Warehouse',
    wo_ref:document.getElementById('fg-wo')?.value||'',
    qc_batch:document.getElementById('fg-qcbatch')?.value||'',
    notes:document.getElementById('fg-notes')?.value||'',
    status:'Available'
  };
  if(eid){delete data.batch;if(await dbUpdate('finished_goods',eid,data)){await logAudit('UPDATE','finished_goods',eid,prod);toast('Updated');}}
  else{if(await dbInsert('finished_goods',data)){await logAudit('CREATE','finished_goods','new',data.batch+' '+prod);toast(data.batch+' added');}}
  clrForm('fg');
};

window.editFG = id => {
  const g=DB.finished_goods.find(x=>x.id===id);if(!g)return;
  document.getElementById('fg-eid').value=id;
  document.getElementById('fg-prod').value=g.product||'';
  document.getElementById('fg-qty').value=g.qty||0;
  document.getElementById('fg-unit').value=g.unit||'pcs';
  document.getElementById('fg-cost').value=g.cost||0;
  document.getElementById('fg-loc').value=g.location||'';
  document.getElementById('fg-wo').value=g.wo_ref||'';
  document.getElementById('fg-qcbatch').value=g.qc_batch||'';
  document.getElementById('fg-notes').value=g.notes||'';
  document.getElementById('fg-ft').textContent='Edit - '+g.product;
  document.getElementById('fg-fc').scrollIntoView({behavior:'smooth'});
};


window.generateCert = async (qcId) => {
  const q = DB.qc_records.find(x=>x.id===qcId); if(!q) return;
  const pct = parseFloat(q.sample)>0?((parseFloat(q.pass||0)/parseFloat(q.sample))*100).toFixed(1):'0';
  const result = pct>=95?'PASSED':pct>=80?'CONDITIONAL':'FAILED';
  if(result==='FAILED'){toast('Cannot issue certificate for Failed batch','e');return;}
  const existing = DB.qc_certificates.find(c=>c.qc_id===qcId);
  let certNo = existing?.cert_no;
  if(!certNo){
    const mx=DB.qc_certificates.reduce((m,c)=>Math.max(m,parseInt((c.cert_no||'CERT-0').split('-')[2])||0),0);
    certNo='EIPD-CERT-'+String(mx+1).padStart(4,'0');
    await dbInsert('qc_certificates',{cert_no:certNo,qc_id:qcId,batch_id:q.batchid,product:q.product,wo_ref:q.wo,issued_by:CU?.name||CU?.email,issued_date:new Date().toISOString().slice(0,10),valid_until:new Date(Date.now()+365*24*60*60*1000).toISOString().slice(0,10),standard:'IEC 61952 / IS 14772',remarks:formatQCCertificateObservations(q)});
    await logAudit('CREATE','qc_certificates',qcId,certNo);
  }
  const today=new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
  const valid=new Date(Date.now()+365*24*60*60*1000).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
  const col=result==='PASSED'?'#166534':'#92400e';
  const bg=result==='PASSED'?'#f0fdf4':'#fffbeb';
  const bdr2=result==='PASSED'?'#22c55e':'#f59e0b';
  const obsHtml = formatQCCertificateObservations(q);
  const html=`<!DOCTYPE html><html><head><title>QC Certificate ${certNo}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;padding:30px;color:#111;font-size:13px;}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #F97316;padding-bottom:16px;margin-bottom:20px;}
.brand{font-size:22px;font-weight:700;color:#F97316;}.brand-sub{font-size:11px;color:#666;margin-top:4px;}
.cert-no{text-align:right;font-size:11px;color:#666;}.cert-no strong{font-size:15px;color:#111;display:block;}
.title{text-align:center;font-size:18px;font-weight:700;color:#111;margin-bottom:20px;text-transform:uppercase;letter-spacing:1px;}
.result-box{text-align:center;padding:16px;border-radius:8px;margin-bottom:24px;background:${bg};border:2px solid ${bdr2};}
.result-text{font-size:28px;font-weight:700;color:${col};}.result-pct{font-size:14px;color:${col};margin-top:4px;}
table{width:100%;border-collapse:collapse;margin-bottom:20px;}th{background:#F97316;color:#fff;padding:8px 12px;text-align:left;font-size:12px;}
td{padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;}tr:nth-child(even) td{background:#f9fafb;}
.footer{margin-top:32px;display:flex;justify-content:space-between;border-top:1px solid #e5e7eb;padding-top:16px;}
.sign-box{text-align:center;width:180px;}.sign-line{border-top:1px solid #111;margin-top:40px;padding-top:6px;font-size:11px;color:#666;}
.stamp{border:2px solid #F97316;border-radius:50%;width:80px;height:80px;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:9px;font-weight:700;color:#F97316;text-align:center;padding:8px;}
.notice{font-size:10px;color:#9ca3af;margin-top:16px;border-top:1px solid #e5e7eb;padding-top:10px;text-align:center;}
@media print{body{padding:15px;}}</style></head><body>
<div class="header"><div><div class="brand">EIPD ERP</div><div class="brand-sub">Electrical Insulator Products Division<br>Polymer Pin Insulator Manufacturing</div></div>
<div class="cert-no"><strong>${certNo}</strong>Quality Test Certificate</div></div>
<div class="title">Certificate of Conformity</div>
<div class="result-box"><div class="result-text">${result}</div><div class="result-pct">Pass Rate: ${pct}% | Standard: IEC 61952 / IS 14772</div></div>
<table><tr><th colspan="4">Batch Details</th></tr>
<tr><td><strong>Batch ID</strong></td><td>${q.batchid||'--'}</td><td><strong>Product</strong></td><td>${q.product}</td></tr>
<tr><td><strong>Work Order</strong></td><td>${q.wo||'--'}</td><td><strong>Test Date</strong></td><td>${q.date||today}</td></tr>
<tr><td><strong>Sample Size</strong></td><td>${q.sample} pcs</td><td><strong>Pieces Passed</strong></td><td>${q.pass} pcs</td></tr>
<tr><td><strong>Pieces Failed</strong></td><td>${parseFloat(q.sample)-parseFloat(q.pass)} pcs</td><td><strong>Inspector</strong></td><td>${q.inspector||'--'}</td></tr>
<tr><td><strong>Test Type</strong></td><td>${q.test||'--'}</td><td><strong>Standard</strong></td><td>IEC 61952 / IS 14772</td></tr></table>
<table><tr><th colspan="4">Certificate Details</th></tr>
<tr><td><strong>Certificate No.</strong></td><td>${certNo}</td><td><strong>Issue Date</strong></td><td>${today}</td></tr>
<tr><td><strong>Valid Until</strong></td><td>${valid}</td><td><strong>Issued By</strong></td><td>${CU?.name||CU?.email||'--'}</td></tr>
${obsHtml?`<tr><td><strong>Observations</strong></td><td colspan="3">${obsHtml}</td></tr>`:''}</table>
<div class="footer">
<div class="sign-box"><div class="stamp">EIPD QUALITY</div><div class="sign-line">QC Inspector<br>${q.inspector||'--'}</div></div>
<div class="sign-box"><div class="stamp">EIPD APPROVED</div><div class="sign-line">QC Manager<br>EIPD Plant</div></div>
<div class="sign-box"><div class="stamp">EIPD CERTIFIED</div><div class="sign-line">Plant Head<br>EIPD Division</div></div>
</div>
<div class="notice">Generated by EIPD ERP. Valid one year from issue date. Alteration renders this certificate invalid.</div>
</body></html>`;
  const win=window.open('','_blank','width=900,height=700');
  if(win){win.document.write(html);win.document.close();setTimeout(()=>win.print(),600);toast(certNo+' - print dialog opened');}
  else toast('Allow pop-ups and try again','e');
};

const FORM_FIELDS = {
  wo:   ['wo-eid','wo-qty','wo-start','wo-end','wo-rem','wo-vendor','wo-service','wo-output'],
  fg:   ['fg-eid','fg-qty','fg-cost','fg-loc','fg-qcbatch','fg-notes'],
  mach: ['mach-eid','mach-name','mach-eqid','mach-model','mach-oee','mach-param','mach-notes'],
  qc:   ['qc-eid','qc-sample','qc-pass','qc-insp','qc-notes'],
  inv:  ['inv-eid','inv-name','inv-code','inv-stock','inv-reorder','inv-min','inv-cost','inv-sup'],
  po:   ['po-eid','po-qty','po-price','po-date','po-notes'],
  so:   ['so-eid','so-buyer','so-cust','so-qty','so-price','so-date','so-dl','so-ref','so-addr','so-gst'],
  dc:   ['dc-eid','dc-qty','dc-date','dc-veh','dc-trans','dc-lr','dc-notes'],
  inv2: ['inv2-eid','inv2-no','inv2-company','inv2-buyer','inv2-party','inv2-cgst','inv2-so','inv2-date','inv2-due','inv2-terms','inv2-ref','inv2-status','inv2-billaddr','inv2-shipaddr','inv2-notes'],
  ib:   ['ib-eid','ib-no','ib-date','ib-vendor','ib-po','ib-gst','ib-amt','ib-gstpct','ib-total','ib-due','ib-status','ib-notes'],
  buy:  ['buy-eid','buy-name','buy-code','buy-contact','buy-phone','buy-email','buy-gst','buy-terms','buy-address','buy-notes'],
  cmp:  ['cmp-eid','cmp-name','cmp-short','cmp-gst','cmp-contact','cmp-phone','cmp-email','cmp-state','cmp-address','cmp-notes'],
  vnd:  ['vnd-eid','vnd-name','vnd-code','vnd-contact','vnd-phone','vnd-email','vnd-gst','vnd-address','vnd-materials'],
  prod: ['prod-eid','prod-name','prod-code','prod-desc','prod-price','prod-hsn','prod-notes']
};
const FORM_TITLES = { wo:'New Work Order', fg:'Add Finished Goods', mach:'Add Equipment', qc:'New QC Entry', inv:'Add / Stock In Material', po:'Raise Purchase Order', so:'New Sales Order', dc:'Generate Delivery Challan', inv2:'Create Invoice', ib:'Add Inward Bill', buy:'Add Buyer', cmp:'Add Company Details', vnd:'Add Vendor', prod:'Add New Product' };
const FORM_BTNS   = { wo:'Create Work Order', fg:'Add to Finished Goods', mach:'Save Equipment', qc:'Submit QC', inv:'Save Material', po:'Raise PO', so:'Create Sales Order', dc:'Generate Challan', inv2:'Create Invoice', ib:'Save Inward Bill', buy:'Save Buyer', cmp:'Save Company', vnd:'Save Vendor', prod:'Add Product' };

window.clrForm = f => {
  (FORM_FIELDS[f]||[]).forEach(id => { const e = document.getElementById(id); if(e) e.value=''; });
  const tEl = document.getElementById(f+'-ft'); if(tEl) tEl.textContent = FORM_TITLES[f]||'';
  const bEl = document.getElementById(f+'-sb'); if(bEl) bEl.textContent = FORM_BTNS[f]||'Save';
  if (f==='po') { const pa=document.getElementById('po-addr'); if(pa) pa.value='EIPD Plant, Unit 2'; }
  if (f==='qc') renderQCTestList();
  if (f==='wo') { SV('wo-type','In-house'); toggleWOServiceFields(); }
  if (f==='inv2') {
    const same = document.getElementById('inv2-same');
    if (same) same.checked = true;
    renderInvoiceLines();
    syncInvoiceShipping();
  }
  if (f==='ib') { SV('ib-status','Pending'); SV('ib-gstpct','18'); SV('ib-total',''); }
  if (f==='buy') { SV('buy-status','Active'); SV('buy-terms','Net 30'); }
  if (f==='cmp') { SV('cmp-status','Active'); }
};
