/**
 * Admin booking actions shared by the local Express server and Vercel functions.
 */

const {
  getSlotById,
  createBooking,
  getBookingById,
  setBookingStatus,
  goLive,
  endBooking,
  getDashboardMetrics,
  updateBookingStripeSession,
  isBundleSlot,
  getBundleMembers,
} = require('./bookings');
const { createBookingCheckoutSession } = require('./stripe');
const { logAction } = require('./admin-actions');
const {
  notifyApplicationApproved,
  notifyApproved,
  notifyRejected,
  notifyLive,
  notifyTrialStarted,
  sendAnalyticsReport,
  sendBookingConfirmation,
  getSiteDisplayName,
  sandboxPanelUrl,
} = require('./email');
const { getAllBookings, getBookingCount, getBookingStats, getRevenueStats } = require('./admin');
const { run } = require('../db/operational');
const discountService = require('./discount-service');
const { runTrialReminders } = require('../scripts/trial-reminders');
const { runLeaseExpiry } = require('../scripts/lease-expiry');
const { validateMeta } = require('./booking-validation');

function computeBookingAmount(slot, months, trial) {
  const isTrial = trial > 0;
  const isYearly = months === 12 && !isTrial;
  return isTrial
    ? slot.price_cents
    : isYearly
      ? Math.round(slot.price_cents * 12 * 0.9)
      : slot.price_cents * months;
}

class AdminBookingError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Audit-trail actor. Legacy admin routes pass the raw x-admin-token string;
 * the unified admin portal passes the requirePortal auth object ({user,
 * role}) so the audit row records the portal user id instead.
 */
function auditActor(actor) {
  if (actor && typeof actor === 'object') return { adminUserId: actor.user?.id ?? null };
  return { adminToken: actor || null };
}

function parseMonths(value) {
  const months = parseInt(value, 10) || 12;
  if (![1, 12].includes(months)) {
    throw new AdminBookingError(400, 'leaseMonths must be 1 or 12');
  }
  return months;
}

function parseTrial(value) {
  const trial = parseInt(value, 10) || 0;
  if (![0, 3, 6].includes(trial)) {
    throw new AdminBookingError(400, 'trialMonths must be 0, 3, or 6');
  }
  return trial;
}

async function listBookings({ status, site } = {}) {
  return {
    bookings: await getAllBookings(status || null, site || null),
    stats: await getBookingStats(site || null),
  };
}

/**
 * Paged booking roster for the unified admin portal (Leasing section).
 * Returns the envelope the Leasing page renders: filtered/paged items, the
 * full stats block (incl. per-status counts) and a true 30-day revenue
 * summary derived from the daily revenue series.
 */
async function listBookingsPortal({ status, site, search, limit = 100, offset = 0 } = {}) {
  const [items, total, stats, revenue] = await Promise.all([
    getAllBookings(status || null, site || null, { search: search || null, limit, offset }),
    getBookingCount({ status: status || null, siteSlug: site || null, search: search || null }),
    getBookingStats(site || null),
    getRevenueStats(30),
  ]);
  const revenue30dCents = revenue.daily.reduce((sum, d) => sum + (Number(d.revenue_cents) || 0), 0);
  const bookings30d = revenue.daily.reduce((sum, d) => sum + (Number(d.bookings) || 0), 0);
  return {
    items,
    total,
    limit,
    offset,
    stats,
    revenue: {
      days: 30,
      revenueCents: revenue30dCents,
      revenueDollars: (revenue30dCents / 100).toFixed(2),
      bookings: bookings30d,
    },
  };
}

async function getRevenue({ days } = {}) {
  const d = parseInt(days, 10) || 30;
  return getRevenueStats(Math.min(d, 365));
}

async function createBookingAdmin(
  {
    slotId,
    email,
    companyName,
    websiteUrl,
    customHeading,
    customSubtitle,
    leaseMonths = 12,
    trialMonths = 0,
  },
  adminToken
) {
  if (!slotId || !email) {
    throw new AdminBookingError(400, 'slotId and email required');
  }

  const months = parseMonths(leaseMonths);
  const trial = parseTrial(trialMonths);
  if (trial >= months) {
    throw new AdminBookingError(400, 'trialMonths must be less than leaseMonths');
  }

  const slot = await getSlotById(slotId);
  if (!slot) throw new AdminBookingError(404, 'Slot not found');

  const metaError = validateMeta(slot.width, customHeading, customSubtitle);
  if (metaError) throw new AdminBookingError(400, metaError);

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
    });
  } catch (err) {
    if (err.status === 409) {
      throw new AdminBookingError(409, err.message);
    }
    throw err;
  }
  const { id, token } = bookingResult;
  await setBookingStatus(id, 'pending_upload', 'Admin-created trial lease');

  await logAction({
    ...auditActor(adminToken),
    action: 'admin.booking.create',
    bookingId: id,
    payload: { siteSlug, leaseMonths: months, trialMonths: trial },
  });

  return {
    bookingId: id,
    token,
    status: 'pending_upload',
    leaseMonths: months,
    trialMonths: trial,
  };
}

