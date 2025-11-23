const deployConfig = require('./config');
const deployMusic = require('./music');
const deployMusings = require('./musings');
const deployDrumMachine = require('./drum-machine');
const logger = require('../../lib/utils/logger');

/**
 * Deploy all site components in sequence
 * Runs: config -> music -> musings -> drum-machine
 * 
 * @param {string} apiKey - Neocities API key
 * @param {Object} options - Deployment options
 * @param {boolean} [options.continueOnError=true] - Continue if a deployment fails
 * @param {Array<string>} [options.skip=[]] - Commands to skip (e.g., ['drum-machine'])
 * @param {boolean} [options.dryRun=false] - Simulate deployment without uploading
 * @param {boolean} [options.verbose=false] - Show detailed logging
 * @returns {Promise<Object>} Deployment results
 */
async function deployAll(apiKey, options = {}) {
  const {
    continueOnError = true,
    skip = [],
    dryRun = false,
    verbose = false
  } = options;

  logger.setVerbose(verbose);

  logger.info('🚀 Deploying all site components...');
  if (dryRun) {
    logger.info('🧪 DRY RUN MODE');
  }
  logger.info('');

  const deployments = [
    { name: 'config', fn: deployConfig, label: '⚙️  Configuration' },
    { name: 'music', fn: deployMusic, label: '🎵 Music' },
    { name: 'musings', fn: deployMusings, label: '📝 Musings (blog)' },
    { name: 'drum-machine', fn: deployDrumMachine, label: '🥁 Drum Machine' }
  ];

  const results = [];
  const errors = [];
  let totalUploaded = 0;
  let totalFailed = 0;

  for (const deployment of deployments) {
    // Skip if requested
    if (skip.includes(deployment.name)) {
      logger.info(`⏭️  Skipping ${deployment.label}`);
      continue;
    }

    logger.info(`${deployment.label}...`);

    try {
      const result = await deployment.fn(apiKey, {
        dryRun,
        verbose,
        // Pass through any command-specific options
        force: options.force,
        deleteOrphans: options.deleteOrphans
      });

      results.push({
        name: deployment.name,
        ...result
      });

      if (result.dryRun) {
        logger.info(`   Would upload: ${result.wouldUpload || 0} files`);
      } else {
        const uploaded = result.uploaded || 0;
        const failed = result.failed || 0;
        totalUploaded += uploaded;
        totalFailed += failed;

        if (uploaded > 0) {
          logger.success(`   ✅ ${uploaded} files uploaded`);
        }
        if (failed > 0) {
          logger.error(`   ❌ ${failed} files failed`);
        }
      }
    } catch (error) {
      const errorMsg = `${deployment.name}: ${error.message}`;
      errors.push(errorMsg);
      logger.error(`   ❌ Error: ${error.message}`);

      if (!continueOnError) {
        throw error;
      }
    }

    logger.info('');
  }

  // Summary
  logger.info('━'.repeat(50));
  logger.info('📊 Deployment Summary');
  logger.info('━'.repeat(50));

  if (dryRun) {
    const totalWouldUpload = results.reduce((sum, r) => sum + (r.wouldUpload || 0), 0);
    logger.info(`🧪 DRY RUN: Would upload ${totalWouldUpload} files total`);
  } else {
    if (totalUploaded > 0) {
      logger.success(`✅ Total uploaded: ${totalUploaded} files`);
    }
    if (totalFailed > 0) {
      logger.error(`❌ Total failed: ${totalFailed} files`);
    }
    if (errors.length > 0) {
      logger.error(`⚠️  Errors encountered: ${errors.length}`);
      errors.forEach(err => logger.error(`   - ${err}`));
    }

    if (totalUploaded > 0 && totalFailed === 0 && errors.length === 0) {
      logger.success('🎉 All deployments completed successfully!');
    }
  }

  return {
    dryRun,
    totalUploaded,
    totalFailed,
    deployments: results,
    errors
  };
}

module.exports = deployAll;
