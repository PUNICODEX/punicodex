const fs = require('fs');
const sites = ['alfheimr','helheimr','jotunheimr','midgardr','muspellheimr','odinn','ragnarok','thor'];
for (const site of sites) {
  const content = fs.readFileSync('sites/' + site + '/index.html', 'utf8');
  const placeholder = (content.match(/footer-value">\u2014</g) || []).length;
  console.log(site + ' footer placeholder: ' + placeholder);
}
