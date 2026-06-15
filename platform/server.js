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
const { UnicodeCrawler } = require('./crawler');
const { processQueue } = require('./scripts/bulk-crawl');
const { didYouMean, relatedSearches, autocomplete } = require('./api/query-intel');
const {
  getSlots,
  getSlotBySlug,
  getSlotById,
  createBooking,
  getBookingByToken,
  getBookingById,
  updateBookingStripeSession,
  markBookingPaid,
  saveCreative,
  setBookingStatus,
  goLive,
  endBooking,
  getBookingsByEmail,
  recordEvent,
  getDashboardMetrics,
  getBundleMembers,
  getSlotCreatives,
  saveSlotCreative,
  updateSlotMeta,
  isBundleSlot,
} = require('./api/bookings');
const {
  login: adminLogin,
  validateAdminToken,
  getAllBookings,
  getBookingStats,
} = require('./api/admin');
const {
  listKeys,
  createKey,
  updateKey,
  revokeKey,
  unrevokeKey,
  getKeyUsage,
  getKeyStats,
} = require('./api/api-key-admin');
const { createBookingCheckoutSession, handleWebhook } = require('./api/stripe');
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}
const stripe = require('stripe')(stripeSecretKey);
const {
  notifyAdminPending,
  notifyApproved,
  notifyRejected,
  notifyLive,
  notifyTrialStarted,
  sendDashboardLinks,
  sendVerificationCode,
  sendBookingConfirmation,
  sendAnalyticsReport,
} = require('./api/email');
const fs = require('node:fs');
const _crypto = require('node:crypto');

const dnsLookup = promisify(dns.lookup);

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3456;
const PLATFORM_URL = process.env.PLATFORM_URL || `http://localhost:${PORT}`;

function isSafeRedirectUrl(url) {
  if (!url || typeof url !== 'string') return false;
  // Allow same-origin absolute paths
  if (url.startsWith('/')) return true;
  try {
    const target = new URL(url);
    const platform = new URL(PLATFORM_URL);
    if (target.protocol !== 'http:' && target.protocol !== 'https:') return false;
    return target.hostname === platform.hostname && target.port === platform.port;
  } catch {
    return false;
  }
}

// Database for crawler
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, 'db', 'punycodex.db'));
db.pragma('journal_mode = WAL');

const crawler = new UnicodeCrawler(db);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/mobile', express.static(path.join(__dirname, '..', 'mobile')));
app.use('/favicons', express.static(path.join(__dirname, 'public', 'favicons')));
app.use('/thumbnails', express.static(path.join(__dirname, 'public', 'thumbnails')));

// Redirect root to search
app.get('/', (_req, res) => res.redirect('/search.html'));

// ============ PHASE 1: LEXICON & SEARCH ============

app.get('/api/health', (_req, res) => {
  const stats = getStats();
  res.json({
    status: 'ok',
    entries: stats.total,
    pantheons: stats.pantheons,
    sites: stats.sites.indexed,
    available: stats.sites.available,
  });
});

