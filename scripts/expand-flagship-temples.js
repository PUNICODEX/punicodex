/**
 * PUNICODEX — Expand select base temples into full flagship pages.
 * Injects Name Variations, Mythology & Lore, Pronunciation, Symbols,
 * Syncretism, and Cultural Legacy sections into a generated base temple.
 *
 * Usage: node scripts/expand-flagship-temples.js
 */

const fs = require('fs');
const path = require('path');
const {
    generateTempleHTML,
    getTierSubtype,
    getRelatedEntries,
    LEXICON
} = require('./generate-temples');

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function expansionSections(entry, data) {
    const unicode = escapeHtml(entry.unicode);
    const lower = escapeHtml(entry.unicode.toLowerCase());
    const ownedDomain = escapeHtml(data.ownedDomain || `${lower}.com`);
    const ideal = escapeHtml(data.ideal || entry.unicode);
    const ascii = escapeHtml(data.ascii || entry.ascii);
    const alt = escapeHtml(data.alt || '');

    const altCard = alt ? `
                <div class="tier-feature-card reveal-up">
                    <div class="tier-feature-label">Alternate</div>
                    <div class="tier-feature-value">${alt}</div>
                    <div class="tier-feature-desc">${data.altDesc}</div>
                </div>` : '';

    const symbolsCards = data.symbols.map(s => `
                <div class="tier-feature-card reveal-up">
                    <div class="tier-feature-label">${escapeHtml(s.label)}</div>
                    <div class="tier-feature-value">${s.icon}</div>
                    <div class="tier-feature-desc">${escapeHtml(s.desc)}</div>
                </div>`).join('');

    return `
    <!-- Name Variations -->
    <section class="section section-tier" id="name-variations">
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">05</span>
                <h2 class="section-title">Name Variations</h2>
                <p class="section-subtitle">Owned, ideal, and fallback forms of the name</p>
            </div>
            <div class="tier-feature-grid">
                <div class="tier-feature-card reveal-up">
                    <div class="tier-feature-label">Owned</div>
                    <div class="tier-feature-value">${unicode} / ${ownedDomain}</div>
                    <div class="tier-feature-desc">${data.ownedDesc}</div>
                </div>
                <div class="tier-feature-card reveal-up">
                    <div class="tier-feature-label">Ideal</div>
                    <div class="tier-feature-value">${ideal}</div>
                    <div class="tier-feature-desc">${data.idealDesc}</div>
                </div>
                <div class="tier-feature-card reveal-up">
                    <div class="tier-feature-label">ASCII Fallback</div>
                    <div class="tier-feature-value">${ascii}</div>
                    <div class="tier-feature-desc">${data.asciiDesc}</div>
                </div>${altCard}
            </div>
        </div>
    </section>

    <!-- Mythology & Lore -->
    <section class="section section-tier" id="mythology-lore">
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">06</span>
                <h2 class="section-title">Mythology & Lore</h2>
                <p class="section-subtitle">${data.mythologySubtitle}</p>
            </div>
            <div class="tier-explanation reveal-up">
                ${data.mythologyParas.map(p => `<p class="lead-text">${p}</p>`).join('\n                ')}
            </div>
        </div>
    </section>

    <!-- Pronunciation -->
    <section class="section section-tier" id="pronunciation">
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">07</span>
                <h2 class="section-title">Pronunciation</h2>
                <p class="section-subtitle">How to say the name</p>
            </div>
            <div class="tier-explanation reveal-up">
                ${data.pronunciationParas.map(p => `<p class="lead-text">${p}</p>`).join('\n                ')}
            </div>
        </div>
    </section>

    <!-- Symbols & Iconography -->
    <section class="section section-tier" id="symbols-iconography">
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">08</span>
                <h2 class="section-title">Symbols & Iconography</h2>
                <p class="section-subtitle">${data.symbolsSubtitle}</p>
            </div>
            <div class="tier-feature-grid">
                ${symbolsCards}
            </div>
        </div>
    </section>

    <!-- Syncretism -->
    <section class="section section-tier" id="syncretism">
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">09</span>
                <h2 class="section-title">Syncretism</h2>
                <p class="section-subtitle">${data.syncretismSubtitle}</p>
            </div>
            <div class="tier-explanation reveal-up">
                ${data.syncretismParas.map(p => `<p class="lead-text">${p}</p>`).join('\n                ')}
            </div>
        </div>
    </section>

    <!-- Cultural Legacy -->
    <section class="section section-tier" id="cultural-legacy">
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">10</span>
                <h2 class="section-title">Cultural Legacy</h2>
                <p class="section-subtitle">${data.legacySubtitle}</p>
            </div>
            <div class="tier-explanation reveal-up">
                ${data.legacyParas.map(p => `<p class="lead-text">${p}</p>`).join('\n                ')}
            </div>
        </div>
    </section>
`;
}

