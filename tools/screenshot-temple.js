// Screenshot rig for temple page visual QA.
// Serves the repo root statically, captures full-page screenshots of lore and
// extended pages, slices them into viewport-height chunks with sharp.
// Usage: node tools/screenshot-temple.js <id> [<id>...]
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let rel = url;
  if (rel.endsWith('/')) rel += 'index.html';
  if (rel === '') rel = 'index.html';
  let file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

(async () => {
  await new Promise((r) => server.listen(4799, r));
  const exe = fs
    .readdirSync(path.join(process.env.LOCALAPPDATA, 'ms-playwright'))
    .filter((d) => d.startsWith('chromium-'))
    .sort()
    .pop();
  const base = path.join(process.env.LOCALAPPDATA, 'ms-playwright', exe);
  const exeName = fs.existsSync(path.join(base, 'chrome-win64'))
    ? path.join('chrome-win64', 'chrome.exe')
    : path.join('chrome-win', 'chrome.exe');
  const executablePath = path.join(base, exeName);
  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const outDir = path.join(ROOT, '.tmp-shots');
  fs.mkdirSync(outDir, { recursive: true });

  for (const id of process.argv.slice(2)) {
    for (const sub of ['lore', 'lore-extended']) {
      const urlPath = sub === 'lore' ? `/sites/${id}/lore/` : `/sites/${id}/lore/extended/`;
      await page.goto(`http://127.0.0.1:4799${urlPath}`, { waitUntil: 'networkidle' });
      // Neutralize scroll-reveal animations and lazy loading so the full-page
      // capture shows every section as a real visitor would see it.
      await page.addStyleTag({
        content:
          '.reveal-up,.reveal-scale,.reveal-fade{opacity:1 !important;transform:none !important;}',
      });
      await page.evaluate(async () => {
        document.querySelectorAll('img[loading="lazy"]').forEach((i) => {
          i.loading = 'eager';
        });
        await new Promise((r) => setTimeout(r, 400));
      });
      await page.waitForTimeout(1200);
      const file = path.join(outDir, `${id}-${sub}.png`);
      await page.screenshot({ path: file, fullPage: true });
      // Slice into ~2200px chunks for readable review
      const meta = await sharp(file).metadata();
      const chunkH = 2200;
      for (let y = 0, i = 0; y < meta.height; y += chunkH, i++) {
        const h = Math.min(chunkH, meta.height - y);
        await sharp(file)
          .extract({ left: 0, top: y, width: meta.width, height: h })
          .png()
          .toFile(path.join(outDir, `${id}-${sub}-${String(i).padStart(2, '0')}.png`));
      }
      console.log(`${id} ${sub}: ${meta.width}x${meta.height} sliced`);
    }
  }
  await browser.close();
  server.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
