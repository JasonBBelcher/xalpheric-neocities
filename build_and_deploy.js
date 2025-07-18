const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');

const API_KEY = process.env.NEOCITIES_API_KEY;
const PUBLIC_DIR = path.join(__dirname, 'public');

function uploadFile(filePath, relativePath) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), relativePath);

    const request = https.request({
      method: 'POST',
      hostname: 'neocities.org',
      path: '/api/upload',
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${API_KEY}`
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ Uploaded: ${relativePath}`);
          resolve();
        } else {
          console.error(`❌ Failed: ${relativePath} – ${res.statusCode}`, data);
          reject(data);
        }
      });
    });

    form.pipe(request);

    request.on('error', err => {
      console.error(`🚨 HTTPS error: ${relativePath}`, err);
      reject(err);
    });
  });
}

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  });
}

(async () => {
  console.log('🚀 Uploading files to Neocities...');

  const uploadPromises = [];

  walkDir(PUBLIC_DIR, fullPath => {
    const relative = path.relative(PUBLIC_DIR, fullPath);
    uploadPromises.push(uploadFile(fullPath, relative));
  });

  try {
    await Promise.all(uploadPromises);
    console.log('🎉 All files uploaded successfully!');
  } catch (err) {
    console.error('❌ Deployment failed.', err);
    process.exit(1);
  }
})();
