async function getText(site) {
  const res = await fetch('https://punicodex.com/sites/' + site + '/');
  const html = await res.text();
  const body = html.match(/<body>[\s\S]*?<\/body>/)?.[0] || '';
  const text = body
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

async function compare() {
  const z = await getText('zeus');
  const a = await getText('aphrodite');
  console.log('ZEUS length:', z.length);
  console.log('APHRODITE length:', a.length);
  console.log('ZEUS first 200:', z.substring(0, 200));
  console.log('APHRODITE first 200:', a.substring(0, 200));
}
compare();
