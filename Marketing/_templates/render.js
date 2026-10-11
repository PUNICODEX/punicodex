/* Render all Play Store marketing graphics at exact required sizes.
 * Phone: 1080x1920 (required) · 7" tablet: 1200x1920 · 10" tablet: 1600x2560.
 * Raw captures are 1344x2992 (taller than Play's 2:1 limit) — the framed
 * compositions are the compliant deliverables.
 */
const { chromium } = require('playwright-core');

const ROOT = 'C:/projects/punicodex';
const T = `${ROOT}/marketing/_templates`;
const OG = `file:///${ROOT}/assets/og`;
const W = `file:///${ROOT}/marketing/_work`;

const SHOTS = [
  {
    file: 'screenshot-1-directory.png',
    shot: `${W}/crop_palette.png`,
    backdrop: `${OG}/apollon.jpg`,
    kicker: 'The Unicode Directory',
    headline: '1,700+ symbols. One Ω key.',
    sub: 'Greek, runes, hieroglyphs, math, combining marks — searchable, categorized, offline.',
  },
  {
    file: 'screenshot-2-latin.png',
    shot: `${W}/crop_pal_first.png`,
    backdrop: `${OG}/athena.jpg`,
    kicker: 'First Category · Latin',
    headline: 'Á Æ È É Ê — all of it',
    sub: 'Every precomposed Latin diacritic, plus combining marks for the rest.',
  },
  {
    file: 'screenshot-3-letterlike.png',
    shot: `${W}/crop_pal_last.png`,
    backdrop: `${OG}/hekate.jpg`,
    kicker: 'Last Category · Letterlike',
    headline: '…to ℞ № ™ ℀',
    sub: 'Twenty-six categories deep — currency, cuneiform, Braille, Baybayin and more.',
  },
  {
    file: 'screenshot-4-convert.png',
    shot: `${W}/crop_type.png`,
    backdrop: `${OG}/zeus.jpg`,
    kicker: 'Scholarly Unicode',
    headline: 'Type “apoll”. Get Apóllōn.',
    sub: '980 restored names across 25 pantheons — accents, macrons, the works.',
  },
  {
    file: 'screenshot-5-temple.png',
    shot: `${W}/crop_detail.png`,
    backdrop: `${OG}/apollon.jpg`,
    kicker: '980 Living Temples',
    headline: 'Every name opens its temple',
    sub: 'Lore, pronunciation, scholarly variants — and its real Unicode domain.',
  },
  {
    file: 'screenshot-6-keyboard.png',
    shot: `${W}/crop_ime.png`,
    backdrop: `${OG}/ares.jpg`,
    kicker: 'A Real Keyboard',
    headline: 'Not stickers. Scholarship.',
    sub: 'A full system keyboard with a 980-name suggestion engine baked in.',
  },
  {
    file: 'screenshot-7-shield.png',
    shot: `${W}/crop_shield.png`,
    backdrop: `${OG}/athena.jpg`,
    kicker: 'Authenticity Shield',
    headline: 'Spot lookalike names',
    sub: 'Homograph and mixed-script spoofs — checked offline, on your device.',
  },
  {
    file: 'screenshot-8-setup.png',
    shot: `${W}/crop_setup.png`,
    backdrop: `${OG}/nike.jpg`,
    kicker: 'Thirty Seconds',
    headline: 'Enable. Switch. Type.',
    sub: 'No accounts, no uploads — everything stays on your device.',
  },
];

const SIZES = [
  { dir: 'phone', w: 1080, h: 1920, frame: 'phone' },
  { dir: 'tablet-7in', w: 1200, h: 1920, frame: 'tablet' },
  { dir: 'tablet-10in', w: 1600, h: 2560, frame: 'tablet' },
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });

  const fs = require('fs');
  for (const size of SIZES) {
    const outDir = `${ROOT}/marketing/google-play/${size.dir}`;
    fs.mkdirSync(outDir, { recursive: true });
    for (const s of SHOTS) {
      const page = await browser.newPage({
        viewport: { width: size.w, height: size.h },
        deviceScaleFactor: 1,
      });
      const q = new URLSearchParams({
        shot: s.shot,
        backdrop: s.backdrop,
        kicker: s.kicker,
        headline: s.headline,
        sub: s.sub,
        w: String(size.w),
        h: String(size.h),
        frame: size.frame,
      });
      await page.goto('file://' + T + '/screenshot.html?' + q.toString());
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${outDir}/${s.file}` });
      await page.close();
    }
    console.log(`rendered ${SHOTS.length} shots @ ${size.w}x${size.h} -> ${size.dir}/`);
  }

  const fg = await browser.newPage({
    viewport: { width: 1024, height: 500 },
    deviceScaleFactor: 1,
  });
  await fg.goto('file://' + T + '/feature.html');
  await fg.waitForTimeout(900);
  await fg.screenshot({ path: `${ROOT}/marketing/google-play/feature-graphic-1024x500.png` });
  console.log('rendered feature-graphic-1024x500.png');

  // Laptop promo (web/social/ChromeOS) — browser-chrome frame, 1920x1080
  const promoDir = `${ROOT}/marketing/google-play/promo`;
  fs.mkdirSync(promoDir, { recursive: true });
  const lap = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  await lap.goto('file://' + T + '/laptop.html');
  await lap.waitForTimeout(900);
  await lap.screenshot({ path: `${promoDir}/laptop-1920x1080.png` });
  console.log('rendered promo/laptop-1920x1080.png');

  await browser.close();
})();
