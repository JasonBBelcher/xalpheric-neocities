const logger = require('../../lib/utils/logger');

/**
 * Build all blog content (orchestrates sync + build workflow)
 * @param {Object} options - Build options
 * @param {boolean} options.verbose - Verbose logging
 * @returns {Promise<Object>} Build results
 */
async function buildAll(options = {}) {
  const { verbose = false } = options;

  logger.setVerbose(verbose);
  logger.info('🚀 Starting complete blog build workflow...', 'cyan');

  const results = {
    syncImages: null,
    buildMusings: null,
    success: false
  };

  try {
    // Step 1: Sync Obsidian images
    logger.info('\n📷 Step 1: Syncing Obsidian images...', 'blue');
    
    try {
      const syncImages = require('../media/sync-images');
      results.syncImages = await syncImages({
        source: 'thoughts-and-musings',
        dest: 'public/assets/blog-images',
        verbose
      });
      
      logger.success(`✅ Image sync complete: ${results.syncImages.copied} images copied`);
    } catch (error) {
      logger.warn(`⚠️  Image sync failed: ${error.message}`);
      logger.info('Continuing with build...');
      results.syncImages = { error: error.message, copied: 0, skipped: 0 };
    }

    // Step 2: Build musings
    logger.info('\n📝 Step 2: Building blog posts...', 'blue');
    
    const buildMusings = require('./musings');
    results.buildMusings = await buildMusings({
      source: 'thoughts-and-musings',
      output: 'public/musings',
      blogImagesDir: 'public/assets/blog-images',
      processPhotos: true,
      verbose
    });

    if (results.buildMusings.failed > 0) {
      throw new Error(`Build failed for ${results.buildMusings.failed} files`);
    }

    logger.success(`✅ Build complete: ${results.buildMusings.built} posts generated`);

    // Summary
    logger.info('\n📊 Workflow Summary:', 'cyan');
    logger.info(`   📷 Images synced: ${results.syncImages.copied}`);
    logger.info(`   📝 Posts built: ${results.buildMusings.built}`);
    
    logger.success('\n🎉 Complete blog build workflow finished!', 'green');

    results.success = true;
    return results;

  } catch (error) {
    logger.error(`\n❌ Workflow failed: ${error.message}`);
    results.success = false;
    throw error;
  }
}

module.exports = buildAll;
