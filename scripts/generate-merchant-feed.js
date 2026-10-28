#!/usr/bin/env node
/**
 * PuniCodex — Google Merchant Center feed generator.
 *
 * Builds store/merchant-feed.xml (RSS 2.0 + g: namespace) from
 * store/products.json — flywheel-native, idempotent, byte-stable when inputs
 * are unchanged. Google fetches the feed URL on a schedule, so the file is
 * served statically from the deployed site.
 *
 * Merchant-relevant choices:
 *   - identifier_exists = no  (POD goods carry no GTIN/MPN)
 *   - price mirrors the PDP exactly: the "from" price when variant prices
 *     spread (the PDP shows "from $X"), else the flat catalog price —
 *     otherwise Google flags price mismatches against the landing page
 *   - image_link prefers the fleet composite mockup, else the blank-garment
 *     base — the same imagery the PDP stage uses
 */

const fs = require('node:fs');
const path = require('node:path');
const { writeFileWithRetry } = require('./write-file-retry.js');

const ROOT = path.join(__dirname, '..');
const CATALOG = require(path.join(ROOT, 'store', 'products.json'));

const SITE_ORIGIN = 'https://punicodex.com';

// Official Google product taxonomy IDs (taxonomy-with-ids.en-US).
const TAXONOMY = {
  tee: 212, // Apparel & Accessories > Clothing > Shirts & Tops
  hoodie: 212,
  crewneck: 212,
  cap: 173, // Apparel & Accessories > Clothing Accessories > Hats
  pin: 197, // Apparel & Accessories > Jewelry > Brooches & Lapel Pins
  phonecase: 2353, // Electronics > Communications > Telephony > Mobile Phone Accessories > Mobile Phone Cases
  mug: 2169, // Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs
  tumbler: 2951, // Home & Garden > Kitchen & Dining > Tableware > Drinkware > Tumblers
  tote: 5608, // Luggage & Bags > Shopping Totes
  notebook: 961, // Office Supplies > General Office Supplies > Paper Products > Notebooks & Notepads
  print: 500044, // Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork
  canvas: 500044,
  sticker: 4054, // Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Crafting Materials > Embellishments & Trims > Decorative Stickers
};

const KIND_LABEL = {
  tee: 'T-Shirt',
  hoodie: 'Hoodie',
  crewneck: 'Crewneck Sweatshirt',
  print: 'Art Print',
  canvas: 'Canvas Print',
  sticker: 'Sticker',
  pin: 'Enamel Pin',
  mug: 'Mug',
  tumbler: 'Tumbler',
  tote: 'Tote Bag',
  phonecase: 'Phone Case',
  cap: 'Cap',
  notebook: 'Notebook',
};

function loadMockupFleet() {
  try {
    const map = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'store', 'mockup-fleet.json'), 'utf8')
    );
    return new Set(Object.keys(map).filter((id) => map[id] === true));
  } catch {
    return new Set();
  }
}
const MOCKUP_FLEET = loadMockupFleet();

function absUrl(src) {
  if (!src) return null;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  return `${SITE_ORIGIN}${src.startsWith('/') ? '' : '/'}${src}`;
}

// Same default-price logic as the PDP template in generate-store-pages.js:
// spread variant prices → the "from" (minimum) price, else the flat price.
function feedPriceCents(product) {
  const pricing = product.variantPricing || null;
  const labels = product.printfulVariants ? Object.keys(product.printfulVariants) : [];
  const priced = pricing ? labels.filter((l) => Number.isInteger(pricing[l])) : [];
  if (priced.length) {
    const cents = priced.map((l) => pricing[l]);
    if (Math.max(...cents) > Math.min(...cents)) return Math.min(...cents);
  }
  return Math.round(Number(product.price || 0) * 100);
}

function feedImage(product) {
  if (product.mockupImage && MOCKUP_FLEET.has(product.id)) {
    return absUrl(product.mockupImage);
  }
  return absUrl(product.baseMockup) || absUrl(product.image);
}

const xml = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

function itemXml(p) {
  // House-line products carry temple: null in the catalog; the store
  // generator buckets them under the 'punicodex' collection.
  const temple = p.temple || 'punicodex';
  const kind = String(p.id).split('-').pop();
  const link = `${SITE_ORIGIN}/store/${temple}/${kind}/`;
  const title = p.name;
  const description = `${p.blurb || p.name} Printed on demand by the PUNICODEX Reliquary — made to order, shipped worldwide.`;
  const priceCents = feedPriceCents(p);
  const image = feedImage(p);
  const category = TAXONOMY[kind];
  const kindLabel = KIND_LABEL[kind] || kind;
  const lines = [
    `    <g:id>${xml(p.id)}</g:id>`,
    `    <g:title>${xml(title)}</g:title>`,
    `    <g:description>${xml(description)}</g:description>`,
    `    <g:link>${xml(link)}</g:link>`,
  ];
  if (image) lines.push(`    <g:image_link>${xml(image)}</g:image_link>`);
  lines.push(
    `    <g:condition>new</g:condition>`,
    `    <g:availability>in stock</g:availability>`,
    `    <g:price>${(priceCents / 100).toFixed(2)} USD</g:price>`,
    `    <g:brand>PUNICODEX</g:brand>`,
    `    <g:identifier_exists>no</g:identifier_exists>`,
    `    <g:product_type>${xml(`Reliquary > ${kindLabel}`)}</g:product_type>`
  );
  if (category) lines.push(`    <g:google_product_category>${category}</g:google_product_category>`);
  if (temple) {
    lines.push(`    <g:custom_label_0>${xml(temple)}</g:custom_label_0>`);
  }
  return `  <item>\n${lines.join('\n')}\n  </item>`;
}

function build() {
  const items = CATALOG.products.map(itemXml).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
  <title>PUNICODEX Reliquary</title>
  <link>${SITE_ORIGIN}/store/</link>
  <description>Print-on-demand relics of the Unicode Pantheon — apparel, prints, drinkware and relics from the temple collections of the PUNICODEX Reliquary. Every piece is made to order.</description>
${items}
</channel>
</rss>
`;
}

function main() {
  const out = path.join(ROOT, 'store', 'merchant-feed.xml');
  writeFileWithRetry(out, build());
  const count = CATALOG.products.length;
  console.log(`Merchant feed: ${count} items → store/merchant-feed.xml`);
}

main();
