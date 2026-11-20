#!/usr/bin/env node
/**
 * PuniCodex — Google Merchant Center feed generator.
 *
 * Emits the complete Reliquary catalog as a gzipped Google Shopping RSS 2.0
 * feed: one <item> per PURCHASABLE VARIANT (colour/size), grouped by product
 * via g:item_group_id — the structure Google requires for apparel. The
 * previous feed listed one item per product with no size/colour, which is
 * why Merchant Center disapproved apparel en masse ("doesn't register all
 * the items").
 *
 * Price policy: every variant of a product carries the PDP's displayed
 * price — the "from" (minimum) price when variant prices spread, else the
 * flat catalog price — because Googlebot sees the STATIC PDP ("from $X");
 * per-variant prices would price-mismatch the landing page.
 *
 * Output: store/merchant-feed.xml.gz — COMMITTED and deterministic (gzip
 * header mtime zeroed) so it survives the CI divergence gate. Google accepts
 * gzip-compressed feeds over URL; subscribe Merchant Center to
 * https://punicodex.com/store/merchant-feed.xml.gz
 *
 * Custom POD goods carry no GTIN/MPN: g:identifier_exists 'no' satisfies the
 * unique-product-identifier requirement without inventing barcodes.
 *
 * Usage: node scripts/generate-merchant-feed.js
 */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'store', 'merchant-feed.xml.gz');
const SITE_ORIGIN = 'https://punicodex.com';

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'store', 'products.json'), 'utf8'));

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
  tee: 'Temple Tee',
  hoodie: 'Temple Hoodie',
  crewneck: 'Temple Crewneck',
  print: 'Art Print',
  canvas: 'Mascot Canvas',
  sticker: 'Seal Sticker Set',
  pin: 'Seal Pin Button Set',
  mug: 'Temple Mug',
  tumbler: 'Temple Tumbler',
  tote: 'Temple Tote',
  phonecase: 'Mascot Phone Case',
  cap: 'Temple Cap',
  notebook: 'Temple Notebook',
};

const { isColorWord } = require(path.join(__dirname, 'printful-color-table.js'));

function loadMockupFleet() {
  try {
    const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'store', 'mockup-fleet.json'), 'utf8'));
    return new Set(Object.keys(map).filter((id) => map[id] === true));
  } catch {
    return new Set();
  }
}
const MOCKUP_FLEET = loadMockupFleet();

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function absUrl(src) {
  if (!src) return null;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  return `${SITE_ORIGIN}${src.startsWith('/') ? '' : '/'}${src}`;
}

// Same default-price logic as the PDP template in generate-store-pages.js:
// spread variant prices → the "from" (minimum) price, else the flat price —
// Googlebot reads the static PDP, so the feed must match what that shows.
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
  if (product.mockupImage && MOCKUP_FLEET.has(product.id)) return absUrl(product.mockupImage);
  return absUrl(product.baseMockup) || absUrl(product.image);
}

function variantParts(label) {
  if (label.includes(' / ')) {
    const [color, size] = label.split(' / ');
    return { color, size };
  }
  // Bare labels: colour words (tote 'Camel') vs bare sizes (canvas '10″×10″').
  if (isColorWord(label)) return { color: label, size: null };
  return { color: null, size: label };
}

function feedItem(p, label, priceCents, image) {
  const temple = p.temple || 'punicodex';
  const kind = String(p.id).split('-').pop();
  const { color, size } = label ? variantParts(label) : { color: null, size: null };
  const variantId = label ? p.id + '__' + label.replace(/[^A-Za-z0-9]+/g, '_') : p.id;
  const link = `${SITE_ORIGIN}/store/merch/${temple}/${kind}/`;
  const title =
    p.name +
    (color && size ? ` (${color} / ${size})` : color ? ` (${color})` : '');
  const description = `${p.blurb || p.name} Printed on demand by the PUNICODEX Reliquary — made to order, shipped worldwide.`;
  const lines = [
    `<g:id>${esc(variantId)}</g:id>`,
    `<g:item_group_id>${esc(p.id)}</g:item_group_id>`,
    `<g:title>${esc(title.slice(0, 149))}</g:title>`,
    `<g:description>${esc(description)}</g:description>`,
    `<g:link>${esc(link)}</g:link>`,
  ];
  if (image) lines.push(`<g:image_link>${esc(image)}</g:image_link>`);
  lines.push(
    `<g:condition>new</g:condition>`,
    `<g:availability>in_stock</g:availability>`,
    `<g:price>${(priceCents / 100).toFixed(2)} USD</g:price>`,
    `<g:brand>PuniCodex</g:brand>`,
    `<g:identifier_exists>no</g:identifier_exists>`,
    `<g:adult>no</g:adult>`,
    `<g:product_type>${esc(`Reliquary > ${KIND_LABEL[kind] || kind}`)}</g:product_type>`
  );
  const category = TAXONOMY[kind];
  if (category) lines.push(`<g:google_product_category>${category}</g:google_product_category>`);
  if (color) lines.push(`<g:color>${esc(color)}</g:color>`);
  if (size && !/^one size$/i.test(size)) lines.push(`<g:size>${esc(size)}</g:size>`);
  if (temple) lines.push(`<g:custom_label_0>${esc(temple)}</g:custom_label_0>`);
  return `  <item>\n    ${lines.join('\n    ')}\n  </item>`;
}

function build() {
  const items = [];
  for (const p of catalog.products) {
    if (!p.printfulProductId) continue; // unsynced — checkout would reject them
    const priceCents = feedPriceCents(p);
    const image = feedImage(p);
    const labels = Object.keys(p.printfulVariants || {});
    if (!labels.length) {
      items.push(feedItem(p, null, priceCents, image));
      continue;
    }
    for (const label of labels) items.push(feedItem(p, label, priceCents, image));
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n' +
    '<channel>\n' +
    '  <title>PUNICODEX Reliquary</title>\n' +
    `  <link>${SITE_ORIGIN}/store/</link>\n` +
    '  <description>Print-on-demand relics of the Unicode Pantheon — apparel, prints, drinkware and relics from the temple collections of the PUNICODEX Reliquary. Every piece is made to order.</description>\n' +
    items.join('\n') +
    '\n</channel>\n</rss>\n';

  /* Deterministic gzip: zero the MTIME/OS header bytes so regenerate →
   * byte-identical file → the CI divergence gate stays green. */
  const buf = zlib.gzipSync(Buffer.from(xml, 'utf8'), { level: 9 });
  buf.writeUInt32LE(0, 4); // MTIME
  buf[9] = 0; // OS
  return { buf, items: items.length, bytes: Buffer.byteLength(xml) };
}

function main() {
  const { buf, items, bytes } = build();
  let changed = true;
  try {
    changed = !fs.existsSync(OUT) || !fs.readFileSync(OUT).equals(buf);
  } catch {
    changed = true;
  }
  if (changed) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, buf);
  }
  console.log(
    `Merchant feed: ${items} variant items (${(bytes / 1e6).toFixed(1)} MB xml, ` +
      `${(buf.length / 1e6).toFixed(1)} MB gz)${changed ? ' — written' : ' — unchanged'}`
  );
}

if (require.main === module) main();

module.exports = { build, feedItem, variantParts, feedPriceCents, TAXONOMY };
