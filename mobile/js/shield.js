/**
 * PuniCodex Shield — Mobile PWA v2
 *
 * New "Shield" tab for the mobile app. Checks names, domains, and URLs for
 * homograph and mixed-script attacks, scans the clipboard on open, and keeps
 * a local history of checked inputs.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'punicodex_shield_history';
  const MAX_HISTORY = 50;

  const classifier =
    typeof PUNICODEX_MOBILE_CLASSIFIER !== 'undefined' ? PUNICODEX_MOBILE_CLASSIFIER : null;

  const inputEl = document.getElementById('shield-input');
  const checkBtn = document.getElementById('shield-check-btn');
  const pasteBtn = document.getElementById('shield-paste-btn');
  const resultEl = document.getElementById('shield-result');
  const severityEl = document.getElementById('shield-severity');
  const verdictEl = document.getElementById('shield-verdict');
  const explanationEl = document.getElementById('shield-explanation');
  const recommendationsEl = document.getElementById('shield-recommendations');
  const targetEl = document.getElementById('shield-target');
  const targetNameEl = document.getElementById('shield-target-name');
  const alternativesEl = document.getElementById('shield-alternatives');
  const historyListEl = document.getElementById('history-list');
  const historyEmptyEl = document.getElementById('history-empty');
  const clearHistoryBtn = document.getElementById('clear-history-btn');

  function isClassifierReady() {
    return classifier && typeof classifier.classify === 'function';
  }

  function getHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function setHistory(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
    } catch {
      // Storage may be disabled or full.
    }
  }

  function addToHistory(input, result) {
    const items = getHistory();
    items.unshift({
      input,
      verdict: result.verdict,
      severity: result.severity,
      checkedAt: new Date().toISOString(),
    });
    setHistory(items);
    renderHistory();
  }

  function clearHistory() {
    setHistory([]);
    renderHistory();
  }

  function renderHistory() {
    const items = getHistory();
    historyListEl.innerHTML = '';
    historyEmptyEl.classList.toggle('hidden', items.length > 0);

    for (const item of items) {
      const li = document.createElement('li');
      li.className = `history-item severity-${item.severity}`;
      li.innerHTML = `
        <span class="history-input">${escapeHtml(item.input)}</span>
        <span class="history-verdict">${escapeHtml(item.verdict)}</span>
      `;
      historyListEl.appendChild(li);
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function severityColor(severity) {
    switch (severity) {
      case 'critical':
        return '#ff4d4d';
      case 'high':
        return '#ff9f43';
      case 'medium':
        return '#feca57';
      case 'low':
        return '#54a0ff';
      default:
        return '#7f8c8d';
    }
  }

  function renderResult(result) {
    resultEl.classList.remove('hidden');
    severityEl.textContent = result.severity.toUpperCase();
    severityEl.style.backgroundColor = severityColor(result.severity);
    severityEl.className = `severity-badge severity-${result.severity}`;
    verdictEl.textContent = result.label || result.verdict;
    explanationEl.textContent = result.explanation || '';

    recommendationsEl.innerHTML = '';
    for (const rec of result.recommendations || []) {
      const li = document.createElement('li');
      li.textContent = rec;
      recommendationsEl.appendChild(li);
    }

    if (result.targetIdentity) {
      targetEl.classList.remove('hidden');
      targetNameEl.textContent = result.targetIdentity.name;
    } else {
      targetEl.classList.add('hidden');
    }

    alternativesEl.innerHTML = '';
    for (const alt of result.safeAlternatives || []) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = alt;
      a.textContent = alt;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      li.appendChild(a);
      alternativesEl.appendChild(li);
    }
  }

  function checkInput(rawInput) {
    const input = typeof rawInput === 'string' ? rawInput : inputEl.value;
    if (!input || !isClassifierReady()) {
      return;
    }

    const result = input.includes('://')
      ? classifier.classifyUrl(input)
      : classifier.classify(input);
    renderResult(result);
    addToHistory(input, result);
  }

  async function readClipboard() {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        return text || '';
      }
    } catch {
      // Clipboard permission denied or unavailable.
    }
    return '';
  }

  async function pasteFromClipboard() {
    const text = await readClipboard();
    if (text) {
      inputEl.value = text;
      checkInput(text);
    }
  }

  async function scanClipboardOnOpen() {
    const text = await readClipboard();
    if (!text) {
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const looksLikeUrl = /^https?:\/\//i.test(trimmed) || trimmed.includes('.');
    if (looksLikeUrl) {
      inputEl.value = trimmed;
      checkInput(trimmed);
    }
  }

  function bindEvents() {
    checkBtn.addEventListener('click', () => checkInput());
    inputEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        checkInput();
      }
    });
    pasteBtn.addEventListener('click', pasteFromClipboard);
    clearHistoryBtn.addEventListener('click', clearHistory);
  }

  function init() {
    if (!isClassifierReady()) {
      resultEl.classList.remove('hidden');
      resultEl.textContent = 'Shield classifier failed to load.';
      return;
    }
    bindEvents();
    renderHistory();
    scanClipboardOnOpen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
