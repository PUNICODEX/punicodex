/**
 * One-off a11y fixes: aria-labels on booking-modal inputs (flagship index +
 * dashboard + patron templates). Assertion-based: every anchor exactly once.
 */
const fs = require('node:fs');

const FIXES = [
  {
    file: 'templates/flagship/index.html',
    pairs: [
      ['<input type="email" class="booking-input" id="booking-email" placeholder="you@company.com" required', '<input type="email" class="booking-input" id="booking-email" placeholder="you@company.com" aria-label="Email address" required'],
      ['<input type="text" class="booking-input" id="booking-company" placeholder="Your Brand"', '<input type="text" class="booking-input" id="booking-company" placeholder="Your Brand" aria-label="Company or brand name"'],
      ['<input type="url" class="booking-input" id="booking-website" placeholder="https://yourproject.com"', '<input type="url" class="booking-input" id="booking-website" placeholder="https://yourproject.com" aria-label="Website URL"'],
      ['<input type="text" class="booking-input" id="booking-heading" placeholder="Your Brand Name"', '<input type="text" class="booking-input" id="booking-heading" placeholder="Your Brand Name" aria-label="Ad heading"'],
      ['<input type="text" class="booking-input" id="booking-subtitle" placeholder="Tagline or description"', '<input type="text" class="booking-input" id="booking-subtitle" placeholder="Tagline or description" aria-label="Ad tagline or description"'],
      ['<input type="checkbox" id="booking-terms-check"', '<input type="checkbox" id="booking-terms-check" aria-label="Agree to the advertising terms"'],
      ['<textarea class="booking-input" id="booking-application-note" rows="4"', '<textarea class="booking-input" id="booking-application-note" rows="4" aria-label="Application note"'],
      ['<input type="text" class="booking-input" id="booking-code" placeholder="123456" maxlength="6"', '<input type="text" class="booking-input" id="booking-code" placeholder="123456" maxlength="6" aria-label="Verification code"'],
      ['<input type="file" class="booking-upload-input" id="booking-upload-input"', '<input type="file" class="booking-upload-input" id="booking-upload-input" aria-label="Upload creative image"'],
      ['<input type="email" class="booking-input" id="my-bookings-email" placeholder="you@company.com"', '<input type="email" class="booking-input" id="my-bookings-email" placeholder="you@company.com" aria-label="Email address to find your bookings"'],
    ],
  },
  {
    file: 'templates/flagship/dashboard.html',
    pairs: [
      ['<input type="file" class="dash-upload-input" id="dash-upload-input"', '<input type="file" class="dash-upload-input" id="dash-upload-input" aria-label="Upload creative image"'],
      ['<input type="file" id="slot-edit-input"', '<input type="file" id="slot-edit-input" aria-label="Replace slot creative image"'],
    ],
  },
];

let total = 0;
for (const { file, pairs } of FIXES) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [anchor, replacement] of pairs) {
    const count = text.split(anchor).length - 1;
    if (count !== 1) {
      console.log(`SKIP (${count}x): ${file} :: ${anchor.slice(0, 70)}`);
      continue;
    }
    text = text.replace(anchor, replacement);
    total += 1;
  }
  fs.writeFileSync(file, text);
}
console.log(`applied ${total} aria-label fixes`);
