const { handleWebhook } = require('./stripe');
const { getBookingByToken } = require('./bookings');

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

  return result;
}

module.exports = { processWebhook };
