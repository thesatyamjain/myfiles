const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 256,
    height: 256,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: {
      offscreen: false
    }
  });

  const svgHtml = `<!DOCTYPE html>
<html>
  <head>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: transparent; overflow: hidden; width: 256px; height: 256px; }
      svg { width: 256px; height: 256px; }
    </style>
  </head>
  <body>
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="finderAppGrad" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#0284c7"/>
          <stop offset="50%" stop-color="#0369a1"/>
          <stop offset="100%" stop-color="#0c4a6e"/>
        </linearGradient>
        <linearGradient id="folderBackGrad" x1="16" y1="7" x2="16" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#0284c7"/>
        </linearGradient>
        <linearGradient id="folderFrontGrad" x1="16" y1="13" x2="16" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#60a5fa"/>
          <stop offset="60%" stop-color="#2563eb"/>
          <stop offset="100%" stop-color="#1d4ed8"/>
        </linearGradient>
        <linearGradient id="sheetGrad" x1="15" y1="8" x2="15" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#e2e8f0"/>
        </linearGradient>
        <filter id="iconDepthShadow" x="-15%" y="-15%" width="130%" height="135%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#000000" flood-opacity="0.32"/>
        </filter>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="6.5" fill="url(#finderAppGrad)"/>
      <rect x="2.5" y="2.5" width="27" height="27" rx="6" stroke="rgba(255, 255, 255, 0.15)" stroke-width="0.8" fill="none"/>
      <path d="M5.5 10c0-1.4 1-2.5 2.5-2.5h4.2c1 0 1.8.6 2.4 1.5l.8 1.2c.4.6 1 .9 1.8.9h6.3c1.5 0 2.5 1.1 2.5 2.5v9.4c0 1.4-1 2.5-2.5 2.5H8c-1.5 0-2.5-1.1-2.5-2.5V10z" fill="url(#folderBackGrad)"/>
      <rect x="8.5" y="8" width="13" height="12" rx="1.5" fill="#93c5fd" fill-opacity="0.5"/>
      <g filter="url(#iconDepthShadow)">
        <path d="M7.5 9.5c0-.8.7-1.5 1.5-1.5h7.2l4.8 4.8v8.7c0 .8-.7 1.5-1.5 1.5H9c-.8 0-1.5-.7-1.5-1.5V9.5z" fill="url(#sheetGrad)"/>
        <path d="M16.2 8v3.6c0 .7.5 1.2 1.2 1.2h3.6z" fill="#cbd5e1"/>
        <line x1="9.8" y1="12.5" x2="14.5" y2="12.5" stroke="#94a3b8" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="9.8" y1="15.2" x2="18.2" y2="15.2" stroke="#94a3b8" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="9.8" y1="17.9" x2="16" y2="17.9" stroke="#94a3b8" stroke-width="1.2" stroke-linecap="round"/>
      </g>
      <path d="M5 14c0-1.2 1-2.2 2.2-2.2h17.6c1.2 0 2.2 1 2.2 2.2v8.5c0 1.5-1.2 2.7-2.7 2.7H7.7C6.2 25.2 5 24 5 22.5V14z" fill="url(#folderFrontGrad)" filter="url(#iconDepthShadow)"/>
      <path d="M7.5 12.6h17" stroke="rgba(255, 255, 255, 0.7)" stroke-width="0.8" stroke-linecap="round"/>
      <g opacity="0.95">
        <rect x="12" y="15.5" width="8" height="6.5" rx="1.2" stroke="#ffffff" stroke-width="1.2" fill="none"/>
        <line x1="14" y1="17.8" x2="18" y2="17.8" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="14" y1="19.8" x2="16.5" y2="19.8" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
      </g>
      <path d="M3.5 8c0-3.2 2.2-4.8 5.5-4.8h14c3.3 0 5.5 1.6 5.5 4.8" stroke="rgba(255, 255, 255, 0.35)" stroke-width="0.9" stroke-linecap="round" fill="none"/>
    </svg>
  </body>
</html>`;

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(svgHtml));

  setTimeout(async () => {
    try {
      const img = await win.webContents.capturePage();
      const pngBuf = img.toPNG();
      const assetsDir = path.join(__dirname, '..', 'assets');
      if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
      fs.writeFileSync(path.join(assetsDir, 'icon.png'), pngBuf);
      console.log('Successfully generated assets/icon.png! Size:', pngBuf.length);

      // Pack into standard 256x256 Windows ICO binary format
      const icoHeader = Buffer.alloc(22);
      icoHeader.writeUInt16LE(0, 0); // reserved
      icoHeader.writeUInt16LE(1, 2); // image type: 1 = ICO
      icoHeader.writeUInt16LE(1, 4); // number of images
      icoHeader.writeUInt8(0, 6);    // width 256 (0 = 256)
      icoHeader.writeUInt8(0, 7);    // height 256 (0 = 256)
      icoHeader.writeUInt8(0, 8);    // color count (0 = no palette)
      icoHeader.writeUInt8(0, 9);    // reserved
      icoHeader.writeUInt16LE(1, 10); // color planes
      icoHeader.writeUInt16LE(32, 12); // bits per pixel (32-bit RGBA)
      icoHeader.writeUInt32LE(pngBuf.length, 14); // image data size
      icoHeader.writeUInt32LE(22, 18); // offset to image data (header size)
      const icoBuf = Buffer.concat([icoHeader, pngBuf]);
      fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoBuf);
      console.log('Successfully generated assets/icon.ico! Size:', icoBuf.length);
    } catch (e) {
      console.error('Failed capturing icon:', e);
    } finally {
      app.quit();
    }
  }, 600);
});
