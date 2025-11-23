const git = require('../../lib/utils/git');
const { uploadFiles } = require('../../lib/api/upload');
const logger = require('../../lib/utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Deploy recently changed files based on Git history
 * 
 * @param {string} apiKey - Neocities API key
 * @param {Object} options - Deployment options
 * @param {string} [options.since='24 hours ago'] - Time period for changes
 * @param {string} [options.commit] - Commit hash to compare from
 * @param {string} [options.pattern] - File pattern to filter (e.g., 'public/music/*')
 * @param {boolean} [options.dryRun=false] - Simulate deployment without uploading
 * @param {boolean} [options.verbose=false] - Show detailed logging
 * @returns {Promise<Object>} Deployment results
 */
async function deployRecent(apiKey, options = {}) {
  const {
    since = '24 hours ago',
    commit,
    pattern,
    dryRun = false,
    verbose = false
  } = options;

  logger.setVerbose(verbose);

  if (verbose) {
    logger.info('🕐 Deploying recently changed files...');
    if (commit) {
      logger.info(`   From commit: ${commit}`);
    } else {
      logger.info(`   Since: ${since}`);
    }
    if (pattern) {
      logger.info(`   Pattern filter: ${pattern}`);
    }
  }

  // Check if we're in a git repository
  const isRepo = git.isGitRepository();
  if (!isRepo) {
    throw new Error('Not a git repository. This command requires Git to detect changed files.');
  }

  // Get changed files from Git
  const gitOptions = commit ? { commit } : { since };
  if (pattern) {
    gitOptions.pattern = pattern;
  }

  let changedFiles = git.getChangedFiles(gitOptions);

  if (verbose) {
    logger.verbose(`📋 Git detected ${changedFiles.length} changed files`);
  }

  // Filter to only public/ directory files and files that exist
  const filesToUpload = [];
  let skippedCount = 0;

  for (const file of changedFiles) {
    // Only process files in public/ directory
    if (!file.startsWith('public/')) {
      if (verbose) {
        logger.verbose(`   Skipping ${file} (not in public/)`);
      }
      skippedCount++;
      continue;
    }

    // Check if file exists
    if (!fs.existsSync(file)) {
      logger.warn(`⚠️  Skipping ${file} (file not found)`);
      skippedCount++;
      continue;
    }

    // Map public/ path to remote path
    const remotePath = file.replace(/^public\//, '');
    
    filesToUpload.push({
      local: file,
      remote: remotePath,
      description: `Changed: ${remotePath}`
    });
  }

  // Handle no files to upload
  if (filesToUpload.length === 0) {
    logger.info('ℹ️  No changed files to deploy');
    return {
      uploaded: 0,
      failed: 0,
      skipped: skippedCount,
      total: 0
    };
  }

  // Calculate total size
  let totalSize = 0;
  for (const file of filesToUpload) {
    if (fs.existsSync(file.local)) {
      totalSize += fs.statSync(file.local).size;
    }
  }
  const totalSizeKB = parseFloat((totalSize / 1024).toFixed(2));

  if (verbose) {
    logger.verbose(`📊 Prepared ${filesToUpload.length} files for upload (${totalSizeKB} KB)`);
    logger.verbose('');
    logger.verbose('📁 Files to upload:');
    filesToUpload.forEach(f => {
      const size = fs.existsSync(f.local)
        ? (fs.statSync(f.local).size / 1024).toFixed(2)
        : '?';
      logger.verbose(`   ${f.remote} (${size} KB)`);
    });
  }

  // Dry run - just report what would be uploaded
  if (dryRun) {
    logger.info('🧪 DRY RUN - No files uploaded');
    logger.info(`   Would upload ${filesToUpload.length} files (${totalSizeKB} KB)`);
    logger.info(`   Skipped ${skippedCount} files`);
    return {
      dryRun: true,
      wouldUpload: filesToUpload.length,
      skipped: skippedCount,
      totalSizeKB
    };
  }

  // Upload files
  logger.info(`⬆️  Uploading ${filesToUpload.length} changed files...`);

  const results = await uploadFiles(apiKey, filesToUpload, {
    concurrency: 5,
    onProgress: verbose ? (result, index, total) => {
      const status = result.success ? '✓' : '✗';
      logger.verbose(`   ${status} [${index}/${total}] ${result.file}`);
    } : undefined
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
  if (skippedCount > 0) {
    logger.info(`ℹ️  Skipped ${skippedCount} files`);
  }

  return {
    uploaded,
    failed,
    skipped: skippedCount,
    total: filesToUpload.length,
    totalSizeKB
  };
}

module.exports = deployRecent;
