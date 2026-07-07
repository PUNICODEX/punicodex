/**
 * Test helpers for resolving ad slot IDs from the isolated test database.
 *
 * These helpers avoid hardcoded slot IDs so tests stay valid whenever the
 * booking layout is reseeded.
 */

const Database = require('better-sqlite3');
const { getTestDbPath } = require('./test-db.js');

function getDb(suiteName) {
  return new Database(getTestDbPath(suiteName));
}

/**
 * Return the ad slot id for a given site + sort_order.
 */
function getSlotId(suiteName, siteSlug, sortOrder) {
  const db = getDb(suiteName);
  try {
    const row = db
      .prepare('SELECT id FROM ad_slots WHERE site_slug = ? AND sort_order = ?')
      .get(siteSlug, sortOrder);
    if (!row) {
      throw new Error(`No slot found for ${siteSlug} sort_order=${sortOrder}`);
    }
    return row.id;
  } finally {
    db.close();
  }
}

/**
 * Return the Full Page Takeover bundle slot id for a site.
 */
function getBundleSlotId(suiteName, siteSlug) {
  const db = getDb(suiteName);
  try {
    const row = db
      .prepare('SELECT id FROM ad_slots WHERE site_slug = ? AND is_bundle = 1')
      .get(siteSlug);
    if (!row) {
      throw new Error(`No bundle slot found for ${siteSlug}`);
    }
    return row.id;
  } finally {
    db.close();
  }
}

/**
 * Return the slug for a given site + sort_order.
 */
function getSlotSlug(suiteName, siteSlug, sortOrder) {
  const db = getDb(suiteName);
  try {
    const row = db
      .prepare('SELECT slug FROM ad_slots WHERE site_slug = ? AND sort_order = ?')
      .get(siteSlug, sortOrder);
    if (!row) {
      throw new Error(`No slot found for ${siteSlug} sort_order=${sortOrder}`);
    }
    return row.slug;
  } finally {
    db.close();
  }
}

/**
 * Return all individual (non-bundle) slot ids for a site, ordered by sort_order.
 */
function getIndividualSlotIds(suiteName, siteSlug) {
  const db = getDb(suiteName);
  try {
    return db
      .prepare('SELECT id FROM ad_slots WHERE site_slug = ? AND is_bundle = 0 ORDER BY sort_order')
      .all(siteSlug)
      .map((r) => r.id);
  } finally {
    db.close();
  }
}

module.exports = {
  getSlotId,
  getSlotSlug,
  getBundleSlotId,
  getIndividualSlotIds,
};
