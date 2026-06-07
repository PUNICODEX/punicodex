const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FAVICON_DIR = path.join(__dirname, '..', 'public', 'favicons');
const THUMBNAIL_DIR = path.join(__dirname, '..', 'public', 'thumbnails');

// Ensure directories exist
if (!fs.existsSync(FAVICON_DIR)) fs.mkdirSync(FAVICON_DIR, { recursive: true });
if (!fs.existsSync(THUMBNAIL_DIR)) fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });

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
    const existing = this.db.prepare(
      'SELECT lexicon_entry_id FROM indexed_sites WHERE punycode = ?'
    ).get(punycode);

    if (existing && existing.lexicon_entry_id) {
      return this.db.prepare(
        'SELECT id, pantheon, tier, tier_label as tierLabel FROM entries WHERE id = ?'
      ).get(existing.lexicon_entry_id);
    }

    const unicode = require('url').domainToUnicode(punycode);
    let entry = this.db.prepare(
      `SELECT id, pantheon, tier, tier_label as tierLabel FROM entries 
       WHERE unicode || '.com' = ? OR unicode = ?`
    ).get(unicode, unicode);

    if (!entry) {
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
      const startTime = Date.now();
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
        const responseTimeMs = Date.now() - startTime;
        const meta = await this.extractMetadata(html, resp.url, responseTimeMs, html.length);
        
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

  // ==================== MAIN EXTRACTION ====================

  async extractMetadata(html, baseUrl, responseTimeMs, contentLength) {
    const base = new URL(baseUrl);

    // Basic
    const title = this.extractTag(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || '';
    const descFromMeta = this.extractMetaContent(html, 'description');
    const ogDesc = this.extractOgContent(html, 'og:description');
    const description = descFromMeta || ogDesc || '';
    
    const h1 = this.extractTag(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const firstP = this.extractTag(html, /<p[^>]*>([\s\S]*?)<\/p>/i);
    const snippet = h1 || firstP || description;

    // Open Graph
    const og = this.extractOpenGraph(html);

    // Twitter Cards
    const twitter = this.extractTwitterCard(html);

    // JSON-LD
    const jsonLd = this.extractJsonLd(html);

    // Video / Rich Media
    const video = this.extractVideo(html, base);

    // Ratings / Reviews from structured data
    const rating = this.extractRating(jsonLd, html);

    // Favicon
    const faviconUrl = this.extractFaviconUrl(html, base);

    // Language
    const lang = this.extractLang(html);

    // Headings
    const headings = this.extractHeadings(html);

    // Links
    const links = this.extractLinks(html, base);

    // Sitemap
    const sitemap = await this.fetchSitemap(base);

    // Content quality
    const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;
    const contentRatio = contentLength > 0 ? textContent.length / contentLength : 0;

    // SEO Meta
    const seo = this.extractSeoMeta(html);

    // Published date
    const publishedDate = this.extractPublishedDate(jsonLd, html);

    return {
      // Basic
      title: this.sanitizeText(title) || '',
      description: this.sanitizeText(description) || '',
      h1: this.sanitizeText(h1 || '') || '',
      first_p: this.sanitizeText(firstP || '') || '',
      content_snippet: (this.sanitizeText(snippet) || '').substring(0, 300),

      // Open Graph
      og_title: og.title,
      og_description: og.description,
      og_image: og.image,
      og_type: og.type,
      og_site_name: og.site_name,
      og_url: og.url,
      og_locale: og.locale,

      // Twitter Cards
      twitter_title: twitter.title,
      twitter_description: twitter.description,
      twitter_image: twitter.image,
      twitter_card: twitter.card,
      twitter_site: twitter.site,

      // Rich Media
      og_video: video.url,
      og_video_type: video.type,

      // Rating
      rating_value: rating.value,
      rating_count: rating.count,

      // Structured Data
      json_ld: jsonLd.length > 0 ? JSON.stringify(jsonLd) : null,

      // Favicon
      favicon_url: faviconUrl,

      // Language
      lang,

      // Headings
      h1_count: headings.h1,
      h2_count: headings.h2,
      h3_count: headings.h3,
      h4_count: headings.h4,
      h5_count: headings.h5,
      h6_count: headings.h6,
      headings_h2: headings.h2_texts.length > 0 ? JSON.stringify(headings.h2_texts) : null,

      // Links
      internal_links: links.internal,
      external_links: links.external,
      anchor_texts: links.anchor_texts.length > 0 ? JSON.stringify(links.anchor_texts) : null,

      // Sitemap
      sitemap_url: sitemap.sitemap_url,
      sitemap_entries: sitemap.sitemap_entries,

      // Content Quality
      word_count: wordCount,
      content_ratio: parseFloat(contentRatio.toFixed(4)),

      // SEO Meta
      meta_robots: seo.robots,
      canonical_url: seo.canonical,
      meta_keywords: seo.keywords,
      meta_author: seo.author,

      // Technical
      response_time_ms: responseTimeMs,
      content_length: contentLength,
      redirect_count: 0,

      // Date
      published_date: publishedDate
    };
  }

  // ==================== EXTRACTION HELPERS ====================

  extractOpenGraph(html) {
    const props = ['title', 'description', 'image', 'type', 'site_name', 'url', 'locale'];
    const result = {};
    for (const prop of props) {
      result[prop] = this.extractOgContent(html, `og:${prop}`);
    }
    return result;
  }

  extractTwitterCard(html) {
    const props = ['title', 'description', 'image', 'card', 'site'];
    const result = {};
    for (const prop of props) {
      result[prop] = this.extractMetaNameContent(html, `twitter:${prop}`);
    }
    return result;
  }

  extractJsonLd(html) {
    const blocks = [];
    const regex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      try {
        const json = JSON.parse(match[1].trim());
        if (Array.isArray(json)) {
          blocks.push(...json);
        } else {
          blocks.push(json);
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    }
    return blocks;
  }

  extractFaviconUrl(html, base) {
    // Try <link rel="icon">
    let url = this.extractLinkHref(html, /<link[^>]*rel=["']icon["'][^>]*>/i);
    if (!url) url = this.extractLinkHref(html, /<link[^>]*rel=["']shortcut icon["'][^>]*>/i);
    if (!url) url = this.extractLinkHref(html, /<link[^>]*rel=["']apple-touch-icon["'][^>]*>/i);
    
    if (url) {
      try { return new URL(url, base).href; } catch { return url; }
    }
    
    // Fallback to /favicon.ico
    try { return new URL('/favicon.ico', base).href; } catch { return null; }
  }

  extractLang(html) {
    const m = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
    return m ? m[1] : null;
  }

  extractHeadings(html) {
    const result = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0, h2_texts: [] };
    for (let i = 1; i <= 6; i++) {
      const regex = new RegExp(`<h${i}[^>]*>([\\s\\S]*?)<\\/h${i}>`, 'gi');
      let match;
      while ((match = regex.exec(html)) !== null) {
        result[`h${i}`]++;
        if (i === 2) {
          const text = match[1].replace(/<[^>]+>/g, '').trim();
          if (text && result.h2_texts.length < 10) result.h2_texts.push(text);
        }
      }
    }
    return result;
  }

  extractLinks(html, base) {
    const hostname = base.hostname;
    let internal = 0, external = 0;
    const anchorTexts = [];
    const internalUrls = [];
    const externalUrls = [];
    const linkObjects = [];
    const regex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      try {
        const rawTag = match[0];
        const url = new URL(match[1], base);
        const text = match[2].replace(/<[^>]+>/g, '').trim();
        const isNofollow = /rel=["']?[^"'>]*nofollow[^"'>]*["']?/i.test(rawTag);
        if (url.hostname === hostname) {
          internal++;
          const urlStr = url.href;
          if (!internalUrls.includes(urlStr)) internalUrls.push(urlStr);
          if (text && text.length > 2 && text.length < 100 && anchorTexts.length < 20) {
            anchorTexts.push(text);
          }
          linkObjects.push({ url: urlStr, text, isExternal: false, nofollow: isNofollow, hostname: url.hostname });
        } else {
          external++;
          const urlStr = url.href;
          if (!externalUrls.includes(urlStr)) externalUrls.push(urlStr);
          linkObjects.push({ url: urlStr, text, isExternal: true, nofollow: isNofollow, hostname: url.hostname });
        }
      } catch {
        // Invalid URL, skip
      }
    }
    return { internal, external, anchor_texts: anchorTexts, internalUrls, externalUrls, linkObjects };
  }

  async fetchSitemap(baseUrl) {
    const sitemapUrls = [
      new URL('/sitemap.xml', baseUrl).href,
      new URL('/sitemap_index.xml', baseUrl).href,
    ];

    for (const url of sitemapUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const resp = await fetch(url, { headers: this.headers, signal: controller.signal });
        clearTimeout(timeout);

        if (!resp.ok) continue;

        const xml = await resp.text();
        const urls = [];
        const locRegex = /<loc>([^<]+)<\/loc>/gi;
        let m;
        while ((m = locRegex.exec(xml)) !== null) {
          urls.push(m[1]);
        }

        return { sitemap_url: url, sitemap_entries: urls.length };
      } catch {
        continue;
      }
    }

    return { sitemap_url: null, sitemap_entries: 0 };
  }

  extractSeoMeta(html) {
    return {
      robots: this.extractMetaNameContent(html, 'robots'),
      canonical: this.extractLinkHref(html, /<link[^>]*rel=["']canonical["'][^>]*>/i),
      keywords: this.extractMetaNameContent(html, 'keywords'),
      author: this.extractMetaNameContent(html, 'author')
    };
  }

  extractPublishedDate(jsonLd, html) {
    // Try JSON-LD first
    for (const block of jsonLd) {
      if (block.datePublished) return block.datePublished;
      if (block.dateModified) return block.dateModified;
    }
    // Try meta tags
    const articleDate = this.extractMetaPropertyContent(html, 'article:published_time');
    if (articleDate) return articleDate;
    const ogDate = this.extractOgContent(html, 'og:updated_time');
    if (ogDate) return ogDate;
    // Try generic meta
    const dateMeta = this.extractMetaNameContent(html, 'date');
    if (dateMeta) return dateMeta;
    return null;
  }

  // ==================== LOW-LEVEL EXTRACTORS ====================

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

  extractMetaContent(html, name) {
    const regex = new RegExp(`<meta[^>]*name=["']${name}["'][^>]*>`, 'i');
    const m = html.match(regex);
    if (!m) return null;
    const contentRe = /content=["']([^"']+)["']/i;
    const cm = m[0].match(contentRe);
    return cm ? this.sanitizeText(cm[1]) : null;
  }

  extractMetaNameContent(html, name) {
    return this.extractMetaContent(html, name);
  }

  extractMetaPropertyContent(html, property) {
    const regex = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*>`, 'i');
    const m = html.match(regex);
    if (!m) return null;
    const contentRe = /content=["']([^"']+)["']/i;
    const cm = m[0].match(contentRe);
    return cm ? this.sanitizeText(cm[1]) : null;
  }

  extractOgContent(html, property) {
    return this.extractMetaPropertyContent(html, property);
  }

  extractVideo(html, base) {
    const url = this.extractMetaPropertyContent(html, 'og:video');
    const type = this.extractMetaPropertyContent(html, 'og:video:type');
    return { url: url ? (() => { try { return new URL(url, base).href; } catch { return url; } })() : null, type };
  }

  extractRating(jsonLd, html) {
    // Try JSON-LD first
    for (const block of jsonLd) {
      if (block.aggregateRating) {
        return {
          value: block.aggregateRating.ratingValue || null,
          count: block.aggregateRating.ratingCount || block.aggregateRating.reviewCount || null
        };
      }
    }
    // Try meta tags
    const ratingValue = this.extractMetaPropertyContent(html, 'og:rating');
    return { value: ratingValue, count: null };
  }

  extractLinkHref(html, regex) {
    const m = html.match(regex);
    if (!m) return null;
    const hrefRe = /href=["']([^"']+)["']/i;
    const hm = m[0].match(hrefRe);
    return hm ? hm[1] : null;
  }

  sanitizeText(str) {
    if (!str) return null;
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

  hashPunycode(punycode) {
    return crypto.createHash('sha256').update(punycode).digest('hex').substring(0, 8);
  }

  // ==================== DOWNLOAD HELPERS ====================

  async downloadAsset(url, punycode, destDir, maxSize = 65536) {
    if (!url) return null;
    
    const hash = this.hashPunycode(punycode);
    
    // Detect extension from URL or default to .ico
    let ext = path.extname(new URL(url).pathname).toLowerCase();
    if (!ext || ext.length > 5) ext = '.ico';
    if (ext === '.jpeg') ext = '.jpg';
    
    const filename = `${hash}${ext}`;
    const filepath = path.join(destDir, filename);
    const webPath = `/favicons/${filename}`;

    // Skip if already cached
    if (fs.existsSync(filepath)) {
      const webPathDir = path.basename(destDir);
      return `/${webPathDir}/${filename}`;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      
      const resp = await fetch(url, {
        headers: { ...this.headers, 'Accept': 'image/*' },
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!resp.ok) return null;
      
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('image') && !url.endsWith('.ico')) {
        return null; // Not an image
      }
      
      const buffer = await resp.arrayBuffer();
      if (buffer.byteLength > maxSize) return null; // Too large
      
      fs.writeFileSync(filepath, Buffer.from(buffer));
      
      const webPathDir = path.basename(destDir);
      return `/${webPathDir}/${filename}`;
    } catch (e) {
      return null;
    }
  }

  async downloadFavicon(faviconUrl, punycode) {
    return this.downloadAsset(faviconUrl, punycode, FAVICON_DIR, 65536);
  }

  async downloadOgImage(ogImageUrl, punycode) {
    return this.downloadAsset(ogImageUrl, punycode, THUMBNAIL_DIR, 262144);
  }

  // ==================== CRAWL DOMAIN ====================

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

    // Download favicon and OG image
    const faviconPath = await this.downloadFavicon(result.favicon_url, punycode);
    const ogImagePath = result.og_image ? await this.downloadOgImage(result.og_image, punycode) : null;

    const stmt = this.db.prepare(`
      INSERT INTO indexed_sites 
        (domain, punycode, title, description, h1, first_p, content_snippet,
         og_title, og_description, og_image, og_type, og_site_name, og_url, og_locale,
         twitter_title, twitter_description, twitter_image, twitter_card, twitter_site,
         json_ld, favicon_url, favicon_path, og_image_path,
         lang, h1_count, h2_count, h3_count, h4_count, h5_count, h6_count, headings_h2,
         internal_links, external_links, anchor_texts, word_count, content_ratio,
         meta_robots, canonical_url, meta_keywords, meta_author,
         sitemap_url, sitemap_entries,
         og_video, og_video_type, rating_value, rating_count,
         response_time_ms, content_length, redirect_count, published_date,
         lexicon_entry_id, pantheon, tier, tier_label, status,
         content_hash, last_crawled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'))
      ON CONFLICT(domain) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        h1 = excluded.h1,
        first_p = excluded.first_p,
        content_snippet = excluded.content_snippet,
        og_title = excluded.og_title,
        og_description = excluded.og_description,
        og_image = excluded.og_image,
        og_type = excluded.og_type,
        og_site_name = excluded.og_site_name,
        og_url = excluded.og_url,
        og_locale = excluded.og_locale,
        twitter_title = excluded.twitter_title,
        twitter_description = excluded.twitter_description,
        twitter_image = excluded.twitter_image,
        twitter_card = excluded.twitter_card,
        twitter_site = excluded.twitter_site,
        json_ld = excluded.json_ld,
        favicon_url = excluded.favicon_url,
        favicon_path = excluded.favicon_path,
        og_image_path = excluded.og_image_path,
        lang = excluded.lang,
        h1_count = excluded.h1_count,
        h2_count = excluded.h2_count,
        h3_count = excluded.h3_count,
        h4_count = excluded.h4_count,
        h5_count = excluded.h5_count,
        h6_count = excluded.h6_count,
        headings_h2 = excluded.headings_h2,
        internal_links = excluded.internal_links,
        external_links = excluded.external_links,
        anchor_texts = excluded.anchor_texts,
        word_count = excluded.word_count,
        content_ratio = excluded.content_ratio,
        meta_robots = excluded.meta_robots,
        canonical_url = excluded.canonical_url,
        meta_keywords = excluded.meta_keywords,
        meta_author = excluded.meta_author,
        sitemap_url = excluded.sitemap_url,
        sitemap_entries = excluded.sitemap_entries,
        og_video = excluded.og_video,
        og_video_type = excluded.og_video_type,
        rating_value = excluded.rating_value,
        rating_count = excluded.rating_count,
        response_time_ms = excluded.response_time_ms,
        content_length = excluded.content_length,
        redirect_count = excluded.redirect_count,
        published_date = excluded.published_date,
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
      result.title, result.description, result.h1, result.first_p, result.content_snippet,
      result.og_title, result.og_description, result.og_image, result.og_type, result.og_site_name, result.og_url, result.og_locale,
      result.twitter_title, result.twitter_description, result.twitter_image, result.twitter_card, result.twitter_site,
      result.json_ld, result.favicon_url, faviconPath, ogImagePath,
      result.lang, result.h1_count, result.h2_count, result.h3_count, result.h4_count, result.h5_count, result.h6_count, result.headings_h2,
      result.internal_links, result.external_links, result.anchor_texts, result.word_count, result.content_ratio,
      result.meta_robots, result.canonical_url, result.meta_keywords, result.meta_author,
      result.sitemap_url, result.sitemap_entries,
      result.og_video, result.og_video_type, result.rating_value, result.rating_count,
      result.response_time_ms, result.content_length, result.redirect_count, result.published_date,
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
      matchedEntry: entry ? entry.id : null,
      faviconPath,
      ogImagePath
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

  // ==================== DEEP CRAWL ====================

  async fetchPage(url, timeoutMs = 8000) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const resp = await fetch(url, { headers: this.headers, signal: controller.signal, redirect: 'follow' });
      clearTimeout(timeout);

      if (!resp.ok) return null;
      const html = await resp.text();
      return { url: resp.url, html };
    } catch {
      return null;
    }
  }

  extractPageMeta(html, baseUrl) {
    const title = this.extractTag(html, /<title[^>]*>([^<]*)<\/title>/i);
    const description = this.extractMetaNameContent(html, 'description');
    const h1 = this.extractTag(html, /<h1[^>]*>([^<]*)<\/h1>/i);
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const contentSnippet = text.substring(0, 500);
    return {
      title: this.sanitizeText(title) || '',
      description: this.sanitizeText(description) || '',
      h1: this.sanitizeText(h1) || '',
      content_snippet: contentSnippet,
      word_count: words.length
    };
  }

  async deepCrawlDomain(input, maxPages = 10) {
    const { domain, punycode } = this.normalizeDomain(input);

    // First, crawl the home page
    const homeResult = await this.crawlDomain(input);
    if (homeResult.status === 'error') {
      return { domain, status: 'error', error: homeResult.error, discovered: [] };
    }

    // Get the site's ID
    const site = this.db.prepare('SELECT id FROM indexed_sites WHERE domain = ?').get(domain);
    if (!site) {
      return { domain, status: 'error', error: 'Site not found after crawl', discovered: [] };
    }
    const siteId = site.id;

    // Fetch home page HTML to extract links
    const homeFetch = await this.fetchPage(`https://${punycode}`);
    if (!homeFetch) {
      return { domain, status: 'error', error: 'Could not fetch home page for link extraction', discovered: [] };
    }

    const base = new URL(homeFetch.url);
    const homeLinks = this.extractLinks(homeFetch.html, base);

    // Collect unique internal URLs to crawl
    const internalUrls = homeLinks.internalUrls.slice(0, maxPages);
    const allOutboundUrls = [...homeLinks.externalUrls];
    const allLinkObjects = [...homeLinks.linkObjects];

    // Clear old sub-pages and links for this site
    this.db.prepare('DELETE FROM site_pages WHERE site_id = ?').run(siteId);
    this.db.prepare('DELETE FROM links WHERE from_site_id = ?').run(siteId);

    const insertPage = this.db.prepare(`
      INSERT INTO site_pages (site_id, url, title, description, h1, content_snippet, word_count, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let pagesCrawled = 0;

    // Crawl each internal link
    for (const url of internalUrls) {
      const page = await this.fetchPage(url, 6000);
      if (!page) continue;

      const meta = this.extractPageMeta(page.html, page.url);
      const hash = this.hash(page.html);

      insertPage.run(siteId, page.url, meta.title, meta.description, meta.h1,
        meta.content_snippet, meta.word_count, hash);
      pagesCrawled++;

      // Also extract links from this page for outbound discovery and link graph
      const pageLinks = this.extractLinks(page.html, new URL(page.url));
      for (const outUrl of pageLinks.externalUrls) {
        if (!allOutboundUrls.includes(outUrl)) allOutboundUrls.push(outUrl);
      }
      for (const linkObj of pageLinks.linkObjects) {
        if (!allLinkObjects.some(l => l.url === linkObj.url && l.hostname === linkObj.hostname)) {
          allLinkObjects.push(linkObj);
        }
      }
    }

    // Store links in link graph (indexed site → indexed site edges only)
    const insertLink = this.db.prepare(`
      INSERT OR IGNORE INTO links (from_site_id, to_site_id, from_url, to_url, anchor_text, nofollow)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    let linksStored = 0;

    for (const link of allLinkObjects) {
      if (!link.isExternal) continue; // Only cross-site links matter for PageRank

      try {
        const target = this.db.prepare('SELECT id FROM indexed_sites WHERE punycode = ? OR domain = ?').get(link.hostname, link.hostname);
        if (!target) continue;
        insertLink.run(siteId, target.id, homeFetch.url, link.url, link.text || '', link.nofollow ? 1 : 0);
        linksStored++;
      } catch {
        // Skip errors
      }
    }

    // Update incoming_links counts for all targets of this site
    this.db.prepare(`
      UPDATE indexed_sites SET incoming_links = (
        SELECT COUNT(*) FROM links WHERE to_site_id = indexed_sites.id AND nofollow = 0
      )
    `).run();

    // Discover new Unicode domains from outbound links
    const discovered = [];
    const seen = new Set();
    for (const url of allOutboundUrls) {
      try {
        const u = new URL(url);
        const hostname = u.hostname;
        if (!hostname) continue;

        // Check if it's a punycode domain
        const isPunycode = hostname.startsWith('xn--');
        if (!isPunycode) continue;

        // Skip if already indexed or queued
        if (seen.has(hostname)) continue;
        seen.add(hostname);

        const existing = this.db.prepare('SELECT 1 FROM indexed_sites WHERE punycode = ?').get(hostname);
        if (existing) continue;

        const queued = this.db.prepare('SELECT 1 FROM crawl_queue WHERE punycode = ?').get(hostname);
        if (queued) continue;

        discovered.push({ domain: require('url').domainToUnicode(hostname), punycode: hostname, source: 'outbound-link' });
      } catch {
        // Invalid URL
      }
    }

    return {
      domain,
      status: 'active',
      pagesCrawled,
      subPages: pagesCrawled,
      outboundLinks: allOutboundUrls.length,
      linksStored,
      discoveredDomains: discovered.length,
      discovered
    };
  }
}

module.exports = { UnicodeCrawler };
