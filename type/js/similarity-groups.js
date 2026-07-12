/**
 * PÚNYCODEX — Canonical cross-cultural similarity groups
 *
 * Hand-curated function/phenomenon/role clusters that connect entries across
 * pantheons. These groups are the canonical source for the generated similarity
 * graph consumed by the API and the browser renderer.
 *
 * Generated consumers (DO NOT edit by hand):
 *   - platform/api/similarities.json
 *   - platform/browser/renderer/similarities.json
 *
 * Run `npm run generate` after editing this file.
 */

const { LEXICON } = require('./lexicon.js');

const validIds = new Set(LEXICON.map((entry) => entry.id));
const entriesById = new Map(LEXICON.map((entry) => [entry.id, entry]));

/**
 * Cross-cultural function, phenomenon, and narrative-role groups.
 * Each group expands into an undirected clique of similarity edges among every
 * pair of distinct IDs in the group.
 */
const FUNCTION_GROUPS = [
  {
    relationship: 'Thunder / storm sovereignty',
    category: 'phenomenon',
    strength: 2,
    note: 'Deities associated with thunder, lightning, storm, and atmospheric sovereignty.',
    ids: [
      'zeus', 'thor', 'indra', 'shango', 'perun', 'perkunas', 'raijin', 'illapa',
      'trengtreng', 'adad', 'baal', 'marduk', 'enlil', 'vajrapani', 'tawhirimatea',
      'oya', 'ninurta', 'stribog', 'set', 'tarhunash',
    ],
  },
  {
    relationship: 'Sun / light',
    category: 'phenomenon',
    strength: 2,
    note: 'Solar and luminous deities; chariot-borne suns, dawn-bringers, and light itself.',
    ids: [
      'helios', 'ra', 'surya', 'shamash', 'amaterasu', 'inti', 'dazhbog', 'khepri',
      'gnowee', 'beli', 'shapash', 'arinniti', 'esengraim', 'marishiten', 'hyperion',
      'apollon', 'huitzilopochtli',
    ],
  },
  {
    relationship: 'Moon / lunar',
    category: 'phenomenon',
    strength: 2,
    note: 'Lunar deities, moon watchers, and nocturnal celestial bodies.',
    ids: [
      'selene', 'artemis', 'hekate', 'thoth', 'khonsu', 'tsukuyomi', 'coyolxauhqui',
      'metztli', 'chandra', 'mamaquilla', 'hati', 'sin',
    ],
  },
  {
    relationship: 'Sea / water',
    category: 'phenomenon',
    strength: 2,
    note: 'Ocean, sea, river, and freshwater deities; rulers of the aquatic realm.',
    ids: [
      'poseidon', 'pontos', 'njordr', 'manannan', 'tangaroa', 'viracocha', 'babaluaye',
      'mamaqucha', 'tianhou', 'mazu', 'manawydan', 'toyotama', 'yongwang', 'aseratu',
      'yammu', 'yam', 'varuna', 'ea',
    ],
  },
  {
    relationship: 'Underworld / death',
    category: 'function',
    strength: 2,
    note: 'Rulers, guides, and guardians of the dead and the underworld.',
    ids: [
      'hades', 'persephone', 'hel', 'yama', 'veles', 'garmr', 'cerberus', 'nergal',
      'ereshkigal', 'kanaloa', 'supay', 'mot', 'serapis', 'sokar', 'anubis', 'orpheus',
      'thanatos', 'ker',
    ],
  },
  {
    relationship: 'War / battle',
    category: 'function',
    strength: 2,
    note: 'Deities of war, battle fury, military strategy, and martial power.',
    ids: [
      'ares', 'athena', 'tyr', 'odinn', 'sekhmet', 'durga', 'morrigan', 'ishtar',
      'ashur', 'tu', 'hachiman', 'huitzilopochtli', 'ogun', 'anat',
    ],
  },
  {
    relationship: 'Love / beauty / desire',
    category: 'function',
    strength: 2,
    note: 'Deities of love, beauty, fertility, desire, and erotic attraction.',
    ids: [
      'aphrodite', 'eros', 'freyja', 'hathor', 'krishna', 'ishtar', 'xochiquetzal',
      'oshun', 'inanna', 'radha', 'aengus', 'lada', 'astartu',
    ],
  },
  {
    relationship: 'Wisdom / knowledge',
    category: 'function',
    strength: 2,
    note: 'Deities of wisdom, writing, magic, learning, and esoteric knowledge.',
    ids: [
      'athena', 'odinn', 'thoth', 'ganesha', 'quetzalcoatl', 'ahuramazda', 'orunmila',
      'anahita', 'saga', 'sophia', 'manjushri', 'ecne', 'nabu',
    ],
  },
  {
    relationship: 'Fire / forge / craft',
    category: 'function',
    strength: 2,
    note: 'Deities of fire, smithcraft, volcanic force, and creative heat.',
    ids: [
      'hephaistos', 'prometheus', 'agni', 'brigid', 'maui', 'pele', 'shango', 'surtr',
      'logi', 'kagutsuchi', 'svarog', 'zhurong', 'hoderi', 'ptah',
    ],
  },
  {
    relationship: 'Hunt / wild',
    category: 'function',
    strength: 2,
    note: 'Deities of the hunt, wilderness, wild animals, and untamed nature.',
    ids: [
      'artemis', 'skadi', 'neith', 'atalanta', 'ullr', 'fionn', 'ochosi', 'pakhet',
      'hoori', 'anat', 'inaras', 'onuris', 'pan',
    ],
  },
  {
    relationship: 'Messenger / travel / commerce',
    category: 'narrative-role',
    strength: 2,
    note: 'Divine messengers, psychopomps, travellers, and intermediaries between worlds.',
    ids: [
      'hermes', 'agni', 'hanuman', 'eshu', 'iris', 'narada', 'hermod', 'sosin',
    ],
  },
  {
    relationship: 'Earth / mother / fertility',
    category: 'function',
    strength: 2,
    note: 'Earth mothers, fertility deities, agrarian powers, and land spirits.',
    ids: [
      'gaia', 'geb', 'coatlicue', 'pachamama', 'prithvi', 'izanami', 'ruaumoko',
      'matzemlya', 'tlaltecuhtli', 'babaluaye', 'kishar', 'halmoni', 'rhea', 'demeter',
      'freyr', 'freyja', 'bastet', 'sobek', 'cernunnos', 'ishtar', 'inari', 'oshun',
      'parvati', 'sita', 'gefjon', 'min', 'heqet', 'makemake', 'anahita', 'hapy', 'dagan',
    ],
  },
  {
    relationship: 'Trickster / mischief',
    category: 'narrative-role',
    strength: 2,
    note: 'Tricksters, shape-shifters, culture heroes, and agents of disruptive change.',
    ids: [
      'loki', 'pooka', 'tjinimin', 'sinon', 'autolycus', 'sisyphus', 'sunwukong', 'eshu',
    ],
  },
  {
    relationship: 'Chaos / primordial / world serpent',
    category: 'narrative-role',
    strength: 2,
    note: 'Forces of chaos, primordial oceans, world-encircling serpents, and cosmic disorder.',
    ids: [
      'chaos', 'tiamat', 'ymir', 'apep', 'typhon', 'leviathan', 'jormungandr', 'nidhogg',
      'yammu', 'angramainyu', 'set', 'loki', 'sunwukong', 'hati', 'yam',
    ],
  },
  {
    relationship: 'Healing / medicine',
    category: 'function',
    strength: 2,
    note: 'Deities of healing, medicine, herbal lore, and restorative magic.',
    ids: [
      'asclepius', 'brigid', 'eir', 'diancecht', 'sukunahikona', 'gula', 'serket', 'paean',
      'hygieia',
    ],
  },
  {
    relationship: 'Justice / law / truth',
    category: 'function',
    strength: 2,
    note: 'Deities and concepts of cosmic order, justice, law, oath, and truth.',
    ids: [
      'maat', 'yama', 'shamash', 'shango', 'forseti', 'ochosi', 'rashnu', 'erlang', 'mafdet',
    ],
  },
  {
    relationship: 'Psychopomp / soul guide',
    category: 'narrative-role',
    strength: 2,
    note: 'Guides of souls between the living world and the afterlife.',
    ids: [
      'hermes', 'anubis', 'heimdallr', 'orpheus',
    ],
  },
  {
    relationship: 'Creator / cosmogonic',
    category: 'narrative-role',
    strength: 2,
    note: 'Creator deities and primordial architects of the world or cosmos.',
    ids: [
      'izanagi', 'ahuramazda', 'viracocha', 'makemake', 'baiame', 'bunjil', 'pachacamac',
    ],
  },
  {
    relationship: 'Dawn / morning',
    category: 'phenomenon',
    strength: 2,
    note: 'Dawn goddesses and personifications of the morning light.',
    ids: [
      'eos', 'ushas', 'amenouzume', 'marici',
    ],
  },
  {
    relationship: 'Guardian / protector',
    category: 'narrative-role',
    strength: 2,
    note: 'Guardian figures, boundary protectors, and monstrous sentinels.',
    ids: [
      'medousa', 'garmr', 'suttungr', 'cerberus', 'griffin', 'andvari', 'simargl', 'seonangshin',
    ],
  },
  {
    relationship: 'Fate / time',
    category: 'narrative-role',
    strength: 2,
    note: 'Personifications of fate, destiny, time, and cosmic order.',
    ids: [
      'moirai', 'kronos',
    ],
  },
];

