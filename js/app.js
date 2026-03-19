// ═══════════════════════════════════════════════════════
// app.js — EIPD ERP Main Logic
// Supabase Auth + Realtime + All 13 Modules
// ═══════════════════════════════════════════════════════

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ── SUPABASE CLIENT ──────────────────────────────────────
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
let CU   = null;   // current user profile
let SUBS = [];     // realtime subscriptions

// ── DATA CACHE ───────────────────────────────────────────
const DB = {
  profiles:[], products:[], machines:[], inventory:[],
  work_orders:[], qc_records:[], purchase_orders:[],
  vendors:[], sales_orders:[], dispatches:[], invoices:[]
};

// ── TABLE MAP (camelCase id → snake_case table) ──────────
const TBL = {
  production:'work_orders', quality:'qc_records',
  inventory:'inventory', purchase:'purchase_orders',
  sales:'sales_orders', dispatch:'dispatches',
  invoices:'invoices', vendors:'vendors',
  machines:'machines', products:'products',
  users:'profiles'
};

// ── ROLES ────────────────────────────────────────────────
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
  admin:      ['dashboard','production','machines','quality','inventory','purchase','sales','dispatch','invoices','vendors','products','reports','users'],
  manager:    ['dashboard','production','machines','quality','inventory','purchase','sales','dispatch','invoices','vendors','products','reports'],
  production: ['dashboard','production','machines','quality'],
  storekeeper:['dashboard','inventory','purchase','vendors'],
  qc:         ['dashboard','quality'],
  dispatch:   ['dashboard','sales','dispatch','invoices'],
  viewer:     ['dashboard','reports']
};
const CAN_EDIT = {
  admin:      ['production','machines','quality','inventory','purchase','sales','dispatch','invoices','vendors','products','users'],
  manager:    ['production','machines','quality','inventory','purchase','sales','dispatch','invoices','vendors','products'],
  production: ['production','machines','quality'],
  storekeeper:['inventory','purchase','vendors'],
  qc:         ['quality'],
  dispatch:   ['dispatch','invoices'],
  viewer:     []
};
const STATUSES = {
  work_orders:    ['Queued','In Progress','On Track','Delayed','Completed'],
  purchase_orders:['Raised','In Transit','Delivered','Cancelled'],
  sales_orders:   ['Pending','In Production','Ready','Dispatched','Delivered'],
  dispatches:     ['In Transit','Delivered'],
  machines:       ['Running','Idle','Maintenance'],
  invoices:       ['Unpaid','Partially Paid','Paid','Overdue','Cancelled']
};
const NAVDEF = [
  {s:'Overview'},
  {id:'dashboard',   ic:'📊', lb:'Dashboard'},
  {s:'Production'},
  {id:'production',  ic:'⚙️', lb:'Work Orders',    bwo:1},
  {id:'machines',    ic:'🔧', lb:'Machines'},
  {id:'quality',     ic:'✅', lb:'Quality Control'},
  {s:'Materials'},
  {id:'inventory',   ic:'📦', lb:'Inventory',      binv:1},
  {id:'purchase',    ic:'🛒', lb:'Purchase Orders'},
  {s:'Commercial'},
  {id:'sales',       ic:'📋', lb:'Sales Orders'},
  {id:'dispatch',    ic:'🚛', lb:'Dispatch'},
  {s:'Finance'},
  {id:'invoices',    ic:'📄', lb:'Invoices',       binv2:1},
  {id:'vendors',     ic:'🏭', lb:'Vendors'},
  {s:'Master Data'},
  {id:'products',    ic:'🏷️', lb:'Product Master'},
  {s:'Reports'},
  {id:'reports',     ic:'📈', lb:'Analytics'},
  {s:'Admin'},
  {id:'users',       ic:'👥', lb:'User Management'}
];

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════
const V   = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
const SV  = (id,v) => { const e = document.getElementById(id); if(e) e.value = v != null ? String(v) : ''; };
const ini = n => (n||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
const canEdit = m => (CAN_EDIT[CU?.role||'viewer']||[]).includes(m);
const fmtD = d => { if(!d) return '--'; try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); } catch(e) { return d; } };
const fmtM = n => 'Rs ' + (parseFloat(n)||0).toLocaleString('en-IN',{maximumFractionDigits:0});

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

const ron = () => '<div class="al ali" style="margin-bottom:14px"><span class="al-i">ℹ️</span>Read-only access for your role. Contact Plant Admin for edit permissions.</div>';

function showLoader(t='Loading...') {
  document.getElementById('loader').style.display = 'flex';
  document.getElementById('loader-msg').textContent = t;
}
function hideLoader() { document.getElementById('loader').style.display = 'none'; }

window.openMo  = id => document.getElementById(id).classList.add('open');
window.closeMo = id => document.getElementById(id).classList.remove('open');

