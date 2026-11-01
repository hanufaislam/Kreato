// Kreato — Create your storefront profile. Depends on setup-common.js + setup-shared.js.
// Steps: 1 Photos (profile picture, banner) -> 2 About you (intro, professions, bio) -> 3 Socials.
// Store name + link are set during onboarding / dashboard step 1, so they aren't asked again here.
// Finishing saves the profile, then a pop-up offers the real storefront (store.html). Adding a product is dashboard step 3.
const LABELS = ['Photos', 'About you', 'Socials'];
const PROFESSIONS = ['Developer', 'Artist', 'Musician', 'Writer', 'Designer', 'Educator', 'Content Creator', 'Photographer', 'Digital Artist', 'Blogger', 'Freelancer', 'Coach / Consultant', 'Marketer', 'Other'];
const MAX_PROF = 3, MAX_IMG = 5 * 1024 * 1024;

const saved = Store.read(SF_KEY) || {};
const D = getStorefrontData(); // includes defaults for every field
const S = {
  step: 1, max: 1, status: saved.status || 'new', snapshot: saved.snapshot || null,
  imgErr: { logo: '', banner: '' }, saveErr: '', saving: false, socErr: {}, touched: {}, tried: {},
};
S.max = S.status === 'complete' ? 3 : Math.min(saved.maxStep || 1, 3);
S.step = Math.min(Math.max(+new URLSearchParams(location.search).get('step') || saved.step || 1, 1), S.max);

const headlineOk = () => D.headline.trim().length >= 3;
const profOk = () => D.professions.length >= 1;
const socialsOk = () => SOCIALS.every((s) => socialOk(D.socials[s.id]));
const stepValid = (n) => (n === 2 ? headlineOk() && profOk() : n === 3 ? socialsOk() : true);
const isDirty = () => S.status === 'complete' && JSON.stringify(D) !== S.snapshot;
const headlineMsg = () => ((S.touched.headline || S.tried[2]) && !headlineOk() ? 'Add a short intro, at least 3 characters' : '');
const profMsg = () => (S.tried[2] && !profOk() ? 'Pick at least one profession' : '');
const NEXT = { 1: 'Next: About you', 2: 'Next: Socials' };

function persist(msg) {
  const ok = Store.write(SF_KEY, { status: S.status, step: S.step, maxStep: S.max, data: D, snapshot: S.snapshot, savedAt: Date.now() });
  $('#save-ind').innerHTML = ok ? `<i data-lucide="check"></i><span class="t">${msg || 'Saved on this device'}</span>` : '<span class="t">Couldn’t save. Storage is blocked.</span>';
  icons();
  return ok;
}
const persistSoon = debounce(() => persist(), 400);

function statusPill() {
  if (S.status !== 'complete') return '<span class="pill warn">Not published</span>';
  return isDirty() ? '<span class="pill warn">Unsaved changes</span>' : '<span class="pill ok">Live</span>';
}
function updatePreview() {
  const live = $('#live'); if (live) { live.innerHTML = storefrontHTML(D, [], { compact: true }); icons(); }
  const pill = $('#status-pill'); if (pill) pill.innerHTML = statusPill();
}

/* ---------- step 1: photos ---------- */
const imgErr = (k) => `<p class="field-err ${S.imgErr[k] ? 'on' : ''}" id="e-${k}" role="alert">${esc(S.imgErr[k])}</p>`;
function upRow(kind, title, rule) {
  const has = !!D[kind], initial = (D.name || 'K').trim().charAt(0).toUpperCase() || 'K';
  const thumb = kind === 'logo'
    ? `<span class="up-thumb round">${has ? `<img src="${D.logo}" alt="">` : esc(initial)}</span>`
    : `<span class="up-thumb wide">${has ? `<img src="${D.banner}" alt="">` : '<i data-lucide="image"></i>'}</span>`;
  return `<div class="up-row">${thumb}
      <span class="txt"><b id="${kind}-l">${title}</b><small>${rule}</small></span>
      <button class="btn btn-outline btn-sm" type="button" data-pick="${kind}" aria-describedby="${kind}-l">${has ? 'Replace' : 'Upload'}</button>
      ${has ? `<button class="icon-btn" type="button" data-rm="${kind}" aria-label="Remove ${title.toLowerCase()}"><i data-lucide="trash-2"></i></button>` : ''}
      <input type="file" id="file-${kind}" data-img="${kind}" accept="image/png,image/jpeg,image/webp" hidden aria-labelledby="${kind}-l"></div>
    ${imgErr(kind)}`;
}
function stepImages() {
  return `<h2 id="step-title" tabindex="-1">Add a photo and banner</h2>
    <p class="lead">Shown on your public storefront.</p>
    <p class="sec-label">Images <span style="font-weight:400">(optional)</span></p>
    <div class="up-rows">${upRow('logo', 'Profile picture', 'Square, at least 400 × 400 px')}${upRow('banner', 'Banner', 'Wide, 1500 × 500 px')}</div>
    <p class="helper" style="margin-top:12px">PNG, JPG or WebP. Max 5 MB each.</p>`;
}

