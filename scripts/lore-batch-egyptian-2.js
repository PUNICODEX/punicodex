#!/usr/bin/env node
/**
 * Lore-catalog merge — Egyptian batch 2 (ascii-restoration 2026-11).
 * Idempotent: existing non-empty entries are NEVER overwritten.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LORE_PATH = path.join(ROOT, 'scripts', 'lore-catalog.json');
const lore = JSON.parse(fs.readFileSync(LORE_PATH, 'utf8'));

const ENTRIES = {
  geb: {
    pronunciation: {
      ipa: '/ɡɛb/ (conventional)',
      ipaLabel: 'Conventional reading — Egyptian vocalisation not attested',
      phonemes: [
        { symbol: 'G-', desc: 'Written gb; the g is a voiced velar stop, the b a voiced bilabial. Conventionally vocalised “Geb”.' },
        { symbol: '-b', desc: 'Final b consonantal; the goose-determinative often accompanies the name.' },
      ],
      approximation: '“GHEB” — one syllable, hard g',
      kin: 'Greek Κῆβ (Kêb)',
      note: 'The goose (gb) is both his sacred animal and a pun on his name — “the Cackler”.',
    },
    domains: {
      title: 'God of the Earth, Its Riches and Its Snakes',
      subtitle: 'The Laughing Earth Beneath the Sky',
      lead: "<p class='lead-text'><strong>Gb</strong> — Geb — is the earth itself as a god: the ground that yields gold and grain, the floor of the world, and father of the third generation of the gods. He lies beneath his sister-wife Nut, parted from her by Shu, and his laughter is the tremor in the ground — the Egyptians heard earthquakes as the earth-god laughing.</p>",
      cards: [
        { name: 'The Earth God', desc: 'The soil, the mines, the buried treasure: everything underfoot is his body and his property.', iconPath: 'M8 44C20 32 44 32 56 44M12 44V56M52 44V56M8 50H56M32 44V56' },
        { name: 'The Cackler', desc: 'His sacred goose gives him the epithet “the Cackler”; his cry was the world’s first sound in some cosmogonies.', iconPath: 'M18 40C18 28 28 20 38 22C46 24 50 32 48 40C46 48 36 52 28 48M42 30L52 24M40 36L54 34M24 44L12 46' },
        { name: 'Father of the Ennead', desc: 'By Nut he fathered Osiris, Isis, Seth, Nephthys, Horus the Elder — the gods whose quarrels drive Egyptian myth.', iconPath: 'M32 10V34M32 16L48 26M32 16L16 26M32 34L20 50M32 34L44 50M32 34V52' },
        { name: 'Judge of the Divine Tribunal', desc: 'He presides over the council of gods in the succession myth of Horus and Seth.', iconPath: 'M32 8V56M32 14L52 26M32 14L12 26M32 40H52M32 40H12' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>Geb’s mythology is the deep structure under the Osiris cycle: the separation of earth and sky that creates the world’s space, and the divine tribunal over which he presides when Horus and Seth dispute the succession. His jealousy of Osiris — in one strand he lies with Nut and fathers the five gods on the forbidden days — is the genealogical knot of the whole pantheon.</p>",
      myths: [
        { tag: 'Heliopolitan Cosmogony', title: 'Parted from Nut', text: "<p class='myth-text'>Born of Shu and Tefnut, Geb and Nut loved without space between them until Shu, on Ra’s command, wrenched them apart — and the world’s breathable distance dates from that separation. Geb’s green fertility and Nut’s starry vault remain arched apart for eternity, the air god’s arms the only thing between them.</p>" },
        { tag: 'Pyramid Texts', title: 'The Five Children on the Epagomenal Days', text: "<p class='myth-text'>Though the birth of the five gods belongs to Nut’s myth, the Pyramid Texts address Geb as their father and as the mountain of the west on which the dead king ascends. ‘You are Geb, the heir of the gods,’ the utterances tell the king — the earth is the ultimate estate of succession.</p>" },
        { tag: 'Contendings of Horus and Seth', title: 'The Tribunal of Geb', text: "<p class='myth-text'>In the New Kingdom narrative of the divine lawsuit, the gods weary of the eighty-year dispute between Horus and Seth and appeal to Geb, who as earth and eldest remaining power hears the case and awards the Two Lands to Horus, assigning Seth to the desert and the thunder — the judicial myth behind the division of the living king from the dangerous margins.</p>" },
        { tag: 'Book of the Dead', title: 'The Earth Receives the Dead', text: "<p class='myth-text'>Spell 125’s negative confession addresses the earth directly — ‘I have not polluted the soil’ — because the soil is Geb’s body and the dead enter it as guests. The grave itself, the shaft and chamber, is a doorway into the god; to be buried was literally to be taken into Geb.</p>" },
      ],
    },
    syncretism: "The Greeks identified Geb with their own earth — Cronos in the common equation, which made mythographic sense of his fatherhood of the divine generation. Through Plutarch this mapping circulated widely, though Egyptian theology itself kept him younger and more fertile than the aged Titan. Roman-period underworld iconography occasionally fuses his image with that of the infernal judge.",
    culturalLegacy: "Geb is less famous than his children but structurally indispensable: every genealogy of the Egyptian gods runs through him. His laughter-as-earthquake remains one of the most charming etiological fragments of Egyptian religion, quoted in every handbook; and his goose still cackles on temple walls at Kom Ombo and Esna.",
    extendedMeditation: "Two letters — gb — hold up the whole world. The restoration is a consonant-pair, and the goose beside it in the hieroglyphic spelling is the vowel the Egyptians did not write. This temple’s name is the shortest in the pantheon, and the heaviest: it is the ground beneath every other name in the lexicon.",
    sources: [
      { name: 'Pyramid Texts (Geb as father and throne-estate)' },
      { name: 'Contendings of Horus and Seth (New Kingdom narrative)' },
      { name: 'Book of the Dead, spell 125 (confession to the earth)' },
      { name: 'Heliopolitan Ennead tradition' },
      { name: 'Plutarch, De Iside et Osiride (Greek identifications)' },
    ],
    archaeology: "Geb appears wherever the earth needs a face: relief programmes at Kom Ombo and Esna show him green-skinned with the goose; the second hypostyle of Karnak’s Khonsu temple and the Barque shrine of Luxor preserve fine Green-God imagery. His goose emblem anchors the corners of temple floor-plans as the four corners of the earth.",
    cult: "No major city was exclusively his — the earth cannot have one owner — but he received regular offering as ‘the house of Geb’ wherever ground was broken, and the royal accession rites included the new king’s enthronement ‘upon the throne of Geb’, the earth itself as the seat of legitimacy.",
    iconography: "A man of green skin and goose-head or with the goose upon his head, lying beneath the arched Nut; in judgement scenes he is seated as president of the divine council. His laughter, when shown, is the hieroglyph of the goose with open beak — the cackle written into his name.",
    reception: "Classical syncretism as Cronos gave him an afterlife in Plutarch and the Hermetica; modern Egyptology treats him as the canonical earth-god of the Ennead and the clearest demonstration of Egyptian theological literalism — the earth is not like a god, it is one.",
  },

  tefnut: {
    pronunciation: {
      ipa: '/ˈtɛfnʊt/ (conventional)',
      ipaLabel: 'Conventional reading — Egyptian vocalisation not attested',
      phonemes: [
        { symbol: 'Tf-', desc: 'Written tfn.t; the name’s root is tf, “to spit” or “to be moist”.' },
        { symbol: '-n-t', desc: 'Conventionally vocalised “Tefnut”; the feminine ending marks her as the moisture-principle.' },
      ],
      approximation: '“TEF-noot”',
      kin: 'Greek Τέφνυς (Téphnys)',
      note: 'Her name belongs to the tf-family: in one cosmogony she and Shu are spat into being by the creator — the moisture and air of the first breath.',
    },
    domains: {
      title: 'Goddess of Moisture, the Dew and the Rain',
      subtitle: 'The Spat-Forth One, Sister of the Air',
      lead: "<p class='lead-text'><strong>Tfnt</strong> — Tefnut — is water in its gentlest forms: the humidity of the first morning of the world, the dew, the rare and precious rain. With her twin Shu, the air, she is the first pair the creator produced — and in the myth that names her, the creator spat them both into existence.</p>",
      cards: [
        { name: 'The First Moisture', desc: 'The humidity that preceded creation’s drying-out; twin and consort of Shu the air.', iconPath: 'M32 10C26 20 22 28 22 36C22 46 26 52 32 52C38 52 42 46 42 36C42 28 38 20 32 10ZM32 40V50' },
        { name: 'The Solar Eye', desc: 'As the Eye of Ra she fled to Nubia in lioness form and had to be fetched back by Thoth or Shu.', iconPath: 'M10 32C20 20 44 20 54 32C44 44 20 44 10 32ZM32 26A6 6 0 1 0 32 38A6 6 0 1 0 32 26' },
        { name: 'Lioness of the Waters', desc: 'Shown as a lioness or lioness-headed woman — the same dangerous femininity as Sekhmet and Bastet.', iconPath: 'M16 30C16 20 24 12 32 12C40 12 48 20 48 30C48 40 40 48 32 48C24 48 16 40 16 30ZM26 28L30 32M38 28L34 32M28 40H36' },
        { name: 'Mistress of the Dew', desc: 'Her moisture is the world’s lubricant — the dew on which the sun’s first dawn condensed.', iconPath: 'M8 44C16 40 24 40 32 44C40 48 48 48 56 44M12 36L14 34M26 32L28 30M44 32L46 30M54 36L56 34' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>Tefnut’s mythology is concentrated at the world’s beginning and in the great Eye-of-Ra cycle. As one of the first two beings she needs few adventures — but the one she has, the flight to Nubia and the embassy that retrieves her, became one of the most told and most illustrated stories of the New Kingdom.</p>",
      myths: [
        { tag: 'Heliopolitan Cosmogony', title: 'The Spat-Forth Pair', text: "<p class='myth-text'>In the Memphite and Heliopolitan accounts the creator — Atum or Ra — produced his first two children by spitting (tf) and sneezing: Tefnut the moisture and Shu the air. Their names are the verbs of that first physiology; the world’s atmosphere is the afterbirth of the god’s own body.</p>" },
        { tag: 'Eye of Ra Cycle', title: 'The Flight to Nubia', text: "<p class='myth-text'>When the creator grew old, men plotted against him — and his Eye, sent to punish them, abandoned her post in fury and fled south as a raging lioness. Egypt withered without her. Shu or Thoth was sent to coax her home with the <em>Destruction of Mankind</em> tale’s rhetoric of flattery; her return, pacified, restores the inundation and the sun’s order.</p>" },
        { tag: 'Leiden Papyrus', title: 'The Return of the Goddess', text: "<p class='myth-text'>The literary composition ‘The Return of the Eye’ gives Tefnut’s wanderings their fullest poetic form — the goddess who leaves, rages, is sung back, and returns transformed from destroyer to blessing. It is the mythic template behind every Egyptian pacification ritual of dangerous goddesses.</p>" },
        { tag: 'Genealogical Theology', title: 'Mother of Nut and Geb', text: "<p class='myth-text'>With Shu she bore Nut the sky and Geb the earth — the second divine generation. As grandmother of Osiris, Isis, Seth and Nephthys she stands at the head of every royal pedigree; the titulary of kings names her among the oldest company of the gods.</p>" },
      ],
    },
    syncretism: "Tefnut merges almost completely with her sister-forms of the solar Eye — Sekhmet, Bastet, Hathor, Mut — each a local face of the one dangerous goddess. Greeks knew her chiefly through Plutarch as one of the primal elements, moisture to Shu’s air; modern study treats her and Shu as the key to Egypt’s ‘physical’ cosmogony, where the first creatures are states of the atmosphere.",
    culturalLegacy: "The spit-and-sneeze cosmogony remains a favourite exhibit of Egyptian theology’s concreteness — the first act of creation as a bodily reflex. Her lioness form fed the iconography of Egyptian goddesses generally; and the Leiden ‘Return of the Eye’ is a set text of Middle Egyptian literature courses for its perfect rhetoric.",
    extendedMeditation: "Tfnt: four consonants, one syllable of certainty. She is the moisture on the name itself — the breath between the consonants that every reader must supply. Restoring her in plain letters keeps the dew exactly where the Egyptians left it: everywhere, and unmarked.",
    sources: [
      { name: 'Heliopolitan and Memphite cosmogonies' },
      { name: 'Book of the Heavenly Cow (Destruction of Mankind)' },
      { name: 'Leiden Papyrus I 384 (Return of the Eye)' },
      { name: 'Pyramid Texts (Shu–Tefnut pair)' },
      { name: 'Plutarch, De Iside et Osiride' },
    ],
    archaeology: "She appears with Shu flanking the solar barque in tomb and temple programmes from the Old Kingdom onward — the twin supports of the sun’s journey. Fine lioness-headed examples survive in the Ramesside temples of the Theban west bank and in the Louvre’s statuary of the solar triads.",
    cult: "Her cult was fused with the Eye-of-Ra complexes: at Leontopolis and in the Mut precincts she received pacification rites, her dangerous return celebrated as the restoration of order. As primal moisture she needed little separate cult — she was already in every breath and every dawn.",
    iconography: "A woman with the head of a lioness, crowned with the sun disc and uraeus when in her Eye aspect, or simply standing beside Shu as half of the first pair. Her skin may be blue-green like watered things; the cobra and lioness share her fiercer representations.",
    reception: "Through Plutarch and the Hermetic element-theories she entered late-antique natural philosophy as the Egyptian ‘moisture principle’. Modern comparative religion uses the Shu–Tefnut pair as the textbook case of a cosmogony built from meteorological personifications.",
  },

  serket: {
    pronunciation: {
      ipa: '/ˈsɜːrkɛt/ (conventional)',
      ipaLabel: 'Conventional reading — Egyptian vocalisation not attested',
      phonemes: [
        { symbol: 'Sr-', desc: 'Written srqt; the name is usually explained as “she who causes the throat to breathe” (s + rḳ + t).' },
        { symbol: '-q-t', desc: 'Conventionally vocalised “Serket”; the q is a voiceless uvular stop.' },
      ],
      approximation: '“SAIR-ket”',
      kin: 'Greek Σελκίς (Selkís)',
      note: 'Her name is a sentence: the scorpion-goddess as the one who lets the poisoned throat breathe again.',
    },
    domains: {
      title: 'Goddess of Scorpions, Poison, and the Protection of the Vulnerable',
      subtitle: 'She Who Causes the Throat to Breathe',
      lead: "<p class='lead-text'><strong>Srqt</strong> — Serket — is the scorpion’s sting turned to medicine: the goddess of venom and its cure. She guards the vulnerable — children, the poisoned, the dead in their most helpless passage — and her scorpion crawls at the feet of kings and coffins alike, holding the poison at bay by its mere presence.</p>",
      cards: [
        { name: 'Mistress of Poison', desc: 'Commander of the scorpion’s sting; her priests were the healers of venom bites.', iconPath: 'M20 40C20 30 28 24 36 26C44 28 48 36 44 44M36 26L34 14M40 28L44 16M32 24L24 14M28 34L14 30M42 38L56 36M26 44L16 52M36 46L36 56' },
        { name: 'Guardian of the Dead', desc: 'One of the four goddesses protecting the canopic chest and the sarcophagus itself.', iconPath: 'M16 20H48V48H16ZM16 20L10 14M48 20L54 14M16 48L10 54M48 48L54 54M32 28V40M26 34H38' },
        { name: 'Protector of Children', desc: 'Her amulets warded nurseries; the scorpion on a wall meant “no venom enters here”.', iconPath: 'M32 12C26 18 22 26 22 34C22 44 26 52 32 52C38 52 42 44 42 34C42 26 38 18 32 12ZM32 40V54' },
        { name: 'The Breathing Throat', desc: 'Her name is a cure: she who lets the constricted throat of the stung breathe again.', iconPath: 'M12 36C20 28 28 28 32 36C36 44 44 44 52 36M12 44C20 36 28 36 32 44C36 52 44 52 52 44M8 28H20M44 28H56' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Serket is a guardian more than a protagonist: she appears wherever protection is most needed, arms outspread over the thing she shields. Her mythic presence clusters around the dying god — she is one of the four goddesses of the canopic equipment in the Osiris cycle — and around the threatened child, above all the young Horus hidden in the Chemmis marshes.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Osiris Cycle', title: 'The Four Guardians of the Dead', text: "<p class='myth-text'>When Isis wrapped the reassembled Osiris, the four great protective goddesses — Isis, Nephthys, Neith and Serket — took station at the corners of his bier and canopic chest. Serket’s scorpion stands for the poisoned threats of the night that must be kept from the god’s body; her arms spread in the ‘Isis-knot’ gesture frame every royal sarcophagus hall.</p>" },
        { tag: 'Metternich Stela', title: 'The Scorpion and the Child Horus', text: "<p class='myth-text'>The great cippi of Horus the child — the Metternich Stela above all — tell how the infant god was stung by a scorpion in the marshes and revived by the divine mother's magic. Serket stands within that cycle as the power over the venom itself: the sting belongs to her, and so, therefore, does its antidote.</p>" },
        { tag: 'Royal Protection', title: 'The Scorpion of the King', text: "<p class='myth-text'>From the earliest dynasties the scorpion guarded the king’s name — King Scorpion of the Predynastic period took the animal as his emblem — and Serket’s image walked at the prow and stern of the royal barque. Her presence converts the desert’s deadliest small killer into a bodyguard.</p>" },
        { tag: 'Funerary Texts', title: 'She Who Waits at the Head of the Bier', text: "<p class='myth-text'>In the tomb, Serket and her three sisters stand at the four sides of the sarcophagus, each uttering protection: ‘I am Serket, I encircle with my protection.’ Her protection is specifically against poison and bite — the everyday killers of the Nile valley made powerless at the moment of greatest vulnerability.</p>" },
      ],
    },
    syncretism: "Serket was early fused with the greater scorpion-powers of the pantheon and by the New Kingdom is barely separable from Isis in her protective aspect; some temples give her a healing consort-form of Horus. The Greeks called her Selkis and kept her as a goddess of the dead; her name entered the magical papyri of late antiquity as a power-word against poison.",
    culturalLegacy: "Her image — woman with a scorpion on her head, arms winged out in protection — is one of the most immediately readable Egyptian glyphs of care. The Metternich Stela and the Horus cippi made her the patroness of a whole genre of healing magic that persisted into Coptic exorcistic texts.",
    extendedMeditation: "Srqt is a name that performs its function: read it, and the throat opens. The scorpion-goddess guards this page as she guarded the bier — quietly, at the corners, with poison turned outward. Plain letters are her amulet: nothing decorative survives translation, but the protection does.",
    sources: [
      { name: 'Metternich Stela (Horus cippus tradition)' },
      { name: 'Pyramid and Coffin Texts (canopic guardians)' },
      { name: 'Book of the Dead (protection formulae)' },
      { name: 'Serket entries in Lexikon der Ägyptologie' },
    ],
    archaeology: "She stands at the corners of Tutankhamun’s canopic shrine — the gilded goddesses of the treasury are among the most photographed objects of Egypt — and in relief on royal sarcophagi from the Old Kingdom onward. Her scorpion emblem marks protective amulets by the thousand in museum collections.",
    cult: "Her healing cult was practical: priests of Serket were invoked for scorpion stings and snakebite, and her stelae stood at settlement edges where the desert’s fauna met the fields. In the necropolis her cult was one of vigil — the eternal night-watch over the dead.",
    iconography: "A woman wearing a scorpion atop her head, arms extended in the protective gesture, sometimes winged; or the scorpion alone with a woman’s head. Her knot-gesture, two arms angled like the <em>tit</em> of Isis, frames coffins and doorways against the entry of venom.",
    reception: "Greek magicians adopted her into the Sethian-Typhonian protection formulae, and her scorpion remains a staple of Egyptological iconography studies as the clearest case of a dangerous animal wholly converted into a protective emblem.",
  },

  serapis: {
    pronunciation: {
      ipa: '/ˈsɛrəpɪs/ (conventional)',
      ipaLabel: 'Conventional reading — Greek form of an Egyptian name',
      phonemes: [
        { symbol: 'Sar-', desc: 'Egyptian wsjr-ḥp “Osiris-Apis”, Hellenised as Σάραπις (Sárapis).' },
        { symbol: '-ā-pis', desc: 'The Greek ending replaces the Egyptian ḥp (“Apis”); Latin gives Serapis.' },
      ],
      approximation: '“SAIR-uh-piss”',
      kin: 'Egyptian Wsjr-Ḥp “Osiris-Apis” · Greek Σάραπις',
      note: 'A constructed name: the Ptolemaic fusion of the dead Osiris with the living bull Apis.',
    },
    domains: {
      title: 'The Composite God of the Ptolemaic Age',
      subtitle: 'Osiris-Apis, Lord of the Serapeum',
      lead: "<p class='lead-text'><strong>Serapis</strong> is Egypt’s most deliberate theological construction: the god the Ptolemies built to rule a bilingual empire. Osiris-Apis — the dead bull of Memphis — was given Greek looks and Greek mystery-cult dignity, and became the patron of Alexandria, the granary of the Mediterranean, and finally a god of the entire Roman world.</p>",
      cards: [
        { name: 'Osiris-Apis', desc: 'The fusion of the dead Osiris with the Apis bull of Memphis — afterlife power in bovine form.', iconPath: 'M18 34C18 24 26 16 36 18C46 20 50 30 46 38C42 46 30 48 24 42M40 22L52 16M36 18L34 8M44 26L56 24M22 38L10 40' },
        { name: 'Lord of Alexandria', desc: 'His great Serapeum towered over the harbour city; its library annexe made him a god of learning.', iconPath: 'M16 52V28L32 16L48 28V52M24 52V36H40V52M12 52H52M32 16V8' },
        { name: 'God of Fertility and Grain', desc: 'Patron of the Nile’s harvest and the grain fleets; his modius of grain crowns his head.', iconPath: 'M32 12V30M32 12C24 16 18 24 18 32C26 30 31 22 32 12ZM32 12C40 16 46 24 46 32C38 30 33 22 32 12ZM16 40H48M20 48H44M24 56H40' },
        { name: 'The Mystery God', desc: 'His cult carried Egyptian afterlife promises in Greek initiatory form — a blueprint for later mystery religions.', iconPath: 'M32 8L50 20V44L32 56L14 44V20L32 8ZM32 8V56M14 20L50 44M50 20L14 44' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Serapis has no native myths of his own — he was assembled, not born. His ‘mythology’ is the history of a political-theological project: the Ptolemaic state needed one god Greeks and Egyptians could share, and the priests of Memphis supplied the old, deep name — Osiris-Apis — while the court supplied the face, the cult, and the capital.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Ptolemaic Foundation', title: 'The Dream of Ptolemy I', text: "<p class='myth-text'>The foundation legend — told by Plutarch and Tacitus — has the new cult revealed to Ptolemy I in a dream: bring the image of an unknown god from Sinope on the Black Sea to Alexandria. Whether history or court theology, the story gave the composite god an oracular pedigree worthy of both his constituencies.</p>" },
        { tag: 'Memphite Origin', title: 'The Apis Bull Becomes Osiris', text: "<p class='myth-text'>The real root is older than the Ptolemies: when the living Apis bull of Memphis died, it was mummified as ‘Osiris-Apis’ — the godhead absorbed into the underworld lord. The Serapeum at Saqqara, the bull’s catacomb-mausoleum, held the mummies of centuries; Serapis is that ancient fusion wearing a Greek himation.</p>" },
        { tag: 'Serapeum of Alexandria', title: 'The God of the Learning City', text: "<p class='myth-text'>Alexandria’s Serapeum — part temple, part library annex, part tourist wonder — made Serapis the patron of the world’s scholarship. Pilgrims and students alike worshipped under its colonnades; the god’s temple was the city’s landmark until its destruction in 391 CE under Theophilus.</p>" },
        { tag: 'Roman Empire', title: 'The God Who Crossed Every Border', text: "<p class='myth-text'>From Alexandria the cult travelled with the grain fleet: Serapea rose in Ostia, Rome, and every port of the Mediterranean. The god promised initiation, protection in life, and a dignified afterlife — the most successful Egyptian export since the pyramid shape, and a direct ancestor of the Isis-cult’s empire-wide success.</p>" },
      ],
    },
    syncretism: "Serapis IS syncretism — a god whose entire existence is the identification of Osiris, Apis, Zeus, Hades, Dionysus and Asclepius in one image. His standard type deliberately quotes the Olympian Zeus for authority and the underworld Hades for function; the modius of grain and the Cerberus at his feet keep the chthonic half visible.",
    culturalLegacy: "He is the case-study of religious engineering: how a state builds a god. His cult outlasted the dynasty that made him by four centuries, and the destruction of his Alexandria Serapeum in 391 CE is conventionally marked as the end of classical paganism’s public life in the city that had defined it.",
    extendedMeditation: "A name assembled from two older names — wsjr and ḥp — Serapis is proof that the Egyptian habit of joining gods was still alive when Greek letters took over the job. Restored in Latin letters, he carries his whole biography in his spelling: an Egyptian core, a Greek middle, a Roman afterlife.",
    sources: [
      { name: 'Plutarch, De Iside et Osiride (foundation legend)' },
      { name: 'Tacitus, Histories 4.83–84 (the Sinope statue)' },
      { name: 'Serapeum stelae and Apis embalmment records (Saqqara)' },
      { name: 'Fraser, Ptolemaic Alexandria (cult history)' },
      { name: 'Borgeaud & Volokhine, “La formation de la légende de Sarapis”' },
    ],
    archaeology: "The Saqqara Serapeum’s bull galleries — rediscovered by Mariette — are among the strangest monuments of Egypt: cathedral-scale tunnels of granite sarcophagi, each once holding a mummified Apis. Alexandria’s Serapeum survives only in the ‘Pompey’s Pillar’ precinct and papyrus, but its daughter-temples across the Mediterranean stand in Delos, Ephesus and Roman Ostia.",
    cult: "His cult followed the Greek model — priests, processions, initiation — while keeping Egyptian priestly control at Memphis and Canopus. The annual procession of the god’s image through Alexandria was one of antiquity’s great public spectacles; Hadrian built him a villa-temple at Tivoli as the Empire’s house-god.",
    iconography: "A majestic bearded man in Greek style, enthroned with Cerberus at his feet, a <em>modius</em> (grain-measure) on his head as crown. The type is Zeus for the upper half, Hades for the lower, and the modius marks the granary of the world — three gods in one silhouette.",
    reception: "For the Church Fathers Serapis was the archetype of pagan Alexandria — his fall in 391 was celebrated as the triumph of the cross. For modern scholarship he remains the paradigmatic ‘political god’, and the debate over whether he was Ptolemaic invention or Memphite survival still frames every study of cultural translation in the Hellenistic world.",
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
