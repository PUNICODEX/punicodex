#!/usr/bin/env node
/**
 * Generate baseline catalog stubs for flagships missing from lore-catalog.json.
 * These are intentionally solid but not peak-bespoke; they give every extended-lore
 * page enough content to feel authoritative inside the premium visual system.
 *
 * Stubs are FILL-ONLY-MISSING baseline content: the lore-batch-* merge scripts
 * (and hand edits) are expected to overwrite them with per-entry scholarship.
 * scripts/promote-to-flagship.js refuses to promote on top of a stub entry —
 * isStubLoreEntry() below is the shared detection.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'scripts', 'lore-catalog.json');
const LEXICON_PATH = path.join(ROOT, 'type', 'js', 'lexicon.js');
const ARCHETYPE_PATH = path.join(ROOT, 'js', 'archetypes-v2.js');

function loadLexicon() {
  const code = fs.readFileSync(LEXICON_PATH, 'utf8').replace('const LEXICON', 'var LEXICON');
  return new Function(`${code}; return LEXICON;`)();
}

function loadArchetypes() {
  const code = fs.readFileSync(ARCHETYPE_PATH, 'utf8').replace('const ARCHETYPES', 'var ARCHETYPES');
  return new Function(`${code}; return ARCHETYPES;`)();
}

function loadCatalog() {
  return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
}

function saveCatalog(catalog) {
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
}

const PANTHEON_TEMPLATES = {
  greek: {
    primarySource: 'Homer. <em>Iliad</em> and <em>Odyssey</em>; Hesiod. <em>Theogony</em> and <em>Works and Days</em>.',
    archaeology: 'Material evidence from the Greek world — inscriptions, sanctuaries, votive deposits, and literary papyri — anchors {unicode} in historical cult.',
    syncretism: 'Greek cult and myth travelled with colonists, traders, and conquerors; Roman adaptation, Hellenistic ruler cult, and later European classicism all recast {unicode} for new audiences.',
    legacy: '{unicode} endures in Greek place names, scholarly vocabulary, modern fiction, and the ongoing recovery of ancient Greek culture through archaeology and philology.',
  },
  norse: {
    primarySource: 'The <em>Poetic Edda</em>; The <em>Prose Edda</em> of Snorri Sturluson.',
    archaeology: 'Archaeological evidence — runestones, grave goods, place-name distributions, and Viking-Age iconography across Scandinavia and the Norse diaspora — anchors {unicode} in historical cult.',
    syncretism: 'Norse tradition absorbed and reworked Germanic, Celtic, and Christian influences; medieval Icelandic compilers preserved the myths of {unicode} while Christian frameworks shaped their presentation.',
    legacy: '{unicode} lives on in modern fantasy, Neopagan practice, Scandinavian heritage, and the global reception of Viking-Age literature.',
  },
  egyptian: {
    primarySource: 'The Pyramid Texts; The Coffin Texts; The Book of the Dead.',
    archaeology: 'Egyptian material evidence — temple reliefs, statuary, papyri, amulets, and tomb inscriptions from the Pharaonic through Ptolemaic periods — anchors {unicode} in historical cult.',
    syncretism: '{unicode} was syncretized with fellow Egyptian deities and, in the Greco-Roman period, with Greek and Roman gods; temple theology developed complex composite forms.',
    legacy: '{unicode} survives in Egyptological scholarship, museum collections, modern spirituality, and the global fascination with Pharaonic civilization.',
  },
  hindu: {
    primarySource: 'The <em>Ṛgveda</em>; the <em>Brāhmaṇas</em>; early Upaniṣadic literature.',
    archaeology: 'South Asian archaeological evidence — Vedic ritual deposits, seal iconography, temple sculpture, and inscriptional references spanning millennia — anchors {unicode} in historical cult.',
    syncretism: 'Hindu traditions absorbed, reinterpreted, and synthesized earlier Vedic, Dravidian, and local cultic materials around figures such as {unicode}.',
    legacy: '{unicode} remains central to Hindu devotion, Sanskrit studies, Indian art and literature, and global yoga and dharmic discourse.',
  },
  canaanite: {
    primarySource: 'The Ugaritic Baal Cycle; ritual texts from Ugarit and Phoenician inscriptions.',
    archaeology: 'Levantine evidence — cuneiform tablets from Ugarit, Phoenician and Punic inscriptions, and iconographic material from Syria-Palestine — anchors {unicode} in historical cult.',
    syncretism: '{unicode} influenced and was influenced by Egyptian, Mesopotamian, and later Israelite religious traditions across the ancient Near East.',
    legacy: '{unicode} is recovered through Ugaritic and Phoenician studies, biblical background research, and the modern revival of Levantine polytheism.',
  },
  mesopotamian: {
    primarySource: 'The Epic of Gilgamesh; Sumerian temple hymns and Akkadian ritual texts.',
    archaeology: 'Mesopotamian evidence — cuneiform tablets, cylinder seals, temple architecture, and royal inscriptions from Sumer through Babylonia and Assyria — anchors {unicode} in historical cult.',
    syncretism: 'Sumerian, Akkadian, Babylonian, and Assyrian traditions continuously reshaped the name {unicode}, its genealogies, and its cultic roles.',
    legacy: '{unicode} is studied through Assyriology, Near Eastern archaeology, and the modern recovery of cuneiform civilization.',
  },
  japanese: {
    primarySource: 'The <em>Kojiki</em>; the <em>Nihon Shoki</em>; shrine ritual records.',
    archaeology: 'Japanese evidence — shrine archaeology, imperial ritual texts, manuscript traditions, and material culture tied to kami worship — anchors {unicode} in historical cult.',
    syncretism: 'The cult of {unicode} interacted with Buddhist, Confucian, and imperial ideologies, producing rich combinatory traditions.',
    legacy: '{unicode} persists in Shinto practice, Japanese place names, popular media, and the global study of Japanese religion.',
  },
  polynesian: {
    primarySource: 'Ritual chants, genealogies, and ethnographic records collected across Polynesia.',
    archaeology: 'Polynesian evidence — oral traditions, missionary records, ethnographic collections, and archaeological landscapes of ritual significance — anchors {unicode} in historical cult.',
    syncretism: '{unicode} was localized across island groups while sharing inherited mythic structures and genealogical frameworks with the wider Polynesian pantheon.',
    legacy: '{unicode} is preserved in indigenous knowledge, Pacific studies, and contemporary cultural revitalization movements.',
  },
  celtic: {
    primarySource: 'Medieval Irish and Welsh mythological texts; Gaulish and British inscriptional evidence.',
    archaeology: 'Celtic evidence — inscriptions, votive deposits, iconography, and landscape features from Ireland to Gaul — anchors {unicode} in historical cult.',
    syncretism: 'The traditions around {unicode} were reshaped by Roman contact, medieval Christian monasticism, and regional oral transmission.',
    legacy: '{unicode} survives in Celtic studies, Neopagan revival, and the literary and artistic reuse of medieval myth.',
  },
  nahuatl: {
    primarySource: 'Aztec ritual poetry, codices, and colonial Nahuatl chronicles.',
    archaeology: 'Mesoamerican evidence — temple excavations, stone sculpture, codices, and colonial-era Nahuatl texts — anchors {unicode} in historical cult.',
    syncretism: 'The cult of {unicode} synthesized earlier Mesoamerican traditions and was later reframed by Spanish colonial and Dominican scholarship.',
    legacy: '{unicode} endures in Mexican heritage, Nahuatl language revitalization, and modern Mesoamerican studies.',
  },
  yoruba: {
    primarySource: 'Ifá divination corpora; Yoruba oral traditions and ritual liturgies.',
    archaeology: 'Yoruba evidence — the oral corpus, material arts, shrine archaeology, and historical records of the Ife and Oyo traditions — anchors {unicode} in historical cult.',
    syncretism: 'The cult of {unicode} travelled to the Americas through the diaspora, giving rise to Santería, Candomblé, and Vodun.',
    legacy: '{unicode} is central to Yoruba religion, Afro-Atlantic spiritual traditions, and African diasporic cultural identity.',
  },
  slavic: {
    primarySource: 'Medieval Slavic chronicles, folklore collections, and comparative Indo-European reconstruction.',
    archaeology: 'Slavic evidence — medieval chronicles, folk custom, toponymy, and material culture from the early Slavic world — anchors {unicode} in historical cult.',
    syncretism: 'The traditions around {unicode} were reshaped by Christianization, folklore transmission, and 19th-century national revival movements.',
    legacy: '{unicode} persists in Slavic folklore studies, Rodnover revival, and East European cultural memory.',
  },
  zoroastrian: {
    primarySource: 'The <em>Avesta</em>; Middle Persian Zoroastrian texts.',
    archaeology: 'Zoroastrian evidence — Avestan manuscripts, inscriptional references, and material culture of the Iranian plateau — anchors {unicode} in historical cult.',
    syncretism: 'Concepts around {unicode} influenced Jewish, Christian, and Islamic traditions while maintaining distinct Iranian ritual structures.',
    legacy: '{unicode} is studied in Iranian philology and preserved by surviving Zoroastrian communities and their textual heritage.',
  },
  incan: {
    primarySource: 'Colonial Quechua chronicles; Spanish administrative and ecclesiastical records.',
    archaeology: 'Andean evidence — colonial chronicles, material culture, and archaeological landscapes of the Inca empire — anchors {unicode} in historical cult.',
    syncretism: 'The cult of {unicode} reorganized Andean local cults within an imperial framework and was later reframed by Catholic colonial discourse.',
    legacy: '{unicode} survives in Andean studies, Quechua heritage, and the modern recovery of pre-Columbian religion.',
  },
  phoenician: {
    primarySource: 'Phoenician and Punic inscriptions; classical accounts of Phoenician religion.',
    archaeology: 'Phoenician evidence — inscriptions, votive stelae, temple sites, and iconography from the Levant to the western Mediterranean — anchors {unicode} in historical cult.',
    syncretism: '{unicode} was exported across the Mediterranean and syncretized with Greek, Roman, and Egyptian gods.',
    legacy: '{unicode} is recovered through Semitic epigraphy, Mediterranean archaeology, and the study of Punic religion.',
  },
  hittite: {
    primarySource: 'Hittite ritual and mythological texts from Hattusa; cuneiform archives.',
    archaeology: 'Hittite evidence — cuneiform tablets from Boğazkale, seal iconography, and temple architecture of the Hittite capital — anchors {unicode} in historical cult.',
    syncretism: 'The cult of {unicode} synthesized Hattic, Hurrian, Mesopotamian, and Indo-European divine traditions in Anatolia.',
    legacy: '{unicode} is studied in Hittitology and the comparative history of ancient Near Eastern religions.',
  },
};

// Interpolate per-entry salt values into a template so no two entries share a
// stub paragraph verbatim. Unknown placeholders are left untouched.
function fillTemplate(template, ctx) {
  return template.replace(/\{(unicode|ascii|domain|meaning|pantheon)\}/g, (m, k) =>
    ctx[k] == null ? m : ctx[k]
  );
}

// Signatures of stub content produced by buildStub() below (current and
// legacy variants, incl. the retired Tier-note emission). Exported so
// scripts/promote-to-flagship.js can refuse to promote on top of a stub.
function isStubLoreEntry(entry) {
  if (!entry || typeof entry !== 'object') return true;
  const p = entry.pronunciation || {};
  // Retired-tier vocabulary (2026-10-29 doctrine): real scholarship never
  // classifies a name by tier, so any tier mention marks an unrepaired stub.
  if (typeof p.note === 'string' && /\btier\b|tierLabel/i.test(p.note)) return true;
  if (Array.isArray(p.phonemes) && p.phonemes.some((ph) => ph && (ph.symbol === '...' || ph.symbol === '…')))
    return true;
  if (typeof p.approximation === 'string' && /the conventional spoken form/i.test(p.approximation))
    return true;
  const m = entry.mythology || {};
  if (
    Array.isArray(m.myths) &&
    m.myths.length === 1 &&
    typeof m.myths[0].text === 'string' &&
    /as a figure whose domain over/i.test(m.myths[0].text)
  )
    return true;
  return false;
}

function getTemplate(pantheon) {
  return PANTHEON_TEMPLATES[pantheon] || PANTHEON_TEMPLATES.greek;
}

function ipaFor(unicode, pantheon) {
  // Minimal IPA approximation based on visible characters
  const base = unicode.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (pantheon === 'norse') return `/${base.toLowerCase()}/`;
  if (pantheon === 'egyptian') return `/${base.toLowerCase()}/`;
  if (pantheon === 'hindu') return `/${base.toLowerCase()}/`;
  if (pantheon === 'greek' || pantheon === 'greek-location') return `/${base.toLowerCase()}/`;
  return `/${base.toLowerCase()}/`;
}

function buildStub(entry) {
  const pantheon = entry.pantheon;
  const template = getTemplate(pantheon);
  const unicode = entry.unicode;
  const ascii = entry.ascii;
  const meaning = entry.meaning || entry.domain;
  const domain = entry.domain;
  const ctx = { unicode, ascii, domain, meaning, pantheon };
  const pantheonLabel = pantheon.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Generic emblem icon (64×64 viewBox path). The flagship renderer
  // (create-flagship.js) and the content-quality audit both require iconPath
  // on every domains card, so stubs ship a neutral mark, not an omission.
  const iconPath = 'M32 8C20 8 12 18 12 32C12 46 20 56 32 56C44 56 52 46 52 32C52 18 44 8 32 8Z';

  const symbols = [
    { name: 'Sacred emblem', meaning: `Iconographic marker associated with ${unicode}` },
    { name: 'Cult site', meaning: `Sanctuary or holy place where ${unicode} was honoured` },
    { name: 'Ritual object', meaning: `Material focus of devotion for ${unicode}` },
  ];

  if (pantheon === 'norse') {
    symbols.push({ name: 'Runic inscription', meaning: 'Attestation in the runic corpus' });
  } else if (pantheon === 'egyptian') {
    symbols.push({ name: 'Ankh', meaning: 'Symbol of life and divine power' });
  } else if (pantheon === 'hindu') {
    symbols.push({ name: 'Lotus', meaning: 'Symbol of purity and cosmic unfolding' });
  } else {
    symbols.push({ name: 'Divine weapon or tool', meaning: `Attribute marking ${unicode}'s power` });
  }

  return {
    pronunciation: {
      ipa: ipaFor(unicode, pantheon),
      ipaLabel: 'Scholarly Reconstruction',
      phonemes: [
        { symbol: unicode[0] || '—', desc: `Initial sound of ${unicode}, as attested in the ${pantheon} tradition.` },
        { symbol: '...', desc: `Subsequent syllables preserve the name's inherited shape.` },
      ],
      approximation: `'${ascii}' — the conventional spoken form.`,
      kin: [{ label: pantheonLabel, form: `${unicode}, the restored Unicode form` }],
      // No tier language: ownership/prominence/ASCII-canonicity are display
      // facts under the 2026-10-29 restoration-preservation doctrine, never
      // classification criteria.
      note: `${unicode} is read according to the conventions of ${pantheonLabel} name scholarship; the spelling above is the form specialists use in print.`,
    },
    domains: {
      title: domain,
      subtitle: `The domain of ${unicode}`,
      lead: `<p>In the ${pantheon.replace(/-/g, ' ')} tradition, <strong>${unicode}</strong> governed ${domain.toLowerCase()}. The name encodes a sphere of power that shaped ritual, narrative, and social order.</p>`,
      cards: [
        {
          iconPath,
          name: 'Primary Sphere',
          desc: `${unicode} is principally associated with ${domain.toLowerCase()}.`,
        },
        {
          iconPath,
          name: 'Cultural Role',
          desc: `Worshippers approached ${unicode} through cult, myth, and the material culture of the ${pantheon} world.`,
        },
      ],
    },
    symbols,
    mythology: {
      lead: `The myths of ${unicode} preserve the name's power and personality across generations of retelling.`,
      myths: [
        {
          title: `The story of ${unicode}`,
          text: `<p>${unicode} appears in ${pantheon.replace(/-/g, ' ')} tradition as a figure whose domain over ${domain.toLowerCase()} shapes both cosmic order and human experience. The surviving narratives emphasize ${unicode}'s role, attributes, and relationships with other powers.</p>`,
        },
      ],
    },
    syncretism: `<p>${fillTemplate(template.syncretism, ctx)}</p>`,
    culturalLegacy: `<p>${fillTemplate(template.legacy, ctx)} Restoring <em>${unicode}</em> in Unicode preserves the name's cultural specificity against the flattening force of plain ASCII.</p>`,
    extendedMeditation: `<p>Names are not merely labels; they are compressed worlds. <strong>${unicode}</strong> carries within it a ${pantheon.replace(/-/g, ' ')} understanding of ${meaning.toLowerCase()}. Unicode restoration returns that world to readable form.</p>`,
    sources: [template.primarySource, 'Beekes, R. S. P. <em>Etymological Dictionary of Greek.</em> Leiden: Brill, 2010.', fillTemplate(template.archaeology, ctx)],
    archaeology: fillTemplate(template.archaeology, ctx),
  };
}

function main() {
  const lexicon = loadLexicon();
  const archetypes = loadArchetypes();
  const catalog = loadCatalog();
  const builtIds = new Set(archetypes.filter((a) => a.built).map((a) => a.id));
  const missing = [...builtIds].filter((id) => !catalog[id]).sort();

  if (!missing.length) {
    console.log('No missing catalog entries.');
    return;
  }

  console.log(`Generating stubs for ${missing.length} missing flagships...`);
  for (const id of missing) {
    const entry = lexicon.find((e) => e.id === id);
    if (!entry) {
      console.warn(`  ! Lexicon entry not found: ${id}`);
      continue;
    }
    catalog[id] = buildStub(entry);
    console.log(`  + ${id}`);
  }

  saveCatalog(catalog);
  console.log(`\nDone. Catalog now has ${Object.keys(catalog).length} entries.`);
  console.log('Note: stubs are fill-only-missing baseline content — overwrite with the');
  console.log('lore-batch-* merge scripts before promoting (promote-to-flagship refuses stubs).');
}

if (require.main === module) {
  main();
}

module.exports = { isStubLoreEntry };
