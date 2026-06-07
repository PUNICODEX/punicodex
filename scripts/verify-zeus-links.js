const fs = require('fs');
const html = fs.readFileSync('sites/zeus/index.html', 'utf8');
const pantheonBody = html.match(/class="pantheon-body">([\s\S]*?)<\/p>/);
if (pantheonBody) {
    console.log('Zeus pantheon-body:');
    console.log(pantheonBody[1].substring(0, 300));
}
console.log('');
const mythLinks = (html.match(/<a href="\/sites\//g) || []).length;
console.log('Total cross-links in Zeus:', mythLinks);
