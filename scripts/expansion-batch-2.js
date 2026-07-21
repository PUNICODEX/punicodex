/**
 * PUNICODEX Lexicon Expansion Batch 2
 * Targeting major gaps: Chinese, more Greek/Hindu/Norse/Egyptian/Celtic/Japanese
 */

const { generateEntry } = require('./generate-entries');

const BATCH_DATA = [
  // ==========================================
  // CHINESE PANTHEON (~25 entries) — NEW
  // ==========================================
  { id: 'jadeemperor', ascii: 'jadeemperor', unicode: 'Yùhuáng', greek: '玉皇', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Supreme Deity, Heaven', meaning: 'Jade emperor', sources: ['Daoist Canon', 'Yang'] },
  { id: 'guanyin', ascii: 'guanyin', unicode: 'Guānyīn', greek: '觀音', pantheon: 'chinese', tier: '1', tierLabel: 'Tier 1', domain: 'Compassion, Mercy', meaning: 'Perceiver of sounds', sources: ['Lotus Sutra', 'Chinese Buddhist texts'] },
  { id: 'lanling', ascii: 'lanling', unicode: 'Lánlíng', greek: '蘭陵', pantheon: 'chinese', tier: '1', tierLabel: 'Tier 1', domain: 'War, Beauty, Mask', meaning: 'Orchid mound', sources: ['History of the North', 'Chinese folklore'] },
  { id: 'taishang', ascii: 'taishang', unicode: 'Tàishàng', greek: '太上', pantheon: 'chinese', tier: '1', tierLabel: 'Tier 1', domain: 'Supreme Lord, Dao', meaning: 'Supreme, great', sources: ['Dao De Jing', 'Daoist Canon'] },
  { id: 'tianhou', ascii: 'tianhou', unicode: 'Tiānhòu', greek: '天后', pantheon: 'chinese', tier: '1', tierLabel: 'Tier 1', domain: 'Sea, Protection, Seafaring', meaning: 'Empress of heaven', sources: ['Daoist Canon', 'Chinese folklore'] },
  { id: 'longwang', ascii: 'longwang', unicode: 'Lóngwáng', greek: '龍王', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Dragons, Rain, Rivers', meaning: 'Dragon king', sources: ['Shan Hai Jing', 'Chinese folklore'] },
  { id: 'yamen', ascii: 'yamen', unicode: 'Yámen', greek: '閻羅', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Underworld, Judgment', meaning: 'Yama gate', sources: ['Daoist Canon', 'Chinese Buddhist texts'] },
  { id: 'bagua', ascii: 'bagua', unicode: 'Bāguà', greek: '八卦', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Cosmology, Divination', meaning: 'Eight trigrams', sources: ['I Ching', 'Chinese classics'] },
  { id: 'taichi', ascii: 'taichi', unicode: 'Tàijí', greek: '太極', pantheon: 'chinese', tier: '1', tierLabel: 'Tier 1', domain: 'Supreme Ultimate, Origin', meaning: 'Great extreme', sources: ['I Ching', 'Zhou Dunyi'] },
  { id: 'wuxing', ascii: 'wuxing', unicode: 'Wǔxíng', greek: '五行', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Five Elements, Change', meaning: 'Five phases', sources: ['I Ching', 'Chinese classics'] },
  { id: 'qi', ascii: 'qi', unicode: 'Qì', greek: '氣', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Life Force, Energy', meaning: 'Breath, energy', sources: ['Dao De Jing', 'Chinese medicine'] },
  { id: 'dao', ascii: 'dao', unicode: 'Dào', greek: '道', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'The Way, Ultimate Principle', meaning: 'Way, path', sources: ['Dao De Jing', 'Laozi'] },
  { id: 'fuxi', ascii: 'fuxi', unicode: 'Fúxī', greek: '伏羲', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Culture, Writing, Divination', meaning: 'Hidden one', sources: ['Shan Hai Jing', 'Chinese classics'] },
  { id: 'nuwa', ascii: 'nuwa', unicode: 'Nǚwā', greek: '女媧', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Creation, Mending Heaven', meaning: 'Woman wa', sources: ['Shan Hai Jing', 'Chinese classics'] },
  { id: 'shennong', ascii: 'shennong', unicode: 'Shénnóng', greek: '神農', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Agriculture, Medicine', meaning: 'Divine farmer', sources: ['Huainanzi', 'Chinese classics'] },
  { id: 'huangdi', ascii: 'huangdi', unicode: 'Huángdì', greek: '皇帝', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Yellow Emperor, Ancestor', meaning: 'Yellow emperor', sources: ['Shiji', 'Chinese classics'] },
  { id: 'zhurong', ascii: 'zhurong', unicode: 'Zhùróng', greek: '祝融', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Fire, South', meaning: 'Prayer and melting', sources: ['Shan Hai Jing', 'Chinese classics'] },
  { id: 'gonggong', ascii: 'gonggong', unicode: 'Gōnggōng', greek: '共工', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Water, Destruction', meaning: 'Common labor', sources: ['Shan Hai Jing', 'Chinese classics'] },
  { id: 'xian', ascii: 'xian', unicode: 'Xiān', greek: '仙', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Immortal, Transcendent', meaning: 'Immortal', sources: ['Daoist Canon', 'Chinese folklore'] },
  { id: 'mazu', ascii: 'mazu', unicode: 'Māzǔ', greek: '媽祖', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Sea, Protection, Seafaring', meaning: 'Mother ancestor', sources: ['Chinese folklore', 'Daoist Canon'] },
  { id: 'erlang', ascii: 'erlang', unicode: 'Èrláng', greek: '二郎', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'War, Justice, Nephew of Jade Emperor', meaning: 'Second son', sources: ['Journey to the West', 'Chinese folklore'] },
  { id: 'nezha', ascii: 'nezha', unicode: 'Nézhā', greek: '哪吒', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Youth, War, Rebellion', meaning: 'Nezha (from Sanskrit Nalakuvara)', sources: ['Journey to the West', 'Chinese folklore'] },
  { id: 'sunwukong', ascii: 'sunwukong', unicode: 'SūnWùkōng', greek: '孫悟空', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Monkey King, Chaos, Enlightenment', meaning: 'Monkey awakened to emptiness', sources: ['Journey to the West', 'Wu Cheng\'en'] },
  { id: 'bingjilan', ascii: 'bingjilan', unicode: 'Bīngjílán', greek: '冰脊蘭', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Mountain, Cold, Purity', meaning: 'Ice ridge orchid', sources: ['Chinese folklore', 'Shan Hai Jing'] },
  { id: 'kunlun', ascii: 'kunlun', unicode: 'Kūnlún', greek: '崑崙', pantheon: 'chinese', tier: '1', tierLabel: 'Tier 1', domain: 'Sacred Mountain, Paradise', meaning: 'Kunlun mountain', sources: ['Shan Hai Jing', 'Chinese classics'] },

  // ==========================================
  // MORE GREEK (~35 entries)
  // ==========================================
  
  // More Olympians/major gods
  { id: 'asclepius', ascii: 'asclepius', unicode: 'Asklēpiós', greek: 'Ἀσκληπιός', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Medicine, Healing', meaning: 'To cut open', sources: ['Homer', 'LSJ'] },
  { id: 'eileithyia', ascii: 'eileithyia', unicode: 'Eileíthyia', greek: 'Εἰλείθυια', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Childbirth', meaning: 'She who comes to aid', sources: ['Homer', 'LSJ'] },
  { id: 'enyo', ascii: 'enyo', unicode: 'Enyṓ', greek: 'Ἐνυώ', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'War, Destruction', meaning: 'Warlike', sources: ['Homer', 'LSJ'] },
  { id: 'paean', ascii: 'paean', unicode: 'Paiṓn', greek: 'Παιών', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Healing Hymn', meaning: 'Healer', sources: ['Homer', 'LSJ'] },
  { id: 'hymenaeus', ascii: 'hymenaeus', unicode: 'Hymenaîos', greek: 'Ὑμέναιος', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Marriage, Wedding', meaning: 'Hymen', sources: ['Sophocles', 'LSJ'] },
  
  // More heroes
  { id: 'automedon', ascii: 'automedon', unicode: 'Automédōn', greek: 'Αὐτομέδων', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Charioteer of Achilles', meaning: 'Self-ruler', sources: ['Homer', 'LSJ'] },
  { id: 'eurypylus', ascii: 'eurypylus', unicode: 'Eurýpylos', greek: 'Εὐρύπυλος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Hero of Thessaly', meaning: 'Broad gate', sources: ['Homer', 'LSJ'] },
  { id: 'thoas', ascii: 'thoas', unicode: 'Thóas', greek: 'Θόας', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'King of Lemnos', meaning: 'Swift', sources: ['Homer', 'LSJ'] },
  { id: 'meriones', ascii: 'meriones', unicode: 'Meriónēs', greek: 'Μεριόνης', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Cretan Hero', meaning: 'Unknown', sources: ['Homer', 'LSJ'] },
  { id: 'idomeneus', ascii: 'idomeneus', unicode: 'Idomeneús', greek: 'Ἰδομενεύς', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'King of Crete', meaning: 'Unknown', sources: ['Homer', 'LSJ'] },
  { id: 'teucer', ascii: 'teucer', unicode: 'Teûcer', greek: 'Τεῦκρος', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Archer, Son of Telamon', meaning: 'Unknown', sources: ['Homer', 'LSJ'] },
  { id: 'ajaxlocrian', ascii: 'ajaxlocrian', unicode: 'Aias', greek: 'Αἴας', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Ajax the Lesser, Locris', meaning: 'Eagle, mourner', sources: ['Homer', 'LSJ'] },
  { id: 'neoptolemus', ascii: 'neoptolemus', unicode: 'Neoptólemos', greek: 'Νεοπτόλεμος', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Son of Achilles, Pyrrhus', meaning: 'New war', sources: ['Sophocles', 'LSJ'] },
  { id: 'machaon', ascii: 'machaon', unicode: 'Machaṓn', greek: 'Μαχάων', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Healer, Son of Asclepius', meaning: 'Fighter', sources: ['Homer', 'LSJ'] },
  { id: 'podalirius', ascii: 'podalirius', unicode: 'Podalírius', greek: 'Ποδαλείριος', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Healer, Son of Asclepius', meaning: 'Dew-foot', sources: ['Homer', 'LSJ'] },
  { id: 'calchas', ascii: 'calchas', unicode: 'Kálchas', greek: 'Κάλχας', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Seer, Prophet', meaning: 'Bronze-colored', sources: ['Homer', 'LSJ'] },
  { id: 'teiresias', ascii: 'teiresias', unicode: 'Teiresías', greek: 'Τειρεσίας', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Blind Seer of Thebes', meaning: 'Sign-bearer', sources: ['Sophocles', 'LSJ'] },
  { id: 'cassandra', ascii: 'cassandra', unicode: 'Kassándra', greek: 'Κασσάνδρα', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Prophetess, Trojan Princess', meaning: 'She who entangles men', sources: ['Aeschylus', 'LSJ'] },
  { id: 'hecuba', ascii: 'hecuba', unicode: 'Hekábē', greek: 'Ἑκάβη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Queen of Troy', meaning: 'Far off', sources: ['Euripides', 'LSJ'] },
  { id: 'andromache', ascii: 'andromache', unicode: 'Andromáchē', greek: 'Ἀνδρομάχη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Wife of Hector', meaning: 'Man-fighter', sources: ['Homer', 'LSJ'] },
  { id: 'astyanax', ascii: 'astyanax', unicode: 'Astýanax', greek: 'Ἀστυάναξ', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Son of Hector', meaning: 'Lord of the city', sources: ['Homer', 'LSJ'] },
  { id: 'polyxena', ascii: 'polyxena', unicode: 'Polyxénē', greek: 'Πολυξένη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Trojan Princess, Sacrifice', meaning: 'Hospitable to many', sources: ['Euripides', 'LSJ'] },
  { id: 'sinon', ascii: 'sinon', unicode: 'Sínōn', greek: 'Σίνων', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Trickster, Horse Builder', meaning: 'Unknown', sources: ['Virgil', 'LSJ'] },
  { id: 'palamedes', ascii: 'palamedes', unicode: 'Palamḗdēs', greek: 'Παλαμήδης', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Inventor, Martyr', meaning: 'Crafty counsel', sources: ['Sophocles', 'LSJ'] },
  { id: 'antigone', ascii: 'antigone', unicode: 'Antigónē', greek: 'Ἀντιγόνη', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Defiance, Family Duty', meaning: 'Against birth', sources: ['Sophocles', 'LSJ'] },
  { id: 'ismene', ascii: 'ismene', unicode: 'Ismḗnē', greek: 'Ἰσμήνη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Sister of Antigone', meaning: 'Knowledge', sources: ['Sophocles', 'LSJ'] },
  { id: 'oedipus', ascii: 'oedipus', unicode: 'Oedípus', greek: 'Οἰδίπους', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Fate, Tragedy, Thebes', meaning: 'Swollen foot', sources: ['Sophocles', 'LSJ'] },
  { id: 'jocasta', ascii: 'jocasta', unicode: 'Jokástē', greek: 'Ἰοκάστη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Queen of Thebes', meaning: 'Shining moon', sources: ['Sophocles', 'LSJ'] },
  { id: 'cadmus', ascii: 'cadmus', unicode: 'Kádmos', greek: 'Κάδμος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Founder of Thebes', meaning: 'From the east', sources: ['Herodotus', 'LSJ'] },
  { id: 'pentheus', ascii: 'pentheus', unicode: 'Pentheús', greek: 'Πενθεύς', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'King of Thebes', meaning: 'Sorrow', sources: ['Euripides', 'LSJ'] },
  { id: 'agave', ascii: 'agave', unicode: 'Agáuē', greek: 'Ἀγαύη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Mother of Pentheus', meaning: 'Illustrious, noble', sources: ['Euripides', 'LSJ'] },
  { id: 'hermione', ascii: 'hermione', unicode: 'Hermiónē', greek: 'Ἑρμιόνη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Daughter of Helen', meaning: 'Messenger, travel', sources: ['Euripides', 'LSJ'] },
  { id: 'creusa', ascii: 'creusa', unicode: 'Creúsa', greek: 'Κρέουσα', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Princess of Corinth', meaning: 'Lady, mistress', sources: ['Euripides', 'LSJ'] },
  { id: 'medea', ascii: 'medea', unicode: 'Medéa', greek: 'Μήδεια', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Magic, Revenge', meaning: 'Cunning, planning', sources: ['Euripides', 'LSJ'] },
  { id: 'aetes', ascii: 'aetes', unicode: 'Aítēs', greek: 'Αἰήτης', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'King of Colchis', meaning: 'Eagle', sources: ['Apollonius', 'LSJ'] },
  { id: 'chiron', ascii: 'chiron', unicode: 'Chíron', greek: 'Χείρων', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Wise Centaur, Teacher', meaning: 'Hand', sources: ['Pindar', 'LSJ'] },
  
  // More creatures
  { id: 'typhon', ascii: 'typhon', unicode: 'Typhṓn', greek: 'Τυφῶν', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Monster, Storms', meaning: 'Smoke, whirlwind', sources: ['Hesiod', 'LSJ'] },
  { id: 'ladon', ascii: 'ladon', unicode: 'Ládōn', greek: 'Λάδων', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Dragon of Hesperides', meaning: 'Flowing water', sources: ['Hesiod', 'LSJ'] },
  { id: 'nemeanlion', ascii: 'nemeanlion', unicode: 'NemeanLéon', greek: 'Νεμεῖος Λέων', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Invincible Lion', meaning: 'Lion of Nemea', sources: ['Hesiod', 'LSJ'] },
  { id: 'erymanthianboar', ascii: 'erymanthianboar', unicode: 'ErymanthianBoar', greek: 'Ἐρυμάνθιος Κάπρος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Giant Boar', meaning: 'Boar of Erymanthus', sources: ['Hesiod', 'LSJ'] },
  { id: 'stymphalianbirds', ascii: 'stymphalianbirds', unicode: 'StymphalianBirds', greek: 'Στυμφαλίδες Ὄρνιθες', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Man-Eating Birds', meaning: 'Birds of Stymphalus', sources: ['Hesiod', 'LSJ'] },
  { id: 'cerberusguard', ascii: 'cerberusguard', unicode: 'Kérberos', greek: 'Κέρβερος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Three-Headed Dog', meaning: 'Spot, darkness', sources: ['Hesiod', 'Beekes'] },

  // ==========================================
  // MORE HINDU/SANSKRIT (~20 entries)
  // ==========================================
  
  { id: 'skanda', ascii: 'skanda', unicode: 'Skanda', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'War, Commander', meaning: 'Spiller, attacker', sources: ['MW', 'Puranas'] },
  { id: 'nandi', ascii: 'nandi', unicode: 'Nandí', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Bull, Gatekeeper of Shiva', meaning: 'The joyful one', sources: ['MW', 'Puranas'] },
  { id: 'garuda', ascii: 'garuda', unicode: 'Garuḍa', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Eagle, Mount of Vishnu', meaning: 'Devourer', sources: ['MW', 'Mahabharata'] },
  { id: 'jatayu', ascii: 'jatayu', unicode: 'Jaṭāyu', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Vulture, Heroic Bird', meaning: 'Matted hair', sources: ['MW', 'Ramayana'] },
  { id: 'kamsa', ascii: 'kamsa', unicode: 'Kaṃsa', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Tyrant, Uncle of Krishna', meaning: 'Cup, bowl', sources: ['MW', 'Bhagavata'] },
  { id: 'putana', ascii: 'putana', unicode: 'Pūtanā', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Demoness, Killer of Infants', meaning: 'Stinking', sources: ['MW', 'Bhagavata'] },
  { id: 'shakti', ascii: 'shakti', unicode: 'Śakti', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Power, Energy, Divine Feminine', meaning: 'Power, ability', sources: ['MW', 'Devi Mahatmya'] },
  { id: 'prajapati', ascii: 'prajapati', unicode: 'Prajāpati', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Lord of Creatures', meaning: 'Lord of offspring', sources: ['MW', 'RV'] },
  { id: 'savitri', ascii: 'savitri', unicode: 'Sāvitrī', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Solar Goddess, Truth', meaning: 'Belonging to Savitar', sources: ['MW', 'RV'] },
  { id: 'tvashtri', ascii: 'tvashtri', unicode: 'Tvaṣṭṛ', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Divine Artificer', meaning: 'The carpenter', sources: ['MW', 'RV'] },
  { id: 'pushan', ascii: 'pushan', unicode: 'Pūṣan', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Prosperity, Journeys', meaning: 'The nourisher', sources: ['MW', 'RV'] },
  { id: 'vishvakarman', ascii: 'vishvakarman', unicode: 'Viśvakarman', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Universal Architect', meaning: 'All-accomplishing', sources: ['MW', 'RV'] },
  { id: 'daksha', ascii: 'daksha', unicode: 'Dakṣa', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Ritual, Creation', meaning: 'Able, competent', sources: ['MW', 'Puranas'] },
  { id: 'bhrigu', ascii: 'bhrigu', unicode: 'Bhṛgu', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Sage, Ancestor of Priests', meaning: 'Unknown', sources: ['MW', 'Puranas'] },
  { id: 'narada', ascii: 'narada', unicode: 'Nārada', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Divine Sage, Messenger', meaning: 'Giver of water', sources: ['MW', 'Puranas'] },
  { id: 'markandeya', ascii: 'markandeya', unicode: 'Mārkaṇḍeya', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Immortal Sage', meaning: 'Son of Mrkanda', sources: ['MW', 'Puranas'] },
  { id: 'bhishma', ascii: 'bhishma', unicode: 'Bhīṣma', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Vow, Grandfather', meaning: 'Terrible', sources: ['MW', 'Mahabharata'] },
  { id: 'drona', ascii: 'drona', unicode: 'Droṇa', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Guru, Weapons Master', meaning: 'Bucket, vessel', sources: ['MW', 'Mahabharata'] },
  { id: 'kripa', ascii: 'kripa', unicode: 'Kṛpa', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Royal Guru', meaning: 'Pity, mercy', sources: ['MW', 'Mahabharata'] },
  { id: 'nakula', ascii: 'nakula', unicode: 'Nakula', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Twin, Son of Madri', meaning: 'Mongoose', sources: ['MW', 'Mahabharata'] },
  { id: 'sahadeva', ascii: 'sahadeva', unicode: 'Sahadeva', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Twin, Son of Madri', meaning: 'With gods', sources: ['MW', 'Mahabharata'] },

  // ==========================================
  // MORE NORSE (~15 entries)
  // ==========================================
  
  { id: 'hodr', ascii: 'hodr', unicode: 'Höðr', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Darkness, Blindness', meaning: 'Warrior, killer', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'vali', ascii: 'vali', unicode: 'Váli', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Vengeance, Son of Odin', meaning: 'The chosen', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'rig', ascii: 'rig', unicode: 'Ríg', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Society, Classes', meaning: 'King', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'saga', ascii: 'saga', unicode: 'Sága', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Wisdom, History', meaning: 'The one who sees', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'hermod', ascii: 'hermod', unicode: 'Hermód', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Messenger, Courage', meaning: 'War-spirit', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'magni', ascii: 'magni', unicode: 'Magni', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Strength, Son of Thor', meaning: 'The strong one', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'modi', ascii: 'modi', unicode: 'Móði', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Wrath, Son of Thor', meaning: 'The angry one', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'thrud', ascii: 'thrud', unicode: 'Thrúd', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Strength, Daughter of Thor', meaning: 'Power', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'garm', ascii: 'garm', unicode: 'Gárm', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Hel-Hound, Doom', meaning: 'The ragged one', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'hati', ascii: 'hati', unicode: 'Hati', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Moon-Chaser, Chaos', meaning: 'The hater', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'skoll', ascii: 'skoll', unicode: 'Skǫll', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Sun-Chaser, Devourer', meaning: 'The one who mocks', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'ratatoskr', ascii: 'ratatoskr', unicode: 'Ratatoskr', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Squirrel of Yggdrasil', meaning: 'Drill-tooth', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'draupnir', ascii: 'draupnir', unicode: 'Draupnir', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Odin\'s Ring, Wealth', meaning: 'The dripper', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'mjolnir', ascii: 'mjolnir', unicode: 'Mjólnir', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Thunder Hammer', meaning: 'The grinder', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },

  // ==========================================
  // MORE EGYPTIAN (~10 entries)
  // ==========================================
  
  { id: 'wadjet', ascii: 'wadjet', unicode: 'Wꜣḏyt', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Cobra, Protection, Lower Egypt', meaning: 'The green one', sources: ['Faulkner', 'Wb'] },
  { id: 'nekhbet', ascii: 'nekhbet', unicode: 'Nḫbt', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Vulture, Protection, Upper Egypt', meaning: 'She of Nekheb', sources: ['Faulkner', 'Wb'] },
  { id: 'apep', ascii: 'apep', unicode: 'Ꜥpp', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Chaos, Serpent', meaning: 'The overthrown one', sources: ['Faulkner', 'Wb'] },
  { id: 'serqet', ascii: 'serqet', unicode: 'Srqt', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Scorpion, Protection', meaning: 'She who causes the throat to breathe', sources: ['Faulkner', 'Wb'] },
  { id: 'hp', ascii: 'hp', unicode: 'Ḥꜥpy', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Nile Inundation, Fertility', meaning: 'The runner', sources: ['Faulkner', 'Wb'] },
  { id: 'renenet', ascii: 'renenet', unicode: 'Rnnwtt', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Nursing, Harvest', meaning: 'The nourisher', sources: ['Faulkner', 'Wb'] },
  { id: 'seshat', ascii: 'seshat', unicode: 'Ssḥt', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Writing, Architecture', meaning: 'She who scrivens', sources: ['Faulkner', 'Wb'] },
  { id: 'mafdet', ascii: 'mafdet', unicode: 'Mꜣfdt', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Justice, Execution', meaning: 'The runner', sources: ['Faulkner', 'Wb'] },
  { id: 'menhit', ascii: 'menhit', unicode: 'Mnḥyt', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'War, Lioness', meaning: 'The slaughterer', sources: ['Faulkner', 'Wb'] },
  { id: 'pakhet', ascii: 'pakhet', unicode: 'Pꜣḫt', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Hunt, Lioness', meaning: 'She who scratches', sources: ['Faulkner', 'Wb'] },

  // ==========================================
  // MORE CELTIC (~15 entries)
  // ==========================================
  
  { id: 'manawydan', ascii: 'manawydan', unicode: 'Manawydan', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Sea, Craftsmanship', meaning: 'Manannán (Welsh form)', sources: ['Mabinogion', 'MacKillop'] },
  { id: 'matholwch', ascii: 'matholwch', unicode: 'Matholwch', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'King of Ireland', meaning: 'Good bear', sources: ['Mabinogion', 'MacKillop'] },
  { id: 'efnysien', ascii: 'efnysien', unicode: 'Efnysien', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Trouble, Mischief', meaning: 'Double enemy', sources: ['Mabinogion', 'MacKillop'] },
  { id: 'nisien', ascii: 'nisien', unicode: 'Nisien', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Peace, Brother of Efnysien', meaning: 'Peaceful one', sources: ['Mabinogion', 'MacKillop'] },
  { id: 'blodeuwedd', ascii: 'blodeuwedd', unicode: 'Blodeuwedd', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Flower Bride, Betrayal', meaning: 'Flower face', sources: ['Mabinogion', 'MacKillop'] },
  { id: 'gronwpebr', ascii: 'gronwpebr', unicode: 'GronwPebr', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Lover of Blodeuwedd', meaning: 'Gronw the strong', sources: ['Mabinogion', 'MacKillop'] },
  { id: 'taliesin', ascii: 'taliesin', unicode: 'Taliesin', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Poet, Shapeshifter', meaning: 'Radiant brow', sources: ['Mabinogion', 'MacKillop'] },
  { id: 'myrddin', ascii: 'myrddin', unicode: 'Myrddin', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Seer, Wild Man', meaning: 'Merlin', sources: ['Welsh Triads', 'MacKillop'] },
  { id: 'gawain', ascii: 'gawain', unicode: 'Gawain', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Knight, Sun Hero', meaning: 'Little falcon', sources: ['Arthurian legend', 'MacKillop'] },
  { id: 'bedwyr', ascii: 'bedwyr', unicode: 'Bedwyr', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Knight, One-handed', meaning: 'Unknown', sources: ['Arthurian legend', 'MacKillop'] },
  { id: 'kai', ascii: 'kai', unicode: 'Kai', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Seneschal, Steward', meaning: 'Unknown', sources: ['Arthurian legend', 'MacKillop'] },
  { id: 'morrigan', ascii: 'morrigan', unicode: 'Morrígan', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Battle, Sovereignty, Prophecy', meaning: 'Great queen / phantom queen', sources: ['Táin Bó Cúailnge', 'MacKillop'] },
  { id: 'don', ascii: 'don', unicode: 'Don', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Mother of Gods', meaning: 'Goddess', sources: ['Mabinogion', 'MacKillop'] },
  { id: 'beli', ascii: 'beli', unicode: 'Beli', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Light, Sun', meaning: 'Bright, shining', sources: ['Mabinogion', 'MacKillop'] },
  { id: 'math', ascii: 'math', unicode: 'Math', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Magic, Kingship', meaning: 'Bear', sources: ['Mabinogion', 'MacKillop'] },

  // ==========================================
  // MORE JAPANESE (~10 entries)
  // ==========================================
  
  { id: 'amenouzume', ascii: 'amenouzume', unicode: 'Amenóuzume', greek: '天宇受売命', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Dance, Revelation, Dawn', meaning: 'Heavenly whirling woman', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'kotoshironushi', ascii: 'kotoshironushi', unicode: 'Kotoshironushi', greek: '事代主神', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Oracles, Fishing', meaning: 'Lord who substitutes', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'omononushi', ascii: 'omononushi', unicode: 'Omononushi', greek: '大物忌神', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Mountains, Deity of Miwa', meaning: 'Great thing lord', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'sukunahikona', ascii: 'sukunahikona', unicode: 'Sukunahikona', greek: '少彦名神', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Healing, Sake, Smallpox', meaning: 'Renowned little prince', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'tajikarao', ascii: 'tajikarao', unicode: 'Tajikarao', greek: '手力男神', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Strength, Caves', meaning: 'Strong hand man', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'toyotama', ascii: 'toyotama', unicode: 'Toyotama', greek: '豊玉毘売命', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Sea, Mother of Jimmu', meaning: 'Abundant jewel', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'ugayafukiaezu', ascii: 'ugayafukiaezu', unicode: 'Ugayafukiaezu', greek: '鵜草葺不合命', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Ancestor of Jimmu', meaning: 'Cormorant grass-thatching unfinished', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'hoderi', ascii: 'hoderi', unicode: 'Hoderi', greek: '火照命', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Fire, Fisherman', meaning: 'Fire-shining', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'hoori', ascii: 'hoori', unicode: 'Hoori', greek: '火折命', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Agriculture, Hunter', meaning: 'Fire-subduing', sources: ['Kojiki', 'Nihon Shoki'] },
  { id: 'nishinakahime', ascii: 'nishinakahime', unicode: 'Nishinakahime', greek: '日子波邇夜須毘売命', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Rice, Agriculture', meaning: 'Day-sun wave princess', sources: ['Kojiki', 'Nihon Shoki'] },

  // ==========================================
  // MORE MESOPOTAMIAN (~8 entries)
  // ==========================================
  
  { id: 'ishtar', ascii: 'ishtar', unicode: 'Ištar', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Love, War, Venus', meaning: 'Star', sources: ['ETCSL', 'Black-Green'] },
  { id: 'kingu', ascii: 'kingu', unicode: 'Kingu', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Dragon, Consort of Tiamat', meaning: 'Unknown', sources: ['Enuma Elish', 'Black-Green'] },
  { id: 'lahmu', ascii: 'lahmu', unicode: 'Lahmu', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Primordial Being', meaning: 'The hairy one', sources: ['Enuma Elish', 'Black-Green'] },
  { id: 'lahamu', ascii: 'lahamu', unicode: 'Lahamu', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Primordial Being', meaning: 'The hairy one (fem.)', sources: ['Enuma Elish', 'Black-Green'] },
  { id: 'anshar', ascii: 'anshar', unicode: 'Anšar', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Sky, Circle of Heaven', meaning: 'Whole sky', sources: ['Enuma Elish', 'Black-Green'] },
  { id: 'kishar', ascii: 'kishar', unicode: 'Kišar', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Earth, Circle of Earth', meaning: 'Whole earth', sources: ['Enuma Elish', 'Black-Green'] },
  { id: 'adad', ascii: 'adad', unicode: 'Adad', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Storm, Thunder', meaning: 'The thunderer', sources: ['ETCSL', 'Black-Green'] },
  { id: 'sin', ascii: 'sin', unicode: 'Sîn', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Moon', meaning: 'The moon god', sources: ['ETCSL', 'Black-Green'] },

  // ==========================================
  // MORE PHILOSOPHICAL CONCEPTS (~15 entries)
  // ==========================================
  
  // More Greek
  { id: 'gnosis', ascii: 'gnosis', unicode: 'Gnṓsis', greek: 'Γνῶσις', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Knowledge, Insight', meaning: 'Knowledge', sources: ['Plato', 'LSJ'] },
  { id: 'sophia', ascii: 'sophia', unicode: 'Sophía', greek: 'Σοφία', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Wisdom', meaning: 'Wisdom, skill', sources: ['Plato', 'LSJ'] },
  { id: 'doxa', ascii: 'doxa', unicode: 'Dóxa', greek: 'Δόξα', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Opinion, Glory', meaning: 'Opinion, glory', sources: ['Plato', 'LSJ'] },
  { id: 'episteme', ascii: 'episteme', unicode: 'Epistḗmē', greek: 'Ἐπιστήμη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Knowledge, Science', meaning: 'Understanding', sources: ['Plato', 'LSJ'] },
  { id: 'theoria', ascii: 'theoria', unicode: 'Theōría', greek: 'Θεωρία', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Contemplation', meaning: 'Viewing, contemplation', sources: ['Aristotle', 'LSJ'] },
  { id: 'praxis', ascii: 'praxis', unicode: 'Prâxis', greek: 'Πρᾶξις', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Action, Practice', meaning: 'Action, deed', sources: ['Aristotle', 'LSJ'] },
  { id: 'soteria', ascii: 'soteria', unicode: 'Sōtēría', greek: 'Σωτηρία', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Salvation, Deliverance', meaning: 'Salvation', sources: ['Plato', 'LSJ'] },
  { id: 'eudaimonia', ascii: 'eudaimonia', unicode: 'Eudaimonía', greek: 'Εὐδαιμονία', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Happiness, Flourishing', meaning: 'Good spirit, happiness', sources: ['Aristotle', 'LSJ'] },
  
  // Sanskrit concepts
  { id: 'jnana', ascii: 'jnana', unicode: 'Jñāna', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Knowledge, Wisdom', meaning: 'Knowledge', sources: ['MW', 'Upanishads'] },
  { id: 'bhakti', ascii: 'bhakti', unicode: 'Bhakti', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Devotion, Love', meaning: 'Devotion', sources: ['MW', 'Bhagavata'] },
  { id: 'dhyana', ascii: 'dhyana', unicode: 'Dhyāna', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Meditation, Absorption', meaning: 'Meditation', sources: ['MW', 'Yoga Sutras'] },
  { id: 'tapas', ascii: 'tapas', unicode: 'Tapas', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Heat, Austerity, Spiritual Power', meaning: 'Heat, austerity', sources: ['MW', 'Upanishads'] },
  { id: 'shunya', ascii: 'shunya', unicode: 'Śūnya', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Emptiness, Zero', meaning: 'Empty, void', sources: ['MW', 'Buddhist texts'] },
  { id: 'lingam', ascii: 'lingam', unicode: 'Língam', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Symbol of Shiva, Cosmos', meaning: 'Mark, sign', sources: ['MW', 'Shiva Purana'] },
  { id: 'yoni', ascii: 'yoni', unicode: 'Yoni', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Source, Womb, Shakti', meaning: 'Source, womb', sources: ['MW', 'Shakta texts'] },
];

module.exports = BATCH_DATA;

if (require.main === module) {
  let errors = 0;
  BATCH_DATA.forEach((data, i) => {
    try {
      const entry = generateEntry(data);
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
