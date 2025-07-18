const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');
const { marked } = require('marked');

const API_KEY = process.env.NEOCITIES_API_KEY;
const SOURCE_DIR = path.join(__dirname, 'musings_src');
const TARGET_DIR = path.join(__dirname, 'public');
const OUTPUT_DIR = path.join(TARGET_DIR, 'musings');
const INDEX_FILE = path.join(TARGET_DIR, 'musings.html');

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

async function deleteFile(filePath) {
  const relativePath = path.relative(TARGET_DIR, filePath);
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

  return new Promise((resolve) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const json = tryParseJSON(data);
        if (json.result !== 'success') {
          console.warn(`⚠️ Failed to delete ${relativePath}:`, json);
        } else {
          console.log(`❌ Deleted: ${relativePath}`);
        }
        resolve();
      });
    });
    form.pipe(req);
    req.on('error', () => {
      console.warn(`⚠️ Failed to delete ${relativePath}: Network error`);
      resolve();
    });
  });
}

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

  return new Promise((resolve) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const json = tryParseJSON(data);
        if (json.result !== 'success') {
          console.warn(`⚠️ Failed to upload ${relativePath}:`, json);
        } else {
          console.log(`✅ Uploaded: ${relativePath}`);
        }
        resolve();
      });
    });
    form.pipe(req);
    req.on('error', () => {
      console.warn(`⚠️ Failed to upload ${relativePath}: Network error`);
      resolve();
    });
  });
}

(async () => {
  console.log("🧹 Fetching and deleting existing files...");
  const files = [];

  function walkDir(dir) {
    fs.readdirSync(dir).forEach(file => {
      const filepath = path.join(dir, file);
      if (fs.statSync(filepath).isDirectory()) {
        walkDir(filepath);
      } else {
        files.push(filepath);
      }
    });
  }

  walkDir(TARGET_DIR);
  for (const file of files) {
    await deleteFile(file);
  }

  console.log("🚀 Uploading files to Neocities...");
  for (const file of files) {
    await uploadFile(file);
  }

  console.log("📜 Final file list on Neocities:");
  files.forEach(f => {
    console.log("- " + path.relative(TARGET_DIR, f));
  });
})();
