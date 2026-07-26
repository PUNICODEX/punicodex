#!/usr/bin/env node
'use strict';
/**
 * One-off: write the 20 chapter-structure entries into platform/texts/registry.json.
 * Idempotent: entries are replaced by id, never duplicated. The theogony
 * entry is untouched (structure defaults to the line-poem path).
 */
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'platform', 'texts', 'registry.json');
const registry = JSON.parse(fs.readFileSync(FILE, 'utf8'));

const eng = (label, source, sourceUrl) => ({
  lang: 'eng',
  label,
  source,
  sourceUrl,
  license: 'Public domain',
  file: 'eng.json',
});

const ENTRIES = [
  {
    id: 'homeric-hymns',
    structure: 'chapters',
    title: 'Homeric Hymns',
    titleNative: 'Ὁμηρικοὶ Ὕμνοι',
    author: 'Anonymous (Homeric tradition)',
    authorNative: '—',
    composed: 'c. 7th–5th century BC',
    language: 'grc',
    sectionCount: 33,
    summary:
      'Thirty-three hymns to the gods of Olympus — Demeter, Apollo, Hermes, Aphrodite and their kin — sung in the Homeric metre. The most direct portrait we have of how the Greeks actually addressed their gods.',
    editions: [
      eng(
        'English (Evelyn-White, 1914)',
        'Hugh G. Evelyn-White, Hesiod, the Homeric Hymns and Homerica (Loeb, 1914), via Project Gutenberg #348',
        'https://www.gutenberg.org/ebooks/348'
      ),
    ],
  },
  {
    id: 'works-and-days',
    structure: 'chapters',
    title: 'Works and Days',
    titleNative: 'Ἔργα καὶ Ἡμέραι',
    author: 'Hesiod',
    authorNative: 'Ἡσίοδος',
    composed: 'c. 700 BC',
    language: 'grc',
    sectionCount: 11,
    summary:
      'Hesiod’s second poem: Prometheus and Pandora, the Five Ages of Man, and the farmer’s year. The companion piece to the Theogony — where that poem gives the gods their genealogy, this one gives mankind its terms.',
    editions: [
      eng(
        'English (Evelyn-White, 1914)',
        'Hugh G. Evelyn-White, Hesiod, the Homeric Hymns and Homerica (Loeb, 1914), via Project Gutenberg #348',
        'https://www.gutenberg.org/ebooks/348'
      ),
    ],
  },
  {
    id: 'metamorphoses',
    structure: 'chapters',
    title: 'Metamorphoses',
    titleNative: 'Metamorphōsēs',
    author: 'Ovid',
    authorNative: 'P. Ovidius Naso',
    composed: 'c. AD 8',
    language: 'lat',
    sectionCount: 15,
    summary:
      'Ovid’s fifteen-book epic of transformation, from the creation to Julius Caesar. The great Roman mirror of the Greek gods — Iuppiter, Iūnō, Diāna, Cerēs, Plūtō and the whole Olympian court retold in Latin verse.',
    editions: [
      eng(
        'English (Brookes More, 1922)',
        'Brookes More, Ovid’s Metamorphoses (Cornhill, 1922), via the Perseus Digital Library',
        'https://www.perseus.tufts.edu/hopper/text?doc=Ov.+Met.'
      ),
    ],
  },
  {
    id: 'poetic-edda',
    structure: 'chapters',
    title: 'Poetic Edda',
    titleNative: 'Sæmundar Edda',
    author: 'Anonymous (compiled)',
    authorNative: '—',
    composed: 'c. 13th century (material far older)',
    language: 'non',
    sectionCount: 35,
    summary:
      'The thirty-five lays of the Elder Edda — Völuspá’s creation and doom, Hávamál’s wisdom, the adventures of Thor and the counsel of Odin. The foundation text of the entire Norse pantheon.',
    editions: [
      eng(
        'English (Bellows, 1923)',
        'Henry Adams Bellows, The Poetic Edda (1923), via Project Gutenberg #73533',
        'https://www.gutenberg.org/ebooks/73533'
      ),
    ],
  },
  {
    id: 'prose-edda',
    structure: 'chapters',
    title: 'Prose Edda',
    titleNative: 'Snorra Edda',
    author: 'Snorri Sturluson',
    authorNative: '—',
    composed: 'c. 1220',
    language: 'non',
    sectionCount: 128,
    summary:
      'Snorri Sturluson’s handbook of myth — Gylfaginning’s systematic account of the gods from creation to Ragnarök, and Skáldskaparmál’s catalogues of poetic speech. The scholar’s companion to the Poetic Edda.',
    editions: [
      eng(
        'English (Brodeur, 1916)',
        'Arthur Gilchrist Brodeur, The Prose Edda (1916), via Wikisource’s proofread transcription of the first printing',
        'https://en.wikisource.org/wiki/The_Prose_Edda_(1916_translation_by_Arthur_Gilchrist_Brodeur)'
      ),
    ],
  },
  {
    id: 'book-of-the-dead',
    structure: 'chapters',
    title: 'The Book of the Dead',
    titleNative: 'Pert em Hru',
    author: 'Anonymous (compiled)',
    authorNative: '—',
    composed: 'c. 1550–50 BC (Papyrus of Ani recension)',
    language: 'egy',
    sectionCount: 29,
    summary:
      'The Egyptian guide to the afterlife from the Papyrus of Ani — the weighing of the heart, the Negative Confession, and the spells that carry the ba and ka of the dead past Apep into the Field of Reeds.',
    editions: [
      eng(
        'English (Budge, 1895)',
        'E. A. Wallis Budge, The Book of the Dead: The Papyrus of Ani (1895), via the 1913 edition scan',
        'https://archive.org/'
      ),
    ],
  },
  {
    id: 'enuma-elish',
    structure: 'chapters',
    title: 'Enūma Eliš',
    titleNative: 'Enūma eliš',
    author: 'Anonymous (Babylonian)',
    authorNative: '—',
    composed: 'c. 12th century BC (Seven Tablets recension)',
    language: 'akk',
    sectionCount: 7,
    summary:
      'The Babylonian creation epic in seven tablets: Apsû’s fall, Tiamat’s war, and Marduk’s ordering of heaven and earth. The oldest creation narrative in the library.',
    editions: [
      eng(
        'English (King, 1902)',
        'L. W. King, The Seven Tablets of Creation (1902)',
        'https://archive.org/'
      ),
    ],
  },
  {
    id: 'gilgamesh',
    structure: 'chapters',
    title: 'The Epic of Gilgamesh',
    titleNative: 'Ša nagba imuru',
    author: 'Anonymous (Akkadian)',
    authorNative: '—',
    composed: 'c. 18th–7th century BC (standard version)',
    language: 'akk',
    sectionCount: 12,
    summary:
      'The twelve-tablet epic of the king of Uruk — the cedar forest, the Bull of Heaven, the flood, and the search for everlasting life. The world’s first great literary work.',
    editions: [
      eng(
        'English (Thompson, 1928)',
        'R. Campbell Thompson, The Epic of Gilgamish (1928)',
        'https://archive.org/'
      ),
    ],
  },
  {
    id: 'avesta',
    structure: 'chapters',
    title: 'Avesta — Yasna & Yashts',
    titleNative: 'Avesta',
    author: 'Zoroastrian tradition',
    authorNative: '—',
    composed: 'c. 2nd–1st millennium BC (oral), Sasanian recension',
    language: 'ave',
    sectionCount: 22,
    summary:
      'The liturgical heart of Zoroastrianism — the Yasna litanies and the great Yashts. The primary home of Ahura Mazda and the Amesha Spentas: Aša Vahišta, Haurvatāt and Amərətāt.',
    editions: [
      eng(
        'English (Darmesteter & Mills, SBE 1880–87)',
        'James Darmesteter (SBE 23) and Lawrence H. Mills (SBE 31), Sacred Books of the East, via the Internet Sacred Text Archive transcription',
        'https://sacred-texts.com/zor/'
      ),
    ],
  },
  {
    id: 'rig-veda',
    structure: 'chapters',
    title: 'Rig Veda',
    titleNative: 'Ṛgveda',
    author: 'Anonymous (rishis)',
    authorNative: '—',
    composed: 'c. 1500–1200 BC',
    language: 'san',
    sectionCount: 10,
    summary:
      'The 1,028 hymns of the oldest scripture in the world still in use — Sūrya, Vāc, Pūṣan, Tvaṣṭṛ, Varuṇa, Rudra and the Ṛta that orders them all. The deep root of the Sanskrit pantheon.',
    editions: [
      eng(
        'English (Griffith, 1896)',
        'Ralph T. H. Griffith, The Hymns of the Rigveda (2nd ed., 1896), via the Internet Sacred Text Archive',
        'https://sacred-texts.com/hin/rigveda/'
      ),
    ],
  },
  {
    id: 'ramayana',
    structure: 'chapters',
    title: 'Ramayana',
    titleNative: 'Rāmāyaṇa',
    author: 'Vālmīki (tradition)',
    authorNative: 'वाल्मीकि',
    composed: 'c. 5th century BC – 2nd century AD',
    language: 'san',
    sectionCount: 7,
    summary:
      'The journey of Rāma — exile, the abduction of Sītā, Hanumān’s leap, and the war for Laṅkā. The Ādikāvya, the first poem of the Sanskrit world.',
    editions: [
      eng(
        'English (Dutt, 1899)',
        'Romesh Chunder Dutt, Ramayana condensed into English verse (1899), via the Internet Sacred Text Archive',
        'https://sacred-texts.com/hin/dutt/'
      ),
    ],
  },
  {
    id: 'lotus-sutra',
    structure: 'chapters',
    title: 'Lotus Sutra',
    titleNative: 'Saddharmapuṇḍarīka Sūtra',
    author: 'Buddhist tradition',
    authorNative: '—',
    composed: 'c. 1st–2nd century AD',
    language: 'san',
    sectionCount: 27,
    summary:
      'The Saddharmapuṇḍarīka — the Lotus of the True Law. Śākyamuni’s great sermon and the scripture of the bodhisattvas: Mañjuśrī, Vajrapāṇi, and Avalokiteśvara, who crosses the sea to become Guānyīn and Kannon.',
    editions: [
      eng(
        'English (Kern, 1884)',
        'Hendrik Kern, The Saddharma-Puṇḍarīka (SBE 21, 1884), via the Internet Sacred Text Archive',
        'https://sacred-texts.com/bud/lotus/'
      ),
    ],
  },
  {
    id: 'sukhavativyuha',
    structure: 'chapters',
    title: 'Sukhāvatīvyūha Sūtras',
    titleNative: 'Sukhāvatīvyūha Sūtra',
    author: 'Buddhist tradition',
    authorNative: '—',
    composed: 'c. 1st–2nd century AD',
    language: 'san',
    sectionCount: 2,
    summary:
      'The larger and smaller Sukhāvatī-vyūha — the Pure Land sutras of Amitābha and the western paradise, with Akṣobhya’s eastern realm beside them.',
    editions: [
      eng(
        'English (Müller, 1894)',
        'F. Max Müller, Buddhist Mahāyāna Texts (SBE 49, 1894), via the Internet Sacred Text Archive',
        'https://sacred-texts.com/bud/sbe49/'
      ),
    ],
  },
  {
    id: 'kojiki',
    structure: 'chapters',
    title: 'Kojiki',
    titleNative: '古事記',
    author: 'Ō no Yasumaro (tradition)',
    authorNative: '—',
    composed: 'AD 712',
    language: 'jpn',
    sectionCount: 14,
    summary:
      'The Record of Ancient Matters — Japan’s oldest book: the birth of the islands, the age of the kami, and the descent of the imperial line. The foundation text of the Japanese pantheon.',
    editions: [
      eng(
        'English (Chamberlain, 1919)',
        'Basil Hall Chamberlain, The Kojiki (2nd ed., 1919), via the Internet Sacred Text Archive',
        'https://sacred-texts.com/shi/kj/'
      ),
    ],
  },
  {
    id: 'nihon-shoki',
    structure: 'chapters',
    title: 'Nihon Shoki',
    titleNative: '日本書紀',
    author: 'Court of Japan (compiled)',
    authorNative: '—',
    composed: 'AD 720',
    language: 'jpn',
    sectionCount: 13,
    summary:
      'The Chronicles of Japan — thirty books from the age of the gods to the seventh-century court, the sister chronicle to the Kojiki with its alternate tellings of the same creation.',
    editions: [
      eng(
        'English (Aston, 1896)',
        'W. G. Aston, Nihongi (1896), via the archive.org scans',
        'https://archive.org/'
      ),
    ],
  },
  {
    id: 'kumulipo',
    structure: 'chapters',
    title: 'Kumulipo',
    titleNative: 'Kumulipo',
    author: 'Hawaiian tradition',
    authorNative: '—',
    composed: 'c. 18th century (chant), recorded 1897',
    language: 'haw',
    sectionCount: 16,
    summary:
      'The Hawaiian creation chant in sixteen eras — from Pō, the deep night, through the birth of the gods Kāne and Kanaloa to the royal genealogies. Polynesia’s own theogony.',
    editions: [
      eng(
        'English (Liliʻuokalani, 1897)',
        'Queen Liliʻuokalani, The Kumulipo: An Account of the Creation of the World (1897), via the Internet Sacred Text Archive',
        'https://sacred-texts.com/pac/lku/'
      ),
    ],
  },
  {
    id: 'polynesian-mythology',
    structure: 'chapters',
    title: 'Polynesian Mythology',
    titleNative: '—',
    author: 'Sir George Grey (collector)',
    authorNative: '—',
    composed: 'Recorded 1855',
    language: 'mri',
    sectionCount: 22,
    summary:
      'Grey’s classic collection of Māori legend — the children of Rangi and Papa, Tāne’s ascent, Tūmatauenga’s war, and Māui’s fishing-up of the world.',
    editions: [
      eng(
        'English (Grey, 1855)',
        'Sir George Grey, Polynesian Mythology (1855), via the 1906 Whitcombe & Tombs reprint',
        'https://archive.org/'
      ),
    ],
  },
  {
    id: 'tao-te-ching',
    structure: 'chapters',
    title: 'Tao Te Ching',
    titleNative: '道德經',
    author: 'Lǎozǐ (tradition)',
    authorNative: '老子',
    composed: 'c. 4th century BC',
    language: 'zho',
    sectionCount: 12,
    summary:
      'The eighty-one chapters of the Way and its Power — the foundational scripture of Taoism and the source text of Tàijí, Yīn-Yáng and the nameless Tao.',
    editions: [
      eng(
        'English (Legge, 1891)',
        'James Legge, The Tao Teh King (SBE 39, 1891), via Project Gutenberg #216',
        'https://www.gutenberg.org/ebooks/216'
      ),
    ],
  },
  {
    id: 'nigerian-studies',
    structure: 'chapters',
    title: 'Nigerian Studies — The Orisha Myths',
    titleNative: '—',
    author: 'R. E. Dennett',
    authorNative: '—',
    composed: 'Published 1910',
    language: 'yor',
    sectionCount: 11,
    summary:
      'The Orisha chapters of Dennett’s classic study — the earliest sustained English record of the Yoruba gods: Ṣàngó, Ẹṣu, Ògún, Ọya, Ọ̀rúnmìlà, Obàtálá and Olódùmarè. An oral corpus’s first written witness.',
    editions: [
      eng(
        'English (Dennett, 1910)',
        'R. E. Dennett, Nigerian Studies (1910), via the archive.org scan',
        'https://archive.org/'
      ),
    ],
  },
  {
    id: 'bible-kjv',
    structure: 'chapters',
    title: 'The Bible — King James Version',
    titleNative: '—',
    author: 'Various (tradition)',
    authorNative: '—',
    composed: 'Translated 1611',
    language: 'heb',
    sectionCount: 18,
    summary:
      'The foundational books of the Abrahamic tradition in the 1611 translation — Genesis to Revelation: the flood of Noah, the law of Moses, the psalms of David, and the wisdom of Solomon.',
    editions: [
      eng(
        'English (King James Version, 1611)',
        'The King James Bible, via Project Gutenberg #10',
        'https://www.gutenberg.org/ebooks/10'
      ),
    ],
  },
];

const byId = new Map(registry.texts.map((t) => [t.id, t]));
let added = 0;
for (const entry of ENTRIES) {
  if (!byId.has(entry.id)) {
    registry.texts.push(entry);
    added++;
  } else {
    Object.assign(byId.get(entry.id), entry);
  }
}
fs.writeFileSync(FILE, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`registry: ${added} new entries, ${registry.texts.length} total`);