app.get('/api/search', (req, res) => {
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

app.get('/api/entry/:id', (req, res) => {
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

app.get('/api/stats', (_req, res) => {
  try {
    res.json(getStats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pantheons', (_req, res) => {
  try {
    res.json(getPantheons());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pantheon/:name', (req, res) => {
  try {
    res.json(getByPantheon(req.params.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/entry/:id/variants', (req, res) => {
  try {
    const variants = getVariants(req.params.id);
    if (variants === null) return res.status(404).json({ error: 'Entry not found' });
    res.json({ entryId: req.params.id, count: variants.length, variants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/variants/:ascii', (req, res) => {
  try {
    const variants = getVariantsByAscii(req.params.ascii);
    res.json({ ascii: req.params.ascii, count: variants.length, variants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/flagships', (_req, res) => {
  try {
    res.json(getFlagships());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ API v1: ENTERPRISE UNICODE NAMES API ============

const v1NamesList = require('../api/v1/names');
const v1NameDetail = require('../api/v1/names/[id]');
const v1NameVariants = require('../api/v1/names/[id]/variants');
const v1NameBreakdown = require('../api/v1/names/[id]/breakdown');
const v1NameOriginalScript = require('../api/v1/names/[id]/original-script');
const v1NameEtymology = require('../api/v1/names/[id]/etymology');
const v1NameAvailability = require('../api/v1/names/[id]/availability');
const v1NameSite = require('../api/v1/names/[id]/site');
const v1NameSlots = require('../api/v1/names/[id]/slots');
const v1Pantheons = require('../api/v1/pantheons');
const v1Pantheon = require('../api/v1/pantheons/[name]');
const v1Tiers = require('../api/v1/tiers');
const v1Autocomplete = require('../api/v1/autocomplete');
const v1Convert = require('../api/v1/convert');
const v1ConvertBatch = require('../api/v1/convert/batch');
const v1Docs = require('../api/v1/docs');
const v1Openapi = require('../api/v1/openapi');

app.use('/api/v1/names', v1NamesList);
app.use('/api/v1/names/:id/variants', v1NameVariants);
app.use('/api/v1/names/:id/breakdown', v1NameBreakdown);
app.use('/api/v1/names/:id/original-script', v1NameOriginalScript);
app.use('/api/v1/names/:id/etymology', v1NameEtymology);
app.use('/api/v1/names/:id/availability', v1NameAvailability);
app.use('/api/v1/names/:id/site', v1NameSite);
app.use('/api/v1/names/:id/slots', v1NameSlots);
app.use('/api/v1/names/:id', v1NameDetail);
app.use('/api/v1/pantheons/:name', v1Pantheon);
app.use('/api/v1/pantheons', v1Pantheons);
app.use('/api/v1/tiers', v1Tiers);
app.use('/api/v1/autocomplete', v1Autocomplete);
app.use('/api/v1/convert/batch', v1ConvertBatch);
app.use('/api/v1/convert', v1Convert);
app.use('/api/v1/openapi.json', v1Openapi);
app.use('/api/v1/docs', v1Docs);

app.get('/api/domain-status/:domain', async (req, res) => {
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

app.post('/api/domain-status', async (req, res) => {
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
app.get('/api/crawler/stats', (_req, res) => {
  try {
    res.json(getCrawlerStats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List indexed sites
app.get('/api/sites', (req, res) => {
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
app.get('/api/sites/search', (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q) return res.status(400).json({ error: 'q parameter required' });
    res.json(searchSites(q, limit ? parseInt(limit, 10) : 20));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Web search: FTS5-powered content search with relevance ranking + semantic re-ranking
app.get('/api/search/web', async (req, res) => {
  try {
    const { q, limit, mode, type, pantheon, tier, sort, variant } = req.query;
    if (!q?.trim()) return res.status(400).json({ error: 'q parameter required' });
    const results = await searchWeb(q, {
      limit: limit ? parseInt(limit, 10) : 20,
      mode: mode || 'all',
      type: type || 'all',
      pantheon,
      tier,
      sort: sort || 'relevance',
      variant: variant || 'default',
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

// Click tracking for feedback loop
app.post('/api/search/click', (req, res) => {
  try {
    const { query, siteId, position, dwellTimeMs } = req.body;
    if (!query || !siteId) {
      return res.status(400).json({ error: 'query and siteId required' });
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
    `).run(
      queryId,
      parseInt(siteId, 10),
      parseInt(position || 0, 10),
      parseInt(dwellTimeMs || 0, 10)
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Find duplicate content clusters (must be BEFORE /api/sites/:punycode)
app.get('/api/sites/duplicates', (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold, 10) || 3;
    const clusters = findDuplicateClusters(threshold, 2, 200);
    res.json({ clusters, total: clusters.length, threshold });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single site by punycode
app.get('/api/sites/:punycode', (req, res) => {
  try {
    const site = getSiteByPunycode(req.params.punycode);
    if (!site) return res.status(404).json({ error: 'Site not found' });
    res.json(site);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crawl a single domain
app.post('/api/crawl', async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'domain required' });
    const result = await crawler.crawlDomain(domain);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk crawl domains
app.post('/api/crawl/bulk', async (req, res) => {
  try {
    const { domains, concurrency } = req.body;
    if (!Array.isArray(domains)) return res.status(400).json({ error: 'domains array required' });
    const results = await crawler.crawlBulk(domains, concurrency || 3);
    res.json({ results, total: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Re-crawl all active sites
app.post('/api/crawl/recrawl', async (_req, res) => {
  try {
    const results = await crawler.recrawlAll();
    res.json({ results, total: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark site as spam
app.post('/api/sites/:punycode/spam', (req, res) => {
  try {
    markSiteSpam(req.params.punycode);
    res.json({ success: true, punycode: req.params.punycode, status: 'spam' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ PHASE 6: QUERY INTELLIGENCE ============

// Autocomplete suggestions
app.get('/api/search/suggest', (req, res) => {
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
app.get('/api/search/didyoumean', (req, res) => {
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
app.get('/api/search/related', (req, res) => {
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
app.get('/api/crawler/queue', (req, res) => {
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

// Add domains to crawl queue
app.post('/api/crawler/queue', (req, res) => {
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

// Process crawl queue (bulk crawl)
app.post('/api/crawler/queue/process', async (req, res) => {
  try {
    const { batchSize, concurrency } = req.body;
    const result = await processQueue({ batchSize, concurrency });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get discovered domains
app.get('/api/crawler/discovered', (req, res) => {
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

// Trigger CT log discovery (runs in background)
app.post('/api/crawler/discover', (req, res) => {
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

app.get('/api/availability/:entryId', (req, res) => {
  try {
    const avail = getAvailability(req.params.entryId);
    if (!avail) return res.status(404).json({ error: 'Not tracked' });
    res.json(avail);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/availability/:entryId', (req, res) => {
  try {
    const { domain, punycode, status } = req.body;
    setAvailability(req.params.entryId, domain, punycode, status);
    res.json({ success: true, entryId: req.params.entryId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ PHASE 5 — KNOWLEDGE PANELS ============

app.get('/api/search/knowledge', (req, res) => {
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
app.get('/api/search/paa', (req, res) => {
  try {
    const { q, limit } = req.query;
    const questions = generatePeopleAlsoAsk(q, limit ? parseInt(limit, 10) : 4);
    res.json({ questions, query: q, count: questions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webmaster domain submission
app.post('/api/submit', (req, res) => {
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
app.get('/api/slots', (req, res) => {
  try {
    res.json({ slots: getSlots(req.query.site || null) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/slots/:slug', (req, res) => {
  try {
    const slot = getSlotBySlug(req.params.slug, req.query.site || null);
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

app.post('/api/bookings', async (req, res) => {
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
    } = req.body;
    if (!slotId || !email) return res.status(400).json({ error: 'slotId and email required' });
    const months = parseInt(leaseMonths, 10) || 1;
    if (![1, 12].includes(months))
      return res.status(400).json({ error: 'leaseMonths must be 1 or 12' });
    const trial = parseInt(trialMonths, 10) || 0;
    if (![0, 3, 6].includes(trial))
      return res.status(400).json({ error: 'trialMonths must be 0, 3, or 6' });
    if (trial >= months)
      return res.status(400).json({ error: 'trialMonths must be less than leaseMonths' });

    const slot = getSlotById(slotId);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    if (slot.status !== 'available')
      return res.status(400).json({ error: 'Slot is not available' });

    const metaError = validateMeta(slot.width, customHeading, customSubtitle);
    if (metaError) return res.status(400).json({ error: metaError });

    const siteSlug = slot.site_slug || 'nike';
    const siteName = siteSlug === 'hermes' ? 'Hermês' : 'Níkē';
    const { id, token } = createBooking({
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
    const amountCents = isTrial ? slot.price_cents : slot.price_cents * months;

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
      db.prepare('DELETE FROM bookings WHERE id = ?').run(id);
      console.error('Stripe error:', stripeErr.message);
      return res.status(400).json({
        error: 'Payment provider not configured. Add STRIPE_SECRET_KEY to environment variables.',
      });
    }

    updateBookingStripeSession(id, stripeResult.sessionId);

    // Send booking confirmation email
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
    }).catch(() => {});
    // Note: emails still show Níkē branding; dynamic branding enhancement deferred

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

// Email verification
app.post('/api/verify/send', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.includes('@')) return res.status(400).json({ error: 'Valid email required' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO email_verifications (email, code, expires_at)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at
    `).run(email, code, expires);

    await sendVerificationCode({ email, code });
    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/verify/check', (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

    const row = db.prepare('SELECT * FROM email_verifications WHERE email = ?').get(email);
    if (!row)
      return res.status(400).json({ error: 'No verification found. Please request a new code.' });
    if (new Date(row.expires_at) < new Date())
      return res.status(400).json({ error: 'Code expired. Please request a new one.' });
    if (row.code !== code) return res.status(400).json({ error: 'Invalid code.' });

    db.prepare('DELETE FROM email_verifications WHERE email = ?').run(email);
    res.json({ verified: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookings/:token/all', (req, res) => {
  try {
    const primary = getBookingByToken(req.params.token);
    if (!primary) return res.status(404).json({ error: 'Booking not found' });
    const bookings = getBookingsByEmail(primary.email);
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
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings/:token/meta', (req, res) => {
  try {
    const { customHeading, customSubtitle, slotId } = req.body;
    const booking = getBookingByToken(req.params.token);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Per-slot meta update for bundle bookings
    if (slotId && isBundleSlot(booking.slot_id)) {
      const slot = getSlotById(slotId);
      if (!slot) return res.status(404).json({ error: 'Slot not found' });
      const metaError = validateMeta(slot.width, customHeading, customSubtitle);
      if (metaError) return res.status(400).json({ error: metaError });
      updateSlotMeta(booking.id, slotId, { customHeading, customSubtitle });
      return res.json({ success: true });
    }

    const metaError = validateMeta(booking.width, customHeading, customSubtitle);
    if (metaError) return res.status(400).json({ error: metaError });
    db.prepare(
      'UPDATE bookings SET custom_heading = ?, custom_subtitle = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(customHeading || null, customSubtitle || null, booking.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookings/:token', (req, res) => {
  try {
    const booking = getBookingByToken(req.params.token);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings/recover', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    const bookings = getBookingsByEmail(email);
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

app.get('/api/bookings/:token/check-payment', async (req, res) => {
  try {
    const booking = getBookingByToken(req.params.token);
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
        const updated = markBookingPaid(session.id, session.payment_intent, session.amount_total);
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
app.post('/api/bookings/:token/upload', (req, res) => {
  try {
    const { image, filename } = req.body;
    if (!image || !filename) return res.status(400).json({ error: 'image and filename required' });

    const booking = getBookingByToken(req.params.token);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!['pending_upload', 'rejected'].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot upload in status: ${booking.status}` });
    }

    // Parse data URI
    const match = image.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
    if (!match)
      return res.status(400).json({ error: 'Invalid image format. Must be base64 data URI.' });

    const mimeType = match[1];
    const base64Data = match[3];
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image must be under 2MB' });
    }

    const ext = mimeType.split('/')[1];
    const safeName = `${Date.now()}.${ext}`;
    const slotDir = path.join(UPLOADS_DIR, String(booking.id));
    if (!fs.existsSync(slotDir)) fs.mkdirSync(slotDir, { recursive: true });
    const filePath = path.join(slotDir, safeName);
    fs.writeFileSync(filePath, buffer);

    saveCreative(booking.id, `/uploads/${booking.id}/${safeName}`, filename);

    // Notify admin
    notifyAdminPending({
      slotName: booking.slot_name,
      companyName: booking.company_name,
      bookingId: booking.id,
    }).catch(() => {});

    res.json({ success: true, path: `/uploads/${booking.id}/${safeName}` });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Per-slot creative upload (for bundle bookings)
app.post('/api/bookings/:token/slot/:slotId/upload', (req, res) => {
  try {
    const { image, filename } = req.body;
    const slotId = parseInt(req.params.slotId, 10);
    if (!image || !filename) return res.status(400).json({ error: 'image and filename required' });

    const booking = getBookingByToken(req.params.token);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.slot_id !== 13)
      return res.status(400).json({ error: 'Per-slot upload only available for bundle bookings' });
    if (!['pending_upload', 'rejected', 'approved', 'live'].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot upload in status: ${booking.status}` });
    }

    const members = getBundleMembers(13);
    if (!members.includes(slotId)) {
      return res.status(400).json({ error: 'Invalid slot for this bundle' });
    }

    const match = image.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
    if (!match)
      return res.status(400).json({ error: 'Invalid image format. Must be base64 data URI.' });

    const mimeType = match[1];
    const base64Data = match[3];
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image must be under 2MB' });
    }

    const ext = mimeType.split('/')[1];
    const safeName = `${Date.now()}.${ext}`;
    const slotDir = path.join(UPLOADS_DIR, String(booking.id), String(slotId));
    if (!fs.existsSync(slotDir)) fs.mkdirSync(slotDir, { recursive: true });
    const filePath = path.join(slotDir, safeName);
    fs.writeFileSync(filePath, buffer);

    const publicPath = `/uploads/${booking.id}/${slotId}/${safeName}`;
    saveSlotCreative(booking.id, slotId, publicPath, filename);

    res.json({ success: true, path: publicPath });
  } catch (err) {
    console.error('Slot upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all per-slot creatives for a bundle booking
app.get('/api/bookings/:token/slots', (req, res) => {
  try {
    const booking = getBookingByToken(req.params.token);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const creatives = getSlotCreatives(booking.id);
    res.json({ bookingId: booking.id, slotId: booking.slot_id, creatives });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Analytics ---
app.get('/api/analytics/pixel.gif', (req, res) => {
  try {
    const { b: token } = req.query;
    if (!token) {
      res.set('Content-Type', 'image/gif');
      return res.send(
        Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
      );
    }
    const booking = getBookingByToken(token);
    if (booking && booking.status === 'live') {
      recordEvent({
        bookingId: booking.id,
        eventType: 'impression',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer,
      });
    }
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  } catch (_err) {
    res.set('Content-Type', 'image/gif');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  }
});

app.get('/api/analytics/click', (req, res) => {
  try {
    const { b: token, url } = req.query;
    if (!token || !url) return res.status(400).send('Missing parameters');
    if (!isSafeRedirectUrl(url)) return res.status(400).send('Invalid redirect URL');

    const booking = getBookingByToken(token);
    if (booking && booking.status === 'live') {
      recordEvent({
        bookingId: booking.id,
        eventType: 'click',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer,
      });
    }
    res.redirect(url);
  } catch (_err) {
    res.status(500).send('Error');
  }
});

app.get('/api/analytics/dashboard', (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'token required' });
    const data = getDashboardMetrics(token);
    if (!data) return res.status(404).json({ error: 'Booking not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Admin ---
app.post('/api/admin/login', (req, res) => {
  try {
    const { password } = req.body;
    const result = adminLogin(password);
    if (!result.success) return res.status(401).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!validateAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.get('/api/admin/bookings', requireAdmin, (req, res) => {
  try {
    const { status, site } = req.query;
    res.json({
      bookings: getAllBookings(status || null, site || null),
      stats: getBookingStats(site || null),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/bookings/create', requireAdmin, (req, res) => {
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

    const slot = getSlotById(slotId);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    const metaError = validateMeta(slot.width, customHeading, customSubtitle);
    if (metaError) return res.status(400).json({ error: metaError });

    const siteSlug = slot.site_slug || 'nike';
    const { id, token } = createBooking({
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
    setBookingStatus(id, 'pending_upload', 'Admin-created trial lease');

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

app.post('/api/admin/bookings/:id/approve', requireAdmin, (req, res) => {
  try {
    const booking = getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    setBookingStatus(req.params.id, 'approved', req.body.note || null);
    notifyApproved({
      email: booking.email,
      slotName: booking.slot_name,
      companyName: booking.company_name,
      bookingToken: booking.analytics_token,
    }).catch(() => {});
    res.json({ success: true, status: 'approved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/bookings/:id/reject', requireAdmin, (req, res) => {
  try {
    const booking = getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const note = req.body.note || 'Does not meet guidelines';
    setBookingStatus(req.params.id, 'rejected', note);
    notifyRejected({
      email: booking.email,
      slotName: booking.slot_name,
      companyName: booking.company_name,
      note,
      bookingToken: booking.analytics_token,
    }).catch(() => {});
    res.json({ success: true, status: 'rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/bookings/:id/golive', requireAdmin, async (req, res) => {
  try {
    const booking = getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    await goLive(req.params.id);
    const isTrial = (booking.trial_months || 0) > 0;
    if (isTrial) {
      notifyTrialStarted({
        email: booking.email,
        slotName: booking.slot_name,
        companyName: booking.company_name,
        trialMonths: booking.trial_months,
        trialEndsAt: booking.trial_ends_at,
        bookingToken: booking.analytics_token,
      }).catch(() => {});
    } else {
      notifyLive({
        email: booking.email,
        slotName: booking.slot_name,
        companyName: booking.company_name,
        bookingToken: booking.analytics_token,
        leaseMonths: booking.lease_months,
      }).catch(() => {});
    }
    res.json({ success: true, status: 'live', trial: isTrial });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/bookings/:id/end', requireAdmin, async (req, res) => {
  try {
    const booking = getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    // Cancel Stripe subscription if one exists
    if (booking.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(booking.stripe_subscription_id);
      } catch (stripeErr) {
        console.error('Stripe cancel error:', stripeErr.message);
      }
    }
    endBooking(req.params.id);
    res.json({ success: true, status: 'ended' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger trial reminders manually or via cron
app.post('/api/admin/trial-reminders', requireAdmin, async (_req, res) => {
  try {
    const { runTrialReminders } = require('./scripts/trial-reminders');
    const result = await runTrialReminders();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AI Content Review ---
app.get('/api/admin/ai-review/stats', requireAdmin, (_req, res) => {
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

app.get('/api/admin/ai-review', requireAdmin, (req, res) => {
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

app.post('/api/admin/curator/run', requireAdmin, (req, res) => {
  try {
    const { dryRun = false, limit = 50 } = req.body;
    const { runCurator } = require('./scripts/ai-curator');
    const result = runCurator({ dryRun, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/curator/suggestions', requireAdmin, (req, res) => {
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

app.post('/api/admin/curator/suggestions/:id/approve', requireAdmin, (req, res) => {
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

app.post('/api/admin/curator/suggestions/:id/reject', requireAdmin, (req, res) => {
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

app.post('/api/admin/ai-review/:id', requireAdmin, (req, res) => {
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
    const booking = getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const metrics = getDashboardMetrics(booking.analytics_token);
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

// Stripe webhook
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const result = await handleWebhook(req.body, signature);
    if (result && result.type === 'booking' && result.booking) {
      // Send upload-ready email
      const booking = getBookingByToken(result.booking.analytics_token);
      if (booking) {
        const { notifyUploadReady } = require('./api/email');
        notifyUploadReady({
          email: booking.email,
          slotName: booking.slot_name,
          companyName: booking.company_name,
          bookingToken: booking.analytics_token,
          leaseMonths: booking.lease_months,
        }).catch(() => {});
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Serve uploads statically
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/sites/nike', express.static(path.join(__dirname, '..', 'sites', 'nike')));
app.use('/sites/hermes', express.static(path.join(__dirname, '..', 'sites', 'hermes')));

// ============ API KEY MANAGEMENT ============

app.get('/api/admin/api-keys', requireAdmin, (_req, res) => {
  try {
    res.json({ keys: listKeys(), stats: getKeyStats() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/api-keys', requireAdmin, (req, res) => {
  try {
    const { name, tier, scopes, rateLimit } = req.body;
    const key = createKey({ name, tier, scopes, rateLimit });
    res.status(201).json({ success: true, key });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/admin/api-keys/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid key id' });
    const { name, tier, scopes, rateLimit } = req.body;
    const key = updateKey(id, { name, tier, scopes, rateLimit });
    if (!key) return res.status(404).json({ error: 'Key not found' });
    res.json({ success: true, key });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/api-keys/:id/revoke', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid key id' });
    const key = revokeKey(id);
    if (!key) return res.status(404).json({ error: 'Key not found' });
    res.json({ success: true, key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/api-keys/:id/unrevoke', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid key id' });
    const key = unrevokeKey(id);
    if (!key) return res.status(404).json({ error: 'Key not found' });
    res.json({ success: true, key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/api-keys/:id/usage', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid key id' });
    const days = parseInt(req.query.days, 10) || 7;
    const limit = parseInt(req.query.limit, 10) || 100;
    res.json(getKeyUsage(id, { days, limit }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PUNYCODEX Platform running on http://0.0.0.0:${PORT}`);
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
