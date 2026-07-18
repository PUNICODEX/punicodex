# PuniCodex — Brand Integration Plan

**Date:** 2026-07-18 · **Source kit:** `Kimi_Agent_punicodex扩展/punicodex-brand-kit/` (91 files, READ-ONLY — never modify) · **Status:** decision doc only — no implementation yet

This document audits every file in the brand kit, decides what ships and where,
maps the old-brand purge, and orders the implementation. It was written after
reading all kit docs (`BRAND_GUIDELINES.md`, `README.md`, `SITE_AUDIT.md`,
`13-page-visuals/PLACEMENT-GUIDE.txt`, `06-code/*`), visually inspecting all key
artwork, and surveying the repo's actual current state.

**Decision totals: 70 use / 21 reject (91 files, all decided).**

---

## 1. Repo reality today (survey findings)

### 1.1 The old wordmark is not text — it is a span + CSS macron

The "PŪNYCODEX" chrome wordmark is rendered as `P<span class="accent">U</span>NYCODEX`
(or `P<span>U</span>NYCODEX`) with a gold `::before` bar drawn over the U by CSS.
A plain grep for `Ū` / `PUNYCODEX` finds **nothing** in served pages — the span
breaks the string. A previous text rebrand sweep (`tools/rebrand-punicodex.js`,
commit `51145cdf`) already converted prose to `PuniCodex`/`PUNICODEX`, which is
why body copy and `<title>` tags are on-brand while headers/footers are not.

Four header variants are live today:

| Variant | Rendering | Where |
|---|---|---|
| Span-macron (dominant) | `P<span class="accent">U</span>NYCODEX` + CSS bar | `index.html`, `404.html`, `about/`, `appraise/`, `art/`, `authenticity/`, `codex/` (4 pages), `connections/`, `contact/`, `mobile/`, `pantheon/`, `privacy/`, `store/`, `terms/` (2 pages), `tiers/`, `type/`, `university-sponsorship/`, `extension/` popup+options |
| Span-macron, `global-brand` class | `P<span>U</span>NYCODEX` | `creatives/index.html`, all 9 `templates/flagship/*.html`, `scripts/generate-temples.js:592` (→ all 895 temples), 9 `platform/public/scholars/*.html` (→ `scholars/`) |
| Plain `PUNICODEX` text | `nav-logo` class | `realms/index.html:88`, `lexicon/index.html:61` |
| Other | `PuniCodex` camel text; "P" seal + `PUNICODEX` | `oracle.html:53,425`; `search.html:28-32`, `search-v2.html:28-32` |

The CSS rules that draw the macron bar (all must be removed in the swap):
`css/main.css:249-271` & `:610-633`, `css/temple-base.css:475-501`,
`templates/flagship/flagship.css:31-72` (→ per-site `styles.css` via
`scripts/create-flagship.js:803`), `creatives/creatives.css:43-51`,
`platform/public/scholars/creatives/creatives.css:402-410`,
`extension/popup/popup.css:53-61`, `mobile/css/mobile.css:96-104,1916-1924`
(mobile colors the U gold, no bar).

Two one-off maintenance scripts hold canonical nav/footer markup and would
re-introduce the old wordmark if rerun: `scripts/fix-flagship-nav.js:22`,
`scripts/fix-main-footers.js:30`.

### 1.2 Favicon / OG / manifest state

- Root pages share a **data-URI Ψ (psi) SVG favicon** + a 128px
  `apple-touch-icon` + `/manifest.json` (16 root files carry the data-URI —
  full list in §5). Temple pages (`sites/**`, 895) have **no favicon links at
  all**; flagship templates have none either.
