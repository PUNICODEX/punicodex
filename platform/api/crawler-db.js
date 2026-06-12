const Database = require('better-sqlite3');
const path = require('path');
const { embedText, rerankWithVectors, searchAllVectors } = require('./semantic-search');
const { getDbPath } = require('../db/db');
const { searchKeywords } = require('./keyword-extractor');

const DB_PATH = getDbPath();
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

/**
 * Compute click-based ranking boosts for sites.
 * Returns Map<site_id, boost> where boost is 0-0.5 based on click history.
 */
function getClickBoosts(query, siteIds) {
  const db = getDb();
  if (!siteIds || siteIds.length === 0) return new Map();

  const placeholders = siteIds.map(() => '?').join(',');

  // Global click count per site (all time)
  const globalClicks = db.prepare(`
    SELECT site_id, COUNT(*) as clicks
    FROM search_clicks
    WHERE site_id IN (${placeholders})
    GROUP BY site_id
  `).all(...siteIds);

  // Query-specific click count
  const queryClicks = db.prepare(`
    SELECT c.site_id, COUNT(*) as clicks
    FROM search_clicks c
    JOIN search_queries q ON c.query_id = q.id
    WHERE q.query = ? AND c.site_id IN (${placeholders})
    GROUP BY c.site_id
  `).all(query.trim(), ...siteIds);

  const maxGlobal = Math.max(...globalClicks.map(r => r.clicks), 1);
  const maxQuery = Math.max(...queryClicks.map(r => r.clicks), 1);

  const boosts = new Map();
  for (const siteId of siteIds) {
    const globalCount = globalClicks.find(r => r.site_id === siteId)?.clicks || 0;
    const queryCount = queryClicks.find(r => r.site_id === siteId)?.clicks || 0;

    // Global boost: logarithmic scale, max 0.2
    const globalBoost = Math.log1p(globalCount) / Math.log1p(maxGlobal) * 0.2;
    // Query-specific boost: logarithmic scale, max 0.3
    const queryBoost = Math.log1p(queryCount) / Math.log1p(maxQuery) * 0.3;

    boosts.set(siteId, globalBoost + queryBoost);
  }

  return boosts;
}

function getSites({ status, pantheon, entryId, limit = 50, offset = 0 }) {
  const db = getDb();
  let sql = 'SELECT * FROM indexed_sites WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM indexed_sites WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    countSql += ' AND status = ?';
    params.push(status);
  }
  if (pantheon) {
    sql += ' AND pantheon = ?';
    countSql += ' AND pantheon = ?';
    params.push(pantheon);
  }
  if (entryId) {
    sql += ' AND lexicon_entry_id = ?';
    countSql += ' AND lexicon_entry_id = ?';
    params.push(entryId);
  }

  sql += " ORDER BY is_flagship DESC, status = 'active' DESC, tier = 'dual' DESC, tier = '1' DESC, domain ASC";
  sql += ' LIMIT ? OFFSET ?';

  const sites = db.prepare(sql).all(...params, limit, offset);
  const { total } = db.prepare(countSql).get(...params);

  return { sites, total, limit, offset };
}

function getSiteByPunycode(punycode) {
  const db = getDb();
  return db.prepare('SELECT * FROM indexed_sites WHERE punycode = ?').get(punycode);
}

function searchSites(q, limit = 20) {
  const db = getDb();
  const like = `%${q}%`;
  return db.prepare(`
    SELECT s.*, e.unicode as entry_unicode, e.ascii as entry_ascii, e.meaning as entry_meaning
    FROM indexed_sites s
    LEFT JOIN entries e ON s.lexicon_entry_id = e.id
    WHERE s.domain LIKE ? OR s.title LIKE ? OR s.punycode LIKE ?
      OR e.unicode LIKE ? OR e.ascii LIKE ? OR e.meaning LIKE ?
    ORDER BY s.is_flagship DESC, s.status = 'active' DESC
    LIMIT ?
  `).all(like, like, like, like, like, like, limit);
}

/**
 * Web search: FTS5-powered content search with composite relevance scoring.
 * 
 * SCORING FORMULA (Phase 3 — Content Quality):
 *   composite_score = bm25(fts) * multiplier
 *   multiplier = 1.0 + tier_bonus + flagship_bonus + archetype_bonus + freshness_bonus + quality_bonus
 * 
 * Where:
 *   - bm25: SQLite FTS5 BM25 score (negative, lower = better match)
 *   - tier_bonus: dual=0.5, tier-1=0.3, tier-2=0.1
 *   - flagship_bonus: 0.2 if is_flagship
 *   - archetype_bonus: 0.0-1.0 from indexed_sites.archetype_score
 *   - freshness_bonus: 0.0-0.15 from freshness_score (0-1 scale)
 *   - quality_bonus: 0.0-0.15 from quality_score (0-100 scale, normalized)
 * 
 * This additive structure makes it trivial to add new ranking dimensions
 * without rewriting the ORDER BY clause.
 * 
 * Returns SERP-style results with highlighted snippets.
 */
