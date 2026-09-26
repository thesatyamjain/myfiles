// Native Archive Engine for MyFiles (Zero External Dependencies)
// Automatically leverages 7-Zip (7z.exe) if available, with robust fallback to Windows bsdtar (tar.exe) and PowerShell.
const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');

const ARCHIVE_EXTENSIONS = new Set([
  '.zip', '.rar', '.7z', '.tar', '.gz', '.tgz', '.bz2', '.tbz2',
  '.xz', '.txz', '.iso', '.cab', '.zst', '.arj', '.lzh', '.jar'
]);

// Discover 7z.exe and tar.exe paths on system
let cached7zPath = null;
let cachedTarPath = null;

function findExecutable(paths) {
  for (const p of paths) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function get7zExecutable() {
  if (cached7zPath !== null) return cached7zPath;
  const candidates = [
    'C:\\Program Files\\7-Zip\\7z.exe',
    'C:\\Program Files (x86)\\7-Zip\\7z.exe',
    process.env['ProgramFiles'] ? path.join(process.env['ProgramFiles'], '7-Zip', '7z.exe') : null,
    process.env['ProgramFiles(x86)'] ? path.join(process.env['ProgramFiles(x86)'], '7-Zip', '7z.exe') : null
  ];
  cached7zPath = findExecutable(candidates);
  return cached7zPath;
}

function getTarExecutable() {
  if (cachedTarPath !== null) return cachedTarPath;
  const sysRoot = process.env['SystemRoot'] || 'C:\\Windows';
  const candidates = [
    path.join(sysRoot, 'system32', 'tar.exe'),
    path.join(sysRoot, 'SysWOW64', 'tar.exe')
  ];
  cachedTarPath = findExecutable(candidates);
  return cachedTarPath;
}

function isArchive(filePathOrExt) {
  if (!filePathOrExt) return false;
  const ext = path.extname(filePathOrExt).toLowerCase();
  // Handle double extensions like .tar.gz
  const lower = filePathOrExt.toLowerCase();
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tar.bz2') || lower.endsWith('.tar.xz')) {
    return true;
  }
  return ARCHIVE_EXTENSIONS.has(ext);
}

function formatKindForArchive(ext) {
  const map = {
    '.zip': 'ZIP archive',
    '.rar': 'RAR archive',
    '.7z': '7-Zip archive',
    '.tar': 'TAR archive',
    '.gz': 'GZip compressed archive',
    '.tgz': 'GZip TAR archive',
    '.bz2': 'BZip2 compressed archive',
    '.xz': 'XZ compressed archive',
    '.iso': 'Optical Disc Image (ISO)',
    '.cab': 'Cabinet archive',
    '.zst': 'Zstandard archive'
  };
  return map[ext.toLowerCase()] || 'Compressed archive';
}

/**
 * List archive contents without extracting
 */
async function listArchive(archivePath) {
  if (!fs.existsSync(archivePath)) {
    throw new Error(`Archive not found: ${archivePath}`);
  }

  const p7z = get7zExecutable();
  if (p7z) {
    return listWith7z(p7z, archivePath);
  }

  const pTar = getTarExecutable();
  if (pTar) {
    return listWithTar(pTar, archivePath);
  }

  throw new Error('No compatible archive engine (7-Zip or tar.exe) found on this system');
}

function listWith7z(exePath, archivePath) {
  return new Promise((resolve, reject) => {
    // -slt outputs detailed technical list:
    // Path = ...
    // Size = ...
    // Packed Size = ...
    // Modified = ...
    // Folder = + / -
    execFile(exePath, ['l', '-slt', archivePath], { maxBuffer: 32 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      if (err && !stdout) {
        return reject(new Error(stderr || err.message));
      }

      const entries = [];
      let totalUncompressed = 0;
      let totalPacked = 0;
      let archiveType = path.extname(archivePath).replace('.', '').toLowerCase();

      // Extract archive global metadata from header before the first entry
      const typeMatch = stdout.match(/^Type = (.*)$/m);
      if (typeMatch) archiveType = typeMatch[1].trim();

      const physicalSizeMatch = stdout.match(/^Physical Size = (\d+)$/m);
      if (physicalSizeMatch) totalPacked = parseInt(physicalSizeMatch[1], 10);

      // Split blocks by double-newlines
      const blocks = stdout.split(/\r?\n\r?\n/);
      for (const block of blocks) {
        if (!block.includes('Path = ') || block.includes('Listing archive:')) continue;

        const lines = block.split(/\r?\n/);
        let entryPath = '';
        let size = 0;
        let packedSize = 0;
        let modified = '';
        let isFolder = false;

        for (const line of lines) {
          if (line.startsWith('Path = ')) entryPath = line.substring(7).trim();
          else if (line.startsWith('Size = ')) size = parseInt(line.substring(7).trim(), 10) || 0;
          else if (line.startsWith('Packed Size = ')) packedSize = parseInt(line.substring(14).trim(), 10) || 0;
          else if (line.startsWith('Modified = ')) modified = line.substring(11).trim();
          else if (line.startsWith('Folder = ')) isFolder = line.substring(9).trim() === '+';
        }

        // Avoid including the root archive itself if it matches archivePath
        if (entryPath && entryPath !== archivePath) {
          totalUncompressed += size;
          entries.push({
            path: entryPath,
            name: path.basename(entryPath.replace(/[\/\\]$/, '')),
            size,
            packedSize,
            modified,
            isDirectory: isFolder || entryPath.endsWith('/') || entryPath.endsWith('\\')
          });
        }
      }

      const stat = fs.statSync(archivePath);
      resolve({
        success: true,
        tool: '7-Zip',
        type: archiveType,
        archivePath,
        archiveSize: stat.size,
        totalFiles: entries.filter(e => !e.isDirectory).length,
        totalFolders: entries.filter(e => e.isDirectory).length,
        totalUncompressed,
        totalPacked: totalPacked || stat.size,
        ratio: totalUncompressed > 0 ? ((stat.size / totalUncompressed) * 100).toFixed(1) + '%' : '100%',
        entries
      });
    });
  });
}

