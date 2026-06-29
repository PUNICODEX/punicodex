const fs = require('fs');
const path = require('path');

const sitesDir = path.join(__dirname, '..', 'sites');

const galleryData = require('./gallery-data.json');

function replaceGalleryGrid(html, newGrid) {
  const startMarker = '<div class="gallery-grid">';
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) return html;
  
  let depth = 1;
  let i = startIdx + startMarker.length;
  while (i < html.length && depth > 0) {
    const openIdx = html.indexOf('<div', i);
    const closeIdx = html.indexOf('</div>', i);
    if (closeIdx === -1) break;
    if (openIdx !== -1 && openIdx < closeIdx) {
      depth++;
      i = openIdx + 4;
    } else {
      depth--;
      if (depth === 0) {
        return html.slice(0, startIdx) + newGrid + html.slice(closeIdx + 6);
      }
      i = closeIdx + 6;
    }
  }
  return html;
}

function generateGalleryHtml(siteId, data) {
  const items = data.images.map((img, i) => {
    const webpSrc = img.src;
    // Fallback: strip .webp; for SVG sources Wikimedia serves PNG thumbs, so map .svg → .png
    let fallbackSrc = img.src.replace(/\.webp$/, '');
    if (fallbackSrc.endsWith('.svg')) {
      fallbackSrc = fallbackSrc.replace(/\.svg$/, '.png');
    }
    const caption = img.caption.replace(/"/g, '&quot;');
    const alt = img.alt.replace(/"/g, '&quot;');
    const delayAttr = i > 0 ? ` data-delay="${(i % 4) * 100}"` : '';
    return `                <div class="gallery-item reveal-up"${delayAttr}>
                    <figure class="gallery-figure" data-full-src="${fallbackSrc}" data-caption="${caption}">
                        <img class="gallery-img" src="${fallbackSrc}" alt="${alt}" loading="lazy" decoding="async">
                    </figure>
                    <p class="gallery-caption">${img.caption}</p>
                </div>`;
  }).join('\n\n');
  return `            <div class="gallery-grid">\n\n${items}\n            </div>`;
}

const lightboxCss = `/* Gallery lightbox */
.gallery-item {
    cursor: zoom-in;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    padding: 0;
    font: inherit;
    color: inherit;
}
.gallery-lightbox {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: rgba(5,5,8,0.92);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
}
.gallery-lightbox.active {
    opacity: 1;
    visibility: visible;
}
.gallery-lightbox-content {
    position: relative;
    max-width: min(1200px, 95vw);
    max-height: min(900px, 90vh);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}
.gallery-lightbox-img {
    max-width: 100%;
    max-height: min(820px, 82vh);
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: 4px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.6);
}
.gallery-lightbox-caption {
    font-size: 0.95rem;
    color: #E0E0E0;
    text-align: center;
    max-width: 80ch;
    line-height: 1.6;
    padding: 0 1rem;
}
.gallery-lightbox-close {
    position: absolute;
    top: -3rem;
    right: 0;
    background: none;
    border: none;
    color: #D4AF37;
    font-size: 2.5rem;
    line-height: 1;
    cursor: pointer;
    padding: 0.25rem;
    transition: color 0.2s ease, transform 0.2s ease;
}
.gallery-lightbox-close:hover,
.gallery-lightbox-close:focus {
    color: #F5F5F5;
    transform: scale(1.1);
}
@media (max-width: 640px) {
    .gallery-lightbox {
        padding: 1rem;
    }
    .gallery-lightbox-close {
        top: -2.5rem;
        font-size: 2rem;
    }
}`;

const lightboxHtml = `<div class="gallery-lightbox" id="gallery-lightbox" aria-modal="true" role="dialog" aria-label="Image preview">
  <div class="gallery-lightbox-content">
    <button class="gallery-lightbox-close" id="gallery-lightbox-close" aria-label="Close" type="button">&times;</button>
    <img class="gallery-lightbox-img" id="gallery-lightbox-img" src="" alt="">
    <p class="gallery-lightbox-caption" id="gallery-lightbox-caption"></p>
  </div>
</div>`;

const lightboxJs = `<script>
(function(){
  const lb = document.getElementById('gallery-lightbox');
  const img = document.getElementById('gallery-lightbox-img');
  const cap = document.getElementById('gallery-lightbox-caption');
  const close = document.getElementById('gallery-lightbox-close');
  if (!lb || !img || !close) return;
  function open(src, caption) {
    img.src = src;
    img.alt = caption || '';
    cap.textContent = caption || '';
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
    close.focus();
  }
  function closeLb() {
    lb.classList.remove('active');
    img.src = '';
    document.body.style.overflow = '';
  }
  document.querySelectorAll('.gallery-item[data-full-src]').forEach(item => {
    item.addEventListener('click', () => open(item.dataset.fullSrc, item.dataset.caption));
    item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(item.dataset.fullSrc, item.dataset.caption); } });
  });
  close.addEventListener('click', closeLb);
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && lb.classList.contains('active')) closeLb(); });
})();
</script>`;

function injectLightbox(html) {
  // Inject CSS into <head>
  if (!html.includes('.gallery-lightbox')) {
    html = html.replace('</head>', `  <style>\n${lightboxCss}\n  </style>\n</head>`);
  }
  // Inject markup and JS before closing </body>
  if (!html.includes('id="gallery-lightbox"')) {
    html = html.replace('</body>', `${lightboxHtml}\n${lightboxJs}\n</body>`);
  }
  return html;
}

const sites = fs.readdirSync(sitesDir).filter(id => {
  const galleryPath = path.join(sitesDir, id, 'gallery', 'index.html');
  return fs.existsSync(galleryPath);
});

let updated = 0;
let skipped = 0;
let cssUpdated = 0;

for (const siteId of sites) {
  const galleryPath = path.join(sitesDir, siteId, 'gallery', 'index.html');
  const cssPath = path.join(sitesDir, siteId, 'styles.css');
  
  let galleryHtml = fs.readFileSync(galleryPath, 'utf8');
  
  if (galleryData[siteId]) {
    const newGrid = generateGalleryHtml(siteId, galleryData[siteId]);
    galleryHtml = replaceGalleryGrid(galleryHtml, newGrid);
    galleryHtml = injectLightbox(galleryHtml);
    fs.writeFileSync(galleryPath, galleryHtml, 'utf8');
    updated++;
  } else {
    skipped++;
  }
  
  if (fs.existsSync(cssPath)) {
    let css = fs.readFileSync(cssPath, 'utf8');
    if (!css.includes('.gallery-img {')) {
      css = css.replace(
        '.gallery-caption {',
        `.gallery-img {
    width: 100%;
    aspect-ratio: 4/3;
    object-fit: cover;
    display: block;
    border-bottom: 1px solid rgba(255,215,0,0.1);
    transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), filter 0.6s ease;
}
.gallery-item:hover .gallery-img {
    transform: scale(1.03);
    filter: brightness(1.08);
}
.gallery-caption {`
      );
      fs.writeFileSync(cssPath, css, 'utf8');
      cssUpdated++;
    }
  }
}

console.log(`Gallery updates: ${updated} sites updated, ${skipped} skipped (no data or already done)`);
console.log(`CSS updates: ${cssUpdated} sites`);
console.log(`Total sites checked: ${sites.length}`);
