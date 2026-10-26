// Kreato — shared storefront + product data and dialogs. Loaded after setup-common.js.
// Used by the storefront flow, the product flow and (for status only) the dashboard.
const SF_KEY = 'kreato-storefront';
const PRODUCTS_KEY = 'kreato-products';
const SOCIALS = [
  { id: 'instagram', label: 'Instagram', addon: 'instagram.com/', icon: 'instagram', ph: 'username' },
  { id: 'youtube', label: 'YouTube', addon: 'youtube.com/@', icon: 'youtube', ph: 'channel' },
  { id: 'x', label: 'Twitter / X', addon: 'x.com/', icon: 'twitter', ph: 'handle' },
  { id: 'linkedin', label: 'LinkedIn', addon: 'linkedin.com/in/', icon: 'linkedin', ph: 'username' },
  { id: 'telegram', label: 'Telegram', addon: 't.me/', icon: 'send', ph: 'username or invite' },
];
function storefrontDefaults() {
  const u = getUser();
  // tagline = "What you do"; headline = "Who you are"; logo = profile picture
  return { name: u.name, handle: u.handle, logo: '', banner: '', headline: '', professions: [], tagline: '', about: '', socials: Object.fromEntries(SOCIALS.map((s) => [s.id, ''])) };
}
function getStorefrontData() {
  const saved = (Store.read(SF_KEY) || {}).data || {};
  const d = Object.assign(storefrontDefaults(), saved);
  d.socials = Object.assign(storefrontDefaults().socials, saved.socials || {});
  if (!Array.isArray(d.professions)) d.professions = [];
  const u = getUser(); d.name = u.name; d.handle = u.handle; // store name + link are owned by onboarding / dashboard step 1
  return d;
}
const getProducts = () => Store.read(PRODUCTS_KEY) || [];
const publishedProducts = () => getProducts().filter((p) => p.status === 'published');
const saleActive = (p) => !p.free && p.saleOn !== false && p.salePrice && p.saleEnds && new Date(p.saleEnds + 'T23:59:59') > new Date();
const effectivePrice = (p) => (p.free ? 0 : saleActive(p) ? +p.salePrice : +p.price);
const strikePrice = (p) => (p.free ? '' : saleActive(p) ? p.price : (p.compareOn !== false && +p.compareAt > +p.price ? p.compareAt : ''));
const inrFmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
// Kreato keeps 5% of each sale (the platform fee shown at sign-up). Payment-gateway fees aren't modelled in this prototype.
const KREATO_FEE = 0.05;
const feeOn = (amount) => Math.round(amount * KREATO_FEE * 100) / 100;
const fmtDate = (iso) => { try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return iso; } };

