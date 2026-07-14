const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');
let content = fs.readFileSync(file, 'utf8');

function replaceOnce(oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.warn('Pattern not found:', oldStr.slice(0, 80));
    return false;
  }
  content = content.replace(oldStr, newStr);
  return true;
}

const letoOld = `      {
        "char": "e",
        "to": "e",
        "type": "same",
        "note": "Short epsilon"
      },
      {
        "char": "t",
        "to": "t",
        "type": "same",
        "note": "Tau"
      },
      {
        "char": "o",
        "to": "ō",
        "type": "length",
        "note": "Omega: long omicron"
      }
    ]
  },
  {
    "id": "epimetheus"`;

const letoNew = `      {
        "char": "e",
        "to": "ē",
        "type": "length",
        "note": "Eta: long epsilon"
      },
      {
        "char": "t",
        "to": "t",
        "type": "same",
        "note": "Tau"
      },
      {
        "char": "o",
        "to": "ō",
        "type": "length",
        "note": "Omega: long omicron"
      }
    ]
  },
  {
    "id": "epimetheus"`;

replaceOnce(letoOld, letoNew);

const mnemosyneYOld = `      {
        "char": "y",
        "to": "y",
        "type": "same",
        "note": "Upsilon"
      },
      {
        "char": "n",
        "to": "n",
        "type": "same",
        "note": "Nu"
      },
      {
        "char": "e",
        "to": "ē",
        "type": "length",
        "note": "Eta: long epsilon"
      }
    ],
    "etymology":`;

const mnemosyneYNew = `      {
        "char": "y",
        "to": "ý",
        "type": "stress",
        "note": "Acute on upsilon"
      },
      {
        "char": "n",
        "to": "n",
        "type": "same",
        "note": "Nu"
      },
      {
        "char": "e",
        "to": "ē",
        "type": "length",
        "note": "Eta: long epsilon"
      }
    ],
    "etymology":`;

replaceOnce(mnemosyneYOld, mnemosyneYNew);

const pythonYOld = `      {
        "char": "y",
        "to": "y",
        "type": "same",
        "note": "Same"
      },
      {
        "char": "t",
        "to": "t",
        "type": "same",
        "note": "Same"
      },
      {
        "char": "h",
        "to": "h",
        "type": "same",
        "note": "Same"
      },
      {
        "char": "o",
        "to": "ō",
        "type": "length",
        "note": "Macron: long omega"
      },
      {
        "char": "n",
        "to": "n",
        "type": "same",
        "note": "Same"
      }
    ]
  },
  {
    "id": "calypso"`;

const pythonYNew = `      {
        "char": "y",
        "to": "ý",
        "type": "stress",
        "note": "Acute on upsilon"
      },
      {
        "char": "t",
        "to": "t",
        "type": "same",
        "note": "Same"
      },
      {
        "char": "h",
        "to": "h",
        "type": "same",
        "note": "Same"
      },
      {
        "char": "o",
        "to": "ō",
        "type": "length",
        "note": "Macron: long omega"
      },
      {
        "char": "n",
        "to": "n",
        "type": "same",
        "note": "Same"
      }
    ]
  },
  {
    "id": "calypso"`;

replaceOnce(pythonYOld, pythonYNew);

const sphinxIOld = `      {
        "char": "i",
        "to": "í",
        "type": "stress",
        "note": "Acute on i"
      },
      {
        "char": "n",
        "to": "n",
        "type": "same",
        "note": "n same"
      },
      {
        "char": "x",
        "to": "x",
        "type": "same",
        "note": "x same"
      }
    ]
  },
  {
    "id": "pegasus"`;

const sphinxINew = `      {
        "char": "i",
        "to": "ĭ",
        "type": "length",
        "note": "Breve: short iota"
      },
      {
        "char": "n",
        "to": "n",
        "type": "same",
        "note": "n same"
      },
      {
        "char": "x",
        "to": "x",
        "type": "same",
        "note": "x same"
      }
    ]
  },
  {
    "id": "pegasus"`;

replaceOnce(sphinxIOld, sphinxINew);

fs.writeFileSync(file, content);
console.log('Breakdown fixes applied.');
