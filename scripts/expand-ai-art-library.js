#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ARCHETYPES } = require('../js/archetypes-v2.js');
const { LEXICON } = require('../type/js/lexicon.js');
const { writeFileWithRetry } = require('./write-file-retry.js');

const ROOT = path.join(__dirname, '..');
const LIB_PATH = path.join(ROOT, 'data', 'ai-art', 'prompt-library.json');
const lib = JSON.parse(fs.readFileSync(LIB_PATH, 'utf8'));

const traditionAliases = {
  abrahamic: 'abrahamic',
  chthonic: 'greek',
  'greek-location': 'greek',
  olympian: 'greek',
  titan: 'greek',
};

// Subject-form overrides keep human deity styling away from creatures,
// hybrid monsters, places, and symbols. The default remains anthropomorphic
// because most lexicon entries are divine persons.
const SUBJECT_OVERRIDES = {
  creature: new Set([
    'apep', 'audhumla', 'cerberus', 'chimaira', 'drakon', 'eachuisge', 'eingana',
    'fafnir', 'fenrir', 'garmr', 'hydra', 'jormungandr', 'kamapuaa', 'kebechet',
    'long', 'longwang', 'matsya', 'ngalyod', 'pegasos', 'phoenix', 'python',
    'quetzalcoatl', 'ratatoskr', 'renenutet', 'serket', 'sleipnir', 'typhon',
    'wadjet', 'yongwang', 'yurlungur', 'zmeygorynych',
  ]),
  hybrid: new Set([
    'arachne', 'bunjil', 'makemake', 'medousa', 'narasimha', 'sphinx', 'xolotl',
  ]),
  location: new Set([
    'acheron', 'alfheimr', 'annwn', 'baekdusan', 'fuji', 'ginnungagap', 'helheimr',
    'hokkaido', 'honshu', 'ise', 'jotunheimr', 'karnak', 'kobe', 'kumano', 'kyoto',
    'kyushu', 'luxor', 'meru', 'midgardr', 'muspellheimr', 'nagoya', 'niflheimr',
    'nikko', 'nikkō', 'osaka', 'sarnath', 'shikoku', 'styx', 'tartaros', 'uppsala',
    'valholl', 'vanaheimr',
  ]),
  emblem: new Set([
    'adamas', 'ankh', 'bagua', 'bifrost', 'keraunos', 'mjolnir', 'om', 'omphalos',
    'taichi', 'wuji', 'wuxing', 'yinyang',
  ]),
};

