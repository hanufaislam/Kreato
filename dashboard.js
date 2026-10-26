// Kreato dashboard prototype — vanilla JS, sample data
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const icons = () => window.lucide && lucide.createIcons();

/* ---------- user (handed over from onboarding when available) ---------- */
let user = { name: 'Hanufa Islam', handle: 'hanufa', roles: [] };
try { Object.assign(user, JSON.parse(sessionStorage.getItem('kreato-user') || '{}')); } catch (e) {}
const first = (user.name || 'there').split(' ')[0];
const storeUrl = 'kreato.co.in/' + user.handle;
$('#who-name').textContent = user.name;
$('#who-handle').textContent = '@' + user.handle;
$('#avatar').textContent = first.charAt(0).toUpperCase();
$$('[data-store-url]').forEach((el) => (el.textContent = storeUrl));

/* ---------- toast ---------- */
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.id); toast.id = setTimeout(() => (t.hidden = true), 2200);
}
document.addEventListener('click', (e) => {
  const soon = e.target.closest('[data-soon]');
  if (soon) { e.preventDefault(); toast((soon.dataset.soon || 'This') + ' is coming soon'); }
  const copy = e.target.closest('[data-copy]');
  if (copy) {
    try { navigator.clipboard.writeText('https://' + storeUrl); } catch (err) {}
    toast('Store link copied');
  }
});