async function approveApplication(id, adminToken) {
  const booking = await getBookingById(id);
  if (!booking) throw new AdminBookingError(404, 'Booking not found');
  if (booking.status !== 'pending_application') {
    throw new AdminBookingError(400, 'Booking is not pending application');
  }

  const slot = await getSlotById(booking.slot_id);
  if (!slot) throw new AdminBookingError(404, 'Slot not found');

  let months = booking.lease_months || 1;
  const trial = booking.trial_months || 0;
  const originalMonths = months;
  const baseAmountCents = computeBookingAmount(slot, originalMonths, trial);
  const siteSlug = slot.site_slug || 'nike';
  const siteName = getSiteDisplayName(siteSlug);

  // Sponsorship discount codes (bookings only — this system never touches
  // patrons). The code was stored unvalidated at application time;
  // re-validate authoritatively now. A code that died since application must
  // never block approval: fall back to full price and note it for the admin.
  let amountCents = baseAmountCents;
  let effectiveTrial = trial;
  let appliedDiscount = null;
  let discountNote = null;

  if (booking.discount_code) {
    const check = await discountService.validateCode({
      code: booking.discount_code,
      siteSlug,
      leaseMonths: originalMonths,
      priceCents: slot.price_cents,
      slotId: booking.slot_id,
    });
    if (check.valid) {
      const terms = check.terms;
      if (terms.kind === 'free_months') {
        // Complimentary for N months: the placement IS the free term — no
        // Stripe, no card, ends with the term. Persist the adjusted lease so
        // goLive ends it correctly.
        months = terms.freeMonths;
        amountCents = 0;
      } else if (terms.kind === 'free_months_then_price') {
        // Stripe subscription with free_months×30 trial days, recurring
        // then_price_cents/mo.
        effectiveTrial = terms.freeMonths;
        amountCents = terms.thenPriceCents;
      } else if (terms.kind === 'trial_extension') {
        // Trial-month terms on a carded subscription: extend the booking's
        // trial; the recurring price is the slot's monthly price.
        effectiveTrial = trial + terms.freeMonths;
        amountCents = slot.price_cents;
      } else {
        amountCents = discountService.computePrice({
          priceCents: baseAmountCents,
          leaseMonths: originalMonths,
          ...terms,
        }).finalCents;
      }
      appliedDiscount = check;
    } else {
      discountNote = `Discount code ${booking.discount_code} not applied (${check.reason}); full price charged.`;
    }
  }

  // ── Complimentary redemption (founding-sponsor pitches) ────────────────
  // A code that reduces the term to nil never touches Stripe: no card, no
  // checkout, no auto-renewal. The booking goes straight to 'approved' (the
  // same state a paid booking reaches after payment) and the sponsor
  // receives their dashboard link instead of a payment page.
  if (appliedDiscount && amountCents === 0) {
    const note = discountNote ? [booking.admin_note, discountNote].filter(Boolean).join(' | ') : null;
    await setBookingStatus(booking.id, 'approved', note);
    if (months !== originalMonths) {
      await run('UPDATE bookings SET lease_months = $1 WHERE id = $2', [months, booking.id]);
    }

    const redemption = await discountService.redeem({
      codeId: appliedDiscount.codeId,
      bookingId: booking.id,
      email: booking.email,
      originalCents: baseAmountCents,
      finalCents: 0,
    });
    if (!redemption.ok) {
      console.error(
        `Discount code ${booking.discount_code} redemption failed (${redemption.reason}) for complimentary booking ${booking.id}`
      );
    }

    const updated = await getBookingById(booking.id);
    const panelUrl = await sandboxPanelUrl(booking.email);
    sendBookingConfirmation({
      email: booking.email,
      slotName: slot.name,
      companyName: booking.company_name,
      amountCents: 0,
      token: booking.analytics_token,
      customHeading: booking.custom_heading,
      customSubtitle: booking.custom_subtitle,
      leaseMonths: months,
      trialMonths: 0,
      siteSlug,
      complimentary: true,
      panelUrlOverride: panelUrl,
    }).catch(() => {});

    await logAction({
      ...auditActor(adminToken),
      action: 'admin.booking.approve-application',
      bookingId: booking.id,
      payload: {
        amountCents: 0,
        complimentary: true,
        discountCode: appliedDiscount.code,
        originalCents: baseAmountCents,
      },
    });

    return {
      success: true,
      status: 'approved',
      complimentary: true,
      discount: {
        code: appliedDiscount.code,
        kind: appliedDiscount.terms.kind,
        originalCents: baseAmountCents,
        finalCents: 0,
      },
      booking: updated,
    };
  }

  // ── Redeem BEFORE creating the Stripe session ──────────────────────────
  // redeem() is atomic (guarded UPDATE + transaction): when two approvals
  // race over the same single-use code, exactly one wins. The loser must
  // abort here — before any checkout session exists, before the status
  // flips, before the sponsor is emailed — otherwise both sides produce
  // discounted sessions for one code use. (The complimentary path above
  // keeps its own semantics: no Stripe session is ever created there.)
  if (appliedDiscount) {
    const redemption = await discountService.redeem({
      codeId: appliedDiscount.codeId,
      bookingId: booking.id,
      email: booking.email,
      originalCents: baseAmountCents,
      finalCents: amountCents,
    });
    if (!redemption.ok) {
      throw new AdminBookingError(
        409,
        `Discount code ${booking.discount_code} could not be redeemed (${redemption.reason}); approval aborted, no checkout session created`
      );
    }
  }

  const stripeResult = await createBookingCheckoutSession({
    bookingId: booking.id,
    email: booking.email,
    slotName: slot.name,
    amountCents,
    token: booking.analytics_token,
    leaseMonths: months,
    trialMonths: effectiveTrial,
    siteSlug,
    siteName,
  });

  await updateBookingStripeSession(booking.id, stripeResult.sessionId);
  // Append the dead-code note without clobbering the sponsor's application
  // note, and persist adjusted trial terms for goLive / trial reminders.
  const note = discountNote ? [booking.admin_note, discountNote].filter(Boolean).join(' | ') : null;
  await setBookingStatus(booking.id, 'pending_payment', note);
  if (effectiveTrial !== trial) {
    await run('UPDATE bookings SET trial_months = $1 WHERE id = $2', [effectiveTrial, booking.id]);
  }

  notifyApplicationApproved({
    email: booking.email,
    slotName: slot.name,
    companyName: booking.company_name,
    stripeUrl: stripeResult.sessionUrl,
    siteSlug,
  }).catch(() => {});

  await logAction({
    ...auditActor(adminToken),
    action: 'admin.booking.approve-application',
    bookingId: booking.id,
    payload: {
      amountCents,
      sessionId: stripeResult.sessionId,
      ...(appliedDiscount
        ? { discountCode: appliedDiscount.code, originalCents: baseAmountCents }
        : {}),
    },
  });

  return {
    success: true,
    status: 'pending_payment',
    stripeUrl: stripeResult.sessionUrl,
    ...(appliedDiscount
      ? {
          discount: {
            code: appliedDiscount.code,
            kind: appliedDiscount.terms.kind,
            originalCents: baseAmountCents,
            finalCents: amountCents,
            freeMonths: appliedDiscount.pricing.freeMonths,
            thenPriceCents: appliedDiscount.pricing.thenPriceCents,
          },
        }
      : {}),
  };
}

