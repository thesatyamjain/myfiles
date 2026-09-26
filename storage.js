// MyFiles Storage Management Engine (Zero-Dependency, Native Node.js)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

/**
 * File extension category mappings.
 */
const EXTENSION_CATEGORIES = {
  // Documents
  '.pdf': 'documents',
  '.doc': 'documents',
  '.docx': 'documents',
  '.txt': 'documents',
  '.md': 'documents',
  '.rtf': 'documents',
  '.odt': 'documents',
  '.csv': 'documents',
  '.xls': 'documents',
  '.xlsx': 'documents',
  '.ppt': 'documents',
  '.pptx': 'documents',
  '.epub': 'documents',

  // Images
  '.png': 'images',
  '.jpg': 'images',
  '.jpeg': 'images',
  '.gif': 'images',
  '.webp': 'images',
  '.svg': 'images',
  '.bmp': 'images',
  '.ico': 'images',
  '.tiff': 'images',
  '.tif': 'images',
  '.raw': 'images',
  '.psd': 'images',

  // Videos
  '.mp4': 'videos',
  '.mkv': 'videos',
  '.avi': 'videos',
  '.mov': 'videos',
  '.wmv': 'videos',
  '.flv': 'videos',
  '.webm': 'videos',
  '.m4v': 'videos',

  // Audio
  '.mp3': 'audio',
  '.wav': 'audio',
  '.flac': 'audio',
  '.aac': 'audio',
  '.ogg': 'audio',
  '.m4a': 'audio',
  '.wma': 'audio',

  // Archives
  '.zip': 'archives',
  '.rar': 'archives',
  '.7z': 'archives',
  '.tar': 'archives',
  '.gz': 'archives',
  '.bz2': 'archives',
  '.xz': 'archives',
  '.iso': 'archives',

  // Apps & Binaries
  '.exe': 'apps',
  '.msi': 'apps',
  '.dll': 'apps',
  '.bat': 'apps',
  '.cmd': 'apps',
  '.apk': 'apps'
};

/**
 * Classifies a file extension into a storage category.
 */
function classifyExtension(ext) {
  if (!ext) return 'other';
  const cleanExt = (ext.startsWith('.') ? ext : '.' + ext).toLowerCase();
  return EXTENSION_CATEGORIES[cleanExt] || 'other';
}

/**
 * Computes drive storage statistics and categorizes top storage consumers.
 */