const ATTRIBUTE_OVERRIDES = {
  zeus: ['mature bearded Greek sky father', 'thunderbolt held prominently', 'eagle', 'laurel crown'],
  apollon: ['young Greek archer-musician', 'lyre', 'bow', 'laurel wreath'],
  aphrodite: ['adult Greek goddess of love', 'sea-foam birth drapery', 'doves', 'roses'],
  ares: ['Greek war god in armor', 'spear', 'helmet', 'shield'],
  artemis: ['Greek huntress goddess', 'bow and quiver', 'crescent moon', 'deer'],
  athena: ['Greek goddess in helmet', 'owl', 'olive branch', 'aegis'],
  demeter: ['Greek grain goddess', 'wheat sheaf', 'torch', 'cornucopia'],
  hades: ['mature bearded Greek god of the dead', 'dark royal robe and classical wreath', 'cornucopia', 'three-headed Cerberus at heel'],
  hephaistos: ['Greek smith god', 'hammer', 'tongs', 'forge flame'],
  hera: ['Greek queen of the gods', 'peacock', 'diadem', 'royal scepter'],
  hermes: ['Greek herald god', 'caduceus', 'winged sandals', 'traveler hat'],
  hestia: ['Greek hearth goddess', 'sacred hearth flame', 'kettle', 'modest drapery'],
  poseidon: ['Greek sea god', 'trident', 'waves', 'dolphins'],
  nike: ['winged Greek goddess Nike', 'loose laurel wreath encircling her hair', 'outstretched feathered wings', 'both hands arranging a flowing victory ribbon'],
  pandora: ['curious Greek first woman Pandōra', 'large ornate sealed jar', 'hands lifting the jar lid', 'flowing Greek robe'],
  persephone: ['Greek queen of the underworld', 'pomegranate', 'torch', 'spring flowers'],
  odin: ['one-eyed Norse god', 'wide-brimmed hat', 'two ravens', 'spear Gungnir'],
  thor: ['red-bearded Norse thunder god', 'Mjolnir hammer', 'iron gloves', 'belt Megingjord'],
  loki: ['sly Norse trickster Loki as a man', 'knotted dark hair', 'sleek Norse tunic', 'subtle knowing smile'],
  freyja: ['Norse goddess with braided crown', 'falcon-feather cloak', 'two cats at her feet', 'amber Brisingamen necklace'],
  freyr: ['Norse fertility god', 'antler', 'golden boar Gullinbursti', 'fertile grain'],
  hel: ['half-living half-skeletal Norse goddess', 'dark mantle', 'underworld shadows'],
  ra: ['ancient Egyptian sun god', 'falcon head', 'sun disk with uraeus', 'was scepter'],
  anubis: ['jackal-headed Egyptian god', 'embalming tools', 'sacred scales', 'black canine form'],
  osiris: ['mummiform Egyptian god', 'atef crown', 'crook and flail', 'white wrappings'],
  isis: ['Egyptian winged goddess', 'throne headdress', 'outstretched wings', 'ankh'],
  horus: ['falcon-headed Egyptian sky god', 'Eye of Horus', 'double crown', 'solar disk'],
  bastet: ['cat-headed Egyptian goddess', 'sistrum', 'protective basket', 'feline grace'],
  thoth: ['ibis-headed Egyptian scribe god', 'scribal palette', 'moon disk', 'hieroglyph-free precision'],
  hydra: ['nine-headed Lernaean Hydra', 'regenerating serpent necks', 'entirely serpentine body', 'scales and fangs'],
  cerberus: ['underworld hound Cerberus with exactly three canine heads on one single body', 'three separate dog heads sharing one neck and torso', 'snake-headed tail', 'chains of Hades'],
  medousa: ['Gorgon Medousa, a woman with living serpents for hair', 'female face and body', 'petrifying gaze', 'winged sandals of Perseus must NOT appear; no horns, no bat wings, no male or demon anatomy'],
  herakles: ['Greek hero Herakles in his prime', 'lion skin cape with mane over his shoulders', 'knotted wooden club', 'muscular beardless-to-short-bearded hero', 'no wings, no spear, no aged white beard'],
  kali: ['four-armed dark Hindu goddess Kali', 'lolling tongue', 'sword and trident', 'garland and waist chain'],
  shiva: ['Hindu god Shiva', 'third eye', 'crescent moon', 'trident and damaru'],
  ganesha: ['elephant-headed Hindu god Ganesha', 'broken tusk', 'modak sweet', 'mouse companion'],
  hanuman: ['devoted monkey-god Hanuman', 'mace', 'long tail', 'mountain of healing herbs'],
  vishnu: ['blue Hindu preserver god', 'conch shell', 'discus', 'lotus and mace'],
  lakshmi: ['Hindu goddess Lakshmi', 'lotus flowers', 'gold coins', 'elephants of abundance'],
  saraswati: ['Hindu goddess Saraswati', 'veena', 'white swan', 'book of wisdom'],
  amaterasu: ['Japanese Shinto sun goddess', 'sacred mirror', 'sun disk', 'Shinto robes'],
  susanoo: ['Japanese storm god Susanoo', 'wild storm clouds', 'sword', 'Japanese armor'],
  tsukuyomi: ['Japanese moon god Tsukuyomi', 'crescent moon', 'night robes', 'lunar disk'],
  inari: ['Japanese kami Inari', 'fox messenger', 'rice sheaves', 'torii'],
  sunwukong: ['Chinese Monkey King Sun Wukong', 'Ruyi Jingu Bang staff', 'monkey armor', 'flying cloud'],
  guanyin: ['Chinese bodhisattva Guanyin', 'lotus', 'willow branch', 'water vase'],
  change: ['Chinese moon goddess Chang’e', 'moon disk', 'elixir', 'jade rabbit'],
  caishen: ['Chinese God of Wealth Caishen as a smiling robed court official', 'gold ingot held in both hands', 'scepter of office', 'official’s black gauze hat', 'no dragon body, no creature form'],
  quetzalcoatl: ['feathered serpent', 'Mesoamerican featherwork', 'coiled serpent body', 'wind and morning star'],
  huitzilopochtli: ['Aztec warrior-sun god', 'hummingbird ornament', 'solar rays', 'Xiuhcoatl serpent'],
  atlas: ['Titan Atlas', 'vast celestial globe held on his shoulders or above his raised arms', 'the weight of the heavens pressing down', 'muscular endurance', 'no trident, no wings, no horned helmet — the sphere is the only object'],
  odysseus: ['Greek hero Odysseus the wanderer', 'conical pilos traveler’s cap', 'stout spear', 'sea-worn cloak', 'no winged helmet (that is Hermes), no seals or inscriptions'],
  rama: ['Hindu prince Rama', 'great bow Kodanda in hand', 'quiver of arrows on his back', 'princely royal crown', 'no trident (that is Shiva), no battle-axe (that is Parashurama)'],
  moses: ['Hebrew lawgiver Moses', 'two stone tablets of the Law held to his chest', 'plain wooden staff', 'rays of light from his brow', 'no crown, no halo, no wings, no sword'],
  noah: ['patriarch Noah', 'wooden ark behind him', 'dove bearing an olive branch', 'rainbow overhead', 'no crown, no weapons'],
  david: ['Hebrew king David as a young bearded king', 'harp in his hands', 'sling at his belt', 'subdued lion at his side', 'no cross-topped staff, no angel wings'],
  el: ['supreme Canaanite god El as the white-bearded ancient king', 'long white beard', 'seated on a simple throne or standing with bull imagery', 'Levantine Bronze Age robe', 'no falcon head, no animal head, no Egyptian regalia'],
  fionn: ['Irish hero Fionn mac Cumhaill', 'hunter’s spear', 'the salmon of knowledge', 'green Fianna warrior garb', 'no crown, no wizard staff, no horns'],
  om: ['the sacred syllable Om rendered as one single flowing Devanagari calligraphic symbol', 'pure emblem only', 'no vessels, no weapons, no wings, no extra ornament beyond the syllable itself'],
  baal: ['Canaanite storm god Baal as a standing striding warrior', 'horned helmet', 'raised spear in one hand and bronze mace in the other', 'victorious forward stride', 'no horse, no bat wings, no demonic or skeletal face'],
  eris: ['Greek goddess of discord Eris', 'single golden apple of discord held aloft', 'restless wings', 'knowing confrontational stance', 'no mirror, no ring, no crown'],
  dagda: ['the good god Dagda of the Tuatha Dé Danann', 'enormous great club with a wide blunt spade-like end', 'cauldron of plenty', 'huge jovial bearded chieftain', 'no wings, no horned helmet, no rope'],
  brigid: ['Irish goddess Brigid', 'sacred flame in her raised hand', 'sword point-down before her', 'woven mantle and celtic knotwork', 'no written letters, no name, no signature anywhere in the image'],
  surya: ['Hindu sun god Surya', 'radiant sun-ray crown', 'two lotus flowers held in his hands', 'solar disc glow', 'no trident (that is Shiva alone), no spear'],
  agni: ['Hindu fire god Agni', 'flames rising from his crown and shoulders', 'sacrificial ladle and fire goad', 'smoke-banner', 'no trident (that is Shiva alone)'],
  akshobhya: ['Dhyani Buddha Akshobhya', 'blue meditation Buddha seated in earth-touching mudra', 'single face and two arms only', 'vajra resting before him', 'no trident, no multi-armed form, no crown of skulls'],
  aither: ['Greek personification Aither as a luminous winged youth', 'radiant upper-air light', 'glowing classical figure', 'no bird head, no claws, no tail'],
  taichi: ['the taijitu symbol: one single circular black-and-white yin-yang emblem of two interlocking teardrops each holding a dot', 'pure symbol only', 'no figure, no swords, no flames, no ornament beyond the emblem'],
  kai: ['Sir Kay the seneschal of Arthurian legend as a sturdy knight', 'practical heraldic armor', 'broadsword at his side', 'square-shouldered powerful build and short beard', 'no crown, no ceremonial spear, no bird'],
  macha: ['Irish sovereignty goddess Macha as a regal woman', 'fiery red hair', 'royal gold torque and crimson cloak', 'a tamed horse standing at her shoulder', 'the figure is a woman, never the horse itself'],
  sphinx: ['the Sphinx, a creature with the body of a lion and the head of a woman', 'lion paws and haunches', 'serene female face with nemes-style headdress', 'optionally small falcon wings at the shoulders', 'no horns, no bat wings, no demon or dragon anatomy'],
  izanagi: ['Japanese creator god Izanagi as a dignified male deity', 'jeweled spear Ame-no-Nuhoko', 'formal ancient Japanese court robes', 'commanding creator’s presence', 'no demon horns, no white beard, no calligraphy, no seals'],
};

