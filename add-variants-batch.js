const fs = require('fs');

const lexPath = 'type/js/lexicon.js';
let lex = fs.readFileSync(lexPath, 'utf8');

function addVariants(id, variantsBlock) {
    const re = new RegExp(`(id: '${id}',[\\s\\S]*?sources: \\[.*?\\],)`);
    if (!re.test(lex)) {
        console.log(`SKIP: ${id} not found`);
        return;
    }
    lex = lex.replace(re, `$1\n    variants: [\n${variantsBlock}\n    ],`);
    console.log(`OK: ${id}`);
}

addVariants('hekate', `      { unicode: 'Hekatē', type: 'macron-only', note: 'LSJ convention: length only, no acute' },
      { unicode: 'Hekate', type: 'ascii', note: 'Modern English' }`);

addVariants('nike', `      { unicode: 'Nikē', type: 'macron-only', note: 'LSJ convention: length only, no acute' },
      { unicode: 'Nike', type: 'ascii', note: 'Modern English' }`);

addVariants('zeus', `      { id: 'zeusv1', unicode: 'Zeus', type: 'ascii', note: 'Modern English' }`);

addVariants('ares', `      { id: 'aresv1', unicode: 'Arēs', type: 'macron-only', note: 'LSJ convention: length only, no acute' },
      { unicode: 'Ares', type: 'ascii', note: 'Modern English' }`);

addVariants('athena', `      { id: 'athenav1', unicode: 'Athena', type: 'ascii', note: 'Modern English' },
      { unicode: 'Athēnā', type: 'macron-only', note: 'LSJ convention: length only, no acute on epsilon' }`);

addVariants('poseidon', `      { id: 'poseidonv1', unicode: 'Poseidōn', type: 'macron-only', note: 'LSJ convention: length only, no circumflex' },
      { unicode: 'Poseidon', type: 'ascii', note: 'Modern English' }`);

addVariants('hermes', `      { id: 'hermesv1', unicode: 'Hermēs', type: 'macron-only', note: 'LSJ convention: length only, no circumflex' },
      { unicode: 'Hermes', type: 'ascii', note: 'Modern English' }`);

addVariants('aphrodite', `      { id: 'aphroditev1', unicode: 'Aphroditē', type: 'macron-only', note: 'LSJ convention: length only, no acute' },
      { unicode: 'Aphrodite', type: 'ascii', note: 'Modern English' }`);

addVariants('demeter', `      { unicode: 'Demeter', type: 'ascii', note: 'Modern English' }`);

addVariants('hera', `      { unicode: 'Hera', type: 'ascii', note: 'Modern English' }`);

addVariants('hephaistos', `      { unicode: 'Hephaistos', type: 'ascii', note: 'Modern English' }`);

addVariants('hestia', `      { unicode: 'Hestia', type: 'ascii', note: 'Modern English' }`);

addVariants('persephone', `      { unicode: 'Persephone', type: 'ascii', note: 'Modern English' }`);

addVariants('prometheus', `      { unicode: 'Prometheus', type: 'ascii', note: 'Modern English' }`);

addVariants('artemis', `      { unicode: 'Artemis', type: 'ascii', note: 'Modern English' }`);

addVariants('dionysos', `      { unicode: 'Dionysos', type: 'ascii', note: 'Modern English' }`);

addVariants('medousa', `      { unicode: 'Medousa', type: 'ascii', note: 'Modern English' }`);

addVariants('atlas', `      { unicode: 'Atlas', type: 'ascii', note: 'Modern English' }`);

fs.writeFileSync(lexPath, lex);
console.log('Done');
