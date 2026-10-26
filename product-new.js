// Kreato — Add asset. Depends on setup-common.js + setup-shared.js.
// Four steps: 1 Details (file, title, description, category) -> 2 Pricing (paid/free, offers revealed on demand,
// earnings after the 5% Kreato fee) -> 3 Media & access (screenshots, video, license, download limit) -> 4 Review & publish.
// Published products feed the storefront (store.html). Prototype: the asset file itself isn't stored, only its name and size.
const WORK_KEY = 'kreato-product-work';
const LABELS = ['Details', 'Pricing', 'Media & access', 'Review'];
const CATEGORIES = ['Presets & filters', 'Templates', 'Notion & productivity', 'AI prompts', 'E-books & PDFs', 'Courses & tutorials', 'Design assets', 'Photography', 'Music & audio', 'Code & software', 'Other'];
const LICENSES = [
  { id: 'personal', name: 'Personal use', desc: 'For their own use. No client work or resale.' },
  { id: 'commercial', name: 'Commercial use', desc: 'Client and business projects' },
  { id: 'extended', name: 'Extended commercial', desc: 'Commercial use, including in products they sell' },
];
const LIMITS = [['1', '1×'], ['3', '3×'], ['5', '5×'], ['10', '10×'], ['0', 'Unlimited']];
const ASSET_EXT = ['pdf', 'zip', 'rar', 'xls', 'xlsx', 'csv', 'md', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'mp4', 'mov', 'webm', 'mp3', 'wav', 'm4a'];
const MAX_FILE = 500 * 1024 * 1024, MAX_SHOTS = 5, MAX_VIDEO = 25 * 1024 * 1024, MAX_VIDEO_SECS = 30;
const blank = () => ({ file: null, title: '', desc: '', category: '', free: false, price: '', compareOn: false, compareAt: '', saleOn: false, salePrice: '', saleEnds: '', shots: [], video: null, license: 'personal', limit: '3' });

/* ---------- load: ?id= edits a saved product, otherwise the working copy is restored ---------- */
const params = new URLSearchParams(location.search);
let D = blank(); const W = { id: null }; let restoredAt = 0, loadedStatus = 'new', savedStep = 1, savedMax = 1;
(function load() {
  const pick = (src) => { const o = blank(); Object.keys(o).forEach((k) => { if (src[k] !== undefined) o[k] = src[k]; }); if (o.compareAt) o.compareOn = true; if (o.salePrice || o.saleEnds) o.saleOn = true; return o; };
  if (params.get('id')) { const p = getProducts().find((x) => x.id === params.get('id')); if (p) { D = pick(p); W.id = p.id; loadedStatus = p.status; savedStep = 4; savedMax = 4; } }
  else if (!params.get('new')) {
    const w = Store.read(WORK_KEY);
    if (w && w.data) {
      D = pick(w.data); W.id = w.id || null; restoredAt = w.savedAt || 0; savedStep = w.step || 1; savedMax = w.maxStep || 1;
      const p = W.id && getProducts().find((x) => x.id === W.id); loadedStatus = p ? p.status : 'new';
    }
  }
})();
const S = { step: Math.min(savedStep, savedMax), max: savedMax, tab: 'write', touched: {}, tried: {}, err: { file: '', shots: '', video: '' }, saving: false, status: loadedStatus };

