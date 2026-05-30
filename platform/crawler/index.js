const { URL } = require('url');

class UnicodeCrawler {
  constructor(db) {
    this.db = db;
    this.headers = {
      'User-Agent': 'PUNYCODEX-Bot/1.0 (https://punycodex.com/bot) Unicode Domain Crawler'
    };
  }

  normalizeDomain(input) {
    const trimmed = input.trim().toLowerCase();
    const domain = trimmed.startsWith('http') 
      ? new URL(trimmed).hostname 
      : trimmed.replace(/^www\./, '');
    
    const punycode = domain.startsWith('xn--') 
      ? domain 
      : require('url').domainToASCII(domain);
    
    const unicode = domain.startsWith('xn--') 
      ? require('url').domainToUnicode(domain) 
      : domain;

    return { domain: unicode, punycode };
  }

  matchLexicon(punycode) {
    // Try to find existing site first
    const existing = this.db.prepare(
      'SELECT lexicon_entry_id FROM indexed_sites WHERE punycode = ?'
    ).get(punycode);

    if (existing && existing.lexicon_entry_id) {
      return this.db.prepare(
        'SELECT id, pantheon, tier, tier_label as tierLabel FROM entries WHERE id = ?'
      ).get(existing.lexicon_entry_id);
    }

    // Match by unicode domain name (e.g., "zeús.com")
    const unicode = require('url').domainToUnicode(punycode);
    let entry = this.db.prepare(
      `SELECT id, pantheon, tier, tier_label as tierLabel FROM entries 
       WHERE unicode || '.com' = ? OR unicode = ?`
    ).get(unicode, unicode);

    if (!entry) {
      // Extract core name from punycode and match by ascii
      const core = punycode.replace(/^xn--/, '').replace(/\.com$/, '').replace(/-/g, '');
      entry = this.db.prepare(
        `SELECT id, pantheon, tier, tier_label as tierLabel FROM entries 
         WHERE ascii = ? OR LOWER(ascii) = LOWER(?)`
      ).get(core, core);
    }

    return entry || null;
  }

  async fetchSite(domain) {
    const urls = [`https://${domain}`, `http://${domain}`];
    let lastError = null;

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const resp = await fetch(url, {
          headers: this.headers,
          signal: controller.signal,
          redirect: 'follow'
        });

        clearTimeout(timeout);

        if (!resp.ok) {
          lastError = `HTTP ${resp.status}`;
          continue;
        }

        const html = await resp.text();
        const meta = this.extractMetadata(html, url);
        
        return {
          success: true,
          url: resp.url,
          ...meta,
          content_hash: this.hash(html)
        };

      } catch (err) {
        lastError = err.message;
        continue;
      }
    }

    return { success: false, error: lastError };
  }

  extractMetadata(html, baseUrl) {
    const title = this.extractTag(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    
    const descFromMeta = this.extractAttribute(
      html, 
      /<meta[^>]*name=["']description["'][^>]*>/i,
      'content'
    );
    
    const ogDesc = this.extractAttribute(
      html,
      /<meta[^>]*property=["']og:description["'][^>]*>/i,
      'content'
    );

    const description = descFromMeta || ogDesc || '';
    
    const h1 = this.extractTag(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const firstP = this.extractTag(html, /<p[^>]*>([\s\S]*?)<\/p>/i);
    const snippet = h1 || firstP || description;

    return {
      title: this.sanitizeText(title || ''),
      description: this.sanitizeText(description),
      content_snippet: this.sanitizeText(snippet).substring(0, 300)
    };
  }

  extractTag(html, regex) {
    const m = html.match(regex);
    return m ? m[1].replace(/<[^>]+>/g, '').trim() : null;
  }

  extractAttribute(html, regex, attr) {
    const m = html.match(regex);
    if (!m) return null;
    const attrRe = new RegExp(`${attr}=["']([^"']+)["']`, 'i');
    const am = m[0].match(attrRe);
    return am ? am[1] : null;
  }

  sanitizeText(str) {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return h.toString(16);
  }

  async crawlDomain(input) {
    const { domain, punycode } = this.normalizeDomain(input);
    const entry = this.matchLexicon(punycode);

    const existing = this.db.prepare(
      'SELECT id, content_hash FROM indexed_sites WHERE domain = ?'
    ).get(domain);

    const result = await this.fetchSite(punycode.startsWith('xn--') ? punycode : domain);

    if (!result.success) {
      const stmt = this.db.prepare(`
        INSERT INTO indexed_sites (domain, punycode, status, last_crawled, title)
        VALUES (?, ?, 'error', datetime('now'), ?)
        ON CONFLICT(domain) DO UPDATE SET
          status = 'error', last_crawled = datetime('now')
      `);
      stmt.run(domain, punycode, result.error);
      return { domain, status: 'error', error: result.error };
    }

    if (existing && existing.content_hash === result.content_hash) {
      this.db.prepare(`
        UPDATE indexed_sites SET last_crawled = datetime('now') WHERE id = ?
      `).run(existing.id);
      return { domain, status: 'unchanged', cached: true };
    }

    const stmt = this.db.prepare(`
      INSERT INTO indexed_sites 
        (domain, punycode, title, description, content_snippet, 
         lexicon_entry_id, pantheon, tier, tier_label, status, 
         content_hash, last_crawled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'))
      ON CONFLICT(domain) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        content_snippet = excluded.content_snippet,
        lexicon_entry_id = excluded.lexicon_entry_id,
        pantheon = excluded.pantheon,
        tier = excluded.tier,
        tier_label = excluded.tier_label,
        status = excluded.status,
        content_hash = excluded.content_hash,
        last_crawled = datetime('now')
    `);

    stmt.run(
      domain, punycode,
      result.title, result.description, result.content_snippet,
      entry ? entry.id : null,
      entry ? entry.pantheon : null,
      entry ? entry.tier : null,
      entry ? entry.tierLabel : null,
      result.content_hash
    );

    return {
      domain, status: 'active',
      title: result.title,
      description: result.description,
      matchedEntry: entry ? entry.id : null
    };
  }

  async crawlBulk(domains, concurrency = 3) {
    const results = [];
    const queue = [...domains];
    
    const worker = async () => {
      while (queue.length) {
        const domain = queue.shift();
        try {
          const r = await this.crawlDomain(domain);
          results.push(r);
        } catch (e) {
          results.push({ domain, status: 'error', error: e.message });
        }
      }
    };

    await Promise.all(Array.from({ length: concurrency }, worker));
    return results;
  }

  async recrawlAll() {
    const sites = this.db.prepare(
      'SELECT punycode FROM indexed_sites WHERE status = "active" OR status = "pending"'
    ).all();
    return this.crawlBulk(sites.map(s => s.punycode));
  }
}

module.exports = { UnicodeCrawler };
