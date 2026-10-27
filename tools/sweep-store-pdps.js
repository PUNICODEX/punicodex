// Batch live-browser sweep: click every colour + artwork chip on a set of
// PDPs and report anomalies (box size changes, src not swapping, 404s).
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { chromium } = require('playwright-core');

const URLS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'https://punicodex.com/store/apollon/tee/',
      'https://punicodex.com/store/odinn/tee/',
      'https://punicodex.com/store/thor/tee/',
      'https://punicodex.com/store/athena/tee/',
      'https://punicodex.com/store/zeus/hoodie/',
      'https://punicodex.com/store/zeus/crewneck/',
      'https://punicodex.com/store/zeus/cap/',
      'https://punicodex.com/store/zeus/mug/',
      'https://punicodex.com/store/zeus/tote/',
      'https://punicodex.com/store/zeus/print/',
      'https://punicodex.com/store/zeus/tumbler/',
      'https://punicodex.com/store/zeus/phonecase/',
      'https://punicodex.com/store/zeus/notebook/',
      'https://punicodex.com/store/zeus/sticker/',
      'https://punicodex.com/store/zeus/pin/',
      'https://punicodex.com/store/zeus/canvas/',
    ];

function findChromium() {
  const base = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
  for (const rev of fs.readdirSync(base).sort().reverse()) {
    if (/^chromium-\d+$/.test(rev)) {
      const p = path.join(base, rev, 'chrome-win', 'chrome.exe');
      const p64 = path.join(base, rev, 'chrome-win64', 'chrome.exe');
      if (fs.existsSync(p64)) return p64;
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

(async () => {
  const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const failures = [];
  page.on('requestfailed', (r) => failures.push(`${r.url().split('/').slice(-1)[0]}: ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    if (r.status() >= 400 && /\.(jpg|jpeg|png|webp)/.test(r.url())) failures.push(`${r.url().split('/').slice(-1)[0]}: HTTP ${r.status()}`);
  });

  for (const url of URLS) {
    failures.length = 0;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(800);
    const snaps = [];
    const snap = async (label) => {
      const s = await page.evaluate(() => {
        const img = document.getElementById('stage-img');
        const r = img.getBoundingClientRect();
        const stage = img.parentElement.getBoundingClientRect();
        const overlay = document.querySelector('.cfg-art');
        const or = overlay ? overlay.getBoundingClientRect() : null;
        return {
          src: img.currentSrc.split('/').slice(-1)[0],
          ok: img.complete && img.naturalWidth > 0,
          img: [Math.round(r.width), Math.round(r.height)],
          stage: [Math.round(stage.width), Math.round(stage.height)],
          overlay: or && getComputedStyle(overlay).display !== 'none' ? [Math.round(or.width), Math.round(or.height)] : null,
        };
      });
      snaps.push([label, s]);
      return s;
    };
    const init = await snap('init');
    const problems = [];
    const boxes = new Set([JSON.stringify(init.stage)]);

    const cChips = await page.$$('#cfg-mount .cfg-chip--color');
    for (let i = 0; i < cChips.length; i++) {
      const label = await cChips[i].getAttribute('title');
      await cChips[i].click();
      await page.waitForTimeout(450);
      const s = await snap(`colour:${label}`);
      boxes.add(JSON.stringify(s.stage));
      if (s.src === init.src && label !== (await cChips[0].getAttribute('title'))) {
        // src didn't change — expected only when the composite is kept for default colour
      }
    }
    const aChips = await page.$$('#cfg-mount .cfg-chip--art');
    for (let i = 0; i < aChips.length; i++) {
      const label = await aChips[i].getAttribute('title');
      await aChips[i].click();
      await page.waitForTimeout(450);
      const s = await snap(`art:${label}`);
      boxes.add(JSON.stringify(s.stage));
    }

    const name = url.replace('https://punicodex.com/store/', '').replace(/\/$/, '');
    console.log(`\n=== ${name} ===`);
    for (const [label, s] of snaps) {
      console.log(
        ` ${label.padEnd(28)} src=${String(s.src).padEnd(22)} img=${s.img} stage=${s.stage} overlay=${s.overlay || '-'} ${s.ok ? '' : 'NOT-LOADED'}`
      );
    }
    if (boxes.size > 1) console.log(` !!! STAGE BOX CHANGED ACROSS CLICKS: ${[...boxes].join(' | ')}`);
    if (failures.length) console.log(` !!! REQUEST FAILURES: ${failures.join('; ')}`);
  }
  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
