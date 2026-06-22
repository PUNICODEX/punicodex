(function () {
  'use strict';

  const input = document.getElementById('check-input');
  const typeSelect = document.getElementById('check-type');
  const checkBtn = document.getElementById('check-btn');
  const resultArea = document.getElementById('result-area');
  const badge = document.getElementById('verdict-badge');
  const severityEl = document.getElementById('verdict-severity');
  const labelEl = document.getElementById('verdict-label');
  const reasonEl = document.getElementById('verdict-reason');
  const recommendationsEl = document.getElementById('verdict-recommendations');
  const canonicalMatch = document.getElementById('canonical-match');
  const partsArea = document.getElementById('parts-area');
  const partsBody = document.getElementById('parts-body');
  const confusablesList = document.getElementById('confusables-list');
  const reportBtn = document.getElementById('report-btn');
  const reportStatus = document.getElementById('report-status');

  let lastInput = '';
  let lastResult = null;

  async function check(value, type) {
    if (!value) return;
    lastInput = value;
    resultArea.classList.remove('hidden');
    labelEl.textContent = 'Checking…';
    badge.className = 'verdict-badge';
    badge.textContent = '';

    try {
      const res = await fetch(`/api/v2/authenticity/check?input=${encodeURIComponent(value)}&type=${type}`);
      if (!res.ok) throw new Error('API error');
      const payload = await res.json();
      lastResult = payload.data || payload;
      render(lastResult);
    } catch (err) {
      labelEl.textContent = 'Unable to check';
      reasonEl.textContent = err.message || 'The authenticity service is unavailable.';
      recommendationsEl.innerHTML = '';
      canonicalMatch.classList.add('hidden');
      partsArea.classList.add('hidden');
      confusablesList.innerHTML = '';
    }
  }

  function render(data) {
    badge.textContent = (data.verdict || 'unknown').replace(/-/g, ' ');
    badge.className = 'verdict-badge ' + (data.verdict || 'unknown');
    severityEl.textContent = `Severity: ${data.severity || 'unknown'}`;
    labelEl.textContent = data.label || data.verdict || 'Unknown';
    reasonEl.textContent = data.reason || data.explanation || '';

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
  }

  async function report() {
    if (!lastInput || !lastResult) return;
    reportStatus.textContent = 'Reporting…';
    try {
      const res = await fetch('/api/v2/authenticity/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: lastInput, type: typeSelect.value }),
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

  document.querySelectorAll('.example-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      input.value = chip.dataset.value;
      typeSelect.value = chip.dataset.type;
      check(input.value, typeSelect.value);
    });
  });
})();
