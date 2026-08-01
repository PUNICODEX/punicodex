/**
 * GET /api/search/temples/?q=<query>&limit=8
 *
 * Full-text search over the flagship temple-content corpus (lore, blog posts,
 * industry patterns). Backs the "Temple Content" section of the search page.
 * The corpus lives in temple_content / temple_content_fts (see
 * platform/db/migrate-temple-content.js + seed-temple-content.js).
 */

const { handleError, setCors } = require('../../../../api/_utils');
const { checkPublicRateLimitByReq } = require('../../../api/public-rate-limiter');
const { classifyTerm } = require('../../../api/homograph-service');

const MAX_QUERY_LENGTH = 200;
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

const SECTION_LABELS = {
  blog: 'Temple Blog',
  lore: 'Temple Lore',
  patterns: 'Industry Patterns',
};

/**
 * Escape a token for FTS5 and optionally wrap it in quotes for phrase search.
 * FTS5 treats double quotes, asterisks, parentheses, and boolean operators specially.
 */
function escapeFtsToken(token) {
  // Replace internal double quotes with two double quotes (FTS5 escaping).
  let t = token.replace(/"/g, '""');
  // Escape leading special chars that FTS5 interprets as operators.
  if (/^[*\-^]/.test(t)) t = `"${t}"`;
  return t;
}

/**
 * Parse a user query into a safe FTS5 MATCH expression.
 * Multi-word queries become phrase searches by default for precision.
 */
function parseFtsQuery(q) {
  const raw = q.trim();
  if (!raw) return '';

  // Split on whitespace, keep quoted phrases intact.
  const tokens = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    tokens.push(m[1] !== undefined ? m[1] : m[2]);
  }

  const cleaned = tokens
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => `"${escapeFtsToken(t)}"`);

  if (cleaned.length === 0) return '';
  return cleaned.join(' ');
}

function prefixSnippet(body) {
  const text = (body || '').trim();
  if (text.length <= 220) return text;
  return `${text.slice(0, 220).trimEnd()}...`;
}

// Cold-start guard: migrate + seed at most once per serverless instance.
let corpusReady = null;

function ensureCorpus() {
  if (corpusReady !== null) return corpusReady;
  const start = Date.now();
  try {
    const { getDb } = require('../../../db/connection');
    const { migrate } = require('../../../db/migrate-temple-content');
    const db = getDb();
    migrate(db);
    const { c } = db.prepare('SELECT COUNT(*) AS c FROM temple_content').get();
    if (c === 0) {
      // Ephemeral (Vercel /tmp) databases start empty: seed from the committed
      // canonical sources, exactly once per instance.
      const { seedTempleContent } = require('../../../db/seed-temple-content');
      const result = seedTempleContent({ db });
      console.log(`[search/temples] seeded corpus: ${result.rows} rows in ${Date.now() - start}ms`);
    }
    corpusReady = true;
  } catch (err) {
    // Degrade to empty results rather than taking the endpoint down.
    console.error('[search/temples] corpus init failed:', err.message);
    corpusReady = false;
  }
  return corpusReady;
}

/**
 * FTS5 search over the corpus. bm25 ranks text relevance; flagship temples
 * and lore sections get small additive boosts. The best hit per
 * (temple, section) is kept first, then results order by rank.
 */
function searchTempleContent(db, ftsQuery, limit) {
  const hits = db
    .prepare(
      `
    SELECT
      tc.temple_id,
      tc.section,
      tc.title,
      tc.body,
      tc.url,
      e.unicode,
      e.pantheon,
      snippet(temple_content_fts, 3, '<mark>', '</mark>', '...', 32) AS body_snippet,
      (
        -bm25(temple_content_fts)
        + CASE WHEN e.has_flagship = 1 THEN 1.5 ELSE 0.0 END
        + CASE tc.section
            WHEN 'lore' THEN 1.2
            WHEN 'blog' THEN 1.0
            WHEN 'patterns' THEN 0.8
            ELSE 1.0
          END
      ) AS rank_score
    FROM temple_content_fts
    JOIN temple_content tc ON temple_content_fts.rowid = tc.id
    LEFT JOIN entries e ON e.id = tc.temple_id
    WHERE temple_content_fts MATCH ?
  `
    )
    .all(ftsQuery);

  const best = new Map();
  for (const hit of hits) {
    const key = `${hit.temple_id}:${hit.section}`;
    const prev = best.get(key);
    if (!prev || hit.rank_score > prev.rank_score) best.set(key, hit);
  }
  const grouped = [...best.values()].sort((a, b) => b.rank_score - a.rank_score);
  return { total: grouped.length, rows: grouped.slice(0, limit) };
}

function queryTrustPayload(queryTrust) {
  return {
    tier: queryTrust.tier,
    verdict: queryTrust.verdict,
    severity: queryTrust.severity,
    label: queryTrust.label,
    reason: queryTrust.reason,
  };
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const allowed = await checkPublicRateLimitByReq(req, res, 'api-search');
  if (!allowed) return;

  try {
    const rawQ = Array.isArray(req.query?.q) ? req.query.q[0] : req.query?.q;
    const q = (rawQ ?? '').toString();
    if (!q.trim()) {
      return res.status(400).json({ success: false, error: 'q parameter required' });
    }
    if (q.length > MAX_QUERY_LENGTH) {
      return res
        .status(400)
        .json({ success: false, error: `q must be ${MAX_QUERY_LENGTH} characters or fewer` });
    }

    const rawLimit = Array.isArray(req.query?.limit) ? req.query.limit[0] : req.query?.limit;
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(rawLimit, 10) || DEFAULT_LIMIT));

    const queryTrust = classifyTerm(q);
    const trustPayload = queryTrustPayload(queryTrust);

    if (!ensureCorpus()) {
      return res.json({ success: true, query: q, total: 0, results: [], queryTrust: trustPayload });
    }

    const { getDb } = require('../../../db/connection');
    const db = getDb();

    let total = 0;
    let rows = [];
    const ftsQuery = parseFtsQuery(q);
    if (ftsQuery) {
      try {
        ({ total, rows } = searchTempleContent(db, ftsQuery, limit));
      } catch (err) {
        // An unparseable FTS expression must not 500 the endpoint.
        console.error('[search/temples] query failed:', err.message);
      }
    }

    res.json({
      success: true,
      query: q,
      total,
      results: rows.map((row) => ({
        templeId: row.temple_id,
        unicode: row.unicode || row.temple_id,
        pantheon: row.pantheon || null,
        section: row.section,
        sectionLabel: SECTION_LABELS[row.section] || row.section,
        title: row.title,
        snippet: row.body_snippet || prefixSnippet(row.body),
        url: row.url,
      })),
      queryTrust: trustPayload,
    });
  } catch (err) {
    handleError(res, err);
  }
};
