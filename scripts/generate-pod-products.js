#!/usr/bin/env node
/**
 * PuniCodex — POD product catalog generator.
 * Builds store/products.json from flagship archetypes: each temple gets a
 * print-on-demand line carrying its three brand materials — the mascot
 * (illustrated deity), the logomark (compact temple seal), and the
 * logolockup (horizontal name lockup) — assigned per product by what
 * actually reads well on the garment/object. A house line carries the
 * PuniCodex brand itself.
 *
 * Phase 1: links point at the temple + Printful storefront placeholders.
 * Phase 2 (API): sync real Printful product IDs via PRINTFUL_API_KEY
 * (scripts/sync-printful-products.js). Synced printful* fields are
 * preserved across regenerations.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
const { hexForColor, isColorWord, normalizeColorName } = require(path.join(__dirname, 'printful-color-table.js'));

function templeAssets(a) {
  const base = `/sites/${a.id}/assets/${a.id}`;
  return {
    mascot: `${base}_mascot.webp`,
    logomark: `${base}_logomark.webp`,
    logolockup: `${base}_logolockup.webp`,
    // Print-only composites (PNG masters; see generate-merch-composites.js)
    compSticker: `${base}_comp-sticker.png`,
    compCanvas: `${base}_comp-canvas.png`,
    compTote: `${base}_comp-tote.png`,
    compMug: `${base}_comp-mug.png`,
    compNotebook: `${base}_comp-notebook.png`,
  };
}

const HOUSE_ASSETS = {
  wordmark: '/assets/brand/01-logos/punicodex-wordmark-camel-gold.webp',
  wordmarkSolid: '/assets/brand/01-logos/punicodex-wordmark-gold-solid.webp',
  emblem: '/assets/brand/01-logos/punicodex-emblem-gold.webp',
  glyph: '/assets/brand/01-logos/punicodex-emblem-glyph-gold.webp',
  lockupH: '/assets/brand/01-logos/punicodex-lockup-horizontal-gold.webp',
  lockupS: '/assets/brand/01-logos/punicodex-lockup-stacked-gold.webp',
  compSticker: '/assets/brand/01-logos/punicodex_comp-sticker.png',
  compPoster: '/assets/brand/01-logos/punicodex_comp-poster.png',
};

// Composites are print-only masters (gitignored from the main deploy); the
// dedicated masters host serves them publicly for store card imagery.
const MASTERS_BASE = 'https://punycodex-masters.vercel.app';

// Phase-1 fallback variant maps: when PRINTFUL_API_KEY is not available the
// catalog still needs deterministic labels/ids/prices so store pages render
// and the test suite stays green. Checkout rejects unsynced products
// (printfulProductId is null), so these placeholders never reach Printful.
const FALLBACK_VARIANTS = {
  tee: {
    labels: ['Black / S', 'Black / M', 'Black / L', 'Black / XL', 'Black / 2XL', 'White / S', 'White / M', 'White / L', 'White / XL', 'White / 2XL'],
  },
  hoodie: {
    labels: ['Black / S', 'Black / M', 'Black / L', 'Black / XL', 'Black / 2XL', 'Black / 3XL'],
  },
  crewneck: {
    labels: ['Black / S', 'Black / M', 'Black / L', 'Black / XL', 'Black / 2XL'],
  },
  print: {
    labels: ['30×40 cm', '50×70 cm', '70×100 cm'],
    deltas: [0, 5, 10],
  },
  canvas: {
    labels: ['10″×10″', '12″×16″', '16″×20″', '20″×30″'],
    deltas: [0, 5, 10, 20],
  },
  sticker: { labels: ['One size'] },
  pin: { labels: ['One size'] },
  mug: { labels: ['11 oz', '15 oz'], deltas: [0, 2] },
  tumbler: { labels: ['One size'] },
  tote: { labels: ['One size'] },
  phonecase: { labels: ['iPhone 14', 'iPhone 15', 'Samsung S24'] },
  cap: { labels: ['One size'] },
  notebook: { labels: ['One size'] },
};

function fallbackVariantId(productId, i) {
  let h = 0;
  for (const c of productId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 900_000_000 + ((h + i) % 99_000_000);
}

// ─── Configurator decorations (artworks / colors / placement) ───// The Reliquary PDP configurator (js/store-configurator.js) is data-driven off
// these fields. artworks lists the transparent brand arts a buyer can choose
// between (print-only `_comp-` composites are excluded — they are pre-baked
// print masters, not choosable overlay art). colors derives from the variant
// map the same way the PDP always has (slash labels + bare color words) and
// joins the Printful color table for hex chips. placement is per-kind garment
// geometry for the live mockup overlay; object kinds get null and the
// configurator falls back to art-swap preview.

const OVERLAY_KINDS = new Set(['tee', 'hoodie', 'crewneck', 'cap', 'tote']);

// widthPct/topPct/leftPct position the art overlay on the garment base image
// (percent of stage width/height; leftPct 50 = centred, translateX(-50%)).
// widthPct/topPct/leftPct position the art overlay on the garment base image
// (percent of stage; leftPct 50 = centred, translateX(-50%)). Values are
// measured against the square blank flat-lays (assets/store-base/) — chest
// band ≈ y 26–34% of stage depending on kind. `tall` is the override for
// portrait arts (mascot etc.): same spot, narrower so the art never spills
// off the garment; baked onto the artwork as art.placement.
const PLACEMENTS = {
  tee: { area: 'front', widthPct: 34, topPct: 26, leftPct: 50, tall: { widthPct: 25, topPct: 23, leftPct: 50 } },
  hoodie: { area: 'front', widthPct: 21, topPct: 28, leftPct: 33, tall: { widthPct: 27, topPct: 24, leftPct: 50 } },
  crewneck: { area: 'front', widthPct: 36, topPct: 28, leftPct: 51, tall: { widthPct: 27, topPct: 26, leftPct: 51 } },
  cap: { area: 'front', widthPct: 24, topPct: 30, leftPct: 50, tall: { widthPct: 17, topPct: 27, leftPct: 50 } },
  tote: { area: 'front', widthPct: 36, topPct: 27, leftPct: 50, tall: { widthPct: 27, topPct: 25, leftPct: 50 } },
};

const ARTWORK_LABELS = {
  mascot: 'Mascot',
  logomark: 'Logomark',
  logolockup: 'Logo lockup',
  wordmark: 'Wordmark',
  wordmarkSolid: 'Wordmark (solid)',
  emblem: 'Emblem',
  glyph: 'Glyph',
  lockupH: 'Lockup (horizontal)',
  lockupS: 'Lockup (stacked)',
};

// Sync image-dimension reader (WebP/PNG/JPEG headers) — decorateProduct is
// synchronous, so sharp's async metadata can't be used here. Returns
// { w, h } or null.
function imageSizeSync(file) {
  try {
    const buf = fs.readFileSync(file);
    if (buf.length > 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      const fmt = buf.toString('ascii', 12, 16);
      if (fmt === 'VP8 ') {
        return { w: (buf[26] | (buf[27] << 8)) & 0x3fff, h: (buf[28] | (buf[29] << 8)) & 0x3fff };
      }
      if (fmt === 'VP8L') {
        const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
        return { w: 1 + (((b1 & 0x3f) << 8) | b0), h: 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
      }
      if (fmt === 'VP8X') {
        return {
          w: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
          h: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
        };
      }
    }
    if (buf.length > 24 && buf.toString('ascii', 1, 4) === 'PNG') {
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let off = 2;
      while (off + 9 < buf.length) {
        if (buf[off] !== 0xff) { off++; continue; }
        const marker = buf[off + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { h: buf.readUInt16BE(off + 5), w: buf.readUInt16BE(off + 7) };
        }
        off += 2 + buf.readUInt16BE(off + 2);
      }
    }
  } catch {
    /* unreadable — treated as unknown aspect */
  }
  return null;
}

