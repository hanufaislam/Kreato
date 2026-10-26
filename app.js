// Kreato onboarding prototype — vanilla JS, simulated backend
const $ = (s) => document.querySelector(s);
const screens = { signin: $('#screen-signin'), ob: $('#screen-ob'), home: $('#screen-home') };
const state = { name: '', handle: '', handleOk: false };

const TAKEN = ['admin', 'kreato', 'claudz', 'digi-ai', 'support', 'store', 'shop', 'pavithrabharathik'];
const icons = () => window.lucide && lucide.createIcons();
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function show(name) {
  Object.entries(screens).forEach(([k, el]) => (el.hidden = k !== name));
  window.scrollTo(0, 0);
  const focus = { signin: '#google-btn', ob: null, home: null }[name];
  if (focus) $(focus).focus({ preventScroll: true });
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.id); toast.id = setTimeout(() => (t.hidden = true), 2600);
}
function setLoading(btn, on) { btn.classList.toggle('loading', on); btn.disabled = on; }

/* ---- Sign in ---- */
async function signIn() {
  const b = $('#google-btn'); setLoading(b, true);
  await delay(900); setLoading(b, false);
  goStep();
}
$('#google-btn').addEventListener('click', signIn);
$('#start-selling').addEventListener('click', (e) => { e.preventDefault(); signIn(); });

/* ---- Onboarding: single step (store name + link) ---- */
function goStep() {
  show('ob');
  icons();
  $('#name').focus({ preventScroll: true });
}

/* ---- Step 1: handle ---- */
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9_-]+/g, '').replace(/^[-_]+|[-_]+$/g, '').slice(0, 30);
const nameEl = $('#name'), handleEl = $('#handle'), group = $('#handle-group'), msg = $('#handle-msg');
let handleTouched = false, checkId = 0;

function setMsg(kind, text) {
  const status = $('#handle-status');
  // Status lives inside the input (right side); only errors get text below.
  status.innerHTML = kind === 'ok' ? '<i data-lucide="check" aria-hidden="true"></i>'
    : kind === 'load' ? '<span class="spinner" aria-hidden="true"></span>' : '';
  msg.className = 'msg ' + (kind === 'err' ? 'err' : '');
  msg.innerHTML = kind === 'err' ? text
    : kind === 'ok' || kind === 'load' ? '<span class="sr-only">' + text + '</span>' : '';
  icons();
  $('#handle-help').hidden = kind === 'err';
  if (kind === 'err') $('#url-preview').hidden = true;
  group.classList.toggle('is-error', kind === 'err');
  group.classList.toggle('is-ok', kind === 'ok');
  handleEl.setAttribute('aria-invalid', kind === 'err');
}
function updatePreview() {
  const v = handleEl.value;
  $('#url-preview').hidden = !v;
  $('#url-text').textContent = 'kreato.co.in/' + v;
}
function renderSuggestions(base) {
  const list = $('#suggest-list'); list.innerHTML = '';
  const seen = new Set([base]);
  const opts = [];
  while (opts.length < 5) {
    const o = base + Math.floor(10 + Math.random() * 990);
    if (!seen.has(o) && !TAKEN.includes(o) && o.length <= 30) { seen.add(o); opts.push(o); }
  }
  opts.forEach((o) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = o;
    b.onclick = () => { handleEl.value = o; handleTouched = true; onHandle(); handleEl.focus(); };
    list.append(b);
  });
  $('#suggest').hidden = false;
}
function updateNext() { $('#s1-next').disabled = !(state.handleOk && nameEl.value.trim().length >= 2); }

async function onHandle() {
  const raw = handleEl.value;
  const v = raw.toLowerCase();
  if (v !== raw) handleEl.value = v;
  state.handle = v; state.handleOk = false; updatePreview(); updateNext();
  $('#suggest').hidden = true;
  const id = ++checkId;
  if (!v) { setMsg('', ''); return; }
  if (!/^[a-z0-9_-]+$/.test(v)) return setMsg('err', 'Use lowercase letters, numbers, - or _');
  if (v.length < 3) return setMsg('err', 'At least 3 characters');
  setMsg('load', 'Checking availability…');
  await delay(600);
  if (id !== checkId) return;
  if (TAKEN.includes(v)) { setMsg('err', 'That link is taken'); renderSuggestions(v); return; }
  state.handleOk = true; setMsg('ok', 'Available'); updateNext();
}
handleEl.addEventListener('input', () => { handleTouched = true; onHandle(); });
nameEl.addEventListener('input', () => {
  if (!handleTouched || !handleEl.value) {
    handleEl.value = slug(nameEl.value);
    handleTouched = false;
    onHandle();
  }
  updateNext();
});
$('#step-1').addEventListener('submit', async (e) => {
  e.preventDefault();
  if ($('#s1-next').disabled) return;
  state.name = nameEl.value.trim();
  const b = $('#s1-next'); setLoading(b, true); await delay(600); setLoading(b, false);
  finish();
});

/* ---- Handoff ---- */
function finish() {
  resetKreatoSetup(); // new sign-up: start the dashboard setup from step 1
  try { sessionStorage.setItem('kreato-user', JSON.stringify({ name: state.name, handle: state.handle })); } catch (e) {}
  location.href = 'dashboard.html?state=new';
  return;
  show('home');
  $('#home-url').textContent = 'kreato.co.in/' + state.handle;
  $('#home-title').textContent = 'Welcome, ' + state.name.split(' ')[0];
  $('#home-sub').textContent = 'Your store is created. Add your first product to go live.';
  const tasks = [
    { t: 'Create your store', d: 'kreato.co.in/' + state.handle, done: true },
    { t: 'Tell buyers about you', d: state.roles.join(', ') + ' · profile saved', done: true },
    { t: 'Add your first product', d: 'Upload a file and set a price.', done: false, cta: 'Add product' },
  ];
  const doneN = tasks.filter((x) => x.done).length;
  const next = tasks.findIndex((x) => !x.done);
  $('#prog-fill').style.width = (doneN / tasks.length) * 100 + '%';
  $('#prog-bar').setAttribute('aria-valuenow', Math.round((doneN / tasks.length) * 100));
  $('#prog-text').textContent = doneN + ' of ' + tasks.length + ' steps complete';
  $('#tasks').innerHTML = tasks.map((x, i) =>
    '<li class="task ' + (x.done ? 'done' : '') + ' ' + (i === next ? 'next' : '') + '">' +
    '<span class="tick">' + (x.done ? '<i data-lucide="check" aria-hidden="true"></i>' : '') + '</span>' +
    '<div class="grow"><div class="tt">' + x.t + '</div><div class="td">' + x.d + '</div></div>' +
    (!x.done ? '<button class="btn btn-primary" type="button" data-toast>' + x.cta + '</button>' : '') + '</li>').join('');
  icons();
  document.querySelectorAll('[data-toast]').forEach((el) => el.addEventListener('click', () => toast('Dashboard screens coming next')));
}
$('#restart').addEventListener('click', () => location.reload());

icons();
/* ---- Layout variant switcher ---- */
const variantEl = $('#variant');
function setVariant(v) {
  document.body.dataset.variant = v; variantEl.value = v;
  try { localStorage.setItem('kreato-ob-variant', v); } catch (e) {}
}
let savedVariant = 'card';
try { savedVariant = localStorage.getItem('kreato-ob-variant') || 'card'; } catch (e) {}
setVariant(savedVariant === 'open' ? 'open' : 'card');
variantEl.addEventListener('change', () => setVariant(variantEl.value));

show('signin');
