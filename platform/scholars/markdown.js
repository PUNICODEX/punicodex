/**
 * PuniCodex — Scholarly Edition Markdown Renderer
 *
 * Dual-mode renderer: loadable via require() in Node (build-time baking in
 * scripts/generate-scholars.js) and inlineable verbatim into a browser
 * <script> block (runtime refresh from the Scholars API, exposed as
 * `PxScholarsMarkdown`). Both environments must produce byte-identical HTML,
 * so the generator injects this file's raw source into the page.
 *
 * Security: ALL input is HTML-escaped before any transform runs. Transforms
 * only ever re-emit escaped text wrapped in our own trusted tags — raw HTML
 * can never reach the output.
 */

(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PxScholarsMarkdown = api;
})(typeof self !== 'undefined' ? self : globalThis, () => {
  const ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  const ENTRY_ID_RE = /^[a-z0-9-]+$/;
  const SAFE_URL_RE = /^https?:\/\//i;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
  }

  function sanitizeSectionKey(sectionKey) {
    return String(sectionKey || '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
  }

  // Inline transforms. `escaped` is ALWAYS pre-escaped text; replacements
  // re-emit slices of it inside trusted tags only.
  function renderInline(escaped, sectionKey) {
    let out = escaped;

    // Crosslinks: [[entry-id|Display Text]] or [[entry-id]].
    out = out.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, id, label) => {
      const entryId = id.trim();
      if (!ENTRY_ID_RE.test(entryId)) return match;
      const text = label ? label.trim() : entryId;
      return `<a class="scholars-xlink" href="/${entryId}/">${text}</a>`;
    });

    // External links: [text](https://example.com). Only http/https allowed.
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, text, url) => {
      if (!SAFE_URL_RE.test(url)) return match;
      return `<a class="scholars-ext" href="${url}" rel="noopener noreferrer" target="_blank">${text}</a>`;
    });

    // Citations: [^n] -> superscript anchor into the section's sources list.
    out = out.replace(
      /\[\^(\d+)\]/g,
      (_match, n) => `<sup class="scholars-cite"><a href="#src-${sectionKey}-${n}">[${n}]</a></sup>`
    );

    // Emphasis: bold before italic, no nesting.
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    return out;
  }

  // One blank-line-separated block: headings, list runs, and paragraphs.
  function renderBlock(block, sectionKey) {
    const lines = block.split('\n');
    let html = '';
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line.startsWith('### ')) {
        html += `<h3 class="scholars-h3">${renderInline(line.slice(4), sectionKey)}</h3>`;
        i += 1;
      } else if (line.startsWith('- ')) {
        const items = [];
        while (i < lines.length && lines[i].startsWith('- ')) {
          items.push(`<li>${renderInline(lines[i].slice(2), sectionKey)}</li>`);
          i += 1;
        }
        html += `<ul class="scholars-list">${items.join('')}</ul>`;
      } else {
        const para = [];
        while (i < lines.length && !lines[i].startsWith('### ') && !lines[i].startsWith('- ')) {
          para.push(renderInline(lines[i], sectionKey));
          i += 1;
        }
        html += `<p>${para.join('<br>')}</p>`;
      }
    }
    return html;
  }

  function renderMarkdown(body, opts = {}) {
    const sectionKey = sanitizeSectionKey(opts.sectionKey);
    if (body == null || String(body).trim() === '') return '';
    const escaped = escapeHtml(body).replace(/\r\n?/g, '\n');
    const out = [];
    for (const block of escaped.split(/\n\n+/)) {
      const trimmed = block.trim();
      if (trimmed === '') continue;
      out.push(renderBlock(trimmed, sectionKey));
    }
    return out.join('\n');
  }

  function renderSources(sources, opts = {}) {
    const sectionKey = sanitizeSectionKey(opts.sectionKey);
    if (!Array.isArray(sources) || sources.length === 0) return '';
    const items = sources.map((source, index) => {
      const citation =
        typeof source === 'string' ? source : source?.citation || JSON.stringify(source);
      const url = source && typeof source === 'object' ? source.url : null;
      let html = escapeHtml(citation);
      if (url && SAFE_URL_RE.test(String(url))) {
        html += ` <a class="scholars-ext" href="${escapeHtml(
          String(url)
        )}" rel="noopener noreferrer" target="_blank">↗</a>`;
      }
      return `<li id="src-${sectionKey}-${index + 1}">${html}</li>`;
    });
    return `<div class="scholars-sources"><h4>Sources</h4><ol>${items.join('')}</ol></div>`;
  }

  return { renderMarkdown, renderSources };
});
