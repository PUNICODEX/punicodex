const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' });
  const page = await context.newPage();
  await page.goto('https://punycodex-main-3qtxqhylq-hekaverse.vercel.app/sites/zeus/', { waitUntil: 'networkidle' });

  const nav = await page.locator('.tab-nav').first();
  const logoImg = await page.locator('.tab-nav .nav-logo-img').first();
  const strip = await page.locator('.global-strip').first();

  console.log('global strip:', await strip.boundingBox());
  console.log('tab-nav:', await nav.boundingBox());
  console.log('logo img:', await logoImg.boundingBox());

  await browser.close();
})();
