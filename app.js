/* Excessorize v2 "Noir Atelier" — PWA app shell.
   Flow graph in FLOWS.md governs every state here.
   Vanilla JS, no build step. Engine in engine.js, storage in db.js. */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- icon set: one 24px grid, 1.7px stroke, round caps ----------
  const I = (paths, fill) => `<svg viewBox="0 0 24 24" fill="${fill || 'none'}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const ICONS = {
    home: I('<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>'),
    closet: I('<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="M12 3.5v17"/><path d="M9.5 11h-2M16.5 11h-2"/>'),
    sparkle: I('<path d="M12 3.5l2 5.2 5.2 2-5.2 2-2 5.2-2-5.2-5.2-2 5.2-2z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>'),
    looks: I('<path d="M12 20.5s-7.2-4.4-9.3-8.7C1.2 8.2 3.1 5 6.4 5c2 0 3.6 1.2 4.3 2.3h2.6C14 6.2 15.6 5 17.6 5c3.3 0 5.2 3.2 3.7 6.8-2.1 4.3-9.3 8.7-9.3 8.7z"/>'),
    profile: I('<circle cx="12" cy="8.2" r="3.7"/><path d="M4.5 20c1.2-3.6 4.1-5.3 7.5-5.3s6.3 1.7 7.5 5.3"/>'),
    camera: I('<path d="M4 8.5h2.6l1.6-2.5h7.6l1.6 2.5H20a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5z"/><circle cx="12" cy="13.5" r="3.4"/>'),
    library: I('<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="M20.5 15.5 15.5 11 5 20"/>'),
    search: I('<circle cx="10.8" cy="10.8" r="6.3"/><path d="M15.6 15.6 20.5 20.5"/>'),
    sort: I('<path d="M7 4.5v15M7 19.5 3.8 16M7 19.5l3.2-3.5"/><path d="M17 19.5v-15M17 4.5 13.8 8M17 4.5l3.2 3.5"/>'),
    gear: I('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8l1 2.6a7 7 0 0 1 2.2.9l2.6-1 1.9 1.9-1 2.6c.4.7.7 1.4.9 2.2l2.6 1v2l-2.6 1a7 7 0 0 1-.9 2.2l1 2.6-1.9 1.9-2.6-1a7 7 0 0 1-2.2.9l-1 2.6h-2l-1-2.6a7 7 0 0 1-2.2-.9l-2.6 1-1.9-1.9 1-2.6a7 7 0 0 1-.9-2.2l-2.6-1v-2l2.6-1c.2-.8.5-1.5.9-2.2l-1-2.6L6.2 5.3l2.6 1a7 7 0 0 1 2.2-.9z"/>'),
    heart: I('<path d="M12 20.5s-7.2-4.4-9.3-8.7C1.2 8.2 3.1 5 6.4 5c2 0 3.6 1.2 4.3 2.3h2.6C14 6.2 15.6 5 17.6 5c3.3 0 5.2 3.2 3.7 6.8-2.1 4.3-9.3 8.7-9.3 8.7z"/>'),
    heartFill: I('<path d="M12 20.5s-7.2-4.4-9.3-8.7C1.2 8.2 3.1 5 6.4 5c2 0 3.6 1.2 4.3 2.3h2.6C14 6.2 15.6 5 17.6 5c3.3 0 5.2 3.2 3.7 6.8-2.1 4.3-9.3 8.7-9.3 8.7z"/>', 'currentColor'),
    star: I('<path d="M12 3.6l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z"/>'),
    starFill: I('<path d="M12 3.6l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z"/>', 'currentColor'),
    share: I('<path d="M12 3.5v11"/><path d="M8 7l4-3.5L16 7"/><path d="M5.5 11.5v7a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-7"/>'),
    trash: I('<path d="M4.5 6.5h15"/><path d="M8 6.5V5a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 5v1.5"/><path d="M6.5 6.5 7.3 19a1.8 1.8 0 0 0 1.8 1.7h5.8A1.8 1.8 0 0 0 16.7 19l.8-12.5"/>'),
    download: I('<path d="M12 3.5v11"/><path d="M8 11l4 3.5 4-3.5"/><path d="M5.5 15.5v3a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3"/>'),
    upload: I('<path d="M12 14.5v-11"/><path d="M8 7l4-3.5L16 7"/><path d="M5.5 15.5v3a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3"/>'),
    reset: I('<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4.5V9h4.5"/>'),
    replay: I('<path d="M12 4.5a7.5 7.5 0 1 1-7.5 7.5"/><path d="M4.5 4.5v4h4"/><path d="M10.5 9.5l3.5 2.5-3.5 2.5z"/>'),
    chevron: I('<path d="M9 5.5 15.5 12 9 18.5"/>'),
    check: I('<path d="M4.5 12.5 10 18 19.5 6.5"/>'),
    plus: I('<path d="M12 5v14M5 12h14"/>'),
    swap: I('<path d="M7 8.5h13M20 8.5 16.5 5M20 8.5 16.5 12"/><path d="M17 15.5H4M4 15.5 7.5 12M4 15.5 7.5 19"/>'),
    wand: I('<path d="M5 19 17.5 6.5"/><path d="M16 3.5l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z"/><path d="M20 10l.4 1.2 1.2.4-1.2.4-.4 1.2-.4-1.2-1.2-.4 1.2-.4z"/>'),
    info: I('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><path d="M12 7.8v.2"/>'),
  };

  const CATEGORIES = ['necklace', 'earrings', 'bracelet', 'ring', 'watch', 'bag', 'belt', 'scarf', 'hat', 'glasses'];
  const METALS = ['none', 'gold', 'silver', 'roseGold', 'mixed'];
  const STYLES = ['minimal', 'classic', 'romantic', 'boho', 'street', 'glam', 'sporty', 'edgy'];
  const OCCASIONS = ['everyday', 'work', 'dateNight', 'formal', 'travel', 'gym', 'beach'];
  const OCC_LABEL = { everyday: 'Everyday', work: 'Work', dateNight: 'Date night', formal: 'Formal', travel: 'Travel', gym: 'Gym', beach: 'Beach' };
  const SWATCH_HEX = {
    red: '#C0392B', orange: '#D97B29', yellow: '#E0B92E', chartreuse: '#9BB53C', green: '#4E8A50',
    teal: '#3E8E8B', blue: '#3C6FB0', indigo: '#4A4E9E', violet: '#7A4E9E', magenta: '#A83C88',
    pink: '#D98BA6', brown: '#6B4A2F', black: '#26221E', white: '#F5F1EA', grey: '#9A968F',
    cream: '#EFE4CE', tan: '#C8A470',
  };
  const VERSION = '2.0.0';

  const state = {
    tab: 'today',
    closet: [], looks: [],
    prefs: { boldness: 0.5, metalPreference: null, maxPieces: 4, avoidColors: [], favoriteStyles: [] },
    closetFilter: 'all', closetSort: 'newest', closetQuery: '',
    looksSort: 'newest', looksFilter: 'all', looksQuery: '',
    style: { phase: 'idle', photoBlob: null, photoUrl: null, outfit: null, result: null, occasion: 'everyday' },
    photoCb: null, objectUrls: [], ob: { step: 0 },
  };

  // ---------- utils ----------
  function toast(msg, gold) {
    $$('.toast').forEach((t) => t.remove());
    const el = document.createElement('div');
    el.className = 'toast' + (gold ? ' gold' : ''); el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2300);
  }
  function blobUrl(blob) { const u = URL.createObjectURL(blob); state.objectUrls.push(u); return u; }
  function photoSrc(item) {
    if (!item.photo) return '';
    if (typeof item.photo === 'string') return item.photo;
    if (!item._url) item._url = blobUrl(item.photo);
    return item._url;
  }
  function daysAgo(ts) { return ts ? Math.floor((Date.now() - ts) / 86400000) : null; }
  function engineItem(it) { return { ...it, lastWornDaysAgo: daysAgo(it.lastWornAt), styles: it.styles || [], seasons: it.seasons || [] }; }
  const strip = (it) => { const { _url, ...r } = it; return r; };
  const blobToDataUrl = (blob) => new Promise((res, rej) => {
    if (typeof blob === 'string') return res(blob);
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob);
  });
  async function dataUrlToBlob(u) { if (typeof u !== 'string' || !u.startsWith('data:image/jpeg') && !u.startsWith('data:image/png') && !u.startsWith('data:image/webp')) return u; return await (await fetch(u)).blob(); }

  // ---------- data ----------
  async function loadAll() {
    state.closet = await ExDB.items.all();
    state.looks = await ExDB.looks.all();
    const p = await ExDB.kv.get('prefs');
    if (p) state.prefs = { ...state.prefs, ...p };
  }
  const savePrefs = () => ExDB.kv.set('prefs', state.prefs);

  // ---------- navigation ----------
  function nav(tab) {
    state.tab = tab;
    $$('.screen').forEach((s) => s.classList.remove('active'));
    $('#screen-' + tab).classList.add('active');
    $$('#tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.nav === tab));
    render();
    window.scrollTo({ top: 0 });
  }

  // ---------- sheet ----------
  function openSheet(html) { $('#sheet-body').innerHTML = html; $('#sheet-wrap').classList.add('open'); }
  function closeSheet() { $('#sheet-wrap').classList.remove('open'); }

  // ---------- photo plumbing ----------
  function requestPhoto(source, cb) {
    state.photoCb = cb;
    $(source === 'camera' ? '#input-camera' : '#input-library').click();
  }
  async function onPhotoPicked(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file || !state.photoCb) return;
    try {
      const { img } = await ExVision.loadImageFromFile(file);
      const cb = state.photoCb; state.photoCb = null;
      cb(img, file);
    } catch (err) { console.error(err); toast("Couldn't read that photo. Try another."); }
  }

  // ================= ONBOARDING =================
  function startOnboarding() {
    $('#ob-wrap').style.display = 'block';
    state.ob.step = 0;
    renderOb();
  }
  function endOnboarding(goTab) {
    ExDB.kv.set('onboarded', VERSION);
    $('#ob-wrap').style.display = 'none';
    nav(goTab || 'today');
  }
  function obDots(n) { return `<div class="ob-dots">${[0, 1, 2].map((i) => `<i class="${i === n ? 'on' : ''}"></i>`).join('')}</div>`; }

  function renderOb() {
    const el = $('#ob');
    if (state.ob.step === 0) {
      el.innerHTML = `
        <div class="ob-step">
          <div class="ob-mark">Excessorize</div>
          <h1 class="ob-title">You already own the right pieces.</h1>
          <p class="ob-sub">Photograph your outfit and Excessorize styles it from your own accessories — and tells you why each pairing works.</p>
          <div class="ob-cta">
            <button class="btn primary" id="ob-next">Begin</button>
            <button class="ob-skip" id="ob-skip">Skip for now</button>
          </div>
          ${obDots(0)}
        </div>`;
      $('#ob-next').onclick = () => { state.ob.step = 1; renderOb(); };
      $('#ob-skip').onclick = () => endOnboarding();
      return;
    }
    if (state.ob.step === 1) {
      const p = state.prefs;
      el.innerHTML = `
        <div class="ob-step">
          <div class="ob-mark">Style DNA</div>
          <h1 class="ob-title">How do you like to wear it?</h1>
          <p class="ob-sub">This shapes every recommendation. Change it anytime in Profile.</p>
          <div class="ob-body">
            <div class="field" style="margin-top:6px">
              <label>How much excess? <span id="ob-bold-v" style="color:var(--gold)">${p.boldness <= 0.25 ? 'Subtle' : p.boldness >= 0.75 ? 'Full excess' : 'Balanced'}</span></label>
              <input type="range" id="ob-bold" min="0" max="100" value="${Math.round(p.boldness * 100)}" />
              <div class="range-labels"><span>Quiet staples</span><span>Statement pieces</span></div>
            </div>
            <div class="field"><label>Metals you reach for</label>
              <div class="chips" id="ob-metal">
                ${['none', 'gold', 'silver'].map((m) => `<button class="chip ${p.metalPreference === (m === 'none' ? null : m) ? 'on' : ''}" data-m="${m}">${m === 'none' ? 'No preference' : m[0].toUpperCase() + m.slice(1)}</button>`).join('')}
              </div>
            </div>
            <div class="field"><label>Styles that feel like you <span style="color:var(--ter);font-weight:600">(pick any)</span></label>
              <div class="chips" id="ob-styles">
                ${STYLES.map((s) => `<button class="chip ${p.favoriteStyles.includes(s) ? 'on' : ''}" data-s="${s}">${s}</button>`).join('')}
              </div>
            </div>
          </div>
          <div class="ob-cta">
            <button class="btn primary" id="ob-next">Continue</button>
            <button class="ob-skip" id="ob-skip">Skip</button>
          </div>
          ${obDots(1)}
        </div>`;
      $('#ob-bold').oninput = (e) => { state.prefs.boldness = +e.target.value / 100;
        $('#ob-bold-v').textContent = state.prefs.boldness <= 0.25 ? 'Subtle' : state.prefs.boldness >= 0.75 ? 'Full excess' : 'Balanced'; };
      $('#ob-metal').onclick = (e) => { const m = e.target.dataset?.m; if (!m) return;
        state.prefs.metalPreference = m === 'none' ? null : m;
        $$('#ob-metal .chip').forEach((c) => c.classList.toggle('on', c.dataset.m === m)); };
      $('#ob-styles').onclick = (e) => { const s = e.target.dataset?.s; if (!s) return;
        const f = state.prefs.favoriteStyles;
        state.prefs.favoriteStyles = f.includes(s) ? f.filter((x) => x !== s) : [...f, s];
        e.target.classList.toggle('on'); };
      $('#ob-next').onclick = async () => { await savePrefs(); state.ob.step = 2; renderOb(); };
      $('#ob-skip').onclick = async () => { await savePrefs(); state.ob.step = 2; renderOb(); };
      return;
    }
    // step 2 — seed the closet
    el.innerHTML = `
      <div class="ob-step">
        <div class="ob-mark">Your closet</div>
        <h1 class="ob-title">Give it something to work with.</h1>
        <p class="ob-sub">Photograph a favorite piece, or load 12 demo accessories to feel the whole loop first. Demo pieces are badged and removable in one tap.</p>
        <div class="ob-cta">
          <button class="btn primary" id="ob-demo">${ICONS.sparkle} Load the starter pack</button>
          <button class="btn" id="ob-cam">${ICONS.camera} Photograph a piece</button>
          <button class="ob-skip" id="ob-skip">I'll do this later</button>
        </div>
        ${obDots(2)}
      </div>`;
    $('#ob-demo').onclick = async () => { await loadStarterPack(); endOnboarding(); toast('Starter pack loaded', true); };
    $('#ob-cam').onclick = () => { endOnboarding('closet'); requestPhoto('camera', onItemPhoto); };
    $('#ob-skip').onclick = () => endOnboarding();
  }

  async function loadStarterPack() {
    for (const raw of ExSeed.starterPack) {
      const { hex, hex2, ...it } = raw;
      await ExDB.items.put({ ...it, id: ExDB.uid(), addedAt: Date.now(), lastWornAt: null });
    }
    await loadAll(); render();
  }

  // ================= TODAY =================
  function renderToday() {
    const h = new Date().getHours();
    $('#today-date').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    $('#today-greet').textContent = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const items = state.closet.length, looks = state.looks.length;
    const demo = state.closet.filter((i) => i.demo).length;
    const latest = state.looks[0];
    const resting = state.closet.filter((i) => !i.lastWornAt || daysAgo(i.lastWornAt) >= 30).length;
    $('#today-content').innerHTML = `
      <div class="stagger">
      <div class="stat-row">
        <button class="stat" data-nav="closet"><div class="n">${items}</div><div class="l">pieces owned</div></button>
        <button class="stat" data-nav="looks"><div class="n">${looks}</div><div class="l">looks saved</div></button>
        <button class="stat" data-nav="closet"><div class="n">${resting}</div><div class="l">resting pieces</div></button>
      </div>
      <div class="card">
        <div class="eyebrow">The core loop</div>
        <h2>${items === 0 ? 'Start with your closet' : 'Style what you\u2019re wearing'}</h2>
        <p class="body">${items === 0
          ? 'Add accessories you own — Excessorize only ever recommends from your own pieces.'
          : 'One photo. Your accessories, chosen for this exact outfit, each with the reason it works.'}</p>
        <div class="chips">
          ${items === 0
            ? `<button class="btn primary" id="t-add">${ICONS.plus} Add a piece</button><button class="btn ghost" id="t-demo">Load starter pack</button>`
            : `<button class="btn primary" data-nav="style">${ICONS.wand} Open the Stylist</button>`}
        </div>
      </div>
      ${latest ? `
      <div class="section-head"><h2>Latest look</h2><button data-nav="looks">All looks</button></div>
      <button class="look-card" data-open-look="${latest.id}" style="margin-top:12px">
        <span class="heroWrap"><img class="hero" src="${photoSrc(latest)}" alt="Latest saved look" /></span>
        <div class="pad">
          <div class="eyebrow">${new Date(latest.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${latest.picks.length} pieces</div>
          <h2>${esc(latest.title)}</h2>
        </div>
      </button>` : ''}
      ${demo ? `<div class="banner info">${demo} demo pieces are in your closet. Remove them anytime in Profile → Settings.</div>` : ''}
      </div>`;
    $('#t-add')?.addEventListener('click', startAddItem);
    $('#t-demo')?.addEventListener('click', async () => { await loadStarterPack(); toast('Starter pack loaded', true); });
  }

  // ================= CLOSET =================
  const CLOSET_SORTS = {
    newest: { label: 'Newest first', fn: (a, b) => (b.addedAt || 0) - (a.addedAt || 0) },
    name: { label: 'Name A–Z', fn: (a, b) => (a.name || '').localeCompare(b.name || '') },
    dress: { label: 'Dress level', fn: (a, b) => b.formality - a.formality },
    worn: { label: 'Most worn', fn: (a, b) => (b.timesWorn || 0) - (a.timesWorn || 0) },
    resting: { label: 'Resting longest', fn: (a, b) => (daysAgo(b.lastWornAt) ?? 9e9) - (daysAgo(a.lastWornAt) ?? 9e9) },
  };

  function renderCloset() {
    const cats = ['all', ...CATEGORIES.filter((c) => state.closet.some((i) => i.category === c))];
    $('#closet-count').textContent = `${state.closet.length} ${state.closet.length === 1 ? 'piece' : 'pieces'} · ${CLOSET_SORTS[state.closetSort].label}`;
    $('#closet-filters').innerHTML = cats.map((c) =>
      `<button class="chip ${state.closetFilter === c ? 'on' : ''}" data-cfilter="${c}">${c === 'all' ? 'All' : c[0].toUpperCase() + c.slice(1)}</button>`).join('');
    const q = state.closetQuery.trim().toLowerCase();
    let items = state.closet
      .filter((i) => state.closetFilter === 'all' || i.category === state.closetFilter)
      .filter((i) => !q || (i.name || '').toLowerCase().includes(q) || (i.category || '').includes(q) || (i.colors || []).some((c) => c.family.includes(q)));
    items.sort(CLOSET_SORTS[state.closetSort].fn);
    $('#closet-content').innerHTML = items.length ? `<div class="grid stagger">${items.map((it) => `
      <button class="tile" data-open-item="${it.id}">
        ${it.demo ? '<span class="badge demo">Demo</span>' : (ExEngine.tierOf(it) === 'excess' ? '<span class="badge tier-excess">Excess</span>' : '')}
        ${it.favorite ? `<span class="fav">★</span>` : ''}
        <img src="${photoSrc(it)}" alt="${esc(it.name)}" loading="lazy" />
        <div class="meta"><div class="name">${esc(it.name)}</div><div class="sub">${esc(it.category)} · dress ${it.formality}/5</div></div>
      </button>`).join('')}</div>`
      : (state.closet.length ? `
      <div class="empty rise"><div class="art">${ICONS.search}</div><h3>No matches</h3>
        <p>Nothing fits "${esc(state.closetQuery) || 'this filter'}". Try clearing the search or filter.</p>
        <button class="btn" id="c-clear">Clear filters</button></div>` : `
      <div class="empty rise"><div class="art">${ICONS.closet}</div><h3>Nothing here yet</h3>
        <p>Photograph a piece you own — tags come pre-filled, you just confirm. Or load the starter pack.</p>
        <button class="btn primary" id="btn-empty-add">${ICONS.plus} Add your first piece</button></div>`);
    $('#btn-empty-add')?.addEventListener('click', startAddItem);
    $('#c-clear')?.addEventListener('click', () => { state.closetQuery = ''; state.closetFilter = 'all'; $('#closet-search').value = ''; renderCloset(); });
  }

  function closetSortSheet() {
    openSheet(`
      <h2>Sort closet</h2>
      <div style="margin-top:8px">
        ${Object.entries(CLOSET_SORTS).map(([k, v]) => `
        <button class="option-row" data-csort="${k}" style="width:100%;text-align:left">
          <span class="ol">${v.label}${k === 'resting' ? '<div class="od">Surface pieces you haven\u2019t worn — the whole point</div>' : ''}</span>
          <span style="color:var(--gold)">${state.closetSort === k ? ICONS.check : ''}</span>
        </button>`).join('')}
      </div>`);
    $$('#sheet-body [data-csort]').forEach((b) => b.onclick = () => { state.closetSort = b.dataset.csort; closeSheet(); renderCloset(); });
  }

  function startAddItem() {
    openSheet(`
      <h2>Add a piece</h2>
      <p class="body" style="color:var(--sec);font-size:14px;margin-top:7px">Photograph it on a plain surface in decent light — tags come pre-filled, you just confirm.</p>
      <div class="row">
        <button class="btn primary" id="sheet-cam">${ICONS.camera} Take photo</button>
        <button class="btn" id="sheet-lib">${ICONS.library} Library</button>
      </div>`);
    $('#sheet-cam').onclick = () => { closeSheet(); requestPhoto('camera', onItemPhoto); };
    $('#sheet-lib').onclick = () => { closeSheet(); requestPhoto('library', onItemPhoto); };
  }

  async function onItemPhoto(img) {
    const { tags, confidence } = ExVision.analyzeColors(img, { kind: 'item' });
    const blob = await ExVision.thumbnail(img, 700);
    itemConfirmSheet({
      id: null, name: '', category: 'necklace', colors: tags.map((t) => ({ ...t, weight: 1 })),
      metal: 'none', formality: 3, statement: 2, styles: ['classic'],
      seasons: ['spring', 'summer', 'autumn', 'winter'], favorite: false,
      photo: blob, confidence,
    }, true);
  }

  function itemConfirmSheet(draft, isNew) {
    const url = typeof draft.photo === 'string' ? draft.photo : blobUrl(draft.photo);
    openSheet(`
      <h2>${isNew ? 'Confirm & tag' : 'Edit piece'}</h2>
      ${isNew && draft.confidence < 0.6 ? `<div class="banner">Low-light read — double-check the colors below.</div>` : ''}
      <div class="photo-frame" style="max-height:200px"><img src="${url}" style="max-height:200px" alt="" /></div>
      <div class="field"><label>Name</label><input type="text" id="f-name" value="${esc(draft.name)}" placeholder="e.g. Gold hoops" /></div>
      <div class="field"><label>Category</label><select id="f-cat">${CATEGORIES.map((c) => `<option ${draft.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label>Detected colors — tap to remove</label>
        <div class="swatches" id="f-colors">${draft.colors.map((c, i) => `<button class="swatch" data-ci="${i}"><i style="background:${SWATCH_HEX[c.family] || '#999'}"></i>${c.family}</button>`).join('') || '<span style="color:var(--ter);font-size:13px">none — that\u2019s ok</span>'}</div>
      </div>
      <div class="field"><label>Metal</label><div class="chips" id="f-metal">${METALS.map((m) => `<button class="chip ${draft.metal === m ? 'on' : ''}" data-m="${m}">${m === 'roseGold' ? 'Rose gold' : m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div></div>
      <div class="field"><label>Dress level: <span id="f-form-v">${draft.formality}</span>/5</label><input type="range" id="f-form" min="1" max="5" value="${draft.formality}" /><div class="range-labels"><span>Beach</span><span>Black tie</span></div></div>
      <div class="field"><label>Statement: <span id="f-stmt-v">${draft.statement}</span>/5 · tier <b style="color:var(--gold)" id="f-tier">${ExEngine.tierOf(draft)}</b></label><input type="range" id="f-stmt" min="1" max="5" value="${draft.statement}" /><div class="range-labels"><span>Quiet staple</span><span>Full excess</span></div></div>
      <div class="field"><label>Styles</label><div class="chips" id="f-styles">${STYLES.map((s) => `<button class="chip ${draft.styles.includes(s) ? 'on' : ''}" data-s="${s}">${s}</button>`).join('')}</div></div>
      <div class="row">
        ${isNew ? '' : `<button class="btn ghost danger" id="f-delete">${ICONS.trash} Delete</button>`}
        <button class="btn primary" id="f-save">${isNew ? 'Add to closet' : 'Save'}</button>
      </div>`);

    $('#f-colors').onclick = (e) => {
      const b = e.target.closest('[data-ci]'); if (!b) return;
      draft.colors.splice(+b.dataset.ci, 1); b.remove();
      $$('#f-colors [data-ci]').forEach((el, i) => (el.dataset.ci = i));
    };
    $('#f-metal').onclick = (e) => { const m = e.target.dataset?.m; if (!m) return;
      draft.metal = m; $$('#f-metal .chip').forEach((c) => c.classList.toggle('on', c.dataset.m === m)); };
    $('#f-form').oninput = (e) => { draft.formality = +e.target.value; $('#f-form-v').textContent = draft.formality; };
    $('#f-stmt').oninput = (e) => { draft.statement = +e.target.value; $('#f-stmt-v').textContent = draft.statement; $('#f-tier').textContent = ExEngine.tierOf(draft); };
    $('#f-styles').onclick = (e) => { const s = e.target.dataset?.s; if (!s) return;
      draft.styles = draft.styles.includes(s) ? draft.styles.filter((x) => x !== s) : [...draft.styles, s];
      e.target.classList.toggle('on'); };
    $('#f-delete')?.addEventListener('click', () => confirmSheet(
      'Delete this piece?', 'It comes out of every future recommendation. Saved looks keep their record.',
      async () => { await ExDB.items.delete(draft.id); closeSheet(); await loadAll(); render(); toast('Deleted'); }));
    $('#f-save').onclick = async () => {
      draft.name = $('#f-name').value.trim() || (draft.category[0].toUpperCase() + draft.category.slice(1));
      draft.category = $('#f-cat').value;
      const { confidence, _url, ...rec } = draft;
      if (isNew) { rec.id = ExDB.uid(); rec.addedAt = Date.now(); rec.timesWorn = 0; rec.lastWornAt = null; rec.demo = false; }
      await ExDB.items.put(rec);
      closeSheet(); await loadAll(); render();
      toast(isNew ? 'Added to your closet' : 'Saved', isNew);
    };
  }

  function openItemSheet(id) {
    const it = state.closet.find((x) => x.id === id); if (!it) return;
    const worn = it.lastWornAt ? `Last worn ${daysAgo(it.lastWornAt)}d ago` : 'Never worn — bonus points in ranking';
    openSheet(`
      <h2>${esc(it.name)}</h2>
      <p class="body" style="color:var(--sec);font-size:14px;margin-top:5px;text-transform:capitalize">${esc(it.category)} · dress ${it.formality}/5 · ${ExEngine.tierOf(it)} tier · ${worn}</p>
      <div class="photo-frame" style="max-height:240px"><img src="${photoSrc(it)}" style="max-height:240px" alt="" /></div>
      <div class="row">
        <button class="btn ${it.favorite ? 'primary' : ''}" id="i-fav">${it.favorite ? ICONS.starFill : ICONS.star} Favorite</button>
        <button class="btn" id="i-worn">${ICONS.check} Worn today</button>
        <button class="btn" id="i-edit">Edit tags</button>
      </div>`);
    $('#i-fav').onclick = async () => { it.favorite = !it.favorite; await ExDB.items.put(strip(it)); await loadAll(); render(); closeSheet(); };
    $('#i-worn').onclick = async () => { it.lastWornAt = Date.now(); it.timesWorn = (it.timesWorn || 0) + 1; await ExDB.items.put(strip(it)); await loadAll(); render(); closeSheet(); toast('Marked worn'); };
    $('#i-edit').onclick = () => itemConfirmSheet({ ...it, styles: [...(it.styles || [])], colors: [...(it.colors || [])] }, false);
  }

  function confirmSheet(title, body, onYes) {
    openSheet(`
      <h2>${esc(title)}</h2>
      <p class="body" style="color:var(--sec);font-size:14px;margin-top:8px;line-height:1.5">${esc(body)}</p>
      <div class="row">
        <button class="btn" id="cf-no">Cancel</button>
        <button class="btn ghost danger" id="cf-yes">Yes, do it</button>
      </div>`);
    $('#cf-no').onclick = closeSheet;
    $('#cf-yes').onclick = onYes;
  }

  // ================= STYLIST =================
  function renderStyle() {
    const s = state.style;
    const el = $('#style-content');
    if (s.phase === 'idle') {
      el.innerHTML = `
        <div class="stagger">
        ${state.closet.length === 0 ? `<div class="banner">Your closet is empty — recommendations come only from pieces you own. Add pieces first.</div>` : ''}
        <div class="card">
          <div class="eyebrow">Step one</div>
          <h2>Capture your outfit</h2>
          <p class="body">Full-length in the mirror works best. Excessorize reads the palette and drafts a style read — you confirm before anything is styled.</p>
          <div class="row" style="display:flex;gap:10px;margin-top:16px">
            <button class="btn primary" style="flex:1" id="s-cam">${ICONS.camera} Camera</button>
            <button class="btn" style="flex:1" id="s-lib">${ICONS.library} Library</button>
          </div>
        </div>
        <div class="card">
          <div class="eyebrow">Occasion</div>
          <div class="chips" id="s-occ">
            ${OCCASIONS.map((o) => `<button class="chip ${s.occasion === o ? 'on' : ''}" data-o="${o}">${OCC_LABEL[o]}</button>`).join('')}
          </div>
        </div>
        </div>`;
      $('#s-cam').onclick = () => requestPhoto('camera', onOutfitPhoto);
      $('#s-lib').onclick = () => requestPhoto('library', onOutfitPhoto);
      $('#s-occ').onclick = (e) => { const o = e.target.dataset?.o; if (!o) return;
        s.occasion = o; $$('#s-occ .chip').forEach((c) => c.classList.toggle('on', c.dataset.o === o)); };
      return;
    }
    if (s.phase === 'analyzing') {
      el.innerHTML = `
        <div class="rise">
        <div class="photo-frame"><img src="${s.photoUrl}" alt="Your outfit" /><span class="overlay-label">Reading this outfit…</span></div>
        <div class="shimmer" style="height:68px;margin-top:16px"></div>
        <div class="shimmer" style="height:68px;margin-top:10px"></div>
        </div>`;
      return;
    }
    if (s.phase === 'confirm') {
      const o = s.outfit;
      el.innerHTML = `
        <div class="stagger">
        <div class="photo-frame"><img src="${s.photoUrl}" alt="Your outfit" /><span class="overlay-label">Outfit</span></div>
        ${o.confidence < 0.6 ? `<div class="banner">I'm not fully sure about this read — correct anything that looks off.</div>`
                             : `<div class="banner info">Draft read — confirm or adjust, then style it.</div>`}
        <div class="card">
          <div class="eyebrow">Detected palette</div>
          <div class="swatches">${o.colors.map((c) => `<span class="swatch"><i style="background:${SWATCH_HEX[c.family] || '#999'}"></i>${c.family} ${Math.round((c.weight || 0) * 100)}%</span>`).join('') || '<span style="color:var(--ter)">none detected</span>'}</div>
          <div class="field"><label>Dress level: <span id="o-form-v">${o.formality}</span>/5</label>
            <input type="range" id="o-form" min="1" max="5" value="${o.formality}" />
            <div class="range-labels"><span>Beach</span><span>Black tie</span></div></div>
          <div class="field"><label>Occasion</label>
            <div class="chips" id="o-occ">${OCCASIONS.map((x) => `<button class="chip ${o.occasion === x ? 'on' : ''}" data-o="${x}">${OCC_LABEL[x]}</button>`).join('')}</div></div>
          <div class="field"><label>Neckline <span style="color:var(--ter);font-weight:600">(guides necklace vs earrings)</span></label>
            <div class="chips" id="o-neck">${['vneck', 'scoop', 'crew', 'high', 'collared', 'strapless'].map((n) => `<button class="chip ${o.neckline === n ? 'on' : ''}" data-n="${n}">${n === 'vneck' ? 'V-neck' : n[0].toUpperCase() + n.slice(1)}</button>`).join('')}</div></div>
          <div class="row"><button class="btn" id="o-retake">Retake</button><button class="btn primary" id="o-style">${ICONS.wand} Style it</button></div>
        </div>
        </div>`;
      $('#o-form').oninput = (e) => { o.formality = +e.target.value; $('#o-form-v').textContent = o.formality; };
      $('#o-occ').onclick = (e) => { const x = e.target.dataset?.o; if (!x) return; o.occasion = x; $$('#o-occ .chip').forEach((c) => c.classList.toggle('on', c.dataset.o === x)); };
      $('#o-neck').onclick = (e) => { const n = e.target.dataset?.n; if (!n) return; o.neckline = o.neckline === n ? null : n; $$('#o-neck .chip').forEach((c) => c.classList.toggle('on', c.dataset.n === o.neckline)); };
      $('#o-retake').onclick = resetStyle;
      $('#o-style').onclick = runEngine;
      return;
    }
    if (s.phase === 'results') {
      const r = s.result;
      const relaxedNote = r.relaxed.length ? `<div class="banner">Closest matches — I loosened ${r.relaxed.join(', then ')} to find these.</div>` : '';
      el.innerHTML = `
        <div class="stagger">
        <div class="photo-frame"><img src="${s.photoUrl}" alt="Your outfit" /><span class="overlay-label">Outfit</span></div>
        ${r.askToConfirmOutfit ? `<div class="banner">Styled from an uncertain read — picks favor safe bets.</div>` : ''}
        ${relaxedNote}
        ${r.picks.length ? `
        <div class="card">
          <div class="eyebrow">Styled from your closet</div>
          <h2>${r.picks.length} ${r.picks.length === 1 ? 'piece' : 'pieces'}, one story</h2>
          <div style="margin-top:8px" class="stagger">
          ${r.picks.map((p) => `
            <div class="rec">
              <img src="${photoSrc(p.item)}" alt="" />
              <div class="info">
                <div class="name">${esc(p.item.name)}</div>
                <div class="why-line">${esc(p.rationale)}</div>
                <span class="tier-tag ${p.tier}">${p.tier}</span>
              </div>
              ${r.alternates.some((a) => a.item.category === p.item.category) ? `<button class="btn small swap" data-swap="${p.item.id}">${ICONS.swap} Swap</button>` : ''}
            </div>`).join('')}
          </div>
          <div class="row"><button class="btn" id="r-again">Restyle</button><button class="btn primary" id="r-save">Save this look</button></div>
        </div>` : `
        <div class="empty rise"><div class="art">${ICONS.sparkle}</div><h3>No confident pairing</h3>
          <p>${r.emptyReason === 'emptyCloset' ? 'Your closet is empty — add pieces first.' : 'Everything I could pick clashed with this outfit or your rules. Try another occasion, or add pieces in the missing categories.'}</p>
          <button class="btn primary" id="r-reset">Start over</button></div>`}
        </div>`;
      $('#r-again')?.addEventListener('click', runEngine);
      $('#r-save')?.addEventListener('click', saveLook);
      $('#r-reset')?.addEventListener('click', resetStyle);
      $$('[data-swap]').forEach((b) => b.addEventListener('click', () => swapPick(b.dataset.swap)));
      return;
    }
  }

  async function onOutfitPhoto(img) {
    const s = state.style;
    s.photoBlob = await ExVision.thumbnail(img, 1100);
    s.photoUrl = blobUrl(s.photoBlob);
    s.phase = 'analyzing';
    nav('style');
    setTimeout(() => {
      const outfit = ExVision.draftOutfitRead(img);
      outfit.occasion = s.occasion || 'everyday';
      if (outfit.confidence < 0.6) {
        outfit.altRead = { formality: Math.min(5, outfit.formality + 2), styleRead: { glam: 0.6, classic: 0.4 } };
      }
      s.outfit = outfit;
      s.phase = 'confirm';
      renderStyle();
    }, 750);
  }

  function runEngine() {
    const s = state.style;
    s.result = ExEngine.recommend(s.outfit, state.closet.map(engineItem), state.prefs);
    s.phase = 'results';
    renderStyle();
  }

  function swapPick(itemId) {
    const s = state.style, r = s.result;
    const i = r.picks.findIndex((p) => p.item.id === itemId);
    if (i < 0) return;
    const cat = r.picks[i].item.category;
    const altIdx = r.alternates.findIndex((a) => a.item.category === cat);
    if (altIdx < 0) return;
    const old = r.picks[i];
    r.picks[i] = r.alternates[altIdx];
    r.alternates[altIdx] = old;
    renderStyle();
    toast('Swapped');
  }

  async function saveLook() {
    const s = state.style, r = s.result;
    const titles = { anchor: 'Quiet Anchor', elevate: 'Easy Lift', excess: 'Full Excess' };
    const topTier = r.picks.some((p) => p.tier === 'excess') ? 'excess' : r.picks.some((p) => p.tier === 'elevate') ? 'elevate' : 'anchor';
    const look = {
      id: ExDB.uid(), createdAt: Date.now(), title: titles[topTier], favorite: false,
      photo: s.photoBlob, outfit: { ...s.outfit },
      picks: r.picks.map((p) => ({
        itemId: p.item.id, name: p.item.name, category: p.item.category,
        tier: p.tier, rationale: p.rationale, score: p.score,
        photo: p.item.photo,
      })),
      relaxed: r.relaxed,
    };
    await ExDB.looks.put(look);
    for (const p of r.picks) {
      const it = state.closet.find((x) => x.id === p.item.id);
      if (it) { it.lastWornAt = Date.now(); it.timesWorn = (it.timesWorn || 0) + 1; await ExDB.items.put(strip(it)); }
    }
    await loadAll();
    resetStyle();
    nav('looks');
    toast('Look saved', true);
  }

  function resetStyle() {
    state.style = { phase: 'idle', photoBlob: null, photoUrl: null, outfit: null, result: null, occasion: state.style.occasion };
    if (state.tab === 'style') renderStyle();
  }

  // ================= LOOKS =================
  const LOOKS_SORTS = {
    newest: { label: 'Newest first', fn: (a, b) => b.createdAt - a.createdAt },
    oldest: { label: 'Oldest first', fn: (a, b) => a.createdAt - b.createdAt },
    pieces: { label: 'Most pieces', fn: (a, b) => b.picks.length - a.picks.length },
    title: { label: 'Title A–Z', fn: (a, b) => (a.title || '').localeCompare(b.title || '') },
  };

  function renderLooks() {
    $('#looks-count').textContent = `${state.looks.length} saved ${state.looks.length === 1 ? 'look' : 'looks'} · ${LOOKS_SORTS[state.looksSort].label}`;
    const filters = [['all', 'All'], ['fav', '★ Favorites'], ['excess', 'Full Excess'], ...OCCASIONS.filter((o) => state.looks.some((l) => l.outfit?.occasion === o)).map((o) => [o, OCC_LABEL[o]])];
    $('#looks-filters').innerHTML = filters.map(([k, lbl]) =>
      `<button class="chip ${state.looksFilter === k ? 'on' : ''}" data-lfilter="${k}">${lbl}</button>`).join('');
    const q = state.looksQuery.trim().toLowerCase();
    let looks = state.looks
      .filter((l) => state.looksFilter === 'all'
        || (state.looksFilter === 'fav' && l.favorite)
        || (state.looksFilter === 'excess' && l.picks.some((p) => p.tier === 'excess'))
        || l.outfit?.occasion === state.looksFilter)
      .filter((l) => !q || (l.title || '').toLowerCase().includes(q) || l.picks.some((p) => (p.name || '').toLowerCase().includes(q)));
    looks = [...looks].sort(LOOKS_SORTS[state.looksSort].fn);
    $('#looks-content').innerHTML = looks.length ? `<div class="stagger">${looks.map((l) => `
      <button class="look-card" data-open-look="${l.id}">
        <span class="lfav" data-lovefav="${l.id}">${l.favorite ? ICONS.heartFill : ICONS.heart}</span>
        <span class="heroWrap"><img class="hero" src="${photoSrc(l)}" alt="${esc(l.title)}" loading="lazy" /></span>
        <div class="pad">
          <div class="eyebrow">${new Date(l.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${l.picks.length} pieces${l.outfit?.occasion ? ' · ' + OCC_LABEL[l.outfit.occasion] : ''}</div>
          <h2>${esc(l.title)}</h2>
          <div class="pieces">${l.picks.map((p) => `<img src="${pieceSrc(p)}" alt="" />`).join('')}</div>
        </div>
      </button>`).join('')}</div>`
      : (state.looks.length ? `
      <div class="empty rise"><div class="art">${ICONS.search}</div><h3>No matches</h3>
        <p>No looks fit this filter. Clear it to see everything.</p>
        <button class="btn" id="l-clear">Clear filters</button></div>` : `
      <div class="empty rise"><div class="art">${ICONS.looks}</div><h3>No looks yet</h3>
        <p>Style an outfit and save it — your lookbook becomes the record of what works on you.</p>
        <button class="btn primary" data-nav="style">${ICONS.wand} Open the Stylist</button></div>`);
    $('#l-clear')?.addEventListener('click', () => { state.looksQuery = ''; state.looksFilter = 'all'; $('#looks-search').value = ''; renderLooks(); });
  }

  function looksSortSheet() {
    openSheet(`
      <h2>Sort looks</h2>
      <div style="margin-top:8px">
        ${Object.entries(LOOKS_SORTS).map(([k, v]) => `
        <button class="option-row" data-lsort="${k}" style="width:100%;text-align:left">
          <span class="ol">${v.label}</span>
          <span style="color:var(--gold)">${state.looksSort === k ? ICONS.check : ''}</span>
        </button>`).join('')}
      </div>`);
    $$('#sheet-body [data-lsort]').forEach((b) => b.onclick = () => { state.looksSort = b.dataset.lsort; closeSheet(); renderLooks(); });
  }

  function pieceSrc(p) {
    if (typeof p.photo === 'string') return p.photo;
    if (p.photo instanceof Blob) { if (!p._url) p._url = blobUrl(p.photo); return p._url; }
    return '';
  }

  async function toggleLookFav(id) {
    const l = state.looks.find((x) => x.id === id); if (!l) return;
    l.favorite = !l.favorite;
    const { _url, ...rec } = l;
    await ExDB.looks.put(rec);
    await loadAll(); renderLooks();
  }

  function openLookSheet(id) {
    const l = state.looks.find((x) => x.id === id); if (!l) return;
    openSheet(`
      <h2>${esc(l.title)}</h2>
      <p class="body" style="color:var(--sec);font-size:14px;margin-top:5px">${new Date(l.createdAt).toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}${l.outfit?.occasion ? ' · ' + OCC_LABEL[l.outfit.occasion] : ''}</p>
      <div class="photo-frame" style="max-height:300px"><img src="${photoSrc(l)}" style="max-height:300px" alt="" /></div>
      <div style="margin-top:10px">
        ${l.picks.map((p) => `
          <div class="rec">
            <img src="${pieceSrc(p)}" alt="" />
            <div class="info"><div class="name">${esc(p.name)}</div><div class="why-line">${esc(p.rationale)}</div><span class="tier-tag ${p.tier}">${p.tier}</span></div>
          </div>`).join('')}
      </div>
      <div class="row">
        <button class="btn ${l.favorite ? 'primary' : ''}" id="l-fav">${l.favorite ? ICONS.heartFill : ICONS.heart} Favorite</button>
        <button class="btn" id="l-share">${ICONS.share} Share</button>
        <button class="btn ghost danger" id="l-del">${ICONS.trash}</button>
      </div>`);
    $('#l-fav').onclick = async () => { await toggleLookFav(l.id); closeSheet(); };
    $('#l-del').onclick = () => confirmSheet('Delete this look?', 'This can\u2019t be undone. The pieces stay in your closet.',
      async () => { await ExDB.looks.delete(l.id); closeSheet(); await loadAll(); render(); toast('Deleted'); });
    $('#l-share').onclick = async () => {
      try {
        const file = new File([l.photo], 'excessorize-look.jpg', { type: 'image/jpeg' });
        const text = `${l.title} — styled by Excessorize\n` + l.picks.map((p) => `• ${p.name}: ${p.rationale}`).join('\n');
        if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text });
        else if (navigator.share) await navigator.share({ text });
        else { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
      } catch (e) { /* cancelled */ }
    };
  }

  // ================= PROFILE =================
  function renderProfile() {
    const p = state.prefs;
    const mostWorn = [...state.closet].sort((a, b) => (b.timesWorn || 0) - (a.timesWorn || 0))[0];
    const favLooks = state.looks.filter((l) => l.favorite).length;
    $('#profile-content').innerHTML = `
      <div class="stagger">
      <div class="stat-row">
        <div class="stat"><div class="n">${state.closet.length}</div><div class="l">pieces</div></div>
        <div class="stat"><div class="n">${state.looks.length}</div><div class="l">looks</div></div>
        <div class="stat"><div class="n">${favLooks}</div><div class="l">favorites</div></div>
      </div>
      ${mostWorn && mostWorn.timesWorn ? `<div class="banner info">Most worn: ${esc(mostWorn.name)} (${mostWorn.timesWorn}×)</div>` : ''}
      <div class="card">
        <div class="eyebrow">Style DNA</div>
        <h2>Your taste profile</h2>
        <p class="body">Everything the Stylist knows about you. Fully yours to edit.</p>
        <div class="field">
          <label>How much excess? <span id="p-bold-v" style="color:var(--gold)">${p.boldness <= 0.25 ? 'Subtle' : p.boldness >= 0.75 ? 'Full excess' : 'Balanced'}</span></label>
          <input type="range" id="p-bold" min="0" max="100" value="${Math.round(p.boldness * 100)}" />
          <div class="range-labels"><span>Quiet staples</span><span>Statement pieces</span></div>
        </div>
        <div class="field"><label>Metal preference</label>
          <div class="chips" id="p-metal">
            ${['none', 'gold', 'silver'].map((m) => `<button class="chip ${p.metalPreference === (m === 'none' ? null : m) ? 'on' : ''}" data-m="${m}">${m === 'none' ? 'No preference' : m[0].toUpperCase() + m.slice(1)}</button>`).join('')}
          </div>
        </div>
        <div class="field"><label>Styles that feel like you</label>
          <div class="chips" id="p-styles">
            ${STYLES.map((s) => `<button class="chip ${p.favoriteStyles.includes(s) ? 'on' : ''}" data-s="${s}">${s}</button>`).join('')}
          </div>
        </div>
        <div class="field"><label>Pieces per look</label>
          <div class="chips" id="p-max">
            ${[2, 3, 4, 5].map((n) => `<button class="chip ${p.maxPieces === n ? 'on' : ''}" data-max="${n}">${n}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="card" style="padding:8px 20px">
        <button class="option-row" id="p-settings" style="width:100%;text-align:left">
          <span style="display:flex;align-items:center;gap:12px"><span class="ico">${ICONS.gear}</span><span><span class="ol">Settings</span><div class="od">Data, privacy, starter pack, about</div></span></span>
          <span class="chev">${ICONS.chevron}</span>
        </button>
      </div>
      </div>`;
    $('#p-bold').oninput = (e) => { p.boldness = +e.target.value / 100;
      $('#p-bold-v').textContent = p.boldness <= 0.25 ? 'Subtle' : p.boldness >= 0.75 ? 'Full excess' : 'Balanced'; };
    $('#p-bold').onchange = savePrefs;
    $('#p-metal').onclick = (e) => { const m = e.target.dataset?.m; if (!m) return;
      p.metalPreference = m === 'none' ? null : m; savePrefs();
      $$('#p-metal .chip').forEach((c) => c.classList.toggle('on', c.dataset.m === m)); };
    $('#p-styles').onclick = (e) => { const s = e.target.dataset?.s; if (!s) return;
      p.favoriteStyles = p.favoriteStyles.includes(s) ? p.favoriteStyles.filter((x) => x !== s) : [...p.favoriteStyles, s];
      savePrefs(); e.target.classList.toggle('on'); };
    $('#p-max').onclick = (e) => { const n = e.target.dataset?.max; if (!n) return;
      p.maxPieces = +n; savePrefs();
      $$('#p-max .chip').forEach((c) => c.classList.toggle('on', c.dataset.max === n)); };
    $('#p-settings').onclick = settingsSheet;
  }

  function settingsSheet() {
    const demo = state.closet.filter((i) => i.demo).length;
    openSheet(`
      <h2>Settings</h2>
      <div style="margin-top:8px">
        <button class="option-row" id="set-export" style="width:100%;text-align:left">
          <span style="display:flex;align-items:center;gap:12px"><span class="ico">${ICONS.download}</span><span><span class="ol">Export my data</span><div class="od">Closet, looks & preferences as JSON — photos included</div></span></span>
          <span class="chev">${ICONS.chevron}</span>
        </button>
        <button class="option-row" id="set-import" style="width:100%;text-align:left">
          <span style="display:flex;align-items:center;gap:12px"><span class="ico">${ICONS.upload}</span><span><span class="ol">Import data</span><div class="od">Restore from an Excessorize export</div></span></span>
          <span class="chev">${ICONS.chevron}</span>
        </button>
        ${demo ? `
        <button class="option-row" id="set-demo" style="width:100%;text-align:left">
          <span style="display:flex;align-items:center;gap:12px"><span class="ico">${ICONS.sparkle}</span><span><span class="ol">Remove starter pack</span><div class="od">${demo} demo pieces in your closet</div></span></span>
          <span class="chev">${ICONS.chevron}</span>
        </button>` : `
        <button class="option-row" id="set-demo-add" style="width:100%;text-align:left">
          <span style="display:flex;align-items:center;gap:12px"><span class="ico">${ICONS.sparkle}</span><span><span class="ol">Load starter pack</span><div class="od">12 demo accessories to try the loop</div></span></span>
          <span class="chev">${ICONS.chevron}</span>
        </button>`}
        <button class="option-row" id="set-replay" style="width:100%;text-align:left">
          <span style="display:flex;align-items:center;gap:12px"><span class="ico">${ICONS.replay}</span><span><span class="ol">Replay onboarding</span><div class="od">Walk the intro again</div></span></span>
          <span class="chev">${ICONS.chevron}</span>
        </button>
        <button class="option-row" id="set-reset" style="width:100%;text-align:left">
          <span style="display:flex;align-items:center;gap:12px"><span class="ico" style="color:var(--danger);background:rgba(212,104,90,.09);border-color:rgba(212,104,90,.25)">${ICONS.reset}</span><span><span class="ol" style="color:var(--danger)">Erase everything</span><div class="od">Deletes closet, looks & preferences from this device</div></span></span>
          <span class="chev">${ICONS.chevron}</span>
        </button>
        <div class="option-row">
          <span style="display:flex;align-items:center;gap:12px"><span class="ico">${ICONS.info}</span><span><span class="ol">About</span><div class="od">Excessorize v${VERSION} · local-first: your photos never leave this device</div></span></span>
        </div>
      </div>`);
    $('#set-export').onclick = exportData;
    $('#set-import').onclick = () => $('#input-import').click();
    $('#set-demo')?.addEventListener('click', async () => {
      for (const it of state.closet.filter((i) => i.demo)) await ExDB.items.delete(it.id);
      await loadAll(); render(); closeSheet(); toast('Starter pack removed');
    });
    $('#set-demo-add')?.addEventListener('click', async () => { await loadStarterPack(); closeSheet(); toast('Starter pack loaded', true); });
    $('#set-replay').onclick = () => { closeSheet(); startOnboarding(); };
    $('#set-reset').onclick = () => confirmSheet('Erase everything?', 'Closet, looks and preferences are deleted from this device. Export first if you want a backup.',
      async () => {
        await ExDB.items.clear();
        for (const l of state.looks) await ExDB.looks.delete(l.id);
        state.prefs = { boldness: 0.5, metalPreference: null, maxPieces: 4, avoidColors: [], favoriteStyles: [] };
        await savePrefs();
        await loadAll(); render(); closeSheet(); toast('Everything erased');
      });
  }

  async function exportData() {
    toast('Preparing export…');
    const items = await Promise.all(state.closet.map(async (it) => ({ ...strip(it), photo: await blobToDataUrl(it.photo) })));
    const looks = await Promise.all(state.looks.map(async (l) => {
      const { _url, ...rest } = l;
      return { ...rest, photo: await blobToDataUrl(l.photo),
        picks: await Promise.all(l.picks.map(async (p) => ({ ...p, photo: await blobToDataUrl(p.photo) }))) };
    }));
    const payload = { app: 'excessorize', version: VERSION, exportedAt: new Date().toISOString(), items, looks, prefs: state.prefs };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `excessorize-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Export downloaded', true);
  }

  async function onImportPicked(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (payload.app !== 'excessorize' || !Array.isArray(payload.items)) throw new Error('not an Excessorize export');
      for (const it of payload.items) await ExDB.items.put({ ...it, photo: await dataUrlToBlob(it.photo) });
      for (const l of (payload.looks || [])) {
        await ExDB.looks.put({ ...l, photo: await dataUrlToBlob(l.photo),
          picks: await Promise.all((l.picks || []).map(async (p) => ({ ...p, photo: await dataUrlToBlob(p.photo) }))) });
      }
      if (payload.prefs) { state.prefs = { ...state.prefs, ...payload.prefs }; await savePrefs(); }
      await loadAll(); render(); closeSheet();
      toast(`Imported ${payload.items.length} pieces, ${(payload.looks || []).length} looks`, true);
    } catch (err) { console.error(err); toast("That file isn't an Excessorize export."); }
  }

  // ---------- render root ----------
  function render() {
    if (state.tab === 'today') renderToday();
    if (state.tab === 'closet') renderCloset();
    if (state.tab === 'style') renderStyle();
    if (state.tab === 'looks') renderLooks();
    if (state.tab === 'profile') renderProfile();
  }

  // ---------- global events ----------
  document.addEventListener('click', (e) => {
    const lovefav = e.target.closest('[data-lovefav]');
    if (lovefav) { e.preventDefault(); e.stopPropagation(); toggleLookFav(lovefav.dataset.lovefav); return; }
    const navBtn = e.target.closest('[data-nav]');
    if (navBtn) { nav(navBtn.dataset.nav); return; }
    const item = e.target.closest('[data-open-item]');
    if (item) { openItemSheet(item.dataset.openItem); return; }
    const look = e.target.closest('[data-open-look]');
    if (look) { openLookSheet(look.dataset.openLook); return; }
    const cf = e.target.closest('[data-cfilter]');
    if (cf) { state.closetFilter = cf.dataset.cfilter; renderCloset(); return; }
    const lf = e.target.closest('[data-lfilter]');
    if (lf) { state.looksFilter = lf.dataset.lfilter; renderLooks(); return; }
  });
  $('#sheet-scrim').addEventListener('click', closeSheet);
  $('#btn-add-item').addEventListener('click', startAddItem);
  $('#btn-closet-sort').addEventListener('click', closetSortSheet);
  $('#btn-looks-sort').addEventListener('click', looksSortSheet);
  $('#closet-search').addEventListener('input', (e) => { state.closetQuery = e.target.value; renderCloset(); });
  $('#looks-search').addEventListener('input', (e) => { state.looksQuery = e.target.value; renderLooks(); });
  $('#input-camera').addEventListener('change', onPhotoPicked);
  $('#input-library').addEventListener('change', onPhotoPicked);
  $('#input-import').addEventListener('change', onImportPicked);

  // tab bar icons
  $$('#tabbar button').forEach((b) => {
    const ic = { today: 'home', closet: 'closet', style: 'sparkle', looks: 'looks', profile: 'profile' }[b.dataset.nav];
    b.insertAdjacentHTML('afterbegin', ICONS[ic]);
  });

  // ---------- boot ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  loadAll().then(async () => {
    const ob = await ExDB.kv.get('onboarded');
    if (!ob) { nav('today'); startOnboarding(); }
    else nav('today');
  });
})();
