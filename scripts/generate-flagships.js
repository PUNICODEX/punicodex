const fs = require('fs');
const path = require('path');
const punycode = require('punycode');

const ROOT = '.';

const PANTHEON_COLORS = {
    greek: { primary: '#D4AF37', secondary: '#4169E1', glow: 'rgba(212,175,55,0.3)' },
    'greek-location': { primary: '#D4AF37', secondary: '#228B22', glow: 'rgba(212,175,55,0.3)' },
    norse: { primary: '#4A90D9', secondary: '#8B0000', glow: 'rgba(74,144,217,0.3)' },
    egyptian: { primary: '#D4AF37', secondary: '#228B22', glow: 'rgba(212,175,55,0.3)' },
    sanskrit: { primary: '#FF9933', secondary: '#138808', glow: 'rgba(255,153,51,0.3)' },
    japanese: { primary: '#FF6B6B', secondary: '#4ECDC4', glow: 'rgba(255,107,107,0.3)' },
    nahuatl: { primary: '#E74C3C', secondary: '#2ECC71', glow: 'rgba(231,76,60,0.3)' },
    yoruba: { primary: '#9B59B6', secondary: '#F1C40F', glow: 'rgba(155,89,182,0.3)' },
    celtic: { primary: '#27AE60', secondary: '#8E44AD', glow: 'rgba(39,174,96,0.3)' },
    mesopotamian: { primary: '#D35400', secondary: '#2980B9', glow: 'rgba(211,84,0,0.3)' },
    polynesian: { primary: '#1ABC9C', secondary: '#E67E22', glow: 'rgba(26,188,156,0.3)' },
    slavic: { primary: '#C0392B', secondary: '#3498DB', glow: 'rgba(192,57,43,0.3)' },
    zoroastrian: { primary: '#F39C12', secondary: '#8E44AD', glow: 'rgba(243,156,18,0.3)' },
    incan: { primary: '#E74C3C', secondary: '#F1C40F', glow: 'rgba(231,76,60,0.3)' },
    buddhist: { primary: '#FF6B35', secondary: '#8B00FF', glow: 'rgba(255,107,53,0.3)' },
    chinese: { primary: '#E74C3C', secondary: '#F1C40F', glow: 'rgba(231,76,60,0.3)' },
    hittite: { primary: '#8E44AD', secondary: '#D4AF37', glow: 'rgba(142,68,173,0.3)' },
    korean: { primary: '#E74C3C', secondary: '#3498DB', glow: 'rgba(231,76,60,0.3)' },
    phoenician: { primary: '#D4AF37', secondary: '#8B0000', glow: 'rgba(212,175,55,0.3)' },
    taoist: { primary: '#1ABC9C', secondary: '#F39C12', glow: 'rgba(26,188,156,0.3)' },
};

function mapTier(tier) {
    if (tier === 'dual') return 'dual-tier';
    if (tier === '1') return 'tier-1';
    if (tier === '2') return 'tier-2';
    return tier || 'tier-2';
}

function findMascotPath(siteId) {
    const assetsDir = path.join(ROOT, 'sites', siteId, 'assets');
    if (!fs.existsSync(assetsDir)) return null;
    const files = fs.readdirSync(assetsDir);
    const mascot = files.find(f => f.includes('mascot'));
    if (mascot) {
        return `/sites/${siteId}/assets/${mascot}`;
    }
    // Check for shared mascot in root assets
    const sharedDir = path.join(ROOT, 'assets', 'images', 'mascots', 'webp');
    if (fs.existsSync(sharedDir)) {
        const shared = fs.readdirSync(sharedDir).find(f => f.includes(siteId) && f.includes('mascot'));
        if (shared) return `/assets/images/mascots/webp/${shared}`;
    }
    const sharedPngDir = path.join(ROOT, 'assets', 'images', 'mascots');
    if (fs.existsSync(sharedPngDir)) {
        const shared = fs.readdirSync(sharedPngDir).find(f => f.includes(siteId) && f.includes('mascot') && !f.endsWith('.webp'));
        if (shared) return `/assets/images/mascots/${shared}`;
    }
    return null;
}

function findLogomarkPath(siteId) {
    const assetsDir = path.join(ROOT, 'sites', siteId, 'assets');
    if (!fs.existsSync(assetsDir)) return null;
    const files = fs.readdirSync(assetsDir);
    const logomark = files.find(f => f.includes('logomark'));
    if (logomark) {
        return `/sites/${siteId}/assets/${logomark}`;
    }
    const sharedDir = path.join(ROOT, 'assets', 'images', 'logomarks');
    if (fs.existsSync(sharedDir)) {
        const shared = fs.readdirSync(sharedDir).find(f => f.includes(siteId) && f.includes('logomark'));
        if (shared) return `/assets/images/logomarks/${shared}`;
    }
    return null;
}

