# Home Page Mobile Performance — Critical Path Optimization

Date: 2026-08-21 · Branch: master · Commit: `perf(home): mobile critical path`

## Before / After (local Lighthouse, mobile profile — simulated slow 4G, headless Chrome)

Runner: `tools/perf-home-lighthouse.js` (one-off, home page only). Reports:
`docs/lighthouse/home-mobile-before.json` / `docs/lighthouse/home-mobile-after.json`.

| Metric | Before | After | Δ |
|---|---|---|---|
| Performance score | 40 | 62 | +22 |
| FCP | 2,566 ms | 1,670 ms | −896 ms |
| LCP | 6,953 ms | 3,558 ms | −3,395 ms |
| TBT | 1,725 ms | 1,488 ms | −237 ms |
| Speed Index | 6,521 ms | 4,234 ms | −2,287 ms |
| Main-thread work | 7,608 ms | 5,423 ms | −2,185 ms |
| CLS | 0 | 0 | = |

Notes on comparability: the owner's real-device audit reported Perf 57 / TBT 1,730 /
LCP 3.5s / MTW 9.5s. The local before-run reproduced TBT (1,725 ms ≈ 1,730 ms) and the
LCP element exactly; absolute scores differ (hardware), but the deltas above are the
same-machine signal. The after LCP (3.56s) matches the audit's 3.5s and is now bounded
by the boot veil's designed 3.3s hold (`HOLD_S` in `js/home-boot.js`) — the veil's
loader SVG is the LCP element by design and its timing is untouched per the owner's
constraint.

## Changes

1. **`js/home-orrery.js`** — (a) glyph renderability probe batched: one raster strip +
   ONE `getImageData` per script set (17 readbacks total instead of ~800 per-glyph
   stalls); identical accept/reject semantics (24×24 alpha cells, U+FFFF `.notdef`
   reference). (b) Scene boot (atlas build, particle setup, first frame) deferred to
   `requestIdleCallback(boot, { timeout: 1200 })` (`setTimeout` fallback) so the hero
   content paints first; the scene builds behind the veil and is running before the
   veil dissolves. (c) Frame governor, DPR 1.5 cap, reduced-motion still frame, and
   offscreen/hidden pause untouched. No glyph-density or DPR changes on small screens
   (would have been visible).
2. **`js/pc-fx-core.js`** — same batched probe shared by the boot veil
   (`PCFX.buildAtlas`) and temple scenes; `PCFX.isRenderable(ch, font)` public
   signature kept. This removes the boot veil's atlas readback storm (its 3.4s CPU
   was dominated by per-glyph `getImageData`); veil choreography, timing, and frames
   are byte-identical.
3. **`index.html` nav wordmark** — generated `punicodex-wordmark-ivory-{720,1080}.{webp,png}`
   (sharp, q85) and added `srcset`/`sizes="(max-width: 640px) 173px, 231px"` with the
   3600w original kept as the largest candidate. Mobile now fetches 14.9 KB instead of
   78.8 KB (−81%). Ivory wordmark appears only in the nav (veil uses the loader SVG;
   hero/footer use the camel-gold 680w wordmark, already right-sized).
4. **Render-blocking CSS split** — new `css/home-critical.css?v=1` (blocking): the
   above-the-fold slice copied VERBATIM from `main.css` (tokens, reset, nav, buttons,
   reveal, typography), `home-v2.css` (boot veil, hero), and `fonts.css` (the six
   latin @font-face used above the fold — including the existing 400-file aliasing,
   preserved as-is so font rendering is unchanged). The six full stylesheets
   (`fonts.css`, `main.css`, `home-v2.css`, `punicodex-tokens.css`,
   `punicodex-motion.css`, `brand-overrides.css`) now load via the repo's existing
   print-media-swap pattern + noscript fallback, in the ORIGINAL cascade order; the
   deferred sheets re-assert the identical rules, so steady-state rendering is
   unchanged. `?v=` pins bumped on edited scripts (`px-core perf22`, `pc-fx-core 3`,
   `home-orrery 3`).
5. **`js/px-core.js`** — nav scroll handler batched: one `window.scrollY` read, then
   all `scrolled` class writes across `.main-nav` instances (was per-nav interleaved
   read/write, the flagged forced-reflow source). Same threshold (40px), same 80ms
   throttle.
6. **sw.js** — verified live: `curl -sI https://punicodex.com/sw.js` → HTTP 200 with
   CSP `worker-src 'self'`. The audit's "Failed to update a ServiceWorker" is a
   headless-audit-environment artifact, not a regression. `test/service-worker.test.js`
   green.

## Visual identity verification

`tools/perf-visual-check.js` (one-off): served HEAD (via git worktree) and the modified
tree side by side, Playwright screenshots at 360×800 @2x at t=1.2s (veil), t=6s (hero
after dissolve), mid-page section, and footer. All frames visually identical — same
veil composition, caption, hero wordmark/rule/CTA, section layout, footer; only the
orrery/boot particle fields differ, which is inherent `Math.random()` placement, not a
change.

## Guard suites (all green)

- `node --test test/service-worker.test.js test/mobile-menu-consistency.test.js` — 9 pass
- `node --test test/hero-canvas-background-regression.test.js test/provenance-mobile-regression.test.js test/global-strip-mobile-regression.test.js test/base-temple-mobile-nav.test.js test/menu-consistency.test.js` — 5 pass
- `node --test test/hero-stats.test.js test/flagship-mobile-nav.test.js test/flagship-menu-toggle-regression.test.js test/seo-regression.test.js` — 4 pass
- `node --test test/frontend-smoke.test.js` — 1 pass
- `node test/links.js` — 898,676 links valid (8,658 files)

`npm test` / `npm run generate` intentionally not run (controller's job). Note for the
controller: `css/home-critical.css` is a hand-maintained copy of above-the-fold rules —
if `main.css`/`home-v2.css`/hero `@font-face` blocks change, mirror the change there
(see the header comment in the file).

## Deliberately NOT done (visual-identity constraint)

- Veil hold/dissolve timing unchanged (3.3s + 0.8s fade) — it now dominates LCP by design.
- Orrery glyph count (300 + 17 signatures) and DPR cap (1.5) unchanged on small screens.
- Boot veil frame loop not frame-governed — would alter the animation's fluidity.
- Temple/other pages' `?v=` pins for `px-core.js`/`pc-fx-core.js` not bumped (900+ pages,
  generator's job); old pins remain functionally valid, just without these perf wins.
