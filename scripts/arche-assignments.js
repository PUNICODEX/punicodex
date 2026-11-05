/* PuniCodex — The Archē: full-coverage principle assignments.
 *
 * The hand-written Voices (scripts/arche-chapters.js) anchor 129 deities.
 * This module assigns EVERY remaining lexicon entry to exactly one principle
 * chapter — or to the finale — using evidence, in priority order:
 *
 *   1. Industry-pattern inversion: the pattern graph's byEntry map carries
 *      human-curated temple→industry seats; industry→principle is declared
 *      below. A temple keeps its highest-weight (primary) industry's
 *      principle.
 *   2. Conservative domain keywords: the lexicon's own `domain` string is
 *      matched against an exact-word table. Ambiguity falls through — never
 *      guess.
 *   3. Whatever remains belongs to the finale: "the names even the
 *      principles forgot." The count is honest, not embarrassing.
 *
 * Deterministic: same canonical inputs → same assignment. Test-enforced in
 * test/arche.test.js (full coverage, exact-once, cross-pantheon breadth).
 */

const { LEXICON } = require('../type/js/lexicon.js');
const { INDUSTRY_GROUPS } = require('../type/js/industry-patterns.js');
const { ASCENT } = require('./arche-chapters.js');

/* Invert the canonical pattern graph: entryId -> [{industry, weight}].
 * INDUSTRY_GROUPS members are the human-curated temple→industry seats. */
const byEntry = {};
for (const g of INDUSTRY_GROUPS) {
  for (const m of g.members || []) {
    if (!byEntry[m.id]) byEntry[m.id] = [];
    byEntry[m.id].push({ industry: g.industry, weight: m.weight || 1 });
  }
}

/* Every modern industry → the principle chapter it descends from. Covers all
 * 61 groups; the two PuniCodex-native industries belong to the finale. */
const INDUSTRY_TO_PRINCIPLE = {
  // Chaos — the unshaped, the unknown
  'startups-venture': 'chaos',
  'ai-forecasting': 'chaos',
  'disaster-resilience': 'chaos',
  // The Rebel — the adversary, employed
  cybersecurity: 'the-rebel',
  'occult-esoteric': 'the-rebel',
  'gaming-entertainment': 'the-rebel',
  // The Clay — the fashioning of mortals
  'manufacturing-craft': 'the-clay',
  'biotech-longevity': 'the-clay',
  'healthcare-pharma': 'the-clay',
  // The Creator — the platform, the single system
  'software-tech': 'the-one',
  'global-pantheon-brands': 'the-one',
  'telecom-logistics': 'the-one',
  // Earth & Sky — the built vertical world
  'construction-engineering': 'separation',
  'aviation-aerospace': 'separation',
  'space-astronomy': 'separation',
  'real-estate-home': 'separation',
  'mining-resources': 'separation',
  'architecture-design': 'separation',
  // Light — energy and sight
  'solar-energy': 'light',
  'thermal-energy': 'light',
  'photography-optics': 'light',
  // Water — the flow
  'water-utilities': 'water',
  maritime: 'water',
  'wine-hospitality': 'water',
  // Thunder — signal and strike
  'storm-forecasting': 'thunder',
  'wind-energy': 'thunder',
  // Order — the institution
  'legal-justice': 'order',
  'finance-commerce': 'order',
  leadership: 'order',
  'philosophy-ethics': 'order',
  faith: 'order',
  // Wisdom & Craft — knowing and making
  education: 'wisdom',
  'cartography-geospatial': 'wisdom',
  // The Song — art, poetry, music, the dance
  'music-arts': 'the-song',
  'publishing-media': 'the-song',
  // Love & Fertility — the economy of longing
  'beauty-fashion': 'love',
  'wedding-family': 'love',
  'dating-relationships': 'love',
  textiles: 'love',
  'gems-jewelry': 'love',
  'agriculture-food': 'love',
  petcare: 'love',
  femtech: 'love',
  'food-hospitality': 'love',
  // War — force and its codes
  'sports-athletics': 'war',
  'automotive-mobility': 'war',
  // Death — the archive and the rest
  'history-archives': 'death',
  'genealogy-ancestry': 'death',
  'mental-health': 'death',
  'sleep-recovery': 'death',
  // Trickery — the story-sellers and wanderers
  'retail-marketplaces': 'trickery',
  'travel-tourism': 'trickery',
  // Renewal — the wheel, the second life
  horology: 'renewal',
  'wellness-mind': 'renewal',
  // The Wild — the old country, preserved
  'forestry-conservation': 'the-wild',
  // The End — eschatology, risk-managed
  insurance: 'the-end',
  defense: 'the-end',
  'funerary-memorial': 'the-end',
  'environment-climate': 'the-end',
  "consumer-electronics": "the-clay",
  "robotics-drones": "the-clay",
  "labor-recruitment": "the-clay",
  "gambling-chance": "trickery",
  "advertising-marketing": "trickery",
  "toys-play": "the-child",
  "waste-recycling": "renewal",
  "social-media-creators": "the-song",
  "fintech-payments": "order",
  "home-security": "order",
  "language-translation": "wisdom",
  "storage-moving": "separation",
  // PuniCodex's own — the finale
  'mythic-restoration': 'finale',
  'diacritic-first-domains': 'finale',
};

