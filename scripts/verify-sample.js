const fs = require('fs');

function checkNav(file, label) {
    const html = fs.readFileSync(file, 'utf8');
    const navMatch = html.match(/class="nav-links"[\s\S]*?\/div>/);
    console.log('=== ' + label + ' ===');
    if (navMatch) {
        const links = navMatch[0].match(/href="([^"]+)"[^>]*>([^<]+)/g);
        links.forEach(l => {
            const m = l.match(/href="([^"]+)"[^>]*>([^<]+)/);
            console.log('  ' + m[2] + ' -> ' + m[1]);
        });
        const hasExternal = navMatch[0].includes('punycodex.com');
        console.log('  Has external:', hasExternal);
    }
    console.log('');
}

checkNav('sites/admetus/index.html', 'admetus (base temple)');
checkNav('sites/asia/index.html', 'asia (realm)');
checkNav('sites/anubis/index.html', 'anubis (base temple)');
checkNav('sites/zeus/index.html', 'zeus (should be unchanged)');
checkNav('sites/osaka/index.html', 'osaka (should be unchanged)');