/* ---------- navigation ---------- */
const NAV = [
  { items: [{ id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' }] },
  { title: 'Digital products', items: [
    { id: 'assets', label: 'My assets', icon: 'package' },
    { id: 'bundles', label: 'Bundles', icon: 'layers' },
    { id: 'sales', label: 'Sales', icon: 'shopping-bag' },
    { id: 'coupons', label: 'Coupons', icon: 'ticket' },
    { id: 'subscription', label: 'Subscription', icon: 'repeat' } ] },
  { title: '1:1 Sessions', items: [{ id: 'sessions', label: 'Manage sessions', icon: 'video' }] },
  { title: 'Grow', items: [
    { id: 'spotlight', label: 'Spotlight', icon: 'sparkles' },
    { id: 'lead', label: 'Lead Magnet', icon: 'magnet' },
    { id: 'referrals', label: 'Referrals', icon: 'gift' },
    { id: 'tips', label: 'Tips', icon: 'heart' },
    { id: 'analytics', label: 'Analytics', icon: 'trending-up' } ] },
  { title: 'Money', items: [{ id: 'earnings', label: 'Earnings', icon: 'wallet' }] },
  { title: 'Account', items: [
    { id: 'storefront', label: 'Storefront', icon: 'store' },
    { id: 'settings', label: 'Settings', icon: 'settings' } ] },
];
const item = (i) => `<button class="nav-item" type="button" data-nav="${i.id}" ${i.id === 'dashboard' ? 'aria-current="page"' : ''}><i data-lucide="${i.icon}"></i>${i.label}</button>`;
const group = (g) => (g.title ? `<div class="nav-title">${g.title}</div>` : '') + g.items.map(item).join('');
$('#side-nav').innerHTML = NAV.map(group).join('');

const TABS = [
  { id: 'dashboard', label: 'Home', icon: 'layout-dashboard' },
  { id: 'assets', label: 'Assets', icon: 'package' },
  { id: 'sales', label: 'Sales', icon: 'shopping-bag' },
  { id: 'sessions', label: 'Sessions', icon: 'video' },
];
$('#tabbar').innerHTML = TABS.map((t) => `<button class="tab" type="button" data-nav="${t.id}" ${t.id === 'dashboard' ? 'aria-current="page"' : ''}><i data-lucide="${t.icon}"></i>${t.label}</button>`).join('') +
  '<button class="tab" type="button" id="more-tab" aria-haspopup="dialog"><i data-lucide="menu"></i>More</button>';

// everything that isn't a bottom tab goes in the sheet
const inTabs = new Set(TABS.map((t) => t.id));
$('#sheet-body').innerHTML = NAV.map((g) => ({ ...g, items: g.items.filter((i) => !inTabs.has(i.id)) })).filter((g) => g.items.length).map(group).join('') +
  '<div class="nav-title">&nbsp;</div><button class="nav-item" type="button" data-soon="Sign out"><i data-lucide="log-out"></i>Sign out</button>';

// Pages that exist today; every other nav item is still a "coming next" placeholder.
const ROUTES = { storefront: 'storefront-setup.html', sessions: 'session-setup.html' };
document.addEventListener('click', (e) => {
  const n = e.target.closest('[data-nav]');
  if (n && ROUTES[n.dataset.nav]) { location.href = ROUTES[n.dataset.nav]; }
  else if (n && n.dataset.nav !== 'dashboard') { closeSheet(); toast(n.textContent.trim() + ' is coming soon'); }
  else if (n) closeSheet();
});

/* ---------- saved setup state (written by the storefront, product and session pages) ---------- */
function readSetup(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
const sfRec = readSetup('kreato-storefront');
const products = readSetup('kreato-products') || [];
const productWork = readSetup('kreato-product-work');
function paintSessionStatus() { // 1:1 sessions stay a separate, optional journey
  const ss = readSetup('kreato-session');
  const labels = { new: ['Optional', 'Start'], draft: ['Draft saved', 'Continue'], published: ['Published', 'Edit'] };
  let l = labels[ss && ss.status] || labels.new;
  if (ss && ss.status === 'new' && ss.savedAt) l = ['In progress', 'Continue'];
  $('#session-badge').textContent = l[0]; $('#session-cta').firstChild.textContent = l[1];
}
paintSessionStatus();

const sheet = $('#sheet'), bd = $('#sheet-bd');
function openSheet() { sheet.hidden = bd.hidden = false; $('#more-tab').setAttribute('aria-current', 'page'); sheet.querySelector('button').focus(); }
function closeSheet() { sheet.hidden = bd.hidden = true; $('#more-tab').removeAttribute('aria-current'); }
$('#more-tab').addEventListener('click', openSheet);
bd.addEventListener('click', closeSheet);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) { closeSheet(); $('#more-tab').focus(); } });

/* ---------- NEW creator: setup rows, then store management once everything is done ---------- */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STEPS = [
  { id: 'name', t: 'Store name' },
  { id: 'profile', t: 'Create your storefront profile', d: 'Photo, banner, bio and social links' },
  { id: 'assets', t: 'Add your first asset', d: 'Presets, templates, PDFs, e-books or Notion pages' },
];
let storeName = user.name;
let prog, editing, saving, savedMsg, nameErr;
function resetSetup() {
  // Progress comes from what is actually saved, so the list matches the flows every time you come back.
  prog = { name: true, profile: !!(sfRec && sfRec.status === 'complete'), assets: products.some((p) => p.status === 'published') };
  editing = saving = savedMsg = false; nameErr = '';
}
const nextId = () => (STEPS.find((s) => !prog[s.id]) || {}).id;
const allDone = () => STEPS.every((s) => prog[s.id]);
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const latestDraft = () => products.filter((p) => p.status === 'draft').sort((a, b) => b.updatedAt - a.updatedAt)[0];

function stepAction(s, cur) {
  const kind = s.id === cur ? 'btn-primary' : 'btn-outline';
  if (s.id === 'name') return editing ? '' : '<button class="btn btn-outline btn-sm" type="button" id="b-edit">Edit</button>';
  if (s.id === 'profile') return prog.profile ? '<a class="btn btn-outline btn-sm" href="storefront-setup.html">Edit</a>'
    : `<a class="btn ${kind} btn-sm" id="b-profile" href="storefront-setup.html">${sfRec && sfRec.savedAt ? 'Continue' : 'Start'}</a>`;
  const draft = latestDraft();
  const href = productWork ? 'product-new.html' : draft ? 'product-new.html?id=' + encodeURIComponent(draft.id) : 'product-new.html?new=1';
  return `<a class="btn ${kind} btn-sm" id="b-assets" href="${href}">${productWork || draft ? 'Continue draft' : 'Add asset'}</a>`;
}
function nameEditor() {
  return `<div class="srow-edit"><label class="label" for="sn">Store name</label>
    <input class="input ${nameErr ? 'is-err' : ''}" id="sn" value="${esc(storeName)}" maxlength="40" autocomplete="off" aria-invalid="${!!nameErr}" aria-describedby="sn-err" ${saving ? 'disabled' : ''}>
    <p class="err-text" id="sn-err" role="alert">${nameErr}</p>
    <div class="acc-actions"><button class="btn btn-primary btn-sm" type="button" id="b-save" ${saving ? 'disabled' : ''}>${saving ? '<span class="spinner"></span>' : ''}Save</button>
      <button class="btn btn-outline btn-sm" type="button" id="b-cancel" ${saving ? 'disabled' : ''}>Cancel</button></div></div>`;
}
function setupRows() {
  const cur = nextId();
  return STEPS.map((s, i) => {
    const sub = s.id === 'name' ? `${esc(storeName)} · kreato.co.in/${esc(user.handle)}` : s.d;
    return `<li class="srow ${prog[s.id] ? 'done' : ''} ${s.id === cur ? 'current' : ''}">
      <span class="tick" aria-hidden="true">${prog[s.id] ? '<i data-lucide="check"></i>' : i + 1}</span>
      <div class="grow"><b>${s.t}</b><small>${sub}</small>${s.id === 'name' && savedMsg ? '<span class="ok-text" role="status"><i data-lucide="circle-check"></i>Saved</span>' : ''}</div>
      ${stepAction(s, cur)}
      ${s.id === 'name' && editing ? nameEditor() : ''}</li>`;
  }).join('');
}
function storeManager() {
  const list = products.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  const price = (p) => (p.free ? 'Free' : inr(p.free ? 0 : (p.saleOn !== false && p.salePrice && p.saleEnds && new Date(p.saleEnds + 'T23:59:59') > new Date() ? +p.salePrice : +p.price)));
  const d = (sfRec && sfRec.data) || {};
  return `<div class="store-link"><span class="ic"><i data-lucide="store"></i></span>
      <div class="grow"><b>kreato.co.in/${esc(user.handle)}</b><small>Live</small></div>
      <button class="btn btn-outline btn-sm" type="button" data-copy><i data-lucide="copy"></i>Copy</button>
      <a class="btn btn-primary btn-sm" id="b-view-store" href="store.html">View store</a></div>
    <div class="sec-h"><h3>Products</h3><a href="product-new.html?new=1"><i data-lucide="plus"></i>Add asset</a></div>
    <ul class="plist">${list.map((p) => `<li><span class="thumb">${p.shots && p.shots[0] ? `<img src="${p.shots[0]}" alt="">` : '<i data-lucide="package"></i>'}</span>
      <div class="grow"><b>${esc(p.title)}</b><small>${p.status === 'published' ? 'Live' : 'Draft'} · ${price(p)}</small></div>
      ${p.status === 'published' ? `<a class="link-sm" href="store.html?p=${encodeURIComponent(p.id)}">View</a>` : ''}
      <a class="btn btn-outline btn-sm" href="product-new.html?id=${encodeURIComponent(p.id)}">Edit</a></li>`).join('')}</ul>
    <div class="sec-h"><h3>Storefront profile</h3><a href="storefront-setup.html"><i data-lucide="pencil"></i>Edit</a></div>
    <div class="profile-row"><span class="ss-av">${d.logo ? `<img src="${d.logo}" alt="">` : esc((storeName || 'K').charAt(0).toUpperCase())}</span>
      <div class="grow"><b>${esc(storeName)}</b><small>${esc(d.headline || 'No intro yet')}</small></div></div>`;
}
function renderAcc() {
  const focusId = document.activeElement && document.activeElement.id;
  const done = STEPS.filter((s) => prog[s.id]).length, live = allDone();
  $('#setup-title').textContent = live ? 'Your store' : 'Set up your store';
  $('.setup-prog').hidden = live;
  $('#prog-text').textContent = done + '/' + STEPS.length + ' completed';
  $('#prog-bar').style.width = (done / STEPS.length) * 100 + '%';
  $('#prog-wrap').setAttribute('aria-valuenow', Math.round((done / STEPS.length) * 100));
  $('#acc').innerHTML = live ? `<li class="store-mgr">${storeManager()}</li>` : setupRows();
  icons();
  const f = focusId && document.getElementById(focusId); if (f && !f.disabled) f.focus({ preventScroll: true });
}

async function saveName() {
  const v = ($('#sn').value || '').trim();
  if (v.length < 2) { nameErr = 'At least 2 characters'; renderAcc(); return $('#sn').focus(); }
  nameErr = ''; saving = true; renderAcc();
  await new Promise((r) => setTimeout(r, 700));
  storeName = v; saving = false; editing = false; savedMsg = true;
  // the store name is shared with the storefront profile and the storefront page, so keep them in sync
  try {
    user.name = v;
    sessionStorage.setItem('kreato-user', JSON.stringify(Object.assign({}, user, { name: v })));
    if (sfRec && sfRec.data) { sfRec.data.name = v; if (sfRec.snapshot) { const snap = JSON.parse(sfRec.snapshot); snap.name = v; sfRec.snapshot = JSON.stringify(snap); } localStorage.setItem('kreato-storefront', JSON.stringify(sfRec)); }
  } catch (e) {}
  $('#who-name').textContent = v;
  renderAcc(); $('#b-edit') && $('#b-edit').focus();
  clearTimeout(saveName.t); saveName.t = setTimeout(() => { savedMsg = false; if (!editing) renderAcc(); }, 4000);
}
$('#acc').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.id === 'b-edit') { editing = true; savedMsg = false; nameErr = ''; renderAcc(); const i = $('#sn'); i.focus(); i.select(); }
  else if (b.id === 'b-cancel') { editing = false; nameErr = ''; renderAcc(); $('#b-edit').focus(); }
  else if (b.id === 'b-save') saveName();
});
$('#acc').addEventListener('keydown', (e) => {
  if (e.target.id !== 'sn') return;
  if (e.key === 'Enter') { e.preventDefault(); saveName(); }
  if (e.key === 'Escape') { editing = false; nameErr = ''; renderAcc(); $('#b-edit').focus(); }
});

