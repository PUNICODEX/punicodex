#!/usr/bin/env node
/**
 * DEPRECATED — do not use. This one-off top-up script fetched Commons
 * images with no topicality, junk-signal, or category gating, which is how
 * off-topic photos (modern people, brands, satellite passes) entered temple
 * galleries. Use the hardened curator instead:
 *
 *   node scripts/curate-gallery-images.js --only <id>[,<id>…]
 *   node scripts/curate-gallery-images.js --verify [--purge]
 */

'use strict';

console.error(
  'scripts/fetch-missing-galleries.js is deprecated. Use scripts/curate-gallery-images.js ' +
    '(--only <ids> to curate, --verify to audit) — it is the only gallery path with ' +
    'relevance gating.',
);
process.exit(1);
