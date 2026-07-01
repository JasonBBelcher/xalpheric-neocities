const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { checkDependencies, DEPENDENCIES } = require('../../lib/media/dependencies');
const ffmpeg = require('../../lib/media/ffmpeg');
const logger = require('../../lib/utils/logger');

/**
 * GIF creation modes.
 *
 *  - 'segment' (default): use --start + --duration to render a contiguous slice
 *    of the video. Two-pass palette for quality.
 *  - 'summary': sample --frames evenly across the FULL video timeline
 *    (evenly-spaced timestamps → 1 frame per segment → two-pass palette).
 *    This produces a representative GIF that shows the whole video, not just
 *    the first few seconds.
 *  - 'full': render the entire video (no segment), one frame per source frame.
 *    Largest output, true to source.
 */
const MODES = ['segment', 'summary', 'full'];

/**
 * Dither algorithms supported by ffmpeg's paletteuse filter.
 *  - 'bayer' (default): ordered dithering — fast, good for clean graphics
 *  - 'floyd_steinberg': error-diffusion dithering — best for photos
 *  - 'sierra2': a lighter error-diffusion alternative
 *  - 'none': no dithering — smallest file, banding visible
 */
const DITHERS = ['bayer', 'floyd_steinberg', 'sierra2', 'none'];

/**
 * Palette generation stats modes for the palettegen filter.
 *  - 'diff' (default): find unique frames; better for content with motion
 *  - 'single': single pass over the full input
 */
const STATS_MODES = ['diff', 'single'];

/**
 * Parse the --loop flag. Accepts:
 *   - 'infinite' / 'inf' / 0       → 0 (loop forever, the GIF default)
 *   - 'none' / 'no' / 'off' / -1   → -1 (play once, no loop)
 *   - a positive integer           → that count
 * Returns the numeric value ffmpeg expects on -loop.
 */
function parseLoop(value) {
  if (value === undefined || value === null || value === '') return 0;
  const s = String(value).trim().toLowerCase();
  if (s === 'infinite' || s === 'inf' || s === 'forever' || s === '0') return 0;
  if (s === 'none' || s === 'no' || s === 'off' || s === 'once' || s === '-1') return -1;
  const n = Number(s);
  if (!Number.isFinite(n) || n < -1) {
    throw new Error(
      `Invalid --loop value '${value}'. Use 'infinite' (default), 'none', or a positive integer.`
    );
  }
  if (n > 65535) {
    throw new Error(`--loop value ${n} is out of range (max 65535).`);
  }
  return Math.trunc(n);
}

/**
 * GIF recipes — named bundles of options for the three common use cases.
 * Each recipe is a function that takes the user-supplied options and
 * returns a fully-merged options object. CLI flags take precedence over
 * the recipe's values, so `media:gif:tiny -i foo.mov -w 600` still wins
 * over the recipe's default width.
 */
const RECIPES = {
  /**
   * Tiny: small segment-mode GIF that plays once.
   * Good for reaction GIFs, social posts.
   */
  tiny: () => ({
    mode: 'segment',
    start: '0',
    duration: 2,
    width: 240,
    fps: 10,
    loop: 'none',
    colors: 32,
    dither: 'bayer',
    ditherScale: 5
  }),

  /**
   * Flipbook: summary-mode GIF that samples the entire video.
   * Good for video previews, project cards.
   */
  flipbook: () => ({
    mode: 'summary',
    frames: 12,
    width: 480,
    fps: 12,
    loop: 'infinite',
    colors: 128,
    dither: 'floyd_steinberg',
    statsMode: 'diff'
  }),

  /**
   * Flat: low-color, no-dither GIF for vector art, logos, animations.
   */
  flat: () => ({
    mode: 'segment',
    start: '0',
    duration: 4,
    width: 480,
    fps: 15,
    loop: 'infinite',
    colors: 16,
    dither: 'none',
    statsMode: 'single'
  }),

  /**
   * Loop-once: summary mode, plays once.
   * Good for "look at this once" previews.
   */
  'loop-once': () => ({
    mode: 'summary',
    frames: 8,
    width: 360,
    fps: 10,
    loop: 'none',
    colors: 64,
    dither: 'bayer'
  })
};

