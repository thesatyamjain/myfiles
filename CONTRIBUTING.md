# Contributing to MyFiles

Thanks for taking the time to contribute. This document covers the essentials.

## Before you start

- Check [open issues](../../issues) to avoid duplicating work.
- For large changes, open an issue first to discuss the approach.
- The project philosophy is **minimum viable code** — if a feature can be done with less, do less.

## Setup

```bash
git clone https://github.com/your-username/myfiles.git
cd myfiles
npm install
```

Run the app:

```bash
npm start          # Electron desktop
npm run server     # Browser fallback (http://localhost:5241)
```

Run tests:

```bash
npm test
```

Tests must pass before any PR is merged. The suite runs in under 2 seconds — run it often.

## Code structure

| File | Responsibility |
| --- | --- |
| `main.js` | Electron main process only — IPC handlers, window creation |
| `preload.js` | Context bridge — the only file that touches `ipcRenderer` |
| `server.js` | HTTP server mode — mirrors main.js IPC as REST endpoints |
| `fs-engine.js` | All filesystem logic — shared by both main.js and server.js |
| `src/renderer.js` | All UI logic — one IIFE, one `state` object |
| `src/styles.css` | Design tokens in `:root`, dark theme first, light overrides below |
| `test/self-check.js` | Assertion suite — add a suite for any non-trivial feature |

## Making changes

### Adding a feature

1. Add the IPC handler to `main.js` **and** the equivalent HTTP route to `server.js` (they must stay in sync).
2. Expose it in `preload.js` under `window.myFilesAPI`.
3. Call it from `renderer.js` — use `window.myFilesAPI?.yourMethod?.()` with a `fetch` fallback.
4. Add assertions to `test/self-check.js` covering the new handler, CSS class, or renderer function.

### Editing styles

- All tokens live in `:root` and are overridden per theme in `body.theme-dark`, `body.theme-light`, and `@media (prefers-color-scheme)`.
- Do not hardcode colors — always use a CSS variable.
- Keep `border-radius` consistent with the existing `--radius-*` tokens.
- WCAG AA contrast minimum (4.5:1 body text, 3:1 large text).

### Editing the renderer

`renderer.js` is a single IIFE. All state lives in `const state = { ... }`. Do not add module-level mutable variables — add them to `state`.

## Pull request checklist

- [ ] `npm test` passes with 0 errors
- [ ] No new `npm` runtime dependencies added without discussion
- [ ] New UI follows the existing token/radius/shadow system
- [ ] Both Electron (IPC) and server (HTTP) paths work for any filesystem operation

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
