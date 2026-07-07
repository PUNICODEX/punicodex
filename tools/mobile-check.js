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
  const page = await context.newPage();

  const results = [];
  for (const id of IDS) {
    const url = `http://localhost:${PORT}/sites/${id}/`;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(800);
      const info = await page.evaluate(() => {
        const html = document.documentElement;
        const body = document.body;
        const section = document.querySelector('.spaces-section');
        const sectionStyle = section ? window.getComputedStyle(section) : null;
        const slot = document.querySelector('.space-slot');
        const slotStyle = slot ? window.getComputedStyle(slot) : null;
        const frame = document.querySelector('.space-frame');
        const frameStyle = frame ? window.getComputedStyle(frame) : null;
        const frameContent = document.querySelector('.space-frame-content');
        const contentStyle = frameContent ? window.getComputedStyle(frameContent) : null;
        const name = document.querySelector('.space-name');
        const nameStyle = name ? window.getComputedStyle(name) : null;
        const dims = document.querySelector('.space-dims');
        const dimsStyle = dims ? window.getComputedStyle(dims) : null;
        return {
          scrollWidth: html.scrollWidth,
          clientWidth: html.clientWidth,
          bodyScrollWidth: body.scrollWidth,
          bodyClientWidth: body.clientWidth,
          overflowX: window.getComputedStyle(body).overflowX,
          slotCount: document.querySelectorAll('.space-slot').length,
          section: {
            height: section ? section.getBoundingClientRect().height : null,
            backgroundColor: sectionStyle ? sectionStyle.backgroundColor : null,
            color: sectionStyle ? sectionStyle.color : null,
          },
          slot: {
            width: slot ? slot.getBoundingClientRect().width : null,
            height: slot ? slot.getBoundingClientRect().height : null,
            backgroundColor: slotStyle ? slotStyle.backgroundColor : null,
            color: slotStyle ? slotStyle.color : null,
          },
          frame: {
            width: frame ? frame.getBoundingClientRect().width : null,
            height: frame ? frame.getBoundingClientRect().height : null,
            backgroundColor: frameStyle ? frameStyle.backgroundColor : null,
            border: frameStyle ? frameStyle.border : null,
            color: frameStyle ? frameStyle.color : null,
          },
          frameContent: {
            width: frameContent ? frameContent.getBoundingClientRect().width : null,
            height: frameContent ? frameContent.getBoundingClientRect().height : null,
            backgroundColor: contentStyle ? contentStyle.backgroundColor : null,
            border: contentStyle ? contentStyle.border : null,
            color: contentStyle ? contentStyle.color : null,
          },
          name: {
            text: name ? name.textContent.trim() : null,
            color: nameStyle ? nameStyle.color : null,
          },
          dims: {
            text: dims ? dims.textContent.trim() : null,
            color: dimsStyle ? dimsStyle.color : null,
          },
        };
      });
      const overflows = info.scrollWidth > info.clientWidth;
      const screenshotPath = path.join(ROOT, `tools/mobile-${id}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      results.push({ id, url, ...info, overflows, screenshotPath });
      console.log(id, 'scroll', info.scrollWidth, 'client', info.clientWidth, 'overflow?', overflows, 'slots', info.slotCount);
      console.log(JSON.stringify({ section: info.section, slot: info.slot, frame: info.frame, frameContent: info.frameContent, name: info.name, dims: info.dims }, null, 2));
    } catch (e) {
      results.push({ id, url, error: e.message });
      console.error(id, 'ERROR', e.message);
    }
  }

  await browser.close();
  await new Promise((r) => server.close(r));
  fs.writeFileSync(path.join(ROOT, 'tools/mobile-check-results.json'), JSON.stringify(results, null, 2));
  console.log('Done');
}

run().catch((e) => { console.error(e); process.exit(1); });
