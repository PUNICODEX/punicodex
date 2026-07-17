/**
 * Keyword extraction for tenant sites.
 *
 * Instead of forcing tenants to type keywords into a dashboard, we rebound
 * off their existing SEO: crawl the page(s) they point us to, extract the
 * same signals Google/Bing use (title, meta description, headings, meta
 * keywords, anchor text, body content), normalize them, and store a weighted
 * keyword index.
 */
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');

// Common English stop words. Expand later with pantheon-specific lists.
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'of',
  'in',
  'on',
  'at',
  'to',
  'for',
  'with',
  'by',
  'from',
  'as',
  'is',
  'was',
  'are',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'can',
  'shall',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'he',
  'she',
  'we',
  'they',
  'you',
  'i',
  'me',
  'him',
  'her',
  'us',
  'them',
  'my',
  'your',
  'our',
  'their',
  'his',
  'her',
  'its',
  'am',
  'so',
  'if',
  'out',
  'up',
  'down',
  'over',
  'under',
  'again',
  'further',
  'then',
  'once',
  'here',
  'there',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'every',
  'both',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'than',
  'too',
  'very',
  'just',
  'now',
  'also',
  'get',
  'got',
  'go',
  'going',
  'goes',
  'went',
  'come',
  'came',
  'coming',
  'about',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'among',
  'until',
  'while',
  'because',
  'about',
  'against',
  'off',
  'on',
  'onto',
  'upon',
  'within',
  'without',
  'per',
  'via',
  'like',
  'regarding',
  'concerning',
  'including',
  // PUNICODEX template noise
  'punicodex',
  'temple',
  // Domain / protocol noise
  'com',
  'www',
  'http',
  'https',
  'html',
]);

// Weight given to each source when building keyword scores.
const SOURCE_WEIGHTS = {
  meta_keywords: 8,
  title: 7,
  h1: 6,
  meta_description: 5,
  og_description: 4,
  h2: 3,
  first_p: 3,
  content: 2,
  anchor_text: 1,
};

let db;

function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
    ensureTable(db);
  }
  return db;
}

