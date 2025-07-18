const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt();

const API_KEY = process.env.NEOCITIES_API_KEY;

// Validate required environment variables
if (!API_KEY) {
  console.error("❌ NEOCITIES_API_KEY environment variable is required");
  console.error("💡 Set it with: export NEOCITIES_API_KEY='your_api_key_here'");
  process.exit(1);
}
const SOURCE_DIR = path.join(__dirname, 'thoughts-and-musings');
const TARGET_DIR = path.join(__dirname, 'public');
const MUSINGS_DIR = path.join(TARGET_DIR, 'musings');
const INDEX_FILE = path.join(MUSINGS_DIR, 'index.html');

// Track files that need to be uploaded
let filesToUpload = [];

// Build musings from markdown files
async function buildMusings() {
  console.log("📝 Building musings from markdown files...");
  
  // Check if source directory exists
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ Source directory not found: ${SOURCE_DIR}`);
    console.error("💡 Make sure the 'thoughts-and-musings' directory exists with .md files");
    throw new Error("Source directory not found");
  }
  
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

  if (posts.length === 0) {
    console.warn("⚠️ No markdown files found in thoughts-and-musings directory");
    console.log("📝 Creating empty index file...");
    const emptyIndexHtml = `<p>No musings available yet.</p>`;
    fs.writeFileSync(INDEX_FILE, emptyIndexHtml, 'utf-8');
    filesToUpload.push(INDEX_FILE);
    console.log("📋 Created empty musings index");
    return;
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

function getAllMarkdownFiles(dir) {
  return fs.readdirSync(dir).filter(file => file.endsWith('.md'));
}

function tryParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return { result: "error", message: "Invalid JSON from server" };
  }
}

async function uploadFile(filePath, retryCount = 0) {
  const maxRetries = 3;
  const retryDelay = 1000 * (retryCount + 1); // Progressive delay: 1s, 2s, 3s
  const relativePath = path.relative(TARGET_DIR, filePath);
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), { filename: relativePath });

  const options = {
    method: 'POST',
    host: 'neocities.org',
    path: '/api/upload',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      ...form.getHeaders()
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const json = tryParseJSON(data);
        if (json.result !== 'success') {
          console.warn(`⚠️ Upload failed for ${relativePath} (attempt ${retryCount + 1}/${maxRetries + 1}):`, json.message || 'Unknown error');
          
          if (retryCount < maxRetries) {
            console.log(`🔄 Retrying in ${retryDelay}ms...`);
            setTimeout(async () => {
              const result = await uploadFile(filePath, retryCount + 1);
              resolve(result);
            }, retryDelay);
          } else {
            console.error(`❌ Failed to upload ${relativePath} after ${maxRetries + 1} attempts`);
            resolve(false);
          }
        } else {
          console.log(`✅ Uploaded: ${relativePath}`);
          resolve(true);
        }
      });
    });

    req.on('error', (error) => {
      console.warn(`⚠️ Network error for ${relativePath} (attempt ${retryCount + 1}/${maxRetries + 1}):`, error.message);
      
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying in ${retryDelay}ms...`);
        setTimeout(async () => {
          const result = await uploadFile(filePath, retryCount + 1);
          resolve(result);
        }, retryDelay);
      } else {
        console.error(`❌ Failed to upload ${relativePath} after ${maxRetries + 1} attempts`);
        resolve(false);
      }
    });

    form.pipe(req);
  });
}

// Add delay between uploads to avoid rate limiting
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log("🚀 Starting build and deploy for musings...");
  
  try {
    // Step 1: Build musings from markdown
    await buildMusings();
    
    // Step 2: Upload only the built musings files
    console.log(`📤 Uploading ${filesToUpload.length} files to Neocities...`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const relativePath = path.relative(TARGET_DIR, file);
      
      console.log(`📤 Uploading ${i + 1}/${filesToUpload.length}: ${relativePath}`);
      
      const success = await uploadFile(file);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
      
      // Add a small delay between uploads to be respectful to the API
      if (i < filesToUpload.length - 1) {
        await delay(500); // 500ms delay between uploads
      }
    }

    console.log("\n📊 Upload Summary:");
    console.log(`✅ Successful uploads: ${successCount}`);
    console.log(`❌ Failed uploads: ${failureCount}`);
    console.log(`📋 Total files: ${filesToUpload.length}`);

    if (failureCount > 0) {
      console.log("\n⚠️ Some files failed to upload. You may want to run the script again.");
    } else {
      console.log("\n🎉 All musings uploaded successfully!");
    }
    
  } catch (error) {
    console.error("💥 Build and deploy failed:", error.message);
    process.exit(1);
  }
})();
