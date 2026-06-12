const Database = require('better-sqlite3');
const path = require('path');
const { domainToASCII } = require('url');
const { getDbPath } = require('../db/db');

const DB_PATH = getDbPath();
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

// Realm/location entry ids approximate the Realms page lists.
const REALM_KEYWORDS = ['heimr','heim','world','realm','land','kingdom','underworld','sky','sea','earth'];

function isRealmEntry(entry) {
  if (entry.pantheon === 'greek-location') return true;
  if (entry.pantheon === 'norse') {
    const text = `${entry.id} ${entry.unicode} ${entry.domain || ''} ${entry.meaning || ''}`.toLowerCase();
    return REALM_KEYWORDS.some(k => text.includes(k));
  }
  return false;
}

function isGodEntry(entry) {
  return entry.pantheon !== 'greek-location';
}

/**
 * Rich search: returns entries with live site data (business card) + availability
 */
function search({ q, pantheon, tier, hasSite, type = 'all', sort = 'relevance', limit = 20, offset = 0 }) {
  const db = getDb();
  
  let sql = `
    SELECT 
      e.*,
      s.id as site_id,
      s.domain as site_domain,
      s.punycode as site_punycode,
      s.title as site_title,
      s.description as site_description,
      s.content_snippet as site_snippet,
      s.status as site_status,
      s.tier_label as site_tier_label,
      s.is_flagship as site_is_flagship,
      s.last_crawled as site_last_crawled,
      a.status as avail_status
    FROM entries e
    LEFT JOIN indexed_sites s ON e.id = s.lexicon_entry_id AND s.status = 'active'
    LEFT JOIN availability a ON e.id = a.entry_id
    WHERE 1=1
  `;
  let countSql = `
    SELECT COUNT(*) as total FROM entries e
    LEFT JOIN indexed_sites s ON e.id = s.lexicon_entry_id AND s.status = 'active'
    LEFT JOIN availability a ON e.id = a.entry_id
    WHERE 1=1
  `;
  const params = [];

  if (q && q.trim()) {
    const ftsQuery = q.trim().split(/\s+/).map(t => `${t}*`).join(' ');
    sql = `
      SELECT 
        e.*,
        s.id as site_id,
        s.domain as site_domain,
        s.punycode as site_punycode,
        s.title as site_title,
        s.description as site_description,
        s.content_snippet as site_snippet,
        s.status as site_status,
        s.tier_label as site_tier_label,
        s.is_flagship as site_is_flagship,
        s.last_crawled as site_last_crawled,
        a.status as avail_status
      FROM entries e
      JOIN entries_fts fts ON e.rowid = fts.rowid
      LEFT JOIN indexed_sites s ON e.id = s.lexicon_entry_id AND s.status = 'active'
      LEFT JOIN availability a ON e.id = a.entry_id
      WHERE entries_fts MATCH ?
    `;
    countSql = `
      SELECT COUNT(*) as total FROM entries e
      JOIN entries_fts fts ON e.rowid = fts.rowid
      LEFT JOIN indexed_sites s ON e.id = s.lexicon_entry_id AND s.status = 'active'
      LEFT JOIN availability a ON e.id = a.entry_id
      WHERE entries_fts MATCH ?
    `;
    params.push(ftsQuery);
  }

  if (pantheon) {
    sql += ' AND e.pantheon = ?';
    countSql += ' AND e.pantheon = ?';
    params.push(pantheon);
  }

  if (tier) {
    sql += ' AND e.tier = ?';
    countSql += ' AND e.tier = ?';
    params.push(tier);
  }

  if (hasSite === 'true') {
    sql += ' AND s.id IS NOT NULL';
    countSql += ' AND s.id IS NOT NULL';
  } else if (hasSite === 'false') {
    sql += ' AND s.id IS NULL';
    countSql += ' AND s.id IS NULL';
  }

  // Type filters
  if (type === 'gods') {
    sql += " AND e.pantheon != 'greek-location'";
    countSql += " AND e.pantheon != 'greek-location'";
  } else if (type === 'locations') {
    sql += " AND e.pantheon = 'greek-location'";
    countSql += " AND e.pantheon = 'greek-location'";
  } else if (type === 'available') {
    sql += " AND a.status = 'available'";
    countSql += " AND a.status = 'available'";
  } else if (type === 'businesses') {
    sql += ' AND s.id IS NOT NULL';
    countSql += ' AND s.id IS NOT NULL';
  }
  // 'realms' and 'all' need post-query filtering because realm detection is heuristic.

  // Ordering (whitelisted to prevent SQL injection)
  const allowedSorts = {
    relevance: 's.is_flagship DESC, e.tier = \'dual\' DESC, e.tier = \'1\' DESC, e.unicode ASC',
    alphabetical: 'e.unicode ASC',
    tier: "e.tier = 'dual' DESC, e.tier = '1' DESC, e.tier = '2' DESC, e.unicode ASC",
    recently_crawled: 's.last_crawled DESC, e.unicode ASC',
    confidence: 'e.confidence_score DESC, e.unicode ASC'
  };
  const orderBy = allowedSorts[sort] || allowedSorts.relevance;

  sql += ` ORDER BY ${orderBy}`;
  sql += ' LIMIT ? OFFSET ?';

  let entries = db.prepare(sql).all(...params, limit, offset);

  if (type === 'realms') {
    entries = entries.filter(isRealmEntry);
  } else if (type === 'gods') {
    entries = entries.filter(isGodEntry);
  }

  const { total } = db.prepare(countSql).get(...params);

  return { 
    entries: entries.map(enrichEntry),
    total, 
    limit, 
    offset 
  };
}

