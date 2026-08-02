/**
 * Sitemap & robots consistency.
 *
 * 1. Every <loc> in sitemap.xml maps to a real page in the repo.
 * 2. Every public indexable page is present in the sitemap (no orphans) —
 *    noindex/admin/auth-gated/template/backup pages are excluded by rule.
 * 3. Every sitemap URL uses the trailing-slash convention.
 * 4. robots.txt exists, permits crawling, and points at the sitemap.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message.split('\n').slice(0, 10).join('\n    ')}`);
  }
}

function sitemapUrls() {
  const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

function urlToFile(url) {
  const { pathname } = new URL(url);
  // API routes are served by serverless functions, not static files — they
  // resolve live by convention and are out of scope for file resolution.
  if (pathname.startsWith('/api/')) return null;
  // /foo/ -> foo/index.html, /foo.html -> foo.html, / -> index.html
  if (pathname.endsWith('.html')) return pathname.slice(1);
  return path.join(pathname, 'index.html').replace(/^[\\/]/, '');
}

const EXCLUDE_PATTERNS = [
  /(^|\/)\.backup\//,
  /^docs\//,
  /^templates\//,
  /^platform\//,
  // The extension source tree is excluded, but extension/index.html is now a
  // public teaser page (in the canonical nav) and belongs in the sitemap.
  /^extension\/(?!index\.html$)/,
  /^extension-v2\//,
  /^mobile\//,
  /^android\//,
  /^tools\//,
  /^website\//,
  /^admin/,
  /dashboard/,
  /404\.html$/,
  /^advertiser-panel\.html$/,
  /^browser\.html$/,
  /^entry\.html$/,
  /^submit\.html$/,
  /^claim\.html$/,
  /^account\//,
  /scholars\/(login|apply|dashboard|review|admin|institution|dept-admin)\//,
  /creatives\/creator\.html$/,
  /^auth\//,
  // Legacy variant pages whose <link rel="canonical"> already points at the
  // main temple page; variants are intentionally not sitemap entries.
  /^sites\/hermes\/original\.html$/,
  /^sites\/nike\/original\.html$/,
];

function isIndexablePage(file) {
  if (EXCLUDE_PATTERNS.some((re) => re.test(file))) return false;
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  if (/name=["']robots["'][^>]*noindex/i.test(html)) return false;
  return true;
}

function pageUrl(file) {
  // index.html -> dir URL; foo.html -> /foo.html
  if (file === 'index.html') return 'https://punicodex.com/';
  if (file.endsWith('/index.html')) {
    return `https://punicodex.com/${file.slice(0, -'/index.html'.length)}/`;
  }
  return `https://punicodex.com/${file}`;
}

function run() {
  console.log('\n▸ Sitemap & Robots Consistency\n');
  const urls = sitemapUrls();
  assert.ok(urls.length > 1000, `expected a substantial sitemap, got ${urls.length}`);
  const urlSet = new Set(urls);

  test('every sitemap URL resolves to a real page', () => {
    const missing = [];
    for (const url of urls) {
      const file = urlToFile(url);
      if (file === null) continue; // live serverless route
      if (!fs.existsSync(path.join(ROOT, file))) missing.push(`${url} -> ${file}`);
    }
    assert.deepStrictEqual(missing.slice(0, 10), [], `${missing.length} dead sitemap entries`);
  });

  test('every sitemap URL uses the trailing-slash convention', () => {
    const bad = urls.filter((u) => !u.endsWith('/') && !u.endsWith('.html') && !u.endsWith('.xml'));
    assert.deepStrictEqual(bad.slice(0, 10), [], `${bad.length} non-canonical URLs`);
  });

  test('no duplicate sitemap entries', () => {
    const seen = new Set();
    const dupes = urls.filter((u) => seen.size === seen.add(u).size);
    assert.deepStrictEqual([...new Set(dupes)], [], 'duplicate sitemap URLs');
  });

  test('every public indexable page is in the sitemap (no orphans)', () => {
    const htmlFiles = execSync('git ls-files "*.html"', { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
    const orphans = [];
    for (const file of htmlFiles) {
      if (!isIndexablePage(file)) continue;
      if (!urlSet.has(pageUrl(file))) orphans.push(file);
    }
    assert.deepStrictEqual(orphans.slice(0, 10), [], `${orphans.length} orphaned pages`);
  });

  test('robots.txt permits crawling and references the sitemap', () => {
    const robots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
    assert.ok(/User-agent:\s*\*/i.test(robots), 'must target all agents');
    assert.ok(/Allow:\s*\//i.test(robots), 'must allow crawling');
    assert.ok(
      /Sitemap:\s*https:\/\/punicodex\.com\/sitemap\.xml/i.test(robots),
      'must reference sitemap.xml'
    );
  });

  console.log(`\nSitemap & Robots: ${passed} passed, ${failed} failed (${urls.length} URLs)`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