function expandEntry(entry, data) {
    const related = getRelatedEntries(entry, LEXICON);
    const baseHtml = generateTempleHTML(entry, related);

    const sourcesMarker = '<!-- Sources Section -->';
    const relatedMarker = '<!-- Related Names -->';

    const sourcesIdx = baseHtml.indexOf(sourcesMarker);
    if (sourcesIdx === -1) {
        throw new Error(`Could not find Sources marker for ${entry.id}`);
    }

    const beforeSources = baseHtml.slice(0, sourcesIdx);
    const afterSources = baseHtml.slice(sourcesIdx);

    const relatedIdx = afterSources.indexOf(relatedMarker);
    if (relatedIdx === -1) {
        throw new Error(`Could not find Related marker for ${entry.id}`);
    }

    let sourcesSection = afterSources.slice(0, relatedIdx);
    let relatedSection = afterSources.slice(relatedIdx);

    // Renumber Sources -> 11 and Related -> 12
    sourcesSection = sourcesSection.replace(
        /<span class="section-number">\d+<\/span>/,
        '<span class="section-number">11</span>'
    );
    relatedSection = relatedSection.replace(
        /<span class="section-number">\d+<\/span>/,
        '<span class="section-number">12</span>'
    );

    const expansion = expansionSections(entry, data);

    return beforeSources + expansion + sourcesSection + relatedSection;
}

