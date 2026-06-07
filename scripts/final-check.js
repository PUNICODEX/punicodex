const fs = require('fs');
const html = fs.readFileSync('sites/aigyptos/index.html', 'utf8');

console.log('=== Aigyptos Improvements Check ===');
console.log('Has desert canvas:', html.includes('id="desert-canvas"'));
console.log('Has script.js:', html.includes('script.js?v=perf7'));
console.log('Has section-bg-glow:', html.includes('class="section-bg-glow"'));
console.log('Has domain icons:', (html.match(/class="domain-icon"/g) || []).length);
console.log('Has phoneme breakdown:', html.includes('class="phoneme"'));
console.log('Has sidebar cards:', html.includes('class="sidebar-card"'));
console.log('Has Pantheon Connection:', html.includes('id="pantheon-connect"'));
console.log('Has btn-primary on CTA:', html.includes('class="btn-primary reveal-up"'));
console.log('Symbols fixed:', !html.includes('Sacred symbol of nile'));
console.log('Local nav internal:', !html.includes('punycodex.com/pantheon/'));
