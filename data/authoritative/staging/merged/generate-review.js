const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const lexCode = fs.readFileSync(path.join(ROOT, 'type/js/lexicon.js'), 'utf8').replace('const LEXICON', 'var LEXICON');
const LEXICON = new Function(`${lexCode}; return LEXICON;`)();
const { ORIGINAL_SCRIPTS } = require(path.join(ROOT, 'type/js/original-scripts.js'));
const merged = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data/authoritative/staging/merged/2026-06-26-multi-v2.json'), 'utf8')
);

function entry(id) {
  return LEXICON.find((e) => e.id === id);
}
function script(id) {
  return ORIGINAL_SCRIPTS[id]?.originalScript || '';
}

const greek = [];
const perseusMeaning = [];
const sansMeaning = [];
const sansScript = [];
const wikiMeaning = [];

for (const s of merged.suggestions) {
  if (s.field === 'greek') greek.push(s);
  else if (s.field === 'meaning') {
    const e = entry(s.id);
    if (s.provenance.source === 'perseus-greek') perseusMeaning.push({ s, e });
    else if (s.provenance.source === 'cologne-sanskrit') sansMeaning.push({ s, e });
    else if (s.authorityTier === 3) wikiMeaning.push({ s, e });
  } else if (s.field === 'originalScript') {
    const e = entry(s.id);
    if (e && (e.pantheon === 'sanskrit' || e.pantheon === 'hindu' || e.pantheon === 'buddhist')) {
      sansScript.push({ s, e });
    }
  }
}

const badPhrases = ['Dor.', 'Att.-Ion.', 'Ion.', 'Adj.', 'Patron.', 'Browse Bar', 'Dictionary Entry Lookup'];
function isBadMeaning(v) {
  const t = String(v).trim();
  return t.length < 10 || badPhrases.some((p) => t.includes(p)) || /^[A-Z][a-z]+\.?$/.test(t);
}

function esc(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ');
}

let md = '# Merged batch review: 2026-06-26-multi-v2\n\n';
md += `Generated: ${new Date().toISOString()}\n\n`;
md += '## Summary\n\n';
md += `- Total merged suggestions: ${merged.suggestions.length}\n`;
md += '- Conflicts: 0\n';
md += `- Greek field updates: ${greek.length}\n`;
md += `- Meaning updates: ${merged.suggestions.filter((s) => s.field === 'meaning').length}\n`;
md += `- Original-script updates: ${merged.suggestions.filter((s) => s.field === 'originalScript').length}\n`;
md += `- Source-catalog updates: ${merged.suggestions.filter((s) => s.field === 'sourceCatalog').length}\n\n`;

md += '## Overall assessment\n\n';
md += 'The framework merged cleanly, but **the current batch should not be applied automatically**.\n';
md += 'Perseus and Cologne both return dictionary-first-sense / lemma data, which is philologically accurate but often not the deity-or-personified-name sense used on temple pages. Wikidata still produces some misassigned entities for tier-3 leftovers.\n\n';

md += `## Greek field (Perseus, ${greek.length} suggestions)\n\n`;
md += 'Perseus returns dictionary headwords. Many are lowercase common-noun lemmas, while the lexicon uses capitalized proper-name forms for personified concepts. Applying these blindly would lowercase deity/abstract-principle pages.\n\n';
md += 'Examples of case/dialect divergence:\n\n';
md += '| id | current | suggested | assessment |\n';
md += '|---|---|---|---|\n';
for (const s of greek.slice(0, 12)) {
  const e = entry(s.id);
  const cur = e ? e.greek : '';
  const note =
    cur && cur[0] === cur[0].toUpperCase() && s.value[0] === s.value[0].toLowerCase()
      ? 'lowercase lemma'
      : 'dialect/spelling variant';
  md += `| ${s.id} | ${esc(cur)} | ${esc(s.value)} | ${note} |\n`;
}
md += '\nRecommendation: **manual review**. Keep capitalized display forms for deities/personified concepts; accept dialect variants only where the lexicon intentionally wants the alternate form.\n\n';

md += `## Meanings from Perseus Greek (${perseusMeaning.length} suggestions)\n\n`;
md += 'Quality is mixed. Many extracted snippets are grammar labels, citations, or the Perseus footer instead of a plain definition.\n\n';
md += '### Looks usable\n\n';
md += '| id | suggested meaning |\n';
md += '|---|---|\n';
for (const { s } of perseusMeaning) {
  if (!isBadMeaning(s.value)) md += `| ${s.id} | ${esc(s.value).slice(0, 120)} |\n`;
}
md += '\n### Looks problematic (skip or fix extractor)\n\n';
md += '| id | suggested meaning | issue |\n';
md += '|---|---|---|\n';
for (const { s } of perseusMeaning) {
  if (isBadMeaning(s.value)) {
    let issue = 'fragment';
    if (s.value.includes('Browse Bar')) issue = 'Perseus footer/cruft';
    else if (/^Dor\.|^Att\.|^Ion\.|^Adj\.|^Patron\./.test(s.value.trim())) issue = 'grammar label';
    md += `| ${s.id} | ${esc(s.value).slice(0, 80)} | ${issue} |\n`;
  }
}
md += '\nRecommendation: improve the Perseus extractor to strip the footer, reject grammar-only snippets, and require a real English gloss before producing a meaning suggestion.\n\n';

