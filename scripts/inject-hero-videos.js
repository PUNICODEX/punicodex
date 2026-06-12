const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const sites = [
  {
    id: 'anat',
    label: 'Anat, Canaanite goddess of war and the hunt',
    fallbackAlt: 'ꜥAnat — Goddess of War and the Hunt'
  },
  {
    id: 'chaos',
    label: 'Cháos, the first void',
    fallbackAlt: 'Cháos — The First Void'
  },
  {
    id: 'enlil',
    label: 'Enlīl, Sumerian god of wind and kingship',
    fallbackAlt: 'Enlīl — Wind, Air, Storms, Kingship'
  },
  {
    id: 'ishtar',
    label: 'Ištar, Mesopotamian queen of heaven and war',
    fallbackAlt: 'Ištar — Love, War, Fertility, Venus'
  },
  {
    id: 'asherah',
    label: 'ʿAsherah, Canaanite mother goddess',
    fallbackAlt: 'ꜥAsherah — Mother Goddess, Lady of the Sea'
  },
  {
    id: 'el',
    label: 'Ēl, supreme Canaanite god',
    fallbackAlt: 'Ēl — God, Father of Gods'
  },
  {
    id: 'typhon',
    label: 'Typhōn, father of monsters',
    fallbackAlt: 'Typhōn — Monster, Father of Monsters, Storms'
  }
];

const cssBlock = `

/* ===== HERO VIDEO PORTRAIT ===== */
.endorsement-mascot--video {
    position: relative;
    display: inline-block;
    margin: 0 auto 1.25rem;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45), 0 0 30px rgba(212, 175, 55, 0.15);
    border: 1px solid rgba(212, 175, 55, 0.18);
    max-width: 220px;
}

.endorsement-mascot--video video,
.endorsement-mascot--video img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 9 / 16;
    object-fit: cover;
    border-radius: 24px;
}

.video-pause {
    position: absolute;
    bottom: 12px;
    right: 12px;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font-size: 0.75rem;
    line-height: 1;
    cursor: pointer;
    backdrop-filter: blur(4px);
    transition: background 0.2s ease, transform 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.video-pause:hover,
.video-pause:focus {
    background: rgba(0, 0, 0, 0.75);
    transform: scale(1.05);
    outline: none;
}

.video-pause[aria-label="Play animation"]::after {
    content: "▶";
}

.video-pause[aria-label="Pause animation"]::after {
    content: "❚❚";
}

@media (max-width: 480px) {
    .endorsement-mascot--video {
        max-width: 160px;
        border-radius: 18px;
    }

    .endorsement-mascot--video video,
    .endorsement-mascot--video img {
        border-radius: 18px;
    }
}
`;

const jsBlock = `

// ===== HERO VIDEO PAUSE/PLAY TOGGLE =====
(function() {
  const figure = document.querySelector('.endorsement-mascot--video');
  if (!figure) return;
  const video = figure.querySelector('video');
  const btn = figure.querySelector('.video-pause');
  if (!video || !btn) return;

  btn.addEventListener('click', () => {
    if (video.paused) {
      video.play();
      btn.setAttribute('aria-label', 'Pause animation');
      btn.textContent = '❚❚';
    } else {
      video.pause();
      btn.setAttribute('aria-label', 'Play animation');
      btn.textContent = '▶';
    }
  });
})();
`;

for (const site of sites) {
  const siteDir = path.join(ROOT, 'sites', site.id);
  const htmlPath = path.join(siteDir, 'index.html');
  const cssPath = path.join(siteDir, 'styles.css');
  const jsPath = path.join(siteDir, 'script.js');

  // Inject video into hero
  let html = fs.readFileSync(htmlPath, 'utf8');
  const mascotRegex = /<div class="endorsement-mascot">\s*<picture>.*?<\/picture>\s*<\/div>/s;
  const replacement = `<figure class="endorsement-mascot endorsement-mascot--video">
                    <video autoplay muted loop playsinline
                           poster="assets/${site.id}_hero_poster.jpg"
                           aria-label="Animated portrait of ${site.label}">
                        <source src="assets/${site.id}_hero_video.webm" type="video/webm">
                        <source src="assets/${site.id}_hero_video.mp4" type="video/mp4">
                        <img src="assets/${site.id}_mascot.png" alt="${site.fallbackAlt}">
                    </video>
                    <button class="video-pause" aria-label="Pause animation">❚❚</button>
                </figure>`;
  if (!mascotRegex.test(html)) {
    console.log(`  ⚠️ ${site.id}: mascot block not found, skipping HTML injection`);
  } else {
    html = html.replace(mascotRegex, replacement);
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`✓ ${site.id}: video injected into index.html`);
  }

  // Inject CSS
  let css = fs.readFileSync(cssPath, 'utf8');
  if (!css.includes('HERO VIDEO PORTRAIT')) {
    css += cssBlock;
    fs.writeFileSync(cssPath, css, 'utf8');
    console.log(`✓ ${site.id}: video CSS added`);
  } else {
    console.log(`  ${site.id}: video CSS already present`);
  }

  // Inject JS
  let js = fs.readFileSync(jsPath, 'utf8');
  if (!js.includes('HERO VIDEO PAUSE/PLAY TOGGLE')) {
    js += jsBlock;
    fs.writeFileSync(jsPath, js, 'utf8');
    console.log(`✓ ${site.id}: video JS added`);
  } else {
    console.log(`  ${site.id}: video JS already present`);
  }
}

console.log('\n✓ Hero video integration complete.');
