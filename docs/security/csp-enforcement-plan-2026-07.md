# PuniCodex — CSP Enforcement Plan (2026-07)

**Status:** Proposal — ready for the header flip (not yet applied)
**Scope:** Rename `Content-Security-Policy-Report-Only` → `Content-Security-Policy`
in `vercel.json`, with a widened policy value that matches what the site
actually loads.
**Prior art:** `docs/security/csp-report-only-soak.md` (soak note, 2026-07).

---

## 1. Current policy

`vercel.json` (`headers` → `source: "/(.*)"`), applied to every route:

```
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'
```

The policy carries **no `report-uri` / `report-to` directive** and no
`Reporting-Endpoints` header exists anywhere in the repo.

## 2. Violation-report data: none exists

The soak produced **no persisted telemetry**. Verified by search:

- No CSP collector endpoint under `api/` (no `csp` / `Content-Security-Policy`
  matches in `api/`).
- No CSP/violation table in `platform/db/` (no migration or schema mentions
  `csp_report`, `csp-report`, or `violation`).
- No stored reports in `docs/`, `data/`, or `/tmp` artifacts.
- The policy has no reporting directive, so browsers only ever logged
  violations to the **local DevTools console** of whoever browsed the site.

The breakage analysis below is therefore a **static inventory** of what the
deployed markup actually loads, not a replay of collected reports. The
pre-flip console checks listed in the soak note (§"What to check before
enforcing") are still worth doing, because they are the only telemetry the
soak can produce.

## 3. Inventory: what the site actually loads

Representative pages scanned: `index.html`, `pantheon/index.html`,
`tiers/index.html`, `type/index.html`, `about/index.html`,
`sites/zeus/index.html`, `sites/zeus/lore/index.html`,
`admin-portal/index.html`, plus `search.html`, `contact/index.html`,
`connections/index.html`, `templates/flagship/*`, `platform/public/*`,
`mobile/*`, `api/v1/docs/index.js`, `css/`, `js/`, and the generators
(`scripts/generate-temples.js`, `scripts/inject-analytics.js`,
`scripts/inject-hero-videos.js`, `scripts/create-flagship.js`).

### Inline script/style surface (fleet-wide scale)

| Surface | Scale | CSP relevance |
|---|---|---|
| Inline executable `<script>` blocks | ~2,028 blocks / 1,117 files | Needs `script-src 'unsafe-inline'` (no nonce infra on a static site) |
| Inline event handlers (`onclick`, `onsubmit`, …) | 1,237 attributes / 241 files | Needs `script-src 'unsafe-inline'`; includes handlers injected via `innerHTML` strings (e.g. `creatives/creatives.js`, dashboard slot buttons) |
| Inline `<style>` blocks | ~1,833 blocks / 1,796 files | Needs `style-src 'unsafe-inline'` |
| `style="…"` attributes | 25,871 / 2,613 files | Needs `style-src 'unsafe-inline'` |
| `<script type="application/ld+json">` | most temple/feature pages | **Not affected** — non-executable script types are not subject to `script-src` |

Concrete inline-script examples: the flagship boot script
`<script>window.PUNICODEX_API_BASE = "";</script>` and the booking-terms
IIFE in every flagship (template: `templates/flagship/index.html:611-647`,
instance: `sites/zeus/index.html:622-647`), the admin-portal dashboard
renderer (`admin-portal/index.html:89+`), the search-page boot script
(`search.html:144+`), dashboard onclick handlers
(`templates/flagship/dashboard.html:290-291,449-450,489`), and the contact
form's `onsubmit` toast (`contact/index.html:114`).

### External origins actually loaded

| Origin | Directive | Where | Notes |
|---|---|---|---|
| `fonts.googleapis.com` | `style-src` | ~2,800 HTML files (every public page, all temple templates, admin portal) | Google Fonts CSS (Cinzel, Cinzel Decorative, Cormorant Garamond, Montserrat, Lato, Fira Code) |
| `fonts.gstatic.com` | `font-src` | same pages | woff2 font files; some pages also `<link rel="preload">` them |
| `cdn.jsdelivr.net` | `script-src` | `sites/*/dashboard/index.html` (196 advertiser dashboards, from `templates/flagship/dashboard.html:10`), `platform/public/admin-bookings.html:12`, `platform/public/advertiser-panel.html:16` | Chart.js 4.4.1 UMD |
| `cdnjs.cloudflare.com` | `script-src` | `platform/public/temple-3d.html:18` | three.js r128 |
| `d3js.org` | `script-src` | `connections/index.html:33` | D3 v7 |
| `unpkg.com` | `script-src` + `style-src` | `api/v1/docs/index.js:14,22` | Swagger UI 5 (CSS + bundle) for `/api/v1/docs` |

### Things checked and found clean

- **No external `fetch`/XHR/WebSocket/EventSource** in any shipped HTML or
  frontend JS — all API traffic is same-origin (`/api/...`). The analytics
  beacon posts to `/api/analytics/collect/` (`js/analytics-beacon.js`).
- **No forms with external `action`.** Stripe checkout is a JS redirect
  (`window.location.href = data.stripeUrl`, `templates/flagship/flagship.js:567-568`)
  — navigation, not governed by fetch directives; no `js.stripe.com` script
  is loaded anywhere.
- **No `eval` / `new Function`** in shipped frontend code (only in Node
  build/test scripts, which CSP does not cover).
- **Media is same-origin**: hero videos are `assets/{id}_hero_video.webm|mp4`
  (`scripts/inject-hero-videos.js:175-180`). `mobile/ar-lens.html` uses
  `getUserMedia` (a MediaStream, not a URL load — not governed by
  `media-src`).
- **iframes are same-origin**: `type/test.html:113` embeds `index.html`.
- **CSS has no `@import` or external `url()`** (`css/` clean; fonts enter
  via `<link>` in HTML).
- **Deity domains 301-redirect** to `punicodex.com/{id}` (`middleware.js`
  §"2. Domain redirect"), so pages are only ever *served* from the
  `punicodex.com` origin — the absolute `https://punicodex.com/js/...`
  references in generated base temples (`scripts/generate-temples.js:1077-1078`)
  are same-origin at serve time and `'self'` covers them.
- **`platform/public/favicons/*.ico`** files contain saved third-party HTML
  snapshots with their own external scripts. Irrelevant to CSP: they are
  served as `image/x-icon` and `X-Content-Type-Options: nosniff` (already
  enforced) prevents HTML sniffing.

### Conditional: GA4 (not currently deployed)

`scripts/inject-analytics.js` injects, **only when `GA_MEASUREMENT_ID` is
set at generation time**, a `https://www.googletagmanager.com/gtag/js`
script plus an inline `gtag()` boot block. The committed HTML contains **no
GA4 tags** (verified: zero `googletagmanager` matches outside the injector
and docs), and Vercel deploys the committed files as-is. So GA4 is not live
today and adds nothing to the required policy — but see §6 for the delta if
it is ever enabled.

## 4. What breaks if the current policy is enforced as-is

Enforcing the soaked value unchanged would break:

1. **Google Fonts on every public page** (~2,800 files). `style-src` lacks
   `fonts.googleapis.com` → the stylesheet `<link>` is refused; `font-src`
   lacks `fonts.gstatic.com` → woff2 files are refused. Site-wide fallback
   to system fonts. Highest blast radius.
2. **Chart.js on all 196 advertiser dashboards**
   (`sites/*/dashboard/index.html`, template `templates/flagship/dashboard.html:10`)
   plus `platform/public/admin-bookings.html` and
   `platform/public/advertiser-panel.html`. `script-src` lacks
   `cdn.jsdelivr.net` → dashboards render with dead charts and a broken
   boot (the dashboard inline script depends on the global `Chart`).
3. **The connections graph** (`connections/index.html:33`). `script-src`
   lacks `d3js.org` → the D3 visualisation never initialises.
4. **The 3-D temple demo** (`platform/public/temple-3d.html:18`).
   `script-src` lacks `cdnjs.cloudflare.com`.
5. **The API docs** (`/api/v1/docs`, `api/v1/docs/index.js:14,22`).
   `script-src`/`style-src` lack `unpkg.com` → Swagger UI never loads.
6. **GA4, if ever enabled** (see §3): `script-src` lacks
   `www.googletagmanager.com`; `connect-src 'self'` blocks
   `www.google-analytics.com` collection. Not live today.

Everything else in the soaked policy is safe to enforce: inline
scripts/handlers/styles are all permitted by `'unsafe-inline'`; images are
covered by `img-src 'self' data: https:`; media and same-origin iframes fall
back to `default-src 'self'`; all XHR/fetch/beacon traffic is same-origin.

## 5. Recommended enforcing policy

Single line, ready to paste as the `Content-Security-Policy` value in
`vercel.json`:

```
default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://d3js.org https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; media-src 'self'; frame-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

### Per-directive justification

- **`default-src 'self'`** — unchanged baseline; covers `media-src`,
  `frame-src`, `manifest-src`, `worker-src` even where not stated (they are
  stated anyway for readability).
- **`script-src 'self' 'unsafe-inline' + 4 CDN hosts`** — `'unsafe-inline'`
  is unavoidable today: ~2,028 inline `<script>` blocks and 1,237 inline
  event handlers ship in static HTML with no nonce infrastructure (a static
  Vercel site cannot issue per-response nonces; hashes for 1,200+ handler
  attributes are not maintainable). This is the honest cost of enforcing
  now; §7 lists the path to removing it. The four CDN hosts are exactly the
  external script origins found in the inventory — no broad `https:`.
- **`style-src 'self' 'unsafe-inline' + fonts.googleapis.com + unpkg.com`** —
  `'unsafe-inline'` covers ~1,833 `<style>` blocks and 25,871 `style=`
  attributes; `fonts.googleapis.com` is the Google Fonts stylesheet;
  `unpkg.com` is the Swagger UI stylesheet.
- **`font-src 'self' data: https://fonts.gstatic.com`** — Google font files
  (plus preloaded woff2s). `data:` retained from the soaked policy.
- **`img-src 'self' data: https:`** — unchanged from soak. Deliberately
  permissive (`https:`) so any hotlinked/external image keeps rendering;
  tightening to named hosts was not attempted without violation telemetry.
- **`connect-src 'self'`** — every API call, the analytics beacon, and all
  frontend fetches are same-origin. No external connect targets exist in
  the current build.
- **`media-src 'self'`** — hero videos are same-origin; camera streams are
  not URL loads.
- **`frame-src 'self'`** — only same-origin iframes exist (`type/test.html`).
- **`manifest-src 'self'` / `worker-src 'self'`** — `/manifest.json`,
  `/mobile/manifest.json`, `/sw.js`, `/mobile/sw.js`.
- **`object-src 'none'`** — no plugins anywhere; pure hardening.
- **`base-uri 'self'`** — no `<base>` tags in use; pure hardening.
- **`form-action 'self'`** — all forms post same-origin (mostly via JS);
  Stripe checkout is a JS navigation, not a form POST.
- **`frame-ancestors 'none'`** — mirrors the already-enforced
  `X-Frame-Options: DENY`. Note: `type/test.html`'s embedded test iframe of
  `index.html` is *already* blocked in production by `X-Frame-Options:
  DENY`; `frame-ancestors 'none'` keeps exact parity (modern browsers
  prefer it over XFO). If prod use of `type/test.html` is ever wanted,
  relax to `frame-ancestors 'self'` — consciously, later.

Deliberately **not** included: `upgrade-insecure-requests` (behavioural
delta without telemetry; HSTS already covers transport) and any
`report-uri`/`report-to` (no collector exists — see §8 for the option).

## 6. Conditional addition — only if GA4 is ever enabled

If `GA_MEASUREMENT_ID` is set for a future `npm run generate`, the injected
tags need, in addition:

- `script-src`: `https://www.googletagmanager.com` (the inline `gtag()` boot
  is already covered by `'unsafe-inline'`)
- `connect-src`: `https://www.google-analytics.com https://stats.g.doubleclick.net`
- `img-src`: already covered by `https:`

Verify presence with `git grep -c googletagmanager -- '*.html'` after
generation before touching the policy.

## 7. Optional tightening fixes (not implemented)

Each removes a wart from the policy above; none is required for the flip.

1. **Vendor Chart.js** into `js/vendor/chart.umd.min.js` and update
   `templates/flagship/dashboard.html:10`, `platform/public/admin-bookings.html:12`,
   `platform/public/advertiser-panel.html:16` → drop `cdn.jsdelivr.net` from
   `script-src` after regenerate.
2. **Vendor D3 v7** for `connections/index.html:33` → drop `d3js.org`.
3. **Vendor three.js r128** for `platform/public/temple-3d.html:18` → drop
   `cdnjs.cloudflare.com`.
4. **Vendor swagger-ui-dist** (self-host CSS+JS) for `api/v1/docs/index.js:14,22`
   → drop `unpkg.com` from both directives.
5. **Self-host the six Google Fonts families** (woff2 in `assets/fonts/`,
   `@font-face` in CSS) and update the `<link>`/preload/preconnect markup in
   `templates/flagship/*.html`, `scripts/generate-temples.js`, and the root
   pages → drop `fonts.googleapis.com`/`fonts.gstatic.com`. Largest effort,
   largest privacy/performance win.
6. **Move the two flagship inline scripts** (the `PUNICODEX_API_BASE` boot
   and the booking-terms IIFE, `templates/flagship/index.html:611-647`)
   into `sites/{id}/script.js` or a shared `js/flagship-boot.js` — small,
   mechanical, shrinks the inline surface.
7. **Migrate inline event handlers to `addEventListener`** (dashboard
   template, `search.html`, `admin.html`, `browser.html`,
   `contact/index.html`, `store/index.html`, `creatives/creatives.js`
   innerHTML strings) — the long-term path to dropping `'unsafe-inline'`
   from `script-src`. Track as its own project; do not block the flip on it.

## 8. Rollback plan

The flip is a one-line rename in `vercel.json`; rollback is the reverse
one-line rename (keep the policy value untouched either way):

```diff
-          "key": "Content-Security-Policy",
+          "key": "Content-Security-Policy-Report-Only",
```

- Revert the commit and redeploy, or use Vercel's instant rollback to the
  previous deployment — the header change rides with the deployment, so a
  deployment rollback fully restores report-only mode.
- No database, generated-artifact, or content changes are involved, so
  rollback is total. `npm run generate` is **not** needed for either
  direction (header config is not a generated artifact — but re-validate
  `vercel.json` JSON structure after the edit; see the duplicate-key
  guardrail in `AGENTS.md`).
- Optional future improvement: add a lightweight collector
  (e.g. `api/csp-report.js` accepting `application/csp-report` POSTs into a
  new table) plus `report-uri`/`report-to` directives, so any post-flip
  widening is driven by data rather than ad-hoc reports. Out of scope for
  the flip itself.

## 9. Verification checklist (live smoke pass, post-deploy)

Run after the enforcing deploy lands. For each page: hard-load with DevTools
open; expect **zero** `Content-Security-Policy` "Refused to …" console
errors and the specific functional checks below.

| Page | Check |
|---|---|
| `/` | Cormorant Garamond/Montserrat render (Network: `fonts.googleapis.com` CSS + `fonts.gstatic.com` woff2 return 200); home canvas/effects run |
| `/sites/zeus/` | Fonts render; canvas effect animates; open booking modal → "send code" button is disabled until the terms checkbox is ticked (proves the inline IIFE ran); `window.PUNICODEX_API_BASE` is `""` in console |
| `/sites/zeus/lore/` | Inline `<style>` block applies (page-specific styling intact); provenance/details sections expand |
| `/sites/zeus/dashboard/` | Chart.js loads from jsdelivr (Network 200); charts render; slot-editor buttons (`onclick`) work |
| `/pantheon/`, `/tiers/`, `/about/`, `/lexicon/` | Fonts render; filters/sorting work (all self-hosted JS) |
| `/type/` | Engine works end-to-end (type a name, copy chips); Fira Code renders in the output area |
| `/search.html` | Run a search; result cards render; inline boot script ran (no console errors) |
| `/connections/` | D3 v7 loads from `d3js.org`; graph renders and nodes are clickable |
| `/admin-portal/` + `/admin-portal/login/` | Inline dashboard renderer paints stat cards after login; portal JS works |
| `/api/v1/docs` | Swagger UI loads CSS+JS from unpkg and renders the spec |
| `/contact/` | Submit shows the toast (proves inline `onsubmit` ran); no CSP errors |
| `/blog/` | Generated index renders, fonts load |
| Deity-domain entry | `https://zeús.com/` → 301 → `punicodex.com/zeus/`; temple loads clean post-redirect |
| Response headers | `curl -sI https://punicodex.com/ | grep -i content-security` shows `Content-Security-Policy:` (no `-Report-Only`); XFO/nosniff/HSTS still present |

Any "Refused to load/execute" error names the directive to widen — widen
**that directive only** (per the soak note's scoping rule), or roll back per
§8 if breakage is fleet-wide.
