// MyFiles Desktop Application Server (Zero-Dependency, Native Node.js)
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const crypto = require('crypto');
const archive = require('./archive');
const vlc = require('./vlc');
const dedup = require('./dedup');
const storage = require('./storage');
const fsEngine = require('./fs-engine');

const PORT = process.env.PORT || 5241;
const PUBLIC_DIR = path.join(__dirname, 'src');
let server; // declared here so gracefulShutdown can reference it

// --- Process-level resilience guards ---
process.on('uncaughtException', (err) => {
  console.error('[MyFiles] uncaughtException:', err);
  // Don't exit — keep serving
});
process.on('unhandledRejection', (reason) => {
  console.error('[MyFiles] unhandledRejection:', reason);
});
function gracefulShutdown(signal) {
  console.log(`\n[MyFiles] Received ${signal}, closing server...`);
  server.close(() => {
    console.log('[MyFiles] Server closed cleanly.');
    process.exit(0);
  });
  // Force-quit after 5 s if close hangs
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// Request body size limit (4 MB)
const MAX_BODY_BYTES = 4 * 1024 * 1024;

// App Data config directory
const configDir = path.join(os.homedir(), '.myfiles');
if (!fs.existsSync(configDir)) {
  try {
    fs.mkdirSync(configDir, { recursive: true });
  } catch (err) {
    console.error('Config dir error', err);
  }
}

const tagsFile = path.join(configDir, 'tags.json');
const pinsFile = path.join(configDir, 'pins.json');

function loadJson(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
  }
  return defaultValue;
}

function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error(`Error saving ${filePath}:`, e);
    return false;
  }
}

// MIME types for static server
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jfif': 'image/jpeg',
  '.pjpeg': 'image/jpeg',
  '.pjp': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.cur': 'image/x-icon',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8'
};

