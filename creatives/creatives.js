(function () {
  const API_BASE = '/api/v1/creatives';
  const grid = document.getElementById('creatives-grid');
  const statusEl = document.getElementById('creatives-status');
  const emptyEl = document.getElementById('creatives-empty');
  const searchInput = document.getElementById('search-input');
  const departmentFilter = document.getElementById('department-filter');
  const tagFilter = document.getElementById('tag-filter');
  const sortFilter = document.getElementById('sort-filter');
  const loadMoreBtn = document.getElementById('load-more');
  const modal = document.getElementById('creatives-modal');
  const modalBackdrop = document.getElementById('creatives-modal-backdrop');
  const modalClose = document.getElementById('creatives-modal-close');
  const modalBody = document.getElementById('creatives-modal-body');
  const globalToggle = document.getElementById('global-toggle');
  const globalLinks = document.getElementById('global-links');

  let state = {
    assets: [],
    offset: 0,
    limit: 24,
    hasMore: false,
    loading: false,
    filters: {
      q: '',
      department: '',
      tag: '',
    },
    sort: 'newest',
  };

  function formatPrice(cents) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function formatDepartment(value) {
    return value.replace(/_/g, ' ');
  }

  function showStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.classList.toggle('error', !!isError);
  }

  function clearStatus() {
    statusEl.textContent = '';
    statusEl.classList.remove('error');
  }

  async function fetchAssets({ append = false } = {}) {
    if (state.loading) return;
    state.loading = true;
    showStatus('Loading…');

    const params = new URLSearchParams();
    params.set('limit', String(state.limit));
    params.set('offset', String(append ? state.offset : 0));
    if (state.filters.q) params.set('q', state.filters.q);
    if (state.filters.department) params.set('department', state.filters.department);
    if (state.filters.tag) params.set('tag', state.filters.tag);

    try {
      const res = await fetch(`${API_BASE}?${params.toString()}`);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to load assets');
      }

      const assets = json.data.assets || [];
      state.hasMore = assets.length === state.limit;
      state.offset = (append ? state.offset : 0) + assets.length;

      if (append) {
        state.assets = state.assets.concat(assets);
      } else {
        state.assets = assets;
      }

      applySort();
      render();
    } catch (err) {
      showStatus(err.message, true);
    } finally {
      state.loading = false;
    }
  }

  function applySort() {
    if (state.sort === 'price-asc') {
      state.assets.sort((a, b) => a.priceCents - b.priceCents);
    } else if (state.sort === 'price-desc') {
      state.assets.sort((a, b) => b.priceCents - a.priceCents);
    } else {
      state.assets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }

  function render() {
    clearStatus();
    grid.innerHTML = '';

    if (state.assets.length === 0) {
      emptyEl.hidden = false;
      loadMoreBtn.parentElement.hidden = true;
      return;
    }

    emptyEl.hidden = true;
    loadMoreBtn.parentElement.hidden = !state.hasMore;

    for (const asset of state.assets) {
      const card = document.createElement('article');
      card.className = 'creatives-card';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `View details for ${asset.title}`);
      card.innerHTML = `
        <div class="creatives-card-image">
          <img src="${escapeHtml(asset.thumbnailPath || asset.previewPath)}" alt="${escapeHtml(asset.title)}" loading="lazy">
        </div>
        <div class="creatives-card-body">
          <h3 class="creatives-card-title">${escapeHtml(asset.title)}</h3>
          <div class="creatives-card-meta">
            <span class="creatives-card-department">${escapeHtml(formatDepartment(asset.department))}</span>
            <span class="creatives-card-price">${formatPrice(asset.priceCents)}</span>
          </div>
          <div class="creatives-card-tags">
            ${(asset.metadata?.tags || []).slice(0, 4).map((tag) => `<span class="creatives-card-tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
        </div>
      `;
      card.addEventListener('click', () => openModal(asset));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(asset);
        }
      });
      grid.appendChild(card);
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function openModal(asset) {
    modalBody.innerHTML = `
      <img class="creatives-modal-image" src="${escapeHtml(asset.previewPath)}" alt="${escapeHtml(asset.title)}">
      <h2 class="creatives-modal-title" id="modal-title">${escapeHtml(asset.title)}</h2>
      <div class="creatives-modal-meta">
        <span>${escapeHtml(asset.creatorName || 'Student creator')}</span>
        <span>${escapeHtml(asset.institutionName || '')}</span>
        <span>${escapeHtml(formatDepartment(asset.department))}</span>
      </div>
      <p class="creatives-modal-description">${escapeHtml(asset.description)}</p>
      <div class="creatives-modal-price">${formatPrice(asset.priceCents)}</div>
      <form class="creatives-modal-form" id="purchase-form">
        <input type="email" id="purchase-email" placeholder="Your email address" required>
        <button type="submit" class="creatives-btn primary">License This Asset</button>
      </form>
      <p class="creatives-modal-note">
        <strong>Single-use license</strong> for myth-inspired student creative work.
        You will receive a secure download link after payment. Watermarked previews protect the artist's work.
      </p>
      <div id="purchase-message" class="creatives-status" style="margin-top:1rem;"></div>
    `;

    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    const form = document.getElementById('purchase-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('purchase-email').value.trim();
      const messageEl = document.getElementById('purchase-message');
      const submitBtn = form.querySelector('button');

      messageEl.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Preparing checkout…';

      try {
        const res = await fetch(`${API_BASE}/${asset.id}/purchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Checkout failed');
        }
        window.location.href = json.data.checkoutUrl;
      } catch (err) {
        messageEl.textContent = err.message;
        messageEl.classList.add('error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'License This Asset';
      }
    });
  }

  function closeModal() {
    modal.hidden = true;
    modalBody.innerHTML = '';
    document.body.style.overflow = '';
  }

  function updateFilters() {
    state.filters.q = searchInput.value.trim();
    state.filters.department = departmentFilter.value;
    state.filters.tag = tagFilter.value;
    state.sort = sortFilter.value;
    state.offset = 0;
    fetchAssets({ append: false });
  }

  // Event listeners
  searchInput.addEventListener('input', debounce(updateFilters, 300));
  departmentFilter.addEventListener('change', updateFilters);
  tagFilter.addEventListener('change', updateFilters);
  sortFilter.addEventListener('change', () => {
    state.sort = sortFilter.value;
    applySort();
    render();
  });
  loadMoreBtn.addEventListener('click', () => fetchAssets({ append: true }));
  modalBackdrop.addEventListener('click', closeModal);
  modalClose.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  globalToggle.addEventListener('click', () => {
    globalLinks.classList.toggle('open');
  });

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  // Initial load
  fetchAssets({ append: false });
})();
