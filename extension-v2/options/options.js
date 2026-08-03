/**
 * PuniCodex Authenticity Extension v2 — Options page
 */

import { DEFAULTS, getAll, reset, set } from '../shared/storage.js';

const fields = {
  enabled: document.getElementById('enabled'),
  warnings: document.getElementById('warnings'),
  apiEndpoint: document.getElementById('api-endpoint'),
  apiKey: document.getElementById('api-key'),
  uiTheme: document.getElementById('ui-theme'),
  locale: document.getElementById('locale'),
  defaultAction: document.getElementById('default-action'),
  actionCritical: document.getElementById('action-critical'),
  actionHigh: document.getElementById('action-high'),
  actionMedium: document.getElementById('action-medium'),
  actionLow: document.getElementById('action-low'),
  actionNone: document.getElementById('action-none'),
  allowlist: document.getElementById('allowlist'),
  blocklist: document.getElementById('blocklist'),
};

const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const statusEl = document.getElementById('status');

function parseList(textarea) {
  return textarea.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function renderList(values) {
  return Array.isArray(values) ? values.join('\n') : '';
}

async function loadOptions() {
  const settings = await getAll();
  fields.enabled.checked = settings.enabled !== false;
  fields.warnings.checked = settings.warnings !== false;
  fields.apiEndpoint.value = settings.apiEndpoint || DEFAULTS.apiEndpoint;
  fields.apiKey.value = settings.apiKey || '';
  fields.uiTheme.value = settings.uiTheme || DEFAULTS.uiTheme || 'inline';
  fields.locale.value = settings.locale || DEFAULTS.locale || 'en';
  fields.defaultAction.value = settings.defaultAction || DEFAULTS.defaultAction;
  fields.actionCritical.value =
    settings.severityActions?.critical || DEFAULTS.severityActions.critical;
  fields.actionHigh.value = settings.severityActions?.high || DEFAULTS.severityActions.high;
  fields.actionMedium.value = settings.severityActions?.medium || DEFAULTS.severityActions.medium;
  fields.actionLow.value = settings.severityActions?.low || DEFAULTS.severityActions.low;
  fields.actionNone.value = settings.severityActions?.none || DEFAULTS.severityActions.none;
  fields.allowlist.value = renderList(settings.allowlist);
  fields.blocklist.value = renderList(settings.blocklist);
}

async function saveOptions() {
  await set('enabled', fields.enabled.checked);
  await set('warnings', fields.warnings.checked);
  await set('apiEndpoint', fields.apiEndpoint.value.trim() || DEFAULTS.apiEndpoint);
  await set('apiKey', fields.apiKey.value.trim());
  await set('uiTheme', fields.uiTheme.value);
  await set('locale', fields.locale.value);
  await set('defaultAction', fields.defaultAction.value);
  await set('severityActions', {
    critical: fields.actionCritical.value,
    high: fields.actionHigh.value,
    medium: fields.actionMedium.value,
    low: fields.actionLow.value,
    none: fields.actionNone.value,
  });
  await set('allowlist', parseList(fields.allowlist));
  await set('blocklist', parseList(fields.blocklist));

  statusEl.textContent = 'Saved';
  statusEl.classList.add('saved');
  setTimeout(() => {
    statusEl.textContent = '';
    statusEl.classList.remove('saved');
  }, 2000);
}

async function resetOptions() {
  await reset();
  await loadOptions();
  statusEl.textContent = 'Defaults restored';
  setTimeout(() => {
    statusEl.textContent = '';
  }, 2000);
}

saveBtn.addEventListener('click', saveOptions);
resetBtn.addEventListener('click', resetOptions);

loadOptions();