async function approveBooking(id, note, adminToken) {
  const booking = await getBookingById(id);
  if (!booking) throw new AdminBookingError(404, 'Booking not found');
  await setBookingStatus(id, 'approved', note || null);
  await logAction({
    ...auditActor(adminToken),
    action: 'admin.booking.approve',
    bookingId: booking.id,
    payload: { note: note || null },
  });
  notifyApproved({
    email: booking.email,
    slotName: booking.slot_name,
    companyName: booking.company_name,
    bookingToken: booking.analytics_token,
    siteSlug: booking.site_slug,
  }).catch(() => {});
  return { success: true, status: 'approved' };
}

async function rejectBooking(id, note, adminToken) {
  const booking = await getBookingById(id);
  if (!booking) throw new AdminBookingError(404, 'Booking not found');
  const reason = note || 'Does not meet guidelines';
  await setBookingStatus(id, 'rejected', reason);

  // Rejecting always frees the frame — a rejected booking must never keep a
  // slot reserved. Bundles release every member frame too.
  await run(
    `UPDATE ad_slots SET status = 'available', current_booking_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [booking.slot_id]
  );
  if (await isBundleSlot(booking.slot_id)) {
    const members = await getBundleMembers(booking.slot_id);
    for (const memberId of members) {
      await run(
        `UPDATE ad_slots SET status = 'available', current_booking_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [memberId]
      );
    }
  }

  await logAction({
    ...auditActor(adminToken),
    action: 'admin.booking.reject',
    bookingId: booking.id,
    payload: { note: reason },
  });
  notifyRejected({
    email: booking.email,
    slotName: booking.slot_name,
    companyName: booking.company_name,
    note: reason,
    bookingToken: booking.analytics_token,
    siteSlug: booking.site_slug,
  }).catch(() => {});
  return { success: true, status: 'rejected', slotReleased: true };
}

