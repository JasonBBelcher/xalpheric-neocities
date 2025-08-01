// build-musings.js
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const MarkdownIt = require('markdown-it');

const SOURCE_DIR = 'thoughts-and-musings';
const DEST_DIR = 'public/musings';
const BLOG_IMAGES_DIR = 'public/assets/blog-images';
const INDEX_FILE = path.join(DEST_DIR, 'index.html');

// Ensure blog images directory exists
function ensureBlogImagesDir() {
  if (!fsSync.existsSync(BLOG_IMAGES_DIR)) {
    fsSync.mkdirSync(BLOG_IMAGES_DIR, { recursive: true });
    console.log(`📁 Created blog images directory: ${BLOG_IMAGES_DIR}`);
  }
}

// Copy image to blog images directory if it doesn't exist
async function copyImageToBlogImages(imagePath, filename) {
  const sourcePath = path.resolve(imagePath);
  const destPath = path.join(BLOG_IMAGES_DIR, filename);
  
  // Check if destination already exists (exact filename)
  if (fsSync.existsSync(destPath)) {
    return filename;
  }
  
  // Check if a version with different extension exists (e.g., .jpg instead of .png)
  const baseName = path.parse(filename).name;
  const possibleExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  
  for (const ext of possibleExtensions) {
    const alternativePath = path.join(BLOG_IMAGES_DIR, `${baseName}.${ext}`);
    if (fsSync.existsSync(alternativePath)) {
      console.log(`📷 Found existing processed image: ${baseName}.${ext}`);
      return `${baseName}.${ext}`;
    }
  }
  
  try {
    // Check if source exists
    if (fsSync.existsSync(sourcePath)) {
      await fs.copyFile(sourcePath, destPath);
      console.log(`📷 Copied image: ${filename} → blog-images/`);
      return filename;
    } else {
      console.warn(`⚠️  Image not found: ${sourcePath}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Failed to copy image ${filename}:`, error.message);
    return null;
  }
}

// Process images in markdown content
async function processImagesInContent(content, sourceFilePath) {
  let processedContent = content;
  
  // First, convert Obsidian-style images ![[filename]] to standard markdown ![](filename)
  // Add line breaks around images to prevent them from being wrapped in <p> tags
  processedContent = processedContent.replace(/!\[\[([^\]]+)\]\]/g, (match, filename) => {
    // Extract just the filename without extension for alt text
    const altText = filename.replace(/\.[^/.]+$/, "");
    return `\n![${altText}](${filename})\n`;
  });
  
  // Clean up extra newlines
  processedContent = processedContent.replace(/\n\n+/g, '\n\n');
  
  // Now process standard markdown images
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
      
      // Skip if it's already a blog-images path or external URL
      if (originalPath.includes('blog-images/') || originalPath.startsWith('http')) {
        continue;
      }
      
      // Resolve the image path relative to the source file or project root
      let resolvedPath;
      if (originalPath.startsWith('../')) {
        // Relative path from thoughts-and-musings (../assets/studio1.jpg)
        // This should resolve to public/assets/studio1.jpg
        const relativePath = originalPath.substring(3); // Remove '../'
        resolvedPath = path.resolve('public', relativePath);
      } else if (originalPath.startsWith('./')) {
        // Relative to current file
        resolvedPath = path.resolve(path.dirname(sourceFilePath), originalPath);
      } else if (originalPath.startsWith('/')) {
        // Absolute path
        resolvedPath = originalPath;
      } else {
        // Try as relative to source file directory first, then project root
        const relativeToSource = path.resolve(path.dirname(sourceFilePath), originalPath);
        if (fsSync.existsSync(relativeToSource)) {
          resolvedPath = relativeToSource;
        } else {
          resolvedPath = path.resolve(originalPath);
        }
      }
      
      // Copy image to blog-images directory
      const copiedFilename = await copyImageToBlogImages(resolvedPath, filename);
      
      if (copiedFilename) {
        // Update the image path to point to blog-images
        const newImageReference = `![${altText}](../assets/blog-images/${copiedFilename})`;
        processedContent = processedContent.replace(match, newImageReference);
        console.log(`🔄 Updated image path: ${originalPath} → blog-images/${copiedFilename}`);
      }
    }
  }
  
  return processedContent;
}

// Configure MarkdownIt with enhanced options
const md = new MarkdownIt({
  html: true,        // Enable HTML tags in source
  breaks: true,      // Convert '\n' in paragraphs into <br>
  linkify: true,     // Autoconvert URL-like text to links
  typographer: true  // Enable some language-neutral replacement + quotes beautification
});

// Custom renderer for images to add styling
md.renderer.rules.image = function (tokens, idx, options, env) {
  const token = tokens[idx];
  const srcIndex = token.attrIndex('src');
  const titleIndex = token.attrIndex('title');
  const altIndex = token.attrIndex('alt');
  
  let src = '';
  let title = '';
  let alt = '';
  
  if (srcIndex >= 0) {
    src = token.attrs[srcIndex][1];
  }
  if (titleIndex >= 0) {
    title = token.attrs[titleIndex][1];
  }
  if (altIndex >= 0) {
    alt = token.attrs[altIndex][1];
  }
  
  return `<div class="blog-image-container">
    <img src="${src}" alt="${alt}" class="blog-image" ${title ? `title="${title}"` : ''} />
    ${alt ? `<div class="blog-image-caption">${alt}</div>` : ''}
  </div>`;
};

