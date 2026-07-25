/**
 * PuniCodex — Traffic-spike admin alerts.
 *
 * Daily cron: a temple (or the whole site) is spiking when yesterday's human
 * views exceed 3× the trailing 7-day average (the seven days BEFORE
 * yesterday) and clear an absolute floor of 20 views — the ratio alone
 * fires on noise, the floor alone misses surges on quiet temples. Each spike
 * emails the admin inbox at most once per temple per day (digest_log
 * kind='spike', target=templeId|'site', detail=yesterday's date), so a
 * re-run on the same day stays silent.
 */

const { all, isPostgres } = require('../db/operational');
const { getDb } = require('../db/connection');
const { migrate: migrateDigest } = require('../db/migrate-digest');
const { runMigration: runAnalyticsMigration } = require('../db/migrate-site-analytics');
const { runMigration: runAnalyticsMigrationV2 } = require('../db/migrate-site-analytics-v2');
const { runMigration: runAnalyticsMigrationV3 } = require('../db/migrate-site-analytics-v3');
const { sendAdminAlert, hasDigestEntry, recordDigestEntry } = require('./digest-service');
const { escapeHtml, getSiteDisplayName } = require('./email');

const SPIKE_RATIO = 3;
const SPIKE_MIN_VIEWS = 20;
const SITE_TARGET = 'site';

let schemaReady = false;
function ensureSchema() {
  if (schemaReady) return;
  migrateDigest(getDb());
  // The daily rollups live in the site-analytics tables; create them on
  // ephemeral SQLite deployments (Vercel /tmp) before reading.
  if (!isPostgres()) {
    runAnalyticsMigration();
    runAnalyticsMigrationV2();
    runAnalyticsMigrationV3();
  }
  schemaReady = true;
}

function dayString(date) {
  return date.toISOString().slice(0, 10);
}

function spikeEmail({ templeLabel, yesterday, views, average }) {
  const ratio = average > 0 ? (views / average).toFixed(1) : '∞';
  return {
    subject: `Traffic spike — ${templeLabel} (${views} views on ${yesterday})`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">PuniCodex — Traffic Spike</h2>
        <p>Automated daily check: views for <strong>${escapeHtml(templeLabel)}</strong> on ${escapeHtml(yesterday)} exceeded ${SPIKE_RATIO}× the trailing 7-day average.</p>
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;margin:1rem 0;">
          <tr><td style="padding:6px;color:#666;">Scope</td><td style="padding:6px;text-align:right;font-weight:600;">${escapeHtml(templeLabel)}</td></tr>
          <tr><td style="padding:6px;color:#666;">Views (${escapeHtml(yesterday)})</td><td style="padding:6px;text-align:right;font-weight:600;">${escapeHtml(views.toLocaleString())}</td></tr>
          <tr><td style="padding:6px;color:#666;">Trailing 7-day average</td><td style="padding:6px;text-align:right;font-weight:600;">${escapeHtml(average.toFixed(1))}</td></tr>
          <tr><td style="padding:6px;color:#666;">Ratio</td><td style="padding:6px;text-align:right;font-weight:600;">${escapeHtml(ratio)}×</td></tr>
        </table>
        <p style="color:#666;font-size:0.85rem;">Sent once per scope per day. No action is required unless this looks anomalous.</p>
      </div>
    `,
  };
}

/**
 * Check yesterday's views against the trailing 7-day average for every
 * temple and for the site as a whole. Returns
 * { checked, spiked, sent, skipped, failed }.
 */
async function runSpikeCheck({ now } = {}) {
  ensureSchema();
  const nowDate = now ? new Date(now) : new Date();
  const yesterday = dayString(new Date(nowDate.getTime() - 86400000));
  const windowStart = dayString(new Date(nowDate.getTime() - 8 * 86400000));

  const rows = await all(
    `SELECT temple_id, day, SUM(human_views) AS views
       FROM site_analytics_daily
      WHERE day >= $1 AND day <= $2
      GROUP BY temple_id, day`,
    [windowStart, yesterday]
  );

  const templeViews = new Map(); // templeId -> Map(day -> views)
  const siteViews = new Map(); // day -> views (all temples + untagged)
  for (const row of rows) {
    const views = Number(row.views) || 0;
    siteViews.set(row.day, (siteViews.get(row.day) || 0) + views);
    if (row.temple_id === '') continue;
    if (!templeViews.has(row.temple_id)) templeViews.set(row.temple_id, new Map());
    templeViews.get(row.temple_id).set(row.day, views);
  }

  function trailingAverage(dayMap) {
    let total = 0;
    for (let i = 2; i <= 8; i++) {
      total += dayMap.get(dayString(new Date(nowDate.getTime() - i * 86400000))) || 0;
    }
    return total / 7;
  }

  const result = { checked: 0, spiked: 0, sent: 0, skipped: 0, failed: 0 };
  const candidates = [...templeViews.keys(), SITE_TARGET];

  for (const target of candidates) {
    result.checked++;
    try {
      const dayMap = target === SITE_TARGET ? siteViews : templeViews.get(target);
      const views = dayMap.get(yesterday) || 0;
      const average = trailingAverage(dayMap);
      if (!(views > SPIKE_RATIO * average && views > SPIKE_MIN_VIEWS)) continue;
      result.spiked++;
      if (await hasDigestEntry('spike', target, yesterday)) {
        result.skipped++;
        continue;
      }
      const templeLabel = target === SITE_TARGET ? 'Entire site' : getSiteDisplayName(target);
      const { subject, html } = spikeEmail({ templeLabel, yesterday, views, average });
      await sendAdminAlert({ kind: 'spike', subject, html });
      await recordDigestEntry('spike', target, yesterday, nowDate.toISOString());
      result.sent++;
    } catch (err) {
      console.error(`[alerts] spike check failed for ${target}:`, err.message);
      result.failed++;
    }
  }

  return result;
}

module.exports = { runSpikeCheck, SPIKE_RATIO, SPIKE_MIN_VIEWS };
