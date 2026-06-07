/**
 * PUNYCODEX — Source Catalog
 * Rich citation metadata for scholarly reference works.
 */

const SOURCE_CATALOG = {
    'LSJ': {
        full: 'Liddell-Scott-Jones Greek-English Lexicon',
        scope: 'Greek',
        year: '1843',
        edition: '9th ed. with 1996 supplement',
        url: 'https://www.perseus.tufts.edu/hopper/resolveform?type=exact&redirect=true&lang=greek'
    },
    'Beekes': {
        full: 'Etymological Dictionary of Greek',
        scope: 'Greek',
        year: '2010',
        edition: '2 vols., Brill',
        url: 'https://brill.com/view/title/17858'
    },
    'Pape-Benseler': {
        full: 'Wörterbuch der griechischen Eigennamen',
        scope: 'Greek',
        year: '1863',
        edition: '3rd ed.',
        url: 'https://archive.org/details/bub_gb_8SMSAAAAIAAJ'
    },
    'Smyth': {
        full: 'Greek Grammar',
        scope: 'Greek',
        year: '1920',
        edition: 'Harvard University Press',
        url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.04.0007'
    },
    'Cambridge': {
        full: 'Cambridge Ancient History',
        scope: 'General ancient history',
        year: '1970',
        edition: 'Multiple volumes',
        url: 'https://www.cambridge.org/core/series/cambridge-ancient-history/051D3B4F5F6D7E8E9F0A1B2C3D4E5F6A'
    },
    'Oxford': {
        full: 'Oxford Classical Dictionary',
        scope: 'Classical antiquity',
        year: '2012',
        edition: '4th ed., Oxford University Press',
        url: 'https://oxfordre.com/classics/'
    },
    'Cleasby-Vigfusson': {
        full: 'An Icelandic-English Dictionary',
        scope: 'Norse',
        year: '1874',
        edition: '2nd ed. with supplement',
        url: 'https://old-norse.net/'
    },
    'Zoëga': {
        full: 'A Concise Dictionary of Old Icelandic',
        scope: 'Norse',
        year: '1910',
        edition: 'Oxford',
        url: 'https://old-norse.net/'
    },
    'EDPG': {
        full: 'Etymological Dictionary of Proto-Germanic',
        scope: 'Proto-Germanic',
        year: '2013',
        edition: 'Brill',
        url: 'https://brill.com/view/title/25861'
    },
    'Faulkner': {
        full: 'A Concise Dictionary of Middle Egyptian',
        scope: 'Egyptian',
        year: '1962',
        edition: 'Griffith Institute',
        url: 'https://www.griffith.ox.ac.uk/'
    },
    'Wb': {
        full: 'Wörterbuch der ägyptischen Sprache (Erman-Grapow)',
        scope: 'Egyptian',
        year: '1926',
        edition: '5 vols.',
        url: 'https://aaew.bbaw.de/tla/'
    },
    'MW': {
        full: 'Monier-Williams Sanskrit-English Dictionary',
        scope: 'Sanskrit',
        year: '1899',
        edition: 'Oxford',
        url: 'https://www.sanskrit-lexicon.uni-koeln.de/'
    },
    'KEWA': {
        full: 'Kurzgefasstes etymologisches Wörterbuch des Altindischen',
        scope: 'Sanskrit',
        year: '1956',
        edition: '4 vols., Carl Winter',
        url: 'https://www.sanskrit-lexicon.uni-koeln.de/'
    },
    'Vendryes': {
        full: 'Lexique étymologique de l\'irlandais ancien',
        scope: 'Celtic',
        year: '1959',
        edition: 'Dublin Institute',
        url: 'https://www.dias.ie/celt/'
    },
    'Tregear': {
        full: 'The Maori-Polynesian Comparative Dictionary',
        scope: 'Polynesian',
        year: '1891',
        edition: 'Lyon and Blair',
        url: 'https://nzetc.victoria.ac.nz/'
    },
    'ETCSL': {
        full: 'Electronic Text Corpus of Sumerian Literature',
        scope: 'Mesopotamian',
        year: '1998',
        edition: 'Oxford Oriental Institute',
        url: 'https://etcsl.orinst.ox.ac.uk/'
    },
    'Black-Green': {
        full: 'Gods, Demons and Symbols of Ancient Mesopotamia',
        scope: 'Mesopotamian',
        year: '1992',
        edition: 'British Museum Press',
        url: 'https://www.britishmuseum.org/'
    },
    'Cicero': {
        full: 'Cicero, Marcus Tullius — collected works',
        scope: 'Latin/Roman',
        year: '-43',
        edition: 'Loeb Classical Library',
        url: 'https://www.loebclassics.com/'
    },
    'Lewis-Short': {
        full: 'A Latin Dictionary',
        scope: 'Latin/Roman',
        year: '1879',
        edition: 'Oxford',
        url: 'http://www.perseus.tufts.edu/hopper/resolveform?type=exact&redirect=true&lang=la'
    },
    'Herodotus': {
        full: 'Histories',
        scope: 'Greek history',
        year: '-440',
        edition: 'Loeb Classical Library',
        url: 'https://www.loebclassics.com/'
    },
    'Pokorny': {
        full: 'Indogermanisches etymologisches Wörterbuch',
        scope: 'PIE',
        year: '1959',
        edition: '2 vols., Francke',
        url: 'https://indo-european.info/'
    },
    'Rix': {
        full: 'Lexikon der indogermanischen Verben',
        scope: 'PIE',
        year: '2001',
        edition: '2nd ed., Reichert',
        url: 'https://reichert-verlag.de/'
    },
    'DELG': {
        full: 'Dictionnaire étymologique de la langue grecque',
        scope: 'Greek',
        year: '1968',
        edition: 'Klincksieck',
        url: 'https://klincksieck.com/'
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SOURCE_CATALOG };
}
