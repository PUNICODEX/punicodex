/**
 * Lore catalog — 2026-07-20 flagship batch (part A: Greek + Roman, 17 entries).
 * Backtick strings throughout: no quote-escaping hazards.
 * Applied by tools/new-domains/apply-lore.js.
 */
module.exports = {
  achilleus: {
    pronunciation: {
      ipa: `/a.kʰil.leús/`,
      ipaLabel: `Attic Greek`,
      approximation: `ah-khil-LEWS, stress on the final syllable.`,
      note: `The double lambda is attested in most manuscripts; the accent always falls on the ultima.`,
    },
    domains: [`War`, `Glory`, `Rage`],
    symbols: [`The ash spear of Pelion`, `The vulnerable heel`, `The golden armor of Hephaistos`],
    mythology: {
      lead: `<p class='lead-text'>Achilles is the half-mortal son of Peleus and the sea-goddess Thetis, the greatest warrior of the Greek host at Troy. His <strong>rage</strong> and his <strong>heel</strong> are the two poles of a brief, incandescent life.</p>`,
      myths: [
        {
          tag: `The Infant`,
          title: `Dipped in the Styx`,
          text: `<p class='myth-text'>Thetis sought to make her son invulnerable by dipping him in the river Styx, holding him by one heel. The untouched spot remained mortal — the single seam through which death would enter.</p>`,
        },
        {
          tag: `The Wrath`,
          title: `The Song of the Iliad`,
          text: `<p class='myth-text'>When Agamemnon seized his prize Briseis, Achilles withdrew from the war and the Greeks bled for it. His rage is the Iliad's engine: a meditation on honor, mortality, and the price of excellence.</p>`,
        },
        {
          tag: `The Fall`,
          title: `Paris and the Arrow`,
          text: `<p class='myth-text'>Achilles dies by an arrow from Paris — guided, some say, by Apollo — striking his one mortal heel. His ashes were mixed with Patroklos's, and the Greeks honored him as a god on the Hellespont.</p>`,
        },
      ],
    },
    syncretism: `<p>Roman tradition absorbed him wholesale (Achilles/Achilleus), and his name became the anatomical term for the great tendon (tendo Achillis). Alexander the Great claimed him as ancestor and slept with the Iliad under his pillow.</p>`,
    culturalLegacy: `<p>The "Achilles heel" is now the universal idiom for a single fatal weakness — the founding case of heroic ethics in the West.</p>`,
    extendedMeditation: `<p>Achilles matters because he is the first fully articulated case study in the cost of excellence: terrifying, petulant, and tender in turn, and the tradition insists all three are the same man. A temple to Achilleús is a temple to the honest accounting of greatness — the fury and the vulnerability priced together, never separately.</p>`,
    sources: [{ name: `Iliad` }, { name: `LSJ` }, { name: `Beekes` }],
    archaeology: `<p>His cult was real, not literary: sanctuaries across the Black Sea, Thessaly, and the Peloponnese offered games and laments to a hero worshipped as semi-divine.</p>`,
  },
  asklepios: {
    pronunciation: {
      ipa: `/a.skliː.pi.ós/`,
      ipaLabel: `Attic Greek`,
      approximation: `ah-SKLAY-pee-OSS, with the stress on the ultima and a long ē.`,
      note: `The ē preserves the original long vowel; the acute marks the stress of Ἀσκληπιός exactly.`,
    },
    domains: [`Medicine`, `Healing`, `Renewal`],
    symbols: [`The serpent-entwined staff`, `The dog`, `The healing spring of Epidauros`],
    mythology: {
      lead: `<p class='lead-text'>Asklēpios is the physician-god, son of Apollo and the mortal Koronis. His art was so great that he could <strong>raise the dead</strong> — a boundary no mortal may cross without consequence.</p>`,
      myths: [
        {
          tag: `The Birth`,
          title: `Cut from the Pyre`,
          text: `<p class='myth-text'>Apollo loved Koronis, but she proved faithless, and the god's raven told him. As her body burned, Apollo cut the unborn child from her womb and gave him to the centaur Chiron, who taught him every herb and incision of the healer's craft.</p>`,
        },
        {
          tag: `The Thunderbolt`,
          title: `Too Great a Gift`,
          text: `<p class='myth-text'>When Asklēpios restored Hippolytos to life, Zeús struck him dead with a thunderbolt: the resurrection of mortals threatened the division of powers. Apollo retaliated by slaying the Cyclopes.</p>`,
        },
        {
          tag: `The Cult`,
          title: `Epidauros and the Sleeping Cure`,
          text: `<p class='myth-text'>His sanctuaries were hospitals: at Epidauros the sick slept in the abaton, and the god visited them in dreams, prescribing cures that priests recorded on thousands of surviving inscriptions.</p>`,
        },
      ],
    },
    syncretism: `<p>Rome imported him as Aesculapius and built his island-hospital on the Tiber in 293 BCE. His serpent staff endures as the emblem of medicine.</p>`,
    culturalLegacy: `<p>The Hippocratic corpus sits beside the Asklepian dream-temples as medicine's twin ancestry: one rational, one sacred.</p>`,
    extendedMeditation: `<p>Asklēpios is the only god whose power broke the final law, and he paid for it. His temple is a monument to the ambition of healing — the insistence that death itself should be argued with. Every hospital that keeps its records with care walks in the Epidaurian tradition.</p>`,
    sources: [{ name: `Homeric Hymns` }, { name: `LSJ` }, { name: `Pausanias` }],
    archaeology: `<p>Epidauros, Kos, and Pergamon preserve vast healing complexes with dormitories, theatres, and springs; votive tablets (iamata) catalogue recoveries with clinical specificity.</p>`,
  },
  atropos: {
    pronunciation: {
      ipa: `/á.tro.pos/`,
      ipaLabel: `Attic Greek`,
      approximation: `AH-tro-pos, stress on the first syllable; both o vowels short.`,
      note: `The alpha bears the acute exactly as in Ἄτροπος.`,
    },
    domains: [`Fate`, `Endings`, `Measure`],
    symbols: [`The shears`, `The thread of life`, `The spindle of Necessity`],
    mythology: {
      lead: `<p class='lead-text'>Atropos is the third of the Moirai: Klotho spins the thread, Lachesis measures it, and <strong>Atropos cuts it</strong>. She is the unturnable — the Fate whose decision no prayer revises.</p>`,
      myths: [
        {
          tag: `The Three`,
          title: `The Division of Labor`,
          text: `<p class='myth-text'>Hesiod names them in the Theogony: Klotho, Lachesis, Atropos — allotment, measure, inflexibility. Either way, even Zeús yields to their arithmetic.</p>`,
        },
        {
          tag: `The Choice`,
          title: `The Thread at the Door`,
          text: `<p class='myth-text'>At every birth the three sisters arrive, and the cut is made before the first breath is drawn. The hero may struggle against every enemy and win — except this one.</p>`,
        },
        {
          tag: `The Limit`,
          title: `Even the Gods Obey`,
          text: `<p class='myth-text'>When Sarpedon dies at Troy, Zeús weeps but does not intervene, for the Fates have spoken. Homer leaves the tension unresolved: the sky father rules, yet the Moirai rule his ruling.</p>`,
        },
      ],
    },
    syncretism: `<p>Rome knew her as Morta of the Parcae; the Norse Norns and the Slavic Rozhanitsy mirror the triad. Her name survives in atropine — the alkaloid that, like her, severs.</p>`,
    culturalLegacy: `<p>She embodies the Greek insistence that meaning requires limits: the thread is precious because it ends.</p>`,
    extendedMeditation: `<p>Átropos is not cruel; she is exact. Her temple is a warning and a mercy in one: that every measure has an end, and that the end is what makes the measure worth taking.</p>`,
    sources: [{ name: `Hesiod` }, { name: `LSJ` }, { name: `Plato` }],
    archaeology: `<p>Reliefs and funerary inscriptions across Attica and Magna Graecia show the shears and spindle; the Moirai appear on votive altars alongside Necessity.</p>`,
  },
  delos: {
    pronunciation: {
      ipa: `/dɛ̂ː.los/`,
      ipaLabel: `Attic Greek`,
      approximation: `DAY-los, with the circumflexed long e of Δῆλος.`,
      note: `The circumflex records the falling tone on the long vowel, exactly as the house style renders it.`,
    },
    domains: [`Island`, `Sanctuary`, `Birth of Light`],
    symbols: [`The sacred lake`, `The palm tree of Leto`, `The terrace of lions`],
    mythology: {
      lead: `<p class='lead-text'>Dêlos is the small, bare island that became the holiest place in the Aegean: the birthplace of Apollo and Artemis, where Leto finally found refuge when no land would receive her.</p>`,
      myths: [
        {
          tag: `The Wandering Rock`,
          title: `Afloat Until the Birth`,
          text: `<p class='myth-text'>Hēra, jealous of Zeús's union with Leto, forbade any land under the sun to receive her labor. Only the floating, unanchored isle of Delos offered itself. In gratitude Apollo fixed it to the sea floor forever.</p>`,
        },
        {
          tag: `The Palm`,
          title: `Leto at the Lake`,
          text: `<p class='myth-text'>Clinging to a palm beside the circular lake, Leto bore her twins. The Homeric Hymn makes the palm the axis of the scene: a slender tree around which an entire theology of light grew.</p>`,
        },
        {
          tag: `The Festival`,
          title: `The Delia`,
          text: `<p class='myth-text'>Every four years the Ionian cities gathered for the Delia — games, choruses, and sacred ships from Athens. Delos became the religious commons of the Aegean.</p>`,
        },
      ],
    },
    syncretism: `<p>Roman Delos became a free port, channeling grain and slaves between East and West; its warehouses seeded the Mediterranean commercial city-states that followed.</p>`,
    culturalLegacy: `<p>It is the model of the sacred island: small, neutral, and therefore universal — a place belonging to everyone precisely because it belongs to no one.</p>`,
    extendedMeditation: `<p>Dêlos teaches that the smallest place can hold the greatest meaning when it refuses ownership. The island had almost no water, no wealth, no army — and every Greek knew its name. A temple to Dêlos is a temple to hospitality as sacred law.</p>`,
    sources: [{ name: `Homeric Hymn to Apollo` }, { name: `Thucydides` }, { name: `Strabo` }],
    archaeology: `<p>UNESCO-listed, Delos preserves the temple of Apollo, the terrace of the lions, the sacred lake, and entire Hellenistic residential quarters.</p>`,
  },
  drakon: {
    pronunciation: {
      ipa: `/drá.kɔːn/`,
      ipaLabel: `Attic Greek`,
      approximation: `DRAH-kone, stress on the first syllable with a long final ō.`,
      note: `The omega is unambiguously long; the acute sits on the alpha as in Δράκων.`,
    },
    domains: [`Serpent`, `Guardian`, `Vigilance`],
    symbols: [`The unsleeping eye`, `The coiled body`, `The sacred spring it guards`],
    mythology: {
      lead: `<p class='lead-text'>The Greek drákōn is not the fire-breathing hoarder of later legend but the <strong>sleepless watcher</strong>: the great serpent set over springs, treasures, and sacred places.</p>`,
      myths: [
        {
          tag: `The Guardian`,
          title: `The Spring of Ares`,
          text: `<p class='myth-text'>A drákōn sacred to Ares guarded the spring of Thebes. Kadmos slew it and sowed its teeth, from which armed men rose — the Spartoi. Thebes was founded on a guardian's death.</p>`,
        },
        {
          tag: `The Orchard`,
          title: `Ladon of the Hesperides`,
          text: `<p class='myth-text'>A hundred-headed drákōn named Ladon coiled around the tree of golden apples at the world's edge. Herakles killed or charmed it for his eleventh labor; Hēra set its image among the stars.</p>`,
        },
        {
          tag: `The Healer`,
          title: `The Serpent of Asklēpios`,
          text: `<p class='myth-text'>In the healing temples the drákōn turned benefactor: non-venomous snakes roamed the abaton at Epidauros as the god's agents. The same form that guards also cures.</p>`,
        },
      ],
    },
    syncretism: `<p>Latin draco and English "dragon" descend from it; the Sanskrit nāga and Chinese lóng fill parallel roles as water-and-wisdom serpents.</p>`,
    culturalLegacy: `<p>Its etymology (δέρκομαι, "to see") survives in the word itself: the dragon is defined by sight, not fire.</p>`,
    extendedMeditation: `<p>Drákōn is the patron of watchfulness: the guardian who asks nothing and sleeps never. A temple to Drákōn belongs to everyone who keeps something precious safe — archivists, sentries, custodians of springs both literal and digital.</p>`,
    sources: [{ name: `LSJ` }, { name: `Apollodorus` }, { name: `Beekes` }],
    archaeology: `<p>Serpent cults at Epidauros and Athens left votive reliefs of sacred snakes; the Theban spring and the Hesperian orchard were both shown on Classical vase painting as drákōn-guarded places.</p>`,
  },
  monokeros: {
    pronunciation: {
      ipa: `/mo.nó.kɛː.rɔːs/`,
      ipaLabel: `Attic Greek`,
      approximation: `mo-NO-keh-ross, stress on the antepenult with a long final ō.`,
      note: `The name is a plain compound of μόνος (single) and κέρας (horn).`,
    },
    domains: [`Purity`, `Rarity`, `Wonder`],
    symbols: [`The single horn`, `The white coat`, `The untameable nature`],
    mythology: {
      lead: `<p class='lead-text'>The Greek monókerōs begins as natural history, not fairy tale: Ctesias of Knidos described a one-horned wild ass of India, swift, fierce, and impossible to take alive.</p>`,
      myths: [
        {
          tag: `The Report`,
          title: `Ctesias and the Indian Ass`,
          text: `<p class='myth-text'>Ctesias's Indika (c. 400 BCE) tells of a beast with a white body, purple head, and a single cubit-long horn banded white, red, and black. Aristotle repeats the account soberly. The fabulous unicorn was born as sober secondhand reportage.</p>`,
        },
        {
          tag: `The Capture`,
          title: `Taken Only by Guile`,
          text: `<p class='myth-text'>Later tradition added the famous clause: the beast cannot be hunted, but will lay its head in the lap of a virgin. Medieval Europe made it an allegory of the Incarnation; the Greeks had known it only as uncatchable.</p>`,
        },
        {
          tag: `The Medicine`,
          title: `The Horn Against Poison`,
          text: `<p class='myth-text'>Ctesias already claims the horn neutralizes poison. Medieval courts paid fortunes for "alicorn" — usually narwhal tusk — and the market in wonder proved more durable than the beast.</p>`,
        },
      ],
    },
    syncretism: `<p>The qilin of Chinese tradition and the karkadann of Persian lore are its eastern cousins; the narwhal supplied its "evidence" to skeptical ages.</p>`,
    culturalLegacy: `<p>It is the emblem of rarity itself — hence "unicorn" for the one-in-a-thousand company, the one-in-a-million find.</p>`,
    extendedMeditation: `<p>Monókerōs survives because every age needs one creature that refuses capture. A temple to it is a temple to rarity with integrity: value that cannot be bred, farmed, or forced.</p>`,
    sources: [{ name: `Ctesias` }, { name: `Aristotle` }, { name: `Pliny` }],
    archaeology: `<p>Greek and Roman mosaics show the one-horned ass; medieval tapestries (The Hunt of the Unicorn) canonized the later allegory across Europe.</p>`,
  },
  phanes: {
    pronunciation: {
      ipa: `/pʰá.nɛːs/`,
      ipaLabel: `Attic Greek`,
      approximation: `FAH-nace, stress on the first syllable with a long ē.`,
      note: `Φάνης names the Orphic firstborn; the acute and the long eta are both attested.`,
    },
    domains: [`Light`, `Revelation`, `Firstborn`],
    symbols: [`The cosmic egg`, `The golden wings`, `The first light`],
    mythology: {
      lead: `<p class='lead-text'>Phánēs is the Orphic firstborn: the shining one who cracks the cosmic egg and steps out with golden wings, creating the gods by appearing. He is not the light of Zeús but the light <strong>before</strong> Zeús.</p>`,
      myths: [
        {
          tag: `The Egg`,
          title: `What Night Laid`,
          text: `<p class='myth-text'>In the Orphic cosmogony, Night lays a silver egg; from it hatches Phánēs — "the Revealer" — who illuminates everything that was hidden. The Derveni Papyrus, our oldest European book, preserves this theology in ink.</p>`,
        },
        {
          tag: `The Names`,
          title: `One God, Many Names`,
          text: `<p class='myth-text'>The hymns call him Phánēs, Erikapaios, Phaethōn, Prōtogonos — Appearance, Life-spring, Shiner, Firstborn. Orphism insisted the first principle transcends every name by shining through all of them.</p>`,
        },
        {
          tag: `The Succession`,
          title: `From Light to Order`,
          text: `<p class='myth-text'>Phánēs passes the scepter to Night, then to Ouranos, Kronos, and finally Zeús. The Orphic history of the world is a chain of abdications: light yields to order, order to power, power to the present.</p>`,
        },
      ],
    },
    syncretism: `<p>His logic reappears in the Zoroastrian Ohrmazd, the Vedic dawn-god Uṣas, and Gnostic descriptions of the primal light; Neoplatonists folded him into the Intelligible world.</p>`,
    culturalLegacy: `<p>He is the theological proof that revelation precedes creation: something must appear before anything can be.</p>`,
    extendedMeditation: `<p>Phánēs is the patron of beginnings that cannot be hidden: first light, first proof, first publication. A temple to him suits everything that exists to reveal — archives, instruments, honest systems.</p>`,
    sources: [{ name: `Orphic Hymns` }, { name: `Derveni Papyrus` }, { name: `LSJ` }],
    archaeology: `<p>The Derveni papyrus (4th c. BCE, found in a Thessaloniki tomb) is the oldest surviving European manuscript and our primary witness to Orphic first-principle theology.</p>`,
  },
  pegasos: {
    pronunciation: {
      ipa: `/pɛ̌ː.ɡa.sos/`,
      ipaLabel: `Attic Greek`,
      approximation: `PAY-ga-sos, with the stacked macron+acute on the first ē.`,
      note: `Πήγασος carries both the long eta and the acute on the same vowel — the canonical stacked form.`,
    },
    domains: [`Flight`, `Inspiration`, `Freedom`],
    symbols: [`The white wings`, `The bridle of Athena`, `The spring of Hippokrene`],
    mythology: {
      lead: `<p class='lead-text'>Pḗgasos is the winged horse born from the severed neck of Medousa when Perseus struck it — beauty erupting from horror, leaping straight for the sky.</p>`,
      myths: [
        {
          tag: `The Birth`,
          title: `Out of the Gorgon`,
          text: `<p class='myth-text'>Poseidon had lain with Medousa in Athena's temple; when Perseus beheaded her, out sprang Pḗgasos and the warrior Chrysaor. The horse flew at once to Olympos, carrying Zeús's thunderbolts thereafter.</p>`,
        },
        {
          tag: `The Ride`,
          title: `Bellerophon and the Chimaira`,
          text: `<p class='myth-text'>Athena gave Bellerophon a golden bridle; on Pḗgasos he slew the fire-breathing Chimaira. It is the one tamed ride in the myth — inspiration briefly harnessed to human purpose.</p>`,
        },
        {
          tag: `The Fall`,
          title: `Too Near the Sky`,
          text: `<p class='myth-text'>Bellerophon tried to ride to Olympos itself. Zeús sent a gadfly; Pḗgasos threw his rider and kept the sky. The horse was set among the stars; the man wandered blind and lame.</p>`,
        },
      ],
    },
    syncretism: `<p>The winged horse appears in Etruscan art before the Roman copy; modern heraldry, aviation, and oil companies keep the silhouette airborne.</p>`,
    culturalLegacy: `<p>It is the emblem of poetry itself: Hesiod says Pḗgasos struck the ground at Helikon and out flowed Hippokrene, the spring of the Muses.</p>`,
    extendedMeditation: `<p>Pḗgasos is the temple of ungoverned inspiration: the thing that arrives from violence, serves briefly, and cannot be owned. Every creative institution lives inside this warning. The horse may be ridden to the fight, but the sky belongs to the horse.</p>`,
    sources: [{ name: `Hesiod` }, { name: `Pindar` }, { name: `Apollodorus` }],
    archaeology: `<p>Corinthian and Laconian vase painting shows the winged horse early and often; the spring of Hippokrene was a real fountain on Mount Helikon.</p>`,
  },
  seiren: {
    pronunciation: {
      ipa: `/sɛː.rɛ̌ːn/`,
      ipaLabel: `Attic Greek`,
      approximation: `say-RAIN, stacked macron+acute on the final ē.`,
      note: `Σειρήν carries the long eta and the acute on the same vowel — the canonical stacked form.`,
    },
    domains: [`Song`, `Allure`, `Threshold`],
    symbols: [`The irresistible voice`, `The bone-strewn rocks`, `The lyre they outplayed`],
    mythology: {
      lead: `<p class='lead-text'>The Seirḗnes are the singers of the western sea: bird-women whose song answers each listener's own desire so precisely that ships steer themselves onto the rocks. The Greeks made them the myth of <strong>fatal relevance</strong>.</p>`,
      myths: [
        {
          tag: `The Passage`,
          title: `Wax and Rope`,
          text: `<p class='myth-text'>Odysseus plugged his crew's ears with wax and had himself lashed to the mast so he could hear the song and live. He records no shame in the desire — only the precaution.</p>`,
        },
        {
          tag: `The Contest`,
          title: `The Muses Reply`,
          text: `<p class='myth-text'>Later tradition gave them a duel: the Seirḗnes challenged the Muses and lost, shedding their feathers in defeat. Allure can imitate art, but cannot out-sing it.</p>`,
        },
        {
          tag: `The Lesson`,
          title: `What the Song Promised`,
          text: `<p class='myth-text'>Circe warns that the song promises each man whatever he most wants to know. The rocks are white with bones not of fools but of seekers — those who mistook being understood for being safe.</p>`,
        },
      ],
    },
    syncretism: `<p>Medieval sirens became fish-tailed mermaids; the Slavic Sirin keeps the feathered original. "Siren song" is now the universal warning-seduction idiom.</p>`,
    culturalLegacy: `<p>The myth is the founding case of media literacy: content that fits you perfectly is precisely the content to fear.</p>`,
    extendedMeditation: `<p>Seirḗn belongs to everyone who builds things meant to be heard — broadcasters, advertisers, algorithms — as both patron and warning. The voice that knows you too well is the voice to tie yourself down for.</p>`,
    sources: [{ name: `Odyssey` }, { name: `Apollonius Rhodius` }, { name: `LSJ` }],
    archaeology: `<p>Siren figurines in Corinthian and South Italian tombs show bird-women with lyres; the rocks of Sirenusae off Campania were pointed out to travelers for centuries as the very place.</p>`,
  },
  troia: {
    pronunciation: {
      ipa: `/troí.aː/`,
      ipaLabel: `Attic Greek`,
      approximation: `TROY-ah, with the stress on the final syllable and a long ā.`,
      note: `Τροία takes its acute on the iota exactly as given.`,
    },
    domains: [`Citadel`, `Siege`, `Memory`],
    symbols: [`The great walls`, `The horse`, `The ash that outlived them`],
    mythology: {
      lead: `<p class='lead-text'>Troíā is the city that anchored the Mediterranean imagination for three thousand years: the richest citadel of the Bronze Age coast, destroyed in a ten-year war that became the template of every siege that followed.</p>`,
      myths: [
        {
          tag: `The Judgment`,
          title: `The Apple of Discord`,
          text: `<p class='myth-text'>Eris rolled a golden apple inscribed "to the fairest" among Hēra, Athēnā, and Aphrodítē. Paris of Troy awarded it to Aphrodítē for the promised gift of Helen — and the war was seeded by a beauty contest.</p>`,
        },
        {
          tag: `The Siege`,
          title: `Ten Years at the Wall`,
          text: `<p class='myth-text'>A thousand ships could not take Troy by force; its walls, built by Apollo and Poseidon, held until guile finished what bronze could not. The Iliad covers only weeks of the tenth year — and fills fifteen thousand lines with them.</p>`,
        },
        {
          tag: `The Horse`,
          title: `The Gift Inside`,
          text: `<p class='myth-text'>The Achaeans left a wooden horse as an offering and sailed out of sight; the Trojans dragged it in. At night the hidden men opened the gates. Laocoön had warned: fear the Greeks bearing gifts.</p>`,
        },
      ],
    },
    syncretism: `<p>Rome claimed the survivors: Aeneas carried Troy west to seed their city, and medieval Britain and Scandinavia traced dynasties to Trojan exiles. "Trojan" now also names the digital horse.</p>`,
    culturalLegacy: `<p>Every retelling since — Chaucer, Shakespeare, Hollywood — re-fights the same war, because Troy is where the West stores its argument about glory and ruin.</p>`,
    extendedMeditation: `<p>Troíā is a warning disguised as a city: the walls everyone trusts until the day they open from inside. A temple to Troíā suits everyone who defends something precious — and everyone who must be reminded that the most dangerous gifts are the ones we wheel in ourselves.</p>`,
    sources: [{ name: `Iliad` }, { name: `Aeneid` }, { name: `Strabo` }],
    archaeology: `<p>Heinrich Schliemann's excavations at Hisarlık revealed nine superimposed cities; Troy VI-VIIa show Bronze Age destruction layers dated to ~1180 BCE, matching the tradition's chronology uncannily.</p>`,
  },
  tyche: {
    pronunciation: {
      ipa: `/tý.kʰɛː/`,
      ipaLabel: `Attic Greek`,
      approximation: `TU-khee, stress on the first syllable with a long ē.`,
      note: `Τύχη takes both the acute and the long vowel exactly as given.`,
    },
    domains: [`Fortune`, `Chance`, `Turning`],
    symbols: [`The rudder she steers by`, `The cornucopia`, `The turning wheel`],
    mythology: {
      lead: `<p class='lead-text'>Týchē is the youngest and most modern of the great powers: Fortune personified, who rose from minor abstraction to supreme civic goddess as the Classical order gave way to the Hellenistic age.</p>`,
      myths: [
        {
          tag: `The Rise`,
          title: `From Chance to Goddess`,
          text: `<p class='myth-text'>The early Greeks had no goddess of luck — events happened by the gods' will. As city-states fell to empires and men felt smaller in larger worlds, Týchē grew from a word into a deity with temples, images, and a civic cult.</p>`,
        },
        {
          tag: `The City`,
          title: `The Fortune of Antioch`,
          text: `<p class='myth-text'>Seleucid Antioch crowned itself with a colossal Tychē by Eutychides: the goddess seated on rocks, the river Orontes swimming at her feet. It became the most copied image of Fortune in the ancient world.</p>`,
        },
        {
          tag: `The Wheel`,
          title: `What She Steers`,
          text: `<p class='myth-text'>Her attributes tell her doctrine: a rudder, because fortune steers; a cornucopia, because fortune provides; a wheel, because fortune turns. Pindar calls her savior of cities.</p>`,
        },
      ],
    },
    syncretism: `<p>Rome made her Fortuna (with a hundred epithets: Redux, Muliebris, Virilis); her wheel survives in medieval Boethius, tarot, and every game show with a spin.</p>`,
    culturalLegacy: `<p>She is the Greeks' honest admission that merit does not fully explain outcomes — the theological ancestor of probability.</p>`,
    extendedMeditation: `<p>Týchē is the temple of uncertainty respected: the power that cannot be bribed, only prepared for. Those who build games, markets, and plans that survive her turns honor her best. The wheel turns; the wise build for every quarter of it.</p>`,
    sources: [{ name: `Pindar` }, { name: `Pausanias` }, { name: `Polybius` }],
    archaeology: `<p>The Antioch Tychē by Eutychides (c. 300 BCE) survives in Roman copies across museums; her cult images appear on coins from Smyrna to Alexandria.</p>`,
  },
  diana: {
    pronunciation: {
      ipa: `/diˈaː.na/`,
      ipaLabel: `Classical Latin`,
      approximation: `dee-AH-nah, with the long ā on the stressed second syllable.`,
      note: `Classical Latin Dĭāna: short i, long ā — so only the ā is marked.`,
    },
    domains: [`Moon`, `Hunt`, `Wilderness`],
    symbols: [`The silver bow`, `The crescent`, `The deer of Ceryneia`],
    mythology: {
      lead: `<p class='lead-text'>Diāna is Rome's huntress: goddess of the moon, the wild places, and the swift chase — twin of Apollo in the Greek equation, but with a distinctively Roman severity and her own sacred groves.</p>`,
      myths: [
        {
          tag: `The Grove`,
          title: `The King of Nemi`,
          text: `<p class='myth-text'>At her lake sanctuary at Nemi, the priest — the Rex Nemorensis — held office by a grim rule: he was a runaway slave who had killed his predecessor with a bough of the sacred tree. Frazer opened The Golden Bough on this rite.</p>`,
        },
        {
          tag: `The Bath`,
          title: `Actaeon Watches`,
          text: `<p class='myth-text'>The hunter Actaeon stumbled on the goddess bathing; she turned him into a stag, and his own hounds finished the lesson. The wild is sacred precisely because it does not forgive intrusion.</p>`,
        },
        {
          tag: `The Women`,
          title: `The Day of the Slaves`,
          text: `<p class='myth-text'>Her festival on the Aventine (August 13) belonged especially to women and slaves — Rome's huntress kept a door for those the city overlooked.</p>`,
        },
      ],
    },
    syncretism: `<p>Identified with Greek Artemis and the Anatolian-Etruscan hunt goddesses; medieval witch-trials made her queen of the witches' sabbath, a role Rome never gave her.</p>`,
    culturalLegacy: `<p>Her bow survives in every archer's emblem, and her moon in every night sky drawn silver.</p>`,
    extendedMeditation: `<p>Diāna is the temple of disciplined wildness: speed with aim, freedom with law. She suits those who protect what must remain untamed — and those who hunt only what they mean to use.</p>`,
    sources: [{ name: `Varro` }, { name: `Horace` }, { name: `Frazer` }],
    archaeology: `<p>The lake of Nemi and her Aventine temple are documented in sources and inscriptions; her grove-sanctuary at Aricia yielded thousands of votive offerings.</p>`,
  },
  ianus: {
    pronunciation: {
      ipa: `/ˈjaː.nus/`,
      ipaLabel: `Classical Latin`,
      approximation: `YAH-nus, long ā on the first syllable.`,
      note: `Latin Iānus; no J existed in classical orthography.`,
    },
    domains: [`Beginnings`, `Doors`, `Transitions`],
    symbols: [`The two faces`, `The gate key`, `The door hinge itself`],
    mythology: {
      lead: `<p class='lead-text'>Iānus is the god Rome invented for itself: the watcher of thresholds, two-faced so he can see the year ending and the year beginning at once. He has no Greek equivalent — he is proof that Rome could mythologize its own genius for passages and systems.</p>`,
      myths: [
        {
          tag: `The Gate`,
          title: `Open in War, Closed in Peace`,
          text: `<p class='myth-text'>The gates of the Iānus Geminus stood open while Rome was at war. They closed only three times in the Republic's history — the most public peace meter ever built.</p>`,
        },
        {
          tag: `The First`,
          title: `Before Every Beginning`,
          text: `<p class='myth-text'>Roman prayer lists named Iānus first, before even Iuppiter: nothing begins without passing through him. January carries his name as the hinge month of the year.</p>`,
        },
        {
          tag: `The Faces`,
          title: `Seeing Both Ways`,
          text: `<p class='myth-text'>His two faces are not duplicity but completeness: the past and the future observed at the same moment. Ovid has him speak: the universe turns on his hinge.</p>`,
        },
      ],
    },
    syncretism: `<p>No direct Greek parent; the Hindu Ganeśa shares the liminal-threshold role, and St. Peter later inherited the keys of a very similar gate.</p>`,
    culturalLegacy: `<p>January, janitor (keeper of doors), and every "two-faced" policy discussion walk out of his temple.</p>`,
    extendedMeditation: `<p>Iānus is the patron of well-built transitions: APIs, airlocks, onboarding, doorways of every kind. A temple to him belongs to those who design beginnings so carefully that endings arrive without surprise.</p>`,
    sources: [{ name: `Ovid` }, { name: `Macrobius` }, { name: `Lewis & Short` }],
    archaeology: `<p>The Iānus Geminus stood in the Forum; coins of the Republic show the two faces and the keys as standard civic iconography.</p>`,
  },
  iuno: {
    pronunciation: {
      ipa: `/ˈjuː.noː/`,
      ipaLabel: `Classical Latin`,
      approximation: `YOO-noh, long ū and long ō.`,
      note: `Both vowels are long in classical Iūnō.`,
    },
    domains: [`Queenship`, `Marriage`, `Sky`],
    symbols: [`The peacock with its hundred eyes`, `The golden scepter`, `The diadem`],
    mythology: {
      lead: `<p class='lead-text'>Iūnō is the queen of the Roman sky: wife and sister of Iuppiter, patron of marriage and childbirth, and the only goddess whose jealousy is recorded with the same care as her majesty.</p>`,
      myths: [
        {
          tag: `The Queen`,
          title: `The Argus Eyes`,
          text: `<p class='myth-text'>When Iuppiter fell for Io and turned her into a cow to hide her, Iūnō set hundred-eyed Argus to watch her. Hermes slew Argus; the queen set his eyes in her peacock's tail forever — vigilance made ornament.</p>`,
        },
        {
          tag: `The Grudge`,
          title: `The Aeneid's Storm`,
          text: `<p class='myth-text'>Virgil's epic runs on her wrath: because Troy's line must found Rome and Carthage must fall to it, she storms Aeneas for six books. Rome read its own origin as the working-out of a divine grudge.</p>`,
        },
        {
          tag: `The Matron`,
          title: `The Calendar of Women`,
          text: `<p class='myth-text'>As Iūnō Lucina she governed childbirth; the Matronalia (March 1) celebrated her with husbands giving gifts to wives — the Roman acknowledgment that the queen's realm is the household itself.</p>`,
        },
      ],
    },
    syncretism: `<p>Mapped to Greek Hēra and Etruscan Uni; her Capitoline temple with Iuppiter and Minerva made her one-third of Rome's official triad.</p>`,
    culturalLegacy: `<p>June carries her name; the peacock keeps her hundred eyes open on palace lawns worldwide.</p>`,
    extendedMeditation: `<p>Iūnō is the temple of dignified watchfulness: the queen who notices everything and is owed everything. She suits institutions that protect households — and every system that needs an incorruptible witness.</p>`,
    sources: [{ name: `Virgil` }, { name: `Ovid` }, { name: `Varro` }],
    archaeology: `<p>Her Capitoline and Aventine temples anchored Roman state religion; the Matronalia and the Nonae Caprotinae festivals are richly documented in fasti and inscriptions.</p>`,
  },
  iuppiter: {
    pronunciation: {
      ipa: `/ˈjuːp.pi.ter/`,
      ipaLabel: `Classical Latin`,
      approximation: `YOO-pi-ter, with the geminate pp and long ū.`,
      note: `Iūppiter: the doubling of p is the standard classical spelling; the name means "Sky-father" (Dyēu-pater).`,
    },
    domains: [`Sky`, `Thunder`, `Sovereignty`],
    symbols: [`The thunderbolt`, `The eagle`, `The oak of Dodona`],
    mythology: {
      lead: `<p class='lead-text'>Iūppiter is the Roman sky father: not merely Zeús translated but the guarantor of the state itself — the god in whose name Rome swore its oaths, dedicated its victories, and crowned its generals on the Capitol.</p>`,
      myths: [
        {
          tag: `The Oath`,
          title: `The Stone of Fides`,
          text: `<p class='myth-text'>The most binding Roman oath was sworn "per Iovem Lapidem" — by Jupiter the Stone, holding a flint from his altar. Law, contract, and treaty all rested on his witness.</p>`,
        },
        {
          tag: `The Triumph`,
          title: `The General in His Chariot`,
          text: `<p class='myth-text'>In the triumph, the victorious general rode to the Capitol in Iūppiter's own regalia while a slave whispered "remember you are mortal." Rome let its greatest man borrow the god's face for one day — and made the god remind him to give it back.</p>`,
        },
        {
          tag: `The Eagle`,
          title: `The Standard of the Legions`,
          text: `<p class='myth-text'>Every legion carried his eagle; its loss was the deepest military disgrace Rome knew. The sky father marched at the head of the army that built the Mediterranean's order.</p>`,
        },
      ],
    },
    syncretism: `<p>Zeús by another name, but filtered through Roman law: his Greek myths were largely stripped for the state cult, leaving sovereignty, oath, and victory.</p>`,
    culturalLegacy: `<p>"By Jove" kept his oath alive in English for centuries; the planet keeps his name as the system's largest body.</p>`,
    extendedMeditation: `<p>Iūppiter is the temple of kept agreements: the sky that watches what you swear. Institutions that promise loudly should build under his eagle — and keep a slave in the chariot whispering back.</p>`,
    sources: [{ name: `Ennius` }, { name: `Virgil` }, { name: `Varro` }],
    archaeology: `<p>The Temple of Iuppiter Optimus Maximus on the Capitoline was Rome's religious center for a thousand years; its podium survives beneath the modern conservation site.</p>`,
  },
  neptunus: {
    pronunciation: {
      ipa: `/nepˈtuː.nus/`,
      ipaLabel: `Classical Latin`,
      approximation: `nep-TOO-nus, long ū on the stressed second syllable.`,
      note: `Only the ū is long in classical Neptūnus.`,
    },
    domains: [`Sea`, `Horses`, `Earthquake`],
    symbols: [`The trident`, `The dolphin`, `The first horse from the wave`],
    mythology: {
      lead: `<p class='lead-text'>Neptūnus is the Roman lord of waters: third brother of the great division, holder of sea, horses, and the earth-shaking trident. Rome, a land power, gave him less attention than Greece gave Poseidon — and feared him more.</p>`,
      myths: [
        {
          tag: `The Gift`,
          title: `The Horse from the Wave`,
          text: `<p class='myth-text'>In the contest for Athens (told of Poseidon), he struck the rock and out came the first horse; the olive won the city for Athēnā, but the horse conquered the world. Roman cavalry prayed to him as father of mounts.</p>`,
        },
        {
          tag: `The Anger`,
          title: `The Storm at Aeneas`,
          text: `<p class='myth-text'>In the Aeneid he raises the storm that opens the epic — then calms it at a word, since fate must have its way. The sea is rage and obedience in the same body.</p>`,
        },
        {
          tag: `The Sacrifice`,
          title: `The Bulls of the Deep`,
          text: `<p class='myth-text'>Roman generals sacrificed to him before naval campaigns; his festival in July kept a grudging peace with the power that could sink everything Rome built on land.</p>`,
        },
      ],
    },
    syncretism: `<p>Greek Poseidon's direct heir; the Etruscan Nethuns and the Gallo-Roman river gods folded into his cult across the empire.</p>`,
    culturalLegacy: `<p>The planet keeps his name; the trident survives in every naval badge and in Ukraine's modern trident (tryzub).</p>`,
    extendedMeditation: `<p>Neptūnus is the temple of respected power: the sea does not negotiate, but it does provide. Those who work the water — shippers, explorers, engineers of the deep — honor him by preparing for the storm as if it were scheduled.</p>`,
    sources: [{ name: `Virgil` }, { name: `Varro` }, { name: `Lewis & Short` }],
    archaeology: `<p>His altar in the Campus Martius and the lake sanctuaries of Latium are documented; mosaics across the empire show the trident and dolphin court.</p>`,
  },
  vulcanus: {
    pronunciation: {
      ipa: `/vulˈkaː.nus/`,
      ipaLabel: `Classical Latin`,
      approximation: `vul-KAH-nus, long ā on the stressed second syllable.`,
      note: `Only the ā is long in classical Vulcānus.`,
    },
    domains: [`Fire`, `Forge`, `Craft`],
    symbols: [`The anvil and hammer`, `The volcanic forge`, `The crafted thunderbolt`],
    mythology: {
      lead: `<p class='lead-text'>Vulcānus is the smith of the Roman gods: the maker who gives gods their weapons and mortals their fire. He is the only Olympian who works with his hands — and the volcano is named for his forge.</p>`,
      myths: [
        {
          tag: `The Forge`,
          title: `The Factory Under Etna`,
          text: `<p class='myth-text'>Beneath Mount Etna his Cyclopes hammered Zeús's bolts and Aeneas's armor; the volcano smokes because the forge never closes. Rome heard production in the mountain's rumble.</p>`,
        },
        {
          tag: `The Chain`,
          title: `The Net for Mars and Venus`,
          text: `<p class='myth-text'>Told his wife Venus strayed with Mars, he forged a net of links too fine to see and caught them in the act — then displayed the catch to the assembled gods. The smith proves that craft answers insult more precisely than rage.</p>`,
        },
        {
          tag: `The Gift`,
          title: `Fire for the Mortals`,
          text: `<p class='myth-text'>The Vulcanalia (August 23) kept his favor with offerings thrown into flames — Rome's acknowledgment that the gift of fire is renewed only by feeding it.</p>`,
        },
      ],
    },
    syncretism: `<p>Greek Hēphaistos's direct heir; the Vedic Tvaṣṭṛ and the Germanic Wieland are his craft-brothers across the Indo-European forge.</p>`,
    culturalLegacy: `<p>"Volcano" carries his name in stone; every anvil emoji and factory logo owes him its silhouette.</p>`,
    extendedMeditation: `<p>Vulcānus is the temple of the builders: the god who proves that even heaven runs on manufactured goods. Engineers, smiths, and makers of precise things work in his fire — the only flame that builds more than it burns.</p>`,
    sources: [{ name: `Virgil` }, { name: `Ovid` }, { name: `Varro` }],
    archaeology: `<p>His sanctuary on the Campus Martius hosted the Vulcanalia for centuries; Pompeii's fullonicae and smith quarters show his cult embedded in daily Roman work.</p>`,
  },
};
