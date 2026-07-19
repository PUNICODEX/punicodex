/**
 * Lore enrichment, batch B — Roman (6) + Egyptian (4) entries.
 * Same conventions as enrich-a.js; merged by apply-enrich.js.
 */

const ICONS = {
  flame: 'M32 8C28 20 20 26 20 38C20 48 25 56 32 56C39 56 44 48 44 38C44 26 36 20 32 8Z',
  wave: 'M8 24C16 16 24 16 32 24C40 32 48 32 56 24M8 40C16 32 24 32 32 40C40 48 48 48 56 40',
  star: 'M32 8L38 26L56 26L41 37L46 55L32 44L18 55L23 37L8 26L26 26Z',
  mountain: 'M8 52L24 20L32 34L40 16L56 52Z',
  sun: 'M32 20A12 12 0 1 0 32 44A12 12 0 1 0 32 20M32 4V12M32 52V60M4 32H12M52 32H60M12 12L18 18M46 46L52 52M52 12L46 18M18 46L12 52',
  serpent: 'M14 46C22 38 42 38 50 46M20 32C28 24 36 24 44 32M27 18H37M32 18V10',
  wing: 'M10 42C18 20 34 12 54 12C50 32 38 46 18 48L10 42ZM20 40C28 32 36 26 44 22',
  column: 'M16 52H48M20 52V20M28 52V20M36 52V20M44 52V20M14 20H50L32 8L14 20Z',
  eye: 'M8 32C16 22 24 18 32 18C40 18 48 22 56 32C48 42 40 46 32 46C24 46 16 42 8 32ZM32 25A7 7 0 1 0 32 39A7 7 0 1 0 32 25Z',
  bolt: 'M36 4L20 36H30L26 60L44 26H34L36 4Z',
  lyre: 'M22 10C18 24 18 36 24 44C28 50 36 50 40 44C46 36 46 24 42 10M22 10H26M38 10H42M28 18V40M36 18V40M26 44H38',
  wheel: 'M32 14A18 18 0 1 0 32 50A18 18 0 1 0 32 14M32 14V50M14 32H50M19 19L45 45M45 19L19 45',
  scale: 'M32 10V54M14 20H50M18 20L12 36H24L18 20ZM46 20L40 36H52L46 20ZM24 54H40',
  ship: 'M12 40H52L44 52H20L12 40ZM32 8V40M32 12C40 18 44 28 44 36M32 12C24 18 20 28 20 36',
  horn: 'M44 8C30 10 18 20 14 34C12 42 16 50 24 52C34 54 44 46 46 36L36 40C30 42 24 38 24 32C24 24 34 14 44 8Z',
  egg: 'M32 8C22 8 14 22 14 36C14 48 22 56 32 56C42 56 50 48 50 36C50 22 42 8 32 8Z',
  hoof: 'M20 8H44V30C44 42 38 52 32 52C26 52 20 42 20 30V8ZM28 44H36M32 8V24',
  horse: 'M18 52L22 34C16 28 16 18 24 12L30 6L34 14C42 16 46 22 46 30L42 52M26 26L36 34',
  mask: 'M20 10H44V30C44 42 38 52 32 52C26 52 20 42 20 30V10ZM25 25H29M35 25H39M27 38C30 36 34 36 37 38',
  wall: 'M10 48H54M14 48V24H26V48M26 36H38V48M38 48V18H50V48M10 24H26M38 18H54',
  die: 'M14 14H50V50H14V14ZM23 23H27M37 23H41M23 41H27M37 41H41M30 30H34',
  thread: 'M12 48C20 40 24 36 32 32C40 28 44 24 52 16M44 8C48 8 52 12 52 16M12 48C12 52 16 56 20 56M28 36L36 44',
  gate: 'M12 52V22C12 14 20 8 32 8C44 8 52 14 52 22V52M24 52V26M40 52V26',
  crescent: 'M42 6C28 8 18 19 18 32C18 45 28 56 42 58C36 52 32 42 32 32C32 22 36 12 42 6Z',
  ankh: 'M32 8A8 8 0 1 0 32 24A8 8 0 1 0 32 8ZM32 24V56M20 34H44',
  jackal: 'M14 50L20 34L16 20L26 26L38 26L50 14L46 28L48 42L38 50H14Z',
  was: 'M28 8L34 14L30 20H34L30 26L32 50M32 50L28 56M32 50L36 56',
  scroll: 'M16 10H44V44C44 50 40 54 34 54H16V10ZM16 10C12 10 10 13 10 17C10 21 12 23 16 23M24 20H40M24 28H40M24 36H36',
  palm: 'M32 52V26M32 26C24 22 18 14 16 6C26 8 32 14 32 26M32 26C40 22 46 14 48 6C38 8 32 14 32 26M32 34C26 32 20 28 16 22M32 34C38 32 44 28 48 22',
  vase: 'M24 8H40M26 8C26 16 20 20 20 28C20 42 26 54 32 54C38 54 44 42 44 28C44 20 38 16 38 8M20 28H44',
  hammer: 'M14 44L36 22M36 22L30 16L44 8L52 16L44 24L36 22ZM20 50L14 44L18 40L24 46L20 50Z',
};

