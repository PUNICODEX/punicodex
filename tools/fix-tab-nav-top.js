const fs = require('fs');
const glob = require('glob');
const path = require('path');

const root = process.cwd().replace(/\\/g, '/');
const files = [
  `${root}/templates/flagship/flagship.css`,
  ...glob.sync(`${root}/sites/*/styles.css`),
  ...glob.sync(`${root}/sites/*/styles-v2.css`),
].filter((f) => !f.includes('.backup'));

const re = /(\.tab-nav,\s*\.extended-nav\s*\{[^}]*top:\s*)40px([^}]*\})/gs;

for (const file of files) {
  const css = fs.readFileSync(file, 'utf8');
  const updated = css.replace(re, '$154px$2');
  if (updated !== css) {
    fs.writeFileSync(file, updated);
    console.log('fixed', path.relative(root, file));
  }
}
