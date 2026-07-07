const { chromium } = require('playwright-core');
const BASE = 'https://punycodex-main-5xkio15ko-hekaverse.vercel.app';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/sites/zeus/`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(1000);
  const info = await page.evaluate(() => {
    const nav = document.querySelector('.main-nav');
    const cs = window.getComputedStyle(nav);
    const strip = document.querySelector('.global-strip');
    const stripCS = window.getComputedStyle(strip);
    return {
      top: cs.top,
      position: cs.position,
      classList: nav.className,
      stripHeight: stripCS.height,
      stripBottom: strip ? strip.getBoundingClientRect().bottom : null,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
