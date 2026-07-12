# Excessorize Recommendation Engine — Design Doc

**Scope:** the engine that, given a *seed* (a captured outfit) and the user's owned
accessory catalog, returns a ranked, tiered set of accessories with a plain-language
rationale for each pick. Per the PRD, recommendations draw **only from items the user
owns**, and every suggestion must carry a credible "why."

**Reconciliation note (decision point):** the original brief mentioned gadget
accessories (case/strap/dock) and a monetary budget. The PRD, all 12 design
iterations, and the capture flow are unambiguously the fashion product, so the engine
targets fashion accessories. "Budget" is modeled two ways: (a) a **statement budget**
(how much visual "excess" one look can carry — live in v1) and (b) an optional
**price field** per item so a monetary cap slots in unchanged when shoppable
suggestions arrive post-v1. The scoring core is category-agnostic: swap the
attribute vocabulary and the same engine ranks phone cases.

---

## 1. Data model

### 1.1 Accessory (catalog item)

| Field | Type | Why it exists |
|---|---|---|
| `id`, `name`, `photo` | — | identity |
| `category` | enum: `necklace, earrings, bracelet, ring, watch, bag, belt, scarf, hat, glasses` | the PRD v1 vocabulary. Small on purpose (PRD risk #2: keep the visual vocabulary small). |
| `colors` | `[ColorTag]` | each = `family` (12-hue wheel + neutrals) + `tone` (warm/cool/neutral) + `value` (light/mid/dark) |
| `metal` | `gold, silver, roseGold, mixed, none` | metal consistency is one of the strongest classical styling rules |
| `formality` | 1–5 | 1 beach, 3 smart-casual, 5 black-tie |
| `statement` | 1–5 | **the "excess" axis.** 1 = quiet staple, 5 = conversation piece |
| `styles` | set of 8 archetypes: `minimal, classic, romantic, boho, street, glam, sporty, edgy` | matches the Style DNA concept from the handoff brief |
| `seasons` | subset of 4 | soft filter |
| `price` | optional Decimal | unused in v1 ranking; future monetary budget / insurance value |
| `timesWorn`, `lastWornAt`, `favorite` | usage | drives the rotation nudge ("you own it, wear it") |

### 1.2 Excess / upgrade tiers

Statement maps to three presentation tiers:

- **Anchor** (statement 1–2): safe, always-works pieces. Every look gets one.
- **Elevate** (statement 3): adds interest without risk.
- **Excess** (statement 4–5): the hero piece. At most one per look.

A look has a **statement budget** `B = 4 + round(boldness × 6)` points
(boldness = user slider 0…1, default 0.5 → B = 7). Items are added greedily until
the budget is spent. This is the mechanism that makes a "subtle" user get
watch + thin chain, and an "excess" user get the collar necklace — from the same
catalog and the same outfit. Rationale: a scalar budget is explainable and tunable;
a hard per-tier quota was rejected because small catalogs often can't fill quotas.

### 1.3 Outfit (seed)

`garments[]`, `colors[] (weighted ColorTags)`, `formality (1–5) + confidence`,
`styleRead (archetype weights)`, `neckline?`, `occasion?`, `season?`,
`confidence (0–1)` overall. Detection is a **draft the user confirms** (PRD):
below confidence 0.6 the UI asks; the engine also has a robust mode (§2.4).

### 1.4 Compatibility rules

**Hard vetoes** (never shown, checked first):
1. user-avoided colors;
2. formality gap `|Fa − Fo| > 2` (relaxable, §2.5);
3. occasion vetoes (e.g. `gym` × statement ≥ 4, `formal` × sporty-only items);
4. slot exclusivity: ≤1 hat, ≤1 belt, ≤1 bag, ≤2 wrist items (watch+bracelet ok), ≤1 necklace unless both statement ≤2 (layering exception).

**Soft rules** are the scoring terms below. Rules are data, not code: they live in
one table so Nathan can author/edit them (PRD Q5 explicitly prefers an authored
rules library over generated text).

### 1.5 Category affinity priors

`P(category adds value | outfit signals)` — a small authored matrix, e.g.:
v-neck/scoop → necklace 1.0; high neck → necklace 0.35, earrings 1.1;
unstructured dress → belt 1.2; outerwear present + cold → scarf 1.25;
no bag in look → bag 1.1. Default 1.0. **⚑ Data flag:** these priors are my
educated guesses; after ~200 real accept/dismiss events they should be re-fit as
smoothed acceptance rates per (signal, category) pair.

---

## 2. Ranking algorithm

### 2.1 Per-item score

For accessory *a*, outfit *o*, user *u*, and partially-built set *S*:

```
score(a) = 0.30·C + 0.20·F + 0.15·M + 0.15·A + 0.10·K + 0.10·P − pen
```

- **C — color harmony** ∈ [0,1]. For each (outfit color, accessory color) pair:
  neutral involved 0.70 · same family (tonal) 0.85 · analogous (adjacent hue) 0.80 ·
  complementary (opposite hue) 0.90 · triadic 0.75 · otherwise 0.35, then
  +0.10 if warm/cool tones agree (cap 1.0). C = max over pairs, weighted by the
  outfit color's dominance. Complementary > tonal because an accessory's job is
  contrast; a hue wheel over a small family vocabulary keeps it robust to noisy
  vision output (12 families, not RGB distance, on purpose).
- **F — formality fit** = `1 − |Fa − Fo| / 4`.
- **M — metal consistency**: 1.0 if `none` or matches the set's dominant metal
  (or user's stated preference when the set is empty); `mixed` 0.6; clash 0.2.
  Computed against S, so it's order-aware.
- **A — style affinity**: cosine similarity between the item's archetype vector and
  `0.7·outfit styleRead + 0.3·user favorite styles`. The blend keeps looks anchored
  to *this outfit* while nudging toward taste.
- **K — category prior** (§1.5, normalized by 1.25).
- **P — personalization/rotation**: favorite +0.3; not worn in 30+ days +0.2
  (novelty — this is the "you already own the right pieces" promise made
  mechanical); worn in last 3 days −0.2. Clamped to [0,1] around a 0.5 base.
- **pen — penalties**: season mismatch 0.15.

Weights sum to 1 so every rationale can cite percentage contributions honestly.
**⚑ Data flag:** the weight vector is hand-set. With `outfit_feedback` events
(love/wore/dismissed) it becomes a logistic-regression fit — same features,
learned weights — without changing the architecture.

### 2.2 Set composition (MMR greedy)

Ranked list ≠ good set (top-5 might be five gold necklaces). Compose with
Maximal Marginal Relevance:

```
next = argmax over eligible a:  score(a) − 0.5·maxSim(a, S)
```

`sim` = 1.0 same category, 0.4 same dominant color family, 0.3 same tier, else 0.
Eligibility re-checks hard rules *against S* (slot exclusivity, statement budget,
≤1 Excess piece). Stop at `maxPieces` (default 4) or when nothing is eligible.
Greedy-MMR over exact subset optimization: the candidate pool is tiny (a personal
closet, tens of items), greedy is O(n·k), fully explainable, and the quality gap
versus exact search is negligible at this scale.

### 2.3 Rationale generation

Each pick's rationale is assembled from its **top two scoring terms** via an
authored template table ("warm gold picks up the tan in the jacket" ← C-term:
complementary+warm match, against the dominant outfit color). If no term clears
0.6, the item is *not shown* — the PRD's forcing function ("if we can't articulate
a credible reason, it probably shouldn't be suggested") implemented literally.

### 2.4 Ambiguous outfits

If outfit confidence < 0.6 and a second plausible read exists, score under **both**
reads and rank by `min(score₁, score₂)` (maximin). Items that only work under one
interpretation sink; the robust core rises. The UI still asks the user to confirm —
the engine just degrades gracefully in the meantime.

### 2.5 Conflicting constraints — relaxation ladder

If hard rules produce zero candidates, relax in fixed order and **report which rung
was used** so the UI can say "closest matches — loosening formality":
1. formality gap 2 → 3; 2. drop season filter; 3. lift statement budget;
4. drop occasion vetoes (never drop avoided colors — that's user-stated intent).
Still empty → return an empty result with a machine-readable reason
(`emptyCloset` / `allVetoed`) that the UI turns into cold-start coaching.

### 2.6 Rules vs. embeddings vs. hybrid (the tradeoff)

| | Authored rules (chosen for v1) | Embeddings | Hybrid |
|---|---|---|---|
| Explainability | native — the score *is* the reason | post-hoc, hand-wavy | rules explain, embeddings refine |
| Cold start | works at catalog size 1 | needs thousands of interactions | rules carry cold start |
| Control/brand voice | full (authored templates) | none | full |
| Ceiling | plateaus at "competent stylist" | learns taste beyond rules | best of both |
| Failure mode | blind spots in my rule table | confidently weird pairings | complexity |

Chosen: **rules now, hybrid later.** The PRD is a portfolio/learning build where the
visible "why" is the product's core differentiator, and there is zero interaction
data today — embeddings have nothing to learn from and would destroy the rationale
feature. The upgrade path is already shaped: (1) learn the weight vector from
feedback (log-reg — weeks of data), (2) add a CLIP-style image-embedding similarity
as an *eighth feature* inside the same linear score (months of data), keeping
rationales sourced from the interpretable terms. **⚑ Data flag:** commit to (2)
only if rule-based acceptance rate plateaus below ~60% after weight learning.

---

## 3. Cold-start plan (small catalog)

1. **Starter Pack demo closet** (ships in the app): 12 archetypal items so the
   core loop is demo-able in 30 seconds. Clearly badged; one tap to clear.
2. **Guided first-five capture** (already in v12 designs): onboarding asks for the
   user's five favorites — one per high-coverage category (earrings, necklace, bag,
   watch/bracelet, belt/scarf). Five well-chosen items cover ~80% of outfits.
3. **Coverage-aware coaching**: when a category prior fires with no owned item in
   that category, surface "a scarf would finish this — you don't have one tagged
   yet. Add one?" — converts recommendation gaps into catalog growth.
4. **Relaxation ladder** (§2.5) keeps small closets from dead-ending.
5. **No collaborative filtering pretense**: with n≈1 user there is no "users like
   you." Nothing in v1 pretends otherwise.

## 4. Where I want real usage data before committing (all ⚑ flags)

1. Scoring **weights** (0.30/0.20/…) → learn from feedback events.
2. **Category priors** matrix → re-fit from accept/dismiss rates.
3. **MMR λ = 0.5** and `maxPieces = 4` → tune on save-rate.
4. **Statement budget curve** `4 + 6·boldness` → validate the slider actually
   segments users; may need per-occasion budgets.
5. **Maximin ambiguity mode** → measure whether users prefer robust-but-bland
   over confident-but-risky when vision is unsure.
6. **Embeddings go/no-go** (§2.6).
7. Formality **gap veto at 2** → the single most opinionated rule; watch dismissals
   citing "too dressy / too casual."