// Custom YouTube embed processor
function processYouTubeEmbeds(content) {
  // Pattern 1: {{youtube:VIDEO_ID}}
  content = content.replace(/\{\{youtube:([a-zA-Z0-9_-]+)\}\}/g, (match, videoId) => {
    return `<div class="blog-video-container">
      <iframe class="blog-youtube-embed" 
              src="https://www.youtube.com/embed/${videoId}" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
      </iframe>
    </div>`;
  });
  
  // Pattern 2: Convert YouTube links to embeds
  content = content.replace(/https:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g, (match, videoId) => {
    return `<div class="blog-video-container">
      <iframe class="blog-youtube-embed" 
              src="https://www.youtube.com/embed/${videoId}" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
      </iframe>
    </div>`;
  });
  
  // Pattern 3: Convert YouTube short links
  content = content.replace(/https:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/g, (match, videoId) => {
    return `<div class="blog-video-container">
      <iframe class="blog-youtube-embed" 
              src="https://www.youtube.com/embed/${videoId}" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
      </iframe>
    </div>`;
  });
  
  return content;
}

async function buildMusings() {
  // First, process any photos in the thoughts-and-musings folder
  console.log('🖼️  Processing blog images...');
  try {
    execSync('./process-photos-enhanced.sh blog 512 jpg', { stdio: 'inherit' });
  } catch (error) {
    console.warn('⚠️  Photo processing failed or no images found:', error.message);
  }
  
  // Ensure destination directory exists
  if (!fsSync.existsSync(DEST_DIR)) {
    fsSync.mkdirSync(DEST_DIR, { recursive: true });
  }
  
  // Ensure blog images directory exists
  ensureBlogImagesDir();

  const files = await fs.readdir(SOURCE_DIR);
  const posts = [];

  for (const file of files) {
    if (file.endsWith('.md')) {
      const fullPath = path.join(SOURCE_DIR, file);
      const stats = await fs.stat(fullPath);
      posts.push({ file, mtime: stats.mtime });
    }
  }

  posts.sort((a, b) => b.mtime - a.mtime);

  let indexHtml = `<ul>\n`;

  for (const { file } of posts) {
    const name = path.basename(file, '.md');
    // Sanitize filename: replace spaces and special characters with hyphens
    const sanitizedName = name.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const src = path.join(SOURCE_DIR, file);
    const dst = path.join(DEST_DIR, `${sanitizedName}.html`);

    const markdownContent = await fs.readFile(src, 'utf-8');
    
    // Process images first - copy to blog-images and update paths
    let processedContent = await processImagesInContent(markdownContent, src);
    
    // Process YouTube embeds after image processing
    processedContent = processYouTubeEmbeds(processedContent);
    
    // Wrap the markdown content in proper HTML structure with styling
    let renderedMarkdown = md.render(processedContent);
    
    // Fix invalid HTML structure: remove <p> tags that wrap blog-image-containers
    renderedMarkdown = renderedMarkdown.replace(/<p><div class="blog-image-container">/g, '<div class="blog-image-container">');
    renderedMarkdown = renderedMarkdown.replace(/<\/div><\/p>/g, '</div>');
    
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xalpheric - ${name}</title>
  
  <!-- SEO Meta Tags -->
  <meta name="description" content="Thoughts and musings from Xalpheric - ${name}">
  <meta name="keywords" content="electronic music thoughts, triphop, psychedelic hiphop, dub music, trance music, progressive house, electronica, synthpop, blues electronic, folktronica, drum and bass, chillout music, synthwave, jazz house, jazzhop, atmospheric music, blissful soundscapes, existential electronic, music creation, technology musings, creative process, downtempo philosophy, ambient composition, IDM thoughts, breakbeat culture, bass music theory, experimental hip hop, consciousness music, transcendental beats, meditative soundscapes, Xalpheric">
  <meta name="author" content="Xalpheric">
  <meta name="robots" content="index, follow">
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" href="../assets/xalpheric_favicon.png">
  
  <!-- Stylesheets -->
  <link rel="stylesheet" href="../css/theme.css">
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500&display=swap" rel="stylesheet">
  
  <!-- Scripts -->
  <script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossorigin="anonymous"></script>
</head>
<body>
  <header class="site-header">
    <div class="header-content">
      <nav class="top-nav">
        <a href="../index.html" class="nav-link">Home</a>
        <a href="../musings.html" class="nav-link active">Thoughts & Musings</a>
        <a href="../gallery.html" class="nav-link">Gallery</a>
        <a href="../links.html" class="nav-link">Essential Links</a>
        <a href="../guestbook.html" class="nav-link">Guest book</a>
      </nav>
    </div>
  </header>

  <nav class="back-nav">
    <a href="../musings.html" class="download">Back to Musings</a>
  </nav>
  
  <section class="musings-container">
    <div class="note-content">
      ${renderedMarkdown}
    </div>
  </section>

  <script src="../js/main.js"></script>
  <script src="../js/radio-player.js"></script>
</body>
</html>`;
    
    await fs.writeFile(dst, htmlContent, 'utf-8');

    indexHtml += `<li><a href='musings/${sanitizedName}.html'>${name}</a></li>\n`;
  }

  indexHtml += `</ul>`;
  await fs.writeFile(INDEX_FILE, indexHtml, 'utf-8');

  console.log('✅ Musings built to public/musings');
}

buildMusings().catch(console.error);
