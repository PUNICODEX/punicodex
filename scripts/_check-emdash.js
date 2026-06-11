const fs = require('fs');
const sites = ['alfheimr','helheimr','jotunheimr','midgardr','muspellheimr','odinn','ragnarok','thor'];
for (const site of sites) {
  const content = fs.readFileSync('sites/' + site + '/lore/index.html', 'utf8');
  const total = (content.match(/\u2014/g) || []).length;
  const standalone = (content.match(/>\u2014</g) || []).length;
  const alt = (content.match(/alt="\u2014/g) || []).length;
  const com = (content.match(/\u2014\.com/g) || []).length;
  const strong = (content.match(/<strong>\u2014[.<]/g) || []).length;
  console.log(site + ': standalone=' + standalone + ' alt=' + alt + ' com=' + com + ' strong=' + strong + ' total=' + total);
}
