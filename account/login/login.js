/**
 * Sponsor Sandbox — login / set-password page.
 *
 * Same auth contract as the original portal: the session token lives under
 * the same localStorage key, and the same three endpoints are called
 * (login / forgot / set-password). Supports ?token= (one-time setup or
 * reset link) and ?next= (post-login destination, sandbox paths only).
 */
(function () {
  'use strict';

  var S = window.Sandbox;

  function show(viewId) {
    ['view-login', 'view-set-password'].forEach(function (id) {
      document.getElementById(id).hidden = id !== viewId;
    });
  }

  function safeNext() {
    var next = new URLSearchParams(window.location.search).get('next');
    // Sandbox-internal paths only — never an open redirect.
    if (typeof next === 'string' && /^\/account\//.test(next) && next.indexOf('//') !== 0) {
      return next;
    }
    return '/account/';
  }

  function enter(token) {
    S.setToken(token);
    window.location.replace(safeNext());
  }

  function initLoginView() {
    document.getElementById('login-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var msg = document.getElementById('login-message');
      msg.classList.remove('success');
      msg.textContent = '';
      var btn = document.getElementById('login-submit');
      btn.disabled = true;
      try {
        var data = await S.api('/api/account/auth/login/', {
          method: 'POST',
          body: {
            email: document.getElementById('login-email').value.trim(),
            password: document.getElementById('login-password').value,
          },
        });
        enter(data.token);
      } catch (err) {
        msg.textContent = err.message;
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById('forgot-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var msg = document.getElementById('forgot-message');
      msg.classList.remove('success');
      msg.textContent = '';
      var btn = document.getElementById('forgot-submit');
      btn.disabled = true;
      try {
        var data = await S.api('/api/account/auth/forgot/', {
          method: 'POST',
          body: { email: document.getElementById('forgot-email').value.trim() },
        });
        msg.classList.add('success');
        msg.textContent = data.message || 'If an account exists for this email, a reset link has been sent.';
      } catch (err) {
        msg.textContent = err.message;
      } finally {
        btn.disabled = false;
      }
    });
  }

  function initSetPasswordView(token) {
    document.getElementById('set-password-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var msg = document.getElementById('set-password-message');
      msg.textContent = '';
      var password = document.getElementById('new-password').value;
      var confirm = document.getElementById('confirm-password').value;
      if (password.length < 8) {
        msg.textContent = 'Password must be at least 8 characters.';
        return;
      }
      if (password !== confirm) {
        msg.textContent = 'Passwords do not match.';
        return;
      }
      var btn = document.getElementById('set-password-submit');
      btn.disabled = true;
      try {
        var data = await S.api('/api/account/auth/set-password/', {
          method: 'POST',
          body: { token: token, password: password },
        });
        enter(data.token);
      } catch (err) {
        msg.textContent = err.message;
      } finally {
        btn.disabled = false;
      }
    });
  }

  function init() {
    initLoginView();

    var params = new URLSearchParams(window.location.search);
    var setupToken = params.get('token');
    if (setupToken) {
      initSetPasswordView(setupToken);
      show('view-set-password');
      return;
    }

    if (S.getToken()) {
      window.location.replace(safeNext());
      return;
    }

    show('view-login');
  }

  init();
})();
