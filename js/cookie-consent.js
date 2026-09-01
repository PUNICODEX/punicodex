/**
 * PuniCodex — Cookie consent (GDPR/ePrivacy)
 *
 * First-visit consent surface. Records an explicit, timestamped choice in
 * localStorage (`punicodex.cookie-consent`) — accept or decline — and never
 * re-asks. Declining is as easy as accepting (one tap each, equal weight).
 *
 * What we store on your device: only strictly-necessary first-party items
 * (consent record, herald-dismissal state, boot-seen flag). PuniCodex does
 * not set third-party tracking cookies; analytics are first-party and
 * privacy-preserving (see /privacy/). The banner informs and records — it
 * never blocks content behind a wall.
 */
(function () {
  'use strict';

  var KEY = 'punicodex.cookie-consent';
  var seen = null;
  try {
    seen = window.localStorage.getItem(KEY);
  } catch (_e) {
    seen = 'blocked';
  }
  if (seen) return; // choice already recorded (or storage unavailable)

  var panel = document.createElement('div');
  panel.className = 'pc-cookie';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-live', 'polite');
  panel.setAttribute('aria-label', 'Cookie consent');
  panel.innerHTML =
    '<h2 class="pc-cookie__title">A note on cookies</h2>' +
    '<p class="pc-cookie__text">PuniCodex stores only strictly-necessary items on your device — your consent record, interface preferences, and first-party, privacy-preserving analytics. No third-party trackers, no advertising cookies, no fingerprinting. Analytics data use is governed by the <a href="/terms/analytics/">Analytics &amp; Insights Terms</a>; broader privacy practices live in the <a href="/privacy/">Privacy Policy</a>.</p>' +
    '<div class="pc-cookie__row">' +
    '<button type="button" class="pc-cookie__btn pc-cookie__btn--accept">Accept</button>' +
    '<button type="button" class="pc-cookie__btn pc-cookie__btn--decline">Decline</button>' +
    '</div>';

  function record(choice) {
    try {
      window.localStorage.setItem(
        KEY,
        JSON.stringify({ choice: choice, at: new Date().toISOString() })
      );
    } catch (_e) {
      /* storage blocked — banner simply closes for this session */
    }
    panel.classList.remove('pc-cookie--visible');
    window.setTimeout(function () {
      panel.remove();
    }, 600);
  }

  panel
    .querySelector('.pc-cookie__btn--accept')
    .addEventListener('click', function () {
      record('accepted');
    });
  panel
    .querySelector('.pc-cookie__btn--decline')
    .addEventListener('click', function () {
      record('declined');
    });

  function mount() {
    document.body.appendChild(panel);
    // Reveal on the next frame so the transition plays.
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        panel.classList.add('pc-cookie--visible');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
