// Kreato — Create your storefront profile. Depends on setup-common.js + setup-shared.js.
// Steps: 1 Photo & banner -> 2 About you (who you are, professions, what you do, bio) -> 3 Social handles.
// Store name + link are set during onboarding / dashboard step 1, so they aren't asked again here.
// Finishing saves the profile, then a pop-up offers a preview. Adding a product is dashboard step 3 (product-new.html).
const LABELS = ['Photo & banner', 'About you', 'Social handles'];
const PROFESSIONS = ['Developer', 'Artist', 'Musician', 'Writer', 'Designer', 'Educator', 'Content Creator', 'Photographer', 'Digital Artist', 'Blogger', 'Freelancer', 'Coach / Consultant', 'Marketer', 'Other'];
const MAX_PROF = 3, MAX_IMG = 5 * 1024 * 1024;

const saved = Store.read(SF_KEY) || {};
const D = getStorefrontData(); // includes defaults for every field
const S = {
  step: 1, max: 1, status: saved.status || 'new', snapshot: saved.snapshot || null,
  imgErr: { logo: '', banner: '' }, saveErr: '', saving: false, socErr: {}, touched: {},
};
S.max = S.status === 'complete' ? 3 : Math.min(saved.maxStep || 1, 3);
S.step = Math.min(Math.max(+new URLSearchParams(location.search).get('step') || saved.step || 1, 1), S.max);

const headlineOk = () => D.headline.trim().length >= 3;
const profOk = () => D.professions.length >= 1;
const socialsOk = () => SOCIALS.every((s) => socialOk(D.socials[s.id]));
const stepValid = (n) => (n === 2 ? headlineOk() && profOk() : n === 3 ? socialsOk() : true);
const isDirty = () => S.status === 'complete' && JSON.stringify(D) !== S.snapshot;
const reqHint = () => (S.step === 2 && !stepValid(2) ? 'Add who you are and a profession' : S.step === 3 && !stepValid(3) ? 'Fix the highlighted usernames' : '');

function persist(msg) {
  const ok = Store.write(SF_KEY, { status: S.status, step: S.step, maxStep: S.max, data: D, snapshot: S.snapshot, savedAt: Date.now() });
  $('#save-ind').innerHTML = ok ? `<i data-lucide="check"></i><span class="t">${msg || 'Saved on this device'}</span>` : '<span class="t">Couldn’t save. Storage is blocked.</span>';
  icons();
  return ok;
}
const persistSoon = debounce(() => persist(), 400);

function statusPill() {
  if (S.status !== 'complete') return '<span class="pill warn">Not saved yet</span>';
  return isDirty() ? '<span class="pill warn">Unsaved changes</span>' : '<span class="pill ok">Saved</span>';
}
function updatePreview() {
  const live = $('#live'); if (live) { live.innerHTML = deviceFrame('mobile', 'kreato.co.in/' + (D.handle || 'yourname'), storefrontHTML(D, publishedProducts())); icons(); }
  const pill = $('#status-pill'); if (pill) pill.innerHTML = statusPill();
}

/* ---------- step templates ---------- */
const counter = (id, v, max) => `<div class="counter"><span id="${id}">${v.length}</span>/${max}</div>`;
const imgErr = (k) => `<p class="field-err ${S.imgErr[k] ? 'on' : ''}" id="e-${k}" role="alert">${esc(S.imgErr[k])}</p>`;

