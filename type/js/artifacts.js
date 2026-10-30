/**
 * PuniCodex — Canonical artifact registry
 *
 * The curated set of mythological artifacts and the temples of their
 * bearers. Canonical, hand-edited, held to ACCURACY.md: an artifact card
 * may only claim what the attested sources support — no occult "meanings",
 * no pop-culture attributions. The registry powers the "Artifacts" filter
 * on /pantheon/ and the /artifacts/ index.
 *
 *   id        — anchor slug
 *   name      — artifact name (common scholarly form)
 *   original  — name in the attested tradition's script, when one exists
 *   pantheon  — tradition key (matches lexicon pantheon naming)
 *   temple    — lexicon/archetype id of the bearing deity's temple
 *   bearer    — the deity's display name
 *   source    — attestation (text/tradition, stated modestly)
 *   summary   — one honest sentence; what the sources actually say
 */

'use strict';

const ARTIFACTS = [
  {
    id: 'mjolnir',
    name: 'Mjölnir',
    original: 'Mjöllnir',
    pantheon: 'norse',
    temple: 'thor',
    bearer: 'Thor',
    source: 'Poetic Edda; Prose Edda (Snorri Sturluson, 13th c.)',
    summary:
      'The hammer Thor wields against the jötnar — the weapon the sources call the finest treasure among gods and men, which strikes what it is aimed at and never misses.',
  },
  {
    id: 'gungnir',
    name: 'Gungnir',
    original: 'Gungnir',
    pantheon: 'norse',
    temple: 'odinn',
    bearer: 'Óðinn',
    source: 'Poetic Edda; Prose Edda',
    summary:
      'Óðinn’s spear, forged by the dwarfs Brokkr and Sindri — described in the sources as so well balanced that it never stops once thrown and never misses its mark.',
  },
  {
    id: 'aegis',
    name: 'Aegis',
    original: 'αἰγίς',
    pantheon: 'greek',
    temple: 'athena',
    bearer: 'Athena',
    source: 'Homer, Iliad; Hesiod; later Greek tradition',
    summary:
      'The storm-fringed goatskin borne by Zeus and carried by Athena in the Iliad — at its center the Gorgoneion, the head of the Gorgon fixed after Perseus’ quest.',
  },
  {
    id: 'coire-ansic',
    name: 'The Dagda’s Cauldron',
    original: 'Coire Ansic',
    pantheon: 'celtic',
    temple: 'dagda',
    bearer: 'The Dagda',
    source: 'Irish mythological cycle (The Second Battle of Moytura)',
    summary:
      'One of the four treasures the Tuatha Dé Danann brought to Ireland: the cauldron from which no company ever left unsatisfied — plenty that answers need, not greed.',
  },
  {
    id: 'kusanagi',
    name: 'Kusanagi-no-Tsurugi',
    original: '草薙剣',
    pantheon: 'japanese',
    temple: 'susanoo',
    bearer: 'Susanoo',
    source: 'Kojiki; Nihon Shoki (8th c.)',
    summary:
      'The "Grass-Cutting Sword" Susanoo draws from the tail of the eight-headed serpent Yamata-no-Orochi and presents to his sister Amaterasu — one of the Three Imperial Regalia of Japan.',
  },
  {
    id: 'ama-no-nuboko',
    name: 'Ama-no-Nuboko',
    original: '天沼矛',
    pantheon: 'japanese',
    temple: 'izanagi',
    bearer: 'Izanagi',
    source: 'Kojiki; Nihon Shoki',
    summary:
      'The jeweled spear with which Izanagi and Izanami stirred the brine beneath the bridge of heaven — the brine that dripped from its point congealed into the first island, Onogoro.',
  },
  {
    id: 'ruyi-jingu-bang',
    name: 'Ruyi Jingu Bang',
    original: '如意金箍棒',
    pantheon: 'chinese',
    temple: 'sunwukong',
    bearer: 'Sun Wukong',
    source: 'Journey to the West (Ming dynasty, Wu Cheng’en)',
    summary:
      'The "As-You-Wish Golden-Banded Staff" — an iron pillar weighing thirteen and a half thousand jin that shrinks to a needle or rises to the sky at its bearer’s command, chosen by Sun Wukong from the dragon kings’ treasury.',
  },
];

module.exports = { ARTIFACTS };