function classifySubject(archetype) {
  if (archetype.pantheon.endsWith('-location') || SUBJECT_OVERRIDES.location.has(archetype.id)) return 'location';
  for (const type of ['creature', 'hybrid', 'emblem']) {
    if (SUBJECT_OVERRIDES[type].has(archetype.id)) return type;
  }
  return 'being';
}

function deriveAttributes(archetype, entry) {
  if (ATTRIBUTE_OVERRIDES[archetype.id]) return ATTRIBUTE_OVERRIDES[archetype.id];
  const splitAttributes = (value) =>
    String(value || '')
      .split(/[;,·]/)
      .map((part) => part.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim())
      .filter((part) => part && part !== 'Phonological Reconstruction' && part.length <= 72);
  return [
    ...new Set([
      ...splitAttributes(`${archetype.domain || ''}; ${archetype.tagline || ''}`),
      ...splitAttributes(entry?.meaning),
    ]),
  ].slice(0, 4);
}

const guidance = {
  aboriginal: 'community-specific visual evidence only; no generic dot painting, no imitation of restricted sacred symbols, no pseudo-script',
  abrahamic: 'early Christian and Byzantine visual composition, period-appropriate garments and objects only, no pseudo-script',
  baltic: 'Baltic amber, solar wheels and natural motifs only when relevant to the entry',
  buddhist: 'Himalayan compositional balance and serene iconographic posture, no pseudo-script',
  canaanite: 'Levantine Bronze Age regalia and profile composition, no pseudo-script',
  celtic: 'La Tene spiral and interlace ornament, anatomically coherent figures',
  chinese: 'Chinese flowing clouds, drapery and cloud-scroll rhythm, no characters or seal script',
  egyptian: 'ancient Egyptian profile composition and period-appropriate regalia, no pseudo-hieroglyphs',
  greek: 'classical Greek drapery, contrapposto and entry-specific attributes, no pseudo-inscriptions',
  hittite: 'Anatolian Bronze Age regalia and profile composition, no pseudo-script',
  incan: 'Andean goldwork and highland geometric rhythm, no pseudo-script',
  japanese: 'ukiyo-e-inspired flowing contour rhythm, no characters or seals',
  korean: 'Korean folk-painting rhythm and celestial or natural motifs, no characters',
  mapuche: 'Mapuche silverwork and entry-specific natural references, no generic tribal markings',
  mesopotamian: 'Mesopotamian cylinder-seal visual rhythm, no pseudo-cuneiform',
  nahuatl: 'Mixtec manuscript geometry and featherwork only when relevant, no pseudo-glyphs',
  norse: 'Norse knotwork rhythm and entry-specific animal, weapon or navigation motifs, no pseudo-runes',
  phoenician: 'Levantine maritime and metalwork references, no pseudo-alphabet',
  polynesian: 'Pacific navigation, ocean and textile geometry without copying protected tribal patterns',
  roman: 'classical Roman contrapposto, drapery and entry-specific attributes, no pseudo-inscriptions',
  sanskrit: 'Indian miniature-inspired ornament, posture and entry-specific attributes, no pseudo-script',
  slavic: 'Slavic folk ornament and entry-specific natural or solar motifs, no pseudo-script',
  taoist: 'Chinese celestial drapery and cosmological geometry only when relevant, no characters',
  yoruba: 'Yoruba brass, crown and bead iconography when relevant, no generic tribal markings',
  zoroastrian: 'Achaemenid profile composition and entry-specific solar or winged motifs, no pseudo-inscriptions',
};