function stepImages() {
  const initial = (D.name || 'K').trim().charAt(0).toUpperCase() || 'K';
  return `<h2 id="step-title" tabindex="-1">Profile picture &amp; banner</h2>
    <div class="field"><span class="label" id="logo-l">Profile picture <span class="opt">(optional)</span></span>
      <div class="logo-up"><span class="logo-prev" aria-hidden="true">${D.logo ? `<img src="${D.logo}" alt="">` : esc(initial)}</span>
        <div><div class="logo-actions">
          <button class="btn btn-outline btn-sm" type="button" data-pick="logo"><i data-lucide="upload"></i>${D.logo ? 'Replace' : 'Upload photo'}</button>
          ${D.logo ? '<button class="btn btn-ghost" type="button" data-rm="logo">Remove</button>' : ''}</div>
          <p class="helper">400 × 400 px. PNG, JPG or WebP, max 5 MB.</p></div></div>
      <input type="file" id="file-logo" data-img="logo" accept="image/png,image/jpeg,image/webp" hidden aria-labelledby="logo-l">${imgErr('logo')}</div>
    <div class="field"><span class="label" id="banner-l">Banner <span class="opt">(optional)</span></span>
      <div class="banner-prev ${D.banner ? 'has' : ''}" aria-hidden="true">${D.banner ? `<img src="${D.banner}" alt="">` : '<span><i data-lucide="image"></i>No banner yet</span>'}</div>
      <div class="logo-actions" style="margin-top:10px">
        <button class="btn btn-outline btn-sm" type="button" data-pick="banner"><i data-lucide="upload"></i>${D.banner ? 'Replace banner' : 'Upload banner'}</button>
        ${D.banner ? '<button class="btn btn-ghost" type="button" data-rm="banner">Remove</button>' : ''}</div>
      <p class="helper">1500 × 500 px. PNG, JPG or WebP, max 5 MB.</p>
      <input type="file" id="file-banner" data-img="banner" accept="image/png,image/jpeg,image/webp" hidden aria-labelledby="banner-l">${imgErr('banner')}</div>
    <div class="public-note"><i data-lucide="globe" aria-hidden="true"></i><span>Visible to everyone</span></div>`;
}
function stepAbout() {
  const full = D.professions.length >= MAX_PROF;
  const showH = S.touched.headline && !headlineOk();
  return `<h2 id="step-title" tabindex="-1">About you</h2>
    <div class="field"><label class="label" for="f-headline">Who you are <span class="req" aria-hidden="true">*</span></label>
      <input class="input ${showH ? 'is-err' : ''}" id="f-headline" data-f="headline" type="text" maxlength="60" autocomplete="off" placeholder="e.g. Travel photographer from Kochi" value="${esc(D.headline)}" required aria-describedby="h-headline e-headline">
      <p class="helper" id="h-headline">Shown under your store name</p>
      <p class="field-err ${showH ? 'on' : ''}" id="e-headline" role="alert">${showH ? 'At least 3 characters' : ''}</p></div>
    <div class="field"><span class="label" id="prof-l">Professions <span class="req" aria-hidden="true">*</span> <span class="opt">(up to ${MAX_PROF})</span>
        <span class="opt" id="prof-count" aria-live="polite" style="float:right">${D.professions.length}/${MAX_PROF} selected</span></span>
      <div class="toggle-group" role="group" aria-labelledby="prof-l">${PROFESSIONS.map((p) => {
        const on = D.professions.includes(p), off = full && !on;
        return `<button type="button" class="toggle ${off ? 'is-disabled' : ''}" data-prof="${esc(p)}" aria-pressed="${on}" ${off ? 'aria-disabled="true"' : ''}>${esc(p)}</button>`; }).join('')}</div></div>
    <div class="field"><label class="label" for="f-tagline">What you do <span class="opt">(optional)</span></label>
      <input class="input" id="f-tagline" data-f="tagline" type="text" maxlength="100" autocomplete="off" placeholder="e.g. I make Lightroom presets and Reels templates for travel creators" value="${esc(D.tagline)}">
      ${counter('c-tagline', D.tagline, 100)}</div>
    <div class="field"><label class="label" for="f-about">Bio <span class="opt">(optional)</span></label>
      <textarea class="textarea" id="f-about" data-f="about" maxlength="500" placeholder="Your background and who your products are for">${esc(D.about)}</textarea>
      ${counter('c-about', D.about, 500)}</div>
    <div class="public-note"><i data-lucide="globe" aria-hidden="true"></i><span>Visible to everyone</span></div>`;
}
function stepSocials() {
  return `<h2 id="step-title" tabindex="-1">Social handles</h2>
    <p class="lead">All optional. Paste a username or a link.</p>
    ${SOCIALS.map((s, i) => `<div class="field ${i ? 'sm' : ''}"><label class="label" for="soc-${s.id}">${s.label}</label>
      <div class="input-group ${S.socErr[s.id] ? 'is-error' : ''}" id="sg-${s.id}"><span class="addon">${s.addon}</span>
        <input class="input" id="soc-${s.id}" data-soc="${s.id}" type="text" maxlength="100" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${s.ph}" value="${esc(D.socials[s.id])}" aria-describedby="se-${s.id}"></div>
      <p class="field-err ${S.socErr[s.id] ? 'on' : ''}" id="se-${s.id}" role="alert">${esc(S.socErr[s.id] || '')}</p></div>`).join('')}
    <div class="public-note"><i data-lucide="globe" aria-hidden="true"></i><span>Visible to everyone</span></div>`;
}

