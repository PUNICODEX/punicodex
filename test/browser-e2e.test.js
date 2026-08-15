/**
 * Browser E2E — critical user journeys driven through a real Chromium via
 * playwright-core, against a local static server rooted at the repo.
 *
 * Journeys: home boot/hero/nav, type-tool conversion, lexicon filter + search,
 * temple page + booking modal accessibility, mobile menu open/navigate/close
 * (the T3 regression), search page structure.
 *
 * Skips cleanly (exit 0) when no Chrome/Edge binary exists (e.g. bare CI
 * runners); on developer machines and browser-enabled CI it runs for real.
 */

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

const CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

function findBrowser() {
  for (const p of CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

function serveStatic() {
  const server = http.createServer((req, res) => {
    let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.join(ROOT, pathname);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(
      `    ${String(err.message || err)
        .split('\n')
        .slice(0, 4)
        .join('\n    ')}`
    );
  }
}

async function run() {
  const exe = findBrowser();
  if (!exe) {
    console.log('\n▸ Browser E2E — SKIPPED (no Chrome/Edge binary found)\n');
    process.exit(0);
  }
  console.log(`\n▸ Browser E2E (via ${path.basename(exe)})\n`);

  const { chromium } = require('playwright-core');
  const { server, port } = await serveStatic();
  const base = `http://127.0.0.1:${port}`;
  let browser;
  try {
    browser = await chromium.launch({ executablePath: exe, headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();

    await test('home: hero canvas renders and primary nav carries the core links', async () => {
      await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('canvas', { timeout: 10000 });
      for (const label of ['Pantheon', 'Lexicon', 'Type']) {
        const link = page.locator(`nav a:has-text("${label}")`).first();
        if (!(await link.count())) throw new Error(`nav link missing: ${label}`);
      }
    });

    await test('type tool: typing a name offers the canonical Unicode completion', async () => {
      await page.goto(`${base}/type/`, { waitUntil: 'domcontentloaded' });
      const input = page.locator('#type-input, input[type="text"]').first();
      await input.click();
      await input.fill('apoll');
      await page.waitForTimeout(700); // debounced completions
      const body = await page.textContent('body');
      if (!body.includes('Apóllōn')) throw new Error('Apóllōn completion not offered');
    });

    await test('lexicon: filter narrows the grid and pantheon labels render', async () => {
      await page.goto(`${base}/lexicon/`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#lexicon-grid .lexicon-card, .lexicon-grid a', {
        timeout: 15000,
      });
      const cardsBefore = await page
        .locator('#lexicon-grid .lexicon-card, #lexicon-grid a')
        .count();
      if (cardsBefore < 50) throw new Error(`grid too sparse: ${cardsBefore}`);
      await page.locator('#filter-search').fill('zeús');
      await page.waitForTimeout(800);
      const cardsAfter = await page.locator('#lexicon-grid .lexicon-card, #lexicon-grid a').count();
      if (cardsAfter === 0 || cardsAfter >= cardsBefore) {
        throw new Error(`filter did not narrow: ${cardsBefore} -> ${cardsAfter}`);
      }
      const body = await page.textContent('body');
      if (!/Zeús/.test(body)) throw new Error('Zeús card not found after filter');
      if (!/Greek/i.test(body)) throw new Error('pantheon label not rendered on card');
      // Baiame is plain-ASCII with no owned domain: the default view hides
      // those by design (documented on the page), so it must NOT appear.
      await page.locator('#filter-search').fill('baiame');
      await page.waitForTimeout(800);
      const baiameCards = await page
        .locator('#lexicon-grid .lexicon-card, #lexicon-grid a')
        .count();
      if (baiameCards !== 0) throw new Error('hidden-by-default rule broken for Baiame');
    });

    await test('temple: zeus renders hero, tabs, and an accessible booking modal', async () => {
      await page.goto(`${base}/sites/zeus/`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('h1', { timeout: 10000 });
      const h1 = await page.textContent('h1');
      if (!/Zeús|Zeus/i.test(h1)) throw new Error(`unexpected h1: ${h1}`);
      for (const tab of ['Lore', 'Gallery', 'Blog']) {
        const t = page.locator(`a:has-text("${tab}")`).first();
        if (!(await t.count())) throw new Error(`tab missing: ${tab}`);
      }
      // Booking modal: open and verify labeled controls.
      const reserve = page
        .locator('button:has-text("Reserve"), a:has-text("Reserve"), [data-booking-open]')
        .first();
      if (await reserve.count()) {
        await reserve.click();
        await page.waitForTimeout(400);
        const email = page.locator('#booking-email[aria-label]');
        if (!(await email.count())) throw new Error('booking email input lacks aria-label');
      }
    });

    await test('mobile: menu opens, navigates, and collapses after navigation (T3)', async () => {
      const mob = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const mp = await mob.newPage();
      await mp.goto(`${base}/blog/`, { waitUntil: 'domcontentloaded' });
      const toggle = mp.locator('#nav-toggle, .nav-toggle, [aria-label*="menu" i]').first();
      if (!(await toggle.count())) throw new Error('mobile menu toggle not found');
      await toggle.click();
      await mp.waitForTimeout(400);
      // The menu hides via opacity:0 + pointer-events:none, so assert on
      // computed style, not bounding-box visibility.
      const menuState = () =>
        mp.evaluate(() => {
          const el = document.getElementById('mobile-menu');
          if (!el) return { missing: true };
          const cs = getComputedStyle(el);
          return { opacity: cs.opacity, pointerEvents: cs.pointerEvents };
        });
      const opened = await menuState();
      if (opened.opacity !== '1' && opened.pointerEvents === 'none') {
        throw new Error(`menu did not open: ${JSON.stringify(opened)}`);
      }
      const link = mp.locator('#mobile-menu a[href^="/"]').first();
      await Promise.all([
        mp.waitForURL('**/pantheon/**', { timeout: 15000 }).catch(() => null),
        link.click(),
      ]);
      await mp.waitForLoadState('domcontentloaded').catch(() => {});
      await mp.waitForTimeout(800);
      // After navigation the menu must be hidden again (fresh page state).
      const after = await menuState();
      if (!after.missing && after.opacity !== '0') {
        throw new Error(
          `menu persisted after navigation (T3 regression): ${JSON.stringify(after)}`
        );
      }
      await mob.close();
    });

    await test('search page: labeled query input and submit control exist', async () => {
      await page.goto(`${base}/search/`, { waitUntil: 'domcontentloaded' });
      const input = page.locator('#searchInput').first();
      if (!(await input.count())) throw new Error('search input not found');
      const label = await input.getAttribute('aria-label');
      const id = await input.getAttribute('id');
      const hasFor = id ? await page.locator(`label[for="${id}"]`).count() : 0;
      if (!label && !hasFor) throw new Error('search input has no accessible name');
    });

    await ctx.close();
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  console.log(`\nBrowser E2E: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
