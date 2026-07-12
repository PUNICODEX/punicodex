(function () {
  const API_BASE = window.PUNYCODEX_API_BASE || '';
  const templeId = window.location.pathname.split('/').filter(Boolean).slice(-2, -1)[0] || '';

  const els = {
    navLogo: document.getElementById('nav-logo'),
    eyebrow: document.getElementById('patron-eyebrow'),
    title: document.getElementById('patron-title'),
    activeCount: document.getElementById('active-patron-count'),
    wall: document.getElementById('patron-wall'),
    wallEmpty: document.getElementById('patron-wall-empty'),
    form: document.getElementById('patron-form'),
    formError: document.getElementById('patron-form-error'),
    submit: document.getElementById('patron-submit'),
    amountInput: document.getElementById('patron-amount'),
    amountValue: document.getElementById('patron-amount-value'),
    amountPresets: document.querySelectorAll('.patron-amount-presets button'),
    socialTabs: document.getElementById('patron-social-tabs'),
    socialPrefix: document.getElementById('patron-social-prefix'),
    socialUrl: document.getElementById('patron-social-url'),
    socialHelp: document.getElementById('patron-social-help'),
    socialError: document.getElementById('patron-social-error'),
  };

  const SOCIAL_CONFIG = {
    x: {
      label: 'X / Twitter',
      prefix: 'https://x.com/',
      placeholder: 'yourhandle',
      help: 'Your public profile URL on X.',
      pattern: /^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}\/?$/,
    },
    instagram: {
      label: 'Instagram',
      prefix: 'https://www.instagram.com/',
      placeholder: 'yourhandle',
      help: 'Your public Instagram profile URL.',
      pattern: /^https:\/\/www\.instagram\.com\/[A-Za-z0-9_.]{1,30}\/?$/,
    },
    linkedin: {
      label: 'LinkedIn',
      prefix: 'https://www.linkedin.com/in/',
      placeholder: 'your-profile',
      help: 'Your LinkedIn profile URL (linkedin.com/in/...).',
      pattern: /^https:\/\/www\.linkedin\.com\/in\/[A-Za-z0-9-]{3,100}\/?$/,
    },
    tiktok: {
      label: 'TikTok',
      prefix: 'https://www.tiktok.com/@',
      placeholder: 'yourhandle',
      help: 'Your TikTok profile URL.',
      pattern: /^https:\/\/www\.tiktok\.com\/@?[A-Za-z0-9_.]{1,24}\/?$/,
    },
    youtube: {
      label: 'YouTube',
      prefix: 'https://www.youtube.com/@',
      placeholder: 'channelhandle',
      help: 'Your YouTube channel URL (youtube.com/@..., /c/..., /channel/..., or youtu.be/...).',
      pattern: /^https:\/\/(www\.)?(youtube\.com\/(channel\/|c\/|@)[A-Za-z0-9_-]+|youtu\.be\/[A-Za-z0-9_-]+)\/?$/,
    },
    github: {
      label: 'GitHub',
      prefix: 'https://github.com/',
      placeholder: 'yourhandle',
      help: 'Your GitHub profile URL.',
      pattern: /^https:\/\/github\.com\/[A-Za-z0-9-]{1,39}\/?$/,
    },
    website: {
      label: 'Website',
      prefix: 'https://',
      placeholder: 'yourdomain.com',
      help: 'Your personal or project website.',
      pattern: /^https:\/\/([A-Za-z0-9-]+\.)+[A-Za-z]{2,}(\/[A-Za-z0-9-._~:/?#[\]@!$&'()*+,;=]*)?$/,
    },
  };

  let selectedPlatform = 'x';
  let selectedCents = 700;

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDollars(cents) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function setLogo() {
    if (!templeId || !els.navLogo) return;
    els.navLogo.innerHTML = `
      <picture>
        <source srcset="../assets/${escapeHtml(templeId)}_logolockup.webp" type="image/webp">
        <img src="../assets/${escapeHtml(templeId)}_logolockup.png" alt="${escapeHtml(templeId)}" class="nav-logo-img">
      </picture>
    `;
  }

  function setPageTitle() {
    if (!templeId) return;
    if (els.eyebrow) els.eyebrow.textContent = `PUNYCODEX Patronage — /sites/${templeId}`;
    if (els.title) els.title.textContent = `Honor This Temple`;
  }

  function platformIcon(platform) {
    const icons = {
      x: '𝕏',
      instagram: '✦',
      linkedin: 'in',
      tiktok: '♪',
      youtube: '▶',
      github: '⌘',
      website: '↗',
    };
    return icons[platform] || '↗';
  }

  function renderPatron(patron) {
    const card = document.createElement('article');
    card.className = 'patron-card';

    const displayName = patron.display_name || 'Anonymous Patron';
    const title = patron.title || '';
    const message = patron.message || '';
    const platform = patron.social_platform;
    const url = patron.social_url;

    const nameHtml = url
      ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(displayName)}</a>`
      : escapeHtml(displayName);

    const platformHtml = platform && url
      ? `<span class="patron-card-platform"><span>${platformIcon(platform)}</span> ${escapeHtml(platform)}</span>`
      : '<span></span>';

    card.innerHTML = `
      <div class="patron-card-header">
        <div class="patron-avatar" aria-hidden="true">${escapeHtml(displayName.charAt(0).toUpperCase())}</div>
        <div>
          <h3 class="patron-card-name">${nameHtml}</h3>
          ${title ? `<p class="patron-card-title">${escapeHtml(title)}</p>` : ''}
        </div>
      </div>
      ${message ? `<p class="patron-card-message">“${escapeHtml(message)}”</p>` : ''}
      <div class="patron-card-meta">
        ${platformHtml}
        <span>${formatDollars(patron.amount_cents || 700)}/mo</span>
      </div>
    `;
    return card;
  }

  async function loadPatrons() {
    if (!templeId || !els.wall) return;

    try {
      const res = await fetch(`${API_BASE}/api/patrons/${encodeURIComponent(templeId)}`);
      if (!res.ok) throw new Error('Unable to load patrons');
      const data = await res.json();
      const patrons = data.patrons || [];

      els.wall.innerHTML = '';
      if (patrons.length === 0) {
        if (els.wallEmpty) els.wallEmpty.hidden = false;
      } else {
        if (els.wallEmpty) els.wallEmpty.hidden = true;
        patrons.forEach((patron) => els.wall.appendChild(renderPatron(patron)));
      }

      if (els.activeCount) els.activeCount.textContent = String(patrons.length);
    } catch (err) {
      if (els.activeCount) els.activeCount.textContent = '—';
      if (els.wall) els.wall.innerHTML = `<p class="patron-form-error" style="text-align:center;">Unable to load patron wall. Please refresh the page.</p>`;
    }
  }

  function updateAmountDisplay(cents) {
    selectedCents = Number(cents);
    if (els.amountInput) els.amountInput.value = selectedCents;
    if (els.amountValue) els.amountValue.textContent = formatDollars(selectedCents);

    els.amountPresets.forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.cents) === selectedCents);
    });
  }

  function bindAmountControls() {
    if (els.amountInput) {
      els.amountInput.addEventListener('input', (e) => updateAmountDisplay(e.target.value));
    }

    els.amountPresets.forEach((btn) => {
      btn.addEventListener('click', () => updateAmountDisplay(btn.dataset.cents));
    });
  }

  function setActivePlatform(platform) {
    selectedPlatform = platform;
    const config = SOCIAL_CONFIG[platform];
    if (!config) return;

    if (els.socialPrefix) els.socialPrefix.textContent = config.prefix;
    if (els.socialUrl) {
      els.socialUrl.placeholder = config.placeholder;
      els.socialUrl.value = '';
    }
    if (els.socialHelp) els.socialHelp.textContent = config.help;
    hideSocialError();

    const tabs = els.socialTabs?.querySelectorAll('button');
    tabs?.forEach((btn) => btn.classList.toggle('active', btn.dataset.platform === platform));
  }

  function bindSocialTabs() {
    if (!els.socialTabs) return;
    els.socialTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-platform]');
      if (!btn) return;
      setActivePlatform(btn.dataset.platform);
    });
  }

  function showSocialError(message) {
    if (els.socialError) {
      els.socialError.textContent = message;
      els.socialError.hidden = false;
    }
  }

  function hideSocialError() {
    if (els.socialError) els.socialError.hidden = true;
  }

  function showFormError(message) {
    if (els.formError) {
      els.formError.textContent = message;
      els.formError.hidden = false;
    }
  }

  function hideFormError() {
    if (els.formError) els.formError.hidden = true;
  }

  function getSocialUrl() {
    const raw = els.socialUrl?.value?.trim() || '';
    if (!raw) return null;

    const config = SOCIAL_CONFIG[selectedPlatform];
    if (!config) return null;

    // If the user only typed the handle/path, prepend the prefix.
    let fullUrl = raw;
    if (!raw.startsWith('https://')) {
      fullUrl = config.prefix + raw.replace(/^@/, '');
    }

    if (!config.pattern.test(fullUrl)) {
      showSocialError(`Please enter a valid ${config.label} URL or handle.`);
      return null;
    }

    hideSocialError();
    return fullUrl;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    hideFormError();

    const displayName = (document.getElementById('patron-name')?.value || '').trim();
    const title = (document.getElementById('patron-title-input')?.value || '').trim() || null;
    const message = (document.getElementById('patron-message')?.value || '').trim() || null;
    const email = (document.getElementById('patron-email')?.value || '').trim();

    if (!displayName) return showFormError('Please enter a display name.');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showFormError('Please enter a valid email address.');
    }

    const socialUrl = getSocialUrl();
    if (els.socialUrl?.value?.trim() && !socialUrl) {
      // Validation already showed the specific social error.
      return;
    }

    const payload = {
      templeId,
      email,
      displayName,
      title,
      message,
      amountCents: selectedCents,
      socialPlatform: socialUrl ? selectedPlatform : null,
      socialUrl: socialUrl || null,
    };

    if (els.submit) {
      els.submit.disabled = true;
      els.submit.innerHTML = '<span>Redirecting to Stripe…</span>';
    }

    try {
      const res = await fetch(`${API_BASE}/api/patrons/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.sessionUrl) {
        throw new Error(data.error || 'Unable to start checkout');
      }
      window.location.href = data.sessionUrl;
    } catch (err) {
      showFormError(err.message || 'Unable to start checkout. Please try again.');
      if (els.submit) {
        els.submit.disabled = false;
        els.submit.innerHTML = '<span>Proceed to Secure Checkout</span>';
      }
    }
  }

  function handleReturnFromStripe() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('patron') === 'success') {
      const url = new URL(window.location.href);
      url.searchParams.delete('patron');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', url.toString());

      const successSection = document.createElement('section');
      successSection.className = 'section';
      successSection.innerHTML = `
        <div class="container">
          <div class="patron-form-card" style="text-align:center;">
            <div class="patron-benefit-icon" style="margin:0 auto 1rem;">✓</div>
            <h2 class="section-title">Thank You</h2>
            <p class="patron-hero-lead">Your patronage has been confirmed. Your name will appear on the temple wall shortly.</p>
            <a href="#join" class="btn-primary" style="margin-top:1rem;">Back to the Form</a>
          </div>
        </div>
      `;
      const formSection = document.getElementById('join');
      if (formSection && formSection.parentNode) {
        formSection.parentNode.insertBefore(successSection, formSection);
      }
      loadPatrons();
    } else if (params.get('patron') === 'canceled') {
      showFormError('Checkout was canceled. You can try again whenever you like.');
      const url = new URL(window.location.href);
      url.searchParams.delete('patron');
      window.history.replaceState({}, '', url.toString());
    }
  }

  function init() {
    if (!templeId) return;
    setLogo();
    setPageTitle();
    bindAmountControls();
    bindSocialTabs();
    setActivePlatform('x');
    if (els.form) els.form.addEventListener('submit', handleSubmit);
    loadPatrons();
    handleReturnFromStripe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
