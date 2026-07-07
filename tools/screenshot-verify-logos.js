const { chromium } = require('playwright-core');
const BASE = process.env.BASE || 'https://punycodex-main-5xkio15ko-hekaverse.vercel.app';
const ids = ['zeus','hekate','om','demeter'];
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  for (const id of ids) {
    await page.goto(`${BASE}/sites/${id}/`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1000);
    const metrics = await page.evaluate(() => {
      const img = document.querySelector('.nav-logo-img');
      const nav = document.querySelector('.main-nav');
      const strip = document.querySelector('.global-strip');
      const rect = img ? img.getBoundingClientRect() : null;
      const navRect = nav ? nav.getBoundingClientRect() : null;
      const stripRect = strip ? strip.getBoundingClientRect() : null;
      return {
        imgHeight: rect ? rect.height : null,
        imgTop: rect ? rect.top : null,
        navTop: navRect ? navRect.top : null,
        stripBottom: stripRect ? stripRect.bottom : null,
        overlap: rect && stripRect ? rect.top < stripRect.bottom : null,
      };
    });
    await page.screenshot({ path: `tools/mobile-logo-${id}.png`, fullPage: false });
    console.log(id, JSON.stringify(metrics));
  }
  await browser.close();
})();
