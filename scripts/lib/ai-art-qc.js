'use strict';

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const PORTRAIT_FAMILIES = new Set(['tattoo', 'bw-engraving', 'realism', 'oil', 'masterpiece']);
const HARD_QUALITY_FLAGS = new Set([
  'unreadable-image',
  'invalid-dimensions',
  'low-resolution',
  'unexpected-aspect',
  'small-file',
  'low-detail',
  'tattoo-edge-contact',
  'tattoo-margin-marks',
]);

function hasHardQualityFlags(flags) {
  return flags.some((flag) => HARD_QUALITY_FLAGS.has(flag.split('(')[0]));
}

async function edgeContactFlags(file, family) {
  if (family !== 'tattoo') return [];
  try {
    const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const band = 4;
    const darkThreshold = 235;
    let edgePixels = 0;
    const visit = (x, y) => {
      const i = (y * info.width + x) * 3;
      if (Math.max(data[i], data[i + 1], data[i + 2]) <= darkThreshold) edgePixels++;
    };
    for (let x = 0; x < info.width; x++) {
      for (let y = 0; y < Math.min(band, info.height); y++) visit(x, y);
      for (let y = Math.max(0, info.height - band); y < info.height; y++) visit(x, y);
    }
    for (let y = Math.min(band, info.height); y < Math.max(0, info.height - band); y++) {
      for (let x = 0; x < Math.min(band, info.width); x++) visit(x, y);
      for (let x = Math.max(0, info.width - band); x < info.width; x++) visit(x, y);
    }
    return edgePixels > 20 ? [`tattoo-edge-contact(${edgePixels} dark border pixels)`] : [];
  } catch {
    return [];
  }
}

async function marginMarkFlags(file, family) {
  if (family !== 'tattoo') return [];
  try {
    const { data, info } = await sharp(file)
      .removeAlpha()
      .resize(192, 256, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width, height } = info;
    const dark = new Uint8Array(width * height);
    for (let i = 0; i < dark.length; i++) {
      const offset = i * 3;
      dark[i] = Math.min(data[offset], data[offset + 1], data[offset + 2]) < 240 ? 1 : 0;
    }
    const visited = new Uint8Array(width * height);
    const inMargin = (x, y) => y >= height * 0.65 && (x < width * 0.22 || x >= width * 0.78);
    let isolatedMarginPixels = 0;
    for (let index = 0; index < dark.length; index++) {
      if (!dark[index] || visited[index]) continue;
      const stack = [index];
      visited[index] = 1;
      let minX = width;
      let maxX = 0;
      let minY = height;
      let maxY = 0;
      let pixels = 0;
      let touchesMargin = false;
      while (stack.length) {
        const current = stack.pop();
        const x = current % width;
        const y = Math.floor(current / width);
        pixels++;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        if (inMargin(x, y)) touchesMargin = true;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const next = ny * width + nx;
            if (dark[next] && !visited[next]) {
              visited[next] = 1;
              stack.push(next);
            }
          }
        }
      }
      const componentWidth = maxX - minX + 1;
      const componentHeight = maxY - minY + 1;
      if (touchesMargin && componentWidth <= width * 0.2 && componentHeight <= height * 0.45) {
        isolatedMarginPixels += pixels;
      }
    }
    const estimatedOriginalPixels = isolatedMarginPixels * 16;
    return estimatedOriginalPixels > 20
      ? [`tattoo-margin-marks(${estimatedOriginalPixels} isolated corner pixels)`]
      : [];
  } catch {
    return [];
  }
}

