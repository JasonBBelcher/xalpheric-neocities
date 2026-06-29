const fs = require('fs').promises;
const path = require('path');
const logger = require('../../lib/utils/logger');

/**
 * Generic event photo organization command
 * Organizes photos from a source directory into event-specific subdirectories
 * with sequential numbering.
 * 
 * @param {Object} options - Organization options
 * @param {string} options.source - Source directory containing photos
 * @param {string} options.eventName - Name of the event (used for destination folder)
 * @param {string} options.destination - Destination directory for organized photos
 * @param {string} options.pattern - File pattern to match (default: '*.{jpg,jpeg,png,gif}')
 * @param {string} options.naming - Naming convention (default: 'midimob-{n}')
 * @param {boolean} options.verbose - Verbose output
 * @param {boolean} options.dryRun - Simulate without actually moving files
 * @returns {Promise<Object>} Organization results
 */
async function organizeEventPhotos(options = {}) {
  const {
    source = 'process_photos',
    eventName,
    destination = 'public/assets/events',
    pattern = '*.{jpg,jpeg,png,gif,heic,avif}',
    naming = 'midimob-{n}',
    verbose = false,
    dryRun = false
  } = options;

  logger.setVerbose(verbose);
  
  if (!eventName) {
    throw new Error('Event name is required');
  }

  // Create a filesystem-safe directory name from the event name
  const eventDirName = eventName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const eventDirPath = path.join(destination, eventDirName);
  
  if (verbose) {
    logger.info(`📁 Organizing photos for event: ${eventName}`, 'cyan');
    logger.info(`   Source: ${source}`);
    logger.info(`   Destination: ${eventDirPath}`);
    logger.info(`   Pattern: ${pattern}`);
    if (dryRun) {
      logger.info(`   🧪 DRY RUN - No files will be moved`, 'yellow');
    }
  }

  try {
    // Check if source directory exists
    try {
      await fs.access(source);
    } catch (error) {
      throw new Error(`Source directory does not exist: ${source}`);
    }

    // Create destination directory if it doesn't exist
    if (!dryRun) {
      await fs.mkdir(eventDirPath, { recursive: true });
    }

    // Get list of files matching the pattern
    const files = await getMatchingFiles(source, pattern);
    
    if (files.length === 0) {
      logger.info('⚠️  No matching files found in source directory');
      return {
        organized: 0,
        skipped: 0,
        eventDir: eventDirPath,
        dryRun
      };
    }

    if (verbose) {
      logger.info(`📸 Found ${files.length} files to organize`);
    }

    // Organize files with sequential numbering
    const results = await organizeFiles(files, source, eventDirPath, naming, dryRun, verbose);
    
    logger.success(`✅ Organized ${results.organized} photos for event "${eventName}"`);
    
    if (results.skipped > 0) {
      logger.warn(`⚠️  Skipped ${results.skipped} files`);
    }

    return {
      ...results,
      eventDir: eventDirPath,
      eventName,
      dryRun
    };
  } catch (error) {
    logger.error(`❌ Error organizing event photos: ${error.message}`);
    throw error;
  }
}

/**
 * Get files matching a pattern from a directory
 * @param {string} directory - Directory to search
 * @param {string} pattern - File pattern to match
 * @returns {Promise<string[]>} Array of matching file names
 */
async function getMatchingFiles(directory, pattern) {
  // For simplicity, we'll match common image extensions
  // In a more robust implementation, we could use glob patterns
  const allFiles = await fs.readdir(directory);
  
  // Extract extensions from pattern (e.g., "*.{jpg,jpeg,png}" -> [".jpg", ".jpeg", ".png"])
  let extensions = [];
  if (pattern.includes('{') && pattern.includes('}')) {
    const match = pattern.match(/\{([^}]+)\}/);
    if (match) {
      extensions = match[1].split(',').map(ext => ext.startsWith('.') ? ext : '.' + ext);
    }
  } else if (pattern.includes('.')) {
    // Simple pattern like "*.jpeg"
    const ext = path.extname(pattern);
    if (ext) extensions = [ext];
  }
  
  // If no extensions found in pattern, use default image extensions
  if (extensions.length === 0) {
    extensions = ['.jpg', '.jpeg', '.png', '.gif', '.heic', '.avif'];
  }
  
  return allFiles.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return extensions.includes(ext);
  });
}

/**
 * Organize files with sequential numbering using configurable naming convention
 * @param {string[]} files - Array of file names to organize
 * @param {string} sourceDir - Source directory
 * @param {string} destDir - Destination directory
 * @param {string} namingConvention - Naming convention (default: 'midimob-{n}')
 * @param {boolean} dryRun - Whether to simulate without moving
 * @param {boolean} verbose - Verbose output
 * @returns {Promise<Object>} Organization results
 */
async function organizeFiles(files, sourceDir, destDir, namingConvention = 'midimob-{n}', dryRun, verbose) {
  let organized = 0;
  let skipped = 0;
  
  // Get existing files in destination to determine next number
  let existingFiles = [];
  try {
    existingFiles = await fs.readdir(destDir);
  } catch (error) {
    // Directory might not exist yet, that's OK
  }
  
  // Determine the next available number based on existing files with same naming convention
  let nextNumber = 1;
  if (existingFiles.length > 0) {
    // Create regex pattern from naming convention
    const regexPattern = namingConvention.replace('{n}', '(\\d+)').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`^${regexPattern}\\.`);
    
    // Also check for existing photo-XX.jpg files to maintain compatibility
    const legacyRegex = /^photo-(\d+)\./;
    
    const numbers = existingFiles
      .map(file => {
        // First try the new naming convention
        let match = file.match(regex);
        if (!match) {
          // If that doesn't work, try the legacy naming convention
          match = file.match(legacyRegex);
        }
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1;
    }
  }
  
  if (verbose && nextNumber > 1) {
    logger.verbose(`   Continuing numbering from ${nextNumber}`);
  }

  // Process each file
  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const destFileName = namingConvention.replace('{n}', nextNumber) + path.extname(file);
    const destPath = path.join(destDir, destFileName);
    
    try {
      // Check if destination file already exists
      try {
        await fs.access(destPath);
        if (verbose) {
          logger.warn(`   Skipping ${file} - destination already exists: ${destFileName}`);
        }
        skipped++;
        continue;
      } catch (error) {
        // File doesn't exist, which is what we want
      }
      
      if (dryRun) {
        logger.verbose(`   Would move ${file} → ${destFileName}`);
      } else {
        await fs.rename(sourcePath, destPath);
        if (verbose) {
          logger.verbose(`   Moved ${file} → ${destFileName}`);
        }
      }
      
      organized++;
      nextNumber++;
    } catch (error) {
      logger.error(`   Failed to move ${file}: ${error.message}`);
      skipped++;
    }
  }
  
  return { organized, skipped };
}

module.exports = organizeEventPhotos;