/**
 * One-off: fix tier self-classification contradictions in canonical blog +
 * scholars content for the three re-tiered entries (atlas, rhea re-tiered
 * 2 -> 1; kanaloa re-tiered 1 -> 2). Assertion-based exact replacements.
 */
const fs = require('node:fs');

const ATLAS_OLD_1 =
  'preserves one prosodic feature — the acute accent on the first syllable — but contains no long vowel, which places the name in Tier 2.';
const ATLAS_NEW_1 =
  'preserves both prosodic features — the acute accent records the stress, and the final -ās is long by the first-declension rule — which places the name in Tier 1.';
const ATLAS_OLD_2 =
  'The Greek original preserves one prosodic feature — the acute on the first syllable — but contains no long vowel, which places the name in Tier 2.';
const ATLAS_NEW_2 =
  'The Greek original preserves both prosodic features — the acute on the first syllable records the stress, and the final -ās is long by the first-declension rule — which places the name in Tier 1.';

const RHEA_OLD =
  'The original preserves one prosodic feature — stress or vowel length — rather than both, which places the name in Tier 2.';
const RHEA_NEW =
  'The Greek original (Ῥέᾱ) preserves both prosodic features — the acute on the epsilon records the stress, and the macron on the final alpha records the long vowel — which places the name in Tier 1.';

const KANALOA_BLOG_OLD =
  'The restoration preserves at least one distinctive feature — a diacritic or a distinctive letter — that the ASCII form loses, and exactly one historically valid Unicode restoration exists, which places the name in Tier 1.';
const KANALOA_BLOG_NEW =
  'The live restoration, Kanaloa, preserves no distinctive feature beyond the ASCII form — the macron of the ideal Kānaloa is not part of the owned spelling — which places the name in Tier 2.';
const KANALOA_SCHOLARS_OLD =
  'carries both stress and vowel length, and exactly one historically valid Unicode restoration exists, which places the name in Tier 1.';
const KANALOA_SCHOLARS_NEW =
  'carries neither stress nor vowel-length marks in its live form — the macron of the ideal Kānaloa is not part of the owned spelling — which places the name in Tier 2.';

function patchJson(file, pairs, { glanceFrom, glanceTo } = {}) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  let changed = 0;
  const walk = (obj) => {
    if (typeof obj === 'string') {
      let out = obj;
      for (const [a, b] of pairs) {
        if (out.includes(a)) {
          out = out.split(a).join(b);
          changed++;
        }
      }
      return out;
    }
    if (Array.isArray(obj)) return obj.map(walk);
    if (obj && typeof obj === 'object') {
      for (const k of Object.keys(obj)) obj[k] = walk(obj[k]);
    }
    return obj;
  };
  walk(j);
  if (glanceFrom) {
    const serialized = JSON.stringify(j);
    if (!serialized.includes(glanceFrom)) {
      if (!serialized.includes(glanceTo)) throw new Error(`glance line not found in ${file}`);
      console.log(`${file}: glance already applied`);
    } else {
      const before = changed;
      const walk2 = (obj) => {
        if (typeof obj === 'string') {
          return obj.split(glanceFrom).join(glanceTo);
        }
        if (Array.isArray(obj)) return obj.map(walk2);
        if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) obj[k] = walk2(obj[k]);
        return obj;
      };
      const serializedBefore = JSON.stringify(j);
      walk2(j);
      if (JSON.stringify(j) !== serializedBefore) changed++;
      if (changed === before) throw new Error(`glance line not found in ${file}`);
    }
  }
  if (changed === 0) {
    const already = pairs.every(([, b]) => JSON.stringify(j).includes(b));
    if (!already) throw new Error(`no replacements made in ${file}`);
    console.log(`${file}: already patched`);
    return;
  }
  fs.writeFileSync(file, `${JSON.stringify(j, null, 2)}\n`);
  console.log(`${file}: ${changed} replacement(s)`);
}

patchJson(
  'platform/blog/content/atlas.json',
  [
    [ATLAS_OLD_1, ATLAS_NEW_1],
    [ATLAS_OLD_2, ATLAS_NEW_2],
  ],
  { glanceFrom: '**Classification:** Tier 2', glanceTo: '**Classification:** Tier 1' }
);
patchJson('platform/scholars/content/atlas.json', [
  [ATLAS_OLD_1, ATLAS_NEW_1],
  [ATLAS_OLD_2, ATLAS_NEW_2],
]);

patchJson(
  'platform/blog/content/rhea.json',
  [[RHEA_OLD, RHEA_NEW]],
  { glanceFrom: '**Classification:** Tier 2', glanceTo: '**Classification:** Tier 1' }
);
patchJson('platform/scholars/content/rhea.json', [[RHEA_OLD, RHEA_NEW]]);

patchJson(
  'platform/blog/content/kanaloa.json',
  [[KANALOA_BLOG_OLD, KANALOA_BLOG_NEW]],
  { glanceFrom: '**Classification:** Tier 1', glanceTo: '**Classification:** Tier 2' }
);
patchJson('platform/scholars/content/kanaloa.json', [
  [KANALOA_SCHOLARS_OLD, KANALOA_SCHOLARS_NEW],
]);
