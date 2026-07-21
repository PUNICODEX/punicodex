const crypto = require('node:crypto');
const { run, get } = require('../db/operational');
const {
  getSlots,
  getSlotBySlug,
  getSlotById,
  createBooking,
  getBookingByToken,
  getBookingsByEmail,
  updateBookingStripeSession,
  markBookingPaid,
  setCancelAtEnd,
  updateSlotMeta,
  isBundleSlot,
  getSlotCreatives,
} = require('./bookings');
const { createBookingCheckoutSession, createRenewalCheckoutSession } = require('./stripe');
const { createVerifiedSession, consumeVerifiedSession } = require('./verified-sessions');
const { validateMeta } = require('./booking-validation');
const { existingWebpFor } = require('./image-webp');
const {
  sendVerificationCode: emailSendVerificationCode,
  sendBookingConfirmation,
  sendDashboardLinks,
  notifyAdminApplication,
} = require('./email');

class BookingError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Email verification codes are stored as SHA-256 hashes so a database read
// (backup, logs, SQLi) never discloses a usable code. Comparison is done in
// constant time against the hash of the candidate code.
function hashVerificationCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function verificationCodeMatches(stored, candidate) {
  const storedBuf = Buffer.from(String(stored || ''), 'utf8');
  const candidateBuf = Buffer.from(hashVerificationCode(candidate), 'utf8');
  if (storedBuf.length !== candidateBuf.length) return false;
  return crypto.timingSafeEqual(storedBuf, candidateBuf);
}

function parseLeaseMonths(leaseMonths) {
  const months = parseInt(leaseMonths, 10) || 1;
  if (![1, 12].includes(months)) {
    throw new BookingError(400, 'leaseMonths must be 1 or 12');
  }
  return months;
}

function parseTrialMonths(trialMonths) {
  const trial = parseInt(trialMonths, 10) || 0;
  if (![0, 3, 6].includes(trial)) {
    throw new BookingError(400, 'trialMonths must be 0, 3, or 6');
  }
  return trial;
}

async function listSlots(siteSlug = null) {
  return { slots: await getSlots(siteSlug || null) };
}

async function getSlot(slug, siteSlug = null) {
  const slot = await getSlotBySlug(slug, siteSlug || null);
  if (!slot) throw new BookingError(404, 'Slot not found');
  return slot;
}

async function createBookingRequest({
  slotId,
  email,
  companyName,
  websiteUrl,
  customHeading,
  customSubtitle,
  leaseMonths = 1,
  trialMonths = 0,
  verificationToken,
}) {
  if (!slotId || !email) {
    throw new BookingError(400, 'slotId and email required');
  }
  if (!verificationToken || !(await consumeVerifiedSession(email, verificationToken))) {
    throw new BookingError(400, 'Email not verified. Please request a new code.');
  }

  const months = parseLeaseMonths(leaseMonths);
  const trial = parseTrialMonths(trialMonths);
  if (trial >= months) {
    throw new BookingError(400, 'trialMonths must be less than leaseMonths');
  }

  const slot = await getSlotById(slotId);
  if (!slot) throw new BookingError(404, 'Slot not found');
  if (slot.status !== 'available') {
    throw new BookingError(400, 'Slot is not available');
  }

  const metaError = validateMeta(slot.width, customHeading, customSubtitle);
  if (metaError) throw new BookingError(400, metaError);

  const siteSlug = slot.site_slug || 'nike';
  const siteName = siteSlug === 'hermes' ? 'Hermês' : 'Níkē';
  let bookingResult;
  try {
    bookingResult = await createBooking({
      slotId,
      email,
      companyName,
      websiteUrl,
      customHeading,
      customSubtitle,
      leaseMonths: months,
      trialMonths: trial,
      siteSlug,
    });
  } catch (err) {
    if (err.status === 409) {
      throw new BookingError(409, err.message);
    }
    throw err;
  }
  const { id, token } = bookingResult;

  const isTrial = trial > 0;
  const isYearly = months === 12 && !isTrial;
  const amountCents = isTrial
    ? slot.price_cents
    : isYearly
      ? Math.round(slot.price_cents * 12 * 0.9)
      : slot.price_cents * months;

  let stripeResult;
  try {
    stripeResult = await createBookingCheckoutSession({
      bookingId: id,
      email,
      slotName: slot.name,
      amountCents,
      token,
      leaseMonths: months,
      trialMonths: trial,
      siteSlug,
      siteName,
    });
  } catch (stripeErr) {
    await run('DELETE FROM bookings WHERE id = $1', [id]);
    console.error('Stripe error:', stripeErr.message);
    throw new BookingError(
      400,
      'Payment provider not configured. Add STRIPE_SECRET_KEY to environment variables.'
    );
  }

  await updateBookingStripeSession(id, stripeResult.sessionId);

  sendBookingConfirmation({
    email,
    slotName: slot.name,
    companyName,
    amountCents: isTrial ? amountCents * (months - trial) : amountCents,
    token,
    customHeading,
    customSubtitle,
    leaseMonths: months,
    trialMonths: trial,
  }).catch(() => {});

  return {
    bookingId: id,
    token,
    stripeUrl: stripeResult.sessionUrl,
    leaseMonths: months,
    trialMonths: trial,
    totalCents: amountCents,
    mode: stripeResult.mode,
  };
}

