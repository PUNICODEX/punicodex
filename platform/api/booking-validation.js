/**
 * Shared ad-slot booking validation helpers.
 */

function getCharLimits(width) {
  // New marketplace layout has two slot shapes:
  // - Banners: 1200 × 400 px
  // - Boxes: 600 × 600 px
  if (width >= 1000) return { heading: 60, subtitle: 100 };
  if (width >= 500) return { heading: 36, subtitle: 60 };
  if (width >= 300) return { heading: 24, subtitle: 40 };
  return { heading: 12, subtitle: 20 };
}

function validateMeta(width, customHeading, customSubtitle) {
  const limits = getCharLimits(width);
  if (customHeading && customHeading.length > limits.heading) {
    return `Heading exceeds ${limits.heading} character limit for this slot size`;
  }
  if (customSubtitle && customSubtitle.length > limits.subtitle) {
    return `Subtitle exceeds ${limits.subtitle} character limit for this slot size`;
  }
  return null;
}

const COMPANY_NAME_MAX = 120;

// C0 controls, DEL, and the C1 range. None of these carry legitimate meaning
// in a company name, and they are the raw material for display spoofing and
// log injection.
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/;

/**
 * Sponsor-supplied display name. This string is rendered on every public
 * temple page (and in the admin portal) while the booking is still merely
 * reserved — i.e. before any payment clears — so it is the one booking field
 * an unpaid stranger can put in front of every visitor.
 *
 * The renderers write it with textContent, which is the real defence against
 * script injection; this is the second layer.
 *
 * Returns an error string, or null when the value is acceptable.
 */
function validateCompanyName(companyName) {
  if (companyName == null || companyName === '') return null;
  if (typeof companyName !== 'string') return 'companyName must be a string';
  if (companyName.length > COMPANY_NAME_MAX) {
    return `Company name exceeds ${COMPANY_NAME_MAX} character limit`;
  }
  if (CONTROL_CHARS.test(companyName)) {
    return 'Company name contains invalid control characters';
  }
  return null;
}

module.exports = { getCharLimits, validateMeta, validateCompanyName, COMPANY_NAME_MAX };