const ART_SIZE_CACHE = new Map();
function artIsPortrait(src) {
  if (!src || !src.startsWith('/')) return false;
  if (!ART_SIZE_CACHE.has(src)) {
    ART_SIZE_CACHE.set(src, imageSizeSync(path.join(ROOT, src)));
  }
  const dims = ART_SIZE_CACHE.get(src);
  return Boolean(dims && dims.h > dims.w * 1.15);
}

function buildArtworks(assets, kind) {
  const placement = PLACEMENTS[kind];
  return Object.keys(assets)
    .filter((k) => !k.startsWith('comp'))
    .map((k) => {
      const art = { key: k, label: ARTWORK_LABELS[k] || k, src: assets[k] };
      // Portrait arts (mascot, stacked lockups, …) use the kind's `tall`
      // geometry — same spot, narrower, so nothing spills off the garment.
      if (placement && placement.tall && artIsPortrait(assets[k])) {
        art.placement = { ...placement.tall };
      }
      return art;
    });
}

// Blank-garment base mockups per kind+colour (scripts/fetch-store-base-images.js
// or scripts/generate-store-base-mockups.js). Absent file → no mockup joins,
// colours still render as chips and the configurator falls back to the
// interim filter path.
function loadBaseColors() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'store', 'base-colors.json'), 'utf8'));
  } catch {
    return {};
  }
}
const BASE_COLORS = loadBaseColors();