- OG image today: `assets/images/og-default.{svg,png,webp}` — the SVG is
  **stale** ("26 DOMAINS · 24 ARCHETYPES · ONE MISSION"; reality: 206 domains /
  196 flagships / 895 entries) and SVG is a poor `og:image` (many scrapers
  won't render it). Base temples reference the `.svg` directly
  (`scripts/generate-temples.js:534,538,564`). Flagships correctly use their
  per-temple mascot for `og:image` but cite `og-default.webp` in JSON-LD
  `primaryImageOfPage` (`templates/flagship/index.html:48`).
- `manifest.json` (root) exists with icons in `assets/images/`
  (`favicon-32x32`, `apple-touch-icon` 128px, `icon192`, `icon512` + `.webp`
  siblings). `mobile/manifest.json` has its own `mobile/icon{192,512}.png`.
- `assets/images/` also holds `logomarks/` (per-deity SVGs), `mascots/`
  (per-deity art, `thumbs/small/` = 196 thumbs), and the unreferenced
  `punicodex_palette.png/.webp`.
- `branding/punicodex/` is **not referenced anywhere** — it is source material:
  per-deity brand packs (`Zeus/`, `Nike/`, …: hero videos, logolockups,
  mascots) plus `brand/` containing **old-brand images** (see purge list) and
  `punicodex_visual_identity_system.md` (old identity doc, superseded).

### 1.3 Card art decision points (the "empty medallion" bug)

- **Home grid** (`index.html:170 #pantheon-grid`) is rendered by
  `js/home.js:67-71`: `<img src="${a.mascotPath}">` with an inline `onerror`
  that fades the img out and applies a shimmer background → the bare gold
  rings. `mascotPath` comes from `js/archetypes-v2.js`
  (`/sites/{id}/assets/{id}_mascot.webp`); entries with no mascot file on disk
  (e.g. `sites/ganesa/assets/` has none) 404 → shimmer.
- **Pantheon grid** (`pantheon/index.html` → `js/pantheon.js:53-59`) renders
  `/assets/images/mascots/thumbs/small/{id}_thumb.webp` (196 exist) with
  `data-fallback`; `handleImgError` (`js/pantheon.js:88-102`) hides the img and
  adds `.is-skeleton` when both fail → bare ring.
- **Lexicon cards** (`lexicon/js/lexicon-browse.js`) render no images at all —
  text-only cards, nothing to fix.
- Fix point for both grids: swap the error branch (and/or the `!a.built`
  branch) to the kit's `punicodex-empty-portrait.png` instead of hiding the
  image.

### 1.4 Tiers page

`tiers/index.html:118` H1 `.tier-hero-title` is styled `color:
var(--text-primary)` (`css/tiers.css:198-207`, `#F2F2F5` — the "white H1" the
kit flags). Hero stats at `tiers/index.html:122-135`, tier cards grid at
`:156+`, a `.section-divider` at `:143`, constellation canvas hero bg.

### 1.5 Head writers (generation flywheel)

- `scripts/generate-temples.js` — writes full `<head>` + global strip for the
  ~699 base temples (OG at `:534,538,564`; wordmark at `:592`). Canonical edit
  point for base temples.
- `templates/flagship/*.html` — 9 templates (`index`, `lore`,
  `lore/extended`, `gallery`, `patterns`, `scholars`, `blog`, `creatives`,
  `patron`) consumed by `scripts/create-flagship.js` (which also builds each
  site's `styles.css` from `templates/flagship/flagship.css`, line 803).
  Canonical edit point for the 196 flagships.
- `scripts/enhance-flagships.js:81` — also emits an `og-default.svg` URL.
- `scripts/inject-analytics.js` — marker-scoped (`PUNICODEX-ANALYTICS-*`),
  walks `sites/`, `platform/public/`, and a hardcoded `rootPages` list; it only
  injects the analytics block. It is the *pattern* to reuse if a brand-head
  injector is wanted, but favicon/OG edits belong in the canonical templates +
  generators + hand-maintained root pages.
- Generated outputs that must **never** be hand-edited: `sites/**` (2463 files
  carry the old wordmark), root `scholars/**` (9), root `admin-portal/**`.
  After canonical edits: `npm run generate && npm test` (divergence gate).

### 1.6 Design tokens

`css/design-system.css` is loaded first by `main.css`, `temple-base.css`,
`search-system.css`. Its gold `#D4AF37` is identical to the kit's Pantheon
Gold. Backgrounds are near-identical but differently named (`--void #030305`,
`--abyss #06060a`, `--deep #0c0c12` vs kit `--pc-obsidian #0A0A0C`,
`--pc-temple-black #121216`). Text: `--text-primary #F2F2F5` vs kit ivory
`#F4EFE4`. Fonts: site uses Cinzel (display, matches kit), **Montserrat**
(body; kit utilities assume Inter), Fira Code (mono). No variable-name
collisions with the kit's `--pc-*` namespace.

### 1.7 Lighthouse & image pipeline

`test/lighthouse.test.js` enforces ≥90 on performance / accessibility /
best-practices / SEO across an 18-page desktop sample (reports in
`docs/lighthouse/`). `scripts/convert-images-to-webp.js` (+ `.py`) converts
PNGs to WebP q85 and rewrites markup to `<picture>`; the Python scan currently
covers `assets/images/*.{png,jpg}` (top level only), `assets/images/mascots/`,
and `sites/*/assets/` — **not** any new brand directory (must be extended).

---

## 2. Kit docs vs repo reality (contradictions found)

| # | Kit claim | Repo reality |
|---|---|---|
| C1 | SITE_AUDIT §1.1: header reads "PŪNYCODEX (with combining macron)" | It is `P<span>U</span>NYCODEX` + a CSS `::before` bar, not a combining-macron character. Implication: text search for `Ū` finds nothing; the purge must target the span pattern and the CSS rules. |
| C2 | PLACEMENT-GUIDE A2: `/api/v1/docs/` is 404 | `api/v1/docs/index.js` exists and serves Swagger UI. Either fixed since the crawl or a deploy lag. Art placement for this page means editing that function's inline HTML. |
| C3 | PLACEMENT-GUIDE A3: `/scholars/` is 404 | `scholars/` portal exists (generated from `platform/public/scholars/`). |
| C4 | PLACEMENT-GUIDE A5: emoji in store (⚡🔥🍀), sponsorship (🌐🎓🎨📊), terms (€📖🔍📱🌐) | None present in current repo. Only `search.html` still ships emoji (⚙️🔮🌐🔱⚡🔍). The sponsorship/store/terms icon placements become upgrades, not emoji fixes. |
| C5 | PLACEMENT-GUIDE §CONTACT: "replace the phi glyph above the PuniCodex wordmark" | `contact/index.html` has no phi glyph; beacon-flame is a new placement. |
| C6 | SITE_AUDIT §2 lists Hekátē/Hēlios/Helheimr among bare-ring cards | Thumbs exist for those ids today (`assets/images/mascots/thumbs/small/`); some listed names (e.g. Gaṇeśa/`ganesa`) genuinely lack art. The fix is the error-branch default, not per-id art. |
| C7 | README: "26 page-attuned 3D renders" | 28 asset files (27 PNG + 1 MP4) — minor doc drift. |
| C8 | Kit emblem ivory/obsidian PNGs usable variants | Both are **defective**: 1600×119 px slivers showing only the top arc of the ring. Rejected. |
| C9 | Kit assumes serving root `/assets/brand/` exists | Repo has no such dir; served images live in `assets/images/`; `branding/` is unreferenced source material. §3 resolves this. |
| C10 | SITE_AUDIT §4/§A6: tiers + appraise H1s render white sans | Tiers confirmed (`css/tiers.css:204`, `#F2F2F5` — it *is* Cinzel, but white). Appraise H1 not individually verified; treat as same-class fix during implementation. |
| C11 | SITE_AUDIT §1.1: footer wordmark old, copyright new | Confirmed: `index.html:403` vs `:433`. |
| C12 | PLACEMENT-GUIDE A7: search.html blue palette + different header logo | Confirmed: `css/search-system.css` uses `--cn-blue`/`#4a7dff` accents and a "P" `.cn-logo-seal` (`search.html:29`, `search-v2.html:29`). Re-skin is out of this plan's scope; only the seal/wordmark swap is planned here. |

---

## 3. Destination layout

Serve the kit from **`/assets/brand/`**, preserving the kit's numbered
subdirectories verbatim. Rationale:

- The kit's own shipped code hardcodes `/assets/brand/…` paths
  (`06-code/punicodex-tokens.css` `url()`s, `06-code/site.webmanifest` icons,
  `06-code/integration-snippets.html`). Keeping the layout verbatim means
  zero path rewrites in those files.
- `vercel.json` already applies 1-year immutable caching to `/assets/**`.
- `branding/` is excluded: it is unreferenced source material (per-deity packs
  + old identity doc), not a served-asset location; mixing the new kit in
  would blur the old/new boundary.
- `assets/images/` stays as-is (per-deity mascots/logomarks, current icons);
  the kit is a self-contained sibling so future kit v2 drops are a clean
  directory swap.

Supporting placements outside `assets/brand/`:

- `css/punicodex-tokens.css`, `css/punicodex-motion.css` — the kit's two CSS
  files, served from `/css/` with everything else (their internal `url()`s are
  absolute and keep working).
- `assets/fonts/` — self-hosted woff2 + `OFL.txt` (new dir; see §7 for the
  conversion requirement).
- Root `manifest.json` — updated in place (not the kit's file verbatim; its
  icon URLs point at `/assets/brand/02-favicons/`).
- `docs/brand/BRAND_GUIDELINES.md` — verbatim copy of the kit guidelines as
  the canonical brand reference.

---

## 4. Per-file decision table (all 91 files)

Decision: **USE** (ships to the repo) or **REJECT** (stays in the kit, not
served). Display sizes are CSS pixels; all raster art also needs the §7
resize/WebP pass before use.

### 4.1 `01-logos/` — 8 use / 5 reject

| File | Decision | Variant | Destination | Placement | Rationale |
|---|---|---|---|---|---|
| `punicodex-wordmark-gold.png` | USE | gradient gold (primary) | `assets/brand/01-logos/` | Plain-text headers — `realms/index.html:88`, `lexicon/index.html:61`, `oracle.html:53,425`, `search.html`/`search-v2.html` logo text — at 140–220px | Guidelines' default wordmark on obsidian; replaces the non-macron drift variants |
| `punicodex-wordmark-gold-solid.png` | USE | flat `#D4AF37` | `assets/brand/01-logos/` | Temple global strip (all 9 `templates/flagship/*.html`, `scripts/generate-temples.js:592`) and 9 `platform/public/scholars/*.html` at ~120–140px; mobile menu header | Guidelines: solid below 140px — the strip is exactly that size; gradient would alias |
| `punicodex-wordmark-ivory.png` | REJECT | — | — | — | For busy/photo backgrounds; the obsidian site has none. Keep in kit for future |
| `punicodex-wordmark-obsidian.png` | REJECT | — | — | — | Light-surface variant; site is dark-only (print/docs use) |
| `punicodex-wordmark-camel-gold.png` | USE | "PuniCodex" editorial | `assets/brand/01-logos/` | Product mastheads: `type/index.html:114` ("PuniCodex TYPE"), `codex/index.html` masthead — at ~260–340px | Exists precisely for product sub-brands per guidelines §2.1 and audit §6 |
| `punicodex-tagline-gold.png` | REJECT | — | — | — | Redundant: stacked lockup already pairs wordmark+tagline; footers keep a text tagline |
| `punicodex-emblem-gold.png` | USE | ring+column+mark | `assets/brand/01-logos/` | Home hero replacing the inline psi SVG (`index.html:134-142`) at ~96–120px; ceremonial contexts | Audit §2: emblem is ownable, psi is a stock symbol |
| `punicodex-emblem-ivory.png` | REJECT | — | — | — | Defective file: 1600×119 sliver, only the ring's top arc rendered |
| `punicodex-emblem-obsidian.png` | REJECT | — | — | — | Same defect (1600×119 sliver); also a light-surface variant |
| `punicodex-emblem-glyph-gold.png` | USE | ringless glyph | `assets/brand/01-logos/` | <48px marks: `.cn-logo-seal` replacement (`search.html:29`, `search-v2.html:29`) at 36–44px; loader static fallback | Guidelines: ringless below 48px |
| `punicodex-emblem.svg` | USE | vector master | `assets/brand/01-logos/` | Any-size vector contexts; static fallback for the SMIL loader; source for future exports | Only vector emblem in the kit |
| `punicodex-lockup-horizontal-gold.png` | USE | emblem+wordmark+tagline row | `assets/brand/01-logos/` | Primary global header on the ~25 hand-maintained root pages (all `nav-wordmark` occurrences, §5 list) at 200–240px | Snippet §3's intended header form; kills the macron wordmark |
| `punicodex-lockup-stacked-gold.png` | USE | emblem/wordmark/tagline stack | `assets/brand/01-logos/` | Global footer (all `footer-wordmark` occurrences) at ~280–300px | Snippet §4's intended footer form |

### 4.2 `02-favicons/` — 10 use / 1 reject

| File | Decision | Destination | Placement | Rationale |
|---|---|---|---|---|
| `favicon.svg` | USE | `assets/brand/02-favicons/` | `<link rel="icon" type="image/svg+xml">` on every page — replaces the data-URI Ψ in 16 root files; added to 9 flagship templates + `generate-temples.js` | Modern primary icon (emblem, not psi) |
| `favicon.ico` | USE | `assets/brand/02-favicons/` | Legacy `rel="icon" sizes="any"` fallback | Legacy browsers / default fetch |
| `favicon-16x16.png` | USE | same | PNG fallback 16px | Snippet §1 set |
| `favicon-32x32.png` | USE | same | PNG fallback 32px | Snippet §1 set |
| `favicon-48x48.png` | USE | same | PNG fallback 48px | Completes the raster ladder |
| `favicon-64x64.png` | USE | same | PNG fallback 64px | Completes the raster ladder |
| `favicon-192x192.png` | USE | same | `manifest.json` icon 192 | PWA/Android icon |
| `favicon-512x512.png` | USE | same | `manifest.json` icon 512 (+ maskable pairing) | PWA/Android icon |
| `apple-touch-icon.png` | USE | same | `apple-touch-icon` 180×180 (obsidian bg — correct per Apple) | Replaces the old 128px icon |
| `mask-icon.svg` | USE | same | Safari pinned tab, `color="#D4AF37"` | Single-color silhouette as required |
| `punicodex-favicon-master-1024.png` | REJECT | — | — | Source master; no `<link>` ever references 1024px; keep in kit |

### 4.3 `03-ornaments/` — 7 use / 0 reject

| File | Decision | Destination | Placement | Rationale |
|---|---|---|---|---|
| `punicodex-empty-portrait.png` | USE | `assets/brand/03-ornaments/` | **The critical fix:** default card art in `js/pantheon.js:88-102` (`handleImgError` final swap instead of hide+skeleton) and `js/home.js:70` (onerror swap instead of shimmer); render at 150px, ship ~600px webp | Kills the bare-ring "broken image" look on home + pantheon (audit §2/§3, priority 3) |
| `punicodex-greek-key-strip.png` | USE | same | `.pc-keyband` frieze: above the global footer on root pages; under home hero; tiers page (`tiers/index.html` above footer) | Audit §8/§4: the "temple architrave" that closes pages |
| `punicodex-divider-diamond.png` | USE | same | Section breaks on home (existing `.section-divider` spots, e.g. `index.html:180`), tiers (before "Three Tiers", `tiers/index.html:143`), about — at ~480px, max one per viewport | Guidelines ornament system; richer than the CSS-only `.pc-divider` |
| `punicodex-laurel-wreath.png` | USE | same | Behind "Academic Collaborators" title (`js/university-collaborators.js:115 .uc-title`, strip mount `index.html:397`) at ~30% opacity; about "Built By" card (`about/index.html:148`); creatives All-Access card | Guidelines: laurel = scholarly achievement mark |
| `punicodex-medallion-frame.png` | USE | same | Overlay on built-portrait cards (pantheon/home polish pass) and temple gallery thumbs (`templates/flagship/gallery/index.html`) | Guidelines: medallion frame overlays deity portraits |
| `punicodex-glow-gold-radial.png` | USE | same | `.pc-atmosphere::before` — home hero only | Guidelines: atmosphere layers for heroes only |
| `punicodex-gold-dust-overlay.png` | USE | same | `.pc-atmosphere::after` — home hero only | Same hero-only rule |

### 4.4 `04-badges/` — 3 use / 0 reject

| File | Decision | Destination | Placement | Rationale |
|---|---|---|---|---|
| `punicodex-badge-tier-1.png` | USE | `assets/brand/04-badges/` | Tiers page seal row (`tiers/index.html:122-135` area) at ~200–240px; pantheon stats mini-seals (optional polish) | Audit §4 fix: replace bare stat cards with the seals |
| `punicodex-badge-tier-2.png` | USE | same | same | same |
| `punicodex-badge-dual-tier.png` | USE | same | same | same |

Note: guidelines say seals are always gold-on-obsidian and never recolored per
tier. The current site's tier accents (`--tier-1: emerald`, `--tier-2: blue`
in `css/design-system.css:40-42`) coexist with that; the seals deliberately
introduce the all-gold doctrine on the tiers page only — no global tier-color
change in this wave.

### 4.5 `05-social/` — 2 use / 1 reject

| File | Decision | Destination | Placement | Rationale |
|---|---|---|---|---|
| `punicodex-og-image-1200x630.png` | USE | `assets/brand/05-social/` | `og:image`/`twitter:image` on all root pages (17 files, §5) and base temples via `scripts/generate-temples.js:534,538,564`; JSON-LD `primaryImageOfPage` in `templates/flagship/index.html:48` + `scripts/enhance-flagships.js:81`. Replaces `assets/images/og-default.*` | Pre-built, correct stats-free design, raster (scraper-safe); retires the stale SVG |
| `punicodex-social-avatar-1024.png` | USE | same | `maskable` icon source in `manifest.json`; QR/link-preview contexts | Obsidian-bg square — correct maskable safe-zone artwork |
| `punicodex-brand-board.png` | REJECT | — | — | Internal presentation sheet, not web content |

### 4.6 `06-code/` — 2 use / 2 reject

| File | Decision | Destination | Placement | Rationale |
|---|---|---|---|---|
| `punicodex-tokens.css` | USE | `css/punicodex-tokens.css` | Loaded globally after `css/design-system.css` (see §6.6) | Brings `--pc-*` tokens + utilities (`.pc-display`, `.pc-kicker`, `.pc-keyband`, `.pc-medallion`, `.pc-atmosphere`) |
| `site.webmanifest` | USE | merged into root `manifest.json` | `<link rel="manifest">` already site-wide | Content used (name, theme `#0A0A0C`, kit icons); root manifest file location kept |
| `integration-snippets.html` | REJECT | — | — | Reference documentation; its patterns are embedded in this plan; not a served page |
| `tokens.json` | REJECT | — | — | Design-token source file; nothing at runtime consumes JSON tokens |

### 4.7 `07-fonts/` — 4 use / 0 reject (all perf-gated, §7)

| File | Decision | Destination | Placement | Rationale |
|---|---|---|---|---|
| `Cinzel.ttf` | USE | `assets/fonts/` (as subset woff2) | `@font-face` replacing the Google Fonts Cinzel request | Self-hosting removes a render-blocking third-party fetch; ship only after subset+woff2 conversion |
| `CormorantGaramond.ttf` | USE | same | same for Cormorant Garamond | 1.2 MB TTF — subsetting is mandatory |
| `CormorantGaramond-Italic.ttf` | USE | same | italic face | Same |
| `OFL.txt` | USE | `assets/fonts/OFL.txt` | ships alongside the fonts | SIL OFL requires the license to travel with the fonts |

Until the conversion lands, the existing Google Fonts links stay — self-hosting
is an optimization, not a blocker for steps 1–5.

### 4.8 `08-seals-stamps/` — 2 use / 0 reject

| File | Decision | Destination | Placement | Rationale |
|---|---|---|---|---|
| `punicodex-official-seal.png` | USE | `assets/brand/08-seals-stamps/` | `authenticity/index.html` result block ("Verified by the Codex") at 120px; appraise result context; sponsorship page footer accent | Guidelines: scarcity = authority — certificates/authenticity only, never page chrome |
| `punicodex-stamp-awaiting-restoration.png` | USE | same | Overlay on unbuilt temple cards (pantheon/home, with the empty-portrait) at 60–90% opacity, rotatable ±8°; optional 404 accent at 40% | Guidelines addendum explicitly sanctions this use |

### 4.9 `09-patterns/` — 1 use / 0 reject

| File | Decision | Destination | Placement | Rationale |
|---|---|---|---|---|
| `punicodex-tessellation-tile.png` | USE | `assets/brand/09-patterns/` | Tiers page section wrapper background at shipped opacity (audit §4); later codex/about section bands | Only pattern asset; 22 KB at 800px is fine as-is |

### 4.10 `10-motion/` — 2 use / 0 reject (progressive only, §7)

| File | Decision | Destination | Placement | Rationale |
|---|---|---|---|---|
| `punicodex-loader.svg` | USE | `assets/brand/10-motion/` | Home page loader, once per session (sessionStorage gate, removed on window `load`); 28px oracle-icon replacement in `search.html:121` | SMIL self-animated, no JS lib; must ship with the §7 reduced-motion/static fallback |
| `punicodex-motion.css` | USE | `css/punicodex-motion.css` | Loaded after tokens.css; powers `.pc-shimmer`, `.pc-reveal`, `.pc-art--float` | Ships with `prefers-reduced-motion` fallbacks already — keep them |

### 4.11 `11-print/` — 0 use / 5 reject

| File | Decision | Rationale |
|---|---|---|
| `punicodex-business-card-front.png` | REJECT | Print collateral (300dpi), not a web asset |
| `punicodex-business-card-back.png` | REJECT | Same |
| `punicodex-certificate-appraisal.png` | REJECT | Print A4; may later back an appraise PDF download — out of scope for the website wave |
| `punicodex-certificate-authenticity.png` | REJECT | Same (authenticity certificate PDF candidate later) |
| `punicodex-letterhead-a4.png` | REJECT | Print letterhead, not web |

### 4.12 `12-social-templates/` — 0 use / 3 reject

| File | Decision | Rationale |
|---|---|---|
| `punicodex-post-1080x1080.png` | REJECT | Social-channel template, not a site page |
| `punicodex-story-1080x1920.png` | REJECT | Same |
| `punicodex-x-header-1500x500.png` | REJECT | Same |

### 4.13 `13-page-visuals/` — 28 use / 2 reject

All renders are transparent PNGs pre-lit for obsidian; per placement guide they
ship with explicit `width`/`height`, `loading="lazy"` below the fold, and
`.pc-art--float` on hero art only (one moving object per viewport).

| File | Decision | Destination | Placement (page → DOM spot, size) | Rationale |
|---|---|---|---|---|
| `home/celestial-knot-hero.png` | USE | `assets/brand/13-page-visuals/home/` | `index.html` hero right-third (new `.hero-grid` two-col at `:131-152`), 640px, `fetchpriority="high"` | Signature home object; replaces the lone psi as the hero visual |
| `home/celestial-knot-square.png` | USE | same | Home "Own a Piece of the Pantheon" section ~420px; journal/articles band ~160px | Secondary home placements per guide |
| `home/celestial-knot-loop.mp4` | USE | same | Muted hero background video upgrade, poster = knot-hero PNG | 960×540 4s seamless, only 206 KB — progressive enhancement only (§7) |
| `pantheon/council-of-twelve.png` | USE | `…/pantheon/` | `pantheon/index.html` masthead right of H1, ~380px | Balances the filter pill rows |
| `realms/bifrost-stair.png` | USE | `…/realms/` | `realms/index.html` masthead beside "WHERE THE GODS DWELL", ~400px, float | Verticality matches the page's tall display type |
| `lexicon/mobius-ribbon.png` | USE | `…/lexicon/` | `lexicon/index.html` above the stats row, ~340px | Fills dead air between kicker and numbers |
| `connections/hopf-link.png` | USE | `…/connections/` | `connections/index.html` masthead right, ~360px | Two-metal duality echoes the cards' colored borders |
| `type/monolith-cursor.png` | USE | `…/type/` | `type/index.html` hero left of the "PuniCodex TYPE" masthead (`:114`), ~330px, two-column hero; terms "Type" card icon at 48–64px | Constraint-as-object metaphor for the type tool |
| `tiers/triad-ziggurat.png` | USE | `…/tiers/` | `tiers/index.html` between hero lead (`:119-121`) and stats (`:122`), centered ~520px | "The tier doctrine as architecture" — the page's altar |
| `codex/codex-icosahedron.png` | USE | `…/codex/` | `codex/index.html` above the title over the Ψ sigil (`:98`, drop sigil to .35 opacity), ~300px | Knowledge solid + existing watermark as aura |
| `api/api-lattice.png` | USE | `…/api/` | `api/v1/docs/index.js` Swagger page branded topbar ~48px + a `/api/` landing partial later; terms "Mobile/API" card icon | Machine graph for the API surface |
| `store/golden-brilliant.png` | USE | `…/store/` | `store/index.html` above "THE RELIQUARY" H1 (`:99`), ~380px; product-card (`:119+`) backdrops at 45% opacity | The one artifact that needs no description |
| `about/the-spark-eclipse.png` | USE | `…/about/` | `about/index.html` "The Spark" section (`:108`) right column above By-the-Numbers (`:140`), ~360px | Sits exactly at the story's pivot |
| `contact/beacon-flame.png` | USE | `…/contact/` | `contact/index.html` above the form-page title, ~200px | The page's metaphor (no phi exists there — C5) |
| `search/the-lens.png` | USE | `…/search/` | `search.html` empty state (`:136`, `:301`) replacing 🌐, ~300px; terms "Search" card icon | Scrutiny over the Unicode namespace |
| `oracle/armillary-sphere.png` | USE | `…/oracle/` | `oracle.html` as the **static fallback/poster** for the Three.js canvas (`:115`) — no-WebGL and reduced-motion users get the armillary instead of the live sphere | The oracle already has a live 3D core; the render crowns it where WebGL can't run |
| `appraise/golden-balance.png` | USE | `…/appraise/` | `appraise/index.html` right of the explainer paragraph, ~340px | Ceremony for a tool page |
| `authenticity/cylinder-seal.png` | USE | `…/authenticity/` | `authenticity/index.html` above the checker card, centered ~280px | Humanity's first authentication device |
| `scholars/golden-nib.png` | USE | `…/scholars/` | `platform/public/scholars/apply/index.html` masthead ~320px (public sponsorship entry); scholars search/login accent later | The scholar's instrument, on the portal's public face |
| `creatives/muse-flame.png` | USE | `…/creatives/` | `creatives/index.html` marketplace masthead right, ~320px | Student creativity as fire with form |
| `creatives/empty-pedestal.png` | USE | `…/creatives/` | `creatives/index.html:97` `#creatives-empty` empty state, ~280px + Cormorant italic line | An empty marketplace becomes an awaiting gallery |
| `university-sponsorship/academy-temple.png` | USE | `…/university-sponsorship/` | `university-sponsorship/index.html` hero centerpiece above the H1, ~420px | The institution in miniature |
| `university-sponsorship/icon-globe.png` | USE | same | Deliverables grid cards (`university-sponsorship/index.html:387` "What a Founding Collaborator Receives"), 56–64px | Gold icon set for the four receive-cards |
| `university-sponsorship/icon-mortarboard.png` | USE | same | same | same |
| `university-sponsorship/icon-barchart.png` | USE | same | same | same |
| `temple-template/portal-ring.png` | USE | `…/temple-template/` | `templates/flagship/index.html` behind each deity's hero art (z-index −1, ~110% width, .8 opacity) + `css/temple-base.css` for base temples — one template line upgrades 895 pages; **flagships first** (§7) | Every temple is a threshold |
| `legal/sealed-tablet.png` | USE | `…/legal/` | `privacy/index.html`, `terms/index.html`, `terms/data-use/index.html` beside each page title, ~140px, .85 opacity | Legal pages stay typographic; the tablet is their only ornament |
| `errors/toppled-column.png` | USE | `…/errors/` | `404.html` `<main class="page-404">` (`:66`) above the message, ~380px | Even the ruins keep the faith |
| `3d-visual-reel.png` | REJECT | — | — | Contact sheet of all renders; not a page asset |
| `PLACEMENT-GUIDE.txt` | REJECT (as served file) | — | — | Reference doc; its content is folded into this plan; stays in kit |

### 4.14 Kit root docs — 1 use / 2 reject

| File | Decision | Destination | Rationale |
|---|---|---|---|
| `BRAND_GUIDELINES.md` | USE (copy) | `docs/brand/BRAND_GUIDELINES.md` | Canonical brand reference lives with the repo docs |
| `README.md` | REJECT | — | Kit-internal map; superseded by this plan |
| `SITE_AUDIT.md` | REJECT (as file) | — | Findings absorbed here (with corrections, §2); keep in kit as historical record |

---

## 5. Old-brand purge list

Every old-brand rendering found in the repo, with its replacement. **Hand-edit
only the canonical files; `sites/**`, `scholars/**`, `admin-portal/**`
regenerate.**

### 5.1 Span-macron wordmark `P<span…>U</span>NYCODEX` (+ CSS macron bar)

Replacement — header: `punicodex-lockup-horizontal-gold.png` (200–240px);
footer: `punicodex-lockup-stacked-gold.png` (~280–300px); temple/scholars
strip: `punicodex-wordmark-gold-solid.png` (~120–140px).

Hand-maintained pages (nav N / footer F):

- `index.html:61` N, `:403` F
- `404.html:31` N, `:99` F
- `about/index.html:38` N, `:166` F
- `appraise/index.html:76` N, `:218` F
- `art/index.html:20` N
- `authenticity/index.html:28` N
- `codex/index.html:38` N, `:1812` F
- `codex/anatomy-of-a-punycode-domain/index.html:32` N, `:114` F
- `codex/building-the-temple/index.html:32` N, `:118` F
- `codex/why-greek-accents-matter/index.html:32` N, `:113` F
- `connections/index.html:40` N, `:233` F
- `contact/index.html:38` N, `:178` F
- `creatives/index.html:23` N (`global-brand`)
- `mobile/index.html:28` (slide logo), `:92` (app logo)
- `mobile/shield.html:18` (app logo)
- `pantheon/index.html:42` N, `:178` F
- `privacy/index.html:38` N, `:294` F
- `store/index.html:39` N, `:201` F
- `terms/index.html` N+F, `terms/data-use/index.html` N+F
- `tiers/index.html:51` N, `:472` F
- `type/index.html:51` N, `:289` F
- `university-sponsorship/index.html:319` N, `:466` F
- `extension/popup/popup.html:12`, `extension/options/options.html:12` — packaged extension: replace with plain `PUNICODEX` text (no remote image in popup; offline-hostile), drop `.popup-logo .accent` rule
- Header-drift variants: `realms/index.html:88` (plain `nav-logo`), `lexicon/index.html:61` (plain), `oracle.html:53` N + `:425` F (camel text), `search.html:28-32` + `search-v2.html:28-32` ("P" seal + text → `emblem-glyph-gold.png` + wordmark-gold)

Canonical generators/templates (edit → regenerate):

- `templates/flagship/index.html:57`, `lore/index.html:72`, `lore/extended/index.html:34`, `gallery/index.html:111`, `patterns/index.html:27`, `scholars/index.html:203`, `blog/index.html:90`, `creatives/index.html:20`, `patron/index.html:20` — `global-brand`
- `scripts/generate-temples.js:592` — base-temple `global-brand`
- `scripts/fix-flagship-nav.js:22`, `scripts/fix-main-footers.js:30` — canonical nav/footer markup held by one-off fix scripts (must not re-introduce the old mark)
- `platform/public/scholars/`: `admin/index.html:896`, `apply/index.html:342`, `creatives/index.html:26`, `creatives/creator.html:26`, `dashboard/index.html:570`, `institution/index.html:757`, `login/index.html:272`, `review/index.html:980`, `search/index.html:403` — `global-brand`

CSS macron-bar rules to delete:

- `css/main.css:258-271` (`.nav-wordmark span.accent(::before)`), `:620-633` (`.footer-wordmark …`)
- `css/temple-base.css:484-497` (`.global-brand span::before`)
- `templates/flagship/flagship.css:31-72` (`.global-brand` block incl. span rule — regenerates every `sites/*/styles.css` via `create-flagship.js:803`)
- `creatives/creatives.css:43-51`, `platform/public/scholars/creatives/creatives.css:402-410` (`.global-brand span`)
- `extension/popup/popup.css:61` (`.popup-logo .accent`)
- `mobile/css/mobile.css:104`, `:1924` (`.app-logo .accent`, `.slide-logo .accent` — gold-U coloring)

Generated (do NOT hand-edit; they pick up the fix on regeneration): `sites/**`
(2463 files), `scholars/**` (9).

### 5.2 Favicon system

Replacement: the kit favicon cluster (`favicon.svg`, ICO, PNG ladder,
apple-touch-icon, mask-icon, manifest icons).

- Data-URI Ψ favicon in 16 root files: `index.html:52`, `404.html`,
  `about/index.html:30`, `appraise/index.html`, `codex/index.html:30`,
  `codex/anatomy-of-a-punycode-domain/index.html`,
  `codex/building-the-temple/index.html`,
  `codex/why-greek-accents-matter/index.html`, `connections/index.html`,
  `contact/index.html`, `oracle.html`, `pantheon/index.html:34`,
  `privacy/index.html`, `store/index.html`, `tiers/index.html:33`,
  `type/index.html:43` — replace with snippet-§1 cluster (paths at
  `/assets/brand/02-favicons/`)
- Old icon files to retire once unreferenced: `assets/images/favicon-32x32.png/.webp`,
  `apple-touch-icon.png/.webp`, `icon192.png/.webp`, `icon512.png/.webp`
- `manifest.json` icons block → kit `favicon-192/512` (+ maskable from the
  social avatar); unify `theme_color`/`background_color` to `#0A0A0C`
- `mobile/manifest.json` + `mobile/icon192.png`, `mobile/icon512.png` → kit
  favicon 192/512 (PWA parity)
- Temples get favicon links for the first time: 9 `templates/flagship/*.html`
  `<head>` + `scripts/generate-temples.js` head builder

### 5.3 OG image

Replacement: `assets/brand/05-social/punicodex-og-image-1200x630.png`
(absolute URL `https://punicodex.com/assets/brand/05-social/punicodex-og-image-1200x630.png`).

- `assets/images/og-default.svg` (+ `.png`, `.webp`) — stale copy ("26 DOMAINS ·
  24 ARCHETYPES"); retire all three once unreferenced (also remove the
  `render_og_default()` step from `scripts/convert-images-to-webp.py:40-43`)
- References to update: `index.html:24,31`, `about/`, `appraise/`,
  `codex/index.html` + 3 codex articles, `connections/`, `contact/`,
  `oracle.html`, `pantheon/`, `privacy/`, `realms/`, `store/`, `tiers/`
  (`og:image`/`twitter:image` tags), `scripts/generate-temples.js:534,538,564`,
  `scripts/enhance-flagships.js:81`, `templates/flagship/index.html:48`
  (JSON-LD `primaryImageOfPage`). Flagship per-temple mascot `og:image` stays.

### 5.4 Old-brand image files (unreferenced stale assets)

None of these are referenced by served HTML/CSS/JS today — delete or archive
out of the repo:

- `branding/punicodex/brand/punicodex_wordmark_dark.png` — renders the old
  **PŪNYCODEX** wordmark
- `branding/punicodex/brand/punicodex_wordmark_light.png` — same, light variant
- `branding/punicodex/brand/punicodex_icon_dark.png`,
  `punicodex_icon_light.png` — old Ψ monogram
- `branding/punicodex/brand/punicodex_business_card.png`,
  `punicodex_social_template.png`, `punicodex_palette.png` — old-brand
  collateral
- `assets/images/punicodex_palette.png` + `.webp` — old palette sheet
- `branding/punicodex/punicodex_visual_identity_system.md` — old identity doc;
  mark superseded by `docs/brand/BRAND_GUIDELINES.md` (or delete with the dir)
- Home hero inline psi SVG (`index.html:134-142`) → `punicodex-emblem-gold.png`
- The per-deity packs under `branding/punicodex/{Deity}/` are content art
  (mascots/logolockups/hero videos), NOT old-brand — keep; they feed
  `sites/*/assets/`.

---

## 6. Implementation plan (SITE_AUDIT priority order)

Each step names its canonical files. After every step that touches a canonical
source or template: `npm run generate && npm test` (divergence gate + flywheel
validator). No `sites/`, `scholars/`, `admin-portal/` hand edits.

### Step 1 — Header/footer wordmark swap (kills the rebrand debt)

1. Copy the 70 USE assets into `assets/brand/` (verbatim numbered layout) —
   this is the only new served directory.
2. Root pages (§5.1 list, 25 files): replace the `nav-wordmark` anchor contents
   with `<img src="/assets/brand/01-logos/punicodex-lockup-horizontal-gold.png"
   alt="PuniCodex — The Unicode Pantheon" width="220">` (keep the
   `<a href="/" aria-label="PuniCodex home">` wrapper); replace
   `footer-wordmark` with the stacked lockup at ~300px. Fix the drift variants
   in the same pass (`realms`, `lexicon`, `oracle`, `search`, `search-v2`).
3. Temple strip: swap `global-brand` in all 9 `templates/flagship/*.html` and
   `scripts/generate-temples.js:592` to `wordmark-gold-solid.png` at ~130px;
   same for the 9 `platform/public/scholars/*.html`.
4. Delete the macron CSS rules (§5.1 list) and add `.global-brand img` /
   `.nav-wordmark img` / `.footer-wordmark img` sizing rules to `css/main.css`,
   `css/temple-base.css`, `templates/flagship/flagship.css`.
5. Update the canonical markup inside `scripts/fix-flagship-nav.js:22` and
   `scripts/fix-main-footers.js:30`.
6. Mobile PWA (`mobile/index.html`, `mobile/shield.html`): swap to the solid
   wordmark image; drop the gold-U accent rules in `mobile/css/mobile.css`.
7. `npm run generate && npm test`.

### Step 2 — Favicon system + OG image + manifest

1. Root pages: replace the data-URI Ψ favicon + old apple-touch-icon in the 16
   files (§5.2) with the kit cluster (snippet §1, paths verbatim).
2. Temples: add the cluster to the 9 flagship templates' `<head>` and to
   `scripts/generate-temples.js`'s head builder (first favicon the temples
   have ever had).
