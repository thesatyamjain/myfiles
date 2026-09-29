// fs-engine.js - Unified File System Engine for MyFiles (Electron & Node Server)
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn, exec } = require('child_process');
const archive = require('./archive');
const vlc = require('./vlc');
const storage = require('./storage');
const { pathToFileURL } = require('url');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jfif': 'image/jpeg',
  '.pjpeg': 'image/jpeg',
  '.pjp': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.cur': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.markdown': 'text/markdown; charset=utf-8'
};

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.jfif', '.pjpeg', '.pjp', '.webp', '.avif', '.gif', '.bmp', '.svg', '.ico', '.cur', '.tif', '.tiff'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi', '.wmv'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'];
const TEXT_EXTENSIONS = [
  '.txt', '.md', '.markdown', '.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.json', '.html', '.htm',
  '.css', '.scss', '.sass', '.less', '.py', '.dart', '.rs', '.cpp', '.c', '.h', '.hpp', '.cs', '.go',
  '.java', '.kt', '.swift', '.php', '.rb', '.sh', '.bash', '.zsh', '.bat', '.cmd', '.ps1', '.csv',
  '.tsv', '.log', '.xml', '.svg', '.yaml', '.yml', '.ini', '.toml', '.env', '.conf', '.cfg', '.sql',
  '.diff', '.patch', '.vue', '.svelte', '.graphql', '.gql', '.proto', '.gitignore', '.dockerignore'
];
const ARCHIVE_EXTENSIONS = ['.zip', '.tar', '.gz', '.tgz', '.bz2', '.xz', '.7z', '.rar'];

// Cache for Windows drive metadata (volume names & drive types)
let winDriveCache = new Map();
let lastDriveCacheTime = 0;

function refreshWindowsDrivesInfo() {
  if (process.platform !== 'win32') return;
  const now = Date.now();
  if (winDriveCache.size > 0 && (now - lastDriveCacheTime < 30000)) {
    return;
  }
  try {
    const cp = exec('wmic logicaldisk get DeviceID,DriveType,VolumeName', { timeout: 3000 }, (err, stdout) => {
      if (!err && stdout) {
        try {
          const lines = stdout.trim().split(/\r?\n/).slice(1);
          const nextMap = new Map();
          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;
            const parts = line.split(/\s+/);
            if (parts.length >= 2 && /^[A-Z]:$/i.test(parts[0])) {
              const letter = parts[0].charAt(0).toUpperCase();
              const driveType = parseInt(parts[1], 10) || 3;
              const volumeName = parts.slice(2).join(' ').trim();
              nextMap.set(letter, {
                volumeName,
                driveType,
                isRemovable: driveType === 2 || driveType === 5
              });
            }
          }
          if (nextMap.size > 0) {
            winDriveCache = nextMap;
            lastDriveCacheTime = Date.now();
          }
        } catch {}
      }
    });
    if (cp && typeof cp.unref === 'function') {
      cp.unref();
    }
  } catch {}
}

// Prime drive info on module load without blocking
if (process.platform === 'win32') {
  refreshWindowsDrivesInfo();
}

/**
 * Detect all mounted logical drives with storage metrics
 */
async function getDrives() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const drives = [];

  if (process.platform === 'win32') {
    refreshWindowsDrivesInfo();
  }

  for (const letter of letters) {
    const rootPath = `${letter}:\\`;
    try {
      if (fs.existsSync(rootPath)) {
        let freeBytes = 0;
        let totalBytes = 0;
        try {
          const stat = fs.statfsSync(rootPath);
          freeBytes = Number(stat.bavail) * Number(stat.bsize);
          totalBytes = Number(stat.blocks) * Number(stat.bsize);
        } catch {}

        const info = winDriveCache.get(letter);
        const driveType = info ? info.driveType : (letter === 'C' ? 3 : 3);
        const isRemovable = info ? info.isRemovable : false;

        let label = '';
        if (info && info.volumeName) {
          label = info.volumeName;
        } else if (letter === 'C') {
          label = 'OS Disk';
        } else if (isRemovable) {
          label = 'USB Drive';
        } else if (driveType === 4) {
          label = 'Network Drive';
        } else if (driveType === 5) {
          label = 'CD/DVD Drive';
        } else {
          label = 'Local Drive';
        }

        drives.push({
          letter,
          path: rootPath,
          label,
          freeBytes,
          totalBytes,
          usedBytes: totalBytes > freeBytes ? totalBytes - freeBytes : 0,
          driveType,
          isRemovable
        });
      }
    } catch {}
  }
  return drives;
}

