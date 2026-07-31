#!/usr/bin/env node
/**
 * Canonical sitemap generator.
 *
 * Sources of truth:
 *   - type/js/lexicon.js (all temple ids)
 *   - js/archetypes-v2.js (flagship ids and their secondary pages)
 *
 * Output: sitemap.xml at project root.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function writeFileWithRetry(filePath, data, encoding = 'utf8', retries = 5, delay = 100) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      fs.writeFileSync(filePath, data, encoding);
      return;
    } catch (err) {
      const isTransient =
        err.code === 'EBUSY' || err.code === 'EAGAIN' || err.code === 'UNKNOWN' || err.code === 'EPERM';
      if (attempt === retries || !isTransient) {
        throw err;
      }
      const ms = delay * attempt;
      console.warn(`  transient write error for ${filePath} (${err.code}), retrying in ${ms}ms...`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    }
  }
}
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(
  `(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`
);
const flagshipIds = new Set(ARCHETYPES.filter((a) => a.built).map((a) => a.id));

const BASE_URL = 'https://punicodex.com';

const mainPages = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/pantheon/', priority: '0.9', changefreq: 'weekly' },
  { loc: '/lexicon/', priority: '0.9', changefreq: 'weekly' },
  { loc: '/blog/', priority: '0.7', changefreq: 'weekly' },
  { loc: '/texts/', priority: '0.7', changefreq: 'monthly' },
  { loc: '/type/', priority: '0.9', changefreq: 'weekly' },
  { loc: '/tiers/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/realms/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/codex/', priority: '0.7', changefreq: 'weekly' },
  { loc: '/search.html', priority: '0.8', changefreq: 'weekly' },
  { loc: '/about/', priority: '0.7', changefreq: 'monthly' },
  { loc: '/contact/', priority: '0.5', changefreq: 'monthly' },
  { loc: '/store/', priority: '0.6', changefreq: 'monthly' },
  { loc: '/university-sponsorship/', priority: '0.6', changefreq: 'monthly' },
  { loc: '/api/v1/docs/', priority: '0.7', changefreq: 'weekly' },
  { loc: '/appraise/', priority: '0.8', changefreq: 'weekly' },
  { loc: '/terms/', priority: '0.4', changefreq: 'yearly' },
  { loc: '/terms/advertising/', priority: '0.4', changefreq: 'yearly' },
  { loc: '/privacy/', priority: '0.4', changefreq: 'yearly' },
  { loc: '/herald/', priority: '0.7', changefreq: 'weekly' },
  { loc: '/authenticity/', priority: '0.8', changefreq: 'weekly' },
  { loc: '/art/', priority: '0.6', changefreq: 'monthly' },
  { loc: '/game/', priority: '0.6', changefreq: 'monthly' },
  { loc: '/connections/', priority: '0.6', changefreq: 'monthly' },
  { loc: '/creatives/', priority: '0.6', changefreq: 'monthly' },
  { loc: '/about/authenticity.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/codex/anatomy-of-a-punycode-domain/', priority: '0.6', changefreq: 'monthly' },
  { loc: '/codex/building-the-temple/', priority: '0.6', changefreq: 'monthly' },
  { loc: '/codex/why-greek-accents-matter/', priority: '0.6', changefreq: 'monthly' },
  { loc: '/scholars/', priority: '0.7', changefreq: 'weekly' },
  { loc: '/scholars/search/', priority: '0.6', changefreq: 'monthly' },
  { loc: '/scholars/analytics/', priority: '0.6', changefreq: 'monthly' },
  { loc: '/scholars/creatives/', priority: '0.6', changefreq: 'monthly' },
  { loc: '/oracle.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/search-v2.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/lexicon/cognates.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/interstitial.html', priority: '0.3', changefreq: 'yearly' },
  { loc: '/terms/data-use/', priority: '0.4', changefreq: 'yearly' },
  { loc: '/terms/store/', priority: '0.4', changefreq: 'yearly' },
  { loc: '/terms/creatives/', priority: '0.4', changefreq: 'yearly' },
  { loc: '/extension/', priority: '0.6', changefreq: 'monthly' },
  { loc: '/app/', priority: '0.6', changefreq: 'monthly' },
  { loc: '/trending/', priority: '0.7', changefreq: 'weekly' },
  { loc: '/patterns/', priority: '0.8', changefreq: 'weekly' },
  { loc: '/patterns/methodology/', priority: '0.6', changefreq: 'monthly' },
  { loc: '/careers/', priority: '0.5', changefreq: 'monthly' },
  { loc: '/about/founder/', priority: '0.5', changefreq: 'monthly' },
  { loc: '/arbitrage/', priority: '0.6', changefreq: 'monthly' },
];

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc, priority, changefreq) {
  return `  <url>\n    <loc>${escapeXml(BASE_URL + loc)}</loc>\n    <priority>${priority}</priority>\n    <changefreq>${changefreq}</changefreq>\n  </url>\n`;
}

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

// Main pages
for (const p of mainPages) {
  xml += urlEntry(p.loc, p.priority, p.changefreq);
}

// Sacred Texts: one reading page per registered text.
const TEXT_REGISTRY = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'platform', 'texts', 'registry.json'), 'utf8')
);
for (const t of TEXT_REGISTRY.texts) {
  xml += urlEntry(`/texts/${t.id}/`, '0.6', 'monthly');
}

// Temple pages
for (const entry of LEXICON) {
  const isFlagship = flagshipIds.has(entry.id);
  const priority = isFlagship ? '0.8' : '0.6';
  xml += urlEntry(`/sites/${entry.id}/`, priority, 'monthly');

  if (isFlagship) {
    xml += urlEntry(`/sites/${entry.id}/lore/`, '0.7', 'monthly');
    xml += urlEntry(`/sites/${entry.id}/lore/extended/`, '0.6', 'monthly');
    xml += urlEntry(`/sites/${entry.id}/gallery/`, '0.5', 'monthly');
    xml += urlEntry(`/sites/${entry.id}/blog/`, '0.6', 'monthly');
    xml += urlEntry(`/sites/${entry.id}/blog/restoration/`, '0.6', 'monthly');
    xml += urlEntry(`/sites/${entry.id}/blog/resonance/`, '0.6', 'monthly');
    xml += urlEntry(`/sites/${entry.id}/patterns/`, '0.5', 'monthly');
    xml += urlEntry(`/sites/${entry.id}/scholars/`, '0.7', 'monthly');
    xml += urlEntry(`/sites/${entry.id}/creatives/`, '0.5', 'monthly');
    xml += urlEntry(`/sites/${entry.id}/patron/`, '0.5', 'monthly');
  }
}

// Reliquary store pages: one collection + one product page per catalog item.
const POD = JSON.parse(fs.readFileSync(path.join(ROOT, 'store', 'products.json'), 'utf8'));
const storeCollectionIds = new Set();
for (const product of POD.products) {
  const templeId = product.temple || 'punicodex';
  if (!storeCollectionIds.has(templeId)) {
    storeCollectionIds.add(templeId);
    xml += urlEntry(`/store/${templeId}/`, '0.6', 'weekly');
  }
  xml += urlEntry(`/store/${templeId}/${product.id.split('-').pop()}/`, '0.5', 'weekly');
}

xml += '</urlset>\n';

writeFileWithRetry(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');

const urlCount =
  mainPages.length +
  TEXT_REGISTRY.texts.length +
  LEXICON.length +
  flagshipIds.size * 8 +
  storeCollectionIds.size +
  POD.count;
console.log(`Sitemap generated: ${urlCount} URLs`);
