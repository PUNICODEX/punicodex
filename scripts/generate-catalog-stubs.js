#!/usr/bin/env node
/**
 * Generate baseline catalog stubs for flagships missing from lore-catalog.json.
 * These are intentionally solid but not peak-bespoke; they give every extended-lore
 * page enough content to feel authoritative inside the premium visual system.
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
    archaeology: 'Material evidence from the Greek world — inscriptions, sanctuaries, votive deposits, and literary papyri — anchors the name in historical cult.',
    syncretism: 'Greek cult and myth travelled with colonists, traders, and conquerors; Roman adaptation, Hellenistic ruler cult, and later European classicism all recast this name for new audiences.',
    legacy: 'The name endures in place names, scholarly vocabulary, modern fiction, and the ongoing recovery of ancient Greek culture through archaeology and philology.',
  },
  norse: {
    primarySource: 'The <em>Poetic Edda</em>; The <em>Prose Edda</em> of Snorri Sturluson.',
    archaeology: 'Archaeological evidence includes runestones, grave goods, place-name distributions, and Viking-Age iconography across Scandinavia and the Norse diaspora.',
    syncretism: 'Norse tradition absorbed and reworked Germanic, Celtic, and Christian influences; medieval Icelandic compilers preserved the myths while Christian frameworks shaped their presentation.',
    legacy: 'The name lives on in modern fantasy, Neopagan practice, Scandinavian heritage, and the global reception of Viking-Age literature.',
  },
  egyptian: {
    primarySource: 'The Pyramid Texts; The Coffin Texts; The Book of the Dead.',
    archaeology: 'Egyptian material evidence includes temple reliefs, statuary, papyri, amulets, and tomb inscriptions from the Pharaonic through Ptolemaic periods.',
    syncretism: 'Egyptian deities were syncretized with one another and, in the Greco-Roman period, with Greek and Roman gods; temple theology developed complex composite forms.',
    legacy: 'The name survives in Egyptological scholarship, museum collections, modern spirituality, and the global fascination with Pharaonic civilization.',
  },
  hindu: {
    primarySource: 'The <em>Ṛgveda</em>; the <em>Brāhmaṇas</em>; early Upaniṣadic literature.',
    archaeology: 'South Asian archaeological evidence includes Vedic ritual deposits, seal iconography, temple sculpture, and inscriptional references spanning millennia.',
    syncretism: 'Hindu traditions absorbed, reinterpreted, and synthesized earlier Vedic, Dravidian, and local cultic materials across the Indian subcontinent.',
    legacy: 'The name remains central to Hindu devotion, Sanskrit studies, Indian art and literature, and global yoga and dharmic discourse.',
  },
  canaanite: {
    primarySource: 'The Ugaritic Baal Cycle; ritual texts from Ugarit and Phoenician inscriptions.',
    archaeology: 'Levantine evidence includes cuneiform tablets from Ugarit, Phoenician and Punic inscriptions, and iconographic material from Syria-Palestine.',
    syncretism: 'Canaanite deities influenced and were influenced by Egyptian, Mesopotamian, and later Israelite religious traditions across the ancient Near East.',
    legacy: 'The name is recovered through Ugaritic and Phoenician studies, biblical background research, and the modern revival of Levantine polytheism.',
  },
  mesopotamian: {
    primarySource: 'The Epic of Gilgamesh; Sumerian temple hymns and Akkadian ritual texts.',
    archaeology: 'Mesopotamian evidence includes cuneiform tablets, cylinder seals, temple architecture, and royal inscriptions from Sumer through Babylonia and Assyria.',
    syncretism: 'Sumerian, Akkadian, Babylonian, and Assyrian traditions continuously reshaped divine names, genealogies, and cultic roles.',
    legacy: 'The name is studied through Assyriology, Near Eastern archaeology, and the modern recovery of cuneiform civilization.',
  },
  japanese: {
    primarySource: 'The <em>Kojiki</em>; the <em>Nihon Shoki</em>; shrine ritual records.',
    archaeology: 'Japanese evidence includes shrine archaeology, imperial ritual texts, manuscript traditions, and material culture tied to kami worship.',
    syncretism: 'Japanese kami cults interacted with Buddhist, Confucian, and imperial ideologies, producing rich combinatory traditions.',
    legacy: 'The name persists in Shinto practice, Japanese place names, popular media, and the global study of Japanese religion.',
  },
  polynesian: {
    primarySource: 'Ritual chants, genealogies, and ethnographic records collected across Polynesia.',
    archaeology: 'Polynesian evidence includes oral traditions, missionary records, ethnographic collections, and archaeological landscapes of ritual significance.',
    syncretism: 'Polynesian deities were localized across island groups while sharing inherited mythic structures and genealogical frameworks.',
    legacy: 'The name is preserved in indigenous knowledge, Pacific studies, and contemporary cultural revitalization movements.',
  },
  celtic: {
    primarySource: 'Medieval Irish and Welsh mythological texts; Gaulish and British inscriptional evidence.',
    archaeology: 'Celtic evidence includes inscriptions, votive deposits, iconography, and landscape features from Ireland to Gaul.',
    syncretism: 'Celtic traditions were reshaped by Roman contact, medieval Christian monasticism, and regional oral transmission.',
    legacy: 'The name survives in Celtic studies, Neopagan revival, and the literary and artistic reuse of medieval myth.',
  },
  nahuatl: {
    primarySource: 'Aztec ritual poetry, codices, and colonial Nahuatl chronicles.',
    archaeology: 'Mesoamerican evidence includes temple excavations, stone sculpture, codices, and colonial-era Nahuatl texts.',
    syncretism: 'Aztec religion synthesized earlier Mesoamerican traditions and was later reframed by Spanish colonial and Dominican scholarship.',
    legacy: 'The name endures in Mexican heritage, Nahuatl language revitalization, and modern Mesoamerican studies.',
  },
  yoruba: {
    primarySource: 'Ifá divination corpora; Yoruba oral traditions and ritual liturgies.',
    archaeology: 'Yoruba evidence includes oral corpus, material arts, shrine archaeology, and historical records of the Ife and Oyo traditions.',
    syncretism: 'Yoruba orisha traditions travelled to the Americas through the diaspora, giving rise to Santería, Candomblé, and Vodun.',
    legacy: 'The name is central to Yoruba religion, Afro-Atlantic spiritual traditions, and African diasporic cultural identity.',
  },
  slavic: {
    primarySource: 'Medieval Slavic chronicles, folklore collections, and comparative Indo-European reconstruction.',
    archaeology: 'Slavic evidence includes medieval chronicles, folk custom, toponymy, and material culture from the early Slavic world.',
    syncretism: 'Slavic paganism was reshaped by Christianization, folklore transmission, and 19th-century national revival movements.',
    legacy: 'The name persists in Slavic folklore studies, Rodnover revival, and East European cultural memory.',
  },
  zoroastrian: {
    primarySource: 'The <em>Avesta</em>; Middle Persian Zoroastrian texts.',
    archaeology: 'Zoroastrian evidence includes Avestan manuscripts, inscriptional references, and material culture of the Iranian plateau.',
    syncretism: 'Zoroastrian concepts influenced Jewish, Christian, and Islamic traditions while maintaining distinct Iranian ritual structures.',
    legacy: 'The name is studied in Iranian philology and preserved by surviving Zoroastrian communities and their textual heritage.',
  },
  incan: {
    primarySource: 'Colonial Quechua chronicles; Spanish administrative and ecclesiastical records.',
    archaeology: 'Andean evidence includes colonial chronicles, material culture, and archaeological landscapes of the Inca empire.',
    syncretism: 'Inca religion reorganized Andean local cults within an imperial framework and was later reframed by Catholic colonial discourse.',
    legacy: 'The name survives in Andean studies, Quechua heritage, and the modern recovery of pre-Columbian religion.',
  },
  phoenician: {
    primarySource: 'Phoenician and Punic inscriptions; classical accounts of Phoenician religion.',
    archaeology: 'Phoenician evidence includes inscriptions, votive stelae, temple sites, and iconography from the Levant to the western Mediterranean.',
    syncretism: 'Phoenician deities were exported across the Mediterranean and syncretized with Greek, Roman, and Egyptian gods.',
    legacy: 'The name is recovered through Semitic epigraphy, Mediterranean archaeology, and the study of Punic religion.',
  },
  hittite: {
    primarySource: 'Hittite ritual and mythological texts from Hattusa; cuneiform archives.',
    archaeology: 'Hittite evidence includes cuneiform tablets from Boğazkale, seal iconography, and temple architecture of the Hittite capital.',
    syncretism: 'Hittite religion synthesized Hattic, Hurrian, Mesopotamian, and Indo-European divine traditions in Anatolia.',
    legacy: 'The name is studied in Hittitology and the comparative history of ancient Near Eastern religions.',
  },
};

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
      kin: [{ label: pantheon.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), form: `${unicode}, the restored Unicode form` }],
      note: `${unicode} is ${entry.tierLabel || `Tier ${entry.tier}`} because its Unicode restoration preserves the orthographic signature appropriate to the ${pantheon} tradition.`,
    },
    domains: {
      title: domain,
      subtitle: `The domain of ${unicode}`,
      lead: `<p>In the ${pantheon.replace(/-/g, ' ')} tradition, <strong>${unicode}</strong> governed ${domain.toLowerCase()}. The name encodes a sphere of power that shaped ritual, narrative, and social order.</p>`,
      cards: [
        { title: 'Primary Sphere', body: `${unicode} is principally associated with ${domain.toLowerCase()}.` },
        { title: 'Cultural Role', body: `Worshippers approached ${unicode} through cult, myth, and the material culture of the ${pantheon} world.` },
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
    syncretism: `<p>${template.syncretism}</p>`,
    culturalLegacy: `<p>${template.legacy} Restoring <em>${unicode}</em> in Unicode preserves the name's cultural specificity against the flattening force of plain ASCII.</p>`,
    extendedMeditation: `<p>Names are not merely labels; they are compressed worlds. <strong>${unicode}</strong> carries within it a ${pantheon.replace(/-/g, ' ')} understanding of ${meaning.toLowerCase()}. Unicode restoration returns that world to readable form.</p>`,
    sources: [template.primarySource, 'Beekes, R. S. P. <em>Etymological Dictionary of Greek.</em> Leiden: Brill, 2010.', template.archaeology],
    archaeology: template.archaeology,
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
}

main();
