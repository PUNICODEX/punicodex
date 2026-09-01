/**
 * Migration: site analytics v5 — event_v2 pipeline
 *
 * Creates the new event_v2 storage layer:
 *   - site_analytics_events_v2   (normalized event stream)
 *   - site_analytics_sessions    (session-level aggregates)
 *   - site_analytics_hourly      (hourly rollups)
 *   - site_analytics_funnels     (funnel step counters)
 *
 * Backfills the event stream and sessions from the legacy
 * site_analytics_events and site_analytics_engagement tables when the v2
 * tables are empty, making the migration idempotent on re-runs.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNICODEX_TEST_DB_PATH || path.join(__dirname, 'punicodex.db');

const SITE_ANALYTICS_V5_SCHEMA = `
  -- Normalized event stream (v2 pipeline)
  CREATE TABLE IF NOT EXISTS site_analytics_events_v2 (
    id INTEGER PRIMARY KEY,
    event_name TEXT NOT NULL,
    event_version INTEGER DEFAULT 1,
    path TEXT,
    page_type TEXT,
    temple_id TEXT,
    session_hash TEXT NOT NULL,
    ip_hash TEXT,
    ua_hash TEXT,
    ua_class TEXT,
    device TEXT,
    referrer TEXT,
    referrer_domain TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    country TEXT,
    properties TEXT,
    is_bot INTEGER DEFAULT 0,
    quality_score REAL,
    quality_flags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_events_v2_created
    ON site_analytics_events_v2(created_at);
  CREATE INDEX IF NOT EXISTS idx_events_v2_name_created
    ON site_analytics_events_v2(event_name, created_at);
  CREATE INDEX IF NOT EXISTS idx_events_v2_session
    ON site_analytics_events_v2(session_hash, created_at);
  CREATE INDEX IF NOT EXISTS idx_events_v2_temple
    ON site_analytics_events_v2(temple_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_events_v2_page_type
    ON site_analytics_events_v2(page_type, created_at);
  CREATE INDEX IF NOT EXISTS idx_events_v2_referrer_domain
    ON site_analytics_events_v2(referrer_domain, created_at);

  -- Session-level aggregates
  CREATE TABLE IF NOT EXISTS site_analytics_sessions (
    session_hash TEXT PRIMARY KEY,
    first_seen_at DATETIME,
    last_seen_at DATETIME,
    entry_path TEXT,
    entry_temple_id TEXT,
    device TEXT,
    country TEXT,
    referrer_domain TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    event_count INTEGER DEFAULT 0,
    is_bot INTEGER DEFAULT 0,
    quality_score REAL,
    quality_flags TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_first_seen
    ON site_analytics_sessions(first_seen_at);
  CREATE INDEX IF NOT EXISTS idx_sessions_entry_temple
    ON site_analytics_sessions(entry_temple_id);

  -- Hourly rollups
  CREATE TABLE IF NOT EXISTS site_analytics_hourly (
    hour TEXT NOT NULL,
    event_name TEXT NOT NULL,
    page_type TEXT,
    temple_id TEXT,
    referrer_domain TEXT,
    device TEXT,
    country TEXT,
    count INTEGER DEFAULT 0,
    unique_sessions INTEGER DEFAULT 0,
    PRIMARY KEY (hour, event_name, page_type, temple_id, referrer_domain, device, country)
  );

  CREATE INDEX IF NOT EXISTS idx_hourly_name_hour
    ON site_analytics_hourly(event_name, hour);
  CREATE INDEX IF NOT EXISTS idx_hourly_temple_hour
    ON site_analytics_hourly(temple_id, hour);

  -- Funnel step counters
  CREATE TABLE IF NOT EXISTS site_analytics_funnels (
    funnel_id TEXT NOT NULL,
    step_index INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    day TEXT NOT NULL,
    temple_id TEXT,
    count INTEGER DEFAULT 0,
    UNIQUE (funnel_id, step_index, day, temple_id)
  );

  CREATE INDEX IF NOT EXISTS idx_funnels_id_day
    ON site_analytics_funnels(funnel_id, day);
  CREATE INDEX IF NOT EXISTS idx_funnels_temple_day
    ON site_analytics_funnels(temple_id, day);
`;

const TEMPLE_IDS = (() => {
  try {
    const { LEXICON } = require('../../type/js/lexicon.js');
    return new Set((LEXICON || []).map((entry) => entry.id));
  } catch {
    return new Set();
  }
})();

function extractTempleId(value) {
  if (typeof value !== 'string') return '';
  const sitesMatch = value.match(/^\/sites\/([a-z0-9-]{1,64})(\/|$)/);
  if (sitesMatch) return sitesMatch[1];
  const canonicalMatch = value.match(/^\/([a-z0-9-]{1,64})(\/|$)/);
  if (canonicalMatch && TEMPLE_IDS.has(canonicalMatch[1])) return canonicalMatch[1];
  return '';
}

function getPageType(value) {
  if (typeof value !== 'string') return 'static';
  const path = value.split('?')[0].split('#')[0];
  if (path.startsWith('/admin') || path.startsWith('/scholars/admin')) return 'admin';
  if (path.startsWith('/account')) return 'account';
  if (path.startsWith('/store')) return 'store';
  if (path.startsWith('/search')) return 'search';

  const subPage = path.match(/^\/sites\/[a-z0-9-]{1,64}\/([a-z0-9-]+)\//);
  if (subPage) {
    const type = subPage[1];
    if (type === 'blog') return 'blog';
    if (type === 'patterns') return 'patterns';
    if (type === 'lore') return 'lore';
    if (type === 'scholars') return 'scholars';
    if (type === 'store') return 'store';
    return 'temple';
  }

  const canonicalSub = path.match(/^\/[a-z0-9-]{1,64}\/([a-z0-9-]+)\//);
  if (canonicalSub) {
    const type = canonicalSub[1];
    if (type === 'blog') return 'blog';
    if (type === 'patterns') return 'patterns';
    if (type === 'lore') return 'lore';
    if (type === 'scholars') return 'scholars';
    if (type === 'store') return 'store';
  }

  if (extractTempleId(path)) return 'temple';
  return 'static';
}

function extractReferrerDomain(referrer) {
  if (!referrer || typeof referrer !== 'string') return '';
  try {
    return new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function backfillEventsV2(db) {
  const countRow = db.prepare('SELECT COUNT(*) AS n FROM site_analytics_events_v2').get();
  if (countRow && countRow.n > 0) return;

  const insert = db.prepare(
    `
      INSERT INTO site_analytics_events_v2
        (event_name, event_version, path, page_type, temple_id, session_hash, ip_hash,
         ua_hash, ua_class, device, referrer, referrer_domain, country, properties,
         is_bot, quality_score, quality_flags, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  );

  const hasEvents = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='site_analytics_events'")
    .get();
  const hasEngagement = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='site_analytics_engagement'"
    )
    .get();

  const rows = [];

  if (hasEvents) {
    const events = db
      .prepare(
        `
          SELECT path, temple_id, session_hash, ip_hash, ua_hash, bot_category, device,
                 referrer, country, is_bot, created_at
          FROM site_analytics_events
        `
      )
      .all();
    for (const e of events) {
      const path = typeof e.path === 'string' ? e.path : '';
      rows.push([
        'page_view',
        1,
        path,
        getPageType(path),
        e.temple_id || extractTempleId(path),
        e.session_hash || '',
        e.ip_hash || null,
        e.ua_hash || null,
        e.bot_category || null,
        e.device || null,
        e.referrer || null,
        e.is_bot ? '' : extractReferrerDomain(e.referrer),
        e.country || null,
        null,
        e.is_bot ? 1 : 0,
        e.is_bot ? 0.0 : 1.0,
        null,
        e.created_at,
      ]);
    }
  }

  if (hasEngagement) {
    const engagements = db
      .prepare(
        `
          SELECT path, temple_id, session_hash, visible_ms, scroll_pct, device, created_at
          FROM site_analytics_engagement
        `
      )
      .all();
    for (const e of engagements) {
      const path = typeof e.path === 'string' ? e.path : '';
      rows.push([
        'engagement',
        1,
        path,
        getPageType(path),
        e.temple_id || extractTempleId(path),
        e.session_hash || '',
        null,
        null,
        null,
        e.device || null,
        null,
        null,
        null,
        JSON.stringify({ visible_ms: e.visible_ms || 0, scroll_pct: e.scroll_pct || 0 }),
        0,
        1.0,
        null,
        e.created_at,
      ]);
    }
  }

  const insertMany = db.transaction((items) => {
    for (const item of items) insert.run(...item);
  });
  insertMany(rows);
}

function backfillSessions(db) {
  const countRow = db.prepare('SELECT COUNT(*) AS n FROM site_analytics_sessions').get();
  if (countRow && countRow.n > 0) return;

  const events = db
    .prepare(
      `
        SELECT
          session_hash,
          MIN(created_at) AS first_seen_at,
          MAX(created_at) AS last_seen_at,
          MAX(CASE WHEN rn = 1 THEN path END) AS path,
          MAX(CASE WHEN rn = 1 THEN page_type END) AS page_type,
          MAX(CASE WHEN rn = 1 THEN temple_id END) AS temple_id,
          MAX(CASE WHEN rn = 1 THEN device END) AS device,
          MAX(CASE WHEN rn = 1 THEN country END) AS country,
          MAX(CASE WHEN rn = 1 THEN referrer_domain END) AS referrer_domain,
          MAX(CASE WHEN rn = 1 THEN utm_source END) AS utm_source,
          MAX(CASE WHEN rn = 1 THEN utm_medium END) AS utm_medium,
          MAX(CASE WHEN rn = 1 THEN utm_campaign END) AS utm_campaign,
          SUM(CASE WHEN is_bot = 0 THEN 1.0 ELSE 0.0 END) / COUNT(*) AS quality_score,
          MAX(is_bot) AS is_bot,
          COUNT(*) AS event_count
        FROM (
          SELECT *,
                 ROW_NUMBER() OVER (PARTITION BY session_hash ORDER BY created_at ASC, id ASC) AS rn
          FROM site_analytics_events_v2
          WHERE session_hash <> ''
        )
        GROUP BY session_hash
      `
    )
    .all();

  const insert = db.prepare(
    `
      INSERT INTO site_analytics_sessions
        (session_hash, first_seen_at, last_seen_at, entry_path, entry_temple_id, device,
         country, referrer_domain, utm_source, utm_medium, utm_campaign, event_count,
         is_bot, quality_score, quality_flags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_hash) DO UPDATE SET
        first_seen_at = excluded.first_seen_at,
        last_seen_at = excluded.last_seen_at,
        event_count = excluded.event_count,
        is_bot = excluded.is_bot,
        quality_score = excluded.quality_score,
        quality_flags = excluded.quality_flags
    `
  );

  const insertMany = db.transaction((items) => {
    for (const e of items) {
      insert.run(
        e.session_hash,
        e.first_seen_at,
        e.last_seen_at,
        e.path,
        e.temple_id,
        e.device,
        e.country,
        e.referrer_domain,
        e.utm_source,
        e.utm_medium,
        e.utm_campaign,
        e.event_count || 0,
        e.is_bot ? 1 : 0,
        e.quality_score,
        null
      );
    }
  });
  insertMany(events);
}

function backfillHourly(db) {
  const countRow = db.prepare('SELECT COUNT(*) AS n FROM site_analytics_hourly').get();
  if (countRow && countRow.n > 0) return;

  const rows = db
    .prepare(
      `
        SELECT
          substr(CAST(created_at AS TEXT), 1, 13) AS hour,
          event_name,
          page_type,
          temple_id,
          referrer_domain,
          device,
          country,
          COUNT(*) AS count,
          COUNT(DISTINCT session_hash) AS unique_sessions
        FROM site_analytics_events_v2
        GROUP BY hour, event_name, page_type, temple_id, referrer_domain, device, country
      `
    )
    .all();

  const insert = db.prepare(
    `
      INSERT INTO site_analytics_hourly
        (hour, event_name, page_type, temple_id, referrer_domain, device, country,
         count, unique_sessions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(hour, event_name, page_type, temple_id, referrer_domain, device, country)
      DO UPDATE SET
        count = excluded.count,
        unique_sessions = excluded.unique_sessions
    `
  );

  const insertMany = db.transaction((items) => {
    for (const r of items) {
      insert.run(
        r.hour,
        r.event_name,
        r.page_type || null,
        r.temple_id || null,
        r.referrer_domain || null,
        r.device || null,
        r.country || null,
        r.count || 0,
        r.unique_sessions || 0
      );
    }
  });
  insertMany(rows);
}

function ensureColumn(db, table, column, definition) {
  const columns = db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((c) => c.name);
  if (!columns.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function migrate(db) {
  db.exec(SITE_ANALYTICS_V5_SCHEMA);
  // Idempotent column additions for databases created before these fields
  // were added to the v5 schema.
  ensureColumn(db, 'site_analytics_events_v2', 'quality_flags', 'TEXT');
  ensureColumn(db, 'site_analytics_sessions', 'quality_flags', 'TEXT');
  backfillEventsV2(db);
  backfillSessions(db);
  backfillHourly(db);
}

function runMigration() {
  const { getDb } = require('./connection');
  migrate(getDb());
}

function runStandalone() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  db.close();
  console.log('Site analytics v5 migration complete.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = {
  migrate,
  runMigration,
  SITE_ANALYTICS_V5_SCHEMA,
  backfillEventsV2,
  backfillSessions,
  backfillHourly,
};