/**
 * Video file extensions we recognize for batch mode.
 */
const VIDEO_EXTENSIONS = new Set(['.mov', '.mp4', '.m4v', '.avi', '.mkv', '.webm', '.hevc', '.3gp']);

/**
 * List all video files in a directory (non-recursive by default).
 *
 * @param {string} dir
 * @param {Object} [options]
 * @param {boolean} [options.recursive=true]
 * @returns {string[]} absolute paths
 */
function listVideoFiles(dir, options = {}) {
  const { recursive = true } = options;
  if (!fs.existsSync(dir)) return [];
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && recursive) {
      out.push(...listVideoFiles(full, options));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (VIDEO_EXTENSIONS.has(ext)) out.push(full);
    }
  }
  return out.sort();
}

/**
 * Apply a recipe to the user options. CLI flags that were explicitly
 * set (non-default) win over the recipe. We detect "explicit" by
 * comparing against the createGif default for that key.
 */
function applyRecipe(options) {
  if (!options.recipe) return options;
  const recipeFn = RECIPES[options.recipe];
  if (!recipeFn) {
    const available = Object.keys(RECIPES).join(', ');
    throw new Error(`Unknown recipe '${options.recipe}'. Available: ${available}`);
  }
  const recipe = recipeFn();

  // The CLI passes every flag (even when user didn't set it), so we need
  // to detect which flags the user explicitly set. We do this by looking
  // at the original argv-style "presence" map. If the caller didn't pass
  // the underlying value, fall back to the recipe.
  const merged = { ...recipe, ...options };
  // Re-apply recipe defaults for keys where the caller did NOT set a
  // distinct value. The Commander.js flag default values give us the
  // signal: if options[key] === its CLI default, treat it as not-set.
  const cliDefaults = {
    mode: 'segment', start: '0', duration: undefined, frames: '12',
    fps: '12', width: '480', loop: 'infinite', colors: '256',
    dither: 'bayer', ditherScale: '5', statsMode: 'diff',
    transparent: false
  };
  for (const key of Object.keys(cliDefaults)) {
    if (options[key] === cliDefaults[key] && key in recipe) {
      merged[key] = recipe[key];
    }
  }
  return merged;
}

/**
 * Run a batch GIF conversion over every video in a directory.
 *
 * @param {Object} options - all createGif options, plus:
 *   - batchInput (string): source directory
 *   - overwrite (boolean): overwrite existing GIFs (default: false)
 * @returns {Promise<{succeeded: number, skipped: number, failed: number, results: Array}>}
 */
async function runBatch(options) {
  const {
    batchInput = 'process_video',
    outputDir = 'public/assets/gifs/',
    overwrite = false,
    verbose = false
  } = options;

  if (!fs.existsSync(batchInput)) {
    throw new Error(`Batch input directory not found: ${batchInput}`);
  }

  const files = listVideoFiles(batchInput, { recursive: true });
  if (files.length === 0) {
    logger.warn(`No video files found in ${batchInput}`);
    return { succeeded: 0, skipped: 0, failed: 0, results: [] };
  }

  ffmpeg.ensureDir(outputDir);

  logger.info(`\n📦 Batch GIF conversion`);
  logger.info(`   Source: ${batchInput}`);
  logger.info(`   Output: ${outputDir}`);
  logger.info(`   Files:  ${files.length} video(s) found`);
  logger.info(`   Mode:   ${overwrite ? 'overwrite' : 'skip existing'}\n`);

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;
  const results = [];

  for (const input of files) {
    const basename = path.basename(input, path.extname(input));
    const outputPath = path.join(outputDir, `${basename}.gif`);

    if (!overwrite && fs.existsSync(outputPath)) {
      logger.info(`   ↩  Skip (exists): ${path.relative(process.cwd(), outputPath)}`);
      skipped++;
      results.push({ input, output: outputPath, status: 'skipped' });
      continue;
    }

    try {
      logger.info(`   ▶  ${path.relative(process.cwd(), input)}`);
      await createGif({ ...options, input, output: outputPath, batch: false });
      succeeded++;
      results.push({ input, output: outputPath, status: 'ok' });
    } catch (err) {
      failed++;
      logger.error(`   ✗  Failed: ${path.relative(process.cwd(), input)} — ${err.message}`);
      results.push({ input, output: outputPath, status: 'error', error: err.message });
      // Continue with the rest of the batch
    }
  }

  logger.info(`\n${'─'.repeat(60)}`);
  logger.success(`   ✅ Succeeded: ${succeeded}`);
  if (skipped) logger.info(`   ↩  Skipped:   ${skipped}`);
  if (failed) logger.error(`   ✗  Failed:    ${failed}`);
  logger.info(`${'─'.repeat(60)}\n`);

  return { succeeded, skipped, failed, results };
}

