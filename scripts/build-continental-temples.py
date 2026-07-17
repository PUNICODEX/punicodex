#!/usr/bin/env python3
"""
Build flagship temples for Libyē, Aígyptos, Asía, and Eurṓpē.
Uses Olympios CSS/JS for styling but generates clean custom HTML.
"""
from pathlib import Path
import shutil
import re
import json

# Site configurations
SITES = {
    'libye': {
        'greek': 'Λιβύη',
        'unicode': 'Libyē',
        'ascii': 'Libya',
        'punycode': 'xn--liby-eva.com',
        'tagline': 'The Personified South',
        'description': 'The authentic digital shrine to Libyē, the personified continent of Africa in Greek mythology. Daughter of Epaphus, namesake of a vast southern land.',
        'og_desc': 'Explore Libyē — the personified continent of Africa in Greek mythology.',
        'pronunciation': '/li.býːɛː/',
        'pronunciation_note': 'Classical Greek: LI-buee (long upsilon, long eta)',
        'etymology': 'From Greek Λιβύη (Libýē), of uncertain origin but associated with the vast southern land beyond the Mediterranean. The name was used by Greeks to refer to the entire African continent.',
        'mythology': 'Libyē is the personification of the African continent in Greek mythology, the daughter of Epaphus (son of Zeus and Io) and Memphis. Her name became the Greek designation for the entire landmass south of the Mediterranean, a realm of burning sands, great rivers, and ancient wisdom. Herodotus called Egypt "the gift of the Nile," but he knew it as part of the greater Libyē — the land that stretched from the Pillars of Heracles to the far eastern shores.',
        'symbols': 'Lion, Palm, Desert Sun',
        'tier': 'Realm',
        'tier_subtype': 'Continental Personification',
        'parentage': 'Daughter of Epaphus and Memphis',
        'consort': 'Poseidon (in some accounts)',
        'children': 'Belus, Agenor, Lelex',
        'sources': 'Herodotus Histories II, Apollodorus Library II.1, Pindar Pythian 9',
        'related': ['aigyptos', 'asia', 'europe', 'epaphus'],
        'domain_meaning': 'Africa, the South, Desert Lands',
        'color_accent': '#C19A6B',
        'color_glow': 'rgba(193, 154, 107, 0.3)',
        'realm_cards': [
            ('The Burning Sands', 'The Sahara desert that dominates the interior — a sea of sand that tested the endurance of every Greek explorer and trader who ventured south.'),
            ('The Nile Delta', 'The great river that brings life to the desert, dividing into seven mouths before reaching the Mediterranean. Herodotus called Egypt its gift.'),
            ('The Pillars', 'The Gates of Heracles at the western edge of the world, where the Mediterranean meets the Atlantic — the boundary of the known world.'),
            ('Ancient Wisdom', 'From Thebes to Memphis, Libyē held knowledge older than Greece itself. The Greeks came here to learn geometry, medicine, and the mysteries of the gods.'),
        ],
        'myth_cards': [
            ('The Genealogy', 'Libyē was born of Epaphus — himself the son of Zeus and the wandering Io — and Memphis, the nymph who gave her name to the Egyptian capital. Through her, the blood of Zeus entered Africa.'),
            ('The Sons of Belus', 'Her son Belus became the ancestor of the Egyptian dynasties. His twin sons Aegyptus and Danaus would found the two great houses whose conflict fills Greek tragedy.'),
            ('The Oracle of Ammon', 'In the desert oasis of Siwa, the oracle of Zeus-Ammon spoke to those who dared the journey. Alexander himself traveled here to hear his divine destiny.'),
        ],
        'pantheon_cards': [
            ('Zeus', 'Ζεύς', 'King of the Gods', '/sites/zeus/'),
            ('Ammon', 'Ἄμμων', 'Libyan Zeus', '/sites/zeus/'),
            ('Poseidon', 'Ποσειδῶν', 'God of the Sea', '/sites/poseidon/'),
            ('Danae', 'Δανάη', 'Ancestor of Perseus', '/sites/danae/'),
        ],
        'variations': [
            ('Libyē', 'Full Restoration', 'Greek Λιβύη with acute and length'),
            ('Libya', 'ASCII Form', 'Modern Latin spelling without diacritics'),
            ('Libúē', 'Variant', 'Alternative accentuation attested in some texts'),
        ],
    },
    'aigyptos': {
        'greek': 'Αἴγυπτος',
        'unicode': 'Aígyptos',
        'ascii': 'Aegyptus',
        'punycode': 'xn--agyptos-7ya.com',
        'tagline': 'The Black Land',
        'description': 'The authentic digital shrine to Aígyptos, the personified Egypt in Greek mythology. Son of Belus, twin of Danaus, namesake of the eternal Nile kingdom.',
        'og_desc': 'Explore Aígyptos — the personified Egypt in Greek mythology, namesake of the Black Land.',
        'pronunciation': '/aí̯.gyp.tos/',
        'pronunciation_note': 'Classical Greek: AI-gup-tos (diphthong ai with acute)',
        'etymology': 'From Greek Αἴγυπτος (Aígyptos), derived from Egyptian Ḥwt-kꜣ-ptḥ ("House of the Ka of Ptah"), the temple complex at Memphis. The Greeks adapted the name to refer to the entire Nile civilization.',
        'mythology': 'Aígyptos is the mythological king of Egypt, son of Belus and twin brother of Danaus. In the great saga of the Aegyptiads, Aígyptos fathered fifty sons who pursued their cousins, the fifty daughters of Danaus — the famous Danaïdes. The very name Aígyptos became the Greek word for the Nile kingdom, a land the Greeks revered as the oldest source of wisdom, geometry, and religious mysteries. Herodotus dedicated the entirety of Book II of his Histories to this marvel of the ancient world.',
        'symbols': 'Nile, Papyrus, Scarab',
        'tier': 'Realm',
        'tier_subtype': 'Civilizational Personification',
        'parentage': 'Son of Belus and Achiroe',
        'consort': 'Various',
        'children': 'Fifty sons (the Aegyptiads)',
        'sources': 'Herodotus Histories II, Apollodorus Library II.1, Aeschylus The Suppliants',
        'related': ['libye', 'asia', 'europe', 'danae', 'belus'],
        'domain_meaning': 'Egypt, the Nile Valley, Ancient Wisdom',
        'color_accent': '#D4AF37',
        'color_glow': 'rgba(212, 175, 55, 0.3)',
        'realm_cards': [
            ('The Black Land', 'Kemet — the fertile strip along the Nile, black with silt after the annual flood. This was the Egypt of fields, cities, and temples.'),
            ('The Red Land', 'Deshret — the desert that surrounded and protected the Black Land. The two lands together formed the kingdom of the pharaohs.'),
            ('The Nile', 'Hapi — the river that was Egypt itself. Without it, the Black Land would be desert. The Greeks called it the gift of the Nile.'),
            ('The Pyramids', 'The eternal houses of the gods on earth. To the Greeks, these were wonders beyond comprehension — monuments to a civilization older than memory.'),
        ],
        'myth_cards': [
            ('The Fifty Sons', 'Aígyptos fathered fifty sons who sought to marry the fifty daughters of his twin brother Danaus. The great tragedy of the Danaïdes begins here.'),
            ('The Suppliants', 'Aeschylus dramatized the flight of the Danaïdes from their cousins. They sought refuge in Argos, claiming kinship through their ancestress Io.'),
            ('The Wisdom of Egypt', 'The Greeks believed Egypt was the source of all knowledge. Solon, Plato, and Pythagoras were said to have studied in its temples. Herodotus traveled its length to record its marvels.'),
        ],
        'pantheon_cards': [
            ('Ptah', 'Πταḥ', 'Creator God of Memphis', '/sites/ptah/'),
            ('Isis', 'Ἶσις', 'Goddess of Magic', '/sites/isis/'),
            ('Osiris', 'Ὄσιρις', 'Lord of the Dead', '/sites/osiris/'),
            ('Ra', 'Ῥα', 'The Sun God', '/sites/ra/'),
        ],
        'variations': [
            ('Aígyptos', 'Full Restoration', 'Greek Αἴγυπτος with diphthong and acute'),
            ('Aegyptus', 'Latin Form', 'Standard Roman transliteration'),
            ('Aigyptos', 'Modern Greek', 'Without the rough breathing mark'),
        ],
    },
    'asia': {
        'greek': 'Ἀσία',
        'unicode': 'Asía',
        'ascii': 'Asia',
        'punycode': 'xn--asa-sma.com',
        'tagline': 'The Rising East',
        'description': 'The authentic digital shrine to Asía, the personified continent of Asia in Greek mythology. Daughter of Oceanus, namesake of the vast eastern lands.',
        'og_desc': 'Explore Asía — the personified continent of Asia in Greek mythology.',
        'pronunciation': '/a.sí.a/',
        'pronunciation_note': 'Classical Greek: a-SEE-a (acute on iota)',
        'etymology': 'From Greek Ἀσία (Asía), of uncertain origin. Possibly from Assuwa, a Luwian name for a region in western Anatolia, or from the Hittite name for the eastern lands. The Greeks applied it first to Anatolia, then to the entire continent east of the Hellespont.',
        'mythology': 'Asía is the personification of the Asian continent in Greek mythology, a daughter of Oceanus and Tethys. Her name first designated the lands of Anatolia — the "Rising Sun" territories across the Hellespont — before expanding to encompass the vast eastern world from the Bosphorus to the farthest reaches known to the Greeks. As the wife of Prometheus (in some traditions) or Iapetus, she embodies the eastern origin of many cultural gifts that reached Greece: metallurgy, writing, and the arts of civilization.',
        'symbols': 'Sunrise, Bull, Lotus',
        'tier': 'Realm',
        'tier_subtype': 'Continental Personification',
        'parentage': 'Daughter of Oceanus and Tethys',
        'consort': 'Prometheus (in some accounts)',
        'children': 'Atlas, Prometheus, Epimetheus, Menoetius',
        'sources': 'Hesiod Theogony 359, Apollodorus Library I.2, Herodotus Histories I.4',
        'related': ['libye', 'aigyptos', 'europe', 'prometheus'],
        'domain_meaning': 'Asia, the East, Anatolia, the Rising Lands',
        'color_accent': '#CD5C5C',
        'color_glow': 'rgba(205, 92, 92, 0.3)',
        'realm_cards': [
            ('The Hellespont', 'The narrow strait that divides Europe from Asia — the boundary between the Greek world and the eastern unknown.'),
            ('Anatolia', 'The "Land of the Rising Sun" — the plateau that the Greeks first called Asia before the name expanded eastward.'),
            ('The Tigris & Euphrates', 'The twin rivers that cradle the oldest civilizations. From Mesopotamia came writing, law, and the wheel.'),
            ('The Silk Road', 'The great arteries of trade that carried goods, ideas, and stories between East and West for millennia.'),
        ],
        'myth_cards': [
            ('The Titan Bloodline', 'As the wife of Iapetus, Asía bore four sons who shaped the Greek cosmos: Atlas who holds the sky, Prometheus who gave fire to man, Epimetheus who gave the animals their gifts, and Menoetius whose pride was struck down by Zeus.'),
            ('The Gift of Fire', 'Through her son Prometheus, the wisdom of the East reached Greece. The arts of metallurgy, astronomy, and medicine — all attributed to Asian origins in Greek tradition.'),
            ('The Trojan Shore', 'On the Asian coast of the Hellespont stood Troy — the city whose fall became the founding myth of Greek literature. The Iliad is, in part, a story of Asia.'),
        ],
        'pantheon_cards': [
            ('Prometheus', 'Προμηθεύς', 'Bringer of Fire', '/sites/prometheus/'),
            ('Atlas', 'Ἄτλας', 'Holder of the Heavens', '/sites/atlas/'),
            ('Oceanus', 'Ὠκεανός', 'World-Encircling River', '/sites/oceanus/'),
            ('Tethys', 'Τηθύς', 'Mother of Rivers', '/sites/tethys/'),
        ],
        'variations': [
            ('Asía', 'Full Restoration', 'Greek Ἀσία with acute and macron'),
            ('Asia', 'ASCII Form', 'Modern spelling without diacritics'),
            ('Asía', 'Accent Only', 'Preserves the stress but not the length'),
        ],
    },
    'europe': {
        'greek': 'Εὐρώπη',
        'unicode': 'Eurṓpē',
        'ascii': 'Europa',
        'punycode': 'xn--eurp-eva0406b.com',
        'tagline': 'The Broad-Faced West',
        'description': 'The authentic digital shrine to Eurṓpē, the personified continent of Europe in Greek mythology. Daughter of Agenor, namesake of the western lands.',
        'og_desc': 'Explore Eurṓpē — the personified continent of Europe in Greek mythology.',
        'pronunciation': '/eu.róː.pɛː/',
        'pronunciation_note': 'Classical Greek: eu-RO-pee (acute on omega, long eta)',
        'etymology': 'From Greek Εὐρώπη (Eurṓpē), traditionally interpreted as "broad-faced" or "wide-gazing" from εὐρύς (eurýs, "wide") + ὤψ (ṓps, "face, eye"). The name originally belonged to the Phoenician princess abducted by Zeus in the form of a white bull, before becoming the designation for the continent.',
        'mythology': 'Eurṓpē is the personification of the European continent in Greek mythology, a Phoenician princess of extraordinary beauty whose name became attached to the lands northwest of the Greek world. In the most famous myth, Zeus fell in love with her and, transforming into a magnificent white bull, carried her across the sea to Crete — a journey that gave the continent its name. Herodotus knew the threefold division of the world into Libyē, Asía, and Eurṓpē, debating whether the continents were equal in size and wondering at the great rivers that defined them.',
        'symbols': 'White Bull, Crescent, Western Star',
        'tier': 'Realm',
        'tier_subtype': 'Continental Personification',
        'parentage': 'Daughter of Agenor and Telephassa',
        'consort': 'Zeus (in bull form), Asterion (king of Crete)',
        'children': 'Minos, Rhadamanthus, Sarpedon',
        'sources': 'Herodotus Histories IV, Apollodorus Library III.1, Ovid Metamorphoses II.833',
        'related': ['libye', 'aigyptos', 'asia', 'zeus'],
        'domain_meaning': 'Europe, the West, the Broad Lands',
        'color_accent': '#4169E1',
        'color_glow': 'rgba(65, 105, 225, 0.3)',
        'realm_cards': [
            ('The Aegean', 'The cradle of Greek civilization — a sea dotted with islands that were the stepping stones between Europe and Asia.'),
            ('The Celtic North', 'The misty lands beyond the Alps — forests and rivers that the Greeks knew only through rumor and trade.'),
            ('The Greek Peninsula', 'The southern tip of Europe, where the mountains meet the sea. Here the polis was born, and here the Greek gods found their home.'),
            ('The Pillars of Heracles', 'The western edge of the world — where the Mediterranean meets the Atlantic. Beyond lay the unknown Ocean.'),
        ],
        'myth_cards': [
            ('The Abduction', 'Zeus saw the Phoenician princess gathering flowers by the sea. He transformed into a white bull of unearthly beauty. When she climbed upon his back, he plunged into the waves and carried her to Crete.'),
            ('The Sons of Europe', 'On Crete, Eurṓpē bore three sons to Zeus: Minos, who became the great lawgiver; Rhadamanthus, who judged the dead; and Sarpedon, who ruled Lycia and fought at Troy.'),
            ('The Three Continents', 'Herodotus divided the world into three: Libyē to the south, Asía to the east, and Eurṓpē to the northwest. He wondered at their boundaries — the Nile, the Phasis, the Hellespont — and whether any man could truly say where one ended and another began.'),
        ],
        'pantheon_cards': [
            ('Zeus', 'Ζεύς', 'King of the Gods', '/sites/zeus/'),
            ('Poseidon', 'Ποσειδῶν', 'God of the Sea', '/sites/poseidon/'),
            ('Danae', 'Δανάη', 'Princess of Argos', '/sites/danae/'),
            ('Hera', 'Ἥρα', 'Queen of Heaven', '/sites/hera/'),
        ],
        'variations': [
            ('Eurṓpē', 'Full Restoration', 'Greek Εὐρώπη with circumflex and macron'),
            ('Europa', 'Latin Form', 'Standard Roman transliteration'),
            ('Europe', 'Modern English', 'Contemporary spelling'),
        ],
    },
}

