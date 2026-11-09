/* Canonical navigation tree — the single source of truth for the six hub
   categories, their dropdowns, hub pages, the mobile drawer, and the
   hub-mirror site footer. Consumed by sync-desktop-nav.js,
   sync-mobile-menu.js, sync-footer.js, the hub page generator, and the
   menu/footer consistency tests, so the surfaces can never drift apart.

   Fan-out entries only link to pages that exist at the time they ship;
   the Store fan-out (Merch/Art/Galleries) ships with the Reliquary
   restructure departments. */

const path = require('node:path');
const { PANTHEON_META } = require(path.join(__dirname, '..', 'type', 'js', 'pantheon-meta.js'));

const HUB_ORDER = ['atlas', 'culture', 'tools', 'library', 'relics', 'about'];

const HUBS = {
  atlas: {
    label: 'World',
    href: '/world/',
    scene: 'sphere',
    role: 'The Mind of the Pantheon',
    tagline: 'The mapped world of names',
    blurb:
      'Every name in the pantheon, charted — the beings themselves, the threads that connect them, the patterns they form, and the live frontier of the Unicode web.',
    footer: ['Pantheon', 'Patterns', 'Trending', 'Geography', 'Strata', 'Search'],
    items: [
      { label: 'Pantheon', href: '/pantheon/', blurb: 'All 983 restorations, filterable by tradition.', children: 'pantheon' },
      { label: 'Patterns', href: '/patterns/', blurb: 'Recurring threads across the names, and what they mean.' },
      { label: 'Trending', href: '/trending/', blurb: 'What the world is searching in the pantheon.' },
      { label: 'Geography', href: '/world/sacred/', blurb: 'An interactive globe of sacred places and the digital temples they meet.' },
      { label: 'Strata', href: '/pantheon/strata/', blurb: 'An evidence-guided journey through the historical layers of the pantheons.' },
      { label: 'Search', href: '/search/', blurb: 'The search engine for the Unicode web.' },
      { label: 'Connections', href: '/connections/', blurb: 'Cognates and kinships across traditions.' },
    ],
  },
  culture: {
    label: 'Culture',
    href: '/culture/',
    scene: 'compound',
    role: 'The Voice of the Pantheon',
    tagline: 'How myth lives in the world today',
    blurb:
      'The names did not stay in antiquity — they walk around in film, in ordinary speech, in university departments, and in the Herald’s chronicle of the restoration.',
    footer: ['Herald', 'Screen', 'Words', 'Academics'],
    items: [
      { label: 'Screen', href: '/screen/', blurb: 'Gods and heroes on film, in games, in comics.' },
      { label: 'Words', href: '/everyday/', blurb: 'Ordinary words that descend from divine names.' },
      { label: 'Academics', href: '/university-sponsorship/', blurb: 'The scholarly edition, edited by universities.', children: 'academics' },
      { label: 'Herald', href: '/herald/', tag: 'new', blurb: 'The chronicle of the Unicode pantheon.' },
    ],
  },
  tools: {
    label: 'Tools',
    href: '/instruments/',
    scene: 'gears',
    role: 'The Hand of the Pantheon',
    tagline: 'Instruments for the Unicode web',
    blurb:
      'Type a name and get its true spelling, ask the oracle, appraise a name, or wire the whole lexicon into your own systems.',
    footer: ['Type', 'Oracle', 'Appraise', 'API'],
    items: [
      { label: 'Type', href: '/type/', blurb: 'Type a name, get its canonical Unicode form.' },
      { label: 'Oracle', href: '/oracle/', blurb: 'Ask the lexicon anything.' },
      { label: 'App', href: '/app/', blurb: 'The PuniCodex app for Android.' },
      { label: 'Extension', href: '/extension/', blurb: 'Unicode names in your browser.' },
      { label: 'API', href: '/api/v1/docs/', blurb: 'The lexicon, programmatically.' },
      { label: 'Appraise', href: '/appraise/', blurb: 'What is a Unicode name worth?' },
      { label: 'Authenticity', href: '/authenticity/', blurb: 'Detect homograph and lookalike threats.' },
    ],
  },
  library: {
    label: 'Library',
    href: '/library/',
    scene: 'columns',
    role: 'The Memory of the Pantheon',
    tagline: 'The scholarship',
    blurb:
      'The evidence behind every restoration — the lexicon and its sources, primary texts in the original languages, the codex essays, and the university-edited scholarly edition.',
    footer: ['Lexicon', 'Scholars', 'Texts', 'Blog'],
    items: [
      { label: 'Lexicon', href: '/lexicon/', blurb: 'All 983 entries, with sources.' },
      { label: 'Texts', href: '/texts/', blurb: 'Primary sources in the original languages.' },
      { label: 'Blog', href: '/blog/', blurb: 'One story per flagship temple.' },
      { label: 'Scholars', href: '/scholars/', blurb: 'The university-edited scholarly edition.' },
      { label: 'Codex', href: '/codex/', blurb: 'Long-form essays on the craft.', children: 'codex' },
      { label: 'Rulebook', href: '/rulebook/', blurb: 'How restorations are decided.' },
      { label: 'Pronunciation', href: '/pronunciation/', blurb: 'How the restored names actually sound.' },
    ],
  },
  relics: {
    label: 'Relics',
    href: '/relics/',
    scene: 'lattice',
    role: 'The Vault of the Pantheon',
    tagline: 'Objects of the pantheon',
    blurb:
      'Things you can hold — the trading cards, the duel, the ink on skin, and the Reliquary: merchandise and art from the temples.',
    footer: ['Store', 'Cards', 'Game', 'Ink'],
    items: [
      { label: 'Store', href: '/store/', blurb: 'The Reliquary — merch and art.', children: 'store' },
      { label: 'Cards', href: '/cards/', blurb: 'The Mythic Cards gallery.' },
      { label: 'Game', href: '/game/', blurb: 'Mythic Duel.' },
      { label: 'Ink', href: '/ink/', blurb: 'Check a tattoo before you ink it.' },
    ],
  },
  about: {
    label: 'About',
    href: '/about/',
    scene: 'monolith',
    role: 'The Story of the Pantheon',
    tagline: 'The project and its keepers',
    blurb:
      'Who is restoring the names, and why — the mission and the method, the founder, the people hiring, and the legal record of the project.',
    footer: ['Origins', 'Founder', 'Careers', 'Engineering', 'Contact'],
    items: [
      { label: 'Origins', href: '/about/origins/', blurb: 'The mission and the method.' },
      { label: 'Founder', href: '/about/founder/', blurb: 'The person behind the restoration.' },
      { label: 'Careers', href: '/careers/', blurb: 'Join the work.' },
      { label: 'Contact', href: '/contact/', blurb: 'Reach the temple.' },
      { label: 'Engineering', href: '/engineering/', blurb: 'How the Unicode Pantheon is built, under the hood.' },
      { label: 'Privacy', href: '/privacy/', blurb: 'The privacy policy, in plain language.' },
      { label: 'Terms', href: '/terms/', blurb: 'The terms and conditions.' },
    ],
  },
};