/**
 * Probe the source frame rate. Defaults to 25 if unknown.
 */
function probeFps(input) {
  try {
    const info = ffmpeg.probe(input);
    const stream = (info.streams || []).find(s => s.codec_type === 'video');
    if (stream && stream.rate) {
      // rate is a fraction string like "30000/1001" or "25/1"
      const [num, den] = stream.rate.split('/').map(Number);
      if (num && den) return num / den;
    }
  } catch (_) { /* fall through */ }
  return 25;
}

/**
 * Build the (fps=…,scale=…,format=…) prefix for the GIF filter chain.
 * Summary mode pins a target GIF fps via `fps=`. The `format=yuv420p`
 * forces a known pixel format so HEVC/HLG content (10-bit yuv420p10le)
 * doesn't confuse the palettegen PNG muxer.
 */
function buildScaleFilter({ gifFps, width }) {
  return `fps=${gifFps},scale=${width}:-1:flags=lanczos,format=yuv420p`;
}

/**
 * Build the `palettegen` filter expression with the user's options.
 *
 * Options (all optional):
 *   colors       — number of palette colors (default 256, max 256)
 *   statsMode    — 'diff' (default) or 'single'
 *   transparency — '0' or '1' (whether to include a transparency entry)
 */
function buildPaletteGenFilter({ colors, statsMode, transparency }) {
  const parts = ['palettegen'];
  // ffmpeg uses '=' between the filter name and its first sub-option,
  // and ':' between subsequent sub-options.
  const subOpts = [];
  if (statsMode) subOpts.push(`stats_mode=${statsMode}`);
  if (Number.isFinite(colors) && colors > 0) subOpts.push(`max_colors=${Math.min(256, colors)}`);
  if (transparency === '1') subOpts.push('reserve_transparent=1');
  if (subOpts.length) return `palettegen=${subOpts.join(':')}`;
  return 'palettegen';
}

/**
 * Build the `paletteuse` filter expression with the user's options.
 *
 * Options (all optional):
 *   dither       — 'bayer' (default), 'floyd_steinberg', 'sierra2', 'none'
 *   bayerScale   — 1..8, used only when dither === 'bayer' (default 5)
 */
function buildPaletteUseFilter({ dither, bayerScale }) {
  const useDither = dither || 'bayer';
  if (useDither === 'none') {
    return 'paletteuse=dither=none';
  }
  if (useDither === 'bayer') {
    const scale = Number.isFinite(bayerScale) ? Math.max(1, Math.min(8, bayerScale)) : 5;
    return `paletteuse=dither=bayer:bayer_scale=${scale}:diff_mode=rectangle`;
  }
  return `paletteuse=dither=${useDither}:diff_mode=rectangle`;
}

/**
 * Render a GIF from a contiguous segment of the input video.
 */
function renderSegment({
  input, outputPath, palettePath, start, duration, gifFps, width, loop,
  verbose, paletteOptions
}) {
  const seekArgs = start && start !== '0' ? ['-ss', String(start)] : [];
  const durationArgs = duration ? ['-t', String(duration)] : [];
  const vf = buildScaleFilter({ gifFps, width });
  const genFilter = `${vf},${buildPaletteGenFilter(paletteOptions)}`;
  const useFilter = buildPaletteUseFilter(paletteOptions);

  // Pass 1 — generate palette
  // We use `-frames:v 1 -update 1` to ensure the PNG muxer writes a single
  // image even on long videos (without these, the muxer errors out on
  // multi-frame input).
  const pass1 = [
    '-y',
    ...seekArgs,
    ...durationArgs,
    '-i', input,
    '-vf', genFilter,
    '-frames:v', '1',
    '-update', '1',
    palettePath
  ];
  ffmpeg.runFfmpeg(pass1, { verbose });

  // Pass 2 — render with palette
  const pass2 = [
    '-y',
    ...seekArgs,
    ...durationArgs,
    '-i', input,
    '-i', palettePath,
    '-filter_complex', `${vf}[x];[x][1:v]${useFilter}`,
    '-loop', String(loop),
    outputPath
  ];
  ffmpeg.runFfmpeg(pass2, { verbose });
}

