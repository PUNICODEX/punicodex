/**
 * Lore Curator Agent — identifies entries missing lore/variants/original script.
 */
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');

let db;
function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function log(agent, action, target, result) {
  try {
    getDb()
      .prepare('INSERT INTO agent_activity_log (agent, action, target, result) VALUES (?, ?, ?, ?)')
      .run(agent, action, target || null, JSON.stringify(result || {}));
  } catch (_e) {}
}

function loadLoreCatalog() {
  try {
    return require('../browser/renderer/lore-catalog.json');
  } catch (_e) {
    return {};
  }
}

function findGaps() {
  const db = getDb();
  const catalog = loadLoreCatalog();
  const entries = db
    .prepare('SELECT id, unicode, pantheon, tier, greek, original_script, variants FROM entries')
    .all();
  const gaps = [];

  for (const entry of entries) {
    const issues = [];
    if (!catalog[entry.id]) issues.push('missing_lore');
    if (!entry.greek && !entry.original_script) issues.push('missing_original_script');
    if (!entry.variants) issues.push('missing_variants');
    if (issues.length > 0) {
      gaps.push({ entryId: entry.id, unicode: entry.unicode, pantheon: entry.pantheon, issues });
    }
  }

  log('lore-curator', 'audit', null, { gapsFound: gaps.length });
  return gaps.slice(0, 100);
}

function suggestSources(gap) {
  const suggestions = [];
  if (gap.issues.includes('missing_lore')) {
    suggestions.push('Check LSJ, Beekes, or Brill Encyclopedia for a summary.');
  }
  if (gap.issues.includes('missing_original_script')) {
    suggestions.push(
      'Verify the original script against Unicode code charts or scholarly editions.'
    );
  }
  if (gap.issues.includes('missing_variants')) {
    suggestions.push('List attested stress and macron variants with source citations.');
  }
  return suggestions;
}

module.exports = { findGaps, suggestSources };
