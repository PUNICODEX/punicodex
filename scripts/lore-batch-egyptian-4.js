#!/usr/bin/env node
/**
 * Lore-catalog merge — Egyptian batch 4 (ascii-restoration 2026-11).
 * Idempotent: existing non-empty entries are NEVER overwritten.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LORE_PATH = path.join(ROOT, 'scripts', 'lore-catalog.json');
const lore = JSON.parse(fs.readFileSync(LORE_PATH, 'utf8'));

const ENTRIES = {
  sokar: {
    pronunciation: {
      ipa: '/ˈsoʊkɑːr/ (conventional)',
      ipaLabel: 'Conventional reading — Egyptian vocalisation not attested',
      phonemes: [
        { symbol: 'Skr', desc: 'Written sqr; conventionally vocalised “Sokar”. The name may mean “the mysterious one”.' },
        { symbol: '', desc: 'The falcon god of the Memphis necropolis, patron of the royal tomb-workers.' },
      ],
      approximation: '“SOH-kar”',
      kin: 'Fused as Ptah-Sokar-Osiris, the Memphite funerary trinity',
      note: 'His festival, the raising of the Djed-pillar, was performed at the opening of the earth’s year.',
    },
    domains: {
      title: 'God of the Memphis Necropolis, the Mound of Creation',
      subtitle: 'The Mysterious One, Patron of the Tomb-Makers',
      lead: "<p class='lead-text'><strong>Sqr</strong> — Sokar — is the falcon of the Memphite dead: lord of the desert necropolis west of Memphis, master of its legendary tomb and workshop, and keeper of the mound where creation is annually re-declared. In him the arts of the dead — mummification, metalwork, resurrection — found their most ancient patron.</p>",
      cards: [
        { name: 'Lord of Rostjau', text: 'Sovereign of the necropolis region (Rosetjau) and its royal tomb workshops.', desc: 'Sovereign of the necropolis region (Rosetjau) and its royal tomb workshops.', iconPath: 'M16 52H48M20 52V36L32 24L44 36V52M12 52H52M32 24V12' },
        { name: 'The Falcon of Silver', desc: 'His shrine was the <em>Henu</em> barque with the head of a falcon — the solar-funeral vessel of the Memphite dead.', iconPath: 'M10 40C22 28 42 28 54 38L58 30L56 42C44 50 22 50 10 44ZM26 34L22 24M38 33L36 23' },
        { name: 'Master of Metalworkers', desc: 'The tomb’s goldsmiths and smiths of sacred metal worked under his protection.', iconPath: 'M20 20H44V32H20ZM32 32V44M24 44H40M18 44H46M14 48H50' },
        { name: 'The Djed Mound', desc: 'His festival raised the Djed-pillar on the primeval mound — Osiris’ spine set upright in the earth.', iconPath: 'M28 8H36M28 16H36M32 16V56M24 56H40M28 28H36M28 40H36' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>Sokar’s mythology is the theology of the Memphite necropolis as a creation-site. The desert west of Memphis — Rostjau, ‘the passage of the ram-heads’ — was, in his cult, the primeval mound where the work of resurrection is endlessly performed. With Ptah and Osiris he forms the great funerary trinity that carried Egyptian hopes of afterlife through two millennia.</p>",
      myths: [
        { tag: 'Memphite Tradition', title: 'The Mound in the Necropolis', text: "<p class='myth-text'>Sokar’s domain was not merely burial-ground but cosmogram: the Memphite desert’s hillocks were read as the world’s first mound rising from Nun. His priests raised the Djed-pillar there each year — Osiris’ backbone set upright in Sokar’s earth — and the world’s order was reaffirmed at the threshold of the dead.</p>" },
        { tag: 'Henu Barque', title: 'The Voyage of the Funerary Falcon', text: "<p class='myth-text'>The Sokar-festival’s climax was the procession of the <em>Henu</em>: a ship-shaped shrine on a sledge, its prow a falcon-head, drawn around the Memphite walls at dawn. The dead of the necropolis were imagined sailing with him; the barque’s circuit through the desert gates was the afterlife’s rehearsal.</p>" },
        { tag: 'Ptah-Sokar-Osiris', title: 'The Memphite Trinity', text: "<p class='myth-text'>As Memphis’ theology systematised, Sokar fused with Ptah the creator and Osiris the resurrected into the compound Ptah-Sokar-Osiris — the complete god of the dead: the one who makes, the one who is buried, the one who rises. Late-period amulets and coffins carry the triple name as a single guarantee.</p>" },
        { tag: 'Royal Tomb Guilds', title: 'Patron of the Workmen', text: "<p class='myth-text'>The royal necropolis workmen — the draughtsmen, carpenters and goldsmiths who built the Valley of the Kings — placed their craft under Sokar. Ostraca from Deir el-Medina invoke him as the foreman of the ultimate workshop, where every artefact is made to outlast eternity.</p>" },
      ],
    },
    syncretism: "Sokar is a study in controlled fusion: with Ptah as Ptah-Sokar, with Osiris as Sokar-Osiris, and in the full Memphite formula as all three. The Greeks rendered him Sarapis’ deepest Egyptian stratum — the Apis bull’s Memphite necropolis was Sokar’s ground long before Serapis was imagined.",
    culturalLegacy: "His festival ship, the Henu, survives in hundreds of amulets and in the standard late coffin-foot vignette; and the Djed-raising rite he hosted became the emblematic ‘erection of Osiris’ celebrated at the New Year across Egypt. The Memphite trinity remains the textbook example of Egyptian god-compounding done to completion.",
    extendedMeditation: "Sqr: a name whose very root, in Egyptian, whispers ‘do not ask’. He is the mysterious one, and his restoration honours that — three plain letters that decline to explain themselves, guarding the west as they have since before the pyramids.",
    sources: [
      { name: 'Memphite funerary liturgies and the Shabaka Stone tradition' },
      { name: 'Sokar-festival reliefs and Henu-barque iconography' },
      { name: 'Deir el-Medina ostraca (craft invocations)' },
      { name: 'Griffiths, ‘Sokar’ in Lexikon der Ägyptologie' },
    ],
    archaeology: "His Memphite shrines are largely lost beneath the cultivation, but the Henu-barque amulets by the thousand, the Djed-pillar iconography, and the Saqqara Serapeum’s older strata preserve his cult’s materiality. The Late Period shaft-tombs of the sacred animals at Saqqara ran through ground his priests had held for millennia.",
    cult: "The Sokar-festival in the fourth month of inundation opened with the Djed-raising and closed with the Henu procession around the Memphite walls — a civic event as much as a funerary one. Smiths and tomb-workers kept his small cults in the necropolis villages; his was a guild-god’s religion of craft and precision.",
    iconography: "A falcon-headed man, or the falcon upon its <em>Henu</em> sledge-shrine with high prow; wings spread in protection over the necropolis. The Djed-pillar and the was-sceptre accompany him, and his funerary colour is the black of the fertile necropolis earth.",
    reception: "Through the Sarapis connection, Sokar’s Memphite ground became part of the ancient world’s most exported cult; through the Djed-raising, his image passed into the Hermetic and alchemical imagination as the spine of the world set upright — the axis of resurrection.",
  },

  kebechet: {
    pronunciation: {
      ipa: '/kəˈbɛʃɛt/ (conventional)',
      ipaLabel: 'Conventional reading — Egyptian vocalisation not attested',
      phonemes: [
        { symbol: 'Qbḥt', desc: 'Written qbḥ.t; conventionally vocalised “Kebechet”. The root qbḥ means “cool, fresh”.' },
        { symbol: '', desc: 'Daughter of Anubis, the snake-goddess of purification water.' },
      ],
      approximation: '“keh-BESH-et”',
      kin: 'Daughter of Anubis (Inpw); serpent form',
      note: 'Her name is a promise: the cool water that quenches the thirst of the dead.',
    },
    domains: {
      title: 'Goddess of Purification, the Cool Water of Offerings',
      subtitle: 'The Serpent Daughter of Anubis',
      lead: "<p class='lead-text'><strong>Qbḥt</strong> — Kebechet — is the gentlest of the death-gods’ company: Anubis’ daughter, who takes serpent form and brings the cool, fresh water of purification to the dead. Where her father presides over the weighing, she attends to the washing — the goddess whose element, water, cleanses what the tomb cannot.</p>",
      cards: [
        { name: 'The Purifying Snake', desc: 'In serpent form she moves through the embalming tent, her coolness the antidote to decay’s heat.', iconPath: 'M14 44C22 52 34 52 40 46C46 40 42 32 34 32C26 32 22 26 28 20C34 14 44 16 48 22M44 18L52 12M48 24L56 20' },
        { name: 'Daughter of Anubis', desc: 'Child of the embalmer-god; she extends his craft from wrapping to refreshing.', iconPath: 'M32 8V30M32 14L50 24M32 14L14 24M32 30L20 48M32 30L44 48M32 30V50' },
        { name: 'The Cool Water', desc: 'Her name means “cooling”; the libation water she pours revives the dead’s senses.', iconPath: 'M32 10C26 20 22 28 22 36C22 46 26 52 32 52C38 52 42 46 42 36C42 28 38 20 32 10ZM32 40V52M16 20L18 18M48 20L50 18M32 6V2' },
        { name: 'Guardian of the Embalmers', desc: 'Present at every stage of the <em>wbt</em>-ritual: the purification that precedes mummification.', iconPath: 'M16 20H48V48H16ZM32 28V40M26 34H38M16 20L10 14M48 20L54 14M16 48L10 54M48 48L54 54' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>Kebechet belongs to the small, precise company of Egyptian funerary deities whose work is a single gesture done perfectly. Her mythology is her function: the cooling of the dead. In the Pyramid Texts she already appears beside her father Anubis, refreshing the king’s flesh with the water that flows in the beyond’s own divine Nile.</p>",
      myths: [
        { tag: 'Pyramid Texts', title: 'The Refresher of the King', text: "<p class='myth-text'>The oldest utterances name Kebechet among the court of the embalming gods: she who ‘refreshes’ the king’s heart, whose cool water runs in the celestial Nile. The afterlife of the Pyramid Texts is a place of thirsts quenched — Kebechet is the goddess holding the cup.</p>" },
        { tag: 'Embalming Ritual', title: 'The Washing Before the Wrapping', text: "<p class='myth-text'>The mortuary liturgy divides into the water-rites and the bandage-rites, and Kebechet presides over the first. Before Anubis could wrap, Kebechet had to cool — the purification that made the body fit to be eternal. The ritual texts address her directly as ‘ Kebechet who is upon her father’s lake’.</p>" },
        { tag: 'Serpent Theology', title: 'The Beneficent Snake', text: "<p class='myth-text'>Egypt’s serpent-goddesses divide between the deadly (Meretseger, the fiery Eye) and the beneficent; Kebechet is the gentlest of the second company. Her serpent form is coolness itself — the reptile of the water’s edge, at home in the inundation’s margin where freshness collects.</p>" },
        { tag: 'The Divine Lake', text: '', title: 'Her Father’s Lake', text: "<p class='myth-text'>The embalming tent stood symbolically at the edge of the sacred lake where the gods washed; Kebechet is its personification. In vignettes of the judgement hall she appears beside the scales’ lake, ensuring the water of the test is cool, clean, and truthful.</p>" },
      ],
    },
    syncretism: "Kebechet absorbed into the greater purification-cycles — identified with the inundation’s first water and with the serpent-forms of Wadjet in her gentle aspect. She is sometimes doubled with Qebehsenuef, the falcon-son of Horus of the canopic jars — the two ‘cool’ divinities of the embalming company.",
    culturalLegacy: "Small as her cult was, she is indispensable to the completeness of Egyptian funerary religion: the theology that remembered to quench the dead’s thirst. Her image — the water-pouring serpent — appears on Late Period stelae from Akhmim to Thebes, and modern studies of embalming cite her as the water-rites’ divine warrant.",
    extendedMeditation: "Qbḥt: four consonants that mean coolness. In a religion of desert and flood, she is the moment between them — the fresh margin. Her restoration needs no ornament; the name itself is a draught of water offered to anyone who reads it aloud.",
    sources: [
      { name: 'Pyramid Texts (Kebechet utterances)' },
      { name: 'Embalming ritual papyri (water-rite addresses)' },
      { name: 'Book of the Dead vignettes (purification scenes)' },
      { name: 'Kebechet stelae, Late Period' },
    ],
    archaeology: "No temple of her own is known — her cult was served within Anubis’ — but her stelae and amulets, the serpent pouring from a jar, are widespread in Late Period material. The embalming caches of Saqqara place her among the gods whose names guaranteed the rite.",
    cult: "Her ‘cult’ was the mortuary water-rite itself: every libation poured for the dead was hers. Priests of the embalming guild invoked her at the washing; families pouring water at tombs addressed her without knowing her name.",
    iconography: "A serpent with a woman’s head, or a woman with serpent’s head, pouring water from a jar; sometimes simply a snake rearing beside the embalmer’s table. Her colour is the blue-green of fresh water on desert stone.",
    reception: "Greek visitors to the necropolises recorded the water-pouring serpent without separating Kebechet from Wadjet; modern Egyptology restored her distinct place through the ritual papyri. She remains the emblem of the small gods — the ones whose whole theology is one merciful act.",
  },

  renenutet: {
    pronunciation: {
      ipa: '/rəˌnɛnuːˈtɛt/ (conventional)',
      ipaLabel: 'Conventional reading — Egyptian vocalisation not attested',
      phonemes: [
        { symbol: 'Rnnwtt', desc: 'Written rnn.t or rnnwtt; conventionally vocalised “Renenutet”. The root rnn means “to nurse, suckle”.' },
        { symbol: '', desc: 'The cobra-goddess of the harvest and of nursing, lady of the granary.' },
      ],
      approximation: '“reh-nuh-NOO-tet”',
      kin: 'Greek Τηρνοῦθις (Tērnoûthis); fused with Thermouthis in the Greco-Roman period',
      note: 'Her name is the participle “she who nurses” — the harvest that feeds is her milk.',
    },
    domains: {
      title: 'Goddess of the Harvest, the Nursing Cobra',
      subtitle: 'Lady of the Granary, Mother of the Field',
      lead: "<p class='lead-text'><strong>Rnnwtt</strong> — Renenutet — is the harvest as maternity: the cobra who coils in the last standing sheaf and nurses the grain to ripeness. Every Egyptian granary was her temple in miniature; every nurse suckling a child repeated her oldest work. She is the goddess in whom food and motherhood are the same fact.</p>",
      cards: [
        { name: 'The Harvest Cobra', desc: 'A rearing cobra crowned with the harvest’s plumes; the last sheaf of the field is her shrine.', iconPath: 'M18 46C26 52 38 52 44 46C50 40 46 32 38 32C30 32 26 26 32 20C38 14 48 16 52 22M48 18L56 12M52 26L58 22' },
        { name: 'Lady of the Granary', desc: 'Every storehouse and threshing floor fell under her protection — and her audit.', iconPath: 'M16 24H48L44 52H20ZM16 24L12 16M48 24L52 16M24 32H40M22 40H42M20 48H44' },
        { name: 'The Nursing Goddess', desc: 'Her name means “she who nurses”; the pharaoh himself was her nursling.', iconPath: 'M32 10C26 18 22 28 22 38C22 48 26 54 32 54C38 54 42 48 42 38C42 28 38 18 32 10ZM20 42H44M28 46L32 50L36 46' },
        { name: 'Goddess of the Vineyard', desc: 'Wine-presses and wine-jars carried her name; the vintage was her second harvest.', iconPath: 'M22 16C22 32 26 44 32 44C38 44 42 32 42 16M18 16H46M26 52H38M32 44V52M28 24H36M27 32H37' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>Renenutet’s mythology is the theology of food security in a subsistence economy: the goddess who turns sunlight into grain and grain into children’s milk. She has no great narrative cycle because she needed none — every harvest was her epiphany, every famine her absence, every granary her chapel.</p>",
      myths: [
        { tag: 'Harvest Theology', title: 'The Cobra in the Last Sheaf', text: "<p class='myth-text'>Egyptian reapers left the last sheaf standing and addressed it as Renenutet: the goddess still resident in the field. To cut it was to release her into the granary for the year’s safekeeping. The custom — attested from the Old Kingdom harvest scenes onward — made every field’s end a small theological drama.</p>" },
        { tag: 'Fayum & Dendera', title: 'Mother of the Vineyard', text: "<p class='myth-text'>In the Fayum and at Dendera she presided over the wine-press as over the threshing-floor; the wine-jar docket ‘Renenutet’s portion’ marked the divine tithe of the vintage. With Sobek as her consort in the Fayum she mothered the crop-cycle whole — grain, grape, and the flood that feeds both.</p>" },
        { tag: 'Royal Nurture', title: 'Nurse of the King', text: "<p class='myth-text'>The king’s titulary calls him ‘the nursling of Renenutet’: the harvest feeds the state as the breast feeds the child, and both are her body. Royal birth-scenes show her cobra rearing behind the throne of the nursing mother, transferring the goddess’ own milk into the legitimate succession.</p>" },
        { tag: 'Greco-Roman Age', title: 'Thermouthis', text: "<p class='myth-text'>Under the Ptolemies she was worshipped as Thermouthis — ‘the harvest-serpent’ in Greek dress — with a cult that joined her to Isis the nurse. The equation made her an international goddess of provisioning, and her images spread with the grain trade she embodied.</p>" },
      ],
    },
    syncretism: "Renenutet merged early with Wadjet, the cobra of Lower Egypt — both are the rearing uraeus — and with Meretseger of the Theban necropolis in her serpent aspect. As Thermouthis she was equated with Isis and Demeter, the two great maternal goddesses of the classical world; the triangulation made her the most exported of Egypt’s agricultural deities.",
    culturalLegacy: "The ‘last sheaf’ custom survived in Egyptian folk practice into the modern era, one of the longest-lived ritual continuities on earth. Her name, in the Greek dress of Thermouthis, entered the magical papyri and the romance-literature of the ancient novel; and every study of Egyptian food-economy begins with her shrines at the granary door.",
    extendedMeditation: "Rnnwtt: the name suckles. Its restoration in plain letters is a granary-stela — six consonants standing like six full jars in a row, each one sealed, each one feeding the next. No diacritic could improve a name that means milk.",
    sources: [
      { name: 'Harvest and vintage scenes, Old Kingdom tombs' },
      { name: 'Fayum temple hymns (Renenutet-Sobek theology)' },
      { name: 'Dendera granary dockets and wine tithes' },
      { name: 'Greco-Roman Thermouthis cult inscriptions' },
    ],
    archaeology: "Her finest surviving monument is the temple of Dendera’s granary quarter; the Fayum’s Tebtunis papyri preserve her vineyard accounts. Serpent-cult objects from the harvest festivals — plumed cobra figurines — fill the Late Period strata of sites across the valley.",
    cult: "Every threshing-floor kept her image; the harvest’s end brought her festival of the last sheaf. Nurses and mothers wore her amulets, and the state’s grain-auditors sealed their measures in her name — she was simultaneously pantry-goddess and auditor of the realm’s food.",
    iconography: "A rearing cobra, hood flared, crowned with two plumes or horns and sun-disc; in anthropomorphic form a woman with the cobra-head nursing a child. The sheaf, the wine-jar and the plough accompany her in harvest scenes.",
    reception: "Through Thermouthis she entered the Isis-circles of the Roman Empire, and her ‘last sheaf’ rite was recorded by every traveller who saw the Egyptian harvest from Herodotus to the nineteenth century. Modern agricultural anthropology still cites her as the type-case of the harvest-mother goddess.",
  },

  onuris: {
    pronunciation: {
      ipa: '/ˈɒnjʊərɪs/ (conventional)',
      ipaLabel: 'Conventional reading — Egyptian vocalisation not attested',
      phonemes: [
        { symbol: 'ꜥnḥ-wr', desc: 'Written ꜥnḥ wr “he who brings back the distant one”; conventionally vocalised “Onuris”. Greek Ἄνουρις (Ánouris).' },
        { symbol: '', desc: 'The spear-carrying war-god of This near Abydos, husband of the lioness Mehyt.' },
      ],
      approximation: '“ON-yoor-iss”',
      kin: 'Greek Ἄνουρις · identified with the warlike Shu in late theology',
      note: 'His name is a verb-phrase: the hunter-god who fetches back what fled.',
    },
    domains: {
      title: 'He Who Brings Back the Distant One',
      subtitle: 'The Spear-God of This, Husband of the Lioness',
      lead: "<p class='lead-text'><strong>ꜥnḥ wr</strong> — Onuris — is the god of the retrieved: the spear-carrying hunter who fetches back the goddess who fled. His myth is the cosmic courtship of the runaway lioness Mehyt, brought home from the Nubian hills to This; his cult was the war-cult of the Thinite nome, the kings’ ancestral land.</p>",
      cards: [
        { name: 'The Retriever', desc: 'His name is his mission: he brings back the distant one — the Eye of Ra, the lioness, the runaway glory.', iconPath: 'M14 50L50 14M50 14L42 16M50 14L48 22M14 50C24 46 32 40 38 32M10 54L18 46' },
        { name: 'The Spear-Bearer', desc: 'Armed with spear and rope, the hunter of the high desert; a war-god of the oldest royal nome.', iconPath: 'M32 8V56M32 12L52 24M32 12L12 24M46 34L56 28M44 42L56 40' },
        { name: 'Husband of Mehyt', desc: 'His consort is the fierce lioness Mehyt — the retrieved Eye, tamed by marriage, not chains.', iconPath: 'M20 32C20 22 28 14 36 16C44 18 48 26 44 34C40 42 30 46 24 40M34 18L32 8M40 22L44 12M26 30L12 26' },
        { name: 'Lord of This', desc: 'His city, This (Girga), stood beside Abydos — the ancestral seat of the first dynasties.', iconPath: 'M16 52H48M20 52V32L32 20L44 32V52M28 52V40H36V52M32 20V10M12 52H52' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>Onuris’ mythology is the romance of retrieval: the Eye of Ra, in her lioness form as Mehyt, raged in the southern hills, and Onuris went up with spear and rope and brought her home. The New Kingdom theologians read the story as the sun’s power recovered from the desert’s edge — and as the model of the husband who fetches back what the household loses.</p>",
      myths: [
        { tag: 'Thinite Tradition', title: 'The Fetching of the Lioness', text: "<p class='myth-text'>In the nome of This the story ran: Mehyt, the lioness, fled into the eastern hills; Onuris pursued, threw the rope, and brought her down — and married her. The temple hymns celebrate the return procession: the retrieved goddess re-entering the town at her husband’s side, the desert’s ferocity domesticated into civic power.</p>" },
        { tag: 'Eye of Ra Cycle', title: 'The Solar Eye Recovered', text: "<p class='myth-text'>Read cosmically, Onuris’ retrieval is Shu’s embassy to the Eye — the same story the Leiden hymns tell of Tefnut’s return. Onuris is Shu’s local, warlike face: the one god whose job description is fetching the godhead’s missing power, whether by flattery or by spear.</p>" },
        { tag: 'Royal Ancestry', title: 'The God of the First Nome', text: "<p class='myth-text'>This and Abydos were the ground of the first kings; Onuris received the devotion of dynasties that claimed the Thinite soil as their own. His was the war-god of the ancestral nome — the spear at the head of the line that unified the Two Lands.</p>" },
        { tag: 'Late Theology', title: 'Onuris-Shu of the Sky', text: "<p class='myth-text'>In the Late Period he was fully identified with Shu, the air that holds up the sky — the retriever who brings back Nut herself each dawn. The lioness he fetched became the sky’s ferocity, and his spear the axis that keeps the vault in place.</p>" },
      ],
    },
    syncretism: "Onuris is the Thinite doublet of Shu: same retrieval-myth, same air-theology, localised and armed. The Greeks knew him as Anuris and left him largely unmapped — no Olympian quite covered ‘the husband who fetches’ — while Egyptian theology folded him contentedly into the greater Shu.",
    culturalLegacy: "His myth survives as one of the most charming of the Eye-cycle variants — the only one where the divine embassy ends in marriage. The Thinite nome’s devotion to him outlasted its political weight by millennia; and his name, in the Greek form Anuris, wandered into the magical papyri as a word of power for recovering what is lost.",
    extendedMeditation: "ꜥnḥ wr is a sentence pretending to be a name: ‘he who brings back the distant one’. In plain letters it still performs its function — this temple, entered, returns the reader to something far away. The spear-god guards a name that is also a promise of retrieval.",
    sources: [
      { name: 'Thinite temple hymns (the Mehyt retrieval)' },
      { name: 'Leiden Return-of-the-Eye cycle (Shu parallel)' },
      { name: 'Abydos and This procession reliefs' },
      { name: 'Onuris entries in Lexikon der Ägyptologie' },
    ],
    archaeology: "His temple at This is ruined but was still being described by nineteenth-century travellers; Abydos’ processional ways carry his images among the gods of the Thinite escort. Bronze figurines of the spear-bearing god, rope in hand, are standard Late Period votives.",
    cult: "His festival staged the retrieval: the goddess’ image brought back from the desert’s edge in procession, the town greeting its returned ferocity. Soldiers of the nome dedicated their spears to him — a war-god of the household’s own recovery.",
    iconography: 'A standing man with a short spear and a rope’s loop, four tall plumes on his head, beard of the hunter; beside him the lioness Mehyt. His stance — arm cocked to throw — is the readiest action-pose in the Egyptian divine repertoire.',
    reception: "Greek reporters listed him among the gods they could not translate; modern scholarship values him as the local face of the great Shu-cycle and as proof that Egyptian myth had room for the comic-heroic — the god whose cosmic service was, at bottom, bringing the wife home.",
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
