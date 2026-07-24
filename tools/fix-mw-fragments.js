#!/usr/bin/env node
/**
 * One-off repair: purge truncated Monier-Williams fragments from scholars
 * content (ganga/hanuman/yamuna/parvati) and the parvati blog post.
 * Run once; kept for provenance.
 */
const fs = require('node:fs');

function patch(file, pairs) {
  let src = fs.readFileSync(file, 'utf8');
  for (const [oldStr, newStr] of pairs) {
    const count = src.split(oldStr).length - 1;
    if (count !== 1) {
      throw new Error(`${file}: expected 1 occurrence, got ${count} :: ${oldStr.slice(0, 70)}`);
    }
    src = src.split(oldStr).join(newStr);
  }
  fs.writeFileSync(file, src);
  console.log(`patched ${file} x${pairs.length}`);
}

const DIR = 'platform/scholars/content/';

patch(`${DIR}ganga.json`, [
  [
    '**Gaṅgā** (*ganga*) — Sacred River, Purification · ‘swiftgoer’, the river Ganges (personified and considered as the eldest daughter of Himavat and Menā, R. i, 36, 15; as the wife of Śāntanu and mother of Bhīṣma, MBh. i — belongs to the Sanskrit tradition, where it is catalogued under the domain \\"Sacred River, Purification\\". The name means \\"‘swiftgoer’, the river Ganges (personified and considered as the eldest daughter of Himavat and Menā, R. i, 36, 15; as the wife of Śāntanu and mother of Bhīṣma, MBh. i\\"',
    '**Gaṅgā** (*ganga*) — Sacred River, Purification · the river Ganges personified — eldest daughter of Himavat, brought down from heaven by Bhagīratha’s austerities — belongs to the Sanskrit tradition, where it is catalogued under the domain \\"Sacred River, Purification\\". The name means \\"swift-goer\\" — the river that runs from heaven to earth, and the goddess who is that river personified',
  ],
  [
    'Etymologically it means \\"‘swiftgoer’, the river Ganges (personified and considered as the eldest daughter of Himavat and Menā, R. i, 36, 15; as the wife of Śāntanu and mother of Bhīṣma, MBh. i\\"',
    'Etymologically it means \\"swift-goer\\" — from the root *gam*, \\"to go\\": the river that runs, personified as the eldest daughter of Himavat',
  ],
]);

patch(`${DIR}hanuman.json`, [
  [
    '**Hanumān** (*hanuman*) — Devotion, Strength, Messenger · ‘having (large) jaws’, N. of a monkeychief (one of the most celebrated of a host of semidivine monkeylike beings, who, according to R. i, 16, were created to become the allies of — belongs to the Sanskrit tradition, where it is catalogued under the domain \\"Devotion, Strength, Messenger\\". The name means \\"‘having (large) jaws’, N. of a monkeychief (one of the most celebrated of a host of semidivine monkeylike beings, who, according to R. i, 16, were created to become the allies of\\"',
    '**Hanumān** (*hanuman*) — Devotion, Strength, Messenger · the Large-Jawed One — the monkey-god of devotion and strength, Rāma’s peerless servant — belongs to the Sanskrit tradition, where it is catalogued under the domain \\"Devotion, Strength, Messenger\\". The name means \\"having large jaws\\" — from *hanu*, \\"jaw\\": the mighty-jawed son of the wind, greatest of the vānara allies',
  ],
  [
    'Etymologically it means \\"‘having (large) jaws’, N. of a monkeychief (one of the most celebrated of a host of semidivine monkeylike beings, who, according to R. i, 16, were created to become the allies of\\"',
    'Etymologically it means \\"having large jaws\\" — from *hanu*, \\"jaw\\", with the possessive suffix *-mān*: the mighty-jawed one',
  ],
]);

patch(`${DIR}yamuna.json`, [
  [
    '**Yamunā** (*yamuna*) — Sacred River, Twin of Yama · N. of a river commonly called the Jumnā (in Hariv. & MārkP. identified with Yamī q.v.; it rises in the Himālaya mountains among the Jumnotri peaks at an elevation of 10,849 feet — belongs to the Sanskrit tradition, where it is catalogued under the domain \\"Sacred River, Twin of Yama\\". The name means \\"N. of a river commonly called the Jumnā (in Hariv. & MārkP. identified with Yamī q.v.; it rises in the Himālaya mountains among the Jumnotri peaks at an elevation of 10,849 feet\\"',
    '**Yamunā** (*yamuna*) — Sacred River, Twin of Yama · the twin river — daughter of Sūrya, twin of Yama, Kṛṣṇa’s beloved water — belongs to the Sanskrit tradition, where it is catalogued under the domain \\"Sacred River, Twin of Yama\\". The name means \\"the twin\\" — the river Yamī, daughter of the Sun and sister of death, who rises in the Himālaya at Yamunotri',
  ],
  [
    'Etymologically it means \\"N. of a river commonly called the Jumnā (in Hariv. & MārkP. identified with Yamī q.v.; it rises in the Himālaya mountains among the Jumnotri peaks at an elevation of 10,849 feet\\"',
    'Etymologically it means \\"the twin\\" — the river Yamī, twin sister of Yama, born of Sūrya the sun',
  ],
]);

patch(`${DIR}parvati.json`, [
  [
    '**Pārvatī** (*parvati*) — Mountains, Fertility, Devotion · of the god Śiva\'s wife (as daughter of Himavat, king of the snowy mountains), Up.; MBh.; Kāv. — belongs to the Sanskrit tradition',
    '**Pārvatī** (*parvati*) — Mountains, Fertility, Devotion · the Daughter of the Mountain — consort of Śiva, daughter of Himavat, mother of Gaṇeśa and Kārttikeya — belongs to the Sanskrit tradition',
  ],
]);

patch('platform/blog/content/parvati.json', [
  [
    '**Meaning:** \\"of the god Śiva\'s wife (as daughter of Himavat, king of the snowy mountains), Up.; MBh.; Kāv.\\"',
    '**Meaning:** \\"Daughter of the Mountain — consort of Śiva, daughter of Himavat, mother of Gaṇeśa and Kārttikeya\\"',
  ],
]);

console.log('All MW-fragment repairs applied.');
