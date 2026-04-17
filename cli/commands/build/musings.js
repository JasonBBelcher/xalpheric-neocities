const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const MarkdownIt = require('markdown-it');
const logger = require('../../lib/utils/logger');

/**
 * Build musings (blog posts) from markdown to HTML
 * @param {Object} options - Build options
 * @param {string} options.source - Source directory containing markdown files
 * @param {string} options.output - Output directory for HTML files
 * @param {string} options.blogImagesDir - Directory for blog images
 * @param {boolean} options.processPhotos - Run photo processing before build
 * @param {boolean} options.verbose - Verbose logging
 * @returns {Promise<Object>} Build results
 */
async function buildMusings(options = {}) {
  const {
    source = 'thoughts-and-musings',
    output = 'public/musings',
    blogImagesDir = 'public/assets/blog-images',
    processPhotos = true,
    verbose = false
  } = options;

  logger.setVerbose(verbose);
  logger.info('📝 Building musings...', 'cyan');

  try {
    // First, process any photos in the thoughts-and-musings folder
    if (processPhotos) {
      logger.verbose('🖼️  Processing blog images...');
      try {
        execSync('./process-photos-enhanced.sh blog 512 jpg', { stdio: verbose ? 'inherit' : 'ignore' });
      } catch (error) {
        logger.warn('⚠️  Photo processing failed or no images found');
      }
    }

    // Ensure destination directory exists
    if (!fsSync.existsSync(output)) {
      fsSync.mkdirSync(output, { recursive: true });
      logger.verbose(`📁 Created output directory: ${output}`);
    }

    // Ensure blog images directory exists
    ensureBlogImagesDir(blogImagesDir);

    // Read markdown files
    const files = await fs.readdir(source);
    const posts = [];

    for (const file of files) {
      if (file.endsWith('.md')) {
        const fullPath = path.join(source, file);
        const stats = await fs.stat(fullPath);
        posts.push({ file, mtime: stats.mtime });
      }
    }

    if (posts.length === 0) {
      logger.warn('⚠️  No markdown files found in source directory');
      return {
        built: 0,
        failed: 0,
        source,
        output
      };
    }

    // Sort by modification time (newest first)
    posts.sort((a, b) => b.mtime - a.mtime);

    logger.info(`📂 Found ${posts.length} markdown files`, 'blue');

    // Process each markdown file
    let builtCount = 0;
    let failedCount = 0;
    const indexEntries = [];

    for (const { file } of posts) {
      try {
        const name = path.basename(file, '.md');
        const sanitizedName = sanitizeName(name);
        const sourcePath = path.join(source, file);
        const destPath = path.join(output, `${sanitizedName}.html`);

        // Read markdown content
        const markdownContent = await fs.readFile(sourcePath, 'utf-8');

        // Process images - copy to blog-images and update paths
        let processedContent = await processImagesInContent(
          markdownContent,
          sourcePath,
          blogImagesDir
        );

        // Process YouTube embeds
        processedContent = processYouTubeEmbeds(processedContent);

        // Render markdown to HTML
        const md = createMarkdownRenderer();
        let renderedMarkdown = md.render(processedContent);

        // Fix invalid HTML structure
        renderedMarkdown = fixHtmlStructure(renderedMarkdown);

        // Wrap in full HTML template
        const htmlContent = wrapInTemplate(name, renderedMarkdown);

        // Write HTML file
        await fs.writeFile(destPath, htmlContent, 'utf-8');

        indexEntries.push({ name, sanitizedName });
        builtCount++;

        logger.verbose(`✅ Built: ${file} → ${sanitizedName}.html`);
      } catch (error) {
        logger.error(`❌ Failed to build ${file}: ${error.message}`);
        failedCount++;
      }
    }

    // Generate index.html
    const indexFile = path.join(output, 'index.html');
    await generateIndex(indexEntries, indexFile);

    // Summary
    logger.info('\n📊 Build Summary:', 'cyan');
    logger.info(`   ✅ Built: ${builtCount}`);
    if (failedCount > 0) {
      logger.error(`   ❌ Failed: ${failedCount}`);
    }
    logger.info(`   📂 Source: ${source}`);
    logger.info(`   📂 Output: ${output}`);

    logger.success('\n🎉 Musings build completed!', 'green');

    return {
      built: builtCount,
      failed: failedCount,
      source,
      output
    };
  } catch (error) {
    logger.error(`❌ Build failed: ${error.message}`);
    throw error;
  }
}

/**
 * Ensure blog images directory exists
 */
