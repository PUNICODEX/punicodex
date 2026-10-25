# Reliquary Store — Product Configurator Design

**Goal:** turn each product page (e.g. `/store/aigyptos/tee/`) into a real
configurator: pick the artwork (mascot / logomark / logolockup chips), pick
the garment color from every color Printful actually offers, and see a live
mockup that reflects both — including the white garment when White is
selected. Art choices are independent per product, so "mascot on the hoodie,
logomark on the shirt" is just two PDP visits. Later, licensed temple
creatives and gallery art join the same chips.

Store pages are GENERATED — all work happens in the generators and shared
assets; never hand-edit `store/` pages.

## What already exists (the foundation)

- `store/products.json` (canonical, 7,132 products): per-product
  `assets.mascot|logomark|logolockup` (transparent art), `design.placements`
  (front/back mapping), `printfulVariants` keyed `"Color / Size" → variantId`,
  `mockupImage`, `printfulProductId`.
- `scripts/build-variant-pricing.js`, `backfill-printful-variants.js`,
  `sync-printful-products.js`, `generate-printful-mockups.js` — Printful ops.
- Print masters at `sites/{id}/assets/`; composites gitignored, served from
  the masters host.

## Architecture

### 1. Data layer (products.json extensions, built by generate-pod-products.js)

```jsonc
{
  "artworks": [
    { "key": "mascot",     "label": "Mascot",     "src": "/sites/{id}/assets/{id}_mascot.webp" },
    { "key": "logomark",   "label": "Logomark",   "src": "…" },
    { "key": "logolockup", "label": "Logo lockup","src": "…" }
    // P4: { "key": "creative:abc123", "label": "…", "src": "…", "license": "temple-creative" }
  ],
  "colors": [
    { "name": "Black", "hex": "#1a1a1a", "mockup": "base/tee-black.png" },
    { "name": "White", "hex": "#f5f2ea", "mockup": "base/tee-white.png" }
  ],
  "placement": { "area": "front", "assetKey": null, "widthPct": 38, "topPct": 30 }
}
```

- `colors` derives from `printfulVariants` keys (unique color names) joined
  to a **Printful color-name → hex table** (one shared module,
  `scripts/printful-color-table.js`; ~30 standard Printful colors).
- More colors = run `backfill-printful-variants.js` + catalog sync to pull
  every color Printful offers per product type, then regenerate.

### 2. Mockup rendering — client-side compositing (P1/P2)

Render the preview by layering art over a **garment base mockup** (a
transparent-PNG garment photo per product-type × color):

```
<div class="cfg-stage">
  <img class="cfg-garment" src="base/tee-white.png">   <!-- swaps with color -->
  <img class="cfg-art" src="…mascot.webp"              <!-- swaps with art -->
       style="--w:38%; --top:30%">                     <!-- from placement -->
</div>
```

- Why client-side: art × color combinations explode (3 arts × 8 colors × 13
  kinds); compositing gives instant feedback with N+M assets instead of N×M
  renders. The white toggle IS the White color chip selecting the white base
  mockup — one mechanism, no special case.
- Base mockup set: transparent garment templates per kind × color
  (~13 kinds × 8–12 colors). Source: extract blanks via the Printful mockup
  generator (`generate-printful-mockups.js` with an empty/placeholder print)
  or craft from the existing composites; store under `assets/store-base/`
  (committed — they are platform bakes, like OG cards).
- Realism upgrade (P3): for the *selected* combo, optionally fetch a true
  Printful mockup (API, cached by `product+art+color` key, skip-existing
  doctrine) and crossfade it in. Nice-to-have, never blocking.

### 3. PDP UI (generated into each product page by generate-store-pages.js)

- **Art chips**: row of small boxes (48px, transparent art on the site's
  dark swatch, selected = gold ring) from `artworks[]`.
- **Color chips**: circles of `hex`, label on hover/ARIA, from `colors[]`;
  includes White. Disabled state if a color lacks the chosen size.
- **Size**: existing selector, filtered by chosen color's `printfulVariants`.
- **Stage**: layered mockup (§2); alt text describes the current combo.
- **State → checkout**: chosen `artworkKey + color + size` resolve to the
  Printful variant id at checkout time; art flows as order metadata (P3:
  mapped to per-art printfiles for fulfillment).

### 4. Cross-product combinations

No special machinery: each PDP owns its art/color choice; the cart line
records `{ productId, variantId, artworkKey }`. "Different art per garment"
is the default, not a feature flag.

### 5. Creatives wiring (P4)

`temple creatives` (approved, licensed) and curated gallery art appear in
`artworks[]` with a `license` field; the chip row is already data-driven.
Fulfillment needs the creative's high-res asset as the print file — reuse
the creative pipeline's stored originals. Rights gate: only `approved` +
`license: merchandise-ok` creatives qualify (policy decision before P4).

## Phases

- **P0 — now:** alphabetical ordering of items within store groups
  (generator change, one line of sort); this design doc.
- **P1 — data + assets:** products.json extensions; Printful color table;
  base-mockup garment set; configurator JS/CSS (`store-configurator.js`,
  temple-base.css companion); contract test on products.json shape.
- **P2 — PDP integration:** generator emits chips + stage; selection state;
  regenerate all store pages.
- **P3 — Printful realism + fulfillment:** per-art printfiles, order
  metadata → Printful files API, cached true mockups, color backfill for the
  full catalog range. Needs the Printful API key in env.
- **P4 — creatives art:** licensed-art chips + fulfillment from creative
  originals.

## Guardrails

- Generator-only changes; run `npm run generate`; divergence gate must pass.
- Every JS/CSS edit ships with a `?v=` bump (`tools/bump-asset-versions.js`).
- Printful ops scripts stay out of `npm run generate` (existing doctrine).
- New contract suite: configurator data shape (artworks/colors/placement)
  per product kind, registered in `test/run-all.js` + `prepush-gate.js`.
- Never block purchase: if JS fails, the page still shows the default
  product and buys the default variant (progressive enhancement).
