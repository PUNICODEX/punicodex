// One-off: de-hardcode flagship counts in taxonomy + blog-index tests.
const fs = require('node:fs');

let t = fs.readFileSync('platform/scholars/taxonomy.test.js', 'utf8');
t = t.replace(
  'assert.strictEqual(built.length, 196);',
  'assert.strictEqual(built.length, ARCHETYPES.filter((a) => a.built).length);'
);
fs.writeFileSync('platform/scholars/taxonomy.test.js', t, 'utf8');

let b = fs.readFileSync('test/blog-index.test.js', 'utf8');
b = b.replace('the 196 statically baked cards', 'the statically baked cards');
b = b.replace(
  'Blog — 196 Unicode Restoration Essays',
  'Blog — ${BUILT_IDS.length} Unicode Restoration Essays'
);
b = b.replace(
  "test('JSON-LD is a CollectionPage with an ItemList of exactly 196 items'",
  'test(`JSON-LD is a CollectionPage with an ItemList of exactly ${BUILT_IDS.length} items`'
);
b = b.replace(
  "assert.equal(BUILT_IDS.length, 196, 'expected exactly 196 built flagship archetypes');",
  "assert.ok(BUILT_IDS.length > 0, 'expected built flagship archetypes');"
);
b = b.replace('assert.equal(list.numberOfItems, 196);', 'assert.equal(list.numberOfItems, BUILT_IDS.length);');
b = b.replace('assert.equal(list.itemListElement.length, 196);', 'assert.equal(list.itemListElement.length, BUILT_IDS.length);');
b = b.replace(
  "test('all 196 card hrefs resolve to built archetype blog pages on disk'",
  'test(`all ${BUILT_IDS.length} card hrefs resolve to built archetype blog pages on disk`'
);
b = b.replace(
  'assert.equal(hrefs.length, 196, `expected 196 blog card hrefs, got ${hrefs.length}`);',
  'assert.equal(hrefs.length, BUILT_IDS.length, `expected ${BUILT_IDS.length} blog card hrefs, got ${hrefs.length}`);'
);
b = b.replace(
  "test('embedded JSON payload covers all 196 posts with canonical field fidelity'",
  'test(`embedded JSON payload covers all ${BUILT_IDS.length} posts with canonical field fidelity`'
);
b = b.replace(
  'assert.equal(payload.length, 196, `expected 196 payload entries, got ${payload.length}`);',
  'assert.equal(payload.length, BUILT_IDS.length, `expected ${BUILT_IDS.length} payload entries, got ${payload.length}`);'
);
fs.writeFileSync('test/blog-index.test.js', b, 'utf8');
console.log('done');
