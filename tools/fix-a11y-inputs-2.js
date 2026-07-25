/**
 * One-off a11y labels: remaining unlabeled controls on root/platform pages.
 * Assertion-based: each anchor exactly once per file.
 */
const fs = require('node:fs');

const FIXES = {
  'platform/public/admin-authenticity.html': [
    ['<input type="password" id="password"', '<input type="password" id="password" aria-label="Admin password"'],
    ['<select id="filter-severity"', '<select id="filter-severity" aria-label="Filter by severity"'],
    ['<select id="filter-verdict"', '<select id="filter-verdict" aria-label="Filter by verdict"'],
    ['<input id="filter-source"', '<input id="filter-source" aria-label="Filter by source"'],
  ],
  'platform/public/advertiser-panel.html': [
    ['<input type="text" id="edit-heading"', '<input type="text" id="edit-heading" aria-label="Ad heading"'],
    ['<input type="text" id="edit-subtitle"', '<input type="text" id="edit-subtitle" aria-label="Ad subtitle"'],
    ['<input type="url" id="edit-url"', '<input type="url" id="edit-url" aria-label="Destination URL"'],
    ['<input type="file" id="edit-upload-input"', '<input type="file" id="edit-upload-input" aria-label="Upload creative image"'],
  ],
  'platform/public/tenant.html': [
    ['<input type="email" id="email"', '<input type="email" id="email" aria-label="Email address"'],
    ['<textarea id="message"', '<textarea id="message" aria-label="Your message"'],
    ['<select id="rating"', '<select id="rating" aria-label="Rating"'],
    ['<input id="reviewText"', '<input id="reviewText" aria-label="Write a review"'],
  ],
  'art/index.html': [
    ['<input type="text" id="art-search"', '<input type="text" id="art-search" aria-label="Search names and pantheons"'],
    ['<select id="art-pantheon"', '<select id="art-pantheon" aria-label="Filter by pantheon"'],
    ['<select id="art-license"', '<select id="art-license" aria-label="Filter by license"'],
  ],
  'mobile/index.html': [
    ['<input type="text" id="type-input"', '<input type="text" id="type-input" aria-label="Type a name"'],
    ['<textarea id="compose-textarea"', '<textarea id="compose-textarea" aria-label="Compose text"'],
    ['<input type="text" id="dir-search"', '<input type="text" id="dir-search" aria-label="Search characters and codes"'],
  ],
  'platform/public/admin-authenticity-policy.html': [
    ['<textarea id="policyJson"', '<textarea id="policyJson" aria-label="Policy JSON"'],
    ['<input id="testInput"', '<input id="testInput" aria-label="Domain, URL, or term to evaluate"'],
    ['<select id="testType"', '<select id="testType" aria-label="Test input type"'],
  ],
  'platform/public/search.html': [
    ['<select id="pantheonFilter"', '<select id="pantheonFilter" aria-label="Filter by pantheon"'],
    ['<select id="sortFilter"', '<select id="sortFilter" aria-label="Sort results"'],
    ['<input type="text" id="oracleInput"', '<input type="text" id="oracleInput" aria-label="Ask the Oracle a question"'],
  ],
  'authenticity/index.html': [
    ['<input type="text" id="check-input"', '<input type="text" id="check-input" aria-label="Name or URL to check"'],
    ['<select id="check-type"', '<select id="check-type" aria-label="Input type"'],
  ],
  'browser.html': [
    ['<input type="text" id="omnibox"', '<input type="text" id="omnibox" aria-label="Search or enter address"'],
    ['<input type="text" id="paletteInput"', '<input type="text" id="paletteInput" aria-label="Command palette"'],
  ],
  'codex/index.html': [
    ['<input type="text" id="source-codex-search"', '<input type="text" id="source-codex-search" aria-label="Search sources"'],
  ],
};

let total = 0;
let skips = 0;
for (const [file, pairs] of Object.entries(FIXES)) {
  let t = fs.readFileSync(file, 'utf8');
  for (const [a, r] of pairs) {
    const c = t.split(a).length - 1;
    if (c !== 1) {
      console.log(`SKIP(${c}x): ${file} :: ${a.slice(0, 50)}`);
      skips++;
      continue;
    }
    t = t.replace(a, r);
    total++;
  }
  fs.writeFileSync(file, t);
}
console.log(`applied ${total} labels (${skips} skips)`);
