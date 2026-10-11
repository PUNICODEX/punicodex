/* Capture the live web surfaces and render desktop (laptop) promos for
 * shots 4-8. Run: node Marketing/_templates/render-laptop.js */
const { chromium } = require('playwright-core');

const ROOT = 'C:/projects/punicodex';
const T = 'file:///' + ROOT + '/Marketing/_templates';
const OG = 'file:///' + ROOT + '/assets/og';
const W = ROOT + '/Marketing/_work';
const OUT = ROOT + '/Marketing/google-play/promo';

// Live captures: (file, url, interact)
const CAPTURES = [
  ['desktop_convert.png', 'https://punicodex.com/type/', async (page) => {
    const input = page.locator('#type-input, input[type="text"]').first();
    await input.fill('apoll').catch(() => {});
    await page.waitForTimeout(1200);
  }],
  ['desktop_temple.png', 'https://punicodex.com/apollon/', null],
  ['desktop_chips.png', 'https://punicodex.com/type/', async (page) => {
    const input = page.locator('#type-input, input[type="text"]').first();
    await input.fill('ze').catch(() => {});
    await page.waitForTimeout(1200);
  }],
  ['desktop_shield.png', 'https://punicodex.com/authenticity/', async (page) => {
    const input = page.locator('.shield-input input, #shield-input, input[placeholder*="link" i], input[placeholder*="name" i], input[type="text"]').first();
    if (await input.count()) {
      await input.fill('xn--aplln-1ta64d.com').catch(() => {});
      // Click the gold Check button next to the input, not the nav menu
      const btn = page.locator('button:has-text("Check"), .shield-check-btn, .check-btn').first();
      await btn.click().catch(() => {});
      await page.waitForTimeout(1800);
    }
  }],
  ['desktop_web.png', 'https://punicodex.com/', null],
];

const PROMOS = [
  { file: 'laptop-4-convert.png', shot: 'desktop_convert.png', backdrop: OG + '/zeus.jpg', url: 'punicodex.com/type/', kicker: 'Scholarly Unicode', headline: 'Type “apoll”. Get Apóllōn.', sub: 'The same restoration engine, free in the browser.' },
  { file: 'laptop-5-temple.png', shot: 'desktop_temple.png', backdrop: OG + '/apollon.jpg', url: 'punicodex.com/apollon/', kicker: '980 Living Temples', headline: 'Every name opens its temple', sub: 'Lore, pronunciation, variants — and its real Unicode domain.' },
  { file: 'laptop-6-keyboard.png', shot: 'desktop_chips.png', backdrop: OG + '/ares.jpg', url: 'punicodex.com/type/', kicker: 'A Real Keyboard', headline: 'Not stickers. Scholarship.', sub: 'Suggestion chips with every scholarly variant, on the web too.' },
  { file: 'laptop-7-shield.png', shot: 'desktop_shield.png', backdrop: OG + '/athena.jpg', url: 'punicodex.com/authenticity/', kicker: 'Authenticity Shield', headline: 'Spot lookalike names', sub: 'Homograph and mixed-script spoofs — checked in the browser.' },
  { file: 'laptop-8-web.png', shot: 'desktop_web.png', backdrop: OG + '/nike.jpg', url: 'punicodex.com', kicker: 'Nothing to Install', headline: 'The whole lexicon, one tab away', sub: '980 names, 25 pantheons, all 980 temples — free on the web.' },
];

(async () => {
  const fs = require('fs');
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });

  async function dismissConsent(page) {
    for (const sel of [
      '#cookie-consent button', '.cookie-consent button', '.consent-banner button',
      'button:has-text("Accept")', 'button:has-text("Got it")', 'button:has-text("I understand")',
    ]) {
      const el = page.locator(sel).first();
      if (await el.count()) {
        await el.click().catch(() => {});
        await page.waitForTimeout(600);
        break;
      }
    }
    // Hide any lingering banner so it never appears in marketing shots
    await page.evaluate(() => {
      document.querySelectorAll('#cookie-consent, .cookie-consent, .consent-banner, [class*="consent"], [id*="consent"]')
        .forEach((el) => { el.style.display = 'none'; });
    }).catch(() => {});
  }

  for (const [file, url, interact] of CAPTURES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => console.log('load warn', url, e.message.split('\n')[0]));
    await page.waitForTimeout(2500);
    await dismissConsent(page);
    if (interact) await interact(page).catch(() => {});
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${W}/${file}` });
    console.log('captured', file);
    await page.close();
  }

  for (const p of PROMOS) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const q = new URLSearchParams({
      shot: 'file:///' + W.replace(/\\/g, '/') + '/' + p.shot,
      backdrop: p.backdrop,
      kicker: p.kicker,
      headline: p.headline,
      sub: p.sub,
      url: p.url,
    });
    await page.goto(T + '/laptop.html?' + q.toString());
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${p.file}` });
    console.log('rendered', p.file);
    await page.close();
  }

  await browser.close();
})();
