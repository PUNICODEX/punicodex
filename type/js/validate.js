/**
 * PÚNYCODEX Type — Lexicon & Engine Validation Suite
 * Run: node type/js/validate.js
 * Exit code 0 = all passed, 1 = any failed
 */

const fs = require('fs');
const path = require('path');

// ── Load lexicon ──────────────────────────────────────────
const lexiconPath = path.join(__dirname, 'lexicon.js');
const lexiconCode = fs.readFileSync(lexiconPath, 'utf8').replace('const LEXICON', 'var LEXICON');
const lexiconFn = new Function(lexiconCode + '; return LEXICON;');
const LEXICON = lexiconFn();

// ── ANSI colors ───────────────────────────────────────────
const C = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
};

let pass = 0;
let fail = 0;

function assert(condition, message) {
    if (condition) {
        pass++;
    } else {
        fail++;
        console.log(`  ${C.red}✗${C.reset} ${message}`);
    }
}

function section(name) {
    console.log(`\n${C.cyan}▸ ${name}${C.reset}`);
}

// ═══════════════════════════════════════════════════════════
// 1. SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════
section('Schema Validation');

const REQUIRED_FIELDS = ['id', 'ascii', 'unicode', 'greek', 'pantheon', 'tier', 'tierLabel', 'domain', 'meaning', 'sources', 'breakdown'];
const ALLOWED_PANTHEONS = ['greek', 'greek-location', 'norse', 'egyptian', 'sanskrit', 'celtic', 'mesopotamian', 'polynesian', 'japanese', 'nahuatl', 'yoruba', 'slavic', 'zoroastrian', 'incan', 'chinese', 'buddhist', 'taoist', 'korean', 'phoenician', 'hittite'];
const ALLOWED_TIERS = ['dual', '1', '2'];
const ASCII_REGEX = /^[a-z]+$/;

LEXICON.forEach((entry, i) => {
    const label = `${entry.id || `#${i}`}`;

    REQUIRED_FIELDS.forEach(field => {
        assert(entry[field] !== undefined && entry[field] !== null,
            `[${label}] missing required field: ${field}`);
    });

    if (entry.ascii !== undefined) {
        assert(ASCII_REGEX.test(entry.ascii),
            `[${label}] ascii "${entry.ascii}" must be lowercase a-z only`);
    }

    if (entry.pantheon !== undefined) {
        assert(ALLOWED_PANTHEONS.includes(entry.pantheon),
            `[${label}] pantheon "${entry.pantheon}" not in allowed set`);
    }

    if (entry.tier !== undefined) {
        assert(ALLOWED_TIERS.includes(entry.tier),
            `[${label}] tier "${entry.tier}" not in allowed set`);
    }

    // Tier label consistency
    if (entry.tier === 'dual') {
        assert(entry.tierLabel === 'Dual-Tier',
            `[${label}] dual-tier must have tierLabel "Dual-Tier"`);
    } else if (entry.tier === '1') {
        assert(entry.tierLabel === 'Tier 1',
            `[${label}] tier-1 must have tierLabel "Tier 1"`);
    } else if (entry.tier === '2') {
        assert(entry.tierLabel === 'Tier 2',
            `[${label}] tier-2 must have tierLabel "Tier 2"`);
    }

    // Unicode NFC normalization
    if (entry.unicode) {
        const nfc = entry.unicode.normalize('NFC');
        assert(entry.unicode === nfc,
            `[${label}] unicode "${entry.unicode}" is not NFC-normalized`);
    }

    // Greek field check
    if (entry.greek && entry.greek !== '—') {
        assert(/[\u0370-\u03FF\u1F00-\u1FFF]/.test(entry.greek) || /[\u0900-\u097F]/.test(entry.greek) || /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(entry.greek),
            `[${label}] greek/original script "${entry.greek}" doesn't contain Greek, Devanagari, or CJK blocks`);
    }

    // Sources check
    if (Array.isArray(entry.sources)) {
        assert(entry.sources.length > 0, `[${label}] sources array must not be empty`);
        entry.sources.forEach((src, k) => {
            assert(typeof src === 'string' && src.length > 0,
                `[${label}] sources[${k}] must be a non-empty string`);
        });
    } else {
        assert(false, `[${label}] sources must be an array`);
    }

    // Breakdown integrity
    if (Array.isArray(entry.breakdown)) {
        assert(entry.breakdown.length === entry.ascii.length,
            `[${label}] breakdown length (${entry.breakdown.length}) != ascii length (${entry.ascii.length})`);

        entry.breakdown.forEach((step, j) => {
            assert(step.char !== undefined,
                `[${label}] breakdown[${j}] missing "char"`);
            assert(step.to !== undefined,
                `[${label}] breakdown[${j}] missing "to"`);
            assert(step.type !== undefined,
                `[${label}] breakdown[${j}] missing "type"`);
            assert(step.note !== undefined,
                `[${label}] breakdown[${j}] missing "note"`);
            assert(['stress', 'length', 'dual', 'special', 'drop', 'merge', 'same'].includes(step.type),
                `[${label}] breakdown[${j}] unknown type "${step.type}"`);

            // Input char must match the corresponding ascii character (case-insensitive)
            const expectedChar = entry.ascii[j].toLowerCase();
            assert(step.char.toLowerCase() === expectedChar,
                `[${label}] breakdown[${j}] char "${step.char}" doesn't match ascii[${j}] "${entry.ascii[j]}"`);
        });
    }
});

