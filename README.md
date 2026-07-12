# Excessorize

*You already own the right pieces. Excessorize helps you actually use them.*

A PWA that catalogs the accessories you own, reads a photo of your outfit, and
recommends pairings **from your own closet** — with a plain-language reason for
every pick. Built from the Excessorize PRD.

**v2 "Noir Atelier":** liquid-glass luxury UI over a chiaroscuro, lightly
airbrushed ground — one warm key light, deep shadow, champagne-gold accents,
serif display type. Adds onboarding, Profile (Style DNA), Settings with full
data export/import, look favorites, search + sort + filters everywhere, and a
motion system gated by `prefers-reduced-motion`. The user flow graph and UX
audit live in `FLOWS.md`.

## What's in here

| Path | What |
|---|---|
| `index.html` + `app.css` + `app.js` | The PWA. Vanilla JS, no build step. Design tokens lifted from the v12 prototype (warm paper / warm charcoal, terracotta accent, iOS large-title layout). |
| `engine.js` | The recommendation engine (JS port, runs on-device). |
| `Sources/ExcessorizeEngine/` | **Reference Swift implementation** of the same engine, for the future native SwiftUI app. Keep the two in sync. |
| `Tests/ExcessorizeEngineTests/` | XCTest suite — run with `swift test` (needs Xcode; the same 14 cases are what the JS engine was verified against). |
| `ENGINE.md` | Design doc: data model, ranking math, rules-vs-embeddings tradeoff, cold-start plan, and every place real usage data should overrule a hand-set constant. |
| `vision.js` | On-device photo analysis (dominant-color read, detection-as-draft). |
| `db.js` | IndexedDB layer — local-first storage for closet items, outfit photos, and saved looks. |
| `seed.js` | Starter Pack: 12 demo accessories for cold start. |
| `sw.js` / `manifest.webmanifest` | Offline app shell + installability. |
| `FLOWS.md` | User flow graph (mermaid), UX audit, motion spec, and the 8-scenario test matrix. |

## Try it on iPhone

1. Open the deployed URL in Safari.
2. Share → **Add to Home Screen** (installs as a full-screen app).
3. Today → **Load starter pack** (demo closet), or Closet → **+ Add piece** to
   photograph your own accessories.
4. Stylist → **Camera** → shoot your outfit → confirm the read → **Style it**.
5. Save the look — it's stored on-device (IndexedDB), photos included, and
   works offline.

## Architecture notes

- **Local-first by design** (PRD open question #6): closet, outfit photos, and
  looks live in IndexedDB on the device. No account needed to demo. The
  planned Supabase sync (see the Claude Code handoff brief) slots in behind
  `db.js` without touching the UI or engine.
- **Detection is a draft**: the on-device color read pre-fills tags; the user
  always confirms (PRD risk #2). Swapping `vision.js` for a cloud vision API
  (Gemini Flash via an edge function) changes nothing else.
- **The engine is shared logic**: `engine.js` and the Swift package implement
  the identical algorithm so the native app inherits tested behavior.

## Running the Swift tests

```bash
swift test   # from the repo root, requires Xcode toolchain
```
