const { getBookingByToken, recordEvent, getDashboardMetrics } = require('./bookings');
const { getClientIp } = require('./client-ip');

const GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

function isSafeRedirectUrl(url, platformUrl) {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('/')) return true;
  try {
    const target = new URL(url);
    const platform = new URL(platformUrl || process.env.PLATFORM_URL || 'https://punycodex.com');
    if (target.protocol !== 'http:' && target.protocol !== 'https:') return false;
    return target.hostname === platform.hostname && target.port === platform.port;
  } catch {
    return false;
  }
}

function pixelHeaders(res) {
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

async function trackPixel(token, req, res) {
  pixelHeaders(res);
  try {
    if (token) {
      const booking = await getBookingByToken(token);
      if (booking && booking.status === 'live') {
        await recordEvent({
          bookingId: booking.id,
          eventType: 'impression',
          ip: getClientIp(req),
          userAgent: req.headers['user-agent'],
          referrer: req.headers.referer,
        });
      }
    }
  } catch (err) {
    // Silent fail: still return the pixel
    console.error('Analytics pixel error:', err);
  }
  res.status(200).send(GIF_BUFFER);
}

async function trackClick(token, url, req, res) {
  if (!token || !url) {
    return res.status(400).send('Missing parameters');
  }
  if (!isSafeRedirectUrl(url)) {
    return res.status(400).send('Invalid redirect URL');
  }

  try {
    const booking = await getBookingByToken(token);
    if (booking && booking.status === 'live') {
      await recordEvent({
        bookingId: booking.id,
        eventType: 'click',
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer,
      });
    }
  } catch (err) {
    console.error('Analytics click error:', err);
  }

  res.redirect(url);
}

async function trackViewability(token, visibleSeconds, visiblePercent, req, res) {
  if (!token) {
    return res.status(400).json({ error: 'token required' });
  }
  const seconds = parseFloat(visibleSeconds) || 0;
  const percent = parseFloat(visiblePercent) || 0;
  if (seconds < 1 || percent < 50) {
    return res.status(400).json({ error: 'Viewability threshold not met' });
  }

  try {
    const booking = await getBookingByToken(token);
    if (booking && booking.status === 'live') {
      await recordEvent({
        bookingId: booking.id,
        eventType: 'viewable_impression',
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer,
        visibleSeconds: seconds,
        visiblePercent: percent,
      });
    }
  } catch (err) {
    console.error('Analytics viewability error:', err);
  }

  res.json({ success: true });
}

async function getDashboard(token, res) {
  if (!token) {
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
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  trackPixel,
  trackClick,
  trackViewability,
  getDashboard,
  isSafeRedirectUrl,
  GIF_BUFFER,
};