server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Enable CORS & no-cache for local app (including browser file:/// origins via PNA)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Request-Private-Network');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API ROUTES ---
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // 1. Get Drives
    if (pathname === '/api/drives') {
      const drives = await fsEngine.getDrives();
      res.end(JSON.stringify(drives));
      return;
    }

    // Special Folders (macOS Finder standard locations - media_1790253435974.png)
    if (pathname === '/api/special-folders') {
      res.end(JSON.stringify(fsEngine.getSpecialFolders()));
      return;
    }

    // Local IPv4 Address for Wi-Fi mobile QR transfer
    if (pathname === '/api/local-ip') {
      const interfaces = os.networkInterfaces();
      let ip = '127.0.0.1';
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            ip = iface.address;
            break;
          }
        }
        if (ip !== '127.0.0.1') break;
      }
      res.end(JSON.stringify({ ip }));
      return;
    }

    // Installed Windows Desktop Share Apps
    if (pathname === '/api/installed-share-apps') {
      try {
        const force = parsedUrl.searchParams.get('force') === '1';
        const apps = fsEngine.detectInstalledShareApps(force);
        res.end(JSON.stringify(apps));
      } catch (err) {
        res.end(JSON.stringify({
          whatsapp: false,
          telegram: false,
          localsend: false,
          quickshare: false,
          sendanywhere: false,
          phonelink: false,
          bluetooth: false,
          cloud: false,
          error: err.message
        }));
      }
      return;
    }

    // Launch Share App (Server Web mode)
    if (pathname === '/api/launch-share-app' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (Buffer.byteLength(body) > MAX_BODY_BYTES) { req.destroy(); return; }
      });
      req.on('end', () => {
        try {
          const { appKey } = JSON.parse(body || '{}');
          res.end(JSON.stringify({ success: true, appKey }));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    // 2. Read Directory
    if (pathname === '/api/readdir') {
      const dirPath = parsedUrl.searchParams.get('path') || 'C:\\';
      const result = await fsEngine.readDirectory(dirPath);
      res.end(JSON.stringify(result));
      return;
    }

    // 2a. Recycle Bin Statistics
    if (pathname === '/api/recycle-bin/stats') {
      try {
        const stats = await storage.queryRecycleBin();
        res.end(JSON.stringify({ success: true, ...stats }));
      } catch (err) {
        res.end(JSON.stringify({ success: false, bytes: 0, count: 0, error: err.message }));
      }
      return;
    }

    // 2b. Detailed File & Folder Metrics
    if (pathname === '/api/file-details') {
      const itemPath = parsedUrl.searchParams.get('path');
      const details = await fsEngine.getFileDetails(itemPath);
      res.end(JSON.stringify(details));
      return;
    }

    // 3. File Content for Quick Look
    if (pathname === '/api/file-content') {
      const filePath = parsedUrl.searchParams.get('path');
      if (!filePath) {
        res.end(JSON.stringify({ type: 'error', error: 'Missing path' }));
        return;
      }
      const content = await fsEngine.getFileContent(filePath);
      res.end(JSON.stringify(content));
      return;
    }

    // 4. Raw file streaming (for images/videos/audio in Quick Look and thumbnails)
    if (pathname === '/api/raw-file') {
      const filePath = parsedUrl.searchParams.get('path');
      if (!filePath) {
        res.writeHead(400);
        res.end('Missing file path');
        return;
      }
      try {
        const stats = await fs.promises.stat(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mime = MIME_TYPES[ext] || 'application/octet-stream';
        const total = stats.size;
        const rangeHeader = req.headers['range'];

        const baseHeaders = {
          'Content-Type': mime,
          'Cache-Control': 'public, max-age=3600',
          'Accept-Ranges': 'bytes'
        };
        if (parsedUrl.searchParams.get('download') === '1') {
          baseHeaders['Content-Disposition'] = `attachment; filename="${encodeURIComponent(path.basename(filePath))}"`;
        }

        if (rangeHeader) {
          // Partial Content (206) — required for video/audio seeking
          const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
          const start = parseInt(startStr, 10);
          const end = endStr ? parseInt(endStr, 10) : total - 1;
          if (isNaN(start) || start >= total || end >= total) {
            res.writeHead(416, { 'Content-Range': `bytes */${total}` });
            res.end();
            return;
          }
          const chunkSize = end - start + 1;
          res.writeHead(206, {
            ...baseHeaders,
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Content-Length': chunkSize
          });
          fs.createReadStream(filePath, { start, end }).pipe(res);
        } else {
          res.writeHead(200, { ...baseHeaders, 'Content-Length': total });
          const stream = fs.createReadStream(filePath);
          stream.on('error', () => { if (!res.headersSent) res.writeHead(500); res.end(); });
          stream.pipe(res);
        }
      } catch (err) {
        res.writeHead(404);
        res.end('File not found');
      }
      return;
    }

    // Body parsing helper for POST requests
    let body = '';
    let bodyOverflow = false;
    req.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        bodyOverflow = true;
        req.destroy();
      }
    });
    req.on('end', async () => {
      if (bodyOverflow) {
        if (!res.headersSent) { res.writeHead(413); res.end(JSON.stringify({ error: 'Request body too large' })); }
        return;
      }
      let data = {};
      if (body) {
        try { data = JSON.parse(body); } catch {}
      }

      // Path traversal guard — call before any path.join(userInput, userInput)
      function safeJoin(base, name) {
        if (!base || !name || typeof base !== 'string' || typeof name !== 'string') {
          throw new Error('Invalid path argument');
        }
        // name must not contain any path separator or parent-traversal component
        const clean = path.basename(name);
        if (!clean || clean !== name || clean === '.' || clean === '..') {
          throw new Error(`Unsafe filename: ${name}`);
        }
        return path.join(base, clean);
      }

      // 5. Create Folder
      if (pathname === '/api/create-folder') {
        try {
          const target = safeJoin(data.parentDir, data.name);
          await fs.promises.mkdir(target, { recursive: false });
          res.end(JSON.stringify({ success: true, path: target }));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 6. Create File
      if (pathname === '/api/create-file') {
        try {
          const target = safeJoin(data.parentDir, data.name);
          const buf = data.encoding === 'base64' ? Buffer.from(data.content, 'base64') : (data.content || '');
          await fs.promises.writeFile(target, buf);
          res.end(JSON.stringify({ success: true, path: target }));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 7. Rename Item
      if (pathname === '/api/rename') {
        try {
          const parent = path.dirname(data.oldPath);
          const newPath = path.join(parent, data.newName);
          await fs.promises.rename(data.oldPath, newPath);
          res.end(JSON.stringify({ success: true, newPath }));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 7b. Batch Rename Item
      if (pathname === '/api/batch-rename' && req.method === 'POST') {
        try {
          const results = [];
          for (const item of (data.renames || [])) {
            try {
              await fs.promises.rename(item.oldPath, item.newPath);
              results.push({ oldPath: item.oldPath, newPath: item.newPath, success: true });
            } catch (err) {
              results.push({ oldPath: item.oldPath, newPath: item.newPath, success: false, error: err.message });
            }
          }
          res.end(JSON.stringify({ success: results.every(r => r.success), results }));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 7c. Checksum Calculation
      if (pathname === '/api/checksum' && req.method === 'POST') {
        try {
          const filePath = data.filePath;
          const algorithm = data.algorithm || 'sha256';
          if (!fs.existsSync(filePath)) {
            res.end(JSON.stringify({ success: false, error: 'File not found' }));
            return;
          }
          const hash = crypto.createHash(algorithm);
          const stream = fs.createReadStream(filePath);
          stream.on('data', d => hash.update(d));
          stream.on('end', () => {
            res.end(JSON.stringify({ success: true, algorithm, hash: hash.digest('hex') }));
          });
          stream.on('error', err => {
            res.end(JSON.stringify({ success: false, error: err.message }));
          });
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 8. Delete Item (Recycle Bin / Unlink)
      if (pathname === '/api/delete') {
        try {
          const stats = await fs.promises.stat(data.path);
          if (stats.isDirectory()) {
            await fs.promises.rm(data.path, { recursive: true, force: true });
          } else {
            await fs.promises.unlink(data.path);
          }
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 9. Copy Items
      if (pathname === '/api/copy') {
        try {
          for (const src of (data.sources || [])) {
            if (!src || typeof src !== 'string') continue;
            const base = path.basename(src);
            let dest = path.join(data.destDir, base);
            if (fs.existsSync(dest)) {
              const ext = path.extname(base);
              const nameWithoutExt = path.basename(base, ext);
              let count = 1;
              let copyName = `${nameWithoutExt} - Copy${ext}`;
              while (fs.existsSync(path.join(data.destDir, copyName))) {
                count++;
                copyName = `${nameWithoutExt} - Copy (${count})${ext}`;
              }
              dest = path.join(data.destDir, copyName);
            }
            await fs.promises.cp(src, dest, { recursive: true });
          }
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 10. Move Items
      if (pathname === '/api/move') {
        try {
          for (const src of (data.sources || [])) {
            if (!src || typeof src !== 'string') continue;
            const base = path.basename(src);
            const dest = path.join(data.destDir, base);
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
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 11. Open Item (with default Windows app)
      if (pathname === '/api/open') {
        exec(`start "" "${data.path.replace(/"/g, '""')}"`, { windowsHide: true });
        res.end(JSON.stringify({ success: true }));
        return;
      }

      // 12. Reveal in Explorer
      if (pathname === '/api/reveal') {
        exec(`explorer.exe /select,"${data.path.replace(/"/g, '""')}"`, { windowsHide: true });
        res.end(JSON.stringify({ success: true }));
        return;
      }

      // 13. Open Terminal
      if (pathname === '/api/terminal') {
        const terminal = data.terminal || 'wt';
        const targetPath = data.path || 'C:\\';
        const safePath = targetPath.replace(/'/g, "''");
        if (terminal === 'powershell') {
          exec(`start powershell.exe -NoExit -Command "Set-Location -LiteralPath '${safePath}'"`);
        } else if (terminal === 'cmd') {
          exec(`start cmd.exe /k "cd /d "${targetPath}""`);
        } else if (terminal === 'gitbash') {
          exec(`start "" "C:\\Program Files\\Git\\git-bash.exe" --cd="${targetPath}" || start bash.exe || start powershell.exe -NoExit -Command "Set-Location -LiteralPath '${safePath}'"`);
        } else {
          exec(`start wt.exe -d "${targetPath}" || start powershell.exe -NoExit -Command "Set-Location -LiteralPath '${safePath}'"`);
        }
        res.end(JSON.stringify({ success: true }));
        return;
      }

      // 14. Fast Async Search
      if (pathname === '/api/search') {
        const query = (data.query || '').toLowerCase();
        const rootDir = data.rootDir || 'C:\\';
        const searchContent = !!data.searchContent;
        const results = [];
        const startTime = Date.now();

        async function walk(curr, depth) {
          if (results.length >= 150 || depth > 7) return;
          let dirents;
          try { dirents = await fs.promises.readdir(curr, { withFileTypes: true }); } catch { return; }

          for (const d of dirents) {
            if (results.length >= 150) break;
            const fullPath = path.join(curr, d.name);
            const isDir = d.isDirectory();
            const ext = isDir ? '' : path.extname(d.name).toLowerCase();
            let matched = d.name.toLowerCase().includes(query);
            let matchSnippet = null;

            if (!matched && searchContent && !isDir) {
              const textExts = ['.txt', '.md', '.json', '.js', '.ts', '.py', '.html', '.css', '.csv'];
              if (textExts.includes(ext)) {
                try {
                  const stat = await fs.promises.stat(fullPath);
                  if (stat.size < 300 * 1024) {
                    const content = await fs.promises.readFile(fullPath, 'utf8');
                    const idx = content.toLowerCase().indexOf(query);
                    if (idx !== -1) {
                      matched = true;
                      matchSnippet = '...' + content.substring(Math.max(0, idx - 25), Math.min(content.length, idx + query.length + 25)).replace(/\s+/g, ' ') + '...';
                    }
                  }
                } catch {}
              }
            }

            if (matched) {
              let size = 0, mtime = null;
              try { const s = await fs.promises.stat(fullPath); size = s.size; mtime = s.mtime.toISOString(); } catch {}
              results.push({ name: d.name, path: fullPath, isDirectory: isDir, size, mtime, extension: ext, matchSnippet });
            }

            if (isDir && !d.name.startsWith('.') && d.name !== 'node_modules') {
              await walk(fullPath, depth + 1);
            }
          }
        }

        await walk(rootDir, 0);
        res.end(JSON.stringify({ count: results.length, durationMs: Date.now() - startTime, results }));
        return;
      }

      // 15. Tags API
      if (pathname === '/api/tags') {
        const tags = loadJson(tagsFile, {});
        if (req.method === 'POST') {
          if (data.action === 'set') {
            tags[data.path] = data.tag;
          } else if (data.action === 'remove') {
            delete tags[data.path];
          }
          saveJson(tagsFile, tags);
        }
        res.end(JSON.stringify(tags));
        return;
      }

      // 16. Pins API
      if (pathname === '/api/pins') {
        const defaultPins = [];
        let pins = loadJson(pinsFile, defaultPins);
        if (req.method === 'POST' && Array.isArray(data.pins)) {
          pins = data.pins;
          saveJson(pinsFile, pins);
        }
        res.end(JSON.stringify(pins));
        return;
      }

      // 17. Archive Inspect API
      if (pathname === '/api/archive/inspect') {
        const filePath = parsedUrl.searchParams.get('path');
        try {
          const info = await archive.listArchive(filePath);
          res.end(JSON.stringify(info));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 18. Archive Extract API
      if (pathname === '/api/archive/extract' && req.method === 'POST') {
        try {
          const filePath = data.path;
          const targetDir = data.destDir || path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)));
          const out = await archive.extractArchive(filePath, targetDir);
          res.end(JSON.stringify(out));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 19. Archive Compress API
      if (pathname === '/api/archive/compress' && req.method === 'POST') {
        try {
          const out = await archive.compressItems(data.sources, data.targetPath, data.format || 'zip');
          res.end(JSON.stringify(out));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 20. VLC Status API
      if (pathname === '/api/vlc-status') {
        res.end(JSON.stringify({
          installed: vlc.isVlcInstalled(),
          path: vlc.getVlcExecutable()
        }));
        return;
      }

      // 21. VLC Play API
      if (pathname === '/api/vlc-play' && req.method === 'POST') {
        try {
          const out = await vlc.playMedia(data.filePath || data.path, {
            enqueue: data.enqueue,
            fullscreen: data.fullscreen
          });
          res.end(JSON.stringify(out));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 22. Find Duplicate Files API
      if (pathname === '/api/find-duplicates' && req.method === 'POST') {
        try {
          const out = await dedup.scanDuplicates({
            folderPath: data.folderPath,
            recursive: !!data.recursive,
            minSize: data.minSize || 1
          });
          res.end(JSON.stringify(out));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message, duplicateGroups: [], wastedBytes: 0 }));
        }
        return;
      }

      // 23. Delete Duplicate Files API
      if (pathname === '/api/delete-duplicates' && req.method === 'POST') {
        try {
          const out = await dedup.deleteDuplicates(data.filePaths || []);
          res.end(JSON.stringify(out));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message, deletedCount: 0, freedBytes: 0 }));
        }
        return;
      }

      // 24. Eject Drive API
      if (pathname === '/api/eject-drive' && req.method === 'POST') {
        const letter = (data.drive || data.path || '').replace(/[^a-zA-Z]/g, '').toUpperCase().charAt(0);
        if (!letter || letter === 'C') {
          res.end(JSON.stringify({ success: false, error: 'Cannot eject system OS drive' }));
          return;
        }

        const cmd = `powershell -NoProfile -Command "(New-Object -comObject Shell.Application).Namespace(17).ParseName('${letter}:').InvokeVerb('Eject')"`;
        exec(cmd, (err) => {
          if (err) {
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
          res.end(JSON.stringify({ success: true, letter }));
        });
        return;
      }

      // 25. Set File Attributes (Read-Only / Archive)
      if (pathname === '/api/set-attributes' && req.method === 'POST') {
        const targetPath = data.path;
        const readOnly = !!data.readOnly;
        try {
          if (process.platform === 'win32') {
            const flag = readOnly ? '+r' : '-r';
            exec(`attrib ${flag} "${targetPath.replace(/"/g, '""')}"`, (err) => {
              if (err) res.end(JSON.stringify({ success: false, error: err.message }));
              else res.end(JSON.stringify({ success: true, readOnly }));
            });
            return;
          }
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 26. Register Default File Manager
      if (pathname === '/api/make-default' && req.method === 'POST') {
        try {
          const script = path.join(__dirname, 'scripts', 'register-default-file-manager.bat');
          exec(`cmd.exe /c "${script.replace(/"/g, '""')}"`, (err) => {
            if (err) res.end(JSON.stringify({ success: false, error: err.message }));
            else res.end(JSON.stringify({ success: true }));
          });
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 27. Restore Windows Explorer Default
      if (pathname === '/api/restore-default' && req.method === 'POST') {
        try {
          const script = path.join(__dirname, 'scripts', 'restore-windows-explorer.bat');
          exec(`cmd.exe /c "${script.replace(/"/g, '""')}"`, (err) => {
            if (err) res.end(JSON.stringify({ success: false, error: err.message }));
            else res.end(JSON.stringify({ success: true }));
          });
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 28. Analyze Storage API
      if (pathname === '/api/storage/analyze' && req.method === 'POST') {
        try {
          const out = await storage.analyzeStorage(data || {});
          res.end(JSON.stringify(out));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 29. Clean Temp Cache API
      if (pathname === '/api/storage/clean-temp' && req.method === 'POST') {
        try {
          const out = await storage.cleanTempFiles();
          res.end(JSON.stringify(out));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message, deletedCount: 0, freedBytes: 0 }));
        }
        return;
      }

      // 30. Empty Recycle Bin API
      if (pathname === '/api/storage/empty-recycle' && req.method === 'POST') {
        try {
          const out = await storage.emptyRecycleBin(data && data.drive);
          res.end(JSON.stringify(out));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 31. Open System Recycle Bin
      if (pathname === '/api/recycle-bin/open' && req.method === 'POST') {
        try {
          const { exec } = require('child_process');
          if (process.platform === 'win32') {
            exec('start shell:RecycleBinFolder', { windowsHide: true });
          } else if (process.platform === 'darwin') {
            exec('open ~/.Trash');
          } else {
            exec('xdg-open trash:///');
          }
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 32. Restore Item from Recycle Bin
      if (pathname === '/api/recycle-bin/restore' && req.method === 'POST') {
        try {
          const out = await storage.restoreRecycleBinItem(data && data.path);
          res.end(JSON.stringify(out));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 33. Restore All Items from Recycle Bin
      if (pathname === '/api/recycle-bin/restore-all' && req.method === 'POST') {
        try {
          const out = await storage.restoreAllRecycleBinItems();
          res.end(JSON.stringify(out));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // 34. Permanently Delete Item from Recycle Bin
      if (pathname === '/api/recycle-bin/delete' && req.method === 'POST') {
        try {
          const out = await storage.deletePermanentlyRecycleBinItem(data && data.path);
          res.end(JSON.stringify(out));
        } catch (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    });
    return;
  }

  // --- STATIC FILES SERVER (src/) ---
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Path-traversal guard: resolved path must stay inside PUBLIC_DIR
  const resolvedFilePath = path.resolve(filePath);
  if (!resolvedFilePath.startsWith(path.resolve(PUBLIC_DIR))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(resolvedFilePath)) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  } else {
    filePath = resolvedFilePath;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Cache-Control: vendor assets can be cached a week; app source 1 hour
  const isVendor = filePath.includes('vendor');
  const cacheControl = isVendor ? 'public, max-age=604800, immutable' : 'public, max-age=3600';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Error reading file: ' + err.code);
    } else {
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': cacheControl });
      res.end(content);
    }
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[MyFiles] Port ${PORT} is already in use. Is another instance running?`);
    console.error(`[MyFiles] Try: taskkill /F /IM node.exe   or change PORT env var.`);
  } else {
    console.error('[MyFiles] Server error:', err);
  }
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  const appUrl = `http://localhost:${PORT}`;
  console.log(`\n========================================`);
  console.log(`  MyFiles App Server running at:`);
  console.log(`  ${appUrl}`);
  console.log(`========================================\n`);

  // Launch in native desktop app window using Microsoft Edge or Google Chrome
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const appArgs = [
    `--app=${appUrl}`,
    '--window-size=1320,860',
    '--window-position=100,50'
  ];

  if (fs.existsSync(edgePath)) {
    spawn(edgePath, appArgs, { detached: true, stdio: 'ignore' }).unref();
  } else if (fs.existsSync(chromePath)) {
    spawn(chromePath, appArgs, { detached: true, stdio: 'ignore' }).unref();
  } else {
    // Fallback: default browser
    exec(`start ${appUrl}`);
  }
});

