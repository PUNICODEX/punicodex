const fs = require('fs');
const path = require('path');

const files = [
  'sites/ra/index.html',
  'sites/ra/gallery/index.html',
  'sites/ra/lore/extended/index.html',
  'sites/ra/dashboard/index.html',
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Names
  content = content.replace(/Hermês/g, 'Rꜥ');
  content = content.replace(/Hermes/g, 'Ra');
  content = content.replace(/hermes/g, 'ra');
  content = content.replace(/HERMES/g, 'RA');

  // Image assets
  content = content.replace(/hermes_logolockup/g, 'ra_logolockup');
  content = content.replace(/hermes_logomark/g, 'ra_logomark');
  content = content.replace(/hermes_mascot/g, 'ra_mascot');

  // Domain
  content = content.replace(/xn--herms-ksa\.com/g, 'xn--r-2w3e.com');
  content = content.replace(/xn--herms-lza\.com/g, 'xn--r-2w3e.com');
  content = content.replace(/hermês\.com/g, 'rꜥ.com');
  content = content.replace(/hermēs\.com/g, 'rꜥ.com');

  // Colors: Hermes emerald → Ra Egyptian (keep gold, replace greens)
  content = content.replace(/#0a1f15/g, '#0A0806');
  content = content.replace(/#0e1a1a/g, '#0E0C0A');
  content = content.replace(/#1B3A3A/g, '#1A1814');
  content = content.replace(/#D4941E/g, '#D4AF37');

  // API base
  content = content.replace(/HERMES_API_BASE/g, 'RA_API_BASE');

  // Site slug
  content = content.replace(/SITE_SLUG = 'hermes'/g, "SITE_SLUG = 'ra'");
  content = content.replace(/site=hermes/g, "site=ra");

  // Canvas ID
  content = content.replace(/messenger-canvas/g, 'solar-canvas');

  // Paths
  content = content.replace(/\/hermes\//g, '/ra/');

  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated:', file);
});
