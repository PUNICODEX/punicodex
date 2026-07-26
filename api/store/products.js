/**
 * PuniCodex — Live creator merch products for the Store.
 * GET /api/store/products → { success, products: [...] }
 *
 * Returns consented, approved student creative works currently listed as
 * print-on-demand merchandise, shaped like the static store/products.json
 * entries so the storefront (/js/store.js) can merge both catalogs. See
 * docs/creator-merch.md for the pipeline and revenue split.
 */

const { getDb } = require('../../platform/db/connection');
const { migrate: migrateCreatorMerch } = require('../../platform/db/migrate-creator-merch');
const { listLiveCreatorProducts } = require('../../platform/api/creator-merch');
const { existingWebpFor } = require('../../platform/api/image-webp');

// Idempotent migration; safe to run on every serverless cold start. Guarded
// so a migration hiccup degrades the endpoint instead of breaking the require.
try {
  migrateCreatorMerch(getDb());
} catch (err) {
  console.error('[store/products] migration failed:', err.message);
}

// Store tabs (store/index.html): all / apparel / art-prints / digital / relics.
const CATEGORY_BY_TYPE = {
  poster: 'art-prints',
  tee: 'apparel',
  sticker: 'relics',
};

function toStoreProduct(row) {
  return {
    id: `creator-${row.id}`,
    temple: row.inspiration_entry_id || null,
    name: row.title,
    category: CATEGORY_BY_TYPE[row.product_type] || 'art-prints',
    price: row.price_cents / 100,
    blurb: 'Student-created design from the PuniCodex Creative Marketplace.',
    image: row.image_path,
    image_webp: existingWebpFor(row.image_path),
    templeUrl: '/creatives/',
    printfulProductId: null,
    creator: { name: row.creator_name, university: row.creator_university },
  };
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://punicodex.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const products = listLiveCreatorProducts().map(toStoreProduct);
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ success: true, products });
  } catch (err) {
    console.error('[store/products] listing failed:', err.message);
    return res.status(500).json({ success: false, error: 'Creator catalog unavailable' });
  }
};
