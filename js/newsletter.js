/* PuniCodex — Newsletter block ("The Unicode Herald Digest")
 * Shared: tasteful inline signup; email required, phone optional, honeypot,
 * posts to /api/newsletter/subscribe. No popups, no exit-intent. */
(function () {
  'use strict';

  const CSS = `
  .nl-block{border:1px solid rgba(212,175,55,.25);border-radius:14px;padding:1.5rem;background:linear-gradient(145deg,rgba(212,175,55,.05),rgba(0,0,0,.25));}
  .nl-kicker{font-size:.7rem;letter-spacing:.3em;text-transform:uppercase;color:rgba(212,175,55,.75);margin-bottom:.35rem;}
  .nl-title{font-family:var(--font-display,serif);font-size:1.25rem;margin-bottom:.5rem;color:var(--text-primary,#f0ead8);}
  .nl-desc{font-size:.9rem;color:var(--text-dim,#9a958a);line-height:1.6;margin-bottom:1rem;}
  .nl-form{display:flex;flex-direction:column;gap:.6rem;}
  .nl-row{display:flex;gap:.6rem;flex-wrap:wrap;}
  .nl-input{flex:1;min-width:180px;padding:.7rem .9rem;font-size:.95rem;border:1px solid rgba(212,175,55,.3);border-radius:10px;background:rgba(255,255,255,.05);color:inherit;}
  .nl-input:focus{outline:none;border-color:rgba(212,175,55,.7);}
  .nl-btn{padding:.7rem 1.2rem;font-weight:600;color:#0a0a0a;background:#d4af37;border:none;border-radius:10px;cursor:pointer;min-height:44px;}
  .nl-btn:disabled{opacity:.6;cursor:default;}
  .nl-note{font-size:.78rem;color:var(--text-dim,#9a958a);margin-top:.25rem;}
  .nl-success{color:#8fc98f;font-size:.95rem;line-height:1.6;}
  .nl-error{color:#e0a0a0;font-size:.9rem;}
  .nl-hp{position:absolute;left:-9999px;height:0;overflow:hidden;}
  `;

  const HTML = `
  <div class="nl-block" role="complementary" aria-label="Newsletter signup">
    <p class="nl-kicker">The Unicode Herald</p>
    <h3 class="nl-title">Quarterly, in print and online — never spam</h3>
    <p class="nl-desc">Temple news, scholarly features, and sponsor showcases, four times a year. Email is all we need; your phone is optional, and only ever used for the rare important notice.</p>
    <form class="nl-form" novalidate>
      <div class="nl-row">
        <input class="nl-input" type="email" name="email" required placeholder="your@email.com" aria-label="Email address">
        <input class="nl-input" type="tel" name="phone" placeholder="Phone (optional)" aria-label="Phone number (optional)">
      </div>
      <div class="nl-hp" aria-hidden="true"><input type="text" name="_hp" tabindex="-1" autocomplete="off"></div>
      <div class="nl-row">
        <button class="nl-btn" type="submit">Subscribe</button>
        <span class="nl-note">Unsubscribe any time with one reply.</span>
      </div>
      <p class="nl-error" hidden></p>
      <p class="nl-success" hidden>You are on the list — the Herald will find you next quarter.</p>
    </form>
  </div>`;

  function mount(host, source) {
    if (document.getElementById('nl-styles') === null) {
      const style = document.createElement('style');
      style.id = 'nl-styles';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    const wrap = document.createElement('div');
    wrap.innerHTML = HTML;
    host.appendChild(wrap.firstElementChild);

    const form = host.querySelector('.nl-form');
    const btn = form.querySelector('.nl-btn');
    const err = form.querySelector('.nl-error');
    const ok = form.querySelector('.nl-success');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      const phone = form.phone.value.trim();
      if (!email) return;
      btn.disabled = true;
      err.hidden = true;
      try {
        const res = await fetch('/api/newsletter/subscribe/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, phone, source, _hp: form._hp.value }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          err.textContent = data.error || 'Something went wrong — please try again.';
          err.hidden = false;
        } else {
          form.querySelectorAll('.nl-row, .nl-input').forEach((el) => (el.style.display = 'none'));
          err.hidden = true;
          ok.hidden = false;
          if (data.alreadySubscribed) ok.textContent = 'You are already on the list — see you next quarter.';
          if (window.px && window.px.track) {
            window.px.track('newsletter_subscribe', { source: source || 'site' });
          }
        }
      } catch (e2) {
        err.textContent = 'The network is down — try again soon.';
        err.hidden = false;
      } finally {
        btn.disabled = false;
      }
    });
  }

  window.PuniNewsletter = { mount };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-newsletter]').forEach((el) => {
      mount(el, el.getAttribute('data-newsletter') || 'site');
    });
  });
})();
