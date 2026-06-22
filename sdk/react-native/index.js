/**
 * PÚNYCODEX — React Native wrapper for the Authenticity SDK
 *
 * Re-exports the lightweight mobile classifier so React Native apps can check
 * names and URLs offline without a native bridge for the core logic.
 */

const {
  classify,
  classifyUrl,
  VERDICTS,
  SEVERITIES,
} = require('../js/src/mobile-classifier.js');

/**
 * Check a term or URL and return an action decision.
 *
 * @param {string} input
 * @param {object} [policy]
 * @returns {{ verdict: object, action: string, reason: string }}
 */
function check(input, policy = {}) {
  const result = input.includes('://') ? classifyUrl(input) : classify(input);

  if (policy.allowlist?.includes(result.input)) {
    return { verdict: result, action: 'allow', reason: 'allowlist' };
  }
  if (policy.blocklist?.includes(result.input)) {
    return { verdict: result, action: 'block', reason: 'blocklist' };
  }

  const severityAction =
    policy.severityActions?.[result.severity] ?? policy.defaultAction ?? 'warn';

  return { verdict: result, action: severityAction, reason: 'severity' };
}

module.exports = {
  check,
  classify,
  classifyUrl,
  VERDICTS,
  SEVERITIES,
};
