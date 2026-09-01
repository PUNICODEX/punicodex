/**
 * PuniCodex — Business funnel registry (Phase 3 analytics).
 *
 * Canonical set of multi-step conversion funnels. Each funnel is a sequence of
 * analytics events; the first step is always the entry event and is the only
 * step that is scoped by temple_id when a temple filter is applied.
 */

const FUNNELS = {
  temple_to_sponsor: {
    name: 'Temple → Sponsor',
    steps: [
      { event: 'page_view', page_type: 'temple', name: 'Temple view' },
      { event: 'sponsor_modal_open', name: 'Sponsor CTA' },
      { event: 'sponsor_apply_submit', name: 'Application submitted' },
      { event: 'sponsor_payment_complete', name: 'Payment complete' },
      { event: 'sponsor_go_live', name: 'Live placement' },
    ],
  },
  temple_to_patron: {
    name: 'Temple → Patron',
    steps: [
      { event: 'page_view', page_type: 'temple', name: 'Temple view' },
      { event: 'patron_view', name: 'Patron panel viewed' },
      { event: 'patron_checkout_init', name: 'Checkout started' },
      { event: 'patron_checkout_complete', name: 'Subscribed' },
    ],
  },
  search_to_visit: {
    name: 'Search → Visit',
    steps: [
      { event: 'search_query', name: 'Search submitted' },
      { event: 'search_result_click', name: 'Result clicked' },
      { event: 'page_view', page_type: 'temple', name: 'Temple visited' },
    ],
  },
  store_purchase: {
    name: 'Store → Purchase',
    steps: [
      { event: 'store_product_view', name: 'Product viewed' },
      { event: 'store_cart_add', name: 'Added to cart' },
      { event: 'store_checkout_init', name: 'Checkout started' },
      { event: 'store_checkout_complete', name: 'Purchase complete' },
    ],
  },
};

function listFunnels() {
  return Object.entries(FUNNELS).map(([id, config]) => ({
    id,
    name: config.name,
    steps: config.steps,
  }));
}

function getFunnelConfig(id) {
  return FUNNELS[id] || null;
}

module.exports = {
  FUNNELS,
  listFunnels,
  getFunnelConfig,
};