/* ---------- validation (one place; steps, review and the publish button all read from here) ---------- */
const intOf = (v) => (/^\d+$/.test(String(v).trim()) ? parseInt(v, 10) : NaN);
const todayStr = () => { const t = new Date(); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); };
const titleOk = () => D.title.trim().length >= 3;
const priceOk = () => D.free || (intOf(D.price) >= 1 && intOf(D.price) <= 100000);
const compareMsg = () => {
  if (D.free || !D.compareOn) return '';
  if (D.compareAt === '') return 'Enter the original price';
  if (isNaN(intOf(D.price))) return 'Set your price first';
  return intOf(D.compareAt) > intOf(D.price) ? '' : 'Must be higher than your price';
};
const saleMsg = () => {
  const m = { price: '', ends: '' };
  if (D.free || !D.saleOn) return m;
  if (D.salePrice === '') m.price = 'Enter the sale price';
  else if (isNaN(intOf(D.price))) m.price = 'Set your price first';
  else if (!(intOf(D.salePrice) >= 1 && intOf(D.salePrice) < intOf(D.price))) m.price = 'Must be lower than your price';
  if (D.saleEnds === '') m.ends = 'Choose an end date';
  else if (D.saleEnds < todayStr()) m.ends = 'Pick today or a later date';
  return m;
};
const saleValid = () => !D.free && D.saleOn && D.salePrice !== '' && D.saleEnds !== '' && !saleMsg().price && !saleMsg().ends;
const compareValid = () => !D.free && D.compareOn && D.compareAt !== '' && !compareMsg();
const shown = (f, step) => S.touched[f] || S.tried[step];
const fieldMsg = {
  file: () => S.err.file || (S.tried[1] && !D.file ? 'Upload your asset file' : ''),
  title: () => (shown('title', 1) && !titleOk() ? 'At least 3 characters' : ''),
  category: () => (shown('category', 1) && !D.category ? 'Choose a category' : ''),
  price: () => (shown('price', 2) && !priceOk() ? 'Whole rupees, ₹1 to ₹1,00,000' : ''),
  compareAt: () => (shown('compareAt', 2) ? compareMsg() : ''),
  salePrice: () => (shown('salePrice', 2) ? saleMsg().price : ''),
  saleEnds: () => (shown('saleEnds', 2) ? saleMsg().ends : ''),
};
// what each step still needs; labels double as the "Needed to publish" links on Review
const stepNeeds = (n) => (n === 1 ? [
  !D.file && { f: 'file', label: 'Upload your asset file' },
  !titleOk() && { f: 'title', label: 'Add a product title' },
  !D.category && { f: 'category', label: 'Choose a category' },
] : n === 2 ? [
  !priceOk() && { f: 'price', label: 'Set a price' },
  compareMsg() && { f: 'compareAt', label: 'Fix the original price' },
  (saleMsg().price || saleMsg().ends) && { f: saleMsg().price ? 'salePrice' : 'saleEnds', label: 'Finish the sale details' },
] : []).filter(Boolean).map((x) => Object.assign(x, { step: n }));
const allNeeds = () => [1, 2, 3].flatMap(stepNeeds);
const stepValid = (n) => stepNeeds(n).length === 0;

/* ---------- money ---------- */
const customerPays = () => (D.free ? 0 : saleValid() ? intOf(D.salePrice) : priceOk() ? intOf(D.price) : NaN);
const struck = () => (D.free ? null : saleValid() ? intOf(D.price) : compareValid() ? intOf(D.compareAt) : null);

/* ---------- persistence ---------- */
function persistWork(msg) {
  const ok = Store.write(WORK_KEY, { id: W.id, data: D, step: S.step, maxStep: S.max, savedAt: Date.now() });
  $('#save-ind').innerHTML = ok ? `<i data-lucide="check"></i><span class="t">${msg || 'Saved on this device'}</span>` : '<span class="t">Couldn’t save. Storage is blocked.</span>';
  icons(); return ok;
}
const persistSoon = debounce(() => persistWork(), 400);
function commit(status) {
  const list = getProducts(), now = Date.now(), id = W.id || 'p' + now.toString(36);
  const i = list.findIndex((p) => p.id === id);
  const rec = Object.assign({}, D, { id, status, updatedAt: now, createdAt: i >= 0 ? list[i].createdAt : now });
  if (i >= 0) list[i] = rec; else list.push(rec);
  if (!Store.write(PRODUCTS_KEY, list)) return false;
  W.id = id; S.status = status;
  if (status === 'published') { try { localStorage.removeItem(WORK_KEY); } catch (e) {} } else persistWork('Draft saved');
  return true;
}

