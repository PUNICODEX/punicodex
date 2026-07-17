/**
 * PUNICODEX — Flagship Temple Enhancer
 * Adds schema.org, global nav, related entries, and fixed CTAs
 * to the 20 existing hand-crafted temple pages.
 */

const fs = require('fs');
const path = require('path');
const { LEXICON } = require('../type/js/lexicon.js');

const BUILT_TEMPLES = [
    'zeus','ares','apollon','hades','hekate','nike','aphrodite','athena',
    'demeter','hera','hermes','hephaistos','hestia','poseidon','persephone',
    'prometheus','artemis','atlas','dionysos','medousa'
];

const PANTHEON_LABELS = {
    greek: 'Greek', 'greek-location': 'Greek', norse: 'Norse',
    egyptian: 'Egyptian', sanskrit: 'Sanskrit', celtic: 'Celtic',
    mesopotamian: 'Mesopotamian', polynesian: 'Polynesian',
    japanese: 'Japanese', nahuatl: 'Nahuatl', yoruba: 'Yoruba',
    slavic: 'Slavic', zoroastrian: 'Zoroastrian', incan: 'Incan',
};

function getTierSubtype(entry) {
    const hasStress = /[áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛ]/.test(entry.unicode);
    const hasLength = /[āēīōūĀĒĪŌŪ]/.test(entry.unicode);
    if (entry.tier === 'dual') return 'Dual-Tier';
    if (entry.tier === '1') {
        if (hasStress && hasLength) return 'Tier-1 Full';
        if (hasStress) return 'Tier-1 Accent-Preserving';
        if (hasLength) return 'Tier-1 Macron-Preserving';
        return 'Tier-1';
    }
    if (entry.tier === '2') {
        if (hasStress) return 'Tier-2 Accent-Preserving';
        if (hasLength) return 'Tier-2 Macron-Preserving';
        return 'Tier-2 Basic';
    }
    return entry.tierLabel;
}

