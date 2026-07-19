/**
 * Brings the 39 new flagship scholars content files into exact taxonomy
 * conformance:
 *  - greek: adds kit sections from kit-sections-a.js (homeric-hymns,
 *    oracle-sites, iconography) alongside the already-present epithets.
 *  - greek-location: removes epithets/homeric-hymns/oracle-sites; adds
 *    topography, historical-sources, modern-site from kit-sections-a.js.
 *  - roman: keeps epithets + oracle-sites (the roman kit is added to the
 *    taxonomy registry by this script — see taxonomy patch below).
 *  - egyptian: renames epithets → hieroglyphic-evidence, folds oracle-sites
 *    into archaeology, adds pyramid-texts/coffin-texts/book-of-the-dead.
 *  - sanskrit: renames epithets → vedic-references; adds upanishads, puranas,
 *    mantras.
 *  - chinese: renames epithets → classical-texts, folds oracle-sites into
 *    archaeology; adds daoist-sources, buddhist-sources, calligraphy.
 *  - japanese: renames epithets → kojiki-nihonshoki, oracle-sites →
 *    shinto-sources; adds buddhist-japanese.
 *  - nahuatl: epithets → florentine-codex, oracle-sites → aztec-sources
 *    (tezcatlipoca); adds aztec-sources/colonial-sources per batch B.
 *  - yoruba: epithets → oral-tradition, oracle-sites → diaspora; adds ifa.
 *  - polynesian: epithets → oral-narratives; adds ethnographic-sources.
 * Also patches the taxonomy registry with the roman kit and appends kin
 * forms to the 39 lore pronunciation objects (pronunciation sections are
 * cleared for re-synthesis).
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const kitA = require(path.join(__dirname, 'kit-sections-a.js'));
const kitB = require(path.join(__dirname, 'kit-sections-b.js'));
const lorePath = path.join(ROOT, 'scripts', 'lore-catalog.json');
const lore = JSON.parse(fs.readFileSync(lorePath, 'utf8'));

const GREEK = ['achilleus', 'asklepios', 'atropos', 'drakon', 'monokeros', 'phanes', 'pegasos', 'seiren', 'tyche'];
const GREEK_LOC = ['delos', 'troia'];
const EGYPT = ['anubis', 'steh', 'seshat', 'hp'];
const SANSKRIT = ['amsa', 'daksa', 'dhatr', 'pusan', 'tvastr'];
const CHINESE = ['fuxi', 'guanyin', 'mengpo', 'nuwa', 'pangu', 'yanluo'];
const JAPANESE = ['hokkaido', 'honshu', 'kyushu'];
const YORUBA = ['ogun'];
const POLYNESIAN = ['tumatauenga'];

const KIN = {
  achilleus: [['Greek', 'Ἀχιλλεύς'], ['Latin', 'Achilleus'], ['English', 'Achilles'], ['Owned form', 'Achilleús']],
  asklepios: [['Greek', 'Ἀσκληπιός'], ['Latin', 'Aesculapius'], ['English', 'Asclepius'], ['Owned form', 'Asklēpiós']],
  atropos: [['Greek', 'Ἄτροπος'], ['Latin', 'Atropos'], ['Owned form', 'Átropos']],
  delos: [['Greek', 'Δῆλος'], ['Latin', 'Delos'], ['Owned form', 'Dêlos']],
  drakon: [['Greek', 'δράκων'], ['Latin', 'draco'], ['English', 'dragon'], ['Owned form', 'Drákōn']],
  monokeros: [['Greek', 'μονόκερως'], ['Latin', 'monoceros / unicornis'], ['English', 'unicorn'], ['Owned form', 'Monókerōs']],
  phanes: [['Greek', 'Φάνης'], ['Orphic title', 'Πρωτόγονος'], ['Owned form', 'Phánēs']],
  pegasos: [['Greek', 'Πήγασος'], ['Latin', 'Pegasus'], ['Owned form', 'Pḗgasos']],
  seiren: [['Greek', 'Σειρήν'], ['Latin', 'Siren'], ['French', 'sirène'], ['Owned form', 'Seirḗn']],
  troia: [['Greek', 'Τροία'], ['Latin', 'Troia'], ['Hittite', 'Wilusa'], ['Owned form', 'Troíā']],
  tyche: [['Greek', 'Τύχη'], ['Latin', 'Fortuna'], ['Owned form', 'Týchē']],
  diana: [['Latin', 'Diāna'], ['Greek twin', 'Ἄρτεμις'], ['Owned form', 'Diāna']],
  ianus: [['Latin', 'Iānus'], ['His month', 'Iānuārius (January)'], ['Owned form', 'Iānus']],
  iuno: [['Latin', 'Iūnō'], ['Greek twin', 'Ἥρα'], ['Etruscan', 'Uni'], ['Owned form', 'Iūnō']],
  iuppiter: [['Latin', 'Iūppiter'], ['Greek twin', 'Ζεύς'], ['Vedic twin', 'Dyaus-pitā'], ['Owned form', 'Iūppiter']],
  neptunus: [['Latin', 'Neptūnus'], ['Greek twin', 'Ποσειδῶν'], ['Etruscan', 'Nethuns'], ['Owned form', 'Neptūnus']],
  vulcanus: [['Latin', 'Vulcānus'], ['Greek twin', 'Ἥφαιστος'], ['Modern word', 'volcano'], ['Owned form', 'Vulcānus']],
  anubis: [['Egyptian', 'ꜣnpw'], ['Greek', 'Ἄνουβις'], ['Coptic', 'Anoup'], ['Owned form', 'ꜣnpw']],
  steh: [['Egyptian', 'stḫ'], ['Greek', 'Σήθ (Seth)'], ['Owned form', 'stḫ']],
  seshat: [['Egyptian', 'sšꜣt'], ['Conventional', 'Seshat'], ['Owned form', 'sšꜣt']],
  hp: [['Egyptian', 'ḥp'], ['Conventional', 'Hapi'], ['Greek twin', 'Νεῖλος'], ['Owned form', 'ḥp']],
  amsa: [['Devanagari', 'अंश'], ['Conventional', 'Amsha'], ['Owned form', 'Aṃśa']],
  daksa: [['Devanagari', 'दक्ष'], ['Conventional', 'Daksha'], ['Owned form', 'Dakṣa']],
  dhatr: [['Devanagari', 'धातृ'], ['Conventional', 'Dhatri'], ['Owned form', 'Dhātṛ']],
  pusan: [['Devanagari', 'पूषन्'], ['Conventional', 'Pushan'], ['Owned form', 'Pūṣan']],
  tvastr: [['Devanagari', 'त्वष्टृ'], ['Later name', 'Viśvakarman'], ['Owned form', 'Tvaṣṭṛ']],
  fuxi: [['Chinese', '伏羲'], ['Variant writing', '庖犧 (Páoxī)'], ['Owned form', 'Fúxī']],
  guanyin: [['Chinese', '觀音'], ['Full title', '觀世音 (Guānshìyīn)'], ['Sanskrit', 'Avalokiteśvara'], ['Owned form', 'Guānyīn']],
  mengpo: [['Chinese', '孟婆'], ['Owned form', 'Mèngpó']],
  nuwa: [['Chinese', '女媧'], ['Her title', '媧皇 (Wāhuáng)'], ['Owned form', 'Nǚwā']],
  pangu: [['Chinese', '盤古'], ['Owned form', 'Pángǔ']],
  yanluo: [['Chinese', '閻羅'], ['Full title', '閻羅王 (Yánluó Wáng)'], ['Sanskrit', 'Yama'], ['Japanese', 'Enma'], ['Owned form', 'Yánluó']],
  hokkaido: [['Japanese', '北海道'], ['Ainu', 'Ainu Mosir'], ['Older name', 'Ezochi'], ['Owned form', 'Hokkaidō']],
  honshu: [['Japanese', '本州'], ['Mythic name', 'Ōyashima'], ['Owned form', 'Honshū']],
  kyushu: [['Japanese', '九州'], ['Ancient name', 'Tsukushi'], ['Owned form', 'Kyūshū']],
  tezcatlipoca: [['Nahuatl', 'Tezcatlipōca'], ['His title', 'Titlacahuan'], ['Owned form', 'Tezcatlipōca']],
  xolotl: [['Nahuatl', 'Xōlōtl'], ['His animal', 'axolotl'], ['Owned form', 'Xōlōtl']],
  ogun: [['Yoruba', 'Ògún'], ['Brazil', 'Ogun / São Jorge'], ['Haiti', 'Ogou Feray'], ['Owned form', 'Ògún']],
  tumatauenga: [['Māori', 'Tūmatauenga'], ['Hawaiian twin', 'Kū'], ['NZ Army', 'Ngāti Tūmatauenga'], ['Owned form', 'Tūmatauenga']],
};

function contentFile(id) {
  return path.join(ROOT, 'platform', 'scholars', 'content', `${id}.json`);
}
function load(id) {
  return JSON.parse(fs.readFileSync(contentFile(id), 'utf8'));
}
function save(id, c) {
  fs.writeFileSync(contentFile(id), `${JSON.stringify(c, null, 2)}\n`, 'utf8');
}
function addBespoke(c, key, sec) {
  c.sections[key] = {
    body: sec.body,
    sources: sec.sources || [],
    generatedFrom: ['hand-authored'],
    bespoke: true,
  };
}
function renameSection(c, from, to) {
  if (c.sections[from]) {
    c.sections[to] = c.sections[from];
    delete c.sections[from];
  }
}
function foldInto(c, from, to) {
  const sec = c.sections[from];
  if (!sec) return;
  if (c.sections[to]) {
    c.sections[to].body = `${c.sections[to].body}\n\n${sec.body}`;
    c.sections[to].sources = [...(c.sections[to].sources || []), ...(sec.sources || [])].slice(0, 4);
  }
  delete c.sections[from];
}

let touched = 0;

for (const id of GREEK) {
  const c = load(id);
  const kit = kitA[id] || {};
  for (const [key, sec] of Object.entries(kit)) addBespoke(c, key, sec);
  save(id, c);
  touched++;
}

for (const id of GREEK_LOC) {
  const c = load(id);
  for (const k of ['epithets', 'homeric-hymns', 'oracle-sites']) delete c.sections[k];
  const kit = kitA[id] || {};
  for (const [key, sec] of Object.entries(kit)) addBespoke(c, key, sec);
  save(id, c);
  touched++;
}

for (const id of EGYPT) {
  const c = load(id);
  renameSection(c, 'epithets', 'hieroglyphic-evidence');
  foldInto(c, 'oracle-sites', 'archaeology');
  const kit = kitB[id] || {};
  for (const [key, sec] of Object.entries(kit)) addBespoke(c, key, sec);
  save(id, c);
  touched++;
}

for (const id of SANSKRIT) {
  const c = load(id);
  renameSection(c, 'epithets', 'vedic-references');
  const kit = kitB[id] || {};
  for (const [key, sec] of Object.entries(kit)) addBespoke(c, key, sec);
  save(id, c);
  touched++;
}

for (const id of CHINESE) {
  const c = load(id);
  renameSection(c, 'epithets', 'classical-texts');
  foldInto(c, 'oracle-sites', 'archaeology');
  const kit = kitB[id] || {};
  for (const [key, sec] of Object.entries(kit)) addBespoke(c, key, sec);
  save(id, c);
  touched++;
}

for (const id of JAPANESE) {
  const c = load(id);
  renameSection(c, 'epithets', 'kojiki-nihonshoki');
  renameSection(c, 'oracle-sites', 'shinto-sources');
  const kit = kitB[id] || {};
  for (const [key, sec] of Object.entries(kit)) addBespoke(c, key, sec);
  save(id, c);
  touched++;
}

{
  const c = load('tezcatlipoca');
  renameSection(c, 'epithets', 'florentine-codex');
  renameSection(c, 'oracle-sites', 'aztec-sources');
  for (const [key, sec] of Object.entries(kitB.tezcatlipoca || {})) addBespoke(c, key, sec);
  save('tezcatlipoca', c);
  touched++;
}
{
  const c = load('xolotl');
  renameSection(c, 'epithets', 'florentine-codex');
  for (const [key, sec] of Object.entries(kitB.xolotl || {})) addBespoke(c, key, sec);
  save('xolotl', c);
  touched++;
}
{
  const c = load('ogun');
  renameSection(c, 'epithets', 'oral-tradition');
  renameSection(c, 'oracle-sites', 'diaspora');
  for (const [key, sec] of Object.entries(kitB.ogun || {})) addBespoke(c, key, sec);
  save('ogun', c);
  touched++;
}
{
  const c = load('tumatauenga');
  renameSection(c, 'epithets', 'oral-narratives');
  for (const [key, sec] of Object.entries(kitB.tumatauenga || {})) addBespoke(c, key, sec);
  save('tumatauenga', c);
  touched++;
}

// Pronunciation kin forms + clear pronunciation sections for re-synthesis.
for (const [id, kin] of Object.entries(KIN)) {
  const e = lore[id];
  if (!e) throw new Error(`no lore for ${id}`);
  e.pronunciation = { ...(e.pronunciation || {}), kin: kin.map(([label, form]) => ({ label, form })) };
  const c = load(id);
  delete c.sections.pronunciation;
  save(id, c);
}
fs.writeFileSync(lorePath, `${JSON.stringify(lore, null, 2)}\n`, 'utf8');

// Roman kit into the taxonomy registry (canonical).
const taxPath = path.join(ROOT, 'docs', 'scholarly-edition', 'scholarly-section-taxonomy-v0.1.json');
const tax = JSON.parse(fs.readFileSync(taxPath, 'utf8'));
if (!tax.taxonomy.pantheonKits.kits.roman) {
  tax.taxonomy.pantheonKits.kits.roman = {
    sections: [
      { key: 'epithets', label: 'Epithets & Cognomina' },
      { key: 'oracle-sites', label: 'Sanctuaries & Cult Sites' },
    ],
  };
  fs.writeFileSync(taxPath, `${JSON.stringify(tax, null, 2)}\n`, 'utf8');
  console.log('roman kit added to taxonomy registry');
}

console.log(`kit conformance applied to ${touched} entries + kin forms for ${Object.keys(KIN).length}`);
