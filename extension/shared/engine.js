/**
 * PÚNYCODEX Engine — Pure Scholarly Transliteration Core
 * Shared between website and browser extension.
 * No DOM dependencies. No side effects.
 * Variant-aware: multiple entries can share the same ASCII root.
 */

const PUNYCODEX_ENGINE = {
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
        const root = new this.TrieNode();
        lexicon.forEach(entry => {
            const ascii = entry.ascii.toLowerCase();
            let node = root;
            for (const char of ascii) {
                if (!node.children[char]) {
                    node.children[char] = new this.TrieNode();
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
        return entries.filter(e =>
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
        const { limit = this.CONFIG.maxCompletions, pantheonFilter = 'all' } = options;
        const node = this.getNodeForPrefix(trie, prefix);
        if (!node) return [];

        const entries = new Set();
        function collect(n) {
            for (const e of n.entries) entries.add(e);
            for (const child of Object.values(n.children)) collect(child);
        }
        collect(node);

        let results = Array.from(entries);
        results = this.filterByPantheon(results, pantheonFilter);
        results = this.rankEntries(results);
        return results.slice(0, limit);
    },

    getValidNextChars(trie, prefix, options = {}) {
        const completions = this.getCompletions(trie, prefix, { ...options, limit: Infinity });
        const nextChars = new Set();
        completions.forEach(entry => {
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
        const matches = this.findExactMatches(trie, input, options);
        return matches.length > 0 ? matches[0] : null;
    },

    /**
     * Returns ALL exact-match variants for a given ASCII input.
     * Respects pantheon filtering.
     */
    findExactMatches(trie, input, options = {}) {
        const { pantheonFilter = 'all' } = options;
        const node = this.getNodeForPrefix(trie, input);
        if (!node || !node.isEnd) return [];
        let results = node.entries.slice();
        if (pantheonFilter !== 'all') {
            results = this.filterByPantheon(results, pantheonFilter);
        }
        return results;
    },

    /**
     * Find all entries that share the same ASCII root as the given entry.
     * Used for variant navigation.
     */
    findVariants(trie, entryId, lexicon) {
        const entry = lexicon.find(e => e.id === entryId);
        if (!entry) return [];
        const node = this.getNodeForPrefix(trie, entry.ascii);
        if (!node || !node.isEnd) return [];
        return node.entries.filter(e => e.id !== entryId);
    },

    nfc(str) {
        return typeof str === 'string' ? str.normalize('NFC') : str;
    },

    getPantheonEmoji(pantheon) {
        return {
            'greek': '⚡',
            'greek-location': '📍',
            'norse': '❄️',
            'egyptian': '☀️',
            'sanskrit': '🕉️',
            'celtic': '🌿',
            'mesopotamian': '🏛️',
            'polynesian': '🌊',
            'japanese': '⛩️',
            'nahuatl': '🐍',
            'yoruba': '🥁',
            'slavic': '🔥',
            'zoroastrian': '☀️',
            'incan': '🦙',
            'chinese': '🐉',
            'buddhist': '☸️',
            'taoist': '☯️',
            'korean': '🇰🇷',
            'phoenician': '🌅',
            'hittite': '🦁',
            'canaanite': '🌴',
        }[pantheon] || '✦';
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
    module.exports = PUNYCODEX_ENGINE;
}