function toast(msg, t='s') {
  const icons = {s:'✅', e:'❌', i:'ℹ️', w:'⚠️'};
  const el = document.createElement('div');
  el.className = `toast ${t}`;
  el.innerHTML = `<span class="toast-ic">${icons[t]||'✅'}</span><span>${msg}</span>`;
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
  const opts = DB.products
    .filter(p => p.active === true)
    .map(p => `<option value="${p.name}">${p.name}</option>`)
    .join('');
  ['wo-prod','qc-prod','so-prod'].forEach(id => {
    const e = document.getElementById(id);
    if (!e) return;
    const cur = e.value;
    e.innerHTML = opts || '<option>No products — add in Product Master</option>';
    if (cur) e.value = cur;
  });
}

// ═══════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════
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
  stopIdleDetection();
  isInitialized = false;
  SUBS.forEach(s => { try { s.unsubscribe(); } catch(e) {} });
  SUBS = [];
  await sb.auth.signOut();
};

// Auth state listener
// isInitialized flag prevents re-running initERP on token refresh
let isInitialized = false;

// ── AUTO LOGOUT ──────────────────────────────────────────
// Logs out after 15 minutes of no activity
// Activity = any mouse move, click, keypress, scroll or touch
const IDLE_MINUTES = 15;
let idleTimer    = null;
let warnTimer    = null;
let warnShown    = false;
let warnEl       = null;

function resetIdleTimer() {
  clearTimeout(idleTimer);
  clearTimeout(warnTimer);
  // Hide warning if shown
  if (warnEl && warnShown) { warnEl.style.display = 'none'; warnShown = false; }
  if (!isInitialized) return;
  // Warn at 13 minutes
  warnTimer = setTimeout(() => {
    if (!isInitialized) return;
    warnShown = true;
    if (!warnEl) {
      warnEl = document.createElement('div');
      warnEl.id = 'idle-warn';
      warnEl.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#7f1d1d;border:1px solid var(--rd);color:#fca5a5;padding:13px 22px;border-radius:8px;font-size:13px;z-index:9998;box-shadow:0 4px 20px rgba(0,0,0,.5);display:flex;align-items:center;gap:12px;font-family:var(--fm)';
      warnEl.innerHTML = '<span>⚠️</span><span>No activity detected. Auto-logout in <strong id="idle-countdown">2 minutes</strong>.</span><button onclick="resetIdleTimer()" style="background:var(--rd);border:none;color:#fff;padding:5px 12px;border-radius:5px;cursor:pointer;font-size:12px;margin-left:8px">Stay Logged In</button>';
      document.body.appendChild(warnEl);
    } else {
      warnEl.style.display = 'flex';
    }
    // Countdown display
    let secs = 120;
    const cdEl = document.getElementById('idle-countdown');
    const cdInt = setInterval(() => {
      secs--;
      if (cdEl) cdEl.textContent = secs > 60 ? Math.ceil(secs/60)+' minutes' : secs+' seconds';
      if (secs <= 0) clearInterval(cdInt);
    }, 1000);
  }, (IDLE_MINUTES - 2) * 60 * 1000);
  // Logout at 15 minutes
  idleTimer = setTimeout(async () => {
    if (!isInitialized) return;
    if (warnEl) warnEl.style.display = 'none';
    // Show logout notification
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;';
    el.innerHTML = '<div style="font-size:32px">🔒</div><div style="color:#f0f4f8;font-size:18px;font-weight:700">Session Expired</div><div style="color:#94a3b8;font-family:var(--fm);font-size:13px">Logged out due to inactivity ('+IDLE_MINUTES+' min)</div>';
    document.body.appendChild(el);
    isInitialized = false;
    SUBS.forEach(s => { try { s.unsubscribe(); } catch(e) {} });
    SUBS = [];
    await sb.auth.signOut();
    setTimeout(() => el.remove(), 2000);
  }, IDLE_MINUTES * 60 * 1000);
}

function startIdleDetection() {
  ['mousemove','mousedown','keypress','scroll','touchstart','click'].forEach(evt => {
    document.addEventListener(evt, resetIdleTimer, { passive: true });
  });
  resetIdleTimer();
}

function stopIdleDetection() {
  clearTimeout(idleTimer);
  clearTimeout(warnTimer);
  if (warnEl) warnEl.style.display = 'none';
}

sb.auth.onAuthStateChange(async (event, session) => {
  // TOKEN_REFRESHED fires every hour — ignore it if already logged in
  if (event === 'TOKEN_REFRESHED' && isInitialized) return;
  // SIGNED_IN fires on every page load if session exists — only init once
  if (event === 'SIGNED_IN' && isInitialized) return;

  if (session?.user) {
    if (isInitialized) return; // already running — skip
    showLoader('Loading your profile...');
    const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
    CU = profile || { id: session.user.id, email: session.user.email, name: session.user.email, role: 'admin', dept: 'Management' };
    document.getElementById('login').classList.remove('show');
    document.getElementById('erp').style.display = 'flex';
    hideLoader();
    isInitialized = true;
    initERP();
  } else {
    // Signed out
    isInitialized = false;
    CU = null;
    document.getElementById('erp').style.display = 'none';
    document.getElementById('login').classList.add('show');
    const btn = document.getElementById('lbtn');
    if (btn) { btn.disabled = false; btn.textContent = 'SIGN IN'; }
  }
});

