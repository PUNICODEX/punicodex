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

    await test('home: Reliquary colour chips swap real mockups without overlapping prints', async () => {
      await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
      const plinth = page
        .locator('.fc-plinth-go[data-base="/store/merch/zeus/tee/"]')
        .locator('..');
      const img = plinth.locator('.fc-plinth-img img').first();
      const original = await img.getAttribute('src');
      await plinth.locator('.fc-sw[data-c="White"]').click();
      await page.waitForTimeout(120);
      const changed = await img.getAttribute('src');
      if (!changed.includes('/assets/store-base/tee--white.jpg') || changed === original) {
        throw new Error(`white mockup did not render: ${changed}`);
      }
      const print = plinth.locator('.fc-print');
      if (!(await print.count()) || !(await print.isVisible())) {
        throw new Error('temple artwork did not appear on the white garment');
      }
      const href = await plinth.locator('.fc-plinth-go').getAttribute('href');
      if (!href.includes('color=White')) throw new Error(`checkout colour not preserved: ${href}`);
      await plinth.locator('.fc-sw[data-c="Black"]').click();
      await page.waitForTimeout(80);
      if ((await img.getAttribute('src')) !== original)
        throw new Error('composite did not restore');
      if (await print.isVisible()) throw new Error('print overlaps the baked composite');
    });

    await test('STRATA: canonical chrome and evidence-guided content render', async () => {
      await page.goto(`${base}/pantheon/strata/`, { waitUntil: 'domcontentloaded' });
      if (!(await page.locator('#main-nav').isVisible())) throw new Error('menu strip missing');
      if (!(await page.locator('.site-footer').isVisible())) throw new Error('footer missing');
      if (!/STRATA/.test(await page.locator('h1').first().textContent())) {
        throw new Error('STRATA title missing');
      }
      const body = await page.textContent('body');
      if (!body.includes('does not demonstrate one unchanged religious system')) {
        throw new Error('Sahul continuity caveat missing');
      }
      if (!body.includes('Archē · the first principles'))
        throw new Error('Archē cross-link missing');
      if (process.env.PUNICODEX_SCREENSHOTS) {
        await page.screenshot({ path: '/tmp/punicodex-strata.png', fullPage: false });
      }
    });

    await test('shared chrome: home, STRATA, Geography, and hubs have identical nav geometry', async () => {
      async function navSnapshot(url) {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        return page.evaluate(() => {
          const nav = document.querySelector('#main-nav');
          const inner = nav.querySelector('.nav-inner');
          const mark = nav.querySelector('.nav-wordmark img');
          const cta = nav.querySelector('.nav-cta');
          const navStyle = getComputedStyle(nav);
          return {
            height: navStyle.height,
            top: navStyle.top,
            innerHeight: getComputedStyle(inner).height,
            markHeight: getComputedStyle(mark).height,
            account: cta.textContent.trim(),
            accountDisplay: getComputedStyle(cta).display,
          };
        });
      }
      for (const width of [1366, 390]) {
        await page.setViewportSize({ width, height: 900 });
        const home = await navSnapshot(`${base}/`);
        for (const route of [
          'world',
          'culture',
          'instruments',
          'library',
          'relics',
          'about',
          'pantheon/strata',
          'world/sacred',
        ]) {
          const other = await navSnapshot(`${base}/${route}/`);
          if (JSON.stringify(other) !== JSON.stringify(home)) {
            throw new Error(
              `${route}: nav differs at ${width}: ${JSON.stringify(other)} vs ${JSON.stringify(home)}`
            );
          }
        }
      }
      await page.setViewportSize({ width: 1366, height: 900 });
    });

    await test('STRATA: numerals never collide and the mobile rail never covers reading text', async () => {
      await page.goto(`${base}/pantheon/strata/`, { waitUntil: 'domcontentloaded' });
      const collision = await page.evaluate(() => {
        const mark = document.querySelector('.stx-depth-mark').getBoundingClientRect();
        const kicker = document.querySelector('.stx-kicker').getBoundingClientRect();
        return mark.bottom > kicker.top;
      });
      if (collision) throw new Error('desktop layer numeral overlaps its kicker');
      await page.setViewportSize({ width: 390, height: 844 });
      const overflow = await page.evaluate(() => {
        const railLeft = document.querySelector('.stx-rail').getBoundingClientRect().left;
        const selectors =
          '.stx-stratum-inner,.stx-fault,.stx-surface-sub,.stx-core p,.stx-core-cta';
        return [...document.querySelectorAll(selectors)]
          .filter((element) => element.getBoundingClientRect().right > railLeft - 4)
          .map((element) => element.className);
      });
      if (overflow.length) throw new Error(`mobile rail covers: ${overflow.join(', ')}`);
      await page.setViewportSize({ width: 1366, height: 900 });
    });

    await test('Sacred Geography: globe zooms, clusters, and opens real dossiers', async () => {
      await page.goto(`${base}/world/sacred/`, { waitUntil: 'domcontentloaded' });
      if (!(await page.locator('#main-nav').isVisible())) throw new Error('menu strip missing');
      if (!(await page.locator('.site-footer').isVisible())) throw new Error('footer missing');
      const canvas = page.locator('#atx-globe');
      await canvas.waitFor({ state: 'visible', timeout: 10000 });
      const initial = await page.evaluate(() =>
        document.querySelector('#atx-globe').sacredGlobe.getState()
      );
      if (initial.siteCount < 90 || initial.visibleSites < 20) {
        throw new Error(`globe data did not project: ${JSON.stringify(initial)}`);
      }
      await page.locator('[data-globe-action="zoom-in"]').click();
      await page.waitForTimeout(220);
      const zoomed = await page.evaluate(() =>
        document.querySelector('#atx-globe').sacredGlobe.getState()
      );
      if (zoomed.targetZoom <= initial.targetZoom) throw new Error('zoom control did nothing');
      await canvas.focus();
      await canvas.press('Enter');
      await page.waitForTimeout(120);
      const siteButton = page.locator('[data-globe-site]').first();
      if (await siteButton.count()) await siteButton.click();
      if (!(await page.locator('#atx-panel.open').count())) {
        throw new Error('site selection did not open a dossier');
      }
      await page.locator('#atx-close').click();
      await page.locator('[data-globe-action="reset"]').click();
      if (process.env.PUNICODEX_SCREENSHOTS) {
        await page.screenshot({ path: '/tmp/punicodex-sacred-globe.png', fullPage: false });
      }
    });

    await test('shared footers: canonical markup and computed layout match the homepage', async () => {
      async function footerSnapshot(url) {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        return page.evaluate(() => {
          const footer = document.querySelector('.site-footer');
          const grid = footer.querySelector('.footer-grid');
          const heading = footer.querySelector('.footer-heading');
          return {
            html: footer.outerHTML,
            columns: getComputedStyle(grid).gridTemplateColumns,
            gridWidth: getComputedStyle(grid).width,
            gridGap: getComputedStyle(grid).columnGap,
            containerWidth: getComputedStyle(footer.querySelector('.container')).width,
            align: getComputedStyle(heading).textAlign,
            color: getComputedStyle(heading).color,
          };
        });
      }
      const routes = [
        'world',
        'culture',
        'instruments',
        'library',
        'relics',
        'about',
        'pantheon/strata',
        'world/sacred',
        'authenticity',
        'university/book',
      ];
      for (const width of [1366, 390]) {
        await page.setViewportSize({ width, height: 900 });
        const home = await footerSnapshot(`${base}/`);
        for (const route of routes) {
          const other = await footerSnapshot(`${base}/${route}/`);
          if (other.html !== home.html)
            throw new Error(`${route}: footer markup diverged at ${width}`);
          if (
            other.columns !== home.columns ||
            other.align !== home.align ||
            other.color !== home.color
          ) {
            throw new Error(
              `${route}: footer layout diverged at ${width}: ${JSON.stringify(other)} vs home ${JSON.stringify(home)}`
            );
          }
        }
      }
      await page.setViewportSize({ width: 1366, height: 900 });
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
      const store = page
        .locator('.tab-nav-links > .nav-group > a.nav-link:has-text("Store")')
        .first();
      if (!(await store.count())) throw new Error('tab missing: Store');
      for (const tab of ['Lore', 'Merch', 'Art', 'Blog']) {
        const t = page.locator(`a:has-text("${tab}")`).first();
        if (!(await t.count())) throw new Error(`tab missing: ${tab}`);
      }
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

    await test('temple desktop: Lore and Store dropdowns are unclipped and navigate', async () => {
      async function assertHitTarget(link) {
        const box = await link.boundingBox();
        if (!box) throw new Error('dropdown link has no layout box');
        const hit = await link.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const target = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
          );
          return target && target.closest('a') === element;
        });
        if (!hit) throw new Error('dropdown link is clipped or covered');
      }

      await page.goto(`${base}/sites/zeus/`, { waitUntil: 'domcontentloaded' });
      const groups = page.locator('.tab-nav-links > .nav-group');
      await groups.nth(0).hover();
      await page.waitForTimeout(220);
      const extended = groups.nth(0).locator('.nav-sub-link:has-text("Extended")');
      if (!(await extended.isVisible())) throw new Error('Lore dropdown did not open');
      await assertHitTarget(extended);
      await Promise.all([
        page.waitForURL('**/sites/zeus/lore/extended/index.html'),
        extended.click(),
      ]);

      await page.goto(`${base}/sites/zeus/`, { waitUntil: 'domcontentloaded' });
      const store = groups.nth(1).locator(':scope > a.nav-link');
      if ((await store.getAttribute('href')) !== '/store/merch/zeus/') {
        throw new Error('Store is not a real temple Merch link');
      }
      await Promise.all([page.waitForURL('**/store/merch/zeus/'), store.click()]);

      await page.goto(`${base}/sites/zeus/`, { waitUntil: 'domcontentloaded' });
      await groups.nth(1).hover();
      await page.waitForTimeout(220);
      const art = groups.nth(1).locator('.nav-sub-link:has-text("Art")');
      if (!(await art.isVisible())) throw new Error('Store dropdown did not open');
      await assertHitTarget(art);
      await Promise.all([page.waitForURL('**/sites/zeus/art/index.html'), art.click()]);
    });

    await test('temple mobile: seven centred items with accessible Lore and Store expansion', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${base}/sites/zeus/`, { waitUntil: 'domcontentloaded' });
      await page.locator('#nav-toggle').click();
      await page.waitForTimeout(250);
      const topLevel = page.locator(
        '#temple-mobile-menu > a.nav-link, #temple-mobile-menu > .nav-group > a.nav-link'
      );
      const labels = await topLevel.allTextContents();
      const expected = ['Home', 'Lore', 'Store', 'Patterns', 'Scholars', 'Patrons', 'Blog'];
      if (labels.length !== 7 || labels.some((label, index) => label.trim() !== expected[index])) {
        throw new Error(`mobile top-level tabs drifted: ${JSON.stringify(labels)}`);
      }
      const toggles = page.locator('#temple-mobile-menu .nav-sub-toggle');
      if ((await toggles.count()) !== 2)
        throw new Error('Lore and Store need exactly two expanders');
      for (const group of await page.locator('#temple-mobile-menu > .nav-group').all()) {
        if (await group.locator('.nav-sub').isVisible()) {
          throw new Error('mobile submenu started expanded');
        }
      }
      await toggles.nth(0).click();
      if ((await toggles.nth(0).getAttribute('aria-expanded')) !== 'true') {
        throw new Error('Lore expander did not update aria-expanded');
      }
      const loreSub = page.locator('#temple-mobile-menu > .nav-group').nth(0).locator('.nav-sub');
      if (!(await loreSub.locator('a:has-text("Extended")').isVisible())) {
        throw new Error('Extended did not appear under Lore');
      }
      await toggles.nth(1).click();
      const storeSub = page.locator('#temple-mobile-menu > .nav-group').nth(1).locator('.nav-sub');
      for (const label of ['Merch', 'Art']) {
        if (!(await storeSub.locator(`a:has-text("${label}")`).isVisible())) {
          throw new Error(`${label} did not appear under Store`);
        }
      }
      for (const sub of [loreSub, storeSub]) {
        const state = await sub.evaluate((element) => ({
          position: getComputedStyle(element).position,
          transform: getComputedStyle(element).transform,
          left: element.getBoundingClientRect().left,
          right: element.getBoundingClientRect().right,
        }));
        if (state.position !== 'static' || state.transform !== 'none') {
          throw new Error(`mobile submenu inherited desktop positioning: ${JSON.stringify(state)}`);
        }
        if (state.left < 0 || state.right > 390) {
          throw new Error(`mobile submenu escaped viewport: ${JSON.stringify(state)}`);
        }
      }
      const visibleLinks = await page
        .locator('#temple-mobile-menu a:visible')
        .evaluateAll((links) =>
          links.map((link) => ({
            text: link.textContent.trim(),
            align: getComputedStyle(link).textAlign,
            left: link.getBoundingClientRect().left,
            right: link.getBoundingClientRect().right,
          }))
        );
      for (const rect of visibleLinks) {
        if (rect.align !== 'center') throw new Error(`${rect.text} is not centre aligned`);
        if (rect.left < 0 || rect.right > 390) {
          throw new Error(`${rect.text} escaped the mobile viewport: ${JSON.stringify(rect)}`);
        }
      }
      await toggles.nth(0).click();
      if (await loreSub.isVisible()) throw new Error('Lore did not collapse');
      const store = page.locator('#temple-mobile-menu > .nav-group > a.nav-link:has-text("Store")');
      if ((await store.getAttribute('href')) !== '/store/merch/zeus/') {
        throw new Error('mobile Store is not a real temple Merch link');
      }
      await page.setViewportSize({ width: 1366, height: 900 });
    });

    await test('ASCII temple: canonical prose renders without Unicode claims or broken Lore styling', async () => {
      await page.goto(`${base}/sites/ninlil/lore/`, { waitUntil: 'domcontentloaded' });
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      if (
        !description.includes('canonical digital temple') ||
        /Unicode|Punycode/i.test(description)
      ) {
        throw new Error(`Lore metadata was not corrected: ${description}`);
      }
      const card = page.locator('.card-unicode').first();
      if (!(await card.count()))
        throw new Error('Lore card class was damaged by editorial transforms');
      const cardDisplay = await card.evaluate((element) => getComputedStyle(element).display);
      if (cardDisplay === 'none') throw new Error('Lore card is hidden');
      const loreText = await page.locator('body').textContent();
      if (/Unicode Restoration|DNS compromise|unregistrable plain-ASCII/i.test(loreText)) {
        throw new Error('false ASCII claim remains visible in Lore');
      }

      await page.goto(`${base}/sites/bunjil/scholars/`, { waitUntil: 'domcontentloaded' });
      const scholarText = await page.locator('body').textContent();
      if (!scholarText.includes('differs only in capitalization')) {
        throw new Error('ASCII-identical capitalization explanation is missing');
      }
      if (/DNS compromise|domain-name compromise|Unicode restoration/i.test(scholarText)) {
        throw new Error('false ASCII claim remains visible in Scholars');
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
      // The right-side drawer hides via transform:translateX(105%) with
      // opacity kept at 1, so assert on the .active class + transform +
      // pointer-events, not on opacity.
      const menuState = () =>
        mp.evaluate(() => {
          const el = document.getElementById('mobile-menu');
          if (!el) return { missing: true };
          const cs = getComputedStyle(el);
          return {
            active: el.classList.contains('active'),
            transform: cs.transform,
            pointerEvents: cs.pointerEvents,
          };
        });
      const isOpen = (s) =>
        !!s.active || s.transform === 'none' || s.transform === 'matrix(1, 0, 0, 1, 0, 0)';
      const opened = await menuState();
      if (!isOpen(opened)) {
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
      if (!after.missing && isOpen(after)) {
        throw new Error(
          `menu persisted after navigation (T3 regression): ${JSON.stringify(after)}`
        );
      }
      await mob.close();
    });

    await test('temple Commons: archived mascot opens licensed viewer with download and share', async () => {
      await page.addInitScript(() => {
        window.__sharedArtwork = null;
        Object.defineProperty(navigator, 'share', {
          configurable: true,
          value: async (data) => {
            window.__sharedArtwork = data;
          },
        });
      });
      const id = 'commons-hermes-hermes-anime-mascot-v1';
      await page.goto(`${base}/sites/hermes/art/?view=commons&art=${id}`, {
        waitUntil: 'domcontentloaded',
      });
      const dialog = page.locator('dialog.commons-viewer');
      await dialog.waitFor({ state: 'visible' });
      if (!(await dialog.textContent()).includes('Hermês — anime mascot')) {
        throw new Error('archived mascot title missing from viewer');
      }
      for (const marker of ['CC BY 4.0', 'Not recorded', 'AI-assisted', 'PuniCodex Studio']) {
        if (!(await dialog.textContent()).includes(marker)) {
          throw new Error(`Commons metadata missing: ${marker}`);
        }
      }
      const download = dialog.locator('a[download]');
      if (
        (await download.getAttribute('href')) !== '/assets/ai-commons/hermes-anime-mascot-v1.png'
      ) {
        throw new Error('full-resolution download is not wired');
      }
      await dialog.locator('.cv-btn-primary').click();
      await dialog.locator('button.cv-btn').first().click();
      const shared = await page.evaluate(() => window.__sharedArtwork);
      if (!shared || !shared.url.includes(`/hermes/art/?view=commons`)) {
        throw new Error(
          `native share did not carry canonical artwork URL: ${JSON.stringify(shared)}`
        );
      }
      await dialog.locator('.cv-close').click();
      await page.waitForFunction(() => !new URLSearchParams(location.search).has('art'));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator(`.art-card[data-art-id="${id}"]`).first().click();
      await dialog.waitFor({ state: 'visible' });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      if (overflow) throw new Error('Commons viewer overflows mobile viewport');
      await page.setViewportSize({ width: 1366, height: 900 });
    });

    await test('admin portal: cookie-only sign-in stays on the dashboard and sends CSRF', async () => {
      const admin = await browser.newContext({ viewport: { width: 1366, height: 900 } });
      try {
        await admin.addCookies([
          { name: 'punicodex_admin_csrf', value: 'browser-csrf-token', url: base },
        ]);
        await admin.route('**/api/**', (route) =>
          route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
        );
        await admin.route('**/api/admin/portal/login/', (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: {
              'Set-Cookie':
                'punicodex_admin_session=browser-admin-session; Path=/; HttpOnly; SameSite=Lax',
            },
            body: JSON.stringify({
              success: true,
              token: 'browser-admin-session',
              csrfToken: 'browser-csrf-token',
              user: { email: 'cookie-session@example.test' },
              role: 'viewer',
            }),
          })
        );
        await admin.route('**/api/admin/portal/me/', (route) => {
          const cookies = route.request().headers().cookie || '';
          const authenticated = cookies.includes('punicodex_admin_session=browser-admin-session');
          return route.fulfill({
            status: authenticated ? 200 : 401,
            contentType: 'application/json',
            body: JSON.stringify(
              authenticated
                ? {
                    user: { email: 'cookie-session@example.test', displayName: 'Cookie Session' },
                    role: 'viewer',
                    permissions: ['read'],
                  }
                : { error: 'Authentication required', code: 'auth_required' }
            ),
          });
        });
        let mutationHeaders = null;
        await admin.route('**/api/admin/portal/csrf-probe/', (route) => {
          mutationHeaders = route.request().headers();
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: '{"success":true}',
          });
        });

        const ap = await admin.newPage();
        const navigations = [];
        ap.on('framenavigated', (frame) => {
          if (frame === ap.mainFrame()) navigations.push(frame.url());
        });
        await ap.goto(`${base}/admin-portal/login/`, { waitUntil: 'domcontentloaded' });
        await ap.locator('#email').fill('cookie-session@example.test');
        await ap.locator('#password').fill('not-a-real-password');
        await ap.locator('#login-submit').click();
        await ap.waitForURL(`${base}/admin-portal/`);
        await ap.locator('.pz-sidebar-user').waitFor({ state: 'visible' });
        await ap.waitForTimeout(700);
        if (new URL(ap.url()).pathname !== '/admin-portal/') {
          throw new Error(
            `cookie session bounced away from dashboard: ${navigations.join(' -> ')}`
          );
        }
        if (navigations.length !== 2) {
          throw new Error(`unexpected admin redirect cycle: ${navigations.join(' -> ')}`);
        }
        const legacyToken = await ap.evaluate(() => localStorage.getItem('punicodex_portal_token'));
        if (legacyToken !== null) throw new Error('test did not exercise a cookie-only session');
        if ((await ap.locator('.pz-sidebar-user').textContent()) !== 'Cookie Session') {
          throw new Error('cookie-authenticated identity did not render');
        }

        await ap.evaluate(() =>
          window.Portal.api('/api/admin/portal/csrf-probe/', { method: 'POST', body: {} })
        );
        if (!mutationHeaders) throw new Error('CSRF probe did not reach the server');
        if (mutationHeaders['x-csrf-token'] !== 'browser-csrf-token') {
          throw new Error('cookie-authenticated mutation omitted its CSRF token');
        }
        if (!(mutationHeaders.cookie || '').includes('punicodex_admin_session=')) {
          throw new Error('cookie-authenticated mutation omitted its session cookie');
        }
      } finally {
        await admin.close();
      }
    });

    await test('admin analytics: every timeframe loads and structured failures stay readable', async () => {
      const admin = await browser.newContext({ viewport: { width: 1366, height: 900 } });
      const requestedDays = [];
      const runtimeErrors = [];
      let fail = false;
      try {
        await admin.route('**/api/**', (route) =>
          route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
        );
        await admin.route('**/api/admin/portal/me/', (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              user: { email: 'analytics@example.test', displayName: 'Analytics Admin' },
              role: 'viewer',
              permissions: ['read'],
            }),
          })
        );
        await admin.route(
          (url) => url.pathname === '/api/admin/portal/analytics/',
          (route) => {
            const url = new URL(route.request().url());
            const days = Number(url.searchParams.get('days') || 30);
            if (url.searchParams.get('mode') === 'rolling') requestedDays.push(days);
            if (fail) {
              return route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({
                  error: {
                    message: 'Analytics storage is temporarily unavailable',
                    code: 'storage_unavailable',
                  },
                }),
              });
            }
            const byDay = Array.from({ length: days }, (_, index) => ({
              day: `2026-11-${String((index % 28) + 1).padStart(2, '0')}`,
              human: 0,
              bot: 0,
            }));
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                mode: 'rolling',
                days,
                overview: {
                  periodDays: days,
                  totals: { humanViews: 0, botViews: 0, uniqueSessions: 0, botPct: 0 },
                  byDay,
                  topTemples: [],
                  topReferrers: [],
                  devices: { mobile: 0, tablet: 0, desktop: 0 },
                  botCategories: [],
                  topPaths: [],
                },
                engagement: {
                  periodDays: days,
                  engagements: 0,
                  avgVisibleMs: 0,
                  avgScrollPct: 0,
                  topEngaged: [],
                },
                depth: {
                  periodDays: days,
                  pagesPerSession: 0,
                  singlePageSessions: 0,
                  sessions: 0,
                  bouncePct: 0,
                },
                trends: null,
                generatedAt: '2026-11-12T12:00:00Z',
              }),
            });
          }
        );
        const ap = await admin.newPage();
        ap.on('pageerror', (error) => runtimeErrors.push(error.message));
        if (process.env.BROWSER_TEST_DEBUG) {
          ap.on('console', (message) =>
            console.log('ADMIN ANALYTICS CONSOLE', message.type(), message.text())
          );
          ap.on('response', (response) => {
            if (response.url().includes('/api/'))
              console.log('ADMIN ANALYTICS API', response.status(), response.url());
          });
        }
        await ap.goto(`${base}/admin-portal/analytics/`, { waitUntil: 'domcontentloaded' });
        if (process.env.BROWSER_TEST_DEBUG) {
          await ap.waitForTimeout(1500);
          console.log(
            'ADMIN ANALYTICS BODY',
            (await ap.locator('body').innerText()).slice(0, 2400)
          );
          console.log('ADMIN ANALYTICS RUNTIME ERRORS', runtimeErrors);
        }
        await ap.locator('#an-stats .stat-card').first().waitFor({ state: 'visible' });
        for (const days of [7, 90, 120]) {
          const response = ap.waitForResponse(
            (res) =>
              new URL(res.url()).searchParams.get('days') === String(days) && res.status() === 200
          );
          await ap.locator(`.period-btn[data-days="${days}"]`).click();
          await response;
          await ap.waitForFunction(
            (expected) =>
              document.getElementById('an-chart-sub').textContent.includes(`last ${expected} days`),
            days
          );
        }
        fail = true;
        const failedResponse = ap.waitForResponse(
          (res) => new URL(res.url()).searchParams.get('days') === '7' && res.status() === 500
        );
        await ap.locator('.period-btn[data-days="7"]').click();
        await failedResponse;
        await ap.waitForFunction(() =>
          document.body.textContent.includes('Analytics storage is temporarily unavailable')
        );
        const body = await ap.locator('body').textContent();
        if (body.includes('[object Object]'))
          throw new Error('structured API error leaked as object-object');
        if (requestedDays.join(',') !== '30,7,90,120,7') {
          throw new Error(`unexpected timeframe requests: ${requestedDays.join(',')}`);
        }
        if (runtimeErrors.length) throw new Error(runtimeErrors.join('; '));
      } finally {
        await admin.close();
      }
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
