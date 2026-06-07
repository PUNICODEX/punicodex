const fs = require('fs');
const path = require('path');

const sitesDir = 'sites';

// Re-scan for offenders
const dirs = fs.readdirSync(sitesDir).filter(d => {
    return fs.statSync(path.join(sitesDir, d)).isDirectory() &&
           fs.existsSync(path.join(sitesDir, d, 'index.html'));
});

const offenders = [];
dirs.forEach(dir => {
    const html = fs.readFileSync(path.join(sitesDir, dir, 'index.html'), 'utf8');
    const navMatch = html.match(/class="nav-links"[\s\S]*?<\/div>/);
    if (navMatch && navMatch[0].includes('punycodex.com')) {
        offenders.push(dir);
    }
});

console.log('Fixing', offenders.length, 'sites...\n');

let fixed = 0;
let skipped = [];

offenders.forEach(dir => {
    const filePath = path.join(sitesDir, dir, 'index.html');
    let html = fs.readFileSync(filePath, 'utf8');
    
    // Determine site type by sections
    const hasRealm = html.includes('id="the-realm"');
    const hasMyths = html.includes('id="myths"');
    const hasPantheon = html.includes('id="pantheon"');
    const hasBreakdown = html.includes('id="breakdown"');
    const hasTier = html.includes('id="tier"');
    const hasSources = html.includes('id="sources"');
    
    let newNavLinks;
    if (hasRealm && hasMyths && hasPantheon) {
        // Realm/flagship style
        newNavLinks = `                <a href="#the-name" class="nav-link">The Name</a>
                <a href="#pronunciation" class="nav-link">Pronunciation</a>
                <a href="#the-realm" class="nav-link">The Realm</a>
                <a href="#myths" class="nav-link">Myths</a>
                <a href="#pantheon" class="nav-link">Pantheon</a>`;
    } else if (hasBreakdown && hasTier && hasSources) {
        // Base temple style
        newNavLinks = `                <a href="#the-name" class="nav-link">The Name</a>
                <a href="#breakdown" class="nav-link">Breakdown</a>
                <a href="#tier" class="nav-link">Tier</a>
                <a href="#sources" class="nav-link">Sources</a>
                <a href="#related" class="nav-link">Related</a>`;
    } else {
        // Try to detect sections dynamically
        const sections = [];
        const regex = /<section[^>]*id="([^"]+)"[^>]*>/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            if (match[1] !== 'hero') sections.push(match[1]);
        }
        
        const labelMap = {
            'the-name': 'The Name',
            'pronunciation': 'Pronunciation',
            'breakdown': 'Breakdown',
            'tier': 'Tier',
            'sources': 'Sources',
            'related': 'Related',
            'the-realm': 'The Realm',
            'myths': 'Myths',
            'pantheon': 'Pantheon',
            'variations': 'Variations',
            'history': 'History',
            'type-tool': 'Type Tool',
            'type-cta': 'Type Tool'
        };
        
        const items = sections.slice(0, 5).map(id => {
            const label = labelMap[id] || id;
            return `                <a href="#${id}" class="nav-link">${label}</a>`;
        });
        
        if (items.length === 0) {
            skipped.push(dir + ' (no sections found)');
            return;
        }
        newNavLinks = items.join('\n');
    }
    
    // Find and replace the nav-links block using a robust approach
    const navStart = html.indexOf('<div class="nav-links">');
    const navEnd = html.indexOf('</div>', navStart);
    
    if (navStart === -1 || navEnd === -1) {
        skipped.push(dir + ' (nav block not found)');
        return;
    }
    
    const oldBlock = html.substring(navStart, navEnd + 6);
    if (!oldBlock.includes('punycodex.com')) {
        skipped.push(dir + ' (no external links in nav)');
        return;
    }
    
    const newBlock = '<div class="nav-links">\n' + newNavLinks + '\n            </div>';
    html = html.substring(0, navStart) + newBlock + html.substring(navEnd + 6);
    
    fs.writeFileSync(filePath, html, 'utf8');
    fixed++;
});

console.log('Fixed:', fixed);
console.log('Skipped:', skipped.length);
if (skipped.length > 0) {
    skipped.forEach(s => console.log('  ' + s));
}
