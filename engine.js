/* Excessorize recommendation engine — JS port of Sources/ExcessorizeEngine/ExcessorizeEngine.swift.
   Keep in sync with the Swift reference. See ENGINE.md for the math. */
(function () {
  'use strict';

  const NEUTRALS = new Set(['black', 'white', 'grey', 'cream', 'tan']);
  const HUE = { red: 0, orange: 1, yellow: 2, chartreuse: 3, green: 4, teal: 5, blue: 6, indigo: 7, violet: 8, magenta: 9, pink: 10, brown: 1 };
  const ARCHETYPES = ['minimal', 'classic', 'romantic', 'boho', 'street', 'glam', 'sporty', 'edgy'];

  const W = { color: 0.30, formality: 0.20, metal: 0.15, style: 0.15, category: 0.10, personal: 0.10 };
  const MMR_LAMBDA = 0.5;
  const MIN_SHOW = 0.42;

  const tierOf = (a) => (a.statement >= 4 ? 'excess' : a.statement === 3 ? 'elevate' : 'anchor');
  const statementBudget = (prefs) => 4 + Math.round((prefs.boldness ?? 0.5) * 6);

  function defaults(prefs = {}) {
    return {
      boldness: prefs.boldness ?? 0.5,
      metalPreference: prefs.metalPreference ?? null,
      avoidColors: new Set(prefs.avoidColors || []),
      favoriteStyles: new Set(prefs.favoriteStyles || []),
      maxPieces: Math.max(1, prefs.maxPieces ?? 4),
    };
  }

  function passesHardRules(a, outfit, prefs, maxGap, useSeason, useOccasion) {
    if ((a.colors || []).some((c) => prefs.avoidColors.has(c.family))) return false;
    if (Math.abs(a.formality - outfit.formality) > maxGap) return false;
    const seasons = a.seasons || [];
    if (useSeason && outfit.season && seasons.length && !seasons.includes(outfit.season)) return false;
    if (useOccasion && outfit.occasion) {
      if (outfit.occasion === 'gym' && a.statement >= 4) return false;
      if (outfit.occasion === 'gym' && !['watch', 'bag', 'hat', 'glasses', 'bracelet'].includes(a.category)) return false;
      if (outfit.occasion === 'formal' && (a.styles || []).length === 1 && a.styles[0] === 'sporty') return false;
    }
    return true;
  }

  function slotEligible(a, picked) {
    const sameCat = picked.filter((p) => p.category === a.category);
    if (a.category === 'necklace') {
      if (!sameCat.length) return true;
      return sameCat.length === 1 && a.statement <= 2 && sameCat[0].statement <= 2;
    }
    if (a.category === 'watch' || a.category === 'bracelet') {
      const wrist = picked.filter((p) => p.category === 'watch' || p.category === 'bracelet');
      if (a.category === 'watch' && picked.some((p) => p.category === 'watch')) return false;
      return wrist.length < 2;
    }
    return sameCat.length === 0;
  }

  function colorHarmony(accColors, outfitColors) {
    if (!accColors?.length || !outfitColors?.length) return 0.5;
    let best = 0;
    const totalW = outfitColors.reduce((s, c) => s + (c.weight ?? 1), 0);
    for (const oc of outfitColors) {
      for (const ac of accColors) {
        let pair;
        if (NEUTRALS.has(oc.family) || NEUTRALS.has(ac.family)) pair = 0.7;
        else if (oc.family === ac.family) pair = 0.85;
        else if (HUE[oc.family] != null && HUE[ac.family] != null) {
          const d = Math.min(Math.abs(HUE[oc.family] - HUE[ac.family]), 12 - Math.abs(HUE[oc.family] - HUE[ac.family]));
          pair = d === 1 ? 0.8 : d === 6 ? 0.9 : d === 4 ? 0.75 : 0.35;
        } else pair = 0.5;
        if (ac.tone && ac.tone !== 'neutral' && ac.tone === oc.tone) pair = Math.min(1, pair + 0.1);
        const dom = totalW > 0 ? (oc.weight ?? 1) / totalW : 1;
        best = Math.max(best, pair * (0.6 + 0.4 * dom));
      }
    }
    return best;
  }

  function metalConsistency(metal, set, pref) {
    if (!metal || metal === 'none') return 1.0;
    const setMetals = [...new Set(set.map((s) => s.metal).filter((m) => m && m !== 'none' && m !== 'mixed'))];
    const anchor = setMetals.length === 1 ? setMetals[0] : (set.length === 0 ? pref : null);
    if (metal === 'mixed') return 0.6;
    if (!anchor) return setMetals.length === 0 ? 0.9 : 0.4;
    if (anchor === 'mixed') return 0.8;
    return metal === anchor ? 1.0 : 0.2;
  }

  function styleAffinity(styles, outfitRead, userFavs) {
    if (!styles?.length) return 0.5;
    const blended = {};
    let norm = 0;
    for (const arch of ARCHETYPES) {
      blended[arch] = 0.7 * (outfitRead?.[arch] || 0) + 0.3 * (userFavs.has(arch) ? 1 : 0);
      norm += blended[arch];
    }
    if (norm <= 0) return 0.5;
    const hit = styles.reduce((s, st) => s + (blended[st] || 0), 0) / norm;
    const spread = Math.max(1, Math.floor(ARCHETYPES.length / Math.max(1, styles.length)));
    return Math.min(1, hit * spread * 0.5 + hit * 0.5);
  }

  function categoryPrior(cat, outfit) {
    let p = 1.0;
    const neck = outfit.neckline;
    if (neck) {
      if (cat === 'necklace' && ['vneck', 'scoop', 'strapless'].includes(neck)) p = 1.25;
      if (cat === 'necklace' && neck === 'high') p = 0.35;
      if (cat === 'earrings' && ['high', 'crew'].includes(neck)) p = 1.15;
      if (cat === 'necklace' && neck === 'collared') p = 0.8;
    }
    const g = (outfit.garments || []).map((x) => x.toLowerCase());
    if (cat === 'belt' && g.some((x) => x.includes('dress'))) p = Math.max(p, 1.2);
    if (cat === 'scarf' && (outfit.season === 'winter' || g.some((x) => x.includes('coat')))) p = Math.max(p, 1.25);
    if (cat === 'bag') p = Math.max(p, 1.1);
    if (cat === 'hat' && outfit.occasion === 'formal') p = Math.min(p, 0.6);
    return p;
  }

  function personalization(a) {
    let p = 0.5;
    if (a.favorite) p += 0.3;
    if (a.lastWornDaysAgo != null) {
      if (a.lastWornDaysAgo >= 30) p += 0.2;
      else if (a.lastWornDaysAgo <= 3) p -= 0.2;
    } else if (!a.timesWorn) p += 0.2;
    return Math.min(1, Math.max(0, p));
  }

  function maxSimilarity(a, set) {
    let m = 0;
    for (const b of set) {
      let s = 0;
      if (a.category === b.category) s = 1;
      else if (a.colors?.[0] && b.colors?.[0] && a.colors[0].family === b.colors[0].family && !NEUTRALS.has(a.colors[0].family)) s = 0.4;
      else if (tierOf(a) === tierOf(b)) s = 0.3;
      m = Math.max(m, s);
    }
    return m;
  }

  function scoreOnce(a, formality, styleRead, outfit, prefs, set) {
    const t = {};
    t.color = W.color * colorHarmony(a.colors, outfit.colors);
    t.formality = W.formality * (1 - Math.abs(a.formality - formality) / 4);
    t.metal = W.metal * metalConsistency(a.metal, set, prefs.metalPreference);
    t.style = W.style * styleAffinity(a.styles, styleRead, prefs.favoriteStyles);
    t.category = W.category * (categoryPrior(a.category, outfit) / 1.25);
    t.personal = W.personal * personalization(a);
    t.penalty = outfit.season && a.seasons?.length && !a.seasons.includes(outfit.season) ? 0.15 : 0;
    t.total = t.color + t.formality + t.metal + t.style + t.category + t.personal - t.penalty;
    return t;
  }

  function scoreItem(a, outfit, prefs, set, ambiguous) {
    let t = scoreOnce(a, outfit.formality, outfit.styleRead, outfit, prefs, set);
    if (ambiguous && outfit.altRead) {
      const t2 = scoreOnce(a, outfit.altRead.formality, outfit.altRead.styleRead, outfit, prefs, set);
      if (t2.total < t.total) t = t2; // maximin
    }
    return t;
  }

  function rationale(a, terms, outfit) {
    const entries = Object.entries(terms).filter(([k]) => !['total', 'penalty'].includes(k)).sort((x, y) => y[1] - x[1]);
    const parts = [];
    for (const [key] of entries.slice(0, 2)) {
      if (key === 'color') {
        const oc = (outfit.colors || []).slice().sort((x, y) => (y.weight ?? 1) - (x.weight ?? 1))[0];
        const af = a.colors?.[0]?.family;
        if (oc && af === oc.family) parts.push(`echoes the ${oc.family} running through this outfit`);
        else if (oc && af && ['black','white','grey','cream','tan'].includes(af)) parts.push(`${af} stays neutral against the ${oc.family}`);
        else if (oc) parts.push(`${af || 'its color'} plays off the ${oc.family} in this outfit`);
      } else if (key === 'formality') parts.push('sits at the same dress level as the look');
      else if (key === 'metal') parts.push(a.metal === 'none' || !a.metal ? 'keeps the metals uncluttered' : 'keeps the metals consistent');
      else if (key === 'style' && a.styles?.[0]) parts.push(`matches the ${a.styles[0]} read of the outfit`);
      else if (key === 'category') parts.push(`this outfit has room for a ${a.category}`);
      else if (key === 'personal') parts.push(a.favorite ? "one of your favorites" : "you haven't worn this in a while");
    }
    const s = parts.join(', and ');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) + '.' : 'A safe pairing for this look.';
  }

  function recommend(outfit, closet, rawPrefs) {
    const prefs = defaults(rawPrefs);
    if (!closet?.length) {
      return { picks: [], alternates: [], relaxed: [], emptyReason: 'emptyCloset', askToConfirmOutfit: false };
    }
    const ambiguous = (outfit.confidence ?? 1) < 0.6 && !!outfit.altRead;
    const relaxed = [];

    let candidates = closet.filter((a) => passesHardRules(a, outfit, prefs, 2, true, true));
    if (!candidates.length) {
      candidates = closet.filter((a) => passesHardRules(a, outfit, prefs, 3, true, true));
      if (candidates.length) relaxed.push('formality');
    }
    if (!candidates.length) {
      candidates = closet.filter((a) => passesHardRules(a, outfit, prefs, 3, false, true));
      if (candidates.length) relaxed.push('season');
    }
    if (!candidates.length) {
      candidates = closet.filter((a) => passesHardRules(a, outfit, prefs, 3, false, false));
      if (candidates.length) relaxed.push('occasion');
    }
    if (!candidates.length) {
      return { picks: [], alternates: [], relaxed, emptyReason: 'allVetoed', askToConfirmOutfit: ambiguous };
    }

    const picked = [];
    let pool = candidates.slice();
    let budget = relaxed.includes('occasion') ? Infinity : statementBudget(prefs);
    let excessUsed = false;

    while (picked.length < prefs.maxPieces && pool.length) {
      let best = null;
      for (const a of pool) {
        if (!slotEligible(a, picked.map((p) => p.item))) continue;
        if (a.statement > budget) continue;
        if (tierOf(a) === 'excess' && excessUsed) continue;
        const s = scoreItem(a, outfit, prefs, picked.map((p) => p.item), ambiguous);
        if (s.total < MIN_SHOW) continue;
        const adj = s.total - MMR_LAMBDA * maxSimilarity(a, picked.map((p) => p.item));
        if (!best || adj > best.adj) best = { a, adj, s };
      }
      if (!best) break;
      if (budget !== Infinity) budget -= best.a.statement;
      if (tierOf(best.a) === 'excess') excessUsed = true;
      picked.push({
        item: best.a,
        score: Math.round(best.s.total * 1000) / 1000,
        tier: tierOf(best.a),
        rationale: rationale(best.a, best.s, outfit),
        termBreakdown: { ...best.s },
      });
      pool = pool.filter((x) => x.id !== best.a.id);
    }

    const alternates = [];
    for (const cat of new Set(picked.map((p) => p.item.category))) {
      let bestAlt = null;
      for (const a of pool.filter((x) => x.category === cat)) {
        const s = scoreItem(a, outfit, prefs, [], ambiguous);
        if (s.total >= MIN_SHOW && (!bestAlt || s.total > bestAlt.s.total)) bestAlt = { a, s };
      }
      if (bestAlt) {
        alternates.push({
          item: bestAlt.a,
          score: Math.round(bestAlt.s.total * 1000) / 1000,
          tier: tierOf(bestAlt.a),
          rationale: rationale(bestAlt.a, bestAlt.s, outfit),
          termBreakdown: { ...bestAlt.s },
        });
      }
    }

    return {
      picks: picked,
      alternates,
      relaxed,
      emptyReason: picked.length ? 'none' : 'allVetoed',
      askToConfirmOutfit: ambiguous,
    };
  }

  const api = { recommend, tierOf, statementBudget, colorHarmony, metalConsistency, ARCHETYPES, NEUTRALS: [...NEUTRALS] };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (typeof globalThis !== 'undefined' ? globalThis : window).ExEngine = api;
})();
