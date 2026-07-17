/**
 * PuniCodex — Authenticity i18n loader
 *
 * Resolves locale from Accept-Language header or ?lang= query parameter.
 */

const fs = require('node:fs');
const path = require('node:path');

const BUNDLES = {
  en: require('./en.json'),
  fr: require('./fr.json'),
  de: require('./de.json'),
  es: require('./es.json'),
  ja: require('./ja.json'),
  zh: require('./zh.json'),
  ar: require('./ar.json'),
  hi: require('./hi.json'),
  ru: require('./ru.json'),
};

const AVAILABLE = Object.keys(BUNDLES);
const DEFAULT_LOCALE = 'en';

function resolveLocale(input) {
  if (!input) return DEFAULT_LOCALE;

  // Normalize to lower-case, strip region/culture codes, take first accepted language.
  const raw = String(input)
    .split(',')[0]
    .trim()
    .toLowerCase();
  const locale = raw.split('-')[0];

  if (AVAILABLE.includes(locale)) return locale;

  // Region-only fallback for Chinese and Arabic common codes.
  if (raw.startsWith('zh')) return 'zh';
  if (raw.startsWith('ar')) return 'ar';

  return DEFAULT_LOCALE;
}

function resolveLocaleFromRequest(req) {
  const queryLang = req?.query?.lang || req?.query?.locale;
  if (queryLang) return resolveLocale(queryLang);

  const header = req?.headers?.['accept-language'];
  if (header) return resolveLocale(header);

  return DEFAULT_LOCALE;
}

function getBundle(locale) {
  return BUNDLES[resolveLocale(locale)] || BUNDLES[DEFAULT_LOCALE];
}

function getAllLocales() {
  return AVAILABLE.map((code) => ({
    code,
    name: BUNDLES[code]._name,
    rtl: Boolean(BUNDLES[code]._rtl),
  }));
}

function t(bundle, key, fallback) {
  const parts = key.split('.');
  let current = bundle;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return fallback !== undefined ? fallback : key;
    }
  }
  return typeof current === 'string' ? current : fallback !== undefined ? fallback : key;
}

module.exports = {
  BUNDLES,
  AVAILABLE,
  DEFAULT_LOCALE,
  resolveLocale,
  resolveLocaleFromRequest,
  getBundle,
  getAllLocales,
  t,
};
