// Kreato — One-on-one session setup journey. Depends on setup-common.js.
// Steps: 1 Your expertise -> 2 Session -> 3 Price & times -> 4 Preview, then Save as draft / Publish.
// Independent from the storefront journey: separate storage key, and the shared profile is only ever READ here.
const SS_KEY = 'kreato-session';
const LABELS = ['Your expertise', 'Session', 'Price & times', 'Preview'];
const DAYS = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']];
const LANGS = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Marathi'];
const DURATIONS = [30, 45, 60, 90]; // paid sessions; free intro calls are always 15 min
const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time'; } catch (e) { return 'your local time'; } })();

const user = getUser(); // read-only here
const defaults = () => ({
  profession: '', langs: [], type: 'paid', title: '', desc: '', duration: 30, price: '',
  days: Object.fromEntries(DAYS.map(([k]) => [k, { on: false, start: '10:00', end: '18:00' }])),
});
const saved = Store.read(SS_KEY) || {};
const D = Object.assign(defaults(), saved.data || {});
D.days = Object.assign(defaults().days, (saved.data || {}).days || {});
const S = { step: 1, max: 1, status: saved.status || 'new', snapshot: saved.snapshot || null, device: 'desktop', touched: {}, view: 'wizard', saving: false, saveErr: '' };
S.max = Math.min(saved.maxStep || 1, 4);
S.step = Math.min(Math.max(+new URLSearchParams(location.search).get('step') || saved.step || 1, 1), S.max);

/* ---------- validation ---------- */
const titleOk = () => D.title.trim().length >= 3;
const priceNum = () => (/^\d+$/.test(String(D.price).trim()) ? parseInt(D.price, 10) : NaN);
const priceOk = () => D.type === 'free' || (priceNum() >= 1 && priceNum() <= 100000);
const dayErr = (k) => (D.days[k].on && D.days[k].start >= D.days[k].end ? 'End time must be after the start time.' : '');
const openDays = () => DAYS.filter(([k]) => D.days[k].on);
const timesOk = () => openDays().length > 0 && DAYS.every(([k]) => !dayErr(k));
const publishIssues = () => [!titleOk() && 'Title, at least 3 characters', !priceOk() && 'Price', openDays().length === 0 && 'At least one open day', DAYS.some(([k]) => dayErr(k)) && 'Valid times'].filter(Boolean);
const stepValid = (n) => (n === 2 ? titleOk() : n === 3 ? priceOk() && DAYS.every(([k]) => !dayErr(k)) : true);
const isDirty = () => S.status !== 'new' && JSON.stringify(D) !== S.snapshot;
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');

function persist(msg) {
  const ok = Store.write(SS_KEY, { status: S.status, step: S.step, maxStep: S.max, data: D, snapshot: S.snapshot, savedAt: Date.now() });
  $('#save-ind').innerHTML = ok ? `<i data-lucide="check"></i><span class="t">${msg || 'Saved on this device'}</span>` : '<span class="t">Couldn’t save. Storage is blocked.</span>';
  icons();
  return ok;
}
const persistSoon = debounce(() => persist(), 400);