const EXPANSIONS = {
    typhon: {
        ownedDomain: 'typhōn.com',
        ideal: 'Typhōn',
        ascii: 'Typhon',
        alt: 'Typhoeus',
        ownedDesc: 'The acquired Unicode domain; macron on the long omega',
        idealDesc: 'Fully accurate Greek-length restoration (Τυφῶν)',
        asciiDesc: 'Plain Latin spelling; loses the macron marking the long vowel',
        altDesc: 'Latinized Greek variant of the monster\'s name',
        mythologySubtitle: 'The smoke-and-fire father of monsters',
        mythologyParas: [
            'In Hesiod\'s <em>Theogony</em>, <strong>Typhōn</strong> is the last and most terrible child of <strong>Gaia</strong> (Earth) and <strong>Tartaros</strong> — a writhing, storm-breathing giant with a hundred serpent heads and eyes that flashed fire. He was born to avenge the defeat of the Titans and challenge the rule of Zeus.',
            'Typhōn waged war against Olympus, tearing up mountains and hurling them at the gods. Most of the Olympians fled in terror to Egypt, where they disguised themselves as animals. Zeus stood his ground and battled the monster across the heavens, eventually hurling thunderbolts that burned Typhōn\'s hundred heads and cast him down.',
            'Defeated, Typhōn was buried beneath <strong>Mount Etna</strong> (or, in some traditions, Mount Haemus or the Corycian cave). His restless breath became volcanic fire, his struggles earthquakes, and his storms the typhoons that still bear his name. With <strong>Echidna</strong> he fathered many of Greece\'s most famous monsters: Cerberus, the Hydra, the Chimera, the Sphinx, and the Nemean Lion.'
        ],
        pronunciationParas: [
            'Ancient Greek: <strong>/ty.pʰɔ̂ːn/</strong>, with a long, stressed omega. The Latinized form <em>Typhōn</em> keeps the macron to show that the <em>o</em> is long.',
            'Modern English usually says <em>TIE-fon</em>. The Unicode restoration <em>Typhōn</em> preserves the long vowel that plain <em>Typhon</em> silently erases.'
        ],
        symbolsSubtitle: 'Attributes of the storm giant',
        symbols: [
            { label: 'Serpent Coils', icon: '🐍', desc: 'Hundred snake heads and dragon-like body' },
            { label: 'Volcano', icon: '🌋', desc: 'Buried beneath Etna; his breath is fire' },
            { label: 'Fire & Smoke', icon: '🔥', desc: 'Born of smoke and flame' },
            { label: 'Whirlwind', icon: '🌪️', desc: 'Storms and typhoons are his legacy' },
            { label: 'Thunderbolt', icon: '⚡', desc: 'The weapon Zeus used to defeat him' }
        ],
        syncretismSubtitle: 'Typhōn across cultures',
        syncretismParas: [
            '<strong>Egyptian Set:</strong> Greek writers identified Typhōn with the Egyptian god <strong>Set</strong>, the red-haired storm deity and enemy of Horus. Both are forces of disorder defeated by a sky-god, and both were linked to deserts, storms, and foreigners.',
            '<strong>Near Eastern storm demons:</strong> Scholars compare Typhōn to older Near Eastern chaos monsters such as the Ugaritic <strong>Lotan</strong> and the Babylonian <strong>Tiamat</strong> — dragon-like figures personifying the destructive power of wind and sea, ultimately subdued by a divine king.',
            '<strong>Typhonian occultism:</strong> In the 20th century, Aleister Crowley and Kenneth Grant used the name "Typhonian" for currents of ceremonial magic, associating the figure with primordial darkness, serpent power, and pre-dynastic Egyptian religion.'
        ],
        legacySubtitle: 'From monster to meteorology',
        legacyParas: [
            'The word <strong>typhoon</strong> — a violent tropical cyclone — entered European languages partly through Arabic <em>ṭūfān</em> and partly under the influence of the Greek monster\'s name. Whether the two roots are ultimately related remains debated, but the association is ancient and persistent.',
            'Typhōn endures as an archetype of the defeated chaos-dragon, from Hesiod\'s hymns to modern fantasy and video games. He represents the raw, volcanic fury of the earth and the perpetual war between cosmic order and primal disorder.'
        ]
    },
    ishtar: {
        ownedDomain: 'ištar.com',
        ideal: 'Ištar',
        ascii: 'Ishtar',
        alt: 'Inanna',
        ownedDesc: 'The acquired Unicode domain; S-caron preserves the Akkadian /ʃ/',
        idealDesc: 'Fully accurate Akkadian/Assyrian restoration with S-caron',
        asciiDesc: 'Plain Latin spelling; replaces š with the sh digraph',
        altDesc: 'Sumerian precursor and counterpart, Lady of Heaven',
        mythologySubtitle: 'Lady of Heaven, queen of love and war',
        mythologyParas: [
            '<strong>Ištar</strong> (Akkadian) and <strong>Inanna</strong> (Sumerian) are the most prominent goddesses of Mesopotamia, ruling love, sexuality, fertility, war, and the planet Venus. Hymns praise her as both the life-giving morning star and the terrible warrior who rides into battle.',
            'The most famous myth is <strong>Ištar\'s Descent to the Underworld</strong>. She descends to the realm of her sister <strong>Ereškigal</strong>, is stripped of her divine powers at seven gates, and is killed. Her servant <strong>Ninšubur</strong> secures her rescue, but the underworld demands a substitute: her husband <strong>Tammuz</strong> (Dumuzid), the shepherd god of vegetation, who spends half the year in the underworld.',
            'In the <strong>Epic of Gilgameš</strong>, Ištar proposes marriage to the hero Gilgameš. When he refuses and catalogues her destructive former lovers, she demands the <strong>Bull of Heaven</strong> from her father <strong>Anu</strong> and sends it to ravage Uruk. Gilgameš and Enkidu slay the bull, setting in motion Enkidu\'s fatal punishment.'
        ],
        pronunciationParas: [
            'Akkadian: <strong>/ˈiʃtar/</strong>, with the initial consonant pronounced like English <em>sh</em>. The <em>š</em> (S-caron) is the standard scholarly way to write this sound when the original cuneiform does not use the Latin alphabet.',
            'Modern English usually says <em>ISH-tar</em>. The Unicode restoration <em>Ištar</em> keeps the single character that signals the original /ʃ/ sound — a precision that <em>Ishtar</em> can only approximate with two letters.'
        ],
        symbolsSubtitle: 'Attributes of the Venus goddess',
        symbols: [
            { label: 'Lion', icon: '🦁', desc: 'Warrior goddess riding or standing on a lion' },
            { label: 'Eight-Pointed Star', icon: '⭐', desc: 'Primary symbol of Venus / Ištar' },
            { label: 'Dove', icon: '🕊️', desc: 'Bird of love and the goddess\'s messenger' },
            { label: 'Rose / Rosette', icon: '🌹', desc: 'Emblem of beauty and fertility' },
            { label: 'Crescent Moon', icon: '🌙', desc: 'Her father Sin (Nanna), the moon god' }
        ],
        syncretismSubtitle: 'Ištar across cultures',
        syncretismParas: [
            '<strong>Sumerian Inanna:</strong> Ištar is the direct Akkadian continuation of <strong>Inanna</strong>, the earlier Sumerian goddess of love and war. The two share myths, titles, and iconography so closely that scholars often treat them as a single complex.',
            '<strong>Phoenician Astarte and Syrian Atargatis:</strong> West Semitic <strong>ʿAštart</strong> (Astarte) and later Atargatis are close cognates, spreading Ištar\'s cult across the Levant and Mediterranean. The Greek <strong>Aphrodītē</strong> and Roman <strong>Venus</strong> absorbed aspects of her as goddess of love, while the Greek <strong>Ártemis</strong> and Roman <strong>Diana</strong> absorbed her warrior side.',
            '<strong>Egyptian Isis:</strong> During the Greco-Roman period, Ištar/Astarte was frequently syncretized with <strong>Isis</strong>, another powerful goddess of love, magic, and cosmic queenship. Both were invoked across the ancient world as mistresses of heaven and sea.'
        ],
        legacySubtitle: 'From Babylon to book and screen',
        legacyParas: [
            'Ištar\'s most famous monument is the <strong>Ishtar Gate</strong> of Babylon, a blue-glazed Processional Way guarded by lions, bulls, and dragons. Fragments now reside in museums from Berlin to New York, making her one of the most visually recognizable deities of the ancient Near East.',
            'Her name echoes in the Biblical <strong>Esther</strong> and possibly in the festival of <strong>Easter</strong> (a contested but persistent folk etymology). Today she appears in fantasy literature, games, and neopagan devotion as the original warrior-queen of heaven.'
        ]
    }
};

function main() {
    const sitesDir = path.join(__dirname, '..', 'sites');

    for (const [id, data] of Object.entries(EXPANSIONS)) {
        const entry = LEXICON.find(e => e.id === id);
        if (!entry) {
            console.error(`Entry not found: ${id}`);
            process.exit(1);
        }

        const html = expandEntry(entry, data);
        const outPath = path.join(sitesDir, id, 'index.html');
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, html, 'utf8');
        console.log(`✓ Expanded flagship temple: ${outPath}`);
    }
}

main();
