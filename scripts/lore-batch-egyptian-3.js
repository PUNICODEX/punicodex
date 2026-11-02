#!/usr/bin/env node
/**
 * Lore-catalog merge — Egyptian batch 3 (ascii-restoration 2026-11).
 * Idempotent: existing non-empty entries are NEVER overwritten.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LORE_PATH = path.join(ROOT, 'scripts', 'lore-catalog.json');
const lore = JSON.parse(fs.readFileSync(LORE_PATH, 'utf8'));

const ENTRIES = {
  neith: {
    pronunciation: {
      ipa: '/ˈneɪɪθ/ (conventional)',
      ipaLabel: 'Conventional reading — Egyptian vocalisation not attested',
      phonemes: [
        { symbol: 'N-', desc: 'Written nt or n.t; conventionally vocalised “Neith”.' },
        { symbol: '-t', desc: 'Feminine ending; the name may be a participle, “the terrible one” or “the weaver”.' },
      ],
      approximation: '“NAY-ith”',
      kin: 'Greek Νηΐθ (Nēïth)',
      note: 'One of Egypt’s oldest attested theonyms — her sign appears on Predynastic pottery.',
    },
    domains: {
      title: 'Goddess of Weaving, War, and the Primeval Waters',
      subtitle: 'The Terrible One, Mother of the Gods',
      lead: "<p class='lead-text'><strong>Nt</strong> — Neith — is Egypt’s primordial goddess: older than the Ennead, mistress of the arrows of war and the loom of creation, who wove the world’s fabric at Sais before the gods had names. The ancients called her “the great cow who bore the sun”, and made her the mother of Sobek, of the crocodiles, and of Ra himself in the oldest cosmogonic strand.</p>",
      cards: [
        { name: 'The Weaver', desc: 'Creator as textile-worker: she wove the world’s fabric on her loom at Sais.', iconPath: 'M12 16H52M12 28H52M12 40H52M12 52H52M12 16V52M52 16V52M24 16V52M40 16V52' },
        { name: 'Mistress of the Bow', desc: 'War-goddess whose arrows decide battles; her symbol is the crossed arrows on a shield.', iconPath: 'M14 50L50 14M50 50L14 14M14 50C22 48 28 44 32 38M50 14C42 16 36 20 32 26' },
        { name: 'Mother of the Gods', desc: 'Sole parent of Sobek in the Fayum tradition; in the Esna theology she bears the sun.', iconPath: 'M32 10C26 18 22 28 22 38C22 48 26 54 32 54C38 54 42 48 42 38C42 28 38 18 32 10ZM16 44H48' },
        { name: 'Lady of Sais', desc: 'Her city in the western Delta held her great temple and the mysteries of the primeval waters.', iconPath: 'M14 52H50M18 52V32L32 20L46 32V52M26 52V40H38V52M32 20V10' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>Neith’s mythology is theology in the superlative: she is not a goddess within the pantheon but the condition of it. Her priesthood at Sais taught that she was self-generated, that she wove the world, and that all gods were her children — a doctrine so old it survived into the latest periods essentially unchanged.</p>",
      myths: [
        { tag: 'Esna Cosmogony', title: 'The Cow Who Bore the Sun', text: "<p class='myth-text'>The great hymns of Esna make Neith the mother of Ra: she as the celestial cow gives birth to the sun-disc from between her horns, and the seven scorpions that escort Isis are her daughters. Creation here is maternity on a cosmic scale — the goddess is the source from which the solar order proceeds.</p>" },
        { tag: 'Fayum Theology', title: 'Mother of Sobek', text: "<p class='myth-text'>In the crocodile-god’s country, Neith is Sobek’s mother and the lady of the deep waters he rises from. The pairing of a primeval water-goddess with her crocodile son gives the Fayum’s theology its structure: she is the <em>Nun</em>-like depth, he its dangerous, fertile emergence.</p>" },
        { tag: 'Contendings of Horus and Seth', title: 'The Oracle of the Gods', text: "<p class='myth-text'>When the divine tribunal deadlocked over the succession of Horus and Seth, Neith was consulted as the eldest of counsel. Her written oracle — quoted verbatim in the New Kingdom narrative — demands the throne for Horus and compensation for Seth, and threatens to make the sky fall if the gods disobey. They obeyed.</p>" },
        { tag: 'Greek Reportage', title: 'The Veiled Image of Sais', text: "<p class='myth-text'>Plutarch preserves the mystery of her cult-image at Sais: an image that was never unveiled, before which stood the inscription ‘I am all that has been, and is, and shall be; and no mortal has ever lifted my veil.’ The <em>aisa</em>-mysteries of Sais entered the Hermetic and Platonic imagination as the emblem of unknowable first-nature.</p>" },
      ],
    },
    syncretism: "Neith merges with the great mother-goddesses — Mut, Hathor, Nut — and in the Roman period with Athena, whose war-and-craft profile fit her uncannily; the Greeks of Sais simply called her Athena. The identification was so natural that Herodotus describes her Sais temple in Athenian terms.",
    culturalLegacy: "Her Sais oracle became a proverb of ancient wisdom, quoted from Plutarch to the Renaissance Hermetica; ‘lifting the veil of Isis (Neith)’ passed into modern language as the image of unveiled nature. In Egyptology she anchors the study of Predynastic religion — her crossed-arrows sign is among the earliest divine emblems known.",
    extendedMeditation: "Nt is a name that predates the temples that housed it. Restoring it in plain letters is a kind of archaeological act: the further back a goddess stands, the fewer marks she needs. Her weaving metaphor survives every translation — the world as text, the text as fabric, the goddess as the first author of both.",
    sources: [
      { name: 'Esna temple hymns (the great Neith cosmogonies)' },
      { name: 'Contendings of Horus and Seth (Neith’s oracle)' },
      { name: 'Plutarch, De Iside et Osiride (the veiled image of Sais)' },
      { name: 'Herodotus, Histories 2.59 (the Saïtic festival)' },
      { name: 'El-Saady, ‘Neith’ in Lexikon der Ägyptologie' },
    ],
    archaeology: "Her Delta city Sais — biblical and classical Saïs — was the capital of the Twenty-sixth Dynasty, which consciously revived her archaic cult; its great temple is now largely lost to the water table, but the Esna inscriptions record its liturgy. The crossed-arrows emblem occurs from Naqada-period potsherds to Roman stelae.",
    cult: "The mysteries of Neith at Sais were among Egypt’s most secret rites; her priesthood was famously matrilineal in the late period, and the kings of Dynasty 26 took her name into their titulary to legitimise their Saïtic line. Her festival of the ‘Burning of the Lamps’ lit the temple through the night in mystery.",
    iconography: "A woman wearing the Deshret red crown of Lower Egypt, holding crossed arrows and a shield, or suckling the infant crocodiles — her Fayum maternity. In her primeval form she is the great cow whose body spans the sky, the sun between her horns.",
    reception: "Plutarch’s veiled inscription made her the ancient world’s favourite image of transcendent nature; Renaissance Neoplatonists, Enlightenment freemasonry and even the inscription on early geology societies borrowed ‘no mortal has lifted my veil’. She remains the standard example of a goddess whose cult outlived every dynasty that served her.",
  },

  min: {
    pronunciation: {
      ipa: '/mɪn/ (conventional)',
      ipaLabel: 'Conventional reading — Egyptian vocalisation not attested',
      phonemes: [
        { symbol: 'Mnw', desc: 'Written mnw; conventionally vocalised “Min”. The name relates to mn, “to be firm, enduring”.' },
        { symbol: '', desc: 'Two consonants, one certain vowel: the oldest god of the eastern desert.' },
      ],
      approximation: '“MIN”',
      kin: 'Greek Πᾶν (Pan) in Herodotus’ equation',
      note: 'Herodotus (2.46) says the Egyptians “are the only people who have a Pan” — Min.',
    },
    domains: {
      title: 'God of Fertility, the Eastern Desert, and Male Potency',
      subtitle: 'The Firm One, Lord of the Processions',
      lead: "<p class='lead-text'><strong>Mnw</strong> — Min — is the lightning-rod god of male fertility: erect, flail raised, lettuce-crowned, lord of the desert roads to the Red Sea and of everything that stands firm. The Greeks saw Pan in him; the Egyptians saw the power that makes the land and its people endure — <em>mn</em>, the root of his name, means ‘to remain’.</p>",
      cards: [
        { name: 'The Firm One', desc: 'His name is the verb “to be enduring”; he is the god of what stands fast — harvests, dynasties, erections.', iconPath: 'M32 8V56M32 12L50 22M32 12L14 22M32 34H52M32 34H12' },
        { name: 'Lord of the Desert Roads', desc: 'Master of the eastern highlands and the routes to the Red Sea gold mines.', iconPath: 'M8 48C18 32 26 40 32 32C38 24 46 32 56 16M8 48L56 16M14 52H50' },
        { name: 'Fertility in the Fields', desc: 'The lettuce — an aphrodisiac to the Egyptians — and the flail of the harvest belong to his iconography.', iconPath: 'M32 12C24 18 18 28 18 38C18 48 24 54 32 54C40 54 46 48 46 38C46 28 40 18 32 12ZM32 38V56M24 44H40' },
        { name: 'The Processional God', desc: 'His festival raised his image on its litter in public procession — Egypt’s most ancient god-ritual.', iconPath: 'M16 44H48M20 44L24 28H40L44 44M24 28L32 16L40 28M12 52H52' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>Min has no narrative myth-cycle; his ‘stories’ are the rituals that stage him — the processions, the erect phallus, the lettuce beds of his gardens — and the oldest continuous cult record of any Egyptian god. His mythology is written in the calendar: his great festival closed the harvest and opened the desert’s travelling season.</p>",
      myths: [
        { tag: 'Predynastic Origins', title: 'Older Than the Kings', text: "<p class='myth-text'>Min’s emblem appears on the artefacts of the late Predynastic — the famous Min-standard carved on the maceheads of King Scorpion and Narmer’s age. Before Horus belonged to the king, Min belonged to the land: the lightning-rod, the ithyphallic pillar, the force that stood behind fertility itself.</p>" },
        { tag: 'Festival of Min', title: 'The Procession at the Harvest', text: "<p class='myth-text'>His great festival in the month of Shemu opened with the king cutting a sheaf of emmer — the ‘coming forth of Min’ from his shrine on the shoulders of his priests, carried to the acclaim of the crowd, followed by the ritual release of four wild birds to the four winds. The rite married the harvest to virility: the cut grain and the standing god are one mystery.</p>" },
        { tag: 'Herodotus', title: 'The Only People with a Pan', text: "<p class='myth-text'>Herodotus describes Min’s procession at Chemmis — the carrying shrine, the phallic imagery — and concludes that the Egyptian Min is the original of the Greek Pan, the same god under two names. It is the earliest comparative-religion argument in Western literature, and it was made about Min.</p>" },
        { tag: 'Divine Consort', title: 'Husband of Repyt and Isis', text: "<p class='myth-text'>At Coptos he was paired with the lioness-goddess Repyt, ‘the Weary One’ who nonetheless endures; in the wider Osirian orbit his fertility stands behind Horus’ conception. In the Late Period his statue was carried to the graveyards to visit Osiris — the fertility god paying his respects to the dead one, generation greeting dissolution.</p>" },
      ],
    },
    syncretism: "The Greeks named him Pan without hesitation, and Roman Egypt painted him in both divine dialects at once. Within Egypt he fused with Horus as ‘Min-Horus the victorious’, with Amun-Ra in the Theban Ramesside theology, and with Osiris in the funerary visitations — a god whose essence, enduring potency, annexed whatever it touched.",
    culturalLegacy: "Min’s harvest festival is the ancestor of every ‘first sheaf’ ceremony documented in the Mediterranean; Herodotus’ Pan-equation is still cited as the founding gesture of comparative mythology. Coptos, his city, guarded the desert routes whose exploitation made Egypt’s Eastern Desert gold famous.",
    extendedMeditation: "Mnw: two consonants standing very firmly together. Of all the names in this batch his needs restoration least — Min crossed into Greek and Latin almost unchanged — and that stability is his message: the firm god keeps his form while empires trade his identity between Pan and Min and back again.",
    sources: [
      { name: 'Herodotus, Histories 2.46 (the procession and the Pan-equation)' },
      { name: 'Festival reliefs of the Ramesseum and Medinet Habu (the Min procession)' },
      { name: 'Predynastic Min-standard iconography (Scorpion macehead)' },
      { name: 'Meyer, ‘Min’ in Lexikon der Ägyptologie' },
    ],
    archaeology: "Coptos (Qift) at the Nile’s bend was his city, controlling the desert road to the Red Sea; its temples yielded great Min colossi now in the Ashmolean and Cairo. The Ramesseum’s harvest procession reliefs and Medinet Habu’s festival calendar give his ritual in carved detail, from the cut sheaf to the released birds.",
    cult: "His cult-procession was among Egypt’s oldest public festivals; the pharaoh himself cut the first sheaf before Min’s shrine. In the Late Period, priests carried his statue in a ceremonial circuit of the necropolis — the fertility god blessing the dead with the promise of renewal.",
    iconography: "The ithyphallic mummy-form god, arms raised with flail erect, wearing two tall plumes rising from a red ribbon whose streamers fall behind, standing on a dais hung with lettuce bunches. The Greeks added the syrinx of Pan; the Egyptians never needed it — the plumes were enough.",
    reception: "Pan-Min became a fixture of Greco-Roman Egyptomania, and the frank virility of his images both fascinated and embarrassed early travellers — several of his colossi were re-erected in European museums with discreet repositioning. He is now the standard case-study of how fertility cults met the documentation biases of classical reporters.",
  },

  montu: {
    pronunciation: {
      ipa: '/ˈmɒntuː/ (conventional)',
      ipaLabel: 'Conventional reading — Egyptian vocalisation not attested',
      phonemes: [
        { symbol: 'Mntw', desc: 'Written mnty or mntw; conventionally vocalised “Montu”. The name may mean “the nomad”.' },
        { symbol: '', desc: 'The falcon-headed war-god of the Theban region, older than Amun’s supremacy.' },
      ],
      approximation: '“MON-too”',
      kin: 'Greek Μόνθως (Mónthōs)',
      note: 'His name shares its root with the Arabic-derived “Medamud” — ‘the city of Montu’.',
    },
    domains: {
      title: 'God of War, the Falcon of Thebes',
      subtitle: 'The Nomad, Lord of Medamud and Armant',
      lead: "<p class='lead-text'><strong>Mntw</strong> — Montu — is the ancient falcon of Theban war: older than Amun, harder than victory, the god whose name the great warrior-pharaohs bore as their own. Thutmose III was “the Montu of kings”; before the theology of hidden Amun rose over Thebes, Montu was the city’s first lord of power.</p>",
      cards: [
        { name: 'The War Falcon', desc: 'Falcon-headed lord of battle; his name becomes an epithet of the victorious king himself.', iconPath: 'M12 36C22 24 42 24 52 36M20 36L26 26M32 36V24M44 36L38 26M18 44H46' },
        { name: 'Lord of Thebes', desc: 'His cult centres — Medamud, Armant, Tod — ringed the Theban nome before Amun’s primacy.', iconPath: 'M16 52H48M20 52V30L32 18L44 30V52M28 52V38H36V52M32 18V8' },
        { name: 'The Nomad', desc: 'His name likely means “nomad” — the outsider’s ferocity harnessed to the state’s wars.', iconPath: 'M8 44C18 28 28 36 34 28C40 20 48 26 56 12M8 44L56 12' },
        { name: 'Companion of the King', desc: 'Royal titulary from the Middle Kingdom onward: the pharaoh goes to war as Montu.', iconPath: 'M32 8V56M32 14L52 26M32 14L12 26M32 44H50' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>Montu’s mythology is the mythology of Egyptian victory itself. He has few narrative myths and many battlefields: wherever the king’s chariot charged, Montu charged ahead of it. His theology fused with Ra and with Amun until, in the New Kingdom, he was the war-faculty of the supreme god and the personal patron of the warrior pharaohs.</p>",
      myths: [
        { tag: 'Middle Kingdom', title: 'The First War-God of the State', text: "<p class='myth-text'>When Thebes rose under the Eleventh Dynasty, its local falcon Montu rose with it: Nebhepetre Mentuhotep — ‘Montu is satisfied’ — bore his name as a programme. The reunification of Egypt was, in its official theology, Montu’s victory before it was any king’s.</p>" },
        { tag: 'New Kingdom Annals', title: 'The Montu of Kings', text: "<p class='myth-text'>Thutmose III at Megiddo, Amenhotep II at the Orontes, Ramesses II at Kadesh — the annals cast the king as Montu incarnate, and Montu as the king’s vanguard. The god’s four manifestations — of Thebes, Medamud, Armant and Tod — marched as a squadron in the royal war-poem of the Sphinx Stela.</p>" },
        { tag: 'Fusion with Ra', title: 'Montu-Ra, the Solar Warrior', text: "<p class='myth-text'>As Amun absorbed Thebes, Montu was not displaced but concentrated: fused with Ra he became the sun’s war-power, a disc-crowned falcon whose heat is the battlefield’s. The ‘Lord of Armant’ retained his own great temples and festivals down to the Roman Nile level marks scratched on his columns.</p>" },
        { tag: 'Mythological Combat', title: 'The Enemy of the Chaos Serpent', text: "<p class='myth-text'>In the solar barque’s nightly combat, Montu stands among the defenders of the sun against Apophis — the falcon’s talons against the serpent of the deep. War, in Egyptian theology, is never far from cosmology: every battle rehearses the first victory of order over the uncreated.</p>" },
      ],
    },
    syncretism: "Montu was compounded with Ra (Montu-Ra), with Amun (Amun-Montu of the Karnak processional cycle), and with Horus as the falcon’s fiercer face. The Greeks transliterated him rather than identifying him — Mónthōs — perhaps because no single Olympian covered ‘war as the king’s personal excellence’.",
    culturalLegacy: "His memory is written into the names of three dynasties of kings: Mentuhotep, Montuemhat — ‘Montu is in front’ — remained an aristocratic theophoric into the Late Period. The great war-god’s eclipse by Amun is the standard case-study of how local theologies are absorbed by imperial ones.",
    extendedMeditation: "Mntw: a name that marched. Its restoration in plain letters keeps the cadence of a war-drum — two syllables, no decoration, like the pharaoh’s battle-standard going past. The falcon does not need a diacritic to stoop.",
    sources: [
      { name: 'Sphinx Stela of Amenhotep II (the four Montus)' },
      { name: 'Annals of Thutmose III (Megiddo)' },
      { name: 'Montu temples: Medamud, Armant (el-Tod inscriptions)' },
      { name: 'von Beckerath, ‘Montu’ in Lexikon der Ägyptologie' },
    ],
    archaeology: "His best-preserved temple stands at Medamud north of Thebes; Armant (ancient Hermonthis) was razed for a sugar factory in 1900, but its Bucheum — the catacomb of the sacred Buchis bulls, his oracular emanations — survives in the desert edge. The Tod temple archives preserve his festival calendar in demotic detail.",
    cult: "His sacred animal was the Buchis bull of Armant, chosen by oracular criteria, white as lightning, buried in the great catacomb. His cult was a soldier’s cult: weapon-dedications, victory stelae, and the procession of his barque at the head of the army’s season.",
    iconography: "A falcon-headed man in the solar disc and two tall plumes, brandishing scimitar, spear or khopesh; or the bull Buchis with the sun and two plumes between its horns. His war-cry was written as the hieroglyph of the arm with a stick — the readiest sign in the repertoire.",
    reception: "Greco-Roman visitors recorded his oracular bull without ever quite understanding the falcon behind it; modern scholarship values him as the counterweight to the peaceful image of Egyptian religion — proof that Egypt’s gods included the undisguised theology of victory.",
  },

  nun: {
    pronunciation: {
      ipa: '/nuːn/ (conventional)',
      ipaLabel: 'Conventional reading — Egyptian vocalisation not attested',
      phonemes: [
        { symbol: 'Nnw', desc: 'Written nnw; conventionally vocalised “Nun”. The name is the primeval water itself.' },
        { symbol: '', desc: 'The waters of chaos from which the first mound rose; grammatically masculine here, feminine as Naunet.' },
      ],
      approximation: '“NOON”',
      kin: 'Greek Νηῦν (Nēûn) in the cosmogonic doxographies',
      note: 'Every creation cosmogony begins in Nun; every flood-season re-enacts it.',
    },
    domains: {
      title: 'God of the Primeval Waters',
      subtitle: 'The Inert One, the Flood Before the World',
      lead: "<p class='lead-text'><strong>Nnw</strong> — Nun — is not a god of things but of the nothing before things: the dark, inert, life-teeming water that existed before creation and surrounds the world still. Every cosmogony begins in him; every temple’s holy lake is his miniature; and every year the Nile’s flood re-stages his one eternal act — potential flooding into form.</p>",
      cards: [
        { name: 'The Primeval Water', desc: 'The chaos-flood from which the first mound — and every creator — emerged.', iconPath: 'M8 36C16 30 24 30 32 36C40 42 48 42 56 36M8 46C16 40 24 40 32 46C40 52 48 52 56 46M14 26L16 24M30 22L32 20M46 24L48 22' },
        { name: 'Bearer of the Mound', desc: 'He lifts the ben-ben: the primeval hill on which the creator stood to speak the world.', iconPath: 'M16 48C22 34 28 28 32 26C36 28 42 34 48 48M12 48H52M32 26V14M26 18H38' },
        { name: 'The Ogdoad Pair', desc: 'With Naunet he heads the eight frog- and snake-headed forces of primordial inertness.', iconPath: 'M18 40C18 28 26 20 32 20C38 20 46 28 46 40M12 44C20 40 28 42 32 46C36 42 44 40 52 44M32 20V10' },
        { name: 'Surrounding Ocean', desc: 'The world floats in him as a bubble in a flood; beyond the horizon, Nun resumes.', iconPath: 'M12 32C12 20 22 12 32 12C42 12 52 20 52 32C52 44 42 52 32 52C22 52 12 44 12 32ZM8 32H56M32 8V56' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>Nun’s mythology is Egypt’s creation mythology seen from the water’s side. He never acts — that is his nature, and the meaning of his name, ‘the inert one’ — but everything that acts, acts upon or out of him. The creator gods of every temple city are alike in one thing: they stood on Nun’s surface and spoke.</p>",
      myths: [
        { tag: 'Hermopolitan Cosmogony', title: 'The Ogdoad and the First Mound', text: "<p class='myth-text'>At Hermopolis the theology ran: four frog-headed males and four snake-headed females — Nun and Naunet, Huh and Hauhet, Kuk and Kauket, Amun and Amaunet — swam in the primordial water until their inertness ripened into an egg, or a lotus, or the first mound. From that the sun rose. Nun heads the eight because water is first among the inert things.</p>" },
        { tag: 'Memphite Theology', title: 'The Word Upon the Waters', text: "<p class='myth-text'>The Shabaka Stone’s Memphite account has Ptah conceiving the world in the heart and speaking it on the primeval waters: creation as a command uttered over Nun. The theology made the water the page and the god’s tongue the pen — the deepest Egyptian metaphor for creation as articulation.</p>" },
        { tag: 'Solar Books', title: 'The Sea That Holds the Barque', text: "<p class='myth-text'>In the underworld books the sun’s night barque sails the <em>Nun</em> beneath the world — the primeval water is also the water below, the source of renewal. At dawn the barque re-emerges from Nun’s eastern flood: every sunrise is a re-creation, every night a return to the uncreated.</p>" },
        { tag: 'Flood Theology', title: 'The Inundation as Epiphany', text: "<p class='myth-text'>The Egyptians called the annual flood simply ‘the arrival’; its waters were Nun revisiting the world, refertilising the mound. Temple holy lakes and the ‘Ocean of the Temple’ pools staged the same theology in architecture: a miniature primeval water at the god’s door, in which purity and creation are the same act.</p>" },
      ],
    },
    syncretism: "Nun is the substrate into which every creator-god’s theology sinks its roots: Atum self-created upon him, Amun hidden within him, Ptah speaking over him. In the late period he was invoked as ‘father of the gods’ while remaining, strictly, no-one’s child. Greek cosmologists drew the parallel with their own water-first doxographies — Thales’ ‘all is water’ found its Egyptian precedent in Nun.",
    culturalLegacy: "The image of the world as a bubble of order in an infinite flood passed from Egyptian cosmogony into Hermetic and Gnostic speculation about the deep; and the Nile flood as ‘the return of the uncreated’ remains one of the most quoted ideas in Egyptological writing on time and renewal.",
    extendedMeditation: "Nun is the shortest name with the largest referent in the entire lexicon: the water before names. To write him in ASCII is almost redundant — his element needs no spelling, only sounding. Read the name aloud and you have performed his nature: the open vowel, the held <em>n</em>, the open vowel again — a breathing in and out, the flood arriving and withdrawing.",
    sources: [
      { name: 'Hermopolitan Ogdoad tradition' },
      { name: 'Memphite Theology (Shabaka Stone)' },
      { name: 'Amduat and Book of Gates (the night water)' },
      { name: 'Nilometer and flood inscriptions (the “arrival”)' },
      { name: 'Bonneau, La crue du Nil (flood theology)' },
    ],
    archaeology: "No temple was exclusively Nun’s — water has no address — but every temple carried him: holy lakes, ‘ocean’ basins, and the primeval-mound imagery of the sanctuary floor. The Ogdoad’s frog and snake figures crowd the Late Period faience amulets found across Egypt.",
    cult: "His cult was enacted rather than addressed: the flood’s arrival, the temple lake’s stillness, the purity-ablutions of every priest at dawn. Hymns call him ‘father who revived himself’ — the water that needs no cult because it is the condition of all cult.",
    iconography: "A man waist-deep in water, arms raised to lift the solar barque or the mound — the <em>ḥꜣ</em> gesture of uplift; or one of the Ogdoad’s frog-heads in profile. His hieroglyph is three rippling lines: the same sign that writes water everywhere in the language.",
    reception: "Greek doxographers listed Nun among the ‘Egyptian first-principles’, and the comparison with Thales became a commonplace of ancient philosophy’s self-history. Modern cosmology has its own echo: the quantum vacuum, the sea of potential from which the universe’s mound arose, reads uncannily like Nun re-described in mathematics.",
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
