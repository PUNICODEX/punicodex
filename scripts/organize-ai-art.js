#!/usr/bin/env node
/**
 * PuniCodex — AI art organizer: sort generations by verdict, build the
 * human review contact sheet.
 *
 * Rejects are NOT waste — they move to ai-art/review/ with an HTML contact
 * sheet (ai-art/review/index.html) so a human second pass can catch gems
 * the curator missed. Keeps move to ai-art/keepers/. Idempotent: re-running
 * after new verdicts only moves what changed.
 *
 *   node scripts/organize-ai-art.js          — sort + rebuild the sheet
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const ART = path.join(ROOT, 'ai-art');
const KEEPERS = path.join(ART, 'keepers');
const REVIEW = path.join(ART, 'review');
const LOG = path.join(ROOT, 'data', 'ai-art', 'generation-log.jsonl');

fs.mkdirSync(KEEPERS, { recursive: true });
fs.mkdirSync(REVIEW, { recursive: true });

// Latest verdict per file (the log is append-only; later entries win).
const verdicts = new Map();
for (const line of fs.readFileSync(LOG, 'utf8').trim().split('\n')) {
  const e = JSON.parse(line);
  if (e.file) verdicts.set(path.basename(e.file), e);
}

let moved = 0;
for (const [base, e] of verdicts) {
  // Only SORTED works move: keeps -> keepers, explicit rejects -> review.
  // Pending (awaiting curation) and errors stay in the curation inbox.
  if (e.verdict !== 'keep' && e.verdict !== 'reject') continue;
  const src = path.join(ART, base);
  if (!fs.existsSync(src)) continue;
  const destDir = e.verdict === 'keep' ? KEEPERS : REVIEW;
  const dest = path.join(destDir, base);
  if (fs.existsSync(dest)) {
    fs.unlinkSync(src);
    continue;
  }
  fs.renameSync(src, dest);
  moved++;
}

// Human review contact sheet — every reject, one glance, promote instructions.
const rejects = [...verdicts.entries()]
  .filter(([b, e]) => e.verdict && e.verdict !== 'keep')
  .filter(([b]) => fs.existsSync(path.join(REVIEW, b)))
  .sort(([a], [b]) => a.localeCompare(b));

const esc = (s) =>
  String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cards = rejects
  .map(([base, e]) => {
    const img = fs.readFileSync(path.join(REVIEW, base));
    const b64 = img.toString('base64');
    return `<figure class="card">
  <img src="data:image/jpeg;base64,${b64}" alt="${esc(base)}" loading="lazy">
  <figcaption><code>${esc(base)}</code><span class="reason">${esc(e.reason || e.verdict)}</span>
  <span class="how">promote: <code>node scripts/curate-ai-art.js ai-art/review/${esc(base)} keep --promote</code></span></figcaption>
</figure>`;
  })
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>PuniCodex — AI art review</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="https://punicodex.com/store/art/">
<style>
body{background:#0b0a08;color:#d8cfb8;font-family:Georgia,serif;margin:0;padding:2rem}
h1{font-weight:400;letter-spacing:.14em;color:#d4af37}
p{color:#8a7a52}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1.2rem}
.card{margin:0;background:#14110c;border:1px solid #3a2f1a;border-radius:8px;overflow:hidden}
.card img{width:100%;display:block}
.card figcaption{padding:.7rem .8rem;font-size:.75rem;display:flex;flex-direction:column;gap:.3rem}
code{color:#e8c860;font-size:.7rem;word-break:break-all}
.reason{color:#c9b584;text-transform:uppercase;letter-spacing:.12em;font-size:.62rem}
.how{color:#6b6046}
</style></head><body>
<h1>SECOND PASS · ${rejects.length} REJECTED WORKS</h1>
<p>The curator's rejects — gems hide here. To promote one into the keepers:
run the command under it (it flips the verdict, corrects the library stats, and moves the file).</p>
<div class="grid">
${cards}
</div></body></html>`;
fs.writeFileSync(path.join(REVIEW, 'index.html'), html);
console.log(`organized: ${moved} moved | keepers ${fs.readdirSync(KEEPERS).length} | review ${rejects.length} (sheet at ai-art/review/index.html)`);