/* World → Pantheon mega-panel: realms, artifacts, then every pantheon
 * landing page. Destinations only — filter states like "With Marks"
 * live on /pantheon/ itself and are deliberately not menu entries. */
const PANTHEON_CHILDREN = [
  { label: 'Realms', href: '/realms/' },
  { label: 'Artifacts', href: '/artifacts/' },
].concat(
  Object.keys(PANTHEON_META)
    .map((id) => ({ label: PANTHEON_META[id].label || id, href: `/${id}/` }))
    .sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0)),
);

/* Library → Codex fan-out: the essays. */
const CODEX_CHILDREN = [
  { label: 'Anatomy of a Punycode Domain', href: '/codex/anatomy-of-a-punycode-domain/' },
  { label: 'Building the Temple', href: '/codex/building-the-temple/' },
  { label: 'Restoring the Names', href: '/codex/restoring-the-names/' },
  { label: 'Why Greek Accents Matter', href: '/codex/why-greek-accents-matter/' },
];

/* Culture → Academics fan-out: the university motion. The sponsorship
 * pitch is the overview; the booking page is where the call gets scheduled. */
const ACADEMICS_CHILDREN = [{ label: 'Book a Call', href: '/university/book/' }];

/* Relics → Store fan-out (Phase B of the Reliquary restructure — live).
   Only departments with real pages are listed: Gallery and Commons join
   the fan-out when their generators land. */
const STORE_CHILDREN_ENABLED = true;
const STORE_CHILDREN = [
  { label: 'Merch', href: '/store/merch/' },
  { label: 'Art', href: '/store/art/' },
  { label: 'Galleries', href: '/store/art/galleries/' },
];

const CHILD_SETS = {
  pantheon: PANTHEON_CHILDREN,
  codex: CODEX_CHILDREN,
  academics: ACADEMICS_CHILDREN,
  store: STORE_CHILDREN_ENABLED ? STORE_CHILDREN : [],
};

function childrenOf(item) {
  return item.children ? CHILD_SETS[item.children] || [] : [];
}

module.exports = {
  HUB_ORDER,
  HUBS,
  PANTHEON_CHILDREN,
  CODEX_CHILDREN,
  ACADEMICS_CHILDREN,
  STORE_CHILDREN,
  STORE_CHILDREN_ENABLED,
  childrenOf,
};
