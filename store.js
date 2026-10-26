// Kreato — customer-facing storefront (store.html) and product page (store.html?p=ID).
// Built from the same saved data and storefront template the creator previews, so the two can't drift apart.
// Prototype: there is no checkout, so Buy/Download explains that instead of pretending to charge.
const LICENSE_NAMES = { personal: 'Personal use', commercial: 'Commercial use', extended: 'Extended commercial' };
const d = getStorefrontData();
const products = publishedProducts();
const pid = new URLSearchParams(location.search).get('p');

const ownerBar = `<div class="owner-bar" role="region" aria-label="Store owner">
  <span class="owner-tag"><i data-lucide="eye"></i>Customer view</span>
  <span class="grow"></span>
  <a href="storefront-setup.html">Edit profile</a>
  <a class="btn btn-outline btn-sm" href="dashboard.html?state=new">Dashboard</a></div>`;

function productPage(p) {
  const strike = strikePrice(p), sale = saleActive(p);
  const lim = p.limit === '0' ? 'Unlimited' : (p.limit || '3') + '×';
  const shots = p.shots || [];
  return `<main class="pp">
    <a class="pp-back" href="store.html"><i data-lucide="arrow-left"></i>${esc(d.name)}</a>
    <div class="pp-grid">
      <div class="pp-media">
        <div class="pp-main" id="pp-main">${shots[0] ? `<img src="${shots[0]}" alt="${esc(p.title)}">` : '<i data-lucide="package"></i>'}</div>
        ${shots.length > 1 ? `<div class="pp-thumbs" role="group" aria-label="Product images">${shots.map((s, i) => `<button type="button" data-shot="${i}" aria-label="Show image ${i + 1}" aria-pressed="${i === 0}"><img src="${s}" alt=""></button>`).join('')}</div>` : ''}
      </div>
      <div class="pp-info">
        ${p.category ? `<p class="pp-cat">${esc(p.category)}</p>` : ''}
        <h1>${esc(p.title)}</h1>
        <div class="pp-price">${p.free ? 'Free' : inrFmt(effectivePrice(p))}${strike ? `<s>${inrFmt(strike)}</s>` : ''}${sale ? `<span class="pill warn">Sale ends ${esc(fmtDate(p.saleEnds))}</span>` : ''}</div>
        <button class="btn btn-primary btn-block pp-buy" type="button" id="buy">${p.free ? 'Download' : 'Buy now'}</button>
        <div class="pp-facts">
          <div class="kv-row"><span>License</span><span>${esc(LICENSE_NAMES[p.license] || 'Personal use')}</span></div>
          <div class="kv-row"><span>Downloads</span><span>${lim}</span></div>
          ${p.file ? `<div class="kv-row"><span>Format</span><span>${esc((p.file.type || '').toUpperCase())}</span></div>` : ''}
        </div>
        <a class="pp-by" href="store.html"><span class="ss-av" aria-hidden="true">${d.logo ? `<img src="${d.logo}" alt="">` : esc((d.name || 'K').charAt(0).toUpperCase())}</span><span><b>${esc(d.name)}</b><small>${esc(d.headline || 'kreato.co.in/' + d.handle)}</small></span></a>
      </div>
    </div>
    ${p.desc && p.desc.trim() ? `<section class="pp-desc"><h2>About this product</h2><div class="ss-desc">${md(p.desc)}</div></section>` : ''}
  </main>`;
}
function notFound() {
  return `<main class="pp"><div class="sf-empty" style="margin-top:48px"><span class="ic"><i data-lucide="package-x"></i></span><b>Product not available</b>
    <a class="btn btn-outline btn-sm" href="store.html" style="margin-top:12px">Back to store</a></div></main>`;
}

function render() {
  if (pid) {
    const p = products.find((x) => x.id === pid);
    document.title = (p ? p.title : 'Product') + ' · ' + d.name;
    $('#app').innerHTML = ownerBar + (p ? productPage(p) : notFound());
  } else {
    document.title = d.name + ' · Kreato';
    $('#app').innerHTML = ownerBar + `<main class="store-home">${storefrontHTML(d, products, { link: true })}</main>`;
  }
  icons();
}
render();

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-shot]');
  if (t) {
    const p = products.find((x) => x.id === pid);
    $('#pp-main').innerHTML = `<img src="${p.shots[+t.dataset.shot]}" alt="${esc(p.title)}">`;
    $$('[data-shot]').forEach((b) => b.setAttribute('aria-pressed', b === t));
  }
  if (e.target.closest('#buy')) toast('Checkout isn’t connected in this prototype');
});
