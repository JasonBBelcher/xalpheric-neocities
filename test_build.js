const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt();

const SOURCE_DIR = path.join(__dirname, 'thoughts-and-musings');
const TARGET_DIR = path.join(__dirname, 'public');
const MUSINGS_DIR = path.join(TARGET_DIR, 'musings');
const INDEX_FILE = path.join(MUSINGS_DIR, 'index.html');

// Track files that need to be uploaded
let filesToUpload = [];

// Build musings from markdown files
async function buildMusings() {
  console.log("📝 Building musings from markdown files...");
  
  // Ensure musings directory exists
  if (!fs.existsSync(MUSINGS_DIR)) {
    fs.mkdirSync(MUSINGS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SOURCE_DIR);
  const posts = [];

  for (const file of files) {
    if (file.endsWith('.md')) {
      const fullPath = path.join(SOURCE_DIR, file);
      const stats = fs.statSync(fullPath);
      posts.push({ file, mtime: stats.mtime });
    }
  }

  posts.sort((a, b) => b.mtime - a.mtime);

  let indexHtml = `<ul>\n`;

  for (const { file } of posts) {
    const name = path.basename(file, '.md');
    const src = path.join(SOURCE_DIR, file);
    const dst = path.join(MUSINGS_DIR, `${name}.html`);

    const markdownContent = fs.readFileSync(src, 'utf-8');
    
    // Wrap the markdown content in proper HTML structure with styling
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Xalpheric - ${name}</title>
  <link rel="stylesheet" href="../css/theme.css">
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500&display=swap" rel="stylesheet">
  <script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossorigin="anonymous"></script>
</head>
<body>
  <nav class="back-nav">
    <a href="../musings.html" class="download">Back to Musings</a>
  </nav>
  
  <section class="musings-container">
    <div class="note-content">
      ${md.render(markdownContent)}
    </div>
  </section>
</body>
</html>`;
    
    fs.writeFileSync(dst, htmlContent, 'utf-8');
    filesToUpload.push(dst);
    console.log(`✅ Built: ${name}.html`);

    indexHtml += `<li><a href='musings/${name}.html'>${name}</a></li>\n`;
  }

  indexHtml += `</ul>`;
  fs.writeFileSync(INDEX_FILE, indexHtml, 'utf-8');
  filesToUpload.push(INDEX_FILE);
  
  console.log(`📋 Built ${posts.length} musings and index file`);
}

// Test the build process
(async () => {
  console.log("🧪 Testing build process (no upload)...");
  
  try {
    await buildMusings();
    
    console.log(`\n📤 Files that would be uploaded:`);
    filesToUpload.forEach((file, i) => {
      const relativePath = path.relative(TARGET_DIR, file);
      console.log(`${i + 1}. ${relativePath}`);
    });
    
    console.log(`\n✅ Build test completed successfully! ${filesToUpload.length} files ready for upload.`);
    
  } catch (error) {
    console.error("💥 Build test failed:", error.message);
  }
})();
