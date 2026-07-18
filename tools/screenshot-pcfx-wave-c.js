/**
 * One-off: screenshot the wave-B/C PC/FX scene pages at desktop (1400x950)
 * and mobile (390x844), default and reduced-motion, against a local static
 * server. Output: tools/pcfx-shots/. Run: node tools/screenshot-pcfx-wave-c.js [page ...]
 *
 * scholars/apply is served from the CANONICAL platform/public file because
 * the root scholars/ copy is generated (regeneration happens after the edit).
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'pcfx-shots');
const PORT = 8923;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

// URL path → file (defaults to ROOT + url). The canonical scholars source
// lives under platform/public until the next npm run generate.
const OVERRIDES = {
  '/scholars/apply/index.html': 'platform/public/scholars/apply/index.html',
};

const ALL_PAGES = [
  { name: 'terms', url: '/terms/' },
  { name: 'privacy', url: '/privacy/' },
  { name: '404', url: '/404.html' },
  { name: 'university-sponsorship', url: '/university-sponsorship/' },
  { name: 'contact', url: '/contact/' },
  { name: 'realms', url: '/realms/' },
  { name: 'scholars-apply', url: '/scholars/apply/' },
];

const VIEWPORTS = [
  { tag: 'desktop', width: 1400, height: 950, deviceScaleFactor: 1 },
  { tag: 'mobile', width: 390, height: 844, deviceScaleFactor: 2 },
];

function serve() {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const rel = OVERRIDES[urlPath] || urlPath;
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const wanted = process.argv.slice(2);
  const pages = wanted.length ? ALL_PAGES.filter((p) => wanted.includes(p.name)) : ALL_PAGES;
  const server = await serve();
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  try {
    for (const { name, url } of pages) {
      for (const vp of VIEWPORTS) {
        for (const reduced of [false, true]) {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            deviceScaleFactor: vp.deviceScaleFactor,
            reducedMotion: reduced ? 'reduce' : 'no-preference',
          });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', (e) => errors.push(String(e)));
          page.on('console', (m) => {
            if (m.type() === 'error') errors.push(m.text());
          });
          await page.goto(`http://127.0.0.1:${PORT}${url}`, { waitUntil: 'networkidle' });
          // Bring the scene into view so scroll-reveal (.reveal-up) fires,
          // then let the reveal transition and the scene settle.
          await page.evaluate(() => {
            const el =
              document.querySelector('.pc-fx-stage') ||
              document.querySelector('canvas[class*="pc-fx"]');
            if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
          });
          await page.waitForTimeout(reduced ? 1400 : 4200);
          const shot = path.join(
            OUT,
            `${name}-${vp.tag}-${reduced ? 'reduced' : 'default'}.png`
          );
          await page.screenshot({ path: shot });
          console.log(`${shot}${errors.length ? `  JS ERRORS: ${errors.join(' | ')}` : ''}`);
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
})();
