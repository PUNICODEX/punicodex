/**
 * Seed the temple-content search corpus (see migrate-temple-content.js) from
 * the canonical flagship content sources:
 *
 *   - scripts/lore-catalog.json           (mythology, symbols, cultural legacy)
 *   - platform/blog/content/{id}.json     (one canonical post per temple)
 *   - platform/api/industry-patterns.json (per-temple industry patterns)
 *   - type/js/lexicon.js                  (etymology narrative)
 *
 * Idempotent and rebuild-safe: each temple's rows are deleted and reinserted
 * inside one transaction; the FTS5 triggers keep temple_content_fts in sync.
 *
 * Usage:
 *   node platform/db/seed-temple-content.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { getDb } = require('./connection');
const { migrate } = require('./migrate-temple-content');

const LORE_CATALOG = require('../../scripts/lore-catalog.json');
const INDUSTRY_PATTERNS = require('../api/industry-patterns.json');
const { LEXICON } = require('../../type/js/lexicon.js');

const BLOG_CONTENT_DIR = path.join(__dirname, '..', 'blog', 'content');

const MAX_LORE_BODY = 4000;
const MAX_BLOG_BODY = 8000;

const entriesById = new Map(LEXICON.map((e) => [e.id, e]));

// stripHtml intentionally does not collapse whitespace: plain() runs stripMd
// on the result, and stripMd's line-anchored rules (headings, list markers)
// need the original newlines intact.
function stripHtml(html) {
  return (html || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function stripMd(md) {
  return (md || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/(\*\*|__)/g, '')
    .replace(/(\*|_)/g, '')
    .replace(/`/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/^[-*]\s+/gm, '');
}

function plain(text) {
  return stripMd(stripHtml(text)).replace(/\s+/g, ' ').trim();
}

function cap(text, max) {
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Lore rows for one temple: mythology lead/summary, one row per myth, the
 * symbols block, the etymology narrative, cultural legacy, and archaeology —
 * each a separate well-titled row so hits surface with meaningful titles.
 */
function buildLoreRows(templeId) {
  const lore = LORE_CATALOG[templeId];
  if (!lore) return [];
  const rows = [];
  const url = `/${templeId}/lore/`;
  const push = (title, rawBody) => {
    const body = cap(plain(rawBody), MAX_LORE_BODY);
    if (body) rows.push({ temple_id: templeId, section: 'lore', title, body, url });
  };

  const mythology = lore.mythology || {};
  push('Mythology Overview', mythology.lead);
  push('Mythology Summary', mythology.summary);
  for (const myth of mythology.myths || []) {
    const title = myth.tag ? `${myth.title} (${myth.tag})` : myth.title;
    push(title, myth.text);
  }

  if (Array.isArray(lore.symbols) && lore.symbols.length > 0) {
    push('Sacred Symbols', lore.symbols.map((s) => `${s.name}: ${s.meaning}`).join('. '));
  }

  const etymology = entriesById.get(templeId)?.etymology;
  if (etymology) {
    const parts = [];
    if (etymology.protoForm) {
      const gloss = etymology.protoGloss ? `, “${etymology.protoGloss}”` : '';
      parts.push(
        `Proto-form ${etymology.protoForm} (${etymology.protoLanguage || 'unknown origin'}${gloss}).`
      );
    }
    if (etymology.derivation) parts.push(etymology.derivation);
    if (Array.isArray(etymology.cognates) && etymology.cognates.length > 0) {
      parts.push(
        `Cognates: ${etymology.cognates.map((c) => `${c.form} (${c.language})`).join(', ')}.`
      );
    }
    push('Etymology', parts.join(' '));
  }

  push('Cultural Legacy', lore.culturalLegacy);
  push('Archaeology', lore.archaeology);
  return rows;
}

function buildBlogRow(templeId) {
  const file = path.join(BLOG_CONTENT_DIR, `${templeId}.json`);
  if (!fs.existsSync(file)) return null;
  let post;
  try {
    post = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_e) {
    return null;
  }
  const description = plain(post.description);
  const body = cap(`${description} ${plain(post.body)}`.trim(), MAX_BLOG_BODY);
  if (!body) return null;
  return {
    temple_id: templeId,
    section: 'blog',
    title: post.title || 'Temple Blog',
    body,
    url: `/${templeId}/blog/`,
  };
}

function buildPatternsRow(templeId) {
  const industries = INDUSTRY_PATTERNS.byEntry?.[templeId];
  if (!Array.isArray(industries) || industries.length === 0) return null;
  const body = cap(
    plain(industries.map((i) => `${i.name}. ${i.tagline} ${i.why}`).join(' ')),
    MAX_LORE_BODY
  );
  if (!body) return null;
  return {
    temple_id: templeId,
    section: 'patterns',
    title: 'Industry Patterns',
    body,
    url: `/${templeId}/patterns/`,
  };
}

/**
 * Seed (or reseed) the corpus.
 * `options.temples` restricts the seed to a subset of temple ids (test
 * fixtures); the default is every built flagship in the lore catalog.
 */
function seedTempleContent({ db, temples, logger = console } = {}) {
  const database = db || getDb();
  migrate(database);

  const ids = temples || Object.keys(LORE_CATALOG);
  const deleteRows = database.prepare('DELETE FROM temple_content WHERE temple_id = ?');
  const insertRow = database.prepare(`
    INSERT INTO temple_content (temple_id, section, title, body, url)
    VALUES (?, ?, ?, ?, ?)
  `);

  let rowCount = 0;
  // One transaction per temple keeps each chunk atomic and rebuild-safe.
  const seedTemple = database.transaction((templeId) => {
    deleteRows.run(templeId);
    const rows = [
      ...buildLoreRows(templeId),
      buildBlogRow(templeId),
      buildPatternsRow(templeId),
    ].filter(Boolean);
    for (const row of rows) {
      insertRow.run(row.temple_id, row.section, row.title, row.body, row.url);
    }
    return rows.length;
  });

  for (const templeId of ids) {
    try {
      rowCount += seedTemple(templeId);
    } catch (err) {
      logger.warn(`[seed-temple-content] skipped ${templeId}: ${err.message}`);
    }
  }
  return { temples: ids.length, rows: rowCount };
}

if (require.main === module) {
  const start = Date.now();
  const result = seedTempleContent({});
  console.log(
    `Temple content seed complete: ${result.rows} rows across ${result.temples} temples in ${Date.now() - start}ms.`
  );
}

module.exports = { seedTempleContent, buildLoreRows, buildBlogRow, buildPatternsRow };