/**
 * Standard system folders mapped to macOS Finder & Windows conventions
 */
function getSpecialFolders() {
  const home = os.homedir();
  const userName = path.basename(home);
  const progFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const publicDir = process.env['PUBLIC'] || path.join(path.dirname(home), 'Public');
  const oneDrive = process.env['OneDrive'] || path.join(home, 'OneDrive');
  const iCloud = path.join(home, 'iCloudDrive');
  const cloudPath = fs.existsSync(iCloud) ? iCloud : (fs.existsSync(oneDrive) ? oneDrive : home);

  function resolveUserFolder(folder) {
    const p1 = path.join(home, folder);
    if (fs.existsSync(p1)) return p1;
    const p2 = path.join(oneDrive, folder);
    if (fs.existsSync(p2)) return p2;
    return p1;
  }

  const recentDir = path.join(home, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Recent');

  return [
    { id: 'recents', name: 'Recents', path: fs.existsSync(recentDir) ? recentDir : path.join(home, 'Recent'), icon: 'clock' },
    { id: 'shared', name: 'Shared', path: fs.existsSync(publicDir) ? publicDir : home, icon: 'shared' },
    { id: 'applications', name: 'Applications', path: progFiles, icon: 'applications' },
    { id: 'downloads', name: 'Downloads', path: resolveUserFolder('Downloads'), icon: 'download' },
    { id: 'desktop', name: 'Desktop', path: resolveUserFolder('Desktop'), icon: 'desktop' },
    { id: 'documents', name: 'Documents', path: resolveUserFolder('Documents'), icon: 'document' },
    { id: 'pictures', name: 'Pictures', path: resolveUserFolder('Pictures'), icon: 'picture' },
    { id: 'music', name: 'Music', path: resolveUserFolder('Music'), icon: 'music' },
    { id: 'videos', name: 'Videos', path: resolveUserFolder('Videos'), icon: 'video' },
    { id: 'cloud', name: 'iCloud Drive', path: cloudPath, icon: 'cloud' },
    { id: 'home', name: userName, path: home, icon: 'house' }
  ];
}

/**
 * Normalize and resolve special path shortcuts (~, recent junction, onedrive)
 */
function resolvePath(rawPath) {
  if (!rawPath) return os.homedir();
  const lower = rawPath.trim().toLowerCase().replace(/^[\\/]+|[\\/]+$/g, '');
  if (lower === 'recycle-bin' || lower === 'recyclebin' || lower === 'trash' || lower === 'recycle bin' || lower === 'shell:recyclebinfolder') {
    return 'recycle-bin';
  }
  const home = os.homedir();
  let p = rawPath.trim();
  if (p === '~' || p.startsWith('~/') || p.startsWith('~\\')) {
    p = path.join(home, p.slice(1));
  }
  // Handle Windows legacy Recent junction point
  if (p.toLowerCase() === path.join(home, 'Recent').toLowerCase() || p.toLowerCase() === (home.toLowerCase() + '\\recent')) {
    const actualRecent = path.join(home, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Recent');
    if (fs.existsSync(actualRecent)) p = actualRecent;
  }
  // OneDrive fallback for common folders
  if (!fs.existsSync(p)) {
    const base = path.basename(p);
    const oneDrive = process.env['OneDrive'] || path.join(home, 'OneDrive');
    const oneDriveAlt = path.join(oneDrive, base);
    if (fs.existsSync(oneDriveAlt)) p = oneDriveAlt;
  }
  return path.resolve(p);
}

const dirReadCache = new Map();
const DIR_CACHE_TTL_MS = 3000;

function invalidateDirCache(targetPath) {
  if (!targetPath) {
    dirReadCache.clear();
    return;
  }
  try {
    const resolved = resolvePath(targetPath);
    dirReadCache.delete(resolved);
    const parent = path.dirname(resolved);
    if (parent && parent !== resolved) {
      dirReadCache.delete(parent);
    }
  } catch {
    dirReadCache.clear();
  }
}

/**
 * Read directory entries with full stats & metadata
 */
async function readDirectory(targetPath) {
  const norm = (targetPath || '').trim().toLowerCase().replace(/^[\\/]+|[\\/]+$/g, '');
  if (norm === 'recycle-bin' || norm === 'recyclebin' || norm === 'trash' || norm === 'recycle bin' || norm === 'shell:recyclebinfolder') {
    try {
      const items = await storage.getRecycleBinItems();
      return {
        success: true,
        currentPath: 'Recycle Bin',
        parentPath: null,
        isRecycleBin: true,
        items
      };
    } catch (err) {
      return {
        success: true,
        currentPath: 'Recycle Bin',
        parentPath: null,
        isRecycleBin: true,
        items: []
      };
    }
  }

  const resolved = resolvePath(targetPath);
  const now = Date.now();
  const cached = dirReadCache.get(resolved);
  if (cached && (now - cached.timestamp < DIR_CACHE_TTL_MS)) {
    return {
      success: true,
      currentPath: cached.data.currentPath,
      parentPath: cached.data.parentPath,
      items: cached.data.items.slice()
    };
  }

  try {
    const dirents = await fs.promises.readdir(resolved, { withFileTypes: true });
    const items = [];
    const CHUNK_SIZE = 256;

    for (let i = 0; i < dirents.length; i += CHUNK_SIZE) {
      const chunk = dirents.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(chunk.map(async (d) => {
        const fullPath = path.join(resolved, d.name);
        let isDir = d.isDirectory();
        let isFile = d.isFile();
        let size = 0;
        let mtime = null;
        let birthtime = null;
        let atime = null;
        let isReadOnly = false;

        try {
          const stats = await fs.promises.stat(fullPath);
          size = stats.size;
          mtime = stats.mtime;
          birthtime = stats.birthtime;
          atime = stats.atime;
          isDir = stats.isDirectory();
          isFile = stats.isFile();
          isReadOnly = !(stats.mode & 0o200);
        } catch {
          // Keep dirent attributes on permission or symlink error
        }

        const ext = isDir ? '' : path.extname(d.name).toLowerCase();
        return {
          name: d.name,
          path: fullPath,
          isDirectory: isDir,
          isFile: isFile,
          size,
          mtime: mtime ? mtime.toISOString() : null,
          birthtime: birthtime ? birthtime.toISOString() : (mtime ? mtime.toISOString() : null),
          atime: atime ? atime.toISOString() : (mtime ? mtime.toISOString() : null),
          isReadOnly,
          extension: ext,
          isHidden: d.name.startsWith('.') || d.name.startsWith('~') || d.name.endsWith('~') || d.name.includes('~lock~') || d.name.startsWith('$')
        };
      }));
      items.push(...chunkResults);
    }

    const result = {
      success: true,
      currentPath: resolved,
      parentPath: path.dirname(resolved) !== resolved ? path.dirname(resolved) : null,
      items
    };

    dirReadCache.set(resolved, { timestamp: now, data: result });
    if (dirReadCache.size > 100) {
      const oldestKey = dirReadCache.keys().next().value;
      dirReadCache.delete(oldestKey);
    }

    return result;
  } catch (err) {
    return {
      success: false,
      error: err.message,
      items: []
    };
  }
}

/**
 * Get deep recursive or shallow details of an item
 */
async function getFileDetails(itemPath) {
  try {
    const stats = await fs.promises.stat(itemPath);
    let fileCount = 0;
    let dirCount = 0;
    let totalBytes = stats.size;

    if (stats.isDirectory()) {
      try {
        const dirents = await fs.promises.readdir(itemPath, { withFileTypes: true });
        fileCount = dirents.filter(d => !d.isDirectory()).length;
        dirCount = dirents.filter(d => d.isDirectory()).length;
      } catch {}
    }

    return {
      success: true,
      path: itemPath,
      size: totalBytes,
      fileCount: stats.isDirectory() ? (fileCount + dirCount) : 1,
      files: fileCount,
      subfolders: dirCount,
      birthtime: stats.birthtime ? stats.birthtime.toISOString() : null,
      mtime: stats.mtime ? stats.mtime.toISOString() : null,
      atime: stats.atime ? stats.atime.toISOString() : null,
      isReadOnly: !(stats.mode & 0o200)
    };
  } catch (err) {
    if (itemPath && itemPath.includes('$Recycle.Bin')) {
      return {
        success: true,
        path: itemPath,
        size: 0,
        fileCount: 1,
        files: 1,
        subfolders: 0,
        birthtime: null,
        mtime: null,
        atime: null,
        isReadOnly: false
      };
    }
    return { success: false, error: err.message };
  }
}

/**
 * Fast Quick Look content inspector (up to 2MB text slice or media type URL)
 */
async function getFileContent(filePath, maxBytes = 2 * 1024 * 1024, isElectron = false) {
  try {
    const stats = await fs.promises.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mediaUrl = isElectron ? pathToFileURL(filePath).href : `/api/raw-file?path=${encodeURIComponent(filePath)}`;

    if (IMAGE_EXTENSIONS.includes(ext) || VIDEO_EXTENSIONS.includes(ext) || AUDIO_EXTENSIONS.includes(ext)) {
      return {
        type: IMAGE_EXTENSIONS.includes(ext) ? 'image' : (VIDEO_EXTENSIONS.includes(ext) ? 'video' : 'audio'),
        url: mediaUrl,
        size: stats.size,
        mtime: stats.mtime
      };
    }

    if (ext === '.pdf') {
      return {
        type: 'pdf',
        url: mediaUrl,
        size: stats.size,
        mtime: stats.mtime
      };
    }

    const docxExts = ['.docx', '.docm'];
    if (docxExts.includes(ext)) {
      const tarPath = archive.getTarExecutable();
      if (tarPath) {
        try {
          const docXml = await new Promise((resolve, reject) => {
            const child = spawn(tarPath, ['-x', '-O', '-f', filePath, 'word/document.xml'], { windowsHide: true });
            let out = '';
            child.stdout.on('data', d => { out += d.toString(); });
            child.on('close', code => {
              if (code === 0 && out) resolve(out);
              else reject(new Error('Failed to extract document.xml'));
            });
            child.on('error', reject);
          });

          const paragraphs = (docXml.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [])
            .map(p => {
              const texts = p.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g) || [];
              return texts.map(t => t.replace(/<[^>]+>/g, '')).join('');
            })
            .filter(t => t.trim().length > 0);

          const fullText = paragraphs.join('\n\n');
          return {
            type: 'document',
            docType: 'Word Document',
            content: fullText,
            paragraphsCount: paragraphs.length,
            wordsCount: fullText.split(/\s+/).filter(Boolean).length,
            size: stats.size,
            mtime: stats.mtime
          };
        } catch {}
      }
    }

    const xlsxExts = ['.xlsx', '.xlsm'];
    if (xlsxExts.includes(ext)) {
      const tarPath = archive.getTarExecutable();
      if (tarPath) {
        try {
          const stringsXml = await new Promise((resolve) => {
            const child = spawn(tarPath, ['-x', '-O', '-f', filePath, 'xl/sharedStrings.xml'], { windowsHide: true });
            let out = '';
            child.stdout.on('data', d => { out += d.toString(); });
            child.on('close', code => {
              if (code === 0 && out) resolve(out);
              else resolve('');
            });
            child.on('error', () => resolve(''));
          });

          const cellStrings = (stringsXml.match(/<t\b[^>]*>([\s\S]*?)<\/t>/g) || [])
            .map(t => t.replace(/<[^>]+>/g, '').trim())
            .filter(Boolean);

          const fullText = cellStrings.slice(0, 300).join('  |  ');
          return {
            type: 'document',
            docType: 'Excel Spreadsheet',
            content: fullText || '(Spreadsheet cells or numeric data)',
            paragraphsCount: cellStrings.length,
            wordsCount: cellStrings.length,
            size: stats.size,
            mtime: stats.mtime
          };
        } catch {}
      }
    }

    const pptxExts = ['.pptx', '.pptm'];
    if (pptxExts.includes(ext)) {
      const tarPath = archive.getTarExecutable();
      if (tarPath) {
        try {
          const slideXml = await new Promise((resolve) => {
            const child = spawn(tarPath, ['-x', '-O', '-f', filePath, 'ppt/slides/slide1.xml'], { windowsHide: true });
            let out = '';
            child.stdout.on('data', d => { out += d.toString(); });
            child.on('close', code => {
              if (code === 0 && out) resolve(out);
              else resolve('');
            });
            child.on('error', () => resolve(''));
          });

          const texts = (slideXml.match(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/g) || [])
            .map(t => t.replace(/<[^>]+>/g, '').trim())
            .filter(Boolean);

          const fullText = texts.join('\n');
          return {
            type: 'document',
            docType: 'PowerPoint Presentation',
            content: fullText || 'Slide 1 Presentation',
            paragraphsCount: texts.length,
            wordsCount: fullText.split(/\s+/).filter(Boolean).length,
            size: stats.size,
            mtime: stats.mtime
          };
        } catch {}
      }
    }

    if (archive.isArchive(filePath)) {
      try {
        const info = await archive.listArchive(filePath);
        return {
          type: 'archive',
          ...info,
          size: stats.size,
          mtime: stats.mtime
        };
      } catch (err) {
        return {
          type: 'archive',
          success: false,
          error: err.message,
          size: stats.size,
          mtime: stats.mtime
        };
      }
    }

    if (VIDEO_EXTENSIONS.includes(ext)) {
      const vlcInstance = vlc.getVlc();
      if (vlcInstance.isInstalled) {
        try {
          const meta = await vlc.probeMedia(filePath);
          return {
            type: 'video',
            url: mediaUrl,
            audioTracks: meta.audioTracks,
            size: stats.size,
            mtime: stats.mtime
          };
        } catch {}
      }
    }

    if (TEXT_EXTENSIONS.includes(ext) || stats.size < 200 * 1024) {
      let text = '';
      let truncated = false;

      if (stats.size > maxBytes) {
        const fd = await fs.promises.open(filePath, 'r');
        const buf = Buffer.alloc(maxBytes);
        await fd.read(buf, 0, maxBytes, 0);
        await fd.close();
        text = buf.toString('utf8');
        truncated = true;
      } else {
        text = await fs.promises.readFile(filePath, 'utf8');
      }

      return {
        type: 'text',
        content: text,
        truncated,
        size: stats.size,
        mtime: stats.mtime,
        isMarkdown: ext === '.md' || ext === '.markdown'
      };
    }

    return {
      type: 'binary',
      size: stats.size,
      mtime: stats.mtime,
      extension: ext
    };
  } catch (err) {
    return { type: 'error', error: err.message };
  }
}

/**
 * Cryptographic checksum engine (SHA-256 / MD5 with stream piping)
 */
function calculateChecksum(filePath, algorithm = 'sha256') {
  return new Promise((resolve, reject) => {
    const algo = (algorithm || 'sha256').toLowerCase();
    const hash = crypto.createHash(algo);
    const stream = fs.createReadStream(filePath);
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Search files with cancellation, categories and regex support
 */
async function searchFiles(rootPath, query, maxResults = 100, category = 'all') {
  const results = [];
  const q = (query || '').toLowerCase().trim();
  if (!q && category === 'all') return results;

  async function walk(dir, depth = 0) {
    if (depth > 6 || results.length >= maxResults) return;
    let dirents = [];
    try {
      dirents = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const d of dirents) {
      if (results.length >= maxResults) break;
      if (d.name.startsWith('.') || d.name === '$Recycle.Bin' || d.name === 'node_modules') continue;

      const fullPath = path.join(dir, d.name);
      const isDir = d.isDirectory();
      const ext = isDir ? '' : path.extname(d.name).toLowerCase();

      // Category filter check
      let matchesCat = true;
      if (category === 'images') matchesCat = IMAGE_EXTENSIONS.includes(ext);
      else if (category === 'videos') matchesCat = VIDEO_EXTENSIONS.includes(ext);
      else if (category === 'audio') matchesCat = AUDIO_EXTENSIONS.includes(ext);
      else if (category === 'documents') matchesCat = TEXT_EXTENSIONS.includes(ext) || ext === '.pdf' || ext === '.doc' || ext === '.docx';
      else if (category === 'folders') matchesCat = isDir;

      const matchesQuery = !q || d.name.toLowerCase().includes(q);

      if (matchesCat && matchesQuery) {
        let size = 0;
        let mtime = null;
        try {
          const stats = await fs.promises.stat(fullPath);
          size = stats.size;
          mtime = stats.mtime;
        } catch {}

        results.push({
          name: d.name,
          path: fullPath,
          isDirectory: isDir,
          size,
          mtime: mtime ? mtime.toISOString() : null,
          extension: ext
        });
      }

      if (isDir) {
        await walk(fullPath, depth + 1);
      }
    }
  }

  await walk(resolvePath(rootPath));
  return results;
}

/**
 * Debounced directory watcher
 */
function watchDirectory(dirPath, onChange) {
  let timer = null;
  try {
    const watcher = fs.watch(dirPath, { persistent: false }, (eventType, filename) => {
      invalidateDirCache(dirPath);
      clearTimeout(timer);
      timer = setTimeout(() => {
        onChange({ eventType, filename, dirPath });
      }, 250);
    });
    return watcher;
  } catch (e) {
    return null;
  }
}

let shareAppsCache = null;
let shareAppsCacheTime = 0;
const SHARE_APPS_CACHE_TTL = 15000; // 15 seconds

/**
 * Detect installed desktop share apps on Windows
 * Multi-layer detection: Start Menu shortcuts, UWP Packages, System utilities,
 * and canonical ProgramFiles paths. Cached with 15s TTL.
 */
function detectInstalledShareApps(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && shareAppsCache && (now - shareAppsCacheTime < SHARE_APPS_CACHE_TTL)) {
    return shareAppsCache;
  }

  const isWin = process.platform === 'win32';
  if (!isWin) {
    const fallback = {
      whatsapp: false,
      telegram: false,
      localsend: false,
      quickshare: false,
      sendanywhere: false,
      phonelink: false,
      bluetooth: false,
      cloud: false
    };
    shareAppsCache = fallback;
    shareAppsCacheTime = now;
    return fallback;
  }

  const localAppData = process.env.LOCALAPPDATA || '';
  const appData = process.env.APPDATA || '';
  const progFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const allUserProfile = process.env.ALLUSERSPROFILE || 'C:\\ProgramData';

  // 1. Gather all Start Menu shortcuts (User + All Users)
  const shortcutSet = new Set();
  const smDirs = [
    path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    path.join(allUserProfile, 'Microsoft', 'Windows', 'Start Menu', 'Programs')
  ];

  function collectShortcuts(dir) {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          collectShortcuts(full);
        } else if (item.name.toLowerCase().endsWith('.lnk')) {
          shortcutSet.add(item.name.toLowerCase());
        }
      }
    } catch {}
  }
  smDirs.forEach(collectShortcuts);

  // 2. Gather UWP Store packages
  let packageDirs = [];
  try {
    const packagesPath = path.join(localAppData, 'Packages');
    if (fs.existsSync(packagesPath)) {
      packageDirs = fs.readdirSync(packagesPath);
    }
  } catch {}

  const hasUwpPackage = (prefix) => {
    const lower = prefix.toLowerCase();
    return packageDirs.some(dir => dir.toLowerCase().includes(lower));
  };

  const hasShortcut = (term) => {
    const lower = term.toLowerCase();
    for (const name of shortcutSet) {
      if (name.includes(lower)) return true;
    }
    return false;
  };

  const existsAny = (paths) => {
    return paths.some(p => {
      try {
        return p && fs.existsSync(p);
      } catch {
        return false;
      }
    });
  };

  // 1. LocalSend
  const localsend = hasShortcut('localsend') || hasUwpPackage('53406LocalSend') || existsAny([
    path.join(progFiles, 'LocalSend', 'localsend_app.exe'),
    path.join(progFilesX86, 'LocalSend', 'localsend_app.exe'),
    path.join(localAppData, 'Programs', 'LocalSend', 'localsend_app.exe'),
    path.join(localAppData, 'LocalSend', 'localsend_app.exe')
  ]);

  // 2. Quick Share (Google) / Nearby Share
  const quickshare = hasShortcut('quick share') || hasShortcut('quickshare') || hasShortcut('nearby share') || hasShortcut('nearbyshare') || existsAny([
    path.join(progFiles, 'Google', 'NearbyShare', 'nearby_share.exe'),
    path.join(progFiles, 'Google', 'NearbyShare', 'nearby_share_launcher.exe'),
    path.join(progFilesX86, 'Google', 'NearbyShare', 'nearby_share.exe'),
    path.join(progFilesX86, 'Google', 'NearbyShare', 'nearby_share_launcher.exe'),
    path.join(localAppData, 'Google', 'NearbyShare', 'nearby_share.exe'),
    path.join(localAppData, 'Google', 'NearbyShare', 'nearby_share_launcher.exe'),
    path.join(progFiles, 'Google', 'Nearby Share', 'nearby_share.exe'),
    path.join(progFiles, 'Google', 'Nearby Share', 'nearby_share_launcher.exe'),
    path.join(progFilesX86, 'Google', 'Nearby Share', 'nearby_share.exe'),
    path.join(progFilesX86, 'Google', 'Nearby Share', 'nearby_share_launcher.exe'),
    path.join(localAppData, 'Google', 'Nearby Share', 'nearby_share.exe'),
    path.join(localAppData, 'Google', 'Nearby Share', 'nearby_share_launcher.exe'),
    path.join(progFiles, 'Google', 'QuickShare', 'quick_share.exe'),
    path.join(progFiles, 'Google', 'QuickShare', 'quick_share_launcher.exe'),
    path.join(progFilesX86, 'Google', 'QuickShare', 'quick_share.exe'),
    path.join(localAppData, 'Google', 'QuickShare', 'quick_share.exe'),
    path.join(progFiles, 'Google', 'Quick Share', 'quick_share.exe'),
    path.join(progFilesX86, 'Google', 'Quick Share', 'quick_share.exe'),
    path.join(localAppData, 'Google', 'Quick Share', 'quick_share.exe'),
    path.join(progFiles, 'Samsung', 'QuickShare', 'QuickShare.exe'),
    path.join(progFilesX86, 'Samsung', 'QuickShare', 'QuickShare.exe'),
    path.join(localAppData, 'Programs', 'QuickShare', 'QuickShare.exe')
  ]);

  // 3. WhatsApp Desktop (Win32, Store UWP, or Start Menu shortcut)
  const whatsapp = hasShortcut('whatsapp') || hasUwpPackage('whatsappdesktop') || existsAny([
    path.join(localAppData, 'WhatsApp', 'WhatsApp.exe'),
    path.join(localAppData, 'Programs', 'WhatsApp', 'WhatsApp.exe'),
    path.join(progFiles, 'WhatsApp', 'WhatsApp.exe'),
    path.join(progFilesX86, 'WhatsApp', 'WhatsApp.exe')
  ]);

  // 4. Telegram Desktop
  const telegram = hasShortcut('telegram') || hasUwpPackage('telegramdesktop') || existsAny([
    path.join(appData, 'Telegram Desktop', 'Telegram.exe'),
    path.join(localAppData, 'Programs', 'Telegram Desktop', 'Telegram.exe'),
    path.join(progFiles, 'Telegram Desktop', 'Telegram.exe'),
    path.join(progFilesX86, 'Telegram Desktop', 'Telegram.exe')
  ]);

  // 5. Send Anywhere
  const sendanywhere = hasShortcut('send anywhere') || hasUwpPackage('sendanywhere') || existsAny([
    path.join(progFiles, 'Send Anywhere', 'Send Anywhere.exe'),
    path.join(progFilesX86, 'Send Anywhere', 'Send Anywhere.exe'),
    path.join(localAppData, 'Programs', 'Send Anywhere', 'Send Anywhere.exe')
  ]);

  // 6. Microsoft Phone Link (Link to Windows)
  const phonelink = hasShortcut('phone link') || hasShortcut('your phone') || hasUwpPackage('microsoft.yourphone');

  // 7. Bluetooth File Transfer (Windows native System32 wizard)
  const bluetooth = existsAny([
    path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'fsquirt.exe'),
    'C:\\Windows\\System32\\fsquirt.exe'
  ]);

  // 8. Cloud Storage (OneDrive, Google Drive, Dropbox, iCloud)
  const cloud = Boolean(process.env.OneDrive && fs.existsSync(process.env.OneDrive)) ||
    hasShortcut('onedrive') || hasShortcut('google drive') || hasShortcut('dropbox') || hasShortcut('icloud') ||
    existsAny([
      path.join(localAppData, 'Microsoft', 'OneDrive', 'OneDrive.exe'),
      path.join(progFiles, 'Google', 'Drive File Stream'),
      path.join(progFiles, 'Dropbox'),
      path.join(localAppData, 'Dropbox')
    ]);

  const result = {
    whatsapp,
    telegram,
    localsend,
    quickshare,
    sendanywhere,
    phonelink,
    bluetooth,
    cloud
  };

  shareAppsCache = result;
  shareAppsCacheTime = now;
  return result;
}

module.exports = {
  MIME_TYPES,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  AUDIO_EXTENSIONS,
  TEXT_EXTENSIONS,
  ARCHIVE_EXTENSIONS,
  getDrives,
  getSpecialFolders,
  resolvePath,
  readDirectory,
  invalidateDirCache,
  getFileDetails,
  getFileContent,
  calculateChecksum,
  searchFiles,
  watchDirectory,
  detectInstalledShareApps
};
