const fs = require('fs');

// Test on admetus first
const html = fs.readFileSync('sites/admetus/index.html', 'utf8');

// Check sections
const hasBreakdown = html.includes('id="breakdown"');
const hasTier = html.includes('id="tier"');
const hasSources = html.includes('id="sources"');
const hasRealm = html.includes('id="the-realm"');
const hasMyths = html.includes('id="myths"');
const hasPantheon = html.includes('id="pantheon"');

console.log('admetus sections:');
console.log('  breakdown:', hasBreakdown);
console.log('  tier:', hasTier);
console.log('  sources:', hasSources);
console.log('  the-realm:', hasRealm);
console.log('  myths:', hasMyths);
console.log('  pantheon:', hasPantheon);

// Check nav block
const navMatch = html.match(/(<div class="nav-links">)([\s\S]*?)(<\/div>)/);
if (navMatch) {
    console.log('\nNav block found, length:', navMatch[0].length);
    console.log('Has external:', navMatch[2].includes('punycodex.com'));
    console.log('Nav block:\n', navMatch[0]);
}