/**
 * Render a GIF that summarizes the full video by sampling N frames
 * evenly across the timeline, padded out to keep the visual cadence.
 *
 * Strategy: use ffmpeg's `select` filter to pick 1 frame per time bucket,
 * then a `setpts` to give each frame a uniform display duration so the
 * resulting GIF covers the full video length at a stable pace.
 */
function renderSummary({
  input, outputPath, palettePath, frames, width, loop, verbose, paletteOptions
}) {
  const duration = ffmpeg.getDuration(input);
  if (!duration || duration <= 0) {
    throw new Error('Could not determine source video duration for summary mode');
  }
  if (frames < 2) {
    throw new Error('Summary mode requires --frames >= 2');
  }

  logger.info(`   Summary: sampling ${frames} frames across ${duration.toFixed(1)}s`);

  // Per-frame display duration in the output GIF. We want the output to
  // play through at the chosen GIF fps, so we derive displayDuration from
  // the user-provided --fps. (When --fps is not given, default to 12.)
  const gifFps = 12;
  const displayDuration = frames / gifFps; // seconds; each frame shown this long

  // Build an explicit per-timestamp frame list and use -framerate concat
  // via concat demuxer for predictable timing. The filter-graph form
  // `select='not(mod(n, K))'` is unreliable across codecs because 'n' is
  // the source-frame index, not a time-based index. Explicit timestamps
  // are bulletproof.
  const stamps = [];
  for (let i = 0; i < frames; i++) {
    // Place each sample at the midpoint of its time bucket.
    const t = ((i + 0.5) / frames) * duration;
    stamps.push(t);
  }
  logger.verbose(`   Sample timestamps: ${stamps.map(s => s.toFixed(2)).join(', ')}`);

  // 1) Extract one frame per timestamp as PNG into a temp dir.
  const frameDir = ffmpeg.tempFile('-frames').replace(/-frames$/, '');
  fs.mkdirSync(frameDir, { recursive: true });
  const framePaths = [];
  let listFile;
  try {
    for (let i = 0; i < stamps.length; i++) {
      const t = stamps[i];
      const out = path.join(frameDir, `frame-${String(i).padStart(4, '0')}.png`);
      const args = [
        '-y',
        '-ss', t.toFixed(3),
        '-i', input,
        '-frames:v', '1',
        '-vf', `scale=${width}:-1:flags=lanczos`,
        out
      ];
      execFileSync('ffmpeg', args, {
        stdio: verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
        maxBuffer: 64 * 1024 * 1024
      });
      framePaths.push(out);
    }

    // 2) Write a concat list for the demuxer.
    listFile = path.join(frameDir, 'list.txt');
    const listContent = framePaths
      .map(p => `file '${p.replace(/'/g, "'\\''")}'\nduration ${displayDuration.toFixed(3)}`)
      .join('\n');
    // The demuxer requires the final entry to be repeated without a duration
    // so the last frame isn't dropped.
    fs.writeFileSync(listFile, listContent + `\nfile '${framePaths[framePaths.length - 1].replace(/'/g, "'\\''")}'\n`);

    // 3) Build palette from the sampled frames (concatenated stream).
    const paletteArgs = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listFile,
      '-vf', buildPaletteGenFilter(paletteOptions),
      palettePath
    ];
    ffmpeg.runFfmpeg(paletteArgs, { verbose });

    // 4) Encode the GIF using the palette, with -framerate so the demuxer
    //    honors our per-frame durations.
    const gifArgs = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listFile,
      '-i', palettePath,
      '-framerate', String(gifFps),
      '-filter_complex', `[0:v]${buildPaletteUseFilter(paletteOptions)}`,
      '-loop', String(loop),
      outputPath
    ];
    ffmpeg.runFfmpeg(gifArgs, { verbose });
  } finally {
    // Clean up frame dir
    try {
      for (const p of framePaths) {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
      if (fs.existsSync(listFile)) fs.unlinkSync(listFile);
      fs.rmdirSync(frameDir);
    } catch (_) { /* best effort */ }
  }
}

