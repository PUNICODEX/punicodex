/* Desktop-assets screenshots (1920x1080): the laptop hardware mockup with
 * the APP filling the display, full-bleed. Character-forward set matching
 * the desktop product (the Keyboard tab is hidden on large form factors).
 * Run: node Marketing/_templates/render-desktop.js */
const { chromium } = require('playwright-core');

const ROOT = 'C:/projects/punicodex';
const T = 'file:///' + ROOT + '/Marketing/_templates';
const OG = 'file:///' + ROOT + '/assets/og';
const W = 'file:///' + ROOT + '/Marketing/_work';
const OUT = ROOT + '/Marketing/google-play/desktop';

const SHOTS = [
  { file: 'desktop-1-directory.png', shot: W + '/wide_directory.png', backdrop: OG + '/apollon.jpg', kicker: 'The Unicode Directory', headline: '6,000+ symbols. One Ω key.', sub: 'Greek, runes, hieroglyphs, math, combining marks — searchable, categorized, offline.' },
  { file: 'desktop-2-latin.png', shot: W + '/wide_latin.png', backdrop: OG + '/athena.jpg', kicker: 'First Category · Latin', headline: 'Á Æ È É Ê — all of it', sub: 'Every precomposed Latin diacritic, plus combining marks for the rest.' },
  { file: 'desktop-3-letterlike.png', shot: W + '/wide_letterlike.png', backdrop: OG + '/hekate.jpg', kicker: 'Last Category · Letterlike', headline: '…to ℞ № ™ ℀', sub: 'Twenty-six categories deep — currency, cuneiform, Braille, Baybayin and more.' },
  { file: 'desktop-4-convert.png', shot: W + '/wide_convert.png', backdrop: OG + '/zeus.jpg', kicker: 'Scholarly Unicode', headline: 'Type “apoll”. Get Apóllōn.', sub: '980 restored names across 25 pantheons — accents, macrons, the works.' },
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
