/**
 * Migration: site analytics v5 — Postgres schema for the event_v2 pipeline.
 *
 * Mirrors the SQLite schema in migrate-site-analytics-v5.js so the deep
 * analytics engines (funnels, cohorts, LTV, realtime) work in production
 * Postgres. Backfill is skipped — legacy SQLite data is not present in
 * Postgres; new events are recorded directly into the v2 tables.
 *
 * Idempotent: safe to run on every cold start.
 */

const { run, isPostgres } = require('./operational');

async function runMigration() {
  if (!isPostgres()) return;

  const statements = [
    `CREATE TABLE IF NOT EXISTS site_analytics_events_v2 (
      id BIGSERIAL PRIMARY KEY,
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
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_events_v2_created
      ON site_analytics_events_v2(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_events_v2_name_created
      ON site_analytics_events_v2(event_name, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_events_v2_session
      ON site_analytics_events_v2(session_hash, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_events_v2_temple
      ON site_analytics_events_v2(temple_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_events_v2_page_type
      ON site_analytics_events_v2(page_type, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_events_v2_referrer_domain
      ON site_analytics_events_v2(referrer_domain, created_at)`,

    `CREATE TABLE IF NOT EXISTS site_analytics_sessions (
      session_hash TEXT PRIMARY KEY,
      first_seen_at TIMESTAMPTZ,
      last_seen_at TIMESTAMPTZ,
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
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_first_seen
      ON site_analytics_sessions(first_seen_at)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_entry_temple
      ON site_analytics_sessions(entry_temple_id)`,

    `CREATE TABLE IF NOT EXISTS site_analytics_hourly (
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
    )`,
    `CREATE INDEX IF NOT EXISTS idx_hourly_name_hour
      ON site_analytics_hourly(event_name, hour)`,
    `CREATE INDEX IF NOT EXISTS idx_hourly_temple_hour
      ON site_analytics_hourly(temple_id, hour)`,

    `CREATE TABLE IF NOT EXISTS site_analytics_funnels (
      funnel_id TEXT NOT NULL,
      step_index INTEGER NOT NULL,
      step_name TEXT NOT NULL,
      day TEXT NOT NULL,
      temple_id TEXT,
      count INTEGER DEFAULT 0,
      UNIQUE (funnel_id, step_index, day, temple_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_funnels_id_day
      ON site_analytics_funnels(funnel_id, day)`,
    `CREATE INDEX IF NOT EXISTS idx_funnels_temple_day
      ON site_analytics_funnels(temple_id, day)`,

    `CREATE TABLE IF NOT EXISTS site_analytics_cohorts (
      cohort_date TEXT NOT NULL,
      day_index INTEGER NOT NULL,
      temple_id TEXT,
      size INTEGER DEFAULT 0,
      count INTEGER DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (cohort_date, day_index, temple_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_cohorts_date_temple
      ON site_analytics_cohorts(cohort_date, temple_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cohorts_day_index
      ON site_analytics_cohorts(day_index)`,

    `CREATE TABLE IF NOT EXISTS site_analytics_ltv_rollups (
      id BIGSERIAL PRIMARY KEY,
      day TEXT NOT NULL UNIQUE,
      total_revenue REAL DEFAULT 0,
      transactions INTEGER DEFAULT 0,
      unique_paying_sessions INTEGER DEFAULT 0,
      unique_sessions INTEGER DEFAULT 0,
      arpu REAL DEFAULT 0,
      arppu REAL DEFAULT 0,
      by_product_line TEXT,
      by_cohort TEXT,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_ltv_rollups_day
      ON site_analytics_ltv_rollups(day)`,

    `CREATE TABLE IF NOT EXISTS analytics_retention_config (
      id BIGSERIAL PRIMARY KEY,
      events_days INTEGER DEFAULT 120,
      sessions_days INTEGER DEFAULT 365,
      rollups_days INTEGER DEFAULT 90,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const sql of statements) {
    await run(sql);
  }
}

module.exports = { runMigration };
