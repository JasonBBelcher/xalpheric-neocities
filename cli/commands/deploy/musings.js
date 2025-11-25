const path = require('path');
const { getLocalFiles, filterFiles, getRelativePath } = require('../../lib/utils/files');
const { listFiles, filterRemoteFiles } = require('../../lib/api/list');
const { uploadFiles } = require('../../lib/api/upload');
const { deleteFiles } = require('../../lib/api/delete');
const logger = require('../../lib/utils/logger');

/**
 * Deploy musings (blog posts) to Neocities
 * @param {string} apiKey - Neocities API key
 * @param {Object} options - Deployment options
 * @param {string} options.musingsDir - Path to local musings directory
 * @param {boolean} options.force - Force upload all files (default: false)
 * @param {boolean} options.deleteOrphans - Delete orphaned remote files (default: false)
 * @param {boolean} options.dryRun - Simulate deployment without uploading (default: false)
 * @param {boolean} options.verbose - Verbose logging (default: false)
 * @returns {Promise<Object>} Deployment results
 */
async function deployMusings(apiKey, options = {}) {
  const {
    musingsDir,
    force = false,
    deleteOrphans = false,
    dryRun = false,
    verbose = false
  } = options;

  logger.setVerbose(verbose);
  logger.info('📝 Starting musings deployment...', 'cyan');

  // Get local HTML files
  logger.verbose('📂 Scanning local musings directory...');
  const allLocalFiles = await getLocalFiles(musingsDir);
  const localHtmlFiles = filterFiles(allLocalFiles, {
    extensions: ['.html']
  });

  logger.info(`📂 Found ${localHtmlFiles.length} HTML files locally`, 'blue');

  if (localHtmlFiles.length === 0) {
    logger.warn('⚠️  No HTML files found in musings directory');
    logger.info('💡 Run the build command first to generate HTML from markdown');
    
    return {
      uploaded: 0,
      failed: 0,
      skipped: 0,
      deleted: 0,
      orphanedRemote: []
    };
  }

  // Get remote files
  logger.info('🌐 Checking remote files...', 'blue');
  const allRemoteFiles = await listFiles(apiKey);
  const remoteMusingsFiles = filterRemoteFiles(allRemoteFiles, {
    pattern: /^musings\//,
    extensions: ['.html'],
    filesOnly: true
  });

  const remoteBasenames = remoteMusingsFiles.map(f => path.basename(f.path));
  logger.info(`📋 Found ${remoteMusingsFiles.length} musings on Neocities`, 'blue');

  // Determine files to upload
  const filesToUpload = [];
  let skippedCount = 0;

  // Get the parent directory of musingsDir (e.g., 'public' from 'public/musings')
  const baseDir = path.dirname(musingsDir);

  for (const localFile of localHtmlFiles) {
    const basename = path.basename(localFile);
    const remoteExists = remoteBasenames.includes(basename);

    if (force || !remoteExists) {
      // Get relative path from base directory for proper remote path
      const relativePath = getRelativePath(baseDir, localFile);
      
      filesToUpload.push({
        local: localFile,
        remote: relativePath
      });
    } else {
      skippedCount++;
      logger.verbose(`⏭️  Skipping ${basename} - already exists remotely`);
    }
  }

  if (force && filesToUpload.length > 0) {
    logger.info(`🔄 Force mode: uploading all ${filesToUpload.length} files`, 'cyan');
  }

  // Detect orphaned remote files (on server but not locally)
  const localBasenames = localHtmlFiles.map(f => path.basename(f));
  const orphanedRemote = remoteMusingsFiles
    .filter(f => !localBasenames.includes(path.basename(f.path)))
    .map(f => f.path);

  if (orphanedRemote.length > 0) {
    logger.warn(`⚠️  Found ${orphanedRemote.length} orphaned remote files:`);
    orphanedRemote.forEach(file => logger.warn(`   - ${file}`));
  }

  // Dry run - don't actually upload/delete
  if (dryRun) {
    logger.info('\n🔍 DRY RUN - No changes will be made', 'cyan');
    logger.info(`   Would upload: ${filesToUpload.length} files`);
    logger.info(`   Would skip: ${skippedCount} files`);
    if (deleteOrphans && orphanedRemote.length > 0) {
      logger.info(`   Would delete: ${orphanedRemote.length} orphaned files`);
    }

    return {
      dryRun: true,
      wouldUpload: filesToUpload.length,
      wouldSkip: skippedCount,
      wouldDelete: deleteOrphans ? orphanedRemote.length : 0,
      orphanedRemote
    };
  }

  // Upload files
  let uploadedCount = 0;
  let failedCount = 0;

  if (filesToUpload.length > 0) {
    logger.info(`📤 Uploading ${filesToUpload.length} musings files...`, 'green');

    const results = await uploadFiles(filesToUpload, apiKey, {
      concurrency: 3,
      retry: true,
      maxRetries: 3,
      onProgress: (status) => {
        logger.verbose(`   Progress: ${status.completed}/${status.total}`);
      }
    });

    uploadedCount = results.filter(r => r.success).length;
    failedCount = results.filter(r => !r.success).length;

    if (uploadedCount > 0) {
      logger.success(`✅ Successfully uploaded ${uploadedCount} files`);
    }
    if (failedCount > 0) {
      logger.error(`❌ Failed to upload ${failedCount} files`);
    }
  } else {
    logger.info('📋 No new files to upload', 'blue');
  }

  // Delete orphaned remote files
  let deletedCount = 0;

  if (deleteOrphans && orphanedRemote.length > 0) {
    logger.info(`🗑️  Deleting ${orphanedRemote.length} orphaned remote files...`, 'yellow');

    const deleteResults = await deleteFiles(orphanedRemote, apiKey, {
      batchSize: 50,
      onProgress: (status) => {
        logger.verbose(`   Delete progress: ${status.filesProcessed}/${status.totalFiles}`);
      }
    });

    const successfulBatches = deleteResults.filter(r => r.success);
    deletedCount = successfulBatches.reduce((sum, batch) => sum + batch.count, 0);

    if (deletedCount > 0) {
      logger.success(`✅ Successfully deleted ${deletedCount} orphaned files`);
    }
  }

  // Summary
  logger.info('\n📊 Deployment Summary:', 'cyan');
  logger.info(`   ✅ Uploaded: ${uploadedCount}`);
  if (failedCount > 0) {
    logger.error(`   ❌ Failed: ${failedCount}`);
  }
  logger.info(`   ⏭️  Skipped: ${skippedCount}`);
  if (deletedCount > 0) {
    logger.info(`   🗑️  Deleted: ${deletedCount}`);
  }
  logger.info(`   📋 Total local files: ${localHtmlFiles.length}`);

  if (!deleteOrphans && orphanedRemote.length > 0) {
    logger.warn(`   ⚠️  Orphaned remote: ${orphanedRemote.length} (not deleted)`);
  }

  logger.success('\n🎉 Musings deployment completed!', 'green');

  return {
    uploaded: uploadedCount,
    failed: failedCount,
    skipped: skippedCount,
    deleted: deletedCount,
    orphanedRemote,
    totalLocal: localHtmlFiles.length
  };
}

module.exports = deployMusings;
