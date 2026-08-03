const express = require('express');
const cors = require('cors');
const path = require('node:path');
const dns = require('node:dns');
const { promisify } = require('node:util');

const {
  search,
  getEntry,
  getStats,
  getPantheons,
  getFlagships,
  getByPantheon,
  getVariants,
  getVariantsByAscii,
} = require('./api/search');
const {
  getSites,
  getSiteByPunycode,
  searchSites,
  searchWeb,
  getAvailability,
  setAvailability,
  getCrawlerStats,
  markSiteSpam,
  getQueue,
  addToQueue,
  getDiscoveredDomains,
  findDuplicateClusters,
  getKnowledgePanelData,
  generatePeopleAlsoAsk,
  submitDomain,
} = require('./api/crawler-db');
const { UnicodeCrawler, isSafeUrl } = require('./crawler');
const { processQueue } = require('./scripts/bulk-crawl');
const { didYouMean, relatedSearches, autocomplete } = require('./api/query-intel');
const { askOracle } = require('./api/oracle');
const { searchV2, recordFeedback, updatePreferences } = require('./api/search-v2');
const workspaceApi = require('./api/workspaces');
const { awardXp, getXpSummary } = require('./api/ink-xp');
const { getBadges, checkAndAward, getBadgeDefinitions } = require('./api/badges');
const { getOrCreateChallenge, attemptSolution, getStreak } = require('./api/daily-challenge');
const { getLeaderboards } = require('./api/leaderboards');
const marketplaceApi = require('./api/marketplace');
const scoutAgent = require('./agents/scout');
const sentinelAgent = require('./agents/sentinel');
const loreCuratorAgent = require('./agents/lore-curator');
const researchAgent = require('./agents/research-assistant');
const glyphSearch = require('./api/glyph-search');
const partnerApi = require('./api/partners');
const {
  getSlots,
  getSlotBySlug,
  getSlotById,
  createBooking,
  getBookingByToken,
  getBookingById,
  updateBookingStripeSession,
  markBookingPaid,
  setBookingStatus,
  goLive,
  endBooking,
  getBookingsByEmail,
  getDashboardMetrics,
  getSlotCreatives,
  updateSlotMeta,
  isBundleSlot,
  setCancelAtEnd,
} = require('./api/bookings');
const adAnalytics = require('./api/ad-analytics');
const { get, run } = require('./db/operational');
const {
  login: adminLogin,
  validateAdminToken,
  revokeToken,
  getAllBookings,
  getBookingStats,
  getRevenueStats,
} = require('./api/admin');
const { logAction } = require('./api/admin-actions');
const { createPublicRateLimit } = require('./api/public-rate-limiter');
const { createVerifiedSession, consumeVerifiedSession } = require('./api/verified-sessions');
const {
  listKeys,
  createKey,
  updateKey,
  revokeKey,
  unrevokeKey,
  getKeyUsage,
  getKeyStats,
} = require('./api/api-key-admin');
const {
  createBookingCheckoutSession,
  createRenewalCheckoutSession,
  createPatronCheckoutSession,
} = require('./api/stripe');
const { processWebhook } = require('./api/webhook-handler');
const {
  listActivePatronsByTemple,
  countActivePatronsByTemple,
  PATRON_LIMIT_PER_TEMPLE,
} = require('./api/patron-service');
const {
  proposeTenant,
  createTenant,
  listTenants,
  getTenant,
  updateTenant,
  deleteTenant,
} = require('./api/tenants');
const { listDisputes, getDispute, reviewDispute, appealDispute } = require('./api/dispute-service');
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}
const stripe = require('stripe')(stripeSecretKey);
const {
  notifyAdminPending,
  notifyAdminApplication,
  notifyApproved,
  notifyRejected,
  notifyLive,
  notifyTrialStarted,
  notifyApplicationApproved,
  sendDashboardLinks,
  sendVerificationCode,
  sendBookingConfirmation,
  sendAnalyticsReport,
} = require('./api/email');
const fs = require('node:fs');
const _crypto = require('node:crypto');
const { uploadBookingCreative, uploadSlotCreative } = require('./api/booking-upload');
const { runTrialReminders } = require('./scripts/trial-reminders');
const { runLeaseExpiry } = require('./scripts/lease-expiry');

const dnsLookup = promisify(dns.lookup);

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3456;

const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || 'https://punicodex.com,http://localhost:3456')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

function corsOrigin(origin, callback) {
  if (!origin || ALLOWED_ORIGINS.has(origin)) {
    callback(null, true);
  } else {
    callback(new Error(`CORS blocked origin: ${origin}`));
  }
}

const verifySendLimit = createPublicRateLimit('verify-send');
const verifyCheckLimit = createPublicRateLimit('verify-check');
const bookingsLimit = createPublicRateLimit('bookings');
const bookingsRecoverLimit = createPublicRateLimit('bookings-recover');
const bookingUploadLimit = createPublicRateLimit('booking-upload');
const bookingMetaLimit = createPublicRateLimit('booking-meta');
const tenantsPreviewLimit = createPublicRateLimit('tenants-preview');
const analyticsPixelLimit = createPublicRateLimit('analytics-pixel');
const analyticsClickLimit = createPublicRateLimit('analytics-click');
const adminLoginLimit = createPublicRateLimit('admin-login');
const publicReadLimit = createPublicRateLimit('public-read');
const publicWriteLimit = createPublicRateLimit('public-write');
const searchLimit = createPublicRateLimit('search');
const domainCheckLimit = createPublicRateLimit('domain-check');

// Database for crawler
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, 'db', 'punicodex.db'));
db.pragma('journal_mode = WAL');

const crawler = new UnicodeCrawler(db);

app.use(cors({ origin: corsOrigin, credentials: false }));

// Stripe webhook must receive the raw body before the global JSON parser.
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    await processWebhook(req.body, signature);
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/mobile', express.static(path.join(__dirname, '..', 'mobile')));
app.use('/i18n', express.static(path.join(__dirname, '..', 'i18n')));
// Vendored third-party runtime libraries (see vendor/INTEGRITY.md) — served
// statically on Vercel from the repo root; mirrored here for local dev.
app.use('/vendor', express.static(path.join(__dirname, '..', 'vendor')));
app.use('/favicons', express.static(path.join(__dirname, 'public', 'favicons')));
app.use('/thumbnails', express.static(path.join(__dirname, 'public', 'thumbnails')));

// Redirect root to search
app.get('/', async (_req, res) => res.redirect('/search.html'));

// ============ PHASE 1: LEXICON & SEARCH ============

app.get('/api/health', publicReadLimit, async (_req, res) => {
  const stats = getStats();
  res.json({
    status: 'ok',
    entries: stats.total,
    pantheons: stats.pantheons,
    sites: stats.sites.indexed,
    available: stats.sites.available,
  });
});

