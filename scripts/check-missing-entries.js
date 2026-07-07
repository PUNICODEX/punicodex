const path = require('path');
const { LEXICON } = require(path.join(__dirname, '..', 'type', 'js', 'lexicon.js'));
const ids = ['ahuramazda','lakshmi','nikko','nirmata','parvati','ptah','rama','tiamat','tyr','valholl','ma'];
for (const id of ids) {
  const e = LEXICON.find((x) => x.id === id);
  if (e) {
    console.log(id, '->', e.unicode, '/', e.ascii, '/', e.pantheon, '/ tier', e.tier);
  } else {
    console.log(id, '-> NOT IN LEXICON');
  }
}
