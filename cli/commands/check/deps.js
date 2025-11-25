const { execSync } = require('child_process');
const logger = require('../../lib/utils/logger');

/**
 * System dependencies to check
 */
const SYSTEM_DEPS = [
  { command: 'magick', name: 'ImageMagick', needed: 'photo processing' },
  { command: 'ffmpeg', name: 'FFmpeg', needed: 'video processing' },
  { command: 'ffprobe', name: 'FFprobe', needed: 'video processing (analysis)' },
  { command: 'jq', name: 'jq', needed: 'video processing (JSON handling)' }
];

/**
 * Node.js dependencies to check
 */
const NODE_DEPS = [
  'form-data',
  'markdown-it',
  'commander',
  'dotenv',
  'node-fetch'
];

/**
 * Check if a command is available
 * @param {string} command - Command to check
 * @returns {boolean} - True if available
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
 * Check if a Node module is available
 * @param {string} moduleName - Module name
 * @returns {boolean} - True if available
 */
function checkNodeModule(moduleName) {
  try {
    require(moduleName);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check all project dependencies
 * @param {Object} options - Check options
 * @param {boolean} options.verbose - Verbose output
 * @returns {Promise<Object>} - Check results
 */
async function checkDeps(options = {}) {
  const { verbose = false } = options;

  logger.setVerbose(verbose);
  logger.info('🔍 Checking all project dependencies...\n', 'cyan');

  const results = {
    system: { available: [], missing: [] },
    node: { available: [], missing: [] }
  };

  // Check system dependencies
  logger.info('📋 System Dependencies:', 'blue');
  
  for (const dep of SYSTEM_DEPS) {
    if (checkCommand(dep.command)) {
      logger.success(`✅ ${dep.name} - available`);
      results.system.available.push(dep);
    } else {
      logger.error(`❌ ${dep.name} - missing (needed for ${dep.needed})`);
      results.system.missing.push(dep);
    }
  }

  // Check Node.js dependencies
  logger.info('\n📋 Node.js Dependencies:', 'blue');
  
  for (const pkg of NODE_DEPS) {
    if (checkNodeModule(pkg)) {
      logger.success(`✅ ${pkg} - available`);
      results.node.available.push(pkg);
    } else {
      logger.error(`❌ ${pkg} - missing`);
      results.node.missing.push(pkg);
    }
  }

  // Summary
  const totalMissing = results.system.missing.length + results.node.missing.length;
  
  logger.info('');
  if (totalMissing === 0) {
    logger.success('✅ All dependencies are available!', 'green');
  } else {
    logger.error(`⚠️  ${totalMissing} dependencies are missing`);
    logger.info('\n💡 Installation suggestions:');
    
    if (results.system.missing.length > 0) {
      logger.info('\nSystem dependencies:');
      if (process.platform === 'darwin') {
        const commands = results.system.missing
          .map(d => `  brew install ${d.command === 'magick' ? 'imagemagick' : d.command}`)
          .join('\n');
        logger.info(commands);
      } else if (process.platform === 'linux') {
        const commands = results.system.missing
          .map(d => `  sudo apt install ${d.command === 'magick' ? 'imagemagick' : d.command}`)
          .join('\n');
        logger.info(commands);
      }
    }
    
    if (results.node.missing.length > 0) {
      logger.info('\nNode.js dependencies:');
      logger.info(`  npm install ${results.node.missing.join(' ')}`);
    }
  }

  return {
    success: totalMissing === 0,
    results
  };
}

module.exports = checkDeps;
