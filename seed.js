/* Excessorize — Starter Pack (cold-start plan step 1, ENGINE.md §3).
   12 archetypal accessories so the core loop is demo-able in 30 seconds.
   Badged as demo items; one tap to clear. */
(function () {
  'use strict';

  // Minimal cutout-style SVG thumbnails on the warm backdrop (design rule:
  // dimensional feel, consistent warm background, no clutter).
  function thumb(category, hex, hex2) {
    const shapes = {
      necklace: `<path d="M35 40 Q80 105 125 40" fill="none" stroke="${hex}" stroke-width="7" stroke-linecap="round"/><circle cx="80" cy="96" r="12" fill="${hex2 || hex}"/>`,
      earrings: `<circle cx="55" cy="60" r="6" fill="${hex}"/><circle cx="105" cy="60" r="6" fill="${hex}"/><path d="M55 66 q-12 22 0 34 q14 12 14-8" fill="none" stroke="${hex}" stroke-width="6" stroke-linecap="round"/><path d="M105 66 q-12 22 0 34 q14 12 14-8" fill="none" stroke="${hex}" stroke-width="6" stroke-linecap="round"/>`,
      bracelet: `<ellipse cx="80" cy="80" rx="38" ry="30" fill="none" stroke="${hex}" stroke-width="9"/>`,
      ring: `<circle cx="80" cy="88" r="24" fill="none" stroke="${hex}" stroke-width="8"/><circle cx="80" cy="56" r="10" fill="${hex2 || hex}"/>`,
      watch: `<rect x="68" y="20" width="24" height="120" rx="10" fill="${hex2 || '#8a8580'}"/><circle cx="80" cy="80" r="26" fill="${hex}"/><circle cx="80" cy="80" r="20" fill="#F7F3EC"/><path d="M80 80 L80 68 M80 80 L89 84" stroke="#2A2722" stroke-width="3" stroke-linecap="round"/>`,
      bag: `<path d="M42 66 h76 l-7 60 q-1 10 -11 10 h-40 q-10 0 -11 -10 z" fill="${hex}"/><path d="M62 66 q0-26 18-26 q18 0 18 26" fill="none" stroke="${hex2 || hex}" stroke-width="7"/>`,
      belt: `<rect x="20" y="70" width="120" height="22" rx="8" fill="${hex}"/><rect x="70" y="62" width="26" height="38" rx="6" fill="none" stroke="${hex2 || '#c9a35c'}" stroke-width="6"/>`,
      scarf: `<path d="M50 30 q34 12 60 0 q8 44 -18 66 l-6 40 -14 -4 4 -34 q-34 -22 -26 -68z" fill="${hex}"/><path d="M76 132 l-4 34 -12 -2 4 -32z" fill="${hex2 || hex}" opacity=".8"/>`,
      hat: `<ellipse cx="80" cy="98" rx="56" ry="14" fill="${hex}"/><path d="M48 96 q0 -48 32 -48 q32 0 32 48" fill="${hex2 || hex}"/>`,
      glasses: `<circle cx="52" cy="82" r="22" fill="none" stroke="${hex}" stroke-width="7"/><circle cx="108" cy="82" r="22" fill="none" stroke="${hex}" stroke-width="7"/><path d="M74 82 q6 -8 12 0" fill="none" stroke="${hex}" stroke-width="6"/>`,
    };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><radialGradient id="g" cx="50%" cy="38%" r="80%"><stop offset="0%" stop-color="#F1E7D8"/><stop offset="100%" stop-color="#E4D6C2"/></radialGradient></defs><rect width="160" height="160" fill="url(#g)"/><ellipse cx="80" cy="138" rx="44" ry="8" fill="#000" opacity=".08"/>${shapes[category] || ''}</svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  const GOLD = '#C9A35C', SILVER = '#B9BDC4', ALL = ['spring', 'summer', 'autumn', 'winter'];

  window.ExSeed = {
    thumb,
    starterPack: [
      { name: 'Thin gold chain', category: 'necklace', colors: [{ family: 'tan', tone: 'warm', value: 'light', weight: 1 }], metal: 'gold', formality: 3, statement: 1, styles: ['minimal', 'classic'], seasons: ALL, hex: GOLD },
      { name: 'Sculptural collar', category: 'necklace', colors: [{ family: 'tan', tone: 'warm', value: 'mid', weight: 1 }], metal: 'gold', formality: 4, statement: 5, styles: ['glam', 'edgy'], seasons: ALL, hex: GOLD, hex2: '#B0812F' },
      { name: 'Gold hoops', category: 'earrings', colors: [{ family: 'tan', tone: 'warm', value: 'light', weight: 1 }], metal: 'gold', formality: 3, statement: 2, styles: ['classic', 'glam'], seasons: ALL, hex: GOLD },
      { name: 'Silver studs', category: 'earrings', colors: [{ family: 'grey', tone: 'cool', value: 'light', weight: 1 }], metal: 'silver', formality: 3, statement: 1, styles: ['minimal'], seasons: ALL, hex: SILVER },
      { name: 'Cuff bracelet', category: 'bracelet', colors: [{ family: 'grey', tone: 'cool', value: 'mid', weight: 1 }], metal: 'silver', formality: 3, statement: 3, styles: ['edgy', 'minimal'], seasons: ALL, hex: SILVER },
      { name: 'Signet ring', category: 'ring', colors: [{ family: 'tan', tone: 'warm', value: 'mid', weight: 1 }], metal: 'gold', formality: 3, statement: 2, styles: ['classic'], seasons: ALL, hex: GOLD, hex2: '#8C6B2F' },
      { name: 'Leather-strap watch', category: 'watch', colors: [{ family: 'brown', tone: 'warm', value: 'dark', weight: 1 }], metal: 'gold', formality: 4, statement: 2, styles: ['classic'], seasons: ALL, hex: GOLD, hex2: '#6B4A2F' },
      { name: 'Tan leather tote', category: 'bag', colors: [{ family: 'tan', tone: 'warm', value: 'mid', weight: 1 }], metal: 'none', formality: 3, statement: 2, styles: ['classic'], seasons: ALL, hex: '#C8925C', hex2: '#A9713D' },
      { name: 'Black crossbody', category: 'bag', colors: [{ family: 'black', tone: 'neutral', value: 'dark', weight: 1 }], metal: 'silver', formality: 4, statement: 1, styles: ['minimal', 'street'], seasons: ALL, hex: '#33302C', hex2: '#211F1C' },
      { name: 'Black leather belt', category: 'belt', colors: [{ family: 'black', tone: 'neutral', value: 'dark', weight: 1 }], metal: 'silver', formality: 3, statement: 1, styles: ['classic', 'minimal'], seasons: ALL, hex: '#33302C' },
      { name: 'Teal silk scarf', category: 'scarf', colors: [{ family: 'teal', tone: 'cool', value: 'mid', weight: 1 }], metal: 'none', formality: 4, statement: 3, styles: ['romantic', 'classic'], seasons: ['autumn', 'winter', 'spring'], hex: '#3E8E8B', hex2: '#2F6E6C' },
      { name: 'Tortoise sunglasses', category: 'glasses', colors: [{ family: 'brown', tone: 'warm', value: 'dark', weight: 1 }], metal: 'none', formality: 2, statement: 2, styles: ['street', 'classic'], seasons: ['spring', 'summer'], hex: '#6B4A2F' },
    ].map((x) => ({
      ...x,
      photo: thumb(x.category, x.hex, x.hex2),
      demo: true,
      timesWorn: 0,
      lastWornDaysAgo: null,
      favorite: false,
      price: null,
    })),
  };
})();
