/**
 * PUNYCODEX Lexicon Expansion Batch 3
 * Buddhist, Taoist, Korean, Phoenician, Hittite, more Chinese, sacred places, deeper coverage
 */

const { generateEntry } = require('./generate-entries');

const BATCH_DATA = [
  // ==========================================
  // BUDDHIST FIGURES (~20 entries) — NEW PANTHEON
  // ==========================================
  { id: 'amitabha', ascii: 'amitabha', unicode: 'Amitābha', greek: '—', pantheon: 'buddhist', tier: '1', tierLabel: 'Tier 1', domain: 'Infinite Light, Pure Land', meaning: 'Infinite light', sources: ['Sukhavati-vyuha', 'Buddhist texts'] },
  { id: 'vairocana', ascii: 'vairocana', unicode: 'Vairocana', greek: '—', pantheon: 'buddhist', tier: '2', tierLabel: 'Tier 2', domain: 'Universal Illumination, Cosmic Buddha', meaning: 'The illuminator', sources: ['Avatamsaka Sutra', 'Buddhist texts'] },
  { id: 'akshobhya', ascii: 'akshobhya', unicode: 'Akṣobhya', greek: '—', pantheon: 'buddhist', tier: '2', tierLabel: 'Tier 2', domain: 'Immovable, East', meaning: 'Immovable', sources: ['Vajrayana texts', 'Buddhist texts'] },
  { id: 'ratnasambhava', ascii: 'ratnasambhava', unicode: 'Ratnasambhava', greek: '—', pantheon: 'buddhist', tier: '2', tierLabel: 'Tier 2', domain: 'Jewel-Born, South', meaning: 'Born of jewels', sources: ['Vajrayana texts', 'Buddhist texts'] },
  { id: 'amoghasiddhi', ascii: 'amoghasiddhi', unicode: 'Amoghasiddhi', greek: '—', pantheon: 'buddhist', tier: '2', tierLabel: 'Tier 2', domain: 'Infallible Success, North', meaning: 'Almighty conqueror', sources: ['Vajrayana texts', 'Buddhist texts'] },
  { id: 'maitreya', ascii: 'maitreya', unicode: 'Maitreya', greek: '—', pantheon: 'buddhist', tier: '2', tierLabel: 'Tier 2', domain: 'Future Buddha, Loving-Kindness', meaning: 'The friendly one', sources: ['Mahayana texts', 'Buddhist texts'] },
  { id: 'manjushri', ascii: 'manjushri', unicode: 'Mañjuśrī', greek: '—', pantheon: 'buddhist', tier: '2', tierLabel: 'Tier 2', domain: 'Wisdom, Intellect', meaning: 'Gentle glory', sources: ['Mahayana texts', 'Buddhist texts'] },
  { id: 'samantabhadra', ascii: 'samantabhadra', unicode: 'Samantabhadra', greek: '—', pantheon: 'buddhist', tier: '2', tierLabel: 'Tier 2', domain: 'Universal Good, Practice', meaning: 'Universal virtue', sources: ['Mahayana texts', 'Buddhist texts'] },
  { id: 'ksitigarbha', ascii: 'ksitigarbha', unicode: 'Kṣitigarbha', greek: '—', pantheon: 'buddhist', tier: '2', tierLabel: 'Tier 2', domain: 'Earth Womb, Savior of Hell Beings', meaning: 'Earth store', sources: ['Mahayana texts', 'Buddhist texts'] },
  { id: 'vajrapani', ascii: 'vajrapani', unicode: 'Vajrapāṇi', greek: '—', pantheon: 'buddhist', tier: '1', tierLabel: 'Tier 1', domain: 'Thunderbolt Holder, Protection', meaning: 'Vajra in hand', sources: ['Vajrayana texts', 'Buddhist texts'] },
  { id: 'tara', ascii: 'tara', unicode: 'Tārā', greek: '—', pantheon: 'buddhist', tier: '1', tierLabel: 'Tier 1', domain: 'Compassion, Liberation', meaning: 'She who saves', sources: ['Vajrayana texts', 'Buddhist texts'] },
  { id: 'marici', ascii: 'marici', unicode: 'Mārīci', greek: '—', pantheon: 'buddhist', tier: '1', tierLabel: 'Tier 1', domain: 'Dawn, Light, Warrior Goddess', meaning: 'Ray of light', sources: ['Vajrayana texts', 'Buddhist texts'] },
  { id: 'mahakala', ascii: 'mahakala', unicode: 'Mahākāla', greek: '—', pantheon: 'buddhist', tier: '1', tierLabel: 'Tier 1', domain: 'Time, Death, Protection', meaning: 'Great time / great black one', sources: ['Vajrayana texts', 'Buddhist texts'] },
  { id: 'yama', ascii: 'yama', unicode: 'Yama', greek: '—', pantheon: 'buddhist', tier: '2', tierLabel: 'Tier 2', domain: 'Lord of Death, Judgment', meaning: 'Twin, restrainer', sources: ['Buddhist texts', 'MW'] },
  { id: 'nagarjuna', ascii: 'nagarjuna', unicode: 'Nāgārjuna', greek: '—', pantheon: 'buddhist', tier: '1', tierLabel: 'Tier 1', domain: 'Emptiness, Madhyamaka', meaning: 'Noble serpent', sources: ['Mūlamadhyamakakārikā', 'Buddhist texts'] },
  { id: 'asanga', ascii: 'asanga', unicode: 'Asanga', greek: '—', pantheon: 'buddhist', tier: '2', tierLabel: 'Tier 2', domain: 'Yogacara, Mind-Only', meaning: 'Without attachment', sources: ['Yogacara texts', 'Buddhist texts'] },
  { id: 'vasubandhu', ascii: 'vasubandhu', unicode: 'Vasubandhu', greek: '—', pantheon: 'buddhist', tier: '2', tierLabel: 'Tier 2', domain: 'Abhidharma, Yogacara', meaning: 'Kinsman of wealth', sources: ['Abhidharmakośa', 'Buddhist texts'] },
  { id: 'boddhisattva', ascii: 'boddhisattva', unicode: 'Bodhisattva', greek: '—', pantheon: 'buddhist', tier: '2', tierLabel: 'Tier 2', domain: 'Enlightenment Being, Compassion', meaning: 'Enlightenment being', sources: ['Mahayana texts', 'Buddhist texts'] },
  { id: 'arhat', ascii: 'arhat', unicode: 'Arhat', greek: '—', pantheon: 'buddhist', tier: '2', tierLabel: 'Tier 2', domain: 'Worthy One, Saint', meaning: 'Worthy, venerable', sources: ['Pali Canon', 'Buddhist texts'] },
  { id: 'nirvana', ascii: 'nirvana', unicode: 'Nirvāṇa', greek: '—', pantheon: 'buddhist', tier: '1', tierLabel: 'Tier 1', domain: 'Extinction, Liberation', meaning: 'Blowing out', sources: ['Pali Canon', 'Buddhist texts'] },

  // ==========================================
  // TAOIST FIGURES (~10 entries) — NEW PANTHEON
  // ==========================================
  { id: 'laozi', ascii: 'laozi', unicode: 'Lǎozǐ', greek: '老子', pantheon: 'taoist', tier: '2', tierLabel: 'Tier 2', domain: 'Founder of Daoism, Sage', meaning: 'Old master', sources: ['Dao De Jing', 'Chinese classics'] },
  { id: 'zhuangzi', ascii: 'zhuangzi', unicode: 'Zhuāngzǐ', greek: '莊子', pantheon: 'taoist', tier: '2', tierLabel: 'Tier 2', domain: 'Philosopher, Butterfly Dream', meaning: 'Master Zhuang', sources: ['Zhuangzi', 'Chinese classics'] },
  { id: 'zhangdaoling', ascii: 'zhangdaoling', unicode: 'ZhāngDàolíng', greek: '張道陵', pantheon: 'taoist', tier: '2', tierLabel: 'Tier 2', domain: 'First Celestial Master', meaning: 'Zhang Dao Ling', sources: ['Daoist Canon', 'Chinese classics'] },
  { id: 'ludongbin', ascii: 'ludongbin', unicode: 'LǚDōngbīn', greek: '呂洞賓', pantheon: 'taoist', tier: '2', tierLabel: 'Tier 2', domain: 'Immortal, Sword', meaning: 'Lu Dong Bin', sources: ['Daoist Canon', 'Chinese folklore'] },
  { id: 'zhongliquan', ascii: 'zhongliquan', unicode: 'ZhōnglíQuán', greek: '鐘離權', pantheon: 'taoist', tier: '2', tierLabel: 'Tier 2', domain: 'Immortal, Fan', meaning: 'Zhongli Quan', sources: ['Daoist Canon', 'Chinese folklore'] },
  { id: 'hexiangu', ascii: 'hexiangu', unicode: 'HéXiāngū', greek: '何仙姑', pantheon: 'taoist', tier: '2', tierLabel: 'Tier 2', domain: 'Immortal, Lotus', meaning: 'He Xian Gu', sources: ['Daoist Canon', 'Chinese folklore'] },
  { id: 'xiwangmu', ascii: 'xiwangmu', unicode: 'Xīwángmǔ', greek: '西王母', pantheon: 'taoist', tier: '2', tierLabel: 'Tier 2', domain: 'Queen Mother of the West', meaning: 'Western queen mother', sources: ['Shan Hai Jing', 'Daoist Canon'] },
  { id: 'dongwanggong', ascii: 'dongwanggong', unicode: 'Dōngwánggōng', greek: '東王公', pantheon: 'taoist', tier: '2', tierLabel: 'Tier 2', domain: 'King Father of the East', meaning: 'Eastern king lord', sources: ['Daoist Canon', 'Chinese classics'] },
  { id: 'wenchang', ascii: 'wenchang', unicode: 'Wénchāng', greek: '文昌', pantheon: 'taoist', tier: '2', tierLabel: 'Tier 2', domain: 'Literature, Exams', meaning: 'Literary prosperity', sources: ['Daoist Canon', 'Chinese folklore'] },
  { id: 'zhenwu', ascii: 'zhenwu', unicode: 'Zhēnwǔ', greek: '真武', pantheon: 'taoist', tier: '2', tierLabel: 'Tier 2', domain: 'Perfected Warrior, North', meaning: 'Perfected warrior', sources: ['Daoist Canon', 'Chinese folklore'] },

  // ==========================================
  // KOREAN PANTHEON (~12 entries) — NEW
  // ==========================================
  { id: 'hananim', ascii: 'hananim', unicode: 'Hwanin', greek: '—', pantheon: 'korean', tier: '2', tierLabel: 'Tier 2', domain: 'Supreme God, Heaven', meaning: 'Lord of Heaven', sources: ['Samguk Yusa', 'Korean folklore'] },
  { id: 'dangun', ascii: 'dangun', unicode: 'Dangun', greek: '—', pantheon: 'korean', tier: '2', tierLabel: 'Tier 2', domain: 'Founder of Korea, First King', meaning: 'Lord of the sandalwood', sources: ['Samguk Yusa', 'Korean folklore'] },
  { id: 'hwanung', ascii: 'hwanung', unicode: 'Hwanung', greek: '—', pantheon: 'korean', tier: '2', tierLabel: 'Tier 2', domain: 'Son of Heaven, Descended', meaning: 'Heavenly prince', sources: ['Samguk Yusa', 'Korean folklore'] },
  { id: 'samshin', ascii: 'samshin', unicode: 'Samshin', greek: '—', pantheon: 'korean', tier: '2', tierLabel: 'Tier 2', domain: 'Birth, Triple Spirits', meaning: 'Three spirits', sources: ['Korean folklore', 'Shamanic texts'] },
  { id: 'halmoni', ascii: 'halmoni', unicode: 'Halmoni', greek: '—', pantheon: 'korean', tier: '2', tierLabel: 'Tier 2', domain: 'Grandmother Spirit, Earth', meaning: 'Grandmother', sources: ['Korean folklore', 'Shamanic texts'] },
  { id: 'jowangshin', ascii: 'jowangshin', unicode: 'Jowangshin', greek: '—', pantheon: 'korean', tier: '2', tierLabel: 'Tier 2', domain: 'Kitchen, Hearth', meaning: 'Kitchen king spirit', sources: ['Korean folklore', 'Shamanic texts'] },
  { id: 'seonangshin', ascii: 'seonangshin', unicode: 'Seonangshin', greek: '—', pantheon: 'korean', tier: '2', tierLabel: 'Tier 2', domain: 'Village Guardian, Boundary', meaning: 'Village spirit', sources: ['Korean folklore', 'Shamanic texts'] },
  { id: 'yongwang', ascii: 'yongwang', unicode: 'Yongwang', greek: '—', pantheon: 'korean', tier: '2', tierLabel: 'Tier 2', domain: 'Dragon King, Sea', meaning: 'Dragon king', sources: ['Korean folklore', 'Shamanic texts'] },
  { id: 'mago', ascii: 'mago', unicode: 'Mago', greek: '—', pantheon: 'korean', tier: '2', tierLabel: 'Tier 2', domain: 'Creator Goddess, Earth', meaning: 'Great goddess', sources: ['Korean folklore', 'Shamanic texts'] },
  { id: 'chilsong', ascii: 'chilsong', unicode: 'Chilsong', greek: '—', pantheon: 'korean', tier: '2', tierLabel: 'Tier 2', domain: 'Seven Stars, Ursa Major', meaning: 'Seven stars', sources: ['Korean folklore', 'Shamanic texts'] },
  { id: 'sosin', ascii: 'sosin', unicode: 'Sosin', greek: '—', pantheon: 'korean', tier: '2', tierLabel: 'Tier 2', domain: 'Messenger, Revealer', meaning: 'Revealer of things', sources: ['Korean folklore', 'Shamanic texts'] },
  { id: 'baekdusan', ascii: 'baekdusan', unicode: 'Baekdusan', greek: '—', pantheon: 'korean', tier: '2', tierLabel: 'Tier 2', domain: 'Sacred Mountain, Origin', meaning: 'White head mountain', sources: ['Korean folklore', 'Samguk Yusa'] },

  // ==========================================
  // PHOENICIAN/CANAANITE (~10 entries) — NEW
  // ==========================================
  { id: 'baal', ascii: 'baal', unicode: 'Baál', greek: '—', pantheon: 'phoenician', tier: '2', tierLabel: 'Tier 2', domain: 'Storm, Fertility, King', meaning: 'Lord, master', sources: ['Ugaritic texts', 'CIS'] },
  { id: 'el', ascii: 'el', unicode: 'Ēl', greek: '—', pantheon: 'phoenician', tier: '2', tierLabel: 'Tier 2', domain: 'Supreme God, Creator', meaning: 'God, mighty one', sources: ['Ugaritic texts', 'CIS'] },
  { id: 'anat', ascii: 'anat', unicode: 'Anát', greek: '—', pantheon: 'phoenician', tier: '2', tierLabel: 'Tier 2', domain: 'War, Hunt, Virgin', meaning: 'Strength, vigor', sources: ['Ugaritic texts', 'CIS'] },
  { id: 'aseratu', ascii: 'aseratu', unicode: 'Ašeratu', greek: '—', pantheon: 'phoenician', tier: '2', tierLabel: 'Tier 2', domain: 'Sea, Mother Goddess', meaning: 'She who treads on the sea', sources: ['Ugaritic texts', 'CIS'] },
  { id: 'mot', ascii: 'mot', unicode: 'Mōt', greek: '—', pantheon: 'phoenician', tier: '1', tierLabel: 'Tier 1', domain: 'Death, Underworld', meaning: 'Death', sources: ['Ugaritic texts', 'CIS'] },
  { id: 'yammu', ascii: 'yammu', unicode: 'Yammu', greek: '—', pantheon: 'phoenician', tier: '2', tierLabel: 'Tier 2', domain: 'Sea, Chaos', meaning: 'Sea', sources: ['Ugaritic texts', 'CIS'] },
  { id: 'shapash', ascii: 'shapash', unicode: 'Šāpšu', greek: '—', pantheon: 'phoenician', tier: '2', tierLabel: 'Tier 2', domain: 'Sun', meaning: 'The sun', sources: ['Ugaritic texts', 'CIS'] },
  { id: 'kothar', ascii: 'kothar', unicode: 'Kôṯaru', greek: '—', pantheon: 'phoenician', tier: '1', tierLabel: 'Tier 1', domain: 'Craft, Magic', meaning: 'Skilled one', sources: ['Ugaritic texts', 'CIS'] },
  { id: 'dagan', ascii: 'dagan', unicode: 'Dāgan', greek: '—', pantheon: 'phoenician', tier: '1', tierLabel: 'Tier 1', domain: 'Grain, Fertility', meaning: 'Grain', sources: ['Ugaritic texts', 'CIS'] },
  { id: 'astartu', ascii: 'astartu', unicode: 'Aštartu', greek: '—', pantheon: 'phoenician', tier: '2', tierLabel: 'Tier 2', domain: 'Love, War, Venus', meaning: 'She of the womb', sources: ['Ugaritic texts', 'CIS'] },

  // ==========================================
  // HITTITE (~8 entries) — NEW
  // ==========================================
  { id: 'tarhunash', ascii: 'tarhunash', unicode: 'Tarḫunash', greek: '—', pantheon: 'hittite', tier: '2', tierLabel: 'Tier 2', domain: 'Storm, Weather, King', meaning: 'The conqueror', sources: ['Hittite texts', 'CHD'] },
  { id: 'arinniti', ascii: 'arinniti', unicode: 'Arinna', greek: '—', pantheon: 'hittite', tier: '2', tierLabel: 'Tier 2', domain: 'Sun Goddess, Supreme', meaning: 'Of Arinna', sources: ['Hittite texts', 'CHD'] },
  { id: 'telipinu', ascii: 'telipinu', unicode: 'Telipinu', greek: '—', pantheon: 'hittite', tier: '2', tierLabel: 'Tier 2', domain: 'Agriculture, Vanishing God', meaning: 'Unknown', sources: ['Hittite texts', 'CHD'] },
  { id: 'inaras', ascii: 'inaras', unicode: 'Inaras', greek: '—', pantheon: 'hittite', tier: '2', tierLabel: 'Tier 2', domain: 'Wild Animals, Hunt', meaning: 'Unknown', sources: ['Hittite texts', 'CHD'] },
  { id: 'hannahannas', ascii: 'hannahannas', unicode: 'Ḫannaḫannas', greek: '—', pantheon: 'hittite', tier: '2', tierLabel: 'Tier 2', domain: 'Mother, Grandmother', meaning: 'Grandmother', sources: ['Hittite texts', 'CHD'] },
  { id: 'wurusemu', ascii: 'wurusemu', unicode: 'Wurušemu', greek: '—', pantheon: 'hittite', tier: '2', tierLabel: 'Tier 2', domain: 'Earth, Fertility', meaning: 'Unknown', sources: ['Hittite texts', 'CHD'] },
  { id: 'kumarbis', ascii: 'kumarbis', unicode: 'Kumarbiš', greek: '—', pantheon: 'hittite', tier: '2', tierLabel: 'Tier 2', domain: 'Grain, Father of Gods', meaning: 'Unknown', sources: ['Hittite texts', 'CHD'] },
  { id: 'alalu', ascii: 'alalu', unicode: 'Alalu', greek: '—', pantheon: 'hittite', tier: '2', tierLabel: 'Tier 2', domain: 'Primordial King, Heaven', meaning: 'Unknown', sources: ['Hittite texts', 'CHD'] },

  // ==========================================
  // MORE CHINESE (~15 entries)
  // ==========================================
  { id: 'confucius', ascii: 'confucius', unicode: 'Kǒngzǐ', greek: '孔子', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Philosopher, Ethics, Society', meaning: 'Master Kong', sources: ['Analects', 'Chinese classics'] },
  { id: 'mencius', ascii: 'mencius', unicode: 'Mèngzǐ', greek: '孟子', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Philosopher, Human Nature', meaning: 'Master Meng', sources: ['Mencius', 'Chinese classics'] },
  { id: 'mozi', ascii: 'mozi', unicode: 'Mòzǐ', greek: '墨子', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Philosopher, Universal Love', meaning: 'Master Mo', sources: ['Mozi', 'Chinese classics'] },
  { id: 'laojun', ascii: 'laojun', unicode: 'Lǎojūn', greek: '老君', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Deified Laozi, Supreme', meaning: 'Old lord', sources: ['Daoist Canon', 'Chinese classics'] },
  { id: 'sanzang', ascii: 'sanzang', unicode: 'Sānzàng', greek: '三藏', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Tripitaka Master, Journey', meaning: 'Three baskets', sources: ['Journey to the West', 'Chinese Buddhist texts'] },
  { id: 'bodhidharma', ascii: 'bodhidharma', unicode: 'Bodhidharma', greek: '菩提達磨', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Zen Patriarch, Wall-Gazer', meaning: 'Dharma of awakening', sources: ['Chan texts', 'Chinese Buddhist texts'] },
  { id: 'wudang', ascii: 'wudang', unicode: 'Wǔdāng', greek: '武當', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Sacred Mountain, Martial Arts', meaning: 'Military balance', sources: ['Daoist Canon', 'Chinese folklore'] },
  { id: 'wutai', ascii: 'wutai', unicode: 'Wǔtái', greek: '五臺', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Sacred Mountain, Manjushri', meaning: 'Five terraces', sources: ['Chinese Buddhist texts', 'Chinese folklore'] },
  { id: 'putuo', ascii: 'putuo', unicode: 'Pǔtuó', greek: '普陀', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Sacred Mountain, Guanyin', meaning: 'Potalaka', sources: ['Chinese Buddhist texts', 'Chinese folklore'] },
  { id: 'emei', ascii: 'emei', unicode: 'Éméi', greek: '峨眉', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Sacred Mountain, Samantabhadra', meaning: 'High eyebrow', sources: ['Chinese Buddhist texts', 'Chinese folklore'] },
  { id: 'jiuhua', ascii: 'jiuhua', unicode: 'Jiǔhuá', greek: '九華', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Sacred Mountain, Ksitigarbha', meaning: 'Nine splendors', sources: ['Chinese Buddhist texts', 'Chinese folklore'] },
  { id: 'lingbao', ascii: 'lingbao', unicode: 'Língbǎo', greek: '靈寶', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Numinous Treasure, Dao', meaning: 'Spiritual treasure', sources: ['Daoist Canon', 'Chinese classics'] },
  { id: 'shangqing', ascii: 'shangqing', unicode: 'Shàngqīng', greek: '上清', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Supreme Clarity, Dao', meaning: 'Supreme purity', sources: ['Daoist Canon', 'Chinese classics'] },
  { id: 'quanzhen', ascii: 'quanzhen', unicode: 'Quánzhēn', greek: '全真', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Complete Perfection, Dao', meaning: 'Complete reality', sources: ['Daoist Canon', 'Chinese classics'] },
  { id: 'wenshu', ascii: 'wenshu', unicode: 'Wénshū', greek: '文殊', pantheon: 'chinese', tier: '2', tierLabel: 'Tier 2', domain: 'Manjushri in Chinese', meaning: 'Cultured mystery', sources: ['Chinese Buddhist texts', 'Chinese classics'] },

  // ==========================================
  // SACRED PLACES (~15 entries) — cross-pantheon
  // ==========================================
  { id: 'delphi', ascii: 'delphi', unicode: 'Delphí', greek: 'Δελφοί', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Oracle, Apollo, Navel of Earth', meaning: 'Womb', sources: ['Pausanias', 'LSJ'] },
  { id: 'olympia', ascii: 'olympia', unicode: 'Olympía', greek: 'Ὀλυμπία', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Games, Zeus, Sanctuary', meaning: 'Of Olympus', sources: ['Pausanias', 'LSJ'] },
  { id: 'eleusis', ascii: 'eleusis', unicode: 'Eleusís', greek: 'Ἐλευσίς', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Mysteries, Demeter, Initiation', meaning: 'Arrival', sources: ['Pausanias', 'LSJ'] },
  { id: 'knossos', ascii: 'knossos', unicode: 'Knōssós', greek: 'Κνωσσός', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Palace, Minotaur, Labyrinth', meaning: 'Unknown', sources: ['Herodotus', 'LSJ'] },
  { id: 'uppsala', ascii: 'uppsala', unicode: 'Uppsala', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Temple, Freyr, Sacred Grove', meaning: 'Upper halls', sources: ['Adam of Bremen', 'Cleasby-Vigfusson'] },
  { id: 'karnak', ascii: 'karnak', unicode: 'Karnak', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Temple Complex, Amun', meaning: 'Fortified village', sources: ['Egyptology', 'Faulkner'] },
  { id: 'luxor', ascii: 'luxor', unicode: 'Luxor', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Temple, Thebes, Amun', meaning: 'The palaces', sources: ['Egyptology', 'Faulkner'] },
  { id: 'varanasi', ascii: 'varanasi', unicode: 'Vārāṇasī', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Sacred City, Shiva, Ganges', meaning: 'Between Varana and Asi', sources: ['MW', 'Puranas'] },
  { id: 'kailasa', ascii: 'kailasa', unicode: 'Kailāsa', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Sacred Mountain, Shiva', meaning: 'Crystal', sources: ['MW', 'Puranas'] },
  { id: 'meru', ascii: 'meru', unicode: 'Meru', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Cosmic Mountain, Axis Mundi', meaning: 'High, eminent', sources: ['MW', 'Puranas'] },
  { id: 'benares', ascii: 'benares', unicode: 'Benarés', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Sacred City, Alternative name', meaning: 'Same as Varanasi', sources: ['MW', 'Puranas'] },
  { id: 'ganges', ascii: 'ganges', unicode: 'Gaṅgā', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Sacred River, Purification', meaning: 'The swift-goer', sources: ['MW', 'Puranas'] },
  { id: 'yamuna', ascii: 'yamuna', unicode: 'Yamunā', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Sacred River, Twin of Yama', meaning: 'Twin', sources: ['MW', 'Puranas'] },
  { id: 'sarnath', ascii: 'sarnath', unicode: 'Sarnath', greek: '—', pantheon: 'buddhist', tier: '2', tierLabel: 'Tier 2', domain: 'First Sermon, Deer Park', meaning: 'Lord of the deer', sources: ['Buddhist texts', 'MW'] },
  { id: 'lumbini', ascii: 'lumbini', unicode: 'Lumbinī', greek: '—', pantheon: 'buddhist', tier: '1', tierLabel: 'Tier 1', domain: 'Birthplace of Buddha', meaning: 'The lovely', sources: ['Buddhist texts', 'MW'] },

  // ==========================================
  // MORE GREEK (~15 entries)
  // ==========================================
  { id: 'aeolus', ascii: 'aeolus', unicode: 'Aíolos', greek: 'Αἴολος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Winds, Keeper', meaning: 'Changeable, nimble', sources: ['Homer', 'LSJ'] },
  { id: 'boreas', ascii: 'boreas', unicode: 'Boreás', greek: 'Βορέας', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'North Wind', meaning: 'The devouring one', sources: ['Homer', 'LSJ'] },
  { id: 'notos', ascii: 'notos', unicode: 'Nótos', greek: 'Νότος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'South Wind', meaning: 'The moist one', sources: ['Homer', 'LSJ'] },
  { id: 'eurus', ascii: 'eurus', unicode: 'Eûros', greek: 'Εὖρος', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'East Wind', meaning: 'The burning one', sources: ['Homer', 'LSJ'] },
  { id: 'zephyros', ascii: 'zephyros', unicode: 'Zéphyros', greek: 'Ζέφυρος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'West Wind', meaning: 'The west wind', sources: ['Homer', 'LSJ'] },
  { id: 'momos', ascii: 'momos', unicode: 'Mómos', greek: 'Μόμος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Blame, Mockery, Criticism', meaning: 'Blame, disgrace', sources: ['Hesiod', 'LSJ'] },
  { id: 'oizys', ascii: 'oizys', unicode: 'Oizýs', greek: 'Ὀιζύς', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Misery, Pain, Distress', meaning: 'Misery', sources: ['Hesiod', 'LSJ'] },
  { id: 'alastor', ascii: 'alastor', unicode: 'Alástōr', greek: 'Ἀλάστωρ', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Avenging Spirit, Nemesis', meaning: 'The unforgetting', sources: ['Aeschylus', 'LSJ'] },
  { id: 'ephiales', ascii: 'ephiales', unicode: 'Ephiálēs', greek: 'Ἐφιάλης', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Nightmare, Demon', meaning: 'The leaper', sources: ['Hesiod', 'LSJ'] },
  { id: 'ponosgreek', ascii: 'ponosgreek', unicode: 'Pónos', greek: 'Πόνος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Toil, Labor, Pain', meaning: 'Toil, labor', sources: ['Hesiod', 'LSJ'] },
  { id: 'limos', ascii: 'limos', unicode: 'Līmós', greek: 'Λιμός', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Famine, Starvation', meaning: 'Hunger, famine', sources: ['Hesiod', 'LSJ'] },
  { id: 'phthonus', ascii: 'phthonus', unicode: 'Phthónos', greek: 'Φθόνος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Envy, Jealousy', meaning: 'Envy, malice', sources: ['Hesiod', 'LSJ'] },
  { id: 'alecto', ascii: 'alecto', unicode: 'Aléktō', greek: 'Ἀληκτώ', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Fury, Unceasing Anger', meaning: 'The unceasing', sources: ['Aeschylus', 'LSJ'] },
  { id: 'megaera', ascii: 'megaera', unicode: 'Megáira', greek: 'Μέγαιρα', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Fury, Jealousy', meaning: 'The jealous one', sources: ['Aeschylus', 'LSJ'] },
  { id: 'tisiphone', ascii: 'tisiphone', unicode: 'Tisíphonē', greek: 'Τισιφόνη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Fury, Avenging Murder', meaning: 'Avenging murder', sources: ['Aeschylus', 'LSJ'] },

  // ==========================================
  // MORE HINDU (~10 entries)
  // ==========================================
  { id: 'sarasvati', ascii: 'sarasvati', unicode: 'Sarasvatī', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Knowledge, Music, River', meaning: 'The flowing one', sources: ['MW', 'RV'] },
  { id: 'lakshmi', ascii: 'lakshmi', unicode: 'Lakṣmī', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Wealth, Fortune, Beauty', meaning: 'Sign, mark', sources: ['MW', 'Puranas'] },
  { id: 'parvati', ascii: 'parvati', unicode: 'Pārvatī', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Mountains, Consort of Shiva', meaning: 'Daughter of the mountain', sources: ['MW', 'Puranas'] },
  { id: 'durga', ascii: 'durga', unicode: 'Durgā', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Protection, Strength, Warrior', meaning: 'The inaccessible', sources: ['MW', 'Devi Mahatmya'] },
  { id: 'kali', ascii: 'kali', unicode: 'Kālī', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Time, Destruction, Transformation', meaning: 'The black one', sources: ['MW', 'Puranas'] },
  { id: 'chamunda', ascii: 'chamunda', unicode: 'Cāmuṇḍā', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Death, Destruction, Yogini', meaning: 'Slayer of Chanda', sources: ['MW', 'Devi Mahatmya'] },
  { id: 'ganga', ascii: 'ganga', unicode: 'Gangā', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Sacred River, Purification', meaning: 'The swift-goer', sources: ['MW', 'Puranas'] },
  { id: 'sita', ascii: 'sita', unicode: 'Sītā', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Devotion, Purity, Earth', meaning: 'Furrow', sources: ['MW', 'Ramayana'] },
  { id: 'hanuman', ascii: 'hanuman', unicode: 'Hanumān', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Devotion, Strength, Wind', meaning: 'Large jawed', sources: ['MW', 'Ramayana'] },
  { id: 'ravana', ascii: 'ravana', unicode: 'Rāvaṇa', greek: '—', pantheon: 'sanskrit', tier: '1', tierLabel: 'Tier 1', domain: 'Ten-Headed King, Lanka', meaning: 'The screamer', sources: ['MW', 'Ramayana'] },

  // ==========================================
  // MORE NORSE (~10 entries)
  // ==========================================
  { id: 'vidarr', ascii: 'vidarr', unicode: 'Víðarr', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Vengeance, Silence, Forest', meaning: 'The wide-ruler', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'ullr', ascii: 'ullr', unicode: 'Ullr', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Skiing, Hunting, Shield', meaning: 'Glory', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'nal', ascii: 'nal', unicode: 'Nál', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Needle, Mother of Loki', meaning: 'Needle', sources: ['Prose Edda', 'Cleasby-Vigfusson'] },
  { id: 'sigyn', ascii: 'sigyn', unicode: 'Sigyn', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Loyalty, Wife of Loki', meaning: 'Victorious girl-friend', sources: ['Prose Edda', 'Cleasby-Vigfusson'] },
  { id: 'angrboda', ascii: 'angrboda', unicode: 'Angrboða', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Monster Mother, Sorcery', meaning: 'She who offers sorrow', sources: ['Prose Edda', 'Cleasby-Vigfusson'] },
  { id: 'fenrir', ascii: 'fenrir', unicode: 'Fenrir', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Wolf, Doom of Odin', meaning: 'He who dwells in the fen', sources: ['Prose Edda', 'Cleasby-Vigfusson'] },
  { id: 'jormungandr', ascii: 'jormungandr', unicode: 'Jörmungandr', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'World Serpent, Ocean', meaning: 'Huge monster', sources: ['Prose Edda', 'Cleasby-Vigfusson'] },
  { id: 'surt', ascii: 'surt', unicode: 'Surt', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Fire Giant, Ragnarok', meaning: 'The black one', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'ymir', ascii: 'ymir', unicode: 'Ymir', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Primordial Giant, Creation', meaning: 'The screaming one', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'bestla', ascii: 'bestla', unicode: 'Bestla', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Mother of Odin, Giantess', meaning: 'Bark, bast', sources: ['Prose Edda', 'Cleasby-Vigfusson'] },

  // ==========================================
  // MORE EGYPTIAN (~8 entries)
  // ==========================================
  { id: 'kebechet', ascii: 'kebechet', unicode: 'Kebehet', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Embalming, Purification', meaning: 'The cooling water', sources: ['Faulkner', 'Wb'] },
  { id: 'serapis', ascii: 'serapis', unicode: 'Serapis', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Syncretic God, Underworld', meaning: 'Composite of Osiris and Apis', sources: ['Faulkner', 'Wb'] },
  { id: 'harpokrates', ascii: 'harpokrates', unicode: 'Harpokrátēs', greek: '—', pantheon: 'egyptian', tier: '1', tierLabel: 'Tier 1', domain: 'Child Horus, Silence', meaning: 'Horus the child', sources: ['Faulkner', 'Wb'] },
  { id: 'onuris', ascii: 'onuris', unicode: 'Onuris', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'War, Hunting', meaning: 'He who brings back the distant one', sources: ['Faulkner', 'Wb'] },
  { id: 'montu', ascii: 'montu', unicode: 'Mnṯw', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'War, Falcon', meaning: 'The nomad', sources: ['Faulkner', 'Wb'] },
  { id: 'ptah', ascii: 'ptah', unicode: 'Ptḥ', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Creation, Craftsmen, Memphis', meaning: 'The opener', sources: ['Faulkner', 'Wb'] },
  { id: 'sokar', ascii: 'sokar', unicode: 'Skr', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Death, Memphis, Underworld', meaning: 'The mysterious one', sources: ['Faulkner', 'Wb'] },
  { id: 'taweret', ascii: 'taweret', unicode: 'Tꜣ-wr.t', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Childbirth, Protection', meaning: 'The great one', sources: ['Faulkner', 'Wb'] },

  // ==========================================
  // MORE CELTIC (~8 entries)
  // ==========================================
  { id: 'cernunnos', ascii: 'cernunnos', unicode: 'Cernunnos', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Horned God, Nature, Animals', meaning: 'The horned one', sources: ['Gallo-Roman inscriptions', 'MacKillop'] },
  { id: 'esengraim', ascii: 'esengraim', unicode: 'Esengráin', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Sun, Healing', meaning: 'Beloved of the sun', sources: ['Irish folklore', 'MacKillop'] },
  { id: 'ecne', ascii: 'ecne', unicode: 'Ecne', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Knowledge, Wisdom', meaning: 'Knowledge', sources: ['Irish folklore', 'MacKillop'] },
  { id: 'midir', ascii: 'midir', unicode: 'Midir', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Underworld, Fairy King', meaning: 'Judge', sources: ['Irish folklore', 'MacKillop'] },
  { id: 'etain', ascii: 'etain', unicode: 'Étaín', greek: '—', pantheon: 'celtic', tier: '1', tierLabel: 'Tier 1', domain: 'Beauty, Shapeshifting', meaning: 'Jealousy', sources: ['Irish folklore', 'MacKillop'] },
  { id: 'deirdre', ascii: 'deirdre', unicode: 'Deirdre', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Tragedy, Beauty', meaning: 'Sorrowful', sources: ['Irish folklore', 'MacKillop'] },
  { id: 'niamh', ascii: 'niamh', unicode: 'Niamh', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Beauty, Otherworld', meaning: 'Bright, radiant', sources: ['Irish folklore', 'MacKillop'] },
  { id: 'oisin', ascii: 'oisin', unicode: 'Oisín', greek: '—', pantheon: 'celtic', tier: '2', tierLabel: 'Tier 2', domain: 'Poet, Warrior, Son of Finn', meaning: 'Little fawn', sources: ['Irish folklore', 'MacKillop'] },

  // ==========================================
  // MORE JAPANESE (~5 entries)
  // ==========================================
  { id: 'benzaiten', ascii: 'benzaiten', unicode: 'Benzaiten', greek: '弁才天', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Music, Wealth, Water', meaning: 'Argument talent heaven', sources: ['Japanese folklore', 'Buddhist texts'] },
  { id: 'fudo', ascii: 'fudo', unicode: 'Fudō', greek: '不動明王', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Immovable Wisdom King', meaning: 'Immovable', sources: ['Japanese Buddhism', 'Buddhist texts'] },
  { id: 'marishiten', ascii: 'marishiten', unicode: 'Marishiten', greek: '摩利支天', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'War, Invisibility, Sun', meaning: 'Marici in Japanese', sources: ['Japanese Buddhism', 'Buddhist texts'] },
  { id: 'goshin', ascii: 'goshin', unicode: 'Goshin', greek: '五神', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Five Deities, Protection', meaning: 'Five gods', sources: ['Shinto', 'Japanese folklore'] },
  { id: 'inari', ascii: 'inari', unicode: 'Inari', greek: '稲荷', pantheon: 'japanese', tier: '2', tierLabel: 'Tier 2', domain: 'Rice, Fertility, Foxes', meaning: 'Rice load', sources: ['Shinto', 'Japanese folklore'] },

  // ==========================================
  // MORE MESOPOTAMIAN (~5 entries)
  // ==========================================
  { id: 'nabu', ascii: 'nabu', unicode: 'Nabû', greek: '—', pantheon: 'mesopotamian', tier: '1', tierLabel: 'Tier 1', domain: 'Wisdom, Writing', meaning: 'The announcer', sources: ['ETCSL', 'Black-Green'] },
  { id: 'marduk', ascii: 'marduk', unicode: 'Marduk', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Storm, King of Gods', meaning: 'Solar calf', sources: ['Enuma Elish', 'Black-Green'] },
  { id: 'gula', ascii: 'gula', unicode: 'Gula', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Healing, Medicine', meaning: 'The great one', sources: ['ETCSL', 'Black-Green'] },
  { id: 'nergal', ascii: 'nergal', unicode: 'Nergal', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'War, Pestilence, Underworld', meaning: 'Lord of the great city', sources: ['ETCSL', 'Black-Green'] },
  { id: 'namtar', ascii: 'namtar', unicode: 'Namtar', greek: '—', pantheon: 'mesopotamian', tier: '2', tierLabel: 'Tier 2', domain: 'Fate, Death Demon', meaning: 'Fate, destiny', sources: ['ETCSL', 'Black-Green'] },

  // ==========================================
  // MORE SLAVIC (~5 entries)
  // ==========================================
  { id: 'veles', ascii: 'veles', unicode: 'Veles', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Cattle, Underworld, Magic', meaning: 'Hairy, wooly', sources: ['Slavic folklore', ' mythology'] },
  { id: 'perun', ascii: 'perun', unicode: 'Perun', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Thunder, Oak, War', meaning: 'The striker', sources: ['Slavic folklore', ' mythology'] },
  { id: 'dazhbog', ascii: 'dazhbog', unicode: 'Daždbog', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Sun, Giving God', meaning: 'Giving god', sources: ['Slavic folklore', ' mythology'] },
  { id: 'svarog', ascii: 'svarog', unicode: 'Svarog', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Sky, Smithing, Fire', meaning: 'Bright, clear', sources: ['Slavic folklore', ' mythology'] },
  { id: 'stribog', ascii: 'stribog', unicode: 'Stribog', greek: '—', pantheon: 'slavic', tier: '2', tierLabel: 'Tier 2', domain: 'Winds, Sky', meaning: 'Paternal god', sources: ['Slavic folklore', ' mythology'] },

  // ==========================================
  // MORE NAHUATL (~5 entries)
  // ==========================================
  { id: 'toci', ascii: 'toci', unicode: 'Tocî', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Healing, Childbirth', meaning: 'Our grandmother', sources: ['Florentine Codex', 'Nahuatl dictionary'] },
  { id: 'itzpapalotl', ascii: 'itzpapalotl', unicode: 'Itzpapálōtl', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Obsidian Butterfly, Stars', meaning: 'Obsidian butterfly', sources: ['Florentine Codex', 'Nahuatl dictionary'] },
  { id: 'tezcatlipoca', ascii: 'tezcatlipoca', unicode: 'Tezcatlipōca', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Smoking Mirror, Night, Sorcery', meaning: 'Smoking mirror', sources: ['Florentine Codex', 'Nahuatl dictionary'] },
  { id: 'quetzalcoatl', ascii: 'quetzalcoatl', unicode: 'Quetzalcōātl', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'Feathered Serpent, Wind, Morning Star', meaning: 'Feathered serpent', sources: ['Florentine Codex', 'Nahuatl dictionary'] },
  { id: 'huitzilopochtli', ascii: 'huitzilopochtli', unicode: 'Huītzilōpōchtli', greek: '—', pantheon: 'nahuatl', tier: '1', tierLabel: 'Tier 1', domain: 'War, Sun, Hummingbird', meaning: 'Left-handed hummingbird', sources: ['Florentine Codex', 'Nahuatl dictionary'] },

  // ==========================================
  // MORE POLYNESIAN (~5 entries)
  // ==========================================
  { id: 'pele', ascii: 'pele', unicode: 'Pele', greek: '—', pantheon: 'polynesian', tier: '2', tierLabel: 'Tier 2', domain: 'Volcano, Fire, Hawaii', meaning: 'Molten lava', sources: ['Hawaiian folklore', 'Polynesian mythology'] },
  { id: 'kamapuaa', ascii: 'kamapuaa', unicode: 'Kamapuaa', greek: '—', pantheon: 'polynesian', tier: '2', tierLabel: 'Tier 2', domain: 'Pig God, Lover of Pele', meaning: 'Pig child', sources: ['Hawaiian folklore', 'Polynesian mythology'] },
  { id: 'maui', ascii: 'maui', unicode: 'Māui', greek: '—', pantheon: 'polynesian', tier: '1', tierLabel: 'Tier 1', domain: 'Trickster, Fisher of Islands', meaning: 'The left hand', sources: ['Polynesian folklore', 'Polynesian mythology'] },
  { id: 'tangaroa', ascii: 'tangaroa', unicode: 'Tangaroa', greek: '—', pantheon: 'polynesian', tier: '2', tierLabel: 'Tier 2', domain: 'Sea, Fish, Creation', meaning: 'The clear sea', sources: ['Maori folklore', 'Polynesian mythology'] },
  { id: 'tane', ascii: 'tane', unicode: 'Tāne', greek: '—', pantheon: 'polynesian', tier: '1', tierLabel: 'Tier 1', domain: 'Forest, Birds, Light', meaning: 'The man', sources: ['Maori folklore', 'Polynesian mythology'] },

  // ==========================================
  // MORE YORUBA (~5 entries)
  // ==========================================
  { id: 'oshun', ascii: 'oshun', unicode: 'Oṣun', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'River, Love, Sweet Waters', meaning: 'The source', sources: ['Yoruba folklore', 'African mythology'] },
  { id: 'oya', ascii: 'oya', unicode: 'Oyá', greek: '—', pantheon: 'yoruba', tier: '1', tierLabel: 'Tier 1', domain: 'Wind, Storm, Change', meaning: 'She who tore', sources: ['Yoruba folklore', 'African mythology'] },
  { id: 'yemoja', ascii: 'yemoja', unicode: 'Yemọja', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Ocean, Motherhood', meaning: 'Mother of fish', sources: ['Yoruba folklore', 'African mythology'] },
  { id: 'obatala', ascii: 'obatala', unicode: 'Obatala', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Creation, Purity, Elder', meaning: 'King of the white cloth', sources: ['Yoruba folklore', 'African mythology'] },
  { id: 'shango', ascii: 'shango', unicode: 'Ṣàngó', greek: '—', pantheon: 'yoruba', tier: '2', tierLabel: 'Tier 2', domain: 'Thunder, Fire, Justice', meaning: 'The striker', sources: ['Yoruba folklore', 'African mythology'] },

  // ==========================================
  // MORE ZOROASTRIAN (~3 entries)
  // ==========================================
  { id: 'athrawan', ascii: 'athrawan', unicode: 'Āθrauuan', greek: '—', pantheon: 'zoroastrian', tier: '2', tierLabel: 'Tier 2', domain: 'Fire Priest, Ritual', meaning: 'Fire-possessing', sources: ['Avesta', 'Gathas'] },
  { id: 'haoma', ascii: 'haoma', unicode: 'Haoma', greek: '—', pantheon: 'zoroastrian', tier: '2', tierLabel: 'Tier 2', domain: 'Sacred Plant, Immortality', meaning: 'The pressed one', sources: ['Avesta', 'Gathas'] },
  { id: 'verethragna', ascii: 'verethragna', unicode: 'Vərəθraγna', greek: '—', pantheon: 'zoroastrian', tier: '2', tierLabel: 'Tier 2', domain: 'Victory, War', meaning: 'Smiting of resistance', sources: ['Avesta', 'Yasht'] },

  // ==========================================
  // MORE INCAN (~3 entries)
  // ==========================================
  { id: 'viracocha', ascii: 'viracocha', unicode: 'Viracocha', greek: '—', pantheon: 'incan', tier: '2', tierLabel: 'Tier 2', domain: 'Creator, Sun, Sea Foam', meaning: 'Sea of fat', sources: ['Incan sources', 'Andean mythology'] },
  { id: 'inti', ascii: 'inti', unicode: 'Inti', greek: '—', pantheon: 'incan', tier: '2', tierLabel: 'Tier 2', domain: 'Sun, Emperor', meaning: 'The sun', sources: ['Incan sources', 'Andean mythology'] },
  { id: 'pachamama', ascii: 'pachamama', unicode: 'Pachamama', greek: '—', pantheon: 'incan', tier: '2', tierLabel: 'Tier 2', domain: 'Earth, Mother', meaning: 'Earth mother', sources: ['Incan sources', 'Andean mythology'] },
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
