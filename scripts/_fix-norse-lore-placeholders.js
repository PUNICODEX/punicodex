const fs = require('fs');
const path = require('path');

const sitesDir = path.join(__dirname, '..', 'sites');

const norseNames = {
  alfheimr: 'Álfheimr',
  helheimr: 'Helheimr',
  jotunheimr: 'Jötunheimr',
  midgardr: 'Miðgarðr',
  muspellheimr: 'Muspellheimr',
  odinn: 'Óðinn',
  ragnarok: 'Ragnarǫk',
  thor: 'Þórr',
};

function replacePlaceholders(html, name) {
  let h = html;

  // 1. Standalone between tags (most reliable)
  h = h.replace(/>—</g, `>${name}<`);

  // 2. Alt attributes starting with em dash
  h = h.replace(/alt="—/g, `alt="${name}`);

  // 3. Domain references
  h = h.replace(/—\.com/g, `${name}.com`);

  // 4. Schema / meta specific phrases
  h = h.replace(/"name": "—"/g, `"name": "${name}"`);
  h = h.replace(/shrine to —,/g, `shrine to ${name},`);
  h = h.replace(/mythology of —\./g, `mythology of ${name}.`);
  h = h.replace(/orthography, reconstructed pronunciation, and timeless mythology of —\./g, `orthography, reconstructed pronunciation, and timeless mythology of ${name}.`);
  h = h.replace(/description" content="The authentic digital shrine to —,/g, `description" content="The authentic digital shrine to ${name},`);
  h = h.replace(/description" content="The authentic digital shrine to —\./g, `description" content="The authentic digital shrine to ${name}.`);

  // 5. Body-text placeholders as grammatical noun
  // These use capturing groups to preserve surrounding punctuation/spaces
  const bodyPatterns = [
    // Subject position
    [/([>\.\!\?]\s*)— is /g, `$1${name} is `],
    [/([>])— is not /g, `$1${name} is not `],

    // After prepositions / objects
    [/ to — and /g, ` to ${name} and `],
    [/ to — is /g, ` to ${name} is `],
    [/ to —\./g, ` to ${name}.`],
    [/ of —\./g, ` of ${name}.`],
    [/ of — — /g, ` of ${name} — `],
    [/ of —,/g, ` of ${name},`],
    [/ in —\./g, ` in ${name}.`],
    [/ in —,/g, ` in ${name},`],
    [/ In —, /g, ` In ${name}, `],
    [/ stayed in —\./g, ` stayed in ${name}.`],
    [/ entrance to —\./g, ` entrance to ${name}.`],
    [/ road to — is /g, ` road to ${name} is `],
    [/ journey to — is /g, ` journey to ${name} is `],
    [/ rode to — and /g, ` rode to ${name} and `],

    // Verb objects
    [/ ruled — with /g, ` ruled ${name} with `],
    [/ receive —\./g, ` receive ${name}.`],
    [/ release —\./g, ` release ${name}.`],
    [/ hold —\./g, ` hold ${name}.`],
    [/ keep — /g, ` keep ${name} `],
    [/ understand — /g, ` understand ${name} `],

    // Emphasized name
    [/it is <em>—<\/em>/g, `it is <em>${name}</em>`],
    [/it is <em>—<\/em>,/g, `it is <em>${name}</em>,`],

    // Other clause-initial / standalone
    [/([\.\!\?]\s+)— ([a-z])/g, `$1${name} $2`],

    // Additional contextual placeholders seen in files
    [/ and — is /g, ` and ${name} is `],
    [/In —, the /g, `In ${name}, the `],
    [/rides to — to /g, `rides to ${name} to `],
    [/And — has /g, `And ${name} has `],
    [/<strong>—\.<\/strong>/g, `<strong>${name}.</strong>`],
    [/<strong>—<\/strong>/g, `<strong>${name}</strong>`],
    [/ in —,/g, ` in ${name},`],
    [/ in —\./g, ` in ${name}.`],
  ];

  for (const [re, repl] of bodyPatterns) {
    h = h.replace(re, repl);
  }

  return h;
}

let total = 0;
for (const [siteId, name] of Object.entries(norseNames)) {
  const filePath = path.join(sitesDir, siteId, 'lore', 'index.html');
  if (!fs.existsSync(filePath)) {
    console.log(`Skip: ${filePath} not found`);
    continue;
  }
  const original = fs.readFileSync(filePath, 'utf8');
  const fixed = replacePlaceholders(original, name);
  if (fixed !== original) {
    fs.writeFileSync(filePath, fixed, 'utf8');
    const remaining = (fixed.match(/—/g) || []).length;
    console.log(`Fixed ${siteId}: ${remaining} em dash occurrences remain`);
    total++;
  } else {
    console.log(`No changes needed for ${siteId}`);
  }
}
console.log(`\nUpdated ${total} files.`);
