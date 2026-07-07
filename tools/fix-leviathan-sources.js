const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../type/js/lexicon.js');
let src = fs.readFileSync(file, 'utf8');

// Replace Leviathan sources with catalog-approved keys
src = src.replace(
  /("id":\s*"leviathan"[\s\S]*?"sources":\s*\[)[^\]]+(\])/,
  '$1"Ugaritic texts", "CIS"$2'
);

fs.writeFileSync(file, src, 'utf8');
console.log('Updated leviathan sources');