const culturalBoundaries = {
  aboriginal: 'use only the specific Aboriginal community’s ancestral-being visual language; no generic dot painting, no unrelated tribal patterns, no South Asian or East Asian deity regalia',
  abrahamic: 'use early Jewish, Christian or Byzantine visual language only; no Greco-Roman god nudity, no South Asian deity anatomy, no East Asian scripts or seals',
  baltic: 'use Baltic folk and solar visual language only; no Norse, Slavic, Greek or South Asian substitutions',
  buddhist: 'use the specific school and culture’s Buddhist iconography only; every limb, weapon, animal and ornament must be explicitly named in the canonical identity; no pseudo-script',
  canaanite: 'use Levantine Bronze Age visual language only; no Egyptian, Greek, Mesopotamian or South Asian substitutions',
  celtic: 'use the specific Celtic tradition’s La Tène and Insular visual language only; no Norse, Greek or generic tribal substitutions',
  chinese: 'use Chinese visual language only; no Japanese kimono or seals, no South Asian multi-armed deity anatomy, no pseudo-characters',
  egyptian: 'use ancient Egyptian canonical regalia and profile conventions only; no Greek or Roman clothing, no South Asian deity anatomy, no pseudo-hieroglyphs',
  greek: 'use ancient Greek Mediterranean visual language only; every garment, jewel, weapon, animal and symbol must be explicitly named in the canonical identity; no visual element from Roman imperial, South Asian or East Asian traditions',
  hittite: 'use Anatolian Bronze Age visual language only; every garment, jewel, weapon, animal and symbol must be explicitly named in the canonical identity; no Greek, Egyptian, Mesopotamian or South Asian substitutions',
  incan: 'use Andean and Inka visual language only; every garment, jewel, weapon, animal and symbol must be explicitly named in the canonical identity; no Aztec, Maya, generic tribal or European substitutions',
  japanese: 'use Japanese Shinto or Japanese traditional visual language only; every garment, jewel, weapon, animal and mark must be explicitly named in the canonical identity; no Chinese characters or seals, no South Asian deity anatomy or regalia, no unrelated Buddhist iconography',
  korean: 'use Korean visual language only; every garment, jewel, weapon, animal and mark must be explicitly named in the canonical identity; no Chinese or Japanese scripts, no South Asian deity anatomy or regalia',
  mapuche: 'use Mapuche visual language only; every garment, jewel, weapon, animal and mark must be explicitly named in the canonical identity; no generic Indigenous or tribal patterns, no Andean, South Asian or East Asian substitutions',
  mesopotamian: 'use Mesopotamian cylinder-seal and palace visual language only; every garment, jewel, weapon, animal and mark must be explicitly named in the canonical identity; no Egyptian, Greek or South Asian substitutions, no pseudo-cuneiform',
  nahuatl: 'use the specific Nahua manuscript and regalia language only; every garment, jewel, weapon, animal and mark must be explicitly named in the canonical identity; no generic Aztec calendar clichés, no Maya, Andean or European substitutions, no pseudo-glyphs',
  norse: 'use Norse and Germanic visual language only; every garment, jewel, weapon, animal and mark must be explicitly named in the canonical identity; no Greek or Roman togas, no Celtic knot substitutions, no South Asian deity anatomy or regalia, no pseudo-runes',
  phoenician: 'use Levantine maritime and metalwork language only; every garment, jewel, weapon, animal and mark must be explicitly named in the canonical identity; no Greek, Egyptian or South Asian substitutions',
  polynesian: 'use the specific Pacific culture’s visual language only; every garment, jewel, weapon, animal and mark must be explicitly named in the canonical identity; no pan-Polynesian clichés, no Māori or Aboriginal pattern borrowing, no South Asian or East Asian regalia',
  roman: 'use ancient Roman visual language only; every garment, jewel, weapon, animal and symbol must be explicitly named in the canonical identity; no visual element from Greek, South Asian or East Asian traditions unless directly named above',
  sanskrit: 'use the specific deity’s established Indian iconography only; every limb, weapon, animal and ornament must be explicitly named in the canonical identity; ATTRIBUTE EXCLUSIVITY: the trident belongs to Shiva alone, the discus and conch to Vishnu alone, the vina and swan to Saraswati alone, the peacock to Kartikeya alone, the owl to Lakshmi alone, the mace to Vishnu or Hanuman alone — never place another deity’s exclusive attribute in this subject’s hands or background; no extra arms beyond the count named in the identity; no pseudo-script',
  slavic: 'use Slavic folk visual language only; no Norse, Baltic, Greek or generic tribal substitutions',
  taoist: 'use Chinese Daoist visual language only; no Buddhist, Japanese or folk substitutions, no characters or trigram marks unless canonical',
  yoruba: 'use Yoruba orisha iconography only; no generic African tribal patterns, no Dahomean or European substitutions unless historically appropriate',
  zoroastrian: 'use Iranian and Achaemenid visual language only; no Hindu, Buddhist, Greek or generic Persian substitutions, no pseudo-inscriptions',
};

