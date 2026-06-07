const fs = require('fs');
let c = fs.readFileSync('sites/ra/index.html', 'utf8');

// Meta & titles
const title = 'Rꜥ — Endorsed by the Sun God';
c = c.replace(/Ἑρμῆς — Endorsed by the Messenger of the Gods/g, title);
c = c.replace(/Your brand, endorsed by Rꜥ — the Greek Messenger of the Gods/g, 'Your brand, endorsed by Rꜥ — the Egyptian Sun God. Premium advertising space on the definitive unicode domain.');
c = c.replace(/Your brand, endorsed by Ἑρμῆς — the Greek Messenger of the Gods/g, 'Your brand, endorsed by Rꜥ — the Egyptian Sun God. Premium advertising space on the definitive unicode domain.');
c = c.replace(/"name": "Ἑρμῆς — Endorsed by the Messenger of the Gods"/g, '"name": "' + title + '"');
c = c.replace(/"description": "Your brand, endorsed by Rꜥ — the Greek Messenger of the Gods\. Premium advertising/g, '"description": "Your brand, endorsed by Rꜥ — the Egyptian Sun God. Premium advertising');
c = c.replace(/Messenger, Travel, Commerce, Thieves, Boundaries/g, 'Sun, Creation, Kingship');

// Hero
c = c.replace(/The Messenger of the Gods, <span class="endorsement-greek">Rꜥ<\/span>/g, 'The Sun God, <span class="endorsement-greek">Rꜥ</span>');
c = c.replace(/Twelve sacred frames\. One temple\. Deliver your message\./g, 'Twelve sacred frames. One temple. Rise with the sun.');

// Slot names — Egyptian themed
c = c.replace(/<!-- Row 1: Winged Crown -->/g, '<!-- Row 1: Solar Disk -->');
c = c.replace(/<span class="space-name">Winged Crown<\/span>/g, '<span class="space-name">Solar Disk</span>');
c = c.replace(/<!-- Row 2: Herald's Column \+ Traveler's Strip \+ Sandal I -->/g, '<!-- Row 2: Horizon Throne + Falcon\'s Wing + Scarab I -->');
c = c.replace(/<span class="space-name">Herald's Column<\/span>/g, '<span class="space-name">Horizon Throne</span>');
c = c.replace(/<span class="space-name">Traveler's Strip<\/span>/g, '<span class="space-name">Falcon\'s Wing</span>');
c = c.replace(/<span class="space-name">Sandal I<\/span>/g, '<span class="space-name">Scarab I</span>');
c = c.replace(/<!-- Row 3: Sandal II \+ Sandal III -->/g, '<!-- Row 3: Scarab II + Scarab III -->');
c = c.replace(/<span class="space-name">Sandal II<\/span>/g, '<span class="space-name">Scarab II</span>');
c = c.replace(/<span class="space-name">Sandal III<\/span>/g, '<span class="space-name">Scarab III</span>');
c = c.replace(/<!-- Row 4: Silver Ribbon \+ Caduceus Badge \+ Inscription -->/g, '<!-- Row 4: Gold Ribbon + Uraeus Badge + Hieroglyph -->');
c = c.replace(/<span class="space-name">Silver Ribbon<\/span>/g, '<span class="space-name">Gold Ribbon</span>');
c = c.replace(/<span class="space-name">Caduceus Badge<\/span>/g, '<span class="space-name">Uraeus Badge</span>');
c = c.replace(/<span class="space-name">Inscription<\/span>/g, '<span class="space-name">Hieroglyph</span>');

// How it works steps
c = c.replace(/Choose your sacred frame\. From the hero banner to the subtle footer emblem, every space is positioned for maximum visibility\./g, 'Choose your sacred frame. From the solar hero banner to the subtle horizon emblem, every space is positioned for maximum visibility.');
c = c.replace(/Upload your creative\. SVG, WebP, or animated canvas — your brand appears beside the gods\./g, 'Upload your creative. SVG, WebP, or animated canvas — your brand appears beside the sun god.');
c = c.replace(/Go live in hours, not days\. Your endorsement is reviewed, approved, and displayed — no ad networks, no tracking, just presence\./g, 'Go live in hours, not days. Your endorsement is reviewed, approved, and displayed — no ad networks, no tracking, just presence.');

// Footer
c = c.replace(/<span class="footer-value">hermês\.com &middot; hermēs\.com<\/span>/g, '<span class="footer-value">rꜥ.com</span>');
c = c.replace(/<span class="footer-value">Tier-1 Accent-Preserving<\/span>/g, '<span class="footer-value">Tier-2 Egyptological</span>');
c = c.replace(/<span class="footer-value">Ἑρμῆς<\/span>/g, '<span class="footer-value">Rꜥ</span>');

fs.writeFileSync('sites/ra/index.html', c, 'utf8');
console.log('Ad home adapted for Ra');
