const fs = require('fs');
const path = require('path');
const logger = require('../../lib/utils/logger');
const { checkDependencies, DEPENDENCIES } = require('../../lib/media/dependencies');
const ffmpeg = require('../../lib/media/ffmpeg');

/**
 * Built-in conversion profiles.
 * Each profile receives the input file + an outputPath and returns the
 * ffmpeg args to produce the desired output.
 */
const PROFILES = {
  mp3: {
    description: 'Extract audio to MP3 (192k)',
    buildArgs: ({ input, outputPath }) => [
      '-y',
      '-i', input,
      '-vn',
      '-acodec', 'libmp3lame',
      '-ab', '192k',
      outputPath
    ]
  },
  wav: {
    description: 'Extract audio to WAV (PCM 16-bit)',
    buildArgs: ({ input, outputPath }) => [
      '-y',
      '-i', input,
      '-vn',
      '-acodec', 'pcm_s16le',
      outputPath
    ]
  },
  mp4: {
    description: 'Web-optimized MP4 (H.264 + AAC, faststart)',
    needsVideoInfo: true,
    buildArgs: ({ input, outputPath, videoInfo }) => {
      // Cap at 1920p for web delivery, but don't upscale.
      const scaleFilter = ffmpeg.webScaleFilter(videoInfo.width, 1920);
      const args = [
        '-y',
        '-i', input,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-maxrate', '2M',
        '-bufsize', '4M',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart'
      ];
      if (scaleFilter) args.push('-vf', scaleFilter);
      args.push(outputPath);
      return args;
    }
  },
  webm: {
    description: 'WebM (VP9 + Opus)',
    needsVideoInfo: true,
    buildArgs: ({ input, outputPath, videoInfo }) => {
      const scaleFilter = ffmpeg.webScaleFilter(videoInfo.width, 1920);
      const args = [
        '-y',
        '-i', input,
        '-c:v', 'libvpx-vp9',
        '-crf', '30',
        '-b:v', '0',
        '-maxrate', '2M',
        '-bufsize', '4M',
        '-c:a', 'libopus',
        '-b:a', '128k'
      ];
      if (scaleFilter) args.push('-vf', scaleFilter);
      args.push(outputPath);
      return args;
    }
  },
  mov: {
    description: 'MOV (H.264 + AAC, faststart)',
    buildArgs: ({ input, outputPath }) => [
      '-y',
      '-i', input,
      '-c:v', 'libx264',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputPath
    ]
  }
};

/**
 * Resolve the output format from a filename's extension.
 *
 * @param {string} outputName
 * @returns {string} format key (lowercase, no dot)
 */
function formatFromOutputName(outputName) {
  return path.extname(outputName).slice(1).toLowerCase();
}

/**
 * Convert one entry: { inputName, outputName, outputDir? }
 * outputDir defaults to public/music (matches the previous bash script).
 *
 * @param {Object} entry
 * @param {boolean} verbose
 * @returns {Promise<{input: string, output: string, format: string, bytes: number} | null>}
 */
async function convertOne(entry, verbose) {
  const { inputName, outputName, outputDir = 'public/music' } = entry;

  if (!fs.existsSync(inputName)) {
    logger.warn(`Input file not found, skipping: ${inputName}`);
    return null;
  }

  const format = formatFromOutputName(outputName);
  const profile = PROFILES[format];
  if (!profile) {
    logger.warn(`Unsupported output format '.${format}', skipping: ${outputName}`);
    return null;
  }

  ffmpeg.ensureDir(outputDir);
  // If outputName already includes a path, respect it; otherwise join with outputDir.
  const outputPath = (path.isAbsolute(outputName) || outputName.includes('/') || outputName.includes('\\'))
    ? outputName
    : path.join(outputDir, outputName);
  ffmpeg.ensureDir(path.dirname(outputPath));

  // Probe once for video info if the profile needs it.
  let videoInfo = { width: null, height: null, codec: null };
  if (profile.needsVideoInfo) {
    videoInfo = ffmpeg.getVideoStreamInfo(inputName);
    logger.verbose(`Input: ${path.basename(inputName)} — ${videoInfo.codec || 'audio-only'} ${videoInfo.width || '?'}x${videoInfo.height || '?'}`);
  }

  logger.info(`\n🔄 Converting: ${path.basename(inputName)} → ${path.basename(outputPath)} (${format})`);
  const args = profile.buildArgs({ input: inputName, outputPath, videoInfo });
  ffmpeg.runFfmpeg(args, { verbose });

  const inBytes = fs.statSync(inputName).size;
  const outBytes = fs.statSync(outputPath).size;
  logger.success(`✅ Done: ${path.basename(outputPath)}`);
  logger.info(`   ${(inBytes / 1024 / 1024).toFixed(2)} MB → ${(outBytes / 1024 / 1024).toFixed(2)} MB`);
  return { input: inputName, output: outputPath, format, bytes: outBytes };
}

/**
 * Public presets — produce conversion mappings for common workflows.
 */
