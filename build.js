// build-musings.js
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');

const SOURCE_DIR = 'thoughts-and-musings';
const DEST_DIR = 'public/musings';
const INDEX_FILE = path.join(DEST_DIR, 'index.html');

const md = new MarkdownIt();

async function buildMusings() {
  // Ensure destination directory exists
  if (!fsSync.existsSync(DEST_DIR)) {
    fsSync.mkdirSync(DEST_DIR, { recursive: true });
  }

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
    
    await fs.writeFile(dst, htmlContent, 'utf-8');

    indexHtml += `<li><a href='musings/${sanitizedName}.html'>${name}</a></li>\n`;
  }

  indexHtml += `</ul>`;
  await fs.writeFile(INDEX_FILE, indexHtml, 'utf-8');

  console.log('✅ Musings built to public/musings');
}

buildMusings().catch(console.error);
