const path = require('path');
const { loadJsonConfig } = require('../../lib/utils/config');
const { getLocalFiles, filterFiles } = require('../../lib/utils/files');
const { listFiles, filterRemoteFiles } = require('../../lib/api/list');
const { uploadFiles } = require('../../lib/api/upload');
const { deleteFiles } = require('../../lib/api/delete');
const logger = require('../../lib/utils/logger');

/**
 * Deploy music files to Neocities based on releases.json configuration
 * @param {string} apiKey - Neocities API key
 * @param {Object} options - Deployment options
 * @param {string} options.musicDir - Path to local music directory
 * @param {string} options.configFile - Path to releases.json config file
 * @param {boolean} options.force - Force upload all files (default: false)
 * @param {boolean} options.deleteOrphans - Delete orphaned remote files (default: false)
 * @param {boolean} options.dryRun - Simulate deployment without uploading (default: false)
 * @param {boolean} options.verbose - Verbose logging (default: false)
 * @returns {Promise<Object>} Deployment results
 */
async function deployMusic(apiKey, options = {}) {
  const {
    musicDir,
    configFile,
    force = false,
    deleteOrphans = false,
    dryRun = false,
    verbose = false
  } = options;

  logger.setVerbose(verbose);
  logger.info('🎵 Starting music deployment...', 'cyan');

  // Load releases configuration
  logger.verbose('📋 Loading releases configuration...');
  const config = loadJsonConfig(configFile);
  
  if (!config.releases || !Array.isArray(config.releases)) {
    throw new Error('Invalid releases config: missing or invalid "releases" array');
  }

  const configuredAudioFiles = config.releases.map(release => {
    const audioPath = release.audio;
    return path.basename(audioPath);
  });

  logger.info(`📋 Found ${config.releases.length} releases in configuration`, 'blue');

  // Get local music files
  logger.verbose('📂 Scanning local music directory...');
  const allLocalFiles = await getLocalFiles(musicDir);
  const localMusicFiles = filterFiles(allLocalFiles, {
    extensions: ['.mp3', '.ogg']
  });

  const localBasenames = localMusicFiles.map(f => path.basename(f));
  logger.info(`📂 Found ${localBasenames.length} music files locally`, 'blue');

  // Check for orphaned local files (not in config)
  const orphanedLocal = localBasenames.filter(file => 
    !configuredAudioFiles.includes(file)
  );

  if (orphanedLocal.length > 0) {
    logger.warn(`⚠️  Found ${orphanedLocal.length} orphaned local files not in config:`);
    orphanedLocal.forEach(file => logger.warn(`   - ${file}`));
  }

  // Check for missing local files (in config but not on disk)
  const missingLocal = configuredAudioFiles.filter(file => 
    !localBasenames.includes(file)
  );

  if (missingLocal.length > 0) {
    logger.error('❌ Missing required music files referenced in config:');
    missingLocal.forEach(file => logger.error(`   - ${file}`));
    throw new Error(`Missing ${missingLocal.length} required music files: ${missingLocal.join(', ')}`);
  }

  // Get remote files
  logger.info('🌐 Checking remote files...', 'blue');
  const allRemoteFiles = await listFiles(apiKey);
  const remoteMusicFiles = filterRemoteFiles(allRemoteFiles, {
    pattern: /^music\//,
    extensions: ['.mp3', '.ogg'],
    filesOnly: true
  });

  const remoteBasenames = remoteMusicFiles.map(f => path.basename(f.path));
  logger.info(`📋 Found ${remoteMusicFiles.length} music files on Neocities`, 'blue');

  // Determine files to upload
  const filesToUpload = [];
  let skippedCount = 0;

  for (const configFile of configuredAudioFiles) {
    const localPath = localMusicFiles.find(f => path.basename(f) === configFile);
    
    if (!localPath) {
      continue; // Already validated above
    }

    const remoteExists = remoteBasenames.includes(configFile);

    if (force || !remoteExists) {
      filesToUpload.push({
        local: localPath,
        remote: `music/${configFile}`
      });
    } else {
      skippedCount++;
      logger.verbose(`⏭️  Skipping ${configFile} - already exists remotely`);
    }
  }

  if (force && filesToUpload.length > 0) {
    logger.info(`🔄 Force mode: uploading all ${filesToUpload.length} configured files`, 'cyan');
  }

  // Detect orphaned remote files (on server but not in config)
  const orphanedRemote = remoteMusicFiles
    .filter(f => !configuredAudioFiles.includes(path.basename(f.path)))
    .map(f => f.path);

  if (orphanedRemote.length > 0) {
    logger.warn(`⚠️  Found ${orphanedRemote.length} orphaned remote files not in config:`);
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
      orphanedLocal,
      orphanedRemote
    };
  }

  // Upload files
  let uploadedCount = 0;
  let failedCount = 0;

  if (filesToUpload.length > 0) {
    logger.info(`📤 Uploading ${filesToUpload.length} music files...`, 'green');

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
  logger.info(`   📋 Total configured: ${config.releases.length}`);

  if (orphanedLocal.length > 0) {
    logger.warn(`   ⚠️  Orphaned local: ${orphanedLocal.length}`);
  }
  if (!deleteOrphans && orphanedRemote.length > 0) {
    logger.warn(`   ⚠️  Orphaned remote: ${orphanedRemote.length} (not deleted)`);
  }

  logger.success('\n🎉 Music deployment completed!', 'green');

  return {
    uploaded: uploadedCount,
    failed: failedCount,
    skipped: skippedCount,
    deleted: deletedCount,
    orphanedLocal,
    orphanedRemote,
    totalConfigured: config.releases.length
  };
}

module.exports = deployMusic;
