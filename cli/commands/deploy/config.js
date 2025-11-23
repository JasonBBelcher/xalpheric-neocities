const fs = require('fs');
const { uploadFiles } = require('../../lib/api/upload');
const logger = require('../../lib/utils/logger');

// Default configuration files to deploy
const DEFAULT_CONFIG_FILES = [
  {
    local: 'public/config/releases.json',
    remote: 'config/releases.json',
    description: 'Releases configuration'
  },
  {
    local: 'public/assets/koala-album-art-default.jpg',
    remote: 'assets/koala-album-art-default.jpg',
    description: 'Koala album art'
  }
];

/**
 * Deploy configuration files to Neocities
 * @param {string} apiKey - Neocities API key
 * @param {Object} options - Deployment options
 * @param {Array} options.files - Array of file objects {local, remote, description}
 * @param {boolean} options.dryRun - Simulate deployment without uploading (default: false)
 * @param {boolean} options.verbose - Verbose logging (default: false)
 * @returns {Promise<Object>} Deployment results
 */
async function deployConfig(apiKey, options = {}) {
  const {
    files = DEFAULT_CONFIG_FILES,
    dryRun = false,
    verbose = false
  } = options;

  logger.setVerbose(verbose);
  logger.info('📋 Starting configuration deployment...', 'cyan');

  if (files.length === 0) {
    logger.warn('⚠️  No files specified for deployment');
    return {
      uploaded: 0,
      failed: 0,
      skipped: 0
    };
  }

  // Check which files exist
  const existingFiles = [];
  let skippedCount = 0;

  for (const file of files) {
    if (fs.existsSync(file.local)) {
      existingFiles.push(file);
      logger.verbose(`✓ Found: ${file.description || file.local}`);
    } else {
      skippedCount++;
      logger.warn(`⚠️  Skipping ${file.description || file.local} - file not found: ${file.local}`);
    }
  }

  if (existingFiles.length === 0) {
    logger.error('❌ No files found to upload');
    return {
      uploaded: 0,
      failed: 0,
      skipped: skippedCount
    };
  }

  logger.info(`📂 Found ${existingFiles.length} files to deploy`, 'blue');

  // Dry run - don't actually upload
  if (dryRun) {
    logger.info('\n🔍 DRY RUN - No changes will be made', 'cyan');
    logger.info(`   Would upload: ${existingFiles.length} files`);
    logger.info(`   Would skip: ${skippedCount} files`);
    
    if (verbose) {
      logger.info('\n📋 Files to upload:', 'cyan');
      existingFiles.forEach(file => {
        logger.info(`   - ${file.remote} (${file.description || 'no description'})`);
      });
    }

    return {
      dryRun: true,
      wouldUpload: existingFiles.length,
      wouldSkip: skippedCount
    };
  }

  // Upload files
  logger.info(`📤 Uploading ${existingFiles.length} configuration files...`, 'green');

  // Map to upload format
  const filesToUpload = existingFiles.map(file => ({
    local: file.local,
    remote: file.remote
  }));

  const results = await uploadFiles(filesToUpload, apiKey, {
    concurrency: 3,
    retry: true,
    maxRetries: 3,
    onProgress: (status) => {
      logger.verbose(`   Progress: ${status.completed}/${status.total}`);
    }
  });

  const uploadedCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  if (uploadedCount > 0) {
    logger.success(`✅ Successfully uploaded ${uploadedCount} files`);
  }
  if (failedCount > 0) {
    logger.error(`❌ Failed to upload ${failedCount} files`);
  }
  if (skippedCount > 0) {
    logger.warn(`⏭️  Skipped ${skippedCount} files (not found)`);
  }

  // Summary
  logger.info('\n📊 Deployment Summary:', 'cyan');
  logger.info(`   ✅ Uploaded: ${uploadedCount}`);
  if (failedCount > 0) {
    logger.error(`   ❌ Failed: ${failedCount}`);
  }
  if (skippedCount > 0) {
    logger.warn(`   ⏭️  Skipped: ${skippedCount}`);
  }
  logger.info(`   📋 Total files: ${files.length}`);

  logger.success('\n🎉 Configuration deployment completed!', 'green');

  return {
    uploaded: uploadedCount,
    failed: failedCount,
    skipped: skippedCount,
    total: files.length
  };
}

module.exports = deployConfig;