async function analyzeStorage({ drive = 'C:\\', maxFiles = 40 } = {}) {
  const rootDrive = (drive || 'C:\\').substring(0, 1).toUpperCase() + ':\\';

  let totalBytes = 0;
  let freeBytes = 0;
  let usedBytes = 0;

  try {
    if (fs.existsSync(rootDrive)) {
      const stat = fs.statfsSync(rootDrive);
      freeBytes = Number(stat.bavail) * Number(stat.bsize);
      totalBytes = Number(stat.blocks) * Number(stat.bsize);
      usedBytes = totalBytes > freeBytes ? totalBytes - freeBytes : 0;
    }
  } catch (err) {
    console.error('Error querying drive statfs:', err);
  }

  const categories = {
    documents: { bytes: 0, count: 0 },
    images: { bytes: 0, count: 0 },
    videos: { bytes: 0, count: 0 },
    audio: { bytes: 0, count: 0 },
    archives: { bytes: 0, count: 0 },
    apps: { bytes: 0, count: 0 },
    other: { bytes: 0, count: 0 }
  };

  const topFiles = [];
  const topFolders = [];
  const folderSizeMap = new Map();

  // Determine paths to sample for storage breakdown
  const scanDirs = [];
  const home = os.homedir();

  if (rootDrive.charAt(0) === 'C') {
    // For system drive, scan prominent user data locations
    const userDirs = ['Downloads', 'Documents', 'Desktop', 'Pictures', 'Videos', 'Music'];
    for (const ud of userDirs) {
      const p = path.join(home, ud);
      if (fs.existsSync(p)) scanDirs.push(p);
    }
    const publicDir = process.env['PUBLIC'] || 'C:\\Users\\Public';
    if (fs.existsSync(publicDir)) scanDirs.push(publicDir);
  } else {
    // For non-system drives, scan top-level folders
    try {
      if (fs.existsSync(rootDrive)) {
        const rootEnts = await fs.promises.readdir(rootDrive, { withFileTypes: true });
        for (const re of rootEnts) {
          if (re.isDirectory() && !re.name.startsWith('$') && !re.name.startsWith('.')) {
            scanDirs.push(path.join(rootDrive, re.name));
          }
        }
      }
    } catch {}
  }

  // Safety limits: maximum 25,000 files scanned or 3000ms duration
  let scannedCount = 0;
  const startTime = Date.now();
  const maxScanTimeMs = 3500;
  const maxScanFiles = 25000;

  async function walkDir(dir, depth = 0, rootFolder = '') {
    if (depth > 6 || scannedCount >= maxScanFiles || (Date.now() - startTime) > maxScanTimeMs) {
      return;
    }

    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const ent of entries) {
      if (scannedCount >= maxScanFiles || (Date.now() - startTime) > maxScanTimeMs) break;

      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        const lower = ent.name.toLowerCase();
        if (lower.startsWith('.') || lower.startsWith('$') || lower === 'node_modules' || lower === 'windows' || lower === 'appdata' || lower.includes('cache')) {
          continue;
        }
        await walkDir(fullPath, depth + 1, rootFolder || fullPath);
      } else if (ent.isFile()) {
        scannedCount++;
        try {
          const stats = await fs.promises.stat(fullPath);
          const size = stats.size;
          const ext = path.extname(ent.name).toLowerCase();
          const category = classifyExtension(ext);

          categories[category].bytes += size;
          categories[category].count++;

          // Aggregate folder sizes
          const currentRoot = rootFolder || dir;
          folderSizeMap.set(currentRoot, (folderSizeMap.get(currentRoot) || 0) + size);

          // Track largest files (maintain top candidates)
          if (size > 1024 * 1024) { // Only track files >= 1MB
            topFiles.push({
              name: ent.name,
              path: fullPath,
              size,
              mtime: stats.mtime.toISOString(),
              category,
              extension: ext
            });
          }
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  for (const scanDir of scanDirs) {
    if ((Date.now() - startTime) > maxScanTimeMs) break;
    await walkDir(scanDir, 0, scanDir);
  }

  // Sort top files descending by size
  topFiles.sort((a, b) => b.size - a.size);
  const truncatedTopFiles = topFiles.slice(0, maxFiles);

  // Build top folders list
  for (const [fPath, fSize] of folderSizeMap.entries()) {
    topFolders.push({
      path: fPath,
      name: path.basename(fPath) || fPath,
      size: fSize
    });
  }
  topFolders.sort((a, b) => b.size - a.size);
  const truncatedTopFolders = topFolders.slice(0, 15);

  // Attribute remaining used drive space to "other" / system files
  const categorizedTotal = Object.values(categories).reduce((acc, c) => acc + c.bytes, 0);
  if (usedBytes > categorizedTotal) {
    categories.other.bytes += (usedBytes - categorizedTotal);
  }

  // Query Temporary / Cache info
  let tempBytes = 0;
  let tempCount = 0;
  try {
    const tmpDir = os.tmpdir();
    if (fs.existsSync(tmpDir)) {
      const tmpEnts = await fs.promises.readdir(tmpDir, { withFileTypes: true });
      for (const ent of tmpEnts) {
        tempCount++;
        try {
          const st = await fs.promises.stat(path.join(tmpDir, ent.name));
          tempBytes += st.size;
        } catch {}
      }
    }
  } catch (err) {
    console.error('Error scanning temp files:', err);
  }

  // Query Recycle Bin size & count via PowerShell COM Shell.Application ssfBITBUCKET (10)
  const recycleStats = await queryRecycleBin();

  return {
    success: true,
    drive: rootDrive,
    totalBytes,
    freeBytes,
    usedBytes,
    categories,
    topFiles: truncatedTopFiles,
    topFolders: truncatedTopFolders,
    temp: {
      bytes: tempBytes,
      count: tempCount
    },
    recycle: {
      bytes: recycleStats.bytes,
      count: recycleStats.count
    },
    scannedCount,
    durationMs: Date.now() - startTime
  };
}

/**
 * Queries the Windows Recycle Bin item count and size.
 */
function queryRecycleBin() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve({ bytes: 0, count: 0 });
    }

    const script = `(New-Object -ComObject Shell.Application).Namespace(10).Items() | Measure-Object -Property Size -Sum | Select-Object Count, Sum | ConvertTo-Json -Compress`;
    exec(`powershell -NoProfile -Command "${script}"`, { timeout: 4000 }, (err, stdout) => {
      if (err || !stdout) {
        return resolve({ bytes: 0, count: 0 });
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve({
          count: Number(parsed.Count) || 0,
          bytes: Number(parsed.Sum) || 0
        });
      } catch {
        resolve({ bytes: 0, count: 0 });
      }
    });
  });
}

