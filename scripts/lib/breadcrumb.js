/**
 * BreadcrumbList JSON-LD builder (SEO wave 3).
 *
 * Emits an absolute-URL BreadcrumbList script block for a temple page:
 *   Home → Pantheon → {temple unicode} → [tab]
 * Consumed by scripts/create-flagship.js (per-tab generators) and the two
 * blog generators (temple blog tab + series pages).
 */

function breadcrumbJsonLd(items) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
  return `<script type="application/ld+json">\n${JSON.stringify(json, null, 2)}\n    </script>`;
}

/**
 * @param {{id: string, unicode: string}} entry — lexicon entry (needs id + unicode)
 * @param {{name: string, path: string}|null} [tab] — e.g. { name: 'Lore', path: 'lore/' }
 */
function templeBreadcrumb(entry, tab) {
  const items = [
    { name: 'Home', url: 'https://punicodex.com/' },
    { name: 'Pantheon', url: 'https://punicodex.com/pantheon/' },
    { name: entry.unicode, url: `https://punicodex.com/sites/${entry.id}/` },
  ];
  if (tab) {
    items.push({ name: tab.name, url: `https://punicodex.com/sites/${entry.id}/${tab.path}` });
  }
  return breadcrumbJsonLd(items);
}

module.exports = { breadcrumbJsonLd, templeBreadcrumb };
