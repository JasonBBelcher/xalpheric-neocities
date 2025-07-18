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
  console.log("🚀 Starting upload to Neocities...");
  const files = [];
  let successCount = 0;
  let failureCount = 0;

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
  
  console.log(`📁 Found ${files.length} files to upload`);
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relativePath = path.relative(TARGET_DIR, file);
    
    console.log(`� Uploading ${i + 1}/${files.length}: ${relativePath}`);
    
    const success = await uploadFile(file);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
    
    // Add a small delay between uploads to be respectful to the API
    if (i < files.length - 1) {
      await delay(500); // 500ms delay between uploads
    }
  }

  console.log("\n📊 Upload Summary:");
  console.log(`✅ Successful uploads: ${successCount}`);
  console.log(`❌ Failed uploads: ${failureCount}`);
  console.log(`📋 Total files: ${files.length}`);

  if (failureCount > 0) {
    console.log("\n⚠️ Some files failed to upload. You may want to run the script again.");
  } else {
    console.log("\n🎉 All files uploaded successfully!");
  }
})();
