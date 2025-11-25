const { execSync } = require('child_process');
const path = require('path');
const logger = require('../../lib/utils/logger');
const { checkDependencies, DEPENDENCIES } = require('../../lib/media/dependencies');

/**
 * Process photos with ImageMagick
 * @param {Object} options - Processing options
 * @param {string} options.size - Target size (e.g., '512x512', '1024x1024')
 * @param {string} options.format - Output format (jpg, png, webp)
 * @param {string} options.naming - Naming pattern (e.g., 'photo{increment}')
 * @param {string} options.scriptPath - Path to processing script
 * @param {boolean} options.verbose - Verbose output
 * @returns {Promise<Object>} Processing results
 */
async function processPhotos(options = {}) {
  const {
    size,
    format,
    naming = '',
    scriptPath = 'process_photos/run_me.sh',
    verbose = false
  } = options;

  logger.setVerbose(verbose);
  logger.info('📷 Starting photo processing...', 'cyan');

  // Validate required options
  if (!size) {
    throw new Error('Size parameter is required (e.g., 512x512)');
  }
  if (!format) {
    throw new Error('Format parameter is required (jpg, png, webp)');
  }

  try {
    // Check dependencies
    logger.info('\n🔍 Checking dependencies...');
    await checkDependencies(
      [DEPENDENCIES.imagemagick],
      {
        autoInstall: true,
        required: true,
        logger
      }
    );

    // Build the command
    const cwd = process.cwd();
    const scriptDir = path.dirname(scriptPath);
    const scriptFile = path.basename(scriptPath);

    let command = `./${scriptFile} ${size} ${format}`;
    if (naming) {
      command += ` "${naming}"`;
    }

    logger.info(`\n📸 Processing photos...`, 'blue');
    logger.verbose(`Command: ${command}`);
    logger.verbose(`Working directory: ${path.join(cwd, scriptDir)}`);
    logger.info(`   Size: ${size}`);
    logger.info(`   Format: ${format}`);
    if (naming) {
      logger.info(`   Naming: ${naming}`);
    }

    // Execute the processing script
    execSync(command, {
      stdio: verbose ? 'inherit' : 'pipe',
      cwd: path.join(cwd, scriptDir)
    });

    logger.success('\n✅ Photo processing completed!', 'green');

    return {
      success: true,
      size,
      format,
      naming
    };
  } catch (error) {
    logger.error(`\n❌ Photo processing failed: ${error.message}`);
    throw error;
  }
}

module.exports = processPhotos;
