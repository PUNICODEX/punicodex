/**
 * One-off: screenshot the four wave-B PC/FX scene pages (/tiers/, /type/,
 * /about/, /appraise/) at 1400x950 and 390x844, default and reduced-motion,
 * against a local static server. Output: tools/pcfx-shots/.
 * Run: node tools/screenshot-pcfx-waveb.js [page ...]
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'pcfx-shots');
const PORT = 8919;

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

const ALL_PAGES = ['tiers', 'type', 'about', 'appraise'];
const VIEWPORTS = [
  { tag: '', width: 1400, height: 950 },
  { tag: 'mobile-', width: 390, height: 844 },
];

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
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const pages = process.argv.slice(2).length ? process.argv.slice(2) : ALL_PAGES;
  const server = await serve();
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  try {
    for (const name of pages) {
      for (const vp of VIEWPORTS) {
        for (const reduced of [false, true]) {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            deviceScaleFactor: 1,
            reducedMotion: reduced ? 'reduce' : 'no-preference',
          });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', (e) => errors.push(String(e)));
          page.on('console', (m) => {
            if (m.type() === 'error') errors.push(m.text());
          });
          await page.goto(`http://127.0.0.1:${PORT}/${name}/`, { waitUntil: 'networkidle' });
          // Bring the scene into view so scroll-reveal (.reveal-up/.reveal-hero)
          // fires, then let the reveal transition and the scene settle.
          await page.evaluate(() => {
            const el =
              document.querySelector('.pc-fx-stage') ||
              document.querySelector('canvas[class*="pc-fx"]');
            if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
          });
          await page.waitForTimeout(reduced ? 1400 : 3800);
          const shot = path.join(
            OUT,
            `${name}-${vp.tag}${reduced ? 'reduced' : 'default'}.png`
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
