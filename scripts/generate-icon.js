const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 256,
    height: 256,
    show: true,
    center: true,
    frame: false,
    transparent: true,
    skipTaskbar: true
  });

  const svgHtml = `<!DOCTYPE html>
<html>
  <head>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        background: transparent;
        overflow: hidden;
        width: 256px;
        height: 256px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .folder-icon {
        width: 236px;
        height: 199px;
        filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.28));
      }
    </style>
  </head>
  <body>
    <svg class="folder-icon" viewBox="0 0 38 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="folderBackGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
        <linearGradient id="folderFrontGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#0284c7"/>
        </linearGradient>
        <filter id="folderShadow" x="-20%" y="-20%" width="140%" height="145%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#000000" flood-opacity="0.25"/>
        </filter>
      </defs>
      <!-- Back plate with curved tab -->
      <path d="M 4 8 C 4 6.2 5.2 5 7 5 L 14 5 C 15.5 5 16.6 5.8 17.8 7.2 L 19 8.8 C 19.8 9.8 20.8 10.5 22 10.5 L 31.5 10.5 C 33.5 10.5 35 12 35 14 L 35 26 C 35 28.2 33.2 30 31 30 L 8 30 C 5.8 30 4 28.2 4 26 Z" fill="url(#folderBackGrad)"/>
      <!-- Paper sheet insert -->
      <rect x="7" y="7.5" width="24" height="13" rx="2" fill="#ffffff" fill-opacity="0.9"/>
      <line x1="10" y1="11" x2="20" y2="11" stroke="#cbd5e1" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="10" y1="14" x2="16" y2="14" stroke="#cbd5e1" stroke-width="1.2" stroke-linecap="round"/>
      <!-- Front Flap with depth shadow -->
      <path d="M 3.5 13.5 C 3.5 11.8 4.8 10.5 6.8 10.5 L 31.2 10.5 C 33.2 10.5 34.5 11.8 34.5 13.5 L 34.5 25.5 C 34.5 27.8 32.8 29.5 30.5 29.5 L 7.5 29.5 C 5.2 29.5 3.5 27.8 3.5 25.5 Z" fill="url(#folderFrontGrad)" filter="url(#folderShadow)"/>
      <!-- Specular Highlight Top Edge -->
      <path d="M 6.8 11.2 L 31.2 11.2" stroke="rgba(255, 255, 255, 0.65)" stroke-width="0.85" stroke-linecap="round"/>
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

      // Generate multi-resolution icons for Windows taskbar, tray, Alt-Tab and desktop
      const sizes = [16, 24, 32, 48, 64, 128, 256];
      const frames = [];
      for (const s of sizes) {
        const resized = (s === 256) ? img : img.resize({ width: s, height: s, quality: 'best' });
        frames.push({
          size: s,
          buf: resized.toPNG()
        });
      }

      const count = frames.length;
      const header = Buffer.alloc(6);
      header.writeUInt16LE(0, 0); // reserved
      header.writeUInt16LE(1, 2); // type 1 = ICO
      header.writeUInt16LE(count, 4); // count of images

      let offset = 6 + (16 * count);
      const entries = [];
      const buffers = [header];

      for (const frame of frames) {
        const entry = Buffer.alloc(16);
        entry.writeUInt8(frame.size >= 256 ? 0 : frame.size, 0);
        entry.writeUInt8(frame.size >= 256 ? 0 : frame.size, 1);
        entry.writeUInt8(0, 2); // color count
        entry.writeUInt8(0, 3); // reserved
        entry.writeUInt16LE(1, 4); // planes
        entry.writeUInt16LE(32, 6); // bpp
        entry.writeUInt32LE(frame.buf.length, 8); // size
        entry.writeUInt32LE(offset, 12); // offset
        entries.push(entry);
        offset += frame.buf.length;
      }

      for (const entry of entries) {
        buffers.push(entry);
      }
      for (const frame of frames) {
        buffers.push(frame.buf);
      }

      const icoBuf = Buffer.concat(buffers);
      fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoBuf);
      console.log('Successfully generated multi-resolution assets/icon.ico! Size:', icoBuf.length, 'frames:', count);
    } catch (e) {
      console.error('Failed capturing icon:', e);
    } finally {
      app.exit(0);
    }
  }, 1000);
});