function ensureBlogImagesDir(blogImagesDir) {
  if (!fsSync.existsSync(blogImagesDir)) {
    fsSync.mkdirSync(blogImagesDir, { recursive: true });
    logger.verbose(`📁 Created blog images directory: ${blogImagesDir}`);
  }
}

/**
 * Sanitize filename for web use
 */
function sanitizeName(name) {
  return name
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Copy image to blog images directory
 */
async function copyImageToBlogImages(imagePath, filename, blogImagesDir) {
  const sourcePath = path.resolve(imagePath);
  const destPath = path.join(blogImagesDir, filename);

  // Check if destination already exists
  if (fsSync.existsSync(destPath)) {
    return filename;
  }

  // Check if a version with different extension exists
  const baseName = path.parse(filename).name;
  const possibleExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

  for (const ext of possibleExtensions) {
    const alternativePath = path.join(blogImagesDir, `${baseName}.${ext}`);
    if (fsSync.existsSync(alternativePath)) {
      logger.verbose(`📷 Found existing processed image: ${baseName}.${ext}`);
      return `${baseName}.${ext}`;
    }
  }

  try {
    // Check if source exists
    if (fsSync.existsSync(sourcePath)) {
      await fs.copyFile(sourcePath, destPath);
      logger.verbose(`📷 Copied image: ${filename} → blog-images/`);
      return filename;
    } else {
      logger.warn(`⚠️  Image not found: ${sourcePath}`);
      return null;
    }
  } catch (error) {
    logger.error(`❌ Failed to copy image ${filename}: ${error.message}`);
    return null;
  }
}

/**
 * Process images in markdown content
 */
async function processImagesInContent(content, sourceFilePath, blogImagesDir) {
  let processedContent = content;

  // Convert Obsidian-style images ![[filename]] to standard markdown
  processedContent = processedContent.replace(/!\[\[([^\]]+)\]\]/g, (match, filename) => {
    const altText = filename.replace(/\.[^/.]+$/, '');
    return `\n![${altText}](${filename})\n`;
  });

  // Clean up extra newlines
  processedContent = processedContent.replace(/\n\n+/g, '\n\n');

  // Process standard markdown images
  const imageMatches = processedContent.match(/!\[([^\]]*)\]\(([^)]+)\)/g);

  if (!imageMatches) {
    return processedContent;
  }

  for (const match of imageMatches) {
    const imageMatch = match.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (imageMatch) {
      const altText = imageMatch[1];
      const originalPath = imageMatch[2];
      const filename = path.basename(originalPath);

      // Skip if already a blog-images path or external URL
      if (originalPath.includes('blog-images/') || originalPath.startsWith('http')) {
        continue;
      }

      // Resolve image path
      let resolvedPath;
      if (originalPath.startsWith('../')) {
        const relativePath = originalPath.substring(3);
        resolvedPath = path.resolve('public', relativePath);
      } else if (originalPath.startsWith('./')) {
        resolvedPath = path.resolve(path.dirname(sourceFilePath), originalPath);
      } else if (originalPath.startsWith('/')) {
        resolvedPath = originalPath;
      } else {
        const relativeToSource = path.resolve(path.dirname(sourceFilePath), originalPath);
        if (fsSync.existsSync(relativeToSource)) {
          resolvedPath = relativeToSource;
        } else {
          resolvedPath = path.resolve(originalPath);
        }
      }

      // Copy image to blog-images directory
      const copiedFilename = await copyImageToBlogImages(
        resolvedPath,
        filename,
        blogImagesDir
      );

      if (copiedFilename) {
        const newImageReference = `![${altText}](../assets/blog-images/${copiedFilename})`;
        processedContent = processedContent.replace(match, newImageReference);
        logger.verbose(`🔄 Updated image path: ${originalPath} → blog-images/${copiedFilename}`);
      }
    }
  }

  return processedContent;
}

/**
 * Create configured MarkdownIt renderer
 */
function createMarkdownRenderer() {
  const md = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: true,
    typographer: true
  });

  // Custom image renderer with styling
  md.renderer.rules.image = function (tokens, idx) {
    const token = tokens[idx];
    const srcIndex = token.attrIndex('src');
    const titleIndex = token.attrIndex('title');
    const altIndex = token.attrIndex('alt');

    let src = '';
    let title = '';
    let alt = '';

    if (srcIndex >= 0) src = token.attrs[srcIndex][1];
    if (titleIndex >= 0) title = token.attrs[titleIndex][1];
    if (altIndex >= 0) alt = token.attrs[altIndex][1];

    return `<div class="blog-image-container">
    <img src="${src}" alt="${alt}" class="blog-image" ${title ? `title="${title}"` : ''} />
    ${alt ? `<div class="blog-image-caption">${alt}</div>` : ''}
  </div>`;
  };

  return md;
}