/* ---------- step 2: about you ---------- */
function profChips() {
  const full = D.professions.length >= MAX_PROF;
  return PROFESSIONS.map((p) => {
    const on = D.professions.includes(p), off = full && !on;
    return `<button type="button" class="chip-t2 ${off ? 'is-disabled' : ''}" data-prof="${esc(p)}" aria-pressed="${on}" ${off ? 'aria-disabled="true"' : ''}>${on ? '<i data-lucide="check"></i>' : ''}${esc(p)}</button>`;
  }).join('');
}
function stepAbout() {
  const hm = headlineMsg(), pm = profMsg();
  return `<h2 id="step-title" tabindex="-1">Tell buyers about you</h2>
    <p class="sec-label">Introduction</p>
    <div class="field"><label class="label" for="f-headline">Who you are <span class="req" aria-hidden="true">*</span></label>
      <input class="input ${hm ? 'is-err' : ''}" id="f-headline" data-f="headline" type="text" maxlength="60" autocomplete="off" placeholder="e.g. Travel photographer from Kochi" value="${esc(D.headline)}" required aria-describedby="h-headline e-headline">
      <p class="helper" id="h-headline">Shown under your store name</p>
      <p class="field-err ${hm ? 'on' : ''}" id="e-headline" role="alert">${hm}</p></div>
    <div class="field"><label class="label" for="f-tagline">What you do <span class="opt">(optional)</span></label>
      <input class="input" id="f-tagline" data-f="tagline" type="text" maxlength="100" autocomplete="off" placeholder="e.g. Lightroom presets for travel creators" value="${esc(D.tagline)}"></div>
    <p class="sec-label sec-row"><span id="prof-l">Professions <span class="req" aria-hidden="true">*</span></span><span id="prof-count" aria-live="polite">${D.professions.length} of ${MAX_PROF}</span></p>
    <div class="chips2" role="group" aria-labelledby="prof-l" aria-describedby="e-prof">${profChips()}</div>
    <p class="field-err ${pm ? 'on' : ''}" id="e-prof" role="alert">${pm}</p>
    <div class="field" style="margin-top:36px"><label class="label" for="f-about">Bio <span class="opt">(optional)</span></label>
      <textarea class="textarea" id="f-about" data-f="about" maxlength="500" placeholder="Your background and who your products are for">${esc(D.about)}</textarea>
      <div class="counter"><span id="c-about">${D.about.length}</span>/500</div></div>`;
}

/* ---------- step 3: socials ---------- */
function stepSocials() {
  return `<h2 id="step-title" tabindex="-1">Where can buyers find you?</h2>
    <p class="lead">All optional. Paste a username or a link.</p>
    <div class="soc-rows">${SOCIALS.map((s) => `<div class="soc-row"><span class="ic" aria-hidden="true"><i data-lucide="${s.icon}"></i></span>
      <div class="txt"><label class="label" for="soc-${s.id}">${s.label}</label>
        <div class="input-group ${S.socErr[s.id] ? 'is-error' : ''}" id="sg-${s.id}"><span class="addon">${s.addon}</span>
          <input class="input" id="soc-${s.id}" data-soc="${s.id}" type="text" maxlength="100" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${s.ph}" value="${esc(D.socials[s.id])}" aria-describedby="se-${s.id}"></div>
        <p class="field-err ${S.socErr[s.id] ? 'on' : ''}" id="se-${s.id}" role="alert">${esc(S.socErr[s.id] || '')}</p></div></div>`).join('')}</div>`;
}

