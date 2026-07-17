/**
 * PUNICODEX Browser — Electron main process.
 */
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

const IS_DEV = process.env.NODE_ENV === 'development';
const START_URL = IS_DEV
  ? 'http://localhost:3000/browser.html'
  : `file://${path.join(__dirname, '../../platform/public/browser.html')}`;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadURL(START_URL);

  // Open external links in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
