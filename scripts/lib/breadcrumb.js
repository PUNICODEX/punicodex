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
    { name: entry.unicode, url: `https://punicodex.com/${entry.id}/` },
  ];
  if (tab) {
    items.push({ name: tab.name, url: `https://punicodex.com/${entry.id}/${tab.path}` });
  }
  return breadcrumbJsonLd(items);
}

/**
 * Visible breadcrumb strip (SEO wave — mirrors the JSON-LD trail):
 *   Home → Pantheon → {temple unicode} → [tab]
 * The last item is the current page (aria-current, unlinked); every earlier
 * item is an absolute link so the snippet is correct at any page depth.
 *
 * @param {{id: string, unicode: string}} entry — lexicon entry (needs id + unicode)
 * @param {{name: string, path: string}|null} [tab] — current tab, if any
 */
function templeBreadcrumbNav(entry, tab) {
  const trail = [
    { name: 'Home', url: 'https://punicodex.com/' },
    { name: 'Pantheon', url: 'https://punicodex.com/pantheon/' },
  ];
  if (tab) {
    trail.push({ name: entry.unicode, url: `https://punicodex.com/${entry.id}/` });
    trail.push({ name: tab.name, url: null });
  } else {
    trail.push({ name: entry.unicode, url: null });
  }
  const items = trail
    .map((it, i) => {
      const last = i === trail.length - 1;
      const inner = last
        ? `<span aria-current="page">${it.name}</span>`
        : `<a href="${it.url}">${it.name}</a>`;
      return `                <li>${inner}</li>`;
    })
    .join('\n');
  return `    <!-- Visible breadcrumb (mirrors the BreadcrumbList JSON-LD) -->
    <nav class="temple-breadcrumb" aria-label="breadcrumb">
        <ol class="temple-breadcrumb-list">
${items}
        </ol>
    </nav>`;
}

module.exports = { breadcrumbJsonLd, templeBreadcrumb, templeBreadcrumbNav };
