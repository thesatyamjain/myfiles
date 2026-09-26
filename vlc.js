// Native VLC Player Engine for MyFiles (Zero External Dependencies)
// Automatically discovers VLC if installed, with seamless fallback to Windows Default Media Player.
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm',
  '.m4v', '.mpg', '.mpeg', '.m2ts', '.mts', '.ts', '.vob',
  '.3gp', '.ogv', '.divx', '.asf', '.rm', '.rmvb'
]);

const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma',
  '.opus', '.alac', '.aiff', '.mid', '.midi', '.ape'
]);

const PLAYLIST_EXTENSIONS = new Set([
  '.m3u', '.m3u8', '.pls', '.xspf'
]);

let cachedVlcPath = null;

function findExecutable(candidates) {
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function getVlcExecutable() {
  if (cachedVlcPath !== null) return cachedVlcPath;
  const sysDrive = process.env['SystemDrive'] || 'C:';
  const progFiles = process.env['ProgramFiles'] || `${sysDrive}\\Program Files`;
  const progFilesX86 = process.env['ProgramFiles(x86)'] || `${sysDrive}\\Program Files (x86)`;
  const localAppData = process.env['LOCALAPPDATA'] || '';

  const candidates = [
    path.join(progFiles, 'VideoLAN', 'VLC', 'vlc.exe'),
    path.join(progFilesX86, 'VideoLAN', 'VLC', 'vlc.exe'),
    localAppData ? path.join(localAppData, 'Programs', 'VideoLAN', 'VLC', 'vlc.exe') : null,
    'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
    'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe'
  ];

  cachedVlcPath = findExecutable(candidates);
  return cachedVlcPath;
}

function isVlcInstalled() {
  return !!getVlcExecutable();
}

function isMedia(filePath) {
  if (!filePath) return false;
  const ext = path.extname(filePath).toLowerCase();
  return VIDEO_EXTENSIONS.has(ext) || AUDIO_EXTENSIONS.has(ext) || PLAYLIST_EXTENSIONS.has(ext);
}

function isVideo(filePath) {
  if (!filePath) return false;
  return VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function isAudio(filePath) {
  if (!filePath) return false;
  return AUDIO_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

/**
 * Launch VLC or fallback to default system media player.
 * @param {string} filePath - Path to video/audio file.
 * @param {object} options - { enqueue: boolean, fullscreen: boolean }
 * @returns {Promise<{ success: boolean, tool: string, enqueued?: boolean, error?: string }>}
 */
function playMedia(filePath, options = {}) {
  return new Promise((resolve) => {
    if (!filePath || !fs.existsSync(filePath)) {
      return resolve({ success: false, error: 'File does not exist: ' + filePath });
    }

    const vlcPath = getVlcExecutable();
    const enqueue = Boolean(options.enqueue);
    const fullscreen = Boolean(options.fullscreen);

    if (vlcPath) {
      // VLC installed -> launch via CLI flags
      const args = ['--one-instance'];
      if (enqueue) {
        args.push('--playlist-enqueue');
      }
      if (fullscreen) {
        args.push('--fullscreen');
      }
      args.push(filePath);

      try {
        const proc = spawn(vlcPath, args, {
          detached: true,
          stdio: 'ignore',
          windowsHide: false
        });
        proc.unref();
        return resolve({ success: true, tool: 'vlc', vlcPath, enqueued: enqueue });
      } catch (err) {
        return resolve({ success: false, error: err.message });
      }
    }

    // Graceful Fallback: Open with Windows Default Player
    try {
      const child = spawn('cmd.exe', ['/c', 'start', '""', filePath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      child.unref();
      return resolve({ success: true, tool: 'system-default', message: 'VLC not detected, opened with default player' });
    } catch (fallbackErr) {
      return resolve({ success: false, error: fallbackErr.message });
    }
  });
}

module.exports = {
  getVlcExecutable,
  isVlcInstalled,
  isMedia,
  isVideo,
  isAudio,
  playMedia,
  VIDEO_EXTENSIONS,
  AUDIO_EXTENSIONS,
  PLAYLIST_EXTENSIONS
};