3. OG: swap all §5.3 references to the kit OG PNG; update
   `templates/flagship/index.html` JSON-LD and `scripts/enhance-flagships.js:81`.
4. `manifest.json`: kit icons + `#0A0A0C`; `mobile/manifest.json`: kit 192/512.
5. Retire `assets/images/og-default.*` and the old icon files once nothing
   references them (check with `git grep`); drop `render_og_default()` from
   `scripts/convert-images-to-webp.py`.
6. `npm run generate && npm test`.

### Step 3 — Empty-portrait default for unbuilt cards

1. Resize/convert `punicodex-empty-portrait.png` → ~600px WebP (§7).
2. `js/pantheon.js:88-102` (`handleImgError`): final fallback sets the img to
   the empty portrait instead of hiding it + `.is-skeleton`. Optionally, in
   `buildGrid` (`:53-59`), render the placeholder directly for `!a.built`.
3. `js/home.js:67-71`: replace the inline `onerror` shimmer with a swap to the
   empty portrait; render it directly for `!a.built` cards.
4. Optional per guidelines: overlay `punicodex-stamp-awaiting-restoration.png`
   at 60–90% opacity on `.archetype-card.unbuilt` (CSS, ±8° rotation allowed).
5. Lexicon: no change (text-only cards, §1.3).
6. `npm test` (js is not generated; no regen needed, but run the card/grid
   regression suites).