/* ---------- footer actions ---------- */
function actions() {
  const back = '<button class="btn btn-outline" type="button" id="back"><i data-lucide="arrow-left"></i>Back</button>';
  const hint = `<span class="hint" id="step-hint">${reqHint()}</span>`;
  if (S.step === 1) return `<div class="actions-bar"><span></span><button class="btn btn-primary" type="button" id="next">Continue<i data-lucide="arrow-right"></i></button></div>`;
  if (S.step === 2) return `<div class="actions-bar">${back}${hint}<button class="btn btn-primary" type="button" id="next" ${stepValid(2) ? '' : 'disabled'}>Continue<i data-lucide="arrow-right"></i></button></div>`;
  return `<div class="actions-bar">${back}<span class="grow"><span class="field-err ${S.saveErr ? 'on' : ''}" id="e-save" role="alert" style="margin:0;text-align:right">${esc(S.saveErr)}</span>${hint}</span>
    <button class="btn btn-primary" type="button" id="save" ${stepValid(3) ? '' : 'disabled'}><span class="spinner" aria-hidden="true"></span><span class="label-text">${S.status === 'complete' ? 'Save changes' : 'Finish setup'}</span></button></div>`;
}

/* ---------- render ---------- */
function render() {
  renderStepper($('#stepper'), LABELS, S.step, S.max, go);
  const body = [stepImages, stepAbout, stepSocials][S.step - 1]();
  $('#stage').innerHTML = `<div class="setup-grid"><section class="card panel">${body}${actions()}</section>
    <aside class="preview-col" aria-label="Live preview"><div class="preview-head"><h3>Live preview</h3><span id="status-pill">${statusPill()}</span></div>
      <div class="stage-bg"><div id="live" style="width:100%"></div></div></aside></div>`;
  wire(); updatePreview(); icons(); focusTitle();
}
function go(n) {
  if (n > S.max || n === S.step) return;
  S.step = n; persist(); render();
}
function refreshNav() {
  const next = $('#next'); if (next && S.step === 2) next.disabled = !stepValid(2);
  const save = $('#save'); if (save) save.disabled = !stepValid(3);
  const hint = $('#step-hint'); if (hint) hint.textContent = reqHint();
}

/* ---------- images: cropped + resized in the browser, stored with the profile ---------- */
const IMG = { logo: { w: 400, h: 400, label: 'profile picture' }, banner: { w: 1200, h: 400, label: 'banner' } };
function setImage(kind, file) {
  S.imgErr[kind] = '';
  if (!file) return;
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) S.imgErr[kind] = 'Use a PNG, JPG or WebP image';
  else if (file.size > MAX_IMG) S.imgErr[kind] = 'Image is over 5 MB';
  if (S.imgErr[kind]) return render();
  const img = new Image(), url = URL.createObjectURL(file), t = IMG[kind];
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = t.w; c.height = t.h;
    const r = t.w / t.h, sw = Math.min(img.width, img.height * r), sh = sw / r; // centre crop to the target ratio
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, t.w, t.h);
    g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, t.w, t.h);
    D[kind] = c.toDataURL('image/jpeg', 0.86); URL.revokeObjectURL(url);
    if (!persist()) { D[kind] = ''; S.imgErr[kind] = `Couldn’t save the ${t.label}. Storage is full.`; }
    render();
  };
  img.onerror = () => { URL.revokeObjectURL(url); S.imgErr[kind] = 'Couldn’t read that image'; render(); };
  img.src = url;
}

