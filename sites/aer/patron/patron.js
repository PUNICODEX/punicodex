(function () {
  const API_BASE = window.PUNYCODEX_API_BASE || '';
  const templeId = window.location.pathname.split('/').filter(Boolean).slice(-2, -1)[0] || '';

  const els = {
    navLogo: document.getElementById('nav-logo'),
    eyebrow: document.getElementById('patron-eyebrow'),
    title: document.getElementById('patron-title'),
    activeCount: document.getElementById('active-patron-count'),
    spotsRemaining: document.getElementById('spots-remaining'),
    heroScarcity: document.getElementById('patron-hero-scarcity'),
    scarcityMessage: document.getElementById('scarcity-message'),
    soldOut: document.getElementById('patron-sold-out'),
    wall: document.getElementById('patron-wall'),
    wallEmpty: document.getElementById('patron-wall-empty'),
    form: document.getElementById('patron-form'),
    formError: document.getElementById('patron-form-error'),
    submit: document.getElementById('patron-submit'),
    socialTabs: document.getElementById('patron-social-tabs'),
    socialPrefix: document.getElementById('patron-social-prefix'),
    socialUrl: document.getElementById('patron-social-url'),
    socialHelp: document.getElementById('patron-social-help'),
    socialError: document.getElementById('patron-social-error'),
    previewCard: document.getElementById('patron-preview-card'),
    previewAvatar: document.getElementById('preview-avatar'),
    previewName: document.getElementById('preview-name'),
    previewTitle: document.getElementById('preview-title'),
    previewMessage: document.getElementById('preview-message'),
    previewPlatform: document.getElementById('preview-platform'),
    previewAmount: document.getElementById('preview-amount'),
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
  let selectedCents = 500;

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

  function renderPlaque(slotNumber, patron) {
    const article = document.createElement('article');
    const isClaimed = !!patron;
    article.className = `patron-plaque ${isClaimed ? 'patron-plaque--claimed' : 'patron-plaque--available'}`;
    article.setAttribute('data-slot', String(slotNumber));

    if (!isClaimed) {
      article.addEventListener('click', () => {
        document.getElementById('reserve')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('patron-name')?.focus();
      });
      article.innerHTML = `
        <span class="plaque-number">${String(slotNumber).padStart(2, '0')}</span>
        <div class="plaque-content">
          <span class="plaque-available-icon">+</span>
          <h3 class="plaque-name">Available</h3>
          <p class="plaque-title">Reserve this plaque</p>
        </div>
      `;
      return article;
    }

    const displayName = patron.display_name || 'Anonymous Patron';
    const title = patron.title || '';
    const message = patron.message || '';
    const platform = patron.social_platform;
    const url = patron.social_url;

    const nameHtml = url
      ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(displayName)}</a>`
      : escapeHtml(displayName);

    const platformHtml = platform && url
      ? `<span class="plaque-platform"><span>${platformIcon(platform)}</span> ${escapeHtml(platform)}</span>`
      : '<span></span>';

    article.innerHTML = `
      <span class="plaque-number">${String(slotNumber).padStart(2, '0')}</span>
      <div class="plaque-content">
        <div class="plaque-avatar" aria-hidden="true">${escapeHtml(displayName.charAt(0).toUpperCase())}</div>
        <h3 class="plaque-name">${nameHtml}</h3>
        ${title ? `<p class="plaque-title">${escapeHtml(title)}</p>` : '<p class="plaque-title">Patron</p>'}
        ${message ? `<p class="plaque-message">“${escapeHtml(message)}”</p>` : ''}
        <div class="plaque-footer">
          ${platformHtml}
          <span>${formatDollars(patron.amount_cents || selectedCents)}/mo</span>
        </div>
      </div>
    `;
    return article;
  }

  function updateLimitUI(data) {
    const activeCount = Number(data.activeCount) || 0;
    const limit = Number(data.limit) || 20;
    const remaining = Math.max(0, limit - activeCount);

    if (els.activeCount) els.activeCount.textContent = String(activeCount);
    if (els.spotsRemaining) els.spotsRemaining.textContent = String(remaining);

    if (data.isFull) {
      if (els.form) els.form.hidden = true;
      if (els.soldOut) els.soldOut.hidden = false;
      const subtitle = document.querySelector('.patron-form-subtitle');
      if (subtitle) subtitle.textContent = 'This temple has reached its limit of 20 plaques.';
      if (els.previewCard) els.previewCard.hidden = true;
    }
  }

  async function loadPatrons() {
    if (!templeId || !els.wall) return;

    try {
      const res = await fetch(`${API_BASE}/api/patrons/${encodeURIComponent(templeId)}`);
      if (!res.ok) throw new Error('Unable to load patrons');
      const data = await res.json();
      const patrons = (data.patrons || []).slice(0, 20);
      const limit = Number(data.limit) || 20;

      els.wall.innerHTML = '';
      for (let slot = 1; slot <= limit; slot += 1) {
        const patron = patrons[slot - 1] || null;
        els.wall.appendChild(renderPlaque(slot, patron));
      }

      updateLimitUI(data);
    } catch (err) {
      if (els.activeCount) els.activeCount.textContent = '—';
      if (els.spotsRemaining) els.spotsRemaining.textContent = '—';
      if (els.wall) els.wall.innerHTML = `<p class="patron-form-error" style="text-align:center;">Unable to load patron wall. Please refresh the page.</p>`;
    }
  }

  function updatePreview() {
    if (!els.previewCard) return;

    const name = (document.getElementById('patron-name')?.value || '').trim();
    const title = (document.getElementById('patron-title-input')?.value || '').trim();
    const message = (document.getElementById('patron-message')?.value || '').trim();
    const socialRaw = (els.socialUrl?.value || '').trim();
    const config = SOCIAL_CONFIG[selectedPlatform];

    if (els.previewAvatar) els.previewAvatar.textContent = name ? name.charAt(0).toUpperCase() : '?';
    if (els.previewName) els.previewName.textContent = name || 'Your Name';
    if (els.previewTitle) {
      els.previewTitle.textContent = title;
      els.previewTitle.style.display = title ? 'block' : 'none';
    }
    if (els.previewMessage) {
      els.previewMessage.textContent = message || 'Your dedication will appear here.';
      els.previewMessage.classList.toggle('is-placeholder', !message);
    }
    if (els.previewAmount) els.previewAmount.textContent = `${formatDollars(selectedCents)}/mo`;
    if (els.previewPlatform) {
      if (socialRaw) {
        els.previewPlatform.innerHTML = `<span>${platformIcon(selectedPlatform)}</span> ${escapeHtml(config.label)}`;
        els.previewPlatform.style.display = 'inline-flex';
      } else {
        els.previewPlatform.style.display = 'none';
      }
    }
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
    updatePreview();
  }

  function bindSocialTabs() {
    if (!els.socialTabs) return;
    els.socialTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-platform]');
      if (!btn) return;
      setActivePlatform(btn.dataset.platform);
    });
  }

  function bindPreview() {
    const nameInput = document.getElementById('patron-name');
    const titleInput = document.getElementById('patron-title-input');
    const messageInput = document.getElementById('patron-message');

    nameInput?.addEventListener('input', updatePreview);
    titleInput?.addEventListener('input', updatePreview);
    messageInput?.addEventListener('input', updatePreview);
    els.socialUrl?.addEventListener('input', updatePreview);
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
      const res = await fetch(`${API_BASE}/api/patrons/checkout/`, {
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
    bindSocialTabs();
    bindPreview();
    setActivePlatform('x');
    updatePreview();
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
