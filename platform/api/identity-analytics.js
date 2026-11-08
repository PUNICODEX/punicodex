const { all, get, isPostgres } = require('../db/operational');

const EVENT_NAMES = [
  'identity_register',
  'identity_login',
  'identity_logout',
  'identity_activate',
  'identity_reset',
  'institution_invitation_created',
  'institution_invitation_accepted',
  'institution_policy_updated',
  'initiation_progress',
  'store_order_paid',
  'account_status_changed',
];

async function ensureSchema() {
  if (isPostgres()) {
    await require('../db/ensure-analytics-v5').ensureAnalyticsV5Pg();
  } else {
    await require('../db/migrate-site-analytics-v5').runMigration();
  }
}

function clampDays(days) {
  return Math.min(120, Math.max(1, Number(days) || 30));
}

async function getIdentityAnalytics({ days = 30 } = {}) {
  await ensureSchema();
  const periodDays = clampDays(days);
  const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
  const placeholders = EVENT_NAMES.map((_, index) => `$${index + 2}`).join(',');
  const [accountRows, linkRows, eventRows, dailyRows, invitationRows, initiationRow, orderRow] =
    await Promise.all([
      all('SELECT status, COUNT(*) AS count FROM accounts GROUP BY status'),
      all('SELECT system, COUNT(*) AS count FROM identity_links GROUP BY system'),
      all(
        `SELECT event_name, COUNT(*) AS count FROM site_analytics_events_v2
          WHERE created_at >= $1 AND is_bot = 0 AND event_name IN (${placeholders})
          GROUP BY event_name`,
        [cutoff, ...EVENT_NAMES]
      ),
      all(
        `SELECT date(created_at) AS day, event_name, COUNT(*) AS count
           FROM site_analytics_events_v2
          WHERE created_at >= $1 AND is_bot = 0 AND event_name IN (${placeholders})
          GROUP BY day, event_name ORDER BY day ASC`,
        [cutoff, ...EVENT_NAMES]
      ),
      all('SELECT status, COUNT(*) AS count FROM account_invitations GROUP BY status'),
      get(
        `SELECT COUNT(*) AS started,
                COALESCE(SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS completed
           FROM account_initiation`
      ),
      get(
        `SELECT COUNT(*) AS orders, COALESCE(SUM(gross_cents), 0) AS gross_cents
           FROM store_orders WHERE created_at >= $1 AND status NOT IN ('pending_payment', 'cancelled', 'refunded')`,
        [cutoff]
      ),
    ]);

  const byStatus = Object.fromEntries(accountRows.map((row) => [row.status, Number(row.count)]));
  const bySystem = Object.fromEntries(linkRows.map((row) => [row.system, Number(row.count)]));
  const byEvent = Object.fromEntries(eventRows.map((row) => [row.event_name, Number(row.count)]));
  const byInvitation = Object.fromEntries(
    invitationRows.map((row) => [row.status, Number(row.count)])
  );
  const byDay = new Map();
  for (const row of dailyRows) {
    if (!byDay.has(row.day)) byDay.set(row.day, { day: row.day, events: {} });
    byDay.get(row.day).events[row.event_name] = Number(row.count);
  }

  return {
    periodDays,
    generatedAt: new Date().toISOString(),
    accounts: {
      total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
      byStatus,
      linked: bySystem,
    },
    events: {
      byName: byEvent,
      total: Object.values(byEvent).reduce((sum, count) => sum + count, 0),
      daily: [...byDay.values()],
    },
    invitations: {
      byStatus: byInvitation,
      acceptanceRate:
        (byInvitation.accepted || 0) + (byInvitation.revoked || 0) + (byInvitation.pending || 0) > 0
          ? (byInvitation.accepted || 0) /
            ((byInvitation.accepted || 0) +
              (byInvitation.revoked || 0) +
              (byInvitation.pending || 0))
          : null,
    },
    initiation: {
      started: Number(initiationRow?.started || 0),
      completed: Number(initiationRow?.completed || 0),
      completionRate: Number(initiationRow?.started || 0)
        ? Number(initiationRow?.completed || 0) / Number(initiationRow.started)
        : null,
    },
    orders: {
      count: Number(orderRow?.orders || 0),
      grossCents: Number(orderRow?.gross_cents || 0),
    },
  };
}

module.exports = { getIdentityAnalytics, EVENT_NAMES };
