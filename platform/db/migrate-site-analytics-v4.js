/**
 * Migration: site analytics v4 — quarterly rollups + cross-temple indices
 *
 * Adds a `site_analytics_quarterly` rollup table for fast quarter-over-quarter
 * reporting and covering indices on `site_analytics_events` for cross-temple
 * session-flow queries. The migration backfills quarters from existing daily
 * rollups on first run.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNICODEX_TEST_DB_PATH || path.join(__dirname, 'punicodex.db');

const SITE_ANALYTICS_V4_SCHEMA = `
  -- Quarter-level rollups (temple_id '' = non-temple site pages)
  CREATE TABLE IF NOT EXISTS site_analytics_quarterly (
    year_quarter TEXT NOT NULL,
    temple_id TEXT NOT NULL DEFAULT '',
    human_views INTEGER NOT NULL DEFAULT 0,
    bot_views INTEGER NOT NULL DEFAULT 0,
    unique_sessions INTEGER NOT NULL DEFAULT 0,
    engagements INTEGER NOT NULL DEFAULT 0,
    total_visible_ms INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (year_quarter, temple_id)
  );

  CREATE INDEX IF NOT EXISTS idx_site_analytics_quarterly_temple
    ON site_analytics_quarterly(temple_id, year_quarter);

  -- Covering indices for cross-temple session-flow queries
  CREATE INDEX IF NOT EXISTS idx_site_analytics_events_session_created
    ON site_analytics_events(session_hash, created_at, temple_id, is_bot);

  CREATE INDEX IF NOT EXISTS idx_site_analytics_events_session_bot
    ON site_analytics_events(session_hash, is_bot, temple_id, created_at);
`;

function backfillQuarters(db) {
  // Aggregate daily view rollups into quarters.
  const viewRows = db
    .prepare(
      `
        SELECT
          (CAST(substr(day, 1, 4) AS INTEGER) || '-Q' || CAST((CAST(substr(day, 6, 2) AS INTEGER) + 2) / 3 AS INTEGER)) AS year_quarter,
          temple_id,
          SUM(human_views) AS human_views,
          SUM(bot_views) AS bot_views
        FROM site_analytics_daily
        GROUP BY year_quarter, temple_id
      `
    )
    .all();

  const upsert = db.prepare(
    `
      INSERT INTO site_analytics_quarterly
        (year_quarter, temple_id, human_views, bot_views, unique_sessions, engagements, total_visible_ms)
      VALUES (?, ?, ?, ?, 0, 0, 0)
      ON CONFLICT(year_quarter, temple_id) DO UPDATE SET
        human_views = excluded.human_views,
        bot_views = excluded.bot_views
    `
  );

  const updateEngagement = db.prepare(
    `
      UPDATE site_analytics_quarterly
      SET engagements = ?,
          total_visible_ms = ?
      WHERE year_quarter = ? AND temple_id = ?
    `
  );

  const updateUniques = db.prepare(
    `
      UPDATE site_analytics_quarterly
      SET unique_sessions = ?
      WHERE year_quarter = ? AND temple_id = ?
    `
  );

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      upsert.run(row.year_quarter, row.temple_id, row.human_views, row.bot_views);
    }
  });

  insertMany(viewRows);

  // Aggregate daily engagement rollups into quarters.
  const engagementRows = db
    .prepare(
      `
        SELECT
          (CAST(substr(day, 1, 4) AS INTEGER) || '-Q' || CAST((CAST(substr(day, 6, 2) AS INTEGER) + 2) / 3 AS INTEGER)) AS year_quarter,
          temple_id,
          SUM(engagements) AS engagements,
          SUM(total_visible_ms) AS total_visible_ms
        FROM site_analytics_engagement_daily
        GROUP BY year_quarter, temple_id
      `
    )
    .all();

  const updateEngMany = db.transaction((rows) => {
    for (const row of rows) {
      updateEngagement.run(
        row.engagements || 0,
        row.total_visible_ms || 0,
        row.year_quarter,
        row.temple_id
      );
    }
  });

  updateEngMany(engagementRows);

  // Unique sessions per quarter per temple from raw events.
  const uniqueRows = db
    .prepare(
      `
        SELECT
          (CAST(substr(CAST(created_at AS TEXT), 1, 4) AS INTEGER) || '-Q' || CAST((CAST(substr(CAST(created_at AS TEXT), 6, 2) AS INTEGER) + 2) / 3 AS INTEGER)) AS year_quarter,
          temple_id,
          COUNT(DISTINCT session_hash) AS unique_sessions
        FROM site_analytics_events
        WHERE is_bot = 0 AND session_hash <> ''
        GROUP BY year_quarter, temple_id
      `
    )
    .all();

  const updateUniqMany = db.transaction((rows) => {
    for (const row of rows) {
      updateUniques.run(row.unique_sessions || 0, row.year_quarter, row.temple_id);
    }
  });

  updateUniqMany(uniqueRows);
}

function migrate(db) {
  db.exec(SITE_ANALYTICS_V4_SCHEMA);
  backfillQuarters(db);
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
  console.log('Site analytics v4 migration complete.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = { migrate, runMigration, SITE_ANALYTICS_V4_SCHEMA, backfillQuarters };
