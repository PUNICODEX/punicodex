/**
 * Scholars kit sections, batch A — Greek (9) and Greek-location (2) entries.
 * Keys match the taxonomy kits exactly: greek = homeric-hymns, epithets,
 * oracle-sites, iconography; greek-location = topography, historical-sources,
 * modern-site. Bodies are markdown, ~300-600 chars, with citations.
 * Applied by apply-kits.js (bespoke: true, preserved by regeneration).
 */

module.exports = {
  achilleus: {
    'homeric-hymns': {
      body: `No Homeric Hymn addresses Achilleús — the corpus is for gods, and he is the great counter-example of the hero who is not one. His hymnic afterlife runs through the Epic Cycle instead: the *Aethiopis* (his death and Thetis' removal of his body to the White Island) and the *Little Iliad*, surviving in Proclus' summaries and a handful of fragments. The Iliad itself functions as his hymn: its first word, μῆνιν, is his, and the poem's invocations keep returning to his choice. The Homeric Hymn to Demeter's brief notice of the hero's afterlife (480–482) is the corpus' nearest bow to him.`,
      sources: [{ citation: 'Proclus, Chrestomathy (Aethiopis summary); Homeric Hymn to Demeter 480–482.' }],
    },
    iconography: {
      body: `Achilleús is among the most painted figures of Greek art. The **François Vase** (ca. 570 BCE) shows his pursuit of Troilos in full narrative band; **Exekias'** amphora of Achilleús and Ajax playing dice (Vatican) is the canonical image of epic downtime; the ransom scene — Priam kneeling before him — fills dozens of red-figure cups. Roman sarcophagi favored the Skyros episode (the hero discovered among the daughters), and Pompeian wall-painting kept the Briseis handover. His heel, tellingly, is rarely shown: the iconography prefers the rage and the grief to the wound.`,
      sources: [{ citation: 'LIMC I.1, s.v. Achilleus (Kossatz-Deissmann).' }],
    },
  },

  asklepios: {
    iconography: {
      body: `The god's image is one of antiquity's most stable: a bearded, humane figure leaning on the **serpent-entwined staff**, often with a dog at his feet and his daughter Hygieia beside him. The **Giustiniani Stele** type defines his classical look; Epidaurus' votive reliefs show him receiving worshippers or touching patients. On coins of Epidaurus, Pergamon, and the Tiber Island he appears seated with the staff; the Roman Aesculapius adds the globe. The single snake on the staff — never two — is the iconographic rule that still distinguishes his emblem from Hermês' caduceus.`,
      sources: [{ citation: 'LIMC II.1, s.v. Asklepios (Holtzmann); Edelstein, Asclepius vol. II.' }],
    },
  },

  atropos: {
    'homeric-hymns': {
      body: `The Homeric corpus contains no hymn to the Moirai — fate does not receive cult-song in the archaic manner — but the Orphic tradition repaired the omission: **Orphic Hymn 59, "To the Fates,"** invokes Klōthṓ, Láchesis, and Átropos "who dwell in heaven's circling course," begging them to come "gentle, and bring a good end." The hymn is the fullest surviving liturgical address to the triad, and its request — for a good measure rather than a long one — is exactly Átropos' theology. Plato's vision of the three singing sisters at the spindle of Necessity (Republic 617c) is the philosophical counterweight.`,
      sources: [{ citation: 'Orphic Hymn 59 (Athanassakis & Wolkow); Plato, Republic 617c.' }],
    },
    iconography: {
      body: `The Moirai enter art late and as a triad: Hellenistic gems and Roman sarcophagi show the three with their instruments — spindle, scroll or measure, and shears — Átropos usually eldest, veiled, holding the cutting tool or the finished thread. On the great Roman sarcophagi (the "Prometheus" and "Meleager" types) they attend the deathbed as the plot's auditors. Medieval and Renaissance art softened them into the "weird women" of tapestry, but the shears stayed with the third sister throughout — the one attribute no tradition ever reassigned.`,
      sources: [{ citation: 'LIMC VI.1, s.v. Moirai (de Angeli); Plato, Republic 617c.' }],
    },
  },

  drakon: {
    'oracle-sites': {
      body: `The dragon's sanctuaries are the ones founded on its grave. **Delphoi** is the type-case: the temple of Apóllōn stood over Python's spring, and the Pythia prophesied above the rot the god's taunt named. At **Thebes**, the Ismenion — Apóllōn Ismēnios' temple on the hill above the Ismēnian spring — marked Kadmos' kill: Pausanias saw there the laurel and the tripod of the oracle whose founding myth is dragon-slaying. The Hesperides' garden and the Kolchian grove have no archaeology, being the map's edge, but **Kolchis'** later Phasis showed travelers the grove of the fleece as local pride.`,
      sources: [{ citation: 'Pausanias 9.10 (Ismenion), 10.6–7 (Delphoi); Homeric Hymn to Apollo 300–374.' }],
    },
    iconography: {
      body: `Greek dragons are always serpents — bearded, crested, enormous, wingless. **Ladon** on Apulian vases coils many-fold around the apple tree with Hēraklēs bargaining beside; **Python** appears on Delphic coinage beneath Apóllōn's tripod; the **Kolchian dragon** on the Naples vase hangs from the tree of the fleece with the Argonauts beneath. The constellation Draco fixed the form in the sky. Wings, legs, and fire are medieval additions: the classical drakōn is the watcher of springs and trees, and art kept him earthbound and water-tied for a thousand years.`,
      sources: [{ citation: 'LIMC VIII.1, s.v. Python, Ladon; Ogden, Drakōn (Oxford 2013).' }],
    },
  },

  monokeros: {
    'homeric-hymns': {
      body: `No hymn addresses the monokeros, and the silence is diagnostic: the Greeks never made it a god or even a monster of the agonistic kind — it had no cult, no oracle, no adversary. Its "hymns" are the zoological chapters: Ktēsias' Indika, Aristotle's History of Animals, Pliny's Natural History, and the Septuagint's re\'em passages. The absence from the hymnic corpus marks the boundary of Greek religion exactly: the one-horned beast belonged to report and wonder, not worship — a creature at the edge of the map, not of the altar.`,
      sources: [{ citation: 'Ctesias, Indika F45; Aristotle, HA 499b; Pliny, NH 8.76.' }],
    },
    'oracle-sites': {
      body: `The unicorn's stations are treasuries, not temples. The **French crown's** alicorn cups, inventoried through the Middle Ages, and the Danish coronation chair at **Rosenborg** — long believed to be of unicorn horn — are its reliquaries; the narwhal trade that supplied them ran through Arctic Norway and Iceland. Antiquity's only "site" is textual: the India of Ktēsias' Indika, the royal menageries of Persia where he claims the horn was seen. No sanctuary ever claimed the beast, which is the point: it was proof against capture, and so against cult.`,
      sources: [{ citation: 'Lavers, The Natural History of Unicorns (2009); Ctesias, Indika F45.' }],
    },
    iconography: {
      body: `The iconography begins in paradox: the Indus "unicorn" seals — thousands of steatite stamps of a one-horned bovid, almost certainly a bull in profile — are the oldest candidate images. Greek art ignores the beast entirely; the medieval West made up for it: the **Unicorn Tapestries** (the Cloisters) and the *Lady and the Unicorn* series (Cluny) fixed the white horse-goat with the spiral horn, and Scottish heraldry crowned it in chains — "a free unicorn is a dangerous beast." Every image after Ktēsias is a portrait of a report, never of a sighting.`,
      sources: [{ citation: 'The Unicorn Tapestries (Metropolitan Museum); Indus seal corpora (CISI).' }],
    },
  },

  phanes: {
    'homeric-hymns': {
      body: `The Homeric corpus predates Orphic theology and knows nothing of him; but the **Orphic Hymn 6, "To Protogonos,"** is his liturgy entire: "much-honoured Protogonos I call, double-sexed, great, wandering in the ether, egg-born, golden-winged, loud as a bull, the origin of gods and mortals, the glorious seed." Every attribute of the Rhapsodies is in the hymn — the egg, the wings, the double nature, the primacy — making it the single best surviving document of his cult. The Derveni commentator's equation of Protogonos with Mind is the philosophical gloss composed a century earlier.`,
      sources: [{ citation: 'Orphic Hymn 6 (Athanassakis & Wolkow); Derveni Papyrus col. XVI.' }],
    },
    'oracle-sites': {
      body: `Phánēs had no temples — Orphism was a religion of books and initiates, not of civic sanctuaries. His "sites" are graves: the **Derveni tomb** near Thessaloniki, where the papyrus commentary on the theogony burned on a pyre around 340 BCE and survived carbonized; the **gold-tablet burials** of Thurii, Petelia, and Pelinna, whose initiates carried the cosmology's passwords underground; and, in art, the **Modena relief** of a winged, egg-born god (2nd c. CE), the one candidate image of the first-shining one, kept in the Galleria Estense.`,
      sources: [{ citation: 'The Derveni Papyrus (Kouremenos et al.); Orphic Gold Tablets (Bernabé).' }],
    },
    iconography: {
      body: `Almost no certain image survives: an initiatory god has no public iconography. The **Modena relief** — a winged, sometimes double-sexed figure emerging from an egg, wrapped by the serpent of Time — is the standard candidate, its identification argued from the Orphic attributes. The **Mithraic lion-headed god** of the Roman mysteries shares his form vocabulary (wings, serpent-coils, keys) and is often reproduced beside him in studies, the identification itself debated. His truest portrait is verbal: the Orphic Hymn's "golden-winged, egg-born, double-sexed, wandering in the ether."`,
      sources: [{ citation: 'Orphic Hymn 6; Guthrie, Orpheus and Greek Religion (iconography discussion).' }],
    },
  },

  pegasos: {
    'homeric-hymns': {
      body: `No Homeric Hymn addresses Pḗgasos — the winged horse receives no cult-song, being no god. His archaic hymn is Hesiod's four-line birth notice (Theogony 280–286), the passage every later poet echoes, and Pindar's **Olympian 13**, which sings the bridle-gift at full length: "Athēnā, the maiden who loves war, brought him the gold-studded bridle." Pindar's ode — for a Corinthian victor, the city whose coins bore the horse — is the nearest thing to a Pegasus hymn Greek literature produced, and its warning about Bellerophōn's fall is the moral every emblem-book repeats.`,
      sources: [{ citation: 'Hesiod, Theogony 280–286; Pindar, Olympian 13.63–92.' }],
    },
    iconography: {
      body: `Corinthian silver is the archive: from ca. 550 BCE the city's staters bear **Pḗgasos in flight**, wing-curve forward, with the koppa letter — three centuries of identical branding. Vase painters loved the birth scene (the foal springing from Médousa's neck as Perseus recoils) and the Chimaira fight, where Bellerophōn spears from the saddle. Roman gems and the Pegasus of the **Tri-Star** and **Mobil** trademarks are direct descendants; the constellation figure, winged and halved, is Hellenistic. He is never shown with a horn — that confusion belongs to modern clip-art alone.`,
      sources: [{ citation: 'LIMC VII.1, s.v. Pegasos (Krauskopf); the Corinthian coin corpora.' }],
    },
  },

  seiren: {
    'homeric-hymns': {
      body: `The corpus contains no hymn to the Seirḗnes — fittingly: their own song is the only one they have. Their hymnic presence is the Odyssey's, which reports the song's opening lines ("Come here, renowned Odysseus, great glory of the Achaeans") and so preserves antiquity's most quoted specimen of enchantment. Later tradition gives them parents from the hymnic world — a Muse for a mother — and Euripides' *Helen* (167–178) gives them their one tragic aria, the invocation to the winged maidens to join her lament. It is the closest Greek tragedy comes to letting them sing on stage.`,
      sources: [{ citation: 'Homer, Odyssey 12.184–191; Euripides, Helen 167–178.' }],
    },
    iconography: {
      body: `The early image is exact: a bird's body, a woman's head — never a fish-tail. The **British Museum stamnos** (ca. 475 BCE) shows Odysseus bound to the mast beneath two enormous bird-maidens; a third plunges headlong into the sea, the suicide of the defeated song. South Italian funerary art adopted them as mourning musicians of the tomb (Paestum paintings, Campanian reliefs), sirens with lyres flanking the deceased. The mermaid form is medieval, when the northern fish-tailed siren absorbed the Greek bird-maiden — an iconographic annexation that the alarm-word "sirène" still commemorates.`,
      sources: [{ citation: 'British Museum 1843,1103.31 (Odysseus stamnos); LIMC VIII.1, s.v. Seirenes.' }],
    },
  },

  tyche: {
    'homeric-hymns': {
      body: `Týchē arrived after the hymnic age, but late antiquity gave her a hymn of her own: **Orphic Hymn 72, "To Tyche,"** addresses "noble Týchē, who steers the affairs of mortals," begging her favor "in deeds and in journey." The hymn is Pindar's Sōteira in liturgical form — chance invoked as helmswoman and begged for fair weather. Between Pindar's "saviour fortune, daughter of Zeús the deliverer" and the Orphic hymn stands her whole career: from an Oceanid's name in the Theogony's catalogue to the most prayed-to abstraction of the Hellenistic world.`,
      sources: [{ citation: 'Orphic Hymn 72 (Athanassakis & Wolkow); Pindar, Olympian 12.1–2.' }],
    },
    iconography: {
      body: `Her image is the most standardized of the Hellenistic age: seated or standing, wearing the **mural crown** of city walls, holding the **cornucopia** and a **rudder** — Eutychides' Tyche of Antioch (ca. 300 BCE) set the type, the river Orontes swimming at her feet. Cities from Palmyra to Alexandria minted their own versions on coins for five centuries; the Vatican's Roman copy preserves the lost bronze original. The wheel appears under Rome (Fortuna's attribute), and the globe and rudder together made her the empire's allegory of governance itself.`,
      sources: [{ citation: 'LIMC VIII.1, s.v. Tyche (Villard); the Vatican Tyche copy.' }],
    },
  },

  // ── Greek locations ──────────────────────────────────────────────────────
  delos: {
    topography: {
      body: `Dêlos is a granite rib of 3.4 km² in the centre of the Cyclades: a harbour bay on the west, the Sacred Lake (drained since 1925) and the sanctuary quarter on the north, the theatre district on the south, and **Mount Kynthos** (113 m) rising behind — the island's single height, crowned by the sanctuary of Zeús and Athēnā Kynthioi. Its neighbor **Rheneia**, a walk of oars away, served as the necropolis-island after the purifications. Barren of water and soil, the island's holiness was always an act of choice rather than of nature — exactly as the Hymn says.`,
      sources: [{ citation: 'Bruneau & Ducat, Guide de Délos; Homeric Hymn to Apollo 25–90.' }],
    },
    'historical-sources': {
      body: `The literary file is rich: the **Homeric Hymn to Delian Apóllōn** (the island's foundation charter), Thucydides (1.8, 3.104) on the purifications and the revived Delia festival, Herodotus (6.97) on the earthquake that never came, Strabo (14.5.2) on the slave market's ten thousand a day. The **temple inventories** (IDélos inscriptions) record the god's property in accountancy detail for three centuries, and the Athenian tribute lists track the League's treasury until its removal in 454 BCE. Cicero and the Italian negotiatores' dedications close the file in the Roman free-port era.`,
      sources: [{ citation: 'Thucydides 3.104; Strabo 14.5.2; IDélos inventory inscriptions.' }],
    },
    'modern-site': {
      body: `Excavated by the **French School at Athens** since 1873, Dêlos is today an uninhabited museum-island reachable by boat from Mykonos: the Terrace of the Lions (the originals now in the site museum, replicas in place), the House of Dionysos mosaics, the synagogue, and the sanctuary quarter are open along marked paths. **UNESCO** listed it in 1990. Conservation is the site's whole modern story — salt, wind, and two million visitors a decade against marble and mosaic — with the French School's annual campaigns continuing the longest-running excavation in the Greek islands.`,
      sources: [{ citation: 'UNESCO listing 530 (1990); École française d\'Athènes, Délos reports.' }],
    },
  },

  troia: {
    topography: {
      body: `Troíā is **Hisarlık**, a 32-metre occupation mound at the entrance of the Dardanelles, where the Scamander (Karamenderes) meets the sea: a citadel of nine major layers (Troy I–IX, ca. 3000 BCE–500 CE) above the plain of the battles. The candidate Homeric cities are **Troy VI** (massive limestone walls, destroyed ca. 1250 BCE) and **Troy VIIa** (burned ca. 1180 BCE with sling-stones and arrowheads in the debris). The Scaean Gate's candidates, the lower city's defensive ditch, and the besiegers' beached-ship geography of the Iliad all map onto the mound's real contours.`,
      sources: [{ citation: 'Korfmann & Mannsperger, Troia: ein historischer Überblick; Latacz, Troy and Homer.' }],
    },
    'historical-sources': {
      body: `The literary file begins with the Iliad and Odyssey and never closes: Herodotus (7.43) records **Xerxes'** sacrifice of a thousand oxen to Athēnā Ilias on the way to Greece; Arrian describes **Alexander's** pilgrimage and his taking of the "shield of Achilleús" from her temple; Strabo (13) gives the fullest ancient topography. The **Hittite archives** name Wilusa and Taruisa — matched to (W)ilios and Troia — and the Tawagalawa letter places an Ahhiyawan (Achaean) king's quarrel in the right sea at the right century: the Bronze Age city's own paperwork.`,
      sources: [{ citation: 'Herodotus 7.43; Hittite letter corpora (Wilusa); Strabo 13.' }],
    },
    'modern-site': {
      body: `The site's modern biography is archaeology's own: **Schliemann's** trenches (1870s–90s, and the smuggled "Priam's Treasure," now mostly in Moscow), Dörpfeld's stratigraphy, Blegen's careful re-sounding, and the **Korfmann/Tübingen campaigns** (1988–2012) that mapped the lower city and made the Wilusa equation mainstream. **UNESCO** listed Troy in 1998; the **Troy Museum** at Tevfikiye (2018) now houses the finds on site. The plain itself — the Scamander's silted shore — is preserved as a national park, the battlefield landscape readable as Homer describes it.`,
      sources: [{ citation: 'UNESCO listing 849 (1998); Korfmann excavation reports.' }],
    },
  },
};
