/**
 * PUNYCODEX — Auto-Backfill Etymology from Meaning Fields
 * Scans entry.meaning for etymology patterns and generates etymology objects.
 *
 * Usage: node scripts/backfill-etymology.js
 */

const fs = require('fs');
const path = require('path');

const { LEXICON } = require('../type/js/lexicon.js');

// ─── Pattern matchers ───

function extractProtoEtymology(entry) {
    const m = entry.meaning;
    if (!m) return null;

    // Pattern: from Proto-X *form
    const protoMatch = m.match(/from Proto-([\w-]+)\s+\*([\wēōāīūḗṓā́éóúíáḗṓḗṓẹọịạ]+)/i);
    if (protoMatch) {
        const langMap = {
            'Indo-European': 'proto-indo-european',
            'Polynesian': 'proto-polynesian',
            'Uto-Aztecan': 'proto-uto-aztecan',
            'Sino-Tibetan': 'proto-sino-tibetan',
            'Mayan': 'proto-mayan',
            'Afro-Asiatic': 'proto-afro-asiatic'
        };
        return {
            protoForm: '*' + protoMatch[2],
            protoLanguage: langMap[protoMatch[1]] || 'unknown',
            protoGloss: extractGloss(m),
            derivation: m,
            certainty: 'attested'
        };
    }

    // Pattern: from *form (Norse/Germanic implied)
    const pgmcMatch = m.match(/from\s+\*([\wōđazþjōn]+)/i);
    if (pgmcMatch && entry.pantheon === 'norse') {
        return {
            protoForm: '*' + pgmcMatch[1],
            protoLanguage: 'proto-indo-european',
            protoGloss: extractGloss(m),
            derivation: m,
            certainty: 'attested'
        };
    }

    // Pattern: from GreekWord (Greek entries)
    const greekMatch = m.match(/from\s+([Α-Ωα-ωᾶῇῷ]+)/);
    if (greekMatch && entry.pantheon === 'greek') {
        return {
            protoLanguage: 'proto-indo-european',
            protoGloss: extractGloss(m),
            derivation: m,
            certainty: 'attested'
        };
    }

    // Pattern: cognate with ...
    const cognateMatch = m.match(/cognate with\s+(.+)/i);
    if (cognateMatch) {
        const cognates = cognateMatch[1].split(/,\s+and\s+|,\s+/).map(s => s.trim()).filter(Boolean);
        return {
            protoLanguage: deriveProtoFromPantheon(entry.pantheon),
            protoGloss: extractGloss(m),
            derivation: m,
            cognates: cognates.map(c => ({ language: 'related', form: c, relationship: 'cognate' })),
            certainty: 'attested'
        };
    }

    return null;
}

function extractGloss(meaning) {
    // Take the first clause before any parenthetical
    const clean = meaning.split('(')[0].trim();
    return clean.replace(/,$/, '');
}

function deriveProtoFromPantheon(pantheon) {
    const map = {
        greek: 'proto-indo-european',
        'greek-location': 'proto-indo-european',
        norse: 'proto-indo-european',
        sanskrit: 'proto-indo-european',
        celtic: 'proto-indo-european',
        slavic: 'proto-indo-european',
        zoroastrian: 'proto-indo-european',
        egyptian: 'proto-afro-asiatic',
        phoenician: 'proto-afro-asiatic',
        polynesian: 'proto-polynesian',
        nahuatl: 'proto-uto-aztecan',
        chinese: 'proto-sino-tibetan',
        japanese: 'proto-sino-tibetan',
        buddhist: 'proto-sino-tibetan',
        taoist: 'proto-sino-tibetan',
        korean: 'proto-sino-tibetan',
        mesopotamian: 'isolate',
        yoruba: 'isolate',
        incan: 'isolate',
        hittite: 'isolate'
    };
    return map[pantheon] || 'unknown';
}

function formatString(s) {
    return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
}

function formatValue(v, indent) {
    if (v === null) return 'null';
    if (typeof v === 'string') return formatString(v);
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) {
        if (v.length === 0) return '[]';
        const inner = v.map(item => formatValue(item, indent + 2)).join(',\n' + ' '.repeat(indent + 2));
        return '[\n' + ' '.repeat(indent + 2) + inner + '\n' + ' '.repeat(indent) + ']';
    }
    if (typeof v === 'object') {
        const keys = Object.keys(v);
        if (keys.length === 0) return '{}';
        const inner = keys.map(k => ' '.repeat(indent + 2) + k + ': ' + formatValue(v[k], indent + 2)).join(',\n');
        return '{\n' + inner + '\n' + ' '.repeat(indent) + '}';
    }
    return String(v);
}

function formatEntry(entry, indent) {
    const keys = Object.keys(entry);
    const inner = keys.map(k => {
        const val = formatValue(entry[k], indent + 2);
        return ' '.repeat(indent + 2) + k + ': ' + val;
    }).join(',\n');
    return '{\n' + inner + '\n' + ' '.repeat(indent) + '}';
}

function main() {
    let updated = 0;
    const review = [];

    for (const entry of LEXICON) {
        if (entry.etymology) continue; // Skip entries already having etymology
        const etymology = extractProtoEtymology(entry);
        if (etymology) {
            entry.etymology = etymology;
            updated++;
        } else {
            review.push({ id: entry.id, meaning: entry.meaning, pantheon: entry.pantheon });
        }
    }

    // Write updated lexicon
    const header = `/*\n * PUNYCODEX Lexicon\n * ${LEXICON.length} validated entries across multiple pantheons\n */\n\nconst LEXICON = [`;
    const entries = LEXICON.map(e => '  ' + formatEntry(e, 2)).join(',\n');
    const footer = `];\n\n// Node.js export for build scripts\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = { LEXICON };\n}`;

    const rootDir = path.join(__dirname, '..');
    const lexiconPath = path.join(rootDir, 'type', 'js', 'lexicon.js');
    fs.writeFileSync(lexiconPath, header + '\n' + entries + '\n' + footer, 'utf8');

    // Sync extension
    const extPath = path.join(rootDir, 'extension', 'shared', 'lexicon.js');
    fs.writeFileSync(extPath, header + '\n' + entries + '\n' + footer, 'utf8');

    console.log('✓ Auto-backfilled', updated, 'entries with etymology data');
    console.log('✓ Review list:', review.length, 'entries without extractable etymology');

    // Write review list
    const reviewPath = path.join(rootDir, 'scripts', 'etymology-review-list.json');
    fs.writeFileSync(reviewPath, JSON.stringify(review, null, 2), 'utf8');
    console.log('✓ Review list written to scripts/etymology-review-list.json');
}

main();
