/**
 * PÚNYCODEX Authenticity Extension v2 — Background service worker
 */

import { getAll, DEFAULTS } from '../shared/storage.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

function isCheckableUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getApiUrl(settings, url) {
  const base = settings.apiEndpoint || DEFAULTS.apiEndpoint;
  return `${base}/authenticity/check?input=${encodeURIComponent(url)}&type=url`;
}

function buildInterstitialUrl(tabUrl, verdict) {
  const base = 'https://punycodex.com/interstitial.html';
  const params = new URLSearchParams();
  params.set('url', tabUrl);
  params.set('verdict', verdict.verdict || '');
  params.set('severity', verdict.severity || '');
  params.set('reason', verdict.reason || verdict.explanation || '');
  params.set('target', verdict.targetIdentity ? verdict.targetIdentity.name : '');
  if (Array.isArray(verdict.safeAlternatives)) {
    params.set('alternatives', verdict.safeAlternatives.join(','));
  }
  return `${base}?${params.toString()}`;
}

function decideActionFromSettings(settings, verdict) {
  const severity = verdict.severity || 'none';
  const actions = settings.severityActions || DEFAULTS.severityActions;
  return actions[severity] || settings.defaultAction || DEFAULTS.defaultAction;
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

  const response = await fetch(apiUrl, { method: 'GET', headers, cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  const payload = await response.json();
  const verdict = payload.data !== undefined ? payload.data : payload;
  cache.set(url, { verdict, ts: now });
  return verdict;
}

function handleTabUpdate(tabId, changeInfo, tab) {
  if (changeInfo.status !== 'complete' || !tab.url || !isCheckableUrl(tab.url)) {
    return;
  }

  checkUrl(tab.url)
    .then(async (verdict) => {
      if (!verdict) return;
      const settings = await getAll();
      const action = decideActionFromSettings(settings, verdict);
      const severity = verdict.severity || 'none';

      if ((severity === 'high' || severity === 'critical') && action === 'block') {
        chrome.tabs.update(tabId, { url: buildInterstitialUrl(tab.url, verdict) });
      } else if ((severity === 'high' || severity === 'critical') && action === 'warn') {
        chrome.tabs.sendMessage(tabId, { action: 'showBanner', verdict }).catch(() => {});
      }
    })
    .catch(() => {});
}

function handleMessage(request, _sender, sendResponse) {
  if (request.action === 'checkLink') {
    checkUrl(request.url)
      .then((verdict) => sendResponse({ success: true, verdict }))
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
        sendResponse({ success: true, verdict, url: tab.url });
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
  const base = settings.apiEndpoint || DEFAULTS.apiEndpoint;
  const url = `${base}/authenticity/report`;
  const headers = { 'Content-Type': 'application/json' };
  if (settings.apiKey) {
    headers.Authorization = `Bearer ${settings.apiKey}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ input, type, comment: comment || '' }),
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
  isCheckableUrl,
  getApiUrl,
  buildInterstitialUrl,
  decideActionFromSettings,
  checkUrl,
  handleTabUpdate,
  handleMessage,
};
