fetch('https://punicodex.com/js/archetypes.js')
.then(r => {
  console.log('Status:', r.status);
  return r.text();
})
.then(text => {
  const count = (text.match(/id:\s*"/g) || []).length;
  console.log('archetypes.js entries on punicodex.com:', count);
})
.catch(e => console.error('Error:', e.message));
