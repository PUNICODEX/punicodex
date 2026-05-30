/**
 * PUNYCODEX Lexicon Expansion Batch
 * All new entries to be generated
 */

const { generateEntry } = require('./generate-entries');

const BATCH_DATA = [
  // ==========================================
  // GREEK EXPANSION (~50 entries)
  // ==========================================
  
  // Titans (missing from current lexicon)
  { id: 'coeus', ascii: 'coeus', unicode: 'Koîos', greek: 'Κοῖος', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Titan of Intellect', meaning: 'Questioning, inquiry', sources: ['Hesiod', 'LSJ'] },
  { id: 'kreios', ascii: 'kreios', unicode: 'Kreîos', greek: 'Κρεῖος', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Titan of Constellations', meaning: 'Ram, master', sources: ['Hesiod', 'LSJ'] },
  { id: 'iapetus', ascii: 'iapetus', unicode: 'Iapetós', greek: 'Ἰαπετός', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Titan of Mortality', meaning: 'Piercer, wound', sources: ['Hesiod', 'LSJ'] },
  { id: 'theia', ascii: 'theia', unicode: 'Theía', greek: 'Θεία', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Titaness of Sight', meaning: 'Goddess, divine', sources: ['Hesiod', 'LSJ'] },
  { id: 'phoebe', ascii: 'phoebe', unicode: 'Phoíbē', greek: 'Φοίβη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Titaness of Prophecy', meaning: 'Bright, shining', sources: ['Hesiod', 'LSJ'] },
  
  // Primordials
  { id: 'nyx', ascii: 'nyx', unicode: 'Nýx', greek: 'Νύξ', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Night', meaning: 'Night', sources: ['Hesiod', 'LSJ'] },
  { id: 'erebus', ascii: 'erebus', unicode: 'Érebos', greek: 'Ἔρεβος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Darkness', meaning: 'Darkness', sources: ['Hesiod', 'LSJ'] },
  { id: 'hemera', ascii: 'hemera', unicode: 'Hēméra', greek: 'Ἡμέρα', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Day', meaning: 'Day', sources: ['Hesiod', 'LSJ'] },
  { id: 'aether', ascii: 'aether', unicode: 'Aithḗr', greek: 'Αἰθήρ', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Upper Air, Light', meaning: 'Bright upper air', sources: ['Hesiod', 'LSJ'] },
  { id: 'ouranos', ascii: 'ouranos', unicode: 'Ouranós', greek: 'Οὐρανός', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Sky', meaning: 'Heaven, sky', sources: ['Hesiod', 'LSJ'] },
  { id: 'ananke', ascii: 'ananke', unicode: 'Anánkē', greek: 'Ἀνάγκη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Necessity, Compulsion', meaning: 'Necessity, constraint', sources: ['Plato', 'LSJ'] },
  { id: 'phanes', ascii: 'phanes', unicode: 'Phánēs', greek: 'Φάνης', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Procreation, Light', meaning: 'Bringer of light', sources: ['Orphic', 'West'] },
  
  // Major missing heroes
  { id: 'achilles', ascii: 'achilles', unicode: 'Achillēs', greek: 'Ἀχιλλεύς', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'War, Heroism', meaning: 'Pain of the people', sources: ['Homer', 'LSJ'] },
  { id: 'odysseus', ascii: 'odysseus', unicode: 'Odysseús', greek: 'Ὀδυσσεύς', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Cunning, Journey', meaning: 'Hated, painful', sources: ['Homer', 'Beekes'] },
  { id: 'menelaus', ascii: 'menelaus', unicode: 'Menélaos', greek: 'Μενέλαος', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'King of Sparta', meaning: 'Enduring the people', sources: ['Homer', 'LSJ'] },
  { id: 'aineias', ascii: 'aineias', unicode: 'Aineías', greek: 'Αἰνείας', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Trojan Hero, Founder of Rome', meaning: 'Praiseworthy', sources: ['Virgil', 'LSJ'] },
  { id: 'cadmus', ascii: 'cadmus', unicode: 'Kádmos', greek: 'Κάδμος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Founder of Thebes', meaning: 'From the east', sources: ['Herodotus', 'LSJ'] },
  { id: 'minos', ascii: 'minos', unicode: 'Mínōs', greek: 'Μίνως', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'King of Crete, Judge of Dead', meaning: 'Moon-man', sources: ['Plato', 'LSJ'] },
  { id: 'aegeus', ascii: 'aegeus', unicode: 'Aigeús', greek: 'Αἰγεύς', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'King of Athens', meaning: 'Of the goat', sources: ['Plutarch', 'LSJ'] },
  { id: 'pelops', ascii: 'pelops', unicode: 'Pélops', greek: 'Πέλοψ', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'King of Olympia', meaning: 'Dark face', sources: ['Pindar', 'LSJ'] },
  { id: 'meleagros', ascii: 'meleagros', unicode: 'Meleágros', greek: 'Μελέαγρος', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Hero of Calydon', meaning: 'Hunting, caring for the hunt', sources: ['Ovid', 'LSJ'] },
  { id: 'atreus', ascii: 'atreus', unicode: 'Atréus', greek: 'Ἀτρεύς', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'King of Mycenae', meaning: 'Fearless', sources: ['Aeschylus', 'LSJ'] },
  { id: 'hippolytus', ascii: 'hippolytus', unicode: 'Hippólutos', greek: 'Ἱππόλυτος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Son of Theseus', meaning: 'Horse-looser', sources: ['Euripides', 'LSJ'] },
  
  // Muses
  { id: 'calliope', ascii: 'calliope', unicode: 'Kalliopē', greek: 'Καλλιόπη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Epic Poetry', meaning: 'Beautiful-voiced', sources: ['Hesiod', 'LSJ'] },
  { id: 'kleio', ascii: 'kleio', unicode: 'Kleió', greek: 'Κλειώ', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'History', meaning: 'Proclaimer, glorifier', sources: ['Hesiod', 'LSJ'] },
  { id: 'thaleia', ascii: 'thaleia', unicode: 'Tháleia', greek: 'Θάλεια', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Comedy, Idyll', meaning: 'Flourishing, blooming', sources: ['Hesiod', 'LSJ'] },
  { id: 'euterpe', ascii: 'euterpe', unicode: 'Eutérpē', greek: 'Εὐτέρπη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Music, Lyric Poetry', meaning: 'Well-pleasing', sources: ['Hesiod', 'LSJ'] },
  { id: 'polyhymnia', ascii: 'polyhymnia', unicode: 'Polyhýmnia', greek: 'Πολύμνια', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Hymns, Sacred Poetry', meaning: 'Many hymns', sources: ['Hesiod', 'LSJ'] },
  { id: 'terpsichore', ascii: 'terpsichore', unicode: 'Terpsichórē', greek: 'Τερψιχόρη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Dance', meaning: 'Delight in dancing', sources: ['Hesiod', 'LSJ'] },
  { id: 'erato', ascii: 'erato', unicode: 'Erátō', greek: 'Ερατώ', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Love Poetry', meaning: 'Beloved, lovely', sources: ['Hesiod', 'LSJ'] },
  { id: 'melpomene', ascii: 'melpomene', unicode: 'Melpoménē', greek: 'Μελπομένη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Tragedy', meaning: 'Singer, chorus-leader', sources: ['Hesiod', 'LSJ'] },
  { id: 'ourania', ascii: 'ourania', unicode: 'Ouranía', greek: 'Οὐρανία', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Astronomy', meaning: 'Heavenly', sources: ['Hesiod', 'LSJ'] },
  
  // Fates (individual)
  { id: 'clotho', ascii: 'clotho', unicode: 'Klōthṓ', greek: 'Κλωθώ', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Spinner of Life Thread', meaning: 'Spinner', sources: ['Plato', 'LSJ'] },
  { id: 'lachesis', ascii: 'lachesis', unicode: 'Láchesis', greek: 'Λάχεσις', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Allotter of Portions', meaning: 'Disposer of lots', sources: ['Plato', 'LSJ'] },
  { id: 'atropos', ascii: 'atropos', unicode: 'Átropos', greek: 'Ἄτροπος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Cutter of Thread', meaning: 'Inflexible, inevitable', sources: ['Plato', 'LSJ'] },
  
  // Personifications
  { id: 'nemesis', ascii: 'nemesis', unicode: 'Némésis', greek: 'Νέμεσις', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Retribution', meaning: 'Distribution, righteous anger', sources: ['Hesiod', 'LSJ'] },
  { id: 'iris', ascii: 'iris', unicode: 'Íris', greek: 'Ἶρις', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Rainbow, Messenger', meaning: 'Rainbow', sources: ['Homer', 'LSJ'] },
  { id: 'eris', ascii: 'eris', unicode: 'Éris', greek: 'Ἔρις', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Strife, Discord', meaning: 'Strife', sources: ['Hesiod', 'LSJ'] },
  { id: 'hypnos', ascii: 'hypnos', unicode: 'Hýpnos', greek: 'Ὕπνος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Sleep', meaning: 'Sleep', sources: ['Hesiod', 'LSJ'] },
  { id: 'thanatos', ascii: 'thanatos', unicode: 'Thánatos', greek: 'Θάνατος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Death', meaning: 'Death', sources: ['Hesiod', 'LSJ'] },
  { id: 'phobos', ascii: 'phobos', unicode: 'Phóbos', greek: 'Φόβος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Fear, Panic', meaning: 'Fear', sources: ['Hesiod', 'LSJ'] },
  { id: 'deimos', ascii: 'deimos', unicode: 'Deîmos', greek: 'Δεῖμος', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Terror, Dread', meaning: 'Terror', sources: ['Hesiod', 'LSJ'] },
  { id: 'elpis', ascii: 'elpis', unicode: 'Elpís', greek: 'Ἐλπίς', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Hope', meaning: 'Hope, expectation', sources: ['Hesiod', 'LSJ'] },
  { id: 'ponos', ascii: 'ponos', unicode: 'Pónos', greek: 'Πόνος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Hard Labor, Toil', meaning: 'Toil, labor', sources: ['Hesiod', 'LSJ'] },
  { id: 'geras', ascii: 'geras', unicode: 'Gḗras', greek: 'Γῆρας', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Old Age', meaning: 'Old age', sources: ['Hesiod', 'LSJ'] },
  
  // Creatures
  { id: 'cerberus', ascii: 'cerberus', unicode: 'Kérberos', greek: 'Κέρβερος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Underworld Guardian', meaning: 'Spot, darkness', sources: ['Hesiod', 'Beekes'] },
  { id: 'hydra', ascii: 'hydra', unicode: 'Hýdra', greek: 'Ὕδρα', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Many-Headed Serpent', meaning: 'Water serpent', sources: ['Hesiod', 'LSJ'] },
  { id: 'minotauros', ascii: 'minotauros', unicode: 'Minṓtauros', greek: 'Μινώταυρος', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Beast of Crete', meaning: 'Bull of Minos', sources: ['Plutarch', 'LSJ'] },
  { id: 'chimaira', ascii: 'chimaira', unicode: 'Chímaira', greek: 'Χίμαιρα', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Fire-Breathing Monster', meaning: 'She-goat', sources: ['Hesiod', 'LSJ'] },
  { id: 'sphinx', ascii: 'sphinx', unicode: 'Sphínx', greek: 'Σφίγξ', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Riddling Monster', meaning: 'Strangler', sources: ['Sophocles', 'LSJ'] },
  { id: 'pegasus', ascii: 'pegasus', unicode: 'Pégasos', greek: 'Πήγασος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Winged Horse', meaning: 'From the spring', sources: ['Hesiod', 'LSJ'] },
  { id: 'seiren', ascii: 'seiren', unicode: 'Seirḗn', greek: 'Σειρήν', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Enchanting Singer', meaning: 'Binder, entangler', sources: ['Homer', 'LSJ'] },
  { id: 'harpyia', ascii: 'harpyia', unicode: 'Hárpyia', greek: 'Ἅρπυια', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Snatcher', meaning: 'Snatcher, robber', sources: ['Hesiod', 'LSJ'] },
  { id: 'phoenix', ascii: 'phoenix', unicode: 'Phoînix', greek: 'Φοῖνιξ', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Rebirth, Immortality', meaning: 'Purple-red, Phoenician', sources: ['Herodotus', 'LSJ'] },
  { id: 'griffin', ascii: 'griffin', unicode: 'Grýps', greek: 'Γρύψ', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Guardian Beast', meaning: 'Hooked-nose', sources: ['Aeschylus', 'LSJ'] },
  
  // Nymphs
  { id: 'daphne', ascii: 'daphne', unicode: 'Dáphnē', greek: 'Δάφνη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Laurel Nymph', meaning: 'Laurel', sources: ['Ovid', 'LSJ'] },
  { id: 'echo', ascii: 'echo', unicode: 'Ēchṓ', greek: 'Ἠχώ', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Sound, Reflection', meaning: 'Sound, echo', sources: ['Ovid', 'LSJ'] },
  
  // Philosophical concepts
  { id: 'logos', ascii: 'logos', unicode: 'Lógos', greek: 'Λόγος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Word, Reason, Principle', meaning: 'Word, speech, reason', sources: ['Heraclitus', 'LSJ'] },
  { id: 'nous', ascii: 'nous', unicode: 'Noûs', greek: 'Νοῦς', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Mind, Intellect', meaning: 'Mind, intellect', sources: ['Anaxagoras', 'LSJ'] },
  { id: 'psyche', ascii: 'psyche', unicode: 'Psychḗ', greek: 'Ψυχή', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Soul, Breath, Life', meaning: 'Soul, breath', sources: ['Plato', 'LSJ'] },
  { id: 'pneuma', ascii: 'pneuma', unicode: 'Pneûma', greek: 'Πνεῦμα', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Spirit, Wind, Breath', meaning: 'Wind, breath, spirit', sources: ['Stoics', 'LSJ'] },
  { id: 'arche', ascii: 'arche', unicode: 'Archḗ', greek: 'Ἀρχή', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Origin, First Principle', meaning: 'Beginning, origin, rule', sources: ['Anaximander', 'LSJ'] },
  { id: 'telos', ascii: 'telos', unicode: 'Télos', greek: 'Τέλος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'End, Purpose, Goal', meaning: 'End, completion, purpose', sources: ['Aristotle', 'LSJ'] },
  { id: 'arete', ascii: 'arete', unicode: 'Arete', greek: 'Ἀρετή', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Excellence, Virtue', meaning: 'Excellence, virtue', sources: ['Homer', 'LSJ'] },
  { id: 'hubris', ascii: 'hubris', unicode: 'Hýbris', greek: 'Ὕβρις', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Excess Pride, Insolence', meaning: 'Outrage, insolence', sources: ['Aeschylus', 'LSJ'] },
  { id: 'moira', ascii: 'moira', unicode: 'Moîra', greek: 'Μοῖρα', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Fate, Allotted Portion', meaning: 'Portion, fate', sources: ['Homer', 'LSJ'] },
  { id: 'ethos', ascii: 'ethos', unicode: 'Éthos', greek: 'Ἦθος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Character, Habit', meaning: 'Habit, custom, character', sources: ['Aristotle', 'LSJ'] },
  { id: 'pathos', ascii: 'pathos', unicode: 'Páthos', greek: 'Πάθος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Suffering, Experience', meaning: 'Suffering, experience', sources: ['Aristotle', 'LSJ'] },
  { id: 'kairos', ascii: 'kairos', unicode: 'Kairós', greek: 'Καιρός', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Opportune Moment', meaning: 'Right time, opportunity', sources: ['Aristotle', 'LSJ'] },
  { id: 'kosmos', ascii: 'kosmos', unicode: 'Kósmos', greek: 'Κόσμος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Order, Universe, Beauty', meaning: 'Order, ornament, world', sources: ['Pythagoras', 'LSJ'] },
  
  // ==========================================
  // NORSE EXPANSION (~30 entries)
  // ==========================================
  
  { id: 'ullr', ascii: 'ullr', unicode: 'Ullr', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Archery, Hunting, Skiing', meaning: 'Glory, splendor', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'forseti', ascii: 'forseti', unicode: 'Forseti', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Justice, Mediation', meaning: 'President, chairman', sources: ['Prose Edda', 'Cleasby-Vigfusson'] },
  { id: 'bragi', ascii: 'bragi', unicode: 'Bragi', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Poetry, Eloquence', meaning: 'Poet, first', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'iounn', ascii: 'iounn', unicode: 'Iðunn', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Youth, Apples of Immortality', meaning: 'Ever young', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'gefjon', ascii: 'gefjon', unicode: 'Gefjun', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Fertility, Agriculture', meaning: 'Giving', sources: ['Prose Edda', 'Cleasby-Vigfusson'] },
  { id: 'sif', ascii: 'sif', unicode: 'Sif', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Earth, Harvest', meaning: 'Relation by marriage', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'fulla', ascii: 'fulla', unicode: 'Fulla', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Abundance, Secrets', meaning: 'Bountiful', sources: ['Prose Edda', 'Cleasby-Vigfusson'] },
  { id: 'syn', ascii: 'syn', unicode: 'Syn', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Refusal, Defense', meaning: 'Refusal, denial', sources: ['Prose Edda', 'Cleasby-Vigfusson'] },
  { id: 'nanna', ascii: 'nanna', unicode: 'Nanna', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Joy, Wife of Baldr', meaning: 'Mother, daring', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  
  // Valkyries
  { id: 'brynhildr', ascii: 'brynhildr', unicode: 'Brynhildr', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Valkyrie, Shieldmaiden', meaning: 'Armor battle', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'gunnr', ascii: 'gunnr', unicode: 'Gunnr', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Valkyrie of War', meaning: 'War', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'skuld', ascii: 'skuld', unicode: 'Skuld', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Valkyrie / Norn of Future', meaning: 'Debt, future', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'urdr', ascii: 'urdr', unicode: 'Urðr', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Norn of Fate / Past', meaning: 'Fate', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'verdandi', ascii: 'verdandi', unicode: 'Verðandi', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Norn of Present', meaning: 'Becoming', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  
  // Giants
  { id: 'thrymr', ascii: 'thrymr', unicode: 'Þrymr', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Giant King', meaning: 'Noise, din', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'hymir', ascii: 'hymir', unicode: 'Hymir', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Giant, Owner of Cauldron', meaning: 'Dark one', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'geirrodr', ascii: 'geirrodr', unicode: 'Geirröðr', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Giant, Tormentor of Loki', meaning: 'Spear-reddener', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'baugi', ascii: 'baugi', unicode: 'Baugi', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Giant, Brother of Suttungr', meaning: 'Ring-shaped', sources: ['Prose Edda', 'Cleasby-Vigfusson'] },
  
  // Dwarves
  { id: 'andvari', ascii: 'andvari', unicode: 'Andvari', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Dwarf, Guardian of Gold', meaning: 'Careful one', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'brokkr', ascii: 'brokkr', unicode: 'Brokkr', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Dwarf Smith', meaning: 'Badger, panting', sources: ['Prose Edda', 'Cleasby-Vigfusson'] },
  { id: 'fafnir', ascii: 'fafnir', unicode: 'Fáfnir', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Dwarf turned Dragon', meaning: 'The embracer', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'reginn', ascii: 'reginn', unicode: 'Reginn', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Dwarf Smith, Fafnir\'s Brother', meaning: 'The great one', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'sindri', ascii: 'sindri', unicode: 'Sindri', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Dwarf Smith', meaning: 'Sparkling', sources: ['Prose Edda', 'Cleasby-Vigfusson'] },
  
  // Places & Concepts
  { id: 'niflheimr', ascii: 'niflheimr', unicode: 'Niflheimr', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Mist World, Realm of Ice', meaning: 'Mist-home', sources: ['Prose Edda', 'Cleasby-Vigfusson'] },
  { id: 'muspellheimr', ascii: 'muspellheimr', unicode: 'Muspellheimr', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'World of Fire', meaning: 'Muspel-home (world-ender)', sources: ['Prose Edda', 'Cleasby-Vigfusson'] },
  { id: 'vanaheimr', ascii: 'vanaheimr', unicode: 'Vanaheimr', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Home of the Vanir', meaning: 'Van-home', sources: ['Prose Edda', 'Cleasby-Vigfusson'] },
  { id: 'svartalfaheimr', ascii: 'svartalfaheimr', unicode: 'Svartálfaheimr', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Home of Dark Elves', meaning: 'Dark-elf-home', sources: ['Prose Edda', 'Cleasby-Vigfusson'] },
  { id: 'yggdrasill', ascii: 'yggdrasill', unicode: 'Yggdrasill', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'World Tree', meaning: 'Ygg\'s horse (Odin\'s gallows)', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'ginnungagap', ascii: 'ginnungagap', unicode: 'Ginnungagap', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Primordial Void', meaning: 'Magic-gaping-void', sources: ['Prose Edda', 'Cleasby-Vigfusson'] },
  { id: 'wyrd', ascii: 'wyrd', unicode: 'Wyrd', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Fate, Destiny', meaning: 'Fate (cognate with Urðr)', sources: ['Beowulf', 'Bosworth-Toller'] },
  
  // ==========================================
  // EGYPTIAN EXPANSION (~15 entries)
  // ==========================================
  
  { id: 'min', ascii: 'min', unicode: 'Mnw', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Fertility, Harvest', meaning: 'The firm one', sources: ['Faulkner', 'Wb'] },
  { id: 'bes', ascii: 'bes', unicode: 'Bs', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Protection, Childbirth, Joy', meaning: 'The protector', sources: ['Faulkner', 'Wb'] },
  { id: 'heka', ascii: 'heka', unicode: 'Ḥkꜣ', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Magic, Medicine', meaning: 'Magic, first work', sources: ['Faulkner', 'Wb'] },
  { id: 'nephthys', ascii: 'nephthys', unicode: 'Nbt-ḥwt', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Protection, Death, Mourning', meaning: 'Lady of the mansion', sources: ['Faulkner', 'Wb'] },
  { id: 'taweret', ascii: 'taweret', unicode: 'Tꜣ-wrt', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Childbirth, Protection', meaning: 'The great one', sources: ['Faulkner', 'Wb'] },
  { id: 'khepri', ascii: 'khepri', unicode: 'Ḫprj', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Sunrise, Rebirth', meaning: 'The becoming one', sources: ['Faulkner', 'Wb'] },
  { id: 'wepwawet', ascii: 'wepwawet', unicode: 'Wp-wꜣwt', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'War, Opening the Way', meaning: 'Opener of the ways', sources: ['Faulkner', 'Wb'] },
  { id: 'duat', ascii: 'duat', unicode: 'Dwꜣt', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Underworld Realm', meaning: 'The netherworld', sources: ['Faulkner', 'Wb'] },
  { id: 'aaru', ascii: 'aaru', unicode: 'Ꜥꜣrw', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Field of Reeds, Paradise', meaning: 'Reeds', sources: ['Faulkner', 'Wb'] },
  { id: 'nun', ascii: 'nun', unicode: 'Nnw', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Primordial Waters', meaning: 'The inert one, waters', sources: ['Faulkner', 'Wb'] },
  { id: 'maatka', ascii: 'maatka', unicode: 'Mꜣꜥtkꜣ', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Truth and Spirit', meaning: 'Truth of the soul', sources: ['Faulkner', 'Wb'] },
  { id: 'renenutet', ascii: 'renenutet', unicode: 'Rnnwtt', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Nursing, Harvest', meaning: 'The nursing snake', sources: ['Faulkner', 'Wb'] },
  { id: 'mehetweret', ascii: 'mehetweret', unicode: 'Mḥt-wrt', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Great Flood, Cow Goddess', meaning: 'The great flood', sources: ['Faulkner', 'Wb'] },
  { id: 'henkhisesui', ascii: 'henkhisesui', unicode: 'Ḥnḫ-sšwj', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Placenta, Protection', meaning: 'The two placentas', sources: ['Faulkner', 'Wb'] },
  { id: 'heqet', ascii: 'heqet', unicode: 'Ḥqt', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Fertility, Childbirth', meaning: 'The frog', sources: ['Faulkner', 'Wb'] },
  
  // ==========================================
  // MESOPOTAMIAN EXPANSION (~15 entries)
  // ==========================================
  
  { id: 'anu', ascii: 'anu', unicode: 'Anu', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Sky, King of Gods', meaning: 'Heaven, sky', sources: ['ETCSL', 'Black-Green'] },
  { id: 'inanna', ascii: 'inanna', unicode: 'Inanna', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Love, War, Venus', meaning: 'Lady of heaven', sources: ['ETCSL', 'Black-Green'] },
  { id: 'nanna', ascii: 'nanna', unicode: 'Nanna', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Moon', meaning: 'The luminous one', sources: ['ETCSL', 'Black-Green'] },
  { id: 'ninhursag', ascii: 'ninhursag', unicode: 'Ninḫursaĝ', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Mother Goddess, Mountains', meaning: 'Lady of the mountain', sources: ['ETCSL', 'Black-Green'] },
  { id: 'ninlil', ascii: 'ninlil', unicode: 'Ninlil', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Wind, Air', meaning: 'Lady of the wind', sources: ['ETCSL', 'Black-Green'] },
  { id: 'nergal', ascii: 'nergal', unicode: 'Nergal', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Underworld, War, Plague', meaning: 'Lord of the great city', sources: ['ETCSL', 'Black-Green'] },
  { id: 'ereshkigal', ascii: 'ereshkigal', unicode: 'Ereškigal', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Queen of the Underworld', meaning: 'Lady of the great earth', sources: ['ETCSL', 'Black-Green'] },
  { id: 'tiamat', ascii: 'tiamat', unicode: 'Tiāmat', greek: '—', pantheon: 'mesopotamian', tier: '1', tierLabel: 'Tier 1', domain: 'Salt Water, Chaos', meaning: 'Sea', sources: ['Enuma Elish', 'Black-Green'] },
  { id: 'apsu', ascii: 'apsu', unicode: 'Abzu', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Fresh Water, Abyss', meaning: 'Abyss', sources: ['Enuma Elish', 'Black-Green'] },
  { id: 'dumuzid', ascii: 'dumuzid', unicode: 'Dumuzid', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Shepherds, Vegetation', meaning: 'Faithful son', sources: ['ETCSL', 'Black-Green'] },
  { id: 'gilgamesh', ascii: 'gilgamesh', unicode: 'Gilgameš', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Hero, King of Uruk', meaning: 'The old man became young', sources: ['Epic of Gilgamesh', 'Black-Green'] },
  { id: 'enkidu', ascii: 'enkidu', unicode: 'Enkidu', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Wild Man, Hero', meaning: 'Lord of the pleasant place', sources: ['Epic of Gilgamesh', 'Black-Green'] },
  { id: 'pazuzu', ascii: 'pazuzu', unicode: 'Pazuzu', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Wind Demon, Protection', meaning: 'Unknown', sources: ['Black-Green', 'Wiggermann'] },
  { id: 'ninurta', ascii: 'ninurta', unicode: 'Ninurta', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'War, Agriculture, Storms', meaning: 'Lord of the earth', sources: ['ETCSL', 'Black-Green'] },
  { id: 'humbaba', ascii: 'humbaba', unicode: 'Ḫumbaba', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Monster of Cedar Forest', meaning: 'Unknown', sources: ['Epic of Gilgamesh', 'Black-Green'] },
  
  // ==========================================
  // HINDU/SANSKRIT EXPANSION (~25 entries)
  // ==========================================
  
  { id: 'kartikeya', ascii: 'kartikeya', unicode: 'Kārtikeya', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'War, Commander of Gods', meaning: 'Son of Krittika', sources: ['MW', 'RV'] },
  { id: 'radha', ascii: 'radha', unicode: 'Rādhā', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Divine Love, Consort of Krishna', meaning: 'Success, prosperity', sources: ['MW', 'Bhagavata'] },
  { id: 'sati', ascii: 'sati', unicode: 'Satī', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Marital Fidelity, First Wife of Shiva', meaning: 'True, virtuous', sources: ['MW', 'Shiva Purana'] },
  { id: 'ushas', ascii: 'ushas', unicode: 'Uṣás', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Dawn', meaning: 'Dawn', sources: ['RV', 'MW'] },
  { id: 'ratri', ascii: 'ratri', unicode: 'Rātrī', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Night', meaning: 'Night', sources: ['RV', 'MW'] },
  { id: 'prithvi', ascii: 'prithvi', unicode: 'Pṛthivī', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Earth', meaning: 'The broad one', sources: ['RV', 'MW'] },
  { id: 'aditi', ascii: 'aditi', unicode: 'Aditi', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Infinity, Freedom, Mother of Gods', meaning: 'Boundless', sources: ['RV', 'MW'] },
  { id: 'diti', ascii: 'diti', unicode: 'Diti', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Mother of Demons', meaning: 'Distributing, splitting', sources: ['RV', 'MW'] },
  { id: 'dharma', ascii: 'dharma', unicode: 'Dharma', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Law, Duty, Righteousness', meaning: 'That which holds', sources: ['MW', 'Manusmriti'] },
  { id: 'karma', ascii: 'karma', unicode: 'Karma', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Action, Consequence', meaning: 'Deed, action', sources: ['MW', 'Bhagavad Gita'] },
  { id: 'moksha', ascii: 'moksha', unicode: 'Mokṣa', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Liberation, Release', meaning: 'Release, liberation', sources: ['MW', 'Upanishads'] },
  { id: 'samsara', ascii: 'samsara', unicode: 'Saṃsāra', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Cycle of Rebirth', meaning: 'Wandering through', sources: ['MW', 'Upanishads'] },
  { id: 'atman', ascii: 'atman', unicode: 'Ātman', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Self, Soul', meaning: 'Breath, self', sources: ['MW', 'Upanishads'] },
  { id: 'brahman', ascii: 'brahman', unicode: 'Brahman', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Ultimate Reality', meaning: 'Growth, expansion', sources: ['MW', 'Upanishads'] },
  { id: 'maya', ascii: 'maya', unicode: 'Māyā', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Illusion, Magic', meaning: 'That which is measured', sources: ['MW', 'Upanishads'] },
  { id: 'yoga', ascii: 'yoga', unicode: 'Yoga', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Union, Discipline', meaning: 'Yoke, union', sources: ['MW', 'Yoga Sutras'] },
  { id: 'mantra', ascii: 'mantra', unicode: 'Mantra', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Sacred Formula', meaning: 'Instrument of thought', sources: ['MW', 'RV'] },
  { id: 'tantra', ascii: 'tantra', unicode: 'Tantra', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Weaving, Esoteric System', meaning: 'Loom, warp', sources: ['MW', 'Tantric texts'] },
  { id: 'om', ascii: 'om', unicode: 'Oṃ', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Sacred Syllable, Cosmic Sound', meaning: 'The primordial sound', sources: ['MW', 'Upanishads'] },
  { id: 'vyasa', ascii: 'vyasa', unicode: 'Vyāsa', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Sage, Compiler of Vedas', meaning: 'The arranger', sources: ['MW', 'Mahabharata'] },
  { id: 'valmiki', ascii: 'valmiki', unicode: 'Vālmīki', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Sage, Author of Ramayana', meaning: 'Born of an anthill', sources: ['MW', 'Ramayana'] },
  { id: 'kashyapa', ascii: 'kashyapa', unicode: 'Kaśyapa', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Sage, Progenitor', meaning: 'Tortoise', sources: ['MW', 'Puranas'] },
  { id: 'vashistha', ascii: 'vashistha', unicode: 'Vasiṣṭha', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Royal Sage', meaning: 'The most excellent', sources: ['MW', 'RV'] },
  { id: 'matsya', ascii: 'matsya', unicode: 'Matsya', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Fish Avatar of Vishnu', meaning: 'Fish', sources: ['MW', 'Bhagavata'] },
  { id: 'narasimha', ascii: 'narasimha', unicode: 'Narasiṃha', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Man-Lion Avatar', meaning: 'Man-lion', sources: ['MW', 'Bhagavata'] },
  
  // ==========================================
  // CELTIC EXPANSION (~20 entries)
  // ==========================================
  
  { id: 'nuada', ascii: 'nuada', unicode: 'Nuada', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'War, King of Tuatha', meaning: 'Cloud-maker, hunter', sources: ['Lebor Gabála', 'MacKillop'] },
  { id: 'dian-cecht', ascii: 'dian-cecht', unicode: 'Dían-Cécht', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Healing, Medicine', meaning: 'Swift power', sources: ['Lebor Gabála', 'MacKillop'] },
  { id: 'aengus', ascii: 'aengus', unicode: 'Aengus', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Love, Youth, Poetry', meaning: 'One vigor, true strength', sources: ['Lebor Gabála', 'MacKillop'] },
  { id: 'badb', ascii: 'badb', unicode: 'Badb', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Battle, Death, Crow', meaning: 'Crow, scald-crow', sources: ['Táin Bó Cúailnge', 'MacKillop'] },
  { id: 'macha', ascii: 'macha', unicode: 'Macha', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'War, Sovereignty, Horses', meaning: 'Field, plain', sources: ['Táin Bó Cúailnge', 'MacKillop'] },
  { id: 'danu', ascii: 'danu', unicode: 'Danu', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Mother Goddess, Rivers', meaning: 'Knowledge, wisdom', sources: ['Lebor Gabála', 'MacKillop'] },
  { id: 'cuchulainn', ascii: 'cuchulainn', unicode: 'CúChulainn', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Hero, Hound of Culann', meaning: 'Culann\'s hound', sources: ['Táin Bó Cúailnge', 'MacKillop'] },
  { id: 'fionn', ascii: 'fionn', unicode: 'Fionn', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Hunter, Seer, Leader', meaning: 'Fair, white', sources: ['Acallam na Senórach', 'MacKillop'] },
  { id: 'ogma', ascii: 'ogma', unicode: 'Ogma', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Eloquence, Writing', meaning: 'The grim one', sources: ['Lebor Gabála', 'MacKillop'] },
  { id: 'arawn', ascii: 'arawn', unicode: 'Arawn', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Otherworld, Annwn', meaning: 'Silver-tongued', sources: ['Mabinogion', 'MacKillop'] },
  { id: 'gwydion', ascii: 'gwydion', unicode: 'Gwydion', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Magic, Poetry, Trickery', meaning: 'Born of trees', sources: ['Mabinogion', 'MacKillop'] },
  { id: 'rhiannon', ascii: 'rhiannon', unicode: 'Rhiannon', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Horses, Sovereignty', meaning: 'Great queen', sources: ['Mabinogion', 'MacKillop'] },
  { id: 'pryderi', ascii: 'pryderi', unicode: 'Pryderi', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Son of Pwyll, King', meaning: 'Care, anxiety', sources: ['Mabinogion', 'MacKillop'] },
  { id: 'ceridwen', ascii: 'ceridwen', unicode: 'Ceridwen', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Inspiration, Transformation', meaning: 'Bent or crooked woman', sources: ['Mabinogion', 'MacKillop'] },
  { id: 'tirnanog', ascii: 'tirnanog', unicode: 'TírnanÓg', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Land of the Young, Otherworld', meaning: 'Land of the young', sources: ['Acallam na Senórach', 'MacKillop'] },
  { id: 'annwn', ascii: 'annwn', unicode: 'Annwn', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Otherworld, Underworld', meaning: 'The deep, the abyss', sources: ['Mabinogion', 'MacKillop'] },
  { id: 'pooka', ascii: 'pooka', unicode: 'Púca', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Shapeshifter, Trickster', meaning: 'Goblin, sprite', sources: ['Folklore', 'MacKillop'] },
  { id: 'banshee', ascii: 'banshee', unicode: 'Banshí', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Death, Lamentation', meaning: 'Woman of the fairy mound', sources: ['Folklore', 'MacKillop'] },
  { id: 'eachuisge', ascii: 'eachuisge', unicode: 'Eachuisge', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Water Horse, Drowner', meaning: 'Water horse', sources: ['Folklore', 'MacKillop'] },
  { id: 'leprechaun', ascii: 'leprechaun', unicode: 'Leprechán', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Mischief, Gold', meaning: 'Little body', sources: ['Folklore', 'MacKillop'] },
  
  // ==========================================
  // JAPANESE EXPANSION (~15 entries)
  // ==========================================
  
  { id: 'izanami', ascii: 'izanami', unicode: 'Izanami', greek: '伊邪那美', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Creation, Death, Earth', meaning: 'She-who-invites', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'ninigi', ascii: 'ninigi', unicode: 'Ninigi', greek: '邇邇芸命', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Rice, Descendant of Amaterasu', meaning: 'The august rice spirit', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'raijin', ascii: 'raijin', unicode: 'Raijin', greek: '雷神', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Thunder, Lightning', meaning: 'Thunder god', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'fujin', ascii: 'fujin', unicode: 'Fūjin', greek: '風神', pantheon: 'japanese', tier: '1', tierLabel: 'Tier 1', domain: 'Wind', meaning: 'Wind god', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'kannon', ascii: 'kannon', unicode: 'Kannon', greek: '観音', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Compassion, Mercy', meaning: 'Perceiver of sounds', sources: ['Lotus Sutra', 'Buddhist texts'] },
  { id: 'jizo', ascii: 'jizo', unicode: 'Jizō', greek: '地蔵', pantheon: 'japanese', tier: '1', tierLabel: 'Tier 1', domain: 'Protection of Children, Travelers', meaning: 'Earth treasury', sources: ['Buddhist texts', 'Japanese folklore'] },
  { id: 'amida', ascii: 'amida', unicode: 'Amida', greek: '阿弥陀', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Infinite Light, Pure Land', meaning: 'Immeasurable light', sources: ['Buddhist texts', 'Lotus Sutra'] },
  { id: 'fuji', ascii: 'fuji', unicode: 'Fuji', greek: '富士', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Sacred Mountain', meaning: 'Wealthy warrior', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'ise', ascii: 'ise', unicode: 'Ise', greek: '伊勢', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Sacred Shrine', meaning: 'Ancient province', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'takachiho', ascii: 'takachiho', unicode: 'Takachiho', greek: '高千穂', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Sacred Gorge, Descent of Gods', meaning: 'High thousand ears', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'kumano', ascii: 'kumano', unicode: 'Kumano', greek: '熊野', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Sacred Region, Three Shrines', meaning: 'Bear plain', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'ebisu', ascii: 'ebisu', unicode: 'Ebisu', greek: '恵比寿', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Fishermen, Commerce, Luck', meaning: 'The foreigner, straggler', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'okuninushi', ascii: 'okuninushi', unicode: 'Ōkuninushi', greek: '大国主', pantheon: 'japanese', tier: '1', tierLabel: 'Tier 1', domain: 'Nation-building, Marriage', meaning: 'Great land master', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'sarutahiko', ascii: 'sarutahiko', unicode: 'Sarutahiko', greek: '猿田彦', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Crossroads, Guidance', meaning: 'Monkey-field prince', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'kagutsuchi', ascii: 'kagutsuchi', unicode: 'Kagutsuchi', greek: '迦具土', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Fire, Volcanoes', meaning: 'The burning force', sources: ['Kojiki', 'Nihon Shoki'] },
  
  // ==========================================
  // POLYNESIAN EXPANSION (~15 entries)
  // ==========================================
  
  { id: 'kane', ascii: 'kane', unicode: 'Kāne', greek: '—', pantheon: 'polynesian', tier: '1', tierLabel: 'Tier 1', domain: 'Creator, Light, Life', meaning: 'Man, male', sources: ['Beckwith', 'Malo'] },
  { id: 'kanaloa', ascii: 'kanaloa', unicode: 'Kānāloa', greek: '—', pantheon: 'polynesian', tier: '1', tierLabel: 'Tier 1', domain: 'Ocean, Underworld', meaning: 'The great expanse', sources: ['Beckwith', 'Malo'] },
  { id: 'lono', ascii: 'lono', unicode: 'Lono', greek: '—', pantheon: 'polynesian', tier: '2', tierLabel: 'Tier 2', domain: 'Agriculture, Peace, Rain', meaning: 'News, report', sources: ['Beckwith', 'Malo'] },
  { id: 'ku', ascii: 'ku', unicode: 'Kū', greek: '—', pantheon: 'polynesian', tier: '1', tierLabel: 'Tier 1', domain: 'War, Forests, Fishing', meaning: 'Upright, erect', sources: ['Beckwith', 'Malo'] },
  { id: 'hi-iaka', ascii: 'hi-iaka', unicode: 'Hiiaka', greek: '—', pantheon: 'polynesian', tier: '2', tierLabel: 'Tier 2', domain: 'Hula, Magic, Healing', meaning: 'Carrying the egg', sources: ['Beckwith', 'Hooulumahiehie'] },
  { id: 'kamapuaa', ascii: 'kamapuaa', unicode: 'Kamapuaa', greek: '—', pantheon: 'polynesian', tier: '2', tierLabel: 'Tier 2', domain: 'Pig God, Agriculture', meaning: 'The pig child', sources: ['Beckwith', 'Malo'] },
  { id: 'poliahu', ascii: 'poliahu', unicode: 'Poliahu', greek: '—', pantheon: 'polynesian', tier: '2', tierLabel: 'Tier 2', domain: 'Snow, Mauna Kea', meaning: 'Cloaked bosom', sources: ['Beckwith', 'Malo'] },
  { id: 'tawhirimatea', ascii: 'tawhirimatea', unicode: 'Tāwhirimātea', greek: '—', pantheon: 'polynesian', tier: '1', tierLabel: 'Tier 1', domain: 'Storms, Wind', meaning: 'Tāwhiri of the seas', sources: ['Grey', 'Best'] },
  { id: 'haumiatiketike', ascii: 'haumiatiketike', unicode: 'Haumiatiketike', greek: '—', pantheon: 'polynesian', tier: '2', tierLabel: 'Tier 2', domain: 'Wild Food, Fernroot', meaning: 'Haumia tied to the earth', sources: ['Grey', 'Best'] },
  { id: 'ruaumoko', ascii: 'ruaumoko', unicode: 'Rūaumoko', greek: '—', pantheon: 'polynesian', tier: '2', tierLabel: 'Tier 2', domain: 'Earthquakes, Volcanoes', meaning: 'Rūa of the earthquakes', sources: ['Grey', 'Best'] },
  { id: 'whiro', ascii: 'whiro', unicode: 'Whiro', greek: '—', pantheon: 'polynesian', tier: '2', tierLabel: 'Tier 2', domain: 'Darkness, Evil', meaning: 'The lizard of death', sources: ['Grey', 'Best'] },
  { id: 'taaroa', ascii: 'taaroa', unicode: 'Taaroa', greek: '—', pantheon: 'polynesian', tier: '2', tierLabel: 'Tier 2', domain: 'Creator, Supreme Being', meaning: 'The distant one', sources: ['Henry', 'Handy'] },
  { id: 'tagaloa', ascii: 'tagaloa', unicode: 'Tagaloa', greek: '—', pantheon: 'polynesian', tier: '2', tierLabel: 'Tier 2', domain: 'Creator, Ocean', meaning: 'The lord', sources: ['Kramer', 'Moyle'] },
  { id: 'nafanua', ascii: 'nafanua', unicode: 'Nafanua', greek: '—', pantheon: 'polynesian', tier: '2', tierLabel: 'Tier 2', domain: 'War, Prophecy, Salvation', meaning: 'Hidden in the earth', sources: ['Kramer', 'Moyle'] },
  { id: 'makemake', ascii: 'makemake', unicode: 'MakeMake', greek: '—', pantheon: 'polynesian', tier: '2', tierLabel: 'Tier 2', domain: 'Creator, Fertility, Bird-Man', meaning: 'To see, to know', sources: ['Métraux', 'Fedorova'] },
  
  // ==========================================
  // SLAVIC EXPANSION (~15 entries)
  // ==========================================
  
  { id: 'svarog', ascii: 'svarog', unicode: 'Svarog', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Sky, Fire, Smithing', meaning: 'Bright, clear', sources: ['Primary Chronicle', 'Ivanov-Toporov'] },
  { id: 'stribog', ascii: 'stribog', unicode: 'Stribog', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Winds, Storms', meaning: 'Father of winds', sources: ['Primary Chronicle', 'Ivanov-Toporov'] },
  { id: 'simargl', ascii: 'simargl', unicode: 'Simargl', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Winged Guardian, Plant Life', meaning: 'From Simurgh (Iranian)', sources: ['Primary Chronicle', 'Ivanov-Toporov'] },
  { id: 'mokosh', ascii: 'mokosh', unicode: 'Mokoš', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Weaving, Childbirth, Fate', meaning: 'Wet, moist', sources: ['Primary Chronicle', 'Ivanov-Toporov'] },
  { id: 'lada', ascii: 'lada', unicode: 'Lada', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Love, Beauty, Spring', meaning: 'Lady, order', sources: ['Folklore', 'Ivanov-Toporov'] },
  { id: 'marzanna', ascii: 'marzanna', unicode: 'Marzanna', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Winter, Death, Rebirth', meaning: 'Death goddess', sources: ['Folklore', 'Ivanov-Toporov'] },
  { id: 'morana', ascii: 'morana', unicode: 'Morana', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Winter, Death', meaning: 'Death', sources: ['Folklore', 'Ivanov-Toporov'] },
  { id: 'matzemlya', ascii: 'matzemlya', unicode: 'MatZemlyá', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Earth Mother', meaning: 'Mother Earth', sources: ['Folklore', 'Ivanov-Toporov'] },
  { id: 'leshy', ascii: 'leshy', unicode: 'Léshy', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Forest Spirit', meaning: 'Of the forest', sources: ['Folklore', 'Ivanov-Toporov'] },
  { id: 'domovoi', ascii: 'domovoi', unicode: 'Domovój', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Household Spirit', meaning: 'Of the house', sources: ['Folklore', 'Ivanov-Toporov'] },
  { id: 'vodyanoy', ascii: 'vodyanoy', unicode: 'Vodjanój', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Water Spirit, Drowner', meaning: 'Of the water', sources: ['Folklore', 'Ivanov-Toporov'] },
  { id: 'rusalka', ascii: 'rusalka', unicode: 'Rusálka', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Water Nymph, Drowned Maiden', meaning: 'Of Rus', sources: ['Folklore', 'Ivanov-Toporov'] },
  { id: 'baba-yaga', ascii: 'baba-yaga', unicode: 'Baba-Jagá', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Forest Witch, Death', meaning: 'Evil woman, serpent', sources: ['Folklore', 'Ivanov-Toporov'] },
  { id: 'kikimora', ascii: 'kikimora', unicode: 'Kikimóra', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'House Spirit, Swamp Hag', meaning: 'Unknown', sources: ['Folklore', 'Ivanov-Toporov'] },
  { id: 'zmey-gorynych', ascii: 'zmey-gorynych', unicode: 'ZmeyGorynych', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Three-Headed Dragon', meaning: 'Mountain dragon', sources: ['Byliny', 'Ivanov-Toporov'] },
  
  // ==========================================
  // NAHUATL EXPANSION (~15 entries)
  // ==========================================
  
  { id: 'ometecuhtli', ascii: 'ometecuhtli', unicode: 'Ōmetēcuhtli', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Lord of Duality', meaning: 'Two lord', sources: ['Florentine Codex', 'Sahagún'] },
  { id: 'omecihuatl', ascii: 'omecihuatl', unicode: 'Ōmecihuātl', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Lady of Duality', meaning: 'Two lady', sources: ['Florentine Codex', 'Sahagún'] },
  { id: 'tonacatecuhtli', ascii: 'tonacatecuhtli', unicode: 'Tonacatēcuhtli', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Lord of Sustenance', meaning: 'Lord of our food', sources: ['Florentine Codex', 'Sahagún'] },
  { id: 'chalchiuhtlicue', ascii: 'chalchiuhtlicue', unicode: 'Chālchiuhtlīcue', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Water, Rivers, Lakes', meaning: 'She of the jade skirt', sources: ['Florentine Codex', 'Sahagún'] },
  { id: 'mayahuel', ascii: 'mayahuel', unicode: 'Mayāhuel', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Maguey, Pulque', meaning: 'She of the maguey', sources: ['Florentine Codex', 'Sahagún'] },
  { id: 'xochipilli', ascii: 'xochipilli', unicode: 'Xōchipilli', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Flowers, Love, Beauty', meaning: 'Flower prince', sources: ['Florentine Codex', 'Sahagún'] },
  { id: 'centeotl', ascii: 'centeotl', unicode: 'Centeōtl', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Maize, Agriculture', meaning: 'Maize deity', sources: ['Florentine Codex', 'Sahagún'] },
  { id: 'xolotl', ascii: 'xolotl', unicode: 'Xōlōtl', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Evening Star, Death, Twins', meaning: 'The double, the monster', sources: ['Florentine Codex', 'Sahagún'] },
  { id: 'mictlantecuhtli', ascii: 'mictlantecuhtli', unicode: 'Mictlāntēcuhtli', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Lord of Mictlan', meaning: 'Lord of the underworld', sources: ['Florentine Codex', 'Sahagún'] },
  { id: 'mictecacihuatl', ascii: 'mictecacihuatl', unicode: 'Mictēcacihuātl', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Lady of Mictlan', meaning: 'Lady of the underworld', sources: ['Florentine Codex', 'Sahagún'] },
  { id: 'ehecatl', ascii: 'ehecatl', unicode: 'Ehēcatl', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Wind', meaning: 'Wind', sources: ['Florentine Codex', 'Sahagún'] },
  { id: 'itzpapalotl', ascii: 'itzpapalotl', unicode: 'Itzpapālōtl', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Obsidian Butterfly, Stars', meaning: 'Obsidian butterfly', sources: ['Florentine Codex', 'Sahagún'] },
  { id: 'ometeotl', ascii: 'ometeotl', unicode: 'Ōmeteōtl', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Supreme Duality', meaning: 'Two divinity', sources: ['Florentine Codex', 'Sahagún'] },
  { id: 'citlalicue', ascii: 'citlalicue', unicode: 'Citlālicue', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Milky Way, Stars', meaning: 'Star-skirted', sources: ['Florentine Codex', 'Sahagún'] },
  { id: 'tlaltecuhtli', ascii: 'tlaltecuhtli', unicode: 'Tlāltēcuhtli', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Earth', meaning: 'Lord of the earth', sources: ['Florentine Codex', 'Sahagún'] },
  
  // ==========================================
  // YORUBA EXPANSION (~10 entries)
  // ==========================================
  
  { id: 'orunmila', ascii: 'orunmila', unicode: 'Ọrúnmìlà', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Wisdom, Divination, Ifá', meaning: 'Heaven knows who will succeed', sources: ['Bascom', 'Idowu'] },
  { id: 'ochosi', ascii: 'ochosi', unicode: 'Ọṣọọsì', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Hunting, Justice', meaning: 'The sorcerer of the forest', sources: ['Bascom', 'Idowu'] },
  { id: 'osanyin', ascii: 'osanyin', unicode: 'Ọsanyìn', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Herbal Medicine, Small Plants', meaning: 'The sorcerer of herbs', sources: ['Bascom', 'Idowu'] },
  { id: 'olokun', ascii: 'olokun', unicode: 'Olókun', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Wealth, Ocean, Depths', meaning: 'Owner of the ocean', sources: ['Bascom', 'Idowu'] },
  { id: 'aganju', ascii: 'aganju', unicode: 'Aganjú', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Volcanoes, Wilderness', meaning: 'The uninhabited place', sources: ['Bascom', 'Idowu'] },
  { id: 'babaluaye', ascii: 'babaluaye', unicode: 'Babalúayé', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Disease, Healing, Earth', meaning: 'Father of the world', sources: ['Bascom', 'Idowu'] },
  { id: 'osumare', ascii: 'osumare', unicode: 'Ọṣumàrè', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Rainbow, Regeneration', meaning: 'The rainbow serpent', sources: ['Bascom', 'Idowu'] },
  { id: 'aje', ascii: 'aje', unicode: 'Ajé', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Wealth, Trade', meaning: 'Wealth', sources: ['Bascom', 'Idowu'] },
  { id: 'ibeji', ascii: 'ibeji', unicode: 'Ìbejì', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Twins, Joy, Abundance', meaning: 'The twins', sources: ['Bascom', 'Idowu'] },
  { id: 'orishaoko', ascii: 'orishaoko', unicode: 'Ọ̀rìṣàoko', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Agriculture, Harvest', meaning: 'Orisha of the farm', sources: ['Bascom', 'Idowu'] },
  
  // ==========================================
  // ABORIGINAL (~12 entries)
  // ==========================================
  
  { id: 'baiame', ascii: 'baiame', unicode: 'Baiame', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Sky Father, Creator', meaning: 'The maker', sources: ['AIATSIS', 'Parker'] },
  { id: 'bunjil', ascii: 'bunjil', unicode: 'Bunjil', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Creator Eaglehawk', meaning: 'The eaglehawk', sources: ['AIATSIS', 'Massola'] },
  { id: 'daramulum', ascii: 'daramulum', unicode: 'Daramulum', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Sky Hero, Son of Baiame', meaning: 'The one-legged', sources: ['AIATSIS', 'Parker'] },
  { id: 'altjira', ascii: 'altjira', unicode: 'Altjira', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'The Dreaming, Eternal', meaning: 'The dreamtime', sources: ['AIATSIS', 'Strehlow'] },
  { id: 'ngalyod', ascii: 'ngalyod', unicode: 'Ngalyod', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Rainbow Serpent', meaning: 'The rainbow', sources: ['AIATSIS', 'Berndt'] },
  { id: 'wandjina', ascii: 'wandjina', unicode: 'Wandjina', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Cloud, Rain Spirits', meaning: 'The cloud spirits', sources: ['AIATSIS', 'Crawford'] },
  { id: 'wawalag', ascii: 'wawalag', unicode: 'Wawalag', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Two Sisters, Creators', meaning: 'The two sisters', sources: ['AIATSIS', 'Berndt'] },
  { id: 'yurlungur', ascii: 'yurlungur', unicode: 'Yurlungur', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Copper Snake, Initiator', meaning: 'The great copper snake', sources: ['AIATSIS', 'Berndt'] },
  { id: 'tjinimin', ascii: 'tjinimin', unicode: 'Tjinimin', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Trickster, Moth Man', meaning: 'The moth man', sources: ['AIATSIS', 'Berndt'] },
  { id: 'eingana', ascii: 'eingana', unicode: 'Eingana', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Creator Mother Snake', meaning: 'The mother', sources: ['AIATSIS', 'Berndt'] },
  { id: 'mamaragan', ascii: 'mamaragan', unicode: 'Mamaragan', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Lightning Man', meaning: 'The lightning', sources: ['AIATSIS', 'Berndt'] },
  { id: 'gnowee', ascii: 'gnowee', unicode: 'Gnowee', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Sun Goddess', meaning: 'The sun', sources: ['AIATSIS', 'Massola'] },
  
  // ==========================================
  // ZOROASTRIAN EXPANSION (~10 entries)
  // ==========================================
  
  { id: 'spenta-mainyu', ascii: 'spenta-mainyu', unicode: 'SpəntaMainyu', greek: '—', pantheon: 'zoroastrian', tier: '2', tierLabel: 'Tier 2', domain: 'Holy Spirit, Bounteous', meaning: 'Bounteous spirit', sources: ['AirWb', 'Bartholomae'] },
  { id: 'vohu-manah', ascii: 'vohu-manah', unicode: 'VohuManah', greek: '—', pantheon: 'zoroastrian', tier: '2', tierLabel: 'Tier 2', domain: 'Good Mind, Cattle', meaning: 'Good thought', sources: ['AirWb', 'Bartholomae'] },
  { id: 'asha-vahishta', ascii: 'asha-vahishta', unicode: 'AšaVahišta', greek: '—', pantheon: 'zoroastrian', tier: '2', tierLabel: 'Tier 2', domain: 'Truth, Best Order, Fire', meaning: 'Best truth', sources: ['AirWb', 'Bartholomae'] },
  { id: 'khshathra-vairya', ascii: 'khshathra-vairya', unicode: 'XšaθraVairya', greek: '—', pantheon: 'zoroastrian', tier: '2', tierLabel: 'Tier 2', domain: 'Desirable Dominion, Metal', meaning: 'Desirable dominion', sources: ['AirWb', 'Bartholomae'] },
  { id: 'spenta-armaiti', ascii: 'spenta-armaiti', unicode: 'SpəntaĀrmaiti', greek: '—', pantheon: 'zoroastrian', tier: '2', tierLabel: 'Tier 2', domain: 'Holy Devotion, Earth', meaning: 'Bounteous devotion', sources: ['AirWb', 'Bartholomae'] },
  { id: 'haurvatat', ascii: 'haurvatat', unicode: 'Haurvatāt', greek: '—', pantheon: 'zoroastrian', tier: '2', tierLabel: 'Tier 2', domain: 'Wholeness, Health, Water', meaning: 'Wholeness', sources: ['AirWb', 'Bartholomae'] },
  { id: 'ameretat', ascii: 'ameretat', unicode: 'Amərətāt', greek: '—', pantheon: 'zoroastrian', tier: '2', tierLabel: 'Tier 2', domain: 'Immortality, Plants', meaning: 'Immortality', sources: ['AirWb', 'Bartholomae'] },
  { id: 'sraosha', ascii: 'sraosha', unicode: 'Sraoša', greek: '—', pantheon: 'zoroastrian', tier: '2', tierLabel: 'Tier 2', domain: 'Obedience, Protection', meaning: 'Discipline, obedience', sources: ['AirWb', 'Bartholomae'] },
  { id: 'rashnu', ascii: 'rashnu', unicode: 'Rašnu', greek: '—', pantheon: 'zoroastrian', tier: '2', tierLabel: 'Tier 2', domain: 'Justice, Judgment', meaning: 'The true one', sources: ['AirWb', 'Bartholomae'] },
  { id: 'anahita', ascii: 'anahita', unicode: 'Anāhitā', greek: '—', pantheon: 'zoroastrian', tier: '1', tierLabel: 'Tier 1', domain: 'Fertility, Water, Wisdom', meaning: 'Immaculate, undefiled', sources: ['AirWb', 'Bartholomae'] },
  
  // ==========================================
  // INCAN EXPANSION (~8 entries)
  // ==========================================
  
  { id: 'mamaquilla', ascii: 'mamaquilla', unicode: 'MamaQuilla', greek: '—', pantheon: 'incan', tier: '2', tierLabel: 'Tier 2', domain: 'Moon, Marriage', meaning: 'Mother moon', sources: ['D\'Altroy', 'Bauer'] },
  { id: 'mamaqucha', ascii: 'mamaqucha', unicode: 'Mamaqucha', greek: '—', pantheon: 'incan', tier: '2', tierLabel: 'Tier 2', domain: 'Sea, Fishermen', meaning: 'Mother sea', sources: ['D\'Altroy', 'Bauer'] },
  { id: 'illapa', ascii: 'illapa', unicode: 'Illapa', greek: '—', pantheon: 'incan', tier: '2', tierLabel: 'Tier 2', domain: 'Thunder, Lightning, War', meaning: 'Thunder', sources: ['D\'Altroy', 'Bauer'] },
  { id: 'pachacamac', ascii: 'pachacamac', unicode: 'Pachacámac', greek: '—', pantheon: 'incan', tier: '2', tierLabel: 'Tier 2', domain: 'Creator, Earthquake', meaning: 'Earth-shaker', sources: ['D\'Altroy', 'Bauer'] },
  { id: 'supay', ascii: 'supay', unicode: 'Supay', greek: '—', pantheon: 'incan', tier: '2', tierLabel: 'Tier 2', domain: 'Underworld, Death', meaning: 'The spirit', sources: ['D\'Altroy', 'Bauer'] },
  { id: 'urcaguary', ascii: 'urcaguary', unicode: 'Urcaguary', greek: '—', pantheon: 'incan', tier: '2', tierLabel: 'Tier 2', domain: 'Underworld Jewels', meaning: 'He of the underground', sources: ['D\'Altroy', 'Bauer'] },
  { id: 'ekkeko', ascii: 'ekkeko', unicode: 'Ekkeko', greek: '—', pantheon: 'incan', tier: '2', tierLabel: 'Tier 2', domain: 'Luck, Abundance', meaning: 'The dwarf', sources: ['D\'Altroy', 'Bauer'] },
  { id: 'wamani', ascii: 'wamani', unicode: 'Wamani', greek: '—', pantheon: 'incan', tier: '2', tierLabel: 'Tier 2', domain: 'Sacred Mountain', meaning: 'The falcon', sources: ['D\'Altroy', 'Bauer'] },
  
  // ==========================================
  // PHILOSOPHICAL/COSMOLOGICAL CONCEPTS (~30)
  // ==========================================
  
  // Latin
  { id: 'anima', ascii: 'anima', unicode: 'Anima', greek: '—', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Soul, Breath, Life Force', meaning: 'Breath, air, soul', sources: ['Cicero', 'Lewis-Short'] },
  { id: 'animus', ascii: 'animus', unicode: 'Animus', greek: '—', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Mind, Spirit, Courage', meaning: 'Mind, spirit, courage', sources: ['Cicero', 'Lewis-Short'] },
  { id: 'numen', ascii: 'numen', unicode: 'Nūmen', greek: '—', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Divine Will, Power', meaning: 'A nodding, divine power', sources: ['Cicero', 'Lewis-Short'] },
  { id: 'fides', ascii: 'fides', unicode: 'Fidēs', greek: '—', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Faith, Trust, Promise', meaning: 'Trust, faith', sources: ['Cicero', 'Lewis-Short'] },
  { id: 'pietas', ascii: 'pietas', unicode: 'Pietās', greek: '—', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Piety, Duty, Devotion', meaning: 'Duty, devotion', sources: ['Cicero', 'Lewis-Short'] },
  { id: 'virtus', ascii: 'virtus', unicode: 'Virtūs', greek: '—', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Courage, Excellence, Virtue', meaning: 'Manliness, courage', sources: ['Cicero', 'Lewis-Short'] },
  { id: 'gravitas', ascii: 'gravitas', unicode: 'Gravitas', greek: '—', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Weight, Seriousness, Dignity', meaning: 'Weight, importance', sources: ['Cicero', 'Lewis-Short'] },
  { id: 'dignitas', ascii: 'dignitas', unicode: 'Dignitās', greek: '—', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Worthiness, Rank, Honor', meaning: 'Worth, merit', sources: ['Cicero', 'Lewis-Short'] },
  { id: 'auctoritas', ascii: 'auctoritas', unicode: 'Auctōritās', greek: '—', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Authority, Influence', meaning: 'Authority, prestige', sources: ['Cicero', 'Lewis-Short'] },
  { id: 'clementia', ascii: 'clementia', unicode: 'Clementia', greek: '—', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Mercy, Forgiveness', meaning: 'Mildness, mercy', sources: ['Cicero', 'Lewis-Short'] },
  
  // Cross-cultural elements
  { id: 'aether-element', ascii: 'aether-element', unicode: 'Aithḗr', greek: 'Αἰθήρ', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Upper Air, Quintessence', meaning: 'Bright upper air, fifth element', sources: ['Aristotle', 'LSJ'] },
  { id: 'pyr', ascii: 'pyr', unicode: 'Pŷr', greek: 'Πῦρ', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Fire', meaning: 'Fire', sources: ['Heraclitus', 'LSJ'] },
  { id: 'hydor', ascii: 'hydor', unicode: 'Hýdōr', greek: 'Ὕδωρ', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Water', meaning: 'Water', sources: ['Empedocles', 'LSJ'] },
  { id: 'ge', ascii: 'ge', unicode: 'Gē', greek: 'Γῆ', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Earth', meaning: 'Earth', sources: ['Hesiod', 'LSJ'] },
  { id: 'aer', ascii: 'aer', unicode: 'Aḗr', greek: 'Ἀήρ', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Air', meaning: 'Air, mist', sources: ['Anaximenes', 'LSJ'] },
  { id: 'styx', ascii: 'styx', unicode: 'Stýx', greek: 'Στύξ', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'River of Hate, Oaths', meaning: 'Hateful', sources: ['Hesiod', 'LSJ'] },
  { id: 'lethe', ascii: 'lethe', unicode: 'Lḗthē', greek: 'Λήθη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'River of Forgetfulness', meaning: 'Forgetfulness', sources: ['Plato', 'LSJ'] },
  { id: 'acheron', ascii: 'acheron', unicode: 'Achérōn', greek: 'Ἀχέρων', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'River of Woe', meaning: 'River of woe', sources: ['Hesiod', 'LSJ'] },
  { id: 'cocytus', ascii: 'cocytus', unicode: 'Kōkytós', greek: 'Κωκυτός', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'River of Lamentation', meaning: 'Wailing', sources: ['Hesiod', 'LSJ'] },
  { id: 'phlegethon', ascii: 'phlegethon', unicode: 'Phlégethōn', greek: 'Φλέγεθων', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'River of Fire', meaning: 'Flaming', sources: ['Plato', 'LSJ'] },
];

module.exports = BATCH_DATA;

// Test if run directly
if (require.main === module) {
  const { generateEntry } = require('./generate-entries');
  let errors = 0;
  
  BATCH_DATA.forEach((data, i) => {
    try {
      const entry = generateEntry(data);
      // Check basic validity
      if (entry.breakdown.length !== entry.ascii.length) {
        console.error(`ERROR ${entry.id}: breakdown length ${entry.breakdown.length} !== ascii length ${entry.ascii.length}`);
        errors++;
      }
      const reconstructed = entry.breakdown.map(b => b.to).join('');
      if (reconstructed !== entry.unicode) {
        console.error(`ERROR ${entry.id}: reconstructed "${reconstructed}" !== unicode "${entry.unicode}"`);
        errors++;
      }
      if (entry.id !== entry.ascii) {
        console.error(`ERROR ${entry.id}: id !== ascii`);
        errors++;
      }
    } catch (e) {
      console.error(`ERROR processing ${data.id}: ${e.message}`);
      errors++;
    }
  });
  
  console.log(`\nTotal entries in batch: ${BATCH_DATA.length}`);
  console.log(`Errors: ${errors}`);
  if (errors === 0) console.log('All entries passed basic validation!');
}
