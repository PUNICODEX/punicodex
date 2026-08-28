/**
 * PuniCodex — Site analytics engine test suite
 *
 * Covers the first-party site analytics pipeline:
 *
 *   1. user-agent classifier (categories + empty UA) and isBotBasic parity
 *      with the legacy bookings.js pattern set
 *   2. recordPageView + getOverview/getTempleTraffic round-trip on an
 *      isolated SQLite database (totals, botPct, byDay, topTemples,
 *      referrers, devices, bot categories, path sanitization, hashing)
 *   3. /api/analytics/collect handler with stub req/res (204 on POST,
 *      405 on GET, never throws on garbage bodies)
 *   4. beacon file static checks (DNT honored, <2KB) and
 *      scripts/inject-analytics.js idempotency
 *
 * Run: node test/site-analytics.test.js
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');
const { test, after } = require('node:test');
const assert = require('node:assert');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'punicodex-site-analytics-'));
process.env.PUNICODEX_TEST_DB_PATH = path.join(tmpDir, 'test.db');

const ROOT = path.join(__dirname, '..');
const { isBotBasic, classifyUserAgent } = require(
  path.join(ROOT, 'platform', 'api', 'bot-detection')
);
const analytics = require(path.join(ROOT, 'platform', 'api', 'site-analytics'));
const { all, closeDb } = require(path.join(ROOT, 'platform', 'db', 'operational'));
const collectHandler = require(path.join(ROOT, 'platform', 'api-handlers', 'analytics', 'collect'));

const CHROME_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const FIREFOX_DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0';
const SAFARI_IPAD =
  'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/604.1';
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const BINGBOT = 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)';
const LIGHTHOUSE =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Chrome-Lighthouse';
const FACEBOOK_HIT = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
const AHREFS = 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)';
const HEADLESS_CHROME =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36';
const PUPPETEER = 'puppeteer/22.11.0';
const CURL = 'curl/8.5.0';
const PYTHON_REQUESTS = 'python-requests/2.31.0';
const PUNICODEX_BOT = 'PUNICODEX-Bot/1.0 (+https://punicodex.com/crawler)';

const TODAY = new Date().toISOString().slice(0, 10);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

after(() => {
  closeDb();
});

// ─── 1. Classifier ───

test('classifyUserAgent buckets known user agents', () => {
  assert.strictEqual(classifyUserAgent(GOOGLEBOT).category, 'search-engine');
  assert.strictEqual(classifyUserAgent(BINGBOT).category, 'search-engine');
  assert.strictEqual(classifyUserAgent(GOOGLEBOT).isBot, true);
  assert.strictEqual(classifyUserAgent(LIGHTHOUSE).category, 'monitoring');
  assert.strictEqual(classifyUserAgent(FACEBOOK_HIT).category, 'social');
  assert.strictEqual(classifyUserAgent(AHREFS).category, 'scraper');
  assert.strictEqual(classifyUserAgent(HEADLESS_CHROME).category, 'headless');
  assert.strictEqual(classifyUserAgent(PUPPETEER).category, 'headless');
  assert.strictEqual(classifyUserAgent(CURL).category, 'tool');
  assert.strictEqual(classifyUserAgent(PYTHON_REQUESTS).category, 'tool');
  assert.strictEqual(classifyUserAgent(PUNICODEX_BOT).category, 'tool');
  assert.deepStrictEqual(classifyUserAgent(''), {
    isBot: true,
    category: 'tool',
    reason: 'empty-ua',
  });
  assert.deepStrictEqual(classifyUserAgent(undefined), {
    isBot: true,
    category: 'tool',
    reason: 'empty-ua',
  });
});

test('classifyUserAgent treats real browser UAs as human', () => {
  for (const ua of [CHROME_DESKTOP, SAFARI_IPHONE, FIREFOX_DESKTOP, SAFARI_IPAD]) {
    const result = classifyUserAgent(ua);
    assert.strictEqual(result.isBot, false, ua);
    assert.strictEqual(result.category, 'human', ua);
    assert.strictEqual(result.reason, null, ua);
  }
});

test('classifyUserAgent falls back to scraper for unknown generic bots', () => {
  const result = classifyUserAgent('Mozilla/5.0 (compatible; MysteryCrawler/1.0)');
  assert.strictEqual(result.isBot, true);
  assert.strictEqual(result.category, 'scraper');
  assert.strictEqual(result.reason, 'generic-bot');
});

test('isBotBasic is byte-identical to the legacy bookings patterns', () => {
  // The exact pattern set bookings.js used before the extraction.
  const LEGACY_PATTERNS = [
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
  const legacyIsBot = (ua) => {
    if (!ua || typeof ua !== 'string') return false;
    return LEGACY_PATTERNS.some((pattern) => pattern.test(ua));
  };
  const uas = [
    CHROME_DESKTOP,
    SAFARI_IPHONE,
    FIREFOX_DESKTOP,
    GOOGLEBOT,
    BINGBOT,
    LIGHTHOUSE,
    FACEBOOK_HIT,
    AHREFS,
    HEADLESS_CHROME,
    CURL,
    PUNICODEX_BOT,
    'Mozilla/5.0 (compatible; YandexBot/3.0)',
    'WhatsApp/2.23',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0)',
    'Slackbot-LinkExpanding 1.0',
    '',
    ' ',
    'Mozilla',
  ];
  for (const ua of uas) {
    assert.strictEqual(isBotBasic(ua), legacyIsBot(ua), `mismatch for "${ua}"`);
  }
  for (const garbage of [null, undefined, 0, 42, {}, []]) {
    assert.strictEqual(isBotBasic(garbage), legacyIsBot(garbage), `mismatch for ${garbage}`);
  }
});

test('bookings.js uses the shared bot-detection module', () => {
  const src = fs.readFileSync(path.join(ROOT, 'platform', 'api', 'bookings.js'), 'utf8');
  assert.ok(!src.includes('BOT_PATTERNS'), 'bookings.js must not keep a local BOT_PATTERNS');
  assert.ok(src.includes("require('./bot-detection')"), 'bookings.js must require bot-detection');
  assert.ok(src.includes('isBotBasic(userAgent)'), 'bookings.js must call isBotBasic');
  const bookings = require(path.join(ROOT, 'platform', 'api', 'bookings.js'));
  assert.strictEqual(typeof bookings.recordEvent, 'function');
  assert.strictEqual(typeof bookings.hashIp, 'function');
});

// ─── 2. Engine round-trip ───

test('sanitizePath and extractTempleId', () => {
  assert.strictEqual(analytics.sanitizePath('/sites/zeus/?utm=x#frag'), '/sites/zeus/');
  assert.strictEqual(analytics.sanitizePath(`/${'a'.repeat(300)}`).length, 200);
  assert.strictEqual(analytics.sanitizePath('https://evil.example/x'), null);
  assert.strictEqual(analytics.sanitizePath(''), null);
  assert.strictEqual(analytics.sanitizePath(undefined), null);
  assert.strictEqual(analytics.sanitizePath(42), null);
  assert.strictEqual(analytics.extractTempleId('/sites/zeus/'), 'zeus');
  assert.strictEqual(analytics.extractTempleId('/sites/zeus'), 'zeus');
  // Canonical public paths (/{id}/) must attribute to the temple when the id
  // is a valid lexicon entry; non-temple top-level pages stay unattributed.
  assert.strictEqual(analytics.extractTempleId('/zeus/'), 'zeus');
  assert.strictEqual(analytics.extractTempleId('/omphalos/'), 'omphalos');
  assert.strictEqual(analytics.extractTempleId('/about/'), '');
  assert.strictEqual(analytics.extractTempleId('/contact'), '');
});

test('detectDevice buckets user agents', () => {
  assert.strictEqual(analytics.detectDevice(SAFARI_IPHONE), 'mobile');
  assert.strictEqual(analytics.detectDevice(SAFARI_IPAD), 'tablet');
  assert.strictEqual(analytics.detectDevice(CHROME_DESKTOP), 'desktop');
  assert.strictEqual(analytics.detectDevice(''), 'desktop');
});

test('recordPageView + getOverview round-trip', async () => {
  // 3 human + 2 bot views on zeus, 2 human + 1 bot on nike, 1 human on a
  // non-temple page (overlong path, capped to 200 chars).
  const events = [
    {
      path: '/sites/zeus/?utm_source=google#hero',
      sessionId: 'sess-alpha',
      ip: '203.0.113.10',
      userAgent: CHROME_DESKTOP,
      referrer: 'https://www.google.com/search?q=zeus',
    },
    {
      path: '/sites/zeus/',
      sessionId: 'sess-beta',
      ip: '203.0.113.11',
      userAgent: SAFARI_IPHONE,
      referrer: 'https://google.com/',
    },
    {
      path: '/sites/zeus/',
      sessionId: 'sess-alpha',
      ip: '203.0.113.10',
      userAgent: CHROME_DESKTOP,
      referrer: 'https://twitter.com/post/123',
    },
    {
      path: '/sites/zeus/',
      sessionId: 'bot-sess-1',
      ip: '66.249.66.1',
      userAgent: GOOGLEBOT,
      referrer: '',
    },
    {
      path: '/sites/zeus/',
      sessionId: 'bot-sess-2',
      ip: '40.77.167.1',
      userAgent: BINGBOT,
      referrer: '',
    },
    {
      path: '/sites/nike/',
      sessionId: 'sess-gamma',
      ip: '203.0.113.12',
      userAgent: FIREFOX_DESKTOP,
      referrer: '',
    },
    {
      path: '/sites/nike/',
      sessionId: 'sess-delta',
      ip: '203.0.113.13',
      userAgent: SAFARI_IPAD,
      referrer: 'https://google.com/search',
    },
    {
      path: '/sites/nike/',
      sessionId: 'bot-sess-3',
      ip: '198.51.100.7',
      userAgent: CURL,
      referrer: '',
    },
    {
      path: `/${'a'.repeat(300)}`,
      sessionId: 'sess-long',
      ip: '203.0.113.14',
      userAgent: CHROME_DESKTOP,
      referrer: '',
    },
  ];
  for (const event of events) {
    const result = await analytics.recordPageView(event);
    assert.ok(result?.recorded, `view not recorded: ${event.path.slice(0, 40)}`);
  }

  // Rejected paths never reach storage.
  assert.strictEqual(await analytics.recordPageView({ path: 'https://evil.example/x' }), null);
  assert.strictEqual(await analytics.recordPageView({ path: 'relative/path' }), null);
  assert.strictEqual(await analytics.recordPageView({}), null);

  // Raw event rows: query strings stripped, overlong paths capped.
  const rows = await all('SELECT * FROM site_analytics_events ORDER BY id');
  assert.strictEqual(rows.length, 9);
  assert.strictEqual(rows[0].path, '/sites/zeus/');
  assert.strictEqual(rows[8].path.length, 200);

  // Privacy: hashed identifiers only, never raw values.
  const zeusRow = rows[0];
  assert.strictEqual(zeusRow.ip_hash, sha256('203.0.113.10').substring(0, 16));
  assert.strictEqual(zeusRow.ip_hash.length, 16);
  assert.ok(!Object.values(zeusRow).includes('203.0.113.10'));
  assert.strictEqual(
    zeusRow.session_hash,
    // sanitizeSessionId strips non-alphanumerics: 'sess-alpha' → 'sessalpha'
    sha256(`sessalpha:${TODAY}`).substring(0, 24),
    'session hash must be daily-rotating'
  );
  assert.notStrictEqual(
    zeusRow.session_hash,
    sha256(`sessalpha:2000-01-01`).substring(0, 24),
    'session hash must change with the day'
  );
  assert.strictEqual(zeusRow.ua_hash, sha256(CHROME_DESKTOP).substring(0, 16));
  assert.ok(!Object.values(zeusRow).includes(CHROME_DESKTOP));
  assert.strictEqual(zeusRow.is_bot, 0);
  assert.strictEqual(rows[3].is_bot, 1);
  assert.strictEqual(rows[3].bot_category, 'search-engine');
  assert.strictEqual(rows[7].bot_category, 'tool');

  // Daily rollups.
  const daily = await all(
    'SELECT temple_id, human_views, bot_views FROM site_analytics_daily WHERE day = $1 ORDER BY temple_id',
    [TODAY]
  );
  assert.deepStrictEqual(
    daily.map((r) => [r.temple_id, r.human_views, r.bot_views]),
    [
      ['', 1, 0],
      ['nike', 2, 1],
      ['zeus', 3, 2],
    ]
  );

  const overview = await analytics.getOverview({ days: 30 });
  assert.strictEqual(overview.periodDays, 30);
  assert.strictEqual(overview.totals.humanViews, 6);
  assert.strictEqual(overview.totals.botViews, 3);
  assert.strictEqual(overview.totals.botPct, 33.3);
  assert.strictEqual(overview.totals.uniqueSessions, 8);

  assert.strictEqual(overview.byDay.length, 30);
  const todayRow = overview.byDay.find((r) => r.day === TODAY);
  assert.deepStrictEqual(todayRow, { day: TODAY, human: 6, bot: 3 });
  const otherDays = overview.byDay.filter((r) => r.day !== TODAY);
  assert.ok(otherDays.every((r) => r.human === 0 && r.bot === 0));

  assert.deepStrictEqual(overview.topTemples, [
    { templeId: 'zeus', human: 3, bot: 2, uniques: 4 },
    { templeId: 'nike', human: 2, bot: 1, uniques: 3 },
  ]);

  assert.deepStrictEqual(overview.topReferrers, [
    { referrer: 'google.com', count: 3 },
    { referrer: '(direct)', count: 2 },
    { referrer: 'twitter.com', count: 1 },
  ]);

  assert.deepStrictEqual(overview.devices, { mobile: 1, tablet: 1, desktop: 7 });

  assert.deepStrictEqual(overview.botCategories, [
    { category: 'search-engine', count: 2 },
    { category: 'tool', count: 1 },
  ]);
});

test('getTempleTraffic scopes the overview to one temple', async () => {
  const scoped = await analytics.getTempleTraffic('zeus', { days: 30 });
  assert.strictEqual(scoped.totals.humanViews, 3);
  assert.strictEqual(scoped.totals.botViews, 2);
  assert.strictEqual(scoped.totals.uniqueSessions, 4);
  assert.strictEqual(scoped.totals.botPct, 40);
  assert.deepStrictEqual(scoped.topTemples, [{ templeId: 'zeus', human: 3, bot: 2, uniques: 4 }]);
  assert.deepStrictEqual(scoped.topReferrers, [
    { referrer: 'google.com', count: 2 },
    { referrer: 'twitter.com', count: 1 },
  ]);
  assert.deepStrictEqual(scoped.devices, { mobile: 1, tablet: 0, desktop: 4 });
  assert.deepStrictEqual(scoped.botCategories, [{ category: 'search-engine', count: 2 }]);

  const empty = await analytics.getTempleTraffic('does-not-exist', { days: 30 });
  assert.strictEqual(empty.totals.humanViews, 0);
  assert.strictEqual(empty.totals.botViews, 0);
  assert.strictEqual(empty.totals.botPct, 0);
  assert.deepStrictEqual(empty.topTemples, []);
});

test('recordPageView attributes canonical /{id}/ paths to temples', async () => {
  const result = await analytics.recordPageView({
    path: '/omphalos/?ref=canonical-test',
    sessionId: 'canon-sess',
    ip: '203.0.113.99',
    userAgent: CHROME_DESKTOP,
    referrer: '',
  });
  assert.deepStrictEqual(result, {
    recorded: true,
    isBot: false,
    category: 'human',
    device: 'desktop',
    templeId: 'omphalos',
  });

  // A non-temple top-level path is recorded but not attributed.
  const nonTemple = await analytics.recordPageView({
    path: '/about/',
    sessionId: 'canon-sess',
    ip: '203.0.113.99',
    userAgent: CHROME_DESKTOP,
    referrer: '',
  });
  assert.strictEqual(nonTemple.templeId, '');
});

// ─── 3. Collect handler ───

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: false,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

function mockReq(overrides = {}) {
  return {
    method: 'POST',
    headers: {
      'user-agent': CHROME_DESKTOP,
      'x-forwarded-for': '198.51.100.99',
    },
    body: undefined,
    ...overrides,
  };
}

test('collect handler returns 204 for valid beacons (string and object bodies)', async () => {
  const before = await analytics.getOverview({ days: 30 });

  const stringRes = mockRes();
  await collectHandler(
    mockReq({
      body: JSON.stringify({ p: '/sites/apollo/', r: 'https://google.com/', s: 'beacon-sess-1' }),
    }),
    stringRes
  );
  assert.strictEqual(stringRes.statusCode, 204);
  assert.strictEqual(stringRes.ended, true);
  assert.strictEqual(stringRes.headers['cache-control'], 'no-store');

  const objectRes = mockRes();
  await collectHandler(
    mockReq({ body: { p: '/sites/apollo/', r: '', s: 'beacon-sess-2' } }),
    objectRes
  );
  assert.strictEqual(objectRes.statusCode, 204);

  const afterCollect = await analytics.getOverview({ days: 30 });
  assert.strictEqual(afterCollect.totals.humanViews, before.totals.humanViews + 2);
});

test('collect handler returns 405 for GET and 200 for OPTIONS', async () => {
  const getRes = mockRes();
  await collectHandler(mockReq({ method: 'GET' }), getRes);
  assert.strictEqual(getRes.statusCode, 405);

  const optionsRes = mockRes();
  await collectHandler(mockReq({ method: 'OPTIONS' }), optionsRes);
  assert.strictEqual(optionsRes.statusCode, 200);
});

test('collect handler never throws on garbage bodies', async () => {
  const bodies = [
    'not-json{{{',
    '',
    '{"p":123}',
    '[1,2,3]',
    'null',
    42,
    { p: '/ok/' },
    Buffer.from(JSON.stringify({ p: '/buffered/' })),
    `{"p":"${'x'.repeat(8000)}"}`,
  ];
  // Distinct IPs keep every call under the public rate limit (10/min per IP).
  for (let i = 0; i < bodies.length; i++) {
    const res = mockRes();
    await collectHandler(
      mockReq({
        body: bodies[i],
        headers: { 'user-agent': CHROME_DESKTOP, 'x-forwarded-for': `198.51.100.${120 + i}` },
      }),
      res
    );
    assert.strictEqual(
      res.statusCode,
      204,
      `expected 204 for body: ${String(bodies[i]).slice(0, 40)}`
    );
  }
});

// ─── 4. Beacon + injector ───

test('beacon script exists, is small, and honors Do Not Track', () => {
  const beaconPath = path.join(ROOT, 'js', 'analytics-beacon.js');
  assert.ok(fs.existsSync(beaconPath));
  const src = fs.readFileSync(beaconPath, 'utf8');
  // v2 (consent gating + engagement pings) raised the budget from 2KB to 8KB —
  // still a tiny deferred, cache-busted script.
  assert.ok(fs.statSync(beaconPath).size < 8192, 'beacon must stay under 8KB');
  assert.ok(src.includes("navigator.doNotTrack === '1'"), 'beacon must honor DNT');
  assert.ok(
    src.indexOf('doNotTrack') < src.indexOf('sendBeacon'),
    'DNT check must run before any beacon send'
  );
  assert.ok(src.includes('px_sid'), 'beacon must use the px_sid session key');
  assert.ok(src.includes('/api/analytics/collect/'), 'beacon must post to the collect endpoint');
  // v2 contract: consent gating, admin-surface silence, engagement payload.
  assert.ok(src.includes('punicodex.cookie-consent'), 'beacon must read the consent record');
  assert.ok(src.includes("'/admin'"), 'beacon must skip admin surfaces');
  assert.ok(src.includes("t: 'eng'"), 'beacon must send the engagement event type');
});

test('inject-analytics.js is idempotent and injects the beacon exactly once', () => {
  const env = { ...process.env, GA_MEASUREMENT_ID: '', GSC_VERIFICATION: '' };
  for (let i = 0; i < 2; i++) {
    execSync('node scripts/inject-analytics.js', { cwd: ROOT, env, timeout: 300000 });
  }

  const targets = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile() && entry.name.endsWith('.html')) targets.push(fullPath);
    }
  };
  walk(path.join(ROOT, 'sites'));
  walk(path.join(ROOT, 'platform', 'public'));
  for (const p of [
    'index.html',
    'search/index.html',
    'pantheon/index.html',
    'lexicon/index.html',
  ]) {
    const full = path.join(ROOT, p);
    if (fs.existsSync(full)) targets.push(full);
  }

  assert.ok(targets.length > 100, 'expected a large number of injected HTML files');
  let injectedCount = 0;
  for (const file of targets) {
    const html = fs.readFileSync(file, 'utf8');
    const beaconTags = html.split('/js/analytics-beacon.js').length - 1;
    assert.ok(beaconTags <= 1, `${path.relative(ROOT, file)} has ${beaconTags} beacon tags`);
    const markers = html.split('<!-- PUNICODEX-ANALYTICS-START -->').length - 1;
    assert.ok(markers <= 1, `${path.relative(ROOT, file)} has ${markers} marker blocks`);
    if (beaconTags === 1) injectedCount++;
  }
  assert.ok(injectedCount > 100, 'beacon tag must be baked into the pages');
});
