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

// ── Hero animation helpers ────────────────────────────────────────────────────

function titleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const HERO_ANIMATIONS = [
  // 0 — CONSTELLATION
  `<svg viewBox="0 0 800 280" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <circle cx="60" cy="35" r="1.3" fill="#c47a2a" class="star-pulse"/>
    <circle cx="155" cy="70" r="0.9" fill="#e4d9bc"/>
    <circle cx="245" cy="30" r="1.1" fill="#e4d9bc" class="star-pulse-slow"/>
    <circle cx="340" cy="80" r="0.7" fill="#2a8a9c"/>
    <circle cx="430" cy="25" r="1.4" fill="#c47a2a"/>
    <circle cx="520" cy="75" r="0.8" fill="#e4d9bc" class="star-pulse-offset"/>
    <circle cx="620" cy="20" r="1.0" fill="#2a8a9c"/>
    <circle cx="740" cy="60" r="0.6" fill="#e4d9bc"/>
    <circle cx="90" cy="155" r="1.1" fill="#e4d9bc" class="star-pulse-slow"/>
    <circle cx="200" cy="175" r="0.8" fill="#c47a2a"/>
    <circle cx="310" cy="140" r="1.2" fill="#e4d9bc"/>
    <circle cx="420" cy="170" r="0.7" fill="#2a8a9c" class="star-pulse"/>
    <circle cx="535" cy="145" r="1.0" fill="#c47a2a"/>
    <circle cx="660" cy="180" r="0.9" fill="#e4d9bc"/>
    <circle cx="760" cy="150" r="1.1" fill="#2a8a9c" class="star-pulse-offset"/>
    <circle cx="50"  cy="250" r="0.8" fill="#2a8a9c"/>
    <circle cx="190" cy="260" r="1.0" fill="#e4d9bc"/>
    <circle cx="370" cy="245" r="0.7" fill="#c47a2a" class="star-pulse-slow"/>
    <circle cx="570" cy="255" r="1.2" fill="#e4d9bc"/>
    <circle cx="720" cy="240" r="0.9" fill="#2a8a9c"/>
    <line x1="60"  y1="35"  x2="155" y2="70"  stroke="#c47a2a" stroke-width="0.65"  opacity="0.75"/>
    <line x1="155" y1="70"  x2="245" y2="30"  stroke="#c47a2a" stroke-width="0.65"  opacity="0.75"/>
    <line x1="245" y1="30"  x2="340" y2="80"  stroke="#c47a2a" stroke-width="0.55" opacity="0.65"/>
    <line x1="340" y1="80"  x2="430" y2="25"  stroke="#c47a2a" stroke-width="0.55" opacity="0.65"/>
    <line x1="430" y1="25"  x2="520" y2="75"  stroke="#c47a2a" stroke-width="0.5"  opacity="0.55"/>
    <line x1="520" y1="75"  x2="620" y2="20"  stroke="#c47a2a" stroke-width="0.5"  opacity="0.55"/>
    <line x1="620" y1="20"  x2="740" y2="60"  stroke="#c47a2a" stroke-width="0.4" opacity="0.5"/>
    <line x1="90"  y1="155" x2="200" y2="175" stroke="#2a8a9c" stroke-width="0.65"  opacity="0.75"/>
    <line x1="200" y1="175" x2="310" y2="140" stroke="#2a8a9c" stroke-width="0.65"  opacity="0.75"/>
    <line x1="310" y1="140" x2="420" y2="170" stroke="#2a8a9c" stroke-width="0.55" opacity="0.65"/>
    <line x1="420" y1="170" x2="535" y2="145" stroke="#2a8a9c" stroke-width="0.55" opacity="0.65"/>
    <line x1="535" y1="145" x2="660" y2="180" stroke="#2a8a9c" stroke-width="0.5"  opacity="0.55"/>
    <line x1="660" y1="180" x2="760" y2="150" stroke="#2a8a9c" stroke-width="0.5"  opacity="0.55"/>
    <line x1="245" y1="30"  x2="310" y2="140" stroke="#e4d9bc" stroke-width="0.35"  opacity="0.38"/>
    <line x1="520" y1="75"  x2="535" y2="145" stroke="#e4d9bc" stroke-width="0.35"  opacity="0.38"/>
    <line x1="0"   y1="93"  x2="800" y2="93"  stroke="#2a8a9c" stroke-width="0.35"  opacity="0.28"/>
    <line x1="0"   y1="186" x2="800" y2="186" stroke="#2a8a9c" stroke-width="0.35"  opacity="0.28"/>
    <line x1="200" y1="0"   x2="200" y2="280" stroke="#2a8a9c" stroke-width="0.35"  opacity="0.22"/>
    <line x1="400" y1="0"   x2="400" y2="280" stroke="#2a8a9c" stroke-width="0.35"  opacity="0.22"/>
    <line x1="600" y1="0"   x2="600" y2="280" stroke="#2a8a9c" stroke-width="0.35"  opacity="0.22"/>
  </svg>`,

  // 1 — BLINKING STARS
  `<svg viewBox="0 0 800 280" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <defs><style>
      @keyframes ms-blink  { 0%,100%{opacity:.18} 12%{opacity:1}   18%{opacity:.18} 65%{opacity:.18} 70%{opacity:.85} 76%{opacity:.18} }
      @keyframes ms-blink2 { 0%,100%{opacity:.18} 30%{opacity:.95} 36%{opacity:.18} 80%{opacity:.18} 85%{opacity:1}   90%{opacity:.18} }
      @keyframes ms-blink3 { 0%,100%{opacity:.18} 5%{opacity:.75}  10%{opacity:.18} 50%{opacity:.18} 55%{opacity:.95} 60%{opacity:.18} }
      .ms-a{animation:ms-blink  var(--d,4s) ease-in-out infinite var(--dl,0s)}
      .ms-b{animation:ms-blink2 var(--d,5s) ease-in-out infinite var(--dl,0s)}
      .ms-c{animation:ms-blink3 var(--d,6s) ease-in-out infinite var(--dl,0s)}
    </style></defs>
    <circle cx="45"  cy="22"  r="1.4" fill="#e4d9bc" class="ms-a" style="--d:4.1s;--dl:0s"/>
    <circle cx="130" cy="55"  r="1.0" fill="#c47a2a" class="ms-b" style="--d:5.3s;--dl:0.7s"/>
    <circle cx="215" cy="18"  r="1.2" fill="#e4d9bc" class="ms-c" style="--d:6.2s;--dl:1.4s"/>
    <circle cx="310" cy="42"  r="0.8" fill="#2a8a9c" class="ms-a" style="--d:7.8s;--dl:2.1s"/>
    <circle cx="420" cy="25"  r="1.5" fill="#e4d9bc" class="ms-b" style="--d:3.9s;--dl:0.5s"/>
    <circle cx="540" cy="50"  r="1.0" fill="#c47a2a" class="ms-c" style="--d:5.6s;--dl:1.8s"/>
    <circle cx="640" cy="18"  r="1.3" fill="#2a8a9c" class="ms-a" style="--d:6.5s;--dl:0.3s"/>
    <circle cx="755" cy="45"  r="0.9" fill="#e4d9bc" class="ms-b" style="--d:7.1s;--dl:2.9s"/>
    <circle cx="70"  cy="100" r="1.1" fill="#2a8a9c" class="ms-c" style="--d:6.0s;--dl:1.1s"/>
    <circle cx="170" cy="130" r="1.4" fill="#e4d9bc" class="ms-a" style="--d:4.4s;--dl:3.2s"/>
    <circle cx="265" cy="95"  r="0.9" fill="#c47a2a" class="ms-b" style="--d:5.8s;--dl:0.9s"/>
    <circle cx="375" cy="118" r="1.2" fill="#e4d9bc" class="ms-c" style="--d:8.2s;--dl:1.5s"/>
    <circle cx="485" cy="90"  r="1.0" fill="#2a8a9c" class="ms-a" style="--d:3.7s;--dl:2.6s"/>
    <circle cx="580" cy="122" r="1.6" fill="#c47a2a" class="ms-b" style="--d:5.4s;--dl:0.2s"/>
    <circle cx="690" cy="102" r="0.8" fill="#e4d9bc" class="ms-c" style="--d:6.8s;--dl:3.7s"/>
    <circle cx="770" cy="130" r="1.1" fill="#2a8a9c" class="ms-a" style="--d:7.4s;--dl:1.0s"/>
    <circle cx="35"  cy="170" r="1.3" fill="#c47a2a" class="ms-b" style="--d:5.1s;--dl:2.3s"/>
    <circle cx="145" cy="195" r="0.9" fill="#e4d9bc" class="ms-a" style="--d:4.7s;--dl:0.8s"/>
    <circle cx="245" cy="165" r="1.2" fill="#2a8a9c" class="ms-c" style="--d:7.6s;--dl:3.5s"/>
    <circle cx="345" cy="200" r="1.0" fill="#c47a2a" class="ms-b" style="--d:6.3s;--dl:1.7s"/>
    <circle cx="450" cy="175" r="1.5" fill="#e4d9bc" class="ms-a" style="--d:4.2s;--dl:2.8s"/>
    <circle cx="555" cy="192" r="0.8" fill="#2a8a9c" class="ms-c" style="--d:5.9s;--dl:0.4s"/>
    <circle cx="665" cy="172" r="1.3" fill="#c47a2a" class="ms-b" style="--d:8.0s;--dl:1.3s"/>
    <circle cx="760" cy="200" r="1.0" fill="#e4d9bc" class="ms-a" style="--d:6.7s;--dl:3.0s"/>
    <circle cx="90"  cy="248" r="1.1" fill="#2a8a9c" class="ms-b" style="--d:4.5s;--dl:1.9s"/>
    <circle cx="205" cy="258" r="0.9" fill="#e4d9bc" class="ms-c" style="--d:6.1s;--dl:0.6s"/>
    <circle cx="325" cy="248" r="1.4" fill="#c47a2a" class="ms-a" style="--d:5.2s;--dl:3.8s"/>
    <circle cx="465" cy="265" r="1.0" fill="#e4d9bc" class="ms-b" style="--d:7.3s;--dl:2.2s"/>
    <circle cx="590" cy="248" r="1.2" fill="#2a8a9c" class="ms-c" style="--d:4.0s;--dl:1.6s"/>
    <circle cx="700" cy="260" r="0.8" fill="#c47a2a" class="ms-a" style="--d:6.4s;--dl:0.1s"/>
    <circle cx="778" cy="245" r="1.1" fill="#e4d9bc" class="ms-b" style="--d:5.5s;--dl:2.7s"/>
  </svg>`,

  // 2 — CROP CIRCLE
  `<svg viewBox="0 0 800 280" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <defs><style>
      @keyframes mc-cw  { from{transform:rotate(0deg)}   to{transform:rotate(360deg)}  }
      @keyframes mc-ccw { from{transform:rotate(0deg)}   to{transform:rotate(-360deg)} }
      @keyframes mc-nd  { 0%,100%{opacity:.65} 50%{opacity:1} }
      .mc-r1{transform-origin:400px 140px;animation:mc-cw  20s linear infinite}
      .mc-r2{transform-origin:400px 140px;animation:mc-ccw 30s linear infinite}
      .mc-r3{transform-origin:400px 140px;animation:mc-cw  45s linear infinite}
      .mc-r4{transform-origin:400px 140px;animation:mc-ccw 14s linear infinite}
      .mc-r5{transform-origin:400px 140px;animation:mc-cw  65s linear infinite}
      .mc-tl{transform-origin:400px 140px;animation:mc-cw 100s linear infinite}
      .mc-nd{animation:mc-nd 2.2s ease-in-out infinite}
    </style></defs>
    <g class="mc-tl">
      <line x1="400" y1="140" x2="400" y2="10"  stroke="#c47a2a" stroke-width="0.65" opacity="0.45"/>
      <line x1="400" y1="140" x2="400" y2="270" stroke="#c47a2a" stroke-width="0.65" opacity="0.45"/>
      <line x1="400" y1="140" x2="527" y2="33"  stroke="#e4d9bc" stroke-width="0.5" opacity="0.35"/>
      <line x1="400" y1="140" x2="273" y2="247" stroke="#e4d9bc" stroke-width="0.5" opacity="0.35"/>
      <line x1="400" y1="140" x2="527" y2="247" stroke="#2a8a9c" stroke-width="0.5" opacity="0.35"/>
      <line x1="400" y1="140" x2="273" y2="33"  stroke="#2a8a9c" stroke-width="0.5" opacity="0.35"/>
    </g>
    <circle class="mc-r1" cx="400" cy="140" r="28"  fill="none" stroke="#c47a2a" stroke-width="1.8" opacity="0.9"  stroke-dasharray="8 4"/>
    <circle class="mc-r2" cx="400" cy="140" r="52"  fill="none" stroke="#2a8a9c" stroke-width="1.2" opacity="0.75" stroke-dasharray="14 6"/>
    <circle class="mc-r3" cx="400" cy="140" r="78"  fill="none" stroke="#e4d9bc" stroke-width="0.9" opacity="0.62" stroke-dasharray="20 9 4 9"/>
    <circle class="mc-r4" cx="400" cy="140" r="98"  fill="none" stroke="#c47a2a" stroke-width="0.8" opacity="0.52" stroke-dasharray="6 6"/>
    <circle class="mc-r5" cx="400" cy="140" r="122" fill="none" stroke="#2a8a9c" stroke-width="0.65" opacity="0.42" stroke-dasharray="28 14 4 14"/>
    <g class="mc-r1">
      <circle cx="400" cy="112" r="2.5" fill="#c47a2a" class="mc-nd"/>
      <circle cx="428" cy="140" r="2"   fill="#e4d9bc" class="mc-nd" style="animation-delay:.55s"/>
      <circle cx="400" cy="168" r="2.5" fill="#c47a2a" class="mc-nd" style="animation-delay:1.1s"/>
      <circle cx="372" cy="140" r="2"   fill="#e4d9bc" class="mc-nd" style="animation-delay:1.65s"/>
    </g>
    <g class="mc-r2">
      <circle cx="400" cy="88"  r="2"   fill="#2a8a9c" class="mc-nd"/>
      <circle cx="452" cy="114" r="1.5" fill="#e4d9bc" class="mc-nd" style="animation-delay:.8s"/>
      <circle cx="452" cy="166" r="2"   fill="#2a8a9c" class="mc-nd" style="animation-delay:1.6s"/>
      <circle cx="400" cy="192" r="1.5" fill="#e4d9bc" class="mc-nd" style="animation-delay:2.4s"/>
      <circle cx="348" cy="166" r="2"   fill="#2a8a9c" class="mc-nd" style="animation-delay:.4s"/>
      <circle cx="348" cy="114" r="1.5" fill="#e4d9bc" class="mc-nd" style="animation-delay:1.2s"/>
    </g>
    <circle cx="80"  cy="38"  r="1.1" fill="#e4d9bc" opacity="0.8" class="star-pulse"/>
    <circle cx="720" cy="52"  r="0.9" fill="#c47a2a" opacity="0.75"/>
    <circle cx="100" cy="225" r="1.0" fill="#2a8a9c" opacity="0.7"  class="star-pulse-slow"/>
    <circle cx="700" cy="232" r="1.1" fill="#e4d9bc" opacity="0.8"/>
    <circle cx="175" cy="28"  r="0.8" fill="#2a8a9c" opacity="0.65"/>
    <circle cx="625" cy="258" r="0.8" fill="#c47a2a" opacity="0.65" class="star-pulse-offset"/>
    <circle cx="400" cy="140" r="5"   fill="#c47a2a" class="mc-nd"/>
    <circle cx="400" cy="140" r="9"   fill="none" stroke="#c47a2a" stroke-width="0.9" opacity="0.6" class="mc-nd"/>
  </svg>`,

  // 3 — CIRCUITRY
  `<svg viewBox="0 0 800 280" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <defs><style>
      @keyframes mp-draw  { from{stroke-dashoffset:600}  to{stroke-dashoffset:0} }
      @keyframes mp-drawr { from{stroke-dashoffset:-600} to{stroke-dashoffset:0} }
      @keyframes mp-node  { 0%,40%,100%{opacity:0} 50%,90%{opacity:1} }
      .mp-p1{stroke-dasharray:600;animation:mp-draw  5s ease-in-out infinite 0s}
      .mp-p2{stroke-dasharray:600;animation:mp-drawr 8s ease-in-out infinite 1.5s}
      .mp-p3{stroke-dasharray:600;animation:mp-draw  10s ease-in-out infinite 3s}
      .mp-p4{stroke-dasharray:600;animation:mp-drawr 7s ease-in-out infinite 0.8s}
      .mp-p5{stroke-dasharray:600;animation:mp-draw  6s ease-in-out infinite 2.2s}
      .mp-cn{animation:mp-node 3s ease-in-out infinite}
    </style></defs>
    <line x1="0"   y1="140" x2="800" y2="140" stroke="#2a8a9c" stroke-width="0.4" opacity="0.28"/>
    <line x1="200" y1="0"   x2="200" y2="280" stroke="#2a8a9c" stroke-width="0.35"  opacity="0.22"/>
    <line x1="400" y1="0"   x2="400" y2="280" stroke="#2a8a9c" stroke-width="0.35"  opacity="0.22"/>
    <line x1="600" y1="0"   x2="600" y2="280" stroke="#2a8a9c" stroke-width="0.35"  opacity="0.22"/>
    <polyline class="mp-p1" points="20,25 140,25 140,65 300,65 300,42 470,42 470,25 600,25"
      fill="none" stroke="#c47a2a" stroke-width="1.2" opacity="0.75"/>
    <polyline class="mp-p2" points="780,255 640,255 640,218 480,218 480,240 300,240 300,258 150,258"
      fill="none" stroke="#2a8a9c" stroke-width="1.2" opacity="0.75"/>
    <polyline class="mp-p3" points="0,160 80,160 80,182 230,182 230,158 400,158 400,190 565,190 565,162 710,162 710,180 800,180"
      fill="none" stroke="#e4d9bc" stroke-width="0.8" opacity="0.55"/>
    <polyline class="mp-p4" points="800,50 665,50 665,88 520,88 520,62 355,62 355,82 215,82 215,55 90,55"
      fill="none" stroke="#2a8a9c" stroke-width="0.9" opacity="0.65"/>
    <polyline class="mp-p5" points="0,210 120,210 120,195 260,195 260,215 430,215 430,200 590,200 590,218 720,218 720,200 800,200"
      fill="none" stroke="#c47a2a" stroke-width="0.8" opacity="0.6"/>
    <circle cx="140" cy="65"  r="2.5" fill="#c47a2a" class="mp-cn" style="animation-delay:.8s"/>
    <circle cx="300" cy="42"  r="2"   fill="#e4d9bc" class="mp-cn" style="animation-delay:1.6s"/>
    <circle cx="480" cy="218" r="2.5" fill="#2a8a9c" class="mp-cn" style="animation-delay:2.2s"/>
    <circle cx="230" cy="158" r="2"   fill="#e4d9bc" class="mp-cn" style="animation-delay:1.0s"/>
    <circle cx="400" cy="190" r="2.5" fill="#c47a2a" class="mp-cn" style="animation-delay:3.0s"/>
    <circle cx="565" cy="162" r="2"   fill="#2a8a9c" class="mp-cn" style="animation-delay:.4s"/>
    <circle cx="520" cy="62"  r="2"   fill="#c47a2a" class="mp-cn" style="animation-delay:2.8s"/>
    <circle cx="665" cy="88"  r="2.5" fill="#2a8a9c" class="mp-cn" style="animation-delay:1.4s"/>
    <circle cx="260" cy="215" r="2"   fill="#c47a2a" class="mp-cn" style="animation-delay:.6s"/>
    <circle cx="590" cy="218" r="2.5" fill="#e4d9bc" class="mp-cn" style="animation-delay:2.0s"/>
  </svg>`,

  // 4 — NEBULA DRIFT
  `<svg viewBox="0 0 800 280" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <defs><style>
      @keyframes nd-float  { 0%,100%{transform:translateY(0)   opacity:.55} 50%{transform:translateY(-8px) opacity:.9} }
      @keyframes nd-float2 { 0%,100%{transform:translateY(0)   opacity:.4}  50%{transform:translateY(6px)  opacity:.8} }
      @keyframes nd-float3 { 0%,100%{transform:translateY(0)   opacity:.35} 50%{transform:translateY(-5px) opacity:.75} }
      @keyframes nd-glow   { 0%,100%{r:3;opacity:.5}  50%{r:5;opacity:.95} }
      .nd-a{animation:nd-float  var(--d,6s) ease-in-out infinite var(--dl,0s)}
      .nd-b{animation:nd-float2 var(--d,8s) ease-in-out infinite var(--dl,0s)}
      .nd-c{animation:nd-float3 var(--d,7s) ease-in-out infinite var(--dl,0s)}
      .nd-g{animation:nd-glow   var(--d,4s) ease-in-out infinite var(--dl,0s)}
    </style></defs>
    <circle cx="160" cy="90"  r="3" fill="#c47a2a" class="nd-g" style="--d:5s;--dl:0s"/>
    <circle cx="400" cy="70"  r="3" fill="#2a8a9c" class="nd-g" style="--d:6s;--dl:1s"/>
    <circle cx="640" cy="100" r="3" fill="#c47a2a" class="nd-g" style="--d:4.5s;--dl:2s"/>
    <circle cx="280" cy="190" r="3" fill="#2a8a9c" class="nd-g" style="--d:7s;--dl:0.5s"/>
    <circle cx="520" cy="195" r="3" fill="#c47a2a" class="nd-g" style="--d:5.5s;--dl:1.5s"/>
    <circle cx="60"  cy="50"  r="1.4" fill="#e4d9bc" class="nd-a" style="--d:6.2s;--dl:0s"/>
    <circle cx="130" cy="130" r="1.2" fill="#c47a2a" class="nd-b" style="--d:7.8s;--dl:1.3s"/>
    <circle cx="215" cy="45"  r="1.5" fill="#2a8a9c" class="nd-a" style="--d:5.5s;--dl:2.1s"/>
    <circle cx="310" cy="115" r="1.0" fill="#e4d9bc" class="nd-c" style="--d:8.5s;--dl:0.7s"/>
    <circle cx="395" cy="155" r="1.3" fill="#c47a2a" class="nd-b" style="--d:6.8s;--dl:3.2s"/>
    <circle cx="480" cy="40"  r="1.1" fill="#e4d9bc" class="nd-a" style="--d:7.2s;--dl:1.8s"/>
    <circle cx="570" cy="130" r="1.4" fill="#2a8a9c" class="nd-c" style="--d:5.9s;--dl:0.4s"/>
    <circle cx="660" cy="55"  r="1.2" fill="#c47a2a" class="nd-b" style="--d:8.1s;--dl:2.6s"/>
    <circle cx="750" cy="115" r="1.0" fill="#e4d9bc" class="nd-a" style="--d:6.5s;--dl:1.0s"/>
    <circle cx="90"  cy="200" r="1.3" fill="#c47a2a" class="nd-c" style="--d:7.4s;--dl:3.8s"/>
    <circle cx="190" cy="250" r="1.1" fill="#e4d9bc" class="nd-b" style="--d:5.7s;--dl:0.9s"/>
    <circle cx="300" cy="235" r="1.4" fill="#2a8a9c" class="nd-a" style="--d:8.8s;--dl:2.4s"/>
    <circle cx="420" cy="245" r="1.0" fill="#c47a2a" class="nd-c" style="--d:6.3s;--dl:1.5s"/>
    <circle cx="540" cy="225" r="1.2" fill="#e4d9bc" class="nd-b" style="--d:7.6s;--dl:3.1s"/>
    <circle cx="665" cy="240" r="1.5" fill="#2a8a9c" class="nd-a" style="--d:5.3s;--dl:0.2s"/>
    <circle cx="770" cy="215" r="1.1" fill="#c47a2a" class="nd-c" style="--d:9.0s;--dl:1.7s"/>
    <circle cx="35"  cy="155" r="0.6" fill="#e4d9bc" opacity="0.55"/>
    <circle cx="155" cy="175" r="0.5" fill="#c47a2a" opacity="0.5"/>
    <circle cx="355" cy="25"  r="0.7" fill="#e4d9bc" opacity="0.5"/>
    <circle cx="505" cy="165" r="0.5" fill="#2a8a9c" opacity="0.5"/>
    <circle cx="725" cy="175" r="0.6" fill="#e4d9bc" opacity="0.5"/>
    <line x1="0"   y1="93"  x2="800" y2="93"  stroke="#2a8a9c" stroke-width="0.35" opacity="0.28"/>
    <line x1="0"   y1="186" x2="800" y2="186" stroke="#2a8a9c" stroke-width="0.35" opacity="0.28"/>
    <line x1="200" y1="0"   x2="200" y2="280" stroke="#2a8a9c" stroke-width="0.35" opacity="0.22"/>
    <line x1="400" y1="0"   x2="400" y2="280" stroke="#2a8a9c" stroke-width="0.35" opacity="0.22"/>
    <line x1="600" y1="0"   x2="600" y2="280" stroke="#2a8a9c" stroke-width="0.35" opacity="0.22"/>
  </svg>`
];

function getHeroAnimation(title) {
  return HERO_ANIMATIONS[titleHash(title) % HERO_ANIMATIONS.length];
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wrap content in HTML template
 */
function wrapInTemplate(title, content) {
  const heroAnim = getHeroAnimation(title);
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
    <div class="starmap-bg" aria-hidden="true">
      ${heroAnim}
    </div>
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