/**
 * Cleans temporary files from os.tmpdir() that are not currently in use.
 */
async function cleanTempFiles() {
  const tmpDir = os.tmpdir();
  let deletedCount = 0;
  let freedBytes = 0;

  if (!fs.existsSync(tmpDir)) {
    return { success: true, deletedCount: 0, freedBytes: 0 };
  }

  try {
    const entries = await fs.promises.readdir(tmpDir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(tmpDir, ent.name);
      try {
        const stats = await fs.promises.stat(fullPath);
        const itemSize = stats.size;

        if (ent.isDirectory()) {
          await fs.promises.rm(fullPath, { recursive: true, force: true });
          deletedCount++;
          freedBytes += itemSize;
        } else {
          await fs.promises.unlink(fullPath);
          deletedCount++;
          freedBytes += itemSize;
        }
      } catch {
        // Expected for active locked files / handles - silently skip
      }
    }
  } catch (err) {
    return { success: false, error: err.message, deletedCount, freedBytes };
  }

  return {
    success: true,
    deletedCount,
    freedBytes
  };
}

/**
 * Empties the Windows Recycle Bin.
 */
function emptyRecycleBin(driveLetter = '') {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve({ success: true });
    }

    let cmd = 'Clear-RecycleBin -Force -ErrorAction SilentlyContinue';
    if (driveLetter) {
      const letter = driveLetter.replace(/[^a-zA-Z]/g, '').toUpperCase().charAt(0);
      if (letter) {
        cmd = `Clear-RecycleBin -DriveLetter ${letter} -Force -ErrorAction SilentlyContinue`;
      }
    }

    exec(`powershell -NoProfile -Command "${cmd}"`, { timeout: 8000 }, (err) => {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true });
      }
    });
  });
}

/**
 * Retrieves deleted items from the Windows Recycle Bin using Shell.Application COM.
 */
