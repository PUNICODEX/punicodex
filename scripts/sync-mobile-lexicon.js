/**
 * Sync mobile/shared/lexicon.js from type/js/lexicon.js
 * Preserves the 255-entry mobile subset but pulls correct unicode, variants, greek, etc.
 */
const fs = require('fs');
const path = require('path');

const MAIN_LEXICON = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');
const MOBILE_LEXICON = path.join(__dirname, '..', 'mobile', 'shared', 'lexicon.js');

function extractLexicon(src) {
    const match = src.match(/const\s+LEXICON\s*=\s*(\[.*?\]);/s);
    if (!match) throw new Error('Could not find LEXICON array');
    return eval(match[1]);
}

const main = extractLexicon(fs.readFileSync(MAIN_LEXICON, 'utf8'));
const mobile = extractLexicon(fs.readFileSync(MOBILE_LEXICON, 'utf8'));

const mainById = new Map(main.map(e => [e.id, e]));
const mobileIds = new Set(mobile.map(e => e.id));

// Fields to preserve from main lexicon into mobile
const KEEP_FIELDS = [
    'id', 'ascii', 'unicode', 'greek', 'pantheon', 'tier', 'tierLabel',
    'domain', 'meaning', 'sources', 'variants', 'breakdown'
];

const synced = [];
let fixed = 0;
let addedVariants = 0;

for (const mobEntry of mobile) {
    const mainEntry = mainById.get(mobEntry.id);
    if (!mainEntry) {
        console.warn(`Warning: ${mobEntry.id} not found in main lexicon, keeping mobile version`);
        synced.push(mobEntry);
        continue;
    }

    const out = {};
    for (const f of KEEP_FIELDS) {
        if (mainEntry[f] !== undefined) out[f] = mainEntry[f];
    }

    if (mainEntry.unicode !== mobEntry.unicode) {
        console.log(`Fix unicode: ${mobEntry.id}: "${mobEntry.unicode}" → "${mainEntry.unicode}"`);
        fixed++;
    }
    if (mainEntry.variants && !mobEntry.variants) {
        console.log(`Add variants: ${mobEntry.id} (${mainEntry.variants.length} forms)`);
        addedVariants++;
    }

    synced.push(out);
}

// Build output JS
const outLines = [
    'const LEXICON = ' + JSON.stringify(synced, null, 2) + ';',
    '',
    'if (typeof module !== "undefined" && module.exports) {',
    '    module.exports = { LEXICON };',
    '}',
    ''
];

fs.writeFileSync(MOBILE_LEXICON, outLines.join('\n'), 'utf8');
console.log(`\nSynced ${synced.length} entries`);
console.log(`Fixed unicode: ${fixed}`);
console.log(`Added variants: ${addedVariants}`);
