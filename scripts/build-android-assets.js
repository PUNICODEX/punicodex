/**
 * Build Android keyboard assets from JS lexicon/directory.
 * Outputs JSON files to android/app/src/main/assets/shared/
 */
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'shared');

// Ensure output directory exists
if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Load lexicon
const lexiconPath = path.join(__dirname, '..', 'mobile', 'shared', 'lexicon.js');
const lexiconSrc = fs.readFileSync(lexiconPath, 'utf8');

// Extract LEXICON array from the JS file
// The lexicon.js exports: const LEXICON = [...];
const lexiconMatch = lexiconSrc.match(/const\s+LEXICON\s*=\s*(\[.*?\]);/s);
if (!lexiconMatch) {
    console.error('Could not find LEXICON array in lexicon.js');
    process.exit(1);
}

let LEXICON;
try {
    LEXICON = eval(lexiconMatch[1]);
} catch (e) {
    console.error('Failed to parse LEXICON:', e.message);
    process.exit(1);
}

// Filter and slim lexicon for keyboard (keep fields needed for suggestions + variant display)
const slimLexicon = LEXICON.map(e => ({
    ascii: e.ascii,
    unicode: e.unicode,
    greek: e.greek || "",
    pantheon: e.pantheon,
    tier: e.tier,
    id: e.id || e.ascii,
    variants: (e.variants || []).map(v => ({
        unicode: v.unicode,
        type: v.type || "variant",
        note: v.note || ""
    }))
}));

fs.writeFileSync(path.join(OUT_DIR, 'lexicon.json'), JSON.stringify(slimLexicon), 'utf8');
console.log(`Wrote ${slimLexicon.length} lexicon entries`);

// Load unicode directory and build keyboard palette
const dirPath = path.join(__dirname, '..', 'mobile', 'shared', 'unicode-dir.js');
const dirSrc = fs.readFileSync(dirPath, 'utf8');

const dirMatch = dirSrc.match(/const\s+UNICODE_DIR\s*=\s*(\[.*?\]);/s);
if (!dirMatch) {
    console.error('Could not find UNICODE_DIR array in unicode-dir.js');
    process.exit(1);
}

let UNICODE_DIR;
try {
    UNICODE_DIR = eval(dirMatch[1]);
} catch (e) {
    console.error('Failed to parse UNICODE_DIR:', e.message);
    process.exit(1);
}

// Curate keyboard palette: all categories with sensible per-category limits
const PALETTE_LIMITS = {
    latin: 120,
    greek: 80,
    cyrillic: 40,
    math: 60,
    arrows: 30,
    symbols: 40,
    currency: 30,
    supsub: 25,
    roman: 32,
    enclosed: 60,
    runic: 27,
    hieroglyphs: 20,
    alchemical: 20,
    // Previously missing categories — now included
    baybayin: 21,
    blocks: 22,
    box: 30,
    braille: 30,
    combining: 30,
    cuneiform: 40,
    dingbats: 40,
    domino: 30,
    gothic: 27,
    letterlike: 30,
    linearb: 30,
    punctuation: 40,
    shapes: 30,
};

const PALETTE_CATEGORIES = new Set(Object.keys(PALETTE_LIMITS));
const palette = [];
const catCounts = {};

for (const e of UNICODE_DIR) {
    if (!PALETTE_CATEGORIES.has(e.category)) continue;
    const limit = PALETTE_LIMITS[e.category];
    catCounts[e.category] = (catCounts[e.category] || 0);
    if (catCounts[e.category] >= limit) continue;
    catCounts[e.category]++;
    palette.push({
        char: e.char,
        name: e.name,
        category: e.category,
        keywords: e.keywords
    });
}

fs.writeFileSync(path.join(OUT_DIR, 'keyboard-palette.json'), JSON.stringify(palette), 'utf8');
console.log(`Wrote ${palette.length} palette entries`);
console.log(`Categories in palette:`);
for (const [cat, count] of Object.entries(catCounts).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${cat}: ${count}`);
}
