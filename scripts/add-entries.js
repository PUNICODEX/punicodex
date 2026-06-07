/**
 * PUNYCODEX — Lexicon Entry Addition Helper
 * Validates and appends new entries to the lexicon.
 * Usage: node scripts/add-entries.js
 */

const fs = require('fs');
const path = require('path');

const lexiconPath = path.join(__dirname, '../type/js/lexicon.js');

// ── Read current lexicon ──────────────────────────────────
let lexiconCode = fs.readFileSync(lexiconPath, 'utf8');
const lexiconFn = new Function(lexiconCode.replace('const LEXICON', 'var LEXICON') + '; return LEXICON;');
const LEXICON = lexiconFn();

const C = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
};

const ALLOWED_PANTHEONS = ['greek', 'greek-location', 'norse', 'egyptian', 'sanskrit', 'celtic', 'mesopotamian', 'polynesian', 'japanese', 'nahuatl', 'yoruba', 'slavic', 'zoroastrian', 'incan', 'chinese', 'buddhist', 'taoist', 'korean', 'phoenician', 'hittite', 'mayan', 'canaanite', 'arabian-pagan', 'akan', 'zulu-xhosa'];
const ALLOWED_TIERS = ['dual', '1', '2'];
const ASCII_REGEX = /^[a-z]+$/;

const existingIds = new Set(LEXICON.map(e => e.id));
const existingUnicodes = new Set(LEXICON.map(e => e.unicode.toLowerCase()));
const existingAsciis = new Set(LEXICON.map(e => e.ascii.toLowerCase()));

function validateEntry(entry, i) {
    const errors = [];
    const label = entry.id || `#${i}`;

    if (!entry.id) errors.push(`[${label}] missing id`);
    if (!entry.ascii) errors.push(`[${label}] missing ascii`);
    if (!entry.unicode) errors.push(`[${label}] missing unicode`);
    if (!entry.greek) errors.push(`[${label}] missing greek`);
    if (!entry.pantheon) errors.push(`[${label}] missing pantheon`);
    if (!entry.tier) errors.push(`[${label}] missing tier`);
    if (!entry.tierLabel) errors.push(`[${label}] missing tierLabel`);
    if (!entry.domain) errors.push(`[${label}] missing domain`);
    if (!entry.meaning) errors.push(`[${label}] missing meaning`);
    if (!Array.isArray(entry.sources) || entry.sources.length === 0) errors.push(`[${label}] missing or empty sources`);
    if (!Array.isArray(entry.breakdown)) errors.push(`[${label}] missing breakdown`);

    if (entry.ascii && !ASCII_REGEX.test(entry.ascii)) {
        errors.push(`[${label}] ascii "${entry.ascii}" must be lowercase a-z only`);
    }
    if (entry.pantheon && !ALLOWED_PANTHEONS.includes(entry.pantheon)) {
        errors.push(`[${label}] pantheon "${entry.pantheon}" not allowed`);
    }
    if (entry.tier && !ALLOWED_TIERS.includes(entry.tier)) {
        errors.push(`[${label}] tier "${entry.tier}" not allowed`);
    }
    if (entry.unicode && entry.unicode !== entry.unicode.normalize('NFC')) {
        errors.push(`[${label}] unicode "${entry.unicode}" is not NFC-normalized`);
    }
    if (entry.id && existingIds.has(entry.id)) {
        errors.push(`[${label}] duplicate id: ${entry.id}`);
    }
    if (entry.unicode && existingUnicodes.has(entry.unicode.toLowerCase())) {
        errors.push(`[${label}] duplicate unicode: ${entry.unicode}`);
    }

    // Breakdown validation
    if (entry.breakdown && entry.ascii) {
        if (entry.breakdown.length !== entry.ascii.length) {
            errors.push(`[${label}] breakdown length (${entry.breakdown.length}) != ascii length (${entry.ascii.length})`);
        }
        entry.breakdown.forEach((step, j) => {
            if (!step.char) errors.push(`[${label}] breakdown[${j}] missing char`);
            if (step.to === undefined) errors.push(`[${label}] breakdown[${j}] missing to`);
            if (!step.type) errors.push(`[${label}] breakdown[${j}] missing type`);
            if (!step.note) errors.push(`[${label}] breakdown[${j}] missing note`);
            if (!['stress', 'length', 'dual', 'special', 'drop', 'merge', 'same'].includes(step.type)) {
                errors.push(`[${label}] breakdown[${j}] unknown type "${step.type}"`);
            }
            const expectedChar = entry.ascii[j];
            if (step.char && step.char.toLowerCase() !== expectedChar) {
                errors.push(`[${label}] breakdown[${j}] char "${step.char}" doesn't match ascii[${j}] "${expectedChar}"`);
            }
        });

        // Reconstruction check
        const reconstructed = entry.breakdown.map(s => s.to).join('').normalize('NFC');
        if (reconstructed !== entry.unicode) {
            errors.push(`[${label}] breakdown reconstructs to "${reconstructed}" but unicode is "${entry.unicode}"`);
        }
    }

    return errors;
}