// ═══════════════════════════════════════════════════════════
// 2. UNIQUENESS
// ═══════════════════════════════════════════════════════════
section('Uniqueness Checks');

const ids = new Set();
const asciis = new Set();
const unicodes = new Set();

LEXICON.forEach(entry => {
    assert(!ids.has(entry.id), `duplicate id: ${entry.id}`);
    ids.add(entry.id);

    // NOTE: Duplicate ASCII is allowed for spelling variants (same ASCII, different Unicode)
    asciis.add(entry.ascii);

    assert(!unicodes.has(entry.unicode), `duplicate unicode: ${entry.unicode} (${entry.id})`);
    unicodes.add(entry.unicode);
});

// ═══════════════════════════════════════════════════════════
// 3. TRIE INTEGRITY
// ═══════════════════════════════════════════════════════════
section('Trie Integrity');

class TrieNode {
    constructor() {
        this.children = {};
        this.isEnd = false;
        this.entries = [];
    }
}

function buildTrie(lexicon) {
    const root = new TrieNode();
    lexicon.forEach(entry => {
        const ascii = entry.ascii.toLowerCase();
        let node = root;
        for (const char of ascii) {
            if (!node.children[char]) node.children[char] = new TrieNode();
            node = node.children[char];
        }
        node.isEnd = true;
        node.entries.push(entry);
    });
    return root;
}

const trie = buildTrie(LEXICON);

function getNodeForPrefix(prefix) {
    let node = trie;
    for (const char of prefix.toLowerCase()) {
        if (!node.children[char]) return null;
        node = node.children[char];
    }
    return node;
}

// Every entry must be reachable
LEXICON.forEach(entry => {
    const node = getNodeForPrefix(entry.ascii);
    assert(node !== null, `[${entry.id}] not reachable in trie`);
    assert(node.isEnd === true, `[${entry.id}] trie node not marked as end`);
    assert(node.entries.some(e => e.id === entry.id), `[${entry.id}] trie node missing entry`);
});

// Prefix reachability: every prefix of every entry must be reachable
LEXICON.forEach(entry => {
    for (let i = 1; i < entry.ascii.length; i++) {
        const prefix = entry.ascii.slice(0, i);
        const node = getNodeForPrefix(prefix);
        assert(node !== null, `[${entry.id}] prefix "${prefix}" not reachable`);
    }
});

// ═══════════════════════════════════════════════════════════
// 4. COMPLETION CORRECTNESS
// ═══════════════════════════════════════════════════════════
section('Completion Correctness');

function getCompletions(prefix, limit = Infinity) {
    const node = getNodeForPrefix(prefix);
    if (!node) return [];
    const entries = new Set();
    function collect(n) {
        for (const e of n.entries) entries.add(e);
        for (const child of Object.values(n.children)) collect(child);
    }
    collect(node);
    return Array.from(entries).slice(0, limit);
}

// Every entry must be findable as a completion of its own full ascii
LEXICON.forEach(entry => {
    const completions = getCompletions(entry.ascii);
    const found = completions.some(c => c.id === entry.id);
    assert(found, `[${entry.id}] not found in completions of its own ascii`);
});

// Empty prefix should return all entries
const allCompletions = getCompletions('');
assert(allCompletions.length === LEXICON.length,
    `empty prefix returned ${allCompletions.length} entries, expected ${LEXICON.length}`);

// Invalid prefix should return empty
const noCompletions = getCompletions('xyz');
assert(noCompletions.length === 0,
    `invalid prefix "xyz" returned ${noCompletions.length} entries, expected 0`);

// ═══════════════════════════════════════════════════════════
// 5. UNICODE RENDERABILITY
// ═══════════════════════════════════════════════════════════
section('Unicode Renderability');

LEXICON.forEach(entry => {
    const codePoints = [...entry.unicode];
    codePoints.forEach((cp, i) => {
        const code = cp.codePointAt(0);
        // Check for replacement character (indicates encoding issue)
        assert(code !== 0xFFFD,
            `[${entry.id}] unicode char at pos ${i} is replacement char (encoding corruption)`);
        // Check for control characters
        assert(!(code >= 0x00 && code <= 0x1F) && !(code >= 0x7F && code <= 0x9F),
            `[${entry.id}] unicode char at pos ${i} is a control character`);
    });
});

// ═══════════════════════════════════════════════════════════
// 6. COUNTS
// ═══════════════════════════════════════════════════════════
section('Counts');

const counts = {};
LEXICON.forEach(e => { counts[e.pantheon] = (counts[e.pantheon] || 0) + 1; });

console.log(`  ${C.dim}Total entries: ${LEXICON.length}${C.reset}`);
Object.entries(counts).forEach(([p, c]) => {
    console.log(`  ${C.dim}${p}: ${C.reset}${c}`);
});

// ═══════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(50)}`);
if (fail === 0) {
    console.log(`${C.green}✓ All ${pass} assertions passed${C.reset}`);
    process.exit(0);
} else {
    console.log(`${C.red}✗ ${fail} failed, ${pass} passed${C.reset}`);
    process.exit(1);
}