function parseSources(sources) {
  if (!sources) return [];
  if (Array.isArray(sources)) return sources;
  try { return JSON.parse(sources); } catch { return []; }
}

function computePunycode(unicode) {
  if (!unicode) return null;
  try {
    const ascii = domainToASCII(unicode.toLowerCase());
    return ascii !== unicode.toLowerCase() ? ascii : null;
  } catch (e) {
    return null;
  }
}

function enrichEntry(row) {
  const site = row.site_id ? {
    id: row.site_id,
    domain: row.site_domain,
    punycode: row.site_punycode,
    title: row.site_title,
    description: row.site_description,
    snippet: row.site_snippet,
    status: row.site_status,
    tierLabel: row.site_tier_label,
    isFlagship: row.site_is_flagship
  } : null;

  const availability = row.avail_status ? {
    status: row.avail_status
  } : null;

  const punycode = computePunycode(row.unicode);
  return {
    id: row.id,
    ascii: row.ascii,
    unicode: row.unicode,
    greek: row.greek,
    pantheon: row.pantheon,
    tier: row.tier,
    tierLabel: row.tier_label,
    meaning: row.meaning,
    sources: parseSources(row.sources),
    domain: row.domain,
    punycode,
    hasFlagship: row.has_flagship,
    site,
    availability
  };
}

function getEntry(id) {
  const db = getDb();
  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
  if (!entry) return null;

  const breakdown = db.prepare('SELECT * FROM breakdowns WHERE entry_id = ?').all(id);
  const site = db.prepare("SELECT * FROM indexed_sites WHERE lexicon_entry_id = ? AND status = 'active'").get(id);
  const avail = db.prepare('SELECT * FROM availability WHERE entry_id = ?').get(id);

  const punycode = computePunycode(entry.unicode);
  return { 
    ...entry,
    tierLabel: entry.tier_label,
    sources: parseSources(entry.sources),
    punycode,
    breakdown,
    site: site || null,
    availability: avail ? { ...avail, registrar_links: JSON.parse(avail.registrar_links || '{}') } : null
  };
}

