const { chromium } = require('playwright-core');
const BASE = 'https://punycodex-main-pebt8502q-hekaverse.vercel.app';
const ids = ['zeus','hekate','om'];
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  for (const id of ids) {
    await page.goto(`${BASE}/sites/${id}/`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `tools/mobile-menu-${id}.png`, fullPage: false });
    console.log('saved', id);
  }
  await browser.close();
})();