### Step 4 — Tiers page rebuild

1. `css/tiers.css:198-207`: `.tier-hero-title` → gold gradient text
   (`background: var(--pc-grad-gold-text); background-clip: text; color:
   transparent`) — or the `.pc-display` utility once tokens.css is loaded.
   Verify + fix the same class of issue on `appraise/index.html`'s H1 (C10).
2. `tiers/index.html`: insert `triad-ziggurat.png` (~520px) between the hero
   lead (`:119-121`) and stats (`:122`); replace the three bare stat
   presentation with the badge seals (`04-badges/`, ~200–240px, 3-up row);
   add `.pc-keyband` above the footer; `pc-tessellated` background on the
   cards section; diamond divider before "Three Tiers" (`:143-146`).
3. `npm test`.

### Step 5 — Ornament pass (home / about / collaborators / temples)

1. Home: `.pc-keyband` above the footer; `.pc-atmosphere` on the hero
   (`index.html:131`); diamond-divider treatment on existing
   `.section-divider` spots; laurel (~30%) behind the collaborators title
   (`js/university-collaborators.js:115`, mount `index.html:397`).
2. About: laurel on the "Built By" card (`about/index.html:148`); gold
   top-border + `.pc-kicker` on "By the Numbers" (`:140`).
3. Temples (polish): `.pc-keyband` between lore sections
   (`templates/flagship/lore/index.html`); `medallion-frame.png` overlay on
   gallery thumbs (`templates/flagship/gallery/index.html`); portal-ring
   behind flagship hero art (`templates/flagship/index.html`) — flagships
   first, measure LCP before extending to base temples via
   `css/temple-base.css`/`generate-temples.js`.
