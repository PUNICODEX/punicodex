const fs = require('fs');
const path = require('path');

const pages = [
    'index.html',
    'pantheon/index.html',
    'type/index.html',
    'tiers/index.html',
    'codex/index.html',
    'store/index.html',
    'about/index.html',
    'contact/index.html',
];

for (const page of pages) {
    const filePath = path.join(__dirname, '..', page);
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  ${page} not found`);
        continue;
    }

    let html = fs.readFileSync(filePath, 'utf8');

    // Skip if already has Lexicon link
    if (html.includes('href="/lexicon/"')) {
        console.log(`✓ ${page} already has Lexicon link`);
        continue;
    }

    // Add Lexicon link after Pantheon link
    html = html.replace(
        /<a href="\/pantheon\/" class="nav-link">Pantheon<\/a>/,
        '<a href="/pantheon/" class="nav-link">Pantheon</a>\n                <a href="/lexicon/" class="nav-link">Lexicon</a>'
    );

    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`✓ ${page} updated`);
}