ROOT = Path('.')
TEMPLATE_CSS = (ROOT / 'sites' / 'olympos' / 'styles.css').read_text(encoding='utf-8')
TEMPLATE_JS = (ROOT / 'sites' / 'olympos' / 'script.js').read_text(encoding='utf-8')

HTML_TEMPLATE = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{greek} — {unicode} | {tagline} | PUNICODEX</title>
    <meta name="description" content="{description}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=Lato:wght@300;400;700&family=Cinzel+Decorative:wght@400;700;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
    <link rel="canonical" href="https://punicodex.com/sites/{site_id}/">
    <meta property="og:title" content="{greek} — {unicode} | {tagline} | PUNICODEX">
    <meta property="og:description" content="{og_desc}">
    <meta property="og:url" content="https://punicodex.com/sites/{site_id}/">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="PUNICODEX">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{greek} — {unicode} | {tagline} | PUNICODEX">
    <meta name="twitter:description" content="{description}">
    <script type="application/ld+json">
{schema_json}
    </script>
</head>
<body>
    <nav class="main-nav" id="nav">
        <div class="nav-inner">
            <a href="/" class="nav-logo">
                <img src="assets/{site_id}_logolockup.png" alt="{unicode}" class="nav-logo-img">
            </a>
            <div class="nav-links">
                <a href="/pantheon/" class="nav-link">Pantheon</a>
                <a href="/realms/" class="nav-link">Realms</a>
                <a href="/lexicon/" class="nav-link">Lexicon</a>
                <a href="/type/" class="nav-link">Type</a>
                <a href="/tiers/" class="nav-link">Tiers</a>
            </div>
            <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation">
                <span></span><span></span><span></span>
            </button>
        </div>
    </nav>

    <section class="hero" id="hero">
        <div class="hero-content">
            <div class="hero-text">
                <span class="hero-eyebrow">{tier} · {tier_subtype}</span>
                <h1 class="hero-title">
                    <span class="title-greek">{greek}</span>
                    <span class="title-divider"></span>
                    <span class="title-trans">{unicode}</span>
                </h1>
                <p class="hero-subtitle">{tagline}</p>
                <div class="hero-meta">
                    <span class="meta-badge meta-domain">{punycode}</span>
                </div>
                <div class="hero-cta">
                    <a href="#the-name" class="btn-primary">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        Explore the Name
                    </a>
                    <a href="/type/#{site_id}" class="btn-ghost">Type Tool →</a>
                </div>
            </div>
            <div class="hero-mascot">
                <img src="assets/{site_id}_mascot.png" alt="{unicode}" class="mascot-img">
                <div class="mascot-glow"></div>
            </div>
        </div>
        <div class="hero-scroll-indicator">
            <div class="scroll-line"></div>
        </div>
    </section>

    <section class="section section-name" id="the-name">
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">01</span>
                <h2 class="section-title">The Authentic Name</h2>
                <p class="section-subtitle">From Greek original to digital restoration</p>
            </div>
            <div class="name-grid">
                <div class="name-card reveal-up">
                    <div class="card-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                        </svg>
                    </div>
                    <h3 class="card-title">Greek Original</h3>
                    <p class="card-greek">{greek}</p>
                    <p class="card-body">The name in its original Greek form. The breathing marks, accents, and length symbols mark the true classical pronunciation. This is the name the ancients spoke.</p>
                </div>
                <div class="name-card reveal-up" data-delay="100">
                    <div class="card-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5">
                            <path d="M4 7V4h3M4 17v3h3M20 7V4h-3M20 17v3h-3M9 9h6v6H9z"/>
                        </svg>
                    </div>
                    <h3 class="card-title">ASCII Form</h3>
                    <p class="card-ascii">{ascii}</p>
                    <p class="card-body">Stripped of its Greek identity, reduced to Latin letters. The breathing, the accent, the scholarly precision — all erased by the constraints of ASCII.</p>
                </div>
                <div class="name-card reveal-up" data-delay="200">
                    <div class="card-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5">
                            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                        </svg>
                    </div>
                    <h3 class="card-title">Unicode Restoration</h3>
                    <p class="card-unicode">{unicode}</p>
                    <p class="card-body">The full scholarly orthography with stress and length marks restored. This is not decoration — it is <strong>philological accuracy</strong>. The domain encodes to Punycode, but the browser displays the truth.</p>
                </div>
            </div>
            <div class="punycode-explainer reveal-up">
                <div class="explainer-label">Punycode Encoding</div>
                <div class="explainer-box">
                    <code class="explainer-code">{unicode}.com → {punycode}</code>
                    <p class="explainer-note">The non-ASCII characters are encoded while the ASCII remains visible. To the DNS, it is Punycode. To humanity, it is <em>{unicode}</em>.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="section section-pronunciation" id="pronunciation">
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">02</span>
                <h2 class="section-title">Pronunciation</h2>
                <p class="section-subtitle">How the name was truly spoken in antiquity</p>
            </div>
            <div class="pronunciation-main reveal-up">
                <span class="ipa-text">{pronunciation}</span>
                <p class="ipa-note">{pronunciation_note}</p>
            </div>
        </div>
    </section>

    <section class="section section-mountain" id="the-realm">
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">03</span>
                <h2 class="section-title">The Realm</h2>
                <p class="section-subtitle">{domain_meaning}</p>
            </div>
            <div class="king-content">
                <div class="king-intro reveal-up">
                    <p class="lead-text">{etymology}</p>
                </div>
                <div class="domains-grid">
                    {realm_cards}
                </div>
                <div class="symbols-section reveal-up">
                    <h3 class="symbols-title">Sacred Symbols</h3>
                    <div class="symbols-list">
                        {symbols_list}
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="section section-myths" id="myths">
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">04</span>
                <h2 class="section-title">The Myths</h2>
                <p class="section-subtitle">Stories of the personified continent</p>
            </div>
            <div class="myths-timeline">
                {myth_cards}
            </div>
        </div>
    </section>

    <section class="section section-pantheon" id="pantheon">
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">05</span>
                <h2 class="section-title">The Pantheon</h2>
                <p class="section-subtitle">Divinities associated with this realm</p>
            </div>
            <div class="olympians-grid reveal-up">
                {pantheon_cards}
            </div>
        </div>
    </section>

    <section class="section section-variations" id="variations">
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">06</span>
                <h2 class="section-title">Name Variations</h2>
                <p class="section-subtitle">Attested forms and scholarly conventions</p>
            </div>
            <div class="variations-list">
                {variations_list}
            </div>
        </div>
    </section>

    <section class="section" id="related" style="background:#0A0A0A;padding:6rem 0;">
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">07</span>
                <h2 class="section-title">Related Realms</h2>
                <p class="section-subtitle">Other personified continents and civilizations</p>
            </div>
            <div class="related-grid">
                {related_cards}
            </div>
        </div>
    </section>

    <section class="section section-pantheon-connect" id="type-tool">
        <div class="container" style="text-align:center;">
            <h2 class="section-title reveal-up">Type the Name</h2>
            <p class="reveal-up" style="font-size:1.05rem;color:#A0A0A0;line-height:1.8;margin-bottom:2.5rem;">See how {unicode} is encoded character by character. Explore the Greek orthography, the Punycode transformation, and the Unicode composition.</p>
            <div class="reveal-up" style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
                <code style="background:#111;padding:0.75rem 1.25rem;border-radius:8px;color:#D4AF37;font-family:'SF Mono',monospace;">{site_id}</code>
                <code style="background:#111;padding:0.75rem 1.25rem;border-radius:8px;color:#D4AF37;font-family:'SF Mono',monospace;">{unicode}</code>
            </div>
            <a href="/type/#{site_id}" style="display:inline-flex;align-items:center;gap:0.75rem;padding:1rem 2.5rem;background:linear-gradient(135deg,{color_accent},#D4AF37);color:#0A0A0A;font-weight:700;border-radius:12px;margin-top:2rem;text-decoration:none;">Open Type Tool →</a>
        </div>
    </section>

    <footer>
        <div class="container">
            <div class="footer-content">
                <div class="footer-brand">
                    <span class="footer-logo">PUNICODEX</span>
                    <p>Restoring the original names of gods, realms, and archetypes to the digital world.</p>
                </div>
                <div class="footer-links">
                    <a href="/pantheon/">Pantheon</a>
                    <a href="/realms/">Realms</a>
                    <a href="/lexicon/">Lexicon</a>
                    <a href="/type/">Type</a>
                    <a href="/tiers/">Tiers</a>
                </div>
            </div>
            <div class="footer-bottom">
                <p>{unicode} — {tier} ({tier_subtype})</p>
                <p>Original Greek: {greek}</p>
                <p>© PUNICODEX. All realms restored.</p>
            </div>
        </div>
    </footer>

    <script src="script.js"></script>