4. Page-visual placements from §4.13 land with their respective pages in this
   step (masthead art, empty states, icons).
5. `npm run generate && npm test`.

### Step 6 — tokens.css import strategy

1. Serve `css/punicodex-tokens.css` (kit file, paths verbatim) and load it
   **after** `css/design-system.css` everywhere `design-system.css` loads
   (`main.css`, `temple-base.css`, `search-system.css` load it first per its
   header comment — import order: design-system → punicodex-tokens →
   punicodex-motion).
2. Conflicts and resolutions:
   - Gold: identical (`#D4AF37`) — no action.
   - Backgrounds/text: different variable names (`--void/--abyss/--deep/
     --text-primary` vs `--pc-*`) — no runtime clash; migrate hard-coded hexes
     to `--pc-*` opportunistically over time (audit priority 6), not in this
     wave.
   - Fonts: kit utilities assume Inter (`--pc-font-sans`); the site body is
     Montserrat. Override `--pc-font-sans` to the existing Montserrat stack in
     a small `css/brand-overrides.css` loaded last, avoiding a third family
     download. Cinzel (display) and Cormorant (editorial) already load via
     Google Fonts.
   - Class names: `.pc-card`/`.pc-divider`/`.pc-kicker` are new; they coexist
     with existing `.card`/`.section-divider` styles — no collisions found.
   - Tier colors: existing `--tier-1: emerald`/`--tier-2: blue` remain; kit
     seals are all-gold by doctrine — scoped to the tiers page (§4.4 note).
