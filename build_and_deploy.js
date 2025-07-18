// build_and_deploy.js

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

const API_KEY = process.env.NEOCITIES_API_KEY;
const DIST_DIR = './';

const uploadFile = async (filePath, relPath) => {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), relPath);

  const res = await fetch('https://neocities.org/api/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`
    },
    body: form
  });

  const text = await res.text();
  console.log(`[Uploaded] ${relPath}\n${text}`);
};

const walkDir = (dir, callback) => {
  fs.readdirSync(dir).forEach(f => {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  });
};

(async () => {
  if (!API_KEY) {
    console.error('❌ Missing NEOCITIES_API_KEY in environment.');
    process.exit(1);
  }

  console.log('🚀 Starting upload to Neocities...\n');
  walkDir(DIST_DIR, async filePath => {
    const relPath = path.relative(DIST_DIR, filePath);
    if (relPath === path.basename(__filename)) return;
    await uploadFile(filePath, relPath);
  });
})();
