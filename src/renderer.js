// MyFiles Desktop File Manager Renderer
// Implements Miller Columns, Quick Look (Spacebar), Colored Tags, Tabs, Dual-Pane & Fast Search

(function () {
  'use strict';

  // Universal API Bridge (Electron IPC or Desktop App Server)
  const SERVER_ORIGIN = (function () {
    if (typeof window !== 'undefined') {
      if (window.location.protocol === 'file:' || !window.location.port) {
        return 'http://127.0.0.1:5241';
      }
    }
    return '';
  })();

  const api = window.myFilesAPI || {
    getDrives: () => fetch(`${SERVER_ORIGIN}/api/drives`).then(r => r.json()),
    readDir: (p) => fetch(`${SERVER_ORIGIN}/api/readdir?path=` + encodeURIComponent(p)).then(r => r.json()),
    readFileContent: (p) => fetch(`${SERVER_ORIGIN}/api/file-content?path=` + encodeURIComponent(p)).then(r => r.json()),
    createFolder: (parentDir, name) => fetch(`${SERVER_ORIGIN}/api/create-folder`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentDir, name }) }).then(r => r.json()),
    createFile: (parentDir, name, content, encoding) => fetch(`${SERVER_ORIGIN}/api/create-file`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentDir, name, content, encoding }) }).then(r => r.json()),
    renameItem: (oldPath, newName) => fetch(`${SERVER_ORIGIN}/api/rename`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPath, newName }) }).then(r => r.json()),
    deleteItem: (p) => fetch(`${SERVER_ORIGIN}/api/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: p }) }).then(r => r.json()),
    copyItems: (sources, destDir) => fetch(`${SERVER_ORIGIN}/api/copy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sources, destDir }) }).then(r => r.json()),
    moveItems: (sources, destDir) => fetch(`${SERVER_ORIGIN}/api/move`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sources, destDir }) }).then(r => r.json()),
    openItem: (p) => fetch(`${SERVER_ORIGIN}/api/open`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: p }) }).then(r => r.json()),
    showInExplorer: (p) => fetch(`${SERVER_ORIGIN}/api/reveal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: p }) }).then(r => r.json()),
    openTerminal: (p, terminal) => (window.myFilesAPI && window.myFilesAPI.openTerminal ? window.myFilesAPI.openTerminal(p, terminal) : fetch(`${SERVER_ORIGIN}/api/terminal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: p, terminal }) }).then(r => r.json())),
    searchFiles: (params) => fetch(`${SERVER_ORIGIN}/api/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) }).then(r => r.json()),
    getTags: () => fetch(`${SERVER_ORIGIN}/api/tags`).then(r => r.json()),
    setTag: (p, tag) => fetch(`${SERVER_ORIGIN}/api/tags`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', path: p, tag }) }).then(r => r.json()),
    removeTag: (p) => fetch(`${SERVER_ORIGIN}/api/tags`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove', path: p }) }).then(r => r.json()),
    getPins: () => fetch(`${SERVER_ORIGIN}/api/pins`).then(r => r.json()),
    savePins: (pins) => fetch(`${SERVER_ORIGIN}/api/pins`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pins }) }).then(r => r.json()),
    archiveInspect: (p) => fetch(`${SERVER_ORIGIN}/api/archive/inspect?path=` + encodeURIComponent(p)).then(r => r.json()),
    archiveExtract: (p, destDir) => fetch(`${SERVER_ORIGIN}/api/archive/extract`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: p, destDir }) }).then(r => r.json()),
    archiveCompress: (sources, targetPath, format) => fetch(`${SERVER_ORIGIN}/api/archive/compress`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sources, targetPath, format }) }).then(r => r.json()),
    getVlcStatus: () => fetch(`${SERVER_ORIGIN}/api/vlc-status`).then(r => r.json()),
    playInVlc: (filePath, options = {}) => fetch(`${SERVER_ORIGIN}/api/vlc-play`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filePath, ...options }) }).then(r => r.json()),
    calculateChecksum: (filePath, algorithm = 'sha256') => fetch(`${SERVER_ORIGIN}/api/checksum`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filePath, algorithm }) }).then(r => r.json()),
    batchRename: (renames) => fetch(`${SERVER_ORIGIN}/api/batch-rename`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ renames }) }).then(r => r.json()),
    getSpecialFolders: () => fetch(`${SERVER_ORIGIN}/api/special-folders`).then(r => r.json()),
    findDuplicates: (options) => {
      return fetch(`${SERVER_ORIGIN}/api/find-duplicates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(options) }).then(r => r.json());
    },
    deleteDuplicates: (filePaths) => {
      return fetch(`${SERVER_ORIGIN}/api/delete-duplicates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filePaths }) }).then(r => r.json());
    },
    ejectDrive: (drive) => {
      if (window.myFilesAPI && window.myFilesAPI.ejectDrive) return window.myFilesAPI.ejectDrive(drive);
      return fetch(`${SERVER_ORIGIN}/api/eject-drive`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ drive }) }).then(r => r.json());
    },
    storageAnalyze: (options) => {
      if (window.myFilesAPI && window.myFilesAPI.storageAnalyze) return window.myFilesAPI.storageAnalyze(options);
      return fetch(`${SERVER_ORIGIN}/api/storage/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(options || {}) }).then(r => r.json());
    },
    storageCleanTemp: () => {
      if (window.myFilesAPI && window.myFilesAPI.storageCleanTemp) return window.myFilesAPI.storageCleanTemp();
      return fetch(`${SERVER_ORIGIN}/api/storage/clean-temp`, { method: 'POST' }).then(r => r.json());
    },
    storageEmptyRecycle: (drive) => {
      if (window.myFilesAPI && window.myFilesAPI.storageEmptyRecycle) return window.myFilesAPI.storageEmptyRecycle(drive);
      return fetch(`${SERVER_ORIGIN}/api/storage/empty-recycle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ drive }) }).then(r => r.json());
    },
    openRecycleBin: () => {
      if (window.myFilesAPI && window.myFilesAPI.openRecycleBin) return window.myFilesAPI.openRecycleBin();
      return fetch(`${SERVER_ORIGIN}/api/recycle-bin/open`, { method: 'POST' }).then(r => r.json());
    },
    getRecycleStats: () => {
      if (window.myFilesAPI && window.myFilesAPI.getRecycleStats) return window.myFilesAPI.getRecycleStats();
      return fetch(`${SERVER_ORIGIN}/api/recycle-bin/stats`).then(r => r.json());
    },
    emptyRecycleBin: (drive) => {
      if (window.myFilesAPI && window.myFilesAPI.emptyRecycleBin) return window.myFilesAPI.emptyRecycleBin(drive);
      if (window.myFilesAPI && window.myFilesAPI.storageEmptyRecycle) return window.myFilesAPI.storageEmptyRecycle(drive);
      return fetch(`${SERVER_ORIGIN}/api/storage/empty-recycle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ drive }) }).then(r => r.json());
    },
    restoreRecycleItem: (p) => {
      if (window.myFilesAPI && window.myFilesAPI.restoreRecycleItem) return window.myFilesAPI.restoreRecycleItem(p);
      return fetch(`${SERVER_ORIGIN}/api/recycle-bin/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: p }) }).then(r => r.json());
    },
    restoreAllRecycle: () => {
      if (window.myFilesAPI && window.myFilesAPI.restoreAllRecycle) return window.myFilesAPI.restoreAllRecycle();
      return fetch(`${SERVER_ORIGIN}/api/recycle-bin/restore-all`, { method: 'POST' }).then(r => r.json());
    },
    deletePermanently: (p) => {
      if (window.myFilesAPI && window.myFilesAPI.deletePermanently) return window.myFilesAPI.deletePermanently(p);
      return fetch(`${SERVER_ORIGIN}/api/recycle-bin/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: p }) }).then(r => r.json());
    },
    launchWindowsTool: (tool, drive) => {
      if (window.myFilesAPI && window.myFilesAPI.launchWindowsTool) return window.myFilesAPI.launchWindowsTool(tool, drive);
      return fetch(`${SERVER_ORIGIN}/api/launch-windows-tool`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool, drive }) }).then(r => r.json());
    },
    getFileDetails: (p) => fetch(`${SERVER_ORIGIN}/api/file-details?path=` + encodeURIComponent(p)).then(r => r.json()),
    setAttributes: (path, attrs) => fetch(`${SERVER_ORIGIN}/api/set-attributes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, ...attrs }) }).then(r => r.json()),
    makeDefaultFileManager: () => (window.myFilesAPI && window.myFilesAPI.makeDefaultFileManager ? window.myFilesAPI.makeDefaultFileManager() : fetch(`${SERVER_ORIGIN}/api/make-default`, { method: 'POST' }).then(r => r.json())),
    restoreDefaultFileManager: () => (window.myFilesAPI && window.myFilesAPI.restoreDefaultFileManager ? window.myFilesAPI.restoreDefaultFileManager() : fetch(`${SERVER_ORIGIN}/api/restore-default`, { method: 'POST' }).then(r => r.json())),
    isDefaultFileManager: () => (window.myFilesAPI && window.myFilesAPI.isDefaultFileManager ? window.myFilesAPI.isDefaultFileManager() : fetch(`${SERVER_ORIGIN}/api/is-default`).then(r => r.json())),
    openExternal: (url) => (window.myFilesAPI && window.myFilesAPI.openExternal ? window.myFilesAPI.openExternal(url) : window.open(url, '_blank')),
    getLocalIp: () => (window.myFilesAPI && window.myFilesAPI.getLocalIp ? window.myFilesAPI.getLocalIp() : fetch(`${SERVER_ORIGIN}/api/local-ip`).then(r => r.json()).then(d => d.ip || '127.0.0.1')),
    openNativeShare: (p) => (window.myFilesAPI && window.myFilesAPI.openNativeShare ? window.myFilesAPI.openNativeShare(p) : null),
    getInstalledShareApps: (force) => (window.myFilesAPI && window.myFilesAPI.getInstalledShareApps ? window.myFilesAPI.getInstalledShareApps(force) : fetch(`${SERVER_ORIGIN}/api/installed-share-apps${force ? '?force=1' : ''}`).then(r => r.json()).catch(() => ({}))),
    launchShareApp: (appKey, p) => (window.myFilesAPI && window.myFilesAPI.launchShareApp ? window.myFilesAPI.launchShareApp(appKey, p) : fetch(`${SERVER_ORIGIN}/api/launch-share-app`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appKey, targetPath: p }) }).then(r => r.json()).catch(() => ({}))),
    openNewWindow: (p) => {
      if (window.myFilesAPI && window.myFilesAPI.openNewWindow) return window.myFilesAPI.openNewWindow(p);
      const url = p ? `/?path=${encodeURIComponent(p)}` : '/';
      window.open(url, '_blank');
      return Promise.resolve({ success: true });
    },
    windowControl: (action) => {
      if (action === 'close') window.close();
    },
    checkForUpdates: () => (window.myFilesAPI && window.myFilesAPI.checkForUpdates ? window.myFilesAPI.checkForUpdates() : Promise.resolve({ status: 'dev-mode', message: 'Updates unavailable in web server mode' })),
    quitAndInstallUpdate: () => (window.myFilesAPI && window.myFilesAPI.quitAndInstallUpdate ? window.myFilesAPI.quitAndInstallUpdate() : Promise.resolve({ success: false })),
    onUpdateStatus: (cb) => (window.myFilesAPI && window.myFilesAPI.onUpdateStatus ? window.myFilesAPI.onUpdateStatus(cb) : () => {})
  };

  // State Management
  const state = {
    tabs: [],
    activeTabId: null,
    dualPaneActive: false,
    activePane: 'primary', // 'primary' | 'secondary'
    secondaryPath: null,
    secondaryItems: [],
    secondarySelected: null,
    
    // VLC Media Integration State
    vlcInstalled: false,
    vlcPath: null,

    // Default File Manager State
    isDefaultFileManager: false,

    // Primary Pane State
    currentPath: 'C:\\',
    specialFolders: [],
    homePath: '',
    rawItems: [],
    items: [],
    showHidden: false,
    filterQuery: '',
    selectedIndices: new Set(),
    activeItem: null,
    history: [],
    historyIndex: -1,
    viewMode: (function() {
      try { return localStorage.getItem('myfiles_viewmode') || 'grid'; } catch(e) { return 'grid'; }
    })(), // 'grid' | 'list' | 'columns' | 'gallery'
    previewPaneOpen: false,
    inspectorExpanded: false,
    activeItemRotation: 0,
    sortField: 'name',
    sortAsc: true,
    groupBy: (function() {
      try { return localStorage.getItem('myfiles_group_by') || 'none'; } catch(e) { return 'none'; }
    })(), // 'none' | 'kind' | 'date' | 'size' | 'name'
    collapsedGroups: new Set(),
    itemCheckboxes: (function() {
      try { return localStorage.getItem('myfiles_checkboxes') === 'true'; } catch(e) { return false; }
    })(),
    viewOptionsOpen: false,
    folderViewPreferences: (function() {
      try { return JSON.parse(localStorage.getItem('myfiles_folder_views') || '{}'); } catch(e) { return {}; }
    })(),
    viewDefaults: (function() {
      try {
        return JSON.parse(localStorage.getItem('myfiles_view_defaults') || '{"viewMode":"grid","sortBy":"name","thumbSize":"medium","previewCol":true,"iconPreview":true,"showFilename":true}');
      } catch(e) {
        return { viewMode: 'grid', sortBy: 'name', thumbSize: 'medium', previewCol: true, iconPreview: true, showFilename: true };
      }
    })(),
    thumbSize: (function() {
      try { return localStorage.getItem('myfiles_thumbsize') || 'medium'; } catch(e) { return 'medium'; }
    })(),
    currentGear: (function() {
      try {
        const saved = localStorage.getItem('myfiles_grid_gear');
        if (saved) return parseInt(saved, 10);
        const ts = localStorage.getItem('myfiles_thumbsize');
        const map = { small: 1, medium: 2, large: 3, xlarge: 4 };
        return (ts && map[ts]) ? map[ts] : 2;
      } catch(e) { return 2; }
    })(),
    iconPreview: true,
    showThumbFilename: true,
    undoStack: [],
    redoStack: [],
    expandedFolders: new Map(), // path -> Array<item> for tree hierarchy in List View
    historyScrollMap: new Map(), // path -> { scrollTop, scrollLeft, activePath }
    lastExitedFolder: null, // path of child folder exited via Back or Up

    // Deduplication State
    dedupModalOpen: false,
    dedupTargetDir: '',
    dedupGroups: [],
    dedupSelectedFiles: new Set(),

    // Storage Management State
    storageModalOpen: false,
    storageCurrentDrive: 'C:\\',
    storageAnalysisData: null,
    storageActiveTab: 'largest',

    // Miller Columns State
    // columns: [{ path, items: [], selectedItem: null }]
    millerColumns: [],
    activeColumnIndex: -1,

    // Tags & Pins
    tags: {}, // path -> 'red' | 'blue' etc.
    pins: [],
    drives: [],

    // Quick Look State
    quickLookOpen: false,
    quickLookFile: null,
    quickLookFlipH: false,
    quickLookInfoOpen: false,

    // Search State
    isSearching: false,
    searchQuery: '',
    searchType: 'name', // 'name' | 'content'
    searchResults: [],
    searchId: 0,

    // Clipboard for File Operations
    clipboard: {
      action: null, // 'copy' | 'cut'
      paths: []
    },

    // Context Menu State
    contextTarget: null,

    // Appearance Theme ('light' | 'dark' | 'system')
    theme: 'system',
    accentColor: (function() {
      try { return localStorage.getItem('myfiles_accent') || 'blue'; } catch(e) { return 'blue'; }
    })(),
    compactMode: (function() {
      try { return localStorage.getItem('myfiles_compact_mode') === 'true'; } catch(e) { return false; }
    })(),
    startupFolder: (function() {
      try { return localStorage.getItem('myfiles_startup_folder') || 'firstDrive'; } catch(e) { return 'firstDrive'; }
    })(),
    startupFolderPath: (function() {
      try { return localStorage.getItem('myfiles_startup_custom') || ''; } catch(e) { return ''; }
    })(),
    openAction: (function() {
      try { return localStorage.getItem('myfiles_open_action') || 'double'; } catch(e) { return 'double'; }
    })(),
    confirmDelete: (function() {
      try { return localStorage.getItem('myfiles_confirm_delete') !== 'false'; } catch(e) { return true; }
    })(),
    searchScope: (function() {
      try { return localStorage.getItem('myfiles_search_scope') || 'current'; } catch(e) { return 'current'; }
    })(),
    showFileExtensions: (function() {
      try { return localStorage.getItem('myfiles_show_extensions') !== 'false'; } catch(e) { return true; }
    })(),
    enableQuickLook: (function() {
      try { return localStorage.getItem('myfiles_enable_ql') !== 'false'; } catch(e) { return true; }
    })(),
    qlAutoplay: (function() {
      try { return localStorage.getItem('myfiles_ql_autoplay') !== 'false'; } catch(e) { return true; }
    })(),
    qlLoop: (function() {
      try { return localStorage.getItem('myfiles_ql_loop') === 'true'; } catch(e) { return false; }
    })(),
    useVlcMedia: (function() {
      try { return localStorage.getItem('myfiles_use_vlc') !== 'false'; } catch(e) { return true; }
    })(),
    terminalChoice: (function() {
      try { return localStorage.getItem('myfiles_terminal') || 'wt'; } catch(e) { return 'wt'; }
    })(),
    checksumAlgorithm: (function() {
      try { return localStorage.getItem('myfiles_checksum_algo') || 'sha256'; } catch(e) { return 'sha256'; }
    })(),
    autoRefreshOnFocus: (function() {
      try { return localStorage.getItem('myfiles_auto_refresh') !== 'false'; } catch(e) { return true; }
    })(),
    dateFormat: (function() {
      try { return localStorage.getItem('myfiles_date_format') || 'relative'; } catch(e) { return 'relative'; }
    })(),
    colShowDate: (function() {
      try { return localStorage.getItem('myfiles_col_date') !== 'false'; } catch(e) { return true; }
    })(),
    colShowType: (function() {
      try { return localStorage.getItem('myfiles_col_type') !== 'false'; } catch(e) { return true; }
    })(),
    colShowSize: (function() {
      try { return localStorage.getItem('myfiles_col_size') !== 'false'; } catch(e) { return true; }
    })(),
    colShowTag: (function() {
      try { return localStorage.getItem('myfiles_col_tag') !== 'false'; } catch(e) { return true; }
    })(),
    sidebarShowRecents: (function() {
      try { return localStorage.getItem('myfiles_sb_recents') !== 'false'; } catch(e) { return true; }
    })(),
    sidebarShowFavorites: (function() {
      try { return localStorage.getItem('myfiles_sb_favorites') !== 'false'; } catch(e) { return true; }
    })(),
    sidebarShowDrives: (function() {
      try { return localStorage.getItem('myfiles_sb_drives') !== 'false'; } catch(e) { return true; }
    })(),
    sidebarShowTags: (function() {
      try { return localStorage.getItem('myfiles_sb_tags') !== 'false'; } catch(e) { return true; }
    })(),
    visibleTags: (function() {
      try {
        const v = localStorage.getItem('myfiles_visible_tags');
        return v ? JSON.parse(v) : ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'];
      } catch(e) {
        return ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'];
      }
    })(),
    defaultArchiveFormat: (function() {
      try { return localStorage.getItem('myfiles_archive_format') || 'zip'; } catch(e) { return 'zip'; }
    })(),
    defaultArchiveLevel: (function() {
      try { return localStorage.getItem('myfiles_archive_level') || 'normal'; } catch(e) { return 'normal'; }
    })(),
    autoOpenExtracted: (function() {
      try { return localStorage.getItem('myfiles_auto_open_extracted') !== 'false'; } catch(e) { return true; }
    })(),
    dedupScanMode: (function() {
      try { return localStorage.getItem('myfiles_dedup_mode') || 'sha256'; } catch(e) { return 'sha256'; }
    })(),
    dedupMinSize: (function() {
      try { return Number(localStorage.getItem('myfiles_dedup_minsize') || 0); } catch(e) { return 0; }
    })()
  };

  // Helper formatting
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDate(isoString) {
    if (!isoString) return '--';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDateFinder(isoString) {
    if (!isoString) return '--';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--';
    
    if (state.dateFormat === 'iso') {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    if (state.dateFormat === 'locale') {
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

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

  function getFolderSvg(name = '', tag = '') {
    const lower = name.toLowerCase();
    let badge = '';
    if (lower === 'windows') {
      badge = `<g fill="#ffffff" opacity="0.92"><path d="M14 16.2l3.8-.5v3.6H14zm4.5-.6l4.5-.6v4.2h-4.5zm-4.5 4.1h3.8v3.6l-3.8-.5zm4.5 0h4.5v4.2l-4.5-.6z"/></g>`;
    } else if (lower.includes('program') || lower.includes('app')) {
      badge = `<g fill="#ffffff" opacity="0.92"><rect x="14.5" y="15" width="3.5" height="3.5" rx="0.8"/><rect x="20" y="15" width="3.5" height="3.5" rx="0.8"/><rect x="14.5" y="20.5" width="3.5" height="3.5" rx="0.8"/><rect x="20" y="20.5" width="3.5" height="3.5" rx="0.8"/></g>`;
    } else if (lower === 'users' || lower === 'home') {
      badge = `<g stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.92"><path d="M14.5 24.5v-4.5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v4.5"/><path d="M13 19.5l6-4.5 6 4.5"/></g>`;
    } else if (lower === 'downloads') {
      badge = `<g stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.92"><path d="M19 14.5v6.5m-3-3l3 3 3-3"/><path d="M14.5 24h9"/></g>`;
    } else if (lower === 'documents') {
      badge = `<g stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.92"><path d="M15 15h8M15 18h6M15 21h7M15 24h5"/></g>`;
    } else if (lower === 'desktop') {
      badge = `<g opacity="0.92"><rect x="14" y="14.5" width="10" height="7" rx="1.2" stroke="#ffffff" stroke-width="1.5" fill="none"/><line x1="16.5" y1="24.5" x2="21.5" y2="24.5" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/><line x1="19" y1="21.5" x2="19" y2="24.5" stroke="#ffffff" stroke-width="1.5"/></g>`;
    } else if (lower.includes('picture') || lower.includes('photo')) {
      badge = `<g opacity="0.92"><circle cx="16.5" cy="17" r="1.3" fill="#ffffff"/><path d="M14 24l3.5-4 2.5 3 2-2 3 3" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>`;
    } else if (lower.includes('music') || lower.includes('audio') || lower.includes('song')) {
      badge = `<g fill="#ffffff" opacity="0.92"><circle cx="15.5" cy="23" r="2"/><circle cx="22.5" cy="21.5" r="2"/><path d="M17.5 23v-7.5l7-2V21.5" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" fill="none"/><polygon points="17.5 15.5 24.5 13.5 24.5 15.5 17.5 17.5"/></g>`;
    } else if (lower.includes('movie') || lower.includes('video')) {
      badge = `<g opacity="0.92"><rect x="14" y="15" width="10" height="8" rx="1.5" stroke="#ffffff" stroke-width="1.4" fill="none"/><polygon points="17.5 17 21.5 19 17.5 21" fill="#ffffff"/></g>`;
    } else if (lower.includes('code') || lower.includes('dev') || lower.includes('project') || lower.includes('git') || lower.includes('src')) {
      badge = `<g stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.92"><path d="M16 17l-2.5 2.5 2.5 2.5m6-5l2.5 2.5-2.5 2.5"/></g>`;
    }

    // Calibrated Apple / macOS Color Variations
    let backStart = '#0284c7', backEnd = '#0369a1', frontStart = '#38bdf8', frontEnd = '#0284c7';
    if (tag === 'green') {
      backStart = '#15803d'; backEnd = '#14532d'; frontStart = '#4ade80'; frontEnd = '#16a34a';
    } else if (tag === 'red') {
      backStart = '#b91c1c'; backEnd = '#7f1d1d'; frontStart = '#f87171'; frontEnd = '#dc2626';
    } else if (tag === 'orange') {
      backStart = '#c2410c'; backEnd = '#7c2d12'; frontStart = '#fb923c'; frontEnd = '#ea580c';
    } else if (tag === 'yellow') {
      backStart = '#a16207'; backEnd = '#713f12'; frontStart = '#fde047'; frontEnd = '#ca8a04';
    } else if (tag === 'purple') {
      backStart = '#7e22ce'; backEnd = '#581c87'; frontStart = '#c084fc'; frontEnd = '#9333ea';
    } else if (tag === 'gray') {
      backStart = '#475569'; backEnd = '#1e293b'; frontStart = '#94a3b8'; frontEnd = '#475569';
    }

    const gradId = 'fGrad_' + Math.random().toString(36).substring(2, 7);

    return `
      <svg class="file-svg-icon folder-svg" viewBox="0 0 38 32" fill="none">
        <defs>
          <linearGradient id="${gradId}_b" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${backStart}"/>
            <stop offset="100%" stop-color="${backEnd}"/>
          </linearGradient>
          <linearGradient id="${gradId}_f" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${frontStart}"/>
            <stop offset="100%" stop-color="${frontEnd}"/>
          </linearGradient>
          <filter id="${gradId}_s" x="-15%" y="-15%" width="130%" height="135%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#000000" flood-opacity="0.22"/>
          </filter>
        </defs>
        <!-- Back plate with curved tab -->
        <path d="M 4 8 C 4 6.2 5.2 5 7 5 L 14 5 C 15.5 5 16.6 5.8 17.8 7.2 L 19 8.8 C 19.8 9.8 20.8 10.5 22 10.5 L 31.5 10.5 C 33.5 10.5 35 12 35 14 L 35 26 C 35 28.2 33.2 30 31 30 L 8 30 C 5.8 30 4 28.2 4 26 Z" fill="url(#${gradId}_b)"/>
        <!-- Paper sheet insert -->
        <rect x="7" y="7.5" width="24" height="13" rx="2" fill="#ffffff" fill-opacity="0.9"/>
        <line x1="10" y1="11" x2="20" y2="11" stroke="#cbd5e1" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="10" y1="14" x2="16" y2="14" stroke="#cbd5e1" stroke-width="1.2" stroke-linecap="round"/>
        <!-- Front Flap with depth shadow -->
        <path d="M 3.5 13.5 C 3.5 11.8 4.8 10.5 6.8 10.5 L 31.2 10.5 C 33.2 10.5 34.5 11.8 34.5 13.5 L 34.5 25.5 C 34.5 27.8 32.8 29.5 30.5 29.5 L 7.5 29.5 C 5.2 29.5 3.5 27.8 3.5 25.5 Z" fill="url(#${gradId}_f)" filter="url(#${gradId}_s)"/>
        <!-- Specular Highlight Top Edge -->
        <path d="M 6.8 11.2 L 31.2 11.2" stroke="rgba(255, 255, 255, 0.65)" stroke-width="0.85" stroke-linecap="round"/>
        ${badge}
      </svg>
    `;
  }

  function getZipSvg() {
    const gradId = 'zipG_' + Math.random().toString(36).substring(2, 7);
    return `
      <svg class="file-svg-icon" viewBox="0 0 32 38" fill="none">
        <defs>
          <linearGradient id="${gradId}_b" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--doc-card-bg, #1e293b)"/>
            <stop offset="100%" stop-color="var(--doc-card-bg, #0f172a)"/>
          </linearGradient>
        </defs>
        <!-- Base sheet with folded dog-ear -->
        <path d="M5 5a3 3 0 0 1 3-3h12.5l7 7v23a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5z" fill="url(#${gradId}_b)" stroke="var(--doc-card-stroke, #334155)" stroke-width="1.1"/>
        <path d="M20.5 2v5.5a1.5 1.5 0 0 0 1.5 1.5h5.5z" fill="currentColor" fill-opacity="0.16" stroke="var(--doc-card-stroke, #334155)" stroke-width="0.9"/>
        <!-- Zipper teeth track down center -->
        <line x1="16" y1="5" x2="16" y2="24" stroke="var(--doc-card-stroke, #475569)" stroke-width="2"/>
        <path d="M14.5 7h1.5 M16 9h1.5 M14.5 11h1.5 M16 13h1.5 M14.5 15h1.5 M16 17h1.5 M14.5 19h1.5 M16 21h1.5" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/>
        <!-- Zipper Pull Tab -->
        <rect x="13.5" y="14" width="5" height="7" rx="1.2" fill="#d97706" stroke="#fbbf24" stroke-width="0.8"/>
        <circle cx="16" cy="18" r="1" fill="#78350f"/>
        <!-- Amber ZIP badge -->
        <rect x="4.5" y="24" width="23" height="9.5" rx="2.5" fill="#f59e0b"/>
        <text x="16" y="31.2" fill="#ffffff" font-size="7" font-weight="700" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif" text-anchor="middle" letter-spacing="0.6">ZIP</text>
      </svg>
    `;
  }

  function getDocSvg(badgeText, color) {
    const gradId = 'docG_' + Math.random().toString(36).substring(2, 7);
    return `
      <svg class="file-svg-icon" viewBox="0 0 32 38" fill="none">
        <defs>
          <linearGradient id="${gradId}_b" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--doc-card-bg, #1e293b)"/>
            <stop offset="100%" stop-color="var(--doc-card-bg, #0f172a)"/>
          </linearGradient>
        </defs>
        <!-- Base sheet with folded dog-ear corner -->
        <path d="M5 5a3 3 0 0 1 3-3h12.5l7 7v23a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5z" fill="url(#${gradId}_b)" stroke="var(--doc-card-stroke, #334155)" stroke-width="1.1"/>
        <!-- Folded Corner Flap -->
        <path d="M20.5 2v5.5a1.5 1.5 0 0 0 1.5 1.5h5.5z" fill="currentColor" fill-opacity="0.16" stroke="var(--doc-card-stroke, #334155)" stroke-width="0.9"/>
        <!-- Content Preview Lines -->
        <line x1="9" y1="13" x2="17" y2="13" stroke="currentColor" stroke-opacity="0.22" stroke-width="1.4" stroke-linecap="round"/>
        <line x1="9" y1="17" x2="23" y2="17" stroke="currentColor" stroke-opacity="0.22" stroke-width="1.4" stroke-linecap="round"/>
        <line x1="9" y1="21" x2="19" y2="21" stroke="currentColor" stroke-opacity="0.22" stroke-width="1.4" stroke-linecap="round"/>
        <!-- Bottom Badge Banner -->
        <rect x="4.5" y="24" width="23" height="9.5" rx="2.5" fill="${color}"/>
        <text x="16" y="31.2" fill="#ffffff" font-size="7" font-weight="700" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif" text-anchor="middle" letter-spacing="0.6">${badgeText}</text>
      </svg>
    `;
  }

  // Expose getDocSvg on window for any inline SVG fallback
  window.getDocSvg = getDocSvg;

  // Global thumbnail fallback handler to prevent console crashes and show clean fallback icon
  window.handleThumbError = function (img) {
    if (!img) return;
    img.style.display = 'none';
    if (img.nextElementSibling) {
      img.nextElementSibling.style.display = 'flex';
    }
  };

  // Comprehensive list of supported image extensions
  const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.jfif', '.pjpeg', '.pjp', '.webp', '.avif', '.gif', '.bmp', '.svg', '.ico', '.cur', '.tif', '.tiff'];

  function isImageFile(item) {
    if (!item || item.isDirectory) return false;
    const ext = (item.extension || '').toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
  }

  const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi', '.m4v'];
  const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];
  const DOC_EXTENSIONS = ['.docx', '.docm', '.xlsx', '.xlsm', '.pptx', '.pptm', '.pdf', '.doc', '.rtf', '.xls', '.ppt'];
  const TEXT_EXTENSIONS = [
    '.txt', '.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.json', '.html', '.htm',
    '.css', '.scss', '.sass', '.less', '.md', '.markdown', '.py', '.rs', '.go', '.c',
    '.cpp', '.h', '.hpp', '.cs', '.java', '.kt', '.swift', '.php', '.rb', '.sh',
    '.bash', '.zsh', '.bat', '.cmd', '.ps1', '.yaml', '.yml', '.xml', '.svg', '.sql',
    '.log', '.env', '.ini', '.toml', '.conf', '.cfg', '.csv', '.tsv', '.diff', '.patch'
  ];

  function isVideoFile(item) {
    if (!item || item.isDirectory) return false;
    const ext = (item.extension || '').toLowerCase();
    return VIDEO_EXTENSIONS.includes(ext);
  }

  function isAudioFile(item) {
    if (!item || item.isDirectory) return false;
    const ext = (item.extension || '').toLowerCase();
    return AUDIO_EXTENSIONS.includes(ext);
  }

  function isDocFile(item) {
    if (!item || item.isDirectory) return false;
    const ext = (item.extension || '').toLowerCase();
    return DOC_EXTENSIONS.includes(ext);
  }

  function isTextFile(item) {
    if (!item || item.isDirectory) return false;
    const ext = (item.extension || '').toLowerCase();
    return TEXT_EXTENSIONS.includes(ext);
  }

  // Universal Media URL Resolver (Supports both Electron file:/// and Web Server mode)
  function getMediaUrl(filePath) {
    if (!filePath) return '';
    if (window.myFilesAPI && window.location.protocol === 'file:') {
      const norm = filePath.replace(/\\/g, '/');
      if (/^[a-zA-Z]:/.test(norm)) {
        const drive = norm.substring(0, 2);
        const rest = norm.substring(2);
        const encoded = rest.split('/').map(s => encodeURIComponent(s)).join('/');
        return `file:///${drive}${encoded}`;
      }
      const encoded = norm.split('/').map(s => encodeURIComponent(s)).join('/');
      return encoded.startsWith('/') ? `file://${encoded}` : `file:///${encoded}`;
    }
    return `${SERVER_ORIGIN}/api/raw-file?path=${encodeURIComponent(filePath)}`;
  }

  function getListFileIcon(item) {
    const tag = (item && item.path && state.tags[item.path]) ? state.tags[item.path] : '';
    const tagColors = {
      red: '#ef4444',
      orange: '#f97316',
      yellow: '#eab308',
      green: '#22c55e',
      blue: '#3b82f6',
      purple: '#a855f7',
      gray: '#64748b'
    };

    if (item.isDirectory) {
      const color = tagColors[tag] || '#38bdf8';
      return `<svg class="list-svg-icon" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; min-width: 16px; flex-shrink: 0;"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" fill="${color}" fill-opacity="0.2"/></svg>`;
    }

    const ext = (item.extension || '').toLowerCase();
    const codeExts = ['.js', '.ts', '.jsx', '.tsx', '.py', '.json', '.html', '.css', '.dart', '.rs', '.cpp', '.c', '.cs', '.go', '.sh', '.bat', '.ps1', '.sql'];
    const docExts = ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf', '.csv', '.xlsx', '.xls', '.ppt', '.pptx'];
    const mediaExts = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.mp4', '.mov', '.webm', '.mkv', '.avi'];
    const zipExts = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.iso'];

    if (isImageFile(item)) {
      return `<svg class="list-svg-icon" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; min-width: 16px; flex-shrink: 0;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
    }
    if (codeExts.includes(ext)) {
      return `<svg class="list-svg-icon" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; min-width: 16px; flex-shrink: 0;"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
    }
    if (zipExts.includes(ext)) {
      return `<svg class="list-svg-icon" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; min-width: 16px; flex-shrink: 0;"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>`;
    }
    if (mediaExts.includes(ext)) {
      return `<svg class="list-svg-icon" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; min-width: 16px; flex-shrink: 0;"><polygon points="5 3 19 12 5 21 5 3"/><line x1="19" y1="5" x2="19" y2="19"/></svg>`;
    }
    if (docExts.includes(ext)) {
      const color = ext === '.pdf' ? '#ef4444' : (ext === '.md' ? '#a855f7' : (ext === '.txt' ? '#94a3b8' : '#38bdf8'));
      return `<svg class="list-svg-icon" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; min-width: 16px; flex-shrink: 0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
    }
    return `<svg class="list-svg-icon" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; min-width: 16px; flex-shrink: 0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
  }

  function getFileIcon(item, isGrid = true) {
    if (!item) return getDocSvg('FILE', '#64748b');

    const tag = (item && item.path && state.tags[item.path]) ? state.tags[item.path] : '';
    if (item.isDirectory) {
      return getFolderSvg(item.name, tag);
    }
    const ext = (item.extension || '').toLowerCase();
    
    if (isImageFile(item)) {
      if (isGrid) {
        return `
          <img class="grid-thumb-img" src="${getMediaUrl(item.path)}" alt="${item.name}" loading="lazy" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='block';" />
          <div style="display:none;width:46px;height:46px;">${getDocSvg('IMG', '#f43f5e')}</div>
        `;
      } else {
        if (state.iconPreview !== false) {
          return `
            <img class="list-thumb-img" src="${getMediaUrl(item.path)}" alt="${item.name}" loading="lazy" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='inline-flex';" />
            <div style="display:none;width:18px;height:18px;align-items:center;justify-content:center;">${getDocSvg('IMG', '#f43f5e')}</div>
          `;
        }
        return getDocSvg('IMG', '#f43f5e');
      }
    }
    
    const codeExts = ['.js', '.ts', '.jsx', '.tsx', '.py', '.json', '.html', '.css', '.dart', '.rs', '.cpp', '.c', '.cs', '.go', '.sh', '.bat', '.ps1', '.sql'];
    const docExts = ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf', '.csv', '.xlsx', '.xls', '.ppt', '.pptx'];
    const mediaExts = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.mp4', '.mov', '.webm', '.mkv', '.avi'];
    const zipExts = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.iso'];

    if (zipExts.includes(ext)) {
      return getZipSvg();
    }
    if (codeExts.includes(ext)) {
      const label = ext.replace('.', '').toUpperCase().substring(0, 4);
      const codeColors = {
        '.js': '#f59e0b',
        '.ts': '#0284c7',
        '.jsx': '#06b6d4',
        '.tsx': '#06b6d4',
        '.py': '#3b82f6',
        '.json': '#10b981',
        '.html': '#f97316',
        '.css': '#0ea5e9',
        '.rs': '#ef4444',
        '.cpp': '#6366f1',
        '.c': '#64748b',
        '.go': '#06b6d4',
        '.sql': '#8b5cf6'
      };
      return getDocSvg(label, codeColors[ext] || '#10b981');
    }
    if (docExts.includes(ext)) {
      const label = ext.replace('.', '').toUpperCase().substring(0, 4);
      let color = '#f59e0b';
      if (ext === '.pdf') color = '#ef4444';
      else if (ext === '.md' || ext === '.txt') color = '#8b5cf6';
      else if (ext === '.doc' || ext === '.docx') color = '#2563eb';
      else if (ext === '.xls' || ext === '.xlsx' || ext === '.csv') color = '#10b981';
      else if (ext === '.ppt' || ext === '.pptx') color = '#ea580c';
      return getDocSvg(label, color);
    }
    if (mediaExts.includes(ext)) {
      const label = ext.replace('.', '').toUpperCase().substring(0, 4);
      const isVideo = ['.mp4', '.mov', '.webm', '.mkv', '.avi'].includes(ext);
      return getDocSvg(label, isVideo ? '#6366f1' : '#ec4899');
    }
    if (IMAGE_EXTENSIONS.includes(ext)) {
      return getDocSvg('IMG', '#f43f5e');
    }

    const label = (ext.replace('.', '') || 'FILE').toUpperCase().substring(0, 4);
    return getDocSvg(label, '#64748b');
  }

  // DOM Elements
  const el = {
    // Window buttons
    btnWinMinimize: document.getElementById('btnWinMinimize'),
    btnWinMaximize: document.getElementById('btnWinMaximize'),
    btnWinClose: document.getElementById('btnWinClose'),

    // Tabs & Layout
    tabsContainer: document.getElementById('tabsContainer'),
    btnNewTab: document.getElementById('btnNewTab'),
    btnNewWindow: document.getElementById('btnNewWindow'),
    btnToggleDualPane: document.getElementById('btnToggleDualPane'),
    splitPaneLabel: document.getElementById('splitPaneLabel'),
    panesContainer: document.getElementById('panesContainer'),
    primaryPane: document.getElementById('primaryPane'),
    secondaryPane: document.getElementById('secondaryPane'),
    paneDivider: document.getElementById('paneDivider'),
    primaryViewport: document.getElementById('primaryViewport'),
    secondaryViewport: document.getElementById('secondaryViewport'),
    btnCloseSecondary: document.getElementById('btnCloseSecondary'),
    secondaryPanePath: document.getElementById('secondaryPanePath'),
    btnSecondaryUp: document.getElementById('btnSecondaryUp'),
    btnSecondarySwap: document.getElementById('btnSecondarySwap'),
    secondaryPaneDrives: document.getElementById('secondaryPaneDrives'),
    secondaryPaneCount: document.getElementById('secondaryPaneCount'),

    // Navigation & Toolbar
    btnBack: document.getElementById('btnBack'),
    btnForward: document.getElementById('btnForward'),
    btnUp: document.getElementById('btnUp'),
    btnRefresh: document.getElementById('btnRefresh'),
    addressBar: document.getElementById('addressBar'),
    breadcrumbsTrail: document.getElementById('breadcrumbsTrail'),
    pathInput: document.getElementById('pathInput'),
    btnCopyPath: document.getElementById('btnCopyPath'),

    // Action buttons
    btnNewFileMenu: document.getElementById('btnNewFileMenu'),
    newFileDropdown: document.getElementById('newFileDropdown'),
    btnNewFolder: document.getElementById('btnNewFolder'),
    btnCut: document.getElementById('btnCut'),
    btnCopy: document.getElementById('btnCopy'),
    btnPaste: document.getElementById('btnPaste'),
    btnRename: document.getElementById('btnRename'),
    btnDelete: document.getElementById('btnDelete'),
    btnQuickLook: document.getElementById('btnQuickLook'),
    btnTerminal: document.getElementById('btnTerminal'),
    btnToggleHidden: document.getElementById('btnToggleHidden'),
    hiddenSlash: document.getElementById('hiddenSlash'),
    btnToggleCheckboxes: document.getElementById('btnToggleCheckboxes'),
    btnUndo: document.getElementById('btnUndo'),
    btnRedo: document.getElementById('btnRedo'),

    // View Switchers
    btnViewColumns: document.getElementById('btnViewColumns'),
    btnViewList: document.getElementById('btnViewList'),
    btnViewGrid: document.getElementById('btnViewGrid'),
    btnViewGallery: document.getElementById('btnViewGallery'),
    btnSortMenu: document.getElementById('btnSortMenu'),
    sortDropdown: document.getElementById('sortDropdown'),
    btnTogglePreviewPane: document.getElementById('btnTogglePreviewPane'),
    btnClosePreviewPane: document.getElementById('btnClosePreviewPane'),
    previewPane: document.getElementById('previewPane'),
    previewPaneResizer: document.getElementById('previewPaneResizer'),
    previewPaneBody: document.getElementById('previewPaneBody'),

    // Search
    searchInput: document.getElementById('searchInput'),
    btnSearchClear: document.getElementById('btnSearchClear'),
    btnSearchTypeToggle: document.getElementById('btnSearchTypeToggle'),
    searchTypeLabel: document.getElementById('searchTypeLabel'),
    searchAttrDropdown: document.getElementById('searchAttrDropdown'),
    searchPopover: document.getElementById('searchPopover'),
    searchPopFilename: document.getElementById('searchPopFilename'),
    searchPopContent: document.getElementById('searchPopContent'),
    searchPopTagsSection: document.getElementById('searchPopTagsSection'),
    searchPopTagsList: document.getElementById('searchPopTagsList'),

    // Action Capsule & Dropdown (macOS Reference 1 & 5)
    btnShareItem: document.getElementById('btnShareItem'),
    btnToolbarTag: document.getElementById('btnToolbarTag'),
    btnToolbarMore: document.getElementById('btnToolbarMore'),
    moreActionsDropdown: document.getElementById('moreActionsDropdown'),
    moreActCut: document.getElementById('moreActCut'),
    moreActCopy: document.getElementById('moreActCopy'),
    moreActPaste: document.getElementById('moreActPaste'),
    moreActRename: document.getElementById('moreActRename'),
    moreActDelete: document.getElementById('moreActDelete'),
    moreActTerminal: document.getElementById('moreActTerminal'),
    moreActReveal: document.getElementById('moreActReveal'),
    moreActShare: document.getElementById('moreActShare'),

    // Sidebar
    sidebarRecents: document.getElementById('sidebarRecents'),
    sidebarShared: document.getElementById('sidebarShared'),
    sidebarApps: document.getElementById('sidebarApps'),
    sidebarDownloads: document.getElementById('sidebarDownloads'),
    sidebarDesktop: document.getElementById('sidebarDesktop'),
    sidebarDocuments: document.getElementById('sidebarDocuments'),
    sidebarPictures: document.getElementById('sidebarPictures'),
    sidebarRecycleBin: document.getElementById('sidebarRecycleBin'),
    sidebarRecycleCount: document.getElementById('sidebarRecycleCount'),
    recycleBinBanner: document.getElementById('recycleBinBanner'),
    recycleBinBannerMeta: document.getElementById('recycleBinBannerMeta'),
    btnRestoreAllRecycle: document.getElementById('btnRestoreAllRecycle'),
    btnEmptyRecycleView: document.getElementById('btnEmptyRecycleView'),
    sidebarCloud: document.getElementById('sidebarCloud'),
    sidebarHome: document.getElementById('sidebarHome'),
    sidebarHomeLabel: document.getElementById('sidebarHomeLabel'),
    sidebarPinsList: document.getElementById('sidebarPinsList'),
    sidebarFavoritesList: document.getElementById('sidebarFavoritesList'),
    sidebarSectionFavorites: document.getElementById('sidebarSectionFavorites'),
    sidebarDrivesList: document.getElementById('sidebarDrivesList'),
    sidebarTagsList: document.getElementById('sidebarTagsList'),
    btnAddPinCurrent: document.getElementById('btnAddPinCurrent'),
    sidebarResizer: document.getElementById('sidebarResizer'),
    sidebar: document.getElementById('sidebar'),
    btnToggleSidebar: document.getElementById('btnToggleSidebar'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),
    mainLayout: document.getElementById('mainLayout'),

    // Status bar
    statusItemCount: document.getElementById('statusItemCount'),
    statusSelection: document.getElementById('statusSelection'),
    statusDriveFree: document.getElementById('statusDriveFree'),
    statusViewMode: document.getElementById('statusViewMode'),
    zoomSliderContainer: document.getElementById('zoomSliderContainer'),
    gridZoomSlider: document.getElementById('gridZoomSlider'),
    gearZoomDown: document.getElementById('gearZoomDown'),
    gearZoomUp: document.getElementById('gearZoomUp'),
    gearTrackContainer: document.getElementById('gearTrackContainer'),
    gearTrackTicks: document.getElementById('gearTrackTicks'),
    gearPillBadge: document.getElementById('gearPillBadge'),

    // Quick Look Modal
    quickLookOverlay: document.getElementById('quickLookOverlay'),
    quickLookDialog: document.querySelector('.quicklook-dialog'),
    qlTitle: document.getElementById('qlTitle'),
    qlSubtitle: document.getElementById('qlSubtitle'),
    qlBody: document.getElementById('qlBody'),
    qlLocation: document.getElementById('qlLocation'),
    qlBtnClose: document.getElementById('qlBtnClose'),
    qlBtnMaximize: document.getElementById('qlBtnMaximize'),
    qlBtnInfo: document.getElementById('qlBtnInfo'),
    qlBtnOpenDefault: document.getElementById('qlBtnOpenDefault'),
    qlBtnOpenVlc: document.getElementById('qlBtnOpenVlc'),
    qlTagTrigger: document.getElementById('qlTagTrigger'),
    qlTagsDropdown: document.getElementById('qlTagsDropdown'),
    qlCurrentTagDot: document.getElementById('qlCurrentTagDot'),
    qlImageTools: document.getElementById('qlImageTools'),
    qlBtnRotate: document.getElementById('qlBtnRotate'),
    qlBtnFlipH: document.getElementById('qlBtnFlipH'),
    qlBtnZoomIn: document.getElementById('qlBtnZoomIn'),
    qlBtnZoomOut: document.getElementById('qlBtnZoomOut'),
    qlBtnZoomFit: document.getElementById('qlBtnZoomFit'),
    qlZoomLabel: document.getElementById('qlZoomLabel'),
    qlNavPrev: document.getElementById('qlNavPrev'),
    qlNavNext: document.getElementById('qlNavNext'),
    qlInfoHud: document.getElementById('qlInfoHud'),
    qlInfoHudClose: document.getElementById('qlInfoHudClose'),
    qlInfoHudBody: document.getElementById('qlInfoHudBody'),
    qlIndexIndicator: document.getElementById('qlIndexIndicator'),

    // Context Menu
    contextMenu: document.getElementById('contextMenu'),
    ctxOpen: document.getElementById('ctxOpen'),
    ctxOpenNewWindow: document.getElementById('ctxOpenNewWindow'),
    ctxOpenNewTab: document.getElementById('ctxOpenNewTab'),
    ctxQuickLook: document.getElementById('ctxQuickLook'),
    ctxVlcDivider: document.getElementById('ctxVlcDivider'),
    ctxVlcPlay: document.getElementById('ctxVlcPlay'),
    ctxVlcPlayText: document.getElementById('ctxVlcPlayText'),
    ctxVlcEnqueue: document.getElementById('ctxVlcEnqueue'),
    ctxCut: document.getElementById('ctxCut'),
    ctxCopy: document.getElementById('ctxCopy'),
    ctxDuplicate: document.getElementById('ctxDuplicate'),
    ctxPaste: document.getElementById('ctxPaste'),
    ctxNewFolder: document.getElementById('ctxNewFolder'),
    ctxNewFile: document.getElementById('ctxNewFile'),
    ctxSelectAll: document.getElementById('ctxSelectAll'),
    ctxUp: document.getElementById('ctxUp'),
    ctxUpText: document.getElementById('ctxUpText'),
    ctxRefresh: document.getElementById('ctxRefresh'),
    ctxMoveOpposite: document.getElementById('ctxMoveOpposite'),
    ctxCopyOpposite: document.getElementById('ctxCopyOpposite'),
    ctxPin: document.getElementById('ctxPin'),
    ctxRename: document.getElementById('ctxRename'),
    ctxDelete: document.getElementById('ctxDelete'),
    ctxRestore: document.getElementById('ctxRestore'),
    ctxDeletePermanently: document.getElementById('ctxDeletePermanently'),
    ctxRestoreAll: document.getElementById('ctxRestoreAll'),
    ctxEmptyRecycle: document.getElementById('ctxEmptyRecycle'),
    ctxCopyPath: document.getElementById('ctxCopyPath'),
    ctxInvertSelect: document.getElementById('ctxInvertSelect'),
    ctxBatchRename: document.getElementById('ctxBatchRename'),
    ctxProperties: document.getElementById('ctxProperties'),
    ctxTerminal: document.getElementById('ctxTerminal'),
    ctxPowerShell: document.getElementById('ctxPowerShell'),
    ctxCmd: document.getElementById('ctxCmd'),
    ctxReveal: document.getElementById('ctxReveal'),
    ctxArchiveDivider: document.getElementById('ctxArchiveDivider'),
    ctxExtractAll: document.getElementById('ctxExtractAll'),
    ctxExtractAllText: document.getElementById('ctxExtractAllText'),
    ctxExtractHere: document.getElementById('ctxExtractHere'),
    ctxCompressDivider: document.getElementById('ctxCompressDivider'),
    ctxCompressZip: document.getElementById('ctxCompressZip'),
    ctxCompress7z: document.getElementById('ctxCompress7z'),
    toastContainer: document.getElementById('toastContainer'),

    // Properties Modal (Alt+Enter)
    propertiesModal: document.getElementById('propertiesModal'),
    btnClosePropModal: document.getElementById('btnClosePropModal'),
    btnPropDone: document.getElementById('btnPropDone'),
    btnPropCopyPath: document.getElementById('btnPropCopyPath'),
    propTabGeneral: document.getElementById('propTabGeneral'),
    propTabChecksums: document.getElementById('propTabChecksums'),
    propContentGeneral: document.getElementById('propContentGeneral'),
    propContentChecksums: document.getElementById('propContentChecksums'),
    propFileIcon: document.getElementById('propFileIcon'),
    propFileName: document.getElementById('propFileName'),
    propFileKind: document.getElementById('propFileKind'),
    propTypeVal: document.getElementById('propTypeVal'),
    propOpensWithVal: document.getElementById('propOpensWithVal'),
    propLocationVal: document.getElementById('propLocationVal'),
    propSizeVal: document.getElementById('propSizeVal'),
    propSizeOnDiskVal: document.getElementById('propSizeOnDiskVal'),
    propCreatedVal: document.getElementById('propCreatedVal'),
    propModifiedVal: document.getElementById('propModifiedVal'),
    propAccessedVal: document.getElementById('propAccessedVal'),
    propCheckReadOnly: document.getElementById('propCheckReadOnly'),
    propCheckHidden: document.getElementById('propCheckHidden'),
    btnCalcHashes: document.getElementById('btnCalcHashes'),
    propHashSha256: document.getElementById('propHashSha256'),
    propHashMd5: document.getElementById('propHashMd5'),
    btnCopySha256: document.getElementById('btnCopySha256'),
    btnCopyMd5: document.getElementById('btnCopyMd5'),
    propHashVerifyInput: document.getElementById('propHashVerifyInput'),
    propHashVerifyResult: document.getElementById('propHashVerifyResult'),

    // Batch Rename Modal
    batchRenameModal: document.getElementById('batchRenameModal'),
    btnCloseBatchModal: document.getElementById('btnCloseBatchModal'),
    btnBatchCancel: document.getElementById('btnBatchCancel'),
    btnBatchApply: document.getElementById('btnBatchApply'),
    batchCountBadge: document.getElementById('batchCountBadge'),
    batchFindInput: document.getElementById('batchFindInput'),
    batchReplaceInput: document.getElementById('batchReplaceInput'),
    batchPrefixInput: document.getElementById('batchPrefixInput'),
    batchSuffixInput: document.getElementById('batchSuffixInput'),
    batchCheckNumbering: document.getElementById('batchCheckNumbering'),
    batchStartNumber: document.getElementById('batchStartNumber'),
    batchPreviewList: document.getElementById('batchPreviewList'),

    // Generic Modal
    modalOverlay: document.getElementById('modalOverlay'),
    modalTitle: document.getElementById('modalTitle'),
    modalDesc: document.getElementById('modalDesc'),
    modalInput: document.getElementById('modalInput'),
    modalBtnCancel: document.getElementById('modalBtnCancel'),
    modalBtnConfirm: document.getElementById('modalBtnConfirm'),

    // Appearance Theme Switcher
    themeSegmentedCtrl: document.getElementById('settingsThemeCtrl'),

    // Toolbar Settings & Preferences Modal
    btnToolbarSettings: document.getElementById('btnToolbarSettings'),
    btnTitlebarSettings: document.getElementById('btnTitlebarSettings'),
    sidebarSettings: document.getElementById('sidebarSettings'),
    moreActPreferences: document.getElementById('moreActPreferences'),
    ctxPreferences: document.getElementById('ctxPreferences'),
    settingsModal: document.getElementById('settingsModal'),
    btnCloseSettingsModal: document.getElementById('btnCloseSettingsModal'),
    btnSettingsDone: document.getElementById('btnSettingsDone'),
    settingsThemeCtrl: document.getElementById('settingsThemeCtrl'),
    settingsDefaultView: document.getElementById('settingsDefaultView'),
    settingsBtnDefault: document.getElementById('settingsBtnDefault'),
    settingsCheckHidden: document.getElementById('settingsCheckHidden'),

    // Extended Settings Elements
    settingsTabBar: document.getElementById('settingsTabBar'),
    settingsPanelGeneral: document.getElementById('settingsPanelGeneral'),
    settingsPanelAppearance: document.getElementById('settingsPanelAppearance'),
    settingsPanelMedia: document.getElementById('settingsPanelMedia'),
    settingsPanelSystem: document.getElementById('settingsPanelSystem'),
    settingsStartupFolder: document.getElementById('settingsStartupFolder'),
    settingsStartupCustomWrap: document.getElementById('settingsStartupCustomWrap'),
    settingsStartupCustom: document.getElementById('settingsStartupCustom'),
    settingsOpenAction: document.getElementById('settingsOpenAction'),
    settingsSearchScope: document.getElementById('settingsSearchScope'),
    settingsCheckboxes: document.getElementById('settingsCheckboxes'),
    settingsConfirmDelete: document.getElementById('settingsConfirmDelete'),
    settingsAccentSwatches: document.getElementById('settingsAccentSwatches'),
    settingsDensity: document.getElementById('settingsDensity'),
    settingsThumbSize: document.getElementById('settingsThumbSize'),
    settingsCheckExtensions: document.getElementById('settingsCheckExtensions'),
    settingsCheckQuickLook: document.getElementById('settingsCheckQuickLook'),
    settingsCheckAutoplay: document.getElementById('settingsCheckAutoplay'),
    settingsCheckLoop: document.getElementById('settingsCheckLoop'),
    settingsCheckVlc: document.getElementById('settingsCheckVlc'),
    settingsVlcStatusBadge: document.getElementById('settingsVlcStatusBadge'),
    settingsVlcStatusDesc: document.getElementById('settingsVlcStatusDesc'),
    settingsBtnRestoreDefault: document.getElementById('settingsBtnRestoreDefault'),
    settingsTerminalShell: document.getElementById('settingsTerminalShell'),
    settingsChecksumAlgo: document.getElementById('settingsChecksumAlgo'),
    settingsBtnResetDefaults: document.getElementById('settingsBtnResetDefaults'),

    // Extended 6-Tab Settings Elements
    settingsPanelSidebar: document.getElementById('settingsPanelSidebar'),
    settingsPanelShortcuts: document.getElementById('settingsPanelShortcuts'),
    settingsCheckAutoRefresh: document.getElementById('settingsCheckAutoRefresh'),
    settingsDateFormat: document.getElementById('settingsDateFormat'),
    settingsCheckColDate: document.getElementById('settingsCheckColDate'),
    settingsCheckColType: document.getElementById('settingsCheckColType'),
    settingsCheckColSize: document.getElementById('settingsCheckColSize'),
    settingsCheckColTag: document.getElementById('settingsCheckColTag'),
    settingsCheckSidebarRecents: document.getElementById('settingsCheckSidebarRecents'),
    settingsCheckSidebarFavorites: document.getElementById('settingsCheckSidebarFavorites'),
    settingsCheckSidebarDrives: document.getElementById('settingsCheckSidebarDrives'),
    settingsCheckSidebarTags: document.getElementById('settingsCheckSidebarTags'),
    settingsTagVisibilityGrid: document.getElementById('settingsTagVisibilityGrid'),
    settingsShortcutSearch: document.getElementById('settingsShortcutSearch'),
    settingsShortcutsContainer: document.getElementById('settingsShortcutsContainer'),
    settingsDefaultArchiveFormat: document.getElementById('settingsDefaultArchiveFormat'),
    settingsDefaultArchiveLevel: document.getElementById('settingsDefaultArchiveLevel'),
    settingsCheckAutoOpenExtracted: document.getElementById('settingsCheckAutoOpenExtracted'),
    settingsDedupScanMode: document.getElementById('settingsDedupScanMode'),
    settingsDedupMinSize: document.getElementById('settingsDedupMinSize'),
    sidebarTopNav: document.getElementById('sidebarTopNav'),
    sidebarSectionFavorites: document.getElementById('sidebarSectionFavorites'),
    sidebarSectionDrives: document.getElementById('sidebarSectionDrives'),
    sidebarSectionTags: document.getElementById('sidebarSectionTags'),

    // View Options Panel (media_1790263700052.png)
    viewOptionsPanel: document.getElementById('viewOptionsPanel'),
    voCloseBtn: document.getElementById('voCloseBtn'),
    voFolderTitle: document.getElementById('voFolderTitle'),
    voChkAlwaysOpen: document.getElementById('voChkAlwaysOpen'),
    voLblAlwaysOpen: document.getElementById('voLblAlwaysOpen'),
    voChkBrowse: document.getElementById('voChkBrowse'),
    voLblBrowse: document.getElementById('voLblBrowse'),
    voSortSelect: document.getElementById('voSortSelect'),
    voGroupSelect: document.getElementById('voGroupSelect'),
    voChkPreviewCol: document.getElementById('voChkPreviewCol'),
    voChkIconPreview: document.getElementById('voChkIconPreview'),
    voChkFilename: document.getElementById('voChkFilename'),
    voBtnDefaults: document.getElementById('voBtnDefaults'),
    sortOptShowViewOptions: document.getElementById('sortOptShowViewOptions'),
    moreActViewOptions: document.getElementById('moreActViewOptions'),
    ctxViewOptions: document.getElementById('ctxViewOptions'),

    // macOS Finder Toolbar & Context additions
    moreActGetInfo: document.getElementById('moreActGetInfo'),
    moreActGoToFolder: document.getElementById('moreActGoToFolder'),
    moreActNewFolderWithSelection: document.getElementById('moreActNewFolderWithSelection'),
    ctxGetInfo: document.getElementById('ctxGetInfo'),
    ctxNewFolderWithSelection: document.getElementById('ctxNewFolderWithSelection'),
    ctxNewFolderWithSelectionText: document.getElementById('ctxNewFolderWithSelectionText'),
    ctxRotateClockwise: document.getElementById('ctxRotateClockwise'),
    ctxTagsRow: document.getElementById('ctxTagsRow'),

    // macOS Finder Get Info Modal
    getInfoModal: document.getElementById('getInfoModal'),
    btnGiClose: document.getElementById('btnGiClose'),
    giWindowTitle: document.getElementById('giWindowTitle'),
    giHeroIcon: document.getElementById('giHeroIcon'),
    giHeroTitle: document.getElementById('giHeroTitle'),
    giHeroSub: document.getElementById('giHeroSub'),
    giKindVal: document.getElementById('giKindVal'),
    giSizeVal: document.getElementById('giSizeVal'),
    giWhereVal: document.getElementById('giWhereVal'),
    giCreatedVal: document.getElementById('giCreatedVal'),
    giModifiedVal: document.getElementById('giModifiedVal'),
    giDimensionsVal: document.getElementById('giDimensionsVal'),
    giContentsVal: document.getElementById('giContentsVal'),
    giAccessedVal: document.getElementById('giAccessedVal'),
    giNameInput: document.getElementById('giNameInput'),
    giChkHideExt: document.getElementById('giChkHideExt'),
    giChkStationery: document.getElementById('giChkStationery'),
    giChkLocked: document.getElementById('giChkLocked'),
    giPermsTableBody: document.getElementById('giPermsTableBody'),
    giPreviewContainer: document.getElementById('giPreviewContainer'),

    // macOS Finder Go To Folder Modal
    goToFolderModal: document.getElementById('goToFolderModal'),
    goFolderInput: document.getElementById('goFolderInput'),
    btnGoFolderClose: document.getElementById('btnGoFolderClose'),
    btnGoFolderCancel: document.getElementById('btnGoFolderCancel'),
    btnGoFolderConfirm: document.getElementById('btnGoFolderConfirm'),

    // Native File Deduplication Modal
    moreActFindDuplicates: document.getElementById('moreActFindDuplicates'),
    moreActBatchRename: document.getElementById('moreActBatchRename'),
    ctxFindDuplicates: document.getElementById('ctxFindDuplicates'),
    dedupModal: document.getElementById('dedupModal'),
    btnDedupClose: document.getElementById('btnDedupClose'),
    dedupScopeBadge: document.getElementById('dedupScopeBadge'),
    dedupChkRecursive: document.getElementById('dedupChkRecursive'),
    btnDedupRescan: document.getElementById('btnDedupRescan'),
    dedupBadgeGroups: document.getElementById('dedupBadgeGroups'),
    dedupBadgeWasted: document.getElementById('dedupBadgeWasted'),
    dedupBadgeScanned: document.getElementById('dedupBadgeScanned'),
    btnDedupSelectNewest: document.getElementById('btnDedupSelectNewest'),
    btnDedupSelectOldest: document.getElementById('btnDedupSelectOldest'),
    btnDedupSelectNone: document.getElementById('btnDedupSelectNone'),
    dedupBody: document.getElementById('dedupBody'),
    dedupFooterInfo: document.getElementById('dedupFooterInfo'),
    btnDedupCancel: document.getElementById('btnDedupCancel'),
    btnDedupDelete: document.getElementById('btnDedupDelete'),

    // Native Storage Management Modal
    moreActManageStorage: document.getElementById('moreActManageStorage'),
    ctxManageStorage: document.getElementById('ctxManageStorage'),
    storageModal: document.getElementById('storageModal'),
    storageModalCard: document.getElementById('storageModalCard'),
    btnStorageClose: document.getElementById('btnStorageClose'),
    storageDriveSelect: document.getElementById('storageDriveSelect'),
    btnStorageRescan: document.getElementById('btnStorageRescan'),
    storageHeroDriveName: document.getElementById('storageHeroDriveName'),
    storageHeroUsed: document.getElementById('storageHeroUsed'),
    storageHeroTotal: document.getElementById('storageHeroTotal'),
    storageHeroFree: document.getElementById('storageHeroFree'),
    storageHeroPercent: document.getElementById('storageHeroPercent'),
    storageBar: document.getElementById('storageBar'),
    storageLegendGrid: document.getElementById('storageLegendGrid'),
    cardStorageTemp: document.getElementById('cardStorageTemp'),
    storageTempSize: document.getElementById('storageTempSize'),
    btnStorageCleanTemp: document.getElementById('btnStorageCleanTemp'),
    cardStorageRecycle: document.getElementById('cardStorageRecycle'),
    storageRecycleSize: document.getElementById('storageRecycleSize'),
    btnStorageEmptyRecycle: document.getElementById('btnStorageEmptyRecycle'),
    cardStorageDedup: document.getElementById('cardStorageDedup'),
    btnStorageLaunchDedup: document.getElementById('btnStorageLaunchDedup'),
    tabBtnLargestFiles: document.getElementById('tabBtnLargestFiles'),
    tabBtnTopFolders: document.getElementById('tabBtnTopFolders'),
    storageTabSummaryInfo: document.getElementById('storageTabSummaryInfo'),
    tabContentLargestFiles: document.getElementById('tabContentLargestFiles'),
    tabContentTopFolders: document.getElementById('tabContentTopFolders'),
    storageLargestFilesTbody: document.getElementById('storageLargestFilesTbody'),
    storageTopFoldersList: document.getElementById('storageTopFoldersList'),
    storageFooterNote: document.getElementById('storageFooterNote'),

    // Share Hub Modal
    shareModal: document.getElementById('shareModal'),
    shareModalCard: document.getElementById('shareModalCard'),
    btnCloseShareModal: document.getElementById('btnCloseShareModal'),
    shareTargetIcon: document.getElementById('shareTargetIcon'),
    shareTargetName: document.getElementById('shareTargetName'),
    shareTargetPath: document.getElementById('shareTargetPath'),
    btnShareCopyPath: document.getElementById('btnShareCopyPath'),
    tabBtnShareNative: document.getElementById('tabBtnShareNative'),
    tabBtnShareApps: document.getElementById('tabBtnShareApps'),
    shareViewNative: document.getElementById('shareViewNative'),
    shareViewApps: document.getElementById('shareViewApps'),
    shareOptWinSheet: document.getElementById('shareOptWinSheet'),
    shareOptNearby: document.getElementById('shareOptNearby'),
    shareOptEmail: document.getElementById('shareOptEmail'),
    shareOptUnc: document.getElementById('shareOptUnc'),
    btnShareCopyWifiLink: document.getElementById('btnShareCopyWifiLink'),
    shareQrContainer: document.getElementById('shareQrContainer'),
    shareWifiUrlDisplay: document.getElementById('shareWifiUrlDisplay'),
    btnShareDone: document.getElementById('btnShareDone'),
    ctxShare: document.getElementById('ctxShare')
  };

  // --- THEME ENGINE (Light, Dark, System) & ACCENT / DENSITY ENGINES ---
  function initTheme() {
    const saved = localStorage.getItem('myfiles_theme') || 'system';
    setTheme(saved, false);
    setAccent(state.accentColor, false);
    setCompactMode(state.compactMode, false);

    // Dynamic OS listener for system dark/light mode preference changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (state.theme === 'system') {
          setTheme('system', false);
        }
      });
    }

    if (el.themeSegmentedCtrl) {
      el.themeSegmentedCtrl.querySelectorAll('.theme-opt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          setTheme(btn.dataset.themeVal);
        });
      });
    }
  }

  function setTheme(themeName, save = true) {
    if (!['light', 'dark', 'system'].includes(themeName)) {
      themeName = 'system';
    }
    state.theme = themeName;
    if (save) {
      try {
        localStorage.setItem('myfiles_theme', themeName);
      } catch (e) {
        // Safe fallback
      }
    }

    document.body.classList.remove('theme-light', 'theme-dark', 'theme-system', 'theme-slate');
    document.body.classList.add(`theme-${themeName}`);

    if (el.themeSegmentedCtrl) {
      el.themeSegmentedCtrl.querySelectorAll('.theme-opt-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.themeVal === themeName);
      });
    }

    // Refresh active view elements if items are present
    if (state.items && state.items.length > 0) {
      if (state.viewMode === 'columns') {
        renderMillerColumns();
      } else {
        renderCurrentView();
      }
    }
  }

  function setAccent(accentName, save = true) {
    const validAccents = ['blue', 'emerald', 'purple', 'orange', 'rose', 'graphite'];
    if (!validAccents.includes(accentName)) accentName = 'blue';
    state.accentColor = accentName;
    if (save) {
      try { localStorage.setItem('myfiles_accent', accentName); } catch(e) {}
    }
    if (accentName === 'blue') {
      document.body.removeAttribute('data-accent');
      document.documentElement.removeAttribute('data-accent');
    } else {
      document.body.setAttribute('data-accent', accentName);
      document.documentElement.setAttribute('data-accent', accentName);
    }
    updateSettingsAccentCtrl();
  }

  function updateSettingsAccentCtrl() {
    if (el.settingsAccentSwatches) {
      el.settingsAccentSwatches.querySelectorAll('.settings-swatch').forEach(sw => {
        sw.classList.toggle('active', sw.dataset.accent === state.accentColor);
      });
    }
  }

  function setCompactMode(isCompact, save = true) {
    state.compactMode = !!isCompact;
    if (save) {
      try { localStorage.setItem('myfiles_compact_mode', String(state.compactMode)); } catch(e) {}
    }
    document.body.classList.toggle('compact-mode', state.compactMode);
    if (el.settingsDensity) {
      el.settingsDensity.value = state.compactMode ? 'compact' : 'standard';
    }
  }

  function formatItemName(item) {
    if (!item) return '';
    if (state.showFileExtensions !== false || item.isDirectory) return item.name;
    const ext = item.extension;
    if (ext && item.name.endsWith(ext) && item.name.length > ext.length) {
      return item.name.slice(0, -ext.length);
    }
    return item.name;
  }

  // --- INITIALIZATION ---
  async function init() {
    initTheme();
    setupWindowControls();
    setupEventListeners();
    applyGear(state.currentGear || 2, true);
    await loadInitialData();
    applySidebarPreferences();
    refreshDefaultFileManagerStatus();

    // Ensure sidebar is ALWAYS open and fully expanded by default
    if (el.mainLayout) {
      el.mainLayout.classList.remove('sidebar-collapsed');
    }
    if (el.btnToggleSidebar) {
      el.btnToggleSidebar.classList.add('active');
      el.btnToggleSidebar.title = 'Collapse sidebar (Ctrl+B)';
    }
    try {
      localStorage.removeItem('myfiles_sidebar_collapsed');
    } catch (err) {}
    
    // Check command-line argument, shell verb invocation, or URL search param
    let initialPath = null;
    let initialSelect = null;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('path')) {
      initialPath = urlParams.get('path');
      initialSelect = urlParams.get('select');
    } else if (api.getInitialPath) {
      const init = await api.getInitialPath();
      if (typeof init === 'object' && init !== null) {
        initialPath = init.targetPath || init.path;
        initialSelect = init.selectItem || init.select;
      } else {
        initialPath = init;
      }
    }
    if (initialSelect) state.pendingSelect = initialSelect;

    if (!initialPath) {
      const startupPref = state.startupFolder || 'firstDrive';
      if (startupPref === 'home' && state.homePath) {
        initialPath = state.homePath;
      } else if (startupPref === 'desktop') {
        const f = state.specialFolders.find(s => s.id === 'desktop');
        initialPath = f ? f.path : (state.homePath || 'C:\\');
      } else if (startupPref === 'documents') {
        const f = state.specialFolders.find(s => s.id === 'documents');
        initialPath = f ? f.path : (state.homePath || 'C:\\');
      } else if (startupPref === 'downloads') {
        const f = state.specialFolders.find(s => s.id === 'downloads');
        initialPath = f ? f.path : (state.homePath || 'C:\\');
      } else if (startupPref === 'custom' && state.startupFolderPath) {
        initialPath = state.startupFolderPath;
      } else {
        initialPath = state.drives.length > 0 ? state.drives[0].path : 'C:\\';
      }
    }
    createTab(initialPath);

    // Listen for subsequent folder opens from Windows Explorer shell verb
    if (api.onOpenDirectoryTab) {
      api.onOpenDirectoryTab((targetDir) => {
        if (targetDir) createTab(targetDir);
      });
    }
  }

  function checkBackendConnection() {
    const existing = document.getElementById('backendOfflineBanner');
    if (!state.drives || state.drives.length === 0) {
      if (!existing) {
        const banner = document.createElement('div');
        banner.id = 'backendOfflineBanner';
        banner.style.cssText = 'position: fixed; top: 52px; left: 240px; right: 0; background: rgba(239, 68, 68, 0.12); border-bottom: 1px solid rgba(239, 68, 68, 0.3); color: var(--text-main); padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; z-index: 999; font-size: 13px; backdrop-filter: blur(12px);';
        banner.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #ef4444;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span><strong>Desktop Service Disconnected:</strong> Local backend is not responding on <code>http://127.0.0.1:5241</code>. Launch with <code>start.bat</code> or run <code>npm start</code>.</span>
          </div>
          <button id="btnRetryBackend" style="background: var(--accent); color: #fff; border: none; padding: 5px 12px; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; font-weight: 500;">Retry</button>
        `;
        document.body.appendChild(banner);
        const retryBtn = document.getElementById('btnRetryBackend');
        if (retryBtn) {
          retryBtn.addEventListener('click', async () => {
            banner.remove();
            await loadInitialData();
            if (state.drives && state.drives.length > 0) {
              navigateTo(state.drives[0].path);
            }
          });
        }
      }
    } else {
      if (existing) existing.remove();
    }
  }

  async function loadInitialData() {
    try {
      state.drives = await api.getDrives();
      state.pins = await api.getPins();
      state.tags = await api.getTags();
      if (api.getVlcStatus) {
        try {
          const vlcInfo = await api.getVlcStatus();
          state.vlcInstalled = !!(vlcInfo && vlcInfo.installed);
          state.vlcPath = vlcInfo ? vlcInfo.path : null;
        } catch {}
      }
      if (api.getSpecialFolders) {
        try {
          state.specialFolders = await api.getSpecialFolders();
          const homeDef = state.specialFolders.find(f => f.id === 'home');
          if (homeDef) state.homePath = homeDef.path;
        } catch {}
      }
      renderSidebarDrives();
      renderSidebarPins();
      initSidebarFavorites();
      highlightSidebarActive();
      updateTagCounters();
      checkBackendConnection();
    } catch (err) {
      console.error('Failed to load initial storage info', err);
      checkBackendConnection();
    }
  }

  // --- WINDOW CONTROLS ---
  function setupWindowControls() {
    el.btnWinMinimize.addEventListener('click', () => api.windowControl('minimize'));
    el.btnWinMaximize.addEventListener('click', () => api.windowControl('maximize'));
    el.btnWinClose.addEventListener('click', () => api.windowControl('close'));
  }

  // --- MULTI-WINDOW & TABS SYSTEM ---
  async function openNewWindow(targetPath) {
    const p = targetPath || state.currentPath || 'C:\\';
    try {
      if (api.openNewWindow) {
        await api.openNewWindow(p);
      } else {
        const url = `/?path=${encodeURIComponent(p)}`;
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('Failed to open new window:', err);
      const url = `/?path=${encodeURIComponent(p)}`;
      window.open(url, '_blank');
    }
  }

  function createTab(dirPath) {
    const tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newTab = {
      id: tabId,
      path: dirPath,
      history: [dirPath],
      historyIndex: 0,
      viewMode: state.viewMode || 'grid'
    };
    state.tabs.push(newTab);
    switchTab(tabId);
    renderTabs();
  }

  function switchTab(tabId) {
    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab) return;
    state.activeTabId = tabId;
    state.viewMode = tab.viewMode || 'columns';
    updateViewButtons();
    navigateTo(tab.path, false);
    renderTabs();
  }

  function closeTab(tabId, event) {
    if (event) event.stopPropagation();
    if (state.tabs.length <= 1) return; // Keep at least one tab
    const idx = state.tabs.findIndex(t => t.id === tabId);
    if (idx === -1) return;

    state.tabs.splice(idx, 1);
    if (state.activeTabId === tabId) {
      const nextTab = state.tabs[Math.max(0, idx - 1)];
      switchTab(nextTab.id);
    } else {
      renderTabs();
    }
  }

  function renderTabs() {
    el.tabsContainer.innerHTML = '';
    state.tabs.forEach(tab => {
      const tabEl = document.createElement('div');
      tabEl.className = `tab-item ${tab.id === state.activeTabId ? 'active' : ''}`;
      
      const folderName = tab.path.endsWith('\\') ? tab.path : tab.path.split('\\').pop() || tab.path;
      
      tabEl.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
        <span class="tab-title" title="${tab.path}">${folderName}</span>
        ${state.tabs.length > 1 ? '<span class="tab-close" title="Close Tab">×</span>' : ''}
      `;

      tabEl.addEventListener('click', () => switchTab(tab.id));
      tabEl.addEventListener('auxclick', (e) => {
        if (e.button === 1) {
          e.preventDefault();
          closeTab(tab.id, e);
        }
      });
      tabEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showTabContextMenu(e.clientX, e.clientY, tab);
      });
      const closeBtn = tabEl.querySelector('.tab-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => closeTab(tab.id, e));
      }

      el.tabsContainer.appendChild(tabEl);
    });
  }

  function showTabContextMenu(x, y, tab) {
    hideContextMenu();
    let menu = document.getElementById('tabContextMenu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'tabContextMenu';
      menu.className = 'context-menu tab-context-menu';
      document.body.appendChild(menu);

      window.addEventListener('click', (e) => {
        if (menu && menu.style.display !== 'none' && !menu.contains(e.target)) {
          menu.style.display = 'none';
        }
      }, { capture: true });
    }

    const canClose = state.tabs.length > 1;

    menu.innerHTML = `
      <div class="ctx-item" data-action="new">
        <span class="ctx-icon">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </span>
        <span>New Tab</span>
      </div>
      <div class="ctx-item" data-action="open-window">
        <span class="ctx-icon">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </span>
        <span>Open in New Window</span>
      </div>
      <div class="ctx-item ${!canClose ? 'disabled' : ''}" data-action="move-window">
        <span class="ctx-icon">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </span>
        <span>Move to New Window</span>
      </div>
      <div class="ctx-item" data-action="duplicate">
        <span class="ctx-icon">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </span>
        <span>Duplicate Tab</span>
      </div>
      <div class="ctx-item" data-action="copy-path">
        <span class="ctx-icon">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
        </span>
        <span>Copy Path</span>
      </div>
      <div class="ctx-divider"></div>
      <div class="ctx-item ${!canClose ? 'disabled' : ''}" data-action="close-others">
        <span class="ctx-icon">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </span>
        <span>Close Other Tabs</span>
      </div>
      <div class="ctx-item ${!canClose ? 'disabled' : ''}" data-action="close">
        <span class="ctx-icon">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </span>
        <span>Close Tab</span>
      </div>
    `;

    menu.style.display = 'flex';
    const menuWidth = 205;
    const menuHeight = 245;
    let posX = x;
    let posY = y;
    if (posX + menuWidth > window.innerWidth) posX = window.innerWidth - menuWidth - 8;
    if (posY + menuHeight > window.innerHeight) posY = window.innerHeight - menuHeight - 8;
    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;

    menu.querySelectorAll('.ctx-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.style.display = 'none';
        const action = item.dataset.action;
        if (item.classList.contains('disabled')) return;

        if (action === 'new') {
          createTab(state.currentPath);
        } else if (action === 'open-window') {
          openNewWindow(tab.path);
        } else if (action === 'move-window') {
          openNewWindow(tab.path);
          if (state.tabs.length > 1) {
            closeTab(tab.id);
          }
        } else if (action === 'duplicate') {
          createTab(tab.path);
        } else if (action === 'copy-path') {
          navigator.clipboard.writeText(tab.path).then(() => {
            showToast('Tab path copied to clipboard');
          }).catch(() => {
            showToast(tab.path);
          });
        } else if (action === 'close-others') {
          state.tabs = state.tabs.filter(t => t.id === tab.id);
          switchTab(tab.id);
        } else if (action === 'close') {
          closeTab(tab.id);
        }
      });
    });
  }

  // --- NAVIGATION & DIRECTORY READING ---
  async function navigateTo(targetPath, addToHistory = true) {
    if (!targetPath) return;

    let resolved = targetPath.trim();
    const cleanLower = resolved.toLowerCase().replace(/^[\\/]+|[\\/]+$/g, '');
    if (cleanLower === 'trash' || cleanLower === 'recycle' || cleanLower === 'recycle bin' || cleanLower === 'recycle-bin' || cleanLower === 'shell:recyclebinfolder') {
      resolved = 'recycle-bin';
    } else if (/^[a-zA-Z]:$/.test(resolved)) {
      resolved += '\\';
    }

    // Cache current viewport scroll position and active selection before leaving
    if (state.currentPath && el.primaryViewport) {
      state.historyScrollMap.set(state.currentPath, {
        scrollTop: el.primaryViewport.scrollTop,
        scrollLeft: el.primaryViewport.scrollLeft,
        activePath: state.activeItem ? state.activeItem.path : null
      });
    }

    const res = await api.readDir(resolved);
    if (!res.success) {
      showErrorModal('Access Denied or Path Not Found', res.error || 'Could not open folder.');
      return;
    }

    state.currentPath = res.currentPath;
    state.rawItems = res.items || [];
    state.selectedIndices.clear();
    state.activeItem = null;
    state.isSearching = false;

    const isRecycle = (state.currentPath === 'Recycle Bin' || state.currentPath === 'recycle-bin');
    if (el.recycleBinBanner) {
      if (isRecycle) {
        el.recycleBinBanner.style.display = 'flex';
        const count = (res.items || []).length;
        const totalSize = (res.items || []).reduce((acc, it) => acc + (it.size || 0), 0);
        if (el.recycleBinBannerMeta) {
          el.recycleBinBannerMeta.textContent = `${count} item${count !== 1 ? 's' : ''}${count > 0 ? ` (${formatBytes(totalSize)})` : ''}`;
        }
      } else {
        el.recycleBinBanner.style.display = 'none';
      }
    }

    // Apply filtering (hidden files, live search query)
    applyItemFilter();
    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
    if (activeTab) {
      activeTab.path = res.currentPath;
      if (addToHistory) {
        activeTab.history = activeTab.history.slice(0, activeTab.historyIndex + 1);
        activeTab.history.push(res.currentPath);
        activeTab.historyIndex = activeTab.history.length - 1;
      }
    }

    // Check folder view preferences (media_1790263700052.png)
    const folderPref = state.folderViewPreferences && state.folderViewPreferences[res.currentPath];
    if (folderPref && folderPref !== state.viewMode) {
      setViewMode(folderPref);
    }

    // Sort items
    sortCurrentItems();

    // Render breadcrumbs & address
    renderBreadcrumbs(res.currentPath);
    updateNavButtons();
    renderTabs();

    // Setup Miller Columns if active
    if (state.viewMode === 'columns') {
      await setupMillerColumns(res.currentPath);
    } else {
      renderCurrentView();
    }

    updateStatusBar();
    highlightSidebarActive();

    // Restore scroll position and re-select exited folder or previous item
    const cachedScroll = state.historyScrollMap.get(res.currentPath);
    let targetSelectIdx = -1;

    if (state.pendingSelect) {
      const targetName = state.pendingSelect.toLowerCase();
      targetSelectIdx = state.items.findIndex(it => it.name && it.name.toLowerCase() === targetName);
      state.pendingSelect = null;
    } else if (state.lastExitedFolder) {
      const exitedNorm = state.lastExitedFolder.replace(/[/\\]+$/, '').toLowerCase();
      targetSelectIdx = state.items.findIndex(it => it.path && it.path.replace(/[/\\]+$/, '').toLowerCase() === exitedNorm);
      state.lastExitedFolder = null;
    } else if (cachedScroll && cachedScroll.activePath) {
      targetSelectIdx = state.items.findIndex(it => it.path === cachedScroll.activePath);
    }

    if (targetSelectIdx !== -1) {
      selectItemByIndex(targetSelectIdx);
    }

    if (el.primaryViewport) {
      if (cachedScroll) {
        el.primaryViewport.scrollTop = cachedScroll.scrollTop || 0;
        el.primaryViewport.scrollLeft = cachedScroll.scrollLeft || 0;
      } else {
        el.primaryViewport.scrollTop = 0;
        el.primaryViewport.scrollLeft = 0;
      }
    }

    if (targetSelectIdx !== -1) {
      scrollActiveItemIntoView();
    }

    if (state.viewOptionsOpen) {
      openViewOptionsPanel();
    }

    if (window.innerWidth <= 768 && el.sidebar && el.sidebar.classList.contains('open-mobile')) {
      toggleSidebar(false);
    }
  }

  function isSystemOrHidden(item) {
    if (item.isHidden) return true;
    if (item.name.startsWith('$') || item.name.startsWith('.')) return true;
    if (item.name.startsWith('~') || item.name.endsWith('~') || item.name.includes('~lock~')) return true;
    const lower = item.name.toLowerCase();
    const sysFiles = ['hiberfil.sys', 'pagefile.sys', 'swapfile.sys', 'dumpstack.log', 'dumpstack.log.tmp', 'system volume information'];
    return sysFiles.includes(lower);
  }

  function applyItemFilter() {
    let list = state.rawItems || [];
    if (!state.showHidden) {
      list = list.filter(item => !isSystemOrHidden(item));
    }
    if (state.filterQuery && state.filterQuery.trim()) {
      const q = state.filterQuery.trim().toLowerCase();
      list = list.filter(item => item.name.toLowerCase().includes(q));
    }
    state.items = list;
    sortCurrentItems();
  }

  function sortItemList(list) {
    if (!Array.isArray(list)) return list;
    return list.sort((a, b) => {
      // Folders always first
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;

      if (state.sortField === 'name') {
        return state.sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (state.sortField === 'size') {
        return state.sortAsc ? (a.size || 0) - (b.size || 0) : (b.size || 0) - (a.size || 0);
      }
      if (state.sortField === 'mtime') {
        return state.sortAsc ? (new Date(a.mtime) - new Date(b.mtime)) : (new Date(b.mtime) - new Date(a.mtime));
      }
      if (state.sortField === 'extension') {
        return state.sortAsc ? (a.extension || '').localeCompare(b.extension || '') : (b.extension || '').localeCompare(a.extension || '');
      }
      return 0;
    });
  }

  function sortCurrentItems() {
    if (Array.isArray(state.items)) {
      sortItemList(state.items);
    }
    if (Array.isArray(state.millerColumns)) {
      state.millerColumns.forEach(col => {
        if (Array.isArray(col.items)) {
          sortItemList(col.items);
        }
      });
    }
  }

  function getParentPath(dirPath) {
    if (!dirPath || typeof dirPath !== 'string') return null;
    const norm = dirPath.trim().replace(/[/\\]+$/, '');
    if (!norm) return null;

    // Check if it's already a root: e.g. 'C:', 'C:\', 'C:/', '/', '\'
    if (/^[a-zA-Z]:$/i.test(norm) || /^[a-zA-Z]:[/\\]$/i.test(norm) || norm === '/' || norm === '\\') {
      return null;
    }

    // Handle UNC paths e.g. \\server\share or \\server\share\folder
    if (norm.startsWith('\\\\') || norm.startsWith('//')) {
      const isBackslash = norm.startsWith('\\\\');
      const sep = isBackslash ? '\\' : '/';
      const parts = norm.split(/[/\\]+/).filter(Boolean);
      if (parts.length <= 2) return null; // Already at \\server\share root
      parts.pop();
      return (isBackslash ? '\\\\' : '//') + parts.join(sep);
    }

    // Standard Windows drive path: e.g. C:\Users\hp or C:/Users/hp
    const driveMatch = norm.match(/^([a-zA-Z]:)[/\\]?(.*)$/i);
    if (driveMatch) {
      const drive = driveMatch[1].toUpperCase();
      const rest = driveMatch[2];
      if (!rest) return null; // Already at drive root
      const parts = rest.split(/[/\\]+/).filter(Boolean);
      if (parts.length <= 1) return drive + '\\';
      parts.pop();
      return drive + '\\' + parts.join('\\');
    }

    // Unix-style path: e.g. /home/user
    const lastSlash = Math.max(norm.lastIndexOf('/'), norm.lastIndexOf('\\'));
    if (lastSlash > 0) {
      return norm.substring(0, lastSlash);
    } else if (lastSlash === 0) {
      return '/';
    }
    return null;
  }

  function updateNavButtons() {
    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
    if (!activeTab) return;
    el.btnBack.disabled = activeTab.historyIndex <= 0;
    el.btnForward.disabled = activeTab.historyIndex >= activeTab.history.length - 1;
    
    // Parent folder check
    const parentPath = getParentPath(state.currentPath);
    el.btnUp.disabled = !parentPath;
    el.btnUp.title = parentPath ? `Up to ${parentPath} (Alt+Up)` : 'Already at root folder (Alt+Up)';
  }

  function goBack() {
    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
    if (!activeTab || activeTab.historyIndex <= 0) return;
    state.lastExitedFolder = state.currentPath;
    activeTab.historyIndex--;
    const prevPath = activeTab.history[activeTab.historyIndex];
    navigateTo(prevPath, false);
  }

  function goForward() {
    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
    if (!activeTab || activeTab.historyIndex >= activeTab.history.length - 1) return;
    state.lastExitedFolder = state.currentPath;
    activeTab.historyIndex++;
    const nextPath = activeTab.history[activeTab.historyIndex];
    navigateTo(nextPath, false);
  }

  function goUp() {
    const parentPath = getParentPath(state.currentPath);
    if (!parentPath) {
      showToast(`Already at root directory (${state.currentPath || 'Root'})`, 'info');
      return;
    }
    state.lastExitedFolder = state.currentPath;
    navigateTo(parentPath);
  }

  // --- BREADCRUMBS & ADDRESS BAR ---
  function renderBreadcrumbs(dirPath) {
    el.breadcrumbsTrail.innerHTML = '';
    const normLower = (dirPath || '').trim().toLowerCase().replace(/^[\\/]+|[\\/]+$/g, '');
    if (normLower === 'recycle bin' || normLower === 'recycle-bin' || normLower === 'trash') {
      const crumb = document.createElement('div');
      crumb.className = 'crumb-item active';
      crumb.textContent = 'Recycle Bin';
      crumb.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateTo('recycle-bin');
      });
      el.breadcrumbsTrail.appendChild(crumb);
      el.pathInput.value = 'Recycle Bin';
      return;
    }

    const parts = dirPath.split('\\').filter(Boolean);
    
    let accumulated = '';
    parts.forEach((part, index) => {
      if (index === 0) {
        accumulated = part + '\\';
      } else {
        accumulated += (accumulated.endsWith('\\') ? '' : '\\') + part;
      }

      const isCurrent = index === parts.length - 1;
      const crumb = document.createElement('div');
      crumb.className = `crumb-item ${isCurrent ? 'active' : ''}`;
      crumb.textContent = (index === 0 && /^[a-zA-Z]:$/.test(part)) ? `${part}\\` : part;
      const target = accumulated;
      crumb.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateTo(target);
      });

      // Enable ancestor breadcrumbs as interactive folder drop targets
      if (!isCurrent) {
        crumb.title = `Navigate or drag items here to move into ${target}`;
        setupFolderDropTarget(crumb, target);
      }

      el.breadcrumbsTrail.appendChild(crumb);

      if (index < parts.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'crumb-sep';
        sep.textContent = '›';
        el.breadcrumbsTrail.appendChild(sep);
      }
    });

    el.pathInput.value = dirPath;
  }

  function toggleAddressInput(showInput) {
    if (showInput) {
      el.breadcrumbsTrail.style.display = 'none';
      el.pathInput.style.display = 'block';
      el.pathInput.value = state.currentPath;
      el.pathInput.focus();
      el.pathInput.select();
    } else {
      el.breadcrumbsTrail.style.display = 'flex';
      el.pathInput.style.display = 'none';
    }
  }

  // --- VIEWS ENGINE ---
  function updateViewButtons() {
    [el.btnViewColumns, el.btnViewList, el.btnViewGrid, el.btnViewGallery].forEach(btn => {
      if (btn) btn.classList.toggle('active', btn.dataset.view === state.viewMode);
    });
    if (el.btnTogglePreviewPane) {
      el.btnTogglePreviewPane.classList.toggle('active', state.previewPaneOpen);
    }
    el.statusViewMode.textContent = state.viewMode.toUpperCase();
    el.zoomSliderContainer.style.display = state.viewMode === 'grid' ? 'flex' : 'none';
  }

  function setViewMode(mode) {
    state.viewMode = mode;
    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
    if (activeTab) activeTab.viewMode = mode;
    updateViewButtons();

    // macOS Reference 4: Gallery View pairs with the Right Inspector Pane
    if (mode === 'gallery') {
      if (!state.previewPaneOpen) {
        state.previewPaneOpen = true;
        if (el.previewPane) el.previewPane.style.display = 'flex';
        if (el.previewPaneResizer) el.previewPaneResizer.style.display = 'block';
        if (el.btnTogglePreviewPane) el.btnTogglePreviewPane.classList.add('active');
      }
    }

    if (mode === 'columns') {
      setupMillerColumns(state.currentPath);
    } else {
      renderCurrentView();
    }
  }

  function renderCurrentView() {
    if (state.viewMode === 'list') {
      renderListView();
    } else if (state.viewMode === 'grid') {
      renderGridView();
    } else if (state.viewMode === 'gallery') {
      renderGalleryView();
    } else if (state.viewMode === 'columns') {
      renderMillerColumns();
    }
    renderPreviewPane();
  }

  function formatKind(item) {
    if (item.isDirectory) return 'Folder';
    const ext = (item.extension || '').toLowerCase();
    const map = {
      '.png': 'PNG image',
      '.jpg': 'JPEG image',
      '.jpeg': 'JPEG image',
      '.webp': 'WebP image',
      '.gif': 'GIF image',
      '.svg': 'SVG image',
      '.bmp': 'Bitmap image',
      '.ico': 'Icon file',
      '.mp4': 'MPEG-4 movie',
      '.mov': 'QuickTime movie',
      '.webm': 'WebM video',
      '.mp3': 'MP3 audio',
      '.wav': 'WAV audio',
      '.ogg': 'Ogg audio',
      '.m4a': 'Apple MPEG-4 audio',
      '.pdf': 'PDF document',
      '.txt': 'Plain text document',
      '.md': 'Markdown document',
      '.json': 'JSON document',
      '.js': 'JavaScript source',
      '.ts': 'TypeScript source',
      '.jsx': 'React JSX component',
      '.tsx': 'React TSX component',
      '.py': 'Python source file',
      '.html': 'HTML document',
      '.css': 'CSS stylesheet',
      '.dart': 'Dart source',
      '.rs': 'Rust source',
      '.cpp': 'C++ source',
      '.zip': 'ZIP archive',
      '.rar': 'RAR archive',
      '.7z': '7-Zip archive',
      '.tar': 'TAR archive',
      '.gz': 'GZip archive',
      '.tgz': 'GZip TAR archive',
      '.bz2': 'BZip2 archive',
      '.xz': 'XZ archive',
      '.iso': 'Optical Disc Image (ISO)',
      '.cab': 'Cabinet archive',
      '.zst': 'Zstandard archive',
      '.jar': 'Java archive',
      '.csv': 'CSV spreadsheet'
    };
    return map[ext] || (ext ? ext.toUpperCase().replace('.', '') + ' document' : 'Document');
  }

  function formatDateFull(isoString) {
    if (!isoString) return '--';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) + ' at ' + d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  // --- DRAG & DROP CORE SUBSYSTEM ---
  function parseDroppedPaths(dataTransfer) {
    if (!dataTransfer) return [];
    // 1. Files dropped from external Desktop / Explorer
    if (dataTransfer.files && dataTransfer.files.length > 0) {
      const files = Array.from(dataTransfer.files);
      const paths = files.map(f => {
        try {
          if (api.getPathForFile) return api.getPathForFile(f);
        } catch {}
        return f.path || '';
      }).filter(Boolean);
      if (paths.length > 0) return paths;
    }
    // 2. Internal drag and drop (JSON array or single string)
    const text = dataTransfer.getData('text/plain') || '';
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

  async function handleDroppedItems(e, targetDir, defaultAction = 'move') {
    e.preventDefault();
    e.stopPropagation();
    if (!targetDir) return false;

    const paths = parseDroppedPaths(e.dataTransfer);
    if (paths && paths.length > 0) {
      const normTarget = targetDir.replace(/[\\/]+$/, '').toLowerCase();
      // Filter out invalid drops (dropping directory into itself or dropping item onto its own parent)
      const validPaths = paths.filter(p => {
        if (!p) return false;
        const normP = p.replace(/[\\/]+$/, '').toLowerCase();
        // Cannot drop into itself
        if (normP === normTarget) return false;
        // Cannot drop directory into a subpath of itself
        if (normTarget.startsWith(normP + '\\') || normTarget.startsWith(normP + '/')) return false;
        // If moving into same parent directory, it is a no-op
        const parentP = normP.replace(/[\\/][^\\/]+$/, '');
        if (!e.ctrlKey && defaultAction === 'move' && parentP === normTarget) return false;
        return true;
      });

      if (validPaths.length === 0) return false;

      const isCopy = e.ctrlKey || defaultAction === 'copy';
      if (isCopy) {
        await api.copyItems(validPaths, targetDir);
        showToast(`Copied ${validPaths.length} item${validPaths.length > 1 ? 's' : ''}`, 'success');
      } else {
        await api.moveItems(validPaths, targetDir);
        showToast(`Moved ${validPaths.length} item${validPaths.length > 1 ? 's' : ''}`, 'success');
      }
      return true;
    }

    // Web fallback for files without OS paths
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      let imported = 0;
      for (const f of files) {
        try {
          const reader = new FileReader();
          await new Promise(res => {
            reader.onload = async () => {
              const b64 = (reader.result || '').split(',')[1] || '';
              await api.createFile(targetDir, f.name, b64, 'base64');
              imported++;
              res();
            };
            reader.readAsDataURL(f);
          });
        } catch (err) {
          console.error(err);
        }
      }
      if (imported > 0) {
        showToast(`Imported ${imported} file${imported > 1 ? 's' : ''}`, 'success');
        return true;
      }
    }
    return false;
  }

  function setupItemDragSource(elTarget, item) {
    if (!elTarget || !item) return;
    elTarget.draggable = true;
    elTarget.addEventListener('dragstart', (e) => {
      let dragItems = [item];
      const mainIdx = state.items.findIndex(it => it.path === item.path);
      if (mainIdx !== -1 && state.selectedIndices.has(mainIdx) && state.selectedIndices.size > 1) {
        dragItems = Array.from(state.selectedIndices).map(i => state.items[i]).filter(Boolean);
      }
      const paths = dragItems.map(it => it.path);

      // 1. Text payload (single path for 1 item, or JSON array for multi-select)
      const textData = paths.length === 1 ? paths[0] : JSON.stringify(paths);
      e.dataTransfer.setData('text/plain', textData);

      // 2. URI-list payload for external browsers, code editors and terminals
      const uriList = paths.map(p => 'file:///' + p.replace(/\\/g, '/')).join('\r\n');
      try {
        e.dataTransfer.setData('text/uri-list', uriList);
      } catch {}

      // 3. DownloadURL for Chromium drag-out
      try {
        if (paths.length === 1 && !item.isDirectory) {
          const fileUrl = 'file:///' + item.path.replace(/\\/g, '/');
          e.dataTransfer.setData('DownloadURL', `application/octet-stream:${item.name}:${fileUrl}`);
        }
      } catch {}

      e.dataTransfer.effectAllowed = 'copyMove';

      // 4. Native OS drag session via Electron IPC to drag into external apps (Photoshop, Desktop, Chrome, Explorer)
      if (window.myFilesAPI && typeof window.myFilesAPI.startDrag === 'function') {
        window.myFilesAPI.startDrag(paths);
      }

      const badge = document.createElement('div');
      badge.className = 'drag-ghost-badge';
      badge.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
        <span>${dragItems.length > 1 ? `${dragItems.length} items` : item.name}</span>
      `;
      document.body.appendChild(badge);
      e.dataTransfer.setDragImage(badge, 20, 20);
      setTimeout(() => badge.remove(), 0);
    });
  }

  function setupFolderDropTarget(elFolder, targetPathOrGetter, onDropSuccess) {
    if (!elFolder) return;
    let springTimer = null;
    const getPath = () => typeof targetPathOrGetter === 'function' ? targetPathOrGetter() : targetPathOrGetter;

    elFolder.addEventListener('dragover', (e) => {
      const targetPath = getPath();
      if (!targetPath) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
      elFolder.classList.add('folder-drop-active');
      if (!springTimer) {
        elFolder.classList.add('folder-spring-hover');
        springTimer = setTimeout(() => {
          elFolder.classList.remove('folder-spring-hover');
          navigateTo(targetPath);
          springTimer = null;
        }, 700);
      }
    });

    elFolder.addEventListener('dragleave', () => {
      elFolder.classList.remove('folder-drop-active');
      elFolder.classList.remove('folder-spring-hover');
      if (springTimer) {
        clearTimeout(springTimer);
        springTimer = null;
      }
    });

    elFolder.addEventListener('drop', async (e) => {
      if (springTimer) {
        clearTimeout(springTimer);
        springTimer = null;
      }
      elFolder.classList.remove('folder-drop-active');
      elFolder.classList.remove('folder-spring-hover');
      const targetPath = getPath();
      if (!targetPath) return;
      const didDrop = await handleDroppedItems(e, targetPath, 'move');
      if (didDrop && typeof onDropSuccess === 'function') {
        onDropSuccess();
      }
    });
  }

  function setupSidebarFavoritesPinDrop(containerEl) {
    if (!containerEl) return;
    containerEl.addEventListener('dragover', (e) => {
      if (e.target.closest('.sidebar-item')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'link';
      containerEl.classList.add('drop-target');
    });
    containerEl.addEventListener('dragleave', (e) => {
      if (!containerEl.contains(e.relatedTarget)) {
        containerEl.classList.remove('drop-target');
      }
    });
    containerEl.addEventListener('drop', async (e) => {
      if (e.target.closest('.sidebar-item')) return;
      e.preventDefault();
      e.stopPropagation();
      containerEl.classList.remove('drop-target');
      const paths = parseDroppedPaths(e.dataTransfer);
      if (!paths || paths.length === 0) return;
      let pinnedCount = 0;
      for (const p of paths) {
        try {
          const details = await api.getFileDetails(p);
          if (details && details.isDirectory) {
            await pinFolderToSidebar(p);
            pinnedCount++;
          }
        } catch {}
      }
      if (pinnedCount > 0) {
        showToast(`Pinned ${pinnedCount} folder${pinnedCount > 1 ? 's' : ''} to Favorites`, 'success');
      }
    });
  }

  // --- 4. GALLERY VIEW (macOS Finder Reference) ---
  function renderGalleryView() {
    el.primaryViewport.innerHTML = '';
    if (!state.items || state.items.length === 0) {
      el.primaryViewport.innerHTML = `
        <div class="empty-state">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
          <div class="empty-state-title">This folder is empty</div>
        </div>
      `;
      return;
    }

    if (!state.activeItem || !state.items.some(it => it.path === state.activeItem.path)) {
      state.activeItem = state.items[0];
      state.selectedIndices.clear();
      state.selectedIndices.add(0);
      state.activeItemRotation = 0;
    }

    const currentItem = state.activeItem;
    const container = document.createElement('div');
    container.className = 'gallery-container';

    // 1. Top Hero Section
    const hero = document.createElement('div');
    hero.className = 'gallery-hero';

    const ext = (currentItem.extension || '').toLowerCase();
    if (isImageFile(currentItem)) {
      hero.innerHTML = `
        <div class="gallery-hero-card">
          <img class="gallery-hero-img" id="galleryHeroImg" style="transform: rotate(${state.activeItemRotation}deg);" src="${getMediaUrl(currentItem.path)}" alt="${escapeHtml(currentItem.name)}" onerror="window.handleThumbError(this);" />
          <div style="display:none;width:84px;height:84px;align-items:center;justify-content:center;">${getFileIcon(currentItem)}</div>
          <div class="gallery-hero-actions">
            <button class="gallery-action-chip" id="galleryRotateBtn" title="Rotate (R)">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              Rotate
            </button>
            <button class="gallery-action-chip" id="galleryQlBtn" title="Quick Look (Space)">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Quick Look
            </button>
          </div>
        </div>
      `;
      const rotBtn = hero.querySelector('#galleryRotateBtn');
      if (rotBtn) {
        rotBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          state.activeItemRotation = (state.activeItemRotation + 90) % 360;
          const img = hero.querySelector('#galleryHeroImg');
          if (img) img.style.transform = `rotate(${state.activeItemRotation}deg)`;
        });
      }
      const qlBtn = hero.querySelector('#galleryQlBtn');
      if (qlBtn) {
        qlBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openQuickLook(currentItem);
        });
      }
    } else if (isVideoFile(currentItem)) {
      hero.innerHTML = `
        <div class="gallery-hero-card">
          <video class="gallery-hero-media" src="${getMediaUrl(currentItem.path)}" controls autoplay preload="metadata"></video>
        </div>
      `;
    } else if (isAudioFile(currentItem)) {
      hero.innerHTML = `
        <div class="gallery-hero-card" style="padding: 36px; width: 440px; display: flex; flex-direction: column; gap: 18px; align-items: center;">
          <div style="width: 76px; height: 76px;">${getFileIcon(currentItem)}</div>
          <div style="font-size: 16px; font-weight: 700; text-align: center; word-break: break-all;">${escapeHtml(currentItem.name)}</div>
          <div style="font-size: 12.5px; color: var(--text-dim);">${formatKind(currentItem)} · ${formatBytes(currentItem.size)}</div>
          <audio src="${getMediaUrl(currentItem.path)}" controls autoplay style="width: 100%;"></audio>
        </div>
      `;
    } else {
      hero.innerHTML = `
        <div class="gallery-hero-card" id="galleryHeroCard" style="padding: 36px; width: 420px; display: flex; flex-direction: column; gap: 14px; text-align: center; align-items: center; cursor: ${currentItem.isDirectory ? 'pointer' : 'default'};">
          <div style="width: 84px; height: 84px;">${getFileIcon(currentItem)}</div>
          <div style="font-size: 16px; font-weight: 700; word-break: break-all;">${escapeHtml(currentItem.name)}</div>
          <div style="font-size: 12.5px; color: var(--text-dim);">${currentItem.isDirectory ? 'Folder' : (formatKind(currentItem) + ' · ' + formatBytes(currentItem.size))}</div>
          <div style="display: flex; gap: 10px; width: 100%; margin-top: 8px;">
            ${!currentItem.isDirectory ? `
              <button class="tool-btn" id="galleryHeroQl" style="flex: 1; justify-content: center; height: 34px;">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Quick Look
              </button>
            ` : ''}
            <button class="tool-btn btn-primary" id="galleryHeroOpen" style="flex: 1; justify-content: center; height: 34px;">
              ${currentItem.isRecycleBinItem ? 'Restore Item' : (currentItem.isDirectory ? 'Open Folder' : 'Open')}
            </button>
          </div>
        </div>
      `;
      const heroCard = hero.querySelector('#galleryHeroCard');
      if (heroCard) {
        heroCard.addEventListener('dblclick', () => {
          if (currentItem.isRecycleBinItem) {
            handleRecycleItemDoubleClick(currentItem);
            return;
          }
          if (currentItem.isDirectory) navigateTo(currentItem.path);
          else api.openItem(currentItem.path);
        });
      }
      const qlBtn = hero.querySelector('#galleryHeroQl');
      if (qlBtn) {
        qlBtn.addEventListener('click', () => openQuickLook(currentItem));
      }
      const openBtn = hero.querySelector('#galleryHeroOpen');
      if (openBtn) {
        openBtn.addEventListener('click', () => {
          if (currentItem.isRecycleBinItem) {
            handleRecycleItemDoubleClick(currentItem);
            return;
          }
          if (currentItem.isDirectory) navigateTo(currentItem.path);
          else api.openItem(currentItem.path);
        });
      }
    }

    container.appendChild(hero);

    // 2. Bottom Scrubber Bar (Horizontal Thumbnail Strip - Finder reference)
    const scrubber = document.createElement('div');
    scrubber.className = 'gallery-scrubber';

    state.items.forEach((item, idx) => {
      const isSelected = item.path === currentItem.path;
      const scrubberItem = document.createElement('div');
      scrubberItem.className = `scrubber-item ${isSelected ? 'selected' : ''}`;
      scrubberItem.dataset.index = idx;
      setupItemDragSource(scrubberItem, item);

      let thumbHtml = '';
      if (isImageFile(item) && state.iconPreview !== false) {
        thumbHtml = `
          <img class="scrubber-thumb" src="${getMediaUrl(item.path)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="window.handleThumbError(this);" />
          <div style="display:none;width:40px;height:40px;align-items:center;justify-content:center;">${getFileIcon(item)}</div>
        `;
      } else {
        thumbHtml = `<div class="scrubber-icon">${getFileIcon(item)}</div>`;
      }

      scrubberItem.innerHTML = `
        ${thumbHtml}
        ${state.showThumbFilename !== false ? `<span class="scrubber-name" title="${item.name}">${item.name}</span>` : ''}
      `;

      scrubberItem.addEventListener('click', () => {
        state.selectedIndices.clear();
        state.selectedIndices.add(idx);
        state.activeItem = item;
        state.activeItemRotation = 0;
        renderGalleryView();
        renderPreviewPane();
        updateStatusBar();
      });

      scrubberItem.addEventListener('dblclick', () => {
        if (item.isRecycleBinItem) {
          handleRecycleItemDoubleClick(item);
          return;
        }
        if (item.isDirectory) navigateTo(item.path);
        else api.openItem(item.path);
      });

      scrubber.appendChild(scrubberItem);
    });

    container.appendChild(scrubber);
    el.primaryViewport.appendChild(container);

    const activeScrubberEl = scrubber.querySelector('.scrubber-item.selected');
    if (activeScrubberEl) {
      activeScrubberEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  // --- RIGHT PREVIEW PANE / INSPECTOR (macOS Reference) ---
  function togglePreviewPane() {
    state.previewPaneOpen = !state.previewPaneOpen;
    if (el.previewPane) {
      el.previewPane.style.display = state.previewPaneOpen ? 'flex' : 'none';
    }
    if (el.previewPaneResizer) {
      el.previewPaneResizer.style.display = state.previewPaneOpen ? 'block' : 'none';
    }
    if (el.btnTogglePreviewPane) {
      el.btnTogglePreviewPane.classList.toggle('active', state.previewPaneOpen);
    }
    if (state.previewPaneOpen) {
      renderPreviewPane();
    }
  }

  function renderPreviewPane() {
    if (!state.previewPaneOpen || !el.previewPaneBody) return;
    const item = state.activeItem;
    if (!item) {
      el.previewPaneBody.innerHTML = `
        <div class="empty-state" style="height: 100%;">
          <span class="empty-state-sub">Select an item to inspect</span>
        </div>
      `;
      return;
    }

    const ext = (item.extension || '').toLowerCase();
    const tag = state.tags[item.path] || '';
    const isImage = isImageFile(item);
    const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi', '.m4v'];
    const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];
    const docExts = ['.docx', '.docm', '.xlsx', '.xlsm', '.pptx', '.pptm'];
    const textExts = [
      '.txt', '.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.json', '.html', '.htm',
      '.css', '.scss', '.sass', '.less', '.md', '.markdown', '.py', '.rs', '.go', '.c',
      '.cpp', '.h', '.hpp', '.cs', '.java', '.kt', '.swift', '.php', '.rb', '.sh',
      '.bash', '.zsh', '.bat', '.cmd', '.ps1', '.yaml', '.yml', '.xml', '.svg', '.sql',
      '.log', '.env', '.ini', '.toml', '.conf', '.cfg', '.csv', '.tsv', '.diff', '.patch'
    ];
    const isVideo = !item.isDirectory && videoExts.includes(ext);
    const isAudio = !item.isDirectory && audioExts.includes(ext);
    const isDoc = !item.isDirectory && docExts.includes(ext);
    const isText = !item.isDirectory && textExts.includes(ext) && (item.size < 1024 * 1024);

    let heroHtml = '';
    if (isImage) {
      heroHtml = `
        <img class="pp-hero-thumb" id="ppHeroThumb" style="transform: rotate(${state.activeItemRotation}deg);" src="${getMediaUrl(item.path)}" alt="${escapeHtml(item.name)}" onerror="window.handleThumbError(this);" />
        <div style="display:none;width:80px;height:80px;align-items:center;justify-content:center;">${getFileIcon(item)}</div>
      `;
    } else if (isVideo) {
      heroHtml = `
        <video class="pp-hero-video" src="${getMediaUrl(item.path)}" controls preload="metadata"></video>
      `;
    } else if (isAudio) {
      heroHtml = `
        <div class="pp-hero-audio-card">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          <audio class="pp-hero-audio" src="${getMediaUrl(item.path)}" controls preload="metadata"></audio>
        </div>
      `;
    } else if (ext === '.pdf') {
      heroHtml = `
        <div class="pp-pdf-preview-wrap">
          <canvas id="ppPdfCanvas" class="pp-pdf-canvas"></canvas>
          <div class="pp-pdf-badge" id="ppPdfBadge">PDF</div>
        </div>
      `;
    } else if (isDoc) {
      heroHtml = `
        <div class="pp-doc-excerpt" id="ppHeroDocExcerpt" style="width: 100%; max-height: 140px; overflow: hidden; padding: 12px 14px; background: var(--bg-surface-elevated); border: 1px solid var(--border-medium); border-radius: var(--radius-md); font-size: 11.5px; line-height: 1.5; color: var(--text-muted); word-break: break-word;">
          <div style="font-weight: 700; color: var(--text-main); margin-bottom: 6px;">${escapeHtml(formatKind(item))}</div>
          <div class="pp-doc-excerpt-text" id="ppHeroDocText" style="opacity: 0.85;">Loading document excerpt...</div>
        </div>
      `;
    } else if (isText) {
      heroHtml = `<pre class="pp-hero-text-preview" id="ppHeroTextPreview">Loading preview...</pre>`;
    } else {
      heroHtml = `<div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">${getFileIcon(item)}</div>`;
    }

    const kindStr = formatKind(item);
    const sizeStr = item.isDirectory ? 'Folder' : formatBytes(item.size);

    el.previewPaneBody.innerHTML = `
      <div class="pp-hero-wrap">
        ${heroHtml}
        <button class="pp-hero-hover-btn" id="ppHeroQuickLookBtn" title="Open Quick Look (Space)">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 13px; height: 13px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          <span>Quick Look</span>
        </button>
      </div>

      <div class="pp-meta-title-block">
        <div class="pp-file-title">${item.name}</div>
        <div class="pp-file-subtitle" id="ppFileSubtitle">${kindStr} · ${sizeStr}</div>
      </div>

      ${item.isRecycleBinItem ? `
      <div>
        <div class="pp-section-header">
          <span class="pp-section-title">Recycle Bin Item</span>
        </div>
        <div class="pp-info-table">
          <span class="pp-info-label">Original Location</span>
          <span class="pp-info-val" style="word-break: break-all; font-size: 11px;">${escapeHtml(item.originalLocation || item.originalPath || '--')}</span>
          <span class="pp-info-label">Date Deleted</span>
          <span class="pp-info-val">${formatDateFull(item.mtime)}</span>
          <span class="pp-info-label">Kind</span>
          <span class="pp-info-val">${kindStr}</span>
          <span class="pp-info-label">Size</span>
          <span class="pp-info-val">${item.isDirectory ? 'Folder' : formatBytes(item.size)}</span>
        </div>
      </div>
      <div>
        <div class="pp-section-title">Quick Actions</div>
        <div class="pp-quick-actions-grid">
          <button class="pp-action-btn" id="ppBtnRestore" title="Restore this item to its original location">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            <span>Restore</span>
          </button>
          <button class="pp-action-btn danger" id="ppBtnDeletePermanently" title="Permanently delete this item">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            <span>Delete</span>
          </button>
        </div>
        <div class="pp-footer-hint">This item is in the Recycle Bin. Restoring will place it back into its original folder.</div>
      </div>
      ` : `
      <div>
        <div class="pp-section-header">
          <span class="pp-section-title">Information</span>
          <button class="pp-toggle-link" id="ppToggleMore">${state.inspectorExpanded ? 'Show Less' : 'Show More'}</button>
        </div>
        <div class="pp-info-table">
          <span class="pp-info-label">Created</span>
          <span class="pp-info-val">${formatDateFull(item.birthtime || item.mtime)}</span>
          <span class="pp-info-label">Modified</span>
          <span class="pp-info-val">${formatDateFull(item.mtime)}</span>
          <span class="pp-info-label">Last opened</span>
          <span class="pp-info-val">${formatDateFull(item.atime || item.mtime)}</span>
          ${isImage ? `
            <span class="pp-info-label">Dimensions</span>
            <span class="pp-info-val" id="ppInfoDimensions">Calculating...</span>
          ` : ''}
          ${state.inspectorExpanded ? `
            <span class="pp-info-label">Kind</span>
            <span class="pp-info-val">${kindStr}</span>
            <span class="pp-info-label">Size</span>
            <span class="pp-info-val">${item.isDirectory ? 'Folder' : formatBytes(item.size)}</span>
            <span class="pp-info-label">Location</span>
            <span class="pp-info-val" style="font-size: 11px;">${item.path}</span>
          ` : ''}
        </div>
      </div>

      <div>
        <div class="pp-section-title">Tags</div>
        <div class="pp-tags-palette">
          <span class="ctx-tag-btn empty ${tag === '' ? 'selected' : ''}" data-tag="" title="No Tag"></span>
          <span class="ctx-tag-btn red ${tag === 'red' ? 'selected' : ''}" data-tag="red" title="Red"></span>
          <span class="ctx-tag-btn orange ${tag === 'orange' ? 'selected' : ''}" data-tag="orange" title="Orange"></span>
          <span class="ctx-tag-btn yellow ${tag === 'yellow' ? 'selected' : ''}" data-tag="yellow" title="Yellow"></span>
          <span class="ctx-tag-btn green ${tag === 'green' ? 'selected' : ''}" data-tag="green" title="Green"></span>
          <span class="ctx-tag-btn blue ${tag === 'blue' ? 'selected' : ''}" data-tag="blue" title="Blue"></span>
          <span class="ctx-tag-btn purple ${tag === 'purple' ? 'selected' : ''}" data-tag="purple" title="Purple"></span>
          <span class="ctx-tag-btn gray ${tag === 'gray' ? 'selected' : ''}" data-tag="gray" title="Gray"></span>
        </div>
      </div>

      <div>
        <div class="pp-section-title">Quick Actions</div>`}
        ${!item.isDirectory && isArchiveFile(item) ? `
          <div class="pp-quick-actions-grid">
            <button class="pp-action-btn" id="ppBtnExtractArchive" title="Extract All Files">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              <span>Extract All</span>
            </button>
            <button class="pp-action-btn" id="ppBtnMarkup" title="Inspect Archive Contents">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span>Inspect</span>
            </button>
            <button class="pp-action-btn" id="ppBtnMore" title="More Actions">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></svg>
              <span>More...</span>
            </button>
          </div>
          <div class="pp-footer-hint">Compressed archive. Click Extract All to unpack into a folder.</div>
        ` : (!item.isDirectory && isMediaFile(item)) ? `
          <div class="pp-quick-actions-grid">
            <button class="pp-action-btn" id="ppBtnVlcPlay" title="${state.vlcInstalled ? 'Play in VLC Player' : 'Play in Default Player'}">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #f97316;"><path d="M12 2l-7 16h14L12 2z" stroke="#f97316" fill="#f97316" fill-opacity="0.15"/><line x1="8.5" y1="10" x2="15.5" y2="10" stroke="#f97316"/><line x1="6.8" y1="14" x2="17.2" y2="14" stroke="#f97316"/><path d="M3 20c0 1.1 4 2 9 2s9-.9 9-2" stroke="#ea580c"/></svg>
              <span>${state.vlcInstalled ? 'Play in VLC' : 'Play Media'}</span>
            </button>
            <button class="pp-action-btn" id="ppBtnVlcEnqueue" title="${state.vlcInstalled ? 'Add to VLC Playlist' : 'Quick Look Preview'}">
              ${state.vlcInstalled
                ? `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg><span>Enqueue</span>`
                : `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span>Preview</span>`
              }
            </button>
            <button class="pp-action-btn" id="ppBtnMore" title="More Actions">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></svg>
              <span>More...</span>
            </button>
          </div>
          <div class="pp-footer-hint">${state.vlcInstalled ? 'Hardware accelerated playback via VLC Player.' : 'Plays smoothly via system default media player.'}</div>
        ` : `
          <div class="pp-quick-actions-grid">
            <button class="pp-action-btn" id="ppBtnRotate" title="Rotate 90° Clockwise">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
              <span>Rotate Right</span>
            </button>
            <button class="pp-action-btn" id="ppBtnMarkup" title="Quick Look Preview (Space)">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span>Preview</span>
            </button>
            <button class="pp-action-btn" id="ppBtnMore" title="More Actions">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></svg>
              <span>More...</span>
            </button>
          </div>
          <div class="pp-footer-hint">Inspect details, preview media, and manage file tags.</div>
        `}
      </div>
    `;

    // Calculate image dimensions dynamically
    if (isImage) {
      const img = new Image();
      img.onload = () => {
        const dimStr = `${img.naturalWidth} × ${img.naturalHeight}`;
        const subEl = el.previewPaneBody.querySelector('#ppFileSubtitle');
        if (subEl) subEl.textContent = `${kindStr} · ${dimStr} · ${sizeStr}`;
        const dimEl = el.previewPaneBody.querySelector('#ppInfoDimensions');
        if (dimEl) dimEl.textContent = dimStr;
      };
      img.src = getMediaUrl(item.path);
    } else if (ext === '.pdf') {
      const cvs = el.previewPaneBody.querySelector('#ppPdfCanvas');
      const badge = el.previewPaneBody.querySelector('#ppPdfBadge');
      if (cvs && window.pdfjsLib) {
        try {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
          window.pdfjsLib.getDocument(getMediaUrl(item.path)).promise.then(pdf => {
            if (badge) badge.textContent = `${pdf.numPages} ${pdf.numPages === 1 ? 'Page' : 'Pages'}`;
            const subEl = el.previewPaneBody.querySelector('#ppFileSubtitle');
            if (subEl) subEl.textContent = `PDF Document · ${pdf.numPages} Pages · ${sizeStr}`;
            pdf.getPage(1).then(page => {
              const viewport = page.getViewport({ scale: 0.35 * (window.devicePixelRatio || 1) });
              cvs.width = viewport.width;
              cvs.height = viewport.height;
              cvs.style.width = `${viewport.width / (window.devicePixelRatio || 1)}px`;
              cvs.style.height = `${viewport.height / (window.devicePixelRatio || 1)}px`;
              page.render({
                canvasContext: cvs.getContext('2d'),
                viewport: viewport
              });
            });
          }).catch(() => {});
        } catch {}
      }
    } else if (isDoc) {
      const ppDocExcerpt = el.previewPaneBody.querySelector('#ppHeroDocText');
      if (ppDocExcerpt) {
        api.readFileContent(item.path).then(preview => {
          if (state.activeItem && state.activeItem.path === item.path && ppDocExcerpt) {
            if (preview && preview.content) {
              const snippet = preview.content.substring(0, 260);
              ppDocExcerpt.textContent = snippet + (preview.content.length > 260 ? '...' : '');
              if (preview.wordsCount || preview.paragraphsCount) {
                const subEl = el.previewPaneBody.querySelector('#ppFileSubtitle');
                if (subEl) subEl.textContent = `${preview.docType || kindStr} · ${preview.wordsCount || preview.paragraphsCount} words/items · ${sizeStr}`;
              }
            } else {
              ppDocExcerpt.textContent = `${preview.docType || 'Document'} (${formatBytes(item.size)})`;
            }
          }
        }).catch(() => {
          if (ppDocExcerpt) ppDocExcerpt.textContent = '(Preview unavailable)';
        });
      }
    } else if (isText) {
      const ppTextPreview = el.previewPaneBody.querySelector('#ppHeroTextPreview');
      if (ppTextPreview) {
        api.readFileContent(item.path).then(preview => {
          if (state.activeItem && state.activeItem.path === item.path && ppTextPreview) {
            const lines = (preview.content || '').split('\n').slice(0, 14).join('\n');
            ppTextPreview.textContent = lines || '(Empty file)';
          }
        }).catch(() => {
          if (ppTextPreview) ppTextPreview.textContent = '(Preview unavailable)';
        });
      }
    }

    const btnHeroQl = el.previewPaneBody.querySelector('#ppHeroQuickLookBtn');
    if (btnHeroQl) {
      btnHeroQl.addEventListener('click', (e) => {
        e.stopPropagation();
        openQuickLook(item);
      });
    }

    // Toggle Show More / Show Less
    const toggleBtn = el.previewPaneBody.querySelector('#ppToggleMore');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        state.inspectorExpanded = !state.inspectorExpanded;
        renderPreviewPane();
      });
    }

    // Quick Actions
    const btnRotate = el.previewPaneBody.querySelector('#ppBtnRotate');
    if (btnRotate) {
      btnRotate.addEventListener('click', () => {
        state.activeItemRotation = (state.activeItemRotation + 90) % 360;
        const heroImg = document.getElementById('galleryHeroImg');
        if (heroImg) heroImg.style.transform = `rotate(${state.activeItemRotation}deg)`;
        const ppThumb = document.getElementById('ppHeroThumb');
        if (ppThumb) ppThumb.style.transform = `rotate(${state.activeItemRotation}deg)`;
      });
    }

    const btnVlcPlay = el.previewPaneBody.querySelector('#ppBtnVlcPlay');
    if (btnVlcPlay) {
      btnVlcPlay.addEventListener('click', async () => {
        await api.playInVlc(item.path, { enqueue: false });
      });
    }

    const btnVlcEnqueue = el.previewPaneBody.querySelector('#ppBtnVlcEnqueue');
    if (btnVlcEnqueue) {
      btnVlcEnqueue.addEventListener('click', async () => {
        if (state.vlcInstalled) {
          await api.playInVlc(item.path, { enqueue: true });
          showToast('Added to VLC Playlist', 'success');
        } else {
          openQuickLook(item);
        }
      });
    }

    const btnExtractArchive = el.previewPaneBody.querySelector('#ppBtnExtractArchive');
    if (btnExtractArchive) {
      btnExtractArchive.addEventListener('click', () => performExtractArchive(item, false));
    }

    const btnMarkup = el.previewPaneBody.querySelector('#ppBtnMarkup');
    if (btnMarkup) {
      btnMarkup.addEventListener('click', () => openQuickLook(item));
    }

    const ppBtnRestore = el.previewPaneBody.querySelector('#ppBtnRestore');
    if (ppBtnRestore) {
      ppBtnRestore.addEventListener('click', () => handleRestoreSelectedItem(item));
    }

    const ppBtnDeletePerm = el.previewPaneBody.querySelector('#ppBtnDeletePermanently');
    if (ppBtnDeletePerm) {
      ppBtnDeletePerm.addEventListener('click', () => handleDeletePermanentlyItem(item));
    }

    const btnMore = el.previewPaneBody.querySelector('#ppBtnMore');
    if (btnMore) {
      btnMore.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = btnMore.getBoundingClientRect();
        showContextMenu(rect.left, rect.top, item);
      });
    }

    // Tags assignment
    el.previewPaneBody.querySelectorAll('.ctx-tag-btn').forEach(tagBtn => {
      tagBtn.addEventListener('click', async () => {
        await assignTag(item.path, tagBtn.dataset.tag);
        renderPreviewPane();
        if (state.viewMode === 'grid') renderGridView();
        else if (state.viewMode === 'list') renderListView();
        else if (state.viewMode === 'columns') renderMillerColumns();
      });
    });
  }

  // --- 1. MILLER COLUMNS VIEW (Finder's signature feature) ---
  async function setupMillerColumns(rootPath) {
    if (!rootPath) return;
    const cleanLower = rootPath.trim().toLowerCase().replace(/^[\\/]+|[\\/]+$/g, '');
    if (cleanLower === 'recycle bin' || cleanLower === 'recycle-bin' || cleanLower === 'trash') {
      const items = (state.currentPath === 'Recycle Bin' && state.rawItems && state.rawItems.length > 0)
        ? state.rawItems
        : ((await api.readDir('recycle-bin'))?.items || []);
      const sortedItems = sortItemList(items);
      const selectedItem = sortedItems.length > 0 ? (sortedItems.find(item => state.showHidden || !isSystemOrHidden(item)) || sortedItems[0]) : null;
      state.millerColumns = [{
        path: 'Recycle Bin',
        items: sortedItems,
        selectedItem: selectedItem || null
      }];
      state.activeColumnIndex = 0;
      if (selectedItem) {
        state.activeItem = selectedItem;
      }
      renderMillerColumns();
      renderPreviewPane();
      return;
    }

    const normalized = rootPath.replace(/\//g, '\\');
    const isWindowsDrive = /^[a-zA-Z]:/.test(normalized);
    let parts = [];
    if (isWindowsDrive) {
      const drive = normalized.substring(0, 2);
      const rest = normalized.substring(2).split('\\').filter(Boolean);
      parts = [drive, ...rest];
    } else {
      parts = normalized.split('\\').filter(Boolean);
    }
    state.millerColumns = [];

    let currentStep = '';
    for (let i = 0; i < parts.length; i++) {
      if (i === 0) {
        currentStep = parts[0].includes(':') ? (parts[0] + '\\') : ('\\' + parts[0]);
      } else {
        currentStep += (currentStep.endsWith('\\') ? '' : '\\') + parts[i];
      }

      const res = await api.readDir(currentStep);
      if (res.success) {
        const nextPart = parts[i + 1] ? parts[i + 1].toLowerCase() : null;
        const sortedItems = sortItemList(res.items || []);
        let selectedItem = null;
        if (nextPart) {
          selectedItem = sortedItems.find(item => item.name.toLowerCase() === nextPart);
        } else if (i === parts.length - 1) {
          if (state.lastExitedFolder) {
            const exitedBase = state.lastExitedFolder.replace(/[/\\]+$/, '').split(/[/\\]/).pop().toLowerCase();
            selectedItem = sortedItems.find(item => item.name.toLowerCase() === exitedBase) || null;
          }
          if (!selectedItem && state.activeItem) {
            selectedItem = sortedItems.find(item => item.path === state.activeItem.path) || null;
          }
          if (!selectedItem && sortedItems.length > 0) {
            // Auto-select first visible item like macOS Finder
            selectedItem = sortedItems.find(item => state.showHidden || !isSystemOrHidden(item)) || sortedItems[0];
          }
        }
        state.millerColumns.push({
          path: currentStep,
          items: sortedItems,
          selectedItem: selectedItem || null
        });
      }
    }

    if (state.millerColumns.length === 0) {
      const res = await api.readDir(rootPath);
      if (res.success) {
        const sortedItems = sortItemList(res.items || []);
        const firstVisible = sortedItems.find(it => state.showHidden || !isSystemOrHidden(it)) || sortedItems[0];
        state.millerColumns.push({
          path: res.currentPath || rootPath,
          items: sortedItems,
          selectedItem: firstVisible || null
        });
      }
    }

    // Expand the child column for the selected folder if it's a directory
    const leafCol = state.millerColumns[state.millerColumns.length - 1];
    if (leafCol && leafCol.selectedItem) {
      state.activeItem = leafCol.selectedItem;
      if (leafCol.selectedItem.isDirectory && !leafCol.selectedItem.isRecycleBinItem) {
        const childRes = await api.readDir(leafCol.selectedItem.path);
        if (childRes.success) {
          state.millerColumns.push({
            path: leafCol.selectedItem.path,
            items: sortItemList(childRes.items || []),
            selectedItem: null
          });
        }
      }
    }

    state.activeColumnIndex = Math.max(0, state.millerColumns.length - 2);
    renderMillerColumns();
  }

  function renderMillerColumns() {
    el.primaryViewport.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'columns-container';

    if (typeof state.activeColumnIndex !== 'number' || state.activeColumnIndex < 0 || state.activeColumnIndex >= state.millerColumns.length) {
      state.activeColumnIndex = Math.max(0, state.millerColumns.length - 1);
    }

    state.millerColumns.forEach((col, colIdx) => {
      const colEl = document.createElement('div');
      colEl.className = `column-pane ${colIdx === state.activeColumnIndex ? 'active-col' : ''}`;
      colEl.dataset.colIndex = colIdx;

      // Column Header with path segment name, item count & interactive sort indicator
      const colSegName = col.path.replace(/[\\/]$/, '').split(/[\\/]/).pop() || col.path;
      const colHeader = document.createElement('div');
      colHeader.className = 'column-header';

      const sortFieldLabels = {
        name: 'Name',
        mtime: 'Date',
        size: 'Size',
        extension: 'Kind'
      };
      const activeSortLabel = sortFieldLabels[state.sortField] || 'Name';
      const sortArrow = state.sortAsc ? '▲' : '▼';

      colHeader.innerHTML = `
        <div class="column-header-left">
          <span class="column-header-title" title="${escapeHtml(col.path)}">${escapeHtml(colSegName)}</span>
          <span class="column-header-count">${(col.items || []).length}</span>
        </div>
        <div class="column-header-actions">
          <button class="column-header-sort-btn" title="Sorted by ${activeSortLabel} (${state.sortAsc ? 'Ascending' : 'Descending'}). Click to reverse, right-click to change field." aria-label="Sort: ${activeSortLabel}">
            <span class="column-sort-label">${activeSortLabel}</span>
            <span class="column-sort-arrow">${sortArrow}</span>
          </button>
        </div>
      `;

      const sortBtn = colHeader.querySelector('.column-header-sort-btn');
      if (sortBtn) {
        sortBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          state.sortAsc = !state.sortAsc;
          sortCurrentItems();
          renderMillerColumns();
          if (typeof showToast === 'function') {
            showToast(`Sorted by ${activeSortLabel} (${state.sortAsc ? 'Ascending' : 'Descending'})`, 'info');
          }
        });

        sortBtn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const fields = ['name', 'mtime', 'size', 'extension'];
          const nextIdx = (fields.indexOf(state.sortField) + 1) % fields.length;
          state.sortField = fields[nextIdx];
          sortCurrentItems();
          renderMillerColumns();
          if (typeof showToast === 'function') {
            showToast(`Sorted by ${sortFieldLabels[state.sortField]} (${state.sortAsc ? 'Ascending' : 'Descending'})`, 'info');
          }
        });
      }

      colEl.appendChild(colHeader);

      const itemsWrap = document.createElement('div');
      itemsWrap.className = 'column-items-wrap';

      // Focus column on click
      colEl.addEventListener('click', (e) => {
        if (!e.target.closest('.column-item')) {
          state.activeColumnIndex = colIdx;
          container.querySelectorAll('.column-pane').forEach((p, idx) => {
            p.classList.toggle('active-col', idx === colIdx);
          });
          if (col.selectedItem) {
            state.activeItem = col.selectedItem;
            updateStatusBar();
            renderPreviewPane();
          }
        }
      });

      if (!col.items || col.items.length === 0) {
        itemsWrap.innerHTML = `
          <div class="empty-state" style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--text-dim); padding: 32px 16px;">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width: 28px; height: 28px; opacity: 0.45;"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
            <span class="empty-state-sub" style="font-size: 12px;">Folder is empty</span>
          </div>`;
      } else {
        col.items.forEach(item => {
          if (!state.showHidden && isSystemOrHidden(item)) return;
          const isHidden = isSystemOrHidden(item);
          const isSelected = col.selectedItem && col.selectedItem.path === item.path;
          const tag = state.tags[item.path];
          const itemEl = document.createElement('div');
          itemEl.className = `column-item ${isSelected ? 'selected' : ''} ${isHidden ? 'item-hidden' : ''}`;
          itemEl.dataset.path = item.path;

          itemEl.innerHTML = `
            <div style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${getFileIcon(item, false)}
            </div>
            ${tag ? `<span class="tag-dot ${tag}"></span>` : ''}
            <span class="column-name" title="${escapeHtml(item.name)}">${escapeHtml(formatItemName(item))}</span>
            ${item.isDirectory ? '<span class="column-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 10px; height: 10px;"><polyline points="9 18 15 12 9 6"/></svg></span>' : ''}
          `;

          // Click handling
          itemEl.addEventListener('click', (e) => {
            handleColumnItemClick(colIdx, item, e);
          });

          // Double click
          itemEl.addEventListener('dblclick', () => {
            if (item.isRecycleBinItem) {
              handleRecycleItemDoubleClick(item);
              return;
            }
            if (item.isDirectory) {
              navigateTo(item.path);
            } else {
              api.openItem(item.path);
            }
          });

          // Right click context menu
          itemEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectColumnItem(colIdx, item);
            showContextMenu(e.clientX, e.clientY, item);
          });

          setupItemDragSource(itemEl, item);
          if (item.isDirectory) {
            setupFolderDropTarget(itemEl, item.path, async () => {
              const res = await api.readDir(col.path);
              if (res.success) {
                col.items = res.items;
                renderMillerColumns();
              }
            });
          }

          itemsWrap.appendChild(itemEl);

          if (isSelected) {
            requestAnimationFrame(() => {
              itemEl.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            });
          }
        });
      }

      colEl.appendChild(itemsWrap);

      // Column pane drop target (empty area of column)
      colEl.addEventListener('dragover', (e) => {
        if (e.target.closest('.column-item')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
        colEl.classList.add('drop-target');
      });
      colEl.addEventListener('dragleave', (e) => {
        if (!colEl.contains(e.relatedTarget)) {
          colEl.classList.remove('drop-target');
        }
      });
      colEl.addEventListener('drop', async (e) => {
        if (e.target.closest('.column-item')) return;
        colEl.classList.remove('drop-target');
        const didDrop = await handleDroppedItems(e, col.path, 'copy');
        if (didDrop) {
          const res = await api.readDir(col.path);
          if (res.success) {
            col.items = sortItemList(res.items || []);
            renderMillerColumns();
          }
        }
      });

      container.appendChild(colEl);
    });

    // If last column has a selected file or Recycle Bin item, show file inspector panel!
    const lastCol = state.millerColumns[state.millerColumns.length - 1];
    if (lastCol && lastCol.selectedItem && (!lastCol.selectedItem.isDirectory || lastCol.selectedItem.isRecycleBinItem)) {
      const previewCol = renderFilePreviewColumn(lastCol.selectedItem);
      container.appendChild(previewCol);
    }

    el.primaryViewport.appendChild(container);

    // Scroll container smoothly to the right
    setTimeout(() => {
      container.scrollLeft = container.scrollWidth;
    }, 50);
  }

  async function handleColumnItemClick(colIdx, item, e) {
    state.activeColumnIndex = colIdx;
    selectColumnItem(colIdx, item);

    if (item.isRecycleBinItem) {
      state.millerColumns = state.millerColumns.slice(0, colIdx + 1);
      state.millerColumns[colIdx].selectedItem = item;
      state.activeItem = item;
      updateStatusBar();
      renderMillerColumns();
      renderPreviewPane();
      return;
    }

    if (item.isDirectory) {
      // Cut off columns beyond colIdx
      state.millerColumns = state.millerColumns.slice(0, colIdx + 1);
      state.millerColumns[colIdx].selectedItem = item;

      // Load children in next column
      const res = await api.readDir(item.path);
      if (res.success) {
        state.millerColumns.push({
          path: item.path,
          items: sortItemList(res.items || []),
          selectedItem: null
        });
      }
      state.currentPath = item.path;
      state.rawItems = res.items || [];
      applyItemFilter();
      renderBreadcrumbs(item.path);
    } else {
      // Selected a file: truncate columns after colIdx
      state.millerColumns = state.millerColumns.slice(0, colIdx + 1);
      state.millerColumns[colIdx].selectedItem = item;
    }

    state.activeItem = item;
    updateStatusBar();
    renderMillerColumns();
    renderPreviewPane();

    if (!item.isDirectory && state.openAction === 'single' && e && !e.ctrlKey && !e.shiftKey) {
      api.openItem(item.path);
    }
  }

  function selectColumnItem(colIdx, item) {
    state.activeColumnIndex = colIdx;
    if (state.millerColumns[colIdx]) {
      state.millerColumns[colIdx].selectedItem = item;
      state.activeItem = item;
    }
  }

  function renderFilePreviewColumn(item) {
    const pane = document.createElement('div');
    pane.className = 'column-preview-pane';
    const tag = state.tags[item.path] || '';
    const isImg = isImageFile(item);
    const isVid = isVideoFile(item);
    const isAud = isAudioFile(item);

    let iconOrThumbHtml = '';
    if (isImg) {
      iconOrThumbHtml = `
        <div class="cp-thumb-wrap" style="width: 100%; display: flex; justify-content: center; align-items: center; margin-bottom: 12px; min-height: 120px;">
          <img class="cp-thumb-img" src="${getMediaUrl(item.path)}" alt="${escapeHtml(item.name)}" style="max-width: 100%; max-height: 160px; object-fit: contain; border-radius: var(--radius-md); box-shadow: 0 4px 16px rgba(0,0,0,0.3); border: 1px solid var(--border-medium);" onerror="window.handleThumbError(this);" />
          <div style="display:none;width:64px;height:64px;align-items:center;justify-content:center;">${getFileIcon(item)}</div>
        </div>
      `;
    } else if (isVid) {
      iconOrThumbHtml = `
        <div class="cp-thumb-wrap" style="width: 100%; display: flex; justify-content: center; align-items: center; margin-bottom: 12px; min-height: 120px;">
          <video src="${getMediaUrl(item.path)}" controls preload="metadata" style="max-width: 100%; max-height: 160px; border-radius: var(--radius-md); box-shadow: 0 4px 16px rgba(0,0,0,0.3); border: 1px solid var(--border-medium);"></video>
        </div>
      `;
    } else if (isAud) {
      iconOrThumbHtml = `
        <div class="cp-thumb-wrap" style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 12px;">
          <div class="cp-icon-wrap" style="width: 64px; height: 64px;">${getFileIcon(item)}</div>
          <audio src="${getMediaUrl(item.path)}" controls preload="metadata" style="width: 100%; height: 32px;"></audio>
        </div>
      `;
    } else {
      iconOrThumbHtml = `
        <div class="cp-icon-wrap">
          ${getFileIcon(item)}
        </div>
      `;
    }

    if (item.isRecycleBinItem) {
      pane.innerHTML = `
        ${iconOrThumbHtml}
        <div class="cp-title">${escapeHtml(item.name)}</div>

        <div class="cp-meta-grid">
          <span class="cp-label">Original Loc</span>
          <span class="cp-val" style="word-break: break-all; font-size: 11px;">${escapeHtml(item.originalLocation || item.originalPath || '--')}</span>
          <span class="cp-label">Date Deleted</span>
          <span class="cp-val">${formatDate(item.mtime)}</span>
          <span class="cp-label">Kind</span>
          <span class="cp-val">${formatKind(item)}</span>
          <span class="cp-label">Size</span>
          <span class="cp-val">${item.isDirectory ? 'Folder' : formatBytes(item.size)}</span>
        </div>

        <div class="cp-actions" style="display: flex; flex-direction: column; gap: 8px; margin-top: 14px;">
          <button class="tool-btn btn-primary" id="cpBtnRestore" style="width: 100%; justify-content: center;">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            Restore Item
          </button>
          <button class="tool-btn danger" id="cpBtnDeletePermanently" style="width: 100%; justify-content: center;">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            Delete Permanently
          </button>
        </div>
      `;
      pane.querySelector('#cpBtnRestore').addEventListener('click', () => handleRestoreSelectedItem(item));
      pane.querySelector('#cpBtnDeletePermanently').addEventListener('click', () => handleDeletePermanentlyItem(item));
      return pane;
    }

    pane.innerHTML = `
      ${iconOrThumbHtml}
      <div class="cp-title">${escapeHtml(item.name)}</div>

      <div class="cp-meta-grid">
        <span class="cp-label">Kind</span>
        <span class="cp-val">${formatKind(item)}</span>
        <span class="cp-label">Size</span>
        <span class="cp-val">${formatBytes(item.size)}</span>
        ${isImg ? `
          <span class="cp-label">Dimensions</span>
          <span class="cp-val" id="cpDimensionsVal">Calculating...</span>
        ` : ''}
        <span class="cp-label">Modified</span>
        <span class="cp-val">${formatDate(item.mtime)}</span>
        <span class="cp-label">Tag</span>
        <span class="cp-val">
          ${tag ? `<span class="tag-dot ${tag}"></span> ${tag}` : 'None'}
        </span>
      </div>

      <div class="cp-actions">
        <button class="tool-btn btn-primary" id="cpBtnQuickLook" style="width: 100%; justify-content: center;">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Quick Look (Space)
        </button>
        <button class="tool-btn" id="cpBtnOpen" style="width: 100%; justify-content: center;">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open with Default App
        </button>
      </div>
    `;

    if (isImg) {
      const testImg = new Image();
      testImg.onload = () => {
        const dimEl = pane.querySelector('#cpDimensionsVal');
        if (dimEl) dimEl.textContent = `${testImg.naturalWidth} × ${testImg.naturalHeight}`;
      };
      testImg.src = getMediaUrl(item.path);
    }

    pane.querySelector('#cpBtnQuickLook').addEventListener('click', () => openQuickLook(item));
    pane.querySelector('#cpBtnOpen').addEventListener('click', () => api.openItem(item.path));

    return pane;
  }

  // --- SORT GROUPING / GROUP BY SUBSYSTEM ---
  const groupLabelMap = {
    none: 'None',
    kind: 'Kind / Type',
    date: 'Date Modified',
    size: 'Size',
    name: 'Name (A-Z)'
  };

  function getGroupedItems(items, groupBy) {
    if (!items || items.length === 0 || !groupBy || groupBy === 'none') {
      return null;
    }

    const groupMap = new Map();

    const getGroupInfo = (item) => {
      if (groupBy === 'kind') {
        if (item.isDirectory) return { id: 'kind-folder', title: 'Folders', order: 0 };
        const ext = (item.extension || '').toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp', '.ico', '.tiff', '.avif'].includes(ext)) {
          return { id: 'kind-image', title: 'Images', order: 1 };
        }
        if (['.mp4', '.mov', '.webm', '.mkv', '.avi', '.wmv', '.flv', '.m4v'].includes(ext)) {
          return { id: 'kind-video', title: 'Videos', order: 2 };
        }
        if (['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'].includes(ext)) {
          return { id: 'kind-audio', title: 'Audio', order: 3 };
        }
        if (['.pdf', '.txt', '.md', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.csv', '.rtf', '.odt', '.pages', '.epub'].includes(ext)) {
          return { id: 'kind-doc', title: 'Documents', order: 4 };
        }
        if (['.js', '.ts', '.jsx', '.tsx', '.py', '.html', '.css', '.json', '.dart', '.rs', '.cpp', '.c', '.h', '.cs', '.java', '.go', '.php', '.sh', '.bat', '.cmd', '.ps1', '.sql', '.xml', '.yaml', '.yml'].includes(ext)) {
          return { id: 'kind-code', title: 'Code & Scripts', order: 5 };
        }
        if (['.zip', '.rar', '.7z', '.tar', '.gz', '.tgz', '.bz2', '.tbz2', '.xz', '.txz', '.iso', '.cab', '.zst', '.arj', '.lzh', '.jar'].includes(ext)) {
          return { id: 'kind-archive', title: 'Archives', order: 6 };
        }
        return { id: 'kind-other', title: 'Other Files', order: 7 };
      }

      if (groupBy === 'date') {
        if (!item.mtime) return { id: 'date-unknown', title: 'Unknown Date', order: 99 };
        const d = new Date(item.mtime);
        if (isNaN(d.getTime())) return { id: 'date-unknown', title: 'Unknown Date', order: 99 };
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const itemTime = d.getTime();
        const oneDay = 86400000;

        if (itemTime >= startOfToday) {
          return { id: 'date-today', title: 'Today', order: 0 };
        } else if (itemTime >= startOfToday - oneDay) {
          return { id: 'date-yesterday', title: 'Yesterday', order: 1 };
        } else if (itemTime >= startOfToday - 6 * oneDay) {
          return { id: 'date-this-week', title: 'Earlier this week', order: 2 };
        } else if (itemTime >= startOfToday - 13 * oneDay) {
          return { id: 'date-last-week', title: 'Last week', order: 3 };
        } else if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
          return { id: 'date-this-month', title: 'Earlier this month', order: 4 };
        } else if (d.getFullYear() === now.getFullYear()) {
          return { id: 'date-this-year', title: 'Earlier this year', order: 5 };
        } else {
          return { id: 'date-older', title: 'A long time ago', order: 6 };
        }
      }

      if (groupBy === 'size') {
        if (item.isDirectory) return { id: 'size-folder', title: 'Folders', order: 0 };
        const sz = Number(item.size) || 0;
        if (sz >= 128 * 1024 * 1024) return { id: 'size-gigantic', title: 'Gigantic (> 128 MB)', order: 1 };
        if (sz >= 16 * 1024 * 1024) return { id: 'size-huge', title: 'Huge (16 MB - 128 MB)', order: 2 };
        if (sz >= 1024 * 1024) return { id: 'size-medium', title: 'Medium (1 MB - 16 MB)', order: 3 };
        if (sz >= 128 * 1024) return { id: 'size-small', title: 'Small (128 KB - 1 MB)', order: 4 };
        return { id: 'size-tiny', title: 'Tiny (< 128 KB)', order: 5 };
      }

      if (groupBy === 'name') {
        const firstChar = (item.name || '').trim().charAt(0).toUpperCase();
        if (firstChar >= 'A' && firstChar <= 'D') return { id: 'name-ad', title: 'A - D', order: 0 };
        if (firstChar >= 'E' && firstChar <= 'H') return { id: 'name-eh', title: 'E - H', order: 1 };
        if (firstChar >= 'I' && firstChar <= 'L') return { id: 'name-il', title: 'I - L', order: 2 };
        if (firstChar >= 'M' && firstChar <= 'P') return { id: 'name-mp', title: 'M - P', order: 3 };
        if (firstChar >= 'Q' && firstChar <= 'T') return { id: 'name-qt', title: 'Q - T', order: 4 };
        if (firstChar >= 'U' && firstChar <= 'Z') return { id: 'name-uz', title: 'U - Z', order: 5 };
        return { id: 'name-other', title: '0 - 9 & Symbols', order: 6 };
      }

      return { id: 'other', title: 'Other', order: 99 };
    };

    items.forEach((item, idx) => {
      const info = getGroupInfo(item);
      if (!groupMap.has(info.id)) {
        groupMap.set(info.id, {
          id: info.id,
          title: info.title,
          order: info.order,
          items: []
        });
      }
      groupMap.get(info.id).items.push({ item, index: idx });
    });

    return Array.from(groupMap.values()).sort((a, b) => a.order - b.order);
  }

  function createGroupHeaderElement(group) {
    const isCollapsed = state.collapsedGroups.has(group.id);
    const header = document.createElement('div');
    header.className = 'view-group-header';
    header.innerHTML = `
      <button class="view-group-toggle" aria-label="Toggle group">
        <svg class="group-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <span class="view-group-title">${escapeHtml(group.title)}</span>
      <span class="view-group-count">${group.items.length}</span>
      <div class="view-group-line"></div>
    `;

    header.addEventListener('click', (e) => {
      e.stopPropagation();
      const section = header.closest('.view-group-section');
      if (!section) return;
      if (state.collapsedGroups.has(group.id)) {
        state.collapsedGroups.delete(group.id);
        section.classList.remove('collapsed');
      } else {
        state.collapsedGroups.add(group.id);
        section.classList.add('collapsed');
      }
    });

    return header;
  }

  function setGroupBy(group) {
    state.groupBy = group || 'none';
    try {
      localStorage.setItem('myfiles_group_by', state.groupBy);
    } catch(e) {}
    document.querySelectorAll('#sortDropdown .dropdown-item[data-group]').forEach(item => {
      item.classList.toggle('active', item.dataset.group === state.groupBy);
    });
    if (el.voGroupSelect) {
      el.voGroupSelect.value = state.groupBy;
    }
    renderCurrentView();
    showToast(state.groupBy === 'none' ? 'Grouping turned off' : `Grouped by ${groupLabelMap[state.groupBy] || state.groupBy}`, 'info');
  }

  // --- 2. LIST VIEW (Hierarchical Tree Expansion - Reference 4) ---
  function renderListView() {
    el.primaryViewport.innerHTML = '';
    if (!state.items || state.items.length === 0) {
      el.primaryViewport.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-ring">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
          </div>
          <div class="empty-state-title">This folder is empty</div>
          <div class="empty-state-sub">Drop files here or use the ribbon to create items.</div>
          <div class="empty-state-chips">
            <button class="empty-chip" onclick="document.getElementById('btnNewFileMenu')?.click()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New File
            </button>
            <button class="empty-chip" onclick="document.getElementById('btnNewFolder')?.click()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Folder
            </button>
          </div>
        </div>
      `;
      return;
    }

    const container = document.createElement('div');
    container.className = 'list-container';

    // Header with sortable columns
    const header = document.createElement('div');
    header.className = 'list-header';
    const chkHeaderHtml = state.itemCheckboxes
      ? `<input type="checkbox" id="listCheckAll" class="item-checkbox" title="Select all items" style="margin-right: 8px;">`
      : '';
    header.innerHTML = `
      <div class="list-col list-col-name" data-sort="name">
        <div style="display: flex; align-items: center;">
          ${chkHeaderHtml}
          <span>Name ${state.sortField === 'name' ? (state.sortAsc ? '▲' : '▼') : ''}</span>
        </div>
      </div>
      ${state.colShowDate !== false ? `<div class="list-col list-col-date" data-sort="mtime">Date Modified ${state.sortField === 'mtime' ? (state.sortAsc ? '▲' : '▼') : ''}</div>` : ''}
      ${state.colShowType !== false ? `<div class="list-col list-col-type" data-sort="extension">Type ${state.sortField === 'extension' ? (state.sortAsc ? '▲' : '▼') : ''}</div>` : ''}
      ${state.colShowSize !== false ? `<div class="list-col list-col-size" data-sort="size">Size ${state.sortField === 'size' ? (state.sortAsc ? '▲' : '▼') : ''}</div>` : ''}
      ${state.colShowTag !== false ? `<div class="list-col list-col-tag">Tag</div>` : ''}
    `;

    header.querySelectorAll('.list-col[data-sort]').forEach(col => {
      col.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'listCheckAll') return;
        const field = col.dataset.sort;
        if (state.sortField === field) {
          state.sortAsc = !state.sortAsc;
        } else {
          state.sortField = field;
          state.sortAsc = true;
        }
        sortCurrentItems();
        renderListView();
      });
    });

    container.appendChild(header);

    // Single row generator
    function createListRowElement(item, depth = 0) {
      const row = document.createElement('div');
      const mainIdx = state.items.findIndex(it => it.path === item.path);
      const isSelected = mainIdx !== -1 ? state.selectedIndices.has(mainIdx) : (state.activeItem && state.activeItem.path === item.path);
        const isHidden = isSystemOrHidden(item);
        row.className = `list-row ${isSelected ? 'selected' : ''} ${isHidden ? 'item-hidden' : ''}`;
        if (mainIdx !== -1) row.dataset.index = mainIdx;
        row.draggable = true;

        const tag = state.tags[item.path] || '';
        const typeStr = item.isDirectory ? 'Folder' : (item.extension || 'File').toUpperCase().replace('.', '') + ' document';
        const isExpanded = state.expandedFolders.has(item.path);

        let expanderHtml = `<span class="list-expander spacer"></span>`;
        if (item.isDirectory) {
          expanderHtml = `
            <button class="list-expander ${isExpanded ? 'open' : ''}" title="${isExpanded ? 'Collapse' : 'Expand'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          `;
        }

        const chkRowHtml = state.itemCheckboxes
          ? `<input type="checkbox" class="item-checkbox" ${isSelected ? 'checked' : ''}>`
          : '';

        row.innerHTML = `
          <div class="list-cell list-cell-name" style="padding-left: ${12 + depth * 22}px;">
            ${chkRowHtml}
            ${expanderHtml}
            <div style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${getFileIcon(item, false)}
            </div>
            <span title="${escapeHtml(item.name)}">${escapeHtml(formatItemName(item))}</span>
          </div>
          ${state.colShowDate !== false ? `<div class="list-cell list-col-date">${formatDateFinder(item.mtime)}</div>` : ''}
          ${state.colShowType !== false ? `<div class="list-cell list-col-type">${typeStr}</div>` : ''}
          ${state.colShowSize !== false ? `<div class="list-cell list-col-size right">${item.isDirectory ? '--' : formatBytes(item.size)}</div>` : ''}
          ${state.colShowTag !== false ? `<div class="list-cell list-col-tag center">${tag ? `<span class="tag-dot inline ${tag}"></span>` : ''}</div>` : ''}
        `;

        if (state.itemCheckboxes) {
          const chk = row.querySelector('.item-checkbox');
          if (chk) {
            chk.addEventListener('click', (e) => {
              e.stopPropagation();
              const curIdx = state.items.findIndex(it => it.path === item.path);
              if (curIdx !== -1) {
                if (chk.checked) {
                  state.selectedIndices.add(curIdx);
                  state.activeItem = item;
                } else {
                  state.selectedIndices.delete(curIdx);
                  if (state.activeItem && state.activeItem.path === item.path) {
                    state.activeItem = state.selectedIndices.size > 0 ? state.items[Array.from(state.selectedIndices)[0]] : null;
                  }
                }
                updateStatusBar();
                reapplySelectionClasses();
                renderPreviewPane();
              }
            });
          }
        }

        if (item.isDirectory) {
          const expBtn = row.querySelector('.list-expander:not(.spacer)');
          if (expBtn) {
            expBtn.addEventListener('click', async (e) => {
              e.stopPropagation();
              if (state.expandedFolders.has(item.path)) {
                state.expandedFolders.delete(item.path);
              } else {
                const res = await api.readDir(item.path);
                if (res.success) {
                  state.expandedFolders.set(item.path, res.items);
                }
              }
              renderListView();
            });
          }
        }

        row.addEventListener('click', (e) => {
          const curIdx = state.items.findIndex(it => it.path === item.path);
          if (curIdx !== -1) {
            handleItemSelection(curIdx, e);
          } else {
            state.selectedIndices.clear();
            state.activeItem = item;
            updateStatusBar();
            reapplySelectionClasses();
          }
          renderPreviewPane();
        });

        // Middle-click folder opens in new tab
        row.addEventListener('auxclick', (e) => {
          if (e.button === 1 && item.isDirectory) {
            e.preventDefault();
            createTab(item.path);
            showToast(`Opened "${item.name}" in new tab`, 'info');
          }
        });

        row.addEventListener('dblclick', () => {
          if (item.isRecycleBinItem) {
            handleRecycleItemDoubleClick(item);
            return;
          }
          if (item.isDirectory) {
            navigateTo(item.path);
          } else {
            api.openItem(item.path);
          }
        });

        row.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          state.selectedIndices.clear();
          state.activeItem = item;
          renderListView();
          showContextMenu(e.clientX, e.clientY, item);
        });

        // Drag and drop handling
        setupItemDragSource(row, item);

        // Folder drop target cursor states & Spring-Loaded Folders
        if (item.isDirectory) {
          setupFolderDropTarget(row, item.path, () => navigateTo(state.currentPath, false));
        }
      return row;
    }

    function appendRows(itemsList, depth = 0, targetParent = container) {
      const frag = document.createDocumentFragment();
      itemsList.forEach((item) => {
        const row = createListRowElement(item, depth);
        frag.appendChild(row);
        if (item.isDirectory && state.expandedFolders.has(item.path)) {
          const children = state.expandedFolders.get(item.path) || [];
          appendRows(children, depth + 1, frag);
        }
      });
      targetParent.appendChild(frag);
    }

    const grouped = getGroupedItems(state.items, state.groupBy);
    if (grouped) {
      grouped.forEach(group => {
        const section = document.createElement('div');
        const isCollapsed = state.collapsedGroups.has(group.id);
        section.className = `view-group-section ${isCollapsed ? 'collapsed' : ''}`;
        section.dataset.groupId = group.id;

        const groupHeader = createGroupHeaderElement(group);
        section.appendChild(groupHeader);

        const body = document.createElement('div');
        body.className = 'view-group-body';

        appendRows(group.items.map(it => it.item), 0, body);
        section.appendChild(body);
        container.appendChild(section);
      });
    } else {
      if (state.expandedFolders.size === 0 && state.items.length > 80 && typeof VirtualScroller !== 'undefined') {
        new VirtualScroller({
          viewport: container,
          totalItems: state.items.length,
          itemHeight: state.compactMode ? 26 : 34,
          threshold: 80,
          renderItem: (idx) => createListRowElement(state.items[idx], 0)
        });
      } else {
        appendRows(state.items, 0, container);
      }
    }

    if (state.itemCheckboxes) {
      const allChk = header.querySelector('#listCheckAll');
      if (allChk && state.items) {
        allChk.checked = state.items.length > 0 && state.selectedIndices.size === state.items.length;
        allChk.addEventListener('click', (e) => {
          e.stopPropagation();
          if (allChk.checked) {
            selectAll();
          } else {
            deselectAll();
          }
        });
      }
    }

    el.primaryViewport.appendChild(container);
    container.scrollTop = 0;
    if (el.primaryViewport) {
      el.primaryViewport.scrollTop = 0;
      el.primaryViewport.scrollLeft = 0;
    }
  }

  // --- 3. GRID VIEW (Reference 1 & Reference 2) ---
  function renderGridView() {
    el.primaryViewport.innerHTML = '';
    if (!state.items || state.items.length === 0) {
      el.primaryViewport.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-ring">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
          </div>
          <div class="empty-state-title">This folder is empty</div>
          <div class="empty-state-sub">Drop files here or use the ribbon to create items.</div>
          <div class="empty-state-chips">
            <button class="empty-chip" onclick="document.getElementById('btnNewFileMenu')?.click()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New File
            </button>
            <button class="empty-chip" onclick="document.getElementById('btnNewFolder')?.click()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Folder
            </button>
          </div>
        </div>
      `;
      return;
    }

    function createGridItemElement(item, idx) {
      const isSelected = state.selectedIndices.has(idx);
      const isHidden = isSystemOrHidden(item);
      const itemEl = document.createElement('div');
      itemEl.className = `grid-item ${isSelected ? 'selected' : ''} ${isHidden ? 'item-hidden' : ''}`;
      itemEl.dataset.index = idx;
      itemEl.draggable = true;

      const tag = state.tags[item.path];
      const subLabel = item.isDirectory ? 'Folder' : formatBytes(item.size);
      const chkHtml = state.itemCheckboxes
        ? `<input type="checkbox" class="item-checkbox" ${isSelected ? 'checked' : ''} />`
        : '';

      itemEl.innerHTML = `
        ${chkHtml}
        <div class="grid-icon-wrap">
          ${getFileIcon(item, state.iconPreview !== false)}
        </div>
        ${state.showThumbFilename !== false ? `
          <div class="grid-name" title="${item.name}">
            ${tag ? `<span class="tag-dot inline ${tag}"></span>` : ''}
            <span class="grid-name-pill">${escapeHtml(formatItemName(item))}</span>
          </div>
          <span class="grid-sub">${subLabel}</span>
        ` : ''}
      `;

      if (state.itemCheckboxes) {
        const chk = itemEl.querySelector('.item-checkbox');
        if (chk) {
          chk.addEventListener('click', (e) => {
            e.stopPropagation();
            if (chk.checked) {
              state.selectedIndices.add(idx);
              state.activeItem = item;
            } else {
              state.selectedIndices.delete(idx);
              if (state.activeItem && state.activeItem.path === item.path) {
                state.activeItem = state.selectedIndices.size > 0 ? state.items[Array.from(state.selectedIndices)[0]] : null;
              }
            }
            updateStatusBar();
            reapplySelectionClasses();
            renderPreviewPane();
          });
        }
      }

      itemEl.addEventListener('click', (e) => {
        handleItemSelection(idx, e);
      });

      // Middle-click folder opens in new tab
      itemEl.addEventListener('auxclick', (e) => {
        if (e.button === 1 && item.isDirectory) {
          e.preventDefault();
          createTab(item.path);
          showToast(`Opened "${item.name}" in new tab`, 'info');
        }
      });

      itemEl.addEventListener('dblclick', () => {
        if (item.isRecycleBinItem) {
          handleRecycleItemDoubleClick(item);
          return;
        }
        if (item.isDirectory) {
          navigateTo(item.path);
        } else {
          api.openItem(item.path);
        }
      });

      itemEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.selectedIndices.clear();
        state.selectedIndices.add(idx);
        state.activeItem = item;
        renderGridView();
        showContextMenu(e.clientX, e.clientY, item);
      });

      // Drag and drop handling
      setupItemDragSource(itemEl, item);

      // Folder drop target cursor states & Spring-Loaded Folders
      if (item.isDirectory) {
        setupFolderDropTarget(itemEl, item.path, () => navigateTo(state.currentPath, false));
      }

      return itemEl;
    }

    const grouped = getGroupedItems(state.items, state.groupBy);
    if (grouped) {
      const wrapper = document.createElement('div');
      wrapper.className = 'grouped-grid-wrapper';

      grouped.forEach(group => {
        const section = document.createElement('div');
        const isCollapsed = state.collapsedGroups.has(group.id);
        section.className = `view-group-section ${isCollapsed ? 'collapsed' : ''}`;
        section.dataset.groupId = group.id;

        const groupHeader = createGroupHeaderElement(group);
        section.appendChild(groupHeader);

        const groupGrid = document.createElement('div');
        groupGrid.className = 'grid-container view-group-body';
        groupGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(var(--grid-card-size, 108px), 1fr))';
        groupGrid.style.gap = 'var(--grid-card-gap, 14px)';

        const groupFrag = document.createDocumentFragment();
        group.items.forEach(({ item, index }) => {
          groupFrag.appendChild(createGridItemElement(item, index));
        });
        groupGrid.appendChild(groupFrag);

        section.appendChild(groupGrid);
        wrapper.appendChild(section);
      });

      el.primaryViewport.appendChild(wrapper);
      wrapper.scrollTop = 0;
    } else {
      const container = document.createElement('div');
      container.className = 'grid-container';

      // Apply zoom sizing via responsive gear variables
      container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(var(--grid-card-size, 108px), 1fr))';
      container.style.gap = 'var(--grid-card-gap, 14px)';

      const frag = document.createDocumentFragment();
      state.items.forEach((item, idx) => {
        frag.appendChild(createGridItemElement(item, idx));
      });
      container.appendChild(frag);

      el.primaryViewport.appendChild(container);
      container.scrollTop = 0;
    }

    if (el.primaryViewport) {
      el.primaryViewport.scrollTop = 0;
      el.primaryViewport.scrollLeft = 0;
    }
  }

  let lastSelectedIndex = -1;

  function handleItemSelection(idx, e) {
    if (e && e.shiftKey && lastSelectedIndex !== -1) {
      const start = Math.min(lastSelectedIndex, idx);
      const end = Math.max(lastSelectedIndex, idx);
      if (!e.ctrlKey && !e.metaKey) {
        state.selectedIndices.clear();
      }
      for (let i = start; i <= end; i++) {
        state.selectedIndices.add(i);
      }
    } else if (e && (e.ctrlKey || e.metaKey)) {
      if (state.selectedIndices.has(idx)) {
        state.selectedIndices.delete(idx);
      } else {
        state.selectedIndices.add(idx);
      }
      lastSelectedIndex = idx;
    } else {
      state.selectedIndices.clear();
      state.selectedIndices.add(idx);
      lastSelectedIndex = idx;
    }
    state.activeItem = state.items[idx];
    updateStatusBar();
    reapplySelectionClasses();
    renderPreviewPane();

    // Single-click open interaction preference
    if (state.openAction === 'single' && e && !e.shiftKey && !e.ctrlKey && !e.metaKey && e.target && !e.target.classList.contains('item-checkbox')) {
      const targetItem = state.items[idx];
      if (targetItem) {
        if (targetItem.isDirectory) navigateTo(targetItem.path);
        else api.openItem(targetItem.path);
      }
    }
  }

  // --- NATIVE ARCHIVE & TOAST ENGINE ---
  const ARCHIVE_EXTS = new Set([
    '.zip', '.rar', '.7z', '.tar', '.gz', '.tgz', '.bz2', '.tbz2',
    '.xz', '.txz', '.iso', '.cab', '.zst', '.arj', '.lzh', '.jar'
  ]);

  function isArchiveFile(filePathOrItem) {
    if (!filePathOrItem) return false;
    const name = typeof filePathOrItem === 'string' ? filePathOrItem : (filePathOrItem.name || '');
    const lower = name.toLowerCase();
    if (lower.endsWith('.tar.gz') || lower.endsWith('.tar.bz2') || lower.endsWith('.tar.xz')) return true;
    const ext = (typeof filePathOrItem === 'string'
      ? (name.lastIndexOf('.') !== -1 ? name.substring(name.lastIndexOf('.')).toLowerCase() : '')
      : (filePathOrItem.extension || '')).toLowerCase();
    return ARCHIVE_EXTS.has(ext);
  }

  const MEDIA_EXTS = new Set([
    '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm',
    '.m4v', '.mpg', '.mpeg', '.m2ts', '.mts', '.ts', '.vob',
    '.3gp', '.ogv', '.divx', '.asf', '.rm', '.rmvb',
    '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma',
    '.opus', '.alac', '.aiff', '.mid', '.midi', '.m3u', '.m3u8'
  ]);

  function isMediaFile(filePathOrItem) {
    if (!filePathOrItem) return false;
    if (typeof filePathOrItem === 'object' && filePathOrItem.isDirectory) return false;
    const name = typeof filePathOrItem === 'string' ? filePathOrItem : (filePathOrItem.name || '');
    const ext = (typeof filePathOrItem === 'string'
      ? (name.lastIndexOf('.') !== -1 ? name.substring(name.lastIndexOf('.')).toLowerCase() : '')
      : (filePathOrItem.extension || '')).toLowerCase();
    return MEDIA_EXTS.has(ext);
  }

  function showToast(message, type = 'info', duration = 3200) {
    if (!el.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg class="icon toast-icon" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg class="icon toast-icon" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else {
      iconSvg = `<svg class="icon toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="toast-message">${escapeHtml(message)}</div>
    `;

    el.toastContainer.appendChild(toast);

    toast.addEventListener('click', () => {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 180);
    });

    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('toast-hiding');
        setTimeout(() => toast.remove(), 250);
      }
    }, duration);
  }

  async function performExtractArchive(targetItem, here = false) {
    const item = targetItem || state.contextTarget;
    if (!item) return;

    const baseName = item.name.replace(/\.[^/.]+$/, '');
    const parentDir = state.currentPath;
    const destDir = here ? parentDir : (parentDir.endsWith('\\') || parentDir.endsWith('/') ? parentDir + baseName : parentDir + '\\' + baseName);

    showToast(`Extracting "${item.name}"...`, 'info', 4000);
    const res = await api.archiveExtract(item.path, destDir);
    if (res.success) {
      showToast(`Extracted to ${here ? 'current folder' : baseName} successfully!`, 'success');
      if (state.autoOpenExtracted && !here) {
        await navigateTo(destDir, false);
      } else {
        await navigateTo(state.currentPath, false);
      }
    } else {
      showToast(`Extraction failed: ${res.error || 'Unknown error'}`, 'error', 5000);
    }
  }

  async function performCompress(format) {
    const chosenFormat = format || state.defaultArchiveFormat || 'zip';
    let targets = [];
    if (state.selectedIndices && state.selectedIndices.size > 0) {
      const idxs = Array.from(state.selectedIndices);
      targets = idxs.map(i => state.items[i]).filter(Boolean);
    } else if (state.contextTarget) {
      targets = [state.contextTarget];
    } else if (state.activeItem) {
      targets = [state.activeItem];
    }

    if (targets.length === 0) return;

    const sourcePaths = targets.map(t => t.path);
    const parentDir = state.currentPath;
    let baseName = targets.length === 1 ? targets[0].name.replace(/\.[^/.]+$/, '') : 'Archive';
    const ext = chosenFormat === '7z' ? '.7z' : (chosenFormat === 'tar.gz' ? '.tar.gz' : '.zip');
    const destPath = (parentDir.endsWith('\\') || parentDir.endsWith('/') ? parentDir + baseName : parentDir + '\\' + baseName) + ext;

    showToast(`Compressing ${targets.length} item${targets.length === 1 ? '' : 's'} to ${ext.toUpperCase()}...`, 'info', 4000);
    const res = await api.archiveCompress(sourcePaths, destPath, chosenFormat);
    if (res.success) {
      showToast(`Archive created: ${baseName}${ext}`, 'success');
      await navigateTo(state.currentPath, false);
    } else {
      showToast(`Compression failed: ${res.error || 'Unknown error'}`, 'error', 5000);
    }
  }

  // --- QUICK LOOK (SPACEBAR PREVIEW) ---
  async function openQuickLook(targetItem = null) {
    if (state.enableQuickLook === false) return;
    let item = targetItem;
    if (!item) {
      if (state.viewMode === 'columns') {
        const lastCol = state.millerColumns[state.millerColumns.length - 1];
        item = lastCol ? lastCol.selectedItem : null;
      } else {
        item = state.activeItem;
      }
    }

    if (!item) return;

    state.quickLookOpen = true;
    state.quickLookFile = item;
    state.quickLookFlipH = false;
    el.quickLookOverlay.style.display = 'flex';

    el.qlTitle.textContent = item.name;
    el.qlSubtitle.textContent = `${formatBytes(item.size)} · Modified ${formatDate(item.mtime)}`;
    el.qlLocation.textContent = item.path;

    // Update position index indicator (e.g. 3 of 24)
    if (el.qlIndexIndicator && state.items && state.items.length > 0) {
      const curIdx = state.items.findIndex(it => it.path === item.path);
      if (curIdx !== -1) {
        el.qlIndexIndicator.textContent = `${curIdx + 1} of ${state.items.length}`;
        el.qlIndexIndicator.style.display = 'inline-block';
      } else {
        el.qlIndexIndicator.style.display = 'none';
      }
    }

    // Refresh Info HUD if open
    if (state.quickLookInfoOpen) {
      renderQuickLookInfoHud(item);
    }

    // Toggle Play in VLC button in Quick Look header
    if (el.qlBtnOpenVlc) {
      const isMedia = !item.isDirectory && isMediaFile(item);
      el.qlBtnOpenVlc.style.display = isMedia ? 'inline-flex' : 'none';
      const vlcSpan = el.qlBtnOpenVlc.querySelector('span');
      if (vlcSpan) vlcSpan.textContent = state.vlcInstalled ? 'Play in VLC' : 'Play Media';
      el.qlBtnOpenVlc.onclick = async () => {
        if (state.quickLookFile) {
          await api.playInVlc(state.quickLookFile.path, { enqueue: false });
        }
      };
    }

    // Update current tag in Quick Look header
    const currentTag = state.tags[item.path] || '';
    el.qlCurrentTagDot.className = `tag-dot ${currentTag}`;

    // Render loading indicator
    el.qlBody.innerHTML = `
      <div style="color: var(--text-dim); display: flex; align-items: center; gap: 8px;">
        <svg class="icon spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
        <span>Loading preview...</span>
      </div>
    `;

    if (item.isDirectory) {
      // Directory preview: load folder contents or show centered junction/system hero
      const res = await api.readDir(item.path);
      const isDocAndSettings = item.name.toLowerCase().includes('documents and settings');
      const isSystemVol = item.name.toLowerCase().includes('system volume information');

      if (res.success && res.items && res.items.length > 0) {
        // Render rich folder contents explorer table
        const totalItems = res.items.length;
        const subfolders = res.items.filter(it => it.isDirectory).length;
        const files = totalItems - subfolders;
        let rowsHtml = '';
        const displayItems = res.items.slice(0, 500);
        displayItems.forEach(subItem => {
          const isDir = subItem.isDirectory;
          const kindStr = isDir ? 'Folder' : (subItem.extension ? subItem.extension.toUpperCase().replace('.', '') + ' File' : 'File');
          rowsHtml += `
            <tr class="ql-folder-row" data-path="${escapeHtml(subItem.path)}" data-is-dir="${isDir ? '1' : '0'}">
              <td>
                <div class="ql-archive-name-cell">
                  ${getFileIcon(subItem, false)}
                  <span class="ql-folder-item-name" title="${escapeHtml(subItem.name)}">${escapeHtml(subItem.name)}</span>
                </div>
              </td>
              <td>${escapeHtml(kindStr)}</td>
              <td style="text-align: right;" class="ql-archive-mono">${isDir ? '--' : formatBytes(subItem.size)}</td>
              <td style="text-align: right;" class="ql-archive-mono">${formatDate(subItem.mtime)}</td>
            </tr>
          `;
        });

        el.qlBody.innerHTML = `
          <div class="ql-folder-container">
            <div class="ql-folder-header">
              <div class="ql-folder-meta-left">
                <span class="ql-folder-badge">FOLDER</span>
                <span class="ql-folder-title">${escapeHtml(item.name)}</span>
                <div class="ql-archive-stats">
                  <span><strong>${totalItems}</strong> items (${files} files, ${subfolders} folders)</span>
                  <span class="ql-archive-engine">${escapeHtml(item.path)}</span>
                </div>
              </div>
              <div class="ql-folder-actions">
                <button class="tool-btn btn-primary" id="qlBtnOpenThisFolder">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/><circle cx="12" cy="12" r="10"/></svg>
                  Open Folder
                </button>
              </div>
            </div>
            <div class="ql-archive-table-wrapper">
              <table class="ql-archive-table">
                <thead>
                  <tr>
                    <th style="width: 48%;">Name</th>
                    <th style="width: 18%;">Kind</th>
                    <th style="width: 14%; text-align: right;">Size</th>
                    <th style="width: 20%; text-align: right;">Date Modified</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          </div>
        `;

        const openBtn = el.qlBody.querySelector('#qlBtnOpenThisFolder');
        if (openBtn) {
          openBtn.addEventListener('click', () => {
            closeQuickLook();
            navigateTo(item.path);
          });
        }

        el.qlBody.querySelectorAll('.ql-folder-row').forEach(row => {
          row.addEventListener('dblclick', () => {
            const p = row.dataset.path;
            const isD = row.dataset.isDir === '1';
            closeQuickLook();
            if (isD) navigateTo(p);
            else api.openItem(p);
          });
        });
      } else {
        // Centered Hero for Empty Folder, Junction, or System Restricted directory
        let badgeText = 'FOLDER';
        let descText = 'This folder is currently empty.';
        let targetActionPath = item.path;
        let actionBtnText = 'Open Folder';

        if (isDocAndSettings) {
          badgeText = 'SYSTEM JUNCTION';
          descText = 'Legacy NTFS junction pointing to <strong>C:\\Users</strong>.<br>Direct access is restricted by Windows security policy.';
          targetActionPath = 'C:\\Users';
          actionBtnText = 'Open C:\\Users';
        } else if (isSystemVol) {
          badgeText = 'SYSTEM PROTECTED';
          descText = 'System Volume Information directory used for Windows Restore Points and volume indexing.';
          actionBtnText = 'Open Properties';
        } else if (!res.success) {
          badgeText = 'SYSTEM RESTRICTED';
          descText = `Directory access restricted by Windows system permissions.<br><span style="font-size: 11.5px; opacity: 0.75; font-family: var(--font-mono, monospace);">${escapeHtml(res.error || 'Access Denied')}</span>`;
          actionBtnText = 'Open in MyFiles';
        }

        el.qlBody.innerHTML = `
          <div class="ql-folder-hero">
            <div class="ql-folder-hero-icon-wrap">
              <svg class="icon ql-folder-hero-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" fill="currentColor" fill-opacity="0.14"/>
              </svg>
            </div>
            <div class="ql-folder-badge" style="margin-bottom: 2px;">${badgeText}</div>
            <h2 class="ql-folder-hero-title">${escapeHtml(item.name)}</h2>
            <div class="ql-folder-hero-desc">${descText}</div>
            <div class="ql-folder-hero-chips">
              <span class="ql-hero-chip">Location: <strong>${escapeHtml(item.path)}</strong></span>
              <span class="ql-hero-chip">Modified: <strong>${formatDate(item.mtime)}</strong></span>
            </div>
            <div class="ql-folder-hero-actions">
              <button class="tool-btn btn-primary" id="qlBtnHeroAction" style="padding: 8px 18px; font-size: 13px;">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/><circle cx="12" cy="12" r="10"/></svg>
                ${actionBtnText}
              </button>
              <button class="tool-btn" id="qlBtnHeroInfo" style="padding: 8px 16px; font-size: 13px;">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                Get Info
              </button>
            </div>
          </div>
        `;

        const heroBtn = el.qlBody.querySelector('#qlBtnHeroAction');
        if (heroBtn) {
          heroBtn.addEventListener('click', () => {
            closeQuickLook();
            if (isSystemVol) {
              openPropertiesModal(item);
            } else {
              navigateTo(targetActionPath);
            }
          });
        }
        const infoBtn = el.qlBody.querySelector('#qlBtnHeroInfo');
        if (infoBtn) {
          infoBtn.addEventListener('click', () => {
            openGetInfoModal(item);
          });
        }
      }
      return;
    }

    if (isArchiveFile(item)) {
      const info = await api.archiveInspect(item.path);
      if (info && info.success && info.entries) {
        const typeUpper = (info.type || item.extension.replace('.', '')).toUpperCase();
        let rowsHtml = '';
        const displayEntries = info.entries.slice(0, 500);
        for (const entry of displayEntries) {
          const isDir = entry.isDirectory;
          const iconSvg = isDir
            ? `<svg class="icon ql-archive-entry-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>`
            : `<svg class="icon ql-archive-entry-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
          rowsHtml += `
            <tr>
              <td>
                <div class="ql-archive-name-cell">
                  ${iconSvg}
                  <span title="${escapeHtml(entry.path)}">${escapeHtml(entry.path)}</span>
                </div>
              </td>
              <td style="text-align: right;" class="ql-archive-mono">${isDir ? '--' : formatBytes(entry.size)}</td>
              <td style="text-align: right;" class="ql-archive-mono">${isDir || !entry.packedSize ? '--' : formatBytes(entry.packedSize)}</td>
              <td style="text-align: right;" class="ql-archive-mono">${entry.modified || '--'}</td>
            </tr>
          `;
        }

        if (info.entries.length > 500) {
          rowsHtml += `
            <tr>
              <td colspan="4" style="text-align: center; color: var(--text-dim); padding: 10px;">
                ... and ${info.entries.length - 500} more items
              </td>
            </tr>
          `;
        }

        el.qlBody.innerHTML = `
          <div class="ql-archive-container">
            <div class="ql-archive-header">
              <div class="ql-archive-meta-left">
                <span class="ql-archive-badge">${escapeHtml(typeUpper)} ARCHIVE</span>
                <div class="ql-archive-stats">
                  <span><strong>${info.totalFiles}</strong> files, <strong>${info.totalFolders}</strong> folders</span>
                  <span>Uncompressed: <strong>${formatBytes(info.totalUncompressed)}</strong></span>
                  <span>Ratio: <strong>${info.ratio}</strong></span>
                  <span class="ql-archive-engine">Engine: ${info.tool || '7-Zip'}</span>
                </div>
              </div>
              <div>
                <button class="tool-btn btn-primary" id="qlBtnExtractNow" style="padding: 6px 14px; font-size: 12px;">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                  Extract All
                </button>
              </div>
            </div>
            <div class="ql-archive-table-wrapper">
              <table class="ql-archive-table">
                <thead>
                  <tr>
                    <th style="width: 50%;">Name</th>
                    <th style="width: 15%; text-align: right;">Size</th>
                    <th style="width: 15%; text-align: right;">Packed</th>
                    <th style="width: 20%; text-align: right;">Date Modified</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml || '<tr><td colspan="4" style="text-align: center; color: var(--text-dim); padding: 18px;">Empty archive</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        `;

        const btnExtract = el.qlBody.querySelector('#qlBtnExtractNow');
        if (btnExtract) {
          btnExtract.addEventListener('click', async () => {
            closeQuickLook();
            await performExtractArchive(item, false);
          });
        }
        return;
      }
    }

    // 1. Instant Image Preview (0ms latency, rotation, multi-level zoom & smooth panning)
    if (isImageFile(item)) {
      if (el.qlImageTools) el.qlImageTools.style.display = 'flex';
      state.quickLookZoom = 1.0;
      state.quickLookPanX = 0;
      state.quickLookPanY = 0;
      state.quickLookRotation = (state.activeItemRotation || 0);

      const mediaUrl = getMediaUrl(item.path);

      el.qlBody.innerHTML = `
        <div class="ql-image-wrap" id="qlImageWrap" title="Click to zoom / Drag to pan">
          <img id="qlPreviewImg" src="${mediaUrl}" alt="${escapeHtml(item.name)}" draggable="false" style="transform: translate(0px, 0px) rotate(${state.quickLookRotation}deg) scale(${state.quickLookZoom});" />
        </div>
      `;

      const img = el.qlBody.querySelector('#qlPreviewImg');
      const wrap = el.qlBody.querySelector('#qlImageWrap');

      function clampPan(px, py, zoom) {
        if (!wrap || !img || zoom <= 1.0) return { x: 0, y: 0 };
        const wrapW = wrap.clientWidth || 600;
        const wrapH = wrap.clientHeight || 400;
        const imgW = (img.offsetWidth || img.clientWidth || wrapW) * zoom;
        const imgH = (img.offsetHeight || img.clientHeight || wrapH) * zoom;
        const maxPanX = Math.max(0, (imgW - wrapW) / 2 + 100);
        const maxPanY = Math.max(0, (imgH - wrapH) / 2 + 100);
        return {
          x: Math.min(maxPanX, Math.max(-maxPanX, px)),
          y: Math.min(maxPanY, Math.max(-maxPanY, py))
        };
      }

      function updateImageTransform(withTransition = true) {
        if (!img) return;
        const rot = state.quickLookRotation % 360;
        const zoom = state.quickLookZoom;

        let containmentScale = 1.0;
        if ((rot === 90 || rot === 270) && wrap && img.naturalWidth && img.naturalHeight) {
          const wrapW = wrap.clientWidth || wrap.offsetWidth;
          const wrapH = wrap.clientHeight || wrap.offsetHeight;
          const imgW = img.offsetWidth || img.clientWidth;
          const imgH = img.offsetHeight || img.clientHeight;
          if (wrapW > 0 && wrapH > 0 && imgW > 0 && imgH > 0) {
            const fitScale = Math.min(wrapW / imgH, wrapH / imgW);
            if (fitScale < 1.0) {
              containmentScale = fitScale;
            }
          }
        }

        const flipScale = state.quickLookFlipH ? -1 : 1;
        const effectiveScale = +(zoom * containmentScale).toFixed(3);

        if (zoom <= 1.0) {
          state.quickLookPanX = 0;
          state.quickLookPanY = 0;
        } else {
          const clamped = clampPan(state.quickLookPanX || 0, state.quickLookPanY || 0, effectiveScale);
          state.quickLookPanX = clamped.x;
          state.quickLookPanY = clamped.y;
        }

        img.style.transition = withTransition ? 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease' : 'none';
        img.style.transform = `translate(${state.quickLookPanX}px, ${state.quickLookPanY}px) rotate(${rot}deg) scale(${effectiveScale}) scaleX(${flipScale})`;

        if (el.qlZoomLabel) {
          el.qlZoomLabel.textContent = zoom === 1.0 ? 'Fit' : `${Math.round(zoom * 100)}%`;
        }

        if (el.qlBtnFlipH) {
          el.qlBtnFlipH.style.color = state.quickLookFlipH ? 'var(--accent)' : '';
          el.qlBtnFlipH.style.borderColor = state.quickLookFlipH ? 'var(--accent)' : '';
        }

        if (wrap) {
          const isZoomed = zoom > 1.0;
          wrap.classList.toggle('is-zoomed', isZoomed);
          wrap.title = isZoomed ? 'Drag to pan / Double-click to fit' : 'Click to zoom in (or scroll / +/-)';
        }
      }

      if (img) {
        img.onload = () => {
          if (state.quickLookFile && state.quickLookFile.path === item.path) {
            el.qlSubtitle.textContent = `${img.naturalWidth} × ${img.naturalHeight} · ${formatBytes(item.size)} · Modified ${formatDate(item.mtime)}`;
            updateImageTransform(false);
          }
        };
        img.onerror = () => {
          if (el.qlImageTools) el.qlImageTools.style.display = 'none';
          el.qlBody.innerHTML = `
            <div class="ql-image-error-card">
              <div style="width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md); background: rgba(244, 63, 94, 0.12); border: 1px solid rgba(244, 63, 94, 0.3);">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" style="width: 38px; height: 38px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
              <div style="font-size: 16px; font-weight: 700; color: var(--text-main);">${escapeHtml(item.name)}</div>
              <div style="font-size: 13px; color: var(--text-dim); max-width: 320px;">Could not render image preview. The file format may require external viewing.</div>
              <button class="tool-btn btn-primary" id="qlBtnFallbackOpen" style="margin-top: 6px; padding: 6px 18px; font-size: 13px;">
                Open with Default App
              </button>
            </div>
          `;
          const btnFallback = el.qlBody.querySelector('#qlBtnFallbackOpen');
          if (btnFallback) {
            btnFallback.addEventListener('click', () => api.openItem(item.path));
          }
        };
      }

      // Wire rotation, flip, and zoom controls
      if (el.qlBtnRotate) {
        el.qlBtnRotate.onclick = () => {
          state.quickLookRotation = (state.quickLookRotation + 90) % 360;
          state.activeItemRotation = state.quickLookRotation;
          updateImageTransform(true);
          const ppHeroThumb = document.getElementById('ppHeroThumb');
          if (ppHeroThumb) ppHeroThumb.style.transform = `rotate(${state.activeItemRotation}deg)`;
        };
      }

      if (el.qlBtnFlipH) {
        el.qlBtnFlipH.onclick = () => {
          state.quickLookFlipH = !state.quickLookFlipH;
          updateImageTransform(true);
        };
      }

      if (el.qlBtnZoomIn) {
        el.qlBtnZoomIn.onclick = () => {
          state.quickLookZoom = Math.min(4.0, +(state.quickLookZoom + 0.25).toFixed(2));
          updateImageTransform(true);
        };
      }

      if (el.qlBtnZoomOut) {
        el.qlBtnZoomOut.onclick = () => {
          state.quickLookZoom = Math.max(1.0, +(state.quickLookZoom - 0.25).toFixed(2));
          updateImageTransform(true);
        };
      }

      if (el.qlBtnZoomFit) {
        el.qlBtnZoomFit.onclick = () => {
          state.quickLookZoom = state.quickLookZoom > 1.0 ? 1.0 : 2.0;
          state.quickLookPanX = 0;
          state.quickLookPanY = 0;
          updateImageTransform(true);
        };
      }

      // Interactive panning and smooth zoom clicking
      if (wrap) {
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let startPanX = 0;
        let startPanY = 0;
        let totalMoved = 0;

        wrap.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          isDragging = true;
          totalMoved = 0;
          dragStartX = e.clientX;
          dragStartY = e.clientY;
          startPanX = state.quickLookPanX || 0;
          startPanY = state.quickLookPanY || 0;
          if (state.quickLookZoom > 1.0) {
            wrap.classList.add('panning');
          }
        });

        window.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          const dx = e.clientX - dragStartX;
          const dy = e.clientY - dragStartY;
          totalMoved += Math.abs(dx) + Math.abs(dy);
          if (state.quickLookZoom > 1.0) {
            state.quickLookPanX = startPanX + dx;
            state.quickLookPanY = startPanY + dy;
            updateImageTransform(false);
          }
        });

        window.addEventListener('mouseup', () => {
          if (isDragging) {
            isDragging = false;
            wrap.classList.remove('panning');
            if (state.quickLookZoom > 1.0) {
              updateImageTransform(true);
            }
          }
        });

        wrap.addEventListener('click', (e) => {
          // If user dragged to pan, don't trigger zoom toggle
          if (totalMoved > 6) return;
          if (state.quickLookZoom === 1.0) {
            state.quickLookZoom = 2.0;
            // Center zoom around click position relative to center of wrap
            const rect = wrap.getBoundingClientRect();
            const clickCenterX = e.clientX - (rect.left + rect.width / 2);
            const clickCenterY = e.clientY - (rect.top + rect.height / 2);
            state.quickLookPanX = -clickCenterX * 0.8;
            state.quickLookPanY = -clickCenterY * 0.8;
          } else {
            state.quickLookZoom = 1.0;
            state.quickLookPanX = 0;
            state.quickLookPanY = 0;
          }
          updateImageTransform(true);
        });

        wrap.addEventListener('wheel', (e) => {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.25 : -0.25;
          const newZoom = Math.min(4.0, Math.max(1.0, +(state.quickLookZoom + delta).toFixed(2)));
          if (newZoom !== state.quickLookZoom) {
            state.quickLookZoom = newZoom;
            if (state.quickLookZoom === 1.0) {
              state.quickLookPanX = 0;
              state.quickLookPanY = 0;
            }
            updateImageTransform(true);
          }
        }, { passive: false });
      }

      return;
    }

    if (el.qlImageTools) el.qlImageTools.style.display = 'none';

    const preview = await api.readFileContent(item.path);

    if (preview.type === 'image') {
      const mediaUrl = (preview.url && (preview.url.startsWith('http') || preview.url.startsWith('file:'))) ? preview.url : getMediaUrl(item.path);
      el.qlBody.innerHTML = `
        <div class="ql-image-wrap" id="qlImageWrap">
          <img src="${mediaUrl}" alt="${escapeHtml(item.name)}" draggable="false" />
        </div>
      `;
    } else if (preview.type === 'video') {
      el.qlBody.innerHTML = `
        <div class="ql-media-wrap" style="position: relative;">
          <video id="qlPreviewVideo" src="${preview.url}" controls ${state.qlAutoplay !== false ? 'autoplay' : ''} ${state.qlLoop ? 'loop' : ''}></video>
          <div class="ql-media-controls-overlay">
            <span style="font-size: 10px; color: var(--text-dim); margin-right: 2px;">SPEED</span>
            <button class="ql-speed-btn" data-speed="0.75">0.75×</button>
            <button class="ql-speed-btn active" data-speed="1.0">1×</button>
            <button class="ql-speed-btn" data-speed="1.25">1.25×</button>
            <button class="ql-speed-btn" data-speed="1.5">1.5×</button>
            <button class="ql-speed-btn" data-speed="2.0">2×</button>
          </div>
        </div>
      `;
      const vid = el.qlBody.querySelector('#qlPreviewVideo');
      const speedBtns = el.qlBody.querySelectorAll('.ql-speed-btn');
      speedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const spd = parseFloat(btn.dataset.speed);
          if (vid) vid.playbackRate = spd;
          speedBtns.forEach(b => b.classList.toggle('active', b === btn));
        });
      });
    } else if (preview.type === 'extended-video') {
      const extUpper = (preview.extension || item.extension || '').replace('.', '').toUpperCase();
      el.qlBody.innerHTML = `
        <div class="empty-state" style="padding: 40px 20px;">
          <div style="width: 80px; height: 80px; border-radius: var(--radius-md); background: rgba(249, 115, 22, 0.12); border: 1px solid rgba(249, 115, 22, 0.3); display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 44px; height: 44px; color: #f97316;"><path d="M12 2l-7 16h14L12 2z" stroke="#f97316" fill="#f97316" fill-opacity="0.15"/><line x1="8.5" y1="10" x2="15.5" y2="10" stroke="#f97316"/><line x1="6.8" y1="14" x2="17.2" y2="14" stroke="#f97316"/><path d="M3 20c0 1.1 4 2 9 2s9-.9 9-2" stroke="#ea580c"/></svg>
          </div>
          <div class="empty-state-title" style="font-size: 19px; margin-bottom: 6px;">${escapeHtml(item.name)}</div>
          <div class="empty-state-sub" style="margin-bottom: 20px;">
            <span style="background: rgba(255,255,255,0.08); padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; margin-right: 8px;">${escapeHtml(extUpper)} VIDEO</span>
            ${formatBytes(item.size)}
          </div>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button class="tool-btn btn-primary" id="qlBtnPlayVlcDirect" style="padding: 8px 18px; font-size: 13px;">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>${state.vlcInstalled ? 'Play in VLC' : 'Play Media'}</span>
            </button>
            ${state.vlcInstalled ? `
              <button class="tool-btn" id="qlBtnEnqueueVlcDirect" style="padding: 8px 16px; font-size: 13px;">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                <span>Enqueue</span>
              </button>
            ` : ''}
          </div>
          <div style="margin-top: 18px; font-size: 12px; color: var(--text-dim);">
            ${state.vlcInstalled ? 'Hardware accelerated playback via VLC Player.' : 'Will open with your system’s default media player.'}
          </div>
        </div>
      `;

      const btnDirect = el.qlBody.querySelector('#qlBtnPlayVlcDirect');
      if (btnDirect) {
        btnDirect.addEventListener('click', async () => {
          await api.playInVlc(item.path, { enqueue: false });
        });
      }
      const btnEnqueue = el.qlBody.querySelector('#qlBtnEnqueueVlcDirect');
      if (btnEnqueue) {
        btnEnqueue.addEventListener('click', async () => {
          await api.playInVlc(item.path, { enqueue: true });
          showToast('Added to VLC Playlist', 'success');
        });
      }
    } else if (preview.type === 'document') {
      const paragraphs = (preview.content || '').split(/\n\n+/).filter(Boolean);
      const parasHtml = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
      el.qlBody.innerHTML = `
        <div class="ql-doc-container">
          <div class="ql-doc-toolbar">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: rgba(37,99,235,0.18); border: 1px solid rgba(37,99,235,0.4); padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 10px; color: #60a5fa;">${escapeHtml(preview.docType || 'WORD')}</span>
              <span>${preview.wordsCount || 0} words · ${preview.paragraphsCount || paragraphs.length} paragraphs</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button class="tool-btn" id="qlBtnCopyDocText" style="padding: 3px 10px; font-size: 11px; height: 24px;">Copy Text</button>
            </div>
          </div>
          <div class="ql-doc-body">
            ${parasHtml || '<p style="color: var(--text-dim); text-align: center;">Empty document or no readable text found.</p>'}
          </div>
        </div>
      `;
      const btnCopyDoc = el.qlBody.querySelector('#qlBtnCopyDocText');
      if (btnCopyDoc) {
        btnCopyDoc.addEventListener('click', () => {
          navigator.clipboard.writeText(preview.content || '');
          showToast('Copied document text to clipboard', 'success');
        });
      }
    } else if (preview.type === 'audio') {
      const extUpper = (item.extension || 'AUDIO').replace('.', '').toUpperCase();
      el.qlBody.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
          <div class="ql-audio-card">
            <div class="ql-audio-artwork" id="qlAudioArtwork">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 44px; height: 44px; color: var(--accent);"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
            <div style="text-align: center; width: 100%;">
              <div class="ql-audio-title" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
              <div class="ql-audio-meta">${extUpper} Track · ${formatBytes(item.size)}</div>
            </div>
            <audio id="qlAudioEl" class="ql-audio-player" src="${preview.url}" controls ${state.qlAutoplay !== false ? 'autoplay' : ''} ${state.qlLoop ? 'loop' : ''}></audio>
          </div>
        </div>
      `;
      const audioEl = el.qlBody.querySelector('#qlAudioEl');
      const artwork = el.qlBody.querySelector('#qlAudioArtwork');
      if (audioEl && artwork) {
        audioEl.onplay = () => artwork.classList.add('playing');
        audioEl.onpause = () => artwork.classList.remove('playing');
        audioEl.onended = () => artwork.classList.remove('playing');
      }
    } else if (preview.type === 'pdf') {
      await renderPdfPreview(preview, item);
    } else if (preview.type === 'text') {
      const ext = (item.extension || '').toLowerCase();
      if (ext === '.csv' || ext === '.tsv') {
        renderCsvPreview(preview.content, item);
      } else if (preview.isMarkdown) {
        // Simple markdown formatter
        const rawContent = preview.content;
        let renderedHtml = rawContent
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
          .replace(/\*(.*)\*/gim, '<i>$1</i>')
          .replace(/`([^`]+)`/gim, '<code>$1</code>')
          .replace(/\n$/gim, '<br />');

        el.qlBody.innerHTML = `
          <div class="ql-markdown-view">
            ${renderedHtml}
          </div>
        `;
      } else {
        const lines = (preview.content || '').split('\n');
        const extBadge = (item.extension || 'TXT').replace('.', '').toUpperCase();
        const lineNumsHtml = lines.map((_, i) => i + 1).join('\n');
        const highlightedHtml = highlightSyntax(preview.content, ext);

        el.qlBody.innerHTML = `
          <div class="ql-code-container">
            <div class="ql-code-toolbar">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="background: rgba(255,255,255,0.08); padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10px; color: var(--accent);">${extBadge}</span>
                <span>${lines.length} lines ${preview.truncated ? '(Preview truncated)' : ''}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <button class="tool-btn" id="qlBtnToggleWrap" style="padding: 3px 8px; font-size: 11px; height: 24px;">Wrap</button>
                <button class="tool-btn" id="qlBtnCopyCode" style="padding: 3px 10px; font-size: 11px; height: 24px;">Copy Text</button>
                <span>UTF-8</span>
              </div>
            </div>
            <div class="ql-code-search-bar" id="qlCodeSearchBar">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 13px; height: 13px; color: var(--text-dim);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" class="ql-code-search-input" id="qlCodeSearchInput" placeholder="Find in document..." />
              <span class="ql-code-search-count" id="qlCodeSearchCount"></span>
            </div>
            <div class="ql-code-content">
              <div class="ql-line-numbers">${lineNumsHtml}</div>
              <pre class="ql-code-pre" id="qlCodePre">${highlightedHtml}</pre>
            </div>
          </div>
        `;
        const btnCopy = el.qlBody.querySelector('#qlBtnCopyCode');
        if (btnCopy) {
          btnCopy.addEventListener('click', () => {
            navigator.clipboard.writeText(preview.content || '');
            showToast('Copied text to clipboard', 'success');
          });
        }
        const btnWrap = el.qlBody.querySelector('#qlBtnToggleWrap');
        const codePre = el.qlBody.querySelector('#qlCodePre');
        if (btnWrap && codePre) {
          let isWrapped = false;
          btnWrap.addEventListener('click', () => {
            isWrapped = !isWrapped;
            codePre.classList.toggle('wrap-lines', isWrapped);
            btnWrap.textContent = isWrapped ? 'Unwrap' : 'Wrap';
          });
        }
        const searchInput = el.qlBody.querySelector('#qlCodeSearchInput');
        const searchCount = el.qlBody.querySelector('#qlCodeSearchCount');
        if (searchInput && codePre) {
          searchInput.addEventListener('input', (e) => {
            const q = e.target.value;
            if (!q) {
              codePre.innerHTML = highlightedHtml;
              if (searchCount) searchCount.textContent = '';
              return;
            }
            try {
              const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const re = new RegExp(`(${safeQ})`, 'gi');
              const matches = (preview.content || '').match(re);
              const count = matches ? matches.length : 0;
              if (searchCount) searchCount.textContent = `${count} ${count === 1 ? 'match' : 'matches'}`;
              const marked = escapeHtml(preview.content || '').replace(re, '<mark class="ql-search-match">$1</mark>');
              codePre.innerHTML = marked;
              const firstMark = codePre.querySelector('mark');
              if (firstMark) firstMark.scrollIntoView({ block: 'center', behavior: 'smooth' });
            } catch(err) {}
          });
        }
      }
    } else {
      // Binary / Other
      el.qlBody.innerHTML = `
        <div class="empty-state">
          <div class="cp-icon-wrap" style="width: 90px; height: 90px;">
            ${getFileIcon(item)}
          </div>
          <div class="empty-state-title" style="font-size: 18px; margin-top: 12px;">${item.name}</div>
          <div class="empty-state-sub">${formatBytes(item.size)} · ${item.extension.toUpperCase()}</div>
        </div>
      `;
    }
  }

  function closeQuickLook() {
    state.quickLookOpen = false;
    state.quickLookFile = null;
    state.quickLookZoom = 1.0;
    state.quickLookPanX = 0;
    state.quickLookPanY = 0;
    state.quickLookFlipH = false;
    if (el.qlImageTools) el.qlImageTools.style.display = 'none';
    if (el.qlInfoHud) el.qlInfoHud.style.display = 'none';
    el.quickLookOverlay.style.display = 'none';
    el.qlBody.innerHTML = '';
  }

  function toggleQuickLookMaximize() {
    const dialog = el.quickLookDialog || el.quickLookOverlay?.querySelector('.quicklook-dialog');
    if (!dialog) return;
    const isMaximized = dialog.classList.toggle('maximized');
    const expandIcon = el.qlBtnMaximize?.querySelector('.ql-icon-expand');
    const compressIcon = el.qlBtnMaximize?.querySelector('.ql-icon-compress');
    if (expandIcon && compressIcon) {
      expandIcon.style.display = isMaximized ? 'none' : 'block';
      compressIcon.style.display = isMaximized ? 'block' : 'none';
    }
    if (el.qlBtnMaximize) {
      el.qlBtnMaximize.title = isMaximized ? 'Restore View (F)' : 'Toggle Maximize / Full View (F)';
    }
  }

  async function renderQuickLookInfoHud(item) {
    if (!el.qlInfoHudBody || !item) return;

    const ext = (item.extension || '').toLowerCase();
    const isImg = isImageFile(item);
    const isVid = !item.isDirectory && ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi', '.m4v'].includes(ext);

    let mediaSpecsHtml = '';
    if (isImg) {
      const img = el.qlBody.querySelector('#qlPreviewImg');
      const nw = img?.naturalWidth || '--';
      const nh = img?.naturalHeight || '--';
      const mp = (img?.naturalWidth && img?.naturalHeight) ? ((img.naturalWidth * img.naturalHeight) / 1000000).toFixed(1) + ' MP' : '--';
      const gcd = (a, b) => b ? gcd(b, a % b) : a;
      const ratio = (img?.naturalWidth && img?.naturalHeight) ? `${img.naturalWidth / gcd(img.naturalWidth, img.naturalHeight)}:${img.naturalHeight / gcd(img.naturalWidth, img.naturalHeight)}` : '--';
      mediaSpecsHtml = `
        <div class="ql-hud-section">
          <div class="ql-hud-section-title">Image Dimensions</div>
          <div class="ql-hud-table">
            <span class="ql-hud-label">Resolution</span>
            <span class="ql-hud-val">${nw} × ${nh} px</span>
            <span class="ql-hud-label">Aspect Ratio</span>
            <span class="ql-hud-val">${ratio}</span>
            <span class="ql-hud-label">Megapixels</span>
            <span class="ql-hud-val">${mp}</span>
          </div>
        </div>
      `;
    } else if (isVid) {
      const vid = el.qlBody.querySelector('video');
      const vw = vid?.videoWidth || '--';
      const vh = vid?.videoHeight || '--';
      const dur = vid?.duration ? `${Math.round(vid.duration)}s` : '--';
      mediaSpecsHtml = `
        <div class="ql-hud-section">
          <div class="ql-hud-section-title">Video Attributes</div>
          <div class="ql-hud-table">
            <span class="ql-hud-label">Resolution</span>
            <span class="ql-hud-val">${vw} × ${vh} px</span>
            <span class="ql-hud-label">Duration</span>
            <span class="ql-hud-val">${dur}</span>
          </div>
        </div>
      `;
    }

    el.qlInfoHudBody.innerHTML = `
      <div class="ql-hud-section">
        <div class="ql-hud-section-title">General</div>
        <div class="ql-hud-table">
          <span class="ql-hud-label">Name</span>
          <span class="ql-hud-val" style="font-weight: 600;">${escapeHtml(item.name)}</span>
          <span class="ql-hud-label">Kind</span>
          <span class="ql-hud-val">${formatKind(item)}</span>
          <span class="ql-hud-label">Size</span>
          <span class="ql-hud-val">${item.isDirectory ? 'Folder' : `${formatBytes(item.size)} (${item.size.toLocaleString()} bytes)`}</span>
          <span class="ql-hud-label">Location</span>
          <span class="ql-hud-val" style="font-size: 10.5px;">${escapeHtml(item.path)}</span>
        </div>
        <button class="ql-hud-copy-btn" id="qlHudBtnCopyPath">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span>Copy Full Path</span>
        </button>
      </div>

      ${mediaSpecsHtml}

      <div class="ql-hud-section">
        <div class="ql-hud-section-title">Timestamps</div>
        <div class="ql-hud-table">
          <span class="ql-hud-label">Created</span>
          <span class="ql-hud-val">${formatDateFull(item.birthtime || item.mtime)}</span>
          <span class="ql-hud-label">Modified</span>
          <span class="ql-hud-val">${formatDateFull(item.mtime)}</span>
          <span class="ql-hud-label">Accessed</span>
          <span class="ql-hud-val">${formatDateFull(item.atime || item.mtime)}</span>
        </div>
      </div>

      <div class="ql-hud-section">
        <div class="ql-hud-section-title">Integrity &amp; Checksum</div>
        <div class="ql-hud-hash-row">
          <button class="ql-hud-copy-btn" id="qlHudBtnCalcHash" style="margin-top: 0;">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Compute SHA-256 Hash</span>
          </button>
          <div class="ql-hud-hash-box" id="qlHudHashBox" style="display: none;"></div>
        </div>
      </div>
    `;

    const btnCopyPath = el.qlInfoHudBody.querySelector('#qlHudBtnCopyPath');
    if (btnCopyPath) {
      btnCopyPath.addEventListener('click', () => {
        navigator.clipboard.writeText(item.path);
        showToast('Copied file path to clipboard', 'success');
      });
    }

    const btnCalcHash = el.qlInfoHudBody.querySelector('#qlHudBtnCalcHash');
    const hashBox = el.qlInfoHudBody.querySelector('#qlHudHashBox');
    if (btnCalcHash && hashBox) {
      btnCalcHash.addEventListener('click', async () => {
        btnCalcHash.disabled = true;
        btnCalcHash.textContent = 'Calculating...';
        try {
          const res = await api.calculateChecksum(item.path, 'sha256');
          if (res && res.hash) {
            hashBox.textContent = res.hash;
            hashBox.style.display = 'block';
            btnCalcHash.style.display = 'none';
          } else {
            hashBox.textContent = 'Could not calculate hash.';
            hashBox.style.display = 'block';
          }
        } catch(err) {
          hashBox.textContent = 'Error computing hash.';
          hashBox.style.display = 'block';
        }
      });
    }
  }

  function toggleQuickLookInfo(forceState = null) {
    if (!el.qlInfoHud) return;
    state.quickLookInfoOpen = forceState !== null ? forceState : !state.quickLookInfoOpen;
    el.qlInfoHud.style.display = state.quickLookInfoOpen ? 'flex' : 'none';
    if (el.qlBtnInfo) {
      el.qlBtnInfo.style.color = state.quickLookInfoOpen ? 'var(--accent)' : '';
      el.qlBtnInfo.style.borderColor = state.quickLookInfoOpen ? 'var(--accent)' : '';
    }
    if (state.quickLookInfoOpen && state.quickLookFile) {
      renderQuickLookInfoHud(state.quickLookFile);
    }
  }

  async function renderPdfPreview(preview, item) {
    if (!window.pdfjsLib) {
      el.qlBody.innerHTML = `
        <iframe src="${preview.url}" style="width: 100%; height: 100%; border: none; border-radius: var(--radius-md);"></iframe>
      `;
      return;
    }

    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
    } catch {}

    el.qlBody.innerHTML = `
      <div class="ql-pdf-container">
        <div class="ql-pdf-toolbar">
          <div class="ql-pdf-controls-left">
            <button class="ql-pdf-btn" id="qlPdfPrev" title="Previous Page (Page Up / Left Arrow)">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="ql-pdf-page-display">
              Page <input type="number" id="qlPdfPageNum" value="1" min="1" max="1" class="ql-pdf-page-input" /> of <span id="qlPdfPageCount">...</span>
            </span>
            <button class="ql-pdf-btn" id="qlPdfNext" title="Next Page (Page Down / Right Arrow)">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <div class="ql-pdf-controls-center">
            <button class="ql-pdf-btn" id="qlPdfZoomOut" title="Zoom Out (-)">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </button>
            <span class="ql-pdf-zoom-level" id="qlPdfZoomLevel">100%</span>
            <button class="ql-pdf-btn" id="qlPdfZoomIn" title="Zoom In (+)">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </button>
            <button class="ql-pdf-btn" id="qlPdfFitWidth" title="Fit to Width">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
              <span>Fit</span>
            </button>
          </div>
          <div class="ql-pdf-controls-right">
            <button class="ql-pdf-btn ${state.pdfDarkMode ? 'active' : ''}" id="qlPdfDarkToggle" title="Toggle Dark Mode (Invert Background)">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              <span>Dark Mode</span>
            </button>
          </div>
        </div>
        <div class="ql-pdf-canvas-wrap" id="qlPdfCanvasWrap">
          <canvas id="qlPdfCanvas" class="ql-pdf-canvas ${state.pdfDarkMode ? 'dark-invert' : ''}"></canvas>
        </div>
      </div>
    `;

    const canvas = el.qlBody.querySelector('#qlPdfCanvas');
    const wrap = el.qlBody.querySelector('#qlPdfCanvasWrap');
    const btnPrev = el.qlBody.querySelector('#qlPdfPrev');
    const btnNext = el.qlBody.querySelector('#qlPdfNext');
    const inpPage = el.qlBody.querySelector('#qlPdfPageNum');
    const spCount = el.qlBody.querySelector('#qlPdfPageCount');
    const btnZoomIn = el.qlBody.querySelector('#qlPdfZoomIn');
    const btnZoomOut = el.qlBody.querySelector('#qlPdfZoomOut');
    const btnFit = el.qlBody.querySelector('#qlPdfFitWidth');
    const spZoom = el.qlBody.querySelector('#qlPdfZoomLevel');
    const btnDark = el.qlBody.querySelector('#qlPdfDarkToggle');

    let pdfDoc = null;
    let pageNum = 1;
    let scale = 1.15;
    let isRendering = false;
    let pendingPageNum = null;

    try {
      const loadingTask = window.pdfjsLib.getDocument(preview.url);
      pdfDoc = await loadingTask.promise;
      if (spCount) spCount.textContent = pdfDoc.numPages;
      if (inpPage) inpPage.max = pdfDoc.numPages;

      async function renderPage(num) {
        if (isRendering) {
          pendingPageNum = num;
          return;
        }
        isRendering = true;
        try {
          const page = await pdfDoc.getPage(num);
          const dpr = window.devicePixelRatio || 1;
          const viewport = page.getViewport({ scale: scale * dpr });
          const ctx = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.style.width = `${viewport.width / dpr}px`;
          canvas.style.height = `${viewport.height / dpr}px`;

          const renderContext = {
            canvasContext: ctx,
            viewport: viewport
          };
          await page.render(renderContext).promise;
          isRendering = false;
          if (pendingPageNum !== null) {
            const next = pendingPageNum;
            pendingPageNum = null;
            renderPage(next);
          }
        } catch (err) {
          isRendering = false;
          console.error('PDF page render error:', err);
        }

        if (inpPage) inpPage.value = num;
        if (spZoom) spZoom.textContent = `${Math.round(scale * 100)}%`;
        if (btnPrev) btnPrev.disabled = num <= 1;
        if (btnNext) btnNext.disabled = num >= pdfDoc.numPages;
      }

      await renderPage(pageNum);

      if (btnPrev) {
        btnPrev.onclick = () => {
          if (pageNum > 1) {
            pageNum--;
            renderPage(pageNum);
          }
        };
      }
      if (btnNext) {
        btnNext.onclick = () => {
          if (pageNum < pdfDoc.numPages) {
            pageNum++;
            renderPage(pageNum);
          }
        };
      }
      if (inpPage) {
        inpPage.onchange = () => {
          let val = parseInt(inpPage.value, 10);
          if (isNaN(val)) val = 1;
          val = Math.max(1, Math.min(val, pdfDoc.numPages));
          pageNum = val;
          renderPage(pageNum);
        };
      }
      if (btnZoomIn) {
        btnZoomIn.onclick = () => {
          if (scale < 3.0) {
            scale += 0.2;
            renderPage(pageNum);
          }
        };
      }
      if (btnZoomOut) {
        btnZoomOut.onclick = () => {
          if (scale > 0.5) {
            scale -= 0.2;
            renderPage(pageNum);
          }
        };
      }
      if (btnFit) {
        btnFit.onclick = async () => {
          if (!pdfDoc) return;
          const page = await pdfDoc.getPage(pageNum);
          const unscaled = page.getViewport({ scale: 1.0 });
          const availableWidth = wrap.clientWidth - 48;
          if (availableWidth > 0 && unscaled.width > 0) {
            scale = availableWidth / unscaled.width;
            renderPage(pageNum);
          }
        };
      }
      if (btnDark) {
        btnDark.onclick = () => {
          state.pdfDarkMode = !state.pdfDarkMode;
          canvas.classList.toggle('dark-invert', state.pdfDarkMode);
          btnDark.classList.toggle('active', state.pdfDarkMode);
        };
      }
    } catch (err) {
      console.warn('PDF.js render failed, falling back to iframe:', err);
      el.qlBody.innerHTML = `
        <iframe src="${preview.url}" style="width: 100%; height: 100%; border: none; border-radius: var(--radius-md);"></iframe>
      `;
    }
  }

  function renderCsvPreview(text, item) {
    const rawLines = (text || '').trim().split(/\r?\n/).slice(0, 300);
    if (rawLines.length === 0) return;
    const isTsv = (item.extension || '').toLowerCase() === '.tsv';
    const delimiter = isTsv ? '\t' : ',';
    const rows = rawLines.map(line => {
      const parts = line.split(delimiter);
      return parts.map(c => c.replace(/^"|"$/g, '').trim());
    });
    const headerRow = rows[0] || [];
    const dataRows = rows.slice(1);

    el.qlBody.innerHTML = `
      <div class="ql-csv-container">
        <div class="ql-csv-toolbar">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="background: rgba(16, 185, 129, 0.18); border: 1px solid rgba(16, 185, 129, 0.4); padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10px; color: #34d399;">${isTsv ? 'TSV' : 'CSV'}</span>
            <span id="qlCsvStats" style="font-size: 11px; color: var(--text-dim);">${dataRows.length} rows · ${headerRow.length} columns</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="text" class="ql-csv-search" id="qlCsvFilter" placeholder="Filter rows..." />
            <button class="tool-btn" id="qlBtnCopyCsv" style="padding: 3px 10px; font-size: 11px; height: 26px;">Copy Data</button>
          </div>
        </div>
        <div class="ql-csv-table-wrapper">
          <table class="ql-csv-table" id="qlCsvTable">
            <thead>
              <tr>
                <th class="col-row-num">#</th>
                ${headerRow.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${dataRows.map((r, i) => `
                <tr data-row-idx="${i}">
                  <td class="col-row-num">${i + 1}</td>
                  ${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const filterInput = el.qlBody.querySelector('#qlCsvFilter');
    const tableBody = el.qlBody.querySelector('#qlCsvTable tbody');
    const statsEl = el.qlBody.querySelector('#qlCsvStats');
    const btnCopy = el.qlBody.querySelector('#qlBtnCopyCsv');

    if (filterInput && tableBody) {
      filterInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        const trs = tableBody.querySelectorAll('tr');
        let matched = 0;
        trs.forEach(tr => {
          const match = !q || tr.textContent.toLowerCase().includes(q);
          tr.classList.toggle('filtered-out', !match);
          if (match) matched++;
        });
        if (statsEl) {
          statsEl.textContent = q ? `${matched} of ${dataRows.length} rows matched` : `${dataRows.length} rows · ${headerRow.length} columns`;
        }
      });
    }

    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(text || '');
        showToast('Copied tabular data to clipboard', 'success');
      });
    }
  }

  function highlightSyntax(code, ext) {
    if (!code) return '';
    let escaped = escapeHtml(code);

    const codeExts = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.json', '.html', '.css', '.sql', '.sh', '.bat', '.ps1', '.c', '.cpp', '.cs', '.rs', '.go'];
    if (!codeExts.includes(ext)) {
      return escaped;
    }

    if (ext === '.json') {
      return escaped
        .replace(/"([^"]+)":/g, '<span class="syn-attr">"$1"</span>:')
        .replace(/: "([^"]*)"/g, ': <span class="syn-str">"$1"</span>')
        .replace(/: (true|false|null)/g, ': <span class="syn-bool">$1</span>')
        .replace(/: (-?\d+(\.\d+)?)/g, ': <span class="syn-num">$1</span>');
    }

    // Generic highlight:
    // Comments
    escaped = escaped.replace(/(\/\/[^\n]*)/g, '<span class="syn-comm">$1</span>');
    escaped = escaped.replace(/(#[^\n]*)/g, '<span class="syn-comm">$1</span>');

    // Strings
    escaped = escaped.replace(/(&quot;[\s\S]*?&quot;|&#39;[\s\S]*?&#39;|`[\s\S]*?`)/g, '<span class="syn-str">$1</span>');

    // Keywords
    const kwRegex = /\b(const|let|var|function|return|if|else|for|while|class|import|from|export|default|async|await|try|catch|new|this|typeof|def|elif|self|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|JOIN|GROUP BY|ORDER BY|fn|struct|pub|impl)\b/g;
    escaped = escaped.replace(kwRegex, '<span class="syn-kw">$1</span>');

    // Booleans & Null
    escaped = escaped.replace(/\b(true|false|null|undefined|None|True|False)\b/g, '<span class="syn-bool">$1</span>');

    // Numbers
    escaped = escaped.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="syn-num">$1</span>');

    return escaped;
  }

  function navigateQuickLook(direction) {
    if (!state.quickLookOpen || !state.items || state.items.length === 0) return;
    const currentIdx = state.items.findIndex(it => it.path === state.quickLookFile.path);
    if (currentIdx === -1) return;

    let nextIdx = currentIdx + direction;
    if (nextIdx < 0) nextIdx = state.items.length - 1;
    if (nextIdx >= state.items.length) nextIdx = 0;

    const nextItem = state.items[nextIdx];
    state.selectedIndices.clear();
    state.selectedIndices.add(nextIdx);
    state.activeItem = nextItem;
    openQuickLook(nextItem);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // --- COLORED TAGS SYSTEM ---
  async function assignTag(filePath, tagColor) {
    if (!filePath) return;
    if (!tagColor) {
      state.tags = await api.removeTag(filePath);
    } else {
      state.tags = await api.setTag(filePath, tagColor);
    }
    updateTagCounters();
    
    // Refresh views to show updated tags
    if (state.viewMode === 'columns') {
      renderMillerColumns();
    } else {
      renderCurrentView();
    }

    if (state.quickLookOpen && state.quickLookFile && state.quickLookFile.path === filePath) {
      el.qlCurrentTagDot.className = `tag-dot ${tagColor || ''}`;
    }
  }

  function updateTagCounters() {
    const counts = { red: 0, orange: 0, yellow: 0, green: 0, blue: 0, purple: 0, gray: 0 };
    Object.values(state.tags).forEach(tag => {
      if (counts[tag] !== undefined) counts[tag]++;
    });

    document.getElementById('tagCountRed').textContent = counts.red;
    document.getElementById('tagCountOrange').textContent = counts.orange;
    document.getElementById('tagCountYellow').textContent = counts.yellow;
    document.getElementById('tagCountGreen').textContent = counts.green;
    document.getElementById('tagCountBlue').textContent = counts.blue;
    document.getElementById('tagCountPurple').textContent = counts.purple;
    document.getElementById('tagCountGray').textContent = counts.gray;
  }

  function filterByTag(tagColor) {
    const taggedPaths = Object.keys(state.tags).filter(p => state.tags[p] === tagColor);
    if (taggedPaths.length === 0) {
      showErrorModal(`Tag "${tagColor.toUpperCase()}"`, 'No files currently have this tag assigned.');
      return;
    }

    // Display virtual tagged collection
    state.items = taggedPaths.map(p => {
      const name = p.split('\\').pop();
      return {
        name,
        path: p,
        isDirectory: false,
        size: 0,
        mtime: new Date().toISOString(),
        extension: '.' + (name.split('.').pop() || '')
      };
    });

    state.selectedIndices.clear();
    state.viewMode = 'list';
    updateViewButtons();
    renderListView();
    updateStatusBar();
  }

  // --- DUAL-PANE (SPLIT VIEW) ---
  function toggleDualPane() {
    state.dualPaneActive = !state.dualPaneActive;
    if (el.btnToggleDualPane) el.btnToggleDualPane.classList.toggle('active', state.dualPaneActive);

    if (state.dualPaneActive) {
      el.secondaryPane.style.display = 'flex';
      el.paneDivider.style.display = 'block';
      if (el.splitPaneLabel) el.splitPaneLabel.textContent = 'Split Active';
      
      // Default secondary pane to D: or another drive or user directory
      let secPath = state.drives.length > 1 ? state.drives[1].path : state.currentPath;
      if (secPath === state.currentPath && state.drives.length > 0) {
        secPath = state.drives[0].path;
      }
      loadSecondaryPane(secPath);
    } else {
      el.secondaryPane.style.display = 'none';
      el.paneDivider.style.display = 'none';
      if (el.splitPaneLabel) el.splitPaneLabel.textContent = 'Dual Pane';
      el.primaryPane.style.flex = '1';
      el.secondaryPane.style.flex = '1';
    }
  }

  function renderSecondaryDrives() {
    if (!el.secondaryPaneDrives) return;
    el.secondaryPaneDrives.innerHTML = '';
    const currentDriveLetter = (state.secondaryPath || '').substring(0, 2).toUpperCase();

    state.drives.forEach(drive => {
      const btn = document.createElement('button');
      btn.className = 'secondary-drive-btn' + (drive.letter + ':' === currentDriveLetter ? ' active' : '');
      btn.textContent = drive.letter + ':';
      btn.title = `Switch to ${drive.label}`;
      btn.addEventListener('click', () => loadSecondaryPane(drive.path));
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showDriveContextMenu(e.clientX, e.clientY, drive);
      });
      el.secondaryPaneDrives.appendChild(btn);
    });
  }

  function secondaryGoUp() {
    if (!state.secondaryPath) return;
    const parentPath = getParentPath(state.secondaryPath);
    if (!parentPath) {
      showToast(`Secondary pane already at root (${state.secondaryPath || 'Root'})`, 'info');
      return;
    }
    loadSecondaryPane(parentPath);
  }

  function swapPanes() {
    if (!state.dualPaneActive || !state.secondaryPath) return;
    const temp = state.currentPath;
    navigateTo(state.secondaryPath, false);
    loadSecondaryPane(temp);
  }

  async function loadSecondaryPane(dirPath) {
    let resolved = (dirPath || '').trim();
    if (/^[a-zA-Z]:$/.test(resolved)) resolved += '\\';
    state.secondaryPath = resolved;
    if (el.secondaryPanePath) el.secondaryPanePath.textContent = resolved;
    if (el.btnSecondaryUp) {
      const secParent = getParentPath(resolved);
      el.btnSecondaryUp.disabled = !secParent;
      el.btnSecondaryUp.title = secParent ? `Up to ${secParent} (Alt+Up)` : 'Already at root folder (Alt+Up)';
    }
    renderSecondaryDrives();

    const res = await api.readDir(resolved);
    if (res.success) {
      state.secondaryItems = res.items || [];
      if (el.secondaryPaneCount) {
        el.secondaryPaneCount.textContent = `${state.secondaryItems.length} items`;
      }
      renderSecondaryPane();
    } else {
      showToast('Could not access folder: ' + (res.error || 'Access denied'), 'error');
    }
  }

  function renderSecondaryPane() {
    el.secondaryViewport.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'list-container';

    state.secondaryItems.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'list-row';
      row.draggable = true;
      row.innerHTML = `
        <div class="list-cell list-cell-name">
          <div style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${getFileIcon(item, false)}
          </div>
          <span>${item.name}</span>
        </div>
        <div class="list-cell list-col-size right">${item.isDirectory ? '--' : formatBytes(item.size)}</div>
      `;

      row.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.path);
        e.dataTransfer.effectAllowed = 'copy';
      });

      row.addEventListener('click', () => {
        container.querySelectorAll('.list-row').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        state.secondarySelected = item;
      });

      row.addEventListener('dblclick', () => {
        if (item.isDirectory) {
          loadSecondaryPane(item.path);
        } else {
          api.openItem(item.path);
        }
      });

      container.appendChild(row);
    });

    el.secondaryViewport.appendChild(container);
  }

  function showDriveContextMenu(x, y, drive) {
    const isEjectable = drive.letter !== 'C';
    const old = document.querySelector('.drive-context-menu');
    if (old) old.remove();

    const menu = document.createElement('div');
    menu.className = 'context-menu drive-context-menu';
    menu.style.cssText = `position: fixed; left: ${x}px; top: ${y}px; display: flex; flex-direction: column; z-index: 10000; min-width: 180px;`;

    menu.innerHTML = `
      <div class="context-item" id="driveCtxOpen">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        <span>Open in New Tab</span>
      </div>
      <div class="context-item" id="driveCtxManage">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        <span>Manage Storage</span>
      </div>
      <div class="context-item" id="driveCtxChkdsk">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
        <span>Check File System (Chkdsk)</span>
      </div>
      <div class="context-item" id="driveCtxCleanup">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        <span>Disk Cleanup</span>
      </div>
      <div class="context-item" id="driveCtxOptimize">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m8 17 4 4 4-4"/></svg>
        <span>Defrag & Optimize</span>
      </div>
      <div class="context-item" id="driveCtxFormat">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01"/><path d="M10 8h.01"/><path d="M14 8h.01"/></svg>
        <span>Format Volume...</span>
      </div>
      ${isEjectable ? `
        <div class="context-divider"></div>
        <div class="context-item" id="driveCtxEject">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 4 4 14 20 14"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
          <span>Eject (${drive.letter}:)</span>
        </div>
      ` : ''}
      <div class="context-divider"></div>
      <div class="context-item" id="driveCtxProperties">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>Properties</span>
      </div>
    `;

    document.body.appendChild(menu);

    const onDocClick = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', onDocClick);
      }
    };
    setTimeout(() => document.addEventListener('click', onDocClick), 10);

    const openItem = menu.querySelector('#driveCtxOpen');
    if (openItem) {
      openItem.addEventListener('click', () => {
        menu.remove();
        createTab(drive.path);
      });
    }

    const manageItem = menu.querySelector('#driveCtxManage');
    if (manageItem) {
      manageItem.addEventListener('click', () => {
        menu.remove();
        openStorageModal(drive.path);
      });
    }

    const chkdskItem = menu.querySelector('#driveCtxChkdsk');
    if (chkdskItem) {
      chkdskItem.addEventListener('click', async () => {
        menu.remove();
        showToast(`Running filesystem integrity check on (${drive.letter}:)...`, 'info');
        await api.launchWindowsTool('chkdsk', drive.letter);
      });
    }

    const cleanupItem = menu.querySelector('#driveCtxCleanup');
    if (cleanupItem) {
      cleanupItem.addEventListener('click', async () => {
        menu.remove();
        showToast(`Opening Disk Cleanup for (${drive.letter}:)...`, 'info');
        await api.launchWindowsTool('cleanmgr', drive.letter);
      });
    }

    const optimizeItem = menu.querySelector('#driveCtxOptimize');
    if (optimizeItem) {
      optimizeItem.addEventListener('click', async () => {
        menu.remove();
        showToast('Opening Windows Drive Optimization & TRIM utility...', 'info');
        await api.launchWindowsTool('dfrgui', drive.letter);
      });
    }

    const formatItem = menu.querySelector('#driveCtxFormat');
    if (formatItem) {
      formatItem.addEventListener('click', async () => {
        menu.remove();
        if (drive.letter === 'C') {
          showToast('Cannot format Windows OS system drive', 'warning');
          return;
        }
        showConfirmModal(
          `Format Drive (${drive.letter}:)?`,
          `Formatting will erase ALL data on volume "${drive.label}" (${drive.letter}:). You can launch Windows Disk Management to perform a secure format.`,
          async () => {
            await api.launchWindowsTool('diskmgmt', drive.letter);
          }
        );
      });
    }

    if (isEjectable) {
      const ejectItem = menu.querySelector('#driveCtxEject');
      if (ejectItem) {
        ejectItem.addEventListener('click', async () => {
          menu.remove();
          try {
            const res = await api.ejectDrive(drive.letter);
            if (res && res.success) {
              showToast(`Drive (${drive.letter}:) safely ejected`, 'info');
              if (state.currentPath.toUpperCase().startsWith(drive.letter.toUpperCase() + ':')) {
                navigateTo('C:\\');
              }
              await loadInitialData();
            } else {
              showToast(`Could not eject (${drive.letter}:) - Drive is currently in use`, 'warning');
            }
          } catch (err) {
            showToast(`Error ejecting (${drive.letter}:): ${err.message}`, 'error');
          }
        });
      }
    }

    const propItem = menu.querySelector('#driveCtxProperties');
    if (propItem) {
      propItem.addEventListener('click', () => {
        menu.remove();
        openPropertiesModal({
          name: drive.label,
          path: drive.path,
          isDirectory: true,
          size: drive.totalBytes,
          mtime: null
        });
      });
    }
  }

  function formatDriveDisplayName(drive) {
    if (!drive) return '';
    const letter = drive.letter || (drive.path ? drive.path.charAt(0).toUpperCase() : '');
    let label = (drive.label || (letter === 'C' ? 'OS Disk' : 'Local Drive')).trim();
    if (letter) {
      label = label.replace(new RegExp(`\\s*\\(${letter}:\\)`, 'gi'), '').trim();
      return `${label} (${letter}:)`;
    }
    return label;
  }

  // --- SIDEBAR DRIVES & PINS (Recovered Layout - media_1790265470605.png) ---
  function renderSidebarDrives() {
    if (!el.sidebarDrivesList) return;
    el.sidebarDrivesList.innerHTML = '';
    state.drives.forEach(drive => {
      const li = document.createElement('li');
      li.className = 'sidebar-item';
      li.dataset.path = drive.path;

      const pct = drive.totalBytes > 0 ? Math.round((drive.usedBytes / drive.totalBytes) * 100) : 0;
      const isEjectable = drive.letter !== 'C';
      const ejectBtnHtml = isEjectable
        ? `<button class="sidebar-drive-eject" title="Safely Eject ${drive.letter}:" aria-label="Eject ${drive.letter}:">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px; display: block;"><polygon points="12 4 4 14 20 14"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
           </button>`
        : '';

      const displayName = formatDriveDisplayName(drive);
      li.title = `${displayName} (${pct}% used, ${formatBytes(drive.freeBytes)} free)`;

      li.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/></svg>
        <span class="sidebar-item-label">${displayName}</span>
        <div class="sidebar-drive-gauge" title="${pct}% used (${formatBytes(drive.freeBytes)} free)">
          <div class="sidebar-drive-fill" style="width: ${pct}%;"></div>
        </div>
        ${ejectBtnHtml}
      `;

      li.addEventListener('click', () => navigateTo(drive.path));

      if (isEjectable) {
        const ejectBtn = li.querySelector('.sidebar-drive-eject');
        if (ejectBtn) {
          ejectBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            ejectBtn.style.opacity = '0.4';
            try {
              const res = await api.ejectDrive(drive.letter);
              if (res && res.success) {
                showToast(`Drive (${drive.letter}:) safely ejected`, 'info');
                if (state.currentPath.toUpperCase().startsWith(drive.letter.toUpperCase() + ':')) {
                  navigateTo('C:\\');
                }
                await loadInitialData();
              } else {
                ejectBtn.style.opacity = '1';
                showToast(`Could not eject (${drive.letter}:) - Drive is currently in use`, 'warning');
              }
            } catch (err) {
              ejectBtn.style.opacity = '1';
              showToast(`Error ejecting (${drive.letter}:): ${err.message}`, 'error');
            }
          });
        }
      }

      li.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showDriveContextMenu(e.clientX, e.clientY, drive);
      });

      el.sidebarDrivesList.appendChild(li);
    });
  }

  function initSidebarFavorites() {
    const getSpecialPath = (id, fallback) => {
      const f = (state.specialFolders || []).find(item => item.id === id);
      return (f && f.path) ? f.path : fallback;
    };
    const home = state.homePath || getSpecialPath('home', 'C:\\');

    if (el.sidebarRecents) {
      const recentPath = getSpecialPath('recents', home + '\\AppData\\Roaming\\Microsoft\\Windows\\Recent');
      el.sidebarRecents.dataset.path = recentPath;
      el.sidebarRecents.onclick = () => navigateTo(recentPath);
    }
    if (el.sidebarShared) {
      const sharedPath = getSpecialPath('shared', 'C:\\Users\\Public');
      el.sidebarShared.dataset.path = sharedPath;
      el.sidebarShared.onclick = () => navigateTo(sharedPath);
    }
    if (el.sidebarHome) {
      el.sidebarHome.dataset.path = home;
      el.sidebarHome.onclick = () => navigateTo(home);
    }
    if (el.sidebarDesktop) {
      const deskPath = getSpecialPath('desktop', home + '\\Desktop');
      el.sidebarDesktop.dataset.path = deskPath;
      el.sidebarDesktop.onclick = () => navigateTo(deskPath);
    }
    if (el.sidebarDocuments) {
      const docPath = getSpecialPath('documents', home + '\\Documents');
      el.sidebarDocuments.dataset.path = docPath;
      el.sidebarDocuments.onclick = () => navigateTo(docPath);
    }
    if (el.sidebarDownloads) {
      const dlPath = getSpecialPath('downloads', home + '\\Downloads');
      el.sidebarDownloads.dataset.path = dlPath;
      el.sidebarDownloads.onclick = () => navigateTo(dlPath);
    }
    if (el.sidebarPictures) {
      const picPath = getSpecialPath('pictures', home + '\\Pictures');
      el.sidebarPictures.dataset.path = picPath;
      el.sidebarPictures.onclick = () => navigateTo(picPath);
    }
    if (el.sidebarRecycleBin) {
      el.sidebarRecycleBin.dataset.special = 'recycle-bin';
      el.sidebarRecycleBin.onclick = () => navigateTo('recycle-bin');
      setupRecycleBinDropTarget(el.sidebarRecycleBin);
      el.sidebarRecycleBin.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showRecycleBinContextMenu(e.clientX, e.clientY);
      });
      updateRecycleBinBadge();
    }
    if (el.sidebarApps) {
      const appsPath = getSpecialPath('applications', 'C:\\Program Files');
      el.sidebarApps.dataset.path = appsPath;
      el.sidebarApps.onclick = () => navigateTo(appsPath);
    }
    if (el.sidebarCloud) {
      const cloudPath = getSpecialPath('cloud', home + '\\OneDrive');
      el.sidebarCloud.dataset.path = cloudPath;
      el.sidebarCloud.onclick = () => navigateTo(cloudPath);
    }
  }

  async function openRecycleBinHandler() {
    navigateTo('recycle-bin');
  }

  async function updateRecycleBinBadge() {
    if (!el.sidebarRecycleCount) return;
    try {
      const stats = await api.getRecycleStats();
      const count = stats?.count || 0;
      if (count > 0) {
        el.sidebarRecycleCount.textContent = count > 99 ? '99+' : String(count);
        el.sidebarRecycleCount.title = `${count} item${count > 1 ? 's' : ''} in Recycle Bin (${formatBytes(stats.bytes || 0)})`;
        el.sidebarRecycleCount.style.display = 'inline-block';
      } else {
        el.sidebarRecycleCount.textContent = '0';
        el.sidebarRecycleCount.title = 'Recycle Bin is empty';
        el.sidebarRecycleCount.style.display = 'none';
      }
    } catch {
      el.sidebarRecycleCount.style.display = 'none';
    }
  }

  function setupRecycleBinDropTarget(elRecycle) {
    if (!elRecycle) return;
    elRecycle.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      elRecycle.classList.add('recycle-drop-active');
    });
    elRecycle.addEventListener('dragleave', () => {
      elRecycle.classList.remove('recycle-drop-active');
    });
    elRecycle.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      elRecycle.classList.remove('recycle-drop-active');
      const paths = parseDroppedPaths(e.dataTransfer);
      if (paths && paths.length > 0) {
        let deletedCount = 0;
        for (const p of paths) {
          const res = await api.deleteItem(p);
          if (res?.success) deletedCount++;
        }
        if (deletedCount > 0) {
          showToast(`Moved ${deletedCount} item${deletedCount > 1 ? 's' : ''} to Recycle Bin`, 'info');
          navigateTo(state.currentPath, false);
          updateRecycleBinBadge();
        }
      }
    });
  }

  function showRecycleBinContextMenu(x, y) {
    const existing = document.getElementById('recycleContextMenu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'recycleContextMenu';
    menu.className = 'context-menu';
    menu.style.display = 'flex';
    menu.style.position = 'fixed';
    menu.style.zIndex = '9999';

    menu.innerHTML = `
      <div class="ctx-item" id="ctxRecycleOpen">
        <span class="ctx-icon">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </span>
        <span>Open System Recycle Bin</span>
      </div>
      <div class="ctx-divider"></div>
      <div class="ctx-item danger" id="ctxRecycleEmpty">
        <span class="ctx-icon">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </span>
        <span>Empty Recycle Bin...</span>
      </div>
      <div class="ctx-item" id="ctxRecycleStorage">
        <span class="ctx-icon">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
        </span>
        <span>Storage & Cleanup Details</span>
      </div>
    `;

    document.body.appendChild(menu);

    const menuWidth = 220;
    const menuHeight = 120;
    const posX = Math.min(x, window.innerWidth - menuWidth - 10);
    const posY = Math.min(y, window.innerHeight - menuHeight - 10);
    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;

    const closeRecycleMenu = () => {
      menu.remove();
      document.removeEventListener('click', closeRecycleMenu);
      document.removeEventListener('keydown', handleEsc);
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') closeRecycleMenu();
    };

    setTimeout(() => {
      document.addEventListener('click', closeRecycleMenu);
      document.addEventListener('keydown', handleEsc);
    }, 10);

    menu.querySelector('#ctxRecycleOpen')?.addEventListener('click', () => {
      closeRecycleMenu();
      openRecycleBinHandler();
    });

    menu.querySelector('#ctxRecycleEmpty')?.addEventListener('click', () => {
      closeRecycleMenu();
      promptEmptyRecycleBin();
    });

    menu.querySelector('#ctxRecycleStorage')?.addEventListener('click', () => {
      closeRecycleMenu();
      openStorageModal();
    });
  }

  async function promptEmptyRecycleBin() {
    try {
      const stats = await api.getRecycleStats();
      const count = stats?.count || 0;
      const msg = count > 0 
        ? `Permanently delete ${count} item${count > 1 ? 's' : ''} (${formatBytes(stats.bytes || 0)}) from the Recycle Bin? This action cannot be undone.`
        : 'Permanently empty all items from the Recycle Bin? This action cannot be undone.';
      showConfirmModal(
        'Empty Recycle Bin',
        msg,
        async () => {
          showToast('Emptying Recycle Bin...', 'info');
          const res = await api.emptyRecycleBin();
          if (res?.success !== false) {
            showToast('Recycle Bin emptied successfully', 'success');
            updateRecycleBinBadge();
            if (state.currentPath === 'Recycle Bin' || state.currentPath === 'recycle-bin') {
              navigateTo('recycle-bin', false);
            }
          } else {
            showToast('Failed to empty Recycle Bin: ' + (res.error || 'Unknown error'), 'error');
          }
        },
        'Empty Recycle Bin',
        'Cancel',
        true
      );
    } catch (err) {
      showToast('Error emptying Recycle Bin: ' + (err?.message || err), 'error');
    }
  }

  function handleRecycleItemDoubleClick(item) {
    if (!item) return;
    const orig = item.originalLocation || item.originalPath || 'its original location';
    showConfirmModal(
      'Restore Deleted Item',
      `Do you want to restore "${item.name}" to its original location (${orig})?`,
      () => handleRestoreSelectedItem(item),
      'Restore',
      'Cancel'
    );
  }

  async function handleRestoreSelectedItem(targetItem = null) {
    let item = targetItem || state.activeItem;
    if (!item && state.selectedIndices && state.selectedIndices.size > 0) {
      item = state.items[Array.from(state.selectedIndices)[0]];
    }
    if (!item) {
      showToast('Select an item to restore', 'info');
      return;
    }
    showToast(`Restoring "${item.name}"...`, 'info');
    try {
      const res = await api.restoreRecycleItem(item.path);
      if (res?.success !== false) {
        showToast(`Restored "${item.name}" to original location`, 'success');
        await updateRecycleBinBadge();
        if (state.currentPath === 'Recycle Bin' || state.currentPath === 'recycle-bin') {
          await navigateTo('recycle-bin', false);
        }
      } else {
        showToast(res?.error || 'Could not restore item', 'error');
      }
    } catch (err) {
      showToast('Error restoring item: ' + (err?.message || err), 'error');
    }
  }

  async function handleRestoreAllRecycle() {
    if (!state.items || state.items.length === 0) {
      showToast('Recycle Bin is already empty', 'info');
      return;
    }
    showConfirmModal(
      'Restore All Items',
      `Restore all ${state.items.length} items to their original locations?`,
      async () => {
        showToast('Restoring all items...', 'info');
        try {
          const res = await api.restoreAllRecycle();
          if (res?.success !== false) {
            showToast('All items restored successfully', 'success');
            await updateRecycleBinBadge();
            if (state.currentPath === 'Recycle Bin' || state.currentPath === 'recycle-bin') {
              await navigateTo('recycle-bin', false);
            }
          } else {
            showToast(res?.error || 'Could not restore items', 'error');
          }
        } catch (err) {
          showToast('Error restoring items: ' + (err?.message || err), 'error');
        }
      },
      'Restore All',
      'Cancel'
    );
  }

  async function handleDeletePermanentlyItem(targetItem = null) {
    let item = targetItem || state.activeItem;
    if (!item && state.selectedIndices && state.selectedIndices.size > 0) {
      item = state.items[Array.from(state.selectedIndices)[0]];
    }
    if (!item) {
      showToast('Select an item to delete permanently', 'info');
      return;
    }
    showConfirmModal(
      'Permanently Delete Item',
      `Permanently delete "${item.name}"? This action cannot be undone.`,
      async () => {
        showToast(`Permanently deleting "${item.name}"...`, 'info');
        try {
          const res = await api.deletePermanently(item.path);
          if (res?.success !== false) {
            showToast(`Deleted "${item.name}" permanently`, 'success');
            await updateRecycleBinBadge();
            if (state.currentPath === 'Recycle Bin' || state.currentPath === 'recycle-bin') {
              await navigateTo('recycle-bin', false);
            }
          } else {
            showToast(res?.error || 'Could not delete item', 'error');
          }
        } catch (err) {
          showToast('Error deleting item: ' + (err?.message || err), 'error');
        }
      },
      'Delete Permanently',
      'Cancel',
      true
    );
  }

  function toggleSidebar(forceState = null) {
    if (!el.sidebar || !el.mainLayout) return;
    if (window.innerWidth <= 768) {
      const shouldOpen = forceState !== null ? forceState : !el.sidebar.classList.contains('open-mobile');
      el.sidebar.classList.toggle('open-mobile', shouldOpen);
      if (el.sidebarBackdrop) {
        el.sidebarBackdrop.style.display = shouldOpen ? 'block' : 'none';
      }
      if (el.btnToggleSidebar) {
        el.btnToggleSidebar.classList.toggle('active', shouldOpen);
        el.btnToggleSidebar.title = shouldOpen ? 'Close sidebar (Ctrl+B)' : 'Open sidebar (Ctrl+B)';
      }
    } else {
      const shouldCollapse = forceState !== null ? !forceState : !el.mainLayout.classList.contains('sidebar-collapsed');
      el.mainLayout.classList.toggle('sidebar-collapsed', shouldCollapse);
      try {
        localStorage.setItem('myfiles_sidebar_collapsed', String(shouldCollapse));
      } catch (err) {}
      if (el.btnToggleSidebar) {
        el.btnToggleSidebar.classList.toggle('active', !shouldCollapse);
        el.btnToggleSidebar.title = shouldCollapse ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)';
      }
    }
  }

  function renderSidebarPins() {
    el.sidebarPinsList.innerHTML = '';
    const home = (state.homePath || '').toLowerCase().replace(/[\\/]+$/, '');
    const standardPaths = new Set([
      home,
      `${home}\\recent`,
      `${home}\\documents`,
      `${home}\\downloads`,
      `${home}\\desktop`,
      'c:\\users\\public'
    ]);
    const standardNames = new Set(['home', 'recent', 'recents', 'shared', 'documents', 'downloads', 'desktop']);

    state.pins.forEach((pin, idx) => {
      if (!pin || !pin.path) return;
      const norm = pin.path.toLowerCase().replace(/[\\/]+$/, '');
      const normName = (pin.name || '').toLowerCase().trim();
      if (standardPaths.has(norm) || standardNames.has(normName)) return;

      const li = document.createElement('li');
      li.className = 'sidebar-item';
      li.dataset.path = pin.path;
      li.title = pin.name || 'Pinned Folder';

      li.innerHTML = `
        <svg class="icon sidebar-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
        <span class="sidebar-item-label">${pin.name}</span>
      `;

      li.addEventListener('click', () => navigateTo(pin.path));

      // Support dropping files into this pinned folder
      setupFolderDropTarget(li, pin.path, () => {
        if (state.currentPath === pin.path) {
          navigateTo(state.currentPath, false);
        }
      });

      // Right-click unpin
      li.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        unpinSidebarItem(idx);
      });

      el.sidebarPinsList.appendChild(li);
    });
  }

  async function pinFolderToSidebar(folderPath) {
    if (!folderPath) return;
    const cleanPath = folderPath.replace(/^"|"$/g, '').trim();
    const name = cleanPath.split(/[\\/]/).filter(Boolean).pop() || cleanPath;
    if (state.pins.some(p => p.path.toLowerCase() === cleanPath.toLowerCase())) return;
    state.pins.push({ name, path: cleanPath });
    await api.savePins(state.pins);
    renderSidebarPins();
  }

  async function unpinSidebarItem(index) {
    state.pins.splice(index, 1);
    await api.savePins(state.pins);
    renderSidebarPins();
  }

  function highlightSidebarActive() {
    if (!el.sidebar) return;
    const currentNorm = (state.currentPath || '').replace(/[\\/]+$/, '').toLowerCase();
    const isRecycle = (currentNorm === 'recycle-bin' || currentNorm === 'recycle bin' || currentNorm === 'trash');
    const allItems = el.sidebar.querySelectorAll('.sidebar-item');
    allItems.forEach(item => {
      if (item === el.sidebarRecycleBin) {
        item.classList.toggle('active', isRecycle);
        return;
      }
      const itemNorm = (item.dataset.path || '').replace(/[\\/]+$/, '').toLowerCase();
      item.classList.toggle('active', !isRecycle && !!(itemNorm && itemNorm === currentNorm));
    });
  }

  // --- FAST LIVE SEARCH & QUICK IN-FOLDER FILTER ---
  function handleSearchInput(query) {
    state.filterQuery = query || '';
    el.btnSearchClear.style.display = query ? 'flex' : 'none';

    const trimmed = (query || '').trim();
    if (trimmed && el.searchPopover) {
      el.searchPopover.style.display = 'block';
      const fnQuery = el.searchPopFilename ? el.searchPopFilename.querySelector('.search-pop-query') : null;
      if (fnQuery) fnQuery.textContent = trimmed;
      const cntQuery = el.searchPopContent ? el.searchPopContent.querySelector('.search-pop-query') : null;
      if (cntQuery) cntQuery.textContent = trimmed;

      // Check tag matches
      const tagLower = trimmed.toLowerCase();
      const validTags = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'];
      const matchedTags = validTags.filter(t => t.includes(tagLower));
      if (matchedTags.length > 0 && el.searchPopTagsSection && el.searchPopTagsList) {
        el.searchPopTagsSection.style.display = 'block';
        el.searchPopTagsList.innerHTML = matchedTags.map(t => `
          <div class="search-pop-item" data-tag="${t}">
            <span class="tag-dot inline ${t}"></span>
            <span style="text-transform: capitalize;">${t}</span>
          </div>
        `).join('');
        el.searchPopTagsList.querySelectorAll('.search-pop-item').forEach(tagItem => {
          tagItem.addEventListener('click', () => {
            el.searchPopover.style.display = 'none';
            filterByTag(tagItem.dataset.tag);
          });
        });
      } else if (el.searchPopTagsSection) {
        el.searchPopTagsSection.style.display = 'none';
      }
    } else if (el.searchPopover) {
      el.searchPopover.style.display = 'none';
    }

    // Instant in-folder filtering (0ms feedback!)
    applyItemFilter();
    if (state.viewMode === 'columns') {
      renderMillerColumns();
    } else {
      renderCurrentView();
    }
    updateStatusBar();
  }

  function filterByKind(kind) {
    const imgExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    const docExts = ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf', '.csv', '.xlsx'];
    const codeExts = ['.js', '.ts', '.jsx', '.tsx', '.py', '.json', '.html', '.css', '.dart', '.rs', '.cpp', '.c', '.cs', '.go', '.sh', '.bat', '.ps1', '.sql'];

    state.items = state.rawItems.filter(it => {
      const ext = (it.extension || '').toLowerCase();
      if (kind === 'folder') return it.isDirectory;
      if (kind === 'image') return !it.isDirectory && imgExts.includes(ext);
      if (kind === 'document') return !it.isDirectory && docExts.includes(ext);
      if (kind === 'code') return !it.isDirectory && codeExts.includes(ext);
      return true;
    });
    sortCurrentItems();
    renderCurrentView();
    updateStatusBar();
  }

  function toggleHiddenFiles() {
    state.showHidden = !state.showHidden;
    if (el.hiddenSlash) {
      el.hiddenSlash.style.display = state.showHidden ? 'none' : 'block';
    }
    el.btnToggleHidden.classList.toggle('active', state.showHidden);
    if (el.settingsCheckHidden) {
      el.settingsCheckHidden.checked = state.showHidden;
    }
    applyItemFilter();
    if (state.viewMode === 'columns') {
      renderMillerColumns();
    } else {
      renderCurrentView();
    }
    updateStatusBar();
    showToast(state.showHidden ? 'Showing hidden and system files' : 'Hiding hidden and system files', 'info');
  }

  async function executeSearch(query) {
    state.isSearching = true;
    state.searchQuery = query;
    state.searchId++;
    const currentId = state.searchId;

    const searchRoot = (state.searchScope === 'all')
      ? (state.drives.length > 0 ? state.drives[0].path : 'C:\\')
      : state.currentPath;

    el.primaryViewport.innerHTML = `
      <div class="search-results-header">
        <span>Searching for "<strong>${escapeHtml(query)}</strong>" in ${escapeHtml(searchRoot)}...</span>
      </div>
      <div class="empty-state">
        <svg class="icon spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/></svg>
        <span class="empty-state-sub">Scanning files instantly...</span>
      </div>
    `;

    const res = await api.searchFiles({
      searchId: currentId,
      rootDir: searchRoot,
      query,
      searchContent: state.searchType === 'content',
      maxResults: 200
    });

    if (res.searchId !== state.searchId) return; // Obsolete search

    state.searchResults = res.results;
    state.items = res.results;
    state.selectedIndices.clear();

    renderSearchResults(res);
  }

  function renderSearchResults(searchRes) {
    el.primaryViewport.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'search-results-header';
    header.innerHTML = `
      <span>Found <strong>${searchRes.count}</strong> items matching "<strong>${escapeHtml(state.searchQuery)}</strong>" (${searchRes.durationMs}ms)</span>
      <span style="font-size: 11px; color: var(--text-dim);">Searched inside ${state.currentPath}</span>
    `;
    el.primaryViewport.appendChild(header);

    if (searchRes.count === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <div class="empty-state-title">No matching files found</div>
        <div class="empty-state-sub">Try searching by file name or switch to Content Search</div>
      `;
      el.primaryViewport.appendChild(empty);
      return;
    }

    const container = document.createElement('div');
    container.className = 'list-container';

    searchRes.results.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'list-row';
      row.innerHTML = `
        <div class="list-cell list-cell-name">
          <div style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${getFileIcon(item, false)}
          </div>
          <div>
            <span>${item.name}</span>
            ${item.matchSnippet ? `<div class="search-snippet">${escapeHtml(item.matchSnippet)}</div>` : ''}
          </div>
        </div>
        <div class="list-cell list-col-date">${formatDate(item.mtime)}</div>
        <div class="list-cell list-col-size right">${item.isDirectory ? 'Folder' : formatBytes(item.size)}</div>
      `;

      row.addEventListener('click', (e) => handleItemSelection(idx, e));
      row.addEventListener('dblclick', () => {
        if (item.isRecycleBinItem) {
          handleRecycleItemDoubleClick(item);
          return;
        }
        if (item.isDirectory) {
          state.isSearching = false;
          el.searchInput.value = '';
          el.btnSearchClear.style.display = 'none';
          navigateTo(item.path);
        } else {
          api.openItem(item.path);
        }
      });

      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e.clientX, e.clientY, item);
      });

      container.appendChild(row);
    });

    el.primaryViewport.appendChild(container);
  }

  function isImageFile(item) {
    if (!item || item.isDirectory) return false;
    const ext = (item.extension || '').toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff'].includes(ext);
  }

  // --- INSTANT 0ms CONTEXT MENU ---
  function showContextMenu(x, y, targetItem = undefined) {
    state.contextTarget = targetItem !== undefined ? targetItem : state.activeItem;
    const hasTarget = !!state.contextTarget;
    const isDir = hasTarget && !!state.contextTarget.isDirectory;
    const isFile = hasTarget && !isDir;
    const isImg = isFile && isImageFile(state.contextTarget);
    const isMedia = isFile && isMediaFile(state.contextTarget);
    const isArchive = isFile && isArchiveFile(state.contextTarget);
    const selCount = (state.selectedIndices && state.selectedIndices.size > 0) ? state.selectedIndices.size : (hasTarget ? 1 : 0);

    // 1. Tags row (Only visible when right-clicking a specific file/folder)
    const tagsRow = el.contextMenu.querySelector('.ctx-tags-row');
    if (tagsRow) tagsRow.style.display = hasTarget ? 'flex' : 'none';

    // 2. Primary Item Actions (Open, Quick Look, Get Info, Share)
    if (el.ctxOpen) el.ctxOpen.style.display = hasTarget ? 'flex' : 'none';
    if (el.ctxOpenNewWindow) el.ctxOpenNewWindow.style.display = isDir ? 'flex' : 'none';
    if (el.ctxOpenNewTab) el.ctxOpenNewTab.style.display = isDir ? 'flex' : 'none';
    if (el.ctxQuickLook) el.ctxQuickLook.style.display = isFile ? 'flex' : 'none';
    if (el.ctxGetInfo) el.ctxGetInfo.style.display = hasTarget ? 'flex' : 'none';
    if (el.ctxShare) el.ctxShare.style.display = hasTarget ? 'flex' : 'none';

    // 3. Media Actions (VLC)
    if (el.ctxVlcDivider) el.ctxVlcDivider.style.display = isMedia ? 'block' : 'none';
    if (el.ctxVlcPlay) {
      el.ctxVlcPlay.style.display = isMedia ? 'flex' : 'none';
      if (el.ctxVlcPlayText) {
        el.ctxVlcPlayText.textContent = state.vlcInstalled ? 'Play in VLC' : 'Play in Default Player';
      }
    }
    if (el.ctxVlcEnqueue) el.ctxVlcEnqueue.style.display = (isMedia && state.vlcInstalled) ? 'flex' : 'none';

    // 4. Archive Actions
    if (el.ctxArchiveDivider) el.ctxArchiveDivider.style.display = isArchive ? 'block' : 'none';
    if (el.ctxExtractAll) el.ctxExtractAll.style.display = isArchive ? 'flex' : 'none';
    if (el.ctxExtractHere) el.ctxExtractHere.style.display = isArchive ? 'flex' : 'none';
    if (isArchive && el.ctxExtractAllText) {
      const baseName = state.contextTarget.name.replace(/\.[^/.]+$/, '');
      el.ctxExtractAllText.textContent = `Extract to "${baseName}/"...`;
    }

    // 5. File Operations & Clipboard (Cut, Copy, Duplicate, Paste)
    if (el.ctxCut) el.ctxCut.style.display = hasTarget ? 'flex' : 'none';
    if (el.ctxCopy) el.ctxCopy.style.display = hasTarget ? 'flex' : 'none';
    if (el.ctxDuplicate) el.ctxDuplicate.style.display = hasTarget ? 'flex' : 'none';
    if (el.ctxPaste) {
      const canPaste = !hasTarget && state.clipboard && state.clipboard.paths && state.clipboard.paths.length > 0;
      el.ctxPaste.style.display = canPaste ? 'flex' : 'none';
    }

    // 6. Creation Actions (Only on empty canvas / background)
    if (el.ctxNewFolder) el.ctxNewFolder.style.display = !hasTarget ? 'flex' : 'none';
    if (el.ctxNewFile) el.ctxNewFile.style.display = !hasTarget ? 'flex' : 'none';

    // 7. Dual-Pane Actions
    if (el.ctxMoveOpposite) el.ctxMoveOpposite.style.display = (state.dualPaneActive && hasTarget) ? 'flex' : 'none';
    if (el.ctxCopyOpposite) el.ctxCopyOpposite.style.display = (state.dualPaneActive && hasTarget) ? 'flex' : 'none';

    // 8. Compression Actions (Only when item/items selected)
    if (el.ctxCompressDivider) el.ctxCompressDivider.style.display = hasTarget ? 'block' : 'none';
    if (el.ctxCompressZip) el.ctxCompressZip.style.display = hasTarget ? 'flex' : 'none';
    if (el.ctxCompress7z) el.ctxCompress7z.style.display = hasTarget ? 'flex' : 'none';

    // 9. Folder / Item Navigation & Naming
    if (el.ctxPin) el.ctxPin.style.display = isDir ? 'flex' : 'none';
    if (el.ctxRename) el.ctxRename.style.display = hasTarget ? 'flex' : 'none';
    if (el.ctxBatchRename) el.ctxBatchRename.style.display = ((state.selectedIndices && state.selectedIndices.size > 1) || hasTarget) ? 'flex' : 'none';

    if (el.ctxNewFolderWithSelection) {
      if (hasTarget && selCount > 0) {
        el.ctxNewFolderWithSelection.style.display = 'flex';
        if (el.ctxNewFolderWithSelectionText) {
          el.ctxNewFolderWithSelectionText.textContent = `New Folder with Selection (${selCount} Item${selCount > 1 ? 's' : ''})`;
        }
      } else {
        el.ctxNewFolderWithSelection.style.display = 'none';
      }
    }

    // 10. Image Tools
    if (el.ctxRotateClockwise) el.ctxRotateClockwise.style.display = isImg ? 'flex' : 'none';

    // 11. Destructive Actions
    if (el.ctxDelete) el.ctxDelete.style.display = hasTarget ? 'flex' : 'none';

    // 12. Path & Selection Utilities
    if (el.ctxCopyPath) el.ctxCopyPath.style.display = hasTarget ? 'flex' : 'none';
    if (el.ctxSelectAll) el.ctxSelectAll.style.display = !hasTarget ? 'flex' : 'none';
    if (el.ctxInvertSelect) el.ctxInvertSelect.style.display = !hasTarget ? 'flex' : 'none';
    if (el.ctxUp) {
      const parent = getParentPath(state.currentPath);
      el.ctxUp.style.display = (!hasTarget && parent) ? 'flex' : 'none';
      if (parent && el.ctxUpText) {
        const parentName = parent.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || parent;
        el.ctxUpText.textContent = `Up to "${parentName}"`;
      }
    }
    if (el.ctxRefresh) el.ctxRefresh.style.display = !hasTarget ? 'flex' : 'none';

    // 13. System Integration
    if (el.ctxTerminal) el.ctxTerminal.style.display = (!hasTarget || isDir) ? 'flex' : 'none';
    if (el.ctxPowerShell) el.ctxPowerShell.style.display = (!hasTarget || isDir) ? 'flex' : 'none';
    if (el.ctxCmd) el.ctxCmd.style.display = (!hasTarget || isDir) ? 'flex' : 'none';
    if (el.ctxReveal) el.ctxReveal.style.display = 'none';

    // 14. Maintenance & Storage Tools (Empty background or folder target)
    if (el.ctxFindDuplicates) el.ctxFindDuplicates.style.display = (!hasTarget || isDir) ? 'flex' : 'none';
    if (el.ctxManageStorage) el.ctxManageStorage.style.display = !hasTarget ? 'flex' : 'none';

    // 15. View Options & Preferences (Empty background only)
    if (el.ctxViewOptions) el.ctxViewOptions.style.display = !hasTarget ? 'flex' : 'none';
    if (el.ctxPreferences) el.ctxPreferences.style.display = !hasTarget ? 'flex' : 'none';

    // 16. Properties
    if (el.ctxProperties) el.ctxProperties.style.display = 'flex';

    // 17. Recycle Bin Context Mode
    const isRecycle = (state.currentPath === 'Recycle Bin' || state.currentPath === 'recycle-bin' || (state.contextTarget && state.contextTarget.isRecycleBinItem));
    if (isRecycle) {
      if (tagsRow) tagsRow.style.display = 'none';
      if (el.ctxRestore) el.ctxRestore.style.display = hasTarget ? 'flex' : 'none';
      if (el.ctxDeletePermanently) el.ctxDeletePermanently.style.display = hasTarget ? 'flex' : 'none';
      if (el.ctxRestoreAll) el.ctxRestoreAll.style.display = !hasTarget ? 'flex' : 'none';
      if (el.ctxEmptyRecycle) el.ctxEmptyRecycle.style.display = !hasTarget ? 'flex' : 'none';

      if (el.ctxOpen) el.ctxOpen.style.display = 'none';
      if (el.ctxOpenNewWindow) el.ctxOpenNewWindow.style.display = 'none';
      if (el.ctxOpenNewTab) el.ctxOpenNewTab.style.display = 'none';
      if (el.ctxCut) el.ctxCut.style.display = 'none';
      if (el.ctxCopy) el.ctxCopy.style.display = 'none';
      if (el.ctxDuplicate) el.ctxDuplicate.style.display = 'none';
      if (el.ctxPaste) el.ctxPaste.style.display = 'none';
      if (el.ctxNewFolder) el.ctxNewFolder.style.display = 'none';
      if (el.ctxNewFile) el.ctxNewFile.style.display = 'none';
      if (el.ctxPin) el.ctxPin.style.display = 'none';
      if (el.ctxRename) el.ctxRename.style.display = 'none';
      if (el.ctxBatchRename) el.ctxBatchRename.style.display = 'none';
      if (el.ctxNewFolderWithSelection) el.ctxNewFolderWithSelection.style.display = 'none';
      if (el.ctxDelete) el.ctxDelete.style.display = 'none';
      if (el.ctxCompressZip) el.ctxCompressZip.style.display = 'none';
      if (el.ctxCompress7z) el.ctxCompress7z.style.display = 'none';
      if (el.ctxCompressDivider) el.ctxCompressDivider.style.display = 'none';
      if (el.ctxUp) el.ctxUp.style.display = 'none';
      if (el.ctxTerminal) el.ctxTerminal.style.display = 'none';
      if (el.ctxShare) el.ctxShare.style.display = 'none';
      if (el.ctxVlcDivider) el.ctxVlcDivider.style.display = 'none';
      if (el.ctxVlcPlay) el.ctxVlcPlay.style.display = 'none';
      if (el.ctxVlcEnqueue) el.ctxVlcEnqueue.style.display = 'none';
      if (el.ctxArchiveDivider) el.ctxArchiveDivider.style.display = 'none';
      if (el.ctxExtractAll) el.ctxExtractAll.style.display = 'none';
      if (el.ctxExtractHere) el.ctxExtractHere.style.display = 'none';
      if (el.ctxFindDuplicates) el.ctxFindDuplicates.style.display = 'none';
      if (el.ctxManageStorage) el.ctxManageStorage.style.display = 'none';
      if (el.ctxViewOptions) el.ctxViewOptions.style.display = 'none';
      if (el.ctxPreferences) el.ctxPreferences.style.display = 'none';
      if (el.ctxPowerShell) el.ctxPowerShell.style.display = 'none';
      if (el.ctxCmd) el.ctxCmd.style.display = 'none';
    } else {
      if (el.ctxRestore) el.ctxRestore.style.display = 'none';
      if (el.ctxDeletePermanently) el.ctxDeletePermanently.style.display = 'none';
      if (el.ctxRestoreAll) el.ctxRestoreAll.style.display = 'none';
      if (el.ctxEmptyRecycle) el.ctxEmptyRecycle.style.display = 'none';
    }

    // Clean up consecutive, leading, and trailing dividers
    function sanitizeDividers() {
      const children = Array.from(el.contextMenu.children);
      let hasVisiblePrior = false;
      let pendingDivider = null;

      children.forEach(child => {
        if (child.classList.contains('ctx-divider')) {
          child.style.display = 'none';
          if (hasVisiblePrior) {
            pendingDivider = child;
          }
        } else if (child.style.display !== 'none') {
          if (pendingDivider) {
            pendingDivider.style.display = 'block';
            pendingDivider = null;
          }
          hasVisiblePrior = true;
        }
      });
      if (pendingDivider) {
        pendingDivider.style.display = 'none';
      }
    }

    // Make menu visible off-screen to compute exact layout dimensions
    el.contextMenu.style.visibility = 'hidden';
    el.contextMenu.style.display = 'flex';
    el.contextMenu.style.top = '0px';
    el.contextMenu.style.left = '0px';

    sanitizeDividers();

    const menuWidth = el.contextMenu.offsetWidth || 230;
    const menuHeight = el.contextMenu.offsetHeight || 300;
    const pad = 10;
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let posX = x;
    let posY = y;

    // Flip horizontal if overflowing right
    if (posX + menuWidth > winW - pad) {
      posX = x - menuWidth;
    }
    // Clamp to screen boundaries horizontally
    posX = Math.max(pad, posX);
    if (posX + menuWidth > winW - pad) posX = winW - menuWidth - pad;

    // Flip vertical if overflowing bottom
    if (posY + menuHeight > winH - pad) {
      posY = y - menuHeight;
    }
    // Clamp to screen boundaries vertically (NEVER clip off top)
    posY = Math.max(pad, posY);
    if (posY + menuHeight > winH - pad) posY = winH - menuHeight - pad;

    el.contextMenu.style.left = `${Math.round(posX)}px`;
    el.contextMenu.style.top = `${Math.round(posY)}px`;
    el.contextMenu.style.visibility = 'visible';
  }

  function hideContextMenu() {
    if (el.contextMenu) el.contextMenu.style.display = 'none';
    const tabMenu = document.getElementById('tabContextMenu');
    if (tabMenu) tabMenu.style.display = 'none';
  }

  // --- FILE CREATION & MODALS ---
  function promptCreateFile(templateExt) {
    const ext = templateExt === 'custom' ? '' : '.' + templateExt;
    const defaultName = templateExt === 'custom' ? 'untitled.txt' : `untitled${ext}`;

    showInputModal('Create New File', 'Enter the file name:', defaultName, async (fileName) => {
      if (!fileName || !fileName.trim()) return;
      const res = await api.createFile(state.currentPath, fileName.trim());
      if (res.success) {
        await navigateTo(state.currentPath, false);
      } else {
        showErrorModal('Error Creating File', res.error);
      }
    });
  }

  function promptCreateFolder() {
    showInputModal('Create New Folder', 'Enter the folder name:', 'New folder', async (folderName) => {
      if (!folderName || !folderName.trim()) return;
      const res = await api.createFolder(state.currentPath, folderName.trim());
      if (res.success) {
        await navigateTo(state.currentPath, false);
      } else {
        showErrorModal('Error Creating Folder', res.error);
      }
    });
  }

  function promptRenameItem(item) {
    if (!item) return;
    showInputModal('Rename Item', `Rename "${item.name}" to:`, item.name, async (newName) => {
      if (!newName || newName.trim() === item.name) return;
      const res = await api.renameItem(item.path, newName.trim());
      if (res.success) {
        await navigateTo(state.currentPath, false);
      } else {
        showErrorModal('Error Renaming Item', res.error);
      }
    });
  }

  function confirmDeleteItem(item, permanent = false) {
    const selectedItems = (state.selectedIndices && state.selectedIndices.size > 1)
      ? Array.from(state.selectedIndices).map(idx => state.items[idx]).filter(Boolean)
      : (item ? [item] : (state.activeItem ? [state.activeItem] : []));
    if (selectedItems.length === 0) return;
    const isMulti = selectedItems.length > 1;

    // Direct deletion if user disabled confirmation for standard trash deletions
    if (!permanent && state.confirmDelete === false) {
      (async () => {
        let failCount = 0;
        for (const it of selectedItems) {
          const res = await api.deleteItem(it.path);
          if (!res.success) failCount++;
        }
        if (failCount > 0) {
          showErrorModal('Error Deleting Items', `Failed to delete ${failCount} item(s).`);
        } else {
          showToast(isMulti ? `Deleted ${selectedItems.length} items` : `Deleted "${selectedItems[0].name}"`, 'info');
        }
        await navigateTo(state.currentPath, false);
        updateRecycleBinBadge();
      })();
      return;
    }

    const title = permanent
      ? (isMulti ? `Permanently Delete ${selectedItems.length} Items` : 'Permanently Delete Item')
      : (isMulti ? `Delete ${selectedItems.length} Items` : 'Delete to Trash');
    const message = permanent
      ? (isMulti ? `Are you sure you want to permanently delete these ${selectedItems.length} items? This action cannot be undone.` : `Are you sure you want to permanently delete "${selectedItems[0].name}"? This action cannot be undone.`)
      : (isMulti ? `Are you sure you want to move these ${selectedItems.length} items to the Recycle Bin?` : `Are you sure you want to move "${selectedItems[0].name}" to the Recycle Bin?`);
    showConfirmModal(title, message, async () => {
      let failCount = 0;
      for (const it of selectedItems) {
        const res = await api.deleteItem(it.path);
        if (!res.success) failCount++;
      }
      if (failCount > 0) {
        showErrorModal('Error Deleting Items', `Failed to delete ${failCount} item(s).`);
      }
      await navigateTo(state.currentPath, false);
      updateRecycleBinBadge();
    });
  }

  async function duplicateSelectedItems() {
    const itemsToDuplicate = (state.selectedIndices && state.selectedIndices.size > 0)
      ? Array.from(state.selectedIndices).map(idx => state.items[idx]).filter(Boolean)
      : (state.activeItem ? [state.activeItem] : (state.contextTarget ? [state.contextTarget] : []));
    if (itemsToDuplicate.length === 0) return;
    const paths = itemsToDuplicate.map(it => it.path);
    await api.copyItems(paths, state.currentPath);
    await navigateTo(state.currentPath, false);
    showToast(`Duplicated ${paths.length} item${paths.length > 1 ? 's' : ''}`, 'success');
  }

  // Generic Dialogs
  let modalConfirmCallback = null;

  function showInputModal(title, desc, initialValue, onConfirm) {
    el.modalTitle.textContent = title;
    el.modalDesc.textContent = desc;
    el.modalInput.value = initialValue || '';
    el.modalInputWrapper.style.display = 'block';
    if (el.modalBtnConfirm) {
      el.modalBtnConfirm.textContent = 'Confirm';
      el.modalBtnConfirm.className = 'modal-btn btn-primary';
    }
    if (el.modalBtnCancel) {
      el.modalBtnCancel.style.display = 'inline-flex';
      el.modalBtnCancel.textContent = 'Cancel';
    }
    el.modalOverlay.style.display = 'flex';
    modalConfirmCallback = () => onConfirm(el.modalInput.value);
    el.modalInput.focus();
    const val = el.modalInput.value;
    const lastDot = val.lastIndexOf('.');
    if (lastDot > 0 && !val.endsWith('/')) {
      el.modalInput.setSelectionRange(0, lastDot);
    } else {
      el.modalInput.select();
    }
  }

  function showConfirmModal(title, desc, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false) {
    el.modalTitle.textContent = title;
    el.modalDesc.textContent = desc;
    el.modalInputWrapper.style.display = 'none';
    if (el.modalBtnConfirm) {
      el.modalBtnConfirm.textContent = confirmText;
      el.modalBtnConfirm.className = `modal-btn ${isDanger ? 'btn-danger' : 'btn-primary'}`;
    }
    if (el.modalBtnCancel) {
      el.modalBtnCancel.textContent = cancelText;
      el.modalBtnCancel.style.display = 'inline-flex';
    }
    el.modalOverlay.style.display = 'flex';
    modalConfirmCallback = onConfirm;
  }

  function showErrorModal(title, message) {
    el.modalTitle.textContent = title;
    el.modalDesc.textContent = message;
    el.modalInputWrapper.style.display = 'none';
    if (el.modalBtnCancel) el.modalBtnCancel.style.display = 'none';
    if (el.modalBtnConfirm) {
      el.modalBtnConfirm.textContent = 'OK';
      el.modalBtnConfirm.className = 'modal-btn btn-primary';
    }
    el.modalOverlay.style.display = 'flex';
    modalConfirmCallback = () => {};
  }

  function closeModal() {
    el.modalOverlay.style.display = 'none';
    if (el.modalBtnCancel) {
      el.modalBtnCancel.style.display = 'inline-flex';
      el.modalBtnCancel.textContent = 'Cancel';
    }
    if (el.modalBtnConfirm) {
      el.modalBtnConfirm.textContent = 'Confirm';
      el.modalBtnConfirm.className = 'modal-btn btn-primary';
    }
    modalConfirmCallback = null;
  }

  // --- PREFERENCES & SETTINGS MODAL ---
  function applySidebarPreferences() {
    if (el.sidebarTopNav) {
      el.sidebarTopNav.classList.toggle('hidden-by-pref', state.sidebarShowRecents === false);
    }
    if (el.sidebarSectionFavorites) {
      el.sidebarSectionFavorites.classList.toggle('hidden-by-pref', state.sidebarShowFavorites === false);
    }
    if (el.sidebarSectionDrives) {
      el.sidebarSectionDrives.classList.toggle('hidden-by-pref', state.sidebarShowDrives === false);
    }
    if (el.sidebarSectionTags) {
      el.sidebarSectionTags.classList.toggle('hidden-by-pref', state.sidebarShowTags === false);
    }
    document.querySelectorAll('#sidebarTagsList .tag-item').forEach(tagItem => {
      const tag = tagItem.dataset.tag;
      if (tag) {
        const isVisible = Array.isArray(state.visibleTags) ? state.visibleTags.includes(tag) : true;
        tagItem.classList.toggle('hidden-by-pref', !isVisible);
      }
    });

    // Restore section accordion collapsed states
    ['favorites', 'drives', 'tags'].forEach(sec => {
      try {
        if (localStorage.getItem(`myfiles_section_${sec}_collapsed`) === 'true') {
          const secHeader = document.querySelector(`.sidebar-section-header[data-toggle-section="${sec}"]`);
          if (secHeader) {
            const parentSec = secHeader.closest('.sidebar-section');
            if (parentSec) parentSec.classList.add('collapsed');
          }
        }
      } catch (err) {}
    });
  }

  function updateDefaultFileManagerButtons(isDefault) {
    state.isDefaultFileManager = !!isDefault;
    if (el.settingsBtnDefault && el.settingsBtnRestoreDefault) {
      if (state.isDefaultFileManager) {
        el.settingsBtnDefault.style.display = 'none';
        el.settingsBtnRestoreDefault.style.display = 'inline-block';
      } else {
        el.settingsBtnDefault.style.display = 'inline-block';
        el.settingsBtnRestoreDefault.style.display = 'none';
      }
    }
  }

  async function refreshDefaultFileManagerStatus() {
    if (!el.settingsBtnDefault || !el.settingsBtnRestoreDefault) return;
    try {
      if (api.isDefaultFileManager) {
        const res = await api.isDefaultFileManager();
        if (res && typeof res.isDefault === 'boolean') {
          updateDefaultFileManagerButtons(res.isDefault);
        }
      }
    } catch {
      // Non-fatal, retain current UI state
    }
  }

  function openSettingsModal() {
    if (!el.settingsModal) return;
    el.settingsModal.style.display = 'flex';
    updateDefaultFileManagerButtons(state.isDefaultFileManager);
    refreshDefaultFileManagerStatus();

    try {
      updateSettingsThemeCtrl();
      updateSettingsAccentCtrl();

      // General controls
      if (el.settingsStartupFolder) {
        el.settingsStartupFolder.value = state.startupFolder || 'firstDrive';
        if (el.settingsStartupCustomWrap) {
          el.settingsStartupCustomWrap.style.display = (state.startupFolder === 'custom') ? 'block' : 'none';
        }
      }
      if (el.settingsStartupCustom) {
        el.settingsStartupCustom.value = state.startupFolderPath || '';
      }
      if (el.settingsOpenAction) {
        el.settingsOpenAction.value = state.openAction || 'double';
      }
      if (el.settingsSearchScope) {
        el.settingsSearchScope.value = state.searchScope || 'current';
      }
      if (el.settingsCheckboxes) {
        el.settingsCheckboxes.checked = !!state.itemCheckboxes;
      }
      if (el.settingsConfirmDelete) {
        el.settingsConfirmDelete.checked = state.confirmDelete !== false;
      }
      if (el.settingsCheckAutoRefresh) {
        el.settingsCheckAutoRefresh.checked = state.autoRefreshOnFocus !== false;
      }
      if (el.settingsDateFormat) {
        el.settingsDateFormat.value = state.dateFormat || 'relative';
      }

      // Appearance controls
      if (el.settingsDensity) {
        el.settingsDensity.value = state.compactMode ? 'compact' : 'standard';
      }
      if (el.settingsDefaultView) {
        el.settingsDefaultView.value = state.viewMode || 'grid';
      }
      if (el.settingsThumbSize) {
        el.settingsThumbSize.value = state.thumbSize || 'medium';
      }
      if (el.settingsCheckExtensions) {
        el.settingsCheckExtensions.checked = state.showFileExtensions !== false;
      }
      if (el.settingsCheckHidden) {
        el.settingsCheckHidden.checked = !!state.showHidden;
      }
      if (el.settingsCheckColDate) {
        el.settingsCheckColDate.checked = state.colShowDate !== false;
      }
      if (el.settingsCheckColType) {
        el.settingsCheckColType.checked = state.colShowType !== false;
      }
      if (el.settingsCheckColSize) {
        el.settingsCheckColSize.checked = state.colShowSize !== false;
      }
      if (el.settingsCheckColTag) {
        el.settingsCheckColTag.checked = state.colShowTag !== false;
      }

      // Sidebar controls
      if (el.settingsCheckSidebarRecents) {
        el.settingsCheckSidebarRecents.checked = state.sidebarShowRecents !== false;
      }
      if (el.settingsCheckSidebarFavorites) {
        el.settingsCheckSidebarFavorites.checked = state.sidebarShowFavorites !== false;
      }
      if (el.settingsCheckSidebarDrives) {
        el.settingsCheckSidebarDrives.checked = state.sidebarShowDrives !== false;
      }
      if (el.settingsCheckSidebarTags) {
        el.settingsCheckSidebarTags.checked = state.sidebarShowTags !== false;
      }
      if (el.settingsTagVisibilityGrid) {
        el.settingsTagVisibilityGrid.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          const tag = cb.dataset.tag;
          if (tag) cb.checked = Array.isArray(state.visibleTags) ? state.visibleTags.includes(tag) : true;
        });
      }

      // Media controls
      if (el.settingsCheckQuickLook) {
        el.settingsCheckQuickLook.checked = state.enableQuickLook !== false;
      }
      if (el.settingsCheckAutoplay) {
        el.settingsCheckAutoplay.checked = state.qlAutoplay !== false;
      }
      if (el.settingsCheckLoop) {
        el.settingsCheckLoop.checked = !!state.qlLoop;
      }
      if (el.settingsCheckVlc) {
        el.settingsCheckVlc.checked = state.useVlcMedia !== false;
      }
      if (el.settingsVlcStatusBadge) {
        if (state.vlcInstalled) {
          el.settingsVlcStatusBadge.className = 'settings-status-badge detected';
          el.settingsVlcStatusBadge.textContent = 'VLC Detected';
          if (el.settingsVlcStatusDesc) {
            el.settingsVlcStatusDesc.textContent = `VLC engine found at: ${state.vlcPath || 'Default installation path'}`;
          }
        } else {
          el.settingsVlcStatusBadge.className = 'settings-status-badge missing';
          el.settingsVlcStatusBadge.textContent = 'Not Detected';
          if (el.settingsVlcStatusDesc) {
            el.settingsVlcStatusDesc.textContent = 'Install VLC Media Player to enable hardware-accelerated playback for MKV, AVI, and FLAC.';
          }
        }
      }

      // System controls
      if (el.settingsTerminalShell) {
        el.settingsTerminalShell.value = state.terminalChoice || 'wt';
      }
      if (el.settingsChecksumAlgo) {
        el.settingsChecksumAlgo.value = state.checksumAlgorithm || 'sha256';
      }
      if (el.settingsDefaultArchiveFormat) {
        el.settingsDefaultArchiveFormat.value = state.defaultArchiveFormat || 'zip';
      }
      if (el.settingsDefaultArchiveLevel) {
        el.settingsDefaultArchiveLevel.value = state.defaultArchiveLevel || 'normal';
      }
      if (el.settingsCheckAutoOpenExtracted) {
        el.settingsCheckAutoOpenExtracted.checked = state.autoOpenExtracted !== false;
      }
      if (el.settingsDedupScanMode) {
        el.settingsDedupScanMode.value = state.dedupScanMode || 'sha256';
      }
      if (el.settingsDedupMinSize) {
        el.settingsDedupMinSize.value = String(state.dedupMinSize || 0);
      }

      // Ensure active tab and corresponding panel match
      if (el.settingsTabBar) {
        const activeTabBtn = el.settingsTabBar.querySelector('.settings-tab-btn.active') || el.settingsTabBar.querySelector('.settings-tab-btn');
        const targetTab = activeTabBtn ? activeTabBtn.dataset.tab : 'general';
        const panels = {
          general: el.settingsPanelGeneral,
          appearance: el.settingsPanelAppearance,
          sidebar: el.settingsPanelSidebar,
          shortcuts: el.settingsPanelShortcuts,
          media: el.settingsPanelMedia,
          system: el.settingsPanelSystem
        };
        Object.entries(panels).forEach(([name, panelEl]) => {
          if (panelEl) panelEl.classList.toggle('active', name === targetTab);
        });
      }
    } catch (err) {
      console.warn('Non-fatal error prefilling settings dialog:', err);
    }
  }

  function closeSettingsModal() {
    if (el.settingsModal) el.settingsModal.style.display = 'none';
  }

  function updateSettingsThemeCtrl() {
    if (el.settingsThemeCtrl) {
      el.settingsThemeCtrl.querySelectorAll('.theme-opt-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === state.theme);
      });
    }
  }

  // --- macOS Finder "Show View Options" (media_1790263700052.png) ---
  function toggleViewOptionsPanel() {
    if (state.viewOptionsOpen) {
      closeViewOptionsPanel();
    } else {
      openViewOptionsPanel();
    }
  }

  function openViewOptionsPanel() {
    if (!el.viewOptionsPanel) return;
    state.viewOptionsOpen = true;
    el.viewOptionsPanel.style.display = 'flex';

    // Current folder name in title
    const folderName = state.currentPath.endsWith('\\')
      ? state.currentPath
      : state.currentPath.split('\\').pop() || state.currentPath;
    if (el.voFolderTitle) {
      el.voFolderTitle.textContent = folderName || 'Documents';
    }

    // Dynamic labels matching current view mode (Reference Image)
    const viewNameMap = {
      gallery: 'gallery view',
      columns: 'column view',
      list: 'list view',
      grid: 'icon view'
    };
    const currentViewName = viewNameMap[state.viewMode] || 'gallery view';
    if (el.voLblAlwaysOpen) {
      el.voLblAlwaysOpen.textContent = `Always open in ${currentViewName}`;
    }
    if (el.voLblBrowse) {
      el.voLblBrowse.textContent = `Browse in ${currentViewName}`;
    }

    // Populate controls from state
    if (el.voSortSelect) {
      el.voSortSelect.value = state.sortField || 'name';
    }
    if (el.voGroupSelect) {
      el.voGroupSelect.value = state.groupBy || 'none';
    }
    if (el.voChkPreviewCol) {
      el.voChkPreviewCol.checked = !!state.previewPaneOpen;
    }
    if (el.voChkIconPreview) {
      el.voChkIconPreview.checked = state.iconPreview !== false;
    }
    if (el.voChkFilename) {
      el.voChkFilename.checked = state.showThumbFilename !== false;
    }

    const thumbRadio = el.viewOptionsPanel.querySelector(`input[name="voThumbSize"][value="${state.thumbSize || 'medium'}"]`);
    if (thumbRadio) thumbRadio.checked = true;

    // Check if this folder has preferred view
    const pref = state.folderViewPreferences && state.folderViewPreferences[state.currentPath];
    if (el.voChkAlwaysOpen) {
      el.voChkAlwaysOpen.checked = !!pref;
    }
  }

  function closeViewOptionsPanel() {
    if (!el.viewOptionsPanel) return;
    state.viewOptionsOpen = false;
    el.viewOptionsPanel.style.display = 'none';
  }

  const ICON_GEARS = [
    {
      gear: 1,
      name: 'Compact',
      shortLabel: 'G1',
      cardSize: 76,
      iconSize: 38,
      thumbSize: 42,
      gap: 10,
      namedSize: 'small'
    },
    {
      gear: 2,
      name: 'Standard',
      shortLabel: 'G2',
      cardSize: 108,
      iconSize: 52,
      thumbSize: 52,
      gap: 14,
      namedSize: 'medium'
    },
    {
      gear: 3,
      name: 'Large',
      shortLabel: 'G3',
      cardSize: 144,
      iconSize: 68,
      thumbSize: 72,
      gap: 16,
      namedSize: 'large'
    },
    {
      gear: 4,
      name: 'Jumbo',
      shortLabel: 'G4',
      cardSize: 184,
      iconSize: 88,
      thumbSize: 96,
      gap: 20,
      namedSize: 'xlarge'
    }
  ];

  function getGearByLevel(level) {
    if (typeof level === 'number') {
      const idx = Math.max(1, Math.min(4, Math.round(level)));
      return ICON_GEARS[idx - 1];
    }
    const str = String(level).trim().toLowerCase();
    const map = {
      '1': 1, 'g1': 1, 'compact': 1, 'small': 1,
      '2': 2, 'g2': 2, 'standard': 2, 'medium': 2,
      '3': 3, 'g3': 3, 'large': 3,
      '4': 4, 'g4': 4, 'jumbo': 4, 'xlarge': 4, 'extra-large': 4
    };
    const num = map[str] || parseInt(str, 10) || 2;
    const idx = Math.max(1, Math.min(4, num));
    return ICON_GEARS[idx - 1];
  }

  function applyGear(gearLevel, skipSave = false) {
    const gear = getGearByLevel(gearLevel);
    state.currentGear = gear.gear;
    state.thumbSize = gear.namedSize;

    // Apply CSS Variables to Document Root (smooth transitions handled by CSS)
    document.documentElement.style.setProperty('--grid-card-size', `${gear.cardSize}px`);
    document.documentElement.style.setProperty('--grid-icon-size', `${gear.iconSize}px`);
    document.documentElement.style.setProperty('--grid-thumb-size', `${gear.thumbSize}px`);
    document.documentElement.style.setProperty('--grid-card-gap', `${gear.gap}px`);
    document.documentElement.style.setProperty('--grid-size', `${gear.cardSize}px`); // backward compatibility

    // Progress bar fill (0% to 100% across the 4 steps: 0%, 33.33%, 66.66%, 100%)
    const pct = ((gear.gear - 1) / 3) * 100;
    document.documentElement.style.setProperty('--gear-progress', `${pct}%`);

    // Sync input range slider
    if (el.gridZoomSlider) {
      el.gridZoomSlider.value = String(gear.gear);
      el.gridZoomSlider.dataset.cardSize = String(gear.cardSize);
      el.gridZoomSlider.setAttribute('aria-valuenow', String(gear.gear));
      el.gridZoomSlider.setAttribute('aria-valuetext', `${gear.shortLabel}: ${gear.name} (${gear.cardSize}px)`);
    }

    // Sync pill badge text & title
    if (el.gearPillBadge) {
      el.gearPillBadge.textContent = gear.shortLabel;
      el.gearPillBadge.title = `Transmission Gear ${gear.gear}: ${gear.name} (${gear.cardSize}px)`;
    }

    // Sync track container tooltip
    if (el.gearTrackContainer) {
      el.gearTrackContainer.title = `Icon Size: Gear ${gear.gear} (${gear.name} - ${gear.cardSize}px)`;
    }

    // Sync active state on ticks
    const ticks = document.querySelectorAll('.gear-tick');
    ticks.forEach(tick => {
      const g = parseInt(tick.dataset.gear, 10);
      tick.classList.toggle('active', g <= gear.gear);
    });

    // Sync with Show View Options Radio if visible
    if (el.viewOptionsPanel) {
      const radio = el.viewOptionsPanel.querySelector(`input[name="voThumbSize"][value="${gear.namedSize}"]`);
      if (radio) radio.checked = true;
    }

    // Sync with Settings Modal select if visible
    if (el.settingsThumbSize) {
      el.settingsThumbSize.value = (gear.namedSize === 'xlarge') ? 'large' : gear.namedSize;
    }

    if (!skipSave) {
      try {
        localStorage.setItem('myfiles_grid_gear', String(gear.gear));
        localStorage.setItem('myfiles_thumbsize', gear.namedSize);
      } catch (e) {}
    }

    if (state.viewMode === 'gallery') {
      renderGalleryView();
    }
  }

  function applyThumbSize(size) {
    applyGear(size);
  }

  function setThumbSize(size) {
    applyGear(size);
  }

  function saveViewDefaults() {
    state.viewDefaults = {
      viewMode: state.viewMode,
      sortBy: el.voSortSelect ? el.voSortSelect.value : state.sortField,
      thumbSize: state.thumbSize || 'medium',
      previewCol: el.voChkPreviewCol ? el.voChkPreviewCol.checked : state.previewPaneOpen,
      iconPreview: el.voChkIconPreview ? el.voChkIconPreview.checked : true,
      showFilename: el.voChkFilename ? el.voChkFilename.checked : true
    };
    try {
      localStorage.setItem('myfiles_view_defaults', JSON.stringify(state.viewDefaults));
    } catch(e){}
    showToast('View settings applied as default for all folders');
  }

  // --- STATUS BAR UPDATE ---
  function updateStatusBar() {
    const totalCount = state.items ? state.items.length : 0;
    el.statusItemCount.textContent = `${totalCount} item${totalCount === 1 ? '' : 's'}`;

    if (state.selectedIndices.size > 0) {
      let totalSize = 0;
      state.selectedIndices.forEach(idx => {
        if (state.items[idx]) totalSize += (state.items[idx].size || 0);
      });
      el.statusSelection.textContent = `${state.selectedIndices.size} selected (${formatBytes(totalSize)})`;
    } else if (state.activeItem) {
      el.statusSelection.textContent = `${state.activeItem.name} (${formatBytes(state.activeItem.size)})`;
    } else {
      el.statusSelection.textContent = 'None selected';
    }

    // Drive free space
    const driveLetter = state.currentPath.charAt(0).toUpperCase();
    const drive = state.drives.find(d => d.letter === driveLetter);
    if (drive && drive.freeBytes) {
      el.statusDriveFree.textContent = `${drive.letter}:\\ · ${formatBytes(drive.freeBytes)} free of ${formatBytes(drive.totalBytes)}`;
    } else {
      el.statusDriveFree.textContent = '';
    }

    updateToolbarActionStates();
  }

  function updateToolbarActionStates() {
    let selectedCount = (state.selectedIndices && state.selectedIndices.size > 0)
      ? state.selectedIndices.size
      : (state.activeItem ? 1 : 0);
    if (state.viewMode === 'columns' && !selectedCount) {
      const col = state.millerColumns[state.activeColumnIndex] || state.millerColumns[state.millerColumns.length - 1];
      if (col && col.selectedItem) selectedCount = 1;
    }
    const hasSelection = selectedCount > 0;
    const hasClipboard = Boolean(state.clipboard && state.clipboard.paths && state.clipboard.paths.length > 0);

    const targetButtons = [el.btnCut, el.btnCopy, el.btnRename, el.btnDelete, el.btnQuickLook, el.btnToolbarTag];
    targetButtons.forEach(btn => {
      if (!btn) return;
      btn.classList.toggle('btn-dimmed', !hasSelection);
      btn.setAttribute('aria-disabled', !hasSelection ? 'true' : 'false');
    });

    if (el.btnCut) {
      el.btnCut.title = hasSelection ? `Cut ${selectedCount > 1 ? selectedCount + ' items' : 'item'} (Ctrl+X)` : 'Cut (Select an item first)';
    }
    if (el.btnCopy) {
      el.btnCopy.title = hasSelection ? `Copy ${selectedCount > 1 ? selectedCount + ' items' : 'item'} (Ctrl+C)` : 'Copy (Select an item first)';
    }
    if (el.btnPaste) {
      el.btnPaste.classList.toggle('btn-dimmed', !hasClipboard);
      el.btnPaste.title = hasClipboard
        ? `Paste ${state.clipboard.paths.length} item(s) (Ctrl+V)`
        : 'Paste (Clipboard is empty)';
    }
    if (el.btnRename) {
      el.btnRename.title = selectedCount > 1
        ? `Batch Rename ${selectedCount} items (F2)`
        : (hasSelection ? 'Rename (F2)' : 'Rename (Select an item first)');
    }
    if (el.btnDelete) {
      el.btnDelete.title = selectedCount > 1
        ? `Delete ${selectedCount} items (Del)`
        : (hasSelection ? 'Delete (Del)' : 'Delete (Select an item first)');
    }
    if (el.btnQuickLook) {
      el.btnQuickLook.title = hasSelection ? 'Quick Look Preview (Space)' : 'Preview (Select an item first)';
    }
    if (el.btnToolbarTag) {
      el.btnToolbarTag.title = hasSelection ? 'Tag item' : 'Tag (Select an item first)';
    }
    if (el.btnShareItem) {
      el.btnShareItem.title = hasSelection ? 'Share selected item (Ctrl+Alt+S)' : 'Share current folder (Ctrl+Alt+S)';
    }

    if (el.btnToggleHidden) {
      el.btnToggleHidden.classList.toggle('active', !!state.showHidden);
    }
    if (el.btnToggleCheckboxes) {
      el.btnToggleCheckboxes.classList.toggle('active', !!state.itemCheckboxes);
    }
    if (el.btnToggleDualPane) {
      el.btnToggleDualPane.classList.toggle('active', !!state.dualPaneActive);
    }
    if (el.btnTogglePreviewPane) {
      el.btnTogglePreviewPane.classList.toggle('active', !!state.previewPaneOpen);
    }

    const isRecycle = (state.currentPath === 'Recycle Bin' || state.currentPath === 'recycle-bin');
    if (isRecycle) {
      if (el.btnCut) { el.btnCut.classList.add('btn-dimmed'); el.btnCut.setAttribute('aria-disabled', 'true'); }
      if (el.btnCopy) { el.btnCopy.classList.add('btn-dimmed'); el.btnCopy.setAttribute('aria-disabled', 'true'); }
      if (el.btnPaste) { el.btnPaste.classList.add('btn-dimmed'); el.btnPaste.setAttribute('aria-disabled', 'true'); }
      if (el.btnRename) { el.btnRename.classList.add('btn-dimmed'); el.btnRename.setAttribute('aria-disabled', 'true'); }
      if (el.btnNewFolder) { el.btnNewFolder.classList.add('btn-dimmed'); el.btnNewFolder.setAttribute('aria-disabled', 'true'); }
      if (el.btnDelete) {
        el.btnDelete.classList.toggle('btn-dimmed', !hasSelection);
        el.btnDelete.title = hasSelection ? 'Permanently Delete Selected Item(s)' : 'Delete Permanently (Select an item first)';
      }
    }
  }

  // --- MOUSE CURSOR: RUBBERBAND / MARQUEE DRAG-SELECTION BOX ---
  function initMarqueeSelection(viewport) {
    if (!viewport) return;

    let isSelecting = false;
    let startX = 0;
    let startY = 0;
    let marqueeBox = null;
    let baseSelection = new Set();
    let movedFarEnough = false;

    viewport.addEventListener('mousedown', (e) => {
      // Only primary left button
      if (e.button !== 0) return;

      // Don't start marquee if clicking inside an interactive button, input, tab, etc.
      if (e.target.closest('button, input, select, textarea, .ctx-item, .modal-overlay, .tab-close, .list-col, .col-resizer')) {
        return;
      }

      // If clicking directly on a file item (without shift or ctrl), the item click handler manages selection
      const clickedItem = e.target.closest('.grid-item, .list-row');
      if (clickedItem && !e.ctrlKey && !e.shiftKey) {
        return;
      }

      startX = e.clientX;
      startY = e.clientY;
      isSelecting = true;
      movedFarEnough = false;

      // If Ctrl/Shift is held, keep existing selection as base
      if (e.ctrlKey || e.shiftKey) {
        baseSelection = new Set(state.selectedIndices);
      } else {
        baseSelection = new Set();
        if (!clickedItem) {
          // Clicking empty background clears current selection
          state.selectedIndices.clear();
          state.activeItem = null;
          viewport.querySelectorAll('.grid-item.selected, .list-row.selected').forEach(el => el.classList.remove('selected'));
          updateStatusBar();
        }
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!isSelecting) return;

      const currentX = e.clientX;
      const currentY = e.clientY;
      const dx = Math.abs(currentX - startX);
      const dy = Math.abs(currentY - startY);

      if (!movedFarEnough) {
        if (dx > 5 || dy > 5) {
          movedFarEnough = true;
          document.body.style.userSelect = 'none';
          marqueeBox = document.createElement('div');
          marqueeBox.className = 'marquee-selection-box';
          document.body.appendChild(marqueeBox);
        } else {
          return;
        }
      }

      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = dx;
      const height = dy;

      marqueeBox.style.left = `${left}px`;
      marqueeBox.style.top = `${top}px`;
      marqueeBox.style.width = `${width}px`;
      marqueeBox.style.height = `${height}px`;

      // Intersect with selectable items in viewport
      const items = viewport.querySelectorAll('.grid-item, .list-row');
      items.forEach((itemEl) => {
        const idx = parseInt(itemEl.dataset.index, 10);
        if (isNaN(idx)) return;

        const rect = itemEl.getBoundingClientRect();
        // AABB Collision check
        const intersects = !(
          rect.right < left ||
          rect.left > left + width ||
          rect.bottom < top ||
          rect.top > top + height
        );

        if (intersects) {
          state.selectedIndices.add(idx);
          itemEl.classList.add('selected');
        } else {
          if (!baseSelection.has(idx)) {
            state.selectedIndices.delete(idx);
            itemEl.classList.remove('selected');
          }
        }
      });

      const lastIdx = Array.from(state.selectedIndices).pop();
      state.activeItem = lastIdx !== undefined ? state.items[lastIdx] : null;
      updateStatusBar();
    });

    window.addEventListener('mouseup', () => {
      if (!isSelecting) return;
      isSelecting = false;
      document.body.style.userSelect = '';

      if (marqueeBox) {
        marqueeBox.remove();
        marqueeBox = null;
      }

      if (movedFarEnough) {
        renderPreviewPane();
      }
    });
  }

  // --- WINDOWS EXPLORER ADVANCED ENGINES ---
  function pathBasename(p) {
    if (!p) return '';
    const norm = p.replace(/\\/g, '/');
    const idx = norm.lastIndexOf('/');
    return idx !== -1 ? norm.substring(idx + 1) : norm;
  }

  // 1. Undo / Redo System
  function pushUndoAction(action) {
    state.undoStack.push(action);
    if (state.undoStack.length > 50) state.undoStack.shift();
    state.redoStack = [];
    updateUndoRedoUI();
  }

  function updateUndoRedoUI() {
    if (el.btnUndo) {
      el.btnUndo.disabled = state.undoStack.length === 0;
      el.btnUndo.title = state.undoStack.length > 0
        ? `Undo: ${state.undoStack[state.undoStack.length - 1].type} (Ctrl+Z)`
        : 'Undo (Ctrl+Z)';
    }
    if (el.btnRedo) {
      el.btnRedo.disabled = state.redoStack.length === 0;
      el.btnRedo.title = state.redoStack.length > 0
        ? `Redo: ${state.redoStack[state.redoStack.length - 1].type} (Ctrl+Y)`
        : 'Redo (Ctrl+Y)';
    }
  }

  async function performUndo() {
    if (state.undoStack.length === 0) return;
    const action = state.undoStack.pop();
    try {
      if (action.type === 'rename') {
        const base = pathBasename(action.oldPath);
        await api.renameItem(action.newPath, base);
        state.redoStack.push(action);
        showToast(`Undid rename: restored "${base}"`, 'info');
      } else if (action.type === 'create') {
        await api.deleteItem(action.path);
        state.redoStack.push(action);
        showToast(`Undid create: removed "${pathBasename(action.path)}"`, 'info');
      } else if (action.type === 'batch-rename') {
        for (const item of (action.renames || [])) {
          const originalName = pathBasename(item.oldPath);
          await api.renameItem(item.newPath, originalName);
        }
        state.redoStack.push(action);
        showToast(`Undid batch rename for ${action.renames.length} items`, 'info');
      } else if (action.type === 'folder-with-selection') {
        await api.moveItems(action.itemPaths, action.parentDir);
        await api.deleteItem(action.folderPath);
        state.redoStack.push(action);
        showToast('Undid New Folder with Selection', 'info');
      }
      updateUndoRedoUI();
      await navigateTo(state.currentPath, false);
    } catch (err) {
      showToast(`Undo failed: ${err.message}`, 'error');
    }
  }

  async function performRedo() {
    if (state.redoStack.length === 0) return;
    const action = state.redoStack.pop();
    try {
      if (action.type === 'rename') {
        const base = pathBasename(action.newPath);
        await api.renameItem(action.oldPath, base);
        state.undoStack.push(action);
        showToast(`Redid rename: "${base}"`, 'info');
      } else if (action.type === 'batch-rename') {
        await api.batchRename(action.renames);
        state.undoStack.push(action);
        showToast(`Redid batch rename for ${action.renames.length} items`, 'info');
      } else if (action.type === 'folder-with-selection') {
        const folderName = pathBasename(action.folderPath);
        await api.createFolder(action.parentDir, folderName);
        const originalPaths = action.itemPaths.map(ip => {
          const fn = pathBasename(ip);
          return (action.parentDir.endsWith('\\') || action.parentDir.endsWith('/')) ? action.parentDir + fn : action.parentDir + '\\' + fn;
        });
        await api.moveItems(originalPaths, action.folderPath);
        state.undoStack.push(action);
        showToast('Redid New Folder with Selection', 'info');
      }
      updateUndoRedoUI();
      await navigateTo(state.currentPath, false);
    } catch (err) {
      showToast(`Redo failed: ${err.message}`, 'error');
    }
  }

  // 2. Selection Inversion & Bulk Selection
  function invertSelection() {
    if (!state.items || state.items.length === 0) return;
    const newSelected = new Set();
    state.items.forEach((_it, i) => {
      if (!state.selectedIndices.has(i)) newSelected.add(i);
    });
    state.selectedIndices = newSelected;
    const last = Array.from(newSelected).pop();
    state.activeItem = last !== undefined ? state.items[last] : null;
    updateStatusBar();
    reapplySelectionClasses();
    renderPreviewPane();
    showToast(`Inverted selection: ${state.selectedIndices.size} selected`, 'info');
  }

  function selectAll() {
    if (!state.items || state.items.length === 0) return;
    state.selectedIndices = new Set(state.items.map((_, i) => i));
    state.activeItem = state.items[0] || null;
    updateStatusBar();
    reapplySelectionClasses();
    renderPreviewPane();
  }

  function deselectAll() {
    state.selectedIndices.clear();
    state.activeItem = null;
    updateStatusBar();
    reapplySelectionClasses();
    renderPreviewPane();
  }

  function reapplySelectionClasses() {
    if (state.viewMode === 'list') {
      const rows = el.primaryViewport.querySelectorAll('.list-row');
      rows.forEach((r, i) => {
        const itemIdx = r.dataset.index !== undefined ? parseInt(r.dataset.index, 10) : i;
        const sel = state.selectedIndices.has(itemIdx);
        r.classList.toggle('selected', sel);
        const chk = r.querySelector('.item-checkbox');
        if (chk) chk.checked = sel;
      });
    } else if (state.viewMode === 'grid') {
      const items = el.primaryViewport.querySelectorAll('.grid-item');
      items.forEach((it, i) => {
        const itemIdx = it.dataset.index !== undefined ? parseInt(it.dataset.index, 10) : i;
        const sel = state.selectedIndices.has(itemIdx);
        it.classList.toggle('selected', sel);
        const chk = it.querySelector('.item-checkbox');
        if (chk) chk.checked = sel;
      });
    }
  }

  function scrollActiveItemIntoView() {
    requestAnimationFrame(() => {
      let activeEl = null;
      if (state.viewMode === 'list') {
        activeEl = el.primaryViewport.querySelector('.list-row.selected');
      } else if (state.viewMode === 'grid') {
        activeEl = el.primaryViewport.querySelector('.grid-item.selected');
      } else if (state.viewMode === 'columns') {
        activeEl = el.primaryViewport.querySelector('.column-pane.active-col .column-item.selected') || el.primaryViewport.querySelector('.column-item.selected');
      } else if (state.viewMode === 'gallery') {
        activeEl = el.primaryViewport.querySelector('.scrubber-item.selected');
      }
      if (activeEl) {
        if (state.viewMode === 'gallery') {
          activeEl.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        } else {
          activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        }
      }
    });
  }

  function selectItemByIndex(idx) {
    if (!state.items || state.items.length === 0) return;
    const targetIdx = Math.max(0, Math.min(idx, state.items.length - 1));
    state.selectedIndices.clear();
    state.selectedIndices.add(targetIdx);
    state.activeItem = state.items[targetIdx];
    updateStatusBar();
    if (state.viewMode === 'list' || state.viewMode === 'grid') {
      reapplySelectionClasses();
      renderPreviewPane();
    } else if (state.viewMode === 'columns') {
      renderMillerColumns();
    } else if (state.viewMode === 'gallery') {
      state.activeItemRotation = 0;
      renderGalleryView();
      renderPreviewPane();
    }
    scrollActiveItemIntoView();
  }

  // 3. Windows Properties Dialog
  let activePropertyItem = null;

  async function openPropertiesModal(targetItem = null) {
    let item = targetItem || state.activeItem;
    if (!item && state.currentPath) {
      const folderName = state.currentPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || state.currentPath;
      item = {
        name: folderName,
        path: state.currentPath,
        isDirectory: true,
        size: 0,
        modified: new Date().toISOString()
      };
    }
    if (!item) {
      showToast('Select an item to view properties', 'info');
      return;
    }
    activePropertyItem = item;

    // Reset Tabs
    el.propTabGeneral.style.borderBottomColor = 'var(--accent)';
    el.propTabGeneral.style.color = 'var(--text-main)';
    el.propTabChecksums.style.borderBottomColor = 'transparent';
    el.propTabChecksums.style.color = 'var(--text-muted)';
    el.propContentGeneral.style.display = 'block';
    el.propContentChecksums.style.display = 'none';

    // Header info
    el.propFileIcon.innerHTML = getFileIcon(item);
    el.propFileName.textContent = item.name;
    const kindStr = formatKind(item);
    const ext = (item.extension || '').toLowerCase();
    el.propFileKind.textContent = kindStr;

    // General fields
    const isDrive = item.isDrive || /^[a-zA-Z]:[/\\]?$/.test(item.path);
    const driveObj = isDrive ? (state.drives || []).find(d => d.letter && d.letter.toUpperCase() === item.path.charAt(0).toUpperCase()) : null;

    if (driveObj) {
      el.propTypeVal.textContent = `Local Disk Volume (${driveObj.letter}:)`;
      el.propOpensWithVal.textContent = 'Windows Shell / Explorer';
      el.propSizeVal.textContent = `${formatBytes(driveObj.totalBytes)} (${(driveObj.totalBytes || 0).toLocaleString()} bytes)`;
      el.propSizeOnDiskVal.textContent = `Used: ${formatBytes(driveObj.usedBytes)} | Free: ${formatBytes(driveObj.freeBytes)}`;
    } else {
      el.propTypeVal.textContent = item.isDirectory ? 'File folder' : `${kindStr} (${ext || 'no extension'})`;
      el.propOpensWithVal.textContent = state.vlcInstalled && isMediaFile(item) ? 'VLC media player' : 'Windows default application';
      const sizeStr = item.isDirectory ? 'Calculating...' : `${formatBytes(item.size)} (${(item.size || 0).toLocaleString()} bytes)`;
      el.propSizeVal.textContent = sizeStr;
      el.propSizeOnDiskVal.textContent = item.isDirectory ? '--' : `${formatBytes(Math.ceil((item.size || 0) / 4096) * 4096)}`;
    }
    el.propLocationVal.textContent = item.path;
    el.propCreatedVal.textContent = formatDateFull(item.birthtime || item.mtime);
    el.propModifiedVal.textContent = formatDateFull(item.mtime);
    el.propAccessedVal.textContent = formatDateFull(item.atime || item.mtime);
    el.propCheckReadOnly.checked = !!item.isReadOnly;
    el.propCheckHidden.checked = isSystemOrHidden(item);

    // Reset hashes
    el.propHashSha256.value = '';
    el.propHashMd5.value = '';
    el.propHashVerifyInput.value = '';
    el.propHashVerifyResult.textContent = '';

    el.propertiesModal.style.display = 'flex';

    if (item.isDirectory && !isDrive && api.getFileDetails) {
      const details = await api.getFileDetails(item.path);
      if (details.success && details.fileCount !== undefined) {
        el.propSizeVal.textContent = `${details.fileCount} items inside`;
      }
    }
  }

  function closePropertiesModal() {
    el.propertiesModal.style.display = 'none';
    activePropertyItem = null;
  }

  async function calculatePropertiesHashes() {
    if (!activePropertyItem || activePropertyItem.isDirectory) return;
    el.btnCalcHashes.disabled = true;
    el.btnCalcHashes.textContent = 'Hashing...';
    try {
      const sha256Res = await api.calculateChecksum(activePropertyItem.path, 'sha256');
      if (sha256Res.success) {
        el.propHashSha256.value = sha256Res.hash;
      }
      const md5Res = await api.calculateChecksum(activePropertyItem.path, 'md5');
      if (md5Res.success) {
        el.propHashMd5.value = md5Res.hash;
      }
      showToast('Cryptographic hashes calculated', 'success');
    } catch (err) {
      showToast(`Hash error: ${err.message}`, 'error');
    } finally {
      el.btnCalcHashes.disabled = false;
      el.btnCalcHashes.textContent = 'Calculate Hashes';
    }
  }

  // 4. Batch Rename (PowerRename)
  let batchRenameItemsList = [];

  function openBatchRenameModal() {
    let targets = [];
    if (state.selectedIndices && state.selectedIndices.size > 0) {
      const idxs = Array.from(state.selectedIndices);
      targets = idxs.map(i => state.items[i]).filter(Boolean);
    } else if (state.contextTarget) {
      targets = [state.contextTarget];
    }

    if (targets.length === 0) {
      showToast('Select items to batch rename', 'info');
      return;
    }

    batchRenameItemsList = targets;
    el.batchCountBadge.textContent = targets.length;
    el.batchFindInput.value = '';
    el.batchReplaceInput.value = '';
    el.batchPrefixInput.value = '';
    el.batchSuffixInput.value = '';
    el.batchCheckNumbering.checked = false;
    el.batchStartNumber.style.display = 'none';
    el.batchStartNumber.value = '1';

    updateBatchRenamePreview();
    el.batchRenameModal.style.display = 'flex';
    el.batchFindInput.focus();
  }

  function closeBatchRenameModal() {
    el.batchRenameModal.style.display = 'none';
    batchRenameItemsList = [];
  }

  function updateBatchRenamePreview() {
    const findStr = el.batchFindInput.value;
    const replaceStr = el.batchReplaceInput.value;
    const prefix = el.batchPrefixInput.value;
    const suffix = el.batchSuffixInput.value;
    const useNumbering = el.batchCheckNumbering.checked;
    const startNum = parseInt(el.batchStartNumber.value, 10) || 1;

    let previewHtml = '';
    const sampleItems = batchRenameItemsList.slice(0, 8);
    sampleItems.forEach((item, idx) => {
      const ext = item.isDirectory ? '' : (item.name.lastIndexOf('.') !== -1 ? item.name.substring(item.name.lastIndexOf('.')) : '');
      let base = item.isDirectory ? item.name : (ext ? item.name.substring(0, item.name.length - ext.length) : item.name);

      if (findStr) {
        base = base.split(findStr).join(replaceStr);
      }
      if (prefix) {
        base = prefix + base;
      }
      if (suffix) {
        base = base + suffix;
      }
      if (useNumbering) {
        base = `${base} (${startNum + idx})`;
      }

      const finalName = base + ext;
      previewHtml += `<div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">${escapeHtml(item.name)}</span><span style="color: var(--accent); font-weight: 600;">➔ ${escapeHtml(finalName)}</span></div>`;
    });

    if (batchRenameItemsList.length > 8) {
      previewHtml += `<div style="text-align: center; color: var(--text-dim); margin-top: 4px;">... and ${batchRenameItemsList.length - 8} more items</div>`;
    }

    el.batchPreviewList.innerHTML = previewHtml;
  }

  async function executeBatchRename() {
    const findStr = el.batchFindInput.value;
    const replaceStr = el.batchReplaceInput.value;
    const prefix = el.batchPrefixInput.value;
    const suffix = el.batchSuffixInput.value;
    const useNumbering = el.batchCheckNumbering.checked;
    const startNum = parseInt(el.batchStartNumber.value, 10) || 1;

    const renames = [];
    batchRenameItemsList.forEach((item, idx) => {
      const ext = item.isDirectory ? '' : (item.name.lastIndexOf('.') !== -1 ? item.name.substring(item.name.lastIndexOf('.')) : '');
      let base = item.isDirectory ? item.name : (ext ? item.name.substring(0, item.name.length - ext.length) : item.name);

      if (findStr) {
        base = base.split(findStr).join(replaceStr);
      }
      if (prefix) {
        base = prefix + base;
      }
      if (suffix) {
        base = base + suffix;
      }
      if (useNumbering) {
        base = `${base} (${startNum + idx})`;
      }

      const finalName = base + ext;
      if (finalName !== item.name) {
        const parent = state.currentPath;
        const newPath = (parent.endsWith('\\') || parent.endsWith('/')) ? parent + finalName : parent + '\\' + finalName;
        renames.push({ oldPath: item.path, newPath });
      }
    });

    if (renames.length === 0) {
      showToast('No filename modifications detected', 'info');
      closeBatchRenameModal();
      return;
    }

    el.btnBatchApply.disabled = true;
    el.btnBatchApply.textContent = 'Renaming...';
    try {
      const res = await api.batchRename(renames);
      closeBatchRenameModal();
      if (res.success) {
        showToast(`Successfully renamed ${renames.length} files!`, 'success');
        pushUndoAction({ type: 'batch-rename', renames });
      } else {
        showToast('Batch rename completed with some skipped files', 'info');
      }
      await navigateTo(state.currentPath, false);
    } catch (err) {
      showToast(`Batch rename error: ${err.message}`, 'error');
    } finally {
      el.btnBatchApply.disabled = false;
      el.btnBatchApply.textContent = 'Rename All';
    }
  }

  // --- macOS FINDER FEATURES ---

  // 1. macOS "Get Info" Inspector (Cmd+I / Ctrl+I)
  let activeInfoItem = null;

  function renderGiPermissions(isReadOnly) {
    if (!el.giPermsTableBody) return;
    const user = (state.homePath || '').split(/[\\/]/).filter(Boolean).pop() || 'User';
    el.giPermsTableBody.innerHTML = `
      <tr><td>${user} (me)</td><td style="color: ${isReadOnly ? 'var(--text-muted)' : 'var(--accent)'}; font-weight: 500;">${isReadOnly ? 'Read only' : 'Read & Write'}</td></tr>
      <tr><td>Administrators</td><td style="color: var(--accent); font-weight: 500;">Read & Write</td></tr>
      <tr><td>SYSTEM</td><td style="color: var(--accent); font-weight: 500;">Read & Write</td></tr>
      <tr><td>everyone</td><td style="color: var(--text-muted);">Read only</td></tr>
    `;
  }

  async function openGetInfoModal(targetItem = null) {
    const item = targetItem || state.activeItem;
    if (!item) {
      showToast('Select an item to view Info', 'info');
      return;
    }
    activeInfoItem = item;

    if (el.giWindowTitle) el.giWindowTitle.textContent = `${item.name} Info`;
    if (el.giHeroIcon) el.giHeroIcon.innerHTML = getFileIcon(item);
    if (el.giHeroTitle) el.giHeroTitle.textContent = item.name;
    const kindStr = formatKind(item);
    if (el.giHeroSub) el.giHeroSub.textContent = item.isDirectory ? 'Folder' : `${formatBytes(item.size)} — ${formatDateFinder(item.mtime)}`;

    // General
    if (el.giKindVal) el.giKindVal.textContent = item.isDirectory ? 'Folder' : `${kindStr} (${(item.extension || '').toUpperCase().replace('.', '')})`;
    if (el.giSizeVal) el.giSizeVal.textContent = item.isDirectory ? 'Calculating...' : `${formatBytes(item.size)} (${(item.size || 0).toLocaleString()} bytes)`;
    if (el.giWhereVal) el.giWhereVal.textContent = item.path;
    if (el.giCreatedVal) el.giCreatedVal.textContent = formatDateFull(item.birthtime || item.mtime);
    if (el.giModifiedVal) el.giModifiedVal.textContent = formatDateFull(item.mtime);
    if (el.giChkLocked) el.giChkLocked.checked = !!item.isReadOnly;
    renderGiPermissions(!!item.isReadOnly);

    // More Info
    if (el.giAccessedVal) el.giAccessedVal.textContent = formatDateFull(item.atime || item.mtime);
    if (el.giDimensionsVal) el.giDimensionsVal.textContent = '--';
    if (el.giContentsVal) el.giContentsVal.textContent = '--';

    // Name & Extension
    if (el.giNameInput) el.giNameInput.value = item.name;
    if (el.giChkHideExt) el.giChkHideExt.checked = false;

    // Preview
    if (el.giPreviewContainer) {
      if (isImageFile(item)) {
        const imgUrl = getMediaUrl(item.path);
        el.giPreviewContainer.innerHTML = `<img src="${imgUrl}" style="max-width: 100%; max-height: 200px; object-fit: contain; border-radius: var(--radius-sm);" />`;
        const testImg = new Image();
        testImg.src = imgUrl;
        testImg.onload = () => {
          if (el.giDimensionsVal) el.giDimensionsVal.textContent = `${testImg.naturalWidth} x ${testImg.naturalHeight}`;
        };
      } else {
        el.giPreviewContainer.innerHTML = `<div style="padding: 20px; display: flex; align-items: center; justify-content: center;">${getFileIcon(item)}</div>`;
      }
    }

    if (el.getInfoModal) el.getInfoModal.style.display = 'flex';

    if (api.getFileDetails) {
      api.getFileDetails(item.path).then(details => {
        if (activeInfoItem !== item || !details.success) return;
        if (details.birthtime && el.giCreatedVal) el.giCreatedVal.textContent = formatDateFull(details.birthtime);
        if (details.mtime && el.giModifiedVal) el.giModifiedVal.textContent = formatDateFull(details.mtime);
        if (details.atime && el.giAccessedVal) el.giAccessedVal.textContent = formatDateFull(details.atime);
        if (details.isReadOnly !== undefined) {
          item.isReadOnly = details.isReadOnly;
          if (el.giChkLocked) el.giChkLocked.checked = !!details.isReadOnly;
          renderGiPermissions(details.isReadOnly);
        }
        if (item.isDirectory) {
          const totalItems = (details.fileCount || 0) + (details.folderCount || 0);
          if (el.giSizeVal) el.giSizeVal.textContent = `${formatBytes(details.size || 0)} (${totalItems} items)`;
          if (el.giContentsVal) el.giContentsVal.textContent = `${details.fileCount || 0} files, ${details.folderCount || 0} subfolders`;
          if (el.giHeroSub) el.giHeroSub.textContent = `Folder — ${totalItems} items`;
        }
      }).catch(() => {});
    }
  }

  function closeGetInfoModal() {
    if (el.getInfoModal) el.getInfoModal.style.display = 'none';
    activeInfoItem = null;
  }

  // 2. macOS "Go to Folder..." Modal Sheet (Cmd+Shift+G / Ctrl+Shift+G)
  function openGoToFolderModal() {
    if (!el.goToFolderModal) return;
    if (el.goFolderInput) el.goFolderInput.value = '';
    el.goToFolderModal.style.display = 'flex';
    setTimeout(() => {
      if (el.goFolderInput) el.goFolderInput.focus();
    }, 50);
  }

  function closeGoToFolderModal() {
    if (el.goToFolderModal) el.goToFolderModal.style.display = 'none';
  }

  async function executeGoToFolder(inputVal) {
    let raw = (inputVal || '').trim();
    if (!raw) {
      closeGoToFolderModal();
      return;
    }

    // Expand ~
    if (raw.startsWith('~')) {
      const home = state.homePath || (state.specialFolders.find(f => f.id === 'home')?.path) || 'C:\\';
      const suffix = raw.slice(1).replace(/^[\\\/]/, '');
      raw = (home.endsWith('\\') || home.endsWith('/')) ? home + suffix : home + '\\' + suffix;
    }

    // Check special folder aliases like "desktop", "downloads"
    const lower = raw.toLowerCase();
    const matchSpecial = (state.specialFolders || []).find(f => f.id === lower || f.name.toLowerCase() === lower);
    if (matchSpecial) {
      raw = matchSpecial.path;
    }

    closeGoToFolderModal();
    await navigateTo(raw);
  }

  // 3. macOS Standard "Go" Shortcuts
  function goToHome() {
    const home = state.homePath || (state.specialFolders.find(f => f.id === 'home')?.path);
    if (home) navigateTo(home);
    else showToast('Home directory not detected', 'info');
  }

  function goToDesktop() {
    const folder = (state.specialFolders || []).find(f => f.id === 'desktop');
    if (folder) navigateTo(folder.path);
    else showToast('Desktop folder not found', 'info');
  }

  function goToDocuments() {
    const folder = (state.specialFolders || []).find(f => f.id === 'documents');
    if (folder) navigateTo(folder.path);
    else showToast('Documents folder not found', 'info');
  }

  function goToDownloads() {
    const folder = (state.specialFolders || []).find(f => f.id === 'downloads');
    if (folder) navigateTo(folder.path);
    else showToast('Downloads folder not found', 'info');
  }

  function goToApplications() {
    const progFiles = 'C:\\Program Files';
    navigateTo(progFiles);
  }

  // 4. "New Folder with Selection" (Cmd+Ctrl+N / Ctrl+Alt+N)
  async function createNewFolderWithSelection() {
    let targets = [];
    if (state.selectedIndices && state.selectedIndices.size > 0) {
      targets = Array.from(state.selectedIndices).map(i => state.items[i]).filter(Boolean);
    } else if (state.contextTarget) {
      targets = [state.contextTarget];
    } else if (state.activeItem) {
      targets = [state.activeItem];
    }

    if (targets.length === 0) {
      showToast('Select items to create folder with', 'info');
      return;
    }

    // Determine unique name "New Folder with Items"
    const baseName = 'New Folder with Items';
    let folderName = baseName;
    let count = 2;
    const existingNames = new Set((state.items || []).map(it => it.name.toLowerCase()));
    while (existingNames.has(folderName.toLowerCase())) {
      folderName = `${baseName} ${count++}`;
    }

    try {
      const res = await api.createFolder(state.currentPath, folderName);
      if (!res.success) {
        showToast(`Failed to create folder: ${res.error}`, 'error');
        return;
      }
      const newFolderPath = (state.currentPath.endsWith('\\') || state.currentPath.endsWith('/'))
        ? state.currentPath + folderName
        : state.currentPath + '\\' + folderName;

      const srcPaths = targets.map(t => t.path);
      await api.moveItems(srcPaths, newFolderPath);
      showToast(`Created "${folderName}" with ${targets.length} items`, 'success');

      pushUndoAction({
        type: 'folder-with-selection',
        folderPath: newFolderPath,
        parentDir: state.currentPath,
        itemPaths: srcPaths.map(sp => {
          const fn = pathBasename(sp);
          return (newFolderPath.endsWith('\\') || newFolderPath.endsWith('/')) ? newFolderPath + fn : newFolderPath + '\\' + fn;
        })
      });

      await navigateTo(state.currentPath, false);
      const newIdx = (state.items || []).findIndex(it => it.name === folderName);
      if (newIdx !== -1) {
        state.selectedIndices.clear();
        state.selectedIndices.add(newIdx);
        state.activeItem = state.items[newIdx];
        reapplySelectionClasses();
      }
    } catch (err) {
      showToast(`Error creating folder with selection: ${err.message}`, 'error');
    }
  }

  // 5. Quick Action: Rotate Image 90° Clockwise
  function rotateActiveImage() {
    const target = state.contextTarget || state.activeItem;
    if (!target || target.isDirectory || !isImageFile(target)) return;
    state.activeItemRotation = ((state.activeItemRotation || 0) + 90) % 360;
    renderPreviewPane();
    showToast(`Rotated to ${state.activeItemRotation}°`, 'info');
  }

  // 6. View Options Panel Toggle (Cmd+J / Ctrl+J)
  function toggleViewOptionsPanel() {
    state.viewOptionsOpen = !state.viewOptionsOpen;
    if (el.viewOptionsPanel) {
      el.viewOptionsPanel.style.display = state.viewOptionsOpen ? 'flex' : 'none';
      if (state.viewOptionsOpen) {
        const folderName = pathBasename(state.currentPath) || state.currentPath;
        if (el.voFolderTitle) el.voFolderTitle.textContent = folderName;
      }
    }
  }

  // --- 7. NATIVE FILE DEDUPLICATION ENGINE & UI (Ctrl+Shift+U) ---
  async function openDeduplicationModal(targetFolder = null) {
    const folder = targetFolder || state.currentPath;
    state.dedupTargetDir = folder;
    state.dedupModalOpen = true;
    state.dedupSelectedFiles.clear();
    state.dedupGroups = [];

    if (el.dedupScopeBadge) el.dedupScopeBadge.textContent = folder;
    if (el.dedupModal) el.dedupModal.style.display = 'flex';
    if (el.dedupBody) {
      el.dedupBody.innerHTML = `
        <div class="empty-state" style="padding: 40px 20px;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--fill-subtle); display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px; animation: spin 1.2s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
          </div>
          <div class="empty-state-title" style="font-size: 15px;">Scanning for Duplicate Files...</div>
          <div class="empty-state-sub" style="font-size: 12px; margin-top: 4px;">Analyzing file sizes and computing SHA-256 cryptographic hashes</div>
        </div>
      `;
    }

    await executeDeduplicationScan();
  }

  function closeDeduplicationModal() {
    state.dedupModalOpen = false;
    if (el.dedupModal) el.dedupModal.style.display = 'none';
  }

  async function executeDeduplicationScan() {
    const isRecursive = el.dedupChkRecursive ? el.dedupChkRecursive.checked : false;
    const res = await api.findDuplicates({
      folderPath: state.dedupTargetDir || state.currentPath,
      recursive: isRecursive,
      minSize: state.dedupMinSize || 1
    });

    if (!res || !res.success) {
      if (el.dedupBody) {
        el.dedupBody.innerHTML = `
          <div class="empty-state" style="padding: 40px 20px;">
            <div class="empty-state-title" style="font-size: 15px; color: #ef4444;">Scan Failed</div>
            <div class="empty-state-sub" style="font-size: 12px; margin-top: 4px;">${escapeHtml(res?.error || 'Unable to scan folder')}</div>
          </div>
        `;
      }
      return;
    }

    state.dedupGroups = res.duplicateGroups || [];
    renderDeduplicationResults(res);
  }

  function renderDeduplicationResults(res) {
    const groups = res.duplicateGroups || [];
    const scanned = res.totalFilesScanned || 0;
    const wasted = res.wastedBytes || 0;

    if (el.dedupBadgeGroups) el.dedupBadgeGroups.textContent = `${groups.length} Duplicate Group${groups.length !== 1 ? 's' : ''}`;
    if (el.dedupBadgeWasted) el.dedupBadgeWasted.textContent = `${formatBytes(wasted)} Reclaimable`;
    if (el.dedupBadgeScanned) el.dedupBadgeScanned.textContent = `${scanned} files scanned`;

    // Smart default: Select all duplicates EXCEPT the newest (keep newest)
    state.dedupSelectedFiles.clear();
    for (const group of groups) {
      for (let i = 0; i < group.files.length - 1; i++) {
        state.dedupSelectedFiles.add(group.files[i].path);
      }
    }

    if (groups.length === 0) {
      if (el.dedupBody) {
        el.dedupBody.innerHTML = `
          <div class="empty-state" style="padding: 50px 20px;">
            <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.25); display: flex; align-items: center; justify-content: center; margin-bottom: 14px;">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" style="width: 28px; height: 28px;"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div class="empty-state-title" style="font-size: 15px;">No Duplicate Files Found</div>
            <div class="empty-state-sub" style="font-size: 12px; margin-top: 4px;">All ${scanned} files in this directory are unique.</div>
          </div>
        `;
      }
      updateDeduplicationSelectionUI();
      return;
    }

    if (!el.dedupBody) return;
    el.dedupBody.innerHTML = '';

    groups.forEach((group, gIdx) => {
      const card = document.createElement('div');
      card.className = 'dedup-group-card';

      const shortHash = (group.hash || '').substring(0, 12);
      const wastedInGroup = (group.files.length - 1) * group.size;

      card.innerHTML = `
        <div class="dedup-group-header">
          <div class="dedup-group-title">
            <span>Group ${gIdx + 1}</span>
            <span style="font-weight: 400; color: var(--text-dim);">&bull;</span>
            <span>${group.files.length} Copies</span>
            <span style="font-weight: 400; color: var(--text-dim);">&bull;</span>
            <span style="color: #f59e0b;">${formatBytes(wastedInGroup)} wasted</span>
          </div>
          <div style="font-family: monospace; font-size: 10px; color: var(--text-dim);">
            SHA-256: ${shortHash}... &bull; ${formatBytes(group.size)} each
          </div>
        </div>
        <div class="dedup-group-files"></div>
      `;

      const filesContainer = card.querySelector('.dedup-group-files');

      // Sort files: last file is marked "Newest (Keep)"
      group.files.forEach((file, fIdx) => {
        const isNewest = fIdx === group.files.length - 1;
        const isChecked = state.dedupSelectedFiles.has(file.path);

        const row = document.createElement('div');
        row.className = `dedup-file-item ${isChecked ? 'selected-for-delete' : ''}`;
        row.innerHTML = `
          <input type="checkbox" class="dedup-check" ${isChecked ? 'checked' : ''} />
          <div class="dedup-file-icon">
            ${getFileIcon({ name: file.name, isDirectory: false, extension: pathExtname(file.name) }, false)}
          </div>
          <div class="dedup-file-info">
            <div class="dedup-file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
            <div class="dedup-file-path" title="${escapeHtml(file.path)}">${escapeHtml(file.path)}</div>
          </div>
          <div class="dedup-file-meta">
            <span class="dedup-file-date">${formatDate(file.mtime)}</span>
            <span class="dedup-tag-pill ${isNewest ? 'dedup-tag-original' : 'dedup-tag-duplicate'}">
              ${isNewest ? 'Newest' : 'Duplicate'}
            </span>
          </div>
        `;

        const chk = row.querySelector('.dedup-check');
        chk.addEventListener('change', () => {
          if (chk.checked) {
            state.dedupSelectedFiles.add(file.path);
            row.classList.add('selected-for-delete');
          } else {
            state.dedupSelectedFiles.delete(file.path);
            row.classList.remove('selected-for-delete');
          }
          updateDeduplicationSelectionUI();
        });

        filesContainer.appendChild(row);
      });

      el.dedupBody.appendChild(card);
    });

    updateDeduplicationSelectionUI();
  }

  function updateDeduplicationSelectionUI() {
    const count = state.dedupSelectedFiles.size;
    let selectedBytes = 0;

    for (const group of state.dedupGroups) {
      for (const file of group.files) {
        if (state.dedupSelectedFiles.has(file.path)) {
          selectedBytes += file.size || group.size || 0;
        }
      }
    }

    if (el.dedupFooterInfo) {
      el.dedupFooterInfo.textContent = `${count} file${count !== 1 ? 's' : ''} selected (${formatBytes(selectedBytes)} to be freed)`;
    }
    if (el.btnDedupDelete) {
      el.btnDedupDelete.disabled = count === 0;
      el.btnDedupDelete.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        Delete ${count} Duplicate${count !== 1 ? 's' : ''}
      `;
    }
  }

  function selectDuplicatesKeepNewest() {
    state.dedupSelectedFiles.clear();
    for (const group of state.dedupGroups) {
      for (let i = 0; i < group.files.length - 1; i++) {
        state.dedupSelectedFiles.add(group.files[i].path);
      }
    }
    syncDedupCheckboxes();
  }

  function selectDuplicatesKeepOldest() {
    state.dedupSelectedFiles.clear();
    for (const group of state.dedupGroups) {
      for (let i = 1; i < group.files.length; i++) {
        state.dedupSelectedFiles.add(group.files[i].path);
      }
    }
    syncDedupCheckboxes();
  }

  function deselectAllDuplicates() {
    state.dedupSelectedFiles.clear();
    syncDedupCheckboxes();
  }

  function syncDedupCheckboxes() {
    if (!el.dedupBody) return;
    el.dedupBody.querySelectorAll('.dedup-file-item').forEach(row => {
      const p = row.querySelector('.dedup-file-path')?.textContent;
      const chk = row.querySelector('.dedup-check');
      if (p && chk) {
        const isChecked = state.dedupSelectedFiles.has(p);
        chk.checked = isChecked;
        row.classList.toggle('selected-for-delete', isChecked);
      }
    });
    updateDeduplicationSelectionUI();
  }

  async function executeDeleteSelectedDuplicates() {
    const toDelete = Array.from(state.dedupSelectedFiles);
    if (toDelete.length === 0) return;

    showConfirmModal(
      'Delete Duplicate Files',
      `Are you sure you want to delete ${toDelete.length} duplicate file${toDelete.length > 1 ? 's' : ''}? This will permanently remove them.`,
      async () => {
        el.btnDedupDelete.disabled = true;
        el.btnDedupDelete.textContent = 'Deleting...';

        const res = await api.deleteDuplicates(toDelete);
        if (res && res.success) {
          showToast(`Successfully deleted ${res.deletedCount} duplicates (${formatBytes(res.freedBytes)} freed)`, 'success');
          await navigateTo(state.currentPath, false);
          await executeDeduplicationScan();
        } else {
          showToast(`Deletion completed with errors: ${res?.error || 'Some files could not be deleted'}`, 'error');
          await executeDeduplicationScan();
        }
      },
      'Delete Duplicates',
      'Cancel',
      true
    );
  }

  // --- NATIVE STORAGE MANAGEMENT ENGINE ---
  async function openStorageModal(targetDrive) {
    let drivePath = targetDrive;
    if (!drivePath) {
      drivePath = (state.currentPath || 'C:\\').substring(0, 1).toUpperCase() + ':\\';
    } else {
      drivePath = drivePath.substring(0, 1).toUpperCase() + ':\\';
    }

    state.storageCurrentDrive = drivePath;
    state.storageModalOpen = true;
    state.storageActiveTab = 'largest';

    // Populate drive select
    if (el.storageDriveSelect) {
      el.storageDriveSelect.innerHTML = '';
      const drivesList = state.drives && state.drives.length ? state.drives : [{ path: 'C:\\', label: 'OS Disk', letter: 'C' }];
      drivesList.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.path;
        opt.textContent = formatDriveDisplayName(d);
        if (d.path.toUpperCase().startsWith(drivePath.toUpperCase())) {
          opt.selected = true;
        }
        el.storageDriveSelect.appendChild(opt);
      });
    }

    // Set tab states
    if (el.tabBtnLargestFiles) el.tabBtnLargestFiles.classList.add('active');
    if (el.tabBtnTopFolders) el.tabBtnTopFolders.classList.remove('active');
    if (el.tabContentLargestFiles) el.tabContentLargestFiles.style.display = 'block';
    if (el.tabContentTopFolders) el.tabContentTopFolders.style.display = 'none';

    if (el.storageModal) el.storageModal.style.display = 'flex';

    // Show initial loading skeleton
    if (el.storageBar) {
      el.storageBar.innerHTML = `<div class="storage-segment seg-apps" style="width: 100%; opacity: 0.35; animation: pulse 1s infinite alternate;"></div>`;
    }
    if (el.storageLargestFilesTbody) {
      el.storageLargestFilesTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 28px; color: var(--text-dim);">Analyzing volume consumers and calculating category distributions...</td></tr>`;
    }
    if (el.storageTopFoldersList) {
      el.storageTopFoldersList.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-dim);">Measuring folder sizes...</div>`;
    }

    await loadStorageData(drivePath);
  }

  function closeStorageModal() {
    state.storageModalOpen = false;
    if (el.storageModal) el.storageModal.style.display = 'none';
  }

  async function loadStorageData(drivePath) {
    if (el.btnStorageRescan) {
      el.btnStorageRescan.disabled = true;
      el.btnStorageRescan.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
        <span>Scanning...</span>
      `;
    }

    try {
      const res = await api.storageAnalyze({ drive: drivePath });
      if (!res || !res.success) {
        showToast(res?.error || 'Failed to analyze storage', 'error');
        return;
      }

      state.storageAnalysisData = res;
      renderStorageOverview(res);
      renderStorageBar(res);
      renderStorageLargestFiles(res.topFiles || []);
      renderStorageTopFolders(res.topFolders || []);

      // Update maintenance cards
      if (el.storageTempSize) {
        el.storageTempSize.textContent = `${formatBytes(res.temp?.bytes || 0)} (${res.temp?.count || 0} items)`;
      }
      if (el.storageRecycleSize) {
        el.storageRecycleSize.textContent = `${formatBytes(res.recycle?.bytes || 0)} (${res.recycle?.count || 0} items)`;
      }
      if (el.storageFooterNote) {
        el.storageFooterNote.textContent = `Scanned ${res.scannedCount || 0} items in ${res.durationMs || 0}ms · Zero-dependency native filesystem engine`;
      }
    } catch (err) {
      showToast(`Storage analysis error: ${err.message}`, 'error');
    } finally {
      if (el.btnStorageRescan) {
        el.btnStorageRescan.disabled = false;
        el.btnStorageRescan.innerHTML = `
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          <span>Rescan</span>
        `;
      }
    }
  }

  function renderStorageOverview(data) {
    const driveLetter = data.drive.charAt(0);
    const driveObj = (state.drives || []).find(d => d.letter === driveLetter);
    const driveName = driveObj ? formatDriveDisplayName(driveObj) : `${data.drive} Volume`;

    if (el.storageHeroDriveName) el.storageHeroDriveName.textContent = driveName;
    if (el.storageHeroUsed) el.storageHeroUsed.textContent = formatBytes(data.usedBytes);
    if (el.storageHeroTotal) el.storageHeroTotal.textContent = `of ${formatBytes(data.totalBytes)} used`;
    if (el.storageHeroFree) el.storageHeroFree.textContent = `${formatBytes(data.freeBytes)} free`;

    const pct = data.totalBytes > 0 ? Math.round((data.usedBytes / data.totalBytes) * 100) : 0;
    if (el.storageHeroPercent) el.storageHeroPercent.textContent = `${pct}% Used`;
  }

  function renderStorageBar(data) {
    if (!el.storageBar || !el.storageLegendGrid) return;
    el.storageBar.innerHTML = '';
    el.storageLegendGrid.innerHTML = '';

    const total = data.totalBytes || 1;
    const cats = data.categories || {};

    const categoryMeta = [
      { key: 'apps', label: 'Applications', color: '#3b82f6', cls: 'seg-apps' },
      { key: 'documents', label: 'Documents', color: '#0ea5e9', cls: 'seg-documents' },
      { key: 'images', label: 'Images', color: '#ec4899', cls: 'seg-images' },
      { key: 'videos', label: 'Video', color: '#8b5cf6', cls: 'seg-videos' },
      { key: 'audio', label: 'Audio', color: '#10b981', cls: 'seg-audio' },
      { key: 'archives', label: 'Archives', color: '#f59e0b', cls: 'seg-archives' },
      { key: 'other', label: 'System & Other', color: '#64748b', cls: 'seg-other' }
    ];

    let usedBarPercent = 0;

    categoryMeta.forEach(cat => {
      const catData = cats[cat.key] || { bytes: 0, count: 0 };
      const rawPct = (catData.bytes / total) * 100;
      const displayPct = rawPct > 0 ? Math.max(0.4, rawPct) : 0;
      usedBarPercent += displayPct;

      if (displayPct > 0) {
        const seg = document.createElement('div');
        seg.className = `storage-segment ${cat.cls}`;
        seg.style.width = `${displayPct}%`;
        seg.title = `${cat.label}: ${formatBytes(catData.bytes)} (${Math.round(rawPct)}%)`;
        el.storageBar.appendChild(seg);
      }

      // Add legend pill
      const leg = document.createElement('div');
      leg.className = 'storage-legend-item';
      leg.innerHTML = `
        <span class="storage-legend-dot" style="background: ${cat.color};"></span>
        <span class="storage-legend-label">${cat.label}</span>
        <span class="storage-legend-val">${formatBytes(catData.bytes)}</span>
      `;
      el.storageLegendGrid.appendChild(leg);
    });

    // Free space segment
    const freePct = Math.max(0, 100 - usedBarPercent);
    if (freePct > 0) {
      const freeSeg = document.createElement('div');
      freeSeg.className = 'storage-segment seg-free';
      freeSeg.style.width = `${freePct}%`;
      freeSeg.title = `Free Space: ${formatBytes(data.freeBytes)} (${Math.round((data.freeBytes / total) * 100)}%)`;
      el.storageBar.appendChild(freeSeg);
    }

    // Free space legend pill
    const freeLeg = document.createElement('div');
    freeLeg.className = 'storage-legend-item';
    freeLeg.innerHTML = `
      <span class="storage-legend-dot" style="background: var(--border-medium);"></span>
      <span class="storage-legend-label">Free Space</span>
      <span class="storage-legend-val">${formatBytes(data.freeBytes)}</span>
    `;
    el.storageLegendGrid.appendChild(freeLeg);
  }

  function renderStorageLargestFiles(files) {
    if (!el.storageLargestFilesTbody) return;
    el.storageLargestFilesTbody.innerHTML = '';

    if (!files || files.length === 0) {
      el.storageLargestFilesTbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 24px; color: var(--text-dim);">No large files detected on this volume.</td>
        </tr>
      `;
      return;
    }

    files.forEach(file => {
      const tr = document.createElement('tr');
      const itemMock = {
        name: file.name,
        path: file.path,
        isDirectory: false,
        extension: file.extension || path.extname(file.name)
      };

      const iconSvg = getFileIcon(itemMock, false);
      const modDate = file.mtime ? new Date(file.mtime).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '--';

      tr.innerHTML = `
        <td>
          <div class="storage-file-cell">
            ${iconSvg}
            <div class="storage-file-info">
              <span class="storage-file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
              <span class="storage-file-path" title="${escapeHtml(file.path)}">${escapeHtml(file.path)}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="storage-category-badge ${file.category || 'other'}">${file.category || 'other'}</span>
        </td>
        <td style="text-align: right; font-weight: 600; font-variant-numeric: tabular-nums;">
          ${formatBytes(file.size)}
        </td>
        <td style="color: var(--text-muted); font-size: 11px;">
          ${modDate}
        </td>
        <td style="text-align: center;">
          <div class="storage-action-btns">
            <button class="storage-mini-btn btn-storage-reveal" title="Show in Folder">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              <span>Reveal</span>
            </button>
            <button class="storage-mini-btn danger btn-storage-delete" title="Move to Trash">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      `;

      const btnReveal = tr.querySelector('.btn-storage-reveal');
      if (btnReveal) {
        btnReveal.addEventListener('click', () => {
          closeStorageModal();
          const parentDir = file.path.substring(0, file.path.lastIndexOf('\\')) || state.currentPath;
          navigateTo(parentDir);
        });
      }

      const btnDelete = tr.querySelector('.btn-storage-delete');
      if (btnDelete) {
        btnDelete.addEventListener('click', () => {
          showConfirmModal(
            'Move to Trash',
            `Move "${file.name}" to the Recycle Bin?`,
            async () => {
              try {
                const delRes = await api.deleteItem(file.path);
                if (delRes && delRes.success) {
                  showToast(`Deleted "${file.name}"`, 'info');
                  tr.remove();
                  await loadStorageData(state.storageCurrentDrive);
                } else {
                  showToast(delRes?.error || 'Could not delete item', 'error');
                }
              } catch (err) {
                showToast(`Delete failed: ${err.message}`, 'error');
              }
            },
            'Move to Trash',
            'Cancel'
          );
        });
      }

      el.storageLargestFilesTbody.appendChild(tr);
    });
  }

  function renderStorageTopFolders(folders) {
    if (!el.storageTopFoldersList) return;
    el.storageTopFoldersList.innerHTML = '';

    if (!folders || folders.length === 0) {
      el.storageTopFoldersList.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-dim);">No folder metrics available.</div>
      `;
      return;
    }

    folders.forEach(folder => {
      const row = document.createElement('div');
      row.className = 'storage-folder-row';

      row.innerHTML = `
        <div class="storage-folder-left">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; color: var(--accent); flex-shrink: 0;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
            <span class="storage-folder-name" title="${escapeHtml(folder.name)}">${escapeHtml(folder.name)}</span>
            <span class="storage-folder-path" title="${escapeHtml(folder.path)}">${escapeHtml(folder.path)}</span>
          </div>
        </div>
        <div class="storage-folder-right">
          <span class="storage-folder-size">${formatBytes(folder.size)}</span>
          <button class="storage-mini-btn btn-open-folder" title="Open Folder">Open</button>
        </div>
      `;

      const btnOpen = row.querySelector('.btn-open-folder');
      if (btnOpen) {
        btnOpen.addEventListener('click', () => {
          closeStorageModal();
          navigateTo(folder.path);
        });
      }

      el.storageTopFoldersList.appendChild(row);
    });
  }

  async function cleanStorageTemp() {
    if (!el.btnStorageCleanTemp) return;
    el.btnStorageCleanTemp.disabled = true;
    const oldText = el.btnStorageCleanTemp.textContent;
    el.btnStorageCleanTemp.textContent = 'Cleaning...';

    try {
      const res = await api.storageCleanTemp();
      if (res && res.success) {
        showToast(`Cleaned ${res.deletedCount} temporary files (${formatBytes(res.freedBytes)} freed)`, 'success');
        await loadStorageData(state.storageCurrentDrive);
      } else {
        showToast(`Could not clean temp files: ${res?.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      showToast(`Clean failed: ${err.message}`, 'error');
    } finally {
      el.btnStorageCleanTemp.disabled = false;
      el.btnStorageCleanTemp.textContent = oldText;
    }
  }

  async function emptyStorageRecycleBin() {
    if (!el.btnStorageEmptyRecycle) return;
    showConfirmModal(
      'Empty Recycle Bin',
      'Permanently delete all files in the Recycle Bin? This action cannot be undone.',
      async () => {
        el.btnStorageEmptyRecycle.disabled = true;
        const oldText = el.btnStorageEmptyRecycle.textContent;
        el.btnStorageEmptyRecycle.textContent = 'Emptying...';

        try {
          const res = await api.storageEmptyRecycle(state.storageCurrentDrive);
          if (res && res.success) {
            showToast('Recycle Bin emptied successfully', 'success');
            await loadStorageData(state.storageCurrentDrive);
          } else {
            showToast(`Failed to empty Recycle Bin: ${res?.error || 'Unknown error'}`, 'error');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'error');
        } finally {
          el.btnStorageEmptyRecycle.disabled = false;
          el.btnStorageEmptyRecycle.textContent = oldText;
        }
      },
      'Empty Recycle Bin',
      'Cancel',
      true
    );
  }

  // --- SHARE HUB ENGINE (Windows Native Options & Windows Share Apps Directory) ---
  let shareTargetItem = null;
  let shareWifiDownloadUrl = '';
  let cachedInstalledShareApps = null;

  function filterShareApps(searchTerm) {
    const term = (searchTerm || '').toLowerCase().trim();
    const appCards = document.querySelectorAll('.share-app-card');
    let visibleCount = 0;

    appCards.forEach(card => {
      const name = (card.querySelector('.share-app-name')?.textContent || '').toLowerCase();
      const desc = (card.querySelector('.share-app-desc')?.textContent || '').toLowerCase();
      const match = !term || name.includes(term) || desc.includes(term);
      card.style.display = match ? 'flex' : 'none';
      if (match) visibleCount++;
    });

    const noMatchEl = document.getElementById('shareAppsNoMatch');
    if (noMatchEl) {
      noMatchEl.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  }

  async function refreshInstalledShareApps(forceRefresh = false) {
    try {
      const apps = await api.getInstalledShareApps(forceRefresh);
      if (!apps || typeof apps !== 'object') return;
      cachedInstalledShareApps = apps;

      const appCards = document.querySelectorAll('.share-app-card');

      appCards.forEach(card => {
        const appKey = card.getAttribute('data-app');
        if (!appKey) return;

        const isInstalled = Boolean(apps[appKey]);
        // Installed apps elevated to top via flex order, maintaining stable document order
        card.style.order = isInstalled ? '0' : '1';

        // Find or create name row container for clean label + badge layout
        let nameRow = card.querySelector('.share-app-name-row');
        const nameEl = card.querySelector('.share-app-name');
        if (!nameRow && nameEl && nameEl.parentNode) {
          nameRow = document.createElement('div');
          nameRow.className = 'share-app-name-row';
          nameEl.parentNode.insertBefore(nameRow, nameEl);
          nameRow.appendChild(nameEl);
        }

        let badge = card.querySelector('.share-app-badge');
        if (!badge && nameRow) {
          badge = document.createElement('span');
          badge.className = 'share-app-badge';
          nameRow.appendChild(badge);
        }

        const actionBtn = card.querySelector('.share-app-action');

        if (isInstalled) {
          card.classList.add('is-installed');
          if (badge) {
            if (appKey === 'bluetooth') {
              badge.className = 'share-app-badge system';
              badge.textContent = 'System Tool';
            } else if (appKey === 'phonelink') {
              badge.className = 'share-app-badge system';
              badge.textContent = 'System App';
            } else {
              badge.className = 'share-app-badge installed';
              badge.textContent = 'Installed';
            }
          }
          if (actionBtn) {
            actionBtn.classList.add('installed-btn');
            if (appKey === 'bluetooth') {
              actionBtn.textContent = 'Send via Bluetooth';
            } else if (appKey === 'cloud') {
              actionBtn.textContent = 'Open Cloud';
            } else {
              actionBtn.textContent = 'Launch App';
            }
          }
        } else {
          card.classList.remove('is-installed');
          if (actionBtn) actionBtn.classList.remove('installed-btn');

          if (['toffeeshare', 'wormhole'].includes(appKey)) {
            if (badge) {
              badge.className = 'share-app-badge p2p';
              badge.textContent = 'P2P Web';
            }
            if (actionBtn && appKey === 'toffeeshare') actionBtn.textContent = 'Open Stream';
            if (actionBtn && appKey === 'wormhole') actionBtn.textContent = 'Upload & Share';
          } else if (appKey === 'wetransfer') {
            if (badge) {
              badge.className = 'share-app-badge web';
              badge.textContent = 'Web';
            }
            if (actionBtn) actionBtn.textContent = 'Open WeTransfer';
          } else {
            if (badge) {
              badge.className = 'share-app-badge web';
              badge.textContent = 'Web / Get';
            }
            if (actionBtn) actionBtn.textContent = 'Get / Web';
          }
        }
      });

      // Re-apply filter if user typed in search input
      const searchInput = document.getElementById('shareAppsSearchInput');
      if (searchInput && searchInput.value) {
        filterShareApps(searchInput.value);
      }
    } catch (err) {
      console.warn('Failed to detect installed share apps:', err);
    }
  }

  function switchShareTab(tab) {
    const btnNative = el.tabBtnShareNative || document.getElementById('tabBtnShareNative');
    const btnApps = el.tabBtnShareApps || document.getElementById('tabBtnShareApps');
    const viewNative = el.shareViewNative || document.getElementById('shareViewNative');
    const viewApps = el.shareViewApps || document.getElementById('shareViewApps');

    if (tab === 'native') {
      if (btnNative) btnNative.classList.add('active');
      if (btnApps) btnApps.classList.remove('active');
      if (viewNative) viewNative.style.display = 'block';
      if (viewApps) viewApps.style.display = 'none';
    } else {
      if (btnNative) btnNative.classList.remove('active');
      if (btnApps) btnApps.classList.add('active');
      if (viewNative) viewNative.style.display = 'none';
      if (viewApps) viewApps.style.display = 'block';
      refreshInstalledShareApps();
    }
  }

  function closeShareModal() {
    const modal = el.shareModal || document.getElementById('shareModal');
    if (modal) modal.style.display = 'none';
  }

  async function openShareModal(itemOrPath) {
    let target = null;
    if (itemOrPath && typeof itemOrPath === 'object') {
      target = itemOrPath;
    } else if (typeof itemOrPath === 'string' && itemOrPath) {
      target = {
        name: itemOrPath.split(/[\\/]/).pop() || itemOrPath,
        path: itemOrPath,
        isDirectory: false
      };
    } else if (state.activeItem) {
      target = state.activeItem;
    } else if (state.selectedItems && state.selectedItems.length > 0) {
      target = state.selectedItems[0];
    } else {
      target = {
        name: state.currentPath.split(/[\\/]/).pop() || state.currentPath,
        path: state.currentPath,
        isDirectory: true
      };
    }

    shareTargetItem = target;

    const nameEl = el.shareTargetName || document.getElementById('shareTargetName');
    const pathEl = el.shareTargetPath || document.getElementById('shareTargetPath');
    const iconEl = el.shareTargetIcon || document.getElementById('shareTargetIcon');
    const modalEl = el.shareModal || document.getElementById('shareModal');

    if (nameEl) nameEl.textContent = target.name || 'Untitled';
    if (pathEl) pathEl.textContent = target.path || '';
    if (iconEl) {
      const isDir = Boolean(target.isDirectory);
      iconEl.innerHTML = isDir
        ? `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`
        : `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
    }

    switchShareTab('native');
    if (modalEl) modalEl.style.display = 'flex';

    setupShareWifi(target.path).catch(err => {
      console.warn('Wi-Fi share link setup error:', err);
    });
    refreshInstalledShareApps().catch(() => {});
  }

  async function setupShareWifi(filePath) {
    try {
      const ip = (await api.getLocalIp()) || '127.0.0.1';
      const port = 5241;
      const url = `http://${ip}:${port}/api/raw-file?path=${encodeURIComponent(filePath)}&download=1`;
      shareWifiDownloadUrl = url;

      if (el.shareWifiUrlDisplay) {
        el.shareWifiUrlDisplay.textContent = url;
        el.shareWifiUrlDisplay.title = url;
      }

      if (el.shareQrContainer) {
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(url)}`;
        el.shareQrContainer.innerHTML = `
          <img src="${qrApiUrl}" alt="Wi-Fi Transfer QR Code" 
               style="width: 100%; height: 100%; object-fit: contain; display: block;" 
               onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\\'padding: 4px; font-size: 10px; text-align: center; color: #1e293b; font-weight: 600; line-height: 1.25; word-break: break-all;\\'>Connect on Wi-Fi:<br><span style=\\'color: #0284c7;\\'>Scan with phone</span></div>';">
        `;
      }
    } catch {
      if (el.shareWifiUrlDisplay) {
        el.shareWifiUrlDisplay.textContent = `http://localhost:5241/api/raw-file?path=${encodeURIComponent(filePath)}&download=1`;
      }
    }
  }

  function getShareUncPath(localPath) {
    if (!localPath) return '';
    const match = localPath.match(/^([a-zA-Z]):\\(.*)$/);
    if (match) {
      const driveLetter = match[1].toUpperCase();
      const rest = match[2];
      return `\\\\localhost\\${driveLetter}$\\${rest}`;
    }
    return localPath;
  }

  async function handleShareApp(appName) {
    if (!shareTargetItem) return;
    const target = shareTargetItem;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(target.path);
    }

    const isInstalled = Boolean(cachedInstalledShareApps && cachedInstalledShareApps[appName]);

    switch (appName) {
      case 'localsend':
        if (isInstalled) {
          showToast('LocalSend: Path copied. Launching LocalSend...', 'info');
        } else {
          showToast('LocalSend: Path copied. Opening official site...', 'info');
        }
        await api.launchShareApp('localsend', target.path);
        break;

      case 'quickshare':
        if (isInstalled) {
          showToast('Quick Share: Path copied. Launching Quick Share...', 'info');
        } else {
          showToast('Quick Share: Path copied. Opening Google download page...', 'info');
        }
        await api.launchShareApp('quickshare', target.path);
        break;

      case 'sendanywhere':
        if (isInstalled) {
          showToast('Send Anywhere: Path copied. Launching application...', 'info');
        } else {
          showToast('Send Anywhere: Path copied. Opening web portal...', 'info');
        }
        await api.launchShareApp('sendanywhere', target.path);
        break;

      case 'phonelink':
        showToast('Phone Link: Path copied. Opening Phone Link...', 'info');
        await api.launchShareApp('phonelink', target.path);
        break;

      case 'bluetooth':
        showToast('Bluetooth: Launching Windows File Transfer wizard...', 'info');
        await api.launchShareApp('bluetooth', target.path);
        break;

      case 'whatsapp':
        showToast('WhatsApp: Path copied. Opening chat...', 'info');
        await api.launchShareApp('whatsapp', target.path);
        break;

      case 'telegram':
        showToast('Telegram: Path copied. Opening Telegram...', 'info');
        await api.launchShareApp('telegram', target.path);
        break;

      case 'cloud':
        showToast('Cloud Sync: Revealing file in Explorer...', 'info');
        await api.launchShareApp('cloud', target.path);
        break;

      case 'toffeeshare':
        showToast('ToffeeShare: Path copied. Opening P2P transfer...', 'info');
        await api.launchShareApp('toffeeshare', target.path);
        break;

      case 'wormhole':
        showToast('Wormhole: Path copied. Opening Wormhole transfer...', 'info');
        await api.launchShareApp('wormhole', target.path);
        break;

      case 'wetransfer':
        showToast('WeTransfer: Path copied. Opening WeTransfer...', 'info');
        await api.launchShareApp('wetransfer', target.path);
        break;

      default:
        showToast(`Sharing ${target.name} via ${appName}`, 'info');
        break;
    }
  }

  // --- EVENT LISTENERS SETUP ---
  function setupEventListeners() {
    // Mouse Cursor: Marquee selection on viewports
    initMarqueeSelection(el.primaryViewport);
    if (el.secondaryViewport) initMarqueeSelection(el.secondaryViewport);

    // Navigation
    el.btnBack.addEventListener('click', goBack);
    el.btnForward.addEventListener('click', goForward);
    el.btnUp.addEventListener('click', goUp);
    el.btnRefresh.addEventListener('click', () => navigateTo(state.currentPath, false));

    // Address Bar input
    if (el.addressBar) {
      el.addressBar.addEventListener('click', (e) => {
        if (e.target === el.btnCopyPath || el.btnCopyPath?.contains(e.target)) return;
        if (e.target.closest('.crumb-item')) return;
        toggleAddressInput(true);
      });
    }
    el.breadcrumbsTrail.addEventListener('click', (e) => {
      if (e.target.closest('.crumb-item')) return;
      toggleAddressInput(true);
    });
    el.pathInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        toggleAddressInput(false);
        navigateTo(el.pathInput.value);
      } else if (e.key === 'Escape') {
        toggleAddressInput(false);
      }
    });
    el.pathInput.addEventListener('blur', () => toggleAddressInput(false));

    el.btnCopyPath.addEventListener('click', () => {
      navigator.clipboard.writeText(state.currentPath);
      el.btnCopyPath.style.color = '#38bdf8';
      setTimeout(() => el.btnCopyPath.style.color = '', 1000);
      showToast('Folder path copied to clipboard', 'info');
    });

    // Ribbon Actions
    el.btnNewTab.addEventListener('click', () => createTab(state.currentPath));
    if (el.btnNewWindow) el.btnNewWindow.addEventListener('click', () => openNewWindow(state.currentPath));
    if (el.tabsContainer) {
      el.tabsContainer.addEventListener('dblclick', (e) => {
        if (e.target.closest('.tab-item, .tab-close, button, input')) return;
        createTab(state.currentPath);
      });
    }
    if (el.btnToggleDualPane) el.btnToggleDualPane.addEventListener('click', toggleDualPane);
    if (el.btnCloseSecondary) el.btnCloseSecondary.addEventListener('click', toggleDualPane);
    if (el.btnSecondaryUp) el.btnSecondaryUp.addEventListener('click', secondaryGoUp);
    if (el.btnSecondarySwap) el.btnSecondarySwap.addEventListener('click', swapPanes);

    // New File Menu Dropdown
    el.btnNewFileMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el.sortDropdown) el.sortDropdown.classList.remove('open');
      if (el.searchPopover) el.searchPopover.style.display = 'none';
      el.newFileDropdown.classList.toggle('open');
    });

    document.querySelectorAll('#newFileDropdown .dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        el.newFileDropdown.classList.remove('open');
        if (item.dataset.action === 'new-window') {
          openNewWindow(state.currentPath);
        } else if (item.dataset.action === 'new-tab') {
          createTab(state.currentPath);
        } else {
          promptCreateFile(item.dataset.template);
        }
      });
    });

    el.btnNewFolder.addEventListener('click', promptCreateFolder);

    function performCopy() {
      const paths = (state.selectedIndices && state.selectedIndices.size > 0)
        ? Array.from(state.selectedIndices).map(idx => state.items[idx]?.path).filter(Boolean)
        : (state.activeItem ? [state.activeItem.path] : []);
      if (paths.length === 0) {
        showToast('Select an item to copy', 'info');
        return;
      }
      document.querySelectorAll('.item-cut').forEach(node => node.classList.remove('item-cut'));
      state.clipboard = { action: 'copy', paths };
      showToast(`Copied ${paths.length} item${paths.length > 1 ? 's' : ''} to clipboard`, 'info');
      updateToolbarActionStates();
    }

    function performCut() {
      const paths = (state.selectedIndices && state.selectedIndices.size > 0)
        ? Array.from(state.selectedIndices).map(idx => state.items[idx]?.path).filter(Boolean)
        : (state.activeItem ? [state.activeItem.path] : []);
      if (paths.length === 0) {
        showToast('Select an item to cut', 'info');
        return;
      }
      document.querySelectorAll('.item-cut').forEach(node => node.classList.remove('item-cut'));
      state.clipboard = { action: 'cut', paths };
      // Visually mark cut elements
      paths.forEach(p => {
        const idx = state.items ? state.items.findIndex(it => it.path === p) : -1;
        if (idx !== -1) {
          const itemEl = el.primaryViewport.querySelector(`[data-index="${idx}"]`);
          if (itemEl) itemEl.classList.add('item-cut');
        }
      });
      showToast(`Cut ${paths.length} item${paths.length > 1 ? 's' : ''} to clipboard`, 'info');
      updateToolbarActionStates();
    }

    async function performPaste() {
      if (!state.clipboard || !state.clipboard.paths || state.clipboard.paths.length === 0) {
        showToast('Clipboard is empty', 'info');
        return;
      }
      const count = state.clipboard.paths.length;
      if (state.clipboard.action === 'cut') {
        const res = await api.moveItems(state.clipboard.paths, state.currentPath);
        if (res && res.error) {
          showErrorModal('Error Moving Items', res.error);
        } else {
          state.clipboard = { action: null, paths: [] };
          document.querySelectorAll('.item-cut').forEach(node => node.classList.remove('item-cut'));
          showToast(`Moved ${count} item${count > 1 ? 's' : ''}`, 'success');
        }
      } else {
        const res = await api.copyItems(state.clipboard.paths, state.currentPath);
        if (res && res.error) {
          showErrorModal('Error Copying Items', res.error);
        } else {
          showToast(`Pasted ${count} item${count > 1 ? 's' : ''}`, 'success');
        }
      }
      await navigateTo(state.currentPath, false);
      updateToolbarActionStates();
    }

    function cancelCutStaging() {
      if (state.clipboard && state.clipboard.action === 'cut') {
        state.clipboard = { action: null, paths: [] };
        document.querySelectorAll('.item-cut').forEach(node => node.classList.remove('item-cut'));
        updateToolbarActionStates();
        return true;
      }
      return false;
    }

    function handleToolbarRename() {
      if (state.selectedIndices && state.selectedIndices.size > 1) {
        openBatchRenameModal();
        return;
      }
      let item = state.activeItem;
      if (!item && state.selectedIndices && state.selectedIndices.size === 1) {
        item = state.items[Array.from(state.selectedIndices)[0]];
      }
      if (!item && state.viewMode === 'columns') {
        const col = state.millerColumns[state.activeColumnIndex] || state.millerColumns[state.millerColumns.length - 1];
        item = col ? col.selectedItem : null;
      }
      if (!item) {
        showToast('Select an item to rename', 'info');
        return;
      }
      promptRenameItem(item);
    }

    function handleToolbarDelete() {
      let selectedCount = (state.selectedIndices && state.selectedIndices.size > 0)
        ? state.selectedIndices.size
        : (state.activeItem ? 1 : 0);
      if (state.viewMode === 'columns' && !selectedCount) {
        const col = state.millerColumns[state.activeColumnIndex] || state.millerColumns[state.millerColumns.length - 1];
        if (col && col.selectedItem) {
          selectedCount = 1;
          state.activeItem = col.selectedItem;
        }
      }
      if (selectedCount === 0) {
        showToast('Select an item to delete', 'info');
        return;
      }
      if (state.currentPath === 'Recycle Bin' || state.currentPath === 'recycle-bin') {
        handleDeletePermanentlyItem(state.activeItem);
        return;
      }
      confirmDeleteItem(state.activeItem);
    }

    function handleToolbarQuickLook() {
      let item = state.activeItem;
      if (!item) {
        if (state.viewMode === 'columns') {
          const col = state.millerColumns[state.activeColumnIndex] || state.millerColumns[state.millerColumns.length - 1];
          item = col ? col.selectedItem : null;
        } else if (state.selectedIndices && state.selectedIndices.size > 0) {
          item = state.items[Array.from(state.selectedIndices)[0]];
        }
      }
      if (!item) {
        showToast('Select an item to preview (or press Space)', 'info');
        return;
      }
      openQuickLook(item);
    }

    async function handleToolbarTag() {
      let item = state.activeItem;
      if (!item && state.selectedIndices && state.selectedIndices.size > 0) {
        item = state.items[Array.from(state.selectedIndices)[0]];
      }
      if (!item && state.viewMode === 'columns') {
        const col = state.millerColumns[state.activeColumnIndex] || state.millerColumns[state.millerColumns.length - 1];
        item = col ? col.selectedItem : null;
      }
      if (!item) {
        showToast('Select a file or folder to tag', 'info');
        return;
      }
      const colors = ['', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'];
      const currentTag = state.tags[item.path] || '';
      const nextIdx = (colors.indexOf(currentTag) + 1) % colors.length;
      const newTag = colors[nextIdx];
      state.tags = await api.setTag(item.path, newTag);
      renderCurrentView();
      showToast(newTag ? `Tag set to ${newTag.toUpperCase()}` : 'Tag removed', 'info');
      updateToolbarActionStates();
    }

    // Type-Ahead Instant Search / Jump Buffer
    state.typeaheadBuffer = '';
    state.typeaheadTimer = null;

    function handleTypeaheadKey(char) {
      if (!state.items || state.items.length === 0) return false;
      if (!/^[a-zA-Z0-9_\-\.\s]$/.test(char)) return false;

      clearTimeout(state.typeaheadTimer);
      state.typeaheadTimer = setTimeout(() => {
        state.typeaheadBuffer = '';
      }, 650);

      state.typeaheadBuffer += char.toLowerCase();

      // Check if repeated single letter (e.g. typing 'd' then 'd')
      const isSingleRepeat = state.typeaheadBuffer.length > 1 &&
        state.typeaheadBuffer.split('').every(c => c === state.typeaheadBuffer[0]);

      let targetIdx = -1;

      if (isSingleRepeat) {
        const searchLetter = state.typeaheadBuffer[0];
        const startIdx = state.activeItem ? state.items.findIndex(it => it.path === state.activeItem.path) : -1;
        // Find next item starting with searchLetter after startIdx
        for (let i = startIdx + 1; i < state.items.length; i++) {
          if (state.items[i].name.toLowerCase().startsWith(searchLetter)) {
            targetIdx = i;
            break;
          }
        }
        // Wrap around to start if not found after startIdx
        if (targetIdx === -1) {
          for (let i = 0; i <= startIdx; i++) {
            if (state.items[i].name.toLowerCase().startsWith(searchLetter)) {
              targetIdx = i;
              break;
            }
          }
        }
      } else {
        // Find first item starting with buffer
        targetIdx = state.items.findIndex(it => it.name.toLowerCase().startsWith(state.typeaheadBuffer));
        // Fallback: search substring match if prefix didn't match
        if (targetIdx === -1 && state.typeaheadBuffer.length > 1) {
          targetIdx = state.items.findIndex(it => it.name.toLowerCase().includes(state.typeaheadBuffer));
        }
      }

      if (targetIdx !== -1) {
        selectItemByIndex(targetIdx);
        return true;
      }
      return false;
    }

    // Clipboard operations
    el.btnCut.addEventListener('click', performCut);
    el.btnCopy.addEventListener('click', performCopy);
    el.btnPaste.addEventListener('click', performPaste);

    el.btnRename.addEventListener('click', handleToolbarRename);
    el.btnDelete.addEventListener('click', handleToolbarDelete);
    el.btnQuickLook.addEventListener('click', handleToolbarQuickLook);
    el.btnTerminal.addEventListener('click', async () => {
      showToast('Opening terminal...', 'info');
      const res = await api.openTerminal(state.currentPath, state.terminalChoice);
      if (res && res.error) showToast(`Terminal error: ${res.error}`, 'error');
    });
    if (el.btnToggleHidden) {
      el.btnToggleHidden.addEventListener('click', toggleHiddenFiles);
    }

    // View Switchers
    el.btnViewColumns.addEventListener('click', () => setViewMode('columns'));
    el.btnViewList.addEventListener('click', () => setViewMode('list'));
    el.btnViewGrid.addEventListener('click', () => setViewMode('grid'));
    if (el.btnViewGallery) {
      el.btnViewGallery.addEventListener('click', () => setViewMode('gallery'));
    }

    // Toggle Right Preview Pane / Inspector
    if (el.btnTogglePreviewPane) {
      el.btnTogglePreviewPane.addEventListener('click', togglePreviewPane);
    }
    if (el.btnClosePreviewPane) {
      el.btnClosePreviewPane.addEventListener('click', togglePreviewPane);
    }

    // Group & Sort Dropdown
    if (el.btnSortMenu && el.sortDropdown) {
      el.btnSortMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        if (el.newFileDropdown) el.newFileDropdown.classList.remove('open');
        if (el.searchPopover) el.searchPopover.style.display = 'none';

        // Update active checkmarks on open
        document.querySelectorAll('#sortDropdown .dropdown-item[data-sort]').forEach(item => {
          item.classList.toggle('active', item.dataset.sort === state.sortField);
        });
        document.querySelectorAll('#sortDropdown .dropdown-item[data-sort-dir]').forEach(item => {
          const isAsc = item.dataset.sortDir === 'asc';
          item.classList.toggle('active', isAsc === state.sortAsc);
        });
        document.querySelectorAll('#sortDropdown .dropdown-item[data-group]').forEach(item => {
          item.classList.toggle('active', item.dataset.group === (state.groupBy || 'none'));
        });

        el.sortDropdown.classList.toggle('open');
      });

      document.querySelectorAll('#sortDropdown .dropdown-item[data-sort], #sortDropdown .dropdown-item[data-sort-dir], #sortDropdown .dropdown-item[data-group]').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          el.sortDropdown.classList.remove('open');
          if (item.dataset.sort) {
            state.sortField = item.dataset.sort;
            sortCurrentItems();
            renderCurrentView();
            showToast(`Sorted by ${state.sortField} (${state.sortAsc ? 'Ascending' : 'Descending'})`, 'info');
          } else if (item.dataset.sortDir) {
            state.sortAsc = item.dataset.sortDir === 'asc';
            sortCurrentItems();
            renderCurrentView();
            showToast(`Sorted by ${state.sortField} (${state.sortAsc ? 'Ascending' : 'Descending'})`, 'info');
          } else if (item.dataset.group) {
            setGroupBy(item.dataset.group);
          }
        });
      });
    }

    // Sidebar Toggle Button & Responsive Drawer
    if (el.btnToggleSidebar) {
      el.btnToggleSidebar.addEventListener('click', () => toggleSidebar());
    }
    if (el.sidebarBackdrop) {
      el.sidebarBackdrop.addEventListener('click', () => toggleSidebar(false));
    }
    // Sidebar Section Accordion Collapsing
    document.querySelectorAll('.sidebar-section-header[data-toggle-section]').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('#btnAddPinCurrent')) return;
        const sectionName = header.dataset.toggleSection;
        const section = header.closest('.sidebar-section');
        if (!section) return;
        const isCollapsed = section.classList.toggle('collapsed');
        try {
          localStorage.setItem(`myfiles_section_${sectionName}_collapsed`, String(isCollapsed));
        } catch (err) {}
      });
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && el.sidebar && el.sidebar.classList.contains('open-mobile')) {
        toggleSidebar(false);
      }
    });

    // Sidebar & Inspector Resizers
    if (el.sidebarResizer) {
      let isResizing = false;
      el.sidebarResizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      });
      window.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        if (el.mainLayout.classList.contains('sidebar-collapsed')) {
          el.mainLayout.classList.remove('sidebar-collapsed');
          if (el.btnToggleSidebar) {
            el.btnToggleSidebar.classList.add('active');
            el.btnToggleSidebar.title = 'Collapse sidebar (Ctrl+B)';
          }
        }
        const w = Math.max(160, Math.min(420, e.clientX));
        el.sidebar.style.width = w + 'px';
      });
      window.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });
      el.sidebarResizer.addEventListener('dblclick', () => {
        toggleSidebar();
      });
    }

    if (el.previewPaneResizer) {
      let isResizingPP = false;
      el.previewPaneResizer.addEventListener('mousedown', (e) => {
        isResizingPP = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      });
      window.addEventListener('mousemove', (e) => {
        if (!isResizingPP) return;
        const w = Math.max(240, Math.min(520, window.innerWidth - e.clientX));
        el.previewPane.style.width = w + 'px';
      });
      window.addEventListener('mouseup', () => {
        if (isResizingPP) {
          isResizingPP = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });
    }

    // Dual Pane Split Divider Resizer
    if (el.paneDivider && el.panesContainer && el.primaryPane && el.secondaryPane) {
      let isResizingPane = false;
      el.paneDivider.addEventListener('mousedown', () => {
        isResizingPane = true;
        el.paneDivider.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      });
      window.addEventListener('mousemove', (e) => {
        if (!isResizingPane || !state.dualPaneActive) return;
        const rect = el.panesContainer.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        const minW = 200;
        const maxW = rect.width - minW;
        if (relativeX >= minW && relativeX <= maxW) {
          el.primaryPane.style.flex = `0 0 ${relativeX}px`;
          el.secondaryPane.style.flex = `1 1 auto`;
        }
      });
      window.addEventListener('mouseup', () => {
        if (isResizingPane) {
          isResizingPane = false;
          el.paneDivider.classList.remove('resizing');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });
    }

    // Cross-Pane Drag & Drop
    if (el.secondaryViewport) {
      el.secondaryViewport.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
        el.secondaryViewport.classList.add('drop-target');
      });
      el.secondaryViewport.addEventListener('dragleave', (e) => {
        if (!el.secondaryViewport.contains(e.relatedTarget)) {
          el.secondaryViewport.classList.remove('drop-target');
        }
      });
      el.secondaryViewport.addEventListener('drop', async (e) => {
        el.secondaryViewport.classList.remove('drop-target');
        if (e.target.closest('.list-row') || e.target.closest('.grid-item') || e.target.closest('.column-item')) {
          return;
        }
        const didDrop = await handleDroppedItems(e, state.secondaryPath, 'copy');
        if (didDrop) {
          loadSecondaryPane(state.secondaryPath);
        }
      });
      el.secondaryViewport.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.list-row') || e.target.closest('.grid-item') || e.target.closest('.column-item')) return;
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, null);
      });
    }

    if (el.primaryViewport) {
      el.primaryViewport.addEventListener('dragenter', (e) => {
        e.preventDefault();
        el.primaryViewport.classList.add('drop-target');
      });
      el.primaryViewport.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
        el.primaryViewport.classList.add('drop-target');
      });
      el.primaryViewport.addEventListener('dragleave', (e) => {
        if (!el.primaryViewport.contains(e.relatedTarget)) {
          el.primaryViewport.classList.remove('drop-target');
        }
      });
      el.primaryViewport.addEventListener('drop', async (e) => {
        el.primaryViewport.classList.remove('drop-target');
        if (e.target.closest('.list-row') || e.target.closest('.grid-item') || e.target.closest('.column-item')) {
          return;
        }
        const didDrop = await handleDroppedItems(e, state.currentPath, 'copy');
        if (didDrop) {
          await navigateTo(state.currentPath, false);
        }
      });

      // Background Context Menu for empty space
      el.primaryViewport.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.grid-item') || e.target.closest('.list-row') || e.target.closest('.column-item')) {
          return;
        }
        e.preventDefault();
        state.selectedIndices.clear();
        state.activeItem = null;
        updateStatusBar();
        showContextMenu(e.clientX, e.clientY, null);
      });
    }

    // Transmission Gear Slider for Grid Icon & Thumbnail Scaling
    if (el.gridZoomSlider) {
      el.gridZoomSlider.addEventListener('input', (e) => {
        applyGear(e.target.value);
      });
    }

    if (el.gearZoomDown) {
      el.gearZoomDown.addEventListener('click', (e) => {
        e.preventDefault();
        applyGear((state.currentGear || 2) - 1);
      });
    }

    if (el.gearZoomUp) {
      el.gearZoomUp.addEventListener('click', (e) => {
        e.preventDefault();
        applyGear((state.currentGear || 2) + 1);
      });
    }

    // Direct snap clicking on gear ticks
    document.querySelectorAll('.gear-tick').forEach(tick => {
      tick.addEventListener('click', (e) => {
        e.stopPropagation();
        const g = parseInt(tick.dataset.gear, 10);
        if (g) applyGear(g);
      });
    });

    // Ergonomic Zoom: Ctrl + Mouse Wheel zooming when over grid view
    if (el.primaryViewport) {
      el.primaryViewport.addEventListener('wheel', (e) => {
        if (e.ctrlKey && state.viewMode === 'grid') {
          e.preventDefault();
          const curr = state.currentGear || 2;
          if (e.deltaY < 0) {
            applyGear(curr + 1);
          } else if (e.deltaY > 0) {
            applyGear(curr - 1);
          }
        }
      }, { passive: false });
    }

    // Search Controls
    el.searchInput.addEventListener('input', (e) => handleSearchInput(e.target.value));
    el.searchInput.addEventListener('keydown', (e) => {
      // Keyboard navigation inside Search Popover (Reference 5)
      if (el.searchPopover && el.searchPopover.style.display !== 'none') {
        const popItems = Array.from(el.searchPopover.querySelectorAll('.search-pop-item')).filter(it => it.offsetParent !== null);
        if (popItems.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const currIdx = popItems.findIndex(it => it.classList.contains('active'));
            popItems.forEach(it => it.classList.remove('active'));
            const nextIdx = (currIdx + 1) % popItems.length;
            popItems[nextIdx].classList.add('active');
            return;
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const currIdx = popItems.findIndex(it => it.classList.contains('active'));
            popItems.forEach(it => it.classList.remove('active'));
            const nextIdx = currIdx <= 0 ? popItems.length - 1 : currIdx - 1;
            popItems[nextIdx].classList.add('active');
            return;
          } else if (e.key === 'Enter') {
            const activePopItem = popItems.find(it => it.classList.contains('active'));
            if (activePopItem) {
              e.preventDefault();
              activePopItem.click();
              return;
            }
          }
        }
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const q = el.searchInput.value.trim();
        if (q) {
          if (el.searchPopover) el.searchPopover.style.display = 'none';
          executeSearch(q);
        }
      } else if (e.key === 'Escape') {
        if (el.searchPopover) el.searchPopover.style.display = 'none';
        el.searchInput.value = '';
        handleSearchInput('');
        el.searchInput.blur();
      }
    });
    el.btnSearchClear.addEventListener('click', () => {
      el.searchInput.value = '';
      handleSearchInput('');
    });
    // Search Attribute Dropdown (macOS Reference 3)
    if (el.btnSearchTypeToggle && el.searchAttrDropdown) {
      el.btnSearchTypeToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = el.searchAttrDropdown.style.display === 'flex' || el.searchAttrDropdown.style.display === 'block';
        if (el.searchPopover) el.searchPopover.style.display = 'none';
        if (el.sortDropdown) el.sortDropdown.classList.remove('open');
        if (el.newFileDropdown) el.newFileDropdown.classList.remove('open');
        if (el.moreActionsDropdown) el.moreActionsDropdown.classList.remove('open');
        el.searchAttrDropdown.style.display = isOpen ? 'none' : 'flex';
      });

      el.searchAttrDropdown.querySelectorAll('.search-attr-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const attr = item.dataset.attr;
          setSearchAttribute(attr);
          el.searchAttrDropdown.style.display = 'none';
        });
      });
    }

    function setSearchAttribute(attr) {
      state.searchAttr = attr;
      if (el.searchAttrDropdown) {
        el.searchAttrDropdown.querySelectorAll('.search-attr-item').forEach(elItem => {
          const isActive = elItem.dataset.attr === attr;
          elItem.classList.toggle('active', isActive);
          const checkSpan = elItem.querySelector('.attr-check');
          if (checkSpan) checkSpan.textContent = isActive ? '✓' : '';
        });
      }

      const labelMap = {
        name: 'Name',
        content: 'Contents',
        mtime: 'Modified',
        ctime: 'Created',
        tags: 'Tags',
        visibility: 'Visibility',
        kind: 'Kind'
      };

      if (el.searchTypeLabel) {
        el.searchTypeLabel.textContent = labelMap[attr] || 'Name';
      }

      if (attr === 'visibility') {
        toggleHiddenFiles();
        showToast(state.showHidden ? 'Showing hidden files' : 'Hiding hidden files');
        return;
      }

      if (attr === 'kind') {
        state.searchType = 'kind';
        if (el.searchPopover) el.searchPopover.style.display = 'block';
        if (el.searchInput) {
          el.searchInput.placeholder = 'Filter by kind (image, doc, code)...';
          el.searchInput.focus();
        }
        return;
      }

      if (attr === 'tags') {
        state.searchType = 'tags';
        if (el.searchInput) {
          el.searchInput.placeholder = 'Filter by tag (red, blue...)...';
          el.searchInput.focus();
        }
        if (el.searchInput && el.searchInput.value.trim()) {
          executeSearch(el.searchInput.value.trim());
        }
        return;
      }

      if (attr === 'mtime') {
        state.searchType = 'mtime';
        state.sortField = 'mtime';
        state.sortAsc = false;
        sortCurrentItems();
        renderCurrentView();
        if (el.searchInput) {
          el.searchInput.placeholder = 'Search files by modified date...';
        }
        return;
      }

      if (attr === 'ctime') {
        state.searchType = 'ctime';
        state.sortField = 'mtime';
        state.sortAsc = false;
        sortCurrentItems();
        renderCurrentView();
        if (el.searchInput) {
          el.searchInput.placeholder = 'Search files by created date...';
        }
        return;
      }

      if (attr === 'content') {
        state.searchType = 'content';
        if (el.searchInput) {
          el.searchInput.placeholder = 'Search contents inside files...';
          if (el.searchInput.value.trim()) {
            executeSearch(el.searchInput.value.trim());
          }
        }
        return;
      }

      state.searchType = 'name';
      if (el.searchInput) {
        el.searchInput.placeholder = 'Search... (Ctrl+F)';
        if (el.searchInput.value.trim()) {
          executeSearch(el.searchInput.value.trim());
        }
      }
    }

    // Action Capsule Handlers (macOS Reference 1 & 5)
    if (el.btnShareItem) {
      el.btnShareItem.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = state.activeItem || (state.viewMode === 'columns' ? state.millerColumns[state.activeColumnIndex]?.selectedItem : null);
        openShareModal(item);
      });
    }

    if (el.btnToolbarTag) {
      el.btnToolbarTag.addEventListener('click', (e) => {
        e.stopPropagation();
        handleToolbarTag();
      });
    }


    if (el.btnToolbarMore && el.moreActionsDropdown) {
      el.btnToolbarMore.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = el.moreActionsDropdown.classList.contains('open');
        if (el.sortDropdown) el.sortDropdown.classList.remove('open');
        if (el.newFileDropdown) el.newFileDropdown.classList.remove('open');
        if (el.searchAttrDropdown) el.searchAttrDropdown.style.display = 'none';
        if (el.searchPopover) el.searchPopover.style.display = 'none';
        el.moreActionsDropdown.classList.toggle('open', !isOpen);
      });
    }

    if (el.moreActGetInfo) {
      el.moreActGetInfo.addEventListener('click', () => {
        if (el.moreActionsDropdown) el.moreActionsDropdown.classList.remove('open');
        openGetInfoModal();
      });
    }
    if (el.moreActGoToFolder) {
      el.moreActGoToFolder.addEventListener('click', () => {
        if (el.moreActionsDropdown) el.moreActionsDropdown.classList.remove('open');
        openGoToFolderModal();
      });
    }
    if (el.moreActNewFolderWithSelection) {
      el.moreActNewFolderWithSelection.addEventListener('click', () => {
        if (el.moreActionsDropdown) el.moreActionsDropdown.classList.remove('open');
        createNewFolderWithSelection();
      });
    }

    if (el.moreActFindDuplicates) {
      el.moreActFindDuplicates.addEventListener('click', () => {
        if (el.moreActionsDropdown) el.moreActionsDropdown.classList.remove('open');
        openDeduplicationModal();
      });
    }

    if (el.moreActBatchRename) {
      el.moreActBatchRename.addEventListener('click', () => {
        if (el.moreActionsDropdown) el.moreActionsDropdown.classList.remove('open');
        openBatchRenameModal();
      });
    }

    if (el.moreActCut) {
      el.moreActCut.addEventListener('click', () => {
        if (el.moreActionsDropdown) el.moreActionsDropdown.classList.remove('open');
        performCut();
      });
    }
    if (el.moreActCopy) {
      el.moreActCopy.addEventListener('click', () => {
        if (el.moreActionsDropdown) el.moreActionsDropdown.classList.remove('open');
        performCopy();
      });
    }
    if (el.moreActPaste) {
      el.moreActPaste.addEventListener('click', () => {
        if (el.moreActionsDropdown) el.moreActionsDropdown.classList.remove('open');
        performPaste();
      });
    }
    if (el.moreActRename) {
      el.moreActRename.addEventListener('click', () => {
        if (el.moreActionsDropdown) el.moreActionsDropdown.classList.remove('open');
        handleToolbarRename();
      });
    }
    if (el.moreActDelete) {
      el.moreActDelete.addEventListener('click', () => {
        if (el.moreActionsDropdown) el.moreActionsDropdown.classList.remove('open');
        handleToolbarDelete();
      });
    }
    if (el.moreActTerminal) {
      el.moreActTerminal.addEventListener('click', async () => {
        if (el.moreActionsDropdown) el.moreActionsDropdown.classList.remove('open');
        showToast('Opening terminal...', 'info');
        const res = await api.openTerminal(state.currentPath, state.terminalChoice);
        if (res && res.error) showToast(`Terminal error: ${res.error}`, 'error');
      });
    }
    if (el.moreActReveal) {
      el.moreActReveal.addEventListener('click', () => {
        if (el.moreActionsDropdown) el.moreActionsDropdown.classList.remove('open');
        const targetPath = state.activeItem ? state.activeItem.path : state.currentPath;
        if (api && api.openItem) {
          api.openItem(targetPath);
        } else {
          showToast(`Opening: ${targetPath}`);
        }
      });
    }
    if (el.moreActShare) {
      el.moreActShare.addEventListener('click', () => {
        if (el.moreActionsDropdown) el.moreActionsDropdown.classList.remove('open');
        const item = state.activeItem || (state.viewMode === 'columns' ? state.millerColumns[state.activeColumnIndex]?.selectedItem : null);
        openShareModal(item);
      });
    }

    // Search Popover Events (Reference Image 5)
    if (el.searchPopFilename) {
      el.searchPopFilename.addEventListener('click', () => {
        if (el.searchPopover) el.searchPopover.style.display = 'none';
        state.searchType = 'name';
        el.searchTypeLabel.textContent = 'Name';
        executeSearch(el.searchInput.value.trim());
      });
    }
    if (el.searchPopContent) {
      el.searchPopContent.addEventListener('click', () => {
        if (el.searchPopover) el.searchPopover.style.display = 'none';
        state.searchType = 'content';
        el.searchTypeLabel.textContent = 'Content';
        executeSearch(el.searchInput.value.trim());
      });
    }
    document.querySelectorAll('#searchPopover [data-filter-kind]').forEach(item => {
      item.addEventListener('click', () => {
        if (el.searchPopover) el.searchPopover.style.display = 'none';
        filterByKind(item.dataset.filterKind);
      });
    });

    // Toolbar & Titlebar & Sidebar Settings Buttons & Preferences Modal
    if (el.btnToolbarSettings) {
      el.btnToolbarSettings.addEventListener('click', openSettingsModal);
    }
    if (el.btnTitlebarSettings) {
      el.btnTitlebarSettings.addEventListener('click', openSettingsModal);
    }
    if (el.sidebarSettings) {
      el.sidebarSettings.addEventListener('click', openSettingsModal);
    }
    if (el.moreActPreferences) {
      el.moreActPreferences.addEventListener('click', () => {
        if (el.moreActionsDropdown) el.moreActionsDropdown.classList.remove('open');
        openSettingsModal();
      });
    }
    if (el.ctxPreferences) {
      el.ctxPreferences.addEventListener('click', () => {
        hideContextMenu();
        openSettingsModal();
      });
    }
    if (el.btnCloseSettingsModal) {
      el.btnCloseSettingsModal.addEventListener('click', closeSettingsModal);
    }
    if (el.btnSettingsDone) {
      el.btnSettingsDone.addEventListener('click', closeSettingsModal);
    }

    // OTA Software Updates
    const btnCheckUpdates = document.getElementById('btnCheckForUpdates');
    const btnCheckText = document.getElementById('btnCheckForUpdatesText');
    const btnRestart = document.getElementById('btnRestartAndUpdate');
    const updateStatusText = document.getElementById('settingsUpdateStatusText');

    if (btnCheckUpdates) {
      btnCheckUpdates.addEventListener('click', async () => {
        if (btnCheckUpdates.disabled) return;
        btnCheckUpdates.disabled = true;
        if (btnCheckText) btnCheckText.textContent = 'Checking...';
        if (updateStatusText) updateStatusText.textContent = 'Checking GitHub Releases for updates...';

        try {
          const res = await api.checkForUpdates();
          if (res && res.status === 'dev-mode') {
            if (updateStatusText) updateStatusText.textContent = 'Installed version: v1.1.0 · Over-the-air updates active in packaged builds.';
            showToast('Auto-updates run in packaged installer builds', 'info');
          } else if (res && res.status === 'error') {
            if (updateStatusText) updateStatusText.textContent = `Update check failed: ${res.message || 'Network error'}`;
            showToast('Unable to check for updates', 'error');
          }
        } catch (err) {
          if (updateStatusText) updateStatusText.textContent = `Update check failed: ${err.message}`;
        } finally {
          setTimeout(() => {
            btnCheckUpdates.disabled = false;
            if (btnCheckText) btnCheckText.textContent = 'Check for Updates';
          }, 2000);
        }
      });
    }

    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        showToast('Restarting to apply update...', 'info');
        api.quitAndInstallUpdate();
      });
    }

    api.onUpdateStatus((data) => {
      if (!data) return;
      if (data.status === 'checking') {
        if (updateStatusText) updateStatusText.textContent = 'Checking for updates...';
      } else if (data.status === 'available') {
        if (updateStatusText) updateStatusText.textContent = `Downloading update v${data.version}...`;
        showToast(`Update v${data.version} found, downloading in background...`, 'info');
      } else if (data.status === 'downloading') {
        if (updateStatusText) updateStatusText.textContent = `Downloading update: ${data.percent}%`;
      } else if (data.status === 'ready') {
        if (updateStatusText) updateStatusText.textContent = `Update v${data.version} is downloaded and ready to install.`;
        if (btnRestart) btnRestart.style.display = 'inline-flex';
        showToast(`MyFiles v${data.version} ready to install`, 'success');
      } else if (data.status === 'up-to-date') {
        if (updateStatusText) updateStatusText.textContent = `MyFiles is up to date (v${data.version || '1.1.0'}).`;
        showToast('MyFiles is up to date', 'success');
      } else if (data.status === 'error') {
        if (updateStatusText) updateStatusText.textContent = `Update error: ${data.message}`;
      }
    });

    // Settings Tabs Switching
    if (el.settingsTabBar) {
      el.settingsTabBar.querySelectorAll('.settings-tab-btn').forEach(tabBtn => {
        tabBtn.addEventListener('click', () => {
          el.settingsTabBar.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
          tabBtn.classList.add('active');
          const targetTab = tabBtn.dataset.tab;
          const panels = {
            general: el.settingsPanelGeneral,
            appearance: el.settingsPanelAppearance,
            sidebar: el.settingsPanelSidebar,
            shortcuts: el.settingsPanelShortcuts,
            media: el.settingsPanelMedia,
            system: el.settingsPanelSystem
          };
          Object.entries(panels).forEach(([name, panelEl]) => {
            if (panelEl) panelEl.classList.toggle('active', name === targetTab);
          });
          if (targetTab === 'system') {
            refreshDefaultFileManagerStatus();
          }
        });
      });
    }

    // General: Startup Location
    if (el.settingsStartupFolder) {
      el.settingsStartupFolder.addEventListener('change', (e) => {
        state.startupFolder = e.target.value;
        try { localStorage.setItem('myfiles_startup_folder', state.startupFolder); } catch(err) {}
        if (el.settingsStartupCustomWrap) {
          el.settingsStartupCustomWrap.style.display = (state.startupFolder === 'custom') ? 'block' : 'none';
        }
        showToast(`Startup folder set to ${e.target.options[e.target.selectedIndex].text}`, 'info');
      });
    }
    if (el.settingsStartupCustom) {
      el.settingsStartupCustom.addEventListener('input', (e) => {
        state.startupFolderPath = e.target.value.trim();
        try { localStorage.setItem('myfiles_startup_custom', state.startupFolderPath); } catch(err) {}
      });
    }

    // General: Open Action (single or double click)
    if (el.settingsOpenAction) {
      el.settingsOpenAction.addEventListener('change', (e) => {
        state.openAction = e.target.value;
        try { localStorage.setItem('myfiles_open_action', state.openAction); } catch(err) {}
        showToast(state.openAction === 'single' ? 'Single-click to open enabled' : 'Double-click to open enabled', 'info');
      });
    }

    // General: Search Scope
    if (el.settingsSearchScope) {
      el.settingsSearchScope.addEventListener('change', (e) => {
        state.searchScope = e.target.value;
        try { localStorage.setItem('myfiles_search_scope', state.searchScope); } catch(err) {}
        showToast(state.searchScope === 'all' ? 'Search default set to Entire Drive' : 'Search default set to Current Folder', 'info');
      });
    }

    // General: Item Checkboxes
    if (el.settingsCheckboxes) {
      el.settingsCheckboxes.addEventListener('change', (e) => {
        state.itemCheckboxes = e.target.checked;
        try { localStorage.setItem('myfiles_checkboxes', String(state.itemCheckboxes)); } catch(err) {}
        if (el.btnToggleCheckboxes) {
          el.btnToggleCheckboxes.classList.toggle('active', state.itemCheckboxes);
        }
        if (state.viewMode === 'list') renderListView();
        else if (state.viewMode === 'grid') renderGridView();
        showToast(state.itemCheckboxes ? 'Item checkboxes enabled' : 'Item checkboxes disabled', 'info');
      });
    }

    // General: Confirm Delete
    if (el.settingsConfirmDelete) {
      el.settingsConfirmDelete.addEventListener('change', (e) => {
        state.confirmDelete = e.target.checked;
        try { localStorage.setItem('myfiles_confirm_delete', String(state.confirmDelete)); } catch(err) {}
        showToast(state.confirmDelete ? 'Delete confirmation prompt enabled' : 'Delete confirmation prompt disabled', 'info');
      });
    }

    // Appearance: Theme Mode
    if (el.settingsThemeCtrl) {
      el.settingsThemeCtrl.querySelectorAll('.theme-opt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          setTheme(btn.dataset.theme);
          updateSettingsThemeCtrl();
        });
      });
    }

    // Appearance: Accent Swatches
    if (el.settingsAccentSwatches) {
      el.settingsAccentSwatches.querySelectorAll('.settings-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
          setAccent(btn.dataset.accent);
          showToast(`Accent color set to ${btn.title || btn.dataset.accent}`, 'info');
        });
      });
    }

    // Appearance: Density
    if (el.settingsDensity) {
      el.settingsDensity.addEventListener('change', (e) => {
        setCompactMode(e.target.value === 'compact');
        showToast(state.compactMode ? 'Compact density layout enabled' : 'Standard density layout enabled', 'info');
      });
    }

    // Appearance: Default View Mode
    if (el.settingsDefaultView) {
      el.settingsDefaultView.addEventListener('change', (e) => {
        setViewMode(e.target.value);
        try { localStorage.setItem('myfiles_viewmode', e.target.value); } catch(err) {}
        showToast(`Default view mode set to ${e.target.value.toUpperCase()}`, 'info');
      });
    }

    // Appearance: Thumbnail Size
    if (el.settingsThumbSize) {
      el.settingsThumbSize.addEventListener('change', (e) => {
        setThumbSize(e.target.value);
        showToast(`Thumbnail size set to ${e.target.value.toUpperCase()}`, 'info');
      });
    }

    // Appearance: File Extensions
    if (el.settingsCheckExtensions) {
      el.settingsCheckExtensions.addEventListener('change', (e) => {
        state.showFileExtensions = e.target.checked;
        try { localStorage.setItem('myfiles_show_extensions', String(state.showFileExtensions)); } catch(err) {}
        if (state.viewMode === 'list') renderListView();
        else if (state.viewMode === 'grid') renderGridView();
        else if (state.viewMode === 'columns') renderMillerColumns();
        else if (state.viewMode === 'gallery') renderGalleryView();
        showToast(state.showFileExtensions ? 'File extensions will be displayed' : 'File extensions hidden', 'info');
      });
    }

    // Appearance: Hidden & System Files
    if (el.settingsCheckHidden) {
      el.settingsCheckHidden.addEventListener('change', () => {
        toggleHiddenFiles();
        el.settingsCheckHidden.checked = state.showHidden;
      });
    }

    // Media: Spacebar Quick Look
    if (el.settingsCheckQuickLook) {
      el.settingsCheckQuickLook.addEventListener('change', (e) => {
        state.enableQuickLook = e.target.checked;
        try { localStorage.setItem('myfiles_enable_ql', String(state.enableQuickLook)); } catch(err) {}
        showToast(state.enableQuickLook ? 'Spacebar Quick Look enabled' : 'Spacebar Quick Look disabled', 'info');
      });
    }

    // Media: Autoplay
    if (el.settingsCheckAutoplay) {
      el.settingsCheckAutoplay.addEventListener('change', (e) => {
        state.qlAutoplay = e.target.checked;
        try { localStorage.setItem('myfiles_ql_autoplay', String(state.qlAutoplay)); } catch(err) {}
        showToast(state.qlAutoplay ? 'Media auto-play enabled' : 'Media auto-play disabled', 'info');
      });
    }

    // Media: Loop
    if (el.settingsCheckLoop) {
      el.settingsCheckLoop.addEventListener('change', (e) => {
        state.qlLoop = e.target.checked;
        try { localStorage.setItem('myfiles_ql_loop', String(state.qlLoop)); } catch(err) {}
        showToast(state.qlLoop ? 'Media continuous loop enabled' : 'Media continuous loop disabled', 'info');
      });
    }

    // Media: VLC Integration
    if (el.settingsCheckVlc) {
      el.settingsCheckVlc.addEventListener('change', (e) => {
        state.useVlcMedia = e.target.checked;
        try { localStorage.setItem('myfiles_use_vlc', String(state.useVlcMedia)); } catch(err) {}
        showToast(state.useVlcMedia ? 'VLC external media player enabled' : 'VLC external media player disabled', 'info');
      });
    }

    // System: Make Default Windows File Manager
    if (el.settingsBtnDefault) {
      el.settingsBtnDefault.addEventListener('click', async () => {
        el.settingsBtnDefault.disabled = true;
        const originalText = el.settingsBtnDefault.textContent;
        el.settingsBtnDefault.textContent = 'Registering...';
        try {
          const res = await api.makeDefaultFileManager();
          if (res && res.success) {
            updateDefaultFileManagerButtons(true);
            showToast('MyFiles registered as default file manager!', 'success', 5000);
          } else {
            showToast(`Registration failed: ${res?.error || 'Unknown error'}`, 'error', 5000);
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'error', 5000);
        } finally {
          el.settingsBtnDefault.disabled = false;
          el.settingsBtnDefault.textContent = originalText;
        }
      });
    }

    // System: Restore Windows Explorer Default
    if (el.settingsBtnRestoreDefault) {
      el.settingsBtnRestoreDefault.addEventListener('click', async () => {
        el.settingsBtnRestoreDefault.disabled = true;
        const originalText = el.settingsBtnRestoreDefault.textContent;
        el.settingsBtnRestoreDefault.textContent = 'Restoring...';
        try {
          const res = await api.restoreDefaultFileManager();
          if (res && res.success) {
            updateDefaultFileManagerButtons(false);
            showToast('Windows Explorer restored as default file manager!', 'success', 5000);
          } else {
            showToast(`Restore failed: ${res?.error || 'Unknown error'}`, 'error', 5000);
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'error', 5000);
        } finally {
          el.settingsBtnRestoreDefault.disabled = false;
          el.settingsBtnRestoreDefault.textContent = originalText;
        }
      });
    }

    // System: Terminal Shell
    if (el.settingsTerminalShell) {
      el.settingsTerminalShell.addEventListener('change', (e) => {
        state.terminalChoice = e.target.value;
        try { localStorage.setItem('myfiles_terminal', state.terminalChoice); } catch(err) {}
        showToast(`Default terminal set to ${e.target.options[e.target.selectedIndex].text}`, 'info');
      });
    }

    // System: Checksum Algorithm
    if (el.settingsChecksumAlgo) {
      el.settingsChecksumAlgo.addEventListener('change', (e) => {
        state.checksumAlgorithm = e.target.value;
        try { localStorage.setItem('myfiles_checksum_algo', state.checksumAlgorithm); } catch(err) {}
        showToast(`Default checksum algorithm set to ${state.checksumAlgorithm.toUpperCase()}`, 'info');
      });
    }

    // General: Auto-Refresh
    if (el.settingsCheckAutoRefresh) {
      el.settingsCheckAutoRefresh.addEventListener('change', (e) => {
        state.autoRefreshOnFocus = e.target.checked;
        try { localStorage.setItem('myfiles_auto_refresh', String(state.autoRefreshOnFocus)); } catch(err) {}
        showToast(state.autoRefreshOnFocus ? 'Directory auto-refresh enabled' : 'Directory auto-refresh disabled', 'info');
      });
    }

    // General: Date Format Style
    if (el.settingsDateFormat) {
      el.settingsDateFormat.addEventListener('change', (e) => {
        state.dateFormat = e.target.value;
        try { localStorage.setItem('myfiles_date_format', state.dateFormat); } catch(err) {}
        if (state.viewMode === 'list') renderListView();
        else if (state.viewMode === 'columns') renderMillerColumns();
        else if (state.viewMode === 'gallery') renderGalleryView();
        showToast(`Timestamp format set to ${e.target.options[e.target.selectedIndex].text.split(' ')[0]}`, 'info');
      });
    }

    // Appearance: List View Columns
    if (el.settingsCheckColDate) {
      el.settingsCheckColDate.addEventListener('change', (e) => {
        state.colShowDate = e.target.checked;
        try { localStorage.setItem('myfiles_col_date', String(state.colShowDate)); } catch(err) {}
        if (state.viewMode === 'list') renderListView();
      });
    }
    if (el.settingsCheckColType) {
      el.settingsCheckColType.addEventListener('change', (e) => {
        state.colShowType = e.target.checked;
        try { localStorage.setItem('myfiles_col_type', String(state.colShowType)); } catch(err) {}
        if (state.viewMode === 'list') renderListView();
      });
    }
    if (el.settingsCheckColSize) {
      el.settingsCheckColSize.addEventListener('change', (e) => {
        state.colShowSize = e.target.checked;
        try { localStorage.setItem('myfiles_col_size', String(state.colShowSize)); } catch(err) {}
        if (state.viewMode === 'list') renderListView();
      });
    }
    if (el.settingsCheckColTag) {
      el.settingsCheckColTag.addEventListener('change', (e) => {
        state.colShowTag = e.target.checked;
        try { localStorage.setItem('myfiles_col_tag', String(state.colShowTag)); } catch(err) {}
        if (state.viewMode === 'list') renderListView();
      });
    }

    // Sidebar: Section Toggles
    if (el.settingsCheckSidebarRecents) {
      el.settingsCheckSidebarRecents.addEventListener('change', (e) => {
        state.sidebarShowRecents = e.target.checked;
        try { localStorage.setItem('myfiles_sb_recents', String(state.sidebarShowRecents)); } catch(err) {}
        applySidebarPreferences();
      });
    }
    if (el.settingsCheckSidebarFavorites) {
      el.settingsCheckSidebarFavorites.addEventListener('change', (e) => {
        state.sidebarShowFavorites = e.target.checked;
        try { localStorage.setItem('myfiles_sb_favorites', String(state.sidebarShowFavorites)); } catch(err) {}
        applySidebarPreferences();
      });
    }
    if (el.settingsCheckSidebarDrives) {
      el.settingsCheckSidebarDrives.addEventListener('change', (e) => {
        state.sidebarShowDrives = e.target.checked;
        try { localStorage.setItem('myfiles_sb_drives', String(state.sidebarShowDrives)); } catch(err) {}
        applySidebarPreferences();
      });
    }
    if (el.settingsCheckSidebarTags) {
      el.settingsCheckSidebarTags.addEventListener('change', (e) => {
        state.sidebarShowTags = e.target.checked;
        try { localStorage.setItem('myfiles_sb_tags', String(state.sidebarShowTags)); } catch(err) {}
        applySidebarPreferences();
      });
    }
    if (el.settingsTagVisibilityGrid) {
      el.settingsTagVisibilityGrid.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          const checked = Array.from(el.settingsTagVisibilityGrid.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.dataset.tag).filter(Boolean);
          state.visibleTags = checked;
          try { localStorage.setItem('myfiles_visible_tags', JSON.stringify(state.visibleTags)); } catch(err) {}
          applySidebarPreferences();
        });
      });
    }

    // Shortcuts: Interactive Filter
    if (el.settingsShortcutSearch && el.settingsShortcutsContainer) {
      el.settingsShortcutSearch.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        const rows = el.settingsShortcutsContainer.querySelectorAll('.settings-shortcut-row');
        rows.forEach(row => {
          const searchData = (row.dataset.search || '') + ' ' + (row.textContent || '');
          const matches = !query || searchData.toLowerCase().includes(query);
          row.style.display = matches ? 'flex' : 'none';
        });

        el.settingsShortcutsContainer.querySelectorAll('.shortcut-section-block').forEach(sec => {
          const visibleRows = sec.querySelectorAll('.settings-shortcut-row:not([style*="display: none"])');
          sec.style.display = visibleRows.length > 0 ? 'flex' : 'none';
        });
      });
    }

    // System: Archive Defaults
    if (el.settingsDefaultArchiveFormat) {
      el.settingsDefaultArchiveFormat.addEventListener('change', (e) => {
        state.defaultArchiveFormat = e.target.value;
        try { localStorage.setItem('myfiles_archive_format', state.defaultArchiveFormat); } catch(err) {}
        showToast(`Default archive format set to ${state.defaultArchiveFormat.toUpperCase()}`, 'info');
      });
    }
    if (el.settingsDefaultArchiveLevel) {
      el.settingsDefaultArchiveLevel.addEventListener('change', (e) => {
        state.defaultArchiveLevel = e.target.value;
        try { localStorage.setItem('myfiles_archive_level', state.defaultArchiveLevel); } catch(err) {}
        showToast(`Compression level set to ${state.defaultArchiveLevel.toUpperCase()}`, 'info');
      });
    }
    if (el.settingsCheckAutoOpenExtracted) {
      el.settingsCheckAutoOpenExtracted.addEventListener('change', (e) => {
        state.autoOpenExtracted = e.target.checked;
        try { localStorage.setItem('myfiles_auto_open_extracted', String(state.autoOpenExtracted)); } catch(err) {}
      });
    }

    // System: Deduplication Settings
    if (el.settingsDedupScanMode) {
      el.settingsDedupScanMode.addEventListener('change', (e) => {
        state.dedupScanMode = e.target.value;
        try { localStorage.setItem('myfiles_dedup_mode', state.dedupScanMode); } catch(err) {}
      });
    }
    if (el.settingsDedupMinSize) {
      el.settingsDedupMinSize.addEventListener('change', (e) => {
        state.dedupMinSize = Number(e.target.value);
        try { localStorage.setItem('myfiles_dedup_minsize', String(state.dedupMinSize)); } catch(err) {}
      });
    }

    // Window focus auto-refresh
    window.addEventListener('focus', () => {
      if (state.autoRefreshOnFocus && state.currentPath && !state.isSearching) {
        navigateTo(state.currentPath, false);
      }
    });

    // System: Reset All Preferences
    if (el.settingsBtnResetDefaults) {
      el.settingsBtnResetDefaults.addEventListener('click', () => {
        showConfirmModal('Reset All Preferences', 'Are you sure you want to restore all settings, view defaults, and appearance options to original factory settings?', () => {
          try {
            [
              'myfiles_theme', 'myfiles_accent', 'myfiles_compact_mode', 'myfiles_startup_folder',
              'myfiles_startup_custom', 'myfiles_open_action', 'myfiles_confirm_delete', 'myfiles_search_scope',
              'myfiles_checkboxes', 'myfiles_show_extensions', 'myfiles_enable_ql', 'myfiles_ql_autoplay',
              'myfiles_ql_loop', 'myfiles_use_vlc', 'myfiles_terminal', 'myfiles_checksum_algo',
              'myfiles_viewmode', 'myfiles_thumbsize', 'myfiles_grid_gear', 'myfiles_auto_refresh', 'myfiles_date_format',
              'myfiles_col_date', 'myfiles_col_type', 'myfiles_col_size', 'myfiles_col_tag',
              'myfiles_sb_recents', 'myfiles_sb_favorites', 'myfiles_sb_drives', 'myfiles_sb_tags',
              'myfiles_visible_tags', 'myfiles_archive_format', 'myfiles_archive_level',
              'myfiles_auto_open_extracted', 'myfiles_dedup_mode', 'myfiles_dedup_minsize'
            ].forEach(k => {
              localStorage.removeItem(k);
            });
          } catch(e) {}
          setTheme('system');
          setAccent('blue');
          setCompactMode(false);
          state.startupFolder = 'firstDrive';
          state.startupFolderPath = '';
          state.openAction = 'double';
          state.confirmDelete = true;
          state.searchScope = 'current';
          state.itemCheckboxes = false;
          state.showFileExtensions = true;
          state.enableQuickLook = true;
          state.qlAutoplay = true;
          state.qlLoop = false;
          state.useVlcMedia = true;
          state.terminalChoice = 'wt';
          state.checksumAlgorithm = 'sha256';
          state.autoRefreshOnFocus = true;
          state.dateFormat = 'relative';
          state.colShowDate = true;
          state.colShowType = true;
          state.colShowSize = true;
          state.colShowTag = true;
          state.sidebarShowRecents = true;
          state.sidebarShowFavorites = true;
          state.sidebarShowDrives = true;
          state.sidebarShowTags = true;
          state.visibleTags = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'];
          state.defaultArchiveFormat = 'zip';
          state.defaultArchiveLevel = 'normal';
          state.autoOpenExtracted = true;
          state.dedupScanMode = 'sha256';
          state.dedupMinSize = 0;
          applySidebarPreferences();
          setViewMode('grid');
          setThumbSize('medium');
          openSettingsModal();
          showToast('Preferences reset to factory defaults', 'success');
        });
      });
    }

    // View Options Panel Events (media_1790263700052.png)
    if (el.voCloseBtn) {
      el.voCloseBtn.addEventListener('click', closeViewOptionsPanel);
    }
    if (el.sortOptShowViewOptions) {
      el.sortOptShowViewOptions.addEventListener('click', (e) => {
        e.stopPropagation();
        if (el.sortDropdown) el.sortDropdown.classList.remove('open');
        openViewOptionsPanel();
      });
    }
    if (el.moreActViewOptions) {
      el.moreActViewOptions.addEventListener('click', (e) => {
        e.stopPropagation();
        if (el.moreActionsDropdown) el.moreActionsDropdown.classList.remove('open');
        openViewOptionsPanel();
      });
    }
    if (el.ctxViewOptions) {
      el.ctxViewOptions.addEventListener('click', (e) => {
        e.stopPropagation();
        hideContextMenu();
        openViewOptionsPanel();
      });
    }
    if (el.voSortSelect) {
      el.voSortSelect.addEventListener('change', (e) => {
        state.sortField = e.target.value;
        sortCurrentItems();
        renderCurrentView();
      });
    }
    if (el.voGroupSelect) {
      el.voGroupSelect.addEventListener('change', (e) => {
        setGroupBy(e.target.value);
      });
    }
    if (el.viewOptionsPanel) {
      el.viewOptionsPanel.querySelectorAll('input[name="voThumbSize"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          if (e.target.checked) applyThumbSize(e.target.value);
        });
      });
    }
    if (el.voChkPreviewCol) {
      el.voChkPreviewCol.addEventListener('change', (e) => {
        if (state.previewPaneOpen !== e.target.checked) togglePreviewPane();
      });
    }
    if (el.voChkIconPreview) {
      el.voChkIconPreview.addEventListener('change', (e) => {
        state.iconPreview = e.target.checked;
        renderCurrentView();
      });
    }
    if (el.voChkFilename) {
      el.voChkFilename.addEventListener('change', (e) => {
        state.showThumbFilename = e.target.checked;
        renderCurrentView();
      });
    }
    if (el.voChkAlwaysOpen) {
      el.voChkAlwaysOpen.addEventListener('change', (e) => {
        if (e.target.checked) {
          state.folderViewPreferences[state.currentPath] = state.viewMode;
        } else {
          delete state.folderViewPreferences[state.currentPath];
        }
        try {
          localStorage.setItem('myfiles_folder_views', JSON.stringify(state.folderViewPreferences));
        } catch(err) {}
      });
    }
    if (el.voBtnDefaults) {
      el.voBtnDefaults.addEventListener('click', saveViewDefaults);
    }

    // Standard Sidebar Folders as Drop Targets (move/copy files into them)
    const sidebarSpecialFolders = [
      { el: el.sidebarDesktop, id: 'desktop' },
      { el: el.sidebarDocuments, id: 'documents' },
      { el: el.sidebarDownloads, id: 'downloads' },
      { el: el.sidebarPictures, id: 'pictures' }
    ];
    sidebarSpecialFolders.forEach(({ el: folderEl, id }) => {
      if (folderEl) {
        setupFolderDropTarget(folderEl, () => {
          const folder = (state.specialFolders || []).find(f => f.id === id);
          return folder?.path;
        }, () => {
          const folder = (state.specialFolders || []).find(f => f.id === id);
          if (folder && state.currentPath === folder.path) {
            navigateTo(state.currentPath, false);
          }
        });
      }
    });

    // Drag-and-drop folder to Sidebar Favorites to pin it
    setupSidebarFavoritesPinDrop(el.sidebarPinsList);
    setupSidebarFavoritesPinDrop(el.sidebarFavoritesList);
    setupSidebarFavoritesPinDrop(el.sidebarSectionFavorites);

    // Sidebar Pins & Tags
    el.btnAddPinCurrent.addEventListener('click', (e) => {
      e.stopPropagation();
      pinFolderToSidebar(state.currentPath);
    });
    document.querySelectorAll('#sidebarTagsList .tag-item').forEach(tagItem => {
      tagItem.addEventListener('click', () => filterByTag(tagItem.dataset.tag));
    });

    // Quick Look Dialog Events
    el.qlBtnClose.addEventListener('click', closeQuickLook);
    if (el.qlBtnMaximize) {
      el.qlBtnMaximize.addEventListener('click', toggleQuickLookMaximize);
    }
    if (el.qlBtnInfo) {
      el.qlBtnInfo.addEventListener('click', () => toggleQuickLookInfo());
    }
    if (el.qlInfoHudClose) {
      el.qlInfoHudClose.addEventListener('click', () => toggleQuickLookInfo(false));
    }
    if (el.qlNavPrev) {
      el.qlNavPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateQuickLook(-1);
      });
    }
    if (el.qlNavNext) {
      el.qlNavNext.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateQuickLook(1);
      });
    }
    el.qlBtnOpenDefault.addEventListener('click', () => {
      if (state.quickLookFile) api.openItem(state.quickLookFile.path);
    });
    el.quickLookOverlay.addEventListener('click', (e) => {
      if (e.target === el.quickLookOverlay) closeQuickLook();
    });

    // Quick Look Tag Picker
    el.qlTagTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      el.qlTagsDropdown.classList.toggle('open');
    });
    document.querySelectorAll('#qlTagsDropdown .ql-tag-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        el.qlTagsDropdown.classList.remove('open');
        if (state.quickLookFile) {
          assignTag(state.quickLookFile.path, opt.dataset.tag);
        }
      });
    });

    // Context Menu Tag Palette
    document.querySelectorAll('.ctx-tag-btn').forEach(tagBtn => {
      tagBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideContextMenu();
        if (state.contextTarget) {
          assignTag(state.contextTarget.path, tagBtn.dataset.tag);
        }
      });
    });

    // Context Menu Actions
    el.ctxOpen.addEventListener('click', () => {
      hideContextMenu();
      if (state.contextTarget) {
        if (state.contextTarget.isDirectory) navigateTo(state.contextTarget.path);
        else api.openItem(state.contextTarget.path);
      }
    });
    if (el.ctxOpenNewWindow) {
      el.ctxOpenNewWindow.addEventListener('click', () => {
        hideContextMenu();
        if (state.contextTarget && state.contextTarget.isDirectory) {
          openNewWindow(state.contextTarget.path);
        }
      });
    }
    if (el.ctxOpenNewTab) {
      el.ctxOpenNewTab.addEventListener('click', () => {
        hideContextMenu();
        if (state.contextTarget && state.contextTarget.isDirectory) {
          createTab(state.contextTarget.path);
        }
      });
    }
    el.ctxQuickLook.addEventListener('click', () => {
      hideContextMenu();
      if (state.contextTarget) openQuickLook(state.contextTarget);
    });
    el.ctxCut.addEventListener('click', () => {
      hideContextMenu();
      if (state.contextTarget) state.clipboard = { action: 'cut', paths: [state.contextTarget.path] };
    });
    el.ctxCopy.addEventListener('click', () => {
      hideContextMenu();
      if (state.contextTarget) state.clipboard = { action: 'copy', paths: [state.contextTarget.path] };
    });
    if (el.ctxDuplicate) {
      el.ctxDuplicate.addEventListener('click', async () => {
        hideContextMenu();
        await duplicateSelectedItems();
      });
    }
    el.ctxPaste.addEventListener('click', async () => {
      hideContextMenu();
      if (state.clipboard.paths.length > 0) {
        if (state.clipboard.action === 'cut') {
          await api.moveItems(state.clipboard.paths, state.currentPath);
          state.clipboard.paths = [];
        } else {
          await api.copyItems(state.clipboard.paths, state.currentPath);
        }
        navigateTo(state.currentPath, false);
      }
    });
    if (el.ctxNewFolder) {
      el.ctxNewFolder.addEventListener('click', () => {
        hideContextMenu();
        promptCreateFolder();
      });
    }
    if (el.ctxNewFile) {
      el.ctxNewFile.addEventListener('click', () => {
        hideContextMenu();
        promptCreateFile('txt');
      });
    }
    if (el.ctxSelectAll) {
      el.ctxSelectAll.addEventListener('click', () => {
        hideContextMenu();
        selectAll();
      });
    }
    if (el.ctxUp) {
      el.ctxUp.addEventListener('click', () => {
        hideContextMenu();
        goUp();
      });
    }
    if (el.ctxRefresh) {
      el.ctxRefresh.addEventListener('click', () => {
        hideContextMenu();
        navigateTo(state.currentPath, false);
      });
    }
    el.ctxMoveOpposite.addEventListener('click', async () => {
      hideContextMenu();
      if (state.contextTarget && state.secondaryPath) {
        await api.moveItems([state.contextTarget.path], state.secondaryPath);
        navigateTo(state.currentPath, false);
        loadSecondaryPane(state.secondaryPath);
      }
    });
    el.ctxCopyOpposite.addEventListener('click', async () => {
      hideContextMenu();
      if (state.contextTarget && state.secondaryPath) {
        await api.copyItems([state.contextTarget.path], state.secondaryPath);
        loadSecondaryPane(state.secondaryPath);
      }
    });
    el.ctxPin.addEventListener('click', () => {
      hideContextMenu();
      if (state.contextTarget && state.contextTarget.isDirectory) pinFolderToSidebar(state.contextTarget.path);
    });
    el.ctxRename.addEventListener('click', () => {
      hideContextMenu();
      if (state.contextTarget) promptRenameItem(state.contextTarget);
    });
    el.ctxDelete.addEventListener('click', () => {
      hideContextMenu();
      if (state.contextTarget) confirmDeleteItem(state.contextTarget);
    });
    if (el.ctxRestore) {
      el.ctxRestore.addEventListener('click', () => {
        hideContextMenu();
        handleRestoreSelectedItem(state.contextTarget);
      });
    }
    if (el.ctxDeletePermanently) {
      el.ctxDeletePermanently.addEventListener('click', () => {
        hideContextMenu();
        handleDeletePermanentlyItem(state.contextTarget);
      });
    }
    if (el.ctxRestoreAll) {
      el.ctxRestoreAll.addEventListener('click', () => {
        hideContextMenu();
        handleRestoreAllRecycle();
      });
    }
    if (el.ctxEmptyRecycle) {
      el.ctxEmptyRecycle.addEventListener('click', () => {
        hideContextMenu();
        promptEmptyRecycleBin();
      });
    }
    if (el.btnRestoreAllRecycle) {
      el.btnRestoreAllRecycle.addEventListener('click', handleRestoreAllRecycle);
    }
    if (el.btnEmptyRecycleView) {
      el.btnEmptyRecycleView.addEventListener('click', promptEmptyRecycleBin);
    }
    el.ctxCopyPath.addEventListener('click', () => {
      hideContextMenu();
      if (state.contextTarget) navigator.clipboard.writeText(state.contextTarget.path);
    });
    if (el.ctxShare) {
      el.ctxShare.addEventListener('click', () => {
        hideContextMenu();
        openShareModal(state.contextTarget || state.activeItem || state.currentPath);
      });
    }
    el.ctxTerminal.addEventListener('click', () => {
      hideContextMenu();
      const targetDir = (state.contextTarget && state.contextTarget.isDirectory) ? state.contextTarget.path : state.currentPath;
      api.openTerminal(targetDir, state.terminalChoice);
    });
    if (el.ctxPowerShell) {
      el.ctxPowerShell.addEventListener('click', () => {
        hideContextMenu();
        const targetDir = (state.contextTarget && state.contextTarget.isDirectory) ? state.contextTarget.path : state.currentPath;
        api.openTerminal(targetDir, 'powershell');
      });
    }
    if (el.ctxCmd) {
      el.ctxCmd.addEventListener('click', () => {
        hideContextMenu();
        const targetDir = (state.contextTarget && state.contextTarget.isDirectory) ? state.contextTarget.path : state.currentPath;
        api.openTerminal(targetDir, 'cmd');
      });
    }
    if (el.ctxReveal) {
      el.ctxReveal.addEventListener('click', () => {
        hideContextMenu();
        if (state.contextTarget) api.showInExplorer(state.contextTarget.path);
      });
    }

    if (el.ctxVlcPlay) {
      el.ctxVlcPlay.addEventListener('click', async () => {
        hideContextMenu();
        if (state.contextTarget) {
          await api.playInVlc(state.contextTarget.path, { enqueue: false });
        }
      });
    }

    if (el.ctxVlcEnqueue) {
      el.ctxVlcEnqueue.addEventListener('click', async () => {
        hideContextMenu();
        if (state.contextTarget) {
          await api.playInVlc(state.contextTarget.path, { enqueue: true });
          showToast('Added to VLC Playlist', 'success');
        }
      });
    }

    if (el.ctxExtractAll) {
      el.ctxExtractAll.addEventListener('click', () => {
        hideContextMenu();
        if (state.contextTarget) performExtractArchive(state.contextTarget, false);
      });
    }

    if (el.ctxExtractHere) {
      el.ctxExtractHere.addEventListener('click', () => {
        hideContextMenu();
        if (state.contextTarget) performExtractArchive(state.contextTarget, true);
      });
    }

    if (el.ctxCompressZip) {
      el.ctxCompressZip.addEventListener('click', () => {
        hideContextMenu();
        performCompress('zip');
      });
    }

    if (el.ctxCompress7z) {
      el.ctxCompress7z.addEventListener('click', () => {
        hideContextMenu();
        performCompress('7z');
      });
    }

    if (el.ctxBatchRename) {
      el.ctxBatchRename.addEventListener('click', () => {
        hideContextMenu();
        openBatchRenameModal();
      });
    }

    if (el.ctxProperties) {
      el.ctxProperties.addEventListener('click', () => {
        hideContextMenu();
        openPropertiesModal(state.contextTarget || state.activeItem);
      });
    }

    if (el.ctxInvertSelect) {
      el.ctxInvertSelect.addEventListener('click', () => {
        hideContextMenu();
        invertSelection();
      });
    }

    if (el.ctxGetInfo) {
      el.ctxGetInfo.addEventListener('click', () => {
        hideContextMenu();
        openGetInfoModal(state.contextTarget || state.activeItem);
      });
    }

    if (el.ctxNewFolderWithSelection) {
      el.ctxNewFolderWithSelection.addEventListener('click', () => {
        hideContextMenu();
        createNewFolderWithSelection();
      });
    }

    if (el.ctxFindDuplicates) {
      el.ctxFindDuplicates.addEventListener('click', () => {
        hideContextMenu();
        const targetDir = state.contextTarget && state.contextTarget.isDirectory ? state.contextTarget.path : state.currentPath;
        openDeduplicationModal(targetDir);
      });
    }

    if (el.ctxRotateClockwise) {
      el.ctxRotateClockwise.addEventListener('click', () => {
        hideContextMenu();
        rotateActiveImage();
      });
    }

    // Windows Explorer Item Checkboxes Toggle
    if (el.btnToggleCheckboxes) {
      el.btnToggleCheckboxes.addEventListener('click', () => {
        state.itemCheckboxes = !state.itemCheckboxes;
        try { localStorage.setItem('myfiles_checkboxes', String(state.itemCheckboxes)); } catch(err) {}
        if (el.settingsCheckboxes) el.settingsCheckboxes.checked = state.itemCheckboxes;
        el.btnToggleCheckboxes.classList.toggle('active', state.itemCheckboxes);
        if (state.viewMode === 'list') renderListView();
        else if (state.viewMode === 'grid') renderGridView();
        else if (state.viewMode === 'columns') renderMillerColumns();
        showToast(state.itemCheckboxes ? 'Item checkboxes enabled' : 'Item checkboxes disabled', 'info');
        updateToolbarActionStates();
      });
    }

    // Undo & Redo Toolbar Buttons
    if (el.btnUndo) {
      el.btnUndo.addEventListener('click', performUndo);
    }
    if (el.btnRedo) {
      el.btnRedo.addEventListener('click', performRedo);
    }

    // Properties Modal Listeners
    if (el.btnClosePropModal) el.btnClosePropModal.addEventListener('click', closePropertiesModal);
    if (el.btnPropDone) el.btnPropDone.addEventListener('click', closePropertiesModal);
    if (el.btnPropCopyPath) {
      el.btnPropCopyPath.addEventListener('click', () => {
        if (activePropertyItem) {
          navigator.clipboard.writeText(activePropertyItem.path);
          showToast('Path copied to clipboard', 'info');
        }
      });
    }
    if (el.btnCalcHashes) el.btnCalcHashes.addEventListener('click', calculatePropertiesHashes);
    if (el.btnCopySha256) {
      el.btnCopySha256.addEventListener('click', () => {
        if (el.propHashSha256.value) {
          navigator.clipboard.writeText(el.propHashSha256.value);
          showToast('SHA-256 copied to clipboard', 'info');
        }
      });
    }
    if (el.btnCopyMd5) {
      el.btnCopyMd5.addEventListener('click', () => {
        if (el.propHashMd5.value) {
          navigator.clipboard.writeText(el.propHashMd5.value);
          showToast('MD5 copied to clipboard', 'info');
        }
      });
    }
    if (el.propTabGeneral && el.propTabChecksums) {
      el.propTabGeneral.addEventListener('click', () => {
        el.propTabGeneral.style.borderBottomColor = 'var(--accent)';
        el.propTabGeneral.style.color = 'var(--text-main)';
        el.propTabChecksums.style.borderBottomColor = 'transparent';
        el.propTabChecksums.style.color = 'var(--text-muted)';
        el.propContentGeneral.style.display = 'block';
        el.propContentChecksums.style.display = 'none';
      });
      el.propTabChecksums.addEventListener('click', () => {
        el.propTabChecksums.style.borderBottomColor = 'var(--accent)';
        el.propTabChecksums.style.color = 'var(--text-main)';
        el.propTabGeneral.style.borderBottomColor = 'transparent';
        el.propTabGeneral.style.color = 'var(--text-muted)';
        el.propContentChecksums.style.display = 'block';
        el.propContentGeneral.style.display = 'none';
      });
    }
    if (el.propHashVerifyInput) {
      el.propHashVerifyInput.addEventListener('input', () => {
        const val = el.propHashVerifyInput.value.trim().toLowerCase();
        if (!val) {
          el.propHashVerifyResult.textContent = '';
          return;
        }
        const sha = el.propHashSha256.value.trim().toLowerCase();
        const md5 = el.propHashMd5.value.trim().toLowerCase();
        if ((sha && val === sha) || (md5 && val === md5)) {
          el.propHashVerifyResult.textContent = 'Checksum verified: Match found!';
          el.propHashVerifyResult.style.color = '#10b981';
        } else {
          el.propHashVerifyResult.textContent = 'Checksum does not match';
          el.propHashVerifyResult.style.color = '#ef4444';
        }
      });
    }

    // Batch Rename Modal Listeners
    if (el.btnCloseBatchModal) el.btnCloseBatchModal.addEventListener('click', closeBatchRenameModal);
    if (el.btnBatchCancel) el.btnBatchCancel.addEventListener('click', closeBatchRenameModal);
    if (el.btnBatchApply) el.btnBatchApply.addEventListener('click', executeBatchRename);
    if (el.batchFindInput) el.batchFindInput.addEventListener('input', updateBatchRenamePreview);
    if (el.batchReplaceInput) el.batchReplaceInput.addEventListener('input', updateBatchRenamePreview);
    if (el.batchPrefixInput) el.batchPrefixInput.addEventListener('input', updateBatchRenamePreview);
    if (el.batchSuffixInput) el.batchSuffixInput.addEventListener('input', updateBatchRenamePreview);
    if (el.batchCheckNumbering) {
      el.batchCheckNumbering.addEventListener('change', () => {
        el.batchStartNumber.style.display = el.batchCheckNumbering.checked ? 'block' : 'none';
        updateBatchRenamePreview();
      });
    }
    if (el.batchStartNumber) el.batchStartNumber.addEventListener('input', updateBatchRenamePreview);

    // macOS Finder "Get Info" Modal Listeners
    if (el.btnGiClose) {
      el.btnGiClose.addEventListener('click', closeGetInfoModal);
    }
    if (el.giNameInput) {
      el.giNameInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const newName = el.giNameInput.value.trim();
          if (activeInfoItem && newName && newName !== activeInfoItem.name) {
            const res = await api.renameItem(activeInfoItem.path, newName);
            if (res.success) {
              showToast(`Renamed to "${newName}"`, 'success');
              activeInfoItem.name = newName;
              if (el.giWindowTitle) el.giWindowTitle.textContent = `${newName} Info`;
              if (el.giHeroTitle) el.giHeroTitle.textContent = newName;
              navigateTo(state.currentPath, false);
            } else {
              showToast(`Rename failed: ${res.error}`, 'error');
            }
          }
        }
      });
    }
    if (el.giChkLocked) {
      el.giChkLocked.addEventListener('change', async () => {
        if (!activeInfoItem) return;
        const newLocked = el.giChkLocked.checked;
        try {
          const res = await api.setAttributes(activeInfoItem.path, { readOnly: newLocked });
          if (res && res.success) {
            activeInfoItem.isReadOnly = newLocked;
            renderGiPermissions(newLocked);
            showToast(newLocked ? 'Item marked Read-Only (Locked)' : 'Item unlocked (Read & Write)', 'success');
          } else {
            el.giChkLocked.checked = !newLocked;
            showToast(`Attribute change failed: ${res?.error || 'Unknown error'}`, 'error');
          }
        } catch (err) {
          el.giChkLocked.checked = !newLocked;
          showToast(`Attribute error: ${err.message}`, 'error');
        }
      });
    }
    if (el.giChkStationery) {
      el.giChkStationery.addEventListener('change', () => {
        showToast(el.giChkStationery.checked ? 'Marked as Stationery template' : 'Unmarked Stationery template', 'info');
      });
    }
    if (el.giChkHideExt) {
      el.giChkHideExt.addEventListener('change', () => {
        if (!activeInfoItem || !el.giNameInput) return;
        if (el.giChkHideExt.checked) {
          el.giNameInput.value = activeInfoItem.name.replace(/\.[^/.]+$/, '');
        } else {
          el.giNameInput.value = activeInfoItem.name;
        }
      });
    }

    // macOS Finder "Go to Folder..." Modal Listeners
    if (el.btnGoFolderClose) {
      el.btnGoFolderClose.addEventListener('click', closeGoToFolderModal);
    }
    if (el.btnGoFolderCancel) {
      el.btnGoFolderCancel.addEventListener('click', closeGoToFolderModal);
    }
    if (el.btnGoFolderConfirm) {
      el.btnGoFolderConfirm.addEventListener('click', () => {
        if (el.goFolderInput) executeGoToFolder(el.goFolderInput.value);
      });
    }
    if (el.goFolderInput) {
      el.goFolderInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          executeGoToFolder(el.goFolderInput.value);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeGoToFolderModal();
        }
      });
    }
    document.querySelectorAll('#goToFolderModal .go-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const p = chip.dataset.path;
        if (p) executeGoToFolder(p);
      });
    });

    // Native File Deduplication Modal Listeners
    if (el.btnDedupClose) el.btnDedupClose.addEventListener('click', closeDeduplicationModal);
    if (el.btnDedupCancel) el.btnDedupCancel.addEventListener('click', closeDeduplicationModal);
    if (el.btnDedupRescan) el.btnDedupRescan.addEventListener('click', executeDeduplicationScan);
    if (el.btnDedupSelectNewest) el.btnDedupSelectNewest.addEventListener('click', selectDuplicatesKeepNewest);
    if (el.btnDedupSelectOldest) el.btnDedupSelectOldest.addEventListener('click', selectDuplicatesKeepOldest);
    if (el.btnDedupSelectNone) el.btnDedupSelectNone.addEventListener('click', deselectAllDuplicates);
    if (el.btnDedupDelete) el.btnDedupDelete.addEventListener('click', executeDeleteSelectedDuplicates);

    // Native Storage Management Modal Listeners
    if (el.moreActManageStorage) {
      el.moreActManageStorage.addEventListener('click', () => {
        if (el.moreActionsDropdown) el.moreActionsDropdown.classList.remove('open');
        openStorageModal();
      });
    }
    if (el.ctxManageStorage) {
      el.ctxManageStorage.addEventListener('click', () => {
        hideContextMenu();
        const targetDrive = (state.contextTarget && state.contextTarget.path) ? state.contextTarget.path : state.currentPath;
        openStorageModal(targetDrive);
      });
    }
    if (el.statusDriveFree) {
      el.statusDriveFree.addEventListener('click', () => {
        openStorageModal(state.currentPath);
      });
      el.statusDriveFree.title = 'Click to open Storage Management';
    }
    if (el.btnStorageClose) el.btnStorageClose.addEventListener('click', closeStorageModal);
    if (el.btnStorageDone) el.btnStorageDone.addEventListener('click', closeStorageModal);
    if (el.storageDriveSelect) {
      el.storageDriveSelect.addEventListener('change', () => {
        const val = el.storageDriveSelect.value;
        if (val) loadStorageData(val);
      });
    }
    if (el.btnStorageRescan) {
      el.btnStorageRescan.addEventListener('click', () => {
        loadStorageData(state.storageCurrentDrive);
      });
    }
    if (el.tabBtnLargestFiles) {
      el.tabBtnLargestFiles.addEventListener('click', () => {
        state.storageActiveTab = 'largest';
        el.tabBtnLargestFiles.classList.add('active');
        if (el.tabBtnTopFolders) el.tabBtnTopFolders.classList.remove('active');
        if (el.tabContentLargestFiles) el.tabContentLargestFiles.style.display = 'block';
        if (el.tabContentTopFolders) el.tabContentTopFolders.style.display = 'none';
        if (el.storageTabSummaryInfo) el.storageTabSummaryInfo.textContent = 'Top largest individual files';
      });
    }
    if (el.tabBtnTopFolders) {
      el.tabBtnTopFolders.addEventListener('click', () => {
        state.storageActiveTab = 'folders';
        el.tabBtnTopFolders.classList.add('active');
        if (el.tabBtnLargestFiles) el.tabBtnLargestFiles.classList.remove('active');
        if (el.tabContentTopFolders) el.tabContentTopFolders.style.display = 'block';
        if (el.tabContentLargestFiles) el.tabContentLargestFiles.style.display = 'none';
        if (el.storageTabSummaryInfo) el.storageTabSummaryInfo.textContent = 'Top directory consumers';
      });
    }
    if (el.btnStorageCleanTemp) {
      el.btnStorageCleanTemp.addEventListener('click', cleanStorageTemp);
    }
    if (el.btnStorageEmptyRecycle) {
      el.btnStorageEmptyRecycle.addEventListener('click', emptyStorageRecycleBin);
    }
    if (el.btnStorageLaunchDedup) {
      el.btnStorageLaunchDedup.addEventListener('click', () => {
        closeStorageModal();
        openDeduplicationModal(state.storageCurrentDrive);
      });
    }

    // Windows Native Storage & Administrative Tools Launchers
    document.querySelectorAll('.btn-launch-win-tool').forEach(btn => {
      btn.addEventListener('click', async () => {
        const toolName = btn.dataset.tool;
        if (!toolName) return;
        const driveLetter = (state.storageCurrentDrive || 'C').charAt(0);
        showToast(`Launching Windows tool: ${toolName}...`, 'info');
        try {
          const res = await api.launchWindowsTool(toolName, driveLetter);
          if (res && res.success) {
            showToast(`Opened Windows tool: ${toolName}`, 'success');
          } else {
            showToast(`Could not launch tool: ${res?.error || 'Unknown error'}`, 'error');
          }
        } catch (err) {
          showToast(`Launch failed: ${err.message}`, 'error');
        }
      });
    });

    // Share Hub Modal Listeners
    if (el.btnCloseShareModal) el.btnCloseShareModal.addEventListener('click', closeShareModal);
    if (el.btnShareDone) el.btnShareDone.addEventListener('click', closeShareModal);
    if (el.tabBtnShareNative) el.tabBtnShareNative.addEventListener('click', () => switchShareTab('native'));
    if (el.tabBtnShareApps) el.tabBtnShareApps.addEventListener('click', () => switchShareTab('apps'));

    if (el.btnShareCopyPath) {
      el.btnShareCopyPath.addEventListener('click', () => {
        if (!shareTargetItem) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareTargetItem.path);
          showToast(`Path copied: ${shareTargetItem.path}`, 'success');
        }
      });
    }

    if (el.shareOptWinSheet) {
      el.shareOptWinSheet.addEventListener('click', async () => {
        if (!shareTargetItem) return;
        showToast('Activating Windows Share handler...', 'info');
        const res = await api.openNativeShare(shareTargetItem.path);
        if (res && res.success) {
          showToast('Windows Share activated', 'success');
        }
      });
    }

    if (el.shareOptNearby) {
      el.shareOptNearby.addEventListener('click', () => {
        showToast('Opening Windows Nearby Sharing settings...', 'info');
        api.openExternal('ms-settings:nearbysharing');
      });
    }

    if (el.shareOptEmail) {
      el.shareOptEmail.addEventListener('click', () => {
        if (!shareTargetItem) return;
        const subject = encodeURIComponent(`Shared file: ${shareTargetItem.name}`);
        const body = encodeURIComponent(`File: ${shareTargetItem.name}\nPath: ${shareTargetItem.path}\n\nShared via MyFiles File Manager`);
        api.openExternal(`mailto:?subject=${subject}&body=${body}`);
        showToast('Opening default email client...', 'info');
      });
    }

    if (el.shareOptUnc) {
      el.shareOptUnc.addEventListener('click', () => {
        if (!shareTargetItem) return;
        const unc = getShareUncPath(shareTargetItem.path);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(unc);
          showToast(`UNC Path copied for LAN sharing: ${unc}`, 'success');
        }
      });
    }

    if (el.btnShareCopyWifiLink) {
      el.btnShareCopyWifiLink.addEventListener('click', () => {
        if (!shareWifiDownloadUrl) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareWifiDownloadUrl);
          showToast('Wi-Fi mobile download link copied to clipboard', 'success');
        }
      });
    }

    const appCards = document.querySelectorAll('.share-app-card');
    appCards.forEach(card => {
      card.addEventListener('click', () => {
        const app = card.getAttribute('data-app');
        if (app) handleShareApp(app);
      });
    });

    const shareSearch = document.getElementById('shareAppsSearchInput');
    if (shareSearch) {
      shareSearch.addEventListener('input', (e) => {
        filterShareApps(e.target.value);
      });
    }

    const btnRefreshShare = document.getElementById('btnRefreshShareApps');
    if (btnRefreshShare) {
      btnRefreshShare.addEventListener('click', async () => {
        btnRefreshShare.classList.add('spinning');
        showToast('Rescanning Windows share apps...', 'info');
        await refreshInstalledShareApps(true);
        btnRefreshShare.classList.remove('spinning');
        showToast('Windows share apps rescanned', 'success');
      });
    }

    // External link handlers (Settings Credits & Developer URLs)
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a.settings-credit-link, a.settings-about-link-btn');
      if (link && link.href) {
        e.preventDefault();
        api.openExternal(link.href);
      }
    });

    // Global click dismissals
    document.addEventListener('click', (e) => {
      if (el.newFileDropdown && !el.newFileDropdown.contains(e.target) && !e.target.closest('#btnNewFileMenu')) {
        el.newFileDropdown.classList.remove('open');
      }
      if (el.qlTagsDropdown && !el.qlTagsDropdown.contains(e.target) && !e.target.closest('#qlTagTrigger')) {
        el.qlTagsDropdown.classList.remove('open');
      }
      if (el.sortDropdown && !el.sortDropdown.contains(e.target) && !e.target.closest('#btnSortMenu')) {
        el.sortDropdown.classList.remove('open');
      }
      if (el.searchAttrDropdown && !el.searchAttrDropdown.contains(e.target) && !e.target.closest('#btnSearchTypeToggle')) {
        el.searchAttrDropdown.style.display = 'none';
      }
      if (el.moreActionsDropdown && !el.moreActionsDropdown.contains(e.target) && !e.target.closest('#btnToolbarMore')) {
        el.moreActionsDropdown.classList.remove('open');
      }
      if (el.searchPopover && !el.searchPopover.contains(e.target) && !e.target.closest('.search-wrapper')) {
        el.searchPopover.style.display = 'none';
      }
      if (el.viewOptionsPanel && !el.viewOptionsPanel.contains(e.target) && 
          !e.target.closest('#sortOptShowViewOptions') && 
          !e.target.closest('#moreActViewOptions') && 
          !e.target.closest('#ctxViewOptions')) {
        closeViewOptionsPanel();
      }
      if (el.getInfoModal && e.target === el.getInfoModal) {
        closeGetInfoModal();
      }
      if (el.goToFolderModal && e.target === el.goToFolderModal) {
        closeGoToFolderModal();
      }
      if (el.dedupModal && e.target === el.dedupModal) {
        closeDeduplicationModal();
      }
      if (el.storageModal && e.target === el.storageModal) {
        closeStorageModal();
      }
      if (el.settingsModal && e.target === el.settingsModal) {
        closeSettingsModal();
      }
      if (el.shareModal && e.target === el.shareModal) {
        closeShareModal();
      }
      hideContextMenu();
    });

    // Modal Events
    el.modalBtnConfirm.addEventListener('click', () => {
      if (modalConfirmCallback) modalConfirmCallback();
      closeModal();
    });
    el.modalBtnCancel.addEventListener('click', closeModal);
    el.modalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (modalConfirmCallback) modalConfirmCallback();
        closeModal();
      } else if (e.key === 'Escape') {
        closeModal();
      }
    });

    // Keyboard Shortcuts Navigation & Quick Look
    window.addEventListener('keydown', (e) => {
      // Ignore shortcut if typing in input or textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Show View Options Toggle (Ctrl+J) - macOS Reference
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        toggleViewOptionsPanel();
        return;
      }
      if (e.key === 'Escape') {
        // 1. Context Menu
        const tabMenu = document.getElementById('tabContextMenu');
        if ((el.contextMenu && el.contextMenu.style.display !== 'none') || (tabMenu && tabMenu.style.display !== 'none')) {
          e.preventDefault();
          hideContextMenu();
          return;
        }
        // 2. Search Popover
        if (el.searchPopover && el.searchPopover.style.display !== 'none') {
          e.preventDefault();
          el.searchPopover.style.display = 'none';
          return;
        }
        // 3. Dropdowns
        if (el.newFileDropdown && el.newFileDropdown.classList.contains('open')) {
          e.preventDefault();
          el.newFileDropdown.classList.remove('open');
          return;
        }
        if (el.sortDropdown && el.sortDropdown.classList.contains('open')) {
          e.preventDefault();
          el.sortDropdown.classList.remove('open');
          return;
        }
        // 4. Modals & Panels
        if (state.viewOptionsOpen) {
          e.preventDefault();
          closeViewOptionsPanel();
          return;
        }
        if (el.getInfoModal && el.getInfoModal.style.display !== 'none') {
          e.preventDefault();
          closeGetInfoModal();
          return;
        }
        if (el.goToFolderModal && el.goToFolderModal.style.display !== 'none') {
          e.preventDefault();
          closeGoToFolderModal();
          return;
        }
        if (el.dedupModal && el.dedupModal.style.display !== 'none') {
          e.preventDefault();
          closeDeduplicationModal();
          return;
        }
        if (el.storageModal && el.storageModal.style.display !== 'none') {
          e.preventDefault();
          closeStorageModal();
          return;
        }
        if (el.settingsModal && el.settingsModal.style.display !== 'none') {
          e.preventDefault();
          closeSettingsModal();
          return;
        }
        if (el.propertiesModal && el.propertiesModal.style.display !== 'none') {
          e.preventDefault();
          closePropertiesModal();
          return;
        }
        if (el.batchRenameModal && el.batchRenameModal.style.display !== 'none') {
          e.preventDefault();
          closeBatchRenameModal();
          return;
        }
        if (el.shareModal && el.shareModal.style.display !== 'none') {
          e.preventDefault();
          closeShareModal();
          return;
        }
        if (el.modalOverlay && el.modalOverlay.style.display !== 'none') {
          e.preventDefault();
          closeModal();
          return;
        }
        if (state.quickLookOpen) {
          e.preventDefault();
          closeQuickLook();
          return;
        }
        // 5. Cancel cut staging
        if (cancelCutStaging()) {
          e.preventDefault();
          showToast('Cut cancelled', 'info');
          return;
        }
        // 6. Clear multi-selection
        if (state.selectedIndices && state.selectedIndices.size > 0) {
          e.preventDefault();
          deselectAll();
          return;
        }
      }

      // Global Clipboard Operations: Copy (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        performCopy();
        return;
      }

      // Global Clipboard Operations: Cut (Ctrl+X / Cmd+X)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        performCut();
        return;
      }

      // Global Clipboard Operations: Paste (Ctrl+V / Cmd+V)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        performPaste();
        return;
      }

      // Preferences & Settings (Ctrl+, / Cmd+,)
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        openSettingsModal();
        return;
      }

      // Share Hub Modal (Ctrl+Alt+S / Cmd+Alt+S)
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        openShareModal();
        return;
      }

      // Manage Storage (Ctrl+Shift+M / Cmd+Shift+M)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        openStorageModal();
        return;
      }

      // Find Duplicate Files (Ctrl+Shift+U / Cmd+Shift+U)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        openDeduplicationModal();
        return;
      }

      // macOS Get Info (Cmd+I / Ctrl+I)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        openGetInfoModal(state.activeItem);
        return;
      }

      // macOS Go to Folder (Cmd+Shift+G / Ctrl+Shift+G)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        openGoToFolderModal();
        return;
      }

      // macOS New Folder with Selection (Ctrl+Alt+N / Cmd+Ctrl+N)
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createNewFolderWithSelection();
        return;
      }

      // macOS Go to Home (Ctrl+Shift+H / Cmd+Shift+H)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        goToHome();
        return;
      }

      // macOS Go to Documents (Ctrl+Shift+O / Cmd+Shift+O)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        goToDocuments();
        return;
      }

      // macOS Go to Downloads (Ctrl+Shift+L / Cmd+Shift+L)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        goToDownloads();
        return;
      }

      // macOS Go to Applications (Ctrl+Shift+A / Cmd+Shift+A)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        goToApplications();
        return;
      }

      // Go to Desktop (Ctrl+Alt+D or Alt+Shift+D)
      if (((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'd') || (e.altKey && e.shiftKey && e.key.toLowerCase() === 'd')) {
        e.preventDefault();
        goToDesktop();
        return;
      }

      // macOS Open Item (Cmd+Down / Ctrl+Down)
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') {
        if (state.activeItem) {
          e.preventDefault();
          if (state.activeItem.isDirectory) navigateTo(state.activeItem.path);
          else api.openItem(state.activeItem.path);
          return;
        }
      }

      // macOS Go to Parent Folder (Cmd+Up / Ctrl+Up)
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') {
        e.preventDefault();
        goUp();
        return;
      }

      // Properties Dialog (Alt+Enter)
      if (e.altKey && e.key === 'Enter') {
        e.preventDefault();
        openPropertiesModal(state.activeItem);
        return;
      }

      // Undo (Ctrl+Z)
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        performUndo();
        return;
      }

      // Redo (Ctrl+Y or Ctrl+Shift+Z)
      if ((e.ctrlKey && e.key.toLowerCase() === 'y') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        performRedo();
        return;
      }

      // Copy as Path (Ctrl+Shift+C)
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (state.activeItem) {
          navigator.clipboard.writeText(state.activeItem.path);
          showToast('Path copied to clipboard', 'info');
        }
        return;
      }

      // Select All (Ctrl+A)
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }

      // Duplicate Item (Ctrl+D) / Deselect All
      if (e.ctrlKey && e.key.toLowerCase() === 'd' && !e.shiftKey) {
        e.preventDefault();
        if ((state.selectedIndices && state.selectedIndices.size > 0) || state.activeItem) {
          duplicateSelectedItems();
        } else {
          deselectAll();
        }
        return;
      }

      // Invert Selection (Ctrl+Shift+I)
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        invertSelection();
        return;
      }

      // Refresh (F5 or Ctrl+R)
      if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r')) {
        e.preventDefault();
        navigateTo(state.currentPath, false);
        return;
      }

      // Go Up (Backspace)
      if (e.key === 'Backspace') {
        e.preventDefault();
        goUp();
        return;
      }

      // Quick Look Toggle (Spacebar)
      if (e.code === 'Space') {
        e.preventDefault();
        if (state.quickLookOpen) {
          closeQuickLook();
        } else {
          openQuickLook();
        }
        return;
      }

      // Quick Look navigation & image shortcuts
      if (state.quickLookOpen) {
        if (e.key === 'Escape') {
          closeQuickLook();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          navigateQuickLook(-1);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          navigateQuickLook(1);
        } else if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
          if (el.qlBtnRotate && isImageFile(state.quickLookFile)) {
            e.preventDefault();
            el.qlBtnRotate.click();
          }
        } else if ((e.key === '+' || e.key === '=') && !e.ctrlKey) {
          if (el.qlBtnZoomIn && isImageFile(state.quickLookFile)) {
            e.preventDefault();
            el.qlBtnZoomIn.click();
          }
        } else if ((e.key === '-' || e.key === '_') && !e.ctrlKey) {
          if (el.qlBtnZoomOut && isImageFile(state.quickLookFile)) {
            e.preventDefault();
            el.qlBtnZoomOut.click();
          }
        } else if (e.key === '0' && !e.ctrlKey) {
          if (el.qlBtnZoomFit && isImageFile(state.quickLookFile)) {
            e.preventDefault();
            el.qlBtnZoomFit.click();
          }
        } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) {
          if (el.qlBtnMaximize) {
            e.preventDefault();
            el.qlBtnMaximize.click();
          }
        } else if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey) {
          if (el.qlBtnFlipH && isImageFile(state.quickLookFile)) {
            e.preventDefault();
            el.qlBtnFlipH.click();
          }
        } else if ((e.key === 'i' || e.key === 'I') && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          toggleQuickLookInfo();
        }
        return;
      }

      // View Switcher Shortcuts (Ctrl+1, Ctrl+2, Ctrl+3, Ctrl+4)
      if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        setViewMode('grid');
        return;
      }
      if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        setViewMode('list');
        return;
      }
      if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        setViewMode('columns');
        return;
      }
      if (e.ctrlKey && e.key === '4') {
        e.preventDefault();
        setViewMode('gallery');
        return;
      }

      // Preview Pane Toggle (Ctrl+Shift+P)
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        togglePreviewPane();
        return;
      }

      // Sidebar Toggle Shortcut (Ctrl+B / Cmd+B)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Window & Tab Shortcuts
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openNewWindow(state.currentPath);
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        createTab(state.currentPath);
      } else if (e.ctrlKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        closeTab(state.activeTabId);
      }

      // Dual Pane Shortcut (Ctrl+Shift+D)
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleDualPane();
      }

      // Search (Ctrl+F)
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        el.searchInput.focus();
        el.searchInput.select();
      }

      // Focus Address (Ctrl+L or Alt+D)
      if ((e.ctrlKey && e.key.toLowerCase() === 'l') || (e.altKey && e.key.toLowerCase() === 'd')) {
        e.preventDefault();
        toggleAddressInput(true);
      }

      // Toggle Hidden Files (Ctrl+H)
      if (e.ctrlKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        toggleHiddenFiles();
      }

      // Navigation Shortcuts
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        goForward();
      } else if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        goUp();
      }

      // New Folder (Ctrl+Shift+N)
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        promptCreateFolder();
      }

      // Rename (F2) - Single or Batch
      if (e.key === 'F2') {
        e.preventDefault();
        if (state.selectedIndices && state.selectedIndices.size > 1) {
          openBatchRenameModal();
        } else {
          promptRenameItem(state.activeItem);
        }
      }

      // Delete (Delete / Shift+Delete)
      if (e.key === 'Delete') {
        e.preventDefault();
        confirmDeleteItem(state.activeItem, e.shiftKey);
        return;
      }

      // Home / End navigation
      if (e.key === 'Home') {
        e.preventDefault();
        selectItemByIndex(0);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        selectItemByIndex(state.items ? state.items.length - 1 : 0);
        return;
      }
      if (e.key === 'PageDown') {
        e.preventDefault();
        const delta = state.viewMode === 'grid' ? getGridColumnCount() * 3 : 10;
        handleArrowKeys(delta, e.shiftKey);
        return;
      }
      if (e.key === 'PageUp') {
        e.preventDefault();
        const delta = state.viewMode === 'grid' ? -getGridColumnCount() * 3 : -10;
        handleArrowKeys(delta, e.shiftKey);
        return;
      }

      // Grid view: 2D directional arrow navigation (Left/Right/Up/Down)
      if (state.viewMode === 'grid') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleArrowKeys(-1, e.shiftKey);
          return;
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleArrowKeys(1, e.shiftKey);
          return;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          handleArrowKeys(-getGridColumnCount(), e.shiftKey);
          return;
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          handleArrowKeys(getGridColumnCount(), e.shiftKey);
          return;
        }
      }

      // Gallery scrubber navigation
      if (state.viewMode === 'gallery') {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          handleArrowKeys(-1, e.shiftKey);
          return;
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          handleArrowKeys(1, e.shiftKey);
          return;
        }
      }

      // Miller columns navigation
      if (state.viewMode === 'columns') {
        const colCount = state.millerColumns.length;
        if (colCount > 0) {
          let colIdx = (typeof state.activeColumnIndex === 'number' && state.activeColumnIndex >= 0 && state.activeColumnIndex < colCount)
            ? state.activeColumnIndex
            : colCount - 1;
          const currentColumn = state.millerColumns[colIdx];

          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentColumn && currentColumn.items && currentColumn.items.length > 0) {
              const visibleItems = currentColumn.items.filter(it => state.showHidden || !isSystemOrHidden(it));
              if (visibleItems.length > 0) {
                let curItemIdx = -1;
                if (currentColumn.selectedItem) {
                  curItemIdx = visibleItems.findIndex(it => it.path === currentColumn.selectedItem.path);
                }
                let targetIdx = e.key === 'ArrowDown' ? (curItemIdx + 1) : (curItemIdx - 1);
                if (targetIdx < 0) targetIdx = 0;
                if (targetIdx >= visibleItems.length) targetIdx = visibleItems.length - 1;

                const targetItem = visibleItems[targetIdx];
                if (targetItem) {
                  handleColumnItemClick(colIdx, targetItem);
                }
              }
            }
            return;
          } else if (e.key === 'ArrowRight') {
            if (currentColumn && currentColumn.selectedItem && currentColumn.selectedItem.isDirectory) {
              e.preventDefault();
              const nextColIdx = colIdx + 1;
              if (nextColIdx < colCount) {
                state.activeColumnIndex = nextColIdx;
                const nextCol = state.millerColumns[nextColIdx];
                const nextVisible = (nextCol.items || []).filter(it => state.showHidden || !isSystemOrHidden(it));
                if (nextVisible.length > 0) {
                  const itemToSelect = nextCol.selectedItem || nextVisible[0];
                  handleColumnItemClick(nextColIdx, itemToSelect);
                } else {
                  renderMillerColumns();
                }
              }
            }
            return;
          } else if (e.key === 'ArrowLeft') {
            if (colIdx > 0) {
              e.preventDefault();
              state.activeColumnIndex = colIdx - 1;
              const parentCol = state.millerColumns[colIdx - 1];
              if (parentCol && parentCol.selectedItem) {
                state.activeItem = parentCol.selectedItem;
                updateStatusBar();
                renderPreviewPane();
              }
              renderMillerColumns();
            }
            return;
          }
        }
      }

      // List view arrow navigation
      if (state.viewMode === 'list') {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          handleArrowKeys(e.key === 'ArrowDown' ? 1 : -1, e.shiftKey);
          return;
        }
      }

      // Enter to open
      if (e.key === 'Enter') {
        if (el.modalOverlay && el.modalOverlay.style.display !== 'none') return;
        if (el.settingsModal && el.settingsModal.style.display !== 'none') return;
        if (el.propertiesModal && el.propertiesModal.style.display !== 'none') return;
        if (el.getInfoModal && el.getInfoModal.style.display !== 'none') return;
        if (el.goToFolderModal && el.goToFolderModal.style.display !== 'none') return;
        if (el.dedupModal && el.dedupModal.style.display !== 'none') return;
        if (el.storageModal && el.storageModal.style.display !== 'none') return;
        if (state.quickLookOpen) return;

        if (state.activeItem) {
          e.preventDefault();
          if (state.activeItem.isDirectory) navigateTo(state.activeItem.path);
          else api.openItem(state.activeItem.path);
        }
      }

      // Type-Ahead Instant Search / Jump to File
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && e.key !== ' ') {
        if (handleTypeaheadKey(e.key)) {
          e.preventDefault();
        }
      }
    });

    function getGridColumnCount() {
      const gridContainer = el.primaryViewport.querySelector('.grid-container');
      if (!gridContainer || gridContainer.children.length < 2) return 1;
      const items = gridContainer.children;
      const firstTop = items[0].offsetTop;
      for (let i = 1; i < items.length; i++) {
        if (items[i].offsetTop > firstTop) {
          return i;
        }
      }
      return Math.max(1, items.length);
    }

    function handleArrowKeys(delta, isRangeSelect = false) {
      if (!state.items || state.items.length === 0) return;
      let currentIdx = -1;
      if (state.activeItem) {
        currentIdx = state.items.findIndex(it => it.path === state.activeItem.path);
      }
      if (currentIdx === -1) {
        currentIdx = delta > 0 ? -1 : 0;
      }
      let nextIdx = currentIdx + delta;
      if (nextIdx < 0) nextIdx = 0;
      if (nextIdx >= state.items.length) nextIdx = state.items.length - 1;

      if (isRangeSelect && currentIdx !== -1) {
        const start = Math.min(currentIdx, nextIdx);
        const end = Math.max(currentIdx, nextIdx);
        for (let i = start; i <= end; i++) {
          state.selectedIndices.add(i);
        }
      } else {
        state.selectedIndices.clear();
        state.selectedIndices.add(nextIdx);
      }
      state.activeItem = state.items[nextIdx];
      updateStatusBar();

      if (state.viewMode === 'columns') {
        const lastCol = state.millerColumns[state.millerColumns.length - 1];
        if (lastCol) {
          lastCol.selectedItem = state.activeItem;
          renderMillerColumns();
        }
      } else if (state.viewMode === 'list') {
        renderListView();
      } else if (state.viewMode === 'grid') {
        renderGridView();
      } else if (state.viewMode === 'gallery') {
        state.activeItemRotation = 0;
        renderGalleryView();
        renderPreviewPane();
      }
      scrollActiveItemIntoView();
    }
  }

  // Run initial mount
  window.addEventListener('DOMContentLoaded', init);
})();
