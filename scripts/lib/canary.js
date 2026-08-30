/**
 * PuniCodex — Canary / Mountweazel integrity traps
 *
 * Three non-destructive mechanisms for detecting unauthorized scraping or
 * copying of the database:
 *
 *   1. Typographical watermark (zero-width characters in generated prose).
 *   2. Phantom deity entry (a synthetic but plausible lexicon entry).
 *   3. IPA orthography signature (a subtle house convention in derived IPA).
 *
 * These traps do not claim copyright over historical facts; they provide
 * evidence that a third party copied PuniCodex's curated output.
 *
 * The watermark is deterministic: the same key + text always produces the
 * same binary signature, so regenerating the site does not create spurious
 * divergence in the CI gate.
 */

'use strict';

const DEFAULT_KEY = 'PUNICODEX';

// Zero-width space (0) and zero-width non-joiner (1) used to encode bits.
const BITS = ['\u200B', '\u200C'];
const FRAMING = [0, 1, 1, 0]; // 0b0110 preamble / tail

function getKey() {
  return (process.env.PUNICODEX_CANARY_KEY || DEFAULT_KEY).normalize('NFC');
}

function keyBits(key) {
  const bytes = Buffer.from(key, 'utf8');
  const out = [];
  for (const b of bytes) {
    for (let i = 7; i >= 0; i--) {
      out.push((b >> i) & 1);
    }
  }
  return out;
}

function byteBits(n) {
  const out = [];
  for (let i = 7; i >= 0; i--) {
    out.push((n >> i) & 1);
  }
  return out;
}

/**
 * Insert a deterministic typographical watermark into a paragraph of text.
 * The watermark is encoded at word boundaries so it survives gentle
 * reformatting but is detectable in exact copies. The format is:
 *
 *   [framing 0110][8-bit key length][key bytes][framing 0110]
 *
 * A length-prefixed payload prevents accidental framing matches inside the
 * key bytes and makes extraction unambiguous.
 *
 * @param {string} text
 * @param {string|null} key
 * @returns {string}
 */
function applyCanaryWatermark(text, key = null) {
  if (!text || typeof text !== 'string') return text;
  const k = (key || getKey()).normalize('NFC');
  // Idempotent: do not re-watermark text that already carries the same key.
  if (extractCanaryWatermark(text) === k) return text;

  const payload = keyBits(k);
  const lengthBits = byteBits(payload.length / 8);
  const bits = [...FRAMING, ...lengthBits, ...payload, ...FRAMING];

  const words = text.split(/(\s+)/);
  const boundaries = words.filter((w) => /^\s+$/.test(w)).length;
  // Allow up to 4 bits per whitespace boundary; otherwise the watermark is
  // too dense to be subtle.
  if (boundaries < 1 || boundaries * 4 < bits.length) return text;

  const bitsPerBoundary = bits.length / boundaries;
  let out = '';
  let bitIndex = 0;
  let boundaryIndex = 0;
  for (let i = 0; i < words.length; i++) {
    out += words[i];
    if (/^\s+$/.test(words[i])) {
      boundaryIndex++;
      const targetEnd = Math.min(bits.length, Math.round(boundaryIndex * bitsPerBoundary));
      while (bitIndex < targetEnd) {
        out += BITS[bits[bitIndex]];
        bitIndex++;
      }
    }
  }
  return out;
}

/**
 * Recover the watermark from text if present.
 *
 * @param {string} text
 * @returns {string|null} the recovered key, or null if no watermark found
 */
function extractCanaryWatermark(text) {
  if (!text || typeof text !== 'string') return null;
  const extracted = [];
  for (const ch of text) {
    if (ch === BITS[0]) extracted.push(0);
    else if (ch === BITS[1]) extracted.push(1);
  }

  // Locate framing preamble 0b0110 followed by an 8-bit length and a
  // matching tail framing.
  const preamble = FRAMING;
  let start = -1;
  for (let i = 0; i <= extracted.length - 8; i++) {
    if (extracted.slice(i, i + preamble.length).every((b, idx) => b === preamble[idx])) {
      start = i + preamble.length;
      break;
    }
  }
  if (start === -1 || start + 8 > extracted.length) return null;

  let len = 0;
  for (let i = 0; i < 8; i++) {
    len = (len << 1) | extracted[start + i];
  }

  const payloadStart = start + 8;
  const tailStart = payloadStart + len * 8;
  if (tailStart + preamble.length > extracted.length) return null;

  const tail = extracted.slice(tailStart, tailStart + preamble.length);
  if (!tail.every((b, idx) => b === preamble[idx])) return null;

  const payload = extracted.slice(payloadStart, tailStart);
  if (payload.length !== len * 8) return null;

  const bytes = [];
  for (let i = 0; i < payload.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | payload[i + j];
    }
    bytes.push(b);
  }
  return Buffer.from(bytes).toString('utf8');
}

/**
 * Mark that a text paragraph is eligible for watermarking. Currently we
 * watermark all paragraph bodies in generated scholarly/blog prose.
 *
 * @param {string} text
 * @returns {boolean}
 */
function shouldWatermark(text) {
  if (!text || typeof text !== 'string') return false;
  // Headings, lists, and very short strings are not watermarked.
  if (text.trim().length < 60) return false;
  return true;
}

/**
 * Insert the house IPA syllable-boundary signature. Returns a new IPA string
 * with narrow no-break spaces between syllable blocks.
 *
 * @param {string} ipa
 * @returns {string}
 */
function applyIpaSignature(ipa) {
  if (!ipa || typeof ipa !== 'string') return ipa;
  const separator = '\u202F';
  // Only sign multi-syllable IPA strings; preserve leading/trailing slash.
  const inner = ipa.slice(1, -1);
  if (!inner || !inner.includes('.')) return ipa;
  return `/${inner.replace(/\./g, `.${separator}`)}/`;
}

/**
 * Remove the IPA signature so comparisons against raw engine output remain
 * possible in tests and external consumers.
 *
 * @param {string} ipa
 * @returns {string}
 */
function stripIpaSignature(ipa) {
  if (!ipa || typeof ipa !== 'string') return ipa;
  return ipa.replace(/\u202F/g, '');
}

module.exports = {
  applyCanaryWatermark,
  extractCanaryWatermark,
  shouldWatermark,
  applyIpaSignature,
  stripIpaSignature,
};