// ═══════════════════════════════════════════════════════
// LOAD ALL DATA + REALTIME
// ═══════════════════════════════════════════════════════
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
  // Debounce to avoid rapid re-renders when multiple changes come in at once
  let reloadTimers = {};
  tables.forEach(tbl => {
    const sub = sb.channel('db-' + tbl)
      .on('postgres_changes', { event: '*', schema: 'public', table: tbl }, async () => {
        // Debounce: wait 300ms before reloading to batch rapid changes
        clearTimeout(reloadTimers[tbl]);
        reloadTimers[tbl] = setTimeout(async () => {
          const { data } = await sb.from(tbl).select('*').order('created_at', { ascending: false });
          DB[tbl] = data || [];
          fillProdDDs();
          buildSB();
          const cur = document.querySelector('.tc.on');
          if (cur) renderMod(cur.id.replace('tab-',''));
          renderDash();
        }, 300);
      })
      .subscribe();
    SUBS.push(sub);
  });
}

// ═══════════════════════════════════════════════════════
// SUPABASE CRUD
// ═══════════════════════════════════════════════════════
async function dbInsert(tbl, data) {
  setSyncB('saving');
  data.created_by = CU?.id;
  const { error } = await sb.from(tbl).insert(data);
  if (error) { setSyncB('err'); toast('Save error: ' + error.message, 'e'); return false; }
  setSyncB('idle');
  return true;
}
async function dbUpdate(tbl, id, data) {
  setSyncB('saving');
  data.updated_at = new Date().toISOString();
  const { error } = await sb.from(tbl).update(data).eq('id', id);
  if (error) { setSyncB('err'); toast('Update error: ' + error.message, 'e'); return false; }
  setSyncB('idle');
  return true;
}
async function dbDelete(tbl, id) {
  setSyncB('saving');
  const { error } = await sb.from(tbl).delete().eq('id', id);
  if (error) { setSyncB('err'); toast('Delete error: ' + error.message, 'e'); return false; }
  setSyncB('idle');
  return true;
}

// ═══════════════════════════════════════════════════════
// ERP INIT
// ═══════════════════════════════════════════════════════
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
  startIdleDetection(); // start auto-logout timer
}

function tick() {
  const e = document.getElementById('hclock');
  if (e) e.textContent = new Date().toLocaleString('en-IN', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', second:'2-digit'});
}

// ═══════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════
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
    d.innerHTML = `<span class="ni-ic">${n.ic}</span><span class="ni-lb">${n.lb}</span>${badge}${ok?'':`<span style="margin-left:auto;opacity:.25;font-size:12px">🔒</span>`}`;
    if (ok) d.onclick = () => goTab(n.id);
    sb.appendChild(d);
  });
}

window.goTab = id => {
  document.querySelectorAll('.tc').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
  const tab = document.getElementById('tab-' + id); if (tab) tab.classList.add('on');
  const nav = document.getElementById('nav-' + id); if (nav) nav.classList.add('on');
  const L = {dashboard:'Dashboard',production:'Work Orders',machines:'Machines',quality:'Quality Control',inventory:'Inventory',purchase:'Purchase Orders',sales:'Sales Orders',dispatch:'Dispatch',invoices:'Invoices',vendors:'Vendors',products:'Product Master',reports:'Analytics',users:'User Management'};
  document.getElementById('hmod').textContent = '// ' + (L[id] || id);
  renderMod(id);
};

function renderMod(id) {
  const fns = {
    dashboard:renderDash, production:renderWO, machines:renderMach, quality:renderQC,
    inventory:renderInv,  purchase:renderPO,   sales:renderSO,      dispatch:renderDC,
    invoices:renderInv2,  vendors:renderVnd,   products:renderProducts,
    reports:renderRep,    users:renderUsers
  };
  if (fns[id]) fns[id]();
}

window.refreshAll = () => { renderDash(); toast('Dashboard refreshed', 'i'); };

// ── MOBILE ─────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════
function renderDash() {
  const aw  = DB.work_orders.filter(w => w.status !== 'Completed').length;
  const li  = DB.inventory.filter(i => parseFloat(i.stock) <= parseFloat(i.reorder)).length;
  const qcT = DB.qc_records.reduce((a,q) => a + parseFloat(q.sample||0), 0);
  const qcP = DB.qc_records.reduce((a,q) 