// Get handcrafted sites
const sitesDir = path.join(ROOT, 'sites');
const handcrafted = fs.readdirSync(sitesDir)
    .filter(id => {
        const hasMascot = fs.existsSync(path.join(sitesDir, id, 'assets')) && 
            fs.readdirSync(path.join(sitesDir, id, 'assets')).some(f => f.includes('mascot'));
        const hasScript = fs.existsSync(path.join(sitesDir, id, 'script.js'));
        let cssLines = 0;
        if (fs.existsSync(path.join(sitesDir, id, 'styles.css'))) {
            cssLines = fs.readFileSync(path.join(sitesDir, id, 'styles.css'), 'utf8').split('\n').length;
        }
        return hasMascot || (hasScript && cssLines > 500);
    })
    .sort();

console.log('Handcrafted temples:', handcrafted.length);

// Parse lexicon
const lexCode = fs.readFileSync(path.join(ROOT, 'type/js/lexicon.js'), 'utf8');
const lexEntries = [];
const idRe = /id:\s*'([^']+)'/g;
let m;
const ids = [];
while ((m = idRe.exec(lexCode))) ids.push({ id: m[1], index: m.index });
for (let i = 0; i < ids.length; i++) {
    const start = ids[i].index;
    const end = i < ids.length - 1 ? ids[i + 1].index : lexCode.length;
    const block = lexCode.slice(start, end);
    const getStr = (key) => {
        const re = new RegExp(key + ":\\s*'([^']*)'");
        const match = block.match(re);
        return match ? match[1] : '';
    };
    lexEntries.push({
        id: ids[i].id,
        ascii: getStr('ascii'),
        unicode: getStr('unicode'),
        greek: getStr('greek'),
        pantheon: getStr('pantheon'),
        tier: getStr('tier'),
        domain: getStr('domain'),
        meaning: getStr('meaning'),
    });
}
const lexMap = {};
lexEntries.forEach(e => lexMap[e.id] = e);

// Parse existing archetypes (flagships with rich data)
const archCode = fs.readFileSync(path.join(ROOT, 'js/archetypes.js'), 'utf8');
const existingEntries = [];
const entryRe = /\{\s*\n\s+id:\s*"([^"]+)"[\s\S]*?\n\s+\},/g;
while ((m = entryRe.exec(archCode))) {
    const block = m[0];
    const id = m[1];
    const getStr = (key) => {
        const re = new RegExp(key + ':\\s*"([^"]*)"');
        const match = block.match(re);
        return match ? match[1] : '';
    };
    const getBool = (key) => block.includes(key + ': true');
    const getArr = (key) => {
        const re = new RegExp(key + ':\\s*\\[([^\\]]*)\\]');
        const match = block.match(re);
        return match ? match[1].split(',').map(s => s.trim().replace(/"/g, '')).filter(Boolean) : [];
    };
    const colorsMatch = block.match(/colors:\s*\{([^}]+)\}/);
    let colors = { primary: '#D4AF37', secondary: '#4169E1', glow: 'rgba(212,175,55,0.3)' };
    if (colorsMatch) {
        const cm = colorsMatch[1];
        const pm = cm.match(/primary:\s*"([^"]+)"/);
        const sm = cm.match(/secondary:\s*"([^"]+)"/);
        const gm = cm.match(/glow:\s*"([^"]+)"/);
        if (pm) colors.primary = pm[1];
        if (sm) colors.secondary = sm[1];
        if (gm) colors.glow = gm[1];
    }
    existingEntries.push({
        id, name: getStr('name'), greek: getStr('greek'), domain: getStr('domain'),
        tagline: getStr('tagline'), tier: getStr('tier'), tierDetail: getStr('tierDetail'),
        pantheon: getStr('pantheon'), folder: getStr('folder'),
        domainUnicode: getStr('domainUnicode'), domainPunycode: getStr('domainPunycode'),
        domainAlt: getArr('domainAlt'), colors,
        mascotPath: getStr('mascotPath'), mascotFallback: getStr('mascotFallback'),
        logomarkPath: getStr('logomarkPath'), built: getBool('built'), darkPunchline: getBool('darkPunchline'),
    });
}
const existingMap = {};
existingEntries.forEach(a => existingMap[a.id] = a);

