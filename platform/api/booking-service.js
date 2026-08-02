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
  setBookingStatus,
  updateSlotMeta,
  isBundleSlot,
  getSlotCreatives,
  releaseSlotsForBooking,
} = require('./bookings');
const discountService = require('./discount-service');
const { createBookingCheckoutSession, createRenewalCheckoutSession } = require('./stripe');
const { createVerifiedSession, consumeVerifiedSession } = require('./verified-sessions');
const { validateMeta, validateCompanyName } = require('./booking-validation');
const { existingWebpFor } = require('./image-webp');
const {
  sendVerificationCode: emailSendVerificationCode,
  sendBookingConfirmation,
  sendDashboardLinks,
  notifyAdminApplication,
  getSiteDisplayName,
  sandboxPanelUrl,
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
  discountCode = null,
}) {
  if (!slotId || !email) {
    throw new BookingError(400, 'slotId and email required');
  }
  if (!verificationToken || !(await consumeVerifiedSession(email, verificationToken))) {
    throw new BookingError(400, 'Email not verified. Please request a new code.');
  }

  const months0 = parseLeaseMonths(leaseMonths);
  const trial = parseTrialMonths(trialMonths);
  if (trial >= months0) {
    throw new BookingError(400, 'trialMonths must be less than leaseMonths');
  }

  const slot = await getSlotById(slotId);
  if (!slot) throw new BookingError(404, 'Slot not found');
  if (slot.status !== 'available') {
    throw new BookingError(400, 'Slot is not available');
  }

  const metaError = validateMeta(slot.width, customHeading, customSubtitle);
  if (metaError) throw new BookingError(400, metaError);
  const nameError = validateCompanyName(companyName);
  if (nameError) throw new BookingError(400, nameError);

  const siteSlug = slot.site_slug || 'nike';
  const siteName = getSiteDisplayName(siteSlug);

  // Sponsorship discount codes, validated authoritatively at creation: the
  // sponsor pays the discounted amount right here (or nothing at all).
  let appliedDiscount = null;
  if (discountCode && typeof discountCode === 'string' && discountCode.trim()) {
    const check = await discountService.validateCode({
      code: discountCode.trim(),
      siteSlug,
      leaseMonths: months0,
      priceCents: slot.price_cents,
      slotId,
    });
    if (check.valid) appliedDiscount = check;
  }

  // The placement's term. A free_months code means the placement itself IS
  // the free term — N months, no card, then it ends.
  let months = months0;
  if (appliedDiscount && appliedDiscount.terms.kind === 'free_months') {
    months = appliedDiscount.terms.freeMonths;
  }

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
      discountCode: discountCode && typeof discountCode === 'string' ? discountCode.trim() : null,
    });
  } catch (err) {
    if (err.status === 409) {
      throw new BookingError(409, err.message);
    }
    throw err;
  }
  const { id, token } = bookingResult;

  // Provision the sponsor's sandbox account now, serialized with the booking
  // writes (a fire-and-forget provision raced the next write under WAL and
  // locked the database). The returned setup link rides in the email.
  const panelUrl = await sandboxPanelUrl(email);

  const isTrial = trial > 0;
  const isYearly = months0 === 12 && !isTrial;
  const baseAmountCents = isTrial
    ? slot.price_cents
    : isYearly
      ? Math.round(slot.price_cents * 12 * 0.9)
      : slot.price_cents * months0;

  let amountCents = baseAmountCents;
  let effectiveTrial = trial;
  if (appliedDiscount) {
    const terms = appliedDiscount.terms;
    if (terms.kind === 'free_months') {
      // Complimentary for the free term: nothing is ever charged.
      amountCents = 0;
    } else if (terms.kind === 'free_months_then_price') {
      effectiveTrial = terms.freeMonths;
      amountCents = terms.thenPriceCents;
    } else if (terms.kind === 'trial_extension') {
      effectiveTrial = trial + terms.freeMonths;
      amountCents = slot.price_cents;
    } else {
      // percent_off / fixed_off price off the lease base — identical to the
      // approval path, so what the modal displays is what Stripe charges.
      amountCents = discountService.computePrice({
        priceCents: baseAmountCents,
        leaseMonths: months0,
        ...terms,
      }).finalCents;
    }
  }

  // ── Complimentary redemption ──────────────────────────────────────────
  // A code that reduces the term to nil never touches Stripe: the booking
  // goes straight to 'approved' (the post-payment state), the sponsor gets
  // their dashboard link, and creative review proceeds as normal.
  if (appliedDiscount && amountCents === 0) {
    await setBookingStatus(id, 'approved');
    const redemption = await discountService.redeem({
      codeId: appliedDiscount.codeId,
      bookingId: id,
      email,
      originalCents: baseAmountCents,
      finalCents: 0,
    });
    if (!redemption.ok) {
      console.error(`Discount code ${appliedDiscount.code} redemption failed for booking ${id}`);
    }
    sendBookingConfirmation({
      email,
      slotName: slot.name,
      companyName,
      amountCents: 0,
      token,
      customHeading,
      customSubtitle,
      leaseMonths: months,
      trialMonths: 0,
      siteSlug,
      complimentary: true,
      panelUrlOverride: panelUrl,
    }).catch(() => {});
    return {
      bookingId: id,
      token,
      complimentary: true,
      leaseMonths: months,
      trialMonths: effectiveTrial,
      totalCents: 0,
      discount: { code: appliedDiscount.code, originalCents: baseAmountCents, finalCents: 0 },
    };
  }

  let stripeResult;
  try {
    stripeResult = await createBookingCheckoutSession({
      bookingId: id,
      email,
      slotName: slot.name,
      amountCents,
      token,
      leaseMonths: months,
      trialMonths: effectiveTrial,
      siteSlug,
      siteName,
    });
  } catch (stripeErr) {
    // Order matters: release the slots BEFORE deleting the booking. The
    // release matches on ad_slots.current_booking_id, so dropping the booking
    // row first would still leave the slots reserved — permanently unsellable
    // inventory pointing at an id that no longer exists.
    await releaseSlotsForBooking(id);
    await run('DELETE FROM bookings WHERE id = $1', [id]);
    console.error('Stripe error:', stripeErr.message);
    throw new BookingError(
      400,
      'Payment provider not configured. Add STRIPE_SECRET_KEY to environment variables.'
    );
  }

  if (appliedDiscount) {
    const redemption = await discountService.redeem({
      codeId: appliedDiscount.codeId,
      bookingId: id,
      email,
      originalCents: baseAmountCents,
      finalCents: amountCents,
    });
    if (!redemption.ok) {
      console.error(`Discount code ${appliedDiscount.code} redemption failed for booking ${id}`);
    }
  }

  await updateBookingStripeSession(id, stripeResult.sessionId);

  sendBookingConfirmation({
    email,
    slotName: slot.name,
    companyName,
    amountCents: effectiveTrial > 0 ? amountCents * (months - effectiveTrial) : amountCents,
    token,
    customHeading,
    customSubtitle,
    leaseMonths: months,
    trialMonths: effectiveTrial,
    siteSlug,
    panelUrlOverride: panelUrl,
  }).catch(() => {});

  return {
    bookingId: id,
    token,
    stripeUrl: stripeResult.sessionUrl,
    leaseMonths: months,
    trialMonths: effectiveTrial,
    totalCents: amountCents,
    mode: stripeResult.mode,
    ...(appliedDiscount
      ? {
          discount: {
            code: appliedDiscount.code,
            originalCents: baseAmountCents,
            finalCents: amountCents,
          },
        }
      : {}),
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
  discountCode,
  discount_code,
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
  const nameError = validateCompanyName(companyName);
  if (nameError) throw new BookingError(400, nameError);

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
      // Sponsorship discount code (never patrons): stored lightly here —
      // admin approval re-validates and redeems it authoritatively.
      discountCode: discountCode || discount_code,
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
    siteSlug,
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
  const siteName = getSiteDisplayName(siteSlug);

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
