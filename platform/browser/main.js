const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

const SERVER_PORT = 3456;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const SERVER_SCRIPT = path.join(__dirname, '..', 'server.js');
const PLATFORM_DIR = path.join(__dirname, '..');

let mainWindow;
let serverProcess;
let serverReady = false;

// ═══════════════════════════════════════════════════════════
// THE CANON — Offline Lexicon (loaded into memory)
// ═══════════════════════════════════════════════════════════

const LEXICON_PATH = path.join(__dirname, 'renderer', 'lexicon.json');
const SESSION_PATH = path.join(app.getPath('userData'), 'punycodex-session.json');
let lexicon = null;

function loadLexicon() {
  try {
    const raw = require('node:fs').readFileSync(LEXICON_PATH, 'utf8');
    lexicon = JSON.parse(raw);
    console.log(
      `[Main] Canon loaded: ${lexicon.totalEntries} entries, ${lexicon.totalBreakdowns} breakdowns`
    );
  } catch (err) {
    console.error('[Main] Canon could not be loaded:', err.message);
    lexicon = { entries: [], breakdowns: [], pantheons: [] };
  }
}

function searchLexicon(query) {
  if (!lexicon?.entries) return [];
  const q = query.toLowerCase();
  return lexicon.entries.filter(
    (e) =>
      e.ascii?.toLowerCase().includes(q) ||
      e.unicode?.toLowerCase().includes(q) ||
      e.greek?.toLowerCase().includes(q) ||
      e.meaning?.toLowerCase().includes(q)
  );
}

function getLexiconEntry(id) {
  if (!lexicon?.entries) return null;
  const entry = lexicon.entries.find((e) => e.id === id);
  if (!entry) return null;
  return {
    ...entry,
    breakdown: (lexicon.breakdowns || []).filter((b) => b.entryId === id),
  };
}

function getLexiconVariants(id) {
  if (!lexicon?.entries) return [];
  const entry = lexicon.entries.find((e) => e.id === id);
  if (!entry) return [];
  return lexicon.entries.filter((e) => e.ascii === entry.ascii && e.id !== id);
}

loadLexicon();

// ═══════════════════════════════════════════════════════════
// THE ORACLE — Server Lifecycle
// ═══════════════════════════════════════════════════════════

function startServer() {
  return new Promise((resolve, reject) => {
    console.log('[Main] Kindling the Oracle...');

    serverProcess = spawn('node', [SERVER_SCRIPT], {
      cwd: PLATFORM_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: String(SERVER_PORT) },
    });

    let stdoutBuffer = '';
    let hasResolved = false;

    serverProcess.stdout.on('data', (data) => {
      const text = data.toString();
      stdoutBuffer += text;
      console.log(`[Oracle] ${text.trim()}`);

      if (
        !hasResolved &&
        (stdoutBuffer.includes(`localhost:${SERVER_PORT}`) ||
          stdoutBuffer.includes('running on') ||
          stdoutBuffer.includes('Server running'))
      ) {
        hasResolved = true;
        serverReady = true;
        console.log('[Main] Oracle flame detected');
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Oracle] ${data.toString().trim()}`);
    });

    serverProcess.on('error', (err) => {
      if (!hasResolved) {
        hasResolved = true;
        reject(err);
      }
    });

    serverProcess.on('exit', (code) => {
      console.log(`[Main] Oracle extinguished. Code: ${code}`);
      serverReady = false;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('server-died');
      }
    });

    // Fallback: assume ready after 6 seconds
    setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        serverReady = true;
        console.log('[Main] Oracle kindled (timeout fallback)');
        resolve();
      }
    }, 6000);
  });
}

function stopServer() {
  if (serverProcess) {
    console.log('[Main] Extinguishing the Oracle...');
    serverProcess.kill();
    serverProcess = null;
    serverReady = false;
  }
}

async function restartServer() {
  stopServer();
  await new Promise((r) => setTimeout(r, 500));
  return startServer();
}

// ═══════════════════════════════════════════════════════════
// WINDOW
// ═══════════════════════════════════════════════════════════

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0806',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ═══════════════════════════════════════════════════════════
// APP LIFECYCLE
// ═══════════════════════════════════════════════════════════

app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
  } catch (err) {
    console.error('[Main] The Oracle refused to kindle:', err);
    serverReady = false;
    createWindow();
  }
});

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  stopServer();
});

// ═══════════════════════════════════════════════════════════
// IPC HANDLERS
// ═══════════════════════════════════════════════════════════

ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('open-external', (_event, url) => {
  shell.openExternal(url);
});

// Platform API proxy
ipcMain.handle('api-get', async (_event, endpoint) => {
  try {
    const url = `${SERVER_URL}${endpoint}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return { ok: false, status: response.status, error: response.statusText };
    const data = await response.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Health check
ipcMain.handle('api-health', async () => {
  try {
    const response = await fetch(`${SERVER_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return { ok: false };
    const data = await response.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Server control
ipcMain.handle('server-status', () => ({ ready: serverReady, url: SERVER_URL }));
ipcMain.handle('server-restart', async () => {
  try {
    await restartServer();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// URL validation & punycode conversion
ipcMain.handle('normalize-url', (_event, input) => normalizeInput(input));

// Offline Lexicon — The Canon (always available)
ipcMain.handle('lexicon-search', (_event, query) => searchLexicon(query));
ipcMain.handle('lexicon-entry', (_event, id) => getLexiconEntry(id));
ipcMain.handle('lexicon-variants', (_event, id) => getLexiconVariants(id));
ipcMain.handle('lexicon-stats', () => ({
  total: lexicon?.totalEntries || 0,
  pantheons: lexicon?.pantheons || [],
}));

// Session persistence — sacred chronicle
ipcMain.handle('save-session', (_event, urls) => {
  try {
    fs.writeFileSync(SESSION_PATH, JSON.stringify({ urls, savedAt: new Date().toISOString() }));
  } catch (err) {
    console.error('[Main] Chronicle inscription failed:', err.message);
  }
});

ipcMain.handle('get-session', () => {
  try {
    const data = JSON.parse(fs.readFileSync(SESSION_PATH, 'utf8'));
    return data.urls || [];
  } catch {
    return [];
  }
});

function normalizeInput(input) {
  const trimmed = input.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return { type: 'url', url: trimmed };
  }

  if (trimmed.startsWith('xn--')) {
    try {
      const unicode = require('node:url').domainToUnicode(trimmed);
      return { type: 'punycode', punycode: trimmed, unicode, url: `https://${trimmed}` };
    } catch (_e) {
      return { type: 'search', query: trimmed };
    }
  }

  if (/\.[a-z]{2,}$/i.test(trimmed)) {
    const hasNonAscii = /[^\x00-\x7F]/.test(trimmed);
    if (hasNonAscii) {
      try {
        const punycode = require('node:url').domainToASCII(trimmed);
        return { type: 'unicode-domain', domain: trimmed, punycode, url: `https://${punycode}` };
      } catch (_e) {
        return { type: 'search', query: trimmed };
      }
    }
    return { type: 'url', url: `https://${trimmed}` };
  }

  return { type: 'search', query: trimmed };
}
