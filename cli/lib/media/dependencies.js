const { execSync } = require('child_process');
const readline = require('readline');

/**
 * Check if a command is available in PATH
 * @param {string} command - Command to check
 * @returns {boolean} - True if command exists
 */
function checkCommand(command) {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Prompt user to install missing dependencies
 * @param {Array} missing - Array of missing dependencies
 * @returns {Promise<boolean>} - User's response
 */
async function promptInstall(missing) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const depNames = missing.map(d => d.name).join(', ');
    rl.question(
      `\n🤔 Would you like to attempt to install missing dependencies (${depNames})? (y/N): `,
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      }
    );
  });
}

/**
 * Attempt to install a dependency using system package manager
 * @param {string} command - Command to install
 * @param {Object} logger - Logger instance
 * @returns {Promise<boolean>} - Success status
 */
async function attemptInstall(command, logger) {
  logger.info(`🔧 Attempting to install ${command}...`);

  try {
    const platform = process.platform;

    if (platform === 'darwin') {
      logger.info('📦 Using Homebrew...');
      execSync(`brew install ${command}`, { stdio: 'inherit' });
    } else if (platform === 'linux') {
      logger.info('📦 Using apt package manager...');
      // Map command names to package names if needed
      const packageName = command === 'magick' ? 'imagemagick' : command;
      execSync(`sudo apt update && sudo apt install -y ${packageName}`, {
        stdio: 'inherit'
      });
    } else {
      throw new Error(`Automatic installation not supported on ${platform}`);
    }

    logger.success(`✅ ${command} installation completed!`);
    return true;
  } catch (error) {
    logger.error(`❌ Failed to install ${command}: ${error.message}`);
    return false;
  }
}

/**
 * Check and optionally install dependencies
 * @param {Array} dependencies - Array of dependency objects with command, name, installInstructions
 * @param {Object} options - Options
 * @param {boolean} options.autoInstall - Attempt automatic installation if missing
 * @param {boolean} options.required - Exit if dependencies missing (default: true)
 * @param {Object} options.logger - Logger instance
 * @returns {Promise<Object>} - { available: boolean, missing: Array }
 */
async function checkDependencies(dependencies, options = {}) {
  const {
    autoInstall = true,
    required = true,
    logger = console
  } = options;

  logger.info('🔍 Checking dependencies...\n');

  const missing = [];

  for (const dep of dependencies) {
    logger.info(`Checking ${dep.name}...`);
    if (!checkCommand(dep.command)) {
      logger.error(`❌ ${dep.name} is not installed or not in PATH`);
      if (dep.installInstructions) {
        logger.info('💡 Install instructions:');
        Object.entries(dep.installInstructions).forEach(([platform, instruction]) => {
          logger.info(`   ${platform}: ${instruction}`);
        });
      }
      missing.push(dep);
    } else {
      logger.success(`✅ ${dep.name} is available`);
    }
  }

  if (missing.length === 0) {
    logger.success('\n✅ All dependencies are available!\n');
    return { available: true, missing: [] };
  }

  logger.warn(`\n⚠️  Missing ${missing.length} required dependencies`);

  // Attempt auto-installation if enabled
  if (autoInstall) {
    const shouldInstall = await promptInstall(missing);

    if (shouldInstall) {
      let allInstalled = true;
      for (const dep of missing) {
        const success = await attemptInstall(dep.command, logger);
        if (!success) {
          allInstalled = false;
        }
      }

      if (allInstalled) {
        logger.success('\n✅ All dependencies installed successfully!\n');
        return { available: true, missing: [] };
      }
    }
  }

  // Handle missing dependencies
  if (required) {
    logger.error('\n❌ Cannot proceed without required dependencies.');
    logger.info('💡 Please install them manually and try again.');
    throw new Error('Missing required dependencies');
  }

  return { available: false, missing };
}

/**
 * Common media processing dependencies
 */
const DEPENDENCIES = {
  imagemagick: {
    command: 'magick',
    name: 'ImageMagick',
    installInstructions: {
      'macOS': 'brew install imagemagick',
      'Ubuntu/Debian': 'sudo apt install imagemagick',
      'RHEL/CentOS': 'sudo yum install ImageMagick',
      'Windows': 'Download from https://imagemagick.org/script/download.php'
    }
  },
  sharp: {
    command: 'node',
    name: 'Sharp (Node.js image processing)',
    installInstructions: {
      'All platforms': 'npm install sharp'
    }
  },
  ffmpeg: {
    command: 'ffmpeg',
    name: 'FFmpeg',
    installInstructions: {
      'macOS': 'brew install ffmpeg',
      'Ubuntu/Debian': 'sudo apt install ffmpeg',
      'RHEL/CentOS': 'sudo yum install ffmpeg',
      'Windows': 'Download from https://ffmpeg.org/download.html'
    }
  },
  ffprobe: {
    command: 'ffprobe',
    name: 'FFprobe (video analysis)',
    installInstructions: {
      'macOS': 'brew install ffmpeg (includes ffprobe)',
      'Ubuntu/Debian': 'sudo apt install ffmpeg (includes ffprobe)',
      'RHEL/CentOS': 'sudo yum install ffmpeg (includes ffprobe)',
      'Windows': 'Download from https://ffmpeg.org/download.html'
    }
  },
  jq: {
    command: 'jq',
    name: 'jq (JSON processor)',
    installInstructions: {
      'macOS': 'brew install jq',
      'Ubuntu/Debian': 'sudo apt install jq',
      'RHEL/CentOS': 'sudo yum install jq',
      'Windows': 'Download from https://jqlang.github.io/jq/download/'
    }
  }
};

module.exports = {
  checkCommand,
  promptInstall,
  attemptInstall,
  checkDependencies,
  DEPENDENCIES
};
