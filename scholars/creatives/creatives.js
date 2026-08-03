(function () {
  const apiBase = '/api/v1/';
  const container = document.getElementById('app');
  let currentUser = null;
  let currentDashboard = null;

  function getSessionId() {
    return localStorage.getItem('scholars_session') || '';
  }

  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]
    );
  }

  function formatCents(cents) {
    const value = Number(cents) || 0;
    return `$${(value / 100).toFixed(2)}`;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  async function api(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(getSessionId() ? { 'x-scholars-session': getSessionId() } : {}),
      ...(options.headers || {}),
    };
    const res = await fetch(apiBase + path, {
      credentials: 'same-origin',
      ...options,
      headers,
    });
    const data = await res.json().catch(() => ({ success: false, error: 'Invalid response' }));
    return { ok: res.ok, status: res.status, data };
  }

  function renderLoginPrompt() {
    container.innerHTML = `
      <div class="cre-login-box">
        <h2>Creator Access Required</h2>
        <p>Sign in with your student email and password to upload and manage creative assets.</p>
        <form class="login-form" id="login-form">
          <div class="cre-field">
            <label for="login-email">Email</label>
            <input type="email" id="login-email" placeholder="student@university.edu" required>
          </div>
          <div class="cre-field">
            <label for="login-password">Password</label>
            <input type="password" id="login-password" placeholder="••••••••" required>
          </div>
          <button type="submit" class="cre-btn primary">Sign In</button>
        </form>
        <div class="cre-message" id="login-message"></div>
      </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const msg = document.getElementById('login-message');
      msg.textContent = '';
      msg.className = 'cre-message';

      const { ok, data } = await api('/scholars/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (ok && data?.data?.token) {
        localStorage.setItem('scholars_session', data.data.token);
        window.location.reload();
      } else {
        msg.textContent = data?.error || 'Sign in failed.';
        msg.className = 'cre-message error';
      }
    });
  }

  function renderToolbar() {
    return `
      <div class="cre-toolbar">
        <div class="cre-toolbar-info">
          Signed in as <strong>${escapeHtml(currentUser.email)}</strong>
        </div>
        <div class="cre-actions">
          <a href="/creatives/index.html" class="cre-btn">Marketplace</a>
          <button class="cre-btn" id="logout-btn">Sign out</button>
        </div>
      </div>
    `;
  }

  function renderDepartmentOptions(departments) {
    if (!departments || departments.length === 0) {
      return '<option value="">No departments configured</option>';
    }
    return departments
      .map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d.replace(/_/g, ' '))}</option>`)
      .join('');
  }

  function renderUploadForm(departments = []) {
    return `
      <h2 class="cre-section-title">Upload New Work</h2>
      <div class="cre-card">
        <form id="upload-form">
          <div class="cre-form-grid">
            <div class="cre-field">
              <label for="asset-title">Title</label>
              <input type="text" id="asset-title" placeholder="e.g., Olympian Thunder Pattern" required maxlength="200">
            </div>
            <div class="cre-field">
              <label for="asset-department">Department</label>
              <select id="asset-department" required>
                <option value="">Select department</option>
                ${renderDepartmentOptions(departments)}
              </select>
            </div>
            <div class="cre-field">
              <label for="asset-price">Price (USD)</label>
              <input type="number" id="asset-price" min="0" step="0.01" placeholder="0.00" required>
            </div>
            <div class="cre-field">
              <label for="asset-inspiration">Inspiration Entry ID <span style="color:var(--cre-white-dim)">(optional)</span></label>
              <input type="text" id="asset-inspiration" placeholder="e.g., zeus">
            </div>
          </div>
          <div class="cre-field">
            <label for="asset-description">Description</label>
            <textarea id="asset-description" placeholder="Describe the concept, medium, and intended use…" required maxlength="2000"></textarea>
          </div>
          <div class="cre-dropzone" id="asset-dropzone">
            <input type="file" id="asset-file" accept="image/*" required>
            <p>Click or drag an image here to upload</p>
            <p class="cre-asset-meta">PNG, JPG, or WebP. Max 5 MB.</p>
            <img id="asset-preview" class="cre-preview" hidden alt="Preview">
          </div>
          <div class="cre-consent">
            <label class="cre-consent-label" for="asset-merch-consent">
              <input type="checkbox" id="asset-merch-consent">
              <span>
                <strong>List this work as PuniCodex merch.</strong> If approved, your work may be
                printed on merchandise (posters first) and sold in the PuniCodex Store, credited as
                &ldquo;Created by you &middot; your university&rdquo;. You earn
                <strong>50% of the net margin</strong> on every sale (sale price minus print cost
                and payment fees &mdash; about a quarter of the retail price). You can withdraw any
                work at any time from your asset list below.
              </span>
            </label>
          </div>
          <button type="submit" class="cre-btn primary" id="upload-btn">Submit for Review</button>
          <div class="cre-message" id="upload-message"></div>
        </form>
      </div>
    `;
  }

  function renderAssetList() {
    const assets = currentDashboard?.assets || [];
    if (!assets.length) {
      return `
        <h2 class="cre-section-title">Your Assets</h2>
        <div class="cre-empty">No assets yet. Upload your first work above.</div>
      `;
    }

    const cards = assets
      .map((a) => {
        const thumb = a.thumbnail_path ? escapeHtml(a.thumbnail_path) : '';
        const thumbWebp = a.thumbnail_webp_path ? escapeHtml(a.thumbnail_webp_path) : '';
        const thumbImg = thumb
          ? `<img src="${thumb}" alt="" class="cre-asset-thumb" loading="lazy">`
          : '';
        return `
        <div class="cre-asset-card" data-asset-id="${a.id}">
          ${thumb ? (thumbWebp ? `<picture><source type="image/webp" srcset="${thumbWebp}">${thumbImg}</picture>` : thumbImg) : '<div class="cre-asset-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--cre-white-dim);">—</div>'}
          <div class="cre-asset-body">
            <div class="cre-asset-title">${escapeHtml(a.title)}</div>
            <div class="cre-asset-meta">${escapeHtml(a.department || '—')} · ${formatCents(a.price_cents)}</div>
            <div class="cre-asset-meta">${formatDate(a.created_at)}</div>
            <span class="cre-status ${a.status}">${escapeHtml(a.status.replace('_', ' '))}</span>
            ${a.merch_consent ? '<span class="cre-status approved">merch listed</span>' : ''}
            ${a.status === 'pending_review' ? `<div style="margin-top:0.75rem;"><button class="cre-btn danger" data-action="delist" data-id="${a.id}">Delist</button></div>` : ''}
            <div style="margin-top:0.75rem;">
              ${
                a.merch_consent
                  ? `<button class="cre-btn danger" data-action="merch-withdraw" data-id="${a.id}">Withdraw from merch</button>`
                  : `<button class="cre-btn" data-action="merch-optin" data-id="${a.id}">List as merch</button>`
              }
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    return `
      <h2 class="cre-section-title">Your Assets</h2>
      <div class="cre-asset-grid">${cards}</div>
    `;
  }

  function renderReviews(reviews) {
    if (!reviews || reviews.length === 0) return '';
    const rows = reviews
      .map((r) => {
        const decisionClass =
          r.decision === 'approved'
            ? 'approved'
            : r.decision === 'rejected'
              ? 'disabled'
              : 'pending';
        return `
        <div class="cre-review-card">
          <div class="cre-review-header">
            <span class="cre-review-title">${escapeHtml(r.asset_title)}</span>
            <span class="cre-status ${decisionClass}">${escapeHtml(r.decision.replace('_', ' '))}</span>
          </div>
          <p class="cre-review-comment">${escapeHtml(r.comment || 'No comment provided.')}</p>
          <div class="cre-asset-meta">Reviewer: ${escapeHtml(r.reviewer_name || '—')} · ${formatDate(r.reviewed_at)}</div>
        </div>
      `;
      })
      .join('');

    return `
      <h2 class="cre-section-title">Reviewer Feedback</h2>
      <div class="cre-review-list">${rows}</div>
    `;
  }

  function renderPayouts(payouts, summary) {
    if (!payouts || payouts.length === 0) {
      return '';
    }
    const rows = payouts
      .map(
        (p) => `
      <div class="cre-payout-row">
        <span class="cre-payout-amount">${formatCents(p.amount_cents)}</span>
        <span class="cre-status ${p.status}">${escapeHtml(p.status)}</span>
        <span class="cre-asset-meta">${formatDate(p.created_at)}</span>
      </div>
    `
      )
      .join('');

    return `
      <h2 class="cre-section-title">Payouts</h2>
      <div class="cre-card">
        <div class="cre-payout-summary">
          <div>
            <div class="cre-payout-label">Total Earnings</div>
            <div class="cre-payout-value">${formatCents(summary.totalEarningsCents)}</div>
          </div>
          <div>
            <div class="cre-payout-label">Pending</div>
            <div class="cre-payout-value">${formatCents(summary.pendingEarningsCents)}</div>
          </div>
        </div>
        <div class="cre-payout-list">${rows}</div>
      </div>
    `;
  }

  function renderAnalytics(analytics) {
    if (!analytics) return '';
    return `
      <h2 class="cre-section-title">Analytics</h2>
      <div class="cre-card">
        <div class="cre-payout-summary">
          <div>
            <div class="cre-payout-label">Views (30d)</div>
            <div class="cre-payout-value">${Number(analytics.views).toLocaleString()}</div>
          </div>
          <div>
            <div class="cre-payout-label">Purchases (30d)</div>
            <div class="cre-payout-value">${Number(analytics.purchases).toLocaleString()}</div>
          </div>
          <div>
            <div class="cre-payout-label">Revenue (30d)</div>
            <div class="cre-payout-value">${formatCents(analytics.revenueCents)}</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderMerch(merch) {
    if (!merch) return '';
    const products = merch.products || [];
    const rows = products
      .filter((p) => p.orders > 0 || p.status === 'live')
      .map(
        (p) => `
      <div class="cre-payout-row">
        <span class="cre-payout-amount">${formatCents(p.creator_share_cents)}</span>
        <span class="cre-status ${p.status}">${escapeHtml(p.status)}</span>
        <span class="cre-asset-meta">${escapeHtml(p.title)} · ${Number(p.orders)} sale${Number(p.orders) === 1 ? '' : 's'}</span>
      </div>
    `
      )
      .join('');

    return `
      <h2 class="cre-section-title">Merch Earnings</h2>
      <div class="cre-card">
        <div class="cre-payout-summary">
          <div>
            <div class="cre-payout-label">Merch Earnings (50% of net margin)</div>
            <div class="cre-payout-value">${formatCents(merch.totalEarnedCents)}</div>
          </div>
        </div>
        ${rows ? `<div class="cre-payout-list">${rows}</div>` : '<p class="cre-asset-meta">No merch sales yet. Earnings appear here once your listed works sell.</p>'}
      </div>
    `;
  }

  function renderDashboard(
    departments = [],
    reviews = [],
    payouts = [],
    analytics = [],
    merch = null
  ) {
    const summary = currentDashboard || { totalEarningsCents: 0, pendingEarningsCents: 0 };
    container.innerHTML = `
      ${renderToolbar()}
      ${renderUploadForm(departments)}
      ${renderAssetList()}
      ${renderReviews(reviews)}
      ${renderPayouts(payouts, summary)}
      ${renderMerch(merch)}
      ${renderAnalytics(analytics)}
    `;

    document.getElementById('logout-btn').addEventListener('click', () => {
      localStorage.removeItem('scholars_session');
      window.location.reload();
    });

    bindUploadForm();
    bindAssetActions();
  }

  function bindUploadForm() {
    const form = document.getElementById('upload-form');
    const dropzone = document.getElementById('asset-dropzone');
    const fileInput = document.getElementById('asset-file');
    const preview = document.getElementById('asset-preview');

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        showPreview(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) showPreview(fileInput.files[0]);
    });

    function showPreview(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.src = e.target.result;
        preview.hidden = false;
      };
      reader.readAsDataURL(file);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('upload-btn');
      const msg = document.getElementById('upload-message');
      btn.disabled = true;
      msg.textContent = '';
      msg.className = 'cre-message';

      const file = fileInput.files[0];
      if (!file) {
        msg.textContent = 'Please select an image.';
        msg.className = 'cre-message error';
        btn.disabled = false;
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        msg.textContent = 'Image must be under 5 MB.';
        msg.className = 'cre-message error';
        btn.disabled = false;
        return;
      }

      const reader = new FileReader();
      reader.onload = async (ev) => {
        const imageBase64 = ev.target.result;
        const body = {
          title: document.getElementById('asset-title').value.trim(),
          description: document.getElementById('asset-description').value.trim(),
          department: document.getElementById('asset-department').value,
          priceCents: Math.round(Number(document.getElementById('asset-price').value) * 100),
          inspirationEntryId:
            document.getElementById('asset-inspiration').value.trim() || undefined,
          image: imageBase64,
          merchConsent: document.getElementById('asset-merch-consent').checked,
        };

        const { ok, data } = await api('/creatives', {
          method: 'POST',
          body: JSON.stringify(body),
        });

        if (ok && data?.success) {
          msg.textContent = 'Asset submitted for review.';
          msg.className = 'cre-message success';
          form.reset();
          preview.hidden = true;
          await loadDashboard();
        } else {
          msg.textContent = data?.error || 'Upload failed.';
          msg.className = 'cre-message error';
        }
        btn.disabled = false;
      };
      reader.onerror = () => {
        msg.textContent = 'Failed to read image.';
        msg.className = 'cre-message error';
        btn.disabled = false;
      };
      reader.readAsDataURL(file);
    });
  }

  function bindAssetActions() {
    // The container is persistent across renders — bind once, never per render,
    // or a single click fires once per accumulated listener.
    if (container.dataset.assetActionsBound) return;
    container.dataset.assetActionsBound = '1';
    container.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = Number(btn.dataset.id);

      if (action === 'delist') {
        if (!confirm('Delist this asset? It will no longer be available for purchase.')) return;
        btn.disabled = true;
        const { ok, data } = await api(`/creatives/${id}`, { method: 'DELETE' });
        if (ok && data?.success) {
          await loadDashboard();
        } else {
          alert(data?.error || 'Delist failed.');
          btn.disabled = false;
        }
        return;
      }

      if (action === 'merch-withdraw') {
        if (!confirm('Withdraw this work from the PuniCodex Store merch catalog?')) return;
        btn.disabled = true;
        const { ok, data } = await api(`/creatives/${id}/merch/withdraw`, { method: 'POST' });
        if (ok && data?.success) {
          await loadDashboard();
        } else {
          alert(data?.error || 'Withdrawal failed.');
          btn.disabled = false;
        }
        return;
      }

      if (action === 'merch-optin') {
        btn.disabled = true;
        const { ok, data } = await api(`/creatives/${id}/merch/opt-in`, { method: 'POST' });
        if (ok && data?.success) {
          await loadDashboard();
        } else {
          alert(data?.error || 'Merch opt-in failed.');
          btn.disabled = false;
        }
      }
    });
  }

  async function loadDashboard() {
    const sessionRes = await api('/scholars/auth/session');
    const user = sessionRes.data?.data?.user;
    if (!sessionRes.ok || !user) {
      localStorage.removeItem('scholars_session');
      renderLoginPrompt();
      return;
    }
    currentUser = user;

    const [dashboardRes, departmentsRes, reviewsRes, payoutsRes, analyticsRes, merchRes] =
      await Promise.all([
        api('/creatives/dashboard'),
        api('/creatives/departments'),
        api('/creatives/reviews'),
        api('/creatives/payouts'),
        api('/creatives/analytics/creator'),
        api('/creatives/merch/earnings'),
      ]);
    currentDashboard = dashboardRes.ok ? dashboardRes.data.data : { assets: [] };
    const departments = departmentsRes.ok ? departmentsRes.data.data.departments : [];
    const reviews = reviewsRes.ok ? reviewsRes.data.data.reviews : [];
    const payouts = payoutsRes.ok ? payoutsRes.data.data.payouts : [];
    const analytics = analyticsRes.ok ? analyticsRes.data.data : null;
    const merch = merchRes.ok ? merchRes.data.data : null;

    renderDashboard(departments, reviews, payouts, analytics, merch);
  }

  function bindGlobalNav() {
    const toggle = document.getElementById('global-toggle');
    const links = document.getElementById('global-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => {
        links.classList.toggle('open');
      });
    }
  }

  async function init() {
    bindGlobalNav();
    if (!getSessionId()) {
      renderLoginPrompt();
      return;
    }
    await loadDashboard();
  }

  init();
})();