/* Exact-word matches on the lexicon `domain` field. Deliberately conservative:
 * a word means what it says, and anything ambiguous is left for the finale. */
const DOMAIN_KEYWORDS = [
  [/\bchaos\b/i, 'chaos'],
  [/\bvoid\b/i, 'chaos'],
  [/\bprimordial\b/i, 'chaos'],
  [/\bsky\b/i, 'separation'],
  [/\bheaven\b/i, 'separation'],
  [/\bearth\b/i, 'separation'],
  [/\bsun\b/i, 'light'],
  [/\bdawn\b/i, 'light'],
  [/\blight\b/i, 'light'],
  [/\bsea\b/i, 'water'],
  [/\bocean\b/i, 'water'],
  [/\briver\b/i, 'water'],
  [/\bwater\b/i, 'water'],
  [/\brain\b/i, 'water'],
  [/\bthunder\b/i, 'thunder'],
  [/\bstorm\b/i, 'thunder'],
  [/\blightning\b/i, 'thunder'],
  [/\brainbow\b/i, 'thunder'],
  [/\bwind\b/i, 'thunder'],
  [/\bjustice\b/i, 'order'],
  [/\blaw\b/i, 'order'],
  [/\border\b/i, 'order'],
  [/\btruth\b/i, 'order'],
  [/\boath\b/i, 'order'],
  [/\bwisdom\b/i, 'wisdom'],
  [/\bknowledge\b/i, 'wisdom'],
  [/\bcraft\b/i, 'wisdom'],
  [/\bforge\b/i, 'wisdom'],
  [/\bsmith\b/i, 'wisdom'],
  [/\bscribe\b/i, 'wisdom'],
  [/\bwriting\b/i, 'wisdom'],
  [/\bpoetry\b/i, 'wisdom'],
  [/\bmusic\b/i, 'wisdom'],
  [/\bsong\b/i, 'wisdom'],
  [/\boracle\b/i, 'wisdom'],
  [/\bprophecy\b/i, 'wisdom'],
  [/\bhealing\b/i, 'renewal'],
  [/\bmedicine\b/i, 'renewal'],
  [/\blove\b/i, 'love'],
  [/\bbeauty\b/i, 'love'],
  [/\bdesire\b/i, 'love'],
  [/\bfertility\b/i, 'love'],
  [/\bharvest\b/i, 'love'],
  [/\bgrain\b/i, 'love'],
  [/\bbirth\b/i, 'love'],
  [/\bwar\b/i, 'war'],
  [/\bbattle\b/i, 'war'],
  [/\bwarrior\b/i, 'war'],
  [/\bvictory\b/i, 'war'],
  [/\bdeath\b/i, 'death'],
  [/\bdead\b/i, 'death'],
  [/\bunderworld\b/i, 'death'],
  [/\bgrave\b/i, 'death'],
  [/\bfuneral\b/i, 'death'],
  [/\bghost\b/i, 'death'],
  [/\btrickster\b/i, 'trickery'],
  [/\bthief\b/i, 'trickery'],
  [/\bthieves\b/i, 'trickery'],
  [/\bmessenger\b/i, 'trickery'],
  [/\btrade\b/i, 'trickery'],
  [/\btraveller?s?\b/i, 'trickery'],
  [/\bluck\b/i, 'trickery'],
  [/\btime\b/i, 'renewal'],
  [/\bfate\b/i, 'renewal'],
  [/\bseason/i, 'renewal'],
  [/\bcycle\b/i, 'renewal'],
  [/\bking\b/i, 'order'],
  [/\bqueen\b/i, 'order'],
  [/\bruler\b/i, 'order'],
  [/\brule\b/i, 'order'],
  [/\broyal\b/i, 'order'],
  [/\bpeace\b/i, 'order'],
  [/\bharmony\b/i, 'order'],
  [/\bwealth\b/i, 'order'],
  [/\bfortune\b/i, 'order'],
  [/\briches\b/i, 'order'],
  [/\bhunt(ing)?\b/i, 'war'],
  [/\bcourage\b/i, 'war'],
  [/\bstrength\b/i, 'war'],
  [/\brevenge\b/i, 'war'],
  [/\bvengeance\b/i, 'war'],
  [/\bmoon\b/i, 'light'],
  [/\bstars?\b/i, 'light'],
  [/\bcelestial\b/i, 'light'],
  [/\bmonster\b/i, 'chaos'],
  [/\bdragon\b/i, 'chaos'],
  [/\b(enemy|adversary|demon(s)?|tyrant|usurper|evil)\b/i, 'the-rebel'],
  [/\b(mortals?|mankind|humanity)\b/i, 'the-clay'],
  [/\bfirst (man|woman|human|mortal)\b/i, 'the-clay'],
  [/\b(creator|creation)\b/i, 'the-clay'],
  [/\bpotter\b/i, 'the-clay'],
  [/\b(preservation|preserver)\b/i, 'renewal'],
  [/\bintellect\b/i, 'wisdom'],
  [/\b(craftsman|inventor|invent)\b/i, 'wisdom'],
  [/\bweav/i, 'love'],
  [/\baveng/i, 'war'],
  [/\bwhirlpool\b/i, 'water'],
  [/\b(ragnarök|watchman)\b/i, 'the-end'],
  [/\bbox(ing|er)\b/i, 'war'],
  [/\bconstellation/i, 'light'],
  [/\bmortality\b/i, 'death'],
  [/\b(flood|deluge)\b/i, 'the-end'],
  [/\b(child|children|childhood|youth|boy|girl|infant|son|daughter)\b/i, 'the-child'],
  [/\b(hunt(ing)?|nature|wild(erness)?|forest|beast|game)\b/i, 'the-wild'],
  [/\b(apocalypse|doomsday|doom|last day|final day|end of days)\b/i, 'the-end'],
  [/\bmotherhood\b/i, 'love'],
  [/\bmother\b/i, 'love'],
  [/\bhero(es)?\b/i, 'war'],
  [/\bmemory\b/i, 'wisdom'],
  [/\bremembrance\b/i, 'wisdom'],
  [/\bhearth\b/i, 'separation'],
  [/\bnature\b/i, 'renewal'],
  [/\bwild(erness)?\b/i, 'renewal'],
  [/\bcit(y|ies)\b/i, 'separation'],
  [/\bisland\b/i, 'separation'],
  [/\bmountain\b/i, 'separation'],
  [/\bmagic\b/i, 'trickery'],
  [/\bwitchcraft\b/i, 'trickery'],
  [/\bsorcery\b/i, 'trickery'],
  [/\billusion\b/i, 'trickery'],
  [/\bdream/i, 'chaos'],
  [/\bdestruction\b/i, 'chaos'],
  [/\bdisaster\b/i, 'chaos'],
  [/\bship\b/i, 'water'],
  [/\bsailor\b/i, 'water'],
  [/\bsailing\b/i, 'water'],
  [/\bwine\b/i, 'water'],
  [/\bvoyage\b/i, 'water'],
  [/\bmarriage\b/i, 'love'],
  [/\bchildbirth\b/i, 'love'],
  [/\bfestival\b/i, 'love'],
  [/\bspring\b/i, 'renewal'],
  [/\byouth\b/i, 'renewal'],
];

