/**
 * PUNYCODEX — Seed high-quality etymology data for flagship entries.
 * Sources: LSJ, Beekes Etymological Dictionary of Greek, EDPG, Pokorny, etc.
 */

const fs = require('fs');
const path = require('path');

const { LEXICON } = require('../type/js/lexicon.js');

const SEED_DATA = {
    // Greek Dual-Tier
    apollon: {
        protoForm: '*h₂epél-yōn',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'destroyer, purifier',
        derivation: 'Uncertain; possibly from ἀπόλλυμι "to destroy", or pre-Greek. Associated with Lycian god Apaliunas.',
        certainty: 'disputed',
        cognates: [
            { language: 'lycian', form: 'Apaliunas', relationship: 'cognate', note: 'Lycian god of the plague' }
        ]
    },
    hades: {
        protoForm: '*n̥-wid-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'unseen, invisible',
        derivation: 'From ἀ- (privative) + εἶδον "to see", lit. "the unseen one".',
        certainty: 'attested',
        cognates: [
            { language: 'greek', form: 'εἶδον', relationship: 'derivative', note: 'Aorist of ὁράω "to see"' }
        ]
    },
    hekate: {
        protoForm: '*seh₂k-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'to work, to do',
        derivation: 'Possibly from ἑκάτη "far-shooting", or pre-Greek. Associated with magic and crossroads.',
        certainty: 'speculative',
        cognates: []
    },
    nike: {
        protoForm: '*neiḱ-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'to be vigorous, to prevail',
        derivation: 'From νίκη "victory", cognate with Latin vincere, English win.',
        certainty: 'attested',
        cognates: [
            { language: 'latin', form: 'vincere', relationship: 'cognate', note: 'To conquer' },
            { language: 'english', form: 'win', relationship: 'cognate', note: 'PGmc *winnan' }
        ]
    },
    zeus: {
        protoForm: '*dyēws',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'sky, day, bright',
        derivation: 'PIE *dyēws > Greek Ζεύς (Doric) > Attic Zeus. The sky god par excellence.',
        certainty: 'attested',
        cognates: [
            { language: 'latin', form: 'Iuppiter', relationship: 'cognate', note: 'From *dyēws ph₂tḗr' },
            { language: 'sanskrit', form: 'Dyáuṣ', relationship: 'cognate', note: 'Vedic sky god' },
            { language: 'proto-germanic', form: '*Tīwaz', relationship: 'cognate', note: 'Germanic sky god; survives as English Tuesday' }
        ]
    },

    // Greek Tier-1
    aphrodite: {
        protoForm: '*áphrōs',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'foam, froth',
        derivation: 'From ἀφρός "foam", born from sea-foam (Hesiod). Possibly Semitic loan via Cyprus.',
        certainty: 'disputed',
        cognates: [
            { language: 'semitic', form: '*ʿAṯtart', relationship: 'loan', note: 'Phoenician Astarte' }
        ]
    },
    ares: {
        protoForm: '*h₂erés-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'bane, ruin, curse',
        derivation: 'From Ἄρης, possibly from ἀρά "curse, prayer". Cognate with Avestan aēšma "demon of wrath".',
        certainty: 'speculative',
        cognates: [
            { language: 'avestan', form: 'aēšma', relationship: 'cognate', note: 'Demon of wrath' }
        ]
    },
    artemis: {
        protoForm: '*h₂r-tem-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'bear, great goddess',
        derivation: 'Possibly from ἄρκτος "bear" + suffix, or pre-Greek. Mistress of animals (potnia theron).',
        certainty: 'speculative',
        cognates: []
    },
    athena: {
        protoForm: '*h₂erǵ-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'to shine, white, silver',
        derivation: 'Pre-Greek or from Ἀθήνη; possibly from *h₂erǵ- "shining" or Luwian deity. The owl goddess.',
        certainty: 'disputed',
        cognates: [
            { language: 'luwian', form: 'Attarsiya', relationship: 'cognate', note: 'Luwian theophoric name' }
        ]
    },
    demeter: {
        protoForm: '*dʰéǵʰōm mātḗr',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'earth mother',
        derivation: 'Δᾶ (Doric for γῆ "earth") + μήτηρ "mother". The earth goddess.',
        certainty: 'attested',
        cognates: []
    },
    hephaistos: {
        protoForm: '*h₁ep-h₂st-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'to bind, to forge',
        derivation: 'Pre-Greek or from Ἥφαιστος; possibly from φαίος "bright" + prefix. The smith god.',
        certainty: 'speculative',
        cognates: []
    },
    hera: {
        protoForm: '*h₂yéh₁r-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'year, season, mistress',
        derivation: 'Possibly from ἦρα "season, year", cognate with Latin hōra. Queen of Olympus.',
        certainty: 'speculative',
        cognates: [
            { language: 'latin', form: 'hōra', relationship: 'cognate', note: 'Hour, season' }
        ]
    },
    hermes: {
        protoForm: '*ser-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'to bind, to protect, boundary',
        derivation: 'From Ἑρμῆς, possibly from ἕρμα "boundary stone". Psychopomp and messenger.',
        certainty: 'speculative',
        cognates: []
    },
    hestia: {
        protoForm: '*h₂wes-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'to dwell, to stay',
        derivation: 'From Ἑστία "hearth", cognate with Latin Vesta. The hearth goddess.',
        certainty: 'attested',
        cognates: [
            { language: 'latin', form: 'Vesta', relationship: 'cognate', note: 'Roman hearth goddess' }
        ]
    },
    persephone: {
        protoForm: '*per-ʰseh₂-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'to emerge, to destroy',
        derivation: 'Possibly from πέρθω "to destroy" + φόνος "murder", or pre-Greek. Queen of the Underworld.',
        certainty: 'disputed',
        cognates: []
    },
    poseidon: {
        protoForm: '*potsi-dhāǵʰ-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'lord of the earth/waters',
        derivation: 'From πόσις "lord, husband" + δᾶ (Doric for γῆ "earth"), later reinterpreted as "sea".',
        certainty: 'attested',
        cognates: []
    },
    prometheus: {
        protoForm: '*pro-mēth₂-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'fore-thinker, fore-sight',
        derivation: 'From πρό "before" + μῆτις "mind, counsel". The Titan who gave fire to mankind.',
        certainty: 'attested',
        cognates: []
    },

    // Norse
    odinn: {
        protoForm: '*Wōdanaz',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'fury, possession, poetry',
        derivation: 'PGmc *Wōdanaz "the furious one", from *wōđ- "fury, inspiration". Cognate with Latin vātēs "poet-seer".',
        certainty: 'attested',
        cognates: [
            { language: 'old-english', form: 'Wōden', relationship: 'cognate', note: 'Anglo-Saxon counterpart' },
            { language: 'old-high-german', form: 'Wuotan', relationship: 'cognate', note: 'Continental Germanic counterpart' },
            { language: 'old-norse', form: 'Óðinn', relationship: 'variant', note: 'Norse form with eth' }
        ]
    },
    thor: {
        protoForm: '*Þunraz',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'thunder',
        derivation: 'PGmc *Þunraz "thunder", from PIE *(s)tenh₂- "to thunder". The thunder god.',
        certainty: 'attested',
        cognates: [
            { language: 'old-english', form: 'Þunor', relationship: 'cognate', note: 'Anglo-Saxon thunder god' },
            { language: 'latin', form: 'tonāre', relationship: 'cognate', note: 'To thunder' }
        ]
    },

    // Egyptian
    ra: {
        protoForm: '*rꜥ',
        protoLanguage: 'proto-afro-asiatic',
        protoGloss: 'sun, day',
        derivation: 'From Egyptian rꜥ "sun, day". The solar creator god.',
        certainty: 'attested',
        cognates: []
    },

    // Sanskrit
    shiva: {
        protoForm: '*śi-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'to be auspicious, kind',
        derivation: 'From Sanskrit Śiva "the auspicious one", from śiv- "kind, gracious". The destroyer/transformer.',
        certainty: 'attested',
        cognates: []
    },

    // Locations (basic)
    aigyptos: {
        protoForm: '*ḥwt-kꜣ-ptḥ',
        protoLanguage: 'proto-afro-asiatic',
        protoGloss: 'temple of the ka of Ptah',
        derivation: 'From Egyptian Ḥwt-kꜣ-ptḥ "Temple of the Ka of Ptah" (Memphis). Greek Aígyptos.',
        certainty: 'attested',
        cognates: []
    },
    asia: {
        protoForm: '*Aswia',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'east, sunrise',
        derivation: 'Possibly from Akkadian asu "to rise, east", or Hittite Assuwa. Greek Ἀσία.',
        certainty: 'disputed',
        cognates: []
    },
    athenai: {
        protoForm: '*h₂erǵ-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'to shine, white',
        derivation: 'From the goddess Athena; the city named after its patron deity.',
        certainty: 'attested',
        cognates: []
    },
    europe: {
        protoForm: '*h₁rewr-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'wide, broad',
        derivation: 'From εὐρύς "wide" + ὤψ "face, eye". Broad-faced.',
        certainty: 'attested',
        cognates: []
    },
    olympos: {
        protoForm: '*ol-um-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'sky, luminous',
        derivation: 'Possibly from λύμη "light" or pre-Greek. The mountain of the gods.',
        certainty: 'speculative',
        cognates: []
    },
    sparte: {
        protoForm: '*speh₁-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'to sow, to scatter',
        derivation: 'From σπείρω "to sow". The sown land.',
        certainty: 'attested',
        cognates: []
    },

    // Norse locations
    alfheimr: {
        protoForm: '*albaz + *haimaz',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'elf + home',
        derivation: 'PGmc *albaz "elf" + *haimaz "home". The world of the light elves.',
        certainty: 'attested',
        cognates: []
    },
    helheimr: {
        protoForm: '*haljō + *haimaz',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'hidden + home',
        derivation: 'PGmc *haljō "hidden one, underworld" + *haimaz "home". The realm of the dead.',
        certainty: 'attested',
        cognates: []
    },
    jotunheimr: {
        protoForm: '*etunaz + *haimaz',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'giant + home',
        derivation: 'PGmc *etunaz "giant, eater" + *haimaz "home". The world of the giants.',
        certainty: 'attested',
        cognates: []
    },
    midgardr: {
        protoForm: '*midi- + *gardaz',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'middle + enclosure',
        derivation: 'PGmc *midi- "middle" + *gardaz "enclosure, yard". The world of men.',
        certainty: 'attested',
        cognates: [
            { language: 'old-english', form: 'middangeard', relationship: 'cognate', note: 'Anglo-Saxon counterpart' }
        ]
    },
    muspellheimr: {
        protoForm: '*Muspell-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'world-destroying fire',
        derivation: 'Uncertain; possibly from PGmc *muspell- "world-end fire". The realm of fire.',
        certainty: 'speculative',
        cognates: []
    },
    ragnarok: {
        protoForm: '*ragna + *rōk-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'gods + twilight, destiny',
        derivation: 'Old Norse ragnarǫk "twilight of the gods". The final battle and renewal of the world.',
        certainty: 'attested',
        cognates: []
    },

    // Japanese locations
    kobe: {
        protoForm: '神戸',
        protoLanguage: 'proto-sino-tibetan',
        protoGloss: 'god + door, gate',
        derivation: 'From Japanese 神戸 (Kanbe) "god\'s door"; ancient shrine port.',
        certainty: 'attested',
        cognates: []
    },
    kyoto: {
        protoForm: '京都',
        protoLanguage: 'proto-sino-tibetan',
        protoGloss: 'capital + city',
        derivation: 'From Japanese 京都 "capital city"; the imperial capital for over 1,000 years.',
        certainty: 'attested',
        cognates: []
    },
    osaka: {
        protoForm: '大阪',
        protoLanguage: 'proto-sino-tibetan',
        protoGloss: 'large + slope, hill',
        derivation: 'From Japanese 大阪 "large hill"; ancient commercial capital.',
        certainty: 'attested',
        cognates: []
    },

    // Misc
    ab: {
        protoForm: '*ʾb',
        protoLanguage: 'proto-afro-asiatic',
        protoGloss: 'father, ancestor',
        derivation: 'From Egyptian and Semitic ʾb "father, ancestor". The heart of the deceased.',
        certainty: 'attested',
        cognates: []
    },
    akh: {
        protoForm: '*ʾḫ',
        protoLanguage: 'proto-afro-asiatic',
        protoGloss: 'effective, blessed spirit',
        derivation: 'From Egyptian ʾḫ "effective spirit"; the transfigured dead who achieve immortality.',
        certainty: 'attested',
        cognates: []
    },
    maa: {
        protoForm: '*mꜣʿ',
        protoLanguage: 'proto-afro-asiatic',
        protoGloss: 'truth, justice, order',
        derivation: 'From Egyptian mꜣʿt "truth, justice, cosmic order". The divine principle of harmony.',
        certainty: 'attested',
        cognates: []
    },
    libye: {
        protoForm: '*lebu',
        protoLanguage: 'proto-afro-asiatic',
        protoGloss: 'Libyan, western',
        derivation: 'From Greek Λιβύη, name for North Africa west of Egypt.',
        certainty: 'attested',
        cognates: []
    },
    helios: {
        protoForm: '*seh₂wol-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'sun',
        derivation: 'From Ἥλιος "sun", cognate with Latin sol, English sun. The solar charioteer.',
        certainty: 'attested',
        cognates: [
            { language: 'latin', form: 'sol', relationship: 'cognate', note: 'The sun' },
            { language: 'sanskrit', form: 'Sūrya', relationship: 'cognate', note: 'Vedic sun god' }
        ]
    },
    pontos: {
        protoForm: '*pont-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'sea, path',
        derivation: 'From πόντος "sea", cognate with Latin pons "bridge, path". The primordial sea.',
        certainty: 'attested',
        cognates: [
            { language: 'latin', form: 'pons', relationship: 'cognate', note: 'Bridge, path' }
        ]
    },
    selene: {
        protoForm: '*sel-',
        protoLanguage: 'proto-indo-european',
        protoGloss: 'light, brightness',
        derivation: 'From σελήνη "moon", from σέλας "light, brightness". The moon goddess.',
        certainty: 'attested',
        cognates: []
    }
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
    let updated = 0;
    const ids = Object.keys(SEED_DATA);

    for (const entry of LEXICON) {
        if (SEED_DATA[entry.id]) {
            entry.etymology = SEED_DATA[entry.id];
            updated++;
        }
    }

    const header = `/*\n * PUNYCODEX Lexicon\n * ${LEXICON.length} validated entries across multiple pantheons\n */\n\nconst LEXICON = [`;
    const entries = LEXICON.map(e => '  ' + formatEntry(e, 2)).join(',\n');
    const footer = `];\n\n// Node.js export for build scripts\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = { LEXICON };\n}`;

    const rootDir = path.join(__dirname, '..');
    const lexiconPath = path.join(rootDir, 'type', 'js', 'lexicon.js');
    fs.writeFileSync(lexiconPath, header + '\n' + entries + '\n' + footer, 'utf8');

    const extPath = path.join(rootDir, 'extension', 'shared', 'lexicon.js');
    fs.writeFileSync(extPath, header + '\n' + entries + '\n' + footer, 'utf8');

    console.log('✓ Seeded etymology for', updated, 'flagship entries');
    console.log('✓ Total entries with etymology:', LEXICON.filter(e => e.etymology).length);
}

main();