async function searchWeb(q, options = {}) {
  const { limit = 20, mode = 'all', type = 'all', pantheon, tier, sort = 'relevance' } = options;
  const db = getDb();
  if (!q || !q.trim()) {
    return { results: [], total: 0, query: q, timing: 0 };
  }

  const startTime = Date.now();
  const ftsQuery = q.trim().split(/\s+/).filter(w => w.length > 0).join(' ');

  const filters = [];
  const params = [ftsQuery];

  if (mode === 'network') {
    filters.push("AND (s.is_flagship = 1 OR s.tenant_name IS NOT NULL)");
  }

  if (type === 'businesses') {
    filters.push("AND (s.is_flagship = 1 OR s.tenant_name IS NOT NULL OR s.tenant_front_url IS NOT NULL)");
  }

  if (pantheon) {
    filters.push("AND s.pantheon = ?");
    params.push(pantheon);
  }

  if (tier) {
    filters.push("AND s.tier = ?");
    params.push(tier);
  }

  const allowedSorts = {
    relevance: 'composite_score ASC',
    alphabetical: 's.title ASC',
    tier: "s.tier = 'dual' DESC, s.tier = '1' DESC, s.tier = '2' DESC",
    recently_crawled: 's.last_crawled DESC',
    quality: 's.quality_score DESC'
  };
  const orderBy = allowedSorts[sort] || allowedSorts.relevance;

  // Primary: FTS5 with BM25 scoring + ranking boosts
  let results = [];
  try {
    const rows = db.prepare(`
      SELECT 
        s.*,
        bm25(indexed_sites_fts) AS bm25_score,
        bm25(indexed_sites_fts) * (
          1.0 +
          CASE 
            WHEN s.tier = 'dual' THEN 0.5
            WHEN s.tier = '1' THEN 0.3
            WHEN s.tier = '2' THEN 0.1
            ELSE 0.0
          END +
          CASE WHEN s.is_flagship = 1 THEN 1.5 ELSE 0.0 END +
          CASE WHEN s.tenant_name IS NOT NULL THEN 0.5 ELSE 0.0 END +
          COALESCE(s.archetype_score, 0.0) +
          COALESCE(s.freshness_score, 0.5) * 0.15 +
          COALESCE(s.quality_score, 50.0) / 100.0 * 0.15 +
          COALESCE(s.pagerank, 0.0) / 100.0 * 0.4 +
          COALESCE(s.authority_score, 0.0) / 100.0 * 0.3 +
          CASE WHEN s.punycode LIKE 'xn--%' THEN 0.5 ELSE 0.0 END
        ) AS composite_score,
        (
          1.0 +
          CASE 
            WHEN s.tier = 'dual' THEN 0.5
            WHEN s.tier = '1' THEN 0.3
            WHEN s.tier = '2' THEN 0.1
            ELSE 0.0
          END +
          CASE WHEN s.is_flagship = 1 THEN 1.5 ELSE 0.0 END +
          CASE WHEN s.tenant_name IS NOT NULL THEN 0.5 ELSE 0.0 END +
          COALESCE(s.archetype_score, 0.0) +
          COALESCE(s.freshness_score, 0.5) * 0.15 +
          COALESCE(s.quality_score, 50.0) / 100.0 * 0.15 +
          COALESCE(s.pagerank, 0.0) / 100.0 * 0.4 +
          COALESCE(s.authority_score, 0.0) / 100.0 * 0.3 +
          CASE WHEN s.punycode LIKE 'xn--%' THEN 0.5 ELSE 0.0 END
        ) AS multiplier,
        snippet(indexed_sites_fts, 2, '<mark>', '</mark>', '...', 25) AS title_snippet,
        snippet(indexed_sites_fts, 3, '<mark>', '</mark>', '...', 25) AS desc_snippet,
        snippet(indexed_sites_fts, 6, '<mark>', '</mark>', '...', 25) AS snippet_highlight,
        snippet(indexed_sites_fts, 7, '<mark>', '</mark>', '...', 25) AS og_snippet,
        snippet(indexed_sites_fts, 8, '<mark>', '</mark>', '...', 25) AS og_desc_snippet
      FROM indexed_sites_fts
      JOIN indexed_sites s ON indexed_sites_fts.rowid = s.id
      WHERE indexed_sites_fts MATCH ?
        AND s.status != 'spam'
        AND (s.is_flagship = 1 OR s.quality_score >= 0.3 OR s.tenant_name IS NOT NULL)
        ${filters.join(' ')}
      ORDER BY ${orderBy}
      LIMIT ?
    `).all(...params, limit);

    results = rows.map(row => {
      // Best snippet hierarchy: OG desc > Twitter desc > meta desc > FTS snippet > h1 > first_p > content_snippet
      const bestSnippet = row.og_desc_snippet || row.og_snippet || row.snippet_highlight 
        || row.desc_snippet || row.title_snippet
        || row.og_description || row.twitter_description || row.h1 || row.first_p 
        || row.description || row.content_snippet || '';

      // Best title hierarchy: OG title > Twitter title > meta title
      const bestTitle = row.og_title || row.twitter_title || row.title || row.domain;

      return {
        id: row.id,
        domain: row.domain,
        punycode: row.punycode,
        title: bestTitle,
        snippet: bestSnippet,
        description: row.og_description || row.twitter_description || row.description || '',
        url: `https://${row.punycode}`,
        lexiconEntryId: row.lexicon_entry_id,
        pantheon: row.pantheon,
        tier: row.tier,
        tierLabel: row.tier_label,
        isFlagship: row.is_flagship === 1,
        status: row.status,
        lastCrawled: row.last_crawled,
        publishedDate: row.published_date,
        faviconPath: row.favicon_path,
        ogImagePath: row.og_image_path,
        lang: row.lang,
        wordCount: row.word_count,
        responseTimeMs: row.response_time_ms,
        rankScore: row.composite_score,
        scoreBreakdown: {
          bm25: row.bm25_score,
          multiplier: row.multiplier,
          tierBonus: row.tier === 'dual' ? 0.5 : row.tier === '1' ? 0.3 : row.tier === '2' ? 0.1 : 0,
          flagshipBonus: row.is_flagship === 1 ? 1.5 : 0,
          tenantBonus: row.tenant_name ? 0.5 : 0,
          archetypeBonus: row.archetype_score || 0,
          freshnessBonus: (row.freshness_score || 0.5) * 0.15,
          qualityBonus: (row.quality_score || 50) / 100 * 0.15,
          pagerankBonus: (row.pagerank || 0) / 100 * 0.4,
          authorityBonus: (row.authority_score || 0) / 100 * 0.3,
          punycodeBonus: row.punycode && row.punycode.startsWith('xn--') ? 0.5 : 0
        },
        leaseStatus: row.lease_status,
        isFlagship: row.is_flagship === 1,
        freshnessScore: row.freshness_score,
        qualityScore: row.quality_score,
        readabilityScore: row.readability_score,
        tenant: row.tenant_name ? {
          name: row.tenant_name,
          category: row.tenant_category,
          frontUrl: row.tenant_front_url
        } : null,
        sitemapEntries: row.sitemap_entries,
        anchorTexts: row.anchor_texts ? JSON.parse(row.anchor_texts) : null,
        ogVideo: row.og_video,
        ogVideoType: row.og_video_type,
        ratingValue: row.rating_value,
        ratingCount: row.rating_count,
        isPunycode: row.punycode && row.punycode.startsWith('xn--'),
        matchedTerms: extractMatchedTerms(bestSnippet)
      };
    });

    // Fetch sub-pages for all results in a single query
    if (results.length > 0) {
      const siteIds = results.map(r => r.id);
      const placeholders = siteIds.map(() => '?').join(',');
      const subPages = db.prepare(`
        SELECT site_id, url, title, description, h1, word_count, content_hash
        FROM site_pages
        WHERE site_id IN (${placeholders})
        ORDER BY word_count DESC
      `).all(...siteIds);

      const pagesBySite = {};
      const seenHashes = {};
      for (const p of subPages) {
        if (!pagesBySite[p.site_id]) {
          pagesBySite[p.site_id] = [];
          seenHashes[p.site_id] = new Set();
        }
        // Skip root-path pages (redirects to home page, SPA hash links)
        try {
          const u = new URL(p.url);
          if (u.pathname === '/' || u.pathname === '/index.html') continue;
        } catch { continue; }
        // Deduplicate by content hash
        if (seenHashes[p.site_id].has(p.content_hash)) continue;
        seenHashes[p.site_id].add(p.content_hash);
        pagesBySite[p.site_id].push(p);
      }

      results = results.map(r => ({
        ...r,
        subPages: (pagesBySite[r.id] || []).slice(0, 4)
      }));
    }
  } catch (e) {
    console.error('FTS5 error:', e.message);
  }

  // ====== KEYWORD INDEX FALLBACK ======
  // Tenants can provide a front URL; we crawl it and extract their existing
  // SEO keywords rather than forcing them to type keywords into a dashboard.
  // Surface those sites when the query matches their extracted keyword set.
  try {
    if (results.length < limit) {
      const keywordMatches = searchKeywords(q, limit);
      const existingIds = new Set(results.map(r => r.id));
      for (const row of keywordMatches) {
        if (existingIds.has(row.id)) continue;
        existingIds.add(row.id);
        const rawSnippet = row.og_description || row.twitter_description || row.h1 || row.first_p || row.description || row.content_snippet || '';
        results.push({
          id: row.id,
          domain: row.domain,
          punycode: row.punycode,
          title: row.og_title || row.twitter_title || row.title || row.domain,
          snippet: highlightTerms(rawSnippet, q),
          description: row.og_description || row.twitter_description || row.description || '',
          url: `https://${row.punycode}`,
          lexiconEntryId: row.lexicon_entry_id,
          pantheon: row.pantheon,
          tier: row.tier,
          tierLabel: row.tier_label,
          isFlagship: row.is_flagship === 1,
          status: row.status,
          lastCrawled: row.last_crawled,
          publishedDate: row.published_date,
          faviconPath: row.favicon_path,
          ogImagePath: row.og_image_path,
          lang: row.lang,
          rankScore: null,
          matchedTerms: [row.keyword],
          isKeywordMatch: true,
          keywordSource: row.keyword_source
        });
      }
    }
  } catch (e) {
    console.error('Keyword fallback error:', e.message);
  }

  // Fallback 1: Semantic vector search if FTS returned nothing
  let isSemanticFallback = false;
  if (results.length === 0) {
    try {
      const queryEmbedding = await embedText(q);
      if (queryEmbedding) {
        const vectorMatches = searchAllVectors(queryEmbedding, db, limit);
        if (vectorMatches.length > 0) {
          const siteIds = vectorMatches.map(m => m.siteId);
          const placeholders = siteIds.map(() => '?').join(',');
          const fallbackRows = db.prepare(`
            SELECT s.* FROM indexed_sites s WHERE s.id IN (${placeholders})
          `).all(...siteIds);

          // Preserve vector match order
          const rowMap = new Map(fallbackRows.map(r => [r.id, r]));
          results = vectorMatches.map(m => {
            const row = rowMap.get(m.siteId);
            if (!row) return null;
            const rawSnippet = row.og_description || row.twitter_description || row.h1 || row.first_p || row.description || row.content_snippet || '';
            return {
              id: row.id,
              domain: row.domain,
              punycode: row.punycode,
              title: row.og_title || row.twitter_title || row.title || row.domain,
              snippet: highlightTerms(rawSnippet, q),
              description: row.og_description || row.twitter_description || row.description || '',
              url: `https://${row.punycode}`,
              lexiconEntryId: row.lexicon_entry_id,
              pantheon: row.pantheon,
              tier: row.tier,
              tierLabel: row.tier_label,
              isFlagship: row.is_flagship === 1,
              status: row.status,
              lastCrawled: row.last_crawled,
              publishedDate: row.published_date,
              faviconPath: row.favicon_path,
              ogImagePath: row.og_image_path,
              lang: row.lang,
              rankScore: null,
              matchedTerms: q.trim().split(/\s+/).filter(w => w.length > 0),
              semanticScore: m.similarity,
              isSemanticFallback: true
            };
          }).filter(Boolean);
          isSemanticFallback = true;
        }
      }
    } catch (e) {
      // Vector fallback is optional
    }
  }

  // Fallback 2: LIKE search if both FTS and vector returned nothing
  if (results.length === 0) {
    const like = `%${q}%`;
    const fallbackRows = db.prepare(`
      SELECT s.*, e.unicode as entry_unicode
      FROM indexed_sites s
      LEFT JOIN entries e ON s.lexicon_entry_id = e.id
      WHERE s.status = 'active'
        AND (s.title LIKE ? OR s.description LIKE ? OR s.content_snippet LIKE ?
          OR s.h1 LIKE ? OR s.first_p LIKE ? OR s.domain LIKE ? OR s.punycode LIKE ?
          OR s.og_title LIKE ? OR s.og_description LIKE ?
          OR s.twitter_title LIKE ? OR s.twitter_description LIKE ?
          OR e.unicode LIKE ? OR e.ascii LIKE ?)
      ORDER BY s.is_flagship DESC, COALESCE(s.authority_score, 0) DESC, s.tier = 'dual' DESC, s.tier = '1' DESC
      LIMIT ?
    `).all(like, like, like, like, like, like, like, like, like, like, like, like, like, limit);

    results = fallbackRows.map(row => {
      const rawSnippet = row.og_description || row.twitter_description || row.h1 || row.first_p || row.description || row.content_snippet || '';
      return {
        id: row.id,
        domain: row.domain,
        punycode: row.punycode,
        title: row.og_title || row.twitter_title || row.title || row.domain,
        snippet: highlightTerms(rawSnippet, q),
        description: row.og_description || row.twitter_description || row.description || '',
        url: `https://${row.punycode}`,
        lexiconEntryId: row.lexicon_entry_id,
        pantheon: row.pantheon,
        tier: row.tier,
        tierLabel: row.tier_label,
        isFlagship: row.is_flagship === 1,
        status: row.status,
        lastCrawled: row.last_crawled,
        publishedDate: row.published_date,
        faviconPath: row.favicon_path,
        ogImagePath: row.og_image_path,
        lang: row.lang,
        rankScore: null,
        matchedTerms: q.trim().split(/\s+/).filter(w => w.length > 0),
        isFallback: true
      };
    });

    // Fetch sub-pages for fallback results too
    if (results.length > 0) {
      const siteIds = results.map(r => r.id);
      const placeholders = siteIds.map(() => '?').join(',');
      const subPages = db.prepare(`
        SELECT site_id, url, title, description, h1, word_count, content_hash
        FROM site_pages
        WHERE site_id IN (${placeholders})
        ORDER BY word_count DESC
      `).all(...siteIds);

      const pagesBySite = {};
      const seenHashes = {};
      for (const p of subPages) {
        if (!pagesBySite[p.site_id]) {
          pagesBySite[p.site_id] = [];
          seenHashes[p.site_id] = new Set();
        }
        // Skip root-path pages (redirects to home page, SPA hash links)
        try {
          const u = new URL(p.url);
          if (u.pathname === '/' || u.pathname === '/index.html') continue;
        } catch { continue; }
        // Deduplicate by content hash
        if (seenHashes[p.site_id].has(p.content_hash)) continue;
        seenHashes[p.site_id].add(p.content_hash);
        pagesBySite[p.site_id].push(p);
      }

      results = results.map(r => ({
        ...r,
        subPages: (pagesBySite[r.id] || []).slice(0, 4)
      }));
    }
  }

  // ====== PHASE 7: ENTITY RANKING BOOST ======
  // Find best-matching lexicon entry and boost sites that mention it
  let entityBonusApplied = false;
  let matchedEntryId = null;
  try {
    const query = q.trim().toLowerCase();
    const entry = db.prepare(`
      SELECT id, pantheon FROM entries
      WHERE LOWER(ascii) = ? OR LOWER(unicode) = ? OR LOWER(id) = ?
      LIMIT 1
    `).get(query, query, query);

    if (!entry) {
      // Try partial match
      const partial = db.prepare(`
        SELECT id, pantheon FROM entries
        WHERE LOWER(ascii) LIKE ? OR LOWER(unicode) LIKE ?
        ORDER BY tier = 'dual' DESC, tier = '1' DESC
        LIMIT 1
      `).get(`%${query}%`, `%${query}%`);
      if (partial) matchedEntryId = partial.id;
    } else {
      matchedEntryId = entry.id;
    }

    if (matchedEntryId && results.length > 0) {
      // Get sites that mention this entry
      const mentionRows = db.prepare(`
        SELECT site_id, mention_count FROM entity_mentions WHERE entry_id = ?
      `).all(matchedEntryId);
      const mentionMap = new Map(mentionRows.map(r => [r.site_id, r.mention_count]));

      // Also get same-pantheon mentions for broader semantic boost
      const pantheon = entry?.pantheon;
      let pantheonBonusMap = new Map();
      if (pantheon) {
        const pantheonRows = db.prepare(`
          SELECT site_id, SUM(mention_count) as total FROM entity_mentions
          WHERE pantheon = ? AND entry_id != ?
          GROUP BY site_id
        `).all(pantheon, matchedEntryId);
        pantheonBonusMap = new Map(pantheonRows.map(r => [r.site_id, Math.min(r.total, 5)]));
      }

      results = results.map(r => {
        const directMentions = mentionMap.get(r.id) || 0;
        const pantheonMentions = pantheonBonusMap.get(r.id) || 0;
        const entityBonus = Math.min(directMentions * 0.05, 0.15) + Math.min(pantheonMentions * 0.02, 0.05);

        if (entityBonus > 0) {
          return {
            ...r,
            rankScore: (r.rankScore || 0) * (1.0 - entityBonus), // Less negative = better
            scoreBreakdown: {
              ...r.scoreBreakdown,
              entityBonus: parseFloat(entityBonus.toFixed(3))
            }
          };
        }
        return r;
      });

      // Re-sort after entity bonus
      results.sort((a, b) => (a.rankScore || 0) - (b.rankScore || 0));
      entityBonusApplied = true;
    }
  } catch (e) {
    // Entity ranking is optional — don't break search if it fails
  }

  // ====== PHASE 8: CLICK FEEDBACK BOOST ======
  // Boost sites that users have previously clicked for this or similar queries
  let clickBoostApplied = false;
  try {
    if (results.length > 0) {
      const siteIds = results.map(r => r.id);
      const clickBoosts = getClickBoosts(q, siteIds);

      results = results.map(r => {
        const boost = clickBoosts.get(r.id) || 0;
        if (boost > 0) {
          return {
            ...r,
            rankScore: (r.rankScore || 0) * (1.0 - boost),
            scoreBreakdown: {
              ...r.scoreBreakdown,
              clickBoost: parseFloat(boost.toFixed(3))
            }
          };
        }
        return r;
      });

      // Re-sort after click boost
      results.sort((a, b) => (a.rankScore || 0) - (b.rankScore || 0));
      clickBoostApplied = true;
    }
  } catch (e) {
    // Click boost is optional
  }

  // ====== PHASE 9: SEMANTIC RE-RANKING ======
  let semanticReranked = false;
  let semanticScore = null;
  if (results.length > 0) {
    try {
      const queryEmbedding = await embedText(q);
      if (queryEmbedding) {
        results = rerankWithVectors(results, queryEmbedding, 0.35);
        semanticReranked = true;
        semanticScore = results[0]?.semanticScore || null;
      }
    } catch (e) {
      // Semantic re-ranking is optional — don't break search if it fails
      console.error('[search] Semantic re-ranking failed:', e.message);
    }
  }

  // ====== AVAILABILITY LAYER ======
  // Find lexicon entries matching the query that are available for lease
  let availability = [];
  try {
    if (mode !== 'network') {
      const query = q.trim().toLowerCase();
      const availRows = db.prepare(`
        SELECT a.entry_id, a.domain, a.punycode, a.status, a.registrar_links,
               e.unicode, e.ascii, e.meaning, e.tier, e.pantheon
        FROM availability a
        JOIN entries e ON a.entry_id = e.id
        WHERE (LOWER(e.ascii) = ? OR LOWER(e.unicode) = ? OR LOWER(e.id) = ?
               OR LOWER(e.ascii) LIKE ? OR LOWER(e.unicode) LIKE ?)
          AND a.status = 'available'
        ORDER BY e.tier = 'dual' DESC, e.tier = '1' DESC
        LIMIT 5
      `).all(query, query, query, `%${query}%`, `%${query}%`);

      for (const row of availRows) {
        availability.push({
          entryId: row.entry_id,
          domain: row.domain,
          punycode: row.punycode,
          unicode: row.unicode,
          ascii: row.ascii,
          meaning: row.meaning,
          tier: row.tier,
          pantheon: row.pantheon,
          registrarLinks: row.registrar_links ? JSON.parse(row.registrar_links) : {}
        });
      }
    }
  } catch (e) {
    // Availability is optional
  }

  const timing = ((Date.now() - startTime) / 1000).toFixed(3);
  return { results, total: results.length, query: q, timing, mode, entityBonusApplied, matchedEntryId, clickBoostApplied, semanticReranked, isSemanticFallback, availability };
}