/* ---------- small templates ---------- */
const fmtSize = (n) => (n >= 1048576 ? (n / 1048576).toFixed(n >= 10485760 ? 0 : 1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
const statusPill = () => (S.status === 'published' ? '<span class="pill ok">Published</span>' : S.status === 'draft' ? '<span class="pill brand">Draft saved</span>' : '<span class="pill warn">Not published</span>');
const counter = (id, v, max) => `<div class="counter"><span id="${id}">${v.length}</span>/${max}</div>`;
const errP = (id) => `<p class="field-err ${fieldMsg[id]() ? 'on' : ''}" id="e-${id}" role="alert">${esc(fieldMsg[id]())}</p>`;
const money = (id, label, ph) => `<div class="input-group" id="g-${id}"><span class="addon">₹</span>
  <input class="input" id="f-${id}" data-f="${id}" data-num type="text" inputmode="numeric" autocomplete="off" value="${esc(D[id])}" placeholder="${ph}" aria-label="${label}" aria-describedby="e-${id}"></div>`;
const sw = (id, on, title, sub) => `<div class="sw-row"><div><b id="${id}-l">${title}</b><small>${sub}</small></div>
  <button class="switch" type="button" role="switch" id="${id}" aria-checked="${on}" aria-labelledby="${id}-l"></button></div>`;

/* ---------- step 1: details ---------- */
function fileBlock() {
  if (D.file) return `<div class="file-row"><span class="file-ico" aria-hidden="true">${esc((D.file.type || 'FILE').slice(0, 4).toUpperCase())}</span>
    <div class="file-meta"><b>${esc(D.file.name)}</b><span>${fmtSize(D.file.size)}</span></div>
    <button class="btn btn-outline btn-sm" type="button" id="file-replace">Replace</button><button class="icon-btn" type="button" id="file-rm" aria-label="Remove file"><i data-lucide="trash-2"></i></button></div>`;
  return `<div class="drop ${fieldMsg.file() ? 'is-err' : ''}" id="drop" role="button" tabindex="0" aria-describedby="e-file" aria-label="Upload asset file: drag a file here or press Enter to browse">
    <div class="drop-ic"><i data-lucide="upload"></i></div><div class="t">Drag your file here</div>
    <div class="s">or <u>click to browse</u></div><div class="f">PDF, ZIP, RAR, Excel, image, video, audio or MD. Max 500 MB.</div></div>`;
}
function stepDetails() {
  return `<h2 id="step-title" tabindex="-1">Product details</h2>
    <div class="field"><span class="label" id="file-l">Asset file <span class="req" aria-hidden="true">*</span></span>${fileBlock()}${errP('file')}
      <input type="file" id="file" hidden accept=".${ASSET_EXT.join(',.')}" aria-labelledby="file-l"></div>
    <div class="field"><label class="label" for="f-title">Title <span class="req" aria-hidden="true">*</span></label>
      <input class="input ${fieldMsg.title() ? 'is-err' : ''}" id="f-title" data-f="title" type="text" maxlength="80" autocomplete="off" placeholder="e.g. Moody Film Lightroom Presets" value="${esc(D.title)}" aria-describedby="e-title">${errP('title')}</div>
    <div class="field"><label class="label" for="f-desc">Description <span class="opt">(optional)</span></label>
      <div class="editor"><div class="editor-bar"><div class="editor-tabs" role="group" aria-label="Editor mode">
          <button type="button" data-tab="write" aria-pressed="${S.tab === 'write'}">Write</button><button type="button" data-tab="preview" aria-pressed="${S.tab === 'preview'}">Preview</button></div>
        <div class="editor-tools" role="toolbar" aria-label="Formatting">
          <button type="button" data-md="b" aria-label="Bold" ${S.tab === 'preview' ? 'disabled' : ''}><b>B</b></button><button type="button" data-md="i" aria-label="Italic" ${S.tab === 'preview' ? 'disabled' : ''}><i>I</i></button>
          <button type="button" data-md="h" aria-label="Heading" ${S.tab === 'preview' ? 'disabled' : ''}>H2</button><button type="button" data-md="ul" aria-label="Bullet list" ${S.tab === 'preview' ? 'disabled' : ''}>•</button></div>
        <span class="md-label">Markdown</span></div>
        ${S.tab === 'write'
          ? `<textarea id="f-desc" data-f="desc" maxlength="2000" placeholder="What’s included? Who is it for?">${esc(D.desc)}</textarea>`
          : `<div class="editor-prev" id="desc-prev">${D.desc.trim() ? md(D.desc) : '<p class="ph">Nothing to preview yet</p>'}</div>`}</div>
      ${counter('c-desc', D.desc, 2000)}</div>
    <div class="field"><label class="label" for="f-category">Category <span class="req" aria-hidden="true">*</span></label>
      <select class="select ${fieldMsg.category() ? 'is-err' : ''}" id="f-category" data-f="category" aria-describedby="e-category"><option value="">Select a category</option>${CATEGORIES.map((c) => `<option ${c === D.category ? 'selected' : ''}>${c}</option>`).join('')}</select>${errP('category')}</div>`;
}

/* ---------- step 2: pricing ---------- */
function stepPricing() {
  return `<h2 id="step-title" tabindex="-1">Pricing</h2>
    <div class="opt-rows" role="radiogroup" aria-label="Price type" style="margin-top:24px">
      <label class="opt-row"><span class="ic"><i data-lucide="indian-rupee"></i></span><span class="txt"><b>Paid</b><small>Customers pay to download</small></span><input type="radio" name="ptype" value="paid" ${D.free ? '' : 'checked'}></label>
      <label class="opt-row"><span class="ic"><i data-lucide="gift"></i></span><span class="txt"><b>Free</b><small>Anyone can download it</small></span><input type="radio" name="ptype" value="free" ${D.free ? 'checked' : ''}></label></div>
    ${D.free ? '' : `
    <div class="field"><label class="label" for="f-price">Price <span class="req" aria-hidden="true">*</span></label>${money('price', 'Price in rupees', '299')}${errP('price')}</div>
    <p class="sec-label">Offers <span style="font-weight:400">(optional)</span></p>
    ${sw('compare-sw', D.compareOn, 'Show an original price', 'Crossed out next to your price')}
    ${D.compareOn ? `<div class="sw-body"><div class="field"><label class="label" for="f-compareAt">Original price</label>${money('compareAt', 'Original price in rupees', '499')}${errP('compareAt')}</div></div>` : ''}
    ${sw('sale-sw', D.saleOn, 'Limited-time sale', 'A lower price until an end date')}
    ${D.saleOn ? `<div class="sw-body"><div class="row-2"><div class="field"><label class="label" for="f-salePrice">Sale price</label>${money('salePrice', 'Sale price in rupees', '199')}${errP('salePrice')}</div>
      <div class="field"><label class="label" for="f-saleEnds">Ends on</label><input class="input" id="f-saleEnds" data-f="saleEnds" type="date" min="${todayStr()}" value="${esc(D.saleEnds)}" aria-describedby="e-saleEnds">${errP('saleEnds')}</div></div></div>` : ''}`}`;
}
function priceSummary() {
  const pays = customerPays(), s = struck(), fee = isNaN(pays) ? NaN : feeOn(pays);
  const v = (n) => (isNaN(n) ? '₹–' : inrFmt(n));
  return `<h3>Price summary</h3>
    <div class="kv-row big"><span>Customers pay</span><span>${D.free ? 'Free' : v(pays)}${s ? ` <s style="font-size:14px">${inrFmt(s)}</s>` : ''}</span></div>
    ${saleValid() ? `<div class="kv-row"><span>Sale ends</span><span>${esc(fmtDate(D.saleEnds))}</span></div>` : ''}
    <div class="kv-row"><span>Kreato fee (5%)</span><span>${D.free ? '₹0' : isNaN(fee) ? '₹–' : '−' + inrFmt(fee)}</span></div>
    <div class="sum-sep"></div>
    <div class="kv-row big earn"><span>You earn</span><span>${D.free ? '₹0' : isNaN(pays) ? '₹–' : inrFmt(pays - fee)}</span></div>`;
}

/* ---------- step 3: media & access ---------- */
function stepMedia() {
  return `<h2 id="step-title" tabindex="-1">Media &amp; access</h2>
    <div class="field"><span class="label" id="shots-l">Screenshots <span class="opt">(optional)</span></span>
      <div class="shots" style="margin-top:0">${D.shots.map((s, i) => `<div class="shot"><img src="${s}" alt="Screenshot ${i + 1}">${i === 0 ? '<span class="cov">Cover</span>' : ''}<button type="button" data-shot-rm="${i}" aria-label="Remove screenshot ${i + 1}"><i data-lucide="x"></i></button></div>`).join('')}
        ${D.shots.length < MAX_SHOTS ? '<button class="add-tile" type="button" id="shot-add"><i data-lucide="upload"></i>Add</button>' : ''}</div>
      <input type="file" id="shots" hidden multiple accept="image/jpeg,image/png,image/webp" aria-labelledby="shots-l">
      <p class="field-err ${S.err.shots ? 'on' : ''}" id="e-shots" role="alert">${esc(S.err.shots)}</p>
      <p class="helper">JPEG, PNG or WebP. Up to 5, first is the cover.</p></div>
    <div class="field"><span class="label" id="video-l">Preview video <span class="opt">(optional)</span></span>
      ${D.video ? `<div class="file-row"><span class="file-ico" aria-hidden="true"><i data-lucide="film"></i></span><div class="file-meta"><b>${esc(D.video.name)}</b><span>${fmtSize(D.video.size)} · ${D.video.duration}s</span></div><button class="icon-btn" type="button" id="video-rm" aria-label="Remove video"><i data-lucide="trash-2"></i></button></div>`
        : '<button class="btn btn-outline btn-sm" type="button" id="video-add"><i data-lucide="film"></i>Add video</button>'}
      <input type="file" id="video" hidden accept="video/mp4,video/webm" aria-labelledby="video-l">
      <p class="field-err ${S.err.video ? 'on' : ''}" id="e-video" role="alert">${esc(S.err.video)}</p>
      <p class="helper">MP4 or WebM. Max 30 seconds, 25 MB.</p></div>
    <p class="sec-label">Access and usage</p>
    <div class="opt-rows" role="radiogroup" aria-label="Usage license">${LICENSES.map((l) => `<label class="opt-row"><span class="ic"><i data-lucide="${l.id === 'personal' ? 'user' : l.id === 'commercial' ? 'briefcase' : 'layers'}"></i></span>
      <span class="txt"><b>${l.name}</b><small>${l.desc}</small></span><input type="radio" name="lic" value="${l.id}" ${l.id === D.license ? 'checked' : ''}></label>`).join('')}</div>
    <div class="limit-row"><div><b id="limit-l">Downloads per buyer</b></div>
      <select class="select" id="f-limit" data-f="limit" aria-labelledby="limit-l">${LIMITS.map(([v, l]) => `<option value="${v}" ${v === D.limit ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`;
}

/* ---------- step 4: review ---------- */
function plainExcerpt(s, n) { const t = String(s).replace(/[#*_`>-]/g, '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; }
function stepReview() {
  const lic = LICENSES.find((l) => l.id === D.license).name, lim = LIMITS.find(([v]) => v === D.limit)[1];
  const pays = customerPays();
  const sec = (title, step, rows) => `<section class="review-sec"><header><h3>${title}</h3><button class="link-btn" type="button" data-edit="${step}">Edit<span class="sr-only"> ${title.toLowerCase()}</span></button></header>${rows}</section>`;
  const kv = (k, v) => `<div class="kv-row"><span>${k}</span><span>${v}</span></div>`;
  const none = '<span style="color:#9ca3af;font-weight:400">None</span>';
  return `<h2 id="step-title" tabindex="-1">Review and publish</h2>
    <div class="review">
      ${sec('Details', 1, kv('File', D.file ? esc(D.file.name) : none) + kv('Title', esc(D.title.trim()) || none) + kv('Category', esc(D.category) || none) + kv('Description', D.desc.trim() ? esc(plainExcerpt(D.desc, 90)) : none))}
      ${sec('Pricing', 2, kv('Customers pay', D.free ? 'Free' : isNaN(pays) ? none : inrFmt(pays)) + (compareValid() && !saleValid() ? kv('Original price', inrFmt(intOf(D.compareAt))) : '') + (saleValid() ? kv('Sale', `${inrFmt(intOf(D.salePrice))} until ${esc(fmtDate(D.saleEnds))}`) : '') + kv('You earn', D.free ? '₹0' : isNaN(pays) ? none : inrFmt(pays - feeOn(pays))))}
      ${sec('Media', 3, kv('Screenshots', D.shots.length ? `<span class="thumbs">${D.shots.map((s) => `<img src="${s}" alt="">`).join('')}</span>` : none) + kv('Preview video', D.video ? esc(D.video.name) : none))}
      ${sec('Access', 3, kv('License', lic) + kv('Downloads per buyer', lim))}
    </div>`;
}

/* ---------- side column ---------- */
function buyerHTML() {
  const lic = LICENSES.find((l) => l.id === D.license).name, pays = customerPays(), s = struck();
  const price = D.free ? 'Free' : isNaN(pays) ? '₹–' : inrFmt(pays);
  return `<div class="buyer" style="margin-top:0"><div class="buyer-cover">${D.shots[0] ? `<img src="${D.shots[0]}" alt="">` : '<i data-lucide="package"></i>'}</div>
    <div class="buyer-b"><h4 class="${D.title.trim() ? '' : 'ph'}">${esc(D.title.trim()) || 'Your product title'}</h4>
      <div class="ss-meta" style="margin-top:8px"><span>${esc(lic)}</span>${saleValid() ? `<span>Sale ends ${esc(fmtDate(D.saleEnds))}</span>` : ''}</div>
      <div class="buyer-row"><div class="buyer-price">${price}${s ? `<s>${inrFmt(s)}</s>` : ''}</div>
        <span class="btn btn-primary btn-sm" aria-hidden="true">${D.free ? 'Download' : 'Buy now'}</span></div></div></div>`;
}
function sideHTML() {
  if (S.step === 2) return `<aside class="side-stack" aria-label="Price summary"><section class="side-card" id="side-sum">${priceSummary()}</section></aside>`;
  const preview = `<section class="side-card"><h3>Customer preview</h3><div id="buyer">${buyerHTML()}</div></section>`;
  if (S.step !== 4) return `<aside class="side-stack" aria-label="Customer preview">${preview}</aside>`;
  const needs = allNeeds();
  return `<aside class="side-stack" aria-label="Publish">${preview}
    <section class="side-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><h3 style="margin:0">Publish</h3><span id="status-pill">${statusPill()}</span></div>
      ${needs.length ? `<div class="needs" style="margin-bottom:14px"><b>Needed to publish</b><ul>${needs.map((n) => `<li><button class="link-btn" type="button" data-fix="${n.step}:${n.f}">${esc(n.label)}</button></li>`).join('')}</ul></div>` : ''}
      <div class="pub-actions"><button class="btn btn-primary" type="button" id="publish" ${needs.length ? 'disabled' : ''}><span class="spinner" aria-hidden="true"></span><span class="label-text">${S.status === 'published' ? 'Update listing' : 'Publish'}</span></button>
        <button class="btn btn-outline" type="button" id="draft" ${titleOk() && S.status !== 'published' ? '' : 'disabled'}><span class="spinner" aria-hidden="true"></span><span class="label-text">Save draft</span></button></div>
      <p class="field-err" id="e-save" role="alert" style="margin-top:10px"></p>
      <p class="proto-note" style="margin-top:12px">Prototype. Files aren’t uploaded.</p></section></aside>`;
}

/* ---------- footer ---------- */
const NEXT = { 1: 'Continue to pricing', 2: 'Continue to media', 3: 'Continue to review' };
function actions() {
  if (S.step === 4) return `<div class="actions-bar"><button class="btn btn-outline" type="button" id="back"><i data-lucide="arrow-left"></i>Back</button><span></span></div>`;
  return `<div class="actions-bar">${S.step > 1 ? '<button class="btn btn-outline" type="button" id="back"><i data-lucide="arrow-left"></i>Back</button>' : '<span></span>'}
    <button class="btn btn-primary" type="button" id="next">${NEXT[S.step]}<i data-lucide="arrow-right"></i></button></div>`;
}

/* ---------- render ---------- */
function render(keepFocus) {
  const focus = keepFocus && document.activeElement && document.activeElement.id;
  renderStepper($('#stepper'), LABELS, S.step, S.max, go);
  const body = [stepDetails, stepPricing, stepMedia, stepReview][S.step - 1]();
  $('#stage').innerHTML = `<div class="setup-grid"><section class="panel">${body}${actions()}</section>${sideHTML()}</div>`;
  wire(); refresh();
  const f = focus && document.getElementById(focus);
  if (f && !f.disabled) f.focus({ preventScroll: true }); else if (!keepFocus) focusTitle();
}
// live updates that don't rebuild the form (typing never loses focus)
function refresh() {
  Object.keys(fieldMsg).forEach((k) => {
    const el = $('#e-' + k); if (!el) return;
    const m = fieldMsg[k](); el.textContent = m; el.classList.toggle('on', !!m);
    const inp = $('#f-' + k); if (inp) inp.classList.toggle('is-err', !!m);
    const grp = $('#g-' + k); if (grp) grp.classList.toggle('is-error', !!m);
  });
  const b = $('#buyer'); if (b) b.innerHTML = buyerHTML();
  const sum = $('#side-sum'); if (sum) sum.innerHTML = priceSummary();
  icons();
}
function go(n) {
  if (n > S.max || n === S.step) return;
  S.step = n; persistWork(); render();
}
function next() {
  if (!stepValid(S.step)) {
    S.tried[S.step] = true; render(true);
    const first = stepNeeds(S.step)[0]; focusField(first.f); return;
  }
  S.max = Math.max(S.max, S.step + 1); S.step += 1; persistWork(); render();
}
function focusField(f) {
  const el = f === 'file' ? $('#drop') || $('#file-replace') : $('#f-' + f);
  if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center' }); }
}

/* ---------- uploads ---------- */
function pickFile(f) {
  S.err.file = '';
  if (!f) return;
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  if (!ASSET_EXT.includes(ext)) S.err.file = 'File type not supported';
  else if (f.size > MAX_FILE) S.err.file = 'File is over 500 MB';
  else if (f.size === 0) S.err.file = 'File is empty';
  else D.file = { name: f.name, size: f.size, type: ext };
  persistWork(); render(true);
}
function readShot(file) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 720 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('read')); };
    img.src = url;
  });
}
async function addShots(files) {
  S.err.shots = '';
  const room = MAX_SHOTS - D.shots.length, list = [...files];
  if (list.some((f) => !/^image\/(jpeg|png|webp)$/.test(f.type))) S.err.shots = 'Use JPEG, PNG or WebP';
  else if (list.some((f) => f.size > 5 * 1024 * 1024)) S.err.shots = 'Max 5 MB per image';
  else if (list.length > room) S.err.shots = `Only ${room} more allowed`;
  if (!S.err.shots) {
    try { D.shots = D.shots.concat(await Promise.all(list.map(readShot))); } catch (e) { S.err.shots = 'Couldn’t read an image'; }
    if (!persistWork() && !S.err.shots) S.err.shots = 'Couldn’t save images. Storage is full.';
  }
  render(true);
}
function pickVideo(f) {
  S.err.video = '';
  if (!f) return;
  if (!/^video\/(mp4|webm)$/.test(f.type)) { S.err.video = 'Use an MP4 or WebM video'; return render(true); }
  if (f.size > MAX_VIDEO) { S.err.video = 'Video is over 25 MB'; return render(true); }
  const url = URL.createObjectURL(f), v = document.createElement('video'); v.preload = 'metadata';
  v.onloadedmetadata = () => {
    URL.revokeObjectURL(url);
    if (v.duration > MAX_VIDEO_SECS + 0.5) S.err.video = `Video is ${Math.round(v.duration)}s. Max ${MAX_VIDEO_SECS} seconds.`;
    else D.video = { name: f.name, size: f.size, duration: Math.max(1, Math.round(v.duration)) };
    persistWork(); render(true);
  };
  v.onerror = () => { URL.revokeObjectURL(url); S.err.video = 'Couldn’t read that video'; render(true); };
  v.src = url;
}

