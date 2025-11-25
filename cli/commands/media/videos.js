const { execSync } = require('child_process');
const path = require('path');
const logger = require('../../lib/utils/logger');
const { checkDependencies, DEPENDENCIES } = require('../../lib/media/dependencies');

/**
 * Video processing presets
 */
const PRESETS = {
  'web-mp4': {
    name: 'Web-optimized MP4',
    description: 'Convert to web-optimized MP4 format',
    getConversions: (inputFile, baseName) => [
      { inputName: inputFile, outputName: `${baseName}.mp4` }
    ]
  },
  'extract-audio': {
    name: 'Extract Audio',
    description: 'Extract audio track to MP3',
    getConversions: (inputFile, baseName) => [
      { inputName: inputFile, outputName: `${baseName}.mp3` }
    ]
  },
  'web-ready': {
    name: 'Web Ready',
    description: 'Create both MP4 video and MP3 audio',
    getConversions: (inputFile, baseName) => [
      { inputName: inputFile, outputName: `${baseName}.mp4` },
      { inputName: inputFile, outputName: `${baseName}.mp3` }
    ]
  },
  'gif': {
    name: 'Animated GIF',
    description: 'Convert to animated GIF',
    getConversions: (inputFile, baseName) => [
      { inputName: inputFile, outputName: `${baseName}.gif` }
    ]
  }
};

/**
 * Process videos with FFmpeg
 * @param {Object} options - Processing options
 * @param {string} options.conversions - JSON string of conversion mappings
 * @param {string} options.preset - Preset name (web-mp4, extract-audio, web-ready, gif)
 * @param {string} options.input - Input file (required if using preset)
 * @param {string} options.scriptPath - Path to processing script
 * @param {boolean} options.verbose - Verbose output
 * @returns {Promise<Object>} Processing results
 */
async function processVideos(options = {}) {
  const {
    conversions,
    preset,
    input,
    scriptPath = 'process_video/convert_videos.sh',
    verbose = false
  } = options;

  logger.setVerbose(verbose);
  logger.info('🎬 Starting video processing...', 'cyan');

  try {
    // Check dependencies
    logger.info('\n🔍 Checking dependencies...');
    await checkDependencies(
      [DEPENDENCIES.ffmpeg, DEPENDENCIES.ffprobe, DEPENDENCIES.jq],
      {
        autoInstall: true,
        required: true,
        logger
      }
    );

    let conversionsArray;
    let conversionsJson;

    // Handle preset mode
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

      conversionsArray = presetConfig.getConversions(input, baseName);
      conversionsJson = JSON.stringify(conversionsArray);

      logger.verbose(`Generated conversions: ${conversionsJson}`);
    }
    // Handle manual conversions JSON
    else if (conversions) {
      conversionsJson = conversions;

      // Validate JSON
      try {
        conversionsArray = JSON.parse(conversionsJson);

        if (!Array.isArray(conversionsArray)) {
          throw new Error('Conversions must be an array');
        }

        for (let i = 0; i < conversionsArray.length; i++) {
          const conversion = conversionsArray[i];
          if (!conversion.inputName || !conversion.outputName) {
            throw new Error(`Conversion ${i + 1} missing inputName or outputName`);
          }
        }
      } catch (error) {
        throw new Error(`Invalid conversions JSON: ${error.message}`);
      }
    } else {
      throw new Error('Either conversions JSON or preset with input file required');
    }

    // Build the command
    const cwd = process.cwd();
    const scriptDir = path.dirname(scriptPath);
    const scriptFile = path.basename(scriptPath);

    const command = `./${scriptFile} '${conversionsJson}'`;

    logger.info(`\n🎥 Processing ${conversionsArray.length} video conversion(s)...`, 'blue');
    
    conversionsArray.forEach((conv, idx) => {
      logger.info(`   ${idx + 1}. ${conv.inputName} → ${conv.outputName}`);
    });

    logger.verbose(`\nCommand: ${command}`);
    logger.verbose(`Working directory: ${path.join(cwd, scriptDir)}`);

    // Execute the processing script
    execSync(command, {
      stdio: verbose ? 'inherit' : 'pipe',
      cwd: path.join(cwd, scriptDir)
    });

    logger.success('\n✅ Video processing completed!', 'green');

    return {
      success: true,
      conversions: conversionsArray,
      preset: preset || null
    };
  } catch (error) {
    logger.error(`\n❌ Video processing failed: ${error.message}`);
    throw error;
  }
}

/**
 * List available presets
 * @returns {Object} Presets
 */
function listPresets() {
  return PRESETS;
}

module.exports = processVideos;
module.exports.listPresets = listPresets;
module.exports.PRESETS = PRESETS;
