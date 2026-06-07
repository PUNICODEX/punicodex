const fs = require('fs');
const sites = ['nike', 'hermes', 'ra'];
for (const site of sites) {
  const file = 'sites/' + site + '/styles.css';
  let css = fs.readFileSync(file, 'utf8');
  css = css.replace(
    /(\.space-frame-content \{[\s\S]{0,200}?)display: flex;([\s\S]{0,100}?gap: )0\.75rem;/,
    '$1display: flex;\n    flex-direction: column;$2gap: 0.5rem;'
  );
  fs.writeFileSync(file, css, 'utf8');
  console.log('Fixed ' + file);
}
