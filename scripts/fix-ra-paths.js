const fs = require('fs');

// Fix lore page paths
let lore = fs.readFileSync('sites/ra/lore/index.html', 'utf8');
lore = lore.replace(/href="styles\.css/g, 'href="../styles.css');
lore = lore.replace(/src="script\.js/g, 'src="../script.js');
lore = lore.replace(/assets\//g, '../assets/');
fs.writeFileSync('sites/ra/lore/index.html', lore, 'utf8');
console.log('Fixed lore paths');

// Fix gallery paths
let gal = fs.readFileSync('sites/ra/gallery/index.html', 'utf8');
gal = gal.replace(/href="styles\.css/g, 'href="../styles.css');
gal = gal.replace(/src="script\.js/g, 'src="../script.js');
gal = gal.replace(/assets\//g, '../assets/');
gal = gal.replace(/\.\.\/\.\.\/assets\//g, '../assets/');
fs.writeFileSync('sites/ra/gallery/index.html', gal, 'utf8');
console.log('Fixed gallery paths');

// Fix extended paths
let ext = fs.readFileSync('sites/ra/lore/extended/index.html', 'utf8');
ext = ext.replace(/href="styles\.css/g, 'href="../../styles.css');
ext = ext.replace(/src="script\.js/g, 'src="../../script.js');
ext = ext.replace(/assets\//g, '../../assets/');
ext = ext.replace(/\.\.\/\.\.\/\.\.\/assets\//g, '../../assets/');
fs.writeFileSync('sites/ra/lore/extended/index.html', ext, 'utf8');
console.log('Fixed extended paths');
