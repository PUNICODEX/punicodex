# PuniCodex — Site Audit & Enhancement Map

Audit of punicodex.com, 2026-07-18. Pages reviewed: Home, Pantheon, Temple (Zeús Lore),
Tier System, Type, About. Severity: 🔴 brand-breaking · 🟡 visual gap · 🟢 polish.

---

## 1. Global (every page)

### 🔴 1.1 The old wordmark is still live site-wide
Header top-left reads **PŪNYCODEX** (with combining macron) on every page reviewed, and
the footer wordmark on Home says PŪNYCODEX while the copyright line says PuniCodex.
The rebrand is half-done — this is the single most important fix.
**Fix:** replace with `01-logos/punicodex-wordmark-gold.png` (header, ~200–240px wide)
and `01-logos/punicodex-lockup-stacked-gold.png` (footer, ~300px). Snippets §3–4 in
`06-code/integration-snippets.html`. Search templates for `Ū`, `PŪNY`, `PUNYCODEX` —
including temple sub-headers (see §5).

### 🔴 1.2 No favicon system / OG image
**Fix:** `02-favicons/` + snippets §1–2. OG image is pre-built at
`05-social/punicodex-og-image-1200x630.png` — every shared link becomes a gold seal.

### 🟡 1.3 No ornamental system — pages are type-only
The design language (obsidian + gold serif) is strong but the pages lack the friezes,
dividers and seals that would make it read "enterprise archive" instead of "dark blog".
**Fix:** `03-ornaments/` + `.pc-divider`, `.pc-keyband` utilities in tokens.css.

---

## 2. Home (`/`)

- 🟢 **Hero** — the phi-style glyph works, but the **emblem** (`emblem-gold.png`) is
  stronger and *ownable* (phi is a stock symbol). Either swap, or keep phi and add
  atmosphere: `.pc-atmosphere` wrapper (glow + dust). Recommended: emblem.
- 🔴 **Pantheon grid — empty medallions.** Dozens of cards render bare gold rings
  (Hē, Hekátē, Helheimr, Hēlios, Hēméra, Gaṇeśa, Hāḇel, Hēphaistos, Hēra, Hēraklēs,
  Hermēs, Hestia…). It reads as broken images.
  **Fix:** `03-ornaments/punicodex-empty-portrait.png` as the default card art
  (snippet §5) — ring + dim column glyph + inner glow, perfectly on-palette.
- 🟡 **Existing portraits** would sharpen with the `medallion-frame.png` overlay and a
  uniform ring shadow (`--pc-ring-medallion`).
- 🟡 **Tier chips** sit at inconsistent heights across cards. Equalize card body height
  or pin chips to the card bottom (flex `margin-top: auto`).
- 🟢 **Academic Collaborators** — add the laurel wreath (dimmed, ~30% opacity) behind
  the section title; it's the scholarly-achievement mark.

## 3. Pantheon (`/pantheon/`)

- 🔴 Same empty-medallion issue at scale (196 cards — the majority unbuilt).
- 🟡 The 25 filter pills wrap loosely; group them (Tier / Tradition / Order / Status)
  with `.pc-kicker` labels above each cluster.
- 🟢 Stats row (196 Total / 74 T1 / 119 T2) could become mini-seals using badge art.

## 4. Tier System (`/tiers/`)

- 🔴 **Sparsest page** — huge dead obsidian field: kicker, giant white(!) heading,
  paragraph, three stat cards, done. The white "THE TIER SYSTEM" heading also breaks
  the gold-heading convention used elsewhere ("THE PANTHEON" is gold).
  **Fix:**
  1. Make the H1 `.pc-display` (gold gradient text).
  2. Replace the three bare stat cards with the tier seals
     (`04-badges/punicodex-badge-tier-1.png`, `-tier-2.png`, `-dual-tier.png`).
  3. Add `pc-keyband` frieze under the hero block and a diamond divider before the
     "Three Tiers" detail section.
- 🟡 "See the Three Tiers" CTA duplicates the on-page anchors — fine, but give the
  section an ornamental anchor marker.

## 5. Temple pages (`/sites/*/lore/`)

- 🔴 **Sub-header still PŪNYCODEX** (small gold serif, top bar). Swap to
  `wordmark-gold.png` at ~140px or emblem-glyph + "PUNICODEX" text link home.
- 🟢 The deity lockup (Zeús with lightning-bolt mark + per-temple nav) is the best
  design on the site — the new brand kit deliberately matches its energy.
- 🟡 Add `pc-keyband` between lore sections and the medallion frame on gallery thumbs.

## 6. Type (`/type/`)

- 🟢 Strong page: "PuniCodex TYPE" mixed-case masthead is exactly why
  `wordmark-camel-gold.png` exists — consider using it for product sub-brands
  (PuniCodex Type, PuniCodex Codex, PuniCodex API).
- 🟡 The three numbered feature cards (01/02/03) are good; add gold ring hover
  (`.pc-card`) and the diamond divider above the stats row.

## 7. About / Origins (`/about/`)

- 🟢 Best typography on the site — Cormorant-style headings, drop-cap energy. Keep.
- 🟡 "By the Numbers" panel: add gold top-border + `.pc-kicker` heading treatment;
  consider Cinzel numerals for the figures.
- 🟢 Laurel wreath belongs on the "Built By" card (single-hand-craft story).

## 8. Footer (global)

- 🔴 Old wordmark (see §1.1).
- 🟡 Add `.pc-keyband` frieze along the footer top edge — a temple architrave to close
  every page. Add the social avatar to link previews/QR contexts.

---

## Priority order

1. **Header/footer wordmark swap** (global, one template each) — kills the rebrand debt.
2. **Favicon + OG tags** (one `<head>` partial).
3. **Empty-portrait default** (one card-template branch: `if !portrait → placeholder`).
4. **Tiers page rebuild** with seals + gold H1 + frieze.
5. **Ornament pass** (dividers/keybands/laurels) across home, about, collaborators.
6. **Import tokens.css**, migrate hard-coded hexes to `--pc-*` tokens over time.