function listWithTar(exePath, archivePath) {
  return new Promise((resolve, reject) => {
    execFile(exePath, ['-tvf', archivePath], { maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));

      const entries = [];
      let totalUncompressed = 0;
      const lines = stdout.split(/\r?\n/).filter(Boolean);

      // Example format: -rw-rw-r-- 0 0 0 539 Sep 24 17:22 package.json
      // Or: drwxr-xr-x 0 0 0 0 Sep 24 17:22 src/
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 6) {
          const isDir = parts[0].startsWith('d');
          const size = parseInt(parts[4], 10) || 0;
          const entryPath = parts.slice(8).join(' ');
          if (entryPath) {
            totalUncompressed += size;
            entries.push({
              path: entryPath,
              name: path.basename(entryPath.replace(/[\/\\]$/, '')),
              size,
              packedSize: 0,
              modified: `${parts[5]} ${parts[6]} ${parts[7]}`,
              isDirectory: isDir || entryPath.endsWith('/')
            });
          }
        }
      }

      const stat = fs.statSync(archivePath);
      resolve({
        success: true,
        tool: 'tar',
        type: path.extname(archivePath).replace('.', '').toLowerCase(),
        archivePath,
        archiveSize: stat.size,
        totalFiles: entries.filter(e => !e.isDirectory).length,
        totalFolders: entries.filter(e => e.isDirectory).length,
        totalUncompressed,
        totalPacked: stat.size,
        ratio: totalUncompressed > 0 ? ((stat.size / totalUncompressed) * 100).toFixed(1) + '%' : '100%',
        entries
      });
    });
  });
}

/**
 * Extract archive into target destination folder
 */
async function extractArchive(archivePath, targetDir) {
  if (!fs.existsSync(archivePath)) {
    throw new Error(`Archive not found: ${archivePath}`);
  }

  // Ensure target folder exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const p7z = get7zExecutable();
  if (p7z) {
    return new Promise((resolve, reject) => {
      // 7z x archive -o<targetDir> -y (extract with full paths, overwrite yes)
      execFile(p7z, ['x', archivePath, `-o${targetDir}`, '-y'], { windowsHide: true }, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve({ success: true, tool: '7-Zip', targetDir });
      });
    });
  }

  const pTar = getTarExecutable();
  if (pTar) {
    return new Promise((resolve, reject) => {
      // tar -xf archive -C <targetDir>
      execFile(pTar, ['-xf', archivePath, '-C', targetDir], { windowsHide: true }, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve({ success: true, tool: 'tar', targetDir });
      });
    });
  }

  // PowerShell Expand-Archive fallback for .zip
  return new Promise((resolve, reject) => {
    const psCmd = `Expand-Archive -LiteralPath '${archivePath.replace(/'/g, "''")}' -DestinationPath '${targetDir.replace(/'/g, "''")}' -Force`;
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCmd], { windowsHide: true }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve({ success: true, tool: 'PowerShell', targetDir });
    });
  });
}

/**
 * Compress files/folders into a new archive (.zip, .7z, or .tar.gz)
 */
async function compressItems(sourcePaths, targetArchivePath, format = 'zip') {
  if (!sourcePaths || sourcePaths.length === 0) {
    throw new Error('No items specified to compress');
  }

  const p7z = get7zExecutable();
  if (p7z) {
    return new Promise((resolve, reject) => {
      // 7z a <archive> <items...> -y
      const args = ['a', targetArchivePath, ...sourcePaths, '-y'];
      execFile(p7z, args, { windowsHide: true }, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve({ success: true, tool: '7-Zip', targetPath: targetArchivePath });
      });
    });
  }

  const pTar = getTarExecutable();
  if (pTar) {
    return new Promise((resolve, reject) => {
      // tar -caf <archive> <items...>
      const parentDir = path.dirname(sourcePaths[0]);
      const baseNames = sourcePaths.map(p => path.basename(p));
      const args = ['-caf', targetArchivePath, '-C', parentDir, ...baseNames];
      execFile(pTar, args, { windowsHide: true }, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve({ success: true, tool: 'tar', targetPath: targetArchivePath });
      });
    });
  }

  // PowerShell Compress-Archive fallback for .zip
  return new Promise((resolve, reject) => {
    const formattedPaths = sourcePaths.map(p => `'${p.replace(/'/g, "''")}'`).join(',');
    const psCmd = `Compress-Archive -LiteralPath ${formattedPaths} -DestinationPath '${targetArchivePath.replace(/'/g, "''")}' -Force`;
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCmd], { windowsHide: true }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve({ success: true, tool: 'PowerShell', targetPath: targetArchivePath });
    });
  });
}

module.exports = {
  ARCHIVE_EXTENSIONS,
  isArchive,
  formatKindForArchive,
  get7zExecutable,
  getTarExecutable,
  listArchive,
  extractArchive,
  compressItems
};
