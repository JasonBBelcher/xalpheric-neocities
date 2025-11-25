const logger = require('../../lib/utils/logger');
const { listFiles } = require('../../lib/api/list');

/**
 * Tier limits in MB
 */
const TIER_LIMITS = {
  free: 1024, // 1 GB
  supporter: 50 * 1024 // 50 GB
};

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Bytes
 * @param {number} decimals - Decimal places
 * @returns {string} - Formatted size
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Calculate storage statistics
 * @param {Array} files - File list from API
 * @returns {Object} - Storage statistics
 */
function calculateStats(files) {
  let totalSize = 0;
  let fileCount = 0;

  function processFiles(fileList) {
    fileList.forEach(file => {
      if (!file.is_directory && file.size) {
        totalSize += file.size;
        fileCount++;
      }
    });
  }

  processFiles(files);

  const totalMB = totalSize / (1024 * 1024);
  const totalGB = totalSize / (1024 * 1024 * 1024);
  
  const freeTierUsedPercent = (totalMB / TIER_LIMITS.free) * 100;
  const supporterTierUsedPercent = (totalMB / TIER_LIMITS.supporter) * 100;
  
  const freeTierRemaining = TIER_LIMITS.free - totalMB;
  const supporterTierRemaining = TIER_LIMITS.supporter - totalMB;

  return {
    fileCount,
    totalSize,
    totalMB,
    totalGB,
    freeTierUsedPercent,
    supporterTierUsedPercent,
    freeTierRemaining,
    supporterTierRemaining
  };
}

/**
 * Check Neocities storage usage
 * @param {string} apiKey - Neocities API key
 * @param {Object} options - Check options
 * @param {boolean} options.verbose - Verbose output
 * @param {boolean} options.json - Output as JSON
 * @returns {Promise<Object>} - Storage statistics
 */
async function checkStorage(apiKey, options = {}) {
  const { verbose = false, json = false } = options;

  logger.setVerbose(verbose);

  try {
    // Get file list from Neocities
    logger.verbose('Fetching file list from Neocities...');
    const files = await listFiles(apiKey);
    
    // Calculate statistics
    const stats = calculateStats(files);

    // Output results
    if (json) {
      console.log(JSON.stringify(stats, null, 2));
      return stats;
    }

    // Pretty output
    logger.info('📊 Neocities Storage Usage:', 'cyan');
    logger.info('─'.repeat(40));
    logger.info(`   Total files: ${stats.fileCount}`);
    logger.info(`   Total size: ${stats.totalMB.toFixed(2)} MB (${stats.totalGB.toFixed(3)} GB)`);
    logger.info('');
    logger.info('   Tier Limits:');
    logger.info(`   • Free tier: 1 GB`);
    logger.info(`   • Supporter tier: 50 GB`);
    logger.info('');
    logger.info(`   Free tier:`);
    logger.info(`     Used: ${stats.freeTierUsedPercent.toFixed(1)}%`);
    logger.info(`     Remaining: ${stats.freeTierRemaining.toFixed(2)} MB`);
    
    if (stats.freeTierUsedPercent > 80) {
      logger.warn(`     ⚠️  Approaching free tier limit!`);
    }
    
    logger.info('');
    logger.info(`   Supporter tier:`);
    logger.info(`     Used: ${stats.supporterTierUsedPercent.toFixed(1)}%`);
    logger.info(`     Remaining: ${stats.supporterTierRemaining.toFixed(2)} MB`);
    logger.info('─'.repeat(40));

    // Top files by size (if verbose)
    if (verbose) {
      logger.info('\n📁 Top 10 largest files:');
      
      const fileList = files
        .filter(f => !f.is_directory && f.size)
        .sort((a, b) => b.size - a.size)
        .slice(0, 10);

      fileList.forEach((file, idx) => {
        logger.info(`   ${idx + 1}. ${file.path} - ${formatBytes(file.size)}`);
      });
    }

    return stats;
  } catch (error) {
    logger.error(`❌ Failed to check storage: ${error.message}`);
    throw error;
  }
}

module.exports = checkStorage;
module.exports.calculateStats = calculateStats;
module.exports.formatBytes = formatBytes;
