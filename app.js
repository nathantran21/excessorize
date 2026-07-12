/* Excessorize — PWA app shell. Vanilla JS, no build step.
   Flows follow the PRD: Build closet → Style an outfit → Save look.
   Detection is always a draft the user confirms. */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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

  const state = {
    tab: 'today',
    closet: [],
    looks: [],
    prefs: { boldness: 0.5, metalPreference: null, maxPieces: 4, avoidColors: [] },
    filter: 'all',
    style: { phase: 'idle', photoBlob: null, photoUrl: null, outfit: null, result: null },
    photoCb: null,
    objectUrls: [],
  };

  // ---------- utils ----------
  function toast(msg) {
    $$('.toast').forEach((t) => t.remove());
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }
  function blobUrl(blob) {
    const u = URL.createObjectURL(blob);
    state.objectUrls.push(u);
    return u;
  }
  function photoSrc(item) {
    if (!item.photo) return '';
    if (typeof item.photo === 'string') return item.photo;
    if (!item._url) item._url = blobUrl(item.photo);
    return item._url;
  }
  function daysAgo(ts) { return ts ? Math.floor((Date.now() - ts) / 86400000) : null; }
  function engineItem(it) {
    return { ...it, lastWornDaysAgo: daysAgo(it.lastWornAt), styles: it.styles || [], seasons: it.seasons || [] };
  }

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
  function openSheet(html) {
    $('#sheet-body').innerHTML = html;
    $('#sheet-wrap').classList.add('open');
  }
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
      const { img, url } = await ExVision.loadImageFromFile(file);
      const cb = state.photoCb; state.photoCb = null;
      cb(img, file, url);
    } catch (err) {
      console.error(err);
      toast("Couldn't read that photo. Try another.");
    }
  }

  // ================= TODAY =================
  function renderToday() {
    $('#today-date').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const items = state.closet.length, looks = state.looks.length;
    const demo = state.closet.filter((i) => i.demo).length;
    const latest = state.looks[0];
    const b = state.prefs.boldness;
    $('#today-content').innerHTML = `
      <div class="stat-row">
        <div class="stat"><div class="n">${items}</div><div class="l">pieces in your closet</div></div>
        <div class="stat"><div class="n">${looks}</div><div class="l">saved looks</div></div>
      </div>
      ${latest ? `
      <div class="section-head"><h2>Latest look</h2><button data-nav="looks">See all</button></div>
      <button class="look-card" data-open-look="${latest.id}">
        <img class="hero" src="${photoSrc(latest)}" alt="Latest look" />
        <div class="pad">
          <div class="eyebrow">${new Date(latest.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${latest.picks.length} pieces</div>
          <h2>${esc(latest.title)}</h2>
        </div>
      </button>` : `
      <div class="card">
        <div class="eyebrow">The core loop</div>
        <h2>Style your first outfit</h2>
        <p class="body">Snap what you're wearing and Excessorize picks the accessories from your own closet, with the why behind every pairing.</p>
        <div class="chips"><button class="btn primary" data-nav="style">Open the Stylist</button></div>
      </div>`}
      <div class="section-head"><h2>Style DNA</h2></div>
      <div class="card" style="margin-top:10px">
        <div class="field" style="margin-top:0">
          <label>How much excess? <span id="bold-val" style="color:var(--accent)">${b <= 0.25 ? 'Subtle' : b >= 0.75 ? 'Full excess' : 'Balanced'}</span></label>
          <input type="range" id="pref-bold" min="0" max="100" value="${Math.round(b * 100)}" />
          <div class="range-labels"><span>Quiet staples</span><span>Statement pieces</span></div>
        </div>
        <div class="field">
          <label>Metal preference</label>
          <div class="chips" id="pref-metal">
            ${['none', 'gold', 'silver'].map((m) => `<button class="chip ${state.prefs.metalPreference === (m === 'none' ? null : m) ? 'on' : ''}" data-metal="${m}">${m === 'none' ? 'No preference' : m[0].toUpperCase() + m.slice(1)}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label>Pieces per look</label>
          <div class="chips" id="pref-max">
            ${[2, 3, 4, 5].map((n) => `<button class="chip ${state.prefs.maxPieces === n ? 'on' : ''}" data-max="${n}">${n}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="section-head"><h2>Starter pack</h2></div>
      <div class="card" style="margin-top:10px">
        <p class="body" style="margin-top:0">${demo ? `${demo} demo pieces are in your closet so you can try the loop before cataloging your own.` : 'Load 12 demo accessories to try the whole loop in 30 seconds. Clearly badged, one tap to remove.'}</p>
        <div class="chips">
          ${demo ? `<button class="btn ghost danger" id="btn-clear-demo">Remove demo pieces</button>`
               : `<button class="btn ghost" id="btn-load-demo">Load starter pack</button>`}
        </div>
      </div>`;

    $('#pref-bold')?.addEventListener('input', (e) => {
      state.prefs.boldness = +e.target.value / 100;
      $('#bold-val').textContent = state.prefs.boldness <= 0.25 ? 'Subtle' : state.prefs.boldness >= 0.75 ? 'Full excess' : 'Balanced';
    });
    $('#pref-bold')?.addEventListener('change', savePrefs);
    $('#pref-metal')?.addEventListener('click', (e) => {
      const m = e.target.dataset?.metal; if (!m) return;
      state.prefs.metalPreference = m === 'none' ? null : m;
      savePrefs(); renderToday();
    });
    $('#pref-max')?.addEventListener('click', (e) => {
      const n = e.target.dataset?.max; if (!n) return;
      state.prefs.maxPieces = +n; savePrefs(); renderToday();
    });
    $('#btn-load-demo')?.addEventListener('click', async () => {
      for (const raw of ExSeed.starterPack) {
        const { hex, hex2, ...it } = raw;
        await ExDB.items.put({ ...it, id: ExDB.uid(), addedAt: Date.now(), lastWornAt: null });
      }
      await loadAll(); render(); toast('Starter pack loaded');
    });
    $('#btn-clear-demo')?.addEventListener('click', async () => {
      for (const it of state.closet.filter((i) => i.demo)) await ExDB.items.delete(it.id);
      await loadAll(); render(); toast('Demo pieces removed');
    });
  }

  // ================= CLOSET =================
  function renderCloset() {
    const cats = ['all', ...CATEGORIES.filter((c) => state.closet.some((i) => i.category === c))];
    $('#closet-count').textContent = `${state.closet.length} ${state.closet.length === 1 ? 'piece' : 'pieces'}`;
    $('#closet-filters').innerHTML = cats.map((c) =>
      `<button class="chip ${state.filter === c ? 'on' : ''}" data-filter="${c}">${c === 'all' ? 'All' : c[0].toUpperCase() + c.slice(1)}</button>`).join('');
    const items = state.closet.filter((i) => state.filter === 'all' || i.category === state.filter)
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    $('#closet-content').innerHTML = items.length ? `<div class="grid">${items.map((it) => `
      <button class="tile" data-open-item="${it.id}">
        ${it.demo ? '<span class="badge demo">Demo</span>' : (ExEngine.tierOf(it) === 'excess' ? '<span class="badge tier-excess">Excess</span>' : '')}
        ${it.favorite ? '<span class="fav">★</span>' : ''}
        <img src="${photoSrc(it)}" alt="${esc(it.name)}" loading="lazy" />
        <div class="meta"><div class="name">${esc(it.name)}</div><div class="sub">${esc(it.category)} · dress ${it.formality}/5</div></div>
      </button>`).join('')}</div>`
      : `<div class="empty"><div class="art">✦</div><h3>Nothing here yet</h3>
         <p>Photograph a piece you own and Excessorize tags it for you. Or load the starter pack from Today.</p>
         <button class="btn primary" id="btn-empty-add">+ Add your first piece</button></div>`;
    $('#btn-empty-add')?.addEventListener('click', startAddItem);
  }

  function startAddItem() {
    openSheet(`
      <h2>Add a piece</h2>
      <p class="body" style="color:var(--sec);font-size:14px;margin-top:6px">Photograph it on a plain surface in decent light — tags come pre-filled, you just confirm.</p>
      <div class="row">
        <button class="btn primary" id="sheet-cam">Take photo</button>
        <button class="btn ghost" id="sheet-lib">Choose from library</button>
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
      ${isNew && draft.confidence < 0.6 ? `<div class="banner">⚠ Low-light read — double-check the colors below.</div>` : ''}
      <div class="photo-frame" style="max-height:200px"><img src="${url}" style="max-height:200px" alt="" /></div>
      <div class="field"><label>Name</label><input type="text" id="f-name" value="${esc(draft.name)}" placeholder="e.g. Gold hoops" /></div>
      <div class="field"><label>Category</label><select id="f-cat">${CATEGORIES.map((c) => `<option ${draft.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label>Detected colors — tap to remove</label>
        <div class="swatches" id="f-colors">${draft.colors.map((c, i) => `<button class="swatch" data-ci="${i}"><i style="background:${SWATCH_HEX[c.family] || '#999'}"></i>${c.family}</button>`).join('') || '<span style="color:var(--sec);font-size:13px">none — that\u2019s ok</span>'}</div>
      </div>
      <div class="field"><label>Metal</label><div class="chips" id="f-metal">${METALS.map((m) => `<button class="chip ${draft.metal === m ? 'on' : ''}" data-m="${m}">${m === 'roseGold' ? 'Rose gold' : m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div></div>
      <div class="field"><label>Dress level: <span id="f-form-v">${draft.formality}</span>/5</label><input type="range" id="f-form" min="1" max="5" value="${draft.formality}" /><div class="range-labels"><span>Beach</span><span>Black tie</span></div></div>
      <div class="field"><label>Statement: <span id="f-stmt-v">${draft.statement}</span>/5 · tier <b id="f-tier">${ExEngine.tierOf(draft)}</b></label><input type="range" id="f-stmt" min="1" max="5" value="${draft.statement}" /><div class="range-labels"><span>Quiet staple</span><span>Full excess</span></div></div>
      <div class="field"><label>Styles</label><div class="chips" id="f-styles">${STYLES.map((s) => `<button class="chip ${draft.styles.includes(s) ? 'on' : ''}" data-s="${s}">${s}</button>`).join('')}</div></div>
      <div class="row">
        ${isNew ? '' : `<button class="btn ghost danger" id="f-delete">Delete</button>`}
        <button class="btn primary" id="f-save">${isNew ? 'Add to closet' : 'Save'}</button>
      </div>`);

    $('#f-colors').onclick = (e) => {
      const b = e.target.closest('[data-ci]'); if (!b) return;
      draft.colors.splice(+b.dataset.ci, 1);
      b.remove();
      $$('#f-colors [data-ci]').forEach((el, i) => (el.dataset.ci = i));
    };
    $('#f-metal').onclick = (e) => {
      const m = e.target.dataset?.m; if (!m) return;
      draft.metal = m;
      $$('#f-metal .chip').forEach((c) => c.classList.toggle('on', c.dataset.m === m));
    };
    $('#f-form').oninput = (e) => { draft.formality = +e.target.value; $('#f-form-v').textContent = draft.formality; };
    $('#f-stmt').oninput = (e) => { draft.statement = +e.target.value; $('#f-stmt-v').textContent = draft.statement; $('#f-tier').textContent = ExEngine.tierOf(draft); };
    $('#f-styles').onclick = (e) => {
      const s = e.target.dataset?.s; if (!s) return;
      draft.styles = draft.styles.includes(s) ? draft.styles.filter((x) => x !== s) : [...draft.styles, s];
      e.target.classList.toggle('on');
    };
    $('#f-delete')?.addEventListener('click', async () => {
      await ExDB.items.delete(draft.id);
      closeSheet(); await loadAll(); render(); toast('Deleted');
    });
    $('#f-save').onclick = async () => {
      draft.name = $('#f-name').value.trim() || (draft.category[0].toUpperCase() + draft.category.slice(1));
      draft.category = $('#f-cat').value;
      const { confidence, _url, ...rec } = draft;
      if (isNew) { rec.id = ExDB.uid(); rec.addedAt = Date.now(); rec.timesWorn = 0; rec.lastWornAt = null; rec.demo = false; }
      await ExDB.items.put(rec);
      closeSheet(); await loadAll(); render();
      toast(isNew ? 'Added to your closet' : 'Saved');
    };
  }

  function openItemSheet(id) {
    const it = state.closet.find((x) => x.id === id); if (!it) return;
    const worn = it.lastWornAt ? `Last worn ${daysAgo(it.lastWornAt)}d ago` : 'Never worn — bonus points in ranking';
    openSheet(`
      <h2>${esc(it.name)}</h2>
      <p class="body" style="color:var(--sec);font-size:14px;margin-top:4px;text-transform:capitalize">${esc(it.category)} · dress ${it.formality}/5 · ${ExEngine.tierOf(it)} tier · ${worn}</p>
      <div class="photo-frame" style="max-height:240px"><img src="${photoSrc(it)}" style="max-height:240px" alt="" /></div>
      <div class="row">
        <button class="btn ghost" id="i-fav">${it.favorite ? '★ Favorited' : '☆ Favorite'}</button>
        <button class="btn ghost" id="i-worn">Worn today</button>
        <button class="btn primary" id="i-edit">Edit tags</button>
      </div>`);
    $('#i-fav').onclick = async () => { it.favorite = !it.favorite; await ExDB.items.put(strip(it)); await loadAll(); render(); closeSheet(); };
    $('#i-worn').onclick = async () => { it.lastWornAt = Date.now(); it.timesWorn = (it.timesWorn || 0) + 1; await ExDB.items.put(strip(it)); await loadAll(); render(); closeSheet(); toast('Marked worn'); };
    $('#i-edit').onclick = () => itemConfirmSheet({ ...it, styles: [...(it.styles || [])], colors: [...(it.colors || [])] }, false);
  }
  const strip = (it) => { const { _url, ...r } = it; return r; };

  // ================= STYLIST =================
  function renderStyle() {
    const s = state.style;
    const el = $('#style-content');
    if (s.phase === 'idle') {
      el.innerHTML = `
        ${state.closet.length === 0 ? `<div class="banner">Your closet is empty — recommendations come only from pieces you own. Add pieces or load the starter pack first.</div>` : ''}
        <div class="card">
          <div class="eyebrow">Step 1</div>
          <h2>Capture your outfit</h2>
          <p class="body">Full-length in the mirror works best. Excessorize reads the colors and drafts a style read — you confirm before anything is styled.</p>
          <div class="row" style="display:flex;gap:10px;margin-top:14px">
            <button class="btn primary" style="flex:1" id="s-cam">📷 Camera</button>
            <button class="btn ghost" style="flex:1" id="s-lib">Library</button>
          </div>
        </div>
        <div class="card">
          <div class="eyebrow">Occasion</div>
          <div class="chips" id="s-occ">
            ${OCCASIONS.map((o) => `<button class="chip ${(s.occasion || 'everyday') === o ? 'on' : ''}" data-o="${o}">${OCC_LABEL[o]}</button>`).join('')}
          </div>
        </div>`;
      $('#s-cam').onclick = () => requestPhoto('camera', onOutfitPhoto);
      $('#s-lib').onclick = () => requestPhoto('library', onOutfitPhoto);
      $('#s-occ').onclick = (e) => {
        const o = e.target.dataset?.o; if (!o) return;
        s.occasion = o;
        $$('#s-occ .chip').forEach((c) => c.classList.toggle('on', c.dataset.o === o));
      };
      return;
    }
    if (s.phase === 'analyzing') {
      el.innerHTML = `
        <div class="photo-frame"><img src="${s.photoUrl}" alt="Your outfit" /><span class="overlay-label">Reading this outfit…</span></div>
        <div class="shimmer" style="height:66px;margin-top:14px"></div>
        <div class="shimmer" style="height:66px;margin-top:10px"></div>`;
      return;
    }
    if (s.phase === 'confirm') {
      const o = s.outfit;
      el.innerHTML = `
        <div class="photo-frame"><img src="${s.photoUrl}" alt="Your outfit" /><span class="overlay-label">Outfit</span></div>
        ${o.confidence < 0.6 ? `<div class="banner">⚠ I'm not fully sure about this read — please correct anything that looks off.</div>`
                             : `<div class="banner info">Draft read — confirm or adjust, then style it.</div>`}
        <div class="card">
          <div class="eyebrow">Detected colors</div>
          <div class="swatches">${o.colors.map((c) => `<span class="swatch"><i style="background:${SWATCH_HEX[c.family] || '#999'}"></i>${c.family} ${Math.round((c.weight || 0) * 100)}%</span>`).join('') || '<span style="color:var(--sec)">none detected</span>'}</div>
          <div class="field"><label>Dress level: <span id="o-form-v">${o.formality}</span>/5</label>
            <input type="range" id="o-form" min="1" max="5" value="${o.formality}" />
            <div class="range-labels"><span>Beach</span><span>Black tie</span></div></div>
          <div class="field"><label>Occasion</label>
            <div class="chips" id="o-occ">${OCCASIONS.map((x) => `<button class="chip ${o.occasion === x ? 'on' : ''}" data-o="${x}">${OCC_LABEL[x]}</button>`).join('')}</div></div>
          <div class="field"><label>Neckline (helps pick necklace vs earrings)</label>
            <div class="chips" id="o-neck">${['vneck', 'scoop', 'crew', 'high', 'collared', 'strapless'].map((n) => `<button class="chip ${o.neckline === n ? 'on' : ''}" data-n="${n}">${n === 'vneck' ? 'V-neck' : n[0].toUpperCase() + n.slice(1)}</button>`).join('')}</div></div>
          <div class="row"><button class="btn ghost" id="o-retake">Retake</button><button class="btn primary" id="o-style">Style it ✦</button></div>
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
        <div class="photo-frame"><img src="${s.photoUrl}" alt="Your outfit" /><span class="overlay-label">Outfit</span></div>
        ${r.askToConfirmOutfit ? `<div class="banner">⚠ Styled from an uncertain read — picks favor safe bets.</div>` : ''}
        ${relaxedNote}
        ${r.picks.length ? `
        <div class="card">
          <div class="eyebrow">Styled from your closet</div>
          <h2>${r.picks.length} ${r.picks.length === 1 ? 'piece' : 'pieces'}, one story</h2>
          <div style="margin-top:8px">
          ${r.picks.map((p) => `
            <div class="rec">
              <img src="${photoSrc(p.item)}" alt="" />
              <div class="info">
                <div class="name">${esc(p.item.name)}</div>
                <div class="why-line">${esc(p.rationale)}</div>
                <span class="tier-tag ${p.tier}">${p.tier}</span>
              </div>
              ${r.alternates.some((a) => a.item.category === p.item.category) ? `<button class="btn small ghost swap" data-swap="${p.item.id}">Swap</button>` : ''}
            </div>`).join('')}
          </div>
          <div class="row"><button class="btn ghost" id="r-again">Restyle</button><button class="btn primary" id="r-save">Save this look</button></div>
        </div>` : `
        <div class="empty"><div class="art">◌</div><h3>No confident pairing</h3>
          <p>${r.emptyReason === 'emptyCloset' ? 'Your closet is empty — add pieces first.' : 'Everything I could pick clashed with this outfit or your rules. Try loosening the occasion, or add pieces in the missing categories.'}</p>
          <button class="btn primary" id="r-reset">Start over</button></div>`}`;
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
    renderStyle();
    // keep the shimmer honest but short — analysis is local
    setTimeout(() => {
      const outfit = ExVision.draftOutfitRead(img);
      outfit.occasion = s.occasion || 'everyday';
      if (outfit.confidence < 0.6) {
        // ambiguous: register an alternate, dressier read → engine goes maximin
        outfit.altRead = { formality: Math.min(5, outfit.formality + 2), styleRead: { glam: 0.6, classic: 0.4 } };
      }
      s.outfit = outfit;
      s.phase = 'confirm';
      renderStyle();
    }, 700);
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
    r.alternates[altIdx] = old; // allow swapping back
    renderStyle();
    toast('Swapped');
  }

  async function saveLook() {
    const s = state.style, r = s.result;
    const titles = { anchor: 'Quiet Anchor', elevate: 'Easy Lift', excess: 'Full Excess' };
    const topTier = r.picks.some((p) => p.tier === 'excess') ? 'excess' : r.picks.some((p) => p.tier === 'elevate') ? 'elevate' : 'anchor';
    const look = {
      id: ExDB.uid(),
      createdAt: Date.now(),
      title: titles[topTier],
      photo: s.photoBlob,
      outfit: { ...s.outfit },
      picks: r.picks.map((p) => ({
        itemId: p.item.id, name: p.item.name, category: p.item.category,
        tier: p.tier, rationale: p.rationale, score: p.score,
        photo: typeof p.item.photo === 'string' ? p.item.photo : p.item.photo,
      })),
      relaxed: r.relaxed,
    };
    await ExDB.looks.put(look);
    // rotation signal: picks count as worn
    for (const p of r.picks) {
      const it = state.closet.find((x) => x.id === p.item.id);
      if (it) { it.lastWornAt = Date.now(); it.timesWorn = (it.timesWorn || 0) + 1; await ExDB.items.put(strip(it)); }
    }
    await loadAll();
    resetStyle();
    nav('looks');
    toast('Look saved ✦');
  }

  function resetStyle() {
    state.style = { phase: 'idle', photoBlob: null, photoUrl: null, outfit: null, result: null, occasion: state.style.occasion };
    renderStyle();
  }

  // ================= LOOKS =================
  function renderLooks() {
    $('#looks-count').textContent = `${state.looks.length} saved ${state.looks.length === 1 ? 'look' : 'looks'}`;
    $('#looks-content').innerHTML = state.looks.length ? state.looks.map((l) => `
      <button class="look-card" data-open-look="${l.id}">
        <img class="hero" src="${photoSrc(l)}" alt="${esc(l.title)}" loading="lazy" />
        <div class="pad">
          <div class="eyebrow">${new Date(l.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${l.picks.length} pieces</div>
          <h2>${esc(l.title)}</h2>
          <div class="pieces">${l.picks.map((p) => `<img src="${pieceSrc(p)}" alt="" />`).join('')}</div>
        </div>
      </button>`).join('')
      : `<div class="empty"><div class="art">✧</div><h3>No looks yet</h3><p>Style an outfit and save it — your lookbook becomes the record of what works on you.</p><button class="btn primary" data-nav="style">Open the Stylist</button></div>`;
  }
  function pieceSrc(p) {
    if (typeof p.photo === 'string') return p.photo;
    if (p.photo instanceof Blob) { if (!p._url) p._url = blobUrl(p.photo); return p._url; }
    return '';
  }

  function openLookSheet(id) {
    const l = state.looks.find((x) => x.id === id); if (!l) return;
    openSheet(`
      <h2>${esc(l.title)}</h2>
      <p class="body" style="color:var(--sec);font-size:14px;margin-top:4px">${new Date(l.createdAt).toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
      <div class="photo-frame" style="max-height:300px"><img src="${photoSrc(l)}" style="max-height:300px" alt="" /></div>
      <div style="margin-top:10px">
        ${l.picks.map((p) => `
          <div class="rec">
            <img src="${pieceSrc(p)}" alt="" />
            <div class="info"><div class="name">${esc(p.name)}</div><div class="why-line">${esc(p.rationale)}</div><span class="tier-tag ${p.tier}">${p.tier}</span></div>
          </div>`).join('')}
      </div>
      <div class="row">
        <button class="btn ghost danger" id="l-del">Delete</button>
        <button class="btn primary" id="l-share">Share</button>
      </div>`);
    $('#l-del').onclick = async () => { await ExDB.looks.delete(l.id); closeSheet(); await loadAll(); render(); toast('Deleted'); };
    $('#l-share').onclick = async () => {
      try {
        const file = new File([l.photo], 'excessorize-look.jpg', { type: 'image/jpeg' });
        const text = `${l.title} — styled by Excessorize\n` + l.picks.map((p) => `• ${p.name}: ${p.rationale}`).join('\n');
        if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text });
        else if (navigator.share) await navigator.share({ text });
        else { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
      } catch (e) { /* user cancelled */ }
    };
  }

  // ---------- render root ----------
  function render() {
    if (state.tab === 'today') renderToday();
    if (state.tab === 'closet') renderCloset();
    if (state.tab === 'style') renderStyle();
    if (state.tab === 'looks') renderLooks();
  }

  // ---------- global events ----------
  document.addEventListener('click', (e) => {
    const navBtn = e.target.closest('[data-nav]');
    if (navBtn) { nav(navBtn.dataset.nav); return; }
    const item = e.target.closest('[data-open-item]');
    if (item) { openItemSheet(item.dataset.openItem); return; }
    const look = e.target.closest('[data-open-look]');
    if (look) { openLookSheet(look.dataset.openLook); return; }
    const filter = e.target.closest('[data-filter]');
    if (filter) { state.filter = filter.dataset.filter; renderCloset(); return; }
  });
  $('#sheet-scrim').addEventListener('click', closeSheet);
  $('#btn-add-item').addEventListener('click', startAddItem);
  $('#input-camera').addEventListener('change', onPhotoPicked);
  $('#input-library').addEventListener('change', onPhotoPicked);

  // ---------- boot ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  loadAll().then(() => nav('today'));
})();
