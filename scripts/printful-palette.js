#!/usr/bin/env node
/**
 * PuniCodex — Printful full-palette picker (shared).
 *
 * P3 color expansion: picks the wide curated color set per kind straight from
 * the Printful catalog, preferring in-stock variants. MUST be the single
 * source for both scripts/sync-printful-products.js (which sync variants) and
 * scripts/build-variant-pricing.js (which prices them) — the two can never
 * drift or checkout would price labels the sync product doesn't carry.
 *
 * Policy:
 *   - Apparel/embroidery kinds (tee, hoodie, crewneck, cap, tote): every
 *     priority color present in the catalog, up to MAX_COLORS, times a size
 *     run capped so the sync product stays under MAX_VARIANTS total.
 *   - Object kinds: unchanged behaviour (first few variants), but in-stock
 *     variants sort first so a stocked color is never displaced by an OOS one.
 *
 * Priority order follows scripts/printful-color-table.js (identity first:
 * black/gold obsidian house palette, then the standard fashion range).
 */

const { normalizeColorName } = require('./printful-color-table');

const APPAREL_KINDS = new Set(['tee', 'hoodie', 'crewneck', 'cap', 'tote']);

// Printful caps a sync product at 100 sync variants — keep the picked set
// safely under it so a wholesale refresh (which replaces the variant list)
// can never hit the ceiling.
const MAX_VARIANTS = 96;
const MAX_COLORS = 12;

// Priority color names (normalized form), most important first.
const COLOR_PRIORITY = [
  'black',
  'white',
  'gold',
  'navy',
  'royal',
  'red',
  'charcoal',
  'heather grey',
  'dark heather',
  'forest green',
  'maroon',
  'purple',
  'military green',
  'sand',
  'cardinal',
  'ash',
  'sports grey',
  'light blue',
  'pink',
  'orange',
  'yellow',
  'camel',
  'black heather',
];

// Size run preference: core sell-through sizes first.
const SIZE_PRIORITY = ['S', 'M', 'L', 'XL', '2XL', 'XS', '3XL', '4XL', '5XL', '6XL'];

function sizeRank(v) {
  const i = SIZE_PRIORITY.indexOf(String(v.size || '').trim());
  return i === -1 ? SIZE_PRIORITY.length : i;
}

function byPriorityColor(a, b) {
  const ai = COLOR_PRIORITY.indexOf(normalizeColorName(a.color));
  const bi = COLOR_PRIORITY.indexOf(normalizeColorName(b.color));
  return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
}

/**
 * Pick the sellable variant set for a kind from a catalog variant list
 * (shape: [{ id, size, color, in_stock, ... }]).
 */
function paletteVariants(variants, kind) {
  if (!APPAREL_KINDS.has(kind)) {
    // Object kinds: keep the historic small slice, stocked first for
    // determinism when catalog order changes.
    return [...variants].sort((a, b) => Number(b.in_stock) - Number(a.in_stock)).slice(0, 6);
  }

  const stocked = variants.filter((v) => v.in_stock);
  const pool = stocked.length >= 6 ? stocked : variants;

  // Group by normalized color, preserving the catalog's in-color size order.
  const byColor = new Map();
  for (const v of pool) {
    const key = normalizeColorName(v.color) || String(v.color || '').toLowerCase();
    if (!byColor.has(key)) byColor.set(key, []);
    byColor.get(key).push(v);
  }

  // Colors in priority order first, then any leftovers in catalog order.
  const colorKeys = [...byColor.keys()];
  colorKeys.sort((a, b) => {
    const ai = COLOR_PRIORITY.indexOf(a);
    const bi = COLOR_PRIORITY.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.localeCompare(b);
  });

  const chosenColors = colorKeys.slice(0, MAX_COLORS);
  const sizesPerColor = Math.max(1, Math.min(8, Math.floor(MAX_VARIANTS / chosenColors.length)));

  const picked = [];
  for (const key of chosenColors) {
    const sizes = [...byColor.get(key)].sort((a, b) => sizeRank(a) - sizeRank(b));
    picked.push(...sizes.slice(0, sizesPerColor));
  }
  return picked;
}

module.exports = { paletteVariants, APPAREL_KINDS, MAX_VARIANTS, MAX_COLORS, COLOR_PRIORITY };
