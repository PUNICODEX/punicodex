/**
 * Store PDP configurator — REAL-browser suite (playwright-core + local static
 * server rooted at the repo). The DOM-stub harness (tools/verify-store-configurator.js)
 * proves the state machine; this suite proves what a buyer actually sees:
 *
 *  - Colour chips change the rendered garment (src + a pixel sample of the
 *    stage changes) — the "colour clicks do nothing" regression.
 *  - The stage box NEVER changes size across colour/artwork selections.
 *  - The composite photo is only ever shown for its own garment colour
 *    (compositeColor — Black for apparel), never under a wrong-colour chip.
 *  - The live art overlay never stacks on the composite photo (overlap fix).
 *  - "As shown" products (mug/tote/print/canvas): colour picks apply the
 *    interim tint over the print proof and checkout stays artworkKey null.
 *
 * Skips cleanly (exit 0) when no Chromium/Edge binary exists (bare CI),
 * matching test/browser-e2e.test.js.
 */

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');

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
  // Playwright's own browser cache (developer machines).
  try {
    const cache = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
    for (const rev of fs.readdirSync(cache).sort().reverse()) {
      if (/^chromium-\d+$/.test(rev)) {
        for (const rel of ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe']) {
          const p = path.join(cache, rev, ...rel.split('/'));
          if (fs.existsSync(p)) return p;
        }
      }
    }
  } catch {}
  return null;
}

const os = require('node:os');

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
};

