const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'https://punicodex-main-5xkio15ko-hekaverse.vercel.app';
const effects = JSON.parse(fs.readFileSync(path.join(__dirname, '../templates/flagship/effects/effects.json'), 'utf8'));

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  const ids = Object.keys(effects).sort();
  const issues = [];
  for (const id of ids) {
    try {
      await page.goto(`${BASE}/sites/${id}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(800);
      const result = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        const canvas = document.querySelector('canvas.hero-canvas, canvas[data-effect]');
        const script = Array.from(document.querySelectorAll('script[src]')).find(s => s.src.includes('script.js'));
        const badge = document.querySelector('.endorsement-title');
        const img = document.querySelector('.nav-logo-img');
        const strip = document.querySelector('.global-strip');
        const iR = img ? img.getBoundingClientRect() : null;
        const sR = strip ? strip.getBoundingClientRect() : null;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          overflow: doc.scrollWidth > doc.clientWidth,
          canvasId: canvas ? canvas.id : null,
          scriptLoaded: !!script,
          titleFontSize: badge ? window.getComputedStyle(badge).fontSize : null,
          logoOverlap: iR && sR ? iR.top < sR.bottom : null,
        };
      });
      if (result.overflow) issues.push({ id, issue: `horizontal overflow ${result.scrollWidth} > ${result.clientWidth}` });
      if (!result.canvasId) issues.push({ id, issue: 'no hero canvas found' });
      if (result.logoOverlap) issues.push({ id, issue: 'logo overlaps global strip' });
      console.log(`${id}: canvas=${result.canvasId || 'NO'} overflow=${result.overflow} overlap=${result.logoOverlap}`);
    } catch (e) {
      issues.push({ id, issue: `navigation error: ${e.message}` });
      console.log(`${id}: ERROR ${e.message}`);
    }
  }
  await browser.close();
  if (issues.length) {
    console.log('\nISSUES:');
    issues.forEach(i => console.log(`- ${i.id}: ${i.issue}`));
    process.exit(1);
  } else {
    console.log('\nAll good.');
  }
})();
