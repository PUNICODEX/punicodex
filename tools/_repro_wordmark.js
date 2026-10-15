// Repro check: serve the ANDROID BUNDLE public dir (what the WebView serves)
// and verify the header wordmark actually renders — no repo-root shadowing.
const { chromium } = require('playwright-core');
const { spawn } = require('child_process');

(async () => {
  const server = spawn('python', ['-m', 'http.server', '8932', '--bind', '127.0.0.1'], {
    cwd: 'C:/projects/punicodex/android/app/src/main/assets/public',
    stdio: 'ignore',
  });
  await new Promise(r => setTimeout(r, 1500));

  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => localStorage.setItem('punicodex_onboarded', '1'));
  const failed = [];
  page.on('requestfailed', r => failed.push(r.url() + ' :: ' + (r.failure()?.errorText || '?')));
  page.on('response', r => { if (r.status() >= 400) failed.push(r.url() + ' :: HTTP ' + r.status()); });

  await page.goto('http://127.0.0.1:8932/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const img = await page.evaluate(() => {
    const el = document.querySelector('.app-logo img');
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    return {
      found: true,
      complete: el.complete,
      naturalWidth: el.naturalWidth,
      naturalHeight: el.naturalHeight,
      currentSrc: el.currentSrc,
      rect: { w: Math.round(r.width), h: Math.round(r.height) },
      visible: r.width > 0 && r.height > 0,
    };
  });
  console.log('IMG:', JSON.stringify(img, null, 1));
  console.log('FAILED REQUESTS:', JSON.stringify(failed, null, 1));

  await page.screenshot({ path: 'C:/projects/punicodex/Marketing/_work/appui/bundle-header-repro.png' });
  await browser.close();
  server.kill();
})();
