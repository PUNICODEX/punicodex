/**
 * Applies batch E (Sarasvatī, Sītā) to scripts/lore-catalog.json and authors
 * the sanskrit-kit scholars sections + kin forms for both entries.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const data = require(path.join(__dirname, 'enrich-e.js'));
const lorePath = path.join(ROOT, 'scripts', 'lore-catalog.json');
const lore = JSON.parse(fs.readFileSync(lorePath, 'utf8'));

const KIN = {
  saraswati: [
    ['Devanagari', 'सरस्वती'],
    ['IAST standard', 'Sarasvatī'],
    ['Hindi speech', 'Saraswati'],
    ['Japanese', 'Benzaiten (弁才天)'],
    ['Owned form', 'Sarasvatī'],
  ],
  sita: [
    ['Devanagari', 'सीता'],
    ['IAST standard', 'Sītā'],
    ['Thai (Ramakien)', 'Sida (สีดา)'],
    ['Nepali', 'Janakī'],
    ['Owned form', 'Sītā'],
  ],
};

const KIT = {
  saraswati: {
    'vedic-references': {
      body: `Her Vedic file is double. As river: the Nadīstuti (ṚV 10.75) places her third, between Yamunā and Śutudrī, and ṚV 7.95–96 hymn her "surpassing all other waters," pure from mountain to sea, "wealth-giver, grain-giver." As word: ṚV 10.125, the **Vāgvāda** — Speech's own hymn — where Vāk declares herself queen of the gods: "I am the gathering of riches, the knowing; I range over all beings; I bend the bow for Rudra." The Brāhmaṇas complete the identification — "Vāk is Sarasvatī" (Śatapatha Brāhmaṇa) — and the two hymns to her as Vāgdevī (ṚV 8.100, 10.17's closing) close the file: river and word are one goddess in the oldest layer.`,
      sources: [{ citation: 'Ṛgveda 7.95–96, 8.100, 10.75, 10.125; Śatapatha Brāhmaṇa.' }],
    },
    upanishads: {
      body: `The Upaniṣads absorb her into the meditation on speech itself: the Chāndogya's teaching on vāk as one of the life's support-powers, and the Bṛhadāraṇyaka's placing of speech among the organs the self deploys, give her function a philosophical home. The Śvetāśvatara's river imagery — the self's current flowing to the sea — reads her oldest form into the new metaphysics. Where she is not named, her office is everywhere: the Upanishadic emphasis on mantra, recitation, and the heard word (śruti) is her cult turned inward.`,
      sources: [{ citation: 'Chāndogya Upaniṣad (vāk teachings); Bṛhadāraṇyaka Upaniṣad.' }],
    },
    puranas: {
      body: `The Purāṇas give her the full biography: born of Brahmā's mind (or his mouth), consort of the creator, mother of the Vedas' personified forms. The Matsya and Padma Purāṇas detail her iconography — white robe, vīṇā, book, beads, swan — and the Devībhāgavata counts her among the five primary śaktis. The **Brahmavaivarta** gives her the river's curse-myth: flowing on earth for the world's good, and the Gaṅgā-Sarasvatī-Yamunā triple-stream at Prayāga where she is the invisible third river, the antarvāhinī ("underground current") of the trivēṇī.`,
      sources: [{ citation: 'Devībhāgavata Purāṇa; Brahmavaivarta Purāṇa; Matsya Purāṇa.' }],
    },
    mantras: {
      body: `Her mantras are the school day's own: the **Sarasvatī Vandana** — "Yā kundendu-tuṣāra-hāra-dhavalā" ("she who is white as jasmine, moon, and snow") — recited by students every morning and at every Basant Panchami; the Gāyatrī-form addressed to her (Sarasvatī Gāyatrī); and the vidyā-ārambha invocation under which millions of children write their first letters each year. Musicians invoke her before the instrument is touched — "Sarasvatī namastubhyaṃ" — the oldest arts-prayer in continuous use.`,
      sources: [{ citation: 'Sarasvatī Vandana; the vidyā-ārambha liturgy.' }],
    },
  },
  sita: {
    'vedic-references': {
      body: `Sītā the furrow is older than the epic: the **Ṛgveda's Kṣetrapati Sūkta** (ṚV 4.57) invokes Sītā as the field's goddess — "Sītā, be gracious; give us abundant crops" — the ploughed line personified and prayed to for harvest. The Atharvaveda and the Gṛhya Sūtras keep her among the field-powers honored at ploughing rites. Vālmīki's genius was to take the agricultural goddess and give her the epic's biography: the furrow that feeds becoming the woman who endures.`,
      sources: [{ citation: 'Ṛgveda 4.57 (Kṣetrapati Sūkta); Atharvaveda field hymns.' }],
    },
    upanishads: {
      body: `The Upaniṣads do not name the epic Sītā — her tradition is itihāsa, not śruti — but the earth-born motif runs through the Upanishadic reading of pṛthivī (Earth) as patient support: "the earth bears all, the good and the evil," the text says, and Sītā's cult reads her endurance through that lens. Later Vedāntic devotion folds her into the divine couple (Sītā-Rāma as Lakṣmī-Nārāyaṇa), where her patience becomes the soul's fidelity to the self.`,
      sources: [{ citation: 'The pṛthivī teachings; the Sītā-Rāma devotional commentaries.' }],
    },
    puranas: {
      body: `The Purāṇas give her the full cycle beyond Vālmīki: her birth from the earth-furrow (Padma Purāṇa), the agni-parīkṣā retold with Agni's own testimony, the birth of Lava and Kuśa in the hermitage, and the final descent. The **Adhyātma Rāmāyaṇa** — the Purāṇic recasting — makes her the supreme goddess expressly: the shadow-Sītā doctrine (the real Sītā was never touched; a māyā-Sītā underwent the abduction and the fire) is the tradition's theological repair of the epic's hardest scenes, and its proof of how seriously India took her dignity.`,
      sources: [{ citation: 'Padma Purāṇa; Adhyātma Rāmāyaṇa (shadow-Sītā doctrine).' }],
    },
    mantras: {
      body: `Her name rides the Rāma-mantras: "Sītā-Rāma" as a single invocation, the Rāmāyaṇa-saṅkīrtan in which her name precedes the god's, and the wedding hymns of Vivāha Panchamī at Janakpur. The Kṣetrapati verse of the Ṛgveda is still spoken at ploughing in traditional districts — the furrow-goddess's own mantra, four thousand years of "Sītā, be gracious; give us abundant crops." In the bhajan tradition, "Sītā kalyāṇa" songs celebrate the wedding as the soul's union with the divine.`,
      sources: [{ citation: 'Ṛgveda 4.57.8; the Vivāha Panchamī liturgy.' }],
    },
  },
};

let applied = 0;
for (const [id, e] of Object.entries(data)) {
  if (!lore[id]) throw new Error(`no lore entry for ${id}`);
  const cur = lore[id];
  if (e.pronunciationNote) cur.pronunciation = { ...(cur.pronunciation || {}), note: e.pronunciationNote };
  if (e.domains) cur.domains = e.domains;
  if (e.symbols) cur.symbols = e.symbols;
  if (e.mythology) cur.mythology = e.mythology;
  if (e.syncretism) cur.syncretism = e.syncretism;
  if (e.culturalLegacy) cur.culturalLegacy = e.culturalLegacy;
  if (e.archaeology) cur.archaeology = e.archaeology;
  if (e.extendedMeditation) cur.extendedMeditation = e.extendedMeditation;
  if (e.sources) cur.sources = e.sources;
  cur.pronunciation = {
    ...(cur.pronunciation || {}),
    kin: (KIN[id] || []).map(([label, form]) => ({ label, form })),
  };
  applied++;

  // Scholars content: sanskrit kit sections + clear synthesized sections.
  const cp = path.join(ROOT, 'platform', 'scholars', 'content', `${id}.json`);
  const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
  c.sections = c.sections || {};
  for (const [key, sec] of Object.entries(KIT[id] || {})) {
    c.sections[key] = { body: sec.body, sources: sec.sources, generatedFrom: ['hand-authored'], bespoke: true };
  }
  // Sanskrit kit also has vedic-references covered above; clear lore-driven
  // sections so they re-synthesize from the rich lore.
  for (const k of ['overview', 'pronunciation', 'symbols', 'mythology', 'syncretism', 'cultural-legacy', 'archaeology', 'scholarly-sources', 'meditation', 'domains', 'original-script']) {
    delete c.sections[k];
  }
  fs.writeFileSync(cp, `${JSON.stringify(c, null, 2)}\n`, 'utf8');
}

fs.writeFileSync(lorePath, `${JSON.stringify(lore, null, 2)}\n`, 'utf8');
console.log(`batch E applied to ${applied} entries (+ sanskrit kit sections)`);
