const fs = require('fs');
const c = fs.readFileSync('middleware.js', 'utf8');

// Find all zeus-related domain entries
const lines = c.split('\n');
for (const line of lines) {
  if (line.includes('zeus') || line.includes('xn--zes') || line.includes('zes-9na')) {
    console.log(line.trim());
  }
}

console.log('\n--- Checking if domain keys are valid ---');
const hasXnZes = c.includes("'xn--zes-9na.com'");
console.log('Has xn--zes-9na.com key:', hasXnZes);
