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

module.exports = { getCharLimits, validateMeta };
