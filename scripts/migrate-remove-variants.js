/**
 * PUNYCODEX — Remove Duplicate Variant Entries
 * Merges v1/v2/v3 entries into parent variants, removes duplicates.
 *
 * Usage: node scripts/migrate-remove-variants.js
 */

const fs = require('fs');
const path = require('path');

// Load current lexicon
const { LEXICON } = require('../type/js/lexicon.js');

// ─── Mapping: variant ID -> { parentId, type, note } ───
const VARIANT_MAP = {
    // Greek — parents already have variants, just remove dupes
    hadesv1:   { parent: 'hades',   skipVariant: true },
    zeusv1:    { parent: 'zeus',    skipVariant: true },
    aresv1:    { parent: 'ares',    skipVariant: true },
    athenav1:  { parent: 'athena',  skipVariant: true },

    // Greek — add to parent variants
    poseidonv1:    { parent: 'poseidon',    type: 'macron-only', note: 'LSJ convention: length only, no acute' },
    hermesv1:      { parent: 'hermes',      type: 'macron-only', note: 'LSJ convention: length only, no acute' },
    aphroditev1:   { parent: 'aphrodite',   type: 'macron-only', note: 'LSJ convention: length only, no acute' },
    herav1:        { parent: 'hera',        type: 'ascii',       note: 'Modern English' },
    artemisv1:     { parent: 'artemis',     type: 'ascii',       note: 'Modern English' },
    demeterv1:     { parent: 'demeter',     type: 'ascii',       note: 'Modern English' },
    hephaistosv1:  { parent: 'hephaistos',  type: 'ascii',       note: 'Modern English' },
    hestiav1:      { parent: 'hestia',      type: 'ascii',       note: 'Modern English' },
    persephonev1:  { parent: 'persephone',  type: 'ascii',       note: 'Modern English' },
    prometheusv1:  { parent: 'prometheus',  type: 'ascii',       note: 'Modern English' },
    dionysosv1:    { parent: 'dionysos',    type: 'ascii',       note: 'Modern English' },

    // Egyptian
    rav1:      { parent: 'ra',      type: 'macron-only', note: 'Length mark only' },
    rav2:      { parent: 'ra',      type: 'alt-stress',  note: 'Acute on alpha: alternate stress' },
    osirisv1:  { parent: 'osiris',  type: 'alt-stress',  note: 'Acute on iota: alternate stress position' },
    isisv1:    { parent: 'isis',    type: 'alt-stress',  note: 'Acute on iota: alternate stress position' },
    anubisv1:  { parent: 'anubis',  type: 'alt-stress',  note: 'Acute on upsilon: alternate stress position' },
    thothv1:   { parent: 'thoth',   type: 'alt-stress',  note: 'Acute on omicron: alternate stress position' },
    amunv1:    { parent: 'amun',    type: 'alt-stress',  note: 'Alternate transliteration: Amon' },
    amunv2:    { parent: 'amun',    type: 'alt-stress',  note: 'Alternate transliteration: Amen' },
    ptahv1:    { parent: 'ptah',    type: 'ascii',       note: 'Modern English' },
    bastetv1:  { parent: 'bastet',  type: 'ascii',       note: 'Modern English' },
    sobekv1:   { parent: 'sobek',   type: 'ascii',       note: 'Modern English' },
    khnumv1:   { parent: 'khnum',   type: 'ascii',       note: 'Modern English' },
    sethv1:    { parent: 'set',     type: 'ascii',       note: 'Modern English alternate: Seth' },

    // Norse
    thorsv1:      { parent: 'thor',       type: 'alt-stress', note: 'Alternate: Thorr (length on o)' },
    odinsv1:      { parent: 'odinn',      type: 'ideal',      note: 'Eth variant: Oðinn (strict orthography)' },
    odinsv2:      { parent: 'odinn',      type: 'ascii',      note: 'Modern English: Odinn' },
    freyjasv1:    { parent: 'freyja',     type: 'ascii',      note: 'Modern English: Freya' },
    lokisv1:      { parent: 'loki',       type: 'alt-stress', note: 'Acute on o: alternate stress' },
    tyrsv1:       { parent: 'tyr',        type: 'ascii',      note: 'Modern English: Tyr' },
    baldrsv1:     { parent: 'baldr',      type: 'ascii',      note: 'Modern English: Baldur' },
    heimdallsv1:  { parent: 'heimdallr',  type: 'ascii',      note: 'Modern English: Heimdall' },

    // Sanskrit
    shivasv1:     { parent: 'shiva',     type: 'ascii',      note: 'Modern English: Shiva' },
    shivasv2:     { parent: 'shiva',     type: 'alt-stress', note: 'Alternate transliteration: Siva' },
    vishnusv1:    { parent: 'vishnu',    type: 'ascii',      note: 'Modern English: Vishnu' },
    krishnasv1:   { parent: 'krishna',   type: 'ascii',      note: 'Modern English: Krishna' },
    brahmasv1:    { parent: 'brahma',    type: 'ascii',      note: 'Modern English: Brahma' },
    ganeshasv1:   { parent: 'ganesha',   type: 'ascii',      note: 'Modern English: Ganesha' },
    suryasv1:     { parent: 'surya',     type: 'ascii',      note: 'Modern English: Surya' },
    chadrasv1:    { parent: 'chandra',   type: 'ascii',      note: 'Modern English: Chandra' },
};

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
    const rootDir = path.join(__dirname, '..');
    const sitesDir = path.join(rootDir, 'sites');

    // Build new lexicon array
    const newLexicon = [];
    const toDelete = [];
    const parentAdditions = {};

    for (const entry of LEXICON) {
        const map = VARIANT_MAP[entry.id];
        if (map) {
            // This is a duplicate variant entry
            toDelete.push(entry.id);
            if (!map.skipVariant) {
                if (!parentAdditions[map.parent]) parentAdditions[map.parent] = [];
                parentAdditions[map.parent].push({
                    unicode: entry.unicode,
                    type: map.type,
                    note: map.note
                });
            }
        } else if (entry.id === 'njordsv1') {
            // True orphan: rename to njord
            toDelete.push(entry.id);
            const renamed = { ...entry, id: 'njord', ascii: 'njord' };
            newLexicon.push(renamed);
        } else {
            newLexicon.push(entry);
        }
    }

    // Merge additions into parents
    for (const [parentId, variants] of Object.entries(parentAdditions)) {
        const parent = newLexicon.find(e => e.id === parentId);
        if (!parent) {
            console.error('Parent not found:', parentId);
            continue;
        }
        if (!parent.variants) parent.variants = [];
        // Avoid duplicates
        const existingUnicodes = new Set(parent.variants.map(v => v.unicode));
        for (const v of variants) {
            if (!existingUnicodes.has(v.unicode)) {
                parent.variants.push(v);
                existingUnicodes.add(v.unicode);
            }
        }
    }

    // ─── Write lexicon file ───
    const header = `/*\n * PUNYCODEX Lexicon\n * ${newLexicon.length} validated entries across multiple pantheons\n */\n\nconst LEXICON = [`;
    const entries = newLexicon.map(e => '  ' + formatEntry(e, 2)).join(',\n');
    const footer = `];\n\n// Node.js export for build scripts\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = { LEXICON };\n}`;
    const lexiconPath = path.join(rootDir, 'type', 'js', 'lexicon.js');
    fs.writeFileSync(lexiconPath, header + '\n' + entries + '\n' + footer, 'utf8');
    console.log('✓ Wrote lexicon.js with', newLexicon.length, 'entries');

    // ─── Sync extension ───
    const extPath = path.join(rootDir, 'extension', 'shared', 'lexicon.js');
    fs.writeFileSync(extPath, header + '\n' + entries + '\n' + footer, 'utf8');
    console.log('✓ Synced extension/shared/lexicon.js');

    // ─── Remove duplicate temple directories ───
    let removedDirs = 0;
    for (const id of toDelete) {
        const dir = path.join(sitesDir, id);
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
            removedDirs++;
        }
    }
    console.log('✓ Removed', removedDirs, 'duplicate temple directories');

    // ─── Summary ───
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Removed:', toDelete.length, 'duplicate entries');
    console.log('   New total:', newLexicon.length, 'entries');
    console.log('   Parents updated:', Object.keys(parentAdditions).length);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main();