/* a username pasted as "@name", "instagram.com/name" or a full URL is reduced to just the username */
function normSocial(v) {
  let s = String(v || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  if (s.includes('/')) s = s.split('/').filter(Boolean).pop() || '';
  return s.replace(/^@/, '').replace(/\?.*$/, '').trim();
}
const socialOk = (s) => s === '' || /^[A-Za-z0-9._+-]{1,60}$/.test(s);

/* customer-facing storefront. One template for every preview so the previews can't drift apart. */
function storefrontHTML(d, products, opts = {}) {
  const initial = (d.name || 'K').trim().charAt(0).toUpperCase() || 'K';
  const logo = d.logo ? `<img class="sf-logo" src="${d.logo}" alt="">` : `<span class="sf-logo sf-init" aria-hidden="true">${esc(initial)}</span>`;
  const socials = SOCIALS.filter((s) => d.socials && d.socials[s.id]).map((s) => `<span class="sf-soc"><i data-lucide="${s.icon}"></i>${esc(d.socials[s.id])}</span>`).join('');
  const prods = products && products.length
    ? `<div class="sf-grid">${products.map((p) => {
        const strike = strikePrice(p), tag = opts.link ? 'a' : 'div', href = opts.link ? ` href="store.html?p=${encodeURIComponent(p.id)}"` : '';
        return `<${tag} class="sf-card"${href}><div class="sf-cover">${p.shots && p.shots[0] ? `<img src="${p.shots[0]}" alt="">` : '<i data-lucide="package"></i>'}${saleActive(p) ? '<span class="sf-badge">Sale</span>' : ''}</div>
          <div class="sf-card-b"><b>${esc(p.title)}</b><div class="sf-price">${p.free ? 'Free' : inrFmt(effectivePrice(p))}${strike ? `<s>${inrFmt(strike)}</s>` : ''}</div></div></${tag}>`; }).join('')}</div>`
    : '<div class="sf-empty"><span class="ic"><i data-lucide="package"></i></span><b>No products yet</b></div>';
  const profs = (d.professions || []).map((p) => `<span class="sf-prof">${esc(p)}</span>`).join('');
  const what = (d.tagline || '').trim(), bio = (d.about || '').trim();
  // banner is a canvas-generated data URL (base64 only), safe inside url('')
  const heroStyle = d.banner ? ` style="background-image:linear-gradient(180deg,rgba(17,24,39,.10),rgba(17,24,39,.62)),url('${d.banner}')"` : '';
  return `<div class="sf">
    <div class="sf-hero ${d.banner ? 'has-banner' : ''}"${heroStyle}><div class="sf-hero-in">${logo}<div class="sf-who">
      <h3>${esc((d.name || '').trim()) || 'Your store name'}</h3>
      ${(d.headline || '').trim() ? `<p class="sf-tag">${esc(d.headline.trim())}</p>` : ''}
      <span class="sf-url">kreato.co.in/${esc(d.handle) || 'yourname'}</span></div></div></div>
    <div class="sf-body">
      ${profs ? `<div class="sf-profs">${profs}</div>` : ''}
      ${what || bio ? `<section class="sf-about"><h4>About</h4>${what ? `<p class="sf-what">${esc(what)}</p>` : ''}${bio ? `<p>${esc(bio)}</p>` : ''}</section>` : ''}
      ${socials ? `<section><div class="sf-socials">${socials}</div></section>` : ''}
      <section><h4>Products</h4>${prods}</section>
    </div>
    <footer class="sf-foot">Powered by kreato</footer></div>`;
}

/* ---- accessible modal dialog (Esc / backdrop close, focus trapped, focus restored) ---- */
const Modal = {
  el: null, prev: null, onClose: null,
  open(html, opts = {}) {
    Modal.close(true);
    Modal.prev = document.activeElement; Modal.onClose = opts.onClose || null;
    const bd = document.createElement('div'); bd.className = 'modal-bd';
    bd.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">${html}</div>`;
    document.body.appendChild(bd); document.body.classList.add('modal-open'); Modal.el = bd;
    bd.addEventListener('keydown', Modal.key);
    bd.addEventListener('mousedown', (e) => { if (e.target === bd) Modal.close(); });
    bd.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) Modal.close(); });
    icons();
    const first = bd.querySelector('[data-autofocus]') || bd.querySelector('button, a[href]');
    (first || bd.firstChild).focus();
    return bd.firstChild;
  },
  key(e) {
    if (e.key === 'Escape') { e.stopPropagation(); Modal.close(); }
    if (e.key === 'Tab') {
      const f = [...Modal.el.querySelectorAll('button:not([disabled]), a[href], input, select, textarea')];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  },
  close(silent) {
    if (!Modal.el) return;
    Modal.el.remove(); Modal.el = null; document.body.classList.remove('modal-open');
    const cb = Modal.onClose; Modal.onClose = null;
    if (!silent) { if (Modal.prev && Modal.prev.focus) Modal.prev.focus(); if (cb) cb(); }
  },
};

/* Preview dialog: the real storefront (saved data + published products) in a desktop/mobile frame */
function openStorefrontPreview(footHtml, opts = {}) {
  const d = opts.data || getStorefrontData(); let device = 'desktop';
  const m = Modal.open(`<div class="modal-head"><h2 id="modal-title">Storefront preview</h2>
      <button class="icon-btn" type="button" data-close aria-label="Close preview"><i data-lucide="x"></i></button></div>
    <div class="modal-bar">${deviceToggle(device)}<span class="hint">kreato.co.in/${esc(d.handle)}</span></div>
    <div class="stage-bg modal-stage"><div id="m-stage" style="width:100%;display:flex;justify-content:center"></div></div>
    <div class="modal-foot">${footHtml || ''}</div>`, { wide: true, onClose: opts.onClose });
  const draw = () => { $('#m-stage', m).innerHTML = deviceFrame(device, 'kreato.co.in/' + d.handle, storefrontHTML(d, publishedProducts())); icons(); };
  m.addEventListener('click', (e) => {
    const b = e.target.closest('[data-device]'); if (!b) return;
    device = b.dataset.device; $$('[data-device]', m).forEach((x) => x.setAttribute('aria-pressed', x === b)); draw();
  });
  draw(); return m;
}
