/**
 * One-off: screenshot the four wave-D PC/FX scene pages (authenticity,
 * creatives, search, store) against a local static server — desktop
 * 1400x950 and mobile 390x844, default and prefers-reduced-motion.
 * Output: tools/pcfx-shots/. Run: node tools/screenshot-pcfx-wave-d.js [page ...]
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'pcfx-shots');

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

// name → URL path (search.html is a root file, the rest are directories).
const ALL_PAGES = {
  authenticity: '/authenticity/',
  creatives: '/creatives/',
  search: '/search.html',
  store: '/store/',
};

function serve() {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const file = path.join(ROOT, urlPath);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) =>
    server.listen(0, () => resolve({ server, port: server.address().port }))
  );
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const argPages = process.argv.slice(2);
  const pages = argPages.length ? argPages : Object.keys(ALL_PAGES);
  const { server, port: PORT } = await serve();
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  try {
    for (const name of pages) {
      for (const mobile of [false, true]) {
        for (const reduced of [false, true]) {
          const context = await browser.newContext({
            viewport: mobile ? { width: 390, height: 844 } : { width: 1400, height: 950 },
            deviceScaleFactor: mobile ? 2 : 1,
            isMobile: mobile,
            hasTouch: mobile,
            reducedMotion: reduced ? 'reduce' : 'no-preference',
          });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', (e) => errors.push(String(e)));
          page.on('console', (m) => {
            if (m.type() === 'error') errors.push(m.text());
          });
          await page.goto(`http://127.0.0.1:${PORT}${ALL_PAGES[name]}`, {
            waitUntil: 'networkidle',
          });
          // Bring the scene into view so scroll-reveal (.reveal-up) fires,
          // then let the reveal transition and the scene settle.
          await page.evaluate(() => {
            const el =
              document.querySelector('.pc-fx-stage') ||
              document.querySelector('canvas[class*="pc-fx"]');
            if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
          });
          await page.waitForTimeout(reduced ? 1400 : 3800);
          const shot = path.join(
            OUT,
            `${name}-${mobile ? 'mobile' : 'desktop'}-${reduced ? 'reduced' : 'default'}.png`
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