/**
 * Process YouTube embeds in content
 */
function processYouTubeEmbeds(content) {
  // Pattern 1: {{youtube:VIDEO_ID}}
  content = content.replace(/\{\{youtube:([a-zA-Z0-9_-]+)\}\}/g, (match, videoId) => {
    return createYouTubeEmbed(videoId);
  });

  // Pattern 2: YouTube watch links
  content = content.replace(
    /https:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g,
    (match, videoId) => createYouTubeEmbed(videoId)
  );

  // Pattern 3: YouTube short links
  content = content.replace(
    /https:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/g,
    (match, videoId) => createYouTubeEmbed(videoId)
  );

  return content;
}

/**
 * Create YouTube embed HTML
 */
function createYouTubeEmbed(videoId) {
  return `<div class="blog-video-container">
      <iframe class="blog-youtube-embed" 
              src="https://www.youtube.com/embed/${videoId}" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
      </iframe>
    </div>`;
}

/**
 * Fix invalid HTML structure
 */
function fixHtmlStructure(html) {
  // Remove <p> tags that wrap blog-image-containers
  return html
    .replace(/<p><div class="blog-image-container">/g, '<div class="blog-image-container">')
    .replace(/<\/div><\/p>/g, '</div>');
}

/**
 * Wrap content in HTML template
 */
function wrapInTemplate(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xalpheric - ${title}</title>
  <meta name="description" content="Thoughts and musings from Xalpheric - ${title}">
  <meta name="author" content="Xalpheric">
  <meta name="robots" content="index, follow">
  <link rel="icon" type="image/png" href="/assets/xalpheric_favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;700&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Share+Tech+Mono&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/main.css">
</head>
<body>
  <nav class="site-nav">
    <div class="container">
      <div class="site-nav__inner">
        <div class="site-nav__brand">
          <div class="site-nav__brand-text">XALPHERIC</div>
          <div class="site-nav__brand-sub" style="font-family:var(--font-data);font-size:0.65rem;letter-spacing:0.08em;color:var(--text-secondary);margin-top:0.25rem;">MIDI MOB</div>
        </div>
        <div class="site-nav__mobile">
          <ul class="site-nav__links">
            <li><a href="/index.html" class="site-nav__link">Home</a></li>
            <li><a href="/gallery.html" class="site-nav__link">Gallery</a></li>
            <li><a href="/collective.html" class="site-nav__link">Collective</a></li>
            <li><a href="/musings.html" class="site-nav__link site-nav__link--active" aria-current="page">Musings</a></li>
          </ul>
        </div>
      </div>
    </div>
  </nav>

  <section class="section" style="background:var(--bg-mid);padding-top:calc(var(--space-section) + 1rem);">
    <div class="container">
      <p class="section__eyebrow">MUSINGS</p>
      <h1 class="section__title">${title}</h1>
      <a href="/musings.html" class="glide-btn glide-btn--cold" style="margin-top:var(--space-block);display:inline-flex;">← Back to Musings</a>
    </div>
  </section>

  <section class="section" style="background:var(--bg-base);">
    <div class="container">
      <div class="post-content">
        ${content}
      </div>
    </div>
  </section>

  <script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossorigin="anonymous"></script>
  <script src="/js/utils.js"></script>
  <script src="/js/radio-player.js"></script>
</body>
</html>`;
}

/**
 * Generate index HTML file
 */
async function generateIndex(entries, indexFile) {
  let indexHtml = '';

  for (const { name, sanitizedName } of entries) {
    const displayName = name.replace(/-/g, ' ');
    indexHtml += `<a href="/musings/${sanitizedName}.html" class="release-strip" style="display:flex;align-items:center;gap:1.5rem;padding:1rem 0;border-bottom:1px solid var(--border-subtle);text-decoration:none;transition:var(--transition-glide);">
  <span style="font-family:var(--font-data);font-size:var(--type-caption);color:var(--text-faint);letter-spacing:0.1em;min-width:3rem;">${String(entries.indexOf(entries.find(e => e.sanitizedName === sanitizedName)) + 1).padStart(3, '0')}</span>
  <span style="font-family:var(--font-display);font-size:var(--type-h3);font-weight:400;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-primary);">${displayName}</span>
</a>\n`;
  }

  await fs.writeFile(indexFile, indexHtml, 'utf-8');

  logger.verbose(`📋 Generated index: ${indexFile}`);
}

module.exports = buildMusings;
