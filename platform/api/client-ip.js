/**
 * Shared client IP extraction.
 *
 * Reads the left-most value from X-Forwarded-For, then falls back through
 * X-Real-IP, req.ip, and the underlying connection/socket address.
 */

function getClientIp(req) {
  return (
    req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers?.['x-real-ip'] ||
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

module.exports = { getClientIp };