function getStats() {
  const db = getDb();
  return {
    total: db.prepare('SELECT COUNT(*) as c FROM entries').get().c,
    flagships: db.prepare('SELECT COUNT(*) as c FROM entries WHERE has_flagship = 1').get().c,
    pantheons: db.prepare('SELECT COUNT(DISTINCT pantheon) as c FROM entries').get().c,
    breakdown: [], // stats table removed in crawler migration
    tiers: db.prepare(`
      SELECT tier, COUNT(*) as count FROM entries GROUP BY tier ORDER BY
      CASE tier WHEN 'dual' THEN 1 WHEN '1' THEN 2 WHEN '2' THEN 3 ELSE 4 END
    `).all(),
    sites: {
      indexed: db.prepare('SELECT COUNT(*) as c FROM indexed_sites').get().c,
      active: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'active'").get().c,
      available: db.prepare('SELECT COUNT(*) as c FROM availability').get().c
    }
  };
}

function getPantheons() {
  const db = getDb();
  return db.prepare('SELECT DISTINCT pantheon FROM entries ORDER BY pantheon').all().map(r => r.pantheon);
}

function getFlagships() {
  const db = getDb();
  return db.prepare(`
    SELECT e.*, s.title as site_title, s.description as site_description
    FROM entries e
    LEFT JOIN indexed_sites s ON e.id = s.lexicon_entry_id AND s.status = 'active'
    WHERE e.has_flagship = 1
    ORDER BY e.pantheon, e.unicode
  `).all();
}

function getByPantheon(pantheon) {
  const db = getDb();
  return db.prepare(`
    SELECT e.*, s.title as site_title, s.status as site_status
    FROM entries e
    LEFT JOIN indexed_sites s ON e.id = s.lexicon_entry_id AND s.status = 'active'
    WHERE e.pantheon = ?
    ORDER BY e.has_flagship DESC, e.unicode
  `).all(pantheon);
}

function getVariants(id) {
  const db = getDb();
  // First get the entry to find its ASCII root
  const entry = db.prepare('SELECT ascii FROM entries WHERE id = ?').get(id);
  if (!entry) return null;

  // Find all entries sharing the same ASCII, excluding the original
  const variants = db.prepare(`
    SELECT e.*, s.title as site_title, s.description as site_description,
           s.status as site_status, s.punycode as site_punycode
    FROM entries e
    LEFT JOIN indexed_sites s ON e.id = s.lexicon_entry_id AND s.status = 'active'
    WHERE e.ascii = ? AND e.id != ?
    ORDER BY e.has_flagship DESC, e.unicode
  `).all(entry.ascii, id);

  return variants.map(row => {
    const punycode = computePunycode(row.unicode);
    return {
      id: row.id,
      ascii: row.ascii,
      unicode: row.unicode,
      greek: row.greek,
      pantheon: row.pantheon,
      tier: row.tier,
      tierLabel: row.tier_label,
      meaning: row.meaning,
      sources: parseSources(row.sources),
      domain: row.domain,
      punycode,
      hasFlagship: row.has_flagship,
      site: row.site_title ? {
        title: row.site_title,
        description: row.site_description,
        status: row.site_status,
        punycode: row.site_punycode
      } : null
    };
  });
}

function getVariantsByAscii(ascii) {
  const db = getDb();
  const variants = db.prepare(`
    SELECT e.*, s.title as site_title, s.description as site_description,
           s.status as site_status, s.punycode as site_punycode
    FROM entries e
    LEFT JOIN indexed_sites s ON e.id = s.lexicon_entry_id AND s.status = 'active'
    WHERE e.ascii = ?
    ORDER BY e.has_flagship DESC, e.unicode
  `).all(ascii);

  return variants.map(row => ({
    id: row.id,
    ascii: row.ascii,
    unicode: row.unicode,
    greek: row.greek,
    pantheon: row.pantheon,
    tier: row.tier,
    tierLabel: row.tier_label,
    meaning: row.meaning,
    sources: parseSources(row.sources),
    domain: row.domain,
    hasFlagship: row.has_flagship,
    site: row.site_title ? {
      title: row.site_title,
      description: row.site_description,
      status: row.site_status,
      punycode: row.site_punycode
    } : null
  }));
}

module.exports = {
  search,
  getEntry,
  getStats,
  getPantheons,
  getFlagships,
  getByPantheon,
  getVariants,
  getVariantsByAscii
};