// Licensed temple creatives (store/creative-artworks.json, committed by
// scripts/sync-store-creatives.js). Absent file → no creative chips.
function loadCreativeArtworks() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'store', 'creative-artworks.json'), 'utf8'));
  } catch {
    return {};
  }
}
const CREATIVE_ARTWORKS = loadCreativeArtworks();

function buildColors(product, kind, unknown) {
  const names = new Set();
  for (const label of Object.keys(product.printfulVariants || {})) {
    if (label.includes(' / ')) {
      names.add(label.split(' / ')[0]);
    } else if (isColorWord(label)) {
      names.add(label);
    }
  }
  const baseByName = new Map(
    (BASE_COLORS[kind] || []).map((c) => [normalizeColorName(c.name), c]),
  );
  return [...names].sort((a, b) => a.localeCompare(b, 'en')).map((name) => {
    const base = baseByName.get(normalizeColorName(name));
    // The catalog color_code is Printful's own exact tone — it wins over the
    // hand table; the table remains the fallback for names the base index
    // doesn't carry.
    const hex = (base && base.hex) || hexForColor(name);
    if (hex === null && unknown) unknown.add(name);
    const out = { name, hex };
    if (base && base.image) out.mockup = base.image;
    return out;
  });
}

function decorateProduct(product) {
  const kind = product.id.split('-').pop();
  product.artworks = buildArtworks(product.assets, kind);
  // Licensed temple creatives (P4) join the art chips — the rights gate ran
  // at sync time (approved + merch_consent + temple link), so anything in the
  // index is safe to offer here.
  const temple = product.temple || product.id.split('-').slice(0, -1).join('-');
  for (const c of CREATIVE_ARTWORKS[temple] || []) {
    const art = {
      key: `creative:${c.id}`,
      label: c.title,
      src: c.src,
      license: 'temple-creative',
      creator: c.creator || undefined,
    };
    // Licensed creatives have arbitrary aspect ratios — measure and give
    // portrait pieces the tall geometry just like the brand arts.
    if (PLACEMENTS[kind] && PLACEMENTS[kind].tall && artIsPortrait(c.src)) {
      art.placement = { ...PLACEMENTS[kind].tall };
    }
    product.artworks.push(art);
  }
  product.colors = buildColors(product, kind, decorateProduct.unknownColors);
  product.placement =
    PLACEMENTS[kind] && OVERLAY_KINDS.has(kind)
      ? (({ area, widthPct, topPct, leftPct }) => ({ area, widthPct, topPct, leftPct }))(PLACEMENTS[kind])
      : null;
}

function applyFallbackVariants(product) {
  const kind = product.id.split('-').pop();
  const spec = FALLBACK_VARIANTS[kind];
  if (!spec) return;
  if (!product.printfulVariants) {
    const map = {};
    spec.labels.forEach((label, i) => {
      map[label] = fallbackVariantId(product.id, i);
    });
    product.printfulVariants = map;
    product.printfulVariantCount = spec.labels.length;
  }
  if (!product.variantPricing) {
    const map = {};
    spec.labels.forEach((label, i) => {
      const delta = (spec.deltas && spec.deltas[i]) || 0;
      map[label] = Math.round((product.price + delta) * 100);
    });
    product.variantPricing = map;
  }
}

function cardImage(assets, design) {
  const primary = assets[design.placements[0].asset];
  if (primary.endsWith('.png') && primary.includes('_comp-')) {
    return `${MASTERS_BASE}/${primary.split('/').pop()}`;
  }
  return primary;
}

