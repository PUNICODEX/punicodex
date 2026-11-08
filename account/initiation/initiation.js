(function () {
  'use strict';
  var S = window.Sandbox;

  async function init() {
    var me = await S.requireAccount();
    if (!me) return;
    S.mountShell('initiation', me.account.email, me);
    var initiation = me.identity.initiation;
    var current = Number(initiation.currentChapter) || 0;
    var total = Math.max(1, Number(initiation.totalChapters) || 1);
    var complete = Boolean(initiation.completedAt);
    var percent = complete ? 100 : Math.min(100, Math.round((current / total) * 100));
    document.getElementById('initiation-status').textContent = complete ? 'Initiation complete' : current ? 'Continue your ascent' : 'Your initiation awaits';
    document.getElementById('initiation-count').textContent = current + ' / ' + total + ' scenes';
    document.getElementById('initiation-enter').textContent = complete ? 'Return to the First Principles' : current ? 'Continue the First Principles' : 'Enter the First Principles';
    var bar = document.getElementById('initiation-bar');
    bar.setAttribute('aria-valuenow', String(percent));
    bar.firstElementChild.style.width = percent + '%';
  }

  init().catch(function (err) {
    document.getElementById('initiation-status').textContent = err.message;
  });
})();