/**
 * Render the entire video as a GIF. Two-pass palette over the full duration.
 */
function renderFull({
  input, outputPath, palettePath, gifFps, width, loop, verbose, paletteOptions
}) {
  const vf = buildScaleFilter({ gifFps, width });
  const genFilter = `${vf},${buildPaletteGenFilter(paletteOptions)}`;
  const useFilter = buildPaletteUseFilter(paletteOptions);

  const pass1 = [
    '-y',
    '-i', input,
    '-vf', genFilter,
    '-frames:v', '1',
    '-update', '1',
    palettePath
  ];
  ffmpeg.runFfmpeg(pass1, { verbose });

  const pass2 = [
    '-y',
    '-i', input,
    '-i', palettePath,
    '-filter_complex', `${vf}[x];[x][1:v]${useFilter}`,
    '-loop', String(loop),
    outputPath
  ];
  ffmpeg.runFfmpeg(pass2, { verbose });
}

/**
 * Create an animated GIF from a video file.
 *
 * @param {Object} options
 * @param {string} [options.input] - input video path (not required when batch=true)
 * @param {string} [options.output] - output filename
 * @param {string} [options.outputDir] - default public/assets/gifs/
 * @param {boolean} [options.batch] - process every video in --batchInput
 * @param {string} [options.batchInput] - batch source dir (default: process_video)
 * @param {string} [options.recipe] - 'tiny' | 'flipbook' | 'flat' | 'loop-once'
 * @param {'segment'|'summary'|'full'} [options.mode] - default 'segment'
 * @param {string} [options.start] - segment mode only
 * @param {string|number} [options.duration] - segment mode only
 * @param {number} [options.frames] - summary mode only (default 12)
 * @param {number} [options.fps] - gif fps (default 12)
 * @param {number} [options.width] - output width (default 480)
 * @param {number|string} [options.loop] - 'infinite' | 'none' | number (default 0)
 * @param {number} [options.colors] - palette colors (1..256, default 256)
 * @param {string} [options.dither] - 'bayer' (default) | 'floyd_steinberg' | 'sierra2' | 'none'
 * @param {number} [options.ditherScale] - bayer scale 1..8 (default 5)
 * @param {string} [options.statsMode] - 'diff' (default) | 'single'
 * @param {boolean} [options.transparent] - reserve a transparent palette entry
 * @param {boolean} [options.overwrite] - in batch mode, overwrite existing GIFs
 * @param {boolean} [options.verbose]
 */
