const fs = require('fs');

const script = fs.readFileSync('sites/osaka/script.js', 'utf8');
const html = fs.readFileSync('sites/osaka/index.html', 'utf8');

// Find all getElementById calls
const ids = [...new Set([...script.matchAll(/getElementById\('([^']+)'\)/g)].map(m => m[1]))];
console.log('getElementById calls:');
ids.forEach(id => {
    const has = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
    console.log(`  ${id} => ${has}`);
});

// Find all querySelector calls with IDs
const qsIds = [...new Set([...script.matchAll(/querySelector\(["']#([^"']+)["']\)/g)].map(m => m[1]))];
console.log('\nquerySelector(#id) calls:');
qsIds.forEach(id => {
    const has = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
    console.log(`  #${id} => ${has}`);
});

// Find all querySelector calls with classes
const qsClasses = [...new Set([...script.matchAll(/querySelector\(["']\.([^"']+)["']\)/g)].map(m => m[1]))];
console.log('\nquerySelector(.class) calls:');
qsClasses.forEach(cls => {
    const has = html.includes(`class="${cls}"`) || html.includes(`class='${cls}'`) || html.includes(`${cls}"`);
    console.log(`  .${cls} => ${has}`);
});

// Check for functions that might fail
console.log('\n--- Potential crash points ---');

// Check for main-nav, nav-toggle, nav-links
['main-nav', 'nav-toggle', 'nav-links'].forEach(id => {
    const has = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
    if (!has) console.log(`MISSING: #${id}`);
});

['.nav-links', '.nav-toggle', '.mascot-img'].forEach(cls => {
    const has = html.includes(`class="${cls.replace('.', '')}"`);
    if (!has) console.log(`MISSING: ${cls}`);
});
