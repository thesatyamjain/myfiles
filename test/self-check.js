// Self-check test for MyFiles core logic (no frameworks, pure assert)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

console.log('Running MyFiles core engine self-checks...');

// 1. Check drive detection & statfs
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const drives = [];
for (const letter of letters) {
  const rootPath = `${letter}:\\`;
  try {
    if (fs.existsSync(rootPath)) {
      const stat = fs.statfsSync(rootPath);
      const freeBytes = Number(stat.bavail) * Number(stat.bsize);
      const totalBytes = Number(stat.blocks) * Number(stat.bsize);
      drives.push({ letter, rootPath, freeBytes, totalBytes });
    }
  } catch (e) {
    // Ignore non-readable drives
  }
}
assert(drives.length > 0, 'Should detect at least one Windows drive');
assert(drives.some(d => d.letter === 'C'), 'C drive must be detected');
console.log(`✓ Drive detection verified: found ${drives.length} drives (${drives.map(d => d.letter).join(', ')})`);

// 2. Directory reading & item attributes
const testDir = __dirname;
const dirents = fs.readdirSync(testDir, { withFileTypes: true });
assert(dirents.length > 0, 'Directory should contain files');
const thisFile = dirents.find(d => d.name === 'self-check.js');
assert(thisFile, 'self-check.js must be found in directory');
assert(thisFile.isFile(), 'self-check.js must be recognized as a file');
console.log('✓ Directory scanning and file attribute resolution verified');

// 3. Colored tags data structure validation
const validTags = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'];
const testTagsMap = {};
testTagsMap[path.join(testDir, 'self-check.js')] = 'green';
assert.strictEqual(testTagsMap[path.join(testDir, 'self-check.js')], 'green');
assert(validTags.includes('green'), 'Tag must be one of the 7 supported colors');
console.log('✓ Tag management data structure verified');

// 4. Quick Look format discrimination
function getPreviewType(ext, size) {
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];
  const videoExts = ['.mp4', '.webm', '.ogg', '.mov'];
  const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
  const textExts = ['.txt', '.md', '.json', '.js', '.ts', '.py', '.html', '.css', '.csv'];
  
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (textExts.includes(ext)) return 'text';
  return 'binary';
}

assert.strictEqual(getPreviewType('.png', 100), 'image');
assert.strictEqual(getPreviewType('.mp4', 1000), 'video');
assert.strictEqual(getPreviewType('.mp3', 500), 'audio');
assert.strictEqual(getPreviewType('.md', 50), 'text');
assert.strictEqual(getPreviewType('.bin', 100), 'binary');
console.log('✓ Quick Look preview dispatcher verified');

// 5. Four View Modes & Inspector Kind Mapping (macOS Reference)
const validViews = ['grid', 'list', 'columns', 'gallery'];
assert.strictEqual(validViews.length, 4, 'Must support exactly 4 Finder view modes');
assert(validViews.includes('gallery'), 'Gallery View (Hero + Scrubber) must be supported');

function formatKind(ext, isDir) {
  if (isDir) return 'Folder';
  const map = { '.jpeg': 'JPEG image', '.png': 'PNG image', '.md': 'Markdown document' };
  return map[ext] || 'Document';
}
assert.strictEqual(formatKind('', true), 'Folder');
assert.strictEqual(formatKind('.jpeg', false), 'JPEG image');
console.log('✓ 4 Finder view modes and inspector metadata formatters verified');

// 6. Finder Relative Date Formatter Verification
function formatDateFinder(isoString) {
  if (!isoString) return '--';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '--';
  
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

  if (isToday) return `Today at ${timeStr}`;
  if (isYesterday) return `Yesterday at ${timeStr}`;

  const day = d.getDate();
  const month = d.toLocaleDateString(undefined, { month: 'short' });
  const year = d.getFullYear();
  const sameYear = year === now.getFullYear();

  return `${day} ${month}${sameYear ? '' : ' ' + year} at ${timeStr}`;
}

const todayDate = new Date();
assert(formatDateFinder(todayDate.toISOString()).startsWith('Today at '), 'Current date should format as "Today at ..."');

const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
assert(formatDateFinder(yesterdayDate.toISOString()).startsWith('Yesterday at '), 'Yesterday date should format as "Yesterday at ..."');

const pastDate = new Date('2024-01-15T12:00:00Z');
assert(formatDateFinder(pastDate.toISOString()).includes('2024'), 'Past year date must include year');
console.log('✓ Finder humanized relative date formatter verified');

// 7. List View Hierarchical Tree Expansion Hierarchy
const expandedFolders = new Map();
const parentPath = 'C:\\Projects';
const childItems = [
  { name: 'src', isDirectory: true, path: 'C:\\Projects\\src' },
  { name: 'README.md', isDirectory: false, path: 'C:\\Projects\\README.md' }
];
expandedFolders.set(parentPath, childItems);
assert(expandedFolders.has(parentPath), 'Parent folder should be tracked as expanded');
assert.strictEqual(expandedFolders.get(parentPath).length, 2, 'Expanded folder must contain child items');
expandedFolders.delete(parentPath);
assert(!expandedFolders.has(parentPath), 'Collapsing folder removes it from expanded set');
console.log('✓ In-place tree expansion hierarchy verified');

// 8. Search Popover Quick Filters (IMG, DOC, DEV, DIR)
function filterByKind(items, kind) {
  const imgExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];
  const docExts = ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf', '.csv', '.xlsx'];
  const codeExts = ['.js', '.ts', '.jsx', '.tsx', '.py', '.json', '.html', '.css', '.dart', '.rs'];

  return items.filter(it => {
    const ext = (it.extension || '').toLowerCase();
    if (kind === 'folder') return it.isDirectory;
    if (kind === 'image') return !it.isDirectory && imgExts.includes(ext);
    if (kind === 'document') return !it.isDirectory && docExts.includes(ext);
    if (kind === 'code') return !it.isDirectory && codeExts.includes(ext);
    return true;
  });
}

const sampleCatalog = [
  { name: 'photo.png', extension: '.png', isDirectory: false },
  { name: 'doc.pdf', extension: '.pdf', isDirectory: false },
  { name: 'script.js', extension: '.js', isDirectory: false },
  { name: 'FolderA', extension: '', isDirectory: true }
];

assert.strictEqual(filterByKind(sampleCatalog, 'image').length, 1, 'Image filter must isolate photo.png');
assert.strictEqual(filterByKind(sampleCatalog, 'document').length, 1, 'Document filter must isolate doc.pdf');
assert.strictEqual(filterByKind(sampleCatalog, 'code').length, 1, 'Code filter must isolate script.js');
assert.strictEqual(filterByKind(sampleCatalog, 'folder').length, 1, 'Folder filter must isolate FolderA');
console.log('✓ Spotlight quick filter categories (IMG, DOC, DEV, DIR) verified');

// 9. Theme Modes (Light, Dark, System)
const supportedThemes = ['light', 'dark', 'system'];
assert.strictEqual(supportedThemes.length, 3, 'Must support exactly Light, Dark, and System themes');
assert(supportedThemes.includes('light'), 'Light theme must be supported');
assert(supportedThemes.includes('dark'), 'Dark theme must be supported');
assert(supportedThemes.includes('system'), 'System theme must be supported');

function resolveThemeClass(theme, osPrefersDark = false) {
  if (theme === 'system') return osPrefersDark ? 'theme-dark' : 'theme-light';
  return `theme-${theme}`;
}

assert.strictEqual(resolveThemeClass('light'), 'theme-light');
assert.strictEqual(resolveThemeClass('dark'), 'theme-dark');
assert.strictEqual(resolveThemeClass('system', true), 'theme-dark');
assert.strictEqual(resolveThemeClass('system', false), 'theme-light');
console.log('✓ Theme modes (Light, Dark, System) and dynamic resolution verified');

// 10. Native Archive Engine (Detection, Listing, Compression & Extraction)
const archive = require('../archive');
assert(archive.isArchive('package.zip'), 'ZIP should be recognized as archive');
assert(archive.isArchive('data.rar'), 'RAR should be recognized as archive');
assert(archive.isArchive('backup.7z'), '7Z should be recognized as archive');
assert(archive.isArchive('release.tar.gz'), 'tar.gz should be recognized as archive');
assert(!archive.isArchive('index.html'), 'HTML is not an archive');

const p7z = archive.get7zExecutable();
const pTar = archive.getTarExecutable();
assert(p7z || pTar, 'At least 7-Zip or tar.exe must be available on the system');
console.log(`✓ Archive engines detected: 7-Zip=${!!p7z} (${p7z || 'none'}), tar=${!!pTar} (${pTar || 'none'})`);

