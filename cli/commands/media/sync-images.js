const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const logger = require('../../lib/utils/logger');

const COMMON_ATTACHMENT_DIRS = [
  'attachments',
  'assets',
  'images',
  'media',
  '.attachments'
];

/**
 * Sync Obsidian images to blog images directory
 * @param {Object} options - Sync options
 * @param {string} options.source - Source directory containing markdown files
 * @param {string} options.dest - Destination directory for images
 * @param {boolean} options.force - Force re-copy all images
 * @param {boolean} options.verbose - Verbose logging
 * @returns {Promise<Object>} Sync results
 */
async function syncImages(options = {}) {
  const {
    source = 'thoughts-and-musings',
    dest = 'public/assets/blog-images',
    force = false,
    verbose = false
  } = options;

  logger.setVerbose(verbose);
  logger.info('🔄 Starting Obsidian image sync...', 'cyan');

  try {
    // Ensure destination directory exists
    ensureDir(dest);

    // Find all markdown files
    const files = await fs.readdir(source);
    const markdownFiles = files.filter(file => file.endsWith('.md'));

    if (markdownFiles.length === 0) {
      logger.warn('⚠️  No markdown files found');
      return {
        copied: 0,
        skipped: 0,
        updated: 0,
        source,
        dest
      };
    }

    logger.info(`📂 Found ${markdownFiles.length} markdown files`, 'blue');

    let copiedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    // Process each markdown file
    for (const file of markdownFiles) {
      const filePath = path.join(source, file);
      logger.verbose(`\n🔍 Processing: ${file}`);

      const result = await processMarkdownFile(filePath, source, dest, force);
      copiedCount += result.copied;
      skippedCount += result.skipped;
      if (result.updated) {
        updatedCount++;
      }
    }

    // Summary
    logger.info('\n📊 Sync Summary:', 'cyan');
    logger.info(`   📷 Images copied: ${copiedCount}`);
    if (skippedCount > 0) {
      logger.info(`   ⏭️  Images skipped: ${skippedCount}`);
    }
    logger.info(`   📝 Files updated: ${updatedCount}/${markdownFiles.length}`);

    if (updatedCount > 0) {
      logger.info('\n🎯 Next steps:', 'blue');
      logger.info('   1. Review the updated markdown files');
      logger.info('   2. Run: neocities build musings');
      logger.info('   3. Run: neocities deploy musings');
    }

    logger.success('\n✅ Image sync complete!', 'green');

    return {
      copied: copiedCount,
      skipped: skippedCount,
      updated: updatedCount,
      source,
      dest
    };

  } catch (error) {
    logger.error(`❌ Sync failed: ${error.message}`);
    throw error;
  }
}

/**
 * Ensure directory exists
 */
function ensureDir(dir) {
  if (!fsSync.existsSync(dir)) {
    fsSync.mkdirSync(dir, { recursive: true });
    logger.verbose(`📁 Created directory: ${dir}`);
  }
}

/**
 * Find all attachment directories in the source
 */
async function findAttachmentDirs(sourceDir) {
  const attachmentDirs = [];

  for (const dirName of COMMON_ATTACHMENT_DIRS) {
    const dirPath = path.join(sourceDir, dirName);
    try {
      const stats = await fs.stat(dirPath);
      if (stats.isDirectory()) {
        attachmentDirs.push(dirPath);
      }
    } catch (error) {
      // Directory doesn't exist, skip
    }
  }

  return attachmentDirs;
}

/**
 * Copy image file to destination directory
 */
async function copyImageToDest(sourcePath, filename, destDir, force) {
  const destPath = path.join(destDir, filename);

  // Skip if already exists (unless force mode)
  if (!force && fsSync.existsSync(destPath)) {
    logger.verbose(`⏭️  Skipping existing: ${filename}`);
    return { copied: false, skipped: true };
  }

  try {
    await fs.copyFile(sourcePath, destPath);
    logger.verbose(`✅ Copied: ${filename} → ${path.basename(destDir)}/`);
    return { copied: true, skipped: false };
  } catch (error) {
    logger.error(`❌ Failed to copy ${filename}: ${error.message}`);
    return { copied: false, skipped: false };
  }
}