// Generate entries for handcrafted sites only
const allEntries = [];
for (const id of handcrafted) {
    const existing = existingMap[id];
    const lex = lexMap[id];
    let mascotPath = findMascotPath(id);
    const logomarkPath = findLogomarkPath(id);
    if (!mascotPath && logomarkPath) mascotPath = logomarkPath;
    
    if (existing && existing.id) {
        // Use existing rich data, but update paths if found in site folder
        const entry = { ...existing, built: true };
        if (mascotPath) {
            entry.mascotPath = mascotPath;
            entry.mascotFallback = mascotPath;
        }
        if (logomarkPath) entry.logomarkPath = logomarkPath;
        allEntries.push(entry);
    } else if (lex) {
        const colors = PANTHEON_COLORS[lex.pantheon] || PANTHEON_COLORS.greek;
        const tier = mapTier(lex.tier);
        const domainUnicode = lex.unicode + '.com';
        let domainPunycode;
        try { domainPunycode = punycode.toASCII(domainUnicode); } catch (e) { domainPunycode = lex.ascii + '.com'; }
        allEntries.push({
            id: lex.id, name: lex.unicode, greek: lex.greek,
            domain: lex.domain || lex.meaning || 'Divine Archetype',
            tagline: lex.meaning || '', tier, tierDetail: tier, pantheon: lex.pantheon,
            folder: lex.id, domainUnicode, domainPunycode,
            domainAlt: [lex.ascii + '.com'], colors,
            mascotPath: mascotPath || '', mascotFallback: mascotPath || '', logomarkPath: logomarkPath || '',
            built: true, darkPunchline: false,
        });
    } else {
        allEntries.push({
            id, name: id.charAt(0).toUpperCase() + id.slice(1), greek: '',
            domain: 'Divine Archetype', tagline: '', tier: 'tier-2', tierDetail: 'tier-2',
            pantheon: 'greek', folder: id, domainUnicode: id + '.com', domainPunycode: id + '.com',
            domainAlt: [id + '.com'], colors: PANTHEON_COLORS.greek,
            mascotPath: mascotPath || '', mascotFallback: mascotPath || '', logomarkPath: logomarkPath || '',
            built: true, darkPunchline: false,
        });
    }
}

allEntries.sort((a, b) => {
    const tierOrder = { 'dual-tier': 0, 'tier-1': 1, 'tier-2': 2 };
    const ta = tierOrder[a.tier] || 3;
    const tb = tierOrder[b.tier] || 3;
    if (ta !== tb) return ta - tb;
    return a.name.localeCompare(b.name);
});

const lines = [
    '/**',
    ' * PÚNYCODEX — Central Archetype Database',
    ' * Handcrafted flagship temples only.',
    ` * ${allEntries.length} handcrafted archetypes.`,
    ' */',
    '',
    'const ARCHETYPES = [',
];
for (const a of allEntries) {
    const props = [];
    props.push(`id: "${a.id}"`);
    props.push(`name: "${a.name}"`);
    props.push(`greek: "${a.greek || '—'}"`);
    props.push(`domain: "${a.domain}"`);
    if (a.tagline) props.push(`tagline: "${a.tagline}"`);
    props.push(`tier: "${a.tier}"`);
    props.push(`tierDetail: "${a.tierDetail}"`);
    props.push(`pantheon: "${a.pantheon}"`);
    props.push(`folder: "${a.folder}"`);
    props.push(`domainUnicode: "${a.domainUnicode}"`);
    props.push(`domainPunycode: "${a.domainPunycode}"`);
    if (a.domainAlt && a.domainAlt.length) props.push(`domainAlt: [${a.domainAlt.map(x => `"${x}"`).join(', ')}]`);
    props.push(`colors: { primary: "${a.colors.primary}", secondary: "${a.colors.secondary}", glow: "${a.colors.glow}" }`);
    if (a.mascotPath) props.push(`mascotPath: "${a.mascotPath}"`);
    if (a.mascotFallback) props.push(`mascotFallback: "${a.mascotFallback}"`);
    if (a.logomarkPath) props.push(`logomarkPath: "${a.logomarkPath}"`);
    props.push(`built: ${a.built}`);
    props.push(`darkPunchline: ${a.darkPunchline}`);
    lines.push('    {');
    lines.push('        ' + props.join(',\n        '));
    lines.push('    },');
}
lines.push('];');
lines.push('');
fs.writeFileSync(path.join(ROOT, 'js/archetypes.js'), lines.join('\n'));
console.log('Generated archetypes.js with ' + allEntries.length + ' handcrafted temples');
console.log('  With mascots: ' + allEntries.filter(e => e.mascotPath).length);
console.log('  Dual-tier: ' + allEntries.filter(e => e.tier === 'dual-tier').length);
console.log('  Tier-1: ' + allEntries.filter(e => e.tier === 'tier-1').length);
console.log('  Tier-2: ' + allEntries.filter(e => e.tier === 'tier-2').length);