// The mockup batch (scripts/generate-printful-mockups.js) writes to
// .masters/mockups/{productId}.jpg and hosts the files on the masters origin.
// If a local mockup exists but products.json has no mockupImage, restore the
// URL here so store cards never fall back to a plain mascot after a clean
// regeneration.
function inferredMockupImage(id) {
  const mockupFile = path.join(ROOT, '.masters', 'mockups', `${id}.jpg`);
  if (fs.existsSync(mockupFile)) {
    return `${MASTERS_BASE}/mockups/${id}.jpg`;
  }
  return undefined;
}

// design.placements describes which material prints where — the sync worker
// maps `area` onto Printful placements (front/back/label).
const LINES = [
  {
    kind: 'tee',
    category: 'apparel',
    name: (a) => `${a.name} Temple Tee`,
    price: 38.0,
    blurb: (a) => `${a.name} across the chest, the ${a.name} lockup riding the shoulders. Heavyweight organic cotton.`,
    design: {
      placements: [
        { area: 'front', asset: 'mascot', note: 'full mascot, centre chest' },
        { area: 'back', asset: 'logolockup', note: 'lockup across the upper back' },
      ],
    },
  },
  {
    kind: 'hoodie',
    category: 'apparel',
    name: (a) => `${a.name} Temple Hoodie`,
    price: 58.0,
    blurb: (a) => `The ${a.name} seal over the heart, ${a.name} in full across the back. Pullover fleece.`,
    design: {
      placements: [
        { area: 'front', asset: 'logomark', note: 'left-chest seal' },
        { area: 'back', asset: 'mascot', note: 'full mascot back print' },
      ],
    },
  },
  {
    kind: 'crewneck',
    category: 'apparel',
    name: (a) => `${a.name} Temple Crewneck`,
    price: 52.0,
    blurb: (a) => `The full ${a.name} name lockup, centre chest. Garment-dyed crewneck.`,
    design: {
      placements: [{ area: 'front', asset: 'logolockup', note: 'lockup, centre chest' }],
    },
  },
  {
    kind: 'print',
    category: 'art-prints',
    name: (a) => `${a.name} Mascot Art Print`,
    price: 29.0,
    blurb: (a) => `${a.name} in full bleed — a museum-grade matte poster, 30×40 cm, ready to frame.`,
    design: {
      placements: [{ area: 'front', asset: 'mascot', note: 'full-bleed mascot' }],
    },
  },
  {
    kind: 'canvas',
    category: 'art-prints',
    name: (a) => `${a.name} Mascot Canvas`,
    price: 49.0,
    blurb: (a) => `${a.name} gallery-wrapped on 45×60 cm canvas, the temple seal in the corner.`,
    design: {
      placements: [
        { area: 'front', asset: 'compCanvas', note: 'full-bleed mascot with corner seal (composite)' },
      ],
    },
  },
  {
    kind: 'sticker',
    category: 'relics',
    name: (a) => `${a.name} Seal Sticker Set`,
    price: 9.0,
    blurb: (a) => `${a.name}, the temple mark, and the name lockup — three weatherproof vinyl die-cuts on one sheet.`,
    design: {
      placements: [
        { area: 'front', asset: 'compSticker', note: 'deity + seal + lockup die-cuts on one sheet (composite)' },
      ],
    },
  },
  {
    kind: 'pin',
    category: 'relics',
    name: (a) => `${a.name} Seal Enamel Pin`,
    price: 12.0,
    blurb: (a) => `The ${a.name} temple mark as a hard enamel pin, gold on obsidian — reads at 25 mm.`,
    design: {
      placements: [{ area: 'front', asset: 'logomark', note: 'seal only — reads at 25 mm' }],
    },
  },
  {
    kind: 'mug',
    category: 'drinkware',
    name: (a) => `${a.name} Temple Mug`,
    price: 22.0,
    blurb: (a) => `The ${a.name} seal at your thumb, ${a.name} facing the room. 325 ml ceramic.`,
    design: {
      placements: [
        { area: 'front', asset: 'compMug', note: 'wrap: seal at handle, deity outward (composite)' },
      ],
    },
  },
  {
    kind: 'tumbler',
    category: 'drinkware',
    name: (a) => `${a.name} Temple Tumbler`,
    price: 32.0,
    blurb: (a) => `The ${a.name} lockup wrapped vertical in gold. Insulated 590 ml steel.`,
    design: {
      placements: [{ area: 'front', asset: 'logolockup', note: 'vertical lockup wrap' }],
    },
  },
  {
    kind: 'tote',
    category: 'accessories',
    name: (a) => `${a.name} Temple Tote`,
    price: 26.0,
    blurb: (a) => `The ${a.name} lockup large, the deity tagged below. Heavy canvas carry-all.`,
    design: {
      placements: [
        { area: 'front', asset: 'compTote', note: 'lockup large with mascot tag (composite)' },
      ],
    },
  },
  {
    kind: 'phonecase',
    category: 'accessories',
    name: (a) => `${a.name} Mascot Phone Case`,
    price: 24.0,
    blurb: (a) => `${a.name}, edge to edge, on a slim impact case.`,
    design: {
      placements: [{ area: 'front', asset: 'mascot', note: 'edge-to-edge mascot' }],
    },
  },
  {
    kind: 'cap',
    category: 'accessories',
    name: (a) => `${a.name} Temple Cap`,
    price: 28.0,
    blurb: (a) => `The ${a.name} temple mark embroidered in gold on a six-panel dad cap.`,
    design: {
      placements: [{ area: 'front', asset: 'logomark', note: 'embroidered seal' }],
    },
  },
  {
    kind: 'notebook',
    category: 'accessories',
    name: (a) => `${a.name} Temple Notebook`,
    price: 18.0,
    blurb: (a) => `The ${a.name} lockup on the cover, the seal at the spine. A5 dotted journal.`,
    design: {
      placements: [
        { area: 'front', asset: 'compNotebook', note: 'cover lockup with seal footer (composite)' },
      ],
    },
  },
];

