const { chromium } = require('playwright-core');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BASE = process.argv[2] || 'https://punicodex-main-hekaverse.vercel.app';
const IDS = (process.argv[3] || 'om').split(',');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  for (const id of IDS) {
    await page.goto(`${BASE}/sites/${id}/`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(600);
    const info = await page.evaluate(() => {
      const html = document.documentElement;
      const hero = document.querySelector('.endorsement-hero');
      const title = document.querySelector('.endorsement-title');
      return {
        scrollWidth: html.scrollWidth,
        clientWidth: html.clientWidth,
        heroHeight: hero ? hero.getBoundingClientRect().height : null,
        titleText: title ? title.textContent.trim() : null,
        titleRect: title ? title.getBoundingClientRect() : null,
        titleStyle: title ? { fontSize: window.getComputedStyle(title).fontSize, color: window.getComputedStyle(title).color } : null,
      };
    });
    console.log(id, JSON.stringify(info, null, 2));
    await page.screenshot({ path: path.join(ROOT, `tools/mobile-prod-top-${id}.png`), fullPage: false });
  }
  await browser.close();
})();
