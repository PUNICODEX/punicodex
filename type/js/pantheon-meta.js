/**
 * PUNICODEX — Canonical pantheon metadata.
 *
 * Single source of truth for pantheon labels, emoji, colors, and landing-page
 * content. Every consumer (lexicon browse, API name services, type engine,
 * connections, temple generators, and pantheon landing pages) derives from
 * this module — do not re-declare pantheon maps anywhere else (guarded by
 * test/pantheon-meta.test.js).
 *
 * Landing-page fields (era, region, summary, story, themes, texts, featured)
 * drive the per-pantheon overview pages at /{pantheon}/index.html.
 *
 * UMD: browser global PANTHEON_META, Node module.exports.
 */

const PANTHEON_META = {
  greek: {
    label: 'Greek',
    emoji: '⚡',
    color: '#D4AF37',
    era: 'c. 1600 BC – 400 AD',
    region: 'Aegean, Greek peninsula, Asia Minor, and Magna Graecia',
    summary:
      'Greek mythology is one of the most influential narrative traditions of the ancient Mediterranean, preserving a polytheistic cosmos populated by Olympian gods, chthonic powers, heroes, and personified forces of nature. Its stories were performed in epic, lyric, and dramatic poetry and shaped later art, literature, philosophy, and religion across Europe and the Near East.',
    story: `The Greek cosmos begins with Chaos, from whom emerge Gaia, Tartaros, and Eros. Gaia bears Ouranos, and their Titan children—among them Kronos and Rhea—precede the Olympian gods led by Zeus. After a war against the Titans, Zeus establishes his thunderbolt-wielding rule on Olympos, dividing cosmic jurisdiction among his siblings and children: Poseidon over the sea, Hades over the dead, Hera over marriage, Athena over wisdom and warfare, Apollo over prophecy and music, Artemis over the wild, Ares over war, Aphrodite over desire, Hermes over boundaries and messengers, Hephaistos over fire and craft, Demeter over grain, and Dionysos over wine and ecstatic ritual.

Greek myth is not a single scripture but a vast, contradictory tradition shaped by local cult, Panhellenic festivals, and competing poetic genealogies. Theogonies, Homeric epic, and the Homeric Hymns present different emphases: Hesiod charts divine succession and cosmic order, while Homer dwells on heroic honor, fate, and the wrath of Achilles. City-states claimed divine founders and patron deities—Athena for Athens, Apollo for Delphi and Delos, Hera for Argos, Poseidon for Corinth—so that mythology underwrote political identity.

Major themes include hubris and nemesis, the obligations of hospitality (xenia), the mediation between mortals and gods through oracle and sacrifice, and the transformation of mortals into stars, stones, plants, or animals. Hero cult bound the dead to the living: figures such as Herakles, Perseus, and Theseus received offerings at their tombs and were thought to confer protection. Mystery cults, especially at Eleusis, promised initiates a better lot after death through secret rites centered on Demeter and Persephone.

The tradition survived antiquity through Roman adaptation, Neoplatonic allegory, Byzantine compendia, and Renaissance rediscovery of Greek manuscripts. Today it remains a foundational reference point for Western literature, psychoanalysis, astronomy, and popular culture, while ongoing philological and archaeological work continues to recover its regional diversity and ritual contexts.`,
    themes: ['cosmogony', 'hero cult', 'oracle', 'polytheism', 'xenia', 'hubris', 'metamorphosis', 'sacrifice'],
    texts: ['theogony', 'homeric-hymns', 'works-and-days', 'metamorphoses'],
    featured: ['apollon', 'hades', 'hekate', 'nike', 'zeus', 'ares', 'aphrodite', 'athena'],
  },
  'greek-location': {
    label: 'Greek Locations',
    proseLabel: 'Greek',
    emoji: '📍',
    color: '#B8860B',
    era: 'c. 1600 BC – 400 AD',
    region: 'Aegean basin, southern Italy, Sicily, and Ionian coasts',
    summary:
      'Greek locations are the cities, islands, mountains, sanctuaries, and mythic landscapes that anchored ancient Greek religion and identity. Each place carried stories of divine foundation, heroic deed, or oracular power, making geography itself a sacred narrative.',
    story: `In Greek religious imagination, landscape was never merely physical. Mountains such as Olympos were the abode of the gods, while caves, springs, and groves served as portals to chthonic powers. Delphi, perched on the slopes of Parnassos, was considered the navel of the world and the seat of Apollo’s oracle; pilgrims from across the Mediterranean sought guidance there before founding colonies, waging wars, or enacting legislation. Olympia hosted the great athletic festival of Zeus, and Delos was revered as the birthplace of Apollo and Artemis.

Major city-states constructed civic identity around patron deities and legendary foundations. Athens claimed Athena’s gift of the olive tree and the autochthonous king Erichthonios; Thebes traced its origins to the Phoenician Kadmos and the Spartoi; Corinth honored Poseidon with its Isthmian Games; Sparta structured its civic calendar around the cults of Apollo Karneios and Artemis Orthia. Mythic warfare such as the Trojan War fixed places like Troy, Mycenae, and Ithaca in the cultural memory of the Greek-speaking world.

Sanctuaries functioned as banks, healing centers, athletic venues, and diplomatic meeting points. The Asklepieion at Epidauros attracted the sick seeking dream cures; the Heraion of Argos showcased monumental temple architecture; and the Panathenaic way linked the Athenian agora to the Acropolis. These sites were nodes in a network of pilgrimage, competition, and shared Hellenic identity.

After the Roman conquest, many Greek locations retained prestige as centers of learning, tourism, and imperial cult. Their names persist in modern toponyms, archaeological parks, and the continued allure of the classical Mediterranean, reminding later generations that Greek religion was practiced in place as much as in text.`,
    themes: ['sacred geography', 'polis', 'panhellenism', 'oracle', 'pilgrimage', 'colonization', 'hero cult'],
    texts: ['homeric-hymns', 'works-and-days'],
    featured: ['olympos', 'athenai', 'sparte', 'delphoi', 'korinthos', 'troia', 'thebai', 'krete'],
  },
  norse: {
    label: 'Norse',
    proseLabel: 'Old Norse',
    emoji: '❄️',
    color: '#87CEEB',
    era: 'c. 1st millennium AD – 13th century (recorded c. 1200–1400 AD)',
    region: 'Scandinavia, Iceland, and the Norse North Atlantic',
    summary:
      'Norse mythology preserves the pre-Christian beliefs of Scandinavian and Icelandic peoples as recorded in medieval Eddic poetry, skaldic verse, and saga prose. It presents a cosmos of nine worlds inhabited by gods, giants, dwarfs, elves, and monsters, bound together by fate and destined for cosmic renewal.',
    story: `The Norse cosmos grows from the primordial void Ginnungagap, flanked by the fiery realm Muspell and the icy Niflheim. From the melting frost emerges the primeval giant Ymir, whose body the gods Odin, Vili, and Vé slay to fashion the world: his blood becomes the seas, his flesh the land, his bones the mountains, his skull the sky, and his brains the clouds. The world-tree Yggdrasil binds nine realms, including Asgard, home of the Æsir gods; Midgard, the world of humans; Jötunheim, land of the giants; and Hel, realm of the dead.

The chief god Odin sacrifices an eye at Mímir’s well in exchange for wisdom and hangs himself on Yggdrasil to learn the runes. His son Thor, wielding the hammer Mjöllnir, defends the ordered cosmos against chaotic giants. The gods are neither omnipotent nor eternal; they are subject to wyrd, the weight of fate, and must prepare for Ragnarök, the final battle in which most of them will die. After the flames consume the world, the earth rises again, green and fertile, to be repopulated by surviving gods and humans.

Norse myth was not a fixed scripture but a living repertoire recited by poets, remembered by farmers, and inscribed on rune stones. It encoded values of courage, loyalty, hospitality, and grim humor in the face of inevitable doom. Seiðr, a form of shamanic sorcery associated with Odin and the goddess Freyja, mediated between human and supernatural realms. Kinship and honor bound society, and the dead might rest in burial mounds, journey to Valhalla, or sail to Hel depending on their conduct and social role.

Medieval Iceland became the great repository of Norse myth after the island’s conversion to Christianity. Snorri Sturluson’s Prose Edda and the anonymous Poetic Edda compiled poems and stories that would otherwise have been lost. Today Norse mythology influences fantasy literature, popular media, and neo-pagan reconstruction, while scholars continue to debate the extent of Christian interpolation and the regional diversity of the tradition.`,
    themes: ['cosmogony', 'ragnarok', 'wyrd', 'honor', 'seidr', 'kinship', 'world-tree', 'giant-lore'],
    texts: ['poetic-edda', 'prose-edda', 'volsunga-saga'],
    featured: ['asgardr', 'valholl', 'ragnarok', 'midgardr', 'alfheimr', 'jotunheimr', 'helheimr', 'jormungandr'],
  },
  egyptian: {
    label: 'Egyptian',
    emoji: '☀️',
    color: '#228B22',
    era: 'c. 3100 BC – 400 AD',
    region: 'Nile Valley, Egypt, and Nubia',
    summary:
      'Ancient Egyptian religion sustained one of history’s longest continuous civilizations, centered on the Nile, divine kingship, and an elaborate afterlife theology. Its pantheon of solar, funerary, and local deities was expressed through temple cult, monumental art, and a rich mortuary literature.',
    story: `Egyptian cosmology imagined the universe as arising from the primeval waters of Nun, out of which the first mound or the sun god emerged. At Heliopolis, the Ennead gathered nine deities—Atum, Shu, Tefnut, Geb, Nut, Osiris, Isis, Seth, and Nephthys—whose myths explained kingship, death, and fertility. The sun god Re sailed across the sky by day and through the underworld by night, fighting the serpent Apophis to ensure the dawn. At Thebes, Amun merged with Re to become Amun-Re, king of the gods and patron of pharaohs.

Death dominated Egyptian religious practice as much as life. The body had to be preserved through mummification so that the ka (life force), ba (mobile personality), and akh (transformed spirit) could reunite and thrive in the afterlife. Tombs were furnished with food, furniture, clothing, and magical texts to equip the deceased. The Book of the Dead provided spells to navigate the underworld, weigh the heart against the feather of Maat, and avoid monstrous guardians.

Maat—truth, order, justice, and cosmic balance—was the ethical and metaphysical foundation of Egyptian society. Pharaoh was the earthly guarantor of Maat, mediating between gods and humans through temple ritual. Priests maintained cult statues, offered daily food and incense, and celebrated seasonal festivals that tied the agricultural cycle of the Nile to divine myth, such as the death and revival of Osiris.

Over three millennia, Egyptian religion absorbed local cults, foreign rulers, and international contacts. Greeks and Romans identified Egyptian gods with their own; Isis became a Mediterranean savior goddess. Christianity eventually displaced the old temples, yet Egyptian mythic symbols—the ankh, the eye of Horus, the scarab, and the winged sun disk—continue to fascinate scholars and the public as emblems of one of antiquity’s most visually powerful religions.`,
    themes: ['afterlife', 'maat', 'solar cycle', 'funerary cult', 'kingship', 'syncretism', 'mummification'],
    texts: ['book-of-the-dead'],
    featured: ['ra', 'osiris', 'anubis', 'horus', 'isis', 'thoth', 'amun', 'ptah'],
  },
  sanskrit: {
    label: 'Sanskrit',
    emoji: '🕉️',
    color: '#FF7F50',
    era: 'c. 1500 BC – present',
    region: 'Indian subcontinent and the broader Indic world',
    summary:
      'The Sanskrit tradition encompasses the Vedic, epic, and Puranic mythology of South Asia, a vast corpus expressed in the classical language of Sanskrit and its vernacular descendants. It narrates the lives of gods, avatars, sages, and kings while embedding systems of dharma, karma, and liberation.',
    story: `Sanskrit religious literature begins with the Vedas, hymns composed in archaic Sanskrit and preserved by oral recitation. The Rigveda sings of Indra’s defeat of the dragon Vritra, Agni’s role as priestly fire, and Varuna’s cosmic law. Later Vedic texts elaborate sacrifice, cosmology, and the paths of the soul. From this Vedic matrix emerged the two great Sanskrit epics, the Mahabharata and the Ramayana, which place divine action within complex human genealogies and ethical dilemmas.

The Puranas systematize an enormous pantheon around the trimurti of Brahma the creator, Vishnu the preserver, and Shiva the destroyer, as well as the great goddess Devi in her many forms. Vishnu descends as avatars—Rama, Krishna, Narasimha, Vamana, and others—to restore cosmic order whenever adharma threatens. Shiva, lord of yoga and dance, embodies both ascetic withdrawal and creative potency. The Devi Mahatmya celebrates the goddess Durga’s victory over the buffalo demon Mahishasura, a narrative central to Hindu festival life.

Themes of dharma (duty according to social and cosmic station), karma (the moral law of cause and effect), samsara (cyclical rebirth), and moksha (liberation) thread through Sanskrit mythology. The Bhagavad Gita, embedded in the Mahabharata, makes these themes explicit in Krishna’s dialogue with the warrior Arjuna on the battlefield of Kurukshetra. Devotion (bhakti), knowledge (jnana), and disciplined action (karma-yoga) are offered as complementary paths to the divine.

Sanskrit myth has never been a static antiquity. It is recited, performed, danced, painted, and retold across India and the global diaspora in dozens of languages. Temples, pilgrimage circuits, television serials, and comic books continue to transmit these narratives, making the Sanskrit tradition one of the world’s oldest continuously living mythologies.`,
    themes: ['dharma', 'karma', 'trimurti', 'bhakti', 'cosmic cycle', 'mantra', 'sacrifice', 'avatar'],
    texts: ['rig-veda', 'ramayana'],
    featured: ['rama', 'durga', 'shiva', 'vishnu', 'krishna', 'ganesha', 'lakshmi', 'saraswati'],
  },
  celtic: {
    label: 'Celtic',
    emoji: '🌿',
    color: '#32CD32',
    era: 'c. 500 BC – 400 AD (recorded in medieval Irish and Welsh c. 800–1200 AD)',
    region: 'Western and Central Europe, British Isles, Gaul, and Iberia',
    summary:
      'Celtic mythology comprises the religious narratives of the Celtic-speaking peoples of Iron Age Europe and their medieval Irish and Welsh heirs. It is marked by shape-shifting gods, liminal heroes, sacred sovereignty, and a vivid Otherworld that lies just beyond the boundaries of ordinary experience.',
    story: `Celtic religion left few contemporary written texts; most of what we know comes from archaeological evidence, Greek and Roman commentary, and the later medieval literature of Ireland and Wales. These sources reveal a pantheon of local and tribal deities rather than a single imperial hierarchy. Gods such as Lugh, the Dagda, Nuada, Brigid, Morrigan, Manannán, and Cernunnos appear across regions under many names and forms, often associated with war, craft, fertility, the sea, and the wilderness.

The Irish Mythological Cycle describes the successive invasions of Ireland by supernatural peoples: the Cessair, Partholón, Nemed, Fir Bolg, Tuatha Dé Danann, and finally the Milesians. The Tuatha Dé Danann, defeated by the Milesians, retreat into the sídhe mounds and become the fairy folk of later folklore. The Ulster Cycle centers on the hero Cú Chulainn and the tragic war over the Brown Bull of Cooley, while the Fenian Cycle follows Fionn mac Cumhaill and his warrior band. The Welsh Mabinogi weaves tales of Pwyll, Branwen, Manawydan, and Math, blending sovereignty, transformation, and Otherworld journeys.

A distinctive Celtic theme is the thin boundary between this world and the Otherworld, reached through mounds, lakes, mist, and seasonal festivals such as Samhain. Sovereignty was often ritually embodied by a goddess who married the rightful king; the land’s fertility depended on the moral and sexual legitimacy of the ruler. Druids served as priests, judges, teachers, and astronomers, preserving sacred knowledge through oral transmission.

Celtic mythology experienced a Romantic revival in the eighteenth and nineteenth centuries and remains influential in fantasy literature, neo-paganism, and nationalist symbolism. Modern scholarship emphasizes the gap between Iron Age practice and medieval literary representation, warning against treating later tales as transparent windows onto pre-Christian belief.`,
    themes: ['otherworld', 'druidry', 'sovereignty', 'triple goddess', 'hero cult', 'liminality', 'shape-shifting'],
    texts: [],
    featured: ['lugh', 'morrigan', 'manannan', 'cernunnos', 'brigid', 'dagda', 'nuada', 'diancecht'],
  },
  mesopotamian: {
    label: 'Mesopotamian',
    emoji: '🏛️',
    color: '#8B4513',
    era: 'c. 3500 BC – 539 BC',
    region: 'Tigris–Euphrates river valley, modern Iraq and Syria',
    summary:
      'Mesopotamian religion shaped the urban civilization that arose between the Tigris and Euphrates rivers. City-states each claimed a divine patron, while epic poetry and royal inscriptions articulated a cosmos governed by powerful, quarrelsome gods and the necessity of cultic service.',
    story: `Mesopotamian civilization produced the world’s earliest cities, writing systems, and monumental temples, and its religion was inseparable from urban life. Each city-state regarded itself as the estate of a particular deity: Enlil at Nippur, Inanna/Ishtar at Uruk, Marduk at Babylon, Ashur at Assur, Ea at Eridu, Shamash at Sippar, and Nabu at Borsippa. The ziggurat, a stepped temple tower, formed the architectural heart of these cities, linking heaven and earth.

The creation epic Enuma Elish tells how the young storm god Marduk defeats the primordial sea goddess Tiamat and fashions the cosmos from her corpse, establishing Babylon as the cosmic capital. The Epic of Gilgamesh, one of humanity’s oldest surviving works of literature, follows a king’s search for immortality after the death of his friend Enkidu, ultimately affirming the dignity of mortal life within the limits set by the gods. Myths of the netherworld, flood, and divine marriage recur across Sumerian, Akkadian, and Babylonian sources.

Kingship was understood as a divinely instituted office. Rulers built temples, led military campaigns, and issued law codes in the name of maintaining cosmic order. Divination—reading entrails, observing celestial events, interpreting dreams, and noting omens—was a major religious science through which humans could discern the will of the gods. Priests, lamentation singers, and exorcists staffed temple households that owned extensive land and labor.

Mesopotamian religion profoundly influenced neighboring cultures, including Canaanite, Israelite, Persian, and Greek traditions. After the Persian conquest of Babylon and the spread of Hellenism, the old temples declined, but their myths, imagery, and mathematical astronomy lived on in later religious and scientific traditions.`,
    themes: ['city-state', 'divine kingship', 'flood', 'cosmic order', 'astral religion', 'exorcism', 'temple cult'],
    texts: ['enuma-elish', 'gilgamesh'],
    featured: ['ishtar', 'ashur', 'shamash', 'marduk', 'enlil', 'ea', 'anu', 'inanna'],
  },
  polynesian: {
    label: 'Polynesian',
    emoji: '🌊',
    color: '#20B2AA',
    era: 'c. 1000 BC – present',
    region: 'The Polynesian Triangle: Hawaii, New Zealand, Rapa Nui, and the central Pacific islands',
    summary:
      'Polynesian mythology arises from the seafaring cultures that settled the vast Pacific Ocean. It narrates creation from darkness and the sea, the exploits of culture heroes such as Maui, and the genealogical bonds that link chiefs, gods, and the natural world.',
    story: `Polynesian cosmogonies typically begin with Te Kore, the Void, proceeding through stages of darkness, light, and the emergence of land and sky. In many island traditions, the sky father Rangi and earth mother Papa are separated by their children—Tāne, Tū, Rongo, Tangaroa, and others—creating the space for life and human activity. This primordial separation is a foundational act of cosmogony shared, with local variations, across Tahiti, Hawaii, New Zealand, Samoa, Tonga, and the Cook Islands.

The demigod Maui is perhaps the best-known Polynesian culture hero. Across island traditions he slows the sun, fishes up islands from the ocean floor, and steals fire for humanity. His tricks often backfire, teaching lessons about hubris and mortality. Other significant figures include the Hawaiian volcano goddess Pele, the Tahitian sea god Tangaroa, and the Māori forest god Tāne, who separated his parents and brought the first human being to life.

Genealogy (whakapapa) is central to Polynesian religion and social organization. Chiefs trace descent from the gods, and land rights, ritual responsibilities, and social rank are validated through carefully memorized lines of ancestry. The concepts of mana (spiritual power or efficacy) and tapu (sacred restriction) govern interactions between people, places, objects, and the divine. Violating tapu can invite supernatural consequences; lifting it requires proper ritual expertise.

Polynesian mythology was transmitted orally through chant, song, dance, and carving until European contact brought writing and missionary conversion. Colonial disruption caused severe losses, but revitalization movements across the Pacific have reclaimed navigation, language, tattoo, hula, and whakapapa as living expressions of ancestral knowledge.`,
    themes: ['ocean navigation', 'mana', 'tapu', 'genealogy', 'creation', 'chiefship', 'nature powers'],
    texts: ['kumulipo', 'polynesian-mythology'],
    featured: ['tane', 'tu', 'maui', 'rongo', 'tangaroa', 'pele', 'kane', 'kanaloa'],
  },
  roman: {
    label: 'Roman',
    emoji: '🦅',
    color: '#8B0000',
    era: 'c. 753 BC – 476 AD',
    region: 'Italian Peninsula and the Roman Empire',
    summary:
      'Roman religion organized the sacred life of one of antiquity’s greatest states around public cult, household piety, augury, and the imperial cult. Roman gods were often identified with Greek counterparts but served distinct civic and contractual functions.',
    story: `Roman religion was above all a religion of place, contract, and state. The Capitoline triad—Jupiter, Juno, and Minerva—watched over the city from the temple on the Capitoline Hill. Jupiter embodied sovereign law and oaths; Juno protected women and the state; Minerva oversaw craft and strategic warfare. Other major deities included Mars, originally an agricultural protector as well as a war god; Venus, claimed as ancestress of the Julian gens; Vesta, goddess of the hearth whose perpetual fire symbolized Rome’s continuity; and Janus, the two-faced god of beginnings and doorways.

The pax deorum, or peace of the gods, required exact performance of ritual obligations. Priestly colleges—the pontifices, augures, quindecimviri sacris faciundis, and Vestal Virgins—interpreted divine will through the flight of birds, the entrails of sacrificial animals, the Sibylline Books, and prodigies such as lightning or monstrous births. A magistrate who neglected these rites risked disaster for the whole community. Household religion centered on the lararium, the domestic shrine to the Lares and Penates, and the genius of the paterfamilias.

Roman mythology incorporated Greek stories through the interpretatio graeca, identifying Jupiter with Zeus, Neptune with Poseidon, Pluto with Hades, Diana with Artemis, Mercury with Hermes, and so on. Yet Roman narratives also emphasized foundation, virtue, and civic duty: the story of Aeneas, the rape of the Sabine women, the sacrifice of Lucretia, and the exempla of Cincinnatus and Horatius shaped Roman self-understanding.

As the empire expanded, Roman religion absorbed cults from Egypt, Syria, Anatolia, and Persia. The imperial cult elevated living and deceased emperors to divine honors, binding provincial elites to Rome. Christianity eventually displaced the old public cult, but Roman religious vocabulary—temples, pontiffs, augury, and the calendar—left a lasting imprint on Western institutions and languages.`,
    themes: ['state cult', 'pietas', 'augury', 'imperial cult', 'household gods', 'syncretism', 'civic duty'],
    texts: ['metamorphoses', 'works-and-days'],
    featured: ['diana', 'ianus', 'iuno', 'iuppiter', 'neptunus', 'vulcanus', 'pluto', 'ceres'],
  },
  japanese: {
    label: 'Japanese',
    emoji: '⛩️',
    color: '#DC143C',
    era: 'c. 300 AD – present',
    region: 'Japanese archipelago',
    summary:
      'Japanese Shinto and related folk traditions center on kami, the spirits of places, natural forces, ancestors, and extraordinary human beings. Together with Buddhist and Confucian influences, they form a layered religious culture expressed in shrines, festivals, and imperial mythology.',
    story: `Japanese myth is recorded most fully in the Kojiki and Nihon Shoki, eighth-century chronicles commissioned by the imperial court to legitimize the Yamato dynasty. These texts describe the creation of the islands by the primordial deities Izanagi and Izanami, the sun goddess Amaterasu’s withdrawal into a cave and her eventual lure back into the world, and the descent of her grandson Ninigi to rule Japan. The imperial family claimed direct descent from Amaterasu, making mythology a charter for political authority.

Kami are not simply gods in a Western sense. They inhabit mountains, rivers, trees, rocks, thunder, wind, and notable ancestors or culture heroes. Major kami include Amaterasu, Susanoo the storm god, Tsukuyomi the moon deity, Inari the rice and fertility deity, Hachiman the god of war and archery, and Tenjin the deified scholar Sugawara no Michizane. Local shrines, each with its own tutelary kami, form the basic institutional unit of Shinto practice.

Ritual purity is central to Japanese religion. Misogi (water purification), abstention from pollution, and the renewal of shrine buildings (shikinen sengu) at Ise reflect a concern with cleanliness, renewal, and the cyclical nature of time. Matsuri, or festivals, reinvigorate the bond between a community and its kami through procession, music, dance, and offerings.

The tradition evolved through Buddhism’s arrival in the sixth century and the subsequent synthesis known as shinbutsu-shugo, in which kami were interpreted as local manifestations of Buddhist bodhisattvas. The Meiji government forcibly separated the two in the nineteenth century, promoting State Shinto until 1945. Today Shinto remains a vital part of Japanese life, especially at births, coming-of-age ceremonies, weddings, and New Year observances.`,
    themes: ['kami', 'purity', 'imperial lineage', 'nature spirits', 'ancestor veneration', 'syncretism', 'festivals'],
    texts: ['kojiki', 'nihon-shoki'],
    featured: ['tokyo', 'osaka', 'kyoto', 'kobe', 'nikko', 'hokkaido', 'shikoku', 'nagoya'],
  },
  nahuatl: {
    label: 'Nahuatl',
    emoji: '🐍',
    color: '#9ACD32',
    era: 'c. 1300 AD – 1521 AD (roots in earlier Mesoamerican cultures)',
    region: 'Central Mexico and Mesoamerica',
    summary:
      'Nahuatl-speaking peoples, especially the Mexica (Aztecs), developed a complex religious system rooted in earlier Mesoamerican civilizations. Their mythology explained the cosmos as a dynamic balance of cosmic ages, solar energy, and sacrificial reciprocity.',
    story: `The Mexica believed that the present era, the Fifth Sun, had been born from the self-sacrifice of the gods at Teotihuacan. After several failed attempts to create humanity, the gods Nanahuatzin and Tecuciztecatl leaped into a great fire; one became the sun, the other the moon. The sun’s daily journey required nourishment in the form of human blood and hearts, a belief that underpinned the large-scale sacrificial rituals for which Aztec religion is most notorious in colonial accounts.

The pantheon was headed by Ometeotl, the dual creator deity of duality and sustenance, and included major figures such as Quetzalcoatl, the feathered serpent associated with wind, learning, and priestly authority; Tezcatlipoca, the smoking mirror god of night, sorcery, and rulership; Tlaloc, the rain deity whose favor governed agriculture; and Huitzilopochtli, the hummingbird warrior and patron of the Mexica who guided them to their island capital of Tenochtitlan.

Cosmology divided the universe into vertical and horizontal realms. The earth was a flat disk surrounded by water, with thirteen heavens above and nine underworld levels below. The Tonalpohualli, a 260-day ritual calendar, and the Xiuhpohualli, a 365-day solar calendar, interlocked to form a fifty-two-year cycle. At the end of each cycle, the Aztecs feared the collapse of the sun and performed the New Fire ceremony to ensure cosmic renewal.

Spanish conquest and evangelization devastated Nahua temples, priesthoods, and painted books, but Nahuatl mythology survived in colonial chronicles, oral tradition, and modern Indigenous revival. Deities such as Quetzalcoatl and Coatlicue remain potent symbols in Mexican national identity and contemporary art.`,
    themes: ['cyclical time', 'sacrifice', 'sun cult', 'dualism', 'calendar', 'flower war', 'cosmic balance'],
    texts: [],
    featured: ['quetzalcoatl', 'tezcatlipoca', 'tlaloc', 'coatlicue', 'chicomecoatl', 'xochiquetzal', 'coyolxauhqui', 'huitzilopochtli'],
  },
  yoruba: {
    label: 'Yoruba',
    emoji: '🥁',
    color: '#FFD700',
    era: 'c. 1000 AD – present',
    region: 'West Africa (Nigeria, Benin, Togo) and the African diaspora',
    summary:
      'Yoruba religion centers on the worship of Olodumare, the supreme creator, and the orisha, powerful spirits who mediate divine power in the world. It has profoundly influenced Afro-Cuban Santería, Brazilian Candomblé, Haitian Vodou, and Trinidad Orisha through the Atlantic diaspora.',
    story: `Yoruba cosmology places Olodumare at the apex of existence as the source of being, destiny, and divine energy. Olodumare is transcendent and not directly approached through cult; instead, humans relate to the divine through the orisha, a pantheon of spirits each associated with natural forces, colors, numbers, skills, and moral domains. Major orisha include Obatala, the creator of human bodies and deity of purity; Shango, the thunderous former king of Oyo; Oya, the whirlwind and guardian of cemeteries; Oshun, the river goddess of love and fertility; Yemoja, the ocean mother; Ogun, the iron and war deity; and Eshu/Elegba, the trickster messenger who opens and closes all roads.

Human destiny is shaped before birth in the house of Olodumare through the choice of ori, the inner head or personal destiny. Divination, above all Ifa, allows humans to understand their destiny, identify the orisha who walk with them, and receive remedies for imbalance. Ifa priests (babalawo) consult the sixteen principle Odu through the casting of palm nuts or a divining chain, reciting thousands of verses that encode proverbial wisdom and mythic narratives.

Ritual life includes offerings of food, drink, music, dance, and animal sacrifice; possession trance, in which an orisha temporarily mounts a devotee; and initiation into priesthood or specific orisha cults. Ancestors (egun) remain active members of the family, requiring regular remembrance and care. Kingship, markets, crossroads, forests, rivers, and the sea are all charged with spiritual significance.

The transatlantic slave trade forcibly carried Yoruba religion and its practitioners to the Americas, where it syncretized with Catholic saints and other African traditions. Today Yoruba religion flourishes in Nigeria, Benin, Cuba, Brazil, Trinidad, and urban centers worldwide, a testament to its adaptability and enduring spiritual power.`,
    themes: ['orisha', 'divination', 'sacrifice', 'kingship', 'destiny', 'ancestors', 'syncretism'],
    texts: ['nigerian-studies'],
    featured: ['shango', 'oya', 'oshun', 'yemoja', 'eshu', 'ogun', 'obatala', 'olodumare'],
  },
  slavic: {
    label: 'Slavic',
    emoji: '🔥',
    color: '#4682B4',
    era: 'c. 500 AD – 1000 AD (surviving in folk practice into modernity)',
    region: 'Eastern, Central, and Balkan Europe',
    summary:
      'Slavic mythology preserves the pre-Christian beliefs of Slavic-speaking peoples, reconstructed from medieval chronicles, linguistics, folklore, and archaeology. Its pantheon features thunder gods, dualistic figures, household spirits, and seasonal rites tied to agriculture.',
    story: `Written sources for Slavic paganism are sparse and often hostile. Byzantine, German, and Arab observers noted that Slavs worshipped powers of nature at groves, springs, and hills. The tenth-century Russian Primary Chronicle describes Prince Vladimir’s pantheon of Kiev, which included Perun the thunder god, Khors the sun, Dazhbog, Stribog, Simargl, and Mokosh. Linguistic evidence and folk customs help fill out a broader picture of divine names and beliefs across Slavic territories.

Perun, wielder of the axe or hammer and lord of the oak, is the best-attested Slavic high god, opposed by Veles, the horned cattle god and chthonic trickster associated with the underworld and wealth. Their conflict mirrors the cosmic struggle between sky and earth, order and chaos, farmer and herder. Other figures include Svarog the celestial smith, Dazhbog the giving sun, Belobog and Chernobog as personifications of white and black fortune, and a host of nature and household spirits such as the domovoi, rusalki, vila, and leshy.

Seasonal rites marked the agricultural year. Kupala and Maslenitsa preserve elements of pre-Christian fire and water ceremonies; Dziady and Radunitsa honored the dead; and the midwinter koleda involved masked processions and appeals for fertility. Many customs were condemned by Christian clergy and later suppressed by Soviet policy, yet they survived in disguised forms within village folklore.

Modern Slavic Native Faith (Rodnovery) movements seek to reconstruct and practice these traditions, though scholars caution that the evidence is fragmentary and much of what is practiced reflects modern invention as much as ancient continuity. Slavic mythology nevertheless offers a rich field for comparative Indo-European studies and the recovery of Eastern European folk religion.`,
    themes: ['thunder god', 'dualism', 'ancestors', 'seasonal rites', 'household spirits', 'forest and water', 'agriculture'],
    texts: [],
    featured: ['dazhbog', 'chernobog', 'belobog', 'perun', 'veles', 'radagast', 'svarog', 'stribog'],
  },
  zoroastrian: {
    label: 'Zoroastrian',
    emoji: '🔆',
    color: '#FF4500',
    era: 'c. 1500 BC – present',
    region: 'Iran, Central Asia, and the Persian world',
    summary:
      'Zoroastrianism, founded by the prophet Zarathushtra, is one of the world’s oldest continuously practiced monotheistic or dualistic religions. It centers on the worship of Ahura Mazda, the wise lord, and the cosmic struggle between asha (truth and order) and druj (falsehood and chaos).',
    story: `Zoroastrian tradition holds that the prophet Zarathushtra received revelation from Ahura Mazda, the supreme wise lord who created the universe through his thoughts. Opposing Ahura Mazda is Angra Mainyu (Ahriman), the destructive spirit who introduced death, disease, deceit, and evil into the world. Human beings occupy the center of this cosmic conflict: through good thoughts, good words, and good deeds, they ally themselves with asha and hasten the eventual defeat of evil.

The divine realm includes the Amesha Spentas, six holy immortals who personify aspects of creation and virtue: Vohu Manah (good thought), Asha Vahishta (truth and order), Khshathra Vairya (desirable dominion), Spenta Armaiti (holy devotion), Haurvatat (wholeness), and Ameretat (immortality). Yazatas such as Mithra, Anahita, Verethragna, and Sraosha are venerated as worthy of worship. Fire, as a symbol of purity and divine light, is the focus of temple cult and must never be polluted.

Eschatology is central to Zoroastrianism. At death, the soul lingers near the body for three days before crossing the Chinvat Bridge, where its deeds are weighed. The righteous pass to paradise, while the wicked fall into hell. At the end of time, a savior named Saoshyant will lead the final battle, resurrect the dead, purify the world with molten metal, and establish eternal righteousness under Ahura Mazda.

Zoroastrianism was the dominant religion of the Achaemenid, Parthian, and Sasanian empires before the Islamic conquest of Persia. Survivors migrated to India, where they became known as Parsis, and smaller communities remain in Iran, India, and the diaspora. Its influence on later Jewish, Christian, and Islamic ideas of angels, demons, judgment, and paradise has been widely studied.`,
    themes: ['dualism', 'asha', 'free will', 'eschatology', 'fire cult', 'judgment', 'cosmic order'],
    texts: ['avesta'],
    featured: ['ahuramazda', 'angramainyu', 'mithra', 'ahriman', 'spentamainyu', 'vohumanah', 'khshathravairya', 'spentaarmaiti'],
  },
  incan: {
    label: 'Incan',
    emoji: '🦙',
    color: '#CD853F',
    era: 'c. 1200 AD – 1533 AD',
    region: 'Central Andes, including modern Peru, Ecuador, Bolivia, and Chile',
    summary:
      'Inca religion organized the Andean world around the worship of the sun, ancestor veneration, sacred geography, and the divine authority of the Sapa Inca. It built on millennia of earlier Andean civilizations and remains influential in contemporary Andean spiritual practice.',
    story: `The Inca Empire, Tawantinsuyu, unified a vast Andean realm through military conquest, road systems, storehouses, and a state religion centered on the sun god Inti. The Inca claimed descent from Inti through Manco Cápac and Mama Ocllo, who emerged from Lake Titicaca or the cave of Pacaritambo to found Cusco. The Sapa Inca, as son of the sun, stood at the apex of both political and religious life.

Major deities included Inti the sun, Viracocha the creator who emerged from the waters to make the cosmos, Pachamama the earth mother, Mama Quilla the moon, Mama Cocha the sea, Illapa the thunder and weather god, Pachacamac the oracle deity of the central coast, and Supay the lord of the underworld and death. The pantheon was hierarchical but also regional: conquered peoples were allowed to retain their huacas (sacred places, objects, or ancestors) as long as they acknowledged the supremacy of Inca cult.

Ancestor worship permeated Inca society. Royal mummies, known as mallquis, were preserved and consulted, dressed, fed, and carried in procession; they retained ownership of lands and retainers after death. The ceque system of Cusco organized the city’s sacred landscape into forty-one invisible lines radiating from the Coricancha temple, linking huacas, shrines, and social groups in a ritual map of empire.

Spanish conquest shattered the Inca state and its priesthood, but Andean religion survived in syncretic forms. Pachamama, the apus (mountain spirits), and regional saints continue to receive offerings of coca, chicha, and llamas in the highlands. Modern Quechua and Aymara communities maintain a vibrant religious life that blends Catholic and Indigenous elements.`,
    themes: ['sun cult', 'imperial cult', 'ancestor mummies', 'ceque lines', 'duality', 'agricultural rites', 'sacred geography'],
    texts: [],
    featured: ['inti', 'viracocha', 'pachamama', 'mamaquilla', 'mamaqucha', 'illapa', 'pachacamac', 'supay'],
  },
  chinese: {
    label: 'Chinese',
    emoji: '🐉',
    color: '#F08080',
    era: 'c. 1600 BC – present',
    region: 'China and the broader Sinosphere',
    summary:
      'Chinese religious culture is a vast synthesis of indigenous deity cults, ancestor veneration, Daoist ritual, Buddhist devotion, and Confucian ethics. Its mythology includes cosmic gods, local tutelary spirits, perfected immortals, and legendary culture heroes.',
    story: `Chinese mythology has no single canon, but it is anchored by narratives of cosmic creation, divine kingship, and the ordering of nature. Early texts describe a three-tiered cosmos of heaven, earth, and the underworld, populated by the Supreme Emperor of Heaven (Tian or Shangdi), astral deities, terrestrial spirits, and ancestors. The sage kings Yao, Shun, and Yu the Great tamed floods, established agriculture, and founded the moral and political order of civilization.

The pantheon is extraordinarily diverse. Guanyin, the bodhisattva of compassion, is among the most widely worshipped figures in East Asia. The Jade Emperor presides over a celestial bureaucracy mirrored in earthly administration. Local gods such as Tudigong the earth god, City Gods, Mazu the sea goddess, and Dragon Kings govern specific places and professions. Ancestors remain central to family ritual, receiving offerings at home altars and during Qingming and other festivals.

Daoism contributed a vast body of gods, immortals, exorcistic rituals, and alchemical traditions. The Eight Immortals, the Queen Mother of the West, the Three Pure Ones, and the perfected saints of Daoist lineages populate a sacred landscape of grotto-heavens and immortal islands. Buddhist imports from India and Central Asia added bodhisattvas, pure lands, hell judges, and monastic orders, which were thoroughly sinicized.

Confucianism emphasized filial piety, ritual propriety, and the Mandate of Heaven, providing an ethical framework that shaped imperial ideology and family life for more than two millennia. Today Chinese religion remains a lived synthesis of temple worship, festival procession, divination, and domestic ritual, both on the mainland and throughout the diaspora.`,
    themes: ['heaven mandate', 'ancestor veneration', 'daoist and buddhist syncretism', 'local gods', 'exorcism', 'bureaucratic cosmos'],
    texts: [],
    featured: ['guanyin', 'lanling', 'taishang', 'tianhou', 'longwang', 'yamen', 'bagua', 'taichi'],
  },
  buddhist: {
    label: 'Buddhist',
    emoji: '☸️',
    color: '#9932CC',
    era: 'c. 5th century BC – present',
    region: 'India, Central Asia, East Asia, Southeast Asia, and the Himalayan world',
    summary:
      'Buddhist mythology narrates the life and former births of the Buddha, the cosmic activity of bodhisattvas and celestial buddhas, and the landscapes of pure lands and hell realms. It blends Indian narrative forms with local cultures across Asia.',
    story: `Buddhist mythology begins with the historical figure Siddhartha Gautama, born in the fifth century BC into a royal family in the Himalayan foothills of present-day Nepal. Shaken by encounters with old age, sickness, death, and a wandering ascetic, he left palace and family to seek liberation from suffering. After years of ascetic practice and final meditation under the Bodhi tree, he attained enlightenment and became the Buddha, the Awakened One. He spent the rest of his life teaching the Four Noble Truths, the Eightfold Path, dependent origination, and nirvana.

The tradition soon developed vast mythologies around the Buddha’s previous lives as a bodhisattva, recorded in the Jataka tales. Mahayana Buddhism expanded the pantheon to include cosmic buddhas such as Amitabha, Vairocana, Akshobhya, Ratnasambhava, and Amoghasiddhi; great bodhisattvas such as Avalokiteshvara (Guanyin), Manjushri, Samantabhadra, and Kshitigarbha; and celestial realms or pure lands attainable through faith and devotion. The Lotus Sutra teaches the universality of buddha-nature, while the Sukhavativyuha Sutra describes Amitabha’s Western Pure Land.

Vajrayana Buddhism, prominent in Tibet, Nepal, and Mongolia, adds tantric deities, wrathful protectors, dakinis, and elaborate visualization practices. Theravada Buddhism, dominant in Sri Lanka and Southeast Asia, retains a more conservative focus on the historical Buddha and the arhat ideal, while still cultivating stories of gods, nagas, and local spirits who support the dharma.

Buddhist art, architecture, and ritual express these myths across Asia in stupas, cave temples, mandalas, thangkas, and festivals. The tradition’s emphasis on compassion, impermanence, interdependence, and liberation continues to attract practitioners and scholars worldwide, while regional schools preserve distinctive narrative and iconographic traditions.`,
    themes: ['enlightenment', 'compassion', 'pure land', 'bodhisattva', 'mandala', 'sunyata', 'liberation', 'rebirth'],
    texts: ['lotus-sutra', 'sukhavativyuha'],
    featured: ['amitabha', 'vairocana', 'akshobhya', 'ratnasambhava', 'amoghasiddhi', 'maitreya', 'manjushri', 'samantabhadra'],
  },
  taoist: {
    label: 'Taoist',
    emoji: '☯️',
    color: '#4169E1',
    era: 'c. 4th century BC – present',
    region: 'China and the Chinese diaspora',
    summary:
      'Taoism is both a philosophical tradition and an organized religion rooted in the concept of the Dao, the ineffable source and pattern of the cosmos. Its mythology includes cosmic gods, immortal saints, exorcistic generals, and alchemical questers for longevity.',
    story: `Taoist thought takes its name from the Dao, the way or principle that underlies and gives rise to all things yet cannot be fully named or grasped. The Daodejing, traditionally ascribed to Laozi, and the Zhuangzi are the foundational philosophical texts. They advocate wu wei, effortless action in harmony with the Dao; humility; flexibility; and the recognition that conventional opposites arise from a deeper unity. The yin-yang symbol expresses this dynamic complementarity.

Religious Taoism organized itself into lineages, rituals, and a sprawling pantheon. The Three Pure Ones stand at the top of the celestial hierarchy, followed by the Jade Emperor, the Queen Mother of the West, and countless immortals, perfected beings, and exorcistic marshals. The Eight Immortals—Lü Dongbin, Zhongli Quan, He Xiangu, and others—embody various virtues, professions, and paths to transcendence. Internal alchemy (neidan) seeks immortality through meditation, breath control, and the refinement of body energies.

Taoist ritual addresses every dimension of life and death. Priests perform offerings, exorcisms, funerals, and community renewals, using talismans, registers of spirit troops, and liturgical dance. The goal is to harmonize human society with the celestial bureaucracy, expel demonic influences, and ensure health, prosperity, and favorable rebirth. Mounts such as Wudang and Longhu are sacred centers where monasteries, martial arts, and alchemical practice converge.

Taoism deeply influenced Chinese medicine, feng shui, martial arts, landscape painting, and poetry. It also absorbed and influenced Buddhism and folk religion, creating a layered religious culture. Today Taoist temples, festivals, and practices continue across China, Taiwan, Southeast Asia, and the global diaspora.`,
    themes: ['dao', 'wu wei', 'immortality', 'alchemy', 'exorcism', 'cosmology', 'internal cultivation'],
    texts: ['tao-te-ching'],
    featured: ['laozi', 'zhuangzi', 'zhangdaoling', 'ludongbin', 'zhongliquan', 'hexiangu', 'xiwangmu', 'dongwanggong'],
  },
  korean: {
    label: 'Korean',
    emoji: '🇰🇷',
    color: '#FF69B4',
    era: 'c. 1000 BC – present',
    region: 'Korean Peninsula',
    summary:
      'Korean religious culture weaves together shamanic musok, village tutelary cults, Buddhist devotion, Confucian ancestor rites, and Daoist-derived practices. Its mythology includes founding ancestors, mountain spirits, household gods, and shamans who mediate between worlds.',
    story: `Korean myth is preserved in foundation narratives such as the Dangun story, in which the heavenly prince Hwanung descends to Mount Baekdu and, through union with a bear transformed into a woman, fathers Dangun Wanggeom, the legendary founder of Gojoseon in 2333 BC. This story establishes Korea’s identity as a land of heavenly mandate, mountain sanctity, and bear-totem ancestry.

Shamanism, known as musok or muism, constitutes the oldest stratum of Korean religion. Shamans (mudang) enter trance to communicate with gods, ancestors, and restless spirits, performing gut rituals of song, dance, drama, and offering to heal illness, guide the dead, and secure prosperity. Major spirits include Hananim or Haneullim the supreme sky, the seven-star spirits, mountain gods, dragon kings, and the Samshin Halmoni, the grandmother of childbirth.

Household gods (jowangshin, seongju, samsin, and others) protect the home, kitchen, gate, and childbirth. Village tutelary deities (dongjaesin) and mountain gods (sansin) receive regular offerings. Buddhism arrived in the fourth century AD and became a dominant state religion under the Goryeo dynasty, leaving a legacy of temples, mountain hermitages, and folk Buddhist practice. Confucianism shaped ancestor worship, family hierarchy, and state ritual during the Joseon dynasty.

Modern Korea preserves shamanic practice alongside Christianity and Buddhism, often in layered forms. The Korean shamanic worldview continues to influence popular culture, festival arts, and spiritual healing, while scholars document and analyze its music, possession, and mythology as intangible cultural heritage.`,
    themes: ['shamanism', 'mountain spirits', 'household gods', 'founding ancestors', 'buddhist syncretism', 'ancestor rites'],
    texts: [],
    featured: ['hananim', 'dangun', 'hwanung', 'samshin', 'halmoni', 'jowangshin', 'seonangshin', 'yongwang'],
  },
  canaanite: {
    label: 'Canaanite',
    emoji: '🌴',
    color: '#800080',
    era: 'c. 3000 BC – 800 BC',
    region: 'Levant, including Syria-Palestine and the coastal trade corridor',
    summary:
      'Canaanite religion was the West Semitic polytheism of the Bronze and Iron Age Levant. Known from Ugaritic tablets, the Hebrew Bible, and archaeology, it centered on a divine council headed by El and the storm god Baal.',
    story: `The Canaanite pantheon is best known from the cuneiform tablets discovered at Ugarit (modern Ras Shamra) in Syria, dating to the late second millennium BC. These texts describe a divine family headed by El, the father of gods and humanity, and his consort Athirat (Asherah). The storm god Baal Haddu, rider of the clouds and lord of rain, is the central active deity, whose palace-building and defeat of the sea god Yamm and the death god Mot secure cosmic fertility and order.

Other important figures include Anat, Baal’s sister and a warrior goddess; Shapash, the sun goddess who travels between the realms of the living and the dead; Kothar-wa-Hasis, the divine craftsman; Dagan, a grain deity; and Athtart (Astarte). The divine council met on a mountain assembly, reflecting the political organization of Levantine city-states. Each city had its patron deity, temple, and royal cult, and kingship was ritually legitimized through divine adoption.

Canaanite religion deeply influenced early Israelite religion. The Hebrew Bible preserves polemics against Baal worship, Asherah poles, and child sacrifice, as well as shared vocabulary, poetic forms, and divine titles. Some scholars trace Israelite monotheism to a gradual convergence of El and Yahweh traditions within a Canaanite cultural matrix. The sea monster Leviathan and motifs of divine combat appear in both Canaanite and biblical poetry.

The conquests of Assyria, Babylon, and Persia disrupted Canaanite city-state religion, though Phoenician colonies carried related deities across the Mediterranean. Today Canaanite mythology is studied through Ugaritic philology, biblical archaeology, and comparative Semitics, offering crucial evidence for the religious world from which Judaism, Christianity, and Islam eventually emerged.`,
    themes: ['storm god', 'divine council', 'royal cult', 'sacrifice', 'sacred kingship', 'sea and chaos', 'fertility'],
    texts: ['bible-kjv'],
    featured: ['baal', 'el', 'anat', 'shapash', 'athiratu', 'asherah', 'leviathan', 'moses'],
  },
  phoenician: {
    label: 'Phoenician',
    emoji: '🌅',
    color: '#800000',
    era: 'c. 2500 BC – 800 BC',
    region: 'Levantine coast and Phoenician colonies across the Mediterranean',
    summary:
      'Phoenician religion was the maritime polytheism of the ancient Levantine traders and colonists who founded Carthage and other cities. Its deities—Baal, Astarte, Melqart, Eshmun, and Tanit—governed sea, city, commerce, and royal power.',
    story: `The Phoenicians were a seafaring people of the Levantine coast whose cities—Tyre, Sidon, Byblos, and Arwad—dominated Mediterranean trade from the late Bronze Age into the first millennium BC. Their religion was closely related to Canaanite tradition but shaped by maritime enterprise and city-state identity. Each city honored its own patron deity: Melqart of Tyre, Eshmun of Sidon, Baalat Gebal of Byblos, and Tanit and Baal Hammon of Carthage.

Baal, the storm and fertility god, appears widely in Phoenician theophoric names and inscriptions. Astarte, goddess of love, war, and the planet Venus, was venerated from Cyprus to Spain. Tanit, face of Baal, became the supreme goddess of Carthage, symbolized by the sign of Tanit and invoked in hundreds of dedicatory stelae. Melqart, lord of the city and patron of colonization, received royal sacrifices and was identified by Greeks with Herakles.

Phoenician religious practice emphasized vows, dedications, burnt offerings, and temple cult. Tophets, sanctuaries with infant burial urns, have been excavated at Carthage and other western Punic sites, though scholarly debate continues over whether these represent child sacrifice or infant mortality commemorated by votive dedication. Phoenician religion also transmitted astral and calendaric knowledge across the Mediterranean.

The Phoenician alphabet, adapted from earlier West Semitic scripts, became the ancestor of Greek, Latin, and ultimately most modern alphabets. Phoenician religion thus influenced later Mediterranean culture not only through myth and cult but also through the very medium of writing that preserved classical literature.`,
    themes: ['sea trade', 'city pantheons', 'sacrifice', 'alphabet', 'syncretism', 'maritime colonization', 'royal cult'],
    texts: [],
    featured: ['aseratu', 'mot', 'yammu', 'kothar', 'dagan', 'astartu', 'astart'],
  },
  hittite: {
    label: 'Hittite',
    emoji: '🦁',
    color: '#A0522D',
    era: 'c. 1600 BC – 1180 BC',
    region: 'Anatolia, centered on Hattusa in modern Turkey',
    summary:
      'Hittite religion was the state cult of the Hittite Empire in Anatolia, famous for its elaborate rituals, treaties sealed by divine oath, and syncretic pantheon that incorporated Hattian, Hurrian, and Mesopotamian deities.',
    story: `The Hittite Empire, centered at Hattusa in north-central Anatolia, maintained one of the ancient Near East’s most cosmopolitan religious systems. Hittite kings preserved the old Hattian gods of the land while importing Hurrian, Mesopotamian, and Syrian deities into an ever-expanding divine court. This openness produced a pantheon of thousands, organized into lists and ritual calendars that numbered the gods by the thousand.

The storm god stood at the center of Hittite religion. The Hurrian storm god Teshub and the Hattian Taru were identified with each other and with the Mesopotamian Adad. The sun goddess of Arinna, chief deity of the Hittite state, received major festivals. Other significant figures include Telipinu, the vanished and wrathful god of vegetation; Inara, goddess of the wild animals of the steppe; Hannahanna, the grandmotherly mother goddess; and Kumarbi, the Hurrian father of gods whose succession myth influenced Greek cosmogony.

Hittite ritual life was meticulous and inclusive. Kings conducted offerings, oaths, and festivals to secure divine favor for military campaigns, royal health, and agricultural prosperity. Treaties were sworn before lists of gods who guaranteed the agreement; breach invited divine punishment. Divination by oracle, bird observation, and extispicy guided state decisions. Magical and medical rituals addressed angered deities, witchcraft, and impurity.

The collapse of the Hittite Empire around 1180 BC dispersed its traditions, but Hittite ritual texts survived in archives and influenced neighboring cultures. Modern recovery of Hittite religion depends on cuneiform tablets excavated at Hattusa, Bogazkale, and other sites, making it a key case study in ancient state ritual and religious syncretism.`,
    themes: ['divine thousand', 'storm god', 'treaty oaths', 'ritual', 'kingship', 'hurrian syncretism', 'divination'],
    texts: [],
    featured: ['tarhunash', 'arinniti', 'telipinu', 'inaras', 'hannahannas', 'wurusemu', 'kumarbis', 'alalu'],
  },
  mapuche: {
    label: 'Mapuche',
    emoji: '🌋',
    color: '#2E8B57',
    era: 'c. 1200 AD – present',
    region: 'Araucanía, Chile and Argentina',
    summary:
      'Mapuche religion is the Indigenous spiritual tradition of the Mapuche people of the southern Andes. It centers on the machi shaman, the spirits of nature and ancestors, and the cosmic struggle between opposing forces.',
    story: `Mapuche spirituality is rooted in the territory known as Wallmapu, stretching across the Andes of present-day Chile and Argentina. The creator force is expressed through Nguenchén or Pillán, often associated with thunder, volcanoes, and the sky, while the earth is honored as Ñuke Mapu. The culture hero Treng-Treng and his sister Kai-Kai appear in flood narratives: Treng-Treng raised the mountains so that people could escape rising waters, while Kai-Kai caused the flood.

The machi is the ritual specialist of Mapuche society, usually a woman, who enters trance with the help of a kultrún drum to communicate with spirits, diagnose illness, and restore balance. Spirits include the ngen, guardians of specific places and species; the pillan, ancestral thunder spirits; and wekufe, malevolent forces that must be controlled through proper ritual. Health, community well-being, and agricultural success depend on maintaining respectful relations with these powers.

Colonial Chilean and Argentine policies suppressed Mapuche religion, language, and land tenure for centuries, but the tradition has persisted and experienced significant revitalization. Contemporary Mapuche communities defend territorial autonomy, water rights, and cultural heritage, often framed in spiritual terms. Machis continue to practice, and Mapuche ceremonies such as the ngillatun communal prayer remain vital expressions of Indigenous identity.

Scholarly study of Mapuche religion depends on ethnographic fieldwork and colonial-era chronicles, which must be read critically. The tradition offers important perspectives on Andean shamanism, oral cosmology, and the resilience of Indigenous spirituality under colonial and modern pressures.`,
    themes: ['machi shamanism', 'ancestral spirits', 'natural forces', 'resistance', 'cosmic duality', 'territory'],
    texts: [],
    featured: ['trengtreng'],
  },
  baltic: {
    label: 'Baltic',
    emoji: '🌲',
    color: '#00CED1',
    era: 'c. 1000 AD – present (roots in earlier Iron Age practice)',
    region: 'Baltic states, Latvia, Lithuania, and adjacent regions',
    summary:
      'Baltic religion preserves the pre-Christian beliefs of the Latvian, Lithuanian, and Prussian peoples. Reconstructed from folklore, linguistics, and chronicles, it honors a thunder god, a sun goddess, fate spirits, and the sacred oak.',
    story: `Baltic paganism is known primarily through late medieval and early modern sources, since the Baltic peoples were among the last Europeans to undergo Christianization. Lithuanian grand dukes preserved their pagan rites until 1387, and Latvian and Prussian folk religion survived much longer in customary practice. The sources include Christian chronicles, traveler accounts, folk songs (dainas), and archaeological evidence.

The thunder god Perkunas is the best-attested Baltic deity, associated with the oak, fire, and cosmic law. The sun goddess Saule, the moon god Meness, and the morning star Ausrine appear in Baltic folklore and calendar customs. Laima and Deksnis personify fate and destiny at birth, while Milda and Zemyna are associated with love and the earth. The sacred oak grove was the typical place of worship, and fire ceremonies marked major seasonal festivals.

Seasonal rites structured the agricultural year. Jāņi, the midsummer celebration of the summer solstice, remains widely observed in Latvia and Lithuania with bonfires, singing, and herb gathering. Other festivals marked the turn of winter, plowing, harvest, and remembrance of the dead. Many customs were reinterpreted as Christian folk practice or suppressed during the Soviet era, yet they persisted in family and regional tradition.

Modern Baltic pagan revival movements, such as Romuva in Lithuania and Dievturība in Latvia, reconstruct and practice these traditions as expressions of national and spiritual identity. Scholars continue to debate how much of modern Romuva reflects ancient continuity and how much is modern invention, but the movement has gained recognition as a living heritage of the Baltic world.`,
    themes: ['thunder god', 'sun goddess', 'fate', 'ancestor cult', 'sacred oak', 'seasonal festivals', 'folk song'],
    texts: [],
    featured: ['perkunas'],
  },
  aboriginal: {
    label: 'Aboriginal',
    emoji: '🪃',
    color: '#D2691E',
    era: 'c. 50,000 years ago – present',
    region: 'Australia',
    summary:
      'Australian Aboriginal religions comprise the world’s oldest continuously maintained spiritual traditions, linking people, land, ancestors, and law through Dreaming narratives, songlines, and ritual knowledge.',
    story: `Aboriginal Australian cosmology is founded on the Dreaming or Dreamtime, a concept that refers both to the creative epoch when ancestor beings shaped the land and to the ongoing spiritual reality that sustains the world. These ancestors—human, animal, plant, and elemental—traveled across the country, creating rivers, mountains, rock formations, and species as they went. Their journeys are encoded in songlines, oral maps that connect distant communities through shared narrative and ritual obligations.

Each Aboriginal nation and clan has its own set of ancestral beings and stories. Well-known figures include Baiame, the creator sky father of southeastern Australia; Bunjil, the wedge-tailed eagle creator of the Kulin peoples; Daramulum, the son of Baiame associated with initiation; Altjira, the eternal dreamtime sky father of the Arrernte; Ngalyod, the rainbow serpent of western Arnhem Land; and the Wawalag sisters, whose menstruation myth explains seasons and ritual restrictions. The Wandjina spirits of the Kimberley are ancestral creators painted on rock shelters.

Religious knowledge is deeply tied to country, kinship, and initiation. Ceremonies reenact Dreaming events, renew the land, and transmit rights and responsibilities across generations. Art, dance, song, and body decoration serve as ritual technologies for maintaining law and the health of people and environment. Sacred sites are not merely historical markers but living presences that require proper respect and care.

Colonial dispossession, missionary activity, and government assimilation policies inflicted severe damage on Aboriginal cultures, yet Dreaming traditions have proven extraordinarily resilient. Today Aboriginal artists, elders, and communities continue to practice law, manage country, and share selected knowledge with wider audiences, asserting sovereignty and cultural continuity in a changing Australia.`,
    themes: ['dreamtime', 'totemism', 'songlines', 'ancestral beings', 'land connection', 'initiation', 'law'],
    texts: [],
    featured: ['baiame', 'bunjil', 'daramulum', 'altjira', 'ngalyod', 'wandjina', 'wawalag', 'yurlungur'],
  },
};

function pantheonLabel(id) {
  return PANTHEON_META[id]?.label || id;
}

function pantheonProseLabel(id) {
  return PANTHEON_META[id]?.proseLabel || PANTHEON_META[id]?.label || id;
}

function pantheonEmoji(id) {
  return PANTHEON_META[id]?.emoji || '✦';
}

function pantheonColor(id) {
  return PANTHEON_META[id]?.color || '#888888';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PANTHEON_META,
    pantheonLabel,
    pantheonProseLabel,
    pantheonEmoji,
    pantheonColor,
  };
}