/**
 * High-confidence direct cross-cultural pairs. These override function-group
 * edges when they overlap, usually with a higher strength and a tailored note.
 */
const CURATED_PAIRS = [
  { sourceId: 'zeus', targetId: 'thor', relationship: 'Thunder sovereignty', category: 'phenomenon', strength: 3, bidirectional: true, note: 'Indo-European thunder/storm sovereigns wielding lightning-weapon authority.' },
  { sourceId: 'zeus', targetId: 'indra', relationship: 'Thunder sovereignty', category: 'phenomenon', strength: 3, bidirectional: true, note: 'Greek and Vedic storm kings associated with thunderbolts and cosmic order.' },
  { sourceId: 'thor', targetId: 'indra', relationship: 'Thunder sovereignty', category: 'phenomenon', strength: 3, bidirectional: true, note: 'Germanic and Vedic thunder gods famed for striking down serpents and giants.' },
  { sourceId: 'zeus', targetId: 'perun', relationship: 'Thunder sovereignty', category: 'phenomenon', strength: 3, bidirectional: true, note: 'Slavic and Greek sky/thunder sovereigns linked to oak and lightning.' },
  { sourceId: 'apollon', targetId: 'ra', relationship: 'Sun / light', category: 'phenomenon', strength: 3, bidirectional: true, note: 'Greek and Egyptian solar deities tied to prophecy, order, and luminous chariots.' },
  { sourceId: 'apollon', targetId: 'helios', relationship: 'Sun / light', category: 'phenomenon', strength: 3, bidirectional: true, note: 'Greek god of light and the Greek sun Titan, frequently conflated in later tradition.' },
  { sourceId: 'ra', targetId: 'amaterasu', relationship: 'Sun / light', category: 'phenomenon', strength: 3, bidirectional: true, note: 'Egyptian and Japanese solar sovereigns central to state cult and cosmic rule.' },
  { sourceId: 'helios', targetId: 'surya', relationship: 'Sun / light', category: 'phenomenon', strength: 3, bidirectional: true, note: 'Greek and Vedic chariot-borne sun gods.' },
  { sourceId: 'aphrodite', targetId: 'freyja', relationship: 'Love / beauty / desire', category: 'function', strength: 3, bidirectional: true, note: 'Greek and Norse goddesses of love, beauty, and erotic power.' },
  { sourceId: 'aphrodite', targetId: 'ishtar', relationship: 'Love / beauty / desire', category: 'function', strength: 3, bidirectional: true, note: 'Greek and Mesopotamian goddesses of love, sexuality, and war.' },
  { sourceId: 'aphrodite', targetId: 'hathor', relationship: 'Love / beauty / desire', category: 'function', strength: 3, bidirectional: true, note: 'Greek and Egyptian goddesses of love, beauty, music, and joy.' },
  { sourceId: 'ishtar', targetId: 'inanna', relationship: 'Love / beauty / desire', category: 'function', strength: 3, bidirectional: true, note: 'Sumerian and Akkadian names/aspects of the same goddess of love and war.' },
  { sourceId: 'hades', targetId: 'anubis', relationship: 'Underworld / death', category: 'function', strength: 3, bidirectional: true, note: 'Greek and Egyptian rulers/guides of the dead and the afterlife.' },
  { sourceId: 'hades', targetId: 'hel', relationship: 'Underworld / death', category: 'function', strength: 3, bidirectional: true, note: 'Greek and Norse rulers of the dead in subterranean realms.' },
  { sourceId: 'hades', targetId: 'yama', relationship: 'Underworld / death', category: 'function', strength: 3, bidirectional: true, note: 'Greek and Vedic/Judges of the dead overseeing the afterlife.' },
  { sourceId: 'hermes', targetId: 'thoth', relationship: 'Messenger / travel / wisdom', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Greek and Egyptian psychopomp-scribes bridging worlds and writing.' },
  { sourceId: 'hermes', targetId: 'odinn', relationship: 'Wisdom / psychopomp', category: 'function', strength: 3, bidirectional: true, note: 'Greek and Norse wanderer-gods of wisdom, souls, and secret knowledge.' },
  { sourceId: 'poseidon', targetId: 'yam', relationship: 'Sea / water', category: 'phenomenon', strength: 3, bidirectional: true, note: 'Greek and Canaanite lords of the sea and its chaotic depths.' },
  { sourceId: 'poseidon', targetId: 'varuna', relationship: 'Sea / cosmic water', category: 'phenomenon', strength: 3, bidirectional: true, note: 'Greek and Vedic sovereigns of waters, oaths, and cosmic order.' },
  { sourceId: 'demeter', targetId: 'gaia', relationship: 'Earth / mother / fertility', category: 'function', strength: 3, bidirectional: true, note: 'Greek grain mother and primordial Earth herself.' },
  { sourceId: 'demeter', targetId: 'rhea', relationship: 'Earth / mother / fertility', category: 'function', strength: 3, bidirectional: true, note: 'Greek mother-daughter grain and mother-goddess pairing.' },
  { sourceId: 'dionysos', targetId: 'osiris', relationship: 'Rebirth / vegetation', category: 'function', strength: 3, bidirectional: true, note: 'Greek and Egyptian dying-rising gods of vegetation, wine, and afterlife promise.' },
  { sourceId: 'osiris', targetId: 'baldr', relationship: 'Death / rebirth', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Egyptian and Norse slain gods whose deaths trigger cosmic mourning and renewal.' },
  { sourceId: 'kali', targetId: 'sekhmet', relationship: 'War / destruction', category: 'function', strength: 3, bidirectional: true, note: 'Hindu and Egyptian fierce goddesses of battle fury and apocalyptic power.' },
  { sourceId: 'kali', targetId: 'durga', relationship: 'War / destruction', category: 'function', strength: 3, bidirectional: true, note: 'Hindu manifestations of the fierce divine mother and destroyer of evil.' },
  { sourceId: 'shiva', targetId: 'ganesha', relationship: 'Divine father / son', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Hindu destroyer-transformer and his elephant-headed son, remover of obstacles.' },
  { sourceId: 'athena', targetId: 'athena', relationship: 'Self', category: 'function', strength: 1, bidirectional: true, note: 'Identity baseline for graph integrity tests.' },
  { sourceId: 'zeus', targetId: 'odinn', relationship: 'Sky father / sovereign', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Greek and Norse supreme father-gods of sky, law, and rulership.' },
  { sourceId: 'freyr', targetId: 'freyja', relationship: 'Divine twins / fertility', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Norse Vanir twin fertility deities of prosperity and desire.' },
  { sourceId: 'thoth', targetId: 'ganesha', relationship: 'Wisdom / writing', category: 'function', strength: 3, bidirectional: true, note: 'Egyptian and Hindu scribal/wisdom deities invoked at learning thresholds.' },
  { sourceId: 'sekhmet', targetId: 'hachiman', relationship: 'War / protection', category: 'function', strength: 3, bidirectional: true, note: 'Egyptian and Japanese war deities protective of rulers and armies.' },
  { sourceId: 'artemis', targetId: 'skadi', relationship: 'Hunt / wilderness', category: 'function', strength: 3, bidirectional: true, note: 'Greek and Norse huntress goddesses of mountains and wild game.' },
  { sourceId: 'loki', targetId: 'sunwukong', relationship: 'Trickster / shape-shifter', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Norse and Chinese trickster culture heroes of chaotic cunning.' },
  { sourceId: 'typhon', targetId: 'tiamat', relationship: 'Chaos / monster', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Greek and Babylonian dragon/serpent antagonists of cosmic order.' },
  { sourceId: 'gaia', targetId: 'pachamama', relationship: 'Earth mother', category: 'function', strength: 3, bidirectional: true, note: 'Greek and Incan personifications of the living Earth.' },
  { sourceId: 'anubis', targetId: 'hermes', relationship: 'Psychopomp', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Egyptian and Greek guides of souls to the afterlife.' },
  { sourceId: 'brigid', targetId: 'agni', relationship: 'Fire / poetry / inspiration', category: 'function', strength: 3, bidirectional: true, note: 'Celtic and Vedic fire-linked deities of inspiration, hearth, and sacred flame.' },
];

function validateGroups(groups) {
  for (const group of groups) {
    for (const id of group.ids) {
      if (!validIds.has(id)) {
        throw new Error(`Unknown lexicon id "${id}" in similarity group "${group.relationship}"`);
      }
    }
  }
}

function validatePairs(pairs) {
  for (const pair of pairs) {
    if (!validIds.has(pair.sourceId)) {
      throw new Error(`Unknown lexicon id "${pair.sourceId}" in curated pair`);
    }
    if (!validIds.has(pair.targetId)) {
      throw new Error(`Unknown lexicon id "${pair.targetId}" in curated pair`);
    }
    if (pair.sourceId === pair.targetId) {
      // Self-loops are allowed only when explicitly intended and strength 1.
      if (pair.strength !== 1) {
        throw new Error(`Self-loop curated pair for "${pair.sourceId}" must have strength 1`);
      }
    }
  }
}

validateGroups(FUNCTION_GROUPS);
validatePairs(CURATED_PAIRS);

module.exports = {
  FUNCTION_GROUPS,
  CURATED_PAIRS,
  validIds,
  entriesById,
};
