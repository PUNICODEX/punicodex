const { expireLapsedSponsorships } = require('../db/scholars');

async function runSponsorshipExpiry() {
  // Read-time enforcement lives in platform/scholars/authz.js
  // (isActiveSponsorship); this pass flips the stored status so dashboards
  // and admin listings reflect reality.
  const expired = expireLapsedSponsorships();
  return { expired };
}

if (require.main === module) {
  runSponsorshipExpiry()
    .then((result) => {
      console.log('Sponsorship expiry:', result);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Sponsorship expiry runner failed:', err);
      process.exit(1);
    });
}

module.exports = { runSponsorshipExpiry };
