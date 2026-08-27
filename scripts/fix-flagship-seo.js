const fs = require('fs');
const path = require('path');
const { LEXICON } = require('../type/js/lexicon.js');

const BUILT_TEMPLES = [
    'zeus','ares','apollon','hades','hekate','nike','aphrodite','athena',
    'demeter','hera','hermes','hephaistos','hestia','poseidon','persephone',
    'prometheus','artemis','atlas','dionysos','medousa'
];

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

for (const id of BUILT_TEMPLES) {
    const filePath = path.join('sites', id, 'index.html');
    let html = fs.readFileSync(filePath, 'utf8');
    const entry = LEXICON.find(e => e.id === id);
    if (!entry) continue;

    const hasOriginal = entry.greek && entry.greek !== '—';
    const pageTitle = `${entry.greek && hasOriginal ? entry.greek + ' — ' : ''}${entry.unicode} | ${entry.domain} | PUNICODEX`;
    const pageDesc = `The authentic digital shrine to ${entry.unicode}. Explore the correct orthography, reconstructed pronunciation, and timeless mythology of ${hasOriginal ? entry.greek : entry.unicode}.`;
    const canonicalUrl = `https://punicodex.com/${id}/`;

    const seoBlock = `
    <link rel="canonical" href="${canonicalUrl}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(pageTitle)}">
    <meta property="og:description" content="${escapeHtml(pageDesc)}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="PUNICODEX">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
    <meta name="twitter:description" content="${escapeHtml(pageDesc)}">`;

    // Insert before </head>, after existing meta tags
    if (!html.includes('rel="canonical"')) {
        html = html.replace('</head>', seoBlock + '\n</head>');
        fs.writeFileSync(filePath, html, 'utf8');
        console.log(`✓ ${id}: Added canonical + OG + Twitter`);
    } else {
        console.log(`✓ ${id}: Already has SEO tags`);
    }
}
