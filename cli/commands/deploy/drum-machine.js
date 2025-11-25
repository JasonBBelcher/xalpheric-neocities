const { getLocalFiles, filterFiles } = require('../../lib/utils/files');
const { uploadFiles } = require('../../lib/api/upload');
const logger = require('../../lib/utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Deploy drum machine application files to Neocities
 * 
 * Uploads:
 * - HTML file (drum-machine.html)
 * - CSS file (drum-machine.css)
 * - All JS/CSS/sample files from dist directory
 * - Optionally includes source maps
 * 
 * @param {string} apiKey - Neocities API key
 * @param {Object} options - Deployment options
 * @param {string} [options.distDir='../drum-machine/dist'] - Path to drum machine dist directory
 * @param {string} [options.htmlFile='public/drum-machine.html'] - Path to HTML file
 * @param {string} [options.cssFile='public/css/drum-machine.css'] - Path to CSS file
 * @param {boolean} [options.includeMaps=false] - Include source map files
 * @param {boolean} [options.dryRun=false] - Simulate deployment without uploading
 * @param {boolean} [options.verbose=false] - Show detailed logging
 * @returns {Promise<Object>} Deployment results with counts and sizes
 */
async function deployDrumMachine(apiKey, options = {}) {
  const {
    distDir = '../drum-machine/dist',
    htmlFile = 'public/drum-machine.html',
    cssFile = 'public/css/drum-machine.css',
    includeMaps = false,
    dryRun = false,
    verbose = false
  } = options;

  logger.setVerbose(verbose);
  
  if (verbose) {
    logger.info('🥁 Deploying drum machine...');
    logger.info(`   Dist directory: ${distDir}`);
    logger.info(`   HTML file: ${htmlFile}`);
    logger.info(`   CSS file: ${cssFile}`);
    logger.info(`   Include maps: ${includeMaps}`);
    logger.info(`   Dry run: ${dryRun}`);
  }

  // Validate required paths exist
  if (!fs.existsSync(distDir)) {
    throw new Error(`Dist directory not found: ${distDir}`);
  }

  if (!fs.existsSync(htmlFile)) {
    throw new Error(`HTML file not found: ${htmlFile}`);
  }

  if (!fs.existsSync(cssFile)) {
    throw new Error(`CSS file not found: ${cssFile}`);
  }

  // Get all files from dist directory
  let distFiles = await getLocalFiles(distDir);
  
  if (verbose) {
    logger.info(`📦 Found ${distFiles.length} files in dist directory`);
  }

  // Filter out source maps if not included
  if (!includeMaps) {
    const originalCount = distFiles.length;
    distFiles = distFiles.filter(file => !file.endsWith('.map'));
    const filtered = originalCount - distFiles.length;
    if (filtered > 0 && verbose) {
      logger.info(`   Filtered ${filtered} source map files`);
    }
  }

  // Build file list for upload
  const filesToUpload = [];

  // Add HTML file
  filesToUpload.push({
    local: htmlFile,
    remote: 'drum-machine.html',
    description: 'Drum machine HTML'
  });

  // Add CSS file
  filesToUpload.push({
    local: cssFile,
    remote: 'css/drum-machine.css',
    description: 'Drum machine CSS'
  });

  // Add dist files with js/drum-machine/ prefix
  for (const file of distFiles) {
    const relativePath = path.relative(distDir, file);
    filesToUpload.push({
      local: file,
      remote: `js/drum-machine/${relativePath}`,
      description: `Dist file: ${relativePath}`
    });
  }

  // Calculate total size
  let totalSize = 0;
  for (const file of filesToUpload) {
    if (fs.existsSync(file.local)) {
      totalSize += fs.statSync(file.local).size;
    }
  }
  const totalSizeKB = (totalSize / 1024).toFixed(2);

  if (verbose) {
    logger.info(`📊 Deployment summary:`);
    logger.info(`   Total files: ${filesToUpload.length}`);
    logger.info(`   Total size: ${totalSizeKB} KB`);
    logger.info('');
    logger.info('📁 Files to upload:');
    
    // Categorize files for display
    const categories = {
      html: filesToUpload.filter(f => f.remote.endsWith('.html')),
      css: filesToUpload.filter(f => f.remote.endsWith('.css')),
      js: filesToUpload.filter(f => f.remote.endsWith('.js')),
      maps: filesToUpload.filter(f => f.remote.endsWith('.map')),
      samples: filesToUpload.filter(f => f.remote.match(/\.(wav|mp3|ogg)$/i)),
      other: filesToUpload.filter(f => !f.remote.match(/\.(html|css|js|map|wav|mp3|ogg)$/i))
    };

    for (const [category, files] of Object.entries(categories)) {
      if (files.length > 0) {
        logger.info(`   ${category.toUpperCase()}: ${files.length} files`);
        files.forEach(f => {
          const size = fs.existsSync(f.local) 
            ? (fs.statSync(f.local).size / 1024).toFixed(2) 
            : '?';
          logger.info(`      - ${f.remote} (${size} KB)`);
        });
      }
    }
  }

  // Dry run - just report what would be uploaded
  if (dryRun) {
    logger.info('🧪 DRY RUN - No files uploaded');
    logger.info(`   Would upload ${filesToUpload.length} files (${totalSizeKB} KB)`);
    return {
      dryRun: true,
      wouldUpload: filesToUpload.length,
      totalSizeKB: parseFloat(totalSizeKB)
    };
  }

  // Upload files
  logger.info(`⬆️  Uploading ${filesToUpload.length} files...`);
  
  const results = await uploadFiles(filesToUpload, apiKey, {
    concurrency: 5,
    onProgress: verbose ? (result, index, total) => {
      const status = result.success ? '✓' : '✗';
      logger.info(`   ${status} [${index}/${total}] ${result.file}`);
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

  return {
    uploaded,
    failed,
    total: filesToUpload.length,
    totalSizeKB: parseFloat(totalSizeKB)
  };
}

module.exports = deployDrumMachine;