</body>
</html>
'''

def build_realm_cards(cards):
    html = ''
    for i, (title, desc) in enumerate(cards):
        delay = f' data-delay="{i*100}"' if i > 0 else ''
        html += f'''                    <div class="domain-card reveal-up"{delay}>
                        <h4 class="domain-name">{title}</h4>
                        <p class="domain-desc">{desc}</p>
                    </div>
'''
    return html

def build_symbols_list(symbols_str):
    symbols = [s.strip() for s in symbols_str.split(',')]
    html = ''
    for sym in symbols:
        html += f'''                        <div class="symbol-item">
                            <span class="symbol-name">{sym}</span>
                            <span class="symbol-meaning">Sacred symbol of {sym.lower()}</span>
                        </div>
'''
    return html

def build_myth_cards(cards):
    html = ''
    for i, (tag, text) in enumerate(cards):
        delay = f' data-delay="{i*100}"' if i > 0 else ''
        html += f'''                <div class="myth-card reveal-up"{delay}>
                    <div class="myth-marker"></div>
                    <div class="myth-content">
                        <span class="myth-tag">{tag}</span>
                        <p class="myth-text">{text}</p>
                    </div>
                </div>
'''
    return html

def build_pantheon_cards(cards):
    html = ''
    for name, greek, domain, link in cards:
        html += f'''                <a href="{link}" class="olympian-card">
                    <span class="olympian-greek">{greek}</span>
                    <span class="olympian-name">{name}</span>
                    <span class="olympian-domain">{domain}</span>
                </a>
