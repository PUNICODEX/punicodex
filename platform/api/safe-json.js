/**
 * Safe JSON parsing helpers.
 *
 * Prevents corrupt or manually edited rows from crashing requests.
 */

function safeJsonParse(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (trimmed === '') return fallback;
  try {
    return JSON.parse(trimmed);
  } catch (_err) {
    return fallback;
  }
}

module.exports = { safeJsonParse };
