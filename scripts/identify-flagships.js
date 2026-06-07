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
    
    // Flagship indicators
    const hasCanvas = html.includes('<canvas');
    const hasScript = fs.existsSync(path.join(dirPath, 'script.js')) || 
                      fs.existsSync(path.join(dirPath, 'script-v2.js'));
    const hasAssets = fs.existsSync(path.join(dirPath, 'assets'));
    const hasCustomCss = fs.existsSync(path.join(dirPath, 'styles.css')) ||
                         fs.existsSync(path.join(dirPath, 'styles-v2.css'));
    const hasMyths = html.includes('id="myths"') || html.includes('id="history"');
    const hasPronunciation = html.includes('id="pronunciation"');
    const hasPantheonSection = html.includes('id="pantheon"');
    const hasVercel = fs.existsSync(path.join(dirPath, '.vercel'));
    
    // Score: more indicators = more likely flagship
    let score = 0;
    if (hasCanvas) score += 3;
    if (hasScript) score += 2;
    if (hasAssets) score += 1;
    if (hasCustomCss) score += 1;
    if (hasMyths) score += 2;
    if (hasPronunciation) score += 1;
    if (hasPantheonSection) score += 1;
    if (hasVercel) score += 2;
    
    // Base temples typically have these exact sections
    const isBaseTemplate = html.includes('id="breakdown"') && html.includes('id="tier"') && html.includes('id="sources"');
    if (isBaseTemplate) score -= 3;
    
    if (score >= 3) {
        flagships.push({ dir, score, hasCanvas, hasScript, hasVercel });
    }
});

flagships.sort((a, b) => b.score - a.score);

console.log('Flagship candidates (' + flagships.length + '):');
flagships.forEach(f => {
    console.log(f.dir + ' (score:' + f.score + ', canvas:' + f.hasCanvas + ', script:' + f.hasScript + ', vercel:' + f.hasVercel + ')');
});