'''
    return html

def build_variations_list(variations):
    html = ''
    for name, label, note in variations:
        html += f'''                <div class="variation-row reveal-up">
                    <span class="variation-name">{name}</span>
                    <span class="variation-label">{label}</span>
                    <span class="variation-note">{note}</span>
                </div>
'''
    return html

def build_related_cards(site_id, related_ids):
    html = ''
    for rel_id in related_ids[:4]:
        rel = SITES.get(rel_id)
        if rel:
            html += f'''                <a href="/sites/{rel_id}/" class="related-card reveal-up">
                    <span class="related-greek">{rel["greek"]}</span>
                    <span class="related-name">{rel["unicode"]}</span>
                    <span class="related-tagline">{rel["tagline"]}</span>
                </a>
'''
    return html

def build_schema(site_id, config):
    data = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": config['unicode'] + " — " + config['tagline'],
        "description": config['description'],
        "url": f"https://punicodex.com/sites/{site_id}/",
        "about": {
            "@type": "Thing",
            "name": config['greek'],
            "alternateName": [site_id, config['unicode']],
            "description": config['tagline']
        },
        "isPartOf": {
            "@type": "WebSite",
            "name": "PUNICODEX",
            "url": "https://punicodex.com"
        }
    }
    return json.dumps(data, indent=4, ensure_ascii=False)

def process_site(site_id, config):
    site_dir = ROOT / 'sites' / site_id
    site_dir.mkdir(parents=True, exist_ok=True)

    # Build HTML
    html = HTML_TEMPLATE.format(
        site_id=site_id,
        greek=config['greek'],
        unicode=config['unicode'],
        ascii=config['ascii'],
        punycode=config['punycode'],
        tagline=config['tagline'],
        description=config['description'],
        og_desc=config['og_desc'],
        tier=config['tier'],
        tier_subtype=config['tier_subtype'],
        pronunciation=config['pronunciation'],
        pronunciation_note=config['pronunciation_note'],
        etymology=config['etymology'],
        domain_meaning=config['domain_meaning'],
        realm_cards=build_realm_cards(config['realm_cards']),
        symbols_list=build_symbols_list(config['symbols']),
        myth_cards=build_myth_cards(config['myth_cards']),
        pantheon_cards=build_pantheon_cards(config['pantheon_cards']),
        variations_list=build_variations_list(config['variations']),
        related_cards=build_related_cards(site_id, config['related']),
        color_accent=config['color_accent'],
        schema_json=build_schema(site_id, config),
    )

    # Build CSS
    css = TEMPLATE_CSS.replace('#olympos-primary', config['color_accent'])
    css = css.replace('rgba(139, 90, 43, 0.3)', config['color_glow'])

    # Build JS
    js = TEMPLATE_JS.replace('olympos', site_id)

    # Write files
    (site_dir / 'index.html').write_text(html, encoding='utf-8')
    (site_dir / 'styles.css').write_text(css, encoding='utf-8')
    (site_dir / 'script.js').write_text(js, encoding='utf-8')

    print(f"Built {site_id}: {len(html)} bytes HTML, {len(css)} bytes CSS, {len(js)} bytes JS")

if __name__ == '__main__':
    for site_id, config in SITES.items():
        process_site(site_id, config)
    print(f"\nBuilt all {len(SITES)} continental temples successfully!")
