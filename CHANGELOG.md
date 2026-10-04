# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Symmetric Dual-Pane Workspace**: Independent primary and secondary viewports with dedicated directory loaders, swap views toggle, drive selectors, and smooth draggable pane divider (`Ctrl+Shift+D` / `Alt+2`).
- **Obsidian BETA Badging**: Glowing obsidian indicators integrated across custom titlebar, statusbar, and settings modal.
- **Lossless Screenshots Showcase**: High-resolution 1440×900 PNG showcases embedded in documentation and GitHub Pages.
- **Automated Git Tagging & Release Workflow**: GitHub Actions workflow supporting automatic tag generation on `package.json` updates and one-click dispatch releases.

### Fixed
- **Drag & Drop Crash Elimination**: Resolved fatal dual-drag collision between Chromium HTML5 `dataTransfer` and Win32 OLE `DoDragDrop`. Replaced invalid 1×1 dummy image with valid 32×32 native icon, eliminating `shell32.dll` access violations (0xC0000005).
- **Unhandled Window Drop Navigation**: Added global drop protection and explicit `preventDefault()` on viewports and Miller columns to prevent Chromium from navigating away to dropped files.
- **Taskbar Pin Preservation**: Preserved Windows Taskbar pinned shortcuts across installer updates with `keepShortcuts: true`.
- **Image Zoom Sensitivity**: Tuned image preview zoom increments to gradual, smooth steps (10% button step, 5% wheel, gentle 120% click).

### Changed
- **Branding & Metadata**: Updated app branding and copyright to The Software Co.
- **Grid & Scrubber Styling**: Refined selected card outlines, scrubber item indicators, and theme tokens.

---

## [1.1.1] - 2026-09-30

### Added
- **HTTP 206 Partial Content Video Streaming**: High-throughput media streaming protocol (`media-stream://`) enabling continuous scrubbing and smooth playback for large video files.
- **Quick Look PDF Hand Pan**: Added hand move, drag-pan, and boundary constraints for high-resolution PDF previewing.

### Fixed
- **Renderer Process Diagnostics**: Added lifecycle monitoring for `render-process-gone` and load failure telemetry.
- **Modern NSIS Installer**: Replaced legacy multi-step installer wizard with a sleek, modern UI.
- **Settings Toggle Exclusivity**: Resolved mutual exclusivity between "Make Default" and "Restore Explorer" settings actions.

### Changed
- **List Row Visual Depth**: Enhanced selected row highlights and liquid glass optical backdrop materials.

---

## [1.1.0] - 2026-09-29

### Added
- **Miller Columns View Mode**: Multi-level hierarchical browsing with synchronized keyboard navigation and parent-child column auto-scrolling.
- **Quick Look Floating EXIF HUD**: Semi-transparent metadata HUD overlay displaying aperture, shutter speed, ISO, and camera attributes.
- **File Deduplication Engine**: Two-phase fast size filtering and cryptographic SHA-256 duplicate detection with safe batch deletion.
- **macOS Finder Parity**: Added PowerRename batch transformations, relative date humanization, and type-ahead file jump.

### Fixed
- **Cross-Device Move (`EXDEV`)**: Graceful fallback to streaming copy and delete when moving files across different physical drives.
- **Clean Process Lifecycle**: Delegated window control to native IPC and eliminated orphaned background processes.

---

## [1.0.0] - 2026-09-27

### Added
- **Initial Production Release of MyFiles**: Fast, keyboard-first Windows File Manager.
- **Core View Modes**: List View, Grid View, and Gallery View with instant Quick Look (`Spacebar`).
- **Colored Tags Subsystem**: macOS-style colored dot tags with persistent indexing and sidebar filtering.
- **System Integrations**: Windows Recycle Bin integration, default file manager registration, and integrated terminal launcher.

---

[Unreleased]: https://github.com/thesatyamjain/myfiles/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/thesatyamjain/myfiles/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/thesatyamjain/myfiles/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/thesatyamjain/myfiles/releases/tag/v1.0.0