async function imageQualityFlags(file, family) {
  const flags = [];
  let meta;
  let stats;
  try {
    const image = sharp(file);
    meta = await image.metadata();
    stats = await image.stats();
  } catch {
    return ['unreadable-image'];
  }
  if (!meta.width || !meta.height) flags.push('invalid-dimensions');
  if (meta.width < 600 || meta.height < 600) flags.push(`low-resolution(${meta.width}x${meta.height})`);
  const actualRatio = meta.width / meta.height;
  const expectedRatio = PORTRAIT_FAMILIES.has(family) ? 3 / 4 : 1;
  if (Math.abs(actualRatio - expectedRatio) > 0.04) {
    flags.push(`unexpected-aspect(${actualRatio.toFixed(2)}, expected ${expectedRatio.toFixed(2)})`);
  }
  const bytes = fs.statSync(file).size;
  if (bytes < 20 * 1024) flags.push(`small-file(${Math.round(bytes / 1024)}KB)`);
  const channelEntropy = stats.channels.reduce((sum, channel) => sum + (channel.entropy || 0), 0) / stats.channels.length;
  const entropy = Number.isFinite(stats.entropy) ? stats.entropy : channelEntropy;
  if (entropy < 0.8) flags.push(`low-detail(entropy ${entropy.toFixed(2)})`);
  flags.push(...(await edgeContactFlags(file, family)));
  flags.push(...(await marginMarkFlags(file, family)));
  return [...new Set(flags)];
}

function latestVerdicts(logPath) {
  if (!fs.existsSync(logPath)) return new Map();
  const verdicts = new Map();
  for (const line of fs.readFileSync(logPath, 'utf8').trim().split('\n')) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      if (entry.file) verdicts.set(path.basename(entry.file), entry);
    } catch {}
  }
  return verdicts;
}

function familyTag(family) {
  return family === 'classic-gold' ? '' : `${family}-`;
}

function artifactState(directory) {
  if (directory.endsWith(`${path.sep}keepers`)) return 'keeper';
  if (directory.endsWith(`${path.sep}review`)) return 'review';
  return 'pending';
}

function deityFromArtifact(base, family, library) {
  const tag = familyTag(family);
  const match = base.match(new RegExp(`^(.+)-${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}v(\\d+)\\.(\\d+)\\.jpg$`));
  if (!match) return null;
  return { deity: match[1], promptVersion: Number(match[2]), variant: Number(match[3]) };
}

function scanArtwork({ root, family, libraryPath, logPath }) {
  const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
  const verdicts = latestVerdicts(logPath);
  const artifacts = [];
  for (const directory of [path.join(root, 'ai-art'), path.join(root, 'ai-art', 'keepers'), path.join(root, 'ai-art', 'review')]) {
    if (!fs.existsSync(directory)) continue;
    for (const base of fs.readdirSync(directory).filter((file) => file.endsWith('.jpg')).sort()) {
      const parsed = deityFromArtifact(base, family, library);
      if (!parsed || !library.deities[parsed.deity]) continue;
      const file = path.join(directory, base);
      const verdict = verdicts.get(base) || null;
      const spec = library.deities[parsed.deity];
      const autoFlags = verdict?.autoFlags || [];
      const priority =
        (artifactState(directory) === 'pending' ? 100 : 0) +
        (artifactState(directory) === 'review' ? 40 : 0) +
        autoFlags.length * 20 +
        (spec.demandTier === 1 ? 15 : spec.demandTier === 2 ? 8 : 0) +
        (spec.activeMutations || []).filter((mutation) => ['wrong-attributes', 'wrong-tradition', 'garbled-text', 'cropped-subject'].includes(mutation)).length * 10;
      artifacts.push({
        id: `${parsed.deity}-${familyTag(family)}v${parsed.promptVersion}.${parsed.variant}`,
        deity: parsed.deity,
        family,
        promptVersion: parsed.promptVersion,
        variant: parsed.variant,
        file: path.relative(root, file).split(path.sep).join('/'),
        state: artifactState(directory),
        verdict: verdict?.verdict || 'pending',
        reason: verdict?.reason || null,
        autoFlags,
        demandTier: spec.demandTier || 3,
        activeMutations: spec.activeMutations || [],
        priority,
      });
    }
  }
  return artifacts.sort((a, b) => b.priority - a.priority || a.file.localeCompare(b.file));
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);
}

