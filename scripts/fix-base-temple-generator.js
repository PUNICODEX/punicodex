#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'scripts', 'generate-temples.js');
let js = fs.readFileSync(file, 'utf-8');

function replace(oldStr, newStr) {
  if (!js.includes(oldStr)) {
    const oldCrlf = oldStr.replace(/\n/g, '\r\n');
    const newCrlf = newStr.replace(/\n/g, '\r\n');
    if (js.includes(oldCrlf)) {
      js = js.replace(oldCrlf, newCrlf);
      console.log('replaced CRLF:', oldStr.slice(0, 40));
      return;
    }
    console.error('not found:', oldStr.slice(0, 60));
    process.exit(1);
  }
  js = js.replace(oldStr, newStr);
  console.log('replaced LF:', oldStr.slice(0, 40));
}

replace(
  `                    <p class="variants-panel-note">Each variant is an attested scholarly orthography. The <strong>owned</strong> form is the active domain; others are historically valid alternatives.</p>`,
  `                    <p class="variants-panel-note">Each variant is an attested scholarly orthography. ${'${domainStatus.isOwned'} ? 'The <strong>owned</strong> form is the active domain; others are historically valid alternatives.' : 'No domain is claimed here; these are documented Unicode forms for scholarly reference.'}</p>`
);

replace(
  `                <p class="explainer-note">${isAsciiOnlyUnicode(entry) ? `Because <strong>${escapeHtml(entry.unicode)}</strong> uses only ASCII characters, no Punycode encoding is required. The browser displays the name as-is, and the domain is the same sequence to both DNS and humanity.` : `The non-ASCII characters in <strong>${escapeHtml(entry.unicode)}</strong> are encoded while the ASCII remains visible. To the DNS, it is Punycode. To humanity, it is <em>${escapeHtml(entry.unicode)}</em>.`}${domainStatus.status === 'registered' || domainStatus.status === 'live' ? ` This domain is currently registered by another party.` : domainStatus.status === 'available' ? ` This domain appears available per Verisign RDAP, but registry holds, premium listings, or registrar blocks can still prevent registration. Always verify with a registrar.` : domainStatus.status === 'unknown' ? ` Domain status could not be determined.` : ''}</p>`,
  `                <p class="explainer-note">${isAsciiOnlyUnicode(entry) ? `Because <strong>${escapeHtml(entry.unicode)}</strong> uses only ASCII characters, no Punycode encoding is required. The browser displays the name as-is.` : `The non-ASCII characters in <strong>${escapeHtml(entry.unicode)}</strong> are encoded while the ASCII remains visible. To the DNS, it is Punycode. To humanity, it is <em>${escapeHtml(entry.unicode)}</em>.`}${domainStatus.status === 'registered' || domainStatus.status === 'live' ? ` This domain is currently registered by another party.` : !domainStatus.isOwned ? ` PUNYCODEX does not claim this domain is available; always verify status with a registrar.` : ''}</p>`
);

replace(
  `                        <span class="footer-label">${domainStatus.status === 'owned' ? 'Owned Domain' : 'Domain'}</span>
                        <span class="footer-value">${entry.unicode.toLowerCase()}.com${domainStatus.status === 'available' ? ' <small>(appears available)</small>' : domainStatus.status === 'registered' || domainStatus.status === 'live' ? ' <small>(registered)</small>' : domainStatus.status === 'unknown' ? ' <small>(status unknown)</small>' : ''}</span>`,
  `                        <span class="footer-label">${domainStatus.isOwned ? 'Owned Domain' : 'Domain Reference'}</span>
                        <span class="footer-value">${entry.unicode.toLowerCase()}.com${domainStatus.status === 'registered' || domainStatus.status === 'live' ? ' <small>(registered)</small>' : !domainStatus.isOwned ? ' <small>(reference only)</small>' : ''}</span>`
);

fs.writeFileSync(file, js);
console.log('done');
