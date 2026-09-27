const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('myFilesAPI', {
  getPathForFile: (file) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function') {
        return webUtils.getPathForFile(file);
      }
    } catch {}
    return (file && file.path) ? file.path : '';
  },
  // Drives & Special Folders
  getDrives: () => ipcRenderer.invoke('get-drives'),
  getSpecialFolders: () => ipcRenderer.invoke('get-special-folders'),
  
  // Directory & File Operations
  readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
  getFileDetails: (filePath) => ipcRenderer.invoke('get-file-details', filePath),
  readFileContent: (filePath, options) => ipcRenderer.invoke('read-file-content', filePath, options),
  
  createFolder: (parentDir, name) => ipcRenderer.invoke('create-folder', parentDir, name),
  createFile: (parentDir, name, content) => ipcRenderer.invoke('create-file', parentDir, name, content),
  renameItem: (oldPath, newName) => ipcRenderer.invoke('rename-item', oldPath, newName),
  batchRename: (renames) => ipcRenderer.invoke('batch-rename', renames),
  calculateChecksum: (filePath, algorithm) => ipcRenderer.invoke('calculate-checksum', filePath, algorithm),
  deleteItem: (itemPath) => ipcRenderer.invoke('delete-item', itemPath),
  copyItems: (srcPaths, targetDir) => ipcRenderer.invoke('copy-items', srcPaths, targetDir),
  moveItems: (srcPaths, targetDir) => ipcRenderer.invoke('move-items', srcPaths, targetDir),
  
  // System Integrations
  openItem: (filePath) => ipcRenderer.invoke('open-item', filePath),
  showInExplorer: (filePath) => ipcRenderer.invoke('show-in-explorer', filePath),
  openTerminal: (dirPath, terminalChoice) => ipcRenderer.invoke('open-terminal', dirPath, terminalChoice),
  startDrag: (filePath) => ipcRenderer.send('start-drag', filePath),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getLocalIp: () => ipcRenderer.invoke('get-local-ip'),
  openNativeShare: (filePath) => ipcRenderer.invoke('open-native-share', filePath),
  getInstalledShareApps: (forceRefresh) => ipcRenderer.invoke('get-installed-share-apps', forceRefresh),
  launchShareApp: (appKey, targetPath) => ipcRenderer.invoke('launch-share-app', appKey, targetPath),
  
  // Fast Search
  searchFiles: (searchParams) => ipcRenderer.invoke('search-files', searchParams),
  cancelSearch: (searchId) => ipcRenderer.invoke('cancel-search', searchId),
  onSearchProgress: (callback) => {
    const sub = (_event, data) => callback(data);
    ipcRenderer.on('search-progress', sub);
    return () => ipcRenderer.removeListener('search-progress', sub);
  },
  
  // Colored Tags Persistence
  getTags: () => ipcRenderer.invoke('get-tags'),
  setTag: (filePath, tag) => ipcRenderer.invoke('set-tag', filePath, tag),
  removeTag: (filePath) => ipcRenderer.invoke('remove-tag', filePath),
  
  // Sidebar Pins Persistence
  getPins: () => ipcRenderer.invoke('get-pins'),
  savePins: (pins) => ipcRenderer.invoke('save-pins', pins),

  // Archive Operations
  archiveInspect: (filePath) => ipcRenderer.invoke('archive-inspect', filePath),
  archiveExtract: (filePath, destDir) => ipcRenderer.invoke('archive-extract', filePath, destDir),
  archiveCompress: (sources, destPath, format) => ipcRenderer.invoke('archive-compress', sources, destPath, format),

  // VLC Media Player Operations
  getVlcStatus: () => ipcRenderer.invoke('vlc-status'),
  playInVlc: (filePath, options) => ipcRenderer.invoke('vlc-play', filePath, options),

  // Deduplication Operations
  findDuplicates: (targetDir, options) => ipcRenderer.invoke('find-duplicates', targetDir, options),
  deleteDuplicates: (filePaths) => ipcRenderer.invoke('delete-duplicates', filePaths),

  // Drive & Storage Operations
  ejectDrive: (drive) => ipcRenderer.invoke('eject-drive', drive),
  storageAnalyze: (options) => ipcRenderer.invoke('storage-analyze', options),
  storageCleanTemp: () => ipcRenderer.invoke('storage-clean-temp'),
  storageEmptyRecycle: (drive) => ipcRenderer.invoke('storage-empty-recycle', drive),
  openRecycleBin: () => ipcRenderer.invoke('open-recycle-bin'),
  getRecycleStats: () => ipcRenderer.invoke('get-recycle-stats'),
  restoreRecycleItem: (path) => ipcRenderer.invoke('restore-recycle-item', path),
  restoreAllRecycle: () => ipcRenderer.invoke('restore-all-recycle'),
  deletePermanently: (path) => ipcRenderer.invoke('delete-permanently', path),
  launchWindowsTool: (tool, drive) => ipcRenderer.invoke('launch-windows-tool', tool, drive),

  // Window Controls
  windowControl: (action) => ipcRenderer.invoke('window-control', action),
  onWindowStateChange: (callback) => {
    const sub = (_event, state) => callback(state);
    ipcRenderer.on('window-state', sub);
    return () => ipcRenderer.removeListener('window-state', sub);
  },

  // Initial Launch Path & Dynamic Tabs (Shell Verb Integration)
  getInitialPath: () => ipcRenderer.invoke('get-initial-path'),
  onOpenDirectoryTab: (callback) => {
    const sub = (_event, targetPath) => callback(targetPath);
    ipcRenderer.on('open-directory-tab', sub);
    return () => ipcRenderer.removeListener('open-directory-tab', sub);
  },

  // Shell Verb / Default File Manager Integration
  makeDefaultFileManager: () => ipcRenderer.invoke('make-default'),
  restoreDefaultFileManager: () => ipcRenderer.invoke('restore-default')
});