/* ---------- storefront menu (Copy / Share / Remove) ---------- */
const pill = $('#store-pill'), menu = $('#store-menu');
function setMenu(openIt) {
  menu.hidden = !openIt; pill.setAttribute('aria-expanded', openIt);
  if (openIt) menu.querySelector('button').focus();
}
pill.addEventListener('click', () => setMenu(menu.hidden));
document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('.menu-wrap')) setMenu(false); });
menu.addEventListener('keydown', (e) => {
  const items = [...menu.querySelectorAll('button')], i = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
  if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  if (e.key === 'Escape') { setMenu(false); pill.focus(); }
  if (e.key === 'Tab') setMenu(false);
});
menu.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-menu]'); if (!b) return;
  const url = 'https://' + storeUrl; setMenu(false); pill.focus();
  if (b.dataset.menu === 'copy') { try { await navigator.clipboard.writeText(url); } catch (err) {} toast('Store link copied'); }
  if (b.dataset.menu === 'share') {
    if (navigator.share) { try { await navigator.share({ title: 'My Storefront', url }); } catch (err) {} }
    else { try { await navigator.clipboard.writeText(url); } catch (err) {} toast('Link copied'); }
  }
  if (b.dataset.menu === 'remove') toast('Remove is coming soon');
});

/* notifications: badge only when there are any */
const notifCount = 0;
$('#notif').textContent = notifCount; $('#notif').hidden = !notifCount;

