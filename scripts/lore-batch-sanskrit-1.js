#!/usr/bin/env node
/**
 * Lore-catalog merge — Sanskrit batch 1: indra, agni, yama, kalki (ascii-restoration 2026-11).
 * Idempotent: existing non-empty entries are NEVER overwritten.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LORE_PATH = path.join(ROOT, 'scripts', 'lore-catalog.json');
const lore = JSON.parse(fs.readFileSync(LORE_PATH, 'utf8'));

const ENTRIES = {
  indra: {
    pronunciation: {
      ipa: '/ˈɪndrə/',
      ipaLabel: 'Sanskrit (IAST: Indra)',
      phonemes: [
        { symbol: 'In-', desc: 'Short i as in “bit”, followed by the retroflex dental n — tongue curled back.' },
        { symbol: '-dra', desc: 'The d is retroflex ḍ in careful speech; the final a is a light schwa, half-sounded.' },
      ],
      approximation: '“IN-druh” — the final vowel breathes rather than lands',
      kin: 'Vedic Índra · Pāli/Prakrit Inda · Buddhist Śakra',
      note: 'One of the oldest named gods in any Indo-European language — the name appears already in the Rigveda’s first hymn.',
    },
    domains: {
      title: 'God of the Storm, the Vajra, King of the Gods',
      subtitle: 'The Dragon-Slayer of the Rigveda',
      lead: "<p class='lead-text'><strong>Indra</strong> is the king of the Vedic gods: the thunderbolt-bearer who slew the dragon Vritra and released the rivers, the drinker of soma who roars into battle, the thousand-eyed lord of the sky. Two hundred and fifty hymns of the Rigveda are addressed to him — more than to any other deity — making him the best-documented god of the ancient world.</p>",
      cards: [
        { name: 'The Vajra', desc: 'The thunderbolt forged from the bones of the sage Dadhichi — Indra’s irresistible weapon against the dragon.', iconPath: 'M34 6L20 32H30L26 56L44 26H34L40 6ZM14 44L20 40M46 40L52 44' },
        { name: 'Slayer of Vritra', desc: 'He split the dragon that held the waters captive, and the rivers ran free — the founding victory of cosmic order.', iconPath: 'M12 44C20 28 28 40 36 32C44 24 48 32 54 20M12 44L20 40M36 32L44 28M54 20L50 28M54 20L46 18' },
        { name: 'Lord of Soma', desc: 'The sacred draught that makes gods gods: Indra drinks the soma press before every battle.', iconPath: 'M22 16H42L38 52H26ZM32 16V8M26 28H38M27 38H37M28 46H36' },
        { name: 'The Thousand-Eyed', desc: 'His body bears a thousand eyes — the marks of the gods’ curse and his redemption; the sky’s innumerable lights.', iconPath: 'M10 32C18 22 30 22 36 32C30 42 18 42 10 32ZM36 32C42 24 50 24 56 32C50 40 42 40 36 32ZM23 29A3 3 0 1 0 23 35A3 3 0 1 0 23 29M46 29A3 3 0 1 0 46 35A3 3 0 1 0 46 29' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>The Indra of the Rigveda is a storm in divine form: mighty, boisterous, sometimes embarrassed, always central. His one great myth — the combat with Vritra — is the Vedic creation story: the waters of life imprisoned by the dragon, the thunderbolt that splits the mountains, the rivers released. Everything else in his mythology is commentary on that victory.</p>",
      myths: [
        { tag: 'Rigveda 1.32', title: 'The Slaying of Vritra', text: "<p class='myth-text'>Vritra, the “Enveloper”, coiled about the world’s waters and held them fast in his mountain caves. Indra, armed with the vajra forged by Tvashtri from Dadhichi’s bones, struck the dragon on its flank; the waters burst free and flooded to the sea. ‘Like lowing cows the waters rushed’ — the oldest dragon-slaying in recorded literature, and the template for every one after it.</p>" },
        { tag: 'Rigveda 8', title: 'The Drink of Soma', text: "<p class='myth-text'>Before the combat, Indra drinks three lakes of soma pressed by the priests; filled with the draught, his strength is irresistible and his belly vast. The hymns taunt and flatter him by turns — the Vedic poets knew their storm-god was vain, and loved him for it. Soma is both his fuel and his fee.</p>" },
        { tag: 'Rigveda 10.119', title: 'The Intoxication Hymn', text: "<p class='myth-text'>The most human hymn in the Rigveda: Indra speaks in the first person, drunk on soma, boasting — ‘I will break the earth’s two halves apart, like a gourd I will break the two worlds’. The gods’ king, for one hymn, sounds like a warrior at the feast, and the poets let him.</p>" },
        { tag: 'Epic & Purāṇic Cycle', title: 'From King of Gods to Dethroned Elder', text: "<p class='myth-text'>In the later epics the balance shifts: Vishnu’s avatars take the great victories, and Indra becomes the anxious king who sins — the seducer of Ahalyā, the raider of Triparu, the god who must yield his throne’s preeminence. The Purāṇas preserve a dignity-muted Indra, still lord of the eastern quarter and of the storm, but no longer the cosmos’ protagonist.</p>" },
      ],
    },
    syncretism: "In Buddhism Indra becomes Śakra, lord of the Trāyastriṃśa heaven, subservient to the Buddha and guardian of the dharma — the storm-god converted into a devotee. In Jainism he is a class of heaven-rulers. Greek observers heard Zeus in him; modern comparative philology confirmed the kinship: Indra and Zeus descend from the same Proto-Indo-European sky-father’s thunderbolt.",
    culturalLegacy: "He is embedded in the oldest Indo-European poetry extant — every study of dragon-slaying, thunder-gods, or soma/haoma ritual begins with him. The word ‘Indra’ entered Southeast Asian royal names (Indravarman, Indrapura) carried by Hindu expansion; and the Vajra passed east into Tibetan Buddhism as the thunderbolt-sceptre of the vajrayāna itself.",
    extendedMeditation: "Indra: a name with no diacritics because it never needed any — the retroflex consonants of the Vedic hymns sit quietly inside plain letters, as they have since the first singer pressed soma. To restore him in ASCII is to hand the thunderbolt back to the oldest god who still answers to the spelling a schoolchild would guess.",
    sources: [
      { name: 'Rigveda 1.32 (the Vritra combat)' },
      { name: 'Rigveda 8 (soma hymns to Indra)' },
      { name: 'Rigveda 10.119 (the intoxication hymn)' },
      { name: 'Śatapatha Brāhmaṇa 1.6.3 (the Dadhichi legend)' },
      { name: 'Mahābhārata & Purāṇic Indra-cycle' },
    ],
    archaeology: "No Indra temples survive in India — the Vedic cult was fire and libation, not image. But his name is carved across Southeast Asia: the seventh-century Sanskrit inscriptions of Cambodia invoke him as royal ancestor, and Borobudur’s reliefs show Śakra attending the Buddha.",
    cult: "The Vedic cult of Indra centred on the soma-pressing: the great ritual whose three daily pressings were the engine of the storm-god’s power. His festival, the Indra-dhvaja, raised his banner at the monsoon’s onset — the ritual ancestor of every monsoon festival in the subcontinent.",
    iconography: "The thunderbolt in the raised right hand, the bow in the left; four arms in later iconography adding the goad and the lotus; his mount the white elephant Airāvata, his skin golden like the storm-light. The thousand eyes mark his body across his skin like stars.",
    reception: "Comparative mythology made Indra its cornerstone: the Vritra-combat mapped onto Thor’s, Zeus’, and Marduk’s victories established the field’s methods. In modern India, Indra survives in the monsoon’s personification, in the army’s missile named for his bolt, and in the unbroken recitation of the Rigveda itself — the oldest worship still vocally performed on earth.",
  },

  agni: {
    pronunciation: {
      ipa: '/ˈɑːɡni/',
      ipaLabel: 'Sanskrit (IAST: Agni)',
      phonemes: [
        { symbol: 'Ag-', desc: 'The a is the open “ah”; g is a hard stop. The name IS the common noun “fire”.' },
        { symbol: '-ni', desc: 'Palatal n with a long ī in Vedic lengthening; the word carries its own glow.' },
      ],
      approximation: '“AHG-nee”',
      kin: 'Avestan Atar · Latin ignis · English “ignite” — the Indo-European fire-word family',
      note: 'His name is cognate with Latin ignis: the god and the element share one root across three millennia.',
    },
    domains: {
      title: 'God of Fire, the Sacrifice, the Messenger',
      subtitle: 'The Priest of the Gods and the Guest of Men',
      lead: "<p class='lead-text'><strong>Agni</strong> is fire worshipped as a god: the flame that carries every offering upward, the guest in every home’s hearth, the priest of the gods and the god of priests. Second only to Indra in Vedic hymns, he is the most frequently invoked deity at the ritual itself — for without Agni, no prayer reaches heaven.</p>",
      cards: [
        { name: 'The Messenger', desc: 'Every offering is carried to the gods through his flame — Agni is the one channel of prayer.', iconPath: 'M32 8C26 18 20 26 20 36C20 46 25 52 32 52C39 52 44 46 44 36C44 26 38 18 32 8ZM32 40V52' },
        { name: 'Threefold Fire', desc: 'He has three births — in the heavens as sun, in the waters as lightning, on earth as the hearth-flame.', iconPath: 'M12 20H24M6 14L12 20L18 14M24 36H36M18 30L24 36L30 30M36 52H48M30 46L36 52L42 46' },
        { name: 'The Divine Priest', desc: 'Hotṛ of the gods, he conducts the rite he is offered at — god and officiant in one flame.', iconPath: 'M32 8V30M32 14L50 22M32 14L14 22M32 30L20 48M32 30L44 48M32 30V52' },
        { name: 'Consumer and Purifier', desc: 'He eats the oblation and burns away sin; the dead pass through his mouth to the fathers.', iconPath: 'M16 24C20 16 28 12 32 12C36 12 44 16 48 24M20 24C24 20 40 20 44 24M24 28C28 26 36 26 40 28M28 34H36M32 34V50' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>Agni’s mythology is less narrative than elemental: he is born daily from the friction-sticks, devours his parents (the sticks that bore him) at birth, and carries the sacrifice skyward. Yet the Vedic poets gave him a full biography — hidden at birth, stolen by the gods, established among men — and the epics gave him a genealogy and a role in every hero’s fire-drill.</p>",
      myths: [
        { tag: 'Rigveda 10.129', title: 'The Hidden Birth', text: "<p class='myth-text'>The birth-hymns tell that Agni was concealed in the waters and the wood, secret like a son hidden by his mother, until the ten sisters — the fingers of the kindling-priest — rubbed him forth. ‘The new-born infant licks the earth’: the first flame tasting the world it will consume and consecrate.</p>" },
        { tag: 'Rigveda 10.51', title: 'Agni Flees the Sacrifice', text: "<p class='myth-text'>In the great dialogue hymn, Agni hides from the burden of the office — the god who must eat the offering shrinks from being eaten by his own hunger. The gods find him in the waters, the fig-tree, the plants; each offers to hide him; he returns to the ritual because prayer without fire goes nowhere. It is the most psychologically modern of Vedic hymns.</p>" },
        { tag: 'Śatapatha Brāhmaṇa', title: 'The Stolen Fire of the Gods', text: "<p class='myth-text'>The Brāhmaṇas narrate how the gods kept Agni from men until Mātariśvan, the Vedic Prometheus, brought him down hidden in the stalk of a plant — the mythic warrant for the fire-drill itself, and for the conviction that fire is heaven’s property on loan to the hearth.</p>" },
        { tag: 'Mahābhārata', title: 'Agni and the Khandava Forest', text: "<p class='myth-text'>In the epic, Agni, weakened by a surfeit of ghee, begs Krishna and Arjuna to let him burn the Khandava forest; fed by the conflagration, he blazes up again as of old. The episode fixes the epic’s theology of fire: indiscriminate when ravenous, a god still, and the friend of heroes who understand his hunger.</p>" },
      ],
    },
    syncretism: "Agni is the Vedic counterpart of the Avestan Atar, and the fire-cult is the one element Zoroastrianism kept most fully from the old Indo-Iranian religion. Greek writers compared him to Hephaestus and the altar-flame; modern linguistics binds him to Latin ignis and English ignite. In Hindu ritual he remains unpolluted by sect — every saṃskāra from birth to cremation passes through him.",
    culturalLegacy: "The Agnihotra — the twice-daily milk-offering to fire — has been performed continuously for three thousand years and is still performed today, the oldest uninterrupted ritual on earth. His name, through Latin ignis, kindled the English language’s whole fire-vocabulary; and the ritual fire’s three forms shaped the theology of light in every Indian tradition.",
    extendedMeditation: "Agni: the god whose name is a common noun across four language families. Restoring him in ASCII requires no scholarship at all — every reader has already said his name a thousand times, in ‘ignite’, in ‘ignition’, in the strike of a match. He is the most restored god in the lexicon because his restoration is involuntary.",
    sources: [
      { name: 'Rigveda 1.1 (the first hymn — to Agni)' },
      { name: 'Rigveda 10.51 (Agni’s flight)' },
      { name: 'Śatapatha Brāhmaṇa 1.1.4 (the stolen fire)' },
      { name: 'Mahābhārata, Ādi Parvan (the Khandava burn)' },
    ],
    archaeology: "The fire-altar itself is his monument: the brick agnicayana altars of the Śrauta ritual, rebuilt in every performance to the geometry the Śulbasūtras prescribe. Harappan fire-pits may be his prehistoric ancestry; Southeast Asian fire-shrines and the homa-cults of esoteric Buddhism carried his cult across Asia.",
    cult: "The domestic āhavanīya and gārhapatya fires accompany every rite of passage; the great Śrauta agniṣṭoma lasts a year and raises the fire to the sky on a falcon-shaped brick altar. The Agnihotra prayer at dawn and dusk is his daily liturgy — three millennia without interruption.",
    iconography: "A red two-faced god — the consuming and auspicious faces — riding the ram or the goat, with seven tongues of flame and the ladle and butter in his hands. His body is flame itself; his hair the smoke; his seven tongues named in the hymns as the Kālīs, the carriers of the oblation.",
    reception: "Comparative religion uses Agni as the case where god and element are one — the purest survivorship of Indo-European fire-worship. The Roman flamen’s flame, the Zoroastrian ātaxš, and the Vedic agni form a triad scholars still trace; and the English word ‘ignite’ speaks his name in every chemistry classroom.",
  },

  yama: {
    pronunciation: {
      ipa: '/ˈjʌmə/',
      ipaLabel: 'Sanskrit (IAST: Yama)',
      phonemes: [
        { symbol: 'Ya-', desc: 'Palatal y as in “young”; the a is short and open.' },
        { symbol: '-ma', desc: 'The name means “twin” — Yama is the twin of Yamī in the earliest tradition.' },
      ],
      approximation: '“YUM-uh”',
      kin: 'Avestan Yima · Vedic Yamī (his twin sister) · Buddhist Yama/Enma',
      note: 'The lord of the dead was the first mortal — the one who found the path and guards it ever since.',
    },
    domains: {
      title: 'God of Death, the First Mortal, Judge of the Dead',
      subtitle: 'The King of the Ancestral World',
      lead: "<p class='lead-text'><strong>Yama</strong> is death’s king in the Indian traditions: the first man to die, who found the way to the fathers’ world and now rules it — and judges who may enter. With his noose and his two four-eyed dogs, he waits at the southern direction, the realm of the ancestors, and his account-book is the oldest audit in human literature.</p>",
      cards: [
        { name: 'The First Mortal', desc: 'He died before anyone — the twin who found the path to the fathers and became its king.', iconPath: 'M32 8V28M32 12L48 20M32 12L16 20M32 28L18 48M32 28L46 48M32 28V52M24 40H40' },
        { name: 'The Noose', desc: 'His pāśa, the noose, finds every soul at its hour; none outrun it, though all may beg.', iconPath: 'M20 14C28 8 40 10 44 18C48 26 42 34 34 34C26 34 22 28 26 22M34 34L28 44M28 44C24 50 28 56 34 54C40 52 40 46 36 44' },
        { name: 'The Two Dogs', desc: 'Śyāma and Śabala, four-eyed, follow his road and report the dead; they guard the way.', iconPath: 'M14 40C14 30 20 24 26 26C32 28 34 36 30 42C26 48 16 48 14 40ZM22 32L20 26M28 34L30 28M18 38L10 36' },
        { name: 'Judge of the Deeds', desc: 'In the Mahābhārata and Purāṇas he reads the record of every soul — the karma, weighed without scales.', iconPath: 'M32 10V54M32 16L50 26M32 16L14 26M24 30H40M26 38H38M20 46H44' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>Yama’s mythology moves from Vedic pathfinder to epic judge to Purāṇic king of hells. He begins as the twin who chose to die — the first of the race to walk the path — and becomes the stern accountant whose city the dead enter by the southern gate. Buddhism and the epics gave him his tortures and his buffalo; the Veda kept his dignity.</p>",
      myths: [
        { tag: 'Rigveda 10.10', title: 'The Twin Dialogue', text: "<p class='myth-text'>The oldest Yama-text is a dialogue: Yama and his twin Yamī, the first two beings, and Yamī’s love for her brother. Yama refuses — ‘the immortals watch’ — and the hymn becomes the charter of exogamy and of the incest-taboo itself, argued between the world’s first twins in the world’s first debate.</p>" },
        { tag: 'Rigveda 10.14', title: 'The Path of the Fathers', text: "<p class='myth-text'>The funeral hymn sends the dead king along the path Yama blazed, past the two dogs and the waters, to the feast of the fathers where Yama waits with Varuṇa. ‘Leave the sin here, keep the glory’ — the formula of every Vedic funeral, spoken to the first traveller’s successor.</p>" },
        { tag: 'Mahābhārata', title: 'The King Under the Earth', text: "<p class='myth-text'>In the epic’s underworld-book, Yama rules below with his city Saṃyamanī, his account read by Citragupta, his noose and his buffalo — the god of justice who once disguised himself as a crab to test a king. The epic makes him dreaded and fair: the judge who cannot be bribed because he already owns everything.</p>" },
        { tag: 'Purāṇic Hell', title: 'The Lord of the Narakas', text: "<p class='myth-text'>The Purāṇas enumerate eighty-four hells under Yama’s administration, each a precise torment for a precise sin — the liar’s tongue, the thief’s hands. Yet the same texts insist his justice is karma’s arithmetic, not malice: even the tortures are purification, and release comes in time.</p>" },
      ],
    },
    syncretism: "The Avestan Yima, king of the golden age who kept death from his realm, is Yama’s Iranian twin — the same name, opposite function: where Yima postponed death, Yama administers it. Buddhism made Yama a dharmapāla, converted in the end by the Buddha’s teaching, and carried him east as Enma in Japan, where he still judges with his mirror and staff.",
    culturalLegacy: "Yama is the ancestor of every Asian judge-of-the-dead: Enma-ō in Japan, Yŏmna in Korea, Yanluo in China — a continuous iconography from the Veda to manga. The word ‘Yamī’ survives in the river Yamunā; and the maxim ‘even Yama’s writ runs by karma’ structures the moral imagination of half the world’s population.",
    extendedMeditation: "Yama: the twin’s name, the first word of mortality. Restored plainly, it reads as what it is — a name without ornament for the fact without ornament. Every other god in this lexicon borrows grandeur; Yama IS, which is why his name is the shortest sentence in Sanskrit.",
    sources: [
      { name: 'Rigveda 10.10 (the twin dialogue)' },
      { name: 'Rigveda 10.14 (the path to Yama)' },
      { name: 'Atharvaveda 18 (funerary hymns)' },
      { name: 'Mahābhārata, Anuśāsana & Vana Parvans' },
      { name: 'Purāṇic Yama-cycle (Mārkaṇḍeya, Viṣṇu, Padma)' },
    ],
    archaeology: "No Yama temples in the Vedic sphere — the ancestor-cult needed no image. But his buffalo and noose carved into the doorposts of death-temples across Nepal and Bali, and the Enma iconography of Japanese temples from Kamakura onward, mark the reach of his cult east.",
    cult: "The śrāddha offerings to the dead are his liturgy — every rice-ball given to the fathers feeds his city’s economy. The great annual rites for the dead across Asia (Obon in Japan, Pitṛpakṣa in India) are his festivals without his name.",
    iconography: "Green or black, riding the buffalo, noose in hand, mace or staff in the other; two four-eyed dogs at his feet; in Tibet and Japan, a mirror that shows the soul its deeds and a register that never errs. His third eye — the eye of the judge — opens in the esoteric forms.",
    reception: "Comparative mythology pairs him with Osiris, Hades, and Mictlantecuhtli as the lord of the dead who began as a mortal; his twin-myth is cited in every study of the incest-taboo’s narrative origins. In modern media he is Asia’s Grim Reaper — feared, respected, and occasionally, in the karmic comedies, outwitted.",
  },

  kalki: {
    pronunciation: {
      ipa: '/ˈkɑːlki/',
      ipaLabel: 'Sanskrit (IAST: Kalki)',
      phonemes: [
        { symbol: 'Kāl-', desc: 'Conventionally written Kalki; the name is usually derived from kalikā “white horse” or from Kali, the age he ends.' },
        { symbol: '-ki', desc: 'The tenth avatāra of Vishnu, yet to come — the only future god in the lexicon.' },
      ],
      approximation: '“KAHL-kee”',
      kin: 'Kalkin in some Purāṇic lists · the White Horse of the world’s end',
      note: 'A prophecy made flesh in text: the god who has not yet been born, scheduled for the end of the Kali Yuga.',
    },
    domains: {
      title: 'The Tenth Avatāra, the End of the Kali Yuga',
      subtitle: 'The Rider Who Comes at the World’s End',
      lead: "<p class='lead-text'><strong>Kalki</strong> is Vishnu’s final descent: the warrior on the white horse who will come when the Kali Yuga chokes on its own corruption — sword drawn, comet-marked, born in a village to a Brahmin named Viṣṇuyaśas — to end the age, punish the wicked, and restart the world’s golden wheel. He is the only deity in this pantheon whose myth is a prophecy.</p>",
      cards: [
        { name: 'The White Horse', desc: 'Devadatta, the winged white steed, given by Śiva; Kalki rides from Śambhala at the age’s end.', iconPath: 'M12 42C20 30 36 28 46 34L54 26L52 38C44 46 24 48 12 44ZM26 34L22 22M36 32L34 20M18 46L14 54M40 44L42 54' },
        { name: 'The Sword of the Age', desc: 'Ratnamaru, the jewelled sword, given by the gods — it ends the Kali Yuga as a blade ends a lie.', iconPath: 'M14 54L44 20M44 20L40 22M44 20L42 26M14 54L10 50M14 54L18 56M38 32L50 40M34 36L28 30' },
        { name: 'Born in Śambhala', desc: 'His village, Śambhala, waits hidden; when dharma’s four legs shrink to one, he is born there.', iconPath: 'M16 52H48M20 52V36L32 26L44 36V52M28 52V42H36V52M32 26V16M24 20H40' },
        { name: 'The Restarter of Time', desc: 'After the sword, the restart: Kalki inaugurates the next Kṛta Yuga — death midwifing rebirth.', iconPath: 'M32 8A24 24 0 1 1 32 56A24 24 0 1 1 32 8M32 20V44M20 32H44M24 24L40 40M40 24L24 40' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>The Kalki myth is the Purāṇic eschaton: the prophecies of the Kali Yuga’s decay — merchants as kings, wealth as virtue, fathers feared by sons — are the diagnosis, and Kalki is the cure. He appears in the latest strata of the Mahābhārata and the Purāṇas as the tenth and final avatāra, the one Vishnu keeps in reserve for the world’s last night.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Mahābhārata 3.191', title: 'The Prophecy of the Horse', text: "<p class='myth-text'>The earliest Kalki-passage names the signs: when time decays, a being of immense power will be born to a family of Brahmins, swift as thought, his hand a sword, his steed white as milk, blazing like a comet. The passage is embedded in the epic’s cosmological books as Vishnu’s promise to the tormented earth.</p>" },
        { tag: 'Kalki Purāṇa', title: 'The Full Biography', text: "<p class='myth-text'>The eponymous Purāṇa tells it whole: the child Kalki, mocked by the corrupt, learns the Vedas from Paraśurāma himself, marries the princess Padmāvatī by the sword-contest, and rides out against the mleccha kings. His campaigns purify the world; the wicked fall to his blade and the earth’s burden lifts at last.</p>" },
        { tag: 'Kali Yuga Doctrines', title: 'The Diagnosis of the Age', text: "<p class='myth-text'>The Purāṇic Kali-Yuga lists read like satire: rulers will be thieves, vows will be sold, the low will govern the high. Kalki is the answer to this audit — not a reformer but an ending. The theology is cyclical: he destroys the age as a farmer burns the stubble, so the next golden age can be sown.</p>" },
        { tag: 'Living Traditions', title: 'The Expected One', text: "<p class='myth-text'>Kalki remains expected: in Śambhala-legend — Tibetan Buddhism adopted the hidden kingdom wholesale — and in popular Hinduism, where every generation finds the Kali Yuga’s signs fulfilled. He is the only god in this pantheon whose temple is the future, and whose devotees wait rather than celebrate.</p>" },
      ],
    },
    syncretism: "The Kalki cycle absorbed apocalyptic expectations from every quarter: the White Horse echoes the sun-horse of Indo-Iranian myth; the sword of the age borrows Paraśurāma’s axe; and Śambhala, his hidden kingdom, became the axis of Tibetan Buddhism’s Kalacakra — the wheel of time teachings centred on the king who will come.",
    culturalLegacy: "Kalki is eschatology’s most durable prophetic figure in the living world: films, novels, and comics re-stage his coming endlessly, and ‘waiting for Kalki’ is an idiom for expecting the end of a corrupt order. The Śambhala legend seeded Theosophy’s Shambhala and, through it, a century of Western occult geography.",
    extendedMeditation: "Kalki: a name that is a countdown. Restored plainly, it stands at the lexicon’s far edge — the god who has no past tense. Every other entry in this temple restores what was; this one restores what will be, and the plain letters are appropriate: the last avatāra needs no decoration on his way to end the age.",
    sources: [
      { name: 'Mahābhārata 3.191 (the earliest Kalki prophecy)' },
      { name: 'Kalki Purāṇa (the full biography)' },
      { name: 'Bhaviṣya Purāṇa (the Kali Yuga lists)' },
      { name: 'Kalacakra tradition (Śambhala)' },
    ],
    archaeology: "No ancient Kalki temples — he has not yet been born. But his images ride through South Indian temple friezes of the Dashavatāra, and the Śambhala iconography of Tibetan thangkas gives his myth a monumental afterlife in paint across the Himalayas.",
    cult: "His cult is expectation: the recitation of the Kali-Yuga signs, the keeping of the Dashavatāra sequence with the tenth place left open. In South India, Kalki devotion has produced modern temples — the only god in the lexicon whose shrines post-date his prophecy’s writing.",
    iconography: "A blazing horseman on Devadatta, sword high, often four-armed with bow and discus — Vishnu’s weapons on the rider’s frame. The comet’s tail marks his banner; behind him the armies of the age’s end ride out from Śambhala’s gates.",
    reception: "Comparative eschatology sets Kalki beside the Mahdi, the Maitreya, and the Second Coming as the great expected ones — but unique among them in arriving by prophecy rather than promise. Modern fiction from Gore Vidal’s <em>Kalki</em> to manga has made his name a byword for the terminal avatar.",
  },
};

let added = 0, skipped = 0;
for (const [id, entry] of Object.entries(ENTRIES)) {
  if (lore[id] && Object.keys(lore[id]).length) {
    console.log(`  = ${id}: exists, preserved`);
    skipped++;
    continue;
  }
  lore[id] = entry;
  added++;
  console.log(`  + ${id}`);
}
if (added) {
  fs.writeFileSync(LORE_PATH, JSON.stringify(lore, null, 2) + '\n');
}
console.log(`\nlore-catalog: +${added} entries, ${skipped} preserved, ${Object.keys(lore).length} total`);
