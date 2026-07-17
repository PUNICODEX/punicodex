#!/usr/bin/env node
/**
 * PuniCodex — Deterministic random number generator for corpus generators.
 *
 * Provides a seeded PRNG so that `npm run generate` produces byte-identical
 * output across runs and passes the divergence gate idempotency test.
 */

'use strict';

function mulberry32(seed) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seed = 0x50554e59) {
  // Default seed spells "PUNY" in ASCII hex (0x50 0x55 0x4e 0x59).
  return mulberry32(seed);
}

module.exports = { createRng };
