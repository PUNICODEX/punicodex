/* Desktop-assets screenshots (1920x1080): the laptop hardware mockup with
 * the APP in a desktop window on the screen — same design language as the
 * website laptop promos, app content instead. Eight shots matching the
 * phone set. Run: node Marketing/_templates/render-desktop.js */
const { chromium } = require('playwright-core');

const ROOT = 'C:/projects/punicodex';
const T = 'file:///' + ROOT + '/Marketing/_templates';
const OG = 'file:///' + ROOT + '/assets/og';
const W = 'file:///' + ROOT + '/Marketing/_work';
const OUT = ROOT + '/Marketing/google-play/desktop';

const SHOTS = [
  { file: 'desktop-1-directory.png', shot: W + '/crop_all.png', backdrop: OG + '/apollon.jpg', kicker: 'The Unicode Directory', headline: '1,700+ symbols. One Ω key.', sub: 'Greek, runes, hieroglyphs, math, combining marks — searchable, categorized, offline.' },
  { file: 'desktop-2-latin.png', shot: W + '/crop_latin.png', backdrop: OG + '/athena.jpg', kicker: 'First Category · Latin', headline: 'Á Æ È É Ê — all of it', sub: 'Every precomposed Latin diacritic, plus combining marks for the rest.' },
  { file: 'desktop-3-letterlike.png', shot: W + '/crop_letter.png', backdrop: OG + '/hekate.jpg', kicker: 'Last Category · Letterlike', headline: '…to ℞ № ™ ℀', sub: 'Twenty-six categories deep — currency, cuneiform, Braille, Baybayin and more.' },
  { file: 'desktop-4-convert.png', shot: W + '/crop_type.png', backdrop: OG + '/zeus.jpg', kicker: 'Scholarly Unicode', headline: 'Type “apoll”. Get Apóllōn.', sub: '980 restored names across 25 pantheons — accents, macrons, the works.' },
  { file: 'desktop-5-temple.png', shot: W + '/crop_detail.png', backdrop: OG + '/apollon.jpg', kicker: '980 Living Temples', headline: 'Every name opens its temple', sub: 'Lore, pronunciation, scholarly variants — and its real Unicode domain.' },
  { file: 'desktop-6-keyboard.png', shot: W + '/crop_ime.png', backdrop: OG + '/ares.jpg', kicker: 'A Real Keyboard', headline: 'Not stickers. Scholarship.', sub: 'A full system keyboard with a 980-name suggestion engine baked in.' },
  { file: 'desktop-7-shield.png', shot: W + '/crop_shield.png', backdrop: OG + '/athena.jpg', kicker: 'Authenticity Shield', headline: 'Spot lookalike names', sub: 'Homograph and mixed-script spoofs — checked offline, on your device.' },
  { file: 'desktop-8-setup.png', shot: W + '/crop_setup.png', backdrop: OG + '/nike.jpg', kicker: 'Thirty Seconds', headline: 'Enable. Switch. Type.', sub: 'No accounts, no uploads — everything stays on your device.' },
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
    const q = new URLSearchParams({
      shot: s.shot,
      backdrop: s.backdrop,
      kicker: s.kicker,
      headline: s.headline,
      sub: s.sub,
      url: 'PuniCodex app',
      mode: 'app',
    });
    await page.goto(T + '/laptop.html?' + q.toString());
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${s.file}` });
    console.log('rendered', s.file);
    await page.close();
  }
  await browser.close();
})();
