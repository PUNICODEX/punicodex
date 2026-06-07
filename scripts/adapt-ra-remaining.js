const fs = require('fs');

// Gallery
let g = fs.readFileSync('sites/ra/gallery/index.html', 'utf8');
g = g.replace(/Ἑρμῆς \/ Gallery/g, 'Rꜥ / Gallery');
g = g.replace(/Art · Sculpture · Vase Painting · Coinage · Architecture/g, 'Art · Sculpture · Tomb Painting · Coinage · Architecture');
g = g.replace(/Visual Legacy/g, 'Visual Legacy');
fs.writeFileSync('sites/ra/gallery/index.html', g, 'utf8');

// Extended lore
let e = fs.readFileSync('sites/ra/lore/extended/index.html', 'utf8');
e = e.replace(/Ἑρμῆς \/ The Scholar's Road/g, "Rꜥ / The Scholar's Road");
e = e.replace(/Etymology · Phonology · Orthography · Cultural Legacy · Primary Sources/g, 'Etymology · Phonology · Orthography · Cultural Legacy · Primary Sources');
e = e.replace(/Extended Lore/g, 'Extended Lore');
// Quick facts
e = e.replace(/<dt>Greek Name<\/dt>\s*<dd>Ἑρμῆς \(Hermês\)<\/dd>/g, '<dt>Egyptian Name</dt>\n                            <dd>Rꜥ (Ra)</dd>');
e = e.replace(/<dt>Roman Equivalent<\/dt>\s*<dd>Mercurius<\/dd>/g, '<dt>Greek Equivalent</dt>\n                            <dd>Helios</dd>');
e = e.replace(/<dt>Parents<\/dt>\s*<dd>Zeus & Maia<\/dd>/g, '<dt>Origin</dt>\n                            <dd>Self-created from Nun</dd>');
e = e.replace(/<dt>Domain<\/dt>\s*<dd>Messenger, Travel, Commerce, Thieves, Boundaries<\/dd>/g, '<dt>Domain</dt>\n                            <dd>Sun, Creation, Kingship</dd>');
e = e.replace(/<dt>Symbols<\/dt>\s*<dd>Caduceus, Winged Sandals, Petasos<\/dd>/g, '<dt>Symbols</dt>\n                            <dd>Solar Disk, Falcon, Scarab, Obelisk</dd>');
e = e.replace(/<dt>Major Cult Center<\/dt>\s*<dd>Arcadia, Athens<\/dd>/g, '<dt>Major Cult Center</dt>\n                            <dd>Heliopolis, Karnak</dd>');
e = e.replace(/<dt>Famous Artwork<\/dt>\s*<dd>Praxiteles' Hermes<\/dd>/g, '<dt>Famous Artwork</dt>\n                            <dd>Tomb of Nefertari</dd>');
e = e.replace(/<dt>Epithets<\/dt>\s*<dd>Psychopomp, Argeiphontes, Enagonios<\/dd>/g, '<dt>Epithets</dt>\n                            <dd>Khepri, Atum, Amun-Ra</dd>');
e = e.replace(/<dt>Primary Texts<\/dt>\s*<dd>Homeric Hymn, Aristophanes<\/dd>/g, '<dt>Primary Texts</dt>\n                            <dd>Pyramid Texts, Book of the Dead</dd>');
fs.writeFileSync('sites/ra/lore/extended/index.html', e, 'utf8');

// Dashboard
let d = fs.readFileSync('sites/ra/dashboard/index.html', 'utf8');
d = d.replace(/hermês\.com/g, 'rꜥ.com');
d = d.replace(/Hermês Ad Dashboard/g, 'Rꜥ Ad Dashboard');
d = d.replace(/#D4941E/g, '#D4AF37');
d = d.replace(/#0e1a1a/g, '#0E0C0A');
fs.writeFileSync('sites/ra/dashboard/index.html', d, 'utf8');

console.log('Gallery, extended lore, and dashboard adapted');
