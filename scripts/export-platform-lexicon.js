/**
 * PUNICODEX — Export lexicon to platform/browser/renderer/lexicon.json
 *
 * Source of truth: type/js/lexicon.js
 *
 * GENERATED FILE — DO NOT EDIT BY HAND.
 * Run `npm run generate` to regenerate.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { domainToASCII } = require('url');

const { LEXICON } = require('../type/js/lexicon.js');

// Derive the flagship set directly from the handcrafted archetype database
// so the renderer can never drift from the site routing source of truth.
const archetypesSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(`(function(){\n${archetypesSrc}\nreturn ARCHETYPES;\n})()`);
const hasFlagship = new Set(ARCHETYPES.map(a => a.id));

function getPunycode(unicode) {
    try {
        const domain = `${unicode.toLowerCase()}.com`;
        const encoded = domainToASCII(domain);
        return encoded === domain ? null : encoded;
    } catch {
        return null;
    }
}

const pantheons = [...new Set(LEXICON.map(e => e.pantheon))].sort();

const entries = LEXICON.map(e => ({
    id: e.id,
    ascii: e.ascii,
    unicode: e.unicode,
    greek: e.greek,
    pantheon: e.pantheon,
    tier: e.tier,
    tierLabel: e.tierLabel,
    meaning: e.meaning,
    sources: e.sources,
    domain: e.domain,
    hasFlagship: hasFlagship.has(e.id) ? 1 : 0,
    punycode: getPunycode(e.unicode),
    ...(e.variants ? { variants: e.variants } : {})
}));

const breakdowns = [];
for (const e of LEXICON) {
    if (e.breakdown) {
        for (const b of e.breakdown) {
            breakdowns.push({
                entryId: e.id,
                char: b.char,
                to: b.to,
                type: b.type,
                note: b.note
            });
        }
    }
}

const output = {
    _meta: {
        generatedBy: 'scripts/export-platform-lexicon.js',
        source: 'type/js/lexicon.js',
    },
    totalEntries: entries.length,
    totalBreakdowns: breakdowns.length,
    pantheons,
    entries,
    breakdowns
};

const outPath = path.join(__dirname, '..', 'platform', 'browser', 'renderer', 'lexicon.json');
const tmpPath = `${outPath}.tmp.${process.pid}`;
fs.writeFileSync(tmpPath, JSON.stringify(output, null, 2), 'utf8');
fs.renameSync(tmpPath, outPath);
console.log(`✓ Exported ${entries.length} entries, ${breakdowns.length} breakdowns to lexicon.json`);
