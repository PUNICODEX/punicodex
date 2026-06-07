const fs = require('fs');
const path = require('path');

const sitesDir = 'sites';
const dirs = fs.readdirSync(sitesDir).filter(d => {
    return fs.statSync(path.join(sitesDir, d)).isDirectory() &&
           fs.existsSync(path.join(sitesDir, d, 'index.html'));
});

const flagships = [];

dirs.forEach(dir => {
    const dirPath = path.join(sitesDir, dir);
    const htmlPath = path.join(dirPath, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const lines = html.split('\n').length;
    
    const hasCanvas = html.includes('<canvas');
    const hasVercel = fs.existsSync(path.join(dirPath, '.vercel'));
    const hasAssets = fs.existsSync(path.join(dirPath, 'assets'));
    const hasCustomCss = fs.existsSync(path.join(dirPath, 'styles.css')) ||
                         fs.existsSync(path.join(dirPath, 'styles-v2.css'));
    
    // True flagships are longer (>300 lines), have canvas, and assets
    // Exclude obvious base templates
    const isBaseTemplate = html.includes('id="breakdown"') && html.includes('id="tier"') && html.includes('id="sources"');
    
    if ((lines > 300 && hasCanvas && hasAssets) || hasVercel) {
        if (!isBaseTemplate || hasVercel) {
            flagships.push({ dir, lines, hasVercel });
        }
    }
});

flagships.sort((a, b) => b.lines - a.lines);

console.log('True flagships (' + flagships.length + '):');
flagships.forEach(f => {
    console.log('  ' + f.dir + ' (' + f.lines + ' lines, vercel:' + f.hasVercel + ')');
});