for (const tradition of new Set([...Object.keys(guidance), ...Object.values(traditionAliases)])) {
  const existing = lib.traditions[tradition] || { wins: 0, losses: 0, notes: [] };
  lib.traditions[tradition] = {
    ...existing,
    styleDna:
      tradition === 'aboriginal'
        ? `respectful Australian Aboriginal visual references, ${guidance.aboriginal}`
        : existing.styleDna || `museum-quality figurative illustration, ${guidance[tradition]}`,
    iconography: guidance[tradition],
    culturalBoundary: culturalBoundaries[tradition],
  };
}

const lexiconById = new Map(LEXICON.map((entry) => [entry.id, entry]));
let demand = {};
try {
  demand = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ai-art', 'temple-demand.json'), 'utf8'));
} catch {}
let added = 0;
for (const archetype of ARCHETYPES.filter((entry) => entry.built)) {
  const entry = lexiconById.get(archetype.id);
  const tradition = traditionAliases[archetype.pantheon] || archetype.pantheon;
  const attributes = deriveAttributes(archetype, entry);
  const subjectType = classifySubject(archetype);
  if (!lib.deities[archetype.id]) {
    lib.deities[archetype.id] = {
      tradition,
      attributes: attributes.length ? attributes : [archetype.tagline || archetype.domain || archetype.name],
      subjectType,
      promptVersion: 1,
      wins: 0,
      losses: 0,
      activeMutations: [],
      demandTier: demand[archetype.id]?.tier || 3,
    };
    added++;
    continue;
  }
  const spec = lib.deities[archetype.id];
  spec.tradition = tradition;
  spec.attributes = attributes.length ? attributes : spec.attributes;
  spec.subjectType = subjectType;
  spec.demandTier = demand[archetype.id]?.tier || spec.demandTier || 3;
}

