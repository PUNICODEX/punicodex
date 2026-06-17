/**
 * PUNYCODEX Browser — Electron preload script.
 */
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('PunyElectron', {
  platform: process.platform,
});
