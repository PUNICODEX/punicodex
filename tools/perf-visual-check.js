#!/usr/bin/env node
/**
 * One-off: visual identity check for the home perf workstream.
 * Serves two roots (before/after), screenshots the home page at matched
 * timings (veil, hero after dissolve, first below-fold section) at mobile
 * viewport, into .tmp-perf-shots/.
 *
 * Run: node tools/perf-visual-check.js
 */

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '.tmp-perf-shots');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

function serve(root, port) {
  const server = http.createServer((req, res) => {
    let f = path.join(root, decodeURIComponent(req.url).split('?')[0]);
    if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      res.writeHead(404);
      res.end('nf');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => server.listen(port, () => r(server)));
}

async function shoot(browser, port, tag) {
  const page = await browser.newPage({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2 });
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
  const at = async (ms) => {
    const wait = ms - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
  };
  await at(1200);
  await page.screenshot({ path: path.join(OUT, `${tag}-1-veil.png`) });
  await at(6000);
  await page.screenshot({ path: path.join(OUT, `${tag}-2-hero.png`) });
  await page.evaluate(() => document.getElementById('development')?.scrollIntoView());
  await page.waitForTimeout(1600);
  await page.screenshot({ path: path.join(OUT, `${tag}-3-development.png`) });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1600);
  await page.screenshot({ path: path.join(OUT, `${tag}-4-footer.png`) });
  await page.close();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const before = await serve(path.join(ROOT, '.tmp-perf-before'), 3201);
  const after = await serve(ROOT, 3202);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    await shoot(browser, 3201, 'before');
    await shoot(browser, 3202, 'after');
  } finally {
    await browser.close();
    before.close();
    after.close();
  }
  console.log('shots written to', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
