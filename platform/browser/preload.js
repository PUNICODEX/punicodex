const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('punycodex', {
  // Navigation
  normalizeUrl: (input) => ipcRenderer.invoke('normalize-url', input),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),

  // Platform API proxy (requires server)
  apiGet: (endpoint) => ipcRenderer.invoke('api-get', endpoint),
  apiHealth: () => ipcRenderer.invoke('api-health'),

  // Server lifecycle
  serverStatus: () => ipcRenderer.invoke('server-status'),
  serverRestart: () => ipcRenderer.invoke('server-restart'),
  onServerDied: (callback) => ipcRenderer.on('server-died', callback),

  // Offline Lexicon — The Canon (always available)
  lexiconSearch: (query) => ipcRenderer.invoke('lexicon-search', query),
  lexiconEntry: (id) => ipcRenderer.invoke('lexicon-entry', id),
  lexiconVariants: (id) => ipcRenderer.invoke('lexicon-variants', id),
  lexiconStats: () => ipcRenderer.invoke('lexicon-stats'),

  // Session persistence — sacred chronicle
  saveSession: (urls) => ipcRenderer.invoke('save-session', urls),
  getSession: () => ipcRenderer.invoke('get-session'),
});
