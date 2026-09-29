const fs = require('fs');
const path = require('path');

function create24BitBMP(width, height, pixelFn) {
  const rowSize = Math.floor((width * 3 + 3) / 4) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buf = Buffer.alloc(fileSize);

  // BITMAPFILEHEADER
  buf.write('BM', 0, 2, 'ascii');
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt16LE(0, 6);
  buf.writeUInt16LE(0, 8);
  buf.writeUInt32LE(54, 10);

  // BITMAPINFOHEADER
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30); // BI_RGB
  buf.writeUInt32LE(pixelArraySize, 34);
  buf.writeInt32LE(2835, 38); // 72 DPI
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  // Pixel data (bottom-to-top, BGR)
  for (let y = 0; y < height; y++) {
    // BMP is bottom-up: y=0 in buffer is bottom of image
    const imageY = height - 1 - y;
    const rowOffset = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelFn(x, imageY, width, height);
      const pxOffset = rowOffset + x * 3;
      buf[pxOffset] = b;
      buf[pxOffset + 1] = g;
      buf[pxOffset + 2] = r;
    }
  }

  return buf;
}

// 1. Sidebar Art (164 x 314)
// Matches MyFiles dark glass aesthetic (#0f172a, subtle slate gradient, vibrant orange brand emblem)
const sidebarBuf = create24BitBMP(164, 314, (x, y, w, h) => {
  // Base dark gradient: #0b1120 at top to #0f172a at middle, #020617 at bottom
  const t = y / h;
  let r = Math.round(11 + (15 - 11) * Math.sin(t * Math.PI));
  let g = Math.round(17 + (23 - 17) * Math.sin(t * Math.PI));
  let b = Math.round(32 + (42 - 32) * Math.sin(t * Math.PI));

  // Ambient radial glow behind the emblem (center at x=82, y=110)
  const dx = x - 82;
  const dy = y - 110;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 65) {
    const glow = Math.pow(1 - dist / 65, 2);
    // Orange/amber glow
    r = Math.min(255, Math.round(r + glow * 45));
    g = Math.min(255, Math.round(g + glow * 22));
    b = Math.min(255, Math.round(b + glow * 8));
  }

  // Draw modern stylized folder emblem
  // Folder tab: x: 50-80, y: 78-88
  // Folder body: x: 50-114, y: 88-142
  const inFolderTab = (x >= 54 && x <= 80 && y >= 82 && y <= 92);
  const inFolderBack = (x >= 54 && x <= 110 && y >= 90 && y <= 138);
  const inFolderFront = (x >= 50 && x <= 114 && y >= 96 && y <= 142);

  if (inFolderFront) {
    // Vibrant orange gradient (#f97316 to #ea580c)
    const fy = (y - 96) / 46;
    r = Math.round(249 - fy * 30);
    g = Math.round(115 - fy * 27);
    b = Math.round(22 - fy * 10);
    // Highlight border on top of front flap
    if (y === 96 || y === 97) {
      r = Math.min(255, r + 40);
      g = Math.min(255, g + 40);
      b = Math.min(255, b + 40);
    }
  } else if (inFolderTab || inFolderBack) {
    // Darker amber back (#d97706)
    r = 217;
    g = 119;
    b = 6;
  }

  // Accent divider line on right edge
  if (x === w - 1) {
    r = 51; g = 65; b = 85; // #334155
  }

  // Subtle bottom glass bar
  if (y >= h - 4) {
    r = 249; g = 115; b = 22; // Orange accent line
  }

  return [r, g, b];
});

// 2. Header Art (150 x 57)
// Matches top banner with dark slate #0f172a and mini orange brand emblem
const headerBuf = create24BitBMP(150, 57, (x, y, w, h) => {
  let r = 15;
  let g = 23;
  let b = 42; // #0f172a

  // Mini emblem on the right (center at x=122, y=28)
  const dx = x - 122;
  const dy = y - 28;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 20) {
    const glow = 1 - dist / 20;
    r = Math.min(255, Math.round(r + glow * 30));
    g = Math.min(255, Math.round(g + glow * 15));
    b = Math.min(255, Math.round(b + glow * 5));
  }

  // Mini folder icon
  if (x >= 110 && x <= 134 && y >= 18 && y <= 38) {
    r = 249; g = 115; b = 22; // #f97316
    if (y <= 21 && x > 122) {
      r = 15; g = 23; b = 42; // notch
    }
  }

  // 1px accent line along bottom
  if (y === h - 1) {
    r = 249; g = 115; b = 22; // #f97316
  }

  return [r, g, b];
});

const assetsDir = path.join(__dirname, '../assets');
fs.writeFileSync(path.join(assetsDir, 'installerSidebar.bmp'), sidebarBuf);
fs.writeFileSync(path.join(assetsDir, 'installerHeader.bmp'), headerBuf);
console.log('✓ Successfully generated installerSidebar.bmp (164x314) and installerHeader.bmp (150x57)!');