function getRecycleBinItems() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve([]);
    }

    const ps = [
      '$sh = New-Object -ComObject Shell.Application',
      '$bin = $sh.Namespace(10)',
      '$list = @()',
      'foreach ($item in $bin.Items()) {',
      '  $orig = $bin.GetDetailsOf($item, 1)',
      '  $delDate = $bin.GetDetailsOf($item, 2)',
      '  $type = $bin.GetDetailsOf($item, 4)',
      '  $list += [PSCustomObject]@{',
      '    name = $item.Name',
      '    path = $item.Path',
      '    size = $item.Size',
      '    type = $type',
      '    origLoc = $orig',
      '    dateDeleted = $delDate',
      '  }',
      '}',
      '$list | ConvertTo-Json -Compress'
    ].join('\r\n');

    const b64 = Buffer.from(ps, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -EncodedCommand ${b64}`, { maxBuffer: 10 * 1024 * 1024, timeout: 8000 }, (err, stdout) => {
      if (err || !stdout || !stdout.trim()) {
        return resolve([]);
      }
      try {
        let parsed = JSON.parse(stdout.trim());
        if (!Array.isArray(parsed)) parsed = [parsed];
        const items = parsed.map(it => {
          const isDir = Boolean(it.type && it.type.toLowerCase().includes('folder'));
          const ext = isDir ? '' : path.extname(it.name || '').toLowerCase();
          return {
            name: it.name,
            path: it.path,
            originalPath: it.origLoc ? path.join(it.origLoc, it.name) : it.name,
            originalLocation: it.origLoc || '',
            size: Number(it.size) || 0,
            isDirectory: isDir,
            isFile: !isDir,
            extension: ext,
            mtime: it.dateDeleted || null,
            birthtime: it.dateDeleted || null,
            atime: null,
            isReadOnly: false,
            isHidden: false,
            isRecycleBinItem: true
          };
        });
        resolve(items);
      } catch {
        resolve([]);
      }
    });
  });
}

/**
 * Restores a specific item from the Recycle Bin to its original location.
 */
function restoreRecycleBinItem(itemPathOrName) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve({ success: false, error: 'Platform not supported' });
    }
    const escaped = (itemPathOrName || '').replace(/'/g, "''");
    const ps = [
      '$sh = New-Object -ComObject Shell.Application',
      '$bin = $sh.Namespace(10)',
      `$target = '${escaped}'`,
      '$matched = $false',
      'foreach ($item in $bin.Items()) {',
      '  if ($item.Path -eq $target -or $item.Name -eq $target) {',
      '    foreach ($v in $item.Verbs()) {',
      "      if ($v.Name.Replace('&', '') -match 'Restore|Undelete') {",
      '        $v.DoIt()',
      '        $matched = $true',
      '        break',
      '      }',
      '    }',
      '  }',
      '  if ($matched) { break }',
      '}',
      'if ($matched) { "OK" } else { "NOT_FOUND" }'
    ].join('\r\n');

    const b64 = Buffer.from(ps, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -EncodedCommand ${b64}`, { timeout: 10000 }, (err, stdout) => {
      if (err) {
        return resolve({ success: false, error: err.message });
      }
      if (stdout && stdout.trim().includes('OK')) {
        return resolve({ success: true });
      }
      resolve({ success: false, error: 'Item not found in Recycle Bin' });
    });
  });
}

/**
 * Restores all items in the Recycle Bin.
 */
function restoreAllRecycleBinItems() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve({ success: true });
    }
    const ps = [
      '$sh = New-Object -ComObject Shell.Application',
      '$bin = $sh.Namespace(10)',
      'foreach ($item in $bin.Items()) {',
      '  foreach ($v in $item.Verbs()) {',
      "    if ($v.Name.Replace('&', '') -match 'Restore|Undelete') {",
      '      $v.DoIt()',
      '      break',
      '    }',
      '  }',
      '}',
      '"OK"'
    ].join('\r\n');

    const b64 = Buffer.from(ps, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -EncodedCommand ${b64}`, { timeout: 15000 }, (err) => {
      if (err) {
        return resolve({ success: false, error: err.message });
      }
      resolve({ success: true });
    });
  });
}

/**
 * Permanently deletes an item from the Recycle Bin.
 */
function deletePermanentlyRecycleBinItem(itemPathOrName) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve({ success: false, error: 'Platform not supported' });
    }
    const escaped = (itemPathOrName || '').replace(/'/g, "''");
    const ps = [
      '$sh = New-Object -ComObject Shell.Application',
      '$bin = $sh.Namespace(10)',
      `$target = '${escaped}'`,
      '$matched = $false',
      'foreach ($item in $bin.Items()) {',
      '  if ($item.Path -eq $target -or $item.Name -eq $target) {',
      '    foreach ($v in $item.Verbs()) {',
      "      if ($v.Name.Replace('&', '') -match 'Delete') {",
      '        $v.DoIt()',
      '        $matched = $true',
      '        break',
      '      }',
      '    }',
      '  }',
      '  if ($matched) { break }',
      '}',
      'if ($matched) { "OK" } else { "NOT_FOUND" }'
    ].join('\r\n');

    const b64 = Buffer.from(ps, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -EncodedCommand ${b64}`, { timeout: 10000 }, (err, stdout) => {
      if (err) {
        return resolve({ success: false, error: err.message });
      }
      resolve({ success: true });
    });
  });
}

module.exports = {
  classifyExtension,
  analyzeStorage,
  cleanTempFiles,
  emptyRecycleBin,
  queryRecycleBin,
  getRecycleBinItems,
  restoreRecycleBinItem,
  restoreAllRecycleBinItems,
  deletePermanentlyRecycleBinItem,
  EXTENSION_CATEGORIES
};
