/**
 * PuniCodex Type Extension — Build Script
 * Creates a ZIP package for Chrome Web Store submission.
 * Run: node extension/build.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EXT_DIR = __dirname;
const OUT_FILE = path.join(EXT_DIR, 'punicodex-type-extension.zip');
const TEMP_DIR = path.join(EXT_DIR, '_build_temp');

// Clean up old build artifacts
if (fs.existsSync(OUT_FILE)) fs.unlinkSync(OUT_FILE);
if (fs.existsSync(TEMP_DIR)) fs.rmSync(TEMP_DIR, { recursive: true });
fs.mkdirSync(TEMP_DIR, { recursive: true });

// Files to include
const files = [
    'manifest.json',
    'background/background.js',
    'content/content.js',
    'content/content.css',
    'popup/popup.html',
    'popup/popup.css',
    'popup/popup.js',
    'options/options.html',
    'options/options.css',
    'options/options.js',
    'shared/engine.js',
    'shared/lexicon.js',
    'shared/lore-catalog.json',
    'icons/icon16.png',
    'icons/icon32.png',
    'icons/icon48.png',
    'icons/icon128.png',
];

let missing = 0;
files.forEach(file => {
    const src = path.join(EXT_DIR, file);
    const dst = path.join(TEMP_DIR, file);
    if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
    } else {
        console.warn(`⚠ Missing: ${file}`);
        missing++;
    }
});

if (missing > 0) {
    console.error(`❌ Build failed: ${missing} file(s) missing`);
    process.exit(1);
}

// Create ZIP using PowerShell Compress-Archive
try {
    execSync(`powershell -Command "Compress-Archive -Path '${TEMP_DIR}\\*' -DestinationPath '${OUT_FILE}' -Force"`, { stdio: 'inherit' });
    const sizeKB = (fs.statSync(OUT_FILE).size / 1024).toFixed(1);
    console.log(`✓ Packaged: ${OUT_FILE} (${sizeKB} KB)`);
} catch (err) {
    console.error('❌ ZIP creation failed:', err.message);
    process.exit(1);
} finally {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}
