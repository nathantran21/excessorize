/* Excessorize — on-device photo analysis.
   v1 keeps the visual vocabulary small on purpose (PRD risk #2): dominant colors
   mapped to the engine's 17-family vocabulary. Everything is a DRAFT the user
   confirms — never silent ground truth. A cloud vision API can replace analyze()
   later without touching the engine. */
(function () {
  'use strict';

  // family anchor hues (degrees) — must match engine vocabulary
  const HUES = [
    ['red', 0], ['orange', 30], ['yellow', 55], ['chartreuse', 80], ['green', 120],
    ['teal', 175], ['blue', 220], ['indigo', 255], ['violet', 275], ['magenta', 310], ['pink', 340],
  ];

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      else if (mx === g) h = ((b - r) / d + 2) * 60;
      else h = ((r - g) / d + 4) * 60;
    }
    return [h, s, l];
  }

  function classify(h, s, l) {
    // neutrals first
    if (l < 0.13) return { family: 'black', tone: 'neutral' };
    if (l > 0.92 && s < 0.25) return { family: 'white', tone: 'neutral' };
    if (s < 0.12) return { family: 'grey', tone: 'neutral' };
    if (s < 0.3 && l > 0.75) return { family: 'cream', tone: 'warm' };
    // brown/tan band: low-sat warm hues
    if (h >= 15 && h <= 50 && s < 0.55) {
      return l > 0.55 ? { family: 'tan', tone: 'warm' } : { family: 'brown', tone: 'warm' };
    }
    let bestF = 'red', bestD = 999;
    for (const [f, ah] of HUES) {
      const d = Math.min(Math.abs(h - ah), 360 - Math.abs(h - ah));
      if (d < bestD) { bestD = d; bestF = f; }
    }
    const warmFams = ['red', 'orange', 'yellow', 'pink', 'magenta'];
    return { family: bestF, tone: warmFams.includes(bestF) ? 'warm' : 'cool' };
  }

  const valueOf = (l) => (l < 0.33 ? 'dark' : l > 0.66 ? 'light' : 'mid');

  /** Analyze an image element/bitmap → weighted ColorTags + confidence. */
  function analyzeColors(img, opts = {}) {
    const N = 64;
    const canvas = document.createElement('canvas');
    canvas.width = N; canvas.height = N;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, N, N);
    const data = ctx.getImageData(0, 0, N, N).data;
    const buckets = new Map();
    let counted = 0;
    for (let i = 0; i < data.length; i += 4) {
      // center-weight: skip a border ring so background matters less
      const px = (i / 4) % N, py = Math.floor(i / 4 / N);
      const border = px < N * 0.12 || px > N * 0.88 || py < N * 0.08 || py > N * 0.92;
      const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      const c = classify(h, s, l);
      const key = c.family + '|' + c.tone + '|' + valueOf(l);
      const w = border ? 0.35 : 1;
      buckets.set(key, (buckets.get(key) || 0) + w);
      counted += w;
    }
    const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
    const tags = [];
    for (const [key, n] of sorted.slice(0, 4)) {
      const [family, tone, value] = key.split('|');
      const weight = n / counted;
      if (weight < 0.06 && tags.length >= 2) break;
      tags.push({ family, tone, value, weight: Math.round(weight * 100) / 100 });
    }
    // confidence heuristic: distinct dominant color + decent light
    const top = sorted[0] ? sorted[0][1] / counted : 0;
    let confidence = Math.min(0.95, 0.45 + top * 0.9);
    if (opts.kind === 'outfit' && tags.length <= 1) confidence -= 0.15;
    return { tags, confidence: Math.round(confidence * 100) / 100 };
  }

  /** Draft a full outfit read from a photo. Formality/style are neutral drafts —
      the confirm sheet is where the user corrects them (detection-as-draft, PRD §8). */
  function draftOutfitRead(img) {
    const { tags, confidence } = analyzeColors(img, { kind: 'outfit' });
    const dark = tags.filter((t) => t.value === 'dark').reduce((s, t) => s + t.weight, 0);
    const neutral = tags.filter((t) => ['black', 'white', 'grey', 'cream', 'tan'].includes(t.family)).reduce((s, t) => s + t.weight, 0);
    // gentle priors only; user confirms
    const formality = dark > 0.5 && neutral > 0.5 ? 4 : 3;
    const styleRead = neutral > 0.6 ? { minimal: 0.5, classic: 0.5 } : { classic: 0.5, street: 0.25, romantic: 0.25 };
    const m = new Date().getMonth() + 1;
    const season = m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
    return { garments: [], colors: tags, formality, styleRead, neckline: null, occasion: 'everyday', season, confidence };
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = reject;
      img.src = url;
    });
  }

  /** Downscale + JPEG a photo for storage (IndexedDB stays light). */
  async function thumbnail(img, max = 900, quality = 0.82) {
    const scale = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const w = Math.round((img.naturalWidth || img.width) * scale);
    const h = Math.round((img.naturalHeight || img.height) * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    return new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  }

  window.ExVision = { analyzeColors, draftOutfitRead, loadImageFromFile, thumbnail };
})();
