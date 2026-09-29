process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '16';

process.on('uncaughtException', (err) => {
  console.error('[MyFiles] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[MyFiles] Unhandled Rejection:', reason);
});

const { app, BrowserWindow, ipcMain, shell, nativeImage, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const crypto = require('crypto');
const https = require('https');
const archive = require('./archive');
const vlc = require('./vlc');
const dedup = require('./dedup');
const storage = require('./storage');
const fsEngine = require('./fs-engine');

// Register media-stream custom protocol for continuous HTTP 206 Partial Content video/audio streaming
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media-stream',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true
    }
  }
]);

// Set Windows Application User Model ID for proper taskbar grouping and branding
if (process.platform === 'win32') {
  app.setAppUserModelId('com.andruia.myfiles');
}

// Hardware & GPU rendering acceleration flags for zero-latency UI
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

const appIconPath = path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
let appNativeIcon = null;
try {
  if (fs.existsSync(appIconPath)) {
    appNativeIcon = nativeImage.createFromPath(appIconPath);
  }
} catch (e) {
  console.error('Failed loading native app icon:', e);
}

let mainWindow = null;
const windows = new Set();
const windowInitialPaths = new Map();
const activeSearches = new Map();

// Auto-updater integration (Over-The-Air updates via GitHub Releases)
let autoUpdater = null;
try {
  ({ autoUpdater } = require('electron-updater'));
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.logger = console;
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'thesatyamjain',
    repo: 'myfiles'
  });

  function broadcastUpdateStatus(data) {
    windows.forEach(win => {
      if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        win.webContents.send('update-status', data);
      }
    });
  }

  autoUpdater.on('checking-for-update', () => {
    broadcastUpdateStatus({ status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    broadcastUpdateStatus({
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes || info.releaseName || ''
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    broadcastUpdateStatus({ status: 'up-to-date', version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    broadcastUpdateStatus({ status: 'downloading', percent: Math.round(progress.percent) });
  });

  autoUpdater.on('update-downloaded', (info) => {
    broadcastUpdateStatus({ status: 'ready', version: info.version });
  });

  autoUpdater.on('error', (err) => {
    console.warn('Auto-updater background notice:', err.message);
    broadcastUpdateStatus({ status: 'error', message: err.message });
  });
} catch (err) {
  console.warn('Auto-updater module not loaded:', err.message);
}

function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  const clean = (v) => String(v).replace(/^v/, '').split(/[-+]/)[0];
  const parts1 = clean(v1).split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = clean(v2).split('.').map(n => parseInt(n, 10) || 0);
  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

function fetchLatestGitHubRelease() {
  return new Promise((resolve, reject) => {
    const fetchUrl = (targetUrl, redirectCount = 0) => {
      if (redirectCount > 3) {
        return reject(new Error('Too many redirects fetching release info'));
      }
      let parsed;
      try {
        parsed = new URL(targetUrl);
      } catch (err) {
        return reject(err);
      }
      const req = https.get({
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: {
          'User-Agent': 'MyFiles-Desktop-App',
          'Accept': 'application/vnd.github.v3+json'
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchUrl(res.headers.location, redirectCount + 1);
        }
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Invalid JSON from GitHub API'));
            }
          } else {
            reject(new Error(`GitHub API returned HTTP ${res.statusCode}`));
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(8000, () => {
        req.destroy(new Error('Update check request timed out'));
      });
    };
    fetchUrl('https://api.github.com/repos/thesatyamjain/myfiles/releases/latest');
  });
}

// Configuration directory
const configDir = path.join(app.getPath('userData'), 'MyFilesConfig');
if (!fs.existsSync(configDir)) {
  try {
    fs.mkdirSync(configDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create config dir', err);
  }
}

const tagsFile = path.join(configDir, 'tags.json');
const pinsFile = path.join(configDir, 'pins.json');

function loadJson(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error(`Error loading ${filePath}:`, err);
  }
  return defaultValue;
}

function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error saving ${filePath}:`, err);
    return false;
  }
}

function extractPathArg(argv) {
  if (!argv || !Array.isArray(argv)) return null;
  const args = argv.slice(1);
  for (const arg of args) {
    if (!arg || arg === '.' || arg.startsWith('--')) continue;
    let clean = arg.replace(/^"|"$/g, '').trim();
    if (clean.toLowerCase().startsWith('/select,')) {
      clean = clean.substring(8).replace(/^"|"$/g, '').trim();
    }
    try {
      if (fs.existsSync(clean)) {
        const stat = fs.statSync(clean);
        if (stat.isDirectory()) {
          return { targetPath: clean, selectItem: null };
        } else {
          return { targetPath: path.dirname(clean), selectItem: path.basename(clean) };
        }
      }
    } catch {}
  }
  return null;
}

const initialTargetPath = extractPathArg(process.argv);

const gotTheLock = (process.env.CAPTURE_SCREENSHOTS === '1') || process.argv.includes('--force-instance') || app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.exit(0);
} else if (process.env.CAPTURE_SCREENSHOTS !== '1') {
  app.on('second-instance', (_event, commandLine) => {
    const target = extractPathArg(commandLine);
    const existingWindows = BrowserWindow.getAllWindows().filter(w => !w.isDestroyed());
    if (existingWindows.length === 0) {
      const win = createWindow(target);
      if (win && !win.isDestroyed()) {
        win.show();
        win.focus();
      }
      return;
    }
    if (target) {
      const win = createWindow(target);
      if (win && !win.isDestroyed()) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.setAlwaysOnTop(true);
        win.focus();
        win.setAlwaysOnTop(false);
      }
    } else {
      const win = BrowserWindow.getFocusedWindow() || existingWindows[0];
      if (win && !win.isDestroyed()) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.setAlwaysOnTop(true);
        win.focus();
        win.setAlwaysOnTop(false);
      }
    }
  });
}

function createWindow(initialTarget = null) {
  let targetPath = null;
  let selectItem = null;
  if (typeof initialTarget === 'string') {
    targetPath = initialTarget;
  } else if (initialTarget && typeof initialTarget === 'object') {
    targetPath = initialTarget.targetPath || initialTarget.path || null;
    selectItem = initialTarget.selectItem || initialTarget.select || null;
  }

  const existingWindows = BrowserWindow.getAllWindows();
  let x, y;
  if (existingWindows.length > 0) {
    const active = BrowserWindow.getFocusedWindow() || existingWindows[existingWindows.length - 1];
    if (active) {
      const [lastX, lastY] = active.getPosition();
      x = lastX + 32;
      y = lastY + 32;
    }
  }

  const isWin11OrLater = process.platform === 'win32' && parseInt((os.release() || '').split('.')[2] || '0', 10) >= 22000;

  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 900,
    minHeight: 560,
    x,
    y,
    show: false,
    frame: false,
    backgroundMaterial: isWin11OrLater ? 'acrylic' : undefined,
    backgroundColor: isWin11OrLater ? '#00000000' : '#0f172a',
    icon: (appNativeIcon && !appNativeIcon.isEmpty()) ? appNativeIcon : (fs.existsSync(appIconPath) ? appIconPath : undefined),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false // Allows previewing local media files seamlessly in Quick Look
    }
  });

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
    if (process.env.CAPTURE_SCREENSHOTS === '1') {
      runScreenshotCapture(win);
    }
  });

  // Fallback: guarantee the window is shown if ready-to-show is missed or delayed
  setTimeout(() => {
    if (!win.isDestroyed() && !win.isVisible()) {
      win.show();
      win.focus();
    }
  }, 600);

  if (appNativeIcon && !appNativeIcon.isEmpty()) {
    try { win.setIcon(appNativeIcon); } catch {}
  } else if (fs.existsSync(appIconPath)) {
    try { win.setIcon(appIconPath); } catch {}
  }

  const webContentsId = win.webContents.id;
  windows.add(win);
  if (targetPath) {
    windowInitialPaths.set(webContentsId, { targetPath, selectItem });
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  win.on('closed', () => {
    windows.delete(win);
    windowInitialPaths.delete(webContentsId);
    if (mainWindow === win) {
      mainWindow = windows.size > 0 ? Array.from(windows)[0] : null;
    }
    if (windows.size === 0 && process.platform !== 'darwin') {
      app.exit(0);
    }
  });

  const query = {};
  if (targetPath) query.path = targetPath;
  if (selectItem) query.select = selectItem;

  const loadPromise = targetPath
    ? win.loadFile(path.join(__dirname, 'src', 'index.html'), { query })
    : win.loadFile(path.join(__dirname, 'src', 'index.html'));

  loadPromise.catch(err => {
    console.error('Failed to load application:', err);
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('[MyFiles] Render process gone:', details);
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[MyFiles] Failed to load application UI:', errorCode, errorDescription);
  });

  win.on('maximize', () => {
    if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send('window-state', { isMaximized: true });
    }
  });

  win.on('unmaximize', () => {
    if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send('window-state', { isMaximized: false });
    }
  });

  mainWindow = win;
  return win;
}

app.whenReady().then(() => {
  // Handle media-stream:// protocol with HTTP 206 Partial Content range requests for seamless video/audio playback
  protocol.handle('media-stream', async (request) => {
    try {
      const rawUrl = request.url.replace(/^media-stream:\/\//i, '');
      let filePath = decodeURIComponent(rawUrl);
      if (process.platform === 'win32' && /^\/[a-zA-Z]:/.test(filePath)) {
        filePath = filePath.substring(1);
      }
      if (!fs.existsSync(filePath)) {
        return new Response('File Not Found', { status: 404 });
      }

      const stat = await fs.promises.stat(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.ogv': 'video/ogg',
        '.mov': 'video/quicktime',
        '.mkv': 'video/x-matroska',
        '.avi': 'video/x-msvideo',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.flac': 'audio/flac'
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const rangeHeader = request.headers.get('range');

      if (!rangeHeader) {
        return new Response(fs.createReadStream(filePath), {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(stat.size),
            'Accept-Ranges': 'bytes'
          }
        });
      }

      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;

      if (isNaN(start) || start >= stat.size || end >= stat.size) {
        return new Response(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${stat.size}` }
        });
      }

      const chunkSize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      return new Response(fileStream, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Content-Length': String(chunkSize),
          'Accept-Ranges': 'bytes'
        }
      });
    } catch (err) {
      console.error('media-stream protocol error:', err);
      return new Response('Server Error', { status: 500 });
    }
  });

  createWindow(initialTargetPath);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  if (app.isPackaged && autoUpdater) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
        console.warn('Background update check failed:', err.message);
      });
    }, 4000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.exit(0);
  }
});

