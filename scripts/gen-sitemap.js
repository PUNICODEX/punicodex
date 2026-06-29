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
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(
  `(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`
);
const flagshipIds = new Set(ARCHETYPES.filter((a) => a.built).map((a) => a.id));

const BASE_URL = 'https://punycodex.com';

const mainPages = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/pantheon/', priority: '0.9', changefreq: 'weekly' },
  { loc: '/lexicon/', priority: '0.9', changefreq: 'weekly' },
  { loc: '/type/', priority: '0.9', changefreq: 'weekly' },
  { loc: '/tiers/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/realms/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/codex/', priority: '0.7', changefreq: 'weekly' },
  { loc: '/search.html', priority: '0.8', changefreq: 'weekly' },
  { loc: '/about/', priority: '0.7', changefreq: 'monthly' },
  { loc: '/contact/', priority: '0.5', changefreq: 'monthly' },
  { loc: '/store/', priority: '0.6', changefreq: 'monthly' },
  { loc: '/api/v1/docs/', priority: '0.7', changefreq: 'weekly' },
  { loc: '/appraise/', priority: '0.8', changefreq: 'weekly' },
  { loc: '/terms/', priority: '0.4', changefreq: 'yearly' },
  { loc: '/terms/advertising/', priority: '0.4', changefreq: 'yearly' },
  { loc: '/privacy/', priority: '0.4', changefreq: 'yearly' },
  { loc: '/404.html', priority: '0.1', changefreq: 'yearly' },
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

// Temple pages
for (const entry of LEXICON) {
  const isFlagship = flagshipIds.has(entry.id);
  const priority = isFlagship ? '0.8' : '0.6';
  xml += urlEntry(`/sites/${entry.id}/`, priority, 'monthly');

  if (isFlagship) {
    xml += urlEntry(`/sites/${entry.id}/lore/`, '0.7', 'monthly');
    xml += urlEntry(`/sites/${entry.id}/lore/extended/`, '0.6', 'monthly');
    xml += urlEntry(`/sites/${entry.id}/gallery/`, '0.5', 'monthly');
  }
}

xml += '</urlset>\n';

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');

const urlCount = mainPages.length + LEXICON.length + flagshipIds.size * 3;
console.log(`Sitemap generated: ${urlCount} URLs`);
