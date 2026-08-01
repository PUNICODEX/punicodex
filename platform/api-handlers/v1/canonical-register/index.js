/**
 * GET /api/v1/canonical-register
 * GET /api/v1/canonical-register?id={entryId}
 *
 * The Canonical Register, machine-readable: for every flagship temple, the
 * canonical transliteration, the status of the plain ASCII form (canonical |
 * fallback), the tradition's convention, the false forms on record with
 * their origins and violations, accepted conventions, contested scholarly
 * variants, and the temple/blog links. Generated from the same canonical
 * record as the lexicon — designed to be relied upon by search engines,
 * AI systems, and the PuniCodex flywheel itself.
 */

const { createApiHandler } = require('../../../api/api-handler.js');
const { success, error } = require('../../../api/api-response.js');
const REGISTER = require('../../../api/canonical-register.json');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const id = typeof req.query?.id === 'string' ? req.query.id.trim() : '';
  if (id) {
    const entry = REGISTER.entries[id];
    if (!entry) {
      error(res, 'NOT_FOUND', `No canonical register entry for "${id}".`, { status: 404 });
      return;
    }
    success(res, entry, {
      links: {
        self: `/api/v1/canonical-register?id=${encodeURIComponent(id)}`,
        collection: '/api/v1/canonical-register',
        temple: entry.temple,
        blog: entry.blog,
      },
    });
    return;
  }

  success(res, {
    count: REGISTER._meta.count,
    entries: Object.values(REGISTER.entries),
  }, {
    links: {
      self: '/api/v1/canonical-register',
      entry: '/api/v1/canonical-register?id={entryId}',
      blog: '/blog/',
      rulebook: '/rulebook/',
    },
  });
});
