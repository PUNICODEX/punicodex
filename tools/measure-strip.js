const { chromium } = require('playwright-core');
const BASE = process.env.BASE || 'https://punicodex-main-5xkio15ko-hekaverse.vercel.app';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  for (const vp of [{ width: 375, height: 812, name: 'mobile' }, { width: 1280, height: 800, name: 'desktop' }]) {
    const context = await browser.newContext({ viewport: vp });
    const page = await context.newPage();
    await page.goto(`${BASE}/sites/zeus/`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const strip = document.querySelector('.global-strip');
      const nav = document.querySelector('.main-nav');
      const img = document.querySelector('.nav-logo-img');
      const sR = strip ? strip.getBoundingClientRect() : null;
      const nR = nav ? nav.getBoundingClientRect() : null;
      const iR = img ? img.getBoundingClientRect() : null;
      return { stripH: sR ? sR.height : null, stripBottom: sR ? sR.bottom : null, navTop: nR ? nR.top : null, imgTop: iR ? iR.top : null, overlap: iR && sR ? iR.top < sR.bottom : null };
    });
    console.log(vp.name, JSON.stringify(m));
    await context.close();
  }
  await browser.close();
})();
