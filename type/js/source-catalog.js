/**
 * PUNICODEX — Source Catalog
 * Rich citation metadata for scholarly reference works.
 */

const SOURCE_CATALOG = {
    'Iliad': {
        full: 'Homer, Iliad',
        scope: 'Greek epic (Trojan War cycle)',
        year: '-750',
        edition: 'Oxford Classical Texts (Monro & Allen); Loeb',
        url: 'https://www.perseus.tufts.edu/hopper/text?doc=Hom.+Il.'
    },
    'Homeric Hymns': {
        full: 'Homeric Hymns',
        scope: 'Greek cult hymns (6th c. BCE)',
        year: '-550',
        edition: 'Oxford Classical Texts (Allen); Loeb'
    },
    'Apollodorus': {
        full: 'Apollodorus, Bibliotheca',
        scope: 'Greek mythographic compendium (1st–2nd c. CE)',
        year: '150',
        edition: 'Loeb Classical Library (Frazer)'
    },
    'Ctesias': {
        full: 'Ctesias of Knidos, Indika',
        scope: 'Greek ethnography of India (fragments)',
        year: '-398',
        edition: 'Photius, Bibliotheca epitome; ed. Bigwood'
    },
    'Pliny': {
        full: 'Pliny the Elder, Naturalis Historia',
        scope: 'Roman encyclopedia (77 CE)',
        year: '77',
        edition: 'Loeb Classical Library'
    },
    'Polybius': {
        full: 'Polybius, Histories',
        scope: 'Greek history of Rome (2nd c. BCE)',
        year: '-146',
        edition: 'Loeb Classical Library (Paton)'
    },
    'Lewis & Short': {
        full: 'Lewis & Short, A Latin Dictionary',
        scope: 'Latin lexicon',
        year: '1879',
        edition: 'Oxford, Clarendon Press; Perseus digitization',
        url: 'https://logeion.uchicago.edu/'
    },
    'Varro': {
        full: 'Varro, De Lingua Latina / Antiquitates Rerum Divinarum',
        scope: 'Roman antiquarian philology and religion',
        year: '-45',
        edition: 'Loeb Classical Library'
    },
    'Horace': {
        full: 'Horace, Carmina / Opera',
        scope: 'Roman lyric poetry',
        year: '-23',
        edition: 'Oxford Classical Texts; Loeb'
    },
    'Macrobius': {
        full: 'Macrobius, Saturnalia',
        scope: 'Late-antique Roman antiquarian miscellany',
        year: '430',
        edition: 'Loeb Classical Library (Kaster)'
    },
    'Ennius': {
        full: 'Ennius, Annales',
        scope: 'Early Roman epic (fragments)',
        year: '-180',
        edition: 'ed. Skutsch, The Annals of Q. Ennius (1985)'
    },
    'Te Velde': {
        full: 'H. te Velde, Seth, God of Confusion',
        scope: 'Egyptian religion monograph (Seth)',
        year: '1967',
        edition: 'Brill, Probleme der Ägyptologie 6'
    },
    'Bonneau': {
        full: 'D. Bonneau, La Crue du Nil',
        scope: 'Egyptian Nile flood cult study',
        year: '1964',
        edition: 'Librairie C. Klincksieck, Paris'
    },
    'Rigveda': {
        full: 'Ṛgveda Saṃhitā',
        scope: 'Vedic Sanskrit hymn collection',
        year: '-1200',
        edition: 'Aufrecht; van Nooten & Holland metric text; GRETIL',
        url: 'https://gretil.sub.uni-goettingen.de/gretil.html'
    },
    'Chinese folk religion': {
        full: 'Chinese folk religion (regional cults and underworld traditions)',
        scope: 'Chinese vernacular religion',
        year: 'ongoing',
        edition: 'documented across temple and funerary practice'
    },
    'Werner': {
        full: 'E. T. C. Werner, Myths and Legends of China',
        scope: 'Chinese mythology compendium',
        year: '1922',
        edition: 'George G. Harrap & Co.; Project Gutenberg digitization'
    },
    'Sanguozhi': {
        full: 'Chen Shou, Sanguozhi (Records of the Three Kingdoms)',
        scope: 'Chinese dynastic history (3rd c.)',
        year: '289',
        edition: 'Zhonghua Shuju critical edition'
    },
    'Xu Zheng': {
        full: 'Xu Zheng, Sanwu Liji (Historical Records of the Three Sovereigns and Five Emperors)',
        scope: 'Chinese cosmogony source text (Pángǔ)',
        year: '260',
        edition: 'as preserved in later encyclopedias (Taiping Yulan)'
    },
    'Birrell': {
        full: 'Anne Birrell, Chinese Mythology: An Introduction',
        scope: 'Chinese mythology reference',
        year: '1993',
        edition: 'Johns Hopkins University Press'
    },
    'Grey, Polynesian Mythology': {
        full: 'Sir George Grey, Polynesian Mythology',
        scope: 'Māori and Polynesian tradition (English/Māori text)',
        year: '1855',
        edition: 'John Murray, London; New Zealand Electronic Text Centre',
        url: 'https://nzetc.victoria.ac.nz/'
    },
    'Kokugo dictionaries': {
        full: 'Kokugo dictionaries (Nihon Kokugo Daijiten / Kōjien / Daijisen)',
        scope: 'Japanese national-language lexicography',
        year: 'various',
        edition: 'Shōgakukan / Sanseidō'
    },
    'Fengshen Yanyi': {
        full: 'Fēngshén Yǎnyì (Investiture of the Gods)',
        scope: 'Chinese Ming-dynasty mythological novel',
        year: '1600',
        edition: 'various; English abridgment as Creation of the Gods'
    },
    'Chinese Buddhist canon': {
        full: 'Chinese Buddhist canon (Dàzàngjīng / Taishō Tripiṭaka)',
        scope: 'East Asian Buddhist scriptural corpus',
        year: '1924',
        edition: 'Taishō Shinshū Daizōkyō (SAT digitization)'
    },
    'Teiser': {
        full: 'Stephen F. Teiser, The Ghost Festival in Medieval China',
        scope: 'Chinese underworld and afterlife studies',
        year: '1988',
        edition: 'Princeton University Press'
    },

    'Abhidharmakośa': {
        full: 'Abhidharmakośabhāṣya (Treasury of Abhidharma)',
        scope: 'Sanskrit Buddhist scholastic text',
        year: '400',
        edition: 'Vasubandhu; GRETIL text based on the Pradhan edition',
        url: 'https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/html/sa_vasubandhu-abhidharmakoza.htm'
    },
    'Abraham': {
        full: 'Abraham (biblical patriarch / Genesis narrative)',
        scope: 'Hebrew Bible / Abrahamic tradition',
        year: '-1000',
        edition: 'Book of Genesis'
    },
    'Acallam na Senórach': {
        full: 'Acallam na Senórach (The Colloquy of the Ancients)',
        scope: 'Irish Fenian Cycle',
        year: '1200',
        edition: 'ed. Whitley Stokes, Irische Texte IV (1900); trans. Dooley & Roe, Oxford World\'s Classics (1999)',
        url: 'https://celt.ucc.ie/'
    },
    'Adam of Bremen': {
        full: 'Adam of Bremen, Gesta Hammaburgensis Ecclesiae Pontificum',
        scope: 'Medieval Norse / Germanic history',
        year: '1076',
        edition: 'ed. Bernhard Schmeidler, Hahnsche Buchhandlung (1917)',
        url: 'https://sacred-texts.com/neu/index.htm'
    },
    'Aeschylus': {
        full: 'Aeschylus, Tragedies',
        scope: 'Greek tragedy',
        year: '-456',
        edition: 'Loeb Classical Library / Oxford Classical Texts',
        url: 'https://catalog.perseus.org/catalog/urn:cts:greekLit:tlg0085'
    },
    'AHw': {
        full: 'Akkadisches Handwörterbuch',
        scope: 'Akkadian lexicon',
        year: '1965',
        edition: '3 vols., Harrassowitz, Wiesbaden (completed 1981)'
    },
    'AIATSIS': {
        full: 'Australian Institute of Aboriginal and Torres Strait Islander Studies',
        scope: 'Australian Indigenous studies and authority files',
        year: '1964',
        edition: 'Canberra',
        url: 'https://aiatsis.gov.au/'
    },
    'AirWb': {
        full: 'Altiranisches Wörterbuch',
        scope: 'Old Iranian / Avestan lexicon',
        year: '1904',
        edition: 'Strassburg: Trübner'
    },
    'Allen': {
        full: 'James P. Allen, Middle Egyptian: An Introduction to the Language and Culture of Hieroglyphs',
        scope: 'Middle Egyptian grammar and lexicon',
        year: '2000',
        edition: 'Cambridge University Press',
        url: 'https://www.cambridge.org/'
    },
    'Allen, Middle Egyptian': {
        full: 'James P. Allen, Middle Egyptian: An Introduction to the Language and Culture of Hieroglyphs',
        scope: 'Middle Egyptian grammar and lexicon',
        year: '2000',
        edition: 'Cambridge University Press',
        url: 'https://www.cambridge.org/'
    },
    'Analects': {
        full: 'Analects (Lunyu)',
        scope: 'Confucian dialogues',
        year: '-500',
        edition: 'Confucius; Chinese Text Project',
        url: 'https://ctext.org/analects'
    },
    'Anaxagoras': {
        full: 'Anaxagoras of Clazomenae, fragments',
        scope: 'Presocratic Greek philosophy',
        year: '-428',
        edition: 'Diels-Kranz 59',
        url: 'https://plato.stanford.edu/entries/anaxagoras/'
    },
    'Anaximander': {
        full: 'Anaximander of Miletus, fragments',
        scope: 'Presocratic Greek philosophy',
        year: '-546',
        edition: 'Diels-Kranz 12',
        url: 'https://plato.stanford.edu/entries/anaximander/'
    },
    'Anaximenes': {
        full: 'Anaximenes of Miletus, fragments',
        scope: 'Presocratic Greek philosophy',
        year: '-528',
        edition: 'Diels-Kranz 13',
        url: 'https://plato.stanford.edu/entries/anaximenes/'
    },
    'Apollonius': {
        full: 'Apollonius Rhodius, Argonautica',
        scope: 'Greek epic poetry',
        year: '-200',
        edition: 'Loeb Classical Library',
        url: 'https://catalog.perseus.org/catalog/urn:cts:greekLit:tlg0001'
    },
    'Aristotle': {
        full: 'Aristotle, collected works',
        scope: 'Greek philosophy',
        year: '-322',
        edition: 'Loeb Classical Library / Oxford Classical Texts',
        url: 'https://catalog.perseus.org/catalog/urn:cts:greekLit:tlg0086'
    },
    'Arthurian legend': {
        full: 'Arthurian legend / Matter of Britain',
        scope: 'Medieval romance and Celtic-British legend',
        year: '1136',
        edition: 'Geoffrey of Monmouth, Chrétien de Troyes, the Vulgate Cycle, Malory, etc.',
        url: 'https://www.britannica.com/topic/Arthurian-legend'
    },
    'Avatamsaka Sutra': {
        full: 'Avataṃsaka Sūtra (Flower Garland Sutra)',
        scope: 'Mahāyāna Buddhist scripture',
        year: '400',
        edition: 'Translated by Thomas Cleary',
        url: 'https://www.bdkamerica.org/'
    },
    'Avesta': {
        full: 'Avesta (Zoroastrian sacred scriptures)',
        scope: 'Avestan textual corpus',
        year: '-1000',
        edition: 'Old Avestan / Young Avestan recensions',
        url: 'https://www.avesta.org/'
    },
    'Barrington': {
        full: 'Barrington Atlas of the Greek and Roman World',
        scope: 'Classical historical geography',
        year: '2000',
        edition: 'Princeton University Press',
        url: 'https://press.princeton.edu/books/hardcover/9780691031699/barrington-atlas-of-the-greek-and-roman-world'
    },
    'Bartholomae': {
        full: 'Christian Bartholomae, Altiranisches Wörterbuch',
        scope: 'Old Iranian / Avestan lexicon',
        year: '1904',
        edition: 'Strassburg: Trübner'
    },
    'Bascom': {
        full: 'William Bascom, Ifa Divination: Communication Between Gods and Men in West Africa',
        scope: 'Yoruba religion and folklore',
        year: '1969',
        edition: 'Indiana University Press'
    },
    'Bauer': {
        full: 'Walter Bauer, A Greek-English Lexicon of the New Testament and Other Early Christian Literature',
        scope: 'Biblical Greek lexicon',
        year: '1957',
        edition: 'BDAG, University of Chicago Press',
        url: 'https://www.press.uchicago.edu/ucp/books/book/chicago/B/bo3616752.html'
    },
    'Beckwith': {
        full: 'Christopher I. Beckwith, Greek Buddha: Pyrrho\'s Encounter with Early Buddhism in Central Asia',
        scope: 'Comparative history of early Buddhism',
        year: '2015',
        edition: 'Princeton University Press',
        url: 'https://press.princeton.edu/books/hardcover/9780691166445/greek-buddha'
    },
    'Beekes': {
        full: 'Etymological Dictionary of Greek',
        scope: 'Greek',
        year: '2010',
        edition: '2 vols., Brill',
        url: 'https://brill.com/view/title/17858'
    },
    'Beowulf': {
        full: 'Beowulf',
        scope: 'Old English heroic epic',
        year: '1000',
        edition: 'Klaeber\'s Beowulf, 4th ed., University of Toronto Press',
        url: 'https://www.bl.uk/collection-items/beowulf'
    },
    'Berndt': {
        full: 'Ronald M. and Catherine H. Berndt, The World of the First Australians',
        scope: 'Australian Aboriginal anthropology',
        year: '1964',
        edition: 'Aboriginal Studies Press'
    },
    'Best': {
        full: 'R. I. Best, Bibliography of Irish Philology and Manuscript Literature',
        scope: 'Celtic / Irish philology',
        year: '1913',
        edition: 'Dublin Institute for Advanced Studies / Royal Irish Academy',
        url: 'https://celt.ucc.ie/'
    },
    'Bhagavad Gita': {
        full: 'Bhagavad Gītā',
        scope: 'Sanskrit epic theosophy',
        year: '-400',
        edition: 'Translated by Annie Besant and others',
        url: 'https://sacred-texts.com/hin/gita/index.htm'
    },
    'Bhagavata': {
        full: 'Bhāgavata Purāṇa (Śrīmad-Bhāgavatam)',
        scope: 'Hindu Vaishnava purāṇa',
        year: '900',
        edition: 'Translated by A. C. Bhaktivedanta Swami Prabhupāda',
        url: 'https://vedabase.io/en/library/sb/'
    },
    'Black-Green': {
        full: 'Gods, Demons and Symbols of Ancient Mesopotamia',
        scope: 'Mesopotamian',
        year: '1992',
        edition: 'British Museum Press',
        url: 'https://www.britishmuseum.org/'
    },
    'Bosworth-Toller': {
        full: 'Joseph Bosworth and T. Northcote Toller, An Anglo-Saxon Dictionary',
        scope: 'Old English lexicon',
        year: '1898',
        edition: 'Oxford; online at Bosworth-Toller Anglo-Saxon Dictionary',
        url: 'https://bosworthtoller.com/'
    },
    'Brāhmaṇas': {
        full: 'Brāhmaṇas (Śatapatha, Aitareya, etc.)',
        scope: 'Vedic prose commentaries',
        year: '-800',
        edition: 'Sacred Books of the East',
        url: 'https://sacred-texts.com/hin/index.htm'
    },
    'Buddhist texts': {
        full: 'Buddhist canonical and commentarial literature',
        scope: 'Buddhist textual corpus',
        year: 'various',
        edition: 'Pāli, Sanskrit, Chinese, and Tibetan recensions'
    },
    'Byliny': {
        full: 'Byliny (Russian oral heroic poems)',
        scope: 'Slavic / Russian oral epic',
        year: '1000',
        edition: 'Collected in Svod russkogo folklora and regional corpora (19th-20th c.)'
    },
    'CAD': {
        full: 'The Assyrian Dictionary of the Oriental Institute of the University of Chicago',
        scope: 'Akkadian lexicon',
        year: '1956',
        edition: '21 vols., Oriental Institute, Chicago (completed 2010)',
        url: 'https://isac.uchicago.edu/research/publications/assyrian-dictionary-oriental-institute-university-chicago'
    },
    'Cambridge': {
        full: 'Cambridge Ancient History',
        scope: 'General ancient history',
        year: '1970',
        edition: 'Multiple volumes',
        url: 'https://www.cambridge.org/core/series/cambridge-ancient-history/051D3B4F5F6D7E8E9F0A1B2C3D4E5F6A'
    },
    'Cerrón-Palomino': {
        full: 'Rodolfo Cerrón-Palomino, Quechua language and Andean linguistics',
        scope: 'Andean/Quechua linguistics',
        year: '2003',
        edition: 'Various works including Lingüística aimara',
        url: 'https://www.peenywallaw.com/'
    },
    'Chan texts': {
        full: 'Chan / Zen Buddhist texts',
        scope: 'Chinese Chan literature',
        year: '800',
        edition: 'Platform Sūtra, recorded sayings (yulu), koan collections'
    },
    'CHD': {
        full: 'The Hittite Dictionary of the Oriental Institute of the University of Chicago',
        scope: 'Hittite lexicon',
        year: '1980',
        edition: 'Oriental Institute, Chicago (ongoing)',
        url: 'https://isac.uchicago.edu/research/projects/hittite-dictionary-project'
    },
    'Chinese Buddhist texts': {
        full: 'Chinese Buddhist texts (Hanwen Canon)',
        scope: 'Chinese Buddhist scripture corpus',
        year: '400',
        edition: 'CBETA / Taishō Tripiṭaka',
        url: 'https://www.cbeta.org/'
    },
    'Chinese classics': {
        full: 'Chinese classical texts',
        scope: 'Pre-Qin and Han Chinese canonical corpus',
        year: '-500',
        edition: 'Chinese Text Project',
        url: 'https://ctext.org/'
    },
    'Chinese folklore': {
        full: 'Chinese folklore',
        scope: 'Chinese folk narrative tradition',
        year: 'various',
        edition: 'Oral and compiled folk tales'
    },
    'Chinese medicine': {
        full: 'Huangdi Neijing (Yellow Emperor\'s Inner Canon)',
        scope: 'Chinese medical classic',
        year: '-200',
        edition: 'Chinese Text Project',
        url: 'https://ctext.org/huangdi-neijing'
    },
    'Cicero': {
        full: 'Cicero, Marcus Tullius — collected works',
        scope: 'Latin/Roman',
        year: '-43',
        edition: 'Loeb Classical Library',
        url: 'https://www.loebclassics.com/'
    },
    'CIS': {
        full: 'Corpus Inscriptionum Semiticarum',
        scope: 'Semitic inscriptions (Ugaritic, Phoenician, Aramaic, etc.)',
        year: '1881',
        edition: 'Académie des Inscriptions et Belles-Lettres, Paris',
        url: 'https://aibl.fr/travaux/le-cabinet-du-corpus-inscriptionum-semiticarum/'
    },
    'Cleasby-Vigfusson': {
        full: 'An Icelandic-English Dictionary',
        scope: 'Norse',
        year: '1874',
        edition: '2nd ed. with supplement',
        url: 'https://old-norse.net/'
    },
    'Coogan': {
        full: 'Michael D. Coogan, Stories from Ancient Canaan',
        scope: 'Canaanite / Ugaritic myths and texts',
        year: '1978',
        edition: 'Westminster John Knox Press, Louisville (2nd ed. 2012)',
        url: 'https://www.wjkbooks.com/Products/0664232423/stories-from-ancient-canaan.aspx'
    },
    'Crawford': {
        full: 'Peter Crawford, The War of the Three Gods: Romans, Persians and the Rise of Islam',
        scope: 'Late antique history',
        year: '2013',
        edition: 'Pen & Sword Military'
    },
    'Cross': {
        full: 'Frank Moore Cross, Canaanite Myth and Hebrew Epic: Essays in the History of the Religion of Israel',
        scope: 'Canaanite religion and its influence on Israel',
        year: '1973',
        edition: 'Harvard University Press, Cambridge, MA'
    },
    'D\'Altroy': {
        full: 'Terence N. D\'Altroy, The Incas',
        scope: 'Inca civilization',
        year: '2002',
        edition: 'Wiley-Blackwell',
        url: 'https://www.wiley.com/'
    },
    'Dao De Jing': {
        full: 'Dao De Jing (Tao Te Ching)',
        scope: 'Daoist philosophical text',
        year: '-500',
        edition: 'Laozi; Chinese Text Project',
        url: 'https://ctext.org/dao-de-jing'
    },
    'Daoist Canon': {
        full: 'Daozang (Daoist Canon)',
        scope: 'Daoist scripture collection',
        year: '1445',
        edition: 'Ming Zhengtong Daozang',
        url: 'https://www2.kenyon.edu/Depts/Religion/Fac/Adler/Reln270/Daozang.htm'
    },
    'Day': {
        full: 'John V. Day, Indo-European Origins: The Anthropological Evidence',
        scope: 'Indo-European studies',
        year: '2001',
        edition: 'Institute for the Study of Man'
    },
    'De Moor': {
        full: 'Johannes C. de Moor, An Anthology of Religious Texts from Ugarit',
        scope: 'Ugaritic religious texts',
        year: '1987',
        edition: 'Brill, Leiden'
    },
    'DELG': {
        full: 'Dictionnaire étymologique de la langue grecque',
        scope: 'Greek',
        year: '1968',
        edition: 'Klincksieck',
        url: 'https://klincksieck.com/'
    },
    'Devi Mahatmya': {
        full: 'Devī Māhātmya (Durgā Saptaśatī)',
        scope: 'Hindu Śākta scripture',
        year: '500',
        edition: 'Translated by C. Mackenzie Brown',
        url: 'https://sacred-texts.com/hin/drama/index.htm'
    },
    'EDPG': {
        full: 'Etymological Dictionary of Proto-Germanic',
        scope: 'Proto-Germanic',
        year: '2013',
        edition: 'Brill',
        url: 'https://brill.com/view/title/25861'
    },
    'Egyptology': {
        full: 'Egyptology (modern Egyptological scholarship)',
        scope: 'Modern Egyptian place-name and onomastic scholarship',
        year: 'ongoing',
        edition: 'UCLA Encyclopedia of Egyptology / field standard',
        url: 'https://escholarship.org/uc/nelc_uee'
    },
    'Empedocles': {
        full: 'Empedocles of Acragas, fragments',
        scope: 'Presocratic Greek philosophy',
        year: '-430',
        edition: 'Diels-Kranz 31',
        url: 'https://plato.stanford.edu/entries/empedocles/'
    },
    'Enuma Elish': {
        full: 'Enuma Elish: The Babylonian Epic of Creation',
        scope: 'Babylonian creation epic',
        year: '-1200',
        edition: 'Standard Babylonian version',
        url: 'http://etana.org/node/581'
    },
    'Epic of Gilgamesh': {
        full: 'Epic of Gilgamesh',
        scope: 'Mesopotamian epic',
        year: '-1300',
        edition: 'Standard Babylonian version',
        url: 'https://etcsl.orinst.ox.ac.uk/'
    },
    'ETCSL': {
        full: 'Electronic Text Corpus of Sumerian Literature',
        scope: 'Mesopotamian',
        year: '1998',
        edition: 'Oxford Oriental Institute',
        url: 'https://etcsl.orinst.ox.ac.uk/'
    },
    'Euripides': {
        full: 'Euripides, Tragedies',
        scope: 'Greek tragedy',
        year: '-406',
        edition: 'Loeb Classical Library / Oxford Classical Texts',
        url: 'https://catalog.perseus.org/catalog/urn:cts:greekLit:tlg0006'
    },
    'Faulkner': {
        full: 'A Concise Dictionary of Middle Egyptian',
        scope: 'Egyptian',
        year: '1962',
        edition: 'Griffith Institute',
        url: 'https://www.griffith.ox.ac.uk/'
    },
    'Fedorova': {
        full: 'Tatiana Fedorova, Slavic mythological studies',
        scope: 'Slavic mythology',
        year: '2000',
        edition: 'Various articles and monographs'
    },
    'Florentine Codex': {
        full: 'Florentine Codex (General History of the Things of New Spain)',
        scope: 'Nahuatl / Aztec ethnography',
        year: '1577',
        edition: 'Bernardino de Sahagún; School of American Research',
        url: 'https://www.wdl.org/en/item/10098/'
    },
    'Folklore': {
        full: 'Folklore (traditional oral narrative)',
        scope: 'General folklore',
        year: 'various',
        edition: 'Oral traditions'
    },
    'Gardiner': {
        full: 'Alan H. Gardiner, Egyptian Grammar: Being an Introduction to the Study of Hieroglyphs',
        scope: 'Middle Egyptian grammar and sign list',
        year: '1927',
        edition: 'Griffith Institute / Oxford University Press (3rd ed. 1957)',
        url: 'https://global.oup.com/academic/product/egyptian-grammar-9780195002676'
    },
    'Gathas': {
        full: 'Gāthās (Avestan hymns of Zarathustra)',
        scope: 'Old Avestan hymns',
        year: '-1000',
        edition: 'Yasna 28–53',
        url: 'https://www.avesta.org/gathas.htm'
    },
    'Grey': {
        full: 'George Grey, Polynesian Mythology and Ancient Traditional History of the New Zealand Race',
        scope: 'Māori mythology',
        year: '1855',
        edition: 'Brett, Auckland',
        url: 'https://nzetc.victoria.ac.nz/'
    },
    'Handy': {
        full: 'E. S. Craighill Handy, Polynesian Religion',
        scope: 'Polynesian religion',
        year: '1927',
        edition: 'Bishop Museum Bulletin 34'
    },
    'Henry': {
        full: 'Teuira Henry, Ancient Tahiti',
        scope: 'Tahitian culture and mythology',
        year: '1928',
        edition: 'Bishop Museum Bulletin 48'
    },
    'Hepburn': {
        full: 'James C. Hepburn, A Japanese-English and English-Japanese Dictionary',
        scope: 'Japanese reference dictionary / Hepburn romanization',
        year: '1867',
        edition: 'Shanghai / Tokyo: Maruya, Kelly & Walsh'
    },
    'Heraclitus': {
        full: 'Heraclitus of Ephesus, fragments',
        scope: 'Presocratic Greek philosophy',
        year: '-480',
        edition: 'Diels-Kranz 22',
        url: 'https://plato.stanford.edu/entries/heraclitus/'
    },
    'Herodotus': {
        full: 'Histories',
        scope: 'Greek history',
        year: '-440',
        edition: 'Loeb Classical Library',
        url: 'https://www.loebclassics.com/'
    },
    'Hesiod': {
        full: 'Hesiod, Theogony / Works and Days / Shield',
        scope: 'Greek epic poetry',
        year: '-700',
        edition: 'Loeb Classical Library No. 57',
        url: 'https://catalog.perseus.org/catalog/urn:cts:greekLit:tlg0020'
    },
    'Hesiod, Theogony': {
        full: 'Hesiod, Theogony',
        scope: 'Greek theogonic epic',
        year: '-700',
        edition: 'Loeb Classical Library No. 57',
        url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.01.0129'
    },
    'History of the North': {
        full: 'History of the North (Northern European historiography)',
        scope: 'Norse / North-Germanic history and legend',
        year: '1200',
        edition: 'Ambiguous reference; possibly Heimskringla, Gesta Danorum, or related compendia'
    },
    'Hittite texts': {
        full: 'Corpus of Hittite Texts (CTH)',
        scope: 'Hittite cuneiform text corpus',
        year: '1971',
        edition: 'Catalogue des Textes Hittites / Hethitologie Portal Mainz',
        url: 'https://www.hethport.uni-wuerzburg.de/CTH/index.php?lang=EN'
    },
    'Homer': {
        full: 'Homer, Iliad / Odyssey',
        scope: 'Greek epic poetry',
        year: '-750',
        edition: 'Loeb Classical Library / Oxford Classical Texts',
        url: 'https://catalog.perseus.org/catalog/urn:cts:greekLit:tlg0012'
    },
    'Homeric Hymn to Pan': {
        full: 'Homeric Hymn to Pan (Homeric Hymn 19)',
        scope: 'Greek hymnic poetry',
        year: '-600',
        edition: 'Homeric Hymns, Loeb Classical Library No. 496',
        url: 'https://catalog.perseus.org/catalog/urn:cts:greekLit:tlg0013'
    },
    'Hooulumahiehie': {
        full: 'Ho\'oulumahiehie and Kapi\'ioho\'okalani Kapa\'kekula, Epic Tale of Hi\'iakaikapoliopele',
        scope: 'Hawaiian epic literature',
        year: '2006',
        edition: 'University of Hawai\'i Press'
    },
    'Huainanzi': {
        full: 'Huainanzi',
        scope: 'Chinese Daoist-Confucian syncretic text',
        year: '-139',
        edition: 'Liu An; Chinese Text Project',
        url: 'https://ctext.org/huainanzi'
    },
    'I Ching': {
        full: 'I Ching (Yijing / Book of Changes)',
        scope: 'Chinese divination classic',
        year: '-1000',
        edition: 'Chinese Text Project',
        url: 'https://ctext.org/book-of-changes'
    },
    'Idowu': {
        full: 'E. Bolaji Idowu, Olódùmarè: God in Yoruba Belief',
        scope: 'Yoruba religion',
        year: '1962',
        edition: 'Longmans, Green & Co.'
    },
    'Irish folklore': {
        full: 'Irish folklore',
        scope: 'Irish folk narrative tradition',
        year: 'various',
        edition: 'Oral traditions'
    },
    'Ivanov-Toporov': {
        full: 'Vyacheslav Ivanov & Vladimir Toporov, Studies in Slavic Antiquities',
        scope: 'Slavic mythology / structural reconstruction',
        year: '1974',
        edition: 'Issledovanija v oblasti slavjanskih drevnostej'
    },
    'Jacobsen': {
        full: 'Thorkild Jacobsen, The Treasures of Darkness: A History of Mesopotamian Religion',
        scope: 'Mesopotamian religion',
        year: '1976',
        edition: 'Yale University Press'
    },
    'Japanese Buddhism': {
        full: 'Japanese Buddhism',
        scope: 'Buddhist tradition in Japan',
        year: '600',
        edition: 'Tendai, Shingon, Pure Land, Zen, and other schools'
    },
    'Japanese folklore': {
        full: 'Japanese folklore',
        scope: 'Japanese folk narrative and myth',
        year: 'various',
        edition: 'Kojiki, Nihon Shoki, and folk tale collections'
    },
    'Journey to the West': {
        full: 'Journey to the West (Xīyóu Jì)',
        scope: 'Chinese Ming-dynasty novel',
        year: '1592',
        edition: 'Ming dynasty printed edition',
        url: 'https://ctext.org/journey-to-the-west'
    },
    'KAI': {
        full: 'Kanaanäische und Aramäische Inschriften',
        scope: 'Canaanite and Aramaic inscriptions',
        year: '1962',
        edition: '3 vols., Harrassowitz, Wiesbaden (completed 1971)',
        url: 'https://www.harrassowitz-verlag.de/titel_544.ahtml'
    },
    'Karttunen': {
        full: 'Frances Karttunen, An Analytical Dictionary of Nahuatl',
        scope: 'Nahuatl lexicon',
        year: '1983',
        edition: 'University of Texas Press',
        url: 'https://utpress.utexas.edu/'
    },
    'KEWA': {
        full: 'Kurzgefasstes etymologisches Wörterbuch des Altindischen',
        scope: 'Sanskrit',
        year: '1956',
        edition: '4 vols., Carl Winter',
        url: 'https://www.sanskrit-lexicon.uni-koeln.de/'
    },
    'Kojiki': {
        full: 'Kojiki (Records of Ancient Matters)',
        scope: 'Japanese chronicle and myth',
        year: '712',
        edition: 'Translated by Basil Hall Chamberlain',
        url: 'https://sacred-texts.com/shi/kj/index.htm'
    },
    'Korean folklore': {
        full: 'Korean folklore',
        scope: 'Korean folk narrative tradition',
        year: 'various',
        edition: 'Oral and compiled folk tales'
    },
    'Kramer': {
        full: 'Samuel Noah Kramer, The Sumerians: Their History, Culture, and Character',
        scope: 'Sumerian civilization and literary texts',
        year: '1963',
        edition: 'University of Chicago Press',
        url: 'https://press.uchicago.edu/ucp/books/book/chicago/S/bo5980059.html'
    },
    'KTU': {
        full: 'Die keilalphabetischen Texte aus Ugarit',
        scope: 'Ugaritic alphabetic cuneiform texts',
        year: '1976',
        edition: 'KTU / KTU², Ugarit-Verlag, Münster (2nd ed. 1995)'
    },
    'Laozi': {
        full: 'Laozi (Daodejing)',
        scope: 'Daoist philosophical text',
        year: '-500',
        edition: 'Laozi; Chinese Text Project',
        url: 'https://ctext.org/dao-de-jing'
    },
    'Lebor Gabála': {
        full: 'Lebor Gabála Érenn (The Book of Invasions)',
        scope: 'Irish pseudo-history / Mythological Cycle',
        year: '1100',
        edition: 'ed. & trans. R. A. S. Macalister, Irish Texts Society (1938-1956)',
        url: 'https://celt.ucc.ie/'
    },
    'Lewis-Short': {
        full: 'A Latin Dictionary',
        scope: 'Latin/Roman',
        year: '1879',
        edition: 'Oxford',
        url: 'http://www.perseus.tufts.edu/hopper/resolveform?type=exact&redirect=true&lang=la'
    },
    'Lotus Sutra': {
        full: 'Saddharmapuṇḍarīkasūtra (Lotus Sutra)',
        scope: 'Mahāyāna Buddhist sutra',
        year: '100',
        edition: 'Translated by H. Kern (SBE 21)',
        url: 'https://sacred-texts.com/bud/lotus/index.htm'
    },
    'LSJ': {
        full: 'Liddell-Scott-Jones Greek-English Lexicon',
        scope: 'Greek',
        year: '1843',
        edition: '9th ed. with 1996 supplement',
        url: 'https://www.perseus.tufts.edu/hopper/resolveform?type=exact&redirect=true&lang=greek'
    },
    'Mabinogion': {
        full: 'The Mabinogion',
        scope: 'Welsh prose tales / Celtic mythology',
        year: '1200',
        edition: 'trans. Lady Charlotte Guest (1877) / Gwyn Jones & Thomas Jones (1948)',
        url: 'https://sacred-texts.com/neu/celt/mab/index.htm'
    },
    'Macdonell': {
        full: 'Arthur A. Macdonell, A Sanskrit-English Dictionary',
        scope: 'Sanskrit reference dictionary',
        year: '1893',
        edition: 'Oxford; Cologne Digital Sanskrit Dictionaries',
        url: 'https://www.sanskrit-lexicon.uni-koeln.de/'
    },
    'MacKillop': {
        full: 'James MacKillop, A Dictionary of Celtic Mythology',
        scope: 'Celtic mythology reference',
        year: '1998',
        edition: 'Oxford University Press',
        url: 'https://www.oxfordreference.com/view/10.1093/acref/9780198804840.001.0001/acref-9780198804840'
    },
    'Mahabharata': {
        full: 'Mahābhārata',
        scope: 'Sanskrit epic',
        year: '-400',
        edition: 'Vyāsa; translated by Kisari Mohan Ganguli',
        url: 'https://sacred-texts.com/hin/maha/index.htm'
    },
    'Mahayana texts': {
        full: 'Mahāyāna Buddhist texts',
        scope: 'Buddhist scripture corpus',
        year: '100',
        edition: 'Translated by E. B. Cowell, F. Max Müller, and J. Takakusu (SBE 49)',
        url: 'https://sacred-texts.com/bud/sbe49/index.htm'
    },
    'Malo': {
        full: 'David Malo, Hawaiian Antiquities (Moʻolelo Hawaiʻi)',
        scope: 'Hawaiian history and culture',
        year: '1838',
        edition: 'Bishop Museum Press'
    },
    'Manusmriti': {
        full: 'Manusmṛti (Laws of Manu)',
        scope: 'Hindu legal and dharma text',
        year: '-200',
        edition: 'Translated by Georg Bühler (SBE 25)',
        url: 'https://sacred-texts.com/hin/manu.htm'
    },
    'Mapuche oral tradition': {
        full: 'Mapuche oral tradition',
        scope: 'Mapuche / Araucanian oral narrative',
        year: 'various',
        edition: 'Oral tradition'
    },
    'Massola': {
        full: 'Aldo Massola, Bunjil\'s Cave: Myths, Legends and Superstitions of the Aborigines of South-East Australia',
        scope: 'Australian Aboriginal mythology',
        year: '1968',
        edition: 'Lansdowne Press'
    },
    'Mencius': {
        full: 'Mencius (Mengzi)',
        scope: 'Confucian dialogues',
        year: '-300',
        edition: 'Mencius; Chinese Text Project',
        url: 'https://ctext.org/mengzi'
    },
    'Métraux': {
        full: 'Alfred Métraux, Myths and Tales of South America',
        scope: 'South American mythology',
        year: '1967',
        edition: 'University of Chicago Press'
    },
    'Miklosich': {
        full: 'Franz Miklosich, Etymologisches Wörterbuch der slavischen Sprachen',
        scope: 'Slavic historical linguistics',
        year: '1886',
        edition: 'W. Braumüller, Vienna; repr. Cambridge University Press',
        url: 'https://www.cambridge.org/us/academic/subjects/languages-linguistics/european-language-and-linguistics/etymologisches-worterbuch-der-slavischen-sprachen?format=PB'
    },
    'Monier-Williams': {
        full: 'Monier Monier-Williams, A Sanskrit-English Dictionary',
        scope: 'Sanskrit reference dictionary',
        year: '1899',
        edition: 'Oxford; Cologne Digital Sanskrit Dictionaries',
        url: 'https://www.sanskrit-lexicon.uni-koeln.de/'
    },
    'Moyle': {
        full: 'Richard Moyle, Tongan Music',
        scope: 'Tongan culture and oral tradition',
        year: '1987',
        edition: 'Auckland University Press'
    },
    'Mozi': {
        full: 'Mozi',
        scope: 'Mohist philosophical text',
        year: '-400',
        edition: 'Mozi; Chinese Text Project',
        url: 'https://ctext.org/mozi'
    },
    'Mūlamadhyamakakārikā': {
        full: 'Mūlamadhyamakakārikā (Fundamental Verses on the Middle Way)',
        scope: 'Mādhyamaka Buddhist philosophy',
        year: '150',
        edition: 'Nāgārjuna; translated by Jay L. Garfield',
        url: 'https://www.bdkamerica.org/'
    },
    'MW': {
        full: 'Monier-Williams Sanskrit-English Dictionary',
        scope: 'Sanskrit',
        year: '1899',
        edition: 'Oxford',
        url: 'https://www.sanskrit-lexicon.uni-koeln.de/'
    },
    'Nahuatl dictionary': {
        full: 'Nahuatl dictionary (collective modern and colonial sources)',
        scope: 'Nahuatl lexicon',
        year: 'various',
        edition: 'Karttunen, Molina, and modern reference works'
    },
    'Nihon Shoki': {
        full: 'Nihon Shoki (Chronicles of Japan)',
        scope: 'Japanese chronicle and myth',
        year: '720',
        edition: 'Translated by W. G. Aston (excerpts)',
        url: 'https://sacred-texts.com/shi/nihon0.htm'
    },
    'Orphic': {
        full: 'Orphic texts and fragments',
        scope: 'Orphic Greek religion and poetry',
        year: '-500',
        edition: 'Orphicorum Fragmenta (Kern); Orphic Hymns',
        url: 'https://www.orphicorumfragmenta.com/'
    },
    'Ovid': {
        full: 'Ovid (Publius Ovidius Naso), Metamorphoses / Fasti / Heroides',
        scope: 'Latin poetry / Roman myth',
        year: '17',
        edition: 'Loeb Classical Library',
        url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.02.0028'
    },
    'Oxford': {
        full: 'Oxford Classical Dictionary',
        scope: 'Classical antiquity',
        year: '2012',
        edition: '4th ed., Oxford University Press',
        url: 'https://oxfordre.com/classics/'
    },
    'Pali Canon': {
        full: 'Pāli Canon (Tipiṭaka)',
        scope: 'Theravāda Buddhist scripture',
        year: '-300',
        edition: 'Pali Text Society / Access to Insight',
        url: 'https://www.accesstoinsight.org/tipitaka/index.html'
    },
    'Pape-Benseler': {
        full: 'Wörterbuch der griechischen Eigennamen',
        scope: 'Greek',
        year: '1863',
        edition: '3rd ed.',
        url: 'https://archive.org/details/bub_gb_8SMSAAAAIAAJ'
    },
    'Parker': {
        full: 'Henry Parker, Village Folk-Tales of Ceylon',
        scope: 'Sri Lankan folklore',
        year: '1910',
        edition: 'Luzac & Co.'
    },
    'Pausanias': {
        full: 'Pausanias, Description of Greece',
        scope: 'Greek travel and antiquarian literature',
        year: '180',
        edition: 'Loeb Classical Library',
        url: 'https://catalog.perseus.org/catalog/urn:cts:greekLit:tlg0525'
    },
    'Pindar': {
        full: 'Pindar, Victory Odes (Olympian, Pythian, Nemean, Isthmian)',
        scope: 'Greek lyric poetry',
        year: '-438',
        edition: 'Loeb Classical Library',
        url: 'https://scaife.perseus.org/library/urn:cts:greekLit:tlg0033/'
    },
    'Plato': {
        full: 'Plato, Dialogues',
        scope: 'Greek philosophy',
        year: '-348',
        edition: 'Loeb Classical Library / Oxford Classical Texts',
        url: 'https://catalog.perseus.org/catalog/urn:cts:greekLit:tlg0059'
    },
    'Plotinus': {
        full: 'Plotinus, Enneads',
        scope: 'Neoplatonic philosophy',
        year: '270',
        edition: 'Loeb Classical Library / Oxford Classical Texts',
        url: 'https://catalog.perseus.org/catalog/urn:cts:greekLit:tlg0538'
    },
    'Plutarch': {
        full: 'Plutarch, Parallel Lives / Moralia',
        scope: 'Greek biography and essay',
        year: '120',
        edition: 'Loeb Classical Library',
        url: 'https://catalog.perseus.org/catalog/urn:cts:greekLit:tlg0007'
    },
    'Poetic Edda': {
        full: 'Poetic Edda (Eddukvæði)',
        scope: 'Norse mythological and heroic poetry',
        year: '1270',
        edition: 'ed. Neckel-Kuhn; trans. Carolyn Larrington, Oxford World\'s Classics (2014)',
        url: 'https://sacred-texts.com/neu/poe/index.htm'
    },
    'Pokorny': {
        full: 'Indogermanisches etymologisches Wörterbuch',
        scope: 'PIE',
        year: '1959',
        edition: '2 vols., Francke',
        url: 'https://indo-european.info/'
    },
    'Popol Vuh': {
        full: 'Popol Vuh',
        scope: 'K\'iche\' Maya creation narrative',
        year: '1550',
        edition: 'Translated by Dennis Tedlock',
        url: 'https://www.popolvuh.ufl.edu/'
    },
    'Primary Chronicle': {
        full: 'Primary Chronicle (Povest\' vremennykh let / Tale of Bygone Years)',
        scope: 'East Slavic chronicle / Rus\' history',
        year: '1113',
        edition: 'trans. Samuel Hazzard Cross & Olgerd P. Sherbowitz-Wetzor, Harvard University Press (1953)',
        url: 'https://archive.org/details/TheRussianPrimaryChronicle'
    },
    'Prose Edda': {
        full: 'Snorri Sturluson, Prose Edda',
        scope: 'Norse mythology / skaldic poetics',
        year: '1220',
        edition: 'trans. Anthony Faulkes, Everyman / Viking Society for Northern Research',
        url: 'http://vsnrweb-publications.org.uk/EDDArestr.pdf'
    },
    'Puranas': {
        full: 'Purāṇas',
        scope: 'Hindu mythological corpus',
        year: '300',
        edition: 'Various; Internet Sacred Text Archive selections',
        url: 'https://sacred-texts.com/hin/index.htm'
    },
    'Pythagoras': {
        full: 'Pythagoras of Samos and the Pythagorean tradition',
        scope: 'Greek philosophy / religion',
        year: '-500',
        edition: 'Diels-Kranz 14; later Neopythagorean texts',
        url: 'https://plato.stanford.edu/entries/pythagoras/'
    },
    'Ramayana': {
        full: 'Rāmāyaṇa',
        scope: 'Sanskrit epic',
        year: '-500',
        edition: 'Vālmīki; translated by Hari Prasad Shastri',
        url: 'https://sacred-texts.com/hin/rama/index.htm'
    },
    'Ṛgveda': {
        full: 'Ṛgveda Saṃhitā',
        scope: 'Vedic Sanskrit hymns',
        year: '-1500',
        edition: 'Translated by Ralph T. H. Griffith',
        url: 'https://sacred-texts.com/hin/rigveda/'
    },
    'Ṝgveda': {
        full: 'Ṛgveda Saṃhitā',
        scope: 'Vedic Sanskrit hymns',
        year: '-1500',
        edition: 'Translated by Ralph T. H. Griffith',
        url: 'https://sacred-texts.com/hin/rigveda/'
    },
    'Rix': {
        full: 'Lexikon der indogermanischen Verben',
        scope: 'PIE',
        year: '2001',
        edition: '2nd ed., Reichert',
        url: 'https://reichert-verlag.de/'
    },
    'RV': {
        full: 'Ṛgveda Saṃhitā',
        scope: 'Vedic Sanskrit hymns',
        year: '-1500',
        edition: 'Translated by Ralph T. H. Griffith',
        url: 'https://sacred-texts.com/hin/rigveda/'
    },
    'Sahagún': {
        full: 'Bernardino de Sahagún, Florentine Codex',
        scope: 'Nahuatl / Aztec ethnography',
        year: '1577',
        edition: 'General History of the Things of New Spain',
        url: 'https://www.wdl.org/en/item/10098/'
    },
    'Samguk Yusa': {
        full: 'Samguk Yusa (Memorabilia of the Three Kingdoms)',
        scope: 'Korean chronicle and Buddhist tales',
        year: '1281',
        edition: 'Iryeon; translated by Ha Tae-Hung and Grafton Mintz'
    },
    'Shakta texts': {
        full: 'Śākta texts',
        scope: 'Hindu goddess-oriented scripture',
        year: '500',
        edition: 'Devī Māhātmya, Tantras, and related literature'
    },
    'Shamanic texts': {
        full: 'Shamanic texts',
        scope: 'Cross-cultural shamanic literature',
        year: 'various',
        edition: 'Ethnographic recordings and compilations'
    },
    'Shan Hai Jing': {
        full: 'Shan Hai Jing (Classic of Mountains and Seas)',
        scope: 'Chinese mythogeography',
        year: '-400',
        edition: 'Chinese Text Project',
        url: 'https://ctext.org/shan-hai-jing'
    },
    'Shiji': {
        full: 'Shiji (Records of the Grand Historian)',
        scope: 'Chinese history',
        year: '-91',
        edition: 'Sima Qian; Chinese Text Project',
        url: 'https://ctext.org/shiji'
    },
    'Shinto': {
        full: 'Shinto',
        scope: 'Japanese indigenous religious tradition',
        year: 'various',
        edition: 'Kojiki, Nihon Shoki, shrine rituals, and folk practice'
    },
    'Shiva Purana': {
        full: 'Śiva Purāṇa',
        scope: 'Hindu Śaiva purāṇa',
        year: '500',
        edition: 'English translation by J. L. Shastri',
        url: 'https://www.wisdomlib.org/hinduism/book/shiva-purana-english'
    },
    'Smith': {
        full: 'William Smith, Dictionary of Greek and Roman Biography and Mythology',
        scope: 'Classical biography and mythology',
        year: '1849',
        edition: '3 vols., London',
        url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.04.0104'
    },
    'Smyth': {
        full: 'Greek Grammar',
        scope: 'Greek',
        year: '1920',
        edition: 'Harvard University Press',
        url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.04.0007'
    },
    'Sophocles': {
        full: 'Sophocles, Tragedies',
        scope: 'Greek tragedy',
        year: '-406',
        edition: 'Loeb Classical Library / Oxford Classical Texts',
        url: 'https://catalog.perseus.org/catalog/urn:cts:greekLit:tlg0011'
    },
    'Stoics': {
        full: 'Stoic philosophers (Zeno, Chrysippus, Epictetus, Marcus Aurelius, etc.)',
        scope: 'Hellenistic philosophy',
        year: '-300',
        edition: 'Fragments and extant works',
        url: 'https://plato.stanford.edu/entries/stoicism/'
    },
    'Strehlow': {
        full: 'T. G. H. Strehlow, Aranda Traditions',
        scope: 'Australian Aboriginal (Arrernte) mythology',
        year: '1947',
        edition: 'Melbourne University Press'
    },
    'Sukhavati-vyuha': {
        full: 'Sukhāvatī-vyūha Sūtras',
        scope: 'Pure Land Buddhist scripture',
        year: '100',
        edition: 'Translated by F. Max Müller (SBE 49)',
        url: 'https://sacred-texts.com/bud/sbe49/index.htm'
    },
    'Táin Bó Cúailnge': {
        full: 'Táin Bó Cúailnge (The Cattle Raid of Cooley)',
        scope: 'Irish Ulster Cycle epic',
        year: '800',
        edition: 'ed. & trans. Cecile O\'Rahilly, Dublin Institute for Advanced Studies',
        url: 'https://celt.ucc.ie/'
    },
    'Tantric texts': {
        full: 'Tantric texts',
        scope: 'Hindu and Buddhist esoteric corpus',
        year: '600',
        edition: 'Various traditions and recensions'
    },
    'Tregear': {
        full: 'The Maori-Polynesian Comparative Dictionary',
        scope: 'Polynesian',
        year: '1891',
        edition: 'Lyon and Blair',
        url: 'https://nzetc.victoria.ac.nz/'
    },
    'Ugaritic texts': {
        full: 'Ugaritic Textual Corpus',
        scope: 'Ugaritic alphabetic and syllabic texts',
        year: '-1200',
        edition: 'Ras Shamra–Ugarit corpus (KTU / CUSAS)',
        url: 'https://www.ancientneareast.net/ugarit-ras-shamra/'
    },
    'Upaniṣads': {
        full: 'Upaniṣads',
        scope: 'Vedantic philosophical texts',
        year: '-800',
        edition: 'Translated by F. Max Müller (SBE 1, 15)',
        url: 'https://sacred-texts.com/hin/sbe01/index.htm'
    },
    'Upanishads': {
        full: 'Upaniṣads',
        scope: 'Vedantic philosophical texts',
        year: '-800',
        edition: 'Translated by F. Max Müller (SBE 1, 15)',
        url: 'https://sacred-texts.com/hin/sbe01/index.htm'
    },
    'Vajrayana texts': {
        full: 'Vajrayāna / Tibetan Buddhist texts',
        scope: 'Esoteric Buddhist corpus',
        year: '700',
        edition: 'Translated by C. A. Musés and others',
        url: 'https://sacred-texts.com/bud/ettt/index.htm'
    },
    'Vendryes': {
        full: 'Lexique étymologique de l\'irlandais ancien',
        scope: 'Celtic',
        year: '1959',
        edition: 'Dublin Institute',
        url: 'https://www.dias.ie/celt/'
    },
    'Virgil': {
        full: 'Virgil (Publius Vergilius Maro), Aeneid / Eclogues / Georgics',
        scope: 'Latin poetry / Roman myth',
        year: '-19',
        edition: 'Loeb Classical Library / Oxford Classical Texts',
        url: 'https://catalog.perseus.org/catalog/urn:cts:latinLit:phi0690'
    },
    'Wb': {
        full: 'Wörterbuch der ägyptischen Sprache (Erman-Grapow)',
        scope: 'Egyptian',
        year: '1926',
        edition: '5 vols.',
        url: 'https://aaew.bbaw.de/tla/'
    },
    'Wb, jmn': {
        full: 'Wörterbuch der ägyptischen Sprache, lemma jmn',
        scope: 'Egyptian lexicon entry for jmn (Amun)',
        year: '1926',
        edition: 'Erman-Grapow, De Gruyter / Hinrichs',
        url: 'https://tla.digital/lemma/26060'
    },
    'Welsh Triads': {
        full: 'Trioedd Ynys Prydein (The Welsh Triads)',
        scope: 'Welsh bardic lore / Arthurian tradition',
        year: '1250',
        edition: 'ed. Rachel Bromwich, University of Wales Press (1961; 4th ed. 2014)',
        url: 'https://sianechard.ca/web-pages/the-welsh-triads/'
    },
    'West': {
        full: 'M. L. West, The Orphic Poems',
        scope: 'Orphic Greek poetry and theogony',
        year: '1983',
        edition: 'Clarendon Press, Oxford'
    },
    'Wiggermann': {
        full: 'Frans A. M. Wiggermann, Mesopotamian Protective Spirits: The Ritual Texts',
        scope: 'Mesopotamian demonology and iconography',
        year: '1992',
        edition: 'Styx Publications, Groningen'
    },
    'Wu Cheng\'en': {
        full: 'Wu Cheng\'en, Journey to the West',
        scope: 'Chinese novelist',
        year: '1500',
        edition: 'Author of Xiyouji',
        url: 'https://en.wikipedia.org/wiki/Wu_Cheng%27en'
    },
    'Yang': {
        full: 'Yang Jwing-Ming, Qigong and Chinese martial-arts literature',
        scope: 'Chinese health and spiritual traditions',
        year: '1988',
        edition: 'YMAA Publication Center'
    },
    'Yasht': {
        full: 'Yašts (Young Avestan hymns to divine entities)',
        scope: 'Young Avestan hymn collection',
        year: '-800',
        edition: 'Yasht collection',
        url: 'https://www.avesta.org/yashts.htm'
    },
    'Yoga Sutras': {
        full: 'Yoga Sūtras of Patañjali',
        scope: 'Sanskrit yoga philosophy',
        year: '200',
        edition: 'Translated by Charles Johnston',
        url: 'https://sacred-texts.com/hin/ysp/ysp00.htm'
    },
    'Yogacara texts': {
        full: 'Yogācāra Buddhist texts',
        scope: 'Mahāyāna Buddhist philosophy',
        year: '400',
        edition: 'Asaṅga, Vasubandhu, and commentarial literature'
    },
    'Zhou Dunyi': {
        full: 'Zhou Dunyi (Lianxi)',
        scope: 'Chinese Neo-Confucian philosopher',
        year: '1017',
        edition: 'Northern Song; author of Taijitu shuo',
        url: 'https://en.wikipedia.org/wiki/Zhou_Dunyi'
    },
    'Zhuangzi': {
        full: 'Zhuangzi',
        scope: 'Daoist philosophical text',
        year: '-300',
        edition: 'Zhuangzi; Chinese Text Project',
        url: 'https://ctext.org/zhuangzi'
    },
    'Zoëga': {
        full: 'A Concise Dictionary of Old Icelandic',
        scope: 'Norse',
        year: '1910',
        edition: 'Oxford',
        url: 'https://old-norse.net/'
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SOURCE_CATALOG };
}