// The house line — PuniCodex brand merch, not tied to a temple.
const HOUSE_LINES = [
  {
    kind: 'tee',
    category: 'apparel',
    name: () => 'PuniCodex Wordmark Tee',
    price: 34.0,
    blurb: 'The camel-gold wordmark across the chest, the glyph at the nape.',
    assets: HOUSE_ASSETS,
    design: {
      placements: [
        { area: 'front', asset: 'wordmark', note: 'wordmark, centre chest' },
        { area: 'back', asset: 'glyph', note: 'small glyph, upper back' },
      ],
    },
  },
  {
    kind: 'hoodie',
    category: 'apparel',
    name: () => 'PuniCodex Obsidian Hoodie',
    price: 56.0,
    blurb: 'Emblem over the heart, the full lockup across the back.',
    assets: HOUSE_ASSETS,
    design: {
      placements: [
        { area: 'front', asset: 'emblem', note: 'left-chest emblem' },
        { area: 'back', asset: 'lockupH', note: 'horizontal lockup back print' },
      ],
    },
  },
  {
    kind: 'cap',
    category: 'accessories',
    name: () => 'PuniCodex Glyph Cap',
    price: 26.0,
    blurb: 'Six-panel cap, the gold glyph embroidered front and centre.',
    assets: HOUSE_ASSETS,
    design: { placements: [{ area: 'front', asset: 'glyph', note: 'embroidered glyph' }] },
  },
  {
    kind: 'mug',
    category: 'drinkware',
    name: () => 'PuniCodex Lockup Mug',
    price: 20.0,
    blurb: '325 ml ceramic wrapped in the horizontal gold lockup.',
    assets: HOUSE_ASSETS,
    design: { placements: [{ area: 'front', asset: 'lockupH', note: 'lockup wrap' }] },
  },
  {
    kind: 'tote',
    category: 'accessories',
    name: () => 'PuniCodex Stacked Tote',
    price: 24.0,
    blurb: 'Heavy canvas carry-all with the stacked gold lockup.',
    assets: HOUSE_ASSETS,
    design: { placements: [{ area: 'front', asset: 'lockupS', note: 'stacked lockup, centre' }] },
  },
  {
    kind: 'sticker',
    category: 'relics',
    name: () => 'PuniCodex Brand Sticker Set',
    price: 8.0,
    blurb: 'Wordmark, emblem, and glyph — three die-cut vinyl seals of the house.',
    assets: HOUSE_ASSETS,
    design: {
      placements: [
        { area: 'front', asset: 'compSticker', note: 'wordmark + emblem + glyph on one sheet (composite)' },
      ],
    },
  },
  {
    kind: 'print',
    category: 'art-prints',
    name: () => 'PuniCodex Pantheon Poster',
    price: 24.0,
    blurb: 'The solid wordmark over the glyph — the house creed, 30×40 cm.',
    assets: HOUSE_ASSETS,
    design: {
      placements: [
        { area: 'front', asset: 'compPoster', note: 'wordmark over glyph (composite)' },
      ],
    },
  },
  {
    kind: 'notebook',
    category: 'accessories',
    name: () => 'PuniCodex Stacked Notebook',
    price: 16.0,
    blurb: 'A5 dotted journal with the stacked lockup in gold.',
    assets: HOUSE_ASSETS,
    design: { placements: [{ area: 'front', asset: 'lockupS', note: 'cover lockup' }] },
  },
];

