/**
 * PuniCodex analytics event registry (v2 pipeline).
 *
 * Defines the canonical event schema, per-event validation, and shared
 * path-derived helpers (page type, temple attribution). Consumers:
 *   - js/analytics-beacon.js        (client-side emit)
 *   - platform/api-handlers/analytics/collect/index.js  (server ingest)
 *   - platform/db/migrate-site-analytics-v5.js          (backfill)
 */

const { LEXICON } = require('../../type/js/lexicon.js');

const TEMPLE_IDS = new Set(LEXICON.map((entry) => entry.id));

const VALID_PAGE_TYPES = new Set([
  'temple',
  'blog',
  'patterns',
  'lore',
  'scholars',
  'store',
  'search',
  'account',
  'admin',
  'static',
]);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function clampInt(value, min, max) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

function sanitizePath(value) {
  if (typeof value !== 'string') return null;
  const stripped = value.split('?')[0].split('#')[0].trim();
  if (!stripped.startsWith('/')) return null;
  return stripped.slice(0, 200);
}

function extractTempleId(path) {
  const sitesMatch = path.match(/^\/sites\/([a-z0-9-]{1,64})(\/|$)/);
  if (sitesMatch) return sitesMatch[1];
  const canonicalMatch = path.match(/^\/([a-z0-9-]{1,64})(\/|$)/);
  if (canonicalMatch && TEMPLE_IDS.has(canonicalMatch[1])) return canonicalMatch[1];
  return '';
}