async function goLiveBooking(id, adminToken) {
  const booking = await getBookingById(id);
  if (!booking) throw new AdminBookingError(404, 'Booking not found');
  await goLive(id);
  await logAction({
    ...auditActor(adminToken),
    action: 'admin.booking.golive',
    bookingId: booking.id,
    payload: { trialMonths: booking.trial_months, leaseMonths: booking.lease_months },
  });

  const isTrial = (booking.trial_months || 0) > 0;
  if (isTrial) {
    notifyTrialStarted({
      email: booking.email,
      slotName: booking.slot_name,
      companyName: booking.company_name,
      trialMonths: booking.trial_months,
      trialEndsAt: booking.trial_ends_at,
      bookingToken: booking.analytics_token,
      siteSlug: booking.site_slug,
    }).catch(() => {});
  } else {
    notifyLive({
      email: booking.email,
      slotName: booking.slot_name,
      companyName: booking.company_name,
      bookingToken: booking.analytics_token,
      leaseMonths: booking.lease_months,
      siteSlug: booking.site_slug,
    }).catch(() => {});
  }

  return { success: true, status: 'live', trial: isTrial };
}

async function endBookingAdmin(id, adminToken) {
  const booking = await getBookingById(id);
  if (!booking) throw new AdminBookingError(404, 'Booking not found');

  if (booking.stripe_subscription_id) {
    try {
      const { getStripe } = require('./stripe');
      await getStripe().subscriptions.cancel(booking.stripe_subscription_id);
    } catch (stripeErr) {
      console.error('Stripe cancel error:', stripeErr.message);
    }
  }

  await endBooking(id);
  await logAction({
    ...auditActor(adminToken),
    action: 'admin.booking.end',
    bookingId: booking.id,
  });
  return { success: true, status: 'ended' };
}

async function sendBookingReport(id, adminToken) {
  const booking = await getBookingById(id);
  if (!booking) throw new AdminBookingError(404, 'Booking not found');
  const metrics = await getDashboardMetrics(booking.analytics_token);
  if (!metrics) throw new AdminBookingError(404, 'Booking metrics not found');
  await sendAnalyticsReport({
    email: booking.email,
    booking: metrics.booking,
    metrics: metrics.metrics,
  });
  await logAction({
    ...auditActor(adminToken),
    action: 'admin.booking.report',
    bookingId: booking.id,
  });
  return { sent: true };
}

async function runTrialRemindersAdmin(adminToken) {
  const result = await runTrialReminders();
  await logAction({
    ...auditActor(adminToken),
    action: 'admin.trial-reminders',
    payload: result,
  });
  return { success: true, ...result };
}

async function runLeaseExpiryAdmin(adminToken) {
  const result = await runLeaseExpiry();
  await logAction({
    ...auditActor(adminToken),
    action: 'admin.lease-expiry',
    payload: result,
  });
  return { success: true, ...result };
}

module.exports = {
  AdminBookingError,
  listBookings,
  listBookingsPortal,
  getRevenue,
  createBookingAdmin,
  approveApplication,
  approveBooking,
  rejectBooking,
  goLiveBooking,
  endBookingAdmin,
  sendBookingReport,
  runTrialRemindersAdmin,
  runLeaseExpiryAdmin,
};
