/**
 * Entity Extractor (Phase 7 — Knowledge Layer)
 * Scans crawled site content for mentions of lexicon entries.
 * Creates a graph of entity co-occurrences across the indexed web.
 */
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'punycodex.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

/**
 * Build a fast entity lookup map from the lexicon.
 * Each entry gets: id, ascii (lowercase), unicode (lowercase), greek (lowercase), pantheon
 */
function buildEntityMap() {
  const entries = db.prepare(`
    SELECT id, ascii, unicode, greek, pantheon, tier
    FROM entries
    WHERE ascii IS NOT NULL
  `).all();

  const map = new Map(); // normalized text -> { id, pantheon, tier, forms: [] }

  for (const e of entries) {
    const forms = [];
    if (e.ascii) forms.push(e.ascii.toLowerCase());
    if (e.unicode) forms.push(e.unicode.toLowerCase());
    if (e.greek && e.greek !== '-') forms.push(e.greek.toLowerCase());

    // Also add plural/common variants for major gods
    if (e.ascii) {
      forms.push(e.ascii.toLowerCase() + 's'); // Zeus -> Zeuss (rare but catches some)
    }

    for (const form of forms) {
      if (!form || form.length < 2) continue;
      // Only store if not already present with a longer form (prefer longer matches)
      const existing = map.get(form);
      if (!existing || existing.form.length < form.length) {
        map.set(form, { id: e.id, pantheon: e.pantheon, tier: e.tier, form });
      }
    }
  }

  return map;
}

/**
 * Extract entity mentions from text.
 * Returns array of { entryId, pantheon, tier, count, contexts[] }
 */
function extractEntities(text, entityMap, maxContexts = 3) {
  if (!text || text.length < 10) return [];

  const normalized = text.toLowerCase();
  const mentions = new Map(); // entryId -> { count, contexts: Set }

  // Sort entity forms by length descending (match longest first to avoid partial matches)
  const sortedForms = Array.from(entityMap.entries())
    .sort((a, b) => b[0].length - a[0].length);

  for (const [form, meta] of sortedForms) {
    // Use word boundary regex to avoid matching inside other words
    const regex = new RegExp(`\\b${escapeRegex(form)}\\b`, 'gi');
    let match;
    while ((match = regex.exec(normalized)) !== null) {
      const entryId = meta.id;
      if (!mentions.has(entryId)) {
        mentions.set(entryId, { count: 0, contexts: new Set(), pantheon: meta.pantheon, tier: meta.tier });
      }
      const m = mentions.get(entryId);
      m.count++;

      // Extract context snippet around the mention
      if (m.contexts.size < maxContexts) {
        const start = Math.max(0, match.index - 40);
        const end = Math.min(normalized.length, match.index + form.length + 40);
        const snippet = text.slice(start, end).replace(/\s+/g, ' ').trim();
        m.contexts.add(snippet);
      }
    }
  }

  return Array.from(mentions.entries()).map(([entryId, data]) => ({
    entryId,
    pantheon: data.pantheon,
    tier: data.tier,
    count: data.count,
    contexts: Array.from(data.contexts)
  }));
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Process a single site and store its entity mentions.
 */
function processSite(siteId) {
  const site = db.prepare(`
    SELECT id, title, description, h1, first_p, content_snippet, domain, punycode
    FROM indexed_sites
    WHERE id = ?
  `).get(siteId);

  if (!site) return 0;

  const text = [
    site.title,
    site.description,
    site.h1,
    site.first_p,
    site.content_snippet
  ].filter(Boolean).join('. ');

  const entityMap = buildEntityMap();
  const mentions = extractEntities(text, entityMap);

  if (mentions.length === 0) return 0;

  const insert = db.prepare(`
    INSERT OR REPLACE INTO entity_mentions
      (site_id, entry_id, mention_count, contexts, pantheon, tier)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    // Clear old mentions for this site
    db.prepare('DELETE FROM entity_mentions WHERE site_id = ?').run(siteId);

    for (const m of mentions) {
      insert.run(siteId, m.entryId, m.count, JSON.stringify(m.contexts), m.pantheon, m.tier);
    }
  })();

  return mentions.length;
}

/**
 * Batch process all active sites.
 */
function processAllSites(batchSize = 50) {
  console.log('🔍 Building entity map from lexicon...');
  const entityMap = buildEntityMap();
  console.log(`   ${entityMap.size} entity forms loaded`);

  const sites = db.prepare(`
    SELECT id FROM indexed_sites WHERE status = 'active' ORDER BY id
  `).all();

  console.log(`   ${sites.length} active sites to scan`);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO entity_mentions
      (site_id, entry_id, mention_count, contexts, pantheon, tier)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const clearStmt = db.prepare('DELETE FROM entity_mentions WHERE site_id = ?');

  let totalMentions = 0;
  let processed = 0;

  for (let i = 0; i < sites.length; i += batchSize) {
    const batch = sites.slice(i, i + batchSize);
    console.log(`  Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sites.length / batchSize)} (${batch.length} sites)`);

    for (const site of batch) {
      const s = db.prepare(`
        SELECT id, title, description, h1, first_p, content_snippet
        FROM indexed_sites WHERE id = ?
      `).get(site.id);

      if (!s) continue;

      const text = [s.title, s.description, s.h1, s.first_p, s.content_snippet]
        .filter(Boolean).join('. ');

      const mentions = extractEntities(text, entityMap);

      if (mentions.length > 0) {
        db.transaction(() => {
          clearStmt.run(site.id);
          for (const m of mentions) {
            insert.run(site.id, m.entryId, m.count, JSON.stringify(m.contexts), m.pantheon, m.tier);
          }
        })();
        totalMentions += mentions.length;
      }
      processed++;
    }
  }

  console.log(`\n✅ Entity extraction complete:`);
  console.log(`   Sites scanned: ${processed}`);
  console.log(`   Total mentions: ${totalMentions}`);
  console.log(`   Unique entity-site pairs: ${db.prepare('SELECT COUNT(*) as c FROM entity_mentions').get().c}`);
  console.log(`   Coverage: ${db.prepare('SELECT COUNT(DISTINCT site_id) as c FROM entity_mentions').get().c} sites have entities`);

  return { processed, totalMentions };
}

module.exports = {
  buildEntityMap,
  extractEntities,
  processSite,
  processAllSites
};

if (require.main === module) {
  processAllSites(50);
  db.close();
  console.log('\nDone.');
}
