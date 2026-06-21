/**
 * Shared ad-slot booking validation helpers.
 */

function getCharLimits(width) {
  if (width >= 1000) return { heading: 50, subtitle: 80 };
  if (width >= 800) return { heading: 38, subtitle: 60 };
  if (width >= 500) return { heading: 24, subtitle: 40 };
  if (width >= 300) return { heading: 15, subtitle: 26 };
  return { heading: 10, subtitle: 18 };
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
