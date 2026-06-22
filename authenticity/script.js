(function () {
  'use strict';

  const input = document.getElementById('check-input');
  const typeSelect = document.getElementById('check-type');
  const checkBtn = document.getElementById('check-btn');
  const resultArea = document.getElementById('result-area');
  const badge = document.getElementById('verdict-badge');
  const severityEl = document.getElementById('verdict-severity');
  const policyActionEl = document.getElementById('policy-action');
  const tierBadgeEl = document.getElementById('tier-badge');
  const labelEl = document.getElementById('verdict-label');
  const reasonEl = document.getElementById('verdict-reason');
  const recommendationsEl = document.getElementById('verdict-recommendations');
  const canonicalMatch = document.getElementById('canonical-match');
  const partsArea = document.getElementById('parts-area');
  const partsBody = document.getElementById('parts-body');
  const confusablesList = document.getElementById('confusables-list');
  const reportBtn = document.getElementById('report-btn');
  const reportStatus = document.getElementById('report-status');
  const modeCheck = document.getElementById('mode-check');
  const modeUrl = document.getElementById('mode-url');
  const visualDiff = document.getElementById('visual-diff');
  const diffInput = document.getElementById('diff-input');
  const diffCanonical = document.getElementById('diff-canonical');
  const characterMapArea = document.getElementById('character-map-area');
  const characterMap = document.getElementById('character-map');
  const exportJsonBtn = document.getElementById('export-json-btn');
  const exportPdfLink = document.getElementById('export-pdf-link');
  const localeSelect = document.getElementById('locale-select');
  const apiEndpoint = document.body.dataset.apiEndpoint || '/api/v1/authenticity/check';
  const apiBase = apiEndpoint.replace(/\/check$/, '');

  let lastInput = '';
  let lastResult = null;
  let currentMode = 'check';
  let bundle = {};

  const TIER_ICONS = {
    authentic: '✓',
    'verified-variant': '✓',
    styled: 'ℹ',
    uncertain: '?',
    suspicious: '⚠',
    deceptive: '⛔',
    'known-threat': '⛔',
  };

  async function loadBundle(code) {
    try {
      const res = await fetch(`/i18n/authenticity/${code}.json`);
      if (!res.ok) throw new Error('Failed to load bundle');
      bundle = await res.json();
    } catch {
      bundle = {};
    }
    document.documentElement.lang = code;
    document.body.dir = bundle._rtl ? 'rtl' : 'ltr';
  }

  function t(key, fallback) {
    const parts = key.split('.');
    let current = bundle;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return fallback !== undefined ? fallback : key;
      }
    }
    return typeof current === 'string' ? current : fallback !== undefined ? fallback : key;
  }

  function setMode(mode) {
    currentMode = mode;
    modeCheck.classList.toggle('active', mode === 'check');
    modeUrl.classList.toggle('active', mode === 'url');
    if (mode === 'url') {
      typeSelect.value = 'url';
      input.placeholder = 'https://example.com/path';
    } else {
      input.placeholder = 'e.g. apóllōn.com, https://example.com/path, or Ζεύς';
    }
  }

  async function evaluatePolicy(value, type, data) {
    try {
      const res = await fetch('/api/v1/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: value,
          type,
          policy: { uiTheme: 'inline' },
        }),
      });
      if (!res.ok) return null;
      const payload = await res.json();
      return payload.data || payload;
    } catch {
      return null;
    }
  }

  async function check(value, type) {
    if (!value) return;
    lastInput = value;
    resultArea.classList.remove('hidden');
    labelEl.textContent = t('aria.warning', 'Checking…');
    badge.className = 'verdict-badge';
    badge.textContent = '';
    policyActionEl.classList.add('hidden');
    tierBadgeEl.classList.add('hidden');

    try {
      const [checkRes, policyRes] = await Promise.all([
        fetch(`${apiEndpoint}?input=${encodeURIComponent(value)}&type=${type}`),
        evaluatePolicy(value, type),
      ]);
      if (!checkRes.ok) throw new Error('API error');
      const payload = await checkRes.json();
      lastResult = payload.data || payload;
      render(lastResult, policyRes);
    } catch (err) {
      labelEl.textContent = 'Unable to check';
      reasonEl.textContent = err.message || 'The authenticity service is unavailable.';
      recommendationsEl.innerHTML = '';
      canonicalMatch.classList.add('hidden');
      partsArea.classList.add('hidden');
      confusablesList.innerHTML = '';
      visualDiff.classList.add('hidden');
      characterMapArea.classList.add('hidden');
      exportJsonBtn.classList.add('hidden');
      exportPdfLink.classList.add('hidden');
    }
  }

  function renderTierBadge(policyRes) {
    if (!policyRes || !policyRes.tier) return;
    tierBadgeEl.classList.remove('hidden');
    const icon = TIER_ICONS[policyRes.verdict?.verdict] || '⚠';
    tierBadgeEl.textContent = `${icon} ${policyRes.tier.label}`;
    tierBadgeEl.style.color = policyRes.tier.color;
    tierBadgeEl.style.borderColor = policyRes.tier.color;
  }

  function render(data, policyRes) {
    badge.textContent = (data.verdict || 'unknown').replace(/-/g, ' ');
    badge.className = 'verdict-badge ' + (data.verdict || 'unknown');
    severityEl.textContent = `Severity: ${data.severity || 'unknown'}`;
    labelEl.textContent = data.label || data.verdict || 'Unknown';
    reasonEl.textContent = data.reason || data.explanation || '';

    if (policyRes) {
      policyActionEl.classList.remove('hidden');
      policyActionEl.textContent = `Policy: ${policyRes.action}`;
      renderTierBadge(policyRes);
    }

    recommendationsEl.innerHTML = (data.recommendations || [])
      .map((r) => `<li>${escapeHtml(r)}</li>`)
      .join('');

    if (data.canonicalMatch) {
      canonicalMatch.classList.remove('hidden');
      document.getElementById('match-id').textContent = data.canonicalMatch.id || '—';
      document.getElementById('match-ascii').textContent = data.canonicalMatch.ascii || '—';
      document.getElementById('match-unicode').textContent = data.canonicalMatch.unicode || '—';
      document.getElementById('match-pantheon').textContent = data.canonicalMatch.pantheon || '—';
    } else {
      canonicalMatch.classList.add('hidden');
    }

    if (Array.isArray(data.parts) && data.parts.length > 0) {
      partsArea.classList.remove('hidden');
      partsBody.innerHTML = data.parts
        .map(
          (p) => `
        <tr>
          <td>${escapeHtml(p.part)}</td>
          <td>${escapeHtml(p.raw)}</td>
          <td>${escapeHtml(p.verdict)}</td>
          <td>${escapeHtml(p.severity)}</td>
        </tr>
      `
        )
        .join('');
    } else {
      partsArea.classList.add('hidden');
    }

    const confusables = data.analysis?.confusables || [];
    if (confusables.length > 0) {
      confusablesList.innerHTML = confusables
        .map(
          (c) => `
        <div class="confusable-chip">
          <code>${escapeHtml(c.char)}</code> U+${c.codePoint.toString(16).toUpperCase()}
          → ${escapeHtml(c.mappedTo)} (${escapeHtml(c.script)})
        </div>
      `
        )
        .join('');
    } else {
      confusablesList.innerHTML = '<span class="meta-value">No confusable characters detected.</span>';
    }

    if (data.canonicalMatch && data.canonicalMatch.unicode) {
      visualDiff.classList.remove('hidden');
      diffInput.textContent = lastInput;
      diffCanonical.textContent = data.canonicalMatch.unicode;
    } else {
      visualDiff.classList.add('hidden');
    }

    const evidence = data.evidence;
    if (evidence && evidence.characterMap && evidence.characterMap.length > 0) {
      characterMapArea.classList.remove('hidden');
      characterMap.innerHTML = evidence.characterMap
        .map((c) => {
          const riskClass = c.deviationScore >= 0.5 ? 'high-risk' : c.deviationScore >= 0.1 ? 'med-risk' : 'low-risk';
          const title = `Position ${c.position}\nCode point: ${c.codePoint}\nScript: ${c.script}\nConfusable: ${c.confusableMapping || 'none'}\nDeviation: ${c.deviationScore}`;
          return `<span class="char-cell ${riskClass}" title="${escapeHtml(title)}">${escapeHtml(c.char)}</span>`;
        })
        .join('');
    } else {
      characterMapArea.classList.add('hidden');
    }

    if (evidence) {
      exportJsonBtn.classList.remove('hidden');
      const sev = data.severity || data.analysis?.severity || 'none';
      if (sev === 'high' || sev === 'critical') {
        exportPdfLink.classList.remove('hidden');
        exportPdfLink.href = `/api/v1/authenticity/report/${Date.now()}/pdf?input=${encodeURIComponent(lastInput)}&type=${typeSelect.value}`;
      } else {
        exportPdfLink.classList.add('hidden');
      }
    } else {
      exportJsonBtn.classList.add('hidden');
      exportPdfLink.classList.add('hidden');
    }
  }

  function exportJson() {
    if (!lastResult || !lastResult.evidence) return;
    const blob = new Blob([JSON.stringify(lastResult.evidence, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `punycodex-evidence-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function report() {
    if (!lastInput || !lastResult) return;
    reportStatus.textContent = t('cta.report', 'Reporting…');
    try {
      const res = await fetch(`${apiBase}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: lastInput, type: typeSelect.value, result: lastResult }),
      });
      if (!res.ok) throw new Error('Report failed');
      reportStatus.textContent = 'Reported. Thank you.';
    } catch (err) {
      reportStatus.textContent = 'Report failed.';
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  checkBtn.addEventListener('click', () => check(input.value.trim(), typeSelect.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') check(input.value.trim(), typeSelect.value);
  });
  reportBtn.addEventListener('click', report);
  exportJsonBtn.addEventListener('click', exportJson);

  modeCheck.addEventListener('click', () => setMode('check'));
  modeUrl.addEventListener('click', () => setMode('url'));

  localeSelect.addEventListener('change', (e) => {
    loadBundle(e.target.value);
  });

  document.querySelectorAll('.example-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      input.value = chip.dataset.value;
      typeSelect.value = chip.dataset.type;
      check(input.value, typeSelect.value);
    });
  });

  const initialLocale = new URLSearchParams(location.search).get('lang') || 'en';
  localeSelect.value = initialLocale;
  loadBundle(initialLocale);
})();
