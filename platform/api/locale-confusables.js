/**
 * PÚNYCODEX — Locale-aware confusable resolver
 *
 * Loads locale-specific homoglyph mappings from platform/db/locale-confusables.json
 * and resolves the appropriate locale from an Accept-Language header or TLD.
 */

const path = require('node:path');

const LOCALE_CONFUSABLES = require(path.join(__dirname, '..', 'db', 'locale-confusables.json'));

function getLocaleConfusables(locale) {
  const code = String(locale || '')
    .toLowerCase()
    .split('-')[0];
  const entry = LOCALE_CONFUSABLES.locales[code];
  if (!entry) return null;
  return {
    locale: code,
    label: entry.label,
    homoglyphs: { ...entry.homoglyphs },
  };
}

function resolveLocaleFromTld(tld) {
  const needle = String(tld || '').toLowerCase();
  for (const [code, entry] of Object.entries(LOCALE_CONFUSABLES.locales)) {
    if (entry.tlds.includes(needle)) return code;
  }
  return null;
}

function resolveLocaleFromHeader(header) {
  if (!header) return null;
  const first = String(header).split(',')[0].trim().toLowerCase();
  const code = first.split('-')[0];
  return LOCALE_CONFUSABLES.locales[code] ? code : null;
}

function resolveLocaleConfusables({ acceptLanguage, tld, locale } = {}) {
  let code = locale ? String(locale).toLowerCase().split('-')[0] : null;
  if (!code && acceptLanguage) code = resolveLocaleFromHeader(acceptLanguage);
  if (!code && tld) code = resolveLocaleFromTld(tld);
  return code ? getLocaleConfusables(code) : null;
}

function foldWithLocale(input, locale) {
  const conf = getLocaleConfusables(locale);
  if (!conf) return String(input);
  let result = '';
  for (const ch of String(input)) {
    result += conf.homoglyphs[ch]?.ascii ?? ch;
  }
  return result;
}

module.exports = {
  LOCALE_CONFUSABLES,
  getLocaleConfusables,
  resolveLocaleFromTld,
  resolveLocaleFromHeader,
  resolveLocaleConfusables,
  foldWithLocale,
};
