/**
 * Bespoke scholars sections for the 39 new flagships: epithets (all entries),
 * plus 'homeric-hymns' and 'oracle-sites' where historically accurate.
 * Written directly into platform/scholars/content/{id}.json by
 * apply-bespoke.js with bespoke: true (preserved by the fill-only-missing
 * generator). Bodies are markdown in house style; sources are citations.
 */

module.exports = {
  achilleus: {
    epithets: {
      body: `Homer frames him with a small, fixed set of formulae that every listener knew.

- **Ποδώκης (Podṓkēs)** — 'swift-footed'; his most constant epithet, used even at the moment of his death.
- **Πηλεΐδης (Pēleïdēs)** — 'son of Pēleús'; the patronymic that ties him to the mortal line.
- **Αἰακίδης (Aiakídēs)** — 'descendant of Aiakos'; the grander lineage-name, reaching back to Zeús.
- **θεοῖς ἐπιείκελος (theoîs epiéikelos)** — 'like the gods'; the comparison the poem grants and withdraws.
- **δῖος (dîos)** — 'brilliant, godlike'; the generic heroic epithet he shares with Odysseus alone.

The formulae are not ornament: in oral verse they are the meter's building blocks, and Achilleús owns more of them than any hero of the cycle.`,
      sources: [{ citation: 'Homer, Iliad, passim (Milman Parry, L\'épithète traditionnelle).' }],
    },
    'oracle-sites': {
      body: `Achilleús received hero-cult at two remarkable addresses. In the **Troad**, his tomb-tumulus (Sivri Tepe) was a pilgrimage goal: Alexander sacrificed there, and Roman emperors followed. More famous was **Leukē**, the White Island at the Danube's mouth, where Arrian reports a temple, a statue, and offerings left by sailors who believed the hero still feasted there with Helen. Games were held in his honour, and the island's snakes were kept as his sacred animals. At **Phthiā** in Thessaly, his homeland kept his memory as the local hero par excellence, and Sparta's Amyklai later claimed a share of his cult.`,
      sources: [{ citation: 'Arrian, Periplus of the Euxine Sea 21–23; Pausanias 3.19.' }],
    },
  },

  asklepios: {
    epithets: {
      body: `The healer's titles map the geography and the ethics of his cult.

- **Σωτήρ (Sōtḗr)** — 'the Saviour'; the title under which whole cities prayed to him in plague.
- **Παιάν (Paiā́n)** — 'the Healer'; the paean-cry of the therapeutic liturgy, shared with Apóllōn.
- **Ἀλεξίκακος (Alexíkakos)** — 'Averter of Evil'; his apotropaic face in civic cult.
- **Ἐπιδαύριος (Epidaúrios)** — 'of Epidaurus'; the sanctuary-title carried wherever his cult spread.
- **Αὔλιος (Aúlios)** — 'of the Court'; his title at Sparta as house-physician of the state.

In Rome the same god signed as Aesculapius Augustus — the healer raised to imperial rank.`,
      sources: [{ citation: 'Edelstein & Edelstein, Asclepius: Testimonies (1945).' }],
    },
    'homeric-hymns': {
      body: `The sixteenth Homeric Hymn is addressed to him entire: "I begin to sing of Asklēpiós, physician of diseases, son of Apóllōn, whom Korōnis bore in the Dotian plain — a joy to mortals, a soother of cruel pains." The brevity of the hymn (five lines) matches the god's character: he needs no narrative, only the office. The hymn's pairing of craft and compassion — the healer as a gift rather than a hero — became the template for the Hippocratic ideal, and the paean sung at his incubation sanctuaries borrowed its meter directly from the Homeric tradition.`,
      sources: [{ citation: 'Homeric Hymn 16 (to Asclepius).' }],
    },
    'oracle-sites': {
      body: `His sanctuaries were medicine's first hospitals. **Epidaurus**, the mother-shrine, drew patients from the whole Mediterranean; its abaton dormitory, tholos, stadium, and theatre survive as the complete ancient therapeutic landscape. **Kos** joined the cult to the Hippocratic school; its terraced Asklepieion overlooks the straits to Asia Minor. **Pergamon** became the empire's second Epidaurus — Galen's home ground — with its own theatre and sacred spring. In Rome, the **Tiber Island** temple (from 291 BCE) turned the cult's founding legend into urban geography: the island was later shaped and paved as a ship, with an obelisk for a mast.`,
      sources: [{ citation: 'Pausanias 2.26–27; Edelstein, Asclepius vol. I.' }],
    },
  },

  atropos: {
    epithets: {
      body: `Átropos' titles are statements of function rather than cult.

- **Ἄτροπος** — 'she who may not be turned'; the name itself, from ἀ-τρέπω, is her first epithet.
- **ἡ πρεσβυτάτη** — 'the eldest'; Plato and later tradition make her senior of the three Moirai.
- **Μοῖρα** — 'the Portion'; the generic title she shares with her sisters, the Apportioners.
- **Morta** — her Roman name among the Parcae, from mors: the Latin speakers heard death in her directly.

The Greeks gave her almost no cult, and that absence is itself the testimony: what cannot be turned cannot be persuaded, so she received no prayers.`,
      sources: [{ citation: 'Plato, Republic 617c; Hesiod, Theogony 217–222, 904–906.' }],
    },
    'oracle-sites': {
      body: `The Moirai's few sanctuaries are revealing. Pausanias records an **altar to the Fates beside the sanctuary of Despoina** in Arcadia — chance admitted to the holiest mystery cult as a subsidiary power. In Corinth and elsewhere they appear with Zeús **Moiragétēs**, 'leader of the Fates' — the theology that subordinates them to the sky-god's will. Their truest shrine is the spindle-whorl itself: dedications of spinning tools in temple deposits show that Greek women offered the instruments of the Fates' own craft to the goddesses of craft, Athena and Artemis, in their name.`,
      sources: [{ citation: 'Pausanias 8.37; on Zeus Moiragetes, see the Attic inscriptions.' }],
    },
  },

  delos: {
    epithets: {
      body: `The island collected poetic names the way other islands collected harbours.

- **Ἀστερία (Astería)** — 'the Starry One'; her oldest name, from the wandering light she was before her anchoring.
- **Ὀρτυγία (Ortygía)** — 'Quail Island'; the Homeric name for her sister Rheneia, often extended to Dêlos herself.
- **Κυνθία (Kynthía)** — 'of Mount Kynthos'; the hill-title shared with her twins (Apóllōn Kynthios, Ártemis Kynthía).
- **ἱερή (hierḗ)** — 'the holy'; her standing epithet in the historians, the island that is a sanctuary entire.
- **ἄσειστος** — 'the unshaken'; the ancient boast that, though tiny, she never knew an earthquake.`,
      sources: [{ citation: 'Callimachus, Hymn to Delos; Pindar, on the anchoring of the island.' }],
    },
    'homeric-hymns': {
      body: `The Homeric Hymn to Delian Apóllōn is the island's foundation charter in verse. It stages the dialogue in which Dêlos, afraid the god will spurn her barrenness, extracts his oath that he will build his temple there; it narrates Lētō's nine-day labour, with all the goddesses gathered while Hēra withholds Eileithyia; and it closes with the Delian maidens' song — the first hymn-choir described in Greek literature. The hymn's geographical catalogue of the lands that refused Lētō is the oldest literary map of the Aegean, and its promise — that Dêlos will be famed forever — the island fulfilled.`,
      sources: [{ citation: 'Homeric Hymn to Apollo (Delian part), 1–178.' }],
    },
    'oracle-sites': {
      body: `The **sanctuary of Apóllōn** occupied the island's heart: three successive temples to the god, the colossal kouros dedicated by the Naxians, the Altar of Horns built — the myth said — by Apóllōn himself from the horns of Ártemis' goats. The **Terrace of the Lions** guarded the processional way to the Sacred Lake, and the **House of the Naxians** and the later Agora of the Italians mark the shift from pilgrimage to trade. Beyond the lake stood the sanctuaries of the foreign gods — Syrian, Egyptian, Samaritan and Jewish — that made Roman Dêlos a museum of Mediterranean religion on one bare rock.`,
      sources: [{ citation: 'Bruneau & Ducat, Guide de Délos (École française d\'Athènes).' }],
    },
  },

  drakon: {
    epithets: {
      body: `The Greek dragons bear epithets of place and of vigilance.

- **Πύθων (Pýthōn)** — 'the Rotter'; the Delphic serpent named from Apóllōn's taunt, "rot here."
- **Λάδων (Ládōn)** — the Hesperides' warden, named from the river of the far west he coils beside.
- **ἀκάματος** — 'unsleeping'; Apollonius' standing epithet for the Kolchian dragon — the watcher that never rests.
- **Ἰσμήνιος** — 'of the Ismēnós'; the Theban dragon's spring-title, tying him to the city's founding water.
- **δράκων** itself — 'the sharp-sighted', from δέρκομαι: the functional epithet that became the species.`,
      sources: [{ citation: 'Homeric Hymn to Apollo 300–374; Apollonius, Argonautica 2, 4.' }],
    },
    'homeric-hymns': {
      body: `The Homeric Hymn to Apóllōn gives the genre's great dragonslaying: the god, seeking an oracle-site, finds the spring at Krisa guarded by "a great blooded she-dragon, a monster," who had been nurse to Typhaon and scourge of the flocks. Apóllōn's arrow kills her, and he speaks the etymology like a curse: "Now rot here (πυθεῦ) upon the fruitful soil" — whence Pythō, the Pythia, and the Pythian games. The hymn then folds the slaying into the sanctuary's charter: because she died there, the god's oracle stands there — the Greek pattern in which every holy place stands on a dragon's grave.`,
      sources: [{ citation: 'Homeric Hymn to Apollo 300–374.' }],
    },
  },

  monokeros: {
    epithets: {
      body: `The one-horned beast collected names in four languages.

- **ὁ Ἰνδικὸς ὄνος** — 'the Indian ass'; Ktēsias' original description, the report before the legend.
- **μονόκερως** — 'the single-horned'; the Greek zoological term, used soberly by Aristotle.
- **monoceros / unicornis** — the Latin continuations, Pliny's "fiercest animal."
- **re\'em** — the Hebrew wild ox whose Septuagint translators chose monokeros, giving the beast its biblical career.
- **alicorn** — the medieval name for the horn itself, when the substance became more valuable than the animal.`,
      sources: [{ citation: 'Ctesias, Indika F45; Aristotle, History of Animals 499b; Pliny, NH 8.76.' }],
    },
    mythology: {
      addMyth: { tag: 'The Hunt', title: 'The Virgin Stratagem', text: `<p class='myth-text'>The Physiologos — the early Christian bestiary — added the capture-scene that made the legend medieval: the unicorn, uncatchable by any hunter, will run to a virgin seated in the forest and fall asleep in her lap, where the hunters take it. The allegory wrote itself: the horn the single nature, the virgin Mary, the capture the Incarnation — and the Greek traveler's report became the Middle Ages' most painted animal, from the Unicorn Tapestries to the royal arms of Scotland.</p>` },
    },
  },

  phanes: {
    epithets: {
      body: `The Orphic tradition gives him more names than any other god — the theology of the many-named first principle.

- **Πρωτόγονος (Prōtógonos)** — 'First-born'; his formal title in the Derveni papyrus and the Rhapsodies.
- **Ἠρικεπαῖος (Ērikepaîos)** — the untranslatable ritual name, possibly 'life-giver'; his mystery invocation.
- **Φαέθων (Phaéthōn)** — 'the Shining'; the name his own name glosses.
- **Μῆτις (Mêtis)** — 'Counsel'; the Orphic equation of first light with first wisdom.
- **Ἔρως (Érōs)** — Hesiod's oldest power, absorbed into the Orphic first god.
- **Διόνυσος (Diónysos)** — in the Orphic succession, Phánēs is Dionysos in his first, pre-Zagreus form.`,
      sources: [{ citation: 'Orphic Fragments (Kern) 60–167; Derveni Papyrus col. XIII–XXVI.' }],
    },
    mythology: {
      addMyth: { tag: 'The Tablets', title: 'Instructions for the Dead', text: `<p class='myth-text'>The Orphic gold tablets, buried with initiates from Thessaly to South Italy, coach the soul for the underworld: avoid the spring of forgetfulness, drink from the lake of memory, and say to the guardians, "I am a child of Earth and starry Heaven; but my race is of Heaven alone." The tablets never name Phánēs — but their cosmology is his: the initiate's soul, like the first-shining one, claims descent from light, and the journey of the dead replays the hatching of the world.</p>` },
    },
  },

  pegasos: {
    epithets: {
      body: `The horse's titles trace his route from the Gorgon's neck to Olympos' stables.

- **Γοργόπαις** — 'Gorgon-born'; the myth's reminder that he sprang from Médousa's blood.
- **Ἱπποκρήνης ποιητής** — 'maker of the Horse Spring'; the poets' title for the hoof that struck Helikṓn.
- **κεραυνοφόρος** — 'thunder-bearer'; Hesiod's description of his Olympian office for Zeús.
- **Βελλεροφόντος ἵππος** — 'Bellerophōn's steed'; the hero-story's claim on him.
- **Κορίνθιος** — 'the Corinthian'; the coinage's title, three centuries of silver stamped with his flight.`,
      sources: [{ citation: 'Hesiod, Theogony 280–286; Pindar, Olympian 13.' }],
    },
    'oracle-sites': {
      body: `His sanctuary is a fountain. **Peirene** at Corinth — the spring where Athēnā's bridle caught him and where Bellerophōn drank him — was the city's sacred heart from the Archaic period, rebuilt with apsidal chambers by the Romans and still flowing in the forum today. On **Helikṓn**, the Hippocrene spring he struck from the rock became the Muses' own water: the grove of the Muses above it, with its statues of poets from Homer to the Roman emperors described by Pausanias, was antiquity's shrine to inspiration, all founded on a hoofprint.`,
      sources: [{ citation: 'Pausanias 2.31 (Peirene), 9.31 (Helikon).' }],
    },
  },

  seiren: {
    epithets: {
      body: `The lyric and dramatic tradition names the Sirens by their voices.

- **λιγύριαι (ligýriai)** — 'clear-toned'; the standing Homeric epithet of their song.
- **Θελξιέπεια (Thelxépeia)** — 'Soothing-Words'; one of the three Sirens named in later lists.
- **Μολπή (Molpḗ)** — 'Song'; another of the named three — the art itself as a name.
- **Ἀχελῳάδες (Akhelōiádes)** — 'daughters of Achelōos'; the river-lineage that ties them to water.
- **Μουσικαί** — 'the musical ones'; the title their Muse-mother gives them in the Argonaut tradition.`,
      sources: [{ citation: 'Apollodorus, Epitome 7.18; Euripides, Helen 167–178.' }],
    },
    mythology: {
      addMyth: { tag: 'The Maidens', title: 'Companions of Persephonē', text: `<p class='myth-text'>The fullest genealogy makes them the girlhood companions of Persephonē: they were playing with her in the meadow when Hádēs struck, and they asked the gods for wings to search the world for her. In Ovid's telling their transformation is their answer to failure — half bird, half maiden forever, still calling across the sea for the lost girl. The myth explains everything about them: the song that stops ships is a search that never ended, and the sailors it kills are drowned in someone else's grief.</p>` },
    },
    'oracle-sites': {
      body: `The Sirens' geography is the Odyssey's mapped onto real water: the **Sirenusae** — the Li Galli islets off the Sorrentine peninsula — were pointed out to Roman travelers as their meadow, and Strabo records the local traditions of a temple of Athēnā on the cape founded by Odysseus himself. Their true sanctuaries, however, were tombs: in South Italy, Sirens were carved on funerary monuments as musicians of the dead — the bird-maidens who sing the soul across the other, greater sea. The British Museum's famous Odysseus stamnos and the Paestum tomb-paintings preserve this cult face of the enchantresses.`,
      sources: [{ citation: 'Strabo 5.4.8; on funerary Sirens, see the South Italian tomb corpora.' }],
    },
  },

  troia: {
    epithets: {
      body: `The city's Homeric epithets became its permanent titles.

- **Ἴλιος / Ἴλιον (Ílios / Ílion)** — the city's other Greek name, from its founder Ilos.
- **ἐριβῶλαξ** — 'of the rich soil'; Homer and Virgil both keep the title.
- **εὐτείχητος** — 'well-walled'; the walls of Poseidṓn and Apóllōn in a single word.
- **ἱερή** — 'holy'; her standing epithet in the epic tradition.
- **Wilusa** — her name in the Hittite archives: the Bronze Age city's own documentation, matched to (W)ilios by a century of scholarship.
- **Troia sacra** — 'sacred Troy'; the Roman pilgrim-title of the ruin that became a shrine.`,
      sources: [{ citation: 'Homer, Iliad, passim; Hittite letter corpora (Wilusa).' }],
    },
    'oracle-sites': {
      body: `The ruin itself became the sanctuary. The **temple of Athēnā Ilias** stood on the citadel of the Hellenistic-Roman Ilion, and the Ilians showed visitors the sites of the war: the tombs of Achilleús, Pátroklos, and Ajax on the shore, the Scaean Gate, the plain of the battles. Xerxes sacrificed a thousand oxen to Athēnā Ilias before crossing to Greece; Alexander ran naked around Achilleús' tomb and took the "shield of Achilleús" from the temple. New Ilion's magistrates minted coins showing Ganymede and the Judgment of Paris — the city administering its own myth for a thousand years after the fall.`,
      sources: [{ citation: 'Herodotus 7.43; Arrian, Anabasis 1.11–12; Strabo 13.' }],
    },
  },

  tyche: {
    epithets: {
      body: `Chance accumulated titles as fast as temples.

- **Ἀγαθή (Agathḗ)** — 'the Good'; the standing civic epithet, Týchē Agathḗ of the altars.
- **Σώτειρα (Sṓteira)** — 'the Saviour'; Pindar's elevation of chance to a saving power.
- **Αὐτοματία (Automatía)** — 'the Self-Acting'; her cult title where the Stoic debate sharpened.
- **Εὔπλοια (Eúploia)** — 'Fair Voyage'; her harbour title at the Piraeus and the sea-towns.
- **Ἀκραία (Akraía)** — 'of the Heights'; her citadel title in the Peloponnese.
- **Fortuna** — her Roman fusion-name, older than Týchē's Greek cult and heir to it all.`,
      sources: [{ citation: 'Pindar, Olympian 12; Pausanias on the civic Tychai.' }],
    },
    'oracle-sites': {
      body: `Two sanctuaries define her worship. The **Tycheion of Antioch**, housing Eutychides' bronze, stood at the city's heart — the seated Fortune with her river-swimmer, the most copied civic image of the ancient world. **Praeneste** (Palestrina) held the oracle of Fortuna Primigenia: a mountainside sanctuary of seven terraces where the sortes — oak lots drawn by a child — answered questions for six centuries, and where the so-called "Barberini mosaic" of the Nile was set into the sanctuary floor. Cicero discusses its lots seriously; Caracalla consulted them; the sanctuary's ruins still crown the town.`,
      sources: [{ citation: 'Cicero, De Divinatione 2.85–87; on Praeneste, the sanctuary publications.' }],
    },
  },

  diana: {
    epithets: {
      body: `Her Roman titles map her provinces.

- **Trivia** — 'of the Three Ways'; the crossroads goddess, where moon, hunt, and underworld meet.
- **Lucina** — 'she who brings to light'; the childbirth power she shares with Iūnō.
- **Nemorensis** — 'of the Grove'; her Nemi title, the one Frazer made famous.
- **Opifera** — 'bringer of aid'; her title as the plebeians' helper.
- **Luna** — the moon itself; her celestial name in the poets.
- **Regina Nemorum** — 'queen of the groves'; Horace's title for her.`,
      sources: [{ citation: 'Horace, Carmen Saeculare; Catullus 34 (Diana\'s hymn).' }],
    },
    'oracle-sites': {
      body: `**Nemi** — the sanctuary of Diana Nemorensis in the Alban Hills — was her most famous address: a temple-precinct with theatre and baths above the crater-lake called her Mirror, where the rex Nemorensis kept his murderous watch and where Caligula later floated his pleasure barges. On the **Aventine** in Rome, her federal temple anchored the Latin League and housed the league's bronze law-pillar, copied by Dionysius. Across Latium her sanctuaries marked the old federal roads — at Aricia, at Tusculum, on Mount Tifata — the network of a goddess older than Rome herself.`,
      sources: [{ citation: 'Strabo 5.3.12; Dionysius 4.26; the Nemi excavation reports.' }],
    },
  },

  ianus: {
    epithets: {
      body: `His titles are the grammar of the threshold.

- **Geminus** — 'the Twin'; the Forum shrine's name, the two faces as one god.
- **Bifrons** — 'Two-faced'; the poets' standing epithet.
- **Patulcius** — 'the Opener'; paired in the old formulae with Clusius, 'the Shutter.'
- **Iunonius** — 'of the Kalends'; Macrobius explains: the month's opening day is his.
- **Consivius** — 'of sowing'; the title under which beginnings are agricultural as well as temporal.
- **Pater** — 'the Father'; the oldest invocations call him simply the god who was there first.`,
      sources: [{ citation: 'Ovid, Fasti 1; Macrobius, Saturnalia 1.9.' }],
    },
    'oracle-sites': {
      body: `The **Ianus Geminus** in the Roman Forum — the gated shrine between the Curia and the comitium — was less a temple than a state instrument: its bronze doors, open in war and closed in peace, were Rome's public barometer for seven centuries. A second gate-shrine stood on the **Janiculum**, the hill across the Tiber that bears his name, guarding Rome's western approach. The gates themselves are described from Augustus to Procopius; their loss is one of the Forum's small archaeological griefs — the god of doors has no door left standing.`,
      sources: [{ citation: 'Livy 1.19; Augustus, Res Gestae 13; Procopius, Gothic War 5.25.' }],
    },
  },

  iuno: {
    epithets: {
      body: `Her titles form a complete biography of Roman womanhood and statecraft.

- **Regina** — 'the Queen'; her Capitoline title as consort of the Optimus Maximus.
- **Lucina** — 'she who brings to light'; the goddess of childbirth, invoked by name in labour.
- **Moneta** — 'the Warner'; from the geese of 390 BCE — and hence, from her mint, the world's word for money.
- **Caprotina** — 'of the wild fig'; her July festival title, when slave-women feasted under the tree.
- **Sospita** — 'the Saviour'; her Lanuvium title, with the serpent and the goat-skin.
- **Curitis** — 'of the spear'; her warrior title among the Sabines.`,
      sources: [{ citation: 'Ovid, Fasti 3 and 6; Cicero, De Divinatione 1.101.' }],
    },
    'oracle-sites': {
      body: `The **temple of Iūnō Moneta** crowned the Arx of the Capitol from 344 BCE — vowed after the Gaulish alarm her geese had given — and the Roman mint worked beside it for centuries, which is why money is named for her. **Lanuvium** kept her oldest Latin cult: Iūnō Sospita, whose annual serpent-rite (a virgin offering barley-cakes to the sacred snake, innocence proven by its acceptance) Cicero discusses as a matter of public record. **Carthage's** Caelestis, the Punic queen Rome imported after the city's fall, filled the temple on the Aventine and lasted, Augustine complains, into his own lifetime.`,
      sources: [{ citation: 'Cicero, De Divinatione 1.79 (Lanuvium); Livy 7.28 (Moneta).' }],
    },
  },

  iuppiter: {
    epithets: {
      body: `Rome's god accumulated titles the way the city accumulated provinces.

- **Optimus Maximus** — 'Best and Greatest'; the Capitoline title, the state's formal address to him.
- **Feretrius** — 'of the Spoils'; the small, ancient Capitoline shrine of the spolia opima.
- **Capitolinus** — 'of the Capitol'; his civic residence-title.
- **Stator** — 'the Stayer'; Romulus' vow-title, the god who stops the rout.
- **Tonans** — 'the Thunderer'; Augustus' title after his narrow escape from lightning.
- **Lapis** — 'of the Stone'; the flint-oath, his most legal aspect.
- **Invictus** — 'the Unconquered'; the late-antique warrior-title.`,
      sources: [{ citation: 'Livy 1.12 (Stator), 10.28–29; Suetonius, Augustus 29 (Tonans).' }],
    },
    'oracle-sites': {
      body: `The **Capitoline temple** — Iuppiter Optimus Maximus Capitolinus — was Rome's religious centre of gravity: vowed by the last kings, dedicated in 509 BCE as the Republic's first act, rebuilt after the fires of 83 BCE and 69 CE, its gilded doors and triple cella described by a dozen ancient authors. The small shrine of **Iuppiter Feretrius** beside it was said to be the city's first temple of all, founded by Romulus for the spoils of kings. In the provinces, his **Jupiter-columns** of the Rhineland and the legionary shrines of Dolichenus from Britain to Syria map the god's imperial diaspora in stone.`,
      sources: [{ citation: 'Dionysius 4.61; the Capitoline excavation reports (Pietrangeli).' }],
    },
  },

  neptunus: {
    epithets: {
      body: `His Roman titles keep the memory of the land-water god under the sea-god.

- **Equester** — 'of the Horses'; his cult title at the Circus altar, shared with Consus.
- **Pelagius** — 'of the Open Sea'; the sea-faring title of the empire's sailors.
- **Ennosigaios** — 'Earth-Shaker'; Poseidṓn's Homeric title, translated and kept.
- **Pater** — 'the Father'; the old Italic water-father of the springs.
- **Dominus maris** — 'lord of the sea'; the imperial poets' full style.`,
      sources: [{ citation: 'Varro and Festus on Neptunus Equester; Horace, Odes 1.5.' }],
    },
    'oracle-sites': {
      body: `His Roman temple stood by the **Circus Flaminius**, restored under the empire and tied to the horse-cult of the Consualia; the Neptunalia arbours of July 23 filled the fields around it. At **Ostia**, the harbour city's sailors kept his cult in the corporations' clubhouses, and the great marine mosaics of the baths show his thiasos exactly as the sailors imagined him. In the provinces his altars line the sea-roads: the Boulogne altar of the Classis Britannica and the curse-tablets of Britain's waters record the empire's vows to the god of crossings.`,
      sources: [{ citation: 'The Ostia mosaic corpora; CIL XIII (Boulogne altar).' }],
    },
  },

  vulcanus: {
    epithets: {
      body: `His titles divide, as he does, between the dangerous fire and the tamed.

- **Mulciber** — 'the Softener'; the smith's title, fire as craft, used by all the poets.
- **Quietus** — 'the Stilled'; the averted fire, worshipped so it stays asleep.
- **Armipotens** — 'powerful in arms'; the forger of the state's weapons.
- **Ignipotens** — 'lord of fire'; the full epic style.
- **Volcanus** — the older spelling of his name, kept in the oldest inscriptions and the island that immortalized it.`,
      sources: [{ citation: 'Virgil, Aeneid 8; the Volcanal inscriptions.' }],
    },
    'oracle-sites': {
      body: `The **Volcanal** in the Roman Forum — the open-air precinct above the Lapis Niger, beside the archaic inscription of Rome's oldest law — was his oldest seat, deliberately outside the city's sacred boundary: the dangerous fire worshipped at arm's length. His temple stood on the Campus Martius, likewise outside the walls. The **Aeolian island of Vulcano**, with its smoking fumaroles, was shown to travelers as his forge-chimney; its ancient obsidian industry — worked since the Neolithic — made the myth practical geology long before it was theology.`,
      sources: [{ citation: 'Dionysius 2.50 (the Volcanal); Thucydides 3.88 (the islands).' }],
    },
  },

  anubis: {
    epithets: {
      body: `His Egyptian titles are a liturgy of the necropolis.

- **jmy-wt (Imy-ut)** — 'He who is in the place of embalming'; his oldest title, from the Pyramid Texts.
- **ḫnty-sḥ-nṯr (Khenty-seh-netjer)** — 'Foremost of the divine booth'; lord of the mummy's tent.
- **ḫnty-jmntjw (Khenty-imentiu)** — 'Foremost of the Westerners'; chief of the dead's realm, held before Osiris took it.
- **tpy-ḏw=f (Tepy-djuef)** — 'He who is upon his mountain'; the jackal watching from the desert's edge.
- **nb-t3-ḏsr (Neb-ta-djeser)** — 'Lord of the Sacred Land'; the necropolis entire as his estate.
- **wp-w3wt (Wepwawet)** — 'Opener of the Ways'; the guide-title he shares with his jackal brother.`,
      sources: [{ citation: 'Faulkner, Ancient Egyptian Pyramid Texts; Te Velde, Seth, God of Confusion (comparanda).' }],
    },
    'oracle-sites': {
      body: `His great cult centre was **Cynopolis** — 'Dog City' — in Middle Egypt, where the Greeks noted the dogs kept sacred in his temple. The **Anubeion at Saqqara**, excavated beside the Serapeum, preserves his other world: catacombs filled with millions of mummified dogs and jackals, votive offerings of pilgrims from the Late Period to the Roman era. In Greco-Roman Alexandria the temple of **Hermanubis** fused him with Hermês, and Apuleius describes his black-and-gold mask leading the Isiac procession — the Egyptian jackal marching, fully at home, through a Greek city.`,
      sources: [{ citation: 'The Saqqara Anubeion reports; Apuleius, Metamorphoses 11.11.' }],
    },
  },

  steh: {
    epithets: {
      body: `His titles swing between dread and honour, as he does.

- **Nubty** — 'He of Nubt (Ombos)'; the gold-town title, his oldest civic name.
- **nb-rḏt** — 'Lord of the Desert'; the red land's master.
- **s3-Nwt** — 'Son of Nut'; the sky-mother's storm-child.
- **wr-pḥty** — 'Great of Strength'; the title the warrior-pharaohs loved.
- **nb-ḫ3swt** — 'Lord of the Foreign Lands'; Egypt's dangerous outside, personified and worshipped.
- **Typhōn** — the Greek name that finally consumed him.`,
      sources: [{ citation: 'Te Velde, Seth, God of Confusion (titles and their history).' }],
    },
    'oracle-sites': {
      body: `His cult cities map the two Egypts he ruled and menaced: **Nubt (Ombos)**, the 'gold town' near Naqada, was his ancient capital — temple remains and predynastic votives tie him to the state's first strata. **Avaris** in the Delta became his second capital under the Hyksos, who made him their chief god; the Nineteenth Dynasty, born of that region, restored his honour with the temple of Seti I at **Abydos** inscriptions and the great **Memphis** colossi of Set-named kings. At **Edfu**, the dramatic texts of his defeat by Horus were performed as temple liturgy — the demonized god still necessary to the play.`,
      sources: [{ citation: 'Te Velde, Seth; the Edfu temple texts (Fairman).' }],
    },
  },

  seshat: {
    epithets: {
      body: `Her titles are the vocabulary of the written world.

- **sšꜣt** — the name itself, built on the sign for 'write': the goddess named for the act.
- **ḫry-tp pr-mḏꜣt** — 'Foremost of the House of Books'; the temple library's mistress.
- **mnḥt** — 'the excellent one'; her standing honorific.
- **nb-qd** — 'Lady of Builders'; the architects' patroness.
- **sꜥḫꜥt** — 'she who causes to appear'; the revelatory power of record.
- **sfḫt-ꜥbwy (Sefkhet-Abwy)** — 'she of the two horns'; the alternative reading of her seven-pointed emblem, under which name later texts know her.`,
      sources: [{ citation: 'Bonneau and Gardiner on the Seshat titles; the Edfu library texts.' }],
    },
    mythology: {
      addMyth: { tag: 'The Census', title: 'The Count of All Things', text: `<p class='myth-text'>The annals of Egypt — the Palermo Stone and its lost siblings — are her liturgy made stone: reign by reign, the stone records the biennial cattle-count, the gold-count, the flood's height, and the king's works, each entry a notch in the national memory. The Egyptians called such records 'what Seshat writes.' When a king boasts of enumerating his spoils, the reliefs show her at his elbow with the palm-rib: conquest is not complete, the theology insists, until it has been counted and written — the first doctrine of the archive.</p>` },
    },
  },

  hp: {
    epithets: {
      body: `The flood's titles are the names of abundance itself.

- **ꜥꜣ-pḥty** — 'great of might'; the flood's force acknowledged.
- **nb-t3wy** — 'lord of the Two Lands'; the river that is the country's unity.
- **jtw-nṯrw** — 'father of the gods'; the inundation as the oldest giver.
- **ḥp** — 'the hidden one', on one ancient reading: the flood whose source no one has seen.
- **di-ꜥnḫ** — 'giver of life'; the standing doxology of the hymns.
- **ḥqꜣ-ʿḥ** — 'ruler of the field'; the harvest's true landlord.`,
      sources: [{ citation: 'The Hymn to Hapi (van der Plas, L\'Hymne à la Crue du Nil).' }],
    },
    'oracle-sites': {
      body: `He had no temple of his own — the river was his sanctuary — but his stations survive as engineering: the **nilometers** of **Elephantine**, where a stairwell of cubit-scales measured his rising beside Khnum's temple; **Philae**, where the flood's arrival was met with festivals at Isis' island; and the **Roda nilometer** in Cairo, whose Abbasid shaft still descends to the river. His iconography lines the base of every temple wall — the long processions of offering-bringers, each a province's flood personified — so that to walk around an Egyptian temple is to watch ḥp feed the country, province by province, forever.`,
      sources: [{ citation: 'Bonneau, La Crue du Nil; the Elephantine and Roda nilometer publications.' }],
    },
  },

  amsa: {
    epithets: {
      body: `The Āditya of portions is known by his company.

- **Āditya** — 'son of Aditi'; the family title of the twelve, the solar governors of ṛta.
- **Dvādaśa** — 'one of the Twelve'; his place in the year's solar round.
- **Bhāga-sahodara** — 'brother of Bhaga'; the pairing with the older share-god.
- **Vibhaktṛ** — 'the Apportioner'; the functional title his name translates.
- **Māsa-devatā** — 'god of the month'; the liturgical title of each Āditya in turn, his included.`,
      sources: [{ citation: 'Macdonell, Vedic Mythology (Ādityas); Bhāgavata Purāṇa 12.11.' }],
    },
    mythology: {
      addMyth: { tag: 'The Year', title: 'The Twelve Suns', text: `<p class='myth-text'>The Purāṇic astronomy assigns each month to one of the twelve Ādityas: the sun is one, but his offices are twelve — the creator's, the nourisher's, the portioner's — and Aṃśa's month is the year's own account rendered. The theology is exact: time itself is the oldest inheritance divided, and each month a share of the sun. His cult is the calendar: no image, no temple, only the accurate turning of the solar year, worshipped every morning in the Gāyatrī that all twelve share.</p>` },
    },
  },

  daksa: {
    epithets: {
      body: `The Prajāpati's titles record both his office and his lesson.

- **Prajāpati** — 'Lord of Progeny'; the office-name of the creator-fathers, his above all.
- **Dakṣa** — 'the Skilled'; the name as title, competence enthroned.
- **Ajānanī-śiras** — 'the goat-headed'; the Purāṇic iconographic title after his restoration.
- **Sapatnī-kāma** — 'lord of the many wives'; the epic nod to his sixty daughters' marriages.
- **Yajña-bhaṅga-kṣama** — 'he whose sacrifice was broken'; the cautionary title under which the story is told.`,
      sources: [{ citation: 'Mahābhārata, Śānti-parvan; Śiva Purāṇa (Dakṣa cycle).' }],
    },
    mythology: {
      addMyth: { tag: 'The Restoration', title: 'The Lesson of the Goat\'s Head', text: `<p class='myth-text'>The Purāṇas insist the story does not end at the beheading: when the gods intercede, Śiva forgives, and Dakṣa rises with a goat's head — and becomes, the texts say, Śiva's devotee. The sequel is the point: procedure is restored, but transfigured by humility. At Kankhal, where the sacrifice is said to have burned, the temples commemorate not the ruin but the reconciliation — the skilled father and the wild god reconciled, ritual and devotion finally sharing one altar.</p>` },
    },
  },

  dhatr: {
    epithets: {
      body: `The Establisher's titles are the root declined through its meanings.

- **Dhātṛ** — 'the Establisher'; the agent noun as theonym.
- **Vidhātṛ** — 'the Disposer'; his constant pair, invoked with him at every birth-rite.
- **Prajāpati** — 'Lord of Progeny'; the office his functions pass to.
- **Jagad-dhātṛ** — 'Establisher of the World'; the epic expansion of his name.
- **Dhāman** — 'the Ordinance'; his power as noun, the fixed station of each thing.`,
      sources: [{ citation: 'Ṛgveda 10.190; Atharvaveda (Dhātṛ-Vidhātṛ hymns).' }],
    },
    mythology: {
      addMyth: { tag: 'The Inscription', title: 'Written on the Forehead', text: `<p class='myth-text'>The classical image of Indian fate descends from his pair: Dhātṛ and Vidhātṛ, the texts say, inscribe each child's destiny on the forehead at birth — the lalāṭa-likhitā, the forehead-writing that no effort can erase. The proverb that runs through a thousand stories and films — "what is written will happen" — is his liturgy in miniature: the Establisher has already set down the lines; the drama of life is discovering where they were set.</p>` },
    },
  },

  pusan: {
    epithets: {
      body: `The herdsman-sun's titles follow the road.

- **Āghṛṇi** — 'the Glowing'; his solar face in the hymns.
- **Pathas-pati** — 'Lord of Paths'; the road's own title, invoked at every journey's start.
- **Paśupā** — 'Protector of Cattle'; the pastoral office as name.
- **Vimūcan** — 'the Releaser'; the hymns' title for the god who frees the lost and the bound.
- **Karambhā́d** — 'the Gruel-eater'; the comic-sacred title of his toothless cult-offering.`,
      sources: [{ citation: 'Ṛgveda 6.53–58 (the Pūṣan hymns); Macdonell, Vedic Mythology.' }],
    },
  },

  tvastr: {
    epithets: {
      body: `The smith's titles follow his bench.

- **Viśvakarman** — 'All-Maker'; the later name under which the Ṛgvedic smith became the universe's architect.
- **Takṣā** — 'the Carpenter'; the craft-noun as epithet, the village trade inside the god.
- **Vajra-kartṛ** — 'Maker of the Bolt'; the hymns' signature on Indra's weapon.
- **Somapātra-kāra** — 'Fashioner of the Soma Cup'; the liturgy's finest object, attributed.
- **Viśvarūpa-janitṛ** — 'Father of Viśvarūpa'; the tragic title, the grief that drove the forge.`,
      sources: [{ citation: 'Ṛgveda 1.32, 10; Taittirīya Saṃhitā 2.4.12.' }],
    },
  },

  fuxi: {
    epithets: {
      body: `The first teacher's titles span three thousand years of state ritual.

- **Tàihào (太皞)** — 'the Great Bright One'; his oldest title, paired with the eastern direction.
- **Páoxī (庖犧)** — the variant writing of his name, 'he of the kitchen/sacrifice'; the domestication of animals in a graph.
- **Sānhuáng zhī shǒu** — 'first of the Three August Ones'; his place in the canonical succession.
- **Lóngshī (龍師)** — 'Dragon Master'; the title from the tradition that he named his officers for dragons.
- **Bāguà zhī shǐzǔ** — 'Ancestor of the Eight Trigrams'; the diviners' title for the pattern's first reader.`,
      sources: [{ citation: 'Yijing, Xici zhuan; Shiji (Sānhuáng traditions); Birrell, Chinese Mythology.' }],
    },
    'oracle-sites': {
      body: `His cult anchored in the northwest: the **Fúxī temple at Tianshui** (Gansu), founded under the Ming, claims his birthplace and keeps his statue with the trigrams; the city still holds his festival. The **Huáiyáng** tomb-temple in Henan — the Tàihào Líng, 'tomb of the Great Bright One' — has drawn one of China's largest temple fairs for centuries, a month of pilgrimage in the second lunar month. Both sites make the same claim the classics do: that the pattern-reader of the Yellow River was buried and is honoured on its banks.`,
      sources: [{ citation: 'The Tianshui and Huaiyang temple records; Birrell, Chinese Mythology.' }],
    },
  },

  guanyin: {
    epithets: {
      body: `Her titles are the diary of the vow.

- **Guānshìyīn (觀世音)** — 'Perceiver of the World's Sounds'; the full liturgical name.
- **Dàcí dàbēi (大慈大悲)** — 'Great Compassion, Great Mercy'; the standing doxology.
- **Sòngzǐ Guānyīn (送子觀音)** — 'Guānyīn Who Gives Children'; the most prayed-to form.
- **Báiyī Guānyīn (白衣觀音)** — 'the White-Robed'; the Song iconography that fixed her image.
- **Nánhǎi Guānyīn (南海觀音)** — 'of the Southern Sea'; the Putuoshan title.
- **Qiānshǒu qiānyǎn (千手千眼)** — 'Thousand-Armed, Thousand-Eyed'; the esoteric form of the limitless vow.`,
      sources: [{ citation: 'Lotus Sūtra ch. 25; Yü Chün-fang, Kuan-yin (Columbia UP).' }],
    },
    'oracle-sites': {
      body: `**Putuoshan**, the island-mountain off Zhoushan, is her Potalaka made Chinese: since the 10th century — when the Japanese monk Egaku's Kannon image refused to sail past the island — its three great monasteries (Puji, Fayu, Huiji) and the 33-metre Nanhai Guānyīn statue have drawn the largest Buddhist pilgrimage in East Asia. Beyond it, her geography is the coast itself: **Ningbo's** temples sent her image to Japan, **Dunhuang's** caves hold her oldest Chinese icons, and the **Sanya Nanhai** colossus of 2005 — 108 metres over the South China Sea — is the modern state's contribution to her map.`,
      sources: [{ citation: 'The Putuoshan gazetteers; Yü Chün-fang, Kuan-yin.' }],
    },
  },

  mengpo: {
    epithets: {
      body: `A folk goddess keeps folk titles.

- **Mèngpó (孟婆)** — 'Old Lady Meng'; the familiar name, grandmother of the bridge.
- **Wàngchuān zhī zhǔ** — 'Mistress of the River of Forgetfulness'; the folk-cosmology title.
- **Nàihé-qiáo shǒuzhě** — 'Keeper of the Nàihé Bridge'; the office as name.
- **Míhún-tāng zhǔ** — 'Mistress of the Soul-Confusing Broth'; the popular title of her brew.
- **Dìyù nǚshén** — 'goddess of the Underworld'; the modern encyclopedic title.`,
      sources: [{ citation: 'Teiser, The Scripture on the Ten Kings (folk cosmology); Ming-Qing vernacular fiction.' }],
    },
    'oracle-sites': {
      body: `Her geography is the geography of judgment. At **Fengdu**, the ghost-city on the Yangtze, the **Nàihé Bridge** stands in stone — three arches, for the virtuous, the ordinary, and the wicked — and pilgrims have crossed it for centuries as a rehearsal for the real crossing. The Ten Kings temples of late imperial China and the underworld scrolls of the Ningbo workshops place her at her station between the fifth court and rebirth. In modern Taiwan and the mainland temple revival, her shrine stands where the folk cosmology puts her: at the exit of the courts, ladle in hand.`,
      sources: [{ citation: 'The Fengdu temple records; Teiser, Ten Kings.' }],
    },
  },

  nuwa: {
    epithets: {
      body: `The repairer's titles are all honours of maintenance.

- **Wāhuáng (媧皇)** — 'Empress Wa'; her royal title in the temple liturgies.
- **Nǚwā niángniang** — 'Lady Nǚwā'; the vernacular title under which mothers pray to her.
- **Sānhuáng** — 'one of the Three August Ones'; her place in the succession.
- **Zào rén zhī mǔ** — 'Mother of Made Mankind'; the folk-title of the clay myth.
- **Bǔtiān zhī shén** — 'the Goddess Who Mended the Sky'; the title the idiom keeps.`,
      sources: [{ citation: 'Huainanzi 6; Birrell, Chinese Mythology (Nüwa traditions).' }],
    },
    'oracle-sites': {
      body: `The **Wahuang Palace at Shexian** (Hebei) is her architectural marvel: pavilions chained to the sheer cliff of Phoenix Mountain, founded under the Northern Qi (6th century) and rebuilt across fifteen centuries — the 'hanging temple of Empress Wa,' still crowded at her third-month festival. **Tianshui** in Gansu claims her birth beside Fúxī's, and the paired shrines of the two serpent-ancestors mark the silk-road towns westward. Han pictorial stones from **Shandong's Wu Liang shrine** to the Astana cemetery of Xinjiang show her with compass raised beside her brother-husband — the oldest surviving portraits of the mender.`,
      sources: [{ citation: 'The Shexian Wahuang Palace records; Wu Hung, The Wu Liang Shrine.' }],
    },
  },

  pangu: {
    epithets: {
      body: `The youngest creator has the simplest titles.

- **Pángǔ shì** — 'Master Pangu'; the respectful vernacular address.
- **Kāitiān pìdì** — 'who separated heaven and earth'; the title that is also the idiom for absolute beginnings.
- **Shǐzǔ** — 'the First Ancestor'; the genealogical title of the southern temples.
- **Hùndùn zhī zǐ** — 'child of Chaos'; the mythic lineage-name.
- **Yǔzhòu zhī shēn** — 'the Body of the Universe'; the doctrinal title of the transformation myth.`,
      sources: [{ citation: 'Xu Zheng, Sanwu Liji; Birrell, Chinese Mythology (Pangu).' }],
    },
    'oracle-sites': {
      body: `His cult is young, like his myth: the **Pángǔ temple of Tongbai county** (Henan) anchors the tradition's claimed birthplace, with his festival in the tenth lunar month drawing the county's pilgrimage. In the south — Guangdong and Guangxi, where scholars trace the myth's Yao and Miao ancestry — village shrines to Pángǔ dàrén, 'the great man Pangu,' predate the literary fame. The **Museum of Chinese creation mythology** tradition apart, his monuments are the mountains themselves: the myth names them his limbs, and the pilgrim reads the landscape as the giant's body, which is the oldest way of reading it.`,
      sources: [{ citation: 'Birrell, Chinese Mythology; the Tongbai temple records.' }],
    },
  },

  yanluo: {
    epithets: {
      body: `The judge's titles are all courtroom.

- **Yánluó Wáng (閻羅王)** — 'King Yama'; the full title, Sanskrit worn smooth by Chinese speech.
- **Dìwǔ diàn zhǔ** — 'Lord of the Fifth Court'; his station in the Ten Kings system.
- **Yīn-sī dàshén** — 'Great God of the Dark Office'; the bureaucratic honorific.
- **Yánwáng yé** — 'Grandfather Yama'; the vernacular address, half dread, half familiarity.
- **Enma-ō** — the Japanese form of the title, the same king on the eastern throne.
- **Píngděng wáng** — 'King of Equal Judgment'; one of his doctrinal names: before him, all souls are equal.`,
      sources: [{ citation: 'Teiser, The Scripture on the Ten Kings; Rigveda 10 (Yama).' }],
    },
    'oracle-sites': {
      body: `His temples are courtrooms in stone. **Fengdu** ghost city stages his tribunal among the Ten Kings — the judge enthroned above the mirror of deeds, ox-head and horse-face attending — as it has for centuries of Yangtze pilgrims. The **Ten Kings paintings** of the Ningbo workshops (the great sets at Nara and the Metropolitan Museum) fix his iconography: the magistrate's cap, the open register, the mirror raised. In Japan his cult crossed to the great **Enma-dō** halls — Kyoto's Sennyūji among them — where the red-faced king has glared at the faithful for a thousand years.`,
      sources: [{ citation: 'Teiser, Ten Kings; the Nara Ten Kings painting corpus.' }],
    },
  },

  hokkaido: {
    epithets: {
      body: `The island's names record its double history.

- **Ainu Mosir** — 'the quiet land of humans'; the Ainu name, older than Japan's maps.
- **Ezochi (蝦夷地)** — 'land of the Ezo'; the pre-modern Japanese name the Meiji state replaced.
- **Hokkaidō (北海道)** — 'the North Sea Road'; Matsuura Takeshirō's coinage of 1869.
- **Kita no kuni** — 'the northern country'; the vernacular poetry-name.
- **Wajinchi no soto** — 'beyond the Japanese land'; the Edo-period formula that marked the frontier.`,
      sources: [{ citation: 'The Ainu toponymic studies (Kayano Shigeru); Hokkaido prefectural records.' }],
    },
    'oracle-sites': {
      body: `The island's sacred geography is double. The Ainu kept no temples — their sanctuaries were the **kamuy-nomi sites**: bear-ceremony grounds, sacred fireplaces, and the ritual areas of the kotan villages, now studied at sites like Upopoy and the Akan Ainu Kotan. The Japanese state added its own: **Hokkaidō Jingū** in Sapporo (founded 1869 as the frontier's tutelary shrine), and the **Ise-style** pioneer shrines of the colonization era. Shiretoko — 'the end of the land' in Ainu — is the island's natural sanctuary, UNESCO-listed for the ecosystem the kamuy-cosmos named first.`,
      sources: [{ citation: 'The Upopoy/National Ainu Museum publications; Hokkaido Jingu records.' }],
    },
  },

  honshu: {
    epithets: {
      body: `The main island's names are the nation's names.

- **Ōyashima (大八洲)** — 'the Great Eight Islands'; the Kojiki's myth-name for the born archipelago.
- **Akitsushima** — 'the Dragonfly Island'; the classical poetry-name for Japan, attributed to the first emperor's image of the land.
- **Yamato no moto** — 'the root of Yamato'; the heartland-title of the Nara basin.
- **Honshū (本州)** — 'the Main Province'; the descriptive name that became the proper one.
- **Nakatsukuni** — 'the Middle Land'; the cosmological title between heaven and the underworld.`,
      sources: [{ citation: 'Kojiki (island-birth); Nihon Shoki; the Man\'yōshū toponyms.' }],
    },
    'oracle-sites': {
      body: `The island holds Japan's holiest ground: **Ise Jingū**, the Grand Shrines of Amaterasu on the Kii coast, rebuilt on adjacent sites every twenty years since the 7th century — the shikinen sengū, a Bronze Age renewal rite performed on schedule into the present. The **Atsuta** shrine of the sacred sword, **Izumo Taisha** (claimed by the myth as the land-ceding god's seat, one of the tallest ancient halls), **Tōdai-ji** with the world's largest bronze Buddha, and the ten thousand **Inari** shrines of the rice-fox god: Honshū's sacred map is the archipelago's whole religion in one island's geography.`,
      sources: [{ citation: 'The Ise Jingu records (shikinen sengu); Kojiki; the shrine gazetteers.' }],
    },
  },

  kyushu: {
    epithets: {
      body: `The gateway's names record who came through it.

- **Tsukushi (筑紫)** — the island's ancient name in the chronicles, older than the state.
- **Kyūshū (九州)** — 'the Nine Provinces'; the administrative name that became the island's.
- **Hinomoto no nishi** — 'the west of the sun-source'; the classical geography-title.
- **Onigashima** — 'the demon island' of some southern legends; the frontier seen from the capital.
- **Hi no kuni** — 'the land of fire'; the folk-name from the Aso volcanic zone.`,
      sources: [{ citation: 'Kojiki and Nihon Shoki (Tsukushi); the provincial records (fudoki).' }],
    },
    'oracle-sites': {
      body: `The island's sanctuaries guard the two shores of its myth. **Takachiho shrine** in the mountains keeps the descent of Ninigi — the cavern of Amaterasu (Ama-no-Iwato) is the pilgrimage's other anchor, where the sun returned to the world. **Usa Jingū**, mother-shrine of the Hachiman cult, stands on the coast that faced Korea: the oracular god of warriors whose priests answered the state for a thousand years. **Hakata's** shore temples mark the Mongol anchorage of the kamikaze, and **Ōura** and the hidden-Christian sites of Nagasaki — UNESCO-listed — keep the century of the forbidden faith in stone.`,
      sources: [{ citation: 'The Takachiho and Usa shrine records; UNESCO Hidden Christian Sites dossier.' }],
    },
  },

  tezcatlipoca: {
    epithets: {
      body: `No Mesoamerican god collected more names — the Florentine Codex lists them like charges.

- **Titlacahuan** — 'He Whose Slaves We Are'; the sovereign title, said with bowed head.
- **Yoalli Ehécatl** — 'Night Wind'; the title under which he walks the crossroads.
- **Moyocoyatzin** — 'the Capricious One'; the creator who does as he pleases.
- **Necoc Yaotl** — 'Enemy of Both Sides'; the warrior's title, patron of strife itself.
- **Telpochtli** — 'the Young Man'; the title of his Toxcatl impersonator.
- **Yaotzin** — 'the Revered Enemy'; enmity itself, honoured.`,
      sources: [{ citation: 'Florentine Codex, Book 1 (Tezcatlipoca chapter).' }],
    },
    'oracle-sites': {
      body: `His great seat was **Tenochtitlan**: south of the Templo Mayor stood his temple, where the Toxcatl ixiptla climbed to die, and the excavated offerings of the **Templo Mayor** — obsidian, jaguar bone, the sacrificial knives of his nights — keep his cult in the archaeology of the sacred precinct. At **Teotihuacan**, the Avenue of the Dead runs through the city his myth makes the site of the sun's creation; at **Tula**, the Toltec capital his legend overthrew, the warrior-columns of the morning-star temple mark Quetzalcōātl's defeat. His mirrors — the British Museum's John Dee mirror foremost — are his portable shrines, obsidian ground to show the hidden.`,
      sources: [{ citation: 'Templo Mayor excavation reports; Florentine Codex, Book 2 (Toxcatl).' }],
    },
  },

  xolotl: {
    epithets: {
      body: `The twin's titles are all offices of the dark road.

- **Tlāhuizcalpantēuctli cē īcnōtl** — 'twin of the Morning Star'; his station defined against his brother.
- **Mictlān-tēuctli īcnīuh** — 'friend of the Death-Lord'; the underworld alliance as title.
- **Xōlōtl** — 'the Water Monster'; the name shared with the axolotl, his last disguise.
- **Itzcuintli-tēuctli** — 'lord of dogs'; the funeral-guide title.
- **Cōātl īhuīc** — 'he who goes with the serpent(-twin)'; the codex formula for the pair.`,
      sources: [{ citation: 'Florentine Codex, Books 3 and 6; Codex Borgia (Xolotl cycles).' }],
    },
  },

  ogun: {
    epithets: {
      body: `The oríkì praise-names are his living titles, chanted at forge and forest's edge.

- **Ògún Onírè** — 'Ògún, Owner of Ire'; the town-king title, his civic name.
- **Ògún Aládà** — 'Owner of the Cutlass'; the blade as title.
- **Alágbẹ̀dẹ** — 'Master of the Smiths'; the guild-title of the iron-workers.
- **Ọ̀ṣìn imọ́lẹ̀** — 'the strong one who bathes in blood'; the hunter's praise-name.
- **Olójà onílù** — 'owner of the road and the town'; the paired domains, path and settlement.
- **Baba wa** — 'our father'; the devotees' everyday address.`,
      sources: [{ citation: 'Idowu, Olodumare (Ogun oriki); Bascom, Ifa Divination.' }],
    },
    'oracle-sites': {
      body: `His sanctuaries are the working places of iron: at **Ire**, the town he ruled, his festival replays the king's coming and his withdrawal into the earth, and his shrine holds the ancient implements of the office. Every **smithy** in Yorubaland is his chapel — the anvil the altar, the first iron of the day offered with palm wine — and the hunters' guilds keep his forest shrines at the paths' entrances. In the diaspora, his altars stand in the Candomblé terreiros of Bahia and the Santería houses of Havana and Miami: the iron god's addresses follow the metal, as they always have.`,
      sources: [{ citation: 'Idowu, Olodumare; Bascom, Shango in the New World (Ogun cults).' }],
    },
  },

  tumatauenga: {
    epithets: {
      body: `The war-god's names are a catalogue of fierceness, kept in the karakia.

- **Tū-te-awheawhe** — 'Tū of the angry visage'; the full expansion of his name.
- **Tū-whakaheke-tangata** — 'Tū who causes man to descend'; the war-god as man's undoing.
- **Tū-kai-taua** — 'Tū who feasts on war-parties'; the battle-title.
- **Tū-matauenga** — 'Tū of the angry face'; the standing form.
- **Kū** — his Hawaiian name, the war-god of the feathered helmets, the same god across the ocean.`,
      sources: [{ citation: 'Grey, Polynesian Mythology (Tū cycle); Tregear, Maori Dictionary.' }],
    },
  },
};