async function applyBookingRequest({
  slotId,
  email,
  companyName,
  websiteUrl,
  customHeading,
  customSubtitle,
  leaseMonths = 1,
  trialMonths = 0,
  applicationNote,
  verificationToken,
}) {
  if (!slotId || !email) {
    throw new BookingError(400, 'slotId and email required');
  }
  if (!verificationToken || !(await consumeVerifiedSession(email, verificationToken))) {
    throw new BookingError(400, 'Email not verified. Please request a new code.');
  }

  const months = parseLeaseMonths(leaseMonths);
  const trial = parseTrialMonths(trialMonths);
  if (trial >= months) {
    throw new BookingError(400, 'trialMonths must be less than leaseMonths');
  }

  const slot = await getSlotById(slotId);
  if (!slot) throw new BookingError(404, 'Slot not found');
  if (!slot.is_bundle) {
    throw new BookingError(400, 'Applications are only accepted for the Full Page Takeover bundle');
  }
  if (slot.status !== 'available') {
    throw new BookingError(400, 'Slot is not available');
  }

  const metaError = validateMeta(slot.width, customHeading, customSubtitle);
  if (metaError) throw new BookingError(400, metaError);

  const siteSlug = slot.site_slug || 'nike';
  let bookingResult;
  try {
    bookingResult = await createBooking({
      slotId,
      email,
      companyName,
      websiteUrl,
      customHeading,
      customSubtitle,
      leaseMonths: months,
      trialMonths: trial,
      siteSlug,
      status: 'pending_application',
      applicationNote,
    });
  } catch (err) {
    if (err.status === 409) {
      throw new BookingError(409, err.message);
    }
    throw err;
  }
  const { id, token } = bookingResult;

  notifyAdminApplication({
    slotName: slot.name,
    companyName,
    bookingId: id,
    applicationNote,
  }).catch(() => {});

  return {
    bookingId: id,
    token,
    status: 'pending_application',
    message: 'Application submitted. You will receive a payment link once approved.',
  };
}