/**
 * Process a single markdown file
 */
async function processMarkdownFile(filePath, sourceDir, destDir, force) {
  const content = await fs.readFile(filePath, 'utf8');
  let updatedContent = content;
  let hasChanges = false;
  let copiedCount = 0;
  let skippedCount = 0;

  // Pattern 1: Obsidian wikilinks ![[image.jpg]]
  const wikilinkPattern = /!\[\[([^\]]+\.(jpg|jpeg|png|gif|webp|svg))\]\]/gi;
  const wikilinkMatches = content.match(wikilinkPattern);

  if (wikilinkMatches) {
    for (const match of wikilinkMatches) {
      const imageMatch = match.match(/!\[\[([^\]]+)\]\]/);
      if (imageMatch) {
        const imageName = imageMatch[1];
        const filename = path.basename(imageName);

        // Find the source image in attachment directories
        const attachmentDirs = await findAttachmentDirs(sourceDir);
        let sourceImagePath = null;

        for (const attachDir of attachmentDirs) {
          const possiblePath = path.join(attachDir, imageName);
          try {
            await fs.access(possiblePath);
            sourceImagePath = possiblePath;
            break;
          } catch (error) {
            // File not found in this directory
          }
        }

        if (sourceImagePath) {
          // Copy image to destination
          const result = await copyImageToDest(sourceImagePath, filename, destDir, force);
          if (result.copied) {
            copiedCount++;
            // Convert to blog-compatible markdown
            const altText = path.parse(filename).name.replace(/[-_]/g, ' ');
            const replacement = `![${altText}](../assets/blog-images/${filename})`;
            updatedContent = updatedContent.replace(match, replacement);
            hasChanges = true;
            logger.verbose(`🔄 Converted wikilink: ${imageName}`);
          } else if (result.skipped) {
            skippedCount++;
          }
        } else {
          logger.warn(`⚠️  Image not found: ${imageName}`);
        }
      }
    }
  }

  // Pattern 2: Standard markdown links to attachment directories
  const markdownLinkPattern = /!\[([^\]]*)\]\(([^)]+\.(jpg|jpeg|png|gif|webp|svg))\)/gi;
  const markdownMatches = content.match(markdownLinkPattern);

  if (markdownMatches) {
    for (const match of markdownMatches) {
      const linkMatch = match.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (linkMatch) {
        const altText = linkMatch[1];
        const imagePath = linkMatch[2];
        const filename = path.basename(imagePath);

        // Check if it's an attachment directory reference
        const isAttachmentRef = COMMON_ATTACHMENT_DIRS.some(dir =>
          imagePath.startsWith(dir + '/') || imagePath.startsWith('./' + dir + '/')
        );

        if (isAttachmentRef) {
          // Find and copy the source image
          const sourceImagePath = path.join(sourceDir, imagePath);
          try {
            await fs.access(sourceImagePath);
            const result = await copyImageToDest(sourceImagePath, filename, destDir, force);
            if (result.copied) {
              copiedCount++;
              const replacement = `![${altText}](../assets/blog-images/${filename})`;
              updatedContent = updatedContent.replace(match, replacement);
              hasChanges = true;
              logger.verbose(`🔄 Converted markdown link: ${filename}`);
            } else if (result.skipped) {
              skippedCount++;
            }
          } catch (error) {
            logger.warn(`⚠️  Image not found: ${sourceImagePath}`);
          }
        }
      }
    }
  }

  // Write updated content if there were changes
  if (hasChanges) {
    await fs.writeFile(filePath, updatedContent, 'utf8');
    logger.verbose(`📝 Updated file: ${path.basename(filePath)}`);
  }

  return {
    copied: copiedCount,
    skipped: skippedCount,
    updated: hasChanges
  };
}

module.exports = syncImages;