module.exports = {
  // ── Roman ────────────────────────────────────────────────────────────────
  diana: {
    pronunciationNote:
      'Latin Diāna scans with a long i and long final ā; the owned restoration Diāna follows the classical spelling exactly. Roman grammarians connected the name to the shining of the moon (from the same root as Iūpiter\'s Dyēus, "the bright sky"), making her the feminine face of celestial light.',
    domains: {
      title: 'The Huntress of the Groves',
      subtitle: 'Moon, Wild, and the King of the Wood',
      lead: `<p class='lead-text'>Diāna is Rome's own goddess before she is Artemis imported: mistress of the wildwood, the moon, and women in labour, whose strangest institution — the priest-king of Nemi who wins his office by murder — haunted anthropology for a century.</p>`,
      cards: [
        { iconPath: ICONS.crescent, name: 'Trivia', desc: '"Of the three ways" — her title at the crossroads, where moon, hunt, and underworld meet.' },
        { iconPath: ICONS.mountain, name: 'Nemi', desc: 'The lake called "Diana\'s Mirror," sacred grove of the rex Nemorensis — the priest who slew the slayer.' },
        { iconPath: ICONS.column, name: 'The Aventine', desc: 'Her federal temple, founded by Servius Tullius as the common sanctuary of the Latin League.' },
        { iconPath: ICONS.wing, name: 'Actaeon\'s Hounds', desc: 'The hunter who saw her bathing and was run down by his own pack — the wild\'s answer to the gaze.' },
      ],
    },
    symbols: [
      { name: 'The bow', meaning: 'The hunt and the sudden death of women — her arrows strike gently' },
      { name: 'The crescent', meaning: 'The waxing moon she steers as Luna' },
      { name: 'The deer', meaning: 'Her sacred animal; the wild that cannot be owned' },
      { name: 'The oak of Nemi', meaning: 'The grove whose bough — the Golden Bough — only a runaway slave might break' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Roman myth largely retells Artemis' stories under Diāna's name — but her cult institutions are Italy's own, older than the stories, and stranger.</p>`,
      myths: [
        { tag: 'The Bath', title: 'Actaeon', text: `<p class='myth-text'>Ovid tells it as a warning about seeing: the hunter Actaeon, wandering at noon, stumbles on Diāna bathing in a hidden valley. She splashes him with water — "now you may tell that you saw me, if you can" — and he becomes a stag, torn apart by his own hounds who know only the shape of prey, not the voice of their master.</p>` },
        { tag: 'The Grove', title: 'The King of the Wood', text: `<p class='myth-text'>At Nemi, in Diāna's lakeside grove, the priesthood was held by an escaped slave who became rex Nemorensis by plucking a bough from the sacred tree and killing his predecessor in single combat — and who then guarded the tree, sword in hand, against the next challenger. The rite, already archaic in Ovid's day, frames Frazer's entire Golden Bough.</p>` },
        { tag: 'The Refuge', title: 'Hippolytus Reborn', text: `<p class='myth-text'>Roman tradition made Nemi the retirement of a Greek ghost: Virbius, the twice-man — Hippolytos, dragged to death by his horses and raised again by Aesculapius — hidden by Diāna in her grove, where no horse may enter. The goddess shelters the chaste hunter her Greek sister could not save.</p>` },
        { tag: 'The Alliance', title: 'The Aventine Charter', text: `<p class='myth-text'>Servius Tullius founded Diāna's temple on the Aventine as the federal shrine of the Latin cities — the one cult they shared with Rome as equals. A Sabine's marvel of a cow, sacrificed there by a cunning priest, sealed Rome's primacy: Roman historians tell the story as the moment alliance tipped toward empire.</p>` },
      ],
    },
    syncretism: `<p>Her fusion with Artemis was total and early, but Diāna kept Italian features Artemis never had: the slave-priest of Nemi, the Aventine's federal politics, and her patronage of the plebeians (her temple was a traditional asylum). In the Middle Ages she became the witch-goddess: canon law condemned women who claimed to ride at night "with Diana," and Charles Leland's Aradia (1899) rebuilt her as the messiah of witchcraft — the root of modern Wicca's Diana.</p>`,
    culturalLegacy: `<p>She lends her name to the moon in a hundred poems and to Diana's Mirror at Nemi, where Caligula's pleasure barges — raised in 1929–32, burned in 1944 — gave underwater archaeology its founding drama. Frazer's Golden Bough, the book that created comparative religion as a public genre, begins and ends in her grove. The goddess of the wild remains the emblem of every conservation that is also a hunt.</p>`,
    archaeology: `The sanctuary at Nemi — Diana Nemorensis — preserves its theatre, temple platforms, and the famous votive anatomicals (terracotta wombs and limbs) of her healing cult; the lake itself, a volcanic crater, justified "speculum Dianae." On the Aventine, the federal temple's foundations underlie the modern street. The Nemi ships' remains — bronze heads of wolves and lions, the "Nemi wheels," and lead water pipes stamped CAESARIS — are divided between the Museo delle Navi Romane (partially reconstructed after the fire) and Berlin.`,
    extendedMeditation: `<p>Diāna is the wild that insists on a temple. Her priest wins office by violence in her most peaceful grove; her deer are protected by being hunted only by her. She asks the oldest question of stewardship: whether anything can be preserved without being owned — and answers with a lake that reflects the moon without holding it.</p>`,
    sources: [{ name: 'Ovid' }, { name: 'Lewis & Short' }, { name: 'Varro' }, { name: 'Horace' }, { name: 'Cicero' }, { name: 'Cambridge' }],
  },

  ianus: {
    pronunciationNote:
      'Latin Iānus scans with a long i and long ā; Varro connected the name to ire, "to go," and Cicero to ianua, "door" — both folk etymologies of a genuinely old Italic god. The circumflex-less Roman name keeps its macrons in the restoration Iānus, the form dictionaries print.',
    domains: {
      title: 'The God of the Door',
      subtitle: 'Beginnings, Gates, and the Two Faces',
      lead: `<p class='lead-text'>Iānus has no Greek equivalent and no mythology of adventure: he is Rome's god of passages themselves — doors, bridges, beginnings, the month that opens the year. His two faces look both ways because every threshold faces two worlds.</p>`,
      cards: [
        { iconPath: ICONS.gate, name: 'The Gates of War', desc: 'The Ianus Geminus, open while Rome fought, closed in peace — shut only a handful of times in seven centuries.' },
        { iconPath: ICONS.mask, name: 'Bifrons', desc: 'The two-faced one: past and future, entrance and exit, watched simultaneously.' },
        { iconPath: ICONS.star, name: 'January', desc: 'Iānuārius — his month still opens the civil year of half the world.' },
        { iconPath: ICONS.scale, name: 'The As', desc: 'His double face stamped the earliest Roman bronze coinage, with the prow of a ship on the reverse.' },
      ],
    },
    symbols: [
      { name: 'The key', meaning: 'The opener and shutter — claviger, the key-bearer' },
      { name: 'The staff', meaning: 'The doorkeeper\'s rod of admission' },
      { name: 'The double face', meaning: 'Simultaneous sight of before and after' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Ovid's Fasti gives him the one great scene: the poet asks the two-faced god why he looks both ways, and Iānus answers for himself — the only extended self-explanation any Roman god gets in verse.</p>`,
      myths: [
        { tag: 'The Interview', title: 'Fasti 1', text: `<p class='myth-text'>Ovid asks Iānus why, alone among gods, he sees both behind and before. The god replies: whatever you see — sky, sea, earth — all things are closed and opened by my hand; I preside over the gates of heaven with the gentle Seasons; I am called Chaos, for I was the ancient confusion out of which order came. Then he teaches the poet why the year begins in winter: the door of the year opens with the sun's rebirth.</p>` },
        { tag: 'The War Gates', title: 'Ianus Geminus', text: `<p class='myth-text'>Numa, the peace-king, founded the rite: the gates of the Ianus in the Forum stand open while Rome is at war, closed in peace. Livy admits they were closed only twice before Augustus — who boasted of closing them three times — and Nero closed them again after the Armenian settlement. An open temple as the norm: Rome's two faces were usually turned outward, toward war.</p>` },
        { tag: 'The Nymph', title: 'Carna and the Hawthorn', text: `<p class='myth-text'>Ovid also tells how Iānus wooed the nymph Carna, goddess of hinges, who tricked her suitors into a cave and fled — until the two-faced god, who cannot be crept up on, saw her behind him. Their union gave her power over doorways and the beans-and-bacon rites of June 1: Rome's folklore of thresholds, domestic and divine at once.</p>` },
      ],
    },
    syncretism: `<p>The Etruscans knew a two-faced gate-spirit (Culsans, paired with the one-faced Culsu), and Iānus absorbed that numinous door-power early. Having no Greek twin, he puzzled the mythographers: some aligned him with the sky, some with Chaos itself — Ovid reports both. Modern physics borrowed him for "Janus particles" (two-faced colloids), and psychology for "Janus-faced" ambivalence: the god of two ways of seeing became the name for the condition itself.</p>`,
    culturalLegacy: `<p>January keeps his name on every calendar; the janitor keeps his keys in every school; "Janus-faced" remains the standard charge in diplomacy and the standard diagnosis in literature. Historians read the rarity of his closed gates as Rome's autobiography: a republic that could count its years of peace on one hand, and a god whose open temple was the weather of empire.</p>`,
    archaeology: `The Ianus Geminus stood in the Forum near the Curia; its bronze gates survived into late antiquity (Procopius describes them), though the structure's exact footprint is debated. His most durable monument is numismatic: the heavy cast bronze aes grave of the 3rd century BCE bears the double-faced head — one of the earliest portrait-types of Roman coinage — and the denarius tradition continued it. A small shrine of Ianus on the Janiculum, the hill that probably bears his name, tied the god to Rome's western gate.`,
    extendedMeditation: `<p>Iānus is the god of the door you are standing in. Every beginning contains its end; every entrance is also an exit watched from the other side. He does not judge the passage — he is the passage. To honour him is to pause at thresholds: to look back once, look forward once, and only then walk through.</p>`,
    sources: [{ name: 'Ovid' }, { name: 'Lewis & Short' }, { name: 'Varro' }, { name: 'Cicero' }, { name: 'Macrobius' }, { name: 'Cambridge' }],
  },

  iuno: {
    pronunciationNote:
      'Latin Iūnō carries two long vowels, and both are preserved in the restoration; the macrons follow Lewis & Short. Her name shares the deep root of iuvenis, "young" — the goddess of the vital force in its prime — which is why her festival, the Kalends, belonged to women at the height of their powers.',
    domains: {
      title: 'The Queen of Heaven',
      subtitle: 'Marriage, the Mint, and the Watching Geese',
      lead: `<p class='lead-text'>Iūnō is not "Hēra with a Latin accent" but a sovereign in her own right: protector of women in every life-stage, keeper of the state's financial memory on the Capitoline, and the one goddess Rome's enemies learned to fear as the will behind the legions.</p>`,
      cards: [
        { iconPath: ICONS.crescent, name: 'Lucina', desc: 'Iūnō Lucina, "she who brings to light" — the goddess women call in childbirth.' },
        { iconPath: ICONS.scale, name: 'Moneta', desc: '"The Warner" — her Capitoline title; Rome\'s mint stood in her temple, giving the world the word "money."' },
        { iconPath: ICONS.wing, name: 'The Geese', desc: 'Her sacred geese that woke the Capitol in 390 BCE when the Gauls climbed by night.' },
        { iconPath: ICONS.mask, name: 'Regina', desc: 'The Queen — third of the Capitoline triad with Iūpiter and Minerva, enthroned on the city\'s heart-hill.' },
      ],
    },
    symbols: [
      { name: 'The peacock', meaning: 'Her Argive bird — the hundred eyes of Árgos set in its tail' },
      { name: 'The diadem', meaning: 'Sovereignty; she rules by right, not by marriage alone' },
      { name: 'The goose', meaning: 'Vigilance — the alarm the dogs slept through' },
      { name: 'The lily', meaning: 'In later art, the flower of her maternity' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Roman Iūnō inherits Hēra's jealousy plots but outgrows them: in Rome she is less the wronged wife than the state's queen — a power that must be ritually persuaded, city by city, to change sides.</p>`,
      myths: [
        { tag: 'The War', title: 'Tantaene Irae', text: `<p class='myth-text'>The Aeneid's engine is her anger: Virgil asks whether heavenly minds can hold such wrath, and answers with seven books of her persecution of Aeneas — the storm off Carthage, the madness of the Italian women, the marriage of Lavinia delayed to blood. When she finally yields, she extracts a condition: the Trojan name shall perish, and only Roman remain. She loses the war and wins the peace.</p>` },
        { tag: 'The Evocatio', title: 'The Goddess Who Changed Sides', text: `<p class='myth-text'>Before Rome stormed Veii in 396 BCE, the general Camillus performed the evocatio — formally calling the enemy city's Iūnō Regina to abandon Veii for a finer temple in Rome. The Veientine statue, Livy says, nodded assent. Rome conquered Italy partly by inviting its goddesses to defect: Iūnō's transferability made her the instrument of empire's softest power.</p>` },
        { tag: 'The Warning', title: 'The Geese of the Capitol', text: `<p class='myth-text'>When the Gauls scaled the Capitoline cliff by night in 390 BCE, the watchdogs slept — but Iūnō's sacred geese heard them and raised such a clamour that Marcus Manlius woke and threw the first Gaul back down. Rome remembered: dogs were thereafter crucified annually, geese honoured — and Iūnō received the title Moneta, the Warner, beside whose temple the mint later stood.</p>` },
        { tag: 'The Festival', title: 'Matronalia', text: `<p class='myth-text'>On March 1, the old New Year, Roman matrons kept Iūnō Lucina's feast: husbands prayed for wives, slaves were feasted by mistresses, and the temple on the Esquiline — vowed after a plague of stillbirths — received the processions of flowering branches. It was Rome's Mother's Day and its recognition of women's collective religious power.</p>` },
      ],
    },
    syncretism: `<p>Her Etruscan form Uni was Rome's first loan: the Capitoline triad itself (Iūpiter, Iūnō, Minerva) is the Etruscan Tinia-Uni-Ménrva. Through evocatio she accumulated the identities of every conquered city's queen — Iūnō Caelestis of Carthage was worshipped in Rome after Carthage burned — and her African form survived into Augustine's polemics. In the Greek East she was simply Hēra again: the empire made her portable in both directions.</p>`,
    culturalLegacy: `<p>Her titles became common nouns: "money" and "monetary" descend from the mint in Moneta's temple; June (Iūnius) bears her name on every calendar; "junoesque" still describes stately beauty. The evocatio — winning by inviting the other side's gods to defect — remains the strangest instrument in the history of religious warfare, and scholars cite it in every discussion of Roman imperialism's flexibility.</p>`,
    archaeology: `The temple of Iūnō Moneta stood on the Arx of the Capitol (349 BCE), where the church of Santa Maria in Aracoeli now rises; the mint's location beside it is the accepted explanation of her name's fortune. Veii's Portonaccio temple — the probable home of the defected Regina — preserves its Etruscan terracottas in the Villa Giulia. Inscribed curses and votives from her Italic sanctuaries (especially at Lanuvium, with its famous serpent cult) document her continuous worship from Latium's earliest towns.`,
    extendedMeditation: `<p>Iūnō is the power that must be persuaded, never merely defeated. Rome's deepest political insight is carved into her story: that legitimacy — of marriage, of money, of the state — is not seized but transferred, and only by consent. Her geese still wake at night in every institution that survives by vigilance rather than force.</p>`,
    sources: [{ name: 'Lewis & Short' }, { name: 'Ovid' }, { name: 'Varro' }, { name: 'Cicero' }, { name: 'Macrobius' }, { name: 'Cambridge' }],
  },

  iuppiter: {
    pronunciationNote:
      'Iūppiter compounds the vocative of the sky-father\'s ancient name — Dyēu-pəter, "O Father Sky" — the same formula that gives Greek Zeús and Vedic Dyaus-pitā. The doubled pp is the standard classical spelling; both macrons are certain, and the name is Latin\'s oldest continuous theonym.',
    domains: {
      title: 'The Sky Father',
      subtitle: 'Oaths, Triumphs, and the Capitol',
      lead: `<p class='lead-text'>Iūppiter is the god in whose name Rome swore: Optimus Maximus, "best and greatest," the witness of every treaty, the dedicatee of every victory, and the direct linguistic heir of the Indo-European sky father — the oldest divine name the West still speaks.</p>`,
      cards: [
        { iconPath: ICONS.bolt, name: 'The Thunderbolt', desc: 'His weapon and signature — the bolt that marks where sovereignty lands.' },
        { iconPath: ICONS.column, name: 'The Capitol', desc: 'His great temple, dedicated in 509 BCE — the year of the Republic\'s own beginning.' },
        { iconPath: ICONS.wing, name: 'The Eagle', desc: 'The bird at the head of every legion; to lose its standard was Rome\'s deepest shame.' },
        { iconPath: ICONS.mask, name: 'The Triumph', desc: 'The general robed as the god for one day — and the slave whispering mortality in his ear.' },
      ],
    },
    symbols: [
      { name: 'The thunderbolt', meaning: 'The sky\'s verdict; sovereignty as sudden light' },
      { name: 'The eagle', meaning: 'The highest flier, the king of birds for the king of gods' },
      { name: 'The oak', meaning: 'The tree of Dodona and of the civic crown — strength that shelters' },
      { name: 'The flint', meaning: 'Iuppiter Lapis, the stone by which oaths were sworn' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Roman myth made Zeús' biography his own, but Iūppiter's truest stories are Roman institutions: the oath, the triumph, the dedication of spoils — religion as constitutional machinery.</p>`,
      myths: [
        { tag: 'The Oath', title: 'Iovem Lapidem', text: `<p class='myth-text'>The most binding Roman oath was sworn per Iovem Lapidem — by Jupiter the Stone — while holding a flint from his altar and reciting the formula of the fetial priests: "If I deceive, may Iuppiter strike me as I strike this pig." Law, treaty, and contract all rested on his witness; the stone was his body in the courtroom of nations.</p>` },
        { tag: 'The Triumph', title: 'The Borrowed Face', text: `<p class='myth-text'>In the triumph, the victorious general rode in Iūppiter's own regalia — purple and gold, face painted red like the god's terracotta statue — while a slave held the crown and whispered "memento mori." Rome let its greatest man borrow the god's face for one day, and made the god remind him to give it back: sovereignty rehearsed and returned.</p>` },
        { tag: 'The Spoils', title: 'Opima Spolia', text: `<p class='myth-text'>The rarest honour in Rome belonged to Iūppiter Feretrius: the spolia opima, "rich spoils," taken when a Roman commander slew the enemy king in single combat — won by Romulus, by Cossus, and by Marcellus at Clastidium (222 BCE), and never again. Augustus blocked the fourth claimant on a technicality: some honours were too royal for an emperor's subjects.</p>` },
        { tag: 'The Eagle', title: 'The Standard', text: `<p class='myth-text'>Every legion carried his aquila into battle, and its loss was the deepest disgrace Rome knew — the eagles of Varus' three legions, lost in the Teutoburg Forest, were recovered a generation later by Germanicus' campaigns and treated as returning citizens. The sky father marched, in bronze, at the head of the army that built the Mediterranean's order.</p>` },
      ],
    },
    syncretism: `<p>Everywhere Rome went, Iūppiter wore local faces: Zeús in the East, Ammon in Egypt (Alexander's "father"), Dolichenus in the Syrian legionary cult — a storm god in iron scale-armour worshipped by soldiers from Britain to the Danube — and the Celtic wheel-god Taranis on Jupiter-columns of the Rhineland. His very name is the syncretism that precedes all others: Zeús, Dyaus, Tiwaz, and Iūppiter are one father spoken in four dialects.</p>`,
    culturalLegacy: `<p>"By Jove" keeps the oath in English; "jovial" preserves his planetary temperament; Thursday (dies Iovis, jeudi, giovedì) is his weekday across Romance Europe. Astronomy gave him the largest planet — fittingly, since Galileo's discovery of Jupiter's moons cracked the geocentric cosmos. Every invocation of supreme authority in the Western tradition is, etymologically, still addressed to the father sky.</p>`,
    archaeology: `The Capitoline temple of Iuppiter Optimus Maximus — dedicated 509 BCE, burned and rebuilt repeatedly — is documented by its massive podium under the Palazzo Caffarelli and by Pliny's and Dionysius' descriptions of its triple cella. The Jupiter-columns of the German provinces (reconstructed at Mainz, Stuttgart, and Hausen) show him riding down the giants. His oak of Dodona belongs to his Greek brother, but the flint-knives of the fetial oath and the aquilae standards of the legions fill the museums of two continents.`,
    extendedMeditation: `<p>Iūppiter is the god of the spoken bond. Lightning, empire, and law are one idea in his name: that the highest power is the one by which promises are kept. Every signature, every oath of office, every treaty since has borrowed his architecture — the sky as witness, the word as bond, the bolt as the penalty for perjury of the soul.</p>`,
    sources: [{ name: 'Lewis & Short' }, { name: 'Varro' }, { name: 'Cicero' }, { name: 'Ennius' }, { name: 'Macrobius' }, { name: 'Pokorny' }, { name: 'Cambridge' }],
  },

  neptunus: {
    pronunciationNote:
      'The etymology of Neptūnus is genuinely uncertain: the Etruscan sea god Nethuns stands behind him, and linguists have proposed a pre-Indo-European Mediterranean origin, with Pokorny suggesting a root for "damp, wet." The long ū of the second syllable is the secure classical quantity — the macron marks it in the restoration.',
    domains: {
      title: 'The Lord of Waters',
      subtitle: 'Sea, Horses, Earthquakes, and the Drought Festival',
      lead: `<p class='lead-text'>Neptūnus was god of fresh water before he was god of the sea: his oldest festival, the Neptunalia, falls in the parching days of late July, when Romans built huts of branches and prayed the waters not to fail. The Greek sea came later, and with it Poseidṓn's whole mythology.</p>`,
      cards: [
        { iconPath: ICONS.wave, name: 'The Trident', desc: 'The three-pronged fisher\'s spear that became the sceptre of the sea — and of a planet.' },
        { iconPath: ICONS.horse, name: 'Neptunus Equester', desc: 'His Roman title as horse-lord: the consus-cult of underground granaries and racing.' },
        { iconPath: ICONS.mountain, name: 'The Earth-Shaker', desc: 'Ennosigaios in Greek, but Rome knew him too — the power that moves the ground the city stands on.' },
        { iconPath: ICONS.sun, name: 'Neptunalia', desc: 'July 23: arbours of woven branches, water rites at the height of the drought.' },
      ],
    },
    symbols: [
      { name: 'The trident', meaning: 'The fisher\'s tool exalted to kingship of three water-realms' },
      { name: 'The horse', meaning: 'His second domain — waves and stallions share one crest' },
      { name: 'The dolphin', meaning: 'His messenger and the sailor\'s friend' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Rome gave Neptūnus few native myths — his biography is Poseidṓn's translated — but the festival and the horse-cult are Italy's own, older than the sea-borrowing.</p>`,
      myths: [
        { tag: 'The Drought', title: 'The Huts of Branches', text: `<p class='myth-text'>The Neptunalia of July 23 is Rome's oldest water rite: families built umbrae — huts woven of leafy branches — and poured water offerings at the height of summer's drought. The god's first realm was the spring and the stream, the waters that keep a farm alive; the Mediterranean, with its trade and war, was the empire's later gift to him.</p>` },
        { tag: 'The Horse', title: 'Lord of the Race', text: `<p class='myth-text'>As Neptunus Equester he shared the underground altar of Consus, god of stored grain, at whose games — the Consualia — horses and mules were garlanded and rested from labour. It was at one such festival that Romulus staged the seizure of the Sabine women: Rome's foundation story begins at Neptūnus' racetrack, with the horses watching.</p>` },
        { tag: 'The Contest', title: 'Minerva and the City', text: `<p class='myth-text'>Roman retellings kept the Greek contest for Athens: Neptūnus struck the Acropolis with his trident and brought forth the salt spring — or the first horse — but Minerva's olive won the city's name. The myth explained, for Roman readers, why wisdom outranks force: a civic lesson the conquerors of the Mediterranean repeated against themselves.</p>` },
        { tag: 'The Plea', title: 'Agrippa at Naulochus', text: `<p class='myth-text'>When Agrippa destroyed Sextus Pompeius' fleet at Naulochus in 36 BCE, the victory was dedicated to Neptune — and the poet Horace marked the sea-god's favour to the Julian cause. Roman sea-power, relatively late in coming, made the borrowed god genuinely Roman: by the empire, Neptūnus had sailors' cults from Ostia to the British coast.</p>` },
      ],
    },
    syncretism: `<p>His equation with Poseidṓn is one of the oldest certain interpretatio Romana; his Etruscan substrate Nethuns appears on the Piacenza liver, the bronze model used to read omens. In the provinces he fused with local water powers — the Celtic river gods of Gaul and the Germanic North Sea powers — and his name became the standard gloss for "whatever god rules deep water here."</p>`,
    culturalLegacy: `<p>The planet Neptune — discovered by mathematics before telescopes (Adams and Le Verrier, 1846) — carries his name and trident symbol into every classroom. "Neptune's realm" is still navy slang for the open sea; the Order of Neptune initiates sailors crossing the equator; and the trident survives from Ukrainian heraldry to Maserati's badge. Every western image of the sea as a person is his portrait.</p>`,
    archaeology: `The Piacenza liver (3rd–2nd century BCE) inscribes Nethuns on the liver's sea-zone — the Etruscan original caught in bronze. His Roman temple stood by the Circus Flaminius; the great marine-thiasos mosaics of North Africa and Ostia show the imperial image: the god in his hippocamp chariot. In Britain, the curse tablets of Bath and the altar of the Classis Britannica at Boulogne record sailors' vows to Neptune across the empire's wet edge.`,
    extendedMeditation: `<p>Neptūnus began as the water that must be prayed for and became the water that must be crossed. He holds both truths: the sea that feeds and the sea that swallows, the spring in the drought and the earthquake under the harbour. To sail, to drill a well, to trust the ground — each is a small treaty with him.</p>`,
    sources: [{ name: 'Lewis & Short' }, { name: 'Varro' }, { name: 'Horace' }, { name: 'Cicero' }, { name: 'Pokorny' }, { name: 'Cambridge' }],
  },

  vulcanus: {
    pronunciationNote:
      'Latin Vulcānus — also Volcānus in inscriptions — scans with a long ā; its origin is pre-Roman and possibly Cretan (Wchanos has been proposed), making him one of the oldest names in the Roman pantheon. The macron marks the quantity on which the classical poets agree.',
    domains: {
      title: 'The Fire that Serves',
      subtitle: 'Forge, Volcano, and the Bonfire of Aversion',
      lead: `<p class='lead-text'>Vulcānus is Rome's ambivalent fire: the destructive flame that must be kept outside the walls and the tamed forge-fire that arms the state. His festival burns fish alive in midsummer — not for food, but to buy the city's safety from the god who burns cities.</p>`,
      cards: [
        { iconPath: ICONS.hammer, name: 'Mulciber', desc: '"The Softener" — his title as the smith who coaxes iron, taming fire into craft.' },
        { iconPath: ICONS.flame, name: 'Volcanalia', desc: 'August 23: live fish thrown into bonfires, a substitute-offering against the fire\'s hunger for the city.' },
        { iconPath: ICONS.mountain, name: 'The Volcanal', desc: 'His open-air altar in the Forum — above the Lapis Niger, at the city\'s oldest sacred ground.' },
        { iconPath: ICONS.wave, name: 'The Aeolian Forges', desc: 'The island Vulcano, where his hammerings were heard beneath the smoking mountain.' },
      ],
    },
    symbols: [
      { name: 'The hammer', meaning: 'Force made precise — the smith\'s answer to the flame' },
      { name: 'The tongs', meaning: 'The hand\'s extension into fire; technology as safe distance' },
      { name: 'The bonfire', meaning: 'Fire acknowledged and bargained with' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Roman myth borrowed Hēphaistos' stories for him, but his cult is older and darker than the smith of Olympos: Vulcānus is first the fire that must be averted.</p>`,
      myths: [
        { tag: 'The Substitute', title: 'The Fish Fires', text: `<p class='myth-text'>At the Volcanalia, the hottest and driest month, Romans threw live fish from the Tiber into bonfires at the Volcanal. The calendars explain the rite as substitution: souls of water given to fire, so that fire takes the offering instead of the granaries. It is propitiation, not celebration — Rome's insurance premium paid in flame.</p>` },
        { tag: 'The Net', title: 'Venus and Mars', text: `<p class='myth-text'>Ovid retells the Odyssey's finest comedy: Vulcānus, tipped off by the Sun, forges a net finer than a spider's thread and catches his wife Venus in bed with Mars. The gods gather to laugh — and the myth carries its Roman moral: craft exposes what force cannot guard. The cuckolded smith is also the only god who ever shamed war itself.</p>` },
        { tag: 'The Throne', title: 'The Binding Chair', text: `<p class='myth-text'>The Roman version of the Hēphaistos cycle kept the revenge on Iūnō: Vulcānus sent his mother a golden throne that bound her fast when she sat — payment for being thrown from heaven at birth — and only wine, brought by Bacchus, persuaded the limping god to come loose her. Even the queen of heaven learns that the forge holds the stronger magic.</p>` },
        { tag: 'The Arming', title: 'Aeneas\' Shield', text: `<p class='myth-text'>The Aeneid gives him his noblest commission: at Venus' plea, Vulcānus forges the arms of Aeneas, and on the shield he works the future of Rome — Actium, the triumphs, the unborn empire — "the fame and fate of his descendants." The smith-god is thus the secret author of Roman destiny: history itself as forge-work.</p>` },
      ],
    },
    syncretism: `<p>His equation with Hēphaistos is complete in art, but Rome insisted on the difference: Vulcānus is fire as danger, kept at arm's length — his oldest shrine outside the pomerium, his temple on the Campus Martius. Through Vulcano island his name fused with every smoking mountain; through the Aeolian forges he merged with the Cyclopes. The word "volcano" is his inheritance, which no other god can claim: a deity's name become a category of the planet.</p>`,
    culturalLegacy: `<p>Vulcanization — Goodyear's process for rubber — borrowed his name for fire's mastery of matter; volcanoes, volcanology, and a Star Trek homeworld followed. In Rome he gave his title Mulciber to every poet's image of gentle strength. The deeper legacy is conceptual: he embodies technology's eternal contract — the same fire that forges the shield burns the city — and every safety code is his Volcanalia continued by other means.</p>`,
    archaeology: `The Volcanal in the Forum — an open precinct above the Lapis Niger, with the archaic dedication of a Senate's honorific to the god — anchors his cult in Rome's oldest ground. Vulcano in the Aeolian islands preserves the fumarole fields the ancients called his workshops, and the islands' obsidian industry fed Neolithic trade millennia before the myths. Pompeii's forges, with their anvils and half-finished work, show his everyday cult of the artisans who kept his festival as their own holiday.`,
    extendedMeditation: `<p>Vulcānus is the god of the firewall. He teaches that the power worth having is the power kept at the right distance: fire in the forge, not the bedroom; strength in the net, not the fist. Every craftsperson who has burned a hand learning the distance knows his liturgy — and every city that survives the summer pays his quiet premium.</p>`,
    sources: [{ name: 'Lewis & Short' }, { name: 'Ovid' }, { name: 'Varro' }, { name: 'Cicero' }, { name: 'Pliny' }, { name: 'Cambridge' }],
  },

  // ── Egyptian ─────────────────────────────────────────────────────────────
  anubis: {
    pronunciationNote:
      'Egyptian ꜣnpw is conventionally vocalized "Anupu" or "Anup"; the Greek rendering Anoubis gives English "Anubis." The initial ꜣ (aleph, Gardiner G1) is a glottal consonant Egyptology once ignored and now transcribes — the restoration ꜣnpw keeps the ancient consonantal skeleton exactly as the hieroglyphs write it.',
    originalScriptNote: `<p>The name is written ꜣ-n-p-w with the recumbent jackal (Gardiner E16) as determinative, over the hotep offering sign in the fuller orthographies. The Greeks heard it as Anoubis; Coptic preserved it as Anoup. The jackal is not decorative: it is the god himself, present in his own spelling.</p>`,
    domains: {
      title: 'The Jackal of the Necropolis',
      subtitle: 'Embalming, the Scales, and the Guiding of Souls',
      lead: `<p class='lead-text'>ꜣnpw is the oldest funeral god of Egypt: lord of the necropolis before Osiris ever ruled it, master of embalming, and the steady hand at the scales where every human heart is weighed against a feather. His black jackal watches from the edge of the desert where the dead were always buried.</p>`,
      cards: [
        { iconPath: ICONS.jackal, name: 'The Jackal', desc: 'The desert canid seen at the graves\' edge — feared for what it digs, honoured as the grave\'s defender.' },
        { iconPath: ICONS.scale, name: 'The Weighing', desc: 'He steadies the scales in the Hall of Two Truths: heart against Maat\'s feather, exact to the grain.' },
        { iconPath: ICONS.ankh, name: 'The Embalmer', desc: 'He wrapped Osiris himself — the first mummy — and every priestly embalmer wore his mask.' },
        { iconPath: ICONS.star, name: 'The Psychopomp', desc: '"Foremost of the Westerners" — guide of souls through the night roads of the dead.' },
      ],
    },
    symbols: [
      { name: 'The black jackal', meaning: 'Black as the fertile Nile silt and the embalmed flesh — the colour of rebirth, not evil' },
      { name: 'The flail', meaning: 'His authority over the necropolis as its shepherd' },
      { name: 'The scales', meaning: 'Judgment made precise — his unwavering hand at the beam' },
      { name: 'The imiut fetish', meaning: 'The headless skin on a pole — the embalmer\'s ancient emblem, older than his myths' },
    ],
    mythology: {
      lead: `<p class='lead-text'>In the earliest religion ꜣnpw simply is the god of the dead; when the Osiris cycle rose, he was written into it — as embalmer, son, and guide — without ever losing his seniority at the grave.</p>`,
      myths: [
        { tag: 'The Wrapping', title: 'The First Embalming', text: `<p class='myth-text'>When Set dismembered Osiris and Isis gathered the pieces, it was ꜣnpw who washed, anointed, and wrapped the god's body — the first mummy, the prototype of every burial thereafter. Egyptian priests performed the rite wearing his jackal mask, and the liturgy addresses the dead as "Osiris," while the hands doing the work are Anubis' own.</p>` },
        { tag: 'The Judgment', title: 'The Feather of Maat', text: `<p class='myth-text'>The Book of the Dead's spell 125 fixes his most famous office: in the Hall of the Two Truths, ꜣnpw leads the deceased before the scales, steadies the beam as the heart is weighed against Maat's feather of truth, and announces the reading to Thoth, who records it. A heart heavy with lies is thrown to Ammit, the devourer — his is the hand that lets that happen, or prevents it.</p>` },
        { tag: 'The Lineage', title: 'Son of Nephthys', text: `<p class='myth-text'>Later tradition (Plutarch's On Isis and the Egyptian sources behind it) makes him the son of Osiris and Nephthys, exposed and raised by Isis — a hidden child of the very murder he would spend eternity repairing. Earlier texts give him humbler parentage, sometimes the cow-goddess Hesat: theologies changed, but his place at the grave never did.</p>` },
        { tag: 'The Guide', title: 'Opener of the Ways', text: `<p class='myth-text'>His title Wp-w3wt — Wepwawet's title too, "Opener of the Ways" — marks his oldest function: the pathfinder through the Duat. On coffins and tomb walls he leans over the bier, one hand on the wrapped body, not as a threat but as the ferryman: no soul reaches the Field of Reeds without his escort through the dark.</p>` },
      ],
    },
    syncretism: `<p>The Greeks, finding a god who guides souls, fused him with Hermês: Hermanubis had temples of his own in Alexandria and Rome, jackal-headed with the kerykeion in hand. Isis' Roman mysteries kept him as mystagogue — Apuleius describes his black-and-gold mask in the Isiac procession at Cenchreae. Early Coptic tradition quietly absorbed him into the psychopomp figure of the archangel Michael, weigher of souls.</p>`,
    culturalLegacy: `<p>He is, for most of the world, the face of ancient Egypt: Tutankhamun's black jackal shrine — the recumbent Anubis atop his portable chest — is among the most reproduced objects on earth. Mummification cinema, from Karloff to modern franchises, works his territory; and every modern scale-icon of justice unconsciously borrows the pose of his beam. Egyptologists note the supreme irony: feared as a horror-movie monster, he was antiquity's most trusted guardian.</p>`,
    archaeology: `Tutankhamun's tomb (KV62) yielded the Anubis shrine: a life-size black wooden jackal, gilded ears and collar, guarding the canopic equipment — now in Cairo. The Anubeion at Saqqara, excavated over decades, preserves catacombs of mummified dogs and jackals offered to him — estimates run to millions of animals across Egypt's canine catacombs. Vignettes of spell 125, with his hand on the scales, survive in hundreds of Books of the Dead, from the papyrus of Ani in the British Museum to the papyrus of Hunefer.`,
    extendedMeditation: `<p>ꜣnpw is the god of careful hands. At the two moments a person is most helpless — the body's unmaking and the heart's examination — he is the one who touches gently and reads honestly. Civilizations are judged, the Egyptians believed, by how they treat the dead; he is the god of that judgment, in both senses.</p>`,
    sources: [{ name: 'Faulkner' }, { name: 'Te Velde' }, { name: 'Gardiner' }, { name: 'Allen, Middle Egyptian' }, { name: 'Bonneau' }, { name: 'Egyptology' }],
  },

  steh: {
    pronunciationNote:
      'The consonantal skeleton stḫ (also stš) is conventionally vocalized "Setekh" or "Setesh"; the Greek Seth and Coptic Sēt preserve the shell. The underdotted ḥ is the voiceless pharyngeal fricative — the restoration keeps the Egyptological transliteration rather than the familiar but softened "Seth."',
    originalScriptNote: `<p>Written s-t-ḫ with the seated Set-animal (Gardiner E20/E21) as determinative — the enigmatic "sha" beast with its squared ears and forked tail, a creature that has never been securely identified with any living species. In later, demonized periods the animal is often erased or replaced by the seated-god determinative: damnatio memoriae in the spelling itself.</p>`,
    domains: {
      title: 'The Necessary Storm',
      subtitle: 'Chaos, Strength, the Desert, and the Spear Against Apophis',
      lead: `<p class='lead-text'>stḫ is the god Egypt could neither worship comfortably nor live without: lord of the red desert, the storm, and the foreign lands — the murderer of Osiris, and also the only god strong enough to stand at the prow of Ra's barque and spear the serpent of chaos, night after night.</p>`,
      cards: [
        { iconPath: ICONS.was, name: 'The Was-Sceptre', desc: 'The forked staff of power, headed with his animal — the sceptre every god carries carries his face.' },
        { iconPath: ICONS.bolt, name: 'The Storm', desc: 'Thunder, desert wind, and the red land\'s violence — Egypt\'s weather of war.' },
        { iconPath: ICONS.serpent, name: 'Slayer of Apophis', desc: 'Each night in the Duat he spears the chaos-serpent from the barque\'s prow — order\'s strongest arm.' },
        { iconPath: ICONS.mask, name: 'The Sha', desc: 'His unidentified animal: part greyhound, part aardvark, part donkey — a creature as unclassifiable as the god.' },
      ],
    },
    symbols: [
      { name: 'The Set animal', meaning: 'The unidentifiable beast — ambiguity made heraldry' },
      { name: 'The red crown\'s opposite', meaning: 'Lord of the red desert, against Horus of the black land' },
      { name: 'The iron', meaning: '"The iron of Set" — the Egyptians\' name for meteoric metal and hardness' },
    ],
    mythology: {
      lead: `<p class='lead-text'>No Egyptian god has a stranger career: royal patron of the Second Dynasty, villain of the Osiris cycle, defender of the sun, and finally — in the Greco-Roman dusk — demonized as Typhon. stḫ is all of them at once, and the texts refuse to choose.</p>`,
      myths: [
        { tag: 'The Murder', title: 'The Dismemberment', text: `<p class='myth-text'>The centre of his infamy: stḫ kills his brother Osiris — by trickery in the chest episode Plutarch records, by violence in the Egyptian litanies — scatters the body through Egypt, and claims the throne. Isis and Nephthys gather the pieces; ꜣnpw wraps them; and the god of chaos becomes, unwillingly, the reason the world has resurrection.</p>` },
        { tag: 'The Contest', title: 'Eighty Years Against Horus', text: `<p class='myth-text'>The Contendings of Horus and Set (Papyrus Chester Beatty I) stages the gods' longest lawsuit: eighty years of trials, battles, and tricks — the hippopotamus duel, the lettuce episode, the trial by boat — until the Ennead divides the inheritance: Horus takes the black land, stḫ the desert and the foreign countries. Not defeat but partition: Egypt writes chaos into the constitution.</p>` },
        { tag: 'The Prow', title: 'The Spear of the Night Barque', text: `<p class='myth-text'>The Amduat and the Books of the Netherworld give him the office no gentle god could hold: standing at the prow of Ra's night barque, stḫ spears Apophis — the giant serpent who swallows the sun each night — because only his strength, his violence, and his willingness to fight monsters suffice. The cosmos depends on the murderer of Osiris doing his job.</p>` },
        { tag: 'The Kings', title: 'Patron of Warriors', text: `<p class='myth-text'>Pharaohs of the warrior line took his name — Seti, "man of Set" — and Ramesses II praised him at Qadesh; the Hyksos had earlier made him their chief god at Avaris, identifying him with Baal. The Nineteenth Dynasty kept his temple at Ombos (Nubt), the gold town, and his priests never disappeared: strength, in Egypt, was sacred even when it was frightening.</p>` },
      ],
    },
    syncretism: `<p>The New Kingdom identified him with Baal, the Syrian storm god — an equation made by warriors, for warriors. The Greeks, reading the Osiris cycle, identified him with Typhōn, the hundred-headed enemy of Zeús, and as Egypt's religion closed, the identification became damnation: Set-Typhon absorbed all evil, his animal was hacked from the reliefs, his name excised. Te Velde's classic study calls the process "the demonization of a god" — the first documented case of a deity becoming a devil.</p>`,
    culturalLegacy: `<p>He is the ancestor of every "god of the enemy" in Western imagination — the Typhonian tradition runs from Plutarch through modern occultism. Egyptology's rehabilitation of him (as the necessary opposite, strength without which order is defenceless) is one of the field's signature achievements. The Set animal remains the standard icon of ambiguity itself, and "Sethian" survives as a scholarly label for Gnostic sects who saw the world as his kind of storm.</p>`,
    archaeology: `His cult centre was Nubt (Ombos, near modern Naqada), the "gold town," where temple remains and the predynastic votives tie him to Egypt's earliest strata; Set-animal standards appear on the Scorpion macehead and the Narmer palette's war context. The sha-beast's erasure is itself archaeological: reliefs at Karnak and elsewhere show the animal chiseled out in the Late Period and restored by modern epigraphy. The Edfu temple texts preserve the fullest dramatic liturgy of the Horus-Set conflict, performed as temple drama.`,
    extendedMeditation: `<p>stḫ is the god of the strength you hope never to need. Egypt's answer to evil was not to banish it but to post it at the prow: the desert's violence pointed outward, against the true nothing. He asks every ordered world the question it least likes: what, in you, is strong enough to fight the serpent — and where will you let it stand?</p>`,
    sources: [{ name: 'Te Velde' }, { name: 'Faulkner' }, { name: 'Gardiner' }, { name: 'Allen, Middle Egyptian' }, { name: 'Bonneau' }, { name: 'Egyptology' }],
  },

  seshat: {
    pronunciationNote:
      'sšꜣt is conventionally vocalized "Seshat"; the doubled s of older "Sesheta" spellings and the final t mark her as the female counterpart of Thoth in both function and grammar. The ꜣ (Gardiner G1, the vulture) is the glottal stop the restoration keeps, where older books printed a plain "a."',
    originalScriptNote: `<p>Written with the reed-leaf sš (M22, the sign that also gives the word for "scribe" and "writing"), followed by ꜣ and the feminine t. Her very name is built from the hieroglyph for writing — she is the only goddess whose spelling is her job description.</p>`,
    domains: {
      title: 'The Lady of the Record',
      subtitle: 'Writing, Measurement, and the Stretching of the Cord',
      lead: `<p class='lead-text'>sšꜣt is Egypt's goddess of everything written down: founder of libraries, keeper of the royal annals, and the king's partner in the "stretching of the cord" — the rite that laid every temple's axis on the stars. Seven-pointed star above her head, palm-rib in her hand, she is precision itself.</p>`,
      cards: [
        { iconPath: ICONS.scroll, name: 'The Annals', desc: 'She writes the king\'s regnal years and victories — the memory of Egypt in her hand.' },
        { iconPath: ICONS.star, name: 'The Seven-Pointed Star', desc: 'Her emblem, read as star, rosette, or inverted horns — scholarship still debates it; she has not told.' },
        { iconPath: ICONS.thread, name: 'Stretching the Cord', desc: 'The foundation rite: she and the king stretch the line that fixes the temple on the heavens.' },
        { iconPath: ICONS.palm, name: 'The Palm-Rib', desc: 'Her notched tally-stick: the years themselves, carved in wood that outlasts reigns.' },
      ],
    },
    symbols: [
      { name: 'The seven-pointed star', meaning: 'Her crown-emblem — celestial order marked above the leopard skin' },
      { name: 'The palm-rib', meaning: 'The tally of years; chronology as sacred craft' },
      { name: 'The leopard skin', meaning: 'The priestly robe she wears — keeper of the deepest rites' },
      { name: 'The writing kit', meaning: 'Palette and reed — the tools that make memory permanent' },
    ],
    mythology: {
      lead: `<p class='lead-text'>sšꜣt rarely stars in myth-narrative; she is present at the moments that matter — foundations, jubilees, coronations — because those moments are made of measurement and record, and she is both.</p>`,
      myths: [
        { tag: 'The Foundation', title: 'Pedj-Shes', text: `<p class='myth-text'>The "stretching of the cord" opens every temple: at night, sighting the stars, the king and sšꜣt stretch the cord between stakes to fix the building's axis. Reliefs from Seti I's Abydos to the Ptolemaic temples show the rite exactly: the goddess facing the king, mallet and pole in hand, the text saying "I hold the peg." A temple in Egypt is not built; it is measured into alignment with the turning sky.</p>` },
        { tag: 'The Years', title: 'The Notches of Time', text: `<p class='myth-text'>At jubilee (sed-festival) scenes she offers the king the palm-rib marked with countless notches — "I give you years as numerous as those of Ra." She is the accountant of eternity: regnal years, biennial cattle-censuses, and the captured spoil are all inscribed by her. What she writes, the king truly possesses; what she omits, history loses.</p>` },
        { tag: 'The Library', title: 'Mistress of the House of Books', text: `<p class='myth-text'>Her titles include "foremost of the house of books" — the temple library — and "mistress of the house of architects." Egyptian scholarship knew her as the divine librarian: medical, ritual, and astronomical books were "from her chamber." When a later age imagined a single goddess of wisdom, sšꜣt had been there for three thousand years.</p>` },
        { tag: 'The Consort', title: 'With Thoth', text: `<p class='myth-text'>Later theology pairs her with Djehuty (Thoth) as daughter or consort — the moon-scribe and the star-measurer, the two halves of sacred knowledge. She keeps the "before" of his writing: the measurement that gives knowledge its ground, the record that gives it its memory.</p>` },
      ],
    },
    syncretism: `<p>The Greeks found no clean equivalent — she sits between the Muses, Mnemosyne, and Athena Polias' architectural side — and mostly left her untranslated, a mark of how specifically Egyptian the office was. In Hermetic literature her functions migrate toward Thoth-Hermes Trismegistus: the great scribe absorbs his lady's archive. Modern revivals quietly restored her: she is the unofficial patroness of librarians, archivists, and surveyors who know her seven-pointed star.</p>`,
    culturalLegacy: `<p>She embodies an idea the modern world runs on: that power follows from record — the survey, the ledger, the archive. Egyptologists cite her rite in every study of temple alignment (the "stretching of the cord" is the founding document of archaeoastronomy), and her palm-rib is the ancestor of every tally, census, and database. Wherever a foundation stone is laid by measure rather than by guess, her cord is still stretched.</p>`,
    archaeology: `Her iconography is remarkably consistent across three millennia: leopard-skin robe, seven-pointed emblem on a double horizontal bar, palm-rib in hand. The finest foundation reliefs — Seti I at Abydos, Hatshepsut's foundation deposits, Edfu and Dendera's Ptolemaic versions — show the cord-stretching in identical form, a ritual grammar unchanged from Old Kingdom to Rome. Foundation deposits under real temples (model tools, plaques, the cord's physical traces) confirm the rite was performed, not just pictured.`,
    extendedMeditation: `<p>sšꜣt is the goddess of "write it down." Civilization begins, in her liturgy, not with fire or the wheel but with the cord and the notch: measure the ground, record the year. She asks of every age drowning in information the only question that matters: what, of all this, have you measured truly enough to keep?</p>`,
    sources: [{ name: 'Faulkner' }, { name: 'Gardiner' }, { name: 'Te Velde' }, { name: 'Allen, Middle Egyptian' }, { name: 'Bonneau' }, { name: 'Egyptology' }],
  },

  hp: {
    pronunciationNote:
      'ḥp is conventionally vocalized "Hapi"; the ḥ (Gardiner Aa1) is the pharyngeal fricative heard at the start of the name. He must not be confused with Ḥpy the baboon-headed son of Horus — same sound, different god: the restoration keeps the underdot that marks the river-lord\'s true name.',
    originalScriptNote: `<p>Written ḥ-p with the water sign and the determinative of the fat-bellied offering-bringer; in the fullest orthographies the name rides in the Hymn to Hapi's papyrus copies. The god himself — blue-skinned, heavy-breasted, crowned with papyrus or lotus — is his own determinative: abundance in human form.</p>`,
    domains: {
      title: 'The Flood that Feeds',
      subtitle: 'The Inundation, Abundance, and the Fat of the Land',
      lead: `<p class='lead-text'>ḥp is the Nile flood personified: the annual miracle on which all of Egypt hung, arriving as a blue-green, androgynous, heavy-bellied bringer of plenty. No temple was built to him — he needed none; the river was his temple, and its rising his epiphany.</p>`,
      cards: [
        { iconPath: ICONS.wave, name: 'The Inundation', desc: 'The akhet season: the river rising to feed the black land — Egypt\'s single most sacred event.' },
        { iconPath: ICONS.vase, name: 'The Offerings', desc: 'He bears trays of fish, fowl, and produce — the land\'s abundance carried in his own arms.' },
        { iconPath: ICONS.palm, name: 'The Sema-Tawy', desc: 'The double Hapi tying papyrus and lotus around the windpipe-sign: the Two Lands knotted into one.' },
        { iconPath: ICONS.scale, name: 'The Nilometer', desc: 'His measure at Elephantine: cubits of rise that set the year\'s tax and the year\'s hope.' },
      ],
    },
    symbols: [
      { name: 'The blue-green skin', meaning: 'The water itself, and the vegetation it summons' },
      { name: 'The heavy breasts and belly', meaning: 'Androgynous abundance — the flood as both father and mother' },
      { name: 'The papyrus and lotus', meaning: 'Lower and Upper Egypt, both his crowns' },
    ],
    mythology: {
      lead: `<p class='lead-text'>ḥp has no adventures because he is not a character but an event: the flood. His mythology is hydrology made sacred — the river's rhythm given a face, a hymn, and a table of offerings.</p>`,
      myths: [
        { tag: 'The Hymn', title: 'The Hymn to Hapi', text: `<p class='myth-text'>The great Hymn to Hapi — a school text for a millennium, surviving in New Kingdom copies — calls him "lord of fish and fowl, maker of barley, creator of wheat," and says what every Egyptian knew: when he is high, the land rejoices; when he fails, "the whole land is in panic." No god in the hymn's Egypt is more feared for absence or praised for arrival.</p>` },
        { tag: 'The Union', title: 'The Tying of the Two Lands', text: `<p class='myth-text'>On temple thrones across Egypt, two ḥp-figures — one crowned with Upper Egypt's lotus, one with the Delta's papyrus — knot the plants around the sema hieroglyph of the windpipe: sema-tawy, "uniting the Two Lands." The flood itself performs the political theology: one river, one country, one harvest.</p>` },
        { tag: 'The Source', title: 'The Caverns of the Nile', text: `<p class='myth-text'>Egyptians imagined the flood welling from subterranean caverns at the First Cataract — the realm of Khnum at Elephantine — and ḥp dwelling in the abyss with it. The theology matters less than the observation: the river rises at the solstice as Sirius returns, and the whole calendar, tax system, and liturgy bent to his timing.</p>` },
      ],
    },
    syncretism: `<p>The Greeks called him Neilos and gave the river-god a Greek biography — making him, in some accounts, father of Memphis and ancestor of the Danaid line that returned to Argos. The word "Nile" itself descends through this identification. In Nubia he merged with local flood-lords; in the Fayum, his abundance fed the crocodile cult of Sobek, whose lake was the flood's great reservoir. Every downstream culture read the same rising water and named its own god.</p>`,
    culturalLegacy: `<p>He is the reason Egyptology has a tax-system to study: nilometer readings governed assessments, and the "perfect flood" — about 16 cubits at Memphis — was the single most important number in the ancient economy. The Aswan High Dam ended his annual epiphany in 1970: the fields no longer drown, and Egypt marks the loss in every history of the river. "Hapi" survives in countless modern Egyptian names and in the eco-memory of a regulated Nile.</p>`,
    archaeology: `Nilometers survive at Elephantine (a stairwell of cubit scales rebuilt under the Romans), at Roda island in Cairo (the famous octagonal shaft, Abbasid-era over Fatimid work), and at Philae. His iconography is among the most common in Egyptian art: the procession of fat-bellied offering-bringers lines the base of temple walls from Karnak to Dendera, and the double-ḥp sema-tawy decorates royal thrones from the Old Kingdom onward. The Hymn to Hapi's best copies come from school texts — pupils learned the river's praise by heart.`,
    extendedMeditation: `<p>ḥp is the god of the right amount. Too little and Egypt starved; too much and it drowned: his theology is the arithmetic of enough. Every flood-forecast, every reservoir, every rationing scheme since is his liturgy translated — the oldest question of abundance is not how to get more, but how to receive what comes.</p>`,
    sources: [{ name: 'Faulkner' }, { name: 'Bonneau' }, { name: 'Gardiner' }, { name: 'Allen, Middle Egyptian' }, { name: 'Te Velde' }, { name: 'Egyptology' }],
  },
};
