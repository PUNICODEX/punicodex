(function () {
  'use strict';

  const works = Array.isArray(window.__COMMONS_WORKS__) ? window.__COMMONS_WORKS__ : [];
  if (!works.length) return;
  const byId = new Map(works.filter((work) => work.id).map((work) => [work.id, work]));

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value);
    }
    const field = document.createElement('textarea');
    field.value = value;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    return copied ? Promise.resolve() : Promise.reject(new Error('copy_failed'));
  }

  const dialog = element('dialog', 'commons-viewer');
  dialog.setAttribute('aria-label', 'Artwork details');
  const layout = element('div', 'cv-layout');
  const media = element('div', 'cv-media');
  const image = element('img');
  media.appendChild(image);
  const content = element('div', 'cv-content');
  const close = element('button', 'cv-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close artwork details');
  const kicker = element('p', 'cv-kicker');
  const title = element('h2', 'cv-title');
  title.id = 'cv-title';
  dialog.setAttribute('aria-labelledby', title.id);
  const provenance = element('p', 'cv-provenance');
  const facts = element('dl', 'cv-facts');
  const attribution = element('div', 'cv-attribution');
  const attributionLabel = element('strong', '', 'Attribution');
  const attributionText = element('span');
  attribution.append(attributionLabel, attributionText);
  const actions = element('div', 'cv-actions');
  const download = element('a', 'cv-btn cv-btn-primary', 'Download');
  const share = element('button', 'cv-btn', 'Share');
  share.type = 'button';
  const copy = element('button', 'cv-btn', 'Copy attribution');
  copy.type = 'button';
  actions.append(download, share, copy);
  const promptDetails = element('details', 'cv-prompt');
  const promptSummary = element('summary', '', 'Generation prompt');
  const promptText = element('p');
  promptDetails.append(promptSummary, promptText);
  content.append(close, kicker, title, provenance, facts, attribution, actions, promptDetails);
  layout.append(media, content);
  dialog.appendChild(layout);
  document.body.appendChild(dialog);

  function fact(label, value, href) {
    const row = element('div');
    const term = element('dt', '', label);
    const detail = element('dd');
    if (href) {
      const link = element('a', '', value);
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener';
      detail.appendChild(link);
    } else {
      detail.textContent = value;
    }
    row.append(term, detail);
    facts.appendChild(row);
  }

  function dateLabel(value) {
    if (!value) return 'Not recorded';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
  }

  function viewForWork(work) {
    return work.kind === 'temple' ? 'temple' : 'commons';
  }

  function show(work) {
    image.src = work.src;
    image.alt = work.alt || work.title;
    kicker.textContent = work.kind === 'temple'
      ? 'Temple Gallery · historical collection'
      : `The Commons · ${String(work.family || 'studio').replace(/-/g, ' ')}`;
    title.textContent = work.title;
    provenance.textContent = work.provenance || 'Curated PuniCodex studio artwork.';
    facts.replaceChildren();
    fact('Creator', work.creator || 'PuniCodex Studio');
    fact('License', work.license || 'CC BY 4.0', work.licenseUrl || 'https://creativecommons.org/licenses/by/4.0/');
    fact('Production', work.aiAssisted ? 'AI-assisted · human-curated' : 'Human-created');
    if (work.aiAssisted || work.model) fact('Model', work.model || 'Not recorded');
    if (work.generatedAt) fact('Generated', dateLabel(work.generatedAt));
    if (work.recordedAt) fact('Catalogued', dateLabel(work.recordedAt));
    if (work.sourceUrl) fact('Source', 'View original source', work.sourceUrl);
    if (work.seed !== null && work.seed !== undefined) fact('Seed', String(work.seed));
    attributionText.textContent = work.attribution || `${work.title} by ${work.creator || 'PuniCodex Studio'}, ${work.license || 'CC BY 4.0'}, via ${work.canonicalUrl}`;
    download.href = work.src;
    download.download = work.src.split('/').pop().split('?')[0];
    promptDetails.hidden = !work.prompt;
    promptText.textContent = work.prompt || '';
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
  }

  function openWork(id, updateUrl) {
    const work = byId.get(id);
    if (!work) return;
    show(work);
    if (updateUrl) {
      history.replaceState(null, '', `?view=${viewForWork(work)}&art=${encodeURIComponent(id)}`);
    }
  }

  function cookie(name) {
    const prefix = `${name}=`;
    const part = String(document.cookie || '').split(';').find((value) => value.trim().startsWith(prefix));
    if (!part) return null;
    try {
      return decodeURIComponent(part.trim().slice(prefix.length));
    } catch {
      return null;
    }
  }

  function recordDownload(work) {
    const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
    const csrf = cookie('punicodex_csrf');
    if (csrf) headers['x-csrf-token'] = csrf;
    fetch('/api/account/downloads/', {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify({ assetId: work.id }),
    }).catch(() => {});
  }

  download.addEventListener('click', async (event) => {
    const work = byId.get(new URLSearchParams(location.search).get('art'));
    if (!work) return;
    if (work.kind !== 'temple') recordDownload(work);
    if (work.src.startsWith('/')) return;
    event.preventDefault();
    const label = download.textContent;
    download.textContent = 'Preparing…';
    try {
      const response = await fetch(work.src);
      if (!response.ok) throw new Error('download_failed');
      const url = URL.createObjectURL(await response.blob());
      const anchor = element('a');
      anchor.href = url;
      anchor.download = work.src.split('/').pop().split('?')[0];
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      window.open(work.src, '_blank', 'noopener');
    } finally {
      download.textContent = label;
    }
  });

  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    const params = new URLSearchParams(location.search);
    const work = byId.get(params.get('art'));
    if (params.has('art')) {
      history.replaceState(null, '', `?view=${work ? viewForWork(work) : 'all'}`);
    }
  });
  share.addEventListener('click', async () => {
    const work = byId.get(new URLSearchParams(location.search).get('art'));
    if (!work) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: work.title, text: work.attribution, url: work.canonicalUrl });
      } else {
        await copyText(work.canonicalUrl);
        share.textContent = 'Link copied';
        setTimeout(() => { share.textContent = 'Share'; }, 1600);
      }
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      share.textContent = 'Share unavailable';
      setTimeout(() => { share.textContent = 'Share'; }, 1600);
    }
  });
  copy.addEventListener('click', async () => {
    const work = byId.get(new URLSearchParams(location.search).get('art'));
    if (!work) return;
    try {
      await copyText(work.attribution);
      copy.textContent = 'Attribution copied';
    } catch {
      copy.textContent = 'Copy unavailable';
    }
    setTimeout(() => { copy.textContent = 'Copy attribution'; }, 1600);
  });

  document.querySelectorAll('.art-card[data-kind="commons"][data-art-id], .art-card[data-kind="temple"][data-art-id]').forEach((card) => {
    const id = card.getAttribute('data-art-id');
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `View artwork: ${byId.get(id)?.title || 'Artwork'}`);
    card.addEventListener('click', () => openWork(id, true));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openWork(id, true);
      }
    });
  });

  const initial = new URLSearchParams(location.search).get('art');
  if (initial) openWork(initial, false);
})();
