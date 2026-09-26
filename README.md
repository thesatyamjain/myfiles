# MyFiles

A fast, keyboard-first Windows file manager built with Node.js and Electron. Brings macOS Finder's best features — Quick Look, Miller Columns, Colored Tags — to Windows, while fixing the things Finder gets wrong.

## What it fixes

**Windows Explorer:**
- Context menu latency (500 ms+) → instant at 0 ms
- Search that freezes the UI → async streaming with content-grep toggle
- No Quick Look → `Space` previews images, video, audio, code, Markdown, PDF, and archives
- Clunky address bar → editable path bar + clickable breadcrumbs + `Ctrl+L`

**macOS Finder:**
- No "New File" anywhere → ribbon + right-click templates
- No editable address bar → real breadcrumbs + path input
- No persistent status bar → always-visible disk free / item count / selection size

## Features

- **4 view modes** — Grid, List, Miller Columns, Gallery
- **Quick Look** — `Space` on any file; navigate with arrow keys without closing
- **Tabs + Dual Pane** — `Ctrl+T` for new tab, `Ctrl+Shift+D` for split view
- **Colored Tags** — 7 colors, filterable from the sidebar
- **Fast async search** — name and content (grep) with streaming results
- **Native archive engine** — inspect/extract/compress ZIP, RAR, 7z, tar, gz, bz2, xz, ISO, CAB via 7-Zip + Windows `tar`
- **File deduplication** — 2-phase SHA-256 scan with safe deletion
- **Share Hub** — Wi-Fi QR mobile download, WhatsApp, Telegram, LocalSend, Quick Share
- **Recycle Bin integration** — drag to trash, live badge, empty from sidebar
- **Storage analyzer** — disk treemap + temp cleaner
- **PowerRename** — batch rename with preview and pattern transforms
- **Type-ahead jump** — press any letter to jump to the matching filename
- **History scroll memory** — scroll position restored per-folder on back/forward
- **Transmission gear slider** — 4-step icon/thumbnail scale control with cogwheel thumb

## Requirements

- **Windows 10/11** (primary target)
- **Node.js 18+**
- **Electron 41+** (for desktop app mode)
- Optional: **7-Zip** for full archive support, **VLC** for media passthrough

## Installation

```bash
git clone https://github.com/your-username/myfiles.git
cd myfiles
npm install
```

## Running

```bash
# Electron desktop app (recommended)
npm start

# Browser-only server (no Electron needed)
npm run server
# then open http://localhost:5241
```

Or double-click `start.bat` — it auto-detects Electron and falls back to the browser server.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Space` | Quick Look preview |
| `Arrow keys` | Navigate / cycle items in Quick Look |
| `Enter` | Open file / enter folder |
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close tab |
| `Ctrl+Shift+D` | Toggle dual-pane split view |
| `Ctrl+F` | Focus search |
| `Ctrl+L` / `Alt+D` | Edit address bar |
| `Alt+Left` / `Alt+Right` | Back / Forward |
| `Alt+Up` | Go to parent folder |
| `Ctrl+Shift+N` | New folder |
| `F2` | Rename |
| `Delete` | Move to Recycle Bin |
| `Ctrl+C` / `Ctrl+X` / `Ctrl+V` | Copy / Cut / Paste |
| `F5` | Refresh |
| `Esc` | Close preview / modal / menu |

## Architecture

```
myfiles/
├── main.js          # Electron main process — IPC handlers, window management
├── preload.js       # Electron context bridge — exposes safe IPC API to renderer
├── server.js        # Standalone Node HTTP server (browser mode fallback)
├── fs-engine.js     # Unified filesystem engine — drives, readdir, search, MIME
├── archive.js       # Archive inspection/extract/compress (7-Zip + bsdtar)
├── dedup.js         # File deduplication engine (SHA-256 two-phase scan)
├── storage.js       # Storage analysis, temp cleaner, Recycle Bin stats
├── vlc.js           # VLC media player integration
├── src/
│   ├── index.html   # Single-page app shell + all UI panels
│   ├── styles.css   # Design system — dark/light/system themes, tokens
│   ├── renderer.js  # All UI logic — views, navigation, drag/drop, Quick Look
│   └── vendor/
│       └── pdfjs/   # PDF.js (bundled, no CDN dependency)
├── scripts/         # Windows shell integration helpers
└── test/
    └── self-check.js  # Automated assertion suite (no test framework needed)
```

**Dual runtime:** The same UI (`src/`) runs inside Electron via `file://` with IPC, or served by `server.js` at `localhost:5241`. `renderer.js` detects `window.myFilesAPI` to switch between IPC and HTTP fetch.

## Tests

```bash
npm test
```

Static assertion suite — reads source files as strings and verifies structure, CSS tokens, renderer patterns, and IPC handler presence. No build step, no test framework. Runs in under 2 seconds.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
