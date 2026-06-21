(function () {
  let artworks = [];
  let selectedArtwork = null;
  let selectedLicense = null;

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function renderPreview(artwork, size = 'preview') {
    const seed = artwork.entryId.charCodeAt(0) + artwork.entryId.charCodeAt(artwork.entryId.length - 1);
    const icons = ['⚡', '🔥', '🌊', '🌙', '☀️', '🏔️', '⚔️', '🛡️', '🦅', '🐍', '🌿', '💀'];
    const icon = icons[seed % icons.length];
    return `
      <div class="art-preview-bg" style="background: radial-gradient(circle at 30% 30%, ${artwork.color}, transparent 70%);"></div>
      <div class="art-preview-icon">${icon}</div>
      <div class="art-watermark"></div>
      <div class="art-watermark-text">PUNYCODEX</div>
    `;
  }

  function renderCard(artwork) {
    const card = document.createElement('div');
    card.className = 'art-card';
    card.innerHTML = `
      <div class="art-preview">${renderPreview(artwork)}</div>
      <div class="art-info">
        <div class="art-title">${escapeHtml(artwork.title)}</div>
        <div class="art-meta">${escapeHtml(artwork.pantheon)} · ${escapeHtml(artwork.domain)} · by ${escapeHtml(artwork.artist)}</div>
        <div class="art-prices">
          <span class="art-price">Personal ${ArtMarketplaceData.formatPrice(artwork.licenses.personal.priceCents)}</span>
          <span class="art-price">Commercial ${ArtMarketplaceData.formatPrice(artwork.licenses.commercial.priceCents)}</span>
        </div>
      </div>
    `;
    card.addEventListener('click', () => openModal(artwork));
    return card;
  }

  function populatePantheons() {
    const select = el('art-pantheon');
    const pantheons = [...new Set(artworks.map((a) => a.pantheon))].sort();
    pantheons.forEach((p) => {
      const option = document.createElement('option');
      option.value = p;
      option.textContent = p.charAt(0).toUpperCase() + p.slice(1);
      select.appendChild(option);
    });
  }

  function renderGallery() {
    const grid = el('art-grid');
    grid.innerHTML = '';

    const query = (el('art-search').value || '').toLowerCase();
    const pantheon = el('art-pantheon').value;
    const license = el('art-license').value;

    const filtered = artworks.filter((a) => {
      const matchesQuery =
        !query ||
        a.title.toLowerCase().includes(query) ||
        a.pantheon.toLowerCase().includes(query) ||
        a.domain.toLowerCase().includes(query) ||
        a.artist.toLowerCase().includes(query);
      const matchesPantheon = !pantheon || a.pantheon === pantheon;
      const matchesLicense = !license || a.licenses[license];
      return matchesQuery && matchesPantheon && matchesLicense;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<p style="grid-column: 1 / -1; text-align:center; color:#9aa3b2;">No artworks match your filters.</p>';
      return;
    }

    filtered.forEach((artwork) => grid.appendChild(renderCard(artwork)));
  }

  function openModal(artwork) {
    selectedArtwork = artwork;
    selectedLicense = 'personal';
    el('modal-preview').innerHTML = renderPreview(artwork, 'large');
    el('modal-title').textContent = artwork.title;
    el('modal-meta').textContent = `${artwork.pantheon} · ${artwork.domain} · by ${artwork.artist}`;

    const options = el('license-options');
    options.innerHTML = '';
    Object.entries(artwork.licenses).forEach(([key, license]) => {
      const div = document.createElement('div');
      div.className = `license-option ${key === selectedLicense ? 'selected' : ''}`;
      div.innerHTML = `
        <span class="license-name">${escapeHtml(license.label)} License</span>
        <span class="license-price">${ArtMarketplaceData.formatPrice(license.priceCents)}</span>
      `;
      div.addEventListener('click', () => {
        selectedLicense = key;
        Array.from(options.children).forEach((c) => c.classList.remove('selected'));
        div.classList.add('selected');
      });
      options.appendChild(div);
    });

    el('art-modal').style.display = 'flex';
  }

  function closeModal() {
    el('art-modal').style.display = 'none';
    selectedArtwork = null;
    selectedLicense = null;
  }

  function init() {
    artworks = ArtMarketplaceData.generateGallery(60);
    populatePantheons();
    renderGallery();

    el('art-search').addEventListener('input', renderGallery);
    el('art-pantheon').addEventListener('change', renderGallery);
    el('art-license').addEventListener('change', renderGallery);
    el('art-modal-close').addEventListener('click', closeModal);
    el('art-modal-backdrop').addEventListener('click', closeModal);
    el('buy-btn').addEventListener('click', () => {
      if (!selectedArtwork || !selectedLicense) return;
      const price = selectedArtwork.licenses[selectedLicense].priceCents;
      alert(
        `Prototype checkout: ${selectedLicense} license for "${selectedArtwork.title}" — ${ArtMarketplaceData.formatPrice(price)}`
      );
    });
  }

  init();
})();
