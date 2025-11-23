const { getLocalFiles } = require('../../lib/utils/files');
const { uploadFiles } = require('../../lib/api/upload');
const logger = require('../../lib/utils/logger');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Deploy entire site (all files from public directory)
 * 
 * @param {string} apiKey - Neocities API key
 * @param {Object} options - Deployment options
 * @param {string} [options.publicDir='public'] - Public directory path
 * @param {boolean} [options.force=false] - Skip confirmation prompt
 * @param {boolean} [options.dryRun=false] - Simulate deployment without uploading
 * @param {boolean} [options.verbose=false] - Show detailed logging
 * @returns {Promise<Object>} Deployment results
 */
async function deployFull(apiKey, options = {}) {
  const {
    publicDir = 'public',
    force = false,
    dryRun = false,
    verbose = false
  } = options;

  logger.setVerbose(verbose);

  if (verbose) {
    logger.info('🌐 Deploying full site...');
    logger.info(`   Public directory: ${publicDir}`);
  }

  // Get all files from public directory
  const localFiles = await getLocalFiles(publicDir);

  if (localFiles.length === 0) {
    logger.info('ℹ️  No files found in public directory');
    return {
      uploaded: 0,
      failed: 0,
      total: 0
    };
  }

  // Prepare file list for upload
  const filesToUpload = localFiles.map(file => {
    const relativePath = path.relative(publicDir, file);
    return {
      local: file,
      remote: relativePath.replace(/\\/g, '/'), // Normalize for cross-platform
      description: `Full deploy: ${relativePath}`
    };
  });

  // Calculate total size
  let totalSize = 0;
  for (const file of filesToUpload) {
    if (fs.existsSync(file.local)) {
      totalSize += fs.statSync(file.local).size;
    }
  }
  const totalSizeKB = parseFloat((totalSize / 1024).toFixed(2));

  logger.info(`📊 Found ${filesToUpload.length} files (${totalSizeKB} KB)`);

  if (verbose) {
    logger.verbose('');
    logger.verbose('📁 Files to upload:');
    const preview = filesToUpload.slice(0, 10);
    preview.forEach(f => {
      const size = fs.existsSync(f.local)
        ? (fs.statSync(f.local).size / 1024).toFixed(2)
        : '?';
      logger.verbose(`   ${f.remote} (${size} KB)`);
    });
    if (filesToUpload.length > 10) {
      logger.verbose(`   ... and ${filesToUpload.length - 10} more files`);
    }
  }

  // Confirmation prompt (unless --force or --dry-run)
  if (!force && !dryRun) {
    const confirmed = await confirmDeployment(filesToUpload.length, totalSizeKB);
    if (!confirmed) {
      logger.info('❌ Deployment cancelled');
      return {
        cancelled: true,
        uploaded: 0,
        failed: 0,
        total: 0
      };
    }
  }

  // Dry run - just report what would be uploaded
  if (dryRun) {
    logger.info('🧪 DRY RUN - No files uploaded');
    logger.info(`   Would upload ${filesToUpload.length} files (${totalSizeKB} KB)`);
    return {
      dryRun: true,
      wouldUpload: filesToUpload.length,
      totalSizeKB
    };
  }

  // Upload files
  logger.info(`⬆️  Uploading ${filesToUpload.length} files...`);

  const results = await uploadFiles(apiKey, filesToUpload, {
    concurrency: 5,
    onProgress: verbose ? (result, index, total) => {
      const status = result.success ? '✓' : '✗';
      logger.verbose(`   ${status} [${index}/${total}] ${result.file}`);
    } : (result, index, total) => {
      // Show progress every 10 files in non-verbose mode
      if (index % 10 === 0 || index === total) {
        logger.info(`   Progress: ${index}/${total} files uploaded`);
      }
    }
  });

  // Count results
  const uploaded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  // Log summary
  if (uploaded > 0) {
    logger.success(`✅ Uploaded ${uploaded} files (${totalSizeKB} KB)`);
  }
  if (failed > 0) {
    logger.error(`❌ Failed to upload ${failed} files`);
    if (verbose) {
      results.filter(r => !r.success).forEach(r => {
        logger.error(`   - ${r.file}: ${r.error}`);
      });
    }
  }

  return {
    uploaded,
    failed,
    total: filesToUpload.length,
    totalSizeKB
  };
}

/**
 * Prompt user to confirm deployment
 * @param {number} fileCount - Number of files to deploy
 * @param {number} sizeKB - Total size in KB
 * @returns {Promise<boolean>} True if confirmed
 */
function confirmDeployment(fileCount, sizeKB) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    logger.warn(`⚠️  This will deploy ${fileCount} files (${sizeKB} KB) to your site.`);
    rl.question('Deploy all files? (y/N): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

module.exports = deployFull;
