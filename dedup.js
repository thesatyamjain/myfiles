const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Computes streaming SHA-256 hash for a file.
 */
function getFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', err => reject(err));
  });
}

/**
 * Scan directory for duplicate files.
 * Phase 1: group by file size (O(1) filter for unique sizes)
 * Phase 2: compute SHA-256 for identical size files
 */
async function scanDuplicates({ folderPath, recursive = false, minSize = 1, onProgress = null }) {
  if (!fs.existsSync(folderPath)) {
    return { success: false, error: 'Folder not found', duplicateGroups: [], wastedBytes: 0 };
  }

  const allFiles = [];

  async function collectFiles(dir, depth = 0) {
    if (!recursive && depth > 0) return;
    if (depth > 12) return;

    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (recursive && !ent.name.startsWith('.')) {
          await collectFiles(fullPath, depth + 1);
        }
      } else if (ent.isFile()) {
        try {
          const stat = await fs.promises.stat(fullPath);
          if (stat.size >= minSize) {
            allFiles.push({
              name: ent.name,
              path: fullPath,
              size: stat.size,
              mtime: stat.mtime.toISOString(),
              birthtime: stat.birthtime ? stat.birthtime.toISOString() : stat.mtime.toISOString()
            });
          }
        } catch {
          // Skip unreadable / system files
        }
      }
    }
  }

  await collectFiles(folderPath, 0);

  // Phase 1: Group by size
  const sizeMap = new Map();
  for (const f of allFiles) {
    if (!sizeMap.has(f.size)) sizeMap.set(f.size, []);
    sizeMap.get(f.size).push(f);
  }

  // Filter to candidate groups with >= 2 files
  const candidateFiles = [];
  for (const [, files] of sizeMap.entries()) {
    if (files.length > 1) {
      candidateFiles.push(...files);
    }
  }

  // Phase 2: Compute SHA-256 for candidate files
  const hashMap = new Map();
  let processed = 0;

  for (const f of candidateFiles) {
    try {
      const hash = await getFileHash(f.path);
      f.hash = hash;
      if (!hashMap.has(hash)) hashMap.set(hash, []);
      hashMap.get(hash).push(f);
    } catch {
      // skip unreadable
    }
    processed++;
    if (onProgress) onProgress(processed, candidateFiles.length);
  }

  // Form duplicate groups (only where >= 2 files have identical hash)
  const duplicateGroups = [];
  let wastedBytes = 0;

  for (const [hash, files] of hashMap.entries()) {
    if (files.length > 1) {
      // Sort files by mtime ascending (oldest first, newest last)
      files.sort((a, b) => new Date(a.mtime) - new Date(b.mtime));
      duplicateGroups.push({
        hash,
        size: files[0].size,
        files
      });
      wastedBytes += (files.length - 1) * files[0].size;
    }
  }

  // Sort groups by wasted space descending
  duplicateGroups.sort((a, b) => ((b.files.length - 1) * b.size) - ((a.files.length - 1) * a.size));

  return {
    success: true,
    totalFilesScanned: allFiles.length,
    candidatesCompared: candidateFiles.length,
    duplicateGroupsCount: duplicateGroups.length,
    wastedBytes,
    duplicateGroups
  };
}

/**
 * Delete specified duplicate files.
 */
async function deleteDuplicates(filePaths) {
  let deletedCount = 0;
  let freedBytes = 0;
  const errors = [];

  for (const p of filePaths) {
    try {
      const stat = await fs.promises.stat(p);
      const size = stat.size;
      await fs.promises.unlink(p);
      deletedCount++;
      freedBytes += size;
    } catch (err) {
      errors.push({ path: p, error: err.message });
    }
  }

  return {
    success: true,
    deletedCount,
    freedBytes,
    errors
  };
}

module.exports = {
  scanDuplicates,
  deleteDuplicates,
  getFileHash
};
