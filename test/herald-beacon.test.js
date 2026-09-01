/**
 * Herald Beacon tests — static injector contract plus real-browser journeys
 * (playwright-core against a local static server; skips cleanly without a
 * Chrome/Edge binary).
 */

const assert = require('node:assert');
const fs = require('node:fs');
const http = require('node:http');
const _os = require('node:os');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

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

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

function findBrowser() {
  for (const p of BROWSERS) if (fs.existsSync(p)) return p;
  return null;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

function serveStatic() {
  const server = http.createServer((req, res) => {
    let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.join(ROOT, pathname);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end();
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

async function run() {
  console.log('\n▸ Herald Beacon Tests\n');

  // ── Static contract ──
  await test('injector is idempotent and covers/excludes correctly', () => {
    execSync('node scripts/inject-herald-beacon.js', { cwd: ROOT, stdio: 'pipe' });
    const before = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    execSync('node scripts/inject-herald-beacon.js', { cwd: ROOT, stdio: 'pipe' });
    const after = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.strictEqual(after, before, 'second run must not change anything');
    assert.ok(after.includes('PUNICODEX-HERALD-BEACON-START'), 'markers on home page');
    const herald = fs.readFileSync(path.join(ROOT, 'herald', 'index.html'), 'utf8');
    assert.ok(!herald.includes('PUNICODEX-HERALD-BEACON-START'), 'no beacon on the Herald page');
    const admin = fs.readFileSync(
      path.join(ROOT, 'platform', 'public', 'admin-portal', 'index.html'),
      'utf8'
    );
    assert.ok(!admin.includes('PUNICODEX-HERALD-BEACON-START'), 'no beacon in admin portal');

    // The herald injector is last-writer-wins before </head>, so these two
    // runs flip every page to cookie-then-herald order. Restore the pipeline
    // equilibrium (cookie last) or the Divergence Gate sees 6,952 dirty files.
    execSync('node scripts/inject-cookie-consent.js', { cwd: ROOT, stdio: 'pipe' });
  });

  const exe = findBrowser();
  if (!exe) {
    console.log('  (browser journeys skipped — no Chrome/Edge binary)');
    console.log(`\nHerald Beacon: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  }

  const { chromium } = require('playwright-core');
  const { server, port } = await serveStatic();
  const base = `http://127.0.0.1:${port}`;
  let browser;
  try {
    try {
      browser = await chromium.launch({
        executablePath: exe,
        headless: true,
        timeout: 120000,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
        ],
      });
    } catch (launchErr) {
      console.log(`  (browser journeys skipped — launch failed: ${launchErr.message})`);
      console.log(`\nHerald Beacon: ${passed} passed, ${failed} failed`);
      server.close();
      process.exit(failed > 0 ? 1 : 0);
    }

    let ctx = null;
    let page = null;
    const newPage = async (storageState) => {
      ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
      page = await ctx.newPage();
      if (storageState) {
        await page.addInitScript((v) => {
          window.localStorage.setItem('punicodex.herald.state', v);
        }, storageState);
      }
      return { ctx, page };
    };

    await test('renders on first visit; exactly one seal; opens with focus + aria', async () => {
      const { ctx, page } = await newPage(null);
      await page.goto(`${base}/pantheon/`, { waitUntil: 'domcontentloaded' });
      const seal = page.locator('.herald-beacon__seal');
      assert.strictEqual(await seal.count(), 1, 'exactly one seal');
      assert.ok(await seal.isVisible(), 'seal visible');
      await seal.click();
      await page.waitForTimeout(250);
      assert.strictEqual(await seal.getAttribute('aria-expanded'), 'true');
      const card = page.locator('.herald-beacon__card');
      assert.ok(await card.isVisible(), 'card open');
      const focused = await page.evaluate(() => document.activeElement.name);
      assert.strictEqual(focused, 'email', 'focus moves to the email field');
      await ctx.close();
    });

    await test('Esc closes and marks dismissed; never remounts', async () => {
      const { ctx, page } = await newPage(null);
      await page.goto(`${base}/lexicon/`, { waitUntil: 'domcontentloaded' });
      await page.locator('.herald-beacon__seal').click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      assert.ok(!(await page.locator('.herald-beacon__card').isVisible()), 'card closed');
      const state = await page.evaluate(() => localStorage.getItem('punicodex.herald.state'));
      assert.strictEqual(state, 'dismissed');
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.strictEqual(
        await page.locator('.herald-beacon__seal').count(),
        0,
        'no remount after dismiss'
      );
      await ctx.close();
    });

    await test('subscribed state also suppresses the beacon', async () => {
      const { ctx, page } = await newPage('subscribed');
      await page.goto(`${base}/pantheon/`, { waitUntil: 'domcontentloaded' });
      assert.strictEqual(await page.locator('.herald-beacon__seal').count(), 0);
      await ctx.close();
    });

    await test('never renders on the Herald page itself', async () => {
      const { ctx, page } = await newPage(null);
      await page.goto(`${base}/herald/`, { waitUntil: 'domcontentloaded' });
      assert.strictEqual(await page.locator('.herald-beacon__seal').count(), 0);
      await ctx.close();
    });

    await test('invalid email errors locally without firing any request', async () => {
      const { ctx, page } = await newPage(null);
      let requests = 0;
      await page.route('**/api/newsletter/subscribe/**', (route) => {
        requests++;
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      });
      await page.goto(`${base}/pantheon/`, { waitUntil: 'domcontentloaded' });
      await page.locator('.herald-beacon__seal').click();
      await page.locator('input[name="email"]').fill('not-an-email');
      await page.locator('.herald-beacon__submit').click();
      await page.waitForTimeout(250);
      assert.strictEqual(requests, 0, 'no request on invalid email');
      assert.ok(
        (await page.locator('.herald-beacon__error').textContent()).includes('valid email')
      );
      await ctx.close();
    });

    await test('valid submit posts email+phone with beacon source; success + subscribed state', async () => {
      const { ctx, page } = await newPage(null);
      let payload = null;
      await page.route('**/api/newsletter/subscribe/**', async (route) => {
        payload = JSON.parse(route.request().postData());
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      });
      // networkidle: deferred scripts wait for pending stylesheets (the
      // deferred media="print" CSS included), so domcontentloaded alone can
      // race the beacon mount on slow CI runners.
      await page.goto(`${base}/pantheon/`, { waitUntil: 'networkidle' });
      await page.locator('.herald-beacon__seal').click();
      await page.locator('input[name="email"]').fill('herald.fan@example.com');
      await page.locator('input[name="phone"]').fill('+61 400 111 222');
      const requestPromise = page.waitForRequest('**/api/newsletter/subscribe/**', {
        timeout: 30000,
      });
      await page.locator('.herald-beacon__submit').click();
      await requestPromise;
      await page.locator('.herald-beacon__success').first().waitFor({ timeout: 30000 });
      assert.ok(payload, 'request fired');
      assert.strictEqual(payload.email, 'herald.fan@example.com');
      assert.strictEqual(payload.phone, '+61 400 111 222');
      assert.strictEqual(payload.source, 'herald-beacon');
      assert.ok(
        (await page.locator('.herald-beacon__success').count()) >= 1,
        'success state shown'
      );
      const state = await page.evaluate(() => localStorage.getItem('punicodex.herald.state'));
      assert.strictEqual(state, 'subscribed');
      await ctx.close();
    });

    await test('focus stays trapped inside the open card (Tab wraps)', async () => {
      const { ctx, page } = await newPage(null);
      await page.goto(`${base}/pantheon/`, { waitUntil: 'domcontentloaded' });
      await page.locator('.herald-beacon__seal').click();
      await page.waitForTimeout(200);
      for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
      const inside = await page.evaluate(() =>
        document.querySelector('.herald-beacon__card').contains(document.activeElement)
      );
      assert.ok(inside, 'focus escaped the card');
      await ctx.close();
    });
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  console.log(`\nHerald Beacon: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