const PRESETS = {
  'web-mp4': {
    name: 'Web-optimized MP4',
    description: PROFILES.mp4.description,
    getConversions: (inputFile, baseName, outputDir) => [
      { inputName: inputFile, outputName: `${baseName}.mp4`, outputDir: outputDir || 'public/music' }
    ]
  },
  'extract-audio': {
    name: 'Extract Audio',
    description: PROFILES.mp3.description,
    getConversions: (inputFile, baseName, outputDir) => [
      { inputName: inputFile, outputName: `${baseName}.mp3`, outputDir: outputDir || 'public/music' }
    ]
  },
  'web-ready': {
    name: 'Web Ready',
    description: 'Create both MP4 video and MP3 audio',
    getConversions: (inputFile, baseName, outputDir) => [
      { inputName: inputFile, outputName: `${baseName}.mp4`, outputDir: outputDir || 'public/music' },
      { inputName: inputFile, outputName: `${baseName}.mp3`, outputDir: outputDir || 'public/music' }
    ]
  },
  'gif': {
    name: 'Animated GIF',
    description: 'Convert to animated GIF (use the dedicated media gif command for summary mode)',
    getConversions: (inputFile, baseName, outputDir) => [
      { inputName: inputFile, outputName: `${baseName}.gif`, outputDir: outputDir || 'public/music' }
    ]
  }
};

/**
 * Validate a manual conversions array. Throws on invalid input.
 *
 * @param {string} conversionsJson
 * @returns {Array<{inputName: string, outputName: string, outputDir?: string}>}
 */
function parseConversions(conversionsJson) {
  let parsed;
  try {
    parsed = JSON.parse(conversionsJson);
  } catch (e) {
    throw new Error(`Invalid conversions JSON: ${e.message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Conversions must be an array');
  }
  parsed.forEach((c, i) => {
    if (!c || !c.inputName || !c.outputName) {
      throw new Error(`Conversion ${i + 1} missing inputName or outputName`);
    }
  });
  return parsed;
}

/**
 * Process videos with ffmpeg.
 * @param {Object} options
 * @param {string} [options.conversions] - JSON array of conversion mappings
 * @param {string} [options.preset] - preset name
 * @param {string} [options.input] - input file (required with preset)
 * @param {string} [options.outputDir] - default output directory (default: public/music)
 * @param {boolean} [options.verbose]
 * @returns {Promise<{success: boolean, conversions: Array, preset: string|null, results: Array}>}
 */
async function processVideos(options = {}) {
  const {
    conversions,
    preset,
    input,
    outputDir = 'public/music',
    verbose = false
  } = options;

  logger.setVerbose(verbose);
  logger.info('🎬 Starting video processing...', 'cyan');

  try {
    logger.info('\n🔍 Checking dependencies...');
    await checkDependencies(
      [DEPENDENCIES.ffmpeg, DEPENDENCIES.ffprobe],
      { autoInstall: true, required: true, logger }
    );

    let conversionsArray;

    if (preset) {
      if (!input) {
        throw new Error('Input file required when using preset');
      }
      if (!PRESETS[preset]) {
        const available = Object.keys(PRESETS).join(', ');
        throw new Error(`Unknown preset "${preset}". Available: ${available}`);
      }
      const baseName = path.basename(input, path.extname(input));
      const presetConfig = PRESETS[preset];
      logger.info(`\n🎯 Using preset: ${presetConfig.name}`, 'blue');
      logger.info(`   ${presetConfig.description}`);
      conversionsArray = presetConfig.getConversions(input, baseName, outputDir);
      logger.verbose(`Generated conversions: ${JSON.stringify(conversionsArray)}`);
    } else if (conversions) {
      conversionsArray = parseConversions(conversions);
    } else {
      throw new Error('Either conversions JSON or preset with input file required');
    }

    if (conversionsArray.length === 0) {
      logger.warn('No conversions to process.');
      return { success: true, conversions: [], preset: preset || null, results: [] };
    }

    logger.info(`\n🎥 Processing ${conversionsArray.length} video conversion(s)...`, 'blue');
    conversionsArray.forEach((conv, idx) => {
      logger.info(`   ${idx + 1}. ${conv.inputName} → ${path.join(conv.outputDir || outputDir, conv.outputName)}`);
    });

    const results = [];
    for (const conv of conversionsArray) {
      const result = await convertOne({ ...conv, outputDir: conv.outputDir || outputDir }, verbose);
      if (result) results.push(result);
    }

    logger.success('\n✅ Video processing completed!', 'green');
    return { success: true, conversions: conversionsArray, preset: preset || null, results };
  } catch (error) {
    logger.error(`\n❌ Video processing failed: ${error.message}`);
    throw error;
  }
}

function listPresets() {
  return PRESETS;
}

module.exports = processVideos;
module.exports.listPresets = listPresets;
module.exports.PRESETS = PRESETS;
module.exports.PROFILES = PROFILES;
module.exports.parseConversions = parseConversions;
module.exports.formatFromOutputName = formatFromOutputName;
