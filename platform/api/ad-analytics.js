const {
  getBookingByPublicId,
  getSlotCreatives,
  recordEvent,
  getDashboardMetrics,
} = require('./bookings');
const { getClientIp } = require('./client-ip');

const GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// Redirect targets allowed for the click tracker (CWE-601 open-redirect fix):
// same-origin relative paths, the platform's own hosts, and the registrar
// affiliate hosts the project already links out to (see buildRegistrarLinks
// in platform/api/crawler-db.js). The booked advertiser's own registered
// website is additionally allowed per-request via registeredUrls — it is
// bound server-side to the booking the tracking ID resolves to, so the
// caller-supplied url is never authoritative on its own. Everything else is
// rejected with 400.
const ALLOWED_REDIRECT_HOSTS = new Set([
  'punicodex.com',
  'www.punicodex.com',
  'punycodex.com',
  'www.punycodex.com',
  'www.godaddy.com',
  'www.namecheap.com',
  'porkbun.com',
  'www.dynadot.com',
  'spaceship.com',
]);

function isSafeRedirectUrl(url, platformUrl, registeredUrls = []) {
  if (!url || typeof url !== 'string') return false;
  // Same-origin relative path — but not '//host' (protocol-relative) or
  // '/\host' (browsers normalize the backslash to a slash).
  if (url.startsWith('/')) {
    return url.length === 1 || (url[1] !== '/' && url[1] !== '\\');
  }
  let target;
  try {
    target = new URL(url);
  } catch {
    return false;
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') return false;
  try {
    const platform = new URL(platformUrl || process.env.PLATFORM_URL || 'https://punicodex.com');
    if (target.hostname === platform.hostname && target.port === platform.port) return true;
  } catch {
    // Fall through to the allowlist when the platform URL is unparseable.
  }
  if (ALLOWED_REDIRECT_HOSTS.has(target.hostname)) return true;
  // The booked advertiser's own site(s), matched by origin.
  for (const registered of registeredUrls) {
    try {
      if (registered && new URL(registered).origin === target.origin) return true;
    } catch {
      // Ignore malformed registered URLs.
    }
  }
  return false;
}

function pixelHeaders(res) {
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

// Placement slug passed by the temple ad renderer (?slot= / body slotSlug).
// Only canonical slug shapes are stored; anything else falls back to the
// booking's whole-slot bucket (NULL).
function sanitizeSlotSlug(value) {
  return typeof value === 'string' && /^[a-z0-9-]{1,64}$/.test(value) ? value : null;
}

async function trackPixel(token, req, res, slotSlug) {
  pixelHeaders(res);
  try {
    if (token) {
      const booking = await getBookingByPublicId(token);
      if (booking && booking.status === 'live') {
        await recordEvent({
          bookingId: booking.id,
          eventType: 'impression',
          ip: getClientIp(req),
          userAgent: req.headers['user-agent'],
          referrer: req.headers.referer,
          slotSlug: sanitizeSlotSlug(slotSlug),
        });
      }
    }
  } catch (err) {
    // Silent fail: still return the pixel
    console.error('Analytics pixel error:', err);
  }
  res.status(200).send(GIF_BUFFER);
}

async function trackClick(token, url, req, res, slotSlug) {
  if (!token || !url) {
    return res.status(400).send('Missing parameters');
  }

  // Resolve the booking first: its registered website (plus any per-slot
  // creative overrides) is an allowed redirect target, bound server-side.
  let booking = null;
  const registeredUrls = [];
  try {
    booking = await getBookingByPublicId(token);
    if (booking) {
      registeredUrls.push(booking.website_url);
      const creatives = await getSlotCreatives(booking.id);
      for (const creative of creatives) {
        registeredUrls.push(creative.website_url);
      }
    }
  } catch (err) {
    console.error('Analytics click error:', err);
  }

  if (!isSafeRedirectUrl(url, undefined, registeredUrls)) {
    return res.status(400).send('Invalid redirect URL');
  }

  try {
    if (booking && booking.status === 'live') {
      await recordEvent({
        bookingId: booking.id,
        eventType: 'click',
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer,
        slotSlug: sanitizeSlotSlug(slotSlug),
      });
    }
  } catch (err) {
    console.error('Analytics click error:', err);
  }

  res.redirect(url);
}

async function trackViewability(token, visibleSeconds, visiblePercent, req, res, slotSlug) {
  if (!token) {
    return res.status(400).json({ error: 'token required' });
  }
  const seconds = parseFloat(visibleSeconds) || 0;
  const percent = parseFloat(visiblePercent) || 0;
  if (seconds < 1 || percent < 50) {
    return res.status(400).json({ error: 'Viewability threshold not met' });
  }

  try {
    const booking = await getBookingByPublicId(token);
    if (booking && booking.status === 'live') {
      await recordEvent({
        bookingId: booking.id,
        eventType: 'viewable_impression',
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer,
        visibleSeconds: seconds,
        visiblePercent: percent,
        slotSlug: sanitizeSlotSlug(slotSlug),
      });
    }
  } catch (err) {
    console.error('Analytics viewability error:', err);
  }

  res.json({ success: true });
}

async function getDashboard(token, res) {
  // Repeated query params arrive as an array; a non-string token would throw
  // at the SQL bind (500). Reject with 400 instead.
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'token required' });
  }
  try {
    const data = await getDashboardMetrics(token);
    if (!data) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(data);
  } catch (err) {
    console.error('Analytics dashboard error:', err);
    // Match the production masking in api/_utils.js handleError: a 500 body
    // must not serialize internal error details (SQL messages, paths).
    const prod = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    res.status(500).json({ error: prod ? 'Internal server error' : err.message });
  }
}

module.exports = {
  trackPixel,
  trackClick,
  trackViewability,
  getDashboard,
  isSafeRedirectUrl,
  sanitizeSlotSlug,
  GIF_BUFFER,
};
