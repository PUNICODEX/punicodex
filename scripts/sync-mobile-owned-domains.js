/**
 * PUNICODEX — Sync canonical owned domains to the mobile app
 *
 * js/archetypes-v2.js is the single source of truth for flagship domains
 * (domainUnicode = the most canonical variant, matching the canonical
 * restoration; domainAlt = attested variants such as dual-tier pairs).
 *
 * The mobile app is offline-first (the API is unreachable inside the
 * Capacitor sandbox), so it gets a compact id -> primary domain map at
 * mobile/shared/owned-domains.js. Base temples (no archetype) fall back to
 * entry.unicode + '.com' at runtime.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const archetypes = require(path.join(root, 'js', 'archetypes-v2.js'));

const list = Array.isArray(archetypes) ? archetypes : (archetypes.ARCHETYPES || archetypes.archetypes);

const map = {};
for (const a of list) {
  if (!a.id || !a.domainUnicode) continue;
  map[a.id] = a.domainUnicode;
}

const content =
  '/**\n' +
  ' * GENERATED — do not edit. Canonical: js/archetypes-v2.js (domainUnicode).\n' +
  ' * Synced by scripts/sync-mobile-owned-domains.js.\n' +
  ' * id -> most canonical owned domain (Unicode form).\n' +
  ' */\n' +
  'window.PUNICODEX_OWNED_DOMAINS = ' +
  JSON.stringify(map, null, 0) +
  ';\n';

const dest = path.join(root, 'mobile', 'shared', 'owned-domains.js');
if (fs.existsSync(dest)) fs.unlinkSync(dest);
fs.writeFileSync(dest, content, 'utf8');
console.log(`Synced ${path.relative(root, dest)} (${Object.keys(map).length} owned domains)`);
