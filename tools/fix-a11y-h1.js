/**
 * One-off a11y h1 fixes across non-temple pages:
 *  - multi-h1 pages: demote secondary h1s to h2 (login gates, view titles)
 *  - zero-h1 app pages: insert a visually-hidden h1 derived from <title>
 * Canonical sources only; generated copies resync via npm run generate.
 */
const fs = require('node:fs');

const SR_ONLY =
  'style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;"';

function demote(file, headingText) {
  let t = fs.readFileSync(file, 'utf8');
  const open = `<h1>${headingText}</h1>`;
  const openRe = /<h1([^>]*)>\s*([^<]+?)\s*<\/h1>/g;
  let changed = 0;
  t = t.replace(openRe, (m, attrs, text) => {
    if (headingText && !text.includes(headingText)) return m;
    changed += 1;
    return `<h2${attrs}>${text}</h2>`;
  });
  if (changed === 0) {
    console.log(`SKIP: ${file} (${headingText || 'first h1'})`);
    return false;
  }
  fs.writeFileSync(file, t);
  return true;
}

function demoteNth(file, nth) {
  let t = fs.readFileSync(file, 'utf8');
  const re = /<h1([^>]*)>([\s\S]*?)<\/h1>/g;
  let i = 0;
  let changed = false;
  t = t.replace(re, (m, attrs, inner) => {
    i += 1;
    if (i !== nth) return m;
    changed = true;
    return `<h2${attrs}>${inner}</h2>`;
  });
  if (!changed) {
    console.log(`SKIP: ${file} (h1 #${nth})`);
    return false;
  }
  fs.writeFileSync(file, t);
  return true;
}

function insertSrOnlyH1(file, text) {
  let t = fs.readFileSync(file, 'utf8');
  const m = t.match(/<body[^>]*>/);
  if (!m) {
    console.log(`SKIP (no body): ${file}`);
    return false;
  }
  if (t.includes('<h1')) {
    console.log(`SKIP (has h1): ${file}`);
    return false;
  }
  t = t.replace(m[0], `${m[0]}\n    <h1 ${SR_ONLY}>${text}</h1>`);
  fs.writeFileSync(file, t);
  return true;
}

let n = 0;

// Multi-h1 pages: demote secondary headings.
if (demoteNth('account/index.html', 2)) n++;
if (demoteNth('account/index.html', 3)) n++;
if (demoteNth('game/index.html', 2)) n++;
if (demoteNth('game/index.html', 3)) n++;
if (demoteNth('game/index.html', 4)) n++;
if (demote('platform/public/scholars/analytics/index.html', 'Curator Access Required')) n++;
for (const f of [
  'platform/public/admin-disputes.html',
  'platform/public/admin-authenticity.html',
  'platform/public/admin-authenticity-compliance.html',
]) {
  if (demote(f, 'Admin Login')) n++;
}

// Zero-h1 pages: visually-hidden h1 from the page's purpose.
const H1_TEXT = {
  'admin.html': 'PuniCodex Admin',
  'browser.html': 'PuniCodex Browser',
  'entry.html': 'PuniCodex Entry',
  'extension-v2/popup/popup.html': 'PuniCodex Authenticity',
  'extension/popup/popup.html': 'PuniCodex Type Tool',
  'mobile/ar-lens.html': 'PuniCodex AR Lens',
  'mobile/index.html': 'PuniCodex Mobile',
  'mobile/shield.html': 'PuniCodex Shield',
  'platform/browser/renderer/index.html': 'PuniCodex Browser',
  'platform/public/admin-ai-review.html': 'PuniCodex Admin — AI Review',
  'platform/public/admin-analytics.html': 'PuniCodex Admin — Analytics',
  'platform/public/admin-api-keys.html': 'PuniCodex Admin — API Keys',
  'platform/public/admin-authenticity-audit.html': 'PuniCodex Admin — Authenticity Audit',
  'platform/public/admin-authenticity-policy.html': 'PuniCodex Admin — Authenticity Policy',
  'platform/public/admin-authenticity-users.html': 'PuniCodex Admin — Authenticity Users',
  'platform/public/admin-bookings.html': 'PuniCodex Admin — Bookings',
  'platform/public/admin-curator.html': 'PuniCodex Admin — Curator',
  'platform/public/admin-tenants.html': 'PuniCodex Admin — Tenants',
  'platform/public/admin.html': 'PuniCodex Admin',
  'platform/public/browser.html': 'PuniCodex Browser',
  'platform/public/claim.html': 'PuniCodex — Claim Your Name',
  'platform/public/entry.html': 'PuniCodex Entry',
  'platform/public/search-v2.html': 'PuniCodex Search',
  'platform/public/search.html': 'PuniCodex Search',
  'platform/public/temple-3d.html': 'PuniCodex Temple',
  'platform/public/tenant.html': 'PuniCodex Tenant',
  'platform/public/scholars/creatives/creator.html': 'PuniCodex Creator Profile',
  'search.html': 'PuniCodex Search',
  'search-v2.html': 'PuniCodex Search',
};
for (const [file, text] of Object.entries(H1_TEXT)) {
  if (insertSrOnlyH1(file, text)) n++;
}

console.log(`applied ${n} h1 fixes`);