/* ---------- ACTIVE creator ---------- */
const fmtINR = (v) => '₹' + Math.round(v).toLocaleString('en-IN');
const METRICS = {
  earnings: { label: 'Earnings', fmt: fmtINR, per: 420, vol: .5, delta: 18 },
  sales: { label: 'Sales', fmt: (v) => Math.round(v).toLocaleString('en-IN'), per: 1.3, vol: .7, delta: 9 },
  views: { label: 'Store views', fmt: (v) => Math.round(v).toLocaleString('en-IN'), per: 72, vol: .4, delta: 24 },
};
const STAT_CARDS = [
  { id: 'earnings', total: '₹12,480', delta: 18 },
  { id: 'sales', total: '36', delta: 9 },
  { id: 'views', total: '2,140', delta: 24 },
  { id: 'conversion', label: 'Conversion', total: '1.7%', delta: -0.2, flat: true },
];
$('#stat-tabs').innerHTML = STAT_CARDS.map((s) => {
  const m = METRICS[s.id]; const up = s.delta >= 0;
  return `<button type="button" class="stat" role="tab" data-metric="${s.id}" aria-selected="${s.id === 'earnings'}" ${s.flat ? 'aria-disabled="true"' : ''}>
    <span>${s.label || m.label}</span><b>${s.total}</b>
    <span class="delta ${up ? 'up' : 'down'}"><i data-lucide="${up ? 'trending-up' : 'trending-down'}"></i>${up ? '+' : ''}${s.delta}${s.flat ? ' pt' : '%'}</span></button>`;
}).join('');

