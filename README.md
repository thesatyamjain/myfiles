# MyFiles

A fast, keyboard-first Windows file manager built with Node.js and Electron. Combines the best ergonomics of macOS Finder — Quick Look, Miller Columns, and Colored Tags — with the native power of Windows, while resolving the performance bottlenecks and layout flaws of both platforms.

---

## What It Fixes

### Compared to Windows Explorer
- **Context menu latency:** Replaces the 500 ms+ latency of Windows 11 shell extensions with an instant context menu (0 ms response).
- **Freezing searches:** Replaces blocking search indexing with non-blocking, asynchronous streaming search with an instant content-grep toggle.
- **Missing preview capabilities:** Pressing `Space` instantly opens Quick Look for images, video, audio, code, Markdown, PDF, doc excerpts, and archives.
- **Clunky address input:** Provides an editable path bar, clickable breadcrumb segments, and standard `Ctrl+L` navigation.

### Compared to macOS Finder
- **Missing file creation:** Instant "New File" ribbon actions and template creation via right-click anywhere.
- **Uneditable address bar:** Fully editable path bar with real path auto-completion alongside clickable breadcrumbs.
- **Missing persistent metrics:** Always-visible status bar showing live free disk space, item counts, and selection size.
- **Window management:** Native dual-pane split workspace (`Ctrl+Shift+D`) and multi-window spawning (`Ctrl+N`).

---

## Key Features

- **4 Finder View Modes:**
  - **Grid View:** Responsive zoom card grid with 4-step transmission gear slider and dynamic thumbnail scaling.
  - **List View:** Grouped details table with sticky non-clipping headers, sortable columns, and virtual scrolling.
  - **Miller Columns:** Multi-column hierarchical navigation with persistent preview pane and arrow key traversal.
  - **Gallery View:** Focused media hero with horizontal carousel scrubber and dynamic rotation.
- **Centered Quick Look (Spacebar):**
  - Instant preview for images (zoom/pan/flip/EXIF HUD), video (hardware accelerated via VLC / native media-stream), audio (waveform player), PDF (bundled PDF.js with dark mode invert and hand tool), code syntax, Markdown, and archive trees (ZIP, 7z, RAR, TAR, GZ).
  - High-end centered liquid glass loading state with accent spinner.
- **macOS Finder Liquid Glass Design System:**
  - Windows 11 native Acrylic material integration (`backgroundMaterial: 'acrylic'`).
  - Optical depth layers, specular glare tracking on pointer movement, and progressive frosted glass modals.
  - Built-in `Reduce Transparency` accessibility mode for lower-spec or battery-saver operation.
- **High-Performance Non-Blocking Core:**
  - Asynchronous non-blocking storage metrics (`fs.promises.statfs`) with 4-second TTL drive caching.
  - Throttled background subfolder counting queue to prevent disk I/O and IPC thrashing.
  - Debounced live search filtering for smooth typing in large directories.
- **Inspector & Multi-Selection Preview:**
  - Real-time file attributes, resolution, word counts, and single-click copyable metadata.
  - Multi-item inspector stack displaying selection count badges, aggregate sizes, and file type breakdown chips.
- **Tabs, Multi-Window & Dual Pane:**
  - Tab management (`Ctrl+T`, `Ctrl+W`, middle-click to close, drag-to-detach).
  - Independent desktop multi-window spawning (`Ctrl+N`).
  - Dual-pane split workspace (`Ctrl+Shift+D`) with swap, drive jumping, and cross-pane drag-and-drop.
- **Native Shell & Storage Utilities:**
  - Full Recycle Bin integration with live item count badges, restore actions, and permanent deletion.
  - Native Windows disk tools launchers (Defrag/TRIM, Resource Monitor, Check Disk, Storage Spaces).
  - 2-phase SHA-256 deduplication scanner with safe deletion.
  - PowerRename batch renamer with live preview, pattern substitution, and numbering.
  - Windows Share Hub with local Wi-Fi QR code transfer for direct mobile downloads.

---

## System Requirements

