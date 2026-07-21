#!/usr/bin/env node
/**
 * PuniCodex — POD product catalog generator.
 * Builds store/products.json from flagship archetypes: each temple gets a
 * small print-on-demand line (tee, art print, sticker) carrying its mascot.
 * Phase 1: links point at the temple + Printful storefront placeholders.
 * Phase 2 (API): sync real Printful product IDs via PRINTFUL_API_KEY.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));

const LINES = [
  {
    kind: 'tee',
    category: 'apparel',
    name: (a) => `${a.name} Temple Tee`,
    price: 38.0,
    blurb: 'Heavyweight organic cotton, temple gold on obsidian.',
  },
  {
    kind: 'print',
    category: 'art-prints',
    name: (a) => `${a.name} Mascot Art Print`,
    price: 29.0,
    blurb: 'Museum-grade matte poster, 30×40 cm, ready to frame.',
  },
  {
    kind: 'sticker',
    category: 'relics',
    name: (a) => `${a.name} Seal Sticker Set`,
    price: 9.0,
    blurb: 'Three weatherproof vinyl seals of the temple mark.',
  },
];

function main() {
  const products = [];
  for (const a of ARCHETYPES) {
    if (a.built === false) continue;
    for (const line of LINES) {
      products.push({
        id: `${a.id}-${line.kind}`,
        temple: a.id,
        name: line.name(a),
        category: line.category,
        price: line.price,
        blurb: line.blurb,
        image: a.mascotPath,
        templeUrl: `/sites/${a.id}/`,
        // Phase 1: no live checkout yet — the Printful storefront is wired in
        // phase 2 (see docs/pod-integration.md). Keep the field for the API.
        printfulProductId: null,
      });
    }
  }
  const out = {
    generatedAt: new Date().toISOString(),
    provider: 'printful',
    phase: 1,
    count: products.length,
    products,
  };
  fs.writeFileSync(path.join(ROOT, 'store', 'products.json'), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Wrote ${products.length} POD products to store/products.json`);
}

main();