function addEntries(newEntries) {
    let fail = 0;
    let pass = 0;
    const validEntries = [];

    newEntries.forEach((entry, i) => {
        const errors = validateEntry(entry, i);
        if (errors.length > 0) {
            fail++;
            errors.forEach(e => console.log(`  ${C.red}✗${C.reset} ${e}`));
        } else {
            pass++;
            validEntries.push(entry);
        }
    });

    console.log(`\nValidation: ${C.green}${pass} passed${C.reset}, ${C.red}${fail} failed${C.reset}`);

    if (fail > 0) {
        console.log(`${C.red}Aborting — fix errors before adding.${C.reset}`);
        process.exit(1);
    }

    // Append to lexicon file
    // Find the last entry's closing brace and insert before the final `];`
    const insertMarker = '];';
    const lastIndex = lexiconCode.lastIndexOf(insertMarker);
    if (lastIndex === -1) {
        console.log(`${C.red}Could not find insertion point in lexicon.js${C.reset}`);
        process.exit(1);
    }

    const entryBlocks = validEntries.map(e => {
        const breakdownStr = e.breakdown.map(step =>
            `      { char: '${step.char}', to: '${step.to}', type: '${step.type}', note: '${step.note.replace(/'/g, "\\'")}' }`
        ).join(',\n');

        return `  {
    id: '${e.id}',
    ascii: '${e.ascii}',
    unicode: '${e.unicode}',
    greek: '${e.greek}',
    pantheon: '${e.pantheon}',
    tier: '${e.tier}',
    tierLabel: '${e.tierLabel}',
    domain: '${e.domain.replace(/'/g, "\\'")}',
    meaning: '${e.meaning.replace(/'/g, "\\'")}',
    sources: [${e.sources.map(s => `'${s}'`).join(', ')}],
    breakdown: [
${breakdownStr}
    ]
  }`;
    }).join(',\n');

    const newCode = lexiconCode.slice(0, lastIndex) + ',\n' + entryBlocks + '\n' + lexiconCode.slice(lastIndex);
    fs.writeFileSync(lexiconPath, newCode, 'utf8');

    console.log(`${C.green}✓ Added ${validEntries.length} entries to lexicon${C.reset}`);
    console.log(`${C.green}✓ Total lexicon size: ${LEXICON.length + validEntries.length}${C.reset}`);
}

// Export for use by other scripts
module.exports = { addEntries, validateEntry, ALLOWED_PANTHEONS };

// If run directly, require a batch file
if (require.main === module) {
    const batchFile = process.argv[2];
    if (!batchFile) {
        console.log('Usage: node scripts/add-entries.js <batch-file.js>');
        process.exit(1);
    }
    const batchPath = path.resolve(batchFile);
    if (!fs.existsSync(batchPath)) {
        console.log(`Batch file not found: ${batchPath}`);
        process.exit(1);
    }
    const batch = require(batchPath);
    if (!Array.isArray(batch.entries)) {
        console.log('Batch file must export { entries: [...] }');
        process.exit(1);
    }
    addEntries(batch.entries);
}
