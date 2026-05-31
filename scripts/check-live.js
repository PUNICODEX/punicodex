fetch('https://punycodex-main.vercel.app/js/archetypes.js')
.then(r => r.text())
.then(text => {
  const count = (text.match(/id:\s*"/g) || []).length;
  console.log('archetypes.js entries on live site:', count);
  const ids = text.match(/id:\s*"([^"]+)"/g);
  console.log('First 5 ids:', ids.slice(0, 5).map(s => s.match(/id:\s*"([^"]+)"/)[1]));
})
.catch(e => console.error('Error:', e.message));