md += `## Devanagari original script from Cologne (${sansScript.length} suggestions)\n\n`;
const aligned = sansScript.filter(({ s, e }) => script(e.id) === s.value.originalScript);
const diff = sansScript.filter(({ s, e }) => script(e.id) !== s.value.originalScript);
md += `- Aligned with existing curated forms: ${aligned.length}\n`;
md += `- Divergent: ${diff.length}\n\n`;
md += '### Divergences (need fix in importer or manual choice)\n\n';
md += '| id | unicode | existing | suggested | likely cause |\n';
md += '|---|---|---|---|---|\n';
for (const { s, e } of diff) {
  const cause = s.value.originalScript.length < script(e.id).length ? 'picked shorter/non-feminine headword' : 'wrong sibilant/entry';
  md += `| ${e.id} | ${esc(e.unicode)} | ${esc(script(e.id))} | ${esc(s.value.originalScript)} | ${cause} |\n`;
}
md += '\nRecommendation: in the Cologne importer, prefer the exact `<s>` block whose stripped SLP1 matches the Unicode restoration (case-sensitive), and prefer deity-specific entries (e.g. look for "N. of" or feminine endings for goddess names).\n\n';

md += `## Meanings from Cologne Sanskrit (${sansMeaning.length} suggestions)\n\n`;
md += 'Cologne returns the dictionary-first sense. For deity entries this is often a generic adjective rather than the mythological figure.\n\n';
md += '| id | existing | suggested (first sense) | deity-friendly? |\n';
md += '|---|---|---|---|\n';
for (const { s, e } of sansMeaning.slice(0, 25)) {
  const deity = /N\. of|goddess|god|deity|wife of|husband of|monkey-chief|sun|moon|fire/i.test(s.value);
  md += `| ${e.id} | ${esc(e.meaning).slice(0, 50)} | ${esc(s.value).slice(0, 70)} | ${deity ? 'yes' : 'no — generic first sense'} |\n`;
}
md += '\nRecommendation: either extract the deity sense when available (e.g. find "N. of" in the entry body) or flag Cologne meaning suggestions for mythological entries as manual-review.\n\n';

md += `## Remaining Wikidata meanings (tier 3, ${wikiMeaning.length} suggestions)\n\n`;
md += 'These survived because no higher-tier source overrode them, but several are misassigned entities.\n\n';
md += '| id | pantheon | existing | suggested | assessment |\n';
md += '|---|---|---|---|---|\n';
for (const { s, e } of wikiMeaning) {
  const bad = /satellite|publication|town|subdistrict|singer|confederation|vessle|notaur/i.test(s.value);
  md += `| ${e.id} | ${e.pantheon} | ${esc(e.meaning).slice(0, 40)} | ${esc(s.value).slice(0, 70)} | ${bad ? 'misassigned entity' : 'plausible'} |\n`;
}
md += '\nRecommendation: tighten Wikidata scoring (add more bad-phrase filters for satellites, publications, towns, singers, etc.) and require a higher confidence/score before accepting a tier-3 meaning.\n\n';

md += '## Recommended next steps\n\n';
md += '1. **Do not apply 2026-06-26-multi-v2 automatically.**\n';
md += '2. Fix the Cologne importer to select the exact Unicode-matching Devanagari headword and, when possible, the deity-specific sense.\n';
md += '3. Improve the Perseus meaning extractor: strip footer cruft, reject grammar-only snippets, and keep only real English glosses.\n';
md += '4. Harden Wikidata scoring to eliminate satellites, publications, towns, and singers.\n';
md += '5. Re-run the orchestrator and re-review.\n';
md += '6. Apply only after a human passes each field update.\n';

fs.writeFileSync(path.join(ROOT, 'data/authoritative/staging/merged/2026-06-26-multi-v2-review.md'), md, 'utf8');
console.log('Wrote review report');
console.log('Greek suggestions:', greek.length);
console.log('Perseus meaning problematic:', perseusMeaning.filter(({ s }) => isBadMeaning(s.value)).length, '/', perseusMeaning.length);
console.log('Sanskrit script divergences:', diff.length, '/', sansScript.length);
console.log(
  'Wikidata meaning plausible:',
  wikiMeaning.filter(({ s }) => !/satellite|publication|town|subdistrict|singer|confederation|vessle|notaur/i.test(s.value)).length,
  '/',
  wikiMeaning.length
);
