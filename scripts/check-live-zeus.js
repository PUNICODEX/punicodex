async function check() {
  // Check punycodex.com/zeus/
  const res1 = await fetch('https://punycodex.com/zeus/');
  const t1 = await res1.text();
  console.log('punycodex.com/zeus/ status:', res1.status, 'url:', res1.url);
  console.log('Has spaces-section:', t1.includes('spaces-section'));
  console.log('Has space-slot:', t1.includes('space-slot'));
  console.log('Has booking-modal:', t1.includes('booking-modal'));
  console.log('Has Endorsed by:', t1.includes('Endorsed by'));
  console.log('Has Twelve sacred frames:', t1.includes('Twelve sacred frames'));
  console.log('Title:', (t1.match(/<title>([^<]+)<\/title>/) || ['', 'NO TITLE'])[1]);

  // Also check punycodex.com/sites/zeus/
  const res2 = await fetch('https://punycodex.com/sites/zeus/');
  const t2 = await res2.text();
  console.log('\npunycodex.com/sites/zeus/ status:', res2.status, 'url:', res2.url);
  console.log('Has spaces-section:', t2.includes('spaces-section'));
  console.log('Has space-slot:', t2.includes('space-slot'));
  console.log('Has booking-modal:', t2.includes('booking-modal'));
}
check();
