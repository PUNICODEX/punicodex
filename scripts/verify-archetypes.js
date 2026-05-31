const fs = require('fs');
const code = fs.readFileSync('js/archetypes-v2.js', 'utf8');

// Extract all entry blocks
const blocks = [...code.matchAll(/\{\s*\n\s+id: "([^"]+)"[\s\S]*?\n\s+\},?/g)];
console.log('Total entries:', blocks.length);

let issues = 0;
for (const block of blocks) {
    const b = block[0];
    // Check for string value not followed by comma before newline
    const bad = b.match(/"[^"]*"\s*\n\s+[a-zA-Z]/);
    if (bad) {
        console.log('Missing comma in:', block[1]);
        issues++;
    }
}
console.log('Issues found:', issues);

// Also check all entries have mascotPath
const ids = [...code.matchAll(/id: "([^"]+)"/g)].map(m => m[1]);
const mascotPaths = [...code.matchAll(/mascotPath: "([^"]*)"/g)].map(m => m[1]);
console.log('IDs:', ids.length, 'mascotPaths:', mascotPaths.length);
