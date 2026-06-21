/**
 * Oracle Context Assembler
 *
 * Gathers the full PUNYCODEX knowledge graph around a single entry:
 * - entry core fields
 * - lore from lore-catalog.json
 * - character breakdowns
 * - variants
 * - original script / provenance
 * - availability / registrar links
 * - live site metadata
 */
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
const { getDbPath } = require('../db/db');
const { getOriginalScript } = require('../../type/js/original-scripts');

let db;
let loreCatalog = null;

function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function loadLoreCatalog() {
  if (loreCatalog) return loreCatalog;
  try {
    const catalogPath = path.join(__dirname, '..', '..', 'scripts', 'lore-catalog.json');
    const raw = fs.readFileSync(catalogPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      loreCatalog = new Map(parsed.map((item) => [item.id, item]));
    } else {
      loreCatalog = new Map(Object.entries(parsed).map(([id, item]) => [id, item]));
    }
  } catch (_e) {
    loreCatalog = new Map();
  }
  return loreCatalog;
}

function safeJsonParse(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (_e) {
    return null;
  }
}

function getEntryContext(entryId) {
  const database = getDb();

  const entry = database.prepare('SELECT * FROM entries WHERE id = ?').get(entryId);
  if (!entry) return null;

  const lore = loadLoreCatalog().get(entryId) || null;
  const breakdown = database.prepare('SELECT * FROM breakdowns WHERE entry_id = ?').all(entryId);
  const variants = safeJsonParse(entry.variants) || [];
  const etymology = safeJsonParse(entry.etymology);
  const sources = safeJsonParse(entry.sources) || [];
  const originalScript = getOriginalScript(entry);

  const site = database
    .prepare("SELECT * FROM indexed_sites WHERE lexicon_entry_id = ? AND status = 'active'")
    .get(entryId);

  const availability = database
    .prepare('SELECT * FROM availability WHERE entry_id = ?')
    .get(entryId);

  return {
    id: entry.id,
    ascii: entry.ascii,
    unicode: entry.unicode,
    greek: entry.greek,
    pantheon: entry.pantheon,
    tier: entry.tier,
    tierLabel: entry.tier_label,
    domain: entry.domain,
    meaning: entry.meaning,
    sources,
    etymology,
    variants,
    originalScript,
    breakdown,
    lore,
    site: site
      ? {
          domain: site.domain,
          punycode: site.punycode,
          title: site.title,
          description: site.description,
          tenantName: site.tenant_name,
          tenantCategory: site.tenant_category,
          tenantFrontUrl: site.tenant_front_url,
        }
      : null,
    availability: availability
      ? {
          status: availability.status,
          lastChecked: availability.last_checked,
          registrarLinks: safeJsonParse(availability.registrar_links) || {},
        }
      : null,
  };
}

module.exports = { getEntryContext, loadLoreCatalog };
