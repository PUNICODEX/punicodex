/**
 * PuniCodex Engine — Pure Scholarly Transliteration Core
 * Shared between website, browser extension, and mobile app.
 * No DOM dependencies. No side effects.
 * Variant-aware: multiple entries can share the same ASCII root.
 */

const PUNICODEX_ENGINE = {
  CONFIG: {
    maxCompletions: 6,
    maxSuggestions: 8,
  },

  TrieNode: class TrieNode {
    constructor() {
      this.children = {};
      this.isEnd = false;
      this.entries = []; // All entries sharing this ASCII terminal
    }
  },

  buildTrie(lexicon) {
    const root = new PUNICODEX_ENGINE.TrieNode();
    lexicon.forEach((entry) => {
      const ascii = entry.ascii.toLowerCase();
      let node = root;
      for (const char of ascii) {
        if (!node.children[char]) {
          node.children[char] = new PUNICODEX_ENGINE.TrieNode();
        }
        node = node.children[char];
      }
      node.isEnd = true;
      node.entries.push(entry);
    });
    return root;
  },

  getNodeForPrefix(trie, prefix) {
    let node = trie;
    for (const char of prefix.toLowerCase()) {
      if (!node.children[char]) return null;
      node = node.children[char];
    }
    return node;
  },

  filterByPantheon(entries, pantheonFilter) {
    if (pantheonFilter === 'all') return entries;
    return entries.filter(
      (e) =>
        e.pantheon === pantheonFilter ||
        (pantheonFilter === 'greek-all' &&
          (e.pantheon === 'greek' || e.pantheon === 'greek-location'))
    );
  },

  rankEntries(entries) {
    return entries.slice().sort((a, b) => {
      const lenDiff = a.ascii.length - b.ascii.length;
      if (lenDiff !== 0) return lenDiff;
      return a.ascii.localeCompare(b.ascii);
    });
  },

  getCompletions(trie, prefix, options = {}) {
    const { limit = PUNICODEX_ENGINE.CONFIG.maxCompletions, pantheonFilter = 'all' } = options;
    const node = PUNICODEX_ENGINE.getNodeForPrefix(trie, prefix);
    if (!node) return [];

    const entries = new Set();
    function collect(n) {
      for (const e of n.entries) entries.add(e);
      for (const child of Object.values(n.children)) collect(child);
    }
    collect(node);

    let results = Array.from(entries);
    results = PUNICODEX_ENGINE.filterByPantheon(results, pantheonFilter);
    results = PUNICODEX_ENGINE.rankEntries(results);
    return results.slice(0, limit);
  },

  getValidNextChars(trie, prefix, options = {}) {
    const completions = PUNICODEX_ENGINE.getCompletions(trie, prefix, {
      ...options,
      limit: Infinity,
    });
    const nextChars = new Set();
    completions.forEach((entry) => {
      const nextIndex = prefix.length;
      if (nextIndex < entry.ascii.length) {
        nextChars.add(entry.ascii[nextIndex].toLowerCase());
      }
    });
    return Array.from(nextChars).sort();
  },

  /**
   * Returns the primary (first) exact match for backward compatibility.
   * If pantheon filter is active, returns the first variant matching the filter.
   */
  findExactMatch(trie, input, options = {}) {
    const matches = PUNICODEX_ENGINE.findExactMatches(trie, input, options);
    return matches.length > 0 ? matches[0] : null;
  },

  /**
   * Returns ALL exact-match variants for a given ASCII input.
   * Respects pantheon filtering.
   */
  findExactMatches(trie, input, options = {}) {
    const { pantheonFilter = 'all' } = options;
    const node = PUNICODEX_ENGINE.getNodeForPrefix(trie, input);
    if (!node?.isEnd) return [];
    let results = node.entries.slice();
    if (pantheonFilter !== 'all') {
      results = PUNICODEX_ENGINE.filterByPantheon(results, pantheonFilter);
    }
    return results;
  },

  /**
   * Find all entries that share the same ASCII root as the given entry.
   * Used for variant navigation.
   */
  findVariants(trie, entryId, lexicon) {
    const entry = lexicon.find((e) => e.id === entryId);
    if (!entry) return [];
    const node = PUNICODEX_ENGINE.getNodeForPrefix(trie, entry.ascii);
    if (!node?.isEnd) return [];
    return node.entries.filter((e) => e.id !== entryId);
  },

  nfc(str) {
    return typeof str === 'string' ? str.normalize('NFC') : str;
  },

  /**
   * Splits a string into NFD base+marks clusters so diacritics can be
   * inspected and rewritten without losing marks on untouched characters.
   */
  _diacriticClusters(str) {
    const nfd = String(str).normalize('NFD');
    const clusters = [];
    for (const char of nfd) {
      const cp = char.codePointAt(0);
      if (cp >= 0x0300 && cp <= 0x036f) {
        if (clusters.length > 0) clusters[clusters.length - 1].marks.push(char);
      } else {
        clusters.push({ base: char, marks: [] });
      }
    }
    return clusters;
  },

  /**
   * Extracts the vowel slots of a Greek original with the accent features
   * needed for stacked-form derivation. Diphthong members are flagged:
   * the house convention never macron-marks diphthongs because their
   * length is inherent (cf. Seirḗn, Eurṓpē, Aithḗr).
   */
  _greekVowelSlots(greek) {
    const GREEK_VOWELS = 'αεηιουω';
    const DIPHTHONGS = new Set(['αι', 'ει', 'οι', 'υι', 'αυ', 'ευ', 'ου', 'ηυ', 'ωυ']);
    const slots = [];
    for (const cluster of PUNICODEX_ENGINE._diacriticClusters(greek)) {
      const base = cluster.base.toLowerCase();
      if (!GREEK_VOWELS.includes(base)) continue;
      slots.push({
        base,
        acute: cluster.marks.includes('\u0301'),
        circumflex: cluster.marks.includes('\u0342'),
        diaeresis: cluster.marks.includes('\u0308'),
        iotaSubscript: cluster.marks.includes('\u0345'),
        diphthong: false,
      });
    }
    for (let i = 0; i + 1 < slots.length; i++) {
      const a = slots[i];
      const b = slots[i + 1];
      if (a.diaeresis || b.diaeresis) continue;
      if (DIPHTHONGS.has(a.base + b.base)) {
        a.diphthong = true;
        b.diphthong = true;
      }
    }
    for (const slot of slots) {
      if (slot.iotaSubscript) slot.diphthong = true;
    }
    return slots;
  },

  /**
   * Derives the canonical stacked-diacritic form of an entry from its Greek
   * original, or returns null when the tier doctrine does not support one.
   *
   * Rule: a vowel may carry the stack (macron + acute, e.g. ḗ U+1E17,
   * ṓ U+1E53) only when the Greek original marks that SAME vowel with BOTH
   * features provable from orthography — an acute on η or ω, the two
   * unambiguously long vowels. Never stacked:
   *   - ε/ο with acute (always short — a macron would be a false quantity)
   *   - α/ι/υ with acute (length is not marked by Greek orthography;
   *     ACCURACY.md forbids inventing macrons the source cannot prove)
   *   - diphthongs (length is inherent; house style leaves them unmarked)
   *   - circumflex vowels (ῆ/ῶ already fuse length + stress in one mark,
   *     rendered ê/ô by convention — a circumflex is not an acute)
   *
   * The stack is applied to the entry's own primary unicode form, so the
   * house Latinization (c/k, y/u, conventional spellings) is preserved.
   * Returns null on vowel-alignment mismatch, when the primary already
   * carries every supported stack, or when the result duplicates the
   * primary or an existing variant (dedupe).
   */
  deriveStackedForm(entry) {
    if (!entry || typeof entry.greek !== 'string' || typeof entry.unicode !== 'string') {
      return null;
    }
    if (!/\p{Script=Greek}/u.test(entry.greek)) return null;

    const greekSlots = PUNICODEX_ENGINE._greekVowelSlots(entry.greek);
    if (greekSlots.length === 0) return null;

    const LATIN_VOWELS = 'aeiouy';
    const clusters = PUNICODEX_ENGINE._diacriticClusters(entry.unicode);
    const latinSlots = clusters.filter((c) => LATIN_VOWELS.includes(c.base.toLowerCase()));
    if (greekSlots.length !== latinSlots.length) return null;

    const ACUTE = '\u0301';
    const MACRON = '\u0304';
    const STRESS_LENGTH_MARKS = new Set(['\u0300', '\u0301', '\u0302', '\u0304']);

    let changed = false;
    for (let i = 0; i < greekSlots.length; i++) {
      const greek = greekSlots[i];
      if (!greek.acute || greek.diphthong) continue;
      if (greek.base !== 'η' && greek.base !== 'ω') continue;
      const cluster = latinSlots[i];
      const expected = greek.base === 'η' ? 'e' : 'o';
      if (cluster.base.toLowerCase() !== expected) return null; // misalignment — unsafe
      const hasMacron = cluster.marks.includes(MACRON);
      const hasAcute = cluster.marks.includes(ACUTE);
      if (hasMacron && hasAcute) continue; // already stacked
      // Keep unrelated marks (e.g. diaeresis); replace any old stress/length
      // mark. Macron precedes acute so NFC composes to the single codepoint.
      cluster.marks = cluster.marks
        .filter((mark) => !STRESS_LENGTH_MARKS.has(mark))
        .concat([MACRON, ACUTE]);
      changed = true;
    }
    if (!changed) return null;

    const form = clusters
      .map((c) => c.base + c.marks.join(''))
      .join('')
      .normalize('NFC');
    const taken = new Set([entry.unicode.normalize('NFC')]);
    for (const variant of entry.variants || []) {
      if (variant && typeof variant.unicode === 'string') {
        taken.add(variant.unicode.normalize('NFC'));
      }
    }
    return taken.has(form) ? null : form;
  },

  getPantheonEmoji(pantheon) {
    return (
      {
        greek: '⚡',
        'greek-location': '📍',
        norse: '❄️',
        egyptian: '☀️',
        sanskrit: '🕉️',
        celtic: '🌿',
        mesopotamian: '🏛️',
        polynesian: '🌊',
        roman: '🦅',
        japanese: '⛩️',
        nahuatl: '🐍',
        yoruba: '🥁',
        slavic: '🔥',
        zoroastrian: '☀️',
        incan: '🦙',
        chinese: '🐉',
        buddhist: '☸️',
        taoist: '☯️',
        korean: '🇰🇷',
        phoenician: '🌅',
        hittite: '🦁',
        canaanite: '🌴',
      }[pantheon] || '✦'
    );
  },

  escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
};

// Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PUNICODEX_ENGINE;
}
