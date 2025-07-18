const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');
const markdown = require('markdown').markdown;

const API_KEY = process.env.NEOCITIES_API_KEY;
const TARGET_DIR = path.join(__dirname, 'public');
const MUSINGS_SRC = path.join(__dirname, 'musings');
const MUSINGS_OUT = path.join(TARGET_DIR, 'musings.html');

// Build musings.html from markdown
function buildMusingsIndex() {
  const files = fs.readdirSync(MUSINGS_SRC).filter(f => f.endsWith('.md'));
  let html = '<h1>Thoughts & Musings</h1>\n<ul>';

  for (const file of files) {
    const filePath = path.join(MUSINGS_SRC, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const htmlContent = markdown.toHTML(content);
    const title = file.replace(/\.md$/, '');
    html += `<li><h2>${title}</h2>${htmlContent}</li>\n`;
  }

  html += '</ul>';
  fs.writeFileSync(MUSINGS_OUT, html);
  console.log(`📝 Built ${MUSINGS_OUT}`);
}

// Upload a file to Neocities
async function uploadFile(filePath) {
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

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ Uploaded: ${relativePath}`);
          resolve();
        } else {
          console.warn(`❌ Upload failed for ${relativePath}:`, data);
          resolve();
        }
      });
    });

    req.on('error', err => {
      console.error(`❌ Upload error for ${relativePath}:`, err);
      resolve();
    });

    form.pipe(req);
  });
}

// Delete a file from Neocities
async function deleteFile(relativePath) {
  const form = new FormData();
  form.append('filenames[]', relativePath);

  const options = {
    method: 'POST',
    host: 'neocities.org',
    path: '/api/delete',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      ...form.getHeaders()
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        const resJSON = safeJSON(data);
        if (res.statusCode === 200 && resJSON?.result === 'success') {
          console.log(`🗑️ Deleted: ${relativePath}`);
          resolve();
        } else {
          console.warn(`⚠️ Failed to delete ${relativePath}:`, resJSON);
          resolve();
        }
      });
    });

    req.on('error', err => {
      console.error(`❌ Delete error for ${relativePath}:`, err);
      resolve();
    });

    form.pipe(req);
  });
}

function safeJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  });
}

async function main() {
  console.log('🧹 Fetching and deleting existing files...');

  const filesToDelete = [];
  walkDir(TARGET_DIR, file => {
    const relative = path.relative(TARGET_DIR, file);
    filesToDelete.push(relative);
  });

  for (const file of filesToDelete) {
    await deleteFile(file);
  }

  console.log('🚀 Uploading files to Neocities...');
  walkDir(TARGET_DIR, async file => {
    await uploadFile(file);
  });
}

buildMusingsIndex();
main();
