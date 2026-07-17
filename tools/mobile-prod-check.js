const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const BASE = process.argv[2] || 'https://punicodex-main-hekaverse.vercel.app';
const IDS = (process.argv[3] || 'zeus,hekate,tiamat,tyr').split(',');

async function run() {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  for (const id of IDS) {
    const url = `${BASE}/sites/${id}/`;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(500);
      const info = await page.evaluate(() => {
        const html = document.documentElement;
        return {
          scrollWidth: html.scrollWidth,
          clientWidth: html.clientWidth,
          slotCount: document.querySelectorAll('.space-slot').length,
          globalLinksDisplay: window.getComputedStyle(document.querySelector('.global-links')).display,
          globalBrandText: document.querySelector('.global-brand')?.textContent?.trim(),
        };
      });
      console.log(id, 'scroll', info.scrollWidth, 'client', info.clientWidth, 'overflow?', info.scrollWidth > info.clientWidth, 'links', info.globalLinksDisplay, 'brand', info.globalBrandText);
      // Scroll to spaces for screenshot
      await page.evaluate(() => {
        const el = document.querySelector('#spaces');
        if (el) el.scrollIntoView({ block: 'start' });
      });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(ROOT, `tools/mobile-prod-${id}.png`), fullPage: false });
    } catch (e) {
      console.error(id, 'ERROR', e.message);
    }
  }

  await browser.close();
  console.log('Done');
}

run().catch((e) => { console.error(e); process.exit(1); });
