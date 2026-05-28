/**
 * PÚNYCODEX Engine — Pure Scholarly Transliteration Core
 * Shared between website and browser extension.
 * No DOM dependencies. No side effects.
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
            this.entry = null;
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
            node.entry = entry;
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
            if (n.entry) entries.add(n.entry);
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

    findExactMatch(trie, input, options = {}) {
        const { pantheonFilter = 'all' } = options;
        const node = this.getNodeForPrefix(trie, input);
        if (node && node.isEnd) {
            const entry = node.entry;
            if (pantheonFilter !== 'all') {
                const isGreek = pantheonFilter === 'greek-all' &&
                    (entry.pantheon === 'greek' || entry.pantheon === 'greek-location');
                if (entry.pantheon !== pantheonFilter && !isGreek) return null;
            }
            return entry;
        }
        return null;
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
