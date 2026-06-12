/**
 * Export lexicon to platform/browser/renderer/lexicon.json
 */
const fs = require('fs');
const path = require('path');
const { domainToASCII } = require('url');

const { LEXICON } = require('../type/js/lexicon.js');

const hasFlagship = new Set([
    'ab','aigyptos','akh','alfheimr','aphrodite','apollon','ares','artemis',
    'asia','athena','athenai','atlas','delphoi','demeter','europe','gaia',
    'hades','hekate','helheimr','helios','hephaistos','hera','hermes',
    'hestia','jotunheimr','ker','kobe','kyoto','libye','maa','medousa',
    'midgardr','muspellheimr','nike','odinn','olympos','osaka','persephone',
    'pontos','poseidon','prometheus','ra','ragnarok','selene','shiva',
    'sparte','thor','zeus',
    'el','baal','anat','asherah','kronos','enlil','ishtar','typhon',
    'chaos','dionysos','maat','sia','shu','tartaros',
    'aether','astart','ba','enki','eros','ganesha','heka','horus','kali',
    'prajapati','rta','vishnu'
]);

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
    exportedAt: new Date().toISOString(),
    totalEntries: entries.length,
    totalBreakdowns: breakdowns.length,
    pantheons,
    entries,
    breakdowns
};

const outPath = path.join(__dirname, '..', 'platform', 'browser', 'renderer', 'lexicon.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`✓ Exported ${entries.length} entries, ${breakdowns.length} breakdowns to lexicon.json`);