// Tradition-level proactive fences: when a failure mode is measured above a
// rate threshold for a tradition, every deity in that tradition inherits the
// mutation pre-emptively, not only after individual rejects.
const PREEMPTIVE_RULES = [
  { reason: 'garbled-text', minLosses: 3, minRate: 0.3 },
  { reason: 'wrong-attributes', minLosses: 5, minRate: 0.4 },
];
try {
  const LOG_PATH = path.join(ROOT, 'data', 'ai-art', 'generation-log.jsonl');
  const stats = new Map();
  for (const line of fs.readFileSync(LOG_PATH, 'utf8').trim().split('\n')) {
    if (!line) continue;
    const e = JSON.parse(line);
    if (!e.file || !e.verdict) continue;
    const base = path.basename(e.file);
    let deity = base.split('-v')[0];
    for (const fam of Object.keys(lib.families)) {
      if (deity.endsWith(`-${fam}`)) {
        deity = deity.slice(0, -(fam.length + 1));
        break;
      }
    }
    const spec = lib.deities[deity];
    if (!spec) continue;
    if (!stats.has(spec.tradition)) stats.set(spec.tradition, new Map());
    const reasons = stats.get(spec.tradition);
    const reason = e.reason || 'other';
    if (!reasons.has(reason)) reasons.set(reason, { losses: 0, total: 0 });
    const s = reasons.get(reason);
    s.total++;
    if (e.verdict === 'reject') s.losses++;
  }
  let preempted = 0;
  for (const [tradition, reasons] of stats) {
    for (const rule of PREEMPTIVE_RULES) {
      const s = reasons.get(rule.reason);
      if (!s || s.losses < rule.minLosses) continue;
      if (s.losses / s.total < rule.minRate) continue;
      for (const spec of Object.values(lib.deities)) {
        if (spec.tradition !== tradition) continue;
        if (!(spec.activeMutations || []).includes(rule.reason)) {
          spec.activeMutations = [...(spec.activeMutations || []), rule.reason];
          preempted++;
        }
      }
    }
  }
  if (preempted) console.log(`preemptive tradition fences: ${preempted} deity mutations applied`);
} catch {
  // no log yet — nothing to measure
}

