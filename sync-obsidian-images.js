#!/usr/bin/env node

/**
 * Obsidian Image Sync Script
 * 
 * This script processes markdown files in thoughts-and-musings/ to:
 * 1. Find Obsidian-style image links (![[image.jpg]] or ![](attachments/image.jpg))
 * 2. Copy images to public/assets/blog-images/
 * 3. Convert links to blog-compatible format (![Alt](../assets/blog-images/image.jpg))
 * 4. Handle duplicates and maintain image organization
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const SOURCE_DIR = 'thoughts-and-musings';
const DEST_IMAGE_DIR = 'public/assets/blog-images';
const COMMON_ATTACHMENT_DIRS = [
  'attachments',
  'assets', 
  'images',
  'media',
  '.attachments'
];

// Ensure destination directory exists
function ensureDir(dir) {
  if (!fsSync.existsSync(dir)) {
    fsSync.mkdirSync(dir, { recursive: true });
  }
}

// Find all attachment directories in the source
async function findAttachmentDirs() {
  const attachmentDirs = [];
  
  for (const dirName of COMMON_ATTACHMENT_DIRS) {
    const dirPath = path.join(SOURCE_DIR, dirName);
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

// Copy image file to blog images directory
async function copyImageToBlog(sourcePath, filename) {
  const destPath = path.join(DEST_IMAGE_DIR, filename);
  
  try {
    await fs.copyFile(sourcePath, destPath);
    console.log(`✅ Copied: ${filename} → ${destPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to copy ${filename}:`, error.message);
    return false;
  }
}

// Process a single markdown file
async function processMarkdownFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  let updatedContent = content;
  let hasChanges = false;
  
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
        const attachmentDirs = await findAttachmentDirs();
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
          // Copy image to blog directory
          const copied = await copyImageToBlog(sourceImagePath, filename);
          if (copied) {
            // Convert to blog-compatible markdown
            const altText = path.parse(filename).name.replace(/[-_]/g, ' ');
            const replacement = `![${altText}](../assets/blog-images/${filename})`;
            updatedContent = updatedContent.replace(match, replacement);
            hasChanges = true;
            console.log(`🔄 Converted wikilink: ${match} → ${replacement}`);
          }
        } else {
          console.warn(`⚠️  Image not found: ${imageName}`);
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
          const sourceImagePath = path.join(SOURCE_DIR, imagePath);
          try {
            await fs.access(sourceImagePath);
            const copied = await copyImageToBlog(sourceImagePath, filename);
            if (copied) {
              const replacement = `![${altText}](../assets/blog-images/${filename})`;
              updatedContent = updatedContent.replace(match, replacement);
              hasChanges = true;
              console.log(`🔄 Converted markdown link: ${match} → ${replacement}`);
            }
          } catch (error) {
            console.warn(`⚠️  Image not found: ${sourceImagePath}`);
          }
        }
      }
    }
  }
  
  // Write updated content if there were changes
  if (hasChanges) {
    await fs.writeFile(filePath, updatedContent, 'utf8');
    console.log(`📝 Updated file: ${filePath}`);
  }
  
  return hasChanges;
}

// Main function
async function syncObsidianImages() {
  console.log('🔄 Starting Obsidian image sync...');
  
  // Ensure destination directory exists
  ensureDir(DEST_IMAGE_DIR);
  
  try {
    // Find all markdown files
    const files = await fs.readdir(SOURCE_DIR);
    const markdownFiles = files.filter(file => file.endsWith('.md'));
    
    if (markdownFiles.length === 0) {
      console.log('📝 No markdown files found.');
      return;
    }
    
    console.log(`📂 Found ${markdownFiles.length} markdown files to process`);
    
    let totalChanges = 0;
    
    // Process each markdown file
    for (const file of markdownFiles) {
      const filePath = path.join(SOURCE_DIR, file);
      console.log(`\n🔍 Processing: ${file}`);
      
      const hasChanges = await processMarkdownFile(filePath);
      if (hasChanges) {
        totalChanges++;
      }
    }
    
    console.log(`\n✅ Sync complete!`);
    console.log(`📊 Files updated: ${totalChanges}/${markdownFiles.length}`);
    
    if (totalChanges > 0) {
      console.log(`\n🎯 Next steps:`);
      console.log(`   1. Review the updated markdown files`);
      console.log(`   2. Run: npm run build-musings`);
      console.log(`   3. Run: npm run deploy`);
    }
    
  } catch (error) {
    console.error('❌ Error during sync:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  syncObsidianImages();
}

module.exports = { syncObsidianImages };