async function createGif(options = {}) {
  // Apply recipe first — recipes set defaults that user flags can override.
  const resolved = applyRecipe(options);

  const {
    input,
    output,
    outputDir = 'public/assets/gifs/',
    batch = false,
    batchInput = 'process_video',
    recipe,
    mode = 'segment',
    start = '0',
    duration,
    frames = 12,
    fps = 12,
    width = 480,
    loop = 0,
    colors = 256,
    dither = 'bayer',
    ditherScale = 5,
    statsMode = 'diff',
    transparent = false,
    overwrite = false,
    verbose = false
  } = resolved;

  if (verbose) logger.setVerbose(true);

  // Batch mode: process every video in the input directory.
  if (batch) {
    return runBatch(resolved);
  }

  if (!input) {
    throw new Error(
      'No input file specified. Use --input <file> or --batch to process all videos in process_video/.'
    );
  }

  if (!MODES.includes(mode)) {
    throw new Error(`Unknown mode '${mode}'. Available: ${MODES.join(', ')}`);
  }
  if (!DITHERS.includes(dither)) {
    throw new Error(`Unknown dither '${dither}'. Available: ${DITHERS.join(', ')}`);
  }
  if (!STATS_MODES.includes(statsMode)) {
    throw new Error(`Unknown stats mode '${statsMode}'. Available: ${STATS_MODES.join(', ')}`);
  }
  const loopValue = parseLoop(loop);

  await checkDependencies([DEPENDENCIES.ffmpeg], { logger, autoInstall: false });

  if (!fs.existsSync(input)) {
    throw new Error(`Input file not found: ${input}`);
  }

  ffmpeg.ensureDir(outputDir);

  const basename = path.basename(input, path.extname(input));
  const defaultName = `${basename}.gif`;
  // If user passed a path (absolute or containing a dir separator) via --output,
  // respect it as-is. Otherwise join it under outputDir.
  let outputPath;
  if (output && (path.isAbsolute(output) || output.includes('/') || output.includes('\\'))) {
    outputPath = output;
    ffmpeg.ensureDir(path.dirname(outputPath));
  } else {
    outputPath = path.join(outputDir, output || defaultName);
  }
  const palettePath = ffmpeg.tempFile('.png');

  const gifFps = Number(fps) || 12;
  const targetWidth = Number(width) || 480;

  const paletteOptions = {
    colors: Number.isFinite(Number(colors)) ? Number(colors) : 256,
    statsMode,
    dither,
    bayerScale: Number.isFinite(Number(ditherScale)) ? Number(ditherScale) : 5,
    transparency: transparent ? '1' : '0'
  };

  logger.info(`\n🎞️  Creating GIF from ${input}`);
  logger.info(`   Output:  ${outputPath}`);
  if (recipe) logger.info(`   Recipe:  ${recipe}`);
  logger.info(`   Mode:    ${mode}`);
  logger.info(`   Width:   ${targetWidth}px · ${gifFps} fps · loop=${loopValue} (${loopLabel(loopValue)})`);
  logger.info(`   Palette: ${paletteOptions.colors} colors · dither=${dither}${dither === 'bayer' ? ` scale=${paletteOptions.bayerScale}` : ''} · stats=${statsMode}`);

  if (mode === 'segment' && start !== '0') {
    logger.info(`   Start:   ${start}s${duration ? ` · duration ${duration}s` : ''}`);
  }
  if (mode === 'summary') {
    logger.info(`   Frames:  ${frames} (evenly spaced across full timeline)`);
  }
  if (mode === 'full') {
    logger.info(`   Range:   full video`);
  }

  try {
    const renderArgs = {
      input,
      outputPath,
      palettePath,
      width: targetWidth,
      gifFps,
      loop: loopValue,
      verbose,
      paletteOptions
    };

    if (mode === 'segment') {
      renderSegment({ ...renderArgs, start, duration });
    } else if (mode === 'summary') {
      renderSummary({ ...renderArgs, frames: Number(frames) || 12 });
    } else {
      renderFull(renderArgs);
    }

    if (fs.existsSync(palettePath)) fs.unlinkSync(palettePath);

    const inBytes = fs.statSync(input).size;
    const outBytes = fs.statSync(outputPath).size;
    logger.success(`\nGIF created: ${outputPath}`);
    logger.info(`   Input:  ${(inBytes / 1024 / 1024).toFixed(2)} MB`);
    logger.info(`   Output: ${(outBytes / 1024 / 1024).toFixed(2)} MB\n`);
    return { input, output: outputPath };
  } catch (err) {
    if (fs.existsSync(palettePath)) fs.unlinkSync(palettePath);
    logger.error(`GIF creation failed: ${err.message}`);
    throw err;
  }
}

/**
 * Human label for the resolved loop value.
 */
function loopLabel(value) {
  if (value === 0) return 'infinite';
  if (value === -1) return 'no loop';
  return `${value}x`;
}

module.exports = createGif;
module.exports.MODES = MODES;
module.exports.DITHERS = DITHERS;
module.exports.STATS_MODES = STATS_MODES;
module.exports.RECIPES = RECIPES;
module.exports.VIDEO_EXTENSIONS = VIDEO_EXTENSIONS;
module.exports.renderSegment = renderSegment;
module.exports.renderSummary = renderSummary;
module.exports.renderFull = renderFull;
module.exports.runBatch = runBatch;
module.exports.listVideoFiles = listVideoFiles;
module.exports.probeFps = probeFps;
module.exports.parseLoop = parseLoop;
module.exports.buildPaletteGenFilter = buildPaletteGenFilter;
module.exports.buildPaletteUseFilter = buildPaletteUseFilter;
