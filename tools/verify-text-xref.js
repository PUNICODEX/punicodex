#!/usr/bin/env node
/**
 * One-off verification for the Theogony cross-reference table used by
 * scripts/generate-text-pages.js. For every (templeId, normalizedForm) pair:
 *   - the form must appear as a CAPITALIZED whole word in grc.json;
 *   - report hit counts and line numbers;
 *   - flag lowercase-only occurrences (not linked, informational);
 *   - flag normalized collisions between two different surface words.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const grc = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'platform', 'texts', 'theogony', 'grc.json'), 'utf8')
);
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(`(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`);
const BUILT = new Set(ARCHETYPES.filter((a) => a.built).map((a) => a.id));
const LEX_IDS = new Set(LEXICON.map((e) => e.id));

// The table under test — keep in sync with generate-text-pages.js XREF.
const XREF = [
  ['chaos', ['χαος', 'χαεος']],
  ['gaia', ['γαια', 'γαιης', 'γαιαν', 'γαιη', 'γης', 'γαι']],
  ['tartaros', ['ταρταρον', 'ταρταρα', 'ταρταρου']],
  ['eros', ['ερος']],
  ['erebus', ['ερεβος', 'ερεβει', 'ερεβευσφιν']],
  ['nyx', ['νυξ', 'νυκτος', 'νυκτα']],
  ['aither', ['αιθηρ']],
  ['hemera', ['ημερη']],
  ['ouranos', ['ουρανος', 'ουρανου', 'ουρανον', 'ουρανω']],
  ['pontos', ['ποντος', 'ποντον']],
  ['hypnos', ['υπνον', 'υπνος']],
  ['thanatos', ['θανατον', 'θανατος', 'θανατοιο']],
  ['momos', ['μωμον']],
  ['oizys', ['οιζυν']],
  ['moirai', ['μοιρας']],
  ['clotho', ['κλωθω']],
  ['lachesis', ['λαχεσιν']],
  ['atropos', ['ατροπον']],
  ['ker', ['κηρα', 'κηρας']],
  ['nemesis', ['νεμεσιν']],
  ['eris', ['εριν', 'ερις']],
  ['ponos', ['πονον']],
  ['lethe', ['ληθην']],
  ['limos', ['λιμον']],
  ['geras', ['γηρας']],
  ['iris', ['ιριν', 'ιρις']],
  ['harpyia', ['αρπυιας']],
  ['medousa', ['μεδουσα']],
  ['pegasos', ['πηγασος']],
  ['thetis', ['θετις']],
  ['tyche', ['τυχη']],
  ['calypso', ['καλυψω']],
  ['asia', ['ασιη']],
  ['erato', ['ερατω']],
  ['ourania', ['ουρανιη']],
  ['styx', ['στυξ', 'στυγος']],
  ['cerberus', ['κερβερον']],
  ['hydra', ['υδρην']],
  ['chimaira', ['χιμαιραν']],
  ['sphinx', ['φικ']],
  ['nemeanlion', ['νεμειαιον']],
  ['bellerophon', ['βελλεροφοντης']],
  ['okeanos', ['ωκεανοιο', 'ωκεανου', 'ωκεανον', 'ωκεανω']],
  ['tethys', ['τηθυς', 'τηθυν', 'τηθυος']],
  ['hyperion', ['υπεριονα', 'υπεριονος']],
  ['theia', ['θειαν']],
  ['kreios', ['κριον', 'κριω']],
  ['coeus', ['κοιον', 'κοιου']],
  ['iapetus', ['ιαπετον', 'ιαπετος', 'ιαπετοιο']],
  ['themis', ['θεμιν']],
  ['mnemosyne', ['μνημοσυνη', 'μνημοσυνην', 'μνημοσυνης']],
  ['phoebe', ['φοιβην']],
  ['kronos', ['κρονος', 'κρονου', 'κρονον', 'κρονω']],
  ['rhea', ['ρειαν', 'ρειη', 'ρεην']],
  ['helios', ['ηελιον', 'ηελιος', 'ηελιοιο', 'ηελιου']],
  ['selene', ['σεληνην']],
  ['eos', ['ηω', 'ηως', 'ηους', 'ηριγενεια']],
  ['boreas', ['βορεην', 'βορεω']],
  ['notos', ['νοτον', 'νοτου']],
  ['zephyros', ['ζεφυρον', 'ζεφυροιο']],
  ['leto', ['λητω']],
  ['hekate', ['εκατην', 'εκατη']],
  ['atlas', ['ατλαντα', 'ατλας']],
  ['prometheus', ['προμηθεα', 'προμηθευς']],
  ['epimetheus', ['επιμηθεα']],
  ['nike', ['νικην']],
  ['zeus', ['ζευς', 'διος', 'διι', 'δια', 'δι', 'ζηνος', 'ζηνα', 'ζηνι', 'ζην']],
  ['hera', ['ηρην', 'ηρη', 'ηρης']],
  [
    'poseidon',
    [
      'ποσειδαωνα',
      'ποσειδεων',
      'εννοσιγαιω',
      'εννοσιγαιον',
      'εννοσιγαιος',
      'εννοσιγαιου',
      'κυανοχαιτης',
    ],
  ],
  ['hades', ['αιδεω', 'αιδην', 'αιδης', 'αιδωνευς']],
  ['hestia', ['ιστιην']],
  ['demeter', ['δημητρα', 'δημητρος', 'δημητηρ']],
  ['athena', ['αθηνην', 'αθηνη', 'αθηναιης', 'ατρυτωνην', 'τριτογενειαν']],
  ['apollon', ['απολλωνα', 'απολλωνος', 'απολλωνι', 'φοιβον']],
  ['artemis', ['αρτεμιν']],
  ['aphrodite', ['αφροδιτην', 'αφροδιτης', 'αφροδιτη', 'κυθερειαν', 'κυθερεια', 'κυπρογενεα']],
  ['ares', ['αρηι', 'αρηα']],
  ['hephaistos', ['ηφαιστου', 'ηφαιστον', 'ηφαιστος']],
  ['hermes', ['ερμη', 'ερμην']],
  ['dionysos', ['διωνυσον', 'διωνυσος']],
  ['persephone', ['περσεφονην', 'περσεφονειης']],
  ['hebe', ['ηβην']],
  ['eileithyia', ['ειλειθυιαν']],
  ['olympos', ['ολυμπου', 'ολυμπον', 'ολυμπος', 'ουλυμποιο', 'ουλυμπω', 'ουλυμπονδε']],
  ['kleio', ['κλειω']],
  ['euterpe', ['ευτερπη']],
  ['thaleia', ['θαλεια']],
  ['melpomene', ['μελπομενη']],
  ['terpsichore', ['τερψιχορη']],
  ['polyhymnia', ['πολυμνια']],
  ['calliope', ['καλλιοπη']],
  ['typhon', ['τυφαονα', 'τυφωεα', 'τυφωεος']],
  ['herakles', ['ηρακληειη', 'ηρακλεης', 'ηρακληος', 'ηρακληειης', 'ηρακληειην']],
  ['phobos', ['φοβον']],
  ['deimos', ['δειμον']],
  ['eirene', ['ειρηνην']],
  ['cadmus', ['καδμος', 'καδμω']],
  ['alcmene', ['αλκμηνη', 'αλκμηνης']],
  ['ariadne', ['αριαδνην']],
  ['minos', ['μινωος']],
  ['circe', ['κιρκην', 'κιρκη']],
  ['aetes', ['αιητην', 'αιητης', 'αιηταο', 'αιητεω']],
  ['medea', ['μηδειαν']],
  ['iason', ['ιησονι']],
  ['peleus', ['πηλει']],
  ['aineias', ['αινειαν']],
  ['odysseus', ['οδυσσηος', 'οδυσηι']],
  ['phaethon', ['φαεθοντα']],
  ['chiron', ['χειρων']],
  ['agave', ['αγαυην']],
];

function norm(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ͂ͅ]/g, '')
    .replace(/[ʼ]/g, '')
    .toLowerCase();
}

const TRIM = /^[;,.:!?()·,.\u0387\u2014—-]+|[;,.:!?()·,.\u0387\u2014—-]+$/g;

// Build the full normalized token inventory: norm -> [{surface, n, capital}]
const tokens = [];
for (const { n, text } of grc.lines) {
  for (const raw of text.split(/\s+/)) {
    const surface = raw.replace(TRIM, '');
    if (!surface) continue;
    // Capital test: decompose, then check the base letter. Precomposed
    // polytonic capitals decompose to a capital base + combining marks
    // (Ἔ → Ε + oxia); lowercase polytonics decompose to lowercase bases.
    const base = surface.normalize('NFD').charAt(0);
    const cp = base.codePointAt(0);
    const capital = (cp >= 0x391 && cp <= 0x3a9) || (cp >= 0x386 && cp <= 0x38f);
    tokens.push({ norm: norm(surface), surface, n, capital });
  }
}
const byNorm = new Map();
for (const t of tokens) {
  if (!byNorm.has(t.norm)) byNorm.set(t.norm, []);
  byNorm.get(t.norm).push(t);
}

let errors = 0;
let totalLinks = 0;
const seenNorms = new Map(); // norm -> templeId (collision check inside table)

for (const [id, forms] of XREF) {
  if (!LEX_IDS.has(id)) {
    console.error(`MISSING LEXICON ID: ${id}`);
    errors++;
    continue;
  }
  const siteDir = path.join(ROOT, 'sites', id);
  if (!fs.existsSync(path.join(siteDir, 'index.html'))) {
    console.error(`MISSING TEMPLE DIR: sites/${id}/`);
    errors++;
  }
  let idHits = 0;
  for (const form of forms) {
    if (seenNorms.has(form)) {
      console.error(`COLLISION in table: ${form} -> ${seenNorms.get(form)} and ${id}`);
      errors++;
    }
    seenNorms.set(form, id);
    const occ = byNorm.get(form) || [];
    const cap = occ.filter((o) => o.capital);
    const low = occ.filter((o) => !o.capital);
    if (cap.length === 0) {
      console.error(`NO CAPITALIZED HIT: ${id} / ${form}`);
      errors++;
      continue;
    }
    const surfaces = [...new Set(cap.map((o) => o.surface))].join(' ');
    const lines = [...new Set(cap.map((o) => o.n))].join(',');
    idHits += cap.length;
    console.log(
      `${id}${BUILT.has(id) ? '*' : ''} ${form}  n=${cap.length}  L${lines}  [${surfaces}]` +
        (low.length ? `  (lowercase ×${low.length} NOT linked)` : '')
    );
  }
  totalLinks += idHits;
}

// Reverse check: capitalized normalized tokens that appear in the table
// under one id but ALSO occur capitalized with a different surface form
// (fine — both surfaces get linked), just listed for review.
console.log(`\nEntities: ${XREF.length}  |  total linkable occurrences: ${totalLinks}`);
console.log(errors ? `\nERRORS: ${errors}` : '\nAll forms verified.');
process.exit(errors ? 1 : 0);
