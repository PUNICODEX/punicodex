/**
 * PUNICODEX — Build Android launcher icons + splash screens from the canonical brand emblem.
 *
 * Source of truth: assets/brand/01-logos/punicodex-emblem.svg (gold emblem)
 * Generated outputs: android/app/src/main/res/mipmap-<density>/ic_launcher.png,
 *                    ic_launcher_round.png, ic_launcher_foreground.png,
 *                    android/app/src/main/res/drawable-<qualifier>/splash.png
 *                    android/app/src/main/res/values/ic_launcher_background.xml
 *
 * Everything an Android user sees — launcher icon (legacy + adaptive + round),
 * splash screen — renders from ONE canonical emblem so the store listing icon,
 * launcher icon and splash can never drift apart (the exact mismatch class that
 * gets a first production release rejected).
 *
 * GENERATED FILES — DO NOT EDIT BY HAND.
 * Run `node scripts/build-android-brand-assets.js` to regenerate.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const EMBLEM_SVG = path.join(ROOT, 'assets', 'brand', '01-logos', 'punicodex-emblem.svg');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');

// Dark warm black — matches the app's dark theme and the store listing backdrop.
const BG = '#14110C';
// The emblem circle occupies ~90.4% of the SVG viewBox (r=45.2 in a 100 box).
const EMBLEM_FILL = 0.904;

const LAUNCHER_SIZES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const FOREGROUND_SIZES = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
const SPLASHES = [
    ['drawable', 480, 320], // default (land orientation)
    ['drawable-port-mdpi', 320, 480],
    ['drawable-port-hdpi', 480, 800],
    ['drawable-port-xhdpi', 720, 1280],
    ['drawable-port-xxhdpi', 960, 1600],
    ['drawable-port-xxxhdpi', 1280, 1920],
    ['drawable-land-mdpi', 480, 320],
    ['drawable-land-hdpi', 800, 480],
    ['drawable-land-xhdpi', 1280, 720],
    ['drawable-land-xxhdpi', 1600, 960],
    ['drawable-land-xxxhdpi', 1920, 1280],
];

async function emblemRaster(circleDiameterPx) {
    const px = Math.max(2, Math.round(circleDiameterPx / EMBLEM_FILL));
    return sharp(EMBLEM_SVG)
        .resize(px, px, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
}

function roundedSquareSvg(size, radius) {
    return Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
        `<rect width="${size}" height="${size}" rx="${radius}" fill="${BG}"/></svg>`
    );
}

function circleSvg(size, fill) {
    return Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
        `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${fill}"/></svg>`
    );
}

async function buildLauncherIcon(size, round) {
    const emblem = await emblemRaster(size * 0.66);
    const base = sharp(round ? circleSvg(size, BG) : roundedSquareSvg(size, Math.round(size * 0.22)))
        .composite([{ input: emblem, gravity: 'center' }]);
    if (!round) return base.png().toBuffer();
    // Circular mask for the round variant.
    return base
        .composite([{ input: circleSvg(size, '#000'), blend: 'dest-in' }])
        .png()
        .toBuffer();
}

async function buildAdaptiveForeground(size) {
    const emblem = await emblemRaster(size * 0.6); // inside the 66dp safe zone
    return sharp({
        create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
        .composite([{ input: emblem, gravity: 'center' }])
        .png()
        .toBuffer();
}

async function buildSplash(width, height) {
    const emblem = await emblemRaster(Math.min(width, height) * 0.38);
    return sharp({ create: { width, height, channels: 4, background: BG } })
        .composite([{ input: emblem, gravity: 'center' }])
        .png()
        .toBuffer();
}

async function main() {
    for (const [density, size] of Object.entries(LAUNCHER_SIZES)) {
        const dir = path.join(RES, `mipmap-${density}`);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'ic_launcher.png'), await buildLauncherIcon(size, false));
        fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), await buildLauncherIcon(size, true));
        console.log(`mipmap-${density}: ic_launcher.png + ic_launcher_round.png (${size}px)`);
    }
    for (const [density, size] of Object.entries(FOREGROUND_SIZES)) {
        const dir = path.join(RES, `mipmap-${density}`);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
            path.join(dir, 'ic_launcher_foreground.png'),
            await buildAdaptiveForeground(size)
        );
        console.log(`mipmap-${density}: ic_launcher_foreground.png (${size}px)`);
    }
    for (const [dir, w, h] of SPLASHES) {
        const out = path.join(RES, dir);
        fs.mkdirSync(out, { recursive: true });
        fs.writeFileSync(path.join(out, 'splash.png'), await buildSplash(w, h));
        console.log(`${dir}: splash.png (${w}x${h})`);
    }
    // Adaptive-icon background color — must match the splash/launcher backdrop.
    const bgXml = path.join(RES, 'values', 'ic_launcher_background.xml');
    fs.writeFileSync(
        bgXml,
        '<?xml version="1.0" encoding="utf-8"?>\n' +
        `<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`,
        'utf8'
    );
    console.log(`values/ic_launcher_background.xml -> ${BG}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