const chapterIds = ASCENT.map((c) => c.id);

function buildAssignments() {
  const assignment = new Map(); // entryId -> chapterId | 'finale'

  // 1) Hand-written voices.
  for (const ch of ASCENT) {
    for (const d of ch.deities) assignment.set(d.id, ch.id);
  }

  // 2) Industry-pattern inversion (highest-weight industry wins).
  for (const e of LEXICON) {
    if (assignment.has(e.id)) continue;
    const seats = byEntry && byEntry[e.id];
    if (Array.isArray(seats) && seats.length) {
      const best = seats.reduce((a, b) => ((b.weight || 1) > (a.weight || 1) ? b : a));
      const principle = INDUSTRY_TO_PRINCIPLE[best.industry];
      if (principle && principle !== 'finale') {
        assignment.set(e.id, principle);
        continue;
      }
      if (principle === 'finale') assignment.set(e.id, 'finale');
    }
  }

  // 3) Conservative domain keywords.
  for (const e of LEXICON) {
    if (assignment.has(e.id)) continue;
    const domain = e.domain || '';
    for (const [re, chapter] of DOMAIN_KEYWORDS) {
      if (re.test(domain)) {
        assignment.set(e.id, chapter);
        break;
      }
    }
  }

  // 4) The remainder rise in the finale.
  for (const e of LEXICON) {
    if (!assignment.has(e.id)) assignment.set(e.id, 'finale');
  }

  return assignment;
}

const ASSIGNMENT = buildAssignments();

/* chapterId -> [{id, unicode, pantheon, domain, voiced}] in stable order. */
function chapterRoster(chapterId) {
  const voicedIn = new Map();
  const ch = ASCENT.find((c) => c.id === chapterId);
  if (ch) for (const d of ch.deities) voicedIn.set(d.id, true);
  const rows = [];
  for (const e of LEXICON) {
    if (ASSIGNMENT.get(e.id) === chapterId) {
      rows.push({
        id: e.id,
        unicode: e.unicode,
        pantheon: e.pantheon,
        domain: e.domain || '',
        voiced: Boolean(voicedIn.get(e.id)),
      });
    }
  }
  return rows;
}

function finaleRoster() {
  return chapterRoster('finale');
}

function stats() {
  const s = { finale: 0 };
  for (const id of chapterIds) s[id] = 0;
  for (const e of LEXICON) {
    const a = ASSIGNMENT.get(e.id);
    s[a] = (s[a] || 0) + 1;
  }
  return s;
}

module.exports = { ASSIGNMENT, INDUSTRY_TO_PRINCIPLE, chapterRoster, finaleRoster, stats };