3. `css/punicodex-motion.css` loads after tokens, progressive only (§7).
4. `npm run format:check && npm run lint && npm test` (CSS files aren't
   biome-covered, but keep style consistent: 2-space, single quotes n/a in CSS).

---

## 7. Performance budget & motion rules

The Lighthouse gate (`test/lighthouse.test.js`) requires ≥90 across
performance / accessibility / best-practices / SEO on an 18-page desktop
sample. Nothing in this plan may regress that.

### 7.1 Mandatory compression/resizing before use

| Asset group | Shipped size | Action before use |
|---|---|---|
| `13-page-visuals/*.png` (27 files) | 1.3–2.6 MB each, 1100–4787px | **Mandatory.** Resize to ≤2× display size (hero 1280w, mastheads 800w, icons 256w) + WebP q80 → expect 60–150 KB each. The portal-ring (2.1 MB) and academy-temple (2.1 MB) are the worst offenders |
| `01-logos/*.png` | 105–340 KB at 2860–3600px | Resize to 2× display (header 520w, footer 640w, strip 280w) + WebP; keep PNG fallback inside `<picture>` per pipeline convention |
| `03-ornaments/` laurel (334 KB, 7376×6994), medallion-frame (165 KB, 4787²), glow (214 KB, 2400²) | — | Resize (laurel 1600w, frame 1200w, glow 1600w) + WebP |
| `08-seals-stamps/` (512/358 KB, 4685–5385²) | — | Resize to 800–1000w + WebP |
| `02-favicons/`, `09-patterns/` | ≤100 KB | Fine as-is |
| `05-social/og-image` (72 KB), avatar (100 KB) | — | Fine as-is (PNG for scraper compatibility — do not WebP the og:image) |
| `07-fonts/*.ttf` | 125 KB–1.2 MB | **Do not ship TTFs.** Subset (latin + the site's Greek/diacritic coverage) and convert to woff2 before enabling self-hosting; otherwise keep Google Fonts |
| Pipeline | — | Extend `scripts/convert-images-to-webp.py` `scan_and_convert()` with an `assets/brand` glob (currently scans `assets/images/*`, `assets/images/mascots/`, `sites/*/assets/` only) |

### 7.2 Loading rules (all new `<img>` placements)

- Always explicit `width`/`height` (CLS) — the placement guide's fragments
  already include them; keep them.
- `fetchpriority="high"` only on each page's hero art; `loading="lazy"` on
  everything below the fold; `decoding="async"` elsewhere.
- Budget: ≤ ~250 KB of added image weight per page (post-conversion); one
  hero-tier image per page max.

### 7.3 Motion rule (progressive enhancement only)

- `celestial-knot-loop.mp4` (206 KB): `<video muted loop playsinline
  preload="none" poster="…/celestial-knot-hero.png">`; autoplay only when
  `prefers-reduced-motion: no-preference` AND `navigator.connection.saveData`
  is false; reduced-motion users get the poster. Never above text contrast
  thresholds (opacity ≤ .5 per guide).
- `punicodex-loader.svg` (SMIL): home only, once per session
  (`sessionStorage`), removed on window `load` per snippet §10. SMIL ignores
  CSS reduced-motion — gate it in JS (`matchMedia('(prefers-reduced-motion:
  reduce)')` → skip the loader entirely / show static `emblem.svg`).
- `.pc-art--float` on hero art only; one moving object per viewport (kit rule
  C3). `punicodex-motion.css`'s reduced-motion fallbacks must not be removed.
- Portal-ring: flagships first; it is a decorative `z-index:-1` layer so it
  must not become the LCP element — measure `/sites/zeus/` LCP before
  extending to base temples.

---

## 8. Rejected assets — one-line reasons (21)

- `01-logos/punicodex-wordmark-ivory.png` — for busy/photo backgrounds the obsidian site doesn't have.
- `01-logos/punicodex-wordmark-obsidian.png` — light-surface variant; dark-only site (print/docs use).
- `01-logos/punicodex-tagline-gold.png` — stacked lockup already includes the tagline.
- `01-logos/punicodex-emblem-ivory.png` — defective: 1600×119 sliver of the ring's top arc.
- `01-logos/punicodex-emblem-obsidian.png` — same defect; also light-surface.
- `02-favicons/punicodex-favicon-master-1024.png` — source master; no markup references 1024px.
- `05-social/punicodex-brand-board.png` — internal presentation sheet.
- `06-code/integration-snippets.html` — reference doc; patterns embedded in this plan.
- `06-code/tokens.json` — token source; no runtime consumer.
- `11-print/punicodex-business-card-front.png` — print collateral.
- `11-print/punicodex-business-card-back.png` — print collateral.
- `11-print/punicodex-certificate-appraisal.png` — print A4 (possible appraise-PDF later; out of scope).
- `11-print/punicodex-certificate-authenticity.png` — print A4 (same).
- `11-print/punicodex-letterhead-a4.png` — print letterhead.
- `12-social-templates/punicodex-post-1080x1080.png` — social channel, not the site.
- `12-social-templates/punicodex-story-1080x1920.png` — social channel.
- `12-social-templates/punicodex-x-header-1500x500.png` — social channel.
- `13-page-visuals/3d-visual-reel.png` — contact sheet of the render family.
- `13-page-visuals/PLACEMENT-GUIDE.txt` — reference doc; folded into this plan.
- `README.md` (kit root) — kit-internal map; superseded by this plan.
- `SITE_AUDIT.md` (kit root) — findings absorbed with corrections (§2); historical.

---

## 9. Verification checklist for the implementation wave

1. `git grep -E 'P<span[^>]*>U</span>NYCODEX'` → zero outside `session-debug/`
   and the kit dir (it currently reports ~2537 occurrences).
2. `git grep 'og-default'` → zero outside scripts being retired; `git grep
   'CE%A8'` (data-URI Ψ) → zero.
3. `npm run generate && npm test` green (flywheel validator + divergence
   gate); `npm run format:check && npm run lint` green.
4. Lighthouse sample (`test/lighthouse.test.js`) still ≥90/90/90/90 — check
   `docs/lighthouse/` reports, especially home (hero art) and one temple
   (portal-ring).
5. Spot-check one page per changed class in a browser: `/`, `/pantheon/`,
   `/tiers/`, `/sites/zeus/`, `/404.html`, `/scholars/login/`.