async function writeContactSheet({ items, output, title, root, perPage = 48 }) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const pages = [];
  for (let start = 0; start < items.length; start += perPage) {
    const pageItems = items.slice(start, start + perPage);
    const cards = [];
    for (const item of pageItems) {
      const absolute = path.join(root, item.file);
      const thumbnail = await sharp(absolute).resize(192, 256, { fit: 'inside' }).jpeg({ quality: 78 }).toBuffer();
      const flags = item.autoFlags.length ? item.autoFlags.join('; ') : 'no automatic flags';
      cards.push(`<figure class="card">
  <img src="data:image/jpeg;base64,${thumbnail.toString('base64')}" alt="${escapeHtml(item.id)}" loading="lazy">
  <figcaption>
    <code>${escapeHtml(item.id)}</code>
    <span class="state ${escapeHtml(item.state)}">${escapeHtml(item.state)} · ${escapeHtml(item.verdict)}${item.reason ? ` · ${escapeHtml(item.reason)}` : ''}</span>
    <span class="flags">${escapeHtml(flags)}</span>
    <span class="how"><code>node scripts/curate-ai-art.js ${escapeHtml(item.file)} keep|reject &lt;reason&gt;</code></span>
  </figcaption>
</figure>`);
    }
    const pageNumber = pages.length + 1;
    const previous = pageNumber > 1 ? `<a class="page" href="page-${pageNumber - 1}.html">← Previous</a>` : '';
    const next = start + perPage < items.length ? `<a class="page" href="page-${pageNumber + 1}.html">Next →</a>` : '';
    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)} · ${pageNumber}</title><meta name="robots" content="noindex">
<style>
body{background:#0b0a08;color:#d8cfb8;font-family:Georgia,serif;margin:0;padding:2rem}h1{font-weight:400;letter-spacing:.14em;color:#d4af37}p{color:#8a7a52}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1rem}.card{margin:0;background:#14110c;border:1px solid #3a2f1a;border-radius:8px;overflow:hidden}.card img{width:100%;height:220px;object-fit:contain;display:block;background:#f4efe4}.card figcaption{padding:.65rem .7rem;font-size:.68rem;display:flex;flex-direction:column;gap:.28rem}code{color:#e8c860;font-size:.66rem;word-break:break-all}.state{text-transform:uppercase;letter-spacing:.1em;font-size:.6rem}.state.pending{color:#9fd29f}.state.review{color:#e2a75f}.state.keeper{color:#d4af37}.flags{color:#c9b584}.how{color:#6b6046}.pager{display:flex;gap:1rem;margin-top:1.5rem}.page{color:#d4af37;text-decoration:none;border:1px solid #4a3a1d;padding:.45rem .8rem;border-radius:4px}</style></head><body>
<h1>${escapeHtml(title)}</h1><p>${items.length} works · page ${pageNumber} of ${Math.ceil(items.length / perPage) || 1} · priority-sorted for human curation.</p>
<div class="grid">${cards.join('\n')}</div><div class="pager">${previous}${next}</div></body></html>`;
    const name = pageNumber === 1 ? path.basename(output) : `page-${pageNumber}.html`;
    const pagePath = path.join(path.dirname(output), name);
    fs.writeFileSync(pagePath, html);
    pages.push(path.relative(root, pagePath).split(path.sep).join('/'));
  }
  return pages;
}

async function inspectArtifacts(root, family, artifacts) {
  const inspected = [];
  for (const artifact of artifacts) {
    const flags = await imageQualityFlags(path.join(root, artifact.file), family);
    inspected.push({ ...artifact, qualityFlags: flags, priority: artifact.priority + flags.length * 20 });
  }
  return inspected.sort((a, b) => b.priority - a.priority || a.file.localeCompare(b.file));
}

module.exports = {
  HARD_QUALITY_FLAGS,
  edgeContactFlags,
  hasHardQualityFlags,
  imageQualityFlags,
  inspectArtifacts,
  latestVerdicts,
  marginMarkFlags,
  scanArtwork,
  writeContactSheet,
};