- **Operating System:** Windows 10 (version 1809+) or Windows 11 (x64)
- **Runtime:** Node.js 18+ and Electron 44+
- **Optional Tools:**
  - [7-Zip](https://www.7-zip.org/) for complete archive inspection and compression
  - [VLC media player](https://www.videolan.org/vlc/) for direct playback passthrough

---

## Installation & Setup

```bash
# Clone the repository
git clone https://github.com/thesatyamjain/myfiles.git
cd myfiles

# Install dependencies
npm install
```

---

## Running the Application

### 1. Electron Desktop Mode (Recommended)
```bash
npm start
```

### 2. Standalone Web Server Mode (No Electron Required)
Runs headless on local port `5241` for access from any browser or mobile device on the same local network:
```bash
npm run server
```
Then open `http://localhost:5241` in your browser.

---

## Building Binaries & Installers

MyFiles uses `electron-builder` with isolated GitHub Releases packaging:

```bash
# Build both NSIS Setup installer and Portable standalone executable
npm run build

# Build NSIS Setup Installer only (dist/MyFiles-Setup-1.1.0.exe)
npm run build:installer

# Build Portable Executable only (dist/MyFiles-Portable-1.1.0.exe)
npm run build:portable
```

For complete deployment and release automation details, see [docs/GITHUB_RELEASES_GUIDE.md](docs/GITHUB_RELEASES_GUIDE.md).

---

## Keyboard Shortcuts Reference

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `Space` | Global | Open / close Quick Look preview |
| `Arrow Keys` | Global / Quick Look | Navigate items / cycle preview targets |
| `Enter` | File List | Open file with default app / enter directory |
| `Ctrl + N` | Global | Open new independent MyFiles window |
| `Ctrl + T` | Global | Open new tab |
| `Ctrl + W` | Global | Close active tab |
| `Ctrl + Shift + D` | Global | Toggle dual-pane split workspace |
| `Ctrl + 1` | Global | Switch to Grid / Icons view |
| `Ctrl + 2` | Global | Switch to List / Details view |
| `Ctrl + 3` | Global | Switch to Column / Miller Columns view |
| `Ctrl + 4` | Global | Switch to Gallery view |
| `Ctrl + F` | Global | Focus live search bar |
| `Ctrl + L` or `Alt + D` | Global | Focus editable address bar |
| `Alt + Up` | Global | Navigate to parent directory |
| `Alt + Left` / `Alt + Right` | Global | History back / forward |
| `Ctrl + Shift + N` | Global | Create new folder |
| `F2` | File List | Rename selected item |
| `Ctrl + D` | File List | Duplicate selected item |
| `Delete` | File List | Move selected item(s) to Recycle Bin |
| `Shift + Delete` | File List | Permanently delete item(s) |
| `Ctrl + C` / `Ctrl + X` / `Ctrl + V` | File List | Copy / Cut / Paste |
| `Ctrl + Z` / `Ctrl + Y` | Global | Undo / Redo filesystem operations |
| `F` | Quick Look | Toggle full-window Quick Look maximize |
| `I` | Quick Look | Toggle EXIF / metadata HUD |
| `F5` or `Ctrl + R` | Global | Refresh active directory |
| `Esc` | Global | Dismiss modal, context menu, or Quick Look |

---

## Architecture

```
myfiles/
├── main.js                  # Electron main process — window lifecycle, IPC handlers, protocol streams
├── preload.js               # Context-isolated bridge exposing window.myFilesAPI safely
├── server.js                # Standalone Node.js HTTP server (web mode & mobile QR share)
├── fs-engine.js             # Unified filesystem engine — non-blocking statfs, caching, search
├── archive.js               # Archive inspection, extraction, and compression (7-Zip + bsdtar)
├── dedup.js                 # 2-phase SHA-256 duplicate detection engine
├── storage.js               # Storage analytics, temp directory cleaner, Recycle Bin metrics
├── vlc.js                   # VLC media player IPC bindings
├── src/
│   ├── index.html           # Unified DOM layout, modals, context menus, and toolbars
│   ├── styles.css           # Liquid Glass design system, CSS tokens, responsive typography
│   ├── renderer.js          # Core client controller — views, selection, drag & drop, Quick Look
│   └── vendor/
│       └── pdfjs/           # Self-hosted PDF.js engine (zero external CDN dependency)
├── docs/
│   └── GITHUB_RELEASES_GUIDE.md  # Complete GitHub Releases & CI/CD guide
└── test/
    └── self-check.js        # Built-in 61-suite automated verification engine
```

### Dual Runtime Design
The frontend UI ([`src/`](src/)) runs identically in both desktop and web environments:
1. **Desktop App Mode:** Communicates with `main.js` via asynchronous Electron IPC channels exposed through `preload.js`.
2. **Web / Mobile Mode:** Communicates with `server.js` through REST endpoints and `media-stream://` / HTTP 206 range streaming.

---

## Verification & Testing

MyFiles includes an automated static analysis and functional check suite containing **61 test suites**:

```bash
npm test
```

The test runner validates:
- Syntax of all core JavaScript source files
- DOM element ID parity and context menu bindings
- macOS Finder design tokens and Liquid Glass CSS classes
- Drive letter deduplication and removable drive detection
- Asynchronous filesystem engine contracts and Quick Look centering

---

## License

This project is licensed under the [MIT License](LICENSE).
