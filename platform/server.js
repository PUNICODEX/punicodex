const express = require('express');
const cors = require('cors');
const path = require('path');
const dns = require('dns');
const { promisify } = require('util');

const { search, getEntry, getStats, getPantheons, getFlagships, getByPantheon, getVariants, getVariantsByAscii } = require('./api/search');
const { getSites, getSiteByPunycode, searchSites, getAvailability, setAvailability, getCrawlerStats, markSiteSpam } = require('./api/crawler-db');
const { UnicodeCrawler } = require('./crawler');

const dnsLookup = promisify(dns.lookup);

const app = express();
const PORT = process.env.PORT || 3456;

// Database for crawler
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, 'db', 'punycodex.db'));
db.pragma('journal_mode = WAL');

const crawler = new UnicodeCrawler(db);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ PHASE 1: LEXICON & SEARCH ============

app.get('/api/health', (req, res) => {
  const stats = getStats();
  res.json({ 
    status: 'ok', 
    entries: stats.total, 
    pantheons: stats.pantheons, 
    sites: stats.sites.indexed,
    available: stats.sites.available
  });
});

app.get('/api/search', (req, res) => {
  try {
    const { q, pantheon, tier, hasSite, limit, offset } = req.query;
    const result = search({ 
      q, pantheon, tier, hasSite,
      limit: limit ? parseInt(limit, 10) : 20, 
      offset: offset ? parseInt(offset, 10) : 0 
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
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', (req, res) => {
  try { res.json(getStats()); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/pantheons', (req, res) => {
  try { res.json(getPantheons()); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/pantheon/:name', (req, res) => {
  try { res.json(getByPantheon(req.params.name)); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/entry/:id/variants', (req, res) => {
  try {
    const variants = getVariants(req.params.id);
    if (variants === null) return res.status(404).json({ error: 'Entry not found' });
    res.json({ entryId: req.params.id, count: variants.length, variants });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/variants/:ascii', (req, res) => {
  try {
    const variants = getVariantsByAscii(req.params.ascii);
    res.json({ ascii: req.params.ascii, count: variants.length, variants });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/flagships', (req, res) => {
  try { res.json(getFlagships()); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/domain-status/:domain', async (req, res) => {
  try {
    const domain = req.params.domain;
    let status = 'unknown', ip = null;
    try { const result = await dnsLookup(domain, { family: 4 }); status = 'active'; ip = result.address; } catch { status = 'unresolved'; }
    res.json({ domain, status, ip });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/domain-status', async (req, res) => {
  try {
    const { domains } = req.body;
    if (!Array.isArray(domains)) return res.status(400).json({ error: 'domains array required' });
    const results = await Promise.all(domains.map(async (domain) => {
      try { const result = await dnsLookup(domain, { family: 4 }); return { domain, status: 'active', ip: result.address }; }
      catch { return { domain, status: 'unresolved', ip: null }; }
    }));
    res.json({ results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ PHASE 2: CRAWLER & SEARCH ENGINE ============

// Get crawler stats
app.get('/api/crawler/stats', (req, res) => {
  try { res.json(getCrawlerStats()); } catch (err) { res.status(500).json({ error: err.message }); }
});

// List indexed sites
app.get('/api/sites', (req, res) => {
  try {
    const { status, pantheon, entryId, limit, offset } = req.query;
    res.json(getSites({ status, pantheon, entryId, limit: limit ? parseInt(limit, 10) : 50, offset: offset ? parseInt(offset, 10) : 0 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Search indexed sites
app.get('/api/sites/search', (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q) return res.status(400).json({ error: 'q parameter required' });
    res.json(searchSites(q, limit ? parseInt(limit, 10) : 20));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get single site by punycode
app.get('/api/sites/:punycode', (req, res) => {
  try {
    const site = getSiteByPunycode(req.params.punycode);
    if (!site) return res.status(404).json({ error: 'Site not found' });
    res.json(site);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Crawl a single domain
app.post('/api/crawl', async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'domain required' });
    const result = await crawler.crawlDomain(domain);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Bulk crawl domains
app.post('/api/crawl/bulk', async (req, res) => {
  try {
    const { domains, concurrency } = req.body;
    if (!Array.isArray(domains)) return res.status(400).json({ error: 'domains array required' });
    const results = await crawler.crawlBulk(domains, concurrency || 3);
    res.json({ results, total: results.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Re-crawl all active sites
app.post('/api/crawl/recrawl', async (req, res) => {
  try {
    const results = await crawler.recrawlAll();
    res.json({ results, total: results.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark site as spam
app.post('/api/sites/:punycode/spam', (req, res) => {
  try {
    markSiteSpam(req.params.punycode);
    res.json({ success: true, punycode: req.params.punycode, status: 'spam' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ AVAILABILITY ============

app.get('/api/availability/:entryId', (req, res) => {
  try {
    const avail = getAvailability(req.params.entryId);
    if (!avail) return res.status(404).json({ error: 'Not tracked' });
    res.json(avail);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/availability/:entryId', (req, res) => {
  try {
    const { domain, punycode, status } = req.body;
    setAvailability(req.params.entryId, domain, punycode, status);
    res.json({ success: true, entryId: req.params.entryId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
  console.log(`PUNYCODEX Platform running on http://localhost:${PORT}`);
  console.log('');
  console.log('Phase 1 — Lexicon & Search:');
  console.log('  GET  /api/health');
  console.log('  GET  /api/search?q=athena&hasSite=true');
  console.log('  GET  /api/entry/zeus');
  console.log('  GET  /api/stats');
  console.log('  GET  /api/pantheons');
  console.log('  GET  /api/flagships');
  console.log('');
  console.log('Phase 2 — Crawler & Index:');
  console.log('  GET  /api/crawler/stats');
  console.log('  GET  /api/sites');
  console.log('  GET  /api/sites/search?q=zeus');
  console.log('  POST /api/crawl            { domain: "xn--zes-9na.com" }');
  console.log('  POST /api/crawl/bulk       { domains: [...] }');
  console.log('  POST /api/crawl/recrawl');
  console.log('');
  console.log('Phase 2 — Availability:');
  console.log('  GET  /api/availability/:entryId');
  console.log('  POST /api/availability/:entryId { domain, punycode, status }');
});