const familyDefinitions = {
  tattoo: {
    dna: 'museum-quality blackwork tattoo illustration, bold confident contours, intricate fine-line detail, dotwork and controlled crosshatching, single coherent silhouette, balanced negative space, clean stencil-friendly edges, full-length subject fully contained within the canvas: head-to-toe depiction for anthropomorphic beings with feet fully visible, complete object or emblem for non-anthropomorphic subjects, generous white margin on every side, no cropped anatomy, no cropped wings or attributes, isolated on a plain white background, no background scene, no text, no letters, no pseudo-script, no watermark, no border, no frame',
    mutationOperators: {
      'garbled-text': 'hard exclusion: absolutely no text, letters, pseudo-script, seals, signatures, numbers, dates, logos or watermarks anywhere in the image',
      'wrong-attributes': 'corrective priority: make {attribute} the unmistakable hero of the composition; remove every unrelated weapon, animal, costume detail and symbol; do not invent substitutes',
      'wrong-tradition': 'cultural correction: use only this tradition’s visual language; remove all deity regalia, poses, scripts, architecture and ornament from unrelated cultures',
      'cropped-subject': 'strengthen: full-length subject with the entire silhouette and every extremity inside the frame, generous white margin on every side, no cropped anatomy or attributes',
      'weak-composition': 'alternate layout: single central subject, complete and fully contained, centered, generous white space',
      anatomy: 'append: anatomically correct hands and faces, clean linework',
      'busy-background': 'strengthen: plain white isolated background, no landscape, no scene, no border',
      'off-style': 'prepend the style dna twice and append: strictly black linework on white only',
    },
    notes: ['2026-11-13: stencil-first blackwork, isolated for transparent Commons and Pinterest derivatives'],
  },
  'bw-engraving': {
    dna: 'museum-quality black and white copperplate engraving in the tradition of Gustave Doré, precise burin line, rich controlled crosshatching, sculptural chiaroscuro, full-length subject fully contained within the plate, complete figure or object with elegant negative space, printed on warm ivory paper, no border, no plate mark, no caption, no letters, no pseudo-script, no watermark',
    mutationOperators: {
      'garbled-text': 'append: no caption, no letters, no inscription, no watermark',
      'wrong-attributes': 'corrective priority: make {attribute} the unmistakable hero of the composition; remove every unrelated weapon, animal, costume detail and symbol; do not invent substitutes',
      'wrong-tradition': 'cultural correction: use only this tradition’s visual language; remove all deity regalia, poses, scripts, architecture and ornament from unrelated cultures',
      'cropped-subject': 'strengthen: full plate composition with the entire subject and all attributes inside the frame, generous ivory margin on every side',
      'weak-composition': 'alternate layout: single monumental central subject, complete and fully contained, balanced engraved negative space',
      anatomy: 'append: anatomically correct hands and faces, disciplined burin linework',
      'busy-background': 'strengthen: warm ivory paper background, no landscape, no scene, no border',
      'off-style': 'prepend the style dna twice and append: strictly monochrome copperplate engraving only',
    },
    notes: ['2026-11-13: plate-first ivory-paper engraving with full-subject margins'],
  },
  geometric: {
    dna: 'elite sacred-geometry art print, precise low-poly facets, golden-ratio construction, harmonious radial symmetry, jewel-like gold deep indigo and weathered stone palette, crisp vector-clean edges, dimensional yet minimalist, full emblem or subject fully contained with generous margins, no text, no letters, no pseudo-script, no watermark, no border, no frame',
    mutationOperators: {
      'garbled-text': 'hard exclusion: no symbols that resemble letters, no inscription, no signature, no watermark',
      'wrong-attributes': 'corrective priority: construct {attribute} as the dominant geometric form; remove every unrelated weapon, animal, costume detail and symbol; do not invent substitutes',
      'wrong-tradition': 'cultural correction: derive the geometric language only from this tradition; remove all deity regalia, poses, scripts, architecture and ornament from unrelated cultures',
      'cropped-subject': 'strengthen: complete radial emblem fully inside the frame with generous margins on every side, no cropped points or facets',
      'weak-composition': 'alternate layout: centered radial construction, complete and symmetrical, balanced negative space',
      anatomy: 'append: coherent anatomy translated into clean geometric planes',
      'busy-background': 'strengthen: restrained geometric background, no landscape, no scene, no border',
      'off-style': 'prepend the style dna twice and append: strictly precise low-poly sacred geometry with a gold, indigo and stone palette',
    },
    notes: ['2026-11-13: radial sacred-geometry print language for premium art derivatives'],
  },
  realism: {
    dna: 'museum-grade cinematic realism, breathtakingly detailed, physically accurate anatomy and materials, natural skin, hair, metal and fabric texture, painterly photographic finish, dramatic volumetric light, rich cinematic colour grading, full subject fully contained with breathing room, tasteful dark museum backdrop only when it serves the subject, no text, no letters, no pseudo-script, no watermark, no border, no frame',
    mutationOperators: {
      'garbled-text': 'hard exclusion: absolutely no text, letters, pseudo-script, seals, signatures, numbers, dates, logos or watermarks anywhere in the image',
      'wrong-attributes': 'corrective priority: make {attribute} physically prominent and unmistakable; remove every unrelated weapon, animal, costume detail and symbol; do not invent substitutes',
      'wrong-tradition': 'cultural correction: use only this tradition’s materials, garments, environment and symbolism; remove all deity regalia, poses, scripts, architecture and ornament from unrelated cultures',
      'cropped-subject': 'strengthen: complete full-length subject inside the frame with generous negative space on every side, no cropped anatomy, wings or attributes',
      'weak-composition': 'alternate layout: cinematic full-subject portrait, complete and fully contained, balanced negative space',
      anatomy: 'append: physically accurate anatomy, hands, faces and material behaviour',
      'busy-background': 'strengthen: restrained dark museum backdrop, no landscape clutter, no scene details competing with the subject',
      'off-style': 'prepend the style dna twice and append: strictly cinematic realism, no illustration or cartoon styling',
    },
    notes: ['2026-11-13: museum-grade realism lane for premium Commons and print derivatives'],
  },
  masterpiece: {
    dna: 'elite collector-grade digital masterpiece, hyper-detailed cinematic fantasy realism, intricate jewelry and material microtexture, dramatic volumetric lighting, museum-quality composition, rich layered colour depth, awe-inspiring presence, full subject fully contained with elegant negative space, no text, no letters, no pseudo-script, no watermark, no border, no frame',
    mutationOperators: {
      'garbled-text': 'hard exclusion: absolutely no text, letters, pseudo-script, seals, signatures, numbers, dates, logos or watermarks anywhere in the image',
      'wrong-attributes': 'corrective priority: make {attribute} an unmistakable hero detail; remove every unrelated weapon, animal, costume detail and symbol; do not invent substitutes',
      'wrong-tradition': 'cultural correction: use only this tradition’s materials, garments, environment and symbolism; remove all deity regalia, poses, scripts, architecture and ornament from unrelated cultures',
      'cropped-subject': 'strengthen: complete monumental subject fully inside the frame with elegant negative space on every side',
      'weak-composition': 'alternate layout: single monumental hero subject, complete and fully contained, cinematic balance',
      anatomy: 'append: masterful anatomy, hands, faces, eyes and material microtexture',
      'busy-background': 'strengthen: elegant atmospheric depth without clutter, no competing scene elements',
      'off-style': 'prepend the style dna twice and append: strictly collector-grade cinematic realism, no illustration styling',
    },
    notes: ['2026-11-13: reserved premium lane for curated high-detail PNG-worthy masterpieces'],
  },
};

for (const [family, definition] of Object.entries(familyDefinitions)) {
  lib.families[family] = {
    ...lib.families[family],
    dna: definition.dna,
    mutationOperators: definition.mutationOperators,
    notes: [...new Set([...(lib.families[family]?.notes || []), ...definition.notes])],
  };
}

lib.mutationOperators = {
  ...lib.mutationOperators,
  'garbled-text': 'hard exclusion: absolutely no text, letters, pseudo-script, seals, signatures, numbers, dates, logos or watermarks anywhere in the image',
  'wrong-attributes': 'corrective priority: make {attribute} the unmistakable hero of the composition; remove every unrelated weapon, animal, costume detail and symbol; do not invent substitutes',
  'wrong-tradition': 'cultural correction: use only this tradition’s visual language; remove all deity regalia, poses, scripts, architecture and ornament from unrelated cultures',
  'quality-gate': 'render a clear, visible, high-contrast subject with the exact requested background, margins and aspect ratio',
};

writeFileWithRetry(LIB_PATH, `${JSON.stringify(lib, null, 2)}\n`);
console.log(`AI art library: ${added} flagship deities added; ${Object.keys(lib.deities).length} total; ${Object.keys(lib.traditions).length} traditions.`);
