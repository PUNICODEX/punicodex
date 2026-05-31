const fs = require('fs');

const file = 'js/archetypes-v2.js';
let content = fs.readFileSync(file, 'utf8');

// The PowerShell -replace inserted literal \n strings. Fix them.
// Pattern: ",\\n        " should become ",\n        "
content = content.replace(/,\\n\n/g, ',\n');
content = content.replace(/\\n\n/g, '\n');

// Also handle case where \n is on same line
content = content.replace(/,\\n\s+/g, ',\n        ');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed literal \\\n characters');

// Now verify
const content2 = fs.readFileSync(file, 'utf8');
try {
    require('vm').runInNewContext(content2, {});
    console.log('Syntax OK');
} catch (e) {
    console.error('Syntax error:', e.message);
    console.error('Line:', e.stack);
    process.exit(1);
}