function serveStatic() {
  const server = http.createServer((req, res) => {
    let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.join(ROOT, pathname);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}
const assert = require('node:assert');

let browser;
let server;
let base;

// Stage snapshot: src, rendered boxes, overlay state, and a small pixel
// signature of the stage so "same src but visibly different" is caught too.
async function snap(page) {
  return page.evaluate(async () => {
    const img = document.getElementById('stage-img');
    const stage = img.parentElement.getBoundingClientRect();
    const r = img.getBoundingClientRect();
    const overlay = document.querySelector('.cfg-art');
    const or = overlay ? overlay.getBoundingClientRect() : null;
    // Pixel signature via a FRESH Image probe: the stage img element itself
    // is permanently canvas-tainted once it loaded the cross-origin
    // composite, so drawing it always throws. Same-origin base mockups load
    // clean into a new element.
    let pixels = null;
    try {
      const url = new URL(img.currentSrc, location.href);
      if (url.origin === location.origin) {
        const probe = new Image();
        probe.src = url.href;
        await probe.decode();
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        const ctx = c.getContext('2d');
        ctx.drawImage(probe, 0, 0, 64, 64);
        const d = ctx.getImageData(0, 0, 64, 64).data;
        let h = 0;
        for (let i = 0; i < d.length; i += 409) h = (h * 31 + d[i]) >>> 0;
        pixels = h;
      }
    } catch {
      /* signature is best-effort; src/box checks carry the assertion */
    }
    return {
      src: img.currentSrc || '',
      loaded: img.complete && img.naturalWidth > 0,
      pixels,
      stageBox: [Math.round(stage.width), Math.round(stage.height)],
      imgBox: [Math.round(r.width), Math.round(r.height)],
      overlay: or
        ? {
            display: getComputedStyle(overlay).display,
            src: overlay.currentSrc || '',
            box: [Math.round(or.width), Math.round(or.height)],
          }
        : null,
      tintMix: Boolean(document.querySelector('.cfg-tint-mix')),
      tintWhite: img.className.includes('cfg-tint-white'),
      activeColor: document.querySelector('#opts-color .opt.active')?.textContent || null,
      activeSize: document.querySelector('#opts-size .opt.active')?.textContent || null,
      note: document.getElementById('colour-note')?.textContent || '',
      checkout: window.storeConfigurator ? window.storeConfigurator.selection : null,
    };
  });
}

async function colourChips(page) {
  return page.$$('#cfg-mount .cfg-chip--color');
}
async function artChips(page) {
  return page.$$('#cfg-mount .cfg-chip--art');
}
async function clickAndSettle(page, el) {
  await el.click();
  await page.waitForTimeout(350); // let the new image fetch + render
}

test('tee: BLACK chip preselected at init (composite truthfulness)', async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto(`${base}/store/merch/zeus/tee/`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const s = await snap(page);
  assert.strictEqual(s.activeColor, 'Black', `expected Black active, got ${s.activeColor}`);
  assert.ok(s.src.includes('mockups'), `init should show the composite, got ${s.src}`);
  assert.ok(!s.overlay || s.overlay.display === 'none', 'no overlay over the composite');
  await page.close();
});

test('tee: every colour click visibly changes the stage, box stays constant', async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto(`${base}/store/merch/zeus/tee/`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const init = await snap(page);
  const COMPOSITE_COLOUR = 'Black'; // compositeColor in the zeus-tee payload
  const seen = new Map([[init.src, init.pixels]]);
  const chips = await colourChips(page);
  assert.ok(chips.length >= 3, 'expected several colour chips');
  const stageBoxes = new Set([JSON.stringify(init.stageBox)]);
  const imgBoxes = new Set([JSON.stringify(init.imgBox)]);
  const distinct = new Set();
  for (let i = 0; i < chips.length; i++) {
    const label = await chips[i].getAttribute('title');
    await clickAndSettle(page, chips[i]);
    const s = await snap(page);
    if (process.env.DEBUG_SNAP)
      console.log('    [snap]', label, s.src.slice(-34), 'pixels=', s.pixels, 'loaded=', s.loaded);
    assert.ok(s.loaded, `${label}: stage image not loaded (${s.src})`);
    if (label === COMPOSITE_COLOUR) {
      // The photo's own colour: the composite is the truthful product photo.
      assert.ok(s.src.includes('mockups'), `${label}: should keep the composite, got ${s.src}`);
      assert.ok(
        !s.overlay || s.overlay.display === 'none',
        `${label}: no overlay on the composite`
      );
    } else {
      assert.ok(
        !s.src.includes('mockups'),
        `${label}: should swap to the base mockup, got ${s.src}`
      );
      assert.ok(
        s.overlay && s.overlay.display !== 'none',
        `${label}: overlay print should show on the blank base`
      );
    }
    if (s.pixels != null) {
      if (seen.has(s.src))
        assert.strictEqual(s.pixels, seen.get(s.src), `${label}: same src but pixels changed`);
      else distinct.add(s.pixels);
    }
    seen.set(s.src, s.pixels);
    stageBoxes.add(JSON.stringify(s.stageBox));
    imgBoxes.add(JSON.stringify(s.imgBox));
  }
  assert.strictEqual(stageBoxes.size, 1, `stage box changed across colours: ${[...stageBoxes]}`);
  assert.strictEqual(imgBoxes.size, 1, `img box changed across colours: ${[...imgBoxes]}`);

  // Distinct base colours must be visually distinct (guards against a
  // tint-only no-op).
  assert.ok(distinct.size >= 3, `colours not visually distinct: only ${distinct.size} signatures`);
  await page.close();
});

test('tee: composite is only kept for its own colour (Black); other colours use the base mockup', async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto(`${base}/store/merch/zeus/tee/`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const chips = await colourChips(page);
  const byLabel = async (label) => {
    for (const c of chips) if ((await c.getAttribute('title')) === label) return c;
    return null;
  };
  const black = await byLabel('Black');
  const ash = await byLabel('Ash');
  await clickAndSettle(page, ash);
  let s = await snap(page);
  assert.ok(s.src.includes('tee--ash'), `Ash should use the ash base, got ${s.src}`);
  assert.ok(
    s.overlay && s.overlay.display !== 'none',
    'overlay print should show on the blank base'
  );
  await clickAndSettle(page, black);
  s = await snap(page);
  assert.ok(
    s.src.includes('mockups'),
    `Black (composite colour) should restore the photo, got ${s.src}`
  );
  assert.ok(!s.overlay || s.overlay.display === 'none', 'no overlay over the composite');
  await page.close();
});

test('tee: artwork pick swaps the print, never overlaps the composite', async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto(`${base}/store/merch/zeus/tee/`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const arts = await artChips(page);
  assert.ok(arts.length >= 2, 'expected artwork chips');
  // On a NON-composite colour every artwork (including the baked one) must
  // leave the composite — the overlay never stacks on the photo.
  const chips = await colourChips(page);
  let ash = null;
  for (const c of chips) if ((await c.getAttribute('title')) === 'Ash') ash = c;
  await clickAndSettle(page, ash);
  for (const art of arts) {
    const label = await art.getAttribute('title');
    await clickAndSettle(page, art);
    const s = await snap(page);
    assert.ok(
      !s.src.includes('mockups'),
      `${label}: composite must be replaced, not overlaid (src=${s.src})`
    );
    assert.ok(
      s.overlay && s.overlay.display !== 'none',
      `${label}: overlay should print on the base`
    );
    assert.ok(
      s.checkout && typeof s.checkout.artworkKey === 'string',
      `${label}: checkout carries the art`
    );
  }
  await page.close();
});

test('mug: "As shown" default; colour/art flows keep checkout honest', async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto(`${base}/store/merch/zeus/mug/`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  let s = await snap(page);
  assert.ok(s.src.includes('mockups'), 'mug init shows the composite');
  assert.ok(
    s.checkout && s.checkout.artworkKey === null,
    'init selection is the default print file'
  );
  const arts = await artChips(page);
  const labels = [];
  for (const a of arts) labels.push(await a.getAttribute('title'));
  assert.ok(labels.includes('As shown'), `expected an "As shown" chip, got ${labels}`);
  const logomark = arts[labels.indexOf('Logomark')];
  await clickAndSettle(page, logomark);
  s = await snap(page);
  assert.ok(!s.src.includes('mockups'), `logomark must swap off the composite (src=${s.src})`);
  assert.strictEqual(s.checkout.artworkKey, 'logomark');
  await page.close();
});

test('tote: "As shown" + colour pick gives visible tint feedback; exact preview after art pick', async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto(`${base}/store/merch/zeus/tote/`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const chips = await colourChips(page);
  assert.ok(chips.length >= 2, 'tote should have colour chips');
  const camel = async () => {
    for (const c of chips) if ((await c.getAttribute('title')) === 'Camel') return c;
  };
  await clickAndSettle(page, await camel());
  let s = await snap(page);
  assert.ok(s.src.includes('mockups'), 'tote "As shown" keeps the print proof');
  assert.ok(s.tintMix, 'Camel should apply the multiply tint over the proof');
  assert.strictEqual(s.checkout.artworkKey, null, 'tint does not change what is bought');
  const arts = await artChips(page);
  const labels = [];
  for (const a of arts) labels.push(await a.getAttribute('title'));
  const mascot = arts[labels.indexOf('Mascot')];
  await clickAndSettle(page, mascot);
  s = await snap(page);
  assert.ok(!s.src.includes('mockups'), `mascot must swap to the exact base (src=${s.src})`);
  assert.ok(!s.tintMix && !s.tintWhite, 'tints stripped once a real art is picked');
  assert.strictEqual(s.checkout.artworkKey, 'mascot');
  await page.close();
});

test('mobile viewport: stage box constant across colour picks', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${base}/store/merch/zeus/tee/`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const init = await snap(page);
  const boxes = new Set([JSON.stringify(init.stageBox)]);
  const chips = await colourChips(page);
  for (let i = 1; i < Math.min(chips.length, 4); i++) {
    await clickAndSettle(page, chips[i]);
    const s = await snap(page);
    assert.ok(s.loaded, `chip ${i} image not loaded`);
    boxes.add(JSON.stringify(s.stageBox));
  }
  assert.strictEqual(boxes.size, 1, `mobile stage box changed: ${[...boxes]}`);
  await page.close();
});

async function run() {
  const executablePath = findBrowser();
  if (!executablePath) {
    console.log('  ⊘ no Chromium/Edge binary found — skipping browser suite');
    return;
  }
  server = await serveStatic();
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath, headless: true });

  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(
        `    ${String(err.message || err)
          .split('\n')
          .slice(0, 5)
          .join('\n    ')}`
      );
    }
  }
  await browser.close();
  server.close();
  console.log(`\nStore Configurator Browser: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
