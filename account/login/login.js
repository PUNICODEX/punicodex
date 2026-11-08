/**
 * PuniCodex Account — registration, login, and one-time setup links.
 *
 * Authentication uses secure same-origin cookies with CSRF protection. Legacy
 * bearer sessions remain valid during migration. ?next= is restricted to
 * account-internal destinations.
 */
(function () {
  'use strict';

  var S = window.Sandbox;

  function show(viewId) {
    ['view-login', 'view-register', 'view-set-password'].forEach(function (id) {
      document.getElementById(id).hidden = id !== viewId;
    });
  }

  function safeNext() {
    var next = new URLSearchParams(window.location.search).get('next');
    // Sandbox-internal paths only — never an open redirect.
    if (typeof next === 'string' && /^\/(?:account|genesis)\//.test(next) && next.indexOf('//') !== 0) {
      return next;
    }
    return '/account/';
  }

  function enter() {
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

  function initRegisterView() {
    document.getElementById('show-register').addEventListener('click', function () {
      show('view-register');
    });
    document.getElementById('show-login').addEventListener('click', function () {
      show('view-login');
    });
    document.getElementById('register-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var msg = document.getElementById('register-message');
      msg.classList.remove('success');
      msg.textContent = '';
      var password = document.getElementById('register-password').value;
      if (password.length < 12) {
        msg.textContent = 'Password must be at least 12 characters.';
        return;
      }
      if (password !== document.getElementById('register-confirm').value) {
        msg.textContent = 'Passwords do not match.';
        return;
      }
      var btn = document.getElementById('register-submit');
      btn.disabled = true;
      try {
        var data = await S.api('/api/account/auth/register/', {
          method: 'POST',
          body: {
            email: document.getElementById('register-email').value.trim(),
            password: password,
          },
        });
        msg.classList.add('success');
        msg.textContent = data.message + ' Check your inbox to activate your account.';
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
      if (password.length < 12) {
        msg.textContent = 'Password must be at least 12 characters.';
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
    initRegisterView();

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

    if (params.get('view') === 'register') {
      show('view-register');
      return;
    }

    S.api('/api/account/me/')
      .then(function () {
        window.location.replace(safeNext());
      })
      .catch(function () {
        show('view-login');
      });
  }

  init();
})();
