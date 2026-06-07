const fs = require('fs');

let content = fs.readFileSync('sites/ra/index.html', 'utf8');

// 1. Meta descriptions and JSON-LD
content = content.replace(/shrine to —,/g, 'shrine to Rꜥ,');
content = content.replace(/shrine to —\./g, 'shrine to Rꜥ.');
content = content.replace(/"name": "—"/g, '"name": "Rꜥ"');

// 2. Section subtitle
content = content.replace(/Why <em>—\.com<\/em>/g, 'Why <em>Rꜥ.com</em>');

// 3. Card placeholders
content = content.replace(/<p class="card-hieroglyph">—<\/p>/g, '<p class="card-hieroglyph">𓇳</p>');
content = content.replace(/<p class="card-unicode">—<\/p>/g, '<p class="card-unicode">Rꜥ</p>');

// 4. Code block and explainer
content = content.replace(/—\.com &rarr;/g, 'Rꜥ.com &rarr;');
content = content.replace(/it is <em>—<\/em>/g, 'it is <em>Rꜥ</em>');

// 5. Meta domain placeholder
content = content.replace(/r\?\.com/g, 'rꜥ.com');

// 6. Footer
content = content.replace(/<span class="footer-value">—\.com<\/span>/g, '<span class="footer-value">Rꜥ.com</span>');
content = content.replace(/<span class="footer-value">—<\/span>/g, '<span class="footer-value">Rꜥ</span>');

// 7. Body text — sentence-starting placeholders (after period/comma or tag)
content = content.replace(/>— is not merely/g, '>Rꜥ is not merely');
content = content.replace(/waters, — rose/g, 'waters, Rꜥ rose');
content = content.replace(/— does not merely/g, 'Rꜥ does not merely');
content = content.replace(/son of —,/g, 'son of Rꜥ,');
content = content.replace(/in —'s name/g, "in Rꜥ's name");
content = content.replace(/become —\./g, 'become Rꜥ.');
content = content.replace(/through which — travels/g, 'through which Rꜥ travels');
content = content.replace(/body of — himself/g, 'body of Rꜥ himself');
content = content.replace(/>— as the falcon-headed god/g, '>Rꜥ as the falcon-headed god');
content = content.replace(/Eye of —,/g, 'Eye of Rꜥ,');
content = content.replace(/form of — —/g, 'form of Rꜥ —');
content = content.replace(/Each day, — sails/g, 'Each day, Rꜥ sails');
content = content.replace(/>— grew old/g, '>Rꜥ grew old');
content = content.replace(/>— ruled directly/g, '>Rꜥ ruled directly');
content = content.replace(/But — has/g, 'But Rꜥ has');
content = content.replace(/that — holds/g, 'that Rꜥ holds');

fs.writeFileSync('sites/ra/index.html', content, 'utf8');
console.log('Done. Remaining em dashes:', (content.match(/—/g) || []).length);
