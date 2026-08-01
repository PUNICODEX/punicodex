const {
  enqueueEvent,
  processPendingEvents,
} = require('../../../platform/api/event-crawler-service');
const { handleError, setCors, requireAdmin } = require('../../_utils');
const { checkPublicRateLimitByReq } = require('../../../platform/api/public-rate-limiter');

// Priority is caller-influenceable queue ordering (ASC = sooner). Clamp it to
// a small integer range so a public caller cannot starve or jump the queue.
const PRIORITY_MIN = 1;
const PRIORITY_MAX = 10;
const PRIORITY_DEFAULT = 5;

// crawl_events enforces CHECK constraints on source and event_type
// (platform/db/migrate-event-crawler.js). Validate against the same enums
// before enqueueing so out-of-enum strings get a 400 instead of crashing the
// INSERT with a 500.
const SOURCE_ENUM = ['webhook', 'ct_log', 'dns_change', 'manual', 'scheduled'];
const EVENT_TYPE_ENUM = ['discover', 'update', 'recrawl', 'spam_report'];

function isNonEmptyString(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function clampPriority(raw) {
  if (raw == null) return { priority: PRIORITY_DEFAULT };
  const value = Number(raw);
  if (!Number.isFinite(value)) return { error: 'priority must be a number' };
  const rounded = Math.round(value);
  return { priority: Math.min(PRIORITY_MAX, Math.max(PRIORITY_MIN, rounded)) };
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Public webhook for external domain-change notifications
    if (req.method === 'POST') {
      if (!(await checkPublicRateLimitByReq(req, res, 'crawl-events'))) return;

      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ error: 'JSON object body required' });
      }
      const { source, domain, punycode, eventType, payload, priority } = body;
      if (!isNonEmptyString(domain, 255) || !isNonEmptyString(source, 100)) {
        return res
          .status(400)
          .json({ error: 'domain and source are required and must be strings' });
      }
      if (punycode != null && !isNonEmptyString(punycode, 255)) {
        return res.status(400).json({ error: 'punycode must be a string' });
      }
      if (eventType != null && !isNonEmptyString(eventType, 50)) {
        return res.status(400).json({ error: 'eventType must be a string' });
      }
      if (!SOURCE_ENUM.includes(source)) {
        return res.status(400).json({ error: `source must be one of: ${SOURCE_ENUM.join(', ')}` });
      }
      if (eventType != null && !EVENT_TYPE_ENUM.includes(eventType)) {
        return res
          .status(400)
          .json({ error: `eventType must be one of: ${EVENT_TYPE_ENUM.join(', ')}` });
      }
      const parsed = clampPriority(priority);
      if (parsed.error) return res.status(400).json({ error: parsed.error });

      const id = enqueueEvent({
        source,
        domain,
        punycode,
        eventType: eventType || 'update',
        payload,
        priority: parsed.priority,
      });
      return res.status(202).json({ id, status: 'pending' });
    }

    // Admin-only: process pending events synchronously
    if (req.method === 'PUT') {
      if (!(await requireAdmin(req, res))) return;
      const results = await processPendingEvents({ limit: 10 });
      return res.json({ processed: results.length, results });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    handleError(res, err);
  }
};
