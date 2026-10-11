/* Render Desktop-assets screenshots (1920x1080): the APP in a ChromeOS-style
 * window on a desktop scene — this is what Play's Desktop slot wants.
 * Run: node Marketing/_templates/render-desktop.js */
const { chromium } = require('playwright-core');

const ROOT = 'C:/projects/punicodex';
const T = 'file:///' + ROOT + '/Marketing/_templates';
const W = 'file:///' + ROOT + '/Marketing/_work';
const OUT = ROOT + '/Marketing/google-play/desktop';

const SHOTS = [
  {
    file: 'desktop-1-directory.png',
    shot: W + '/crop_all.png',
    kicker: 'Runs on Chromebooks',
    headline: 'The Unicode Directory, on desktop',
    sub: 'The full Android app — keyboard, directory, temples — in a desktop window.',
    chips: '1,700+ Symbols|26 Categories|980 Names',
  },
  {
    file: 'desktop-2-convert.png',
    shot: W + '/crop_type.png',
    kicker: 'Scholarly Unicode',
    headline: 'Type “apoll”. Get Apóllōn.',
    sub: 'Every accent and macron, restored from the sources.',
    chips: '25 Pantheons|Original Scripts',
  },
  {
    file: 'desktop-3-temple.png',
    shot: W + '/crop_detail.png',
    kicker: '980 Living Temples',
    headline: 'Every name opens its temple',
    sub: 'Lore, pronunciation, variants — and its real Unicode domain.',
    chips: 'apollon.com|Zeus.com',
  },
  {
    file: 'desktop-4-shield.png',
    shot: W + '/crop_shield.png',
    kicker: 'Authenticity Shield',
    headline: 'Spot lookalike names',
    sub: 'Homograph and mixed-script spoofs — checked offline.',
    chips: 'On-Device|Zero Keylogging',
  },
  {
    file: 'desktop-5-setup.png',
    shot: W + '/crop_setup.png',
    kicker: 'Signed, Sealed',
    headline: 'Your keyboard, your device',
    sub: 'No accounts, no uploads — everything stays local.',
    chips: 'Works Offline|No Sign-Up',
  },
];

(async () => {
  const fs = require('fs');
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  for (const s of SHOTS) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const q = new URLSearchParams({ shot: s.shot, kicker: s.kicker, headline: s.headline, sub: s.sub, chips: s.chips });
    await page.goto(T + '/desktop.html?' + q.toString());
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${s.file}` });
    console.log('rendered', s.file);
    await page.close();
  }
  await browser.close();
})();
