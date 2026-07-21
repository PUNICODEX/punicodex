/**
 * Path-2 tier reclassification — applies the mechanical doctrine:
 *   Greek originals: tier-1 iff stress (acute/circumflex) AND length
 *     (η/ω, long α/ι/υ, long diphthong, or circumflex) are both present.
 *   All other entries: tier-1 iff the Unicode form preserves at least one
 *     distinctive feature vs ASCII (diacritic or special letter).
 *   Dual-tier entries are untouched. Reviewed keeps: asia (long final -ā).
 * Updates tier + tierLabel in type/js/lexicon.js and js/archetypes-v2.js.
 */
const fs = require('node:fs');

function greekFeats(g) {
  const nfd = (g || '').normalize('NFD');
  const stress = /[́̀͂]/.test(nfd);
  const circum = /[͂]/.test(nfd);
  const bare = nfd.replace(/[̀-ͯ]/g, '').toLowerCase();
  const long = /[ηωᾱῑῡ]/.test(bare) || /(ει|οι|αι|ου|αυ|ευ|ηυ|ῃ|ῳ|υι)/.test(bare) || circum;
  return { stress, long, count: (stress ? 1 : 0) + (long ? 1 : 0) };
}
const SPECIAL = /[ÞþÐðÆæŒœŠšŽžŁłĐđĦħƏəḌḍṬṭṢṣḤḥṚṛṜṝṆṇṂṃṄṅṠṡŚśŹźḪḫḶḷṔṕꜢꜣꜤꜥ]/;
// Structural detector: any preserved diacritic (found by NFD decomposition —
// macron, acute, tone, underdot, ogonek, caron, …) or a distinctive atomic
// letter from SPECIAL. Enumeration by hand always drifts; decomposition does not.
function markCount(unicode) {
  let c = 0;
  for (const ch of unicode.normalize('NFC')) {
    if (SPECIAL.test(ch)) {
      c++;
      continue;
    }
    const nfd = ch.normalize('NFD');
    if (nfd.length > 1 && /[̀-ͯ]/.test(nfd)) c++;
  }
  return c;
}
const DUAL = new Set(['apollon', 'hekate', 'nike']);
const KEEP_TIER1 = new Set(['asia', 'rhea', 'atlas']); // reviewed: long final -ᾱ (asia: first-declension rule; rhea: Ῥέᾱ per LSJ; atlas: Ἄτλᾱς, nom. sg. of -αντ- stems)

function newTier(e) {
  if (DUAL.has(e.id)) return e.tier;
  const hasGreek = e.greek && e.greek !== '—' && /[Ͱ-῿]/.test(e.greek);
  if (e.pantheon.startsWith('greek') && hasGreek) {
    const f = greekFeats(e.greek);
    if (f.count >= 2) return '1';
    return KEEP_TIER1.has(e.id) ? '1' : '2';
  }
  return markCount(e.unicode) >= 1 ? '1' : '2';
}

const { LEXICON } = require('../../type/js/lexicon.js');
const changes = [];
for (const e of LEXICON) {
  const t = newTier(e);
  if (t !== e.tier) changes.push({ id: e.id, from: e.tier, to: t });
}
console.log(`reclassifications: ${changes.length} (up ${changes.filter((c) => c.to === '1').length}, down ${changes.filter((c) => c.to === '2').length})`);

// ── Apply to lexicon ──
let lex = fs.readFileSync('type/js/lexicon.js', 'utf8');
for (const c of changes) {
  const anchor = `"id": "${c.id}"`;
  const i = lex.indexOf(anchor);
  if (i === -1) throw new Error(`missing ${c.id}`);
  const end = lex.indexOf('\n  },', i);
  let block = lex.slice(i, end);
  block = block.replace(`"tier": "${c.from}"`, `"tier": "${c.to}"`);
  block = block.replace(`"tierLabel": "Tier ${c.from}"`, `"tierLabel": "Tier ${c.to}"`);
  lex = lex.slice(0, i) + block + lex.slice(end);
}
fs.writeFileSync('type/js/lexicon.js', lex, 'utf8');

// ── Apply to archetypes (built entries only) ──
let arc = fs.readFileSync('js/archetypes-v2.js', 'utf8');
const byId = new Map(changes.map((c) => [c.id, c.to]));
let arcChanged = 0;
for (const [id, to] of byId) {
  const anchor = `id: "${id}"`;
  const i = arc.indexOf(anchor);
  if (i === -1) continue;
  const end = arc.indexOf('\n    },', i);
  let block = arc.slice(i, end);
  const newTierStr = to === '1' ? 'tier-1' : 'tier-2';
  if (block.includes(`tier: "${newTierStr}"`)) continue;
  block = block.replace(/tier: "tier-[12]"/, `tier: "${newTierStr}"`);
  arc = arc.slice(0, i) + block + arc.slice(end);
  arcChanged++;
}
fs.writeFileSync('js/archetypes-v2.js', arc, 'utf8');
console.log(`lexicon: ${changes.length} entries re-tiered; archetypes: ${arcChanged} entries re-tiered`);
for (const c of changes) console.log(`  ${c.id}: ${c.from} -> ${c.to}`);
