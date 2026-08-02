/**
 * PuniCodex Authenticity Extension v2 — Background service worker
 */

import { evaluatePolicy, normalizePolicy } from '../shared/policy.js';
import { DEFAULTS, getAll } from '../shared/storage.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const cache = new Map();

function isCheckableUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getApiBase(settings) {
  return String(settings.apiEndpoint || DEFAULTS.apiEndpoint).replace(/\/+$/, '');
}

function getApiUrl(settings, url) {
  return `${getApiBase(settings)}/authenticity/check?input=${encodeURIComponent(url)}&type=url`;
}

function buildInterstitialUrl(tabUrl, verdict, settings) {
  const base = settings.interstitialUrl || 'https://punicodex.com/interstitial.html';
  const params = new URLSearchParams();
  params.set('url', tabUrl);
  params.set('verdict', verdict.verdict || '');
  params.set('severity', verdict.severity || '');
  params.set('reason', verdict.reason || verdict.explanation || '');
  params.set('target', verdict.targetIdentity ? verdict.targetIdentity.name : '');
  params.set('identity', verdict.identityId || '');
  params.set('locale', settings.locale || 'en');
  if (Array.isArray(verdict.safeAlternatives)) {
    params.set('alternatives', verdict.safeAlternatives.join(','));
  }
  return `${base}?${params.toString()}`;
}

function decideActionFromSettings(settings, verdict) {
  const policy = normalizePolicy({
    defaultAction: settings.defaultAction,
    severityActions: settings.severityActions,
    allowlist: settings.allowlist,
    blocklist: settings.blocklist,
    uiTheme: settings.uiTheme,
  });
  return evaluatePolicy(verdict, { policy });
}

async function checkUrl(url) {
  const now = Date.now();
  const cached = cache.get(url);
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return cached.verdict;
  }

  const settings = await getAll();
  if (settings.enabled === false) {
    return null;
  }

  const apiUrl = getApiUrl(settings, url);
  const headers = {};
  if (settings.apiKey) {
    headers.Authorization = `Bearer ${settings.apiKey}`;
  }

  // Time out so a hung API fails open (navigation/check proceeds) instead of
  // leaving the request pending forever; all callers treat a throw as fail-open.
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  const payload = await response.json();
  const verdict = payload.data !== undefined ? payload.data : payload;
  cache.set(url, { verdict, ts: now });
  return verdict;
}

// Trigger at 'loading' (navigation start) rather than 'complete': a block
// verdict redirects to the interstitial BEFORE the flagged page's scripts
// execute. MV3 cannot suspend a navigation for an async verdict, so this is
// the earliest enforceable point; cached verdicts block near-instantly.
const pendingTabChecks = new Set();
chrome.tabs.onRemoved?.addListener?.((tabId) => pendingTabChecks.delete(tabId));

function handleTabUpdate(tabId, changeInfo, tab) {
  if (changeInfo.status !== 'loading' || !tab.url || !isCheckableUrl(tab.url)) {
    return;
  }
  if (pendingTabChecks.has(tabId)) return;
  pendingTabChecks.add(tabId);

  checkUrl(tab.url)
    .then(async (verdict) => {
      if (!verdict) return;
      const settings = await getAll();
      const evaluation = decideActionFromSettings(settings, { ...verdict, input: tab.url });
      const uiTheme = evaluation.uiTheme || settings.uiTheme || 'inline';

      if (evaluation.action === 'block') {
        chrome.tabs.update(tabId, { url: buildInterstitialUrl(tab.url, verdict, settings) });
        return;
      }

      if (evaluation.action === 'warn') {
        if (uiTheme === 'interstitial') {
          chrome.tabs.update(tabId, { url: buildInterstitialUrl(tab.url, verdict, settings) });
        } else {
          chrome.tabs
            .sendMessage(tabId, { action: 'showBanner', verdict, uiTheme })
            .catch(() => {});
        }
      }
    })
    .catch(() => {})
    .finally(() => pendingTabChecks.delete(tabId));
}

function handleMessage(request, _sender, sendResponse) {
  if (request.action === 'checkLink') {
    checkUrl(request.url)
      .then(async (verdict) => {
        const settings = await getAll();
        const evaluation = decideActionFromSettings(settings, { ...verdict, input: request.url });
        sendResponse({ success: true, verdict, action: evaluation });
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'checkCurrentTab') {
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(async ([tab]) => {
        if (!tab?.url || !isCheckableUrl(tab.url)) {
          return sendResponse({ success: false, error: 'No checkable tab' });
        }
        const verdict = await checkUrl(tab.url);
        const settings = await getAll();
        const evaluation = decideActionFromSettings(settings, { ...verdict, input: tab.url });
        sendResponse({ success: true, verdict, url: tab.url, action: evaluation });
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'report') {
    reportVerdict(request)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  return false;
}

async function reportVerdict({ input, type, comment }) {
  const settings = await getAll();
  const url = `${getApiBase(settings)}/authenticity/report`;
  const headers = { 'Content-Type': 'application/json' };
  if (settings.apiKey) {
    headers.Authorization = `Bearer ${settings.apiKey}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ input, type, comment: comment || '' }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    throw new Error(payload.error || payload.message || `API error ${response.status}`);
  }

  return payload.data !== undefined ? payload.data : payload;
}

chrome.tabs.onUpdated.addListener(handleTabUpdate);
chrome.runtime.onMessage.addListener(handleMessage);

export {
  buildInterstitialUrl,
  checkUrl,
  decideActionFromSettings,
  getApiBase,
  getApiUrl,
  handleMessage,
  handleTabUpdate,
  isCheckableUrl,
};