function main() {
  const file = path.join(ROOT, 'store', 'products.json');

  // Preserve phase-2 sync results across regenerations. printful* fields are
  // the obvious synced data — but mockupImage and variantPricing are synced
  // operational fields too (written by generate-printful-mockups.js and
  // build-variant-pricing.js), and they must survive every regeneration
  // just the same. Dropping them is the recurring "mockups vanished" bug.
  const PRESERVE_FIELDS = new Set(['mockupImage', 'variantPricing']);
  const preserved = new Map();
  try {
    const prev = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const p of prev.products || []) {
      const sync = Object.fromEntries(
        Object.entries(p).filter(([k]) => (k.startsWith('printful') || PRESERVE_FIELDS.has(k)) && p[k] != null)
      );
      if (Object.keys(sync).length) preserved.set(p.id, sync);
    }
  } catch {
    // No readable previous file — first run.
  }

  const products = [];
  decorateProduct.unknownColors = new Set();
  for (const a of ARCHETYPES) {
    if (a.built === false) continue;
    const assets = templeAssets(a);
    for (const line of LINES) {
      const id = `${a.id}-${line.kind}`;
      const product = {
        id,
        temple: a.id,
        name: line.name(a),
        category: line.category,
        price: line.price,
        blurb: line.blurb(a),
        image: cardImage(assets, line.design),
        assets,
        templeUrl: `/${a.id}/`,
        design: line.design,
        // Phase 1: no live checkout yet — the Printful storefront is wired in
        // phase 2 (see docs/pod-integration.md). Keep the field for the API.
        printfulProductId: null,
        mockupImage: inferredMockupImage(id),
        ...preserved.get(id),
      };
      applyFallbackVariants(product);
      decorateProduct(product);
      products.push(product);
    }
  }
  for (const line of HOUSE_LINES) {
    const id = `punicodex-${line.kind}`;
    const product = {
      id,
      temple: null,
      name: line.name(),
      category: line.category,
      price: line.price,
      blurb: line.blurb,
      image: cardImage(line.assets, line.design),
      assets: line.assets,
      templeUrl: null,
      design: line.design,
      printfulProductId: null,
      mockupImage: inferredMockupImage(id),
      ...preserved.get(id),
    };
    applyFallbackVariants(product);
    decorateProduct(product);
    products.push(product);
  }

  // Unknown Printful color names are a first-class result (hex null → neutral
  // chip swatch), but they deserve a generation-time summary so the table can
  // be extended on the next backfill wave. Never fails the build.
  if (decorateProduct.unknownColors.size) {
    console.log(
      `POD configurator colors without a hex entry: ${[...decorateProduct.unknownColors].sort().join(', ')}`
    );
  }

  const out = {
    generatedAt: new Date().toISOString(),
    provider: 'printful',
    phase: 1,
    count: products.length,
    products,
  };
  // Idempotency: when the product set is unchanged, keep the previous file
  // Compare with sorted keys so field-order drift from phase-2 scripts does
  // not trigger a rewrite.
  function sortedJson(obj) {
    return JSON.stringify(obj, (key, value) =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
        : value
    );
  }

  // (and its generatedAt) byte-identical so `npm run generate` stays clean.
  try {
    const prev = JSON.parse(fs.readFileSync(file, 'utf8'));
    const { generatedAt: _prevTs, ...prevRest } = prev;
    const { generatedAt: _nextTs, ...nextRest } = out;
    if (sortedJson(prevRest) === sortedJson(nextRest)) {
      console.log(`POD products unchanged (${products.length}) — store/products.json left as-is`);
      return;
    }
  } catch {
    // No readable previous file — fall through and write fresh.
  }
  fs.writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Wrote ${products.length} POD products to store/products.json`);
}

main();