/* ---------- markdown toolbar ---------- */
function mdApply(kind) {
  const ta = $('#f-desc'); if (!ta) return;
  const a = ta.selectionStart, b = ta.selectionEnd, v = ta.value, sel = v.slice(a, b);
  let ins, from, to;
  if (kind === 'b' || kind === 'i') { const m = kind === 'b' ? '**' : '*', t = sel || (kind === 'b' ? 'bold text' : 'italic text'); ins = m + t + m; from = a + m.length; to = from + t.length; }
  else if (kind === 'h') { const t = sel || 'Heading', nl = a > 0 && v[a - 1] !== '\n' ? '\n' : ''; ins = nl + '## ' + t; from = a + nl.length + 3; to = from + t.length; }
  else { const t = sel ? sel.split('\n').map((l) => '- ' + l.replace(/^[-•]\s*/, '')).join('\n') : '- item', nl = a > 0 && v[a - 1] !== '\n' ? '\n' : ''; ins = nl + t; from = a + nl.length; to = from + t.length; }
  ta.setRangeText(ins, a, b, 'end'); ta.focus(); ta.setSelectionRange(from, to);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ---------- save / publish ---------- */
async function submit(status) {
  if (S.saving) return;
  if (status === 'published' && allNeeds().length) return render(true);
  if (status === 'draft' && !titleOk()) return;
  S.saving = true;
  const btn = $(status === 'published' ? '#publish' : '#draft'); setLoading(btn, true); $('#publish').disabled = $('#draft').disabled = true;
  await delay(700); // simulated network round-trip
  const ok = commit(status);
  S.saving = false;
  if (!ok) { render(true); $('#e-save').textContent = 'Couldn’t save. Your changes are still here.'; $('#e-save').classList.add('on'); return; }
  render(true);
  if (status === 'draft') { toast('Draft saved. Not on your storefront yet.'); return; }
  $('#save-ind').innerHTML = '<i data-lucide="check"></i><span class="t">Published</span>'; icons();
  Modal.open(`<div class="modal-body center"><div class="done-ic"><i data-lucide="check"></i></div>
    <h2 id="modal-title">Asset published</h2><p>Now live on your storefront.</p>
    <div class="done-actions"><a class="btn btn-primary" href="store.html?p=${encodeURIComponent(W.id)}" data-autofocus><i data-lucide="eye"></i>View on storefront</a>
      <a class="btn btn-outline" href="product-new.html?new=1"><i data-lucide="plus"></i>Add another</a>
      <a class="btn btn-ghost" href="dashboard.html?state=new">Dashboard</a></div>
    <p class="proto-note">Prototype. No real payments.</p></div>`);
}

/* ---------- events ---------- */
function wire() {
  const st = $('#stage');
  st.oninput = (e) => {
    const t = e.target, f = t.dataset && t.dataset.f; if (!f) return;
    if (t.dataset.num !== undefined) { const v = t.value.replace(/[^\d]/g, ''); if (v !== t.value) t.value = v; }
    D[f] = t.value; S.touched[f] = true;
    if (f === 'desc') $('#c-desc').textContent = t.value.length;
    refresh(); persistSoon();
  };
  st.onchange = (e) => {
    const t = e.target;
    if (t.id === 'f-category' || t.id === 'f-limit') { D[t.dataset.f] = t.value; S.touched[t.dataset.f] = true; refresh(); persistSoon(); }
    if (t.name === 'lic') { D.license = t.value; refresh(); persistSoon(); }
    if (t.name === 'ptype') { D.free = t.value === 'free'; if (D.free) { D.compareOn = D.saleOn = false; D.compareAt = D.salePrice = D.saleEnds = ''; } persistWork(); render(true); }
  };
  st.onfocusout = (e) => { const f = e.target.dataset && e.target.dataset.f; if (f && !S.touched[f] && f !== 'desc') { S.touched[f] = true; refresh(); } };
  st.onclick = (e) => {
    const b = e.target.closest('button, .drop'); if (!b || b.disabled) return;
    if (b.id === 'drop' || b.id === 'file-replace') $('#file').click();
    else if (b.id === 'file-rm') { D.file = null; S.err.file = ''; persistWork(); render(true); }
    else if (b.id === 'compare-sw') { D.compareOn = !D.compareOn; if (!D.compareOn) D.compareAt = ''; persistWork(); render(true); if (D.compareOn) focusField('compareAt'); }
    else if (b.id === 'sale-sw') { D.saleOn = !D.saleOn; if (!D.saleOn) D.salePrice = D.saleEnds = ''; persistWork(); render(true); if (D.saleOn) focusField('salePrice'); }
    else if (b.dataset.tab) { S.tab = b.dataset.tab; render(true); }
    else if (b.dataset.md) mdApply(b.dataset.md);
    else if (b.id === 'shot-add') $('#shots').click();
    else if (b.dataset.shotRm !== undefined) { D.shots.splice(+b.dataset.shotRm, 1); S.err.shots = ''; persistWork(); render(true); }
    else if (b.id === 'video-add') $('#video').click();
    else if (b.id === 'video-rm') { D.video = null; S.err.video = ''; persistWork(); render(true); }
    else if (b.id === 'next') next();
    else if (b.id === 'back') go(S.step - 1);
    else if (b.dataset.edit) go(+b.dataset.edit);
    else if (b.dataset.fix) { const [stp, f] = b.dataset.fix.split(':'); S.tried[+stp] = true; S.step = +stp; persistWork(); render(); focusField(f); }
    else if (b.id === 'draft') submit('draft');
    else if (b.id === 'publish') submit('published');
  };
  const drop = $('#drop');
  if (drop) {
    drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#file').click(); } };
    ['dragenter', 'dragover'].forEach((n) => drop.addEventListener(n, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach((n) => drop.addEventListener(n, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', (e) => pickFile(e.dataTransfer.files[0]));
  }
  const fi = $('#file'); if (fi) fi.onchange = (e) => { pickFile(e.target.files[0]); e.target.value = ''; };
  const sh = $('#shots'); if (sh) sh.onchange = (e) => { addShots(e.target.files); e.target.value = ''; };
  const vi = $('#video'); if (vi) vi.onchange = (e) => { pickVideo(e.target.files[0]); e.target.value = ''; };
}
$('#exit').addEventListener('click', () => { if (S.status !== 'published' && Store.read(WORK_KEY)) persistWork(); });
// a published asset is finished: never resurrect it as the working draft
window.addEventListener('pagehide', () => { if (S.status !== 'published' && Store.read(WORK_KEY)) Store.write(WORK_KEY, { id: W.id, data: D, step: S.step, maxStep: S.max, savedAt: Date.now() }); });

/* ---------- boot ---------- */
render();
if (restoredAt) { $('#save-ind').innerHTML = `<i data-lucide="check"></i><span class="t">Draft restored</span>`; icons(); }
