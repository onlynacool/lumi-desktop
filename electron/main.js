const { app, BrowserWindow, dialog, ipcMain, protocol, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { pathToFileURL, fileURLToPath } = require('url');
const Store = require('electron-store');
const { parseFile } = require('music-metadata');

const store = new Store({ name: 'lumi-data' });

const SUPPORTED_EXT = new Set([
  '.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.opus', '.alac', '.aiff', '.ape', '.wma'
]);

let mainWindow;
let thumBarIsPlaying = false; // track state so we can redraw with correct icon

// ── [2] Minimal PNG generator (no external deps) ──────────────────────────────
// Builds 20×20 RGBA PNGs at runtime for the taskbar thumbnail toolbar buttons.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();
function crc32buf(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32buf(Buffer.concat([tb, data])));
  return Buffer.concat([len, tb, data, crc]);
}
function buildIconPNG(drawFn) {
  const W = 20, H = 20;
  const rgba = new Uint8Array(W * H * 4); // fully transparent
  drawFn(rgba, W, H);
  const raw = Buffer.alloc(H * (W * 4 + 1));
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0; // filter: None
    for (let x = 0; x < W; x++) {
      const s = (y * W + x) * 4, d = y * (W * 4 + 1) + 1 + x * 4;
      raw[d] = rgba[s]; raw[d+1] = rgba[s+1]; raw[d+2] = rgba[s+2]; raw[d+3] = rgba[s+3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}
// Set a white pixel (with bounds check)
function wp(rgba, W, x, y) {
  if (x < 0 || x >= W || y < 0 || y >= 20) return;
  const i = (y * W + x) * 4;
  rgba[i] = rgba[i+1] = rgba[i+2] = 255; rgba[i+3] = 255;
}
// ▶ play
const ICON_PLAY  = nativeImage.createFromBuffer(buildIconPNG((r, W, H) => {
  for (let y = 2; y <= 17; y++) {
    const cols = Math.round((y - 2) * 11 / 15);
    for (let x = 4; x <= 4 + cols; x++) wp(r, W, x, y);
  }
}));
// ⏸ pause
const ICON_PAUSE = nativeImage.createFromBuffer(buildIconPNG((r, W) => {
  for (let y = 3; y <= 16; y++) {
    for (let x = 4; x <= 7; x++) wp(r, W, x, y);
    for (let x = 12; x <= 15; x++) wp(r, W, x, y);
  }
}));
// ⏮ previous
const ICON_PREV  = nativeImage.createFromBuffer(buildIconPNG((r, W) => {
  for (let y = 3; y <= 16; y++) wp(r, W, 4, y); // bar
  for (let y = 3; y <= 16; y++) {
    const cols = Math.round((16 - y) * 9 / 13);
    for (let x = 6; x <= 6 + cols; x++) wp(r, W, x, y);
  }
}));
// ⏭ next
const ICON_NEXT  = nativeImage.createFromBuffer(buildIconPNG((r, W) => {
  for (let y = 3; y <= 16; y++) {
    const cols = Math.round((y - 3) * 9 / 13);
    for (let x = 4; x <= 4 + cols; x++) wp(r, W, x, y);
  }
  for (let y = 3; y <= 16; y++) wp(r, W, 16, y); // bar
}));

// Rebuild and apply the thumbnail toolbar whenever play state changes
function updateThumbar(win, isPlaying) {
  if (!win || win.isDestroyed()) return;
  thumBarIsPlaying = isPlaying;
  win.setThumbarButtons([
    { tooltip: 'Previous', icon: ICON_PREV,
      click() { win.webContents.send('thumbar-cmd', 'prev'); } },
    { tooltip: isPlaying ? 'Pause' : 'Play',
      icon: isPlaying ? ICON_PAUSE : ICON_PLAY,
      click() { win.webContents.send('thumbar-cmd', 'toggle'); } },
    { tooltip: 'Next',     icon: ICON_NEXT,
      click() { win.webContents.send('thumbar-cmd', 'next'); } },
  ]);
}

// Must be registered before app is ready. Marking the scheme "standard" + "stream"
// lets the <audio> element treat it like a normal media source — including seeking
// (Range requests), which plain ad-hoc protocol.handle registration doesn't support well.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'nacsa-file',
    privileges: {
      standard: true,
      secure: true,
      stream: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true
    }
  }
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    icon: path.join(__dirname, 'icon.ico'),
    width: 1280,
    height: 800,
    minWidth: 880,
    minHeight: 600,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '..', 'dist', 'index.html')}`;
  mainWindow.loadURL(startUrl);
}

const MIME_TYPES = {
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.alac': 'audio/mp4',
  '.aiff': 'audio/aiff',
  '.ape': 'audio/x-ape',
  '.wma': 'audio/x-ms-wma'
};

const filePathRegistry = new Map();
function registerSongPaths(songs) {
  for (const s of songs) { if (s.path) filePathRegistry.set(s.id, s.path); }
}

function registerFileProtocol() {
  protocol.handle('nacsa-file', async (request) => {
    let filePath;
    try {
      const url = new URL(request.url);
      const id = decodeURIComponent(url.pathname.replace(/^\//, ''));
      filePath = filePathRegistry.get(id) || id;
      const data = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      return new Response(data, {
        status: 200,
        headers: { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' }
      });
    } catch (err) {
      console.error('nacsa-file failed to read:', filePath, err.message);
      return new Response('Not found', { status: 404 });
    }
  });
}

app.whenReady().then(() => {
  registerFileProtocol();
  createWindow();
  // Set initial thumbnail toolbar (paused state)
  updateThumbar(mainWindow, false);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Renderer tells us the current play state → redraw thumbar with correct icon
ipcMain.on('thumbar-update', (_e, state) => {
  if (typeof state.isPlaying === 'boolean') updateThumbar(mainWindow, state.isPlaying);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---- [1] Folder picking ----
ipcMain.handle('pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const folderPath = result.filePaths[0];
  return { path: folderPath, name: path.basename(folderPath) };
});

ipcMain.handle('verify-folder-access', async (_e, folderPath) => {
  try {
    await fs.promises.access(folderPath, fs.constants.R_OK);
    return { valid: true };
  } catch {
    return { valid: false };
  }
});

// ---- [4] Recursive scan + embedded metadata/art extraction ----
async function walkDir(dir, fileList = []) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(fullPath, fileList);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXT.has(ext)) fileList.push(fullPath);
    }
  }
  return fileList;
}

ipcMain.handle('scan-folder', async (_e, folderPath) => {
  const files = await walkDir(folderPath);
  const songs = [];

  for (const filePath of files) {
    try {
      const [meta, stat] = await Promise.all([
        parseFile(filePath, { duration: true, skipCovers: false }),
        fs.promises.stat(filePath)
      ]);
      const common = meta.common;
      const picture = common.picture && common.picture.length > 0 ? common.picture[0] : null;
      const cover = picture
        ? `data:${picture.format};base64,${Buffer.from(picture.data).toString('base64')}`
        : null;

      const id = filePath;
      songs.push({
        id,
        uri: 'nacsa-file://play/' + encodeURIComponent(id),
        path: filePath,
        title: common.title || path.basename(filePath, path.extname(filePath)),
        artist: common.artist || 'Unknown Artist',
        album: common.album || 'Unknown Album',
        cover,
        durationMs: meta.format.duration ? Math.round(meta.format.duration * 1000) : 0,
        format: path.extname(filePath).replace('.', ''),
        bitsPerSample: meta.format.bitsPerSample || null,
        sampleRate: meta.format.sampleRate || null,
        dateModified: stat.mtimeMs
      });
    } catch (err) {
      // Skip unreadable/corrupt files
      console.error('Failed to read tags for', filePath, err.message);
    }
  }

  registerSongPaths(songs);
  return { songs };
});

// ---- [2] Persistent storage (survives app restarts — stored in userData dir) ----
ipcMain.handle('store-get-playlists', () => store.get('playlists', []));

ipcMain.handle('store-save-playlist', (_e, playlist) => {
  const all = store.get('playlists', []);
  const idx = all.findIndex((p) => p.id === playlist.id);
  if (idx >= 0) all[idx] = playlist; else all.push(playlist);
  store.set('playlists', all);
  return true;
});

ipcMain.handle('store-delete-playlist', (_e, playlistId) => {
  const all = store.get('playlists', []).filter((p) => p.id !== playlistId);
  store.set('playlists', all);
  store.delete('songs_' + playlistId);
  return true;
});

ipcMain.handle('store-get-songs', (_e, playlistId) => {
  const songs = store.get('songs_' + playlistId, []);
  registerSongPaths(songs);
  return songs;
});

ipcMain.handle('store-save-songs', (_e, playlistId, songs) => {
  store.set('songs_' + playlistId, songs);
  return true;
});

// ---- [3] Persistent playback state (restore last song/queue/position on relaunch) ----
ipcMain.handle('save-playback-state', (_e, state) => {
  store.set('playback_state', state);
  return true;
});

ipcMain.handle('load-playback-state', () => store.get('playback_state', null));
