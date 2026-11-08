const crypto = require('node:crypto');
const { normalizeEvent } = require('./analytics-events');
const { getClientIp } = require('./client-ip');

const SAFE_PROPERTIES = new Set([
  'chapter',
  'totalChapters',
  'completed',
  'role',
  'count',
  'capability',
  'effect',
  'status',
  'orderRef',
  'productId',
  'grossCents',
  'reason',
]);

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

/**
 * Record a server-verified product event without retaining a raw account id,
 * email, password-reset token, invitation token, or browser session token.
 * The session hash rotates daily, matching the public beacon's privacy model.
 */
async function recordProductEvent(
  name,
  { accountId = null, path = '/account/', req = null, properties = {} } = {}
) {
  try {
    const { writeEventV2 } = require('../api-handlers/analytics/collect');
    const day = new Date().toISOString().slice(0, 10);
    const safe = {};
    for (const [key, value] of Object.entries(properties || {})) {
      if (SAFE_PROPERTIES.has(key) && ['string', 'number', 'boolean'].includes(typeof value)) {
        safe[key] = value;
      }
    }
    const normalized = normalizeEvent({
      event_name: name,
      event_version: 1,
      path,
      page_type: 'account',
      session_hash: sha256(`${accountId || 'anonymous'}:${day}`).slice(0, 24),
      properties: safe,
      created_at: new Date().toISOString(),
    });
    if (normalized.error) throw new Error(normalized.error);
    const { isPostgres } = require('../db/operational');
    if (isPostgres()) {
      await require('../db/ensure-analytics-v5').ensureAnalyticsV5Pg();
    } else {
      await require('../db/migrate-site-analytics-v5').runMigration();
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await writeEventV2(normalized, {
          ip: req ? getClientIp(req) : 'server-side',
          userAgent: req?.headers?.['user-agent'] || 'server-side',
          device: 'server',
        });
        break;
      } catch (err) {
        if (!/locked|busy/i.test(err.message) || attempt === 4) throw err;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250 * (attempt + 1));
      }
    }
  } catch (err) {
    if (process.env.DEBUG_PRODUCT_ANALYTICS) console.error(err.stack);
    console.error(`[product-analytics] ${name} failed:`, err.message);
  }
}

module.exports = { recordProductEvent, SAFE_PROPERTIES };
