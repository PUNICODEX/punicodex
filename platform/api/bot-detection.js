/**
 * Shared bot detection for the PuniCodex analytics pipelines.
 *
 * `isBotBasic` carries the exact pattern set the ad-analytics pipeline has
 * always used (extracted unchanged from platform/api/bookings.js), so
 * bookings behavior is byte-identical to the previous local copy.
 *
 * `classifyUserAgent` is the richer classifier used by the first-party site
 * analytics engine: it buckets automated traffic into categories and treats
 * everything else as human.
 */

const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scrape/i,
  /slurp/i,
  /facebookexternalhit/i,
  /whatsapp/i,
  /linkedinbot/i,
  /pingdom/i,
  /gtmetrix/i,
  /chrome-lighthouse/i,
  /googlebot/i,
  /bingbot/i,
  /yandex/i,
  /baiduspider/i,
  /duckduckbot/i,
  /ahrefs/i,
  /semrush/i,
];

function isBotBasic(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') return false;
  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

// Checked in order; first match wins. `reason` is a stable, lowercase tag
// safe to store and group on.
const CATEGORY_RULES = [
  // Search engines
  { category: 'search-engine', reason: 'googlebot', re: /googlebot/i },
  { category: 'search-engine', reason: 'bingbot', re: /bingbot/i },
  { category: 'search-engine', reason: 'yandex', re: /yandex/i },
  { category: 'search-engine', reason: 'baiduspider', re: /baiduspider/i },
  { category: 'search-engine', reason: 'duckduckbot', re: /duckduckbot/i },
  { category: 'search-engine', reason: 'slurp', re: /slurp/i },
  { category: 'search-engine', reason: 'sogou', re: /sogou/i },
  { category: 'search-engine', reason: 'exabot', re: /exabot/i },
  { category: 'search-engine', reason: 'applebot', re: /applebot/i },
  // Uptime / performance monitoring
  { category: 'monitoring', reason: 'pingdom', re: /pingdom/i },
  { category: 'monitoring', reason: 'gtmetrix', re: /gtmetrix/i },
  { category: 'monitoring', reason: 'uptime', re: /uptime/i },
  { category: 'monitoring', reason: 'statuscake', re: /statuscake/i },
  { category: 'monitoring', reason: 'lighthouse', re: /chrome-lighthouse|lighthouse/i },
  // Social / chat link unfurlers
  { category: 'social', reason: 'facebookexternalhit', re: /facebookexternalhit/i },
  { category: 'social', reason: 'whatsapp', re: /whatsapp/i },
  { category: 'social', reason: 'linkedinbot', re: /linkedinbot/i },
  { category: 'social', reason: 'twitterbot', re: /twitterbot/i },
  { category: 'social', reason: 'slackbot', re: /slackbot/i },
  { category: 'social', reason: 'discordbot', re: /discordbot/i },
  { category: 'social', reason: 'telegrambot', re: /telegrambot/i },
  // SEO scrapers
  { category: 'scraper', reason: 'ahrefs', re: /ahrefs/i },
  { category: 'scraper', reason: 'semrush', re: /semrush/i },
  { category: 'scraper', reason: 'mj12bot', re: /mj12bot/i },
  { category: 'scraper', reason: 'dotbot', re: /dotbot/i },
  { category: 'scraper', reason: 'screaming-frog', re: /screaming frog/i },
  // Headless browsers / automation frameworks
  { category: 'headless', reason: 'headless-chrome', re: /headlesschrome/i },
  { category: 'headless', reason: 'phantomjs', re: /phantomjs/i },
  { category: 'headless', reason: 'puppeteer', re: /puppeteer/i },
  { category: 'headless', reason: 'playwright', re: /playwright/i },
  { category: 'headless', reason: 'selenium', re: /selenium/i },
  // HTTP clients, libraries, and the site's own crawler
  { category: 'tool', reason: 'punicodex-bot', re: /punicodex-bot/i },
  { category: 'tool', reason: 'curl', re: /curl/i },
  { category: 'tool', reason: 'wget', re: /wget/i },
  { category: 'tool', reason: 'python-requests', re: /python-requests/i },
  { category: 'tool', reason: 'httpx', re: /httpx/i },
  { category: 'tool', reason: 'axios', re: /axios/i },
  { category: 'tool', reason: 'go-http-client', re: /go-http-client/i },
  { category: 'tool', reason: 'java', re: /java\//i },
  { category: 'tool', reason: 'libwww', re: /libwww/i },
  { category: 'tool', reason: 'node-fetch', re: /node-fetch/i },
  { category: 'tool', reason: 'scrapy', re: /scrapy/i },
];

/**
 * Classify a user agent string.
 * Returns { isBot, category, reason } where category is one of
 * 'search-engine' | 'monitoring' | 'social' | 'scraper' | 'headless' |
 * 'tool' | 'human'.
 */
function classifyUserAgent(userAgent) {
  if (!userAgent || typeof userAgent !== 'string' || userAgent.trim() === '') {
    return { isBot: true, category: 'tool', reason: 'empty-ua' };
  }
  for (const rule of CATEGORY_RULES) {
    if (rule.re.test(userAgent)) {
      return { isBot: true, category: rule.category, reason: rule.reason };
    }
  }
  // Matches the legacy ad-analytics pattern set but no known category —
  // an unidentified automated agent crawling the site.
  if (isBotBasic(userAgent)) {
    return { isBot: true, category: 'scraper', reason: 'generic-bot' };
  }
  return { isBot: false, category: 'human', reason: null };
}

// Headless browser / automation framework patterns in the UA string itself.
const HEADLESS_UA_PATTERNS = [
  { reason: 'headless-chrome', re: /headlesschrome/i },
  { reason: 'phantomjs', re: /phantomjs/i },
  { reason: 'puppeteer', re: /puppeteer/i },
  { reason: 'playwright', re: /playwright/i },
  { reason: 'selenium', re: /selenium/i },
  { reason: 'cypress', re: /cypress/i },
  { reason: 'webdriver', re: /webdriver/i },
  { reason: 'electron', re: /electron/i },
];

// Navigator signals that look like a headless or automated browser.
const HEADLESS_SIGNAL_PATTERNS = [
  {
    reason: 'missing-languages',
    test: (s) => s && 'languages' in s && (!Array.isArray(s.languages) || s.languages.length === 0),
  },
  {
    reason: 'missing-plugins',
    test: (s) => s && 'plugins' in s && (!Array.isArray(s.plugins) || s.plugins.length === 0),
  },
  {
    reason: 'missing-platform',
    test: (s) => s && 'platform' in s && (!s.platform || s.platform === ''),
  },
  {
    reason: 'missing-hardware-concurrency',
    test: (s) =>
      s &&
      'hardwareConcurrency' in s &&
      (!Number.isFinite(s.hardwareConcurrency) || s.hardwareConcurrency === 0),
  },
  {
    reason: 'missing-device-memory',
    test: (s) =>
      s && 'deviceMemory' in s && (!Number.isFinite(s.deviceMemory) || s.deviceMemory === 0),
  },
];

/**
 * Detect headless / automated browsers from a UA string plus optional
 * navigator hints (languages, plugins, platform, hardwareConcurrency,
 * deviceMemory). Returns { isHeadless, reasons }.
 */
function detectHeadless(userAgent, signals) {
  const ua = typeof userAgent === 'string' ? userAgent : '';
  const reasons = [];

  for (const rule of HEADLESS_UA_PATTERNS) {
    if (rule.re.test(ua)) {
      reasons.push(rule.reason);
    }
  }

  if (signals && typeof signals === 'object') {
    for (const rule of HEADLESS_SIGNAL_PATTERNS) {
      if (rule.test(signals)) {
        reasons.push(rule.reason);
      }
    }
  }

  return { isHeadless: reasons.length > 0, reasons };
}

/**
 * Score automation risk on a 0.0-1.0 scale.
 *
 * Combines:
 *   - known headless/automation UA patterns (strong signal)
 *   - known bot/scraper/tool patterns from classifyUserAgent (strong signal)
 *   - missing plausible navigator properties (weaker, additive signal)
 *
 * A normal real browser with no suspicious signals scores 0.0.
 */
function hasHeadlessUaPattern(userAgent) {
  const ua = typeof userAgent === 'string' ? userAgent : '';
  return HEADLESS_UA_PATTERNS.some((rule) => rule.re.test(ua));
}

function scoreAutomationRisk(userAgent, signals) {
  const ua = typeof userAgent === 'string' ? userAgent : '';
  let score = 0.0;

  // Explicit headless/automation UA tokens are the strongest signal.
  if (hasHeadlessUaPattern(ua)) {
    score += 0.7;
  }

  const classified = classifyUserAgent(ua);
  if (classified.isBot) {
    score += 0.25;
  }

  // Missing-plausible-properties heuristics. Real browsers virtually always
  // expose languages, plugins, platform, and hardware concurrency.
  if (signals && typeof signals === 'object') {
    let missingSignals = 0;
    for (const rule of HEADLESS_SIGNAL_PATTERNS) {
      if (rule.test(signals)) missingSignals += 1;
    }
    // Each missing signal adds up to 0.06, capped at a moderate bump.
    score += Math.min(missingSignals * 0.06, 0.18);
  }

  return Math.min(1.0, Math.max(0.0, score));
}

module.exports = {
  isBotBasic,
  classifyUserAgent,
  BOT_PATTERNS,
  detectHeadless,
  scoreAutomationRisk,
};