// IPC: Initial directory path passed from command line / shell association
ipcMain.handle('get-initial-path', (event) => {
  if (event && event.sender && windowInitialPaths.has(event.sender.id)) {
    const p = windowInitialPaths.get(event.sender.id);
    windowInitialPaths.delete(event.sender.id);
    return p;
  }
  return initialTargetPath;
});

// IPC: Multi-Window Creation
ipcMain.handle('open-new-window', (_event, targetPath) => {
  createWindow(targetPath || null);
  return { success: true };
});

// IPC: Window controls
ipcMain.handle('window-control', (event, action) => {
  const win = (event && event.sender && !event.sender.isDestroyed() && BrowserWindow.fromWebContents(event.sender)) || BrowserWindow.getFocusedWindow() || mainWindow;
  if (!win || win.isDestroyed()) return false;
  switch (action) {
    case 'minimize':
      win.minimize();
      break;
    case 'maximize':
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
      break;
    case 'close':
      win.close();
      break;
    case 'isMaximized':
      return win.isMaximized();
  }
  return true;
});

// IPC: Drives Detection
ipcMain.handle('get-drives', async () => fsEngine.getDrives());

// IPC: User special folders (macOS Finder standard locations - media_1790253435974.png)
ipcMain.handle('get-special-folders', () => fsEngine.getSpecialFolders());

