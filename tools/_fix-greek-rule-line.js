// One-off backfill: replace the unconditional Greek "-ē is never silent" rule
// line with the pitch-accent line on Greek temples whose names do not end in
// -ē. Matches the generator fix in scripts/create-flagship.js (greekRuleLine).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function loadGlobal(file, name) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const sandbox = { window: {}, module: { exports: {} } };
  const fn = new Function('window', 'module', src + `\nreturn typeof ${name} !== 'undefined' ? ${name} : (module.exports && module.exports.${name});`);
  const v = fn(sandbox.window, sandbox.module);
  return v || sandbox.window[name] || sandbox.module.exports;
}

const lexicon = loadGlobal('type/js/lexicon.js', 'LEXICON');
const archetypes = loadGlobal('js/archetypes-v2.js', 'ARCHETYPES');

const OLD_LINE = 'Final -ē is never silent in Greek — every vowel is sounded.';
const NEW_LINE = 'The accent marks pitch, not volume — the acute is a rise, the circumflex a rise-and-fall.';

let changed = 0;
let kept = 0;
let missing = 0;

for (const a of archetypes) {
  const entry = lexicon.find((e) => e.id === a.id);
  if (!entry) continue;
  if (entry.pantheon !== 'greek' && entry.pantheon !== 'greek-location') continue;
  const file = path.join(ROOT, 'sites', a.id, 'index.html');
  if (!fs.existsSync(file)) { missing++; continue; }
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes(OLD_LINE)) continue;
  const endsInLongE = entry.unicode.normalize('NFD').endsWith('e\u0304');
  if (endsInLongE) { kept++; continue; }
  if (!html.includes(NEW_LINE)) {
    fs.writeFileSync(file, html.split(OLD_LINE).join(NEW_LINE));
    changed++;
  }
}

console.log(`changed=${changed} kept(-ē names)=${kept} missing=${missing}`);
