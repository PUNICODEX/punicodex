/**
 * Lore enrichment, batch A — Greek entries (11).
 * Deepens the 2026-07-20 new-flagship lore to flagship standard: full
 * domains objects (title/subtitle/lead/cards with iconPath), symbol objects,
 * 3-4 myth texts, syncretism / culturalLegacy / archaeology / meditation,
 * pronunciation notes, and 6-7 catalog-valid sources per entry.
 * Merged into scripts/lore-catalog.json by tools/new-domains/apply-enrich.js.
 * All claims follow ACCURACY.md: attested sources only, no invented myth.
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
};

module.exports = {
  achilleus: {
    pronunciationNote:
      'Homeric Greek Ἀχιλλεύς scans with a short i and a stressed final syllable; the geminate λλ is attested in the best manuscripts beside the single-λ variant Ἀχιλεύς. The restoration Achilleús keeps the acute on the final syllable exactly where the Greek puts it.',
    domains: {
      title: 'The Best of the Achaeans',
      subtitle: 'War, Glory, Rage, and the Short Bright Life',
      lead: `<p class='lead-text'>Achilleús is the hero the <em>Iliad</em> is named around: the man who chose a short life with imperishable fame (<em>kleos aphthiton</em>) over a long life in obscurity. His wrath is the poem's first word — <em>mēnin</em> — and his heel is the world's oldest named weakness.</p>`,
      cards: [
        { iconPath: ICONS.flame, name: 'The Wrath', desc: 'The Iliad opens on his mēnis — a rage that costs the Achaeans thousands of lives and remakes epic poetry.' },
        { iconPath: ICONS.wall, name: 'The Heel', desc: 'The single unarmoured point of an otherwise deathless fighter; the West\'s shorthand for a fatal flaw.' },
        { iconPath: ICONS.star, name: 'Kleos Aphthiton', desc: 'Imperishable fame — the bargain every brand strikes: burn briefly and be remembered forever.' },
        { iconPath: ICONS.ship, name: 'Leuke the White Isle', desc: 'His afterlife island in the Black Sea, where sailors left offerings to the hero for a thousand years.' },
      ],
    },
    symbols: [
      { name: 'The ash spear', meaning: 'The Pelian spear only he could wield — strength that cannot be inherited' },
      { name: 'The heel', meaning: 'The mortal point in the immortal frame; vulnerability as destiny' },
      { name: 'The lyre', meaning: 'He sang of heroes\' fame in his tent — the warrior who is also a poet' },
      { name: 'The Scamander', meaning: 'The river that rose against him when his killing choked its waters' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Son of the mortal Pēleús and the sea-goddess Thetis, Achilleús stands exactly between god and man: the strongest argument the Greeks ever made that excellence cannot cancel mortality.</p>`,
      myths: [
        { tag: 'The Choice', title: 'Two Fates', text: `<p class='myth-text'>His mother Thetis told him he carried two fates: stay at Troy and win glory that never dies, or sail home to a long life forgotten. In Iliad 9 he weighs them aloud — the first hero in Western literature to choose knowingly, and to choose the flame over the ember.</p>` },
        { tag: 'The Rage', title: 'The Death of Pátroklos', text: `<p class='myth-text'>When Hektōr killed Pátroklos, who wore Achilleús' own armour into battle, grief converted the hero's anger from his king to his enemy. He returned to war knowing it sealed his death, killed Hektōr before the walls of Troy, and dragged the body behind his chariot — until Priam's night visit taught him pity again.</p>` },
        { tag: 'The Wound', title: 'Paris\' Arrow', text: `<p class='myth-text'>Later tradition gives the death the Iliad only foreshadows: an arrow from Paris, guided by Apóllōn, finding the one vulnerable heel. The Roman-era Achilleid of Statius tells how Thetis dipped the infant in the Styx, holding him by that heel — the water made him deathless everywhere her hand did not cover.</p>` },
        { tag: 'The Afterlife', title: 'The White Island', text: `<p class='myth-text'>Greek sailors of the Black Sea believed Achilleús lived on as a daimōn of Leuke, the White Island, with Helen or Medea as consort. Arrian and Pausanias report the cult; sailors anchored there to leave offerings well into the Roman period — a hero-cult with a real address.</p>` },
      ],
    },
    syncretism: `<p>Rome read him through the Aeneid's mirror: Achilles is what Aeneas must not be — brilliant, doomed, and defiant of fate. Alexander the Great slept with the Iliad under his pillow and raced around Achilleús' supposed tomb at Troy, consciously modelling his own short bright career on the hero's choice.</p><p>In late antiquity and Byzantium he survived as a romance figure; in the Renaissance he returned as the measure of martial virtue. Modern Greece claims him as a national ancestor whose very untranslatability — rage, grief, honour — defines the epic imagination.</p>`,
    culturalLegacy: `<p>His name seeded two everyday terms: the Achilles heel (a single fatal weakness) and the Achilles tendon, named by the anatomist Verheyen in 1693 for the tendon nearest the mythic wound. "The wrath of Achilles" remains the standard translation exercise for every student of Greek, the μῆνιν ἄειδε θεά that begins Western literature.</p><p>Psychology borrowed him too: the "Achilles complex" names self-destructive rage, and every sport that sells invincibility borrows his silhouette — until the heel reminds the audience how the story ends.</p>`,
    archaeology: `A hero-cult of Achilleús is documented at his tomb in the Troad (the tumulus at Sivri Tepe) and, most vividly, on the island of Leuke off the Danube delta, where Arrian reports a temple, votive offerings, and the hero appearing to sailors. Vase painting made him one of the most depicted figures in Greek art: the François Vase shows his pursuit of Troilos, and the Achilles-and-Ajax dice game survives in dozens of black-figure cups, including Exekias' masterpiece. Roman-era stamps and lamps from Olbia confirm the Black Sea cult lasted centuries.`,
    extendedMeditation: `<p>Achilleús is the god of the deadline. He knows the exact price of brilliance and pays it anyway, and his story asks the reader which currency they are spending: years, or light. To hold his name is to hold the oldest question in the Western canon — whether a life is measured by its length or by what survives it.</p>`,
    sources: [{ name: 'LSJ' }, { name: 'Iliad' }, { name: 'Beekes' }, { name: 'Pindar' }, { name: 'Apollodorus' }, { name: 'Pausanias' }, { name: 'Cambridge' }],
  },

  asklepios: {
    pronunciationNote:
      'Attic Ἀσκληπιός places the acute on the final syllable; the η is unambiguously long, so the stacked macron-acute of the ideal form ḗ is philologically defensible. The owned form Asklēpiós follows the house rule against stacked marks while preserving both features across two characters.',
    domains: {
      title: 'The Physician of the Gods',
      subtitle: 'Medicine, Healing, Incubation, and the Boundary of Death',
      lead: `<p class='lead-text'>Asklēpiós is the only hero whose skill frightened the gods: the surgeon-son of Apóllōn who healed so well that Zeús destroyed him for emptying the underworld. His sanctuaries were the hospitals of the ancient world, and his snake-entwined staff still hangs over every pharmacy on earth.</p>`,
      cards: [
        { iconPath: ICONS.serpent, name: 'The Rod', desc: 'A single serpent on a staff — the true emblem of medicine, distinct from Hermês\' two-snaked caduceus.' },
        { iconPath: ICONS.star, name: 'Epidaurus', desc: 'The greatest healing sanctuary of antiquity, where patients slept among sacred snakes and dogs.' },
        { iconPath: ICONS.mask, name: 'Incubation', desc: 'Temple sleep: the god visited dreams and prescribed the cure, recorded on the iamata tablets.' },
        { iconPath: ICONS.bolt, name: 'The Thunderbolt', desc: 'Zeús\' answer to resurrection — the line past which even healing becomes transgression.' },
      ],
    },
    symbols: [
      { name: 'The serpent', meaning: 'Renewal through the shed skin; the chthonic knowledge of roots and venoms' },
      { name: 'The staff', meaning: 'The physician\'s walking stick; authority without weaponry' },
      { name: 'The dog', meaning: 'The wound-licking guardian of the sanctuary floor' },
      { name: 'The cock', meaning: 'The vigil-bird sacrificed to him — Sócrates\' famous last debt' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Born from catastrophe — cut from the womb of the dying Korōnis by his father Apóllōn — Asklēpiós was raised by the centaur Cheirōn, who taught him the pharmaka of roots and the surgery of the knife.</p>`,
      myths: [
        { tag: 'The Birth', title: 'The Child of the Pyre', text: `<p class='myth-text'>Apóllōn, having killed Korōnis for her infidelity, snatched the unborn child from her funeral fire and gave him to Cheirōn. The healing god thus begins between death and rescue: Pindar sings that the centaur taught him to cure "those suffering from nature's wounds."</p>` },
        { tag: 'The Transgression', title: 'Raising the Dead', text: `<p class='myth-text'>Given the Gorgon's blood by Athēnā — one side destroying, one side saving — Asklēpiós raised the dead, Hippolytos among them in the Roman telling. Zeús struck him with the thunderbolt for disturbing the order of nature; Apóllōn avenged him by killing the Kyklōpes, and Zeús finally raised the physician among the stars.</p>` },
        { tag: 'The Cult', title: 'The Sleep that Cures', text: `<p class='myth-text'>At Epidaurus, Kos, and Pergamon, the sick purified themselves, slept in the abaton, and dreamed the god's prescription — or woke healed by the sacred snakes that roamed the dormitory. The inscribed iamata record real names and afflictions: the largest surviving archive of ancient patient testimony.</p>` },
        { tag: 'The Last Words', title: 'A Cock for Asklēpiós', text: `<p class='myth-text'>Plato records Sócrates' final sentence: "Krito, we owe a cock to Asklēpiós — pay it, do not forget." The dying philosopher thanked the healing god as if death itself were the cure for life — the god's strangest and most famous offering.</p>` },
      ],
    },
    syncretism: `<p>Rome imported him wholesale in 293–291 BCE: the Sibylline Books prescribed his cult during a plague, an embassy fetched a sacred snake from Epidaurus, and the snake swam ashore on the Tiber Island — where a temple of Aesculapius, shaped in memory like a ship, stood within the year. In Ptolemaic Egypt he merged with the deified vizier Imhotep, whose own healing cult at Saqqara and Memphis Greeks openly called "the Egyptian Asklēpiós."</p>`,
    culturalLegacy: `<p>The Rod of Asklēpiós — one snake, one staff — is the emblem of the World Health Organization, the American Medical Association, and thousands of medical schools, endlessly confused with the caduceus of Hermês (commerce and negotiation). The Hippocratic tradition at Kos inherited his sanctuary; Galen began his career as a physician to gladiators at Pergamon's Asklepieion. "Asklepios" remains the living name of hospitals, journals, and medical AI projects alike.</p>`,
    archaeology: `The sanctuary at Epidaurus — a UNESCO World Heritage site — preserves the abaton, the circular tholos (possibly the god's labyrinthine "dance floor" designed by Polykleitos), and the theatre where healed patients watched drama as therapy. The iamata stelai, re-erected from Roman copies of the 4th-century-BCE originals, list some seventy cures. At Kos, the terraced Asklepieion adjoins the Hippocratic plane tree's descendants; at Rome the Tiber Island temple's travertine snake-prow survives.`,
    extendedMeditation: `<p>Asklēpiós is the god of the second opinion. He stands at the exact border between what may be cured and what must be accepted, and the thunderbolt that killed him marks medicine's eternal question: not whether we can, but whether we should. Every healer who has ever weighed risk against hope has stood inside his sanctuary.</p>`,
    sources: [{ name: 'LSJ' }, { name: 'Homeric Hymns' }, { name: 'Pindar' }, { name: 'Pausanias' }, { name: 'Plato' }, { name: 'Apollodorus' }, { name: 'Cambridge' }],
  },

  atropos: {
    pronunciationNote:
      'Greek Ἄτροπος carries the recessive accent of a feminine agent-noun on the first syllable — Átropos — from ἀ- ("not") plus τρέπω ("to turn"): the one who cannot be turned. The Latin form Atropos keeps the same stress, which is why the English "atropos" and the goddess sound alike.',
    domains: {
      title: 'The Inflexible',
      subtitle: 'Fate, Necessity, and the Cut Thread',
      lead: `<p class='lead-text'>Átropos is the third of the three Moirai: Klōthṓ spins the thread, Láchesis measures it, and Átropos cuts it. Her name is a verdict — "she who cannot be turned aside" — and Greek literature treats her not as a villain but as the grammar of endings itself.</p>`,
      cards: [
        { iconPath: ICONS.thread, name: 'The Shears', desc: 'Her attribute from Hellenistic art onward: the blades that end the measured span.' },
        { iconPath: ICONS.wheel, name: 'The Spindle of Necessity', desc: 'In Plato\'s Republic she turns the future on the cosmic spindle her mother Anánkē holds.' },
        { iconPath: ICONS.flame, name: 'The Brand of Méleagros', desc: 'The log whose burning measured a hero\'s life — her timetable written in firewood.' },
        { iconPath: ICONS.scale, name: 'Atropine', desc: 'The alkaloid of deadly nightshade, Atropa belladonna, named for the cut she delivers.' },
      ],
    },
    symbols: [
      { name: 'The shears', meaning: 'The instrument of the cut — finality without malice' },
      { name: 'The thread', meaning: 'The spun and measured life she completes' },
      { name: 'The scroll', meaning: 'In Roman art the Parcae write as well as spin — fate as record' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Hesiod names her with her sisters in the Theogony: Klōthṓ, Láchesis, and Átropos, "who give mortals good and evil." Of the three, she alone never appears as a character with dialogue — she is the act, not the actor.</p>`,
      myths: [
        { tag: 'The Genealogy', title: 'Daughters of Night', text: `<p class='myth-text'>In the Theogony's first account the Moirai are fatherless daughters of Nyx, Night — older than Zeús himself, and in some traditions even the king of gods bows to their decree. A second Hesiodic account makes them daughters of Zeús and Themis, law-givers by birth: the tension between fate above Zeús and fate as his instrument runs through all Greek thought.</p>` },
        { tag: 'The Warning', title: 'Méleagros and the Brand', text: `<p class='myth-text'>Seven days after Méleagros' birth the Moirai appeared to his mother Althaia and declared the child would live only until the log then burning on her hearth was consumed. She snatched it from the fire and kept it for years — until, enraged at her son for killing her brothers, she thrust it back into the flames, and Átropos' sentence completed itself at once.</p>` },
        { tag: 'The Cosmos', title: 'The Future on the Spindle', text: `<p class='myth-text'>In the Myth of Er that closes Plato's Republic, the souls see the spindle of Anánkē, Necessity, around which all the spheres of heaven turn. Láchesis sings the past, Klōthṓ the present, and Átropos the future — the three sisters holding the music of the planets in their hands.</p>` },
      ],
    },
    syncretism: `<p>Rome mapped her onto Morta of the Parcae (from mors, death), with Nona and Decuma spinning and measuring — though later poets reshuffled the names. The Latin poets from Catullus to Seneca use the Fates' cut as the fixed boundary of rhetoric itself: even Jove, they repeat, cannot unshear what is sheared.</p><p>Modern biology gave her a second immortality: the nightshade genus Atropa and its alkaloid atropine — the poison that stills the heart and the drug that restarts it — carry the name of the Inflexible into every emergency room.</p>`,
    culturalLegacy: `<p>Shakespeare's "thread of life" and every three-weird-sisters scene from Macbeth to modern fantasy descend from her triad. In philosophy she anchors the ancient debate on determinism: Chrysippus and the Stoics built their heimarmenē around the Moirai's decree, and Epicurus invented the atomic swerve partly to break Átropos' loom. Wherever an ending is shown as both just and unalterable, her shears are in the frame.</p>`,
    archaeology: `The Moirai rarely received independent cult — Pausanias notes an altar to them beside the sanctuary of Despoina in Arcadia and statues in the temple of Zeús Moiragetēs ("leader of the fates"). Their true monument is funerary: Roman sarcophagi carved the Parcae with spindle, scroll, and shears as standard eschatological furniture, and Hellenistic gems show Átropos with her blades. The famous "Spindle Whorl" dedications of spinning-women's tools in temple deposits tie the goddess's craft to real women's work.`,
    extendedMeditation: `<p>Átropos is the least frightening of the Fates once understood: she does not shorten the thread, she only confirms its measure. Every system that ends cleanly — a contract performed, a story resolved, a life fully spent — has passed through her hands. The terror belongs not to the cut but to the tangle.</p>`,
    sources: [{ name: 'LSJ' }, { name: 'Hesiod, Theogony' }, { name: 'Plato' }, { name: 'Apollodorus' }, { name: 'Pausanias' }, { name: 'Beekes' }],
  },

  delos: {
    pronunciationNote:
      'Greek Δῆλος scans with a long eta — Dêlos with the circumflex marks the stressed long vowel of the nominative exactly as ancient grammarians wrote it. The macron-only form Dēlos is the standard academic fallback (LSJ convention); both are defensible, and the circumflex form is the owned primary.',
    domains: {
      title: 'The Unmoved Island',
      subtitle: 'Birthplace of Light, Sacred Harbour, and Open Market',
      lead: `<p class='lead-text'>Dêlos is the smallest great place in Greek religion: a bare rock of three square miles that became the holiest island in the Aegean — the birthplace of Apóllōn and Ártemis — and then, by a turn of history, the busiest free port of the Hellenistic world.</p>`,
      cards: [
        { iconPath: ICONS.sun, name: 'Birth of the Twins', desc: 'Lētō, refused by every land fearing Hēra, found refuge on the floating isle — and light was born there twice.' },
        { iconPath: ICONS.mountain, name: 'Mount Kynthos', desc: 'The island\'s single hill, giving Apóllōn his epithet Kynthios and climbers the Aegean\'s best panorama.' },
        { iconPath: ICONS.column, name: 'Terrace of the Lions', desc: 'The Naxian lions of ca. 600 BCE, still facing the Sacred Lake they were carved to guard.' },
        { iconPath: ICONS.ship, name: 'The Free Port', desc: 'Rome\'s gift of 166 BCE: a duty-free harbour that made Dêlos the entrepôt of the eastern Mediterranean.' },
      ],
    },
    symbols: [
      { name: 'The palm tree', meaning: 'The tree Lētō grasped in labour beside the Sacred Lake' },
      { name: 'The lions', meaning: 'Naxian guardianship of the god\'s birthplace' },
      { name: 'The Sacred Lake', meaning: 'The round lake by which the twins were born, dried since 1925' },
    ],
    mythology: {
      lead: `<p class='lead-text'>The Homeric Hymn to Apóllōn gives the island a voice: Dêlos speaks, fears the god's power, and is promised eternal fame if she receives his birth — the founding charter of Aegean sanctity.</p>`,
      myths: [
        { tag: 'The Refuge', title: 'The Island that Said Yes', text: `<p class='myth-text'>Hounded by Hēra's jealousy, the pregnant Lētō was refused by every island and mainland city until barren, drifting Dêlos accepted her — asking only that Apóllōn build his great temple there. Lētō swore by the Styx, clasped a palm tree, and after nine days of labour bore Apóllōn and Ártemis between the mountain and the lake.</p>` },
        { tag: 'The Anchoring', title: 'The Floating Isle Made Fast', text: `<p class='myth-text'>Pindar and Callimachus preserve the tradition that Dêlos once floated freely over the sea, visible in no fixed place, until the twins' birth pinned her down — Zeús fastened her with adamant chains to the sea floor. Her other ancient name, Astería ("the starry"), recalls the wandering light that became a fixed point.</p>` },
        { tag: 'The Purifications', title: 'No Birth, No Death', text: `<p class='myth-text'>To keep the god's birthplace pure, Athens purified Dêlos twice: Peisístratos removed the graves visible from the temple, and in 426/5 BCE the Athenians cleared the whole island of burials and forbade anyone to be born or to die there — the sick and pregnant ferried to Rheneia. A law of hospitality: the island belonged to the god alone.</p>` },
        { tag: 'The Treasury', title: 'The Delian League', text: `<p class='myth-text'>After the Persian Wars, the Greek alliance against Persia kept its common treasury in Apóllōn's sanctuary on Dêlos — the neutral sacred bank of the Aegean. In 454 BCE Athens moved the funds to the Parthenon, converting an alliance into an empire; the island's political star faded even as its sanctity endured.</p>` },
      ],
    },
    syncretism: `<p>Rome read Dêlos through commerce as much as cult: declared a free port in 166 BCE to undercut Rhodes, it became the clearing-house of the eastern Mediterranean, famous — and infamous — for a slave market that Strabo says could receive and dispatch ten thousand slaves in a day. Italian bankers, Syrian merchants, and Egyptian cult associations all built clubhouses there, making late Dêlos the most cosmopolitan town of its century.</p>`,
    culturalLegacy: `<p>"Delian" survives as Apóllōn's epithet and as the name of history's first studied alliance — the "Delian League" is the template for every discussion of alliance politics from Thucydides to NATO seminars. The riddle of doubling the god's cubic altar at Dêlos — the "Delian problem" — provoked two of the three classical problems of Greek mathematics and Plato's rebuke that the god meant the Greeks to study geometry, not stonecutting.</p>`,
    archaeology: `Dêlos is one of the richest excavated sites in Greece, a UNESCO World Heritage site worked by the French School at Athens since 1873. Standing monuments include the Terrace of the Lions (five of the original nine-plus Naxian lions in situ), the House of Dionysos with its superb mosaics, the theatre quarter's cisterns, the synagogue — one of the oldest identified — and the sanctuary complex of Apóllōn with its colossal kouros base. A 1st-century-BCE pirate raid and Mithridates' sack in 88 BCE froze the merchant city in the archaeological record.`,
    extendedMeditation: `<p>Dêlos teaches that insignificance can be chosen. A rock with no water, no soil, and no harbour worth the name became the centre of a world because it alone said yes — and then became rich because everyone remembered that it had. Sanctuary and market, poverty and splendour: the island holds both without apology.</p>`,
    sources: [{ name: 'Homeric Hymns' }, { name: 'Pindar' }, { name: 'Herodotus' }, { name: 'Pausanias' }, { name: 'LSJ' }, { name: 'Cambridge' }],
  },

  drakon: {
    pronunciationNote:
      'Greek δράκων derives from the aorist root of δέρκομαι, "to see clearly" — the dragon is etymologically "the sharp-sighted one," the watcher. The circumflex in Drákōn marks the long ō of the -ων stem; the macron-only Drakōn is the scholarly fallback.',
    domains: {
      title: 'The Watcher',
      subtitle: 'Guardian Serpents, Spring Wardens, and the Sown Teeth',
      lead: `<p class='lead-text'>Drákōn is not the fire-breathing hoard-guard of medieval romance but the Greeks' older idea: the enormous serpent that guards — a spring, a tree, a golden fleece, a goddess's shrine. His name comes from the verb "to see": the dragon is the one who never blinks.</p>`,
      cards: [
        { iconPath: ICONS.eye, name: 'The Unsleeping Gaze', desc: 'From δέρκομαι, "to see" — the dragon\'s defining power is vigilance, not flame.' },
        { iconPath: ICONS.serpent, name: 'Python', desc: 'The earth-serpent of Delphoi slain by Apóllōn, whose rotting gave the site its old name, Pythō.' },
        { iconPath: ICONS.star, name: 'Ladon', desc: 'The hundred-headed warden of the Hesperides\' golden apples, coiled in the sky as Draco.' },
        { iconPath: ICONS.mountain, name: 'The Sown Teeth', desc: 'Kadmos killed the Ismenian dragon and planted its teeth — an armed harvest, the Spartoi, sprang up.' },
      ],
    },
    symbols: [
      { name: 'The coil', meaning: 'The guarding embrace; energy held in reserve around the treasure' },
      { name: 'The spring', meaning: 'What the dragon always guards — water, the earth\'s own wealth' },
      { name: 'The teeth', meaning: 'Violence sown into the ground, sprouting as civil strife' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Every Greek dragon is a threshold made flesh: kill one and a sanctuary, a city, or a marriage becomes possible — which is why the founders of cities are all, sooner or later, dragonslayers.</p>`,
      myths: [
        { tag: 'The Oracle', title: 'Apóllōn and Python', text: `<p class='myth-text'>The Homeric Hymn to Apóllōn tells how the god, seeking a site for his oracle, found the spring at Delphoi guarded by a great she-dragon who had nursed Typhaon and ravaged the flocks. He shot her and left her to rot in the sun — "now rot (pytheu) here upon the fruitful soil" — and the place was called Pythō, the priestess Pythia, ever after.</p>` },
        { tag: 'The City', title: 'Kadmos at the Spring', text: `<p class='myth-text'>Sent to fetch water from the Ismenian spring, Kadmos' companions were killed by its guardian dragon, offspring of Árēs. Kadmos crushed it with a rock, and on Athēnā's counsel sowed half its teeth: armed men, the Spartoi, rose from the furrows and killed each other until five remained — the ancestors of Thebes' noble houses.</p>` },
        { tag: 'The Apples', title: 'Ladon of the Hesperides', text: `<p class='myth-text'>Beyond Atlas, at the world's western edge, the dragon Ladon — offspring of Phorkys and Ketō, in Hesiod "terrible, with a hundred voices" — coiled around the tree of the golden apples that Gaia gave at Hēra's wedding. Hēraklēs' eleventh labour took the apples; the wounded or slain dragon was set among the stars as the constellation Draco, coiled around the north celestial pole.</p>` },
        { tag: 'The Fleece', title: 'The Kolchian Warden', text: `<p class='myth-text'>The Golden Fleece hung in Árēs' grove at Kolchis, guarded by a dragon "vast as a fifty-oared ship" that Apollonius says never closed its eyes in sleep. Mēdeia's song and her pharmaka drenched it in slumber — the rare Greek dragon defeated not by force but by knowledge.</p>` },
      ],
    },
    syncretism: `<p>The Roman army adopted the draco — a hollow serpent standard with streaming windsock — from Sarmatian and Dacian cavalry, and Late Roman legions marched under dragons centuries before European heraldry claimed them. Through Latin draco the Greek watcher became the medieval dragon: hoard-guard, maiden-taker, and finally the saint-slaying beast of George and Margaret. The constellation Draco still turns around the pole, Ladon's image fixed in the sky.</p>`,
    culturalLegacy: `<p>Every modern "dragon" is his descendant, filtered through Latin and the Middle Ages; yet Greek dragons remained serpents — wingless, earthbound, water-tied — which is why scholars still correct the fire-lizard image. In physics and computing the name lives quietly: Draco the constellation, dragon curve fractals, and "chase the dragon" idioms all pullulate from the Greek root of the watcher who never sleeps.</p>`,
    archaeology: `Greek dragons are text-and-image creatures: the finest evidence is vase painting, where Python, Ladon, and the Kolchian warden appear as bearded, crested serpents from the 6th century BCE onward — a Ladon on an Apulian vase in Naples shows the many-coiled form most clearly. The dragon's civic role is epigraphic: Thebes' founding myth was official city ideology, and Athens kept a sacred snake on the Acropolis (the "guardian of the citadel" of Herodotus 8.41) as a living drakōn of the polis.`,
    extendedMeditation: `<p>Drákōn guards what cannot be owned: springs, trees, thresholds. The Greeks knew that every treasure worth having is held by something that watches — and that the hero's real labour is rarely the killing but the seeing: understanding what the dragon was protecting, and why.</p>`,
    sources: [{ name: 'LSJ' }, { name: 'Homeric Hymns' }, { name: 'Hesiod, Theogony' }, { name: 'Apollodorus' }, { name: 'Apollonius' }, { name: 'Beekes' }],
  },

  monokeros: {
    pronunciationNote:
      'Greek μονόκερως is a compound: mónos ("single") plus kéras ("horn"), stressed on the first element. Greek authors used it of real and reported animals alike — the rhinoceros included — centuries before Latin monoceros and the medieval unicorn softened it into legend.',
    domains: {
      title: 'The One Horn',
      subtitle: 'The Untamable, the Pure, and the Report from India',
      lead: `<p class='lead-text'>Monókerōs begins not in myth but in the first travel writing of the West: Ktēsias' account of the wild asses of India, each bearing a single horn a cubit and a half long. Between his report and the medieval virgin-and-unicorn lies the whole history of how observation becomes symbol.</p>`,
      cards: [
        { iconPath: ICONS.horn, name: 'The Alicorn', desc: 'The single horn, credited from antiquity with detecting and neutralizing poison.' },
        { iconPath: ICONS.mountain, name: 'India', desc: 'Ktēsias placed the one-horned wild asses in India — reports that likely fused rhinoceros, onager, and oryx.' },
        { iconPath: ICONS.star, name: 'The Re\'em', desc: 'The Septuagint rendered the untamable Hebrew re\'em as monokeros — the unicorn\'s biblical passport.' },
        { iconPath: ICONS.bolt, name: 'The Untamable', desc: 'In Job the re\'em-monokeros is God\'s exhibit of what no man can bind to a furrow.' },
      ],
    },
    symbols: [
      { name: 'The single horn', meaning: 'Unity, sovereignty, and the single point of concentrated power' },
      { name: 'The wild ass', meaning: 'The original Greek animal — swift, fierce, and uncatchable' },
      { name: 'The cup', meaning: 'Alicorn drinking vessels of kings, supposedly proof against poison' },
    ],
    mythology: {
      lead: `<p class='lead-text'>The Greek tradition is zoological, not mythological: no hero fights the monokeros, no god rides it. Its power lies precisely in being reported — a creature at the edge of the map, described by those who claim to have seen its horn in the flesh.</p>`,
      myths: [
        { tag: 'The Report', title: 'Ktēsias of Knidos', text: `<p class='myth-text'>Ktēsias, physician to the Persian king Artaxerxēs, wrote in his Indika of Indian wild asses "swift as horses, with a single horn on the forehead, white at the base, black in the middle, crimson at the tip." Their horn shavings, he says, are an antidote to all poisons; their fleetness makes them unhuntable. His report is the unicorn's birth certificate.</p>` },
        { tag: 'The Verification', title: 'Aristotle\'s List', text: `<p class='myth-text'>Aristotle, a more careful zoologist, lists in his History of Animals the solid-hooved, one-horned "Indian ass" alongside the oryx — and gets the mechanics right: a real single horn must grow from the skull's midline, unlike the paired horns of cattle. Pliny the Elder later repeats the monoceros as "the fiercest animal," catchable, he was told, only by stratagem.</p>` },
        { tag: 'The Translation', title: 'The Re\'em Passage', text: `<p class='myth-text'>When the Septuagint translators met the re\'em — the wild ox of Hebrew scripture, image of untamable strength — they chose monokeros. The Latin Vulgate made it unicornis, and the King James Bible "unicorn": thus a Greek traveler's Indian ass entered the Psalms and Job, and every subsequent European imagination.</p>` },
      ],
    },
    syncretism: `<p>The medieval West transformed the report into allegory: the Physiologos made the unicorn catchable only by a virgin, and Christological exegesis followed — the horn the single nature, the capture the Incarnation. Heraldry crowned the transformation: the unicorn, chained because a free one is dangerous, became the royal beast of Scotland and the supporter of the British royal arms, facing the lion.</p>`,
    culturalLegacy: `<p>Narwhal tusks, sold as alicorns, were literally worth their weight in gold; the Danish throne was "made of unicorns," and Elizabeth I paid £10,000 for one. Today the unicorn is the emblem of rarity itself — from heraldry to finance's "unicorn" startup — while scholars read Ktēsias' beast as a composite memory of the rhinoceros, the onager, and the profile-view oryx of Indus seals.</p>`,
    archaeology: `The unicorn's material trail begins with the Indus "unicorn" seal motif — thousands of steatite seals showing a one-horned bovid, almost certainly a bull in profile — and runs through Mesopotamian and Achaemenid art to the medieval narwhal-tusk trade. No ancient Greek depiction of Ktēsias' beast survives; the physical record is the trade itself: cups of "alicorn" in royal treasuries, like the one inventoried in the French crown jewels.`,
    extendedMeditation: `<p>Monókerōs is the patron of honest impossibility. The Greeks never claimed to rule it, saddle it, or even see it clearly — they only reported it, at the edge of the known. It stands for the single, the indivisible, the thing that cannot be made to serve: a reminder that some of the world's value lies in what refuses to be caught.</p>`,
    sources: [{ name: 'Ctesias' }, { name: 'Aristotle' }, { name: 'Pliny' }, { name: 'LSJ' }, { name: 'Beekes' }, { name: 'Cambridge' }],
  },

  phanes: {
    pronunciationNote:
      'Phánēs takes his name from the verb φαίνω, "to bring to light, to reveal" — the same root as "phenomenon" and "epiphany." The accent is recessive on the first syllable; the long ē of the second syllable is what the macron preserves in the restoration.',
    domains: {
      title: 'The First-Shining One',
      subtitle: 'The Orphic Egg, First Light, and the Swallowed Cosmos',
      lead: `<p class='lead-text'>Phánēs is the hidden first god of the Orphic theogonies: hatched from the silver egg of Time, winged and shining, the first form in which the universe could see itself. Zeús himself will swallow him — and in swallowing, become everything.</p>`,
      cards: [
        { iconPath: ICONS.egg, name: 'The Silver Egg', desc: 'Formed by Chronos in the aithēr; from it the shining one hatches with golden wings.' },
        { iconPath: ICONS.sun, name: 'Protogonos', desc: '"First-born" — his other name; also Erikepaios, Mētis, and bright-winged Erōs.' },
        { iconPath: ICONS.eye, name: 'The Swallowing', desc: 'Zeús devours Phánēs and with him all that is: sky, earth, sea, and the blessed gods.' },
        { iconPath: ICONS.bolt, name: 'The Key of Mind', desc: 'Orphic verse calls him "the key of the mind" — the first intelligence to shine in darkness.' },
      ],
    },
    symbols: [
      { name: 'The golden wings', meaning: 'The speed of first light spreading through unformed aithēr' },
      { name: 'The egg', meaning: 'The cosmos before division — shell, white, and yolk as earth, sea, and sky' },
      { name: 'The serpent wrapped with him', meaning: 'Time and necessity coiled around the first revelation' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Phánēs belongs to the other Greece — the Orphic theogonies sung by initiates, where the cosmos begins not with Chaos' yawn but with an egg, and the first god is light itself given a name.</p>`,
      myths: [
        { tag: 'The Hatching', title: 'Born of the Egg', text: `<p class='myth-text'>In the Orphic Rhapsodies, Chronos — Time unaging — fashions a silver egg in the divine aithēr. The egg splits, and Phánēs emerges: double-sexed, four-eyed, golden-winged, a bull-roarer here, a serpent there, "the first-born, the revealer," who brings light to the blessed gods and gives birth to the race of immortals.</p>` },
        { tag: 'The Sovereignty', title: 'Fourth King of the Gods', text: `<p class='myth-text'>The Orphic succession differs from Hesiod's: after Ouranós and Kronos, Phánēs holds the sceptre — fourth king, before Zeús. He creates the sun and moon, founds the first Olympus, and rules a cosmos that is still, as the hymns say, "all in one."</p>` },
        { tag: 'The Swallowing', title: 'Zeús Becomes All', text: `<p class='myth-text'>The supreme Orphic mystery: Zeús swallows Phánēs whole, and with him the entire first creation. The preserved fragment marvels — "thus all things were made anew within Zeús: sky, earth, sea, the stars, and the blessed gods" — and the cosmos is born a second time from the king's body. Creation is not once but twice: first revealed, then reabsorbed and reborn.</p>` },
        { tag: 'The Papyrus', title: 'The Derveni Commentary', text: `<p class='myth-text'>The Derveni papyrus — Europe's oldest surviving book, carbonized in a Macedonian funeral pyre around 340 BCE — quotes the Orphic poem about Protogonos and glosses him as "Mind": the first thing to leap forth. It proves the Phánēs theology was already old, already allegorized, before Plato wrote a word.</p>` },
      ],
    },
    syncretism: `<p>Greeks equated him with Erōs (the oldest god in Hesiod's alternative genealogy), with Mētis ("counsel"), and with Dionysos in his first, pre-Zagreus form — Orphism's theology is deliberately fluid. Scholars have long noted the kinship between Phánēs and the Mithraic lion-headed god wrapped by the serpent, and between the Orphic egg and Egyptian and Vedic world-eggs: the "first-shining" is one of humanity's recurring answers to the question of beginnings.</p>`,
    culturalLegacy: `<p>Plato absorbed Orphic creation into the Timaeus; the Neoplatonists made Phánēs a fixed metaphysical grade — Proclus cites him constantly. The word he gives us is as large as his myth: "phenomenon" (that which shines forth), "epiphany," "fantasy." Modern depth psychology's "primordial light" and the physics metaphor of the cosmic egg both descend, by way of Alexandria and Byzantium, from his hatching.</p>`,
    archaeology: `Phánēs left no temples — Orphic cult was initiatory and book-based — but two extraordinary documents survive: the Derveni papyrus (Thessaloniki, Archaeological Museum), quoting and interpreting the theogony, and the Orphic gold tablets from graves in Thessaly, Crete, and South Italy, whose instructions to the dead ("I am a child of Earth and starry Heaven") breathe the same cosmology. The Modena relief of a winged, egg-born deity (2nd century CE) is often, if cautiously, associated with his iconography.`,
    extendedMeditation: `<p>Phánēs is the god of first versions — the shining draft that must be swallowed and rewritten before the world can be published. Every creator knows him: the first form of anything true is radiant, total, and unusable, and only its sacrifice makes the durable cosmos. He asks a hard question: what are you willing to swallow of your first light so that something greater can be born?</p>`,
    sources: [{ name: 'Orphic' }, { name: 'Plato' }, { name: 'LSJ' }, { name: 'Beekes' }, { name: 'Aristotle' }, { name: 'Cambridge' }],
  },

  pegasos: {
    pronunciationNote:
      'Pḗgasos bears a name that is probably not Greek at all: scholars connect it to the Luwian storm god pihassas, carried into Greek myth through Anatolian contact. The folk etymology from πηγή, "spring," was already popular in antiquity — the horse who stamps springs from the rock.',
    domains: {
      title: 'The Thunder-Horse',
      subtitle: 'Springs, Lightning, and the Flight to Olympos',
      lead: `<p class='lead-text'>Pḗgasos springs from the severed neck of Médousa at the moment of her death — beauty erupting from horror — and ends as the thunder-bearer of Zeús and a constellation. He is the only winged horse of Greek myth with a name, and his route runs from blood to stars.</p>`,
      cards: [
        { iconPath: ICONS.wing, name: 'The Wings', desc: 'From sea-foam blood to the sky — the emblem of unbounded ascent.' },
        { iconPath: ICONS.wave, name: 'Hippocrene', desc: 'The Horse\'s Spring on Mount Helikṓn, struck open by his hoof — the poets\' fountain of inspiration.' },
        { iconPath: ICONS.flame, name: 'The Chimaira', desc: 'Bellerophōn\'s fire-breathing foe, fought from the saddle of the flying horse.' },
        { iconPath: ICONS.bolt, name: 'Bearer of Thunder', desc: 'Hesiod gives him Olympus\'s strangest job: carrying Zeús\' thunder and lightning.' },
      ],
    },
    symbols: [
      { name: 'The golden bridle', meaning: 'Athēnā\'s gift to Bellerophōn — divine technique mastering divine power' },
      { name: 'The hoof-print', meaning: 'The spring-maker; inspiration struck from stone' },
      { name: 'The constellation', meaning: 'His final shape — the great square of Pegasus riding the autumn sky' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Pḗgasos is the bridge-figure of Greek myth: born in a monster story, ridden in a hero story, employed in a god story — three genres, one horse.</p>`,
      myths: [
        { tag: 'The Birth', title: 'Out of the Gorgon', text: `<p class='myth-text'>Hesiod tells it in four lines: when Perseus cut the head from Médousa, out sprang great Pḗgasos and the warrior Chrysaōr — her children by Poseidṓn. The horse flew to the "immortal ones," and Hesiod already knows his office: "he lives in the halls of Zeús, carrying thunder and lightning for the counsellor."</p>` },
        { tag: 'The Bridle', title: 'Bellerophōn\'s Gift', text: `<p class='myth-text'>The hero Bellerophōn, sent to Lykia with a letter demanding his own death, was ordered to kill the Chimaira. Píndar sings how Athēnā appeared with a golden bridle — "take this charm for the horse" — and how, sacrificing to Poseidṓn the horse-breaker, Bellerophōn caught Pḗgasos at the spring of Peirene and from the air slew the fire-breathing beast.</p>` },
        { tag: 'The Fall', title: 'The Flight Too High', text: `<p class='myth-text'>Success bred the fatal wish: Bellerophōn tried to fly to Olympos itself. Zeús sent a gadfly to sting the horse, and the rider fell back to earth to wander the Aleian plain alone — Pindar's model of hybris punished — while Pḗgasos continued upward to the stables of the gods.</p>` },
        { tag: 'The Spring', title: 'The Fountain of the Horse', text: `<p class='myth-text'>On Helikṓn, mountain of the Muses, Pḗgasos struck the rock with his hoof and opened Hippocrene, the Horse's Spring, whose water makes poets. The image outlasted the cult: every later trope of inspiration — the struck rock, the flying horse, the intoxicating water — is his hoofprint.</p>` },
      ],
    },
    syncretism: `<p>His name is the syncretism: Luwian pihassas, a storm-god honoured in Cilicia, meets the Greek horse — which explains why an earth-and-sea creature serves the sky god's bolts. Rome made him a cavalry emblem and a favourite of coinage; Corinth stamped him on her silver for three centuries as the city's own beast, since Bellerophōn's Corinthian Peirene was his watering place.</p>`,
    culturalLegacy: `<p>Pḗgasos became the western shorthand for poetic flight — from the Renaissance "hobby-horse of the Muses" to Pope's mock-epic. His silhouette is arguably the most commercially licensed image from Greek myth: the red Pegasus of Mobil Oil flew over filling stations across the planet, and the TriStar Pictures logo opens thousands of films. Astronomy keeps his body nightly; literature keeps his spring.</p>`,
    archaeology: `Corinthian coinage is the standing archive: silver staters showing Pḗgasos in flight, with the koppa letter of Corinth, survive in thousands from ca. 550–250 BCE. Vase painters loved the birth scene — Perseus recoiling as the foal springs out — and the Amphiaraos krater shows the full cast. Corinth's Peirene fountain-house, repeatedly rebuilt from Archaic to Roman times, is the physical site of the bridle myth.`,
    extendedMeditation: `<p>Pḗgasos proves that origin is not destiny. Born of blood and salt and horror, he ends as pure ascent — the horse of storms who chooses the sky. He is the emblem of every act of imagination that takes off from wreckage: the spring in the stone, the poem in the wound.</p>`,
    sources: [{ name: 'Hesiod, Theogony' }, { name: 'Pindar' }, { name: 'Iliad' }, { name: 'Apollodorus' }, { name: 'LSJ' }, { name: 'Beekes' }],
  },

  seiren: {
    pronunciationNote:
      'Greek Σειρήν carries the accent on the final syllable — Seirḗn — and the etymology is contested: folk tradition heard σεῖρα, "cord," for the binding song, while modern scholarship looks to Semitic or pre-Greek roots. The macron on the eta preserves the long vowel of the nominative.',
    domains: {
      title: 'The Song that Knows',
      subtitle: 'Knowledge, Enchantment, and the Bone-Strewn Meadow',
      lead: `<p class='lead-text'>Seirḗn is the most intelligent monster in the Odyssey: she does not promise pleasure but knowledge — "we know everything that happens on the fruitful earth." The Greeks feared her because her offer is exactly what the wise cannot refuse.</p>`,
      cards: [
        { iconPath: ICONS.mask, name: 'The Song', desc: 'Not seduction but information: the Sirens sing the Trojan War to the man who fought it.' },
        { iconPath: ICONS.ship, name: 'The Mast', desc: 'Odysseus bound, crew deafened with wax — the original architecture of resisting temptation.' },
        { iconPath: ICONS.lyre, name: 'Orpheus\' Counter-Song', desc: 'The Argonauts were saved not by wax but by art: Orpheus out-sang the Sirens themselves.' },
        { iconPath: ICONS.wing, name: 'Bird and Maiden', desc: 'The Greek form — woman\'s head on a bird\'s body; the fishtail mermaid is a medieval graft.' },
      ],
    },
    symbols: [
      { name: 'The lyre', meaning: 'Song as the instrument of capture — art\'s dangerous edge' },
      { name: 'The meadow of bones', meaning: 'The flowering shore ringed with the rotting skins of the enchanted' },
      { name: 'The wax', meaning: 'Deliberate deafness — the technology of the will' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Daughters of the river-god Achelōos and a Muse — Melpomenē or Terpsichorē in the later accounts — the Seirḗnes unite the authority of water and the authority of song.</p>`,
      myths: [
        { tag: 'The Passage', title: 'Odyssey 12', text: `<p class='myth-text'>Kirkē warns Odysseus: the Sirens "enchant all who come near," and their island is heaped with bones. He has his crew plug their ears with wax and lash him to the mast. The Sirens hail him by name — they know his story — and promise that whoever hears them sails away "wiser." He strains at the ropes; the ship passes; the danger is measured in the distance of a song.</p>` },
        { tag: 'The Contest', title: 'Out-Sung by Orpheus', text: `<p class='myth-text'>Apollonius Rhodius sends the Argonauts past the same shore: one crewman, Boutēs, leaps overboard in surrender, but Orpheus strikes his lyre and drowns the enchantment in a nobler song. Later tradition completes the logic — defeated by Odysseus or Orpheus, the Sirens throw themselves into the sea and become rocks: a song that fails to bind has no reason to exist.</p>` },
        { tag: 'The Plaint', title: 'The Lost Wings', text: `<p class='myth-text'>In Euripides' Helen and later lyric, the Sirens are mourners: they searched the world for the abducted Persephonē and were given — or kept — their wings for the search. It is the myth behind the monster: grief transformed into inquiry, the song that asks after the lost girl forever.</p>` },
      ],
    },
    syncretism: `<p>Late antiquity moralized her: Christian writers made the Sirens the seductions of the world, the mast the cross. The Middle Ages merged her with the fish-tailed northern mermaid — the bird-maiden of Greece becoming the siren of romance — and French gave the world sirène, which is why modern alarm sirens and mermaids share a word. Kafka's parable "The Silence of the Sirens" gave her the last modern turn: a more fatal weapon than song is silence.</p>`,
    culturalLegacy: `<p>"Siren song" is the fixed phrase for an irresistible, ruinous offer; "siren" became the alarm that itself enchants. Adorno and Horkheimer made Odysseus-at-the-mast the parable of the bourgeois self — pleasure permitted only under bondage — and feminist readings recover the Sirens as the suppressed voice of female knowledge. Ambulance sirens, film mermaids, and every warning that allures are her descendants.</p>`,
    archaeology: `Greek art fixes her form early: bird-bodied, woman-headed, from the 7th century BCE — the famous Attic black-figure stamnos in the British Museum shows Odysseus bound to the mast beneath two enormous birds with women's faces. South Italian funerary art made Sirens the musicians of the dead, carved on tombs of Campania and Apulia as mourning escorts. Odyssey-related localizations — the Sirenum scopuli off the Amalfi coast — are ancient tourism, reported already by Strabo.`,
    extendedMeditation: `<p>Seirḗn is the patroness of dangerous knowledge — the truth that costs the listener his course. The Greeks' answer was not ignorance but engineering: hear the song, keep the ropes. Her question remains the sharpest in the Odyssey: if a voice offered to tell you everything, could you sail past it?</p>`,
    sources: [{ name: 'Homer' }, { name: 'Apollonius' }, { name: 'Euripides' }, { name: 'Apollodorus' }, { name: 'LSJ' }, { name: 'Beekes' }],
  },

  troia: {
    pronunciationNote:
      'Greek Τροία bears the stress on the final syllable with a long diphthongal ending — Troíā — and Latin Troia keeps both the vowels and the fame. The form was already a place-name before it was a story: Hittite records call the land Wilusa, which most scholars now connect to (W)ilios, Troy\'s other Greek name.',
    domains: {
      title: 'The City of Story',
      subtitle: 'Siege, Horse, and the Mother of Empires',
      lead: `<p class='lead-text'>Troíā is the city that fell once and rose forever: ten years of siege made it the template of Western war narrative, and its survivors — in Roman myth — sailed west to found the lineage of Rome itself. Every empire since has wanted to be Troy's heir rather than its conqueror.</p>`,
      cards: [
        { iconPath: ICONS.wall, name: 'The Walls', desc: 'Built by Poseidṓn and Apóllōn — walls only a trick could breach.' },
        { iconPath: ICONS.horse, name: 'The Horse', desc: 'Odysseus\' stratagem: the gift that is a breach, the original Trojan horse.' },
        { iconPath: ICONS.flame, name: 'The Ten Years', desc: 'The Iliad covers fifty days; the full siege cycle filled the entire Epic Cycle.' },
        { iconPath: ICONS.ship, name: 'The Exiles', desc: 'Aeneas carries his father and his gods out of the fire — Troy\'s fall as Rome\'s first chapter.' },
      ],
    },
    symbols: [
      { name: 'The wooden horse', meaning: 'Ingenuity against fortification; the gift that conceals its content' },
      { name: 'The Scaean Gate', meaning: 'The western gate where the heroes fought and the horse entered' },
      { name: 'The Palladium', meaning: 'The heaven-fallen image of Athēnā on which the city\'s safety depended' },
    ],
    mythology: {
      lead: `<p class='lead-text'>The Trojan cycle is the largest story the Greeks told: from the wedding of Pēleús and the Apple of Discord to the Returns of the heroes, it fills eight epics, of which the Iliad and Odyssey are only the surviving heart.</p>`,
      myths: [
        { tag: 'The Judgment', title: 'The Apple', text: `<p class='myth-text'>Eris, uninvited to the wedding of Pēleús and Thetis, threw a golden apple inscribed "for the fairest." Zeús delegated the verdict to the Trojan prince Paris, herding on Mount Ida: Hēra offered empire, Athēnā victory, Aphrodítē the most beautiful woman in the world. He chose the woman — Helen, wife of Menelaos — and the war became arithmetic.</p>` },
        { tag: 'The Siege', title: 'Nine Years and a Quarrel', text: `<p class='myth-text'>A thousand ships gathered at Aulis; nine years raided the Troad before the Iliad even begins. The poem's subject is a quarrel in the tenth year — Agamemnōn's seizure of Brisēis, Achilleús' withdrawal, and the chain of deaths from Pátroklos to Hektōr — yet behind it stands the city's doom, prophesied and accepted by every combatant.</p>` },
        { tag: 'The Horse', title: 'The Last Night', text: `<p class='myth-text'>The Odyssey and the Aeneid tell the end the Iliad never reaches: the Achaeans feign departure, leaving a wooden horse as an "offering to Athēnā." The priest Laokoōn warns against it and is destroyed by sea-serpents; the prophetess Kassandra is disbelieved, as always. At night the hidden warriors open the Scaean Gate, and Troíā burns in a single night after ten years of failure.</p>` },
        { tag: 'The Survivors', title: 'The Dispersal', text: `<p class='myth-text'>Greek myth disperses the Trojans across the map: Aeneas to Italy in the Roman telling, Antēnor to the Adriatic, Hektor's son — in the minority tradition — restored in a new Troy. The vanquished city thus colonizes the imagination of its conquerors: to be Troianos, "of Troy," becomes, paradoxically, a title of glory.</p>` },
      ],
    },
    syncretism: `<p>Rome adopted Troy as mother: the Aeneid makes Aeneas' refugees the seed of the Roman people, and Ilium Novum — New Troy — received Roman privileges as a symbolic ancestor. The Middle Ages multiplied the claim: the Franks, the Britons (through Brutus of Troy in Geoffrey of Monmouth), and half the dynasties of Europe forged Trojan genealogies. "Trojan" became a compliment — faithful, brave — even in the languages of the Greeks' heirs.</p>`,
    culturalLegacy: `<p>"Trojan horse" is now the universal term for a payload hidden inside a gift — the computing term is simply the myth recompiled. The question "was Troy real?" launched modern archaeology: Schliemann's excavations at Hisarlık (1870s–90s) proved a fortified Bronze Age citadel exactly where Homer put it. The Hittite archives' Wilusa and Taruisa, matched to (W)ilios and Troia by a century of scholarship, made Troy the test case for how myth and document corroborate each other.</p>`,
    archaeology: `Hisarlık in northwest Anatolia preserves nine major settlement layers (Troy I–IX), ca. 3000 BCE–500 CE. The candidates for Homer's city are Troy VI (destroyed ca. 1250 BCE, by earthquake or war) and Troy VIIa (burned ca. 1180 BCE, with sling stones and arrowheads in the destruction debris). UNESCO listed the site in 1998. The "Treasure of Priam" Schliemann smuggled out is now split between Moscow and Istanbul, and the Hittite Tawagalawa letter mentioning a king of Ahhiyawa (Achaeans?) at Millawanda places Greek-Anatolian conflict in the right sea at the right century.`,
    extendedMeditation: `<p>Troíā is the city that teaches what walls cannot do. Gods built hers; a story breached them. Every culture that has traced its ancestry to her fall has understood the lesson: the defeated city outlived all its conquerors because it alone became a story that everyone, including its enemies, needed to tell.</p>`,
    sources: [{ name: 'Iliad' }, { name: 'Homer' }, { name: 'Euripides' }, { name: 'Apollodorus' }, { name: 'Hittite texts' }, { name: 'Cambridge' }],
  },

  tyche: {
    pronunciationNote:
      'Greek Τύχη bears the acute on the first syllable — Týchē — from τυγχάνω, "to happen, to hit the mark." The long eta of the second syllable is the standard macron; Stoic philosophers made her name the technical term for chance, and the word still means "outcome" in modern Greek.',
    domains: {
      title: 'The Happening',
      subtitle: 'Chance, Fortune, and the City\'s Luck',
      lead: `<p class='lead-text'>Týchē is the last goddess added to the Greek pantheon and the most modern in feeling: the personification of what happens. When the old gods' plans no longer explained the Hellenistic world's upheavals, the Greeks enthroned accident itself — and gave her a cornucopia, a rudder, and a wheel.</p>`,
      cards: [
        { iconPath: ICONS.die, name: 'The Happening', desc: 'From τυγχάνω, "to happen" — the goddess of outcomes, not plans.' },
        { iconPath: ICONS.wheel, name: 'The Rudder', desc: 'She steers the affairs of mortals — Pindar calls her the helmswoman of destiny.' },
        { iconPath: ICONS.column, name: 'The City\'s Crown', desc: 'Hellenistic city-Tychai wear the walls as a crown — each city\'s own fortune personified.' },
        { iconPath: ICONS.horn, name: 'The Cornucopia', desc: 'The horn of plenty: fortune\'s gifts poured out without merit or warning.' },
      ],
    },
    symbols: [
      { name: 'The rudder', meaning: 'Steering without destination — guidance of the contingent' },
      { name: 'The cornucopia', meaning: 'Abundance as accident; the gifts no one earned' },
      { name: 'The mural crown', meaning: 'The city walls she wears — fortune as civic identity' },
      { name: 'The wheel', meaning: 'Roman addition — the turning that raises and ruins' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Týchē has almost no myths — she is a goddess of situations, not stories. Her biography is the biography of the Hellenistic age: when empires rose and fell in a generation, chance needed a face.</p>`,
      myths: [
        { tag: 'The Genealogy', title: 'Two Fathers', text: `<p class='myth-text'>Hesiod makes her an Oceanid, daughter of Ōkeanos and Tēthys — chance as one of the primordial waters' three thousand daughters. Pindar, elevating her, calls her Týchē Sōteira, "saviour fortune," and a child of Zeús Eleutherios: luck ennobled into divine pedigree. The disagreement is the point — even the Greeks could not decide if chance is cosmic or capricious.</p>` },
        { tag: 'The Statue', title: 'The Tyche of Antioch', text: `<p class='myth-text'>Around 300 BCE the sculptor Eutychides made for newly founded Antioch the most copied statue of the ancient world: the city's Týchē seated on rocks, wearing the city walls as a crown, with the river Orontes swimming at her feet. Every Hellenistic and Roman city commissioned its own version — fortune as the official portrait of urban identity.</p>` },
        { tag: 'The Philosopher', title: 'Aristotle\'s Analysis', text: `<p class='myth-text'>In the Physics, Aristotle gives týchē its most rigorous treatment: chance is a real cause, he argues, but only of events that could have been purposive — the man who goes to the market for bread and happens to meet his debtor. The goddess fades; the concept survives intact, and probability theory will one day be built on his definition.</p>` },
      ],
    },
    syncretism: `<p>Rome merged her with Fortuna — a native Italian goddess with far older roots — and the fusion produced antiquity's most worshipped abstraction: Fortuna Primigenia at Praeneste with her famous sortes (lot-oracle), Fortuna Redux for safe returns, Fortuna Augusta for the emperor's luck. On coins, every city from Palmyra to Alexandria stamped its Tyche-Fortuna: the mural-crowned figure became the standard icon of urban pride across three continents.</p>`,
    culturalLegacy: `<p>The word outlasted the cult: tyche is Aristotle's and the Stoics' technical term, and "stochastic" — from the sibling root for aiming — now names the mathematics of chance. Polybius made Tyche the playwright of history ("she brings all human affairs onto one stage"), and every discussion of black swans, tail risk, and algorithmic randomness is, unknowingly, her temple.</p>`,
    archaeology: `Eutychides' bronze original is lost, but the Vatican and Louvre Roman copies preserve the Tyche of Antioch exactly, and the type is confirmed by Antiochene coins and the tiny bronze "Antioch" statuettes. Praeneste's (Palestrina's) vast sanctuary of Fortuna Primigenia — a mountainside of terraces rediscovered by WWII bombing — shows the cult's architecture at full scale. Hundreds of civic coins bearing mural-crowned Tychai map the goddess's reach from Spain to Afghanistan.`,
    extendedMeditation: `<p>Týchē is the honest goddess: she never promised to be fair. The Greeks' wisdom was to worship her anyway — to give chance a face so it could be addressed, appeased, and above all named. Every plan carries her signature in invisible ink; every city that crowned her understood that fortune is not the enemy of order but its weather.</p>`,
    sources: [{ name: 'Hesiod, Theogony' }, { name: 'Pindar' }, { name: 'Aristotle' }, { name: 'Polybius' }, { name: 'Pausanias' }, { name: 'LSJ' }],
  },
};
