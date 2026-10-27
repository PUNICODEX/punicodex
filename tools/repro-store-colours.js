// Live-browser repro for store PDP colour/artwork selection behavior.
// Usage: node tools/repro-store-colours.js [url]
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { chromium } = require('playwright-core');

const URL = process.argv[2] || 'https://punicodex.com/store/zeus/tee/';
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

function findChromium() {
  const base = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
  const cands = [];
  for (const rev of fs.readdirSync(base)) {
    if (/^chromium-\d+$/.test(rev)) {
      cands.push(path.join(base, rev, 'chrome-win', 'chrome.exe'));
      cands.push(path.join(base, rev, 'chrome-win64', 'chrome.exe'));
    }
    if (/^chromium_headless_shell-\d+$/.test(rev)) {
      cands.push(path.join(base, rev, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'));
    }
  }
  return cands.find((p) => fs.existsSync(p));
}

(async () => {
  const executablePath = findChromium();
  if (!executablePath) throw new Error('no cached chromium found');
  const browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('  [console.error]', m.text().slice(0, 160));
  });
  page.on('requestfailed', (r) => console.log('  [reqfail]', r.url().slice(0, 120), r.failure()?.errorText));

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(500);

  const snap = () =>
    page.evaluate(() => {
      const img = document.getElementById('stage-img');
      const r = img.getBoundingClientRect();
      const stage = img.parentElement.getBoundingClientRect();
      const overlay = document.querySelector('.cfg-art');
      const or = overlay ? overlay.getBoundingClientRect() : null;
      return {
        src: img.currentSrc.split('/').slice(-1)[0],
        loaded: img.complete && img.naturalWidth > 0,
        natural: [img.naturalWidth, img.naturalHeight],
        imgBox: [Math.round(r.width), Math.round(r.height)],
        stageBox: [Math.round(stage.width), Math.round(stage.height)],
        overlay: or
          ? { src: overlay.currentSrc.split('/').slice(-1)[0], display: getComputedStyle(overlay).display, box: [Math.round(or.width), Math.round(or.height)] }
          : null,
        note: (document.getElementById('colour-note') || {}).textContent || '',
      };
    });

  const slug = URL.replace(/[^a-z0-9]+/gi, '_').slice(-40);
  console.log('URL:', URL);
  console.log('\nINIT');
  console.log(JSON.stringify(await snap(), null, 1));
  await page.screenshot({ path: path.join(SHOTS, `${slug}-init.png`) });

  // Colour chips
  const chips = await page.$$('#cfg-mount .cfg-chip--color');
  console.log(`\n${chips.length} colour chips`);
  for (let i = 0; i < chips.length; i++) {
    const label = await chips[i].getAttribute('title');
    await chips[i].click();
    await page.waitForTimeout(700);
    console.log(`\nCOLOUR[${i}] ${label}`);
    console.log(JSON.stringify(await snap(), null, 1));
    if (i < 3) await page.screenshot({ path: path.join(SHOTS, `${slug}-colour-${i}-${label}.png`) });
  }

  // Artwork chips (if any)
  const arts = await page.$$('#cfg-mount .cfg-chip--art');
  console.log(`\n${arts.length} artwork chips`);
  for (let i = 0; i < arts.length; i++) {
    const label = await arts[i].getAttribute('title');
    await arts[i].click();
    await page.waitForTimeout(700);
    console.log(`\nART[${i}] ${label}`);
    console.log(JSON.stringify(await snap(), null, 1));
  }
  await page.screenshot({ path: path.join(SHOTS, `${slug}-final.png`) });

  await browser.close();
  console.log('\nScreenshots in', SHOTS);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