app.get('/api/search', searchLimit, async (req, res) => {
  try {
    const { q, pantheon, tier, hasSite, limit, offset } = req.query;
    const result = search({
      q,
      pantheon,
      tier,
      hasSite,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/entry/:id', searchLimit, async (req, res) => {
  try {
    const entry = getEntry(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Not found' });

    // Enrich with site data for the mobile app
    const sites = db
      .prepare(`
      SELECT id, domain, punycode, title, description, favicon_path, is_flagship, tenant_name, status
      FROM indexed_sites
      WHERE lexicon_entry_id = ? AND status = 'active'
      ORDER BY is_flagship DESC, tier = 'dual' DESC, tier = '1' DESC
      LIMIT 5
    `)
      .all(req.params.id);

    res.json({ ...entry, sites: sites || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', publicReadLimit, async (_req, res) => {
  try {
    res.json(getStats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pantheons', publicReadLimit, async (_req, res) => {
  try {
    res.json(getPantheons());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pantheon/:name', publicReadLimit, async (req, res) => {
  try {
    res.json(getByPantheon(req.params.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/entry/:id/variants', searchLimit, async (req, res) => {
  try {
    const variants = getVariants(req.params.id);
    if (variants === null) return res.status(404).json({ error: 'Entry not found' });
    res.json({ entryId: req.params.id, count: variants.length, variants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/variants/:ascii', searchLimit, async (req, res) => {
  try {
    const variants = getVariantsByAscii(req.params.ascii);
    res.json({ ascii: req.params.ascii, count: variants.length, variants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/flagships', publicReadLimit, async (_req, res) => {
  try {
    res.json(getFlagships());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ API v1: ENTERPRISE UNICODE NAMES API ============

const v1NamesList = require('./api-handlers/v1/names');
const v1NamesBatch = require('./api-handlers/v1/names/batch');
const v1NameDetail = require('./api-handlers/v1/names/[id]');
const v1NameVariants = require('./api-handlers/v1/names/[id]/variants');
const v1NameBreakdown = require('./api-handlers/v1/names/[id]/breakdown');
const v1NameOriginalScript = require('./api-handlers/v1/names/[id]/original-script');
const v1NameEtymology = require('./api-handlers/v1/names/[id]/etymology');
const v1NameAvailability = require('./api-handlers/v1/names/[id]/availability');
const v1NameSite = require('./api-handlers/v1/names/[id]/site');
const v1NameSlots = require('./api-handlers/v1/names/[id]/slots');
const v1NameSimilarities = require('./api-handlers/v1/names/[id]/similarities');
const v1NameGraph = require('./api-handlers/v1/names/[id]/graph');
const v1Similarities = require('./api-handlers/v1/similarities');
const v1SimilaritiesRelationships = require('./api-handlers/v1/similarities/relationships');
const v1Pantheons = require('./api-handlers/v1/pantheons');
const v1Pantheon = require('./api-handlers/v1/pantheons/[name]');
const v1Tiers = require('./api-handlers/v1/tiers');
const v1Autocomplete = require('./api-handlers/v1/autocomplete');
const v1Convert = require('./api-handlers/v1/convert');
const v1ConvertBatch = require('./api-handlers/v1/convert/batch');
const v1Docs = require('./api-handlers/v1/docs');
const v1Openapi = require('../api/v1/openapi.json.js');
const v1Policy = require('./api-handlers/v1/policy');
const v1PolicyEvaluate = require('./api-handlers/v1/policy/evaluate');
const v1Appraise = require('./api-handlers/v1/appraise');
const v1AppraiseBatch = require('./api-handlers/v1/appraise/batch');
const v2Router = require('./api/api-v2-router');
const governanceRoutes = require('./api/governance-routes');

app.use('/api/v1/tenants', governanceRoutes.createRouter());
app.use('/api/v1/names/batch', v1NamesBatch);
app.use('/api/v1/names', v1NamesList);
app.use('/api/v1/names/:id/variants', v1NameVariants);
app.use('/api/v1/names/:id/breakdown', v1NameBreakdown);
app.use('/api/v1/names/:id/original-script', v1NameOriginalScript);
app.use('/api/v1/names/:id/etymology', v1NameEtymology);
app.use('/api/v1/names/:id/availability', v1NameAvailability);
app.use('/api/v1/names/:id/site', v1NameSite);
app.use('/api/v1/names/:id/slots', v1NameSlots);
app.use('/api/v1/names/:id/similarities', v1NameSimilarities);
app.use('/api/v1/names/:id/graph', v1NameGraph);
app.use('/api/v1/similarities/relationships', v1SimilaritiesRelationships);
app.use('/api/v1/similarities', v1Similarities);
app.use('/api/v1/names/:id', v1NameDetail);
app.use('/api/v1/pantheons/:name', v1Pantheon);
app.use('/api/v1/pantheons', v1Pantheons);
app.use('/api/v1/tiers', v1Tiers);
app.use('/api/v1/autocomplete', v1Autocomplete);
app.use('/api/v1/convert/batch', v1ConvertBatch);
app.use('/api/v1/convert', v1Convert);
app.use('/api/v1/openapi.json', v1Openapi);
app.use('/api/v1/docs', v1Docs);
app.use('/api/v1/policy/evaluate', v1PolicyEvaluate);
app.use('/api/v1/policy', v1Policy);
app.use('/api/v1/appraise/batch', v1AppraiseBatch);
app.use('/api/v1/appraise', v1Appraise);

// API v2 catch-all router
app.all(/^\/api\/v2\/(.*)$/, publicReadLimit, (req, res) => {
  const slug = (req.params[0] || '').split('/').filter(Boolean);
  req.query.slug = slug.length === 1 && slug[0] === '' ? [] : slug;
  return v2Router.route(req, res);
});

// ============ API v1: THREAT INTELLIGENCE FEED ============
const v1ThreatFeed = require('./api-handlers/v1/threat-feed/index.js');
const v1ThreatFeedStats = require('./api-handlers/v1/threat-feed/stats/index.js');
const v1ThreatFeedIngest = require('./api-handlers/v1/threat-feed/ingest/index.js');
const v1ThreatFeedClusterReview = require('./api-handlers/v1/threat-feed/cluster/[clusterId]/review/index.js');
const v1ThreatFeedCampaigns = require('./api-handlers/v1/threat-feed/campaigns/[identityId]/index.js');
const scholarsApi = require('../platform/scholars/router');
const creativeMarketplaceApi = require('../platform/api/creative-marketplace');

app.get('/api/v1/threat-feed', v1ThreatFeed);
app.get('/api/v1/threat-feed/stats', v1ThreatFeedStats);
app.post('/api/v1/threat-feed/ingest', v1ThreatFeedIngest);
app.post('/api/v1/threat-feed/cluster/:clusterId/review', v1ThreatFeedClusterReview);
app.get('/api/v1/threat-feed/campaigns/:identityId', v1ThreatFeedCampaigns);

app.use('/api/v1/scholars', scholarsApi);
app.use('/api/v1/creatives', creativeMarketplaceApi);

app.get('/api/domain-status/:domain', domainCheckLimit, async (req, res) => {
  try {
    const domain = req.params.domain;
    let status = 'unknown',
      ip = null;
    try {
      const result = await dnsLookup(domain, { family: 4 });
      status = 'active';
      ip = result.address;
    } catch {
      status = 'unresolved';
    }
    res.json({ domain, status, ip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/domain-status', domainCheckLimit, async (req, res) => {
  try {
    const { domains } = req.body;
    if (!Array.isArray(domains)) return res.status(400).json({ error: 'domains array required' });
    const results = await Promise.all(
      domains.map(async (domain) => {
        try {
          const result = await dnsLookup(domain, { family: 4 });
          return { domain, status: 'active', ip: result.address };
        } catch {
          return { domain, status: 'unresolved', ip: null };
        }
      })
    );
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ PHASE 2: CRAWLER & SEARCH ENGINE ============

// Get crawler stats
app.get('/api/crawler/stats', publicReadLimit, async (_req, res) => {
  try {
    res.json(getCrawlerStats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List indexed sites
app.get('/api/sites', publicReadLimit, async (req, res) => {
  try {
    const { status, pantheon, entryId, limit, offset } = req.query;
    res.json(
      getSites({
        status,
        pantheon,
        entryId,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      })
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search indexed sites (legacy LIKE-based search)
app.get('/api/sites/search', searchLimit, async (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q) return res.status(400).json({ error: 'q parameter required' });
    res.json(searchSites(q, limit ? parseInt(limit, 10) : 20));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Web search: FTS5-powered content search with relevance ranking + semantic re-ranking
app.get('/api/search/web', searchLimit, async (req, res) => {
  try {
    const { q, limit, offset, mode, type, pantheon, tier, sort, variant, unicodeOnly, concept } =
      req.query;
    if (!q?.trim()) return res.status(400).json({ error: 'q parameter required' });
    const results = await searchWeb(q, {
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      mode: mode || 'all',
      type: type || 'all',
      pantheon,
      tier,
      sort: sort || 'relevance',
      variant: variant || 'default',
      unicodeOnly: unicodeOnly === 'true' || unicodeOnly === '1',
      concept,
    });

    // Log the query for analytics
    try {
      const ipHash = req.ip
        ? require('node:crypto').createHash('sha256').update(req.ip).digest('hex').substring(0, 16)
        : null;
      const uaHash = req.headers['user-agent']
        ? require('node:crypto')
            .createHash('sha256')
            .update(req.headers['user-agent'])
            .digest('hex')
            .substring(0, 16)
        : null;
      db.prepare(`
        INSERT INTO search_queries (query, result_count, mode, user_agent_hash, ip_hash)
        VALUES (?, ?, ?, ?, ?)
      `).run(q.trim(), results.total, mode || 'web', uaHash, ipHash);
    } catch (_e) {
      // Logging failures shouldn't break search
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Universal vertical search v2
app.get('/api/search/v2', searchLimit, async (req, res) => {
  try {
    const { q, vertical, sort, limit, cursor, pantheon, tier, unicodeOnly, concept } = req.query;
    if (!q?.trim()) return res.status(400).json({ error: 'q parameter required' });
    const result = await searchV2(
      q,
      {
        vertical,
        sort,
        limit,
        cursor,
        pantheon,
        tier,
        unicodeOnly,
        concept,
      },
      req
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search v2 feedback and preferences
app.post('/api/search/feedback', publicWriteLimit, async (req, res) => {
  try {
    const token = req.headers['x-session-token'];
    if (!token) return res.status(400).json({ error: 'x-session-token required' });
    const { query, siteId, entryId, helpful, reason } = req.body || {};
    if (!query) return res.status(400).json({ error: 'query required' });
    recordFeedback(token, query, { siteId, entryId, helpful, reason });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/search/preferences', publicWriteLimit, async (req, res) => {
  try {
    const token = req.headers['x-session-token'];
    if (!token) return res.status(400).json({ error: 'x-session-token required' });
    const prefs = updatePreferences(token, req.body || {});
    res.json({ ok: true, preferences: prefs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gamification: Ink XP, badges, daily challenge, leaderboards
app.all('/api/gamification', publicWriteLimit, async (req, res) => {
  try {
    const token = req.headers['x-session-token'];
    if (!token) return res.status(400).json({ error: 'x-session-token required' });
    const entries = db
      .prepare('SELECT id, ascii, unicode, pantheon, tier, meaning, greek FROM entries')
      .all();

    if (req.method === 'GET') {
      const { type } = req.query;
      if (type === 'challenge') {
        const challenge = getOrCreateChallenge(entries);
        const { current, longest } = getStreak(token);
        const solved = db
          .prepare(
            'SELECT 1 FROM challenge_attempts WHERE session_token = ? AND challenge_date = ?'
          )
          .get(token, challenge.date);
        return res.json({ challenge, streak: { current, longest }, solved: !!solved });
      }
      if (type === 'leaderboards') return res.json(getLeaderboards());
      return res.json({
        summary: getXpSummary(token),
        badges: getBadges(token),
        definitions: getBadgeDefinitions(),
      });
    }

    if (req.method === 'POST') {
      const { action } = req.body || {};
      if (action === 'xp') {
        const { eventType, payload } = req.body;
        const xp = awardXp(token, eventType, payload || {});
        const newBadges = checkAndAward(token);
        return res.json({ xp, newBadges });
      }
      if (action === 'challenge') {
        const { date, guess } = req.body;
        if (!date || !guess) return res.status(400).json({ error: 'date and guess required' });
        const result = attemptSolution(token, date, guess, entries);
        if (result.correct) {
          awardXp(token, 'daily_streak', { date });
          const solved = db
            .prepare('SELECT COUNT(*) as c FROM challenge_attempts WHERE session_token = ?')
            .get(token).c;
          checkAndAward(token, { daily_solved: solved });
        }
        return res.json(result);
      }
      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Partner program (Open Unicode Web Protocol)
app.all('/api/partners', publicWriteLimit, async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'POST' && req.body?.action === 'register') {
      const { name, email, tier, scopes, rateLimit } = req.body;
      if (!name) return res.status(400).json({ error: 'name required' });
      const result = partnerApi.registerPartner({ name, email, tier, scopes, rateLimit });
      return res.status(201).json(result);
    }

    const auth = req.headers.authorization || '';
    const match = auth.match(/^Bearer\s+(.+)$/);
    const key = match ? match[1] : null;
    if (!key) return res.status(401).json({ error: 'Authorization: Bearer <key> required' });
    const partner = partnerApi.validatePartnerKey(key);
    if (!partner) return res.status(401).json({ error: 'Invalid partner key' });

    if (req.method === 'GET') {
      const { q, limit, offset } = req.query;
      return res.json(
        partnerApi.queryRecords({
          q,
          limit: limit ? parseInt(limit, 10) : 20,
          offset: offset ? parseInt(offset, 10) : 0,
        })
      );
    }
    if (req.method === 'POST') {
      const record = req.body;
      if (!record || typeof record !== 'object')
        return res.status(400).json({ error: 'record JSON required' });
      const result = partnerApi.submitRecord(partner.id, record);
      return res.status(201).json(result);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Glyph / visual search
app.get('/api/glyph', publicReadLimit, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'q parameter required' });
    const results = glyphSearch.searchByGlyph(q, 10);
    res.json({ query: q, description: glyphSearch.describeGlyph(q), results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Autonomous agents
app.all('/api/agents', publicWriteLimit, async (req, res) => {
  try {
    const token = req.headers['x-session-token'];
    if (!token) return res.status(400).json({ error: 'x-session-token required' });
    const { agent } = req.query;

    if (req.method === 'POST') {
      if (agent === 'scout') {
        const { domains } = req.body || {};
        if (!Array.isArray(domains))
          return res.status(400).json({ error: 'domains array required' });
        const result = scoutAgent.discoverCandidates(domains);
        return res.json(result);
      }
      if (agent === 'sentinel') {
        const { batchSize } = req.body || {};
        const result = await sentinelAgent.verifyAvailability(batchSize || 50);
        return res.json({ checked: result.length, results: result });
      }
      if (agent === 'lore-curator') {
        const gaps = loreCuratorAgent.findGaps();
        return res.json({
          gaps: gaps.map((g) => ({ ...g, suggestions: loreCuratorAgent.suggestSources(g) })),
        });
      }
      if (agent === 'research') {
        const { topic } = req.body || {};
        if (!topic) return res.status(400).json({ error: 'topic required' });
        const report = researchAgent.createReport(token, topic);
        const completed = researchAgent.completeReport(report.id);
        return res.json(completed);
      }
      return res.status(400).json({ error: 'Unknown agent' });
    }

    if (req.method === 'GET' && agent === 'research') {
      return res.json({ reports: researchAgent.getReports(token) });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Marketplace: listings, lease inquiries, registrar prices, reviews
app.all('/api/marketplace', publicWriteLimit, async (req, res) => {
  try {
    const token = req.headers['x-session-token'];
    if (!token) return res.status(400).json({ error: 'x-session-token required' });
    const { action, entryId, domain } = req.query;

    if (req.method === 'GET') {
      if (action === 'listings') return res.json(marketplaceApi.listPremiumListings());
      if (action === 'reviews' && entryId) return res.json(marketplaceApi.getReviews(entryId));
      if (action === 'registrars' && domain)
        return res.json(marketplaceApi.compareRegistrars(domain));
      return res.json({ inquiries: marketplaceApi.getLeaseInquiries(token) });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.action === 'inquiry') {
        if (!body.entryId) return res.status(400).json({ error: 'entryId required' });
        const inquiry = marketplaceApi.createLeaseInquiry(token, body);
        return res.status(201).json(inquiry);
      }
      if (body.action === 'review') {
        if (!body.entryId || !body.rating)
          return res.status(400).json({ error: 'entryId and rating required' });
        const review = marketplaceApi.addReview(token, body);
        return res.status(201).json(review);
      }
      if (body.action === 'listing' && body.entryId) {
        const listing = marketplaceApi.createPremiumListing(body.entryId, body);
        return res.status(201).json(listing);
      }
      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Spatial workspace sync
app.all('/api/workspace', publicWriteLimit, async (req, res) => {
  try {
    const token = req.headers['x-session-token'];
    if (!token) return res.status(400).json({ error: 'x-session-token required' });
    const { publicId } = req.query;

    if (req.method === 'GET') {
      if (publicId) {
        const workspace = workspaceApi.getWorkspace(publicId);
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
        return res.json(workspace);
      }
      const [workspaces, readingList, timeline] = [
        workspaceApi.listWorkspaces(token),
        workspaceApi.getReadingList(token, { limit: 50 }),
        workspaceApi.getTimeline(token, { limit: 50 }),
      ];
      return res.json({ workspaces, readingList, timeline, sessionToken: token });
    }

    if (req.method === 'POST') {
      const { action, name, payload, entryId, url, title, note, eventType, eventPayload } =
        req.body || {};
      if (action === 'workspace') {
        if (!name || !payload) return res.status(400).json({ error: 'name and payload required' });
        const ws = workspaceApi.createWorkspace(token, name, payload);
        return res.status(201).json(ws);
      }
      if (action === 'reading-list') {
        if (!url) return res.status(400).json({ error: 'url required' });
        const item = workspaceApi.addToReadingList(token, { entryId, url, title, note });
        workspaceApi.recordTimelineEvent(token, 'reading_added', { url, title });
        return res.status(201).json(item);
      }
      if (action === 'timeline') {
        if (!eventType) return res.status(400).json({ error: 'eventType required' });
        workspaceApi.recordTimelineEvent(token, eventType, eventPayload || {});
        return res.json({ ok: true });
      }
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'PATCH') {
      if (publicId) {
        const { name, payload } = req.body || {};
        const ws = workspaceApi.updateWorkspace(publicId, token, name, payload);
        if (!ws) return res.status(404).json({ error: 'Workspace not found or not owned' });
        return res.json(ws);
      }
      const { id, updates } = req.body || {};
      if (!id || !updates) return res.status(400).json({ error: 'id and updates required' });
      const ok = workspaceApi.updateReadingItem(id, token, updates);
      if (!ok) return res.status(404).json({ error: 'Reading item not found' });
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      if (publicId) {
        const ok = workspaceApi.deleteWorkspace(publicId, token);
        if (!ok) return res.status(404).json({ error: 'Workspace not found or not owned' });
        return res.json({ ok: true });
      }
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const ok = workspaceApi.removeFromReadingList(id, token);
      if (!ok) return res.status(404).json({ error: 'Reading item not found' });
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Click tracking for feedback loop
app.post('/api/search/click', publicWriteLimit, async (req, res) => {
  try {
    const { query, siteId, position, dwellTimeMs } = req.body;
    if (!query || !siteId) {
      return res.status(400).json({ error: 'query and siteId required' });
    }

    const parsedSiteId = parseInt(siteId, 10);
    if (Number.isNaN(parsedSiteId)) {
      return res.status(400).json({ error: 'siteId must be an integer' });
    }

    // Verify the site exists before recording a click.
    const site = db.prepare('SELECT id FROM indexed_sites WHERE id = ?').get(parsedSiteId);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Find the most recent matching query
    const queryRow = db
      .prepare(`
      SELECT id FROM search_queries
      WHERE query = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `)
      .get(query.trim());

    const queryId = queryRow ? queryRow.id : null;

    db.prepare(`
      INSERT INTO search_clicks (query_id, site_id, position, dwell_time_ms)
      VALUES (?, ?, ?, ?)
    `).run(queryId, parsedSiteId, parseInt(position || 0, 10), parseInt(dwellTimeMs || 0, 10));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Find duplicate content clusters (must be BEFORE /api/sites/:punycode)
app.get('/api/sites/duplicates', publicReadLimit, async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold, 10) || 3;
    const clusters = findDuplicateClusters(threshold, 2, 200);
    res.json({ clusters, total: clusters.length, threshold });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single site by punycode
app.get('/api/sites/:punycode', publicReadLimit, async (req, res) => {
  try {
    const site = getSiteByPunycode(req.params.punycode);
    if (!site) return res.status(404).json({ error: 'Site not found' });
    res.json(site);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crawl a single domain (admin only)
app.post('/api/crawl', requireAdmin, async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'domain required' });
    const normalized = `https://${domain.replace(/^https?:\/\//, '')}`;
    if (!isSafeUrl(normalized)) return res.status(400).json({ error: 'invalid or unsafe domain' });
    const result = await crawler.crawlDomain(domain);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk crawl domains (admin only)
app.post('/api/crawl/bulk', requireAdmin, async (req, res) => {
  try {
    const { domains, concurrency } = req.body;
    if (!Array.isArray(domains)) return res.status(400).json({ error: 'domains array required' });
    const safeDomains = domains.filter((d) =>
      isSafeUrl(`https://${String(d).replace(/^https?:\/\//, '')}`)
    );
    const results = await crawler.crawlBulk(safeDomains, concurrency || 3);
    res.json({ results, total: results.length, skipped: domains.length - safeDomains.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Re-crawl all active sites (admin only)
app.post('/api/crawl/recrawl', requireAdmin, async (_req, res) => {
  try {
    const results = await crawler.recrawlAll();
    res.json({ results, total: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark site as spam (admin only)
app.post('/api/sites/:punycode/spam', requireAdmin, async (req, res) => {
  try {
    markSiteSpam(req.params.punycode);
    res.json({ success: true, punycode: req.params.punycode, status: 'spam' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ PHASE 6: QUERY INTELLIGENCE ============

// Autocomplete suggestions
app.get('/api/search/suggest', searchLimit, async (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q?.trim()) return res.json({ suggestions: [], query: q });
    const suggestions = autocomplete(q, limit ? parseInt(limit, 10) : 10);
    res.json({ suggestions, query: q, count: suggestions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// "Did you mean?" spell correction
app.get('/api/search/didyoumean', searchLimit, async (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q?.trim()) return res.json({ suggestions: [], query: q });
    const suggestions = didYouMean(q, limit ? parseInt(limit, 10) : 3);
    res.json({ suggestions, query: q, count: suggestions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Related searches
app.get('/api/search/related', searchLimit, async (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q?.trim()) return res.json({ related: [], query: q });
    const related = relatedSearches(q, limit ? parseInt(limit, 10) : 6);
    res.json({ related, query: q, count: related.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ PHASE 3: DISCOVERY & QUEUE ============

// Get crawl queue
app.get('/api/crawler/queue', publicReadLimit, async (req, res) => {
  try {
    const { status, limit, offset } = req.query;
    res.json(
      getQueue({
        status,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      })
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add domains to crawl queue (admin only)
app.post('/api/crawler/queue', requireAdmin, async (req, res) => {
  try {
    const { domains, source, priority } = req.body;
    if (!domains) return res.status(400).json({ error: 'domains required (string or array)' });
    const list = Array.isArray(domains) ? domains : [domains];
    let added = 0;
    let skipped = 0;
    for (const domain of list) {
      const punycode = require('node:url').domainToASCII(domain);
      if (!punycode) {
        skipped++;
        continue;
      }
      addToQueue(domain, punycode, source || 'manual', priority || 0);
      added++;
    }
    res.json({
      success: true,
      added,
      skipped,
      total: db.prepare('SELECT COUNT(*) as c FROM crawl_queue').get().c,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process crawl queue (bulk crawl) (admin only)
app.post('/api/crawler/queue/process', requireAdmin, async (req, res) => {
  try {
    const { batchSize, concurrency } = req.body;
    const result = await processQueue({ batchSize, concurrency });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get discovered domains
app.get('/api/crawler/discovered', publicReadLimit, async (req, res) => {
  try {
    const { source, limit, offset } = req.query;
    res.json(
      getDiscoveredDomains({
        source,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      })
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger CT log discovery (runs in background) (admin only)
app.post('/api/crawler/discover', requireAdmin, async (req, res) => {
  try {
    const { domains, source } = req.body;
    if (!domains) return res.status(400).json({ error: 'domains array required' });
    const list = Array.isArray(domains) ? domains : [domains];
    let added = 0;
    let skipped = 0;
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO discovered_domains (domain, punycode, source)
      VALUES (?, ?, ?)
    `);
    const queueStmt = db.prepare(`
      INSERT OR IGNORE INTO crawl_queue (domain, punycode, source, status, priority)
      VALUES (?, ?, ?, 'pending', 0)
    `);
    for (const domain of list) {
      const punycode = require('node:url').domainToASCII(domain);
      if (!punycode) {
        skipped++;
        continue;
      }
      const info = stmt.run(domain, punycode, source || 'ct-log');
      if (info.changes > 0) {
        added++;
        queueStmt.run(domain, punycode, source || 'ct-log');
      }
    }
    res.json({
      success: true,
      added,
      skipped,
      total_discovered: db.prepare('SELECT COUNT(*) as c FROM discovered_domains').get().c,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ AVAILABILITY ============

app.get('/api/availability/:entryId', domainCheckLimit, async (req, res) => {
  try {
    const avail = getAvailability(req.params.entryId);
    if (!avail) return res.status(404).json({ error: 'Not tracked' });
    res.json(avail);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/availability/:entryId', requireAdmin, async (req, res) => {
  try {
    const { domain, punycode, status } = req.body;
    setAvailability(req.params.entryId, domain, punycode, status);
    res.json({ success: true, entryId: req.params.entryId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ PHASE 5 — KNOWLEDGE PANELS ============

app.get('/api/search/knowledge', searchLimit, async (req, res) => {
  try {
    const { q } = req.query;
    const panel = getKnowledgePanelData(q);
    if (!panel) return res.status(404).json({ error: 'No knowledge panel found' });
    res.json(panel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// People Also Ask (entity-driven expandable questions)
app.get('/api/search/paa', searchLimit, async (req, res) => {
  try {
    const { q, limit } = req.query;
    const questions = generatePeopleAlsoAsk(q, limit ? parseInt(limit, 10) : 4);
    res.json({ questions, query: q, count: questions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Oracle — conversational RAG over the PUNICODEX knowledge base
app.get('/api/oracle', searchLimit, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q?.trim()) return res.status(400).json({ error: 'q parameter required' });
    const answer = await askOracle(q);
    res.json(answer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webmaster domain submission
app.post('/api/submit', publicWriteLimit, async (req, res) => {
  try {
    const { domain, email } = req.body;
    if (!domain) return res.status(400).json({ error: 'domain required' });
    const result = submitDomain(domain, email ? `webmaster:${email}` : 'webmaster');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ NIKE BOOKING SYSTEM ============

// --- Public Slots ---
app.get('/api/slots', publicReadLimit, async (req, res) => {
  try {
    res.json({ slots: await getSlots(req.query.site || null) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/slots/:slug', publicReadLimit, async (req, res) => {
  try {
    const slot = await getSlotBySlug(req.params.slug, req.query.site || null);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    res.json(slot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Bookings ---
function getCharLimits(width) {
  if (width >= 1000) return { heading: 50, subtitle: 80 };
  if (width >= 800) return { heading: 38, subtitle: 60 };
  if (width >= 500) return { heading: 24, subtitle: 40 };
  if (width >= 300) return { heading: 15, subtitle: 26 };
  return { heading: 10, subtitle: 18 };
}

function validateMeta(width, customHeading, customSubtitle) {
  const limits = getCharLimits(width);
  if (customHeading && customHeading.length > limits.heading) {
    return `Heading exceeds ${limits.heading} character limit for this slot size`;
  }
  if (customSubtitle && customSubtitle.length > limits.subtitle) {
    return `Subtitle exceeds ${limits.subtitle} character limit for this slot size`;
  }
  return null;
}

app.post('/api/bookings', bookingsLimit, async (req, res) => {
  try {
    const {
      slotId,
      email,
      companyName,
      websiteUrl,
      customHeading,
      customSubtitle,
      leaseMonths = 1,
      trialMonths = 0,
      verificationToken,
    } = req.body;
    if (!slotId || !email) return res.status(400).json({ error: 'slotId and email required' });
    if (!verificationToken || !(await consumeVerifiedSession(email, verificationToken))) {
      return res.status(400).json({ error: 'Email not verified. Please request a new code.' });
    }
    const months = parseInt(leaseMonths, 10) || 1;
    if (![1, 12].includes(months))
      return res.status(400).json({ error: 'leaseMonths must be 1 or 12' });
    const trial = parseInt(trialMonths, 10) || 0;
    if (![0, 3, 6].includes(trial))
      return res.status(400).json({ error: 'trialMonths must be 0, 3, or 6' });
    if (trial >= months)
      return res.status(400).json({ error: 'trialMonths must be less than leaseMonths' });

    const slot = await getSlotById(slotId);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    if (slot.status !== 'available')
      return res.status(400).json({ error: 'Slot is not available' });

    const metaError = validateMeta(slot.width, customHeading, customSubtitle);
    if (metaError) return res.status(400).json({ error: metaError });

    const siteSlug = slot.site_slug || 'nike';
    const siteName = siteSlug === 'hermes' ? 'Hermês' : 'Níkē';
    const { id, token } = await createBooking({
      slotId,
      email,
      companyName,
      websiteUrl,
      customHeading,
      customSubtitle,
      leaseMonths: months,
      trialMonths: trial,
      siteSlug,
    });
    const isTrial = trial > 0;
    const isYearly = months === 12 && !isTrial;
    const amountCents = isTrial
      ? slot.price_cents
      : isYearly
        ? Math.round(slot.price_cents * 12 * 0.9)
        : slot.price_cents * months;

    // Create Stripe checkout session
    let stripeResult;
    try {
      stripeResult = await createBookingCheckoutSession({
        bookingId: id,
        email,
        slotName: slot.name,
        amountCents,
        token,
        leaseMonths: months,
        trialMonths: trial,
        siteSlug,
        siteName,
      });
    } catch (stripeErr) {
      // Stripe not configured — clean up booking and return clear error
      await run('DELETE FROM bookings WHERE id = $1', [id]);
      console.error('Stripe error:', stripeErr.message);
      return res.status(400).json({
        error: 'Payment provider not configured. Add STRIPE_SECRET_KEY to environment variables.',
      });
    }

    await updateBookingStripeSession(id, stripeResult.sessionId);

    // Send booking confirmation email (branded for the booking's temple)
    sendBookingConfirmation({
      email,
      slotName: slot.name,
      companyName,
      amountCents: isTrial ? amountCents * (months - trial) : amountCents,
      token,
      customHeading,
      customSubtitle,
      leaseMonths: months,
      trialMonths: trial,
      siteSlug,
    }).catch(() => {});

    res.json({
      bookingId: id,
      token,
      stripeUrl: stripeResult.sessionUrl,
      leaseMonths: months,
      trialMonths: trial,
      totalCents: amountCents,
      mode: stripeResult.mode,
    });
  } catch (err) {
    console.error('Booking creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

function computeBookingAmount(slot, months, trial) {
  const isTrial = trial > 0;
  const isYearly = months === 12 && !isTrial;
  return isTrial
    ? slot.price_cents
    : isYearly
      ? Math.round(slot.price_cents * 12 * 0.9)
      : slot.price_cents * months;
}

// Application-only booking (Slot 13 / Total Conquest)
app.post('/api/bookings/apply', bookingsLimit, async (req, res) => {
  try {
    const {
      slotId,
      email,
      companyName,
      websiteUrl,
      customHeading,
      customSubtitle,
      leaseMonths = 1,
      trialMonths = 0,
      applicationNote,
      verificationToken,
    } = req.body;
    if (!slotId || !email) return res.status(400).json({ error: 'slotId and email required' });
    if (!verificationToken || !(await consumeVerifiedSession(email, verificationToken))) {
      return res.status(400).json({ error: 'Email not verified. Please request a new code.' });
    }

    const months = parseInt(leaseMonths, 10) || 1;
    if (![1, 12].includes(months))
      return res.status(400).json({ error: 'leaseMonths must be 1 or 12' });
    const trial = parseInt(trialMonths, 10) || 0;
    if (![0, 3, 6].includes(trial))
      return res.status(400).json({ error: 'trialMonths must be 0, 3, or 6' });
    if (trial >= months)
      return res.status(400).json({ error: 'trialMonths must be less than leaseMonths' });

    const slot = await getSlotById(slotId);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    if (!slot.is_bundle)
      return res
        .status(400)
        .json({ error: 'Applications are only accepted for the Total Conquest bundle' });
    if (slot.status !== 'available')
      return res.status(400).json({ error: 'Slot is not available' });

    const metaError = validateMeta(slot.width, customHeading, customSubtitle);
    if (metaError) return res.status(400).json({ error: metaError });

    const siteSlug = slot.site_slug || 'nike';
    const { id, token } = await createBooking({
      slotId,
      email,
      companyName,
      websiteUrl,
      customHeading,
      customSubtitle,
      leaseMonths: months,
      trialMonths: trial,
      siteSlug,
      status: 'pending_application',
      applicationNote,
    });

    notifyAdminApplication({
      slotName: slot.name,
      companyName,
      bookingId: id,
      applicationNote,
    }).catch(() => {});

    res.json({
      bookingId: id,
      token,
      status: 'pending_application',
      message: 'Application submitted. You will receive a payment link once approved.',
    });
  } catch (err) {
    console.error('Application creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Email verification
app.post('/api/verify/send', verifySendLimit, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.includes('@')) return res.status(400).json({ error: 'Valid email required' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await run(
      `
      INSERT INTO email_verifications (email, code, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at
    `,
      [email, code, expires]
    );

    await sendVerificationCode({ email, code });
    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/verify/check', verifyCheckLimit, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

    const row = await get('SELECT * FROM email_verifications WHERE email = $1', [email]);
    if (!row)
      return res.status(400).json({ error: 'No verification found. Please request a new code.' });
    if (new Date(row.expires_at) < new Date())
      return res.status(400).json({ error: 'Code expired. Please request a new one.' });
    if (row.code !== code) return res.status(400).json({ error: 'Invalid code.' });

    await run('DELETE FROM email_verifications WHERE email = $1', [email]);
    const verificationToken = await createVerifiedSession(email);
    res.json({ verified: true, verificationToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookings/:token/all', publicReadLimit, async (req, res) => {
  try {
    const primary = await getBookingByToken(req.params.token);
    if (!primary) return res.status(404).json({ error: 'Booking not found' });
    const bookings = await getBookingsByEmail(primary.email);
    res.json({
      bookings: bookings.map((b) => ({
        id: b.id,
        slot_name: b.slot_name,
        slot_slug: b.slot_slug,
        status: b.status,
        token: b.analytics_token,
        custom_heading: b.custom_heading,
        custom_subtitle: b.custom_subtitle,
        creative_path: b.creative_path,
        company_name: b.company_name,
        created_at: b.created_at,
        is_bundle: b.is_bundle,
        slot_id: b.slot_id,
        lease_months: b.lease_months,
        site_slug: b.site_slug,
        started_at: b.started_at,
        ends_at: b.ends_at,
        trial_ends_at: b.trial_ends_at,
        billing_status: b.billing_status,
        cancel_at_end: b.cancel_at_end,
        canceled_at: b.canceled_at,
        amount_paid_cents: b.amount_paid_cents,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings/:token/meta', bookingMetaLimit, async (req, res) => {
  try {
    const { customHeading, customSubtitle, slotId } = req.body;
    const booking = await getBookingByToken(req.params.token);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Per-slot meta update for bundle bookings
    if (slotId && (await isBundleSlot(booking.slot_id))) {
      const slot = await getSlotById(slotId);
      if (!slot) return res.status(404).json({ error: 'Slot not found' });
      const metaError = validateMeta(slot.width, customHeading, customSubtitle);
      if (metaError) return res.status(400).json({ error: metaError });
      await updateSlotMeta(booking.id, slotId, { customHeading, customSubtitle });
      return res.json({ success: true });
    }

    const metaError = validateMeta(booking.width, customHeading, customSubtitle);
    if (metaError) return res.status(400).json({ error: metaError });
    await run(
      'UPDATE bookings SET custom_heading = $1, custom_subtitle = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [customHeading || null, customSubtitle || null, booking.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookings/:token', publicReadLimit, async (req, res) => {
  try {
    const booking = await getBookingByToken(req.params.token);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings/:token/cancel', bookingMetaLimit, async (req, res) => {
  try {
    const booking = await getBookingByToken(req.params.token);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (
      !['live', 'approved', 'pending_payment', 'pending_upload', 'pending_approval'].includes(
        booking.status
      )
    ) {
      return res.status(400).json({ error: `Cannot cancel in status: ${booking.status}` });
    }
    await setCancelAtEnd(booking.id, true);
    res.json({ success: true, cancelAtEnd: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings/:token/uncancel', bookingMetaLimit, async (req, res) => {
  try {
    const booking = await getBookingByToken(req.params.token);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    await setCancelAtEnd(booking.id, false);
    res.json({ success: true, cancelAtEnd: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings/:token/renew', bookingMetaLimit, async (req, res) => {
  try {
    const booking = await getBookingByToken(req.params.token);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!['live', 'approved', 'pending_approval'].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot renew in status: ${booking.status}` });
    }

    const extensionMonths = parseInt(req.body.extensionMonths, 10) || 12;
    if (![1, 12].includes(extensionMonths)) {
      return res.status(400).json({ error: 'extensionMonths must be 1 or 12' });
    }

    const slot = await getSlotById(booking.slot_id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    const isYearly = extensionMonths === 12;
    const amountCents = isYearly
      ? Math.round(slot.price_cents * 12 * 0.9)
      : slot.price_cents * extensionMonths;
    const siteSlug = slot.site_slug || 'nike';
    const siteName = siteSlug === 'hermes' ? 'Hermês' : 'Níkē';

    const stripeResult = await createRenewalCheckoutSession({
      bookingId: booking.id,
      email: booking.email,
      slotName: slot.name,
      amountCents,
      token: booking.analytics_token,
      extensionMonths,
      siteSlug,
      siteName,
    });

    res.json({
      success: true,
      stripeUrl: stripeResult.sessionUrl,
      extensionMonths,
      totalCents: amountCents,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings/recover', bookingsRecoverLimit, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    const bookings = await getBookingsByEmail(email);
    if (bookings.length === 0) {
      return res.json({
        sent: true,
        message: 'If bookings exist for this email, a link has been sent.',
      });
    }
    await sendDashboardLinks({ email, bookings });
    res.json({ sent: true, message: 'Dashboard links sent to your email.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/patrons/checkout', publicWriteLimit, async (req, res) => {
  try {
    const { templeId, email, displayName, title, message, amountCents, socialPlatform, socialUrl } =
      req.body;
    const result = await createPatronCheckoutSession({
      templeId,
      email,
      displayName,
      title,
      message,
      amountCents,
      socialPlatform,
      socialUrl,
    });
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

app.get('/api/patrons/:templeId', publicReadLimit, async (req, res) => {
  try {
    const [patrons, activeCount] = await Promise.all([
      listActivePatronsByTemple(req.params.templeId),
      countActivePatronsByTemple(req.params.templeId),
    ]);
    res.json({
      patrons,
      limit: PATRON_LIMIT_PER_TEMPLE,
      activeCount,
      remaining: Math.max(0, PATRON_LIMIT_PER_TEMPLE - activeCount),
      isFull: activeCount >= PATRON_LIMIT_PER_TEMPLE,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookings/:token/check-payment', publicReadLimit, async (req, res) => {
  try {
    const booking = await getBookingByToken(req.params.token);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Already past payment
    if (booking.status !== 'pending_payment') {
      return res.json({ status: booking.status, booking });
    }

    // Check Stripe session
    if (!booking.stripe_session_id) {
      return res.json({ status: booking.status, booking });
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(booking.stripe_session_id);
      if (session.payment_status === 'paid') {
        const updated = await markBookingPaid(
          session.id,
          session.payment_intent,
          session.amount_total
        );
        return res.json({ status: updated.status, booking: updated });
      }
    } catch (stripeErr) {
      console.error('Stripe check error:', stripeErr.message);
    }

    res.json({ status: booking.status, booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload creative (base64)
app.post('/api/bookings/:token/upload', bookingUploadLimit, async (req, res) => {
  try {
    const result = await uploadBookingCreative(req.params.token, req.body, { notifyAdminPending });
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Per-slot creative upload (for bundle bookings)
app.post('/api/bookings/:token/slot/:slotId/upload', bookingUploadLimit, async (req, res) => {
  try {
    const slotId = parseInt(req.params.slotId, 10);
    const result = await uploadSlotCreative(req.params.token, slotId, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Slot upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all per-slot creatives for a bundle booking
app.get('/api/bookings/:token/slots', publicReadLimit, async (req, res) => {
  try {
    const booking = await getBookingByToken(req.params.token);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const creatives = await getSlotCreatives(booking.id);
    res.json({ bookingId: booking.id, slotId: booking.slot_id, creatives });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Analytics ---
app.get('/api/analytics/pixel.gif', analyticsPixelLimit, async (req, res) => {
  await adAnalytics.trackPixel(req.query.b, req, res, req.query.slot);
});

app.get('/api/analytics/click', analyticsClickLimit, async (req, res) => {
  await adAnalytics.trackClick(req.query.b, req.query.url, req, res, req.query.slot);
});

app.post('/api/analytics/viewability', analyticsPixelLimit, async (req, res) => {
  const { token, visibleSeconds, visiblePercent, slotSlug, slot } = req.body || {};
  await adAnalytics.trackViewability(
    token,
    visibleSeconds,
    visiblePercent,
    req,
    res,
    slotSlug || slot
  );
});

app.get('/api/analytics/dashboard', publicReadLimit, async (req, res) => {
  await adAnalytics.getDashboard(req.query.token, res);
});

// --- Tenant Onboarding ---
app.get('/api/tenants', requireAdmin, async (req, res) => {
  try {
    const { status, limit, offset } = req.query;
    const tenants = listTenants({
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json({ tenants, count: tenants.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tenants/:entryId', publicReadLimit, async (req, res) => {
  try {
    const tenant = getTenant(req.params.entryId);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json({ tenant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants/preview', tenantsPreviewLimit, async (req, res) => {
  try {
    const result = await proposeTenant(req.body);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants', requireAdmin, async (req, res) => {
  try {
    const result = await createTenant(req.body);
    if (!result.success) return res.status(400).json(result);
    await logAction({
      adminToken: req.headers['x-admin-token'],
      action: 'admin.tenant.create',
      entryId: req.body.entryId,
      payload: { companyName: req.body.companyName, category: req.body.category },
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/tenants/:entryId', requireAdmin, async (req, res) => {
  try {
    const result = await updateTenant(req.params.entryId, req.body);
    if (!result.success) return res.status(400).json(result);
    await logAction({
      adminToken: req.headers['x-admin-token'],
      action: 'admin.tenant.update',
      entryId: req.params.entryId,
      payload: req.body,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tenants/:entryId', requireAdmin, async (req, res) => {
  try {
    const result = deleteTenant(req.params.entryId);
    if (!result.success) return res.status(404).json(result);
    await logAction({
      adminToken: req.headers['x-admin-token'],
      action: 'admin.tenant.delete',
      entryId: req.params.entryId,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Admin ---
app.post('/api/admin/login', adminLoginLimit, async (req, res) => {
  try {
    const { password } = req.body;
    const result = await adminLogin(password);
    if (!result.success) return res.status(401).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/logout', requireAdmin, async (req, res) => {
  try {
    const token = req.headers['x-admin-token'];
    await revokeToken(token);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!(await validateAdminToken(token))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Role floor (2026-08 audit, mirrors api/_utils.js): portal-issued sessions
  // require an active superadmin; legacy shared-password tokens
  // (admin_user_id NULL) keep full access.
  const { getSessionAdminUserId, getUserById } = require('./api/admin-portal-auth.js');
  const adminUserId = await getSessionAdminUserId(token);
  if (adminUserId != null) {
    const user = await getUserById(adminUserId);
    if (user?.status !== 'active' || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden', required: 'superadmin' });
    }
  }
  req.adminActor = adminUserId != null ? { adminUserId } : { adminToken: token };
  next();
}

app.get('/api/admin/bookings', requireAdmin, async (req, res) => {
  try {
    const { status, site } = req.query;
    res.json({
      bookings: await getAllBookings(status || null, site || null),
      stats: await getBookingStats(site || null),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/revenue', requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    res.json(await getRevenueStats(Math.min(days, 365)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/bookings/create', requireAdmin, async (req, res) => {
  try {
    const {
      slotId,
      email,
      companyName,
      websiteUrl,
      customHeading,
      customSubtitle,
      leaseMonths = 12,
      trialMonths = 3,
    } = req.body;
    if (!slotId || !email) return res.status(400).json({ error: 'slotId and email required' });
    const months = parseInt(leaseMonths, 10) || 12;
    const trial = parseInt(trialMonths, 10) || 0;
    if (![1, 12].includes(months))
      return res.status(400).json({ error: 'leaseMonths must be 1 or 12' });
    if (![0, 3, 6].includes(trial))
      return res.status(400).json({ error: 'trialMonths must be 0, 3, or 6' });
    if (trial >= months)
      return res.status(400).json({ error: 'trialMonths must be less than leaseMonths' });

    const slot = await getSlotById(slotId);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    const metaError = validateMeta(slot.width, customHeading, customSubtitle);
    if (metaError) return res.status(400).json({ error: metaError });

    const siteSlug = slot.site_slug || 'nike';
    const { id, token } = await createBooking({
      slotId,
      email,
      companyName,
      websiteUrl,
      customHeading,
      customSubtitle,
      leaseMonths: months,
      trialMonths: trial,
      siteSlug,
    });
    await setBookingStatus(id, 'pending_upload', 'Admin-created trial lease');
    await logAction({
      adminToken: req.headers['x-admin-token'],
      action: 'admin.booking.create',
      bookingId: id,
      payload: { siteSlug, leaseMonths: months, trialMonths: trial },
    });

    sendBookingConfirmation({
      email,
      slotName: slot.name,
      companyName,
      amountCents: trial > 0 ? slot.price_cents : slot.price_cents * months,
      token,
      customHeading,
      customSubtitle,
      leaseMonths: months,
      trialMonths: trial,
      siteSlug,
    }).catch(() => {});

    res.json({
      bookingId: id,
      token,
      status: 'pending_upload',
      leaseMonths: months,
      trialMonths: trial,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/bookings/:id/approve-application', requireAdmin, async (req, res) => {
  try {
    const booking = await getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'pending_application') {
      return res.status(400).json({ error: 'Booking is not pending application' });
    }
    const slot = await getSlotById(booking.slot_id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    const months = booking.lease_months || 1;
    const trial = booking.trial_months || 0;
    const amountCents = computeBookingAmount(slot, months, trial);
    const siteSlug = slot.site_slug || 'nike';
    const siteName = siteSlug === 'hermes' ? 'Hermês' : 'Níkē';

    const stripeResult = await createBookingCheckoutSession({
      bookingId: booking.id,
      email: booking.email,
      slotName: slot.name,
      amountCents,
      token: booking.analytics_token,
      leaseMonths: months,
      trialMonths: trial,
      siteSlug,
      siteName,
    });
    await updateBookingStripeSession(booking.id, stripeResult.sessionId);
    await setBookingStatus(booking.id, 'pending_payment');

    notifyApplicationApproved({
      email: booking.email,
      slotName: slot.name,
      companyName: booking.company_name,
      stripeUrl: stripeResult.sessionUrl,
    }).catch(() => {});

    await logAction({
      adminToken: req.headers['x-admin-token'],
      action: 'admin.booking.approve-application',
      bookingId: booking.id,
      payload: { amountCents, sessionId: stripeResult.sessionId },
    });

    res.json({ success: true, status: 'pending_payment', stripeUrl: stripeResult.sessionUrl });
  } catch (err) {
    console.error('Approve application error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/bookings/:id/approve', requireAdmin, async (req, res) => {
  try {
    const booking = await getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    await setBookingStatus(req.params.id, 'approved', req.body.note || null);
    await logAction({
      adminToken: req.headers['x-admin-token'],
      action: 'admin.booking.approve',
      bookingId: booking.id,
      payload: { note: req.body.note || null },
    });
    notifyApproved({
      email: booking.email,
      slotName: booking.slot_name,
      companyName: booking.company_name,
      bookingToken: booking.analytics_token,
      siteSlug: booking.site_slug,
    }).catch(() => {});
    res.json({ success: true, status: 'approved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/bookings/:id/reject', requireAdmin, async (req, res) => {
  try {
    const booking = await getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const note = req.body.note || 'Does not meet guidelines';
    await setBookingStatus(req.params.id, 'rejected', note);
    await logAction({
      adminToken: req.headers['x-admin-token'],
      action: 'admin.booking.reject',
      bookingId: booking.id,
      payload: { note },
    });
    notifyRejected({
      email: booking.email,
      slotName: booking.slot_name,
      companyName: booking.company_name,
      note,
      bookingToken: booking.analytics_token,
      siteSlug: booking.site_slug,
    }).catch(() => {});
    res.json({ success: true, status: 'rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/bookings/:id/golive', requireAdmin, async (req, res) => {
  try {
    const booking = await getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    await goLive(req.params.id);
    await logAction({
      adminToken: req.headers['x-admin-token'],
      action: 'admin.booking.golive',
      bookingId: booking.id,
      payload: { trialMonths: booking.trial_months, leaseMonths: booking.lease_months },
    });
    const isTrial = (booking.trial_months || 0) > 0;
    if (isTrial) {
      notifyTrialStarted({
        email: booking.email,
        slotName: booking.slot_name,
        companyName: booking.company_name,
        trialMonths: booking.trial_months,
        trialEndsAt: booking.trial_ends_at,
        bookingToken: booking.analytics_token,
        siteSlug: booking.site_slug,
      }).catch(() => {});
    } else {
      notifyLive({
        email: booking.email,
        slotName: booking.slot_name,
        companyName: booking.company_name,
        bookingToken: booking.analytics_token,
        leaseMonths: booking.lease_months,
        siteSlug: booking.site_slug,
      }).catch(() => {});
    }
    res.json({ success: true, status: 'live', trial: isTrial });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/bookings/:id/end', requireAdmin, async (req, res) => {
  try {
    const booking = await getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    // Cancel Stripe subscription if one exists
    if (booking.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(booking.stripe_subscription_id);
      } catch (stripeErr) {
        console.error('Stripe cancel error:', stripeErr.message);
      }
    }
    await endBooking(req.params.id);
    await logAction({
      adminToken: req.headers['x-admin-token'],
      action: 'admin.booking.end',
      bookingId: booking.id,
    });
    res.json({ success: true, status: 'ended' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger trial reminders manually or via cron
app.post('/api/admin/trial-reminders', requireAdmin, async (_req, res) => {
  try {
    const result = await runTrialReminders();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function requireCronSecret(req, res, next) {
  const secret = req.headers['x-cron-secret'];
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return res.status(503).json({ error: 'CRON_SECRET not configured' });
  }
  if (secret !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.post('/api/cron/trial-reminders', requireCronSecret, async (_req, res) => {
  try {
    const result = await runTrialReminders();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cron/lease-expiry', requireCronSecret, async (_req, res) => {
  try {
    const result = await runLeaseExpiry();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AI Content Review ---
app.get('/api/admin/ai-review/stats', requireAdmin, async (_req, res) => {
  try {
    const row = db
      .prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN ai_review_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN ai_review_status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN ai_review_status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM entries
    `)
      .get();
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/ai-review', requireAdmin, async (req, res) => {
  try {
    const { status = 'pending', limit = 50, offset = 0 } = req.query;
    const allowed = ['pending', 'approved', 'rejected', 'all'];
    const filterStatus = allowed.includes(status) ? status : 'pending';
    const limitNum = Math.min(parseInt(limit, 10) || 50, 200);
    const offsetNum = parseInt(offset, 10) || 0;

    const where = filterStatus === 'all' ? '1=1' : 'ai_review_status = ?';
    const params = filterStatus === 'all' ? [] : [filterStatus];

    const entries = db
      .prepare(`
      SELECT id, unicode, ascii, pantheon, tier_label, ai_summary, ai_symbols, ai_pronunciation,
             ai_etymology_narrative, ai_relevance_today, ai_enriched_at, ai_review_status
      FROM entries
      WHERE ${where}
      ORDER BY ai_enriched_at DESC
      LIMIT ? OFFSET ?
    `)
      .all(...params, limitNum, offsetNum);

    const { total } = db
      .prepare(`
      SELECT COUNT(*) as total FROM entries WHERE ${where}
    `)
      .get(...params);

    res.json({ entries, total, status: filterStatus, limit: limitNum, offset: offsetNum });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/curator/run', requireAdmin, async (req, res) => {
  try {
    const { dryRun = false, limit = 50 } = req.body;
    const { runCurator } = require('./scripts/ai-curator');
    const result = runCurator({ dryRun, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/curator/suggestions', requireAdmin, async (req, res) => {
  try {
    const { status = 'open', type, entryId, limit = 50, offset = 0 } = req.query;
    const allowedStatus = ['open', 'approved', 'rejected', 'all'];
    const where = [];
    const params = [];
    if (status && allowedStatus.includes(status) && status !== 'all') {
      where.push('cs.status = ?');
      params.push(status);
    }
    if (type) {
      where.push('cs.type = ?');
      params.push(type);
    }
    if (entryId) {
      where.push('cs.entry_id = ?');
      params.push(entryId);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const suggestions = db
      .prepare(`
      SELECT cs.*, e.unicode as entry_unicode, e.ascii as entry_ascii, e.pantheon
      FROM curator_suggestions cs
      JOIN entries e ON cs.entry_id = e.id
      ${whereSql}
      ORDER BY cs.confidence DESC, cs.created_at DESC
      LIMIT ? OFFSET ?
    `)
      .all(...params, parseInt(limit, 10) || 50, parseInt(offset, 10) || 0);

    const { total } = db
      .prepare(`
      SELECT COUNT(*) as total FROM curator_suggestions cs
      JOIN entries e ON cs.entry_id = e.id
      ${whereSql}
    `)
      .get(...params);

    const stats = db
      .prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM curator_suggestions
    `)
      .get();

    res.json({ suggestions, total, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/curator/suggestions/:id/approve', requireAdmin, async (req, res) => {
  try {
    const suggestion = db
      .prepare('SELECT * FROM curator_suggestions WHERE id = ?')
      .get(req.params.id);
    if (!suggestion) return res.status(404).json({ error: 'Suggestion not found' });

    // Apply the suggestion based on type/field.
    if (suggestion.field && suggestion.suggested_value) {
      const fieldMap = {
        tier: 'tier',
        tier_label: 'tier_label',
        variants: 'variants',
        sources: 'sources',
        etymology: 'etymology',
        unicode: 'unicode',
      };
      const column = fieldMap[suggestion.field];
      if (column) {
        db.prepare(
          `UPDATE entries SET ${column} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).run(suggestion.suggested_value, suggestion.entry_id);
      }
    }

    db.prepare(`
      UPDATE curator_suggestions
      SET status = 'approved', reviewed_at = datetime('now')
      WHERE id = ?
    `).run(req.params.id);

    res.json({ success: true, status: 'approved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/curator/suggestions/:id/reject', requireAdmin, async (req, res) => {
  try {
    const suggestion = db
      .prepare('SELECT * FROM curator_suggestions WHERE id = ?')
      .get(req.params.id);
    if (!suggestion) return res.status(404).json({ error: 'Suggestion not found' });
    db.prepare(`
      UPDATE curator_suggestions
      SET status = 'rejected', reviewed_at = datetime('now')
      WHERE id = ?
    `).run(req.params.id);
    res.json({ success: true, status: 'rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/ai-review/:id', requireAdmin, async (req, res) => {
  try {
    const { status, summary, symbols, pronunciation, etymologyNarrative, relevanceToday } =
      req.body;
    const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    if (status === 'regenerate') {
      const { enrichEntry } = require('./scripts/enrich-entries');
      const data = enrichEntry(entry);
      db.prepare(`
        UPDATE entries SET
          ai_summary = ?, ai_symbols = ?, ai_pronunciation = ?, ai_etymology_narrative = ?,
          ai_relevance_today = ?, ai_enriched_at = ?, ai_review_status = ?
        WHERE id = ?
      `).run(
        data.ai_summary,
        data.ai_symbols,
        data.ai_pronunciation,
        data.ai_etymology_narrative,
        data.ai_relevance_today,
        data.ai_enriched_at,
        data.ai_review_status,
        req.params.id
      );
      const updated = db.prepare('SELECT * FROM entries WHERE id = ?').get(req.params.id);
      return res.json({ success: true, entry: updated, regenerated: true });
    }

    const allowedStatuses = ['pending', 'approved', 'rejected'];
    const updates = [];
    const params = [];

    if (status && allowedStatuses.includes(status)) {
      updates.push('ai_review_status = ?');
      params.push(status);
    }
    if (summary !== undefined) {
      updates.push('ai_summary = ?');
      params.push(summary);
    }
    if (symbols !== undefined) {
      updates.push('ai_symbols = ?');
      params.push(symbols);
    }
    if (pronunciation !== undefined) {
      updates.push('ai_pronunciation = ?');
      params.push(pronunciation);
    }
    if (etymologyNarrative !== undefined) {
      updates.push('ai_etymology_narrative = ?');
      params.push(etymologyNarrative);
    }
    if (relevanceToday !== undefined) {
      updates.push('ai_relevance_today = ?');
      params.push(relevanceToday);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(req.params.id);
    db.prepare(
      `UPDATE entries SET ${updates.join(', ')}, ai_enriched_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(...params);
    const updated = db.prepare('SELECT * FROM entries WHERE id = ?').get(req.params.id);
    res.json({ success: true, entry: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/bookings/:id/report', requireAdmin, async (req, res) => {
  try {
    const booking = await getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const metrics = await getDashboardMetrics(booking.analytics_token);
    await sendAnalyticsReport({
      email: booking.email,
      booking: metrics.booking,
      metrics: metrics.metrics,
    });
    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve uploads statically
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/sites/nike', express.static(path.join(__dirname, '..', 'sites', 'nike')));
app.use('/sites/hermes', express.static(path.join(__dirname, '..', 'sites', 'hermes')));

// ============ API KEY MANAGEMENT ============

app.get('/api/admin/api-keys', requireAdmin, async (_req, res) => {
  try {
    res.json({ keys: await listKeys(), stats: await getKeyStats() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/api-keys', requireAdmin, async (req, res) => {
  try {
    const { name, tier, scopes, rateLimit } = req.body;
    const key = await createKey({ name, tier, scopes, rateLimit }, req.headers['x-admin-token']);
    res.status(201).json({ success: true, key });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/admin/api-keys/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid key id' });
    const { name, tier, scopes, rateLimit } = req.body;
    const key = await updateKey(
      id,
      { name, tier, scopes, rateLimit },
      req.headers['x-admin-token']
    );
    if (!key) return res.status(404).json({ error: 'Key not found' });
    res.json({ success: true, key });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/api-keys/:id/revoke', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid key id' });
    const key = await revokeKey(id, req.headers['x-admin-token']);
    if (!key) return res.status(404).json({ error: 'Key not found' });
    res.json({ success: true, key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/api-keys/:id/unrevoke', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid key id' });
    const key = await unrevokeKey(id, req.headers['x-admin-token']);
    if (!key) return res.status(404).json({ error: 'Key not found' });
    res.json({ success: true, key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/api-keys/:id/usage', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid key id' });
    const days = parseInt(req.query.days, 10) || 7;
    const limit = parseInt(req.query.limit, 10) || 100;
    res.json(await getKeyUsage(id, { days, limit }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Brand & Trademark Shield dispute admin routes
app.get('/api/admin/disputes', requireAdmin, async (req, res) => {
  try {
    const { identityId, decision } = req.query;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    res.json(await listDisputes({ identityId, decision, limit, offset }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/disputes/:id', requireAdmin, async (req, res) => {
  try {
    const dispute = await getDispute(parseInt(req.params.id, 10));
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });
    res.json(dispute);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/disputes/:id/review', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { decision, reviewerNotes } = req.body || {};
    if (!['confirmed', 'false-positive', 'pending'].includes(decision)) {
      return res
        .status(400)
        .json({ error: "decision must be 'confirmed', 'false-positive', or 'pending'" });
    }
    const dispute = await reviewDispute(id, decision, reviewerNotes);
    await logAction({
      adminToken: req.headers['x-admin-token'],
      action: 'admin.dispute.review',
      disputeId: id,
      payload: { decision },
    });
    res.json(dispute);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/disputes/:id/appeal', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { notes } = req.body || {};
    const dispute = await appealDispute(id, notes);
    await logAction({
      adminToken: req.headers['x-admin-token'],
      action: 'admin.dispute.appeal',
      disputeId: id,
      payload: { notes },
    });
    res.json(dispute);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PUNICODEX Platform running on http://0.0.0.0:${PORT}`);
  console.log('');
  console.log('Phase 1 — Lexicon & Search:');
  console.log('  GET  /api/health');
  console.log('  GET  /api/search?q=athena&hasSite=true');
  console.log('  GET  /api/entry/zeus');
  console.log('  GET  /api/stats');
  console.log('  GET  /api/pantheons');
  console.log('  GET  /api/flagships');
  console.log('');
  console.log('Phase 2 — Web Search (FTS5):');
  console.log('  GET  /api/search/web?q=thunder&limit=20');
  console.log('');
  console.log('Phase 2 — Crawler & Index:');
  console.log('  GET  /api/crawler/stats');
  console.log('  GET  /api/sites');
  console.log('  GET  /api/sites/search?q=zeus');
  console.log('  POST /api/crawl            { domain: "xn--zes-9na.com" }');
  console.log('  POST /api/crawl/bulk       { domains: [...] }');
  console.log('  POST /api/crawl/recrawl');
  console.log('');
  console.log('Phase 6 — Query Intelligence:');
  console.log('  GET  /api/search/suggest?q=her&limit=10');
  console.log('  GET  /api/search/didyoumean?q=hermes');
  console.log('  GET  /api/search/related?q=zeus&limit=6');
  console.log('');
  console.log('Phase 3 — Discovery & Queue:');
  console.log('  GET  /api/crawler/queue');
  console.log('  POST /api/crawler/queue    { domains: [...], source, priority }');
  console.log('  POST /api/crawler/queue/process { batchSize, concurrency }');
  console.log('  GET  /api/crawler/discovered');
  console.log('  POST /api/crawler/discover { domains: [...], source }');
  console.log('');
  console.log('Phase 2 — Availability:');
  console.log('  GET  /api/availability/:entryId');
  console.log('  POST /api/availability/:entryId { domain, punycode, status }');
  console.log('');
  console.log('Phase 3 — Content Quality:');
  console.log('  GET  /api/sites/duplicates?threshold=3');
  console.log('');
  console.log('Phase 5 — Knowledge Panels:');
  console.log('  GET  /api/search/knowledge?q=zeus');
});
