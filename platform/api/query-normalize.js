/**
 * Unicode-aware query normalization for PUNYCODEX search.
 *
 * Core principle: a user searching for a deity should find the correct
 * Unicode restoration even if they type:
 *   - plain ASCII ("apollo")
 *   - a near-miss ("apollon", "apolo")
 *   - stripped diacritics ("apollon")
 *   - a different accent convention ("apóllōn" vs "apollon")
 *   - a Latin transliteration of a non-Latin original ("krishna" → "kṛṣṇa")
 *
 * This module produces a set of search keys from a raw query. Each key
 * is a lower-cased, diacritic-stripped, punctuation-normalized token.
 * Consumers can match against precomputed `search_key` columns in SQLite
 * for fast, index-backed fuzzy lookup.
 */

const GREEK_TRANSLIT = new Map([
  // Lower-case Greek → Latin(ish) fallback key
  ['α', 'a'],
  ['ά', 'a'],
  ['ὰ', 'a'],
  ['ᾶ', 'a'],
  ['ᾳ', 'a'],
  ['ἀ', 'a'],
  ['ἁ', 'a'],
  ['ἂ', 'a'],
  ['ἃ', 'a'],
  ['ἄ', 'a'],
  ['ἅ', 'a'],
  ['ἆ', 'a'],
  ['ἇ', 'a'],
  ['β', 'b'],
  ['γ', 'g'],
  ['δ', 'd'],
  ['ε', 'e'],
  ['έ', 'e'],
  ['ὲ', 'e'],
  ['ἐ', 'e'],
  ['ἑ', 'e'],
  ['ἒ', 'e'],
  ['ἓ', 'e'],
  ['ἔ', 'e'],
  ['ἕ', 'e'],
  ['ζ', 'z'],
  ['η', 'e'],
  ['ή', 'e'],
  ['ὴ', 'e'],
  ['ῆ', 'e'],
  ['ῃ', 'e'],
  ['ἠ', 'e'],
  ['ἡ', 'e'],
  ['ἢ', 'e'],
  ['ἣ', 'e'],
  ['ἤ', 'e'],
  ['ἥ', 'e'],
  ['ἦ', 'e'],
  ['ἧ', 'e'],
  ['θ', 'th'],
  ['ι', 'i'],
  ['ί', 'i'],
  ['ὶ', 'i'],
  ['ῖ', 'i'],
  ['ἰ', 'i'],
  ['ἱ', 'i'],
  ['ἲ', 'i'],
  ['ἳ', 'i'],
  ['ἴ', 'i'],
  ['ἵ', 'i'],
  ['ἶ', 'i'],
  ['ἷ', 'i'],
  ['κ', 'k'],
  ['λ', 'l'],
  ['μ', 'm'],
  ['ν', 'n'],
  ['ξ', 'x'],
  ['ο', 'o'],
  ['ό', 'o'],
  ['ὸ', 'o'],
  ['ὀ', 'o'],
  ['ὁ', 'o'],
  ['ὂ', 'o'],
  ['ὃ', 'o'],
  ['ὄ', 'o'],
  ['ὅ', 'o'],
  ['π', 'p'],
  ['ρ', 'r'],
  ['ῥ', 'rh'],
  ['ῤ', 'r'],
  ['σ', 's'],
  ['ς', 's'],
  ['τ', 't'],
  ['υ', 'y'],
  ['ύ', 'y'],
  ['ὺ', 'y'],
  ['ῦ', 'y'],
  ['ὐ', 'y'],
  ['ὑ', 'y'],
  ['ὒ', 'y'],
  ['ὓ', 'y'],
  ['ὔ', 'y'],
  ['ὕ', 'y'],
  ['ὖ', 'y'],
  ['ὗ', 'y'],
  ['φ', 'ph'],
  ['χ', 'ch'],
  ['ψ', 'ps'],
  ['ω', 'o'],
  ['ώ', 'o'],
  ['ὼ', 'o'],
  ['ῶ', 'o'],
  ['ῳ', 'o'],
  ['ὠ', 'o'],
  ['ὡ', 'o'],
  ['ὢ', 'o'],
  ['ὣ', 'o'],
  ['ὤ', 'o'],
  ['ὥ', 'o'],
  ['ὦ', 'o'],
  ['ὧ', 'o'],
]);

const HOMOGLYPH_MAP = new Map([
  // Latin lookalikes that users often substitute
  ['0', 'o'],
  ['1', 'l'],
  ['l', '1'],
  ['i', 'l'],
  ['l', 'i'],
  [' rn', 'm'],
  ['m', 'rn'],
  // Common confusable Greek/Cyrillic/Latin (simplified)
  ['а', 'a'],
  ['a', 'а'],
  ['е', 'e'],
  ['e', 'е'],
  ['о', 'o'],
  ['o', 'о'],
  ['р', 'p'],
  ['p', 'р'],
  ['с', 'c'],
  ['c', 'с'],
  ['х', 'x'],
  ['x', 'х'],
  ['у', 'y'],
  ['y', 'у'],
]);

/**
 * Strip all combining diacritical marks (NFD + remove U+0300–U+036F).
 */
function stripDiacritics(str) {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Convert a string to a search key: lower-case, diacritics stripped,
 * punctuation collapsed to spaces, multiple spaces collapsed.
 */
function toSearchKey(str) {
  return stripDiacritics(String(str))
    .toLowerCase()
    .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f]/g, '"')
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Build a Greek-latinized fallback key. This lets "απολλων" match "apollon".
 */
function greekLatinKey(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split('')
    .map((ch) => GREEK_TRANSLIT.get(ch) || ch)
    .join('')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Generate a set of search keys for a raw query.
 * Returns an object with arrays and a canonical best key.
 */
function normalizeQuery(raw) {
  const q = String(raw || '').trim();
  const asciiKey = toSearchKey(q);
  const greekKey = greekLatinKey(q);

  const keys = new Set([asciiKey]);
  if (greekKey && greekKey !== asciiKey) keys.add(greekKey);

  // Add a variant with trailing 's' removed / added for common inflections
  for (const k of Array.from(keys)) {
    if (k.endsWith('s') && k.length > 2) keys.add(k.slice(0, -1));
    if (!k.endsWith('s') && k.length > 2) keys.add(`${k}s`);
  }

  return {
    raw: q,
    canonical: asciiKey,
    keys: Array.from(keys).filter(Boolean),
    tokens: asciiKey.split(/\s+/).filter((t) => t.length >= 1),
  };
}

/**
 * Compute the Unicode confusable risk between two strings.
 * Returns 0–1 where 1 means they are visually identical after normalization.
 */
function confusableRisk(a, b) {
  const na = stripDiacritics(a).toLowerCase().normalize('NFKC');
  const nb = stripDiacritics(b).toLowerCase().normalize('NFKC');
  if (na === nb) return 1;
  const len = Math.max(na.length, nb.length);
  if (len === 0) return 0;
  // Simple character-by-character visual similarity proxy
  let matches = 0;
  for (let i = 0; i < Math.min(na.length, nb.length); i++) {
    if (na[i] === nb[i] || HOMOGLYPH_MAP.get(na[i]) === nb[i]) matches++;
  }
  return matches / len;
}

/**
 * Given a Unicode restoration, produce the plain-ASCII key that most
 * users would type to search for it.
 */
function asciiFold(unicode) {
  return toSearchKey(unicode);
}

module.exports = {
  normalizeQuery,
  toSearchKey,
  asciiFold,
  stripDiacritics,
  greekLatinKey,
  confusableRisk,
};
