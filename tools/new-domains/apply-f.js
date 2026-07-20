/**
 * Applies batch F to scripts/lore-catalog.json and authors the taxonomy-kit
 * scholars sections for the 15 third-wave entries.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const data = require(path.join(__dirname, 'enrich-f.js'));
const lorePath = path.join(ROOT, 'scripts', 'lore-catalog.json');
const lore = JSON.parse(fs.readFileSync(lorePath, 'utf8'));

const KIN = {
  guandi: [['Chinese', '關帝'], ['His name', 'Guān Yǔ 關羽'], ['Japanese', 'Kantei (関帝)'], ['Owned form', 'Guāndì']],
  ganga: [['Devanagari', 'गङ्गा'], ['IAST standard', 'Gaṅgā'], ['Hindi speech', 'Ganga'], ['Owned form', 'Gaṅgā']],
  hanuman: [['Devanagari', 'हनुमान्'], ['Stem form', 'Hanumat'], ['Thai', 'Hanuman (หนุมาน)'], ['Owned form', 'Hanumān']],
  yamuna: [['Devanagari', 'यमुना'], ['IAST standard', 'Yamunā'], ['Hindi speech', 'Yamuna / Jamuna'], ['Owned form', 'Yamunā']],
  gauri: [['Devanagari', 'गौरी'], ['IAST standard', 'Gaurī'], ['Owned form', 'Gaurī']],
  sani: [['Devanagari', 'शनि'], ['IAST standard', 'Śani'], ['Hindi speech', 'Shani'], ['Owned form', 'Śani']],
  orun: [['Yoruba', 'Ọ̀run'], ['Owner of heaven', 'Olóòrun'], ['Owned form', 'Ọrun']],
  xiuhtecuhtli: [['Nahuatl', 'Xiuhtēcuhtli'], ['His elder name', 'Huehueteotl'], ['Owned form', 'xiuhtecuhtli (ASCII)']],
  pluto: [['Latin', 'Plūtō'], ['Greek twin', 'Πλούτων'], ['Etruscan', 'Aita'], ['Owned form', 'Plūtō']],
  ceres: [['Latin', 'Cerēs'], ['Greek twin', 'Δημήτηρ'], ['Owned form', 'Cerēs']],
  orpheus: [['Greek', 'Ὀρφεύς'], ['Latin', 'Orpheus'], ['Owned form', 'Orpheús']],
  mixcoatl: [['Nahuatl', 'Mixcōātl'], ['His other name', 'Camaxtle'], ['Owned form', 'Mixcōātl']],
  oba: [['Yoruba', 'Ọ̀bá'], ['Cuba (Santería)', 'Obá'], ['Owned form', 'Ọba']],
  mazu: [['Chinese', '媽祖'], ['Her title', 'Tiānhòu (天后)'], ['Cantonese', 'Tin Hau'], ['Owned form', 'Māzǔ']],
  kartikeya: [['Devanagari', 'कार्त्तिकेय'], ['IAST standard', 'Kārttikeya'], ['Tamil', 'Murugan (முருகன்)'], ['Owned form', 'Kārttikeya']],
};

const PRON = {
  guandi: { ipa: '/kwán.tî/', ipaLabel: 'Standard Mandarin', approximation: 'gwahn-DEE — level tone, then a firm falling tone.' },
  ganga: { ipa: '/ɡɐ́ŋ.ɡaː/', ipaLabel: 'Reconstructed Sanskrit', approximation: 'GUNG-gah — retroflex nasal, long final vowel.' },
  hanuman: { ipa: '/ɦɐ.nʊ.maːn/', ipaLabel: 'Reconstructed Sanskrit', approximation: 'huh-noo-MAHN — the final syllable long.' },
  yamuna: { ipa: '/jɐ.mʊ.naː/', ipaLabel: 'Reconstructed Sanskrit', approximation: 'yuh-moo-NAH — even syllables, long ending.' },
  gauri: { ipa: '/ɡɐʊ̯.riː/', ipaLabel: 'Reconstructed Sanskrit', approximation: 'GOW-ree — the diphthong of "cow," then a long ee.' },
  sani: { ipa: '/ɕɐ.ni/', ipaLabel: 'Reconstructed Sanskrit', approximation: 'SHUH-nee — soft palatal sh, short and even.' },
  orun: { ipa: '/ɔ̀.rún/', ipaLabel: 'Standard Yoruba', approximation: 'aw-ROON — open o (dot-below), low-high melody.' },
  xiuhtecuhtli: { ipa: '/ʃiw.teːˈkʷi.tɬi/', ipaLabel: 'Classical Nahuatl', approximation: 'shee-oo-teh-KWEE-tlee — the final -tl released sideways.' },
  pluto: { ipa: '/ˈpluː.toː/', ipaLabel: 'Classical Latin', approximation: 'PLOO-toh — both vowels long.' },
  ceres: { ipa: '/ˈke.reːs/', ipaLabel: 'Classical Latin', approximation: 'KEH-rehs — hard c, long second vowel.' },
  orpheus: { ipa: '/or.pʰeús/', ipaLabel: 'Attic Greek Reconstruction', approximation: 'or-FEWS — the stress lands on the last syllable.' },
  mixcoatl: { ipa: '/miʃ.ˈkoː.aː.tɬ/', ipaLabel: 'Classical Nahuatl', approximation: 'meesh-KOH-ahtl — long o, lateral finish.' },
  oba: { ipa: '/ɔ̀.bá/', ipaLabel: 'Standard Yoruba', approximation: 'aw-BAH — open o, low-high melody.' },
  mazu: { ipa: '/má.tsù/', ipaLabel: 'Standard Mandarin', approximation: 'MAH-tsoo — level tone, then a dip-and-rise.' },
  kartikeya: { ipa: '/kaːr.t̪i.keː.jɐ/', ipaLabel: 'Reconstructed Sanskrit', approximation: 'KAHR-tih-kay-yah — the first vowel long, e always long in Sanskrit.' },
};

const KIT = {
  // sanskrit kit: vedic-references, upanishads, puranas, mantras
  ganga: {
    'vedic-references': { body: `The Ṛgveda knows the earthly river in the Nadīstuti (10.75) — "O Gaṅgā, the bride of the sea, listen, you who are dear to the people" — her only direct mention, and the proof of her primacy even in the oldest layer. The Kena Upaniṣad's story of the gods' pride humbled before Brahman places her origin in the celestial sphere; the Brāhmaṇas make her the purifier of the sacrifice itself. The Ṛgvedic geography of the Five Rivers has her as the eastern frame of the Vedic world.`, sources: [{ citation: 'Ṛgveda 10.75; Kena Upaniṣad; the Brāhmaṇa purification texts.' }] },
    upanishads: { body: `The Upaniṣads absorb her into the teaching of the self: the Chāndogya's river-sea teaching — all rivers reach the sea and become the sea, as all selves reach Brahman — is her everyday hydrology turned metaphysical, and the Kena's humbling of Agni, Vāyu, and Indra happens in the celestial space the tradition calls her home. She is rarely named; she is everywhere assumed — the current on which the Upanishadic raft crosses.`, sources: [{ citation: 'Chāndogya Upaniṣad (river-sea teaching); Kena Upaniṣad.' }] },
    puranas: { body: `The Purāṇas give her full biography: born of the feet of Viṣṇu, brought down by Bhagīratha, caught in Śiva's locks, released as seven streams — and, in the Bhāgavata, the water that purifies even of the sin of killing a brahmin. The Mahābhārata gives her the human marriage with Śantanu and the son Bhīṣma; the Matsya and Vāmana Purāṇas detail her celestial course. Her iconography is fixed there: white-robed, makara-mounted, the water-pot of the purifier in hand.`, sources: [{ citation: 'Bhāgavata Purāṇa (descent); Mahābhārata (Śantanu); Matsya Purāṇa.' }] },
    mantras: { body: `Her mantras are India's daily water-liturgy: the **Gaṅgā Stotra** — "Devī sureśvarī bhagavatī gaṅge" — recited at every holy bath; the ācamana invocation naming her first among the holy rivers; and the Kumbh Mela's bathing mantras, said by the largest congregations of humans on earth. The dying are given her water as the last rite — the Gaṅgā-jal that is, in the tradition, the ticket across.`, sources: [{ citation: 'Gaṅgā Stotra; the ācamana and last-rite liturgies.' }] },
  },
  hanuman: {
    'vedic-references': { body: `The Ṛgveda's monkey-figure is debated — some hear him in the hymns' Vanara-references, but the text that builds his cult is the itihāsa: Vālmīki's Rāmāyaṇa, where he first appears in the Kiṣkindhā Kāṇḍa and never leaves the story's center. The older strata know his father Vāyu (the wind-god of the hymns) well; the son inherits the speed, and the Rāmāyaṇa makes it the measure of devotion.`, sources: [{ citation: 'Vālmīki Rāmāyaṇa (Kiṣkindhā–Sundara Kāṇḍas); Ṛgveda (Vāyu hymns).' }] },
    upanishads: { body: `The Upaniṣads do not name him — his is the epic's domain — but the bhakti tradition reads him into the highest teaching: the servant who knows himself only as Rāma's messenger is the jīvanmukta's model, the liberated servant. The commentarial tradition on the Īśa's "all this is pervaded by the Lord" points to Hanumān as its proof: strength held entirely at the service of the whole.`, sources: [{ citation: 'The bhakti commentarial tradition on Īśa Upaniṣad.' }] },
    puranas: { body: `The Purāṇas fill the epic's margins: his birth to Vāyu and Añjanā (Śiva Purāṇa gives him Śiva's own portion), the sun-leap and the broken jaw, the curse that made him forget his strength until reminded (Jāmbavān's famous reminder before the ocean-leap), and his immortality (ciranjīvī) — he is one of the deathless who remain until the age ends, serving Rāma's name on earth. The Bhāgavata counts him the supreme bhakta.`, sources: [{ citation: 'Śiva Purāṇa; Bhāgavata Purāṇa; the Vālmīki Rāmāyaṇa.' }] },
    mantras: { body: `His is the most-recited hymn in India: Tulsīdās' **Hanumān Chālīsā** — forty verses in Awadhi, learned by heart by hundreds of millions — plus the "Rām Rām" repetition he is himself the model of, and the Sundara Kāṇḍa recitation (his own book of the epic) performed at his temples on Tuesdays and Saturdays. The wrestlers' invocation — "Bajrang Balī ki jai" — is his everyday war-cry.`, sources: [{ citation: 'Hanumān Chālīsā (Tulsīdās); the Sundara Kāṇḍa tradition.' }] },
  },
  yamuna: {
    'vedic-references': { body: `The Ṛgveda knows her in the Nadīstuti (10.75) — "Yamunā, with fair banks" — and in the hymn to the twins: Yama's twin-sister, the tradition there already pairs her with death's lord. The hymns place her between Gaṅgā and Śutudrī in the sacred geography, and the Brāhmaṇas invoke her with the Gaṅgā in the great purifications — the two waters the Vedic world ran between.`, sources: [{ citation: 'Ṛgveda 10.75; the twin-Yama hymns; Brāhmaṇa purification texts.' }] },
    upanishads: { body: `The Kaṭha Upaniṣad's great dialogue is her brother's: Yama teaching Naciketas the way through death — and the tradition reads the siblings together, the river of life and the lord of what ends it. The later Vaiṣṇava commentarial tradition makes her the Upaniṣad's river par excellence: the current in which the highest love (prema) flows, the water Kṛṣṇa himself blessed.`, sources: [{ citation: 'Kaṭha Upaniṣad (Yama and Naciketas); Gauḍīya commentaries.' }] },
    puranas: { body: `The Purāṇas give her the full biography: daughter of Sūrya and Saṃjñā, twin of Yama, wife of Kṛṣṇa in the devotional reading, mother of the Vindhya region's holiness. The Bhāgavata (book 10) stages her great scenes — Kāliya's cleansing, the gopīs' rāsa on her sands, Akrūra's vision beneath her water — and the Matsya Purāṇa ranks her bathing-days among the year's holiest. Her dark-blue color is fixed there: the twilight water of the blue god.`, sources: [{ citation: 'Bhāgavata Purāṇa 10; Matsya Purāṇa.' }] },
    mantras: { body: `Her mantras are the Vaiṣṇava daily office: the Yamunāṣṭaka — "Yamunā, purifier of the world, I bow to you" — recited at Vṛndāvana's ghāts every morning; the Kumbh Mela's sangam invocation naming her with Gaṅgā and the hidden Sarasvatī; and the Bhai Dooj blessing where sisters pray for brothers in the names of Yamunā and Yama, the river and her twin.`, sources: [{ citation: 'Yamunāṣṭaka; the Kumbh and Bhai Dooj liturgies.' }] },
  },
  gauri: {
    'vedic-references': { body: `The name itself is the Veda's oldest word for the divine feminine: gaurī — "the radiant, the golden" — appears in the Ṛgveda as an epithet of brightness, and the Atharvaveda's marriage hymns invoke the golden bride. The Śatarudrīya's address to Rudra's golden power is read by the tradition as her presence beside Śiva from the oldest layer: the word for her color became the word for her.`, sources: [{ citation: 'Ṛgveda (gaurī epithets); Atharvaveda (marriage hymns).' }] },
    upanishads: { body: `The Devī Upaniṣad — the Shakta tradition's charter — has the Goddess declare herself the whole: "I am the queen, the gatherer of treasures, the knowing; I am all this." The commentarial tradition reads Gaurī as the statement's benevolent face: the universe's energy in the form of the golden mother. The Kena's Umā, who teaches Indra humility in the bright mountain, is her oldest named appearance.`, sources: [{ citation: 'Devī Upaniṣad; Kena Upaniṣad (Umā).' }] },
    puranas: { body: `The Purāṇas give her the full cycle: birth as Pārvatī to Himavat, the years of austerity to win Śiva, the wedding at Kailāsa, and the sons — Gaṇeśa shaped from her own body, Kārttikeya fostered as her own. The Devībhāgavata counts her the highest form of the supreme Goddess; the Śiva Purāṇa details her tapas as the model of devotion; the Matsya Purāṇa fixes her iconography: golden skin, lotus, and the tiger's grace.`, sources: [{ citation: 'Śiva Purāṇa (the tapas cycle); Devībhāgavata Purāṇa; Matsya Purāṇa.' }] },
    mantras: { body: `Her mantras are the household's: the Gaurī stotras of the Tṛtīyā fasts — "Gaurī, golden one, mother of the universe, grant me a husband like yours" — sung by generations of brides; the Śākta panchāratna recitations naming her with Durgā and Kālī as the three faces of power; and the festival's immersion-prayer, the household's farewell to the golden guest: come again next year, Mother.`, sources: [{ citation: 'The Gaurī vṛata liturgies; Śākta panchāratna.' }] },
  },
  sani: {
    'vedic-references': { body: `The Ṛgveda's planetary references are sparse, but the tradition finds his substance in the hymns to Aditi's sons and the passages on karma's certainty. The Atharvaveda names the slow planet in its celestial hymns, and the Brāhmaṇas' doctrine of ritual-time (kāla) as the devourer and the measure is the philosophical ground of his cult: Saturn as time's own auditor, the office the Vedic world understood without needing the word.`, sources: [{ citation: 'Atharvaveda (celestial hymns); the Brāhmaṇa kāla doctrine.' }] },
    upanishads: { body: `The Upaniṣads give him his philosophical frame: the Bṛhadāraṇyaka's karma doctrine — "as one acts, so one becomes" — is Śani's charter, and the Kauṣītaki's account of the soul's passage through the moon to rebirth is the cycle he audits. The later Jyotiṣa literature folds him into the highest teaching: the slow planet as time's visible conscience, the god whose office is to make the law of karma legible in the sky.`, sources: [{ citation: 'Bṛhadāraṇyaka Upaniṣad (karma); Kauṣītaki Upaniṣad.' }] },
    puranas: { body: `The Purāṇas give him his biography: son of Sūrya and Chhāyā (the Shadow), the gaze that darkens whatever it falls on, the tests he gave even Śiva and Hanumān — and the one exemption, devotion freely given. The Skanda and Brahma-vaivarta Purāṇas detail his worship; the Mahābhārata places him among the planets that witness the great war. His iconography is fixed: dark, iron-clad, crow-mounted, the slow sword of justice in hand.`, sources: [{ citation: 'Skanda Purāṇa; Brahma-vaivarta Purāṇa; Mahābhārata.' }] },
    mantras: { body: `His mantras are India's Saturday morning: the Śani mantra — "Nilāñjana-samābhāsaṃ raviputraṃ yamāgrajam" ("dark as collyrium, son of the Sun, elder brother of Yama") — recited weekly by millions; the Navagraha stotra's Saturn verse; and the Sade Sati season's remedial recitations: sesame oil, iron, crows fed, and the Saturday fast. The most-feared planet is also the most-appeased.`, sources: [{ citation: 'Śani mantra; Navagraha stotra.' }] },
  },
  kartikeya: {
    'vedic-references': { body: `The Ṛgveda's Agni hymns are read by the tradition as his birth-ground: the fire-god's seed that becomes the war-god, and the hymn to the Maruts' young commander prefigures his captaincy. The Atharvaveda's battle-invocations name the youthful spear-bearer; the Taittirīya Saṃhitā's account of Agni's son establishes the lineage the epics expand. Skanda is the Vedic fire become the army's general.`, sources: [{ citation: 'Ṛgveda (Agni hymns); Atharvaveda; Taittirīya Saṃhitā.' }] },
    upanishads: { body: `The Upaniṣads know him as the commander's deeper form: the Subala and Skanda Upaniṣads (minor, but canonical to his cult) teach the six-faced one as the self's victorious force, and the Śvetāśvatara's vision of the divine as the youthful fire reads his face into the highest metaphysics. The South's Siddhānta tradition makes him the guru as well as the general — the teacher who explained the Praṇava (Oṃ) to Śiva himself.`, sources: [{ citation: 'Subala/Skanda Upaniṣads; Śvetāśvatara Upaniṣad.' }] },
    puranas: { body: `The Purāṇas give the full cycle: the seed from Śiva's third eye, the Kṛttikā star-mothers' nursing, the seven-day-old commander, Tāraka's fall, and the southern life — Murugan of the hills, the marriage to Vaḷḷi and Devayānai, the peacock and the rooster-banner. The Skanda Purāṇa — the largest of the Mahāpurāṇas — is his own book; the Mahābhārata's Śalya-parvan tells the war in full; the Kāṇḍa Purāṇam sings it in Tamil.`, sources: [{ citation: 'Skanda Purāṇa; Mahābhārata (Śalya-parvan); Kāṇḍa Purāṇam.' }] },
    mantras: { body: `His mantras are two nations' daily prayers: the **Kanda Śaṣṭi Kavasam** — the Tamil armor-hymn recited across the South — and the **Subrahmanya Bhujanga** of Śaṅkara; the six-day Skanda Ṣaṣṭhī fasting-cycle; and the Thaipusam's great vow, "Vel, Vel, Murugā!" shouted by millions under the milk-pots. The Sanskrit and Tamil liturgies are one cult: the spear is the same on both sides of the strait.`, sources: [{ citation: 'Kanda Śaṣṭi Kavasam; Subrahmanya Bhujanga.' }] },
  },
  // chinese kit: classical-texts, daoist-sources, buddhist-sources, calligraphy
  guandi: {
    'classical-texts': { body: `The historical core is Chén Shòu's **Records of the Three Kingdoms** (Sānguózhì, 3rd c.) — the austere biography of Guān Yǔ the general, his service, his death at Maicheng — and the novel that made the god: the **Romance of the Three Kingdoms** (Sānguó Yǎnyì, Ming), where the Peach Garden oath, the thousand-mile ride, and the release of Cáo Cāo at Huáróng pass made him the moral center of the whole cycle. The classics keep both: the man in the Records, the god in the Romance.`, sources: [{ citation: 'Sānguózhì (Records of the Three Kingdoms); Sānguó Yǎnyì (Romance).' }] },
    'daoist-sources': { body: `Daoism canonized him as **Guān Shèng Dì Jūn** (關聖帝君), Holy Emperor Guān: the Daoist registers give him office as a celestial enforcer of loyalty and oaths, and the temple liturgies of the Guān Dì cult — whose temples are counted in the thousands from Shanxi to Singapore — run on Daoist ritual frames. The Daoist martial lineages claim him as a protector of righteous force: the god of war who is also the god of the kept word.`, sources: [{ citation: 'The Guān Dì temple liturgies; Daozang registers of martial deities.' }] },
    'buddhist-sources': { body: `Chinese Buddhism adopted him as **Sānghārāma** (伽藍神), guardian of the dharma: the Sui-era tradition says the Tiantai patriarch Zhìyǐ received his vow at Mount Jingmen, and his statue has stood in the Guān-yú-hall of Chan monasteries ever since, opposite Wéituó. The sutra-commentaries call him the protector who chose the greater oath — the general sworn to the dharma as once to his brother: loyalty, upgraded.`, sources: [{ citation: 'The Tiantai transmission records; Chan temple guardianship liturgies.' }] },
    calligraphy: { body: `關帝: guān (關) is the gate-graph — a door with the bolt — the "pass" he guarded at Hulao and Huarong; dì (帝) is the emperor-graph, the supreme title the dynasties conferred. The two characters are his whole career: the gatekeeper made emperor. Temple steles from Yuncheng to Yokohama carve the pair in the square standard script; the Loyalist calligraphy tradition of the Ming-Qing Guandi temples made 忠義 (loyalty and righteousness) the flanking motto.`, sources: [{ citation: 'The Yuncheng temple steles; the 忠義 calligraphy tradition.' }] },
  },
  mazu: {
    'classical-texts': { body: `Her historical file begins in the Song records: the gazetteers of Meizhou and the **Lín clan's genealogies** record Lín Mòniáng (born 960 CE, the silent daughter of the fisherman), and the first imperial investitures of the 12th century. The Ming-Qing temple steles and the **Tiānhòu Shengmu** tradition document her rise through twelve successive titles; the vernacular tales of her storm-rescues fill the Fujian opera and temple-mural traditions.`, sources: [{ citation: 'The Meizhou gazetteers; Lín genealogies; Tiānhòu temple steles.' }] },
    'daoist-sources': { body: `Daoism enthroned her as **Tiānhòu** (天后), Empress of Heaven: the Daoist canon registers her among the celestial goddesses, and her temple cult — the largest in the Chinese coastal world — runs on Daoist ritual: the birthday procession (3rd lunar month), the divination of the sea-omens, and the Dajia circuit's whole liturgy. The Daoist sea-offices give her command of the water-bureaucracy: the goddess who outranks the dragon kings for anyone who sails.`, sources: [{ citation: 'The Tiānhòu liturgies; Daozang sea-goddess registers.' }] },
    'buddhist-sources': { body: `Buddhist tradition links her to **Guānyīn**: the legends make the silent maiden a devotee of the bodhisattva, and many of her temples honor Guānyīn as her senior — the sea-goddess as the bodhisattva's coastal face. The Chinese Buddhist retinues of the protector-halls include her among the dharma-guardians, and the Buddhist charities of the coastal temples run in her name: the fishermen's goddess with a bodhisattva's résumé.`, sources: [{ citation: 'The Guānyīn-Māzǔ temple traditions; Chinese Buddhist guardian registers.' }] },
    calligraphy: { body: `媽祖: mā (媽) is mother — the woman-radical with the horse-phonetic — and zǔ (祖) is ancestor, the altar-graph 礻 with 且. "Maternal Ancestor": the title is kinship made divine — the sea's grandmother. The alternate 天上聖母 (Holy Mother of Heaven) and 天后 (Empress of Heaven) titles appear in the imperial calligraphy of her great temples; her personal name 默娘 (Silent Maiden) survives in the clan records.`, sources: [{ citation: 'The Meizhou temple inscriptions; the Lín clan records.' }] },
  },
  // yoruba kit: ifa, oral-tradition, diaspora
  orun: {
    ifa: { body: `Ifá is heaven's own archive: the odù of the corpus treat Ọrun as the fixed frame of all divination — the babaláwo's palm-nuts are read as letters from Ọrun, and the verses of Ogundá and the senior odù describe the soul's choosing of orí before Olódùmarè. The divination day begins with heaven's invocation; the Ifá priest is, in the corpus' own phrase, "the servant of Ọrun on earth."`, sources: [{ citation: 'Bascom, Ifa Divination; the ogundá verses.' }] },
    'oral-tradition': { body: `The oríkì of Ọrun are the cosmology sung: the praise-poems of Olódùmarè ("owner of heaven," "the king whose palace touches the sky") and of the orisha who commute its road; the Ilé-Ifẹ̀ traditions of Odùduwà's descent on the chain; and the naming-formulas that carry heaven into daily speech — Ọlọrun, Ọrunmila, Ọba-Ọrun. The oral archive is the primary scripture: heaven is not read in Yorubaland; it is recited.`, sources: [{ citation: 'Idowu, Olodumare; the oríkī collections.' }] },
    diaspora: { body: `The diaspora carried the sky: Candomblé's Oxalá-realm and the céu of the batuques, Santería's heaven of Olófin and Olodumare, and Haitian Vodou's Bondye-above-all keep the Ọrun-ayé structure intact beneath Catholic heavens. The Egúngún masquerades of Brazil and Cuba stage the ancestors' commute from Ọrun in the streets; the funeral liturgies of two continents send the dead on the same road home: heaven was never lost in the crossing.`, sources: [{ citation: 'Bascom, Shango in the New World; the diaspora Egúngún records.' }] },
  },
  oba: {
    ifa: { body: `The Ifá corpus knows the co-wives' war: the odù that tell of Ṣàngó's household use Ọba's story as the divination-canon's standing warning on jealousy — the senior wife's maiming recited as the proof that envy wounds the envier. The babaláwo cite her ear in the counseling of households: the oracle that answers polygamy's oldest question with the river that outlasted the storm.`, sources: [{ citation: 'Bascom, Ifa Divination (the co-wives odù).' }] },
    'oral-tradition': { body: `Her oríkì are the river's own elegy: the praise-names — "senior wife of the thunder," "she who hides her ear and keeps her crown," "the river that endures" — and the Ọba River traditions of her flight and her lake. The oral cycle of the three wives, told at the Ọṣogbo shrines and in the hunters' guilds, is among the finest domestic myth-cycles in the Yoruba archive: the palace as weather, the river as the one who stays.`, sources: [{ citation: 'Idowu, Olodumare (Ogun and river oríkì); the Ọba shrine traditions.' }] },
    diaspora: { body: `In Cuba she is **Obá** of Santería — syncretized with Santa Catalina, her cult strong at Matanzas, her priests arranging the devotee's hair over the covered ear; in Brazil's Candomblé she keeps her river and her dignity. The diaspora kept the cycle whole: Ọba, Ọṣun, Ọya, three rivers, one storm — the New World's orisha households recite her as the patron of the patient: the wife who lost everything and kept the river.`, sources: [{ citation: 'Bascom, Shango in the New World (Obá cults); the Matanzas records.' }] },
  },
  // nahuatl kit: florentine-codex, aztec-sources, colonial-sources
  xiuhtecuhtli: {
    'florentine-codex': { body: `Sahagún's Book 1 names him among the first gods: Xiuhtēcuhtli, "lord of fire," the first and the last, present at the center of the four directions. The Codex's ritual books give his whole liturgy: the monthly hearth-offerings of copal and food, the fire-walking of his priests, and the **New Fire ceremony** — the binding of the years, the extinguishing of every flame in the empire, and the drilling of the one new fire on the hill of Huixachtlan.`, sources: [{ citation: 'Florentine Codex, Books 1, 2, 7 (New Fire).' }] },
    'aztec-sources': { body: `The **Leyenda de los Soles** and the Histoyre du Méchique place him at the cosmos' center: the fire-pillar of the four directions, the old god who was before the suns. The Codex Borgia shows him with the fire-drill and the brazier; the Primeros Memoriales detail his temple in the sacred precinct, beside the Templo Mayor's great stairs — the god of the kitchen with the empire's second address.`, sources: [{ citation: 'Leyenda de los Soles; Codex Borgia; Primeros Memoriales.' }] },
    'colonial-sources': { body: `The friars documented him with their usual double vision: Sahagún's informants gave the New Fire's full account in 1507's living memory; Durán describes the hearth-cult of the households and the year-end's dark vigil; Motolinia notes the fire-drill's sanctity among the people. The colonial record is unanimous on one thing: of all the gods, he was the most domestic — the first fire of every home, and the hardest to put out.`, sources: [{ citation: 'Durán and Motolinia (hearth cult); Sahagún, Florentine Codex.' }] },
  },
  mixcoatl: {
    'florentine-codex': { body: `Sahagún's Codex gives him the hunter's chapter: Mixcōātl, "Cloud Serpent," god of the hunt and of the Milky Way, whose festival **Quecholli** ("the precious feather") honored him with the laying of weapons on his altar. The Codex's account of the Tlatoani's investiture shows the new king dressed as Mixcōātl for the warrior rites — the empire formally dressed as the wilderness that made it.`, sources: [{ citation: 'Florentine Codex, Books 1, 2 (Quecholli), 8 (investiture).' }] },
    'aztec-sources': { body: `The migration traditions make him the road-god: the Chichimec ancestors followed his star-road south — the Milky Way as the Cloud Serpent's body — and the Codex Boturini's itinerary places the hunt-god's cult at every stage of the walk to Tenochtitlan. The Leyenda de los Soles makes him father of the Centzon Huitznāhua, the star-host of the night sky's war.`, sources: [{ citation: 'Codex Boturini (migration); Leyenda de los Soles.' }] },
    'colonial-sources': { body: `The chroniclers filed him under two wrong names — Nimrod the hunter-king and Santiago Matamoros — and the people kept the serpent: Durán describes the Quecholli weapons-dance and the hunters' guilds; the relaciones of the northern provinces record the Camaxtle-cult among the Chichimec-speaking peoples. The colonial record's value is the proof of continuity: the hunt-god outlived the hunt, and his star-road is still read in the Sierra Madre's night.`, sources: [{ citation: 'Durán (Quecholli); the northern relaciones (Camaxtle).' }] },
  },
  // roman kit: epithets, oracle-sites
  pluto: {
    epithets: { body: `His titles divide, as he does, between dread and gift.

- **Plūtō** — 'the Rich One'; Rome's own name for the underworld's wealth.
- **Plūtus** — 'Wealth'; the benign twin, the giver from below.
- **Dis (Pater)** — 'the Rich Father'; the old Italic name, claimed by Gauls as their ancestor.
- **Orcus** — the punisher-face; the underworld as the oath's enforcer.
- **Tartarus** — the poetic address; the deep by its Greek name.`,
      sources: [{ citation: 'Lewis & Short, s.v. Pluto, Dis, Orcus; Varro and Cicero.' }] },
    'oracle-sites': { body: `Rome kept his door: the **Plutonium on the Aventine**, the underworld gate where the devotio of 249 BCE was staged (Livy's account of the men who sealed the pit with their lives). The Etruscan underworld of **Tarquinia's painted tombs** shows Aita and Phersipnai — his Italian face before Rome's — in the François Tomb's great demon-scenes. Sicily's **Henna (Enna)**, the meadow of the Proserpina myth, was his cult's southern capital; the lake of the taking is shown to visitors still.`, sources: [{ citation: 'Livy (the devotio); the Tarquinia tomb corpora; Cicero on Enna.' }] },
  },
  ceres: {
    epithets: { body: `Her titles are the grain-year in Latin.

- **Cerēs** — from crescere, 'to grow'; the name that becomes 'cereal.'
- **Augusta** — 'the Venerable'; her imperial title.
- **Frugifera** — 'fruit-bearing'; the harvest office.
- **Legifera** — 'law-bearer'; the goddess of the plebeian statutes.
- **Dea Sancta** — 'the holy goddess'; the Aventine's own address.`,
      sources: [{ citation: 'Lewis & Short, s.v. Ceres; Cicero and Ovid.' }] },
    'oracle-sites': { body: `Her great seat was the **Aventine temple of Cerēs, Liber, and Libera** (493 BCE) — the plebeian trinity beside the Circus Maximus, asylum of debtors and archive of the people's laws; its platform survives. **Enna in Sicily** — the myth's own meadow — kept her sanctuary as the island's patroness, and **Eleusis' Roman pilgrims** (Cicero among them) brought her Greek mysteries home to her. The Cerealia games of April staged her return at the Circus every year.`, sources: [{ citation: 'The Aventine excavations; Cicero, Verrines (Enna); the fasti (Cerealia).' }] },
  },
  // greek kit: homeric-hymns, epithets, oracle-sites, iconography
  orpheus: {
    'homeric-hymns': { body: `No Homeric Hymn addresses him — the singer predates the hymnists' calendar — but the Orphic corpus took up the hymnic form in his name: the eighty-seven **Orphic Hymns** of late antiquity invoke the gods in the meter his tradition made sacred, and the hymns' preface addresses Musaios, "Orpheús' companion," as the priest of the mysteries. His true hymn is the one he never sang: the Derveni commentary's exegesis of the Orphic theogony, the oldest philosophy of song in Europe.`, sources: [{ citation: 'The Orphic Hymns (Athanassakis); the Derveni Papyrus.' }] },
    epithets: { body: `The singer's titles are all offices of the lyre.

- **ὁ Κιθαρῳδός** — 'the lyre-singer'; the profession become a name.
- **Θρᾴξ** — 'the Thracian'; his people, the northern singers.
- **Μουσαῖος' teacher** — the lineage-title of the Orphic succession.
- **ὁ καταβάς** — 'the one who went down'; the descent as epithet.
- **Apollo's son** — the genealogy the poets preferred over Oeagrus.`,
      sources: [{ citation: 'Pindar; Apollodorus; the Orphic succession texts.' }] },
    'oracle-sites': { body: `His head kept prophesying: washed down the Hebrus to **Lesbos**, it was set in a cave-shrine and gave oracles until Apóllōn claimed the silence — the strangest posthumous cult in Greece, attested by Philostratus and the antiquarians. **Pieria**, below Olympos, kept his birthplace-grove where the nightingales still sang sweeter than elsewhere (Pausanias heard the difference). The Orphic initiates' graves — the gold-tablet burials of **Thurii, Petelia, and Pelinna** — are his religion's true sanctuaries: the dead, instructed, carrying the song underground.`, sources: [{ citation: 'Philostratus, Heroicus (the Lesbos oracle); Pausanias 9.30 (Pieria).' }] },
    iconography: { body: `Vase-painting fixes his biography in three acts: the **Thracian singer charming the Greeks** (dressed as a northerner among Athenians), the **singer charming the animals** (the world's oldest concert poster, from black-figure onward), and the **descent** (Orpheus among the underworld's figures, the Romans' favorite). The great Naples relief of Orpheus among the Maenads shows the death; the Lyre constellation charted on star-maps is his instrument; and every opera-house curtain since 1607 has risen, in a sense, on his lyre.`, sources: [{ citation: 'LIMC VII.1, s.v. Orpheus; the Naples relief; the star atlases.' }] },
  },
};

const DROP = ['overview', 'pronunciation', 'symbols', 'mythology', 'syncretism', 'cultural-legacy', 'archaeology', 'scholarly-sources', 'meditation', 'domains', 'original-script'];

let applied = 0;
for (const [id, e] of Object.entries(data)) {
  const cur = lore[id] || {};
  cur.pronunciation = {
    ...(PRON[id] || {}),
    note: e.pronunciationNote,
    kin: (KIN[id] || []).map(([label, form]) => ({ label, form })),
  };
  cur.domains = e.domains;
  cur.symbols = e.symbols;
  cur.mythology = e.mythology;
  cur.syncretism = e.syncretism;
  cur.culturalLegacy = e.culturalLegacy;
  cur.extendedMeditation = e.extendedMeditation;
  cur.sources = e.sources;
  cur.archaeology = e.archaeology;
  lore[id] = cur;
  applied++;

  const cp = path.join(ROOT, 'platform', 'scholars', 'content', `${id}.json`);
  const c = fs.existsSync(cp) ? JSON.parse(fs.readFileSync(cp, 'utf8')) : { entryId: id, contentVersion: 1, sections: {} };
  c.sections = c.sections || {};
  for (const [key, sec] of Object.entries(KIT[id] || {})) {
    c.sections[key] = { body: sec.body, sources: sec.sources, generatedFrom: ['hand-authored'], bespoke: true };
  }
  for (const k of DROP) delete c.sections[k];
  fs.writeFileSync(cp, `${JSON.stringify(c, null, 2)}\n`, 'utf8');
}

fs.writeFileSync(lorePath, `${JSON.stringify(lore, null, 2)}\n`, 'utf8');
console.log(`batch F applied to ${applied} entries (+ kit sections)`);
