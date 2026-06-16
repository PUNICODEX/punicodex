/**
 * PÚNYCODEX — Version service
 * Exposes data-version.json through the API.
 */

const fs = require('node:fs');
const path = require('node:path');

const versionPath = path.join(__dirname, '..', '..', 'data-version.json');

function getVersion() {
  const raw = fs.readFileSync(versionPath, 'utf8');
  return JSON.parse(raw);
}

module.exports = { getVersion };