function getPageType(path) {
  const clean = sanitizePath(path);
  if (!clean) return 'static';

  if (clean.startsWith('/admin')) return 'admin';
  if (clean.startsWith('/account')) return 'account';
  if (clean.startsWith('/store')) return 'store';
  if (clean.startsWith('/search')) return 'search';

  const sitesSub = clean.match(/^\/sites\/[a-z0-9-]{1,64}\/([a-z0-9-]+)\//);
  if (sitesSub) {
    const type = sitesSub[1];
    if (VALID_PAGE_TYPES.has(type)) return type;
    return 'temple';
  }

  const canonicalSub = clean.match(/^\/[a-z0-9-]{1,64}\/([a-z0-9-]+)\//);
  if (canonicalSub) {
    const type = canonicalSub[1];
    if (VALID_PAGE_TYPES.has(type)) return type;
  }

  return extractTempleId(clean) ? 'temple' : 'static';
}

function validatePageView(props) {
  return isNonEmptyString(props.path);
}

function validateEngagement(props) {
  return (
    isNonEmptyString(props.path) &&
    Number.isFinite(parseInt(props.visible_ms, 10)) &&
    Number.isFinite(parseInt(props.scroll_pct, 10))
  );
}

function validatePathEvent(props) {
  return isNonEmptyString(props.path);
}

function validateSponsorModalOpen(props) {
  return isNonEmptyString(props.path);
}

function validateSponsorApplyStart(props) {
  return isNonEmptyString(props.path);
}

function validateSponsorApplySubmit(props) {
  return isNonEmptyString(props.path);
}

function validateSponsorPaymentComplete(props) {
  return isNonEmptyString(props.path) && Number.isFinite(parseFloat(props.amount || 0));
}

function validatePatronView(props) {
  return isNonEmptyString(props.path);
}

function validatePatronCheckoutInit(props) {
  return isNonEmptyString(props.path) && Number.isFinite(parseFloat(props.amount || 0));
}

function validatePatronCheckoutComplete(props) {
  return isNonEmptyString(props.path) && Number.isFinite(parseFloat(props.amount || 0));
}

function validateStoreProductView(props) {
  return isNonEmptyString(props.path) && isNonEmptyString(props.product_id);
}

function validateStoreCartAdd(props) {
  return isNonEmptyString(props.path) && isNonEmptyString(props.product_id);
}

function validateStoreCheckoutInit(props) {
  return isNonEmptyString(props.path) && Number.isFinite(parseFloat(props.amount || 0));
}

function validateStoreCheckoutComplete(props) {
  return isNonEmptyString(props.path) && Number.isFinite(parseFloat(props.amount || 0));
}

function validateSearchQuery(props) {
  return isNonEmptyString(props.query);
}

function validateSearchResultClick(props) {
  return isNonEmptyString(props.query) && isNonEmptyString(props.result_id);
}

function validateNewsletterSubscribe(props) {
  return isNonEmptyString(props.path);
}

const EVENT_REGISTRY = {
  page_view: {
    version: 1,
    requiredProps: ['path', 'session_hash'],
    optionalProps: [
      'referrer',
      'page_type',
      'temple_id',
      'device',
      'country',
      'utm_source',
      'utm_medium',
      'utm_campaign',
    ],
    validate: validatePageView,
  },
  engagement: {
    version: 1,
    requiredProps: ['path', 'session_hash', 'visible_ms', 'scroll_pct'],
    optionalProps: ['page_type', 'temple_id', 'device'],
    validate: validateEngagement,
  },
  tab_switch: {
    version: 1,
    requiredProps: ['path', 'session_hash', 'tab_name'],
    optionalProps: ['page_type', 'temple_id'],
    validate: validatePathEvent,
  },
  outbound_click: {
    version: 1,
    requiredProps: ['path', 'session_hash', 'url'],
    optionalProps: ['page_type', 'temple_id'],
    validate: validatePathEvent,
  },
  sponsor_modal_open: {
    version: 1,
    requiredProps: ['path', 'session_hash'],
    optionalProps: ['page_type', 'temple_id', 'slot_id'],
    validate: validateSponsorModalOpen,
  },
  sponsor_apply_start: {
    version: 1,
    requiredProps: ['path', 'session_hash'],
    optionalProps: ['page_type', 'temple_id', 'slot_id'],
    validate: validateSponsorApplyStart,
  },
  sponsor_apply_submit: {
    version: 1,
    requiredProps: ['path', 'session_hash'],
    optionalProps: ['page_type', 'temple_id', 'slot_id'],
    validate: validateSponsorApplySubmit,
  },
  sponsor_payment_complete: {
    version: 1,
    requiredProps: ['path', 'session_hash', 'amount'],
    optionalProps: ['page_type', 'temple_id', 'slot_id', 'currency'],
    validate: validateSponsorPaymentComplete,
  },
  patron_view: {
    version: 1,
    requiredProps: ['path', 'session_hash'],
    optionalProps: ['page_type', 'temple_id', 'tier_id'],
    validate: validatePatronView,
  },
  patron_checkout_init: {
    version: 1,
    requiredProps: ['path', 'session_hash', 'amount'],
    optionalProps: ['page_type', 'temple_id', 'tier_id', 'currency'],
    validate: validatePatronCheckoutInit,
  },
  patron_checkout_complete: {
    version: 1,
    requiredProps: ['path', 'session_hash', 'amount'],
    optionalProps: ['page_type', 'temple_id', 'tier_id', 'currency'],
    validate: validatePatronCheckoutComplete,
  },
  store_product_view: {
    version: 1,
    requiredProps: ['path', 'session_hash', 'product_id'],
    optionalProps: ['page_type', 'temple_id'],
    validate: validateStoreProductView,
  },
  store_cart_add: {
    version: 1,
    requiredProps: ['path', 'session_hash', 'product_id'],
    optionalProps: ['page_type', 'temple_id', 'quantity'],
    validate: validateStoreCartAdd,
  },
  store_checkout_init: {
    version: 1,
    requiredProps: ['path', 'session_hash', 'amount'],
    optionalProps: ['page_type', 'temple_id', 'currency'],
    validate: validateStoreCheckoutInit,
  },
  store_checkout_complete: {
    version: 1,
    requiredProps: ['path', 'session_hash', 'amount'],
    optionalProps: ['page_type', 'temple_id', 'currency'],
    validate: validateStoreCheckoutComplete,
  },
  search_query: {
    version: 1,
    requiredProps: ['session_hash', 'query'],
    optionalProps: ['page_type', 'temple_id', 'result_count'],
    validate: validateSearchQuery,
  },
  search_result_click: {
    version: 1,
    requiredProps: ['session_hash', 'query', 'result_id'],
    optionalProps: ['page_type', 'temple_id', 'position'],
    validate: validateSearchResultClick,
  },
  newsletter_subscribe: {
    version: 1,
    requiredProps: ['path', 'session_hash'],
    optionalProps: ['page_type', 'temple_id', 'source'],
    validate: validateNewsletterSubscribe,
  },
};

function normalizeEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return { error: 'event must be an object' };
  }

  const name = event.event_name;
  if (!isNonEmptyString(name)) {
    return { error: 'event_name is required' };
  }

  const registry = EVENT_REGISTRY[name];
  if (!registry) {
    return { error: `unknown event_name: ${name}` };
  }

  for (const key of registry.requiredProps) {
    if (event[key] === undefined || event[key] === null || event[key] === '') {
      return { error: `missing required property: ${key}` };
    }
  }

  if (!registry.validate(event)) {
    return { error: `validation failed for ${name}` };
  }

  const allowed = new Set([
    'event_name',
    'event_version',
    ...registry.requiredProps,
    ...registry.optionalProps,
  ]);

  const normalized = {
    event_name: name,
    event_version: registry.version,
  };

  for (const key of registry.requiredProps) {
    normalized[key] = event[key];
  }

  for (const key of registry.optionalProps) {
    if (event[key] !== undefined && event[key] !== null) {
      normalized[key] = event[key];
    }
  }

  // Strip any disallowed keys but keep known extras inside properties for
  // flexible event-specific payloads.
  const extra = {};
  for (const key of Object.keys(event)) {
    if (!allowed.has(key) && key !== 'event_name' && key !== 'event_version') {
      extra[key] = event[key];
    }
  }
  if (Object.keys(extra).length > 0) {
    normalized.properties = extra;
  }

  // Derive page_type and temple_id from path when not explicitly provided.
  if (normalized.path) {
    if (!normalized.page_type || !VALID_PAGE_TYPES.has(normalized.page_type)) {
      normalized.page_type = getPageType(normalized.path);
    }
    if (normalized.temple_id === undefined) {
      normalized.temple_id = extractTempleId(normalized.path);
    }
  }

  // Coerce numeric engagement fields.
  if (name === 'engagement') {
    normalized.visible_ms = clampInt(normalized.visible_ms, 0, 30 * 60 * 1000);
    normalized.scroll_pct = clampInt(normalized.scroll_pct, 0, 100);
  }

  // Coerce commerce/search amounts and counts.
  if (normalized.amount !== undefined) {
    const amount = parseFloat(normalized.amount);
    normalized.amount = Number.isFinite(amount) ? amount : 0;
  }
  if (normalized.quantity !== undefined) {
    normalized.quantity = clampInt(normalized.quantity, 1, 10000);
  }
  if (normalized.result_count !== undefined) {
    normalized.result_count = clampInt(normalized.result_count, 0, 1000000);
  }
  if (normalized.position !== undefined) {
    normalized.position = clampInt(normalized.position, 0, 100000);
  }

  return normalized;
}

module.exports = {
  EVENT_REGISTRY,
  normalizeEvent,
  getPageType,
  extractTempleId,
  sanitizePath,
  VALID_PAGE_TYPES,
};
