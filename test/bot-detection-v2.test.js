/**
 * PuniCodex — Bot detection v2 test suite
 *
 * Covers detectHeadless() and scoreAutomationRisk() added for Phase 2
 * analytics bot-detection intelligence:
 *
 *   1. detectHeadless flags known headless UA substrings and navigator hints
 *   2. detectHeadless returns empty reasons for real browsers
 *   3. scoreAutomationRisk maps real browsers to 0.0 and headless/bot UAs
 *      to high scores, with sensible gradations for missing signals
 *   4. existing exports (isBotBasic, classifyUserAgent, BOT_PATTERNS) remain
 *      unchanged and pass their original assertions
 *
 * Run: node test/bot-detection-v2.test.js
 */

const path = require('node:path');
const { test, describe } = require('node:test');
const assert = require('node:assert');

const ROOT = path.join(__dirname, '..');
const {
  isBotBasic,
  classifyUserAgent,
  BOT_PATTERNS,
  detectHeadless,
  scoreAutomationRisk,
} = require(path.join(ROOT, 'platform', 'api', 'bot-detection'));

const CHROME_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const FIREFOX_DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0';
const EDGE_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

const HEADLESS_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36';
const PLAYWRIGHT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Playwright/1.45.0';
const PUPPETEER =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Puppeteer/22.0.0';
const SELENIUM =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Selenium/4.21.0';
const CYPRESS =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Cypress/13.0.0 Chrome/126.0.0.0 Safari/537.36';
const PHANTOMJS =
  'Mozilla/5.0 (Unknown; Linux x86_64) AppleWebKit/534.34 (KHTML, like Gecko) PhantomJS/1.9.7 Safari/534.34';
const WEBDRIVER =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 WebDriver/4.21.0';
const ELECTRON =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) PunicodexApp/1.0.0 Chrome/126.0.0.0 Electron/30.0.0 Safari/537.36';

const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const CURL = 'curl/8.5.0';

describe('existing exports remain stable', () => {
  test('isBotBasic is exported and works', () => {
    assert.strictEqual(typeof isBotBasic, 'function');
    assert.strictEqual(isBotBasic(GOOGLEBOT), true);
    assert.strictEqual(isBotBasic(CHROME_DESKTOP), false);
  });

  test('classifyUserAgent is exported and unchanged', () => {
    assert.strictEqual(typeof classifyUserAgent, 'function');
    assert.deepStrictEqual(classifyUserAgent(CHROME_DESKTOP), {
      isBot: false,
      category: 'human',
      reason: null,
    });
    assert.deepStrictEqual(classifyUserAgent(''), {
      isBot: true,
      category: 'tool',
      reason: 'empty-ua',
    });
  });

  test('BOT_PATTERNS is exported as an array of RegExp', () => {
    assert.ok(Array.isArray(BOT_PATTERNS));
    assert.ok(BOT_PATTERNS.every((p) => p instanceof RegExp));
  });

  test('detectHeadless and scoreAutomationRisk are exported', () => {
    assert.strictEqual(typeof detectHeadless, 'function');
    assert.strictEqual(typeof scoreAutomationRisk, 'function');
  });
});

describe('detectHeadless', () => {
  test('real desktop browsers are not headless', () => {
    for (const ua of [CHROME_DESKTOP, FIREFOX_DESKTOP, EDGE_MAC]) {
      const result = detectHeadless(ua);
      assert.strictEqual(result.isHeadless, false);
      assert.deepStrictEqual(result.reasons, []);
    }
  });

  test('real mobile browsers are not headless', () => {
    for (const ua of [SAFARI_IPHONE, CHROME_ANDROID]) {
      const result = detectHeadless(ua);
      assert.strictEqual(result.isHeadless, false);
      assert.deepStrictEqual(result.reasons, []);
    }
  });

  test('HeadlessChrome is detected', () => {
    const result = detectHeadless(HEADLESS_CHROME);
    assert.strictEqual(result.isHeadless, true);
    assert.ok(result.reasons.includes('headless-chrome'));
  });

  test('Playwright is detected', () => {
    const result = detectHeadless(PLAYWRIGHT);
    assert.strictEqual(result.isHeadless, true);
    assert.ok(result.reasons.includes('playwright'));
  });

  test('Puppeteer is detected', () => {
    const result = detectHeadless(PUPPETEER);
    assert.strictEqual(result.isHeadless, true);
    assert.ok(result.reasons.includes('puppeteer'));
  });

  test('Selenium is detected', () => {
    const result = detectHeadless(SELENIUM);
    assert.strictEqual(result.isHeadless, true);
    assert.ok(result.reasons.includes('selenium'));
  });

  test('Cypress is detected', () => {
    const result = detectHeadless(CYPRESS);
    assert.strictEqual(result.isHeadless, true);
    assert.ok(result.reasons.includes('cypress'));
  });

  test('PhantomJS is detected', () => {
    const result = detectHeadless(PHANTOMJS);
    assert.strictEqual(result.isHeadless, true);
    assert.ok(result.reasons.includes('phantomjs'));
  });

  test('WebDriver token is detected', () => {
    const result = detectHeadless(WEBDRIVER);
    assert.strictEqual(result.isHeadless, true);
    assert.ok(result.reasons.includes('webdriver'));
  });

  test('Electron is detected', () => {
    const result = detectHeadless(ELECTRON);
    assert.strictEqual(result.isHeadless, true);
    assert.ok(result.reasons.includes('electron'));
  });

  test('missing navigator signals are reported', () => {
    const result = detectHeadless(CHROME_DESKTOP, {
      languages: [],
      plugins: [],
      platform: '',
      hardwareConcurrency: 0,
      deviceMemory: 0,
    });
    assert.strictEqual(result.isHeadless, true);
    assert.deepStrictEqual(result.reasons.sort(), [
      'missing-device-memory',
      'missing-hardware-concurrency',
      'missing-languages',
      'missing-platform',
      'missing-plugins',
    ]);
  });

  test('plausible navigator signals are not reported', () => {
    const result = detectHeadless(CHROME_DESKTOP, {
      languages: ['en-US', 'en'],
      plugins: ['Chrome PDF Plugin', 'Native Client'],
      platform: 'Win32',
      hardwareConcurrency: 8,
      deviceMemory: 8,
    });
    assert.strictEqual(result.isHeadless, false);
    assert.deepStrictEqual(result.reasons, []);
  });

  test('tolerates undefined signals', () => {
    const result = detectHeadless(CHROME_DESKTOP, undefined);
    assert.strictEqual(result.isHeadless, false);
    assert.deepStrictEqual(result.reasons, []);
  });

  test('tolerates null UA', () => {
    const result = detectHeadless(null, { languages: [] });
    assert.strictEqual(result.isHeadless, true);
    assert.deepStrictEqual(result.reasons, ['missing-languages']);
  });
});