function ensureTable(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS site_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL,
      keyword TEXT NOT NULL,
      source TEXT NOT NULL,
      frequency INTEGER NOT NULL DEFAULT 1,
      weight REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(site_id, keyword, source)
    );
    CREATE INDEX IF NOT EXISTS idx_site_keywords_site ON site_keywords(site_id);
    CREATE INDEX IF NOT EXISTS idx_site_keywords_keyword ON site_keywords(keyword);
  `);
}

function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_]/g, ' ') // keep spaces, hyphens, underscores
    .split(/[\s\-_]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t) && !/^\d+$/.test(t));
}

function tokenizePhrases(text, maxWords = 3) {
  const words = tokenize(text);
  const phrases = [];
  for (let i = 0; i < words.length; i++) {
    for (let len = 1; len <= maxWords && i + len <= words.length; len++) {
      phrases.push(words.slice(i, i + len).join(' '));
    }
  }
  return phrases;
}

function countFrequencies(items) {
  const counts = {};
  for (const item of items) {
    counts[item] = (counts[item] || 0) + 1;
  }
  return counts;
}

function extractFromText(text, source) {
  const phrases = tokenizePhrases(text);
  const freqs = countFrequencies(phrases);
  const baseWeight = SOURCE_WEIGHTS[source] || 1;
  return Object.entries(freqs).map(([keyword, frequency]) => ({
    keyword,
    source,
    frequency,
    weight: parseFloat((baseWeight * (1 + Math.log1p(frequency))).toFixed(4)),
  }));
}

function extractFromSiteRow(site) {
  const sources = [];
  if (site.meta_keywords) sources.push(...extractFromText(site.meta_keywords, 'meta_keywords'));
  if (site.title) sources.push(...extractFromText(site.title, 'title'));
  if (site.h1) sources.push(...extractFromText(site.h1, 'h1'));
  if (site.description) sources.push(...extractFromText(site.description, 'meta_description'));
  if (site.og_description) sources.push(...extractFromText(site.og_description, 'og_description'));
  if (site.headings_h2) {
    try {
      const h2s = JSON.parse(site.headings_h2);
      if (Array.isArray(h2s)) sources.push(...extractFromText(h2s.join(' '), 'h2'));
    } catch (_e) {
      /* ignore */
    }
  }
  if (site.first_p) sources.push(...extractFromText(site.first_p, 'first_p'));
  if (site.content_snippet) sources.push(...extractFromText(site.content_snippet, 'content'));
  if (site.anchor_texts) {
    try {
      const anchors = JSON.parse(site.anchor_texts);
      if (Array.isArray(anchors))
        sources.push(...extractFromText(anchors.join(' '), 'anchor_text'));
    } catch (_e) {
      /* ignore */
    }
  }
  return sources;
}

async function fetchText(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'PUNICODEX-Bot/1.0 (https://punicodex.com/bot)' },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    return await resp.text();
  } catch (_err) {
    clearTimeout(timeout);
    return null;
  }
}

function quickMeta(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const desc =
    (html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i) || [])[1] || '';
  const ogDesc =
    (html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)/i) || [])[1] ||
    '';
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '';
  const firstP = (html.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || '';
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    title: sanitize(title),
    description: sanitize(desc || ogDesc),
    h1: sanitize(h1),
    first_p: sanitize(firstP),
    content_snippet: sanitize(text).slice(0, 500),
  };
}

function sanitize(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function extractFromUrl(url) {
  const html = await fetchText(url);
  if (!html) return [];
  const meta = quickMeta(html);
  return [
    ...extractFromText(meta.title, 'title'),
    ...extractFromText(meta.description, 'meta_description'),
    ...extractFromText(meta.h1, 'h1'),
    ...extractFromText(meta.first_p, 'first_p'),
    ...extractFromText(meta.content_snippet, 'content'),
  ];
}

function mergeKeywords(keywords) {
  const map = new Map();
  for (const k of keywords) {
    const key = `${k.site_id || 0}|${k.keyword}`;
    const existing = map.get(key);
    if (!existing || k.weight > existing.weight) {
      map.set(key, { ...k });
    }
  }
  return Array.from(map.values());
}

function saveKeywords(siteId, keywords) {
  const database = getDb();
  ensureTable(database);

  const insert = database.prepare(`
    INSERT INTO site_keywords (site_id, keyword, source, frequency, weight)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(site_id, keyword, source) DO UPDATE SET
      frequency = excluded.frequency,
      weight = excluded.weight,
      created_at = CURRENT_TIMESTAMP
  `);

  const clear = database.prepare(`DELETE FROM site_keywords WHERE site_id = ?`);

  database.transaction(() => {
    clear.run(siteId);
    for (const k of keywords) {
      insert.run(siteId, k.keyword, k.source, k.frequency || 1, k.weight || 0);
    }
  })();

  return keywords.length;
}

function getKeywords(siteId, limit = 50) {
  const database = getDb();
  ensureTable(database);
  return database
    .prepare(`
    SELECT keyword, source, frequency, weight
    FROM site_keywords
    WHERE site_id = ?
    ORDER BY weight DESC, frequency DESC
    LIMIT ?
  `)
    .all(siteId, limit);
}

async function extractAndSave(site) {
  const fromSite = extractFromSiteRow(site);
  const fromUrl = site.tenant_front_url ? await extractFromUrl(site.tenant_front_url) : [];

  // Re-label URL-extracted keywords so we know they came from the tenant's site.
  const urlKeywords = fromUrl.map((k) => ({ ...k, source: `tenant_site:${k.source}` }));

  // Merge duplicates, keeping the highest-weight source per keyword.
  const merged = mergeKeywords(
    [...fromSite, ...urlKeywords].map((k) => ({ ...k, site_id: site.id }))
  );

  saveKeywords(site.id, merged);
  return merged;
}

function searchKeywords(query, limit = 20) {
  const database = getDb();
  ensureTable(database);
  if (!query?.trim()) return [];

  const words = tokenize(query);
  if (words.length === 0) return [];

  const conditions = words.map(() => `keyword LIKE ?`).join(' OR ');
  const params = words.map((w) => `%${w}%`);

  return database
    .prepare(`
    SELECT s.*, sk.keyword, sk.weight, sk.source as keyword_source
    FROM site_keywords sk
    JOIN indexed_sites s ON sk.site_id = s.id
    WHERE s.status = 'active'
      AND (${conditions})
    ORDER BY sk.weight DESC, s.quality_score DESC
    LIMIT ?
  `)
    .all(...params, limit);
}

module.exports = {
  extractFromSiteRow,
  extractFromUrl,
  extractAndSave,
  saveKeywords,
  getKeywords,
  searchKeywords,
  tokenize,
};
