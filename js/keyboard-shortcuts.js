/**
 * PUNYCODEX Keyboard Shortcuts — global shortcut registry.
 */
(function (global) {
  'use strict';

  const registry = [];

  function register(keySpec, handler, options = {}) {
    registry.push({ keySpec, handler, options });
  }

  function normalizeKey(e) {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('mod');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    parts.push(e.key.toLowerCase());
    return parts.join('+');
  }

  function init() {
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      const combo = normalizeKey(e);

      for (const entry of registry) {
        const spec = entry.keySpec.toLowerCase();
        const isCombo = spec.includes('+');
        if (isCombo && combo === spec) {
          e.preventDefault();
          entry.handler(e);
          return;
        }
        if (!isCombo && !typing && e.key.toLowerCase() === spec) {
          e.preventDefault();
          entry.handler(e);
          return;
        }
      }
    });
  }

  global.PunyKeyboard = { register, init };
})(typeof window !== 'undefined' ? window : globalThis);