async function sendVerification(email) {
  // Type guard: non-string emails either lack .includes() (numbers, booleans,
  // objects → 500) or slip past it (arrays coerce into the SQL bind).
  if (typeof email !== 'string' || !email.includes('@')) {
    throw new BookingError(400, 'Valid email required');
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await run(
    `
      INSERT INTO email_verifications (email, code, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at
    `,
    [email, hashVerificationCode(code), expires]
  );

  await emailSendVerificationCode({ email, code });
  return { sent: true };
}

async function checkVerification(email, code) {
  if (!email || !code) throw new BookingError(400, 'Email and code required');
  // Type guard: non-string emails (booleans, objects, arrays) throw
  // driver-level bind errors at the SQL layer — reject before the DB call.
  if (typeof email !== 'string') throw new BookingError(400, 'Email and code required');

  const row = await get('SELECT * FROM email_verifications WHERE email = $1', [email]);
  if (!row) {
    throw new BookingError(400, 'No verification found. Please request a new code.');
  }
  if (new Date(row.expires_at) < new Date()) {
    throw new BookingError(400, 'Code expired. Please request a new one.');
  }
  if (!verificationCodeMatches(row.code, code)) throw new BookingError(400, 'Invalid code.');

  await run('DELETE FROM email_verifications WHERE email = $1', [email]);
  const verificationToken = await createVerifiedSession(email);
  return { verified: true, verificationToken };
}

async function getBookingByTokenSafe(token) {
  const booking = await getBookingByToken(token);
  if (!booking) throw new BookingError(404, 'Booking not found');
  return booking;
}

async function getAllBookingsByToken(token) {
  const primary = await getBookingByToken(token);
  if (!primary) throw new BookingError(404, 'Booking not found');
  const bookings = await getBookingsByEmail(primary.email);
  return {
    bookings: bookings.map((b) => ({
      id: b.id,
      slot_name: b.slot_name,
      slot_slug: b.slot_slug,
      status: b.status,
      token: b.analytics_token,
      custom_heading: b.custom_heading,
      custom_subtitle: b.custom_subtitle,
      creative_path: b.creative_path,
      creative_webp_path: existingWebpFor(b.creative_path),
      company_name: b.company_name,
      created_at: b.created_at,
      is_bundle: b.is_bundle,
      slot_id: b.slot_id,
      lease_months: b.lease_months,
      site_slug: b.site_slug,
      started_at: b.started_at,
      ends_at: b.ends_at,
      trial_ends_at: b.trial_ends_at,
      billing_status: b.billing_status,
      cancel_at_end: b.cancel_at_end,
      canceled_at: b.canceled_at,
      amount_paid_cents: b.amount_paid_cents,
    })),
  };
}

async function updateBookingMeta(token, { customHeading, customSubtitle, websiteUrl, slotId }) {
  const booking = await getBookingByTokenSafe(token);

  if (slotId && (await isBundleSlot(booking.slot_id))) {
    const slot = await getSlotById(slotId);
    if (!slot) throw new BookingError(404, 'Slot not found');
    const metaError = validateMeta(slot.width, customHeading, customSubtitle);
    if (metaError) throw new BookingError(400, metaError);
    await updateSlotMeta(booking.id, slotId, { customHeading, customSubtitle, websiteUrl });
    return { success: true };
  }

  const metaError = validateMeta(booking.width, customHeading, customSubtitle);
  if (metaError) throw new BookingError(400, metaError);

  // Build dynamic update so we only touch fields that were supplied.
  const sets = [];
  const params = [];
  if (customHeading !== undefined) {
    sets.push(`custom_heading = $${params.length + 1}`);
    params.push(customHeading || null);
  }
  if (customSubtitle !== undefined) {
    sets.push(`custom_subtitle = $${params.length + 1}`);
    params.push(customSubtitle || null);
  }
  if (websiteUrl !== undefined) {
    sets.push(`website_url = $${params.length + 1}`);
    params.push(websiteUrl || null);
  }

  // Any meta change on a live or approved booking must be re-approved.
  if (['live', 'approved'].includes(booking.status)) {
    sets.push(`status = $${params.length + 1}`);
    params.push('pending_approval');
  }

  if (sets.length === 0) {
    return { success: true };
  }

  params.push(booking.id);
  await run(
    `UPDATE bookings SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length}`,
    params
  );
  return { success: true };
}

async function cancelBooking(token) {
  const booking = await getBookingByTokenSafe(token);
  if (
    !['live', 'approved', 'pending_payment', 'pending_upload', 'pending_approval'].includes(
      booking.status
    )
  ) {
    throw new BookingError(400, `Cannot cancel in status: ${booking.status}`);
  }
  await setCancelAtEnd(booking.id, true);
  return { success: true, cancelAtEnd: true };
}

async function uncancelBooking(token) {
  const booking = await getBookingByTokenSafe(token);
  await setCancelAtEnd(booking.id, false);
  return { success: true, cancelAtEnd: false };
}

async function renewBooking(token, extensionMonthsInput) {
  const booking = await getBookingByTokenSafe(token);
  if (!['live', 'approved', 'pending_approval'].includes(booking.status)) {
    throw new BookingError(400, `Cannot renew in status: ${booking.status}`);
  }

  const extensionMonths = parseInt(extensionMonthsInput, 10) || 12;
  if (![1, 12].includes(extensionMonths)) {
    throw new BookingError(400, 'extensionMonths must be 1 or 12');
  }

  const slot = await getSlotById(booking.slot_id);
  if (!slot) throw new BookingError(404, 'Slot not found');

  const isYearly = extensionMonths === 12;
  const amountCents = isYearly
    ? Math.round(slot.price_cents * 12 * 0.9)
    : slot.price_cents * extensionMonths;
  const siteSlug = slot.site_slug || 'nike';
  const siteName = siteSlug === 'hermes' ? 'Hermês' : 'Níkē';

  const stripeResult = await createRenewalCheckoutSession({
    bookingId: booking.id,
    email: booking.email,
    slotName: slot.name,
    amountCents,
    token: booking.analytics_token,
    extensionMonths,
    siteSlug,
    siteName,
  });

  return {
    success: true,
    stripeUrl: stripeResult.sessionUrl,
    extensionMonths,
    totalCents: amountCents,
  };
}

async function recoverBookings(email) {
  // Same type guard as sendVerification: non-string emails must never reach
  // .includes() or the SQL bind.
  if (typeof email !== 'string' || !email.includes('@')) {
    throw new BookingError(400, 'Valid email required');
  }
  const bookings = await getBookingsByEmail(email);
  if (bookings.length === 0) {
    return { sent: true, message: 'If bookings exist for this email, a link has been sent.' };
  }
  await sendDashboardLinks({ email, bookings });
  return { sent: true, message: 'Dashboard links sent to your email.' };
}

async function checkBookingPayment(token) {
  const booking = await getBookingByTokenSafe(token);
  if (booking.status !== 'pending_payment') {
    return { status: booking.status, booking };
  }
  if (!booking.stripe_session_id) {
    return { status: booking.status, booking };
  }

  try {
    const { getStripe } = require('./stripe');
    const session = await getStripe().checkout.sessions.retrieve(booking.stripe_session_id);
    if (session.payment_status === 'paid') {
      const updated = await markBookingPaid(
        session.id,
        session.payment_intent,
        session.amount_total
      );
      return { status: updated.status, booking: updated };
    }
  } catch (stripeErr) {
    console.error('Stripe check error:', stripeErr.message);
  }

  return { status: booking.status, booking };
}

async function getBookingSlotCreatives(token) {
  const booking = await getBookingByTokenSafe(token);
  const creatives = await getSlotCreatives(booking.id);
  return { bookingId: booking.id, slotId: booking.slot_id, creatives };
}

module.exports = {
  BookingError,
  listSlots,
  getSlot,
  createBookingRequest,
  applyBookingRequest,
  sendVerification,
  checkVerification,
  getBookingByTokenSafe,
  getAllBookingsByToken,
  updateBookingMeta,
  cancelBooking,
  uncancelBooking,
  renewBooking,
  recoverBookings,
  checkBookingPayment,
  getBookingSlotCreatives,
};
