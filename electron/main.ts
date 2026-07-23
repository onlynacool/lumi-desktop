import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import path from 'path';
import fs from 'fs';
import Store from 'electron-store';
import { scanFolderForSongs, readArtwork } from './scanner';

const store = new Store({ name: 'lumi-data' });

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    icon: path.join(__dirname,'../public/icon.ico'),
    width: 1320,
    height: 840,
    minWidth: 940,
    minHeight: 620,
    backgroundColor: '#050505',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Custom protocol so local files can be streamed straight into an <audio> element
// (with proper range/seek support) without ever touching nodeIntegration in the renderer.
function registerLumiFileProtocol() {
  protocol.registerFileProtocol('lumi-file', (request, callback) => {
    try {
      const url = new URL(request.url);
      // On Windows this yields something like "/C:/Users/.../song.mp3"
      let decodedPath = decodeURIComponent(url.pathname);
      if (/^\/[a-zA-Z]:/.test(decodedPath)) decodedPath = decodedPath.slice(1);
      callback({ path: decodedPath });
    } catch (err) {
      console.error('lumi-file protocol error', err);
      callback({ error: -6 /* net::ERR_FILE_NOT_FOUND */ });
    }
  });
}

app.whenReady().then(() => {
  registerLumiFileProtocol();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ---------- Default album art ----------

const DEFAULT_ART_EXTS = /\.(gif|png|jpe?g|webp)$/i;

function getDefaultArtDir(): string {
  // Dev: Vite serves /public straight from the project root.
  // Packaged: Vite copies /public's contents to the root of the built dist/ folder.
  return app.isPackaged
    ? path.join(__dirname, '../dist/default album')
    : path.join(app.getAppPath(), 'public/default album');
}

ipcMain.handle('lumi:listDefaultArt', async () => {
  const dir = getDefaultArtDir();
  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => DEFAULT_ART_EXTS.test(f))
      .sort();
    return { files };
  } catch (err) {
    console.warn('No default album art directory found at', dir, err);
    return { files: [] as string[] };
  }
});

// ---------- IPC: folder picking & scanning (replaces LumiAudio.pickFolder/scanFolder) ----------

ipcMain.handle('lumi:pickFolder', async () => {
  if (!mainWindow) throw new Error('No window');
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (result.canceled || result.filePaths.length === 0) {
    throw new Error('Folder selection cancelled');
  }
  const folderPath = result.filePaths[0];
  return { uri: folderPath, name: path.basename(folderPath) };
});

ipcMain.handle('lumi:scanFolder', async (_e, { uri }: { uri: string }) => {
  const songs = await scanFolderForSongs(uri);
  return { songs };
});

ipcMain.handle('lumi:verifyFolderAccess', async (_e, { uri }: { uri: string }) => {
  return { valid: fs.existsSync(uri) };
});

ipcMain.handle('lumi:getArtwork', async (_e, { uri }: { uri: string }) => {
  const cover = await readArtwork(uri);
  return { cover };
});

// ---------- IPC: key/value store (replaces @capacitor/preferences) ----------

ipcMain.handle('lumi:storeGet', (_e, key: string) => (store.get(key) as string | undefined) ?? null);
ipcMain.handle('lumi:storeSet', (_e, key: string, value: string) => {
  store.set(key, value);
});
ipcMain.handle('lumi:storeRemove', (_e, key: string) => {
  store.delete(key);
});
