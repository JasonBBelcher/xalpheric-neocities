const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const FormData = require('form-data');

const API_KEY = process.env.NEOCITIES_API_KEY;
const ASSETS_DIR = path.join(__dirname, '../../public/assets');

// Validate required environment variables
if (!API_KEY) {
  console.error("❌ NEOCITIES_API_KEY environment variable is required");
  console.error("💡 Add it as a repository secret in GitHub");
  process.exit(1);
}

// Calculate SHA1 hash of a file
function calculateSHA1(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha1');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Get list of files from Neocities
async function getNeocitiesFileList() {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      host: 'neocities.org',
      path: '/api/list?path=assets',
      headers: {
        Authorization: `Bearer ${API_KEY}`
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.result === 'success') {
            resolve(json.files || []);
          } else {
            reject(new Error(`API Error: ${json.message || 'Unknown error'}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse API response: ${error.message}`));
        }
      });
    });

    req.on('error', error => {
      reject(new Error(`Network error: ${error.message}`));
    });

    req.end();
  });
}

// Upload a single file to Neocities
async function uploadFile(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append(remotePath, fs.createReadStream(localPath));

    const options = {
      method: 'POST',
      host: 'neocities.org',
      path: '/api/upload',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        ...form.getHeaders()
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.result === 'success') {
            resolve(true);
          } else {
            reject(new Error(`Upload failed: ${json.message || 'Unknown error'}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse upload response: ${error.message}`));
        }
      });
    });

    req.on('error', error => {
      reject(new Error(`Upload network error: ${error.message}`));
    });

    form.pipe(req);
  });
}

// Get all local asset files recursively
function getAllLocalFiles(dir, baseDir = dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllLocalFiles(fullPath, baseDir));
    } else {
      const relativePath = path.relative(baseDir, fullPath);
      files.push({
        localPath: fullPath,
        relativePath: relativePath.replace(/\\/g, '/'), // Ensure forward slashes
        sha1: calculateSHA1(fullPath)
      });
    }
  }

  return files;
}

async function main() {
  console.log("🔍 Checking for asset changes to deploy...");

  // Check if assets directory exists
  if (!fs.existsSync(ASSETS_DIR)) {
    console.log("ℹ️ No assets directory found, skipping deployment");
    return;
  }

  try {
    // Get local files
    console.log("📂 Scanning local assets...");
    const localFiles = getAllLocalFiles(ASSETS_DIR);
    
    if (localFiles.length === 0) {
      console.log("ℹ️ No local assets found, skipping deployment");
      return;
    }

    console.log(`📋 Found ${localFiles.length} local asset files`);

    // Get remote files
    console.log("🌐 Fetching remote assets list...");
    const remoteFiles = await getNeocitiesFileList();
    
    // Create a map of remote files by path for quick lookup
    const remoteFileMap = new Map();
    remoteFiles.forEach(file => {
      if (!file.is_directory) {
        // Remove 'assets/' prefix from remote path for comparison
        const relativePath = file.path.startsWith('assets/') 
          ? file.path.substring(7) 
          : file.path;
        remoteFileMap.set(relativePath, file.sha1_hash);
      }
    });

    // Find files that need to be uploaded (new or changed)
    const filesToUpload = localFiles.filter(localFile => {
      const remoteSHA1 = remoteFileMap.get(localFile.relativePath);
      return !remoteSHA1 || remoteSHA1 !== localFile.sha1;
    });

    if (filesToUpload.length === 0) {
      console.log("✅ All assets are up to date, no deployment needed");
      return;
    }

    console.log(`📤 Found ${filesToUpload.length} files to upload:`);
    filesToUpload.forEach(file => {
      const status = remoteFileMap.has(file.relativePath) ? '🔄 UPDATED' : '🆕 NEW';
      console.log(`   ${status}: ${file.relativePath}`);
    });

    // Upload files
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const remotePath = `assets/${file.relativePath}`;
      
      console.log(`📤 Uploading ${i + 1}/${filesToUpload.length}: ${file.relativePath}`);
      
      try {
        await uploadFile(file.localPath, remotePath);
        console.log(`✅ Successfully uploaded: ${file.relativePath}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to upload ${file.relativePath}: ${error.message}`);
        failureCount++;
      }

      // Add delay between uploads to respect API rate limits
      if (i < filesToUpload.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    console.log("\n📊 Upload Summary:");
    console.log(`✅ Successful uploads: ${successCount}`);
    console.log(`❌ Failed uploads: ${failureCount}`);
    console.log(`📋 Total files: ${filesToUpload.length}`);

    if (failureCount > 0) {
      console.log("\n⚠️ Some files failed to upload.");
      process.exit(1);
    } else {
      console.log("\n🎉 All assets deployed successfully!");
    }

  } catch (error) {
    console.error("💥 Asset deployment failed:", error.message);
    process.exit(1);
  }
}

main();
