const fs = require('fs');
const path = require('path');

// Build a map of all flagship names and their link targets
const flagships = [
  'aigyptos','ab','akh','alfheimr','aphrodite','apollon','ares','artemis',
  'athena','athenai','atlas','chaos','delphoi','demeter','dionysos','gaia',
  'hades','hekate','helheimr','helios','hephaistos','hera','hermes','hestia',
  'jotunheimr','ker','kobe','kyoto','maa','medousa','midgardr','muspellheimr',
  'nike','odinn','olympos','osaka','persephone','pontos','poseidon','prometheus',
  'ra','ragnarok','selene','shiva','sia','sparte','tartaros','thor','zeus'
];

// Build name dictionary: each flagship has multiple possible names
const nameMap = {};
flagships.forEach(dir => {
  const html = fs.readFileSync(path.join('sites', dir, 'index.html'), 'utf8');
  
  // Extract title
  const titleMatch = html.match(/<title>([^|]+)/);
  const title = titleMatch ? titleMatch[1].trim() : dir;
  
  // Extract Greek/Unicode name from hero
  const greekMatch = html.match(/class="title-greek">([^<]+)/) || 
                     html.match(/class="title-hieroglyph">([^<]+)/) ||
                     html.match(/class="title-rune">([^<]+)/);
  const greek = greekMatch ? greekMatch[1].trim() : null;
  
  // Extract English/transliterated name
  const transMatch = html.match(/class="title-trans">([^<]+)/);
  const trans = transMatch ? transMatch[1].trim() : null;
  
  nameMap[dir] = {
    link: '/sites/' + dir + '/',
    title,
    greek,
    trans,
    names: [dir]
  };
  
  if (greek && greek !== dir) nameMap[dir].names.push(greek);
  if (trans && trans !== dir && trans.toLowerCase() !== dir) {
    nameMap[dir].names.push(trans);
    nameMap[dir].names.push(trans.toLowerCase());
  }
  // Add title parts
  const titleParts = title.split(/[—|]/).map(s => s.trim());
  titleParts.forEach(part => {
    if (part.length > 1 && !nameMap[dir].names.includes(part)) {
      nameMap[dir].names.push(part);
    }
  });
});

// Now scan each flagship for mentions of others
const results = [];

flagships.forEach(sourceDir => {
  const html = fs.readFileSync(path.join('sites', sourceDir, 'index.html'), 'utf8');
  const missingLinks = [];
  
  flagships.forEach(targetDir => {
    if (sourceDir === targetDir) return;
    
    const target = nameMap[targetDir];
    
    // Check each possible name
    target.names.forEach(name => {
      if (name.length < 2) return;
      
      // Create a regex that matches the name as a whole word
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp('(?:^|[^\\w])' + escaped + '(?:[^\\w]|$)', 'i');
      
      if (regex.test(html)) {
        // Check if this occurrence is already inside an <a> tag
        // Find the position of the match
        const idx = html.search(regex);
        if (idx !== -1) {
          // Check if it's inside an <a ...>...</a> tag
          const before = html.substring(0, idx);
          const after = html.substring(idx);
          
          // Find the nearest <a before and </a> after
          const lastOpenA = before.lastIndexOf('<a ');
          const lastCloseA = before.lastIndexOf('</a>');
          const nextCloseA = after.indexOf('</a>');
          
          const isLinked = lastOpenA > lastCloseA && nextCloseA !== -1;
          
          if (!isLinked) {
            // Get context
            const contextStart = Math.max(0, idx - 40);
            const contextEnd = Math.min(html.length, idx + name.length + 40);
            const context = html.substring(contextStart, contextEnd).replace(/\n/g, ' ');
            
            missingLinks.push({
              target: targetDir,
              name,
              context: '...' + context + '...'
            });
          }
        }
      }
    });
  });
  
  // Deduplicate by target
  const seen = new Set();
  const unique = [];
  missingLinks.forEach(m => {
    if (!seen.has(m.target)) {
      seen.add(m.target);
      unique.push(m);
    }
  });
  
  if (unique.length > 0) {
    results.push({ source: sourceDir, missing: unique });
  }
});

// Output results
console.log('Cross-link scan complete.\n');
results.forEach(r => {
  console.log('=== ' + r.source + ' mentions ' + r.missing.length + ' unlinked archetypes ===');
  r.missing.forEach(m => {
    console.log('  -> ' + m.target + ' (as "' + m.name + '")');
    console.log('     ' + m.context);
  });
  console.log('');
});

console.log('Total flagship pages with missing cross-links:', results.length);
