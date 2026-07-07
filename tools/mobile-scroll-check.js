const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
const PORT = 9876;
const IDS = (process.argv[2] || 'zeus,hekate').split(',');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

function serve(req, res) {
  let url = req.url.split('?')[0];
  if (url.endsWith('/')) url += 'index.html';
  const filePath = path.join(ROOT, url.replace(/^\//, ''));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

async function run() {
  const server = http.createServer(serve).listen(PORT);
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });

  for (const id of IDS) {
    const page = await context.newPage();
    const url = `http://localhost:${PORT}/sites/${id}/`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const el = document.querySelector('#spaces');
      if (el) el.scrollIntoView({ block: 'start' });
    });
    await page.waitForTimeout(1000);
    const data = await page.evaluate(() => {
      const layout = document.querySelector('.spaces-layout');
      const firstSlot = document.querySelector('.space-slot');
      const firstFrame = document.querySelector('.space-frame');
      return {
        layoutClass: layout ? layout.className : null,
        layoutOpacity: layout ? window.getComputedStyle(layout).opacity : null,
        layoutDisplay: layout ? window.getComputedStyle(layout).display : null,
        layoutTransform: layout ? window.getComputedStyle(layout).transform : null,
        layoutRect: layout ? layout.getBoundingClientRect() : null,
        slotRect: firstSlot ? firstSlot.getBoundingClientRect() : null,
        slotOpacity: firstSlot ? window.getComputedStyle(firstSlot).opacity : null,
        frameRect: firstFrame ? firstFrame.getBoundingClientRect() : null,
        frameBackground: firstFrame ? window.getComputedStyle(firstFrame).background : null,
      };
    });
    console.log(id, JSON.stringify(data, null, 2));
    await page.screenshot({ path: path.join(ROOT, `tools/mobile-${id}-scroll-spaces.png`), fullPage: false });
    await page.close();
  }

  await browser.close();
  await new Promise((r) => server.close(r));
  console.log('Done');
}

run().catch((e) => { console.error(e); process.exit(1); });
