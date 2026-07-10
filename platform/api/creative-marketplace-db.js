/**
 * PÚNYCODEX — Creative Marketplace payment helpers
 *
 * Shared logic between the Stripe webhook handler and the marketplace router.
 */

const {
  getCreativePurchaseByStripeSessionId,
  updateCreativePurchaseStatus,
  getCreativeAssetById,
  createCreativePayout,
  withTransaction,
} = require('../db/scholars');

async function markCreativePurchasePaid(stripeSessionId, paymentIntent, amountTotal) {
  const purchase = getCreativePurchaseByStripeSessionId(stripeSessionId);
  if (!purchase) {
    throw new Error(`Creative purchase not found for session ${stripeSessionId}`);
  }

  withTransaction(() => {
    updateCreativePurchaseStatus(purchase.id, { status: 'paid' });
    createCreativePayout({
      assetId: purchase.asset_id,
      creatorId: getCreativeAssetById(purchase.asset_id)?.creator_id,
      purchaseId: purchase.id,
      amountCents: purchase.creator_payout_cents,
      metadata: { paymentIntent, amountTotal },
    });
  });

  return getCreativePurchaseByStripeSessionId(stripeSessionId);
}

module.exports = {
  markCreativePurchasePaid,
};
