// Kreato setup journeys — shared helpers (vanilla JS prototype).
// Prototype note: there is no server. Each journey saves to localStorage under its OWN key,
// so the two journeys can never mark each other complete.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const icons = () => window.lucide && lucide.createIcons();
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/* ---- storage (returns false when the browser refuses to save, so callers never fake success) ---- */
const memStore = {};
const Store = {
  read(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return memStore[k] || null; } },
  write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { memStore[k] = v; return false; } },
};

/* ---- shared profile: read-only for the session journey; the storefront journey may update name + handle ---- */
function getUser() {
  const u = { name: 'Hanufa Islam', handle: 'hanufa' };
  try { Object.assign(u, JSON.parse(sessionStorage.getItem('kreato-user') || '{}')); } catch (e) {}
  return u;
}
function patchUser(patch) {
  try { sessionStorage.setItem('kreato-user', JSON.stringify(Object.assign(getUser(), patch))); } catch (e) {}
}

function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.id); toast.id = setTimeout(() => (t.hidden = true), 2600);
}
function setLoading(btn, on) { btn.classList.toggle('loading', on); btn.disabled = on; }
function timeAgo(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  return s < 5 ? 'just now' : s < 60 ? s + 's ago' : Math.round(s / 60) + ' min ago';
}

/* ---- tiny markdown: ## heading, **bold**, *italic*, - bullets, blank line = new paragraph ---- */
function md(src) {
  const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>');
  let html = '', list = false, para = [];
  const flushP = () => { if (para.length) { html += '<p>' + inline(para.join(' ')) + '</p>'; para = []; } };
  const closeL = () => { if (list) { html += '</ul>'; list = false; } };
  for (const raw of String(src || '').replace(/\r/g, '').split('\n')) {
    const l = raw.trim(); let m;
    if (!l) { flushP(); closeL(); }
    else if ((m = l.match(/^#{1,3}\s+(.*)$/))) { flushP(); closeL(); html += '<h4>' + inline(m[1]) + '</h4>'; }
    else if ((m = l.match(/^[-•]\s+(.*)$/))) { flushP(); if (!list) { html += '<ul>'; list = true; } html += '<li>' + inline(m[1]) + '</li>'; }
    else { closeL(); para.push(l); }
  }
  flushP(); closeL();
  return html;
}

/* ---- store handle rules (same rules and sample "taken" list as the onboarding prototype; the check is SIMULATED) ---- */
const HANDLE_TAKEN = ['admin', 'kreato', 'claudz', 'digi-ai', 'support', 'store', 'shop', 'pavithrabharathik'];
function handleSuggestions(base) {
  const seen = new Set([base]), out = [];
  while (out.length < 4) {
    const o = base + Math.floor(10 + Math.random() * 990);
    if (!seen.has(o) && !HANDLE_TAKEN.includes(o) && o.length <= 30) { seen.add(o); out.push(o); }
  }
  return out;
}
async function checkHandle(v, ownHandle) {
  if (!/^[a-z0-9_-]+$/.test(v)) return { ok: false, msg: 'Use lowercase letters, numbers, - or _' };
  if (v.length < 3) return { ok: false, msg: 'At least 3 characters' };
  if (v.length > 30) return { ok: false, msg: '30 characters max' };
  await delay(500); // simulated lookup
  if (v !== ownHandle && HANDLE_TAKEN.includes(v)) return { ok: false, msg: 'That link is taken', suggest: handleSuggestions(v) };
  return { ok: true };
}

/* ---- stepper (completed steps are reachable; later steps stay locked until reached) ---- */
function renderStepper(host, labels, cur, max, onGo) {
  host.innerHTML = labels.map((l, i) => {
    const n = i + 1, cls = n === cur ? 'current' : n < cur ? 'done' : n <= max ? 'reach' : '';
    const num = n < cur ? '<i data-lucide="check" aria-hidden="true"></i>' : n;
    return `<li class="${cls}"><button type="button" data-go="${n}" ${n > max ? 'disabled' : ''} ${n === cur ? 'aria-current="step"' : ''}>
      <span class="num">${num}</span><span class="s-label">${esc(l)}</span></button></li>`;
  }).join('');
  host.onclick = (e) => { const b = e.target.closest('[data-go]'); if (b && !b.disabled) onGo(+b.dataset.go); };
  icons();
}

/* ---- preview chrome ---- */
function deviceFrame(device, url, inner) {
  if (device === 'mobile') return `<div class="dev dev-mobile"><div class="dev-screen">${inner}</div></div>`;
  return `<div class="dev dev-desktop"><div class="dev-bar"><i></i><i></i><i></i><span class="dev-url"><i data-lucide="lock"></i>${esc(url)}</span></div><div class="dev-screen">${inner}</div></div>`;
}
const deviceToggle = (device) => `<div class="seg" role="group" aria-label="Preview device">
  <button type="button" data-device="desktop" aria-pressed="${device === 'desktop'}"><i data-lucide="monitor"></i>Desktop</button>
  <button type="button" data-device="mobile" aria-pressed="${device === 'mobile'}"><i data-lucide="smartphone"></i>Mobile</button></div>`;

function focusTitle() { const h = $('#step-title'); if (h) h.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }
