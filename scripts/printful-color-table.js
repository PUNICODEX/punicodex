#!/usr/bin/env node
/**
 * PuniCodex — Printful color-name → hex table (shared).
 *
 * Maps standard Printful catalog color names to representative hex values for
 * the Reliquary configurator color chips. The hex values are display
 * approximations of fabric/plastic tones, not brand-critical colors.
 *
 * Spelling variants ("Sport Grey" vs "Sports Gray") are normalized to one
 * canonical key for LOOKUP ONLY — the variant's actual Printful color name is
 * never rewritten (it must keep matching Printful's catalog, and the chip
 * label shows the real name). Unknown names resolve to null: the chip renders
 * as a neutral swatch with the name as tooltip, and generate-pod-products.js
 * logs a summary at generation time instead of failing.
 *
 * Used by: scripts/generate-pod-products.js (products.json colors),
 * scripts/generate-store-pages.js (COLOR_WORDS bare-label detection).
 */

// Canonical table. Keys are normalized (lowercase, single spaces, canonical
// spelling — grey/gray and sport/sports variants alias to these keys).
const COLOR_HEX = {
  black: '#1a1a1a',
  white: '#f5f2ea',
  navy: '#1f2a44',
  royal: '#2a5bd7',
  red: '#b3222a',
  'heather grey': '#9a9a98',
  charcoal: '#3a3a3c',
  'forest green': '#2d4a32',
  maroon: '#5c1f28',
  gold: '#c9a227',
  yellow: '#e8c547',
  purple: '#5b3a8e',
  orange: '#d9722b',
  pink: '#e8a0b4',
  'light blue': '#a8c8e0',
  'sports grey': '#8e8e8e',
  'dark heather': '#4a4a4e',
  'military green': '#4a4f3a',
  sand: '#d8c9a3',
  ash: '#b8b4a8',
  cardinal: '#8c1d2f',
  'black heather': '#2e2e30',
  camel: '#b8956a',
};

// Normalization aliases: alternate spellings → canonical key. Lookup-only,
// never applied to the variant label itself.
const ALIASES = {
  'heather gray': 'heather grey',
  'sport grey': 'sports grey',
  'sport gray': 'sports grey',
  'sports gray': 'sports grey',
  'dark heather gray': 'dark heather',
  'dark heather grey': 'dark heather',
  'dark grey heather': 'heather grey',
  'dark gray heather': 'heather grey',
  'true royal': 'royal',
  'heather charcoal': 'charcoal',
  'forest': 'forest green',
};

// Bare variant labels (no "Color / Size" form) that denote a color/finish
// dimension rather than a size. Mirrors the historic parseVariants COLOR_WORDS
// set in generate-store-pages.js — single source of truth lives here.
const COLOR_WORDS = new Set([
  'white',
  'black',
  'camel',
  'navy',
  'red',
  'royal',
  'heather',
  'charcoal',
  'grey',
  'gray',
  'glossy',
  'clear',
  'natural',
  'forest',
  'maroon',
  'gold',
]);

function normalizeColorName(name) {
  const key = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return ALIASES[key] || key;
}

/**
 * Hex for a Printful color name, or null when unknown. Never throws; the
 * null case is a first-class result (neutral swatch + generation summary).
 */
function hexForColor(name) {
  const hex = COLOR_HEX[normalizeColorName(name)];
  return hex || null;
}

function isColorWord(label) {
  return COLOR_WORDS.has(String(label || '').trim().toLowerCase());
}

module.exports = { COLOR_HEX, COLOR_WORDS, normalizeColorName, hexForColor, isColorWord };