/* ---------- footer + side ---------- */
function actions() {
  const back = S.step > 1 ? '<button class="btn btn-outline" type="button" id="back"><i data-lucide="arrow-left"></i>Back</button>' : '<span></span>';
  if (S.step < 3) return `<div class="actions-bar">${back}<button class="btn btn-primary" type="button" id="next">${NEXT[S.step]}<i data-lucide="arrow-right"></i></button></div>`;
  return `<div class="actions-bar">${back}<span class="grow"><span class="field-err ${S.saveErr ? 'on' : ''}" id="e-save" role="alert" style="margin:0;text-align:right">${esc(S.saveErr)}</span></span>
    <button class="btn btn-primary" type="button" id="save"><span class="spinner" aria-hidden="true"></span><span class="label-text">${S.status === 'complete' ? 'Save changes' : 'Finish'}</span></button></div>`;
}
function sideHTML() {
  return `<aside class="side-stack" aria-label="Storefront preview"><section class="side-card">
    <div class="side-head"><h3>Preview</h3><span id="status-pill">${statusPill()}</span></div>
    <div class="mini-sf" id="live"></div>
    <p class="side-url"><i data-lucide="link"></i>kreato.co.in/${esc(D.handle)}</p></section></aside>`;
}

/* ---------- render ---------- */
function render(keepFocus) {
  const focus = keepFocus && document.activeElement && document.activeElement.id;
  renderStepper($('#stepper'), LABELS, S.step, S.max, go);
  const body = [stepImages, stepAbout, stepSocials][S.step - 1]();
  $('#stage').innerHTML = `<div class="setup-grid"><section class="panel">${body}${actions()}</section>${sideHTML()}</div>`;
  wire(); updatePreview(); icons();
  const f = focus && document.getElementById(focus);
  if (f && !f.disabled) f.focus({ preventScroll: true }); else if (!keepFocus) focusTitle();
}
function go(n) {
  if (n > S.max || n === S.step) return;
  S.step = n; persist(); render();
}
function next() {
  if (!stepValid(S.step)) { // explain what's missing at the field instead of a dead button
    S.tried[S.step] = true; render(true);
    const el = S.step === 2 ? (!headlineOk() ? $('#f-headline') : $('[data-prof]')) : $('.soc-row .is-error input');
    if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center' }); }
    return;
  }
  S.max = Math.max(S.max, S.step + 1); S.step += 1; persist(); render();
}

/* ---------- images: cropped + resized in the browser, stored with the profile ---------- */
const IMG = { logo: { w: 400, h: 400, label: 'profile picture' }, banner: { w: 1200, h: 400, label: 'banner' } };
function setImage(kind, file) {
  S.imgErr[kind] = '';
  if (!file) return;
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) S.imgErr[kind] = 'Use a PNG, JPG or WebP image';
  else if (file.size > MAX_IMG) S.imgErr[kind] = 'Image is over 5 MB';
  if (S.imgErr[kind]) return render(true);
  const img = new Image(), url = URL.createObjectURL(file), t = IMG[kind];
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = t.w; c.height = t.h;
    const r = t.w / t.h, sw = Math.min(img.width, img.height * r), sh = sw / r; // centre crop to the target ratio
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, t.w, t.h);
    g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, t.w, t.h);
    D[kind] = c.toDataURL('image/jpeg', 0.86); URL.revokeObjectURL(url);
    if (!persist()) { D[kind] = ''; S.imgErr[kind] = `Couldn’t save the ${t.label}. Storage is full.`; }
    render(true);
  };
  img.onerror = () => { URL.revokeObjectURL(url); S.imgErr[kind] = 'Couldn’t read that image'; render(true); };
  img.src = url;
}

