/**
 * PÚNYCODEX Type Extension — Build Script
 * Creates a ZIP package for Chrome Web Store submission.
 * Run: node extension/build.js
 */

const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');

const pipelineAsync = promisify(pipeline);

// Check if archiver is available
try {
    require.resolve('archiver');
} catch {
    console.log('Installing archiver...');
    require('child_process').execSync('npm install archiver --no-save', { cwd: __dirname, stdio: 'inherit' });
}

const archiver = require('archiver');

const EXT_DIR = __dirname;
const OUT_FILE = path.join(EXT_DIR, 'punycodex-type-extension.zip');

const output = createWriteStream(OUT_FILE);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
    const sizeKB = (archive.pointer() / 1024).toFixed(1);
    console.log(`✓ Packaged: ${OUT_FILE} (${sizeKB} KB)`);
});

archive.on('error', (err) => {
    throw err;
});

archive.pipe(output);

// Add all extension files
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
    'icons/icon16.png',
    'icons/icon32.png',
    'icons/icon48.png',
    'icons/icon128.png',
];

files.forEach(file => {
    const fullPath = path.join(EXT_DIR, file);
    if (fs.existsSync(fullPath)) {
        archive.file(fullPath, { name: file });
    } else {
        console.warn(`⚠ Missing: ${file}`);
    }
});

archive.finalize();
