/**
 * PuniCodex Authenticity Extension v2 — Popup
 */

import { getAll, DEFAULTS } from '../shared/storage.js';

const elements = {
  input: document.getElementById('check-input'),
  checkBtn: document.getElementById('check-btn'),
  reportBtn: document.getElementById('report-btn'),
  resultPanel: document.getElementById('result-panel'),
  resultVerdict: document.getElementById('result-verdict'),
  resultReason: document.getElementById('result-reason'),
  resultAlternatives: document.getElementById('result-alternatives'),
  currentTabVerdict: document.getElementById('current-tab-verdict'),
  currentTabReason: document.getElementById('current-tab-reason'),
  openOptions: document.getElementById('open-options'),
};

let lastVerdict = null;

function severityClass(verdict) {
  return `verdict-${verdict}`;
}

function renderVerdict(container, verdict) {
  container.className = `verdict-badge ${severityClass(verdict.verdict)}`;
  container.textContent = verdict.label || verdict.verdict;
}

function renderAlternatives(container, alternatives) {
  container.innerHTML = '';
  if (!Array.isArray(alternatives) || alternatives.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';
  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Safe alternatives';
  container.appendChild(title);

  for (const alt of alternatives) {
    const a = document.createElement('a');
    a.href = alt.startsWith('http') ? alt : `https://${alt}`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = alt;
    container.appendChild(a);
  }
}

async function checkManual() {
  const input = elements.input.value.trim();
  if (!input) return;

  elements.checkBtn.disabled = true;
  try {
    const settings = await getAll();
    const base = settings.apiEndpoint || DEFAULTS.apiEndpoint;
    const type = input.includes('://') || input.includes('.') ? 'url' : 'term';
    const url = `${base}/authenticity/check?input=${encodeURIComponent(input)}&type=${type}`;
    const headers = {};
    if (settings.apiKey) {
      headers.Authorization = `Bearer ${settings.apiKey}`;
    }

    const response = await fetch(url, { headers });
    const payload = await response.json();
    const verdict = payload.data !== undefined ? payload.data : payload;
    lastVerdict = { ...verdict, input, type };

    elements.resultPanel.classList.remove('hidden');
    renderVerdict(elements.resultVerdict, verdict);
    elements.resultReason.textContent = verdict.reason || verdict.explanation || '';
    renderAlternatives(elements.resultAlternatives, verdict.safeAlternatives);
    elements.reportBtn.disabled = false;
  } catch (err) {
    lastVerdict = null;
    elements.resultPanel.classList.remove('hidden');
    elements.resultVerdict.className = 'verdict-badge verdict-unknown';
    elements.resultVerdict.textContent = 'Error';
    elements.resultReason.textContent = err.message;
    elements.reportBtn.disabled = true;
  } finally {
    elements.checkBtn.disabled = false;
  }
}

async function reportCurrent() {
  if (!lastVerdict) return;
  elements.reportBtn.disabled = true;
  try {
    await chrome.runtime.sendMessage({
      action: 'report',
      input: lastVerdict.input,
      type: lastVerdict.type,
      comment: 'Reported from extension popup',
    });
    elements.reportBtn.textContent = 'Reported';
  } catch {
    elements.reportBtn.textContent = 'Failed';
  } finally {
    setTimeout(() => {
      elements.reportBtn.textContent = 'Report';
      elements.reportBtn.disabled = false;
    }, 1500);
  }
}

async function loadCurrentTabVerdict() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkCurrentTab' });
    if (!response?.success || !response.verdict) {
      elements.currentTabVerdict.className = 'verdict-badge verdict-unknown';
      elements.currentTabVerdict.textContent = 'Unknown';
      return;
    }
    renderVerdict(elements.currentTabVerdict, response.verdict);
    elements.currentTabReason.textContent =
      response.verdict.reason || response.verdict.explanation || '';
  } catch {
    elements.currentTabVerdict.className = 'verdict-badge verdict-unknown';
    elements.currentTabVerdict.textContent = 'Offline';
  }
}

elements.checkBtn.addEventListener('click', checkManual);
elements.input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') checkManual();
});
elements.reportBtn.addEventListener('click', reportCurrent);
elements.openOptions.addEventListener('click', (e) => {
  e.preventDefault();
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  }
});

loadCurrentTabVerdict();
