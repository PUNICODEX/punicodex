/**
 * PUNICODEX — Sync canonical mobile classifier into the mobile app
 *
 * sdk/js/src/mobile-classifier.js is the single source of truth.
 * shield.html runs inside the Android Capacitor webview, which only serves
 * the mobile/ directory — a relative ../sdk/... path escapes the sandbox
 * and 404s, breaking the Shield tab with "classifier failed to load".
 * This script keeps a bundled copy at mobile/js/mobile-classifier.js so the
 * page works both on the deployed site and inside the app.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const canonical = path.join(root, 'sdk', 'js', 'src', 'mobile-classifier.js');
const dest = path.join(root, 'mobile', 'js', 'mobile-classifier.js');

const content = fs.readFileSync(canonical, 'utf8');

// Unlink first so we never write through an existing hard link.
if (fs.existsSync(dest)) {
  fs.unlinkSync(dest);
}
fs.writeFileSync(dest, content, 'utf8');
console.log(`Synced ${path.relative(root, dest)}`);