function getRelatedEntries(entry, limit = 6) {
    return LEXICON
        .filter(e => e.id !== entry.id && e.pantheon === entry.pantheon)
        .slice(0, limit);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function generateSchemaOrg(entry) {
    const hasOriginal = entry.greek && entry.greek !== '—';
    return `
    <!-- Schema.org -->
    <script type="application/ld+json">
${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${entry.unicode} — ${entry.domain}`,
    description: `The authentic digital shrine to ${entry.unicode}. Explore the correct ${PANTHEON_LABELS[entry.pantheon] || 'ancient'} orthography, Unicode restoration, and scholarly sources for ${entry.unicode}.com.`,
    url: `https://punicodex.com/sites/${entry.id}/`,
    about: {
        '@type': 'Thing',
        name: hasOriginal ? entry.greek : entry.unicode,
        alternateName: [entry.ascii, entry.unicode],
        description: entry.meaning || entry.domain,
    },
    isPartOf: {
        '@type': 'WebSite',
        name: 'PUNICODEX',
        url: 'https://punicodex.com',
    },
    primaryImageOfPage: {
        '@type': 'ImageObject',
        url: 'https://punicodex.com/assets/images/og-default.svg',
    },
}, null, 4)}
    </script>`;
}

function generateGlobalNav() {
    return `
    <!-- Global Nav -->
    <div style="position:fixed;top:0;left:0;width:100%;z-index:1001;background:rgba(10,10,10,0.95);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="max-width:1200px;margin:0 auto;padding:0.4rem clamp(1.5rem,5vw,3rem);display:flex;align-items:center;justify-content:space-between;">
            <a href="/" style="font-family:'Cinzel',serif;font-size:0.8rem;font-weight:700;letter-spacing:0.15em;color:#D4AF37;text-decoration:none;">PUNICODEX</a>
            <div style="display:flex;gap:1.5rem;">
                <a href="/pantheon/" style="font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:#A0A0A0;text-decoration:none;transition:color 0.3s;" onmouseover="this.style.color='#D4AF37'" onmouseout="this.style.color='#A0A0A0'">Pantheon</a>
                <a href="/lexicon/" style="font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:#A0A0A0;text-decoration:none;transition:color 0.3s;" onmouseover="this.style.color='#D4AF37'" onmouseout="this.style.color='#A0A0A0'">Lexicon</a>
                <a href="/type/" style="font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:#A0A0A0;text-decoration:none;transition:color 0.3s;" onmouseover="this.style.color='#D4AF37'" onmouseout="this.style.color='#A0A0A0'">Type</a>
                <a href="/tiers/" style="font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:#A0A0A0;text-decoration:none;transition:color 0.3s;" onmouseover="this.style.color='#D4AF37'" onmouseout="this.style.color='#A0A0A0'">Tiers</a>
            </div>
        </div>
    </div>`;
}

function generateRelatedSection(entry, related) {
    if (related.length === 0) return '';
    const pantheonLabel = PANTHEON_LABELS[entry.pantheon] || 'Ancient';

    return `
    <!-- Related Names -->
    <section class="section" id="related" style="background:#0A0A0A;padding:6rem 0;">
        <div class="container" style="max-width:1200px;margin:0 auto;padding:0 clamp(1.5rem,5vw,3rem);">
            <div style="text-align:center;margin-bottom:4rem;">
                <span style="display:block;font-family:'Cinzel',serif;font-size:0.85rem;color:#D4AF37;letter-spacing:0.4em;margin-bottom:1rem;">05</span>
                <h2 style="font-family:'Cinzel',serif;font-size:clamp(2rem,4vw,3.5rem);color:#F5F5F5;letter-spacing:0.05em;margin-bottom:1rem;">Related Names</h2>
                <p style="font-size:clamp(1rem,1.5vw,1.25rem);color:#A0A0A0;font-style:italic;">More from the ${pantheonLabel} pantheon</p>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.5rem;">
                ${related.map(r => {
                    const rSubtype = getTierSubtype(r);
                    const hasOrig = r.greek && r.greek !== '—';
                    return `
                <a href="/sites/${r.id}${r.hasAdSite ? '/lore/' : '/'}" style="padding:2rem 1.5rem;background:rgba(255,255,255,0.015);border:1px solid rgba(255,255,255,0.06);text-decoration:none;color:inherit;transition:all 0.4s ease;display:flex;flex-direction:column;gap:0.75rem;" onmouseover="this.style.borderColor='rgba(212,175,55,0.25)';this.style.background='rgba(255,255,255,0.03)';this.style.transform='translateY(-4px)';this.style.boxShadow='0 15px 40px rgba(0,0,0,0.3)';" onmouseout="this.style.borderColor='rgba(255,255,255,0.06)';this.style.background='rgba(255,255,255,0.015)';this.style.transform='none';this.style.boxShadow='none';">
                    <span style="font-family:'Cinzel',serif;font-size:1.25rem;color:#D4AF37;letter-spacing:0.05em;">${escapeHtml(r.unicode)}</span>
                    <span style="font-size:0.9rem;color:#A0A0A0;font-style:italic;">${hasOrig ? escapeHtml(r.greek) : '&nbsp;'}</span>
                    <span style="font-size:0.8rem;color:#A0A0A0;line-height:1.5;">${escapeHtml(r.domain)}</span>
                    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:auto;padding-top:0.5rem;">
                        <span style="font-size:0.65rem;letter-spacing:0.12em;text-transform:uppercase;padding:0.2rem 0.6rem;border:1px solid rgba(212,175,55,0.3);color:#D4AF37;">${escapeHtml(rSubtype)}</span>
                        <span style="font-size:0.65rem;letter-spacing:0.12em;text-transform:uppercase;padding:0.2rem 0.6rem;border:1px solid rgba(255,255,255,0.06);color:#A0A0A0;">${escapeHtml(PANTHEON_LABELS[r.pantheon] || r.pantheon)}</span>
                    </div>
                </a>`;
                }).join('')}
            </div>
        </div>
    </section>`;
}

function generateTypeCTA(entry) {
    return `
    <!-- Type Tool CTA -->
    <section style="padding:6rem 0;background:linear-gradient(180deg,#0A0A0A 0%,rgba(65,105,225,0.08) 100%);text-align:center;">
        <div class="container" style="max-width:700px;margin:0 auto;padding:0 clamp(1.5rem,5vw,3rem);">
            <h2 style="font-family:'Cinzel',serif;font-size:clamp(1.75rem,3vw,2.5rem);color:#F5F5F5;margin-bottom:1.5rem;letter-spacing:0.05em;">Experience the Name</h2>
            <p style="font-size:1.05rem;color:#A0A0A0;line-height:1.8;margin-bottom:2.5rem;">See how ${escapeHtml(entry.unicode)} behaves in the PUNICODEX Type Tool — with predictive autocomplete, character-by-character breakdown, and scholarly constraint validation.</p>
            <div style="display:inline-flex;align-items:center;gap:1rem;padding:1rem 2rem;background:rgba(0,0,0,0.3);border:1px solid rgba(212,175,55,0.25);border-radius:2px;font-family:'Fira Code','Courier New',monospace;font-size:1.1rem;color:#D4AF37;margin-bottom:1.5rem;">
                <code>${entry.ascii}</code>
                <span style="color:#A0A0A0;">&rarr;</span>
                <code>${escapeHtml(entry.unicode)}</code>
            </div>
            <div>
                <a href="/type/#${entry.id}" style="display:inline-flex;align-items:center;gap:0.75rem;padding:1rem 2rem;background:linear-gradient(135deg,#D4AF37,#8B7355);color:#0A0A0A;font-family:'Cinzel',serif;font-size:0.85rem;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;transition:all 0.4s ease;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 10px 40px rgba(212,175,55,0.3)';" onmouseout="this.style.transform='none';this.style.boxShadow='none';">
                    <span>Open in Type Tool</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M7 17L17 7M17 7H7M17 7V17"/>
                    </svg>
                </a>
            </div>
        </div>
    </section>`;
}

function enhanceTemple(id) {
    const dir = path.join(__dirname, '..', 'sites', id);
    const indexPath = path.join(dir, 'index.html');

    if (!fs.existsSync(indexPath)) {
        console.log(`   ⚠️  ${id}: index.html not found, skipping`);
        return false;
    }

    let html = fs.readFileSync(indexPath, 'utf8');
    const entry = LEXICON.find(e => e.id === id);
    if (!entry) {
        console.log(`   ⚠️  ${id}: not in lexicon, skipping`);
        return false;
    }

    // 1. Add Schema.org before </head>
    if (!html.includes('Schema.org')) {
        const schema = generateSchemaOrg(entry);
        html = html.replace('</head>', schema + '\n</head>');
    }

    // 2. Add global nav after <body>
    if (!html.includes('Global Nav')) {
        const globalNav = generateGlobalNav();
        html = html.replace('<body>', '<body>' + globalNav);
        // Also add padding to existing nav to account for global nav
        html = html.replace(
            '<nav class="main-nav"',
            '<nav class="main-nav" style="top:40px;"'
        );
    }

    // 3. Fix dead CTA links
    html = html.replace(/href="#["']/g, 'href="/lexicon/"');

    // 4. Add Related Names before Pantheon Connection section
    if (!html.includes('id="related"')) {
        const related = getRelatedEntries(entry);
        const relatedSection = generateRelatedSection(entry, related);
        const pantheonIdx = html.lastIndexOf('<!-- Pantheon');
        const sectionPantheonIdx = html.lastIndexOf('<section class="section section-pantheon"');
        const insertIdx = pantheonIdx !== -1 ? pantheonIdx : sectionPantheonIdx;
        if (insertIdx !== -1) {
            html = html.slice(0, insertIdx) + relatedSection + '\n' + html.slice(insertIdx);
        }
    }

    // 5. Add Type Tool CTA before Footer
    if (!html.includes('Type Tool CTA')) {
        const typeCTA = generateTypeCTA(entry);
        const footerIdx = html.lastIndexOf('<footer class="main-footer"');
        if (footerIdx !== -1) {
            html = html.slice(0, footerIdx) + typeCTA + '\n' + html.slice(footerIdx);
        }
    }

    fs.writeFileSync(indexPath, html, 'utf8');
    return true;
}

// ─── Main ───
function main() {
    console.log('🏛️  Enhancing Flagship Temples');
    console.log('');

    let enhanced = 0;
    let skipped = 0;

    for (const id of BUILT_TEMPLES) {
        if (enhanceTemple(id)) {
            enhanced++;
            console.log(`   ✓ ${id}`);
        } else {
            skipped++;
        }
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Enhanced: ${enhanced}`);
    console.log(`   Skipped:  ${skipped}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main();
