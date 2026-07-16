/**
 * Shared bot detection for the PÚNYCODEX analytics pipelines.
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
  { category: 'tool', reason: 'punycodex-bot', re: /punycodex-bot/i },
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

module.exports = { isBotBasic, classifyUserAgent, BOT_PATTERNS };