/* ---------- helpers ---------- */
const fmtTime = (t) => { const [h, m] = t.split(':').map(Number); return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h < 12 ? 'AM' : 'PM'); };
const TIMES = (() => { const o = []; for (let m = 6 * 60; m <= 22 * 60; m += 30) o.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0')); return o; })();
const timeSelect = (id, v, off) => `<select class="select" id="${id}" aria-label="${id.includes('start') ? 'Start' : 'End'} time" ${off ? 'disabled' : ''}>${TIMES.map((t) => `<option value="${t}" ${t === v ? 'selected' : ''}>${fmtTime(t)}</option>`).join('')}</select>`;
const counter = (id, v, max) => `<div class="counter"><span id="${id}">${v.length}</span>/${max}</div>`;
function statusPill() {
  if (S.status === 'new') return '<span class="pill warn">Not saved yet</span>';
  const base = S.status === 'published' ? 'Published' : 'Draft saved';
  return isDirty() ? `<span class="pill warn">${base} · unsaved changes</span>` : `<span class="pill ${S.status === 'published' ? 'ok' : 'brand'}">${base}</span>`;
}

/* ---------- customer-facing session (live preview + full preview use the same markup) ---------- */
function sessionHTML(d) {
  const free = d.type === 'free', dur = free ? 15 : d.duration;
  const initial = (user.name || 'K').trim().charAt(0).toUpperCase();
  const days = openDays();
  const times = days.length
    ? `<ul>${days.map(([k, n]) => `<li><span>${n.slice(0, 3)}</span><span>${fmtTime(d.days[k].start)}–${fmtTime(d.days[k].end)}</span></li>`).join('')}</ul>`
    : '<p class="none">No times yet</p>';
  return `<div class="ss"><div class="ss-main">
      <div class="ss-who"><span class="ss-av" aria-hidden="true">${esc(initial)}</span><div><b>${esc(user.name)}</b><span>${esc(d.profession.trim()) || 'Creator on Kreato'}</span></div></div>
      <h3 class="${d.title.trim() ? '' : 'ph'}">${esc(d.title.trim()) || 'Your session title'}</h3>
      <div class="ss-meta"><span><i data-lucide="clock"></i>${dur} min</span><span><i data-lucide="video"></i>Video call</span>
        <span><i data-lucide="${free ? 'mic-off' : 'circle-dot'}"></i>${free ? 'Not recorded' : 'Recorded'}</span>
        ${d.langs.length ? `<span><i data-lucide="languages"></i>${esc(d.langs.join(', '))}</span>` : ''}</div>
      <div class="ss-desc">${d.desc.trim() ? md(d.desc) : '<p class="ph">No description yet</p>'}</div></div>
    <aside class="ss-book"><div class="ss-price">${free ? 'Free' : (priceNum() >= 0 ? inr(priceNum()) : '₹–')}</div><small>${free ? 'intro call' : 'per session'} · ${dur} min</small>
      <button class="btn btn-primary btn-block" type="button" disabled>Book</button>
      <div class="ss-times"><h5>Available times <span class="sr-only">(${esc(TZ)})</span></h5>${times}<small style="margin-top:8px">${esc(TZ)}</small></div></aside></div>`;
}
const sessionUrl = () => 'kreato.co.in/' + user.handle + '/sessions';
function updatePreview() {
  const live = $('#live'); if (live) { live.innerHTML = deviceFrame('mobile', sessionUrl(), sessionHTML(D)); icons(); }
  const big = $('#big-preview'); if (big) { big.innerHTML = deviceFrame(S.device, sessionUrl(), sessionHTML(D)); icons(); }
  const pill = $('#status-pill'); if (pill) pill.innerHTML = statusPill();
}

/* ---------- step templates ---------- */
function stepExpertise() {
  return `<h2 id="step-title" tabindex="-1">Your expertise</h2>
    <div class="field"><span class="label">Hosted by</span>
      <div class="ss-who" style="padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius);background:var(--muted)">
        <span class="ss-av" aria-hidden="true">${esc((user.name || 'K').trim().charAt(0).toUpperCase())}</span>
        <div><b>${esc(user.name)}</b><span>@${esc(user.handle)}</span></div></div>
      <p class="helper">Edit this in your profile</p></div>
    <div class="field"><label class="label" for="f-profession">What you do <span class="opt">(optional)</span></label>
      <input class="input" id="f-profession" data-f="profession" type="text" maxlength="60" autocomplete="off" placeholder="e.g. Photographer &amp; colourist" value="${esc(D.profession)}">
      ${counter('c-profession', D.profession, 60)}</div>
    <div class="field"><span class="label" id="lang-l">Languages <span class="opt">(optional)</span></span>
      <div class="toggle-group" role="group" aria-labelledby="lang-l">${LANGS.map((l) => `<button type="button" class="toggle" data-lang="${l}" aria-pressed="${D.langs.includes(l)}">${l}</button>`).join('')}</div></div>
    <div class="public-note"><i data-lucide="globe" aria-hidden="true"></i><span>Visible to everyone</span></div>`;
}
function stepSession() {
  const free = D.type === 'free';
  return `<h2 id="step-title" tabindex="-1">Session details</h2>
    <div class="field"><span class="label" id="type-l">Type</span>
      <div class="type-switch" role="group" aria-labelledby="type-l">
        <button type="button" data-type="paid" aria-pressed="${!free}">Paid session</button>
        <button type="button" data-type="free" aria-pressed="${free}">Free 15-min call</button></div>
      <p class="helper" id="type-help">${free ? 'Buyers confirm their email. One upcoming free call each.' : 'Buyers pay to book.'}</p></div>
    <div class="field"><label class="label" for="f-title">Title <span class="req" aria-hidden="true">*</span></label>
      <input class="input" id="f-title" data-f="title" type="text" maxlength="80" autocomplete="off" placeholder="1:1 Portfolio Review Call" value="${esc(D.title)}" required aria-describedby="e-title">
      <p class="field-err ${S.touched.title && !titleOk() ? 'on' : ''}" id="e-title" role="alert">${S.touched.title && !titleOk() ? 'At least 3 characters' : ''}</p></div>
    <div class="field"><label class="label" for="f-desc">Description <span class="opt">(optional)</span></label>
      <textarea class="textarea tall" id="f-desc" data-f="desc" maxlength="1000" placeholder="What happens on the call? Who is it for?">${esc(D.desc)}</textarea>
      ${counter('c-desc', D.desc, 1000)}<p class="md-hint">Markdown supported</p></div>
    <div class="field"><label class="label" for="f-duration">Duration</label>
      <select class="select" id="f-duration" ${free ? 'disabled' : ''}>${(free ? [15] : DURATIONS).map((m) => `<option value="${m}" ${m === (free ? 15 : D.duration) ? 'selected' : ''}>${m} min</option>`).join('')}</select>
      <p class="helper">${free ? 'Free calls are always 15 minutes.' : ''}</p></div>
    <div class="info-note"><i data-lucide="info" aria-hidden="true"></i><span>${free ? 'Free calls are not recorded.' : 'Every paid session is recorded.'}</span></div>`;
}
function stepTimes() {
  const free = D.type === 'free';
  return `<h2 id="step-title" tabindex="-1">Price &amp; times</h2>
    ${free ? '' : `
    <div class="field"><label class="label" for="f-price">Price (₹) <span class="req" aria-hidden="true">*</span></label>
      <div class="input-group ${S.touched.price && !priceOk() ? 'is-error' : ''}" id="price-group"><span class="addon">₹</span>
        <input class="input" id="f-price" data-f="price" type="text" inputmode="numeric" autocomplete="off" placeholder="999" value="${esc(D.price)}" required aria-describedby="e-price"></div>
      <p class="field-err ${S.touched.price && !priceOk() ? 'on' : ''}" id="e-price" role="alert">${S.touched.price && !priceOk() ? 'Whole rupees, ₹1 to ₹1,00,000' : ''}</p></div>`}
    <div class="field"><span class="label" id="avail-l">Weekly availability</span>
      <div class="avail" role="group" aria-labelledby="avail-l">${DAYS.map(([k, n]) => {
        const d = D.days[k], err = dayErr(k);
        return `<div class="avail-row ${d.on ? '' : 'off'}"><label class="day"><input type="checkbox" data-day="${k}" ${d.on ? 'checked' : ''}>${n}</label>
          ${timeSelect('s-' + k + '-start', d.start, !d.on)}<span class="to" aria-hidden="true">to</span>${timeSelect('s-' + k + '-end', d.end, !d.on)}
          <span class="row-err" id="re-${k}" role="alert">${err}</span></div>`; }).join('')}</div>
      <p class="tz"><i data-lucide="globe" aria-hidden="true"></i>Times are in ${esc(TZ)}.</p></div>
    <div class="info-note warn"><i data-lucide="alert-triangle" aria-hidden="true"></i><span>Open at least one day to take bookings</span></div>`;
}
function stepPreview() {
  const issues = publishIssues();
  return `<div class="preview-bar"><div><h2 id="step-title" tabindex="-1">Preview your session</h2></div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span id="status-pill">${statusPill()}</span>${deviceToggle(S.device)}</div></div>
    <div class="banner"><i data-lucide="eye" aria-hidden="true"></i><span>Not bookable until you publish</span></div>
    <div class="stage-bg"><div id="big-preview" style="width:100%;display:flex;justify-content:center"></div></div>
    ${issues.length ? `<div class="info-note warn" style="margin-top:16px"><i data-lucide="alert-triangle" aria-hidden="true"></i><div><b>Needed to publish</b><ul style="margin:4px 0 0;padding-left:18px">${issues.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>` : ''}`;
}
function stepDone() {
  const pub = S.status === 'published';
  return `<div class="done-card"><div class="done-ic ${pub ? '' : 'draft'}"><i data-lucide="${pub ? 'check' : 'save'}"></i></div>
    <h2 id="step-title" tabindex="-1">${pub ? 'Session published' : 'Draft saved'}</h2>
    ${pub ? '' : '<p>Not bookable until you publish.</p>'}
    <div class="done-actions">
      ${pub ? '' : '<button class="btn btn-primary" type="button" data-resume="4"><i data-lucide="pencil"></i>Keep editing</button>'}
      <button class="btn btn-outline" type="button" data-resume="4"><i data-lucide="eye"></i>Preview</button>
      <a class="btn ${pub ? 'btn-primary' : 'btn-ghost'}" href="dashboard.html?state=new">Dashboard</a></div>
    <p class="proto-note">Prototype. No real bookings.</p></div>`;
}

/* ---------- footer actions ---------- */
function actions() {
  const back = '<button class="btn btn-outline" type="button" id="back"><i data-lucide="arrow-left"></i>Back</button>';
  if (S.step === 1) return `<div class="actions-bar"><span></span><button class="btn btn-primary" type="button" id="next">Continue<i data-lucide="arrow-right"></i></button></div>`;
  if (S.step === 2 || S.step === 3) return `<div class="actions-bar">${back}<span class="hint" id="step-hint">${stepValid(S.step) ? '' : (S.step === 2 ? 'Add a title' : 'Fix the highlighted fields')}</span>
    <button class="btn btn-primary" type="button" id="next" ${stepValid(S.step) ? '' : 'disabled'}>Continue<i data-lucide="arrow-right"></i></button></div>`;
  const can = publishIssues().length === 0;
  return `<div class="actions-bar">${back}<span class="grow"><span class="field-err ${S.saveErr ? 'on' : ''}" id="e-save" role="alert" style="margin:0;text-align:right">${esc(S.saveErr)}</span></span>
    <button class="btn btn-outline" type="button" id="draft" ${titleOk() ? '' : 'disabled'}><span class="spinner" aria-hidden="true"></span><span class="label-text">Save draft</span></button>
    <button class="btn btn-primary" type="button" id="publish" ${can ? '' : 'disabled'}><span class="spinner" aria-hidden="true"></span><span class="label-text">Publish</span></button></div>`;
}

/* ---------- render ---------- */
function render() {
  renderStepper($('#stepper'), LABELS, S.view === 'done' ? 5 : S.step, S.max, go);
  if (S.view === 'done') { $('#stage').innerHTML = `<section class="card">${stepDone()}</section>`; wire(); icons(); focusTitle(); return; }
  const body = [stepExpertise, stepSession, stepTimes, stepPreview][S.step - 1]();
  if (S.step === 4) $('#stage').innerHTML = `<section class="card panel">${body}${actions()}</section>`;
  else $('#stage').innerHTML = `<div class="setup-grid"><section class="card panel">${body}${actions()}</section>
    <aside class="preview-col" aria-label="Live preview"><div class="preview-head"><h3>Live preview</h3><span id="status-pill">${statusPill()}</span></div>
      <div class="stage-bg"><div id="live" style="width:100%"></div></div></aside></div>`;
  wire(); updatePreview(); icons(); focusTitle();
}
function go(n) {
  if (n > S.max) return;
  S.view = 'wizard'; S.step = n; persist(); render();
}

/* ---------- save / publish ---------- */
async function commit(status, btnId) {
  if (S.saving) return;
  S.saving = true; S.saveErr = '';
  const btn = $('#' + btnId); setLoading(btn, true); $$('.actions-bar button').forEach((b) => (b.disabled = true));
  await delay(700); // simulated network round-trip
  const prev = { status: S.status, snapshot: S.snapshot };
  S.status = status; S.snapshot = JSON.stringify(D);
  if (!persist(status === 'published' ? 'Session published' : 'Draft saved')) {
    Object.assign(S, prev); S.saving = false;
    S.saveErr = 'Couldn’t save. Your changes are still here.';
    render(); return;
  }
  S.saving = false; S.view = 'done'; render();
}

/* ---------- events ---------- */
function refreshNav() {
  const next = $('#next'); if (next && S.step !== 1) next.disabled = !stepValid(S.step);
  const hint = $('#step-hint'); if (hint) hint.textContent = stepValid(S.step) ? '' : (S.step === 2 ? 'Add a title' : 'Fix the highlighted fields');
}
function wire() {
  const stage = $('#stage');
  stage.oninput = (e) => {
    const t = e.target, f = t.dataset && t.dataset.f;
    if (f) {
      D[f] = t.value; const c = $('#c-' + f); if (c) c.textContent = t.value.length;
      if (f === 'title') { S.touched.title = true; const m = $('#e-title'); m.classList.toggle('on', !titleOk()); m.textContent = titleOk() ? '' : 'At least 3 characters'; }
      if (f === 'price') { D.price = t.value.replace(/[^\d]/g, ''); if (D.price !== t.value) t.value = D.price; S.touched.price = true;
        const m = $('#e-price'); m.classList.toggle('on', !priceOk()); m.textContent = priceOk() ? '' : 'Whole rupees, ₹1 to ₹1,00,000'; $('#price-group').classList.toggle('is-error', !priceOk()); }
      refreshNav(); persistSoon(); updatePreview(); return;
    }
    const m = /^s-(\w+)-(start|end)$/.exec(t.id);
    if (m) { D.days[m[1]][m[2]] = t.value; $('#re-' + m[1]).textContent = dayErr(m[1]); refreshNav(); persistSoon(); updatePreview(); }
  };
  stage.onchange = (e) => {
    const t = e.target;
    if (t.id === 'f-duration') { D.duration = +t.value; persistSoon(); updatePreview(); }
    if (t.dataset && t.dataset.day) {
      D.days[t.dataset.day].on = t.checked; const row = t.closest('.avail-row'); row.classList.toggle('off', !t.checked);
      $$('select', row).forEach((s) => (s.disabled = !t.checked)); $('#re-' + t.dataset.day).textContent = dayErr(t.dataset.day);
      refreshNav(); persistSoon(); updatePreview();
    }
  };
  stage.onclick = (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.id === 'next') { if (!stepValid(S.step)) return; S.max = Math.max(S.max, S.step + 1); go(S.step + 1); }
    else if (b.id === 'back') go(S.step - 1);
    else if (b.id === 'draft') commit('draft', 'draft');
    else if (b.id === 'publish') { if (publishIssues().length) return; commit('published', 'publish'); }
    else if (b.dataset.lang) { const l = b.dataset.lang, on = b.getAttribute('aria-pressed') !== 'true'; D.langs = on ? [...D.langs, l] : D.langs.filter((x) => x !== l); b.setAttribute('aria-pressed', on); persistSoon(); updatePreview(); }
    else if (b.dataset.type) {
      D.type = b.dataset.type; D.duration = D.type === 'free' ? 15 : (D.duration === 15 ? 30 : D.duration);
      persist(); render();
    }
    else if (b.dataset.device) { S.device = b.dataset.device; $$('[data-device]').forEach((x) => x.setAttribute('aria-pressed', x === b)); updatePreview(); }
    else if (b.dataset.resume) { S.view = 'wizard'; S.step = +b.dataset.resume; persist(); render(); }
  };
}
$('#exit').addEventListener('click', () => persist());
// only flush on leave if this journey was actually started — just opening the page shouldn't count as progress
window.addEventListener('pagehide', () => { if (Store.read(SS_KEY)) Store.write(SS_KEY, { status: S.status, step: S.step, maxStep: S.max, data: D, snapshot: S.snapshot, savedAt: Date.now() }); });

/* ---------- boot ---------- */
render();
if (saved.savedAt) $('#save-ind').innerHTML = `<i data-lucide="check"></i><span class="t">Draft restored · saved ${timeAgo(saved.savedAt)}</span>`;
icons();
