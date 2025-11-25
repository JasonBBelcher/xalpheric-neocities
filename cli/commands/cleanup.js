const readline = require('readline');
const logger = require('../lib/utils/logger');
const { listFiles } = require('../lib/api/list');
const { deleteFiles } = require('../lib/api/delete');

/**
 * Default cleanup patterns
 */
const DEFAULT_PATTERNS = [
  {
    test: (path) => path.includes('.DS_Store'),
    description: 'macOS artifacts (.DS_Store)',
    category: 'system'
  },
  {
    test: (path) => path.endsWith('.ogg'),
    description: 'OGG audio files',
    category: 'media'
  },
  {
    test: (path) => path.includes('drum-machine-backup'),
    description: 'Drum machine backup files',
    category: 'backup'
  }
];

/**
 * Prompt user for confirmation
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} - User response
 */
async function confirm(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Identify unwanted files based on patterns
 * @param {Array} files - File list
 * @param {Array} patterns - Cleanup patterns
 * @param {boolean} verbose - Verbose output
 * @returns {Object} - Categorized unwanted files
 */
function identifyUnwantedFiles(files, patterns, verbose = false) {
  const unwanted = {
    byCategory: {},
    all: []
  };

  patterns.forEach(pattern => {
    unwanted.byCategory[pattern.category] = [];
  });

  files.forEach(file => {
    for (const pattern of patterns) {
      if (pattern.test(file.path)) {
        if (verbose) {
          logger.verbose(`🚫 ${pattern.description}: ${file.path}`);
        }
        
        unwanted.byCategory[pattern.category].push(file);
        unwanted.all.push(file);
        break; // Only match first pattern
      }
    }
  });

  return unwanted;
}

/**
 * Clean up unwanted files from Neocities
 * @param {string} apiKey - Neocities API key
 * @param {Object} options - Cleanup options
 * @param {boolean} options.dryRun - Simulate without deleting
 * @param {boolean} options.force - Skip confirmation
 * @param {Array} options.patterns - Custom cleanup patterns
 * @param {Array} options.include - Categories to include
 * @param {Array} options.exclude - Categories to exclude
 * @param {boolean} options.verbose - Verbose output
 * @returns {Promise<Object>} - Cleanup results
 */
async function cleanup(apiKey, options = {}) {
  const {
    dryRun = false,
    force = false,
    patterns = DEFAULT_PATTERNS,
    include = null,
    exclude = null,
    verbose = false
  } = options;

  logger.setVerbose(verbose);
  logger.info('🧹 Starting cleanup process...', 'cyan');

  try {
    // Get file list
    logger.info('\n📋 Getting list of files from Neocities...');
    const files = await listFiles(apiKey);
    const fileList = files.filter(f => !f.is_directory);
    
    logger.info(`   Found ${fileList.length} files`);

    // Filter patterns by include/exclude
    let activePatterns = patterns;
    if (include) {
      activePatterns = patterns.filter(p => include.includes(p.category));
    }
    if (exclude) {
      activePatterns = patterns.filter(p => !exclude.includes(p.category));
    }

    // Identify unwanted files
    logger.info('\n🔍 Identifying unwanted files...');
    const unwanted = identifyUnwantedFiles(fileList, activePatterns, verbose);

    // Summary by category
    logger.info('\n📊 Unwanted files by category:');
    let hasFiles = false;
    
    Object.entries(unwanted.byCategory).forEach(([category, categoryFiles]) => {
      if (categoryFiles.length > 0) {
        hasFiles = true;
        const pattern = patterns.find(p => p.category === category);
        logger.info(`   • ${pattern.description}: ${categoryFiles.length} files`);
        
        if (verbose) {
          categoryFiles.forEach(file => {
            logger.verbose(`     - ${file.path}`);
          });
        }
      }
    });

    if (!hasFiles) {
      logger.success('\n✅ No unwanted files found! Site is clean.', 'green');
      return {
        success: true,
        filesFound: 0,
        filesDeleted: 0,
        dryRun
      };
    }

    logger.info(`\n   Total: ${unwanted.all.length} files to delete`);

    // Dry run mode
    if (dryRun) {
      logger.warn('\n🔍 DRY RUN MODE - No files will be deleted');
      logger.info('\nFiles that would be deleted:');
      unwanted.all.forEach(file => {
        logger.info(`   - ${file.path}`);
      });
      
      return {
        success: true,
        filesFound: unwanted.all.length,
        filesDeleted: 0,
        dryRun: true
      };
    }

    // Confirmation
    if (!force) {
      logger.warn('\n⚠️  WARNING: This will permanently delete files from Neocities!');
      const confirmed = await confirm('Are you sure you want to continue?');
      
      if (!confirmed) {
        logger.info('Cleanup cancelled.');
        return {
          success: false,
          filesFound: unwanted.all.length,
          filesDeleted: 0,
          cancelled: true
        };
      }
    }

    // Delete files
    logger.info(`\n🗑️  Deleting ${unwanted.all.length} files...`);
    
    const filePaths = unwanted.all.map(f => f.path);
    await deleteFiles(apiKey, filePaths);

    logger.success(`\n✅ Successfully deleted ${unwanted.all.length} files!`, 'green');
    logger.info('🎉 Cleanup complete!');

    return {
      success: true,
      filesFound: unwanted.all.length,
      filesDeleted: unwanted.all.length,
      dryRun: false
    };

  } catch (error) {
    logger.error(`\n❌ Cleanup failed: ${error.message}`);
    throw error;
  }
}

module.exports = cleanup;
module.exports.DEFAULT_PATTERNS = DEFAULT_PATTERNS;
module.exports.identifyUnwantedFiles = identifyUnwantedFiles;
