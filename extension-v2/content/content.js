/**
 * PÚNYCODEX Authenticity Extension v2 — Content script
 */

const BANNER_STORAGE_KEY = 'punycodex_banner_dismissed';

function isDismissed(url) {
  try {
    const data = JSON.parse(sessionStorage.getItem(BANNER_STORAGE_KEY) || '{}');
    return data[url] === true;
  } catch {
    return false;
  }
}

function markDismissed(url) {
  try {
    const data = JSON.parse(sessionStorage.getItem(BANNER_STORAGE_KEY) || '{}');
    data[url] = true;
    sessionStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function severityClass(severity) {
  if (severity === 'critical' || severity === 'high') return 'punycodex-risk-high';
  if (severity === 'medium') return 'punycodex-risk-medium';
  return 'punycodex-risk-low';
}

function showBanner(verdict) {
  const url = location.href;
  if (isDismissed(url)) return;

  const existing = document.getElementById('punycodex-authenticity-banner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'punycodex-authenticity-banner';
  banner.className = `punycodex-banner ${severityClass(verdict.severity)}`;
  banner.setAttribute('role', 'alert');

  const title = document.createElement('strong');
  title.textContent = verdict.label || verdict.verdict;

  const reason = document.createElement('span');
  reason.className = 'punycodex-banner-reason';
  reason.textContent = verdict.reason || verdict.explanation || '';

  const close = document.createElement('button');
  close.className = 'punycodex-banner-close';
  close.setAttribute('aria-label', 'Dismiss warning');
  close.textContent = '×';
  close.addEventListener('click', () => {
    markDismissed(url);
    banner.remove();
  });

  banner.appendChild(title);
  banner.appendChild(reason);
  banner.appendChild(close);
  document.body.prepend(banner);
}

async function highlightLink(anchor) {
  const href = anchor.href;
  if (!href || href.startsWith('#') || anchor.dataset.punycodexChecked === 'true') {
    return;
  }
  anchor.dataset.punycodexChecked = 'true';

  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkLink', url: href });
    if (!response?.success || !response.verdict) return;

    const { verdict } = response;
    const severity = verdict.severity || 'none';
    if (severity === 'none' || severity === 'low') return;

    anchor.classList.add('punycodex-risk-link');
    anchor.dataset.punycodexRisk = severity;
    anchor.dataset.punycodexVerdict = verdict.verdict;
    anchor.title = `${verdict.label || verdict.verdict}: ${verdict.reason || verdict.explanation || ''}`;
  } catch {
    // ignore network / context errors
  }
}

function scanLinks() {
  const anchors = document.querySelectorAll('a[href]');
  for (const anchor of anchors) {
    highlightLink(anchor);
  }
}

function observeLinks() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'A') {
            highlightLink(node);
          } else if (node.querySelectorAll) {
            for (const anchor of node.querySelectorAll('a[href]')) {
              highlightLink(anchor);
            }
          }
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'showBanner' && request.verdict) {
    showBanner(request.verdict);
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    scanLinks();
    observeLinks();
  });
} else {
  scanLinks();
  observeLinks();
}