/* ---------- finish: save, then offer the real storefront ---------- */
async function save() {
  if (S.saving) return;
  if (!stepValid(2)) { S.tried[2] = true; S.step = 2; persist(); render(); $('#f-headline').focus(); return; }
  if (!stepValid(3)) { next(); return; }
  S.saving = true; S.saveErr = '';
  const btn = $('#save'); setLoading(btn, true);
  await delay(700); // simulated network round-trip
  const prev = { status: S.status, snapshot: S.snapshot, max: S.max };
  S.status = 'complete'; S.snapshot = JSON.stringify(D); S.max = 3;
  if (!persist('Profile saved')) {
    Object.assign(S, prev); S.saving = false;
    S.saveErr = 'Couldn’t save. Your changes are still here.';
    render(true); return;
  }
  S.saving = false; render(true); askPreview();
}
function askPreview() {
  Modal.open(`<div class="modal-body center"><div class="done-ic"><i data-lucide="check"></i></div>
    <h2 id="modal-title">Your storefront is ready</h2>
    <p>See it the way buyers will.</p>
    <div class="done-actions"><a class="btn btn-primary" id="m-preview" href="store.html" data-autofocus><i data-lucide="eye"></i>View storefront</a>
      <a class="btn btn-ghost" href="dashboard.html?state=new">Go to dashboard</a></div>
    <p class="proto-note">Prototype. Saved on this device.</p></div>`);
}

/* ---------- events ---------- */
function toggleProfession(b) {
  if (b.getAttribute('aria-disabled') === 'true') return toast(`Up to ${MAX_PROF}. Deselect one first.`);
  const p = b.dataset.prof;
  D.professions = D.professions.includes(p) ? D.professions.filter((x) => x !== p) : [...D.professions, p];
  const focusP = p;
  $('.chips2').innerHTML = profChips();
  $('#prof-count').textContent = D.professions.length + ' of ' + MAX_PROF;
  const pm = profMsg(); $('#e-prof').textContent = pm; $('#e-prof').classList.toggle('on', !!pm);
  const again = $(`[data-prof="${CSS.escape(focusP)}"]`); if (again) again.focus();
  icons(); persistSoon(); updatePreview();
}
function wire() {
  const stage = $('#stage');
  stage.oninput = (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.soc) {
      const id = t.dataset.soc, v = normSocial(t.value); D.socials[id] = v; // pasted links are reduced as you type
      S.socErr[id] = socialOk(v) ? '' : 'Username only, like hanufa';
      $('#se-' + id).textContent = S.socErr[id]; $('#se-' + id).classList.toggle('on', !!S.socErr[id]); $('#sg-' + id).classList.toggle('is-error', !!S.socErr[id]);
      persistSoon(); updatePreview(); return;
    }
    const f = t.dataset && t.dataset.f; if (!f) return;
    D[f] = t.value;
    const c = $('#c-' + f); if (c) c.textContent = t.value.length;
    if (f === 'headline') {
      S.touched.headline = true;
      const m = $('#e-headline'), hm = headlineMsg(); m.classList.toggle('on', !!hm); m.textContent = hm;
      t.classList.toggle('is-err', !!hm);
    }
    persistSoon(); updatePreview();
  };
  stage.onfocusout = (e) => { // show the tidied username once the user leaves the field
    const t = e.target; if (t.dataset && t.dataset.soc && t.value !== D.socials[t.dataset.soc]) t.value = D.socials[t.dataset.soc];
  };
  stage.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'next') next();
    else if (b.id === 'back') go(S.step - 1);
    else if (b.id === 'save') save();
    else if (b.dataset.pick) $('#file-' + b.dataset.pick).click();
    else if (b.dataset.rm) { D[b.dataset.rm] = ''; S.imgErr[b.dataset.rm] = ''; persist(); render(true); }
    else if (b.dataset.prof) toggleProfession(b);
  };
  $$('[data-img]', stage).forEach((inp) => { inp.onchange = () => { setImage(inp.dataset.img, inp.files[0]); inp.value = ''; }; });
}
$('#exit').addEventListener('click', () => { if (Store.read(SF_KEY)) persist(); });
// only flush on leave if this journey was actually started; just opening the page shouldn't count as progress
window.addEventListener('pagehide', () => { if (Store.read(SF_KEY)) Store.write(SF_KEY, { status: S.status, step: S.step, maxStep: S.max, data: D, snapshot: S.snapshot, savedAt: Date.now() }); });

/* ---------- boot ---------- */
render();
if (saved.savedAt) $('#save-ind').innerHTML = '<i data-lucide="check"></i><span class="t">Draft restored</span>';
icons();
