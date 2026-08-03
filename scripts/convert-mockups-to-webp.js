/** One-off/ops: convert .masters/mockups/*.jpg to .webp (store webp sources). */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const DIR = path.join(__dirname, '..', '.masters', 'mockups');

(async () => {
  const jpgs = fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.jpg'));
  let done = 0;
  let skipped = 0;
  const errors = [];
  const CONCURRENCY = 8;
  for (let i = 0; i < jpgs.length; i += CONCURRENCY) {
    await Promise.all(
      jpgs.slice(i, i + CONCURRENCY).map(async (name) => {
        const src = path.join(DIR, name);
        const dst = src.replace(/\.jpg$/i, '.webp');
        if (fs.existsSync(dst)) {
          skipped++;
          return;
        }
        try {
          await sharp(src).webp({ quality: 82 }).toFile(dst);
          done++;
        } catch (err) {
          errors.push(`${name}: ${err.message}`);
        }
      })
    );
    if ((i / CONCURRENCY) % 50 === 0) console.log(`progress: ${i + CONCURRENCY}/${jpgs.length}`);
  }
  console.log(`converted: ${done}, already existed: ${skipped}, errors: ${errors.length}`);
  if (errors.length) console.log(errors.slice(0, 10).join('\n'));
})();
