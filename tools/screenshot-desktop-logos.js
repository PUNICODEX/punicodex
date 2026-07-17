const { chromium } = require('playwright-core');
const BASE = process.env.BASE || 'https://punicodex-main-5xkio15ko-hekaverse.vercel.app';
const ids = ['zeus','hekate','om','demeter'];
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  for (const id of ids) {
    await page.goto(`${BASE}/sites/${id}/`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(500);
    const metrics = await page.evaluate(() => {
      const img = document.querySelector('.nav-logo-img');
      const strip = document.querySelector('.global-strip');
      const nav = document.querySelector('.main-nav');
      const iR = img ? img.getBoundingClientRect() : null;
      const sR = strip ? strip.getBoundingClientRect() : null;
      const nR = nav ? nav.getBoundingClientRect() : null;
      return { imgHeight: iR?iR.height:null, imgTop: iR?iR.top:null, navTop: nR?nR.top:null, stripBottom: sR?sR.bottom:null, overlap: iR&&sR?iR.top<sR.bottom:null };
    });
    await page.screenshot({ path: `tools/desktop-logo-${id}.png`, fullPage: false });
    console.log(id, JSON.stringify(metrics));
  }
  await browser.close();
})();
