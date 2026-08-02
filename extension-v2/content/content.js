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

// Banner styles must live inside the closed shadow root — page-level CSS
// (including a flagged page's own stylesheets) cannot reach or restyle them.
const BANNER_SHADOW_CSS = `
  .wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
    padding: 12px 16px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px; line-height: 1.4; display: flex; align-items: center; gap: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); }
  .punicodex-risk-high { background: #fff1f2; color: #881337; border-bottom: 3px solid #e11d48; }
  .punicodex-risk-medium { background: #fffbeb; color: #78350f; border-bottom: 3px solid #f59e0b; }
  .punicodex-risk-low { background: #fefce8; color: #713f12; border-bottom: 3px solid #eab308; }
  .reason { flex: 1; }
  .close { background: transparent; border: none; font-size: 22px; line-height: 1;
    cursor: pointer; color: inherit; padding: 0 4px; }
`;

function showBanner(verdict) {
  const url = location.href;
  if (isDismissed(url, BANNER_STORAGE_KEY)) return;

  const existing = document.getElementById('punicodex-authenticity-banner-host');
  if (existing) return;

  // Closed shadow root: the flagged page's JS can neither read nor restyle
  // the banner's internals — its only move is removing the host, which the
  // MutationObserver below immediately reverses.
  const host = document.createElement('div');
  host.id = 'punicodex-authenticity-banner-host';
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = BANNER_SHADOW_CSS;

  const banner = document.createElement('div');
  banner.className = `wrap ${severityClass(verdict.severity)}`;
  banner.setAttribute('role', 'alert');
  banner.setAttribute('aria-live', 'polite');

  const icon = createIcon(verdict.severity === 'critical' ? 'block' : 'alert');
  const title = document.createElement('strong');
  title.textContent = verdict.label || verdict.verdict;

  const reason = document.createElement('span');
  reason.className = 'reason';
  reason.textContent = verdict.reason || verdict.explanation || '';

  const close = document.createElement('button');
  close.className = 'close';
  close.setAttribute('aria-label', 'Dismiss warning');
  close.textContent = '×';
  close.addEventListener('click', () => {
    markDismissed(url, BANNER_STORAGE_KEY);
    host.remove();
  });

  banner.appendChild(icon);
  banner.appendChild(title);
  banner.appendChild(reason);
  banner.appendChild(close);
  shadow.appendChild(style);
  shadow.appendChild(banner);
  document.body.prepend(host);

  // If the flagged page removes the host element, put it straight back.
  const guard = new MutationObserver(() => {
    if (!document.getElementById(host.id)) {
      guard.disconnect();
      document.body.prepend(host);
      guard.observe(document.body, { childList: true });
    }
  });
  guard.observe(document.body, { childList: true });
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

// Only http(s) URLs leave the browser for a verdict — and never with their
// query string or fragment, which can carry tokens, session ids, and other
// secrets. Scheme handlers like mailto:, tel:, javascript:, and data: are
// never sent anywhere.
function sanitizableHref(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

async function highlightLink(anchor) {
  const href = sanitizableHref(anchor.href);
  if (!href || anchor.dataset.punicodexChecked === 'true') {
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
