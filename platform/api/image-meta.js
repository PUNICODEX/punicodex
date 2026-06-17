const sizeOf = require('image-size');

function getImageDimensions(buffer) {
  try {
    const result = sizeOf(buffer);
    if (!result?.width || !result.height) {
      return { error: 'Could not determine image dimensions' };
    }
    return { width: result.width, height: result.height, type: result.type };
  } catch (err) {
    return { error: err.message || 'Invalid image data' };
  }
}

function validateCreativeDimensions(
  buffer,
  expectedWidth,
  expectedHeight,
  { allowExact = true, allowAspectRatio = true, tolerance = 0.05 } = {}
) {
  const dims = getImageDimensions(buffer);
  if (dims.error) return dims.error;

  const { width, height } = dims;
  if (allowExact && width === expectedWidth && height === expectedHeight) {
    return null;
  }

  if (allowAspectRatio && expectedWidth > 0 && expectedHeight > 0) {
    const expectedRatio = expectedWidth / expectedHeight;
    const actualRatio = width / height;
    const ratioDiff = Math.abs(expectedRatio - actualRatio) / expectedRatio;
    if (ratioDiff <= tolerance) {
      return null;
    }
  }

  return `Image dimensions (${width}×${height}) do not match the required ${expectedWidth}×${expectedHeight} slot.`;
}

module.exports = {
  getImageDimensions,
  validateCreativeDimensions,
};
