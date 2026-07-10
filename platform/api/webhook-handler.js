const { handleWebhook } = require('./stripe');
const { getBookingByToken } = require('./bookings');
const { getCreativePurchaseByStripeSessionId } = require('../db/scholars');

async function processWebhook(rawBody, signature) {
  const result = await handleWebhook(rawBody, signature);

  if (result && result.type === 'booking' && result.booking) {
    const booking = await getBookingByToken(result.booking.analytics_token);
    if (booking) {
      const { notifyUploadReady } = require('./email');
      await notifyUploadReady({
        email: booking.email,
        slotName: booking.slot_name,
        companyName: booking.company_name,
        bookingToken: booking.analytics_token,
        leaseMonths: booking.lease_months,
      }).catch(() => {});
    }
  }

  if (result && result.type === 'creative_purchase' && result.purchase) {
    const purchase = getCreativePurchaseByStripeSessionId(result.purchase.stripe_session_id);
    if (purchase?.licensee_email) {
      const { notifyCreativePurchaseReady } = require('./email');
      await notifyCreativePurchaseReady({
        email: purchase.licensee_email,
        assetId: purchase.asset_id,
        purchaseId: purchase.id,
      }).catch(() => {});
    }
  }

  return result;
}

module.exports = { processWebhook };
