const { chromium } = require('playwright-core');
const BASE = process.argv[2] || 'https://punicodex-main-pebt8502q-hekaverse.vercel.app';
const IDS = (process.argv[3] || 'zeus,demeter,hekate').split(',');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  for (const id of IDS) {
    await page.goto(`${BASE}/sites/${id}/`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1000);
    const info = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.hero-canvas, canvas[data-effect]');
      const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
      return {
        canvasId: canvas ? canvas.id : null,
        hasClassHeroCanvas: canvas ? canvas.classList.contains('hero-canvas') : false,
        dataEffect: canvas ? canvas.getAttribute('data-effect') : null,
        scriptSrcs: scripts.filter(s => s.includes('script.js') || s.includes('flagship-canvas')),
      };
    });
    console.log(id, JSON.stringify(info));
  }
  await browser.close();
})();