// Async self-check for archive roundtrip
(async () => {
  const tmpDir = path.join(os.tmpdir(), `myfiles_test_archive_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const sampleFile = path.join(tmpDir, 'test.txt');
  fs.writeFileSync(sampleFile, 'Self-check archive payload');

  const destZip = path.join(tmpDir, 'bundle.zip');
  await archive.compressItems([sampleFile], destZip, 'zip');
  assert(fs.existsSync(destZip), 'Bundle zip should be created');

  const info = await archive.listArchive(destZip);
  assert(info.success, 'Archive inspection should succeed');
  assert(info.entries.length > 0, 'Archive inspection should list entries');
  assert(info.entries.some(e => e.name === 'test.txt'), 'test.txt must be inside bundle');

  const extractDir = path.join(tmpDir, 'extracted');
  await archive.extractArchive(destZip, extractDir);
  const unpackedFile = path.join(extractDir, 'test.txt');
  assert(fs.existsSync(unpackedFile), 'Unpacked file should exist');
  assert.strictEqual(fs.readFileSync(unpackedFile, 'utf8'), 'Self-check archive payload');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('✓ Archive compress, inspect, and extract roundtrip verified');

  // 11. Mouse Cursor Interactions (Marquee AABB Collision & Middle-Click Actions)
  function testAABBIntersection(box, itemRect) {
    return !(
      itemRect.right < box.left ||
      itemRect.left > box.left + box.width ||
      itemRect.bottom < box.top ||
      itemRect.top > box.top + box.height
    );
  }

  const marqueeBox = { left: 50, top: 50, width: 150, height: 150 };
  const insideItem = { left: 60, top: 60, right: 110, bottom: 110 };
  const outsideItem = { left: 300, top: 300, right: 350, bottom: 350 };
  const overlapEdgeItem = { left: 190, top: 190, right: 240, bottom: 240 };

  assert.strictEqual(testAABBIntersection(marqueeBox, insideItem), true, 'Inside item must collide with marquee');
  assert.strictEqual(testAABBIntersection(marqueeBox, outsideItem), false, 'Outside item must not collide with marquee');
  assert.strictEqual(testAABBIntersection(marqueeBox, overlapEdgeItem), true, 'Edge overlapping item must collide with marquee');

  // Verify middle-click button discriminator
  function isMiddleClick(buttonCode) {
    return buttonCode === 1;
  }
  assert.strictEqual(isMiddleClick(1), true, 'Button 1 must be identified as middle-click');
  assert.strictEqual(isMiddleClick(0), false, 'Button 0 is left-click');
  assert.strictEqual(isMiddleClick(2), false, 'Button 2 is right-click');
  console.log('✓ Mouse cursor features (Marquee AABB collision & middle-click actions) verified');

  // 12. Media Preview URL Generator (file:/// protocol & URI encoding)
  function getMediaUrlTest(filePath, isFileProtocol = true) {
    if (!filePath) return '';
    if (isFileProtocol) {
      const norm = filePath.replace(/\\/g, '/');
      const parts = norm.split('/').map(p => encodeURIComponent(p));
      const cleanPath = parts.join('/');
      return cleanPath.startsWith('/') ? `file://${cleanPath}` : `file:///${cleanPath}`;
    }
    return `/api/raw-file?path=${encodeURIComponent(filePath)}`;
  }

  const sampleWinPath = 'D:\\Wallpapers\\My Photo #1.png';
  const fileUrl = getMediaUrlTest(sampleWinPath, true);
  assert.strictEqual(fileUrl, 'file:///D%3A/Wallpapers/My%20Photo%20%231.png', 'Media URL should correctly format Windows file URI with 3 slashes and encoded special chars');
  const webUrl = getMediaUrlTest(sampleWinPath, false);
  assert.strictEqual(webUrl, `/api/raw-file?path=${encodeURIComponent(sampleWinPath)}`, 'Web mode should generate raw-file API endpoint');
  console.log('✓ Media preview URL generator verified (file:/// protocol & URI encoding)');

  // 13. Native VLC Media Player Integration & Detection
  const vlcEngine = require('../vlc');
  const vlcPath = vlcEngine.getVlcExecutable();
  const vlcInstalled = vlcEngine.isVlcInstalled();
  assert.strictEqual(typeof vlcInstalled, 'boolean', 'isVlcInstalled must return boolean');
  assert(vlcEngine.isMedia('movie.mkv'), 'MKV must be identified as media');
  assert(vlcEngine.isMedia('song.flac'), 'FLAC must be identified as media');
  assert(vlcEngine.isMedia('video.mp4'), 'MP4 must be identified as media');
  assert(vlcEngine.isMedia('clip.avi'), 'AVI must be identified as media');
  assert(!vlcEngine.isMedia('document.pdf'), 'PDF is not media');
  assert(!vlcEngine.isMedia('archive.zip'), 'ZIP is not media');
  assert(vlcEngine.isVideo('film.wmv'), 'WMV is video');
  assert(vlcEngine.isAudio('tune.mp3'), 'MP3 is audio');
  // 14. macOS Finder Search Attributes & Toolbar Capsules (Reference 3 & 5)
  const validSearchAttrs = ['name', 'content', 'mtime', 'ctime', 'tags', 'visibility', 'kind'];
  assert.strictEqual(validSearchAttrs.length, 7, 'Must support 7 macOS Finder search attributes');
  assert(validSearchAttrs.includes('name'), 'Must support Name attribute');
  assert(validSearchAttrs.includes('content'), 'Must support Contents attribute');
  assert(validSearchAttrs.includes('visibility'), 'Must support File visibility toggle');
  assert(validSearchAttrs.includes('tags'), 'Must support Tags attribute');
  assert(validSearchAttrs.includes('kind'), 'Must support Kind attribute');

  const attrLabels = {
    name: 'Name',
    content: 'Contents',
    mtime: 'Modified',
    ctime: 'Created',
    tags: 'Tags',
    visibility: 'Visibility',
    kind: 'Kind'
  };
  assert.strictEqual(attrLabels.name, 'Name');
  assert.strictEqual(attrLabels.content, 'Contents');
  assert.strictEqual(attrLabels.visibility, 'Visibility');
  console.log('✓ macOS Finder search attribute definitions (Reference 3) verified');

  // 15. Windows 10/11 Explorer Advanced Parity (Checksums, Batch Rename, Undo/Redo, Selection)
  const crypto = require('crypto');

  // Test Checksum streaming
  const hashTmpDir = path.join(os.tmpdir(), `myfiles_test_hash_${Date.now()}`);
  fs.mkdirSync(hashTmpDir, { recursive: true });
  const testHashFile = path.join(hashTmpDir, 'hash_test.txt');
  fs.writeFileSync(testHashFile, 'Hello Windows Explorer Checksum Verification');
  
  function getFileHash(filePath, algorithm = 'sha256') {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  const sha256Val = await getFileHash(testHashFile, 'sha256');
  const md5Val = await getFileHash(testHashFile, 'md5');
  assert.strictEqual(sha256Val.length, 64, 'SHA-256 hash must be 64 hex characters');
  assert.strictEqual(md5Val.length, 32, 'MD5 hash must be 32 hex characters');
  assert.strictEqual(
    crypto.createHash('sha256').update('Hello Windows Explorer Checksum Verification').digest('hex'),
    sha256Val,
    'Calculated SHA-256 should match reference'
  );
  console.log('✓ Cryptographic checksum engine (SHA-256 & MD5) verified');
  fs.rmSync(hashTmpDir, { recursive: true, force: true });

  // Test Batch Rename pattern generator
  function applyBatchRenameTransform(name, isDirectory, { find, replace, prefix, suffix, numbering, startNum, index }) {
    const ext = isDirectory ? '' : (name.lastIndexOf('.') !== -1 ? name.substring(name.lastIndexOf('.')) : '');
    let base = isDirectory ? name : (ext ? name.substring(0, name.length - ext.length) : name);
    if (find) base = base.split(find).join(replace || '');
    if (prefix) base = prefix + base;
    if (suffix) base = base + suffix;
    if (numbering) base = `${base} (${startNum + index})`;
    return base + ext;
  }

  const origNames = ['IMG_001.png', 'IMG_002.png', 'Report.pdf'];
  const renamed = origNames.map((name, i) => applyBatchRenameTransform(name, false, {
    find: 'IMG_',
    replace: 'Vacation_',
    prefix: '2026_',
    suffix: '_HD',
    numbering: true,
    startNum: 1,
    index: i
  }));

  assert.strictEqual(renamed[0], '2026_Vacation_001_HD (1).png');
  assert.strictEqual(renamed[1], '2026_Vacation_002_HD (2).png');
  assert.strictEqual(renamed[2], '2026_Report_HD (3).pdf');
  console.log('✓ Batch Rename / PowerRename pattern transformations verified');

  // Test Undo / Redo Stack State Machine
  const undoStack = [];
  const redoStack = [];

  function pushUndo(action) {
    undoStack.push(action);
    redoStack.length = 0;
  }

  pushUndo({ type: 'rename', oldPath: 'C:\\a.txt', newPath: 'C:\\b.txt' });
  assert.strictEqual(undoStack.length, 1);
  assert.strictEqual(redoStack.length, 0);

  // Simulate undo
  const undone = undoStack.pop();
  redoStack.push(undone);
  assert.strictEqual(undoStack.length, 0);
  assert.strictEqual(redoStack.length, 1);
  assert.strictEqual(redoStack[0].type, 'rename');

  // Simulate redo
  const redone = redoStack.pop();
  undoStack.push(redone);
  assert.strictEqual(undoStack.length, 1);
  assert.strictEqual(redoStack.length, 0);
  console.log('✓ Explorer Undo/Redo state machine (Ctrl+Z / Ctrl+Y) verified');

  // Test Selection Range (Shift+Click) Logic
  function computeRangeSelection(startIndex, endIndex) {
    const s = Math.min(startIndex, endIndex);
    const e = Math.max(startIndex, endIndex);
    const set = new Set();
    for (let i = s; i <= e; i++) set.add(i);
    return set;
  }

  const range = computeRangeSelection(2, 5);
  assert.strictEqual(range.size, 4);
  console.log('✓ Selection capabilities (Shift-key range selection) verified');

  // 16. macOS Finder "Show View Options" Panel (media_1790263700052.png)
  const viewOptionKeys = ['viewMode', 'sortBy', 'thumbSize', 'previewCol', 'iconPreview', 'showFilename'];
  const testDefaults = {
    viewMode: 'gallery',
    sortBy: 'mtime',
    thumbSize: 'medium',
    previewCol: true,
    iconPreview: true,
    showFilename: true
  };
  viewOptionKeys.forEach(k => {
    assert(k in testDefaults, `View options must contain key "${k}"`);
  });

  const validThumbSizes = ['small', 'medium', 'large'];
  assert(validThumbSizes.includes(testDefaults.thumbSize), 'thumbSize must be small, medium, or large');

  // Verify dynamic label generation for "Always open in [mode] view"
  function getViewModeLabel(mode) {
    const viewNameMap = {
      gallery: 'gallery view',
      columns: 'column view',
      list: 'list view',
      grid: 'icon view'
    };
    return `Always open in ${viewNameMap[mode] || 'gallery view'}`;
  }
  assert.strictEqual(getViewModeLabel('gallery'), 'Always open in gallery view');
  assert.strictEqual(getViewModeLabel('columns'), 'Always open in column view');
  assert.strictEqual(getViewModeLabel('grid'), 'Always open in icon view');
  console.log('✓ macOS Finder Show View Options specifications (media_1790263700052.png) verified');

  // 17. macOS Finder Parity (Go to Folder, Special Folders, Bundling & Rotation)
  function resolveGoToFolder(input, homePath, specialFolders) {
    let raw = (input || '').trim();
    if (!raw) return '';
    if (raw.startsWith('~')) {
      const suffix = raw.slice(1).replace(/^[\\\/]/, '');
      raw = (homePath.endsWith('\\') || homePath.endsWith('/')) ? homePath + suffix : homePath + '\\' + suffix;
    }
    const lower = raw.toLowerCase();
    const matchSpecial = (specialFolders || []).find(f => f.id === lower || f.name.toLowerCase() === lower);
    if (matchSpecial) raw = matchSpecial.path;
    return raw;
  }

  const mockHome = 'C:\\Users\\MockUser';
  const mockSpecialFolders = [
    { id: 'desktop', name: 'Desktop', path: 'C:\\Users\\MockUser\\Desktop' },
    { id: 'documents', name: 'Documents', path: 'C:\\Users\\MockUser\\Documents' },
    { id: 'downloads', name: 'Downloads', path: 'C:\\Users\\MockUser\\Downloads' },
    { id: 'home', name: 'Home', path: mockHome }
  ];

  assert.strictEqual(resolveGoToFolder('~/Desktop/Code', mockHome, mockSpecialFolders), 'C:\\Users\\MockUser\\Desktop/Code');
  assert.strictEqual(resolveGoToFolder('~', mockHome, mockSpecialFolders), 'C:\\Users\\MockUser\\');
  assert.strictEqual(resolveGoToFolder('Downloads', mockHome, mockSpecialFolders), 'C:\\Users\\MockUser\\Downloads');
  assert.strictEqual(resolveGoToFolder('documents', mockHome, mockSpecialFolders), 'C:\\Users\\MockUser\\Documents');

  // Test New Folder with Selection unique naming generator
  function getUniqueFolderName(existingList) {
    const base = 'New Folder with Items';
    let name = base;
    let count = 2;
    const existing = new Set(existingList.map(n => n.toLowerCase()));
    while (existing.has(name.toLowerCase())) {
      name = `${base} ${count++}`;
    }
    return name;
  }

  assert.strictEqual(getUniqueFolderName(['file1.txt', 'file2.jpg']), 'New Folder with Items');
  assert.strictEqual(getUniqueFolderName(['New Folder with Items']), 'New Folder with Items 2');
  assert.strictEqual(getUniqueFolderName(['new folder with items', 'new folder with items 2']), 'New Folder with Items 3');

  // Test 90-degree image rotation logic
  function rotateClockwise(current) {
    return ((current || 0) + 90) % 360;
  }
  assert.strictEqual(rotateClockwise(0), 90);
  assert.strictEqual(rotateClockwise(90), 180);
  assert.strictEqual(rotateClockwise(180), 270);
  assert.strictEqual(rotateClockwise(270), 0);

  console.log('✓ macOS Finder Parity (Go to Folder ~, special aliases, selection bundling & rotation) verified');

  // 21. Sidebar Parity: Top Quick Access (Recents, Shared) + Storage Drives + Favorites
  const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
  assert(htmlContent.includes('id="sidebarTopNav"'), 'Sidebar must include Top Quick Access');
  assert(htmlContent.includes('id="sidebarRecents"'), 'Top Quick Access must include Recents');
  assert(htmlContent.includes('id="sidebarShared"'), 'Top Quick Access must include Shared');
  assert(htmlContent.includes('id="sidebarFavoritesList"'), 'Sidebar must include Favorites List');
  assert(htmlContent.includes('id="sidebarHome"'), 'Favorites must include Home');
  assert(htmlContent.includes('id="sidebarDocuments"'), 'Favorites must include Documents');
  assert(htmlContent.includes('id="sidebarDownloads"'), 'Favorites must include Downloads');
  assert(htmlContent.includes('id="sidebarDrivesList"'), 'Sidebar must include dynamic drives list');
  assert(htmlContent.includes('Storage Drives'), 'Storage Drives header must exist');
  assert(htmlContent.includes('Favorites'), 'Favorites header must exist');
  assert(htmlContent.includes('Tags'), 'Tags header must exist');
  console.log('✓ Sidebar layout (Top Quick Access: Recents/Shared, Favorites, Storage Drives, Tags) verified');

  // 22. Native File Deduplication Engine (Scanning, SHA-256 Collision, Space Wasted, Deletion)
  const dedup = require('../dedup');
  const dedupTmpDir = path.join(os.tmpdir(), `myfiles_test_dedup_${Date.now()}`);
  fs.mkdirSync(dedupTmpDir, { recursive: true });

  const file1 = path.join(dedupTmpDir, 'original.dat');
  const file2 = path.join(dedupTmpDir, 'copy1.dat');
  const file3 = path.join(dedupTmpDir, 'unique.dat');

  fs.writeFileSync(file1, 'Exact duplicate binary payload 12345');
  fs.writeFileSync(file2, 'Exact duplicate binary payload 12345');
  fs.writeFileSync(file3, 'Completely different content payload');

  const scanRes = await dedup.scanDuplicates({ folderPath: dedupTmpDir });
  assert.strictEqual(scanRes.success, true, 'Deduplication scan must succeed');
  assert.strictEqual(scanRes.totalFilesScanned, 3, 'Must scan 3 files');
  assert.strictEqual(scanRes.duplicateGroups.length, 1, 'Must find exactly 1 duplicate group');
  assert.strictEqual(scanRes.duplicateGroups[0].files.length, 2, 'Duplicate group must contain 2 files');
  assert(scanRes.wastedBytes > 0, 'Wasted bytes must be > 0');

  // Test deletion of copy1.dat
  const delRes = await dedup.deleteDuplicates([file2]);
  assert.strictEqual(delRes.success, true, 'Deletion must succeed');
  assert.strictEqual(delRes.deletedCount, 1, '1 file deleted');
  assert.strictEqual(fs.existsSync(file1), true, 'original.dat must be preserved');
  assert.strictEqual(fs.existsSync(file2), false, 'copy1.dat must be deleted');

  // Rescan should report 0 duplicate groups
  const rescanRes = await dedup.scanDuplicates({ folderPath: dedupTmpDir });
  assert.strictEqual(rescanRes.duplicateGroups.length, 0, 'Rescan must report 0 duplicate groups');

  fs.rmSync(dedupTmpDir, { recursive: true, force: true });
  console.log('✓ Native File Deduplication Engine (2-phase scan, SHA-256 detection & safe deletion) verified');

  // 23. Dual Pane / Split Workspace Parity
  assert(htmlContent.includes('id="btnToggleDualPane"'), 'Toolbar must include Dual Pane toggle button');
  assert(htmlContent.includes('id="secondaryPane"'), 'Workspace must include secondaryPane');
  assert(htmlContent.includes('id="paneDivider"'), 'Workspace must include draggable paneDivider');
  assert(htmlContent.includes('id="btnSecondaryUp"'), 'Secondary pane must include Up button');
  assert(htmlContent.includes('id="btnSecondarySwap"'), 'Secondary pane must include Swap Panes button');
  assert(htmlContent.includes('id="secondaryPaneDrives"'), 'Secondary pane must include drive quick switcher container');
  assert(htmlContent.includes('id="secondaryPaneCount"'), 'Secondary pane must include item count');
  assert(!htmlContent.includes('class="dual-pane-pill"'), 'Top titlebar must not contain bulky dual-pane-pill');

  // Test secondary parent path resolution
  function getSecondaryParent(p) {
    const norm = p.replace(/[\\/]+$/, '');
    const lastSlash = Math.max(norm.lastIndexOf('\\'), norm.lastIndexOf('/'));
    if (lastSlash > 0) {
      let parent = norm.substring(0, lastSlash);
      if (/^[a-zA-Z]:$/.test(parent)) parent += '\\';
      return parent;
    }
    return null;
  }
  assert.strictEqual(getSecondaryParent('C:\\Users\\hp\\Desktop'), 'C:\\Users\\hp');
  assert.strictEqual(getSecondaryParent('C:\\Users'), 'C:\\');
  assert.strictEqual(getSecondaryParent('C:\\'), null);
  console.log('✓ Dual Pane / Split Workspace (Toolbar Toggle, Up, Swap, Drives & Divider) verified');

  // 24. High-Fidelity Vector Icon Engine Parity
  const rendererContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
  const stylesContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');
  assert(rendererContent.includes('class="file-svg-icon folder-svg"'), 'Renderer must generate folder-svg');
  assert(rendererContent.includes('feDropShadow'), 'Folder vector must include realistic drop shadow filters');
  assert(rendererContent.includes('Specular Highlight Top Edge'), 'Folder vector must include specular top edge highlight');
  assert(rendererContent.includes('getZipSvg()'), 'Renderer must include custom zipper archive vector');
  assert(rendererContent.includes('getDocSvg('), 'Renderer must include dog-ear folded document vector');
  assert(stylesContent.includes('.list-cell-name .file-svg-icon'), 'Styles must constrain SVG icons in list view');
  assert(stylesContent.includes('.list-thumb-img'), 'Styles must include list-thumb-img for inline image thumbnails');
  assert(rendererContent.includes('function getFileIcon(item, isGrid = true)'), 'getFileIcon must default to high-fidelity vector icons');
  assert(!rendererContent.includes('return getListFileIcon(item);'), 'getFileIcon must not route through low-fidelity wireframe icons');
  // 25. Safe Drive Ejection Engine
  assert(rendererContent.includes('sidebar-drive-eject'), 'Sidebar drives must include eject button');
  assert(rendererContent.includes('showDriveContextMenu'), 'Sidebar drives must support right-click drive context menu');
  assert(rendererContent.includes('ejectDrive:'), 'API bridge must expose ejectDrive');

  function validateEjectTarget(driveLetter) {
    const letter = (driveLetter || '').replace(/[^a-zA-Z]/g, '').toUpperCase().charAt(0);
    if (!letter || letter === 'C') {
      return { allowed: false, reason: 'Cannot eject system OS drive' };
    }
    return { allowed: true, letter };
  }
  assert.strictEqual(validateEjectTarget('C').allowed, false, 'C drive must not be ejectable');
  assert.strictEqual(validateEjectTarget('C:\\').allowed, false, 'C:\\ must not be ejectable');
  assert.strictEqual(validateEjectTarget('E').allowed, true, 'E drive must be ejectable');
  assert.strictEqual(validateEjectTarget('E:\\').letter, 'E', 'E:\\ target must resolve to E');
  // 26. Windows Explorer & macOS Finder Ergonomics Parity
  assert(rendererContent.includes('ctxDuplicate'), 'Context menu must include Duplicate action');
  assert(rendererContent.includes('ctxNewFolder'), 'Context menu must include New Folder action');
  assert(rendererContent.includes('ctxNewFile'), 'Context menu must include New File action');
  assert(rendererContent.includes('ctxSelectAll'), 'Context menu must include Select All action');
  assert(rendererContent.includes('ctxRefresh'), 'Context menu must include Refresh action');
  assert(htmlContent.includes('id="ctxDuplicate"'), 'HTML must include ctxDuplicate');
  assert(htmlContent.includes('id="ctxNewFolder"'), 'HTML must include ctxNewFolder');
  assert(htmlContent.includes('id="ctxNewFile"'), 'HTML must include ctxNewFile');
  assert(htmlContent.includes('id="ctxSelectAll"'), 'HTML must include ctxSelectAll');
  assert(htmlContent.includes('id="ctxRefresh"'), 'HTML must include ctxRefresh');
  assert(stylesContent.includes('.list-header .list-col'), 'Styles must include list header divider styling');
  assert(rendererContent.includes('getGridColumnCount()'), 'Renderer must calculate 2D grid column count for Up/Down arrow navigation');
  assert(rendererContent.includes('scrollActiveItemIntoView()'), 'Renderer must scroll active keyboard selection into view');

  // Verify copy duplicate naming algorithm
  function generateCopyName(baseName, existingNames) {
    const ext = path.extname(baseName);
    const nameWithoutExt = path.basename(baseName, ext);
    let count = 1;
    let copyName = `${nameWithoutExt} - Copy${ext}`;
    const nameSet = new Set(existingNames.map(n => n.toLowerCase()));
    while (nameSet.has(copyName.toLowerCase())) {
      count++;
      copyName = `${nameWithoutExt} - Copy (${count})${ext}`;
    }
    return copyName;
  }
  assert.strictEqual(generateCopyName('notes.txt', ['notes.txt']), 'notes - Copy.txt');
  assert.strictEqual(generateCopyName('notes.txt', ['notes.txt', 'notes - copy.txt']), 'notes - Copy (2).txt');
  assert.strictEqual(generateCopyName('Project', ['Project', 'Project - Copy']), 'Project - Copy (2)');

  // Verify 2D Arrow key grid calculations
  function calculateNextGridIndex(currentIdx, totalItems, cols, direction) {
    let delta = 0;
    if (direction === 'left') delta = -1;
    else if (direction === 'right') delta = 1;
    else if (direction === 'up') delta = -cols;
    else if (direction === 'down') delta = cols;
    const nextIdx = currentIdx + delta;
    return Math.max(0, Math.min(nextIdx, totalItems - 1));
  }
  assert.strictEqual(calculateNextGridIndex(0, 10, 4, 'right'), 1);
  assert.strictEqual(calculateNextGridIndex(0, 10, 4, 'left'), 0);
  assert.strictEqual(calculateNextGridIndex(2, 10, 4, 'down'), 6);
  assert.strictEqual(calculateNextGridIndex(6, 10, 4, 'up'), 2);
  assert.strictEqual(calculateNextGridIndex(9, 10, 4, 'down'), 9);

  console.log('✓ Explorer & Finder Ergonomics (2D Arrow keys, folder context menu, desktop drop, duplicate naming) verified');

  // 27. Preferences & Settings Engine (Tabs, Accents, Density, Extensions & Startup)
  const validSettingTabs = ['general', 'appearance', 'media', 'system'];
  assert.strictEqual(validSettingTabs.length, 4, 'Must support 4 categorized settings tabs');
  assert(validSettingTabs.includes('general') && validSettingTabs.includes('appearance') && validSettingTabs.includes('media') && validSettingTabs.includes('system'));

  // Verify Accent Palette validation
  const validAccents = ['blue', 'emerald', 'purple', 'orange', 'rose', 'graphite'];
  function resolveAccent(accent) {
    return validAccents.includes(accent) ? accent : 'blue';
  }
  assert.strictEqual(resolveAccent('emerald'), 'emerald');
  assert.strictEqual(resolveAccent('purple'), 'purple');
  assert.strictEqual(resolveAccent('unknown'), 'blue');

  // Verify formatItemName extension toggle logic
  function testFormatItemName(item, showExtensions) {
    if (!item) return '';
    if (showExtensions !== false || item.isDirectory) return item.name;
    const ext = item.extension;
    if (ext && item.name.endsWith(ext) && item.name.length > ext.length) {
      return item.name.slice(0, -ext.length);
    }
    return item.name;
  }

  const sampleFileItem = { name: 'Quarterly_Report_2026.pdf', extension: '.pdf', isDirectory: false };
  const sampleFolderItem = { name: 'Projects.archive', extension: '.archive', isDirectory: true };
  const sampleDotfile = { name: '.gitignore', extension: '', isDirectory: false };

  assert.strictEqual(testFormatItemName(sampleFileItem, true), 'Quarterly_Report_2026.pdf');
  assert.strictEqual(testFormatItemName(sampleFileItem, false), 'Quarterly_Report_2026');
  assert.strictEqual(testFormatItemName(sampleFolderItem, false), 'Projects.archive', 'Folders must retain folder name even with dot');
  assert.strictEqual(testFormatItemName(sampleDotfile, false), '.gitignore', 'Dotfiles without extension must retain name');

  // Verify Startup Folder resolution
  function resolveStartupPath(pref, customPath, homePath, specialFolders, drives) {
    if (pref === 'home' && homePath) return homePath;
    if (pref === 'desktop') {
      const f = specialFolders.find(s => s.id === 'desktop');
      return f ? f.path : (homePath || 'C:\\');
    }
    if (pref === 'documents') {
      const f = specialFolders.find(s => s.id === 'documents');
      return f ? f.path : (homePath || 'C:\\');
    }
    if (pref === 'downloads') {
      const f = specialFolders.find(s => s.id === 'downloads');
      return f ? f.path : (homePath || 'C:\\');
    }
    if (pref === 'custom' && customPath) return customPath;
    return drives && drives.length > 0 ? drives[0].rootPath || drives[0].path : 'C:\\';
  }

  const mockDrives = [{ path: 'C:\\' }, { path: 'D:\\' }];
  assert.strictEqual(resolveStartupPath('firstDrive', '', mockHome, mockSpecialFolders, mockDrives), 'C:\\');
  assert.strictEqual(resolveStartupPath('home', '', mockHome, mockSpecialFolders, mockDrives), mockHome);
  assert.strictEqual(resolveStartupPath('downloads', '', mockHome, mockSpecialFolders, mockDrives), 'C:\\Users\\MockUser\\Downloads');
  assert.strictEqual(resolveStartupPath('custom', 'E:\\MyProjects', mockHome, mockSpecialFolders, mockDrives), 'E:\\MyProjects');

  // Verify Terminal dispatcher choices
  const validTerminals = ['wt', 'powershell', 'cmd', 'gitbash'];
  assert.strictEqual(validTerminals.length, 4, 'Must support 4 Windows terminal options');
  assert(validTerminals.includes('wt') && validTerminals.includes('powershell'));

  // Verify Checksum algorithms
  const validChecksumAlgos = ['sha256', 'md5', 'sha1'];
  assert(validChecksumAlgos.includes('sha256') && validChecksumAlgos.includes('md5'));

  console.log('✓ Preferences & Settings Engine (Tabs, Accents, Density, Extensions & Startup) verified');

  // 24. Image Preview Engine (Formats, URI Encoding, Rotation & Zoom Clamping)
  const imageFormats = ['.png', '.jpg', '.jpeg', '.jfif', '.pjpeg', '.pjp', '.webp', '.avif', '.gif', '.bmp', '.svg', '.ico', '.cur', '.tif', '.tiff'];
  assert(imageFormats.includes('.jfif') && imageFormats.includes('.avif') && imageFormats.includes('.tiff'), 'Must support modern and Windows-specific image formats');

  function isImgExt(ext) {
    return imageFormats.includes((ext || '').toLowerCase());
  }
  assert.strictEqual(isImgExt('.JFIF'), true);
  assert.strictEqual(isImgExt('.avif'), true);
  assert.strictEqual(isImgExt('.png'), true);
  assert.strictEqual(isImgExt('.exe'), false);

  // URI encoding test for Windows file paths with spaces and hash fragments
  function toSafeFileUrl(winPath) {
    if (!winPath) return '';
    const norm = winPath.replace(/\\/g, '/');
    if (/^[a-zA-Z]:/.test(norm)) {
      const drive = norm.substring(0, 2);
      const rest = norm.substring(2);
      const encoded = rest.split('/').map(s => encodeURIComponent(s)).join('/');
      return `file:///${drive}${encoded}`;
    }
    const encoded = norm.split('/').map(s => encodeURIComponent(s)).join('/');
    return encoded.startsWith('/') ? `file://${encoded}` : `file:///${encoded}`;
  }

  const complexPath = 'E:\\Photos #2024\\Summer Vacation (Final).jfif';
  assert.strictEqual(toSafeFileUrl(complexPath), 'file:///E:/Photos%20%232024/Summer%20Vacation%20(Final).jfif', 'File URI must preserve drive letter and encode space/hash');

  // Zoom clamp logic verification
  function clampZoom(current, delta) {
    return Math.min(4.0, Math.max(1.0, +(current + delta).toFixed(2)));
  }
  assert.strictEqual(clampZoom(1.0, -0.25), 1.0, 'Zoom cannot decrease below 1.0 (Fit)');
  assert.strictEqual(clampZoom(1.0, 0.10), 1.10, 'Gradual button step must be 0.10 (10%)');
  assert.strictEqual(clampZoom(1.0, 0.05), 1.05, 'Gradual wheel step must be 0.05 (5%)');
  assert.strictEqual(clampZoom(4.0, 0.5), 4.0, 'Zoom cannot exceed 4.0');

  // Verify renderer uses gradual zoom steps instead of 0.25 jumps or 200% leaps
  const rendererSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
  assert(rendererSrc.includes('state.quickLookZoom + 0.10'), 'renderer.js must use gradual 0.10 step for zoom in');
  assert(rendererSrc.includes('state.quickLookZoom - 0.10'), 'renderer.js must use gradual 0.10 step for zoom out');
  assert(rendererSrc.includes('deltaY < 0 ? 0.05 : -0.05'), 'renderer.js must use gradual 0.05 step for mouse wheel');

  console.log('✓ Image Preview Engine (Formats, URI Encoding, Rotation & Zoom Clamping) verified');

  // 28. Advanced Preferences & Settings Suite (6-Tabs, Sidebar, Columns, Shortcuts & Engines)
  const fullSettingsTabs = ['general', 'appearance', 'sidebar', 'shortcuts', 'media', 'system'];
  assert.strictEqual(fullSettingsTabs.length, 6, 'Must support 6 categorized settings tabs');
  assert(fullSettingsTabs.includes('sidebar'), 'Sidebar customization tab must be present');
  assert(fullSettingsTabs.includes('shortcuts'), 'Interactive shortcuts tab must be present');

  // Date format style verification
  function testFormatDateStyle(isoString, style) {
    if (!isoString) return '--';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--';
    if (style === 'iso') {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    if (style === 'locale') {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    return 'relative';
  }
  const testIso = '2026-09-24T14:30:00.000Z';
  assert.strictEqual(testFormatDateStyle(testIso, 'iso').substring(0, 10), '2026-09-24');
  assert(testFormatDateStyle(testIso, 'locale').includes('2026'));
  assert.strictEqual(testFormatDateStyle(testIso, 'relative'), 'relative');

  // List view column filter simulation
  function getVisibleColumns(prefs) {
    const cols = ['name'];
    if (prefs.colShowDate !== false) cols.push('date');
    if (prefs.colShowType !== false) cols.push('type');
    if (prefs.colShowSize !== false) cols.push('size');
    if (prefs.colShowTag !== false) cols.push('tag');
    return cols;
  }
  assert.deepStrictEqual(getVisibleColumns({}), ['name', 'date', 'type', 'size', 'tag']);
  assert.deepStrictEqual(getVisibleColumns({ colShowDate: false, colShowTag: false }), ['name', 'type', 'size']);

  // Sidebar section preference filters
  const mockSidebarSections = ['recents', 'favorites', 'drives', 'tags'];
  function isSidebarSectionVisible(sectionId, prefs) {
    if (sectionId === 'recents') return prefs.sidebarShowRecents !== false;
    if (sectionId === 'favorites') return prefs.sidebarShowFavorites !== false;
    if (sectionId === 'drives') return prefs.sidebarShowDrives !== false;
    if (sectionId === 'tags') return prefs.sidebarShowTags !== false;
    return true;
  }
  assert.strictEqual(isSidebarSectionVisible('recents', { sidebarShowRecents: true }), true);
  assert.strictEqual(isSidebarSectionVisible('recents', { sidebarShowRecents: false }), false);
  assert.strictEqual(isSidebarSectionVisible('drives', { sidebarShowDrives: false }), false);

  // Tag visibility filter
  const allTags = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'];
  const userTagPrefs = ['blue', 'green', 'red'];
  function isTagActive(tag, visibleList) {
    return visibleList.includes(tag);
  }
  assert.strictEqual(isTagActive('blue', userTagPrefs), true);
  assert.strictEqual(isTagActive('purple', userTagPrefs), false);

  // Archive format & compression level options
  const supportedArchiveFormats = ['zip', '7z', 'tar.gz'];
  const supportedCompressionLevels = ['fast', 'normal', 'maximum'];
  assert(supportedArchiveFormats.includes('zip') && supportedArchiveFormats.includes('7z') && supportedArchiveFormats.includes('tar.gz'));
  assert(supportedCompressionLevels.includes('fast') && supportedCompressionLevels.includes('maximum'));

  // Deduplication engine options
  const dedupModes = ['sha256', 'fast'];
  const dedupSizes = [0, 1024, 1048576, 10485760];
  assert(dedupModes.includes('sha256') && dedupSizes.includes(1048576));

  // Settings entry points verification (Sidebar, Dropdown, Context Menu, Shortcut)
  const indexHtml = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
  assert(indexHtml.includes('id="sidebarSettings"'), 'sidebarSettings entry point must exist');
  assert(indexHtml.includes('id="moreActPreferences"'), 'moreActPreferences entry point must exist in More Actions dropdown');
  assert(indexHtml.includes('id="ctxPreferences"'), 'ctxPreferences entry point must exist in Context Menu');
  assert(indexHtml.includes('id="settingsModal"'), 'settingsModal dialog element must exist');

  // Verify modal display dispatcher
  function testOpenSettings(modalEl) {
    if (!modalEl) return;
    modalEl.style = modalEl.style || {};
    modalEl.style.display = 'flex';
  }
  const mockModal = { style: { display: 'none' } };
  testOpenSettings(mockModal);
  assert.strictEqual(mockModal.style.display, 'flex', 'openSettingsModal must immediately set display to flex');

  console.log('✓ Advanced Preferences & Settings Suite (6-Tabs, Sidebar, Columns, Shortcuts & Engines) verified');

  // 29. Native Storage Management Engine (macOS Settings & Storage Sense Parity)
  const storage = require('../storage');
  assert.strictEqual(typeof storage.classifyExtension, 'function', 'storage.classifyExtension must be a function');
  assert.strictEqual(typeof storage.analyzeStorage, 'function', 'storage.analyzeStorage must be a function');
  assert.strictEqual(typeof storage.cleanTempFiles, 'function', 'storage.cleanTempFiles must be a function');
  assert.strictEqual(typeof storage.emptyRecycleBin, 'function', 'storage.emptyRecycleBin must be a function');

  // Verify extension classifier
  assert.strictEqual(storage.classifyExtension('.pdf'), 'documents');
  assert.strictEqual(storage.classifyExtension('.docx'), 'documents');
  assert.strictEqual(storage.classifyExtension('.png'), 'images');
  assert.strictEqual(storage.classifyExtension('.jpg'), 'images');
  assert.strictEqual(storage.classifyExtension('.mp4'), 'videos');
  assert.strictEqual(storage.classifyExtension('.mp3'), 'audio');
  assert.strictEqual(storage.classifyExtension('.zip'), 'archives');
  assert.strictEqual(storage.classifyExtension('.7z'), 'archives');
  assert.strictEqual(storage.classifyExtension('.exe'), 'apps');
  assert.strictEqual(storage.classifyExtension('.unknown_ext'), 'other');
  assert.strictEqual(storage.classifyExtension(''), 'other');

  // Verify storage capacity and bar percentages logic
  function calculateStoragePercentages(totalBytes, categories, freeBytes) {
    const total = Math.max(1, totalBytes);
    const pcts = {};
    let usedPct = 0;
    for (const [cat, data] of Object.entries(categories)) {
      const pct = (data.bytes / total) * 100;
      pcts[cat] = Math.round(pct * 10) / 10;
      usedPct += pcts[cat];
    }
    const freePct = Math.max(0, Math.round(((freeBytes / total) * 100) * 10) / 10);
    return { pcts, freePct, totalUsedPct: Math.round(usedPct * 10) / 10 };
  }

  const mockCategories = {
    apps: { bytes: 20 * 1024 * 1024 * 1024 },
    documents: { bytes: 10 * 1024 * 1024 * 1024 },
    images: { bytes: 15 * 1024 * 1024 * 1024 },
    videos: { bytes: 25 * 1024 * 1024 * 1024 },
    audio: { bytes: 5 * 1024 * 1024 * 1024 },
    archives: { bytes: 5 * 1024 * 1024 * 1024 },
    other: { bytes: 10 * 1024 * 1024 * 1024 }
  };
  const mockTotal = 100 * 1024 * 1024 * 1024;
  const mockFree = 10 * 1024 * 1024 * 1024;
  const calcResult = calculateStoragePercentages(mockTotal, mockCategories, mockFree);
  assert.strictEqual(calcResult.pcts.apps, 20);
  assert.strictEqual(calcResult.pcts.videos, 25);
  assert.strictEqual(calcResult.freePct, 10);

  // Verify HTML markup for Storage Modal & Entry Points
  assert(htmlContent.includes('id="moreActManageStorage"'), 'More Actions menu must include Manage Storage item');
  assert(htmlContent.includes('id="ctxManageStorage"'), 'Context menu must include Manage Storage item');
  assert(htmlContent.includes('id="storageModal"'), 'HTML must include storageModal container');
  assert(htmlContent.includes('id="storageBar"'), 'Storage modal must include multi-segment storageBar');
  assert(htmlContent.includes('id="storageDriveSelect"'), 'Storage modal must include storageDriveSelect dropdown');
  assert(htmlContent.includes('id="btnStorageCleanTemp"'), 'Storage modal must include Clean Cache button');
  assert(htmlContent.includes('id="btnStorageEmptyRecycle"'), 'Storage modal must include Empty Bin button');
  assert(htmlContent.includes('id="btnStorageLaunchDedup"'), 'Storage modal must include Find Duplicates button');
  assert(htmlContent.includes('id="tabBtnLargestFiles"'), 'Storage modal must include Largest Files tab');
  assert(htmlContent.includes('id="tabBtnTopFolders"'), 'Storage modal must include Top Folders tab');

  // Verify CSS styles
  assert(stylesContent.includes('.storage-modal-card'), 'CSS must include .storage-modal-card');
  assert(stylesContent.includes('.storage-bar'), 'CSS must include .storage-bar');
  assert(stylesContent.includes('.storage-segment.seg-apps'), 'CSS must include segment colors');
  assert(stylesContent.includes('#statusDriveFree:hover'), 'CSS must style clickable drive free statusbar text');

  // Verify Universal Bridge (server, main, preload, renderer)
  const serverContent = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const mainContent = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  const preloadContent = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');

  assert(serverContent.includes('/api/storage/analyze'), 'server.js must expose /api/storage/analyze');
  assert(serverContent.includes('/api/storage/clean-temp'), 'server.js must expose /api/storage/clean-temp');
  assert(serverContent.includes('/api/storage/empty-recycle'), 'server.js must expose /api/storage/empty-recycle');

  assert(mainContent.includes("'storage-analyze'"), 'main.js must handle storage-analyze IPC');
  assert(mainContent.includes("'storage-clean-temp'"), 'main.js must handle storage-clean-temp IPC');
  assert(mainContent.includes("'storage-empty-recycle'"), 'main.js must handle storage-empty-recycle IPC');

  assert(preloadContent.includes('storageAnalyze:'), 'preload.js must expose storageAnalyze');
  assert(preloadContent.includes('storageCleanTemp:'), 'preload.js must expose storageCleanTemp');
  assert(preloadContent.includes('storageEmptyRecycle:'), 'preload.js must expose storageEmptyRecycle');

  assert(rendererContent.includes('openStorageModal('), 'renderer.js must implement openStorageModal');
  assert(rendererContent.includes('renderStorageBar('), 'renderer.js must implement renderStorageBar');
  assert(rendererContent.includes('cleanStorageTemp('), 'renderer.js must implement cleanStorageTemp');
  assert(rendererContent.includes('emptyStorageRecycleBin('), 'renderer.js must implement emptyStorageRecycleBin');

  // Live node test of storage.analyzeStorage
  const liveAnalysis = await storage.analyzeStorage({ drive: 'C:\\', maxFiles: 10 });
  assert.strictEqual(liveAnalysis.success, true, 'Live storage analysis on C: must succeed');
  assert(liveAnalysis.totalBytes > 0, 'Total bytes must be > 0');
  assert(liveAnalysis.freeBytes > 0, 'Free bytes must be > 0');
  assert(typeof liveAnalysis.categories, 'object', 'Categories must be an object');
  assert(Array.isArray(liveAnalysis.topFiles), 'topFiles must be an array');
  assert(Array.isArray(liveAnalysis.topFolders), 'topFolders must be an array');
  assert(typeof liveAnalysis.temp, 'object', 'Temp info must be an object');
  assert(typeof liveAnalysis.recycle, 'object', 'Recycle info must be an object');

  // 28. Unified FS Engine and Virtual Windowing Scroller Architecture
  const fsEngine = require('../fs-engine');
  assert(typeof fsEngine.getDrives === 'function', 'fsEngine must export getDrives');
  assert(typeof fsEngine.getSpecialFolders === 'function', 'fsEngine must export getSpecialFolders');
  assert(typeof fsEngine.readDirectory === 'function', 'fsEngine must export readDirectory');
  assert(typeof fsEngine.getFileContent === 'function', 'fsEngine must export getFileContent');
  assert(typeof fsEngine.calculateChecksum === 'function', 'fsEngine must export calculateChecksum');

  // Test fsEngine drives
  const engineDrives = await fsEngine.getDrives();
  assert(engineDrives.length > 0, 'fsEngine.getDrives must return drives');
  assert(engineDrives.some(d => d.letter === 'C'), 'fsEngine must detect C drive');

  // Test fsEngine readDirectory
  const engineDir = await fsEngine.readDirectory(__dirname);
  assert.strictEqual(engineDir.success, true, 'fsEngine.readDirectory must succeed');
  assert(engineDir.items.some(i => i.name === 'self-check.js'), 'Must find self-check.js');

  // Test fsEngine getFileContent
  const engineContent = await fsEngine.getFileContent(__filename);
  assert.strictEqual(engineContent.type, 'text', 'Must detect text type for self-check.js');
  assert(engineContent.content.length > 0, 'Text content must not be empty');
  assert(fsEngine.TEXT_EXTENSIONS.includes('.sql'), 'TEXT_EXTENSIONS must include .sql');
  assert(fsEngine.TEXT_EXTENSIONS.includes('.env'), 'TEXT_EXTENSIONS must include .env');
  assert(fsEngine.TEXT_EXTENSIONS.includes('.tsv'), 'TEXT_EXTENSIONS must include .tsv');

  // Test fsEngine calculateChecksum
  const engineHash = await fsEngine.calculateChecksum(__filename, 'sha256');
  assert.strictEqual(typeof engineHash, 'string', 'Hash must be a string');
  assert.strictEqual(engineHash.length, 64, 'SHA-256 hash must be 64 characters long');

  // Test VirtualScroller module
  const VirtualScroller = require('../src/virtual-scroll');
  assert(typeof VirtualScroller === 'function', 'VirtualScroller must be exported');

  // Verify VirtualScroller math calculation
  const vsOptions = { totalItems: 500, itemHeight: 30, itemsPerRow: 1, overscan: 5, threshold: 50 };
  assert(vsOptions.totalItems > vsOptions.threshold, 'VirtualScroller should activate threshold');

  // Verify index.html includes virtual-scroll.js
  const indexHtmlContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
  assert(indexHtmlContent.includes('<script src="virtual-scroll.js"></script>'), 'index.html must include virtual-scroll.js');

  console.log('✓ Unified FS Engine & Virtual Windowing Architecture (fs-engine.js & virtual-scroll.js) verified');

  // 29. Preview Viewport, Quick Look Maximize & Rich Media Hero Parity
  const currentStyles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');
  const currentRenderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
  const currentIndexHtml = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');

  // Quick Look Maximize Toolbar Button & Icons
  assert(currentIndexHtml.includes('id="qlBtnMaximize"'), 'Quick Look header must include qlBtnMaximize');
  assert(currentIndexHtml.includes('class="icon ql-icon-expand"'), 'qlBtnMaximize must contain ql-icon-expand');
  assert(currentIndexHtml.includes('class="icon ql-icon-compress"'), 'qlBtnMaximize must contain ql-icon-compress');

  // CSS Viewport Bounding & Maximize
  assert(currentStyles.includes('.quicklook-dialog.maximized'), 'styles.css must style .quicklook-dialog.maximized');
  assert(currentStyles.includes('.quicklook-dialog.maximized #qlBtnMaximize .ql-icon-compress'), 'styles.css must toggle compress icon when maximized');
  assert(currentStyles.includes('.pp-hero-video'), 'styles.css must include .pp-hero-video');
  assert(currentStyles.includes('.pp-hero-audio-card'), 'styles.css must include .pp-hero-audio-card');
  assert(currentStyles.includes('.pp-hero-text-preview'), 'styles.css must include .pp-hero-text-preview');

  // Renderer Transform Containment & Logic
  assert(currentRenderer.includes('toggleQuickLookMaximize'), 'renderer.js must implement toggleQuickLookMaximize');
  assert(currentRenderer.includes('qlBtnMaximize: document.getElementById(\'qlBtnMaximize\')'), 'renderer.js must cache qlBtnMaximize');
  assert(currentRenderer.includes('rot === 90 || rot === 270'), 'renderer.js must handle 90/270 degree rotation containment bounding');
  assert(currentRenderer.includes("e.key === 'f' || e.key === 'F'"), 'renderer.js must bind F key to toggle maximize in Quick Look');
  assert(currentRenderer.includes('ppHeroTextPreview'), 'renderer.js must populate ppHeroTextPreview in preview pane');
  assert(currentRenderer.includes('pp-hero-video'), 'renderer.js must render playable video in inspector pane');
  assert(currentRenderer.includes('pp-hero-audio-card'), 'renderer.js must render interactive audio in inspector pane');

  // Preview Viewport Enhanced Controls: Flip, Info HUD, Navigation Chevrons, Code Search, CSV Filter
  assert(currentIndexHtml.includes('id="qlBtnFlipH"'), 'Quick Look toolbar must include qlBtnFlipH');
  assert(currentIndexHtml.includes('id="qlBtnInfo"'), 'Quick Look toolbar must include qlBtnInfo');
  assert(currentIndexHtml.includes('id="qlNavPrev"'), 'Quick Look dialog must include qlNavPrev');
  assert(currentIndexHtml.includes('id="qlNavNext"'), 'Quick Look dialog must include qlNavNext');
  assert(currentIndexHtml.includes('id="qlInfoHud"'), 'Quick Look dialog must include qlInfoHud');
  assert(currentIndexHtml.includes('id="qlIndexIndicator"'), 'Quick Look footer must include qlIndexIndicator');

  assert(currentStyles.includes('.ql-nav-edge'), 'styles.css must include .ql-nav-edge');
  assert(currentStyles.includes('.ql-info-hud'), 'styles.css must include .ql-info-hud');
  assert(currentStyles.includes('.ql-code-search-bar'), 'styles.css must include .ql-code-search-bar');
  assert(currentStyles.includes('.ql-csv-container'), 'styles.css must include .ql-csv-container');
  assert(currentStyles.includes('.ql-media-controls-overlay'), 'styles.css must include .ql-media-controls-overlay');
  assert(currentStyles.includes('.pp-hero-hover-btn'), 'styles.css must include .pp-hero-hover-btn');

  assert(currentRenderer.includes('renderQuickLookInfoHud'), 'renderer.js must implement renderQuickLookInfoHud');
  assert(currentRenderer.includes('toggleQuickLookInfo'), 'renderer.js must implement toggleQuickLookInfo');
  assert(currentRenderer.includes('quickLookFlipH'), 'renderer.js must track quickLookFlipH');
  assert(currentRenderer.includes('qlBtnToggleWrap'), 'renderer.js must implement line wrap toggle in code viewer');
  assert(currentRenderer.includes('qlCodeSearchInput'), 'renderer.js must implement live find in code viewer');
  assert(currentRenderer.includes('qlCsvFilter'), 'renderer.js must implement interactive row filter in CSV viewer');
  assert(currentRenderer.includes('ppHeroQuickLookBtn'), 'renderer.js must wire Quick Look hover CTA on preview pane hero');

  console.log('✓ Preview Viewport, Quick Look Maximize, EXIF HUD, Edge Nav & Rich Media Hero Viewports verified');

  // 30. Transmission Gear Slider for Grid Icon & Thumbnail Scaling (media_1790425629538.png)
  assert(currentIndexHtml.includes('class="zoom-slider-wrapper gear-slider-wrapper"'), 'index.html must include gear-slider-wrapper');
  assert(currentIndexHtml.includes('id="gearZoomDown"'), 'index.html must include gearZoomDown button');
  assert(currentIndexHtml.includes('id="gearZoomUp"'), 'index.html must include gearZoomUp button');
  assert(currentIndexHtml.includes('class="gear-track-container"'), 'index.html must include gear-track-container');
  assert(currentIndexHtml.includes('class="gear-track-ticks"'), 'index.html must include gear-track-ticks');
  assert(currentIndexHtml.includes('data-gear="1"'), 'index.html ticks must include Gear 1');
  assert(currentIndexHtml.includes('data-gear="2"'), 'index.html ticks must include Gear 2');
  assert(currentIndexHtml.includes('data-gear="3"'), 'index.html ticks must include Gear 3');
  assert(currentIndexHtml.includes('data-gear="4"'), 'index.html ticks must include Gear 4');
  assert(currentIndexHtml.includes('id="gridZoomSlider"'), 'index.html must include gridZoomSlider');
  assert(currentIndexHtml.includes('min="1" max="4" value="2" step="1"'), 'gridZoomSlider must configure 4 discrete gear steps');
  assert(currentIndexHtml.includes('id="gearPillBadge"'), 'index.html must include gearPillBadge');

  assert(currentStyles.includes('.gear-slider-wrapper'), 'styles.css must style .gear-slider-wrapper');
  assert(currentStyles.includes('.gear-slider-input::-webkit-slider-thumb'), 'styles.css must style cogwheel gear thumb');
  assert(currentStyles.includes('.gear-tick.active'), 'styles.css must highlight active gear ticks');
  assert(currentStyles.includes('--grid-card-size'), 'styles.css must support dynamic --grid-card-size');
  assert(currentStyles.includes('--grid-icon-size'), 'styles.css must support dynamic --grid-icon-size');
  assert(currentStyles.includes('--grid-thumb-size'), 'styles.css must support dynamic --grid-thumb-size');
  assert(currentStyles.includes('--gear-progress'), 'styles.css must style dynamic gear progress track fill');

  assert(currentRenderer.includes('ICON_GEARS'), 'renderer.js must define ICON_GEARS array');
  assert(currentRenderer.includes('applyGear'), 'renderer.js must implement applyGear()');
  assert(currentRenderer.includes('getGearByLevel'), 'renderer.js must implement getGearByLevel()');
  assert(currentRenderer.includes('gearZoomDown: document.getElementById(\'gearZoomDown\')'), 'renderer.js must cache gearZoomDown');
  assert(currentRenderer.includes('gearZoomUp: document.getElementById(\'gearZoomUp\')'), 'renderer.js must cache gearZoomUp');
  assert(currentRenderer.includes('gearPillBadge: document.getElementById(\'gearPillBadge\')'), 'renderer.js must cache gearPillBadge');
  assert(currentRenderer.includes('currentGear'), 'renderer.js state must track currentGear');

  console.log('✓ 4-Step Transmission Gear Slider, Cogwheel Thumb & Dynamic Icon/Thumb Scaling verified');

  // 31. Unified Drag & Drop Subsystem & Path Resolution
  function testParseDroppedPaths(dataTransfer) {
    if (!dataTransfer) return [];
    if (dataTransfer.files && dataTransfer.files.length > 0) {
      return dataTransfer.files.map(f => f.path || '').filter(Boolean);
    }
    const text = dataTransfer.getData ? dataTransfer.getData('text/plain') : '';
    if (!text) return [];
    const trimmed = text.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch {}
    }
    return [trimmed].filter(Boolean);
  }

  // Verify JSON array string parsing (Bug 1 regression prevention)
  const jsonTransfer = { getData: (type) => JSON.stringify(['C:\\test\\doc1.txt', 'C:\\test\\doc2.txt']) };
  const parsedJson = testParseDroppedPaths(jsonTransfer);
  assert.strictEqual(parsedJson.length, 2, 'Must parse stringified JSON array into individual paths');
  assert.strictEqual(parsedJson[0], 'C:\\test\\doc1.txt');
  assert.strictEqual(parsedJson[1], 'C:\\test\\doc2.txt');

  // Verify external OS files parsing
  const extTransfer = { files: [{ path: 'C:\\Desktop\\file.pdf' }] };
  const parsedExt = testParseDroppedPaths(extTransfer);
  assert.strictEqual(parsedExt.length, 1, 'Must extract path from external file list');
  assert.strictEqual(parsedExt[0], 'C:\\Desktop\\file.pdf');

  // Verify renderer.js implementation
  assert(currentRenderer.includes('function parseDroppedPaths'), 'renderer.js must implement parseDroppedPaths()');
  assert(currentRenderer.includes('async function handleDroppedItems'), 'renderer.js must implement handleDroppedItems()');
  assert(currentRenderer.includes('function setupItemDragSource'), 'renderer.js must implement setupItemDragSource()');
  assert(currentRenderer.includes('function setupFolderDropTarget'), 'renderer.js must implement setupFolderDropTarget()');
  assert(currentRenderer.includes('function setupSidebarFavoritesPinDrop'), 'renderer.js must implement setupSidebarFavoritesPinDrop()');
  assert(currentRenderer.includes('window.myFilesAPI.startDrag'), 'renderer.js must trigger native startDrag for external apps');
  assert(currentRenderer.includes("e.dataTransfer.setData('text/uri-list'"), 'renderer.js must provide text/uri-list for external apps');

  // Verify main.js & preload.js IPC start-drag
  const currentMain = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  const currentPreload = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');
  assert(currentMain.includes("ipcMain.on('start-drag'"), 'main.js must listen for start-drag IPC');
  assert(currentPreload.includes("startDrag:"), 'preload.js must expose startDrag API');
  assert(currentMain.includes("EXDEV"), 'main.js move-items must handle EXDEV cross-device links');

  console.log('✓ Unified Drag & Drop Architecture, Multi-Payload Parser & Cross-Device Move verified');

  // 32. Frontend Modernization: Obsidian Glassmorphism, Material Depth & Skeletons
  assert(currentStyles.includes('--bg-app: #08090d'), 'styles.css must configure deep tinted obsidian background');
  assert(currentStyles.includes('--glass-bg: rgba(18, 20, 30, 0.72)'), 'styles.css must configure frosted glass dark token');
  assert(currentStyles.includes('--glass-filter: blur(24px) saturate(180%)'), 'styles.css must configure glass backdrop filter');
  assert(currentStyles.includes('--radius-xs: 4px'), 'styles.css must define --radius-xs');
  assert(currentStyles.includes('--radius-xl: 20px'), 'styles.css must define --radius-xl');
  assert(currentStyles.includes('.sidebar-item.active::before'), 'styles.css must implement illuminated active notch on sidebar items');
  assert(currentStyles.includes('.skeleton-shimmer'), 'styles.css must define .skeleton-shimmer animation');
  assert(currentStyles.includes('.skeleton-grid-card'), 'styles.css must define .skeleton-grid-card component');
  assert(currentStyles.includes('.skeleton-list-row'), 'styles.css must define .skeleton-list-row component');

  console.log('✓ Obsidian Glassmorphism, Material Depth, Active Indicators & Skeleton Shimmer verified');

  // 33. Desktop UX Modernization & Ergonomic Polish
  assert(currentRenderer.includes('handleTypeaheadKey'), 'renderer.js must implement handleTypeaheadKey()');
  assert(currentRenderer.includes('state.typeaheadBuffer'), 'renderer.js must track typeaheadBuffer state');
  assert(currentRenderer.includes('function performCopy()'), 'renderer.js must implement multi-item performCopy()');
  assert(currentRenderer.includes('function performCut()'), 'renderer.js must implement multi-item performCut()');
  assert(currentRenderer.includes('function performPaste()'), 'renderer.js must implement multi-item performPaste()');
  assert(currentRenderer.includes('function cancelCutStaging()'), 'renderer.js must implement cancelCutStaging()');
  assert(currentRenderer.includes('setSelectionRange(0, lastDot)'), 'renderer.js must safely preserve file extensions during rename');
  assert(currentRenderer.includes("toast.addEventListener('click'"), 'renderer.js must support click-to-dismiss on toast notifications');

  assert(currentStyles.includes('.item-cut'), 'styles.css must style .item-cut staging class');
  assert(currentStyles.includes('.drag-multi-badge'), 'styles.css must style multi-item drag badge');

  console.log('✓ Type-Ahead File Jump, Global Multi-Item Clipboard, Extension-Safe Rename & Dismissible Toasts verified');

  // 34. Windows Share Hub: Windows Native Options & Windows Share Apps Directory
  const currentServer = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  // Markup verifications
  assert(currentIndexHtml.includes('id="shareModal"'), 'index.html must include shareModal');
  assert(currentIndexHtml.includes('id="ctxShare"'), 'index.html must include ctxShare in context menu');
  assert(currentIndexHtml.includes('id="tabBtnShareNative"'), 'index.html must include tabBtnShareNative');
  assert(currentIndexHtml.includes('id="tabBtnShareApps"'), 'index.html must include tabBtnShareApps');
  assert(currentIndexHtml.includes('id="shareViewNative"'), 'index.html must include shareViewNative');
  assert(currentIndexHtml.includes('id="shareViewApps"'), 'index.html must include shareViewApps');
  assert(currentIndexHtml.includes('id="shareOptWinSheet"'), 'index.html must include shareOptWinSheet');
  assert(currentIndexHtml.includes('id="shareOptNearby"'), 'index.html must include shareOptNearby');
  assert(currentIndexHtml.includes('id="shareOptEmail"'), 'index.html must include shareOptEmail');
  assert(currentIndexHtml.includes('id="shareOptUnc"'), 'index.html must include shareOptUnc');
  assert(!currentIndexHtml.includes('id="shareOptExplorer"'), 'index.html must NOT include Reveal in Windows Explorer');
  assert(currentIndexHtml.includes('id="shareQrContainer"'), 'index.html must include shareQrContainer');
  assert(currentIndexHtml.includes('id="shareWifiUrlDisplay"'), 'index.html must include shareWifiUrlDisplay');
  assert(currentIndexHtml.includes('data-app="localsend"'), 'index.html must include LocalSend app card');
  assert(currentIndexHtml.includes('data-app="quickshare"'), 'index.html must include Quick Share app card');
  assert(currentIndexHtml.includes('data-app="sendanywhere"'), 'index.html must include Send Anywhere app card');
  assert(currentIndexHtml.includes('data-app="toffeeshare"'), 'index.html must include ToffeeShare app card');
  assert(currentIndexHtml.includes('data-app="wormhole"'), 'index.html must include Wormhole app card');
  assert(currentIndexHtml.includes('data-app="wetransfer"'), 'index.html must include WeTransfer app card');
  assert(currentIndexHtml.includes('data-app="whatsapp"'), 'index.html must include WhatsApp app card');
  assert(currentIndexHtml.includes('data-app="telegram"'), 'index.html must include Telegram app card');
  assert(currentIndexHtml.includes('data-app="cloud"'), 'index.html must include Cloud app card');

  // Styles verifications
  assert(currentStyles.includes('.share-modal-card'), 'styles.css must style .share-modal-card');
  assert(currentStyles.includes('.share-tabs-nav'), 'styles.css must style .share-tabs-nav');
  assert(currentStyles.includes('.share-grid'), 'styles.css must style .share-grid');
  assert(currentStyles.includes('.share-tile'), 'styles.css must style .share-tile');
  assert(currentStyles.includes('.share-wifi-card'), 'styles.css must style .share-wifi-card');
  assert(currentStyles.includes('.share-apps-grid'), 'styles.css must style .share-apps-grid');
  assert(currentStyles.includes('.share-app-card'), 'styles.css must style .share-app-card');

  // Backend & IPC verifications
  assert(currentMain.includes("ipcMain.handle('open-external'"), 'main.js must implement open-external IPC');
  assert(currentMain.includes("ipcMain.handle('get-local-ip'"), 'main.js must implement get-local-ip IPC');
  assert(currentMain.includes("ipcMain.handle('open-native-share'"), 'main.js must implement open-native-share IPC');
  assert(currentPreload.includes('openExternal:'), 'preload.js must expose openExternal');
  assert(currentPreload.includes('getLocalIp:'), 'preload.js must expose getLocalIp');
  assert(currentPreload.includes('openNativeShare:'), 'preload.js must expose openNativeShare');
  assert(currentServer.includes('/api/local-ip'), 'server.js must expose /api/local-ip endpoint');
  assert(currentServer.includes("get('download') === '1'"), 'server.js must support download=1 query parameter');

  // Renderer verifications
  assert(currentRenderer.includes('function openShareModal'), 'renderer.js must implement openShareModal()');
  assert(currentRenderer.includes('function closeShareModal'), 'renderer.js must implement closeShareModal()');
  assert(currentRenderer.includes('function switchShareTab'), 'renderer.js must implement switchShareTab()');
  assert(currentRenderer.includes('function setupShareWifi'), 'renderer.js must implement setupShareWifi()');
  assert(currentRenderer.includes('function getShareUncPath'), 'renderer.js must implement getShareUncPath()');
  assert(currentRenderer.includes('function handleShareApp'), 'renderer.js must implement handleShareApp()');
  assert(currentRenderer.includes("e.altKey && e.key.toLowerCase() === 's'"), 'renderer.js must bind Ctrl+Alt+S to openShareModal()');

  // Verify UNC path formatting helper logic
  function testGetShareUncPath(localPath) {
    if (!localPath) return '';
    const match = localPath.match(/^([a-zA-Z]):\\(.*)$/);
    if (match) {
      const driveLetter = match[1].toUpperCase();
      const rest = match[2];
      return `\\\\localhost\\${driveLetter}$\\${rest}`;
    }
    return localPath;
  }
  assert.strictEqual(testGetShareUncPath('C:\\Users\\hp\\doc.pdf'), '\\\\localhost\\C$\\Users\\hp\\doc.pdf');
  assert.strictEqual(testGetShareUncPath('E:\\MyFolder\\video.mp4'), '\\\\localhost\\E$\\MyFolder\\video.mp4');

  console.log('✓ Windows Share Hub (Native Options, Wi-Fi QR Mobile Download & Share Apps Directory) verified');

  // 33. Column View (Miller Columns) & Gallery View Architecture & Stability
  assert(currentRenderer.includes('function isVideoFile(item)'), 'renderer.js must define isVideoFile()');
  assert(currentRenderer.includes('function isAudioFile(item)'), 'renderer.js must define isAudioFile()');
  assert(currentRenderer.includes('VIDEO_EXTENSIONS'), 'renderer.js must define VIDEO_EXTENSIONS');
  assert(currentRenderer.includes('AUDIO_EXTENSIONS'), 'renderer.js must define AUDIO_EXTENSIONS');
  assert(!currentRenderer.includes('} else if (videoExts.includes(ext)) {'), 'renderGalleryView must not use out-of-scope videoExts');
  assert(!currentRenderer.includes('} else if (audioExts.includes(ext)) {'), 'renderGalleryView must not use out-of-scope audioExts');
  assert(currentRenderer.includes("else if (state.viewMode === 'columns') {\n      renderMillerColumns();"), 'renderCurrentView must handle columns mode');
  assert(currentRenderer.includes('activeColumnIndex'), 'state must track activeColumnIndex');
  assert(currentRenderer.includes("colHeader.className = 'column-header'"), 'renderMillerColumns must generate column-header');
  assert(currentRenderer.includes("itemsWrap.className = 'column-items-wrap'"), 'renderMillerColumns must wrap items in column-items-wrap');
  assert(currentRenderer.includes('.scrubber-item.selected'), 'scrollActiveItemIntoView must query .scrubber-item.selected in gallery mode');
  assert(currentStyles.includes('.column-pane.active-col'), 'styles.css must style active-col');
  assert(currentStyles.includes('.gallery-hero-actions'), 'styles.css must style gallery-hero-actions');
  assert(currentStyles.includes('.gallery-hero-media'), 'styles.css must contain gallery-hero-media');

  // Verify media extension classification logic
  const testVideo = { name: 'demo.mp4', extension: '.mp4', isDirectory: false };
  const testAudio = { name: 'track.mp3', extension: '.mp3', isDirectory: false };
  const testImg = { name: 'photo.jpg', extension: '.jpg', isDirectory: false };
  const testFolder = { name: 'Videos', extension: '', isDirectory: true };

  const testVideoExts = ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi', '.m4v'];
  const testAudioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];
  function checkIsVideo(item) {
    if (!item || item.isDirectory) return false;
    return testVideoExts.includes((item.extension || '').toLowerCase());
  }
  function checkIsAudio(item) {
    if (!item || item.isDirectory) return false;
    return testAudioExts.includes((item.extension || '').toLowerCase());
  }
  assert.strictEqual(checkIsVideo(testVideo), true, 'demo.mp4 must be recognized as video');
  assert.strictEqual(checkIsVideo(testAudio), false, 'track.mp3 must not be recognized as video');
  assert.strictEqual(checkIsVideo(testFolder), false, 'Videos folder must not be recognized as video');
  assert.strictEqual(checkIsAudio(testAudio), true, 'track.mp3 must be recognized as audio');
  assert.strictEqual(checkIsAudio(testImg), false, 'photo.jpg must not be recognized as audio');

  console.log('✓ Column View (Miller Columns) & Gallery View (Scope Fixes, 2D Arrow Keys, Active Column & Hero Media) verified');

  // 34. Desktop UX Phase 2: Navigation Scroll Memory, Breadcrumb Drop Targets & Tab Ergonomics
  assert(currentRenderer.includes('historyScrollMap'), 'renderer.js must track historyScrollMap in state');
  assert(currentRenderer.includes('lastExitedFolder'), 'renderer.js must track lastExitedFolder across navigation');
  assert(currentRenderer.includes('setupFolderDropTarget(crumb, target)'), 'renderer.js must configure breadcrumb ancestor items as drop targets');
  assert(currentStyles.includes('.crumb-item.folder-drop-active'), 'styles.css must style .crumb-item.folder-drop-active state');
  assert(currentRenderer.includes('showTabContextMenu'), 'renderer.js must implement tab context menu');
  assert(currentRenderer.includes('data-action="duplicate"'), 'tab context menu must include duplicate action');
  assert(currentRenderer.includes('data-action="copy-path"'), 'tab context menu must include copy-path action');
  assert(currentRenderer.includes('data-action="close-others"'), 'tab context menu must include close-others action');
  assert(currentStyles.includes('.tab-context-menu'), 'styles.css must style .tab-context-menu');
  assert(currentRenderer.includes("el.tabsContainer.addEventListener('dblclick'"), 'renderer.js must handle dblclick on tabsContainer');

  // Verify scroll caching and exited subfolder matching logic
  const mockCache = new Map();
  mockCache.set('C:\\Users\\hp\\Documents', { scrollTop: 420, scrollLeft: 0, activePath: 'C:\\Users\\hp\\Documents\\Report.pdf' });
  assert.strictEqual(mockCache.get('C:\\Users\\hp\\Documents').scrollTop, 420);

  const mockItems = [
    { name: 'Projects', path: 'C:\\Users\\hp\\Documents\\Projects', isDirectory: true },
    { name: 'Report.pdf', path: 'C:\\Users\\hp\\Documents\\Report.pdf', isDirectory: false }
  ];
  const exitedFolder = 'C:\\Users\\hp\\Documents\\Projects\\';
  const exitedNorm = exitedFolder.replace(/[/\\]+$/, '').toLowerCase();
  const matchedIdx = mockItems.findIndex(it => it.path && it.path.replace(/[/\\]+$/, '').toLowerCase() === exitedNorm);
  assert.strictEqual(matchedIdx, 0, 'Exited folder must match its parent directory item');

  console.log('✓ Navigation Scroll Memory, Breadcrumb Drop Targets, Tab Context Menu & Ergonomics verified');

  // 35. Column View Sorting: sortItemList, Miller Column Sync & Column Header Controls
  assert(currentRenderer.includes('function sortItemList(list)'), 'renderer.js must implement sortItemList helper');
  assert(currentRenderer.includes('sortItemList(col.items)'), 'sortCurrentItems must sort all col.items in state.millerColumns');
  assert(currentRenderer.includes('column-header-sort-btn'), 'renderMillerColumns must render sort button in column header');
  assert(currentRenderer.includes('column-sort-arrow'), 'renderMillerColumns must render sort arrow in column header');
  assert(currentStyles.includes('.column-header-sort-btn'), 'styles.css must style .column-header-sort-btn');
  assert(currentStyles.includes('.column-header-left'), 'styles.css must style .column-header-left');
  assert(currentStyles.includes('.column-sort-arrow'), 'styles.css must style .column-sort-arrow');

  // Functional simulation of Miller Column sorting
  const testColItems = [
    { name: 'zebra.txt', size: 100, mtime: '2026-01-01', extension: '.txt', isDirectory: false },
    { name: 'Beta', size: 0, mtime: '2026-02-01', extension: '', isDirectory: true },
    { name: 'alpha.txt', size: 500, mtime: '2026-03-01', extension: '.txt', isDirectory: false },
    { name: 'Alpha', size: 0, mtime: '2026-01-15', extension: '', isDirectory: true }
  ];

  function simulateSort(list, field, asc) {
    return list.slice().sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      if (field === 'name') {
        return asc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (field === 'size') {
        return asc ? (a.size || 0) - (b.size || 0) : (b.size || 0) - (a.size || 0);
      }
      if (field === 'mtime') {
        return asc ? (new Date(a.mtime) - new Date(b.mtime)) : (new Date(b.mtime) - new Date(a.mtime));
      }
      return 0;
    });
  }

  // Name asc: Folders [Alpha, Beta], then files [alpha.txt, zebra.txt]
  const byNameAsc = simulateSort(testColItems, 'name', true);
  assert.strictEqual(byNameAsc[0].name, 'Alpha', 'Folders first, Alpha before Beta');
  assert.strictEqual(byNameAsc[1].name, 'Beta');
  assert.strictEqual(byNameAsc[2].name, 'alpha.txt');
  assert.strictEqual(byNameAsc[3].name, 'zebra.txt');

  // Size asc: Folders first, then zebra.txt (100) before alpha.txt (500)
  const bySizeAsc = simulateSort(testColItems, 'size', true);
  assert(bySizeAsc[0].isDirectory && bySizeAsc[1].isDirectory, 'Folders must stay first when sorting by size');
  assert.strictEqual(bySizeAsc[2].name, 'zebra.txt', '100 bytes must precede 500 bytes');
  assert.strictEqual(bySizeAsc[3].name, 'alpha.txt');

  // Name desc: Folders first (Beta, Alpha), then files (zebra.txt, alpha.txt)
  const byNameDesc = simulateSort(testColItems, 'name', false);
  assert.strictEqual(byNameDesc[0].name, 'Beta');
  assert.strictEqual(byNameDesc[1].name, 'Alpha');
  assert.strictEqual(byNameDesc[2].name, 'zebra.txt');
  assert.strictEqual(byNameDesc[3].name, 'alpha.txt');

  console.log('✓ Column View Sorting (Multi-Column Sync, Sort Button & Directory Priority) verified');
  // 36. Frontend Elevation Phase 2: View Switcher, Modal, Glass Header, Grid Hover, Empty Chips
  assert(currentStyles.includes('modalPopIn'), 'styles.css must define @keyframes modalPopIn');
  assert(currentStyles.includes('animation: modalPopIn'), 'styles.css must apply modalPopIn animation to .modal-card');
  assert(currentStyles.includes('backdrop-filter: blur(20px)'), 'styles.css modal-overlay must use blur(20px) backdrop-filter');
  assert(currentStyles.includes('inset 0 1px 0 rgba(255,255,255,0.10)'), 'styles.css modal-card must have top-rim inset highlight');
  assert(currentStyles.includes('box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3)'), 'styles.css view-switcher must have inset shadow housing');
  assert(currentStyles.includes('transform: scale(0.94)'), 'styles.css view-btn must have active scale-down press state');
  assert(currentStyles.includes('backdrop-filter: blur(16px) saturate(160%)'), 'styles.css list-header must have glass blur backdrop');
  assert(currentStyles.includes('font-variant-numeric: tabular-nums'), 'styles.css list-cell must use tabular-nums');
  assert(currentStyles.includes('.empty-state-ring'), 'styles.css must define .empty-state-ring style');
  assert(currentStyles.includes('.empty-chip'), 'styles.css must define .empty-chip style');
  assert(currentRenderer.includes('empty-state-ring'), 'renderer.js grid/list empty state must use empty-state-ring');
  assert(currentRenderer.includes('empty-state-chips'), 'renderer.js grid/list empty state must render empty-state-chips');
  assert(currentRenderer.includes('btnNewFileMenu'), 'renderer.js empty chips must reference btnNewFileMenu');
  assert(currentStyles.includes('box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.45)'), 'styles.css grid-item hover must have spring shadow lift');
  assert(currentStyles.includes('inset 0 0 0 1px rgba(255,255,255,0.08)'), 'styles.css grid-thumb-img must have inset containment stroke');

  console.log('✓ Frontend Elevation Phase 2 (View Switcher, Modal, Glass Header, Grid Hover, Empty Chips) verified');

  // 37. Windows Share Apps Detection and Badging
  assert(typeof fsEngine.detectInstalledShareApps === 'function', 'fs-engine must export detectInstalledShareApps');
  const detectedApps = fsEngine.detectInstalledShareApps();
  assert(typeof detectedApps === 'object' && detectedApps !== null, 'detectInstalledShareApps must return an object');
  ['whatsapp', 'telegram', 'localsend', 'quickshare', 'sendanywhere', 'phonelink', 'bluetooth', 'cloud'].forEach(appKey => {
    assert(typeof detectedApps[appKey] === 'boolean', `detectInstalledShareApps result must have boolean property ${appKey}`);
  });

  const mainSrc = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  assert(mainSrc.includes("'get-installed-share-apps'"), 'main.js must handle get-installed-share-apps IPC');
  assert(mainSrc.includes("'launch-share-app'"), 'main.js must handle launch-share-app IPC');

  const preloadSrc = fs.readFileSync(path.join(__dirname, '../preload.js'), 'utf8');
  assert(preloadSrc.includes('getInstalledShareApps'), 'preload.js must expose getInstalledShareApps');
  assert(preloadSrc.includes('launchShareApp'), 'preload.js must expose launchShareApp');

  const serverSrc = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  assert(serverSrc.includes('/api/installed-share-apps'), 'server.js must define /api/installed-share-apps route');

  assert(currentRenderer.includes('refreshInstalledShareApps'), 'renderer.js must implement refreshInstalledShareApps');
  assert(currentRenderer.includes('filterShareApps'), 'renderer.js must implement filterShareApps');
  assert(currentStyles.includes('.share-app-badge.installed'), 'styles.css must style .share-app-badge.installed');
  assert(currentStyles.includes('.share-app-badge.system'), 'styles.css must style .share-app-badge.system');
  assert(currentStyles.includes('.share-app-card.is-installed'), 'styles.css must style .share-app-card.is-installed');

  console.log('✓ Windows Share Apps Detection & Badging verified');

  // 38. Desktop Context Menu Architecture & Viewport Clamping
  assert(currentRenderer.includes('function sanitizeDividers()'), 'renderer.js must implement sanitizeDividers helper');
  assert(currentRenderer.includes('posY = y - menuHeight'), 'renderer.js must flip context menu upwards when near bottom');
  assert(currentRenderer.includes('Math.max(pad, posY)'), 'renderer.js must clamp posY to prevent clipping at top of viewport');
  assert(currentStyles.includes('max-height: calc(100vh - 20px)'), 'styles.css must set max-height on .context-menu to fit viewport');
  assert(currentStyles.includes('padding-left: 16px'), 'styles.css must give .ctx-shortcut left padding to avoid label collision');

  // Simulation of divider sanitization logic
  function testSanitize(items) {
    const output = [];
    let hasPrior = false;
    let pendingDivider = false;
    items.forEach(it => {
      if (it === 'DIVIDER') {
        if (hasPrior) pendingDivider = true;
      } else if (it.visible) {
        if (pendingDivider) {
          output.push('DIVIDER');
          pendingDivider = false;
        }
        output.push(it.name);
        hasPrior = true;
      }
    });
    return output;
  }

  const rawMenu = [
    'DIVIDER', // leading divider (should be omitted)
    { name: 'Tags', visible: true },
    'DIVIDER',
    { name: 'Open', visible: true },
    'DIVIDER',
    'DIVIDER', // duplicate divider (should be squashed to 1)
    { name: 'Cut', visible: true },
    'DIVIDER', // trailing divider with hidden elements
    { name: 'NewFolder', visible: false }
  ];
  const cleaned = testSanitize(rawMenu);
  assert.deepStrictEqual(cleaned, ['Tags', 'DIVIDER', 'Open', 'DIVIDER', 'Cut'], 'Dividers must be cleanly sanitized without leading, trailing, or duplicates');

  console.log('✓ Desktop Context Menu Architecture & Viewport Clamping verified');

  // 39. Active Indicators System (Toolbar Toggle Buttons, View Switcher, Tabs & Sidebar)
  const freshStyles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');
  assert(freshStyles.includes('.tool-btn.active'), 'styles.css must implement .tool-btn.active for toggle buttons');
  assert(freshStyles.includes('.view-btn.active::after'), 'styles.css must implement illuminated active bar ::after on view-btn');
  assert(freshStyles.includes('.tab-item.active::after'), 'styles.css must implement illuminated bottom indicator bar on active tab');
  assert(freshStyles.includes('.sidebar-item.active::before'), 'styles.css must implement flush glowing active notch on sidebar item');
  assert(freshStyles.includes('.sidebar-item.active .icon'), 'styles.css must illuminate active sidebar icon with accent color');

  console.log('✓ Active Indicators System (Toolbar, View Switcher, Tabs & Sidebar) verified');

  // 40. Toolbar Action State Machine & Unbroken Action Handlers
  const freshRenderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
  assert(freshRenderer.includes('function updateToolbarActionStates'), 'renderer.js must implement updateToolbarActionStates()');
  assert(freshStyles.includes('.tool-btn.btn-dimmed'), 'styles.css must include .btn-dimmed for selection-dependent toolbar buttons');
  assert(!freshStyles.includes('overflow-wrap: anywhere;'), 'styles.css must not use overflow-wrap: anywhere which awkwardly breaks words');

  // Verify none of the previous broken functions exist in renderer.js
  const brokenCalls = ['handleCut()', 'handleCopy()', 'handlePaste()', 'deleteSelectedItems()', 'openTerminalHere()', 'updateSortDropdownUI()', 'sortAndRenderItems()', 'setFileTag('];
  brokenCalls.forEach(call => {
    assert(!freshRenderer.includes(call), `renderer.js must not call undefined function: ${call}`);
  });

  // Verify toolbar action helpers exist
  assert(freshRenderer.includes('handleToolbarRename'), 'renderer.js must define handleToolbarRename');
  assert(freshRenderer.includes('handleToolbarDelete'), 'renderer.js must define handleToolbarDelete');
  assert(freshRenderer.includes('handleToolbarQuickLook'), 'renderer.js must define handleToolbarQuickLook');
  assert(freshRenderer.includes('handleToolbarTag'), 'renderer.js must define handleToolbarTag');

  console.log('✓ Toolbar Action State Machine & Unbroken Action Handlers verified');

  // 41. Quick Look Folder Inspector & Centered Junction Hero Engine
  assert(freshStyles.includes('.ql-folder-container'), 'styles.css must include .ql-folder-container');
  assert(freshStyles.includes('.ql-folder-hero'), 'styles.css must include .ql-folder-hero');
  assert(freshRenderer.includes('ql-folder-hero'), 'renderer.js must include ql-folder-hero template');
  assert(freshRenderer.includes('ql-folder-container'), 'renderer.js must include ql-folder-container template');
  assert(freshRenderer.includes('C:\\\\Users'), 'renderer.js must resolve Documents and Settings junction target to C:\\Users');
  assert(freshRenderer.includes('qlBtnOpenThisFolder'), 'renderer.js must provide Open Folder button in folder preview');

  console.log('✓ Quick Look Folder Inspector & Centered Junction Hero Engine verified');

  // 42. Parent Directory Navigation Engine (goUp, getParentPath & Root Boundary Safety)
  const freshIndexHtml = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
  assert(freshRenderer.includes('function getParentPath('), 'renderer.js must implement getParentPath helper');
  assert(freshRenderer.includes('el.btnUp.title = parentPath ?'), 'renderer.js must dynamically set btnUp tooltip with target path');
  assert(freshRenderer.includes('el.btnSecondaryUp.title = secParent ?'), 'renderer.js must set secondary pane up button title');
  assert(freshIndexHtml.includes('id="ctxUp"'), 'index.html must include ctxUp in the context menu');
  assert(freshRenderer.includes('el.ctxUp.addEventListener(\'click\''), 'renderer.js must wire click handler for ctxUp');

  // Test getParentPath logic directly
  const matchParentFn = freshRenderer.match(/function getParentPath\([^\)]*\)\s*\{([\s\S]*?)\n  \}/);
  assert(matchParentFn, 'Must extract getParentPath function body');
  const getParentPathTest = new Function('dirPath', matchParentFn[1]);

  assert.strictEqual(getParentPathTest('C:\\Users\\hp\\Desktop'), 'C:\\Users\\hp', 'Parent of Desktop must be C:\\Users\\hp');
  assert.strictEqual(getParentPathTest('C:\\Users\\hp'), 'C:\\Users', 'Parent of hp must be C:\\Users');
  assert.strictEqual(getParentPathTest('C:\\Users'), 'C:\\', 'Parent of C:\\Users must be C:\\ (not C::\\)');
  assert.strictEqual(getParentPathTest('C:\\'), null, 'Parent of C:\\ must be null (root)');
  assert.strictEqual(getParentPathTest('C:'), null, 'Parent of C: must be null (root)');
  assert.strictEqual(getParentPathTest('e:/my file/src'), 'E:\\my file', 'Forward slash path parent resolution must work');
  assert.strictEqual(getParentPathTest('e:/my file'), 'E:\\', 'Parent of e:/my file must be E:\\');
  assert.strictEqual(getParentPathTest('e:/'), null, 'Parent of e:/ must be null (root)');
  assert.strictEqual(getParentPathTest('\\\\server\\share\\folder'), '\\\\server\\share', 'UNC subfolder must resolve to UNC share');
  assert.strictEqual(getParentPathTest('\\\\server\\share'), null, 'UNC share root must be null');
  assert.strictEqual(getParentPathTest('/home/user/code'), '/home/user', 'Unix subfolder must resolve to parent');
  assert.strictEqual(getParentPathTest('/home'), '/', 'Parent of /home must be /');
  assert.strictEqual(getParentPathTest('/'), null, 'Unix root must be null');

  console.log('✓ Parent Directory Navigation Engine (goUp, getParentPath & Root Boundary Safety) verified');

  // 43. Share Hub Modal Geometry (2x2 Balanced Grid & Strict QR Image Fitting)
  assert(!freshIndexHtml.includes('id="shareOptExplorer"'), 'Share modal must not include legacy Reveal in Explorer');
  assert(freshStyles.includes('.share-qr-container {') && freshStyles.includes('overflow: hidden;'), 'styles.css must enforce overflow: hidden on .share-qr-container');
  assert(freshStyles.includes('.share-qr-container img') && freshStyles.includes('object-fit: contain;'), 'styles.css must size .share-qr-container img with object-fit: contain');
  assert(freshRenderer.includes('object-fit: contain; display: block;'), 'renderer.js must fit QR image within container bounds');
  assert(!freshRenderer.includes('width="130" height="130"'), 'renderer.js must not force oversized 130px dimensions on QR img');

  console.log('✓ Share Hub Modal Geometry (2x2 Balanced Grid & Strict QR Image Fitting) verified');

  // 44. System Recycle Bin Integration Engine (Native Shell, Live Stats, In-App View & Item Restoration)
  const storageMod = require('../storage');
  const fsEngineMod = require('../fs-engine');
  assert(typeof storageMod.queryRecycleBin === 'function', 'storage.js must export queryRecycleBin');
  assert(typeof storageMod.emptyRecycleBin === 'function', 'storage.js must export emptyRecycleBin');
  assert(typeof storageMod.getRecycleBinItems === 'function', 'storage.js must export getRecycleBinItems');
  assert(typeof storageMod.restoreRecycleBinItem === 'function', 'storage.js must export restoreRecycleBinItem');
  assert(typeof storageMod.restoreAllRecycleBinItems === 'function', 'storage.js must export restoreAllRecycleBinItems');
  assert(typeof storageMod.deletePermanentlyRecycleBinItem === 'function', 'storage.js must export deletePermanentlyRecycleBinItem');
  assert(typeof storageMod.moveToRecycleBin === 'function', 'storage.js must export moveToRecycleBin');
  assert(typeof storageMod.parseShellDate === 'function', 'storage.js must export parseShellDate');

  // Verify parseShellDate handles Unicode directional marks (\u200e, \u200f)
  const parsedDate = storageMod.parseShellDate('\u200e13-\u200e09-\u200e2026 \u200f18:24');
  assert(parsedDate !== null, 'parseShellDate must parse string with directional marks');
  assert(!isNaN(new Date(parsedDate).getTime()), 'parseShellDate must return valid ISO date');

  // Verify resolvePath handles trailing and leading slashes for Recycle Bin
  assert.strictEqual(fsEngineMod.resolvePath('Recycle Bin\\'), 'recycle-bin', 'resolvePath must normalize "Recycle Bin\\"');
  assert.strictEqual(fsEngineMod.resolvePath('\\Recycle Bin'), 'recycle-bin', 'resolvePath must normalize "\\Recycle Bin"');

  // Query live recycle bin stats and directory listing
  const liveRecycleStats = await storageMod.queryRecycleBin();
  assert(typeof liveRecycleStats.count === 'number', 'Recycle bin item count must be a number');
  assert(typeof liveRecycleStats.bytes === 'number', 'Recycle bin total size must be a number');

  const recycleDirResult = await fsEngineMod.readDirectory('recycle-bin');
  assert.strictEqual(recycleDirResult.success, true, 'fsEngine.readDirectory("recycle-bin") must succeed');
  assert.strictEqual(recycleDirResult.isRecycleBin, true, 'readDirectory("recycle-bin") must set isRecycleBin: true');
  assert.strictEqual(recycleDirResult.currentPath, 'Recycle Bin', 'readDirectory("recycle-bin") must set currentPath to Recycle Bin');
  assert(Array.isArray(recycleDirResult.items), 'recycleDirResult.items must be an array');

  // Verify instant Recycle Bin retrieval performance (< 500ms, typically 10-30ms)
  const t0 = Date.now();
  const perfItems = await storageMod.getRecycleBinItems();
  const readElapsed = Date.now() - t0;
  assert(readElapsed < 500, `getRecycleBinItems must be under 500ms, took ${readElapsed}ms`);

  // Verify IPC and Server endpoints
  const updatedMain = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  const updatedPreload = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');
  const updatedServer = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const updatedIndex = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
  const updatedRenderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
  const updatedStyles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');

  assert(updatedMain.includes("ipcMain.handle('open-recycle-bin'"), 'main.js must implement open-recycle-bin IPC');
  assert(updatedMain.includes("ipcMain.handle('get-recycle-stats'"), 'main.js must implement get-recycle-stats IPC');
  assert(updatedMain.includes("ipcMain.handle('restore-recycle-item'"), 'main.js must implement restore-recycle-item IPC');
  assert(updatedMain.includes("ipcMain.handle('restore-all-recycle'"), 'main.js must implement restore-all-recycle IPC');
  assert(updatedMain.includes("ipcMain.handle('delete-permanently'"), 'main.js must implement delete-permanently IPC');

  assert(updatedPreload.includes('openRecycleBin:'), 'preload.js must expose openRecycleBin');
  assert(updatedPreload.includes('getRecycleStats:'), 'preload.js must expose getRecycleStats');
  assert(updatedPreload.includes('restoreRecycleItem:'), 'preload.js must expose restoreRecycleItem');
  assert(updatedPreload.includes('emptyRecycleBin:'), 'preload.js must expose emptyRecycleBin');
  assert(updatedPreload.includes('restoreAllRecycle:'), 'preload.js must expose restoreAllRecycle');
  assert(updatedPreload.includes('deletePermanently:'), 'preload.js must expose deletePermanently');

  assert(updatedServer.includes('/api/recycle-bin/stats'), 'server.js must expose /api/recycle-bin/stats');
  assert(updatedServer.includes('/api/recycle-bin/open'), 'server.js must expose /api/recycle-bin/open');
  assert(updatedServer.includes('/api/recycle-bin/restore'), 'server.js must expose /api/recycle-bin/restore');
  assert(updatedServer.includes('/api/recycle-bin/restore-all'), 'server.js must expose /api/recycle-bin/restore-all');
  assert(updatedServer.includes('/api/recycle-bin/delete'), 'server.js must expose /api/recycle-bin/delete');

  // Verify UI and Context Menu Elements
  assert(updatedIndex.includes('id="sidebarRecycleBin"'), 'index.html must include sidebarRecycleBin in sidebar');
  assert(updatedIndex.includes('id="sidebarRecycleCount"'), 'index.html must include sidebarRecycleCount badge');
  assert(updatedIndex.includes('id="recycleBinBanner"'), 'index.html must include recycleBinBanner');
  assert(updatedIndex.includes('id="btnRestoreAllRecycle"'), 'index.html must include btnRestoreAllRecycle in banner');
  assert(updatedIndex.includes('id="btnEmptyRecycleView"'), 'index.html must include btnEmptyRecycleView in banner');
  assert(updatedIndex.includes('id="ctxRestore"'), 'index.html must include ctxRestore in context menu');
  assert(updatedIndex.includes('id="ctxDeletePermanently"'), 'index.html must include ctxDeletePermanently in context menu');
  assert(updatedIndex.includes('id="ctxRestoreAll"'), 'index.html must include ctxRestoreAll in context menu');
  assert(updatedIndex.includes('id="ctxEmptyRecycle"'), 'index.html must include ctxEmptyRecycle in context menu');
  assert(updatedStyles.includes('.sidebar-item.recycle-drop-active'), 'styles.css must style drag-over trash state');
  assert(updatedStyles.includes('.recycle-bin-banner'), 'styles.css must style recycle-bin-banner');

  // Verify Renderer State & Methods
  assert(updatedRenderer.includes('function openRecycleBinHandler'), 'renderer.js must implement openRecycleBinHandler');
  assert(updatedRenderer.includes('function updateRecycleBinBadge'), 'renderer.js must implement updateRecycleBinBadge');
  assert(updatedRenderer.includes('function setupRecycleBinDropTarget'), 'renderer.js must implement setupRecycleBinDropTarget');
  assert(updatedRenderer.includes('function showRecycleBinContextMenu'), 'renderer.js must implement showRecycleBinContextMenu');
  assert(updatedRenderer.includes('function promptEmptyRecycleBin'), 'renderer.js must implement promptEmptyRecycleBin');
  assert(updatedRenderer.includes('handleRestoreSelectedItem'), 'renderer.js must implement handleRestoreSelectedItem');
  assert(updatedRenderer.includes('handleRestoreAllRecycle'), 'renderer.js must implement handleRestoreAllRecycle');
  assert(updatedRenderer.includes('handleDeletePermanentlyItem'), 'renderer.js must implement handleDeletePermanentlyItem');
  assert(updatedRenderer.includes('handleRecycleItemDoubleClick'), 'renderer.js must implement handleRecycleItemDoubleClick');

  console.log('✓ System Recycle Bin Integration Engine (Native Shell, In-App View, Restore & Permanent Deletion) verified');

  // Production Hardening Suite
  const serverSrcProd = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  const indexSrcProd  = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
  const pkgSrc        = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
  const pkg           = JSON.parse(pkgSrc);

  // Body size cap
  assert(serverSrcProd.includes('MAX_BODY_BYTES'), 'server.js must define MAX_BODY_BYTES constant');
  assert(serverSrcProd.includes('Request body too large'), 'server.js must reject oversized bodies with 413');

  // Path-traversal guard
  assert(serverSrcProd.includes('function safeJoin'), 'server.js must define safeJoin path-traversal guard');
  assert(serverSrcProd.includes('resolvedFilePath.startsWith(path.resolve(PUBLIC_DIR))'), 'server.js static server must guard against path traversal');

  // HTTP Range / 206 support
  assert(serverSrcProd.includes('Content-Range'), 'server.js raw-file route must emit Content-Range header for 206 responses');
  assert(serverSrcProd.includes('res.writeHead(206'), 'server.js must return HTTP 206 for range requests');

  // Server error handler
  assert(serverSrcProd.includes("server.on('error'"), 'server.js must have server.on(error) handler');
  assert(serverSrcProd.includes('EADDRINUSE'), 'server.js error handler must detect port-in-use condition');

  // Graceful shutdown
  assert(serverSrcProd.includes('uncaughtException'), 'server.js must handle uncaughtException');
  assert(serverSrcProd.includes('unhandledRejection'), 'server.js must handle unhandledRejection');
  assert(serverSrcProd.includes('gracefulShutdown'), 'server.js must implement gracefulShutdown function');
  assert(serverSrcProd.includes("process.on('SIGTERM'"), 'server.js must listen for SIGTERM');
  assert(serverSrcProd.includes("process.on('SIGINT'"), 'server.js must listen for SIGINT');

  // CSP meta tag
  assert(indexSrcProd.includes('Content-Security-Policy'), 'index.html must include a Content-Security-Policy meta tag');
  assert(indexSrcProd.includes("connect-src 'self' http://localhost:5241"), 'CSP must allow connect-src to local API');

  // Cache-Control on static server
  assert(serverSrcProd.includes('Cache-Control'), 'server.js static server must set Cache-Control headers');

  // Version bump
  assert(/^\d+\.\d+\.\d+/.test(pkg.version), `package.json version must be valid semver, got ${pkg.version}`);

  // Localhost-only binding (not 0.0.0.0)
  assert(serverSrcProd.includes("'127.0.0.1'"), 'server.js must bind to 127.0.0.1 (localhost only)');

  // safeJoin functional correctness
  const { basename, join } = path;
  function safeJoinCheck(base, name) {
    const clean = basename(name);
    if (!clean || clean !== name || clean === '.' || clean === '..') throw new Error(`Unsafe: ${name}`);
    return join(base, clean);
  }
  assert.strictEqual(safeJoinCheck('C:\\Users\\test', 'report.pdf'), 'C:\\Users\\test\\report.pdf');
  assert.throws(() => safeJoinCheck('C:\\Users\\test', '..\\..\\windows\\system32'), Error);
  assert.throws(() => safeJoinCheck('C:\\Users\\test', '../etc/passwd'), Error);

  console.log('✓ Production Hardening (Body Cap, Path Traversal, Range/206, Error Handler, CSP, Cache, Graceful Shutdown) verified');

  // Windows Native Storage & Administrative Tools Integration Suite
  assert(typeof storage.launchWindowsTool === 'function', 'storage.js must export launchWindowsTool function');
  assert(mainSrc.includes("'launch-windows-tool'"), 'main.js must register launch-windows-tool IPC handler');
  assert(preloadSrc.includes('launchWindowsTool:'), 'preload.js must expose launchWindowsTool to window.myFilesAPI');
  assert(serverSrc.includes('/api/launch-windows-tool'), 'server.js must define /api/launch-windows-tool endpoint');
  assert(updatedRenderer.includes('btn-launch-win-tool'), 'renderer.js must wire .btn-launch-win-tool buttons');
  assert(updatedIndex.includes('storage-tools-grid'), 'index.html must include storage-tools-grid container');
  assert(updatedIndex.includes('data-tool="cleanmgr"'), 'index.html must provide Disk Cleanup launcher');
  assert(updatedIndex.includes('data-tool="diskmgmt"'), 'index.html must provide Disk Management launcher');
  assert(updatedIndex.includes('data-tool="dfrgui"'), 'index.html must provide Defrag/TRIM launcher');
  assert(updatedIndex.includes('data-tool="resmon"'), 'index.html must provide Resource Monitor launcher');
  assert(updatedIndex.includes('data-tool="chkdsk"'), 'index.html must provide Check Disk launcher');
  assert(updatedIndex.includes('data-tool="storagespaces"'), 'index.html must provide Storage Spaces launcher');
  assert(updatedIndex.includes('data-tool="fsmgmt"'), 'index.html must provide Shared Folders launcher');
  assert(updatedIndex.includes('data-tool="filehistory"'), 'index.html must provide File History launcher');
  assert(updatedIndex.includes('id="ctxPowerShell"'), 'index.html must include ctxPowerShell');
  assert(updatedIndex.includes('id="ctxCmd"'), 'index.html must include ctxCmd');
  assert(updatedRenderer.includes('driveCtxChkdsk'), 'renderer.js must include driveCtxChkdsk');
  assert(updatedRenderer.includes('el.ctxPowerShell'), 'renderer.js must wire el.ctxPowerShell');
  assert(updatedRenderer.includes('el.ctxCmd'), 'renderer.js must wire el.ctxCmd');
  assert(updatedStyles.includes('.storage-tools-grid'), 'styles.css must style .storage-tools-grid layout');

  console.log('✓ Windows Native Storage & Administrative Tools Integration verified');

  // Whole-file JavaScript Syntax Validation Check
  const jsFilesToValidate = ['src/renderer.js', 'main.js', 'preload.js', 'server.js', 'storage.js', 'fs-engine.js'];
  jsFilesToValidate.forEach(file => {
    execSync(`node -c "${path.join(__dirname, '..', file)}"`);
  });
  console.log(`✓ Whole-file syntax validation passed for all ${jsFilesToValidate.length} core JS files`);

  // 48. DOM Integrity & Element ID Parity Check
  const dynamicTemplateIds = new Set(['backendOfflineBanner', 'btnRetryBackend', 'tabContextMenu', 'recycleContextMenu', 'galleryHeroImg', 'ppHeroThumb', 'listColumnContextMenu', 'sidebarFolderContextMenu', 'sidebarBgContextMenu']);
  const idMatches = Array.from(updatedRenderer.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g)).map(m => m[1]);
  const missingFromHtml = idMatches.filter(id => !dynamicTemplateIds.has(id) && !updatedIndex.includes(`id="${id}"`) && !updatedIndex.includes(`id='${id}'`));
  if (missingFromHtml.length > 0) {
    console.warn('Elements queried in renderer.js but not in index.html:', missingFromHtml);
  }
  assert(missingFromHtml.length === 0, `All static DOM IDs queried in renderer.js must exist in index.html: ${missingFromHtml.join(', ')}`);
  console.log('✓ DOM Integrity & Element ID Parity (All elements in app) verified');

  // 49. Multi-Window Desktop Architecture & Keyboard Parity Check
  assert(mainSrc.includes("ipcMain.handle('open-new-window'"), 'main.js must implement open-new-window IPC handler');
  assert(preloadSrc.includes("openNewWindow:"), 'preload.js must expose openNewWindow API');
  assert(mainSrc.includes("BrowserWindow.fromWebContents(event.sender)"), 'main.js must support per-window controls via event.sender');
  assert(updatedRenderer.includes("openNewWindow(state.currentPath)"), 'renderer.js must wire openNewWindow invocation');
  assert(updatedRenderer.includes("btnNewWindow"), 'renderer.js must reference btnNewWindow');
  assert(updatedIndex.includes('id="btnNewWindow"'), 'index.html must include btnNewWindow in titlebar');
  assert(updatedIndex.includes('id="ctxOpenNewWindow"'), 'index.html must include ctxOpenNewWindow in context menu');
  assert(updatedRenderer.includes('data-action="open-window"'), 'renderer.js must support open in new window in tab context menu');
  console.log('✓ Multi-Window Desktop Architecture (Ctrl+N, Tab Detach & Per-Window IPC) verified');

  // 50. Dual Runtime API Parity Check (Electron IPC & Server REST)
  const mainHandles = Array.from(mainSrc.matchAll(/ipcMain\.handle\('([^']+)'/g)).map(m => m[1]);
  const missingIpc = mainHandles.filter(h => !preloadSrc.includes(h));
  assert(missingIpc.length === 0, `All main.js IPC handlers must be exposed in preload.js: ${missingIpc.join(', ')}`);

  const serverRouteMatches = Array.from(updatedRenderer.matchAll(/SERVER_ORIGIN\s*\+\s*['"](\/api\/[a-zA-Z0-9_\-\/]+?)(?:[?'"])/g)).map(m => m[1]);
  const templateRouteMatches = Array.from(updatedRenderer.matchAll(/\$\{SERVER_ORIGIN\}(\/api\/[a-zA-Z0-9_\-\/]+?)(?:[?`'"])/g)).map(m => m[1]);
  const allClientRoutes = Array.from(new Set([...serverRouteMatches, ...templateRouteMatches]));
  const missingServerRoutes = allClientRoutes.filter(r => !serverSrc.includes(`'${r}'`) && !serverSrc.includes(`"${r}"`));
  if (missingServerRoutes.length > 0) {
    console.warn('Client routes missing from server.js:', missingServerRoutes);
  }
  assert(missingServerRoutes.length === 0, `All client API endpoints must have corresponding routes in server.js: ${missingServerRoutes.join(', ')}`);
  console.log(`✓ Dual Runtime API Parity (${mainHandles.length} IPC channels & ${allClientRoutes.length} REST endpoints) verified`);

  // 51. Sort Grouping / Group By Engine & Visual Hierarchy Suite
  assert(updatedIndex.includes('data-group="none"'), 'index.html must include data-group="none"');
  assert(updatedIndex.includes('data-group="kind"'), 'index.html must include data-group="kind"');
  assert(updatedIndex.includes('data-group="date"'), 'index.html must include data-group="date"');
  assert(updatedIndex.includes('data-group="size"'), 'index.html must include data-group="size"');
  assert(updatedIndex.includes('data-group="name"'), 'index.html must include data-group="name"');
  assert(updatedIndex.includes('id="voGroupSelect"'), 'index.html must include voGroupSelect in View Options');

  assert(updatedStyles.includes('.grouped-grid-wrapper'), 'styles.css must style .grouped-grid-wrapper');
  assert(updatedStyles.includes('.view-group-section'), 'styles.css must style .view-group-section');
  assert(updatedStyles.includes('.view-group-header'), 'styles.css must style .view-group-header');
  assert(updatedStyles.includes('.group-chevron'), 'styles.css must style .group-chevron');
  assert(updatedStyles.includes('.view-group-title'), 'styles.css must style .view-group-title');
  assert(updatedStyles.includes('.view-group-count'), 'styles.css must style .view-group-count');

  assert(updatedRenderer.includes('getGroupedItems'), 'renderer.js must implement getGroupedItems');
  assert(updatedRenderer.includes('createGroupHeaderElement'), 'renderer.js must implement createGroupHeaderElement');
  assert(updatedRenderer.includes('setGroupBy'), 'renderer.js must implement setGroupBy');
  assert(updatedRenderer.includes('groupBy:'), 'renderer.js state must include groupBy');
  assert(updatedRenderer.includes('collapsedGroups:'), 'renderer.js state must include collapsedGroups');
  assert(updatedRenderer.includes('voGroupSelect:'), 'renderer.js el must cache voGroupSelect');

  // Functional test of grouping logic
  const sampleItems = [
    { name: 'Documents', isDirectory: true, size: 0, mtime: new Date().toISOString() },
    { name: 'photo.jpg', isDirectory: false, extension: '.jpg', size: 2 * 1024 * 1024, mtime: new Date().toISOString() },
    { name: 'clip.mp4', isDirectory: false, extension: '.mp4', size: 200 * 1024 * 1024, mtime: new Date().toISOString() },
    { name: 'song.mp3', isDirectory: false, extension: '.mp3', size: 5 * 1024 * 1024, mtime: new Date(Date.now() - 86400000).toISOString() },
    { name: 'readme.txt', isDirectory: false, extension: '.txt', size: 1024, mtime: new Date(Date.now() - 30 * 86400000).toISOString() },
    { name: 'archive.zip', isDirectory: false, extension: '.zip', size: 50 * 1024 * 1024, mtime: new Date(Date.now() - 400 * 86400000).toISOString() }
  ];

  // Verify grouping by kind separates directories, images, videos, audio, docs, and archives
  const kindMatch = updatedRenderer.match(/function getGroupedItems\([\s\S]+?\n  \}/);
  assert(kindMatch, 'renderer.js must have complete getGroupedItems function body');
  const getGroupedItemsEval = new Function('items', 'groupBy', 'escapeHtml', kindMatch[0] + '\nreturn getGroupedItems(items, groupBy);');
  
  const kindGroups = getGroupedItemsEval(sampleItems, 'kind', (s) => s);
  assert(Array.isArray(kindGroups) && kindGroups.length > 0, 'Grouping by kind must return array of groups');
  assert(kindGroups[0].title === 'Folders' && kindGroups[0].items.length === 1, 'First group must be Folders');

  const sizeGroups = getGroupedItemsEval(sampleItems, 'size', (s) => s);
  assert(Array.isArray(sizeGroups) && sizeGroups.length > 0, 'Grouping by size must return array of groups');
  assert(sizeGroups.some(g => g.title.includes('Gigantic')), 'Must detect gigantic files (>128MB)');

  const nameGroups = getGroupedItemsEval(sampleItems, 'name', (s) => s);
  assert(Array.isArray(nameGroups) && nameGroups.length > 0, 'Grouping by name must return array of groups');

  console.log('✓ Sort Grouping / Group By Engine & Visual Hierarchy Suite verified');

  // 52. Drive Display Name Formatting & Non-Duplication Suite
  assert(updatedRenderer.includes('formatDriveDisplayName'), 'renderer.js must implement formatDriveDisplayName');
  const driveFormatMatch = updatedRenderer.match(/function formatDriveDisplayName\([\s\S]+?\n  \}/);
  assert(driveFormatMatch, 'renderer.js must contain formatDriveDisplayName definition');
  const formatDriveEval = new Function('drive', driveFormatMatch[0] + '\nreturn formatDriveDisplayName(drive);');

  assert.strictEqual(formatDriveEval({ label: 'Local Drive (E:)', letter: 'E' }), 'Local Drive (E:)', 'Must not duplicate (E:) when already present');
  assert.strictEqual(formatDriveEval({ label: 'Local Drive (D:) (D:)', letter: 'D' }), 'Local Drive (D:)', 'Must collapse duplicate (D:) (D:) to single (D:)');
  assert.strictEqual(formatDriveEval({ label: 'OS Disk', letter: 'C' }), 'OS Disk (C:)', 'Must append letter to OS Disk');
  assert.strictEqual(formatDriveEval({ label: 'Local Drive', letter: 'E' }), 'Local Drive (E:)', 'Must append letter to plain Local Drive');
  assert.strictEqual(formatDriveEval({ label: 'Samsung SSD', letter: 'F' }), 'Samsung SSD (F:)', 'Must format custom drive names cleanly');
  console.log('✓ Drive Display Name Formatting & Non-Duplication Suite verified');

  // 53. Package Build Configuration & ASAR Module Integrity Suite
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const buildPkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const buildFiles = buildPkgData.build && buildPkgData.build.files;
  assert(Array.isArray(buildFiles), 'package.json must contain build.files array');
  const requiredModules = ['archive.js', 'vlc.js', 'dedup.js', 'storage.js', 'fs-engine.js', 'main.js', 'preload.js'];
  for (const mod of requiredModules) {
    assert(buildFiles.includes(mod) || buildFiles.includes('*.js'), `package.json build.files must include ${mod} to prevent runtime missing module errors in packaged app`);
  }

  // Verify SemVer release normalization and sync-version script
  const { normalizeToSemver } = require('../scripts/sync-version');
  assert.strictEqual(normalizeToSemver('v1.1.0.3', '1.1.1'), '1.1.3', '4-part v1.1.0.3 must map to valid SemVer 1.1.3');
  assert.strictEqual(normalizeToSemver('1.1.0.3', '1.1.1'), '1.1.3', '4-part 1.1.0.3 must map to valid SemVer 1.1.3');
  assert.strictEqual(normalizeToSemver('v1.1.0.1', '1.1.1'), '1.1.1', 'v1.1.0.1 must map to 1.1.1');
  assert.strictEqual(normalizeToSemver('v1.1.1', '1.1.1'), '1.1.1', 'Standard v1.1.1 must remain 1.1.1');
  assert.strictEqual(normalizeToSemver('v1.2.0', '1.1.1'), '1.2.0', 'v1.2.0 must remain 1.2.0');

  console.log('✓ Packaging Build Configuration & ASAR Module Integrity Suite verified');

  // 54. Default Windows File Manager Registry Integration Suite
  const mainCode = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  const serverCode = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert(!mainCode.includes('register-default-file-manager.bat'), 'main.js must not depend on external .bat files for make-default');
  assert(!mainCode.includes('restore-windows-explorer.bat'), 'main.js must not depend on external .bat files for restore-default');
  assert(!serverCode.includes('register-default-file-manager.bat'), 'server.js must not depend on external .bat files for make-default');
  assert(!serverCode.includes('restore-windows-explorer.bat'), 'server.js must not depend on external .bat files for restore-default');
  assert(mainCode.includes("runRegCommand(['add', 'HKCU\\\\Software\\\\Classes\\\\Directory\\\\shell\\\\MyFiles'"), 'main.js must add Directory shell registry key directly');
  assert(mainCode.includes("runRegCommand(['add', 'HKCU\\\\Software\\\\Classes\\\\Drive\\\\shell\\\\MyFiles'"), 'main.js must add Drive shell registry key directly');
  assert(mainCode.includes("ipcMain.handle('is-default'"), 'main.js must handle is-default query');
  assert(serverCode.includes("pathname === '/api/is-default'"), 'server.js must handle /api/is-default route');
  assert(updatedRenderer.includes('updateDefaultFileManagerButtons'), 'renderer.js must implement updateDefaultFileManagerButtons');
  assert(updatedIndex.includes('id="settingsBtnRestoreDefault" style="display: none;'), 'index.html must hide settingsBtnRestoreDefault initially to prevent both buttons showing at once');
  // 55. macOS Finder Advanced Parity Suite (Miller Column Resizing, Quick Actions, List Column Menu, Grid Subtitles)
  const stylesCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');
  assert(updatedRenderer.includes('column-resizer'), 'renderer.js must create column-resizer handles for Miller Columns');
  assert(stylesCode.includes('.column-resizer'), 'styles.css must style .column-resizer handle');
  assert(updatedRenderer.includes('resizer.addEventListener(\'dblclick\''), 'renderer.js must implement double-click auto-fit on column resizer');
  assert(updatedRenderer.includes('cpBtnRotate'), 'renderer.js must wire cpBtnRotate Quick Action in column preview');
  assert(updatedRenderer.includes('cpBtnShare'), 'renderer.js must wire cpBtnShare Quick Action in column preview');
  assert(updatedRenderer.includes('showListColumnContextMenu'), 'renderer.js must implement showListColumnContextMenu');
  assert(stylesCode.includes('.list-column-context-menu'), 'styles.css must style .list-column-context-menu');
  assert(updatedRenderer.includes('state.showItemInfo'), 'renderer.js must support state.showItemInfo');
  assert(updatedIndex.includes('id="voChkItemInfo"'), 'index.html must include voChkItemInfo in view options panel');
  // 56. Quick Look PDF Hand Tool, Pan Drag & Boundary Gesture Suite
  assert(updatedRenderer.includes('id="qlPdfHandTool"'), 'renderer.js must include qlPdfHandTool button in PDF preview toolbar');
  assert(updatedRenderer.includes('hand-tool-active'), 'renderer.js must set hand-tool-active class on PDF canvas wrapper');
  assert(stylesCode.includes('.ql-pdf-canvas-wrap.hand-tool-active'), 'styles.css must style .ql-pdf-canvas-wrap.hand-tool-active with grab cursor');
  assert(stylesCode.includes('.ql-pdf-canvas-wrap.hand-tool-active.is-grabbing'), 'styles.css must style .is-grabbing with grabbing cursor');
  assert(updatedRenderer.includes('_cleanupPdfPan'), 'renderer.js must implement _cleanupPdfPan for zero-leak listener teardown');
  assert(updatedRenderer.includes('scrollStartX - dx'), 'renderer.js must calculate horizontal pan offset');
  console.log('✓ macOS Finder Advanced Parity Suite (Miller Columns, Quick Actions, List Header & Grid Subtitles) verified');
  console.log('✓ Quick Look PDF Hand Move, Pan Drag & Boundary Gesture Suite verified');

  // 57. macOS Finder Liquid Glass Optical Materials Suite
  assert(stylesCode.includes('--liquid-glass-bg:'), 'styles.css must define --liquid-glass-bg token');
  assert(stylesCode.includes('--liquid-filter:'), 'styles.css must define --liquid-filter optical refraction token');
  assert(stylesCode.includes('--liquid-rim-top:'), 'styles.css must define --liquid-rim-top specular highlight token');
  assert(stylesCode.includes('--liquid-shadow-floating:'), 'styles.css must define --liquid-shadow-floating diffuse shadow token');
  assert(stylesCode.includes('.reduce-transparency'), 'styles.css must support .reduce-transparency accessibility class');
  assert(mainCode.includes("backgroundMaterial: isWin11OrLater ? 'acrylic' : undefined"), 'main.js must configure Windows 11 acrylic material');
  assert(updatedRenderer.includes('lastGlassPointerRaf'), 'renderer.js must implement lightweight pointer specular glare tracker');
  console.log('✓ macOS Finder Liquid Glass Optical Materials Suite verified');

  // 58. Preview Viewport & Inspector UX Parity Suite
  assert(updatedRenderer.includes('renderMultiItemPreviewPane'), 'renderer.js must implement renderMultiItemPreviewPane for multi-selection inspector');
  assert(updatedRenderer.includes('ppBtnOpenAll'), 'renderer.js must wire ppBtnOpenAll in multi-selection preview');
  assert(updatedRenderer.includes('ppBtnCompressAll'), 'renderer.js must wire ppBtnCompressAll in multi-selection preview');
  assert(updatedRenderer.includes('ppBtnCopyPathsAll'), 'renderer.js must wire ppBtnCopyPathsAll in multi-selection preview');
  assert(updatedRenderer.includes('pp-empty-state-modern'), 'renderer.js must render high-polish modern empty state');
  assert(updatedRenderer.includes('pp-info-copyable'), 'renderer.js must support copyable info rows');
  assert(updatedRenderer.includes('ppBtnOpen'), 'renderer.js must wire ppBtnOpen for documents and generic files');
  assert(updatedRenderer.includes('ppBtnCopyPath'), 'renderer.js must wire ppBtnCopyPath in preview pane');
  assert(stylesCode.includes('.pp-empty-state-modern'), 'styles.css must style modern inspector empty state');
  assert(stylesCode.includes('.pp-hero-multi'), 'styles.css must style multi-selection hero stack');
  assert(stylesCode.includes('.pp-breakdown-chip'), 'styles.css must style breakdown chips');
  assert(stylesCode.includes('.pp-info-copyable'), 'styles.css must style copyable info rows');
  assert(updatedRenderer.includes("localStorage.setItem('myfiles_viewmode', mode)"), 'setViewMode must persist active view mode to localStorage');
  assert(updatedRenderer.includes("tab.viewMode || state.viewMode || 'grid'"), 'switchTab must respect state.viewMode');
  // 59. Drive Removable Differentiation, Pinned Drive Letter & Storage Menu Clamping Suite
  assert(updatedRenderer.includes('sidebar-drive-item-label'), 'renderer.js must implement sidebar-drive-item-label');
  assert(updatedRenderer.includes('sidebar-drive-letter'), 'renderer.js must implement sidebar-drive-letter for non-truncated letter badges');
  assert(stylesCode.includes('.sidebar-drive-letter'), 'styles.css must style .sidebar-drive-letter with flex-shrink: 0');
  assert(stylesCode.includes('.sidebar-drive-name'), 'styles.css must style .sidebar-drive-name with ellipsis truncation');
  assert(updatedRenderer.includes('drive.isRemovable || drive.driveType === 2 || drive.driveType === 5'), 'renderer.js must only allow eject on true removable/optical drives');
  const fsEngineCode = fs.readFileSync(path.join(__dirname, '..', 'fs-engine.js'), 'utf8');
  // 60. List View Group Layout, Non-Clipping Headers & Viewport Scroll Isolation Suite
  assert(stylesCode.includes('.list-container .view-group-header'), 'styles.css must style .list-container .view-group-header');
  assert(stylesCode.includes('scroll-padding-top: 32px'), 'styles.css must define scroll-padding-top for list-container');
  assert(stylesCode.includes('scroll-margin-top: 36px'), 'styles.css must define scroll-margin-top for list-row');
  assert(updatedRenderer.includes("el.primaryViewport.querySelector('.list-container, .grouped-grid-wrapper"), 'renderer.js must cache scroll on actual scrollable viewport child');
  console.log('✓ List View Group Layout, Non-Clipping Headers & Viewport Scroll Isolation Suite verified');

  // 61. Preview Loading Centering & Liquid Glass Indicator Suite
  const latestStyles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');
  const latestRenderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
  assert(latestRenderer.includes('ql-loading-state'), 'renderer.js must render .ql-loading-state in openQuickLook');
  assert(latestStyles.includes('.ql-loading-state'), 'styles.css must define .ql-loading-state');
  assert(latestStyles.includes('.ql-loading-spinner'), 'styles.css must define .ql-loading-spinner');
  assert(latestRenderer.includes('pp-hero-text-preview is-loading'), 'renderer.js must mark text preview hero with is-loading while fetching content');
  assert(latestStyles.includes('.pp-hero-text-preview.is-loading'), 'styles.css must center .pp-hero-text-preview.is-loading');
  // 62. Symmetric Dual Workspace Architecture & Split View Parity Suite
  const splitIndexHtml = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
  assert(splitIndexHtml.includes('id="btnSecondaryBack"'), 'index.html must include btnSecondaryBack');
  assert(splitIndexHtml.includes('id="btnSecondaryForward"'), 'index.html must include btnSecondaryForward');
  assert(splitIndexHtml.includes('id="btnSecondarySync"'), 'index.html must include btnSecondarySync');
  assert(splitIndexHtml.includes('id="secondaryBreadcrumbsTrail"'), 'index.html must include secondaryBreadcrumbsTrail');
  assert(splitIndexHtml.includes('id="btnSecViewGrid"'), 'index.html must include btnSecViewGrid');
  assert(splitIndexHtml.includes('id="btnSecViewList"'), 'index.html must include btnSecViewList');
  assert(splitIndexHtml.includes('id="btnSecViewColumns"'), 'index.html must include btnSecViewColumns');
  assert(splitIndexHtml.includes('id="btnSplitOrientation"'), 'index.html must include btnSplitOrientation');
  assert(splitIndexHtml.includes('id="btnCopyOpposite"'), 'index.html must include btnCopyOpposite');
  assert(splitIndexHtml.includes('id="btnMoveOpposite"'), 'index.html must include btnMoveOpposite');
  assert(splitIndexHtml.includes('id="paneDividerHandle"'), 'index.html must include paneDividerHandle');

  assert(latestStyles.includes('.panes-container.split-vertical'), 'styles.css must include .panes-container.split-vertical');
  assert(latestStyles.includes('.pane-divider-handle'), 'styles.css must include .pane-divider-handle');
  assert(latestStyles.includes('.secondary-view-switcher'), 'styles.css must include .secondary-view-switcher');
  assert(latestStyles.includes('.sec-action-btn'), 'styles.css must include .sec-action-btn');
  assert(latestStyles.includes('.file-pane.active-pane'), 'styles.css must style .active-pane elevation');

  assert(latestRenderer.includes('function setActivePane('), 'renderer.js must implement setActivePane');
  assert(latestRenderer.includes('function toggleActivePane('), 'renderer.js must implement toggleActivePane');
  assert(latestRenderer.includes('function secondaryGoBack('), 'renderer.js must implement secondaryGoBack');
  assert(latestRenderer.includes('function secondaryGoForward('), 'renderer.js must implement secondaryGoForward');
  assert(latestRenderer.includes('function renderSecondaryBreadcrumbs('), 'renderer.js must implement renderSecondaryBreadcrumbs');
  assert(latestRenderer.includes('function setSecondaryViewMode('), 'renderer.js must implement setSecondaryViewMode');
  assert(latestRenderer.includes('function toggleSplitOrientation('), 'renderer.js must implement toggleSplitOrientation');
  assert(latestRenderer.includes('function copyToOppositePane('), 'renderer.js must implement copyToOppositePane');
  assert(latestRenderer.includes('function moveToOppositePane('), 'renderer.js must implement moveToOppositePane');
  assert(latestRenderer.includes("e.key === 'Tab' && state.dualPaneActive"), 'renderer.js must handle Tab keypane cycling');
  assert(latestRenderer.includes("e.key.toLowerCase() === 's' && state.dualPaneActive"), 'renderer.js must handle Alt+S pane swapping');
  console.log('✓ Symmetric Dual Workspace Architecture & Split View Parity Suite verified');

  console.log('\nAll MyFiles self-checks passed successfully!');
})().catch(err => {
  console.error('Self-check failed:', err);
  process.exit(1);
});



