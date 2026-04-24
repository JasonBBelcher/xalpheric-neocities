const { getLocalFiles, filterFiles } = require('../../lib/utils/files');
const { uploadFiles } = require('../../lib/api/upload');
const logger = require('../../lib/utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Deploy drum machine application files to Neocities.
 *
 * Uploads:
 * - public/drum-machine.html  →  drum-machine.html
 * - public/js/drum-machine/*  →  js/drum-machine/*  (JS + CSS bundles)
 *
 * @param {string} apiKey - Neocities API key
 * @param {Object} options - Deployment options
 * @param {string} [options.htmlFile='public/drum-machine.html']
 * @param {string} [options.jsDir='public/js/drum-machine']
 * @param {boolean} [options.includeMaps=false] - Include source map files
 * @param {boolean} [options.dryRun=false]
 * @param {boolean} [options.verbose=false]
 * @returns {Promise<Object>} Deployment results
 */
async function deployDrumMachine(apiKey, options = {}) {
  const {
    htmlFile = 'public/drum-machine.html',
    jsDir = 'public/js/drum-machine',
    includeMaps = false,
    dryRun = false,
    verbose = false
  } = options;

  logger.setVerbose(verbose);

  if (!fs.existsSync(htmlFile)) {
    throw new Error(`HTML file not found: ${htmlFile}`);
  }

  if (!fs.existsSync(jsDir)) {
    throw new Error(`JS/CSS directory not found: ${jsDir}`);
  }

  // Gather all files from the js/drum-machine bundle directory
  let bundleFiles = await getLocalFiles(jsDir);

  if (!includeMaps) {
    const before = bundleFiles.length;
    bundleFiles = bundleFiles.filter(f => !f.endsWith('.map'));
    if (verbose && bundleFiles.length < before) {
      logger.info(`   Filtered ${before - bundleFiles.length} source map files`);
    }
  }

  // Build upload manifest
  const filesToUpload = [
    { local: htmlFile, remote: 'drum-machine.html' },
    ...bundleFiles.map(f => ({
      local: f,
      remote: `js/drum-machine/${path.relative(jsDir, f)}`
    }))
  ];

  const totalSize = filesToUpload.reduce((sum, f) => {
    return sum + (fs.existsSync(f.local) ? fs.statSync(f.local).size : 0);
  }, 0);
  const totalSizeKB = (totalSize / 1024).toFixed(2);

  if (verbose) {
    logger.info('🥁 Deploying drum machine...');
    logger.info(`   HTML: ${htmlFile}`);
    logger.info(`   Bundle dir: ${jsDir} (${bundleFiles.length} files)`);
    logger.info(`   Total: ${filesToUpload.length} files, ${totalSizeKB} KB`);
  }

  if (dryRun) {
    logger.info(`🧪 DRY RUN — would upload ${filesToUpload.length} files (${totalSizeKB} KB)`);
    return { dryRun: true, wouldUpload: filesToUpload.length, totalSizeKB: parseFloat(totalSizeKB) };
  }

  const results = await uploadFiles(filesToUpload, apiKey, {
    concurrency: 5,
    onProgress: verbose ? (p) => logger.verbose(`   📤 [${p.completed}/${p.total}] ${p.file}`) : undefined
  });

  const uploaded = results.filter(r => r.success).length;
  const failed   = results.filter(r => !r.success).length;

  if (uploaded > 0) logger.success(`✅ Uploaded ${uploaded} files (${totalSizeKB} KB)`);
  if (failed   > 0) logger.error(`❌ Failed to upload ${failed} files`);

  return { uploaded, failed, total: filesToUpload.length, totalSizeKB: parseFloat(totalSizeKB) };
}

module.exports = deployDrumMachine;
