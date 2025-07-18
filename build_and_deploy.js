const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');

const API_KEY = process.env.NEOCITIES_API_KEY;
const TARGET_DIR = 'public';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const THROTTLE_DELAY_MS = 250;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function httpsRequest(options, bodyStream = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', (err) => reject(err));
    if (bodyStream) bodyStream.pipe(req);
    else req.end();
  });
}

function tryParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  });
}

async function deleteAllFiles() {
  console.log('🧹 Fetching and deleting existing files...');
  const options = {
    method: 'GET',
    host: 'neocities.org',
    path: '/api/list',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  };

  const res = await httpsRequest(options);
  if (res.status !== 200) {
    throw new Error(`Failed to fetch file list: ${res.status}`);
  }

  const parsed = tryParseJSON(res.body);
  if (!parsed || !parsed.files) {
    throw new Error('Could not parse file list');
  }

  const files = parsed.files.map((f) => f.path);
  if (files.length === 0) {
    console.log('📂 No files to delete.');
    return;
  }

  for (const file of files) {
    console.log(`❌ Deleting: ${file}`);
    const form = new FormData();
    form.append('delete[]', file);

    const deleteOptions = {
      method: 'POST',
      host: 'neocities.org',
      path: '/api/delete',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        ...form.getHeaders(),
      },
    };

    const delRes = await httpsRequest(deleteOptions, form);
    if (delRes.status !== 200) {
      console.warn(`⚠️ Failed to delete ${file}:`, delRes.body);
    } else {
      await sleep(THROTTLE_DELAY_MS);
    }
  }
}

async function uploadFile(filePath) {
  const relativePath = path.relative(TARGET_DIR, filePath);
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), relativePath);

  const options = {
    method: 'POST',
    host: 'neocities.org',
    path: '/api/upload',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      ...form.getHeaders(),
    },
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await httpsRequest(options, form);

      if (res.status >= 200 && res.status < 300) {
        console.log(`✅ Uploaded: ${relativePath}`);
        return;
      }

      const message = tryParseJSON(res.body)?.message || res.body;

      if (res.status >= 500 && attempt < MAX_RETRIES) {
        console.warn(`⚠️ Retry ${attempt} for ${relativePath} – Server error: ${message}`);
        await sleep(RETRY_DELAY_MS);
      } else {
        console.error(`❌ Failed: ${relativePath} – ${res.status} ${message}`);
        return;
      }
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        console.warn(`⚠️ Retry ${attempt} for ${relativePath} – Network error: ${err.message}`);
        await sleep(RETRY_DELAY_MS);
      } else {
        console.error(`❌ Upload failed permanently: ${relativePath} – ${err.message}`);
        return;
      }
    }
  }
}

async function listFinalFiles() {
  console.log('📜 Final file list on Neocities:');
  const options = {
    method: 'GET',
    host: 'neocities.org',
    path: '/api/list',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  };

  const res = await httpsRequest(options);
  if (res.status !== 200) {
    console.warn('❌ Failed to retrieve final file list.');
    return;
  }

  const parsed = tryParseJSON(res.body);
  if (!parsed || !parsed.files) return;
  parsed.files.forEach((f) => console.log(`- ${f.path}`));
}

async function main() {
  await deleteAllFiles();

  console.log('🚀 Uploading files to Neocities...');
  const files = [];
  walkDir(TARGET_DIR, (filePath) => files.push(filePath));

  for (const file of files) {
    await uploadFile(file);
    await sleep(THROTTLE_DELAY_MS);
  }

  await listFinalFiles();
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
