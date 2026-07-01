const { execFileSync, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Run ffmpeg synchronously with the given args.
 * Uses execFileSync (no shell) so arguments are passed safely.
 *
 * @param {string[]} args - ffmpeg CLI args
 * @param {Object} options
 * @param {boolean} options.verbose - if true, pipe ffmpeg output to console
 * @param {string} options.cwd - working directory
 * @returns {Buffer} stdout buffer
 */
function runFfmpeg(args, options = {}) {
  const { verbose = false, cwd } = options;
  return execFileSync('ffmpeg', args, {
    stdio: verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    cwd,
    maxBuffer: 64 * 1024 * 1024
  });
}

/**
 * Run ffprobe synchronously and return parsed JSON.
 *
 * @param {string} inputFile
 * @returns {Object} parsed ffprobe JSON
 */
function probe(inputFile) {
  const args = [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    inputFile
  ];
  const stdout = execFileSync('ffprobe', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024
  });
  return JSON.parse(stdout.toString('utf8'));
}

/**
 * Get the duration of a media file in seconds (as a float).
 * Returns 0 if the duration is not available.
 *
 * @param {string} inputFile
 * @returns {number}
 */
function getDuration(inputFile) {
  const info = probe(inputFile);
  const dur = info.format && parseFloat(info.format.duration);
  return Number.isFinite(dur) ? dur : 0;
}

/**
 * Get the first video stream's width / height, codec_name.
 * Returns null fields if no video stream exists.
 *
 * @param {string} inputFile
 * @returns {{width: number|null, height: number|null, codec: string|null}}
 */
function getVideoStreamInfo(inputFile) {
  const info = probe(inputFile);
  const stream = (info.streams || []).find(s => s.codec_type === 'video');
  if (!stream) return { width: null, height: null, codec: null };
  return {
    width: stream.width || null,
    height: stream.height || null,
    codec: stream.codec_name || null
  };
}

/**
 * Choose a sensible scale filter for web output, capping max width.
 *
 * @param {number|null} width
 * @param {number} maxWidth
 * @returns {string|null} -vf string or null if no scaling needed
 */
function webScaleFilter(width, maxWidth = 1920) {
  if (!width || width <= maxWidth) return null;
  return `scale=${maxWidth}:-2:flags=lanczos`;
}

/**
 * Make a temp file path for intermediate artifacts (palette, frame list, etc.).
 *
 * @param {string} suffix
 * @returns {string}
 */
function tempFile(suffix) {
  return path.join(os.tmpdir(), `xalpheric-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${suffix}`);
}

/**
 * Ensure a directory exists.
 *
 * @param {string} dir
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

module.exports = {
  runFfmpeg,
  probe,
  getDuration,
  getVideoStreamInfo,
  webScaleFilter,
  tempFile,
  ensureDir
};
