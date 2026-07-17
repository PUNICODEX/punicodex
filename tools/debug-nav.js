const { chromium } = require('playwright-core');
const BASE = 'https://punicodex-main-5xkio15ko-hekaverse.vercel.app';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/sites/zeus/`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(1000);
  const info = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('.main-nav'));
    return all.map((nav, i) => {
      const cs = window.getComputedStyle(nav);
      const r = nav.getBoundingClientRect();
      return { i, classes: nav.className, top: cs.top, rectTop: r.top, rectBottom: r.bottom, height: r.height };
    });
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
