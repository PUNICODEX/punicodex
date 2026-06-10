const fs = require('fs');
const z = fs.readFileSync('sites/zeus/script.js', 'utf8');
const c = fs.readFileSync('sites/zeus/styles.css', 'utf8');
console.log('zeus JS uses visible:', z.includes("classList.add('visible')"));
console.log('zeus JS uses revealed:', z.includes("classList.add('revealed')"));
console.log('zeus CSS has .visible:', c.includes('.visible'));
console.log('zeus CSS has .revealed:', c.includes('.revealed'));