function extractMatchedTerms(snippet) {
  const terms = [];
  const re = /<mark>([^<]+)<\/mark>/gi;
  let m;
  while ((m = re.exec(snippet)) !== null) {
    const term = m[1].toLowerCase();
    if (!terms.includes(term)) terms.push(term);
  }
  return terms;
}

function highlightTerms(text, query) {
  const words = query.trim().split(/\s+/).filter(w => w.length > 2);
  let result = text;
  for (const word of words) {
    const re = new RegExp(`(${escapeRegExp(word)})`, 'gi');
    result = result.replace(re, '<mark>$1</mark>');
  }
  return result;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getAvailability(entryId) {
  const db = getDb();
  const avail = db.prepare('SELECT * FROM availability WHERE entry_id = ?').get(entryId);
  if (avail) return { ...avail, registrar_links: JSON.parse(avail.registrar_links || '{}') };
  return null;
}

function setAvailability(entryId, domain, punycode, status = 'available') {
  const db = getDb();
  const links = JSON.stringify(generateRegistrarLinks(domain));
  db.prepare(`
    INSERT INTO availability (entry_id, domain, punycode, status, registrar_links)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(entry_id) DO UPDATE SET
      domain = excluded.domain,
      punycode = excluded.punycode,
      status = excluded.status,
      registrar_links = excluded.registrar_links,
      last_checked = datetime('now')
  `).run(entryId, domain, punycode, status, links);
}

function generateRegistrarLinks(domain) {
  const clean = domain.replace(/^www\./, '');
  return {
    godaddy: `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(clean)}`,
    namecheap: `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(clean)}`,
    porkbun: `https://porkbun.com/checkout/search?q=${encodeURIComponent(clean)}`,
    dynadot: `https://www.dynadot.com/domain/search.html?domain=${encodeURIComponent(clean)}`,
    spaceship: `https://spaceship.com/domains/?query=${encodeURIComponent(clean)}`
  };
}

function getCrawlerStats() {
  const db = getDb();
  return {
    total_sites: db.prepare('SELECT COUNT(*) as c FROM indexed_sites').get().c,
    active_sites: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'active'").get().c,
    pending_sites: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'pending'").get().c,
    error_sites: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'error'").get().c,
    flagged_sites: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'spam'").get().c,
    available_entries: db.prepare('SELECT COUNT(*) as c FROM availability').get().c,
    by_pantheon: db.prepare(`
      SELECT pantheon, COUNT(*) as count FROM indexed_sites WHERE status = 'active' GROUP BY pantheon
    `).all(),
    last_crawled: db.prepare(`
      SELECT MAX(last_crawled) as last_crawled FROM indexed_sites
    `).get().last_crawled,
    queue: {
      pending: db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status = 'pending'").get().c,
      crawling: db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status = 'crawling'").get().c,
      crawled: db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status = 'crawled'").get().c,
      error: db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status = 'error'").get().c,
      spam: db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status = 'spam'").get().c,
      total_discovered: db.prepare('SELECT COUNT(*) as c FROM discovered_domains').get().c
    },
    punycode: {
      unicode: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'active' AND punycode LIKE 'xn--%'").get().c,
      ascii: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'active' AND punycode NOT LIKE 'xn--%'").get().c
    },
    entities: {
      mentions: db.prepare('SELECT COUNT(*) as c FROM entity_mentions').get().c,
      sites: db.prepare('SELECT COUNT(DISTINCT site_id) as c FROM entity_mentions').get().c
    }
  };
}

function getQueue({ status, limit = 50, offset = 0 }) {
  const db = getDb();
  let sql = 'SELECT * FROM crawl_queue WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM crawl_queue WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    countSql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY priority DESC, discovery_date ASC';
  sql += ' LIMIT ? OFFSET ?';

  const items = db.prepare(sql).all(...params, limit, offset);
  const { total } = db.prepare(countSql).get(...params);

  return { items, total, limit, offset };
}

function addToQueue(domain, punycode, source = 'manual', priority = 0) {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO crawl_queue (domain, punycode, source, status, priority)
    VALUES (?, ?, ?, 'pending', ?)
  `).run(domain, punycode, source, priority);
}

function getDiscoveredDomains({ source, limit = 50, offset = 0 }) {
  const db = getDb();
  let sql = 'SELECT * FROM discovered_domains WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM discovered_domains WHERE 1=1';
  const params = [];

  if (source) {
    sql += ' AND source = ?';
    countSql += ' AND source = ?';
    params.push(source);
  }

  sql += ' ORDER BY last_seen DESC';
  sql += ' LIMIT ? OFFSET ?';

  const items = db.prepare(sql).all(...params, limit, offset);
  const { total } = db.prepare(countSql).get(...params);

  return { items, total, limit, offset };
}

/**
 * Find near-duplicate content clusters using simhash Hamming distance.
 * Returns groups of sites with similar content (distance <= threshold).
 */
function findDuplicateClusters(threshold = 3, minClusterSize = 2, limit = 100) {
  const db = getDb();
  const { hammingDistance } = require('../scripts/content-quality');

  // Fetch active sites with simhash
  const sites = db.prepare(`
    SELECT id, domain, punycode, title, simhash, content_length, lexicon_entry_id
    FROM indexed_sites
    WHERE status = 'active' AND simhash IS NOT NULL AND simhash != ''
    ORDER BY id
    LIMIT ?
  `).all(limit * 5);

  const clusters = [];
  const visited = new Set();

  for (let i = 0; i < sites.length; i++) {
    if (visited.has(sites[i].id)) continue;

    const cluster = [sites[i]];
    visited.add(sites[i].id);

    for (let j = i + 1; j < sites.length; j++) {
      if (visited.has(sites[j].id)) continue;
      if (!sites[j].simhash) continue;

      try {
        const dist = hammingDistance(sites[i].simhash, sites[j].simhash);
        if (dist <= threshold) {
          cluster.push(sites[j]);
          visited.add(sites[j].id);
        }
      } catch (e) {
        // Invalid hash format, skip
      }
    }

    if (cluster.length >= minClusterSize) {
      clusters.push({
        representative: cluster[0],
        count: cluster.length,
        sites: cluster.map(s => ({
          id: s.id,
          domain: s.domain,
          punycode: s.punycode,
          title: s.title
        }))
      });
    }
  }

  return clusters;
}

/**
 * Get knowledge panel data for a query.
 * Returns the best matching lexicon entry + live sites + related entries.
 */
function getKnowledgePanelData(q) {
  const db = getDb();
  if (!q || !q.trim()) return null;

  const query = q.trim().toLowerCase();

  // Try exact match first
  let entry = db.prepare(`
    SELECT * FROM entries
    WHERE LOWER(ascii) = ? OR LOWER(unicode) = ? OR LOWER(id) = ?
    LIMIT 1
  `).get(query, query, query);

  // Try LIKE match
  if (!entry) {
    entry = db.prepare(`
      SELECT * FROM entries
      WHERE LOWER(ascii) LIKE ? OR LOWER(unicode) LIKE ? OR LOWER(meaning) LIKE ?
      ORDER BY tier = 'dual' DESC, tier = '1' DESC
      LIMIT 1
    `).get(`%${query}%`, `%${query}%`, `%${query}%`);
  }

  if (!entry) return null;

  // Get live sites for this entry
  const sites = db.prepare(`
    SELECT domain, punycode, title, description, favicon_path, og_image_path, tier, pantheon
    FROM indexed_sites
    WHERE lexicon_entry_id = ? AND status = 'active'
    ORDER BY is_flagship DESC, tier = 'dual' DESC, tier = '1' DESC
    LIMIT 5
  `).all(entry.id);

  // Get related entries (same pantheon, different id)
  const related = db.prepare(`
    SELECT id, unicode, ascii, greek, meaning, tier, pantheon
    FROM entries
    WHERE pantheon = ? AND id != ?
    ORDER BY RANDOM()
    LIMIT 6
  `).all(entry.pantheon, entry.id);

  return {
    entry: {
      id: entry.id,
      unicode: entry.unicode,
      ascii: entry.ascii,
      greek: entry.greek,
      meaning: entry.meaning,
      tier: entry.tier,
      pantheon: entry.pantheon,
      etymology: entry.etymology,
      notes: entry.notes
    },
    sites,
    related
  };
}

/**
 * Generate a richer "People Also Ask" list for a query.
 * Mixes lexicon facts, etymology, variant spellings, flagship/tenant data,
 * and semantic co-occurrence. Falls back to tenant-driven answers when the
 * query looks commercial and no lexicon entry matches.
 */
function generatePeopleAlsoAsk(q, limit = 4) {
  const db = getDb();
  if (!q || !q.trim()) return [];

  const raw = q.trim();
  const query = raw.toLowerCase();

  // Find best matching lexicon entry
  let entry = db.prepare(`
    SELECT id, unicode, ascii, greek, meaning, pantheon, tier, tier_label, domain, etymology, variants, has_flagship
    FROM entries
    WHERE LOWER(ascii) = ? OR LOWER(unicode) = ? OR LOWER(id) = ?
    LIMIT 1
  `).get(query, query, query);

  if (!entry) {
    entry = db.prepare(`
      SELECT id, unicode, ascii, greek, meaning, pantheon, tier, tier_label, domain, etymology, variants, has_flagship
      FROM entries
      WHERE LOWER(ascii) LIKE ? OR LOWER(unicode) LIKE ? OR LOWER(meaning) LIKE ? OR LOWER(domain) LIKE ?
      ORDER BY tier = 'dual' DESC, tier = '1' DESC, has_flagship DESC, ascii ASC
      LIMIT 1
    `).get(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
  }

  const questions = [];
  const seen = new Set();

  function add(question, answer, source = 'lexicon') {
    if (!question || !answer) return;
    const key = question.toLowerCase().trim();
    if (seen.has(key)) return;
    seen.add(key);
    questions.push({ question, answer: String(answer).trim(), source });
  }

  if (entry) {
    const name = entry.unicode || entry.ascii;

    // Meaning
    if (entry.meaning) {
      add(`What does ${name} mean?`, entry.meaning);
    }

    // Original script form
    if (entry.greek && entry.greek !== '-') {
      add(`What is the original Greek form of ${name}?`, entry.greek);
      add(`How do you write ${name} in Greek?`, entry.greek);
    }

    // Domain / powers
    if (entry.domain) {
      add(`What is ${name} the god or symbol of?`, entry.domain);
      add(`What domain does ${name} rule?`, entry.domain);
    }

    // Pantheon
    if (entry.pantheon) {
      const pantheonTitle = entry.pantheon.charAt(0).toUpperCase() + entry.pantheon.slice(1);
      add(`Which pantheon does ${name} belong to?`, `${name} belongs to the ${pantheonTitle} pantheon.`);
    }

    // Unicode tier
    if (entry.tier) {
      const tierLabel = entry.tier_label || (entry.tier === 'dual' ? 'Dual-Tier' : `Tier ${entry.tier}`);
      let tierExplanation = '';
      if (entry.tier === 'dual') tierExplanation = 'it has multiple historically valid Unicode spellings.';
      else if (entry.tier === '1') tierExplanation = 'it contains both stress and long vowels with a single valid restoration.';
      else tierExplanation = 'it preserves one scholarly feature (stress or length).';
      add(`What is the Unicode tier of ${name}?`, `${name} is classified as ${tierLabel} — ${tierExplanation}`);
      add(`Why is ${name} a Tier ${entry.tier} Unicode name?`, tierExplanation);
    }

    // Variant spellings
    if (entry.variants) {
      try {
        const variants = JSON.parse(entry.variants);
        if (Array.isArray(variants) && variants.length > 0) {
          const variantText = variants.map(v => v.unicode || v.ascii || v).filter(Boolean).join(', ');
          if (variantText) {
            add(`What are the alternate Unicode spellings of ${name}?`, `Attested variants include ${variantText}.`);
          }
        }
      } catch (e) { /* ignore malformed JSON */ }
    }

    // Etymology (JSON or plain text)
    if (entry.etymology) {
      try {
        const ety = JSON.parse(entry.etymology);
        const parts = [];
        if (ety.protoForm && ety.protoLanguage) parts.push(`From Proto-${ety.protoLanguage} *${ety.protoForm}*.`);
        if (ety.derivation) parts.push(ety.derivation);
        if (ety.cognates && ety.cognates.length) {
          const cognates = ety.cognates.map(c => `${c.form} (${c.language})`).join(', ');
          parts.push(`Cognates: ${cognates}.`);
        }
        if (parts.length) {
          add(`What is the etymology of ${name}?`, parts.join(' '));
        } else {
          add(`What is the etymology of ${name}?`, entry.etymology);
        }
        if (ety.protoForm) {
          add(`What is the Proto-${ety.protoLanguage || 'Indo-European'} root of ${name}?`, `*${ety.protoForm}*${ety.protoGloss ? ` — ${ety.protoGloss}` : ''}`);
        }
      } catch (e) {
        add(`What is the etymology of ${name}?`, entry.etymology);
      }
    }

    // Flagship / tenant sites on this entry
    if (entry.has_flagship) {
      const sites = db.prepare(`
        SELECT domain, punycode, title, tenant_name, tenant_category
        FROM indexed_sites
        WHERE lexicon_entry_id = ? AND status = 'active'
        ORDER BY is_flagship DESC, quality_score DESC
        LIMIT 3
      `).all(entry.id);
      if (sites.length) {
        const siteList = sites.map(s => s.domain || s.punycode).join(', ');
        add(`What is the flagship domain for ${name}?`, `The PUNYCODEX flagship is ${siteList}.`, 'tenants');
        for (const s of sites) {
          if (s.tenant_name) {
            add(`What business operates on ${name}?`, `${s.tenant_name}${s.tenant_category ? ` (${s.tenant_category})` : ''} — ${s.domain || s.punycode}.`, 'tenants');
          }
        }
      }
    }

    // Co-mentioned entities from the semantic graph
    const coEntities = db.prepare(`
      SELECT e.id, e.unicode, e.ascii, e.meaning, COUNT(*) as co_count
      FROM entity_mentions em1
      JOIN entity_mentions em2 ON em1.site_id = em2.site_id
      JOIN entries e ON em2.entry_id = e.id
      WHERE em1.entry_id = ? AND em2.entry_id != ?
      GROUP BY e.id
      ORDER BY co_count DESC
      LIMIT 6
    `).all(entry.id, entry.id);

    for (const ce of coEntities.slice(0, 2)) {
      add(
        `How is ${name} related to ${ce.unicode}?`,
        `Both ${name} and ${ce.unicode} appear together in ${ce.co_count} indexed page${ce.co_count > 1 ? 's' : ''} across the Unicode web.${ce.meaning ? ` ${ce.unicode} means "${ce.meaning}".` : ''}`,
        'semantic_graph'
      );
    }
  }

  // Tenant / commercial questions for any query with matching active sites
  const tenantSites = db.prepare(`
    SELECT domain, punycode, title, description, first_p, tenant_name, tenant_category, tenant_front_url, meta_keywords
    FROM indexed_sites
    WHERE status = 'active' AND (
      LOWER(title) LIKE ? OR
      LOWER(description) LIKE ? OR
      LOWER(first_p) LIKE ? OR
      LOWER(meta_keywords) LIKE ? OR
      LOWER(tenant_category) LIKE ?
    )
    ORDER BY is_flagship DESC, quality_score DESC, authority_score DESC
    LIMIT 5
  `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);

  if (tenantSites.length) {
    const names = tenantSites.slice(0, 3).map(s => s.tenant_name || s.title || s.domain).join(', ');
    add(`Who offers ${raw} on PUNYCODEX?`, `Indexed tenants include ${names}.`, 'tenants');
    const first = tenantSites[0];
    if (first.tenant_category) {
      add(`What kind of business is ${first.tenant_name || first.title}?`, `${first.tenant_name || first.title} is listed under ${first.tenant_category}.`, 'tenants');
    }
    if (first.tenant_front_url || first.domain) {
      add(`Where can I learn more about ${first.tenant_name || first.title}?`, `Visit ${first.tenant_front_url || first.domain}.`, 'tenants');
    }
  } else if (!entry) {
    add(`What is ${raw}?`, `We don’t have a PUNYCODEX entry for “${raw}” yet, but you can search for Unicode-restored names or browse the lexicon.`, 'lexicon');
  }

  return questions.slice(0, limit);
}

/**
 * Submit a domain for indexing (webmaster flow).
 */
function submitDomain(domain, source = 'webmaster') {
  const db = getDb();
  try {
    const punycode = require('url').domainToASCII(domain);
    if (!punycode) return { success: false, error: 'Invalid domain' };

    // Check if already indexed
    const existing = db.prepare('SELECT status FROM indexed_sites WHERE punycode = ?').get(punycode);
    if (existing) {
      return { success: true, alreadyIndexed: true, status: existing.status, punycode };
    }

    // Add to queue
    db.prepare(`
      INSERT OR IGNORE INTO crawl_queue (domain, punycode, source, status, priority)
      VALUES (?, ?, ?, 'pending', 10)
    `).run(domain, punycode, source);

    // Also add to discovered_domains
    db.prepare(`
      INSERT OR IGNORE INTO discovered_domains (domain, punycode, source)
      VALUES (?, ?, ?)
    `).run(domain, punycode, source);

    return { success: true, punycode, queued: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function markSiteSpam(punycode) {
  const db = getDb();
  db.prepare(`UPDATE indexed_sites SET status = 'spam' WHERE punycode = ?`).run(punycode);
}

module.exports = {
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
  submitDomain
};