const ASSETS = [
  ['Moody Film Lightroom Presets', '18 sales', '₹5,382', '#4a3fb0', 'PRE'],
  ['Notion Creator OS', '11 sales', '₹3,289', '#0f766e', 'NOT'],
  ['Canva Reel Templates', '7 sales', '₹2,093', '#c2410c', 'CAN'],
];
$('#top-assets').innerHTML = ASSETS.map((a) => `<li><span class="thumb" style="background:${a[3]}">${a[4]}</span><div class="grow"><b>${a[0]}</b><small>${a[1]}</small></div><span class="amt">${a[2]}</span></li>`).join('');
const SALES = [
  ['Moody Film Lightroom Presets', 'A. Khan · 2 min ago', '₹299'],
  ['Notion Creator OS', 'R. Singh · 1 h ago', '₹299'],
  ['Canva Reel Templates', 'S. Nair · 3 h ago', '₹299'],
];
$('#recent-sales').innerHTML = SALES.map((s) => `<li><span class="thumb" style="background:#16a34a"><i data-lucide="check" style="width:16px;height:16px"></i></span><div class="grow"><b>${s[0]}</b><small>${s[1]}</small></div><span class="amt">${s[2]}</span></li>`).join('');

/* chart */
let metric = 'earnings', range = 30;
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
function series(key, days) {
  const m = METRICS[key], r = rng(key.length * 977 + 13), out = [];
  for (let i = 0; i < days; i++) {
    const trend = 0.75 + (i / days) * 0.5, wave = 1 + Math.sin(i / 2.3) * 0.25;
    out.push(Math.max(0, m.per * trend * wave * (1 - m.vol / 2 + r() * m.vol)));
  }
  return out;
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayLabel = (back) => { const d = new Date(); d.setDate(d.getDate() - back); return d.getDate() + ' ' + MONTHS[d.getMonth()]; };

function drawChart() {
  const host = $('#chart'); const W = host.clientWidth; if (!W) return;
  const H = host.clientHeight, pl = 8, pr = 8, pt = 14, pb = 24;
  const m = METRICS[metric], data = series(metric, range), n = data.length;
  const max = Math.max(...data) * 1.15;
  const x = (i) => pl + (i / (n - 1)) * (W - pl - pr), y = (v) => pt + (1 - v / max) * (H - pt - pb);
  const pts = data.map((v, i) => [x(i), y(v)]);
  let d = 'M' + pts[0].join(',');
  for (let i = 1; i < pts.length; i++) { const mx = (pts[i - 1][0] + pts[i][0]) / 2; d += ` C${mx},${pts[i - 1][1]} ${mx},${pts[i][1]} ${pts[i][0]},${pts[i][1]}`; }
  const grid = [0, .25, .5, .75, 1].map((f) => `<line x1="0" x2="${W}" y1="${pt + f * (H - pt - pb)}" y2="${pt + f * (H - pt - pb)}" stroke="#eceef2" stroke-width="1"/>`).join('');
  const xl = [0, Math.floor((n - 1) / 2), n - 1].map((i, k) => `<text x="${x(i)}" y="${H - 4}" text-anchor="${k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}">${dayLabel(n - 1 - i)}</text>`).join('');
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${m.label} over the last ${range} days">
    <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#4a3fb0" stop-opacity=".22"/><stop offset="1" stop-color="#4a3fb0" stop-opacity="0"/></linearGradient></defs>
    ${grid}<path d="${d} L${x(n - 1)},${H - pb} L${x(0)},${H - pb} Z" fill="url(#g)"/>
    <path d="${d}" fill="none" stroke="#4a3fb0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <line id="cl" y1="${pt}" y2="${H - pb}" stroke="#4a3fb0" stroke-opacity=".35" stroke-dasharray="3 3" style="display:none"/>
    <circle id="cd" r="5" fill="#fff" stroke="#4a3fb0" stroke-width="2.5" style="display:none"/>${xl}</svg><div class="tip" id="tip"></div>`;
  const total = data.reduce((a, b) => a + b, 0);
  $('#chart-label').textContent = m.label + ' · last ' + range + ' days';
  $('#chart-total').textContent = key2fmt(total);
  const tip = $('#tip'), cl = $('#cl'), cd = $('#cd');
  const move = (e) => {
    const r = host.getBoundingClientRect(); const i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left - pl) / (W - pl - pr)) * (n - 1))));
    cl.setAttribute('x1', x(i)); cl.setAttribute('x2', x(i)); cd.setAttribute('cx', x(i)); cd.setAttribute('cy', y(data[i]));
    cl.style.display = cd.style.display = 'block';
    tip.innerHTML = m.fmt(data[i]) + '<small>' + dayLabel(n - 1 - i) + '</small>'; tip.style.left = Math.max(40, Math.min(W - 40, x(i))) + 'px'; tip.style.opacity = 1;
  };
  const leave = () => { cl.style.display = cd.style.display = 'none'; tip.style.opacity = 0; };
  host.onpointermove = move; host.onpointerdown = move; host.onpointerleave = leave;
}
const key2fmt = (t) => METRICS[metric].fmt(t);

$('#stat-tabs').addEventListener('click', (e) => {
  const b = e.target.closest('.stat'); if (!b) return;
  if (b.getAttribute('aria-disabled') === 'true') return toast('Conversion has no chart yet');
  metric = b.dataset.metric;
  $$('#stat-tabs .stat').forEach((s) => s.setAttribute('aria-selected', s === b)); drawChart();
});
$('#range').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  range = +b.dataset.r; $$('#range button').forEach((x) => x.setAttribute('aria-pressed', x === b)); drawChart();
});
new ResizeObserver(drawChart).observe($('#chart'));

/* ---------- view switch ---------- */
function setView(v) {
  if (v === 'new' && allDone()) resetSetup();
  $('#view-new').hidden = v !== 'new'; $('#view-active').hidden = v !== 'active';
  document.body.classList.toggle('state-new', v === 'new');
  $('#viewas').value = v;
  try { sessionStorage.setItem('kreato-dash-view', v); } catch (e) {}
  if (v === 'new') renderAcc();
  if (v === 'active') requestAnimationFrame(drawChart);
  window.scrollTo(0, 0);
}
$('#viewas').addEventListener('change', (e) => setView(e.target.value));

resetSetup(); icons();
let startView = new URLSearchParams(location.search).get('state');
try { startView = startView || sessionStorage.getItem('kreato-dash-view'); } catch (e) {}
setView(startView === 'active' ? 'active' : 'new');
icons();
