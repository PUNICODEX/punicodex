/**
 * PuniCodex — Canonical cross-cultural similarity groups
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
      'oya', 'ninurta', 'stribog', 'seth', 'tarhunash', 'keraunos', 'susanoo',
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
      'apollon', 'huitzilopochtli', 'tonatiuh',
    ],
  },
  {
    relationship: 'Moon / lunar',
    category: 'phenomenon',
    strength: 2,
    note: 'Lunar deities, moon watchers, and nocturnal celestial bodies.',
    ids: [
      'selene', 'artemis', 'hekate', 'thoth', 'khonsu', 'tsukuyomi', 'coyolxauhqui',
      'metztli', 'chandra', 'mamaquilla', 'hati', 'sin', 'change', 'mani',
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
      'yammu', 'yam', 'varuna', 'ea', 'longwang', 'susanoo', 'benzaiten', 'hoderi',
      'kotoshironushi',
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
      'thanatos', 'ker', 'izanami',
    ],
  },
  {
    relationship: 'War / battle',
    category: 'function',
    strength: 2,
    note: 'Deities of war, battle fury, military strategy, and martial power.',
    ids: [
      'ares', 'athena', 'tyr', 'odinn', 'sekhmet', 'durga', 'morrigan', 'ishtar',
      'ashur', 'tu', 'hachiman', 'huitzilopochtli', 'ogun', 'anat', 'nezha', 'kratos',
      'narasimha', 'thrudr', 'marishiten', 'mars',
    ],
  },
  {
    relationship: 'Love / beauty / desire',
    category: 'function',
    strength: 2,
    note: 'Deities of love, beauty, fertility, desire, and erotic attraction.',
    ids: [
      'aphrodite', 'eros', 'freyja', 'hathor', 'krishna', 'ishtar', 'xochiquetzal',
      'oshun', 'inanna', 'radha', 'aengus', 'lada', 'astartu', 'helene', 'benzaiten',
    ],
  },
  {
    relationship: 'Wisdom / knowledge',
    category: 'function',
    strength: 2,
    note: 'Deities of wisdom, writing, magic, learning, and esoteric knowledge.',
    ids: [
      'athena', 'odinn', 'thoth', 'ganesha', 'quetzalcoatl', 'ahuramazda', 'orunmila',
      'anahita', 'saga', 'sophia', 'manjushri', 'ecne', 'nabu', 'kongzi', 'vor',
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
      'hermes', 'agni', 'hanuman', 'eshu', 'iris', 'narada', 'hermod', 'sosin', 'gna',
      'sarutahiko',
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
      'parvati', 'sita', 'gefjon', 'min', 'heqet', 'makemake', 'anahita', 'hp', 'dagan',
      'jord', 'fjorgyn', 'audhumla', 'shakti', 'ninigi', 'nishinakahime', 'omononushi',
      'hoori', 'toyotama', 'ugayafukiaezu',
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
      'yammu', 'angramainyu', 'seth', 'loki', 'sunwukong', 'hati', 'yam', 'angrboda',
      'ravana',
    ],
  },
  {
    relationship: 'Healing / medicine',
    category: 'function',
    strength: 2,
    note: 'Deities of healing, medicine, herbal lore, and restorative magic.',
    ids: [
      'asklepios', 'brigid', 'eir', 'diancecht', 'sukunahikona', 'gula', 'serket', 'paean',
      'hygieia', 'bhaisajyaguru',
    ],
  },
  {
    relationship: 'Justice / law / truth',
    category: 'function',
    strength: 2,
    note: 'Deities and concepts of cosmic order, justice, law, oath, and truth.',
    ids: [
      'maat', 'yama', 'shamash', 'shango', 'forseti', 'ochosi', 'rashnu', 'erlang', 'mafdet',
      'var',
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
      'oduduwa', 'jagannatha', 'audhumla',
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
      'medousa', 'garmr', 'suttungr', 'cerberus', 'griffin', 'andvari', 'simargl',
      'seonangshin', 'fafnir', 'goshin', 'sarutahiko', 'tajikarao',
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
  {
    relationship: 'Heavenly sovereign / supreme deity',
    category: 'function',
    strength: 2,
    note: 'Supreme sky-fathers and highest celestial rulers across pantheons.',
    ids: [
      'zeus', 'odinn', 'yuhuang', 'shangdi', 'olodumare', 'tiandi',
    ],
  },
  {
    relationship: 'Sleep / dream / death-like trance',
    category: 'phenomenon',
    strength: 2,
    note: 'Powers of sleep, dream, and the liminal state between life and death.',
    ids: [
      'hypnos', 'oneiros', 'thanatos',
    ],
  },
  {
    relationship: 'Compassion / mercy / savior',
    category: 'function',
    strength: 2,
    note: 'Bodhisattvas and savior deities whose primary domain is mercy and liberation.',
    ids: [
      'avalokiteshvara', 'guanyin', 'ksitigarbha', 'amida', 'kannon',
    ],
  },
  {
    relationship: 'Wealth / prosperity / abundance',
    category: 'function',
    strength: 2,
    note: 'Deities of wealth, fortune, abundance, and material prosperity.',
    ids: [
      'caishen', 'lakshmi', 'freyja', 'ebisu', 'benzaiten', 'inari',
    ],
  },
  {
    relationship: 'Mythic hero / monster-slayer / city-founder',
    category: 'narrative-role',
    strength: 2,
    note: 'Culture heroes who slay monsters, found cities, and establish social order.',
    ids: [
      'theseus', 'herakles', 'perseus', 'gilgamesh', 'huangdi',
    ],
  },
  {
    relationship: 'Riddles / oracle / prophecy',
    category: 'narrative-role',
    strength: 2,
    note: 'Figures and places bound to prophecy, riddles, and oracular revelation.',
    ids: [
      'oidipous', 'sphinx', 'python',
    ],
  },
  {
    relationship: 'Titan / forethought and afterthought',
    category: 'narrative-role',
    strength: 2,
    note: 'Titanic siblings and culture-bearers of foresight, hindsight, and cosmic burden.',
    ids: [
      'prometheus', 'epimetheus', 'atlas',
    ],
  },
  {
    relationship: 'Monster progenitor / parent of apocalypse',
    category: 'narrative-role',
    strength: 2,
    note: 'Parents of monsters and progenitors whose children bring cosmic destruction.',
    ids: [
      'angrboda', 'typhon', 'tiamat',
    ],
  },
  {
    relationship: 'Sacred center / world navel / axis mundi',
    category: 'phenomenon',
    strength: 2,
    note: 'Sacred places and objects regarded as the center or axis of the world.',
    ids: [
      'omphalos', 'delphoi', 'yggdrasill', 'fuji', 'ise', 'takachiho', 'kumano', 'shikoku',
      'nagoya',
    ],
  },
  {
    relationship: 'Soul / breath / animating spirit',
    category: 'phenomenon',
    strength: 2,
    note: 'Personifications and concepts of the soul, breath, and life-force.',
    ids: [
      'psyche', 'ka', 'ba',
    ],
  },
  {
    relationship: 'Divine feminine power / shakti',
    category: 'function',
    strength: 2,
    note: 'The active, fierce, and creative power of the divine feminine.',
    ids: [
      'shakti', 'kali', 'durga',
    ],
  },
  {
    relationship: 'Avatar / protector manifestation',
    category: 'narrative-role',
    strength: 2,
    note: 'Divine avatars and protective manifestations descended to restore order.',
    ids: [
      'narasimha', 'vishnu', 'krishna', 'varaha',
    ],
  },
  {
    relationship: 'Forbidden gift / bound fate',
    category: 'narrative-role',
    strength: 2,
    note: 'Figures whose gifts, curiosity, or divided wisdom bind the fate of mortals.',
    ids: [
      'pandora', 'prometheus', 'epimetheus',
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
  { sourceId: 'asherah', targetId: 'athiratu', relationship: 'Same goddess, two traditions', category: 'identity', strength: 3, bidirectional: true, note: 'The Ugaritic ʾAṯiratu and the biblical Asherah — one great mother of the gods under two names.' },
  { sourceId: 'longwang', targetId: 'yongwang', relationship: 'Same figure, two traditions', category: 'identity', strength: 3, bidirectional: true, note: 'The Chinese Lóngwáng and the Korean Yongwang — the Dragon King of the seas under his Chinese and Korean names.' },
  { sourceId: 'change', targetId: 'selene', relationship: 'Moon personified', category: 'phenomenon', strength: 2, bidirectional: true, note: 'Greek and Chinese personifications of the moon itself — not merely lunar deities but the moon made goddess.' },
  { sourceId: 'houyi', targetId: 'herakles', relationship: 'Culture hero / monster-slayer', category: 'narrative-role', strength: 2, bidirectional: true, note: 'Greek and Chinese bow-heroes who rid the world of ravaging monsters at the dawn of order.' },
  { sourceId: 'nezha', targetId: 'sunwukong', relationship: 'Rebel against heaven', category: 'narrative-role', strength: 2, bidirectional: true, note: 'Chinese rebel heroes who defy the celestial bureaucracy — and meet in battle in Journey to the West.' },
  { sourceId: 'change', targetId: 'houyi', relationship: 'The elixir cycle', category: 'narrative-role', strength: 2, bidirectional: true, note: 'Husband and wife of the moon-ascension myth — the elixir of immortality passes between them.' },
  { sourceId: 'xiwangmu', targetId: 'houyi', relationship: 'The elixir grant', category: 'narrative-role', strength: 2, bidirectional: true, note: 'The Queen Mother of the West grants Hòuyì the elixir of immortality — the gift that becomes Cháng’é’s ascension.' },
  { sourceId: 'anubis', targetId: 'hermes', relationship: 'Psychopomp', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Egyptian and Greek guides of souls to the afterlife.' },
  { sourceId: 'brigid', targetId: 'agni', relationship: 'Fire / poetry / inspiration', category: 'function', strength: 3, bidirectional: true, note: 'Celtic and Vedic fire-linked deities of inspiration, hearth, and sacred flame.' },
  { sourceId: 'sigurd', targetId: 'fafnir', relationship: 'Dragon-slayer and hoard-dragon', category: 'narrative-role', strength: 2, bidirectional: true, note: 'The Vǫlsunga core: Sigurðr slays Fáfnir on Reginn\'s counsel and takes the cursed hoard — slayer and dragon bound in one cycle.' },
  { sourceId: 'sigurd', targetId: 'brynhildr', relationship: 'The Vǫlsunga cycle: sworn lovers', category: 'narrative-role', strength: 2, bidirectional: true, note: 'The dragon-slayer and the valkyrie — betrothed on the mountain, betrayed by the ale of forgetfulness, united only in death.' },
  { sourceId: 'fafnir', targetId: 'reginn', relationship: 'The Vǫlsunga cycle: brothers divided by the hoard', category: 'narrative-role', strength: 2, bidirectional: true, note: 'Reginn the smith plots, Fáfnir the dragon guards — the cursed gold of Andvari sets brother against brother and kills them both.' },
  { sourceId: 'sigurd', targetId: 'reginn', relationship: 'The Vǫlsunga cycle: foster-father and foster-son', category: 'narrative-role', strength: 2, bidirectional: true, note: 'Reginn reforges Gram and sends Sigurðr against his own brother — then plots the hero\'s murder and dies by the same blade.' },
  { sourceId: 'sigurd', targetId: 'herakles', relationship: 'Culture hero / monster-slayer', category: 'narrative-role', strength: 2, bidirectional: true, note: 'Greek and Norse strong-heroes who win imperishable glory by killing monsters — the labors and the dragon-fight as the same plot.' },
  { sourceId: 'fafnir', targetId: 'jormungandr', relationship: 'Norse serpents', category: 'narrative-role', strength: 2, bidirectional: true, note: 'The two great serpents of Norse tradition — the hoard-dragon of the Vǫlsunga cycle and the world-serpent of Ragnarök.' },
  { sourceId: 'mani', targetId: 'selene', relationship: 'Moon personified', category: 'phenomenon', strength: 2, bidirectional: true, note: 'Norse and Greek personifications of the moon itself — not merely lunar deities but the moon made god and goddess.' },
  { sourceId: 'mani', targetId: 'tsukuyomi', relationship: 'Moon personified', category: 'phenomenon', strength: 2, bidirectional: true, note: 'Norse and Japanese male moon deities — the rarer masculine face of the moon across world pantheons.' },
  { sourceId: 'bifrost', targetId: 'iris', relationship: 'Rainbow between worlds', category: 'phenomenon', strength: 2, bidirectional: true, note: 'Norse and Greek rainbows as the passage between gods and mortals — the bridge that is walked and the messenger who walks it.' },
  { sourceId: 'bifrost', targetId: 'heimdallr', relationship: 'The watchman and the bridge', category: 'narrative-role', strength: 2, bidirectional: true, note: 'Heimdallr keeps his watch at Himinbjǫrg where the rainbow bridge meets heaven — the sentry and the span are one institution.' },
  { sourceId: 'mjolnir', targetId: 'draupnir', relationship: 'Dwarf-forged treasures of the Æsir', category: 'narrative-role', strength: 2, bidirectional: true, note: 'Sindri and Brokkr\'s masterworks, won in the same wager with Loki\'s head as the stake — the hammer and the self-multiplying ring.' },
  { sourceId: 'kratos', targetId: 'zeus', relationship: 'Strength serves the sovereign', category: 'narrative-role', strength: 3, bidirectional: true, note: 'The personification of strength and the thunder sovereign he serves in the Titanomachy.' },
  { sourceId: 'angrboda', targetId: 'loki', relationship: 'Monster mother and trickster father', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Angrboða and Loki are the parents of Fenrir, Jörmungandr, and Hel — the three great enemies of the gods.' },
  { sourceId: 'ereshkigal', targetId: 'nergal', relationship: 'Queen and king of the underworld', category: 'function', strength: 3, bidirectional: true, note: 'The rulers of the Mesopotamian underworld — Ereškigal queen of the dead and Nergal who descended to become her consort.' },
  { sourceId: 'avalokiteshvara', targetId: 'guanyin', relationship: 'Same bodhisattva, two traditions', category: 'identity', strength: 3, bidirectional: true, note: 'Avalokiteśvara and Guānyīn are the same compassionate savior bodhisattva in Sanskrit and Chinese transmission.' },
  { sourceId: 'bhaisajyaguru', targetId: 'asklepios', relationship: 'Medicine and healing', category: 'function', strength: 3, bidirectional: true, note: 'The Buddhist Medicine Buddha and the Greek god of medicine both preside over restoration and cure.' },
  { sourceId: 'susanoo', targetId: 'amaterasu', relationship: 'Storm-sun sibling rivalry', category: 'narrative-role', strength: 3, bidirectional: true, note: 'The Shinto storm god and sun goddess are siblings whose quarrel shapes heaven and earth.' },
  { sourceId: 'helene', targetId: 'aphrodite', relationship: 'Beauty that moves worlds', category: 'function', strength: 2, bidirectional: true, note: 'The most beautiful mortal woman and the goddess of beauty whose gift set the Trojan War in motion.' },
  { sourceId: 'psyche', targetId: 'eros', relationship: 'Soul and Love', category: 'narrative-role', strength: 3, bidirectional: true, note: 'The soul and desire personified — lovers whose trials became the archetype of the soul\'s union with love.' },
  { sourceId: 'pandora', targetId: 'epimetheus', relationship: 'The jar and afterthought', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Epimetheus accepted Pandora and her jar, releasing the ills that sorrow mortality.' },
  { sourceId: 'ravana', targetId: 'rama', relationship: 'Demon king and divine hero', category: 'narrative-role', strength: 3, bidirectional: true, note: 'The ten-headed king of Laṅkā and the avatāra of Viṣṇu whose war is the Rāmāyaṇa.' },
  { sourceId: 'oduduwa', targetId: 'olodumare', relationship: 'Creator and progenitor', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Olódùmarè the supreme creator sent Odùduwà to found Ilé-Ifẹ̀ and shape the Yoruba world.' },
  { sourceId: 'yuhuang', targetId: 'shangdi', relationship: 'Chinese supreme sky sovereigns', category: 'function', strength: 2, bidirectional: true, note: 'The Jade Emperor and Shàngdì are the highest celestial rulers of Chinese religious imagination across epochs.' },
  { sourceId: 'kongzi', targetId: 'laozi', relationship: 'Chinese sage founders', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Master Kong the teacher of ritual and Lǎozǐ the teacher of the Way — the two pillars of Chinese philosophy.' },
  { sourceId: 'narasimha', targetId: 'vishnu', relationship: 'Avatar and preserver', category: 'identity', strength: 3, bidirectional: true, note: 'Narasiṃha the man-lion is an avatāra of Viṣṇu, the preserver, sprung to save his devotee.' },
  { sourceId: 'jagannatha', targetId: 'krishna', relationship: 'Krishna as Lord of the World', category: 'identity', strength: 3, bidirectional: true, note: 'Jagannātha is Kṛṣṇa worshipped as the Lord of the Universe at Purī.' },
  { sourceId: 'theseus', targetId: 'herakles', relationship: 'Greek monster-slayers', category: 'narrative-role', strength: 2, bidirectional: true, note: 'The Athenian slayer of the Minotaur and the pan-Hellenic strongman-hero — the two great Greek monster-slayers.' },
  { sourceId: 'tonatiuh', targetId: 'huitzilopochtli', relationship: 'Aztec sun and war', category: 'function', strength: 3, bidirectional: true, note: 'The Fifth Sun and the hummingbird-warrior god who feeds him hearts in the Aztec cosmos.' },
  { sourceId: 'shakti', targetId: 'shiva', relationship: 'Power and the god it animates', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Śakti is the active power of which Śiva is the possessor — the goddess and the god inseparable in tantra.' },
  { sourceId: 'keraunos', targetId: 'zeus', relationship: 'Thunderbolt and wielder', category: 'phenomenon', strength: 3, bidirectional: true, note: 'Keraunós is the thunderbolt itself, the sovereign weapon of Zeus.' },
  { sourceId: 'omphalos', targetId: 'delphoi', relationship: 'Navel stone and oracle', category: 'phenomenon', strength: 3, bidirectional: true, note: 'The omphalós stone at Delphoi marks the navel of the world and the seat of Apollo\'s oracle.' },
  { sourceId: 'oidipous', targetId: 'sphinx', relationship: 'Riddle solver and riddler', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Oidípous solved the Sphinx\'s riddle and destroyed the monster — question and answer bound in one fate.' },
  { sourceId: 'oneiros', targetId: 'hypnos', relationship: 'Dream and sleep', category: 'phenomenon', strength: 3, bidirectional: true, note: 'Óneiros the dream and Hýpnos sleep are brothers who visit mortals by night.' },
  { sourceId: 'audhumla', targetId: 'ymir', relationship: 'Primeval nourisher and frost giant', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Auðhumla the primeval cow licked the salty ice and nourished Ymir, the first frost giant.' },
  { sourceId: 'jord', targetId: 'thor', relationship: 'Earth mother and thunder son', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Jǫrð the earth is the mother of Þórr the thunder-god in Norse genealogy.' },
  { sourceId: 'fjorgyn', targetId: 'jord', relationship: 'Same goddess, two traditions', category: 'identity', strength: 3, bidirectional: true, note: 'Fjǫrgyn and Jǫrð are both Norse names for the earth goddess, mother of Þórr.' },
  { sourceId: 'var', targetId: 'vor', relationship: 'Sister oath-goddesses', category: 'function', strength: 2, bidirectional: true, note: 'Vár and Vǫr are Æsir goddesses of oaths, vows, and the knowledge that witnesses them.' },
  { sourceId: 'thrudr', targetId: 'thor', relationship: 'Daughter of thunder', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Þrúðr is the daughter of Þórr, a valkyrie and personification of strength.' },
  { sourceId: 'gna', targetId: 'hermes', relationship: 'Divine messengers', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Gná Frigg\'s messenger and Hermês the herald of Olympus both carry words between worlds.' },
  { sourceId: 'epimetheus', targetId: 'prometheus', relationship: 'Afterthought and forethought', category: 'narrative-role', strength: 3, bidirectional: true, note: 'The Titan brothers of hindsight and foresight whose divided counsel shaped mortal destiny.' },
  { sourceId: 'caishen', targetId: 'lakshmi', relationship: 'Wealth deities', category: 'function', strength: 3, bidirectional: true, note: 'The Chinese God of Wealth and the Hindu goddess of fortune both command prosperity and abundance.' },
  { sourceId: 'izanagi', targetId: 'izanami', relationship: 'Creation couple / Yomi separation', category: 'narrative-role', strength: 3, bidirectional: true, note: 'The primordial Shinto creator pair whose union births the islands and whose separation at Yomi bounds life and death.' },
  { sourceId: 'amaterasu', targetId: 'tsukuyomi', relationship: 'Sun-moon sibling rivalry', category: 'narrative-role', strength: 3, bidirectional: true, note: 'The Shinto sun goddess and moon god are siblings whose quarrels shape the day-night order.' },
  { sourceId: 'amaterasu', targetId: 'ninigi', relationship: 'Solar grandmother and divine grandson', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Amaterasu sends her grandson Ninigi to rule the Central Land of Reed Plains, founding the imperial line.' },
  { sourceId: 'izanagi', targetId: 'amaterasu', relationship: 'Father and sun goddess', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Izanagi washes his left eye and begets Amaterasu, the sun, from his purification after Yomi.' },
  { sourceId: 'susanoo', targetId: 'tsukuyomi', relationship: 'Storm and moon siblings', category: 'narrative-role', strength: 3, bidirectional: true, note: 'The Shinto storm god and moon god are brothers born from Izanagi\'s purification.' },
  { sourceId: 'hoori', targetId: 'toyotama', relationship: 'Hunter husband and sea wife', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Hoori the fire-subduing hunter marries Toyotama, daughter of the sea god, binding land and ocean.' },
  { sourceId: 'hoori', targetId: 'ugayafukiaezu', relationship: 'Father and ancestor of Jimmu', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Hoori and Toyotama\'s son Ugayafukiaezu continues the divine lineage that produces Emperor Jimmu.' },
  { sourceId: 'toyotama', targetId: 'ugayafukiaezu', relationship: 'Mother and ancestor of Jimmu', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Toyotama the sea princess gives birth to Ugayafukiaezu, linking the ocean realm to the imperial line.' },
  { sourceId: 'hoderi', targetId: 'hoori', relationship: 'Elder and younger fire brothers', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Hoderi the fire-shining fisherman and Hoori the fire-subduing hunter are brothers whose rivalry and exchange of fortunes shape the royal genealogy.' },
  { sourceId: 'tajikarao', targetId: 'amaterasu', relationship: 'Strong hand opens the cave of the sun', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Tajikarao the strong-hand kami wrenches open the Ama-no-Iwato cave to restore Amaterasu and daylight to the world.' },
  { sourceId: 'tajikarao', targetId: 'takachiho', relationship: 'Strength god and the sacred gorge', category: 'phenomenon', strength: 3, bidirectional: true, note: 'Takachiho Gorge is the mythic stage where Tajikarao\'s strength frees Amaterasu from the heavenly rock cave.' },
  { sourceId: 'ise', targetId: 'amaterasu', relationship: 'Shrine and enshrined sun goddess', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Ise Grand Shrine is the principal sanctuary of Amaterasu, the sun goddess and imperial ancestor.' },
  { sourceId: 'ebisu', targetId: 'benzaiten', relationship: 'Seven Lucky Gods / fortune pair', category: 'function', strength: 3, bidirectional: true, note: 'Ebisu and Benzaiten are two of the Shichifukujin, the seven deities of fortune, presiding over commerce and the arts.' },
  { sourceId: 'ebisu', targetId: 'inari', relationship: 'Japanese fortune and harvest deities', category: 'function', strength: 3, bidirectional: true, note: 'Ebisu of commerce and Inari of rice together command prosperity, abundance, and the fertility of land and trade.' },
  { sourceId: 'benzaiten', targetId: 'inari', relationship: 'Fortune, harvest, and abundance', category: 'function', strength: 3, bidirectional: true, note: 'Benzaiten of wealth and the arts and Inari of rice and foxes are two faces of Japanese prosperity.' },
  { sourceId: 'amida', targetId: 'kannon', relationship: 'Pure Land savior and bodhisattva of compassion', category: 'function', strength: 3, bidirectional: true, note: 'Amida the Buddha of Infinite Light welcomes the faithful to the Pure Land; Kannon the compassionate bodhisattva hears their cries.' },
  { sourceId: 'kannon', targetId: 'avalokiteshvara', relationship: 'Same bodhisattva, two traditions', category: 'identity', strength: 3, bidirectional: true, note: 'Kannon is Avalokiteśvara received in Japanese Buddhism — the same compassionate savior under a different transmission.' },
  { sourceId: 'marishiten', targetId: 'hachiman', relationship: 'Warrior-protector deities of Japan', category: 'function', strength: 3, bidirectional: true, note: 'Marishiten the solar warrior goddess of invisibility and Hachiman the god of war both protect armies and rulers in Japanese tradition.' },
  { sourceId: 'sarutahiko', targetId: 'amenouzume', relationship: 'Crossroads guardian and dawn dancer', category: 'narrative-role', strength: 3, bidirectional: true, note: 'Sarutahiko the long-nosed crossroads kami meets Ame-no-Uzume the dawn dancer at the road between heaven and earth.' },
  { sourceId: 'ares', targetId: 'mars', relationship: 'War / battle', category: 'function', strength: 3, bidirectional: true, note: 'Árēs the raw battle fury and Mārs the disciplined guardian of legion and field — the Greek and Roman faces of war, from Iliad panic to SPQR discipline.' },
  { sourceId: 'yandi', targetId: 'huangdi', relationship: 'Mythic hero / monster-slayer / city-founder', category: 'narrative-role', strength: 3, bidirectional: true, note: 'The Flame Emperor and the Yellow Emperor — Yándì and Huángdì, the two sovereign ancestors whose pairing names the Chinese people (炎黃子孫, descendants of Yán and Huáng).' },
  { sourceId: 'achilleus', targetId: 'cuchulainn', relationship: 'Peerless warrior of the epic cycle', category: 'function', strength: 2, bidirectional: true, note: 'Peerless warrior of the epic cycle' },
  { sourceId: 'adonis', targetId: 'dumuzid', relationship: 'Death / rebirth', category: 'function', strength: 2, bidirectional: true, note: 'Death / rebirth' },
  { sourceId: 'atropos', targetId: 'skuld', relationship: 'Fate / time', category: 'function', strength: 2, bidirectional: true, note: 'Fate / time' },
  { sourceId: 'ananke', targetId: 'urdr', relationship: 'Fate / time', category: 'function', strength: 2, bidirectional: true, note: 'Fate / time' },
  { sourceId: 'chiron', targetId: 'drona', relationship: 'Preceptor of heroes', category: 'function', strength: 2, bidirectional: true, note: 'Preceptor of heroes' },
  { sourceId: 'drakon', targetId: 'jormungandr', relationship: 'Chaos / monster', category: 'function', strength: 2, bidirectional: true, note: 'Chaos / monster' },
  { sourceId: 'ouranos', targetId: 'anu', relationship: 'Primordial sky father', category: 'function', strength: 2, bidirectional: true, note: 'Primordial sky father' },
  { sourceId: 'okeanos', targetId: 'apsu', relationship: 'Primordial world waters', category: 'function', strength: 2, bidirectional: true, note: 'Primordial world waters' },
  { sourceId: 'hydra', targetId: 'leviathan', relationship: 'Chaos / world serpent', category: 'function', strength: 2, bidirectional: true, note: 'Chaos / world serpent' },
  { sourceId: 'tyche', targetId: 'lakshmi', relationship: 'Fortune / prosperity personified', category: 'function', strength: 2, bidirectional: true, note: 'Fortune / prosperity personified' },
  { sourceId: 'themis', targetId: 'maat', relationship: 'Cosmic order and justice personified', category: 'function', strength: 2, bidirectional: true, note: 'Cosmic order and justice personified' },
  { sourceId: 'seiren', targetId: 'rusalka', relationship: 'Alluring, dangerous female spirits', category: 'function', strength: 2, bidirectional: true, note: 'Alluring, dangerous female spirits' },
  { sourceId: 'zephyros', targetId: 'fujin', relationship: 'Wind personifications', category: 'function', strength: 2, bidirectional: true, note: 'Wind personifications' },
  { sourceId: 'tartaros', targetId: 'apsu', relationship: 'Primordial deep / abyss', category: 'function', strength: 2, bidirectional: true, note: 'Primordial deep / abyss' },
  { sourceId: 'frigg', targetId: 'hera', relationship: 'Queen of the gods, consort of the sky-father', category: 'function', strength: 2, bidirectional: true, note: 'Queen of the gods, consort of the sky-father' },
  { sourceId: 'fenrir', targetId: 'typhon', relationship: 'Bound primordial monster loosed at the end', category: 'function', strength: 2, bidirectional: true, note: 'Bound primordial monster loosed at the end' },
  { sourceId: 'loki', targetId: 'prometheus', relationship: 'Bound trickster bound to fire', category: 'function', strength: 2, bidirectional: true, note: 'Bound trickster bound to fire' },
  { sourceId: 'heimdallr', targetId: 'ianus', relationship: 'Guardian of thresholds, watcher at the boundary', category: 'function', strength: 2, bidirectional: true, note: 'Guardian of thresholds, watcher at the boundary' },
  { sourceId: 'mjolnir', targetId: 'keraunos', relationship: 'The thunder-god\'s signature weapon', category: 'function', strength: 2, bidirectional: true, note: 'The thunder-god\'s signature weapon' },
  { sourceId: 'isis', targetId: 'demeter', relationship: 'Greek counterpart (Herodotus 2.59, 2.156)', category: 'function', strength: 2, bidirectional: true, note: 'Greek counterpart (Herodotus 2.59, 2.156)' },
  { sourceId: 'amun', targetId: 'zeus', relationship: 'Greek counterpart (Herodotus 2.42; Zeus-Ammon)', category: 'function', strength: 2, bidirectional: true, note: 'Greek counterpart (Herodotus 2.42; Zeus-Ammon)' },
  { sourceId: 'horus', targetId: 'apollon', relationship: 'Greek counterpart (Plutarch, De Iside et Osiride)', category: 'function', strength: 2, bidirectional: true, note: 'Greek counterpart (Plutarch, De Iside et Osiride)' },
  { sourceId: 'nut', targetId: 'rhea', relationship: 'Greek counterpart (Plutarch, De Iside et Osiride)', category: 'function', strength: 2, bidirectional: true, note: 'Greek counterpart (Plutarch, De Iside et Osiride)' },
  { sourceId: 'shu', targetId: 'atlas', relationship: 'Greek functional counterpart (bearer who separates sky and earth)', category: 'function', strength: 2, bidirectional: true, note: 'Greek functional counterpart (bearer who separates sky and earth)' },
  { sourceId: 'seshat', targetId: 'nabu', relationship: 'Mesopotamian counterpart (divine scribe and record-keeper)', category: 'function', strength: 2, bidirectional: true, note: 'Mesopotamian counterpart (divine scribe and record-keeper)' },
  { sourceId: 'nun', targetId: 'tiamat', relationship: 'Mesopotamian counterpart (personified primordial waters)', category: 'function', strength: 2, bidirectional: true, note: 'Mesopotamian counterpart (personified primordial waters)' },
  { sourceId: 'saraswati', targetId: 'athena', relationship: 'Greek counterpart (wisdom, learning, and the arts)', category: 'function', strength: 2, bidirectional: true, note: 'Greek counterpart (wisdom, learning, and the arts)' },
  { sourceId: 'kartikeya', targetId: 'ares', relationship: 'Greek counterpart (the divine war-leader)', category: 'function', strength: 2, bidirectional: true, note: 'Greek counterpart (the divine war-leader)' },
  { sourceId: 'kubera', targetId: 'pluto', relationship: 'Greco-Roman parallel (lord of buried treasure)', category: 'function', strength: 2, bidirectional: true, note: 'Greco-Roman parallel (lord of buried treasure)' },
  { sourceId: 'yama', targetId: 'osiris', relationship: 'Ruler and judge of the dead', category: 'function', strength: 2, bidirectional: true, note: 'Ruler and judge of the dead' },
  { sourceId: 'dharma', targetId: 'maat', relationship: 'Egyptian counterpart (cosmic order and truth)', category: 'function', strength: 2, bidirectional: true, note: 'Egyptian counterpart (cosmic order and truth)' },
  { sourceId: 'om', targetId: 'logos', relationship: 'Comparative parallel (the creative Word)', category: 'function', strength: 2, bidirectional: true, note: 'Comparative parallel (the creative Word)' },
  { sourceId: 'ganesha', targetId: 'hermes', relationship: 'Greek parallel (guide of thresholds and beginnings)', category: 'function', strength: 2, bidirectional: true, note: 'Greek parallel (guide of thresholds and beginnings)' },
  { sourceId: 'varuna', targetId: 'ouranos', relationship: 'Proposed Indo-European sky cognate (disputed)', category: 'function', strength: 2, bidirectional: true, note: 'Proposed Indo-European sky cognate (disputed)' },
  { sourceId: 'agni', targetId: 'hephaistos', relationship: 'Greek parallel (fire and the forge)', category: 'function', strength: 2, bidirectional: true, note: 'Greek parallel (fire and the forge)' },
  { sourceId: 'surya', targetId: 'sol', relationship: 'Roman counterpart (the Sun)', category: 'function', strength: 2, bidirectional: true, note: 'Roman counterpart (the Sun)' },
  { sourceId: 'maitreya', targetId: 'kalki', relationship: 'Hindu counterpart — the future savior prophesied to appear when the world declines', category: 'function', strength: 2, bidirectional: true, note: 'Hindu counterpart — the future savior prophesied to appear when the world declines' },
  { sourceId: 'vajrapani', targetId: 'herakles', relationship: 'Gandhāran art parallel — the club-bearing protector; Gandhāran sculptors literally modeled Vajrapāṇi on Herakles', category: 'function', strength: 2, bidirectional: true, note: 'Gandhāran art parallel — the club-bearing protector; Gandhāran sculptors literally modeled Vajrapāṇi on Herakles' },
  { sourceId: 'manjushri', targetId: 'athena', relationship: 'wisdom function parallel — the martial patron of wisdom and learning', category: 'function', strength: 2, bidirectional: true, note: 'wisdom function parallel — the martial patron of wisdom and learning' },
  { sourceId: 'amida', targetId: 'amitabha', relationship: 'Same Buddha — Amida is the Japanese reading of Sanskrit Amitābha', category: 'function', strength: 2, bidirectional: true, note: 'Same Buddha — Amida is the Japanese reading of Sanskrit Amitābha' },
  { sourceId: 'jizo', targetId: 'ksitigarbha', relationship: 'Same bodhisattva — Jizō is the Japanese form of Kṣitigarbha', category: 'function', strength: 2, bidirectional: true, note: 'Same bodhisattva — Jizō is the Japanese form of Kṣitigarbha' },
  { sourceId: 'benzaiten', targetId: 'saraswati', relationship: 'Etymological source — Benzaiten descends from Sanskrit Sarasvatī via Buddhist transmission', category: 'function', strength: 2, bidirectional: true, note: 'Etymological source — Benzaiten descends from Sanskrit Sarasvatī via Buddhist transmission' },
  { sourceId: 'marishiten', targetId: 'marici', relationship: 'Same deva — Marishiten transcribes Sanskrit Mārīcī', category: 'function', strength: 2, bidirectional: true, note: 'Same deva — Marishiten transcribes Sanskrit Mārīcī' },
  { sourceId: 'fujin', targetId: 'stribog', relationship: 'Wind gods — sovereigns of the winds in their pantheons', category: 'function', strength: 2, bidirectional: true, note: 'Wind gods — sovereigns of the winds in their pantheons' },
  { sourceId: 'hananim', targetId: 'indra', relationship: 'Mythic identification — the Samguk Yusa glosses Hwanin as Indra (Śakra), lord of heaven', category: 'function', strength: 2, bidirectional: true, note: 'Mythic identification — the Samguk Yusa glosses Hwanin as Indra (Śakra), lord of heaven' },
  { sourceId: 'mago', targetId: 'gaia', relationship: 'Earth mother / creator grandmother', category: 'function', strength: 2, bidirectional: true, note: 'Earth mother / creator grandmother' },
  { sourceId: 'ninigi', targetId: 'hwanung', relationship: 'Heavenly descendants sent to rule the earth — the descents of Ninigi and Hwanung found their nations\' royal lines', category: 'function', strength: 2, bidirectional: true, note: 'Heavenly descendants sent to rule the earth — the descents of Ninigi and Hwanung found their nations\' royal lines' },
  { sourceId: 'jowangshin', targetId: 'hestia', relationship: 'Hearth and kitchen guardians — keepers of the household fire', category: 'function', strength: 2, bidirectional: true, note: 'Hearth and kitchen guardians — keepers of the household fire' },
  { sourceId: 'dangun', targetId: 'oduduwa', relationship: 'Divine founders of their peoples — ancestor-kings of Korea and of the Yoruba', category: 'function', strength: 2, bidirectional: true, note: 'Divine founders of their peoples — ancestor-kings of Korea and of the Yoruba' },
  { sourceId: 'amaterasu', targetId: 'sol', relationship: 'Sun / light', category: 'function', strength: 2, bidirectional: true, note: 'Sun / light' },
  { sourceId: 'pangu', targetId: 'ymir', relationship: 'Norse counterpart — the primordial giant whose dying body becomes the world', category: 'function', strength: 2, bidirectional: true, note: 'Norse counterpart — the primordial giant whose dying body becomes the world' },
  { sourceId: 'nuwa', targetId: 'gaia', relationship: 'Greek counterpart — the primordial mother from whom living beings come', category: 'function', strength: 2, bidirectional: true, note: 'Greek counterpart — the primordial mother from whom living beings come' },
  { sourceId: 'fuxi', targetId: 'thoth', relationship: 'Egyptian counterpart — the inventor of writing and divination', category: 'function', strength: 2, bidirectional: true, note: 'Egyptian counterpart — the inventor of writing and divination' },
  { sourceId: 'yanluo', targetId: 'osiris', relationship: 'Egyptian counterpart — sovereign and judge of the dead', category: 'function', strength: 2, bidirectional: true, note: 'Egyptian counterpart — sovereign and judge of the dead' },
  { sourceId: 'guandi', targetId: 'mars', relationship: 'Roman counterpart — god of war and guardian of the state\'s order', category: 'function', strength: 2, bidirectional: true, note: 'Roman counterpart — god of war and guardian of the state\'s order' },
  { sourceId: 'tian', targetId: 'ouranos', relationship: 'Greek counterpart — Heaven itself, personified as the source of cosmic order', category: 'function', strength: 2, bidirectional: true, note: 'Greek counterpart — Heaven itself, personified as the source of cosmic order' },
  { sourceId: 'mengpo', targetId: 'lethe', relationship: 'Greek counterpart — the power of forgetting in the land of the dead', category: 'function', strength: 2, bidirectional: true, note: 'Greek counterpart — the power of forgetting in the land of the dead' },
  { sourceId: 'dumuzid', targetId: 'osiris', relationship: 'Egyptian counterpart (doomed and restored fertility god mourned by the goddess)', category: 'function', strength: 2, bidirectional: true, note: 'Egyptian counterpart (doomed and restored fertility god mourned by the goddess)' },
  { sourceId: 'kingu', targetId: 'typhon', relationship: 'Monstrous champion of the primordial mother against the youthful storm-king', category: 'function', strength: 2, bidirectional: true, note: 'Monstrous champion of the primordial mother against the youthful storm-king' },
  { sourceId: 'namtar', targetId: 'thanatos', relationship: 'Greek analogue (death and allotted fate personified)', category: 'function', strength: 2, bidirectional: true, note: 'Greek analogue (death and allotted fate personified)' },
  { sourceId: 'gilgamesh', targetId: 'odysseus', relationship: 'Epic hero who crossed the world to question a survivor of death', category: 'function', strength: 2, bidirectional: true, note: 'Epic hero who crossed the world to question a survivor of death' },
  { sourceId: 'venus', targetId: 'aphrodite', relationship: 'Greek counterpart', category: 'function', strength: 2, bidirectional: true, note: 'Greek counterpart' },
  { sourceId: 'iuppiter', targetId: 'zeus', relationship: 'Greek counterpart', category: 'function', strength: 2, bidirectional: true, note: 'Greek counterpart' },
  { sourceId: 'iuno', targetId: 'hera', relationship: 'Greek counterpart', category: 'function', strength: 2, bidirectional: true, note: 'Greek counterpart' },
  { sourceId: 'neptunus', targetId: 'poseidon', relationship: 'Greek counterpart', category: 'function', strength: 2, bidirectional: true, note: 'Greek counterpart' },
  { sourceId: 'vulcanus', targetId: 'hephaistos', relationship: 'Greek counterpart', category: 'function', strength: 2, bidirectional: true, note: 'Greek counterpart' },
  { sourceId: 'ceres', targetId: 'demeter', relationship: 'Greek counterpart', category: 'function', strength: 2, bidirectional: true, note: 'Greek counterpart' },
  { sourceId: 'pluto', targetId: 'hades', relationship: 'Greek counterpart', category: 'function', strength: 2, bidirectional: true, note: 'Greek counterpart' },
  { sourceId: 'diana', targetId: 'artemis', relationship: 'Greek counterpart', category: 'function', strength: 2, bidirectional: true, note: 'Greek counterpart' },
  { sourceId: 'morana', targetId: 'hel', relationship: 'Winter death goddess counterpart', category: 'function', strength: 2, bidirectional: true, note: 'Winter death goddess counterpart' },
  { sourceId: 'nuada', targetId: 'tyr', relationship: 'One-handed gods of law and kingship', category: 'function', strength: 2, bidirectional: true, note: 'One-handed gods of law and kingship' },
  { sourceId: 'gwydion', targetId: 'lugh', relationship: 'Divine magician-hero counterparts', category: 'function', strength: 2, bidirectional: true, note: 'Divine magician-hero counterparts' },
  { sourceId: 'dagda', targetId: 'odinn', relationship: 'Chieftain gods of plenty and wisdom', category: 'function', strength: 2, bidirectional: true, note: 'Chieftain gods of plenty and wisdom' },
  { sourceId: 'el', targetId: 'zeus', relationship: 'Sky father / sovereign', category: 'function', strength: 2, bidirectional: true, note: 'Sky father / sovereign' },
  { sourceId: 'astart', targetId: 'aphrodite', relationship: 'Love / beauty / desire', category: 'function', strength: 2, bidirectional: true, note: 'Love / beauty / desire' },
  { sourceId: 'tlaloc', targetId: 'adad', relationship: 'Thunder / storm sovereignty', category: 'function', strength: 2, bidirectional: true, note: 'Thunder / storm sovereignty' },
  { sourceId: 'mictlantecutli', targetId: 'hades', relationship: 'Underworld / death', category: 'function', strength: 2, bidirectional: true, note: 'Underworld / death' },
  { sourceId: 'xiuhtecuhtli', targetId: 'agni', relationship: 'Fire / forge / craft', category: 'function', strength: 2, bidirectional: true, note: 'Fire / forge / craft' },
  { sourceId: 'asa', targetId: 'rta', relationship: 'Justice / law / truth', category: 'function', strength: 2, bidirectional: true, note: 'Justice / law / truth' },
  { sourceId: 'ranginui', targetId: 'ouranos', relationship: 'Sky father / sovereign', category: 'function', strength: 2, bidirectional: true, note: 'Sky father / sovereign' },
  { sourceId: 'papatuanuku', targetId: 'gaia', relationship: 'Earth mother', category: 'function', strength: 2, bidirectional: true, note: 'Earth mother' },
  { sourceId: 'taaroa', targetId: 'tangaroa', relationship: 'Same figure, cognate names across Polynesia', category: 'function', strength: 2, bidirectional: true, note: 'Same figure, cognate names across Polynesia' },
  { sourceId: 'taaroa', targetId: 'tagaloa', relationship: 'Same figure, cognate names across Polynesia', category: 'function', strength: 2, bidirectional: true, note: 'Same figure, cognate names across Polynesia' },
  { sourceId: 'lono', targetId: 'rongo', relationship: 'Same figure, cognate names across Polynesia', category: 'function', strength: 2, bidirectional: true, note: 'Same figure, cognate names across Polynesia' },
  { sourceId: 'mixcoatl', targetId: 'artemis', relationship: 'Hunt / wild', category: 'function', strength: 2, bidirectional: true, note: 'Hunt / wild' },];

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
