async function check() {
  // Check punicodex.com/zeus/
  const res1 = await fetch('https://punicodex.com/zeus/');
  const t1 = await res1.text();
  console.log('punicodex.com/zeus/ status:', res1.status, 'url:', res1.url);
  console.log('Has spaces-section:', t1.includes('spaces-section'));
  console.log('Has space-slot:', t1.includes('space-slot'));
  console.log('Has booking-modal:', t1.includes('booking-modal'));
  console.log('Has Endorsed by:', t1.includes('Endorsed by'));
  console.log('Has Twelve sacred frames:', t1.includes('Twelve sacred frames'));
  console.log('Title:', (t1.match(/<title>([^<]+)<\/title>/) || ['', 'NO TITLE'])[1]);

  // Also check punicodex.com/sites/zeus/
  const res2 = await fetch('https://punicodex.com/sites/zeus/');
  const t2 = await res2.text();
  console.log('\npunicodex.com/sites/zeus/ status:', res2.status, 'url:', res2.url);
  console.log('Has spaces-section:', t2.includes('spaces-section'));
  console.log('Has space-slot:', t2.includes('space-slot'));
  console.log('Has booking-modal:', t2.includes('booking-modal'));
}
check();