/* ---------- finish: save, then offer a preview ---------- */
async function save() {
  if (S.saving || !stepValid(3) || !stepValid(2)) { if (!stepValid(2)) { S.touched.headline = true; go(2); } return; }
  S.saving = true; S.saveErr = '';
  const btn = $('#save'); setLoading(btn, true);
  await delay(700); // simulated network round-trip
  const prev = { status: S.status, snapshot: S.snapshot, max: S.max };
  S.status = 'complete'; S.snapshot = JSON.stringify(D); S.max = 3;
  if (!persist('Profile saved')) {
    Object.assign(S, prev); S.saving = false;
    S.saveErr = 'Couldn’t save. Your changes are still here.';
    render(); return;
  }
  S.saving = false; render(); askPreview();
}
function askPreview() {
  Modal.open(`<div class="modal-body center"><div class="done-ic"><i data-lucide="check"></i></div>
    <h2 id="modal-title">Your storefront is ready</h2>
    <div class="done-actions"><button class="btn btn-primary" type="button" id="m-preview" data-autofocus><i data-lucide="eye"></i>Preview storefront</button>
      <a class="btn btn-ghost" href="dashboard.html?state=new">Go to dashboard</a></div>
    <p class="proto-note">Prototype. Saved on this device.</p></div>`).addEventListener('click', (e) => {
    if (e.target.closest('#m-preview')) showPreview();
  });
}
function showPreview() {
  openStorefrontPreview(`<button class="btn btn-outline" type="button" data-close>Keep editing</button>
    <a class="btn btn-primary" href="dashboard.html?state=new">Go to dashboard<i data-lucide="arrow-right"></i></a>`);
}

/* ---------- events ---------- */
function toggleProfession(b) {
  if (b.getAttribute('aria-disabled') === 'true') return toast(`Up to ${MAX_PROF}. Deselect one first.`);
  const p = b.dataset.prof;
  D.professions = D.professions.includes(p) ? D.professions.filter((x) => x !== p) : [...D.professions, p];
  const full = D.professions.length >= MAX_PROF;
  $$('[data-prof]').forEach((x) => {
    const on = D.professions.includes(x.dataset.prof), off = full && !on;
    x.setAttribute('aria-pressed', on); x.classList.toggle('is-disabled', off);
    if (off) x.setAttribute('aria-disabled', 'true'); else x.removeAttribute('aria-disabled');
  });
  $('#prof-count').textContent = D.professions.length + '/' + MAX_PROF + ' selected';
  refreshNav(); persistSoon(); updatePreview();
}
function wire() {
  const stage = $('#stage');
  stage.oninput = (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.soc) {
      const id = t.dataset.soc, v = normSocial(t.value); D.socials[id] = v; // pasted links are reduced as you type
      S.socErr[id] = socialOk(v) ? '' : 'Username only, like hanufa';
      $('#se-' + id).textContent = S.socErr[id]; $('#se-' + id).classList.toggle('on', !!S.socErr[id]); $('#sg-' + id).classList.toggle('is-error', !!S.socErr[id]);
      refreshNav(); persistSoon(); updatePreview(); return;
    }
    const f = t.dataset && t.dataset.f; if (!f) return;
    D[f] = t.value;
    const c = $('#c-' + f); if (c) c.textContent = t.value.length;
    if (f === 'headline') {
      S.touched.headline = true;
      const m = $('#e-headline'); m.classList.toggle('on', !headlineOk()); m.textContent = headlineOk() ? '' : 'At least 3 characters';
      t.classList.toggle('is-err', !headlineOk());
    }
    refreshNav(); persistSoon(); updatePreview();
  };
  stage.onfocusout = (e) => { // show the tidied username once the user leaves the field
    const t = e.target; if (t.dataset && t.dataset.soc && t.value !== D.socials[t.dataset.soc]) t.value = D.socials[t.dataset.soc];
  };
  stage.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'next') { if (!stepValid(S.step)) return; S.max = Math.max(S.max, S.step + 1); go(S.step + 1); }
    else if (b.id === 'back') go(S.step - 1);
    else if (b.id === 'save') save();
    else if (b.dataset.pick) $('#file-' + b.dataset.pick).click();
    else if (b.dataset.rm) { D[b.dataset.rm] = ''; S.imgErr[b.dataset.rm] = ''; persist(); render(); }
    else if (b.dataset.prof) toggleProfession(b);
  };
  $$('[data-img]', stage).forEach((inp) => { inp.onchange = () => { setImage(inp.dataset.img, inp.files[0]); inp.value = ''; }; });
}
$('#exit').addEventListener('click', () => persist());
// only flush on leave if this journey was actually started — just opening the page shouldn't count as progress
window.addEventListener('pagehide', () => { if (Store.read(SF_KEY)) Store.write(SF_KEY, { status: S.status, step: S.step, maxStep: S.max, data: D, snapshot: S.snapshot, savedAt: Date.now() }); });

/* ---------- boot ---------- */
render();
if (saved.savedAt) $('#save-ind').innerHTML = `<i data-lucide="check"></i><span class="t">Draft restored · saved ${timeAgo(saved.savedAt)}</span>`;
icons();