// IPC: Read directory entries with metadata
ipcMain.handle('read-dir', async (_event, dirPath) => fsEngine.readDirectory(dirPath));

// IPC: Get full file details & preview info
ipcMain.handle('get-file-details', async (_event, filePath) => fsEngine.getFileDetails(filePath));

// IPC: Calculate File Checksums (MD5, SHA-1, SHA-256) - Advanced Windows Explorer Feature
ipcMain.handle('calculate-checksum', async (_event, filePath, algorithm = 'sha256') => {
  try {
    const hash = await fsEngine.calculateChecksum(filePath, algorithm);
    return { success: true, algorithm, hash };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Batch Rename (PowerRename)
ipcMain.handle('batch-rename', async (_event, renames) => {
  const results = [];
  for (const item of renames) {
    try {
      if (!fs.existsSync(item.oldPath)) {
        results.push({ oldPath: item.oldPath, success: false, error: 'Source not found' });
        continue;
      }
      if (fs.existsSync(item.newPath) && item.oldPath.toLowerCase() !== item.newPath.toLowerCase()) {
        results.push({ oldPath: item.oldPath, newPath: item.newPath, success: false, error: 'Destination already exists' });
        continue;
      }
      await fs.promises.rename(item.oldPath, item.newPath);
      results.push({ oldPath: item.oldPath, newPath: item.newPath, success: true });
    } catch (err) {
      results.push({ oldPath: item.oldPath, newPath: item.newPath, success: false, error: err.message });
    }
  }
  if (results.some(r => r.success) && fsEngine.invalidateDirCache) {
    fsEngine.invalidateDirCache();
  }
  return { success: results.every(r => r.success), results };
});

// IPC: Read file content for Quick Look
ipcMain.handle('read-file-content', async (_event, filePath, options = {}) => {
  return fsEngine.getFileContent(filePath, options.maxBytes, true);
});

// IPC: Create Folder
ipcMain.handle('create-folder', async (_event, parentDir, name) => {
  try {
    const target = path.join(parentDir, name);
    await fs.promises.mkdir(target, { recursive: false });
    if (fsEngine.invalidateDirCache) fsEngine.invalidateDirCache(parentDir);
    return { success: true, path: target };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Create File
ipcMain.handle('create-file', async (_event, parentDir, name, content = '', encoding = 'utf8') => {
  try {
    const target = path.join(parentDir, name);
    const buf = encoding === 'base64' ? Buffer.from(content, 'base64') : content;
    await fs.promises.writeFile(target, buf);
    if (fsEngine.invalidateDirCache) fsEngine.invalidateDirCache(parentDir);
    return { success: true, path: target };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Rename Item
ipcMain.handle('rename-item', async (_event, oldPath, newName) => {
  try {
    const parent = path.dirname(oldPath);
    const newPath = path.join(parent, newName);
    await fs.promises.rename(oldPath, newPath);
    if (fsEngine.invalidateDirCache) fsEngine.invalidateDirCache(parent);
    return { success: true, newPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Delete Item (Recycle Bin)
ipcMain.handle('delete-item', async (_event, itemPath) => {
  try {
    await shell.trashItem(itemPath);
    if (fsEngine.invalidateDirCache) fsEngine.invalidateDirCache(path.dirname(itemPath));
    return { success: true };
  } catch (err) {
    if (process.platform === 'win32') {
      try {
        const binRes = await storage.moveToRecycleBin(itemPath);
        if (binRes && binRes.success) {
          if (fsEngine.invalidateDirCache) fsEngine.invalidateDirCache(path.dirname(itemPath));
          return { success: true };
        }
      } catch {}
    }
    // If trashItem fails, attempt unlink/rm
    try {
      const stats = await fs.promises.stat(itemPath);
      if (stats.isDirectory()) {
        await fs.promises.rm(itemPath, { recursive: true, force: true });
      } else {
        await fs.promises.unlink(itemPath);
      }
      if (fsEngine.invalidateDirCache) fsEngine.invalidateDirCache(path.dirname(itemPath));
      return { success: true };
    } catch (e2) {
      return { success: false, error: e2.message };
    }
  }
});

// IPC: Copy Items
ipcMain.handle('copy-items', async (_event, srcPaths, targetDir) => {
  try {
    for (const src of srcPaths) {
      if (!src || typeof src !== 'string') continue;
      const base = path.basename(src);
      let dest = path.join(targetDir, base);
      
      // If destination already exists, generate unique name
      if (fs.existsSync(dest)) {
        const ext = path.extname(base);
        const nameWithoutExt = path.basename(base, ext);
        let count = 1;
        let copyName = `${nameWithoutExt} - Copy${ext}`;
        while (fs.existsSync(path.join(targetDir, copyName))) {
          count++;
          copyName = `${nameWithoutExt} - Copy (${count})${ext}`;
        }
        dest = path.join(targetDir, copyName);
      }

      await fs.promises.cp(src, dest, { recursive: true });
    }
    if (fsEngine.invalidateDirCache) fsEngine.invalidateDirCache(targetDir);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Move Items
ipcMain.handle('move-items', async (_event, srcPaths, targetDir) => {
  try {
    for (const src of srcPaths) {
      if (!src || typeof src !== 'string') continue;
      const base = path.basename(src);
      const dest = path.join(targetDir, base);
      if (path.resolve(src).toLowerCase() === path.resolve(dest).toLowerCase()) {
        continue;
      }
      try {
        await fs.promises.rename(src, dest);
      } catch (renameErr) {
        if (renameErr.code === 'EXDEV') {
          await fs.promises.cp(src, dest, { recursive: true });
          await fs.promises.rm(src, { recursive: true, force: true });
        } else {
          throw renameErr;
        }
      }
    }
    if (fsEngine.invalidateDirCache) fsEngine.invalidateDirCache();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Native drag outward to Desktop / Explorer / Other Applications
ipcMain.on('start-drag', (event, targetPaths) => {
  try {
    const paths = (Array.isArray(targetPaths) ? targetPaths : [targetPaths]).filter(p => typeof p === 'string' && fs.existsSync(p));
    if (paths.length === 0) return;
    const blankIcon = nativeImage.createFromBuffer(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));
    event.sender.startDrag({
      file: paths[0],
      files: paths,
      icon: blankIcon
    });
  } catch (err) {
    console.error('start-drag error:', err);
  }
});

// IPC: Open with default application
ipcMain.handle('open-item', async (_event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Show in Windows Explorer
ipcMain.handle('show-in-explorer', async (_event, filePath) => {
  try {
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Open External URL or Protocol (for Share apps and services)
ipcMain.handle('open-external', async (_event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Get Local IPv4 Address (for Local Wi-Fi Mobile Download QR Code)
ipcMain.handle('get-local-ip', async () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
});

// IPC: Trigger Windows Native Share / Nearby Sharing
ipcMain.handle('open-native-share', async (_event, targetPath) => {
  try {
    if (targetPath && fs.existsSync(targetPath)) {
      shell.showItemInFolder(targetPath);
    }
    await shell.openExternal('ms-settings:nearbysharing');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Detect Installed Desktop Share Apps
ipcMain.handle('get-installed-share-apps', async (_event, forceRefresh = false) => {
  try {
    if (forceRefresh) {
      try {
        delete require.cache[require.resolve('./fs-engine')];
      } catch (_) {}
    }
    const engine = require('./fs-engine');
    return engine.detectInstalledShareApps(forceRefresh);
  } catch (err) {
    return {
      whatsapp: false,
      telegram: false,
      localsend: false,
      quickshare: false,
      sendanywhere: false,
      phonelink: false,
      bluetooth: false,
      cloud: false,
      error: err.message
    };
  }
});

// IPC: Launch Native Desktop Share App
ipcMain.handle('launch-share-app', async (_event, appKey, targetPath) => {
  try {
    const localAppData = process.env.LOCALAPPDATA || '';
    const appData = process.env.APPDATA || '';
    const progFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    switch (appKey) {
      case 'localsend': {
        const exePaths = [
          path.join(localAppData, 'Programs', 'LocalSend', 'localsend_app.exe'),
          path.join(progFiles, 'LocalSend', 'localsend_app.exe'),
          path.join(progFilesX86, 'LocalSend', 'localsend_app.exe'),
          path.join(localAppData, 'LocalSend', 'localsend_app.exe')
        ];
        const exe = exePaths.find(p => fs.existsSync(p));
        if (exe) {
          const args = targetPath && fs.existsSync(targetPath) ? [targetPath] : [];
          spawn(exe, args, { detached: true, stdio: 'ignore' });
          return { success: true, mode: 'executable' };
        }
        const lnk = path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'LocalSend.lnk');
        if (fs.existsSync(lnk)) {
          shell.openPath(lnk);
          return { success: true, mode: 'shortcut' };
        }
        await shell.openExternal('https://localsend.org');
        return { success: true, mode: 'web' };
      }

      case 'quickshare': {
        const qsPaths = [
          path.join(progFiles, 'Google', 'NearbyShare', 'nearby_share_launcher.exe'),
          path.join(progFiles, 'Google', 'NearbyShare', 'nearby_share.exe'),
          path.join(progFilesX86, 'Google', 'NearbyShare', 'nearby_share_launcher.exe'),
          path.join(progFilesX86, 'Google', 'NearbyShare', 'nearby_share.exe'),
          path.join(localAppData, 'Google', 'NearbyShare', 'nearby_share_launcher.exe'),
          path.join(localAppData, 'Google', 'NearbyShare', 'nearby_share.exe'),
          path.join(progFiles, 'Google', 'Nearby Share', 'nearby_share_launcher.exe'),
          path.join(progFiles, 'Google', 'Nearby Share', 'nearby_share.exe'),
          path.join(progFilesX86, 'Google', 'Nearby Share', 'nearby_share_launcher.exe'),
          path.join(progFilesX86, 'Google', 'Nearby Share', 'nearby_share.exe'),
          path.join(localAppData, 'Google', 'Nearby Share', 'nearby_share_launcher.exe'),
          path.join(localAppData, 'Google', 'Nearby Share', 'nearby_share.exe'),
          path.join(progFiles, 'Google', 'QuickShare', 'quick_share_launcher.exe'),
          path.join(progFiles, 'Google', 'QuickShare', 'quick_share.exe'),
          path.join(progFilesX86, 'Google', 'QuickShare', 'quick_share.exe'),
          path.join(localAppData, 'Google', 'QuickShare', 'quick_share.exe'),
          path.join(progFiles, 'Google', 'Quick Share', 'quick_share.exe'),
          path.join(progFilesX86, 'Google', 'Quick Share', 'quick_share.exe'),
          path.join(localAppData, 'Google', 'Quick Share', 'quick_share.exe'),
          path.join(progFiles, 'Samsung', 'QuickShare', 'QuickShare.exe'),
          path.join(progFilesX86, 'Samsung', 'QuickShare', 'QuickShare.exe'),
          path.join(localAppData, 'Programs', 'QuickShare', 'QuickShare.exe')
        ];
        const exe = qsPaths.find(p => fs.existsSync(p));
        if (exe) {
          const args = targetPath && fs.existsSync(targetPath) ? [targetPath] : [];
          spawn(exe, args, { detached: true, stdio: 'ignore' });
          return { success: true, mode: 'executable' };
        }
        // If not installed, open download page directly (NEVER invoke unregistered quickshare://)
        await shell.openExternal('https://www.android.com/better-together/quick-share-app/');
        return { success: true, mode: 'download' };
      }

      case 'whatsapp': {
        const waPaths = [
          path.join(localAppData, 'WhatsApp', 'WhatsApp.exe'),
          path.join(localAppData, 'Programs', 'WhatsApp', 'WhatsApp.exe'),
          path.join(progFiles, 'WhatsApp', 'WhatsApp.exe')
        ];
        const exe = waPaths.find(p => fs.existsSync(p));
        if (exe) {
          spawn(exe, [], { detached: true, stdio: 'ignore' });
          return { success: true, mode: 'executable' };
        }
        const text = encodeURIComponent(`Shared file: ${path.basename(targetPath || '')}\n${targetPath || ''}`);
        try {
          await shell.openExternal(`whatsapp://send?text=${text}`);
          return { success: true, mode: 'protocol' };
        } catch {
          await shell.openExternal('https://web.whatsapp.com/');
          return { success: true, mode: 'web' };
        }
      }

      case 'telegram': {
        const tgPaths = [
          path.join(appData, 'Telegram Desktop', 'Telegram.exe'),
          path.join(localAppData, 'Programs', 'Telegram Desktop', 'Telegram.exe'),
          path.join(progFiles, 'Telegram Desktop', 'Telegram.exe'),
          path.join(progFilesX86, 'Telegram Desktop', 'Telegram.exe')
        ];
        const exe = tgPaths.find(p => fs.existsSync(p));
        if (exe) {
          spawn(exe, [], { detached: true, stdio: 'ignore' });
          return { success: true, mode: 'executable' };
        }
        const text = encodeURIComponent(`Shared file: ${path.basename(targetPath || '')}`);
        const url = encodeURIComponent(targetPath || '');
        try {
          await shell.openExternal(`tg://msg_url?url=${url}&text=${text}`);
          return { success: true, mode: 'protocol' };
        } catch {
          await shell.openExternal('https://web.telegram.org/');
          return { success: true, mode: 'web' };
        }
      }

      case 'sendanywhere': {
        const saPaths = [
          path.join(progFiles, 'Send Anywhere', 'Send Anywhere.exe'),
          path.join(progFilesX86, 'Send Anywhere', 'Send Anywhere.exe'),
          path.join(localAppData, 'Programs', 'Send Anywhere', 'Send Anywhere.exe')
        ];
        const exe = saPaths.find(p => fs.existsSync(p));
        if (exe) {
          const args = targetPath && fs.existsSync(targetPath) ? [targetPath] : [];
          spawn(exe, args, { detached: true, stdio: 'ignore' });
          return { success: true, mode: 'executable' };
        }
        await shell.openExternal('https://send-anywhere.com/');
        return { success: true, mode: 'web' };
      }

      case 'phonelink': {
        await shell.openExternal('ms-phone:');
        return { success: true, mode: 'protocol' };
      }

      case 'bluetooth': {
        const fsquirt = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'fsquirt.exe');
        if (fs.existsSync(fsquirt)) {
          spawn(fsquirt, [], { detached: true, stdio: 'ignore' });
          return { success: true, mode: 'wizard' };
        }
        return { success: false, error: 'fsquirt.exe not found' };
      }

      case 'cloud': {
        if (targetPath && fs.existsSync(targetPath)) {
          shell.showItemInFolder(targetPath);
        } else if (process.env.OneDrive && fs.existsSync(process.env.OneDrive)) {
          shell.openPath(process.env.OneDrive);
        }
        return { success: true, mode: 'explorer' };
      }

      case 'toffeeshare':
        await shell.openExternal('https://toffeeshare.com/');
        return { success: true, mode: 'web' };

      case 'wormhole':
        await shell.openExternal('https://wormhole.app/');
        return { success: true, mode: 'web' };

      case 'wetransfer':
        await shell.openExternal('https://wetransfer.com/');
        return { success: true, mode: 'web' };

      default:
        return { success: false, error: 'Unknown app key' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Open Terminal
ipcMain.handle('open-terminal', async (_event, dirPath, terminalChoice = 'wt') => {
  try {
    const rawDir = dirPath || os.homedir();
    const cleanDir = rawDir.replace(/'/g, "''");
    let cmd = 'wt.exe';
    let args = ['-d', rawDir];
    if (terminalChoice === 'powershell') {
      cmd = 'powershell.exe';
      args = ['-NoExit', '-Command', `Set-Location -LiteralPath '${cleanDir}'`];
    } else if (terminalChoice === 'cmd') {
      cmd = 'cmd.exe';
      args = ['/k', 'cd', '/d', rawDir];
    } else if (terminalChoice === 'gitbash') {
      cmd = 'C:\\Program Files\\Git\\git-bash.exe';
      args = [`--cd=${rawDir}`];
    }

    const proc = spawn('cmd.exe', ['/c', 'start', cmd, ...args], {
      detached: true,
      stdio: 'ignore'
    });
    proc.on('error', () => {
      spawn('cmd.exe', ['/c', 'start', 'powershell.exe', '-NoExit', '-Command', `Set-Location -LiteralPath '${cleanDir}'`], {
        detached: true,
        stdio: 'ignore'
      });
    });
    proc.unref();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

function runRegCommand(args) {
  return new Promise((resolve) => {
    const { execFile } = require('child_process');
    execFile('reg.exe', args, (err, stdout, stderr) => {
      resolve({ success: !err, error: err ? (stderr || err.message) : null });
    });
  });
}

// IPC: Register Default File Manager
ipcMain.handle('make-default', async () => {
  try {
    let launchCmd;
    if (app.isPackaged) {
      launchCmd = `"${process.execPath}" "%1"`;
    } else {
      const appDir = path.resolve(__dirname);
      launchCmd = `"${process.execPath}" "${appDir}" "%1"`;
    }

    // Register Directory / Folder shell association in HKCU
    await runRegCommand(['add', 'HKCU\\Software\\Classes\\Directory\\shell\\MyFiles', '/ve', '/d', 'Open in MyFiles', '/f']);
    await runRegCommand(['add', 'HKCU\\Software\\Classes\\Directory\\shell\\MyFiles\\command', '/ve', '/d', launchCmd, '/f']);
    await runRegCommand(['add', 'HKCU\\Software\\Classes\\Directory\\shell', '/ve', '/d', 'MyFiles', '/f']);

    // Register Drive shell association in HKCU
    await runRegCommand(['add', 'HKCU\\Software\\Classes\\Drive\\shell\\MyFiles', '/ve', '/d', 'Open in MyFiles', '/f']);
    await runRegCommand(['add', 'HKCU\\Software\\Classes\\Drive\\shell\\MyFiles\\command', '/ve', '/d', launchCmd, '/f']);
    await runRegCommand(['add', 'HKCU\\Software\\Classes\\Drive\\shell', '/ve', '/d', 'MyFiles', '/f']);

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Restore Windows Explorer Default
ipcMain.handle('restore-default', async () => {
  try {
    // Delete default verbs and MyFiles keys (safe to ignore if absent)
    await runRegCommand(['delete', 'HKCU\\Software\\Classes\\Directory\\shell', '/ve', '/f']);
    await runRegCommand(['delete', 'HKCU\\Software\\Classes\\Directory\\shell\\MyFiles', '/f']);
    await runRegCommand(['delete', 'HKCU\\Software\\Classes\\Drive\\shell', '/ve', '/f']);
    await runRegCommand(['delete', 'HKCU\\Software\\Classes\\Drive\\shell\\MyFiles', '/f']);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Check Default File Manager Status
ipcMain.handle('is-default', async () => {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve({ success: true, isDefault: false });
    const { execFile } = require('child_process');
    execFile('reg.exe', ['query', 'HKCU\\Software\\Classes\\Directory\\shell', '/ve'], (err, stdout) => {
      const isDefault = !err && !!(stdout && stdout.toLowerCase().includes('myfiles'));
      resolve({ success: true, isDefault });
    });
  });
});

// IPC: Launch Native Windows Tool
ipcMain.handle('launch-windows-tool', async (_event, toolName, driveLetter) => {
  try {
    return await storage.launchWindowsTool(toolName, driveLetter);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: High-Speed Asynchronous Recursive Search
ipcMain.handle('search-files', async (event, { searchId, rootDir, query, searchContent = false, maxResults = 200 }) => {
  activeSearches.set(searchId, true);
  const results = [];
  const lowerQuery = query.toLowerCase();
  const startTime = Date.now();

  async function walk(currentDir, currentDepth) {
    if (!activeSearches.get(searchId)) return;
    if (results.length >= maxResults) return;
    if (currentDepth > 8) return; // Prevent excessive deep loops

    let dirents;
    try {
      dirents = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch {
      return; // Skip folders without read permission
    }

    for (const d of dirents) {
      if (!activeSearches.get(searchId)) break;
      if (results.length >= maxResults) break;

      const fullPath = path.join(currentDir, d.name);
      const isDir = d.isDirectory();
      const ext = isDir ? '' : path.extname(d.name).toLowerCase();
      let matched = d.name.toLowerCase().includes(lowerQuery);
      let matchSnippet = null;

      // Optional content search for text files
      if (!matched && searchContent && !isDir) {
        const textExts = ['.txt', '.md', '.json', '.js', '.ts', '.py', '.html', '.css', '.csv', '.xml', '.log'];
        if (textExts.includes(ext)) {
          try {
            const stat = await fs.promises.stat(fullPath);
            if (stat.size < 512 * 1024) { // Only scan text files < 512KB for instant response
              const content = await fs.promises.readFile(fullPath, 'utf8');
              const idx = content.toLowerCase().indexOf(lowerQuery);
              if (idx !== -1) {
                matched = true;
                const snippetStart = Math.max(0, idx - 30);
                const snippetEnd = Math.min(content.length, idx + query.length + 30);
                matchSnippet = '...' + content.substring(snippetStart, snippetEnd).replace(/\s+/g, ' ') + '...';
              }
            }
          } catch {
            // Ignore unreadable files
          }
        }
      }

      if (matched) {
        let size = 0;
        let mtime = null;
        try {
          const s = await fs.promises.stat(fullPath);
          size = s.size;
          mtime = s.mtime.toISOString();
        } catch {
          // ignore
        }

        const matchItem = {
          name: d.name,
          path: fullPath,
          isDirectory: isDir,
          size,
          mtime,
          extension: ext,
          matchSnippet
        };
        results.push(matchItem);

        // Stream progress batch
        if (results.length % 10 === 0) {
          event.sender.send('search-progress', { searchId, count: results.length, item: matchItem });
        }
      }

      if (isDir && !d.name.startsWith('.') && d.name !== 'node_modules' && d.name !== '$Recycle.Bin') {
        await walk(fullPath, currentDepth + 1);
      }
    }
  }

  try {
    await walk(rootDir, 0);
  } finally {
    activeSearches.delete(searchId);
  }

  const durationMs = Date.now() - startTime;
  return {
    searchId,
    results,
    durationMs,
    count: results.length,
    completed: true
  };
});

ipcMain.handle('cancel-search', (_event, searchId) => {
  activeSearches.set(searchId, false);
  return { success: true };
});

// IPC: Tags Management (Persistent)
ipcMain.handle('get-tags', () => {
  return loadJson(tagsFile, {});
});

ipcMain.handle('set-tag', (_event, filePath, tag) => {
  const tags = loadJson(tagsFile, {});
  tags[filePath] = tag;
  saveJson(tagsFile, tags);
  return tags;
});

ipcMain.handle('remove-tag', (_event, filePath) => {
  const tags = loadJson(tagsFile, {});
  delete tags[filePath];
  saveJson(tagsFile, tags);
  return tags;
});

// IPC: Pins Management (User controlled sidebar)
ipcMain.handle('get-pins', () => {
  return loadJson(pinsFile, []);
});

ipcMain.handle('save-pins', (_event, pins) => {
  return saveJson(pinsFile, pins);
});

// IPC: Archive Operations (7-Zip & Native Windows Integration)
ipcMain.handle('archive-inspect', async (_event, filePath) => {
  try {
    const info = await archive.listArchive(filePath);
    return info;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('archive-extract', async (_event, filePath, destDir) => {
  try {
    const targetDir = destDir || path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)));
    const res = await archive.extractArchive(filePath, targetDir);
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('archive-compress', async (_event, sources, destPath, format = 'zip') => {
  try {
    const res = await archive.compressItems(sources, destPath, format);
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Native VLC Media Player Integration
ipcMain.handle('vlc-status', () => {
  return {
    installed: vlc.isVlcInstalled(),
    path: vlc.getVlcExecutable()
  };
});

ipcMain.handle('vlc-play', async (_event, filePath, options = {}) => {
  try {
    return await vlc.playMedia(filePath, options);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Native File Deduplication Engine
ipcMain.handle('find-duplicates', async (_event, options = {}) => {
  try {
    return await dedup.scanDuplicates(options);
  } catch (err) {
    return { success: false, error: err.message, duplicateGroups: [], wastedBytes: 0 };
  }
});

ipcMain.handle('delete-duplicates', async (_event, filePaths = []) => {
  try {
    return await dedup.deleteDuplicates(filePaths);
  } catch (err) {
    return { success: false, error: err.message, deletedCount: 0, freedBytes: 0 };
  }
});

// IPC: Eject Removable Drive
ipcMain.handle('eject-drive', async (_event, driveParam) => {
  const letter = (driveParam || '').replace(/[^a-zA-Z]/g, '').toUpperCase().charAt(0);
  if (!letter || letter === 'C') {
    return { success: false, error: 'Cannot eject system OS drive' };
  }
  return new Promise((resolve) => {
    const cmd = `powershell -NoProfile -Command "(New-Object -comObject Shell.Application).Namespace(17).ParseName('${letter}:').InvokeVerb('Eject')"`;
    exec(cmd, (err) => {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true, letter });
      }
    });
  });
});

// IPC: Native Storage Management Engine
ipcMain.handle('storage-analyze', async (_event, options = {}) => {
  try {
    return await storage.analyzeStorage(options);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('storage-clean-temp', async () => {
  try {
    return await storage.cleanTempFiles();
  } catch (err) {
    return { success: false, error: err.message, deletedCount: 0, freedBytes: 0 };
  }
});

ipcMain.handle('storage-empty-recycle', async (_event, drive) => {
  try {
    return await storage.emptyRecycleBin(drive);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-recycle-bin', async () => {
  try {
    if (process.platform === 'win32') {
      exec('start shell:RecycleBinFolder', { windowsHide: true });
      return { success: true };
    } else if (process.platform === 'darwin') {
      await shell.openPath('~/.Trash');
      return { success: true };
    } else {
      exec('xdg-open trash:///');
      return { success: true };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-recycle-stats', async () => {
  try {
    const stats = await storage.queryRecycleBin();
    return { success: true, ...stats };
  } catch (err) {
    return { success: false, bytes: 0, count: 0, error: err.message };
  }
});

ipcMain.handle('restore-recycle-item', async (_event, itemPath) => {
  try {
    return await storage.restoreRecycleBinItem(itemPath);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('restore-all-recycle', async () => {
  try {
    return await storage.restoreAllRecycleBinItems();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-permanently', async (_event, itemPath) => {
  try {
    return await storage.deletePermanentlyRecycleBinItem(itemPath);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Check for Updates (OTA)
ipcMain.handle('check-for-updates', async () => {
  const currentVersion = app.getVersion();
  const isPortable = Boolean(process.env.PORTABLE_EXECUTABLE_FILE);

  // 1. If running as packaged installer (NSIS), run electron-updater
  if (app.isPackaged && !isPortable && autoUpdater) {
    try {
      const result = await autoUpdater.checkForUpdates();
      if (result && result.updateInfo) {
        const remoteVer = result.updateInfo.version;
        if (compareVersions(remoteVer, currentVersion) > 0) {
          return {
            status: 'available',
            version: remoteVer,
            currentVersion,
            isPortable: false
          };
        }
      }
    } catch (err) {
      console.warn('electron-updater check notice, falling back to GitHub API:', err.message);
    }
  }

  // 2. Direct GitHub Releases check (works in Portable, Dev mode, or when autoUpdater encounters stale latest.yml)
  try {
    const release = await fetchLatestGitHubRelease();
    if (!release || !release.tag_name) {
      return { status: 'up-to-date', currentVersion, version: currentVersion };
    }
    const latestVer = release.tag_name.replace(/^v/, '');
    const isNewer = compareVersions(latestVer, currentVersion) > 0;
    if (isNewer) {
      const asset = (release.assets || []).find(a => 
        isPortable ? a.name.includes('Portable') : a.name.includes('Setup')
      ) || (release.assets && release.assets[0]);

      const downloadUrl = asset ? asset.browser_download_url : release.html_url;

      broadcastUpdateStatus({
        status: 'available',
        version: latestVer,
        releaseName: release.name || release.tag_name,
        releaseNotes: release.body || '',
        downloadUrl,
        isPortable
      });

      return {
        status: 'available',
        version: latestVer,
        currentVersion,
        downloadUrl,
        isPortable,
        releaseNotes: release.body || ''
      };
    } else {
      broadcastUpdateStatus({
        status: 'up-to-date',
        version: currentVersion
      });
      return {
        status: 'up-to-date',
        currentVersion,
        version: currentVersion
      };
    }
  } catch (err) {
    broadcastUpdateStatus({
      status: 'error',
      message: err.message
    });
    return { status: 'error', message: err.message, currentVersion };
  }
});

// IPC: Quit and Install Update
ipcMain.handle('quit-and-install-update', () => {
  if (autoUpdater) {
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  }
  return { success: false, error: 'Auto-updater not loaded' };
});

// IPC: Get App Version
ipcMain.handle('get-app-version', () => app.getVersion());



// Lossless screenshot capture utility for documentation and product preview
async function runScreenshotCapture(win) {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  const artifactDir = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\c2c887ca-8091-4051-b3eb-dd55edec41e6';
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  console.log('[Screenshots] Waiting 2500ms for filesystem scan and icons to settle...');
  await sleep(2500);

  async function snap(name) {
    const img = await win.webContents.capturePage();
    const pngBuf = img.toPNG();
    const p1 = path.join(screenshotsDir, name);
    const p2 = path.join(artifactDir, name);
    fs.writeFileSync(p1, pngBuf);
    try { fs.writeFileSync(p2, pngBuf); } catch {}
    console.log(`[Screenshots] Saved lossless: ${name} (${(pngBuf.length / 1024).toFixed(1)} KB)`);
  }

  async function runJs(fnBody) {
    try {
      await win.webContents.executeJavaScript(`(() => { try { ${fnBody} } catch (e) { console.error(e); } })()`);
    } catch (e) {
      console.warn('executeJavaScript warning:', e.message);
    }
  }

  // 1. Column View (macOS Finder Miller Columns)
  await runJs(`const btn = document.getElementById('btnViewColumns'); if (btn) btn.click();`);
  await sleep(1000);
  await snap('01-miller-columns-view.png');

  // 2. Grid View (Icons View)
  await runJs(`const btn = document.getElementById('btnViewGrid'); if (btn) btn.click();`);
  await sleep(1000);
  await snap('02-grid-icons-view.png');

  // 3. List View (Details View with headers)
  await runJs(`const btn = document.getElementById('btnViewList'); if (btn) btn.click();`);
  await sleep(1000);
  await snap('03-list-details-view.png');

  // 4. Gallery View (Hero media & scrubber)
  await runJs(`const btn = document.getElementById('btnViewGallery'); if (btn) btn.click();`);
  await sleep(1000);
  await snap('04-gallery-view.png');

  // 5. Dual Pane / Split Workspace
  await runJs(`
    const btnCol = document.getElementById('btnViewColumns'); if (btnCol) btnCol.click();
    const btnDual = document.getElementById('btnToggleDualPane'); if (btnDual) btnDual.click();
  `);
  await sleep(1000);
  await snap('05-dual-pane-split-workspace.png');

  // Turn off dual pane
  await runJs(`const btnDual = document.getElementById('btnToggleDualPane'); if (btnDual) btnDual.click();`);
  await sleep(500);

  // 6. Settings Modal (Glass UI, theme, preferences)
  await runJs(`const btnSettings = document.getElementById('sidebarSettings'); if (btnSettings) btnSettings.click();`);
  await sleep(1000);
  await snap('06-preferences-settings-modal.png');

  // Close Settings Modal
  await runJs(`const done = document.getElementById('btnSettingsDone') || document.getElementById('btnCloseSettingsModal'); if (done) done.click();`);
  await sleep(600);

  // 7. Quick Look Preview Modal
  await runJs(`
    const item = document.querySelector('.file-item, .col-file-item, .list-row');
    if (item) item.click();
    const btnQl = document.getElementById('btnQuickLook');
    if (btnQl) btnQl.click();
  `);
  await sleep(1000);
  await snap('07-quick-look-preview.png');

  console.log('[Screenshots] All lossless captures completed successfully!');
  app.exit(0);
}