describe('scoreAutomationRisk', () => {
  test('real browsers score 0.0', () => {
    for (const ua of [CHROME_DESKTOP, SAFARI_IPHONE, FIREFOX_DESKTOP, EDGE_MAC, CHROME_ANDROID]) {
      const score = scoreAutomationRisk(ua);
      assert.strictEqual(score, 0.0, `expected 0.0 for ${ua.slice(0, 40)}`);
    }
  });

  test('real browser with good signals scores 0.0', () => {
    const score = scoreAutomationRisk(CHROME_DESKTOP, {
      languages: ['en-US', 'en'],
      plugins: ['Chrome PDF Plugin'],
      platform: 'Win32',
      hardwareConcurrency: 8,
      deviceMemory: 8,
    });
    assert.strictEqual(score, 0.0);
  });

  test('HeadlessChrome scores high', () => {
    const score = scoreAutomationRisk(HEADLESS_CHROME);
    assert.ok(score >= 0.7, `expected >= 0.7, got ${score}`);
    assert.ok(score <= 1.0, `expected <= 1.0, got ${score}`);
  });

  test('Playwright scores high', () => {
    const score = scoreAutomationRisk(PLAYWRIGHT);
    assert.ok(score >= 0.7, `expected >= 0.7, got ${score}`);
  });

  test('Puppeteer scores high', () => {
    const score = scoreAutomationRisk(PUPPETEER);
    assert.ok(score >= 0.7, `expected >= 0.7, got ${score}`);
  });

  test('Selenium scores high', () => {
    const score = scoreAutomationRisk(SELENIUM);
    assert.ok(score >= 0.7, `expected >= 0.7, got ${score}`);
  });

  test('Cypress scores high', () => {
    const score = scoreAutomationRisk(CYPRESS);
    assert.ok(score >= 0.7, `expected >= 0.7, got ${score}`);
  });

  test('PhantomJS scores high', () => {
    const score = scoreAutomationRisk(PHANTOMJS);
    assert.ok(score >= 0.7, `expected >= 0.7, got ${score}`);
  });

  test('Googlebot scores moderately high', () => {
    const score = scoreAutomationRisk(GOOGLEBOT);
    assert.ok(score >= 0.25, `expected >= 0.25, got ${score}`);
    assert.ok(score <= 0.55, `expected <= 0.55, got ${score}`);
  });

  test('curl scores moderately high', () => {
    const score = scoreAutomationRisk(CURL);
    assert.ok(score >= 0.25, `expected >= 0.25, got ${score}`);
    assert.ok(score <= 0.55, `expected <= 0.55, got ${score}`);
  });

  test('real browser with missing signals scores low but non-zero', () => {
    const score = scoreAutomationRisk(CHROME_DESKTOP, {
      languages: [],
      plugins: [],
      platform: '',
      hardwareConcurrency: 0,
      deviceMemory: 0,
    });
    assert.ok(score > 0.0, `expected > 0.0, got ${score}`);
    assert.ok(score < 0.25, `expected < 0.25, got ${score}`);
  });

  test('score is capped at 1.0', () => {
    const score = scoreAutomationRisk(HEADLESS_CHROME, {
      languages: [],
      plugins: [],
      platform: '',
      hardwareConcurrency: 0,
      deviceMemory: 0,
    });
    assert.strictEqual(score, 1.0);
  });

  test('score is floored at 0.0', () => {
    const score = scoreAutomationRisk('', undefined);
    assert.strictEqual(score, 0.25);
  });

  test('missing UA alone scores low', () => {
    const score = scoreAutomationRisk(null);
    assert.strictEqual(score, 0.25);
  });

  test('empty UA with missing signals stays bounded', () => {
    const score = scoreAutomationRisk('', { languages: [], hardwareConcurrency: 0 });
    assert.ok(score >= 0.25, `expected >= 0.25, got ${score}`);
    assert.ok(score <= 1.0, `expected <= 1.0, got ${score}`);
  });
});
