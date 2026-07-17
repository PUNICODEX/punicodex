/**
 * PuniCodex Authenticity Extension v2 — Content script
 */

const BANNER_STORAGE_KEY = 'punicodex_banner_dismissed';
const MODAL_STORAGE_KEY = 'punicodex_modal_dismissed';

function isDismissed(url, key) {
  try {
    const data = JSON.parse(sessionStorage.getItem(key) || '{}');
    return data[url] === true;
  } catch {
    return false;
  }
}

function markDismissed(url, key) {
  try {
    const data = JSON.parse(sessionStorage.getItem(key) || '{}');
    data[url] = true;
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function severityClass(severity) {
  if (severity === 'critical' || severity === 'high') return 'punicodex-risk-high';
  if (severity === 'medium') return 'punicodex-risk-medium';
  return 'punicodex-risk-low';
}

function createIcon(type) {
  const span = document.createElement('span');
  span.className = 'punicodex-icon';
  span.setAttribute('aria-hidden', 'true');
  span.textContent = type === 'block' ? '⛔' : type === 'alert' ? '⚠' : type === 'ask' ? '?' : 'ℹ';
  return span;
}

function showBanner(verdict) {
  const url = location.href;
  if (isDismissed(url, BANNER_STORAGE_KEY)) return;

  const existing = document.getElementById('punicodex-authenticity-banner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'punicodex-authenticity-banner';
  banner.className = `punicodex-banner ${severityClass(verdict.severity)}`;
  banner.setAttribute('role', 'alert');
  banner.setAttribute('aria-live', 'polite');

  const icon = createIcon(verdict.severity === 'critical' ? 'block' : 'alert');
  const title = document.createElement('strong');
  title.textContent = verdict.label || verdict.verdict;

  const reason = document.createElement('span');
  reason.className = 'punicodex-banner-reason';
  reason.textContent = verdict.reason || verdict.explanation || '';

  const close = document.createElement('button');
  close.className = 'punicodex-banner-close';
  close.setAttribute('aria-label', 'Dismiss warning');
  close.textContent = '×';
  close.addEventListener('click', () => {
    markDismissed(url, BANNER_STORAGE_KEY);
    banner.remove();
  });

  banner.appendChild(icon);
  banner.appendChild(title);
  banner.appendChild(reason);
  banner.appendChild(close);
  document.body.prepend(banner);
}

function showModal(verdict) {
  const url = location.href;
  if (isDismissed(url, MODAL_STORAGE_KEY)) return;

  const existing = document.getElementById('punicodex-authenticity-modal');
  if (existing) return;

  const overlay = document.createElement('div');
  overlay.id = 'punicodex-authenticity-modal';
  overlay.className = `punicodex-modal ${severityClass(verdict.severity)}`;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'punicodex-modal-title');

  const panel = document.createElement('div');
  panel.className = 'punicodex-modal-panel';
  panel.setAttribute('role', 'document');

  const header = document.createElement('div');
  header.className = 'punicodex-modal-header';
  header.appendChild(createIcon(verdict.severity === 'critical' ? 'block' : 'alert'));

  const title = document.createElement('h2');
  title.id = 'punicodex-modal-title';
  title.textContent = verdict.label || verdict.verdict;
  header.appendChild(title);

  const body = document.createElement('p');
  body.textContent = verdict.reason || verdict.explanation || '';

  const actions = document.createElement('div');
  actions.className = 'punicodex-modal-actions';

  const backBtn = document.createElement('button');
  backBtn.className = 'punicodex-modal-primary';
  backBtn.textContent = 'Back to safety';
  backBtn.addEventListener('click', () => {
    history.back();
  });

  const proceedBtn = document.createElement('button');
  proceedBtn.className = 'punicodex-modal-secondary';
  proceedBtn.textContent = 'Proceed';
  proceedBtn.addEventListener('click', () => {
    markDismissed(url, MODAL_STORAGE_KEY);
    overlay.remove();
  });

  actions.appendChild(backBtn);
  actions.appendChild(proceedBtn);

  panel.appendChild(header);
  panel.appendChild(body);
  panel.appendChild(actions);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  backBtn.focus();
}

async function highlightLink(anchor) {
  const href = anchor.href;
  if (!href || href.startsWith('#') || anchor.dataset.punicodexChecked === 'true') {
    return;
  }
  anchor.dataset.punicodexChecked = 'true';

  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkLink', url: href });
    if (!response?.success || !response.verdict) return;

    const { verdict, action } = response;
    const severity = verdict.severity || 'none';
    if (severity === 'none' || severity === 'low') return;
    if (action && action.action === 'allow') return;

    anchor.classList.add('punicodex-risk-link');
    anchor.dataset.punicodexRisk = severity;
    anchor.dataset.punicodexVerdict = verdict.verdict;
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
  if (!request.verdict) return;

  const uiTheme = request.uiTheme || 'inline';
  if (request.action === 'showBanner') {
    if (uiTheme === 'modal') {
      showModal(request.verdict);
    } else {
      showBanner(request.verdict);
    }
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
