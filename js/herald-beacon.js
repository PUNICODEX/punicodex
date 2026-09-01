/**
 * The Herald Beacon — persistent capture surface for The Unicode Herald.
 *
 * Shown only on a user's first visit per browser (localStorage-gated) and
 * never again once dismissed or subscribed. Expands into an elegant capture
 * card (validated email + optional phone) posting to /api/newsletter/subscribe/.
 * Focus-trapped, aria-labelled, Esc closes, no dark patterns, no layout shift.
 *
 * Never mounts on admin surfaces or the Herald page itself. Duplicate-mount
 * guarded. Zero dependencies.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'punicodex.herald.state';
  var MOUNT_FLAG = '__heraldBeaconMounted';

  // ── Mount gates ─────────────────────────────────────────────────────────
  if (window[MOUNT_FLAG]) return;
  window[MOUNT_FLAG] = true;

  var path = window.location.pathname || '/';
  if (/^\/(admin|admin-portal|account|api)\b/.test(path)) return;
  if (/^\/herald\/?/.test(path)) return; // the Herald page already pitches

  var state = null;
  try {
    state = window.localStorage.getItem(STORAGE_KEY);
  } catch (_e) {
    state = null; // storage blocked — behave as first visit, offer politely
  }
  if (state === 'dismissed' || state === 'subscribed') return;

  function remember(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (_e) {
      // Storage blocked: the beacon may reappear next visit — acceptable.
    }
  }

  // ── DOM ──────────────────────────────────────────────────────────────────
  var root = document.createElement('div');
  root.className = 'herald-beacon';
  root.setAttribute('data-herald-beacon', '');

  var SEAL_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
    '<path d="M12 2l2.4 5.3 5.6.6-4.2 3.9 1.2 5.6-5-2.9-5 2.9 1.2-5.6L4 7.9l5.6-.6z" stroke-linejoin="round"/>' +
    '<circle cx="12" cy="12" r="10.5" opacity="0.4"/></svg>';

  root.innerHTML =
    '<button type="button" class="herald-beacon__seal" aria-label="Open The Unicode Herald signup" aria-expanded="false" aria-controls="herald-beacon-card">' +
    '<span class="herald-beacon__pulse" aria-hidden="true"></span>' +
    SEAL_SVG +
    '</button>' +
    '<div class="herald-beacon__card" id="herald-beacon-card" role="dialog" aria-modal="false" aria-label="The Unicode Herald" hidden>' +
    '<button type="button" class="herald-beacon__close" aria-label="Dismiss The Unicode Herald">&times;</button>' +
    '<p class="herald-beacon__kicker">The Unicode Herald</p>' +
    '<h2 class="herald-beacon__title">Names worth keeping.</h2>' +
    '<p class="herald-beacon__pitch">A quarterly letter on restored names, temple news, and the scholarship behind them — <em>written like it matters, because it does</em>.</p>' +
    '<form class="herald-beacon__form" novalidate>' +
    '<input type="email" class="herald-beacon__field" name="email" placeholder="you@example.com" aria-label="Email address (required)" autocomplete="email" required>' +
    '<input type="tel" class="herald-beacon__field" name="phone" placeholder="Phone (optional)" aria-label="Phone number (optional)" autocomplete="tel">' +
    '<span class="herald-beacon__optional">Phone optional — email is all we need</span>' +
    '<input type="text" class="herald-beacon__hp" name="_hp" tabindex="-1" aria-hidden="true" autocomplete="off">' +
    '<button type="submit" class="herald-beacon__submit">Join the Herald</button>' +
    '<span class="herald-beacon__error" role="alert" aria-live="polite"></span>' +
    '</form>' +
    '<p class="herald-beacon__micro">Quarterly. No spam, ever. Unsubscribe anytime.</p>' +
    '</div>';

  var seal = root.querySelector('.herald-beacon__seal');
  var card = root.querySelector('.herald-beacon__card');
  var closeBtn = root.querySelector('.herald-beacon__close');
  var form = root.querySelector('.herald-beacon__form');
  var emailInput = form.querySelector('input[name="email"]');
  var phoneInput = form.querySelector('input[name="phone"]');
  var errorEl = form.querySelector('.herald-beacon__error');
  var submitBtn = form.querySelector('.herald-beacon__submit');
  var isOpen = false;
  var lastFocus = null;

  function openCard() {
    if (isOpen) return;
    isOpen = true;
    lastFocus = document.activeElement;
    root.classList.add('herald-beacon--open');
    card.hidden = false;
    seal.setAttribute('aria-expanded', 'true');
    window.setTimeout(function () {
      emailInput.focus();
    }, 60);
    document.addEventListener('keydown', onKeydown, true);
    document.addEventListener('pointerdown', onOutside, true);
  }

  function closeCard(markDismissed) {
    if (!isOpen) return;
    isOpen = false;
    root.classList.remove('herald-beacon--open');
    seal.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKeydown, true);
    document.removeEventListener('pointerdown', onOutside, true);
    window.setTimeout(function () {
      card.hidden = true;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }, 200);
    if (markDismissed) remember('dismissed');
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeCard(true);
      return;
    }
    if (e.key !== 'Tab') return;
    // Focus trap within the card.
    var focusables = card.querySelectorAll(
      'button, input, [href], [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onOutside(e) {
    if (!root.contains(e.target)) closeCard(true);
  }

  seal.addEventListener('click', function () {
    if (isOpen) closeCard(true);
    else openCard();
  });
  closeBtn.addEventListener('click', function () {
    closeCard(true);
  });

  // ── Submit ───────────────────────────────────────────────────────────────
  function setError(msg) {
    errorEl.textContent = msg || '';
    emailInput.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function showSuccess(snippet) {
    card.innerHTML =
      '<div class="herald-beacon__success">' +
      '<span class="herald-beacon__success-mark" aria-hidden="true">✦</span>' +
      '<p><strong>You are on the list.</strong></p>' +
      '<p>The next Herald finds you when it ships.</p>' +
      '<p class="herald-beacon__snippet">' + snippet + '</p>' +
      '</div>';
    remember('subscribed');
    if (window.px && window.px.track) {
      window.px.track('newsletter_subscribe', { source: 'herald-beacon' });
    }
    window.setTimeout(function () {
      closeCard(false);
    }, 5200);
  }

  var SNIPPETS = [
    'Did you know? The acute on Apóllōn falls on the second syllable — Greek Ἀπόλλων never stresses the first alpha.',
    'Did you know? Old Norse ð (eth) is the voiced dental fricative, as in English "this" — Hermóðr keeps it where English lost it.',
    'Did you know? IAST never writes ē — Sanskrit e and o are inherently long, which is why Kārttikeya is the correct form.',
    'Did you know? The circumflex does double duty: one mark recording both the pitch accent and the long vowel beneath it — Ἀθηνᾶ in a single sign.',
  ];

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = (emailInput.value || '').trim();
    var phone = (phoneInput.value || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Please provide a valid email address.');
      emailInput.focus();
      return;
    }
    if (phone && phone.replace(/[^\d+]/g, '').length < 7) {
      setError('That phone number looks incomplete — it is optional, so you can leave it empty.');
      phoneInput.focus();
      return;
    }
    setError('');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Joining…';

    fetch('/api/newsletter/subscribe/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        phone: phone || undefined,
        source: 'herald-beacon',
        _hp: form.querySelector('input[name="_hp"]').value || '',
      }),
    })
      .then(function (res) {
        return res.json().then(function (json) {
          return { status: res.status, json: json };
        });
      })
      .then(function (r) {
        if (r.status === 429) {
          setError('Too many attempts — please wait a while and try again.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Join the Herald';
          return;
        }
        if (r.status >= 400 && !(r.json && r.json.ok)) {
          setError((r.json && r.json.error) || 'Something went wrong — please try again.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Join the Herald';
          return;
        }
        showSuccess(SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)]);
      })
      .catch(function () {
        setError('Network error — please check your connection and try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Join the Herald';
      });
  });

  // Mount after the page is interactive; fixed position means zero layout shift.
  function mount() {
    document.body.appendChild(root);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
