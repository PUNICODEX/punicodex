const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const ROOT = path.join(__dirname, '..');
const srcRoot = path.join(ROOT, 'extended flagship materials', 'punycodex');

const jobs = [
  { id: 'aither', folder: 'Aither', video: 'aither_hero_video.mp4' },
  { id: 'anat', folder: 'Anat', video: 'anat_hero_video.mp4' },
  { id: 'baal', folder: 'Baal', video: 'baal_hero_video.mp4' },
  { id: 'chaos', folder: 'Chaos', video: 'chaos_hero_video_phenomenon.mp4' },
  { id: 'ea', folder: 'Ea', video: 'ea_hero_video.mp4' },
  { id: 'enlil', folder: 'Enlil', video: 'enlil_hero_video.mp4' },
  { id: 'ishtar', folder: 'Ishtar', video: 'ishtar_hero_video.mp4' },
  { id: 'kronos', folder: 'Kronos', video: 'kronos_hero_video.mp4' },
  { id: 'asherah', folder: 'Asherah', video: 'asherah_hero_video.mp4' },
  { id: 'el', folder: 'El', video: 'el_hero_video.mp4' },
  { id: 'tartaros', folder: 'Tartaros', video: 'tartaros_hero_video.mp4' },
  { id: 'typhon', folder: 'Typhon', video: 'typhon_hero_video.mp4' },
];

function run(args) {
  const result = spawnSync(ffmpeg, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed with code ${result.status}`);
  }
}

for (const job of jobs) {
  const outDir = path.join(ROOT, 'sites', job.id, 'assets');
  fs.mkdirSync(outDir, { recursive: true });
  const input = path.join(srcRoot, job.folder, job.video);
  const webm = path.join(outDir, `${job.id}_hero_video.webm`);
  const mp4 = path.join(outDir, `${job.id}_hero_video.mp4`);
  const poster = path.join(outDir, `${job.id}_hero_poster.jpg`);

  if (fs.existsSync(webm) && fs.existsSync(mp4) && fs.existsSync(poster)) {
    console.log(`\n▸ ${job.id}: already converted`);
    continue;
  }

  console.log(`\n▸ ${job.id}: ${job.video}`);

  // WebM (VP9) portrait
  run([
    '-y', '-i', input,
    '-c:v', 'libvpx-vp9',
    '-crf', '34', '-b:v', '0',
    '-vf', 'scale=720:-2',
    '-an', '-movflags', '+faststart',
    webm
  ]);

  // Compressed MP4 fallback (H.264)
  run([
    '-y', '-i', input,
    '-c:v', 'libx264',
    '-crf', '26', '-preset', 'fast',
    '-vf', 'scale=720:-2',
    '-an', '-movflags', '+faststart',
    mp4
  ]);

  // Poster (first frame)
  run([
    '-y', '-i', input,
    '-ss', '00:00:00.000',
    '-vframes', '1',
    '-q:v', '2',
    poster
  ]);

  const stats = {
    webm: fs.statSync(webm).size,
    mp4: fs.statSync(mp4).size,
    poster: fs.statSync(poster).size
  };
  console.log(`  webm ${(stats.webm/1024/1024).toFixed(2)} MB, mp4 ${(stats.mp4/1024/1024).toFixed(2)} MB, poster ${(stats.poster/1024).toFixed(0)} KB`);
}

console.log('\n✓ All videos converted.');
