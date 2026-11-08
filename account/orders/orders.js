(function () {
  'use strict';
  var S = window.Sandbox;

  function money(cents) {
    return '$' + (Number(cents || 0) / 100).toFixed(2);
  }

  function render(orders) {
    document.getElementById('orders-count').textContent = orders.length + ' order' + (orders.length === 1 ? '' : 's');
    if (!orders.length) {
      document.getElementById('orders-list').hidden = true;
      var empty = document.getElementById('orders-empty');
      empty.hidden = false;
      empty.innerHTML = '<div class="sb-empty-hero"><span class="sb-module-icon">◈</span><h2>Your first piece of the pantheon awaits</h2><p>Orders placed with this email will appear here automatically, including fulfillment and tracking.</p><a class="sb-btn sb-btn-primary" href="/store/">Enter the Reliquary</a></div>';
      return;
    }
    var rows = orders.map(function (order) {
      var tracking = order.trackingUrl
        ? '<a href="' + S.esc(order.trackingUrl) + '" target="_blank" rel="noopener">' + S.esc(order.carrier || 'Track shipment') + ' →</a>'
        : '<span class="sb-cell-sub">Tracking not yet available</span>';
      return '<tr><td><div class="cell-title">' + S.esc(order.productName) + '</div><div class="cell-sub">' + S.esc(order.variantLabel || '') + ' · qty ' + order.quantity + '</div></td>' +
        '<td><code>' + S.esc(order.orderRef) + '</code></td><td>' + S.statusBadge(order.status) + '</td>' +
        '<td>' + S.esc(S.fmtDate(order.createdAt)) + '</td><td>' + S.esc(money(order.grossCents)) + '</td><td>' + tracking + '</td></tr>';
    }).join('');
    document.getElementById('orders-list').innerHTML = '<div class="sb-table-wrap"><table class="sb-table"><thead><tr><th>Piece</th><th>Order</th><th>Status</th><th>Placed</th><th>Total</th><th>Tracking</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  async function init() {
    var me = await S.requireAccount();
    if (!me) return;
    S.mountShell('orders', me.account.email, me);
    render((me.resources && me.resources.orders) || []);
  }

  init().catch(function (err) {
    document.getElementById('orders-list').innerHTML = '<div class="sb-state error">' + S.esc(err.message) + '</div>';
  });
})();
